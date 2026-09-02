import datetime
import hashlib
import json
import math
import os
import uuid
from collections import defaultdict

from api.database import ActionAuditEvent, ActionBrief, ActionCase, Vehicle


PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2}
# Asia/Kolkata is permanently UTC+05:30 and has no daylight-saving transitions.
KOLKATA = datetime.timezone(datetime.timedelta(hours=5, minutes=30), name="Asia/Kolkata")
BUSINESS_OPEN_HOUR = 9
BUSINESS_CLOSE_HOUR = 18
REGION_BY_STATE = {
    "MH": "West", "GJ": "West", "GA": "West",
    "DL": "North", "UP": "North", "RJ": "North", "HR": "North", "PB": "North",
    "KA": "South", "TS": "South", "TN": "South", "KL": "South", "AP": "South",
    "WB": "East", "OD": "East", "BR": "East", "AS": "East",
}


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)


def iso_now(now=None):
    return (now or utc_now()).isoformat().replace("+00:00", "Z")


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def region_for(location):
    state = (location or "").split(",")[-1].strip().upper()
    return REGION_BY_STATE.get(state, state or "Unknown")


def priority_for(score):
    if score >= 85:
        return "critical"
    if score >= 65:
        return "high"
    return "medium"


def add_business_time(start, priority):
    """Add SLA time inside 09:00–18:00, Monday–Friday, in Asia/Kolkata."""
    cursor = start if start.tzinfo else start.replace(tzinfo=datetime.timezone.utc)
    cursor = cursor.astimezone(KOLKATA)

    def next_open(value):
        value = value.replace(second=0, microsecond=0)
        while value.weekday() >= 5:
            value = (value + datetime.timedelta(days=1)).replace(hour=BUSINESS_OPEN_HOUR, minute=0)
        if value.hour < BUSINESS_OPEN_HOUR:
            value = value.replace(hour=BUSINESS_OPEN_HOUR, minute=0)
        elif value.hour >= BUSINESS_CLOSE_HOUR:
            value = (value + datetime.timedelta(days=1)).replace(hour=BUSINESS_OPEN_HOUR, minute=0)
            while value.weekday() >= 5:
                value += datetime.timedelta(days=1)
        return value

    cursor = next_open(cursor)
    remaining = {"critical":4, "high":9, "medium":27}[priority]
    while remaining:
        close = cursor.replace(hour=BUSINESS_CLOSE_HOUR, minute=0)
        available = max(0, (close - cursor).total_seconds() / 3600)
        if remaining <= available:
            cursor += datetime.timedelta(hours=remaining)
            remaining = 0
        else:
            remaining -= available
            cursor = next_open((cursor + datetime.timedelta(days=1)).replace(hour=BUSINESS_OPEN_HOUR, minute=0))
    return cursor.astimezone(datetime.timezone.utc)


def overdue_services(vehicle):
    services = vehicle.services or []
    return [
        service for service in services
        if not service.get("completedKm") and int(vehicle.currentKm or 0) > int(service.get("dueKm") or 0)
    ]


def latest_contact_date(vehicle):
    dates = [parse_date(item.get("date")) for item in (vehicle.contactHistory or [])]
    dates = [value for value in dates if value]
    return max(dates) if dates else None


def usage_forecast(vehicle, today):
    points = []
    for entry in vehicle.kmLog or []:
        try:
            points.append((datetime.date.fromisoformat(f"{entry['month'][:7]}-01"), int(entry.get("km") or 0)))
        except (KeyError, TypeError, ValueError):
            continue
    points.sort(key=lambda item: item[0])
    if len(points) >= 2 and points[-1][1] > points[0][1]:
        elapsed = max(1, (points[-1][0] - points[0][0]).days)
        daily_rate = (points[-1][1] - points[0][1]) / elapsed
    else:
        delivered = parse_date(vehicle.deliveryDate)
        elapsed = max(1, (today - delivered).days) if delivered else 0
        daily_rate = int(vehicle.currentKm or 0) / elapsed if elapsed else 0
    incomplete = sorted(
        int(service.get("dueKm") or 0)
        for service in (vehicle.services or [])
        if not service.get("completedKm") and int(service.get("dueKm") or 0) > int(vehicle.currentKm or 0)
    )
    if not incomplete or daily_rate <= 0:
        return None
    next_due = incomplete[0]
    days = math.ceil((next_due - int(vehicle.currentKm or 0)) / daily_rate)
    if 0 <= days <= 30:
        return {"nextDueKm": next_due, "days": days, "dailyRate": round(daily_rate, 1)}
    return None


