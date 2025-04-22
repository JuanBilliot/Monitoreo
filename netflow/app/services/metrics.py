from ..database import SessionLocal
from ..database.models import Metric, Server
from ..ssh import SSHConnection
from ..config import get_settings
import psutil

settings = get_settings()

class MetricsService:
    def __init__(self):
        self.db = SessionLocal()
        self.ssh = SSHConnection()
    
    def get_server_metrics(self, server_id: int):
        try:
            # Conectar al servidor
            if not self.ssh.connect():
                return {"error": "No se pudo conectar al servidor"}
            
            # Obtener métricas
            metrics = {}
            
            # CPU
            cpu_usage = psutil.cpu_percent(interval=1)
            metrics["cpu"] = cpu_usage
            
            # Memoria
            memory = psutil.virtual_memory()
            metrics["memory"] = {
                "total": memory.total,
                "used": memory.used,
                "percent": memory.percent
            }
            
            # Disco
            disk = psutil.disk_usage('/')
            metrics["disk"] = {
                "total": disk.total,
                "used": disk.used,
                "percent": disk.percent
            }
            
            # Guardar métricas en la base de datos
            for metric_type, value in metrics.items():
                if isinstance(value, dict):
                    value = value["percent"]
                metric = Metric(
                    server_id=server_id,
                    metric_type=metric_type,
                    value=value
                )
                self.db.add(metric)
            
            self.db.commit()
            return metrics
        
        except Exception as e:
            return {"error": str(e)}
        finally:
            self.ssh.close()
            self.db.close()