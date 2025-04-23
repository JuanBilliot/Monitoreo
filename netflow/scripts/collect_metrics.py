import os
import sys
import psutil
import time
import requests
from datetime import datetime

# Agregar el directorio del proyecto al PYTHONPATH
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

from config import get_settings

settings = get_settings()

def get_system_metrics():
    metrics = []
    
    # CPU Usage
    cpu_percent = psutil.cpu_percent(interval=1)
    metrics.append(("cpu_usage", cpu_percent))
    
    # Memory Usage
    memory = psutil.virtual_memory()
    metrics.append(("memory_usage", memory.percent))
    
    # Disk Usage
    disk = psutil.disk_usage('/')
    metrics.append(("disk_usage", disk.percent))
    
    # Network IO
    net_io = psutil.net_io_counters()
    metrics.append(("network_bytes_sent", float(net_io.bytes_sent)))
    metrics.append(("network_bytes_recv", float(net_io.bytes_recv)))
    
    return metrics

def send_metrics(token):
    api_url = "http://localhost:8000/api/v1/metrics"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    while True:
        try:
            metrics = get_system_metrics()
            for metric_type, value in metrics:
                response = requests.post(
                    api_url,
                    params={"metric_type": metric_type, "value": value},
                    headers=headers
                )
                if response.status_code == 200:
                    print(f"Métrica enviada: {metric_type} = {value}")
                else:
                    print(f"Error al enviar métrica: {response.status_code}")
        except Exception as e:
            print(f"Error: {e}")
        
        # Esperar 30 segundos antes de la siguiente recolección
        time.sleep(30)

def get_token():
    response = requests.post(
        "http://localhost:8000/api/v1/token",
        data={
            "username": settings.SERVER_USERNAME,
            "password": settings.SERVER_PASSWORD
        }
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        raise Exception("No se pudo obtener el token")

if __name__ == "__main__":
    try:
        # Instalar psutil si no está instalado
        os.system("pip install psutil requests")
        
        # Obtener token
        token = get_token()
        print("Token obtenido correctamente")
        
        # Iniciar recolección de métricas
        send_metrics(token)
    except Exception as e:
        print(f"Error: {e}")
