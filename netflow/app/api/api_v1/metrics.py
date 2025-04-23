from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime
import logging

from app.database.database import get_db
from app.database.models import Server, Metric
from app.api.api_v1.auth import verify_token
from app.utils.metrics_collector import MetricsCollector
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
        logger.error(f"Error in get_server_metrics: {str(e)}")
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
