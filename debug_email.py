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

def decode_email_subject(subject):
    """Decodifica el asunto del correo"""
    if subject is None:
        return ""
    decoded_parts = decode_header(subject)
    decoded_subject = ""
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            decoded_subject += part.decode(encoding if encoding else "utf-8", errors='ignore')
        else:
            decoded_subject += part
    return decoded_subject

def get_email_body(msg):
    """Extrae el cuerpo del correo electrónico"""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            
            if content_type == "text/plain" and "attachment" not in content_disposition:
                try:
                    body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    break
                except:
                    pass
    else:
        try:
            body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
        except:
            pass
    return body

def test_email_parsing():
    print("Conectando al servidor...")
    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    mail.login(USERNAME, PASSWORD)
    
    mail.select("A-TIKETERA")
    
    # Buscar un correo reciente de Mesa de Ayuda
    status, message_ids = mail.search(None, 'FROM "Mesa de Ayuda"')
    
    if status == "OK":
        message_list = message_ids[0].split()
        # Tomar el último correo
        last_msg_id = message_list[-1]
        
        status, msg_data = mail.fetch(last_msg_id, "(RFC822)")
        
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                
                subject = decode_email_subject(msg["Subject"])
                body = get_email_body(msg)
                
                print("="*60)
                print("ASUNTO:")
                print(subject)
                print("\n" + "="*60)
                print("CUERPO COMPLETO:")
                print(body)
                print("="*60)
    
    mail.logout()

if __name__ == "__main__":
    test_email_parsing()
