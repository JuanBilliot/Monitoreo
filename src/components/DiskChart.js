import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
} from '@mui/material';
import { Storage as StorageIcon } from '@mui/icons-material';

const DiskChart = ({ diskData }) => {
  const [loading, setLoading] = useState(true);
  const [disks, setDisks] = useState([]);
  const [totalSpace, setTotalSpace] = useState(0);
  const [usedSpace, setUsedSpace] = useState(0);
  const [freeSpace, setFreeSpace] = useState(0);

  // Colores para el gráfico
  const colors = ['#64FFDA', '#A463F2', '#FFCB2B', '#FF5E5B', '#5EEAD4'];

  useEffect(() => {
    if (diskData && diskData.length > 0) {
      setDisks(diskData);
      
      // Calcular totales
      let total = 0;
      let used = 0;
      
      diskData.forEach(disk => {
        // Convertir strings como "500GB" a números
        const totalMatch = disk.total ? disk.total.match(/(\d+(\.\d+)?)/g) : null;
        const usedMatch = disk.used ? disk.used.match(/(\d+(\.\d+)?)/g) : null;
        
        if (totalMatch && usedMatch) {
          const totalValue = parseFloat(totalMatch[0]);
          const usedValue = parseFloat(usedMatch[0]);
          
          total += totalValue;
          used += usedValue;
        }
      });
      
      setTotalSpace(total);
      setUsedSpace(used);
      setFreeSpace(total - used);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [diskData]);

  // Función para calcular el porcentaje de uso
  const calculatePercentage = (used, total) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress size={40} sx={{ color: '#64FFDA' }} />
      </Box>
    );
  }

  const usagePercentage = calculatePercentage(usedSpace, totalSpace);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <StorageIcon sx={{ color: '#64FFDA', mr: 1, fontSize: '1.2rem' }} />
        <Typography variant="body1" color="#64FFDA">
          Almacenamiento
        </Typography>
      </Box>

      <Grid container spacing={1}>
        <Grid item xs={12} md={6}>
          <Box sx={{ 
            position: 'relative', 
            width: '180px', 
            height: '90px', 
            margin: '0 auto',
            mt: 1
          }}>
            {/* Valor central */}
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, 0%)',
              textAlign: 'center',
              zIndex: 2
            }}>
              <Typography variant="h5" color="#E6F1FF" sx={{ fontWeight: 'bold' }}>
                {usagePercentage}%
              </Typography>
              <Typography variant="caption" color="#8892B0">
                Utilizado
              </Typography>
            </Box>
            
            {/* Gráfico semicircular */}
            <svg width="180" height="90" viewBox="0 0 200 100">
              {/* Fondo del gráfico */}
              <path 
                d="M 20,100 A 80,80 0 0,1 180,100" 
                fill="none" 
                stroke="rgba(100, 255, 218, 0.1)" 
                strokeWidth="12"
                strokeLinecap="round"
              />
              
              {/* Barra de progreso */}
              <path 
                d={`M 20,100 A 80,80 0 ${usagePercentage > 50 ? 1 : 0},1 ${20 + (160 * usagePercentage / 100)},${100 - Math.sin(Math.PI * usagePercentage / 100) * 80}`} 
                fill="none" 
                stroke={
                  usagePercentage > 90 ? '#ff4444' :
                  usagePercentage > 70 ? '#ffbb33' : '#64FFDA'
                } 
                strokeWidth="12"
                strokeLinecap="round"
              />
            </svg>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="#8892B0">Total:</Typography>
                <Typography variant="body2" color="#E6F1FF">{totalSpace} GB</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="#8892B0">Usado:</Typography>
                <Typography variant="body2" color="#E6F1FF">{usedSpace} GB</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="#8892B0">Libre:</Typography>
                <Typography variant="body2" color="#E6F1FF">{freeSpace} GB</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="#8892B0">Discos:</Typography>
                <Typography variant="body2" color="#E6F1FF">{disks.length}</Typography>
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>

      {/* Lista de discos */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="#8892B0" gutterBottom>
          Particiones
        </Typography>
        <Grid container spacing={1}>
          {disks.map((disk, index) => (
            <Grid item xs={12} key={index}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                p: 0.5,
                borderRadius: 1,
                bgcolor: 'rgba(17, 34, 64, 0.6)',
                mb: 0.5
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box 
                    sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      bgcolor: colors[index % colors.length],
                      mr: 0.5 
                    }} 
                  />
                  <Typography variant="caption" color="#E6F1FF">
                    {disk.mount}
                  </Typography>
                </Box>
                <Typography variant="caption" color="#8892B0">
                  {disk.used} / {disk.total}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default DiskChart;
