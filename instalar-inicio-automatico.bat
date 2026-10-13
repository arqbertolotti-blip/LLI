@echo off
rem Hace que el servidor arranque solo al encender el equipo y programa un respaldo diario a las 23:00.
rem Ejecutar COMO ADMINISTRADOR.
net session >nul 2>&1
if errorlevel 1 (
  echo Debe ejecutar este archivo como administrador: clic derecho - Ejecutar como administrador.
  pause
  exit /b 1
)
schtasks /create /tn "Gestion de proyectos" /tr "\"%~dp0servidor.bat\"" /sc onstart /ru SYSTEM /rl highest /f
schtasks /create /tn "Gestion de proyectos - respaldo" /tr "\"%~dp0respaldo.bat\"" /sc daily /st 23:00 /ru SYSTEM /f
echo.
echo Tareas creadas. Para iniciar el servidor ahora sin reiniciar el equipo:
echo     schtasks /run /tn "Gestion de proyectos"
pause
