@echo off
title Consultorio - Apagando
cd /d "%~dp0"
setlocal

set "PID_FILE=%~dp0consultorio.pid"

echo.
echo ============================================
echo   APAGANDO CONSULTORIO
echo ============================================
echo.

if exist "%PID_FILE%" (
    for /f "usebackq delims=" %%p in ("%PID_FILE%") do (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$pidToStop = [int]'%%p'; $proc = Get-Process -Id $pidToStop -ErrorAction SilentlyContinue; if ($proc) { Stop-Process -Id $pidToStop -Force; Write-Host 'Servidor detenido correctamente.' -ForegroundColor Green } else { Write-Host 'El servidor no estaba corriendo.' -ForegroundColor Yellow }"
    )
    del "%PID_FILE%" >nul 2>nul
) else (
    echo No se encontro consultorio.pid.
    echo Si la app sigue abierta, cierre la ventana "Consultorio" o reinicie la PC.
)

echo.
timeout /t 2 /nobreak >nul
exit
