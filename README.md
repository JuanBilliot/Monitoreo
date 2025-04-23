# NetFlow - Sistema de Monitoreo

Sistema de monitoreo en tiempo real para servidores que muestra métricas de ping, CPU, memoria y disco.

## Características

- Monitoreo de ping en tiempo real con gráfico
- Estadísticas de paquetes (enviados, recibidos, perdidos)
- Información detallada de CPU
- Monitoreo de uso de memoria
- Estadísticas de uso de disco
- Interfaz de usuario moderna y responsive
- Autenticación de usuarios mediante JWT

## Instalación

1. Crear entorno virtual:
```bash
python -m venv venv
source venv/bin/activate  # En Linux/Mac
venv\Scripts\activate.bat  # En Windows
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Iniciar el servidor:
```bash
cd netflow
python -m app.main
```

4. Acceder a la aplicación:
- Navegar a `http://localhost:8000`
- Usar las siguientes credenciales:
  - Usuario: admin
  - Contraseña: password