/* Chispas · versión sencilla (v0.5).
   Menos pantallas y un solo botón amarillo por pantalla:
   Hoy · Trabajos (con «Lo que me renta») · Compra · Herramientas · Más.
   Cada trabajo tiene 4 pestañas: Resumen, Presupuesto, Material y Plano. */
'use strict';

const ICON2 = {
  more: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  ok: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
};
const fechaCorta = (ms) => { const d = new Date(ms); if (sameDay(ms, new Date())) return 'hoy ' + fmtTime(ms); if (sameDay(ms, new Date(today().getTime() + 864e5))) return 'mañana ' + fmtTime(ms); return fmtWhen(ms); };

/* ---------- Cabecera común de un trabajo, con sus 4 pestañas ---------- */
window.cabeceraTrabajo = (t, tab) => {
  const c = cliente(t.clienteId), tel = c?.tel ? c.tel.replace(/\s/g, '') : '';
  const pest = [['trabajo', 'Resumen'], ['presupuesto', 'Presupuesto'], ['preparar', 'Material'], ['plano', 'Plano']];
  const acc = [
    tel && `<a class="btn light sm" href="tel:${esc(tel)}">${ICON.phone}Llamar</a>`,
    tel && `<a class="btn light sm" href="https://wa.me/34${esc(tel.replace(/^\+?34/, ''))}" target="_blank" rel="noopener">${ICON.chat}WhatsApp</a>`,
    t.direccion && `<a class="btn light sm" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t.direccion)}" target="_blank" rel="noopener">${ICON.map}Llegar</a>`,
  ].filter(Boolean);
  return `<header class="row"><button class="back" onclick="history.length > 1 ? history.back() : location.hash='#trabajos'" aria-label="Volver">${ICON.back}</button>
    <div style="flex:1;min-width:0"><h1 style="font-size:24px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.titulo)}</h1><div class="muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c?.nombre || 'Sin cliente')}${t.direccion ? ' · ' + esc(t.direccion) : ''}</div></div>
    <button class="btn sm light" onclick="formTrabajo(trabajo('${t.id}'))">Editar</button></header>
  ${acc.length ? `<div style="display:grid;grid-template-columns:repeat(${acc.length},1fr);gap:6px">${acc.join('')}</div>` : ''}
  <div class="tabs" role="tablist" aria-label="Partes del trabajo">${pest.map(([r, n]) => `<button role="tab" aria-selected="${tab === r}" onclick="location.replace('#${r}/${t.id}')">${n}</button>`).join('')}</div>`;
};

