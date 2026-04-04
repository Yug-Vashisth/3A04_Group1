from fastapi import APIRouter, HTTPException, status, Query
from models.schemas import CreateAlertRule, UpdateAlertRule
from services import alert_rules_service as alertRulesService

# POST --> used for creating new things
# GET --> used for reading data

router = APIRouter(prefix="/api/alert-rules", tags=["Alert Rules"])  # groups all functions under the URL /api/alert-rules


@router.post("/", status_code=status.HTTP_201_CREATED)  # 201 is the default success response
async def create_rule(data: CreateAlertRule):  # converts JSON to a CreateAlertRule object
    alertRule = await alertRulesService.create_alert_rule(data)  # passes the validates data to the alert_rules_services file
    return alertRule.model_dump()  # converts the object back to JSON


@router.get("/")  
async def list_rules(is_enabled_only: bool = Query(False)):
    alertRules = await alertRulesService.get_alert_rules(enabled_only=is_enabled_only)
    return alertRules


@router.get("/{rule_id}")
async def get_rule(rule_id: str):
    alertRule = await alertRulesService.get_alert_rule(rule_id)
    # if the alert rule is not in the document, raise a 404 error page
    if not alertRule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return alertRule


@router.patch("/{rule_id}")
async def update_rule(rule_id: str, data: UpdateAlertRule):
    alertRule = await alertRulesService.update_alert_rule(rule_id, data)
    if not alertRule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return alertRule


@router.patch("/{rule_id}/disable")
async def disable_rule(rule_id: str):
    alertRule = await alertRulesService.disable_alert_rule(rule_id)
    if not alertRule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return alertRule


# BE3: Hard delete alert rule
@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(rule_id: str):
    deletedAlert = await alertRulesService.delete_alert_rule(rule_id)
    if not deletedAlert:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return deletedAlert