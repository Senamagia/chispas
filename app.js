/* Chispas v0.1 · app de gestión para chapuzas de obra.
   Todo se guarda en el propio móvil (y en una copia de seguridad que puedes descargar).
   La nube (Firebase) y los avisos programados se conectan en el siguiente paso. */
'use strict';

/* ---------- Datos ---------- */
const KEY = 'chispas.v1';
const VERSION = '0.3.1';
const OFICIOS = ['Electricidad', 'Fontanería', 'Albañilería', 'Pladur', 'Carpintería', 'Pintura', 'Otros'];
const TIENDAS = ['Obramat', 'Leroy Merlin', 'Otra'];
const SITIOS = ['Coche', 'Armario de casa', 'Maletín', 'En una obra', 'Prestada'];
const ESTADOS = { presupuesto: 'Presupuesto', en_curso: 'En curso', por_cobrar: 'Por cobrar', terminado: 'Terminado' };
const PLANES = { '50/50': [50, 50], '40/30/30': [40, 30, 30], 'Al terminar': [100] };

const CATALOGO_INICIAL = [
  ['Electricidad', 'Punto de luz nuevo', 'ud'], ['Electricidad', 'Cambio de enchufe', 'ud'], ['Electricidad', 'Línea nueva (horno, placa…)', 'ud'],
  ['Electricidad', 'Cambio de cuadro eléctrico', 'ud'], ['Electricidad', 'Instalar lámpara', 'ud'],
  ['Fontanería', 'Cambio de grifo', 'ud'], ['Fontanería', 'Cambio de cisterna o mecanismo', 'ud'], ['Fontanería', 'Desatasco', 'ud'],
  ['Fontanería', 'Cambio de termo', 'ud'], ['Fontanería', 'Toma de agua nueva', 'ud'],
  ['Albañilería', 'Alicatado', 'm²'], ['Albañilería', 'Solado', 'm²'], ['Albañilería', 'Tapado de rozas', 'm'], ['Albañilería', 'Día de albañil', 'día'],
  ['Pladur', 'Tabique de pladur', 'm²'], ['Pladur', 'Techo de pladur', 'm²'], ['Pladur', 'Trasdosado', 'm²'],
  ['Carpintería', 'Colgar puerta', 'ud'], ['Carpintería', 'Ajustar puerta o ventana', 'ud'], ['Carpintería', 'Montar mueble', 'ud'],
  ['Pintura', 'Pintar paredes', 'm²'], ['Pintura', 'Pintar techos', 'm²'], ['Pintura', 'Alisar gotelé', 'm²'],
  ['Otros', 'Hora de trabajo', 'hora'], ['Otros', 'Desplazamiento', 'ud'],
];

const _p = (total, pcts) => { const r = pcts.map((p) => Math.round(total * p) / 100); r[r.length - 1] = Math.round((total - r.slice(0, -1).reduce((s, x) => s + x, 0)) * 100) / 100; return r; };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
function emptyDB() {
  return {
    v: 1, tareas: [], clientes: [], trabajos: [], material: [], stock: [], herramientas: [],
    catalogo: CATALOGO_INICIAL.map(([oficio, nombre, unidad]) => ({ id: uid(), oficio, nombre, unidad, precio: null, minutos: null, conMaterial: false })),
    ajustes: { tema: 'auto', ultimaCopia: null },
  };
}
let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || emptyDB(); } catch { db = emptyDB(); }
function save() { db.ajustes.modificado = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('No se pudo guardar: memoria llena'); } window.cloud?.onSave?.(); }

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n) => (Math.round((n || 0) * 100) / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' €';
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const sameDay = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();
const fmtDay = (d) => new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const fmtWhen = (d) => { if (!d) return ''; const t = today(), x = new Date(d); const diff = Math.round((new Date(x).setHours(0, 0, 0, 0) - t) / 864e5);
  const h = fmtTime(d); return diff === 0 ? `Hoy · ${h}` : diff === 1 ? `Mañana · ${h}` : diff === -1 ? `Ayer · ${h}` : `${fmtDay(d)} · ${h}`; };
const cliente = (id) => db.clientes.find((c) => c.id === id);
const trabajo = (id) => db.trabajos.find((t) => t.id === id);
const nombreTrabajo = (t) => t ? `${t.titulo}${cliente(t.clienteId) ? ' · ' + cliente(t.clienteId).nombre : ''}` : '';
const ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4a8 8 0 1 1 16-4z"/></svg>',
};

/* ---------- Horas trabajadas ---------- */
const horasDe = (t) => (t.horas || []).reduce((s, h) => s + ((h.fin || Date.now()) - h.inicio), 0) / 36e5;
const fichando = () => db.trabajos.find((t) => (t.horas || []).some((h) => !h.fin));
const cobradoDe = (t) => (t.pagos || []).filter((p) => p.cobrado).reduce((s, p) => s + p.importe, 0);
const gastosDe = (t) => (t.gastos || []).reduce((s, g) => s + g.importe, 0) + db.material.filter((m) => m.trabajoId === t.id && m.comprado && m.precio).reduce((s, m) => s + m.precio, 0);
function rentabilidad(t) {
  const limpio = (t.importe || 0) - gastosDe(t), h = horasDe(t);
  return { limpio, horas: h, porHora: h > 0.25 ? limpio / h : null };
}

/* ---------- Tema ---------- */
function applyTheme() {
  const t = db.ajustes.tema, dark = t === 'oscuro' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
applyTheme();

/* ---------- Bienvenida (3 s) ---------- */
(function splash() {
  const el = $('#splash');
  $('#splash-guy').innerHTML = `<svg viewBox="0 0 200 240" role="img" aria-label="El monigote Chispas enciende su bombilla y saluda">${chispasGuy({ anim: true })}</svg>`;
  const hoy = db.trabajos.filter((t) => sameDay(t.cuando, new Date())).length;
  const pend = db.tareas.filter((t) => !t.hecha).length;
  $('#splash-msg').innerHTML = hoy || pend
    ? `¡Buenas! Hoy tienes <b>${hoy} ${hoy === 1 ? 'obra' : 'obras'}</b> y <b>${pend} ${pend === 1 ? 'cosa' : 'cosas'}</b> que no olvidar.`
    : '¡Buenas! Vamos a por el día.';
  let done = false;
  const go = () => { if (done) return; done = true; el.classList.add('out'); $('#app').hidden = false; setTimeout(() => el.remove(), 400);
    setTimeout(() => { if (window.cloud?.ready && !cloud.user && !db.ajustes.sinCuenta) location.hash = '#cuenta'; }, 900); };
  el.addEventListener('click', go); el.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && go());
  setTimeout(go, 3000);
})();

/* ---------- Avisos (toast con deshacer) ---------- */
let toastTimer;
function toast(msg, undo) {
  const t = $('#toast'); t.innerHTML = esc(msg) + (undo ? ' <button>Deshacer</button>' : ''); t.hidden = false;
  if (undo) t.querySelector('button').onclick = () => { undo(); t.hidden = true; render(); };
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 4500);
}

/* ---------- Hoja inferior genérica ---------- */
function openSheet(html, onMount) {
  const s = $('#sheet'); s.innerHTML = `<div class="grip"></div>${html}`; s.hidden = false; $('#sheet-backdrop').hidden = false;
  onMount && onMount(s); const f = s.querySelector('input,select,textarea'); f && setTimeout(() => f.focus(), 50);
}
function closeSheet() { $('#sheet').hidden = true; $('#sheet-backdrop').hidden = true; $('#sheet').innerHTML = ''; }
$('#sheet-backdrop').onclick = closeSheet;
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeSheet());
const field = (name, label, value = '', type = 'text', extra = '') =>
  `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
const select = (name, label, options, value) =>
  `<div class="field"><label for="f-${name}">${label}</label><select id="f-${name}" name="${name}">${options.map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></div>`;
const formData = (s) => Object.fromEntries([...s.querySelectorAll('[name]')].map((i) => [i.name, i.type === 'checkbox' ? i.checked : i.value.trim()]));
const trabajoOptions = (withNone = true) => [...(withNone ? [['', '— Sin trabajo —']] : []), ...db.trabajos.filter((t) => t.estado !== 'terminado').map((t) => [t.id, nombreTrabajo(t)])];
const toLocalInput = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

/* ---------- Formularios ---------- */
function formTarea(t = {}) {
  openSheet(`<h2>${t.id ? 'Editar' : 'Nueva'} cosa que no olvidar</h2>
    ${field('texto', '¿Qué?', t.texto, 'text', 'required placeholder="Llamar a Luis para medir la cocina"')}
    ${field('cuando', '¿Cuándo te aviso?', toLocalInput(t.cuando), 'datetime-local')}
    ${select('trabajoId', 'Trabajo', trabajoOptions(), t.trabajoId || '')}
    <div class="grid2">${t.id ? '<button class="btn danger" data-del>Borrar</button>' : '<span></span>'}<button class="btn" data-ok>Guardar</button></div>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => {
      const d = formData(s); if (!d.texto) return s.querySelector('#f-texto').focus();
      const obj = Object.assign(t.id ? t : { id: uid(), hecha: false, creada: Date.now() }, { texto: d.texto, cuando: d.cuando ? new Date(d.cuando).getTime() : null, trabajoId: d.trabajoId || null });
      if (!t.id) db.tareas.push(obj); save(); closeSheet(); render(); toast('Apuntado');
    };
    const del = s.querySelector('[data-del]'); del && (del.onclick = () => { db.tareas = db.tareas.filter((x) => x !== t); save(); closeSheet(); render(); toast('Borrado', () => { db.tareas.push(t); save(); }); });
  });
}

