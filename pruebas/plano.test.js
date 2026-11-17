const G = require('../plano.js');
let fallos = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✘ ') + m); if (!c) fallos++; };
const r2 = (v) => Math.round(v * 100) / 100;
const dibuja = (toques, tol = 0.35) => { const p = { pts: [], cerrado: false, escala: 1, huecos: [], alto: 2.5 };
  for (const [x, y] of toques) { const r = G.ajustarPunto(p, x, y, tol); if (!r) continue; if (r.cerrar) { p.cerrado = true; break; } p.pts.push(r.punto); } return p; };
const recta = (p) => G.segs(p).every(([a, b]) => Math.abs(a[0] - b[0]) < 1e-9 || Math.abs(a[1] - b[1]) < 1e-9);
const cerrada = (p) => p.cerrado && G.largo(p.pts[p.pts.length - 1], p.pts[0]) > 0;
const medidas = (p) => G.segs(p).map(([a, b]) => r2(G.largo(a, b)));

// 1. Rectángulo a pulso (toques imprecisos) se queda recto y cierra
let p = dibuja([[0.05, 0.1], [4.1, -0.08], [3.96, 3.12], [0.12, 2.95], [0.07, 0.04]]);
ok(p.cerrado && p.pts.length === 4, '1. Rectángulo a pulso: 4 esquinas y cerrado');
ok(recta(p), '1. Todas las paredes salen rectas');
ok(JSON.stringify(medidas(p)) === '[4,3,4,3]', '1. Medidas 4 × 3: ' + medidas(p));

// 2. Cambiar cada pared: las esquinas siguen unidas y en escuadra (el fallo que encontró Chispas)
for (let i = 0; i < 4; i++) { const q = JSON.parse(JSON.stringify(p)); G.estirar(q, i, i % 2 ? 3.1 : 4.2);
  const m = medidas(q), esperado = i % 2 ? [4, 3.1, 4, 3.1] : [4.2, 3, 4.2, 3];
  ok(recta(q) && JSON.stringify(m) === JSON.stringify(esperado), `2. Pared ${i + 1} cambiada: sigue cerrada y recta → ${m}`); }

// 3. Cambiar varias seguidas, también la pared de cierre
let q = JSON.parse(JSON.stringify(p)); G.estirar(q, 0, 4.2); G.estirar(q, 1, 3.1); G.estirar(q, 3, 2.75); G.estirar(q, 2, 5);
ok(recta(q) && JSON.stringify(medidas(q)) === '[5,2.75,5,2.75]', '3. Cuatro cambios seguidos (incluida la de cierre): ' + medidas(q));
ok(r2(G.calculos(q).suelo) === 13.75, '3. Suelo 5 × 2,75 = 13,75 m²: ' + r2(G.calculos(q).suelo));

// 4. Habitación en L
let L = dibuja([[0, 0], [5, 0], [5, 2], [3, 2], [3, 4], [0, 4], [0, 0]]);
ok(L.cerrado && L.pts.length === 6 && recta(L), '4. Habitación en L: 6 esquinas, cerrada y recta');
ok(r2(G.calculos(L).suelo) === 16, '4. Suelo de la L = 16 m²: ' + r2(G.calculos(L).suelo));
let L2 = JSON.parse(JSON.stringify(L)); G.estirar(L2, 0, 6);
ok(recta(L2) && JSON.stringify(medidas(L2)) === '[6,2,3,2,3,4]', '4. Alargar la pared larga de la L: ' + medidas(L2));
let L3 = JSON.parse(JSON.stringify(L)); G.estirar(L3, 4, 3.5);
ok(recta(L3) && r2(G.calculos(L3).suelo) === 18, '4. Cambiar la pared corta de la L: suelo ' + r2(G.calculos(L3).suelo) + ' · ' + medidas(L3));

// 5. Medidas con decimales a mano (las que no caen en la cuadrícula)
let d = JSON.parse(JSON.stringify(p)); G.estirar(d, 0, 4.37); G.estirar(d, 1, 2.93);
ok(recta(d) && JSON.stringify(medidas(d)) === '[4.37,2.93,4.37,2.93]', '5. Medidas con decimales: ' + medidas(d));
// y seguir dibujando otra habitación junto a esa esquina no-cuadrícula se pega a la esquina
const e1 = { pts: [[4.37, 0], [4.37, 2.93], [0, 2.93]], cerrado: false }; const rr = G.ajustarPunto(e1, 4.4, 0.02, 0.2);
ok(rr && rr.cerrar, '5. Un toque cerca de la primera esquina (aunque no caiga en la cuadrícula) cierra la habitación');
const e2 = { pts: [[0, 0], [4.37, 0], [4.37, 2.93]], cerrado: false }; const r3 = G.ajustarPunto(e2, 0.08, 2.9, 0.2);
ok(r3.punto && r3.punto[0] === 0 && r3.punto[1] === 2.93, '5. La esquina siguiente se alinea exacta con las anteriores (0 ; 2,93): ' + JSON.stringify(r3.punto));

// 6. Calcar foto: la primera medida fija la escala sin mover nada
let f = dibuja([[0.3, 0.3], [3.3, 0.3], [3.3, 2.3], [0.3, 2.3], [0.3, 0.3]]); const antes = JSON.stringify(f.pts);
const uni = G.largo(f.pts[0], f.pts[1]); f.escala = 4.2 / uni; f.calibrado = true;
ok(JSON.stringify(f.pts) === antes, '6. Fijar la escala de la foto no mueve el dibujo');
ok(r2(G.largo(f.pts[1], f.pts[2]) * f.escala) === 2.8, '6. Las demás paredes se miden solas con la escala: ' + r2(G.largo(f.pts[1], f.pts[2]) * f.escala) + ' m');
G.estirar(f, 1, 3.1 / f.escala);
ok(recta(f) && r2(G.largo(f.pts[1], f.pts[2]) * f.escala) === 3.1 && r2(G.largo(f.pts[3], f.pts[0]) * f.escala) === 3.1, '6. Después de la escala, cambiar otra pared sigue cuadrando');

// 7. Huecos y paredes
const h = JSON.parse(JSON.stringify(p)); h.huecos = [{ w: 0, ancho: 1.2, alto: 1.1 }, { w: 2, ancho: 0.8, alto: 2.05 }];
ok(r2(G.calculos(h).paredes) === r2(14 * 2.5 - 1.32 - 1.64), '7. Paredes descontando puerta y ventana: ' + r2(G.calculos(h).paredes));

// 8. Tocar el mismo sitio dos veces no crea esquinas repetidas
const rep = dibuja([[0, 0], [2, 0], [2.05, 0.03]]); ok(rep.pts.length === 2, '8. Doble toque en el mismo sitio no duplica esquina');
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo correcto'); process.exit(fallos ? 1 : 0);
