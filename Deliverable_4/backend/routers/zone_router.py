from fastapi import APIRouter, HTTPException
from services import zone_service as zoneService
 
router = APIRouter(prefix="/api/zones", tags=["Zones"])
 
 
@router.get("/")
async def get_zone_summary():
    summary = await zoneService.get_zone_summary()
    return summary
 
 
@router.get("/health")
async def get_system_health():
    health = await zoneService.get_system_health()
    return health
 
 
@router.get("/{zone}")
async def get_zone_detail(zone: str):
    detail = await zoneService.get_zone_detail(zone)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Zone {zone} not found")
    return detail