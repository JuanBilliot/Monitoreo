from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Base, User, Server
from app.api.api_v1.auth import get_password_hash
from config import get_settings

settings = get_settings()

# Crear el motor de la base de datos
engine = create_engine(settings.DATABASE_URL)

# Eliminar todas las tablas existentes
Base.metadata.drop_all(bind=engine)

# Crear todas las tablas
Base.metadata.create_all(bind=engine)

# Crear una sesión
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Crear usuario
    hashed_password = get_password_hash("jua.3256")
    user = User(
        username="juan.billiot",
        hashed_password=hashed_password,
        is_active=True
    )
    db.add(user)
    
    # Crear servidor
    server = Server(
        name="Server Tom",
        ip_address="192.168.0.148"
    )
    db.add(server)
    
    # Commit los cambios
    db.commit()
    print("Base de datos inicializada correctamente")
    
except Exception as e:
    print(f"Error inicializando la base de datos: {e}")
    db.rollback()
finally:
    db.close()
