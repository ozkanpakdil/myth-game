/**
 * scene.js — original, deterministic pixel-art scenes.
 *
 * Every image is inline SVG built from a 64x36 colour grid. Nothing is fetched
 * and nothing is random at runtime: a string seed always produces the same
 * scene. Story scenes follow the story's motif; quiz scenes pick a motif from
 * the question, correct answer and explanation so the art is a genuine clue.
 */

const W = 64;
const H = 36;
const CELL = 5;

const C = {
  ink: '#171712',
  bg: '#0e1310',
  bone: '#f2e6cf',
  stone: '#c9bda5',
  gold: '#d6a84b',
  light: '#f2d37b',
  teal: '#3f7f86',
  deepTeal: '#24545c',
  terra: '#b5523b',
  orange: '#d9824a',
  leaf: '#5d8148',
  deepGreen: '#33502f',
  sand: '#b08a55',
  brown: '#6b4f33',
  plum: '#7b4a6b',
  violet: '#9a6b9e',
};

const SKIES = {
  greek: { sky: C.bg, sky2: C.deepTeal, horizon: C.teal, land: C.deepGreen, water: C.teal, accent: C.gold },
  norse: { sky: C.bg, sky2: C.deepTeal, horizon: C.teal, land: C.deepGreen, water: C.deepTeal, accent: C.violet },
  egypt: { sky: C.bg, sky2: C.plum, horizon: C.terra, land: C.sand, water: C.teal, accent: C.gold },
  mesopotamia: { sky: C.bg, sky2: C.deepTeal, horizon: C.sand, land: C.brown, water: C.teal, accent: C.gold },
  hindu: { sky: C.bg, sky2: C.plum, horizon: C.terra, land: C.deepGreen, water: C.teal, accent: C.gold },
  japan: { sky: C.bg, sky2: C.deepTeal, horizon: C.teal, land: C.deepGreen, water: C.teal, accent: C.terra },
  maya: { sky: C.bg, sky2: C.deepTeal, horizon: C.teal, land: C.deepGreen, water: C.teal, accent: C.gold },
  celtic: { sky: C.bg, sky2: C.teal, horizon: C.leaf, land: C.deepGreen, water: C.teal, accent: C.gold },
};

const STORY_MOTIFS = {
  'mesopotamia-01': 'dragon',
  'mesopotamia-02': 'gate',
  'mesopotamia-03': 'temple',
  'mesopotamia-04': 'tree',
  'mesopotamia-05': 'boat',
  'mesopotamia-06': 'plant',
  'egypt-01': 'mound',
  'egypt-02': 'gate',
  'egypt-03': 'eye',
  'egypt-04': 'serpent',
  'egypt-05': 'eye',
  'egypt-06': 'scales',
  'greek-01': 'titan',
  'greek-02': 'fruit',
  'greek-03': 'jar',
  'greek-04': 'shield',
  'greek-05': 'labyrinth',
  'greek-06': 'ship',
  'celtic-01': 'crown',
  'celtic-02': 'eye',
  'celtic-03': 'shield',
  'celtic-04': 'bull',
  'celtic-05': 'well',
  'celtic-06': 'ship',
  'norse-01': 'tree',
  'norse-02': 'well',
  'norse-03': 'hammer',
  'norse-04': 'bow',
  'norse-05': 'wolf',
  'norse-06': 'serpent',
  'hindu-01': 'ship',
  'hindu-02': 'bow',
  'hindu-03': 'deer',
  'hindu-04': 'bridge',
  'hindu-05': 'chariot',
  'hindu-06': 'trident',
  'japan-01': 'island',
  'japan-02': 'storm',
  'japan-03': 'gate',
  'japan-04': 'serpent',
  'japan-05': 'rabbit',
  'japan-06': 'crown',
  'maya-01': 'mound',
  'maya-02': 'bird',
  'maya-03': 'ballcourt',
  'maya-04': 'maize',
  'maya-05': 'jaguar',
  'maya-06': 'maize',
};

const MOTIF_LABELS = {
  storm: 'a storm of power',
  dragon: 'the chaos serpent',
  gate: 'the threshold',
  temple: 'a seat of power',
  tree: 'the world tree',
  boat: 'a journey by water',
  plant: 'a hidden gift',
  cosmos: 'the first beginning',
  mound: 'the first mound',
  island: 'the jewel island',
  titan: 'the war of the Titans',
  scales: 'the weighing of the heart',
  eye: 'the watching eye',
  fruit: 'a seed of change',
  jar: 'the sealed jar',
  shield: 'a shield against danger',
  labyrinth: 'the winding maze',
  hammer: 'the thunder hammer',
  wolf: 'the wolf at the edge',
  serpent: 'the coiled serpent',
  sun: 'the sun',
  bow: 'the hunter’s bow',
  lotus: 'the lotus',
  rabbit: 'the white hare',
  jaguar: 'the jaguar',
  bird: 'the messenger bird',
  crown: 'the crown',
  well: 'the well of wisdom',
  chariot: 'the chariot',
  bridge: 'the bridge',
  deer: 'the golden deer',
  trident: 'the trident',
  maize: 'the maize',
  mountain: 'the mountain',
  ballcourt: 'the ball court',
  bull: 'the horned bull',
  mask: 'the trickster mask',
  stones: 'the standing stones',
  mirror: 'the mirror',
};

