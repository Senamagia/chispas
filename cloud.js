/* Chispas · nube: cuenta (correo y contraseña), sincronización entre móviles y avisos programados.
   Si no hay conexión, la app sigue funcionando con lo guardado en el móvil y sube los cambios al volver. */
'use strict';

const cloud = { user: null, ready: false, estado: 'Sin cuenta', avisosOk: false };
window.cloud = cloud;

(function initCloud() {
  if (!window.firebase) { cloud.estado = 'Sin conexión con la nube'; return; }
  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth(), fs = firebase.firestore();
  cloud.fs = fs; cloud.auth = auth;
  fs.enablePersistence({ synchronizeTabs: true }).catch(() => {});
  let unsub = null, pushTimer = null, aplicando = false;

  // ---- Sesión ----
  auth.onAuthStateChanged(async (u) => {
    cloud.user = u; cloud.ready = true; unsub && unsub(); unsub = null;
    if (!u) { cloud.estado = 'Sin cuenta'; render(); return; }
    cloud.estado = 'Conectando…'; render();
    const ref = fs.collection('users').doc(u.uid);
    try {
      const snap = await ref.get();
      const remoto = snap.exists ? snap.data() : null;
      const localVacio = !db.trabajos.length && !db.tareas.length && !db.material.length && !db.clientes.length;
      if (remoto && remoto.data) {
        const dLocal = db.ajustes.modificado || 0;
        let usarRemoto = remoto.updated >= dLocal;
        if (db.ajustes.uid !== u.uid && !localVacio)
          usarRemoto = confirm('Ya tienes datos guardados en tu cuenta.\n\nAceptar = usar los de tu cuenta\nCancelar = subir los de este móvil (sustituyen a los de la cuenta)');
        if (usarRemoto) { aplicar(remoto); } else { db.ajustes.uid = u.uid; subir(true); }
      } else { db.ajustes.uid = u.uid; subir(true); }
      // Cambios hechos desde otro móvil
      unsub = ref.onSnapshot((s) => {
        if (s.metadata.hasPendingWrites || !s.exists) return;
        const r = s.data(); if (r.updated > (db.ajustes.modificado || 0)) { aplicar(r); toast('Actualizado desde otro móvil'); }
      });
      cloud.estado = 'Sincronizado'; render();
      registrarToken();
    } catch (e) { cloud.estado = 'Sin conexión: se subirá al volver la cobertura'; render(); }
  });

  function aplicar(remoto) {
    try { aplicando = true; const nuevo = JSON.parse(remoto.data); nuevo.ajustes = Object.assign({}, nuevo.ajustes, { uid: cloud.user.uid, modificado: remoto.updated, avisos: db.ajustes.avisos || {} });
      db = nuevo; localStorage.setItem(KEY, JSON.stringify(db)); applyTheme(); render(); sincronizarAvisos(); } finally { aplicando = false; }
  }
  function subir(ahora) {
    if (!cloud.user || aplicando) return; clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      const copia = Object.assign({}, db, { ajustes: Object.assign({}, db.ajustes, { avisos: undefined }) });
      try { await fs.collection('users').doc(cloud.user.uid).set({ email: cloud.user.email, data: JSON.stringify(copia), updated: db.ajustes.modificado || Date.now() });
        cloud.estado = 'Sincronizado'; } catch { cloud.estado = 'Pendiente de subir (sin cobertura)'; }
      sincronizarAvisos();
    }, ahora ? 0 : 1500);
  }
  cloud.onSave = () => { if (!aplicando) subir(false); };

  // ---- Avisos programados (los envía la hoja de Google de Chispas) ----
  function avisosDeseados() {
    const out = {}, uid = cloud.user.uid, ahora = Date.now();
    db.tareas.filter((t) => !t.hecha && t.cuando && t.cuando > ahora - 60e3).forEach((t) => {
      out[`${uid}_t_${t.id}`] = { when: t.cuando, title: 'Que no se te olvide', body: t.texto + (t.trabajoId && trabajo(t.trabajoId) ? ' · ' + trabajo(t.trabajoId).titulo : ''), link: '#inicio' };
    });
    db.trabajos.filter((t) => t.cuando && t.estado !== 'terminado' && t.estado !== 'presupuesto').forEach((t) => {
      const d = new Date(t.cuando); d.setDate(d.getDate() - 1); d.setHours(20, 0, 0, 0);
      if (d.getTime() > ahora) out[`${uid}_j_${t.id}`] = { when: d.getTime(), title: 'Mañana: ' + t.titulo, body: `A las ${fmtTime(t.cuando)}. Prepara lo que te llevas y carga las baterías.`, link: '#preparar/' + t.id };
    });
    db.herramientas.filter((h) => h.donde === 'Prestada' && h.desde).forEach((h) => {
      const w = h.desde + 7 * 864e5; if (w > ahora) out[`${uid}_h_${h.id}`] = { when: w, title: 'Herramienta prestada', body: `${h.nombre} lleva una semana fuera (${h.detalle || 'prestada'}).`, link: '#herramientas' };
    });
    // Fin del día: cuánto material pequeño has gastado
    const hoy20 = new Date(); hoy20.setHours(20, 30, 0, 0);
    if (hoy20.getTime() > ahora && window.pendientesGastoDia) pendientesGastoDia().forEach((t) => {
      out[`${uid}_g_${t.id}`] = { when: hoy20.getTime(), title: 'Fin del día · ' + t.titulo, body: '¿Cuántos tacos, tornillos y demás has gastado hoy? Apúntalo en 10 segundos.', link: '#gastodia/' + t.id };
    });
    return out;
  }
  async function sincronizarAvisos() {
    if (!cloud.user) return;
    const quiero = avisosDeseados(), tengo = db.ajustes.avisos || {}, batch = fs.batch(); let n = 0;
    for (const [id, a] of Object.entries(quiero)) { const firma = a.when + '|' + a.body; if (tengo[id] !== firma) { batch.set(fs.collection('avisos').doc(id), Object.assign({ uid: cloud.user.uid }, a)); tengo[id] = firma; n++; } }
    for (const id of Object.keys(tengo)) if (!quiero[id]) { batch.delete(fs.collection('avisos').doc(id)); delete tengo[id]; n++; }
    if (!n) return;
    try { await batch.commit(); db.ajustes.avisos = tengo; localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
  }

  // ---- Este móvil recibe avisos ----
  async function registrarToken(pedir = false) {
    if (!cloud.user || !('Notification' in window) || !firebase.messaging.isSupported()) return false;
    if (Notification.permission !== 'granted') { if (!pedir) return false; if ((await Notification.requestPermission()) !== 'granted') return false; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const token = await firebase.messaging().getToken({ vapidKey: FIREBASE_VAPID, serviceWorkerRegistration: reg });
      if (!token) return false;
      await fs.collection('tokens').doc(token).set({ uid: cloud.user.uid, updated: Date.now(), equipo: (navigator.userAgentData?.platform || navigator.platform || '') + ' · ' + (navigator.userAgent.match(/SM-[A-Z0-9]+|Pixel [0-9a-zA-Z ]+/)?.[0] || 'móvil') });
      cloud.avisosOk = true; return true;
    } catch (e) { console.warn(e); return false; }
  }
  cloud.pruebaReal = async () => {
    if (!cloud.user) return toast('Primero entra con tu cuenta');
    if (!(await registrarToken(true))) return toast('Activa los avisos en este móvil primero');
    try { await fs.collection('avisos').doc(cloud.user.uid + '_prueba_' + Date.now()).set({ uid: cloud.user.uid, when: Date.now(), title: '¡Funciona! 💡', body: 'Así te llegarán los avisos de Chispas, aunque tengas la app cerrada.', link: '#avisos' });
      cloud.pruebaEnviada = Date.now(); render(); toast('Prueba enviada. Bloquea el móvil y espera'); } catch { toast('Sin conexión: inténtalo con cobertura'); }
  };
  cloud.activarAvisos = async () => { const ok = await registrarToken(true); toast(ok ? 'Avisos activados en este móvil' : 'No se pudieron activar los avisos'); render(); };

  // ---- Cuenta ----
  const errores = { 'auth/invalid-credential': 'Correo o contraseña incorrectos', 'auth/wrong-password': 'Contraseña incorrecta', 'auth/user-not-found': 'No hay ninguna cuenta con ese correo',
    'auth/email-already-in-use': 'Ya hay una cuenta con ese correo: pulsa «Entrar»', 'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres', 'auth/invalid-email': 'Ese correo no es válido', 'auth/network-request-failed': 'Sin conexión. Prueba con cobertura' };
  const msg = (e) => errores[e.code] || 'No se ha podido: ' + (e.code || e.message);
  cloud.entrar = async (email, pass) => { try { await auth.signInWithEmailAndPassword(email, pass); location.hash = '#inicio'; toast('¡Dentro!'); } catch (e) { toast(msg(e)); } };
  cloud.crear = async (email, pass) => { try { await auth.createUserWithEmailAndPassword(email, pass); location.hash = '#inicio'; toast('Cuenta creada'); } catch (e) { toast(msg(e)); } };
  cloud.olvido = async (email) => { if (!email) return toast('Escribe tu correo primero'); try { await auth.sendPasswordResetEmail(email); toast('Te hemos mandado un correo para cambiarla'); } catch (e) { toast(msg(e)); } };
  cloud.salir = async () => { if (!confirm('¿Cerrar sesión en este móvil? Tus datos siguen guardados en tu cuenta.')) return; await auth.signOut(); };
})();
