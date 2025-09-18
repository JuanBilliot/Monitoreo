import sqlite3
import sys

def get_duplicates():
    conn = sqlite3.connect('tickets.db')
    cursor = conn.cursor()
    
    # Encontrar tickets duplicados (mismo ticket_number)
    cursor.execute('''
        SELECT ticket_number, COUNT(*) as count
        FROM tickets
        GROUP BY ticket_number
        HAVING count > 1
    ''')
    
    duplicates = cursor.fetchall()
    conn.close()
    return duplicates

def remove_duplicates():
    conn = sqlite3.connect('tickets.db')
    cursor = conn.cursor()
    
    # Obtener los duplicados
    duplicates = get_duplicates()
    
    if not duplicates:
        print("No se encontraron tickets duplicados.")
        return
    
    print(f"\nSe encontraron {len(duplicates)} grupos de tickets duplicados:")
    for ticket_number, count in duplicates:
        print(f"Ticket {ticket_number}: {count} duplicados")
    
    # Para cada grupo de duplicados, mantener el más antiguo (el que tiene los datos completados)
    for ticket_number, _ in duplicates:
        # Obtener todos los registros para este ticket_number
        cursor.execute('''
            SELECT id, creation_date
            FROM tickets
            WHERE ticket_number = ?
            ORDER BY creation_date ASC
        ''', (ticket_number,))
        
        records = cursor.fetchall()
        if len(records) <= 1:
            continue
            
        # Mantener el más antiguo (primero en la lista)
        to_keep = records[0][0]
        
        # Eliminar todos los demás
        for record in records[1:]:
            if record[0] != to_keep:
                cursor.execute('DELETE FROM tickets WHERE id = ?', (record[0],))
                print(f"Eliminado ticket duplicado ID: {record[0]}")
    
    conn.commit()
    conn.close()
    
    print("\nProceso completado. Todos los duplicados han sido eliminados.")

if __name__ == '__main__':
    print("Iniciando proceso de eliminación de tickets duplicados...")
    
    try:
        remove_duplicates()
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
