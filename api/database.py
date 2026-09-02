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
    if _raw_url.startswith("postgres://"):
        DATABASE_URL = _raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif _raw_url.startswith("postgresql://") and "+psycopg2" not in _raw_url:
        DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    else:
        DATABASE_URL = _raw_url
    IS_POSTGRES = True
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
        ("Rahul Verma", "+91 98765 41009", "Jaipur, RJ", "CO1", "2026-06-22", 1350, "documents_pending"),
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
        if i in (8, 15): completed_count = 1
        services = []
        for service_no, due_km in enumerate(milestones, 1):
            completed = service_no <= completed_count or (i == 7 and service_no == 2)
            services.append({"serviceNumber":service_no, "dueKm":due_km, "completedKm":due_km + 40 + i * 7 if completed else 0, "date":f"2026-{min(8, service_no + 2):02d}-{min(27, 5 + i):02d}" if completed else "", "technician":["Vikram Singh", "Manoj Sharma", "Amit Yadav"][i % 3] if completed else "", "issues":"Routine inspection completed" if completed else ""})
        affected = i in (10, 11, 12)
        battery_status = {10:"pending", 11:"in_progress", 12:"completed"}.get(i, "not_affected")
        battery_serial = f"BP-{'LFP96' if model == 'CT2' else 'NMC72'}-{i:04d}"
        reg_number = f"{prefixes[location]}-EV-{4100+i}" if reg_status == "completed" else ""
        vehicles.append(Vehicle(id=f"demo-{i:02d}", vin=vin, model=model, chassisNo=vin, motorNo=f"MTR-26-{i:05d}", controllerNo=f"CTRL-26-{i:05d}", batteryPackNo=battery_serial, manufacturingDate=(datetime.date.fromisoformat(delivery) - datetime.timedelta(days=18)).isoformat(), customerName=name, customerPhone=phone, customerLocation=location, deliveryDate=delivery, currentKm=km, registrationStatus=reg_status, registrationNumber=reg_number, registrationDates={"delivered":delivery, reg_status:delivery}, registrationNotes={"completed":reg_number} if reg_number else {}, services=services, batteryReplacement={"affected":affected, "campaignId":"BC-2026-01" if affected else "", "status":battery_status, "oldSerial":battery_serial if affected else "", "newSerial":f"{battery_serial}-R" if battery_status == "completed" else "", "replacementDate":"2026-08-12" if battery_status == "completed" else "", "technician":"Arjun Patel" if battery_status in ("in_progress", "completed") else "", "customerConfirmed":battery_status == "completed"}, kmLog=[{"month":delivery[:7], "km":0}, {"month":"2026-08", "km":km}], createdAt=now_str, updatedAt=now_str))
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


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"init_db: create_all failed: {e}")
        return

    db = SessionLocal()
    try:
        # Schema migration fallback for existing deployments
        from sqlalchemy import text
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'pilot' NOT NULL"))
            db.commit()
        except Exception:
            db.rollback()

        # Ensure default pilot user 'admin' exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            salt = bcrypt.gensalt()
            hashed_admin = bcrypt.hashpw(b"admin", salt).decode("utf-8")
            admin = User(username="admin", hashed_password=hashed_admin, role="pilot")
            db.add(admin)
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
