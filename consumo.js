/* Chispas · fin del día: cuánto material pequeño has gastado (tacos, tornillos, tuercas…).
   Suma lo gastado en el presupuesto del trabajo y lo resta del stock. */
'use strict';

const PEQUENO = ['Tacos', 'Tornillos', 'Tuercas', 'Arandelas', 'Bridas', 'Bornas Wago', 'Brocas', 'Discos de corte', 'Silicona', 'Cinta aislante'];
const diaKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const trabajoHoy = (t) => (t.horas || []).some((h) => sameDay(h.inicio, new Date()));
const preguntado = (t) => (db.ajustes.gastoDia || {})[t.id] === diaKey();
window.pendientesGastoDia = () => db.trabajos.filter((t) => trabajoHoy(t) && !preguntado(t) && t.estado !== 'presupuesto');
const consumibles = (t) => (t.presu?.lineas || []).filter((l) => l.tipo === 'material' && (l.pack || l.unidad === 'ud' || l.gastado != null));

let gastoHoy = {};
views.gastodia = (id) => {
  const t = trabajo(id); if (!t) return '';
  const lineas = consumibles(t);
  const fila = (l) => { const n = gastoHoy[l.id] || 0;
    return `<section class="card" style="display:flex;flex-direction:column;gap:8px"><div class="between"><b style="font-size:17px">${esc(l.concepto)}</b>${n ? `<span class="chip ink">hoy ${n}</span>` : ''}</div>
      <div class="muted">Previsto ${String(l.cantidad || 0).replace('.', ',')} ${esc(l.unidad || 'ud')} · llevas gastado ${String(l.gastado || 0).replace('.', ',')}</div>
      <div class="row" style="gap:6px"><button class="icon-btn" style="width:52px;height:52px;font-size:24px;flex-shrink:0" aria-label="Uno menos" onclick="gastoMas('${l.id}',-1)">−</button>
        <input value="${n || ''}" placeholder="0" inputmode="numeric" aria-label="Gastado hoy" oninput="gastoHoy['${l.id}']=num(this.value)||0" style="flex:1;min-width:0;width:100%;min-height:52px;border:1.5px solid var(--line2);border-radius:12px;text-align:center;font-size:22px;font-weight:700;background:var(--card)">
        <button class="icon-btn" style="width:52px;height:52px;font-size:24px;flex-shrink:0" aria-label="Uno más" onclick="gastoMas('${l.id}',1)">+</button></div>
      <div class="pills" style="flex-wrap:wrap">${[5, 10, 25, 50, 100].map((x) => `<button onclick="gastoMas('${l.id}',${x})">+${x}</button>`).join('')}</div></section>`; };
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><div style="flex:1"><div class="muted">Fin del día · ${esc(nombreTrabajo(t))}</div><h1 style="font-size:26px">¿Qué material pequeño has gastado hoy?</h1></div></header>
  ${lineas.map(fila).join('') || '<div class="card empty">Todavía no hay material pequeño en este trabajo. Añádelo abajo.</div>'}
  <section class="card"><div class="muted" style="margin-bottom:6px">Añadir otro material pequeño</div><div class="pills" style="flex-wrap:wrap">${PEQUENO.filter((n) => !lineas.some((l) => l.concepto.toLowerCase().startsWith(n.toLowerCase()))).map((n) => `<button onclick="gastoNuevo('${id}','${n}')">+ ${n}</button>`).join('')}<button onclick="gastoNuevo('${id}')">+ Otro</button></div></section>
  <button class="btn brand block" style="min-height:56px;font-size:17px" onclick="gastoGuardar('${id}')">Guardar lo de hoy</button>
  <button class="btn light block" onclick="gastoNada('${id}')">Hoy no he gastado nada de esto</button>`;
};
window.gastoMas = (lid, d) => { gastoHoy[lid] = Math.max(0, (gastoHoy[lid] || 0) + d); render(); };
window.gastoNuevo = (id, nombre) => {
  nombre = nombre || prompt('¿Qué material?'); if (!nombre) return;
  const det = prompt(`Medida o tipo (opcional), p. ej. «${nombre === 'Tacos' ? 'del 6' : nombre === 'Tornillos' ? '4x40' : 'M6'}»`, '') || '';
  const t = trabajo(id), tenia = !!t.presu, p = presu(t);
  p.lineas.push({ id: uid(), concepto: (nombre + ' ' + det).trim(), cantidad: 0, unidad: 'ud', precio: '', tipo: 'material', pack: true, packUds: 100, packPrecio: '', gastado: 0 });
  if (tenia) syncImporte(t); save(); render(); toast('Añadido. Ponle el precio del paquete en el presupuesto');
};
window.gastoGuardar = (id) => {
  const t = trabajo(id), lineas = consumibles(t); let total = 0;
  lineas.forEach((l) => { const n = gastoHoy[l.id] || 0; if (!n) return; total += n;
    l.gastado = (num(l.gastado) || 0) + n; (l.consumos = l.consumos || []).push({ fecha: Date.now(), n });
    const st = db.stock.find((s) => s.nombre.toLowerCase() === l.concepto.toLowerCase() || l.concepto.toLowerCase().startsWith(s.nombre.toLowerCase()));
    if (st && (!st.unidad || st.unidad === 'ud')) st.cantidad = Math.max(0, (st.cantidad || 0) - n); });
  (db.ajustes.gastoDia = db.ajustes.gastoDia || {})[id] = diaKey(); gastoHoy = {};
  save(); location.hash = '#presupuesto/' + id;
  toast(total ? 'Apuntado. En el presupuesto ves lo previsto y lo gastado' : 'Apuntado');
};
window.gastoNada = (id) => { (db.ajustes.gastoDia = db.ajustes.gastoDia || {})[id] = diaKey(); gastoHoy = {}; save(); location.hash = '#inicio'; };

// Tarjeta en Inicio a partir de las 17:00
const vistaInicioAnterior = views.inicio;
views.inicio = () => {
  const html = vistaInicioAnterior(), l = new Date().getHours() >= 17 ? pendientesGastoDia() : [];
  if (!l.length) return html;
  const card = l.map((t) => `<section class="card" style="border:2px solid var(--brand)"><div style="font-size:13px;font-weight:700;color:var(--warn)">FIN DEL DÍA</div><h2 style="margin:2px 0 4px">¿Cuánto material pequeño has gastado en ${esc(t.titulo)}?</h2><div class="muted">Tacos, tornillos, tuercas… Se suma al presupuesto y se resta de lo que tienes.</div>
    <div class="grid2" style="margin-top:10px"><button class="btn light" onclick="gastoNada('${t.id}')">Nada</button><a class="btn brand" href="#gastodia/${t.id}">Apuntar</a></div></section>`).join('');
  const i = html.indexOf('</header>') + 9; return html.slice(0, i) + card + html.slice(i);
};
render();
