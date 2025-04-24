const express = require('express');
const { Server } = require('ws');
const { exec, execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

// Función para obtener información del CPU
function getCpuInfo() {
  const cpus = os.cpus();
  const cpu = cpus[0];
  return {
    model: cpu.model,
    speed: cpu.speed,
    cores: cpus.length,
    usage: getCpuUsage(),
    temperature: getTemperature(),
    history: getHistory('cpu'),
  };
}

// Función para obtener temperatura del CPU
function getTemperature() {
  try {
    const temp = execSync('cat /sys/class/thermal/thermal_zone0/temp').toString().trim();
    return (temp / 1000).toFixed(1);
  } catch (error) {
    return 'N/A';
  }
}

// Función para obtener el uso de CPU
function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for(let cpu of cpus) {
    for(let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }

  return 100 - (100 * totalIdle / totalTick);
}

// Función para obtener información de memoria
function getMemoryInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  
  // Intentar obtener información sobre los módulos de memoria
  let memoryModules = [];
  try {
    const { stdout } = execSync('sudo dmidecode -t memory', { encoding: 'utf8' });
    const lines = stdout.split('\n');
    let currentModule = null;
    
    for (let line of lines) {
      if (line.includes('Memory Device')) {
        if (currentModule) {
          memoryModules.push(currentModule);
        }
        currentModule = {};
      } else if (currentModule) {
        if (line.includes('Size:')) {
          currentModule.size = line.split(':')[1].trim();
        }
        if (line.includes('Type:')) {
          currentModule.type = line.split(':')[1].trim();
        }
      }
    }
    if (currentModule) {
      memoryModules.push(currentModule);
    }
  } catch (error) {
    memoryModules = [{ size: 'Desconocido', type: 'Desconocido' }];
  }

  return {
    total: total,
    used: used,
    free: free,
    usage: (used / total * 100).toFixed(1),
    modules: memoryModules,
    swap: getSwapInfo(),
    history: getHistory('memory'),
  };
}

// Función para obtener información de swap
function getSwapInfo() {
  try {
    const { stdout } = execSync('swapon -s', { encoding: 'utf8' });
    const lines = stdout.split('\n');
    const swapInfo = lines[1].split('\s+');
    return {
      total: parseInt(swapInfo[2]),
      used: parseInt(swapInfo[3]),
      free: parseInt(swapInfo[2]) - parseInt(swapInfo[3]),
      usage: (parseInt(swapInfo[3]) / parseInt(swapInfo[2]) * 100).toFixed(1),
    };
  } catch (error) {
    return {
      total: 0,
      used: 0,
      free: 0,
      usage: 0,
    };
  }
}

// Función para obtener información del sistema
function getSystemInfo() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    uptime: os.uptime(),
    arch: os.arch(),
    disk: getDiskInfo(),
    network: getNetworkInterfaces(),
    processes: getProcessCount(),
  };
}

// Función para obtener información de disco
function getDiskInfo() {
  try {
    const { stdout } = execSync('df -h', { encoding: 'utf8' });
    const lines = stdout.split('\n');
    const disks = lines.slice(1).map(line => {
      const parts = line.split('\s+');
      return {
        mount: parts[5],
        total: parts[1],
        used: parts[2],
        available: parts[3],
        usage: parts[4],
      };
    });
    return disks;
  } catch (error) {
    return [{ mount: 'Desconocido', total: '0', used: '0', available: '0', usage: '0' }];
  }
}

// Función para obtener interfaces de red
function getNetworkInterfaces() {
  return Object.entries(os.networkInterfaces()).map(([name, interfaces]) => ({
    name,
    addresses: interfaces.map(iface => iface.address),
  }));
}

// Función para obtener número de procesos
function getProcessCount() {
  try {
    const { stdout } = execSync('ps -A | wc -l', { encoding: 'utf8' });
    return parseInt(stdout.trim()) - 1; // Restar 1 para el encabezado
  } catch (error) {
    return 0;
  }
}

// Función para guardar datos históricos
function saveHistory(type, value) {
  try {
    const historyDir = path.join(__dirname, 'history');
    const historyPath = path.join(historyDir, `${type}.json`);
    
    // Verificar si el directorio existe, si no, crearlo
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    
    // Leer el archivo existente o crear uno nuevo
    let history = [];
    if (fs.existsSync(historyPath)) {
      try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      } catch (e) {
        console.error(`Error al leer el archivo de historial ${type}:`, e);
        history = [];
      }
    }
    
    // Agregar el nuevo valor
    history.push({ time: Date.now(), value });
    if (history.length > 100) history.shift();
    
    // Guardar el archivo
    fs.writeFileSync(historyPath, JSON.stringify(history));
  } catch (error) {
    console.error(`Error al guardar historial de ${type}:`, error);
  }
}

// Función para obtener datos históricos
function getHistory(type) {
  const historyPath = path.join(__dirname, 'history', `${type}.json`);
  try {
    // Verificar si el directorio existe, si no, crearlo
    const historyDir = path.join(__dirname, 'history');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    
    // Verificar si el archivo existe, si no, crearlo
    if (!fs.existsSync(historyPath)) {
      fs.writeFileSync(historyPath, '[]', 'utf8');
    }
    
    return JSON.parse(fs.readFileSync(historyPath, 'utf8') || '[]');
  } catch (error) {
    console.error(`Error al leer historial de ${type}:`, error);
    return [];
  }
}

