/**
 * saga-art.js — animated pixel-art scenes for the saga library.
 *
 * Each scene is a 96×54 colour grid rendered to inline SVG, plus a handful of
 * pixel-sized overlay groups animated with CSS (see the `.saga-*` rules in
 * css/style.css). Nothing is fetched, nothing is random at runtime and the
 * whole scene stays crisp when scaled. All motion is decorative; the scene is
 * hidden from assistive technology and described by the figure caption.
 */

const W = 96;
const H = 54;

const C = {
  night0: '#0a0e1a',
  night1: '#0f1728',
  night2: '#16223a',
  night3: '#1f3150',
  night4: '#2b4466',
  dusk: '#3d5878',
  horizon: '#5a7186',
  cloud: '#27364f',
  cloudLight: '#3b4f6e',
  star: '#f6e8b8',
  moon: '#f2e8cb',
  moonShade: '#c7bfa8',
  aurora1: '#54cfa2',
  aurora2: '#6d9bf0',
  aurora3: '#a97ad6',

  mountFar: '#23334b',
  mountNear: '#182537',
  snow: '#dbe5e6',
  snowShade: '#a9bcc6',
  ice: '#9fd4dc',

  ground: '#1c2b24',
  ground2: '#253a2c',
  grass: '#456b3f',
  grass2: '#31502f',
  grass3: '#5c8548',
  mud: '#3b3025',

  wood: '#6b4a31',
  woodDark: '#463022',
  woodLight: '#8c6442',
  roof: '#3a2b22',
  turf: '#3f5b35',
  plaster: '#b39a73',
  window: '#ffcb66',
  fire: '#ef8a3d',
  fire2: '#ffd166',
  fire3: '#c4502f',

  water: '#17364a',
  water2: '#24536d',
  water3: '#357a91',
  foam: '#93d3dc',

  gold: '#dcb05a',
  gold2: '#f6dd92',
  goldDim: '#8f6d2c',
  stone: '#b9ae96',
  iron: '#8b9aa4',
  ironDark: '#4e5b65',
  ironLight: '#c3ced4',
  bone: '#e9dfc9',
  skin: '#d2a67c',
  cloak: '#574a70',
  cloakDark: '#3a3150',

  rune: '#77e3c1',
  runeDim: '#2d7a68',
  green: '#6fc07a',
  deepGreen: '#2e5738',
  red: '#cf5545',
  redDark: '#8c342c',
  ember: '#f6a45a',
  ember2: '#ffd98a',
  purple: '#9668c4',
  violet: '#5f4380',
  black: '#0c1017',
  white: '#fbf6e6',
  shadow: '#161d29',
  smoke: '#59616c',
  smokeLight: '#7c8791',
  ghost: '#8fe6c9',
  helGreen: '#5f9d6d',
};

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

function hashString(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]);
}

class Grid {
  constructor(width = W, height = H) {
    this.width = width;
    this.height = height;
    this.rows = Array.from({ length: height }, () => Array(width).fill(null));
  }

  set(x, y, color) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    this.rows[py][px] = color;
  }

  rect(x, y, width, height, color) {
    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        this.set(x + column, y + row, color);
      }
    }
  }

  toSvg() {
    let markup = '';
    for (let y = 0; y < this.height; y += 1) {
      let x = 0;
      while (x < this.width) {
        const color = this.rows[y][x];
        if (!color) {
          x += 1;
          continue;
        }
        let run = 1;
        while (x + run < this.width && this.rows[y][x + run] === color) run += 1;
        markup += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${color}"/>`;
        x += run;
      }
    }
    return markup;
  }
}

const r = (x, y, width, height, fill, className = '', style = '') =>
  `<rect${className ? ` class="${className}"` : ''} x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"${style ? ` style="${style}"` : ''}/>`;

const group = (className, inner, style = '') =>
  `<g${className ? ` class="${className}"` : ''}${style ? ` style="${style}"` : ''}>${inner}</g>`;

/* ------------------------------------------------------------------ */
/* Reusable scenery                                                    */
/* ------------------------------------------------------------------ */

function skyBands(g, colors, height = 34) {
  const step = height / colors.length;
  colors.forEach((color, index) => {
    g.rect(0, Math.round(index * step), W, Math.ceil(step) + 1, color);
  });
}

function starField(seed, count, maxY = 28, { golden = 0.22, minY = 1 } = {}) {
  const random = mulberry32(hashString(seed));
  let markup = '';
  for (let index = 0; index < count; index += 1) {
    const x = Math.floor(random() * W);
    const y = minY + Math.floor(random() * Math.max(1, maxY - minY));
    const size = random() < 0.16 ? 2 : 1;
    const color = random() < golden ? C.gold2 : C.star;
    const delay = (random() * 7).toFixed(2);
    const duration = (2.6 + random() * 3.6).toFixed(2);
    markup += r(x, y, size, 1, color, 'saga-twinkle', `animation-delay:-${delay}s;animation-duration:${duration}s`);
    if (size === 2 && random() < 0.5) markup += r(x, y + 1, 1, 1, color, 'saga-twinkle', `animation-delay:-${delay}s;animation-duration:${duration}s`);
  }
  return group('saga-stars', markup);
}

function aurora(seed, { y = 7, height = 14, start = 8, end = 88, color = C.aurora1 } = {}) {
  const random = mulberry32(hashString(seed));
  let markup = '';
  for (let x = start; x < end; x += 3) {
    const wave = Math.sin((x + seed.length * 7) * 0.13) * 2.4 + Math.sin(x * 0.31) * 1.1;
    const columnHeight = 3 + Math.round((Math.sin(x * 0.19 + 1.3) + 1) * (height / 4) + random() * 2);
    const top = Math.round(y + wave + (height - columnHeight) / 2);
    const shade = random() < 0.28 ? C.aurora2 : random() < 0.14 ? C.aurora3 : color;
    markup += r(x, top, 2, columnHeight, shade, 'saga-aurora-pixel', `opacity:${(0.28 + random() * 0.32).toFixed(2)}`);
    markup += r(x, top + 1, 1, Math.max(1, columnHeight - 2), C.gold2, 'saga-aurora-pixel', 'opacity:.12');
  }
  return group('saga-aurora', markup);
}

function mountains(g, { baseY = 32, color = C.mountFar, snowColor = C.snow, seed = 'mount', maxHeight = 12, minHeight = 3, start = 0, end = W } = {}) {
  const random = mulberry32(hashString(seed));
  const phase = random() * Math.PI * 2;
  const phase2 = random() * Math.PI * 2;
  for (let x = start; x < end; x += 1) {
    const wave = (Math.sin(x * 0.12 + phase) + 1) / 2;
    const ridge = (Math.sin(x * 0.37 + phase2) + 1) / 2;
    const height = Math.round(minHeight + wave * maxHeight + ridge * (maxHeight / 3));
    g.rect(x, baseY - height, 1, height, color);
    if (height > maxHeight * 0.62) {
      const cap = Math.max(1, Math.round(height * 0.18));
      g.rect(x, baseY - height, 1, cap, snowColor);
      if (height > maxHeight * 0.9) g.rect(x + (x % 2), baseY - height + cap, 1, 1, C.snowShade);
    }
  }
}

function cloudBank(g, seed, { y = 6, count = 4, color = C.cloud } = {}) {
  const random = mulberry32(hashString(seed));
  for (let index = 0; index < count; index += 1) {
    const x = Math.floor(random() * W);
    const cy = y + Math.floor(random() * 8);
    const width = 10 + Math.floor(random() * 18);
    g.rect(x, cy, width, 2, color);
    g.rect(x + 3, cy - 1, Math.max(2, width - 8), 1, color);
    if (width > 18) g.rect(x + 7, cy - 2, 6, 1, color);
  }
}

function water(g, { y = 36, color = C.water, shade = C.water2, foam = C.foam, seed = 'water', paint = true } = {}) {
  if (paint) g.rect(0, y, W, H - y, color);
  const random = mulberry32(hashString(seed));
  for (let row = y + 2; row < H; row += 3) {
    for (let x = 0; x < W; x += 2) {
      if (random() < 0.34) g.rect(x, row, 2 + (random() < 0.2 ? 1 : 0), 1, shade);
    }
  }
  let markup = '';
  for (let band = 0; band < 4; band += 1) {
    const by = y + 3 + band * 4;
    let dashes = '';
    for (let x = -4; x < W + 4; x += 7) {
      const offset = (band * 3 + x) % 5 === 0 ? 2 : 0;
      dashes += r(x + offset, by, 3 + (band % 2), 1, foam, 'saga-wave-pixel', `opacity:${0.28 + band * 0.08}`);
    }
    markup += group('saga-wave', dashes, `animation-delay:-${(band * 0.9).toFixed(1)}s;animation-duration:${(3.4 + band * 0.55).toFixed(1)}s`);
  }
  return group('saga-water-motion', markup);
}

function pine(g, x, baseY, height, color = C.deepGreen, trunk = C.woodDark) {
  g.rect(x, baseY - height, 1, height, trunk);
  const layers = Math.max(3, Math.round(height / 3));
  for (let layer = 0; layer < layers; layer += 1) {
    const y = baseY - height + 1 + layer * 2;
    const half = Math.max(1, Math.round((layer + 1) * (height / layers) * 0.34));
    g.rect(x - half, y, half * 2 + 1, 2, color);
  }
  g.rect(x, baseY - height - 1, 1, 2, color);
}

function disc(g, centreX, centreY, radius, color) {
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y <= radius * radius) g.set(centreX + x, centreY + y, color);
    }
  }
}

function longhouse(g, x, baseY, width = 28, height = 9) {
  const top = baseY - height;
  // roof
  for (let layer = 0; layer < 8; layer += 1) {
    const inset = Math.max(0, 7 - layer);
    const color = layer < 2 ? C.turf : layer < 3 ? C.grass2 : C.roof;
    g.rect(x + inset, top - 8 + layer, width - inset * 2, 1, color);
  }
  // walls
  g.rect(x, top, width, height, C.wood);
  g.rect(x, top, width, 1, C.woodLight);
  g.rect(x, baseY - 1, width, 1, C.woodDark);
  for (let beam = 4; beam < width; beam += 6) {
    g.rect(x + beam, top, 1, height, C.woodDark);
  }
  // door
  const doorX = x + Math.floor(width / 2) - 2;
  g.rect(doorX, baseY - 5, 4, 5, C.woodDark);
  g.rect(doorX + 1, baseY - 4, 2, 4, C.black);
  g.rect(doorX + 2, baseY - 3, 1, 1, C.gold);
  // windows
  for (const offset of [4, width - 8]) {
    g.rect(x + offset, top + 3, 4, 3, C.window, 'saga-window-glow', 'animation-delay:-1.2s');
    g.rect(x + offset, top + 3, 1, 3, C.woodDark);
    g.rect(x + offset + 3, top + 3, 1, 3, C.woodDark);
  }
  // chimney + smoke
  const chimneyX = x + Math.floor(width * 0.3);
  g.rect(chimneyX, top - 10, 3, 5, C.woodDark);
  g.rect(chimneyX - 1, top - 10, 5, 1, C.snowShade);
  return group(
    'saga-smoke',
    r(chimneyX, top - 14, 2, 2, C.smokeLight, 'saga-smoke-puff') +
      r(chimneyX + 2, top - 18, 3, 2, C.smoke, 'saga-smoke-puff', 'animation-delay:-1.1s') +
      r(chimneyX + 5, top - 22, 4, 2, C.smoke, 'saga-smoke-puff', 'animation-delay:-2.2s'),
  );
}

function ship(g, x, y, scale = 1, { sail = true, lights = false } = {}) {
  const s = (value) => Math.round(value * scale);
  g.rect(x, y + s(2), s(22), s(2), C.woodDark);
  g.rect(x + s(2), y + s(4), s(18), s(1), C.wood);
  g.rect(x + s(7), y + s(1), s(8), s(2), C.wood);
  g.rect(x + s(10), y - s(10), s(1), s(11), C.woodDark);
  if (sail) {
    g.rect(x + s(11), y - s(9), s(8), s(7), C.bone);
    g.rect(x + s(12), y - s(8), s(2), s(5), C.red);
    g.rect(x + s(15), y - s(8), s(2), s(5), C.red);
    g.rect(x + s(11), y - s(9), s(8), s(1), C.snowShade);
  }
  for (let shield = 0; shield < 6; shield += 1) {
    g.rect(x + s(2 + shield * 3), y + s(1), s(2), s(1), shield % 2 ? C.gold : C.red);
  }
  if (lights) {
    g.rect(x + s(4), y + s(1), s(1), s(1), C.window);
    g.rect(x + s(17), y + s(1), s(1), s(1), C.window);
  }
}

