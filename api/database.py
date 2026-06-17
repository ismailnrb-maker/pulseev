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


# ── DB Init (seeding) ─────────────────────────────────────────────────────────
def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"init_db: create_all failed: {e}")
        return

    db = SessionLocal()
    try:
        # Seed default users (admin and master) if table is empty
        user_count = db.query(User).count()
        if user_count == 0:
            salt = bcrypt.gensalt()
            # Seed pilot user 'admin'
            hashed_admin = bcrypt.hashpw(b"admin", salt).decode("utf-8")
            admin = User(username="admin", hashed_password=hashed_admin, role="pilot")
            # Seed master admin 'master'
            hashed_master = bcrypt.hashpw(b"master", salt).decode("utf-8")
            master = User(username="master", hashed_password=hashed_master, role="master")
            db.add_all([admin, master])
            db.commit()
            print("Seeded default users: admin/admin (pilot) and master/master (master)")

        # Seed 10 vehicle profiles if empty
        vehicle_count = db.query(Vehicle).count()
        if vehicle_count == 0:
            def mk_services(c1=0,d1='',t1='',i1='',c2=0,d2='',t2='',i2='',c3=0,d3='',t3='',i3='',c4=0,d4='',t4='',i4=''):
                return [
                    {"serviceNumber":1,"dueKm":1000,"completedKm":c1,"date":d1,"technician":t1,"issues":i1},
                    {"serviceNumber":2,"dueKm":5000,"completedKm":c2,"date":d2,"technician":t2,"issues":i2},
                    {"serviceNumber":3,"dueKm":10000,"completedKm":c3,"date":d3,"technician":t3,"issues":i3},
                    {"serviceNumber":4,"dueKm":20000,"completedKm":c4,"date":d4,"technician":t4,"issues":i4},
                ]
            def mk_battery(affected=False,campaignId='',status='not_affected',oldSerial='',newSerial='',replacementDate='',technician='',customerConfirmed=False):
                return {"affected":affected,"campaignId":campaignId,"status":status,"oldSerial":oldSerial,"newSerial":newSerial,"replacementDate":replacementDate,"technician":technician,"customerConfirmed":customerConfirmed}

            now = datetime.datetime.utcnow().isoformat() + "Z"
            vehicles = [
                Vehicle(id=str(uuid.uuid4()),vin="MAT45678901234501",model="Comet",chassisNo="CH-2024-0001",motorNo="MT-ZF-78001",controllerNo="CT-INV-44001",batteryPackNo="BP-LFP-96001",manufacturingDate="2024-01-10",customerName="Rajesh Mehra",customerPhone="+91-9876543201",customerLocation="Mumbai, MH",deliveryDate="2024-02-15",currentKm=12500,registrationStatus="completed",registrationNumber="MH-02-XX-1234",registrationDates={"delivered":"2024-02-15","documents_pending":"2024-02-17","submitted":"2024-02-22","completed":"2024-03-15"},registrationNotes={"completed":"MH-02-XX-1234"},services=mk_services(1050,"2024-03-20","Vikram Singh","None",5200,"2024-06-15","Rajesh Kumar","Minor brake pad adjustment",10100,"2024-10-05","Vikram Singh","Tyre rotation done"),batteryReplacement=mk_battery(True,"BC-2024-001","completed","BP-LFP-96001","BP-LFP-96001-R","2024-07-20","Arjun Patel",True),kmLog=[{"month":"2024-03","km":1200},{"month":"2024-06","km":5200},{"month":"2024-10","km":10100}],createdAt="2024-02-15T10:00:00Z",updatedAt=now),
                Vehicle(id=str(uuid.uuid4()),vin="MAT45678901234502",model="Comet",chassisNo="CH-2024-0002",motorNo="MT-ZF-78002",controllerNo="CT-INV-44002",batteryPackNo="BP-LFP-96002",manufacturingDate="2024-02-05",customerName="Priya Sharma",customerPhone="+91-9876543202",customerLocation="Delhi, DL",deliveryDate="2024-03-01",currentKm=8700,registrationStatus="completed",registrationNumber="DL-3C-AB-5678",registrationDates={"delivered":"2024-03-01","documents_pending":"2024-03-03","submitted":"2024-03-08","completed":"2024-04-01"},registrationNotes={"completed":"DL-3C-AB-5678"},services=mk_services(1020,"2024-04-10","Sanjay Verma","None",5100,"2024-08-15","Sanjay Verma","Software update applied"),batteryReplacement=mk_battery(True,"BC-2024-001","pending","BP-LFP-96002"),kmLog=[{"month":"2024-04","km":1100},{"month":"2024-08","km":5100}],createdAt="2024-03-01T10:00:00Z",updatedAt=now),
                Vehicle(id=str(uuid.uuid4()),vin="MAT45678901234503",model="Comet",chassisNo="CH-2024-0003",motorNo="MT-ZF-78003",controllerNo="CT-INV-44003",batteryPackNo="BP-LFP-96003",manufacturingDate="2024-03-12",customerName="Amit Joshi",customerPhone="+91-9876543203",customerLocation="Bengaluru, KA",deliveryDate="2024-04-10",currentKm=6200,registrationStatus="submitted",registrationNumber="",registrationDates={"delivered":"2024-04-10","documents_pending":"2024-04-12","submitted":"2024-04-18"},registrationNotes={"submitted":"Submitted to RTO Bengaluru East"},services=mk_services(950,"2024-05-20","Manoj Sharma","None",5050,"2024-09-10","Manoj Sharma","AC gas top-up"),batteryReplacement=mk_battery(),kmLog=[{"month":"2024-05","km":800},{"month":"2024-09","km":5050}],createdAt="2024-04-10T10:00:00Z",updatedAt=now),
                Vehicle(id=str(uuid.uuid4()),vin="MAT45678901234504",model="Cosmo",chassisNo="CH-2024-0004",motorNo="MT-ZF-78004",controllerNo="CT-INV-44004",batteryPackNo="BP-NMC-72004",manufacturingDate="2024-04-20",customerName="Sneha Kulkarni",customerPhone="+91-9876543204",customerLocation="Pune, MH",deliveryDate="2024-05-25",currentKm=3800,registrationStatus="completed",registrationNumber="MH-12-YZ-9012",registrationDates={"delivered":"2024-05-25","documents_pending":"2024-05-27","submitted":"2024-06-01","completed":"2024-06-28"},registrationNotes={"completed":"MH-12-YZ-9012"},services=mk_services(1080,"2024-07-05","Amit Yadav","None"),batteryReplacement=mk_battery(True,"BC-2024-001","in_progress","BP-NMC-72004","","","Arjun Patel"),kmLog=[{"month":"2024-07","km":1080}],createdAt="2024-05-25T10:00:00Z",updatedAt=now),
                Vehicle(id=str(uuid.uuid4()),vin="MAT45678901234505",model="Comet",chassisNo="CH-2024-0005",motorNo="MT-ZF-78005",controllerNo="CT-INV-44005",batteryPackNo="BP-LFP-96005",manufacturingDate="2024-05-15",customerName="Vikash Gupta",customerPhone="+91-9876543205",customerLocation="Hyderabad, TS",deliveryDate="2024-06-20",currentKm=2100,registrationStatus="documents_pending",registrationNumber="",registrationDates={"delivered":"2024-06-20","documents_pending":"2024-06-22"},registrationNotes={"documents_pending":"Waiting for address proof from customer"},services=mk_services(1050,"2024-08-10","Rajesh Kumar","None"),batteryReplacement=mk_battery(),kmLog=[{"month":"2024-08","km":1050}],createdAt="2024-06-20T10:00:00Z",updatedAt=now),
                Vehicle(id=str(uuid.uuid4()),vin="MAT45678901234506",model="Cosmo",chassisNo="CH-2024-0006",motorNo="MT-ZF-78006",controllerNo="CT-INV-44006",batteryPackNo="BP-NMC-72006",manufacturingDate="2024-06-01",customerName="Ananya Reddy",customerPhone="+91-9876543206",customerLocation="Chennai, TN",deliveryDate="2024-07-10",currentKm=1500,registrationStatus="completed",registrationNumber="TN-09-CD-3456",registrationDates={"delivered":"2024-07-10","documents_pending":"2024-07-12","submitted":"2024-07-18","completed":"2024-08-10"},registrationNotes={"completed":"TN-09-CD-3456"},services=mk_services(1020,"2024-09-05","Vikram Singh","None"),batteryReplacement=mk_battery(),kmLog=[{"month":"2024-09","km":1020}],createdAt="2024-07-10T10:00:00Z",updatedAt=now),
                Vehicle(id=str(uuid.uuid4()),vin="MAT45678901234507",model="Cosmo",chassisNo="CH-2024-0007",motorNo="MT-ZF-78007",controllerNo="CT-INV-44007",batteryPackNo="BP-LFP-96007",manufacturingDate="2024-07-01",customerName="Deepak Nair",customerPhone="+91-9876543207",customerLocation="Ahmedabad, GJ",deliveryDate="2024-08-05",currentKm=5800,registrationStatus="completed",registrationNumber="GJ-01-EF-7890",registrationDates={"delivered":"2024-08-05","documents_pending":"2024-08-07","submitted":"2024-08-12","completed":"2024-09-05"},registrationNotes={"completed":"GJ-01-EF-7890"},services=mk_services(1100,"2024-09-15","Sanjay Verma","None",5150,"2024-11-20","Sanjay Verma","Wheel alignment"),batteryReplacement=mk_battery(True,"BC-2024-001","pending","BP-LFP-96007"),kmLog=[{"month":"2024-09","km":1100},{"month":"2024-11","km":5150}],createdAt="2024-08-05T10:00:00Z",updatedAt=now),
                Vehicle(id=str(uuid.uuid4()),vin="MAT45678901234508",model="Cosmo",chassisNo="CH-2024-0008",motorNo="MT-ZF-78008",controllerNo="CT-INV-44008",batteryPackNo="BP-NMC-72008",manufacturingDate="2024-08-10",customerName="Kavita Singh",customerPhone="+91-9876543208",customerLocation="Jaipur, RJ",deliveryDate="2024-09-15",currentKm=4200,registrationStatus="submitted",registrationNumber="",registrationDates={"delivered":"2024-09-15","documents_pending":"2024-09-17","submitted":"2024-09-22"},registrationNotes={"submitted":"Pending RTO appointment"},services=mk_services(1050,"2024-10-20","Manoj Sharma","None"),batteryReplacement=mk_battery(),kmLog=[{"month":"2024-10","km":1050}],createdAt="2024-09-15T10:00:00Z",updatedAt=now),
                Vehicle(id=str(uuid.uuid4()),vin="MAT45678901234509",model="Comet",chassisNo="CH-2024-0009",motorNo="MT-ZF-78009",controllerNo="CT-INV-44009",batteryPackNo="BP-LFP-96009",manufacturingDate="2024-09-05",customerName="Rohit Deshmukh",customerPhone="+91-9876543209",customerLocation="Kolkata, WB",deliveryDate="2024-10-10",currentKm=1800,registrationStatus="delivered",registrationNumber="",registrationDates={"delivered":"2024-10-10"},registrationNotes={},services=mk_services(1050,"2024-11-25","Amit Yadav","None"),batteryReplacement=mk_battery(True,"BC-2024-002","pending","BP-LFP-96009"),kmLog=[{"month":"2024-11","km":1050}],createdAt="2024-10-10T10:00:00Z",updatedAt=now),
                Vehicle(id=str(uuid.uuid4()),vin="MAT45678901234510",model="Comet",chassisNo="CH-2024-0010",motorNo="MT-ZF-78100",controllerNo="CT-INV-44100",batteryPackNo="BP-NMC-72100",manufacturingDate="2024-10-01",customerName="Sunita Patil",customerPhone="+91-9876543210",customerLocation="Lucknow, UP",deliveryDate="2024-11-05",currentKm=600,registrationStatus="documents_pending",registrationNumber="",registrationDates={"delivered":"2024-11-05","documents_pending":"2024-11-07"},registrationNotes={"documents_pending":"Insurance documents pending"},services=mk_services(),batteryReplacement=mk_battery(),kmLog=[],createdAt="2024-11-05T10:00:00Z",updatedAt=now),
            ]
            db.add_all(vehicles)
            db.commit()
            print("Seeded 10 vehicle profiles.")
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
