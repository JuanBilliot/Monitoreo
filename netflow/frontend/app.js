// Inicializar el objeto global de la aplicación
console.log('Archivo app.js cargando...');

// Definir la función de login ANTES de cualquier otra cosa para garantizar su disponibilidad
function loginDirecto() {
    console.log('Función loginDirecto() ejecutada');
    try {
        // Obtener valores directamente
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log('Credenciales:', username, password ? '(contraseña presente)' : '(contraseña vacía)');
        
        // Lista de usuarios válidos - hardcoded para desarrollo
        const usuariosValidos = [
            {usuario: 'admin', clave: 'admin123'},
            {usuario: 'juan.billiot', clave: 'jua.3256'},
            {usuario: 'gabriel.machado', clave: 'gab.2021'}
        ];
        
        // Verificar credenciales
        const usuarioValido = usuariosValidos.find(u => 
            u.usuario === username && u.clave === password
        );
        
        if (usuarioValido) {
            console.log('Credenciales correctas!');
            
            // Guardar datos en el estado de la aplicación
            window.app.state.username = username;
            window.app.state.token = 'token-simulado-' + Date.now();
            
            // Cambiar pantalla manualmente sin depender de window.app
            try {
                const loginScreen = document.getElementById('login-screen');
                const dashboardScreen = document.getElementById('dashboard-screen');
                
                if (loginScreen && dashboardScreen) {
                    loginScreen.style.display = 'none';
                    dashboardScreen.style.display = 'flex';
                    console.log('Cambio de pantalla realizado manualmente');
                }
            } catch (e) {
                // En caso de error, intentar usar window.app como respaldo
                window.app.switchScreen('login-screen', 'dashboard-screen');
            }
            
            return false; // Evitar que el formulario se envíe
        } else {
            console.log('Credenciales incorrectas');
            alert('Usuario o contraseña incorrectos');
            return false; // Evitar que el formulario se envíe
        }
    } catch (error) {
        console.error('Error en login:', error);
        alert('Error en el proceso de login: ' + error.message);
        return false; // Evitar que el formulario se envíe
    }
}

window.app = {
    // Estado global
    state: {
        currentScreen: 'welcome-screen',
        token: null,
        username: null,
        selectedServer: null,
        charts: {}
    },

    // Función para cambiar entre pantallas
    switchScreen: function(fromScreen, toScreen) {
        console.log(`Cambiando de ${fromScreen} a ${toScreen}`);
        
        const currentScreen = document.getElementById(fromScreen);
        const nextScreen = document.getElementById(toScreen);
        
        if (!currentScreen || !nextScreen) {
            console.error('Error: Pantallas no encontradas', { fromScreen, toScreen });
            return;
        }

        currentScreen.classList.remove('active');
        currentScreen.style.opacity = '0';
        
        setTimeout(() => {
            currentScreen.style.display = 'none';
            
            nextScreen.style.display = 'flex';
            nextScreen.style.opacity = '0';
            
            nextScreen.offsetHeight;
            
            nextScreen.classList.add('active');
            nextScreen.style.opacity = '1';
            
            this.state.currentScreen = toScreen;
            
            console.log(`Transición completada a ${toScreen}`);
        }, 300);
    },

    // Manejadores de eventos
    handlers: {
        loginClick: function(event) {
            console.log('Iniciando transición a login...');
            try {
                window.app.switchScreen('welcome-screen', 'login-screen');
            } catch (error) {
                console.error('Error al cambiar a pantalla de login:', error);
            }
        },
    },

    // Inicialización del dashboard
    initializeDashboard: function() {
        console.log('Inicializando dashboard...');
    },

    // Inicialización de la aplicación
    init: function() {
        console.log('Inicializando aplicación...');
        
        try {
            // Verificar elementos requeridos
            const requiredElements = ['welcome-screen', 'login-screen', 'dashboard-screen', 'loginButton', 'loginForm'];
            requiredElements.forEach(id => {
                const element = document.getElementById(id);
                if (!element) {
                    throw new Error(`Elemento ${id} no encontrado`);
                }
                console.log(`Elemento ${id} encontrado correctamente`);
            });

            // Configurar pantallas
            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => {
                if (screen.id === 'welcome-screen') {
                    screen.style.display = 'flex';
                    screen.style.opacity = '1';
                    screen.classList.add('active');
                } else {
                    screen.style.display = 'none';
                    screen.style.opacity = '0';
                    screen.classList.remove('active');
                }
            });

            // Configurar event listeners
            document.getElementById('loginButton').addEventListener('click', this.handlers.loginClick);

            console.log('Event listeners configurados correctamente');
            console.log('Aplicación inicializada correctamente');
            
            // Verificar que la función loginDirecto existe
            if (typeof loginDirecto === 'function') {
                console.log('✅ Función loginDirecto está disponible globalmente');
            } else {
                console.error('❌ ALERTA: Función loginDirecto NO está disponible. Esto causará errores.');
            }
        } catch (error) {
            console.error('Error en inicialización:', error);
        }
    }
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado');
    window.app.init();
});
