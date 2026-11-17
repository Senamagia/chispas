"""Auditoría de Chispas: recorre la app como la usaría Chispas, pulsando botones y rellenando formularios."""
import subprocess, time, sys, re, json, datetime
from playwright.sync_api import sync_playwright
PORT = 8770
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', '/home/claude/chispas-app'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
fallos, errores, resultados = 0, [], []
def ok(c, m):
    global fallos
    resultados.append(('✔ ' if c else '✘ ') + m); print(resultados[-1], flush=True); fallos += (not c)
def correr(dispositivo, oscuro=False, hora=None):
    p = sync_playwright().start()
    if True:
        b = p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = b.new_context(**p.devices[dispositivo], locale='es-ES', timezone_id='Europe/Madrid', color_scheme='dark' if oscuro else 'light', service_workers='block', accept_downloads=True)
        ctx.route('**/*', lambda r: r.abort() if not r.request.url.startswith(f'http://localhost:{PORT}') else r.continue_())
        pg = ctx.new_page(); pg.set_default_timeout(6000)
        pg.on('pageerror', lambda e: errores.append(f'[{dispositivo}] {e}'))
        respuestas = []
        pg.on('dialog', lambda d: d.accept(respuestas.pop(0) if respuestas else ''))
        if hora: pg.clock.install(time=hora)
        pg.goto(f'http://localhost:{PORT}/#inicio'); pg.wait_for_timeout(3600)  # bienvenida de 3 s
        J = lambda js: pg.evaluate(js)
        def ir(h): J(f"closeSheet(); location.hash='#{h}'"); pg.wait_for_timeout(150)
        def texto(): return pg.inner_text('#view')
        def sheet(): return pg.inner_text('#sheet') if pg.is_visible('#sheet') else ''
        def limpio(nombre):
            t = texto() + sheet()
            mal = [w for w in ['undefined', 'NaN', 'null', '[object'] if w in t]
            if mal: ok(False, f'{nombre}: aparece «{mal[0]}» en pantalla')
            if J("document.documentElement.scrollWidth") > J("innerWidth") + 1: ok(False, f'{nombre}: algo se sale por el lado')
        b._pw = p
        return b, pg, J, ir, texto, sheet, limpio, respuestas

