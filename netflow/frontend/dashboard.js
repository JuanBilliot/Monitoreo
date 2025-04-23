// Dashboard de Monitoreo - Funcionalidad principal
console.log('Cargando dashboard.js...');

// Definición global explícita
window.initDashboard = function() {
    console.log('Inicializando dashboard desde función global...');
    actualInitDashboard();
};

// Configuración inicial
const PING_INTERVAL = 2000; // Intervalo de actualización de métricas en ms
const MAX_HISTORY_POINTS = 50; // Número máximo de puntos en los gráficos
let pingChart = null;
let currentServerId = null;
let metricsIntervalId = null;

// Datos simulados - Servidores
const servers = [
    {
        id: 1,
        name: 'Servidor Principal',
        ip: '192.168.0.148',
        type: 'Windows Server',
        description: 'Servidor principal de la red',
        status: 'online',
        metrics: {
            ping: [],
            packetsSent: 0,
            packetsReceived: 0,
            packetsLost: 0,
            packetLossPercent: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            latency: 0,
            jitter: 0,
            uptime: '0d 0h 0m',
            lastCheck: new Date()
        }
    },
    {
        id: 2,
        name: 'Servidor Base de Datos',
        ip: '192.168.0.150',
        type: 'Linux',
        description: 'Servidor de bases de datos SQL',
        status: 'online',
        metrics: {
            ping: [],
            packetsSent: 0,
            packetsReceived: 0,
            packetsLost: 0,
            packetLossPercent: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            latency: 0,
            jitter: 0,
            uptime: '0d 0h 0m',
            lastCheck: new Date()
        }
    },
    {
        id: 3,
        name: 'Servidor Web',
        ip: '192.168.0.152',
        type: 'Linux',
        description: 'Servidor de aplicaciones web',
        status: 'offline',
        metrics: {
            ping: [],
            packetsSent: 0,
            packetsReceived: 0,
            packetsLost: 0,
            packetLossPercent: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            latency: 0,
            jitter: 0,
            uptime: '0d 0h 0m',
            lastCheck: new Date()
        }
    },
    {
        id: 4,
        name: 'Servidor de Archivos',
        ip: '192.168.0.154',
        type: 'Windows Server',
        description: 'Servidor de almacenamiento de archivos',
        status: 'warning',
        metrics: {
            ping: [],
            packetsSent: 0,
            packetsReceived: 0,
            packetsLost: 0,
            packetLossPercent: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            latency: 0,
            jitter: 0,
            uptime: '0d 0h 0m',
            lastCheck: new Date()
        }
    }
];

// Implementación real del dashboard
function actualInitDashboard() {
    console.log('Inicializando dashboard...');
    
    try {
        // Mostrar nombre de usuario en el dashboard
        const username = localStorage.getItem('username') || 'Usuario';
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = username;
        } else {
            console.error('Elemento user-name no encontrado');
        }
        
        // Verificamos si el dashboard es visible
        const dashboardScreen = document.getElementById('dashboard-screen');
        if (dashboardScreen) {
            console.log('Estado actual del dashboard:', dashboardScreen.style.display);
            if (dashboardScreen.style.display === 'none') {
                console.log('Haciendo visible el dashboard');
                dashboardScreen.style.display = 'flex';
            }
        } else {
            console.error('Elemento dashboard-screen no encontrado');
        }
        
        // Aseguramos que la pantalla de login esté oculta
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }
        
        // Renderizar tarjetas de servidores
        renderServerCards();
        
        // Configurar evento para cerrar la vista detallada
        const closeButton = document.getElementById('close-detail-view');
        if (closeButton) {
            closeButton.addEventListener('click', hideDetailView);
        } else {
            console.error('No se encontró el botón para cerrar la vista detallada');
        }
        
        // Configurar evento de logout
        setupLogout();
        
        console.log('Dashboard inicializado correctamente');
    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
    }
}