function formCliente(c = {}, after) {
  openSheet(`<h2>${c.id ? 'Editar' : 'Nuevo'} cliente</h2>
    ${field('nombre', 'Nombre', c.nombre, 'text', 'required autocomplete="off"')}
    ${field('tel', 'Teléfono', c.tel, 'tel', 'inputmode="tel"')}
    ${field('dir', 'Dirección', c.dir)}
    <button class="btn block" data-ok>Guardar</button>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => {
      const d = formData(s); if (!d.nombre) return s.querySelector('#f-nombre').focus();
      const obj = Object.assign(c.id ? c : { id: uid() }, d); if (!c.id) db.clientes.push(obj); save(); closeSheet(); after ? after(obj) : render();
    };
  });
}

function formTrabajo(t = {}) {
  const clientes = [['', '— Elige cliente —'], ...db.clientes.map((c) => [c.id, c.nombre]), ['__nuevo', '+ Cliente nuevo']];
  openSheet(`<h2>${t.id ? 'Editar trabajo' : 'Trabajo nuevo'}</h2>
    ${field('titulo', '¿Qué trabajo es?', t.titulo, 'text', 'required placeholder="Reforma de baño"')}
    ${select('clienteId', 'Cliente', clientes, t.clienteId || '')}
    ${field('direccion', 'Dirección de la obra', t.direccion || cliente(t.clienteId)?.dir || '')}
    <div class="field"><label>Oficios</label><div class="pills" id="oficios">${OFICIOS.map((o) => `<button type="button" aria-pressed="${(t.oficios || []).includes(o)}">${o}</button>`).join('')}</div></div>
    <div class="grid2">${field('importe', 'Precio total (€)', t.importe ?? '', 'text', 'inputmode="decimal"')}${select('plan', 'Forma de cobro', Object.keys(PLANES), t.plan || '50/50')}</div>
    <div class="grid2">${select('estado', 'Estado', Object.entries(ESTADOS), t.estado || 'presupuesto')}${field('cuando', 'Próximo día de obra', toLocalInput(t.cuando), 'datetime-local')}</div>
    <label class="check-row"><input type="checkbox" class="chk" name="factura" ${t.factura ? 'checked' : ''}> Con factura (IVA)</label>
    ${field('socio', 'Socio (si lo hacéis a medias)', t.socio || '', 'text', 'placeholder="Nombre del socio"')}
    <div class="grid2">${t.id ? '<button class="btn danger" data-del>Borrar</button>' : '<span></span>'}<button class="btn" data-ok>Guardar</button></div>`, (s) => {
    s.querySelectorAll('#oficios button').forEach((b) => (b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
    s.querySelector('#f-clienteId').onchange = (e) => {
      if (e.target.value === '__nuevo') {
        const keep = formData(s); keep.oficios = [...s.querySelectorAll('#oficios [aria-pressed="true"]')].map((b) => b.textContent);
        formCliente({}, (c) => formTrabajo(Object.assign(t, keep, { clienteId: c.id, direccion: keep.direccion || c.dir, importe: num(keep.importe), factura: keep.factura })));
      }
    };
    s.querySelector('[data-ok]').onclick = () => {
      const d = formData(s); if (!d.titulo) return s.querySelector('#f-titulo').focus();
      const importe = num(d.importe);
      const obj = Object.assign(t.id ? t : { id: uid(), creado: Date.now(), horas: [], gastos: [], pagos: [], fotos: [] }, {
        titulo: d.titulo, clienteId: d.clienteId && d.clienteId !== '__nuevo' ? d.clienteId : null, direccion: d.direccion, importe, plan: d.plan, estado: d.estado,
        cuando: d.cuando ? new Date(d.cuando).getTime() : null, factura: d.factura, socio: d.socio || null,
        oficios: [...s.querySelectorAll('#oficios [aria-pressed="true"]')].map((b) => b.textContent),
      });
      // Rehacer los pagos si cambia el importe o el plan y aún no se ha cobrado nada
      if (importe && !(obj.pagos || []).some((p) => p.cobrado)) {
        const nombres = { 2: ['Al empezar', 'Al terminar'], 3: ['Al empezar', 'A mitad de obra', 'Al terminar'], 1: ['Al terminar'] };
        const pcts = PLANES[obj.plan], imps = _p(importe, pcts); obj.pagos = pcts.map((p, i) => ({ id: uid(), nombre: nombres[pcts.length][i], pct: p, importe: imps[i], cobrado: false }));
      }
      if (!t.id) db.trabajos.push(obj); save(); closeSheet(); location.hash = '#trabajo/' + obj.id; render(); toast('Trabajo guardado');
    };
    const del = s.querySelector('[data-del]'); del && (del.onclick = () => {
      if (!confirm('¿Borrar este trabajo y todo lo que tiene apuntado?')) return;
      db.trabajos = db.trabajos.filter((x) => x !== t); save(); closeSheet(); location.hash = '#trabajos';
    });
  });
}

function formMaterial(m = {}) {
  openSheet(`<h2>${m.id ? 'Editar' : 'Apuntar'} material</h2>
    ${field('nombre', '¿Qué?', m.nombre, 'text', 'required placeholder="Tornillos PM 25"')}
    <div class="grid2">${field('cantidad', 'Cantidad', m.cantidad || '', 'text', 'placeholder="2 cajas"')}${field('precio', 'Precio aprox. (€)', m.precio ?? '', 'text', 'inputmode="decimal"')}</div>
    <div class="grid2">${select('tienda', 'Tienda', TIENDAS, m.tienda || 'Obramat')}${select('trabajoId', 'Para', [['', 'Para reponer'], ...trabajoOptions(false)], m.trabajoId || '')}</div>
    <div class="grid2">${m.id ? '<button class="btn danger" data-del>Borrar</button>' : '<span></span>'}<button class="btn" data-ok>Guardar</button></div>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => {
      const d = formData(s); if (!d.nombre) return s.querySelector('#f-nombre').focus();
      const obj = Object.assign(m.id ? m : { id: uid(), comprado: false, creado: Date.now() }, { nombre: d.nombre, cantidad: d.cantidad, precio: num(d.precio), tienda: d.tienda, trabajoId: d.trabajoId || null });
      if (!m.id) db.material.push(obj); save(); closeSheet(); render(); toast('Añadido a la lista');
    };
    const del = s.querySelector('[data-del]'); del && (del.onclick = () => { db.material = db.material.filter((x) => x !== m); save(); closeSheet(); render(); });
  });
}

