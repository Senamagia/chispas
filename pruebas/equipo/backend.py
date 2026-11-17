"""Nube de pruebas: imita Firestore y aplica las reglas de equipos (las mismas que se publican)."""
import json, sys, copy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
DB = {}; LOG = []
def parent(path): return '/'.join(path.split('/')[:2])
def regla(op, path, uid, nuevo):
    p = path.split('/'); viejo = DB.get(path)
    if p[0] == 'users': return uid and p[1] == uid
    if p[0] in ('avisos', 'tokens'): return bool(uid)
    if p[0] != 'equipos': return False
    if not uid: return False
    eq = DB.get(parent(path))
    if len(p) == 2:  # documento del equipo
        if op == 'get': return True
        if op == 'delete': return viejo and viejo['owner'] == uid
        if viejo is None: return op in ('set',) and nuevo.get('owner') == uid and nuevo.get('miembros') == [uid]
        miembro = uid in viejo.get('miembros', [])
        cambiadas = {k for k in set(viejo) | set(nuevo) if viejo.get(k) != nuevo.get(k)}
        nombres_ok = {k for k in set(viejo.get('nombres', {})) | set(nuevo.get('nombres', {})) if viejo.get('nombres', {}).get(k) != nuevo.get('nombres', {}).get(k)} <= {uid}
        if miembro and nuevo.get('owner') == viejo['owner'] and nuevo.get('miembros') == viejo['miembros'] and nombres_ok and (nuevo.get('verPrecios') == viejo.get('verPrecios') or uid == viejo['owner']): return True
        unirse = (not miembro and cambiadas <= {'miembros', 'nombres'} and set(nuevo['miembros']) >= set(viejo['miembros']) and len(nuevo['miembros']) == len(viejo['miembros']) + 1 and uid in nuevo['miembros'] and nombres_ok)
        salir = (miembro and uid != viejo['owner'] and cambiadas <= {'miembros', 'nombres'} and [m for m in viejo['miembros'] if m != uid] == nuevo['miembros'])
        return unirse or salir
    if eq is None: return False
    if p[2] == 'items': return uid in eq['miembros']
    if p[2] == 'privado':
        if op in ('get', 'list'): return uid == eq['owner'] or (uid in eq['miembros'] and eq.get('verPrecios') is True)
        return uid == eq['owner']
    return False
def aplica(op):
    kind, path, data = op['op'], op['path'], op.get('data')
    if kind == 'delete': return None
    cur = copy.deepcopy(DB.get(path)) if (op.get('merge') or kind == 'update') else {}
    if kind == 'update' and DB.get(path) is None: raise KeyError('no existe')
    cur = cur or {}
    for k, v in (data or {}).items():
        tgt, keys = cur, k.split('.')
        for kk in keys[:-1]: tgt = tgt.setdefault(kk, {})
        last = keys[-1]
        if isinstance(v, dict) and '__union' in v: tgt[last] = list(tgt.get(last, [])) + [x for x in v['__union'] if x not in tgt.get(last, [])]
        elif isinstance(v, dict) and '__remove' in v: tgt[last] = [x for x in tgt.get(last, []) if x not in v['__remove']]
        else: tgt[last] = v
    return cur
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Methods', '*')
    def do_OPTIONS(self): self.send_response(204); self.cors(); self.end_headers()
    def resp(self, o, code=200):
        b = json.dumps(o).encode(); self.send_response(code); self.cors(); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])) or b'{}'); uid = body.get('uid')
        if self.path == '/read':
            path = body['path']; parts = path.split('/')
            if len(parts) % 2 == 0:
                if not regla('get', path, uid, None): return self.resp({'error': 'permission-denied'})
                return self.resp({'doc': DB.get(path)})
            if not regla('list', path + '/x', uid, None): return self.resp({'error': 'permission-denied'})
            pre = path + '/'
            return self.resp({'docs': [{'id': k[len(pre):], 'data': v} for k, v in sorted(DB.items()) if k.startswith(pre) and '/' not in k[len(pre):]]})
        if self.path == '/write':
            nuevos = {}
            for op in body['ops']:
                try: n = aplica(op)
                except KeyError: return self.resp({'error': 'not-found'})
                if not regla(op['op'] if op['op'] == 'delete' else 'set', op['path'], uid, n):
                    LOG.append(('DENEGADO', uid, op['path'])); return self.resp({'error': 'permission-denied'})
                nuevos[op['path']] = n
            for k, v in nuevos.items():
                if v is None: DB.pop(k, None)
                else: DB[k] = v
            return self.resp({'ok': True})
        if self.path == '/debug': return self.resp({'db': DB, 'log': LOG})
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