/* ---------- Hoy ---------- */
views.inicio = () => {
  const now = new Date(), hoy0 = today().getTime(), f = fichando();
  const proximos = db.trabajos.filter((t) => t.cuando && t.cuando >= hoy0 && t.estado !== 'terminado' && t.estado !== 'presupuesto').sort((a, b) => a.cuando - b.cuando);
  const sig = f || proximos[0];
  const luego = proximos.filter((t) => t !== sig).slice(0, 3);
  const manana = db.trabajos.filter((t) => sameDay(t.cuando, new Date(hoy0 + 864e5)) && t.estado !== 'terminado');
  const pend = [];
  db.tareas.filter((t) => !t.hecha).sort((a, b) => (a.cuando || 9e15) - (b.cuando || 9e15)).forEach((t) => { const late = t.cuando && t.cuando < Date.now();
    pend.push(`<div class="item"><input type="checkbox" class="chk" aria-label="Hecho" onchange="hecha('${t.id}')"><div class="grow" onclick="formTarea(db.tareas.find(x=>x.id==='${t.id}'))"><div class="t">${esc(t.texto)}</div><div class="muted" ${late ? 'style="color:var(--warn);font-weight:700"' : ''}>${t.cuando ? fmtWhen(t.cuando) : ''}${t.trabajoId && trabajo(t.trabajoId) ? ' · ' + esc(trabajo(t.trabajoId).titulo) : ''}</div></div></div>`); });
  if (manana[0] && !f) pend.push(`<a class="item" href="#preparar/${manana[0].id}" style="text-decoration:none;color:inherit"><span class="chip">Mañana</span><div class="grow"><div class="t">Preparar lo de ${esc(manana[0].titulo)}</div><div class="muted">Material y herramientas</div></div></a>`);
  db.herramientas.filter(esFuera).forEach((h) => pend.push(`<button class="item" style="width:100%;background:none;border:0;text-align:left;color:inherit" onclick="moverRapido('${h.id}')"><span class="chip red">Fuera</span><div class="grow"><div class="t">Recuperar ${esc(h.nombre)}</div><div class="muted">${esc(h.detalle || h.donde)}${h.desde ? ' · hace ' + Math.max(1, Math.round((Date.now() - h.desde) / 864e5)) + ' días' : ''}</div></div></button>`));
  db.trabajos.filter((t) => t.importe && t.estado !== 'presupuesto' && t.estado !== 'en_curso' && cobradoDe(t) < t.importe - 0.01).forEach((t) => pend.push(`<a class="item" href="#trabajo/${t.id}" style="text-decoration:none;color:inherit"><span class="chip warn">Cobrar</span><div class="grow"><div class="t">${eur(t.importe - cobradoDe(t))} · ${esc(t.titulo)}</div><div class="muted">${esc(cliente(t.clienteId)?.nombre || '')}</div></div></a>`));
  db.trabajos.filter((t) => t.estado === 'presupuesto' && t.presu?.estado === 'enviado' && (t.presu.enviado || t.creado) < Date.now() - 3 * 864e5).forEach((t) => pend.push(`<a class="item" href="#trabajo/${t.id}" style="text-decoration:none;color:inherit"><span class="chip">Llamar</span><div class="grow"><div class="t">¿Qué le pareció el presupuesto? · ${esc(t.titulo)}</div><div class="muted">${esc(cliente(t.clienteId)?.nombre || '')} no ha contestado</div></div></a>`));
  const enSemana = db.trabajos.some((t) => t.cuando && t.cuando > hoy0 + 864e5 && t.cuando < hoy0 + 8 * 864e5 && t.estado !== 'presupuesto');
  const libres = ['Hacer inventario del material', 'Ordenar herramientas', 'Preparar maletines y mochila'].filter((x) => !db.tareas.some((t) => !t.hecha && t.texto === x));
  return `<header class="top">
    <div class="top-left"><button class="logo-btn" onclick="location.hash='#menu'" aria-label="Más opciones">${chispasIcon(46)}</button>
      <div><div class="muted">${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1 style="font-size:28px;white-space:nowrap">Hoy</h1></div></div>
    <div class="row" style="gap:6px"><button class="icon-btn" onclick="nuevo()" aria-label="Apuntar algo nuevo" style="font-size:28px;font-weight:700;line-height:1">+</button><button class="icon-btn" onclick="location.hash='#menu'" aria-label="Más">${ICON2.more}</button></div>
  </header>
  ${sig ? `<section class="card" style="border:2px solid ${f ? 'var(--ok)' : 'var(--brand)'};display:flex;flex-direction:column;gap:10px">
      <div style="font-size:13px;font-weight:700;color:${f ? 'var(--ok)' : 'var(--warn)'}">${f ? 'TRABAJANDO AHORA' : 'LO SIGUIENTE · ' + esc(fechaCorta(sig.cuando)).toUpperCase()}</div>
      <a href="#trabajo/${sig.id}" style="text-decoration:none;color:inherit"><div style="font-size:22px;font-weight:700;line-height:1.15">${esc(sig.titulo)}</div><div class="muted">${esc(cliente(sig.clienteId)?.nombre || '')}${sig.direccion ? ' · ' + esc(sig.direccion) : ''}</div></a>
      ${f ? `<div class="cond" style="font-size:30px;font-weight:700" data-live="${f.id}">${fmtHoras(horasDe(f))}</div>` : ''}
      <div class="grid2">${sig.direccion ? `<a class="btn light" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sig.direccion)}" target="_blank" rel="noopener">${ICON.map}Cómo llegar</a>` : `<a class="btn light" href="#trabajo/${sig.id}">Ver trabajo</a>`}<a class="btn light" href="#preparar/${sig.id}">Qué me llevo</a></div>
      <button class="btn ${f ? '' : 'brand'} block" style="min-height:56px;font-size:18px" onclick="fichar('${sig.id}')">${f ? 'Parar' : 'Empezar a trabajar'}</button>
    </section>` : `<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2>No tienes obras apuntadas</h2><div class="muted">Cuando apuntes un trabajo con su día, saldrá aquí con todo lo que necesitas.</div><button class="btn brand block" onclick="nuevoTrabajo()">Apuntar un trabajo</button></section>`}
  ${luego.length ? `<section class="card"><h2 style="margin-bottom:4px">Después</h2><div class="list">${luego.map((t) => `<a class="item" href="#trabajo/${t.id}" style="text-decoration:none;color:inherit"><div class="cond" style="font-size:16px;font-weight:700;width:92px">${esc(fechaCorta(t.cuando))}</div><div class="grow"><div class="t">${esc(t.titulo)}</div><div class="muted">${esc(cliente(t.clienteId)?.nombre || '')}</div></div></a>`).join('')}</div></section>` : ''}
  <section class="card"><div class="between" style="margin-bottom:4px"><h2>Pendiente</h2>${pend.length ? `<span class="badge">${pend.length}</span>` : ''}</div>
    <div class="list">${pend.join('') || '<div class="empty">Nada pendiente. Toca <b>+</b> o el micrófono para apuntar algo.</div>'}</div></section>
  ${!enSemana && libres.length ? `<section class="card"><div style="font-size:13px;font-weight:700;color:var(--warn)">SEMANA QUE VIENE LIBRE</div><div class="muted" style="margin:2px 0 8px">Buen momento para:</div>
    <div class="row" style="flex-wrap:wrap;gap:6px">${libres.map((x) => `<button class="btn sm light" onclick="sugerencia(this.dataset.t)" data-t="${esc(x)}">+ ${esc(x)}</button>`).join('')}</div></section>` : ''}`;
};