function formStock(st = {}) {
  openSheet(`<h2>${st.id ? 'Editar' : 'Añadir'} lo que tienes</h2>
    ${field('nombre', '¿Qué?', st.nombre, 'text', 'required placeholder="Cinta de juntas"')}
    <div class="grid2">${field('cantidad', 'Te quedan', st.cantidad ?? '', 'number', 'inputmode="decimal" min="0"')}${field('minimo', 'Avísame si bajan de', st.minimo ?? '', 'number', 'inputmode="decimal" min="0"')}</div>
    <div class="grid2">${field('unidad', 'Unidad', st.unidad || 'ud', 'text', 'placeholder="ud, rollos, sacos…"')}${select('donde', '¿Dónde está?', SITIOS.slice(0, 3), st.donde || 'Armario de casa')}</div>
    <div class="grid2">${st.id ? '<button class="btn danger" data-del>Borrar</button>' : '<span></span>'}<button class="btn" data-ok>Guardar</button></div>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => {
      const d = formData(s); if (!d.nombre) return s.querySelector('#f-nombre').focus();
      const obj = Object.assign(st.id ? st : { id: uid() }, { nombre: d.nombre, cantidad: num(d.cantidad) ?? 0, minimo: num(d.minimo), unidad: d.unidad, donde: d.donde });
      if (!st.id) db.stock.push(obj); save(); closeSheet(); render();
    };
    const del = s.querySelector('[data-del]'); del && (del.onclick = () => { db.stock = db.stock.filter((x) => x !== st); save(); closeSheet(); render(); });
  });
}

function formHerramienta(h = {}) {
  openSheet(`<h2>${h.id ? 'Mover o editar' : 'Nueva'} herramienta</h2>
    ${field('nombre', 'Herramienta', h.nombre, 'text', 'required placeholder="Nivel láser y trípode"')}
    ${select('donde', '¿Dónde está?', SITIOS, h.donde || 'Armario de casa')}
    ${field('detalle', 'Detalle (obra, persona, balda…)', h.detalle || '', 'text', 'placeholder="La tiene Paco / obra de Marta / balda de arriba"')}
    <div class="field"><label>¿Para qué oficios la llevas?</label><div class="pills" id="oficios">${OFICIOS.map((o) => `<button type="button" aria-pressed="${(h.oficios || []).includes(o)}">${o}</button>`).join('')}</div></div>
    <div class="grid2">${h.id ? '<button class="btn danger" data-del>Borrar</button>' : '<span></span>'}<button class="btn" data-ok>Guardar</button></div>`, (s) => {
    s.querySelectorAll('#oficios button').forEach((b) => (b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
    s.querySelector('[data-ok]').onclick = () => {
      const d = formData(s); if (!d.nombre) return s.querySelector('#f-nombre').focus();
      const fuera = d.donde === 'En una obra' || d.donde === 'Prestada';
      const obj = Object.assign(h.id ? h : { id: uid() }, { nombre: d.nombre, donde: d.donde, detalle: d.detalle, desde: fuera && h.donde !== d.donde ? Date.now() : h.desde || null,
        oficios: [...s.querySelectorAll('#oficios [aria-pressed="true"]')].map((b) => b.textContent) });
      if (!fuera) obj.desde = null; if (!h.id) db.herramientas.push(obj); save(); closeSheet(); render();
    };
    const del = s.querySelector('[data-del]'); del && (del.onclick = () => { db.herramientas = db.herramientas.filter((x) => x !== h); save(); closeSheet(); render(); });
  });
}

function formCatalogo(c = {}) {
  openSheet(`<h2>${esc(c.nombre || 'Nuevo precio')}</h2>
    ${c.id ? '' : field('nombre', 'Nombre', '', 'text', 'required placeholder="Cambio de bajante"')}
    <div class="grid2">${field('precio', 'Precio (€)', c.precio ?? '', 'text', 'inputmode="decimal" placeholder="0"')}${select('unidad', 'Se cobra por', ['ud', 'm²', 'm', 'hora', 'día'], c.unidad || 'ud')}</div>
    <div class="grid2">${field('minutos', 'Tiempo que te lleva (min)', c.minutos ?? '', 'number', 'inputmode="numeric"')}${select('oficio', 'Oficio', OFICIOS, c.oficio || 'Otros')}</div>
    <label class="check-row"><input type="checkbox" class="chk" name="conMaterial" ${c.conMaterial ? 'checked' : ''}> El precio incluye el material</label>
    <div class="grid2"><button class="btn ghost" data-later>Luego</button><button class="btn" data-ok>Guardar${c.id ? ' y siguiente' : ''}</button></div>`, (s) => {
    s.querySelector('[data-later]').onclick = closeSheet;
    s.querySelector('[data-ok]').onclick = () => {
      const d = formData(s); if (!c.id && !d.nombre) return s.querySelector('#f-nombre').focus();
      const obj = Object.assign(c.id ? c : { id: uid(), nombre: d.nombre }, { precio: num(d.precio), unidad: d.unidad, minutos: num(d.minutos), oficio: d.oficio, conMaterial: d.conMaterial });
      if (!c.id) db.catalogo.push(obj); save(); closeSheet(); render();
      const next = c.id && db.catalogo.find((x) => x.precio == null && x !== c); next && setTimeout(() => formCatalogo(next), 150);
    };
  });
}

function formGasto(t) {
  openSheet(`<h2>Gasto · ${esc(t.titulo)}</h2>
    ${field('concepto', 'Concepto', '', 'text', 'required placeholder="Gasolina, material, parking…"')}
    <div class="grid2">${field('importe', 'Importe (€)', '', 'text', 'inputmode="decimal" required')}${select('tipo', 'Tipo', ['Material', 'Viaje', 'Herramienta', 'Otro'], 'Material')}</div>
    ${t.socio ? select('pagador', '¿Quién lo pagó?', ['Yo', t.socio], 'Yo') : ''}
    <button class="btn block" data-ok>Guardar gasto</button>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => {
      const d = formData(s), imp = num(d.importe); if (!d.concepto || imp == null) return;
      t.gastos.push({ id: uid(), concepto: d.concepto, importe: imp, tipo: d.tipo, pagador: d.pagador || 'Yo', fecha: Date.now() }); save(); closeSheet(); render();
    };
  });
}

/* ---------- "+ Nuevo" ---------- */
function nuevo() {
  openSheet(`<h2>¿Qué quieres apuntar?</h2>
    <div class="grid2">
      <button class="btn light" data-n="tarea">Algo que no olvidar</button><button class="btn light" data-n="trabajo">Trabajo o presupuesto</button>
      <button class="btn light" data-n="material">Material a comprar</button><button class="btn light" data-n="cliente">Cliente</button>
      <button class="btn light" data-n="herramienta">Herramienta</button><button class="btn light" data-n="stock">Lo que tengo</button>
    </div>`, (s) => s.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => ({ tarea: formTarea, trabajo: formTrabajo, material: formMaterial, cliente: formCliente, herramienta: formHerramienta, stock: formStock })[b.dataset.n]())));
}

/* ---------- Pantallas ---------- */
const views = {};

