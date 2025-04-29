import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import Welcome from './components/Welcome';
import Login from './components/Login';
import ServerList from './components/ServerList';
import ServerDetails from './components/ServerDetails';
import WhiteLineRemover from './components/WhiteLineRemover';

// Inicializar servidores de ejemplo
const initializeServers = () => {
  const existingServers = localStorage.getItem('servers');
  if (!existingServers) {
    const initialServers = [
      {
        id: 1,
        name: 'Servidor Principal',
        ip_address: '192.168.1.100',
        status: 'active',
        type: 'Production',
        cpu_usage: 45,
        memory_usage: 60,
        disk_usage: 55,
      },
      {
        id: 2,
        name: 'Servidor Desarrollo',
        ip_address: '192.168.1.101',
        status: 'warning',
        type: 'Development',
        cpu_usage: 75,
        memory_usage: 80,
        disk_usage: 65,
      },
      {
        id: 3,
        name: 'Servidor Local',
        ip_address: '192.168.0.148',
        status: 'active',
        type: 'Production',
        cpu_usage: 30,
        memory_usage: 45,
        disk_usage: 40,
      }
    ];
    localStorage.setItem('servers', JSON.stringify(initialServers));
  }
};

initializeServers();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box
            sx={{
              height: '100vh',
              bgcolor: 'background.default',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              margin: 0,
              padding: 0,
              border: 'none',
              boxSizing: 'border-box'
            }}
          >
            <Routes>
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/servers" element={<ServerList />} />
              <Route path="/servers/:id" element={<ServerDetails />} />
              <Route path="/" element={<Navigate to="/welcome" replace />} />
            </Routes>
            <WhiteLineRemover />
          </Box>
        </motion.div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
