import datetime
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.auth import get_current_user
from api.database import Base, ActionAuditEvent, ServiceCampaign, Vehicle, generate_curated_demo_vehicles, get_db
from api.index import app


class ActionApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread":False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        vehicles = generate_curated_demo_vehicles()
        registration = next(vehicle for vehicle in vehicles if vehicle.id == "demo-14")
        registration.registrationDates = {
            "documents_pending":(datetime.date.today() - datetime.timedelta(days=40)).isoformat()
        }
        self.db.add_all(vehicles)
        self.db.commit()

        def db_override():
            yield self.db

        app.dependency_overrides[get_db] = db_override
        app.dependency_overrides[get_current_user] = lambda: {"sub":"ismailadmin", "role":"pilot"}
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def test_queue_and_all_human_approved_action_flows(self):
        queue = self.client.get("/api/action-centre")
        self.assertEqual(queue.status_code, 200)
        cases = {case["caseType"]:case for case in queue.json()["cases"]}
        self.assertEqual(set(cases), {
            "battery_recall", "regional_pattern", "registration_delay",
            "multiple_services", "service_forecast",
        })

        draft = self.client.post(f"/api/action-cases/{cases['battery_recall']['id']}/draft-whatsapp")
        self.assertEqual(draft.status_code, 200)
        self.assertEqual(draft.json()["source"], "rules")

        assign = self.client.post(
            f"/api/action-cases/{cases['battery_recall']['id']}/actions",
            json={"type":"assign_technician", "payload":{"owner":"Arjun Patel"}},
        )
        self.assertEqual(assign.status_code, 200)
        battery_vehicle = self.db.query(Vehicle).filter_by(id="demo-10").one()
        self.assertEqual(battery_vehicle.batteryReplacement["technician"], "Arjun Patel")
        assigned_case = next(case for case in assign.json()["cases"] if case["id"] == cases["battery_recall"]["id"])
        self.assertIsNotNone(assigned_case["detectedAt"])
        self.assertIsNotNone(assigned_case["assignedAt"])
        self.assertIsNotNone(assigned_case["actionedAt"])

        campaign = self.client.post(
            f"/api/action-cases/{cases['regional_pattern']['id']}/actions",
            json={"type":"create_campaign", "payload":{"name":"West BMS Response", "region":"West", "owner":"Regional Lead"}},
        )
        self.assertEqual(campaign.status_code, 200)
        self.assertEqual(self.db.query(ServiceCampaign).count(), 1)

        escalation = self.client.post(
            f"/api/action-cases/{cases['registration_delay']['id']}/actions",
            json={"type":"escalate", "payload":{"owner":"RTO Owner", "note":"Documents need owner review"}},
        )
        self.assertEqual(escalation.status_code, 200)

        resolution = self.client.post(
            f"/api/action-cases/{cases['multiple_services']['id']}/actions",
            json={"type":"resolve", "payload":{"note":"Inspection completed and records reconciled"}},
        )
        self.assertEqual(resolution.status_code, 200)

        forecast = cases["service_forecast"]
        contact = self.client.post(
            f"/api/action-cases/{forecast['id']}/actions",
            json={"type":"log_contact", "payload":{"vehicleId":forecast["vehicle"]["id"], "channel":"whatsapp", "outcome":"opened"}},
        )
        self.assertEqual(contact.status_code, 200)
        self.assertEqual(self.db.query(ActionAuditEvent).count(), 5)

    def test_public_pilot_cannot_approve_actions(self):
        case_id = self.client.get("/api/action-centre").json()["cases"][0]["id"]
        app.dependency_overrides[get_current_user] = lambda: {"sub":"demo-user", "role":"pilot"}
        result = self.client.post(
            f"/api/action-cases/{case_id}/actions",
            json={"type":"resolve", "payload":{"note":"Should not be accepted"}},
        )
        self.assertEqual(result.status_code, 403)


if __name__ == "__main__":
    unittest.main()
