from datetime import datetime
from typing import Optional
from bson import ObjectId  # MongoDB uses _id as a special object (ObjectId)
from models.schemas import AlertRule, CreateAlertRule, UpdateAlertRule, AuditLog
from core.database import get_db  # gets the MongoDB connection


# Note: In MongoDB:
    # records (units of data storage) are called documents
    # a collection is the direct equivalent of a table
def _serialize(document: dict) -> dict:
    if document and "_id" in document:
        document["_id"] = str(document["_id"])  # converts the MongoDB _id to a string
    return document


async def create_alert_rule(alertRuleData: CreateAlertRule, actor: str = "admin") -> AlertRule:
    db = get_db()
    alertRule = AlertRule(**alertRuleData.model_dump())  # turns the alert rule data request into an AletRule object
    document = alertRule.model_dump()  # converts the AlertRule object back into a dictionary format
    await db.alert_rules.insert_one(document)  # adds the rule document to the alert_rules collection

    # audit log details
    log = AuditLog(
        action="CREATE_ALERT_RULE",
        entity_type="alert_rule",
        entity_id=alertRule.rule_id,
        actor=actor,
        details={"name": alertRule.name, "metric": alertRule.metric, "threshold": alertRule.threshold}
    )
    await db.audit_logs.insert_one(log.model_dump())  # save the log to the audit logs collection

    return alertRule


async def get_alert_rules(enabled_only: bool = False) -> list[dict]:
    db = get_db()
    # enabled_only parameter allows the user to choose if they only want to look at enabled alerts
    if enabled_only:
        query = {"enabled": True}
    else:
        query = {}

    rawQueryResults = db.alert_rules.find(query)
    sortedQueryResults = rawQueryResults.sort("created_at")  # sorts alerts in ascending order

    alertRules = []
    async for document in sortedQueryResults:
        alertRules.append(_serialize(document))  # converts to string so JSON can read it

    return alertRules


async def get_alert_rule(rule_id: str) -> Optional[dict]:
    db = get_db()
    document = await db.alert_rules.find_one({"rule_id": rule_id})  # checks if a document exists for the searched rule id
    # if the document exists, return it as a string so it can be read
    if document:
        return _serialize(document)
    else:
        return None


async def update_alert_rule(rule_id: str, data: UpdateAlertRule, actor: str = "admin") -> Optional[dict]:
    db = get_db()
    update_fields = data.model_dump(exclude_unset=True)  # only includes update fields set by the admin
    # if there is nothing to update, the function returns the current version of the rule 
    if not update_fields:
        return await get_alert_rule(rule_id)

    update_fields["updated_at"] = datetime.now()
    updatedDocument = await db.alert_rules.find_one_and_update(
        {"rule_id": rule_id},
        {"$set": update_fields}, # updates only the specified fields
        return_document=True
    )
    # if the rule_id doesn't exist in the database, the updated document will be empty
    if not updatedDocument:
        return None

    # audit log details
    log = AuditLog(
        action="UPDATE_ALERT_RULE",
        entity_type="alert_rule",
        entity_id=rule_id,
        actor=actor,
        details=update_fields
    )
    await db.audit_logs.insert_one(log.model_dump())  # saves the event into the audit collection

    return _serialize(updatedDocument)


async def delete_alert_rule(rule_id: str, actor: str = "admin") -> bool:
    db = get_db()
    deletedAlertRule = await db.alert_rules.delete_one({"rule_id": rule_id})
    # if no document matched the given id, stop here
    if deletedAlertRule.deleted_count == 0:
        return False

    log = AuditLog(
        action="DELETE_ALERT_RULE",
        entity_type="alert_rule",
        entity_id=rule_id,
        actor=actor,
    )
    await db.audit_logs.insert_one(log.model_dump())  

    return True


async def disable_alert_rule(rule_id: str, actor: str = "admin") -> Optional[dict]:
    db = get_db()
    data = UpdateAlertRule(enabled=False, status="disabled")  # disables an alert by setting the enabled field to false
    update_fields = data.model_dump(exclude_unset=True)  # only includes update fields set by the admin
    # if there is nothing to update, the function returns the current version of the rule 
    if not update_fields:
        return await get_alert_rule(rule_id)

    update_fields["updated_at"] = datetime.now()
    disabledAlertRule = await db.alert_rules.find_one_and_update(
        {"rule_id": rule_id},
        {"$set": update_fields}, # updates only the specified fields
        return_document=True
    )
    # if the rule_id doesn't exist in the database, the updated document will be empty
    if not disabledAlertRule:
        return None

    log = AuditLog(
        action="DISABLE_ALERT_RULE",
        entity_type="alert_rule",
        entity_id=rule_id,
        actor=actor,
    )
    await db.audit_logs.insert_one(log.model_dump())

    return _serialize(disabledAlertRule)

