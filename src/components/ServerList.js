import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  AppBar,
  Toolbar,
  Chip,
  CircularProgress,
  LinearProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  ExitToApp as ExitToAppIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import AddServerModal from './AddServerModal';

const ServerList = () => {
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = () => {
    try {
      const storedServers = JSON.parse(localStorage.getItem('servers') || '[]');
      setServers(storedServers);
    } catch (error) {
      console.error('Error al cargar servidores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServerClick = (serverId) => {
    navigate(`/servers/${serverId}`);
  };

  const getMetricColor = (value) => {
    if (value >= 80) return '#FF4444';
    if (value >= 60) return '#FFB300';
    return '#00C851';
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #112240 0%, #0A192F 100%)',
      padding: 3,
    }}>
      <AppBar position="static" sx={{ 
        background: 'rgba(10, 25, 47, 0.8)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid rgba(100, 255, 218, 0.1)',
        marginBottom: 4,
        borderRadius: 2,
      }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: '#E6F1FF' }}>
            Servidores
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setModalOpen(true)}
            sx={{ mr: 2 }}
          >
            <AddIcon sx={{ color: '#64FFDA' }} />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={() => navigate('/login')}
          >
            <ExitToAppIcon sx={{ color: '#64FFDA' }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 120px)',
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {servers.map((server) => (
            <Grid item xs={12} sm={6} md={4} key={server.id}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleServerClick(server.id)}
                style={{ cursor: 'pointer' }}
              >
                <Card
                  sx={{
                    height: '100%',
                    background: 'rgba(17, 34, 64, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(100, 255, 218, 0.1)',
                    borderRadius: 2,
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" color="#64FFDA" gutterBottom>
                      {server.name}
                    </Typography>
                    <Typography variant="body2" color="#8892B0" gutterBottom>
                      IP: {server.ip_address}
                    </Typography>
                    <Chip
                      label={server.status === 'active' ? 'En línea' : 'Desconectado'}
                      color={server.status === 'active' ? 'success' : 'error'}
                      size="small"
                      sx={{
                        backgroundColor: server.status === 'active' ? '#00C8511A' : '#FF44441A',
                        color: server.status === 'active' ? '#00C851' : '#FF4444',
                        mb: 2,
                      }}
                    />

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="#8892B0" gutterBottom>
                        CPU
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={server.cpu_usage}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: 'rgba(100, 255, 218, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getMetricColor(server.cpu_usage),
                          },
                        }}
                      />
                      <Typography variant="body2" color="#E6F1FF" align="right">
                        {server.cpu_usage}%
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="#8892B0" gutterBottom>
                        RAM
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={server.memory_usage}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: 'rgba(100, 255, 218, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getMetricColor(server.memory_usage),
                          },
                        }}
                      />
                      <Typography variant="body2" color="#E6F1FF" align="right">
                        {server.memory_usage}%
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="#8892B0" gutterBottom>
                        Disco
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={server.disk_usage}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: 'rgba(100, 255, 218, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getMetricColor(server.disk_usage),
                          },
                        }}
                      />
                      <Typography variant="body2" color="#E6F1FF" align="right">
                        {server.disk_usage}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}

      <AddServerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(newServer) => {
          const updatedServers = [...servers, newServer];
          setServers(updatedServers);
          localStorage.setItem('servers', JSON.stringify(updatedServers));
          setModalOpen(false);
        }}
      />
    </Box>
  );
};

export default ServerList;
