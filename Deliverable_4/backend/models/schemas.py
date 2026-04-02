from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum
import uuid


class MetricType(str, Enum):
    air_quality = "air_quality"
    soil_quality = "soil_quality"
    temperature = "temperature"
    forest_health = "forest_health"

class ComparatorType(str, Enum):
    gt = "gt"
    lt = "lt"
    gte = "gte"
    lte = "lte"

class AlertStatus(str, Enum):
    active = "active"
    acknowledged = "acknowledged"
    resolved = "resolved"
    disabled = "disabled"

class Severity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"

# Incoming sensor data (telemetry)
class IncomingTelemetry(BaseModel):
    sensor_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    metric: MetricType
    zone: str
    value: float
    unit: str

    # example
    class Config:
        json_schema_extra = {
            "example": {
                "sensor_id": "sensor-001",
                "timestamp": "2026-03-29 22:21:14.203730",
                "metric": "air_quality",
                "zone": "downtown",
                "value": 85.2,
                "unit": "AQI"
            }
        }

# classes for BE1-BE3
class AlertRule(BaseModel):
    # all the fields of an alert rule
    rule_id: str = Field(default_factory=lambda: str(uuid.uuid4()))  # generates a unique ID for every new alert rule
    name: str
    description: Optional[str] = None  # default is no description --> admin may choose to add one
    metric: MetricType
    zone: Optional[str] = None  # default is none --> applies to all zones
    comparator: ComparatorType
    threshold: float
    severity: Severity
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # enables flexibility with field names 
    class Config:
        populate_by_name = True

class CreateAlertRule(BaseModel):
    # when creating an alert rule, all the following fields must be provided
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    metric: MetricType
    zone: Optional[str] = None          
    comparator: ComparatorType
    threshold: float

class UpdateAlertRule(BaseModel):
    # when modifying an alert rule, any of the following fields may be changed
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    metric: Optional[MetricType] = None
    zone: Optional[str] = None
    comparator: Optional[ComparatorType] = None
    threshold: Optional[float] = None
    sevirty: Optional[Severity] = None
    enabled: Optional[bool] = None
    status: Optional[AlertStatus] = None

# classes for BE4-BE6
class Alert(BaseModel):
    alert_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rule_id: str
    rule_name: str
    sensor_id: str
    metric: MetricType
    zone: str
    value: float
    unit: str
    comparator: ComparatorType
    threshold: float
    status: AlertStatus.active
    triggered_at: datetime = Field(default_factory=datetime.now)
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    notes: Optional[str] = None

class AcknowledgeAlert(BaseModel):
    operator_id: str 
    notes: Optional[str] = None

class ResolveAlert(BaseModel):
    operator_id: str
    notes: Optional[str] = None

# Audit log
class AuditLog(BaseModel):
    log_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str
    entity_type: str
    entity_id: str
    actor: str = "system"  # default actor is the system
    details: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.now)

    # example
    class Config:
        json_schema_extra = {
            "example": {
                "log_id": "log-001",
                "action": "CREATE_ALERT_RULE",
                "entity_type": "alert_rule",
                "entity_id": "alert-001",
                "actor": "admin",
                "timestamp": "2026-03-29 22:21:14.203730"
            }
        }