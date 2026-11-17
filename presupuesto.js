/* Chispas · presupuesto: hoja editable dentro de la app y, cuando está lista, botón para generar el PDF. */
'use strict';

const UNIDADES = ['ud', 'm²', 'm', 'hora', 'día', 'kg', 'saco', 'caja'];
const ESTADOS_P = { borrador: 'Borrador', enviado: 'Enviado', aceptado: 'Aceptado' };

function presu(t) {
  if (!t.presu) {
    db.ajustes.numPresu = (db.ajustes.numPresu || 0) + 1;
    t.presu = { numero: db.ajustes.numPresu, fecha: Date.now(), validez: 15, lineas: [], margen: 10, desplazamiento: 0, notas: '', estado: 'borrador' };
  }
  return t.presu;
}
function totales(t) {
  const p = presu(t), m = (p.margen || 0) / 100;
  const sub = (l) => (num(l.cantidad) || 0) * (num(l.precio) || 0);
  const mano = p.lineas.filter((l) => l.tipo !== 'material').reduce((s, l) => s + sub(l), 0);
  const matCoste = p.lineas.filter((l) => l.tipo === 'material').reduce((s, l) => s + sub(l), 0);
  const base = mano + matCoste * (1 + m) + (num(p.desplazamiento) || 0);
  const iva = t.factura ? base * 0.21 : 0;
  return { mano, matCoste, matCliente: matCoste * (1 + m), base, iva, total: Math.round((base + iva) * 100) / 100 };
}
// El precio del trabajo y sus cobros siguen al presupuesto mientras no se haya cobrado nada
function syncImporte(t) {
  const { total } = totales(t); t.importe = total;
  if (total && !(t.pagos || []).some((p) => p.cobrado)) {
    const nombres = { 2: ['Al empezar', 'Al terminar'], 3: ['Al empezar', 'A mitad de obra', 'Al terminar'], 1: ['Al terminar'] };
    const pcts = PLANES[t.plan || '50/50'], imps = _p(total, pcts); t.pagos = pcts.map((p, i) => ({ id: uid(), nombre: nombres[pcts.length][i], pct: p, importe: imps[i], cobrado: false }));
  }
}
function lineaPrecioCliente(t, l) { return l.tipo === 'material' ? (num(l.precio) || 0) * (1 + (presu(t).margen || 0) / 100) : num(l.precio) || 0; }

