// El monigote bombilla de Chispas (mismo dibujo que el logo del lienzo).
const CHISPAS_COLORS = { noche: '#231A4F', luz: '#FFD84D', brillo: '#FFF3B0', fil: '#FF7A1A', crema: '#FFF8E7', metal: '#B9B4C9' };
let _guyId = 0;

function chispasGuy({ line = CHISPAS_COLORS.crema, anim = false, glow = true } = {}) {
  const C = CHISPAS_COLORS, id = 'g' + (++_guyId);
  const a = (c) => (anim ? ` class="g-${c}"` : '');
  const rays = ['M100 6 V16', 'M52 24 L59 31', 'M148 24 L141 31', 'M34 62 H44', 'M166 62 H156']
    .map((d, i) => `<path${a('ray')} style="animation-delay:${(i * 0.2).toFixed(1)}s" d="${d}" stroke="${C.luz}" stroke-width="6" stroke-linecap="round"/>`).join('');
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${C.brillo}" stop-opacity=".9"/><stop offset=".55" stop-color="${C.luz}" stop-opacity=".35"/><stop offset="1" stop-color="${C.luz}" stop-opacity="0"/></radialGradient></defs>
  <g${a('hop')}>
    ${glow ? `<circle${a('glow')} cx="100" cy="60" r="62" fill="url(#${id})"/>` + rays : ''}
    <path${a('bulb')} d="M100 24 C121 24 136 40 136 60 C136 75 128 83 122 90 C119 94 118 98 118 102 H82 C82 98 81 94 78 90 C72 83 64 75 64 60 C64 40 79 24 100 24 Z" fill="${C.luz}" stroke="${line}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M76 52 C78 42 85 36 93 34" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>
    <circle cx="88" cy="60" r="4.5" fill="${C.noche}"/><circle cx="112" cy="60" r="4.5" fill="${C.noche}"/>
    <path d="M88 72 Q94 80 100 72 Q106 80 112 72" fill="none" stroke="${C.fil}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="82" y="102" width="36" height="8" rx="3" fill="${C.metal}" stroke="${line}" stroke-width="4"/>
    <rect x="85" y="110" width="30" height="8" rx="3" fill="${C.metal}" stroke="${line}" stroke-width="4"/>
    <path d="M92 118 H108 L104 124 H96 Z" fill="${line}"/>
    <path d="M100 124 V172 M100 172 L82 222 M100 172 L118 222 M82 222 H72 M118 222 H128" fill="none" stroke="${line}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M100 140 L74 164" fill="none" stroke="${line}" stroke-width="8" stroke-linecap="round"/>
    <g transform="rotate(-35 70 168)"><rect x="66" y="166" width="8" height="30" rx="4" fill="${C.metal}" stroke="${line}" stroke-width="3.5"/><path d="M60 196 a10 10 0 1 0 20 0 h-6 v6 h-8 v-6 z" fill="${C.metal}" stroke="${line}" stroke-width="3.5" stroke-linejoin="round"/></g>
    <g${a('arm')}><path d="M100 140 L126 120 L134 94" fill="none" stroke="${line}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="135" cy="88" r="7.5" fill="${line}"/></g>
  </g>`;
}

// Icono cuadrado (fondo noche) para cabeceras.
function chispasIcon(size = 48) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true"><rect width="200" height="200" rx="52" fill="${CHISPAS_COLORS.noche}"/><g transform="translate(26 14) scale(.74)">${chispasGuy()}</g></svg>`;
}