/* ---------- Trabajos (y lo que me renta) ---------- */
let vistaTrab = 'lista', filtroT = 'marcha';
const vistaCuentas = views.cuentas;
views.cuentas = () => { vistaTrab = 'renta'; return views.trabajos(); };
views.trabajos = () => {
  const cab = `<header class="top"><h1>Trabajos</h1><button class="btn" onclick="nuevoTrabajo()" style="padding:0 14px">${ICON.plus.replace('<svg', '<svg style="stroke:var(--brand)"')}Nuevo</button></header>
  <div class="tabs" role="tablist">${[['lista', 'Trabajos'], ['renta', 'Lo que me renta']].map(([k, n]) => `<button role="tab" aria-selected="${vistaTrab === k}" onclick="vistaTrab='${k}';render()">${n}</button>`).join('')}</div>`;
  if (vistaTrab === 'renta') { const h = vistaCuentas(); return cab + h.slice(h.indexOf('</header>') + 9); }
  const F = { marcha: (t) => t.estado === 'en_curso' || t.estado === 'por_cobrar', presupuestos: (t) => t.estado === 'presupuesto', hechos: (t) => t.estado === 'terminado' };
  const list = db.trabajos.filter(F[filtroT]).sort((a, b) => (filtroT === 'hechos' ? -1 : 1) * ((a.cuando || a.creado) - (b.cuando || b.creado)));
  return `${cab}
  <div class="pills" role="tablist">${[['marcha', 'En marcha'], ['presupuestos', 'Presupuestos'], ['hechos', 'Hechos']].map(([k, n]) => `<button aria-pressed="${filtroT === k}" onclick="filtroT='${k}';render()">${n} · ${db.trabajos.filter(F[k]).length}</button>`).join('')}</div>
  ${list.map((t) => { const debe = (t.importe || 0) - cobradoDe(t);
    const linea = t.estado === 'presupuesto' ? (t.presu?.estado === 'enviado' ? 'Presupuesto enviado' : 'Presupuesto sin enviar') + (t.importe ? ' · ' + eur(t.importe) : '') : t.importe ? (debe > 0.01 ? `Te debe ${eur(debe)}` : 'Cobrado ' + eur(t.importe)) : 'Sin precio';
    return `<a class="card" href="#trabajo/${t.id}" style="text-decoration:none;color:inherit;display:block"><div class="between"><div style="min-width:0"><div style="font-weight:700;font-size:17px">${esc(t.titulo)}</div><div class="muted">${esc(cliente(t.clienteId)?.nombre || 'Sin cliente')}${t.socio ? ' · con ' + esc(t.socio) : ''}</div></div>${t.cuando && t.estado !== 'terminado' ? `<span class="chip">${esc(fechaCorta(t.cuando))}</span>` : ''}</div>
    <div style="font-size:15px;margin-top:6px;${debe > 0.01 && t.estado === 'por_cobrar' ? 'color:var(--warn);font-weight:700' : ''}">${linea}</div></a>`; }).join('') || `<div class="card empty">${{ marcha: 'Ningún trabajo en marcha.', presupuestos: 'No hay presupuestos pendientes.', hechos: 'Todavía no has terminado ningún trabajo.' }[filtroT]}</div>`}`;
};

