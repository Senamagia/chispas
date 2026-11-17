/* Chispas · puentes entre la lista de material y el presupuesto, y herramientas que hay que comprar para un trabajo. */
'use strict';

/* ---------- Utilidades ---------- */
const UNI_PAL = { caja: 'caja', cajas: 'caja', saco: 'saco', sacos: 'saco', m: 'm', metro: 'm', metros: 'm', ml: 'm', 'm²': 'm²', m2: 'm²', kg: 'kg', kilos: 'kg', ud: 'ud', uds: 'ud', unidad: 'ud', unidades: 'ud', hora: 'hora', horas: 'hora' };
// «2 cajas» → { n: 2, unidad: 'caja' }
function leerCantidad(txt) {
  const m = String(txt || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return { n: 1, unidad: 'ud' };
  const pal = m[2].toLowerCase().split(/\s+/)[0] || 'ud';
  return { n: num(m[1]) || 1, unidad: UNI_PAL[pal] || 'ud' };
}
const enPresupuesto = (t, m) => (t.presu?.lineas || []).some((l) => l.matId === m.id);
const enLista = (l) => l.matId && db.material.some((m) => m.id === l.matId);
const lugarCasa = () => lugares()[1] || lugares()[0];

/* ---------- Lista de material → presupuesto ---------- */
window.listaAPresupuesto = (id) => {
  const t = trabajo(id), mats = db.material.filter((m) => m.trabajoId === id && !m.herramienta);
  if (!mats.length) return toast('Este trabajo no tiene material apuntado');
  openSheet(`<h2>Pasar material al presupuesto</h2><div class="muted">Marca lo que quieras cobrar. Pon cuánto te cuesta cada unidad: el margen se suma solo.</div>
    <div class="list">${mats.map((m) => { const ya = enPresupuesto(t, m), q = leerCantidad(m.cantidad), pu = m.precio != null ? Math.round((m.precio / q.n) * 100) / 100 : '';
      return `<div class="item" style="flex-direction:column;align-items:stretch;gap:6px"><label class="row" style="gap:10px"><input type="checkbox" class="chk" data-m="${m.id}" ${ya ? 'disabled' : 'checked'}><span class="grow t">${esc(m.nombre)}</span>${ya ? '<span class="chip ok">Ya está</span>' : ''}</label>
        ${ya ? '' : `<div class="grid2" style="grid-template-columns:1fr 1fr 1.2fr;padding-left:34px"><label style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="muted" style="font-size:12px">Cantidad</span><input data-q="${m.id}" value="${String(q.n).replace('.', ',')}" inputmode="decimal" style="min-height:44px;width:100%;min-width:0;border:1.5px solid var(--line2);border-radius:9px;padding:0 8px;background:var(--card);text-align:right"></label>
          <label style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="muted" style="font-size:12px">Unidad</span><select data-u="${m.id}" style="min-height:44px;width:100%;min-width:0;border:1.5px solid var(--line2);border-radius:9px;background:var(--card)">${UNIDADES.map((u) => `<option ${u === q.unidad ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
          <label style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="muted" style="font-size:12px">Te cuesta (€/ud)</span><input data-p="${m.id}" value="${String(pu).replace('.', ',')}" inputmode="decimal" placeholder="0" style="min-height:44px;width:100%;min-width:0;border:1.5px solid var(--line2);border-radius:9px;padding:0 8px;background:var(--card);text-align:right"></label></div>`}</div>`; }).join('')}</div>
    <button class="btn brand block" data-ok>Añadir al presupuesto</button>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => {
      const p = presu(t); let n = 0;
      s.querySelectorAll('[data-m]:checked:not(:disabled)').forEach((c) => { const m = db.material.find((x) => x.id === c.dataset.m), v = (k) => s.querySelector(`[data-${k}="${m.id}"]`).value;
        p.lineas.push({ id: uid(), concepto: m.nombre, cantidad: v('q') || '1', unidad: v('u'), precio: num(v('p')) ?? '', tipo: 'material', matId: m.id }); n++; });
      if (!n) return toast('Marca algo');
      syncImporte(t); save(); closeSheet(); location.hash = '#presupuesto/' + id;
      toast(`${n} ${n === 1 ? 'material pasado' : 'materiales pasados'} al presupuesto`);
    };
  });
};
window.traerMaterial = window.listaAPresupuesto;

