/**
 * CHISPAS · Hoja de avisos
 * Va en una hoja de Google de la cuenta de Chispas (Extensiones › Apps Script).
 *  - Cada 5 minutos envía al móvil los avisos que tocan, a todas las personas que usan la app.
 *  - Cada noche copia en esta hoja los datos de Chispas (solo los suyos): trabajos, cobros, gastos y material.
 * Instalación: pega este código, ejecuta «instalar» una vez y acepta los permisos.
 */
const PROYECTO = 'chispas-25f9c';
const ENLACE_APP = 'https://senamagia.github.io/chispas/';

/* ---------- Instalación ---------- */
function instalar() {
  SpreadsheetApp.getActive().setSpreadsheetTimeZone('Europe/Madrid');
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('enviarAvisos').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('copiarDatos').timeBased().everyDays(1).atHour(23).create();
  enviarAvisos();
  copiarDatos();
  SpreadsheetApp.getActive().toast('Listo: los avisos se envían cada 5 minutos y tus datos se copian cada noche.', 'Chispas', 10);
}

/* ---------- Avisos ---------- */
function enviarAvisos() {
  const pendientes = consulta_('avisos', { fieldFilter: { field: { fieldPath: 'when' }, op: 'LESS_THAN_OR_EQUAL', value: { integerValue: String(Date.now()) } } });
  const tokensPorUsuario = {};
  let enviados = 0;
  pendientes.forEach((doc) => {
    const a = campos_(doc.fields);
    const caducado = Date.now() - a.when > 6 * 3600e3; // si el servidor estuvo parado, no mandes avisos de hace horas
    if (!caducado) {
      const tokens = tokensPorUsuario[a.uid] || (tokensPorUsuario[a.uid] = consulta_('tokens', { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: a.uid } } }).map((d) => d.name.split('/').pop()));
      tokens.forEach((token) => { if (enviarPush_(token, a)) enviados++; });
    }
    borrar_(doc.name); // enviado (o caducado): se quita de la cola
  });
  if (enviados) registrar_('Avisos enviados', enviados);
}

function enviarPush_(token, a) {
  const res = UrlFetchApp.fetch(`https://fcm.googleapis.com/v1/projects/${PROYECTO}/messages:send`, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: cabeceras_(),
    payload: JSON.stringify({ message: { token, webpush: {
      notification: { title: a.title, body: a.body, icon: ENLACE_APP + 'icons/icon-192.png', badge: ENLACE_APP + 'icons/badge-96.png', tag: a.title },
      fcm_options: { link: ENLACE_APP + (a.link || '#inicio') } } } }),
  });
  const code = res.getResponseCode();
  if (code === 404 || (code === 400 && /UNREGISTERED|INVALID_ARGUMENT/.test(res.getContentText()))) borrar_(`projects/${PROYECTO}/databases/(default)/documents/tokens/${token}`); // ese móvil ya no existe
  else if (code !== 200) console.warn('FCM', code, res.getContentText());
  return code === 200;
}

