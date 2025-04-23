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
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', host]
    try:
        output = subprocess.check_output(command).decode().strip()
        if platform.system().lower() == 'windows':
            if 'TTL=' in output:
                latency = float(output.split('Average = ')[-1].split('ms')[0])
                return {'status': 'online', 'latency': latency}
        else:
            if 'bytes from' in output:
                latency = float(output.split('time=')[-1].split(' ')[0])
                return {'status': 'online', 'latency': latency}
    except:
        pass
    return {'status': 'offline', 'latency': 0}

def get_system_info():
    """Get system information."""
    cpu_info = {
        'usage': psutil.cpu_percent(),
        'cores': psutil.cpu_count(),
        'model': platform.processor()
    }
    
    memory = psutil.virtual_memory()
    memory_info = {
        'total': memory.total,
        'used': memory.used,
        'percent': memory.percent
    }
    
    disk = psutil.disk_usage('/')
    disk_info = {
        'total': disk.total,
        'used': disk.used,
        'percent': disk.percent
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
    
    return {
        'cpu': cpu_info,
        'memory': memory_info,
        'disk': disk_info,
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