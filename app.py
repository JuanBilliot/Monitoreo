from flask import Flask, render_template, request, redirect, url_for, flash, session, g, jsonify
import sqlite3
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Usar backend 'Agg' para entornos sin GUI
import matplotlib.pyplot as plt
from io import BytesIO
import base64
import os
import json
from datetime import datetime
import subprocess
import threading
import queue
import time
from flask_sse import sse
import socket


app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_segura_y_unica_para_sesiones_2024'  # Clave secreta para sesiones

# Inicializar SSE
app.config['REDIS_URL'] = "redis://localhost"
app.register_blueprint(sse, url_prefix='/stream')

# Variable global para caché de datos de ping
class PingCache:
    def __init__(self):
        self.data = {}
        self.lock = threading.Lock()

    def update(self, ip, latency, packet_loss):
        with self.lock:
            if ip not in self.data:
                self.data[ip] = {'latencies': [], 'loss': 0}
            self.data[ip]['latencies'].append(latency)
            self.data[ip]['loss'] = packet_loss
            # Mantener solo los últimos 100 valores
            if len(self.data[ip]['latencies']) > 100:
                self.data[ip]['latencies'] = self.data[ip]['latencies'][-100:]

    def get_data(self, ip):
        with self.lock:
            return self.data.get(ip, {'latencies': [], 'loss': 0})

ping_cache = PingCache()


# Función para validar IP
def is_valid_ip(ip):
    try:
        socket.inet_aton(ip)
        return True
    except socket.error:
        return False

# Modificar PingCache para incluir validación de IP
class PingCache:
    def __init__(self):
        self.data = {}
        self.lock = threading.Lock()

    def update(self, ip, latency, packet_loss):
        with self.lock:
            # Verificar si la IP es válida antes de almacenar datos
            if not is_valid_ip(ip):
                print(f"IP inválida: {ip}")
                return
                
            if ip not in self.data:
                self.data[ip] = {'latencies': [], 'loss': 0}
            self.data[ip]['latencies'].append(latency)
            self.data[ip]['loss'] = packet_loss
            # Mantener solo los últimos 100 valores
            if len(self.data[ip]['latencies']) > 100:
                self.data[ip]['latencies'] = self.data[ip]['latencies'][-100:]

    def get_data(self, ip):
        with self.lock:
            # Verificar si la IP es válida antes de devolver datos
            if not is_valid_ip(ip):
                return {'latencies': [], 'loss': 100}
                
            return self.data.get(ip, {'latencies': [], 'loss': 0})

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

def ping_server(ip, result_queue, timeout=5):
    """Realiza ping a una IP con un timeout específico."""
    try:
        # Usar subprocess para realizar ping con timeout
        output = subprocess.check_output(
            ['ping', '-c', '4', ip], 
            stderr=subprocess.STDOUT, 
            universal_newlines=True,
            timeout=timeout
        )
        result_queue.put(output)
    except subprocess.CalledProcessError as e:
        result_queue.put(f"Error de ping: {e.output}")
    except subprocess.TimeoutExpired:
        result_queue.put(f"Timeout al hacer ping a {ip}")

@app.route('/ping_server', methods=['POST'])
def ping_server_route():
    """Ruta para realizar ping a un servidor."""
    ip = request.form.get('ip')
    if not ip:
        return jsonify({"error": "IP no proporcionada"}), 400
    
    result_queue = queue.Queue()
    ping_thread = threading.Thread(target=ping_server, args=(ip, result_queue))
    ping_thread.start()
    ping_thread.join(timeout=10)  # Esperar máximo 10 segundos
    
    try:
        result = result_queue.get_nowait()
        return jsonify({"result": result})
    except queue.Empty:
        return jsonify({"error": "No se pudo obtener resultado de ping"}), 500

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
def continuous_ping(ip, result_queue):
    try:
        # Verificar si la IP es válida
        if not is_valid_ip(ip):
            print(f"IP inválida: {ip}")
            result_queue.put({'latency': -1, 'packet_loss': 100})
            return
            
        while True:
            try:
                # Realizar ping
                ping = subprocess.Popen(
                    ['ping', '-c', '1', '-W', '5', ip],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                out, error = ping.communicate()
                
                if ping.returncode == 0:
                    # Parsear la salida
                    output = out.decode()
                    latency = float(output.split('time=')[1].split(' ')[0])
                    packet_loss = 0
                else:
                    latency = -1
                    packet_loss = 100
                
                # Actualizar la caché solo si la IP es válida
                ping_cache.update(ip, latency, packet_loss)
                result_queue.put({'latency': latency, 'loss': packet_loss})
                
            except Exception as e:
                print(f"Error en ping: {e}")
                result_queue.put({'latency': -1, 'loss': 100})
                
            time.sleep(1)
            
    except Exception as e:
        print(f"Error en ping continuo: {e}")
        result_queue.put({'error': str(e)})

# Ruta para iniciar el monitoreo
@app.route('/start_monitor/<ip>', methods=['GET'])
def start_monitor(ip):
    try:
        # Verificar si la IP es válida
        if not is_valid_ip(ip):
            return jsonify({"error": "IP inválida"}), 400
            
        # Iniciar el monitoreo
        threading.Thread(target=continuous_ping, args=(ip, queue.Queue())).start()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_ping_data/<ip>', methods=['GET'])
def get_ping_data(ip):
    try:
        # Verificar si la IP es válida
        if not is_valid_ip(ip):
            return jsonify({
                'latencies': [],
                'loss': 100,
                'valid_ip': False
            })
            
        data = ping_cache.get_data(ip)
        return jsonify({
            'latencies': data['latencies'],
            'loss': data['loss'],
            'valid_ip': True
        })
    except Exception as e:
        return jsonify({
            'latencies': [],
            'loss': 100,
            'valid_ip': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("Iniciando aplicación...")
    try:
        app.run(host="0.0.0.0", port=5002, debug=True)
    except Exception as e:
        print(f"Error al iniciar la aplicación: {e}")