views.inicio = () => {
  const now = new Date();
  const pendientes = db.tareas.filter((t) => !t.hecha).sort((a, b) => (a.cuando || 9e15) - (b.cuando || 9e15));
  const fuera = db.herramientas.filter((h) => h.donde === 'En una obra' || h.donde === 'Prestada');
  const hoy = db.trabajos.filter((t) => sameDay(t.cuando, now) && t.estado !== 'terminado').sort((a, b) => a.cuando - b.cuando);
  const manana = new Date(today().getTime() + 864e5);
  const deManana = db.trabajos.filter((t) => sameDay(t.cuando, manana));
  const enSemana = db.trabajos.some((t) => t.cuando && t.cuando > today().getTime() + 864e5 && t.cuando < today().getTime() + 8 * 864e5 && t.estado !== 'presupuesto');
  const sinRespuesta = db.trabajos.filter((t) => t.estado === 'presupuesto' && t.creado < Date.now() - 2 * 864e5).length;
  const f = fichando();
  const count = pendientes.length + fuera.length;
  return `
  <header class="top">
    <div class="top-left"><button class="logo-btn" onclick="location.hash='#menu'" aria-label="Abrir menú">${chispasIcon(48)}</button>
      <div><div class="muted">${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1 style="font-size:28px;white-space:nowrap">Buenas, Chispas</h1></div></div>
    <button class="btn" onclick="nuevo()" style="padding:0 14px">${ICON.plus.replace('<svg', '<svg style="stroke:var(--brand)"')}Nuevo</button>
  </header>
  ${f ? `<a class="timer" href="#trabajo/${f.id}" style="text-decoration:none;color:inherit"><span class="dot"></span><div style="flex:1"><div class="muted" style="color:var(--ok);font-weight:700">Trabajando · ${esc(f.titulo)}</div><div class="n" data-live="${f.id}">${fmtHoras(horasDe(f))}</div></div><span class="btn sm">Ver</span></a>` : ''}
  <section class="card">
    <div class="between" style="margin-bottom:4px"><h2>Que no se te olvide</h2>${count ? `<span class="badge">${count}</span>` : ''}</div>
    <div class="list">
      ${pendientes.map((t) => { const late = t.cuando && t.cuando < Date.now();
        return `<div class="item"><input type="checkbox" class="chk" aria-label="Hecho" onchange="hecha('${t.id}')"><div class="grow" onclick="formTarea(db.tareas.find(x=>x.id==='${t.id}'))"><div class="t">${esc(t.texto)}</div>
        <div class="muted" ${late ? 'style="color:var(--warn);font-weight:700"' : ''}>${t.cuando ? fmtWhen(t.cuando) : ''}${t.trabajoId && trabajo(t.trabajoId) ? ' · ' + esc(trabajo(t.trabajoId).titulo) : ''}</div></div></div>`; }).join('')}
      ${fuera.map((h) => `<div class="item"><span class="chip red" style="margin-top:2px">Fuera</span><div class="grow" onclick="formHerramienta(db.herramientas.find(x=>x.id==='${h.id}'))"><div class="t">Recuperar ${esc(h.nombre)}</div><div class="muted">${esc(h.detalle || h.donde)}${h.desde ? ' · desde hace ' + Math.max(1, Math.round((Date.now() - h.desde) / 864e5)) + ' días' : ''}</div></div></div>`).join('')}
      ${count ? '' : '<div class="empty">Nada pendiente. Toca <b>+ Nuevo</b> o el micrófono para apuntar algo.</div>'}
    </div>
  </section>
  <section class="card">
    <h2 style="margin-bottom:6px">Hoy</h2>
    <div class="list">${hoy.length ? hoy.map((t) => `<a class="item" href="#trabajo/${t.id}" style="text-decoration:none;color:inherit"><div class="cond" style="font-size:20px;font-weight:700;width:52px">${fmtTime(t.cuando)}</div><div class="grow"><div class="t">${esc(t.titulo)}</div><div class="muted">${esc(cliente(t.clienteId)?.nombre || '')}${t.direccion ? ' · ' + esc(t.direccion) : ''}</div></div></a>`).join('') : '<div class="empty">Hoy no tienes obras apuntadas.</div>'}</div>
  </section>
  ${deManana.length ? `<a class="btn block" href="#preparar/${deManana[0].id}" style="text-decoration:none">Preparar mañana · ${esc(deManana[0].titulo)}</a>` : ''}
  ${!enSemana ? `<section class="card dark">
    <div style="font-size:13px;font-weight:700;color:var(--brand)">SEMANA QUE VIENE LIBRE</div>
    <h2 style="margin:2px 0 8px;line-height:1.1">No tienes nada cerrado en los próximos 7 días. Aprovecha:</h2>
    ${['Hacer inventario del material', 'Ordenar herramientas y recuperar las prestadas', 'Preparar maletines y mochila', ...(sinRespuesta ? [`Llamar a ${sinRespuesta} presupuesto${sinRespuesta > 1 ? 's' : ''} sin respuesta`] : [])]
      .map((x) => `<button class="item" style="width:100%;background:none;border:0;color:#fff;text-align:left;align-items:center" onclick="sugerencia(this.dataset.t)" data-t="${esc(x)}"><span style="font-size:22px;line-height:1;color:var(--brand)">+</span><span class="grow">${esc(x)}</span></button>`).join('')}
  </section>` : ''}`;
};
window.hecha = (id) => { const t = db.tareas.find((x) => x.id === id); t.hecha = true; t.hechaEn = Date.now(); save(); render(); toast('Hecho', () => { t.hecha = false; save(); }); };
window.sugerencia = (texto) => { db.tareas.push({ id: uid(), texto, cuando: null, hecha: false, creada: Date.now() }); save(); render(); toast('Añadido a tus cosas'); };
const fmtHoras = (h) => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} min`;

let filtroTrabajos = 'activos';
views.trabajos = () => {
  const f = { activos: (t) => t.estado === 'en_curso' || t.estado === 'por_cobrar', presupuestos: (t) => t.estado === 'presupuesto', cobrar: (t) => t.importe && cobradoDe(t) < t.importe && t.estado !== 'presupuesto', terminados: (t) => t.estado === 'terminado' };
  const list = db.trabajos.filter(f[filtroTrabajos]).sort((a, b) => (b.cuando || b.creado) - (a.cuando || a.creado));
  const n = (k) => db.trabajos.filter(f[k]).length;
  return `<header class="top"><h1>Trabajos</h1><button class="btn" onclick="formTrabajo()" style="padding:0 14px">${ICON.plus.replace('<svg', '<svg style="stroke:var(--brand)"')}Nuevo</button></header>
  <div class="pills" role="tablist">${[['activos', 'Activos'], ['presupuestos', 'Presupuestos'], ['cobrar', 'Por cobrar'], ['terminados', 'Terminados']].map(([k, t]) => `<button aria-pressed="${filtroTrabajos === k}" onclick="filtroTrabajos='${k}';render()">${t} · ${n(k)}</button>`).join('')}</div>
  ${list.map((t) => { const pend = (t.importe || 0) - cobradoDe(t); const chip = t.estado === 'terminado' ? 'ok' : t.estado === 'por_cobrar' ? 'warn' : t.estado === 'en_curso' ? 'ink' : '';
    return `<a class="card" href="#trabajo/${t.id}" style="text-decoration:none;color:inherit;display:block"><div class="between"><div><div class="t" style="font-weight:700;font-size:16px">${esc(t.titulo)}</div><div class="muted">${esc(cliente(t.clienteId)?.nombre || 'Sin cliente')}${t.socio ? ' · con ' + esc(t.socio) : ''}</div></div><span class="chip ${chip}">${ESTADOS[t.estado]}</span></div>
    <div style="font-size:14px;margin-top:6px">${t.cuando ? fmtWhen(t.cuando) + ' · ' : ''}${t.importe ? (pend > 0 && t.estado !== 'presupuesto' ? `te debe ${eur(pend)}` : eur(t.importe)) : 'sin precio'}</div></a>`; }).join('') || '<div class="card empty">No hay trabajos aquí todavía.</div>'}`;
};

views.trabajo = (id) => {
  const t = trabajo(id); if (!t) return '<div class="card empty">Este trabajo ya no existe.</div>';
  const c = cliente(t.clienteId), r = rentabilidad(t), f = (t.horas || []).find((h) => !h.fin), cobrado = cobradoDe(t);
  const mat = db.material.filter((m) => m.trabajoId === t.id);
  const tel = c?.tel ? c.tel.replace(/\s/g, '') : '';
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><span class="chip ${t.estado === 'en_curso' ? 'ink' : ''}">${ESTADOS[t.estado]}</span><span style="flex:1"></span><button class="btn sm light" onclick="formTrabajo(trabajo('${t.id}'))">Editar</button></header>
  <div><h1>${esc(t.titulo)}</h1><div class="muted">${esc(c?.nombre || 'Sin cliente')}${t.direccion ? ' · ' + esc(t.direccion) : ''}</div>
  <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px">${(t.oficios || []).map((o) => `<span class="chip">${o}</span>`).join('')}<span class="chip">${t.factura ? 'Con factura' : 'Sin factura'}</span>${t.socio ? `<span class="chip">Con ${esc(t.socio)}</span>` : ''}</div></div>
  <div class="grid2" style="grid-template-columns:repeat(3,1fr)">
    ${tel ? `<a class="btn light sm" href="tel:${esc(tel)}">${ICON.phone}Llamar</a><a class="btn light sm" href="https://wa.me/34${esc(tel.replace(/^\+?34/, ''))}" target="_blank" rel="noopener">${ICON.chat}WhatsApp</a>` : `<button class="btn light sm" onclick="formCliente(cliente('${t.clienteId}')||{})" ${c ? '' : 'disabled'}>Añadir teléfono</button><span></span>`}
    ${t.direccion ? `<a class="btn light sm" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t.direccion)}" target="_blank" rel="noopener">${ICON.map}Cómo llegar</a>` : ''}
  </div>
  <div class="grid2"><a class="btn ${t.presu ? 'light' : 'brand'}" href="#presupuesto/${t.id}">${t.presu ? 'Presupuesto · ' + eur(t.importe) + (t.presu.estado === 'aceptado' ? ' ✓' : '') : 'Hacer presupuesto'}</a><a class="btn light" href="#plano/${t.id}">Plano${(t.planos || []).some((p) => p.pts.length) ? 's · ' + t.planos.filter((p) => p.pts.length).length : ''}</a></div>
  ${t.estado !== 'presupuesto' && t.estado !== 'terminado' ? `<section class="timer"><span class="dot" style="${f ? '' : 'background:var(--ink2)'}"></span><div style="flex:1"><div class="muted" style="font-weight:700;${f ? 'color:var(--ok)' : ''}">${f ? 'Trabajando ahora' : 'Horas en este trabajo'}</div><div class="n" data-live="${f ? t.id : ''}">${fmtHoras(r.horas)}</div></div><button class="btn sm ${f ? '' : 'brand'}" onclick="fichar('${t.id}')">${f ? 'Parar' : 'Empezar'}</button></section>` : ''}
  ${t.importe ? `<section class="card"><h2>Cobros · ${esc(t.plan)}</h2>
    <div class="bar-track" style="margin:10px 0">${t.pagos.map((p) => `<span style="flex:${p.pct};background:${p.cobrado ? 'var(--ok)' : 'var(--line2)'}"></span>`).join('')}</div>
    <div class="list">${t.pagos.map((p) => `<label class="item" style="align-items:center"><input type="checkbox" class="chk" ${p.cobrado ? 'checked' : ''} onchange="cobro('${t.id}','${p.id}',this.checked)"><span class="grow">${esc(p.nombre)} · ${p.pct} %</span><b style="color:${p.cobrado ? 'var(--ok)' : 'var(--ink)'}">${eur(p.importe)}</b></label>`).join('')}</div>
    <div class="muted" style="margin-top:4px">Cobrado ${eur(cobrado)} de ${eur(t.importe)}</div></section>` : t.presu ? '' : `<button class="btn light block" onclick="formTrabajo(trabajo('${t.id}'))">Ponerle precio a mano (sin presupuesto)</button>`}
  <section class="card"><div class="between"><h2>¿Cuánto te deja?</h2><button class="btn sm light" onclick="formGasto(trabajo('${t.id}'))">+ Gasto</button></div>
    <div style="display:grid;grid-template-columns:1fr auto;gap:6px 12px;font-size:15px;margin-top:8px">
      <span class="muted">Precio</span><b>${eur(t.importe)}</b><span class="muted">Gastos</span><b>− ${eur(gastosDe(t))}</b><span class="muted">Horas</span><b>${fmtHoras(r.horas)}</b>
    </div>
    <div class="between" style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px"><b>${t.socio ? 'Te sale a (tu mitad)' : 'Te sale a'}</b><span class="money" style="font-size:30px;color:${r.porHora == null ? 'var(--ink2)' : r.porHora < 30 ? 'var(--warn)' : 'var(--ok)'}">${r.porHora == null ? '—' : eur(t.socio ? r.porHora / 2 : r.porHora) + '/h'}</span></div>
    ${(t.gastos || []).length ? `<div class="list" style="margin-top:6px">${t.gastos.map((g) => `<div class="item"><span class="grow">${esc(g.concepto)} <span class="muted">· ${esc(g.tipo)}${t.socio ? ' · pagó ' + esc(g.pagador) : ''}</span></span><b>${eur(g.importe)}</b></div>`).join('')}</div>` : ''}
    ${t.socio ? socioResumen(t) : ''}
  </section>
  <section class="card"><div class="between"><h2>Material</h2><div class="row" style="gap:6px"><button class="btn sm brand" onclick="checklistMaterial('${t.id}')">Lista sugerida</button><button class="btn sm light" onclick="formMaterial({trabajoId:'${t.id}'})">+ Otro</button></div></div>
    <div class="list">${mat.map((m) => `<div class="item"><span class="grow">${esc(m.nombre)} <span class="muted">${esc(m.cantidad || '')}</span></span><span class="chip ${m.comprado ? 'ok' : t.estado === 'presupuesto' ? '' : 'red'}">${m.comprado ? 'Comprado' : t.estado === 'presupuesto' ? 'En espera' : 'Comprar'}</span></div>`).join('') || '<div class="empty">Sin material apuntado.</div>'}</div></section>
  <section class="card"><h2>Notas</h2><textarea aria-label="Notas del trabajo" style="width:100%;min-height:90px;border:1.5px solid var(--line2);border-radius:10px;padding:10px;background:var(--card);margin-top:8px" onchange="trabajo('${t.id}').notas=this.value;save()" placeholder="Medidas, el modelo de grifo que eligió, código del portal…">${esc(t.notas || '')}</textarea></section>`;
};
function socioResumen(t) {
  const ingreso = cobradoDe(t), gastos = (t.gastos || []);
  const pagoYo = gastos.filter((g) => g.pagador !== t.socio).reduce((s, g) => s + g.importe, 0), pagoSocio = gastos.filter((g) => g.pagador === t.socio).reduce((s, g) => s + g.importe, 0);
  const beneficio = ingreso - pagoYo - pagoSocio, mitad = beneficio / 2, debesAlSocio = mitad + pagoSocio; // tú tienes el dinero del cliente
  return `<div class="card dark" style="margin-top:10px"><div class="muted">Para quedar en paz con ${esc(t.socio)} (lo cobrado hasta hoy)</div><div class="cond" style="font-size:26px;font-weight:700">${debesAlSocio >= 0 ? `Le pagas <span style="color:var(--brand)">${eur(debesAlSocio)}</span>` : `Te paga <span style="color:var(--brand)">${eur(-debesAlSocio)}</span>`}</div><div class="muted">Beneficio ${eur(beneficio)} · ${eur(mitad)} cada uno</div></div>`;
}
window.trabajo = trabajo; window.cliente = cliente;
window.fichar = (id) => { const t = trabajo(id), abierto = t.horas.find((h) => !h.fin);
  if (abierto) { abierto.fin = Date.now(); toast('Parado'); } else { const otro = fichando(); if (otro) otro.horas.find((h) => !h.fin).fin = Date.now(); t.horas.push({ inicio: Date.now(), fin: null }); toast('¡A darle!'); }
  save(); render(); };
window.cobro = (tid, pid, v) => { const t = trabajo(tid), p = t.pagos.find((x) => x.id === pid); p.cobrado = v; p.fecha = v ? Date.now() : null;
  if (t.pagos.every((x) => x.cobrado) && t.estado === 'por_cobrar') t.estado = 'terminado'; save(); render(); if (v) toast('Cobrado ' + eur(p.importe)); };

views.preparar = (id) => {
  const t = trabajo(id); if (!t) return '';
  const ofs = t.oficios || [];
  const herr = db.herramientas.filter((h) => !ofs.length || (h.oficios || []).some((o) => ofs.includes(o)));
  const mat = db.material.filter((m) => m.trabajoId === t.id);
  const tag = (h) => h.donde === 'Coche' ? '<span class="chip">Coche</span>' : h.donde === 'Prestada' || h.donde === 'En una obra' ? `<span class="chip red">${esc(h.detalle || h.donde)}</span>` : `<span class="chip warn">${esc(h.donde)}</span>`;
  const delArmario = herr.filter((h) => h.donde === 'Armario de casa').length;
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><div><div class="muted">${fmtWhen(t.cuando)} · ${esc(nombreTrabajo(t))}</div><h1>Qué te llevas</h1></div></header>
  ${delArmario ? `<div class="tip"><b>Esta noche:</b> pasa ${delArmario} ${delArmario === 1 ? 'cosa' : 'cosas'} del armario al coche y carga las baterías.</div>` : ''}
  <section class="card"><h2>Herramientas${ofs.length ? ' · ' + ofs.join(', ') : ''}</h2><div class="list">${herr.map((h) => `<label class="item" style="align-items:center"><input type="checkbox" class="chk"><span class="grow">${esc(h.nombre)}</span>${tag(h)}</label>`).join('') || '<div class="empty">Apunta tus herramientas en Material › Herramientas y marca para qué oficios las usas: aquí saldrá la lista sola.</div>'}</div></section>
  <section class="card"><h2>Material</h2><div class="list">${mat.map((m) => `<label class="item" style="align-items:center"><input type="checkbox" class="chk"><span class="grow">${esc(m.nombre)} <span class="muted">${esc(m.cantidad || '')}</span></span>${m.comprado ? '<span class="chip ok">Comprado</span>' : '<span class="chip red">Comprar</span>'}</label>`).join('') || '<div class="empty">No hay material apuntado para este trabajo.</div>'}</div></section>`;
};

