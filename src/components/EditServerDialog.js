import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  IconButton,
  Alert,
  AlertTitle,
  Typography,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';

const EditServerDialog = ({ open, onClose, server, onSave }) => {
  const [formData, setFormData] = useState({
    name: server?.name || '',
    host: server?.host || '',
    description: server?.description || '',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name,
        host: server.host,
        description: server.description || '',
      });
    }
  }, [server]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validar que la IP/Host no esté vacía
      if (!formData.host.trim()) {
        throw new Error('La IP/Host es obligatoria');
      }
      
      // Validar que el nombre no esté vacío
      if (!formData.name.trim()) {
        throw new Error('El nombre es obligatorio');
      }

      // Llamada a la función onSave con los datos actualizados
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar los cambios');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <EditIcon sx={{ color: '#00C851' }} />
          <Typography variant="h6">Editar Servidor</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Nombre"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="IP/Host"
              name="host"
              value={formData.host}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
              helperText="Dirección IP o nombre de host del servidor"
            />
            <TextField
              label="Descripción"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
          </Stack>
        </form>
      </DialogContent>
      <DialogActions>
        <IconButton onClick={onClose} color="error" size="large">
          <CancelIcon />
        </IconButton>
        <IconButton type="submit" onClick={handleSubmit} color="success" size="large">
          <SaveIcon />
        </IconButton>
      </DialogActions>
    </Dialog>
  );
};

export default EditServerDialog;
