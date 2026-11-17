/* Chispas · ayuda: manual de instrucciones, modo tutorial y todo lo necesario para iPhone. */
'use strict';

const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
window.esIOS = esIOS;

/* ---------- Manual ---------- */
const MANUAL = [
  ['Empezar', 'inicio', [
    'Abajo tienes cinco botones: <b>Hoy</b>, <b>Trabajos</b>, el <b>micrófono</b> amarillo, <b>Compra</b> y <b>Herramientas</b>.',
    'Arriba en Hoy, el <b>+</b> sirve para apuntar cualquier cosa y las <b>tres rayas</b> abren «Más» (cuenta, precios, clientes, ajustes y esta ayuda).',
    'En cada pantalla hay un solo botón amarillo: es lo más importante que puedes hacer ahí.',
    'Crea tu cuenta en Más › Mi cuenta para que los datos se guarden en la nube y no se pierdan si cambias de móvil.']],
  ['Hoy', 'inicio', [
    '<b>Lo siguiente</b> es tu próxima obra: «Cómo llegar» abre el mapa, «Qué me llevo» te enseña material y herramientas, y «Empezar a trabajar» pone el reloj en marcha.',
    'Cuando termines, toca <b>Parar</b>. Las horas sirven para saber cuánto te deja cada trabajo por hora.',
    '<b>Pendiente</b> junta todo lo que no debes olvidar: tareas, herramientas que están fuera, dinero por cobrar y presupuestos sin contestar.',
    'A partir de las 17:00 te pregunta cuánto material pequeño (tacos, tornillos…) has gastado, para sumarlo al presupuesto y quitarlo de lo que tienes.']],
  ['Apuntar un trabajo', 'trabajos', [
    'Toca <b>+ Nuevo</b> en Trabajos. Solo hace falta qué hay que hacer y el cliente.',
    'Si escribes un cliente que no existe, se crea solo. Su teléfono y dirección los puedes poner luego.',
    '«Más opciones» deja poner el día, los oficios, la forma de cobro, si va con factura y si lo haces con un socio.',
    'Cada trabajo tiene cuatro pestañas: <b>Resumen</b>, <b>Presupuesto</b>, <b>Material</b> y <b>Plano</b>.']],
  ['Presupuestos', 'presupuesto', [
    'En la pestaña Presupuesto añade partidas desde <b>Mis precios</b>, a mano, o desde el plano (los m² se pasan solos).',
    'Cada línea puede ser mano de obra o material. Al material se le aplica el margen que elijas para ese cliente.',
    'Si compras por paquetes (una caja de 100 tacos), marca <b>Pack</b>: pones lo que cuesta la caja y cuántas trae, y calcula el precio por unidad.',
    'Elige la forma de cobro (50/50, 40/30/30 o al terminar) y si lleva IVA.',
    'Cuando esté terminado, toca <b>Enviar PDF</b>: se abre WhatsApp (o compartir) para mandárselo al cliente.',
    'Cuando el cliente diga que sí, toca <b>El cliente lo ha aceptado</b>: el trabajo pasa a «En marcha» y salen los cobros.']],
  ['Cobros y lo que me renta', 'trabajos', [
    'En el Resumen del trabajo marca cada cobro cuando te paguen.',
    'Apunta gastos (gasolina, alquiler de furgo, material) con <b>+ Gasto</b>.',
    'En Trabajos › <b>Lo que me renta</b> ves lo cobrado del mes, los gastos, lo limpio y qué oficio te deja más dinero por hora.',
    'Si lo haces con un socio, te dice quién le debe a quién para quedar en paz a medias.']],
  ['Material y compra', 'compra', [
    'En la pestaña Material de cada trabajo, <b>Lista sugerida</b> te propone lo habitual para ese tipo de chapuza. Marca lo que haga falta y va a la lista de compra.',
    'Las listas se pueden editar: quita lo que nunca usas, añade lo tuyo o crea listas nuevas. Se quedan guardadas.',
    '<b>Compra › Por comprar</b> agrupa por tienda. Marca cada cosa cuando la compres.',
    'Lo de un presupuesto sin aceptar sale «En espera»: no lo compres todavía.',
    '<b>Compra › Lo que tengo</b> es tu almacén. Ponle un mínimo y te avisa cuando quede poco con el botón «Reponer».']],
  ['Herramientas', 'herramientas', [
    'Toca cualquier herramienta para cambiarla de sitio (coche, armario, maletín…). Tus sitios se cambian en «Mis lugares».',
    '<b>Seleccionar varias</b> sirve para mover muchas de golpe.',
    '<b>Salir de casa</b>: toca las que coges y pulsa «Me llevo». Si hay obra hoy o mañana, te marca las que suele necesitar ese oficio.',
    'Al volver, «He vuelto» las devuelve todas a su sitio de siempre.',
    'Si prestas una o se queda en una obra, sale en Pendiente y te avisa a la semana.',
    'Las baterías y cargadores tienen su apartado: toca la carga para ponerla llena, a medias o vacía.']],
  ['Plano', 'plano', [
    '<b>Medidas</b>: pones largo, ancho y alto, y calcula suelo, paredes y techo.',
    '<b>Cuadrícula</b>: toca cada esquina de la habitación, una detrás de otra. Las paredes salen rectas. Toca el punto amarillo para cerrar.',
    'Con <b>Medir</b> tocas una pared y escribes lo que mide de verdad. El plano se estira y las esquinas siguen unidas.',
    '<b>Puerta</b> y <b>Ventana</b>: toca la pared donde van; se descuentan de los m² de pared.',
    'Para acercar, pellizca con dos dedos sobre el plano o usa + y −. Arrastra con un dedo para moverte. «Ajustar» lo vuelve a encuadrar.',
    '<b>Calcar foto</b>: haz una foto a un plano, ponla de fondo medio transparente y repásala. La primera medida que pongas fija la escala.',
    '«Pasar los m² al presupuesto» crea las partidas con el precio de tu catálogo.']],
  ['Hablarle a la app', 'voz', [
    'Toca el micrófono amarillo y di, por ejemplo: «Comprar dos sacos de yeso», «El taladro está en el coche», «La radial la tiene Paco» o «Recuérdame llamar a Marta mañana a las 10».',
    'Siempre te enseña lo que ha entendido antes de guardarlo, por si hay que corregirlo.',
    'En iPhone, si el micrófono no funciona dentro de la app, se abre un cuadro de texto: toca el micrófono del teclado y dicta.']],
  ['Avisos', 'avisos', [
    'Entra con tu cuenta y en Más › Avisos toca <b>Activar avisos en este móvil</b>.',
    'Te avisa de lo que no debes olvidar, la tarde antes de cada obra y de las herramientas prestadas.',
    'Con «Enviarme un aviso de prueba» compruebas que llegan (tarda hasta 5 minutos).',
    'En Samsung: quita las restricciones de batería a Chrome y a Chispas. En iPhone: la app tiene que estar instalada en la pantalla de inicio.']],
  ['Instalar en iPhone', 'iphone', [
    'Abre <b>senamagia.github.io/chispas</b> con <b>Safari</b> (no con Chrome).',
    'Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).',
    'Baja y toca <b>Añadir a pantalla de inicio</b> › Añadir.',
    'Abre Chispas desde el icono nuevo y entra con tu cuenta.',
    'Más › Avisos › Activar avisos. Hace falta iOS 16.4 o más nuevo.']],
  ['Instalar en Android', 'android', [
    'Abre <b>senamagia.github.io/chispas</b> con <b>Chrome</b>.',
    'Toca los tres puntos › <b>Añadir a pantalla de inicio</b> (o «Instalar aplicación»).',
    'Abre Chispas desde el icono y entra con tu cuenta.']],
  ['Copia, cuenta y actualizaciones', 'menu', [
    'Con cuenta, todo se guarda solo en la nube. Sin cuenta, solo está en este móvil.',
    'Más › Copia de seguridad descarga un archivo con todo, por si acaso.',
    'Cuando haya versión nueva sale un aviso amarillo arriba: tócalo y se actualiza.']],
];
let ayudaBusca = '';
views.ayuda = (tema) => `<header class="row"><button class="back" onclick="history.back()" aria-label="Volver">${ICON.back}</button><div style="flex:1"><h1>Ayuda</h1><div class="muted">Manual de Chispas</div></div></header>
  <div class="field"><input type="search" placeholder="Buscar: presupuesto, batería, plano…" aria-label="Buscar en la ayuda" value="${esc(ayudaBusca)}" oninput="ayudaBusca=this.value;ayudaFiltrar()"></div>
  <div id="ayuda-lista">${MANUAL.map(([t, k, pasos], i) => `<details class="card" data-ayuda="${esc((t + ' ' + pasos.join(' ')).toLowerCase().replace(/<[^>]+>/g, ''))}" ${tema === k || (!tema && i === 0) ? 'open' : ''} style="margin-bottom:10px">
    <summary style="font-weight:700;font-size:18px;min-height:32px;display:flex;align-items:center;cursor:pointer">${t}</summary>
    <ol style="margin:8px 0 0;padding-left:22px;line-height:1.5;font-size:16px">${pasos.map((p) => `<li style="margin-bottom:6px">${p}</li>`).join('')}</ol></details>`).join('')}</div>
  <button class="btn light block" onclick="tutorialModo(true,true)">Volver a ver los consejos de cada pantalla</button>`;
