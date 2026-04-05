from pydantic_settings import BaseSettings
 
class Settings(BaseSettings):
    # database configuration
    MONGODB_URL: str = "blank"  # where the database is running
    DATABASE_NAME: str = "scemas"  # which database to use inside MongoDB
    # will have more stuff for MQTT later ??
    OLLAMA_URL: str = ""
    
    JWT_SECRET_KEY: str = "ahahahhhahhahahhahhah"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
 
    class Config:
        env_file = ".env"
 
settings = Settings()
