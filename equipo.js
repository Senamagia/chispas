/* Chispas · trabajo en equipo.
   Un trabajo se comparte con un código (o un enlace por WhatsApp). Cada uno ficha sus horas desde su móvil,
   apunta gastos diciendo quién pagó, y la app calcula quién debe a quién según el reparto elegido en ese trabajo:
   según las horas, a medias, jornal fijo o porcentaje.

   En la nube:  equipos/{CODIGO}              → miembros, nombres, dueño, datos generales del trabajo (info)
                equipos/{CODIGO}/items/{id}   → horas, gastos, movimientos, material, tareas y «quién lleva qué», uno por documento
                equipos/{CODIGO}/privado/precio → presupuesto y cobros (solo los escribe el dueño; los demás lo ven si él quiere)
   Cada móvil guarda lo último que mandó (db.ajustes.eqSent) para fusionar sin pisar lo que haya cambiado el otro. */
'use strict';

const EQ = { escuchas: {}, listo: {}, preview: {}, timer: null, pendienteRender: false };
const yo = () => window.cloud?.user?.uid || null;
const miNombre = () => db.ajustes.miNombre || (db.ajustes.negocio?.nombre || '').split(' ')[0] || (window.cloud?.user?.email || '').split('@')[0] || 'Yo';
const soyDueno = (t) => !t?.equipo || t.equipo.owner === yo();
const verPrecios = (t) => !t?.equipo || soyDueno(t) || t.equipo.verPrecios !== false;
const codigoBonito = (c) => c.slice(0, 3) + '-' + c.slice(3);
const COLORES_EQ = ['#FFC20E', '#7EC8E3', '#F4A6A6', '#A8E6A1', '#C9B6F2', '#FFB877'];
const nombreEq = (t, u) => (u === yo() ? 'Tú' : t.equipo?.nombres?.[u] || 'Compañero');
const nombreReal = (t, u) => t.equipo?.nombres?.[u] || 'Compañero';
function avatarEq(t, u, s = 30) {
  const i = Math.max(0, (t.equipo?.miembros || []).indexOf(u)), n = nombreReal(t, u);
  return `<span title="${esc(n)}" style="width:${s}px;height:${s}px;border-radius:50%;background:${COLORES_EQ[i % COLORES_EQ.length]};color:#1C2430;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(s * 0.45)}px;flex-shrink:0;border:2px solid var(--card)">${esc(n.charAt(0).toUpperCase())}</span>`;
}
const avataresEq = (t, s = 30) => `<span style="display:inline-flex">${(t.equipo?.miembros || []).map((u, i) => `<span style="margin-left:${i ? -8 : 0}px">${avatarEq(t, u, s)}</span>`).join('')}</span>`;
const REPARTOS = { horas: ['Según las horas de cada uno', 'Cada uno ficha lo suyo y el beneficio se reparte en proporción'], medias: ['A partes iguales', 'Mitad y mitad (o a tercios si sois tres)'],
  jornal: ['Jornal fijo', 'Le pagas X € al día o a la hora; el resto es tuyo'], pct: ['Porcentaje', 'Tú 60 %, él 40 %…'] };
window.horasMias = (t) => (t.horas || []).filter(esMia).reduce((s, h) => s + ((h.fin || Date.now()) - h.inicio), 0) / 36e5;

/* ---------- Lo que se comparte ---------- */
function infoDe(t) {
  const c = cliente(t.clienteId) || {};
  return JSON.stringify({ titulo: t.titulo || '', cliente: { nombre: c.nombre || '', tel: c.tel || '', dir: c.dir || '' }, direccion: t.direccion || '', cuando: t.cuando || null,
    oficios: t.oficios || [], estado: t.estado || 'en_curso', notas: t.notas || '', planos: t.planos || [], reparto: t.equipo.reparto || { tipo: 'horas' }, verPrecios: t.equipo.verPrecios !== false });
}
const precioDe = (t) => JSON.stringify({ presu: t.presu || null, importe: t.importe ?? null, plan: t.plan || '50/50', pagos: t.pagos || [], factura: !!t.factura });
function itemsLocales(t) {
  const m = new Map(), E = t.equipo;
  (t.horas || []).forEach((h) => { if (!h.id) h.id = uid(); if (!h.uid) h.uid = E.owner; m.set('hora_' + h.id, h); });
  (t.gastos || []).forEach((g) => { if (!g.id) g.id = uid(); m.set('gasto_' + g.id, g); });
  (t.movs || []).forEach((x) => m.set('mov_' + x.id, x));
  (t.llevar || []).forEach((x) => m.set('llevar_' + x.id, x));
  db.material.filter((x) => x.trabajoId === t.id).forEach((x) => m.set('material_' + x.id, x));
  db.tareas.filter((x) => x.trabajoId === t.id).forEach((x) => m.set('tarea_' + x.id, x));
  return m;
}
function enviado(code) { const all = (db.ajustes.eqSent = db.ajustes.eqSent || {}); return (all[code] = all[code] || { info: null, precio: null, items: {} }); }
const refEq = (code) => cloud.fs.collection('equipos').doc(code);

/* ---------- Subir lo que ha cambiado aquí ---------- */
async function subirEquipo(t) {
  if (!cloud.fs || !yo() || !t.equipo || t.equipo.cerrado || !EQ.listo[t.equipo.code]) return;
  const code = t.equipo.code, S = enviado(code), ref = refEq(code), ops = [], ahora = Date.now();
  const info = infoDe(t); if (info !== S.info) ops.push(() => [ref, { info, infoTs: ahora, infoPor: yo(), verPrecios: t.equipo.verPrecios !== false }, true, () => (S.info = info)]);
  if (soyDueno(t)) { const pr = precioDe(t); if (pr !== S.precio) ops.push(() => [ref.collection('privado').doc('precio'), { precio: pr, ts: ahora }, false, () => (S.precio = pr)]); }
  const loc = itemsLocales(t);
  for (const [k, d] of loc) { const j = JSON.stringify(d); if (S.items[k] !== j) ops.push(() => [ref.collection('items').doc(k), { tipo: k.split('_')[0], data: j, por: yo(), ts: ahora, borrado: false }, false, () => (S.items[k] = j)]); }
  for (const k of Object.keys(S.items)) if (!loc.has(k)) ops.push(() => [ref.collection('items').doc(k), { tipo: k.split('_')[0], data: 'null', por: yo(), ts: ahora, borrado: true }, false, () => delete S.items[k]]);
  if (!ops.length) return;
  for (let i = 0; i < ops.length; i += 400) {
    const batch = cloud.fs.batch(), hechos = [];
    ops.slice(i, i + 400).forEach((f) => { const [r, d, merge, ok] = f(); merge ? batch.set(r, d, { merge: true }) : batch.set(r, d); hechos.push(ok); });
    try { await batch.commit(); hechos.forEach((ok) => ok()); localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('equipo: no se pudo subir', e); return; }
  }
}
window.subirEquipos = () => { clearTimeout(EQ.timer); EQ.timer = setTimeout(() => db.trabajos.filter((t) => t.equipo).forEach(subirEquipo), 700); };