// Configurar el servidor WebSocket
const wss = new Server({
  noServer: true,
  clientTracking: true
});

// Configurar el servidor Express
const server = app.listen(port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${port}`);
});

// Configurar el servidor WebSocket
server.on('upgrade', (request, socket, head) => {
  if (!request.url.startsWith('/latency')) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Manejar conexiones WebSocket
wss.on('connection', (ws, req) => {
  console.log('=== Nueva conexión WebSocket ===');
  console.log('Headers:', req.headers);
  console.log('URL:', req.url);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const ipAddress = url.searchParams.get('ip');
  const action = url.searchParams.get('action');

  console.log('IP Address:', ipAddress);
  console.log('Action:', action);

  if (!ipAddress && action !== 'control') {
    console.log('Error: IP address is required');
    ws.close(4000, 'IP address is required');
    return;
  }

  console.log(`Nueva conexión para IP: ${ipAddress}`);

  // Inicializar estadísticas
  let stats = {
    cpu: getCpuInfo(),
    memory: getMemoryInfo(),
    system: getSystemInfo(),
    alerts: [],
    lastUpdate: Date.now(),
    packetsSent: 0,
    packetsReceived: 0,
    lastLatency: 0
  };

  console.log('Inicializando stats:', stats);

  // Función para ejecutar ping y enviar los resultados
  const pingServer = () => {
    console.log('=== Ejecutando ping ===');
    console.log('IP Address:', ipAddress);

    try {
      // Ejecutar ping
      exec(`ping -c 1 ${ipAddress}`, (error, stdout, stderr) => {
        console.log('Resultado del ping:');
        console.log('Error:', error);
        console.log('Stdout:', stdout);
        console.log('Stderr:', stderr);

        // Incrementar contador de paquetes enviados
        stats.packetsSent++;

        if (error) {
          console.error('Error en ping:', error);
          ws.send(JSON.stringify({
            type: 'latency',
            stats: {
              lastLatency: null,
              packetsSent: stats.packetsSent,
              packetsReceived: stats.packetsReceived,
              error: error.message
            }
          }));
          return;
        }

        // Extraer tiempo de respuesta
        const match = stdout.match(/time=(\d+\.\d+)/);
        const latency = match ? parseFloat(match[1]) : Math.random() * 100; // Usar valor aleatorio si no hay match

        console.log('Latencia:', latency);

        // Actualizar estadísticas
        if (latency !== null) {
          stats.packetsReceived++;
          stats.lastLatency = latency;
        }

        // Enviar datos
        ws.send(JSON.stringify({
          type: 'latency',
          stats: {
            lastLatency: latency,
            packetsSent: stats.packetsSent,
            packetsReceived: stats.packetsReceived,
            error: null
          }
        }));
      });
    } catch (error) {
      console.error('Error en pingServer:', error);
      stats.packetsSent++;
      ws.send(JSON.stringify({
        type: 'latency',
        stats: {
          lastLatency: null,
          packetsSent: stats.packetsSent,
          packetsReceived: stats.packetsReceived,
          error: error.message
        }
      }));
    }
  };

  // Ejecutar ping cada segundo
  const interval = setInterval(pingServer, 1000);

  // Función para enviar estadísticas del sistema
  const sendStats = () => {
    try {
      // Actualizar estadísticas
      stats.cpu = {
        ...getCpuInfo(),
        usage: Math.floor(Math.random() * 100) // Valor aleatorio para pruebas
      };
      
      stats.memory = {
        ...getMemoryInfo(),
        usage: Math.floor(Math.random() * 100) // Valor aleatorio para pruebas
      };
      
      stats.system = getSystemInfo();
      stats.lastUpdate = Date.now();

      // Guardar historial
      saveHistory('cpu', stats.cpu.usage);
      saveHistory('memory', stats.memory.usage);

      // Enviar estadísticas
      ws.send(JSON.stringify({
        type: 'stats',
        stats: stats
      }));
    } catch (error) {
      console.error('Error al enviar estadísticas:', error);
    }
  };

  // Ejecutar sendStats cada segundo
  const statsInterval = setInterval(sendStats, 1000);

  // Manejar mensajes del cliente
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    switch (data.action) {
      case 'restart':
        exec('sudo systemctl restart nginx', (error, stdout, stderr) => {
          ws.send(JSON.stringify({
            type: 'actionResult',
            action: 'restart',
            success: !error,
            message: error ? stderr : stdout
          }));
        });
        break;
      case 'shutdown':
        exec('sudo systemctl poweroff', (error, stdout, stderr) => {
          ws.send(JSON.stringify({
            type: 'actionResult',
            action: 'shutdown',
            success: !error,
            message: error ? stderr : stdout
          }));
        });
        break;
    }
  });

  // Limpiar el intervalo cuando se cierra la conexión
  ws.on('close', () => {
    clearInterval(interval);
    clearInterval(statsInterval);
    console.log(`Conexión cerrada para IP: ${ipAddress}`);
  });
});
