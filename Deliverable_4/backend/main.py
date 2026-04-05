from fastapi import FastAPI
from routers import disaster_predictor_router, alert_rules_router, alerts_router, auth_router, zone_router, telemetry_router
from fastapi.middleware.cors import CORSMiddleware
from core.database import connect_db, close_db
from services.alerts_service import trigger_alert
from services.telemetry_service import store_telemetry
from models.schemas import IncomingTelemetry

app = FastAPI()

@app.post("/test-trigger")
async def test_trigger(data: IncomingTelemetry):
    await store_telemetry(data)
    alerts = await trigger_alert(data)
    return {"triggered": len(alerts), "alerts": [a.alert_id for a in alerts]}

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(disaster_predictor_router.disaster_router)
app.include_router(alert_rules_router.router)
app.include_router(alerts_router.router)
app.include_router(auth_router.router)
app.include_router(telemetry_router.router)
app.include_router(zone_router.router)

@app.get("/test-db")
async def test_db():
    from core.database import get_db
    db = get_db()
    await db.command("ping")
    return {"status": "MongoDB connection successful"}