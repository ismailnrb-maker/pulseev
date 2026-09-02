import os
import uuid
import datetime
import bcrypt
from sqlalchemy import create_engine, Column, String, Integer, JSON
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# ── Database URL ──────────────────────────────────────────────────────────────
# Vercel Neon injects POSTGRES_URL (preferred) or DATABASE_URL
_raw_url = (
    os.environ.get("POSTGRES_URL") or
    os.environ.get("DATABASE_URL") or
    os.environ.get("POSTGRES_PRISMA_URL") or
    ""
)

if _raw_url:
    # Normalize to psycopg2 driver — psycopg2 handles sslmode=require natively
    if _raw_url.startswith("sqlite:"):
        DATABASE_URL = _raw_url
    elif _raw_url.startswith("postgres://"):
        DATABASE_URL = _raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif _raw_url.startswith("postgresql://") and "+psycopg2" not in _raw_url:
        DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    else:
        DATABASE_URL = _raw_url
    IS_POSTGRES = not _raw_url.startswith("sqlite:")
else:
    DATABASE_URL = "sqlite:////tmp/pulseev.db"
    IS_POSTGRES = False

# ── Engine ────────────────────────────────────────────────────────────────────
if IS_POSTGRES:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=1,
        max_overflow=0,
        connect_args={"connect_timeout": 10}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Models ────────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)
    role = Column(String(20), default="pilot", nullable=False)


class SessionLog(Base):
    __tablename__ = "session_logs"
    id = Column(String(50), primary_key=True, index=True)
    username = Column(String(50), nullable=False)
    ipAddress = Column(String(50), nullable=True)
    location = Column(String(200), nullable=True)
    startedAt = Column(String(30), nullable=False)
    lastHeartbeat = Column(String(30), nullable=False)
    durationSeconds = Column(Integer, default=0, nullable=False)


class AppSetting(Base):
    __tablename__ = "app_settings"
    key = Column(String(100), primary_key=True)
    value = Column(String(200), nullable=False)


class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(String(50), primary_key=True, index=True)
    vin = Column(String(17), unique=True, index=True, nullable=False)
    model = Column(String(20), nullable=False)
    chassisNo = Column(String(50), nullable=False)
    motorNo = Column(String(50), nullable=False)
    controllerNo = Column(String(50), nullable=True)
    batteryPackNo = Column(String(50), nullable=True)
    manufacturingDate = Column(String(10), nullable=False)

    # Customer Info
    customerName = Column(String(100), nullable=False)
    customerPhone = Column(String(30), nullable=False)
    customerLocation = Column(String(100), nullable=False)
    deliveryDate = Column(String(10), nullable=False)
    warrantyExpiryDate = Column(String(10), nullable=True)
    contactHistory = Column(JSON, default=list)
    issueCode = Column(String(80), nullable=True)
    issueReportedDate = Column(String(10), nullable=True)

    # Metrics and Workflow
    currentKm = Column(Integer, default=0)
    registrationStatus = Column(String(30), default="delivered")
    registrationNumber = Column(String(30), nullable=True)

    # JSON arrays and objects
    registrationDates = Column(JSON, default=dict)
    registrationNotes = Column(JSON, default=dict)
    batteryReplacement = Column(JSON, default=dict)
    services = Column(JSON, default=list)
    kmLog = Column(JSON, default=list)

    createdAt = Column(String(30), nullable=False)
    updatedAt = Column(String(30), nullable=False)


class ActionCase(Base):
    __tablename__ = "action_cases"
    id = Column(String(50), primary_key=True)
    caseKey = Column(String(180), unique=True, index=True, nullable=False)
    caseType = Column(String(50), nullable=False)
    priority = Column(String(20), nullable=False)
    riskScore = Column(Integer, nullable=False)
    category = Column(String(50), nullable=False)
    vehicleIds = Column(JSON, default=list)
    evidence = Column(JSON, default=list)
    reason = Column(String(1000), nullable=False)
    recommendation = Column(String(500), nullable=False)
    assignedOwner = Column(String(100), default="Unassigned", nullable=False)
    slaDeadline = Column(String(30), nullable=False)
    status = Column(String(30), default="open", nullable=False)
    evidenceFingerprint = Column(String(64), nullable=False)
    explanation = Column(String(1200), nullable=True)
    explanationSource = Column(String(30), default="rules", nullable=False)
    detectedAt = Column(String(30), nullable=False)
    assignedAt = Column(String(30), nullable=True)
    actionedAt = Column(String(30), nullable=True)
    createdAt = Column(String(30), nullable=False)
    updatedAt = Column(String(30), nullable=False)
    resolvedAt = Column(String(30), nullable=True)