const MOTIF_RULES = [
  [/\b(sun|dawn|daylight|amaterasu|ra\b|surya|sun disk)\b/i, 'sun'],
  [/\b(moon|night|star|constellation|eclipse)\b/i, 'cosmos'],
  [/\b(sea|ocean|river|water|flood|wave|nile|euphrates|tigris|churn|ark)\b/i, 'boat'],
  [/\b(serpent|snake|dragon|apep|jormungandr|vritra|orochi|python)\b/i, 'serpent'],
  [/\b(underworld|death|dead|xibalba|hades|ereshkigal|yomi|afterlife|grave)\b/i, 'gate'],
  [/\b(tree|forest|yggdrasil|wood|grove|mistletoe)\b/i, 'tree'],
  [/\b(hammer|mjolnir|forge|anvil|thunderbolt)\b/i, 'hammer'],
  [/\b(wolf|fenrir)\b/i, 'wolf'],
  [/\b(eye|sight|watch|vision|balor)\b/i, 'eye'],
  [/\b(heart|scale|judg|maat|truth|feather)\b/i, 'scales'],
  [/\b(maize|corn|harvest|grain)\b/i, 'maize'],
  [/\b(rabbit|hare)\b/i, 'rabbit'],
  [/\b(ball|game|hoop|ball court)\b/i, 'ballcourt'],
  [/\b(jaguar|jungle)\b/i, 'jaguar'],
  [/\b(mountain|cliff|peak|volcano|rock)\b/i, 'mountain'],
  [/\b(ship|boat|voyage|sail|ark|island)\b/i, 'ship'],
  [/\b(bow|arrow|archer|mistletoe)\b/i, 'bow'],
  [/\b(lotus|flower|blossom)\b/i, 'lotus'],
  [/\b(cave|grotto|cavern)\b/i, 'gate'],
  [/\b(bridge|rainbow|bifrost)\b/i, 'bridge'],
  [/\b(city|temple|palace|ziggurat|wall|tower|throne)\b/i, 'temple'],
  [/\b(war|battle|fight|army|spear|sword|combat|weapon)\b/i, 'shield'],
  [/\b(creation|cosmos|egg|beginning|first people|void)\b/i, 'cosmos'],
  [/\b(love|marriage|bride|wedding|fruit|pomegranate)\b/i, 'fruit'],
  [/\b(wisdom|knowledge|rune|well|mimir|poetry)\b/i, 'well'],
  [/\b(trick|disguise|theft|steal|liar|shapeshift)\b/i, 'mask'],
  [/\b(horse|chariot|ride|wheel)\b/i, 'chariot'],
  [/\b(lion|durga|trident)\b/i, 'trident'],
  [/\b(deer|antler|stag)\b/i, 'deer'],
  [/\b(bird|eagle|hawk|raven|macaw|falcon|vulture)\b/i, 'bird'],
  [/\b(crown|king|queen|sovereign|kingship)\b/i, 'crown'],
  [/\b(cow|bull|cattle|horn)\b/i, 'bull'],
  [/\b(stone|circle|standing stone|dolmen)\b/i, 'stones'],
  [/\b(mirror|reflection)\b/i, 'mirror'],
];

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

function paletteFor(metaId) {
  const sky = SKIES[metaId] || SKIES.greek;
  return {
    ...C,
    ...sky,
    sun: sky.accent,
    moon: C.stone,
  };
}

class Grid {
  constructor(cell = CELL, width = W, height = H) {
    this.cell = cell;
    this.width = width;
    this.height = height;
    this.rows = Array.from({ length: height }, () => Array(width).fill(null));
  }

  set(x, y, color) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (!color || px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    this.rows[py][px] = color;
  }

  rect(x, y, w, h, color) {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) this.set(x + dx, y + dy, color);
    }
  }

  vline(x, y1, y2, color) {
    const from = Math.min(y1, y2);
    const to = Math.max(y1, y2);
    for (let y = from; y <= to; y += 1) this.set(x, y, color);
  }

  hline(x1, x2, y, color) {
    const from = Math.min(x1, x2);
    const to = Math.max(x1, x2);
    for (let x = from; x <= to; x += 1) this.set(x, y, color);
  }

  disc(cx, cy, radius, color) {
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        if (x * x + y * y <= radius * radius + radius) this.set(cx + x, cy + y, color);
      }
    }
  }

  line(x1, y1, x2, y2, color, thick = 1) {
    let x = Math.round(x1);
    let y = Math.round(y1);
    const ex = Math.round(x2);
    const ey = Math.round(y2);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x, y, color);
      if (thick > 1) {
        this.set(x + 1, y, color);
        this.set(x, y + 1, color);
      }
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  svg() {
    const parts = [];
    for (let y = 0; y < this.height; y += 1) {
      let x = 0;
      while (x < this.width) {
        const color = this.rows[y][x];
        if (!color) { x += 1; continue; }
        let end = x + 1;
        while (end < this.width && this.rows[y][end] === color) end += 1;
        parts.push(`<rect x="${x * this.cell}" y="${y * this.cell}" width="${(end - x) * this.cell}" height="${this.cell}" fill="${color}"/>`);
        x = end;
      }
    }
    return parts.join('');
  }
}

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawPeaks(g, p, rnd) {
  for (let i = 0; i < 5; i += 1) {
    const cx = 3 + i * 14 + Math.floor(rnd() * 5);
    const height = 4 + Math.floor(rnd() * 6);
    for (let row = 0; row < height; row += 1) {
      const half = Math.max(1, Math.floor((height - row) * 0.85));
      g.rect(cx - half, 21 - height + row, half * 2 + 1, 1, p.land2 || p.deepTeal);
      if (row < 2) g.rect(cx - Math.max(0, half - 1), 21 - height + row, Math.max(1, half), 1, p.bone);
    }
  }
}

function drawGround(g, p, motif, rnd) {
  const water = ['boat', 'ship', 'flood', 'bridge', 'lotus', 'island', 'serpent', 'mound'].includes(motif);
  if (water) {
    g.rect(0, 26, W, 10, p.water);
    for (let y = 27; y < H; y += 3) {
      for (let x = (y % 2) * 3; x < W; x += 9) {
        g.rect(x, y, 4, 1, y % 2 ? p.teal : p.deepTeal);
      }
    }
    for (let i = 0; i < 5; i += 1) g.rect(5 + i * 12, 32 + (i % 2), 5, 1, p.bone);
  } else {
    g.rect(0, 27, W, 9, p.land);
    for (let i = 0; i < 28; i += 1) {
      const x = Math.floor(rnd() * W);
      const y = 28 + Math.floor(rnd() * 6);
      g.rect(x, y, 1 + Math.floor(rnd() * 2), 1, rnd() > 0.5 ? p.deepGreen : p.leaf);
    }
    g.rect(0, 34, W, 2, p.deepGreen);
  }
}

