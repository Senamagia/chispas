/* Chispas · herramientas: lugares editables, baterías y cargadores, mover de un toque
   y la pantalla «Salir de casa» para coger lo que te llevas con prisas. */
'use strict';

const LUGARES_INI = ['Coche', 'Armario de casa', 'Maletín', 'Furgoneta'];
const FUERA = ['En una obra', 'Prestada'];
const CARGA = { llena: ['Llena', 'var(--ok)', 4], media: ['Media', 'var(--brand)', 2], vacia: ['Vacía', 'var(--red)', 1], cargando: ['Cargando', 'var(--link)', 3] };
const ORDEN_CARGA = ['llena', 'media', 'vacia', 'cargando'];

function lugares() {
  if (!db.lugares) {
    db.lugares = LUGARES_INI.slice();
    [...db.herramientas, ...db.stock].forEach((x) => { if (x.donde && !db.lugares.includes(x.donde) && !FUERA.includes(x.donde)) db.lugares.push(x.donde); });
  }
  return db.lugares;
}
const todosLugares = () => [...lugares(), ...FUERA];
window.lugares = lugares;
const esFuera = (h) => FUERA.includes(h.donde);
const esBat = (h) => h.tipo === 'bateria' || h.tipo === 'cargador';

/* ---------- Formularios (sustituyen a los de la v0.3) ---------- */
window.formHerramienta = function (h = {}) {
  const tipo = h.tipo || 'herramienta';
  openSheet(`<h2>${h.id ? 'Editar' : 'Nueva'} ${tipo === 'bateria' ? 'batería' : tipo === 'cargador' ? 'cargador' : 'herramienta'}</h2>
    <div class="tabs" role="tablist">${[['herramienta', 'Herramienta'], ['bateria', 'Batería'], ['cargador', 'Cargador']].map(([k, n]) => `<button role="tab" type="button" aria-selected="${tipo === k}" data-tipo="${k}">${n}</button>`).join('')}</div>
    ${field('nombre', tipo === 'herramienta' ? 'Herramienta' : 'Nombre', h.nombre, 'text', `required placeholder="${tipo === 'herramienta' ? 'Nivel láser y trípode' : tipo === 'bateria' ? 'Batería Makita grande' : 'Cargador rápido Makita'}"`)}
    ${tipo !== 'herramienta' ? `<div class="grid2">${field('marca', 'Marca', h.marca || '', 'text', 'placeholder="Makita, DeWalt, Bosch…"')}${field('voltios', 'Voltios (V)', h.voltios || '', 'text', 'inputmode="decimal" placeholder="18"')}</div>
      ${tipo === 'bateria' ? `<div class="grid2">${field('ah', 'Amperios (Ah)', h.ah || '', 'text', 'inputmode="decimal" placeholder="5"')}${select('carga', 'Carga', ORDEN_CARGA.map((k) => [k, CARGA[k][0]]), h.carga || 'llena')}</div>` : field('ah', 'Amperios de carga (A)', h.ah || '', 'text', 'inputmode="decimal" placeholder="3"')}` : ''}
    <div class="grid2">${select('donde', '¿Dónde está ahora?', todosLugares(), h.donde || lugares()[1] || lugares()[0])}${select('casa', 'Su sitio de siempre', lugares(), h.casa || (esFuera(h) ? lugares()[1] : h.donde) || lugares()[1] || lugares()[0])}</div>
    ${field('detalle', 'Detalle (obra, persona, balda…)', h.detalle || '', 'text', 'placeholder="La tiene Paco / obra de Marta / balda de arriba"')}
    ${tipo === 'herramienta' ? `<div class="field"><label>¿Para qué oficios la llevas?</label><div class="pills" id="oficios">${OFICIOS.map((o) => `<button type="button" aria-pressed="${(h.oficios || []).includes(o)}">${o}</button>`).join('')}</div></div>` : ''}
    <div class="grid2">${h.id ? '<button class="btn danger" data-del>Borrar</button>' : '<span></span>'}<button class="btn" data-ok>Guardar</button></div>`, (s) => {
    s.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => formHerramienta(Object.assign(h, formData(s), { tipo: b.dataset.tipo }))));
    s.querySelectorAll('#oficios button').forEach((b) => (b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
    s.querySelector('[data-ok]').onclick = () => {
      const d = formData(s); if (!d.nombre) return s.querySelector('#f-nombre').focus();
      const fuera = FUERA.includes(d.donde);
      const obj = Object.assign(h.id ? h : { id: uid() }, { tipo, nombre: d.nombre, donde: d.donde, casa: d.casa, detalle: d.detalle, marca: d.marca, voltios: d.voltios, ah: d.ah,
        carga: d.carga || h.carga, desde: fuera ? (h.donde !== d.donde ? Date.now() : h.desde) : null,
        oficios: tipo === 'herramienta' ? [...s.querySelectorAll('#oficios [aria-pressed="true"]')].map((b) => b.textContent) : h.oficios || [] });
      if (!h.id) db.herramientas.push(obj); save(); closeSheet(); render();
    };
    const del = s.querySelector('[data-del]'); del && (del.onclick = () => { db.herramientas = db.herramientas.filter((x) => x !== h); save(); closeSheet(); render(); });
  });
};

