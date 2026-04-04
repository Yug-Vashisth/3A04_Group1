from fastapi import APIRouter, HTTPException, Query

disaster_router = APIRouter(prefix="/api/disaster", tags=["Alerts"])


@disaster_router.post("/")
async def list_alerts():
    return ""
    