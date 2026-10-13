'use strict';
// Servidor mínimo sin dependencias (Node 18+). Guarda todo en un archivo JSON.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = +process.env.PORT || 3000;
const DATA = process.env.DATA_FILE || path.join(__dirname, 'data', 'data.json');
const PUB = path.join(__dirname, 'public');
const USERS = {};
(process.env.APP_USERS || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => {
  // formato: usuario:clave  o  usuario:clave:rol   (rol = total | limitado; por defecto total)
  const p = s.split(':'); if (p.length < 2 || !p[0]) return;
  const role = p.length >= 3 ? p[2].trim().toLowerCase() : 'total';
  USERS[p[0]] = { pass: p[1], role: role === 'limitado' ? 'limitado' : 'total' };
});
const AUTH = Object.keys(USERS).length > 0;
if (!AUTH) console.warn('ADVERTENCIA: APP_USERS no está definido. Cualquiera con acceso a la URL puede ver y editar los datos.');

let state = { version: 0, docs: {} };
fs.mkdirSync(path.dirname(DATA), { recursive: true });
try { state = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) { /* archivo nuevo */ }
const save = () => {
  const t = DATA + '.tmp'; fs.writeFileSync(t, JSON.stringify(state));
  try { fs.renameSync(t, DATA); } catch (e) { fs.writeFileSync(DATA, JSON.stringify(state)); } // Windows: archivo bloqueado
};
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
// Devuelve { user, role } o null. Sin APP_USERS: acceso total anónimo (solo para pruebas locales).
function authed(req) {
  if (!AUTH) return { user: 'local', role: 'total' };
  const h = req.headers.authorization || ''; if (!h.startsWith('Basic ')) return null;
  const s = Buffer.from(h.slice(6), 'base64').toString(); const i = s.indexOf(':'); if (i < 0) return null;
  const u = s.slice(0, i), p = s.slice(i + 1);
  return Object.prototype.hasOwnProperty.call(USERS, u) && same(USERS[u].pass, p) ? { user: u, role: USERS[u].role } : null;
}
// El rol "limitado" solo accede a proyectos y entregas (no ve ni modifica cuotas, facturación, cobros ni cotizaciones).
const RESTRICTED = ['cuotas/', 'config/'];
const allowed = (me, p) => me.role === 'total' || !RESTRICTED.some((r) => p.startsWith(r));
const PATH_RE = /^[A-Za-z0-9_.~:@+-]{1,200}\/[A-Za-z0-9_.~:@+-]{1,200}$/;
const readBody = (req) => new Promise((resolve, reject) => {
  let n = 0; const c = [];
  req.on('data', (d) => { n += d.length; if (n > 262144) { reject(new Error('Documento demasiado grande')); req.destroy(); } else c.push(d); });
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(c).toString() || '{}')); } catch (e) { reject(new Error('JSON inválido')); } });
  req.on('error', reject);
});
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const FILES = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'], '/adapter.js': ['adapter.js', 'text/javascript; charset=utf-8'] };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/healthz') return json(res, 200, { ok: true });
    const me = authed(req);
    if (!me) { res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Gestion de proyectos", charset="UTF-8"' }); return res.end('Acceso restringido'); }
    if (req.method === 'GET' && FILES[url.pathname]) {
      const [f, type] = FILES[url.pathname];
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      return res.end(fs.readFileSync(path.join(PUB, f)));
    }
    if (req.method === 'GET' && url.pathname === '/api/me') return json(res, 200, { user: me.user, role: me.role });
    if (req.method === 'GET' && url.pathname === '/api/all') {
      if (url.searchParams.get('v') === String(state.version)) return json(res, 200, { same: true, version: state.version });
      if (me.role === 'total') return json(res, 200, state);
      const docs = {}; for (const k of Object.keys(state.docs)) if (allowed(me, k)) docs[k] = state.docs[k];
      return json(res, 200, { version: state.version, docs });
    }
    const m = url.pathname.match(/^\/api\/doc\/(.+)$/);
    if (m) {
      const p = decodeURIComponent(m[1]);
      if (!PATH_RE.test(p)) return json(res, 400, { error: 'Ruta inválida' });
      if (!allowed(me, p)) return json(res, 403, { error: 'Su usuario no tiene permiso para esta sección' });
      if (req.method === 'DELETE') { delete state.docs[p]; }
      else if (req.method === 'PUT' || req.method === 'PATCH') {
        const b = await readBody(req);
        if (!b || typeof b !== 'object' || Array.isArray(b)) return json(res, 400, { error: 'El cuerpo debe ser un objeto' });
        if (req.method === 'PATCH') { if (!state.docs[p]) return json(res, 404, { error: 'El documento no existe' }); state.docs[p] = { ...state.docs[p], ...b }; }
        else state.docs[p] = b;
      } else return json(res, 405, { error: 'Método no permitido' });
      state.version++; save(); return json(res, 200, { ok: true, version: state.version });
    }
    json(res, 404, { error: 'No encontrado' });
  } catch (e) { json(res, 400, { error: e.message }); }
}).listen(PORT, () => {
  console.log('Gestión de proyectos en marcha' + (AUTH ? ' (con ' + Object.keys(USERS).length + ' usuarios)' : ' (SIN usuarios)'));
  console.log('  En este equipo:     http://localhost:' + PORT);
  const nets = require('os').networkInterfaces();
  Object.values(nets).flat().filter((n) => n && n.family === 'IPv4' && !n.internal)
    .forEach((n) => console.log('  Desde otras PC:     http://' + n.address + ':' + PORT));
});
