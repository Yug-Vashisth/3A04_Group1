from passlib.context import CryptContext
from datetime import datetime, timedelta
from core.config import settings
from core.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hashed_password(password: str) -> str:
    return pwd_context.hash(password) #hashes the password with salt using bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password) #verifies the password by comparing the plain password with the hashed version stored in db

async def get_user(email: str):
    db = get_db()
    user = await db["users"].find_one({"email": email})
    return user

async def authenticate_user(email: str, password: str):
    user = await get_user(email)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user