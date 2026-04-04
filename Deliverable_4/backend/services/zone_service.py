from datetime import datetime, timedelta
from typing import Optional
from ..core.database import get_db


def _serialize(document: dict) -> dict:
    if document and "_id" in document:
        document["_id"] = str(document["_id"])
    return document


async def get_zone_summary() -> list[dict]:
    """
    Returns a health summary for every zone.
    Used by the Districts tab and District Health panel on the dashboard.

    Each zone entry includes:
    - zone name
    - total sensors seen in last 24h
    - active alert count
    - breakdown of alerts by severity
    - latest reading per metric
    """
    db = get_db()
    since = datetime.now() - timedelta(hours=24)

    # aggregate telemetry to find all active sensors per zone
    sensor_pipeline = [
        {
            "$match": {"timestamp": {"$gte": since}}
        },
        {
            "$group": {
                "_id": "$zone",
                "sensor_ids": {"$addToSet": "$sensor_id"},  # unique sensors per zone
            }
        }
    ]
    sensor_results = await db.telemetry.aggregate(sensor_pipeline).to_list(length=100)

    # aggregate active alerts per zone
    alert_pipeline = [
        {
            "$match": {"status": "active"}
        },
        {
            "$group": {
                "_id": "$zone",
                "active_alerts": {"$sum": 1},
                "critical": {
                    "$sum": {"$cond": [{"$eq": ["$severity", "critical"]}, 1, 0]}
                },
                "warning": {
                    "$sum": {"$cond": [{"$eq": ["$severity", "warning"]}, 1, 0]}
                },
                "info": {
                    "$sum": {"$cond": [{"$eq": ["$severity", "info"]}, 1, 0]}
                },
            }
        }
    ]
    alert_results = await db.alerts.aggregate(alert_pipeline).to_list(length=100)

    # build lookup dicts for easy access
    alert_by_zone = {r["_id"]: r for r in alert_results}

    summaries = []
    for zone_data in sensor_results:
        zone = zone_data["_id"]
        sensor_ids = zone_data["sensor_ids"]
        alerts = alert_by_zone.get(zone, {})

        summaries.append({
            "zone": zone,
            "sensor_count": len(sensor_ids),
            "active_alerts": alerts.get("active_alerts", 0),
            "alerts_by_severity": {
                "critical": alerts.get("critical", 0),
                "warning": alerts.get("warning", 0),
                "info": alerts.get("info", 0),
            }
        })

    # sort by most critical first
    summaries.sort(key=lambda z: z["alerts_by_severity"]["critical"], reverse=True)
    return summaries


async def get_zone_detail(zone: str) -> Optional[dict]:
    """
    Returns detailed info for a single zone.
    Used when clicking into a district card.
    """
    db = get_db()
    since = datetime.now() - timedelta(hours=24)

    # get all unique sensors active in this zone
    sensor_pipeline = [
        {"$match": {"zone": zone, "timestamp": {"$gte": since}}},
        {"$group": {"_id": "$sensor_id"}}
    ]
    sensors = await db.telemetry.aggregate(sensor_pipeline).to_list(length=100)
    sensor_ids = [s["_id"] for s in sensors]

    # get latest reading for each metric in this zone
    metrics = ["air_quality", "soil_quality", "temperature", "forest_health"]
    latest_readings = {}
    for metric in metrics:
        doc = await db.telemetry.find_one(
            {"zone": zone, "metric": metric},
            sort=[("timestamp", -1)]
        )
        if doc:
            latest_readings[metric] = {
                "value": doc["value"],
                "unit": doc["unit"],
                "timestamp": doc["timestamp"].isoformat(),
                "sensor_id": doc["sensor_id"],
            }

    # get all active alerts for this zone
    active_alerts = []
    async for doc in db.alerts.find({"zone": zone, "status": "active"}):
        active_alerts.append(_serialize(doc))

    return {
        "zone": zone,
        "sensors": sensor_ids,
        "sensor_count": len(sensor_ids),
        "latest_readings": latest_readings,
        "active_alerts": active_alerts,
        "active_alert_count": len(active_alerts),
    }


async def get_system_health() -> dict:
    """
    Returns top-level system health stats for the status strip at the top of the dashboard.
    Covers: sensors online, active alerts, critical alerts.
    """
    db = get_db()
    since = datetime.now() - timedelta(hours=24)

    # count unique sensors seen in last 24h
    sensor_pipeline = [
        {"$match": {"timestamp": {"$gte": since}}},
        {"$group": {"_id": "$sensor_id"}}
    ]
    sensors = await db.telemetry.aggregate(sensor_pipeline).to_list(length=1000)

    active_alerts = await db.alerts.count_documents({"status": "active"})
    critical_alerts = await db.alerts.count_documents({"status": "active", "severity": "critical"})
    acknowledged_alerts = await db.alerts.count_documents({"status": "acknowledged"})

    return {
        "sensors_online": len(sensors),
        "active_alerts": active_alerts,
        "critical_alerts": critical_alerts,
        "acknowledged_alerts": acknowledged_alerts,
    }