// Renderizar tarjetas de servidores en el panel kanban
function renderServerCards() {
    console.log('Renderizando tarjetas de servidores...');
    
    try {
        const kanbanContainer = document.getElementById('servers-kanban');
        if (!kanbanContainer) {
            console.error('No se encontró el contenedor de kanban');
            return;
        }
        
        kanbanContainer.innerHTML = '';
        
        servers.forEach(server => {
            // Determinar clase de color según el estado
            let statusClass = 'bg-gray-500'; // Por defecto
            let statusText = 'Desconocido';
            
            if (server.status === 'online') {
                statusClass = 'bg-green-500';
                statusText = 'En línea';
            } else if (server.status === 'offline') {
                statusClass = 'bg-red-500';
                statusText = 'Desconectado';
            } else if (server.status === 'warning') {
                statusClass = 'bg-yellow-500';
                statusText = 'Advertencia';
            }
            
            // Crear la tarjeta del servidor
            const serverCard = document.createElement('div');
            serverCard.className = 'bg-surface rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer';
            serverCard.innerHTML = `
                <div class="p-4 border-b border-slate-700">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-lg font-semibold">${server.name}</h3>
                        <div class="${statusClass} w-3 h-3 rounded-full"></div>
                    </div>
                    <p class="text-sm text-slate-400 mb-1">${server.ip}</p>
                    <p class="text-xs text-slate-500">${server.type}</p>
                </div>
                <div class="p-4">
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <p class="text-slate-400">Estado</p>
                            <p class="font-medium">${statusText}</p>
                        </div>
                        <div>
                            <p class="text-slate-400">Latencia</p>
                            <p class="font-medium server-latency-${server.id}">-- ms</p>
                        </div>
                        <div>
                            <p class="text-slate-400">Paquetes</p>
                            <p class="font-medium server-packets-${server.id}">-- %</p>
                        </div>
                        <div>
                            <p class="text-slate-400">Velocidad</p>
                            <p class="font-medium server-speed-${server.id}">-- Mbps</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Agregar evento para mostrar detalles al hacer clic
            serverCard.addEventListener('click', () => showServerDetails(server.id));
            
            // Agregar la tarjeta al contenedor
            kanbanContainer.appendChild(serverCard);
        });
        
        // Iniciar la simulación de métricas
        startMetricsSimulation();
        
        console.log('Tarjetas de servidores renderizadas correctamente');
    } catch (error) {
        console.error('Error al renderizar tarjetas:', error);
    }
}

// Iniciar simulación de métricas para las tarjetas
function startMetricsSimulation() {
    console.log('Iniciando simulación de métricas...');
    
    try {
        // Detener simulación anterior si existe
        if (metricsIntervalId) {
            clearInterval(metricsIntervalId);
        }
        
        // Iniciar simulación nueva
        metricsIntervalId = setInterval(() => {
            servers.forEach(server => {
                if (server.status === 'offline') {
                    // Para servidores offline, mantener valores de error
                    updateServerCardMetrics(server.id, '-', '-', '-');
                } else {
                    // Generar métricas aleatorias para servidores online
                    const latency = Math.floor(Math.random() * 100) + 5; // 5-105 ms
                    const packetLoss = server.status === 'warning' ? 
                        (Math.random() * 5) + 3 : // 3-8%
                        Math.random() * 2; // 0-2%
                    const speed = Math.floor(Math.random() * 900) + 100; // 100-1000 Mbps
                    
                    // Actualizar métricas en la tarjeta
                    updateServerCardMetrics(
                        server.id, 
                        `${latency} ms`, 
                        `${packetLoss.toFixed(1)}%`, 
                        `${speed} Mbps`
                    );
                    
                    // Almacenar el valor de ping para gráficos
                    updateServerMetrics(server.id, latency, packetLoss, speed);
                }
            });
            
            // Si hay un servidor seleccionado, actualizar su vista detallada
            if (currentServerId !== null) {
                updateDetailView(currentServerId);
            }
        }, PING_INTERVAL);
        
        console.log('Simulación de métricas iniciada');
    } catch (error) {
        console.error('Error al iniciar simulación de métricas:', error);
    }
}

// Actualizar las métricas mostradas en una tarjeta de servidor
function updateServerCardMetrics(serverId, latency, packetLoss, speed) {
    try {
        const latencyEl = document.querySelector(`.server-latency-${serverId}`);
        const packetsEl = document.querySelector(`.server-packets-${serverId}`);
        const speedEl = document.querySelector(`.server-speed-${serverId}`);
        
        if (latencyEl) latencyEl.textContent = latency;
        if (packetsEl) packetsEl.textContent = packetLoss;
        if (speedEl) speedEl.textContent = speed;
    } catch (error) {
        console.error(`Error al actualizar métricas para el servidor ${serverId}:`, error);
    }
}

// Actualizar las métricas almacenadas para un servidor
function updateServerMetrics(serverId, latency, packetLoss, speed) {
    try {
        const server = servers.find(s => s.id === serverId);
        if (!server) return;
        
        // Actualizar historial de ping para gráficos
        server.metrics.ping.push(latency);
        if (server.metrics.ping.length > MAX_HISTORY_POINTS) {
            server.metrics.ping.shift();
        }
        
        // Actualizar contadores de paquetes
        const packetsSent = Math.floor(Math.random() * 20) + 10; // 10-30 paquetes
        const packetsLost = Math.floor(packetsSent * (packetLoss / 100));
        const packetsReceived = packetsSent - packetsLost;
        
        server.metrics.packetsSent += packetsSent;
        server.metrics.packetsReceived += packetsReceived;
        server.metrics.packetsLost += packetsLost;
        server.metrics.packetLossPercent = packetLoss;
        
        // Actualizar métricas de red
        server.metrics.downloadSpeed = speed;
        server.metrics.uploadSpeed = Math.floor(speed * 0.2); // La subida es el 20% de la bajada (típico)
        server.metrics.latency = latency;
        server.metrics.jitter = Math.floor(Math.random() * 10); // 0-10 ms
        
        // Actualizar hora de última verificación
        server.metrics.lastCheck = new Date();
        
        // Simular uptime (incrementar cada vez)
        const [days, hours, mins] = server.metrics.uptime.split(/[dhm ]+/).filter(Boolean).map(Number);
        let totalMins = (days * 24 * 60) + (hours * 60) + mins + 1;
        const newDays = Math.floor(totalMins / (24 * 60));
        totalMins -= newDays * 24 * 60;
        const newHours = Math.floor(totalMins / 60);
        totalMins -= newHours * 60;
        const newMins = totalMins;
        
        server.metrics.uptime = `${newDays}d ${newHours}h ${newMins}m`;
    } catch (error) {
        console.error(`Error al actualizar métricas almacenadas para el servidor ${serverId}:`, error);
    }
}

// Mostrar detalles de un servidor
function showServerDetails(serverId) {
    console.log(`Mostrando detalles del servidor ID: ${serverId}`);
    
    try {
        currentServerId = serverId;
        
        const server = servers.find(s => s.id === serverId);
        if (!server) {
            console.error(`No se encontró el servidor con ID ${serverId}`);
            return;
        }
        
        // Mostrar vista detallada
        const detailView = document.getElementById('server-detail-view');
        if (!detailView) {
            console.error('No se encontró la vista detallada');
            return;
        }
        
        detailView.classList.remove('hidden');
        
        // Actualizar título
        const titleEl = document.getElementById('detail-server-name');
        if (titleEl) {
            titleEl.textContent = `${server.name} (${server.ip})`;
        }
        
        // Inicializar gráfico de ping si no existe
        if (!pingChart) {
            initPingChart();
        }
        
        // Actualizar datos del servidor seleccionado
        updateDetailView(serverId);
    } catch (error) {
        console.error(`Error al mostrar detalles del servidor ${serverId}:`, error);
    }
}

// Ocultar la vista detallada
function hideDetailView() {
    try {
        const detailView = document.getElementById('server-detail-view');
        if (detailView) {
            detailView.classList.add('hidden');
        }
        currentServerId = null;
    } catch (error) {
        console.error('Error al ocultar vista detallada:', error);
    }
}

// Inicializar el gráfico de ping
function initPingChart() {
    console.log('Inicializando gráfico de ping...');
    
    try {
        const canvas = document.getElementById('pingChart');
        if (!canvas) {
            console.error('No se encontró el canvas para el gráfico de ping');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        pingChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(MAX_HISTORY_POINTS).fill(''),
                datasets: [{
                    label: 'Ping (ms)',
                    data: Array(MAX_HISTORY_POINTS).fill(null),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // Desactivar animaciones para mejor rendimiento
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        console.log('Gráfico de ping inicializado correctamente');
    } catch (error) {
        console.error('Error al inicializar gráfico de ping:', error);
    }
}

// Actualizar la vista detallada
function updateDetailView(serverId) {
    try {
        const server = servers.find(s => s.id === serverId);
        if (!server) {
            console.error(`No se encontró el servidor con ID ${serverId}`);
            return;
        }
        
        // Actualizar el gráfico de ping
        if (pingChart) {
            pingChart.data.datasets[0].data = [...server.metrics.ping];
            pingChart.update();
        }
        
        // Actualizar estadísticas de paquetes
        updateElementText('packets-sent', server.metrics.packetsSent);
        updateElementText('packets-received', server.metrics.packetsReceived);
        updateElementText('packets-lost', server.metrics.packetsLost);
        updateElementText('packet-loss-percent', `${server.metrics.packetLossPercent.toFixed(2)}%`);
        
        // Actualizar estadísticas de velocidad
        updateElementText('download-speed', `${server.metrics.downloadSpeed} Mbps`);
        updateElementText('upload-speed', `${server.metrics.uploadSpeed} Mbps`);
        updateElementText('latency', `${server.metrics.latency} ms`);
        updateElementText('jitter', `${server.metrics.jitter} ms`);
        
        // Actualizar estado del servicio
        let statusText = 'Desconocido';
        let statusClass = 'bg-gray-500';
        
        if (server.status === 'online') {
            statusText = 'En línea';
            statusClass = 'bg-green-500';
        } else if (server.status === 'offline') {
            statusText = 'Desconectado';
            statusClass = 'bg-red-500';
        } else if (server.status === 'warning') {
            statusText = 'Advertencia';
            statusClass = 'bg-yellow-500';
        }
        
        updateElementText('service-status', statusText);
        
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `w-8 h-8 rounded-full ${statusClass}`;
        }
        
        updateElementText('uptime', server.metrics.uptime);
        updateElementText('last-check', server.metrics.lastCheck.toLocaleTimeString());
    } catch (error) {
        console.error(`Error al actualizar vista detallada para el servidor ${serverId}:`, error);
    }
}

// Función auxiliar para actualizar texto de elementos
function updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
    }
}

// Configurar función de logout
function setupLogout() {
    console.log('Configurando función de logout...');
    
    try {
        // Override de la función de logout global
        window.logout = function() {
            console.log('Cerrando sesión...');
            
            // Detener simulación de métricas
            if (metricsIntervalId) {
                clearInterval(metricsIntervalId);
                metricsIntervalId = null;
            }
            
            // Limpiar almacenamiento local
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            
            // Redirigir a pantalla de login
            document.getElementById('dashboard-screen').style.display = 'none';
            document.getElementById('welcome-screen').style.display = 'flex';
            
            console.log('Sesión cerrada correctamente');
        };
        
        console.log('Función de logout configurada correctamente');
    } catch (error) {
        console.error('Error al configurar función de logout:', error);
    }
}

// Inicializar dashboard cuando se carga el DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, verificando si estamos en el dashboard...');
    
    try {
        // Verificar que el dashboard existe
        const dashboardElement = document.getElementById('dashboard-screen');
        if (!dashboardElement) {
            console.error('Elemento dashboard-screen no encontrado al cargar el DOM');
            return;
        }
        
        console.log('Dashboard encontrado, verificando token...');
        
        // Si el usuario tiene un token, mostrar dashboard automáticamente
        const token = localStorage.getItem('token');
        if (token) {
            console.log('Token encontrado, inicializando dashboard automáticamente');
            
            // Ocultar pantalla de bienvenida
            const welcomeScreen = document.getElementById('welcome-screen');
            if (welcomeScreen) {
                welcomeScreen.style.display = 'none';
            }
            
            // Mostrar dashboard
            dashboardElement.style.display = 'flex';
            
            // Inicializar
            setTimeout(function() {
                console.log('Iniciando dashboard con delay...');
                window.initDashboard();
            }, 100);
        } else {
            console.log('No se encontró token, esperando login del usuario');
        }
    } catch (error) {
        console.error('Error al verificar token:', error);
    }
});
