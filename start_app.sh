#!/bin/bash

# Navegar al directorio del script
cd "$(dirname "$0")"
pwd

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 no está instalado o no está en el PATH"
    read -p "Presiona Enter para salir..."
    exit 1
fi

# Crear entorno virtual si no existe
if [ ! -d ".venv" ]; then
    echo "🔧 Creando entorno virtual..."
    python3 -m venv .venv || {
        echo "❌ Error al crear el entorno virtual"
        read -p "Presiona Enter para salir..."
        exit 1
    }
    
    # Activar y actualizar pip
    source .venv/bin/activate
    echo "🔄 Actualizando pip..."
    pip install --upgrade pip || {
        echo "❌ Error al actualizar pip"
        read -p "Presiona Enter para salir..."
        exit 1
    }
    
    # Instalar dependencias
    echo "📦 Instalando dependencias..."
    pip install -r requirements.txt || {
        echo "❌ Error al instalar dependencias"
        read -p "Presiona Enter para salir..."
        exit 1
    }
else
    # Activar entorno virtual existente
    source .venv/bin/activate
fi

APP_PID_FILE="app.pid"

echo "🚀 Iniciando la aplicación..."
# Iniciar la aplicación en segundo plano
python app.py &


# Guardar el PID del proceso
echo $! > "$APP_PID_FILE"
echo "📌 ID del proceso: $(cat $APP_PID_FILE)"
echo "🌐 La aplicación está en ejecución. Abre http://localhost:5000 en tu navegador"
echo "🛑 Para detener la aplicación, ejecuta: ./stop_app.sh"

# Mantener el script en ejecución
trap 'echo "\n🛑 Deteniendo la aplicación..."; kill $(cat "$APP_PID_FILE"); rm -f "$APP_PID_FILE"; exit 0' INT
wait

# Limpiar al salir
rm -f "$APP_PID_FILE" 2>/dev/null