/* ---------- Aplicar lo que llega del compañero ---------- */
function aplicarInfo(t, txt) {
  const o = JSON.parse(txt);
  ['titulo', 'direccion', 'cuando', 'oficios', 'estado', 'notas', 'planos'].forEach((k) => (t[k] = o[k]));
  if (o.cliente?.nombre) { let c = cliente(t.clienteId) || db.clientes.find((x) => x.nombre.toLowerCase() === o.cliente.nombre.toLowerCase());
    if (!c) { c = { id: uid(), nombre: o.cliente.nombre }; db.clientes.push(c); } Object.assign(c, o.cliente); t.clienteId = c.id; }
  t.equipo.reparto = o.reparto; t.equipo.verPrecios = o.verPrecios;
  if (!verPrecios(t)) { delete t.presu; t.importe = null; t.pagos = []; }
}
function aplicarItems(t, docs) {
  const S = enviado(t.equipo.code), loc = itemsLocales(t), final = new Map(loc);
  docs.forEach((d) => {
    const k = d.id, r = d.data(), rj = r.borrado ? null : r.data, base = S.items[k], lj = loc.has(k) ? JSON.stringify(loc.get(k)) : undefined;
    const sinCambioLocal = lj === base || (lj === undefined && base === undefined);
    if (!sinCambioLocal) return; // lo de aquí manda: se subirá
    if (rj === null) { final.delete(k); delete S.items[k]; } else { final.set(k, JSON.parse(rj)); S.items[k] = rj; }
  });
  const de = (tipo) => [...final].filter(([k]) => k.startsWith(tipo + '_')).map(([, v]) => v);
  t.horas = de('hora').sort((a, b) => a.inicio - b.inicio); t.gastos = de('gasto'); t.movs = de('mov'); t.llevar = de('llevar');
  db.material = db.material.filter((x) => x.trabajoId !== t.id).concat(de('material').map((x) => Object.assign(x, { trabajoId: t.id })));
  db.tareas = db.tareas.filter((x) => x.trabajoId !== t.id).concat(de('tarea').map((x) => Object.assign(x, { trabajoId: t.id })));
}
function guardarYPintar() {
  localStorage.setItem(KEY, JSON.stringify(db));
  const escribiendo = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.closest('#sheet');
  if (escribiendo || !$('#sheet').hidden) { EQ.pendienteRender = true; return; }
  render();
}
document.addEventListener('focusout', () => setTimeout(() => { if (EQ.pendienteRender && $('#sheet').hidden && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) { EQ.pendienteRender = false; render(); } }, 300));

function escuchar(t) {
  const code = t.equipo.code; if (EQ.escuchas[code] || !cloud.fs || !yo()) return;
  const ref = refEq(code), id = t.id, una = { doc: false, items: false };
  const listo = () => { if (una.doc && una.items && !EQ.listo[code]) { EQ.listo[code] = true; subirEquipos(); } };
  const u1 = ref.onSnapshot((s) => {
    const tt = trabajo(id); if (!tt?.equipo) return;
    if (!s.exists) { if (una.doc || !soyDueno(tt)) { tt.equipo.cerrado = true; guardarYPintar(); } una.doc = true; return listo(); }
    const r = s.data(), S = enviado(code);
    Object.assign(tt.equipo, { owner: r.owner, miembros: r.miembros || [], nombres: r.nombres || {} });
    const R = tt.equipo.reparto; // el jornal que puso el dueño al crear se aplica a quien se une
    if (soyDueno(tt) && R?.tipo === 'jornal' && R.jornalPendiente) { R.jornal = R.jornal || {}; tt.equipo.miembros.filter((u) => u !== tt.equipo.owner && !R.jornal[u]).forEach((u) => (R.jornal[u] = Object.assign({}, R.jornalPendiente))); }
    if (!(r.miembros || []).includes(yo())) { tt.equipo.cerrado = true; tt.equipo.fuera = true; }
    if (r.info && r.info !== S.info && infoDe(tt) === (S.info ?? infoDe(tt))) { aplicarInfo(tt, r.info); S.info = r.info; }
    una.doc = true; guardarYPintar(); listo();
    if (verPrecios(tt) && !soyDueno(tt) && !EQ.escuchas[code + '/p']) EQ.escuchas[code + '/p'] = ref.collection('privado').doc('precio').onSnapshot((p) => {
      const t3 = trabajo(id); if (!t3 || soyDueno(t3) || !p.exists) return;
      const o = JSON.parse(p.data().precio); Object.assign(t3, { presu: o.presu || undefined, importe: o.importe, plan: o.plan, pagos: o.pagos || [], factura: o.factura });
      if (!t3.presu) delete t3.presu; guardarYPintar();
    }, () => {});
  }, (e) => console.warn('equipo doc', e));
  const u2 = ref.collection('items').onSnapshot((s) => { const tt = trabajo(id); if (!tt?.equipo) return; aplicarItems(tt, s.docs); una.items = true; guardarYPintar(); listo(); }, (e) => console.warn('equipo items', e));
  EQ.escuchas[code] = () => { u1(); u2(); EQ.escuchas[code + '/p']?.(); delete EQ.escuchas[code + '/p']; };
}
function asegurarEscuchas() {
  if (!window.cloud?.fs || !yo()) return;
  db.trabajos.filter((t) => t.equipo && !t.equipo.cerrado).forEach(escuchar);
  const pend = localStorage.getItem('chispas.unirme'); if (pend) { localStorage.removeItem('chispas.unirme'); location.hash = '#unirme/' + pend; }
}
setInterval(asegurarEscuchas, 2000);
(function engancharGuardado() {
  const intenta = () => { if (!window.cloud?.onSave || cloud._eq) return setTimeout(intenta, 300); const base = cloud.onSave; cloud.onSave = () => { base(); subirEquipos(); }; cloud._eq = true; };
  intenta();
})();

