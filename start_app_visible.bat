@echo off
setlocal

pushd "%~dp0"

set PORT=5002

set "RUNPY="
if exist ".venv\Scripts\python.exe" set "RUNPY=.venv\Scripts\python.exe"
if not defined RUNPY if exist "venv\Scripts\python.exe" set "RUNPY=venv\Scripts\python.exe"
if not defined RUNPY for %%P in (python.exe py.exe) do (
    where %%P >nul 2>&1 && set "RUNPY=%%P"
)
if not defined RUNPY set "RUNPY=py"

echo Iniciando app en consola visible con: %RUNPY% app.py
start "AppWeb-Ticket (visible)" cmd /k "%RUNPY% app.py"

rem Abrir navegador tras unos segundos
timeout /t 3 >nul
start "" http://localhost:%PORT%/

popd
endlocal
exit /b 0
