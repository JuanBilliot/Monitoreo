import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  CircularProgress, 
  IconButton,
  AppBar,
  Toolbar,
  Snackbar,
  Alert
} from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import RouterIcon from '@mui/icons-material/Router';
import LatencyChart from './LatencyChart';
import EditServerDialog from './EditServerDialog';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import DeveloperBoardIcon from '@mui/icons-material/DeveloperBoard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const ServerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState({
    id: null,
    name: '',
    ip: '',
    description: ''
  });
  const [stats, setStats] = useState({
    cpu: {
      usage: 0,
      cores: 0,
      temperature: 0,
      model: ''
    },
    memory: {
      total: 0,
      used: 0,
      free: 0,
      usage: 0
    },
    disk: {
      total: 0,
      used: 0,
      free: 0,
      usage: 0
    },
    disks: [], // Array para múltiples discos
    network: {
      upload: 0,
      download: 0,
      totalSent: 0,
      totalReceived: 0
    },
    latency: {
      current: 0,
      min: 0,
      max: 0,
      avg: 0,
      history: []
    },
    system: {
      hostname: '',
      platform: '',
      release: '',
      uptime: 0
    },
    packetsSent: 0,
    packetsReceived: 0,
    packetLoss: 0,
    lastUpdate: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

    console.log('Intentando conectar a:', `ws://localhost:3002/latency?ip=${encodeURIComponent(server.ip)}`);

    // Generar datos de prueba localmente
    const generateMockData = () => {
      setStats(prevStats => {
        // Incrementar contadores
        const packetsSent = prevStats.packetsSent + 5; // Simulamos 5 paquetes por prueba
        const packetsReceived = prevStats.packetsReceived + 5; // Sin pérdida de paquetes (más realista según ping real)
        const lastLatency = Math.random() * 100; // Latencia entre 0-100ms
        const minLatency = Math.min(prevStats.latency.min || lastLatency, lastLatency * 0.8);
        const maxLatency = Math.max(prevStats.latency.max || lastLatency, lastLatency * 1.2);
        const packetLoss = packetsSent - packetsReceived; // Pérdida de paquetes en unidades
        
        // Generar datos aleatorios para CPU y memoria
        const cpuUsage = Math.floor(Math.random() * 100);
        const memoryUsage = Math.floor(Math.random() * 100);
        
        // Datos de discos simulados más detallados
        const disksInfo = [
          {
            device: '/dev/sda1',
            mountpoint: '/',
            fstype: 'ext4',
            total: 500 * 1024 * 1024 * 1024, // 500 GB
            used: 300 * 1024 * 1024 * 1024,  // 300 GB
            free: 200 * 1024 * 1024 * 1024,  // 200 GB
            percent: 60
          },
          {
            device: '/dev/sdb1',
            mountpoint: '/home',
            fstype: 'ext4',
            total: 1000 * 1024 * 1024 * 1024, // 1 TB
            used: 400 * 1024 * 1024 * 1024,   // 400 GB
            free: 600 * 1024 * 1024 * 1024,   // 600 GB
            percent: 40
          },
          {
            device: '/dev/sdc1',
            mountpoint: '/var',
            fstype: 'ext4',
            total: 200 * 1024 * 1024 * 1024, // 200 GB
            used: 80 * 1024 * 1024 * 1024,   // 80 GB
            free: 120 * 1024 * 1024 * 1024,  // 120 GB
            percent: 40
          }
        ];
        
        return {
          ...prevStats,
          packetsSent,
          packetsReceived,
          lastLatency,
          minLatency,
          maxLatency,
          packetLoss,
          lastUpdate: Date.now(),
          latency: {
            current: lastLatency,
            min: minLatency,
            max: maxLatency,
            avg: (lastLatency + minLatency + maxLatency) / 3,
            history: [...(prevStats.latency?.history || []), {
              time: new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit', second: '2-digit'}),
              value: lastLatency
            }].slice(-30) // Mantener solo los últimos 30 puntos
          },
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
              used: 1 * 1024 * 1024 * 1024, // 1GB
              free: 7 * 1024 * 1024 * 1024, // 7GB
              usage: 12.5
            },
            history: []
          },
          system: {
            ...prevStats.system,
            hostname: 'server-' + server.id,
            platform: 'Linux',
            release: '5.15.0',
            uptime: prevStats.system.uptime + 1,
            arch: 'x64',
            network: [
              { name: 'eth0', addresses: [server.ip] }
            ],
            processes: Math.floor(100 + Math.random() * 50)
          },
          disk: disksInfo[0], // Usar el primer disco como principal
          disks: disksInfo, // Añadir todos los discos
          network: {
            ...prevStats.network,
            upload: Math.floor(Math.random() * 10 * 1024 * 1024), // 0-10 MB/s
            download: Math.floor(Math.random() * 50 * 1024 * 1024), // 0-50 MB/s
            totalSent: (prevStats.network?.totalSent || 0) + Math.floor(Math.random() * 10 * 1024 * 1024),
            totalReceived: (prevStats.network?.totalReceived || 0) + Math.floor(Math.random() * 50 * 1024 * 1024)
          }
        };
      });
    };
    
    // Iniciar el intervalo para generar datos de prueba
    const mockDataInterval = setInterval(generateMockData, 1000);
    
    // Intentar conectar al WebSocket real
    let ws;
    try {
      ws = new WebSocket(`ws://localhost:3002/latency?ip=${encodeURIComponent(server.ip)}`);

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
          console.log("Datos recibidos del servidor:", data);
          console.log("Datos combinados:", data);
          
          if (data.type === 'latency') {
            // Actualizar estadísticas de ping con los nuevos datos detallados
            setStats(prevStats => ({
              ...prevStats,
              lastLatency: data.stats.latency || 0,
              minLatency: data.stats.min_latency || 0,
              maxLatency: data.stats.max_latency || 0,
              packetsSent: data.stats.packets_sent || 0,
              packetsReceived: data.stats.packets_received || 0,
              packetLoss: data.stats.packet_loss || 0,
              error: data.stats.error || '',
              latency: {
                current: data.stats.latency || 0,
                min: data.stats.min_latency || prevStats.latency.min,
                max: data.stats.max_latency || prevStats.latency.max,
                avg: data.stats.avg_latency || prevStats.latency.avg,
                history: [...(prevStats.latency?.history || []), {
                  time: new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit', second: '2-digit'}),
                  value: data.stats.latency || 0
                }].slice(-30) // Mantener solo los últimos 30 puntos
              },
              lastUpdate: Date.now()
            }));
          } else if (data.stats) {
            // Actualizar estadísticas generales
            console.log('Recibidos datos del sistema:', data.stats);
            
            // Verificar si tenemos información de discos
            if (data.stats.disks) {
              console.log('Información de discos recibida:', data.stats.disks);
            } else {
              console.log('No se recibió información de discos, usando datos simulados');
            }
            
            // Crear datos simulados de discos para pruebas
            const simulatedDisks = [
              {
                device: '/dev/sda1',
                mountpoint: '/',
                fstype: 'ext4',
                total: 500 * 1024 * 1024 * 1024, // 500 GB
                used: 300 * 1024 * 1024 * 1024,  // 300 GB
                free: 200 * 1024 * 1024 * 1024,  // 200 GB
                percent: 60
              },
              {
                device: '/dev/sdb1',
                mountpoint: '/home',
                fstype: 'ext4',
                total: 1000 * 1024 * 1024 * 1024, // 1 TB
                used: 400 * 1024 * 1024 * 1024,   // 400 GB
                free: 600 * 1024 * 1024 * 1024,   // 600 GB
                percent: 40
              },
              {
                device: '/dev/sdc1',
                mountpoint: '/var',
                fstype: 'ext4',
                total: 200 * 1024 * 1024 * 1024, // 200 GB
                used: 80 * 1024 * 1024 * 1024,   // 80 GB
                free: 120 * 1024 * 1024 * 1024,  // 120 GB
                percent: 40
              }
            ];
            
            setStats(prevStats => ({
              ...prevStats,
              ...data.stats,
              // Usar datos reales si están disponibles, de lo contrario usar simulados
              disks: data.stats.disks || simulatedDisks,
              // Asegurar que disk también esté disponible para compatibilidad
              disk: data.stats.disk || (data.stats.disks && data.stats.disks.length > 0 ? data.stats.disks[0] : prevStats.disk),
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

  const handleEditClick = () => {
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

  // Función para obtener el color basado en el valor de la métrica
  const getMetricColor = (value) => {
    if (value === undefined || value === null) return '#64ffda'; // Color por defecto
    
    if (value < 60) return '#64ffda'; // Verde para valores bajos
    if (value < 80) return '#ffb74d'; // Amarillo para valores medios
    return '#ff5252'; // Rojo para valores altos
  };

  // Función para obtener el valor numérico de una métrica
  const getMetricValue = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? 0 : numValue;
    }
    return 0;
  };

  // Depurar información de discos
  useEffect(() => {
    if (stats.disks) {
      console.log('Información de discos disponible:', stats.disks);
    } else if (stats.disk) {
      console.log('Solo información de disco principal disponible:', stats.disk);
    } else {
      console.log('No hay información de discos disponible');
    }
  }, [stats.disks, stats.disk]);

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
    <Box 
      className="grid-bg"
      sx={{ 
        height: '100vh',
        width: '100%',
        backgroundColor: '#0a192f',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        border: 'none'
      }}
    >
      <AppBar 
        position="static" 
        className="premium-navbar"
        sx={{ 
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              edge="start" 
              color="inherit" 
              aria-label="back"
              onClick={() => navigate('/servers')}
              className="micro-interaction"
              sx={{ mr: 1 }}
            >
              <ArrowBackIcon className="neon-icon" />
            </IconButton>
            <Typography variant="h6" className="premium-title" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
              {server.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <Box className={`server-status ${stats.status === 'active' ? 'normal' : stats.status === 'warning' ? 'warning' : 'critical'}`}>
                <span className={`status-dot ${stats.status === 'active' ? 'success' : stats.status === 'warning' ? 'warning' : 'error'}`}></span>
                {stats.status === 'active' ? 'Normal' : stats.status === 'warning' ? 'Advertencia' : 'Crítico'}
              </Box>
            </Box>
          </Box>
          <Box>
            <IconButton 
              color="inherit" 
              onClick={handleEditClick}
              className="micro-interaction"
            >
              <EditIcon className="neon-icon" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Grid 
        container 
        spacing={4} 
        sx={{ 
          padding: '20px', 
          marginTop: '10px',
          height: 'calc(100vh - 64px)',
        }}
      >
        {/* Información del Servidor */}
        <Grid item xs={12} md={3}>
          <Paper 
            className="premium-card"
            sx={{ 
              height: '100%',
              background: 'rgba(10, 25, 47, 0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(100, 255, 218, 0.3)',
              boxShadow: '0 10px 30px -15px rgba(2, 12, 27, 0.7)',
              transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
              '&:hover': {
                boxShadow: '0 20px 30px -15px rgba(2, 12, 27, 0.8)',
                border: '1px solid rgba(100, 255, 218, 0.5)',
                transform: 'translateY(-5px)'
              }
            }}
          >
            <Box sx={{ padding: '16px' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(100, 255, 218, 0.1)',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}>
                <Typography variant="h6" sx={{ 
                  color: '#ccd6f6', 
                  fontSize: '1.25rem', 
                  fontWeight: 600,
                  textShadow: '0 0 10px rgba(100, 255, 218, 0.3)'
                }}>
                  Información del Servidor
                </Typography>
                <ComputerIcon sx={{ color: '#64ffda' }} />
              </Box>
              
              <Box sx={{ display: 'flex', height: 'calc(100% - 60px)' }}>
                {/* Icono de la app */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  width: '140px',
                  pr: 2,
                  borderRight: '1px solid rgba(100, 255, 218, 0.1)'
                }}>
                  <Box sx={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '12px', 
                    backgroundColor: 'rgba(10, 25, 47, 0.8)', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    mb: 2,
                    boxShadow: '0 0 20px rgba(100, 255, 218, 0.3)',
                    border: '2px solid rgba(100, 255, 218, 0.3)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {/* Fondo del logo con efecto de gradiente */}
                    <Box sx={{ 
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, rgba(100, 255, 218, 0.1) 0%, rgba(139, 233, 253, 0.1) 50%, rgba(255, 121, 198, 0.1) 100%)',
                      opacity: 0.7
                    }} />
                    
                    {/* Logo de la app - Usando un diseño de red */}
                    <Box sx={{ 
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <RouterIcon sx={{ fontSize: 50, color: '#64ffda', position: 'absolute' }} />
                      <Box sx={{ 
                        position: 'absolute',
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        border: '2px dashed rgba(100, 255, 218, 0.5)',
                        animation: 'spin 10s linear infinite'
                      }} />
                      <Box sx={{ 
                        position: 'absolute',
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        border: '2px dashed rgba(139, 233, 253, 0.5)',
                        animation: 'spin-reverse 8s linear infinite'
                      }} />
                    </Box>
                  </Box>
                  <Typography variant="body1" sx={{ color: '#64ffda', fontWeight: 600, textAlign: 'center' }}>
                    {server.name || 'Servidor'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#8892b0', textAlign: 'center', mt: 0.5 }}>
                    {server.ip || 'IP no disponible'}
                  </Typography>
                </Box>

                {/* Información del servidor */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', pl: 2, flex: 1, justifyContent: 'space-around' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DescriptionIcon sx={{ color: '#64ffda', mr: 1.5, fontSize: 24 }} />
                    <Typography variant="body1" sx={{ color: '#ccd6f6', fontSize: '1rem', fontWeight: 500 }}>
                      {server.description || 'Sin descripción'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DeveloperBoardIcon sx={{ color: '#64ffda', mr: 1.5, fontSize: 24 }} />
                    <Typography variant="body1" sx={{ color: '#ccd6f6', fontSize: '1rem', fontWeight: 500 }}>
                      {stats.system.platform || 'Desconocido'} {stats.system.release || ''}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTimeIcon sx={{ color: '#64ffda', mr: 1.5, fontSize: 24 }} />
                    <Typography variant="body1" sx={{ color: '#ccd6f6', fontSize: '1rem', fontWeight: 500 }}>
                      Uptime: {Math.floor((stats.system.uptime || 0) / 3600)} horas
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Almacenamiento */}
        <Grid item xs={12} md={3}>
          <Paper 
            className="premium-card"
            sx={{ 
              height: '100%',
              background: 'rgba(10, 25, 47, 0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(100, 255, 218, 0.3)',
              boxShadow: '0 10px 30px -15px rgba(2, 12, 27, 0.7)',
              transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
              '&:hover': {
                boxShadow: '0 20px 30px -15px rgba(2, 12, 27, 0.8)',
                border: '1px solid rgba(100, 255, 218, 0.5)',
                transform: 'translateY(-5px)'
              }
            }}
          >
            <Box sx={{ padding: '16px' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(100, 255, 218, 0.1)',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}>
                <Typography variant="h6" sx={{ 
                  color: '#ccd6f6', 
                  fontSize: '1.25rem', 
                  fontWeight: 600,
                  textShadow: '0 0 10px rgba(100, 255, 218, 0.3)'
                }}>
                  Almacenamiento
                </Typography>
                <DnsIcon sx={{ color: '#64ffda' }} />
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Si hay múltiples discos, mostrarlos */}
                {stats.disks && stats.disks.length > 0 ? (
                  <Box sx={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto', 
                    pr: 2, 
                    pl: 1, 
                    py: 1,
                    // Estilizar la barra de desplazamiento
                    '&::-webkit-scrollbar': {
                      width: '6px',
                      backgroundColor: 'rgba(100, 255, 218, 0.05)',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(100, 255, 218, 0.2)',
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      backgroundColor: 'rgba(100, 255, 218, 0.3)',
                    }
                  }}>
                    {stats.disks.map((disk, index) => (
                      <Box 
                        key={index} 
                        sx={{ 
                          mb: 6, 
                          mt: 2, 
                          p: 3, 
                          borderRadius: '12px',
                          backgroundColor: 'rgba(100, 255, 218, 0.05)',
                          border: '1px solid rgba(100, 255, 218, 0.1)',
                          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.15)',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: '-10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '40%',
                            height: '4px',
                            borderRadius: '2px',
                            backgroundColor: getMetricColor(disk.percent),
                            opacity: 0.7,
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(100, 255, 218, 0.08)',
                            transform: 'translateY(-3px)',
                            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2)'
                          },
                          '&:not(:last-child)': {
                            marginBottom: '50px',
                            paddingBottom: '10px',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              bottom: '-25px',
                              left: '0%',
                              width: '100%',
                              height: '1px',
                              background: 'linear-gradient(90deg, transparent, rgba(100, 255, 218, 0.4), transparent)',
                            }
                          }
                        }}
                      >
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: '#ccd6f6', 
                            mb: 1,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <Box 
                            component="span" 
                            sx={{ 
                              width: '10px', 
                              height: '10px', 
                              borderRadius: '50%', 
                              backgroundColor: getMetricColor(disk.percent),
                              display: 'inline-block'
                            }} 
                          />
                          {disk.mountpoint}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ position: 'relative', width: '60px', height: '60px', mr: 3 }}>
                            <CircularProgress 
                              variant="determinate" 
                              value={disk.percent} 
                              size={60}
                              thickness={4}
                              sx={{ 
                                color: getMetricColor(disk.percent),
                                '& .MuiCircularProgress-circle': {
                                  strokeLinecap: 'round',
                                }
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography variant="caption" sx={{ color: '#ccd6f6', fontWeight: 700 }}>
                                {disk.percent}%
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ flexGrow: 1 }}>
                            <Grid container spacing={3}>
                              <Grid item xs={6}>
                                <Box sx={{ 
                                  p: 1.5, 
                                  borderRadius: '8px', 
                                  backgroundColor: 'rgba(100, 255, 218, 0.03)',
                                  border: '1px solid rgba(100, 255, 218, 0.08)',
                                  mb: 2
                                }}>
                                  <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 1 }}>
                                    Total
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#ccd6f6', fontWeight: 600 }}>
                                    {(disk.total / (1024 * 1024 * 1024)).toFixed(1)} GB
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Box sx={{ 
                                  p: 1.5, 
                                  borderRadius: '8px', 
                                  backgroundColor: 'rgba(100, 255, 218, 0.03)',
                                  border: '1px solid rgba(100, 255, 218, 0.08)',
                                  mb: 2
                                }}>
                                  <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 1 }}>
                                    Libre
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#ccd6f6', fontWeight: 600 }}>
                                    {(disk.free / (1024 * 1024 * 1024)).toFixed(1)} GB
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </Box>
                        
                        <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', fontSize: '0.7rem' }}>
                          {disk.device} ({disk.fstype})
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  // Mostrar un solo disco como antes si no hay múltiples discos
                  <>
                    <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                      <CircularProgress 
                        variant="determinate" 
                        value={getMetricValue(stats.disk ? stats.disk.usage : 0)} 
                        size={120}
                        thickness={4}
                        sx={{ 
                          color: getMetricColor(stats.disk ? stats.disk.usage : 0),
                          '& .MuiCircularProgress-circle': {
                            strokeLinecap: 'round',
                          }
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h4" sx={{ color: '#ccd6f6', fontWeight: 700 }}>
                          {getMetricValue(stats.disk ? stats.disk.usage : 0)}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#8892b0' }}>
                          Total
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ccd6f6', fontWeight: 500 }}>
                          {stats.disk && stats.disk.total ? `${(stats.disk.total / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#8892b0' }}>
                          Libre
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ccd6f6', fontWeight: 500 }}>
                          {stats.disk && stats.disk.free ? `${(stats.disk.free / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* CPU */}
        <Grid item xs={12} md={3}>
          <Paper 
            className="premium-card"
            sx={{ 
              height: '100%',
              background: 'rgba(10, 25, 47, 0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(100, 255, 218, 0.3)',
              boxShadow: '0 10px 30px -15px rgba(2, 12, 27, 0.7)',
              transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
              '&:hover': {
                boxShadow: '0 20px 30px -15px rgba(2, 12, 27, 0.8)',
                border: '1px solid rgba(100, 255, 218, 0.5)',
                transform: 'translateY(-5px)'
              }
            }}
          >
            <Box sx={{ padding: '16px' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(100, 255, 218, 0.1)',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}>
                <Typography variant="h6" sx={{ 
                  color: '#ccd6f6', 
                  fontSize: '1.25rem', 
                  fontWeight: 600,
                  textShadow: '0 0 10px rgba(100, 255, 218, 0.3)'
                }}>
                  CPU
                </Typography>
                <MemoryIcon sx={{ color: '#64ffda' }} />
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', height: 'calc(100% - 60px)' }}>
                <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={getMetricValue(stats.cpu.usage)} 
                    size={120}
                    thickness={4}
                    sx={{ 
                      color: getMetricColor(stats.cpu.usage),
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      }
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h6" sx={{ color: '#ccd6f6', fontWeight: 700 }}>
                      {getMetricValue(stats.cpu.usage)}%
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={2} sx={{ width: '100%' }}>
                  <Grid item xs={6}>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(100, 255, 218, 0.03)',
                      border: '1px solid rgba(100, 255, 218, 0.08)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 1 }}>
                        Núcleos Físicos
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ccd6f6', fontWeight: 600 }}>
                        {stats.cpu.cores || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(100, 255, 218, 0.03)',
                      border: '1px solid rgba(100, 255, 218, 0.08)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 1 }}>
                        Núcleos Lógicos
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ccd6f6', fontWeight: 600 }}>
                        {stats.cpu.logical_cores || stats.cpu.cores || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Box sx={{ 
                  p: 2, 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(100, 255, 218, 0.03)',
                  border: '1px solid rgba(100, 255, 218, 0.08)',
                  width: '100%',
                  mt: 'auto'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mt: 2,
                    pt: 2,
                    borderTop: '1px dashed rgba(100, 255, 218, 0.1)'
                  }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block' }}>
                        Frecuencia
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ccd6f6' }}>
                        {stats.cpu.speed || 3200} MHz
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block' }}>
                        Temperatura
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ccd6f6' }}>
                        {stats.cpu.temperature || '45.5'}°C
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Memoria */}
        <Grid item xs={12} md={3}>
          <Paper 
            className="premium-card"
            sx={{ 
              height: '100%',
              background: 'rgba(10, 25, 47, 0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(100, 255, 218, 0.3)',
              boxShadow: '0 10px 30px -15px rgba(2, 12, 27, 0.7)',
              transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
              '&:hover': {
                boxShadow: '0 20px 30px -15px rgba(2, 12, 27, 0.8)',
                border: '1px solid rgba(100, 255, 218, 0.5)',
                transform: 'translateY(-5px)'
              }
            }}
          >
            <Box sx={{ padding: '16px' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(100, 255, 218, 0.1)',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}>
                <Typography variant="h6" sx={{ 
                  color: '#ccd6f6', 
                  fontSize: '1.25rem', 
                  fontWeight: 600,
                  textShadow: '0 0 10px rgba(100, 255, 218, 0.3)'
                }}>
                  Memoria
                </Typography>
                <StorageIcon sx={{ color: '#64ffda' }} />
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100% - 60px)' }}>
                <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={getMetricValue(stats.memory ? stats.memory.usage : 0)} 
                    size={120}
                    thickness={4}
                    sx={{ 
                      color: getMetricColor(stats.memory ? stats.memory.usage : 0),
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      }
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h6" sx={{ color: '#ccd6f6', fontWeight: 700 }}>
                      {getMetricValue(stats.memory ? stats.memory.usage : 0)}%
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={2} sx={{ width: '100%' }}>
                  <Grid item xs={6}>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(100, 255, 218, 0.03)',
                      border: '1px solid rgba(100, 255, 218, 0.08)',
                      height: '100%'
                    }}>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 1 }}>
                        Total
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ccd6f6', fontWeight: 600 }}>
                        {stats.memory && stats.memory.total ? `${(stats.memory.total / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(100, 255, 218, 0.03)',
                      border: '1px solid rgba(100, 255, 218, 0.08)',
                      height: '100%'
                    }}>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 1 }}>
                        Libre
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ccd6f6', fontWeight: 600 }}>
                        {stats.memory && stats.memory.free ? `${(stats.memory.free / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Información adicional de memoria */}
                <Box sx={{ 
                  p: 2, 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(100, 255, 218, 0.03)',
                  border: '1px solid rgba(100, 255, 218, 0.08)',
                  width: '100%',
                  mt: 'auto'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 2,
                    pt: 2,
                    borderTop: '1px dashed rgba(100, 255, 218, 0.1)'
                  }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block' }}>
                        En Uso
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ccd6f6' }}>
                        {stats.memory && stats.memory.used ? `${(stats.memory.used / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block' }}>
                        Caché
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ccd6f6' }}>
                        {stats.memory && stats.memory.cached ? `${(stats.memory.cached / (1024 * 1024 * 1024)).toFixed(1)} GB` : '0.5 GB'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Información de SWAP */}
                  {stats.memory && stats.memory.swap && (
                    <Box sx={{ 
                      pt: 2, 
                      borderTop: '1px dashed rgba(100, 255, 218, 0.1)'
                    }}>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 1 }}>
                        SWAP
                      </Typography>
                      <Box sx={{ 
                        width: '100%', 
                        height: '6px', 
                        backgroundColor: 'rgba(100, 255, 218, 0.1)',
                        borderRadius: '3px',
                        mb: 1,
                        overflow: 'hidden'
                      }}>
                        <Box 
                          sx={{ 
                            width: `${stats.memory.swap.usage || 10}%`, 
                            height: '100%', 
                            backgroundColor: getMetricColor(stats.memory.swap.usage || 10),
                            borderRadius: '3px',
                            transition: 'width 0.5s ease-in-out'
                          }} 
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#8892b0' }}>
                          {stats.memory.swap.used ? `${(stats.memory.swap.used / (1024 * 1024 * 1024)).toFixed(1)} GB` : '0.2 GB'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#8892b0' }}>
                          {stats.memory.swap.total ? `${(stats.memory.swap.total / (1024 * 1024 * 1024)).toFixed(1)} GB` : '2 GB'}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Latencia */}
        <Grid item xs={12} md={8}>
          <Paper 
            className="premium-card"
            sx={{ 
              height: '100%',
              background: 'rgba(10, 25, 47, 0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(100, 255, 218, 0.3)',
              boxShadow: '0 10px 30px -15px rgba(2, 12, 27, 0.7)',
              transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
              '&:hover': {
                boxShadow: '0 20px 30px -15px rgba(2, 12, 27, 0.8)',
                border: '1px solid rgba(100, 255, 218, 0.5)',
                transform: 'translateY(-5px)'
              },
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box 
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: 'rgba(100, 255, 218, 0.1)',
                color: '#64ffda',
                padding: '4px 12px',
                borderBottomLeftRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                animation: 'pulse 2s infinite'
              }}
            >
              <Box 
                component="span" 
                sx={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: '#64ffda',
                  boxShadow: '0 0 8px #64ffda',
                  animation: 'blink 1.5s infinite'
                }} 
              />
              {stats.latency.current.toFixed(2)} ms
            </Box>

            <Box sx={{ padding: '16px' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(100, 255, 218, 0.1)',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}>
                <Typography variant="h6" sx={{ 
                  color: '#ccd6f6', 
                  fontSize: '1.25rem', 
                  fontWeight: 600,
                  textShadow: '0 0 10px rgba(100, 255, 218, 0.3)'
                }}>
                  Latencia
                </Typography>
                <NetworkCheckIcon sx={{ color: '#64ffda' }} />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Box 
                    sx={{ 
                      height: '240px', 
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '30px',
                        background: 'linear-gradient(to top, rgba(10, 25, 47, 0.7), transparent)',
                        pointerEvents: 'none'
                      }
                    }}
                  >
                    <LatencyChart latencyData={stats.latency?.history || []} />
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%', 
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(100, 255, 218, 0.05)',
                      border: '1px solid rgba(100, 255, 218, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(100, 255, 218, 0.08)',
                        transform: 'translateY(-2px)'
                      }
                    }}>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 0.5 }}>
                        Mín
                      </Typography>
                      <Typography variant="h6" sx={{ 
                        color: '#64ffda', 
                        fontWeight: 700,
                        textShadow: '0 0 5px rgba(100, 255, 218, 0.5)'
                      }}>
                        {stats.latency.min.toFixed(2)} ms
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(100, 255, 218, 0.05)',
                      border: '1px solid rgba(100, 255, 218, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(100, 255, 218, 0.08)',
                        transform: 'translateY(-2px)'
                      }
                    }}>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 0.5 }}>
                        Prom
                      </Typography>
                      <Typography variant="h6" sx={{ 
                        color: '#ccd6f6', 
                        fontWeight: 700,
                        textShadow: '0 0 5px rgba(204, 214, 246, 0.3)'
                      }}>
                        {stats.latency.avg.toFixed(2)} ms
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(100, 255, 218, 0.05)',
                      border: '1px solid rgba(100, 255, 218, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(100, 255, 218, 0.08)',
                        transform: 'translateY(-2px)'
                      }
                    }}>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 0.5 }}>
                        Máx
                      </Typography>
                      <Typography variant="h6" sx={{ 
                        color: '#ff5555', 
                        fontWeight: 700,
                        textShadow: '0 0 5px rgba(255, 85, 85, 0.5)'
                      }}>
                        {stats.latency.max.toFixed(2)} ms
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(255, 121, 198, 0.05)',
                      border: '1px solid rgba(255, 121, 198, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 121, 198, 0.08)',
                        transform: 'translateY(-2px)'
                      }
                    }}>
                      <Typography variant="caption" sx={{ color: '#8892b0', display: 'block' }}>
                        Pérdida
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) ? '#ff5555' : '#ccd6f6', 
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {stats.packetsSent > 0 ? (stats.packetsSent - stats.packetsReceived) : 0} paquetes
                        {stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) && (
                          <span style={{ 
                            fontSize: '10px', 
                            color: '#ff5555', 
                            marginLeft: '5px',
                            padding: '2px 5px',
                            backgroundColor: 'rgba(255, 85, 85, 0.1)',
                            borderRadius: '4px'
                          }}>
                            Alerta
                          </span>
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Estadísticas de Red */}
        <Grid item xs={12} md={4}>
          <Paper 
            className="premium-card"
            sx={{ 
              height: '100%',
              background: 'rgba(10, 25, 47, 0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(100, 255, 218, 0.3)',
              boxShadow: '0 10px 30px -15px rgba(2, 12, 27, 0.7)',
              transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
              '&:hover': {
                boxShadow: '0 20px 30px -15px rgba(2, 12, 27, 0.8)',
                border: '1px solid rgba(100, 255, 218, 0.5)',
                transform: 'translateY(-5px)'
              }
            }}
          >
            <Box sx={{ padding: '16px' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(100, 255, 218, 0.1)',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}>
                <Typography variant="h6" sx={{ 
                  color: '#ccd6f6', 
                  fontSize: '1.25rem', 
                  fontWeight: 600,
                  textShadow: '0 0 10px rgba(100, 255, 218, 0.3)'
                }}>
                  Estadísticas de Red
                </Typography>
                <RouterIcon sx={{ color: '#64ffda' }} />
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100% - 60px)' }}>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(100, 255, 218, 0.05)',
                  border: '1px solid rgba(100, 255, 218, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#8892b0', display: 'flex', alignItems: 'center' }}>
                        <ArrowUpwardIcon sx={{ fontSize: 16, mr: 0.5, color: '#64ffda' }} />
                        Tráfico de Subida
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ccd6f6', fontWeight: 500 }}>
                        {stats.network ? ((stats.network.upload / 1024 / 1024).toFixed(2)) : '0.00'} MB/s
                      </Typography>
                    </Box>
                    <Box sx={{ position: 'relative', height: '8px', backgroundColor: 'rgba(100, 255, 218, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          height: '100%', 
                          width: `${Math.min((stats.network ? stats.network.upload : 0) / 10485.76, 100)}%`,
                          background: 'linear-gradient(90deg, rgba(100, 255, 218, 0.5) 0%, rgba(100, 255, 218, 0.8) 100%)',
                          borderRadius: '4px',
                          boxShadow: '0 0 8px rgba(100, 255, 218, 0.5)',
                          animation: 'pulse-horizontal 2s infinite'
                        }} 
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#8892b0', display: 'flex', alignItems: 'center' }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, mr: 0.5, color: '#8be9fd' }} />
                        Tráfico de Bajada
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ccd6f6', fontWeight: 500 }}>
                        {stats.network ? ((stats.network.download / 1024 / 1024).toFixed(2)) : '0.00'} MB/s
                      </Typography>
                    </Box>
                    <Box sx={{ position: 'relative', height: '8px', backgroundColor: 'rgba(139, 233, 253, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          height: '100%', 
                          width: `${Math.min((stats.network ? stats.network.download : 0) / 10485.76, 100)}%`,
                          background: 'linear-gradient(90deg, rgba(139, 233, 253, 0.5) 0%, rgba(139, 233, 253, 0.8) 100%)',
                          borderRadius: '4px',
                          boxShadow: '0 0 8px rgba(139, 233, 253, 0.5)',
                          animation: 'pulse-horizontal 2s infinite'
                        }} 
                      />
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '16px'
                }}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(100, 255, 218, 0.05)',
                    border: '1px solid rgba(100, 255, 218, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(100, 255, 218, 0.08)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 1 }}>
                      Paquetes Enviados
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      color: '#64ffda', 
                      fontWeight: 700,
                      textShadow: '0 0 5px rgba(100, 255, 218, 0.5)'
                    }}>
                      {stats.packetsSent}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(139, 233, 253, 0.05)',
                    border: '1px solid rgba(139, 233, 253, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(139, 233, 253, 0.08)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <Typography variant="caption" sx={{ color: '#8892b0', display: 'block', mb: 1 }}>
                      Paquetes Recibidos
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      color: '#8be9fd', 
                      fontWeight: 700,
                      textShadow: '0 0 5px rgba(139, 233, 253, 0.5)'
                    }}>
                      {stats.packetsReceived}
                    </Typography>
                  </Box>
                </Box>

                {/* Paquetes perdidos */}
                <Box sx={{ 
                  p: 2, 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(255, 121, 198, 0.05)',
                  border: '1px solid rgba(255, 121, 198, 0.1)',
                  mt: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#8892b0', display: 'block' }}>
                      Paquetes Perdidos
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) ? '#ff5555' : '#ccd6f6', 
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {stats.packetsSent > 0 ? (stats.packetsSent - stats.packetsReceived) : 0} paquetes
                      {stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) && (
                        <span style={{ 
                          fontSize: '10px', 
                          color: '#ff5555', 
                          marginLeft: '5px',
                          padding: '2px 5px',
                          backgroundColor: 'rgba(255, 85, 85, 0.1)',
                          borderRadius: '4px'
                        }}>
                          Alerta
                        </span>
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) ? 'rgba(255, 85, 85, 0.1)' : 'rgba(255, 121, 198, 0.1)',
                    boxShadow: stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) ? '0 0 10px rgba(255, 85, 85, 0.2)' : '0 0 10px rgba(255, 121, 198, 0.2)'
                  }}>
                    <ErrorOutlineIcon sx={{ 
                      fontSize: '20px', 
                      color: stats.packetsSent > 0 && ((stats.packetsSent - stats.packetsReceived) > 10) ? '#ff5555' : '#ff79c6' 
                    }} />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Diálogo de edición */}
      <EditServerDialog
        open={editDialogOpen}
        server={server}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleEditSave}
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
