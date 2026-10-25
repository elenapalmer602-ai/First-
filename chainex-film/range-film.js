/**
 * range-film.js
 * Cinematic product-assembly film: an original six-piece skincare range assembles itself,
 * component by component, on rough stone plinths in a pale studio.
 *
 *   SH1  kit of parts: every component hovers in an exploded view, lights come up
 *   T1   snap zoom into the large jar
 *   SH2  jar lands, cream swirls in, foil label wipes on, lid flips and screws down
 *   T2   card flip (vertical axis)
 *   SH3  dropper: pipette slides in, champagne collar spins on, bulb pops on
 *   T3   zoom-through cut (into the black bulb, out of the black roller cap)
 *   SH4  roller: chrome ball seats, cap flips and screws on
 *   T4   card flip (horizontal axis)
 *   SH5  montage: balm jar, eye jar and airless pump assemble in rhythm
 *   T5   fast pull-back reveal
 *   SH6  hero wide of the finished range, sheen sweep, end card
 *
 * Everything is a pure function of time t. renderFrame(t, subframes) renders one output
 * frame with real motion blur (subframe accumulation in linear HDR), so video capture is
 * frame-perfect and repeatable.
 *
 * Usage:
 *   import { mountRangeFilm } from './range-film.js';
 *   const film = mountRangeFilm(el, { brand: 'CHAINEX' });      // live playback
 *   const film = mountRangeFilm(el, { manual: true });          // capture: film.renderFrame(t, film.subframesAt(t))
 *
 * Dependency: three (npm i three), tested with r186. No addons.
 *
 * Chainex hero edition. Adds four options; their defaults reproduce the original film exactly.
 *   labelStyle: 'print'      labels and lid monograms printed matte in colors.ink instead of metallic foil
 *   fadeColor: '#1c1c1d'     the opening lights come up from this colour instead of black
 *   frame: { shiftX, until, shiftXAfter }
 *                            lens shift: the composition moves right by shiftX of the frame width for t < until,
 *                            and by shiftXAfter from then on (negative moves it left); no change in perspective
 *   portraitFit: 0..1        for frames narrower than 16:9, widen the field of view to keep this share of
 *                            the 16:9 horizontal coverage (0 = original behaviour)
 */
import * as THREE from 'three';

const TAU = Math.PI * 2;
let ANISO = 4;

/* ================================================================== */
/* Options                                                             */
/* ================================================================== */

export const DEFAULTS = {
  brand: 'CHAINEX',
  products: {
    jarL: { name: 'Cleanser', num: 'N°01' },
    dropper: { name: 'Serum', num: 'N°02' },
    jarM: { name: 'Balm', num: 'N°03' },
    jarS: { name: 'Eye Cream', num: 'N°04' },
    roller: { name: 'Face Oil', num: 'N°05' },
    airless: { name: 'Night Cream', num: 'N°06' },
  },
  colors: {
    studio: '#dcdbd8',
    stone: '#b9b8b4',
    product: '#1e1f22',
    lid: '#232427',
    glass: '#0f1012',
    foil: '#d3bc90',
    metal: '#cdb48a',
    cream: '#ece6db',
    flipBackdrop: '#c4c3bf',
    flipBackdropEdge: '#9b9a96',
    text: '#1d1e21',
    eyebrow: '#8c7653',
    ink: '#2b2c30',
  },
  endCard: { show: true, eyebrow: 'CHAINEX', line: 'Every component,<br>sourced.' },
  labelStyle: 'foil',
  fadeColor: null,
  frame: { shiftX: 0, until: Infinity, shiftXAfter: 0 },
  portraitFit: 0,
  fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
  manual: false,        // true: no RAF loop; call renderFrame(t, subframes)
  autoplay: true,
  loop: true,           // live playback loops
  maxPixelRatio: 1.5,
  shadowMapSize: 2048,
  msaa: 4,              // MSAA samples per subframe render (0 = rely on jittered subframes)
  physical: true,       // clearcoat materials (slower in software rendering)
  perf: { shadows: true, bump: true, matteEnv: true, rim: true },
  speed: 1,
};

export const DURATION = 18.5;

/* ================================================================== */
/* Math helpers                                                        */
/* ================================================================== */

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const smoothstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const easeInCubic = (x) => x * x * x;
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeInOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const easeInOutExpo = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
const easeOutBack = (x, s = 1.0) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); // s=1 -> 3.7% overshoot
const bump = (x) => Math.sin(Math.PI * clamp01(x));

// Deterministic value noise
function hash3(x, y, z) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) & 0xffffff) / 0xffffff;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u), x10 = lerp(c(0, 1, 0), c(1, 1, 0), u);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), u), x11 = lerp(c(0, 1, 1), c(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 2 - 1;
}
function fbm(x, y, z, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}

/* ================================================================== */
/* Geometry builders                                                   */
/* ================================================================== */

const V2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
const lathe = (pts, segs = 112) => new THREE.LatheGeometry(V2(pts), segs);

class Helix extends THREE.Curve {
  constructor(r, y0, y1, turns) { super(); Object.assign(this, { r, y0, y1, turns }); }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * TAU;
    return target.set(this.r * Math.sin(a), lerp(this.y0, this.y1, t), this.r * Math.cos(a));
  }
}
const helixTube = (r, y0, y1, turns, tube) => new THREE.TubeGeometry(new Helix(r, y0, y1, turns), Math.round(120 * turns), tube, 8, false);

// Rough stone: subdivided box, displaced by position-only noise (so seams never crack),
// edges chipped, top kept flat enough for products to sit on, bottom flat on the floor.
function stoneGeometry(w, h, d, seed) {
  const k = 20;
  const g = new THREE.BoxGeometry(w, h, d, Math.max(6, Math.round(w * k)), Math.max(4, Math.round(h * k)), Math.max(6, Math.round(d * k)));
  const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
  const hx = w / 2, hy = h / 2, hz = d / 2, eps = 1e-4;
  const p = new THREE.Vector3(), dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
    // planar UVs in scene units so the texture never stretches
    if (nx > 0.5) uv.setXY(i, p.z / 1.4 + seed * 0.37, p.y / 1.4 + seed * 0.11);
    else if (ny > 0.5) uv.setXY(i, p.x / 1.4 + seed * 0.53, p.z / 1.4 + seed * 0.29);
    else uv.setXY(i, p.x / 1.4 + seed * 0.71, p.y / 1.4 + seed * 0.19);
    if (p.y <= -hy + eps) continue;
    const dx = hx - Math.abs(p.x), dy = hy - Math.abs(p.y), dz = hz - Math.abs(p.z);
    const sorted = [dx, dy, dz].sort((a, b) => a - b);
    const edge = 1 - smoothstep(0, 0.16, sorted[1]);
    const onTop = p.y >= hy - eps;
    const n1 = fbm(p.x * 1.9 + seed * 7.1, p.y * 1.9 + seed * 1.3, p.z * 1.9 + seed * 3.7, 3);
    const n2 = fbm(p.x * 6.5 + seed * 11.3, p.y * 6.5, p.z * 6.5 + seed * 5.1, 3);
    const t = 0.18;
    dir.set(dx < t ? Math.sign(p.x) : 0, dy < t ? Math.sign(p.y) : 0, dz < t ? Math.sign(p.z) : 0);
    if (dir.lengthSq() === 0) continue;
    dir.normalize().multiplyScalar(-1);
    const ridge = 1 - Math.abs(vnoise(p.x * 11 + seed * 3, p.y * 11, p.z * 11 + seed * 9));
    let amt = edge * (0.035 + 0.085 * Math.max(0, n2 + 0.2) + 0.03 * ridge);
    amt += onTop && edge < 0.4 ? 0.003 * (n1 * 0.5 + 0.5) : 0.02 * (n1 * 0.5 + 0.5) + 0.014 * n2 + 0.01 * ridge;
    if (!onTop) amt += 0.035 * n1;
    p.addScaledVector(dir, amt);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals();
  return g;
}

