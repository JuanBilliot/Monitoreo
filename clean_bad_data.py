import sqlite3

def clean_database():
    conn = sqlite3.connect('tickets.db')
    c = conn.cursor()
    
    print("Iniciando limpieza de tickets corruptos...")
    
    # 1. Identificar tickets con nombres de usuario excesivamente largos (> 50 caracteres)
    # Esto atrapará los casos donde se metió todo el body del mail en el usuario
    c.execute("SELECT id, ticket_number, user FROM tickets WHERE length(user) > 50")
    bad_users = c.fetchall()
    
    if bad_users:
        print(f"\nDetectados {len(bad_users)} tickets con campo USUARIO corrupto:")
        for t in bad_users:
            print(f" - Ticket #{t[1]} (ID {t[0]}) -> Usuario longitud: {len(t[2])} chars")
            # Eliminar estos tickets
            c.execute("DELETE FROM tickets WHERE id = ?", (t[0],))
    else:
        print("\nNo se encontraron tickets con usuarios corruptos.")

    # 2. Identificar tickets con nombres de sucursal excesivamente largos
    c.execute("SELECT id, ticket_number, branch FROM tickets WHERE length(branch) > 50")
    bad_branches = c.fetchall()
    
    if bad_branches:
        print(f"\nDetectados {len(bad_branches)} tickets con campo SUCURSAL corrupto:")
        for t in bad_branches:
            print(f" - Ticket #{t[1]} (ID {t[0]}) -> Sucursal longitud: {len(t[2])} chars")
            # Eliminar estos tickets si no fueron eliminados ya
            c.execute("DELETE FROM tickets WHERE id = ?", (t[0],))
    else:
        print("\nNo se encontraron tickets con sucursales corruptas.")

    conn.commit()
    conn.close()
    print("\nLimpieza completada. Los tickets corruptos han sido eliminados.")
    print("El servicio automático los volverá a importar correctamente en el próximo ciclo.")

if __name__ == "__main__":
    clean_database()
