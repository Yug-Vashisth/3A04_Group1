from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models.schemas import IncomingTelemetry
from services import telemetry_service as telemetryService

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry"])


@router.post("/", status_code=201)
async def store_telemetry(data: IncomingTelemetry):
    record = await telemetryService.store_telemetry(data)
    return record


@router.get("/")
async def get_telemetry(
    metric: str = Query(..., pattern="^(air_quality|soil_quality|temperature|forest_health)$"),
    zone: Optional[str] = Query(None),
    hours: int = Query(24),
):
    records = await telemetryService.get_telemetry(metric=metric, zone=zone, hours=hours)
    return records


@router.get("/latest")
async def get_latest(
    metric: str = Query(..., pattern="^(air_quality|soil_quality|temperature|forest_health)$"),
    zone: Optional[str] = Query(None),
):
    record = await telemetryService.get_latest_telemetry(metric=metric, zone=zone)
    if not record:
        raise HTTPException(status_code=404, detail="No telemetry found for this metric")
    return record


@router.get("/stats")
async def get_stats(
    metric: str = Query(..., pattern="^(air_quality|soil_quality|temperature|forest_health)$"),
    hours: int = Query(24),
):
    stats = await telemetryService.get_telemetry_stats(metric=metric, hours=hours)
    return stats