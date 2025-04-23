from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "NetFlow Monitor"
    SECRET_KEY: str = "your-secret-key-here"  # En producción, usar una clave secreta real
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Configuración de la base de datos
    DATABASE_URL: str = "sqlite:///netflow.db"

    # Configuración de la API
    API_V1_STR: str = "/api/v1"

    # Configuración del servidor por defecto
    SERVER_IP: Optional[str] = "192.168.0.148"
    SERVER_USERNAME: Optional[str] = "juan.billiot"
    SERVER_PASSWORD: Optional[str] = "jua.3256"

    class Config:
        env_file = ".env"
        case_sensitive = True

def get_settings() -> Settings:
    return Settings()