window.ayudaFiltrar = () => { const q = ayudaBusca.trim().toLowerCase(); document.querySelectorAll('[data-ayuda]').forEach((d) => { const ok = !q || d.dataset.ayuda.includes(q); d.style.display = ok ? '' : 'none'; if (q && ok) d.open = true; }); };

/* ---------- Modo tutorial: un consejo la primera vez que entras en cada pantalla ---------- */
const CONSEJOS = {
  inicio: ['Esto es Hoy', 'Arriba sale tu próxima obra con el botón para empezar. Debajo, todo lo pendiente. El <b>+</b> apunta cosas nuevas y las tres rayas abren «Más».'],
  trabajos: ['Tus trabajos', 'Toca <b>+ Nuevo</b> para apuntar uno (solo dos datos). En «Lo que me renta» ves cuánto ganas por hora.'],
  trabajo: ['Un trabajo', 'Tiene 4 pestañas: Resumen, Presupuesto, Material y Plano. En Resumen pones el reloj en marcha y marcas los cobros.'],
  presupuesto: ['El presupuesto', 'Añade partidas, revisa el total y toca «Enviar PDF» para mandarlo por WhatsApp.'],
  preparar: ['Material del trabajo', '«Lista sugerida» propone lo habitual para esta chapuza. Lo que marques va a la lista de la compra.'],
  plano: ['El plano', 'Toca las esquinas para dibujar, el punto amarillo cierra, y con «Medir» pones lo que mide cada pared. Pellizca para acercar.'],
  compra: ['La compra', 'Marca cada cosa cuando la compres. En «Lo que tengo» llevas tu almacén y te avisa cuando quede poco.'],
  material: ['La compra', 'Marca cada cosa cuando la compres. En «Lo que tengo» llevas tu almacén y te avisa cuando quede poco.'],
  herramientas: ['Tus herramientas', 'Toca una para cambiarla de sitio. Antes de salir, usa «Salir de casa» para marcar lo que te llevas.'],
  salida: ['Salir de casa', 'Toca lo que coges y pulsa el botón de abajo. Al volver, «He vuelto» las devuelve a su sitio.'],
  menu: ['Más opciones', 'Aquí están tu cuenta, tus precios, tus clientes, los ajustes y la ayuda.'],
};
window.tutorialModo = (on, reiniciar) => { db.ajustes.tutorialOff = !on; if (reiniciar || on) db.ajustes.tutorialVisto = {}; if (reiniciar) db.ajustes.ayudaPlanoVista = false; save(); toast(on ? 'Verás un consejo en cada pantalla' : 'Consejos desactivados'); if (reiniciar) location.hash = '#inicio'; else render(); };
window.tutorialOk = (k) => { (db.ajustes.tutorialVisto = db.ajustes.tutorialVisto || {})[k] = true; save(); document.querySelector('#tutorial')?.remove(); };

