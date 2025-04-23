from app.database.database import SessionLocal, create_tables
from app.database.models import User
from app.api.api_v1.auth import get_password_hash

def create_admin_users():
    # Crear las tablas si no existen
    create_tables()
    
    # Crear sesión de base de datos
    db = SessionLocal()
    
    try:
        # Lista de usuarios a crear
        users_to_create = [
            {
                "username": "juan.billiot",
                "password": "jua.3256"
            },
            {
                "username": "gabriel.machado",
                "password": "gab.2021"
            }
        ]
        
        # Crear cada usuario
        for user_data in users_to_create:
            # Verificar si el usuario ya existe
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()
            if existing_user:
                print(f"El usuario {user_data['username']} ya existe.")
                continue
            
            # Crear nuevo usuario
            new_user = User(
                username=user_data["username"],
                hashed_password=get_password_hash(user_data["password"]),
                is_active=True
            )
            
            # Agregar usuario a la base de datos
            db.add(new_user)
            db.commit()
            print(f"Usuario {user_data['username']} creado exitosamente!")
            print(f"Usuario: {user_data['username']}")
            print(f"Contraseña: {user_data['password']}")
            
    except Exception as e:
        print(f"Error al crear usuarios: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_users()
