@echo off

:: Navegar al directorio del script
cd /d "%~dp0"

:: Verificar si Python está instalado
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python no está instalado o no está en el PATH.
    echo Por favor, instala Python 3 y asegúrate de que esté en el PATH.
    pause
    exit /b 1
)

:: Crear entorno virtual si no existe
if not exist "venv" (
    echo Creando entorno virtual...
    python -m venv venv
)

:: Activar entorno virtual e instalar dependencias
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

:: Iniciar la aplicación
echo Iniciando la aplicación...
python app.py

:: Mantener la ventana abierta
pause
