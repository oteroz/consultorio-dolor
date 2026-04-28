@echo off
title Consultorio - Iniciando
cd /d "%~dp0"
setlocal

set "APP_DIR=%~dp0"
set "NODE_EXE=%APP_DIR%node-portable\node.exe"
set "PID_FILE=%APP_DIR%consultorio.pid"
set "PORT=3000"
set "PORT_MAX=3010"

echo.
echo ============================================
echo   CONSULTORIO DE DOLOR - INICIANDO
echo ============================================
echo.

if not exist "%NODE_EXE%" (
    echo [ERROR] Falta Node portable:
    echo   "%NODE_EXE%"
    echo.
    echo Esta app esta preparada para usarse sin internet ni instaladores.
    echo Copia nuevamente la carpeta completa desde el pendrive.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [ERROR] Falta la carpeta node_modules.
    echo.
    echo En una PC sin internet no se pueden instalar dependencias.
    echo El paquete portable debe incluir node_modules ya preparado.
    echo.
    pause
    exit /b 1
)

if not exist "backend\public\index.html" (
    echo [ERROR] Falta el frontend compilado en backend\public.
    echo.
    echo Antes de copiar al pendrive, ejecuta el build en la PC de desarrollo.
    echo.
    pause
    exit /b 1
)

echo Usando Node portable.

if not defined SESSION_SECRET (
    set "SESSION_SECRET=consultorio-local-portable-cambiar-si-se-publica"
)

echo Verificando base de datos...
"%NODE_EXE%" backend\src\db\migrate.js
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la verificacion de base de datos.
    pause
    exit /b 1
)

if exist "%PID_FILE%" (
    echo Deteniendo instancia anterior de esta app...
    for /f "usebackq delims=" %%p in ("%PID_FILE%") do (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$pidToStop = [int]'%%p'; $proc = Get-Process -Id $pidToStop -ErrorAction SilentlyContinue; if ($proc) { Stop-Process -Id $pidToStop -Force }" >nul 2>nul
    )
    del "%PID_FILE%" >nul 2>nul
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$start=%PORT%; $end=%PORT_MAX%; for ($port=$start; $port -le $end; $port++) { $busy = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if (-not $busy) { Set-Content -LiteralPath '%APP_DIR%consultorio.port' -Value $port; exit 0 } }; exit 1"
if errorlevel 1 (
    echo [ERROR] No hay puertos libres entre %PORT% y %PORT_MAX%.
    echo Cierra otros programas o reinicia la PC antes de iniciar.
    echo.
    pause
    exit /b 1
)
set /p PORT=<"%APP_DIR%consultorio.port"
del "%APP_DIR%consultorio.port" >nul 2>nul

echo Puerto seleccionado: %PORT%

echo Arrancando servidor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:SESSION_SECRET='%SESSION_SECRET%'; $env:PORT='%PORT%'; $p = Start-Process -FilePath '%NODE_EXE%' -ArgumentList 'backend/src/server.js' -WorkingDirectory '%APP_DIR%' -WindowStyle Minimized -PassThru; Set-Content -LiteralPath '%PID_FILE%' -Value $p.Id"

echo Esperando que el servidor este listo...
timeout /t 4 /nobreak >nul

echo Abriendo navegador...
start "" "http://localhost:%PORT%"

echo.
echo ============================================
echo   LISTO
echo.
echo   La app esta corriendo en:
echo   http://localhost:%PORT%
echo.
echo   Para apagarla, ejecuta APAGAR.bat
echo ============================================
echo.
timeout /t 3 /nobreak >nul
exit
