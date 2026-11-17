import subprocess, time, sys
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8771', '-d', '/home/claude/chispas-app'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
f = 0; errs = []
def ok(c, m):
    global f; print(('✔ ' if c else '✘ ') + m); f += (not c)
try:
  with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--no-sandbox'])
    for dev in ['Galaxy S9+', 'iPhone SE']:
        ctx = b.new_context(**p.devices[dev], locale='es-ES', color_scheme='dark', service_workers='block')
        ctx.route('**/*', lambda r: r.abort() if not r.request.url.startswith('http://localhost') else r.continue_())
        pg = ctx.new_page(); pg.set_default_timeout(5000); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script("sessionStorage.setItem('chispas.splash','1')")
        pg.goto('http://localhost:8771/#inicio'); pg.wait_for_timeout(400)
        J = pg.evaluate; P = f'[{dev}] '
        J("""() => { db.ajustes.tutorialOff = true; db.ajustes.sinCuenta = true; db.ajustes.iphoneVisto = true; db.ajustes.tema = 'oscuro'; applyTheme();
          db.clientes.push({id:'c1',nombre:'Rodolfo'}); db.trabajos.push({ id:'t1', creado:Date.now(), horas:[],gastos:[],pagos:[],fotos:[], titulo:'Baño completo', clienteId:'c1', estado:'en_curso', oficios:['Fontanería'], plan:'50/50' });
          db.material.push({id:'m1', nombre:'Azulejo 30x60', cantidad:'12 m2', precio:240, tienda:'Obramat', trabajoId:'t1', comprado:false, creado:Date.now()});
          db.material.push({id:'m2', nombre:'Cemento cola', cantidad:'4 sacos', precio:36, tienda:'Obramat', trabajoId:'t1', comprado:false, creado:Date.now()});
          save(); location.hash='#trabajos'; }""")
        pg.wait_for_timeout(200)
        # Modo oscuro: botón Nuevo legible
        col = J("getComputedStyle(document.querySelector('.btn.add')).color"); bg = J("getComputedStyle(document.querySelector('.btn.add')).backgroundColor"); ic = J("getComputedStyle(document.querySelector('.btn.add svg')).stroke")
        ok(bg != ic and col != bg, P + f'Modo oscuro: el botón «Nuevo» se distingue (fondo {bg}, texto {col}, + {ic})')
        pg.screenshot(path=f"/home/claude/tests/shots/p_{dev.replace(' ','')}_trabajos.png")
        # Lista → presupuesto
        J("location.hash='#preparar/t1'"); pg.wait_for_timeout(200)
        pg.click('text=Pasar al presupuesto'); pg.wait_for_timeout(150)
        ok(pg.input_value('[data-q="m1"]') == '12' and pg.input_value('[data-u="m1"]') == 'm²' and pg.input_value('[data-p="m1"]') == '20', P + 'Lee «12 m2» y 240 € → 12 m² a 20 €/m²')
        ok(pg.input_value('[data-u="m2"]') == 'saco' and pg.input_value('[data-p="m2"]') == '9', P + 'Lee «4 sacos» y 36 € → 4 sacos a 9 €')
        pg.click('#sheet [data-ok]'); pg.wait_for_timeout(200)
        lin = J("presu(trabajo('t1')).lineas.map(l=>[l.concepto,l.cantidad,l.unidad,l.precio,l.matId])")
        ok(len(lin) == 2 and pg.url.endswith('#presupuesto/t1'), P + f'Pasan al presupuesto: {lin}')
        J("presuSet('t1','margen',10)"); tot = J("totales(trabajo('t1')).total")
        ok(abs(tot - 303.6) < 0.01, P + f'Con 10 % de margen: (240+36)×1,1 = 303,60 € → {tot}')
        pg.click('text=Traer de la lista'); ok(pg.locator('#sheet [data-m]:disabled').count() == 2, P + 'Si vuelves a traerlo, sale «Ya está» y no se duplica'); J("closeSheet()")
        # Presupuesto → lista
        J("nuevaLinea('t1','material',{concepto:'Plato de ducha 120',cantidad:'1',unidad:'ud',precio:180})"); pg.wait_for_timeout(150)
        pg.click('text=Mandar a la lista'); pg.wait_for_timeout(150)
        ok(pg.locator('#sheet [data-l]:not(:disabled)').count() == 1, P + 'Al mandar a la lista, solo sale lo que no está ya')
        pg.click('#sheet [data-ok]'); pg.wait_for_timeout(150)
        m = J("db.material.find(m=>m.nombre==='Plato de ducha 120')")
        ok(m and m['trabajoId'] == 't1' and m['precio'] == 180 and m['cantidad'] == '1 ud', P + 'El plato de ducha pasa a la lista de compra del trabajo')
        # Herramienta que hay que comprar
        J("location.hash='#preparar/t1'"); pg.wait_for_timeout(150)
        pg.click('text=+ Comprar una'); pg.fill('#f-hnombre', 'Cortatubos cobre'); pg.fill('#f-hprecio', '14,90'); pg.click('#f-hpresu'); pg.click('#sheet [data-ok]'); pg.wait_for_timeout(150)
        ok('Cortatubos cobre' in pg.inner_text('#view') and 'Hay que comprar' in pg.inner_text('#view'), P + 'La herramienta a comprar sale en el trabajo')
        ok(J("presu(trabajo('t1')).lineas.some(l=>l.concepto==='Cortatubos cobre')"), P + 'Y se cobra en el presupuesto si lo marcas')
        J("location.hash='#compra'"); pg.wait_for_timeout(150)
        ok('Herramienta' in pg.inner_text('#view'), P + 'En Compra sale marcada como «Herramienta»')
        pg.click('#view .item:has-text("Cortatubos") input'); pg.wait_for_timeout(150)
        ok(J("db.herramientas.some(h=>h.nombre==='Cortatubos cobre')"), P + 'Al comprarla se guarda sola en mis herramientas')
        pg.click('#toast button'); ok(not J("db.herramientas.some(h=>h.nombre==='Cortatubos cobre')"), P + 'Deshacer la quita otra vez')
        # Sugeridas → comprar
        J("location.hash='#preparar/t1'"); pg.wait_for_timeout(150); pg.click('#view button:has-text("Sugeridas")'); pg.wait_for_timeout(150)
        pg.click('#sheet label:has-text("Llave grifa") input >> nth=0') if pg.locator('#sheet label:has-text("Llave grifa")').count() else pg.click('#sheet [data-n] >> nth=0')
        pg.click('#ck-comprar'); pg.wait_for_timeout(150)
        ok(J("db.material.filter(m=>m.herramienta).length") == 2, P + 'Desde las sugeridas: «Hay que comprarlas» las apunta para comprar')
        for r in ['preparar/t1', 'presupuesto/t1', 'compra', 'herramientas', 'trabajos']:
            J(f"location.hash='#{r}'"); pg.wait_for_timeout(150); t = pg.inner_text('#view')
            ok(not any(w in t for w in ['undefined', 'NaN', 'null']) and J("document.documentElement.scrollWidth") <= J("innerWidth") + 1, P + f'#{r} limpio y sin salirse')
            pg.screenshot(path=f"/home/claude/tests/shots/p_{dev.replace(' ','')}_{r.split('/')[0]}.png", full_page=True)
        ctx.close()
    b.close()
finally: srv.terminate()
ok(not errs, 'Sin errores de JavaScript ' + ' | '.join(errs[:3]))
print('\n' + (f'{f} FALLOS' if f else 'TODO CORRECTO'))
