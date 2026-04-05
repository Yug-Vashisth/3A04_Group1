from datetime import datetime, timedelta
from typing import Optional
from models.schemas import IncomingTelemetry
from core.database import get_db


def _serialize(document: dict) -> dict:
    if document and "_id" in document:
        document["_id"] = str(document["_id"])
    return document


async def store_telemetry(telemetry: IncomingTelemetry) -> dict:
    """
    Called by the MQTT listener for every incoming telemetry message.
    Stores the raw sensor reading into the telemetry collection.
    """
    db = get_db()
    document = telemetry.model_dump()
    await db.telemetry.insert_one(document)
    return _serialize(document)


async def get_telemetry(
    metric: str,
    zone: Optional[str] = None,
    hours: int = 24,
) -> list[dict]:
    """
    Returns telemetry records for a given metric over the last N hours.
    Used by the dashboard trends tab.

    Args:
        metric: one of air_quality, soil_quality, temperature, forest_health
        zone: optional district filter e.g. "downtown" — if None returns all zones
        hours: how far back to look (default 24h)
    """
    db = get_db()
    since = datetime.now() - timedelta(hours=hours)

    query = {
        "metric": metric,
        "timestamp": {"$gte": since},
    }
    if zone:
        query["zone"] = zone

    # sort ascending by time so the chart renders left to right
    results = db.telemetry.find(query).sort("timestamp", 1)

    records = []
    async for document in results:
        records.append(_serialize(document))

    return records


async def get_latest_telemetry(metric: str, zone: Optional[str] = None) -> Optional[dict]:
    """
    Returns the single most recent telemetry reading for a metric.
    Used for the current value shown on the sensor metric cards.
    """
    db = get_db()
    query = {"metric": metric}
    if zone:
        query["zone"] = zone

    document = await db.telemetry.find_one(
        query,
        sort=[("timestamp", -1)]  # most recent first
    )
    if document:
        return _serialize(document)
    return None


async def get_telemetry_stats(metric: str, hours: int = 24) -> dict:
    """
    Returns min, max, avg, and delta for a metric over the last N hours.
    Used for the stats row at the bottom of the trends tab.
    """
    db = get_db()
    since = datetime.now() - timedelta(hours=hours)

    pipeline = [
        {
            "$match": {
                "metric": metric,
                "timestamp": {"$gte": since},
            }
        },
        {
            "$group": {
                "_id": None,
                "min": {"$min": "$value"},
                "max": {"$max": "$value"},
                "avg": {"$avg": "$value"},
                "count": {"$sum": 1},
            }
        }
    ]

    results = await db.telemetry.aggregate(pipeline).to_list(length=1)
    if not results:
        return {"min": None, "max": None, "avg": None, "count": 0}

    stats = results[0]
    stats.pop("_id", None)

    # calculate delta: most recent value minus oldest value in the window
    oldest = await db.telemetry.find_one(
        {"metric": metric, "timestamp": {"$gte": since}},
        sort=[("timestamp", 1)]
    )
    newest = await db.telemetry.find_one(
        {"metric": metric, "timestamp": {"$gte": since}},
        sort=[("timestamp", -1)]
    )
    if oldest and newest:
        stats["delta"] = round(newest["value"] - oldest["value"], 2)
    else:
        stats["delta"] = None

    return stats