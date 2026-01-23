import imaplib
import email
from email.header import decode_header
import os
from dotenv import load_dotenv

# Cargar credenciales
load_dotenv('.env.email')

USERNAME = os.getenv('EMAIL_USER')
PASSWORD = os.getenv('EMAIL_PASS')
IMAP_SERVER = os.getenv('IMAP_SERVER')

def test_connection():
    print(f"Iniciando prueba de conexion a {IMAP_SERVER} para {USERNAME}...")
    try:
        # 1. Conectar al servidor
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        print("[OK] Conexion SSL exitosa.")

        # 2. Login
        mail.login(USERNAME, PASSWORD)
        print("[OK] Login exitoso. Credenciales correctas.")

        # 3. Listar carpetas (para ver si accede al inbox)
        print("\nListando carpetas del buzon:")
        status, folders = mail.list()
        if status == "OK":
            for folder in folders[:5]: # Mostrar solo las primeras 5 para no saturar
                print(f" - {folder.decode()}")
        
        # 4. Seleccionar Inbox
        mail.select("inbox")
        print("\n[OK] Acceso al INBOX correcto.")
        
        # 5. Buscar un mail reciente (solo para ver si lee)
        status, messages = mail.search(None, 'ALL')
        if status == "OK":
            messages_list = messages[0].split()
            last_msg_id = messages_list[-1]
            print(f"Total de mensajes en Inbox: {len(messages_list)}")
            print(f"Leyendo encabezado del ultimo mensaje (ID {last_msg_id.decode()})...")
            
            status, msg_data = mail.fetch(last_msg_id, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding if encoding else "utf-8")
                    print(f"[EMAIL] Asunto del ultimo mail: {subject}")

        mail.logout()
        print("\n[EXITO] PRUEBA COMPLETADA CON EXITO.")
        return True

    except Exception as e:
        print(f"\n[ERROR] ERROR DE CONEXION: {e}")
        return False

if __name__ == "__main__":
    test_connection()
