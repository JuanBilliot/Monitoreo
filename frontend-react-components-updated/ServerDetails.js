import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  AppBar,
  Toolbar,
  Paper,
  Grid,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Computer as ComputerIcon,
  Build as BuildIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import LatencyChart from './LatencyChart';
import DiskChart from './DiskChart';
import EditServerDialog from './EditServerDialog';

const ServerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [server, setServer] = useState({
    id: null,
    name: '',
    ip: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    cpu: {
      usage: 0,
      model: 'Desconocido',
      speed: 0,
      cores: 0,
      temperature: 'N/A',
      history: []
    },
    memory: {
      usage: 0,
      total: 0,
      modules: [],
      swap: {
        total: 0,
        used: 0,
        free: 0,
        usage: 0
      },
      history: []
    },
    system: {
      hostname: 'Desconocido',
      platform: 'Desconocido',
      release: 'Desconocido',
      uptime: 0,
      arch: 'Desconocido',
      disk: [],
      network: [],
      processes: 0
    },
    alerts: [],
    lastUpdate: 0,
    lastLatency: 0,
    packetsSent: 0,
    packetsReceived: 0,
    error: ''
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Cargar servidores del localStorage
  useEffect(() => {
    const loadServers = () => {
      try {
        const servers = JSON.parse(localStorage.getItem('servers') || '[]');
        return servers;
      } catch (error) {
        console.error('Error al cargar servidores:', error);
        return [];
      }
    };

    const servers = loadServers();
    const serverData = servers.find(s => s.id === parseInt(id));
    
    if (serverData) {
      setServer({
        id: serverData.id,
        name: serverData.name,
        ip: serverData.ip_address,
        description: serverData.description || ''
      });
      setLoading(false);
    } else {
      setError('Servidor no encontrado');
      setLoading(false);
    }
  }, [id]);

  // Manejar la conexión WebSocket
  useEffect(() => {
    // Solo intentar conectar si el servidor está cargado
    if (loading || error || !server?.id) {
      return;
    }

    console.log('Intentando conectar a:', `ws://localhost:3001/latency?ip=${encodeURIComponent(server.ip)}`);

    // Generar datos de prueba localmente
    const generateMockData = () => {
      setStats(prevStats => {
        // Incrementar contadores
        const packetsSent = prevStats.packetsSent + 1;
        const packetsReceived = prevStats.packetsReceived + (Math.random() > 0.1 ? 1 : 0); // 10% de pérdida
        const lastLatency = Math.random() * 100; // Latencia entre 0-100ms
        
        // Generar datos aleatorios para CPU y memoria
        const cpuUsage = Math.floor(Math.random() * 100);
        const memoryUsage = Math.floor(Math.random() * 100);
        
        // Datos de discos simulados más detallados
        const diskData = [
          { 
            mount: '/', 
            total: '500GB', 
            used: `${Math.floor(250 + Math.random() * 50)}GB`, 
            available: `${Math.floor(200 + Math.random() * 50)}GB`, 
            usage: `${Math.floor(50 + Math.random() * 10)}%` 
          },
          { 
            mount: '/home', 
            total: '1000GB', 
            used: `${Math.floor(400 + Math.random() * 100)}GB`, 
            available: `${Math.floor(500 + Math.random() * 100)}GB`, 
            usage: `${Math.floor(40 + Math.random() * 10)}%` 
          },
          { 
            mount: '/var', 
            total: '200GB', 
            used: `${Math.floor(80 + Math.random() * 20)}GB`, 
            available: `${Math.floor(100 + Math.random() * 20)}GB`, 
            usage: `${Math.floor(40 + Math.random() * 10)}%` 
          }
        ];
        
        return {
          ...prevStats,
          packetsSent,
          packetsReceived,
          lastLatency,
          lastUpdate: Date.now(),
          cpu: {
            ...prevStats.cpu,
            usage: cpuUsage,
            model: 'Intel Core i7 (Simulado)',
            speed: 3200,
            cores: 8,
            temperature: '45.5',
            history: []
          },
          memory: {
            ...prevStats.memory,
            usage: memoryUsage,
            total: 16 * 1024 * 1024 * 1024, // 16GB
            modules: [{ size: '16GB', type: 'DDR4' }],
            swap: {
              total: 8 * 1024 * 1024 * 1024, // 8GB
              used: 2 * 1024 * 1024 * 1024,  // 2GB
              free: 6 * 1024 * 1024 * 1024,  // 6GB
              usage: 25
            },
            history: []
          },
          system: {
            ...prevStats.system,
            hostname: 'servidor-simulado',
            platform: 'Linux',
            release: '5.15.0',
            uptime: prevStats.system.uptime + 1,
            arch: 'x64',
            disk: diskData,
            network: [
              { name: 'eth0', addresses: [server.ip] }
            ],
            processes: 120
          }
        };
      });
    };
    
    // Iniciar el intervalo para generar datos de prueba
    const mockDataInterval = setInterval(generateMockData, 1000);
    
    // Intentar conectar al WebSocket real
    let ws;
    try {
      ws = new WebSocket(`ws://localhost:3001/latency?ip=${encodeURIComponent(server.ip)}`);

      ws.onopen = () => {
        console.log('Conexión WebSocket establecida');
        setSnackbar({
          open: true,
          message: 'Conectado al servidor',
          severity: 'success'
        });
        
        // Si la conexión WebSocket es exitosa, detener la generación de datos de prueba
        clearInterval(mockDataInterval);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Mensaje recibido:', data);
          
          if (data.type === 'latency') {
            // Actualizar estadísticas de ping
            setStats(prevStats => ({
              ...prevStats,
              lastLatency: data.stats.lastLatency,
              packetsSent: data.stats.packetsSent,
              packetsReceived: data.stats.packetsReceived,
              error: data.stats.error,
              lastUpdate: Date.now()
            }));
          } else if (data.stats) {
            // Actualizar estadísticas generales
            setStats(prevStats => ({
              ...prevStats,
              ...data.stats,
              lastUpdate: Date.now()
            }));
          }
        } catch (error) {
          console.error('Error al procesar mensaje WebSocket:', error);
          setError('Error al procesar datos del servidor');
        }
      };

      ws.onerror = (error) => {
        console.error('Error en la conexión WebSocket:', error);
        // No establecer error para permitir que los datos de prueba se muestren
        // setError('Error al conectar con el servidor');
      };

      ws.onclose = () => {
        console.log('Conexión WebSocket cerrada');
        // No establecer error para permitir que los datos de prueba se muestren
        // setError('Conexión con el servidor perdida');
      };

    } catch (error) {
      console.error('Error al conectar con el servidor:', error);
      // No establecer error para permitir que los datos de prueba se muestren
      // setError('Error al conectar con el servidor');
    }

    return () => {
      if (ws) {
        ws.close();
      }
      clearInterval(mockDataInterval);
    };
  }, [server?.ip, server?.id, loading, error]);

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
  };

  const handleEditSave = async (formData) => {
    try {
      const servers = JSON.parse(localStorage.getItem('servers') || '[]');
      const updatedServers = servers.map(server => 
        server.id === parseInt(id) ? { 
          ...server, 
          name: formData.name, 
          ip_address: formData.ip, 
          description: formData.description 
        } : server
      );
      localStorage.setItem('servers', JSON.stringify(updatedServers));
      setServer(prev => ({ ...prev, ...formData }));
      setSnackbar({
        open: true,
        message: 'Cambios guardados exitosamente',
        severity: 'success'
      });
      handleEditClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Error al guardar los cambios',
        severity: 'error'
      });
    }
  };

  const getMetricColor = (value) => {
    if (value >= 90) return '#ff4444';
    if (value >= 70) return '#ffbb33';
    return '#00C851';
  };

  const getMetricValue = (metric) => {
    if (!metric || typeof metric !== 'number') {
      return 0;
    }
    return Math.min(Math.max(metric, 0), 100);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: '#0a192f',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 3,
          minHeight: '100vh',
          background: '#0a192f',
          color: '#8892B0',
        }}
      >
        <Typography variant="h6" color="error">
          {error}
        </Typography>
        <IconButton onClick={() => navigate('/servers')} sx={{ mt: 2, color: '#64FFDA' }}>
          <ArrowBackIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 1, 
      background: 'linear-gradient(135deg, #112240 0%, #0A192F 100%)',
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
      <AppBar 
        position="static" 
        sx={{ 
          background: 'rgba(10, 25, 47, 0.8)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid rgba(100, 255, 218, 0.1)',
          borderRadius: 2,
          mb: 1
        }}
      >
        <Toolbar variant="dense">
          <IconButton onClick={() => navigate('/servers')} size="small">
            <ArrowBackIcon sx={{ color: '#64FFDA' }} />
          </IconButton>
          <Typography variant="body1" color="#64FFDA" sx={{ flexGrow: 1, ml: 1 }}>
            {server.name}
          </Typography>
          <IconButton onClick={handleEdit} size="small">
            <EditIcon sx={{ color: '#64FFDA' }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Grid container spacing={1}>
        {/* Información básica y métricas principales */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ 
            p: 1.5, 
            background: 'rgba(10, 25, 47, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(100, 255, 218, 0.1)',
            borderRadius: 2,
            height: '100%'
          }}>
            <Typography variant="body1" color="#64FFDA" gutterBottom>
              Información del Servidor
            </Typography>
            
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="#8892B0" gutterBottom>
                IP
              </Typography>
              <Typography variant="body2" color="#E6F1FF">
                {server.ip}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="#8892B0" gutterBottom>
                Descripción
              </Typography>
              <Typography variant="body2" color="#E6F1FF">
                {server.description || 'Sin descripción'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="#8892B0" gutterBottom>
                Sistema
              </Typography>
              <Typography variant="body2" color="#E6F1FF">
                {stats.system.platform || 'Desconocido'} {stats.system.release || ''}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="#8892B0" gutterBottom>
                Tiempo de actividad
              </Typography>
              <Typography variant="body2" color="#E6F1FF">
                {Math.floor((stats.system.uptime || 0) / 3600)} horas
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Gráfico de latencia */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ 
            p: 1.5, 
            background: 'rgba(10, 25, 47, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(100, 255, 218, 0.1)',
            borderRadius: 2,
            height: '100%'
          }}>
            <Typography variant="body1" color="#64FFDA" gutterBottom>
              Latencia
            </Typography>
            <LatencyChart stats={stats} />
          </Paper>
        </Grid>
        
        {/* Métricas de CPU y RAM */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 1.5, 
            background: 'rgba(10, 25, 47, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(100, 255, 218, 0.1)',
            borderRadius: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ComputerIcon sx={{ color: '#64FFDA', mr: 1, fontSize: '1.2rem' }} />
              <Typography variant="body1" color="#64FFDA">
                CPU
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="#8892B0">
                  Uso
                </Typography>
                <Typography variant="caption" color="#E6F1FF">
                  {getMetricValue(stats.cpu.usage)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getMetricValue(stats.cpu.usage)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(100, 255, 218, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getMetricColor(stats.cpu.usage),
                  },
                }}
              />
            </Box>
            
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="#8892B0" gutterBottom>
                    Modelo
                  </Typography>
                  <Typography variant="body2" color="#E6F1FF" noWrap>
                    {stats.cpu.model || 'Desconocido'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="#8892B0" gutterBottom>
                    Núcleos
                  </Typography>
                  <Typography variant="body2" color="#E6F1FF">
                    {stats.cpu.cores || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 1.5, 
            background: 'rgba(10, 25, 47, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(100, 255, 218, 0.1)',
            borderRadius: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <BuildIcon sx={{ color: '#64FFDA', mr: 1, fontSize: '1.2rem' }} />
              <Typography variant="body1" color="#64FFDA">
                Memoria
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="#8892B0">
                  Uso
                </Typography>
                <Typography variant="caption" color="#E6F1FF">
                  {getMetricValue(stats.memory.usage)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getMetricValue(stats.memory.usage)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(100, 255, 218, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getMetricColor(stats.memory.usage),
                  },
                }}
              />
            </Box>
            
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="#8892B0" gutterBottom>
                    Total
                  </Typography>
                  <Typography variant="body2" color="#E6F1FF">
                    {stats.memory.total ? `${(stats.memory.total / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="#8892B0" gutterBottom>
                    Swap
                  </Typography>
                  <Typography variant="body2" color="#E6F1FF">
                    {stats.memory.swap && stats.memory.swap.total ? 
                      `${(stats.memory.swap.total / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Gráfico de Discos */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 1.5, 
            background: 'rgba(10, 25, 47, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(100, 255, 218, 0.1)',
            borderRadius: 2,
            height: '100%'
          }}>
            <DiskChart diskData={stats.system.disk || []} />
          </Paper>
        </Grid>
        
        {/* Información de red */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 1.5, 
            background: 'rgba(10, 25, 47, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(100, 255, 218, 0.1)',
            borderRadius: 2,
            height: '100%'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TimerIcon sx={{ color: '#64FFDA', mr: 1, fontSize: '1.2rem' }} />
              <Typography variant="body1" color="#64FFDA">
                Estadísticas de Red
              </Typography>
            </Box>
            
            <Grid container spacing={1}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ 
                  p: 1, 
                  background: 'rgba(17, 34, 64, 0.6)',
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" color="#8892B0" gutterBottom>
                    Paquetes Enviados
                  </Typography>
                  <Typography variant="body2" color="#E6F1FF">
                    {stats.packetsSent}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ 
                  p: 1, 
                  background: 'rgba(17, 34, 64, 0.6)',
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" color="#8892B0" gutterBottom>
                    Paquetes Recibidos
                  </Typography>
                  <Typography variant="body2" color="#E6F1FF">
                    {stats.packetsReceived}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ 
                  p: 1, 
                  background: 'rgba(17, 34, 64, 0.6)',
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" color="#8892B0" gutterBottom>
                    Última Actualización
                  </Typography>
                  <Typography variant="body2" color="#E6F1FF">
                    {stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleTimeString() : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ 
                  p: 1, 
                  background: 'rgba(17, 34, 64, 0.6)',
                  borderRadius: 1,
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" color="#8892B0" gutterBottom>
                    Procesos
                  </Typography>
                  <Typography variant="body2" color="#E6F1FF">
                    {stats.system.processes || 0}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="#8892B0" gutterBottom>
                Interfaces de Red
              </Typography>
              <Grid container spacing={1}>
                {stats.system.network && stats.system.network.map((iface, index) => (
                  <Grid item xs={12} key={index}>
                    <Box sx={{ 
                      p: 0.5, 
                      background: 'rgba(17, 34, 64, 0.6)',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <Typography variant="caption" color="#E6F1FF">
                        {iface.name}
                      </Typography>
                      <Typography variant="caption" color="#8892B0">
                        {iface.addresses && iface.addresses.length > 0 ? iface.addresses[0] : 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Diálogo de edición */}
      <EditServerDialog
        open={editDialogOpen}
        onClose={handleEditClose}
        onSave={handleEditSave}
        server={server}
      />

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ServerDetails;