views.presupuesto = (id) => {
  const t = trabajo(id); if (!t) return '<div class="card empty">Este trabajo ya no existe.</div>';
  const p = presu(t), T = totales(t), c = cliente(t.clienteId);
  const chipE = p.estado === 'aceptado' ? 'ok' : p.estado === 'enviado' ? 'warn' : '';
  const fila = (l) => `<div class="card" style="padding:10px 12px;display:flex;flex-direction:column;gap:8px" data-linea="${l.id}">
    <div class="row"><input data-l="${l.id}" data-f="concepto" value="${esc(l.concepto)}" placeholder="¿Qué trabajo o material?" aria-label="Concepto" style="flex:1;min-width:0;min-height:42px;border:1.5px solid var(--line2);border-radius:9px;padding:0 10px;background:var(--card);font-weight:600">
      <button class="icon-btn" style="width:44px;height:44px;flex-shrink:0" aria-label="Quitar línea" onclick="quitarLinea('${t.id}','${l.id}')"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.3fr);gap:6px">
      <label style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="muted" style="font-size:12px">Cantidad</span><input data-l="${l.id}" data-f="cantidad" value="${esc(String(l.cantidad ?? '').replace('.', ','))}" inputmode="decimal" style="min-height:44px;width:100%;min-width:0;border:1.5px solid var(--line2);border-radius:9px;padding:0 8px;background:var(--card);text-align:right"></label>
      <label style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="muted" style="font-size:12px">Unidad</span><select data-l="${l.id}" data-f="unidad" style="min-height:44px;width:100%;min-width:0;border:1.5px solid var(--line2);border-radius:9px;padding:0 8px;background:var(--card)">${UNIDADES.map((u) => `<option ${u === l.unidad ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      <label style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="muted" style="font-size:12px">${l.tipo === 'material' ? 'Te cuesta (€/' + esc(l.unidad || 'ud') + ')' : 'Precio (€/' + esc(l.unidad || 'ud') + ')'}</span><input data-l="${l.id}" data-f="precio" value="${esc(String(l.pack && num(l.precio) != null ? Math.round(num(l.precio) * 10000) / 10000 : l.precio ?? '').replace('.', ','))}" ${l.pack ? 'readonly' : ''} inputmode="decimal" style="min-height:44px;width:100%;min-width:0;border:1.5px solid var(--line2);border-radius:9px;padding:0 8px;background:var(--card);text-align:right${l.pack ? ';background:var(--bg)' : ''}"></label>
    </div>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="chip ${l.tipo === 'material' ? '' : 'ink'}" style="border:0" onclick="tipoLinea('${t.id}','${l.id}','mano')">Mano de obra</button><button class="chip ${l.tipo === 'material' ? 'ink' : ''}" style="border:0" onclick="tipoLinea('${t.id}','${l.id}','material')">Material${l.tipo === 'material' ? ' · coste + margen' : ''}</button>
      ${l.tipo === 'material' ? `<button class="chip ${l.pack ? 'ink' : ''}" style="border:0" onclick="packLinea('${t.id}','${l.id}')">${l.pack ? 'En paquete ✓' : 'Viene en paquete'}</button>` : ''}<b data-imp="${l.id}" style="margin-left:auto;font-size:17px">${eur((num(l.cantidad) || 0) * lineaPrecioCliente(t, l))}</b></div>
    ${l.tipo === 'material' && l.pack ? `<div style="background:var(--bg);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:6px">
      <div class="muted">Paquete de</div><div class="pills">${[1, 5, 10, 25, 50, 100, 200, 500].map((n) => `<button aria-pressed="${num(l.packUds) === n}" onclick="packSet('${t.id}','${l.id}','packUds',${n})">${n}</button>`).join('')}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap"><input data-l="${l.id}" data-f="packUds" value="${esc(l.packUds || '')}" inputmode="numeric" aria-label="Unidades por paquete" style="width:70px;min-height:40px;border:1.5px solid var(--line2);border-radius:9px;padding:0 8px;background:var(--card);text-align:right"><span>uds por</span>
        <input data-l="${l.id}" data-f="packPrecio" value="${esc(l.packPrecio || '')}" inputmode="decimal" aria-label="Precio del paquete" style="width:80px;min-height:40px;border:1.5px solid var(--line2);border-radius:9px;padding:0 8px;background:var(--card);text-align:right"><span>€</span>
        <b data-pu="${l.id}" style="margin-left:auto">${num(l.packUds) && num(l.packPrecio) != null ? '= ' + eurU(num(l.packPrecio) / num(l.packUds)) + '/ud' : ''}</b></div>
      <div class="muted">Pon en cantidad las unidades que vas a gastar. Te cobra solo esas, no el paquete entero.</div></div>` : ''}
    ${l.gastado != null ? `<div class="row" style="gap:8px;flex-wrap:wrap;font-size:14px"><span>Gastado en obra: <b>${String(l.gastado).replace('.', ',')}</b> (previsto ${String(l.cantidad).replace('.', ',')})</span>${num(l.gastado) !== num(l.cantidad) ? `<button class="btn sm light" onclick="usarGastado('${t.id}','${l.id}')">Usar lo gastado</button>` : '<span class="chip ok">Cuadra</span>'}</div>` : ''}
  </div>`;
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><div style="flex:1"><div class="muted">Presupuesto n.º ${p.numero} · <span class="chip ${chipE}">${ESTADOS_P[p.estado]}</span></div><h1 style="font-size:26px">${esc(t.titulo)}</h1><div class="muted">${esc(c?.nombre || 'Sin cliente')}${t.direccion ? ' · ' + esc(t.direccion) : ''}</div></div></header>
  <div id="lineas" style="display:flex;flex-direction:column;gap:8px">${p.lineas.map(fila).join('') || '<div class="card empty">Añade partidas desde tu catálogo de precios, a mano o desde un plano.</div>'}</div>
  <div class="grid2"><button class="btn light" onclick="desdeCatalogo('${t.id}')">+ Del catálogo</button><button class="btn light" onclick="nuevaLinea('${t.id}','mano')">+ Partida libre</button>
    <button class="btn light" onclick="nuevaLinea('${t.id}','material')">+ Material</button><button class="btn light" onclick="location.hash='#plano/${t.id}'">+ Desde plano</button></div>
  ${db.material.some((m) => m.trabajoId === t.id && m.precio) ? `<button class="btn ghost block" onclick="traerMaterial('${t.id}')">Traer el material apuntado en el trabajo</button>` : ''}
  <section class="card" style="display:flex;flex-direction:column;gap:10px">
    <div class="between"><b>Margen al material</b><span class="muted">te cuesta ${eur(T.matCoste)}</span></div>
    <div class="pills">${[0, 10, 15, 20, 30].map((m) => `<button aria-pressed="${(p.margen || 0) === m}" onclick="presuSet('${t.id}','margen',${m})">${m} %</button>`).join('')}</div>
    <div class="grid2">${field('desp', 'Desplazamiento (€)', p.desplazamiento || '', 'text', `inputmode="decimal" onchange="presuSet('${t.id}','desplazamiento',num(this.value)||0)"`)}${field('validez', 'Válido (días)', p.validez, 'number', `onchange="presuSet('${t.id}','validez',num(this.value)||15)"`)}</div>
    <label class="check-row"><input type="checkbox" class="chk" ${t.factura ? 'checked' : ''} onchange="trabajo('${t.id}').factura=this.checked;syncImporte(trabajo('${t.id}'));save();render()"> Con factura (IVA 21 %)</label>
    <div><div class="muted" style="margin-bottom:6px">Forma de pago</div><div class="pills">${Object.keys(PLANES).map((k) => `<button aria-pressed="${(t.plan || '50/50') === k}" onclick="trabajo('${t.id}').plan='${k}';syncImporte(trabajo('${t.id}'));save();render()">${k}</button>`).join('')}</div></div>
    <div class="field"><label for="f-notas">Notas para el cliente</label><textarea id="f-notas" onchange="presuSet('${t.id}','notas',this.value)" placeholder="Incluye retirada de escombros. No incluye pintura…">${esc(p.notas || '')}</textarea></div>
  </section>
  ${p.estado === 'enviado' ? `<button class="btn ok block" style="background:var(--ok);color:#fff" onclick="aceptarPresu('${t.id}')">El cliente lo ha aceptado</button>` : ''}
  <section class="card dark" style="position:sticky;bottom:calc(84px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:12px;z-index:5;padding:10px 12px">
    <div style="flex:1;min-width:0"><div class="muted" style="font-size:12px">TOTAL${t.factura ? ' CON IVA' : ''}</div><div class="money" id="p-total" style="font-size:28px;line-height:1">${eur(T.total)}</div>
      <div class="muted" id="p-desglose" style="font-size:12px">${t.factura ? `Base ${eur(T.base)} · IVA ${eur(T.iva)}` : 'Sin factura'}</div></div>
    <button class="btn brand" style="flex-shrink:0" onclick="generarPDF('${t.id}')">${p.estado === 'borrador' ? 'Enviar PDF' : 'Enviar otra vez'}</button>
  </section>`;
};

// Edición en vivo sin perder el foco
document.addEventListener('input', (e) => {
  const el = e.target, lid = el.dataset?.l; if (!lid) return;
  const t = db.trabajos.find((x) => x.presu?.lineas.some((l) => l.id === lid)); if (!t) return;
  const l = t.presu.lineas.find((x) => x.id === lid); l[el.dataset.f] = el.value;
  if (el.dataset.f === 'packUds' || el.dataset.f === 'packPrecio') { const u = num(l.packUds), pp = num(l.packPrecio); l.precio = u && pp != null ? pp / u : '';
    const pu = document.querySelector(`[data-pu="${lid}"]`); if (pu) pu.textContent = u && pp != null ? '= ' + eurU(pp / u) + '/ud' : '';
    const pin = document.querySelector(`[data-l="${lid}"][data-f="precio"]`); if (pin) pin.value = l.precio === '' ? '' : String(Math.round(l.precio * 10000) / 10000).replace('.', ','); }
  const imp = document.querySelector(`[data-imp="${lid}"]`); if (imp) imp.textContent = eur((num(l.cantidad) || 0) * lineaPrecioCliente(t, l));
  const T = totales(t); const tot = $('#p-total'); if (tot) tot.textContent = eur(T.total);
  const d = $('#p-desglose'); if (d && t.factura) d.textContent = `Base ${eur(T.base)} · IVA ${eur(T.iva)}`;
  clearTimeout(window._pt); window._pt = setTimeout(() => { syncImporte(t); save(); }, 600);
});
document.addEventListener('change', (e) => { if (e.target.dataset?.f === 'unidad') { const t = db.trabajos.find((x) => x.presu?.lineas.some((l) => l.id === e.target.dataset.l)); if (t) { syncImporte(t); save(); render(); } } });

const eurU = (v) => (v < 1 ? (Math.round(v * 1000) / 1000).toLocaleString('es-ES', { minimumFractionDigits: 3 }) : (Math.round(v * 100) / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })) + ' €';
window.eurU = eurU;
window.packLinea = (id, lid) => { const t = trabajo(id), l = presu(t).lineas.find((x) => x.id === lid); l.pack = !l.pack;
  if (l.pack) { l.unidad = 'ud'; if (!l.packUds) { l.packUds = 100; l.packPrecio = num(l.precio) || ''; } l.precio = num(l.packPrecio) != null && l.packPrecio !== '' ? num(l.packPrecio) / l.packUds : ''; }
  else if (l.packPrecio) { l.precio = num(l.packPrecio); }
  syncImporte(t); save(); render(); };
