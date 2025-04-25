import asyncio
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from app.api.api_v1 import auth, metrics, servers
from app.database.database import engine, Base, create_tables
from app.utils.logger import logger
import os
from flask import Flask, jsonify
from flask_cors import CORS
import subprocess
import platform
import psutil
import re

settings = None

app = FastAPI()

# Middleware para logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Configurar CORS - Permitir todas las credenciales y métodos necesarios
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir cualquier origen en desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear tablas en la base de datos
@app.on_event("startup")
def startup_event():
    create_tables()

# Incluir rutas API
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(metrics.router, prefix="/api/v1", tags=["metrics"])
app.include_router(servers.router, prefix="/api/v1", tags=["servers"])

# Montar archivos estáticos
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir, html=True), name="frontend")

# Ruta raíz que sirve index.html
@app.get("/")
async def read_root():
    return FileResponse(os.path.join(frontend_dir, "index.html"))

# Creando el backend con Flask para manejar el ping y las métricas
flask_app = Flask(__name__)
CORS(flask_app)

def ping_host(host):
    """Ping a host and return status and latency."""
    try:
        # Usamos ping directo con parámetros exactamente iguales a ping -t
        if platform.system().lower() == 'windows':
            # En Windows, ping -t envía paquetes indefinidamente, pero limitamos a 5 para tener resultados rápidos
            command = ['ping', '-n', '5', host]
        else:
            # En Linux, usamos -c 5 para enviar exactamente 5 paquetes
            command = ['ping', '-c', '5', host]
        
        # Ejecutar el comando y capturar la salida completa
        output = subprocess.check_output(command, stderr=subprocess.STDOUT, timeout=10).decode().strip()
        logger.info(f"Ping output for {host}: {output}")
        
        # Inicializar variables para las estadísticas
        min_latency = 0
        max_latency = 0
        avg_latency = 0
        packets_sent = 5  # Por defecto enviamos 5 paquetes
        packets_received = 0
        packet_loss = 0
        
        # Analizar la salida según el sistema operativo
        if platform.system().lower() == 'windows':
            # Contar cuántas líneas contienen "Reply from" para saber cuántos paquetes se recibieron
            received_lines = [line for line in output.split('\n') if "Reply from" in line]
            packets_received = len(received_lines)
            
            # Extraer latencias individuales
            latencies = []
            for line in received_lines:
                # En Windows, el formato puede ser "time=XXms" o "time<1ms"
                if "time<1ms" in line:
                    latencies.append(0.5)  # Aproximamos a 0.5ms cuando es menor que 1ms
                else:
                    time_match = re.search(r'time=(\d+)ms', line)
                    if time_match:
                        latencies.append(float(time_match.group(1)))
            
            if latencies:
                min_latency = min(latencies)
                max_latency = max(latencies)
                avg_latency = sum(latencies) / len(latencies)
            
            # Extraer pérdida de paquetes directamente del resumen en Windows
            loss_match = re.search(r'(\d+)% perdidos', output)
            if loss_match:
                packet_loss = float(loss_match.group(1))
            else:
                # Calcular pérdida de paquetes si no se encuentra en la salida
                packet_loss = ((packets_sent - packets_received) / packets_sent) * 100
            
            # Verificar si hay información de estadísticas en la salida
            if "Estadísticas de ping" in output:
                stats_section = output.split("Estadísticas de ping")[1]
                # Intentar extraer valores más precisos si están disponibles
                if "Mínimo" in stats_section and "Máximo" in stats_section and "Media" in stats_section:
                    min_match = re.search(r'Mínimo = (\d+)ms', stats_section)
                    max_match = re.search(r'Máximo = (\d+)ms', stats_section)
                    avg_match = re.search(r'Media = (\d+)ms', stats_section)
                    
                    if min_match and max_match and avg_match:
                        min_latency = float(min_match.group(1))
                        max_latency = float(max_match.group(1))
                        avg_latency = float(avg_match.group(1))
        else:
            # Para Linux/Unix
            # Contar cuántas líneas contienen "bytes from" para saber cuántos paquetes se recibieron
            received_lines = [line for line in output.split('\n') if "bytes from" in line]
            packets_received = len(received_lines)
            
            # Extraer latencias individuales
            latencies = []
            for line in received_lines:
                time_match = re.search(r'time=([\d\.]+) ms', line)
                if time_match:
                    latencies.append(float(time_match.group(1)))
            
            if latencies:
                min_latency = min(latencies)
                max_latency = max(latencies)
                avg_latency = sum(latencies) / len(latencies)
            
            # Verificar si hay información de estadísticas en la salida
            if "rtt min/avg/max/mdev" in output:
                stats_match = re.search(r'rtt min/avg/max/mdev = ([\d\.]+)/([\d\.]+)/([\d\.]+)/([\d\.]+) ms', output)
                if stats_match:
                    min_latency = float(stats_match.group(1))
                    avg_latency = float(stats_match.group(2))
                    max_latency = float(stats_match.group(3))
            
            # Extraer pérdida de paquetes directamente del resumen
            loss_match = re.search(r'(\d+)% packet loss', output)
            if loss_match:
                packet_loss = float(loss_match.group(1))
            else:
                # Calcular pérdida de paquetes si no se encuentra en la salida
                packet_loss = ((packets_sent - packets_received) / packets_sent) * 100
        
        # Asegurarse de que los valores sean coherentes
        if packets_received > packets_sent:
            packets_received = packets_sent
            
        if packet_loss < 0:
            packet_loss = 0
        elif packet_loss > 100:
            packet_loss = 100
            
        # Registrar los resultados para depuración
        logger.info(f"Ping results for {host} - min: {min_latency}ms, max: {max_latency}ms, avg: {avg_latency}ms, " +
                   f"sent: {packets_sent}, received: {packets_received}, loss: {packet_loss}%")
        
        return {
            'status': 'online' if packets_received > 0 else 'offline',
            'latency': round(avg_latency, 1),
            'min_latency': round(min_latency, 1),
            'max_latency': round(max_latency, 1),
            'packets_sent': packets_sent,
            'packets_received': packets_received,
            'packet_loss': round(packet_loss, 1)
        }
    except subprocess.TimeoutExpired:
        logger.error(f"Ping timeout for host {host}")
        return {
            'status': 'timeout',
            'latency': 0,
            'min_latency': 0,
            'max_latency': 0,
            'packets_sent': 5,
            'packets_received': 0,
            'packet_loss': 100
        }
    except Exception as e:
        logger.error(f"Error al hacer ping a {host}: {str(e)}")
        return {
            'status': 'error',
            'latency': 0,
            'min_latency': 0,
            'max_latency': 0,
            'packets_sent': 5,
            'packets_received': 0,
            'packet_loss': 100,
            'error_message': str(e)
        }