/* ---------- Trabajo nuevo: dos campos ---------- */
const formTrabajoCompleto = formTrabajo;
window.formTrabajo = (t) => (t && (t.id || t.titulo || t.clienteId) ? formTrabajoCompleto(t) : nuevoTrabajo());
window.nuevoTrabajo = () => {
  openSheet(`<h2>Trabajo nuevo</h2>
    ${field('titulo', '¿Qué hay que hacer?', '', 'text', 'placeholder="Cambiar el grifo de la cocina" autocomplete="off"')}
    ${field('cliente', 'Cliente', '', 'text', 'list="lista-clientes" placeholder="Nombre del cliente" autocomplete="off"')}
    <datalist id="lista-clientes">${db.clientes.map((c) => `<option value="${esc(c.nombre)}">`).join('')}</datalist>
    <div class="grid2"><button class="btn light" data-mas>Más opciones</button><button class="btn brand" data-ok>Guardar</button></div>
    <div class="muted" style="text-align:center">El día, el precio y lo demás lo puedes poner luego.</div>`, (s) => {
    setTimeout(() => s.querySelector('#f-titulo')?.focus(), 250);
    const leer = () => { const titulo = s.querySelector('#f-titulo').value.trim(), nombre = s.querySelector('#f-cliente').value.trim();
      let c = nombre ? db.clientes.find((x) => x.nombre.toLowerCase() === nombre.toLowerCase()) : null;
      if (nombre && !c) { c = { id: uid(), nombre, tel: '', dir: '' }; db.clientes.push(c); }
      return { titulo, clienteId: c?.id || '', direccion: c?.dir || '' }; };
    s.querySelector('[data-mas]').onclick = () => formTrabajoCompleto(leer());
    s.querySelector('[data-ok]').onclick = () => {
      const d = leer(); if (!d.titulo) return s.querySelector('#f-titulo').focus();
      const t = { id: uid(), creado: Date.now(), horas: [], gastos: [], pagos: [], fotos: [], titulo: d.titulo, clienteId: d.clienteId || null, direccion: d.direccion, importe: null, plan: '50/50', estado: 'presupuesto', cuando: null, factura: false, socio: null, oficios: [] };
      db.trabajos.push(t); save(); closeSheet(); location.hash = '#trabajo/' + t.id; toast('Trabajo apuntado');
    };
  });
};

