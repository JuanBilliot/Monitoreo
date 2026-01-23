import imaplib
import email
import email.utils
from email.header import decode_header
import re
import sqlite3
from datetime import datetime
import os
from dotenv import load_dotenv
import time

# Cargar credenciales
load_dotenv('.env.email')

USERNAME = os.getenv('EMAIL_USER')
PASSWORD = os.getenv('EMAIL_PASS')
IMAP_SERVER = os.getenv('IMAP_SERVER')

def get_db():
    """Conecta a la base de datos SQLite"""
    return sqlite3.connect('tickets.db')

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

def parse_ticket_from_email(subject, body, email_date=None):
    """
    Extrae información del ticket desde el asunto y cuerpo del correo
    Basado en el formato de InvGate que vimos en la imagen
    """
    # Formatear la fecha del correo si existe, sino usar hoy
    creation_date = datetime.now().strftime("%d/%m/%Y")
    if email_date:
        try:
            # Parsear la fecha del correo (formato RFC 2822)
            parsed_date = email.utils.parsedate_to_datetime(email_date)
            # Convertir a formato DD/MM/YYYY
            creation_date = parsed_date.strftime("%d/%m/%Y")
        except Exception:
            pass  # Si falla, mantener la fecha actual

    ticket_data = {
        'ticket_number': None,
        'title': None,
        'user': None,
        'branch': None,
        'details': None,
        'status': 'Abierto',  # Por defecto, los nuevos son Abiertos
        'creation_date': creation_date,
        'agent': None,
        'collaborators': None,
        'first_response': None,
        'sla_resolution': None,
        'close_date': None,
        'delay': '0 días',
        'priority': None,
        'type': None
    }
    
    # Extraer número de ticket del asunto (formato: #31504 TITULO...)
    ticket_match = re.search(r'#(\d+)', subject)
    if ticket_match:
        ticket_data['ticket_number'] = int(ticket_match.group(1))
    
    # Extraer título (después del número y antes del paréntesis si existe)
    title_match = re.search(r'#\d+\s+(.+?)(?:\s*\(|$)', subject)
    if title_match:
        ticket_data['title'] = title_match.group(1).strip()
    
    # Extraer categoría/tipo del paréntesis
    category_match = re.search(r'\(([^)]+)\)', subject)
    if category_match:
        ticket_data['type'] = category_match.group(1).strip()
    
    # Parsear el cuerpo del correo
    if body:
        # Normalizar saltos de línea y espacios para facilitar el parsing
        body_normalized = re.sub(r'\r\n', '\n', body)
        body_normalized = re.sub(r'\s+', ' ', body_normalized)
        
        # Extraer usuario
        user = None
        
        # Patrón principal: "POR https://url NOMBRE APELLIDO | SOMMIERCENTER"
        # El formato real es: POR\n https://url NOMBRE\nAPELLIDO | SOMMIERCENTER
        user_match = re.search(r'POR\s+https?://[^\s]+\s+([A-ZÁ-Ú]+)\s+([A-ZÁ-Ú]+)\s*\|?\s*SOMMIERCENTER', body_normalized, re.IGNORECASE)
        if user_match:
            user = f"{user_match.group(1)} {user_match.group(2)}"
        
        # Patrón alternativo: "Por Nombre Apellido | SommierCenter"
        if not user:
            user_match2 = re.search(r'Por\s+([A-ZÁ-Ú][a-zá-ú]+\s+[A-ZÁ-Ú][a-zá-ú]+)\s*\|', body_normalized, re.IGNORECASE)
            if user_match2:
                user = user_match2.group(1).strip()
        
        ticket_data['user'] = user if user else 'Usuario Desconocido'
        
        # Extraer sucursal - buscar después de "Sin Valor," o antes de "Equipo:"
        branch_match = re.search(r'Sin Valor,\s*([A-ZÁ-Ú][a-zá-ú]+(?:\s+[A-ZÁ-Ú][a-zá-ú]+)?)\s*\.?\s*Equipo:', body_normalized, re.IGNORECASE)
        if branch_match:
            ticket_data['branch'] = branch_match.group(1).strip()
        
        # Extraer detalles - buscar el texto después del título en mayúsculas
        # El título suele estar en mayúsculas seguido del contenido real
        details = None
        
        # Buscar texto que empiece con "Hola" o "Buenos días" etc
        details_match = re.search(r'(?:Hola|Buenos días|Buenas tardes|Buen día)[,\s]+(.{1,400})', body_normalized, re.IGNORECASE)
        if details_match:
            details = details_match.group(1).strip()
            # Limpiar URLs
            details = re.sub(r'https?://[^\s]+', '', details)
            # Limpiar menciones @
            details = re.sub(r'@[A-Z\.\s]+\|[A-Z\s]+', '', details)
            # Limpiar espacios múltiples
            details = re.sub(r'\s+', ' ', details)
            # Cortar en el primer salto de sección
            details = details.split('[Nuevo requerimiento')[0].strip()
            details = details[:300]  # Limitar longitud
        
        ticket_data['details'] = details if details else 'Sin detalles'
    
    return ticket_data

def ticket_exists(ticket_number):
    """Verifica si un ticket ya existe en la base de datos"""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT 1 FROM tickets WHERE ticket_number = ?", (ticket_number,))
    exists = c.fetchone() is not None
    conn.close()
    return exists