window.formStock = function (st = {}) {
  openSheet(`<h2>${st.id ? 'Editar' : 'Añadir'} lo que tienes</h2>
    ${field('nombre', '¿Qué?', st.nombre, 'text', 'required placeholder="Tacos del 6"')}
    <div class="grid2">${field('cantidad', 'Te quedan', st.cantidad ?? '', 'number', 'inputmode="decimal" min="0"')}${field('minimo', 'Avísame si bajan de', st.minimo ?? '', 'number', 'inputmode="decimal" min="0"')}</div>
    <div class="grid2">${field('unidad', 'Unidad', st.unidad || 'ud', 'text', 'placeholder="ud, rollos, sacos…"')}${select('donde', '¿Dónde está?', lugares(), st.donde || lugares()[1] || lugares()[0])}</div>
    <div class="grid2">${st.id ? '<button class="btn danger" data-del>Borrar</button>' : '<span></span>'}<button class="btn" data-ok>Guardar</button></div>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => {
      const d = formData(s); if (!d.nombre) return s.querySelector('#f-nombre').focus();
      const obj = Object.assign(st.id ? st : { id: uid() }, { nombre: d.nombre, cantidad: num(d.cantidad) ?? 0, minimo: num(d.minimo), unidad: d.unidad, donde: d.donde });
      if (!st.id) db.stock.push(obj); save(); closeSheet(); render();
    };
    const del = s.querySelector('[data-del]'); del && (del.onclick = () => { db.stock = db.stock.filter((x) => x !== st); save(); closeSheet(); render(); });
  });
};

/* ---------- Lugares ---------- */
window.formLugares = () => {
  openSheet(`<h2>Tus lugares</h2><div class="muted">Donde guardas herramientas y material. «En una obra» y «Prestada» van siempre aparte.</div>
    <div class="list">${lugares().map((l, i) => { const n = db.herramientas.filter((h) => h.donde === l).length + db.stock.filter((s) => s.donde === l).length;
      return `<div class="item" style="align-items:center"><span class="grow"><span class="t">${esc(l)}</span> <span class="muted">· ${n} cosas</span></span><button class="btn sm light" data-ren="${i}">Renombrar</button><button class="btn sm danger" data-del="${i}" aria-label="Borrar ${esc(l)}">×</button></div>`; }).join('')}</div>
    <div class="row"><input id="lugar-nuevo" placeholder="Nuevo lugar: trastero, caja roja, furgo de Rober…" aria-label="Nuevo lugar" style="flex:1;min-height:46px;border:1.5px solid var(--line2);border-radius:10px;padding:0 12px;background:var(--card)"><button class="btn sm" id="lugar-add">Añadir</button></div>`, (s) => {
    const add = () => { const v = s.querySelector('#lugar-nuevo').value.trim(); if (!v || lugares().includes(v) || FUERA.includes(v)) return; lugares().push(v); save(); formLugares(); render(); };
    s.querySelector('#lugar-add').onclick = add; s.querySelector('#lugar-nuevo').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
    s.querySelectorAll('[data-ren]').forEach((b) => (b.onclick = () => { const i = +b.dataset.ren, viejo = lugares()[i], nuevo = prompt('Nuevo nombre', viejo)?.trim(); if (!nuevo || nuevo === viejo) return;
      lugares()[i] = nuevo; [...db.herramientas, ...db.stock].forEach((x) => { if (x.donde === viejo) x.donde = nuevo; if (x.casa === viejo) x.casa = nuevo; }); save(); formLugares(); render(); }));
    s.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const i = +b.dataset.del, l = lugares()[i]; if (lugares().length < 2) return toast('Tiene que quedar al menos un lugar');
      const dest = lugares().find((x) => x !== l); if (!confirm(`¿Borrar «${l}»? Lo que haya ahí pasa a «${dest}».`)) return;
      [...db.herramientas, ...db.stock].forEach((x) => { if (x.donde === l) x.donde = dest; if (x.casa === l) x.casa = dest; }); lugares().splice(i, 1); save(); formLugares(); render(); }));
  });
};

/* ---------- Mover de un toque ---------- */
window.moverRapido = (id) => {
  const h = db.herramientas.find((x) => x.id === id);
  openSheet(`<div class="between"><h2>${esc(h.nombre)}</h2><button class="btn sm light" data-edit>Editar</button></div><div class="muted">Ahora: ${esc(h.donde)}${h.detalle ? ' · ' + esc(h.detalle) : ''}. Toca dónde la dejas:</div>
    <div class="grid2">${lugares().map((l) => `<button class="btn ${h.donde === l ? '' : 'light'}" style="min-height:60px;font-size:16px" data-l="${esc(l)}">${esc(l)}</button>`).join('')}</div>
    <div class="grid2"><button class="btn ghost" data-l="En una obra">Se queda en una obra</button><button class="btn ghost" data-l="Prestada">La he prestado</button></div>
    ${esBat(h) && h.tipo === 'bateria' ? `<div class="muted">Carga</div><div class="grid2" style="grid-template-columns:repeat(4,1fr)">${ORDEN_CARGA.map((k) => `<button class="btn sm ${h.carga === k ? '' : 'light'}" data-c="${k}">${CARGA[k][0]}</button>`).join('')}</div>` : ''}`, (s) => {
    s.querySelector('[data-edit]').onclick = () => formHerramienta(h);
    s.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => { const l = b.dataset.l, antes = h.donde;
      if (FUERA.includes(l)) { const d = prompt(l === 'Prestada' ? '¿A quién se la has dejado?' : '¿En qué obra?', h.detalle || ''); if (d === null) return; h.detalle = d; h.desde = Date.now(); }
      else { h.detalle = ''; h.desde = null; }
      if (!FUERA.includes(antes) && antes !== l && !h.casa) h.casa = antes;
      h.donde = l; save(); closeSheet(); render(); toast(`${h.nombre} → ${l}`, () => { h.donde = antes; save(); }); }));
    s.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { h.carga = b.dataset.c; save(); closeSheet(); render(); }));
  });
};
window.cicloCarga = (id) => { const h = db.herramientas.find((x) => x.id === id); h.carga = ORDEN_CARGA[(ORDEN_CARGA.indexOf(h.carga || 'llena') + 1) % ORDEN_CARGA.length]; save(); render(); };

function barraCarga(h) {
  const [txt, col, n] = CARGA[h.carga || 'llena'];
  return `<span style="display:inline-flex;align-items:center;gap:6px"><span style="display:inline-flex;gap:2px;padding:2px;border:2px solid var(--ink);border-radius:4px">${[1, 2, 3, 4].map((i) => `<span style="width:7px;height:12px;border-radius:1px;background:${i <= n ? col : 'transparent'}"></span>`).join('')}</span><b style="font-size:13px;color:${col}">${txt}</b></span>`;
}
let selModo = false, selHerr = new Set();
const tile = (h, extra = '') => `<button class="tool-tile ${selModo && selHerr.has(h.id) ? 'on' : ''}" ${selModo ? `aria-pressed="${selHerr.has(h.id)}" onclick="selToggle('${h.id}')"` : `onclick="moverRapido('${h.id}')"`} ${extra}>${selModo && selHerr.has(h.id) ? '<span class="tick" aria-hidden="true">✓</span>' : ''}<span class="t">${esc(h.nombre)}</span><span class="muted">${esc(esFuera(h) ? h.detalle || h.donde : h.marca ? [h.marca, h.voltios && h.voltios + ' V', h.ah && h.ah + (h.tipo === 'bateria' ? ' Ah' : ' A')].filter(Boolean).join(' · ') : (h.oficios || []).slice(0, 2).join(', '))}</span>${h.tipo === 'bateria' ? barraCarga(h) : ''}</button>`;

/* ---------- Pestaña Herramientas de Material ---------- */
views.herramientas = () => {
  const cabecera = `<header class="top"><h1>Herramientas</h1><button class="btn" onclick="formHerramienta()" style="padding:0 14px">${ICON.plus.replace('<svg', '<svg style="stroke:var(--brand)"')}Añadir</button></header>`;
  const fuera = db.herramientas.filter(esFuera), bats = db.herramientas.filter((h) => esBat(h) && !esFuera(h));
  const vacias = bats.filter((h) => h.tipo === 'bateria' && h.carga === 'vacia').length;
  const porLugar = lugares().map((l) => [l, db.herramientas.filter((h) => h.donde === l && !esBat(h))]).filter(([, l]) => l.length);
  return `${cabecera}
  ${selModo ? '' : `<a class="btn brand block" href="#salida" style="min-height:58px;font-size:17px">Salir de casa: ¿qué te llevas?</a>
  <div class="grid2"><button class="btn light" onclick="checklistHerramientas()">Herramientas sugeridas</button><button class="btn light" onclick="formLugares()">Mis lugares</button></div>`}
  ${db.herramientas.length ? `<button class="btn ${selModo ? '' : 'ghost'} block" onclick="selModoToggle()">${selModo ? 'Cancelar selección' : 'Seleccionar varias para moverlas'}</button>` : ''}
  ${selModo ? `<div class="muted" style="text-align:center">Toca las que quieras mover${selHerr.size ? ` · llevas ${selHerr.size}` : ''}.</div>` : ''}
  ${fuera.length ? `<section class="card"><div class="between"><h2>Fuera de su sitio</h2><span class="chip red">${fuera.length}</span></div><div class="tool-grid">${fuera.map((h) => tile(h)).join('')}</div></section>` : ''}
  ${bats.length ? `<section class="card"><div class="between"><h2>Baterías y cargadores</h2>${vacias ? `<span class="chip red">${vacias} vacía${vacias > 1 ? 's' : ''}</span>` : ''}</div><div class="muted">Toca la carga para cambiarla; toca el nombre para moverla.</div>
    <div class="list">${bats.map((h) => `<div class="item" style="align-items:center;${selModo && selHerr.has(h.id) ? 'background:var(--brand);border-radius:10px;padding-left:8px;padding-right:8px;' : ''}"><button class="grow" style="background:none;border:0;text-align:left;padding:0;color:inherit" onclick="${selModo ? `selToggle('${h.id}')` : `moverRapido('${h.id}')`}"><div class="t">${esc(h.nombre)}</div><div class="muted">${esc([h.tipo === 'cargador' ? 'Cargador' : 'Batería', h.marca, h.voltios && h.voltios + ' V', h.ah && h.ah + (h.tipo === 'bateria' ? ' Ah' : ' A'), h.donde].filter(Boolean).join(' · '))}</div></button>${h.tipo === 'bateria' ? `<button style="background:none;border:0;min-height:44px" aria-label="Cambiar carga" onclick="cicloCarga('${h.id}')">${barraCarga(h)}</button>` : ''}</div>`).join('')}</div></section>` : ''}
  ${porLugar.map(([l, hs]) => `<section class="card"><div class="between"><h2>${esc(l)}</h2>${selModo ? `<button class="btn sm light" onclick="selVarias('${hs.map((h) => h.id).join(',')}')">Todas</button>` : `<span class="muted">${hs.length}</span>`}</div><div class="tool-grid">${hs.map((h) => tile(h)).join('')}</div></section>`).join('')}
  ${selModo ? `<div style="position:sticky;bottom:calc(84px + env(safe-area-inset-bottom));z-index:5"><button class="btn block" style="min-height:60px;font-size:18px;box-shadow:0 6px 18px rgba(0,0,0,.25)" onclick="selMover()" ${selHerr.size ? '' : 'disabled'}>${selHerr.size ? `Mover ${selHerr.size} a…` : 'Toca las que quieras mover'}</button></div>` : ''}
  ${selModo ? '' : db.herramientas.length ? '<div class="muted" style="text-align:center">Toca cualquier herramienta para cambiarla de sitio.</div>' : '<div class="card empty">Apunta tus herramientas con «Añadir» o con «Herramientas sugeridas». Si prestas una o se queda en una obra, te lo recuerdo.</div>'}
  ${selModo ? '' : `<button class="btn ghost block" onclick="formHerramienta({tipo:'bateria'})">+ Batería o cargador</button>`}`;
};
window.selModoToggle = () => { selModo = !selModo; selHerr = new Set(); render(); };
window.selToggle = (id) => { selHerr.has(id) ? selHerr.delete(id) : selHerr.add(id); navigator.vibrate?.(15); render(); };
window.selVarias = (ids) => { const l = ids.split(','), todas = l.every((i) => selHerr.has(i)); l.forEach((i) => (todas ? selHerr.delete(i) : selHerr.add(i))); render(); };
window.selMover = () => {
  const l = db.herramientas.filter((h) => selHerr.has(h.id)); if (!l.length) return;
  openSheet(`<h2>Mover ${l.length} ${l.length === 1 ? 'herramienta' : 'herramientas'} a…</h2><div class="muted">${l.map((h) => esc(h.nombre)).join(' · ')}</div>
    <div class="grid2">${lugares().map((x) => `<button class="btn light" style="min-height:60px;font-size:16px" data-l="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="grid2"><button class="btn ghost" data-l="En una obra">Se quedan en una obra</button><button class="btn ghost" data-l="Prestada">Las he prestado</button></div>`, (s) => {
    s.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => {
      const dest = b.dataset.l; let det = '';
      if (FUERA.includes(dest)) { det = prompt(dest === 'Prestada' ? '¿A quién se las has dejado?' : '¿En qué obra?', ''); if (det === null) return; }
      const antes = l.map((h) => [h, h.donde, h.detalle, h.desde]);
      l.forEach((h) => { if (!FUERA.includes(h.donde) && !h.casa) h.casa = h.donde; h.donde = dest; h.detalle = det; h.desde = FUERA.includes(dest) ? Date.now() : null; });
      selModo = false; selHerr = new Set(); save(); closeSheet(); render();
      toast(`${l.length} movidas a ${dest}`, () => { antes.forEach(([h, d, dt, ds]) => { h.donde = d; h.detalle = dt; h.desde = ds; }); save(); });
    }));
  });
};