/* ---------- Ficha del trabajo · Resumen ---------- */
views.trabajo = (id) => {
  const t = trabajo(id); if (!t) return '<div class="card empty">Este trabajo ya no existe.</div>';
  const r = rentabilidad(t), f = (t.horas || []).find((h) => !h.fin), cobrado = cobradoDe(t);
  const pasos = { presupuesto: 'Presupuesto', en_curso: 'En marcha', por_cobrar: 'Por cobrar', terminado: 'Terminado' };
  return `${cabeceraTrabajo(t, 'trabajo')}
  <div class="row" style="flex-wrap:wrap;gap:6px"><span class="chip ${t.estado === 'en_curso' ? 'ink' : t.estado === 'por_cobrar' ? 'warn' : t.estado === 'terminado' ? 'ok' : ''}">${pasos[t.estado]}</span>${t.cuando ? `<span class="chip">${esc(fechaCorta(t.cuando))}</span>` : ''}${(t.oficios || []).map((o) => `<span class="chip">${o}</span>`).join('')}${t.socio ? `<span class="chip">Con ${esc(t.socio)}</span>` : ''}</div>
  ${t.estado === 'presupuesto' ? `<section class="card" style="display:flex;flex-direction:column;gap:8px"><h2>Siguiente paso</h2><div class="muted">${t.presu?.lineas?.length ? 'Termina el presupuesto y mándalo por WhatsApp. Cuando el cliente diga que sí, márcalo como aceptado.' : 'Haz el presupuesto: partidas de tu catálogo, material y, si hace falta, el plano con los m².'}</div>
      <button class="btn brand block" onclick="location.replace('#presupuesto/${t.id}')">${t.presu?.lineas?.length ? 'Ir al presupuesto' : 'Hacer presupuesto'}</button></section>`
    : t.estado !== 'terminado' ? `<section class="timer"><span class="dot" style="${f ? '' : 'background:var(--ink2)'}"></span><div style="flex:1"><div class="muted" style="font-weight:700;${f ? 'color:var(--ok)' : ''}">${f ? 'Trabajando ahora' : 'Horas en este trabajo'}</div><div class="n" data-live="${f ? t.id : ''}">${fmtHoras(r.horas)}</div></div><button class="btn ${f ? '' : 'brand'}" onclick="fichar('${t.id}')">${f ? 'Parar' : 'Empezar'}</button></section>` : ''}
  ${t.importe && t.estado !== 'presupuesto' ? `<section class="card"><div class="between"><h2>Cobros</h2><span class="muted">${esc(t.plan)}</span></div>
    <div class="bar-track" style="margin:10px 0">${t.pagos.map((p) => `<span style="flex:${p.pct};background:${p.cobrado ? 'var(--ok)' : 'var(--line2)'}"></span>`).join('')}</div>
    <div class="list">${t.pagos.map((p) => `<label class="item" style="align-items:center"><input type="checkbox" class="chk" ${p.cobrado ? 'checked' : ''} onchange="cobro('${t.id}','${p.id}',this.checked)"><span class="grow">${esc(p.nombre)} · ${p.pct} %</span><b style="color:${p.cobrado ? 'var(--ok)' : 'var(--ink)'}">${eur(p.importe)}</b></label>`).join('')}</div>
    <div class="muted" style="margin-top:4px">Cobrado ${eur(cobrado)} de ${eur(t.importe)}</div></section>` : ''}
  ${t.estado !== 'presupuesto' ? `<section class="card"><div class="between"><h2>¿Cuánto te deja?</h2><button class="btn sm light" onclick="formGasto(trabajo('${t.id}'))">+ Gasto</button></div>
    <div style="display:grid;grid-template-columns:1fr auto;gap:6px 12px;font-size:15px;margin-top:8px"><span class="muted">Precio</span><b>${eur(t.importe)}</b><span class="muted">Gastos</span><b>− ${eur(gastosDe(t))}</b><span class="muted">Horas</span><b>${fmtHoras(r.horas)}</b></div>
    <div class="between" style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px"><b>${t.socio ? 'Te sale a (tu mitad)' : 'Te sale a'}</b><span class="money" style="font-size:30px;color:${r.porHora == null ? 'var(--ink2)' : r.porHora < 30 ? 'var(--warn)' : 'var(--ok)'}">${r.porHora == null ? '—' : eur(t.socio ? r.porHora / 2 : r.porHora) + '/h'}</span></div>
    ${(t.gastos || []).length ? `<div class="list" style="margin-top:6px">${t.gastos.map((g) => `<div class="item"><span class="grow">${esc(g.concepto)} <span class="muted">· ${esc(g.tipo)}${t.socio ? ' · pagó ' + esc(g.pagador) : ''}</span></span><b>${eur(g.importe)}</b></div>`).join('')}</div>` : ''}
    ${t.socio ? socioResumen(t) : ''}</section>` : ''}
  <section class="card"><h2>Notas</h2><textarea aria-label="Notas del trabajo" style="width:100%;min-height:90px;border:1.5px solid var(--line2);border-radius:10px;padding:10px;background:var(--card);margin-top:8px" onchange="trabajo('${t.id}').notas=this.value;save()" placeholder="Medidas, el modelo de grifo que eligió, código del portal…">${esc(t.notas || '')}</textarea></section>`;
};

