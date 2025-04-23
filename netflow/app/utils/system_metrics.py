"""
Utilidades para obtener métricas del sistema (CPU, memoria, disco, servicios)
"""
import subprocess
import re
import platform
import logging
import socket
import time
from typing import Dict, List, Union, Any

logger = logging.getLogger(__name__)

class SystemMetricsCollector:
    """
    Clase para recopilar métricas del sistema operativo local o remoto.
    Por ahora, las métricas remotas se simulan basadas en la IP.
    En una implementación real, se usaría WMI, SSH o agentes remotos.
    """
    
    @staticmethod
    def get_cpu_info(ip_address: str = None) -> Dict[str, Any]:
        """
        Obtiene información de uso de CPU.
        
        Args:
            ip_address: La dirección IP del servidor (opcioal, para servidores remotos)
            
        Returns:
            Diccionario con información de CPU
        """
        try:
            logger.info(f"Obteniendo información de CPU para {ip_address if ip_address else 'localhost'}")
            
            # Si es el localhost, intentamos obtener información real
            if not ip_address or ip_address in ('127.0.0.1', 'localhost', socket.gethostbyname(socket.gethostname())):
                if platform.system() == 'Windows':
                    # Usar wmic para Windows
                    cpu_output = subprocess.check_output("wmic cpu get LoadPercentage, NumberOfCores, Name", shell=True).decode('utf-8')
                    
                    # Extraer la carga de CPU
                    usage_match = re.search(r'(\d+)', cpu_output)
                    cpu_usage = int(usage_match.group(1)) if usage_match else 0
                    
                    # Extraer número de núcleos
                    cores_match = re.search(r'NumberOfCores\s+(\d+)', cpu_output)
                    cpu_cores = int(cores_match.group(1)) if cores_match else 0
                    
                    # Extraer nombre del procesador
                    name_match = re.search(r'Name\s+(.*?)\s*$', cpu_output, re.MULTILINE)
                    cpu_name = name_match.group(1).strip() if name_match else "Unknown CPU"
                    
                    # Obtener procesos que más consumen
                    top_processes_output = subprocess.check_output(
                        'powershell "Get-Process | Sort-Object -Property CPU -Descending | Select-Object -First 5 | ft ProcessName, CPU -AutoSize"', 
                        shell=True
                    ).decode('utf-8')
                    
                    # Lista de procesos top
                    top_processes = []
                    for line in top_processes_output.strip().split('\n')[2:]:  # Saltar encabezado
                        parts = line.strip().split()
                        if len(parts) >= 2:
                            process_name = parts[0]
                            cpu = float(parts[-1]) if parts[-1].replace('.', '', 1).isdigit() else 0
                            top_processes.append({"name": process_name, "cpu_usage": cpu})
                    
                    return {
                        "success": True,
                        "usage_percent": cpu_usage,
                        "cores": cpu_cores,
                        "name": cpu_name,
                        "top_processes": top_processes[:5],
                        "timestamp": time.time()
                    }
                else:
                    # Código para Linux/Mac aquí si es necesario
                    return {
                        "success": False,
                        "error": "Sistema operativo no soportado"
                    }
            else:
                # Para servidores remotos, simular valores basados en IP
                # En una implementación real, usaríamos WMI para Windows o SSH para Linux
                import random
                import hashlib
                
                # Generar un valor determinista basado en la IP
                hash_val = int(hashlib.md5(ip_address.encode()).hexdigest(), 16) % 100
                base_usage = (hash_val % 20) + 10  # Entre 10% y 30%
                
                # Añadir variación realista
                cpu_usage = min(95, max(5, base_usage + random.randint(-5, 15)))
                
                # Determinar número de núcleos basado en IP
                cpu_cores = (hash_val % 8) + 2  # Entre 2 y 10 núcleos
                
                # Generar procesos top simulados
                process_names = ["chrome", "firefox", "sqlservr", "w3wp", "explorer", "iis", "nginx", "apache", "postgres", "java"]
                top_processes = []
                
                for i in range(5):
                    process_idx = (hash_val + i) % len(process_names)
                    process_usage = max(1, (cpu_usage / (i + 1)) * (0.7 + (random.random() * 0.6)))
                    top_processes.append({
                        "name": process_names[process_idx],
                        "cpu_usage": round(process_usage, 1)
                    })
                
                return {
                    "success": True,
                    "usage_percent": cpu_usage,
                    "cores": cpu_cores,
                    "name": f"Intel(R) Xeon(R) CPU E5-{2600 + (hash_val % 400)} v{(hash_val % 4) + 1}",
                    "top_processes": top_processes,
                    "timestamp": time.time()
                }
                
        except Exception as e:
            logger.error(f"Error al obtener información de CPU: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def get_memory_info(ip_address: str = None) -> Dict[str, Any]:
        """
        Obtiene información de uso de memoria.
        
        Args:
            ip_address: La dirección IP del servidor (opcional, para servidores remotos)
            
        Returns:
            Diccionario con información de memoria
        """
        try:
            logger.info(f"Obteniendo información de memoria para {ip_address if ip_address else 'localhost'}")
            
            # Si es el localhost, intentamos obtener información real
            if not ip_address or ip_address in ('127.0.0.1', 'localhost', socket.gethostbyname(socket.gethostname())):
                if platform.system() == 'Windows':
                    # Usar wmic para Windows
                    memory_output = subprocess.check_output(
                        "wmic OS get FreePhysicalMemory,TotalVisibleMemorySize", 
                        shell=True
                    ).decode('utf-8')
                    
                    # Extraer valores de memoria
                    total_match = re.search(r'TotalVisibleMemorySize\s+(\d+)', memory_output)
                    free_match = re.search(r'FreePhysicalMemory\s+(\d+)', memory_output)
                    
                    if total_match and free_match:
                        total_kb = int(total_match.group(1))
                        free_kb = int(free_match.group(1))
                        
                        # Convertir a GB para mayor legibilidad
                        total_gb = round(total_kb / 1024 / 1024, 2)
                        free_gb = round(free_kb / 1024 / 1024, 2)
                        used_gb = round(total_gb - free_gb, 2)
                        
                        # Calcular porcentaje de uso
                        usage_percent = round((used_gb / total_gb) * 100, 1) if total_gb > 0 else 0
                        
                        return {
                            "success": True,
                            "total_gb": total_gb,
                            "used_gb": used_gb,
                            "free_gb": free_gb,
                            "usage_percent": usage_percent,
                            "timestamp": time.time()
                        }
                else:
                    # Código para Linux/Mac aquí si es necesario
                    return {
                        "success": False,
                        "error": "Sistema operativo no soportado"
                    }
            else:
                # Para servidores remotos, simular valores basados en IP
                import random
                import hashlib
                
                # Generar un valor determinista basado en la IP
                hash_val = int(hashlib.md5(ip_address.encode()).hexdigest(), 16) % 100
                
                # Determinar memoria total basada en IP (entre 8GB y 128GB)
                mem_range = [8, 16, 32, 64, 128]
                total_gb = mem_range[(hash_val % len(mem_range))]
                
                # Simular uso de memoria basado en IP
                base_usage_percent = (hash_val % 30) + 40  # Entre 40% y 70%
                usage_percent = min(95, max(10, base_usage_percent + random.randint(-10, 10)))
                
                # Calcular usado y libre
                used_gb = round((total_gb * usage_percent) / 100, 2)
                free_gb = round(total_gb - used_gb, 2)
                
                return {
                    "success": True,
                    "total_gb": total_gb,
                    "used_gb": used_gb,
                    "free_gb": free_gb,
                    "usage_percent": usage_percent,
                    "timestamp": time.time()
                }
                
        except Exception as e:
            logger.error(f"Error al obtener información de memoria: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def get_disk_info(ip_address: str = None) -> Dict[str, Any]:
        """
        Obtiene información de uso del disco.
        
        Args:
            ip_address: La dirección IP del servidor (opcional, para servidores remotos)
            
        Returns:
            Diccionario con información de discos
        """
        try:
            logger.info(f"Obteniendo información de disco para {ip_address if ip_address else 'localhost'}")
            
            # Si es el localhost, intentamos obtener información real
            if not ip_address or ip_address in ('127.0.0.1', 'localhost', socket.gethostbyname(socket.gethostname())):
                if platform.system() == 'Windows':
                    # Usar wmic para Windows
                    disk_output = subprocess.check_output(
                        "wmic logicaldisk get Caption,Size,FreeSpace", 
                        shell=True
                    ).decode('utf-8')
                    
                    # Procesar la salida y extraer información de cada disco
                    disks = []
                    lines = disk_output.strip().split('\n')
                    
                    # Saltar la línea de encabezado
                    for line in lines[1:]:
                        parts = re.split(r'\s+', line.strip())
                        
                        if len(parts) >= 3 and parts[0] and parts[1] and parts[2]:
                            try:
                                drive = parts[0]
                                
                                # Los valores pueden estar en diferentes posiciones según formato de salida
                                # Intentamos detectar cuál es cuál
                                size_str = None
                                free_str = None
                                
                                for part in parts[1:]:
                                    if part and part.isdigit():
                                        if not size_str:
                                            # Asumimos que el mayor número es el tamaño
                                            size_str = part
                                        elif not free_str:
                                            # Y el segundo mayor es el espacio libre
                                            free_str = part
                                
                                # Si tenemos ambos valores
                                if size_str and free_str:
                                    size_bytes = int(size_str)
                                    free_bytes = int(free_str)
                                    
                                    # Convertir a GB
                                    size_gb = round(size_bytes / (1024**3), 2)
                                    free_gb = round(free_bytes / (1024**3), 2)
                                    used_gb = round(size_gb - free_gb, 2)
                                    
                                    # Calcular porcentaje de uso
                                    usage_percent = round((used_gb / size_gb) * 100, 1) if size_gb > 0 else 0
                                    
                                    disks.append({
                                        "drive": drive,
                                        "total_gb": size_gb,
                                        "used_gb": used_gb,
                                        "free_gb": free_gb,
                                        "usage_percent": usage_percent
                                    })
                            except (ValueError, IndexError) as e:
                                logger.warning(f"Error procesando información de disco {parts}: {str(e)}")
                    
                    return {
                        "success": True,
                        "disks": disks,
                        "timestamp": time.time()
                    }
                else:
                    # Código para Linux/Mac aquí si es necesario
                    return {
                        "success": False,
                        "error": "Sistema operativo no soportado"
                    }
            else:
                # Para servidores remotos, simular valores basados en IP
                import random
                import hashlib
                
                # Generar un valor determinista basado en la IP
                hash_val = int(hashlib.md5(ip_address.encode()).hexdigest(), 16) % 100
                
                # Simular entre 1 y 4 discos
                num_disks = (hash_val % 4) + 1
                
                # Posibles letras de unidad
                drive_letters = ['C:', 'D:', 'E:', 'F:', 'G:']
                
                # Tamaños comunes de disco (en GB)
                disk_sizes = [128, 256, 512, 1024, 2048, 4096]
                
                disks = []
                for i in range(num_disks):
                    # Determinar tamaño del disco basado en IP y índice
                    size_index = (hash_val + i) % len(disk_sizes)
                    size_gb = disk_sizes[size_index]
                    
                    # Simular uso basado en IP y posición del disco
                    base_usage = ((hash_val + (i * 10)) % 40) + 30  # Entre 30% y 70%
                    usage_percent = min(95, max(5, base_usage + random.randint(-10, 10)))
                    
                    # Calcular espacio usado y libre
                    used_gb = round((size_gb * usage_percent) / 100, 2)
                    free_gb = round(size_gb - used_gb, 2)
                    
                    disks.append({
                        "drive": drive_letters[i],
                        "total_gb": size_gb,
                        "used_gb": used_gb,
                        "free_gb": free_gb,
                        "usage_percent": usage_percent
                    })
                
                return {
                    "success": True,
                    "disks": disks,
                    "timestamp": time.time()
                }
                
        except Exception as e:
            logger.error(f"Error al obtener información de disco: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def get_services_info(ip_address: str = None) -> Dict[str, Any]:
        """
        Obtiene información de servicios críticos del sistema.
        
        Args:
            ip_address: La dirección IP del servidor (opcional, para servidores remotos)
            
        Returns:
            Diccionario con información de servicios
        """
        try:
            logger.info(f"Obteniendo información de servicios para {ip_address if ip_address else 'localhost'}")
            
            # Lista de servicios críticos a verificar
            critical_services = [
                "wuauserv",       # Windows Update
                "LanmanServer",   # Server
                "MpsSvc",         # Windows Firewall
                "MSSQLSERVER",    # SQL Server
                "W3SVC",          # IIS
                "BITS",           # Background Intelligent Transfer Service
                "Schedule",       # Task Scheduler
                "TermService",    # Remote Desktop
                "EventLog",       # Event Log
                "Spooler"         # Print Spooler
            ]
            
            # Si es el localhost, intentamos obtener información real
            if not ip_address or ip_address in ('127.0.0.1', 'localhost', socket.gethostbyname(socket.gethostname())):
                if platform.system() == 'Windows':
                    services = []
                    
                    for service_name in critical_services:
                        try:
                            # Verificar el estado del servicio
                            service_output = subprocess.check_output(
                                f"sc query {service_name}", 
                                shell=True
                            ).decode('utf-8')
                            
                            # Extraer estado del servicio
                            state_match = re.search(r'STATE\s+:\s+\d+\s+(\w+)', service_output)
                            state = state_match.group(1) if state_match else "UNKNOWN"
                            
                            # Extraer tipo de inicio
                            startup_type = "AUTO"  # Valor por defecto
                            
                            # Obtener nombre descriptivo
                            display_name_match = re.search(r'DISPLAY_NAME\s+:\s+(.*?)$', service_output, re.MULTILINE)
                            display_name = display_name_match.group(1).strip() if display_name_match else service_name
                            
                            services.append({
                                "name": service_name,
                                "display_name": display_name,
                                "state": state,
                                "startup_type": startup_type
                            })
                        except Exception as e:
                            logger.warning(f"Error al obtener información del servicio {service_name}: {str(e)}")
                            # Si el servicio no existe, lo añadimos como no encontrado
                            services.append({
                                "name": service_name,
                                "display_name": service_name,
                                "state": "NOT_FOUND",
                                "startup_type": "UNKNOWN"
                            })
                    
                    return {
                        "success": True,
                        "services": services,
                        "timestamp": time.time()
                    }
                else:
                    # Código para Linux/Mac aquí si es necesario
                    return {
                        "success": False,
                        "error": "Sistema operativo no soportado"
                    }
            else:
                # Para servidores remotos, simular valores basados en IP
                import random
                import hashlib
                
                # Generar un valor determinista basado en la IP
                hash_val = int(hashlib.md5(ip_address.encode()).hexdigest(), 16) % 100
                
                # Estados posibles de servicios
                states = ["RUNNING", "STOPPED", "PAUSED", "START_PENDING", "STOP_PENDING"]
                startup_types = ["AUTO", "MANUAL", "DISABLED"]
                
                services = []
                for i, service_name in enumerate(critical_services):
                    # Determinar si el servicio existe basado en IP e índice
                    service_exists = (hash_val + i) % 10 != 9  # 90% de probabilidad de que exista
                    
                    if service_exists:
                        # Para servicios que existen, determinar estado basado en IP e índice
                        state_index = (hash_val + i) % len(states)
                        # Para servicios críticos, mayor probabilidad de que estén en ejecución
                        if i < 5 and state_index != 0:  # Para los primeros 5 servicios
                            state_index = 0  # RUNNING
                        
                        state = states[state_index]
                        
                        # Determinar tipo de inicio
                        startup_index = (hash_val + i) % len(startup_types)
                        startup_type = startup_types[startup_index]
                        
                        # Nombre descriptivo
                        display_names = {
                            "wuauserv": "Windows Update",
                            "LanmanServer": "Server",
                            "MpsSvc": "Windows Firewall",
                            "MSSQLSERVER": "SQL Server",
                            "W3SVC": "IIS Web Server",
                            "BITS": "Background Intelligent Transfer Service",
                            "Schedule": "Task Scheduler",
                            "TermService": "Remote Desktop Services",
                            "EventLog": "Windows Event Log",
                            "Spooler": "Print Spooler"
                        }
                        
                        display_name = display_names.get(service_name, service_name)
                        
                        services.append({
                            "name": service_name,
                            "display_name": display_name,
                            "state": state,
                            "startup_type": startup_type
                        })
                    else:
                        # Para servicios que no existen
                        services.append({
                            "name": service_name,
                            "display_name": service_name,
                            "state": "NOT_FOUND",
                            "startup_type": "UNKNOWN"
                        })
                
                return {
                    "success": True,
                    "services": services,
                    "timestamp": time.time()
                }
                
        except Exception as e:
            logger.error(f"Error al obtener información de servicios: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