class ActionAuditEvent(Base):
    __tablename__ = "action_audit_events"
    id = Column(String(50), primary_key=True)
    caseId = Column(String(50), index=True, nullable=False)
    actor = Column(String(100), nullable=False)
    eventType = Column(String(50), nullable=False)
    details = Column(JSON, default=dict)
    createdAt = Column(String(30), nullable=False)


class ServiceCampaign(Base):
    __tablename__ = "service_campaigns"
    id = Column(String(50), primary_key=True)
    name = Column(String(160), nullable=False)
    region = Column(String(80), nullable=False)
    issueCode = Column(String(80), nullable=False)
    vehicleIds = Column(JSON, default=list)
    owner = Column(String(100), nullable=False)
    status = Column(String(30), default="planned", nullable=False)
    createdAt = Column(String(30), nullable=False)


class ActionBrief(Base):
    __tablename__ = "action_briefs"
    id = Column(String(50), primary_key=True)
    queueFingerprint = Column(String(64), unique=True, index=True, nullable=False)
    text = Column(String(2000), nullable=False)
    source = Column(String(30), default="rules", nullable=False)
    generatedAt = Column(String(30), nullable=False)


def generate_curated_demo_vehicles():
    """Create a small, deterministic pitch fleet with deliberate lifecycle cases."""
    profiles = [
        ("Arjun Mehta", "+91 98765 41001", "Mumbai, MH", "CT2", "2025-10-18", 24500, "completed"),
        ("Priya Nair", "+91 98765 41002", "Bengaluru, KA", "CT2", "2026-01-12", 15800, "completed"),
        ("Rohan Kulkarni", "+91 98765 41003", "Pune, MH", "CO1", "2026-02-08", 11250, "completed"),
        ("Sneha Reddy", "+91 98765 41004", "Hyderabad, TS", "CT2", "2026-04-15", 4700, "completed"),
        ("Vikram Shah", "+91 98765 41005", "Ahmedabad, GJ", "CO1", "2026-08-10", 650, "submitted"),
        ("Ananya Bose", "+91 98765 41006", "Kolkata, WB", "CT2", "2026-03-20", 7800, "completed"),
        ("Karan Malhotra", "+91 98765 41007", "Delhi, DL", "CO1", "2026-03-02", 6400, "completed"),
        ("Meera Iyer", "+91 98765 41008", "Chennai, TN", "CT2", "2025-12-11", 12000, "completed"),
        ("Rahul Verma", "+91 98765 41009", "Jaipur, RJ", "CO1", "2026-06-22", 1350, "submitted"),
        ("Ishita Rao", "+91 98765 41010", "Lucknow, UP", "CT2", "2026-02-26", 10800, "completed"),
        ("Aditya Singh", "+91 98765 41011", "Mumbai, MH", "CO1", "2026-05-09", 5200, "completed"),
        ("Kavya Menon", "+91 98765 41012", "Bengaluru, KA", "CT2", "2026-01-29", 9200, "completed"),
        ("Nikhil Desai", "+91 98765 41013", "Pune, MH", "CT2", "2026-08-25", 180, "delivered"),
        ("Saanvi Gupta", "+91 98765 41014", "Delhi, DL", "CO1", "2026-08-16", 420, "documents_pending"),
        ("Dev Patel", "+91 98765 41015", "Ahmedabad, GJ", "CT2", "2026-03-18", 6200, "submitted"),
        ("Neha Joshi", "+91 98765 41016", "Hyderabad, TS", "CO1", "2026-07-04", 980, "completed"),
        ("Aarav Kapoor", "+91 98765 41017", "Chennai, TN", "CT2", "2026-06-05", 2100, "completed"),
        ("Diya Sharma", "+91 98765 41018", "Jaipur, RJ", "CO1", "2026-08-28", 95, "delivered"),
    ]
    prefixes = {"Mumbai, MH":"MH-02", "Bengaluru, KA":"KA-03", "Pune, MH":"MH-12", "Hyderabad, TS":"TS-09", "Ahmedabad, GJ":"GJ-01", "Kolkata, WB":"WB-02", "Delhi, DL":"DL-3C", "Chennai, TN":"TN-09", "Jaipur, RJ":"RJ-14", "Lucknow, UP":"UP-32"}
    milestones = [1000, 5000, 10000, 20000]
    now_str = datetime.datetime.utcnow().isoformat() + "Z"
    vehicles = []
    for i, (name, phone, location, model, delivery, km, reg_status) in enumerate(profiles, 1):
        vin_model = "C01" if model == "CO1" else model
        vin = f"MPEV26{vin_model}A{i:07d}"
        completed_count = sum(km >= due for due in milestones)
        if i == 3: completed_count = 2
        if i in (6, 7): completed_count = 0
        if i == 8: completed_count = 2
        if i == 15: completed_count = 1
        if i == 10: completed_count = 2
        services = []
        for service_no, due_km in enumerate(milestones, 1):
            completed = service_no <= completed_count or (i == 7 and service_no == 2)
            services.append({"serviceNumber":service_no, "dueKm":due_km, "completedKm":due_km + 40 + i * 7 if completed else 0, "date":f"2026-{min(8, service_no + 2):02d}-{min(27, 5 + i):02d}" if completed else "", "technician":["Vikram Singh", "Manoj Sharma", "Amit Yadav"][i % 3] if completed else "", "issues":"Routine inspection completed" if completed else ""})
        affected = i in (10, 11, 12)
        battery_status = {10:"pending", 11:"in_progress", 12:"completed"}.get(i, "not_affected")
        battery_serial = f"BP-{'LFP96' if model == 'CT2' else 'NMC72'}-{i:04d}"
        reg_number = f"{prefixes[location]}-EV-{4100+i}" if reg_status == "completed" else ""
        today = datetime.date.today()
        warranty_expiry = today + datetime.timedelta(days=30) if i == 10 else datetime.date.fromisoformat(delivery) + datetime.timedelta(days=730)
        contact_date = today - datetime.timedelta(days=9 if i == 10 else 3)
        issue_code = "BMS_CELL_IMBALANCE" if i in (1, 3, 11) else ("BATTERY_RECALL" if i == 10 else "")
        issue_reported = today - datetime.timedelta(days=18 if i == 10 else 12)
        vehicles.append(Vehicle(id=f"demo-{i:02d}", vin=vin, model=model, chassisNo=vin, motorNo=f"MTR-26-{i:05d}", controllerNo=f"CTRL-26-{i:05d}", batteryPackNo=battery_serial, manufacturingDate=(datetime.date.fromisoformat(delivery) - datetime.timedelta(days=18)).isoformat(), customerName=name, customerPhone=phone, customerLocation=location, deliveryDate=delivery, warrantyExpiryDate=warranty_expiry.isoformat(), contactHistory=[{"date":contact_date.isoformat(), "channel":"phone", "outcome":"no_answer", "note":"Routine follow-up"}], issueCode=issue_code, issueReportedDate=issue_reported.isoformat() if issue_code else "", currentKm=km, registrationStatus=reg_status, registrationNumber=reg_number, registrationDates={"delivered":delivery, reg_status:delivery}, registrationNotes={"completed":reg_number} if reg_number else {}, services=services, batteryReplacement={"affected":affected, "campaignId":"BC-2026-01" if affected else "", "status":battery_status, "oldSerial":battery_serial if affected else "", "newSerial":f"{battery_serial}-R" if battery_status == "completed" else "", "replacementDate":"2026-08-12" if battery_status == "completed" else "", "technician":"Arjun Patel" if battery_status in ("in_progress", "completed") else "", "customerConfirmed":battery_status == "completed", "reportedAt":issue_reported.isoformat() if affected else ""}, kmLog=[{"month":delivery[:7], "km":0}, {"month":"2026-08", "km":km}], createdAt=now_str, updatedAt=now_str))
    return vehicles


