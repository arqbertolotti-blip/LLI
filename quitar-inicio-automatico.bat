@echo off
rem Elimina las tareas programadas. Ejecutar COMO ADMINISTRADOR.
schtasks /end /tn "Gestion de proyectos" >nul 2>&1
schtasks /delete /tn "Gestion de proyectos" /f
schtasks /delete /tn "Gestion de proyectos - respaldo" /f
taskkill /f /im node.exe >nul 2>&1
pause
