# Gestión de proyectos para oficinas de ingeniería

Seguimiento de cotizaciones, ventas, plazos, cuotas, **facturación y cobranzas**, con reportes por
disciplina, vendedor y cliente, y flujo de caja. Soporta $U, U$S y UI con cotización configurable.

- Sin dependencias ni proceso de compilación: un `index.html` y, opcionalmente, un servidor Node de ~100 líneas.
- Licencia MIT (ver `LICENSE`; reemplace el titular del copyright por el suyo).

## Estructura

```
public/index.html   La aplicación completa (HTML + CSS + JS, un solo archivo)
public/adapter.js   Conecta la app con el servidor (almacenamiento compartido)
server.js           Servidor Node sin dependencias: usuarios, API y archivo JSON de datos
Dockerfile          Para desplegar en cualquier plataforma que corra contenedores
```

## Dos formas de usarlo

### A. Hosting estático (un solo usuario por navegador)
Suba `public/index.html` a GitHub Pages, Netlify, Cloudflare Pages, etc. (borre la línea
`<script src="adapter.js">` o deje que falle). Los datos se guardan en el navegador de cada persona
y **no se comparten**. Use **Respaldo** para copiar o restaurar los datos.

### B. Servidor con varios usuarios editando a la vez (recomendado para una oficina)
Requiere Node 18 o superior.

```bash
APP_USERS="ana:clave1:total,juan:clave2:limitado" PORT=3000 node server.js
# abrir http://localhost:3000
```

| Variable | Descripción | Por defecto |
|---|---|---|
| `APP_USERS` | Usuarios: `usuario:clave:rol,usuario2:clave2:rol` (rol `total` o `limitado`; si se omite, `total`). Las claves no pueden contener `:` ni `,` | sin usuarios (**solo para pruebas locales**) |
| `PORT` | Puerto | `3000` |
| `DATA_FILE` | Ruta del archivo de datos | `data/data.json` |

Los cambios de cada persona aparecen en las demás pantallas en unos 4 segundos.

#### Red local en Windows
Vea `LEEME-WINDOWS.txt`: incluye `iniciar.bat`, apertura del firewall solo para la red local, arranque
automático al encender el equipo y respaldo diario.

#### Despliegue con Docker
```bash
docker build -t gestion-proyectos .
docker run -d -p 3000:3000 -v gp-data:/data \
  -e APP_USERS="ana:clave1:total,juan:clave2:limitado" gestion-proyectos
```
En plataformas como Render, Railway o Fly.io cree un servicio desde este repositorio, defina
`APP_USERS` y monte **un disco persistente** en `/data`. Sin disco persistente los datos se pierden
en cada reinicio.

> **Use siempre HTTPS** al exponerlo en Internet: la autenticación es "Basic" (usuario y clave
> viajan en cada pedido). Las plataformas mencionadas lo incluyen. Use claves largas.

## Roles de acceso
- **total:** todas las secciones (Proyectos, Entregas, Cobranzas, Reportes), respaldo, cotizaciones de moneda.
- **limitado:** solo **Proyectos** y **Entregas**, con edición. No ve ni modifica cuotas, facturación, cobros, reportes ni cotizaciones. El servidor lo hace cumplir: esos datos ni siquiera se le envían.
  Los usuarios limitados pueden crear proyectos y marcar entregas, pero no definir cuotas de cobro; esas las carga un usuario total.
- Para cambiar el rol o la clave de alguien, edite `APP_USERS` y reinicie el servidor.

## Importar y exportar Excel
- **Respaldo → Exportar a Excel** genera un `.xlsx` con las hojas Proyectos, Cuotas y Entregas.
- **Respaldo → Importar desde Excel** lee ese mismo formato. `planilla-importacion.xlsx` es una planilla modelo con instrucciones y ejemplos (bórrelos antes de importar). Sirve para cargar históricos y para restaurar un respaldo.
- La importación muestra un resumen y los errores antes de cargar nada. Los proyectos con el mismo código se actualizan; no se borra nada que no esté en el archivo.

## Datos y respaldo
- Los datos están en `data/data.json` (o `DATA_FILE`). Copie ese archivo periódicamente.
- También puede usar **Respaldo → Ver JSON / Ver CSV de cuotas** dentro de la aplicación.
- Para migrar datos de la versión de navegador: abra la app, **Respaldo → Traer datos locales**
  (desde el mismo navegador donde los cargó) o pegue un JSON y use **Importar**.

## Personalización
- **Disciplinas:** en `public/index.html`, constantes `DISC` y `DN` (código y nombre completo).
- **Cotización por defecto de U$S y UI:** `S.rates??={USD:40,UI:6.5}` (editable luego desde la pantalla).
- **Idioma, estilos y reportes:** todo está en el mismo archivo, sin librerías externas.

## Modelo de datos
Documentos JSON en tres colecciones: `projects/<id>` (proyecto, monto por disciplina en `items`,
moneda `cur`, estado), `cuotas/<id>` (`pid`, `date`, `amount`, `invNo`, `invDate`, `paidDate`, `paid`)
y `config/rates` (cotizaciones a $U).

## Límites conocidos
- **Solo dos roles** (total y limitado); no hay permisos por vendedor o disciplina. No hay registro de quién
  cambió qué.
- Si dos personas editan el **mismo documento** a la vez, queda el último cambio guardado.
- Un único archivo JSON y un solo proceso: adecuado para cientos o pocos miles de registros. Para más
  volumen o alta disponibilidad, reemplace `server.js` por una API sobre PostgreSQL o similar; la app
  solo necesita los endpoints `GET /api/all`, `PUT|PATCH|DELETE /api/doc/<colección>/<id>`.
- Las cotizaciones de moneda son una sola para todo el período.
