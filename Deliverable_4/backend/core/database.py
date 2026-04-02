from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_db():
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_instance.db = db_instance.client[settings.DATABASE_NAME]

    # create indexes for alert rule information 
    await db_instance.db.alert_rules.create_index("rule_id", unique=True)
    await db_instance.db.alerts.create_index("alert_id", unique=True)
    await db_instance.db.alerts.create_index("status")
    await db_instance.db.telemetry.create_index("sensor_id")
    await db_instance.db.telemetry.create_index("timestamp")
    
    print("Connected to MongoDB")

async def close_db():
    if db_instance.client:
        db_instance.client.close()
        print("MongoDB connection closed")

def get_db():
    return db_instance.db