function bannerIPhone() {
  if (!esIOS || instalada() || db.ajustes.iphoneVisto) return '';
  return `<section class="card" id="tutorial" style="border:2px solid var(--brand)"><div style="font-size:13px;font-weight:700;color:var(--warn)">IPHONE</div><h2 style="margin:2px 0 6px">Instala Chispas en tu iPhone</h2>
    <ol style="margin:0;padding-left:20px;line-height:1.5"><li>Toca <b>Compartir</b> (cuadrado con flecha ↑) abajo en Safari.</li><li>Toca <b>Añadir a pantalla de inicio</b>.</li><li>Abre Chispas desde el icono y entra con tu cuenta.</li></ol>
    <div class="muted" style="margin-top:6px">Así funciona a pantalla completa y te llegan los avisos.</div>
    <button class="btn light block" style="margin-top:8px" onclick="db.ajustes.iphoneVisto=true;save();this.closest('section').remove()">Entendido</button></section>`;
}
const renderBase = window.render;
window.render = function () {
  renderBase();
  const route = (location.hash.slice(1) || 'inicio').split('/')[0], v = $('#view');
  let extra = route === 'inicio' ? bannerIPhone() : '';
  const c = CONSEJOS[route];
  if (!extra && c && !db.ajustes.tutorialOff && !(db.ajustes.tutorialVisto || {})[route]) {
    const tema = { compra: 'compra', material: 'compra', salida: 'herramientas', preparar: 'compra', trabajo: 'trabajos' }[route] || route;
    extra = `<section class="card" id="tutorial" role="note" style="background:var(--warn-bg);border:0"><div class="between" style="align-items:flex-start;gap:8px"><div><div style="font-size:13px;font-weight:700;color:var(--warn)">CONSEJO</div><h2 style="margin:2px 0 4px;font-size:19px">${c[0]}</h2><div style="font-size:15px;line-height:1.4">${c[1]}</div></div></div>
      <div class="grid2" style="margin-top:10px"><a class="btn light sm" href="#ayuda/${tema}">Ver manual</a><button class="btn sm" onclick="tutorialOk('${route}')">Entendido</button></div></section>`;
  }
  if (!extra) return;
  const kids = [...v.children].slice(0, 4), ancla = kids.find((e) => e.classList.contains('tabs')) || v.querySelector('header');
  ancla ? ancla.insertAdjacentHTML('afterend', extra) : v.insertAdjacentHTML('afterbegin', extra);
};