# ── DB Init (seeding) ─────────────────────────────────────────────────────────
def generate_seed_vehicles(count=200):
    import random
    random.seed(42)
    
    first_names = ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikash', 'Ananya', 'Deepak', 'Kavita', 'Rohit', 'Sunita', 'Aarav', 'Vihaan', 'Aditya', 'Sai', 'Arjun', 'Krishna', 'Ishaan', 'Shaurya', 'Pranav', 'Aryan', 'Diya', 'Ananya', 'Aanya', 'Pihu', 'Prisha', 'Saanvi', 'Anika', 'Zara', 'Meera', 'Riya', 'Rahul', 'Sanjay', 'Manoj', 'Rohan', 'Karan', 'Dev', 'Vijay', 'Raj', 'Alok', 'Vikram']
    last_names = ['Mehra', 'Sharma', 'Joshi', 'Kulkarni', 'Gupta', 'Reddy', 'Nair', 'Singh', 'Deshmukh', 'Patil', 'Kumar', 'Verma', 'Yadav', 'Patel', 'Das', 'Choudhury', 'Banerjee', 'Mishra', 'Trivedi', 'Rao', 'Bose', 'Pillai', 'Jha', 'Kapoor', 'Mehta', 'Grover', 'Sen', 'Dutta', 'Chatterjee']
    
    cities = ['Mumbai, MH', 'Delhi, DL', 'Bengaluru, KA', 'Pune, MH', 'Hyderabad, TS', 'Chennai, TN', 'Ahmedabad, GJ', 'Jaipur, RJ', 'Kolkata, WB', 'Lucknow, UP']
    technicians = ['Vikram Singh', 'Rajesh Kumar', 'Arjun Patel', 'Sanjay Verma', 'Manoj Sharma', 'Amit Yadav']
    
    state_mapping = {
        'Mumbai, MH': 'MH-02', 'Pune, MH': 'MH-12', 'Delhi, DL': 'DL-3C', 
        'Bengaluru, KA': 'KA-03', 'Hyderabad, TS': 'TS-09', 'Chennai, TN': 'TN-09',
        'Ahmedabad, GJ': 'GJ-01', 'Jaipur, RJ': 'RJ-14', 'Kolkata, WB': 'WB-02',
        'Lucknow, UP': 'UP-32'
    }
    
    vehicles = []
    models = ['CT2'] * 140 + ['CO1'] * 60
    battery_statuses = (
        [('completed', True)] * 60 +
        [('in_progress', False)] * 20 +
        [('pending', False)] * 20 +
        [('not_affected', False)] * 100
    )
    
    random.shuffle(models)
    random.shuffle(battery_statuses)
    
    vins = [f"MAT45678901234{idx}" for idx in range(101, 301)]
    
    start_date = datetime.date(2023, 1, 1)
    end_date = datetime.date(2026, 8, 25)
    days_range = (end_date - start_date).days
    
    now_str = datetime.datetime.utcnow().isoformat() + "Z"
    
    for i in range(count):
        vin = vins[i]
        model = models[i]
        
        random_days = random.randint(0, days_range)
        mfg_date = start_date + datetime.timedelta(days=random_days)
        del_date = mfg_date + datetime.timedelta(days=random.randint(5, 25))
        
        if mfg_date > datetime.date(2026, 8, 30):
            mfg_date = datetime.date(2026, 8, 30) - datetime.timedelta(days=random.randint(5, 20))
        if del_date > datetime.date(2026, 8, 30):
            del_date = datetime.date(2026, 8, 30)
            
        mfg_date_str = mfg_date.isoformat()
        del_date_str = del_date.isoformat()
        
        months_active = (datetime.date(2026, 8, 30) - del_date).days // 30
        months_active = max(1, months_active)
        
        km_per_month = random.randint(600, 1200)
        current_km = months_active * km_per_month
        
        location = random.choice(cities)
        cust_name = f"{random.choice(first_names)} {random.choice(last_names)}"
        cust_phone = f"+91 98765 {random.randint(10000, 99999)}"
        
        if months_active >= 2:
            reg_status = 'completed'
            state_prefix = state_mapping[location]
            letters = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=2))
            nums = f"{random.randint(1000, 9999)}"
            reg_number = f"{state_prefix}-{letters}-{nums}"
        else:
            reg_status = random.choice(['completed', 'submitted', 'documents_pending', 'delivered'])
            if reg_status == 'completed':
                state_prefix = state_mapping[location]
                letters = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=2))
                nums = f"{random.randint(1000, 9999)}"
                reg_number = f"{state_prefix}-{letters}-{nums}"
            else:
                reg_number = ''
                
        services = []
        due_milestones = [1000, 5000, 10000, 20000]
        for service_idx, due_km in enumerate(due_milestones, start=1):
            service_completed = current_km >= due_km
            if service_completed:
                completed_km = due_km + random.randint(-200, 500)
                completed_km = max(100, completed_km)
                days_to_reach = int((completed_km / km_per_month) * 30)
                service_date = del_date + datetime.timedelta(days=days_to_reach)
                if service_date > datetime.date(2026, 8, 30):
                    service_date = datetime.date(2026, 8, 30) - datetime.timedelta(days=random.randint(1, 15))
                service_date_str = service_date.isoformat()
                technician = random.choice(technicians)
                issues = random.choice(['None', 'None', 'None', 'Wheel alignment check', 'Minor brake pad adjustment', 'Software patch applied'])
            else:
                completed_km = 0
                service_date_str = ''
                technician = ''
                issues = ''
                
            services.append({
                "serviceNumber": service_idx,
                "dueKm": due_km,
                "completedKm": completed_km,
                "date": service_date_str,
                "technician": technician,
                "issues": issues
            })
            
        km_log = []
        for s in services:
            if s["completedKm"] > 0:
                log_month = s["date"][:7]
                km_log.append({"month": log_month, "km": s["completedKm"]})
        current_month = "2026-08"
        if not any(k["month"] == current_month for k in km_log):
            km_log.append({"month": current_month, "km": current_km})
        km_log.sort(key=lambda x: x["month"])
        unique_km_log = []
        seen_months = set()
        for k in km_log:
            if k["month"] not in seen_months:
                unique_km_log.append(k)
                seen_months.add(k["month"])
        km_log = unique_km_log
        
        bat_status, cust_conf = battery_statuses[i]
        is_affected = bat_status != 'not_affected'
        campaign_id = 'BC-2024-001' if is_affected else ''
        
        battery_prefix = 'BP-LFP-96' if model == 'CT2' else 'BP-NMC-72'
        old_serial = f"{battery_prefix}{i+1:03d}"
        
        if bat_status == 'completed':
            new_serial = f"{old_serial}-R"
            replace_days = random.randint(90, 360)
            replace_date = del_date + datetime.timedelta(days=replace_days)
            if replace_date > datetime.date(2026, 8, 30):
                replace_date = datetime.date(2026, 8, 30) - datetime.timedelta(days=random.randint(10, 60))
            replace_date_str = replace_date.isoformat()
            technician = random.choice(technicians)
        else:
            new_serial = ''
            replace_date_str = ''
            if bat_status == 'in_progress':
                technician = random.choice(technicians)
            else:
                technician = ''
                
        battery_replacement = {
            "affected": is_affected,
            "campaignId": campaign_id,
            "status": bat_status,
            "oldSerial": old_serial if is_affected else '',
            "newSerial": new_serial,
            "replacementDate": replace_date_str,
            "technician": technician,
            "customerConfirmed": cust_conf
        }
        
        chassis_no = f"CH-{del_date.year}-{i+1:03d}"
        motor_no = f"MT-ZF-78{i+1:03d}"
        controller_no = f"CT-INV-44{i+1:03d}"
        
        reg_dates = {"delivered": del_date_str}
        if reg_status in ['completed', 'submitted', 'documents_pending']:
            reg_dates[reg_status] = del_date_str
            
        vehicles.append(Vehicle(
            id=str(uuid.uuid4()),
            vin=vin,
            model=model,
            chassisNo=chassis_no,
            motorNo=motor_no,
            controllerNo=controller_no,
            batteryPackNo=old_serial,
            manufacturingDate=mfg_date_str,
            customerName=cust_name,
            customerPhone=cust_phone,
            customerLocation=location,
            deliveryDate=del_date_str,
            currentKm=current_km,
            registrationStatus=reg_status,
            registrationNumber=reg_number,
            registrationDates=reg_dates,
            registrationNotes={"completed": reg_number} if reg_number else {},
            batteryReplacement=battery_replacement,
            services=services,
            kmLog=km_log,
            createdAt=now_str,
            updatedAt=now_str
        ))
        
    return vehicles


