@echo off
rem ===== CONFIGURACION (edite este archivo con el Bloc de notas) =====
rem Usuarios y claves: usuario:clave separados por coma. NO use los caracteres  %  y  "  en las claves.
set "APP_USERS=ana:CambieEstaClave1:total,juan:CambieEstaClave2:limitado"
rem Puerto de la aplicacion
set "PORT=3000"
rem Archivo donde se guardan los datos
set "DATA_FILE=%~dp0data\data.json"