/* ---------- Ficha · Presupuesto (misma hoja editable, con la cabecera común) ---------- */
const vistaPresuAnterior = views.presupuesto;
views.presupuesto = (id) => {
  const html = vistaPresuAnterior(id), t = trabajo(id); if (!t) return html;
  const p = presu(t), chipE = p.estado === 'aceptado' ? 'ok' : p.estado === 'enviado' ? 'warn' : '';
  return cabeceraTrabajo(t, 'presupuesto') + `<div class="muted">Presupuesto n.º ${p.numero} · <span class="chip ${chipE}">${ESTADOS_P[p.estado]}</span></div>` + html.slice(html.indexOf('</header>') + 9);
};

/* ---------- Ficha · Material (lo que hay que comprar y llevar) ---------- */
views.preparar = (id) => {
  const t = trabajo(id); if (!t) return '';
  const ofs = t.oficios || [], mat = db.material.filter((m) => m.trabajoId === t.id);
  const herr = db.herramientas.filter((h) => !esBat(h) && ofs.length && (h.oficios || []).some((o) => ofs.includes(o)));
  const tag = (h) => esFuera(h) ? `<span class="chip red">${esc(h.detalle || h.donde)}</span>` : `<span class="chip">${esc(h.donde)}</span>`;
  return `${cabeceraTrabajo(t, 'preparar')}
  <section class="card"><div class="between"><h2>Material</h2><span class="muted">${mat.filter((m) => !m.comprado).length} por comprar</span></div>
    <div class="list">${mat.map((m) => `<div class="item" style="align-items:center"><input type="checkbox" class="chk" aria-label="Comprado" ${m.comprado ? 'checked' : ''} onchange="matComprado('${m.id}',this.checked)"><div class="grow" onclick="formMaterial(db.material.find(x=>x.id==='${m.id}'))"><div class="t" ${m.comprado ? 'style="text-decoration:line-through;color:var(--ink2)"' : ''}>${esc(m.nombre)} <span class="muted">${esc(m.cantidad || '')}</span></div><div class="muted">${m.comprado ? 'Comprado' : t.estado === 'presupuesto' ? 'En espera: aún no está aceptado' : esc(m.tienda || 'Comprar')}</div></div></div>`).join('') || '<div class="empty">Sin material apuntado. Toca «Lista sugerida» y marca lo que haga falta.</div>'}</div>
    <div class="grid2" style="margin-top:8px"><button class="btn brand" onclick="checklistMaterial('${t.id}')">Lista sugerida</button><button class="btn light" onclick="formMaterial({trabajoId:'${t.id}'})">+ Otra cosa</button></div></section>
  <section class="card"><div class="between"><h2>Herramientas</h2>${ofs.length ? `<span class="muted">${esc(ofs.join(', '))}</span>` : ''}</div>
    ${herr.length ? `<div class="list">${herr.map((h) => `<div class="item" style="align-items:center"><span class="grow t">${esc(h.nombre)}</span>${tag(h)}</div>`).join('')}</div>` : `<div class="empty">${ofs.length ? 'No tienes herramientas apuntadas para ' + esc(ofs.join(', ')) + '.' : 'Edita el trabajo y marca sus oficios: aquí saldrán las herramientas que te hacen falta.'}</div>`}
    <a class="btn block" href="#salida" style="margin-top:8px">Salir de casa: ¿qué me llevo?</a></section>`;
};
window.matComprado = (id, v) => { const m = db.material.find((x) => x.id === id); m.comprado = v; m.compradoEn = v ? Date.now() : null; save(); render(); };