def install_vehicle_signal_columns(db):
    """Idempotent compatibility migration for SQLite and PostgreSQL deployments."""
    from sqlalchemy import text
    statements = [
        'ALTER TABLE vehicles ADD COLUMN "warrantyExpiryDate" VARCHAR(10)',
        'ALTER TABLE vehicles ADD COLUMN "contactHistory" JSON',
        'ALTER TABLE vehicles ADD COLUMN "issueCode" VARCHAR(80)',
        'ALTER TABLE vehicles ADD COLUMN "issueReportedDate" VARCHAR(10)',
    ]
    for statement in statements:
        try:
            db.execute(text(statement))
            db.commit()
        except Exception:
            db.rollback()


def install_action_case_timestamp_columns(db):
    """Add explicit lifecycle timestamps to existing Action Centre tables."""
    from sqlalchemy import text
    statements = [
        'ALTER TABLE action_cases ADD COLUMN "detectedAt" VARCHAR(30)',
        'ALTER TABLE action_cases ADD COLUMN "assignedAt" VARCHAR(30)',
        'ALTER TABLE action_cases ADD COLUMN "actionedAt" VARCHAR(30)',
    ]
    for statement in statements:
        try:
            db.execute(text(statement))
            db.commit()
        except Exception:
            db.rollback()
    try:
        db.execute(text('UPDATE action_cases SET "detectedAt" = "createdAt" WHERE "detectedAt" IS NULL'))
        db.commit()
    except Exception:
        db.rollback()