def auditoria(dispositivo):
    b, pg, J, ir, texto, sheet, limpio, R = correr(dispositivo)
    pre = f'[{dispositivo}] '
    ok(J("!document.querySelector('#splash')") and pg.is_visible('.nav'), pre + 'La bienvenida dura 3 s y entra sola en la app')
    # Sin cuenta: le manda a crear cuenta; elige seguir sin cuenta
    J("db.ajustes.sinCuenta = true; db.ajustes.tutorialOff = true; db.ajustes.iphoneVisto = true; save()")
    # 1. App vacía: todas las pantallas
    for r in ['inicio', 'trabajos', 'cuentas', 'compra', 'herramientas', 'salida', 'menu', 'ayuda', 'catalogo', 'clientes', 'copia', 'apariencia', 'avisos', 'voz', 'cuenta']:
        ir(r); limpio(pre + f'#{r} vacía')
    ok(True, pre + 'Con la app vacía, todas las pantallas se abren')
    # 2. Mis datos y precios del catálogo
    ir('menu'); pg.click('text=Mis datos para presupuestos'); pg.fill('#f-nombre', 'Chispas Reformas'); pg.fill('#f-tel', '600 123 456'); pg.click('#sheet [data-ok]')
    ok(J("db.ajustes.negocio.nombre") == 'Chispas Reformas', pre + 'Guardar mis datos para el PDF')
    ir('catalogo'); pg.click('text=+ Precio'); pg.fill('#f-nombre', 'Punto de luz'); pg.fill('#f-precio', '45,50'); pg.select_option('#f-oficio', 'Electricidad'); pg.click('#sheet [data-ok]')
    ok(J("db.catalogo.find(c=>c.nombre==='Punto de luz')?.precio") == 45.5, pre + 'Precio nuevo en el catálogo con coma decimal (45,50)')
    # 3. Trabajo nuevo y completarlo
    ir('trabajos'); pg.click('#view >> text=Nuevo'); pg.fill('#f-titulo', 'Electricidad cocina'); pg.fill('#f-cliente', 'Rodolfo'); pg.click('#sheet [data-ok]'); pg.wait_for_timeout(200)
    tid = J("db.trabajos.find(t=>t.titulo==='Electricidad cocina').id")
    ok(pg.url.endswith('#trabajo/' + tid), pre + 'Trabajo nuevo con 2 campos y entra en su ficha')
    pg.click('#view >> text=Editar'); 
    manana = (datetime.datetime.now() + datetime.timedelta(days=1)).strftime('%Y-%m-%dT09:00')
    pg.fill('#f-direccion', 'Calle Real 5, Parla'); pg.fill('#f-cuando', manana); pg.click('#oficios >> text=Electricidad'); pg.click('#sheet [data-ok]'); pg.wait_for_timeout(150)
    t = J(f"trabajo('{tid}')")
    ok(t['direccion'] == 'Calle Real 5, Parla' and t['oficios'] == ['Electricidad'] and t['cuando'], pre + 'Editar el trabajo: dirección, día y oficio')
    ok('Llegar' in texto(), pre + 'Con dirección sale el botón «Llegar»')
    cl = J("db.clientes.find(c=>c.nombre==='Rodolfo')")
    ir('clientes'); pg.click('text=Rodolfo'); pg.fill('#f-tel', '611 222 333'); pg.click('#sheet [data-ok]')
    ir('trabajo/' + tid); ok('Llamar' in texto() and 'WhatsApp' in texto(), pre + 'Al poner teléfono al cliente salen Llamar y WhatsApp')
    ok(pg.get_attribute('a:has-text("WhatsApp")', 'href') == 'https://wa.me/34611222333', pre + 'El enlace de WhatsApp lleva el número bien (+34 sin espacios)')
    limpio(pre + 'Ficha del trabajo')
    # 4. Presupuesto completo
    pg.click('button[role=tab]:has-text("Presupuesto")'); pg.wait_for_timeout(150)
    pg.click('text=+ Del catálogo'); pg.click('#sheet >> text=Punto de luz'); pg.wait_for_timeout(150)
    pg.fill('[data-f=cantidad] >> nth=0', '6')
    pg.click('text=+ Partida libre'); pg.wait_for_timeout(100)
    pg.fill('[data-f=concepto] >> nth=1', 'Cambiar cuadro eléctrico'); pg.fill('[data-f=cantidad] >> nth=1', '1'); pg.fill('[data-f=precio] >> nth=1', '180')
    pg.click('text=+ Material'); pg.wait_for_timeout(100)
    pg.fill('[data-f=concepto] >> nth=2', 'Cable 2,5 mm²'); pg.fill('[data-f=cantidad] >> nth=2', '50'); pg.select_option('[data-f=unidad] >> nth=2', 'm'); pg.fill('[data-f=precio] >> nth=2', '0,62')
    pg.click('text=+ Material'); pg.wait_for_timeout(100)
    pg.fill('[data-f=concepto] >> nth=3', 'Tacos del 6'); pg.fill('[data-f=cantidad] >> nth=3', '30')
    pg.wait_for_timeout(700); pg.click('button:has-text("Viene en paquete") >> nth=1'); pg.wait_for_timeout(100)
    pg.click('#lineas .pills >> text=100'); pg.fill('[data-f=packPrecio]', '6,50'); pg.wait_for_timeout(700)
    ok('0,065 €/ud' in texto(), pre + 'Paquete de 100 tacos a 6,50 € → 0,065 €/ud')
    pg.click('#view .pills >> text="15 %"'); pg.wait_for_timeout(100)
    pg.fill('#f-desp', '20'); pg.press('#f-desp', 'Tab'); pg.wait_for_timeout(150)
    # 6×45,5=273 + 180 + (31 + 1,95)×1,15=37,8925 + 20 = 510,8925 → 510,89
    tot = J(f"totales(trabajo('{tid}')).total")
    ok(abs(tot - 510.89) < 0.005 and '510,89 €' in texto(), pre + f'Total del presupuesto sin IVA correcto: {tot} (esperado 510,89)')
    pg.click('text=Con factura (IVA 21 %)'); pg.wait_for_timeout(150)
    tot = J(f"totales(trabajo('{tid}')).total")
    ok(abs(tot - 618.18) < 0.005 and 'IVA' in texto(), pre + f'Con factura añade el 21 %: {tot} (esperado 618,18)')
    pg.click('#view .pills >> text=40/30/30'); pg.wait_for_timeout(150)
    pagos = J(f"trabajo('{tid}').pagos.map(p=>p.importe)")
    ok(len(pagos) == 3 and abs(sum(pagos) - tot) < 0.001, pre + f'Pagos 40/30/30 suman justo el total: {pagos}')
    pg.fill('#f-notas', 'Incluye retirada de escombros'); pg.press('#f-notas', 'Tab')
    limpio(pre + 'Presupuesto')
    # Generar PDF sin conexión: avisa sin romperse
    pg.click('text=Enviar PDF'); pg.wait_for_timeout(600)
    ok('cobertura' in pg.inner_text('#toast'), pre + 'Sin cobertura, el PDF avisa en vez de romperse')
    J(f"presu(trabajo('{tid}')).estado='enviado'; save(); render()")
    pg.click('text=El cliente lo ha aceptado'); pg.wait_for_timeout(150)
    ok(J(f"trabajo('{tid}').estado") == 'en_curso', pre + 'Aceptar el presupuesto pasa el trabajo a «En marcha»')
    # 5. Material del trabajo
    pg.click('button[role=tab]:has-text("Material")'); pg.wait_for_timeout(150)
    pg.click('#view button:has-text("Lista sugerida")'); pg.wait_for_timeout(150)
    for n in ['Tubo corrugado', 'Caja de registro']: pg.click(f'#sheet label:has-text("{n}") input')
    pg.fill('#ck-nuevo', 'Regletass'); pg.press('#ck-nuevo', 'Backspace'); pg.press('#ck-nuevo', 'Enter'); pg.wait_for_timeout(150)
    ok('Regletas' in sheet(), pre + 'Lista sugerida: escribir, borrar y añadir algo nuevo')
    pg.click('#ck-ok'); pg.wait_for_timeout(150)
    mats = J(f"db.material.filter(m=>m.trabajoId==='{tid}').map(m=>m.nombre)")
    ok(len(mats) == 3 and 'Regletas' in mats, pre + f'Pasan a la lista de compra: {mats}')
    ir('compra'); ok(all(m.split(' ')[0] in texto() for m in mats), pre + 'Salen en Compra › Por comprar')
    pg.click(f'#view .item:has-text("Regletas") input'); pg.wait_for_timeout(150)
    ok(J("db.material.find(m=>m.nombre==='Regletas').comprado"), pre + 'Marcar como comprado')
    ok(pg.is_visible('#toast button'), pre + 'Sale «Deshacer» por si te equivocas')
    ir('presupuesto/' + tid); J("toast('prueba')"); tb = J("document.querySelector('#toast').getBoundingClientRect().bottom"); st = J("[...document.querySelectorAll('#view [style*=\"position:sticky\"]')].pop().getBoundingClientRect().top")
    ok(tb <= st, pre + 'Los avisos no tapan el botón de enviar el presupuesto'); ir('compra')
    limpio(pre + 'Compra')
    # 6. Lo que tengo (stock) y reponer
    pg.click('button[role=tab]:has-text("Lo que tengo")'); pg.click('#view >> text=Añadir')
    pg.fill('#f-nombre', 'Tacos del 6'); pg.fill('#f-cantidad', '200'); pg.fill('#f-minimo', '150'); pg.click('#sheet [data-ok]')
    for _ in range(51): J("stockMas(db.stock[0].id,-1)")
    ok('Reponer' in texto(), pre + 'Al bajar del mínimo sale «Reponer»')
    pg.click('#view button:has-text("Reponer")'); ok(J("db.material.some(m=>m.nombre==='Tacos del 6' && !m.comprado)"), pre + 'Reponer lo manda a la lista de compra')
    # 7. Fichar horas
    ir('trabajo/' + tid); pg.click('#view button:has-text("Empezar")'); pg.wait_for_timeout(150)
    ok(J(f"!!fichando()") and 'Trabajando ahora' in texto(), pre + 'Empezar pone el reloj en marcha')
    ir('inicio'); ok('TRABAJANDO AHORA' in texto() and 'Parar' in texto(), pre + 'En Hoy sale el trabajo en marcha con «Parar»')
    J(f"trabajo('{tid}').horas[0].inicio -= 4*3600e3; save()")
    pg.click('#view button:has-text("Parar")'); pg.wait_for_timeout(150)
    r = J(f"rentabilidad(trabajo('{tid}'))")
    ok(not J("fichando()") and abs(r['horas'] - 4) < 0.02, pre + f"Parar: 4 h apuntadas ({r['horas']:.2f})")
    ir('trabajo/' + tid); pg.click('text=+ Gasto'); pg.fill('#f-concepto', 'Gasolina'); pg.fill('#f-importe', '12,40'); pg.click('#sheet [data-ok]')
    r = J(f"rentabilidad(trabajo('{tid}'))")
    ok(abs(r['porHora'] - (618.18 - 12.40) / 4) < 0.5, pre + f"€/hora = (precio − gastos) / horas: {r['porHora']:.2f}")
    # 8. Cobros
    pg.click('#view .item:has-text("Al empezar") input'); pg.wait_for_timeout(150)
    ok(abs(J(f"cobradoDe(trabajo('{tid}'))") - pagos[0]) < 0.01, pre + 'Marcar un cobro')
    ir('trabajo/' + tid); ok('12,40 €' in texto(), pre + 'Los importes salen con dos decimales (12,40 €)')
    pg.click('text=He terminado el trabajo'); pg.wait_for_timeout(150)
    ok(J(f"trabajo('{tid}').estado") == 'por_cobrar' and 'Falta cobrar' in texto(), pre + '«He terminado» lo pasa a pendiente de cobro')
    ir('inicio'); ok('Cobrar' in texto() and 'Electricidad cocina' in texto(), pre + 'En Hoy sale lo que falta por cobrar')
    ir('cuentas'); ok('Lo que me renta' in texto() and 'Electricidad' in texto(), pre + '«Lo que me renta» enseña el oficio y el trabajo')
    limpio(pre + 'Lo que me renta')
    # 9. Herramientas
    ir('herramientas')
    for n, o in [('Taladro percutor', 'Electricidad'), ('Buscapolos', 'Electricidad'), ('Radial', 'Albañilería')]:
        pg.click('#view >> text=Añadir'); pg.fill('#f-nombre', n); pg.click(f'#oficios >> text={o}'); pg.click('#sheet [data-ok]'); pg.wait_for_timeout(80)
    ok(J("db.herramientas.length") == 3, pre + 'Añadir 3 herramientas')
    pg.click('#view >> text=+ Batería o cargador'); pg.fill('#f-nombre', 'Batería Makita 5Ah'); pg.click('#sheet [data-ok]')
    ok(J("db.herramientas.find(h=>h.nombre.startsWith('Batería')).tipo") == 'bateria', pre + 'Añadir una batería')
    pg.click('#view .tool-tile:has-text("Radial")'); R.append('Paco'); pg.click('#sheet >> text=La he prestado'); pg.wait_for_timeout(150)
    h = J("db.herramientas.find(h=>h.nombre==='Radial')")
    ok(h['donde'] == 'Prestada' and h['detalle'] == 'Paco', pre + 'Prestar la radial a Paco')
    ir('inicio'); ok('Recuperar Radial' in texto(), pre + 'La radial prestada sale en Pendiente')
    ir('herramientas'); pg.click('#view >> text=Seleccionar varias'); pg.click('#view .tool-tile:has-text("Taladro")'); pg.click('#view .tool-tile:has-text("Buscapolos")')
    pg.click('#view button:has-text("Mover 2")'); pg.click('#sheet button:has-text("Coche")'); pg.wait_for_timeout(150)
    ok(J("db.herramientas.filter(h=>h.donde==='Coche').length") == 2, pre + 'Seleccionar 2 y moverlas al coche de golpe')
    # Salir de casa / volver
    J("db.herramientas.filter(h=>h.donde==='Coche').forEach(h=>{h.donde='Armario de casa';h.casa='Armario de casa'}); save()")
    ir('salida'); 
    ok('Para Electricidad cocina' in texto() or 'Marcar las' in texto(), pre + 'Salir de casa sugiere las del trabajo de mañana')
    if 'Marcar las' in texto(): pg.click('#view button:has-text("Marcar las")')
    pg.click('#view button:has-text("Me llevo")'); pg.wait_for_timeout(150)
    ok(J("db.herramientas.filter(h=>h.donde==='Coche').length") == 2, pre + '«Me llevo» las mete en el coche')
    pg.click('#view button:has-text("He vuelto")'); pg.wait_for_timeout(150)
    ok(J("['Taladro percutor','Buscapolos'].every(n=>db.herramientas.find(h=>h.nombre===n).donde==='Armario de casa')"), pre + '«He vuelto» las devuelve a su sitio')
    limpio(pre + 'Herramientas')
    # 10. Fin del día (después de las 17:00 con horas hoy)
    J(f"trabajo('{tid}').horas.push({{inicio: Date.now()-3600e3, fin: Date.now()-60e3}}); db.ajustes.gastoDia = {{}}; save()")
    hay = J("new Date().getHours() >= 17")
    ir('inicio')
    if hay: ok('FIN DEL DÍA' in texto(), pre + 'Después de las 17:00 pregunta el material pequeño gastado')
    ir('gastodia/' + tid); lid = J(f"presu(trabajo('{tid}')).lineas.find(l=>l.concepto==='Tacos del 6').id")
    pg.click(f'#view section:has-text("Tacos del 6") .pills >> text=+25'); pg.click(f'#view section:has-text("Tacos del 6") button[aria-label="Uno más"]')
    stock0 = J("db.stock.find(s=>s.nombre==='Tacos del 6').cantidad")
    pg.click('text=Guardar lo de hoy'); pg.wait_for_timeout(200)
    ok(J(f"presu(trabajo('{tid}')).lineas.find(l=>l.id==='{lid}').gastado") == 26 and J("db.stock.find(s=>s.nombre==='Tacos del 6').cantidad") == stock0 - 26, pre + 'Fin del día: 26 tacos se suman al presupuesto y se restan de lo que tengo')
    ok('Gastado en obra' in texto() and 'Usar lo gastado' in texto(), pre + 'En el presupuesto sale previsto vs gastado')
    # 11. Voz (con el texto que entendería)
    frases = [('comprar dos sacos de yeso', 'MATERIAL'), ('el taladro percutor está en el coche', 'HERRAMIENTA'), ('la radial la tiene Manolo', 'HERRAMIENTA'), ('recuérdame llamar a Marta mañana a las 10', 'NO OLVIDAR')]
    for f, tipo in frases:
        J(f"interpretar({json.dumps(f)})"); pg.wait_for_timeout(100)
        s = sheet(); ok(tipo in s, pre + f'Voz: «{f}» → {tipo} · {s.splitlines()[3] if len(s.splitlines())>3 else s[:60]}')
        pg.click('#sheet [data-ok]'); pg.wait_for_timeout(100)
    tarea = J("db.tareas.find(t=>/Marta/.test(t.texto))")
    d = datetime.datetime.fromtimestamp(tarea['cuando']/1000) if tarea and tarea.get('cuando') else None
    ok(d and d.hour == 10 and d.date() == (datetime.date.today() + datetime.timedelta(days=1)), pre + f'Voz: el recordatorio queda para mañana a las 10 ({d})')
    ok(J("db.herramientas.find(h=>h.nombre==='Radial').detalle").lower().startswith('la tiene manolo'), pre + 'Voz: la radial pasa a «La tiene Manolo»')
    # 12. Socio a medias
    ir('trabajos'); pg.click('#view >> text=Nuevo'); pg.fill('#f-titulo', 'Baño Lucía'); pg.click('#sheet [data-mas]'); pg.wait_for_timeout(150)
    pg.fill('#f-importe', '1000'); pg.select_option('#f-estado', 'en_curso'); pg.fill('#f-socio', 'Rober'); pg.click('#sheet [data-ok]'); pg.wait_for_timeout(150)
    t2 = J("db.trabajos.find(t=>t.titulo==='Baño Lucía').id")
    J(f"trabajo('{t2}').pagos.forEach(p=>p.cobrado=true); save(); render()")
    pg.click('text=+ Gasto'); pg.fill('#f-concepto', 'Azulejo'); pg.fill('#f-importe', '200'); pg.select_option('#f-pagador', 'Rober'); pg.click('#sheet [data-ok]'); pg.wait_for_timeout(150)
    ok('Le pagas 600 €' in texto(), pre + 'Socio: cobras 1000, Rober pagó 200 de material → le pagas 600 € (400 de su mitad + 200)')
    # 13. Plano rápido por medidas y al presupuesto
    ir('plano/' + t2); pg.fill('#f-largo', '3,2'); pg.fill('#f-ancho', '2,5'); pg.click('text=Dibujar y calcular'); pg.wait_for_timeout(150)
    ok('8 m²' in texto(), pre + 'Plano por medidas 3,2 × 2,5 = 8 m²')
    pg.click('text=Pasar los m² al presupuesto'); pg.click('#sheet >> text=Añadir al presupuesto'); pg.wait_for_timeout(150)
    ok(J(f"presu(trabajo('{t2}')).lineas.length") >= 1, pre + 'Los m² pasan al presupuesto')
    # 14. Tareas: apuntar, hecha, deshacer
    ir('inicio'); pg.click('button[aria-label="Apuntar algo nuevo"]'); pg.click('#sheet >> text=Algo que no se me olvide')
    pg.fill('#f-texto', 'Comprar broca de 8'); pg.click('#sheet [data-ok]'); pg.wait_for_timeout(100)
    pg.click('#view .item:has-text("Comprar broca de 8") input'); pg.wait_for_timeout(100)
    ok(J("db.tareas.find(t=>t.texto==='Comprar broca de 8').hecha"), pre + 'Tachar una tarea')
    pg.click('#toast button'); ok(not J("db.tareas.find(t=>t.texto==='Comprar broca de 8').hecha"), pre + 'Deshacer la tarea tachada')
    # 15. Copia de seguridad: descargar y recuperar
    ir('copia')
    with pg.expect_download() as dl: pg.click('text=Descargar copia')
    ruta = dl.value.path(); datos = json.load(open(ruta))
    ok(len(datos['trabajos']) == 2, pre + 'Descargar copia con todo dentro')
    J("db.trabajos=[]; save()"); pg.set_input_files('#view input[type=file]', ruta); pg.wait_for_timeout(400)
    ok(J("db.trabajos.length") == 2, pre + 'Recuperar desde la copia')
    # 16. Borrar un trabajo
    ir('trabajo/' + t2); pg.click('#view >> text=Editar'); pg.click('#sheet [data-del]'); pg.wait_for_timeout(200)
    ok(not J(f"trabajo('{t2}')") and pg.url.endswith('#trabajos'), pre + 'Borrar un trabajo')
    # 17. Todas las pantallas llenas, claro y oscuro
    for tema in ['claro', 'oscuro']:
        J(f"db.ajustes.tema='{tema}'; save(); applyTheme()")
        for r in ['inicio', 'trabajos', 'cuentas', f'trabajo/{tid}', f'presupuesto/{tid}', f'preparar/{tid}', f'plano/{tid}', 'compra', 'herramientas', 'salida', 'menu', 'ayuda', f'gastodia/{tid}', 'catalogo', 'clientes']:
            ir(r); limpio(pre + f'#{r} ({tema})')
            pg.screenshot(path=f"/home/claude/tests/shots/a_{dispositivo.replace(' ','')}_{tema}_{r.split('/')[0]}.png", full_page=True)
    ok(True, pre + 'Recorridas todas las pantallas con datos, en claro y en oscuro')
    b.close(); b._pw.stop()

try:
    for d in ['Galaxy S9+', 'iPhone SE']: auditoria(d)
finally:
    srv.terminate()
reales = [e for e in errores if 'firebase' not in e.lower()]
ok(not reales, 'Sin errores de JavaScript: ' + ' | '.join(sorted(set(reales))[:6]))
print('\n' + (f'{fallos} FALLOS' if fallos else 'TODO CORRECTO'))