/* ---------- Las cuentas (tipo Tricount) ---------- */
function cuentasEquipo(t) {
  const E = t.equipo, M = [...(E.miembros || [])], owner = E.owner, cero = () => Object.fromEntries(M.map((u) => [u, 0])), asegura = (u) => { if (!M.includes(u)) M.push(u); };
  const horas = cero(), dias = {}, ing = cero(), gas = cero(), mov = cero();
  (t.horas || []).forEach((h) => { const u = h.uid || owner; asegura(u); horas[u] = (horas[u] || 0) + ((h.fin || Date.now()) - h.inicio) / 36e5; (dias[u] = dias[u] || new Set()).add(new Date(h.inicio).toDateString()); });
  (t.pagos || []).filter((p) => p.cobrado).forEach((p) => { const u = p.cobradoPor || owner; asegura(u); ing[u] = (ing[u] || 0) + p.importe; });
  (t.movs || []).forEach((m) => { if (m.tipo === 'cobro') { asegura(m.uid); ing[m.uid] = (ing[m.uid] || 0) + m.importe; } if (m.tipo === 'pago') { asegura(m.de); asegura(m.a); mov[m.de] = (mov[m.de] || 0) - m.importe; mov[m.a] = (mov[m.a] || 0) + m.importe; } });
  (t.gastos || []).filter((g) => g.deObra !== false).forEach((g) => { const u = g.pagadorUid || owner; asegura(u); gas[u] = (gas[u] || 0) + g.importe; });
  db.material.filter((m) => m.trabajoId === t.id && m.comprado && m.precio && !m.herramienta).forEach((m) => { const u = m.compradoPor || owner; asegura(u); gas[u] = (gas[u] || 0) + m.precio; });
  M.forEach((u) => { ['horas', 'ing', 'gas', 'mov'].forEach(() => {}); horas[u] = horas[u] || 0; ing[u] = ing[u] || 0; gas[u] = gas[u] || 0; mov[u] = mov[u] || 0; });
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0), I = sum(ing), G = sum(gas), B = I - G, H = sum(horas);
  const R = E.reparto || { tipo: 'horas' }, parte = {}, conPrecio = verPrecios(t);
  const jornalDe = (u) => { const j = R.jornal?.[u]; if (!j || !num(j.importe)) return null; return num(j.importe) * (j.por === 'hora' ? horas[u] : (dias[u]?.size || 0)); };
  if (R.tipo === 'jornal') { const fijos = M.filter((u) => jornalDe(u) != null), resto = M.filter((u) => !fijos.includes(u)); let sumF = 0;
    fijos.forEach((u) => { parte[u] = jornalDe(u); sumF += parte[u]; }); resto.forEach((u) => (parte[u] = (B - sumF) / (resto.length || 1))); }
  else if (R.tipo === 'pct') M.forEach((u) => (parte[u] = B * ((num(R.pct?.[u]) ?? 100 / M.length) / 100)));
  else if (R.tipo === 'horas' && H > 0) M.forEach((u) => (parte[u] = B * (horas[u] / H)));
  else M.forEach((u) => (parte[u] = B / M.length));
  const tiene = {}, corresponde = {}, saldo = {};
  M.forEach((u) => { tiene[u] = ing[u] + mov[u]; corresponde[u] = parte[u] + gas[u]; saldo[u] = tiene[u] - corresponde[u]; });
  // Si no ves los precios (vas a jornal), tu cuenta es solo contigo y el dueño
  if (!conPrecio) { const me = yo(); M.forEach((u) => { if (u !== me && u !== owner) saldo[u] = 0; }); saldo[owner] = -saldo[me]; }
  const deben = M.filter((u) => saldo[u] > 0.005).map((u) => [u, saldo[u]]), cobran = M.filter((u) => saldo[u] < -0.005).map((u) => [u, -saldo[u]]), pagos = [];
  deben.sort((a, b) => b[1] - a[1]); cobran.sort((a, b) => b[1] - a[1]);
  for (const d of deben) for (const c of cobran) { const x = Math.min(d[1], c[1]); if (x > 0.005) { pagos.push({ de: d[0], a: c[0], importe: Math.round(x * 100) / 100 }); d[1] -= x; c[1] -= x; } }
  return { M, horas, dias, ing, gas, mov, I, G, B, H, parte, tiene, corresponde, saldo, pagos, conPrecio, R };
}
window.cuentasEquipo = cuentasEquipo;
const frasePago = (t, p) => p.de === yo() ? `Le pagas ${eur(p.importe)} a ${nombreReal(t, p.a)}` : p.a === yo() ? `${nombreReal(t, p.de)} te paga ${eur(p.importe)}` : `${nombreReal(t, p.de)} paga ${eur(p.importe)} a ${nombreReal(t, p.a)}`;

/* ---------- Crear, invitar, unirse, salir ---------- */
function pedirNombre() { const n = prompt('¿Cómo te llamas? (es lo que verá tu compañero)', miNombre()); if (n === null) return null; db.ajustes.miNombre = n.trim() || miNombre(); save(); return db.ajustes.miNombre; }
const genCodigo = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('');
let eqForm = { tipo: 'horas', verPrecios: true, jornal: '', jornalPor: 'dia', pct: 50 };
window.crearEquipo = async (id) => {
  const t = trabajo(id); if (!window.cloud?.user) { toast('Para trabajar en equipo tienes que entrar con tu cuenta'); return (location.hash = '#cuenta'); }
  if (!pedirNombre()) return;
  const reparto = { tipo: eqForm.tipo }; if (eqForm.tipo === 'pct') reparto.pct = { [yo()]: num(eqForm.pct) ?? 50 };
  if (eqForm.tipo === 'jornal') reparto.jornalPendiente = { importe: num(eqForm.jornal) || 0, por: eqForm.jornalPor };
  t.equipo = { code: '', owner: yo(), miembros: [yo()], nombres: { [yo()]: db.ajustes.miNombre }, reparto, verPrecios: eqForm.tipo === 'jornal' ? eqForm.verPrecios : true };
  toast('Creando el equipo…');
  for (let i = 0; i < 5; i++) {
    const code = genCodigo();
    try { await refEq(code).set({ owner: yo(), miembros: [yo()], nombres: t.equipo.nombres, trabajoId: t.id, verPrecios: t.equipo.verPrecios, creado: Date.now(), info: infoDe(Object.assign(t, { equipo: Object.assign(t.equipo, { code }) })), infoTs: Date.now() });
      enviado(code).info = infoDe(t); t.equipo.code = code; EQ.listo[code] = false; save(); escuchar(t); render(); return toast('¡Listo! Ahora invita a tu compañero');
    } catch (e) { if (i === 4) { delete t.equipo; save(); render(); return toast('No se ha podido crear: ' + (e.code === 'permission-denied' ? 'falta actualizar la nube' : 'sin conexión')); } }
  }
};
window.invitarWhatsApp = (id) => {
  const t = trabajo(id), c = t.equipo.code, url = `https://senamagia.github.io/chispas/#unirme/${c}`;
  const txt = `${miNombre()} te invita a trabajar juntos en «${t.titulo}» con la app Chispas. Toca el enlace para unirte: ${url} (código ${codigoBonito(c)})`;
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
};
window.copiarInvitacion = async (id) => { const c = trabajo(id).equipo.code; try { await navigator.clipboard.writeText(`https://senamagia.github.io/chispas/#unirme/${c}`); toast('Enlace copiado'); } catch { toast('Código: ' + codigoBonito(c)); } };
async function cargarPreview(code) {
  EQ.preview[code] = 'cargando';
  try { const s = await refEq(code).get(); EQ.preview[code] = s.exists ? s.data() : 'no'; } catch (e) { EQ.preview[code] = e.code === 'permission-denied' ? 'permiso' : 'error'; }
  if (location.hash.startsWith('#unirme/')) render();
}
window.unirseEquipo = async (code) => {
  const d = EQ.preview[code]; if (!d || typeof d !== 'object') return;
  if (!pedirNombre()) return;
  try {
    await refEq(code).update({ miembros: firebase.firestore.FieldValue.arrayUnion(yo()), ['nombres.' + yo()]: db.ajustes.miNombre });
    let t = trabajo(d.trabajoId);
    if (!t) { t = { id: d.trabajoId, creado: Date.now(), horas: [], gastos: [], pagos: [], fotos: [], movs: [], llevar: [], plan: '50/50', estado: 'en_curso' }; db.trabajos.push(t); }
    t.equipo = { code, owner: d.owner, miembros: [...new Set([...(d.miembros || []), yo()])], nombres: Object.assign({}, d.nombres, { [yo()]: db.ajustes.miNombre }), reparto: { tipo: 'horas' }, verPrecios: d.verPrecios !== false };
    if (d.info) { aplicarInfo(t, d.info); enviado(code).info = d.info; }
    EQ.listo[code] = false; save(); escuchar(t); location.hash = '#trabajo/' + t.id; toast('¡Dentro! Ya trabajáis juntos en «' + t.titulo + '»');
  } catch (e) { toast(e.code === 'permission-denied' ? 'No se ha podido: avisa a quien te invitó' : 'Sin conexión: inténtalo con cobertura'); }
};
window.salirEquipo = async (id) => {
  const t = trabajo(id), E = t.equipo, dueno = soyDueno(t);
  if (!confirm(dueno ? '¿Dejar de trabajar en equipo en este trabajo? Tus compañeros se quedan con una copia, pero ya no se actualizará.' : '¿Salir de este trabajo? Se quita de tu lista.')) return;
  try {
    if (dueno) await refEq(E.code).delete(); else await refEq(E.code).update({ miembros: firebase.firestore.FieldValue.arrayRemove(yo()) });
  } catch (e) { if (!E.cerrado) return toast('Sin conexión: inténtalo con cobertura'); }
  EQ.escuchas[E.code]?.(); delete EQ.escuchas[E.code];
  if (dueno) { delete t.equipo; } else { db.trabajos = db.trabajos.filter((x) => x !== t); db.material = db.material.filter((m) => m.trabajoId !== id); db.tareas = db.tareas.filter((x) => x.trabajoId !== id); }
  save(); location.hash = dueno ? '#trabajo/' + id : '#trabajos'; toast(dueno ? 'Ya no es un trabajo en equipo' : 'Has salido del trabajo');
};