/* ---------- Presupuesto → lista de material ---------- */
window.presupuestoALista = (id) => {
  const t = trabajo(id), lineas = (t.presu?.lineas || []).filter((l) => l.tipo === 'material' && l.concepto);
  if (!lineas.length) return toast('El presupuesto no tiene líneas de material');
  openSheet(`<h2>Mandar a la lista de material</h2><div class="muted">Lo que marques sale en Compra › Por comprar${t.estado === 'presupuesto' ? ' (en espera hasta que el cliente acepte)' : ''}.</div>
    <div class="list">${lineas.map((l) => { const ya = enLista(l);
      return `<label class="item" style="align-items:center"><input type="checkbox" class="chk" data-l="${l.id}" ${ya ? 'disabled' : 'checked'}><span class="grow"><span class="t">${esc(l.concepto)}</span> <span class="muted">${esc(String(l.cantidad).replace('.', ','))} ${esc(l.unidad)}</span></span>${ya ? '<span class="chip ok">Ya está</span>' : ''}</label>`; }).join('')}</div>
    ${select('tiendaP', 'Tienda', TIENDAS, 'Obramat')}
    <button class="btn brand block" data-ok>Mandar a la lista</button>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => {
      const tienda = s.querySelector('#f-tiendaP').value; let n = 0;
      s.querySelectorAll('[data-l]:checked:not(:disabled)').forEach((c) => { const l = t.presu.lineas.find((x) => x.id === c.dataset.l), q = num(l.cantidad), pu = num(l.precio);
        const m = { id: uid(), nombre: l.concepto, cantidad: `${String(l.cantidad).replace('.', ',')} ${l.unidad}`, precio: q != null && pu != null ? Math.round(q * pu * 100) / 100 : null, tienda, trabajoId: id, comprado: false, creado: Date.now() };
        db.material.push(m); l.matId = m.id; n++; });
      if (!n) return toast('Marca algo');
      save(); closeSheet(); render(); toast(`${n} ${n === 1 ? 'cosa mandada' : 'cosas mandadas'} a la lista de material`);
    };
  });
};

/* ---------- Herramientas que hay que comprar para un trabajo ---------- */
window.herrComprar = (id, nombre = '') => {
  const t = trabajo(id);
  openSheet(`<h2>Herramienta que hay que comprar</h2><div class="muted">Para «${esc(t?.titulo || '')}». Va a la lista de compra y, cuando la compres, se guarda sola en tus herramientas.</div>
    ${field('hnombre', '¿Qué herramienta?', nombre, 'text', 'placeholder="Corona de 68 mm, cortatubos…" autocomplete="off"')}
    <div class="grid2">${field('hprecio', 'Precio aprox. (€)', '', 'text', 'inputmode="decimal"')}${select('htienda', 'Tienda', TIENDAS, 'Leroy Merlin')}</div>
    <label class="check-row"><input type="checkbox" class="chk" id="f-hpresu"> Cobrársela al cliente en el presupuesto</label>
    <button class="btn brand block" data-ok>Apuntar para comprar</button>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => {
      const n = s.querySelector('#f-hnombre').value.trim(); if (!n) return s.querySelector('#f-hnombre').focus();
      const precio = num(s.querySelector('#f-hprecio').value);
      const m = { id: uid(), nombre: n, cantidad: '', precio, tienda: s.querySelector('#f-htienda').value, trabajoId: id, comprado: false, creado: Date.now(), herramienta: true };
      db.material.push(m);
      if (s.querySelector('#f-hpresu').checked) { const p = presu(t); p.lineas.push({ id: uid(), concepto: n, cantidad: '1', unidad: 'ud', precio: precio ?? '', tipo: 'material', matId: m.id }); syncImporte(t); }
      save(); closeSheet(); render(); toast(`${n}: apuntada para comprar`);
    };
  });
};
// Al marcarla como comprada pasa a «mis herramientas»
function alComprar(m) {
  if (!m?.herramienta || !m.comprado || m.herrId) return null;
  const t = trabajo(m.trabajoId), h = { id: uid(), tipo: 'herramienta', nombre: m.nombre, donde: lugarCasa(), casa: lugarCasa(), detalle: '', oficios: t?.oficios || [] };
  db.herramientas.push(h); m.herrId = h.id; return h;
}
const compradoBase = window.comprado;
window.comprado = (id) => {
  const m = db.material.find((x) => x.id === id); m.comprado = true; m.compradoEn = Date.now(); const h = alComprar(m); save(); render();
  toast(h ? `Comprada y guardada en tus herramientas (${h.donde})` : 'Comprado', () => { m.comprado = false; if (h) { db.herramientas = db.herramientas.filter((x) => x !== h); delete m.herrId; } save(); });
};
const matCompradoBase = window.matComprado;
window.matComprado = (id, v) => { const m = db.material.find((x) => x.id === id); matCompradoBase(id, v); if (v) { const h = alComprar(m); if (h) { save(); render(); toast(`Comprada y guardada en tus herramientas (${h.donde})`); } } };

/* ---------- Presupuesto: botones de ida y vuelta con la lista ---------- */
const vistaPresuPuente = views.presupuesto;
views.presupuesto = (id) => {
  const html = vistaPresuPuente(id), t = trabajo(id); if (!t) return html;
  const hayLista = db.material.some((m) => m.trabajoId === id && !m.herramienta), hayMat = (t.presu?.lineas || []).some((l) => l.tipo === 'material' && l.concepto);
  const barra = `<section class="card" style="display:flex;flex-direction:column;gap:8px"><b>Lista de material</b>
    <div class="grid2"><button class="btn light" onclick="listaAPresupuesto('${id}')" ${hayLista ? '' : 'disabled'}>Traer de la lista</button><button class="btn light" onclick="presupuestoALista('${id}')" ${hayMat ? '' : 'disabled'}>Mandar a la lista</button></div></section>`;
  const marca = '<section class="card" style="display:flex;flex-direction:column;gap:10px">';
  const i = html.indexOf(marca); return i < 0 ? html + barra : html.slice(0, i) + barra + html.slice(i);
};
