from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models.schemas import AcknowledgeAlert, ResolveAlert
from services import alerts_service as alertsService

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("/")
async def list_alerts(status: Optional[str] = Query(None, pattern="^(active|acknowledged|resolved)$")):
    alertsWithStatus = await alertsService.get_alerts(status=status)
    return alertsWithStatus


@router.get("/stats")
async def alert_stats():
    alertStats = await alertsService.get_alert_stats()
    return alertStats


@router.get("/{alert_id}")
async def get_alert(alert_id: str):
    alert = await alertsService.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, data: AcknowledgeAlert):
    acknowledgedAlert = await alertsService.acknowledge_alert(alert_id, data)
    if acknowledgedAlert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return acknowledgedAlert


@router.post("/{alert_id}/resolve")
async def resolve_alert(alert_id: str, data: ResolveAlert):
    resolvedAlert = await alertsService.resolve_alert(alert_id, data)
    if resolvedAlert is None:
        raise HTTPException(status_code=404, detail="Alert not found or not yet acknowledged")
    return resolvedAlert