/* ---------- Pantallas ---------- */
views.unirme = (code) => {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cab = `<header class="row"><button class="back" onclick="location.hash='#inicio'" aria-label="Volver">${ICON.back}</button><h1>Unirme a un trabajo</h1></header>`;
  if (!window.cloud?.user) { localStorage.setItem('chispas.unirme', code); return `${cab}<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Primero, tu cuenta</h2><div class="muted">Para trabajar en equipo cada uno entra con su cuenta. Es gratis y tarda un minuto. Después vuelves aquí solo.</div><a class="btn brand block" href="#cuenta">Entrar o crear cuenta</a></section>`; }
  if (!code) return `${cab}<section class="card" style="display:flex;flex-direction:column;gap:10px">${field('codigo', 'Código que te han pasado', '', 'text', 'placeholder="KTR-482" autocomplete="off" style="text-transform:uppercase;font-size:22px;letter-spacing:2px"')}<button class="btn brand block" onclick="location.hash='#unirme/'+$('#f-codigo').value">Buscar</button></section>`;
  const d = EQ.preview[code];
  if (d === undefined) { cargarPreview(code); return `${cab}<div class="card empty">Buscando el trabajo ${codigoBonito(code)}…</div>`; }
  if (d === 'cargando') return `${cab}<div class="card empty">Buscando el trabajo ${codigoBonito(code)}…</div>`;
  if (typeof d !== 'object') return `${cab}<div class="card empty">${d === 'no' ? `No hay ningún trabajo con el código ${codigoBonito(code)}. Revisa que esté bien escrito.` : 'No se ha podido buscar. Revisa la cobertura.'}</div><button class="btn light block" onclick="delete EQ.preview['${code}'];location.hash='#unirme/'">Probar otro código</button>`;
  const info = d.info ? JSON.parse(d.info) : {}, quien = d.nombres?.[d.owner] || 'Tu compañero', ya = (d.miembros || []).includes(yo());
  if (ya && trabajo(d.trabajoId)) { setTimeout(() => (location.hash = '#trabajo/' + d.trabajoId), 0); return cab; }
  const rep = REPARTOS[info.reparto?.tipo || 'horas'][0].toLowerCase();
  return `${cab}<section class="card" style="display:flex;flex-direction:column;gap:10px;border:2px solid var(--brand)">
    <div class="muted">${esc(quien)} te invita a trabajar con él en:</div>
    <div><div style="font-size:24px;font-weight:700;line-height:1.1">${esc(info.titulo || 'Trabajo')}</div><div class="muted">${esc([info.cliente?.nombre, info.direccion, info.cuando ? fmtWhen(info.cuando) : ''].filter(Boolean).join(' · '))}</div></div>
    <div style="display:flex;flex-direction:column;gap:6px;font-size:15px"><div>💶 Os repartís: <b>${esc(rep)}</b></div><div>⏱️ Fichas tus horas desde tu móvil</div><div>🧰 Veis los dos el material, las herramientas, el plano y las tareas</div>${info.verPrecios === false ? '<div>🔒 Los precios del cliente los lleva él</div>' : ''}</div>
    <button class="btn brand block" style="min-height:56px;font-size:17px" onclick="unirseEquipo('${code}')">Unirme al trabajo</button>
    <div class="muted" style="text-align:center">Tus trabajos propios siguen siendo solo tuyos.</div></section>`;
};