let tabMaterial = 'comprar';
views.material = () => {
  const tabs = [['comprar', 'Comprar'], ['stock', 'Stock'], ['herramientas', 'Herramientas']];
  let body = '';
  if (tabMaterial === 'comprar') {
    const pend = db.material.filter((m) => !m.comprado);
    const espera = pend.filter((m) => trabajo(m.trabajoId)?.estado === 'presupuesto'), compra = pend.filter((m) => !espera.includes(m));
    const porTienda = TIENDAS.map((ti) => [ti, compra.filter((m) => m.tienda === ti)]).filter(([, l]) => l.length);
    body = porTienda.map(([ti, l]) => `<section class="card"><div class="between"><h2>${ti}</h2><span class="muted">${l.length} · ~${eur(l.reduce((s, m) => s + (m.precio || 0), 0))}</span></div><div class="list">${l.map((m) => `<div class="item"><input type="checkbox" class="chk" aria-label="Comprado" onchange="comprado('${m.id}')"><div class="grow" onclick="formMaterial(db.material.find(x=>x.id==='${m.id}'))"><div class="t">${esc(m.nombre)} <span class="muted">${esc(m.cantidad || '')}</span></div><div class="muted">${m.trabajoId ? esc(nombreTrabajo(trabajo(m.trabajoId))) : 'Para reponer'}</div></div>${m.precio ? `<b>${eur(m.precio)}</b>` : ''}</div>`).join('')}</div></section>`).join('')
      + (espera.length ? `<section class="card"><h2>En espera</h2><div class="muted" style="margin-bottom:4px">No lo compres: el presupuesto aún no está aceptado.</div><div class="list">${espera.map((m) => `<div class="item"><span class="grow">${esc(m.nombre)} <span class="muted">· ${esc(nombreTrabajo(trabajo(m.trabajoId)))}</span></span></div>`).join('')}</div></section>` : '')
      || '<div class="card empty">No te falta nada por comprar.</div>';
  } else if (tabMaterial === 'stock') {
    const bajo = db.stock.filter((s) => s.minimo != null && s.cantidad < s.minimo);
    body = (bajo.length ? `<div class="tip"><b>Te queda poco de ${bajo.length} ${bajo.length === 1 ? 'cosa' : 'cosas'}.</b> Toca «Reponer» para mandarlas a la lista de compra.</div>` : '')
      + `<section class="card"><div class="list">${db.stock.map((s) => { const low = s.minimo != null && s.cantidad < s.minimo;
        return `<div class="item" style="align-items:center"><div class="grow" onclick="formStock(db.stock.find(x=>x.id==='${s.id}'))"><div class="t">${esc(s.nombre)}</div><div class="muted" ${low ? 'style="color:var(--red);font-weight:600"' : ''}>${s.cantidad} ${esc(s.unidad || '')} · ${esc(s.donde)}${s.minimo != null ? ' · mínimo ' + s.minimo : ''}</div></div>
        <button class="icon-btn" aria-label="Uno menos" onclick="stockMas('${s.id}',-1)">−</button><button class="icon-btn" aria-label="Uno más" onclick="stockMas('${s.id}',1)">+</button>${low ? `<button class="btn sm danger" onclick="reponer('${s.id}')">Reponer</button>` : ''}</div>`; }).join('') || '<div class="empty">Apunta lo que tienes en casa o en el coche (tornillería, sacos, cable…) y te aviso cuando quede poco.</div>'}</div></section>`;
  } else {
    const grupos = SITIOS.map((s) => [s, db.herramientas.filter((h) => h.donde === s)]).filter(([, l]) => l.length);
    const fuera = grupos.filter(([s]) => s === 'En una obra' || s === 'Prestada'), dentro = grupos.filter(([s]) => !(s === 'En una obra' || s === 'Prestada'));
    const block = ([s, l], red) => `<section class="card"><div class="between"><h2>${red ? 'Fuera de su sitio' : s}</h2><span class="muted">${l.length}</span></div><div class="list">${l.map((h) => `<div class="item" style="align-items:center"><div class="grow"><div class="t">${esc(h.nombre)}</div><div class="muted" ${red ? 'style="color:var(--red);font-weight:600"' : ''}>${esc(h.detalle || h.donde)}${h.desde ? ' · hace ' + Math.max(1, Math.round((Date.now() - h.desde) / 864e5)) + ' días' : ''}</div></div><button class="btn sm light" onclick="formHerramienta(db.herramientas.find(x=>x.id==='${h.id}'))">Mover</button></div>`).join('')}</div></section>`;
    body = (fuera.length ? block(['', fuera.flatMap(([, l]) => l)], true) : '') + dentro.map((g) => block(g)).join('') || '<div class="card empty">Apunta tus herramientas y dónde están (coche, armario, maletín). Si prestas una o se queda en una obra, te lo recuerdo.</div>';
  }
  const add = { comprar: 'formMaterial()', stock: 'formStock()', herramientas: 'formHerramienta()' }[tabMaterial];
  return `<header class="top"><h1>Material</h1><button class="btn" onclick="${add}" style="padding:0 14px">${ICON.plus.replace('<svg', '<svg style="stroke:var(--brand)"')}Añadir</button></header>
  ${tabMaterial === 'comprar' ? '<button class="btn brand block" onclick="checklistMaterial()">Lista de material por tipo de chapuza</button>' : ''}
  <div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button role="tab" aria-selected="${tabMaterial === k}" onclick="tabMaterial='${k}';render()">${t}${k === 'comprar' ? ' · ' + db.material.filter((m) => !m.comprado).length : ''}</button>`).join('')}</div>${body}`;
};
window.comprado = (id) => { const m = db.material.find((x) => x.id === id); m.comprado = true; m.compradoEn = Date.now(); save(); render(); toast('Comprado', () => { m.comprado = false; save(); }); };
window.stockMas = (id, d) => { const s = db.stock.find((x) => x.id === id); s.cantidad = Math.max(0, (s.cantidad || 0) + d); save(); render(); };
window.reponer = (id) => { const s = db.stock.find((x) => x.id === id); db.material.push({ id: uid(), nombre: s.nombre, cantidad: '', tienda: 'Obramat', trabajoId: null, comprado: false, creado: Date.now() }); save(); toast('Añadido a la lista de compra'); };

views.cuentas = () => {
  const ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
  const cobradoMes = db.trabajos.flatMap((t) => t.pagos || []).filter((p) => p.cobrado && p.fecha >= ini).reduce((s, p) => s + p.importe, 0);
  const gastosMes = db.trabajos.flatMap((t) => t.gastos || []).filter((g) => g.fecha >= ini).reduce((s, g) => s + g.importe, 0)
    + db.material.filter((m) => m.comprado && m.compradoEn >= ini && m.precio).reduce((s, m) => s + m.precio, 0);
  const conHoras = db.trabajos.filter((t) => horasDe(t) > 0.25 && t.importe);
  const porOficio = OFICIOS.map((o) => { const l = conHoras.filter((t) => (t.oficios || [])[0] === o); const h = l.reduce((s, t) => s + horasDe(t), 0); return [o, h ? l.reduce((s, t) => s + rentabilidad(t).limpio, 0) / h : null]; }).filter(([, v]) => v != null);
  const max = Math.max(1, ...porOficio.map(([, v]) => v));
  const peor = porOficio.length > 1 ? porOficio.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;
  return `<header class="top"><h1>Cuentas</h1><span class="muted">${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span></header>
  <section class="card dark kpis"><div><div class="muted">Cobrado</div><div class="n">${eur(cobradoMes)}</div></div><div><div class="muted">Gastos</div><div class="n">${eur(gastosMes)}</div></div><div><div class="muted">Limpio</div><div class="n" style="color:var(--brand)">${eur(cobradoMes - gastosMes)}</div></div></section>
  <section class="card"><h2>¿Qué te merece la pena?</h2><div class="muted" style="margin-bottom:10px">Lo que te queda por hora, según el oficio principal de cada trabajo</div>
    ${porOficio.map(([o, v]) => `<div style="display:grid;grid-template-columns:96px 1fr 70px;gap:8px;align-items:center;font-size:14px;margin:8px 0"><span style="font-weight:600">${o}</span><div style="height:14px;background:var(--track);border-radius:4px"><div style="width:${Math.max(4, (v / max) * 100)}%;height:100%;background:${o === peor?.[0] ? 'var(--brand)' : 'var(--ink)'};border-radius:4px"></div></div><b style="text-align:right">${eur(v)}/h</b></div>`).join('') || '<div class="empty">Ficha las horas en tus trabajos y aquí verás qué oficio te deja más dinero por hora.</div>'}
    ${peor ? `<div class="tip" style="margin-top:10px">${esc(peor[0])} es lo que menos te deja. Súbele el precio o cógelo solo si va junto con otro trabajo.</div>` : ''}</section>
  <section class="card"><h2>Por trabajo</h2><div class="list">${conHoras.sort((a, b) => (rentabilidad(b).porHora || 0) - (rentabilidad(a).porHora || 0)).map((t) => { const r = rentabilidad(t);
    return `<a class="item" href="#trabajo/${t.id}" style="text-decoration:none;color:inherit;align-items:center"><div class="grow"><div class="t">${esc(nombreTrabajo(t))}</div><div class="muted">Te deja ${eur(r.limpio)} · ${fmtHoras(r.horas)}</div></div><b style="color:${r.porHora < 30 ? 'var(--warn)' : 'var(--ok)'}">${eur(r.porHora)}/h</b></a>`; }).join('') || '<div class="empty">Todavía no hay trabajos con horas fichadas.</div>'}</div></section>`;
};

views.menu = () => `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button>${chispasIcon(52)}<div><div style="font-family:Fredoka,sans-serif;font-size:32px;font-weight:700;line-height:1">Chispas</div><div class="muted">Tus chapuzas, bajo control</div></div></header>
  <section class="card list">
    ${[['#cuenta', 'Tu cuenta', window.cloud?.user ? cloud.user.email + ' · ' + cloud.estado : 'Sin cuenta: los datos solo están en este móvil'], ['#clientes', 'Clientes', `${db.clientes.length} guardados`], ['javascript:formNegocio()', 'Tus datos para presupuestos', db.ajustes.negocio?.nombre ? db.ajustes.negocio.nombre + ' · ' + (db.ajustes.negocio.tel || '') : 'Nombre y teléfono que salen en el PDF'], ['#catalogo', 'Catálogo de precios', `${db.catalogo.filter((c) => c.precio == null).length ? 'Te faltan ' + db.catalogo.filter((c) => c.precio == null).length + ' por poner' : 'Completo'}`],
       ['#copia', 'Copia de seguridad', db.ajustes.ultimaCopia ? 'Última: ' + fmtWhen(db.ajustes.ultimaCopia) : 'Todavía no has hecho ninguna'], ['#avisos', 'Avisos en el móvil', 'Permisos y prueba'],
       ['#apariencia', 'Apariencia', { auto: 'Automático (como el móvil)', claro: 'Claro', oscuro: 'Oscuro' }[db.ajustes.tema]], ['#voz', 'Voz', 'Qué le puedes decir'], ['javascript:actualizar()', 'Buscar actualización', 'Tienes la versión ' + VERSION]]
      .map(([h, t, s]) => `<a class="item" href="${h}" style="text-decoration:none;color:inherit;align-items:center"><div class="grow"><div class="t">${t}</div><div class="muted">${esc(s)}</div></div><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></a>`).join('')}
  </section><div class="muted" style="text-align:center">Chispas v${VERSION}</div>`;

let oficioCat = 'Electricidad';
views.catalogo = () => {
  const total = db.catalogo.length, con = db.catalogo.filter((c) => c.precio != null).length;
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><h1 style="flex:1">Mis precios</h1><button class="btn sm" onclick="formCatalogo({oficio:oficioCat})">+ Precio</button></header>
  <div class="card row"><div class="bar-track" style="flex:1"><span style="width:${(con / total) * 100}%;background:var(--ink)"></span></div><span><b>${con} de ${total}</b> con precio</span></div>
  <div class="pills">${OFICIOS.map((o) => `<button aria-pressed="${oficioCat === o}" onclick="oficioCat='${o}';render()">${o}</button>`).join('')}</div>
  <section class="card list">${db.catalogo.filter((c) => c.oficio === oficioCat).map((c) => `<button class="item" style="width:100%;background:none;border:0;text-align:left;align-items:center" onclick="formCatalogo(db.catalogo.find(x=>x.id==='${c.id}'))"><div class="grow"><div class="t">${esc(c.nombre)}</div><div class="muted">${c.precio != null ? (c.conMaterial ? 'Con material' : 'Sin material') + (c.minutos ? ' · ' + c.minutos + ' min' : '') : 'De la lista inicial'}</div></div>${c.precio != null ? `<b>${eur(c.precio)} <span class="muted">/${esc(c.unidad)}</span></b>` : '<span class="chip warn">Poner precio</span>'}</button>`).join('')}</section>`;
};
views.clientes = () => `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><h1 style="flex:1">Clientes</h1><button class="btn sm" onclick="formCliente()">+ Cliente</button></header>
  <section class="card list">${db.clientes.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((c) => { const ts = db.trabajos.filter((t) => t.clienteId === c.id); const debe = ts.reduce((s, t) => s + (t.estado !== 'presupuesto' ? (t.importe || 0) - cobradoDe(t) : 0), 0);
    return `<button class="item" style="width:100%;background:none;border:0;text-align:left;align-items:center" onclick="formCliente(cliente('${c.id}'))"><div class="grow"><div class="t">${esc(c.nombre)}</div><div class="muted">${ts.length} trabajo${ts.length === 1 ? '' : 's'}${c.tel ? ' · ' + esc(c.tel) : ''}</div></div>${debe > 0 ? `<span class="chip warn">Debe ${eur(debe)}</span>` : ''}</button>`; }).join('') || '<div class="empty">Sin clientes todavía.</div>'}</section>`;

