from pydantic_settings import BaseSettings
 
class Settings(BaseSettings):
    # database configuration
    MONGODB_URL: str = "blank"  # where the database is running
    DATABASE_NAME: str = "scemas"  # which database to use inside MongoDB
    # will have more stuff for MQTT later ??
 
    class Config:
        env_file = ".env"
 
settings = Settings()