views.equipo = (id) => {
  const t = trabajo(id); if (!t) return '<div class="card empty">Este trabajo ya no existe.</div>';
  const cab = window.cabeceraTrabajo ? cabeceraTrabajo(t, 'trabajo') : '';
  const back = `<header class="row"><button class="back" onclick="location.hash='#trabajo/${id}'" aria-label="Volver">${ICON.back}</button><div style="flex:1;min-width:0"><h1 style="font-size:26px">Trabajo en equipo</h1><div class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.titulo)}</div></div>${t.equipo ? avataresEq(t, 32) : ''}</header>`;
  if (!t.equipo) {
    const op = (k) => `<button class="item" style="width:100%;text-align:left;border:2px solid ${eqForm.tipo === k ? 'var(--ink)' : 'var(--line)'};border-radius:12px;padding:10px 12px;background:${eqForm.tipo === k ? 'var(--warn-bg)' : 'var(--card)'};color:inherit;margin-bottom:6px;align-items:flex-start" onclick="eqForm.tipo='${k}';render()"><span style="width:20px;height:20px;border-radius:50%;border:2px solid var(--ink);flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center">${eqForm.tipo === k ? '<span style="width:10px;height:10px;border-radius:50%;background:var(--ink)"></span>' : ''}</span><span class="grow"><span class="t">${REPARTOS[k][0]}</span><span class="muted" style="display:block">${REPARTOS[k][1]}</span></span></button>`;
    return `${back}
    <section class="card"><h2 style="margin-bottom:8px">¿Cómo os repartís el dinero?</h2>${['horas', 'medias', 'jornal', 'pct'].map(op).join('')}
      ${eqForm.tipo === 'jornal' ? `<div class="grid2">${field('jornal', 'Jornal (€)', eqForm.jornal, 'text', 'inputmode="decimal" placeholder="120" oninput="eqForm.jornal=this.value"')}${select('jornalPor', 'Por', [['dia', 'día trabajado'], ['hora', 'hora trabajada']], eqForm.jornalPor).replace('<select', '<select onchange="eqForm.jornalPor=this.value"')}</div>
        <label class="check-row" style="margin-top:8px"><input type="checkbox" class="chk" ${eqForm.verPrecios ? '' : 'checked'} onchange="eqForm.verPrecios=!this.checked"> No enseñarle lo que cobro al cliente</label>` : ''}
      ${eqForm.tipo === 'pct' ? field('pct', 'Tu parte (%)', eqForm.pct, 'text', 'inputmode="decimal" oninput="eqForm.pct=this.value"') : ''}
      <div class="muted" style="margin-top:6px">Se puede cambiar cuando queráis.</div></section>
    <section class="card" style="display:flex;flex-direction:column;gap:8px"><div class="muted">Te damos un código y un enlace para mandárselo por WhatsApp. Tu compañero entra con su cuenta (vale Android y iPhone) y ya está dentro.</div>
      <button class="btn brand block" style="min-height:56px" onclick="crearEquipo('${id}')">Crear equipo e invitar</button></section>
    ${!window.cloud?.user ? '<div class="tip">Necesitas tener cuenta (Más › Mi cuenta). Tu compañero también.</div>' : ''}`;
  }
  const E = t.equipo, C = cuentasEquipo(t), me = yo(), mios = C.pagos.filter((p) => p.de === me || p.a === me);
  const invitar = `<section class="card" style="display:flex;flex-direction:column;gap:8px"><div class="between"><div><div class="muted">Código para unirse</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:32px;font-weight:700;letter-spacing:3px;line-height:1;white-space:nowrap">${codigoBonito(E.code)}</div></div><button class="btn sm light" onclick="copiarInvitacion('${id}')">Copiar enlace</button></div>
    <button class="btn ${E.miembros.length < 2 ? 'brand' : 'light'} block" onclick="invitarWhatsApp('${id}')">${E.miembros.length < 2 ? 'Mandar invitación por WhatsApp' : 'Invitar a otro compañero'}</button></section>`;
  const balance = `<section class="card" style="border:2px solid var(--ink);text-align:center;display:flex;flex-direction:column;gap:6px">
    <div class="muted" style="font-weight:700">PARA QUEDAR EN PAZ</div>
    ${E.miembros.length < 2 ? '<div style="font-size:20px;font-weight:700">Aún no se ha unido nadie</div>' : mios.length ? mios.map((p) => `<div style="font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:700;line-height:1.1">${esc(frasePago(t, p)).replace(/(\d[\d.,]*) €/, '<span style="white-space:nowrap">$1 €</span>')}</div>`).join('') : C.pagos.length ? C.pagos.map((p) => `<div style="font-size:18px;font-weight:700">${esc(frasePago(t, p))}</div>`).join('') : '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:30px;font-weight:700">Estáis en paz ✓</div>'}
    ${mios.length ? `<div class="grid2" style="margin-top:6px"><button class="btn light" onclick="saldarEquipo('${id}')">Ya está pagado</button><button class="btn light" onclick="calculoEquipo('${id}')">Ver cálculo</button></div>` : C.B || C.G ? `<button class="btn sm light" style="align-self:center" onclick="calculoEquipo('${id}')">Ver cálculo</button>` : ''}
    <div class="muted">${C.conPrecio ? 'Con lo cobrado hasta hoy · ' + esc(REPARTOS[C.R.tipo]?.[0] || '') : 'Tu jornal, tus gastos y lo que ya te han pagado'}</div></section>`;
  const horas = `<section class="card"><div class="between"><h2>Horas</h2><span class="muted">${fmtHoras(C.H)} en total</span></div><div class="list">${C.M.map((u) => { const abierta = (t.horas || []).some((h) => h.uid === u && !h.fin);
    return `<div class="item" style="align-items:center">${avatarEq(t, u)}<div class="grow"><div class="t">${esc(nombreEq(t, u))}</div><div class="muted" ${abierta ? 'style="color:var(--ok);font-weight:700"' : ''}>${abierta ? 'Trabajando ahora' : (C.dias[u]?.size || 0) + ' ' + ((C.dias[u]?.size || 0) === 1 ? 'día' : 'días')}</div></div><b>${fmtHoras(C.horas[u] || 0)}</b></div>`; }).join('')}</div></section>`;
  const cosas = [...db.material.filter((m) => m.trabajoId === id && !m.comprado).map((m) => ['m', m]), ...(t.llevar || []).map((x) => ['l', x])];
  const lleva = `<section class="card"><div class="between"><h2>¿Quién lleva qué?</h2><button class="btn sm light" onclick="nuevoLlevar('${id}')">+ Añadir</button></div>
    <div class="list">${cosas.map(([k, x]) => { const q = x.lleva; return `<div class="item" style="align-items:center"><div class="grow"><div class="t">${esc(x.nombre)}</div><div class="muted">${k === 'm' ? 'Material · ' + esc(x.tienda || 'comprar') : 'Herramienta'}</div></div>
      <button class="btn sm ${q ? 'light' : ''}" onclick="llevarCambiar('${id}','${k}','${x.id}')">${q ? (q === me ? 'Yo' : esc(nombreReal(t, q))) : 'Lo llevo yo'}</button></div>`; }).join('') || '<div class="empty">Apunta lo que hay que llevar (radial, andamio, plato de ducha…) y que cada uno marque lo suyo. Así nadie da por hecho que lo lleva el otro.</div>'}</div></section>`;
  const movs = [...(t.gastos || []).map((g) => ({ f: g.fecha, u: g.pagadorUid || E.owner, t: g.concepto, s: g.deObra === false ? 'Solo suyo · no se reparte' : 'Gasto de la obra · pagó ' + nombreEq(t, g.pagadorUid || E.owner), imp: g.importe })),
    ...db.material.filter((m) => m.trabajoId === id && m.comprado && m.precio && !m.herramienta).map((m) => ({ f: m.compradoEn, u: m.compradoPor || E.owner, t: m.nombre, s: 'Material · lo compró ' + nombreEq(t, m.compradoPor || E.owner), imp: m.precio })),
    ...(t.pagos || []).filter((p) => p.cobrado).map((p) => ({ f: p.fecha, u: p.cobradoPor || E.owner, t: 'Cobro · ' + p.nombre, s: 'Lo cobró ' + nombreEq(t, p.cobradoPor || E.owner), imp: p.importe })),
    ...(t.movs || []).map((m) => m.tipo === 'pago' ? { f: m.fecha, u: m.de, t: m.concepto || 'Pago entre vosotros', s: `${nombreEq(t, m.de)} → ${nombreEq(t, m.a)}`, imp: m.importe } : { f: m.fecha, u: m.uid, t: m.concepto || 'Cobro en mano', s: 'Lo cobró ' + nombreEq(t, m.uid), imp: m.importe })].sort((a, b) => (b.f || 0) - (a.f || 0));
  const lista = `<section class="card"><div class="between"><h2>Movimientos</h2><button class="btn sm" onclick="apuntarEquipo('${id}')">+ Apuntar</button></div>
    <div class="list">${movs.slice(0, 30).map((m) => `<div class="item" style="align-items:center">${C.M.includes(m.u) ? avatarEq(t, m.u, 28) : ''}<div class="grow"><div class="t">${esc(m.t)}</div><div class="muted">${esc(m.s)}${m.f ? ' · ' + fmtDay(m.f) : ''}</div></div><b>${eur(m.imp)}</b></div>`).join('') || '<div class="empty">Apunta aquí los gastos de la obra (diciendo quién pagó), los cobros en mano y los adelantos entre vosotros.</div>'}</div></section>`;
  const ajustes = `<section class="card" style="display:flex;flex-direction:column;gap:8px"><h2>Ajustes del equipo</h2>
    <div class="muted">Reparto: <b>${esc(REPARTOS[C.R.tipo]?.[0] || '')}</b>${C.R.tipo === 'jornal' ? ' · ' + esc(Object.entries(C.R.jornal || {}).map(([u, j]) => `${nombreReal(t, u)} ${eur(num(j.importe))}/${j.por === 'hora' ? 'hora' : 'día'}`).join(', ') || 'falta poner el jornal') : ''}${C.R.tipo === 'pct' ? ' · ' + esc(C.M.map((u) => `${nombreReal(t, u)} ${String(num(C.R.pct?.[u]) ?? Math.round(100 / C.M.length)).replace('.', ',')} %`).join(', ')) : ''}</div>
    ${soyDueno(t) ? `<button class="btn light block" onclick="formReparto('${id}')">Cambiar el reparto</button>` : ''}
    <button class="btn ghost block" onclick="salirEquipo('${id}')">${soyDueno(t) ? 'Dejar de trabajar en equipo' : 'Salir de este trabajo'}</button></section>`;
  return `${back}${E.cerrado ? `<div class="tip">${E.fuera ? 'Ya no formas parte de este trabajo.' : 'Quien creó el trabajo dejó de compartirlo.'} Te queda esta copia, pero ya no se actualiza.</div>` : ''}${E.miembros.length < 2 ? invitar : ''}${balance}${horas}${lleva}${lista}${E.miembros.length >= 2 ? invitar : ''}${ajustes}`;
};

