from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import Server, Metric
from app.api.api_v1.auth import verify_token
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class ServerBase(BaseModel):
    name: str
    ip_address: str

class ServerCreate(ServerBase):
    password: str

class ServerUpdate(ServerBase):
    password: Optional[str] = None

class ServerResponse(ServerBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/servers", response_model=List[dict])
async def get_servers(
    db: Session = Depends(get_db),
    current_user: Server = Depends(verify_token)
):
    # Obtener todos los servidores
    servers = db.query(Server).all()
    
    # Para cada servidor, obtener sus últimas métricas
    result = []
    for server in servers:
        # Obtener las últimas métricas de CPU y memoria
        last_metrics = {}
        for metric_type in ['cpu_usage', 'memory_usage']:
            latest_metric = db.query(Metric).filter(
                Metric.server_id == server.id,
                Metric.metric_type == metric_type
            ).order_by(Metric.timestamp.desc()).first()
            
            if latest_metric:
                last_metrics[metric_type] = latest_metric.value
        
        # Agregar el servidor con sus métricas
        result.append({
            "id": server.id,
            "name": server.name,
            "ip_address": server.ip_address,
            "status": "active",
            "cpu_usage": last_metrics.get('cpu_usage', 0),
            "memory_usage": last_metrics.get('memory_usage', 0),
            "network_in": 0,  # TODO: Implementar métricas de red
            "network_out": 0  # TODO: Implementar métricas de red
        })
    
    return result

@router.post("/servers", response_model=ServerResponse)
async def create_server(
    server_data: ServerCreate,
    db: Session = Depends(get_db),
    current_user: Server = Depends(verify_token)
):
    # Verificar si ya existe un servidor con ese nombre
    existing_server = db.query(Server).filter(Server.name == server_data.name).first()
    if existing_server:
        raise HTTPException(status_code=400, detail="Ya existe un servidor con ese nombre")
    
    new_server = Server(
        name=server_data.name,
        ip_address=server_data.ip_address,
        hashed_password=get_password_hash(server_data.password),
        is_active=True
    )
    
    try:
        db.add(new_server)
        db.commit()
        db.refresh(new_server)
        
        return {
            "id": new_server.id,
            "name": new_server.name,
            "ip_address": new_server.ip_address,
            "is_active": new_server.is_active
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/servers/{server_id}", response_model=dict)
async def update_server(
    server_id: int,
    server_data: ServerUpdate,
    db: Session = Depends(get_db),
    current_user: Server = Depends(verify_token)
):
    # Obtener el servidor
    db_server = db.query(Server).filter(Server.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Servidor no encontrado")
    
    # Verificar si el nuevo nombre ya existe en otro servidor
    if server_data.name != db_server.name:
        existing_server = db.query(Server).filter(
            Server.name == server_data.name,
            Server.id != server_id
        ).first()
        if existing_server:
            raise HTTPException(status_code=400, detail="Ya existe un servidor con ese nombre")
    
    # Actualizar los datos del servidor
    db_server.name = server_data.name
    db_server.ip_address = server_data.ip_address
    
    try:
        db.commit()
        db.refresh(db_server)
        
        # Obtener las últimas métricas
        last_metrics = {}
        for metric_type in ['cpu_usage', 'memory_usage']:
            latest_metric = db.query(Metric).filter(
                Metric.server_id == db_server.id,
                Metric.metric_type == metric_type
            ).order_by(Metric.timestamp.desc()).first()
            
            if latest_metric:
                last_metrics[metric_type] = latest_metric.value
        
        # Devolver el servidor actualizado con sus métricas
        return {
            "id": db_server.id,
            "name": db_server.name,
            "ip_address": db_server.ip_address,
            "status": "active",
            "cpu_usage": last_metrics.get('cpu_usage', 0),
            "memory_usage": last_metrics.get('memory_usage', 0),
            "network_in": 0,  # TODO: Implementar métricas de red
            "network_out": 0  # TODO: Implementar métricas de red
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/servers/{server_id}", response_model=dict)
async def get_server(
    server_id: int,
    db: Session = Depends(get_db),
    current_user: Server = Depends(verify_token)
):
    server = db.query(Server).filter(Server.id == server_id, Server.is_active == True).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor no encontrado")
    
    # Obtener las últimas métricas
    last_metrics = {}
    for metric_type in ['cpu_usage', 'memory_usage']:
        latest_metric = db.query(Metric).filter(
            Metric.server_id == server.id,
            Metric.metric_type == metric_type
        ).order_by(Metric.timestamp.desc()).first()
        
        if latest_metric:
            last_metrics[metric_type] = latest_metric.value
    
    return {
        "id": server.id,
        "name": server.name,
        "ip_address": server.ip_address,
        "is_active": server.is_active,
        "last_metrics": last_metrics
    }
