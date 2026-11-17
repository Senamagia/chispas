/* Chispas · planos (v2).
   Tres formas: por medidas, en cuadrícula (punto a punto) o calcando una foto de fondo.
   Al cambiar la medida de una pared se «estira» el plano como en AutoCAD: se mueve todo lo que queda
   detrás de esa pared, así las esquinas siguen cerradas y las paredes rectas.
   La cuadrícula se puede acercar con dos dedos o con + y −, sin hacer zoom a toda la pantalla. */
'use strict';

/* ---------- Geometría (funciones puras, probadas aparte) ---------- */
const PlanoGeo = {
  SNAP: 0.25,
  largo: (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]),
  segs(p) { const n = p.pts.length; const out = []; for (let i = 0; i < (p.cerrado ? n : n - 1); i++) out.push([p.pts[i], p.pts[(i + 1) % n], i]); return out; },
  // Estirar: la pared i pasa a medir «nuevo» (en unidades del dibujo). Se mueve todo lo que está al otro lado de su final.
  estirar(p, i, nuevo) {
    const n = p.pts.length, a = p.pts[i], b = p.pts[(i + 1) % n], L = PlanoGeo.largo(a, b); if (!L || !(nuevo > 0)) return false;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, d = nuevo - L, lim = L - 1e-6;
    p.pts = p.pts.map((q) => { const proj = (q[0] - a[0]) * ux + (q[1] - a[1]) * uy; return proj >= lim ? [Math.round((q[0] + ux * d) * 1e4) / 1e4, Math.round((q[1] + uy * d) * 1e4) / 1e4] : q; });
    return true;
  },
  // Dónde cae un toque: cierra, se pega a una esquina, a la cuadrícula y se pone recto
  ajustarPunto(p, x, y, tol) {
    const pts = p.pts, first = pts[0], last = pts[pts.length - 1];
    if (pts.length > 2 && PlanoGeo.largo(first, [x, y]) < tol * 1.3) return { cerrar: true };
    for (const q of pts) if (PlanoGeo.largo(q, [x, y]) < tol) return q === last ? null : { punto: [q[0], q[1]] };
    let nx = Math.round(x / PlanoGeo.SNAP) * PlanoGeo.SNAP, ny = Math.round(y / PlanoGeo.SNAP) * PlanoGeo.SNAP;
    if (last) { const dx = nx - last[0], dy = ny - last[1]; if (Math.abs(dy) <= 0.25 * Math.abs(dx)) ny = last[1]; else if (Math.abs(dx) <= 0.25 * Math.abs(dy)) nx = last[0]; }
    // Alinear con cualquier esquina ya puesta (ayuda a cerrar en escuadra)
    for (const q of pts) { if (q !== last && Math.abs(nx - q[0]) < tol) nx = q[0]; if (q !== last && Math.abs(ny - q[1]) < tol) ny = q[1]; }
    if (last && nx === last[0] && ny === last[1]) return null;
    return { punto: [Math.round(nx * 1e4) / 1e4, Math.round(ny * 1e4) / 1e4] };
  },
  calculos(p) {
    const e = p.escala || 1, n = p.pts.length;
    let area = 0; if (p.cerrado && n > 2) { for (let i = 0; i < n; i++) { const [x1, y1] = p.pts[i], [x2, y2] = p.pts[(i + 1) % n]; area += x1 * y2 - x2 * y1; } area = Math.abs(area) / 2 * e * e; }
    const perim = PlanoGeo.segs(p).reduce((s, [a, b]) => s + PlanoGeo.largo(a, b), 0) * e;
    const huecos = (p.huecos || []).reduce((s, h) => s + (+h.ancho || 0) * (+h.alto || 0), 0);
    const alto = +p.alto || 2.5;
    return { suelo: area, techo: area, perim, paredes: Math.max(0, perim * alto - huecos), huecos };
  },
  limites(p) {
    if (!p.pts.length) return { x: -0.5, y: -0.5, w: 8, h: 6 };
    const xs = p.pts.map((q) => q[0]), ys = p.pts.map((q) => q[1]);
    const x0 = Math.min(...xs) - 1, y0 = Math.min(...ys) - 1, w = Math.max(6, Math.max(...xs) - x0 + 1), h = Math.max(4.5, Math.max(...ys) - y0 + 1);
    return { x: x0, y: y0, w, h };
  },
};
if (typeof module !== 'undefined') module.exports = PlanoGeo;

