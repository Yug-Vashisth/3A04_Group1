from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid

class UserRole(str, Enum):
    admin = "admin"
    city_user = "cityUser"

class User(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    hashed_password: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.now)

class UserCreate(BaseModel):
    email: str
    password: str
    role: UserRole

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    user_id: str
    email: str
    role: UserRole