window.packSet = (id, lid, k, v) => { const t = trabajo(id), l = presu(t).lineas.find((x) => x.id === lid); l[k] = v; const u = num(l.packUds), pp = num(l.packPrecio); l.precio = u && pp != null ? pp / u : ''; syncImporte(t); save(); render(); };
window.usarGastado = (id, lid) => { const t = trabajo(id), l = presu(t).lineas.find((x) => x.id === lid); l.cantidad = l.gastado; syncImporte(t); save(); render(); toast('Presupuesto ajustado a lo gastado'); };
window.presuSet = (id, k, v) => { const t = trabajo(id); presu(t)[k] = v; syncImporte(t); save(); render(); };
window.nuevaLinea = (id, tipo, datos = {}) => { const t = trabajo(id); presu(t).lineas.push(Object.assign({ id: uid(), concepto: '', cantidad: 1, unidad: 'ud', precio: '', tipo }, datos)); syncImporte(t); save(); render();
  if (!datos.concepto) setTimeout(() => { const ins = document.querySelectorAll('[data-f="concepto"]'); ins[ins.length - 1]?.focus(); }, 50); };
window.quitarLinea = (id, lid) => { const t = trabajo(id), p = presu(t), l = p.lineas.find((x) => x.id === lid); p.lineas = p.lineas.filter((x) => x !== l); syncImporte(t); save(); render(); toast('Línea quitada', () => { p.lineas.push(l); syncImporte(t); save(); }); };
window.tipoLinea = (id, lid, tipo) => { const t = trabajo(id); presu(t).lineas.find((x) => x.id === lid).tipo = tipo; syncImporte(t); save(); render(); };
window.traerMaterial = (id) => { const t = trabajo(id), p = presu(t), ya = new Set(p.lineas.map((l) => l.matId));
  const nuevos = db.material.filter((m) => m.trabajoId === id && m.precio && !ya.has(m.id));
  nuevos.forEach((m) => p.lineas.push({ id: uid(), concepto: m.nombre + (m.cantidad ? ' (' + m.cantidad + ')' : ''), cantidad: 1, unidad: 'ud', precio: m.precio, tipo: 'material', matId: m.id }));
  syncImporte(t); save(); render(); toast(nuevos.length ? `${nuevos.length} materiales añadidos` : 'Ya estaban todos'); };