/* ---------- Salir de casa: coger lo que te llevas ---------- */
let salidaSel = new Set(), salidaDestino = null;
views.salida = () => {
  if (!salidaDestino || !lugares().includes(salidaDestino)) salidaDestino = lugares().includes('Coche') ? 'Coche' : lugares()[0];
  const hoy = today().getTime(), prox = db.trabajos.filter((t) => t.cuando && t.cuando >= hoy && t.cuando < hoy + 2 * 864e5 && t.estado !== 'terminado').sort((a, b) => a.cuando - b.cuando)[0];
  const ofs = prox?.oficios || [];
  const enCasa = db.herramientas.filter((h) => !esFuera(h));
  const sugeridas = enCasa.filter((h) => h.donde !== salidaDestino && ofs.length && (h.oficios || []).some((o) => ofs.includes(o)));
  const resto = enCasa.filter((h) => h.donde !== salidaDestino && !sugeridas.includes(h));
  const yaVa = enCasa.filter((h) => h.donde === salidaDestino);
  const vacias = db.herramientas.filter((h) => h.tipo === 'bateria' && h.carga === 'vacia');
  const big = (h, sug) => `<button class="tool-tile big ${salidaSel.has(h.id) ? 'on' : ''}" aria-pressed="${salidaSel.has(h.id)}" onclick="salidaToggle('${h.id}')">${salidaSel.has(h.id) ? '<span class="tick" aria-hidden="true">✓</span>' : ''}<span class="t">${esc(h.nombre)}</span><span class="muted">${esc(h.donde)}${sug ? ' · para hoy' : ''}</span>${h.tipo === 'bateria' ? barraCarga(h) : ''}</button>`;
  const grupo = (titulo, l, sug) => l.length ? `<h2 style="margin-top:6px">${titulo}</h2><div class="tool-grid">${l.map((h) => big(h, sug)).join('')}</div>` : '';
  const restoPorLugar = lugares().filter((l) => l !== salidaDestino).map((l) => [l, resto.filter((h) => h.donde === l)]).filter(([, x]) => x.length);
  const vuelta = db.herramientas.filter((h) => h.donde === salidaDestino && h.casa && h.casa !== salidaDestino);
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><div style="flex:1"><div class="muted">${prox ? esc(fmtWhen(prox.cuando) + ' · ' + prox.titulo) : 'Toca lo que coges'}</div><h1 style="font-size:28px">¿Qué te llevas?</h1></div></header>
  <div class="row" style="gap:6px;flex-wrap:wrap"><span class="muted">Lo meto en:</span>${lugares().map((l) => `<button class="chip ${l === salidaDestino ? 'ink' : ''}" style="border:0;min-height:36px;padding:0 12px" onclick="salidaDestino='${esc(l)}';salidaSel=new Set();render()">${esc(l)}</button>`).join('')}</div>
  ${vacias.length ? `<div class="tip"><b>Ojo:</b> ${vacias.length === 1 ? 'una batería está vacía' : vacias.length + ' baterías están vacías'} (${vacias.map((b) => esc(b.nombre)).join(', ')}).</div>` : ''}
  ${sugeridas.length ? `<div class="row"><button class="btn sm brand" onclick="salidaTodas()">Marcar las ${sugeridas.length} de hoy</button></div>` : ''}
  ${grupo(prox ? 'Para ' + esc(prox.titulo) : '', sugeridas, true)}
  ${restoPorLugar.map(([l, x]) => grupo('En ' + esc(l), x)).join('')}
  ${yaVa.length ? `<h2 style="margin-top:6px">Ya en ${esc(salidaDestino)} · ${yaVa.length}</h2><div class="muted">${yaVa.map((h) => esc(h.nombre)).join(' · ')}</div>` : ''}
  ${!enCasa.length ? '<div class="card empty">Primero apunta tus herramientas en la pestaña Herramientas.</div>' : ''}
  ${vuelta.length ? `<button class="btn ghost block" onclick="salidaVuelta()">He vuelto: devolver ${vuelta.length} a su sitio</button>` : ''}
  <div style="position:sticky;bottom:calc(84px + env(safe-area-inset-bottom));z-index:5"><button class="btn block" style="min-height:60px;font-size:18px;box-shadow:0 6px 18px rgba(0,0,0,.25)" onclick="salidaOk()" ${salidaSel.size ? '' : 'disabled'}>${salidaSel.size ? `Me llevo ${salidaSel.size} · al ${esc(salidaDestino.toLowerCase())}` : 'Toca lo que coges'}</button></div>`;
};
window.salidaToggle = (id) => { salidaSel.has(id) ? salidaSel.delete(id) : salidaSel.add(id); navigator.vibrate?.(15); render(); };
window.salidaTodas = () => { const hoy = today().getTime(), prox = db.trabajos.filter((t) => t.cuando && t.cuando >= hoy && t.cuando < hoy + 2 * 864e5 && t.estado !== 'terminado').sort((a, b) => a.cuando - b.cuando)[0];
  db.herramientas.filter((h) => !esFuera(h) && h.donde !== salidaDestino && (h.oficios || []).some((o) => (prox?.oficios || []).includes(o))).forEach((h) => salidaSel.add(h.id)); render(); };
window.salidaOk = () => {
  const movidas = db.herramientas.filter((h) => salidaSel.has(h.id)), antes = movidas.map((h) => [h, h.donde]);
  movidas.forEach((h) => { if (!h.casa) h.casa = h.donde; h.donde = salidaDestino; });
  salidaSel = new Set(); save(); render(); toast(`${movidas.length} al ${salidaDestino.toLowerCase()}. ¡Buen trabajo!`, () => { antes.forEach(([h, d]) => (h.donde = d)); save(); });
};
window.salidaVuelta = () => { const l = db.herramientas.filter((h) => h.donde === salidaDestino && h.casa && h.casa !== salidaDestino), antes = l.map((h) => [h, h.donde]);
  l.forEach((h) => (h.donde = h.casa)); save(); render(); toast(`${l.length} devueltas a su sitio`, () => { antes.forEach(([h, d]) => (h.donde = d)); save(); }); };
