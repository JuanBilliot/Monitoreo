import time
import schedule
from email_ticket_scanner import scan_emails
from datetime import datetime

def job():
    """Tarea que se ejecuta cada 10 minutos"""
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Ejecutando escaneo automático de tickets...")
    print(f"{'='*60}")
    scan_emails()

def run_scheduler():
    """Inicia el planificador de tareas"""
    print("="*60)
    print("SERVICIO AUTOMÁTICO DE TICKETS INICIADO")
    print("Escaneando correos cada 10 minutos")
    print("Presiona Ctrl+C para detener")
    print("="*60)
    
    # Ejecutar inmediatamente al inicio
    job()
    
    # Programar ejecución cada 10 minutos
    schedule.every(10).minutes.do(job)
    
    # Mantener el servicio corriendo
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    try:
        run_scheduler()
    except KeyboardInterrupt:
        print("\n\n[INFO] Servicio detenido por el usuario")