function drawBoat(g, p, x, y, rain) {
  g.rect(x - 14, y - 4, 28, 2, p.brown);
  g.rect(x - 11, y - 2, 22, 2, p.terra);
  g.rect(x - 7, y, 14, 1, p.brown);
  g.rect(x - 1, y - 15, 2, 11, p.brown);
  g.rect(x + 1, y - 14, 10, 7, p.bone);
  g.rect(x + 2, y - 13, 8, 5, p.stone);
  g.rect(x + 4, y - 11, 4, 2, p.terra);
  g.hline(x - 13, x + 13, y + 2, p.bone);
  if (rain) {
    for (let i = 0; i < 10; i += 1) g.line(x - 20 + i * 4, y - 18, x - 22 + i * 4, y - 10, p.teal);
  }
}

function drawMotif(g, p, motif, x, y, rnd) {
  switch (motif) {
    case 'storm': {
      g.rect(x - 12, y - 17, 24, 3, p.stone);
      g.rect(x - 9, y - 20, 18, 4, p.stone);
      g.rect(x - 15, y - 14, 30, 2, p.stone);
      const bolt = [[x + 4, y - 13], [x - 2, y - 7], [x + 2, y - 7], [x - 4, y + 1]];
      for (let i = 0; i < bolt.length - 1; i += 1) g.line(...bolt[i], ...bolt[i + 1], p.light, 2);
      g.rect(x - 5, y + 1, 10, 1, p.light);
      for (let i = 0; i < 7; i += 1) g.line(x - 12 + i * 4, y - 11, x - 14 + i * 4, y - 4, p.teal);
      break;
    }
    case 'dragon': {
      const spine = [[x - 15, y - 4], [x - 9, y - 8], [x - 3, y - 4], [x + 4, y - 8], [x + 11, y - 4]];
      for (let i = 0; i < spine.length - 1; i += 1) g.line(...spine[i], ...spine[i + 1], p.terra, 2);
      for (let i = 0; i < spine.length - 1; i += 1) g.line(spine[i][0], spine[i][1] - 1, spine[i + 1][0], spine[i + 1][1] - 1, p.orange);
      g.rect(x + 10, y - 8, 5, 4, p.terra);
      g.rect(x + 11, y - 9, 3, 2, p.orange);
      g.set(x + 12, y - 7, p.gold);
      g.line(x + 13, y - 4, x + 20, y - 8, p.orange);
      g.line(x + 12, y - 4, x + 19, y - 9, p.light);
      for (let i = 0; i < 4; i += 1) g.rect(x - 12 + i * 3, y - 15 + (i % 2), 2, 3, p.deepGreen);
      for (let i = 0; i < 3; i += 1) g.line(x - 4 + i * 4, y - 12, x - 8 + i * 4, y - 18, p.leaf);
      break;
    }
    case 'gate': {
      g.rect(x - 14, y - 18, 4, 18, p.stone);
      g.rect(x + 10, y - 18, 4, 18, p.stone);
      g.rect(x - 14, y - 18, 28, 3, p.stone);
      g.rect(x - 9, y - 14, 18, 14, p.bg);
      for (let i = 0; i < 3; i += 1) g.rect(x - 9 + i, y - 3 + i, 18 - i * 2, 1, p.stone);
      g.rect(x - 16, y - 12, 2, 5, p.brown);
      g.rect(x + 14, y - 12, 2, 5, p.brown);
      g.disc(x - 15, y - 14, 1, p.orange);
      g.disc(x + 15, y - 14, 1, p.orange);
      g.rect(x - 1, y - 15, 2, 3, p.gold);
      break;
    }
    case 'temple': {
      for (let i = 0; i < 4; i += 1) {
        const width = 28 - i * 5;
        g.rect(Math.floor(x - width / 2), y - 4 - i * 4, width, 4, i % 2 ? p.stone : p.sand);
      }
      g.rect(x - 3, y - 4, 6, 5, p.bg);
      g.rect(x - 6, y - 20, 12, 2, p.gold);
      g.rect(x - 4, y - 22, 8, 2, p.gold);
      g.rect(x - 1, y - 24, 2, 2, p.light);
      g.rect(x - 15, y - 3, 2, 3, p.brown);
      g.rect(x + 13, y - 3, 2, 3, p.brown);
      break;
    }
    case 'tree': {
      g.rect(x - 2, y - 14, 4, 14, p.brown);
      g.rect(x - 6, y - 3, 12, 2, p.brown);
      g.rect(x - 9, y - 5, 6, 2, p.brown);
      g.rect(x + 4, y - 7, 5, 2, p.brown);
      g.disc(x, y - 18, 7, p.deepGreen);
      g.disc(x - 6, y - 15, 4, p.leaf);
      g.disc(x + 7, y - 15, 4, p.leaf);
      g.disc(x, y - 19, 4, p.leaf);
      for (let i = 0; i < 8; i += 1) g.set(x - 7 + i * 2, y - 20 + (i % 3), i % 2 ? p.gold : p.light);
      break;
    }
    case 'boat': drawBoat(g, p, x, y, true); break;
    case 'ship': drawBoat(g, p, x, y, false); break;
    case 'plant': {
      g.rect(x - 1, y - 7, 2, 7, p.leaf);
      g.rect(x - 8, y - 8, 7, 2, p.leaf);
      g.rect(x + 2, y - 12, 6, 2, p.leaf);
      g.rect(x - 7, y - 15, 5, 2, p.deepGreen);
      g.rect(x - 2, y - 18, 5, 4, p.gold);
      g.rect(x - 1, y - 20, 3, 2, p.light);
      g.set(x + 3, y - 17, p.light);
      g.rect(x - 6, y - 3, 12, 1, p.brown);
      break;
    }
    case 'mound': {
      g.rect(x - 18, y - 1, 36, 3, p.sand);
      for (let row = 0; row < 7; row += 1) {
        const half = 2 + Math.floor(row * 1.2);
        g.rect(x - half, y - 7 + row, half * 2 + 1, 1, row < 2 ? p.bone : p.sand);
      }
      g.disc(x, y - 16, 5, p.gold);
      g.disc(x, y - 16, 3, p.light);
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2;
        g.line(x + Math.cos(angle) * 7, y - 16 + Math.sin(angle) * 6, x + Math.cos(angle) * 10, y - 16 + Math.sin(angle) * 9, p.light);
      }
      g.rect(x - 14, y - 3, 2, 4, p.leaf);
      g.rect(x + 12, y - 3, 2, 4, p.leaf);
      break;
    }
    case 'island': {
      g.rect(x - 15, y - 1, 30, 3, p.sand);
      g.disc(x, y - 4, 8, p.deepGreen);
      g.disc(x, y - 5, 6, p.leaf);
      g.rect(x - 1, y - 22, 2, 18, p.brown);
      g.rect(x - 3, y - 24, 6, 2, p.gold);
      g.rect(x - 1, y - 26, 3, 2, p.light);
      g.rect(x - 6, y - 10, 2, 3, p.stone);
      g.rect(x + 4, y - 8, 3, 3, p.stone);
      g.disc(x + 7, y - 18, 2, p.terra);
      g.set(x + 7, y - 19, p.light);
      break;
    }
    case 'titan': {
      g.rect(x - 15, y - 19, 30, 4, p.stone);
      g.rect(x - 12, y - 22, 24, 4, p.stone);
      g.rect(x - 18, y - 15, 36, 2, p.stone);
      const bolt = [[x - 2, y - 16], [x - 7, y - 9], [x - 3, y - 9], [x - 9, y - 1]];
      for (let i = 0; i < bolt.length - 1; i += 1) g.line(...bolt[i], ...bolt[i + 1], p.light, 2);
      const bolt2 = [[x + 8, y - 15], [x + 4, y - 9], [x + 8, y - 9], [x + 3, y - 3]];
      for (let i = 0; i < bolt2.length - 1; i += 1) g.line(...bolt2[i], ...bolt2[i + 1], p.light);
      g.rect(x - 18, y - 12, 2, 9, p.stone);
      g.rect(x + 16, y - 12, 2, 9, p.stone);
      g.rect(x - 19, y - 14, 3, 2, p.stone);
      g.rect(x + 16, y - 14, 3, 2, p.stone);
      g.rect(x - 8, y - 6, 3, 6, p.stone);
      g.rect(x + 5, y - 5, 3, 5, p.stone);
      g.rect(x - 6, y - 4, 2, 2, p.terra);
      g.rect(x + 4, y - 4, 2, 2, p.terra);
      g.rect(x - 12, y - 2, 6, 2, p.stone);
      g.rect(x + 7, y - 1, 6, 2, p.stone);
      break;
    }
    case 'cosmos': {
      for (let r = 12; r >= 3; r -= 3) {
        g.disc(x, y - 12, r, r % 2 ? p.plum : p.deepTeal);
      }
      g.disc(x, y - 12, 3, p.bg);
      g.disc(x, y - 12, 2, p.light);
      for (let i = 0; i < 10; i += 1) {
        const angle = (i / 10) * Math.PI * 2;
        g.line(x + Math.cos(angle) * 13, y - 12 + Math.sin(angle) * 9, x + Math.cos(angle) * 16, y - 12 + Math.sin(angle) * 12, p.gold);
      }
      g.rect(x - 1, y - 1, 2, 1, p.gold);
      break;
    }
    case 'scales': {
      g.rect(x - 1, y - 18, 2, 18, p.stone);
      g.rect(x - 12, y - 16, 24, 2, p.gold);
      g.rect(x - 12, y - 15, 2, 6, p.stone);
      g.rect(x + 10, y - 15, 2, 6, p.stone);
      g.rect(x - 15, y - 9, 7, 2, p.stone);
      g.rect(x + 8, y - 9, 7, 2, p.stone);
      g.rect(x - 13, y - 8, 3, 2, p.stone);
      g.rect(x + 10, y - 8, 3, 2, p.stone);
      g.rect(x - 4, y - 15, 8, 2, p.terra);
      g.rect(x - 2, y - 14, 4, 2, p.orange);
      g.set(x + 1, y - 16, p.light);
      break;
    }
    case 'eye': {
      for (let row = 0; row < 10; row += 1) {
        const half = Math.round(Math.sin((row / 9) * Math.PI) * 12);
        g.rect(x - half, y - 16 + row, half * 2 + 1, 1, p.bone);
      }
      g.disc(x, y - 11, 4, p.deepTeal);
      g.disc(x, y - 11, 2, p.gold);
      g.rect(x - 1, y - 12, 2, 2, p.ink);
      for (let i = 0; i < 7; i += 1) {
        const angle = (i / 7) * Math.PI * 2;
        g.line(x + Math.cos(angle) * 14, y - 11 + Math.sin(angle) * 10, x + Math.cos(angle) * 18, y - 11 + Math.sin(angle) * 13, p.gold);
      }
      break;
    }
    case 'fruit': {
      g.disc(x, y - 8, 7, p.terra);
      g.disc(x, y - 8, 6, p.orange);
      g.rect(x - 2, y - 16, 4, 3, p.brown);
      g.rect(x - 5, y - 17, 2, 3, p.leaf);
      g.rect(x + 3, y - 17, 2, 3, p.leaf);
      for (let i = 0; i < 7; i += 1) g.set(x - 4 + (i % 4) * 3, y - 10 + Math.floor(i / 4) * 3, p.light);
      g.rect(x - 1, y - 19, 2, 2, p.gold);
      break;
    }
    case 'jar': {
      g.rect(x - 3, y - 15, 6, 3, p.sand);
      g.rect(x - 5, y - 13, 10, 3, p.stone);
      g.rect(x - 8, y - 10, 16, 7, p.terra);
      g.rect(x - 6, y - 3, 12, 2, p.brown);
      g.rect(x - 10, y - 9, 2, 4, p.brown);
      g.rect(x + 8, y - 9, 2, 4, p.brown);
      g.rect(x - 3, y - 8, 6, 4, p.orange);
      g.rect(x - 1, y - 7, 2, 2, p.light);
      g.rect(x + 5, y - 16, 1, 1, p.gold);
      g.rect(x + 7, y - 18, 1, 1, p.light);
      break;
    }
    case 'shield': {
      g.disc(x, y - 10, 11, p.brown);
      g.disc(x, y - 10, 10, p.stone);
      g.disc(x, y - 10, 7, p.deepTeal);
      g.disc(x, y - 10, 2, p.gold);
      for (let i = 0; i < 3; i += 1) {
        g.line(x - 10 + i * 2, y - 16 + i * 3, x + 10 - i * 2, y - 16 + i * 3, p.leaf);
      }
      for (let i = 0; i < 3; i += 1) g.rect(x - 10 + i * 8, y - 18, 3, 2, p.leaf);
      break;
    }
    case 'labyrinth': {
      g.rect(x - 15, y - 16, 30, 3, p.stone);
      g.rect(x - 15, y - 13, 3, 13, p.stone);
      g.rect(x + 12, y - 13, 3, 13, p.stone);
      g.rect(x - 9, y - 13, 2, 9, p.sand);
      g.rect(x + 7, y - 13, 2, 9, p.sand);
      g.rect(x - 9, y - 6, 18, 2, p.sand);
      g.rect(x - 3, y - 9, 6, 5, p.bg);
      g.rect(x - 8, y - 19, 3, 4, p.bone);
      g.rect(x + 5, y - 19, 3, 4, p.bone);
      g.rect(x - 5, y - 19, 10, 1, p.bone);
      g.set(x - 1, y - 7, p.gold);
      break;
    }
    case 'hammer': {
      g.rect(x - 1, y - 12, 2, 12, p.brown);
      g.rect(x - 8, y - 16, 16, 5, p.stone);
      g.rect(x - 6, y - 17, 12, 2, p.bone);
      g.rect(x - 2, y - 15, 4, 2, p.ink);
      g.line(x - 9, y - 18, x - 12, y - 22, p.gold);
      g.line(x + 9, y - 18, x + 12, y - 22, p.light);
      g.line(x, y - 18, x, y - 23, p.light);
      break;
    }
    case 'wolf': {
      g.rect(x - 12, y - 8, 16, 5, p.stone);
      g.rect(x + 2, y - 10, 7, 5, p.stone);
      g.rect(x + 7, y - 9, 4, 3, p.stone);
      g.rect(x - 10, y - 3, 3, 4, p.stone);
      g.rect(x - 4, y - 3, 3, 4, p.stone);
      g.rect(x + 3, y - 3, 3, 4, p.stone);
      g.rect(x - 15, y - 7, 4, 2, p.stone);
      g.rect(x + 8, y - 8, 2, 1, p.gold);
      g.set(x + 9, y - 8, p.ink);
      g.rect(x + 11, y - 10, 2, 2, p.stone);
      g.rect(x + 7, y - 11, 2, 2, p.stone);
      g.rect(x + 6, y - 6, 4, 1, p.terra);
      break;
    }
    case 'serpent': {
      const spine = [[x - 13, y - 2], [x - 8, y - 8], [x - 1, y - 4], [x + 6, y - 10], [x + 10, y - 7]];
      for (let i = 0; i < spine.length - 1; i += 1) g.line(...spine[i], ...spine[i + 1], p.deepGreen, 2);
      g.rect(x + 8, y - 9, 5, 4, p.leaf);
      g.rect(x + 9, y - 10, 3, 2, p.terra);
      g.set(x + 11, y - 8, p.gold);
      g.line(x + 13, y - 6, x + 17, y - 8, p.terra);
      for (let i = 0; i < 5; i += 1) g.set(x - 12 + i * 5, y - 3 + (i % 2), p.gold);
      break;
    }
    case 'sun': {
      g.disc(x, y - 15, 8, p.gold);
      g.disc(x, y - 15, 6, p.light);
      for (let i = 0; i < 12; i += 1) {
        const angle = (i / 12) * Math.PI * 2;
        g.line(x + Math.cos(angle) * 10, y - 15 + Math.sin(angle) * 8, x + Math.cos(angle) * 14, y - 15 + Math.sin(angle) * 11, p.light);
      }
      g.rect(x - 3, y - 16, 2, 2, p.terra);
      g.rect(x + 2, y - 12, 2, 2, p.terra);
      break;
    }
    case 'bow': {
      for (let i = 0; i < 12; i += 1) {
        const yy = y - 2 - i;
        const xx = x - 8 - Math.round(Math.sin((i / 11) * Math.PI) * 4);
        g.rect(xx, yy, 2, 1, p.brown);
      }
      g.line(x - 8, y - 2, x - 8, y - 14, p.bone);
      g.line(x - 9, y - 8, x + 8, y - 8, p.light);
      g.rect(x + 7, y - 9, 3, 2, p.gold);
      g.rect(x + 9, y - 8, 4, 1, p.terra);
      g.set(x + 12, y - 8, p.light);
      break;
    }
    case 'lotus': {
      g.rect(x - 1, y - 5, 2, 6, p.leaf);
      g.rect(x - 8, y - 2, 16, 2, p.deepGreen);
      for (let i = -2; i <= 2; i += 1) {
        g.line(x, y - 4, x + i * 4, y - 9 - (2 - Math.abs(i)), i === 0 ? p.light : p.gold);
      }
      g.disc(x, y - 7, 2, p.light);
      g.rect(x - 12, y + 1, 24, 1, p.teal);
      break;
    }
    case 'rabbit': {
      g.rect(x - 6, y - 8, 10, 6, p.bone);
      g.disc(x + 4, y - 9, 3, p.bone);
      g.rect(x + 3, y - 15, 2, 6, p.bone);
      g.rect(x + 6, y - 14, 2, 5, p.bone);
      g.set(x + 5, y - 9, p.ink);
      g.rect(x - 5, y - 2, 2, 2, p.bone);
      g.rect(x + 1, y - 2, 2, 2, p.bone);
      g.rect(x - 8, y - 3, 3, 1, p.leaf);
      g.rect(x + 1, y - 11, 2, 1, p.terra);
      break;
    }
    case 'jaguar': {
      g.rect(x - 15, y - 12, 30, 12, p.deepGreen);
      for (let i = 0; i < 10; i += 1) g.rect(x - 14 + (i * 7) % 28, y - 11 + (i * 5) % 9, 2, 2, p.leaf);
      g.disc(x - 5, y - 7, 3, p.gold);
      g.disc(x + 5, y - 7, 3, p.gold);
      g.rect(x - 6, y - 8, 1, 2, p.ink);
      g.rect(x + 4, y - 8, 1, 2, p.ink);
      g.rect(x - 8, y - 12, 2, 2, p.sand);
      g.rect(x + 6, y - 12, 2, 2, p.sand);
      g.rect(x - 2, y - 2, 4, 2, p.terra);
      break;
    }
    case 'bird': {
      g.rect(x - 2, y - 10, 5, 6, p.terra);
      g.rect(x + 3, y - 11, 3, 3, p.gold);
      g.set(x + 5, y - 10, p.ink);
      g.line(x - 2, y - 9, x - 10, y - 14, p.leaf);
      g.line(x + 1, y - 9, x + 9, y - 15, p.gold);
      g.rect(x - 6, y - 5, 12, 2, p.terra);
      g.rect(x - 1, y - 4, 2, 4, p.brown);
      g.rect(x - 8, y - 1, 16, 1, p.brown);
      g.rect(x - 7, y - 3, 2, 2, p.leaf);
      break;
    }
    case 'crown': {
      g.rect(x - 10, y - 4, 20, 4, p.stone);
      g.rect(x - 9, y - 8, 18, 4, p.gold);
      g.rect(x - 7, y - 12, 3, 4, p.gold);
      g.rect(x - 1, y - 14, 2, 6, p.gold);
      g.rect(x + 4, y - 12, 3, 4, p.gold);
      g.rect(x - 8, y - 7, 16, 1, p.light);
      g.set(x - 4, y - 6, p.terra);
      g.set(x + 3, y - 6, p.terra);
      g.rect(x - 1, y - 10, 2, 2, p.light);
      break;
    }
    case 'well': {
      g.disc(x, y - 2, 8, p.stone);
      g.disc(x, y - 2, 5, p.bg);
      g.disc(x, y - 3, 4, p.deepTeal);
      g.rect(x - 9, y - 14, 2, 12, p.brown);
      g.rect(x + 7, y - 14, 2, 12, p.brown);
      g.rect(x - 11, y - 15, 22, 2, p.brown);
      g.rect(x - 1, y - 13, 2, 9, p.stone);
      g.rect(x - 4, y - 6, 8, 4, p.sand);
      g.rect(x - 3, y - 5, 6, 2, p.bg);
      g.set(x - 6, y - 1, p.gold);
      g.set(x + 5, y - 1, p.gold);
      break;
    }
    case 'chariot': {
      g.disc(x - 6, y - 5, 6, p.brown);
      g.disc(x - 6, y - 5, 4, p.bg);
      g.disc(x - 6, y - 5, 2, p.gold);
      g.rect(x - 2, y - 10, 12, 5, p.terra);
      g.rect(x + 10, y - 12, 6, 4, p.stone);
      g.rect(x + 12, y - 8, 3, 8, p.stone);
      g.rect(x + 16, y - 14, 2, 6, p.stone);
      g.rect(x - 8, y - 12, 2, 2, p.gold);
      g.rect(x - 12, y - 8, 3, 8, p.brown);
      g.set(x - 6, y - 5, p.light);
      break;
    }
    case 'bridge': {
      for (let i = 0; i < 7; i += 1) {
        const color = i === 0 ? p.terra : i === 3 ? p.gold : i === 5 ? p.leaf : i === 6 ? p.teal : p.stone;
        for (let xx = -16; xx <= 16; xx += 1) {
          const yy = y - 4 - Math.round(Math.cos((xx / 16) * (Math.PI / 2)) * 8);
          g.set(x + xx, yy - i + 3, color);
        }
      }
      g.rect(x - 18, y + 2, 36, 1, p.bone);
      g.rect(x - 16, y - 2, 2, 3, p.stone);
      g.rect(x + 14, y - 2, 2, 3, p.stone);
      break;
    }
    case 'deer': {
      g.rect(x - 10, y - 8, 14, 4, p.gold);
      g.rect(x + 2, y - 13, 4, 6, p.gold);
      g.rect(x + 5, y - 12, 3, 3, p.gold);
      g.set(x + 7, y - 11, p.ink);
      g.rect(x - 9, y - 4, 2, 5, p.brown);
      g.rect(x - 4, y - 4, 2, 5, p.brown);
      g.rect(x + 3, y - 4, 2, 5, p.brown);
      g.line(x + 4, y - 13, x + 7, y - 18, p.bone);
      g.line(x + 6, y - 15, x + 10, y - 16, p.bone);
      g.line(x + 4, y - 14, x + 1, y - 18, p.bone);
      g.line(x + 5, y - 16, x + 8, y - 19, p.bone);
      g.rect(x - 12, y - 9, 3, 2, p.gold);
      break;
    }
    case 'trident': {
      g.rect(x - 1, y - 14, 2, 14, p.gold);
      g.rect(x - 9, y - 16, 2, 8, p.gold);
      g.rect(x + 7, y - 16, 2, 8, p.gold);
      g.rect(x - 9, y - 16, 6, 2, p.gold);
      g.rect(x + 3, y - 16, 6, 2, p.gold);
      g.set(x - 9, y - 17, p.light);
      g.set(x, y - 15, p.light);
      g.set(x + 7, y - 17, p.light);
      g.disc(x, y - 8, 3, p.terra);
      g.disc(x, y - 8, 2, p.orange);
      break;
    }
    case 'maize': {
      g.rect(x - 1, y - 14, 2, 14, p.leaf);
      for (let i = 0; i < 3; i += 1) {
        g.line(x, y - 4 - i * 4, x - 7, y - 8 - i * 4, p.deepGreen);
        g.line(x, y - 6 - i * 4, x + 7, y - 10 - i * 4, p.leaf);
      }
      g.rect(x - 5, y - 11, 4, 6, p.gold);
      g.rect(x + 2, y - 8, 4, 6, p.light);
      for (let i = 0; i < 5; i += 1) g.set(x - 4 + (i % 3), y - 10 + i, p.terra);
      g.rect(x - 3, y - 17, 6, 2, p.leaf);
      break;
    }
    case 'mountain': {
      for (let row = 0; row < 16; row += 1) {
        const half = Math.floor(row * 1.1) + 1;
        g.rect(x - half, y - 16 + row, half * 2 + 1, 1, row < 4 ? p.bone : p.stone);
      }
      g.rect(x - 2, y - 16, 5, 3, p.bone);
      g.rect(x - 8, y - 6, 3, 3, p.deepTeal);
      g.rect(x + 5, y - 5, 3, 2, p.deepTeal);
      break;
    }
    case 'ballcourt': {
      g.rect(x - 15, y - 3, 30, 3, p.stone);
      g.rect(x - 13, y - 16, 3, 13, p.sand);
      g.rect(x + 10, y - 16, 3, 13, p.sand);
      g.disc(x, y - 10, 5, p.stone);
      g.disc(x, y - 10, 3, p.bg);
      g.rect(x - 1, y - 16, 2, 1, p.gold);
      g.disc(x, y - 5, 1, p.light);
      g.rect(x - 9, y - 4, 2, 1, p.gold);
      g.rect(x + 7, y - 4, 2, 1, p.gold);
      break;
    }
    case 'bull': {
      g.rect(x - 9, y - 9, 18, 9, p.brown);
      g.rect(x - 6, y - 12, 12, 4, p.brown);
      g.rect(x - 3, y - 11, 6, 2, p.terra);
      g.rect(x - 11, y - 14, 3, 6, p.bone);
      g.rect(x + 8, y - 14, 3, 6, p.bone);
      g.rect(x - 10, y - 15, 2, 2, p.bone);
      g.rect(x + 8, y - 15, 2, 2, p.bone);
      g.set(x - 4, y - 8, p.light);
      g.set(x + 3, y - 8, p.light);
      g.rect(x - 5, y - 3, 3, 3, p.brown);
      g.rect(x + 2, y - 3, 3, 3, p.brown);
      break;
    }
    case 'mask': {
      g.rect(x - 9, y - 14, 18, 14, p.bone);
      g.rect(x - 11, y - 12, 2, 8, p.gold);
      g.rect(x + 9, y - 12, 2, 8, p.gold);
      g.rect(x - 6, y - 11, 3, 3, p.ink);
      g.rect(x + 3, y - 11, 3, 3, p.ink);
      g.rect(x - 3, y - 6, 6, 2, p.terra);
      g.rect(x - 1, y - 14, 2, 2, p.terra);
      g.rect(x - 2, y - 2, 4, 2, p.leaf);
      break;
    }
    case 'stones': {
      for (let i = 0; i < 5; i += 1) {
        const xx = x - 14 + i * 7;
        const height = 8 + (i % 3) * 2;
        g.rect(xx, y - height, 3, height, p.stone);
        g.rect(xx + 1, y - height - 3, 1, 3, p.stone);
      }
      g.rect(x - 4, y - 3, 8, 2, p.stone);
      break;
    }
    case 'mirror': {
      g.disc(x, y - 12, 7, p.stone);
      g.disc(x, y - 12, 6, p.teal);
      g.disc(x, y - 12, 4, p.deepTeal);
      g.rect(x - 1, y - 15, 2, 6, p.light);
      g.rect(x - 1, y - 5, 2, 5, p.brown);
      g.rect(x - 4, y - 1, 8, 1, p.brown);
      break;
    }
    default: {
      g.disc(x, y - 10, 7, p.stone);
      g.disc(x, y - 10, 4, p.gold);
      g.rect(x - 1, y - 10, 2, 2, p.ink);
    }
  }
}

