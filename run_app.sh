#!/bin/bash

# Navegar al directorio del proyecto
cd "$(dirname "$0")"

# Crear entorno virtual si no existe
if [ ! -d ".venv" ]; then
    echo "🔧 Creando entorno virtual .venv..."
    python3 -m venv .venv
    ./.venv/bin/pip install --upgrade pip
fi

# Instalar dependencias
./.venv/bin/pip install -r requirements.txt

# Activar entorno virtual y ejecutar
source .venv/bin/activate
python app.py
