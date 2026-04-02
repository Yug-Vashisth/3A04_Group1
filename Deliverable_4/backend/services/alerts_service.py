from datetime import datetime
from typing import Optional
from ..models.schemas import Alert, AcknowledgeAlert, ResolveAlert, IncomingTelemetry, AuditLog
from ..core.database import get_db
 
 
METRIC_UNITS = {
    "air_quality": "AQI",
    "soil_quality": "pH",
    "temperature": "°C",
    "forest_health": "defoliation_rate",
}
 
COMPARATORS = {
    "gt": lambda value, threshold: value > threshold,
    "lt": lambda value, threshold: value < threshold,
    "gte": lambda value, threshold: value >= threshold,
    "lte": lambda value, threshold: value <= threshold,
}


def _serialize(document: dict) -> dict:
    if document and "_id" in document:
        document["_id"] = str(document["_id"])  # converts the MongoDB _id to a string
    return document
 

async def trigger_alert(telemetry: IncomingTelemetry) -> list[Alert]:
    """
    Called by the MQTT listener for every incoming telemetry message.
        --> Not implemented yet
    """
    db = get_db()
    triggeredAlerts = []
 
    queryRules = {"metric": telemetry.metric.value, "enabled": True}  # we only want to load enabled rules with the same metric
    alertRulesSearchResult = db.alert_rules.find(queryRules)
 
    async for alertRule in alertRulesSearchResult:
        # If the rule and sensor belong to different zones, we skip it
        if alertRule.get("zone") and alertRule["zone"] != telemetry.zone:
            continue
 
        comparisonComparator = COMPARATORS.get(alertRule["comparator"])  # retrieves the comparison operator used to evaluate the threshold
        # checks if the sensor value is greater than the threshold
        if comparisonComparator and comparisonComparator(telemetry.value, alertRule["threshold"]):

            # if there's already an active alert for this rule and sensor, then dont create a new one
            activeAlert = await db.alerts.find_one({"rule_id": alertRule["rule_id"], "sensor_id": telemetry.sensor_id, "status": "active"})
            if activeAlert:
                continue
 
            # builds a new alert object after passing all checks
            alert = Alert(
                rule_id=alertRule["rule_id"],
                rule_name=alertRule["name"],
                sensor_id=telemetry.sensor_id,
                zone=telemetry.zone,
                metric=telemetry.metric,
                value=telemetry.value,
                unit=telemetry.unit,
                threshold=alertRule["threshold"],
                comparator=alertRule["comparator"],
            )
            await db.alerts.insert_one(alert.model_dump())
 
            log = AuditLog(
                action="ALERT_TRIGGERED",
                entity_type="alert",
                entity_id=alert.alert_id,
                actor="system",
                details={
                    "rule_name": alertRule["name"],
                    "sensor_id": telemetry.sensor_id,
                    "zone": telemetry.zone,
                    "metric": telemetry.metric,
                    "value": telemetry.value,
                    "threshold": alertRule["threshold"],
                }
            )
            await db.audit_logs.insert_one(log.model_dump())
            
            # add the new alert to our list of triggered alerts
            triggeredAlerts.append(alert)
 
    return triggeredAlerts
 
  
async def get_alerts(status: Optional[str] = None) -> list[dict]:
    db = get_db()
    query = {}

    # if the user asks for a specific status of alerts, we add it to the search criteria
    if status:
        query["status"] = status

    alertsSearchResult = db.alerts.find(query).sort("triggered_at")
    # loop through the query results and serialize them into strings that JSON can handle
    alerts = []
    async for document in alertsSearchResult:
        alerts.append(_serialize(document))
    return alerts
 
 
async def get_alert(alert_id: str) -> Optional[dict]:
    db = get_db()
    document = await db.alerts.find_one({"alert_id": alert_id})
    # if the query returns an alert, serialize and return it
    if document:
        return _serialize(document)
    else:
        return None
 
  
async def acknowledge_alert(alert_id: str, data: AcknowledgeAlert) -> Optional[dict]:
    db = get_db()
 
    # checks alert status before updating it
    alertExist = await db.alerts.find_one({"alert_id": alert_id})
        # if it doesn't exist, we stop immediately
    if not alertExist:
        return None
        # only allows active alerts to be acknowledged
    if alertExist["status"] != "active":
        return _serialize(alertExist) 
 
    # updates the alert with acknowledgment fields 
    acknowledgedAlert = await db.alerts.find_one_and_update(
        {"alert_id": alert_id, "status": "active"},
        {"$set": {
            "status": "acknowledged",
            "acknowledged_at": datetime.now(),
            "acknowledged_by": data.operator_id,
            "notes": data.notes,
        }},
        return_document=True  # MongoDB updates the document and then sends the data back
    )
    # prevents race conditions
    if not acknowledgedAlert:
        return None
 
    log = AuditLog(
        action="ALERT_ACKNOWLEDGED",
        entity_type="alert",
        entity_id=alert_id,
        actor=data.operator_id,
        details={"notes": data.notes, "timestamp": datetime.now().isoformat()}
    )
    await db.audit_logs.insert_one(log.model_dump())

    return _serialize(acknowledgedAlert)
 
 
async def resolve_alert(alert_id: str, data: ResolveAlert) -> Optional[dict]:
    db = get_db()
 
    alertExist = await db.alerts.find_one({"alert_id": alert_id})
    if not alertExist:
        return None
        # only allows acknowledged alerts to be resolved
    if alertExist["status"] != "acknowledged":
        return _serialize(alertExist)
 
    resolvedAlert = await db.alerts.find_one_and_update(
        {"alert_id": alert_id},
        {"$set": {
            "status": "resolved",
            "resolved_at": datetime.now(),
            "resolved_by": data.operator_id,
            "notes": data.notes,
        }},
        return_document=True
    )
    if not resolvedAlert:
        return None
 
    log = AuditLog(
        action="ALERT_RESOLVED",
        entity_type="alert",
        entity_id=alert_id,
        actor=data.operator_id,
        details={"notes": data.notes, "timestamp": datetime.now().isoformat()}
    )
    await db.audit_logs.insert_one(log.model_dump())

    return _serialize(resolvedAlert)

# gets the alerts important stats to be displayed on the dashboard
async def get_alert_stats() -> dict:
    db = get_db()

    activeAlertCount = await db.alerts.count_documents({"status": "active"})
    acknowledgedAlertCount = await db.alerts.count_documents({"status": "acknowledged"})
    resolvedAlertCount = await db.alerts.count_documents({"status": "resolved"})
    total = await db.alerts.count_documents({}) 

    return {
        "active": activeAlertCount,
        "acknowledged": acknowledgedAlertCount,
        "resolved": resolvedAlertCount,
        "total": total,
    }