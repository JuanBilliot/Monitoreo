import { useState, useEffect, useRef } from 'react'
import './App.css'

const LatencyChart = ({ data, colorClass }) => {
  if (!data || data.length === 0) return <div className="chart-placeholder">Esperando datos...</div>;

  const maxLat = Math.max(...data, 100);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (val / maxLat) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="chart-container">
      <svg className="sparkline-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          className={`sparkline-path ${colorClass}`}
        />
      </svg>
    </div>
  );
};

function App() {
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [servers, setServers] = useState([]);
  const [serverMonitoring, setServerMonitoring] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pingResults, setPingResults] = useState({}); // { [ip]: { msg, timestamp } }
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadStatus, setUploadStatus] = useState({ loading: false, message: '', type: '' });
  const [viewMode, setViewMode] = useState('list'); // 'list', 'view', 'edit'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [showEditServerModal, setShowEditServerModal] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [newServerData, setNewServerData] = useState({
    branch: '', branch_code: '', primary_service_provider: '',
    primary_service_ip: '', primary_service_speed: '',
    secondary_service_provider: '', secondary_service_ip: '', secondary_service_speed: ''
  });
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const fileInputRef = useRef(null);
  const ticketsPerPage = 50;
  const scrollPos = useRef(0);

  // Efecto para scroll al cambiar de pestaña
  useEffect(() => {
    window.scrollTo(0, 0);
    scrollPos.current = 0; // Resetear posición guardada al cambiar de sección
  }, [activeTab]);

  // Efecto para manejar scroll al entrar/salir de detalle/edición
  useEffect(() => {
    if (viewMode === 'view' || viewMode === 'edit') {
      // Si entramos a ver/editar y venimos de scrollear la lista, guardamos la posición
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScroll > 0 && viewMode !== 'edit') { // Solo guardar si venimos de 'list'
        scrollPos.current = currentScroll;
      }
      window.scrollTo(0, 0);
    } else if (viewMode === 'list') {
      // Al volver al listado, restauramos la posición previa
      if (scrollPos.current > 0) {
        setTimeout(() => {
          window.scrollTo({ top: scrollPos.current, behavior: 'instant' });
        }, 0);
      }
    }
  }, [viewMode]);

  useEffect(() => {
    fetchData();
    fetchGroups();
    const interval = setInterval(() => {
      if (viewMode !== 'edit') {
        fetchData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [viewMode]);

  useEffect(() => {
    fetchServersStatus();
    const interval = setInterval(() => {
      if (viewMode !== 'edit') {
        fetchServersStatus();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [viewMode]);

  // Manejo del botón "Atrás" del navegador
  useEffect(() => {
    const handleBackButton = (e) => {
      if (viewMode !== 'list') {
        e.preventDefault();
        if (viewMode === 'edit') setViewMode('view');
        else { setViewMode('list'); setSelectedTicket(null); }
        window.history.pushState(null, null, window.location.pathname);
      }
    };
    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [viewMode]);

  const fetchGroups = async () => {
    try {
      const [aR, uR, bR] = await Promise.all([
        fetch('http://127.0.0.1:5002/api/agents'),
        fetch('http://127.0.0.1:5002/api/users'),
        fetch('http://127.0.0.1:5002/api/branches')
      ]);
      setAgents(await aR.json());
      setUsers(await uR.json());
      setBranches(await bR.json());
    } catch (e) { console.error(e); }
  };

  const getAgentColor = (name) => {
    if (!name || name === 'S/A') return 'rgba(255,255,255,0.1)';
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4',
      '#84cc16', '#eab308', '#6366f1', '#f43f5e', '#14b8a6', '#f97316', '#a855f7'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };
  useEffect(() => {
    if (activeTab === 'servers' && !showEditServerModal && !showAddServerModal) {
      fetchServersData();
      const interval = setInterval(fetchServersStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTab, showEditServerModal, showAddServerModal]);

  const fetchData = async () => {
    try {
      const responses = await Promise.all([
        fetch('http://127.0.0.1:5002/api/dashboard/stats'),
        fetch('http://127.0.0.1:5002/api/tickets')
      ]);
      const statsData = await responses[0].json();
      const ticketsData = await responses[1].json();
      setStats(statsData);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServersData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5002/api/servers');
      const data = await response.json();
      setServers(data);
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  const fetchServersStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5002/api/servers/status');
      const data = await response.json();
      setServerMonitoring(data);
    } catch (error) {
      console.error('Error fetching server status:', error);
    }
  };

  const startAllMonitors = async () => {
    try {
      await fetch('http://127.0.0.1:5002/api/servers/monitor/start-all', { method: 'POST' });
    } catch (error) {
      console.error('Error starting all monitors:', error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus({ loading: true, message: 'Procesando Excel...', type: 'info' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:5002/api/tickets/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.status === 'success') {
        setUploadStatus({ loading: false, message: data.message, type: 'success' });
        fetchData(); // Recargar datos
      } else {
        setUploadStatus({ loading: false, message: data.message, type: 'error' });
      }
    } catch (error) {
      setUploadStatus({ loading: false, message: 'Error de conexión con el servidor', type: 'error' });
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveTicket = async (updatedTicket) => {
    try {
      const response = await fetch(`http://127.0.0.1:5002/api/tickets/${updatedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTicket),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setViewMode('list');
        fetchData();
        fetchGroups();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const handleUpdateServer = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch(`http://127.0.0.1:5002/api/servers/${editingServer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingServer)
      });
      const data = await resp.json();
      if (data.status === 'success') {
        setShowEditServerModal(false);
        setEditingServer(null);
        fetchServersData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleDeleteServer = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta sucursal?')) return;
    try {
      const resp = await fetch(`http://127.0.0.1:5002/api/servers/${id}`, {
        method: 'DELETE'
      });
      const data = await resp.json();
      if (data.status === 'success') {
        fetchServersData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleAddServer = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch('http://127.0.0.1:5002/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServerData)
      });
      const data = await resp.json();
      if (data.status === 'success') {
        alert('Sucursal agregada correctamente');
        setShowAddServerModal(false);
        setNewServerData({
          branch: '', branch_code: '', primary_service_provider: '',
          primary_service_ip: '', primary_service_speed: '',
          secondary_service_provider: '', secondary_service_ip: '', secondary_service_speed: ''
        });
        fetchServersData();
        fetchGroups();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleStartMonitor = async (ip) => {
    try {
      await fetch(`http://127.0.0.1:5002/start_monitor/${ip}`);
      fetchServersStatus();
    } catch (error) {
      console.error('Error starting monitor:', error);
    }
  };

  const handleStopMonitor = async (ip) => {
    try {
      await fetch(`http://127.0.0.1:5002/stop_monitor/${ip}`, { method: 'POST' });
      fetchServersStatus();
    } catch (error) {
      console.error('Error stopping monitor:', error);
    }
  };

  const handlePingOnce = async (ip) => {
    try {
      const formData = new FormData();
      formData.append('ip', ip);
      const resp = await fetch(`http://127.0.0.1:5002/ping_server`, {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      const resultMsg = data.status === 'success' ? `${data.latency}ms` : data.message;

      setPingResults(prev => ({
        ...prev,
        [ip]: { msg: resultMsg, isError: data.status !== 'success', timestamp: Date.now() }
      }));

      // Limpiar el mensaje después de 10 segundos para volver al gráfico
      setTimeout(() => {
        setPingResults(prev => {
          const next = { ...prev };
          delete next[ip];
          return next;
        });
      }, 10000);

      fetchServersStatus();
    } catch (error) {
      console.error('Error in manual ping:', error);
    }
  };

  // Lógica de Paginación
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = tickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(tickets.length / ticketsPerPage);

  const Pagination = () => (
    totalPages > 1 ? (
      <div className="pagination" style={{ margin: '1rem 0' }}>
        <button
          className="pagination-btn"
          onClick={() => {
            setCurrentPage(prev => Math.max(prev - 1, 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          disabled={currentPage === 1}
        >
          <i className="fas fa-chevron-left"></i> Anterior
        </button>
        <span className="page-info">Página <strong>{currentPage}</strong> de {totalPages}</span>
        <button
          className="pagination-btn"
          onClick={() => {
            setCurrentPage(prev => Math.min(prev + 1, totalPages));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          disabled={currentPage === totalPages}
        >
          Siguiente <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    ) : null
  );

  const TicketDetailView = ({ ticket, onEdit, onBack }) => (
    <div className="panel animate-fade-in" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <button className="nav-item" onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.6rem 1.2rem' }}>
          <i className="fas fa-arrow-left"></i> Volver al listado
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="nav-item" onClick={onEdit} style={{ background: 'var(--primary)', color: 'white' }}>
            <i className="fas fa-edit"></i> Editar Ticket
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card main-info">
          <div className="detail-header">
            <span className="ticket-number">
              <a
                href={`https://mesadeayuda.sommiercenter.com/requests/show/index/id/${ticket.ticket_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ticket-header-link"
                style={{ fontSize: 'inherit' }}
              >
                Ticket #{ticket.ticket_number}
              </a>
            </span>
            <span className={`badge status-${ticket.status?.toLowerCase().replace(/\s+/g, '-')}`}>{ticket.status}</span>
          </div>

          <div className="info-section">
            <div className="info-item">
              <label>Usuario</label>
              <span>{ticket.user || 'S/U'}</span>
            </div>
            <div className="info-item">
              <label>Sucursal</label>
              <span>{ticket.branch || 'S/D'}</span>
            </div>
          </div>

          <div className="info-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            <div className="info-item">
              <label>Creado</label>
              <span>{ticket.creation_date}</span>
            </div>
            <div className="info-item">
              <label>Cierre</label>
              <span>{ticket.close_date || 'En proceso'}</span>
            </div>
            <div className="info-item">
              <label>Demora</label>
              <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{ticket.delay}</span>
            </div>
          </div>
        </div>

        <div className="detail-card side-info">
          <h3><i className="fas fa-user-shield"></i> Asignación</h3>
          <div className="info-item">
            <label>Agente Principal</label>
            <span>{ticket.agent || 'Sin asignar'}</span>
          </div>
          <div className="info-item">
            <label>Colaboradores</label>
            <span>{ticket.collaborators || 'Ninguno'}</span>
          </div>

          <h3 style={{ marginTop: '2rem' }}><i className="fas fa-tachometer-alt"></i> Rendimiento SLA</h3>
          <div className="info-item">
            <label>Estado SLA</label>
            <span className={`sla-badge ${ticket.sla_resolution?.toLowerCase() === 'correcto' ? 'sla-ok' : 'sla-warn'}`}>
              {ticket.sla_resolution || 'N/A'}
            </span>
          </div>
          <div className="info-item">
            <label>Primera Respuesta</label>
            <span>{ticket.first_response || '--'}</span>
          </div>
        </div>

        <div className="detail-card full-width">
          <h3><i className="fas fa-align-left"></i> Detalles / Notas</h3>
          <p style={{ lineHeight: '1.6', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
            {ticket.details || 'Sin detalles registrados para este ticket.'}
          </p>
        </div>
      </div>
    </div>
  );

  const TicketEditView = ({ ticket, onSave, onBack }) => {
    const [formData, setFormData] = useState({ ...ticket });

    const handleChange = (e) => {
      const { name, value } = e.target;
      if (value === 'new') {
        const labels = { 'agent': 'Agente', 'branch': 'Sucursal', 'user': 'Usuario', 'collaborators_select': 'Colaborador' };
        const label = labels[name] || name;
        const newValue = prompt(`Ingrese el nombre del nuevo ${label}:`);
        if (newValue) {
          if (name === 'collaborators' || name === 'collaborators_select') {
            const current = formData.collaborators && formData.collaborators !== 'None' ? formData.collaborators : '';
            const updated = current ? `${current}, ${newValue}` : newValue;
            setFormData(prev => ({ ...prev, collaborators: updated }));
          } else {
            setFormData(prev => ({ ...prev, [name]: newValue }));
          }
        }
        return;
      }

      if (name === 'collaborators_select') {
        if (!value) return;
        const current = formData.collaborators && formData.collaborators !== 'None' ? formData.collaborators : '';
        const list = current ? current.split(',').map(s => s.trim()) : [];
        if (!list.includes(value)) {
          const updated = current ? `${current}, ${value}` : value;
          setFormData(prev => ({ ...prev, collaborators: updated }));
        }
        return;
      }

      setFormData(prev => ({ ...prev, [name]: value }));
    };

    const removeCollaborator = (collab) => {
      const current = formData.collaborators || '';
      const updated = current.split(',')
        .map(s => s.trim())
        .filter(s => s !== collab)
        .join(', ');
      setFormData(prev => ({ ...prev, collaborators: updated }));
    };

    return (
      <div className="panel animate-fade-in" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="brand-icon" style={{ width: '45px', height: '45px', fontSize: '1.2rem', margin: 0 }}>
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.8rem' }}>
                <a
                  href={`https://mesadeayuda.sommiercenter.com/requests/show/index/id/${ticket.ticket_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ticket-header-link"
                >
                  Ticket #{ticket.ticket_number}
                </a>
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Gestión y actualización de datos</p>
            </div>
          </div>
          <button className="nav-item" onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)' }}>
            <i className="fas fa-times"></i> Cancelar
          </button>
        </div>

        <form className="edit-form" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Agente Principal</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  name="agent"
                  value={formData.agent || ''}
                  onChange={handleChange}
                  className="custom-input"
                  style={{ borderLeft: `4px solid ${getAgentColor(formData.agent)}` }}
                >
                  <option value="">-- Seleccionar Agente --</option>
                  {agents.map(a => <option key={a} value={a}>{a}</option>)}
                  {formData.agent && !agents.includes(formData.agent) && <option value={formData.agent}>{formData.agent}</option>}
                  <option value="new">+ Agregar Nuevo...</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select name="status" value={formData.status || ''} onChange={handleChange} className="custom-input">
                <option value="Abierto">Abierto</option>
                <option value="Cerrado">Cerrado</option>
                <option value="En espera">En espera</option>
                <option value="Resuelto">Resuelto</option>
                <option value="Derivado">Derivado</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>
            <div className="form-group">
              <label>Usuario</label>
              <select name="user" value={formData.user || ''} onChange={handleChange} className="custom-input">
                <option value="">-- Seleccionar Usuario --</option>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
                {formData.user && !users.includes(formData.user) && <option value={formData.user}>{formData.user}</option>}
                <option value="new">+ Agregar Nuevo...</option>
              </select>
            </div>
            <div className="form-group">
              <label>Sucursal</label>
              <select name="branch" value={formData.branch || ''} onChange={handleChange} className="custom-input">
                <option value="">-- Seleccionar Sucursal --</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
                {formData.branch && !branches.includes(formData.branch) && <option value={formData.branch}>{formData.branch}</option>}
                <option value="new">+ Agregar Nuevo...</option>
              </select>
            </div>
            <div className="form-group">
              <label>SLA de Resolución</label>
              <select name="sla_resolution" value={formData.sla_resolution || ''} onChange={handleChange} className="custom-input">
                <option value="Correcto">Correcto</option>
                <option value="Excedido">Excedido</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de Cierre (DD/MM/YYYY)</label>
              <input
                type="text"
                name="close_date"
                placeholder="Ej: 20/01/2026"
                value={formData.close_date === 'None' ? '' : (formData.close_date || '')}
                onChange={handleChange}
                className="custom-input"
              />
            </div>
            <div className="form-group full-width">
              <label>Colaboradores</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    name="collaborators_select"
                    onChange={handleChange}
                    className="custom-input"
                    value=""
                  >
                    <option value="">-- Agregar Colaborador --</option>
                    {agents.map(a => <option key={a} value={a}>{a}</option>)}
                    <option value="new">+ Agregar Nuevo...</option>
                  </select>
                  <button
                    type="button"
                    className="nav-item"
                    style={{ background: 'rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}
                    onClick={() => setFormData(prev => ({ ...prev, collaborators: '' }))}
                  >
                    Limpiar Todo
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  {formData.collaborators && formData.collaborators !== 'None' && formData.collaborators.split(',').map(c => c.trim()).filter(c => c).map((c, idx) => (
                    <span key={idx} className="badge" style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px' }}>
                      {c}
                      <i className="fas fa-times" style={{ cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => removeCollaborator(c)}></i>
                    </span>
                  ))}
                  {(!formData.collaborators || formData.collaborators === 'None' || formData.collaborators.trim() === '') && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay colaboradores seleccionados</span>
                  )}
                </div>
              </div>
            </div>
            <div className="form-group full-width">
              <label>Detalles / Notas</label>
              <textarea name="details" value={formData.details || ''} onChange={handleChange} className="custom-input" style={{ height: '120px' }}></textarea>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="nav-item" style={{ background: 'var(--success)', color: 'white', padding: '1rem 3rem' }}>
              <i className="fas fa-save"></i> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    );
  };

  const ServerMonitoringView = () => {
    const renderService = (ip, provider, speed, type) => {
      if (!ip) return null;
      const statusData = serverMonitoring[ip] || {};
      const isMonitoring = !!serverMonitoring[ip];
      const isOnline = statusData.status === 'success';
      const latency = statusData.latency || 0;
      const loss = statusData.packet_loss || 0;
      const latencies = statusData.latencies || [];
      const manualPing = pingResults[ip];

      return (
        <div className={`service-section ${isMonitoring ? 'scanning' : ''}`}>
          <div className="service-header">
            <div className={`service-title ${type}`}>
              <i className={type === 'primary' ? 'fas fa-rocket' : 'fas fa-shield-alt'}></i>
              {type === 'primary' ? 'Principal' : 'Respaldo'}
            </div>
            <div className={`status-indicator ${isOnline ? 'status-active' : (isMonitoring ? 'status-monitoring' : 'status-inactive')}`}>
              {isOnline ? 'Online' : (isMonitoring ? 'Monitoreando' : 'Offline')}
            </div>
          </div>

          <div className="service-details-mini">
            <span className="ip-text">{ip}</span>
            <span className="provider-text">{provider} {speed && `(${speed})`}</span>
          </div>

          <div className="monitoring-display" style={{ minHeight: '60px', display: 'flex', alignItems: 'center' }}>
            {manualPing ? (
              <div className={`ping-result-msg animate-fade-in ${manualPing.isError ? 'text-danger' : 'text-success'}`} style={{ fontSize: '0.85rem', fontWeight: '700', width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
                <i className="fas fa-satellite-dish" style={{ marginRight: '8px' }}></i>
                {manualPing.msg}
              </div>
            ) : (
              <LatencyChart data={latencies} colorClass={type === 'primary' ? 'path-primary' : 'path-secondary'} />
            )}
          </div>

          <div className="service-stats">
            <div className="stat-group">
              <label>Latencia</label>
              <span className={`service-stat-value ${latency > 150 ? 'text-warn' : 'text-success'}`}>
                {latency > 0 ? `${latency.toFixed(1)}ms` : '--'}
              </span>
            </div>
            <div className="stat-group">
              <label>Pérdida</label>
              <span className={`service-stat-value ${loss > 5 ? 'text-warn' : ''}`}>
                {loss.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="service-controls">
            <button className="btn-ctrl btn-ping" onClick={() => handlePingOnce(ip)} title="Ping Único">
              <i className="fas fa-satellite-dish"></i>
            </button>
            {!isMonitoring ? (
              <button className="btn-ctrl btn-start" onClick={() => handleStartMonitor(ip)} title="Iniciar Monitoreo">
                <i className="fas fa-play"></i>
              </button>
            ) : (
              <button className="btn-ctrl btn-stop active" onClick={() => handleStopMonitor(ip)} title="Detener Monitoreo">
                <i className="fas fa-stop"></i>
              </button>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="servers-view">
        <div className="panel-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Monitoreo</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Estado en tiempo real de infraestructura</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="nav-item" onClick={startAllMonitors} style={{ background: 'rgba(255,255,255,0.05)' }}>
              <i className="fas fa-sync-alt"></i> Re-scan General
            </button>
            <button className="nav-item" style={{ background: 'var(--primary)', color: 'white' }} onClick={() => setShowAddServerModal(true)}>
              <i className="fas fa-plus"></i> Nueva Sede
            </button>
          </div>
        </div>

        <div className="server-cards-grid">
          {servers.map(server => (
            <div key={server.id} className="server-card">
              <div className="server-card-header">
                <div>
                  <h3>{server.branch}</h3>
                  <span className="branch-code">{server.branch_code}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-ctrl" onClick={() => { setEditingServer(server); setShowEditServerModal(true); }} title="Editar Sucursal">
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="btn-ctrl" onClick={() => handleDeleteServer(server.id)} title="Eliminar Sucursal" style={{ color: 'var(--danger)' }}>
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              <div className="services-container">
                {renderService(server.primary_service_ip, server.primary_service_provider, server.primary_service_speed, 'primary')}
                {renderService(server.secondary_service_ip, server.secondary_service_provider, server.secondary_service_speed, 'secondary')}
              </div>
            </div>
          ))}
        </div>

        {showAddServerModal && (
          <div className="modal-overlay animate-fade-in" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(5px)'
          }}>
            <div className="panel" style={{ maxWidth: '800px', width: '100%', maxHeight: '95vh', overflowY: 'auto', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Agregar Nueva Sucursal</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure los detalles de conexión del nuevo sitio</p>
                </div>
                <button className="nav-item" onClick={() => setShowAddServerModal(false)} style={{ background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleAddServer}>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label>Nombre de Sucursal</label>
                    <input
                      type="text" required className="custom-input" placeholder="Ej: Sucursal Pilar"
                      value={newServerData.branch}
                      onChange={(e) => setNewServerData({ ...newServerData, branch: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Código de Sucursal</label>
                    <input
                      type="text" required className="custom-input" placeholder="Ej: PIL"
                      value={newServerData.branch_code}
                      onChange={(e) => setNewServerData({ ...newServerData, branch_code: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}><i className="fas fa-network-wired"></i> Conexión Primaria</h3>
                  </div>

                  <div className="form-group">
                    <label>Proveedor</label>
                    <input
                      type="text" required className="custom-input" placeholder="Ej: Fibertel"
                      value={newServerData.primary_service_provider}
                      onChange={(e) => setNewServerData({ ...newServerData, primary_service_provider: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>IP Primaria</label>
                    <input
                      type="text" required className="custom-input" placeholder="Ej: 192.168.1.1"
                      value={newServerData.primary_service_ip}
                      onChange={(e) => setNewServerData({ ...newServerData, primary_service_ip: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Velocidad Contratada</label>
                    <input
                      type="text" className="custom-input" placeholder="Ej: 100 Mbps"
                      value={newServerData.primary_service_speed}
                      onChange={(e) => setNewServerData({ ...newServerData, primary_service_speed: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent)' }}><i className="fas fa-link"></i> Conexión Secundaria (Opcional)</h3>
                  </div>

                  <div className="form-group">
                    <label>Proveedor</label>
                    <input
                      type="text" className="custom-input"
                      value={newServerData.secondary_service_provider}
                      onChange={(e) => setNewServerData({ ...newServerData, secondary_service_provider: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>IP Secundaria</label>
                    <input
                      type="text" className="custom-input"
                      value={newServerData.secondary_service_ip}
                      onChange={(e) => setNewServerData({ ...newServerData, secondary_service_ip: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                  <button type="button" className="nav-item" onClick={() => setShowAddServerModal(false)} style={{ background: 'rgba(255,255,255,0.05)' }}>Cancelar</button>
                  <button type="submit" className="nav-item" style={{ background: 'var(--success)', color: 'white', padding: '0.8rem 2.5rem' }}>Guardar Sucursal</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditServerModal && editingServer && (
          <div className="modal-overlay animate-fade-in" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(5px)'
          }}>
            <div className="panel" style={{ maxWidth: '800px', width: '100%', maxHeight: '95vh', overflowY: 'auto', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Editar Sucursal</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Modifique los detalles de conexión de la sucursal</p>
                </div>
                <button className="nav-item" onClick={() => { setShowEditServerModal(false); setEditingServer(null); }} style={{ background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleUpdateServer}>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label>Nombre de Sucursal</label>
                    <input
                      type="text" required className="custom-input"
                      value={editingServer.branch}
                      onChange={(e) => setEditingServer({ ...editingServer, branch: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Código de Sucursal</label>
                    <input
                      type="text" required className="custom-input"
                      value={editingServer.branch_code}
                      onChange={(e) => setEditingServer({ ...editingServer, branch_code: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}><i className="fas fa-network-wired"></i> Conexión Primaria</h3>
                  </div>

                  <div className="form-group">
                    <label>Proveedor</label>
                    <input
                      type="text" required className="custom-input"
                      value={editingServer.primary_service_provider}
                      onChange={(e) => setEditingServer({ ...editingServer, primary_service_provider: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>IP Primaria</label>
                    <input
                      type="text" required className="custom-input"
                      value={editingServer.primary_service_ip}
                      onChange={(e) => setEditingServer({ ...editingServer, primary_service_ip: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Velocidad Contratada</label>
                    <input
                      type="text" className="custom-input"
                      value={editingServer.primary_service_speed}
                      onChange={(e) => setEditingServer({ ...editingServer, primary_service_speed: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent)' }}><i className="fas fa-link"></i> Conexión Secundaria (Opcional)</h3>
                  </div>

                  <div className="form-group">
                    <label>Proveedor</label>
                    <input
                      type="text" className="custom-input"
                      value={editingServer.secondary_service_provider || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, secondary_service_provider: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>IP Secundaria</label>
                    <input
                      type="text" className="custom-input"
                      value={editingServer.secondary_service_ip || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, secondary_service_ip: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                  <button type="button" className="nav-item" onClick={() => { setShowEditServerModal(false); setEditingServer(null); }} style={{ background: 'rgba(255,255,255,0.05)' }}>Cancelar</button>
                  <button type="submit" className="nav-item" style={{ background: 'var(--primary)', color: 'white', padding: '0.8rem 2.5rem' }}>Actualizar Sucursal</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            <section className="stats-grid-compact">
              <div className="stat-card-mini total">
                <div className="stat-content">
                  <span className="stat-label">Total Tickets</span>
                  <span className="stat-value">{stats?.total_tickets || 0}</span>
                </div>
                <div className="stat-icon-bg"><i className="fas fa-ticket-alt"></i></div>
              </div>
              <div className="stat-card-mini open">
                <div className="stat-content">
                  <span className="stat-label">Abiertos</span>
                  <span className="stat-value">{stats?.open_tickets || 0}</span>
                </div>
                <div className="stat-icon-bg"><i className="fas fa-door-open"></i></div>
              </div>
              <div className="stat-card-mini closed">
                <div className="stat-content">
                  <span className="stat-label">Cerrados</span>
                  <span className="stat-value">{stats?.closed_tickets || 0}</span>
                </div>
                <div className="stat-icon-bg"><i className="fas fa-check-circle"></i></div>
              </div>
              <div className="stat-card-mini sla">
                <div className="stat-content">
                  <span className="stat-label">% SLA Excedido</span>
                  <span className="stat-value">{stats?.sla_exceeded_percent || 0}%</span>
                </div>
                <div className="stat-icon-bg"><i className="fas fa-clock"></i></div>
              </div>
            </section>

            <div className="dashboard-main-grid">
              <div className="panel activity-panel">
                <div className="panel-header-mini">
                  <h3><i className="fas fa-bolt"></i> Actividad Reciente</h3>
                  <button className="view-all-btn" onClick={() => { setActiveTab('tickets'); setViewMode('list'); }}>Ver todo</button>
                </div>
                <div className="activity-list">
                  {stats?.recent_activity?.map((act, i) => (
                    <div key={i} className="activity-item">
                      <div className={`activity-icon-sm ${act.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        <i className={act.type === 'new' ? 'fas fa-plus' : 'fas fa-check'}></i>
                      </div>
                      <div className="activity-info">
                        <p>Nuevo ticket <strong>#{act.ticket}</strong> creado por <strong>{act.user}</strong></p>
                        <span className="activity-time">{act.date}</span>
                      </div>
                      <span className={`badge-sm status-${act.status?.toLowerCase().replace(/\s+/g, '-')}`}>{act.status}</span>
                    </div>
                  ))}
                  {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
                    <div className="empty-state">No hay actividad reciente registrada.</div>
                  )}
                </div>
              </div>

              <div className="panel branch-panel">
                <div className="panel-header-mini">
                  <h3><i className="fas fa-map-marker-alt"></i> Tickets por Sucursal</h3>
                </div>
                <div className="branch-stats-list">
                  {stats?.branch_stats?.map((branch, i) => (
                    <div key={i} className="branch-stat-item">
                      <div className="branch-name-info">
                        <span className="branch-rank">{i + 1}</span>
                        <span>{branch.name}</span>
                      </div>
                      <div className="branch-progress-container">
                        <div className="branch-progress-bar" style={{ width: `${(branch.count / stats.total_tickets) * 100}%` }}></div>
                        <span className="branch-count-val">{branch.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'tickets':
        if (viewMode === 'view' && selectedTicket) {
          return <TicketDetailView ticket={selectedTicket} onEdit={() => setViewMode('edit')} onBack={() => { setViewMode('list'); setSelectedTicket(null); }} />;
        }
        if (viewMode === 'edit' && selectedTicket) {
          return <TicketEditView ticket={selectedTicket} onSave={handleSaveTicket} onBack={() => setViewMode('view')} />;
        }
        return (
          <div className="panel" style={{ padding: '2rem' }}>
            <div className="panel-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Gestión de Tickets</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Mostrando {tickets.length > 0 ? indexOfFirstTicket + 1 : 0} - {Math.min(indexOfLastTicket, tickets.length)} de {tickets.length} tickets
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="nav-item" style={{ background: 'var(--primary)', color: 'white', padding: '0.75rem 1.5rem', border: 'none' }}>
                  <i className="fas fa-plus"></i> Nuevo Ticket
                </button>
              </div>
            </div>

            <Pagination />

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Registro / Cierre</th>
                    <th>Usuario / Sucursal</th>
                    <th>Estado</th>
                    <th>Agente / Colaboradores</th>
                    <th>SLA / 1º Rpta</th>
                    <th>Demora</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td style={{ fontWeight: '800', color: 'var(--primary)' }}>#{ticket.ticket_number}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{ticket.creation_date}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {ticket.close_date && ticket.close_date !== 'Sin cierre' && ticket.close_date !== 'None' ? ticket.close_date : 'En proceso'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{ticket.user || 'S/U'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ticket.branch || 'S/D'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge status-${ticket.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: getAgentColor(ticket.agent), textShadow: ticket.agent && ticket.agent !== 'Sin asignar' && ticket.agent !== 'S/A' ? '0 0 10px rgba(0,0,0,0.5)' : 'none' }}>
                            {ticket.agent || 'Sin asignar'}
                          </span>
                          {ticket.collaborators && ticket.collaborators !== 'None' && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ticket.collaborators}>
                              <i className="fas fa-users" style={{ marginRight: '4px' }}></i>
                              {ticket.collaborators}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className={`sla-badge ${ticket.sla_resolution?.toLowerCase() === 'correcto' ? 'sla-ok' : 'sla-warn'}`}>
                            {ticket.sla_resolution || 'N/A'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <i className="far fa-clock" style={{ marginRight: '4px' }}></i>
                            {ticket.first_response || '--'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: '800',
                          color: (() => {
                            const days = parseInt(ticket.delay) || 0;
                            if (days === 0) return '#10b981'; // Verde
                            if (days <= 3) return '#f59e0b'; // Amarillo
                            if (days <= 7) return '#ef4444'; // Rojo
                            return '#ec4899'; // Rosa fuerte
                          })()
                        }}>
                          {ticket.delay || '0 días'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="action-btn view" title="Ver Detalles" onClick={() => { setSelectedTicket(ticket); setViewMode('view'); }}><i className="fas fa-eye"></i></button>
                          <button className="action-btn edit" title="Editar" onClick={() => { setSelectedTicket(ticket); setViewMode('edit'); }}><i className="fas fa-edit"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'database':
        return (
          <div className="panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
            <div className="brand-icon" style={{ margin: '0 auto 2rem', width: '80px', height: '80px', fontSize: '2.5rem' }}>
              <i className="fas fa-file-excel"></i>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>Sincronizar Base de Datos</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
              Selecciona el archivo Excel con los nuevos tickets. El sistema detectará automáticamente cuáles son nuevos para no duplicar información.
            </p>

            <div className="upload-box" style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed var(--glass-border)', borderRadius: '1.5rem', padding: '3rem', position: 'relative' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept=".xlsx,.xls"
                style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, opacity: 0, cursor: 'pointer' }}
              />
              <i className="fas fa-cloud-upload-alt" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem', display: 'block' }}></i>
              <span style={{ fontWeight: 600 }}>{uploadStatus.loading ? 'Cargando...' : 'Haz clic o arrastra el archivo aquí'}</span>
            </div>

            {uploadStatus.message && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '12px',
                background: uploadStatus.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: uploadStatus.type === 'error' ? 'var(--danger)' : 'var(--success)',
                fontWeight: 600,
                border: `1px solid ${uploadStatus.type === 'error' ? 'var(--danger)' : 'var(--success)'}`
              }}>
                <i className={`fas ${uploadStatus.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`} style={{ marginRight: '8px' }}></i>
                {uploadStatus.message}
              </div>
            )}
          </div>
        );
      case 'servers':
        return ServerMonitoringView();
      default:
        return <div>Página no encontrada</div>;
    }
  };

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><i className="fas fa-bolt"></i></div>
          <span className="brand-name">TicketFlow</span>
        </div>
        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setCurrentPage(1); setViewMode('list'); }}>
            <i className="fas fa-home"></i><span>Inicio</span>
          </div>
          <div className={`nav-item ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => { setActiveTab('tickets'); setCurrentPage(1); setViewMode('list'); }}>
            <i className="fas fa-ticket-alt"></i><span>Tickets</span>
          </div>
          <div className={`nav-item ${activeTab === 'database' ? 'active' : ''}`} onClick={() => { setActiveTab('database'); setCurrentPage(1); setViewMode('list'); }}>
            <i className="fas fa-database"></i><span>Base de Datos</span>
          </div>
          <div className={`nav-item ${activeTab === 'servers' ? 'active' : ''}`} onClick={() => { setActiveTab('servers'); setCurrentPage(1); setViewMode('list'); }}>
            <i className="fas fa-server"></i><span>Servidores</span>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div className="nav-item"><i className="fas fa-cog"></i><span>Configuración</span></div>
          </div>
        </nav>
      </aside>
      <main className="main-layout">
        <header className="header-top">
          <div className="welcome-section">
            <h1>Bienvenido, Juan</h1>
          </div>
          <div className="user-profile">
            <span style={{ fontWeight: 600 }}>Juan Billiot</span>
            <div className="avatar">JB</div>
          </div>
        </header>
        <div className="content-container">
          {loading ? (
            <div className="section-placeholder">
              <i className="fas fa-circle-notch fa-spin"></i>
              <p>Sincronizando sistema...</p>
            </div>
          ) : renderContent()}
        </div>
      </main>
    </>
  )
}

export default App
