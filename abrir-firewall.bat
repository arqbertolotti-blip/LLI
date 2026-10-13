@echo off
rem Permite el acceso a la aplicacion solo desde la red local. Ejecutar COMO ADMINISTRADOR.
call "%~dp0config.bat"
net session >nul 2>&1
if errorlevel 1 (
  echo Debe ejecutar este archivo como administrador: clic derecho - Ejecutar como administrador.
  pause
  exit /b 1
)
netsh advfirewall firewall delete rule name="Gestion de proyectos" >nul 2>&1
netsh advfirewall firewall add rule name="Gestion de proyectos" dir=in action=allow protocol=TCP localport=%PORT% remoteip=localsubnet profile=any
echo.
echo Listo: el puerto %PORT% queda abierto solo para equipos de la red local.
pause
