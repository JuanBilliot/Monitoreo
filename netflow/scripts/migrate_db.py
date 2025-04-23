import os
import sys
import sqlite3

# Agregar el directorio del proyecto al PYTHONPATH
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

from app.api.api_v1.auth import get_password_hash

def migrate_db():
    # Conectar a la base de datos
    conn = sqlite3.connect('../netflow.db')
    cursor = conn.cursor()
    
    try:
        # Crear nueva tabla con la estructura actualizada
        cursor.execute('''
        CREATE TABLE servers_new (
            id INTEGER NOT NULL PRIMARY KEY,
            name VARCHAR UNIQUE,
            ip_address VARCHAR,
            hashed_password VARCHAR,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        )
        ''')
        
        # Insertar el servidor de prueba
        cursor.execute('''
        INSERT INTO servers_new (name, ip_address, hashed_password, is_active)
        VALUES (?, ?, ?, ?)
        ''', ('juan.billiot', '192.168.0.148', get_password_hash('test123'), True))
        
        # Eliminar la tabla antigua
        cursor.execute('DROP TABLE servers')
        
        # Renombrar la nueva tabla
        cursor.execute('ALTER TABLE servers_new RENAME TO servers')
        
        # Crear índices
        cursor.execute('CREATE INDEX ix_servers_id ON servers (id)')
        cursor.execute('CREATE UNIQUE INDEX ix_servers_name ON servers (name)')
        
        # Commit los cambios
        conn.commit()
        print("Migración completada con éxito!")
        print("Nuevas credenciales:")
        print("Usuario: juan.billiot")
        print("Contraseña: test123")
        
    except Exception as e:
        print(f"Error durante la migración: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_db()