def backfill_action_centre_demo_signals(db):
    """Keep the curated pitch fleet rich enough to demonstrate each rule."""
    today = datetime.date.today()
    demo_vehicles = {
        vehicle.id: vehicle
        for vehicle in db.query(Vehicle).filter(Vehicle.id.like("demo-%")).all()
    }
    for vehicle in demo_vehicles.values():
        if not vehicle.warrantyExpiryDate:
            vehicle.warrantyExpiryDate = (datetime.date.fromisoformat(vehicle.deliveryDate) + datetime.timedelta(days=730)).isoformat()
        if not vehicle.contactHistory:
            vehicle.contactHistory = [{
                "date": (today - datetime.timedelta(days=3)).isoformat(),
                "channel": "phone",
                "outcome": "connected",
                "note": "Routine lifecycle check-in",
            }]

    recall_vehicle = demo_vehicles.get("demo-10")
    if recall_vehicle:
        recall_vehicle.warrantyExpiryDate = (today + datetime.timedelta(days=30)).isoformat()
        recall_vehicle.contactHistory = [{
            "date": (today - datetime.timedelta(days=9)).isoformat(),
            "channel": "phone",
            "outcome": "no_answer",
            "note": "Recall appointment follow-up",
        }]
        recall_vehicle.issueCode = "BATTERY_RECALL"
        recall_vehicle.issueReportedDate = (today - datetime.timedelta(days=18)).isoformat()
        battery = dict(recall_vehicle.batteryReplacement or {})
        battery["reportedAt"] = recall_vehicle.issueReportedDate
        recall_vehicle.batteryReplacement = battery
        services = [dict(service) for service in (recall_vehicle.services or [])]
        if len(services) > 2:
            services[2].update({"completedKm": 0, "date": "", "technician": ""})
            recall_vehicle.services = services

    for vehicle_id in ("demo-01", "demo-03", "demo-11"):
        vehicle = demo_vehicles.get(vehicle_id)
        if vehicle:
            vehicle.issueCode = "BMS_CELL_IMBALANCE"
            vehicle.issueReportedDate = (today - datetime.timedelta(days=12)).isoformat()

    registration_vehicle = demo_vehicles.get("demo-14")
    if registration_vehicle:
        dates = dict(registration_vehicle.registrationDates or {})
        dates["documents_pending"] = (today - datetime.timedelta(days=40)).isoformat()
        registration_vehicle.registrationDates = dates

    prior_registration_example = demo_vehicles.get("demo-09")
    if prior_registration_example and prior_registration_example.registrationStatus == "documents_pending":
        prior_registration_example.registrationStatus = "submitted"
        dates = dict(prior_registration_example.registrationDates or {})
        dates["submitted"] = today.isoformat()
        prior_registration_example.registrationDates = dates

    service_balance = demo_vehicles.get("demo-08")
    if service_balance:
        services = [dict(service) for service in (service_balance.services or [])]
        for index in range(min(2, len(services))):
            if not services[index].get("completedKm"):
                services[index].update({"completedKm": int(services[index].get("dueKm") or 0) + 96, "date": today.isoformat(), "technician":"Amit Yadav", "issues":"Routine inspection completed"})
        service_balance.services = services
    db.commit()


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"init_db: create_all failed: {e}")
        return

    db = SessionLocal()
    try:
        install_vehicle_signal_columns(db)
        install_action_case_timestamp_columns(db)

        # Schema migration fallback for existing deployments
        from sqlalchemy import text
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'pilot' NOT NULL"))
            db.commit()
        except Exception:
            db.rollback()

        # Replace the legacy admin/admin account with the requested pilot login.
        db.query(User).filter(User.username == "admin").delete(synchronize_session=False)
        ismail_admin = db.query(User).filter(User.username == "ismailadmin").first()
        requested_password = b"ismailadmin"
        if not ismail_admin:
            salt = bcrypt.gensalt()
            ismail_admin = User(
                username="ismailadmin",
                hashed_password=bcrypt.hashpw(requested_password, salt).decode("utf-8"),
                role="pilot"
            )
            db.add(ismail_admin)
        else:
            password_matches = bcrypt.checkpw(
                requested_password,
                ismail_admin.hashed_password.encode("utf-8")
            )
            if not password_matches:
                salt = bcrypt.gensalt()
                ismail_admin.hashed_password = bcrypt.hashpw(requested_password, salt).decode("utf-8")
            ismail_admin.role = "pilot"
        db.commit()

        # Ensure master admin user 'master' exists and has correct role
        master_user = db.query(User).filter(User.username == "master").first()
        if not master_user:
            salt = bcrypt.gensalt()
            hashed_master = bcrypt.hashpw(b"master", salt).decode("utf-8")
            master = User(username="master", hashed_password=hashed_master, role="master")
            db.add(master)
            db.commit()
            print("Seeded master admin user.")
        else:
            if master_user.role != "master":
                master_user.role = "master"
                db.commit()
                print("Updated existing master user to master role.")

        # Replace accumulated test/import rows exactly once for the pitch build.
        dataset_version = "pitch-demo-v1"
        setting = db.query(AppSetting).filter(AppSetting.key == "demo_dataset_version").first()
        if not setting or setting.value != dataset_version:
            db.query(Vehicle).delete(synchronize_session=False)
            db.add_all(generate_curated_demo_vehicles())
            if setting:
                setting.value = dataset_version
            else:
                db.add(AppSetting(key="demo_dataset_version", value=dataset_version))
            db.commit()
            print("Installed curated 18-vehicle pitch dataset.")
        backfill_action_centre_demo_signals(db)
    except Exception as e:
        db.rollback()
        print(f"init_db seeding failed: {e}")
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