/* ---------- iPhone ---------- */
// Pellizcar sobre el plano no debe hacer zoom a toda la pantalla en Safari
document.addEventListener('gesturestart', (e) => { if (e.target.closest?.('#plano-svg')) e.preventDefault(); }, { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 && e.target.closest?.('#plano-svg')) e.preventDefault(); }, { passive: false });

// Si el móvil no deja dictar dentro de la app (pasa en iPhone), se escribe o se dicta con el teclado
const SRx = window.SpeechRecognition || window.webkitSpeechRecognition;
window.apuntarTexto = (txt = '') => openSheet(`<h2>¿Qué quieres apuntar?</h2>
  <div class="field"><textarea id="f-dicta" placeholder="Comprar dos sacos de yeso · El taladro está en el coche · Recuérdame llamar a Marta mañana a las 10" style="min-height:110px">${esc(txt)}</textarea></div>
  <div class="muted">${esIOS ? 'Toca el micrófono del teclado 🎤 para dictar.' : 'Puedes dictar con el micrófono del teclado.'}</div>
  <button class="btn brand block" data-ok>Apuntar</button>`, (s) => { setTimeout(() => s.querySelector('#f-dicta')?.focus(), 250);
  s.querySelector('[data-ok]').onclick = () => { const t = s.querySelector('#f-dicta').value.trim(); if (!t) return; closeSheet(); interpretar(t); }; });
const micBase = $('#mic').onclick;
$('#mic').onclick = () => {
  if (!SRx || (esIOS && instalada() && db.ajustes.dictadoIOSFalla)) return apuntarTexto();
  micBase();
};
// Si el reconocimiento falla por no estar permitido en la app instalada, la próxima vez va directo al cuadro de texto
const SRProto = SRx?.prototype;
if (SRProto && esIOS) { const start = SRProto.start; SRProto.start = function () { const prev = this.onerror; this.onerror = (e) => { if (e.error === 'service-not-allowed' || e.error === 'not-allowed') { db.ajustes.dictadoIOSFalla = instalada(); save(); apuntarTexto(); } else prev?.(e); }; return start.call(this); }; }

// Avisos: instrucciones según el móvil
const vistaAvisosBase = views.avisos;
views.avisos = () => {
  let h = vistaAvisosBase();
  if (!esIOS) return h;
  const ios = `<section class="card"><h2>En tu iPhone</h2><ol style="margin:8px 0 0;padding-left:20px;line-height:1.5">
    <li>Hace falta <b>iOS 16.4</b> o más nuevo (Ajustes › General › Información).</li>
    <li>Chispas tiene que estar <b>instalada en la pantalla de inicio</b> y abierta desde su icono ${instalada() ? '✓' : '(ahora mismo no lo está: Compartir › Añadir a pantalla de inicio)'}.</li>
    <li>Toca «Activar avisos en este móvil» y acepta el permiso.</li>
    <li>Si los bloqueaste: Ajustes › Notificaciones › Chispas › Permitir.</li></ol></section>`;
  return h.replace(/<section class="card"><h2>En tu Samsung Galaxy<\/h2>[\s\S]*?<\/section>/, ios).replace('Mantén pulsado el icono de Chispas › Información de la app › Notificaciones › Permitir.', 'Ajustes del iPhone › Notificaciones › Chispas › Permitir notificaciones.');
};

render();
