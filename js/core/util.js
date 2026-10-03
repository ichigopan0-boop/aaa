// ===== 共通ユーティリティ =====
'use strict';
window.G = window.G || {};
G.VERSION = '1.0.0';
G.WORLD_HALF = 800;
G.WATER_Y = 0;
G.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);

G.U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  invLerp: (a, b, v) => (v - a) / (b - a),
  smooth: (e0, e1, x) => { const t = G.U.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); },
  damp: (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)),
  dist2: (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); },
  angDiff: (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
  dampAngle: (a, b, k, dt) => a + G.U.angDiff(a, b) * (1 - Math.exp(-k * dt)),
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  // 決定的な乱数（mulberry32）
  rng(seed) {
    let s = seed >>> 0;
    const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.range = (a, b) => a + f() * (b - a);
    f.int = (a, b) => Math.floor(a + f() * (b - a + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    return f;
  },
  hash2(x, z) { let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; },
  fmt: (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
  el: (id) => document.getElementById(id),
  html(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; },
  escape(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  // 点と線分の距離（XZ）
  distSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az; const l2 = dx * dx + dz * dz;
    let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const cx = ax + dx * t, cz = az + dz * t; return Math.sqrt((px - cx) ** 2 + (pz - cz) ** 2);
  },
  distPolyline(px, pz, pts) { let m = 1e9; for (let i = 0; i < pts.length - 1; i++) { const d = G.U.distSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (d < m) m = d; } return m; },
  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
  nextFrame: () => new Promise(r => requestAnimationFrame(() => r())),
};

// ---- シンプレックスノイズ（2D） ----
(function () {
  const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const perm = new Uint8Array(512);
  const r = G.U.rng(1337);
  const p = []; for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  function noise2(xin, yin) {
    const s = (xin + yin) * F2; const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2; const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0; if (t0 > 0) { const g = grad[perm[ii + perm[jj]] & 7]; t0 *= t0; n0 = t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1; if (t1 > 0) { const g = grad[perm[ii + i1 + perm[jj + j1]] & 7]; t1 *= t1; n1 = t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2; if (t2 > 0) { const g = grad[perm[ii + 1 + perm[jj + 1]] & 7]; t2 *= t2; n2 = t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * (n0 + n1 + n2); // -1..1
  }
  G.Noise = {
    n2: noise2,
    fbm(x, y, oct = 4, lac = 2, gain = 0.5) { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f); n += a; a *= gain; f *= lac; } return s / n; },
    ridged(x, y, oct = 4) { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(noise2(x * f, y * f)); s += a * v * v; n += a; a *= 0.5; f *= 2.03; } return s / n; },
  };
})();

// ---- イベント ----
G.Events = {
  map: {},
  on(name, fn) { (this.map[name] = this.map[name] || []).push(fn); },
  off(name, fn) { const a = this.map[name]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
  emit(name, ...args) { const a = this.map[name]; if (a) for (const fn of a.slice()) { try { fn(...args); } catch (e) { console.error('event', name, e); } } },
};

// ---- マテリアル（トゥーン） ----
G.Mat = {
  cache: new Map(),
  grad3: null, grad4: null,
  init() {
    const mk = (vals) => {
      const d = new Uint8Array(vals.length * 4);
      vals.forEach((v, i) => { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; });
      const t = new THREE.DataTexture(d, vals.length, 1, THREE.RGBAFormat);
      t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
    };
    this.grad3 = mk([110, 190, 255]);
    this.grad4 = mk([90, 150, 210, 255]);
  },
  toon(color, opts = {}) {
    const key = color + '|' + JSON.stringify(opts);
    let m = this.cache.get(key);
    if (!m) {
      m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: this.grad3 }, opts));
      this.cache.set(key, m);
    }
    return m;
  },
  glow(color, opacity = 1) {
    const key = 'glow' + color + opacity;
    let m = this.cache.get(key);
    if (!m) { m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: true }); this.cache.set(key, m); }
    return m;
  },
};

// ---- ジオメトリ結合 ----
G.Geo = {
  // geos: [{geo, matrix?, color?}] → 1つのBufferGeometry（頂点カラー付き）
  merge(list, withColor = true) {
    let total = 0;
    const parts = list.map(it => {
      let g = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      if (it.matrix) g.applyMatrix4(it.matrix);
      if (!g.attributes.normal) g.computeVertexNormals();
      total += g.attributes.position.count;
      return { g, color: it.color };
    });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = withColor ? new Float32Array(total * 3) : null;
    let o = 0; const c = new THREE.Color();
    for (const p of parts) {
      const n = p.g.attributes.position.count;
      pos.set(p.g.attributes.position.array, o * 3);
      nor.set(p.g.attributes.normal.array, o * 3);
      if (col) { c.set(p.color != null ? p.color : 0xffffff); for (let i = 0; i < n; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; } }
      o += n; p.g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  },
  mtx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    return m;
  },
  // ゆがんだ岩
  rock(radius = 1, seed = 1, detail = 0) {
    const g = new THREE.DodecahedronGeometry(radius, detail);
    const p = g.attributes.position; const r = G.U.rng(seed);
    const map = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
      let s = map.get(k); if (s == null) { s = 0.75 + r() * 0.45; map.set(k, s); }
      p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.8, p.getZ(i) * s);
    }
    g.computeVertexNormals();
    return g;
  },
};

// ---- 一時ベクトル ----
G.tmp = {
  v1: new THREE.Vector3(), v2: new THREE.Vector3(), v3: new THREE.Vector3(), v4: new THREE.Vector3(),
  q1: new THREE.Quaternion(), m1: new THREE.Matrix4(), c1: new THREE.Color(), c2: new THREE.Color(),
};

// ---- トースト ----
G.toast = function (msg, ms = 2200) {
  const t = G.U.el('toast'); t.textContent = msg; t.style.opacity = 1;
  clearTimeout(G._toastT); G._toastT = setTimeout(() => (t.style.opacity = 0), ms);
};