window.calculoEquipo = (id) => {
  const t = trabajo(id), C = cuentasEquipo(t);
  const fila = (a, b, fuerte) => `<div class="between" style="padding:4px 0;${fuerte ? 'font-weight:700;border-top:1px solid var(--line);margin-top:4px;padding-top:8px' : ''}"><span ${fuerte ? '' : 'class="muted"'}>${a}</span><b>${b}</b></div>`;
  openSheet(`<h2>Cómo sale la cuenta</h2>
    ${C.conPrecio ? fila('Cobrado al cliente', eur(C.I)) + fila('Gastos de la obra', '− ' + eur(C.G)) + fila('Beneficio', eur(C.B), true) : ''}
    ${C.M.map((u) => `<div class="card" style="background:var(--bg);margin-top:8px"><div class="row" style="gap:8px;margin-bottom:4px">${avatarEq(t, u, 26)}<b>${esc(nombreEq(t, u))}</b><span class="muted">${fmtHoras(C.horas[u])}${C.R.tipo === 'horas' && C.H ? ' · ' + Math.round((C.horas[u] / C.H) * 100) + ' %' : ''}</span></div>
      ${fila('Le toca del beneficio', eur(C.parte[u]))}${C.gas[u] ? fila('+ Lo que adelantó en gastos', eur(C.gas[u])) : ''}${C.ing[u] ? fila('− Lo que cobró él', eur(C.ing[u])) : ''}${C.mov[u] ? fila(C.mov[u] > 0 ? '− Lo que ya le pagaron' : '+ Lo que ya pagó a otros', eur(Math.abs(C.mov[u]))) : ''}
      ${fila(C.saldo[u] > 0.005 ? 'Tiene que pagar' : C.saldo[u] < -0.005 ? 'Tiene que recibir' : 'En paz', eur(Math.abs(C.saldo[u])), true)}</div>`).join('')}
    <button class="btn block" onclick="closeSheet()">Entendido</button>`);
};
window.saldarEquipo = (id) => {
  const t = trabajo(id), C = cuentasEquipo(t), mios = C.pagos.filter((p) => p.de === yo() || p.a === yo()); if (!mios.length) return;
  if (!confirm(mios.map((p) => frasePago(t, p)).join('\n') + '\n\n¿Ya está pagado?')) return;
  mios.forEach((p) => (t.movs = t.movs || []).push({ id: uid(), tipo: 'pago', de: p.de, a: p.a, importe: p.importe, concepto: 'Quedar en paz', fecha: Date.now(), por: yo() }));
  save(); render(); toast('Apuntado. Estáis en paz');
};
window.apuntarEquipo = (id) => {
  const t = trabajo(id), E = t.equipo, otros = E.miembros.filter((u) => u !== yo());
  let tipo = 'gasto';
  const pinta = () => openSheet(`<h2>Apuntar en la obra</h2>
    <div class="tabs" role="tablist">${[['gasto', 'Gasto'], ['cobro', 'Cobro en mano'], ['pago', 'Adelanto']].map(([k, n]) => `<button role="tab" type="button" aria-selected="${tipo === k}" data-t="${k}">${n}</button>`).join('')}</div>
    ${field('eimp', 'Importe (€)', '', 'text', 'inputmode="decimal" placeholder="0" style="font-size:24px;font-weight:700;text-align:center"')}
    ${field('econ', tipo === 'gasto' ? 'Concepto' : 'Nota (opcional)', '', 'text', tipo === 'gasto' ? 'placeholder="Gasolina, azulejo, contenedor…"' : 'placeholder="' + (tipo === 'pago' ? 'Adelanto del viernes' : 'Me lo dio en mano') + '"')}
    ${tipo === 'pago' ? select('ea', '¿A quién le has dado el dinero?', otros.map((u) => [u, nombreReal(t, u)]), otros[0]) :
      select('equien', tipo === 'gasto' ? '¿Quién lo ha pagado?' : '¿Quién lo ha cobrado?', E.miembros.map((u) => [u, u === yo() ? 'Yo' : nombreReal(t, u)]), yo())}
    ${tipo === 'gasto' ? `<label class="check-row"><input type="checkbox" class="chk" id="f-esolo"> Es solo mío (no se reparte: mi bocadillo, mi multa…)</label>` : ''}
    <button class="btn brand block" data-ok>Guardar</button>`, (s) => {
    s.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tipo = b.dataset.t; pinta(); }));
    s.querySelector('[data-ok]').onclick = () => {
      const imp = num(s.querySelector('#f-eimp').value), con = s.querySelector('#f-econ').value.trim(); if (!imp) return s.querySelector('#f-eimp').focus();
      if (tipo === 'gasto') { if (!con) return s.querySelector('#f-econ').focus(); (t.gastos = t.gastos || []).push({ id: uid(), concepto: con, importe: imp, tipo: 'Otro', pagadorUid: s.querySelector('#f-equien').value, deObra: !s.querySelector('#f-esolo').checked, fecha: Date.now(), por: yo() }); }
      else if (tipo === 'cobro') (t.movs = t.movs || []).push({ id: uid(), tipo: 'cobro', uid: s.querySelector('#f-equien').value, importe: imp, concepto: con || 'Cobro en mano', fecha: Date.now(), por: yo() });
      else (t.movs = t.movs || []).push({ id: uid(), tipo: 'pago', de: yo(), a: s.querySelector('#f-ea').value, importe: imp, concepto: con || 'Adelanto', fecha: Date.now(), por: yo() });
      save(); closeSheet(); render(); toast('Apuntado');
    };
  });
  pinta();
};
window.formReparto = (id) => {
  const t = trabajo(id), E = t.equipo, R = E.reparto || { tipo: 'horas' }; let tipo = R.tipo;
  const pinta = () => openSheet(`<h2>¿Cómo os repartís?</h2>
    <div class="pills" style="flex-wrap:wrap">${Object.entries(REPARTOS).map(([k, v]) => `<button type="button" aria-pressed="${tipo === k}" data-r="${k}">${v[0]}</button>`).join('')}</div>
    <div class="muted">${REPARTOS[tipo][1]}</div>
    ${tipo === 'jornal' ? E.miembros.filter((u) => u !== E.owner).map((u) => `<div class="grid2">${field('j_' + u, 'Jornal de ' + esc(nombreReal(t, u)) + ' (€)', R.jornal?.[u]?.importe ?? R.jornalPendiente?.importe ?? '', 'text', 'inputmode="decimal"')}${select('jp_' + u, 'Por', [['dia', 'día'], ['hora', 'hora']], R.jornal?.[u]?.por || R.jornalPendiente?.por || 'dia')}</div>`).join('')
      + `<label class="check-row"><input type="checkbox" class="chk" id="f-ocultar" ${E.verPrecios === false ? 'checked' : ''}> No enseñarles lo que cobro al cliente</label>` : ''}
    ${tipo === 'pct' ? E.miembros.map((u) => field('p_' + u, (u === yo() ? 'Tu parte' : 'Parte de ' + esc(nombreReal(t, u))) + ' (%)', R.pct?.[u] ?? Math.round(100 / E.miembros.length), 'text', 'inputmode="decimal"')).join('') : ''}
    <button class="btn brand block" data-ok>Guardar</button>`, (s) => {
    s.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { tipo = b.dataset.r; pinta(); }));
    s.querySelector('[data-ok]').onclick = () => {
      const n = { tipo };
      if (tipo === 'jornal') { n.jornal = {}; E.miembros.filter((u) => u !== E.owner).forEach((u) => { n.jornal[u] = { importe: num(s.querySelector('#f-j_' + u).value) || 0, por: s.querySelector('#f-jp_' + u).value }; }); E.verPrecios = !s.querySelector('#f-ocultar').checked; }
      else E.verPrecios = true;
      if (tipo === 'pct') { n.pct = {}; let tot = 0; E.miembros.forEach((u) => { n.pct[u] = num(s.querySelector('#f-p_' + u).value) || 0; tot += n.pct[u]; }); if (Math.abs(tot - 100) > 0.01) return toast(`Los porcentajes suman ${String(tot).replace('.', ',')} %: tienen que sumar 100`); }
      E.reparto = n; save(); closeSheet(); render(); toast('Reparto guardado');
    };
  });
  pinta();
};
window.nuevoLlevar = (id) => { const n = prompt('¿Qué hay que llevar? (radial, andamio, escalera grande…)'); if (!n?.trim()) return; const t = trabajo(id); (t.llevar = t.llevar || []).push({ id: uid(), nombre: n.trim(), lleva: yo() }); save(); render(); };
window.llevarCambiar = (id, k, xid) => {
  const t = trabajo(id), x = k === 'm' ? db.material.find((m) => m.id === xid) : t.llevar.find((l) => l.id === xid), M = [null, ...t.equipo.miembros];
  const orden = [null, yo(), ...t.equipo.miembros.filter((u) => u !== yo())];
  x.lleva = orden[(orden.indexOf(x.lleva ?? null) + 1) % orden.length]; save(); render();
};

