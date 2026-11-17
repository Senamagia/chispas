/* Chispas · material habitual por tipo de chapuza.
   Lista de partida hecha a partir del material más común en cada trabajo. Lo que Chispas añade
   a mano se guarda en su lista (db.plantillas) y le sale la próxima vez. */
'use strict';

const TIPOS_CHAPUZA = [
  // Electricidad
  { id: 'luz', oficio: 'Electricidad', nombre: 'Punto de luz nuevo', items: ['Cable 1,5 mm² (marrón, azul, amarillo-verde)', 'Tubo corrugado 16 mm', 'Caja de empotrar universal', 'Caja de registro', 'Interruptor o conmutador', 'Marco embellecedor', 'Portalámparas o regleta', 'Bornas de conexión (Wago)', 'Yeso para tapar rozas', 'Tacos y tornillos'] },
  { id: 'enchufe', oficio: 'Electricidad', nombre: 'Enchufe nuevo', items: ['Cable 2,5 mm² (marrón, azul, amarillo-verde)', 'Tubo corrugado 20 mm', 'Caja de empotrar universal', 'Base de enchufe schuko', 'Marco embellecedor', 'Bornas de conexión (Wago)', 'Yeso para tapar rozas'] },
  { id: 'mecanismos', oficio: 'Electricidad', nombre: 'Cambio de mecanismos', items: ['Interruptores', 'Bases de enchufe', 'Marcos', 'Garras para caja', 'Bornas de conexión (Wago)'] },
  { id: 'lampara', oficio: 'Electricidad', nombre: 'Instalar lámpara o plafón', items: ['Regleta de conexión', 'Bornas de conexión (Wago)', 'Gancho de techo', 'Tacos y tornillos', 'Bombillas LED'] },
  { id: 'linea', oficio: 'Electricidad', nombre: 'Línea nueva (horno, placa)', items: ['Cable 6 mm²', 'Tubo corrugado 25 mm', 'Magnetotérmico 25 A', 'Caja de conexión o base 25 A', 'Bridas', 'Yeso para tapar rozas'] },
  { id: 'cuadro', oficio: 'Electricidad', nombre: 'Cambio de cuadro eléctrico', items: ['Caja de cuadro (módulos)', 'Interruptor general (IGA)', 'Diferencial 40 A 30 mA', 'Magnetotérmicos 10, 16, 20 y 25 A', 'Peine de conexión', 'Regleta de tierra', 'Terminales punta hueca', 'Etiquetas de circuitos'] },
  // Fontanería
  { id: 'grifo', oficio: 'Fontanería', nombre: 'Cambio de grifo', items: ['Grifo', 'Latiguillos flexibles', 'Llaves de escuadra', 'Cinta de teflón', 'Juntas de fibra', 'Silicona sanitaria'] },
  { id: 'cisterna', oficio: 'Fontanería', nombre: 'Cisterna o mecanismo', items: ['Mecanismo de descarga', 'Grifo de llenado (flotador)', 'Latiguillo', 'Llave de escuadra', 'Juntas de cisterna', 'Tornillos de cisterna'] },
  { id: 'desatasco', oficio: 'Fontanería', nombre: 'Desatasco', items: ['Desatascador químico', 'Sifón de botella', 'Juntas de sifón', 'Tubo PVC 40', 'Cola PVC'] },
  { id: 'termo', oficio: 'Fontanería', nombre: 'Cambio de termo', items: ['Termo eléctrico', 'Válvula de seguridad', 'Latiguillos de termo', 'Manguitos dieléctricos', 'Tacos de alta carga', 'Cinta de teflón', 'Tubo de desagüe para la válvula'] },
  { id: 'toma', oficio: 'Fontanería', nombre: 'Toma de agua nueva', items: ['Tubo multicapa 16', 'Codos y tes multicapa', 'Llave de paso', 'Abrazaderas', 'Sellador de roscas', 'Yeso para tapar rozas'] },
  { id: 'sellado', oficio: 'Fontanería', nombre: 'Sellar bañera o ducha', items: ['Silicona sanitaria antimoho', 'Quitasiliconas', 'Cinta de carrocero', 'Alcohol para limpiar'] },
  // Albañilería
  { id: 'alicatado', oficio: 'Albañilería', nombre: 'Alicatado', items: ['Azulejo (+10 % por cortes)', 'Cemento cola', 'Crucetas o niveladores', 'Junta (borada)', 'Perfil de esquina', 'Imprimación'] },
  { id: 'solado', oficio: 'Albañilería', nombre: 'Solado', items: ['Baldosa (+10 % por cortes)', 'Cemento cola flexible', 'Niveladores', 'Junta (borada)', 'Rodapié', 'Autonivelante'] },
  { id: 'rozas', oficio: 'Albañilería', nombre: 'Tapar rozas o reparar pared', items: ['Yeso', 'Escayola', 'Malla de fibra', 'Pasta de reparar', 'Lija'] },
  { id: 'ladrillo', oficio: 'Albañilería', nombre: 'Tabique de ladrillo', items: ['Ladrillo', 'Mortero o cemento', 'Arena', 'Yeso', 'Llaves de atado'] },
  // Pladur
  { id: 'tabique', oficio: 'Pladur', nombre: 'Tabique de pladur', items: ['Placas 13 mm', 'Canal 48', 'Montante 48', 'Tornillos PM 25', 'Tornillos MM (metal-metal)', 'Tacos de fijación', 'Banda acústica', 'Lana mineral', 'Cinta de juntas', 'Pasta de juntas', 'Cantonera'] },
  { id: 'techo', oficio: 'Pladur', nombre: 'Techo de pladur', items: ['Placas 13 mm', 'Perfil TC 47', 'Perimetral 30x30', 'Cuelgues o varilla roscada', 'Empalmes TC', 'Tornillos PM 25', 'Tacos de techo', 'Cinta de juntas', 'Pasta de juntas'] },
  { id: 'trasdosado', oficio: 'Pladur', nombre: 'Trasdosado', items: ['Placas 13 mm', 'Canal y montante 48 (o maestra)', 'Lana mineral', 'Tornillos PM 25', 'Cinta de juntas', 'Pasta de juntas'] },
  // Carpintería
  { id: 'puerta', oficio: 'Carpintería', nombre: 'Colgar puerta', items: ['Puerta (block)', 'Bisagras', 'Manillas', 'Resbalón o cerradura', 'Espuma de poliuretano', 'Cuñas', 'Tapajuntas', 'Puntas sin cabeza', 'Cola blanca'] },
  { id: 'mueble', oficio: 'Carpintería', nombre: 'Montar o colgar mueble', items: ['Tacos y tornillos', 'Escuadras', 'Cola blanca', 'Regletas niveladoras'] },
  { id: 'rodapie', oficio: 'Carpintería', nombre: 'Poner rodapié', items: ['Rodapié', 'Adhesivo de montaje', 'Puntas sin cabeza', 'Masilla de madera', 'Silicona acrílica'] },
  // Pintura
  { id: 'pintar', oficio: 'Pintura', nombre: 'Pintar habitación', items: ['Pintura plástica', 'Rodillo y recambio', 'Brochas y paletina', 'Cinta de carrocero', 'Plástico protector', 'Cubeta', 'Masilla', 'Lija', 'Imprimación'] },
  { id: 'techos', oficio: 'Pintura', nombre: 'Pintar techos', items: ['Pintura de techos', 'Rodillo y alargador', 'Cinta de carrocero', 'Plástico protector'] },
  { id: 'gotele', oficio: 'Pintura', nombre: 'Alisar gotelé', items: ['Pasta de alisar', 'Imprimación fijadora', 'Llana', 'Lija o lijadora', 'Plástico protector', 'Cinta de carrocero'] },
  // Otros
  { id: 'colgar', oficio: 'Otros', nombre: 'Colgar cuadros, baldas o TV', items: ['Tacos de nailon', 'Tornillos', 'Tacos para pladur (basculantes)', 'Soporte de TV', 'Escuadras de balda'] },
];