def get_system_info():
    """Get system information."""
    # Obtener un valor más estable de CPU promediando varias lecturas
    # La primera llamada a cpu_percent siempre devuelve 0.0, así que hacemos una llamada inicial
    psutil.cpu_percent(interval=None)
    
    # Tomar varias muestras con un pequeño intervalo para obtener un valor más estable
    cpu_samples = []
    for _ in range(3):  # Tomar 3 muestras
        cpu_samples.append(psutil.cpu_percent(interval=0.1))
    
    # Calcular el promedio de las muestras
    avg_cpu = sum(cpu_samples) / len(cpu_samples)
    
    # También obtener información por núcleo para un análisis más detallado
    per_cpu = psutil.cpu_percent(percpu=True)
    
    cpu_info = {
        'usage': round(avg_cpu, 1),  # Redondear a 1 decimal para estabilidad
        'cores': psutil.cpu_count(logical=False),  # Cores físicos
        'logical_cores': psutil.cpu_count(logical=True),  # Threads/cores lógicos
        'per_core': per_cpu,  # Uso por núcleo
        'model': platform.processor()
    }
    
    # Obtener información de frecuencia si está disponible
    try:
        freq = psutil.cpu_freq()
        if freq:
            cpu_info['freq_current'] = freq.current
            cpu_info['freq_min'] = freq.min
            cpu_info['freq_max'] = freq.max
    except Exception as e:
        print(f"No se pudo obtener la frecuencia de CPU: {str(e)}")
    
    memory = psutil.virtual_memory()
    memory_info = {
        'total': memory.total,
        'used': memory.used,
        'percent': memory.percent
    }
    
    # Obtener información de todos los discos
    disks_info = []
    print("Escaneando discos disponibles...")
    for partition in psutil.disk_partitions(all=False):
        if partition.fstype:  # Verificar que la partición tiene un sistema de archivos
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disk_info = {
                    'device': partition.device,
                    'mountpoint': partition.mountpoint,
                    'fstype': partition.fstype,
                    'total': usage.total,
                    'used': usage.used,
                    'free': usage.free,
                    'percent': usage.percent
                }
                disks_info.append(disk_info)
                print(f"Disco detectado: {partition.device} ({partition.mountpoint}) - {usage.percent}% usado")
            except (PermissionError, OSError) as e:
                # Algunas particiones pueden no ser accesibles
                print(f"Error al acceder a {partition.mountpoint}: {str(e)}")
                pass
    
    # Mantener la compatibilidad con el código existente
    # Usar el primer disco como disco principal si existe
    disk_info = disks_info[0] if disks_info else {
        'total': 0,
        'used': 0,
        'free': 0,
        'percent': 0
    }
    
    network = psutil.net_io_counters()
    network_info = {
        'bytes_sent': network.bytes_sent,
        'bytes_recv': network.bytes_recv,
        'packets_sent': network.packets_sent,
        'packets_recv': network.packets_recv,
        'errin': network.errin,
        'errout': network.errout,
        'dropin': network.dropin,
        'dropout': network.dropout
    }
    
    # Imprimir información para depuración
    print("Información de discos detectados:")
    for disk in disks_info:
        print(f"  - {disk['mountpoint']} ({disk['device']}): {disk['percent']}% usado, {disk['free'] / (1024**3):.1f} GB libres de {disk['total'] / (1024**3):.1f} GB")
    
    return {
        'cpu': cpu_info,
        'memory': memory_info,
        'disk': disk_info,
        'disks': disks_info,  # Nueva propiedad con todos los discos
        'network': network_info
    }

@flask_app.route('/api/ping/<ip>')
def check_server(ip):
    return jsonify(ping_host(ip))

@flask_app.route('/api/metrics/<ip>')
def get_metrics(ip):
    return jsonify(get_system_info())

# Agregar rutas de Flask a FastAPI
from fastapi.requests import Request
from fastapi import APIRouter

router = APIRouter()

@router.get("/api/ping/{ip}")
async def check_server(ip: str):
    return JSONResponse(content=flask_app.test_client().get(f"/api/ping/{ip}").json)

@router.get("/api/metrics/{ip}")
async def get_metrics(ip: str):
    return JSONResponse(content=flask_app.test_client().get(f"/api/metrics/{ip}").json)

app.include_router(router, prefix="", tags=["servers"])