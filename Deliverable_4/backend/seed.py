import asyncio
from core.database import connect_db, get_db
from services.auth_service import hashed_password

async def seed():
    await connect_db()
    db = get_db()

    users = [
        {"email": "admin@scemas.com", "hashed_password": hashed_password("admin123"), "role": "admin"},
        {"email": "city@scemas.com", "hashed_password": hashed_password("city123"), "role": "cityUser"},
    ]

    for user in users:
        existing = await db["users"].find_one({"email": user["email"]})
        if not existing:
            await db["users"].insert_one(user)
            print(f"Created user: {user['email']}")
        else:
            print(f"User already exists: {user['email']}")

asyncio.run(seed())