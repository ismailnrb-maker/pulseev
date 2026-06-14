import os
import ssl
from sqlalchemy import create_engine, Column, String, Integer, JSON, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Vercel Neon Postgres injects several possible env vars — try all of them
DATABASE_URL = (
    os.environ.get("POSTGRES_URL") or
    os.environ.get("DATABASE_URL") or
    os.environ.get("POSTGRES_PRISMA_URL") or
    "sqlite:///tmp/pulseev.db"
)

# Normalize all postgres:// variants to postgresql+pg8000://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

# Strip ?sslmode=require if present — pg8000 uses ssl_context instead
if "?sslmode=require" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("?sslmode=require", "")
if "&sslmode=require" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("&sslmode=require", "")

# Connect to database
connect_args = {}
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif "pg8000" in DATABASE_URL:
    # Neon requires SSL — use Python's ssl module for pg8000
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    connect_args = {"ssl_context": ssl_ctx}
    engine_kwargs = {"pool_pre_ping": True, "pool_size": 1, "max_overflow": 0}

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:////tmp/pulseev.db")
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)

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

def init_db():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Seed default user if empty
        user_count = db.query(User).count()
        if user_count == 0:
            # Avoid circular import, hash password locally using bcrypt
            import bcrypt
            pwd_bytes = "admin".encode('utf-8')
            salt = bcrypt.gensalt()
            hashed_pw = bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')
            admin = User(username="admin", hashed_password=hashed_pw)
            db.add(admin)
            db.commit()
            print("Auto-seeded default user: admin / admin")

        # 2. Seed 10 vehicle profiles if empty
        vehicle_count = db.query(Vehicle).count()
        if vehicle_count == 0:
            import uuid
            
            # Default service milestone template helper
            def make_services():
                return [
                    {"serviceNumber": 1, "dueKm": 1000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                    {"serviceNumber": 2, "dueKm": 5000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                    {"serviceNumber": 3, "dueKm": 10000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                    {"serviceNumber": 4, "dueKm": 20000, "completedKm": 0, "date": "", "technician": "", "issues": ""}
                ]
            
            # Default empty battery status
            def make_battery(affected=False, campaign="", status="not_affected", old="", new="", rdate="", tech="", confirmed=False):
                return {
                    "affected": affected,
                    "campaignId": campaign,
                    "status": status,
                    "oldSerial": old,
                    "newSerial": new,
                    "replacementDate": rdate,
                    "technician": tech,
                    "customerConfirmed": confirmed
                }

            vehicles = [
                Vehicle(
                    id=str(uuid.uuid4()), vin="MAT45678901234501", model="Comet",
                    chassisNo="CH-2024-0001", motorNo="MT-ZF-78001", controllerNo="CT-INV-44001", batteryPackNo="BP-LFP-96001",
                    manufacturingDate="2024-01-10", customerName="Rajesh Mehra", customerPhone="+91-9876543201", customerLocation="Mumbai, MH",
                    deliveryDate="2024-02-15", currentKm=12500, registrationStatus="completed", registrationNumber="MH-02-XX-1234",
                    registrationDates={"delivered": "2024-02-15", "documents_pending": "2024-02-17", "submitted": "2024-02-22", "completed": "2024-03-15"},
                    registrationNotes={"completed": "MH-02-XX-1234"},
                    services=[
                        {"serviceNumber": 1, "dueKm": 1000, "completedKm": 1050, "date": "2024-03-20", "technician": "Vikram Singh", "issues": "None"},
                        {"serviceNumber": 2, "dueKm": 5000, "completedKm": 5200, "date": "2024-06-15", "technician": "Rajesh Kumar", "issues": "Minor brake pad adjustment"},
                        {"serviceNumber": 3, "dueKm": 10000, "completedKm": 10100, "date": "2024-10-05", "technician": "Vikram Singh", "issues": "Tyre rotation done"},
                        {"serviceNumber": 4, "dueKm": 20000, "completedKm": 0, "date": "", "technician": "", "issues": ""}
                    ],
                    batteryReplacement=make_battery(True, "BC-2024-001", "completed", "BP-LFP-96001", "BP-LFP-96001-R", "2024-07-20", "Arjun Patel", True),
                    kmLog=[{"month": "2024-03", "km": 1200}, {"month": "2024-06", "km": 5200}, {"month": "2024-10", "km": 10100}],
                    createdAt="2024-02-15T10:00:00Z", updatedAt="2024-06-09T15:00:00Z"
                ),
                Vehicle(
                    id=str(uuid.uuid4()), vin="MAT45678901234502", model="Comet",
                    chassisNo="CH-2024-0002", motorNo="MT-ZF-78002", controllerNo="CT-INV-44002", batteryPackNo="BP-LFP-96002",
                    manufacturingDate="2024-02-05", customerName="Priya Sharma", customerPhone="+91-9876543202", customerLocation="Delhi, DL",
                    deliveryDate="2024-03-01", currentKm=8700, registrationStatus="completed", registrationNumber="DL-3C-AB-5678",
                    registrationDates={"delivered": "2024-03-01", "documents_pending": "2024-03-03", "submitted": "2024-03-08", "completed": "2024-04-01"},
                    registrationNotes={"completed": "DL-3C-AB-5678"},
                    services=[
                        {"serviceNumber": 1, "dueKm": 1000, "completedKm": 1020, "date": "2024-04-10", "technician": "Sanjay Verma", "issues": "None"},
                        {"serviceNumber": 2, "dueKm": 5000, "completedKm": 5100, "date": "2024-08-15", "technician": "Sanjay Verma", "issues": "Software update applied"},
                        {"serviceNumber": 3, "dueKm": 10000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 4, "dueKm": 20000, "completedKm": 0, "date": "", "technician": "", "issues": ""}
                    ],
                    batteryReplacement=make_battery(True, "BC-2024-001", "pending", "BP-LFP-96002"),
                    kmLog=[{"month": "2024-04", "km": 1100}, {"month": "2024-08", "km": 5100}],
                    createdAt="2024-03-01T10:00:00Z", updatedAt="2024-06-09T15:00:00Z"
                ),
                Vehicle(
                    id=str(uuid.uuid4()), vin="MAT45678901234503", model="Comet",
                    chassisNo="CH-2024-0003", motorNo="MT-ZF-78003", controllerNo="CT-INV-44003", batteryPackNo="BP-LFP-96003",
                    manufacturingDate="2024-03-12", customerName="Amit Joshi", customerPhone="+91-9876543203", customerLocation="Bengaluru, KA",
                    deliveryDate="2024-04-10", currentKm=6200, registrationStatus="submitted", registrationNumber="",
                    registrationDates={"delivered": "2024-04-10", "documents_pending": "2024-04-12", "submitted": "2024-04-18"},
                    registrationNotes={"submitted": "Submitted to RTO Bengaluru East"},
                    services=[
                        {"serviceNumber": 1, "dueKm": 1000, "completedKm": 950, "date": "2024-05-20", "technician": "Manoj Sharma", "issues": "None"},
                        {"serviceNumber": 2, "dueKm": 5000, "completedKm": 5050, "date": "2024-09-10", "technician": "Manoj Sharma", "issues": "AC gas top-up"},
                        {"serviceNumber": 3, "dueKm": 10000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 4, "dueKm": 20000, "completedKm": 0, "date": "", "technician": "", "issues": ""}
                    ],
                    batteryReplacement=make_battery(),
                    kmLog=[{"month": "2024-05", "km": 800}, {"month": "2024-09", "km": 5050}],
                    createdAt="2024-04-10T10:00:00Z", updatedAt="2024-06-09T15:00:00Z"
                ),
                Vehicle(
                    id=str(uuid.uuid4()), vin="MAT45678901234504", model="Cosmo",
                    chassisNo="CH-2024-0004", motorNo="MT-ZF-78004", controllerNo="CT-INV-44004", batteryPackNo="BP-NMC-72004",
                    manufacturingDate="2024-04-20", customerName="Sneha Kulkarni", customerPhone="+91-9876543204", customerLocation="Pune, MH",
                    deliveryDate="2024-05-25", currentKm=3800, registrationStatus="completed", registrationNumber="MH-12-YZ-9012",
                    registrationDates={"delivered": "2024-05-25", "documents_pending": "2024-05-27", "submitted": "2024-06-01", "completed": "2024-06-28"},
                    registrationNotes={"completed": "MH-12-YZ-9012"},
                    services=[
                        {"serviceNumber": 1, "dueKm": 1000, "completedKm": 1080, "date": "2024-07-05", "technician": "Amit Yadav", "issues": "None"},
                        {"serviceNumber": 2, "dueKm": 5000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 3, "dueKm": 10000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 4, "dueKm": 20000, "completedKm": 0, "date": "", "technician": "", "issues": ""}
                    ],
                    batteryReplacement=make_battery(True, "BC-2024-001", "in_progress", "BP-NMC-72004", tech="Arjun Patel"),
                    kmLog=[{"month": "2024-07", "km": 1080}],
                    createdAt="2024-05-25T10:00:00Z", updatedAt="2024-06-09T15:00:00Z"
                ),
                Vehicle(
                    id=str(uuid.uuid4()), vin="MAT45678901234505", model="Comet",
                    chassisNo="CH-2024-0005", motorNo="MT-ZF-78005", controllerNo="CT-INV-44005", batteryPackNo="BP-LFP-96005",
                    manufacturingDate="2024-05-15", customerName="Vikash Gupta", customerPhone="+91-9876543205", customerLocation="Hyderabad, TS",
                    deliveryDate="2024-06-20", currentKm=2100, registrationStatus="documents_pending", registrationNumber="",
                    registrationDates={"delivered": "2024-06-20", "documents_pending": "2024-06-22"},
                    registrationNotes={"documents_pending": "Waiting for address proof from customer"},
                    services=[
                        {"serviceNumber": 1, "dueKm": 1000, "completedKm": 1050, "date": "2024-08-10", "technician": "Rajesh Kumar", "issues": "None"},
                        {"serviceNumber": 2, "dueKm": 5000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 3, "dueKm": 10000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 4, "dueKm": 20000, "completedKm": 0, "date": "", "technician": "", "issues": ""}
                    ],
                    batteryReplacement=make_battery(),
                    kmLog=[{"month": "2024-08", "km": 1050}],
                    createdAt="2024-06-20T10:00:00Z", updatedAt="2024-06-09T15:00:00Z"
                ),
                Vehicle(
                    id=str(uuid.uuid4()), vin="MAT45678901234506", model="Cosmo",
                    chassisNo="CH-2024-0006", motorNo="MT-ZF-78006", controllerNo="CT-INV-44006", batteryPackNo="BP-NMC-72006",
                    manufacturingDate="2024-06-01", customerName="Ananya Reddy", customerPhone="+91-9876543206", customerLocation="Chennai, TN",
                    deliveryDate="2024-07-10", currentKm=1500, registrationStatus="completed", registrationNumber="TN-09-CD-3456",
                    registrationDates={"delivered": "2024-07-10", "documents_pending": "2024-07-12", "submitted": "2024-07-18", "completed": "2024-08-10"},
                    registrationNotes={"completed": "TN-09-CD-3456"},
                    services=[
                        {"serviceNumber": 1, "dueKm": 1000, "completedKm": 1020, "date": "2024-09-05", "technician": "Vikram Singh", "issues": "None"},
                        {"serviceNumber": 2, "dueKm": 5000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 3, "dueKm": 10000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 4, "dueKm": 20000, "completedKm": 0, "date": "", "technician": "", "issues": ""}
                    ],
                    batteryReplacement=make_battery(),
                    kmLog=[{"month": "2024-09", "km": 1020}],
                    createdAt="2024-07-10T10:00:00Z", updatedAt="2024-06-09T15:00:00Z"
                ),
                Vehicle(
                    id=str(uuid.uuid4()), vin="MAT45678901234507", model="Cosmo",
                    chassisNo="CH-2024-0007", motorNo="MT-ZF-78007", controllerNo="CT-INV-44007", batteryPackNo="BP-LFP-96007",
                    manufacturingDate="2024-07-01", customerName="Deepak Nair", customerPhone="+91-9876543207", customerLocation="Ahmedabad, GJ",
                    deliveryDate="2024-08-05", currentKm=5800, registrationStatus="completed", registrationNumber="GJ-01-EF-7890",
                    registrationDates={"delivered": "2024-08-05", "documents_pending": "2024-08-07", "submitted": "2024-08-12", "completed": "2024-09-05"},
                    registrationNotes={"completed": "GJ-01-EF-7890"},
                    services=[
                        {"serviceNumber": 1, "dueKm": 1000, "completedKm": 1100, "date": "2024-09-15", "technician": "Sanjay Verma", "issues": "None"},
                        {"serviceNumber": 2, "dueKm": 5000, "completedKm": 5150, "date": "2024-11-20", "technician": "Sanjay Verma", "issues": "Wheel alignment"},
                        {"serviceNumber": 3, "dueKm": 10000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 4, "dueKm": 20000, "completedKm": 0, "date": "", "technician": "", "issues": ""}
                    ],
                    batteryReplacement=make_battery(True, "BC-2024-001", "pending", "BP-LFP-96007"),
                    kmLog=[{"month": "2024-09", "km": 1100}, {"month": "2024-11", "km": 5150}],
                    createdAt="2024-08-05T10:00:00Z", updatedAt="2024-06-09T15:00:00Z"
                ),
                Vehicle(
                    id=str(uuid.uuid4()), vin="MAT45678901234508", model="Cosmo",
                    chassisNo="CH-2024-0008", motorNo="MT-ZF-78008", controllerNo="CT-INV-44008", batteryPackNo="BP-NMC-72008",
                    manufacturingDate="2024-08-10", customerName="Kavita Singh", customerPhone="+91-9876543208", customerLocation="Jaipur, RJ",
                    deliveryDate="2024-09-15", currentKm=4200, registrationStatus="submitted", registrationNumber="",
                    registrationDates={"delivered": "2024-09-15", "documents_pending": "2024-09-17", "submitted": "2024-09-22"},
                    registrationNotes={"submitted": "Pending RTO appointment"},
                    services=[
                        {"serviceNumber": 1, "dueKm": 1000, "completedKm": 1050, "date": "2024-10-20", "technician": "Manoj Sharma", "issues": "None"},
                        {"serviceNumber": 2, "dueKm": 5000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 3, "dueKm": 10000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 4, "dueKm": 20000, "completedKm": 0, "date": "", "technician": "", "issues": ""}
                    ],
                    batteryReplacement=make_battery(),
                    kmLog=[{"month": "2024-10", "km": 1050}],
                    createdAt="2024-09-15T10:00:00Z", updatedAt="2024-06-09T15:00:00Z"
                ),
                Vehicle(
                    id=str(uuid.uuid4()), vin="MAT45678901234509", model="Comet",
                    chassisNo="CH-2024-0009", motorNo="MT-ZF-78009", controllerNo="CT-INV-44009", batteryPackNo="BP-LFP-96009",
                    manufacturingDate="2024-09-05", customerName="Rohit Deshmukh", customerPhone="+91-9876543209", customerLocation="Kolkata, WB",
                    deliveryDate="2024-10-10", currentKm=1800, registrationStatus="delivered", registrationNumber="",
                    registrationDates={"delivered": "2024-10-10"}, registrationNotes={},
                    services=[
                        {"serviceNumber": 1, "dueKm": 1000, "completedKm": 1050, "date": "2024-11-25", "technician": "Amit Yadav", "issues": "None"},
                        {"serviceNumber": 2, "dueKm": 5000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 3, "dueKm": 10000, "completedKm": 0, "date": "", "technician": "", "issues": ""},
                        {"serviceNumber": 4, "dueKm": 20000, "completedKm": 0, "date": "", "technician": "", "issues": ""}
                    ],
                    batteryReplacement=make_battery(True, "BC-2024-002", "pending", "BP-LFP-96009"),
                    kmLog=[{"month": "2024-11", "km": 1050}],
                    createdAt="2024-10-10T10:00:00Z", updatedAt="2024-06-09T15:00:00Z"
                ),
                Vehicle(
                    id=str(uuid.uuid4()), vin="MAT45678901234510", model="Comet",
                    chassisNo="CH-2024-0010", motorNo="MT-ZF-78100", controllerNo="CT-INV-44100", batteryPackNo="BP-NMC-72100",
                    manufacturingDate="2024-10-01", customerName="Sunita Patil", customerPhone="+91-9876543210", customerLocation="Lucknow, UP",
                    deliveryDate="2024-11-05", currentKm=600, registrationStatus="documents_pending", registrationNumber="",
                    registrationDates={"delivered": "2024-11-05", "documents_pending": "2024-11-07"},
                    registrationNotes={"documents_pending": "Insurance documents pending"},
                    services=make_services(),
                    batteryReplacement=make_battery(),
                    kmLog=[],
                    createdAt="2024-11-05T10:00:00Z", updatedAt="2024-06-09T15:00:00Z"
                )
            ]
            db.add_all(vehicles)
            db.commit()
            print("Auto-seeded 10 vehicle profiles.")
    except Exception as e:
        db.rollback()
        print("Failed to auto-seed:", e)
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
