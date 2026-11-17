/* Chispas · planos: por medidas, en cuadrícula (punto a punto, líneas rectas) o calcando una foto de fondo.
   Calcula m² de suelo, paredes y techo y los pasa al presupuesto. Sin IA: todo en el móvil. */
'use strict';

let planoSel = null, planoModo = 'medidas', herramienta = 'pared', fotoURL = null, fotoOpacidad = 45;
const SNAP = 0.25;

function planosDe(t) { return (t.planos = t.planos || []); }
function planoActual(t) {
  const l = planosDe(t);
  if (!l.length) l.push({ id: uid(), nombre: 'Habitación 1', pts: [], cerrado: false, alto: 2.5, escala: 1, calibrado: false, huecos: [], medidas: { largo: '', ancho: '' } });
  return l.find((p) => p.id === planoSel) || l[0];
}
const segs = (p) => p.pts.map((a, i) => [a, p.pts[(i + 1) % p.pts.length], i]).slice(0, p.cerrado ? p.pts.length : Math.max(0, p.pts.length - 1));
const largo = ([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function calculos(p) {
  const e = p.escala || 1, n = p.pts.length;
  let area = 0; if (p.cerrado && n > 2) { for (let i = 0; i < n; i++) { const [x1, y1] = p.pts[i], [x2, y2] = p.pts[(i + 1) % n]; area += x1 * y2 - x2 * y1; } area = Math.abs(area) / 2 * e * e; }
  const perim = segs(p).reduce((s, sg) => s + largo(sg), 0) * e;
  const huecos = (p.huecos || []).reduce((s, h) => s + (num(h.ancho) || 0) * (num(h.alto) || 0), 0);
  const alto = num(p.alto) || 2.5;
  return { suelo: area, techo: area, perim, paredes: Math.max(0, perim * alto - huecos), huecos };
}
const m2 = (v) => (Math.round(v * 10) / 10).toLocaleString('es-ES') + ' m²';
const mts = (v) => (Math.round(v * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' m';

function svgPlano(p) {
  const e = p.escala || 1, xs = p.pts.map((q) => q[0]), ys = p.pts.map((q) => q[1]);
  const fit = p.cerrado && p.pts.length > 2, W = Math.max(fit ? 6 : 10, ...xs.map((x) => x + 1.5)), H = Math.max(fit ? 4.5 : 8, ...ys.map((y) => y + 1.5));
  let grid = '';
  for (let x = 0; x <= W; x += 0.5) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${x % 1 ? '#EEF0F3' : '#DDE1E7'}" stroke-width="0.02"/>`;
  for (let y = 0; y <= H; y += 0.5) grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${y % 1 ? '#EEF0F3' : '#DDE1E7'}" stroke-width="0.02"/>`;
  const foto = planoModo === 'foto' && fotoURL ? `<image href="${fotoURL}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" opacity="${fotoOpacidad / 100}"/>` : '';
  const paredes = segs(p).map(([a, b, i]) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, L = largo([a, b]) * e;
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#1C2430" stroke-width="0.14" stroke-linecap="square"/>
      <text x="${Math.abs(b[0] - a[0]) < Math.abs(b[1] - a[1]) ? mx + 0.22 : mx}" y="${Math.abs(b[0] - a[0]) < Math.abs(b[1] - a[1]) ? my + 0.1 : my - 0.18}" text-anchor="${Math.abs(b[0] - a[0]) < Math.abs(b[1] - a[1]) ? 'start' : 'middle'}" font-size="0.32" font-family="Barlow Condensed, sans-serif" font-weight="700" fill="#1C2430" stroke="#fff" stroke-width="0.08" paint-order="stroke">${(Math.round(L * 100) / 100).toLocaleString('es-ES')}${p.calibrado || planoModo !== 'foto' ? ' m' : ''}</text>`;
  }).join('');
  const huecos = (p.huecos || []).map((h) => { const sg = segs(p).find((s) => s[2] === h.w); if (!sg) return ''; const [a, b] = sg, L = largo([a, b]), w = Math.min(L, (num(h.ancho) || 0.8) / e);
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
    return `<line x1="${cx - ux * w / 2}" y1="${cy - uy * w / 2}" x2="${cx + ux * w / 2}" y2="${cy + uy * w / 2}" stroke="${h.tipo === 'ventana' ? '#2457C5' : '#C77A1E'}" stroke-width="0.2"/>`; }).join('');
  const puntos = p.pts.map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="${i === 0 && !p.cerrado && p.pts.length > 2 ? 0.2 : 0.11}" fill="${i === 0 && !p.cerrado && p.pts.length > 2 ? '#FFC20E' : '#fff'}" stroke="#1C2430" stroke-width="0.05"/>`).join('');
  return `<svg id="plano-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Plano" style="width:100%;height:auto;max-height:52vh;display:block;background:#fff;touch-action:manipulation;border-radius:12px">${foto}${grid}${huecos}${paredes}${puntos}</svg>`;
}

views.plano = (id) => {
  const t = trabajo(id); if (!t) return '';
  const p = planoActual(t), C = calculos(p), l = planosDe(t);
  const tab = (k, n) => `<button role="tab" aria-selected="${planoModo === k}" onclick="planoModo='${k}';render()">${n}</button>`;
  const tool = (k, n) => `<button class="btn sm ${herramienta === k ? '' : 'light'}" style="flex:1" onclick="herramienta='${k}';render()">${n}</button>`;
  let editor;
  if (planoModo === 'medidas') {
    editor = `<section class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="grid2" style="grid-template-columns:1fr 1fr 1fr">${field('largo', 'Largo (m)', p.medidas?.largo || '', 'text', 'inputmode="decimal"')}${field('ancho', 'Ancho (m)', p.medidas?.ancho || '', 'text', 'inputmode="decimal"')}${field('alto', 'Alto (m)', p.alto, 'text', 'inputmode="decimal"')}</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">${(p.huecos || []).map((h, i) => `<span class="chip">${h.tipo === 'ventana' ? 'Ventana' : 'Puerta'} ${String(h.ancho).replace('.', ',')} × ${String(h.alto).replace('.', ',')} <button style="border:0;background:none;color:var(--red);font-weight:700;margin-left:4px" aria-label="Quitar hueco" onclick="quitarHueco('${id}',${i})">×</button></span>`).join('')}
        <button class="btn sm light" onclick="nuevoHueco('${id}','puerta')">+ Puerta</button><button class="btn sm light" onclick="nuevoHueco('${id}','ventana')">+ Ventana</button></div>
      <button class="btn block" onclick="planoMedidas('${id}')">Dibujar y calcular</button></section>`;
  } else {
    editor = `${planoModo === 'foto' ? `<section class="card" style="display:flex;flex-direction:column;gap:8px">
        <label class="btn light block" style="cursor:pointer">${fotoURL ? 'Cambiar foto' : 'Hacer o elegir foto del plano'}<input type="file" accept="image/*" class="sr" onchange="cargarFoto(this.files[0])"></label>
        ${fotoURL ? `<label class="row" style="font-weight:600;font-size:14px">Foto de fondo<input type="range" min="10" max="100" value="${fotoOpacidad}" style="flex:1;accent-color:var(--primary)" oninput="fotoOpacidad=+this.value;document.querySelector('#plano-svg image')?.setAttribute('opacity',this.value/100)"></label>` : ''}
        <div class="muted">Calca encima tocando las esquinas. La foto no se guarda: solo el plano.</div></section>` : ''}
      <div id="plano-wrap">${svgPlano(p)}</div>
      <div class="row" style="gap:6px">${tool('pared', 'Pared')}${tool('puerta', 'Puerta')}${tool('ventana', 'Ventana')}${tool('medir', 'Medida')}<button class="btn sm light" onclick="deshacerPlano('${id}')" aria-label="Deshacer">↶</button></div>
      <div class="tip" style="background:var(--bg);color:var(--ink2)">${{ pared: p.cerrado ? 'Habitación cerrada. Toca «Medida» y luego una pared para poner su medida real.' : p.pts.length > 2 ? 'Toca la siguiente esquina, o el punto amarillo para cerrar la habitación.' : 'Toca cada esquina. Las líneas se ponen rectas solas y se pegan a la cuadrícula.',
        puerta: 'Toca la pared donde va la puerta.', ventana: 'Toca la pared donde va la ventana.', medir: 'Toca una pared para escribir su medida real.' + (p.calibrado ? '' : ' La primera fija la escala de todo el plano.') }[herramienta]}</div>
      <div class="grid2">${field('alto', 'Alto del techo (m)', p.alto, 'text', `inputmode="decimal" onchange="planoActual(trabajo('${id}')).alto=num(this.value)||2.5;save();render()"`)}<button class="btn danger" style="align-self:end" onclick="borrarPlano('${id}')">Empezar de nuevo</button></div>`;
  }
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><div style="flex:1"><div class="muted">${esc(nombreTrabajo(t))}</div><h1 style="font-size:26px">Plano</h1></div></header>
  <div class="pills">${l.map((x) => `<button aria-pressed="${x === p}" onclick="planoSel='${x.id}';render()">${esc(x.nombre)}</button>`).join('')}<button onclick="nuevoPlano('${id}')">+ Habitación</button><button onclick="renombrarPlano('${id}')">Renombrar</button></div>
  <div class="tabs" role="tablist">${tab('medidas', 'Medidas')}${tab('cuadricula', 'Cuadrícula')}${tab('foto', 'Calcar foto')}</div>
  ${planoModo === 'medidas' && p.pts.length ? `<div id="plano-wrap">${svgPlano(p)}</div>` : ''}
  ${editor}
  <section class="card"><div style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center">
    <div><div class="muted">Suelo</div><div class="money" style="font-size:22px">${m2(C.suelo)}</div></div><div><div class="muted">Paredes</div><div class="money" style="font-size:22px">${m2(C.paredes)}</div></div><div><div class="muted">Techo</div><div class="money" style="font-size:22px">${m2(C.techo)}</div></div></div>
    <div class="muted" style="text-align:center;margin-top:4px">Perímetro ${mts(C.perim)}${C.huecos ? ' · huecos descontados ' + m2(C.huecos) : ''}${p.cerrado || !p.pts.length ? '' : ' · cierra la habitación para calcular'}</div></section>
  <button class="btn brand block" onclick="planoAPresupuesto('${id}')" ${C.suelo || C.paredes ? '' : 'disabled'}>Pasar los m² al presupuesto</button>`;
};

// Toques sobre el plano
document.addEventListener('click', (ev) => {
  const svg = ev.target.closest?.('#plano-svg'); if (!svg) return;
  const id = location.hash.split('/')[1], t = trabajo(id); if (!t) return;
  const p = planoActual(t), pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
  const q = pt.matrixTransform(svg.getScreenCTM().inverse()), x = q.x, y = q.y;
  const cerca = () => { let best = null, bd = 0.45; segs(p).forEach(([a, b, i]) => { const L2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 || 1, k = Math.max(0, Math.min(1, ((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / L2));
    const d = Math.hypot(x - (a[0] + k * (b[0] - a[0])), y - (a[1] + k * (b[1] - a[1]))); if (d < bd) { bd = d; best = i; } }); return best; };
  if (herramienta === 'pared') {
    if (p.cerrado) return toast('La habitación ya está cerrada. Usa «Medida» o «Empezar de nuevo».');
    if (p.pts.length > 2 && Math.hypot(x - p.pts[0][0], y - p.pts[0][1]) < 0.45) { p.cerrado = true; save(); render(); return toast('Habitación cerrada'); }
    let nx = Math.round(x / SNAP) * SNAP, ny = Math.round(y / SNAP) * SNAP;
    const last = p.pts[p.pts.length - 1];
    if (last) { const dx = nx - last[0], dy = ny - last[1]; if (Math.abs(dy) < 0.2 * Math.abs(dx)) ny = last[1]; else if (Math.abs(dx) < 0.2 * Math.abs(dy)) nx = last[0]; if (nx === last[0] && ny === last[1]) return; }
    p.pts.push([nx, ny]); save(); render();
  } else {
    const i = cerca(); if (i == null) return toast('Toca justo encima de una pared');
    const sg = segs(p).find((s) => s[2] === i), L = largo(sg) * (p.escala || 1);
    if (herramienta === 'medir') {
      const v = num(prompt('Medida real de esta pared (en metros)', (Math.round(L * 100) / 100).toString().replace('.', ','))); if (!v) return;
      if (!p.calibrado) { p.escala = v / largo(sg); p.calibrado = true; toast('Escala fijada: el resto de paredes se calculan solas'); }
      else if (i < p.pts.length - 1) { const [a, b] = sg, u = largo(sg), k = v / (p.escala || 1) / u, dx = (b[0] - a[0]) * (k - 1), dy = (b[1] - a[1]) * (k - 1);
        for (let j = i + 1; j < p.pts.length; j++) { p.pts[j] = [p.pts[j][0] + dx, p.pts[j][1] + dy]; } }
      else toast('Esta es la pared de cierre: se ajusta sola al medir las demás');
    } else {
      const def = herramienta === 'ventana' ? ['1,20', '1,10'] : ['0,80', '2,05'];
      const an = num(prompt(`Ancho de la ${herramienta} (m)`, def[0])); if (!an) return; const al = num(prompt(`Alto de la ${herramienta} (m)`, def[1])) || num(def[1]);
      (p.huecos = p.huecos || []).push({ w: i, tipo: herramienta, ancho: an, alto: al });
    }
    save(); render();
  }
});

window.planoActual = planoActual;
window.planoMedidas = (id) => { const p = planoActual(trabajo(id)), L = num($('#f-largo').value), A = num($('#f-ancho').value); if (!L || !A) return toast('Pon el largo y el ancho');
  p.medidas = { largo: $('#f-largo').value, ancho: $('#f-ancho').value }; p.alto = num($('#f-alto').value) || 2.5;
  p.pts = [[1, 1], [1 + L, 1], [1 + L, 1 + A], [1, 1 + A]]; p.cerrado = true; p.escala = 1; p.calibrado = true;
  (p.huecos || []).forEach((h) => (h.w = h.tipo === 'ventana' ? 0 : 2)); save(); render(); };
window.nuevoHueco = (id, tipo) => { const p = planoActual(trabajo(id)), def = tipo === 'ventana' ? ['1,20', '1,10'] : ['0,80', '2,05'];
  const an = num(prompt(`Ancho de la ${tipo} (m)`, def[0])); if (!an) return; const al = num(prompt(`Alto de la ${tipo} (m)`, def[1])) || num(def[1]);
  (p.huecos = p.huecos || []).push({ w: tipo === 'ventana' ? 0 : 2, tipo, ancho: an, alto: al }); save(); render(); };
window.quitarHueco = (id, i) => { planoActual(trabajo(id)).huecos.splice(i, 1); save(); render(); };
window.deshacerPlano = (id) => { const p = planoActual(trabajo(id));
  if (p.cerrado) p.cerrado = false; else if ((p.huecos || []).length && p.huecos[p.huecos.length - 1].w >= p.pts.length - 2) p.huecos.pop(); else p.pts.pop();
  p.huecos = (p.huecos || []).filter((h) => h.w < Math.max(0, p.pts.length - (p.cerrado ? 0 : 1))); save(); render(); };
window.borrarPlano = (id) => { if (!confirm('¿Borrar el dibujo de esta habitación?')) return; const p = planoActual(trabajo(id)); Object.assign(p, { pts: [], cerrado: false, huecos: [], escala: 1, calibrado: false }); save(); render(); };
window.nuevoPlano = (id) => { const t = trabajo(id), n = prompt('Nombre de la habitación', 'Habitación ' + (planosDe(t).length + 1)); if (!n) return;
  const p = { id: uid(), nombre: n, pts: [], cerrado: false, alto: 2.5, escala: 1, calibrado: false, huecos: [], medidas: {} }; planosDe(t).push(p); planoSel = p.id; save(); render(); };
window.renombrarPlano = (id) => { const p = planoActual(trabajo(id)), n = prompt('Nombre de la habitación', p.nombre); if (n) { p.nombre = n; save(); render(); } };
window.cargarFoto = (f) => { if (!f) return; if (fotoURL) URL.revokeObjectURL(fotoURL); fotoURL = URL.createObjectURL(f); herramienta = 'pared'; render(); };

window.planoAPresupuesto = (id) => {
  const t = trabajo(id), p = planoActual(t), C = calculos(p);
  const m2cat = db.catalogo.filter((c) => c.unidad === 'm²');
  const opts = (def) => [['', '— Partida libre —'], ...m2cat.map((c) => [c.id, `${c.nombre}${c.precio != null ? ' · ' + eur(c.precio) : ''}`])].map(([v, n]) => `<option value="${v}" ${def && n.startsWith(def) ? 'selected' : ''}>${esc(n)}</option>`).join('');
  const fila = (k, nombre, val, def, on) => `<div class="card" style="background:var(--bg);display:flex;flex-direction:column;gap:6px"><label class="check-row"><input type="checkbox" class="chk" data-k="${k}" ${on && val ? 'checked' : ''} ${val ? '' : 'disabled'}> ${nombre} · <b>${m2(val)}</b></label><select data-s="${k}" aria-label="Partida para ${nombre}" style="min-height:42px;border:1.5px solid var(--line2);border-radius:9px;background:var(--card)">${opts(def)}</select></div>`;
  openSheet(`<h2>Pasar al presupuesto · ${esc(p.nombre)}</h2>
    ${fila('paredes', 'Paredes', C.paredes, 'Pintar paredes', true)}${fila('techo', 'Techo', C.techo, 'Pintar techos', true)}${fila('suelo', 'Suelo', C.suelo, 'Solado', false)}
    <button class="btn brand block" data-ok>Añadir al presupuesto</button>`, (s) => s.querySelector('[data-ok]').onclick = () => {
      const pr = presu(t); let n = 0;
      s.querySelectorAll('[data-k]:checked').forEach((c) => { const k = c.dataset.k, cat = db.catalogo.find((x) => x.id === s.querySelector(`[data-s="${k}"]`).value);
        pr.lineas.push({ id: uid(), concepto: (cat ? cat.nombre : { paredes: 'Paredes', techo: 'Techo', suelo: 'Suelo' }[k]) + ' · ' + p.nombre, cantidad: String(Math.round(C[k] * 100) / 100).replace('.', ','), unidad: 'm²', precio: cat?.precio ?? '', tipo: 'mano', catalogoId: cat?.id }); n++; });
      syncImporte(t); save(); closeSheet(); location.hash = '#presupuesto/' + id; toast(`${n} partidas añadidas`); });
};

render();