function stoneTexture(base) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  const col = new THREE.Color(base);
  const br = col.r * 255, bg = col.g * 255, bb = col.b * 255;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = x / S * 8, ny = y / S * 8;
      // tileable-ish: low + mid frequency mottling
      const m = vnoise(nx, ny, 0.5) * 0.55 + vnoise(nx * 3.1, ny * 3.1, 2.5) * 0.3 + vnoise(nx * 9, ny * 9, 4.5) * 0.15;
      const f = 1 + m * 0.16;
      const i = (y * S + x) * 4;
      img.data[i] = br * f; img.data[i + 1] = bg * f; img.data[i + 2] = bb * f; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  let s = 12345;
  const rnd = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 12345 | 0) >>> 0) / 4294967296;
  for (let i = 0; i < 16000; i++) { // pale aggregate flecks
    g.fillStyle = `rgba(232,230,225,${0.18 + rnd() * 0.4})`;
    g.beginPath(); g.arc(rnd() * S, rnd() * S, 0.35 + rnd() * rnd() * 1.6, 0, TAU); g.fill();
  }
  for (let i = 0; i < 14000; i++) { // dark pores
    g.fillStyle = `rgba(70,68,64,${0.18 + rnd() * 0.42})`;
    g.beginPath(); g.arc(rnd() * S, rnd() * S, 0.3 + rnd() * rnd() * 1.5, 0, TAU); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Seamless studio cyc: floor, curve, back wall, with a baked soft light falloff
function cycGeometry() {
  const prof = [];
  for (let z = 16; z > -4.5; z -= 0.5) prof.push([z, 0]);
  for (let i = 0; i <= 28; i++) { const a = (i / 28) * (Math.PI / 2); prof.push([-4.5 - 4.5 * Math.sin(a), 4.5 - 4.5 * Math.cos(a)]); }
  for (let y = 5.5; y <= 18; y += 1) prof.push([-9, y]);
  const xs = 48, X0 = -26, X1 = 26;
  const P = [], C = [], idx = [];
  for (let j = 0; j < prof.length; j++) {
    const [z, y] = prof[j];
    for (let i = 0; i <= xs; i++) {
      const x = lerp(X0, X1, i / xs);
      P.push(x, y, z);
      // brighter pool behind the set, falling off to the sides and the front floor
      const pool = Math.exp(-((x + 0.6) ** 2) / 70) * Math.exp(-((z + 3) ** 2 + (y - 2) ** 2) / 140);
      const f = 0.86 + 0.16 * pool;
      C.push(f, f, f);
    }
  }
  for (let j = 0; j < prof.length - 1; j++) {
    for (let i = 0; i < xs; i++) {
      const a = j * (xs + 1) + i, b = a + 1, c = a + xs + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Product-photography environment: dim room, tall soft boxes -> clean highlight streaks
function studioEnvironment() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x6e6d6b);
  const box = (w, h, k, pos, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look); env.add(m);
  };
  box(1.6, 8, 9.0, [-4.6, 2.5, 2.6], [0, 1, 0]);   // key strip front-left
  box(1.1, 8, 4.0, [4.8, 2.5, 1.6], [0, 1, 0]);    // fill strip right
  box(7, 7, 2.2, [0, 7.5, 0], [0, 0, 0]);          // overhead
  box(0.9, 7, 5.0, [-3.2, 2.5, -4.4], [0, 1, 0]);  // rims behind
  box(0.9, 7, 5.0, [3.4, 2.5, -4.2], [0, 1, 0]);
  box(5, 1.4, 1.2, [0, 0.4, 6], [0, 1, 0]);        // floor bounce
  return env;
}

/* ---------- labels ---------- */

function spaced(ctx, text, cx, y, spacing) {
  const chars = [...text];
  const ws = chars.map((ch) => ctx.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  chars.forEach((ch, i) => { ctx.fillText(ch, x, y); x += ws[i] + spacing; });
}

function foilLabelTexture(W, H, brand, name, num, ff, layout = 'jar') {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const draw = () => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#ffffff';
    g.textBaseline = 'alphabetic';
    const cx = W / 2;
    if (layout === 'slim') {
      g.font = `500 ${H * 0.09}px ${ff}`; spaced(g, brand, cx, H * 0.2, H * 0.09 * 0.34);
      g.fillRect(cx - W * 0.05, H * 0.27, W * 0.1, Math.max(2, H * 0.006));
      g.font = `300 ${H * 0.11}px ${ff}`; spaced(g, name, cx, H * 0.46, H * 0.11 * 0.04);
      g.font = `400 ${H * 0.065}px ${ff}`; spaced(g, num, cx, H * 0.9, H * 0.065 * 0.3);
    } else {
      g.font = `500 ${H * 0.13}px ${ff}`; spaced(g, brand, cx, H * 0.27, H * 0.13 * 0.4);
      g.font = `300 ${H * 0.25}px ${ff}`; spaced(g, name, cx, H * 0.66, H * 0.25 * 0.02);
      g.font = `400 ${H * 0.09}px ${ff}`; spaced(g, num, cx, H * 0.92, H * 0.09 * 0.32);
    }
  };
  draw();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  t.userData.redraw = draw;
  return t;
}

function monogramTexture(ff) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const draw = () => {
    g.clearRect(0, 0, S, S);
    g.strokeStyle = '#fff'; g.fillStyle = '#fff';
    g.lineWidth = 5;
    g.beginPath(); g.arc(S / 2, S / 2, S * 0.4, 0, TAU); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.arc(S / 2, S / 2, S * 0.36, 0, TAU); g.stroke();
    g.font = `300 ${S * 0.36}px ${ff}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('C', S / 2, S / 2 + S * 0.01);
  };
  draw();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  t.userData.redraw = draw;
  return t;
}

function radialTexture(stops, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ================================================================== */
/* Scene layout                                                        */
/* ================================================================== */

const STONES = [
  { id: 'A', w: 3.4, h: 0.36, d: 1.25, x: 0.15, z: 0.45, ry: 0.03, seed: 1.3 },
  { id: 'B', w: 1.45, h: 1.0, d: 1.05, x: -0.9, z: -0.72, ry: -0.06, seed: 2.7 },
  { id: 'C', w: 1.55, h: 0.66, d: 1.0, x: 1.15, z: -0.68, ry: 0.09, seed: 4.1 },
];
const STONE_TOP = Object.fromEntries(STONES.map((s) => [s.id, s.h]));

// Product spots (world x/z on a stone top) and assembly windows (seconds)
const LAYOUT = {
  jarL: { stone: 'A', x: -0.45, z: 0.5, ry: 0.0 },
  roller: { stone: 'A', x: 1.15, z: 0.62, ry: 0.0 },
  dropper: { stone: 'B', x: -1.33, z: -0.8, ry: 0.0 },
  jarM: { stone: 'B', x: -0.45, z: -0.62, ry: 0.0 },
  airless: { stone: 'C', x: 0.82, z: -0.8, ry: 0.0 },
  jarS: { stone: 'C', x: 1.46, z: -0.6, ry: 0.0 },
};

export const TIMELINE = {
  lightsUp: [0, 1.0],
  jarL: { body: [2.95, 3.55], cream: [3.45, 4.3], foil: [4.2, 4.85], lid: [4.7, 5.8] },
  dropper: { body: [6.2, 6.85], foil: [6.8, 7.3], pipette: [7.35, 7.95], collar: [7.85, 8.5], bulb: [8.42, 8.86] },
  roller: { body: [9.3, 9.9], foil: [9.85, 10.3], fitment: [10.2, 10.75], cap: [10.65, 11.55] },
  jarM: { body: [11.95, 12.45], foil: [12.35, 12.8], lid: [12.6, 13.45] },
  airless: { body: [12.15, 12.7], foil: [12.6, 13.05], pump: [12.95, 13.45], cap: [13.4, 14.0] },
  jarS: { body: [12.45, 12.95], foil: [12.9, 13.3], lid: [13.15, 14.0] },
  sheen: [15.7, 17.1],
  endCard: [15.9, 16.7],
};

/* ================================================================== */
/* Main                                                                */
/* ================================================================== */

export function mountRangeFilm(container, userOptions = {}) {
  const opts = {
    ...DEFAULTS, ...userOptions,
    products: { ...DEFAULTS.products, ...(userOptions.products || {}) },
    colors: { ...DEFAULTS.colors, ...(userOptions.colors || {}) },
    endCard: { ...DEFAULTS.endCard, ...(userOptions.endCard || {}) },
    perf: { ...DEFAULTS.perf, ...(userOptions.perf || {}) },
    frame: { ...DEFAULTS.frame, ...(userOptions.frame || {}) },
  };
  const PRINT = opts.labelStyle === 'print';
  const labelMat = (extra) => (PRINT
    ? new THREE.MeshStandardMaterial({ color: C.ink, metalness: 0, roughness: 0.58, ...extra })
    : new THREE.MeshStandardMaterial({ color: C.foil, metalness: 1, roughness: 0.28, ...extra }));
  const C = opts.colors, ff = opts.fontFamily, TL = TIMELINE;
  ANISO = opts.anisotropy ?? 4;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  /* ---------- renderer & targets ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the grade pass
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = opts.perf.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(opts.manual ? 1 : Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio));
  renderer.autoClear = true;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  container.appendChild(canvas);

  const rtOpts = { type: THREE.HalfFloatType, samples: opts.msaa, depthBuffer: true };
  let msRT = new THREE.WebGLRenderTarget(2, 2, rtOpts);
  let rtA = new THREE.WebGLRenderTarget(2, 2, rtOpts);
  let rtB = new THREE.WebGLRenderTarget(2, 2, rtOpts);
  let accRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false });

  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const accMat = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false });
  const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(quadGeo, accMat));
  let ldrRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.UnsignedByteType, depthBuffer: false });
  // linear HDR -> exposure -> Khronos PBR Neutral tone map -> soft vignette -> sRGB, with 1-LSB dither against banding
  const gradeMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, exposure: { value: 1 }, fade: { value: 1 }, vignette: { value: 0.07 }, frame: { value: 0 },
      fadeCol: { value: opts.fadeColor ? new THREE.Color(opts.fadeColor).convertLinearToSRGB() : new THREE.Color(0, 0, 0) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tSrc; uniform float exposure; uniform float fade; uniform float vignette; uniform float frame; uniform vec3 fadeCol; varying vec2 vUv;
      vec3 neutral(vec3 c){
        const float SC = 0.76; const float DS = 0.15;
        float x = min(c.r, min(c.g, c.b));
        float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
        c -= off;
        float peak = max(c.r, max(c.g, c.b));
        if (peak < SC) return c;
        float d = 1.0 - SC;
        float np = 1.0 - d * d / (peak + d - SC);
        c *= np / peak;
        float g = 1.0 - 1.0 / (DS * (peak - np) + 1.0);
        return mix(c, vec3(np), g);
      }
      vec3 srgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), c)); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + frame * 0.618) * 43758.5453); }
      void main(){
        vec3 c = texture2D(tSrc, vUv).rgb * exposure;
        c = neutral(c);
        vec2 q = vUv - 0.5;
        c *= 1.0 - vignette * smoothstep(0.25, 0.85, dot(q, q) * 2.2);
        c = mix(fadeCol, srgb(c), fade); // fade in display space: perceptually even, no sudden jumps near black
        c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const gradeScene = new THREE.Scene(); gradeScene.add(new THREE.Mesh(quadGeo, gradeMat));
  const fxaaMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, res: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tSrc; uniform vec2 res; varying vec2 vUv;
      void main(){
        vec2 inv = 1.0 / res;
        vec3 nw = texture2D(tSrc, vUv + vec2(-1.0, -1.0) * inv).rgb, ne = texture2D(tSrc, vUv + vec2(1.0, -1.0) * inv).rgb;
        vec3 sw = texture2D(tSrc, vUv + vec2(-1.0, 1.0) * inv).rgb, se = texture2D(tSrc, vUv + vec2(1.0, 1.0) * inv).rgb;
        vec3 m = texture2D(tSrc, vUv).rgb;
        vec3 L = vec3(0.299, 0.587, 0.114);
        float lnw = dot(nw, L), lne = dot(ne, L), lsw = dot(sw, L), lse = dot(se, L), lm = dot(m, L);
        float lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));
        vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse));
        float red = max((lnw + lne + lsw + lse) * 0.03125, 1.0 / 128.0);
        float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
        dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * inv;
        vec3 a = 0.5 * (texture2D(tSrc, vUv + dir * (1.0/3.0 - 0.5)).rgb + texture2D(tSrc, vUv + dir * (2.0/3.0 - 0.5)).rgb);
        vec3 b = a * 0.5 + 0.25 * (texture2D(tSrc, vUv - dir * 0.5).rgb + texture2D(tSrc, vUv + dir * 0.5).rgb);
        float lb = dot(b, L);
        gl_FragColor = vec4((lb < lmin || lb > lmax) ? a : b, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const fxaaScene = new THREE.Scene(); fxaaScene.add(new THREE.Mesh(quadGeo, fxaaMat));
  const copyMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0); }',
    depthTest: false, depthWrite: false,
  });
  const copyScene = new THREE.Scene(); copyScene.add(new THREE.Mesh(quadGeo, copyMat));

  // card-flip compositor
  const flipScene = new THREE.Scene();
  flipScene.background = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 288;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(256, 144, 20, 256, 144, 300);
    gr.addColorStop(0, C.flipBackdrop); gr.addColorStop(1, C.flipBackdropEdge);
    g.fillStyle = gr; g.fillRect(0, 0, 512, 288);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const flipCam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const card = new THREE.Group();
  const cardFront = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }));
  const cardBack = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }));
  card.add(cardFront, cardBack);
  flipScene.add(card);

  /* ---------- scene ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.studio);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(studioEnvironment(), 0.02).texture;
  if (opts.perf.matteEnv) { scene.environment = envTex; scene.environmentIntensity = 0.9; }

  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 80);

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-4.5, 7.5, 5.5);
  key.target.position.set(-0.2, 0.6, -0.3);
  key.castShadow = true;
  key.shadow.mapSize.set(opts.shadowMapSize, opts.shadowMapSize);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -3, near: 1, far: 25 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 3;
  scene.add(key, key.target);
  const fill = new THREE.HemisphereLight(0xffffff, 0xc9c7c2, 0.6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(5, 4, -6);
  if (opts.perf.rim) scene.add(rim);
  const sweep = new THREE.DirectionalLight(0xffffff, 0);
  sweep.target.position.set(0, 1, 0);
  scene.add(sweep, sweep.target);

  const cyc = new THREE.Mesh(cycGeometry(), new THREE.MeshStandardMaterial({ color: C.studio, vertexColors: true, roughness: 0.96, metalness: 0 }));
  cyc.receiveShadow = true;
  scene.add(cyc);

  const stoneTex = stoneTexture(C.stone);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, bumpMap: opts.perf.bump ? stoneTex : null, bumpScale: 0.9, roughness: 0.92, metalness: 0 });
  STONES.forEach((s) => {
    const m = new THREE.Mesh(stoneGeometry(s.w, s.h, s.d, s.seed), stoneMat);
    m.position.set(s.x, s.h / 2, s.z);
    m.rotation.y = s.ry;
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  });

  /* ---------- materials ---------- */
  const M = {
    body: new THREE.MeshPhysicalMaterial({ color: C.product, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.22, side: THREE.DoubleSide }),
    lid: new THREE.MeshPhysicalMaterial({ color: C.lid, roughness: 0.32, metalness: 0, clearcoat: 0.75, clearcoatRoughness: 0.12, side: THREE.DoubleSide }),
    glass: new THREE.MeshPhysicalMaterial({ color: C.glass, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide }),
    rubber: new THREE.MeshPhysicalMaterial({ color: '#29292c', roughness: 0.72, metalness: 0, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ color: C.metal, roughness: 0.3, metalness: 1, side: THREE.DoubleSide }),
    chrome: new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.05, metalness: 1 }),
    whitePlastic: new THREE.MeshPhysicalMaterial({ color: '#e7e4de', roughness: 0.42, metalness: 0, side: THREE.DoubleSide }),
    liner: new THREE.MeshStandardMaterial({ color: '#ece8e1', roughness: 0.55, side: THREE.DoubleSide }),
    cream: new THREE.MeshPhysicalMaterial({ color: C.cream, roughness: 0.46, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide }),
    pipette: new THREE.MeshPhysicalMaterial({ color: '#dfe7ea', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }),
    wipeLine: new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0, depthWrite: false }),
  };
  if (!opts.physical) {
    for (const k of ['body', 'lid', 'glass', 'rubber', 'whitePlastic', 'cream']) {
      const m = M[k];
      M[k] = new THREE.MeshStandardMaterial({ color: m.color, roughness: m.roughness, metalness: 0, side: m.side });
    }
  }
  if (!opts.perf.matteEnv) Object.values(M).forEach((m) => { m.envMap = envTex; m.envMapIntensity = 0.9; });
  const monoTex = monogramTexture(ff);

  /* ---------- part helpers ---------- */
  const products = {};
  const blobs = [];
  const blobTex = radialTexture([[0, 'rgba(0,0,0,0.85)'], [0.5, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]);

  function makePart(group, finalY, hover) {
    const root = new THREE.Group();
    root.position.set(0, finalY, 0);
    group.add(root);
    return { root, finalY, hover: { y: 0.2, x: 0, z: 0, rx: 0, rz: 0, ph: 0, ...hover } };
  }
  function foilShell(radius, y0, y1, texture, theta = Math.PI * 0.9) {
    const mat = labelMat({
      map: texture, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, clippingPlanes: [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10)],
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, y1 - y0, 96, 1, true, -theta / 2, theta), mat);
    mesh.position.y = (y0 + y1) / 2;
    mesh.renderOrder = 2;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.005, (y1 - y0) * 1.04), M.wipeLine.clone());
    line.renderOrder = 3;
    return { mesh, mat, line, radius, yMid: (y0 + y1) / 2 };
  }
  function addBlob(group, r) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 3.2, r * 3.2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0 }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.003;
    group.add(m);
    return m;
  }

  function placeProduct(id) {
    const L = LAYOUT[id];
    const g = new THREE.Group();
    g.position.set(L.x, STONE_TOP[L.stone], L.z);
    g.rotation.y = L.ry;
    scene.add(g);
    return g;
  }

  /* ---------- jar ---------- */
  function buildJar(id, R, H, neckH, lidH, hover) {
    const g = placeProduct(id);
    const info = opts.products[id];
    const neckR = R * 0.88, innerR = neckR - 0.028, floorY = 0.07;
    const body = makePart(g, H / 2, hover.body);
    const bodyMesh = new THREE.Mesh(lathe([
      [0, 0.003], [R - 0.035, 0], [R - 0.012, 0.006], [R - 0.002, 0.02], [R, 0.035], [R, H - 0.01], [R - 0.004, H - 0.002], [R - 0.012, H],
      [neckR + 0.004, H], [neckR, H + 0.004], [neckR, H + neckH - 0.008], [neckR - 0.004, H + neckH - 0.002], [neckR - 0.012, H + neckH],
      [innerR + 0.006, H + neckH], [innerR, H + neckH - 0.006], [innerR, floorY + 0.02], [innerR - 0.02, floorY], [0, floorY],
    ], 128), M.body);
    bodyMesh.position.y = -H / 2;
    const thread = new THREE.Mesh(helixTube(neckR + 0.004, H + 0.014, H + neckH - 0.014, 1.3, 0.006), M.body);
    thread.position.y = -H / 2;
    const foil = foilShell(R + 0.0015, H * 0.24, H * 0.82, foilLabelTexture(2048, Math.round(2048 * (H * 0.58) / (R * Math.PI * 0.9)), opts.brand, info.name, info.num, ff));
    foil.mesh.position.y -= H / 2;
    body.root.add(bodyMesh, thread, foil.mesh, foil.line);
    [bodyMesh, thread].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });

    // cream: flat base, dome with a soft twisted peak
    const fillWall = H + neckH - 0.055 - floorY;
    const creamGeo = lathe([
      [0, 0], [innerR - 0.002, 0], [innerR - 0.002, fillWall], [innerR * 0.82, fillWall + 0.018], [innerR * 0.55, fillWall + 0.036],
      [innerR * 0.3, fillWall + 0.062], [innerR * 0.12, fillWall + 0.092], [0, fillWall + 0.11],
    ], 128);
    const cp = creamGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
      if (y <= fillWall + 1e-4) continue;
      const h = (y - fillWall) / 0.11;
      const r = Math.hypot(x, z), th = Math.atan2(z, x) + h * 3.2;
      const rr = r * (1 + 0.16 * Math.sin(3 * th + h * 11) * Math.sqrt(h));
      cp.setXYZ(i, rr * Math.cos(th), y, rr * Math.sin(th));
    }
    creamGeo.computeVertexNormals();
    const cream = new THREE.Mesh(creamGeo, M.cream);
    const creamRoot = new THREE.Group();
    creamRoot.position.y = floorY - H / 2 + 0.001;
    creamRoot.add(cream);
    body.root.add(creamRoot);

    const lid = makePart(g, H + lidH / 2, hover.lid);
    const lidMesh = new THREE.Mesh(lathe([
      [0, lidH], [R - 0.03, lidH], [R - 0.012, lidH - 0.004], [R - 0.003, lidH - 0.014], [R, lidH - 0.03], [R, 0.004], [R - 0.004, 0],
      [neckR + 0.012, 0], [neckR + 0.012, lidH - 0.05], [0, lidH - 0.05],
    ], 128), M.lid);
    lidMesh.position.y = -lidH / 2;
    lidMesh.castShadow = true;
    const linerDisc = new THREE.Mesh(new THREE.CircleGeometry(neckR + 0.011, 64), M.liner);
    linerDisc.rotation.x = Math.PI / 2;
    linerDisc.position.y = lidH / 2 - 0.0505;
    const mono = new THREE.Mesh(new THREE.CircleGeometry(R - 0.045, 64), labelMat({ map: monoTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    mono.rotation.x = -Math.PI / 2;
    mono.position.y = lidH / 2 + 0.0006;
    lid.root.add(lidMesh, linerDisc, mono);

    const blob = addBlob(g, R);
    products[id] = { type: 'jar', g, body, lid, cream: creamRoot, foil, blob, dims: { R, H, neckH, lidH } };
  }

  /* ---------- roller ---------- */
  function buildRoller(id, hover) {
    const g = placeProduct(id);
    const info = opts.products[id];
    const R = 0.085, H = 0.7, neckR = 0.066, neckH = 0.05, capH = 0.3;
    const body = makePart(g, H / 2, hover.body);
    const bm = new THREE.Mesh(lathe([
      [0, 0.002], [R - 0.02, 0], [R - 0.006, 0.005], [R, 0.02], [R, H - 0.008], [R - 0.004, H - 0.001], [R - 0.01, H],
      [neckR + 0.003, H], [neckR, H + 0.003], [neckR, H + neckH - 0.004], [neckR - 0.004, H + neckH], [0.03, H + neckH], [0.03, H - 0.05], [0, H - 0.05],
    ], 64), M.body);
    bm.position.y = -H / 2;
    const th = new THREE.Mesh(helixTube(neckR + 0.003, H + 0.01, H + neckH - 0.012, 1.4, 0.004), M.body);
    th.position.y = -H / 2;
    const foil = foilShell(R + 0.0012, H * 0.42, H * 0.86, foilLabelTexture(1024, Math.round(1024 * (H * 0.44) / (R * Math.PI * 0.9)), opts.brand, info.name, info.num, ff, 'slim'));
    foil.mesh.position.y -= H / 2;
    body.root.add(bm, th, foil.mesh, foil.line);
    bm.castShadow = th.castShadow = true;

    const fit = makePart(g, H + neckH + 0.012, hover.fitment);
    const housing = new THREE.Mesh(lathe([[0.03, -0.03], [0.058, -0.03], [0.058, 0.006], [0.072, 0.008], [0.072, 0.02], [0.05, 0.026], [0.042, 0.03]], 48), M.whitePlastic);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.044, 48, 32), M.chrome);
    ball.position.y = 0.028;
    housing.castShadow = ball.castShadow = true;
    fit.root.add(housing, ball);

    const cap = makePart(g, H + capH / 2, hover.cap);
    const cm = new THREE.Mesh(lathe([
      [0, capH], [R - 0.016, capH], [R - 0.004, capH - 0.006], [R, capH - 0.018], [R, 0.003], [R - 0.003, 0], [neckR + 0.008, 0], [neckR + 0.008, capH - 0.03], [0, capH - 0.03],
    ], 64), M.lid);
    cm.position.y = -capH / 2;
    cm.castShadow = true;
    cap.root.add(cm);
    const blob = addBlob(g, R * 1.8);
    products[id] = { type: 'roller', g, body, fit, ball, cap, foil, blob, dims: { R, H, capH } };
  }

  /* ---------- dropper ---------- */
  function buildDropper(id, hover) {
    const g = placeProduct(id);
    const info = opts.products[id];
    const R = 0.17, wall = 0.44, neckR = 0.072, shoulderTop = 0.585, neckTop = 0.655;
    const body = makePart(g, 0.3, hover.body);
    const pts = [[0, 0.004], [R - 0.03, 0], [R - 0.01, 0.007], [R, 0.03], [R, wall]];
    for (let i = 1; i <= 16; i++) { const t = i / 16, u = 1 - t; pts.push([u * u * R + 2 * u * t * R + t * t * (neckR + 0.012), u * u * wall + 2 * u * t * (shoulderTop - 0.005) + t * t * shoulderTop]); }
    pts.push([neckR, shoulderTop + 0.004], [neckR, neckTop - 0.004], [neckR - 0.004, neckTop], [neckR - 0.016, neckTop], [neckR - 0.018, neckTop - 0.02], [neckR - 0.018, 0.1], [0, 0.1]);
    const bm = new THREE.Mesh(lathe(pts, 112), M.glass);
    bm.position.y = -0.3;
    const th = new THREE.Mesh(helixTube(neckR + 0.003, shoulderTop + 0.012, neckTop - 0.012, 1.3, 0.004), M.glass);
    th.position.y = -0.3;
    const foil = foilShell(R + 0.0015, 0.1, 0.4, foilLabelTexture(2048, Math.round(2048 * 0.3 / (R * Math.PI * 0.9)), opts.brand, info.name, info.num, ff));
    foil.mesh.position.y -= 0.3;
    body.root.add(bm, th, foil.mesh, foil.line);
    bm.castShadow = true;

    const pip = makePart(g, 0.4, hover.pipette);
    const pm = new THREE.Mesh(lathe([[0.004, -0.29], [0.012, -0.27], [0.019, -0.22], [0.02, 0.24], [0.016, 0.25], [0.0, 0.25]], 32), M.pipette);
    pm.renderOrder = 1;
    pip.root.add(pm);

    const colH = 0.115;
    const col = makePart(g, shoulderTop + colH / 2 - 0.005, hover.collar);
    const ribs = [];
    for (let i = 0; i <= 12; i++) { const y = lerp(0.0, colH * 0.72, i / 12); ribs.push([neckR + 0.026 + (i % 2 ? 0.0 : 0.003), y]); }
    const cm = new THREE.Mesh(lathe([
      [neckR + 0.004, 0], ...ribs, [neckR + 0.026, colH * 0.8], [neckR + 0.018, colH * 0.86], [0.05, colH * 0.88], [0.05, colH], [0.03, colH], [0.03, colH * 0.6], [neckR + 0.004, colH * 0.6],
    ], 112), M.metal);
    cm.position.y = -colH / 2;
    cm.castShadow = true;
    col.root.add(cm);

    const bulbH = 0.17;
    const bulb = makePart(g, shoulderTop - 0.005 + colH + bulbH / 2 - 0.004, hover.bulb);
    const bpts = [[0.05, 0], [0.056, 0.01], [0.056, 0.03], [0.05, 0.05]];
    for (let i = 1; i <= 14; i++) { const a = (i / 14) * (Math.PI / 2); bpts.push([0.05 * Math.cos(a) + 0.0, 0.05 + 0.115 * Math.sin(a)]); }
    const bmesh = new THREE.Mesh(lathe(bpts, 64), M.rubber);
    bmesh.position.y = -bulbH / 2;
    bmesh.castShadow = true;
    bulb.root.add(bmesh);
    const blob = addBlob(g, R);
    products[id] = { type: 'dropper', g, body, pip, col, bulb, foil, blob };
  }

  /* ---------- airless pump ---------- */
  function buildAirless(id, hover) {
    const g = placeProduct(id);
    const info = opts.products[id];
    const R = 0.15, H = 0.78, capH = 0.3;
    const body = makePart(g, H / 2, hover.body);
    const bm = new THREE.Mesh(lathe([[0, 0.003], [R - 0.03, 0], [R - 0.01, 0.006], [R, 0.025], [R, H - 0.006], [R - 0.004, H], [0.11, H], [0.11, H + 0.012], [0, H + 0.012]], 96), M.body);
    bm.position.y = -H / 2;
    const foil = foilShell(R + 0.0015, H * 0.38, H * 0.82, foilLabelTexture(2048, Math.round(2048 * (H * 0.44) / (R * Math.PI * 0.9)), opts.brand, info.name, info.num, ff, 'slim'));
    foil.mesh.position.y -= H / 2;
    body.root.add(bm, foil.mesh, foil.line);
    bm.castShadow = true;

    const pumpH = 0.12;
    const pump = makePart(g, H + 0.012 + pumpH / 2, hover.pump);
    const head = new THREE.Mesh(lathe([[0.11, 0], [0.112, 0.03], [0.07, 0.034], [0.068, 0.11], [0.06, 0.12], [0, 0.12]], 80), M.whitePlastic);
    head.position.y = -pumpH / 2;
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.09, 24), M.whitePlastic);
    spout.rotation.z = Math.PI / 2;
    spout.position.set(-0.1, 0.03, 0);
    head.castShadow = true;
    pump.root.add(head, spout);

    const cap = makePart(g, H + capH / 2 + 0.001, hover.cap);
    const cm = new THREE.Mesh(lathe([[0, capH], [R - 0.02, capH], [R - 0.005, capH - 0.006], [R, capH - 0.02], [R, 0.003], [R - 0.003, 0], [R - 0.012, 0], [R - 0.012, capH - 0.012], [0, capH - 0.012]], 96), M.lid);
    cm.position.y = -capH / 2;
    cm.castShadow = true;
    cap.root.add(cm);
    const blob = addBlob(g, R * 1.3);
    products[id] = { type: 'airless', g, body, pump, cap, foil, blob, dims: { R, H, capH } };
  }

  buildJar('jarL', 0.34, 0.4, 0.07, 0.2, {
    body: { y: 0.24, rx: 0.1, rz: -0.07, ph: 0.3 }, lid: { y: 0.88, rx: 0.55, rz: 0.18, ph: 1.1 },
  });
  buildJar('jarM', 0.28, 0.33, 0.06, 0.17, {
    body: { y: 0.22, x: 0.18, z: -0.1, rx: -0.08, rz: 0.06, ph: 2.1 }, lid: { y: 0.78, x: 0.22, z: -0.12, rx: 0.5, rz: -0.2, ph: 0.6 },
  });
  buildJar('jarS', 0.22, 0.24, 0.05, 0.14, {
    body: { y: 1.05, rx: 0.07, rz: 0.08, ph: 1.7 }, lid: { y: 1.45, rx: -0.5, rz: 0.15, ph: 2.6 },
  });
  buildRoller('roller', {
    body: { y: 0.2, rx: 0.06, rz: 0.1, ph: 0.9 }, fitment: { y: 0.42, rx: 0.3, rz: 0.1, ph: 1.9 }, cap: { y: 0.82, rx: 0.4, rz: -0.25, ph: 2.9 },
  });
  buildDropper('dropper', {
    body: { y: 0.2, rx: -0.06, rz: 0.08, ph: 0.4 }, pipette: { y: 0.62, rx: 0.12, rz: -0.18, ph: 1.4 },
    collar: { y: 0.8, rx: 0.35, rz: 0.12, ph: 2.4 }, bulb: { y: 0.95, rx: -0.3, rz: 0.2, ph: 3.4 },
  });
  buildAirless('airless', {
    body: { y: 0.77, rx: 0.05, rz: -0.08, ph: 1.2 }, pump: { y: 0.95, rx: 0.3, rz: 0.15, ph: 2.2 }, cap: { y: 1.2, rx: -0.35, rz: 0.2, ph: 3.2 },
  });

  /* ================================================================ */
  /* Choreography                                                      */
  /* ================================================================ */

  function hoverPose(part, t) {
    const h = part.hover;
    return {
      x: h.x, z: h.z,
      y: part.finalY + h.y + 0.028 * Math.sin(t * 1.25 + h.ph * 2.1),
      rx: h.rx + 0.06 * Math.sin(t * 0.7 + h.ph),
      ry: 0.35 * Math.sin(t * 0.33 + h.ph * 1.7),
      rz: h.rz + 0.05 * Math.cos(t * 0.6 + h.ph),
    };
  }
  function setPose(part, p) {
    part.root.position.set(p.x, p.y, p.z);
    part.root.rotation.set(p.rx, p.ry, p.rz);
  }
  // land: hover -> seated, power3.out
  function land(part, t, [a, b], extraY = 0) {
    const k = easeOutCubic(seg(t, a, b));
    const h = hoverPose(part, t);
    setPose(part, {
      x: lerp(h.x, 0, k), z: lerp(h.z, 0, k), y: lerp(h.y, part.finalY + extraY, k),
      rx: lerp(h.rx, 0, k), ry: lerp(h.ry, 0, k), rz: lerp(h.rz, 0, k),
    });
    return k;
  }
  // closure: flips end-over-end in flight, then screws down
  function flipAndScrew(part, t, [a, b], flips, screwTurns, travel = 0.02, split = 0.74) {
    const k = seg(t, a, b);
    const h = hoverPose(part, t);
    if (k <= 0) { setPose(part, h); return; }
    const kf = clamp01(k / split), ks = clamp01((k - split) / (1 - split));
    const e = easeInOutCubic(kf), ef = easeOutCubic(kf), esc = easeOutCubic(ks);
    const arc = 0.22 * Math.sin(Math.PI * kf) * (1 - kf);
    setPose(part, {
      x: lerp(h.x, 0, e), z: lerp(h.z, 0, e),
      y: lerp(h.y, part.finalY + travel, ef) + arc - travel * esc,
      rx: lerp(h.rx, 0, e) + flips * TAU * (1 - ef),
      ry: lerp(h.ry, 0, e) + screwTurns * TAU * (1 - esc),
      rz: lerp(h.rz, 0, e),
    });
  }
  function foilWipe(prod, t, [a, b]) {
    const f = prod.foil;
    const k = easeInOutCubic(seg(t, a, b));
    f.mesh.visible = t >= a;
    const R = f.radius;
    const cut = lerp(-R * 1.02, R * 1.02, k);
    // plane in body-local space keeps x <= cut, transformed to world
    prod.body.root.updateMatrixWorld(true);
    const pl = f.mat.clippingPlanes[0];
    pl.normal.set(-1, 0, 0); pl.constant = cut;
    pl.applyMatrix4(prod.body.root.matrixWorld);
    // thin stamping line riding the wipe edge
    const vis = bump(seg(t, a - 0.02, b + 0.02));
    f.line.visible = vis > 0.01;
    f.line.material.opacity = 0.9 * vis;
    const th = Math.asin(THREE.MathUtils.clamp(cut / (R + 0.004), -1, 1));
    f.line.position.set((R + 0.004) * Math.sin(th), f.mesh.position.y, (R + 0.004) * Math.cos(th));
    f.line.rotation.set(0, th, 0);
  }
  function blob(prod, k) { prod.blob.material.opacity = 0.42 * k * k; }

  function animateJar(p, t, w, withCream) {
    const kb = land(p.body, t, w.body);
    blob(p, kb);
    if (withCream && w.cream) {
      const kc = easeInOutCubic(seg(t, w.cream[0], w.cream[1]));
      p.cream.visible = t > w.cream[0];
      p.cream.scale.set(1, lerp(0.06, 1, kc), 1);
      p.cream.rotation.y = 3.2 * (1 - easeOutCubic(seg(t, w.cream[0], w.cream[1])));
    } else {
      p.cream.visible = t > w.lid[0];
      p.cream.scale.set(1, 1, 1);
    }
    foilWipe(p, t, w.foil);
    flipAndScrew(p.lid, t, w.lid, 1, 0.5);
  }
  function animateRoller(p, t, w) {
    const kb = land(p.body, t, w.body);
    blob(p, kb);
    foilWipe(p, t, w.foil);
    land(p.fit, t, w.fitment);
    p.ball.rotation.x = 6 * (1 - easeOutCubic(seg(t, w.fitment[0], w.fitment[1] + 0.2)));
    flipAndScrew(p.cap, t, w.cap, 1, 1.0, 0.015, 0.7);
  }
  function animateDropper(p, t, w) {
    const kb = land(p.body, t, w.body);
    blob(p, kb);
    foilWipe(p, t, w.foil);
    land(p.pip, t, w.pipette);
    // collar spins down two turns
    const kc = seg(t, w.collar[0], w.collar[1]);
    const hc = hoverPose(p.col, t);
    const ec = easeOutCubic(kc);
    setPose(p.col, { x: lerp(hc.x, 0, ec), z: lerp(hc.z, 0, ec), y: lerp(hc.y, p.col.finalY, ec), rx: lerp(hc.rx, 0, ec), ry: lerp(hc.ry, 0, ec) + 2 * TAU * (1 - ec), rz: lerp(hc.rz, 0, ec) });
    // bulb pops on, then settles with a 3.7% squash (easeOutBack s=1)
    const kbu = seg(t, w.bulb[0], w.bulb[1]);
    land(p.bulb, t, [w.bulb[0], w.bulb[0] + (w.bulb[1] - w.bulb[0]) * 0.7]);
    const sq = kbu > 0.7 ? easeOutBack(clamp01((kbu - 0.7) / 0.3)) : 0;
    p.bulb.root.scale.set(1, kbu > 0.7 ? lerp(0.94, 1, sq) : 1, 1);
  }
  function animateAirless(p, t, w) {
    const kb = land(p.body, t, w.body);
    blob(p, kb);
    foilWipe(p, t, w.foil);
    land(p.pump, t, w.pump);
    const kp = seg(t, w.pump[1] - 0.05, w.pump[1] + 0.2);
    p.pump.root.position.y -= 0.018 * bump(kp); // click
    flipAndScrew(p.cap, t, w.cap, 0, 0.25, 0.04, 0.8);
  }

  function applyState(t) {
    animateJar(products.jarL, t, TL.jarL, true);
    animateDropper(products.dropper, t, TL.dropper);
    animateRoller(products.roller, t, TL.roller);
    animateJar(products.jarM, t, TL.jarM, false);
    animateAirless(products.airless, t, TL.airless);
    animateJar(products.jarS, t, TL.jarS, false);
    const ks = seg(t, TL.sheen[0], TL.sheen[1]);
    sweep.intensity = 1.8 * bump(ks);
    sweep.position.set(lerp(-7, 7, ks), 3, 5);
    scene.updateMatrixWorld();
  }

  /* ================================================================ */
  /* Cameras                                                           */
  /* ================================================================ */

  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  function shot(t0, t1, pos, tgt, fov, ease = easeInOutSine) {
    const pc = new THREE.CatmullRomCurve3(pos, false, 'centripetal');
    const tc = new THREE.CatmullRomCurve3(tgt, false, 'centripetal');
    return (t) => {
      const u = ease(seg(t, t0, t1));
      const f = fov.length === 1 ? fov[0] : lerp(fov[0], fov[fov.length - 1], u);
      return { pos: pc.getPoint(u), tgt: tc.getPoint(u), fov: f };
    };
  }
  const P = (id, dy = 0) => { const L = LAYOUT[id]; return v(L.x, STONE_TOP[L.stone] + dy, L.z); };

  // SH1 kit of parts: slow orbit, left to right, low and close
  const SH1 = shot(0, 2.75,
    [v(-2.84, 1.36, 5.73), v(-1.08, 1.33, 6.27), v(0.64, 1.3, 6.31)],
    [v(-0.05, 1.32, -0.25), v(-0.05, 1.31, -0.25), v(-0.05, 1.3, -0.25)], [30, 29.5], easeInOutSine);
  // SH2 large jar, from the front-left (roller stays out of frame); starts fast after the zoom cut, ends on a reveal
  const J = P('jarL', 0.3);
  const SH2 = shot(3.0, 6.55,
    [v(J.x - 0.72, J.y + 0.96, J.z + 1.72), v(J.x - 0.56, J.y + 0.7, J.z + 1.48), v(J.x - 0.42, J.y + 0.34, J.z + 1.32), v(J.x - 0.36, J.y + 0.42, J.z + 1.95)],
    [v(J.x, J.y - 0.06, J.z), v(J.x, J.y - 0.04, J.z), v(J.x, J.y, J.z), v(J.x, J.y + 0.02, J.z)], [27, 25],
    (x) => 1 - Math.pow(1 - x, 2.2));
  // SH3 dropper, from the front: label, then the neck, then a push into the bulb
  const D = P('dropper');
  const SH3 = shot(6.05, 9.35,
    [v(D.x + 0.2, D.y + 0.25, D.z + 1.5), v(D.x + 0.17, D.y + 0.3, D.z + 1.32), v(D.x + 0.15, D.y + 0.36, D.z + 1.18), v(D.x + 0.1, D.y + 0.62, D.z + 0.9), v(D.x + 0.03, D.y + 0.79, D.z + 0.3)],
    [v(D.x, D.y + 0.36, D.z), v(D.x, D.y + 0.37, D.z), v(D.x, D.y + 0.42, D.z), v(D.x, D.y + 0.6, D.z), v(D.x, D.y + 0.78, D.z)], [28, 22],
    (x) => (x < 0.86 ? easeInOutSine(x / 0.86) * 0.8 : 0.8 + 0.2 * easeInCubic((x - 0.86) / 0.14)));
  // SH4 roller: emerges from the black cap and pulls back, decelerating
  const R0 = P('roller');
  const SH4 = shot(9.35, 11.95,
    [v(R0.x + 0.05, R0.y + 0.47, R0.z + 0.32), v(R0.x + 0.2, R0.y + 0.76, R0.z + 1.05), v(R0.x + 0.15, R0.y + 1.06, R0.z + 0.85), v(R0.x + 0.27, R0.y + 0.98, R0.z + 1.72)],
    [v(R0.x, R0.y + 0.42, R0.z), v(R0.x, R0.y + 0.5, R0.z), v(R0.x, R0.y + 0.76, R0.z), v(R0.x, R0.y + 0.6, R0.z)], [22, 28],
    (x) => easeOutCubic(x));
  // SH5 montage of the back row, elevated so the front row sits low in frame
  const SH5 = shot(11.65, 14.3,
    [v(-0.2, 2.35, 2.75), v(0.35, 2.25, 2.85), v(0.85, 2.15, 2.8)],
    [v(0.4, 1.06, -0.7), v(0.4, 1.05, -0.7), v(0.4, 1.04, -0.7)], [32, 31]);
  // SH6 reveal: decelerating pull-back to the hero wide, then a slow push
  const FINAL_TGT = v(-0.7, 0.9, -0.2);
  const SH6a = shot(14.6, 15.9, [v(-0.15, 1.42, 4.3), v(-0.36, 1.38, 5.4), v(-0.45, 1.36, 6.05)], [FINAL_TGT, FINAL_TGT, FINAL_TGT], [30, 30], (x) => easeOutCubic(x));
  const SH6b = shot(15.9, DURATION, [v(-0.45, 1.36, 6.05), v(-0.47, 1.34, 5.88), v(-0.49, 1.32, 5.7)], [FINAL_TGT, FINAL_TGT, FINAL_TGT], [30, 30], easeInOutSine);

  function blendCam(a, b, k) { return { pos: a.pos.clone().lerp(b.pos, k), tgt: a.tgt.clone().lerp(b.tgt, k), fov: lerp(a.fov, b.fov, k) }; }
  // speed-ramp legs that end in a cut on motion
  const T1from = SH1(2.75), T1to = blendCam(SH1(2.75), SH2(3.0), 0.55);
  const T5from = SH5(14.3);
  const T5to = (() => { const d = T5from.pos.clone().sub(T5from.tgt).normalize(); return { pos: T5from.pos.clone().addScaledVector(d, 1.1), tgt: T5from.tgt.clone(), fov: T5from.fov }; })();

  function cameraAt(t) {
    if (t < 2.75) return SH1(t);
    if (t < 3.0) return blendCam(T1from, T1to, easeInCubic(seg(t, 2.75, 3.0)));     // accelerate, cut
    if (t < 6.3) return SH2(t);
    if (t < 9.35) return SH3(t);
    if (t < 11.9) return SH4(t);
    if (t < 14.3) return SH5(t);
    if (t < 14.6) return blendCam(T5from, T5to, easeInCubic(seg(t, 14.3, 14.6)));   // accelerate back, cut
    if (t < 15.9) return SH6a(t);
    return SH6b(t);
  }
  const FLIPS = [
    { a: 6.05, b: 6.55, from: SH2, to: SH3, axis: 'y' },
    { a: 11.65, b: 12.15, from: SH4, to: SH5, axis: 'x' },
  ];
  const flipAt = (t) => FLIPS.find((f) => t >= f.a && t < f.b);
  const CUTS = [3.0, 9.35, 14.6]; // hard cuts (zoom cut, zoom-through, pull-back cut)

  // motion-blur subframes per output frame (more where the camera or parts move fast)
  function subframesAt(t) {
    if (flipAt(t)) return 12;                                                  // cheap: composite only
    if ((t >= 2.75 && t < 3.25) || (t >= 14.3 && t < 14.85)) return 6;        // zoom cut, pull-back cut
    if (t >= 9.12 && t < 9.55) return 5;                                       // zoom-through
    const fast = [TL.jarL.lid, TL.roller.cap, TL.jarM.lid, TL.jarS.lid, TL.dropper.collar, TL.airless.cap].some(([a2, b2]) => t >= a2 && t < b2);
    return fast ? 3 : 1;
  }
  function shutterAt() { return 0.5; } // 180-degree shutter

  /* ================================================================ */
  /* Overlay (fade + end card)                                         */
  /* ================================================================ */

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  const fade = document.createElement('div');
  fade.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;';
  const card2 = document.createElement('div');
  card2.style.cssText = `position:absolute;left:6.25%;top:46%;transform:translateY(-50%);font-family:${ff};`;
  const masks = [];
  const mask = (html, css) => {
    const m = document.createElement('div');
    m.style.cssText = 'overflow:hidden;';
    masks.push(m);
    const inner = document.createElement('div');
    inner.style.cssText = css + 'will-change:transform;';
    inner.innerHTML = html;
    m.appendChild(inner);
    card2.appendChild(m);
    return inner;
  };
  const eyebrow = mask(opts.endCard.eyebrow, `color:${C.eyebrow};letter-spacing:.42em;font-weight:500;text-transform:uppercase;`);
  const line = mask(opts.endCard.line, `color:${C.text};font-weight:300;letter-spacing:-.01em;line-height:1.08;`);
  overlay.append(fade, card2);
  container.appendChild(overlay);

  function updateOverlay(t) {
    // zoom-through dip to black
    const f = t < 9.35 ? smoothstep(8.95, 9.35, t) : 1 - smoothstep(9.35, 9.75, t);
    fade.style.opacity = f;
    card2.style.display = opts.endCard.show ? '' : 'none';
    const [a] = TL.endCard;
    const k1 = easeOutCubic(seg(t, a, a + 0.65)), k2 = easeOutCubic(seg(t, a + 0.12, a + 0.8));
    eyebrow.style.transform = `translateY(${(1 - k1) * 110}%)`;
    line.style.transform = `translateY(${(1 - k2) * 110}%)`;
  }

  /* ================================================================ */
  /* Rendering                                                         */
  /* ================================================================ */

  let W = 2, H = 2;
  function resize() {
    W = Math.max(2, Math.round(container.clientWidth * renderer.getPixelRatio()));
    H = Math.max(2, Math.round(container.clientHeight * renderer.getPixelRatio()));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    [msRT, rtA, rtB, accRT, ldrRT].forEach((rt) => rt.setSize(W, H));
    fxaaMat.uniforms.res.value.set(W, H);
    camera.aspect = W / H;
    flipCam.aspect = W / H;
    // card sized to fill the flip camera exactly at z=0
    const dist = 3;
    flipCam.position.set(0, 0, dist);
    flipCam.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(0.5 / dist));
    flipCam.updateProjectionMatrix();
    card.scale.set(W / H, 1, 1);
    const px = container.clientHeight;
    eyebrow.style.fontSize = `${Math.round(px * 0.02)}px`;
    masks[0].style.marginBottom = `${Math.round(px * 0.018)}px`;
    line.style.fontSize = `${Math.round(px * 0.058)}px`;
    if (!playing) renderFrame(time, 1);
  }

  let camT = 0; // time of the shot being rendered (for the lens shift)
  function setCamera(cs) {
    camera.position.copy(cs.pos);
    let fov = cs.fov;
    const aspect = W / H;
    if (opts.portraitFit > 0 && aspect < 16 / 9) {
      const k = Math.max(1, opts.portraitFit * (16 / 9) / aspect);
      fov = 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * k));
    }
    camera.fov = fov;
    const sx = (camT < opts.frame.until ? opts.frame.shiftX : opts.frame.shiftXAfter) || 0;
    if (sx) camera.setViewOffset(W * (1 + 2 * Math.abs(sx)), H, sx > 0 ? 0 : 2 * Math.abs(sx) * W, 0, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    camera.lookAt(cs.tgt);
    camera.updateMatrixWorld();
  }
  function renderScene(target, cs) {
    setCamera(cs);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
  }
  function accumulate(tex, weight, clear) {
    renderer.setRenderTarget(accRT);
    if (clear) { renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false); }
    accMat.map = tex;
    accMat.opacity = weight;
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(accScene, quadCam);
    renderer.autoClear = ac;
  }

  function renderFrame(t, subframes = 1) {
    t = Math.min(DURATION, Math.max(0, t));
    const n = Math.max(1, subframes | 0);
    const dt = (1 / 30) * shutterAt(t);
    const fl = flipAt(t);
    if (fl) {
      applyState(t);
      camT = t;
      renderScene(rtA, fl.from(t));
      renderScene(rtB, fl.to(t));
      cardFront.material.map = rtA.texture;
      cardBack.material.map = rtB.texture;
      cardBack.rotation.set(fl.axis === 'x' ? Math.PI : 0, fl.axis === 'y' ? Math.PI : 0, 0);
      for (let i = 0; i < n; i++) {
        const tk = t + ((i + 0.5) / n - 0.5) * dt;
        const k = easeInOutCubic(seg(tk, fl.a, fl.b));
        const ang = Math.PI * k;
        card.rotation.set(fl.axis === 'x' ? -ang : 0, fl.axis === 'y' ? ang : 0, 0);
        const s = 1 - 0.16 * Math.sin(ang);
        card.scale.set((W / H) * s, s, s);
        card.position.z = -0.35 * Math.sin(ang);
        renderer.setRenderTarget(msRT);
        renderer.render(flipScene, flipCam);
        accumulate(msRT.texture, 1 / n, i === 0);
      }
    } else {
      // never let a frame's shutter straddle a hard cut (it would double-expose two shots)
      const lo = CUTS.filter((c) => c <= t).pop() ?? -Infinity;
      const hi = CUTS.find((c) => c > t) ?? Infinity;
      for (let i = 0; i < n; i++) {
        let tk = n === 1 ? t : t + ((i + 0.5) / n - 0.5) * dt;
        tk = Math.min(Math.max(tk, lo), hi - 1e-4);
        applyState(tk);
        camT = tk;
        renderScene(msRT, cameraAt(tk));
        accumulate(msRT.texture, 1 / n, i === 0);
      }
    }
    gradeMat.uniforms.tSrc.value = accRT.texture;
    gradeMat.uniforms.fade.value = easeInOutSine(seg(t, TL.lightsUp[0], TL.lightsUp[1]));
    gradeMat.uniforms.frame.value = Math.round(t * 30) % 64;
    renderer.setRenderTarget(ldrRT);
    renderer.render(gradeScene, quadCam);
    renderer.setRenderTarget(null);
    if (opts.msaa > 0) { copyMat.uniforms.tSrc.value = ldrRT.texture; renderer.render(copyScene, quadCam); }
    else { fxaaMat.uniforms.tSrc.value = ldrRT.texture; renderer.render(fxaaScene, quadCam); }
    updateOverlay(t);
  }

  /* ---------- playback ---------- */
  let time = 0, playing = false, raf = 0, last = 0, visible = true;
  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    if (!visible || !playing) return;
    time += dt * opts.speed;
    if (time > DURATION + 1.5) time = opts.loop ? 0 : DURATION;
    renderFrame(Math.min(time, DURATION), 1);
  }
  function play() { playing = true; if (!raf && !opts.manual) { last = 0; raf = requestAnimationFrame(tick); } }
  function pause() { playing = false; }
  function seek(t) { time = t; renderFrame(t, 1); }

  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  let io = null;
  if (!opts.manual) {
    io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && opts.autoplay && !playing) play(); }, { threshold: 0.15 });
    io.observe(container);
  }
  const ready = (async () => {
    try {
      await Promise.race([
        Promise.all([document.fonts.load(`300 40px ${ff}`), document.fonts.load(`500 40px ${ff}`)]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch (e) { /* fall back */ }
    // redraw labels now that the font is loaded
    scene.traverse((o) => {
      const m = o.material && o.material.map;
      if (m && m.userData && m.userData.redraw) { m.userData.redraw(); m.needsUpdate = true; }
    });
  })();
  resize();
  renderFrame(0, 1);

  function destroy() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io && io.disconnect();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => { m.map && m.map.dispose(); m.dispose(); });
    });
    [msRT, rtA, rtB, accRT, ldrRT].forEach((rt) => rt.dispose());
    envTex.dispose(); pmrem.dispose(); renderer.dispose();
    canvas.remove(); overlay.remove();
  }

  return { play, pause, seek, renderFrame, subframesAt, resize, destroy, ready, duration: DURATION, get time() { return time; }, _debug: { scene, renderer, products, cyc } };
}