views.copia = () => `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><h1>Copia de seguridad</h1></header>
  <div class="tip">Ahora mismo todo se guarda <b>solo en este móvil</b>. Hasta que conectemos la nube, descarga una copia de vez en cuando (por ejemplo, cada viernes) y guárdala en Drive.</div>
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><button class="btn block" onclick="exportar()">Descargar copia</button>
  <label class="btn light block" style="cursor:pointer">Recuperar desde una copia<input type="file" accept="application/json" class="sr" onchange="importar(this.files[0])"></label>
  <div class="muted">${db.ajustes.ultimaCopia ? 'Última copia: ' + fmtWhen(db.ajustes.ultimaCopia) : 'Todavía no has hecho ninguna copia.'}</div></section>`;
window.exportar = () => { db.ajustes.ultimaCopia = Date.now(); save(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' })); a.download = `chispas-copia-${new Date().toISOString().slice(0, 10)}.json`; a.click(); render(); };
window.importar = (file) => { if (!file) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d.trabajos || !d.tareas) throw 0; if (!confirm('Esto sustituye lo que hay en el móvil por la copia. ¿Seguro?')) return; db = d; save(); render(); toast('Copia recuperada'); } catch { toast('Ese archivo no es una copia de Chispas'); } }; r.readAsText(file); };

