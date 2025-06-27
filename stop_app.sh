#!/bin/bash

APP_PID_FILE="app.pid"
APP_NAME="app.py"

# Función para matar procesos por nombre
kill_processes() {
    echo "🔍 Buscando procesos de $APP_NAME..."
    
    # Obtener PIDs de todos los procesos de Python que ejecutan app.py
    PIDS=$(pgrep -f "python.*$APP_NAME")
    
    if [ -z "$PIDS" ]; then
        echo "ℹ️  No se encontraron procesos de $APP_NAME en ejecución"
        return 1
    fi
    
    echo "🛑 Deteniendo procesos (PIDs: $PIDS)..."
    kill -9 $PIDS 2>/dev/null
    
    # Verificar si los procesos se detuvieron
    for PID in $PIDS; do
        if ps -p "$PID" > /dev/null; then
            echo "❌ No se pudo detener el proceso $PID"
        else
            echo "✅ Proceso $PID detenido"
        fi
    done
    
    return 0
}

# Intentar detener usando el archivo PID
if [ -f "$APP_PID_FILE" ]; then
    PID=$(cat "$APP_PID_FILE" 2>/dev/null)
    
    if [ -n "$PID" ] && ps -p "$PID" > /dev/null; then
        echo "🛑 Deteniendo aplicación (PID: $PID)..."
        kill -9 "$PID" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "✅ Aplicación detenida correctamente"
        else
            echo "⚠️  No se pudo detener el proceso $PID, intentando método alternativo..."
            kill_processes
        fi
    else
        echo "ℹ️  El proceso guardado no está en ejecución, buscando otros procesos..."
        kill_processes
    fi
    
    # Eliminar archivo PID en cualquier caso
    rm -f "$APP_PID_FILE"
else
    echo "ℹ️  No se encontró archivo de PID, buscando procesos por nombre..."
    kill_processes
fi

echo "✨ Limpiando archivos temporales..."
rm -f "$APP_PID_FILE" 2>/dev/null

echo "🏁 Proceso de detención completado"