def insert_ticket(ticket_data):
    """Inserta o actualiza un ticket en la base de datos"""
    if not ticket_data['ticket_number']:
        print(f"[SKIP] No se pudo extraer número de ticket")
        return False
    
    conn = get_db()
    c = conn.cursor()
    
    try:
        # Verificar si existe
        c.execute("SELECT user, details FROM tickets WHERE ticket_number = ?", (ticket_data['ticket_number'],))
        existing = c.fetchone()
        
        if existing:
            current_user = existing[0]
            # Si el usuario actual parece corrupto (muy largo o contiene "favor responda"), lo actualizamos
            if current_user and (len(current_user) > 50 or "favor responda" in current_user.lower()):
                print(f"[UPDATE] Corrigiendo ticket #{ticket_data['ticket_number']} - Usuario: {ticket_data['user']}")
                c.execute("""UPDATE tickets 
                             SET user = ?, branch = ?, details = ? 
                             WHERE ticket_number = ?""",
                          (ticket_data['user'], ticket_data['branch'], ticket_data['details'], ticket_data['ticket_number']))
                conn.commit()
                return True
            else:
                print(f"[SKIP] Ticket #{ticket_data['ticket_number']} ya existe y parece correcto")
                return False
        
        # Si no existe, insertar
        c.execute('''INSERT INTO tickets 
                    (ticket_number, creation_date, agent, status, collaborators, 
                     first_response, sla_resolution, close_date, delay, user, details, priority, type, branch)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                 (ticket_data['ticket_number'], ticket_data['creation_date'], 
                  ticket_data['agent'], ticket_data['status'], ticket_data['collaborators'],
                  ticket_data['first_response'], ticket_data['sla_resolution'], 
                  ticket_data['close_date'], ticket_data['delay'], ticket_data['user'],
                  ticket_data['details'], ticket_data['priority'], ticket_data['type'], 
                  ticket_data['branch']))
        conn.commit()
        print(f"[OK] Ticket #{ticket_data['ticket_number']} insertado correctamente: {ticket_data['title']}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error al procesar ticket: {e}")
        return False
    finally:
        conn.close()

def process_emails_from_folder(mail, folder_name):
    """Procesa correos de una carpeta específica"""
    print(f"\n[INFO] Procesando carpeta: {folder_name}")
    
    try:
        # Seleccionar carpeta
        status, messages = mail.select(folder_name)
        if status != "OK":
            print(f"[ERROR] No se pudo acceder a la carpeta {folder_name}")
            return 0
        
        # Calcular fecha de hace 24 horas (1 día)
        from datetime import timedelta
        one_day_ago = (datetime.now() - timedelta(days=1)).strftime("%d-%b-%Y")
        
        # Buscar correos de Mesa de Ayuda de las últimas 24 horas
        search_criteria = f'(FROM "Mesa de Ayuda" SINCE {one_day_ago})'
        status, message_ids = mail.search(None, search_criteria)
        
        if status != "OK":
            print(f"[INFO] No se encontraron correos en {folder_name}")
            return 0
        
        message_list = message_ids[0].split()
        total_processed = 0
        
        print(f"[INFO] Encontrados {len(message_list)} correos de Mesa de Ayuda (últimos 5 días)")
        
        for msg_id in message_list:
            try:
                # Obtener el correo
                status, msg_data = mail.fetch(msg_id, "(RFC822)")
                
                if status != "OK":
                    continue
                
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        # Decodificar asunto
                        subject = decode_email_subject(msg["Subject"])
                        
                        # Obtener fecha
                        email_date = msg.get("Date")
                        
                        # Obtener cuerpo
                        body = get_email_body(msg)
                        
                        print(f"\n[PROCESANDO] {subject} (Fecha: {email_date})")
                        
                        # Parsear ticket
                        ticket_data = parse_ticket_from_email(subject, body, email_date)
                        
                        # Insertar en BD
                        if insert_ticket(ticket_data):
                            total_processed += 1
                            # Marcar como leído para no reprocesar
                            # mail.store(msg_id, '+FLAGS', '\\Seen')
            
            except Exception as e:
                print(f"[ERROR] Error procesando mensaje: {e}")
                continue
        
        return total_processed
    
    except Exception as e:
        print(f"[ERROR] Error en carpeta {folder_name}: {e}")
        return 0

def scan_emails():
    """Función principal que escanea los correos y extrae tickets"""
    print("="*60)
    print("INICIANDO ESCANEO DE CORREOS PARA TICKETS")
    print("="*60)
    
    try:
        # Conectar al servidor
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        print(f"[OK] Conectado a {IMAP_SERVER}")
        
        # Login
        mail.login(USERNAME, PASSWORD)
        print(f"[OK] Login exitoso para {USERNAME}")
        
        total_tickets = 0
        
        # Procesar INBOX
        total_tickets += process_emails_from_folder(mail, "INBOX")
        
        # Procesar A-TIKETERA
        total_tickets += process_emails_from_folder(mail, "A-TIKETERA")
        
        # Cerrar conexión
        mail.logout()
        
        print("\n" + "="*60)
        print(f"ESCANEO COMPLETADO - Total de tickets nuevos: {total_tickets}")
        print("="*60)
        
        return total_tickets
        
    except Exception as e:
        print(f"\n[ERROR CRÍTICO] {e}")
        return 0

if __name__ == "__main__":
    scan_emails()
