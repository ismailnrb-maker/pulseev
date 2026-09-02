import datetime
import json
import os
from pathlib import Path
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.action_centre import (
    add_business_time,
    build_candidates,
    draft_whatsapp,
    enrich_action_centre,
    fingerprint,
    priority_for,
    sync_cases,
    usage_forecast,
)
from api.database import Base, ActionAuditEvent, ActionCase, generate_curated_demo_vehicles


NOW = datetime.datetime(2026, 9, 2, 6, 0, tzinfo=datetime.timezone.utc)


def vehicle(**overrides):
    defaults = dict(
        id="vehicle-1", vin="MPEV26CT2A0000001", model="CT2",
        customerName="Private Customer", customerPhone="+91 90000 00000",
        customerLocation="Mumbai, MH", deliveryDate="2026-01-01",
        warrantyExpiryDate="2026-10-02",
        contactHistory=[{"date":"2026-08-24", "outcome":"no_answer"}],
        issueCode="", issueReportedDate="", currentKm=10800,
        registrationStatus="completed", registrationDates={"completed":"2026-01-10"},
        services=[
            {"serviceNumber":1,"dueKm":1000,"completedKm":1050},
            {"serviceNumber":2,"dueKm":5000,"completedKm":5050},
            {"serviceNumber":3,"dueKm":10000,"completedKm":0},
            {"serviceNumber":4,"dueKm":20000,"completedKm":0},
        ],
        batteryReplacement={"affected":True,"status":"pending","reportedAt":"2026-08-15"},
        kmLog=[{"month":"2026-01","km":0},{"month":"2026-09","km":10800}],
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class RiskRuleTests(unittest.TestCase):
    def test_backend_matches_shared_golden_fixture(self):
        fixture = json.loads((Path(__file__).parent / "action_centre_golden.json").read_text(encoding="utf-8"))
        vehicles = [SimpleNamespace(**item) for item in fixture["vehicles"]]
        now = datetime.datetime.fromisoformat(fixture["now"].replace("Z", "+00:00"))
        scores = {item["caseType"]:item["riskScore"] for item in build_candidates(vehicles, now)}
        self.assertEqual(scores, fixture["expected"])

    def test_battery_formula_totals_92(self):
        case = next(c for c in build_candidates([vehicle()], NOW) if c["caseType"] == "battery_recall")
        self.assertEqual(case["riskScore"], 92)
        self.assertEqual(case["priority"], "critical")

    def test_priority_bands(self):
        self.assertEqual(priority_for(85), "critical")
        self.assertEqual(priority_for(84), "high")
        self.assertEqual(priority_for(65), "high")
        self.assertEqual(priority_for(64), "medium")

    def test_registration_multiple_service_and_pattern_rules(self):
        registration = vehicle(
            id="registration", batteryReplacement={}, warrantyExpiryDate=None,
            currentKm=0, services=[], kmLog=[], registrationStatus="documents_pending",
            registrationDates={"documents_pending":"2026-07-24"}, contactHistory=[],
        )
        service = vehicle(
            id="service", batteryReplacement={}, warrantyExpiryDate=None,
            currentKm=11500, services=[
                {"dueKm":1000,"completedKm":0},{"dueKm":5000,"completedKm":0},
                {"dueKm":10000,"completedKm":0},{"dueKm":20000,"completedKm":0},
            ], kmLog=[], contactHistory=[],
        )
        cluster = [vehicle(id=f"cluster-{i}", batteryReplacement={}, warrantyExpiryDate=None,
                           currentKm=0, services=[], kmLog=[], issueCode="BMS_CELL_IMBALANCE",
                           customerLocation=location, contactHistory=[])
                   for i, location in enumerate(("Mumbai, MH", "Pune, MH", "Mumbai, MH"))]
        cases = build_candidates([registration, service, *cluster], NOW)
        by_type = {case["caseType"]: case for case in cases}
        self.assertEqual(by_type["registration_delay"]["riskScore"], 73)
        self.assertGreaterEqual(by_type["multiple_services"]["riskScore"], 72)
        self.assertEqual(by_type["regional_pattern"]["riskScore"], 88)
        self.assertEqual(len(by_type["regional_pattern"]["vehicleIds"]), 3)

    def test_forecast_within_30_days_scores_medium(self):
        forecast_vehicle = vehicle(
            batteryReplacement={}, warrantyExpiryDate=None, currentKm=4600,
            services=[{"dueKm":1000,"completedKm":1000},{"dueKm":5000,"completedKm":0}],
            kmLog=[{"month":"2026-07","km":3600},{"month":"2026-08","km":4600}],
            contactHistory=[],
        )
        projection = usage_forecast(forecast_vehicle, NOW.date())
        self.assertIsNotNone(projection)
        case = next(c for c in build_candidates([forecast_vehicle], NOW) if c["caseType"] == "service_forecast")
        self.assertTrue(45 <= case["riskScore"] <= 60)
        self.assertEqual(case["priority"], "medium")

    def test_sla_business_windows(self):
        friday = datetime.datetime(2026, 9, 4, 15, tzinfo=datetime.timezone.utc)
        critical_local = add_business_time(friday, "critical").astimezone(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
        high_local = add_business_time(friday, "high").astimezone(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
        medium_local = add_business_time(friday, "medium").astimezone(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
        self.assertEqual((critical_local.weekday(), critical_local.hour, critical_local.minute), (0, 13, 0))
        self.assertEqual((high_local.weekday(), high_local.hour, high_local.minute), (0, 18, 0))
        self.assertEqual((medium_local.weekday(), medium_local.hour, medium_local.minute), (2, 18, 0))

    def test_fingerprint_changes_only_with_evidence(self):
        candidate = build_candidates([vehicle()], NOW)[0]
        same = dict(candidate)
        self.assertEqual(fingerprint(candidate), fingerprint(same))
        changed = dict(candidate, evidence=[*candidate["evidence"], "New evidence"])
        self.assertNotEqual(fingerprint(candidate), fingerprint(changed))


class PersistenceTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    def test_dedupe_preserve_owner_auto_close_and_reopen(self):
        target = vehicle()
        first = sync_cases(self.db, [target], NOW)
        recall = next(case for case in first if case.caseType == "battery_recall")
        recall.assignedOwner = "Senior Technician"
        recall.status = "assigned"
        self.db.commit()
        sync_cases(self.db, [target], NOW)
        self.assertEqual(self.db.query(ActionCase).filter_by(caseKey=recall.caseKey).count(), 1)
        self.assertEqual(self.db.query(ActionCase).filter_by(caseKey=recall.caseKey).one().assignedOwner, "Senior Technician")

        target.batteryReplacement = {"affected":False,"status":"not_affected"}
        sync_cases(self.db, [target], NOW)
        stored = self.db.query(ActionCase).filter_by(caseKey=recall.caseKey).one()
        self.assertEqual(stored.status, "auto_closed")

        target.batteryReplacement = {"affected":True,"status":"pending","reportedAt":"2026-08-01"}
        sync_cases(self.db, [target], NOW)
        self.assertEqual(stored.status, "open")
        self.assertEqual(self.db.query(ActionAuditEvent).filter_by(caseId=stored.id, eventType="reopened").count(), 1)

    def test_curated_top_five_contains_all_archetypes(self):
        vehicles = generate_curated_demo_vehicles()
        registration = next(v for v in vehicles if v.id == "demo-14")
        registration.registrationDates = {"documents_pending":"2026-07-24"}
        cases = sync_cases(self.db, vehicles, NOW)
        self.assertEqual(len(cases), 5)
        self.assertEqual({c.caseType for c in cases}, {
            "battery_recall", "regional_pattern", "registration_delay",
            "multiple_services", "service_forecast",
        })

    def test_missing_key_whatsapp_fallback_uses_customer_after_generation_boundary(self):
        target = vehicle()
        case = sync_cases(self.db, [target], NOW)[0]
        with patch.dict(os.environ, {}, clear=True):
            result = draft_whatsapp(case, target)
        self.assertEqual(result["source"], "rules")
        self.assertIn("Private", result["draft"])
        self.assertNotIn(target.customerPhone, result["draft"])

    def test_openai_enrichment_is_structured_pii_free_and_cached(self):
        target = vehicle()
        cases = sync_cases(self.db, [target], NOW)
        calls = []

        class Responses:
            def create(self, **kwargs):
                calls.append(kwargs)
                return SimpleNamespace(output_text=json.dumps({
                    "brief":"The critical recall case should be handled first.",
                    "cases":[{"case_id":case.id,"explanation":"Evidence supports immediate human review."} for case in cases],
                }))

        fake_openai = SimpleNamespace(OpenAI=lambda **kwargs: SimpleNamespace(responses=Responses()))
        with patch.dict(os.environ, {"OPENAI_API_KEY":"test-key"}, clear=True), patch.dict(sys.modules, {"openai":fake_openai}):
            first = enrich_action_centre(self.db, cases)
            second = enrich_action_centre(self.db, cases)
        self.assertEqual(first["source"], "openai")
        self.assertEqual(second["source"], "openai")
        self.assertEqual(len(calls), 1)
        sent = calls[0]["input"]
        self.assertNotIn(target.customerName, sent)
        self.assertNotIn(target.customerPhone, sent)
        self.assertNotIn(target.vin, sent)
        self.assertFalse(calls[0]["store"])
        self.assertEqual(calls[0]["reasoning"], {"effort":"low"})

    def test_malformed_or_timed_out_ai_falls_back_immediately(self):
        target = vehicle()
        cases = sync_cases(self.db, [target], NOW)

        class MalformedResponses:
            def create(self, **kwargs):
                return SimpleNamespace(output_text="not-json")

        fake_malformed = SimpleNamespace(OpenAI=lambda **kwargs: SimpleNamespace(responses=MalformedResponses()))
        with patch.dict(os.environ, {"OPENAI_API_KEY":"test-key"}, clear=True), patch.dict(sys.modules, {"openai":fake_malformed}):
            malformed = enrich_action_centre(self.db, cases, force=True)
        self.assertEqual(malformed["source"], "rules")

        class TimeoutResponses:
            def create(self, **kwargs):
                raise TimeoutError("simulated timeout")

        fake_timeout = SimpleNamespace(OpenAI=lambda **kwargs: SimpleNamespace(responses=TimeoutResponses()))
        with patch.dict(os.environ, {"OPENAI_API_KEY":"test-key"}, clear=True), patch.dict(sys.modules, {"openai":fake_timeout}):
            timed_out = enrich_action_centre(self.db, cases, force=True)
        self.assertEqual(timed_out["source"], "rules")


if __name__ == "__main__":
    unittest.main()