let planoSel = null, planoModo = null, herramienta = 'pared', fotoURL = null, fotoOpacidad = 45, vista = {}, ayudaPlano = false;
if (typeof window !== 'undefined') {
const planosDe = (t) => (t.planos = t.planos || []);
function planoActual(t) {
  const l = planosDe(t);
  if (!l.length) l.push({ id: uid(), nombre: 'Habitación 1', pts: [], cerrado: false, alto: 2.5, escala: 1, calibrado: false, huecos: [], medidas: {} });
  return l.find((p) => p.id === planoSel) || l[0];
}
window.planoActual = planoActual;
const m2 = (v) => (Math.round(v * 10) / 10).toLocaleString('es-ES') + ' m²';
const mts = (v) => (Math.round(v * 100) / 100).toLocaleString('es-ES') + ' m';
const vb = (p) => (vista[p.id] = vista[p.id] || PlanoGeo.limites(p));

function svgPlano(p) {
  const v = vb(p), e = p.escala || 1, fs = v.w / 24, sw = v.w / 70;
  let grid = ''; const paso = v.w < 5 ? 0.25 : 0.5;
  for (let x = Math.floor(v.x / paso) * paso; x <= v.x + v.w; x += paso) grid += `<line x1="${x}" y1="${v.y}" x2="${x}" y2="${v.y + v.h}" stroke="${Math.abs(x - Math.round(x)) < 1e-6 ? '#D3D8E0' : '#ECEFF3'}" stroke-width="${sw / 4}"/>`;
  for (let y = Math.floor(v.y / paso) * paso; y <= v.y + v.h; y += paso) grid += `<line x1="${v.x}" y1="${y}" x2="${v.x + v.w}" y2="${y}" stroke="${Math.abs(y - Math.round(y)) < 1e-6 ? '#D3D8E0' : '#ECEFF3'}" stroke-width="${sw / 4}"/>`;
  const foto = planoModo === 'foto' && fotoURL ? `<image href="${fotoURL}" x="-0.5" y="-0.5" width="10" height="8" preserveAspectRatio="xMidYMid meet" opacity="${fotoOpacidad / 100}"/>` : '';
  const paredes = PlanoGeo.segs(p).map(([a, b]) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = PlanoGeo.largo(a, b) * e, vert = Math.abs(b[0] - a[0]) < Math.abs(b[1] - a[1]);
    const etiqueta = (Math.round(len * 100) / 100).toLocaleString('es-ES') + (p.calibrado || planoModo !== 'foto' ? ' m' : '');
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#1C2430" stroke-width="${sw * 2}" stroke-linecap="round"/>
      <text x="${vert ? mx + fs * 0.6 : mx}" y="${vert ? my + fs * 0.35 : my - fs * 0.55}" text-anchor="${vert ? 'start' : 'middle'}" font-size="${fs}" font-family="Barlow, sans-serif" font-weight="700" fill="#1C2430" stroke="#fff" stroke-width="${fs / 4}" paint-order="stroke">${etiqueta}</text>`;
  }).join('');
  const huecos = (p.huecos || []).map((h) => { const s = PlanoGeo.segs(p).find((x) => x[2] === h.w); if (!s) return ''; const [a, b] = s, len = PlanoGeo.largo(a, b), w = Math.min(len, (+h.ancho || 0.8) / e);
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, c = h.pos ?? 0.5, cx = a[0] + (b[0] - a[0]) * c, cy = a[1] + (b[1] - a[1]) * c;
    return `<line x1="${cx - ux * w / 2}" y1="${cy - uy * w / 2}" x2="${cx + ux * w / 2}" y2="${cy + uy * w / 2}" stroke="${h.tipo === 'ventana' ? '#2457C5' : '#C77A1E'}" stroke-width="${sw * 3.2}"/>`; }).join('');
  const cerrar = !p.cerrado && p.pts.length > 2;
  const puntos = p.pts.map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="${(i === 0 && cerrar ? 2.4 : 1.4) * sw}" fill="${i === 0 && cerrar ? '#FFC20E' : '#fff'}" stroke="#1C2430" stroke-width="${sw * 0.7}"/>`).join('');
  return `<svg id="plano-svg" viewBox="${v.x} ${v.y} ${v.w} ${v.h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Plano de ${esc(p.nombre)}" style="width:100%;height:52vh;max-height:460px;display:block;background:#fff;touch-action:none;-webkit-user-select:none;user-select:none;border-radius:14px;border:1px solid var(--line2)">${foto}${grid}${huecos}${paredes}${puntos}</svg>`;
}

const PASOS_AYUDA = [
  ['1 · Dibuja', 'Toca cada esquina de la habitación, una detrás de otra. Las paredes salen rectas y se pegan a la cuadrícula.'],
  ['2 · Cierra', 'Toca el punto amarillo (la primera esquina) para cerrar la habitación.'],
  ['3 · Mide', 'Elige «Medir» y toca una pared: escribe lo que mide de verdad. El plano se estira y las esquinas siguen unidas.'],
  ['4 · Puertas y ventanas', 'Elige «Puerta» o «Ventana» y toca la pared donde va. Se descuentan de los m² de pared.'],
  ['5 · Acercar', 'Pellizca con dos dedos sobre el plano o usa + y −. Arrastra con un dedo para moverte. «Ajustar» lo encuadra todo.'],
];

views.plano = (id) => {
  const t = trabajo(id); if (!t) return '';
  const p = planoActual(t), C = PlanoGeo.calculos(p), l = planosDe(t);
  if (!planoModo) planoModo = p.pts.length && !(p.medidas && p.medidas.largo) ? 'cuadricula' : 'medidas';
  if (!db.ajustes.ayudaPlanoVista && planoModo !== 'medidas') { ayudaPlano = true; db.ajustes.ayudaPlanoVista = true; save(); }
  const tab = (k, n) => `<button role="tab" aria-selected="${planoModo === k}" onclick="planoModo='${k}';render()">${n}</button>`;
  const tool = (k, n) => `<button class="btn sm ${herramienta === k ? '' : 'light'}" style="flex:1;padding:0 4px" onclick="herramienta='${k}';render()">${n}</button>`;
  const consejo = { pared: p.cerrado ? 'Habitación cerrada. Usa «Medir» para poner lo que mide cada pared.' : p.pts.length > 2 ? 'Toca la siguiente esquina, o el punto amarillo para cerrar.' : p.pts.length ? 'Toca la siguiente esquina.' : 'Toca la primera esquina de la habitación.',
    puerta: 'Toca la pared donde va la puerta.', ventana: 'Toca la pared donde va la ventana.', medir: p.calibrado || planoModo !== 'foto' ? 'Toca una pared para escribir su medida real.' : 'Toca una pared que sepas cuánto mide: fija la escala de la foto.' }[herramienta];
  let editor;
  if (planoModo === 'medidas') {
    editor = `<section class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="grid2" style="grid-template-columns:1fr 1fr 1fr">${field('largo', 'Largo (m)', p.medidas?.largo || '', 'text', 'inputmode="decimal"')}${field('ancho', 'Ancho (m)', p.medidas?.ancho || '', 'text', 'inputmode="decimal"')}${field('alto', 'Alto (m)', String(p.alto).replace('.', ','), 'text', 'inputmode="decimal"')}</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">${(p.huecos || []).map((h, i) => `<span class="chip">${h.tipo === 'ventana' ? 'Ventana' : 'Puerta'} ${String(h.ancho).replace('.', ',')} × ${String(h.alto).replace('.', ',')} <button style="border:0;background:none;color:var(--red);font-weight:700;margin-left:4px" aria-label="Quitar hueco" onclick="quitarHueco('${id}',${i})">×</button></span>`).join('')}
        <button class="btn sm light" onclick="nuevoHueco('${id}','puerta')">+ Puerta</button><button class="btn sm light" onclick="nuevoHueco('${id}','ventana')">+ Ventana</button></div>
      <button class="btn block" onclick="planoMedidas('${id}')">Dibujar y calcular</button></section>
      ${p.pts.length ? svgPlano(p) : ''}`;
  } else {
    editor = `${planoModo === 'foto' ? `<section class="card" style="display:flex;flex-direction:column;gap:8px">
        <label class="btn light block" style="cursor:pointer">${fotoURL ? 'Cambiar foto' : 'Hacer o elegir foto del plano'}<input type="file" accept="image/*" class="sr" onchange="cargarFoto(this.files[0])"></label>
        ${fotoURL ? `<label class="row" style="font-weight:600;font-size:15px">Foto<input type="range" min="10" max="100" value="${fotoOpacidad}" style="flex:1;accent-color:var(--primary)" oninput="fotoOpacidad=+this.value;document.querySelector('#plano-svg image')?.setAttribute('opacity',this.value/100)"></label>` : ''}
        <div class="muted">La foto no se guarda: solo el dibujo.</div></section>` : ''}
      ${ayudaPlano ? `<section class="card" style="border:2px solid var(--brand)"><div class="between"><h2>Cómo se usa</h2><button class="btn sm light" onclick="ayudaPlano=false;render()">Entendido</button></div>${PASOS_AYUDA.map(([a, b]) => `<div style="padding:6px 0"><b>${a}</b><div class="muted">${b}</div></div>`).join('')}</section>` : ''}
      <div class="row" style="gap:6px;align-items:center"><span class="muted" style="flex:1">Pellizca para acercar</span>
        <button class="icon-btn" aria-label="Alejar" onclick="zoomPlano('${id}',1/0.7)" style="font-size:24px;font-weight:700">−</button>
        <button class="icon-btn" aria-label="Acercar" onclick="zoomPlano('${id}',0.7)" style="font-size:24px;font-weight:700">+</button>
        <button class="btn sm light" aria-label="Ajustar el plano a la pantalla" onclick="ajustarPlano('${id}')" style="min-height:44px">Ajustar</button></div>
      ${svgPlano(p)}
      <div class="row" style="gap:6px">${tool('pared', 'Pared')}${tool('puerta', 'Puerta')}${tool('ventana', 'Ventana')}${tool('medir', 'Medir')}<button class="btn sm light" onclick="deshacerPlano('${id}')" aria-label="Deshacer">↶</button></div>
      <div style="font-size:15px">${consejo}</div>
      <div class="grid2">${field('alto', 'Alto del techo (m)', String(p.alto).replace('.', ','), 'text', `inputmode="decimal" onchange="planoActual(trabajo('${id}')).alto=num(this.value)||2.5;save();render()"`)}<button class="btn sm light" style="align-self:end;min-height:46px" onclick="ayudaPlano=true;render()">¿Cómo se usa?</button></div>`;
  }
  const cab = window.cabeceraTrabajo ? cabeceraTrabajo(t, 'plano') : `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><h1>Plano</h1></header>`;
  return `${cab}
  <div class="pills">${l.map((x) => `<button aria-pressed="${x === p}" onclick="planoSel='${x.id}';render()">${esc(x.nombre)}</button>`).join('')}<button onclick="nuevoPlano('${id}')">+ Habitación</button><button onclick="renombrarPlano('${id}')">Renombrar</button></div>
  <div class="tabs" role="tablist">${tab('medidas', 'Medidas')}${tab('cuadricula', 'Cuadrícula')}${tab('foto', 'Calcar foto')}</div>
  ${editor}
  <section class="card"><div style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center">
    <div><div class="muted">Suelo</div><div class="money" style="font-size:22px">${m2(C.suelo)}</div></div><div><div class="muted">Paredes</div><div class="money" style="font-size:22px">${m2(C.paredes)}</div></div><div><div class="muted">Techo</div><div class="money" style="font-size:22px">${m2(C.techo)}</div></div></div>
    <div class="muted" style="text-align:center;margin-top:4px">Perímetro ${mts(C.perim)}${C.huecos ? ' · huecos descontados ' + m2(C.huecos) : ''}${p.cerrado || !p.pts.length ? '' : ' · cierra la habitación para calcular'}</div>
    ${p.pts.length ? `<button class="btn sm danger" style="margin-top:8px" onclick="borrarPlano('${id}')">Empezar de nuevo</button>` : ''}</section>
  <button class="btn brand block" onclick="planoAPresupuesto('${id}')" ${C.suelo || C.paredes ? '' : 'disabled'}>Pasar los m² al presupuesto</button>`;
};

/* ---------- Toques, arrastre y pellizco sobre el plano ---------- */
const punteros = new Map(); let gesto = null;
const enPlano = (ev) => ev.target.closest && ev.target.closest('#plano-svg');
const aSvg = (svg, cx, cy) => { const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
const idPlano = () => location.hash.split('/')[1];
document.addEventListener('pointerdown', (ev) => {
  const svg = enPlano(ev); if (!svg) return;
  ev.preventDefault();
  punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  const id = idPlano(), p = planoActual(trabajo(id)), v = Object.assign({}, vb(p));
  if (punteros.size === 1) gesto = { tipo: 'toque', x0: ev.clientX, y0: ev.clientY, v, svg, id };
  else if (punteros.size === 2) { const [a, b] = [...punteros.values()]; gesto = { tipo: 'pellizco', d0: Math.hypot(a.x - b.x, a.y - b.y), c0: aSvg(svg, (a.x + b.x) / 2, (a.y + b.y) / 2), v, svg, id }; }
});
document.addEventListener('pointermove', (ev) => {
  if (!gesto || !punteros.has(ev.pointerId)) return; punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  const p = planoActual(trabajo(gesto.id)), svg = gesto.svg; if (!svg.isConnected) return;
  const escalaPx = gesto.v.w / svg.getBoundingClientRect().width;
  const pon = (v) => { vista[p.id] = v; svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`); };
  if (gesto.tipo !== 'pellizco' && punteros.size === 1) {
    const dx = ev.clientX - gesto.x0, dy = ev.clientY - gesto.y0;
    if (gesto.tipo === 'toque' && Math.hypot(dx, dy) > 10) gesto.tipo = 'arrastre';
    if (gesto.tipo === 'arrastre') pon(Object.assign({}, gesto.v, { x: gesto.v.x - dx * escalaPx, y: gesto.v.y - dy * escalaPx }));
  } else if (gesto.tipo === 'pellizco' && punteros.size === 2) {
    const [a, b] = [...punteros.values()], f = Math.min(4, Math.max(0.25, gesto.d0 / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y))));
    const w = Math.min(60, Math.max(1.5, gesto.v.w * f)), h = gesto.v.h * (w / gesto.v.w);
    pon({ x: gesto.c0.x - (gesto.c0.x - gesto.v.x) * (w / gesto.v.w), y: gesto.c0.y - (gesto.c0.y - gesto.v.y) * (h / gesto.v.h), w, h });
  }
});
const finPuntero = (ev) => {
  if (!punteros.has(ev.pointerId)) return; punteros.delete(ev.pointerId);
  if (!gesto) return;
  if (gesto.tipo === 'toque' && ev.type === 'pointerup' && punteros.size === 0) { const q = aSvg(gesto.svg, ev.clientX, ev.clientY), g = gesto; gesto = null; return toquePlano(g.id, q.x, q.y); }
  if (punteros.size === 0) { gesto = null; render(); } else if (gesto.tipo === 'pellizco') gesto = { tipo: 'nada' };
};
document.addEventListener('pointerup', finPuntero); document.addEventListener('pointercancel', finPuntero);

function toquePlano(id, x, y) {
  const t = trabajo(id), p = planoActual(t), tol = vb(p).w / 22;
  if (planoModo === 'medidas') return;
  if (herramienta === 'pared') {
    if (p.cerrado) return toast('La habitación ya está cerrada. Usa «Medir» o «Empezar de nuevo».');
    const r = PlanoGeo.ajustarPunto(p, x, y, tol); if (!r) return;
    if (r.cerrar) { p.cerrado = true; save(); render(); return toast('Habitación cerrada'); }
    p.pts.push(r.punto); save(); render(); return;
  }
  let best = null, bd = tol;
  PlanoGeo.segs(p).forEach(([a, b, i]) => { const L2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 || 1, k = Math.max(0, Math.min(1, ((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / L2));
    const d = Math.hypot(x - (a[0] + k * (b[0] - a[0])), y - (a[1] + k * (b[1] - a[1]))); if (d < bd) { bd = d; best = [i, k]; } });
  if (!best) return toast('Toca justo encima de una pared');
  const [i, k] = best, [a, b] = PlanoGeo.segs(p).find((s) => s[2] === i), lenU = PlanoGeo.largo(a, b), e = p.escala || 1;
  if (herramienta === 'medir') {
    const v = num(prompt('¿Cuánto mide esta pared de verdad? (metros)', String(Math.round(lenU * e * 100) / 100).replace('.', ','))); if (!v) return;
    if (planoModo === 'foto' && !p.calibrado) { p.escala = v / lenU; p.calibrado = true; toast('Escala fijada con esta pared. Las demás se miden solas.'); }
    else { PlanoGeo.estirar(p, i, v / e); p.calibrado = true; }
  } else {
    const def = herramienta === 'ventana' ? ['1,20', '1,10'] : ['0,80', '2,05'];
    const an = num(prompt(`Ancho de la ${herramienta} (m)`, def[0])); if (!an) return; const al = num(prompt(`Alto de la ${herramienta} (m)`, def[1])) || num(def[1]);
    (p.huecos = p.huecos || []).push({ w: i, tipo: herramienta, ancho: an, alto: al, pos: Math.min(0.85, Math.max(0.15, k)) });
  }
  save(); render();
}

window.zoomPlano = (id, f) => { const p = planoActual(trabajo(id)), v = vb(p), w = Math.min(60, Math.max(1.5, v.w * f)), h = v.h * (w / v.w);
  vista[p.id] = { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h }; render(); };
window.ajustarPlano = (id) => { delete vista[planoActual(trabajo(id)).id]; render(); };
window.planoMedidas = (id) => { const p = planoActual(trabajo(id)), L = num($('#f-largo').value), A = num($('#f-ancho').value); if (!L || !A) return toast('Pon el largo y el ancho');
  p.medidas = { largo: $('#f-largo').value, ancho: $('#f-ancho').value }; p.alto = num($('#f-alto').value) || 2.5;
  p.pts = [[0, 0], [L, 0], [L, A], [0, A]]; p.cerrado = true; p.escala = 1; p.calibrado = true; delete vista[p.id];
  (p.huecos || []).forEach((h) => (h.w = h.tipo === 'ventana' ? 0 : 2)); save(); render(); };
window.nuevoHueco = (id, tipo) => { const p = planoActual(trabajo(id)), def = tipo === 'ventana' ? ['1,20', '1,10'] : ['0,80', '2,05'];
  const an = num(prompt(`Ancho de la ${tipo} (m)`, def[0])); if (!an) return; const al = num(prompt(`Alto de la ${tipo} (m)`, def[1])) || num(def[1]);
  (p.huecos = p.huecos || []).push({ w: tipo === 'ventana' ? 0 : 2, tipo, ancho: an, alto: al }); save(); render(); };
window.quitarHueco = (id, i) => { planoActual(trabajo(id)).huecos.splice(i, 1); save(); render(); };
window.deshacerPlano = (id) => { const p = planoActual(trabajo(id));
  if (p.cerrado) p.cerrado = false; else if ((p.huecos || []).length && p.huecos[p.huecos.length - 1].w >= p.pts.length - 2) p.huecos.pop(); else p.pts.pop();
  p.huecos = (p.huecos || []).filter((h) => h.w < Math.max(0, p.pts.length - (p.cerrado ? 0 : 1))); save(); render(); };
window.borrarPlano = (id) => { if (!confirm('¿Borrar el dibujo de esta habitación?')) return; const p = planoActual(trabajo(id)); Object.assign(p, { pts: [], cerrado: false, huecos: [], escala: 1, calibrado: false, medidas: {} }); delete vista[p.id]; save(); render(); };
window.nuevoPlano = (id) => { const t = trabajo(id), n = prompt('Nombre de la habitación', 'Habitación ' + (planosDe(t).length + 1)); if (!n) return;
  const p = { id: uid(), nombre: n, pts: [], cerrado: false, alto: 2.5, escala: 1, calibrado: false, huecos: [], medidas: {} }; planosDe(t).push(p); planoSel = p.id; save(); render(); };
window.renombrarPlano = (id) => { const p = planoActual(trabajo(id)), n = prompt('Nombre de la habitación', p.nombre); if (n) { p.nombre = n; save(); render(); } };
window.cargarFoto = (f) => { if (!f) return; if (fotoURL) URL.revokeObjectURL(fotoURL); fotoURL = URL.createObjectURL(f); herramienta = 'pared'; render(); };

window.planoAPresupuesto = (id) => {
  const t = trabajo(id), p = planoActual(t), C = PlanoGeo.calculos(p);
  const m2cat = db.catalogo.filter((c) => c.unidad === 'm²');
  const opts = (def) => [['', '— Partida libre —'], ...m2cat.map((c) => [c.id, `${c.nombre}${c.precio != null ? ' · ' + eur(c.precio) : ''}`])].map(([v, n]) => `<option value="${v}" ${def && n.startsWith(def) ? 'selected' : ''}>${esc(n)}</option>`).join('');
  const fila = (k, nombre, val, def, on) => `<div class="card" style="background:var(--bg);display:flex;flex-direction:column;gap:6px"><label class="check-row"><input type="checkbox" class="chk" data-k="${k}" ${on && val ? 'checked' : ''} ${val ? '' : 'disabled'}> ${nombre} · <b>${m2(val)}</b></label><select data-s="${k}" aria-label="Partida para ${nombre}" style="min-height:44px;border:1.5px solid var(--line2);border-radius:9px;background:var(--card)">${opts(def)}</select></div>`;
  openSheet(`<h2>Pasar al presupuesto · ${esc(p.nombre)}</h2>
    ${fila('paredes', 'Paredes', C.paredes, 'Pintar paredes', true)}${fila('techo', 'Techo', C.techo, 'Pintar techos', true)}${fila('suelo', 'Suelo', C.suelo, 'Solado', false)}
    <button class="btn brand block" data-ok>Añadir al presupuesto</button>`, (s) => s.querySelector('[data-ok]').onclick = () => {
      const pr = presu(t); let n = 0;
      s.querySelectorAll('[data-k]:checked').forEach((c) => { const k = c.dataset.k, cat = db.catalogo.find((x) => x.id === s.querySelector(`[data-s="${k}"]`).value);
        pr.lineas.push({ id: uid(), concepto: (cat ? cat.nombre : { paredes: 'Paredes', techo: 'Techo', suelo: 'Suelo' }[k]) + ' · ' + p.nombre, cantidad: String(Math.round(C[k] * 100) / 100).replace('.', ','), unidad: 'm²', precio: cat?.precio ?? '', tipo: 'mano', catalogoId: cat?.id }); n++; });
      syncImporte(t); save(); closeSheet(); location.hash = '#presupuesto/' + id; toast(`${n} partidas añadidas`); });
};
window.PlanoGeo = PlanoGeo;
render();
}
