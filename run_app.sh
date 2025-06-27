#!/bin/bash

# Navegar al directorio del proyecto
cd "$(dirname "$0")"

# Instalar dependencias si es necesario
pip3 install -r requirements.txt

# Iniciar la aplicación
python3 app.py
