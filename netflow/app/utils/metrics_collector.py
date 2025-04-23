import logging
import re
from typing import Dict, Optional, Any, List
import subprocess
import json
import time
import psutil
from datetime import datetime
import socket
from collections import defaultdict

logger = logging.getLogger(__name__)

class MetricsCollector:
    def __init__(self, hostname: str, username: str, password: str):
        self.interface_stats = defaultdict(lambda: {'last_bytes_recv': 0, 'last_bytes_sent': 0, 'last_check_time': time.time()})
        self.important_services = [
            'nginx', 'apache2', 'httpd', 'mysql', 'postgresql',
            'mongodb', 'redis-server', 'docker', 'ssh'
        ]
        self.monitored_ports = [
            80, 443, 22, 3306, 5432, 27017, 6379, 8080
        ]

    def execute_command(self, command: str) -> Optional[str]:
        try:
            logger.info(f"Ejecutando comando local: {command}")
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                logger.error(f"Error en comando: {result.stderr}")
                return None
                
            return result.stdout.strip()
        except subprocess.TimeoutExpired:
            logger.error("Comando excedió el tiempo límite")
            return None
        except Exception as e:
            logger.error(f"Error ejecutando comando: {str(e)}")
            return None

    def get_service_status(self) -> Dict[str, bool]:
        service_status = {}
        for service in self.important_services:
            status = self.execute_command(f"systemctl is-active {service} 2>/dev/null || echo 'inactive'")
            service_status[service] = status == 'active'
        return service_status

    def get_port_status(self) -> Dict[int, bool]:
        port_status = {}
        for port in self.monitored_ports:
            status = self.execute_command(f"nc -z localhost {port} >/dev/null 2>&1 && echo 'open' || echo 'closed'")
            port_status[port] = status == 'open'
        return port_status

    def get_connection_quality(self) -> Dict[str, Any]:
        quality = {
            'packet_loss': 0.0,
            'min_latency': 0.0,
            'avg_latency': 0.0,
            'max_latency': 0.0,
            'jitter': 0.0
        }
        
        # Ping con estadísticas detalladas a múltiples destinos
        destinations = ['8.8.8.8', '1.1.1.1', 'google.com']
        results = []
        
        for dest in destinations:
            ping_stats = self.execute_command(f"ping -c 5 -i 0.2 {dest} | grep -E 'rtt|packet loss'")
            if ping_stats:
                try:
                    # Extraer pérdida de paquetes
                    loss = re.search(r'(\d+)% packet loss', ping_stats)
                    if loss:
                        results.append({
                            'loss': float(loss.group(1)),
                            'dest': dest
                        })

                    # Extraer RTT min/avg/max/mdev
                    rtt = re.search(r'= (\d+\.\d+)/(\d+\.\d+)/(\d+\.\d+)/(\d+\.\d+)', ping_stats)
                    if rtt:
                        results.append({
                            'min': float(rtt.group(1)),
                            'avg': float(rtt.group(2)),
                            'max': float(rtt.group(3)),
                            'jitter': float(rtt.group(4)),
                            'dest': dest
                        })
                except (AttributeError, ValueError) as e:
                    logger.error(f"Error procesando calidad de conexión para {dest}: {str(e)}")

        if results:
            # Calcular promedios
            quality['packet_loss'] = sum(r['loss'] for r in results if 'loss' in r) / len([r for r in results if 'loss' in r])
            quality['min_latency'] = sum(r['min'] for r in results if 'min' in r) / len([r for r in results if 'min' in r])
            quality['avg_latency'] = sum(r['avg'] for r in results if 'avg' in r) / len([r for r in results if 'avg' in r])
            quality['max_latency'] = sum(r['max'] for r in results if 'max' in r) / len([r for r in results if 'max' in r])
            quality['jitter'] = sum(r['jitter'] for r in results if 'jitter' in r) / len([r for r in results if 'jitter' in r])
            
            # Agregar detalles por destino
            quality['details'] = {r['dest']: {k: v for k, v in r.items() if k != 'dest'} for r in results}

        return quality

    def get_interface_stats(self) -> Dict[str, Dict[str, Any]]:
        stats = {}
        current_time = time.time()
        
        # Obtener estadísticas de todas las interfaces
        net_stats = self.execute_command("cat /proc/net/dev | grep -v 'Inter\\|face\\|lo:'")
        if net_stats:
            for line in net_stats.splitlines():
                try:
                    parts = line.split()
                    if not parts:
                        continue
                        
                    interface = parts[0].strip(':')
                    bytes_recv = float(parts[1])
                    packets_recv = float(parts[2])
                    errs_recv = float(parts[3])
                    drop_recv = float(parts[4])
                    bytes_sent = float(parts[9])
                    packets_sent = float(parts[10])
                    errs_sent = float(parts[11])
                    drop_sent = float(parts[12])
                    
                    # Calcular velocidades
                    interface_data = self.interface_stats[interface]
                    time_diff = current_time - interface_data['last_check_time']
                    
                    if interface_data['last_bytes_recv'] > 0:
                        bytes_recv_speed = (bytes_recv - interface_data['last_bytes_recv']) / time_diff
                        bytes_sent_speed = (bytes_sent - interface_data['last_bytes_sent']) / time_diff
                    else:
                        bytes_recv_speed = 0
                        bytes_sent_speed = 0
                    
                    # Actualizar datos históricos
                    interface_data.update({
                        'last_bytes_recv': bytes_recv,
                        'last_bytes_sent': bytes_sent,
                        'last_check_time': current_time
                    })
                    
                    stats[interface] = {
                        'bytes_received': bytes_recv,
                        'bytes_sent': bytes_sent,
                        'bytes_received_speed': bytes_recv_speed,
                        'bytes_sent_speed': bytes_sent_speed,
                        'packets_received': packets_recv,
                        'packets_sent': packets_sent,
                        'errors_received': errs_recv,
                        'errors_sent': errs_sent,
                        'drops_received': drop_recv,
                        'drops_sent': drop_sent
                    }
                except (IndexError, ValueError) as e:
                    logger.error(f"Error procesando estadísticas de interfaz: {str(e)}")
                    
        return stats

    def get_tcp_stats(self) -> Dict[str, Any]:
        stats = {}
        
        # Estadísticas TCP detalladas
        tcp_stats = self.execute_command("cat /proc/net/tcp /proc/net/tcp6 2>/dev/null")
        if tcp_stats:
            connections = []
            states = defaultdict(int)
            
            for line in tcp_stats.splitlines()[1:]:  # Skip header
                try:
                    parts = line.split()
                    if len(parts) >= 4:
                        state = int(parts[3], 16)
                        states[state] += 1
                        
                        # Decodificar dirección local y remota
                        local = parts[1].split(':')
                        remote = parts[2].split(':')
                        
                        connections.append({
                            'local_address': local[0],
                            'local_port': int(local[1], 16),
                            'remote_address': remote[0],
                            'remote_port': int(remote[1], 16),
                            'state': state,
                            'uid': parts[7]
                        })
                except (IndexError, ValueError) as e:
                    continue
            
            stats['connections'] = connections[:50]  # Limitar a 50 conexiones
            stats['states'] = {
                'ESTABLISHED': states[1],
                'SYN_SENT': states[2],
                'SYN_RECV': states[3],
                'FIN_WAIT1': states[4],
                'FIN_WAIT2': states[5],
                'TIME_WAIT': states[6],
                'CLOSE': states[7],
                'CLOSE_WAIT': states[8],
                'LAST_ACK': states[9],
                'LISTEN': states[10]
            }
            
        return stats

    def get_network_stats(self) -> Optional[Dict[str, Any]]:
        metrics = {}
        
        # Estadísticas por interfaz
        metrics['interfaces'] = self.get_interface_stats()
        
        # Estadísticas TCP
        metrics['tcp'] = self.get_tcp_stats()
        
        # Calidad de conexión
        metrics['connection_quality'] = self.get_connection_quality()
        
        # Estado de servicios
        metrics['services'] = self.get_service_status()
        
        # Estado de puertos
        metrics['ports'] = self.get_port_status()
        
        # Procesos con uso de red
        try:
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'connections']):
                try:
                    pinfo = proc.info
                    if pinfo['connections']:
                        processes.append({
                            'pid': pinfo['pid'],
                            'name': pinfo['name'],
                            'connections': len(pinfo['connections'])
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            metrics['network_processes'] = sorted(processes, key=lambda x: x['connections'], reverse=True)[:10]
        except Exception as e:
            logger.error(f"Error obteniendo procesos de red: {str(e)}")

        # Timestamp
        metrics['timestamp'] = datetime.now().isoformat()
        
        return metrics

    def get_all_metrics(self) -> Dict[str, Any]:
        metrics = {
            'network': self.get_network_stats()
        }

        if metrics['network'] is None:
            return {'error': 'Could not collect network metrics'}

        return metrics