/* ---------- En el resto de la app ---------- */
// Tarjeta del equipo en el resumen del trabajo
window.tarjetaEquipo = (t) => {
  if (!t.equipo) return t.estado === 'terminado' ? '' : `<button class="btn light block" onclick="location.hash='#equipo/${t.id}'">👥 Trabajar en equipo con un compañero</button>`;
  const C = cuentasEquipo(t), mios = C.pagos.filter((p) => p.de === yo() || p.a === yo());
  return `<a class="card" href="#equipo/${t.id}" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:12px;border:2px solid var(--line2)">${avataresEq(t, 34)}<div style="flex:1;min-width:0"><div class="muted" style="font-weight:700;font-size:13px">EN EQUIPO · ${esc(REPARTOS[C.R.tipo]?.[0].toUpperCase() || '')}</div>
    <div style="font-size:19px;font-weight:700;line-height:1.2">${t.equipo.miembros.length < 2 ? 'Esperando a que se una tu compañero' : mios.length ? esc(mios.map((p) => frasePago(t, p)).join(' · ')) : 'Estáis en paz'}</div></div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></a>`;
};
// Pendiente en Hoy: lo que tienes que pagar o cobrar a compañeros
window.pendientesEquipo = () => saldosCompaneros().filter((c) => Math.abs(c.saldo) > 0.5).map((c) => `<a class="item" href="#companeros" style="text-decoration:none;color:inherit"><span class="chip ${c.saldo < 0 ? 'warn' : 'ok'}">Equipo</span><div class="grow"><div class="t">${c.saldo < 0 ? `Le debes ${eur(-c.saldo)} a ${esc(c.nombre)}` : `${esc(c.nombre)} te debe ${eur(c.saldo)}`}</div><div class="muted">${c.trabajos.length} ${c.trabajos.length === 1 ? 'trabajo' : 'trabajos'} juntos</div></div></a>`);
function saldosCompaneros() {
  const me = yo(), por = {};
  db.trabajos.filter((t) => t.equipo).forEach((t) => {
    const C = cuentasEquipo(t);
    t.equipo.miembros.filter((u) => u !== me).forEach((u) => { const c = (por[u] = por[u] || { uid: u, nombre: nombreReal(t, u), saldo: 0, trabajos: [] }); c.trabajos.push([t, 0]); });
    C.pagos.forEach((p) => { if (p.de === me && por[p.a]) { por[p.a].saldo -= p.importe; por[p.a].trabajos.find(([x]) => x === t)[1] -= p.importe; } if (p.a === me && por[p.de]) { por[p.de].saldo += p.importe; por[p.de].trabajos.find(([x]) => x === t)[1] += p.importe; } });
  });
  return Object.values(por);
}
views.companeros = () => {
  const l = saldosCompaneros();
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><h1 style="flex:1">Compañeros</h1></header>
  <a class="btn light block" href="#unirme/">Unirme a un trabajo con un código</a>
  ${l.map((c) => { const t0 = c.trabajos[0][0];
    return `<section class="card"><div class="row" style="gap:12px;align-items:center">${avatarEq(t0, c.uid, 42)}<div class="grow"><div style="font-size:20px;font-weight:700">${esc(c.nombre)}</div><div class="muted">${c.trabajos.length} ${c.trabajos.length === 1 ? 'trabajo' : 'trabajos'} juntos</div></div>
      <div style="text-align:right"><div class="muted">${Math.abs(c.saldo) < 0.5 ? '' : c.saldo < 0 ? 'le debes' : 'te debe'}</div><b style="font-size:20px;color:${Math.abs(c.saldo) < 0.5 ? 'var(--ok)' : c.saldo < 0 ? 'var(--warn)' : 'var(--ok)'}">${Math.abs(c.saldo) < 0.5 ? 'En paz ✓' : eur(Math.abs(c.saldo))}</b></div></div>
      <div class="list" style="margin-top:6px">${c.trabajos.map(([t, s]) => `<a class="item" href="#equipo/${t.id}" style="text-decoration:none;color:inherit;align-items:center"><div class="grow"><div class="t">${esc(t.titulo)}</div><div class="muted">${esc(REPARTOS[t.equipo.reparto?.tipo || 'horas'][0])}${t.estado === 'terminado' ? ' · terminado' : ''}</div></div><b>${Math.abs(s) < 0.5 ? '✓' : (s < 0 ? '− ' : '+ ') + eur(Math.abs(s))}</b></a>`).join('')}</div></section>`; }).join('')
    || '<div class="card empty">Todavía no trabajas en equipo con nadie. Entra en un trabajo y toca «Trabajar en equipo», o únete con el código que te pase un compañero.</div>'}`;
};
// Cobros: quién cobra (lo marca el dueño)
const cobroEqBase = window.cobro;
window.cobro = (tid, pid, v) => { const t = trabajo(tid), p = (t.pagos || []).find((x) => x.id === pid); if (p && v) p.cobradoPor = yo() || undefined; cobroEqBase(tid, pid, v); };
// Material comprado: quién lo pagó
const compradoEqBase = window.comprado;
window.comprado = (id) => { const m = db.material.find((x) => x.id === id); if (m) m.compradoPor = yo() || undefined; compradoEqBase(id); };
const matCompradoEqBase = window.matComprado;
window.matComprado = (id, v) => { const m = db.material.find((x) => x.id === id); if (m && v) m.compradoPor = yo() || undefined; matCompradoEqBase(id, v); };
// Gastos de un trabajo en equipo: siempre con quién pagó
const formGastoBase = window.formGasto || formGasto;
window.formGasto = (t) => (t?.equipo ? apuntarEquipo(t.id) : formGastoBase(t));
// Presupuesto: solo lo cambia quien creó el trabajo; si no quiere, los demás no ven precios
const vistaPresuEq = views.presupuesto;
views.presupuesto = (id) => {
  const t = trabajo(id); if (!t?.equipo || soyDueno(t)) return vistaPresuEq(id);
  const cab = cabeceraTrabajo(t, 'presupuesto'), quien = esc(nombreReal(t, t.equipo.owner));
  if (!verPrecios(t)) return `${cab}<div class="card empty">🔒 El presupuesto y los precios del cliente los lleva ${quien}. Tú ves tu jornal en «Trabajo en equipo».</div>`;
  const html = vistaPresuEq(id), cuerpo = html.startsWith(cab) ? html.slice(cab.length) : html;
  return `${cab}<div class="tip">Solo ${quien} puede cambiar el presupuesto. Tú lo ves para saber qué hay que hacer.</div><fieldset disabled style="border:0;padding:0;margin:0;min-width:0;display:flex;flex-direction:column;gap:12px">${cuerpo}</fieldset>`;
};
// Si un compañero que no ve precios da el trabajo por terminado, queda pendiente de cobro para el dueño
const terminarEqBase = window.terminarTrabajo;
window.terminarTrabajo = (id) => { terminarEqBase(id); const t = trabajo(id); if (t?.equipo && !verPrecios(t) && t.estado === 'terminado') { t.estado = 'por_cobrar'; save(); render(); } };
// Pasar al compañero los nombres nuevos si los cambias
window.cambiarMiNombre = async () => { if (!pedirNombre()) return; for (const t of db.trabajos.filter((x) => x.equipo && !x.equipo.cerrado)) { t.equipo.nombres[yo()] = db.ajustes.miNombre; try { await refEq(t.equipo.code).update({ ['nombres.' + yo()]: db.ajustes.miNombre }); } catch {} } render(); toast('Nombre cambiado'); };
// Si llega un enlace de invitación sin cuenta, al entrar se vuelve a él
const vistaCuentaEq = views.cuenta;
views.cuenta = () => { const h = vistaCuentaEq(), p = localStorage.getItem('chispas.unirme'); return p && !window.cloud?.user ? h.replace('</header>', '</header><div class="tip"><b>Te han invitado a un trabajo.</b> Entra o crea tu cuenta y te llevamos a él.</div>') : h; };

render();
