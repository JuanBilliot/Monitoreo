import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { motion } from 'framer-motion';

function AddServerModal({ open, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    type: 'Production',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!formData.ip_address) {
      newErrors.ip_address = 'La dirección IP es requerida';
    } else {
      const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(formData.ip_address)) {
        newErrors.ip_address = 'Dirección IP inválida';
      }
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      setApiError('');
      
      try {
        // Obtener los servidores existentes
        const servers = JSON.parse(localStorage.getItem('servers')) || [];
        
        // Crear nuevo servidor con ID único
        const newServer = {
          ...formData,
          id: Date.now(),
          host: formData.ip_address, // Aseguramos que host también tenga la IP
          status: 'online', // Cambiamos 'active' a 'online' para consistencia
          cpu: Math.floor(Math.random() * 30), // Valores iniciales más realistas
          memory: Math.floor(Math.random() * 40),
          disk: Math.floor(Math.random() * 50),
        };

        // Simulamos la comunicación con el servidor (en una app real, esto sería una llamada API)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Agregar el nuevo servidor a la lista
        servers.push(newServer);
        
        // Guardar la lista actualizada
        localStorage.setItem('servers', JSON.stringify(servers));
        
        onAdd(newServer);
        setFormData({
          name: '',
          ip_address: '',
          type: 'Production',
        });
        onClose();
      } catch (error) {
        console.error('Error:', error);
        setApiError('Error al comunicarse con el servidor');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Agregar Servidor</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ width: '100%' }}>
            {apiError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {apiError}
              </Alert>
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TextField
                fullWidth
                label="Nombre"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                margin="normal"
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Dirección IP"
                name="ip_address"
                value={formData.ip_address}
                onChange={handleChange}
                error={!!errors.ip_address}
                helperText={errors.ip_address}
                margin="normal"
                disabled={loading}
              />
              <FormControl fullWidth margin="normal" disabled={loading}>
                <InputLabel>Tipo de Servidor</InputLabel>
                <Select
                  value={formData.type}
                  onChange={handleChange}
                  name="type"
                  label="Tipo de Servidor"
                >
                  <MenuItem value="Production">Producción</MenuItem>
                  <MenuItem value="Development">Desarrollo</MenuItem>
                  <MenuItem value="Testing">Pruebas</MenuItem>
                </Select>
              </FormControl>
            </motion.div>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
            endIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Agregando...' : 'Agregar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default AddServerModal;
