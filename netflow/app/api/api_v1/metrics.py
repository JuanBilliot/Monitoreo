from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime
import logging

from app.database.database import get_db
from app.database.models import Server, Metric
from app.api.api_v1.auth import verify_token
from app.utils.metrics_collector import MetricsCollector
from app.utils.system_metrics import SystemMetricsCollector
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()

@router.get("/servers/{server_id}/metrics")
async def get_server_metrics(
    server_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(verify_token)
):
    logger.info(f"Obteniendo métricas para servidor ID: {server_id}")
    
    # Obtener el servidor
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        logger.error(f"Servidor no encontrado: {server_id}")
        raise HTTPException(status_code=404, detail="Servidor no encontrado")

    # Crear el colector de métricas
    try:
        logger.info(f"Creando colector de métricas para {server.ip_address}")
        collector = MetricsCollector(
            hostname=server.ip_address,
            username=settings.SERVER_USERNAME,
            password=settings.SERVER_PASSWORD
        )
        
        # Obtener las métricas
        logger.info("Intentando obtener métricas...")
        metrics = collector.get_all_metrics()
        
        # Si hay un error de conexión
        if 'error' in metrics:
            logger.error(f"Error al obtener métricas: {metrics['error']}")
            raise HTTPException(status_code=500, detail=metrics['error'])

        logger.info(f"Métricas obtenidas exitosamente: {metrics}")
        
        # Guardar las métricas en la base de datos
        for metric_type, value in metrics.items():
            if isinstance(value, dict):
                # Para métricas compuestas como memoria, disco y red
                for subtype, subvalue in value.items():
                    if isinstance(subvalue, (int, float)):
                        metric = Metric(
                            server_id=server.id,
                            metric_type=f"{metric_type}_{subtype}",
                            value=float(subvalue)
                        )
                        db.add(metric)
            elif isinstance(value, (int, float)):
                # Para métricas simples como CPU
                metric = Metric(
                    server_id=server.id,
                    metric_type=metric_type,
                    value=float(value)
                )
                db.add(metric)

        db.commit()
        return metrics
        
    except Exception as e:
        logger.error(f"Error general al obtener métricas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/servers/{server_id}/metrics/history")
async def get_server_metrics_history(
    server_id: int,
    metric_type: str,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(verify_token)
):
    # Obtener el servidor
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor no encontrado")

    # Obtener el historial de métricas
    metrics = db.query(Metric)\
        .filter(Metric.server_id == server_id)\
        .filter(Metric.metric_type == metric_type)\
        .order_by(Metric.timestamp.desc())\
        .limit(limit)\
        .all()

    return metrics

@router.get("/ping/{ip_address}")
async def ping_server(
    ip_address: str,
    # Sin autenticación para pruebas
):
    """
    Ejecuta un comando ping real al servidor y devuelve los resultados precisos.
    """
    import subprocess
    import re
    
    logger.info(f"Ejecutando ping a la dirección IP: {ip_address}")
    
    try:
        # Ejecutar ping con 4 paquetes (n=4) para obtener resultados rápidos
        # Usando -w 1000 para timeout de 1000ms por paquete
        process = subprocess.Popen(
            ["ping", "-n", "4", "-w", "1000", ip_address],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            logger.error(f"Error al hacer ping a {ip_address}: {stderr}")
            return {
                "success": False,
                "error": "El servidor no responde a ping",
                "raw_output": stdout
            }
        
        # Extraer tiempos de ping usando expresiones regulares
        ping_times = []
        
        # Patrón para capturar tiempos como "tiempo=1ms" o "time<1ms" o "time=0ms"
        pattern = r"tiempo[=<](\d+)ms|time[=<](\d+)ms"
        matches = re.findall(pattern, stdout)
        
        for match in matches:
            # Los grupos pueden ser "" si no hay coincidencia, tomamos el valor no vacío
            time_str = match[0] if match[0] else match[1]
            if time_str:
                ping_times.append(int(time_str))
        
        # Extraer estadísticas básicas
        stats = {}
        
        # Buscar la línea de estadísticas que contiene "Mínimo = ... ms, Máximo = ... ms, Media = ... ms"
        stats_pattern = r"M[ií]nimo = (\d+)ms, M[aá]ximo = (\d+)ms, Media = (\d+)ms"
        stats_match = re.search(stats_pattern, stdout)
        
        if stats_match:
            stats["min"] = int(stats_match.group(1))
            stats["max"] = int(stats_match.group(2))
            stats["avg"] = int(stats_match.group(3))
        
        # Calcular porcentaje de paquetes perdidos
        sent_pattern = r"Enviados = (\d+)"
        received_pattern = r"Recibidos = (\d+)"
        
        sent_match = re.search(sent_pattern, stdout)
        received_match = re.search(received_pattern, stdout)
        
        packets_sent = int(sent_match.group(1)) if sent_match else 0
        packets_received = int(received_match.group(1)) if received_match else 0
        packets_lost = packets_sent - packets_received
        loss_percent = (packets_lost / packets_sent) * 100 if packets_sent > 0 else 0
        
        return {
            "success": True,
            "ip_address": ip_address,
            "ping_times": ping_times,
            "stats": stats,
            "packets": {
                "sent": packets_sent,
                "received": packets_received,
                "lost": packets_lost,
                "loss_percent": round(loss_percent, 2)
            },
            "timestamp": datetime.now().isoformat(),
            "raw_output": stdout
        }
    
    except Exception as e:
        logger.error(f"Error al ejecutar ping a {ip_address}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "ip_address": ip_address,
            "timestamp": datetime.now().isoformat()
        }

@router.get("/system/cpu/{ip_address}")
async def get_cpu_info(
    ip_address: str,
):
    """
    Obtiene información de uso de CPU para un servidor específico.
    """
    logger.info(f"Obteniendo información de CPU para {ip_address}")
    result = SystemMetricsCollector.get_cpu_info(ip_address)
    return result

@router.get("/system/memory/{ip_address}")
async def get_memory_info(
    ip_address: str,
):
    """
    Obtiene información de uso de memoria para un servidor específico.
    """
    logger.info(f"Obteniendo información de memoria para {ip_address}")
    result = SystemMetricsCollector.get_memory_info(ip_address)
    return result

@router.get("/system/disk/{ip_address}")
async def get_disk_info(
    ip_address: str,
):
    """
    Obtiene información de uso de disco para un servidor específico.
    """
    logger.info(f"Obteniendo información de disco para {ip_address}")
    result = SystemMetricsCollector.get_disk_info(ip_address)
    return result

@router.get("/system/services/{ip_address}")
async def get_services_info(
    ip_address: str,
    # Sin autenticación por ahora para pruebas
    # current_user = Depends(verify_token)
):
    """
    Obtiene información de servicios críticos para un servidor específico.
    """
    logger.info(f"Obteniendo información de servicios para {ip_address}")
    result = SystemMetricsCollector.get_services_info(ip_address)
    return result
