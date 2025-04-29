import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const LatencyChart = ({ latencyData }) => {
  // Si no hay datos, generar datos de muestra
  const sampleData = latencyData && latencyData.length > 0 ? latencyData : generateSampleData();
  
  // Obtener las últimas 20 entradas o menos si no hay suficientes
  const displayData = sampleData.slice(-20);
  
  // Extraer valores y etiquetas, asegurándose de que los valores sean números
  const values = displayData.map(entry => typeof entry.value === 'number' ? entry.value : parseFloat(entry.value) || 0);
  const labels = displayData.map(entry => entry.time);
  
  // Calcular estadísticas
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  
  const data = {
    labels,
    datasets: [
      {
        label: 'Actual',
        data: values,
        borderColor: '#64ffda',
        backgroundColor: 'rgba(100, 255, 218, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#64ffda',
        pointBorderColor: '#0a192f',
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#64ffda',
        pointHoverBorderColor: '#fff',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Promedio',
        data: calculateMovingAverage(values, 5),
        borderColor: '#8be9fd',
        borderWidth: 2,
        pointRadius: 0,
        borderDash: [5, 5],
        tension: 0.4,
        fill: false
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500, // Reducido para una actualización más rápida
      easing: 'easeOutQuart'
    },
    scales: {
      y: {
        beginAtZero: false,
        suggestedMin: Math.max(0, minValue - 10), // Asegurar que el mínimo no sea negativo
        suggestedMax: maxValue + 10, // Añadir espacio en la parte superior
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10
          },
          callback: function(value) {
            return value + ' ms';
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          maxRotation: 0,
          font: {
            size: 10
          },
          autoSkip: true,
          maxTicksLimit: 5
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10
          },
          boxWidth: 12,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 25, 47, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(100, 255, 218, 0.3)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + context.raw + ' ms';
          }
        }
      }
    }
  };
  
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <Line data={data} options={options} />
      {/* Mostrar estadísticas en la esquina */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        background: 'rgba(10, 25, 47, 0.8)', 
        padding: '5px 10px', 
        borderRadius: '4px',
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(100, 255, 218, 0.2)'
      }}>
        <div>Min: {minValue.toFixed(1)} ms</div>
        <div>Avg: {avgValue.toFixed(1)} ms</div>
        <div>Max: {maxValue.toFixed(1)} ms</div>
      </div>
    </div>
  );
};

// Función para generar datos de muestra
function generateSampleData() {
  const now = new Date();
  const data = [];
  
  // Generar 20 puntos de datos de muestra
  for (let i = 0; i < 20; i++) {
    const time = new Date(now - (19 - i) * 60000);
    const timeString = time.getHours().toString().padStart(2, '0') + ':' + 
                       time.getMinutes().toString().padStart(2, '0');
    
    // Generar un valor de latencia realista entre 20 y 150 ms con algunos picos
    let value;
    if (i === 5 || i === 15) {
      // Crear algunos picos para hacer el gráfico más interesante
      value = Math.random() * 100 + 50;
    } else {
      // Valores normales con algo de variación
      value = Math.random() * 30 + 20;
    }
    
    data.push({
      time: timeString,
      value: parseFloat(value.toFixed(2))
    });
  }
  
  return data;
}

// Función para calcular el promedio móvil
function calculateMovingAverage(values, window) {
  if (!values || values.length === 0) return [];
  
  const result = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      // No hay suficientes puntos para calcular el promedio móvil
      result.push(null);
    } else {
      // Calcular el promedio de los últimos 'window' puntos
      let sum = 0;
      for (let j = 0; j < window; j++) {
        sum += values[i - j];
      }
      result.push(parseFloat((sum / window).toFixed(2)));
    }
  }
  
  return result;
}

export default LatencyChart;
