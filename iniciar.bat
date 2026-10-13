@echo off
cd /d "%~dp0"
call "%~dp0config.bat"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js no esta instalado. Descarguelo (version LTS) de https://nodejs.org e instalelo.
  echo Luego cierre esta ventana y vuelva a abrir este archivo.
  pause
  exit /b 1
)
if "%APP_USERS%"=="ana:CambieEstaClave1:total,juan:CambieEstaClave2:limitado" (
  echo Antes de iniciar, edite config.bat y cambie los usuarios y las claves de ejemplo.
  pause
  exit /b 1
)
echo Iniciando el servidor. Deje esta ventana abierta; para detenerlo presione Ctrl+C.
echo.
node server.js
pause