/* ---------- Compra ---------- */
views.compra = () => views.material();

/* ---------- Más ---------- */
views.menu = () => {
  const fila = ([h, t, s]) => `<a class="item" href="${h}" style="text-decoration:none;color:inherit;align-items:center;min-height:56px"><div class="grow"><div class="t">${t}</div>${s ? `<div class="muted">${esc(s)}</div>` : ''}</div><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></a>`;
  const faltan = db.catalogo.filter((c) => c.precio == null).length;
  return `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button>${chispasIcon(48)}<div><div style="font-family:Fredoka,sans-serif;font-size:30px;font-weight:700;line-height:1">Chispas</div><div class="muted">Más opciones</div></div></header>
  <section class="card list">${[['#ayuda', 'Ayuda y manual', 'Cómo se hace cada cosa, paso a paso']].map(fila).join('')}
    <label class="item" style="align-items:center;min-height:56px"><div class="grow"><div class="t">Modo tutorial</div><div class="muted">Consejos al entrar en cada pantalla</div></div><input type="checkbox" class="chk" ${db.ajustes.tutorialOff ? '' : 'checked'} onchange="tutorialModo(this.checked)" aria-label="Modo tutorial"></label></section>
  <h2 style="margin:4px 4px 0;font-size:17px">Lo tuyo</h2>
  <section class="card list">${[['#cuenta', 'Mi cuenta', window.cloud?.user ? cloud.user.email : 'Sin cuenta: los datos solo están en este móvil'], ['#catalogo', 'Mis precios', faltan ? `Te faltan ${faltan} por poner` : 'Completo'],
    ['javascript:formNegocio()', 'Mis datos para presupuestos', db.ajustes.negocio?.nombre || 'Nombre y teléfono del PDF'], ['#clientes', 'Mis clientes', `${db.clientes.length} guardados`]].map(fila).join('')}</section>
  <h2 style="margin:4px 4px 0;font-size:17px">Ajustes</h2>
  <section class="card list">${[['#copia', 'Copia de seguridad', db.ajustes.ultimaCopia ? 'Última: ' + fmtWhen(db.ajustes.ultimaCopia) : 'Todavía no has hecho ninguna'], ['#avisos', 'Avisos en el móvil', ''],
    ['#apariencia', 'Apariencia', { auto: 'Automático', claro: 'Claro', oscuro: 'Oscuro' }[db.ajustes.tema]], ['#voz', 'Voz', 'Qué le puedes decir'], ['javascript:actualizar()', 'Buscar actualización', 'Tienes la versión ' + VERSION]].map(fila).join('')}</section>
  <div class="muted" style="text-align:center">Chispas v${VERSION}</div>`;
};

/* ---------- «+»: lo justo ---------- */
window.nuevo = () => openSheet(`<h2>¿Qué quieres apuntar?</h2>
  <div style="display:flex;flex-direction:column;gap:8px">
    <button class="btn brand block" data-n="trabajo">Un trabajo o presupuesto</button>
    <button class="btn light block" data-n="tarea">Algo que no se me olvide</button>
    <button class="btn light block" data-n="material">Material que comprar</button>
    <button class="btn light block" data-n="herramienta">Una herramienta</button>
  </div><div class="muted" style="text-align:center">También puedes tocar el micrófono y decirlo.</div>`,
  (s) => s.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => ({ tarea: () => formTarea(), trabajo: nuevoTrabajo, material: () => formMaterial(), herramienta: () => formHerramienta() })[b.dataset.n]())));

render();
