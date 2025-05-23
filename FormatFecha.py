from app import connect_db  # Importar la función connect_db desde app.py
import sqlite3
from datetime import datetime

def reformat_dates():
    conn = connect_db()
    c = conn.cursor()
    c.execute("SELECT id, creation_date FROM tickets")
    rows = c.fetchall()

    for row in rows:
        ticket_id, creation_date = row
        # Intentar convertir la fecha a YYYY-MM-DD si está en DD/MM/YYYY
        try:
            reformatted_date = datetime.strptime(creation_date, "%d/%m/%Y").strftime("%Y-%m-%d")
            # Actualizar en la base de datos
            c.execute("UPDATE tickets SET creation_date = ? WHERE id = ?", (reformatted_date, ticket_id))
        except ValueError:
            # Ignorar si la fecha no está en el formato esperado
            pass

    conn.commit()
    conn.close()

# Ejecutar esta función una sola vez para reformatear las fechas
reformat_dates()
