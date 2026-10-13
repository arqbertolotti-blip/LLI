/* Adaptador de almacenamiento compartido.
 * Si este archivo se carga (modo servidor), la app guarda y lee los datos en el servidor
 * (server.js) y se actualiza sola cada pocos segundos. Si no existe (hosting estático),
 * la app funciona en "modo sin conexión" guardando en el navegador. */
(function () {
  const POLL_MS = 4000;
  let docs = {}, ver = -1, subs = [], first = null, timer = null;

  const snapDoc = (path) => ({
    id: path.split('/').pop(), exists: path in docs,
    data: () => (path in docs ? docs[path] : undefined), metadata: { fromCache: false, hasPendingWrites: false },
  });
  const snapCol = (col) => {
    const ds = Object.keys(docs).filter((p) => p.startsWith(col + '/') && p.split('/').length === 2)
      .sort().map((p) => ({ id: p.split('/')[1], exists: true, data: () => docs[p] }));
    return { docs: ds, size: ds.length, empty: !ds.length };
  };
  const notify = () => subs.forEach((s) => { try { s.fire(); } catch (e) { console.error(e); } });

  async function pull(force) {
    try {
      const r = await fetch('api/all?v=' + (force ? -1 : ver), { cache: 'no-store' });
      if (!r.ok) throw { code: r.status === 401 ? 'unauthenticated' : 'unavailable', message: 'HTTP ' + r.status };
      const j = await r.json();
      if (j.same) return;
      ver = j.version; docs = j.docs; notify();
    } catch (e) { console.warn('Sin conexión con el servidor', e); }
  }
  first = pull(true);
  timer = setInterval(() => pull(false), POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(false); });

  async function write(method, path, data) {
    let r;
    try {
      r = await fetch('api/doc/' + path, {
        method, cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
    } catch (e) { throw { code: 'unavailable', message: 'No hay conexión con el servidor' }; }
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).error; } catch (e) {}
      throw { code: r.status === 404 ? 'invalid_argument' : r.status === 401 ? 'unauthenticated' : r.status === 403 ? 'permission_denied' : 'unavailable', message: m || 'HTTP ' + r.status };
    }
    await pull(true);
  }
  const subscribe = (build, next, error) => {
    const s = { fire: () => next(build()) }; subs.push(s);
    first.then(() => { if (subs.includes(s)) s.fire(); });
    return () => { subs = subs.filter((x) => x !== s); };
  };
  const DB = {
    doc: (path) => ({
      id: path.split('/').pop(), path,
      get: async () => { await first; return snapDoc(path); },
      set: (d) => write('PUT', path, d),
      update: (d) => write('PATCH', path, d),
      delete: () => write('DELETE', path),
      onSnapshot: (next, err) => subscribe(() => snapDoc(path), next, err),
    }),
    collection: (col) => ({
      path: col,
      onSnapshot: (next, err) => subscribe(() => snapCol(col), next, err),
      get: async () => { await first; return snapCol(col); },
    }),
  };
  let ME = { user: 'local', role: 'total' };
  const meP = fetch('api/me', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : ME)).then((j) => { ME = j; }).catch(() => {});
  const USER = {
    can: async () => { await meP; return true; },
    canEdit: async () => { await meP; return ME.role === 'total'; },   // rol "total" = acceso completo
    isOwner: async () => false,
    id: async () => { await meP; return ME.user; },
    me: async () => { await meP; return { id: ME.user }; },
  };
  window.claude = { use: async (n) => (n === 'db' ? DB : n === 'user' ? USER : null) };
})();