function raven(x, y, scale = 1, { delay = 0 } = {}) {
  const s = (value) => Math.round(value * scale);
  const body = `<path d="M0 0h${s(3)}v${s(1)}h${s(2)}v${s(1)}h-${s(1)}v${s(1)}h-${s(2)}v-${s(1)}h-${s(2)}z" fill="${C.black}"/>`;
  const wingUp = `<path d="M${s(1)} ${-s(2)}h${s(2)}v${s(1)}h${s(2)}v${s(1)}h-${s(4)}z" fill="${C.black}"/>`;
  const wingDown = `<path d="M${s(1)} ${s(1)}h${s(3)}v${s(1)}h${s(2)}v${s(1)}h-${s(5)}z" fill="${C.black}"/>`;
  return group(
    'saga-raven',
    `<g transform="translate(${x} ${y})">${body}${group('saga-flap-a', wingUp)}${group('saga-flap-b', wingDown)}${r(s(4), 0, s(1), s(1), C.gold)}</g>`,
    `animation-delay:-${delay}s`,
  );
}

function flame(x, y, width = 5, height = 7, { delay = 0 } = {}) {
  const outer = r(x, y + 2, width, height - 2, C.fire3) + r(x + 1, y, Math.max(1, width - 2), height, C.fire);
  const inner = r(x + Math.max(1, Math.floor(width / 3)), y + 3, Math.max(1, width - 2), Math.max(1, height - 3), C.fire2);
  return group('saga-flame', outer + inner, `animation-delay:-${delay}s`);
}

function firePit(g, x, y, width = 9) {
  g.rect(x, y, width, 2, C.woodDark);
  g.rect(x + 1, y - 1, width - 2, 1, C.wood);
  return flame(x + 2, y - 7, Math.max(3, width - 4), 7, { delay: 0.4 }) +
    group('saga-glow', r(x - 2, y - 9, width + 4, 10, C.fire2, 'saga-fire-glow', 'opacity:.1'));
}

function snowField(seed, count = 34) {
  const random = mulberry32(hashString(seed));
  let markup = '';
  for (let index = 0; index < count; index += 1) {
    const x = Math.floor(random() * W);
    const size = random() < 0.2 ? 2 : 1;
    const delay = (random() * 14).toFixed(2);
    const duration = (9 + random() * 8).toFixed(2);
    markup += r(x, -6, size, size, C.snow, 'saga-snow', `animation-delay:-${delay}s;animation-duration:${duration}s`);
  }
  return group('saga-weather', markup);
}

function rain(seed, count = 30, color = C.ice) {
  const random = mulberry32(hashString(seed));
  let markup = '';
  for (let index = 0; index < count; index += 1) {
    const x = Math.floor(random() * (W + 20)) - 10;
    const delay = (random() * 4).toFixed(2);
    const duration = (1.4 + random() * 1.2).toFixed(2);
    markup += r(x, -8, 1, 4, color, 'saga-rain', `animation-delay:-${delay}s;animation-duration:${duration}s;opacity:${(0.2 + random() * 0.4).toFixed(2)}`);
  }
  return group('saga-weather', markup);
}

function embers(seed, count = 20) {
  const random = mulberry32(hashString(seed));
  let markup = '';
  for (let index = 0; index < count; index += 1) {
    const x = 8 + Math.floor(random() * 78);
    const y = 30 + Math.floor(random() * 20);
    const delay = (random() * 6).toFixed(2);
    const duration = (3 + random() * 3).toFixed(2);
    markup += r(x, y, 1, 1, random() < 0.4 ? C.ember2 : C.ember, 'saga-ember', `animation-delay:-${delay}s;animation-duration:${duration}s`);
  }
  return group('saga-embers', markup);
}

function sparks(seed, count = 18) {
  const random = mulberry32(hashString(seed));
  let markup = '';
  for (let index = 0; index < count; index += 1) {
    const x = 44 + Math.floor(random() * 18);
    const y = 34 + Math.floor(random() * 4);
    markup += r(x, y, 1, 1, random() < 0.5 ? C.fire2 : C.ember, 'saga-spark', `animation-delay:-${(random() * 2).toFixed(2)}s;animation-duration:${(1 + random() * 1.4).toFixed(2)}s`);
  }
  return group('saga-sparks', markup);
}

function lightning(seed) {
  const random = mulberry32(hashString(seed));
  let bolt = '';
  let x = 44 + Math.floor(random() * 18);
  let y = 2;
  for (let step = 0; step < 9; step += 1) {
    bolt += r(x, y, 2, 2, C.ice, 'saga-bolt-pixel');
    x += random() < 0.5 ? -2 : 2;
    y += 2;
  }
  return group('saga-flash', r(0, 0, W, 34, C.ice) + bolt, 'animation-delay:-2.8s');
}

function wolfSprite(g, x, y, scale, color = C.shadow, eye = C.gold2, { rim = null, breath = true } = {}) {
  // A clear side profile facing right: low bushy tail, long back, high neck,
  // pricked ears, a real snout and four legs with paws.
  const parts = [
    [4, 6, 18, 7],   // barrel
    [2, 7, 4, 6],    // rump
    [21, 5, 4, 7],   // neck
    [23, 4, 7, 6],   // head
    [24, 3, 5, 2],   // forehead
    [29, 6, 5, 3],   // muzzle
    [33, 6, 2, 2],   // nose
    [29, 9, 3, 1],   // jaw
    [0, 4, 3, 3],    // tail tip
    [0, 7, 4, 4],    // tail
    [5, 12, 4, 5],   // foreleg
    [11, 12, 4, 5],  // foreleg
    [17, 12, 4, 5],  // hind leg
    [23, 12, 4, 5],  // hind leg
    [4, 16, 6, 2],   // paw
    [10, 16, 6, 2],  // paw
    [16, 16, 6, 2],  // paw
    [22, 16, 6, 2],  // paw
    [23, 1, 3, 3],   // ear
    [27, 1, 3, 3],   // ear
  ];
  if (rim) {
    for (const [dx, dy] of [[0, -1], [-1, 0]]) {
      parts.forEach(([px, py, pw, ph]) => {
        g.rect(x + (px + dx) * scale, y + (py + dy) * scale, pw * scale, ph * scale, rim);
      });
    }
  }
  parts.forEach(([px, py, pw, ph]) => {
    g.rect(x + px * scale, y + py * scale, pw * scale, ph * scale, color);
  });
  // rough fur along the spine, and a little moonlight on the shoulder
  [8, 12, 16].forEach((px) => g.rect(x + px * scale, y + 5 * scale, 2 * scale, scale, color));
  g.rect(x + 6 * scale, y + 7 * scale, 7 * scale, 1, C.mountNear);
  g.rect(x + 22 * scale, y + 10 * scale, 3 * scale, 1, C.mountNear);
  // eye, nose highlight and a pale fang
  g.rect(x + 28 * scale, y + 6 * scale, Math.max(1, Math.round(scale)), Math.max(1, Math.round(scale)), eye);
  g.rect(x + 33 * scale, y + 6 * scale, Math.max(1, Math.round(scale)), Math.max(1, Math.round(scale)), C.ironLight);
  g.rect(x + 31 * scale, y + 8 * scale, scale, scale, C.bone);
  if (!breath) return '';
  return group(
    'saga-wolf-breath',
    r(x + 35 * scale, y + 7 * scale, 2 * scale, 2, C.snow, 'saga-breath-puff') +
      r(x + 37 * scale, y + 5 * scale, 2 * scale, 2, C.snowShade, 'saga-breath-puff', 'animation-delay:-1.4s'),
  );
}

function serpent(g, x, y, scale = 2, color = C.deepGreen, eye = C.gold2) {
  const coils = [
    [0, 10, 20, 3],
    [14, 7, 4, 3],
    [16, 3, 4, 4],
    [11, 1, 5, 2],
    [4, 8, 3, 2],
    [2, 5, 3, 3],
    [6, 2, 3, 3],
  ];
  coils.forEach(([cx, cy, cw, ch]) => g.rect(x + cx * scale, y + cy * scale, cw * scale, ch * scale, color));
  g.rect(x + 8 * scale, y + 1 * scale, 2 * scale, 2 * scale, color);
  g.rect(x + 8 * scale, y + 1 * scale, scale, scale, eye);
  return group(
    'saga-serpent',
    r(x + 17 * scale, y + 2 * scale, scale, scale, eye, 'saga-eye-glow') +
      r(x + 10 * scale, y + 6 * scale, scale, scale, C.ice, 'saga-eye-glow', 'animation-delay:-1.5s'),
  );
}

/* ------------------------------------------------------------------ */
/* Scenes                                                              */
/* ------------------------------------------------------------------ */

