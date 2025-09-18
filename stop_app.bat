@echo off
setlocal ENABLEDELAYEDEXPANSION

rem Ir al directorio del script
pushd "%~dp0"

set PORT=5002
set KILLED=0

rem Buscar PIDs que estan escuchando en el puerto indicado (IPv4/IPv6)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
    echo Encontrado proceso escuchando en puerto %PORT% con PID %%P. Terminando...
    rem Intentar terminar el arbol de procesos (fuerza)
    taskkill /PID %%P /T /F >nul 2>&1
    if not errorlevel 1 (
        echo Proceso %%P terminado.
        set KILLED=1
    ) else (
        echo No se pudo terminar el PID %%P (puede haber cambiado o requerir permisos).
    )
)

if !KILLED! EQU 0 (
    echo No se encontraron procesos escuchando en el puerto %PORT%.
    echo Si la app sigue abierta en otra ventana, cierrala manualmente.
) else (
    echo Detencion completada.
)

popd
endlocal
exit /b 0