window.desdeCatalogo = (id) => {
  const t = trabajo(id), ofs = t.oficios?.length ? t.oficios : OFICIOS;
  const lista = db.catalogo.filter((c) => c.precio != null && (ofs.includes(c.oficio) || c.oficio === 'Otros'));
  openSheet(`<h2>Del catálogo</h2>${lista.length ? '' : '<div class="tip">Aún no tienes precios puestos para estos oficios. Ponlos en Más › Mis precios.</div>'}
    <div class="list">${lista.map((c) => `<button class="item" style="width:100%;background:none;border:0;text-align:left;align-items:center" data-c="${c.id}"><div class="grow"><div class="t">${esc(c.nombre)}</div><div class="muted">${esc(c.oficio)}${c.conMaterial ? ' · con material' : ''}</div></div><b>${eur(c.precio)} <span class="muted">/${esc(c.unidad)}</span></b></button>`).join('')}</div>
    <a class="btn light block" href="#catalogo">Ir al catálogo de precios</a>`, (s) => s.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
      const c = db.catalogo.find((x) => x.id === b.dataset.c); closeSheet();
      nuevaLinea(id, 'mano', { concepto: c.nombre, unidad: c.unidad, precio: c.precio, cantidad: 1, catalogoId: c.id }); toast('Añadido: ' + c.nombre);
    })));
};
window.aceptarPresu = (id) => { const t = trabajo(id); presu(t).estado = 'aceptado'; syncImporte(t); if (t.estado === 'presupuesto') t.estado = 'en_curso'; save(); render(); toast('¡Aceptado! El trabajo pasa a «En curso»'); };
window.syncImporte = syncImporte;

