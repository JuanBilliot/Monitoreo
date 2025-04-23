import os
import sys

# Agregar la ruta actual al path de Python
sys.path.append(os.path.abspath("."))

# Importar las dependencias necesarias
from app.database.database import engine, Base, create_tables
from app.database.models import User
from app.api.api_v1.auth import get_password_hash
from sqlalchemy.orm import sessionmaker

def main():
    # Crear la sesión de base de datos
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Crear las tablas si no existen
    create_tables()
    
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
        existing_user = session.query(User).filter(User.username == user_data["username"]).first()
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
        session.add(new_user)
        session.commit()
        print(f"Usuario {user_data['username']} creado exitosamente!")
        print(f"Usuario: {user_data['username']}")
        print(f"Contraseña: {user_data['password']}")

if __name__ == "__main__":
    main()