function buildScene(metaId, motif, seed, step = 0) {
  const p = paletteFor(metaId);
  const g = new Grid();
  const rnd = mulberry32(seed);

  g.rect(0, 0, W, 6, p.sky);
  g.rect(0, 6, W, 10, p.sky2);
  g.rect(0, 16, W, 3, p.horizon);

  const moon = ['wolf', 'gate', 'mirror'].includes(motif);
  const shift = (step % 3) - 1;
  const ox = 8 + Math.floor(rnd() * 48) + shift * 3;
  const oy = 4 + Math.floor(rnd() * 5);
  g.disc(ox, oy, 4, p.ink);
  g.disc(ox, oy, 3, moon ? p.stone : p.sun);
  g.disc(ox, oy, 2, moon ? p.bone : p.light);

  if (!moon) {
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      g.line(ox + Math.cos(angle) * 5, oy + Math.sin(angle) * 4, ox + Math.cos(angle) * 7, oy + Math.sin(angle) * 6, p.light);
    }
  }

  for (let i = 0; i < 42; i += 1) {
    const sx = Math.floor(rnd() * W);
    const sy = Math.floor(rnd() * 15);
    if (Math.abs(sx - ox) < 7 && Math.abs(sy - oy) < 7) continue;
    g.set(sx, sy, rnd() > 0.75 ? p.light : p.stone);
  }

  drawPeaks(g, p, rnd);
  drawGround(g, p, motif, rnd);
  drawMotif(g, p, motif, 32 + shift * 2, 30, rnd);

  for (let i = 0; i < 5; i += 1) {
    g.rect(55 + i * 2, 34, 1, 1, i <= step ? p.gold : p.deepTeal);
  }

  g.rect(0, 35, W, 1, p.ink);
  return g.svg();
}

