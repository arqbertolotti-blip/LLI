@echo off
rem Ejecuta el servidor y lo reinicia solo si se cae. Lo usa iniciar.bat y el inicio automatico.
cd /d "%~dp0"
call "%~dp0config.bat"
if not exist "%~dp0logs" mkdir "%~dp0logs"
:bucle
node server.js >> "%~dp0logs\servidor.log" 2>&1
timeout /t 5 /nobreak >nul
goto bucle