/* Herramientas habituales por tipo de chapuza */
const HERR_TIPO = {
  luz: ['Taladro percutor', 'Brocas de pared 6 y 8', 'Rozadora o radial', 'Buscapolos', 'Detector de tensión', 'Pelacables', 'Alicates universales', 'Destornilladores aislados', 'Guía pasacables', 'Escalera'],
  enchufe: ['Taladro percutor', 'Rozadora o radial', 'Buscapolos', 'Detector de tensión', 'Pelacables', 'Destornilladores aislados', 'Guía pasacables'],
  mecanismos: ['Buscapolos', 'Detector de tensión', 'Destornilladores aislados', 'Pelacables'],
  lampara: ['Escalera', 'Taladro', 'Brocas de pared 6 y 8', 'Buscapolos', 'Destornilladores aislados', 'Pelacables'],
  linea: ['Rozadora o radial', 'Taladro percutor', 'Guía pasacables', 'Pelacables', 'Polímetro', 'Destornilladores aislados'],
  cuadro: ['Polímetro', 'Comprobador de diferenciales', 'Destornilladores aislados', 'Pelacables', 'Crimpadora de punta hueca'],
  grifo: ['Llave inglesa', 'Llave de grifos de lavabo', 'Alicates de presión', 'Linterna frontal', 'Cubo y trapos'],
  cisterna: ['Llave inglesa', 'Alicates de presión', 'Destornilladores', 'Cubo y trapos'],
  desatasco: ['Desatascador de ventosa', 'Sonda desatascadora', 'Guantes', 'Cubo y trapos'],
  termo: ['Taladro percutor', 'Brocas de pared 6 y 8', 'Llave inglesa', 'Llave grifa', 'Nivel', 'Polímetro', 'Manguera para vaciar'],
  toma: ['Cortatubos multicapa', 'Calibrador multicapa', 'Prensadora multicapa', 'Taladro', 'Rozadora o radial'],
  sellado: ['Pistola de silicona', 'Cúter', 'Espátula de silicona'],
  alicatado: ['Cortadora de azulejo', 'Radial con disco de diamante', 'Llana dentada', 'Nivel láser', 'Mazo de goma', 'Batidora', 'Cubos', 'Rodilleras'],
  solado: ['Cortadora de azulejo', 'Radial con disco de diamante', 'Llana dentada', 'Nivel láser', 'Mazo de goma', 'Batidora', 'Cubos', 'Rodilleras'],
  rozas: ['Llana', 'Espátulas', 'Cubos', 'Batidora', 'Lijadora'],
  ladrillo: ['Paleta', 'Nivel', 'Cordel', 'Mazo', 'Plomada', 'Cubos'],
  tabique: ['Atornillador', 'Nivel láser', 'Cúter', 'Escofina', 'Tijera de chapa', 'Alzaplacas', 'Llanas y espátulas', 'Metro', 'Lápiz de carpintero'],
  techo: ['Atornillador', 'Nivel láser', 'Cúter', 'Escofina', 'Tijera de chapa', 'Alzaplacas', 'Llanas y espátulas', 'Escalera o andamio'],
  trasdosado: ['Atornillador', 'Nivel láser', 'Cúter', 'Escofina', 'Tijera de chapa', 'Llanas y espátulas'],
  puerta: ['Ingletadora', 'Taladro', 'Nivel', 'Formón', 'Martillo', 'Sargentos', 'Pistola de espuma'],
  mueble: ['Atornillador', 'Taladro', 'Nivel', 'Llaves Allen', 'Metro'],
  rodapie: ['Ingletadora', 'Clavadora o martillo', 'Pistola de silicona', 'Metro'],
  pintar: ['Rodillos', 'Pértiga', 'Escalera', 'Espátulas', 'Lijadora', 'Cubeta'],
  techos: ['Rodillo', 'Pértiga', 'Escalera'],
  gotele: ['Llanas', 'Lijadora con aspirador', 'Batidora', 'Escalera'],
  colgar: ['Taladro', 'Brocas de pared 6 y 8', 'Nivel', 'Detector de cables y tuberías', 'Metro'],
};