const scenes = {
  fjord(g) {
    skyBands(g, [C.night0, C.night1, C.night2, C.night3, C.night4, C.dusk], 32);
    mountains(g, { baseY: 34, color: C.mountFar, seed: 'fjord-far', maxHeight: 11, minHeight: 4 });
    mountains(g, { baseY: 37, color: C.mountNear, seed: 'fjord-near', maxHeight: 7, minHeight: 2 });
    // moon
    disc(g, 80, 10, 6, C.moonShade);
    disc(g, 80, 9, 5, C.moon);
    g.rect(79, 8, 2, 2, C.moonShade);
    g.rect(82, 10, 1, 1, C.moonShade);
    g.rect(80, 12, 2, 1, C.moonShade);
    // ground, village and shore
    const wave = water(g, { y: 36, seed: 'fjord-water' });
    g.rect(0, 35, 44, 5, C.ground);
    g.rect(0, 38, 44, 3, C.ground2);
    longhouse(g, 8, 39, 30, 10);
    pine(g, 2, 39, 15, C.deepGreen);
    pine(g, 40, 39, 11, C.deepGreen);
    // dock
    g.rect(42, 42, 18, 2, C.wood);
    g.rect(45, 44, 2, 5, C.woodDark);
    g.rect(56, 44, 2, 5, C.woodDark);
    ship(g, 58, 40, 1, { lights: true });
    // foreground pines and rocks
    pine(g, 84, 42, 17, C.deepGreen);
    pine(g, 91, 40, 12, C.deepGreen);
    g.rect(70, 47, 9, 3, C.ground2);
    g.rect(72, 46, 4, 1, C.grass2);
    return starField('fjord-stars', 46, 26) +
      aurora('fjord-aurora', { y: 5, height: 13, start: 4, end: 74 }) +
      wave +
      raven(60, 16, 1.5, { delay: 3 }) +
      lightning('fjord-storm');
  },

  circle(g) {
    skyBands(g, [C.night0, C.night1, C.night2, C.night3, C.night4], 34);
    mountains(g, { baseY: 36, color: C.mountFar, seed: 'circle-mountains', maxHeight: 10, minHeight: 3 });
    g.rect(0, 36, W, H - 36, C.ground);
    g.rect(0, 40, W, H - 40, C.ground2);
    // a worn path through the heath
    for (let x = 18; x < 78; x += 3) g.rect(x, 41 + Math.round(Math.sin(x * 0.2) * 2), 2, 1, C.mud);
    // stone ring: varied uprights, one lintel and one fallen stone
    const stones = [
      [9, 28, 4, 11, C.stone],
      [23, 24, 5, 14, C.moonShade],
      [34, 22, 4, 10, C.stone],
      [50, 26, 4, 11, C.stone],
      [64, 23, 5, 14, C.moonShade],
      [81, 29, 4, 9, C.stone],
      [44, 24, 3, 8, C.moonShade],
      [57, 22, 3, 9, C.stone],
    ];
    stones.forEach(([x, y, width, height, shade], index) => {
      g.rect(x - 1, y + height, width + 2, 1, C.black);
      g.rect(x, y, width, height, shade);
      g.rect(x, y, width, 1, C.snow);
      g.rect(x, y + 1, 1, height - 1, C.snowShade);
      g.rect(x + width - 1, y + 1, 1, height - 1, C.mountNear);
      g.rect(x + 1, y + height - 2, width - 2, 1, C.grass2);
      g.rect(x + 1, y + 3, 1, 2, C.rune, 'saga-rune-glow', `animation-delay:-${index * 0.4}s`);
      if (index % 2 === 0) g.rect(x + width - 2, y + 5, 1, 2, C.rune, 'saga-rune-glow', `animation-delay:-${index * 0.4 + 0.2}s`);
    });
    // lintel across two rear stones
    g.rect(23, 20, 16, 2, C.stone);
    g.rect(23, 20, 16, 1, C.snow);
    g.rect(24, 22, 14, 1, C.mountNear);
    // fallen stone
    g.rect(69, 38, 9, 3, C.moonShade);
    g.rect(71, 37, 5, 1, C.snowShade);
    g.rect(70, 40, 7, 1, C.grass2);
    // altar stone and a watching raven
    g.rect(38, 36, 20, 3, C.stone);
    g.rect(38, 36, 20, 1, C.snowShade);
    g.rect(40, 33, 3, 3, C.moon);
    g.rect(40, 33, 3, 1, C.snow);
    g.rect(34, 18, 3, 2, C.black);
    g.rect(35, 17, 2, 1, C.black);
    g.rect(36, 18, 1, 1, C.gold2, 'saga-eye-glow');
    // Odin as a cloaked wanderer
    g.rect(57, 29, 7, 10, C.cloakDark);
    g.rect(58, 26, 5, 4, C.cloak);
    g.rect(59, 24, 3, 3, C.skin);
    g.rect(58, 23, 5, 2, C.black);
    g.rect(59, 23, 4, 1, C.woodDark);
    g.rect(60, 33, 2, 6, C.cloakDark);
    g.rect(63, 30, 1, 12, C.woodDark);
    g.rect(63, 29, 2, 1, C.ironLight);
    g.rect(61, 27, 1, 1, C.gold2, 'saga-eye-glow');
    g.rect(60, 28, 1, 1, C.black);
    pine(g, 3, 40, 15, C.deepGreen);
    pine(g, 90, 42, 18, C.deepGreen);
    return starField('circle-stars', 40, 28) +
      aurora('circle-aurora', { y: 4, height: 10, start: 56, end: 94, color: C.aurora3 }) +
      group('saga-mist', r(0, 39, W, 2, C.ice, 'saga-mist-pixel', 'opacity:.14')) +
      raven(64, 14, 1.3, { delay: 1.4 });
  },

  well(g) {
    g.rect(0, 0, W, H, C.night0);
    // roots of the world tree framing the chamber
    const rootColor = C.woodDark;
    for (let x = 0; x < 28; x += 1) {
      const y = 2 + Math.round(Math.sin(x * 0.17) * 3 + x * 0.7);
      g.rect(x, y, 3, 4, rootColor);
      g.rect(W - x - 3, y + 7, 3, 4, rootColor);
    }
    for (let y = 4; y < 34; y += 2) {
      g.rect(0, y, 12 + (y % 7), 2, rootColor);
      g.rect(W - 16 - (y % 7), y + 2, 16 + (y % 7), 2, rootColor);
    }
    g.rect(0, 38, W, H - 38, C.ground);
    // stone well
    g.rect(26, 36, 44, 9, C.moonShade);
    g.rect(24, 39, 48, 4, C.stone);
    g.rect(30, 32, 36, 5, C.moonShade);
    g.rect(29, 32, 1, 9, C.snowShade);
    g.rect(66, 32, 1, 9, C.snowShade);
    // glow and water
    g.rect(32, 34, 32, 3, C.runeDim);
    g.rect(34, 34, 28, 2, C.rune, 'saga-water-glow');
    for (let x = 35; x < 62; x += 5) g.rect(x, 35, 2, 1, C.white, 'saga-water-glint', `animation-delay:-${(x % 4) * 0.4}s`);
    // runes on the rim
    g.rect(27, 37, 1, 2, C.rune, 'saga-rune-glow');
    g.rect(31, 37, 1, 2, C.rune, 'saga-rune-glow', 'animation-delay:-.6s');
    g.rect(63, 37, 1, 2, C.rune, 'saga-rune-glow', 'animation-delay:-1.1s');
    g.rect(68, 37, 1, 2, C.rune, 'saga-rune-glow', 'animation-delay:-1.7s');
    // Mimir's eye floating above the water
    g.rect(45, 27, 8, 4, C.bone);
    g.rect(46, 26, 6, 1, C.bone);
    g.rect(46, 31, 6, 1, C.snowShade);
    g.rect(48, 28, 2, 2, C.rune, 'saga-eye-glow');
    g.rect(49, 28, 1, 1, C.black);
    g.rect(44, 24, 10, 1, C.rune, 'saga-rune-glow', 'opacity:.2');
    pine(g, 4, 42, 15, C.deepGreen);
    pine(g, 90, 44, 18, C.deepGreen);
    return group('saga-motes', Array.from({ length: 18 }, (_, index) => r(20 + ((index * 11) % 58), 10 + ((index * 7) % 26), 1, 1, C.rune, 'saga-mote', `animation-delay:-${(index * 0.4).toFixed(1)}s;animation-duration:${(3 + (index % 4)).toFixed(1)}s`)).join('')) +
      group('saga-eye-blink', r(48, 28, 2, 2, C.bone), 'animation-delay:-3s');
  },

  tree(g) {
    skyBands(g, [C.night0, C.night1, C.night2, C.night3], 33);
    mountains(g, { baseY: 38, color: C.mountNear, seed: 'tree-hills', maxHeight: 6, minHeight: 2 });
    g.rect(0, 38, W, H - 38, C.ground);
    g.rect(0, 43, W, H - 43, C.ground2);
    // central trunk, roots and branches
    const trunk = C.woodDark;
    g.rect(44, 12, 9, 34, trunk);
    g.rect(46, 10, 5, 4, trunk);
    g.rect(41, 43, 16, 3, trunk);
    g.rect(35, 46, 10, 2, trunk);
    g.rect(56, 46, 12, 2, trunk);
    g.rect(30, 48, 14, 2, trunk);
    // branches
    const branches = [
      [22, 16, 23, 2], [18, 12, 27, 1], [50, 14, 22, 2], [55, 10, 22, 1],
      [30, 8, 17, 1], [40, 6, 20, 1], [34, 22, 12, 2], [51, 22, 13, 2],
    ];
    branches.forEach(([x, y, width, height]) => g.rect(x, y, width, height, trunk));
    // leaf clusters
    const random = mulberry32(hashString('tree-leaves'));
    for (let index = 0; index < 70; index += 1) {
      const x = 8 + Math.floor(random() * 80);
      const y = 2 + Math.floor(random() * 24);
      if (Math.abs(x - 48) < 7 && y > 9) continue;
      g.rect(x, y, 1 + Math.floor(random() * 4), 1 + Math.floor(random() * 2), random() < 0.5 ? C.deepGreen : C.grass2);
    }
    // runes on the trunk
    for (let index = 0; index < 5; index += 1) {
      g.rect(46, 18 + index * 5, 1, 3, C.rune, 'saga-rune-glow', `animation-delay:-${index * 0.55}s`);
      g.rect(49, 20 + index * 4, 2, 1, C.rune, 'saga-rune-glow', `animation-delay:-${index * 0.55 + 0.2}s`);
    }
    // well at the root
    g.rect(64, 42, 14, 5, C.moonShade);
    g.rect(63, 44, 16, 3, C.stone);
    g.rect(66, 43, 10, 1, C.rune, 'saga-water-glow');
    // three small Norns
    for (let index = 0; index < 3; index += 1) {
      g.rect(28 + index * 4, 38, 2, 7, index === 1 ? C.cloak : C.cloakDark);
      g.rect(28 + index * 4, 36, 2, 2, C.skin);
    }
    pine(g, 2, 43, 14, C.deepGreen);
    pine(g, 92, 43, 16, C.deepGreen);
    return starField('tree-stars', 38, 28) +
      aurora('tree-aurora', { y: 2, height: 11, start: 6, end: 90, color: C.aurora2 }) +
      group('saga-leaves', Array.from({ length: 10 }, (_, index) => r(18 + ((index * 17) % 62), 6 + ((index * 9) % 18), 1, 1, C.grass3, 'saga-leaf', `animation-delay:-${(index * 0.9).toFixed(1)}s;animation-duration:${(7 + (index % 5)).toFixed(1)}s`)).join('')) +
      group('saga-motes', Array.from({ length: 12 }, (_, index) => r(20 + ((index * 13) % 58), 18 + ((index * 7) % 22), 1, 1, C.rune, 'saga-mote', `animation-delay:-${(index * 0.5).toFixed(1)}s`)).join(''));
  },

  asgard(g) {
    skyBands(g, [C.night0, C.night1, C.night2, C.night3, '#3b3a62'], 32);
    mountains(g, { baseY: 37, color: C.mountFar, seed: 'asgard-far', maxHeight: 9, minHeight: 3 });
    g.rect(0, 36, W, H - 36, C.ground2);
    // Bifröst bridge
    const colors = [C.red, C.ember, C.gold2, C.green, C.aurora1, C.aurora2, C.purple];
    colors.forEach((color, index) => {
      for (let x = 0; x < 46; x += 1) {
        const y = 51 - Math.round((x / 46) * 14) - index;
        g.rect(x, y, 1, 2, color, 'saga-bifrost', `opacity:${0.42 + index * 0.05}`);
      }
    });
    // golden hall
    g.rect(48, 22, 40, 17, C.goldDim);
    g.rect(50, 20, 36, 3, C.gold);
    for (let x = 50; x < 86; x += 4) {
      g.rect(x, 19, 1, 4, C.gold2);
      g.rect(x, 23, 3, 1, C.gold2);
    }
    // shield roof
    for (let row = 0; row < 3; row += 1) {
      for (let x = 52 + row * 2; x < 84 - row * 2; x += 6) {
        g.rect(x, 16 - row * 2, 4, 2, row % 2 ? C.red : C.gold2);
      }
    }
    g.rect(50, 23, 3, 16, C.gold2);
    g.rect(83, 23, 3, 16, C.gold2);
    // doors and windows
    g.rect(64, 30, 8, 9, C.woodDark);
    g.rect(66, 31, 4, 8, C.fire2, 'saga-window-glow');
    g.rect(66, 31, 4, 8, C.black, 'saga-door-shade');
    for (let x = 54; x < 82; x += 8) {
      g.rect(x, 27, 3, 4, C.window, 'saga-window-glow', `animation-delay:-${(x % 5) * 0.3}s`);
    }
    // ravens
    // banners
    g.rect(47, 24, 1, 14, C.woodDark);
    g.rect(47, 25, 3, 6, C.red);
    g.rect(88, 27, 1, 12, C.woodDark);
    g.rect(86, 28, 3, 6, C.aurora1);
    // Heimdall silhouette at the bridge foot
    g.rect(30, 39, 3, 9, C.ironDark);
    g.rect(30, 36, 3, 3, C.iron);
    g.rect(32, 37, 1, 1, C.gold2, 'saga-eye-glow');
    g.rect(33, 41, 1, 7, C.gold);
    return starField('asgard-stars-2', 42, 26) +
      raven(72, 12, 1.6, { delay: 2 }) +
      raven(58, 15, 1.2, { delay: 5 });
  },

  forge(g) {
    g.rect(0, 0, W, H, '#1a1310');
    g.rect(0, 0, W, 18, '#221813');
    // stone walls
    const random = mulberry32(hashString('forge-stones'));
    for (let y = 0; y < 34; y += 4) {
      for (let x = 0; x < W; x += 8) {
        const offset = y % 8 === 0 ? 4 : 0;
        g.rect(x + offset, y, 7, 3, random() < 0.35 ? '#3a2a21' : '#2e211b');
      }
    }
    g.rect(0, 34, W, H - 34, C.mud);
    // window with storm
    g.rect(66, 7, 20, 15, C.night2);
    g.rect(67, 8, 18, 13, C.night3);
    g.rect(76, 8, 1, 13, C.woodDark);
    g.rect(67, 14, 18, 1, C.woodDark);
    g.rect(68, 18, 6, 1, C.ice, 'saga-rain-pixel', 'opacity:.4');
    // forge
    g.rect(10, 22, 26, 16, C.woodDark);
    g.rect(12, 25, 22, 10, C.redDark);
    g.rect(15, 28, 16, 6, C.fire);
    g.rect(18, 30, 10, 4, C.fire2);
    g.rect(8, 20, 30, 3, C.ironDark);
    // hood
    g.rect(22, 8, 12, 6, C.ironDark);
    g.rect(24, 4, 8, 7, C.ironDark);
    g.rect(24, 14, 8, 2, C.black);
    // anvil
    g.rect(44, 34, 14, 4, C.iron);
    g.rect(47, 30, 8, 4, C.ironLight);
    g.rect(45, 29, 12, 1, C.ironLight);
    g.rect(48, 38, 6, 4, C.ironDark);
    // hammer on the anvil
    g.rect(49, 26, 8, 3, C.ironLight);
    g.rect(55, 25, 3, 5, C.wood);
    // Thor silhouette
    g.rect(76, 17, 13, 19, C.redDark);
    g.rect(77, 13, 10, 5, C.skin);
    g.rect(77, 11, 10, 3, C.gold);
    g.rect(79, 9, 2, 2, C.gold2);
    g.rect(83, 9, 2, 2, C.gold2);
    g.rect(80, 15, 1, 1, C.black);
    g.rect(84, 15, 1, 1, C.black);
    g.rect(79, 18, 7, 1, C.woodDark);
    // ground shadows
    g.rect(0, 42, W, 12, '#241a14');
    return group('saga-forge-glow', r(8, 22, 30, 18, C.fire, 'saga-fire-glow', 'opacity:.14')) +
      group('saga-flame', flame(15, 25, 16, 10, { delay: 0.3 })) +
      sparks('forge-sparks', 22) +
      group('saga-flash', r(66, 7, 20, 15, C.ice, 'saga-bolt-window', 'opacity:.3'), 'animation-delay:-4s') +
      embers('forge-embers', 14);
  },

  jotunheim(g) {
    skyBands(g, [C.night0, C.night1, C.night2, C.night3, C.dusk, C.horizon], 36);
    cloudBank(g, 'jotun-clouds', { y: 3, count: 9, color: C.cloud });
    mountains(g, { baseY: 37, color: C.mountFar, seed: 'jotun-far', maxHeight: 14, minHeight: 4 });
    mountains(g, { baseY: 40, color: C.mountNear, seed: 'jotun-near', maxHeight: 9, minHeight: 2 });
    g.rect(0, 40, W, H - 40, C.snowShade);
    g.rect(0, 44, W, H - 44, C.snow);
    // giant hall of blue ice: solid walls, snow roof and two buttresses
    g.rect(54, 16, 36, 24, '#2f4760');
    g.rect(52, 14, 40, 3, C.ice);
    g.rect(54, 12, 36, 2, C.snow);
    g.rect(54, 16, 36, 1, C.snowShade);
    g.rect(57, 19, 4, 21, C.ice);
    g.rect(84, 19, 4, 21, C.ice);
    g.rect(57, 19, 1, 21, C.snow);
    g.rect(87, 19, 1, 21, C.snowShade);
    for (let x = 62; x < 84; x += 5) {
      g.rect(x, 20, 1, 1, C.rune, 'saga-rune-glow', `animation-delay:-${x % 5 * 0.3}s`);
    }
    g.rect(66, 25, 12, 15, C.night0);
    g.rect(67, 26, 10, 14, C.helGreen, 'saga-window-glow', 'opacity:.6');
    g.rect(69, 28, 6, 10, '#1d3a2c');
    g.rect(69, 28, 6, 1, C.ice);
    // giant: a solid storm-blue body with an ice rim and a pale face
    g.rect(26, 9, 20, 26, C.ice);
    g.rect(29, 1, 14, 10, C.ice);
    g.rect(28, 0, 4, 4, C.ice);
    g.rect(39, 0, 4, 4, C.ice);
    g.rect(27, 13, 18, 22, '#33465f');
    g.rect(26, 13, 20, 5, '#3c536f');
    g.rect(30, 2, 12, 9, '#3c536f');
    g.rect(29, 0, 3, 4, '#33465f');
    g.rect(40, 0, 3, 4, '#33465f');
    g.rect(23, 14, 4, 18, '#33465f');
    g.rect(44, 14, 4, 18, '#33465f');
    g.rect(27, 31, 6, 4, '#2a3b51');
    g.rect(37, 31, 6, 4, '#2a3b51');
    g.rect(28, 12, 16, 1, C.ice);
    g.rect(24, 20, 4, 1, C.ice);
    g.rect(44, 20, 4, 1, C.ice);
    // face, beard, belt and hand
    g.rect(32, 5, 8, 6, C.moonShade);
    g.rect(33, 10, 6, 4, C.snowShade);
    g.rect(33, 6, 2, 2, C.helGreen, 'saga-eye-glow');
    g.rect(38, 6, 2, 2, C.helGreen, 'saga-eye-glow', 'animation-delay:-1.2s');
    g.rect(26, 21, 20, 2, C.woodDark);
    g.rect(34, 21, 4, 2, C.goldDim);
    g.rect(47, 17, 4, 3, C.moonShade);
    // a huge ice axe leaning against the hall
    g.rect(50, 7, 2, 29, C.woodDark);
    g.rect(46, 5, 10, 4, C.iron);
    g.rect(47, 4, 8, 2, C.ironLight);
    g.rect(48, 6, 3, 1, C.rune, 'saga-rune-glow');
    // frozen path and drifts
    for (let y = 44; y < 54; y += 2) {
      for (let x = 14; x < 64; x += 3) if ((x + y) % 5 === 0) g.rect(x, y, 2, 1, C.snowShade);
    }
    g.rect(12, 47, 14, 3, C.snowShade);
    g.rect(74, 48, 18, 3, C.snowShade);
    pine(g, 6, 44, 15, C.deepGreen);
    pine(g, 91, 45, 19, C.deepGreen);
    return snowField('jotun-snow', 48) +
      group('saga-flash', r(0, 0, W, 26, C.ice, 'saga-bolt-sky', 'opacity:.4'), 'animation-delay:-1.7s') +
      group('saga-mist', r(0, 40, W, 3, C.ice, 'saga-mist-pixel', 'opacity:.12'));
  },

  sea(g) {
    skyBands(g, [C.night0, C.night1, C.night2, C.night3, C.night4], 28);
    cloudBank(g, 'sea-clouds', { y: 2, count: 10, color: C.cloud });
    // moon
    disc(g, 78, 9, 5, C.moonShade);
    disc(g, 78, 8, 4, C.moon);
    g.rect(77, 7, 2, 2, C.moonShade);
    // waves
    const wave = water(g, { y: 28, seed: 'sea-water' });
    for (let y = 31; y < H; y += 3) {
      for (let x = 0; x < W; x += 4) {
        if ((x + y) % 7 < 3) g.rect(x, y, 3, 1, C.water2);
      }
    }
    // longship, tilted on the swell
    ship(g, 18, 30, 2, { sail: true, lights: true });
    // serpent coils breaking the surface
    serpent(g, 52, 26, 2, C.deepGreen, C.gold2);
    g.rect(66, 31, 16, 2, C.water3);
    g.rect(69, 33, 12, 1, C.foam);
    // rain and spray
    return wave +
      rain('sea-rain', 34) +
      lightning('sea-lightning') +
      group('saga-wave', r(10, 33, 8, 1, C.foam, 'saga-wave-pixel'), 'animation-delay:-.4s');
  },

  pinewood(g) {
    skyBands(g, [C.night0, C.night1, C.night2, '#2a3e4a'], 32);
    // low crescent moon behind the pines
    disc(g, 12, 9, 7, C.moonShade);
    disc(g, 12, 8, 6, C.moon);
    disc(g, 16, 6, 5, C.night1);
    g.rect(9, 8, 2, 2, C.moonShade);
    g.rect(10, 11, 1, 1, C.moonShade);
    g.rect(0, 33, W, H - 33, C.ground);
    g.rect(0, 39, W, H - 39, C.ground2);
    // snow patches and a trodden path
    for (let index = 0; index < 26; index += 1) {
      const x = (index * 31) % W;
      const y = 37 + ((index * 7) % 13);
      g.rect(x, y, 2 + (index % 2), 1, C.snowShade);
    }
    for (let x = 20; x < 68; x += 4) g.rect(x, 49 + Math.round(Math.sin(x * 0.3) * 2), 2, 1, C.mud);
    // ruined longhouse
    g.rect(50, 22, 28, 14, C.woodDark);
    g.rect(51, 23, 26, 1, C.woodLight);
    g.rect(48, 20, 32, 2, C.roof);
    g.rect(48, 20, 32, 1, C.snow);
    g.rect(51, 24, 5, 12, C.wood);
    g.rect(62, 24, 4, 12, C.wood);
    g.rect(74, 24, 3, 12, C.wood);
    g.rect(63, 32, 6, 4, C.black);
    g.rect(56, 27, 4, 3, C.woodDark);
    g.rect(55, 26, 6, 1, C.snowShade);
    // broken roof and green fire inside
    g.rect(53, 17, 6, 3, C.roof);
    g.rect(53, 17, 6, 1, C.snow);
    g.rect(70, 18, 4, 2, C.roof);
    g.rect(66, 33, 6, 3, C.helGreen, 'saga-fire-glow', 'opacity:.45');
    g.rect(67, 30, 4, 3, '#1d3a2c');
    // wolf in a trap
    g.rect(27, 35, 14, 2, C.ironDark);
    g.rect(29, 33, 1, 5, C.iron);
    g.rect(38, 33, 1, 5, C.iron);
    g.rect(34, 32, 8, 1, C.iron);
    g.rect(34, 32, 2, 1, C.ironLight);
    const breath = wolfSprite(g, 18, 25, 1, C.shadow, C.gold2, { rim: C.snow });
    // pines with moonlit tips
    [4, 13, 84, 92, 76].forEach((x, index) => {
      pine(g, x, 41 + (index % 2), 15 + (index % 3) * 3, C.deepGreen);
      g.rect(x, 41 + (index % 2) - 15 - (index % 3) * 3, 1, 1, C.snowShade);
    });
    firePit(g, 72, 41, 8);
    return starField('wood-stars', 32, 24) +
      snowField('wood-snow', 22) +
      breath +
      group('saga-fireflies', Array.from({ length: 10 }, (_, index) => r(20 + ((index * 9) % 58), 30 + ((index * 5) % 12), 1, 1, C.fire2, 'saga-mote', `animation-delay:-${(index * 0.6).toFixed(1)}s;animation-duration:${(3 + (index % 3)).toFixed(1)}s`)).join(''));
  },

  cave(g) {
    g.rect(0, 0, W, H, C.black);
    // cave mouth and stone walls
    g.rect(0, 0, W, 8, '#1b1f24');
    for (let x = 0; x < W; x += 9) {
      g.rect(x, 0, 5, 8 + (x % 7), '#252b31');
      g.rect(x + 4, 0, 2, 5 + (x % 5), '#15191e');
    }
    g.rect(0, 36, W, H - 36, '#231f1c');
    // stalactites
    for (let x = 4; x < W; x += 11) {
      g.rect(x, 0, 3, 4 + (x % 6), '#32383f');
      g.rect(x + 1, 4 + (x % 6), 1, 3, '#3d444c');
    }
    // Loki bound on a stone slab
    g.rect(30, 34, 28, 4, C.stone);
    g.rect(32, 30, 18, 4, C.cloakDark);
    g.rect(30, 28, 4, 7, C.cloak);
    g.rect(48, 29, 5, 3, C.skin);
    g.rect(49, 28, 3, 2, C.redDark);
    for (let x = 34; x < 48; x += 4) g.rect(x, 32, 3, 1, C.ironLight);
    // serpent above
    g.rect(40, 12, 18, 3, C.deepGreen);
    g.rect(36, 15, 8, 3, C.deepGreen);
    g.rect(46, 9, 6, 3, C.deepGreen);
    g.rect(44, 10, 2, 2, C.gold2, 'saga-eye-glow');
    // dripping venom
    g.rect(45, 18, 1, 8, C.helGreen, 'saga-drip', 'animation-delay:-.3s');
    g.rect(45, 24, 1, 1, C.helGreen);
    // Sigyn with bowl
    g.rect(60, 28, 7, 11, C.cloak);
    g.rect(61, 25, 5, 3, C.skin);
    g.rect(60, 24, 7, 2, C.cloakDark);
    g.rect(61, 34, 5, 2, C.wood);
    g.rect(62, 33, 3, 1, C.gold);
    // torch
    g.rect(82, 20, 2, 18, C.woodDark);
    g.rect(81, 18, 4, 3, C.fire);
    // green cave pool
    g.rect(70, 42, 24, 6, C.runeDim);
    g.rect(72, 43, 20, 3, C.helGreen, 'saga-water-glow', 'opacity:.5');
    return group('saga-drips', r(45, 18, 1, 6, C.helGreen, 'saga-drip') + r(43, 20, 1, 4, C.helGreen, 'saga-drip', 'animation-delay:-1.2s') + r(47, 21, 1, 4, C.helGreen, 'saga-drip', 'animation-delay:-2.1s')) +
      group('saga-motes', Array.from({ length: 10 }, (_, index) => r(8 + ((index * 13) % 76), 18 + ((index * 7) % 20), 1, 1, C.helGreen, 'saga-mote', `animation-delay:-${(index * 0.5).toFixed(1)}s`)).join(''));
  },

  wolf(g) {
    skyBands(g, [C.night0, C.night1, C.night2, '#24334c'], 30);
    mountains(g, { baseY: 34, color: C.mountFar, seed: 'wolf-mountains', maxHeight: 8, minHeight: 2 });
    g.rect(0, 34, W, H - 34, C.snowShade);
    g.rect(0, 40, W, H - 40, C.snow);
    // frozen sea
    g.rect(0, 44, W, H - 44, C.ice);
    for (let x = 0; x < W; x += 6) g.rect(x, 46 + (x % 4), 4, 1, C.snowShade);
    // standing stones
    g.rect(8, 26, 5, 15, C.moonShade);
    g.rect(16, 30, 4, 11, C.stone);
    g.rect(86, 27, 5, 14, C.moonShade);
    // Fenrir, huge and bound
    const breath = wolfSprite(g, 22, 22, 1.7, C.shadow, C.gold2, { rim: C.snow });
    // Gleipnir: a collar at the neck, a short broken chain, and links in the snow
    g.rect(56, 36, 8, 2, C.ironDark);
    g.rect(56, 36, 8, 1, C.gold2, 'saga-chain-glow');
    g.rect(60, 38, 2, 1, C.gold2, 'saga-chain-glow');
    g.rect(61, 39, 2, 1, C.gold2, 'saga-chain-glow', 'animation-delay:-0.5s');
    g.rect(60, 40, 2, 1, C.gold2, 'saga-chain-glow', 'animation-delay:-1s');
    g.rect(48, 49, 2, 1, C.goldDim);
    g.rect(52, 50, 2, 1, C.gold2, 'saga-chain-glow');
    g.rect(44, 48, 1, 1, C.goldDim);
    // moon
    disc(g, 77, 9, 6, C.moonShade);
    disc(g, 77, 8, 5, C.moon);
    g.rect(75, 7, 2, 2, C.moonShade);
    g.rect(79, 10, 1, 1, C.moonShade);
    // tiny mortal silhouette
    g.rect(18, 38, 2, 6, C.cloak);
    g.rect(18, 36, 2, 2, C.skin);
    pine(g, 90, 42, 12, C.deepGreen);
    return starField('wolf-stars', 34, 24) +
      snowField('wolf-snow', 30) +
      breath +
      group('saga-aurora', aurora('wolf-aurora', { y: 2, height: 9, start: 2, end: 48, color: C.aurora3 })) +
      group('saga-flash', r(0, 0, W, 22, C.ice, 'saga-bolt-sky', 'opacity:.18'), 'animation-delay:-3.4s');
  },

  ragnarok(g) {
    skyBands(g, ['#1a0d10', '#331317', '#5a1d19', '#8c2e1e', '#c75a2a', '#e89645'], 36);
    cloudBank(g, 'rag-clouds', { y: 1, count: 12, color: '#4a1c1c' });
    mountains(g, { baseY: 38, color: '#2a1718', seed: 'rag-mountains', maxHeight: 9, minHeight: 2 });
    g.rect(0, 38, W, H - 38, '#241416');
    // burning world tree
    g.rect(42, 8, 9, 30, '#2a1a14');
    g.rect(44, 4, 5, 5, '#2a1a14');
    for (let x = 30; x < 62; x += 4) g.rect(x, 10 + (x % 7), 3, 2, '#2a1a14');
    for (let index = 0; index < 45; index += 1) {
      const x = 10 + (index * 37) % 76;
      const y = 4 + (index * 17) % 22;
      g.rect(x, y, 2, 1, index % 3 === 0 ? C.fire : index % 3 === 1 ? C.ember : '#7a2c1e');
    }
    // Surtr
    g.rect(72, 8, 16, 28, '#1d1114');
    g.rect(75, 2, 10, 8, '#1d1114');
    g.rect(73, 0, 3, 4, '#1d1114');
    g.rect(84, 0, 3, 4, '#1d1114');
    g.rect(77, 4, 2, 2, C.fire2, 'saga-eye-glow');
    g.rect(82, 4, 2, 2, C.fire2, 'saga-eye-glow', 'animation-delay:-1.3s');
    // flaming sword
    g.rect(88, 2, 4, 34, C.fire);
    g.rect(89, 1, 2, 36, C.ember2);
    // Fenrir and serpent silhouettes
    const breath = wolfSprite(g, 4, 29, 1.2, '#160b0e', C.fire2, { rim: C.fire, breath: false });
    // ground fire
    for (let x = 0; x < W; x += 7) g.rect(x, 44 + (x % 3), 4, 2, C.fire3);
    return starField('rag-ash', 26, 18, { golden: 0.8 }) +
      breath +
      embers('rag-embers', 34) +
      group('saga-smoke', Array.from({ length: 8 }, (_, index) => r(34 + ((index * 11) % 30), 20 - index * 2, 3, 2, C.smoke, 'saga-smoke-puff', `animation-delay:-${(index * 0.8).toFixed(1)}s`)).join('')) +
      group('saga-flash', r(0, 0, W, 28, C.ember2, 'saga-bolt-sky', 'opacity:.28'), 'animation-delay:-2s') +
      lightning('rag-lightning');
  },

  meadow(g) {
    skyBands(g, ['#8fc4d8', '#a8d3df', '#c6e2e4', '#e4eedf', '#f6efd2'], 30);
    // sun
    g.rect(72, 5, 10, 10, '#ffe9a8');
    g.rect(74, 3, 6, 14, '#ffe9a8');
    g.rect(73, 4, 8, 12, '#fff6cc');
    // clouds
    g.rect(14, 8, 16, 3, '#f4f4ea');
    g.rect(18, 6, 8, 2, '#f4f4ea');
    g.rect(54, 12, 12, 2, '#f4f4ea');
    // hills
    for (let x = 0; x < W; x += 1) {
      const h = Math.round(7 + Math.sin(x * 0.08) * 3 + Math.sin(x * 0.21) * 1.4);
      g.rect(x, 36 - h, 1, h, C.grass);
      g.rect(x, 42 - Math.round(h / 2), 1, 6, C.grass2);
    }
    g.rect(0, 42, W, H - 42, C.grass);
    g.rect(0, 48, W, H - 48, C.grass2);
    // young ash tree
    g.rect(44, 25, 3, 17, C.wood);
    g.rect(41, 23, 9, 2, C.woodDark);
    g.rect(38, 19, 5, 3, C.grass3);
    g.rect(45, 15, 8, 4, C.grass3);
    g.rect(48, 20, 6, 3, C.green);
    g.rect(40, 17, 6, 3, C.green);
    g.rect(35, 22, 4, 2, C.grass3);
    // sapling sprout in foreground
    g.rect(28, 43, 1, 6, C.woodDark);
    g.rect(25, 42, 3, 1, C.green);
    g.rect(29, 40, 3, 1, C.green);
    g.rect(26, 43, 1, 1, C.grass3);
    // two tiny survivors
    g.rect(60, 39, 2, 6, C.cloak);
    g.rect(60, 37, 2, 2, C.skin);
    g.rect(64, 40, 2, 5, C.cloakDark);
    g.rect(64, 38, 2, 2, C.skin);
    // flowers
    for (let index = 0; index < 22; index += 1) {
      const x = (index * 37) % W;
      const y = 44 + ((index * 11) % 8);
      g.rect(x, y, 1, 1, index % 3 ? C.gold2 : C.white);
    }
    return group('saga-sun-glow', r(70, 3, 14, 14, C.gold2, 'saga-sun-glow-pixel', 'opacity:.18')) +
      group('saga-birds', r(16, 16, 2, 1, C.black, 'saga-bird') + r(21, 13, 2, 1, C.black, 'saga-bird', 'animation-delay:-1.4s') + r(26, 18, 2, 1, C.black, 'saga-bird', 'animation-delay:-2.6s')) +
      group('saga-leaves', r(36, 21, 1, 1, C.grass3, 'saga-leaf') + r(50, 16, 1, 1, C.grass3, 'saga-leaf', 'animation-delay:-2s')) +
      group('saga-butterflies', r(20, 38, 2, 1, C.gold2, 'saga-butterfly') + r(72, 36, 2, 1, C.white, 'saga-butterfly', 'animation-delay:-2.4s'));
  },

  empty(g) {
    skyBands(g, ['#202830', '#2c363d', '#3d4a4f', '#5a6664', '#7a8780'], 34);
    cloudBank(g, 'empty-clouds', { y: 2, count: 9, color: '#36424a' });
    mountains(g, { baseY: 34, color: '#39434a', seed: 'empty-mountains', maxHeight: 7, minHeight: 2 });
    const wave = water(g, { y: 34, seed: 'empty-water', color: '#263a44', shade: '#35505b', foam: '#9ab3b5' });
    g.rect(0, 34, W, 2, '#52605f');
    // wet shore, lighter than the sea so the horizon reads
    g.rect(0, 36, W, H - 36, '#5b5041');
    g.rect(0, 36, W, 1, '#8a7b61');
    g.rect(0, 47, W, H - 47, '#463d32');
    for (let index = 0; index < 30; index += 1) {
      const x = (index * 29) % W;
      const y = 38 + ((index * 11) % 10);
      g.rect(x, y, 2, 1, index % 3 ? '#6b5d49' : '#7f7058');
    }
    // distant cottage with one warm window
    g.rect(72, 33, 17, 8, C.woodDark);
    g.rect(70, 31, 21, 2, C.roof);
    g.rect(70, 31, 21, 1, C.snowShade);
    g.rect(75, 35, 5, 4, C.window, 'saga-window-glow');
    g.rect(83, 35, 5, 4, C.woodDark);
    g.rect(84, 36, 2, 1, C.gold);
    // upturned boat, clear keel and ribs, with a lantern
    g.rect(19, 41, 25, 2, C.woodDark);
    g.rect(21, 39, 21, 2, C.wood);
    g.rect(22, 38, 2, 1, C.woodLight);
    g.rect(38, 38, 2, 1, C.woodLight);
    for (let x = 24; x < 41; x += 4) g.rect(x, 39, 1, 3, C.woodDark);
    g.rect(22, 41, 21, 1, C.woodLight);
    g.rect(45, 39, 2, 4, C.ironDark);
    g.rect(45, 38, 2, 2, C.gold2, 'saga-window-glow');
    g.rect(44, 36, 4, 4, C.gold2, 'saga-fire-glow', 'opacity:.12');
    // lone figure with a closed hand, facing the water
    g.rect(57, 34, 5, 11, C.cloakDark);
    g.rect(58, 31, 3, 3, C.skin);
    g.rect(57, 28, 5, 3, C.cloak);
    g.rect(56, 29, 2, 7, C.cloak);
    g.rect(62, 37, 1, 8, C.woodDark);
    g.rect(62, 36, 3, 1, C.ironLight);
    // one star and its reflection
    g.rect(70, 7, 2, 2, C.star, 'saga-twinkle');
    g.rect(70, 7, 4, 4, C.star, 'saga-glow-soft', 'opacity:.08');
    for (let y = 36; y < 41; y += 2) g.rect(70 + (y % 2), y, 1, 1, C.star, 'saga-water-glint');
    // rain and gray water
    return wave +
      rain('empty-rain', 22, '#a9babc') +
      group('saga-glow', r(42, 35, 8, 10, C.gold2, 'saga-fire-glow', 'opacity:.14') + r(73, 33, 9, 8, C.gold2, 'saga-fire-glow', 'opacity:.1')) +
      group('saga-mist', r(0, 33, W, 2, C.ice, 'saga-mist-pixel', 'opacity:.1'));
  },

  greyfield(g) {
    // A sunless morning: grey paddies, a muted torii and no warmth anywhere.
    skyBands(g, ['#3c474f', '#525f66', '#69757a', '#858f90', '#b5b5a9'], 30);
    cloudBank(g, 'grey-clouds', { y: 3, count: 10, color: '#7f8b8f' });
    cloudBank(g, 'grey-clouds-low', { y: 17, count: 6, color: '#9aa3a1' });
    mountains(g, { baseY: 32, color: '#485257', seed: 'grey-hills', maxHeight: 8, minHeight: 3, snowColor: '#9ba5a2' });
    // flooded rice paddies in bands
    g.rect(0, 31, W, H - 31, '#5f6c58');
    g.rect(0, 36, W, 5, '#53675f');
    g.rect(0, 41, W, H - 41, '#465a4e');
    for (let row = 0; row < 4; row += 1) {
      g.rect(0, 34 + row * 5, W, 1, '#77836b');
      for (let x = 2 + (row % 3); x < W; x += 17) {
        g.rect(x, 35 + row * 5, 9, 2, '#6d8884', 'saga-water-glint', `opacity:${(0.18 + row * 0.04).toFixed(2)}`);
      }
    }
    // low village roofs
    for (const [x, y, width] of [[6, 36, 16], [27, 38, 12], [80, 37, 11]]) {
      g.rect(x, y, width, 2, '#3a3a34');
      g.rect(x + 2, y + 2, width - 4, 3, '#5d5548');
      g.rect(x + 3, y + 3, 2, 1, '#8d806a');
    }
    // bare tree on the left
    g.rect(9, 26, 2, 11, '#4b4036');
    g.rect(6, 24, 3, 1, '#4b4036');
    g.rect(11, 21, 1, 4, '#4b4036');
    g.rect(5, 20, 4, 1, '#3c342d');
    g.rect(12, 18, 3, 1, '#3c342d');
    // torii on the far bank, faded by the grey light
    g.rect(69, 28, 2, 8, '#8d4f46');
    g.rect(79, 28, 2, 8, '#8d4f46');
    g.rect(66, 26, 18, 2, '#9d5a4e');
    g.rect(68, 23, 14, 1, '#a96858');
    // a small figure with a hoe, looking at the empty sky
    g.rect(41, 38, 3, 7, '#4d5b6b');
    g.rect(42, 35, 2, 3, C.skin);
    g.rect(41, 34, 4, 2, '#2d2925');
    g.rect(46, 35, 1, 10, C.wood);
    g.rect(46, 34, 3, 1, C.iron);
    return group('saga-mist', r(0, 30, W, 4, '#d2d8d4', 'saga-mist-pixel', 'opacity:.2')) +
      group('saga-birds', r(24, 13, 2, 1, '#3b4448', 'saga-bird') + r(31, 17, 2, 1, '#3b4448', 'saga-bird', 'animation-delay:-1.4s'));
  },

  dryfield(g) {
    // The hungry season: cracked earth, dead stalks and an empty cooking pot.
    skyBands(g, ['#6d7f8e', '#8e9d9c', '#b6b49b', '#d3c39b', '#e6d2a3'], 27);
    cloudBank(g, 'dry-clouds', { y: 3, count: 7, color: '#d3d3c0' });
    // distant volcano, dusty rather than green
    g.rect(54, 16, 32, 11, '#6d6252');
    g.rect(61, 13, 18, 4, '#81745e');
    g.rect(68, 10, 5, 4, '#9b8b70');
    g.rect(69, 9, 3, 1, '#d4c8a8');
    // baked earth
    g.rect(0, 26, W, H - 26, '#9a7b50');
    g.rect(0, 35, W, H - 35, '#85683f');
    g.rect(0, 45, W, H - 45, '#745a36');
    for (let i = 0; i < 16; i += 1) {
      const x = (i * 29) % W;
      const y = 29 + ((i * 11) % 20);
      g.rect(x, y, 6 + (i % 4), 1, '#6d5435');
      g.rect(x + 2, y + 1, 1, 3, '#6d5435');
      g.rect(x + 5, y - 1, 1, 2, '#6d5435');
    }
    // dead maize stalks
    for (const [x, height] of [[13, 15], [22, 11], [72, 13], [82, 9], [89, 16]]) {
      g.rect(x, 45 - height, 1, height, '#79603b');
      g.rect(x - 3, 45 - height + 5, 3, 1, '#8c7143');
      g.rect(x + 1, 45 - height + 8, 3, 1, '#8c7143');
      g.rect(x, 45 - height - 1, 1, 2, '#a58a55');
    }
    // clay pot, tipped over, with nothing inside
    g.rect(40, 37, 12, 8, '#a66d43');
    g.rect(39, 35, 14, 2, '#c18454');
    g.rect(42, 38, 8, 1, '#8a5836');
    g.rect(41, 40, 10, 2, '#b77a4b');
    g.rect(50, 44, 3, 1, '#8a5836');
    // a small figure kneeling by the pot
    g.rect(55, 39, 3, 7, '#8c4e3c');
    g.rect(56, 36, 2, 3, C.skin);
    g.rect(55, 35, 4, 2, '#33261f');
    g.rect(58, 42, 3, 1, C.skin);
    return group('saga-motes', Array.from({ length: 9 }, (_, index) => r(4 + ((index * 17) % 78), 30 + ((index * 7) % 13), 1, 1, '#e3cfa0', 'saga-mote', `animation-delay:-${(index * 0.6).toFixed(1)}s`)).join('')) +
      group('saga-birds', r(31, 12, 2, 1, '#4b4a42', 'saga-bird') + r(38, 16, 2, 1, '#4b4a42', 'saga-bird', 'animation-delay:-1.1s'));
  },

  grove(g) {
    // A warm forest at first light: broad mango trees, a path, and a small
    // monkey-shaped shadow in the branches.
    skyBands(g, ['#3f5f7a', '#6f8790', '#b98f78', '#e8b482', '#f6d89e'], 28);
    cloudBank(g, 'grove-clouds', { y: 4, count: 6, color: '#e9c9b3' });
    // low sun behind the trees
    disc(g, 72, 15, 8, C.goldDim);
    disc(g, 72, 14, 6, C.gold2);
    // forest floor
    g.rect(0, 34, W, H - 34, '#4d6b47');
    g.rect(0, 41, W, H - 41, '#3d573c');
    // winding path
    for (let y = 36; y < H; y += 2) {
      const x = 46 - Math.round((y - 36) * 0.4);
      g.rect(x, y, 8 + Math.round((y - 36) * 0.5), 2, '#a88c60');
    }
    const mangoTree = (x, base) => {
      g.rect(x + 4, base - 18, 3, 18, '#5a3f2d');
      g.rect(x, base - 25, 18, 8, '#2f5738');
      g.rect(x + 3, base - 29, 12, 7, '#3f7146');
      g.rect(x + 6, base - 32, 7, 5, '#548a51');
      g.rect(x + 10, base - 24, 9, 5, '#35603c');
      for (let i = 0; i < 7; i += 1) {
        const fx = x + 4 + ((i * 7) % 12);
        const fy = base - 22 - ((i * 5) % 7);
        g.rect(fx, fy, 2, 2, i % 2 ? '#e8b44f' : '#f4cf72');
      }
    };
    mangoTree(2, 51);
    mangoTree(77, 50);
    // broad leaves framing the top edge
    for (const [x, y, w] of [[0, 0, 18], [18, 2, 12], [76, 0, 20], [64, 4, 10]]) {
      g.rect(x, y, w, 5, '#2d5138');
      g.rect(x + 2, y + 5, Math.max(4, w - 4), 3, '#3e6a44');
    }
    // a small figure with a basket, setting out at dawn
    g.rect(38, 39, 3, 7, '#b35d45');
    g.rect(39, 36, 2, 3, C.skin);
    g.rect(38, 35, 4, 2, '#2b241f');
    g.rect(42, 42, 3, 3, C.gold);
    // Hanuman as a small monkey shadow in the high branches
    g.rect(71, 24, 3, 4, '#2a2521');
    g.rect(72, 22, 2, 2, '#2a2521');
    g.rect(75, 23, 2, 1, '#2a2521');
    g.rect(69, 27, 2, 1, '#2a2521');
    g.rect(74, 28, 3, 1, '#2a2521');
    return group('saga-glow', r(64, 8, 18, 16, C.gold2, 'saga-glow-soft', 'opacity:.1')) +
      group('saga-motes', Array.from({ length: 10 }, (_, index) => r(8 + ((index * 13) % 76), 30 + ((index * 7) % 12), 1, 1, '#ffe2a4', 'saga-mote', `animation-delay:-${(index * 0.5).toFixed(1)}s`)).join(''));
  },

  court(g) {
    // Indra's court: a bright terrace of gold and white, with Airavata and
    // the vajra at rest. Deliberately unlike the Norse halls.
    skyBands(g, ['#5e7fa8', '#8aa6b9', '#d2b18c', '#f0cf9e', '#f8e4b6'], 25);
    cloudBank(g, 'court-clouds', { y: 3, count: 7, color: '#f6e7c8' });
    cloudBank(g, 'court-clouds-low', { y: 25, count: 5, color: '#e5d3ad' });
    // pale marble terrace
    g.rect(0, 33, W, H - 33, '#e4dcc6');
    g.rect(0, 37, W, 2, '#c9bda2');
    g.rect(0, 46, W, H - 46, '#d5cab1');
    // gold pillars with lotus capitals
    for (const x of [9, 27, 69, 87]) {
      g.rect(x, 15, 4, 22, '#d7ad55');
      g.rect(x, 15, 1, 22, '#f7e0a0');
      g.rect(x + 3, 15, 1, 22, '#a98034');
      g.rect(x - 2, 13, 8, 2, '#f0cf7a');
      g.rect(x - 1, 11, 6, 2, '#c79a43');
      g.rect(x - 2, 36, 8, 2, '#b98d3f');
    }
    // scalloped arch across the back
    g.rect(31, 12, 34, 2, '#caa04e');
    g.rect(35, 9, 26, 3, '#e6c579');
    g.rect(39, 7, 18, 2, '#f2d99b');
    // low throne
    g.rect(40, 27, 16, 8, '#c49a45');
    g.rect(42, 25, 12, 3, '#e8c778');
    g.rect(43, 28, 10, 4, '#9d7430');
    // white elephant, Airavata, with a red and gold cloth
    g.rect(61, 34, 15, 7, '#f2eee2');
    g.rect(74, 32, 6, 8, '#f2eee2');
    g.rect(77, 40, 2, 4, '#e3ddcf');
    g.rect(66, 41, 3, 4, '#e3ddcf');
    g.rect(71, 41, 3, 4, '#e3ddcf');
    g.rect(63, 32, 3, 7, '#f8f5ea');
    g.rect(75, 33, 2, 1, '#4d4438');
    g.rect(72, 29, 9, 4, '#b84f3f');
    g.rect(73, 28, 7, 1, '#e4b85d');
    g.rect(69, 36, 2, 2, '#b84f3f');
    // the vajra on its stand
    g.rect(22, 39, 3, 7, '#8f6a2f');
    g.rect(18, 37, 11, 2, '#e8c778');
    g.rect(21, 34, 5, 3, '#f4dfa5');
    g.rect(19, 33, 2, 1, '#f4dfa5');
    g.rect(26, 33, 2, 1, '#f4dfa5');
    // a small figure looking up
    g.rect(49, 38, 3, 7, '#8e5a43');
    g.rect(50, 35, 2, 3, C.skin);
    g.rect(49, 34, 4, 2, '#33251e');
    // flower petals on the marble
    for (let i = 0; i < 12; i += 1) {
      g.rect(4 + ((i * 19) % 88), 45 + ((i * 7) % 6), 1, 1, i % 2 ? '#d87958' : '#f2d78c');
    }
    return group('saga-glow', r(4, 6, 88, 16, C.gold2, 'saga-glow-soft', 'opacity:.08')) +
      group('saga-motes', Array.from({ length: 9 }, (_, index) => r(6 + ((index * 17) % 82), 8 + ((index * 11) % 30), 1, 1, '#fff0bd', 'saga-mote', `animation-delay:-${(index * 0.6).toFixed(1)}s`)).join(''));
  },

  window(g) {
    // A quiet room at dusk: the last light in a hand mirror on the sill.
    g.rect(0, 0, W, H, '#2a2436');
    g.rect(0, 0, W, 6, '#372d43');
    g.rect(0, 46, W, H - 46, '#3b2f3d');
    // window opening
    g.rect(25, 7, 46, 35, '#191a2b');
    g.rect(28, 10, 40, 29, '#3b4b68');
    // dusk bands and a low sun outside
    g.rect(28, 10, 40, 7, '#425a7a');
    g.rect(28, 17, 40, 8, '#7a7189');
    g.rect(28, 25, 40, 7, '#c68b7b');
    g.rect(28, 32, 40, 7, '#e7b98b');
    disc(g, 57, 31, 4, C.gold2);
    // rooftops and a tree beyond the glass
    g.rect(28, 36, 12, 3, '#2b3342');
    g.rect(43, 34, 9, 5, '#303a4a');
    g.rect(53, 37, 10, 2, '#29313f');
    g.rect(35, 30, 1, 6, '#2c2b32');
    g.rect(32, 28, 7, 3, '#33402f');
    // window frame and sill
    g.rect(25, 7, 3, 36, '#5a4437');
    g.rect(68, 7, 3, 36, '#5a4437');
    g.rect(25, 7, 46, 3, '#5a4437');
    g.rect(45, 10, 2, 30, '#5a4437');
    g.rect(28, 24, 40, 2, '#5a4437');
    g.rect(22, 42, 52, 4, '#6b4d3c');
    g.rect(22, 42, 52, 1, '#8c684e');
    // curtains
    g.rect(16, 4, 9, 42, '#4b3442');
    g.rect(18, 6, 5, 36, '#5d4050');
    g.rect(71, 4, 9, 42, '#4b3442');
    g.rect(73, 6, 5, 36, '#5d4050');
    // the hand mirror, catching the last light
    g.rect(35, 36, 12, 7, '#b78a4e');
    g.rect(36, 35, 10, 2, '#d9b36b');
    g.rect(37, 37, 8, 5, '#f4dfb0');
    g.rect(39, 38, 4, 2, '#fff3cf');
    g.rect(45, 41, 3, 1, '#8f6a3c');
    // a small plant on the sill
    g.rect(56, 39, 4, 4, '#6e4d3b');
    g.rect(54, 36, 2, 3, '#4d754c');
    g.rect(58, 34, 2, 5, '#5a8352');
    g.rect(61, 37, 2, 3, '#4d754c');
    return group('saga-glow', r(34, 34, 18, 12, C.gold2, 'saga-glow-soft', 'opacity:.1')) +
      group('saga-motes', Array.from({ length: 7 }, (_, index) => r(36 + ((index * 11) % 16), 10 + ((index * 7) % 24), 1, 1, '#ffe9b3', 'saga-mote', `animation-delay:-${(index * 0.7).toFixed(1)}s`)).join(''));
  },

  olive(g) {
    skyBands(g, ['#1c2a43', '#384a67', '#7d6570', '#cf9270', '#f2ca8b'], 30);
    cloudBank(g, 'olive-clouds', { y: 3, count: 7, color: '#8d6f72' });
    mountains(g, { baseY: 31, color: '#4b4a5c', seed: 'olive-far', maxHeight: 8, minHeight: 2, snowColor: '#e8c9a0' });
    // sea behind the hill
    water(g, { y: 31, color: '#2d5261', shade: '#3f7180', foam: '#c9e0d2', seed: 'olive-sea' });
    g.rect(0, 35, W, H - 35, '#4c6a43');
    g.rect(0, 43, W, H - 43, '#5f7d4b');
    // terraces
    for (let row = 0; row < 4; row += 1) {
      g.rect(0, 38 + row * 4, W, 1, row % 2 ? '#75905a' : '#3d5838');
    }
    // white columns and a low temple front on the right
    g.rect(68, 23, 22, 2, C.stone);
    g.rect(66, 21, 26, 3, C.bone);
    for (const x of [69, 76, 83]) {
      g.rect(x, 25, 3, 12, C.stone);
      g.rect(x, 25, 1, 12, C.bone);
      g.rect(x - 1, 24, 5, 1, C.bone);
    }
    g.rect(67, 37, 24, 2, C.snowShade);
    // olive tree on the left: twisted trunk and silver-green canopy
    g.rect(18, 28, 3, 12, C.wood);
    g.rect(20, 24, 2, 6, C.woodDark);
    g.rect(12, 21, 3, 4, C.wood);
    g.rect(25, 20, 3, 5, C.wood);
    g.rect(9, 18, 9, 3, '#7d9a67');
    g.rect(15, 15, 12, 4, '#8fae76');
    g.rect(21, 18, 13, 3, '#6f8e5f');
    g.rect(7, 20, 7, 3, '#6f8e5f');
    g.rect(13, 17, 5, 2, '#a9c18a');
    g.rect(23, 16, 5, 2, '#a9c18a');
    for (let i = 0; i < 10; i += 1) {
      g.rect(8 + ((i * 13) % 24), 18 + ((i * 5) % 6), 1, 1, '#c7d8a5');
    }
    // little olives
    for (let i = 0; i < 6; i += 1) {
      g.rect(12 + ((i * 11) % 20), 20 + ((i * 7) % 5), 1, 1, '#2f3d28');
    }
    // two small figures on the path
    g.rect(49, 36, 2, 6, C.cloak);
    g.rect(49, 34, 2, 2, C.skin);
    g.rect(54, 37, 2, 5, C.woodDark);
    g.rect(54, 35, 2, 2, C.skin);
    return group('saga-birds', r(54, 7, 2, 1, C.black, 'saga-bird') + r(59, 5, 2, 1, C.black, 'saga-bird', 'animation-delay:-1.8s')) +
      group('saga-leaves', r(11, 19, 1, 1, '#c7d8a5', 'saga-leaf') + r(27, 20, 1, 1, '#c7d8a5', 'saga-leaf', 'animation-delay:-2.2s')) +
      group('saga-butterflies', r(44, 32, 2, 1, C.gold2, 'saga-butterfly') + r(60, 34, 2, 1, C.white, 'saga-butterfly', 'animation-delay:-2s'));
  },

  sunboat(g) {
    skyBands(g, ['#080b1a', '#11172f', '#1d2545', '#2d3157', '#4a3866'], 30);
    starField('sunboat-stars', 50, 28);
    // the sun barque on a dark river
    water(g, { y: 30, color: '#101f34', shade: '#1c3550', foam: '#c6a75e', seed: 'sunboat-water' });
    g.rect(0, 30, W, 1, '#6d5a74');
    // sun disk behind the boat
    disc(g, 64, 11, 7, C.goldDim);
    disc(g, 64, 10, 6, C.gold2);
    g.rect(61, 7, 3, 2, C.gold);
    // barque hull with high prow and stern
    g.rect(30, 31, 32, 3, C.woodDark);
    g.rect(32, 30, 28, 2, C.gold);
    g.rect(30, 28, 3, 4, C.gold2);
    g.rect(59, 27, 3, 5, C.gold2);
    g.rect(32, 31, 28, 1, C.gold2);
    // mast and solar sail
    g.rect(46, 18, 1, 13, C.woodDark);
    g.rect(38, 19, 17, 10, C.bone);
    g.rect(40, 21, 13, 1, C.gold);
    g.rect(40, 25, 13, 1, C.gold);
    g.rect(38, 19, 17, 1, C.gold2);
    // oars
    for (let x = 34; x < 58; x += 4) g.rect(x, 34, 3, 1, C.wood);
    // reflected gold on the river
    for (let y = 35; y < 44; y += 2) {
      g.rect(62 + (y % 3), y, 4, 1, C.gold2, 'saga-water-glint', `opacity:${(0.2 + (y % 3) * 0.08).toFixed(2)}`);
    }
    // reeds at the bank
    for (let x = 2; x < 18; x += 3) {
      g.rect(x, 28 - (x % 3), 1, 14, '#355d4b');
      g.rect(x + 1, 25 - (x % 4), 1, 4, '#4f7a5c');
    }
    for (let x = 82; x < 94; x += 3) {
      g.rect(x, 29 - (x % 3), 1, 12, '#355d4b');
      g.rect(x + 1, 26 - (x % 4), 1, 4, '#4f7a5c');
    }
    return group('saga-glow', r(56, 4, 18, 14, C.gold2, 'saga-glow-soft', 'opacity:.12')) +
      group('saga-motes', Array.from({ length: 12 }, (_, index) => r(18 + ((index * 17) % 60), 12 + ((index * 9) % 14), 1, 1, C.gold2, 'saga-mote', `animation-delay:-${(index * 0.5).toFixed(1)}s`)).join('')) +
      group('saga-wave', r(30, 34, 10, 1, C.gold2, 'saga-wave-pixel', 'opacity:.3'));
  },

  suncave(g) {
    // dark rock frame with a bright world outside
    g.rect(0, 0, W, H, '#11171a');
    g.rect(36, 5, 58, 40, '#e9c77f');
    g.rect(36, 5, 58, 4, '#f7e4ad');
    g.rect(50, 5, 44, 40, '#f2d494');
    // sun outside
    disc(g, 72, 16, 6, C.gold2);
    disc(g, 72, 15, 4, C.white);
    // distant hills and a torii gate
    g.rect(36, 33, 58, 12, '#6f8a5e');
    g.rect(36, 39, 58, 6, '#4d6b4b');
    g.rect(58, 22, 2, 16, '#7a3f35');
    g.rect(72, 22, 2, 16, '#7a3f35');
    g.rect(54, 20, 24, 2, '#8e4a3d');
    g.rect(56, 17, 20, 2, '#a75a47');
    g.rect(60, 22, 1, 3, '#5b2f29');
    // rock walls and roof of the cave
    g.rect(0, 0, 37, H, '#20282b');
    g.rect(0, 0, W, 6, '#20282b');
    for (let x = 0; x < W; x += 8) {
      g.rect(x, 0, 5, 5 + (x % 6), '#2c3537');
      g.rect(x + 3, 0, 2, 3, '#171d1f');
    }
    for (let y = 8; y < 50; y += 6) {
      g.rect(29 - (y % 5), y, 8, 3, '#2c3537');
      g.rect(30 - (y % 3), y + 1, 4, 1, '#394244');
    }
    g.rect(0, 43, W, H - 43, '#2b2722');
    g.rect(0, 43, W, 1, '#4a443a');
    for (let i = 0; i < 18; i += 1) {
      g.rect((i * 23) % W, 45 + ((i * 7) % 7), 1, 1, '#4a443a');
    }
    // a child with a mirror at the cave mouth
    g.rect(32, 35, 3, 8, '#7b5b8a');
    g.rect(33, 32, 2, 3, C.skin);
    g.rect(31, 31, 5, 2, '#3c2b2a');
    g.rect(36, 37, 3, 3, C.gold2);
    g.rect(37, 38, 1, 1, C.white);
    // light spilling into the cave
    for (let i = 0; i < 5; i += 1) {
      g.rect(36 + i * 2, 8 + i * 2, 2, 28 - i * 3, C.gold2, 'saga-glow-soft', `opacity:${(0.1 - i * 0.012).toFixed(3)}`);
    }
    return group('saga-motes', Array.from({ length: 14 }, (_, index) => r(8 + ((index * 11) % 26), 10 + ((index * 7) % 30), 1, 1, C.gold2, 'saga-mote', `animation-delay:-${(index * 0.4).toFixed(1)}s`)).join('')) +
      group('saga-leaves', r(62, 30, 1, 1, '#8fae76', 'saga-leaf') + r(78, 27, 1, 1, '#a9c18a', 'saga-leaf', 'animation-delay:-1.8s'));
  },

  maize(g) {
    skyBands(g, ['#20364b', '#31556b', '#5a7f7c', '#9fb98a', '#e3d29b'], 26);
    cloudBank(g, 'maize-clouds', { y: 3, count: 6, color: '#c9d7c1' });
    // distant volcano
    g.rect(56, 15, 28, 12, '#4a5d57');
    g.rect(62, 12, 16, 4, '#5c7066');
    g.rect(68, 9, 5, 4, '#8b9b8c');
    g.rect(69, 8, 3, 1, '#d8dfcf');
    // green terraces
    g.rect(0, 25, W, H - 25, '#4f7648');
    g.rect(0, 33, W, H - 33, '#3f633c');
    g.rect(0, 43, W, H - 43, '#345334');
    for (let row = 0; row < 4; row += 1) {
      g.rect(0, 29 + row * 5, W, 1, '#6e9153');
    }
    // maize stalks with cobs
    const stalk = (x, base, height, delay) => {
      g.rect(x, base - height, 1, height, '#6f8f3f');
      for (let leaf = 0; leaf < 4; leaf += 1) {
        const y = base - 5 - leaf * 4;
        const side = leaf % 2 ? 1 : -1;
        g.rect(x + (side > 0 ? 1 : -4), y, 4, 1, '#8faa4d');
        g.rect(x + (side > 0 ? 4 : -5), y + 1, 2, 1, '#5f7d35');
      }
      g.rect(x + (x % 2 ? -2 : 2), base - height + 8, 2, 4, C.gold2);
      g.rect(x + (x % 2 ? -2 : 2), base - height + 7, 1, 1, C.gold);
      return r(x, base - height - 1, 1, 2, '#c9b25a', 'saga-leaf', `animation-delay:-${delay}s`);
    };
    let stems = '';
    [10, 18, 27, 38, 47, 75, 84, 92].forEach((x, i) => {
      stems += stalk(x, 50, 18 + (i % 4) * 3, (i * 0.5).toFixed(1));
    });
    // a little farmer with a basket
    g.rect(58, 37, 3, 7, '#8f5a43');
    g.rect(59, 34, 2, 3, C.skin);
    g.rect(58, 33, 4, 2, '#3c2b2a');
    g.rect(55, 40, 3, 3, C.gold);
    // sun and birds
    disc(g, 18, 12, 5, C.gold2);
    disc(g, 18, 11, 4, C.white);
    return stems +
      group('saga-birds', r(40, 8, 2, 1, C.black, 'saga-bird') + r(45, 6, 2, 1, C.black, 'saga-bird', 'animation-delay:-1.5s')) +
      group('saga-butterflies', r(32, 32, 2, 1, C.gold2, 'saga-butterfly') + r(66, 29, 2, 1, C.white, 'saga-butterfly', 'animation-delay:-2.1s')) +
      group('saga-leaves', r(20, 30, 1, 1, '#c9b25a', 'saga-leaf') + r(79, 34, 1, 1, '#c9b25a', 'saga-leaf', 'animation-delay:-1.4s'));
  },

  sky(g) {
    skyBands(g, ['#2e5a83', '#4f83a6', '#86b3bf', '#c9d8bd', '#f1d69b'], 34);
    cloudBank(g, 'sky-clouds', { y: 27, count: 9, color: '#e9efe0' });
    cloudBank(g, 'sky-clouds-low', { y: 38, count: 7, color: '#d5e0d2' });
    // big friendly sun
    disc(g, 68, 13, 9, C.goldDim);
    disc(g, 68, 12, 8, C.gold2);
    disc(g, 68, 11, 5, C.white);
    // sun rays
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.round(68 + Math.cos(angle) * 12);
      const y = Math.round(12 + Math.sin(angle) * 12);
      g.rect(x, y, 2, 1, C.gold2, 'saga-twinkle', `animation-delay:-${(i * 0.3).toFixed(1)}s`);
    }
    // tiny monkey silhouette leaping toward the sun
    g.rect(44, 24, 4, 5, '#2a2521');
    g.rect(45, 21, 3, 3, '#2a2521');
    g.rect(48, 21, 2, 1, '#2a2521');
    g.rect(42, 26, 2, 1, '#2a2521');
    g.rect(48, 28, 4, 1, '#2a2521');
    g.rect(52, 26, 2, 1, '#2a2521');
    g.rect(54, 24, 1, 2, '#2a2521');
    g.rect(49, 30, 2, 1, '#2a2521');
    // birds far below
    return group('saga-glow', r(54, 2, 30, 22, C.gold2, 'saga-glow-soft', 'opacity:.12')) +
      group('saga-birds', r(20, 18, 2, 1, C.black, 'saga-bird') + r(26, 22, 2, 1, C.black, 'saga-bird', 'animation-delay:-1.2s') + r(31, 17, 2, 1, C.black, 'saga-bird', 'animation-delay:-2.3s')) +
      group('saga-motes', Array.from({ length: 10 }, (_, index) => r(6 + ((index * 13) % 40), 8 + ((index * 9) % 26), 1, 1, C.white, 'saga-mote', `animation-delay:-${(index * 0.7).toFixed(1)}s`)).join(''));
  },
};

