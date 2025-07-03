from flask import Flask, render_template, request, redirect, url_for, flash, session, g, jsonify
from flask_sse import sse
import sqlite3
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Usar backend 'Agg' para entornos sin GUI
import matplotlib.pyplot as plt
from io import BytesIO
import base64
import os
import json
from datetime import datetime, timedelta
import subprocess
import re
import time
import threading
import queue
import socket
import struct
import select
import random
import signal
from datetime import datetime, timedelta
from contextlib import contextmanager

# Constantes para el ping personalizado
ICMP_ECHO_REQUEST = 8
DEFAULT_TIMEOUT = 10  # segundos
DEFAULT_COUNT = 1

class TimeoutError(Exception):
    pass

@contextmanager
def timeout(seconds):
    def signal_handler(signum, frame):
        raise TimeoutError("Tiempo de espera agotado")
    
    signal.signal(signal.SIGALRM, signal_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)

def checksum(source_string):
    """
    Calcula el checksum de la cabecera ICMP
    """
    sum = 0
    count_to = (len(source_string) // 2) * 2
    count = 0
    while count < count_to:
        this_val = source_string[count + 1] * 256 + source_string[count]
        sum = sum + this_val
        sum = sum & 0xffffffff
        count = count + 2

    if count_to < len(source_string):
        sum = sum + source_string[-1]
        sum = sum & 0xffffffff

    sum = (sum >> 16) + (sum & 0xffff)
    sum = sum + (sum >> 16)
    answer = ~sum
    answer = answer & 0xffff
    answer = answer >> 8 | (answer << 8 & 0xff00)
    return answer

def ping(host, timeout=10):
    """
    Envía un ping a la dirección IP especificada usando el comando del sistema.
    Devuelve una tupla (latencia_ms, error_type).
    """
    # Comando para Linux/Unix con formato más detallado para facilitar el parsing
    cmd = ['ping', '-c', '1', '-W', str(timeout), '-v', str(host)]
    
    try:
        # Ejecutar el comando ping
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Esperar a que termine el comando con un timeout ligeramente mayor
        try:
            stdout, stderr = process.communicate(timeout=timeout + 2)
            output = stdout + stderr
            
            # Debug: Mostrar la salida completa para diagnóstico
            print(f"[ping] Salida del comando ping para {host}:")
            print(output[:500])  # Mostrar los primeros 500 caracteres para diagnóstico
            
            # Verificar el código de salida
            if process.returncode == 0:
                # Intentar diferentes patrones para extraer la latencia
                patterns = [
                    r'time=([\d.]+)\s*ms',  # Formato estándar
                    r'time[<>=]([\d.]+)\s*ms',  # Algunas versiones usan time<X>ms
                    r'([\d.]+)\s*ms\s*$'  # Último número antes de ms al final de la línea
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, output, re.MULTILINE)
                    if match:
                        try:
                            latency = float(match.group(1))
                            return latency, None
                        except (ValueError, IndexError) as e:
                            print(f"[ping] Error al convertir la latencia: {e}")
                            continue
                
                # Si llegamos aquí, no se pudo extraer la latencia
                print(f"[ping] No se pudo extraer la latencia de la salida")
                return None, 'invalid_output'
                
            else:
                # Analizar el error
                output_lower = output.lower()
                if '100% packet loss' in output_lower:
                    print(f"[ping] Timeout o pérdida de paquetes al hacer ping a {host}")
                    return None, 'timeout'
                elif 'name or service not known' in output_lower:
                    print(f"[ping] No se pudo resolver el nombre de host: {host}")
                    return None, 'dns_error'
                elif 'network is unreachable' in output_lower:
                    print(f"[ping] Red inalcanzable: {host}")
                    return None, 'network_unreachable'
                elif 'permission denied' in output_lower:
                    print("[ping] Error de permisos: Se necesitan privilegios de superusuario")
                    return None, 'permission_denied'
                else:
                    print(f"[ping] Error en el comando ping (código {process.returncode}): {output[:500]}...")
                    return None, 'ping_error'
                    
        except subprocess.TimeoutExpired:
            process.kill()
            return None, 'timeout'
            
    except FileNotFoundError:
        print("[ping] Comando 'ping' no encontrado")
        return None, 'command_not_found'
    except Exception as e:
        print(f"[ping] Error inesperado: {str(e)}")
        return None, 'error'

app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_segura_y_unica_para_sesiones_2024'  # Clave secreta para sesiones

# Inicializar SSE
app.config['REDIS_URL'] = "redis://localhost"
app.register_blueprint(sse, url_prefix='/stream')

# Variables globales para monitoreo
monitoring_threads = {}
monitoring_events = {}

# Variable global para caché de datos de ping
# Función para validar IP
def is_valid_ip(ip):
    try:
        socket.inet_aton(ip)
        return True
    except socket.error:
        return False

class PingCache:
    def __init__(self):
        self.data = {}
        self.lock = threading.RLock()  # Usar RLock para permitir anidamiento seguro
        self.max_samples = 100  # Número máximo de muestras a mantener por IP
        
    def _initialize_ip_data(self, ip):
        """Inicializa la estructura de datos para una IP si no existe."""
        with self.lock:
            if ip not in self.data or not isinstance(self.data[ip], dict):
                self.data[ip] = {
                    'latencies': [],
                    'loss': 100.0,
                    'last_update': None,
                    'stats': {
                        'total_pings': 0,
                        'successful_pings': 0,
                        'failed_pings': 0,
                        'min_latency': None,
                        'max_latency': None,
                        'avg_latency': None,
                        'loss_percentage': 0.0
                    }
                }
            # Asegurarse de que todos los campos necesarios existen
            if 'stats' not in self.data[ip]:
                self.data[ip]['stats'] = {}
            
            # Inicializar todos los campos necesarios
            stats = self.data[ip]['stats']
            stats.setdefault('total_pings', 0)
            stats.setdefault('successful_pings', 0)
            stats.setdefault('failed_pings', 0)
            stats.setdefault('min_latency', None)
            stats.setdefault('max_latency', None)
            stats.setdefault('avg_latency', None)
            stats.setdefault('loss_percentage', 0.0)
            
            self.data[ip].setdefault('latencies', [])
            self.data[ip].setdefault('loss', 100.0)
            self.data[ip].setdefault('last_update', None)

    def _get_or_create_ip_data(self, ip):
        """Obtiene los datos de una IP, inicializándolos si es necesario."""
        if ip not in self.data:
            self._initialize_ip_data(ip)
        return self.data[ip]
        
    def update(self, ip, latency, packet_loss):
        """Actualiza los datos de ping para una IP específica."""
        if not is_valid_ip(ip):
            print(f"[PingCache] IP inválida: {ip}")
            return False
            
        with self.lock:
            try:
                # Asegurarse de que los datos estén inicializados
                self._initialize_ip_data(ip)
                ip_data = self.data[ip]
                stats = ip_data['stats']
                
                # Inicializar contadores si no existen
                if 'successful_pings' not in stats:
                    stats['successful_pings'] = 0
                if 'failed_pings' not in stats:
                    stats['failed_pings'] = 0
                if 'total_pings' not in stats:
                    stats['total_pings'] = 0
                
                # Determinar si el ping fue exitoso o no
                is_success = latency is not None and latency > 0
                
                # Actualizar contadores basados en si el ping fue exitoso o no
                if is_success:  # Ping exitoso
                    # Añadir latencia a la lista
                    ip_data['latencies'].append(latency)
                    
                    # Actualizar estadísticas de latencia
                    if stats['min_latency'] is None or latency < stats['min_latency']:
                        stats['min_latency'] = latency
                    if stats['max_latency'] is None or latency > stats['max_latency']:
                        stats['max_latency'] = latency
                        
                    # Calcular promedio de latencia
                    if ip_data['latencies']:
                        stats['avg_latency'] = sum(ip_data['latencies']) / len(ip_data['latencies'])
                
                # Actualizar contadores de éxito/fracaso
                if is_success:
                    stats['successful_pings'] += 1
                else:
                    stats['failed_pings'] += 1
                
                # Asegurarse de que los contadores no sean negativos
                stats['successful_pings'] = max(0, stats['successful_pings'])
                stats['failed_pings'] = max(0, stats['failed_pings'])
                
                # Actualizar contador total de pings (suma de exitosos y fallidos)
                stats['total_pings'] = stats['successful_pings'] + stats['failed_pings']
                
                # Calcular porcentaje de pérdida
                if stats['total_pings'] > 0:
                    loss_percentage = (stats['failed_pings'] / stats['total_pings']) * 100
                    ip_data['loss'] = min(100.0, max(0.0, loss_percentage))
                    stats['loss_percentage'] = ip_data['loss']
                else:
                    ip_data['loss'] = 100.0
                    stats['loss_percentage'] = 100.0
                
                # Actualizar timestamp
                ip_data['last_update'] = datetime.now()
                
                # Limitar el tamaño de la lista de latencias
                if len(ip_data['latencies']) > self.max_samples:
                    ip_data['latencies'] = ip_data['latencies'][-self.max_samples:]
                
                # Debug: Mostrar estado actual de los contadores
                print(f"[PingCache] Update - IP: {ip}, Éxitos: {stats['successful_pings']}, Fallos: {stats['failed_pings']}, Total: {stats['total_pings']}, Pérdida: {ip_data['loss']:.2f}%")
                
                return True
                
            except Exception as e:
                print(f"[PingCache] Error al actualizar datos para {ip}: {str(e)}")
                import traceback
                traceback.print_exc()
                # En caso de error, intentar reinicializar los datos
                try:
                    self._initialize_ip_data(ip)
                except Exception as e2:
                    print(f"[PingCache] Error al reinicializar datos: {str(e2)}")
                return False

    def get_data(self, ip):
        """Obtiene los datos de ping para una IP específica."""
        if not is_valid_ip(ip):
            print(f"[PingCache] Intento de obtener datos con IP inválida: {ip}")
            return {
                'latencies': [],
                'loss': 100,
                'valid': False,
                'error': 'IP inválida',
                'stats': {
                    'total_pings': 0,
                    'successful_pings': 0,
                    'failed_pings': 0,
                    'min_latency': None,
                    'max_latency': None,
                    'avg_latency': None
                }
            }
            
        with self.lock:
            try:
                # Asegurarse de que los datos estén inicializados
                if ip not in self.data or 'stats' not in self.data.get(ip, {}):
                    return {
                        'latencies': [],
                        'loss': 100,
                        'valid': False,
                        'message': 'No hay datos disponibles para esta IP',
                        'stats': {
                            'total_pings': 0,
                            'successful_pings': 0,
                            'failed_pings': 0,
                            'min_latency': None,
                            'max_latency': None,
                            'avg_latency': None
                        }
                    }
                
                # Hacer una copia profunda para evitar problemas de concurrencia
                import copy
                ip_data = copy.deepcopy(self.data[ip])
                
                # Asegurar que los campos requeridos existan
                ip_data.setdefault('latencies', [])
                ip_data.setdefault('loss', 100)
                ip_data.setdefault('valid', True)
                ip_data.setdefault('stats', {})
                
                # Inicializar estadísticas si no existen
                stats = ip_data['stats']
                stats.setdefault('total_pings', 0)
                stats.setdefault('successful_pings', 0)
                stats.setdefault('failed_pings', 0)
                
                # Calcular estadísticas de latencia si hay datos
                if ip_data['latencies']:
                    stats['min_latency'] = min(ip_data['latencies'])
                    stats['max_latency'] = max(ip_data['latencies'])
                    stats['avg_latency'] = sum(ip_data['latencies']) / len(ip_data['latencies'])
                else:
                    stats['min_latency'] = None
                    stats['max_latency'] = None
                    stats['avg_latency'] = None
                
                # Preparar el resultado final
                result = {
                    'latencies': ip_data['latencies'].copy(),
                    'loss': ip_data['loss'],
                    'last_update': ip_data.get('last_update'),
                    'valid': ip_data['valid'],
                    'stats': stats.copy()
                }
                
                return result
                
            except Exception as e:
                print(f"[PingCache] Error al obtener datos para {ip}: {str(e)}")
                import traceback
                traceback.print_exc()
                return {
                    'latencies': [],
                    'loss': 100,
                    'valid': False,
                    'error': f'Error al obtener datos: {str(e)}',
                    'stats': {
                        'total_pings': 0,
                        'successful_pings': 0,
                        'failed_pings': 0,
                        'min_latency': None,
                        'max_latency': None,
                        'avg_latency': None
                    }
                }

ping_cache = PingCache()

def init_db():
    """Inicializa la base de datos y agrega columnas si es necesario."""
    db_exists = os.path.exists('tickets.db')
    conn = sqlite3.connect('tickets.db')
    c = conn.cursor()

    # Crear tablas
    c.execute('''CREATE TABLE IF NOT EXISTS tickets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_number INTEGER UNIQUE,
                    creation_date TEXT,
                    agent TEXT,
                    status TEXT,
                    collaborators TEXT,
                    first_response TEXT,
                    sla_resolution TEXT,
                    close_date TEXT,
                    delay TEXT,
                    user TEXT,
                    details TEXT,
                    priority TEXT,
                    type TEXT,
                    branch TEXT
                )''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS branches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    )''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch TEXT NOT NULL UNIQUE,
            branch_code TEXT NOT NULL,
            dyndns TEXT,
            primary_service_provider TEXT,
            primary_service_ip TEXT,
            primary_service_speed TEXT,
            secondary_service_provider TEXT,
            secondary_service_ip TEXT,
            secondary_service_speed TEXT
        )
    ''')

    # Insertar sucursales por defecto
    default_branches = sorted(['Casa Central', 'Sucursal Norte', 'Sucursal Sur'])
    for branch in default_branches:
        c.execute('INSERT OR IGNORE INTO branches (name) VALUES (?)', (branch,))

    conn.commit()
    conn.close()


@app.route('/edit_server/<int:server_id>', methods=['GET', 'POST'])
def edit_server(server_id):
    conn = get_db()
    c = conn.cursor()

    # Verificar si el servidor existe antes de intentar editarlo
    c.execute("SELECT * FROM servers WHERE id = ?", (server_id,))
    original_server = c.fetchone()
    
    if not original_server:
        flash('El servidor no existe.', 'error')
        return redirect(url_for('index'))  # Redirigir a la página principal

    # Convertir a diccionario
    columns = [column[0] for column in c.description]
    original_server_dict = dict(zip(columns, original_server))

    if request.method == 'POST':
        # Obtener los datos del formulario
        branch = request.form['branch']
        branch_code = request.form['branch_code']
        dyndns = request.form['dyndns']
        primary_service_provider = request.form['primary_service_provider']
        primary_service_ip = request.form['primary_service_ip']
        primary_service_speed = request.form['primary_service_speed']
        secondary_service_provider = request.form['secondary_service_provider']
        secondary_service_ip = request.form['secondary_service_ip']
        secondary_service_speed = request.form['secondary_service_speed']

        # Actualizar servidor
        c.execute('''UPDATE servers 
                     SET branch=?, branch_code=?, dyndns=?, primary_service_provider=?, primary_service_ip=?, 
                         primary_service_speed=?, secondary_service_provider=?, secondary_service_ip=?, 
                         secondary_service_speed=?
                     WHERE id=?''', 
                  (branch, branch_code, dyndns, primary_service_provider, primary_service_ip, 
                   primary_service_speed, secondary_service_provider, secondary_service_ip, 
                   secondary_service_speed, server_id))
        
        conn.commit()
        flash('Servidor actualizado exitosamente.', 'success')
        return redirect(url_for('index'))  # Redirigir a la página principal

    # Renderizar formulario de edición
    return render_template('edit_server.html', server=original_server_dict)


@app.route('/delete_server/<int:server_id>', methods=['POST'])
def delete_server(server_id):
    conn = get_db()
    c = conn.cursor()
    
    try:
        # Eliminar el servidor
        c.execute("DELETE FROM servers WHERE id = ?", (server_id,))
        conn.commit()
        flash('Servidor eliminado exitosamente.', 'success')
    except Exception as e:
        conn.rollback()
        flash(f'Error al eliminar el servidor: {str(e)}', 'error')
    finally:
        conn.close()
    
    return redirect(url_for('server_status'))  # Redirigir a la página de estados de servidores


@app.route('/server_status')
def server_status():
    # Obtener lista de servidores
    servers = get_servers()
    return render_template('server_status.html', servers=servers)

def get_servers():
    """Obtiene la lista de servidores de la base de datos."""
    conn = get_db()  # Conectar a la base de datos
    c = conn.cursor()
    
    # Obtener los datos de los servidores
    c.execute("SELECT * FROM servers")
    servers = [dict(zip([column[0] for column in c.description], row)) for row in c.fetchall()]
    
    conn.close()  # Cerrar la conexión
    return servers  # Devolver la lista de servidores

def get_db():
    """Conecta a la base de datos SQLite (usando el contexto de la aplicación)."""
    if 'db' not in g:
        g.db = sqlite3.connect('tickets.db')
    return g.db

@app.teardown_appcontext
def close_db(exception):
    """Cierra la conexión a la base de datos al final del ciclo de vida de la app."""
    db = g.pop('db', None)
    if db is not None:
        db.close()


@app.template_filter('collaborator_class')
def collaborator_class_filter(collaborator):
    collaborator_colors = {
        'ztech soporte técnico': 'ztech-soporte',
        'ulariaga braian': 'ulariaga-braian',
        'sommiercenter guillermo rodriguez': 'rodriguez-guillermo',
        'sin agente': 'sin-agente',
        'sommiercenter juan billiot': 'billiot-juan',
        'machado gabriel': 'machado-gabriel',
        'phicoms soporte técnico': 'phicoms',
        'fabre camila': 'fabre-camila',
        'sommiercenter claudio marini': 'marini-claudio',
        'sommiercenter leandro rognoni': 'rognoni-leandro',
        'sommiercenter nicolas macia': 'macia-nicolas',
        'sommiercenter david gonzalez': 'gonzalez-david',
        'sommiercenter omar merodio': 'merodio-omar' 
    }
    if collaborator:
        normalized_collaborator = (
            collaborator.lower()
            .replace('|', '')
            .replace(',', '')
            .replace('  ', ' ')
            .strip()
        )
        return collaborator_colors.get(normalized_collaborator, 'collaborator-default')
    return 'collaborator-default'


# Filtro de colores para agentes
@app.template_filter('agent_class')
def agent_class_filter(agent):
    agent_colors = {
        'ztech soporte técnico': 'ztech-soporte',
        'ulariaga braian': 'ulariaga-braian',
        'sommiercenter guillermo rodriguez': 'rodriguez-guillermo',
        'sin agente': 'sin-agente',
        'sommiercenter juan billiot': 'billiot-juan',
        'machado gabriel': 'machado-gabriel',
        'phicoms soporte técnico': 'phicoms',
        'fabre camila': 'fabre-camila',
        'sommiercenter claudio marini': 'marini-claudio',
        'sommiercenter leandro rognoni': 'rognoni-leandro',
        'sommiercenter nicolas macia': 'macia-nicolas',
        'sommiercenter david gonzalez': 'gonzalez-david',
        'sommiercenter omar merodio': 'merodio-omar'  # Nuevo agente
    }
    if agent:
        normalized_agent = (
            agent.lower()
            .replace('|', '')  # Elimina '|'
            .replace(',', '')  # Elimina comas
            .replace('  ', ' ')  # Reemplaza dobles espacios
            .strip()  # Elimina espacios en blanco
        )
        return agent_colors.get(normalized_agent, 'agent-default')
    return 'agent-default'

# Función para obtener color de agente
def get_agent_color(agent):
    # Colores predefinidos para agentes
    agent_colors = {
        'Omar Merodio': '#4A90E2',  # Azul claro
        'Juan Billiot': '#2ECC71',  # Verde
        'Admin': '#9B59B6',         # Púrpura
        'Soporte': '#F39C12',       # Naranja
        # Añade más agentes según sea necesario
    }
    
    # Devolver color predefinido o un color aleatorio si no está en el diccionario
    return agent_colors.get(agent, f'#{hash(agent) % 0xFFFFFF:06x}')

# Filtro de clases para fechas
@app.template_filter('date_class')
def date_class_filter(date_str):
    months = {
        1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
        5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
        9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'
    }
    month_number = None
    try:
        # Intentar parsear la fecha en diferentes formatos
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y"):
            try:
                date_obj = datetime.strptime(date_str, fmt)
                month_number = date_obj.month
                break
            except ValueError:
                continue
    except Exception:
        pass

    if month_number:
        month_name = months.get(month_number, 'default')
        return f"date-{month_name} date-{month_number:02d}"
    else:
        return "date-default date-00"

@app.template_filter('average')
def average_filter(lst):
    """Calcula el promedio de una lista de números."""
    try:
        return sum(lst) / len(lst) if lst else 0
    except (TypeError, ZeroDivisionError):
        return 0

@app.route('/')
def index():
    conn = get_db()
    c = conn.cursor()

    # Obtener todos los estados únicos
    c.execute("SELECT DISTINCT status FROM tickets")
    statuses = [row[0] for row in c.fetchall()]

    # Contar tickets por estado
    tickets_by_status = {}
    total_tickets = 0
    for status in statuses:
        c.execute("SELECT COUNT(*) FROM tickets WHERE status = ?", (status,))
        count = c.fetchone()[0]
        tickets_by_status[status] = count
        total_tickets += count

    # Obtener contadores específicos directamente
    closed_tickets = tickets_by_status.get('Cerrado', 0)
    open_tickets_count = tickets_by_status.get('Abierto', 0)
    derived_tickets = tickets_by_status.get('Derivado', 0)
    pending_tickets = tickets_by_status.get('Pendiente', 0)

    print("\n--- VERIFICACIÓN DE CONSISTENCIA ---")
    print(f"Total tickets: {total_tickets}")
    print(f"Cerrados: {closed_tickets}")
    print(f"Abiertos: {open_tickets_count}")
    print(f"Derivados: {derived_tickets}")
    print(f"Pendientes: {pending_tickets}")
    print("--- FIN DE VERIFICACIÓN ---\n")

    # Formatear datos para el gráfico "Tickets por Estado"
    tickets_by_status_data = {
        "labels": list(tickets_by_status.keys()),
        "values": list(tickets_by_status.values())
    }

    # Últimos tickets creados
    c.execute("SELECT id, ticket_number, creation_date, agent, status FROM tickets ORDER BY creation_date DESC LIMIT 5")
    recent_tickets = c.fetchall()

    # Obtener los últimos tickets abiertos
    c.execute("SELECT id, ticket_number, creation_date, agent, status FROM tickets WHERE status = 'Abierto' ORDER BY creation_date DESC LIMIT 5")
    open_tickets = c.fetchall()

    # % SLA Excedidos en los últimos 4 meses (ahora sobre todos los tickets)
    c.execute("""
        SELECT 
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN sla_resolution = 'Excedido' THEN 1 END) as excedidos,
            ROUND((COUNT(CASE WHEN sla_resolution = 'Excedido' THEN 1 END) * 100.0 / COUNT(*)), 2) AS percent_exceeded
        FROM tickets
    """)
    sla_exceeded_summary = c.fetchone()

    print("\n--- VERIFICACIÓN DE SLA ---")
    print(f"Total de tickets: {sla_exceeded_summary[0]}")
    print(f"Tickets con SLA Excedido: {sla_exceeded_summary[1]}")
    print(f"Porcentaje de SLA Excedido: {sla_exceeded_summary[2]}%")
    print("--- FIN DE VERIFICACIÓN ---\n")

    # Validar datos para "% SLA Excedidos"
    sla_exceeded_data = {
        "labels": ["Total"],
        "values": [float(sla_exceeded_summary[2]) if sla_exceeded_summary[2] is not None else 0.0]
    }
    print("\n--- DEBUG SLA EXCEEDED DATA ---")
    print(f"SLA Exceeded Data: {sla_exceeded_data}")
    print(f"SLA Exceeded Summary: {sla_exceeded_summary}")
    print("--- END DEBUG ---\n")

    # % SLA Excedido por Agente (Último Mes)
    c.execute("""
        SELECT agent, 
               ROUND((SUM(CASE WHEN sla_resolution = 'Excedido' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) AS percent_exceeded
        FROM tickets
        WHERE creation_date >= date('now', '-1 month')
        GROUP BY agent
    """)
    agent_exceeded_summary = c.fetchall()

    # Validar datos para "% SLA Excedido por Agente"
    agent_exceeded_data = {
        "labels": [row[0] if row[0] else "Desconocido" for row in agent_exceeded_summary],
        "values": [row[1] if row[1] is not None else 0 for row in agent_exceeded_summary]
    }

    
    # NUEVA SECCIÓN: Obtener servidores
    c.execute("SELECT id, branch, branch_code, dyndns, primary_service_provider, primary_service_ip, primary_service_speed, secondary_service_provider, secondary_service_ip, secondary_service_speed FROM servers")
    servers = [dict(zip([column[0] for column in c.description], row)) for row in c.fetchall()]

    conn.close()

    # Fecha y hora actual
    current_datetime = datetime.now().strftime("%d/%m/%Y")
    return render_template(
        'index.html',
        tickets_by_status=tickets_by_status.items(),
        recent_tickets=recent_tickets,
        open_tickets=open_tickets,
        total_tickets=total_tickets,
        closed_tickets=closed_tickets if closed_tickets else 0,
        derived_tickets=derived_tickets if derived_tickets else 0,
        pending_tickets=pending_tickets if pending_tickets else 0,
        open_tickets_count=open_tickets_count if open_tickets_count else 0,
        current_datetime=current_datetime,
        tickets_by_status_json=json.dumps(tickets_by_status_data),  # Gráfico "Tickets por Estado"
        sla_exceeded_json=json.dumps(sla_exceeded_data),      # Gráfico "% SLA Excedidos"
        agent_exceeded_json=json.dumps(agent_exceeded_data),   # Gráfico "% SLA Excedido por Agente"
        servers=servers  # NUEVO PARÁMETRO para servidores
    )

@app.route('/tickets')
def show_tickets():
    page = int(request.args.get('page', 1))
    tickets_per_page = 50       
    conn = get_db()
    c = conn.cursor()

    # Guardar el número de página actual en la sesión
    session['current_tickets_page'] = page

    # Calcular los tickets y la paginación
    c.execute("SELECT COUNT(*) FROM tickets")
    total_tickets = c.fetchone()[0]
    total_pages = (total_tickets + tickets_per_page - 1) // tickets_per_page

    offset = (page - 1) * tickets_per_page
    c.execute("""
        SELECT 
            id, 
            ticket_number, 
            creation_date, 
            agent, 
            status, 
            collaborators, 
            first_response, 
            sla_resolution, 
            close_date,
            COALESCE(delay, '0 días') as delay,
            user,
            details,
            priority,
            type,
            branch
        FROM tickets 
        ORDER BY ticket_number DESC 
        LIMIT ? OFFSET ?
    """, (tickets_per_page, offset))
    tickets = c.fetchall()
    conn.close()

    return render_template(
        'tickets.html',
        tickets=tickets,
        page=page,
        total_pages=total_pages,
        max=max,
        min=min
    )

@app.route('/search_tickets', methods=['GET'])
def search_tickets():
    query = request.args.get('query', '').lower()
    conn = get_db()
    c = conn.cursor()

    # Dividir la consulta en palabras
    words = query.split()

    # Construir la cláusula WHERE
    where_clauses = []
    params = []
    for word in words:
        # Para cada palabra, agregamos una condición a la cláusula WHERE
        where_clauses.append("LOWER(ticket_number) LIKE ? OR LOWER(agent) LIKE ? OR LOWER(status) LIKE ? OR LOWER(user) LIKE ? OR LOWER(details) LIKE ? OR LOWER(branch) LIKE ?")
        params.extend([f'%{word}%', f'%{word}%', f'%{word}%', f'%{word}%', f'%{word}%', f'%{word}%'])

    # Unir las cláusulas WHERE con 'OR'
    where_sql = ' OR '.join(where_clauses)

    # Ejecutar la consulta
    c.execute(f"SELECT * FROM tickets WHERE {where_sql}", params)
    results = c.fetchall()
    conn.close()

    # Enviar max y min al contexto para evitar errores de Jinja2
    return render_template(
        'tickets.html',
        tickets=results,
        page=1,
        total_pages=1,
        max=max,  # Pasar max al contexto
        min=min   # Pasar min al contexto
    )

@app.route('/new_ticket', methods=['GET', 'POST'])
def new_ticket():
    conn = get_db()
    c = conn.cursor()

    # Obtener sucursales existentes
    c.execute('SELECT name FROM branches ORDER BY name ASC')
    branches = [row[0] for row in c.fetchall()]

    if request.method == 'POST':
        # Manejar nueva sucursal
        branch = request.form.get('branch')
        if branch == 'new':
            new_branch = request.form.get('new_branch')
            if new_branch:
                # Insertar nueva sucursal
                c.execute('INSERT OR IGNORE INTO branches (name) VALUES (?)', (new_branch,))
                branch = new_branch
        elif branch == '':
            # Si está explícitamente en blanco, usar None
            branch = None
        
        # Si branch sigue siendo None, intentar obtener el valor original
        if branch is None:
            # Usar el valor original solo si es un valor no vacío
            branch = None

        # Resto de la lógica de creación de ticket
        ticket_number = int(request.form['ticket_number'])
        creation_date = request.form['creation_date']
        agent = request.form['agent']
        status = request.form['status']
        collaborators = request.form['collaborators']
        first_response = request.form['first_response']
        sla_resolution = request.form['sla_resolution']
        close_date = request.form.get('close_date', '')
        user = request.form.get('user', '')
        details = request.form['details']
        priority = request.form.get('priority')
        type_ = request.form.get('type')

        if creation_date and close_date:
            try:
                creation = datetime.strptime(creation_date, "%d/%m/%Y")
                close = datetime.strptime(close_date, "%d/%m/%Y")
                delay = f"{(close - creation).days} días"
            except ValueError:
                try:
                    creation = datetime.strptime(creation_date, "%Y-%m-%d")
                    close = datetime.strptime(close_date, "%Y-%m-%d")
                    delay = f"{(close - creation).days} días"
                except ValueError:
                    delay = '0 días'
        else:
            delay = '0 días'

        try:
            c.execute('''INSERT INTO tickets (ticket_number, creation_date, agent, status, collaborators, 
                        first_response, sla_resolution, close_date, delay, user, details, priority, type, branch)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (ticket_number, creation_date, agent, status, collaborators, 
                    first_response, sla_resolution, close_date, delay, user, details, priority, type_, branch))
            conn.commit()
            conn.close()
            flash('Ticket agregado exitosamente.', 'success')
            return redirect(url_for('show_tickets'))
        except sqlite3.IntegrityError:
            flash('El número de ticket ya existe. Por favor, usa uno diferente.', 'error')
            return redirect(url_for('new_ticket'))
        except Exception as e:
            flash(f'Error al agregar el ticket: {e}', 'error')
            return redirect(url_for('new_ticket'))

    return render_template('new_ticket.html', 
                           branches=branches)

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        file = request.files.get('file')
        if file and file.filename.endswith(('.xlsx', '.xls')):
            try:
                data = pd.read_excel(file)
                conn = get_db()
                c = conn.cursor()

                for _, row in data.iterrows():
                    ticket_number = row.get('Ticket')
                    creation_date = row.get('Fecha de creacion')
                    agent = row.get('Agente')
                    status = row.get('Estado')
                    collaborators = row.get('Colaboradores')
                    first_response = row.get('Primera Respuesta')
                    sla_resolution = row.get('SLA de resolucion')
                    close_date = row.get('Fecha de cierre')
                    if close_date and creation_date:
                        try:
                            creation = datetime.strptime(str(creation_date), "%d/%m/%Y")
                            close = datetime.strptime(str(close_date), "%d/%m/%Y")
                            delay = f"{(close - creation).days} días"
                        except ValueError:
                            delay = row.get('Demora', '0 días')
                    else:
                        delay = '0 días'
                    user = row.get('Usuario')
                    details = row.get('Detalle del billete', '')
                    branch = row.get('Sucursal', '')

                    c.execute("SELECT 1 FROM tickets WHERE ticket_number = ?", (ticket_number,))
                    if not c.fetchone():
                        c.execute('''
                            INSERT INTO tickets (ticket_number, creation_date, agent, status, collaborators, 
                            first_response, sla_resolution, close_date, delay, user, details, branch)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                            (ticket_number, creation_date, agent, status, collaborators, 
                             first_response, sla_resolution, close_date, delay, user, details, branch))
                conn.commit()
                conn.close()
                flash('Archivo cargado exitosamente.', 'success')
                return redirect(url_for('show_tickets'))
            except Exception as e:
                flash(f'Error al procesar el archivo: {e}', 'error')
    return render_template('upload.html')

@app.route('/kanban')
def kanban():
    selected_status = request.args.get('status', None)
    conn = get_db()
    c = conn.cursor()

    # Obtener todos los estados únicos, excluyendo None
    c.execute("SELECT DISTINCT status FROM tickets WHERE status IS NOT NULL")
    statuses = [row[0] for row in c.fetchall()]

    # Obtener tickets agrupados por estado
    tickets_by_status = {status: [] for status in statuses}
    for status in statuses:
        if selected_status and status != selected_status:
            continue
        c.execute("SELECT * FROM tickets WHERE status = ?", (status,))
        tickets = c.fetchall()
        tickets_by_status[status] = tickets

    conn.close()
    return render_template('kanban.html', statuses=statuses, tickets=tickets_by_status, selected_status=selected_status)

@app.route('/generate_report', methods=['GET', 'POST'])
def generate_report():
    db = get_db()
    cursor = db.cursor()
    
    # Obtener parámetros del formulario
    estado = request.form.get('estado', 'Todos')
    mes = request.form.get('mes', 'Todos')
    agente = request.form.get('agente', 'Todos')
    first_response = request.form.get('first_response', 'Todos')
    sla_resolution = request.form.get('sla_resolution', 'Todos')
    reporte = request.form.get('reporte', 'estados')  # Tipo de reporte por defecto

    # Construir consulta base
    query = """
    SELECT * FROM tickets 
    WHERE 1=1
    """
    params = []

    # Filtros
    if estado != 'Todos':
        query += " AND status = ?"
        params.append(estado)
    
    if mes != 'Todos':
        query += " AND strftime('%m', creation_date) = ?"
        params.append(mes)
    
    if agente != 'Todos':
        query += " AND agent = ?"
        params.append(agente)
    
    if first_response != 'Todos':
        query += " AND first_response = ?"
        params.append(first_response)
    
    if sla_resolution != 'Todos':
        query += " AND sla_resolution = ?"
        params.append(sla_resolution)

    # Ejecutar consulta
    cursor.execute(query, params)
    tickets = cursor.fetchall()

    # Definir estados y agentes
    estados_query = "SELECT DISTINCT status FROM tickets ORDER BY status"
    cursor.execute(estados_query)
    estados = [row[0] for row in cursor.fetchall()]
    
    agentes_query = "SELECT DISTINCT agent FROM tickets WHERE agent IS NOT NULL AND agent != '' ORDER BY agent"
    cursor.execute(agentes_query)
    agentes = [row[0] for row in cursor.fetchall()]

    plt.figure(figsize=(12, 8))

    # Generar gráficos según el tipo de reporte
    if reporte == 'rendimiento_agente':
        # Calcular métricas de rendimiento por agente
        rendimiento_agentes = {}
        for ticket in tickets:
            agent = ticket[2]  # Columna de agente
            if agent not in rendimiento_agentes:
                rendimiento_agentes[agent] = {
                    'total_tickets': 0,
                    'tickets_cerrados': 0,
                    'tiempo_promedio_resolucion': []
                }
            
            rendimiento_agentes[agent]['total_tickets'] += 1
            
            if ticket[3] == 'Cerrado':
                rendimiento_agentes[agent]['tickets_cerrados'] += 1

        # Graficar rendimiento por agente
        agentes_nombres = list(rendimiento_agentes.keys())
        total_tickets = [rendimiento_agentes[a]['total_tickets'] for a in agentes_nombres]
        tickets_cerrados = [rendimiento_agentes[a]['tickets_cerrados'] for a in agentes_nombres]

        x = range(len(agentes_nombres))
        plt.bar(x, total_tickets, label='Total Tickets', color='#47adcc', alpha=0.7)
        plt.bar(x, tickets_cerrados, label='Tickets Cerrados', color='#2e8b57', alpha=0.7)
        plt.xlabel('Agente')
        plt.ylabel('Número de Tickets')
        plt.title('Rendimiento por Agente')
        plt.xticks(x, agentes_nombres, rotation=45)
        plt.legend()

    elif reporte == 'tiempo_resolucion':
        # Calcular tiempo de resolución
        tiempos_resolucion = []
        for ticket in tickets:
            if ticket[3] == 'Cerrado':
                # Calcular tiempo de resolución en días
                creation_date = datetime.strptime(ticket[4], '%Y-%m-%d %H:%M:%S')
                close_date = datetime.strptime(ticket[5], '%Y-%m-%d %H:%M:%S')
                tiempo = (close_date - creation_date).total_seconds() / (24 * 3600)
                tiempos_resolucion.append(tiempo)

        plt.hist(tiempos_resolucion, bins=20, color='#47adcc', edgecolor='black')
        plt.xlabel('Días para Resolución')
        plt.ylabel('Número de Tickets')
        plt.title('Distribución de Tiempo de Resolución')

    else:  # Por defecto, tickets por estado
        estado_counts = {}
        for ticket in tickets:
            estado = ticket[3]  # Columna de estado
            if estado not in estado_counts:
                estado_counts[estado] = 0
            estado_counts[estado] += 1

        estados_grafico = list(estado_counts.keys())
        counts = list(estado_counts.values())

        plt.bar(estados_grafico, counts, color='#47adcc', edgecolor='black')
        plt.xlabel('Estado')
        plt.ylabel('Número de Tickets')
        plt.title('Distribución de Tickets por Estado')
        plt.xticks(rotation=45, ha='right')
        
        # Añadir valores en la parte superior de cada barra
        for i, v in enumerate(counts):
            plt.text(i, v, str(v), ha='center', va='bottom')

    plt.tight_layout()

    # Guardar gráfico
    buffer = BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    plot_url = base64.b64encode(buffer.getvalue()).decode('utf-8')
    plt.close()

    return render_template('informes.html', 
                           estados=estados,
                           agentes=agentes,
                           tickets=tickets,
                           plot_url=plot_url)

@app.route('/edit_ticket/<int:ticket_id>', methods=['GET', 'POST'])
def edit_ticket(ticket_id):
    # Obtener el número de página actual de la sesión
    current_page = session.get('current_tickets_page', 1)
    source = request.args.get('source', 'tickets')  # Obtener el origen, por defecto es 'tickets'

    print(f"Source: {source}")  # Para depuración
    print(f"Current Page: {current_page}")  # Para depuración
    
    conn = get_db()
    c = conn.cursor()

    # Verificar si el ticket existe antes de intentar editarlo
    c.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    original_ticket = c.fetchone()
    
    if not original_ticket:
        flash('El ticket no existe.', 'error')
        print("Ticket no encontrado, redirigiendo a la lista de tickets.")  # Para depuración
        return redirect(url_for('show_tickets'))

    # Obtener sucursales existentes
    c.execute('SELECT name FROM branches ORDER BY name ASC')
    branches = [row[0] for row in c.fetchall()]

    if request.method == 'POST':
        try:
            # Manejar nueva sucursal
            branch = request.form.get('branch')
            if branch == 'new':
                new_branch = request.form.get('new_branch')
                if new_branch:
                    # Insertar nueva sucursal
                    c.execute('INSERT OR IGNORE INTO branches (name) VALUES (?)', (new_branch,))
                    branch = new_branch
            elif branch == '':
                # Si está explícitamente en blanco, usar None
                branch = None
            
            # Si branch sigue siendo None, intentar obtener el valor original
            if branch is None:
                branch = original_ticket[14] if len(original_ticket) > 14 and original_ticket[14] and original_ticket[14] != 'Casa Central' else None

            # Manejar nuevo usuario
            user = request.form.get('user')
            new_user = request.form.get('new_user')
            
            if user == 'new' and new_user:
                user = new_user
                # Opcional: Insertar nuevo usuario en la base de datos
                c.execute('INSERT OR IGNORE INTO users (name) VALUES (?)', (new_user,))
            elif user == '':
                user = None
            
            # Si user sigue siendo None, intentar obtener el valor original
            if user is None:
                user = original_ticket[10] if len(original_ticket) > 10 and original_ticket[10] else None

            # Campos con valores predeterminados del ticket original
            ticket_number = request.form.get('ticket_number', original_ticket[1])
            creation_date = request.form.get('creation_date', original_ticket[2])
            agent = request.form.get('agent', original_ticket[3])
            status = request.form.get('status', original_ticket[4])
            collaborators = request.form.get('collaborators', original_ticket[5])
            first_response = request.form.get('first_response', original_ticket[6])
            sla_resolution = request.form.get('sla_resolution', original_ticket[7])
            
            # Cambiar el manejo de close_date
            close_date = request.form.get('close_date')
            if close_date == '':
                close_date = None  # Permitir que quede en blanco

            details = request.form.get('details', original_ticket[11])
            priority = request.form.get('priority', original_ticket[12] if len(original_ticket) > 12 else None)
            type_ = request.form.get('type', original_ticket[13] if len(original_ticket) > 13 else None)

            # Formatear fechas
            if creation_date:
                try:
                    creation_date = datetime.strptime(creation_date, "%Y-%m-%d").strftime("%d/%m/%Y")
                except ValueError:
                    creation_date = original_ticket[2]

            if close_date:
                try:
                    close_date = datetime.strptime(close_date, "%Y-%m-%d").strftime("%d/%m/%Y")
                except ValueError:
                    close_date = original_ticket[8]

            # Cálculo de demora
            delay = original_ticket[9] if len(original_ticket) > 9 else '0 días'
            if creation_date and close_date:
                try:
                    creation = datetime.strptime(creation_date, "%d/%m/%Y")
                    close = datetime.strptime(close_date, "%d/%m/%Y")
                    delay = f"{(close - creation).days} días"
                except ValueError:
                    pass
            
            # Si no hay fecha de cierre, mantener el valor original de demora
            if not close_date:
                delay = original_ticket[9] if len(original_ticket) > 9 else '0 días'

            # Actualizar ticket
            c.execute('''UPDATE tickets 
                         SET ticket_number=?, creation_date=?, agent=?, status=?, 
                             collaborators=?, first_response=?, sla_resolution=?, 
                             close_date=?, delay=?, user=?, details=?, priority=?, type=?, branch=?
                         WHERE id=?''', 
                      (ticket_number, creation_date, 
                       agent, status, 
                       collaborators, first_response, 
                       sla_resolution, close_date, 
                       delay, 
                       user,  # Actualizar usuario
                       details, priority, type_, branch, ticket_id))
            
            conn.commit()
            flash('Ticket actualizado exitosamente.', 'success')
            print("Ticket actualizado, redirigiendo...")  # Para depuración
            
            # Redirigir a la página de origen
            if request.form.get('source') == 'kanban':
                print("Redirigiendo a Kanban...")  # Para depuración
                return redirect(url_for('kanban'))  # Redirigir a Kanban
            else:
                print("Redirigiendo a la lista de tickets...")  # Para depuración
                return redirect(url_for('show_tickets', page=current_page))  # Redirigir a la lista de tickets
        
        except Exception as e:
            conn.rollback()
            print(f"Error crítico al actualizar ticket: {e}")
            flash(f'Error al actualizar el ticket: {str(e)}', 'error')
            return redirect(url_for('edit_ticket', ticket_id=ticket_id))

    # Renderizar formulario de edición
    c.execute("SELECT DISTINCT agent FROM tickets")
    agents = [row[0] for row in c.fetchall()]

    c.execute("SELECT DISTINCT collaborators FROM tickets")
    collaborators = [row[0] for row in c.fetchall()]

    c.execute("SELECT DISTINCT first_response FROM tickets")
    first_responses = [row[0] for row in c.fetchall()]

    c.execute("SELECT DISTINCT sla_resolution FROM tickets")
    sla_resolutions = [row[0] for row in c.fetchall()]

    c.execute("SELECT name FROM users ORDER BY name ASC")
    users = [row[0] for row in c.fetchall()]

    c.execute("SELECT DISTINCT status FROM tickets")
    statuses = [row[0] for row in c.fetchall()]

    # Formatear fecha de creación
    creation_date = ''
    if original_ticket[2]:
        try:
            creation_date = datetime.strptime(original_ticket[2], "%d/%m/%Y").strftime("%Y-%m-%d")
        except ValueError:
            creation_date = original_ticket[2]

    # Formatear fecha de cierre
    close_date = ''
    if original_ticket[8]:
        try:
            close_date = datetime.strptime(original_ticket[8], "%d/%m/%Y").strftime("%Y-%m-%d")
        except ValueError:
            close_date = original_ticket[8]

    conn.close()

    return render_template('edit_ticket.html', 
                           ticket=original_ticket, 
                           branches=branches,
                           agents=agents,
                           collaborators=collaborators,
                           first_responses=first_responses,
                           sla_resolutions=sla_resolutions,
                           users=users,
                           statuses=statuses,
                           creation_date=creation_date,
                           close_date=close_date)

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    db = get_db()
    cursor = db.cursor()
    
    # Inicializar variables
    ticket_info = None
    error_message = None

    # Manejar búsqueda de ticket
    if request.method == 'POST':
        ticket_number = request.form.get('ticket_number')
        
        # Validar entrada
        if not ticket_number or not ticket_number.isdigit():
            error_message = "Por favor, ingrese un número de ticket válido."
        else:
            # Buscar ticket en la base de datos
            cursor.execute("""
                SELECT id, ticket_number, agent, creation_date, status 
                FROM tickets 
                WHERE ticket_number = ?
            """, (ticket_number,))
            
            ticket_info = cursor.fetchone()
            
            if not ticket_info:
                error_message = f"No se encontró el ticket #{ticket_number}"

    return render_template('settings.html', 
                           ticket_info=ticket_info, 
                           error_message=error_message)

from flask import jsonify, request

@app.route('/delete_ticket/<int:ticket_id>', methods=['POST'])
def delete_ticket(ticket_id):
    print(f"Solicitud de eliminación para ticket ID: {ticket_id}")
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Primero verificamos que el ticket exista
        cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
        ticket = cursor.fetchone()
        
        print(f"Ticket encontrado: {ticket}")
        
        if not ticket:
            print(f"Ticket #{ticket_id} no encontrado")
            return jsonify({
                'status': 'error', 
                'message': f'Ticket #{ticket_id} no encontrado'
            }), 404
        
        # Eliminamos el ticket
        cursor.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
        db.commit()
        
        print(f"Ticket #{ticket[1]} eliminado correctamente")
        
        return jsonify({
            'status': 'success', 
            'message': f'Ticket #{ticket[1]} eliminado correctamente'
        }), 200
    
    except Exception as e:
        db.rollback()
        # Imprimir el error en los logs del servidor para depuración
        print(f"Error al eliminar ticket: {str(e)}")
        return jsonify({
            'status': 'error', 
            'message': f'Error al eliminar ticket: {str(e)}'
        }), 500

def ping_server(ip, result_queue, timeout=10):
    """
    Realiza ping a una IP con un timeout específico.
    Devuelve una tupla con (éxito, resultado)
    """
    try:
        # Verificar si la IP es válida primero
        if not is_valid_ip(ip):
            result_queue.put((False, {
                "message": f"IP inválida: {ip}",
                "latency": None,
                "output": ""
            }))
            return
            
        # Determinar el comando ping según el sistema operativo
        import platform
        system = platform.system().lower()
        
        if system == 'windows':
            # Windows usa -n para el conteo y -w para el timeout en milisegundos
            cmd = ['ping', '-n', '1', '-w', '5000', ip]
        else:
            # Linux/Unix usa -c para el conteo y -W para el timeout en segundos
            cmd = ['ping', '-c', '1', '-W', '5', ip]
            
            # Verificar si el sistema soporta -n (sin resolución DNS)
            try:
                # Primero probar con -n
                test_cmd = ['ping', '-c', '1', '-n', 'google.com']
                subprocess.run(test_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=2)
                cmd.insert(3, '-n')  # Añadir -n si es compatible
            except:
                pass  # Continuar sin -n si no es compatible
        
        print(f"Ejecutando: {' '.join(cmd)}")
        
        try:
            output = subprocess.check_output(
                cmd,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                timeout=timeout
            )
            
            # Verificar si el ping fue exitoso
            if 'time=' in output or 'tiempo=' in output:
                # Extraer el tiempo de respuesta (manejar diferentes formatos de salida)
                time_str = None
                
                # Formato 1: time=15.2 ms
                if 'time=' in output:
                    time_part = output.split('time=')[1].split()[0]
                    time_str = time_part if time_part.replace('.', '').isdigit() else None
                
                # Formato 2: tiempo=15.2 ms
                elif 'tiempo=' in output:
                    time_part = output.split('tiempo=')[1].split()[0]
                    time_str = time_part if time_part.replace('.', '').isdigit() else None
                
                if time_str:
                    try:
                        latency = float(time_str)
                        result_queue.put((True, {
                            "message": f"Respuesta desde {ip}: {latency}ms",
                            "latency": latency,
                            "output": output
                        }))
                        return
                    except (ValueError, IndexError) as e:
                        pass
                
                # Si llegamos aquí, intentemos extraer la latencia con una expresión regular
                import re
                time_match = re.search(r'time[=<]([\d.]+)\s*ms', output)
                if time_match:
                    try:
                        latency = float(time_match.group(1))
                        result_queue.put((True, {
                            "message": f"Respuesta desde {ip}: {latency}ms",
                            "latency": latency,
                            "output": output
                        }))
                        return
                    except (ValueError, IndexError) as e:
                        pass
            
            # Si no se pudo extraer la latencia pero el ping fue exitoso
            if '1 received' in output or '1 recibidos' in output:
                result_queue.put((True, {
                    "message": f"Respuesta desde {ip} (tiempo no disponible)",
                    "latency": 0,
                    "output": output
                }))
            else:
                result_queue.put((False, {
                    "message": f"No se pudo determinar la latencia para {ip}",
                    "latency": None,
                    "output": output
                }))
                
        except subprocess.CalledProcessError as e:
            error_msg = f"Error en el comando ping (código {e.returncode})"
            print(f"{error_msg}: {e.output}")
            result_queue.put((False, {
                "message": error_msg,
                "latency": None,
                "output": e.output
            }))
            
        except subprocess.TimeoutExpired:
            error_msg = f"Timeout al hacer ping a {ip} (tiempo de espera: {timeout}s)"
            print(error_msg)
            result_queue.put((False, {
                "message": error_msg,
                "latency": None,
                "output": ""
            }))
            
    except Exception as e:
        error_msg = f"Error inesperado al hacer ping a {ip}: {str(e)}"
        print(error_msg)
        result_queue.put((False, {
            "message": error_msg,
            "latency": None,
            "output": ""
        }))

@app.route('/ping_server', methods=['POST'])
def ping_server_route():
    """Ruta para realizar ping a un servidor."""
    try:
        ip = request.form.get('ip')
        print(f"Solicitud de ping a IP: {ip}")
        
        if not ip:
            return jsonify({"status": "error", "message": "IP no proporcionada"}), 400
        
        # Verificar si la IP es válida
        if not is_valid_ip(ip):
            return jsonify({"status": "error", "message": f"IP inválida: {ip}"}), 400
        
        result_queue = queue.Queue()
        
        # Iniciar el ping en un hilo separado
        ping_thread = threading.Thread(
            target=ping_server, 
            args=(ip, result_queue, 15)  # 15 segundos de timeout
        )
        ping_thread.daemon = True
        ping_thread.start()
        
        # Esperar a que termine el ping con un timeout
        ping_thread.join(timeout=20)  # Dar un poco más de tiempo que el timeout del ping
        
        try:
            # Obtener el resultado de la cola
            success, result = result_queue.get_nowait()
            
            # Preparar la respuesta base
            response = {
                "timestamp": datetime.now().isoformat()
            }
            
            if success:
                # Si el resultado es un diccionario (nuevo formato)
                if isinstance(result, dict):
                    # Asegurarse de que la latencia no sea negativa
                    latency = max(0, float(result.get("latency", 0)))
                    response.update({
                        "status": "success",
                        "message": result.get("message", "Ping exitoso"),
                        "latency": latency,
                        "output": result.get("output", "")
                    })
                else:
                    # Mantener compatibilidad con formato antiguo
                    response.update({
                        "status": "success",
                        "message": str(result),
                        "latency": 0,
                        "output": str(result)
                    })
            else:
                response.update({
                    "status": "error",
                    "message": str(result),
                    "latency": None,
                    "output": str(result)
                })
            
            return jsonify(response)
                
        except queue.Empty:
            return jsonify({
                "status": "error",
                "message": f"Timeout al esperar respuesta del ping para {ip}",
                "timestamp": datetime.now().isoformat()
            }), 504  # Gateway Timeout
            
    except Exception as e:
        error_msg = f"Error inesperado al procesar la solicitud de ping: {str(e)}"
        print(error_msg)
        return jsonify({
            "status": "error",
            "message": error_msg,
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/add_server', methods=['POST'])
def add_server():
    conn = get_db()
    c = conn.cursor()

    # Obtener los datos del formulario
    branch = request.form['branch']
    branch_code = request.form['branch_code']
    dyndns = request.form.get('dyndns', '')
    primary_service_provider = request.form['primary_service_provider']
    primary_service_ip = request.form['primary_service_ip']
    primary_service_speed = request.form['primary_service_speed']
    secondary_service_provider = request.form.get('secondary_service_provider', '')
    secondary_service_ip = request.form.get('secondary_service_ip', '')
    secondary_service_speed = request.form.get('secondary_service_speed', '')

    try:
        # Insertar el nuevo servidor en la base de datos
        c.execute('''INSERT INTO servers (branch, branch_code, dyndns, primary_service_provider, 
                      primary_service_ip, primary_service_speed, secondary_service_provider, 
                      secondary_service_ip, secondary_service_speed) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''', 
                  (branch, branch_code, dyndns, primary_service_provider, 
                   primary_service_ip, primary_service_speed, 
                   secondary_service_provider, secondary_service_ip, 
                   secondary_service_speed))
        conn.commit()
        flash('Servidor agregado exitosamente.', 'success')
    except Exception as e:
        conn.rollback()
        flash(f'Error al agregar el servidor: {str(e)}', 'error')
    finally:
        conn.close()

    return redirect(url_for('server_status'))  # Redirigir a la página de estado de servidores

# Función para realizar ping continuo
def continuous_ping(ip, result_queue, stop_event):
    """
    Función mejorada para hacer ping continuo a una IP.
    Versión con diagnóstico detallado para identificar problemas de conexión.
    
    Args:
        ip (str): Dirección IP a monitorear
        result_queue (queue.Queue): Cola para enviar resultados
        stop_event (threading.Event): Evento para detener el monitoreo
    """
    def log(msg, level='INFO'):
        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
        print(f"[{timestamp}] [{level}] [IP:{ip}] {msg}")
    
    if not is_valid_ip(ip):
        error_msg = f"IP inválida: {ip}"
        log(error_msg, 'ERROR')
        result_queue.put({'error': error_msg, 'ip': ip, 'status': 'error'})
        return
    
    log("Iniciando monitoreo de ping mejorado", 'INFO')
    
    # Inicializar datos locales
    latencies = []
    total_pings = 0
    successful_pings = 0
    consecutive_errors = 0
    MAX_CONSECUTIVE_ERRORS = 3
    
    # Configuración de ping - valores más conservadores
    PING_COUNT = 3  # 3 intentos por ping
    PING_TIMEOUT = 2  # 2 segundos de timeout
    PING_INTERVAL = 0.2  # 200ms entre pings
    
    log(f"Configuración: count={PING_COUNT}, timeout={PING_TIMEOUT}s, interval={PING_INTERVAL}s", 'DEBUG')
    
    # Función para enviar un solo ping
    def send_single_ping():
        try:
            cmd = ['ping', '-c', '1', '-W', str(PING_TIMEOUT), ip]
            log(f"Ejecutando: {' '.join(cmd)}", 'DEBUG')
            
            start_time = time.time()
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                timeout=PING_TIMEOUT + 1
            )
            
            # Combinar stdout y stderr para un mejor análisis
            output = result.stdout + "\n" + result.stderr
            elapsed_ms = (time.time() - start_time) * 1000
            
            # Verificar si el ping fue exitoso (0) o no
            if result.returncode == 0:
                # Verificar si realmente recibimos respuesta (para diferentes idiomas)
                if not ('1 received' in output or '1 recibidos' in output or '1 packets received' in output):
                    return {
                        'success': False,
                        'error': 'No se recibió respuesta de ping',
                        'output': output,
                        'latency': -1
                    }
                
                # Intentar extraer el tiempo usando diferentes patrones
                time_patterns = [
                    r'time=([\d.]+)\s*ms',    # Formato común
                    r'tiempo=([\d.]+)\s*ms',   # Formato en español
                    r'time:([\d.]+)\s*ms',     # Otro formato común
                    r'tiempo:([\d.]+)\s*ms',   # Otro formato en español
                    r'time[=:]([\d.]+)\s*ms'   # Patrón genérico
                ]
                
                for pattern in time_patterns:
                    match = re.search(pattern, output)
                    if match:
                        latency = float(match.group(1))
                        log(f"Ping exitoso: {latency:.2f}ms", 'DEBUG')
                        return {
                            'success': True,
                            'latency': latency,
                            'output': output
                        }
                
                # Si no se pudo extraer el tiempo pero el ping fue exitoso
                log(f"Ping exitoso pero no se pudo extraer tiempo (usando tiempo medido): {elapsed_ms:.2f}ms", 'WARNING')
                return {
                    'success': True,
                    'latency': elapsed_ms,
                    'output': output
                }
            else:
                # Manejar diferentes tipos de errores
                if '100% packet loss' in output or '100% de pérdida' in output:
                    error_msg = "Pérdida total de paquetes"
                elif 'Network is unreachable' in output or 'Red es inalcanzable' in output:
                    error_msg = "Red inalcanzable"
                elif 'Name or service not known' in output or 'Nombre o servicio no conocido' in output:
                    error_msg = "Nombre de host desconocido"
                else:
                    error_msg = f"Error (código: {result.returncode})"
                
                log(f"Error en ping: {error_msg}", 'WARNING')
                return {
                    'success': False,
                    'error': error_msg,
                    'output': output,
                    'latency': -1
                }
                
        except subprocess.TimeoutExpired:
            error_msg = "Tiempo de espera agotado"
            log(error_msg, 'WARNING')
            return {
                'success': False,
                'error': error_msg,
                'latency': -1
            }
        except Exception as e:
            error_msg = f"Error inesperado: {str(e)}"
            log(error_msg, 'ERROR')
            return {
                'success': False,
                'error': error_msg,
                'latency': -1
            }
            error_msg = result.stderr if result.stderr else result.stdout
            log(f"Error en ping: {error_msg.strip()}", 'WARNING')
            return {'success': False, 'error': error_msg.strip()}
            
        except subprocess.TimeoutExpired:
            log("Timeout al ejecutar ping", 'WARNING')
            return {'success': False, 'error': 'timeout'}
        except Exception as e:
            log(f"Error inesperado al ejecutar ping: {str(e)}", 'ERROR')
            return {'success': False, 'error': str(e)}
    
    start_time = time.time()
    
    try:
        while not stop_event.is_set():
            iteration_start = time.time()
            successful_attempts = 0
            attempt_latencies = []
            
            # Verificar si debemos detenernos
            if stop_event.is_set():
                log("Señal de detección recibida, finalizando monitoreo...", 'INFO')
                break
            
            # Realizar múltiples intentos de ping
            last_error = None
            for attempt in range(PING_COUNT):
                try:
                    result = send_single_ping()
                    
                    if result.get('success', False):
                        successful_attempts += 1
                        attempt_latencies.append(result['latency'])
                    else:
                        # Guardar el último error para mostrarlo si todos los intentos fallan
                        last_error = result.get('error', 'Error desconocido')
                    
                    # Pequeña pausa entre intentos
                    if attempt < PING_COUNT - 1:
                        time.sleep(0.1)
                        
                except Exception as e:
                    error_msg = str(e)
                    log(f"Error en intento de ping: {error_msg}", 'WARNING')
                    last_error = error_msg
                    continue
            
            total_pings += 1
            
            # Inicializar variables
            latency = 0
            status = 'unknown'
            
            # Procesar resultados de los intentos
            if successful_attempts > 0:
                # Calcular latencia promedio de los intentos exitosos
                avg_latency = sum(attempt_latencies) / len(attempt_latencies)
                latency = min(avg_latency, 1000)  # Limitar a 1000ms
                successful_pings += 1
                consecutive_errors = 0
                status = 'success'
                
                # Agregar a las latencias recientes (máximo 60 muestras)
                latencies.append(latency)
                if len(latencies) > 60:
                    latencies.pop(0)
                
                log(f"Ping exitoso: {latency:.2f}ms (de {successful_attempts}/{PING_COUNT} intentos)", 'DEBUG')
            else:
                # Todos los intentos fallaron
                latency = -1
                consecutive_errors += 1
                status = 'error'
                error_msg = last_error if last_error else 'Error desconocido en todos los intentos'
                log(f"Fallo en ping: {error_msg}", 'WARNING')
                
                # Si hay demasiados errores consecutivos, reiniciar contadores
                if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                    log(f"Demasiados errores consecutivos ({consecutive_errors}), reiniciando contadores...", 'WARNING')
                    successful_pings = 0
                    total_pings = 0
                    latencies = []
                    consecutive_errors = 0
            
            # Calcular la pérdida de paquetes
            failed_pings = total_pings - successful_pings
            packet_loss = (failed_pings / total_pings * 100) if total_pings > 0 else 0.0
            
            # Asegurarse de que los contadores no sean negativos
            successful_pings = max(0, successful_pings)
            failed_pings = max(0, failed_pings)
            total_pings = max(1, successful_pings + failed_pings)  # Asegurar que total_pings sea al menos 1
            
            # Asegurar que la pérdida de paquetes esté entre 0 y 100
            packet_loss = max(0, min(100, packet_loss))
            
            # Preparar datos para la caché
            result_data = {
                'ip': ip,
                'latency': latency if latency > 0 else 0,  # Usar 0 como valor de error
                'current_latency': latency if latency > 0 else 0,  # Usar 0 como valor de error
                'packet_loss': min(100, max(0, packet_loss)),  # Asegurar entre 0 y 100
                'successful_pings': successful_pings,
                'failed_pings': consecutive_errors,  # Usar el contador de errores consecutivos
                'total_pings': total_pings,
                'status': status,
                'timestamp': time.time(),
                'latencies': latencies.copy(),
                'stats': {
                    'min': min(latencies) if latencies else 0,
                    'max': max(latencies) if latencies else 0,
                    'avg': sum(latencies) / len(latencies) if latencies else 0,
                    'loss': max(0, min(100, packet_loss))  # Asegurar entre 0 y 100
                },
                'success': successful_attempts > 0,
                'consecutive_errors': consecutive_errors,
                'last_update': datetime.now().isoformat()
            }
            
            # Agregar mensaje de error si corresponde
            if status == 'error':
                result_data['error'] = error_msg
            
            # Actualizar la caché de manera incremental
            with ping_cache.lock:
                if ip not in ping_cache.data:
                    ping_cache.data[ip] = {}
                
                # Obtener datos existentes o inicializar si no existen
                existing_data = ping_cache.data[ip]
                
                # Actualizar solo los campos necesarios
                existing_data.update({
                    'ip': ip,
                    'latency': result_data.get('latency', existing_data.get('latency', 0)),
                    'current_latency': result_data.get('current_latency', existing_data.get('current_latency', 0)),
                    'status': result_data.get('status', existing_data.get('status', 'unknown')),
                    'timestamp': result_data.get('timestamp', existing_data.get('timestamp', time.time())),
                    'error': result_data.get('error', existing_data.get('error', None)),
                    'success': result_data.get('success', existing_data.get('success', False)),
                    'consecutive_errors': result_data.get('consecutive_errors', existing_data.get('consecutive_errors', 0))
                })
                
                # Manejar los contadores de manera incremental
                existing_data['successful_pings'] = existing_data.get('successful_pings', 0) + (1 if result_data.get('success', False) else 0)
                existing_data['failed_pings'] = existing_data.get('failed_pings', 0) + (0 if result_data.get('success', False) else 1)
                existing_data['total_pings'] = existing_data.get('successful_pings', 0) + existing_data.get('failed_pings', 0)
                
                # Calcular la pérdida de paquetes basada en los contadores incrementales
                if existing_data['total_pings'] > 0:
                    existing_data['packet_loss'] = (existing_data['failed_pings'] / existing_data['total_pings']) * 100
                else:
                    existing_data['packet_loss'] = 0
                
                # Manejar las latencias
                if 'latencies' not in existing_data:
                    existing_data['latencies'] = []
                
                # Agregar la nueva latencia si es válida
                if result_data.get('latency', 0) > 0:
                    existing_data['latencies'].append(result_data['latency'])
                    # Mantener un máximo de 60 muestras
                    if len(existing_data['latencies']) > 60:
                        existing_data['latencies'].pop(0)
                
                # Actualizar estadísticas
                if 'stats' not in existing_data:
                    existing_data['stats'] = {}
                
                # Calcular estadísticas de latencia
                if existing_data['latencies']:
                    existing_data['stats'].update({
                        'min': min(existing_data['latencies']),
                        'max': max(existing_data['latencies']),
                        'avg': sum(existing_data['latencies']) / len(existing_data['latencies']),
                        'loss': existing_data['packet_loss']
                    })
                else:
                    existing_data['stats'].update({
                        'min': 0,
                        'max': 0,
                        'avg': 0,
                        'loss': existing_data['packet_loss']
                    })
            
            # Enviar a la cola de resultados
            try:
                result_queue.put(result_data, timeout=1)
            except queue.Full:
                log("Cola de resultados llena, descartando datos", 'WARNING')
            
            # Calcular tiempo de espera hasta la próxima iteración
            elapsed = time.time() - iteration_start
            sleep_time = max(0, PING_INTERVAL - elapsed)
            
            # Usar wait con timeout para poder detectar la señal de stop
            if sleep_time > 0:
                stop_event.wait(timeout=sleep_time)
                if stop_event.is_set():
                    log("Señal de detección recibida durante la espera, finalizando...", 'INFO')
                    break
                
            # Esperar 1 segundo entre pings
            elapsed_since_start = time.time() - iteration_start
            if elapsed_since_start < 1.0:
                remaining = 1.0 - elapsed_since_start
                stop_event.wait(timeout=remaining)
                if stop_event.is_set():
                    log("Señal de detección recibida durante la espera, finalizando...", 'INFO')
                    break
                
    except subprocess.TimeoutExpired:
        # Timeout del comando
        total_pings += 1
        current_loss = 100 - ((successful_pings / total_pings) * 100) if total_pings > 0 else 100
        
        result_data = {
            'latency': -1,
            'status': 'timeout',
            'timestamp': datetime.now().isoformat(),
            'packet_loss': current_loss,
            'total_pings': total_pings,
            'successful_pings': successful_pings,
            'stats': {
                'min': min(latencies) if latencies else 0,
                'max': max(latencies) if latencies else 0,
                'avg': sum(latencies)/len(latencies) if latencies else 0,
                'packet_loss': current_loss
            }
        }
        
        # Actualizar la caché
        with ping_cache.lock:
            if ip not in ping_cache.data:
                ping_cache.data[ip] = {}
            ping_cache.data[ip] = result_data
        
        result_queue.put(result_data)
        
        # Pequeña pausa antes de continuar
        stop_event.wait(timeout=1.0)
        
    except Exception as e:
        if not stop_event.is_set():  # Solo registrar errores si no estamos deteniendo el monitoreo
            print(f"[continuous_ping] Error inesperado: {e}")
            result_queue.put({
                'error': str(e),
                'status': 'error',
                'ip': ip,
                'timestamp': datetime.now().isoformat(),
                'packet_loss': 100
            })
    finally:
        # Limpiar recursos
        log("Limpiando recursos del monitoreo...", 'DEBUG')
        
        # Asegurarse de que la caché esté limpia
        with ping_cache.lock:
            if ip in ping_cache.data:
                del ping_cache.data[ip]
        
        # Limpiar referencias
        if ip in monitoring_threads:
            try:
                del monitoring_threads[ip]
            except KeyError:
                pass
                
        if ip in monitoring_events:
            try:
                del monitoring_events[ip]
            except KeyError:
                pass
                
        log(f"Monitoreo finalizado para {ip}", 'INFO')
        time.sleep(5)  # Esperar 5 segundos en caso de error

# Ruta para iniciar el monitoreo
@app.route('/start_monitor/<ip>', methods=['GET'])
def start_monitor(ip):
    def log(msg, level='INFO'):
        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
        print(f"[{timestamp}] [{level}] [start_monitor] {msg}")
    
    try:
        log(f"Iniciando monitoreo para IP: {ip}")
        
        # Verificar si la IP es válida
        if not is_valid_ip(ip):
            error_msg = f"IP inválida: {ip}"
            log(error_msg, 'ERROR')
            return jsonify({"error": error_msg}), 400
        
        # Inicializar la caché si no existe
        if not hasattr(ping_cache, 'data'):
            log("Inicializando caché de ping", 'DEBUG')
            ping_cache.data = {}
        
        # Inicializar los datos para esta IP
        with ping_cache.lock:
            # Limpiar cualquier dato anterior para esta IP
            if ip in ping_cache.data:
                log(f"Limpiando caché anterior para IP: {ip}", 'DEBUG')
                del ping_cache.data[ip]
            
            # Inicializar los datos con valores por defecto
            ping_cache.data[ip] = {
                'ip': ip,
                'latency': 0,
                'current_latency': 0,
                'packet_loss': 0,
                'successful_pings': 0,
                'failed_pings': 0,
                'total_pings': 0,
                'status': 'unknown',
                'timestamp': time.time(),
                'latencies': [],
                'stats': {
                    'min': 0,
                    'max': 0,
                    'avg': 0,
                    'loss': 0,
                    'packet_loss': 0
                },
                'success': False,
                'consecutive_errors': 0,
                'last_update': datetime.now().isoformat()
            }
            log(f"Datos inicializados para IP: {ip}", 'DEBUG')
        
        # Crear una cola para los resultados
        result_queue = queue.Queue()
        
        # Crear un evento para detener el monitoreo
        stop_event = threading.Event()
        monitoring_events[ip] = stop_event
        
        # Iniciar el monitoreo en un hilo separado
        monitor_thread = threading.Thread(
            target=continuous_ping, 
            args=(ip, result_queue, stop_event),
            daemon=True,  # El hilo se cerrará cuando el programa principal termine
            name=f"PingMonitor-{ip}"
        )
        
        # Registrar el hilo
        monitoring_threads[ip] = monitor_thread
        monitor_thread.start()
        log(f"Hilo de monitoreo iniciado: {monitor_thread.name}", 'DEBUG')
        
        # Esperar el primer resultado para asegurarnos de que el ping está funcionando
        try:
            log("Esperando primer resultado...", 'DEBUG')
            first_result = result_queue.get(timeout=10)  # Esperar máximo 10 segundos
            log(f"Primer resultado recibido: {first_result}", 'DEBUG')
            
            # Inicializar la caché con los datos iniciales
            with ping_cache.lock:
                if ip not in ping_cache.data:
                    ping_cache._initialize_ip_data(ip)
                
                # Actualizar con los datos del primer resultado
                if 'latency' in first_result:
                    latency = first_result['latency'] if first_result['latency'] > 0 else -1
                    packet_loss = first_result.get('packet_loss', 100)
                    ping_cache.update(ip, latency, packet_loss)
                    log(f"Caché actualizada con latencia: {latency}ms, pérdida: {packet_loss}%", 'DEBUG')
            
            # Si hay un error, lo registramos pero no detenemos el monitoreo
            if 'error' in first_result or first_result.get('latency', -1) <= 0:
                error_msg = first_result.get('error', 'No se pudo conectar al servidor')
                log(f"Advertencia en el primer ping: {error_msg}", 'WARNING')
                log("Continuando con el monitoreo...", 'INFO')
                
        except queue.Empty:
            error_msg = f"No se recibió respuesta del ping para {ip} en 10 segundos"
            log(error_msg, 'ERROR')
            return jsonify({
                "status": "error",
                "message": error_msg,
                "timestamp": datetime.now().isoformat()
            }), 504
        
        log("Monitoreo iniciado exitosamente", 'INFO')
        return jsonify({
            "status": "ok",
            "message": f"Monitoreo iniciado para {ip}",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        error_msg = f"Error al iniciar monitoreo: {str(e)}"
        log(error_msg, 'ERROR')
        import traceback
        log(traceback.format_exc(), 'ERROR')
        return jsonify({
            "status": "error",
            "message": error_msg,
            "timestamp": datetime.now().isoformat()
        }), 500
        return jsonify({"error": error_msg}), 500

@app.route('/get_ping_data/<ip>', methods=['GET'])
def get_ping_data(ip):
    """
    Obtiene los datos de ping para una IP específica desde la caché.
    Versión mejorada con cálculos más precisos.
    """
    try:
        print(f"[get_ping_data] Solicitando datos para IP: {ip}")
        
        # Obtener datos de la caché
        with ping_cache.lock:
            ip_data = ping_cache.data.get(ip, {})
        
        print(f"[get_ping_data] Datos obtenidos de la caché: {ip_data}")
        
        # Si no hay datos, devolver respuesta vacía
        if not ip_data:
            print(f"[get_ping_data] No hay datos para IP: {ip}")
            return jsonify({
                'success': False,
                'error': 'No hay datos disponibles',
                'valid': False,
                'latencies': [],
                'loss': 100,
                'current_latency': -1,
                'status': 'offline',
                'stats': {
                    'total_pings': 0,
                    'successful_pings': 0,
                    'failed_pings': 0,
                    'packet_loss': 100,
                    'min_latency': 0,
                    'max_latency': 0,
                    'avg_latency': 0,
                    'last_update': datetime.now().isoformat()
                }
            })
        
        # Obtener datos básicos directamente del último resultado
        current_latency = ip_data.get('current_latency', -1)
        status = ip_data.get('status', 'unknown')
        packet_loss = ip_data.get('packet_loss', 100)
        
        # Obtener estadísticas de latencia
        latencies = ip_data.get('latencies', [])
        valid_latencies = [l for l in latencies if l > 0]
        
        # Calcular estadísticas
        if valid_latencies:
            min_latency = min(valid_latencies)
            max_latency = max(valid_latencies)
            avg_latency = sum(valid_latencies) / len(valid_latencies)
            
            # Redondear valores para mejor presentación
            min_latency = round(min_latency, 2)
            max_latency = round(max_latency, 2)
            avg_latency = round(avg_latency, 2)
        else:
            min_latency = 0
            max_latency = 0
            avg_latency = 0
        
        # Obtener contadores de pings
        total_pings = ip_data.get('total_pings', 0)
        successful_pings = ip_data.get('successful_pings', 0)
        failed_pings = max(0, total_pings - successful_pings)
        
        # Asegurarse de que la pérdida de paquetes esté en un rango válido
        packet_loss = max(0, min(100, packet_loss))
        
        # Si no hay latencias válidas, forzar la pérdida de paquetes al 100%
        if not valid_latencies and total_pings > 0:
            packet_loss = 100
        else:
            min_latency = max_latency = avg_latency = 0
        
        # Si nunca tuvimos éxito, forzar un valor de latencia alto
        if not valid_latencies and status != 'success':
            latencies = [1000] * min(total_pings, 10)  # Máximo 10 muestras de fallo
            min_latency = max_latency = avg_latency = 1000
        
        # Preparar la respuesta
        response = {
            'success': True,
            'ip': ip,
            'latency': current_latency if current_latency > 0 else -1,
            'current_latency': current_latency if current_latency > 0 else -1,
            'status': status,
            'latencies': latencies[-100:],  # Últimas 100 muestras
            'loss': packet_loss,
            'total_pings': total_pings,
            'successful_pings': successful_pings,
            'failed_pings': failed_pings,
            'valid': True,
            'timestamp': ip_data.get('timestamp', datetime.now().isoformat()),
            'stats': {
                'min': min_latency,
                'max': max_latency,
                'avg': avg_latency,
                'packet_loss': packet_loss,
                'total_pings': total_pings,
                'successful_pings': successful_pings,
                'failed_pings': failed_pings,
                'min_latency': min_latency if min_latency > 0 else None,
                'max_latency': max_latency if max_latency > 0 else None,
                'avg_latency': avg_latency if avg_latency > 0 else None,
                'last_update': ip_data.get('timestamp'),
                'consecutive_errors': ip_data.get('stats', {}).get('consecutive_errors', 0)
            }
        }
        
        print(f"[get_ping_data] Enviando respuesta para {ip}")
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Error en get_ping_data para {ip}: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'valid': False,
            'latencies': [],
            'loss': 100,
            'stats': {
                'total_pings': 0,
                'successful_pings': 0,
                'failed_pings': 0,
                'packet_loss': 100,
                'min_latency': None,
                'max_latency': None,
                'avg_latency': None,
                'last_update': None
            }
        }), 500

@app.route('/stop_monitor/<ip>', methods=['POST'])
def stop_monitor(ip):
    """Detiene el monitoreo para una IP específica.
    
    Args:
        ip (str): Dirección IP a dejar de monitorear
        
    Returns:
        JSON con el estado de la operación
    """
    try:
        print(f"Deteniendo monitoreo para IP: {ip}")
        
        # Validar la IP
        if not is_valid_ip(ip):
            print(f"IP inválida: {ip}")
            return jsonify({
                "status": "error",
                "message": f"IP inválida: {ip}",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        message = f"Monitoreo detenido para {ip}"
        
        # Verificar si hay un evento de monitoreo activo
        if ip in monitoring_events:
            print(f"Deteniendo hilo de monitoreo para IP: {ip}")
            try:
                monitoring_events[ip].set()  # Señalizar al hilo que debe detenerse
                
                # Esperar a que el hilo termine (máximo 2 segundos)
                if ip in monitoring_threads:
                    monitoring_threads[ip].join(timeout=2)
                    if monitoring_threads[ip].is_alive():
                        print(f"Advertencia: El hilo de monitoreo para {ip} no terminó correctamente")
                    
                    # Limpiar referencias
                    del monitoring_threads[ip]
                
                # Limpiar el evento
                del monitoring_events[ip]
                print(f"Hilo de monitoreo para {ip} detenido correctamente")
            except Exception as e:
                print(f"Error al detener el hilo de monitoreo para {ip}: {str(e)}")
                # Continuar con la limpieza a pesar del error
        
        # Limpiar la caché y todos los recursos asociados a esta IP
        try:
            with ping_cache.lock:
                if hasattr(ping_cache, 'data') and ip in ping_cache.data:
                    print(f"Eliminando datos de caché para IP: {ip}")
                    # Guardar estadísticas finales antes de eliminar
                    final_stats = {
                        'total_pings': ping_cache.data[ip].get('total_pings', 0),
                        'successful_pings': ping_cache.data[ip].get('successful_pings', 0),
                        'failed_pings': ping_cache.data[ip].get('failed_pings', 0),
                        'packet_loss': ping_cache.data[ip].get('packet_loss', 0)
                    }
                    print(f"Estadísticas finales para {ip}: {final_stats}")
                    
                    # Eliminar los datos de la caché
                    del ping_cache.data[ip]
                    print(f"Datos de caché para IP {ip} eliminados correctamente")
                else:
                    print(f"No se encontraron datos de monitoreo para IP: {ip}")
                    message = f"No se estaba monitoreando la IP {ip}"
                    
                # Asegurarse de limpiar cualquier referencia restante
                if ip in monitoring_threads:
                    try:
                        if monitoring_threads[ip].is_alive():
                            monitoring_threads[ip].join(timeout=1)
                        del monitoring_threads[ip]
                        print(f"Hilo de monitoreo para {ip} eliminado")
                    except Exception as e:
                        print(f"Error al eliminar el hilo de monitoreo para {ip}: {str(e)}")
                
                if ip in monitoring_events:
                    try:
                        monitoring_events[ip].set()
                        del monitoring_events[ip]
                        print(f"Evento de monitoreo para {ip} eliminado")
                    except Exception as e:
                        print(f"Error al eliminar el evento de monitoreo para {ip}: {str(e)}")
                        
        except Exception as e:
            error_msg = f"Error al limpiar los recursos para {ip}: {str(e)}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            # No es un error crítico, continuamos
        
        return jsonify({
            "status": "success",
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        error_msg = f"Error al detener el monitoreo para {ip}: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": error_msg,
            "timestamp": datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    print("Iniciando aplicación...")
    try:
        app.run(host="0.0.0.0", port=5002, debug=True)
    except Exception as e:
        print(f"Error al iniciar la aplicación: {e}")