
import sqlite3
conn = sqlite3.connect('tickets.db')
c = conn.cursor()
c.execute("PRAGMA table_info(servers)")
for row in c.fetchall():
    print(row)
conn.close()