views.apariencia = () => `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><h1>Apariencia</h1></header>
  <section class="card list">${[['auto', 'Automático', 'Como el móvil: claro de día, oscuro de noche'], ['claro', 'Claro', 'Mejor a pleno sol en la obra'], ['oscuro', 'Oscuro', 'Descansa la vista de noche y gasta menos batería']]
    .map(([k, t, s]) => `<label class="item" style="align-items:center"><div class="grow"><div class="t">${t}</div><div class="muted">${s}</div></div><input type="radio" name="tema" class="chk" ${db.ajustes.tema === k ? 'checked' : ''} onchange="db.ajustes.tema='${k}';save();applyTheme()"></label>`).join('')}</section>`;

views.avisos = () => {
  const perm = 'Notification' in window ? Notification.permission : 'no';
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><h1>Avisos en el móvil</h1></header>
  <section class="card" style="display:flex;flex-direction:column;gap:10px">
    <div class="between"><b>Permiso de avisos</b><span class="chip ${perm === 'granted' ? 'ok' : 'red'}">${perm === 'granted' ? 'Activado' : perm === 'denied' ? 'Bloqueado' : 'Sin activar'}</span></div>
    ${perm === 'default' ? '<button class="btn block" onclick="pedirAvisos()">Activar avisos</button>' : ''}
    ${perm === 'denied' ? '<div class="tip">Están bloqueados. Mantén pulsado el icono de Chispas › Información de la app › Notificaciones › Permitir.</div>' : ''}
    ${perm === 'granted' ? '<button class="btn light block" onclick="probarAviso()">Probar que el móvil enseña avisos (al momento)</button>' : ''}
  </section>
  <section class="card"><h2>En tu Samsung Galaxy</h2><ol style="margin:8px 0 0;padding-left:20px;line-height:1.5">
    <li>Ajustes › Aplicaciones › <b>Chrome</b> › Batería › <b>Sin restricciones</b>.</li>
    <li>Haz lo mismo con <b>Chispas</b> si aparece en la lista.</li>
    <li>Ajustes › Batería › Límites de uso en segundo plano › <b>Aplicaciones que nunca se suspenden</b> › añade Chrome y Chispas.</li></ol></section>
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Avisos aunque no abras la app</h2>
    ${window.cloud?.user ? `<div class="muted">Te avisamos de lo que no debes olvidar, la tarde antes de cada obra a las 20:00 y si una herramienta prestada lleva una semana fuera.</div>
      <button class="btn block ${cloud.avisosOk ? 'light' : 'brand'}" onclick="cloud.activarAvisos()">${cloud.avisosOk ? 'Avisos activados en este móvil ✓' : 'Activar avisos en este móvil'}</button>
      <button class="btn block" onclick="cloud.pruebaReal()">Enviarme un aviso de prueba</button>
      <div class="muted">${cloud.pruebaEnviada ? '<b>Prueba enviada a las ' + fmtTime(cloud.pruebaEnviada) + '.</b> Cierra la app o bloquea el móvil: te llegará en menos de 5 minutos.' : 'Hace el recorrido completo, igual que los avisos de verdad: tarda hasta 5 minutos en llegar.'}</div>`
      : '<div class="tip">Para recibirlos tienes que entrar con tu cuenta.</div><a class="btn block" href="#cuenta">Entrar o crear cuenta</a>'}
  </section>`;
};
window.pedirAvisos = async () => { await Notification.requestPermission(); render(); };
window.probarAviso = async () => { const reg = await navigator.serviceWorker?.getRegistration(); const o = { body: '¡Así te llegarán los avisos!', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png' };
  reg ? reg.showNotification('Chispas', o) : new Notification('Chispas', o); };

views.cuenta = () => {
  const c = window.cloud;
  if (c?.user) return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><h1>Tu cuenta</h1></header>
  <section class="card" style="display:flex;flex-direction:column;gap:8px"><div class="muted">Has entrado como</div><div class="t" style="font-size:18px;font-weight:700">${esc(c.user.email)}</div>
  <span class="chip ${/Sincronizado/.test(c.estado) ? 'ok' : 'warn'}" style="align-self:flex-start">${esc(c.estado)}</span>
  <div class="muted">Tus datos se guardan en tu cuenta. Si cambias de móvil o lo pierdes, entra con tu correo y contraseña y lo tendrás todo.</div></section>
  <a class="btn light block" href="#avisos">Avisos en este móvil</a>
  <button class="btn danger block" onclick="cloud.salir()">Cerrar sesión</button>`;
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><h1>Tu cuenta</h1></header>
  <div class="row" style="justify-content:center;padding:6px 0">${chispasIcon(72)}</div>
  <section class="card" style="display:flex;flex-direction:column;gap:12px">
    <div class="muted">Entra con tu correo para guardar tus datos en la nube, usarlos en otro móvil y recibir avisos aunque no abras la app.</div>
    ${field('email', 'Correo', '', 'email', 'autocomplete="email" inputmode="email"')}
    ${field('pass', 'Contraseña', '', 'password', 'autocomplete="current-password" minlength="6"')}
    <button class="btn block" onclick="cloud.entrar($('#f-email').value.trim(), $('#f-pass').value)">Entrar</button>
    <button class="btn ghost block" onclick="cloud.crear($('#f-email').value.trim(), $('#f-pass').value)">Crear cuenta nueva</button>
    <button class="btn sm light" style="align-self:center" onclick="cloud.olvido($('#f-email').value.trim())">He olvidado la contraseña</button>
  </section>
  ${!c ? '<div class="tip">No se ha podido conectar con la nube. Revisa la cobertura y vuelve a abrir la app.</div>' : ''}
  <button class="btn sm light" style="align-self:center" onclick="db.ajustes.sinCuenta=true;save();location.hash='#inicio'">Seguir sin cuenta (solo en este móvil)</button>`;
};

views.voz = () => `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><h1>Voz</h1></header>
  <section class="card"><h2>Toca el micrófono amarillo y di…</h2><div class="list" style="margin-top:6px">
  ${['«Compra 3 sacos de yeso para Marta»', '«Apunta tornillos de pladur en Leroy»', '«Recuérdame mañana llamar a Luis»', '«El láser está en el coche»', '«La tijera de chapa la tiene Paco»'].map((x) => `<div class="item"><span class="grow">${x}</span></div>`).join('')}
  </div></section><div class="muted">Si no lo entiende a la primera, siempre te enseña lo que ha apuntado para que lo corrijas antes de guardarlo.</div>`;

/* ---------- Voz ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec, saveTimer;
$('#mic').onclick = () => {
  if (!SR) return toast('Tu navegador no permite dictar. Abre Chispas con Chrome.');
  if (rec) { rec.stop(); return; }
  rec = new SR(); rec.lang = 'es-ES'; rec.interimResults = false; rec.maxAlternatives = 1;
  $('#mic').classList.add('listening'); toast('Te escucho…');
  rec.onresult = (e) => interpretar(e.results[0][0].transcript);
  rec.onerror = (e) => toast(e.error === 'not-allowed' ? 'Dale permiso al micrófono para dictar' : 'No te he oído bien, prueba otra vez');
  rec.onend = () => { $('#mic').classList.remove('listening'); rec = null; };
  rec.start();
};
function buscaTrabajo(txt) {
  const l = txt.toLowerCase();
  return db.trabajos.filter((t) => t.estado !== 'terminado').find((t) => [cliente(t.clienteId)?.nombre, t.titulo].some((n) => n && n.toLowerCase().split(/\s+/).some((w) => w.length > 2 && l.includes(w.toLowerCase()))));
}
function interpretar(texto) {
  const t = texto.trim().replace(/^chispas[, ]+/i, ''), l = t.toLowerCase();
  let acc;
  const mHerr = l.match(/^(?:el |la |los |las )?(.+?) (?:está|están) en (?:el |la )?(coche|armario|casa|maletín|obra.*)$/) || l.match(/^(?:el |la )?(.+?) la tiene (.+)$/);
  if (/^(compra|comprar|apunta|añade|necesito|hay que comprar)\b/.test(l)) {
    const resto = t.replace(/^(compra|comprar|apunta|añade|necesito|hay que comprar)\s+/i, '');
    const tr = buscaTrabajo(resto); const tienda = /leroy/i.test(resto) ? 'Leroy Merlin' : /obramat/i.test(resto) ? 'Obramat' : 'Obramat';
    const nombre = resto.replace(/\s+(para|en|de)\s+(la obra de |el trabajo de |casa de )?.*$/i, '').trim();
    acc = { tipo: 'MATERIAL', resumen: `${nombre} → lista de compra (${tienda})`, extra: tr ? nombreTrabajo(tr) : 'Para reponer', run: () => db.material.push({ id: uid(), nombre: cap(nombre), cantidad: '', tienda, trabajoId: tr?.id || null, comprado: false, creado: Date.now() }) };
  } else if (mHerr && db.herramientas.length) {
    const h = db.herramientas.find((x) => mHerr[1].split(/\s+/).some((w) => w.length > 3 && x.nombre.toLowerCase().includes(w)));
    const prest = /la tiene/.test(l), destino = prest ? 'Prestada' : /coche/.test(mHerr[2]) ? 'Coche' : /maletín/.test(mHerr[2]) ? 'Maletín' : /obra/.test(mHerr[2]) ? 'En una obra' : 'Armario de casa';
    acc = h ? { tipo: 'HERRAMIENTA', resumen: `${h.nombre} → ${destino}`, extra: prest ? 'La tiene ' + cap(mHerr[2]) : '', run: () => { h.donde = destino; h.detalle = prest ? 'La tiene ' + cap(mHerr[2]) : destino === 'En una obra' ? cap(mHerr[2]) : ''; h.desde = prest || destino === 'En una obra' ? Date.now() : null; } } : null;
  }
  if (!acc) {
    const resto = t.replace(/^(recuérdame|recuerdame|recordar|acuérdate de|acuerdate de|no olvides)\s+/i, '');
    let cuando = null; const d = new Date(); d.setSeconds(0, 0);
    if (/\bmañana\b/i.test(resto)) { d.setDate(d.getDate() + 1); d.setHours(8, 0); cuando = d.getTime(); }
    else if (/\besta tarde\b/i.test(resto)) { d.setHours(17, 0); cuando = d.getTime(); }
    else if (/\besta noche\b/i.test(resto)) { d.setHours(21, 0); cuando = d.getTime(); }
    const hora = resto.match(/a las (\d{1,2})(?::(\d{2}))?/i); if (hora) { const x = new Date(cuando || Date.now()); x.setHours(+hora[1] + (+hora[1] < 8 ? 12 : 0), +(hora[2] || 0), 0, 0); cuando = x.getTime(); }
    const texto2 = cap(resto.replace(/\b(mañana|esta tarde|esta noche)\b/gi, '').replace(/a las \d{1,2}(:\d{2})?/i, '').replace(/\s+/g, ' ').trim());
    const tr = buscaTrabajo(resto);
    acc = { tipo: 'NO OLVIDAR', resumen: texto2, extra: cuando ? 'Aviso: ' + fmtWhen(cuando) : 'Sin hora', run: () => db.tareas.push({ id: uid(), texto: texto2, cuando, trabajoId: tr?.id || null, hecha: false, creada: Date.now() }) };
  }
  openSheet(`<div class="muted">Has dicho: «${esc(texto)}»</div><h2>He entendido esto:</h2>
    <div class="card" style="background:var(--bg)"><span class="chip ink">${acc.tipo}</span><div class="t" style="font-size:18px;font-weight:700;margin-top:6px">${esc(acc.resumen)}</div><div class="muted">${esc(acc.extra)}</div></div>
    <div class="grid2"><button class="btn ghost" data-fix>Corregir</button><button class="btn brand" data-ok>Vale, guardar</button></div><div class="muted" style="text-align:center">Se guarda solo en 5 s</div>`, (s) => {
    const ok = () => { clearTimeout(saveTimer); acc.run(); save(); closeSheet(); render(); toast('Guardado'); };
    s.querySelector('[data-ok]').onclick = ok;
    s.querySelector('[data-fix]').onclick = () => { clearTimeout(saveTimer); acc.tipo === 'MATERIAL' ? formMaterial({ nombre: acc.resumen.split(' → ')[0] }) : acc.tipo === 'HERRAMIENTA' ? closeSheet() : formTarea({ texto: acc.resumen }); };
    saveTimer = setTimeout(ok, 5000);
  });
}
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/* ---------- Navegación ---------- */
window.render = function render() {
  const [route, arg] = (location.hash.slice(1) || 'inicio').split('/');
  const v = views[route] || views.inicio;
  $('#view').innerHTML = v(arg);
  const tab = { trabajo: 'trabajos', preparar: 'trabajos', presupuesto: 'trabajos', plano: 'trabajos' }[route] || route;
  document.querySelectorAll('.nav a').forEach((a) => (a.dataset.tab === tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
};
window.addEventListener('hashchange', () => { closeSheet(); render(); window.scrollTo(0, 0); });
render();

// Contador de horas en vivo
setInterval(() => document.querySelectorAll('[data-live]').forEach((el) => { const t = el.dataset.live && trabajo(el.dataset.live); if (t) el.textContent = fmtHoras(horasDe(t)); }), 30000);

// Recordatorios con la app abierta (los programados llegarán con la nube)
setInterval(async () => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const due = db.tareas.filter((t) => !t.hecha && t.cuando && t.cuando <= Date.now() && !t.avisada);
  if (!due.length) return; const reg = await navigator.serviceWorker?.getRegistration();
  due.forEach((t) => { t.avisada = true; const o = { body: t.texto, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: t.id }; reg ? reg.showNotification('Que no se te olvide', o) : new Notification('Que no se te olvide', o); });
  save();
}, 60000);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

/* ---------- Actualizaciones ---------- */
window.actualizar = async (silencio) => {
  if (!silencio) toast('Buscando actualización…');
  try {
    const { v } = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json());
    if (v === VERSION) { if (!silencio) toast('Ya tienes la última versión (' + VERSION + ')'); return; }
    if (silencio) return mostrarAviso(v);
    toast('Actualizando a la versión ' + v + '…');
    const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update();
    for (const k of await caches.keys()) await caches.delete(k);
    location.reload();
  } catch { if (!silencio) toast('Sin conexión: prueba con cobertura'); }
};
function mostrarAviso(v) {
  if ($('#update-bar')) return;
  const b = document.createElement('button'); b.id = 'update-bar'; b.className = 'btn brand';
  b.style.cssText = 'position:fixed;left:16px;right:16px;top:calc(10px + env(safe-area-inset-top));z-index:25;box-shadow:0 6px 18px rgba(0,0,0,.25)';
  b.textContent = 'Hay una versión nueva (' + v + ') · Toca para actualizar'; b.onclick = () => actualizar(); document.body.appendChild(b);
}
setTimeout(() => actualizar(true), 4000);
setInterval(() => actualizar(true), 30 * 60e3);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && actualizar(true));
