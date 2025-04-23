import os
import sys
import sqlite3

# Agregar el directorio del proyecto al PYTHONPATH
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

def init_db():
    # Eliminar la base de datos si existe
    if os.path.exists('../netflow.db'):
        os.remove('../netflow.db')
    
    # Conectar a la nueva base de datos
    conn = sqlite3.connect('../netflow.db')
    cursor = conn.cursor()
    
    try:
        # Crear la tabla de servidores
        cursor.execute('''
        CREATE TABLE servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR UNIQUE,
            ip_address VARCHAR,
            hashed_password VARCHAR,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Crear la tabla de métricas
        cursor.execute('''
        CREATE TABLE metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id INTEGER,
            metric_type VARCHAR,
            value FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (server_id) REFERENCES servers (id)
        )
        ''')
        
        # Crear índices
        cursor.execute('CREATE INDEX idx_servers_name ON servers (name)')
        cursor.execute('CREATE INDEX idx_metrics_server_id ON metrics (server_id)')
        cursor.execute('CREATE INDEX idx_metrics_timestamp ON metrics (timestamp)')
        
        # Importar get_password_hash después de asegurarnos que la base de datos está limpia
        from app.api.api_v1.auth import get_password_hash
        
        # Insertar el servidor inicial con las credenciales correctas
        cursor.execute('''
        INSERT INTO servers (name, ip_address, hashed_password)
        VALUES (?, ?, ?)
        ''', ('juan.billiot', '192.168.0.148', get_password_hash('jua.3256')))
        
        # Commit los cambios
        conn.commit()
        print("Base de datos inicializada con éxito!")
        print("Credenciales por defecto:")
        print("Usuario: juan.billiot")
        print("Contraseña: jua.3256")
        
        # Verificar que el servidor se creó correctamente
        cursor.execute('SELECT * FROM servers')
        server = cursor.fetchone()
        print("\nServidor creado:")
        print(f"ID: {server[0]}")
        print(f"Nombre: {server[1]}")
        print(f"IP: {server[2]}")
        print(f"Activo: {server[4]}")
        
    except Exception as e:
        print(f"Error durante la inicialización: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()