function storyMotifFor(story) {
  return STORY_MOTIFS[story.id] || 'temple';
}

function questionMotifFor(question, fallback) {
  const text = `${question.question} ${question.choices[question.correct_index] || ''} ${question.explanation || ''}`;
  for (const [pattern, motif] of MOTIF_RULES) {
    if (pattern.test(text)) return motif;
  }
  return fallback;
}

function sceneSvg(metaId, motif, seed, step, label) {
  return `<svg class="pixel-scene" viewBox="0 0 320 180" role="img" aria-label="${escapeXml(label)}" shape-rendering="crispEdges" focusable="false">${buildScene(metaId, motif, seed, step)}</svg>`;
}

export function storyScene(meta, story, step = 0) {
  const motif = storyMotifFor(story);
  const seed = hashString(`${meta.id}:${story.id}:scene`);
  const label = `${MOTIF_LABELS[motif] || 'a symbolic scene'} — a symbolic scene for ${story.title}`;
  return {
    motif,
    label,
    svg: sceneSvg(meta.id, motif, seed, step, label),
    caption: MOTIF_LABELS[motif] || 'a symbolic scene',
  };
}

export function questionScene(meta, question, story) {
  const fallback = story ? storyMotifFor(story) : 'temple';
  const motif = questionMotifFor(question, fallback);
  const seed = hashString(`${meta.id}:${question.id}:question`);
  const label = `${MOTIF_LABELS[motif] || 'a symbolic scene'} — a clue for the question`;
  return {
    motif,
    label,
    svg: sceneSvg(meta.id, motif, seed, 0, label),
    caption: MOTIF_LABELS[motif] || 'a symbolic clue',
  };
}