/* ---------- Tus datos (cabecera del PDF) ---------- */
function formNegocio(despues) {
  const n = db.ajustes.negocio || {};
  openSheet(`<h2>Tus datos para los presupuestos</h2><div class="muted">Salen arriba del PDF. Solo hace falta el nombre y el teléfono.</div>
    ${field('nombre', 'Nombre o nombre comercial', n.nombre || '', 'text', 'required')}${field('tel', 'Teléfono', n.tel || '', 'tel')}
    ${field('email', 'Correo', n.email || window.cloud?.user?.email || '', 'email')}${field('nif', 'NIF (solo si facturas)', n.nif || '')}${field('dir', 'Dirección (opcional)', n.dir || '')}
    <button class="btn block" data-ok>Guardar</button>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => { const d = formData(s); if (!d.nombre) return s.querySelector('#f-nombre').focus(); db.ajustes.negocio = d; save(); closeSheet(); despues ? despues() : render(); };
  });
}
window.formNegocio = formNegocio;

/* ---------- PDF ---------- */
function cargarJsPDF() {
  if (window.jspdf) return Promise.resolve();
  return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
}
window.generarPDF = async (id) => {
  const t = trabajo(id), p = presu(t), c = cliente(t.clienteId) || {}, n = db.ajustes.negocio;
  if (!p.lineas.length) return toast('Añade al menos una partida');
  if (p.lineas.some((l) => !l.concepto || num(l.precio) == null)) return toast('Hay alguna línea sin concepto o sin precio');
  if (!n || !n.nombre) return formNegocio(() => generarPDF(id));
  toast('Generando PDF…');
  try { await cargarJsPDF(); } catch { return toast('Necesitas cobertura la primera vez para generar el PDF'); }
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4' }), T = totales(t);
  const NOCHE = [35, 26, 79], GRIS = [91, 101, 115], X = 16, W = 178;
  const f = (d) => new Date(d).toLocaleDateString('es-ES');
  let y = 18;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...NOCHE); doc.text(n.nombre, X, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  [n.tel && 'Tel. ' + n.tel, n.email, n.nif && 'NIF ' + n.nif, n.dir].filter(Boolean).forEach((l, i) => doc.text(l, X, y + 6 + i * 4.5));
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...NOCHE); doc.text('PRESUPUESTO', X + W, y, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40);
  doc.text(`N.º ${p.numero}`, X + W, y + 6, { align: 'right' }); doc.text(`Fecha: ${f(Date.now())}`, X + W, y + 11, { align: 'right' });
  doc.text(`Válido hasta: ${f(Date.now() + (p.validez || 15) * 864e5)}`, X + W, y + 16, { align: 'right' });
  y = 46; doc.setDrawColor(220); doc.setFillColor(246, 244, 250); doc.roundedRect(X, y, W, 22, 2, 2, 'F');
  doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text('CLIENTE', X + 4, y + 6); doc.text('TRABAJO', X + W / 2 + 2, y + 6);
  doc.setFontSize(10.5); doc.setTextColor(30); doc.setFont('helvetica', 'bold'); doc.text(c.nombre || '—', X + 4, y + 12); doc.text(doc.splitTextToSize(t.titulo, W / 2 - 8)[0], X + W / 2 + 2, y + 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.text([c.tel, c.dir].filter(Boolean).join(' · ').slice(0, 60) || '', X + 4, y + 17.5); doc.text((t.direccion || '').slice(0, 55), X + W / 2 + 2, y + 17.5);
  y = 76;
  const cols = [X + 3, X + 112, X + 140, X + W - 3];
  const cabecera = () => { doc.setFillColor(...NOCHE); doc.rect(X, y, W, 8, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('Concepto', cols[0], y + 5.4); doc.text('Cantidad', cols[1], y + 5.4, { align: 'right' }); doc.text('Precio', cols[2] + 16, y + 5.4, { align: 'right' }); doc.text('Importe', cols[3], y + 5.4, { align: 'right' }); y += 8; };
  cabecera(); doc.setFont('helvetica', 'normal'); doc.setTextColor(30); doc.setFontSize(10);
  const filas = p.lineas.map((l) => { const pc = lineaPrecioCliente(t, l), q = num(l.cantidad) || 0; return [l.concepto, `${String(l.cantidad).replace('.', ',')} ${l.unidad}`, eurU(pc), eur(q * pc)]; });
  if (num(p.desplazamiento)) filas.push(['Desplazamiento', '', '', eur(num(p.desplazamiento))]);
  filas.forEach((r, i) => {
    const lines = doc.splitTextToSize(r[0], 100), h = Math.max(7, lines.length * 4.6 + 2.6);
    if (y + h > 270) { doc.addPage(); y = 18; cabecera(); doc.setFont('helvetica', 'normal'); doc.setTextColor(30); doc.setFontSize(10); }
    if (i % 2) { doc.setFillColor(248, 248, 250); doc.rect(X, y, W, h, 'F'); }
    doc.text(lines, cols[0], y + 4.8); doc.text(r[1], cols[1], y + 4.8, { align: 'right' }); doc.text(r[2], cols[2] + 16, y + 4.8, { align: 'right' }); doc.text(r[3], cols[3], y + 4.8, { align: 'right' });
    y += h;
  });
  doc.setDrawColor(...NOCHE); doc.setLineWidth(0.4); doc.line(X, y + 1, X + W, y + 1); y += 8;
  if (y > 250) { doc.addPage(); y = 20; }
  const tot = (lbl, v, big) => { doc.setFont('helvetica', big ? 'bold' : 'normal'); doc.setFontSize(big ? 13 : 10); doc.setTextColor(big ? 35 : 60, big ? 26 : 60, big ? 79 : 60); doc.text(lbl, X + 120, y); doc.text(v, X + W - 3, y, { align: 'right' }); y += big ? 8 : 6; };
  if (t.factura) { tot('Base imponible', eur(T.base)); tot('IVA 21 %', eur(T.iva)); }
  tot('TOTAL', eur(T.total), true);
  y += 2; doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30); doc.text('Forma de pago', X, y); y += 5;
  doc.setFont('helvetica', 'normal'); const pcts = PLANES[t.plan || '50/50'], noms = { 2: ['al empezar', 'al terminar'], 3: ['al empezar', 'a mitad de obra', 'al terminar'], 1: ['al terminar el trabajo'] }[pcts.length];
  const imps = _p(T.total, pcts); doc.text(pcts.map((x, i) => `${x} % ${noms[i]} (${eur(imps[i])})`).join(' · '), X, y); y += 8;
  if (p.notas) { doc.setFont('helvetica', 'bold'); doc.text('Notas', X, y); y += 5; doc.setFont('helvetica', 'normal'); const nl = doc.splitTextToSize(p.notas, W); if (y + nl.length * 4.6 > 262) { doc.addPage(); y = 20; } doc.text(nl, X, y); y += nl.length * 4.6 + 4; }
  if (y > 255) { doc.addPage(); y = 20; }
  y = Math.max(y + 6, 250); doc.setDrawColor(170); doc.setLineWidth(0.2); doc.line(X, y, X + 70, y); doc.line(X + W - 50, y, X + W, y);
  doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text('Aceptado por el cliente (firma)', X, y + 4.5); doc.text('Fecha', X + W - 50, y + 4.5);
  doc.text(`Presupuesto válido ${p.validez || 15} días desde su fecha.${t.factura ? '' : ' Precios sin IVA.'}`, X, 287);

  const nombre = `Presupuesto ${p.numero} - ${(c.nombre || t.titulo).replace(/[^\wÀ-ÿ ]+/g, '')}.pdf`;
  const file = new File([doc.output('blob')], nombre, { type: 'application/pdf' });
  if (p.estado === 'borrador') p.estado = 'enviado'; p.enviado = Date.now(); syncImporte(t); save(); render();
  const texto = `Hola${c.nombre ? ' ' + c.nombre.split(' ')[0] : ''}, te paso el presupuesto de «${t.titulo}». Cualquier duda me dices.`;
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: texto, title: nombre }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = nombre; a.click(); toast('PDF descargado');
};