/* ---------- Copia de los datos de Chispas en la hoja ---------- */
function copiarDatos() {
  const email = Session.getEffectiveUser().getEmail();
  const docs = consulta_('users', { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } });
  if (!docs.length) { registrar_('Copia de datos', 'Todavía no hay cuenta en la app con ' + email); return; }
  const db = JSON.parse(campos_(docs[0].fields).data);
  const cli = (id) => (db.clientes.find((c) => c.id === id) || {}).nombre || '';
  const fecha = (ms) => (ms ? new Date(ms) : '');
  const horas = (t) => (t.horas || []).reduce((s, h) => s + ((h.fin || Date.now()) - h.inicio), 0) / 36e5;
  const gastos = (t) => (t.gastos || []).reduce((s, g) => s + g.importe, 0);
  const estados = { presupuesto: 'Presupuesto', en_curso: 'En curso', por_cobrar: 'Por cobrar', terminado: 'Terminado' };

  hoja_('Trabajos', ['Trabajo', 'Cliente', 'Oficios', 'Estado', 'Precio', 'Cobrado', 'Gastos', 'Horas', '€/hora', 'Socio', 'Con factura', 'Próximo día'],
    db.trabajos.map((t) => { const cobrado = (t.pagos || []).filter((p) => p.cobrado).reduce((s, p) => s + p.importe, 0), h = horas(t);
      return [t.titulo, cli(t.clienteId), (t.oficios || []).join(', '), estados[t.estado] || t.estado, t.importe || 0, cobrado, gastos(t), Math.round(h * 10) / 10, h > 0.25 ? Math.round(((t.importe || 0) - gastos(t)) / h) : '', t.socio || '', t.factura ? 'Sí' : 'No', fecha(t.cuando)]; }));
  hoja_('Cobros', ['Fecha', 'Trabajo', 'Cliente', 'Pago', 'Importe', 'Cobrado'],
    db.trabajos.flatMap((t) => (t.pagos || []).map((p) => [fecha(p.fecha), t.titulo, cli(t.clienteId), `${p.nombre} (${p.pct} %)`, p.importe, p.cobrado ? 'Sí' : 'No'])));
  hoja_('Gastos', ['Fecha', 'Trabajo', 'Concepto', 'Tipo', 'Importe', 'Pagó'],
    db.trabajos.flatMap((t) => (t.gastos || []).map((g) => [fecha(g.fecha), t.titulo, g.concepto, g.tipo, g.importe, g.pagador || 'Yo'])));
  hoja_('Material', ['Material', 'Cantidad', 'Tienda', 'Para', 'Precio', 'Comprado'],
    db.material.map((m) => [m.nombre, m.cantidad || '', m.tienda, m.trabajoId ? (db.trabajos.find((t) => t.id === m.trabajoId) || {}).titulo || '' : 'Reponer', m.precio || '', m.comprado ? 'Sí' : 'No']));
  hoja_('Clientes', ['Nombre', 'Teléfono', 'Dirección'], db.clientes.map((c) => [c.nombre, c.tel || '', c.dir || '']));
  registrar_('Copia de datos', 'OK');
}

/* ---------- Utilidades ---------- */
function cabeceras_() { return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROYECTO }; }
function consulta_(coleccion, where) {
  const res = UrlFetchApp.fetch(`https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents:runQuery`, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: cabeceras_(),
    payload: JSON.stringify({ structuredQuery: { from: [{ collectionId: coleccion }], where, limit: 500 } }),
  });
  if (res.getResponseCode() !== 200) throw new Error('Firestore ' + res.getResponseCode() + ': ' + res.getContentText());
  return JSON.parse(res.getContentText()).filter((r) => r.document).map((r) => r.document);
}
function borrar_(name) { UrlFetchApp.fetch('https://firestore.googleapis.com/v1/' + name, { method: 'delete', muteHttpExceptions: true, headers: cabeceras_() }); }
function campos_(f) {
  const v = (x) => ('stringValue' in x ? x.stringValue : 'integerValue' in x ? Number(x.integerValue) : 'doubleValue' in x ? x.doubleValue : 'booleanValue' in x ? x.booleanValue : null);
  return Object.fromEntries(Object.entries(f || {}).map(([k, x]) => [k, v(x)]));
}
function hoja_(nombre, cabecera, filas) {
  const ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  sh.clearContents();
  sh.getRange(1, 1, 1, cabecera.length).setValues([cabecera]).setFontWeight('bold').setBackground('#231A4F').setFontColor('#FFF8E7');
  if (filas.length) sh.getRange(2, 1, filas.length, cabecera.length).setValues(filas);
  sh.setFrozenRows(1);
}
function registrar_(que, valor) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Registro') || SpreadsheetApp.getActive().insertSheet('Registro');
  if (sh.getLastRow() === 0) sh.appendRow(['Fecha', 'Qué', 'Resultado']);
  sh.appendRow([new Date(), que, valor]);
  if (sh.getLastRow() > 500) sh.deleteRows(2, 100);
}
