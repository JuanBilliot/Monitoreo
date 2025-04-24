import React, { useState, useEffect, forwardRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
} from '@mui/material';

// Componente mejorado con gráfico de área para latencia
const LatencyChart = forwardRef(({ stats }, ref) => {
  const [loading, setLoading] = useState(true);
  const [minLatency, setMinLatency] = useState(Infinity);
  const [maxLatency, setMaxLatency] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);
  const [latencyHistory, setLatencyHistory] = useState([]);
  const [avgLatencyHistory, setAvgLatencyHistory] = useState([]);
  
  // Número máximo de puntos a mostrar en el gráfico
  const MAX_HISTORY_POINTS = 20;

  React.useImperativeHandle(ref, () => ({
    updateSeries: () => {
      // Método vacío para compatibilidad
    }
  }));

  useEffect(() => {
    if (stats) {
      setLoading(false);
      
      const latency = stats.lastLatency;
      const packetsSent = stats.packetsSent || 0;
      const packetsReceived = stats.packetsReceived || 0;

      if (latency !== null && latency !== undefined) {
        setMinLatency(prev => Math.min(prev === Infinity ? latency : prev, latency));
        setMaxLatency(prev => Math.max(prev, latency));
        
        // Calcular el promedio con ponderación
        let newAvg = avgLatency;
        if (packetsReceived > 0) {
          newAvg = avgLatency === 0 
            ? latency 
            : avgLatency * 0.7 + latency * 0.3; // 70% valor anterior, 30% valor nuevo
          setAvgLatency(newAvg);
        }
        
        // Actualizar historiales de latencia
        setLatencyHistory(prev => {
          const newHistory = [...prev, latency];
          return newHistory.length > MAX_HISTORY_POINTS 
            ? newHistory.slice(-MAX_HISTORY_POINTS) 
            : newHistory;
        });
        
        setAvgLatencyHistory(prev => {
          const newHistory = [...prev, newAvg];
          return newHistory.length > MAX_HISTORY_POINTS 
            ? newHistory.slice(-MAX_HISTORY_POINTS) 
            : newHistory;
        });
      }

      if (packetsSent > 0) {
        setPacketLoss(((packetsSent - packetsReceived) / packetsSent * 100).toFixed(1));
      }
    }
  }, [stats, avgLatency]);

  const getStatusColor = () => {
    if (packetLoss > 10) return '#ff4444';
    if (avgLatency > 100) return '#ffbb33';
    return '#00C851';
  };

  const getStatusText = () => {
    if (packetLoss > 10) return 'Crítico';
    if (avgLatency > 100) return 'Advertencia';
    return 'Normal';
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '150px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Función para crear el gráfico de área SVG
  const createAreaChart = () => {
    if (latencyHistory.length < 2) return null;
    
    // Calcular dimensiones y escalas
    const width = 100;
    const height = 100;
    const maxValue = Math.max(...latencyHistory, ...avgLatencyHistory) * 1.1; // 10% más alto para margen
    
    // Crear puntos para el path
    const createPoints = (data) => {
      const points = [];
      const step = width / (data.length - 1);
      
      for (let i = 0; i < data.length; i++) {
        const x = i * step;
        const y = height - (data[i] / maxValue * height);
        points.push(`${x},${y}`);
      }
      
      return points;
    };
    
    // Crear path para el área
    const createAreaPath = (data) => {
      const points = createPoints(data);
      return `M0,${height} L${points.join(' L')} L${width},${height} Z`;
    };
    
    // Crear path para la línea
    const createLinePath = (data) => {
      const points = createPoints(data);
      return `M${points.join(' L')}`;
    };
    
    return (
      <svg width="100%" height="120" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Área para latencia promedio (fondo) */}
        <path
          d={createAreaPath(avgLatencyHistory)}
          fill="rgba(100, 255, 218, 0.2)"
          stroke="none"
        />
        
        {/* Línea para latencia promedio */}
        <path
          d={createLinePath(avgLatencyHistory)}
          fill="none"
          stroke="rgba(100, 255, 218, 0.5)"
          strokeWidth="1"
        />
        
        {/* Área para latencia actual (frente) */}
        <path
          d={createAreaPath(latencyHistory)}
          fill="rgba(0, 120, 255, 0.3)"
          stroke="none"
        />
        
        {/* Línea para latencia actual */}
        <path
          d={createLinePath(latencyHistory)}
          fill="none"
          stroke="rgba(0, 120, 255, 0.8)"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  return (
    <Box>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              mb: 1
            }}
          >
            <Box
              sx={{
                background: getStatusColor(),
                borderRadius: '50%',
                width: 8,
                height: 8,
                marginLeft: 1,
              }}
            />
            <Typography variant="body2" sx={{ color: getStatusColor(), marginLeft: 1 }}>
              {getStatusText()}
            </Typography>
          </Box>
        </Grid>

        {/* Gráfico de área para latencia */}
        <Grid item xs={12}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mb: 0.5
            }}>
              <Typography variant="caption" color="#8892B0">
                Actual: {stats.lastLatency.toFixed(1)} ms
              </Typography>
              <Typography variant="caption" color="#8892B0">
                Promedio: {isNaN(avgLatency) ? 0 : avgLatency.toFixed(1)} ms
              </Typography>
            </Box>
            
            <Box sx={{ 
              width: '100%', 
              height: '120px',
              backgroundColor: 'rgba(10, 25, 47, 0.3)',
              borderRadius: 1,
              overflow: 'hidden',
              position: 'relative'
            }}>
              {createAreaChart()}
              
              {/* Leyenda */}
              <Box sx={{ 
                position: 'absolute', 
                bottom: 5, 
                right: 5,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'rgba(10, 25, 47, 0.7)',
                padding: '2px 4px',
                borderRadius: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.2 }}>
                  <Box sx={{ width: 6, height: 6, backgroundColor: 'rgba(0, 120, 255, 0.8)', mr: 0.5 }} />
                  <Typography variant="caption" fontSize="0.65rem" color="#E6F1FF">Actual</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 6, height: 6, backgroundColor: 'rgba(100, 255, 218, 0.5)', mr: 0.5 }} />
                  <Typography variant="caption" fontSize="0.65rem" color="#E6F1FF">Promedio</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={3}>
              <Box sx={{ p: 1, background: 'rgba(10, 25, 47, 0.5)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#8892B0' }}>
                  Min
                </Typography>
                <Typography variant="body2" sx={{ color: '#E6F1FF' }}>
                  {minLatency === Infinity ? 0 : minLatency.toFixed(1)} ms
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ p: 1, background: 'rgba(10, 25, 47, 0.5)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#8892B0' }}>
                  Max
                </Typography>
                <Typography variant="body2" sx={{ color: '#E6F1FF' }}>
                  {maxLatency.toFixed(1)} ms
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ p: 1, background: 'rgba(10, 25, 47, 0.5)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#8892B0' }}>
                  Prom
                </Typography>
                <Typography variant="body2" sx={{ color: '#E6F1FF' }}>
                  {isNaN(avgLatency) ? 0 : avgLatency.toFixed(1)} ms
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ p: 1, background: 'rgba(10, 25, 47, 0.5)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#8892B0' }}>
                  Pérdida
                </Typography>
                <Typography variant="body2" sx={{ color: '#E6F1FF' }}>
                  {packetLoss}%
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
});

LatencyChart.displayName = 'LatencyChart';

export default LatencyChart;