export function findCharacterForChoice(choice, characters) {
  if (!Array.isArray(characters)) return null;
  const normalized = String(choice || '').trim().toLowerCase();
  return characters.find((character) => character.name.toLowerCase() === normalized) || null;
}

function portraitArchetype(character) {
  const text = `${character.role || ''} ${(character.domain || []).join(' ')} ${(character.symbols || []).join(' ')}`.toLowerCase();
  if (/death|underworld|judge|grave|mummy|afterlife/.test(text)) return 'hood';
  if (/war|battle|hero|hunter|thunder|storm|sky|king|father|ruler|sovereign/.test(text)) return 'crown';
  if (/mother|goddess|harvest|love|beauty|queen|fertility|maize|grain/.test(text)) return 'veil';
  if (/wisdom|magic|scribe|moon|knowledge|fate|poetry|writing/.test(text)) return 'halo';
  if (/trick|thief|messenger|shapeshift|mischief/.test(text)) return 'horns';
  return 'helm';
}

function drawPortrait(g, p, character) {
  const text = `${character.role || ''} ${(character.domain || []).join(' ')} ${(character.symbols || []).join(' ')}`.toLowerCase();
  const archetype = portraitArchetype(character);
  const seed = hashString(character.id);
  const accents = [p.gold, p.terra, p.teal, p.violet, p.leaf];
  const accent = accents[seed % accents.length];
  const hair = [p.brown, p.ink, p.bone, p.terra, p.gold][(seed >>> 3) % 5];
  const skin = archetype === 'hood' ? p.stone : p.bone;

  if (archetype === 'halo') g.disc(8, 8, 7, accent);
  g.rect(2, 13, 12, 3, accent);
  g.rect(4, 12, 8, 2, p.brown);
  g.rect(4, 5, 8, 8, p.ink);
  g.rect(5, 6, 6, 7, skin);
  g.rect(4, 5, 8, 2, hair);
  g.set(6, 8, p.ink);
  g.set(9, 8, p.ink);
  g.rect(7, 9, 2, 1, p.terra);
  g.rect(6, 11, 4, 1, p.ink);

  if (archetype === 'veil' || archetype === 'crown') {
    g.rect(3, 6, 2, 7, hair);
    g.rect(11, 6, 2, 7, hair);
  }

  if (archetype === 'crown') {
    g.rect(4, 2, 8, 2, p.gold);
    g.rect(4, 1, 2, 1, p.light);
    g.rect(7, 1, 2, 1, p.light);
    g.rect(10, 1, 2, 1, p.light);
    if (/father|king|sky|storm|ruler/.test(text)) {
      g.rect(6, 10, 4, 2, hair);
      g.rect(7, 12, 2, 1, hair);
    }
  } else if (archetype === 'veil') {
    g.rect(3, 3, 10, 2, accent);
    g.rect(3, 2, 2, 2, p.light);
    g.rect(11, 2, 2, 2, p.light);
    g.rect(3, 5, 1, 8, hair);
    g.rect(12, 5, 1, 8, hair);
  } else if (archetype === 'hood') {
    g.rect(3, 3, 10, 2, p.deepTeal);
    g.rect(2, 5, 2, 9, p.deepTeal);
    g.rect(12, 5, 2, 9, p.deepTeal);
    g.set(6, 8, p.gold);
    g.set(9, 8, p.gold);
  } else if (archetype === 'halo') {
    g.rect(4, 3, 8, 1, p.gold);
    g.rect(4, 2, 2, 1, p.light);
    g.rect(10, 2, 2, 1, p.light);
  } else if (archetype === 'horns') {
    g.rect(2, 4, 2, 2, p.bone);
    g.rect(12, 4, 2, 2, p.bone);
    g.rect(2, 2, 1, 3, p.bone);
    g.rect(13, 2, 1, 3, p.bone);
  } else {
    g.rect(4, 4, 8, 2, p.stone);
    g.rect(3, 5, 2, 5, p.stone);
    g.rect(11, 5, 2, 5, p.stone);
  }

  g.rect(7, 14, 2, 1, p.light);
  g.set(8, 14, p.ink);
}

export function characterPortrait(metaId, character, { compact = false } = {}) {
  const p = paletteFor(metaId);
  const g = new Grid(2, 16, 16);
  drawPortrait(g, p, character);
  const label = character?.name ? `Portrait symbol for ${character.name}` : 'Character portrait symbol';
  return `<svg class="character-portrait${compact ? ' character-portrait--compact' : ''}" viewBox="0 0 32 32" role="img" aria-label="${escapeXml(label)}" shape-rendering="crispEdges" focusable="false">${g.svg()}</svg>`;
}
