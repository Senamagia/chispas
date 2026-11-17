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

function itemsDeTipo(tipoId) {
  const t = TIPOS_CHAPUZA.find((x) => x.id === tipoId);
  const extra = (db.plantillas || {})[tipoId] || [];
  return [...(t ? t.items : []), ...extra.filter((e) => !(t && t.items.includes(e)))];
}

/* Checklist: elige tipo de chapuza, marca el material y va a la lista de compra del trabajo. */
let ckTipo = null, ckSel = new Set(), ckTrabajo = null;
function checklistMaterial(trabajoId) {
  ckTrabajo = trabajoId || ckTrabajo || db.trabajos.find((t) => t.estado !== 'terminado')?.id || null;
  const t = trabajo(ckTrabajo);
  const tipos = TIPOS_CHAPUZA.filter((x) => !t || !(t.oficios || []).length || t.oficios.includes(x.oficio));
  if (!ckTipo || !tipos.some((x) => x.id === ckTipo)) ckTipo = (tipos[0] || TIPOS_CHAPUZA[0]).id;
  const yaEnLista = new Set(db.material.filter((m) => m.trabajoId === ckTrabajo && !m.comprado).map((m) => m.nombre.toLowerCase()));
  const stock = (n) => db.stock.find((s) => s.nombre.toLowerCase() === n.toLowerCase() && s.cantidad > 0);
  const items = itemsDeTipo(ckTipo);
  openSheet(`<h2>Material para la chapuza</h2>
    ${db.trabajos.length ? select('ckTrabajo', 'Trabajo', [['', '— Para reponer —'], ...trabajoOptions(false)], ckTrabajo || '') : ''}
    <div class="pills" id="ck-tipos">${tipos.map((x) => `<button type="button" data-tipo="${x.id}" aria-pressed="${x.id === ckTipo}">${esc(x.nombre)}</button>`).join('')}</div>
    <div class="list" id="ck-items">${items.map((n) => { const ya = yaEnLista.has(n.toLowerCase()), st = stock(n);
      return `<label class="item" style="align-items:center"><input type="checkbox" class="chk" data-n="${esc(n)}" ${ya ? 'checked disabled' : ckSel.has(n) ? 'checked' : ''}><span class="grow">${esc(n)}</span>${ya ? '<span class="chip ok">Ya apuntado</span>' : st ? `<span class="chip">Tienes ${st.cantidad} ${esc(st.unidad || '')}</span>` : ''}</label>`; }).join('')}</div>
    <div class="row"><input id="ck-nuevo" placeholder="Añadir otro material…" aria-label="Añadir otro material" style="flex:1;min-height:46px;border:1.5px solid var(--line2);border-radius:10px;padding:0 12px;background:var(--card)"><button class="btn sm" id="ck-add">Añadir</button></div>
    <div class="muted">Lo que añadas se queda guardado en «${esc(TIPOS_CHAPUZA.find((x) => x.id === ckTipo)?.nombre)}» para la próxima vez.</div>
    <button class="btn brand block" id="ck-ok">Añadir ${ckSel.size || ''} a la lista de compra</button>`, (s) => {
    const sel = s.querySelector('#f-ckTrabajo'); sel && (sel.onchange = () => { ckTrabajo = sel.value || null; checklistMaterial(ckTrabajo); });
    s.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => { ckTipo = b.dataset.tipo; checklistMaterial(ckTrabajo); }));
    s.querySelectorAll('[data-n]').forEach((c) => (c.onchange = () => { c.checked ? ckSel.add(c.dataset.n) : ckSel.delete(c.dataset.n); s.querySelector('#ck-ok').textContent = `Añadir ${ckSel.size || ''} a la lista de compra`; }));
    const add = () => { const v = s.querySelector('#ck-nuevo').value.trim(); if (!v) return;
      db.plantillas = db.plantillas || {}; const l = (db.plantillas[ckTipo] = db.plantillas[ckTipo] || []); if (!itemsDeTipo(ckTipo).includes(v)) l.push(v);
      ckSel.add(v); save(); checklistMaterial(ckTrabajo); };
    s.querySelector('#ck-add').onclick = add; s.querySelector('#ck-nuevo').onkeydown = (e) => e.key === 'Enter' && add();
    s.querySelector('#ck-ok').onclick = () => {
      if (!ckSel.size) return toast('Marca algo de la lista');
      const n = ckSel.size;
      ckSel.forEach((nombre) => db.material.push({ id: uid(), nombre, cantidad: '', tienda: 'Obramat', trabajoId: ckTrabajo || null, comprado: false, creado: Date.now() }));
      ckSel = new Set(); save(); closeSheet(); render(); toast(`${n} añadidos a la lista de compra`);
    };
  });
}
window.checklistMaterial = checklistMaterial;