const sceneKeys = Object.keys(scenes);

export function sagaScene(key) {
  const draw = scenes[key] || scenes.fjord;
  const g = new Grid();
  const overlay = draw(g) || '';
  return `<svg class="pixel-scene saga-scene" viewBox="0 0 ${W} ${H}" aria-hidden="true" role="presentation" shape-rendering="crispEdges" focusable="false" preserveAspectRatio="xMidYMid slice">${g.toSvg()}${overlay}</svg>`;
}

export function sagaSceneKeys() {
  return [...sceneKeys];
}

/* ------------------------------------------------------------------ */
/* Small sigils for paths and endings                                  */
/* ------------------------------------------------------------------ */

const SIGILS = {
  seed: [
    '................',
    '.......gg.......',
    '......gggg......',
    '.....gg..gg.....',
    '....gg....gg....',
    '.....gg..gg.....',
    '......gggg......',
    '.......gg.......',
    '.......bb.......',
    '.......bb.......',
    '......bbbb......',
    '.....b.bb.b.....',
    '....b..bb..b....',
    '.......bb.......',
    '.......bb.......',
    '................',
  ],
  raven: [
    '................',
    '................',
    '....kk..........',
    '...kkkk.........',
    '..kkkkkkk.......',
    '.kkkkkkkkkk.....',
    '..kkkkkkkkkk....',
    '...kkkkkkk.kk...',
    '....kkkkk..kk...',
    '.....kkkk.......',
    '......kk........',
    '.....k..k.......',
    '....k....k......',
    '................',
    '................',
    '................',
  ],
  wolf: [
    '................',
    '...kk......kk...',
    '...kkk....kkk...',
    '...kkkk..kkkk...',
    '...kkkkkkkkkk...',
    '...kkkkkkkkkk...',
    '..kkkkkkkkkkkk..',
    '..kkkkkkkkkkkk..',
    '..kkkkkkkkkkkk..',
    '..kk.kkkkkk.kk..',
    '..kk..kkkk..kk..',
    '...k...kk...k...',
    '.......kk.......',
    '......k..k......',
    '................',
    '................',
  ],
  hammer: [
    '................',
    '...iiiiiiii.....',
    '..iiiiiiiiii....',
    '..iiiiiiiiii....',
    '..iiiiiiiiii....',
    '.....iiii.......',
    '......bb........',
    '......bb........',
    '......bb........',
    '......bb........',
    '......bb........',
    '......bb........',
    '.....bbbb.......',
    '................',
    '................',
    '................',
  ],
  rune: [
    '................',
    '.....rr.........',
    '.....rr.........',
    '.....rrrr.......',
    '.....rr.rr......',
    '.....rr..rr.....',
    '.....rr.rr......',
    '.....rrrr.......',
    '.....rr.........',
    '.....rr.........',
    '.....rr.........',
    '.....rr.........',
    '................',
    '................',
    '................',
    '................',
  ],
  tree: [
    '................',
    '.......gg.......',
    '.....gggggg.....',
    '...gggggggggg...',
    '..gggggggggggg..',
    '...gggggggggg...',
    '.....gggggg.....',
    '.......bb.......',
    '.......bb.......',
    '......bbbb......',
    '.....bb..bb.....',
    '....bb....bb....',
    '................',
    '................',
    '................',
    '................',
  ],
  crown: [
    '................',
    '................',
    '..y..y....y..y..',
    '..yy.yy..yy.yy..',
    '..yyyyyyyyyyyy..',
    '..yyyyyyyyyyyy..',
    '..yyyyyyyyyyyy..',
    '...yyyyyyyyyy...',
    '....yyyyyyyy....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  flame: [
    '................',
    '.......r........',
    '......rrr.......',
    '.....rrrrr......',
    '....rrrrrrr.....',
    '....rryyrrr.....',
    '...rryyyyrrr....',
    '...rryyyyrrr....',
    '...rryyyyrrr....',
    '....rryyrrr.....',
    '.....rrrrr......',
    '......rrr.......',
    '................',
    '................',
    '................',
    '................',
  ],
  serpent: [
    '................',
    '.........gg.....',
    '........gggg....',
    '.......gg..gg...',
    '......gg....gg..',
    '......gg....gg..',
    '.......gg..gg...',
    '........gggg....',
    '.......gg.......',
    '.....gg.........',
    '...gg...........',
    '..gg............',
    '..gg............',
    '...gg...........',
    '................',
    '................',
  ],
  lamp: [
    '................',
    '.......y........',
    '......yyy.......',
    '.....yyyyy......',
    '.....yyyyy......',
    '......yyy.......',
    '.......y........',
    '....iiiiiii.....',
    '...i.......i....',
    '...i.......i....',
    '....iiiiiii.....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  star: [
    '................',
    '.......y........',
    '.......y........',
    '......yyy.......',
    '......yyy.......',
    '..yyyyyyyyyyy...',
    '...yyyyyyyyy....',
    '....yyyyyyy.....',
    '.....yyyyy......',
    '....yyy.yyy.....',
    '...yy.....yy....',
    '..y.........y...',
    '................',
    '................',
    '................',
    '................',
  ],
  reed: [
    '................',
    '....g.....g.....',
    '....g.....g.....',
    '...gg....gg.....',
    '....g.....g.....',
    '....g..b..g.....',
    '...gg..b.gg.....',
    '....g..b..g.....',
    '....g.....g.....',
    '...gg....gg.....',
    '....g.....g.....',
    '....g.....g.....',
    '...gg....gg.....',
    '................',
    '................',
    '................',
  ],
  mirror: [
    '................',
    '....yyyyyy......',
    '...y......y.....',
    '..y........y....',
    '..y........y....',
    '..y........y....',
    '...y......y.....',
    '....yyyyyy......',
    '.......bb.......',
    '.......bb.......',
    '.......bb.......',
    '......bbbb......',
    '................',
    '................',
    '................',
    '................',
  ],
  jewels: [
    '................',
    '.....y..y.......',
    '....yyy.yyy.....',
    '...yyyyyyyyy....',
    '....yyyyyyy.....',
    '.....yyyyy......',
    '......yyy.......',
    '.......y........',
    '...y...y...y....',
    '..yyy..y..yyy...',
    '..yyy.....yyy...',
    '...y.......y....',
    '................',
    '................',
    '................',
    '................',
  ],
  drum: [
    '................',
    '....yyyyyyyy....',
    '...y........y...',
    '..y..y....y..y..',
    '..y...y..y...y..',
    '..y....yy....y..',
    '..y....yy....y..',
    '..y...y..y...y..',
    '..y..y....y..y..',
    '...y........y...',
    '....yyyyyyyy....',
    '.......bb.......',
    '.......bb.......',
    '......bbbb......',
    '................',
    '................',
  ],
  ant: [
    '................',
    '................',
    '.......kk.......',
    '......kkkk......',
    '.......kk.......',
    '....kkkkkkkk....',
    '...kk.kkkk.kk...',
    '..k...kkkk...k..',
    '......kkkk......',
    '.....kk..kk.....',
    '....kk....kk....',
    '...k........k...',
    '................',
    '................',
    '................',
    '................',
  ],
  rain: [
    '................',
    '......kkkk......',
    '....kkkkkkkk....',
    '...kkkkkkkkkk...',
    '..kkkkkkkkkkkk..',
    '..kkkkkkkkkkkk..',
    '...kkkkkkkkkk...',
    '................',
    '...b..b..b..b...',
    '..b..b..b..b....',
    '..b..b..b..b....',
    '...b..b..b..b...',
    '................',
    '................',
    '................',
    '................',
  ],
  owl: [
    '................',
    '...kk......kk...',
    '..kkkk....kkkk..',
    '..kkyk....kkyk..',
    '..kkkk....kkkk..',
    '...kkkkkkkkkk...',
    '....kkkkkkkk....',
    '...kkkkkkkkkk...',
    '...kkk.yy.kkk...',
    '...kkk.yy.kkk...',
    '....kkkkkkkk....',
    '.....kkkkkk.....',
    '......kkkk......',
    '................',
    '................',
    '................',
  ],
  leap: [
    '................',
    '..........kk....',
    '.........kkkk...',
    '..........kk....',
    '.....kkkkkkk....',
    '....kkkkkkkk....',
    '...kkk.kk.kk....',
    '..kk...kk..k....',
    '.......kk.......',
    '......kk.kk.....',
    '.....kk...kk....',
    '....kk.....kk...',
    '...k.........k..',
    '................',
    '................',
    '................',
  ],
  ask: [
    '................',
    '...kkkkkkkk.....',
    '..kkkkkkkkkk....',
    '..kkk....kkkk...',
    '..kkk.....kkk...',
    '..kkk....kkk....',
    '..kkk...kkk.....',
    '..kkk...kkk.....',
    '..kkk...........',
    '..kkk...kkk.....',
    '..kkk...kkk.....',
    '..kkkkkkkkkk....',
    '...kkkkkkkk.....',
    '................',
    '................',
    '................',
  ],
  share: [
    '................',
    '....kk....kk....',
    '...kkkk..kkkk...',
    '..kk..kkkk..kk..',
    '..kk...kk...kk..',
    '..kk...kk...kk..',
    '...kk..kk..kk...',
    '....kkkkkkkk....',
    '.....kkkkkk.....',
    '......kkkk......',
    '.......kk.......',
    '................',
    '................',
    '................',
    '................',
  ],
};

const SIGIL_COLORS = {
  k: C.ironLight,
  g: C.grass3,
  b: '#c99a62',
  i: C.ironLight,
  y: C.gold2,
  r: C.rune,
};

export function sagaGlyph(key, { size = 24, className = 'saga-glyph' } = {}) {
  const sprite = SIGILS[key] || SIGILS.seed;
  let markup = '';
  sprite.forEach((row, y) => {
    row.split('').forEach((cell, x) => {
      if (cell === '.') return;
      markup += `<rect x="${x}" y="${y}" width="1" height="1" fill="${SIGIL_COLORS[cell] || C.white}"/>`;
    });
  });
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" role="presentation" shape-rendering="crispEdges" focusable="false">${markup}</svg>`;
}
