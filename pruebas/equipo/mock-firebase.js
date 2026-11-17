// Firebase de mentira para pruebas: misma API (compat) que usa Chispas, contra la nube de pruebas
(function () {
  const API = 'http://127.0.0.1:8781';
  const user = () => window.__mockUser || null;
  const post = (p, b) => fetch(API + p, { method: 'POST', body: JSON.stringify(Object.assign({ uid: user()?.uid }, b)) }).then((r) => r.json());
  const err = (code) => Object.assign(new Error(code), { code });
  const FV = { arrayUnion: (...x) => ({ __union: x }), arrayRemove: (...x) => ({ __remove: x }) };
  function Doc(path) { this.path = path; this.id = path.split('/').pop(); }
  Doc.prototype.collection = function (n) { return new Col(this.path + '/' + n); };
  Doc.prototype.get = async function () { const r = await post('/read', { path: this.path }); if (r.error) throw err(r.error); return snapDoc(this.id, r.doc); };
  Doc.prototype.set = async function (data, o) { const r = await post('/write', { ops: [{ op: 'set', path: this.path, data, merge: !!o?.merge }] }); if (r.error) throw err(r.error); tick(); };
  Doc.prototype.update = async function (data) { const r = await post('/write', { ops: [{ op: 'update', path: this.path, data }] }); if (r.error) throw err(r.error); tick(); };
  Doc.prototype.delete = async function () { const r = await post('/write', { ops: [{ op: 'delete', path: this.path }] }); if (r.error) throw err(r.error); tick(); };
  Doc.prototype.onSnapshot = function (cb, ecb) { return listen(this.path, (r) => cb(snapDoc(this.id, r.doc)), ecb); };
  function Col(path) { this.path = path; }
  Col.prototype.doc = function (id) { return new Doc(this.path + '/' + id); };
  Col.prototype.onSnapshot = function (cb, ecb) { return listen(this.path, (r) => cb({ docs: r.docs.map((d) => snapDoc(d.id, d.data)) }), ecb); };
  const snapDoc = (id, d) => ({ id, exists: !!d, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined), metadata: { hasPendingWrites: false } });
  const subs = new Set();
  function listen(path, cb, ecb) {
    const s = { path, cb, ecb, last: null, on: true }; subs.add(s); poll(s); return () => { s.on = false; subs.delete(s); };
  }
  async function poll(s) { if (!s.on) return; const r = await post('/read', { path: s.path }); if (!s.on) return;
    if (r.error) { if (s.last !== 'E') { s.last = 'E'; s.ecb?.(err(r.error)); } return; }
    const j = JSON.stringify(r); if (j !== s.last) { s.last = j; s.cb(r); } }
  function tick() { setTimeout(() => subs.forEach(poll), 30); }
  setInterval(() => subs.forEach(poll), 250);
  function Batch() { this.ops = []; }
  Batch.prototype.set = function (ref, data, o) { this.ops.push({ op: 'set', path: ref.path, data, merge: !!o?.merge }); };
  Batch.prototype.delete = function (ref) { this.ops.push({ op: 'delete', path: ref.path }); };
  Batch.prototype.commit = async function () { const r = await post('/write', { ops: this.ops }); if (r.error) throw err(r.error); tick(); };
  const fs = { collection: (n) => new Col(n), batch: () => new Batch(), enablePersistence: () => Promise.resolve() };
  const authCbs = [];
  const auth = { onAuthStateChanged: (cb) => { authCbs.push(cb); setTimeout(() => cb(user()), 50); }, get currentUser() { return user(); },
    signInWithEmailAndPassword: async (e) => { window.__mockUser = { uid: 'uid_' + e.split('@')[0], email: e }; localStorage.setItem('__mockUser', JSON.stringify(window.__mockUser)); authCbs.forEach((c) => c(user())); },
    createUserWithEmailAndPassword: async (e, p) => auth.signInWithEmailAndPassword(e, p), signOut: async () => { window.__mockUser = null; authCbs.forEach((c) => c(null)); }, sendPasswordResetEmail: async () => {} };
  try { window.__mockUser = JSON.parse(localStorage.getItem('__mockUser')); } catch {}
  const firestore = () => fs; firestore.FieldValue = FV;
  const messaging = () => ({}); messaging.isSupported = () => false;
  window.firebase = { initializeApp: () => {}, auth: () => auth, firestore, messaging };
})();