/* Listas editables: lo que añade se guarda, lo que quita se oculta, y puede crear listas nuevas */
function tiposTodos() { return [...TIPOS_CHAPUZA, ...(db.tiposPropios || [])]; }
function plantilla(clave) {
  db.plantillas = db.plantillas || {};
  let p = db.plantillas[clave];
  if (Array.isArray(p)) p = db.plantillas[clave] = { extra: p, ocultos: [] }; // versiones anteriores
  return p || (db.plantillas[clave] = { extra: [], ocultos: [] });
}
function itemsDeTipo(tipoId, modo = 'material') {
  const t = tiposTodos().find((x) => x.id === tipoId), base = modo === 'material' ? (t?.items || []) : (HERR_TIPO[tipoId] || t?.herr || []);
  const p = plantilla((modo === 'material' ? '' : 'h:') + tipoId);
  return [...base.filter((i) => !p.ocultos.includes(i)), ...p.extra.filter((e) => !base.includes(e))];
}

let ckTipo = null, ckSel = new Set(), ckTrabajo = null, ckModo = 'material', ckEditar = false;
function checklistMaterial(trabajoId, modo) {
  if (modo && modo !== ckModo) { ckModo = modo; ckSel = new Set(); }
  ckTrabajo = trabajoId !== undefined ? trabajoId : ckTrabajo;
  const t = trabajo(ckTrabajo);
  const tipos = tiposTodos().filter((x) => !t || !(t.oficios || []).length || t.oficios.includes(x.oficio) || x.propio);
  if (!ckTipo || !tipos.some((x) => x.id === ckTipo)) ckTipo = (tipos[0] || TIPOS_CHAPUZA[0]).id;
  const clave = (ckModo === 'material' ? '' : 'h:') + ckTipo, tipo = tiposTodos().find((x) => x.id === ckTipo);
  const items = itemsDeTipo(ckTipo, ckModo);
  const ya = ckModo === 'material'
    ? new Set(db.material.filter((m) => m.trabajoId === ckTrabajo && !m.comprado).map((m) => m.nombre.toLowerCase()))
    : new Set(db.herramientas.map((h) => h.nombre.toLowerCase()));
  const stock = (n) => db.stock.find((s) => s.nombre.toLowerCase() === n.toLowerCase() && s.cantidad > 0);
  const fila = (n) => {
    if (ckEditar) return `<div class="item" style="align-items:center"><span class="grow">${esc(n)}</span><button class="btn sm danger" data-quitar="${esc(n)}">Quitar</button></div>`;
    const hay = ya.has(n.toLowerCase()), st = ckModo === 'material' && stock(n);
    return `<label class="item" style="align-items:center"><input type="checkbox" class="chk" data-n="${esc(n)}" ${hay ? 'checked disabled' : ckSel.has(n) ? 'checked' : ''}><span class="grow">${esc(n)}</span>${hay ? `<span class="chip ok">${ckModo === 'material' ? 'Ya apuntado' : 'Ya la tienes'}</span>` : st ? `<span class="chip">Tienes ${st.cantidad} ${esc(st.unidad || '')}</span>` : ''}</label>`;
  };
  openSheet(`<div class="tabs" role="tablist"><button role="tab" aria-selected="${ckModo === 'material'}" data-modo="material">Material</button><button role="tab" aria-selected="${ckModo === 'herr'}" data-modo="herr">Herramientas</button></div>
    ${ckModo === 'material' && db.trabajos.length ? select('ckTrabajo', 'Para el trabajo', [['', '— Para reponer —'], ...trabajoOptions(false)], ckTrabajo || '') : ''}
    <div class="pills" id="ck-tipos">${tipos.map((x) => `<button type="button" data-tipo="${x.id}" aria-pressed="${x.id === ckTipo}">${esc(x.nombre)}</button>`).join('')}<button type="button" data-nuevo>+ Lista nueva</button></div>
    <div class="between"><b>${esc(tipo?.nombre || '')}</b><button class="btn sm ${ckEditar ? '' : 'light'}" data-editar>${ckEditar ? 'Hecho' : 'Editar lista'}</button></div>
    <div class="list">${items.map(fila).join('') || '<div class="empty">Lista vacía: añade lo que uses.</div>'}</div>
    <div class="row"><input id="ck-nuevo" placeholder="${ckModo === 'material' ? 'Añadir otro material…' : 'Añadir otra herramienta…'}" aria-label="Añadir a la lista" style="flex:1;min-height:46px;border:1.5px solid var(--line2);border-radius:10px;padding:0 12px;background:var(--card)"><button class="btn sm" id="ck-add">Añadir</button></div>
    ${ckEditar ? `<button class="btn sm light" data-restaurar style="align-self:center">Restaurar la lista original</button>${tipo?.propio ? '<button class="btn sm danger" data-borrarlista style="align-self:center">Borrar esta lista</button>' : ''}` : `<div class="muted">Lo que añadas se queda guardado en esta lista para la próxima vez.</div>
    <button class="btn brand block" id="ck-ok">${ckModo === 'material' ? `Añadir ${ckSel.size || ''} a la lista de compra` : `Guardar ${ckSel.size || ''} en mis herramientas`}</button>`}`, (s) => {
    const again = () => checklistMaterial(ckTrabajo);
    s.querySelectorAll('[data-modo]').forEach((b) => (b.onclick = () => checklistMaterial(ckTrabajo, b.dataset.modo)));
    const sel = s.querySelector('#f-ckTrabajo'); sel && (sel.onchange = () => { ckTrabajo = sel.value || null; again(); });
    s.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => { ckTipo = b.dataset.tipo; again(); }));
    s.querySelector('[data-nuevo]').onclick = () => { const n = prompt('Nombre de la lista nueva (p. ej. «Cambio de persiana»)'); if (!n) return;
      const nt = { id: 'p' + uid(), oficio: (t?.oficios || [])[0] || 'Otros', nombre: n, items: [], propio: true }; (db.tiposPropios = db.tiposPropios || []).push(nt); ckTipo = nt.id; ckEditar = false; save(); again(); };
    s.querySelector('[data-editar]').onclick = () => { ckEditar = !ckEditar; again(); };
    s.querySelectorAll('[data-quitar]').forEach((b) => (b.onclick = () => { const p = plantilla(clave), n = b.dataset.quitar;
      if (p.extra.includes(n)) p.extra = p.extra.filter((x) => x !== n); else p.ocultos.push(n); save(); again(); }));
    const rest = s.querySelector('[data-restaurar]'); rest && (rest.onclick = () => { const p = plantilla(clave); p.ocultos = []; save(); again(); });
    const bl = s.querySelector('[data-borrarlista]'); bl && (bl.onclick = () => { if (!confirm('¿Borrar esta lista?')) return; db.tiposPropios = db.tiposPropios.filter((x) => x.id !== ckTipo); ckTipo = null; ckEditar = false; save(); again(); });
    s.querySelectorAll('[data-n]').forEach((c) => (c.onchange = () => { c.checked ? ckSel.add(c.dataset.n) : ckSel.delete(c.dataset.n); const ok = s.querySelector('#ck-ok');
      ok.textContent = ckModo === 'material' ? `Añadir ${ckSel.size || ''} a la lista de compra` : `Guardar ${ckSel.size || ''} en mis herramientas`; }));
    const add = () => { const v = s.querySelector('#ck-nuevo').value.trim(); if (!v) return; const p = plantilla(clave);
      p.ocultos = p.ocultos.filter((x) => x !== v); if (!itemsDeTipo(ckTipo, ckModo).includes(v)) p.extra.push(v); if (!ckEditar) ckSel.add(v); save(); again(); };
    s.querySelector('#ck-add').onclick = add; s.querySelector('#ck-nuevo').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
    const ok = s.querySelector('#ck-ok'); ok && (ok.onclick = () => {
      if (!ckSel.size) return toast('Marca algo de la lista'); const n = ckSel.size;
      if (ckModo === 'material') ckSel.forEach((nombre) => db.material.push({ id: uid(), nombre, cantidad: '', tienda: 'Obramat', trabajoId: ckTrabajo || null, comprado: false, creado: Date.now() }));
      else ckSel.forEach((nombre) => db.herramientas.push({ id: uid(), nombre, tipo: 'herramienta', donde: lugares()[1] || lugares()[0], casa: lugares()[1] || lugares()[0], oficios: [tipo?.oficio].filter(Boolean) }));
      ckSel = new Set(); save(); closeSheet(); render(); toast(ckModo === 'material' ? `${n} añadidos a la lista de compra` : `${n} herramientas guardadas. Muévelas a su sitio en la pestaña Herramientas`);
    });
  });
}
window.checklistMaterial = checklistMaterial;
window.checklistHerramientas = (id) => checklistMaterial(id, 'herr');
