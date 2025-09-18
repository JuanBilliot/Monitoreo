import sqlite3

def add_column():
    conn = sqlite3.connect('tickets.db')
    c = conn.cursor()

    # Agregar la columna details si no existe
    try:
        c.execute("ALTER TABLE tickets ADD COLUMN details TEXT")
        conn.commit()
        print("Columna 'details' añadida con éxito.")
    except sqlite3.OperationalError:
        print("La columna 'details' ya existe.")
    finally:
        conn.close()

add_column()
