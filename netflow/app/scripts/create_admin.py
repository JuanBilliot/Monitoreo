from app.database.database import SessionLocal, create_tables
from app.database.models import User
from app.api.api_v1.auth import get_password_hash

def create_admin_user():
    # Crear las tablas si no existen
    create_tables()
    
    # Crear sesión de base de datos
    db = SessionLocal()
    
    try:
        # Verificar si ya existe un usuario administrador
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            print("El usuario administrador ya existe.")
            return
        
        # Crear nuevo usuario administrador
        admin_user = User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            is_active=True
        )
        
        # Agregar usuario a la base de datos
        db.add(admin_user)
        db.commit()
        print("Usuario administrador creado exitosamente!")
        print("Usuario: admin")
        print("Contraseña: admin123")
        
    except Exception as e:
        print(f"Error al crear usuario administrador: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