def fingerprint(candidate):
    payload = {
        "caseType": candidate["caseType"],
        "vehicleIds": sorted(candidate["vehicleIds"]),
        "score": candidate["riskScore"],
        "evidence": candidate["evidence"],
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def build_candidates(vehicles, now=None):
    now = now or utc_now()
    today = now.date()
    candidates = []

    for vehicle in vehicles:
        overdue = overdue_services(vehicle)
        battery = vehicle.batteryReplacement or {}
        warranty = parse_date(vehicle.warrantyExpiryDate)
        warranty_days = (warranty - today).days if warranty else None
        contact = latest_contact_date(vehicle)
        contact_gap = (today - contact).days if contact else 999
        reported = parse_date(battery.get("reportedAt") or vehicle.issueReportedDate)
        recall_days = (today - reported).days if reported else 0

        if (
            battery.get("affected")
            and battery.get("status") == "pending"
            and warranty_days is not None and 0 <= warranty_days <= 45
            and contact_gap >= 7
        ):
            score = 35 + 20 + 15 + (15 if overdue else 0) + (7 if recall_days >= 14 else 0)
            evidence = [
                "Battery recall remains pending",
                f"Warranty expires in {warranty_days} days",
                f"Last customer-contact attempt was {contact_gap} days ago",
                f"Recall has been open for {recall_days} days",
            ]
            if overdue:
                evidence.append(f"{len(overdue)} service milestone is also overdue")
            candidates.append({
                "caseKey": f"battery_recall:{vehicle.id}",
                "caseType": "battery_recall",
                "riskScore": min(100, score),
                "category": "Battery & Warranty",
                "vehicleIds": [vehicle.id],
                "evidence": evidence,
                "reason": "A pending battery recall overlaps with an approaching warranty deadline and a customer-contact gap.",
                "recommendation": "Assign a senior technician, reserve replacement stock and contact the customer.",
            })

        reg_date = parse_date((vehicle.registrationDates or {}).get("documents_pending"))
        reg_days = (today - reg_date).days if reg_date else 0
        if vehicle.registrationStatus == "documents_pending" and reg_days > 30:
            score = 70 + min(14, max(0, ((reg_days - 30) // 7) * 3))
            candidates.append({
                "caseKey": f"registration_delay:{vehicle.id}",
                "caseType": "registration_delay",
                "riskScore": score,
                "category": "Registration",
                "vehicleIds": [vehicle.id],
                "evidence": [f"Documents-pending stage has remained open for {reg_days} days", "RTO registration is not complete"],
                "reason": "The registration workflow has exceeded the 30-day documents-pending threshold.",
                "recommendation": "Escalate to the dealer or RTO owner and confirm the missing document plan.",
            })

        if len(overdue) >= 2:
            furthest_delay = max(int(vehicle.currentKm or 0) - int(item.get("dueKm") or 0) for item in overdue)
            score = 72 + min(12, (len(overdue) - 2) * 6) + min(10, furthest_delay // 1500)
            candidates.append({
                "caseKey": f"multiple_services:{vehicle.id}",
                "caseType": "multiple_services",
                "riskScore": min(84, score),
                "category": "Service",
                "vehicleIds": [vehicle.id],
                "evidence": [f"{len(overdue)} service milestones are overdue", f"Odometer is {int(vehicle.currentKm or 0):,} km", f"Furthest threshold exceeded by {furthest_delay:,} km"],
                "reason": "The vehicle has crossed multiple service thresholds without recorded completion.",
                "recommendation": "Schedule a priority inspection and reconcile the missing service history.",
            })

        forecast = usage_forecast(vehicle, today)
        if forecast:
            score = 60 - min(15, forecast["days"] // 2)
            candidates.append({
                "caseKey": f"service_forecast:{vehicle.id}",
                "caseType": "service_forecast",
                "riskScore": score,
                "category": "Service Forecast",
                "vehicleIds": [vehicle.id],
                "evidence": [f"Next milestone: {forecast['nextDueKm']:,} km", f"Projected in {forecast['days']} days", f"Observed use: {forecast['dailyRate']} km/day"],
                "reason": "Recent odometer usage indicates the next service milestone will likely be reached this month.",
                "recommendation": "Send a proactive service reminder and reserve an appointment window.",
            })

    pattern_groups = defaultdict(list)
    for vehicle in vehicles:
        if vehicle.issueCode:
            pattern_groups[(region_for(vehicle.customerLocation), vehicle.issueCode)].append(vehicle)
    for (region, issue_code), group in pattern_groups.items():
        if len(group) < 3:
            continue
        score = min(98, 88 + max(0, len(group) - 3) * 2)
        candidates.append({
            "caseKey": f"regional_pattern:{region}:{issue_code}",
            "caseType": "regional_pattern",
            "riskScore": score,
            "category": "Pattern Detection",
            "vehicleIds": [vehicle.id for vehicle in group],
            "evidence": [f"{len(group)} vehicles share issue {issue_code}", f"All cases cluster in the {region} region", "The pattern exceeds the three-vehicle campaign threshold"],
            "reason": "The same operational issue is recurring across several vehicles in one region.",
            "recommendation": "Create a regional service campaign and assign a campaign owner.",
        })

    for candidate in candidates:
        candidate["priority"] = priority_for(candidate["riskScore"])
        candidate["fingerprint"] = fingerprint(candidate)
    return candidates


def fallback_explanation(candidate):
    return f"{candidate['reason']} Evidence: {'; '.join(candidate['evidence'])}."


def sync_cases(db, vehicles, now=None):
    now = now or utc_now()
    now_iso = iso_now(now)
    candidates = build_candidates(vehicles, now)
    existing = {case.caseKey: case for case in db.query(ActionCase).all()}
    active_keys = set()

    for candidate in candidates:
        active_keys.add(candidate["caseKey"])
        case = existing.get(candidate["caseKey"])
        if not case:
            case = ActionCase(
                id=str(uuid.uuid4()), caseKey=candidate["caseKey"], caseType=candidate["caseType"],
                priority=candidate["priority"], riskScore=candidate["riskScore"], category=candidate["category"],
                vehicleIds=candidate["vehicleIds"], evidence=candidate["evidence"], reason=candidate["reason"],
                recommendation=candidate["recommendation"], assignedOwner="Unassigned",
                slaDeadline=iso_now(add_business_time(now, candidate["priority"])), status="open",
                evidenceFingerprint=candidate["fingerprint"], explanation=fallback_explanation(candidate),
                explanationSource="rules", detectedAt=now_iso, createdAt=now_iso, updatedAt=now_iso,
            )
            db.add(case)
            existing[candidate["caseKey"]] = case
        else:
            changed = case.evidenceFingerprint != candidate["fingerprint"]
            case.caseType = candidate["caseType"]
            case.priority = candidate["priority"]
            case.riskScore = candidate["riskScore"]
            case.category = candidate["category"]
            case.vehicleIds = candidate["vehicleIds"]
            case.evidence = candidate["evidence"]
            case.reason = candidate["reason"]
            case.recommendation = candidate["recommendation"]
            case.updatedAt = now_iso
            if changed:
                case.evidenceFingerprint = candidate["fingerprint"]
                case.explanation = fallback_explanation(candidate)
                case.explanationSource = "rules"
                if case.status in ("resolved", "auto_closed"):
                    case.status = "open"
                    case.resolvedAt = None
                    case.slaDeadline = iso_now(add_business_time(now, candidate["priority"]))
                    db.add(ActionAuditEvent(id=str(uuid.uuid4()), caseId=case.id, actor="risk-engine", eventType="reopened", details={"reason":"Evidence changed"}, createdAt=now_iso))

    for case in existing.values():
        if case.caseKey not in active_keys and case.status not in ("resolved", "auto_closed"):
            case.status = "auto_closed"
            case.resolvedAt = now_iso
            case.updatedAt = now_iso
            db.add(ActionAuditEvent(id=str(uuid.uuid4()), caseId=case.id, actor="risk-engine", eventType="auto_closed", details={"reason":"Underlying signal cleared"}, createdAt=now_iso))
    db.commit()
    return ranked_active_cases(db)


def ranked_active_cases(db):
    cases = db.query(ActionCase).filter(ActionCase.status.notin_(["resolved", "auto_closed"])).all()
    cases.sort(key=lambda case: (PRIORITY_ORDER.get(case.priority, 9), -case.riskScore, case.slaDeadline, case.createdAt))
    return cases[:5]


def serialize_case(case, vehicle_map):
    vehicles = [vehicle_map[item] for item in (case.vehicleIds or []) if item in vehicle_map]
    primary = vehicles[0] if vehicles else None
    return {
        "id": case.id, "caseKey": case.caseKey, "caseType": case.caseType,
        "priority": case.priority, "riskScore": case.riskScore, "category": case.category,
        "vehicleIds": case.vehicleIds or [], "evidence": case.evidence or [], "reason": case.reason,
        "recommendation": case.recommendation, "assignedOwner": case.assignedOwner,
        "slaDeadline": case.slaDeadline, "status": case.status,
        "explanation": case.explanation or case.reason, "explanationSource": case.explanationSource,
        "detectedAt": case.detectedAt or case.createdAt, "assignedAt": case.assignedAt,
        "actionedAt": case.actionedAt, "resolvedAt": case.resolvedAt,
        "createdAt": case.createdAt, "updatedAt": case.updatedAt,
        "customer": {"name": primary.customerName, "phone": primary.customerPhone} if primary else None,
        "vehicle": {"id": primary.id, "vin": primary.vin, "model": primary.model, "location": primary.customerLocation} if primary else None,
        "region": region_for(primary.customerLocation) if primary else None,
        "issueCode": next((vehicle.issueCode for vehicle in vehicles if vehicle.issueCode), None),
        "affectedVehicles": [{"id": vehicle.id, "vin": vehicle.vin, "model": vehicle.model, "location": vehicle.customerLocation} for vehicle in vehicles],
    }


def queue_fingerprint(cases):
    value = "|".join(f"{case.id}:{case.evidenceFingerprint}" for case in cases)
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def fallback_brief(cases):
    counts = {name: sum(case.priority == name for case in cases) for name in PRIORITY_ORDER}
    if not cases:
        return "No active operational risks currently meet the Action Centre thresholds."
    return f"The five highest-priority cases contain {counts['critical']} critical, {counts['high']} high and {counts['medium']} medium cases. Address the highest-scoring SLA first, then review clustered issues for coordinated action."


def enrich_action_centre(db, cases, force=False):
    queue_hash = queue_fingerprint(cases)
    cached = db.query(ActionBrief).filter(ActionBrief.queueFingerprint == queue_hash).first()
    if cached and cached.source == "openai" and not force:
        return {"brief": cached.text, "source": cached.source, "queueFingerprint": queue_hash}

    brief = fallback_brief(cases)
    source = "rules"
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key and cases:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key, timeout=15.0)
            safe_cases = [{
                "case_id": case.id, "priority": case.priority, "risk_score": case.riskScore,
                "category": case.category, "evidence": case.evidence, "recommended_action": case.recommendation,
            } for case in cases]
            schema = {
                "type":"object", "additionalProperties":False,
                "properties":{
                    "brief":{"type":"string"},
                    "cases":{"type":"array", "items":{"type":"object", "additionalProperties":False, "properties":{"case_id":{"type":"string"}, "explanation":{"type":"string"}}, "required":["case_id","explanation"]}},
                },
                "required":["brief","cases"],
            }
            response = client.responses.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-5.6-terra"),
                reasoning={"effort":"low"}, store=False, max_output_tokens=900,
                instructions="Explain operational evidence concisely. Do not invent facts, scores, identities or actions. Return a two-sentence management brief and one two-sentence explanation per case.",
                input=json.dumps(safe_cases),
                text={"format":{"type":"json_schema", "name":"action_centre_enrichment", "strict":True, "schema":schema}},
            )
            parsed = json.loads(response.output_text)
            explanations = {item["case_id"]: item["explanation"] for item in parsed["cases"]}
            for case in cases:
                if case.id in explanations:
                    case.explanation = explanations[case.id][:1200]
                    case.explanationSource = "openai"
            brief = parsed["brief"][:2000]
            source = "openai"
        except Exception as exc:
            print(f"Action Centre AI fallback: {exc}")

    if cached:
        cached.text, cached.source, cached.generatedAt = brief, source, iso_now()
    else:
        db.add(ActionBrief(id=str(uuid.uuid4()), queueFingerprint=queue_hash, text=brief, source=source, generatedAt=iso_now()))
    db.commit()
    return {"brief": brief, "source": source, "queueFingerprint": queue_hash}


def draft_whatsapp(case, vehicle):
    template = "Hello {{customer_first_name}}, your {{model}} needs attention for a scheduled lifecycle check. Please reply with a convenient appointment time so our service team can assist you."
    source = "rules"
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key, timeout=15.0)
            schema = {"type":"object", "additionalProperties":False, "properties":{"draft":{"type":"string"}}, "required":["draft"]}
            safe_input = {"priority":case.priority, "category":case.category, "evidence":case.evidence, "recommended_action":case.recommendation, "placeholders":["{{customer_first_name}}", "{{model}}"]}
            response = client.responses.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-5.6-terra"), reasoning={"effort":"low"},
                store=False, max_output_tokens=250,
                instructions="Draft a concise, calm WhatsApp appointment message using the supplied placeholders. Do not claim an appointment is booked and do not invent details.",
                input=json.dumps(safe_input),
                text={"format":{"type":"json_schema", "name":"whatsapp_draft", "strict":True, "schema":schema}},
            )
            template = json.loads(response.output_text)["draft"]
            source = "openai"
        except Exception as exc:
            print(f"WhatsApp AI fallback: {exc}")
    first_name = (vehicle.customerName or "Customer").split()[0]
    return {"draft":template.replace("{{customer_first_name}}", first_name).replace("{{model}}", vehicle.model), "source":source, "phone":vehicle.customerPhone}
