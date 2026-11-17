"""Chispas y Rober trabajando juntos, cada uno en su móvil (Android y iPhone)."""
import subprocess, time, sys, json, urllib.request
from playwright.sync_api import sync_playwright
APP = 8780
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(APP), '-d', '/home/claude/chispas-app'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
nube = subprocess.Popen([sys.executable, '/home/claude/tests/eq/backend.py', '8781']); time.sleep(1.2)
MOCK = open('/home/claude/tests/eq/mock-firebase.js').read()
fallos, errores = 0, []
def ok(c, m):
    global fallos; print(('✔ ' if c else '✘ ') + m, flush=True); fallos += (not c)
def nubeDebug(): return json.loads(urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8781/debug', data=b'{}', method='POST')).read())
def movil(p, b, origen, disp, quien):
    ctx = b.new_context(**p.devices[disp], locale='es-ES', timezone_id='Europe/Madrid', service_workers='block')
    def ruta(r):
        u = r.request.url
        if 'firebase-app-compat' in u: return r.fulfill(body=MOCK, content_type='text/javascript')
        if 'gstatic.com' in u: return r.fulfill(body='', content_type='text/javascript')
        if u.startswith(origen) or u.startswith('http://127.0.0.1:8781'): return r.continue_()
        return r.abort()
    ctx.route('**/*', ruta)
    pg = ctx.new_page(); pg.set_default_timeout(7000)
    pg.on('pageerror', lambda e: errores.append(f'[{quien}] {e}'))
    pg.on('console', lambda m: errores.append(f'[{quien}] consola: {m.text}') if m.type in ('warning', 'error') and ('equipo' in m.text or 'permission' in m.text) else None)
    respuestas = []
    pg.on('dialog', lambda d: d.accept(respuestas.pop(0) if respuestas else ''))
    pg.add_init_script("sessionStorage.setItem('chispas.splash','1')")
    pg.goto(origen + '/#inicio'); pg.wait_for_timeout(500)
    pg.evaluate("db.ajustes.tutorialOff = true; db.ajustes.iphoneVisto = true; save()")
    pg.evaluate(f"cloud.entrar('{quien.lower()}@prueba.es','x')"); pg.wait_for_timeout(600)
    return ctx, pg, respuestas
def espera(pg, js, t=6):
    fin = time.time() + t
    while time.time() < fin:
        if pg.evaluate(js): return True
        pg.wait_for_timeout(150)
    return False
try:
  with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--no-sandbox'])
    ca, A, RA = movil(p, b, f'http://localhost:{APP}', 'Galaxy S9+', 'Chispas')
    cb, B, RB = movil(p, b, f'http://127.0.0.1:{APP}', 'iPhone 13', 'Rober')
    ok(A.evaluate("cloud.user.uid") == 'uid_chispas' and B.evaluate("cloud.user.uid") == 'uid_rober', 'Cada uno entra con su cuenta en su móvil')
    # Chispas prepara el trabajo con presupuesto
    A.evaluate("""() => { db.clientes.push({id:'cl1',nombre:'Lucía',tel:'600111222',dir:'C/ Real 5'});
      const t = {id:'tb1',creado:Date.now(),horas:[],gastos:[],pagos:[],fotos:[],titulo:'Reforma de baño',clienteId:'cl1',direccion:'C/ Real 5, Parla',estado:'en_curso',oficios:['Fontanería'],plan:'50/50',cuando:Date.now()+864e5};
      db.trabajos.push(t); presu(t).lineas.push({id:'l1',concepto:'Mano de obra baño',cantidad:'1',unidad:'ud',precio:1200,tipo:'mano'}); syncImporte(t); save(); location.hash='#trabajo/tb1'; }""")
    A.wait_for_timeout(300)
    ok('Trabajar en equipo' in A.inner_text('#view'), 'En el trabajo sale «Trabajar en equipo»')
    A.click('text=Trabajar en equipo'); A.wait_for_timeout(200)
    ok('¿Cómo os repartís el dinero?' in A.inner_text('#view'), 'Pantalla para elegir el reparto')
    RA.append('Chispas'); A.click('text=Crear equipo e invitar')
    ok(espera(A, "!!trabajo('tb1').equipo?.code"), 'Se crea el equipo con su código')
    code = A.evaluate("trabajo('tb1').equipo.code")
    ok(len(code) == 6 and 'KTR' not in code, f'Código de 6 letras: {code[:3]}-{code[3:]}')
    ok('Mandar invitación por WhatsApp' in A.inner_text('#view'), 'Sale el botón de invitar por WhatsApp')
    ok(espera(A, "!!(db.ajustes.eqSent?.[trabajo('tb1').equipo.code]?.precio)"), 'El presupuesto sube a la parte privada de la nube')
    # Rober abre el enlace
    B.evaluate(f"location.hash='#unirme/{code}'")
    ok(espera(B, "document.querySelector('#view').innerText.includes('Reforma de baño')"), 'Rober ve a qué trabajo le invitan (título, cliente, día)')
    ok('Chispas te invita' in B.inner_text('#view') and 'según las horas' in B.inner_text('#view').lower(), 'Y quién le invita y cómo os repartís')
    RB.append('Rober'); B.click('text=Unirme al trabajo')
    ok(espera(B, "location.hash==='#trabajo/tb1' && !!trabajo('tb1')"), 'Rober se une y entra en el trabajo')
    ok(espera(B, "cliente(trabajo('tb1').clienteId)?.nombre==='Lucía' && trabajo('tb1').importe===1200"), 'Rober tiene el cliente, la dirección y el precio')
    ok(espera(A, "trabajo('tb1').equipo.miembros.length===2"), 'Chispas ve que Rober se ha unido')
    # Horas: cada uno ficha lo suyo
    A.evaluate("location.hash='#trabajo/tb1'"); A.wait_for_timeout(200); A.click('#view button:has-text("Empezar")')
    B.evaluate("location.hash='#trabajo/tb1'"); B.wait_for_timeout(200); B.click('#view button:has-text("Empezar")')
    ok(espera(A, "trabajo('tb1').horas.length===2") and espera(B, "trabajo('tb1').horas.length===2"), 'Los dos fichan a la vez y cada uno ve las dos fichas')
    ok(A.evaluate("!!fichando()") and B.evaluate("!!fichando()"), 'Cada uno tiene su reloj en marcha')
    A.evaluate("trabajo('tb1').horas.find(h=>h.uid==='uid_chispas').inicio -= 14*3600e3; save()"); A.click('#view button:has-text("Parar")')
    B.evaluate("trabajo('tb1').horas.find(h=>h.uid==='uid_rober').inicio -= 10*3600e3; save()"); B.click('#view button:has-text("Parar")')
    ok(espera(A, "trabajo('tb1').horas.every(h=>h.fin)") and espera(B, "trabajo('tb1').horas.every(h=>h.fin)"), 'Parar el reloj de uno no para el del otro, y se ve en los dos')
    ok(abs(A.evaluate("cuentasEquipo(trabajo('tb1')).horas.uid_rober") - 10) < 0.05, 'Chispas ve las 10 h de Rober')
    # Gastos y cobros
    B.evaluate("location.hash='#equipo/tb1'"); B.wait_for_timeout(250)
    B.click('#view button:has-text("+ Apuntar")'); B.fill('#f-eimp', '257'); B.fill('#f-econ', 'Azulejo y cola'); B.click('#sheet [data-ok]')
    A.evaluate("location.hash='#equipo/tb1'"); A.wait_for_timeout(250)
    A.click('#view button:has-text("+ Apuntar")'); A.fill('#f-eimp', '123'); A.fill('#f-econ', 'Material fontanería'); A.click('#sheet [data-ok]')
    A.click('#view button:has-text("+ Apuntar")'); A.click('#sheet [data-t=pago]'); A.fill('#f-eimp', '500'); A.click('#sheet [data-ok]')
    A.click('#view button:has-text("+ Apuntar")'); A.fill('#f-eimp', '9'); A.fill('#f-econ', 'Mi bocadillo'); A.click('#f-esolo'); A.click('#sheet [data-ok]')
    A.evaluate("location.hash='#trabajo/tb1'"); A.wait_for_timeout(200)
    for i in range(2): A.click(f'#view .item:has-text("%") input >> nth={i}'); A.wait_for_timeout(100)
    ok(espera(B, "cobradoDe(trabajo('tb1'))===1200 && trabajo('tb1').gastos.length===3 && (trabajo('tb1').movs||[]).length===1"), 'Rober ve los cobros, los gastos y el adelanto de Chispas')
    ok(espera(A, "trabajo('tb1').gastos.some(g=>g.concepto==='Azulejo y cola' && g.pagadorUid==='uid_rober')"), 'Chispas ve el gasto que pagó Rober')
    ca_ = A.evaluate("cuentasEquipo(trabajo('tb1'))"); cb_ = B.evaluate("cuentasEquipo(trabajo('tb1'))")
    pa = ca_['pagos'][0] if ca_['pagos'] else {}
    ok(pa.get('de') == 'uid_chispas' and abs(pa['importe'] - 98.67) < 0.02, f"Cuenta: Chispas le paga 98,67 € a Rober (820 € de beneficio × 10/24 h + 257 − 500) → {pa}")
    ok(json.dumps(ca_['pagos']) == json.dumps(cb_['pagos']), 'Los dos móviles calculan exactamente lo mismo')
    A.evaluate("location.hash='#equipo/tb1'"); B.evaluate("location.hash='#equipo/tb1'"); A.wait_for_timeout(300); B.wait_for_timeout(300)
    ok('Le pagas 98,67 € a Rober' in A.inner_text('#view'), 'Chispas lee «Le pagas 98,67 € a Rober»')
    ok('Chispas te paga 98,67 €' in B.inner_text('#view'), 'Rober lee «Chispas te paga 98,67 €»')
    A.click('#view >> text=Ver cálculo'); A.wait_for_timeout(150); ok('Beneficio' in A.inner_text('#sheet') and '820 €' in A.inner_text('#sheet'), '«Ver cálculo» lo explica paso a paso'); A.evaluate("closeSheet()")
    A.screenshot(path='/home/claude/tests/shots/eq_A_equipo.png', full_page=True); B.screenshot(path='/home/claude/tests/shots/eq_B_equipo.png', full_page=True)
    # Quién lleva qué
    A.click('#view >> text=+ Añadir'); RA.append('Radial grande') if False else None
    A.evaluate("closeSheet()")
    RA.append('Andamio'); A.click('#view button:has-text("+ Añadir")'); 
    ok(espera(B, "(trabajo('tb1').llevar||[]).some(x=>x.nombre==='Andamio' && x.lleva==='uid_chispas')"), 'Chispas apunta que él lleva el andamio y Rober lo ve')
    B.evaluate("db.material.push({id:'mx1',nombre:'Plato de ducha',cantidad:'1',tienda:'Obramat',trabajoId:'tb1',comprado:false,creado:Date.now()}); save(); render()")
    ok(espera(A, "db.material.some(m=>m.id==='mx1')"), 'Rober apunta material y le sale a Chispas')
    B.wait_for_timeout(300); B.click('#view .item:has-text("Plato de ducha") button')
    ok(espera(A, "db.material.find(m=>m.id==='mx1')?.lleva==='uid_rober'"), 'Rober toca «Lo llevo yo» y Chispas lo ve')
    # A la vez: los dos apuntan gasto al mismo tiempo
    A.evaluate("trabajo('tb1').gastos.push({id:'gA',concepto:'Gasolina',importe:20,pagadorUid:'uid_chispas',fecha:Date.now()}); save()")
    B.evaluate("trabajo('tb1').gastos.push({id:'gB',concepto:'Parking',importe:6,pagadorUid:'uid_rober',fecha:Date.now()}); save()")
    ok(espera(A, "['gA','gB'].every(i=>trabajo('tb1').gastos.some(g=>g.id===i))", 8) and espera(B, "['gA','gB'].every(i=>trabajo('tb1').gastos.some(g=>g.id===i))", 8), 'Si los dos apuntan a la vez, no se pierde nada')
    # Presupuesto: Rober lo ve pero no lo cambia
    B.evaluate("location.hash='#presupuesto/tb1'"); B.wait_for_timeout(300)
    ok('Solo Chispas puede cambiar' in B.inner_text('#view') and B.evaluate("document.querySelector('#view fieldset').disabled"), 'Rober ve el presupuesto pero no puede cambiarlo')
    # Jornal y sin precios
    A.evaluate("location.hash='#equipo/tb1'"); A.wait_for_timeout(200); A.click('text=Cambiar el reparto'); A.click('#sheet [data-r=jornal]')
    A.fill('#f-j_uid_rober', '120'); A.click('#f-ocultar'); A.click('#sheet [data-ok]')
    ok(espera(B, "trabajo('tb1').equipo.reparto?.tipo==='jornal' && !trabajo('tb1').pagos.length && trabajo('tb1').importe==null", 8), 'Jornal sin precios: a Rober le desaparece el precio del cliente')
    B.evaluate("location.hash='#presupuesto/tb1'"); B.wait_for_timeout(250); ok('🔒' in B.inner_text('#view'), 'Rober ve un candado en el presupuesto')
    pa = A.evaluate("cuentasEquipo(trabajo('tb1')).pagos"); pb = B.evaluate("cuentasEquipo(trabajo('tb1')).pagos")
    # Rober: 1 día × 120 + 257 + 6 de parking − 500 de adelanto = −117 → Rober devuelve 117
    ok(pb and pb[0]['de'] == 'uid_rober' and abs(pb[0]['importe'] - 117) < 0.01 and json.dumps(pa) == json.dumps(pb), f'Con jornal de 120 €/día: Rober devuelve 117 € (120 + 257 + 6 − 500) y los dos lo ven igual → {pb}')
    d = nubeDebug()
    ok(not [l for l in d['log'] if l[0] == 'DENEGADO'], 'Ningún móvil intentó nada que las reglas no permitan ' + str([l for l in d['log'] if l[0] == 'DENEGADO'][:3]))
    # Seguridad: Rober no puede leer los precios ni cambiar el dueño
    r = B.evaluate(f"fetch('http://127.0.0.1:8781/read',{{method:'POST',body:JSON.stringify({{uid:'uid_rober',path:'equipos/{code}/privado/precio'}})}}).then(r=>r.json())")
    ok(r.get('error') == 'permission-denied', 'Rober no puede leer los precios ocultos aunque lo intente por su cuenta')
    r = B.evaluate(f"fetch('http://127.0.0.1:8781/write',{{method:'POST',body:JSON.stringify({{uid:'uid_rober',ops:[{{op:'update',path:'equipos/{code}',data:{{owner:'uid_rober'}}}}]}})}}).then(r=>r.json())")
    ok(r.get('error') == 'permission-denied', 'Rober no puede quedarse con el trabajo (cambiar el dueño)')
    r = B.evaluate(f"fetch('http://127.0.0.1:8781/write',{{method:'POST',body:JSON.stringify({{uid:'uid_extra',ops:[{{op:'set',path:'equipos/{code}/items/x',data:{{a:1}}}}]}})}}).then(r=>r.json())")
    ok(r.get('error') == 'permission-denied', 'Alguien de fuera no puede escribir en el trabajo')
    # Hoy y compañeros
    A.evaluate("location.hash='#inicio'"); A.wait_for_timeout(250); ok('Rober te debe 117 €' in A.inner_text('#view'), 'En Hoy de Chispas: «Rober te debe 117 €»')
    B.evaluate("location.hash='#inicio'"); B.wait_for_timeout(250); ok('Le debes 117 € a Chispas' in B.inner_text('#view'), 'En Hoy de Rober: «Le debes 117 € a Chispas»')
    A.evaluate("location.hash='#companeros'"); A.wait_for_timeout(250); ok('Rober' in A.inner_text('#view') and '117 €' in A.inner_text('#view'), 'Más › Compañeros: saldo con Rober')
    A.screenshot(path='/home/claude/tests/shots/eq_A_companeros.png', full_page=True)
    B.evaluate("location.hash='#trabajos'"); B.wait_for_timeout(250); ok('con Chispas' in B.inner_text('#view'), 'En la lista de Rober pone «con Chispas»')
    # Quedar en paz
    B.evaluate("location.hash='#equipo/tb1'"); B.wait_for_timeout(250); B.click('text=Ya está pagado'); B.wait_for_timeout(200)
    ok(espera(A, "cuentasEquipo(trabajo('tb1')).pagos.length===0"), '«Ya está pagado» y los dos quedan en paz')
    # Rober sale
    B.click('text=Salir de este trabajo')
    ok(espera(A, "trabajo('tb1').equipo.miembros.length===1") and B.evaluate("!trabajo('tb1')"), 'Rober sale: se le quita de su lista y Chispas lo ve')
    for x in ['eq_A_equipo', 'eq_B_equipo']: pass
    b.close()
finally:
    srv.terminate(); nube.terminate()
reales = [e for e in errores if 'firebase' not in e.lower() or 'equipo' in e]
ok(not reales, 'Sin errores: ' + ' | '.join(sorted(set(reales))[:5]))
print('\n' + (f'{fallos} FALLOS' if fallos else 'TODO CORRECTO'))
