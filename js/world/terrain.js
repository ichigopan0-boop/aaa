// ===== 地形（高さマップ生成・メッシュ・高さ取得） =====
'use strict';
G.Terrain = {
  N: 400, CELL: 4, SIZE: 1600,
  heights: null, colors: null, density: null, regionIdx: null,
  chunks: [], flatSites: [],
  init() {
    const n1 = this.N + 1;
    this.heights = new Float32Array(n1 * n1);
    this.colors = new Float32Array(n1 * n1 * 3);
    this.density = new Uint8Array(n1 * n1);
    this.grassCol = new Uint8Array(n1 * n1 * 3);
    this.regionIdx = new Uint8Array(n1 * n1);
    this.roadSegs = [];
    for (const r of G.World.roads) for (let i = 0; i < r.length - 1; i++) this.roadSegs.push([r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]]);
  },
  // ---- 地域の重み ----
  smooth: (a, b, x) => G.U.smooth(a, b, x),
  roadDist(x, z) { let m = 1e9; for (const s of this.roadSegs) { const d = G.U.distSeg(x, z, s[0], s[1], s[2], s[3]); if (d < m) m = d; } return m; },
  masks(x, z) {
    const S = this.smooth;
    const snow = S(-280, -430, z) * (1 - S(-330, -430, x)) * (1 - S(280, 380, x));
    const canyon = S(-330, -440, x) * S(-300, -420, z);
    const dV = Math.hypot(x - 520, z + 280);
    const volcano = S(280, 150, dV);
    const dF = Math.hypot(x + 470, z + 30);
    const forest = S(290, 160, dF) * (1 - canyon);
    const dL = Math.hypot(x - 430, z - 420);
    const lake = S(260, 140, dL);
    const dP = Math.hypot(x + 430, z - 420);
    const plains = S(270, 150, dP);
    const dC = Math.hypot(x, z);
    const castle = S(170, 100, dC);
    return { snow, canyon, volcano, forest, lake, plains, castle, dV, dL, dC };
  },
  // ---- 生の高さ関数 ----
  raw(x, z) {
    const Nz = G.Noise, S = this.smooth;
    const m = this.masks(x, z);
    const rd = this.roadDist(x, z);
    const roadM = S(30, 6, rd);
    let h = 14 + Nz.fbm(x / 420, z / 420, 4) * 16 + Nz.fbm(x / 90 + 5, z / 90 - 3, 3) * 4;
    // 森：なだらかな丘
    h += m.forest * Nz.fbm(x / 120 + 3, z / 120, 3) * 14;
    // 平原：平ら
    h = G.U.lerp(h, 10 + Nz.fbm(x / 250, z / 250, 2) * 6, m.plains * 0.8);
    // はじまりの野
    const dS = Math.hypot(x, z - 470);
    h = G.U.lerp(h, 14 + Nz.fbm(x / 200, z / 200, 2) * 7, S(250, 120, dS) * 0.7);
    // 雪山
    if (m.snow > 0) {
      const detail = Nz.ridged(x / 160 + 11, z / 160 - 7, 5);
      let mt = 50 + detail * 160 * (1 - roadM * 0.75);
      const dPk = Math.hypot(x + 10, z + 640);
      mt += Math.pow(S(110, 0, dPk), 2) * 90;
      h += m.snow * mt;
    }
    // 峡谷：段々の台地
    if (m.canyon > 0) {
      const t = 40 + (Nz.fbm(x / 150 - 9, z / 150 + 4, 3) * 0.5 + 0.5) * 110;
      const step = 22, fl = Math.floor(t / step), fr = t / step - fl;
      let terr = fl * step + S(0.75, 0.95, fr) * step;
      const ch = S(0.16, 0.05, Math.abs(Nz.n2(x / 140 + 2, z / 140 + 8)));
      terr = G.U.lerp(terr, 28, ch);
      terr = G.U.lerp(terr, 30 + Nz.fbm(x / 60, z / 60, 2) * 4, roadM * 0.9);
      h = G.U.lerp(h, terr, m.canyon);
    }
    // 火山
    if (m.dV < 300) {
      const cone = Math.pow(Math.max(0, 1 - m.dV / 270), 1.3) * 210;
      h = Math.max(h, h * 0.4 + cone + Nz.fbm(x / 40, z / 40, 3) * 6 * (1 - S(60, 0, m.dV)));
      if (m.dV < 48) h -= (1 - (m.dV / 48) ** 2) * 82;
      const dI = Math.hypot(x - 520, z + 280);
      if (dI < 14) h = Math.max(h, G.U.lerp(h, 162, S(14, 8, dI)));
    }
    // 古城の台地
    h = G.U.lerp(h, 40 + Nz.fbm(x / 50, z / 50, 2) * 1.5, S(160, 100, m.dC));
    // 川
    const dR = G.U.distPolyline(x, z, G.World.river);
    if (dR < 80) {
      h -= S(70, 12, dR) * 9;
      h = G.U.lerp(h, -3.5 + Nz.n2(x / 30, z / 30) * 0.8, S(20, 6, dR));
    }
    const dSrc = Math.hypot(x - 70, z + 330);
    if (dSrc < 50) h = G.U.lerp(h, -4, S(34, 18, dSrc));
    // 湖
    if (m.dL < 220) {
      h = G.U.lerp(h, -14 + Nz.fbm(x / 60, z / 60, 2) * 4, S(185, 85, m.dL));
      const dIs = Math.hypot(x - 462, z - 452);
      h = G.U.lerp(h, 4 + Nz.fbm(x / 30, z / 30, 2) * 1.5, S(48, 28, dIs));
    }
    // 小さな池
    for (const p of this.ponds) { const d = Math.hypot(x - p[0], z - p[1]); if (d < p[2] * 1.8) h = G.U.lerp(h, -3, S(p[2] * 1.6, p[2] * 0.6, d)); }
    // 世界の端の山
    const e = Math.max(Math.abs(x), Math.abs(z));
    if (e > 600) h += S(620, 790, e) * (110 + Nz.ridged(x / 100, z / 100, 3) * 70);
    return h;
  },
  ponds: [[-180, 360, 16], [-560, 120, 14], [-300, -40, 12], [150, 640, 15], [-80, 600, 10], [-620, 380, 18]],
  // 平らにする場所（村・祠・塔・キャンプ）
  collectFlatSites() {
    const s = [];
    for (const v of G.World.villages) s.push({ x: v.x, z: v.z, r: v.flat });
    for (const v of G.World.shrines) s.push({ x: v.x, z: v.z, r: 9 });
    for (const v of G.World.towers) s.push({ x: v.x, z: v.z, r: 9 });
    for (const v of G.World.camps) s.push({ x: v.x, z: v.z, r: 15 });
    for (const v of G.World.bosses) if (v.type !== 'lizal_king') s.push({ x: v.x, z: v.z, r: 28 });
    s.push({ x: G.World.sealSword.x, z: G.World.sealSword.z, r: 18 });
    for (const f of s) f.t = Math.max(this.raw(f.x, f.z), 2);
    this.flatSites = s;
  },
  heightFn(x, z) {
    let h = this.raw(x, z);
    for (const f of this.flatSites) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r) h = G.U.lerp(h, f.t, G.U.smooth(f.r, f.r * 0.55, d));
    }
    return h;
  },
  // ---- 生成（非同期・進捗コールバック） ----
  async generate(progress) {
    this.init();
    this.collectFlatSites();
    const n1 = this.N + 1, C = this.CELL, H = 800;
    for (let j = 0; j < n1; j++) {
      const z = -H + j * C;
      for (let i = 0; i < n1; i++) this.heights[j * n1 + i] = this.heightFn(-H + i * C, z);
      if (j % 40 === 0) { progress && progress(j / n1); await G.U.nextFrame(); }
    }
    this.computeColors();
    this.buildTextures();
  },
  regionAt(x, z) {
    let best = null, bd = 1e9;
    for (const r of G.World.regions) { const d = Math.hypot(x - r.x, z - r.z) / r.r; if (d < bd) { bd = d; best = r; } }
    return bd < 1.15 ? best : G.World.regions[1];
  },
  computeColors() {
    const n1 = this.N + 1, C = this.CELL, H = 800, hs = this.heights;
    const col = new THREE.Color(), tmp = new THREE.Color();
    const pal = {
      meadow: new THREE.Color(0x7cbc4c), meadow2: new THREE.Color(0x92cf58), forest: new THREE.Color(0x4f8f3a), forest2: new THREE.Color(0x3d7630),
      plains: new THREE.Color(0xa3cf5a), lake: new THREE.Color(0x6fb052), snow: new THREE.Color(0xf2f6fb), snow2: new THREE.Color(0xdde8f3),
      volc: new THREE.Color(0x4a3e3a), volc2: new THREE.Color(0x66524a), canyon: new THREE.Color(0xc98d5c), canyon2: new THREE.Color(0xa86e46),
      castle: new THREE.Color(0x889a62), rock: new THREE.Color(0x8b8378), rockDark: new THREE.Color(0x6d665e), sand: new THREE.Color(0xe0d09c),
      under: new THREE.Color(0x7d8a62), deep: new THREE.Color(0x4f6f6a), road: new THREE.Color(0xbb9c6a), lavaRock: new THREE.Color(0x3a2a26),
    };
    const regIds = G.World.regions.map(r => r.id);
    for (let j = 0; j < n1; j++) {
      for (let i = 0; i < n1; i++) {
        const idx = j * n1 + i, x = -H + i * C, z = -H + j * C, h = hs[idx];
        const hl = hs[j * n1 + Math.max(0, i - 1)], hr = hs[j * n1 + Math.min(this.N, i + 1)];
        const hu = hs[Math.max(0, j - 1) * n1 + i], hd = hs[Math.min(this.N, j + 1) * n1 + i];
        const nx = hl - hr, nz = hu - hd, ny = 2 * C; const ln = Math.hypot(nx, ny, nz); const up = ny / ln;
        const m = this.masks(x, z);
        const nv = G.Noise.n2(x / 18, z / 18) * 0.5 + 0.5, nv2 = G.Noise.n2(x / 70 + 9, z / 70) * 0.5 + 0.5;
        // 基本の草地
        col.copy(pal.meadow).lerp(pal.meadow2, nv * 0.8);
        let dens = 1;
        if (m.plains > 0) { tmp.copy(pal.plains).lerp(pal.meadow2, nv * 0.4); col.lerp(tmp, m.plains); }
        if (m.lake > 0) { col.lerp(pal.lake, m.lake * 0.7); }
        if (m.forest > 0) { tmp.copy(pal.forest).lerp(pal.forest2, nv); col.lerp(tmp, m.forest); dens -= m.forest * 0.25; }
        if (m.castle > 0) { col.lerp(pal.castle, m.castle * 0.8); dens -= m.castle * 0.4; }
        if (m.canyon > 0) { tmp.copy(pal.canyon).lerp(pal.canyon2, (Math.floor(h / 7) % 2) * 0.6 + nv * 0.3); col.lerp(tmp, m.canyon); dens -= m.canyon * 0.9; }
        const volc = G.U.smooth(260, 170, m.dV);
        if (volc > 0) { tmp.copy(pal.volc).lerp(pal.volc2, nv); if (m.dV < 60) tmp.lerp(pal.lavaRock, 0.6); col.lerp(tmp, volc); dens -= volc; }
        // 雪（雪山＋高地）
        let snowAmt = m.snow * G.U.smooth(40, 75, h) + G.U.smooth(130, 165, h) * (1 - volc);
        snowAmt = G.U.clamp(snowAmt, 0, 1);
        if (snowAmt > 0) { tmp.copy(pal.snow).lerp(pal.snow2, nv); col.lerp(tmp, snowAmt); dens -= snowAmt; }
        // 急斜面は岩
        const rockAmt = G.U.smooth(0.78, 0.62, up);
        if (rockAmt > 0) {
          tmp.copy(pal.rock).lerp(pal.rockDark, nv2);
          if (snowAmt > 0.5) tmp.lerp(pal.snow2, 0.35);
          if (m.canyon > 0.5) tmp.copy(pal.canyon2).lerp(pal.canyon, nv);
          if (volc > 0.5) tmp.copy(pal.volc).lerp(pal.lavaRock, nv);
          col.lerp(tmp, rockAmt); dens -= rockAmt * 1.2;
        }
        // 道
        const rd = this.roadDist(x, z);
        const roadAmt = G.U.smooth(5.5, 2.5, rd) * (1 - snowAmt * 0.6);
        if (roadAmt > 0 && h > 0.5) { col.lerp(pal.road, roadAmt * 0.9); dens -= roadAmt * 1.5; }
        // 水辺・水中
        if (h < 1.8) { col.lerp(pal.sand, G.U.smooth(1.8, 0.6, h) * (1 - snowAmt)); dens -= G.U.smooth(1.8, 0.8, h) * 2; }
        if (h < -0.5) { col.copy(pal.under).lerp(pal.deep, G.U.smooth(-1, -10, h)); dens = 0; }
        // 村の中は草少なめ
        for (const v of G.World.villages) { const d = Math.hypot(x - v.x, z - v.z); if (d < v.flat) dens = Math.min(dens, 0.35 + d / v.flat * 0.4); }
        // 明暗のゆらぎ
        const shade = 0.93 + nv2 * 0.12;
        this.colors[idx * 3] = col.r * shade; this.colors[idx * 3 + 1] = col.g * shade; this.colors[idx * 3 + 2] = col.b * shade;
        dens = G.U.clamp(dens, 0, 1);
        this.density[idx] = Math.round(dens * 255);
        this.grassCol[idx * 3] = Math.min(255, col.r * 255 * 1.08); this.grassCol[idx * 3 + 1] = Math.min(255, col.g * 255 * 1.1); this.grassCol[idx * 3 + 2] = Math.min(255, col.b * 255);
        const reg = this.regionAt(x, z); this.regionIdx[idx] = regIds.indexOf(reg.id);
      }
    }
  },
  buildTextures() {
    const n1 = this.N + 1;
    const hd = new Uint8Array(n1 * n1 * 4), cd = new Uint8Array(n1 * n1 * 4);
    for (let k = 0; k < n1 * n1; k++) {
      const v = Math.round(G.U.clamp((this.heights[k] + 100) / 600, 0, 1) * 65535);
      hd[k * 4] = v >> 8; hd[k * 4 + 1] = v & 255; hd[k * 4 + 2] = this.density[k]; hd[k * 4 + 3] = 255;
      cd[k * 4] = this.grassCol[k * 3]; cd[k * 4 + 1] = this.grassCol[k * 3 + 1]; cd[k * 4 + 2] = this.grassCol[k * 3 + 2]; cd[k * 4 + 3] = 255;
    }
    const mk = (d) => { const t = new THREE.DataTexture(d, n1, n1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = false; t.needsUpdate = true; return t; };
    this.heightTex = mk(hd); this.colorTex = mk(cd);
  },
  // ---- メッシュ化（8×8チャンク） ----
  buildMeshes(scene) {
    const CH = 8, seg = this.N / CH, n1 = this.N + 1, C = this.CELL, H = 800;
    const vpr = seg + 1;
    const idx = [];
    for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
      const a = j * vpr + i, b = (j + 1) * vpr + i, c = (j + 1) * vpr + i + 1, d = j * vpr + i + 1;
      idx.push(a, b, d, b, c, d);
    }
    const index = new THREE.BufferAttribute(new Uint32Array(idx), 1);
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: G.Mat.grad4 });
    this.material = mat;
    for (let cj = 0; cj < CH; cj++) for (let ci = 0; ci < CH; ci++) {
      const pos = new Float32Array(vpr * vpr * 3), nor = new Float32Array(vpr * vpr * 3), col = new Float32Array(vpr * vpr * 3);
      let k = 0;
      for (let j = 0; j < vpr; j++) for (let i = 0; i < vpr; i++) {
        const gi = ci * seg + i, gj = cj * seg + j, g = gj * n1 + gi;
        pos[k * 3] = -H + gi * C; pos[k * 3 + 1] = this.heights[g]; pos[k * 3 + 2] = -H + gj * C;
        const hl = this.heights[gj * n1 + Math.max(0, gi - 1)], hr = this.heights[gj * n1 + Math.min(this.N, gi + 1)];
        const hu = this.heights[Math.max(0, gj - 1) * n1 + gi], hd = this.heights[Math.min(this.N, gj + 1) * n1 + gi];
        let nx = hl - hr, ny = 2 * C, nz = hu - hd; const l = Math.hypot(nx, ny, nz);
        nor[k * 3] = nx / l; nor[k * 3 + 1] = ny / l; nor[k * 3 + 2] = nz / l;
        col[k * 3] = this.colors[g * 3]; col[k * 3 + 1] = this.colors[g * 3 + 1]; col[k * 3 + 2] = this.colors[g * 3 + 2];
        k++;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setIndex(index);
      geo.computeBoundingSphere(); geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      mesh.userData.cx = -H + (ci + 0.5) * seg * C; mesh.userData.cz = -H + (cj + 0.5) * seg * C;
      scene.add(mesh); this.chunks.push(mesh);
    }
  },
  updateVisibility(px, pz, far) {
    for (const m of this.chunks) { const d = Math.hypot(m.userData.cx - px, m.userData.cz - pz) - 145; m.visible = d < far; }
  },
  // ---- 高さ取得（メッシュと完全一致する三角形補間） ----
  getHeight(x, z) {
    const H = 800, C = this.CELL, N = this.N;
    if (x < -H || x > H || z < -H || z > H) return -1000;
    let fx = (x + H) / C, fz = (z + H) / C;
    let i = Math.floor(fx), j = Math.floor(fz);
    if (i >= N) i = N - 1; if (j >= N) j = N - 1;
    const tx = fx - i, tz = fz - j, n1 = N + 1, hs = this.heights;
    const h00 = hs[j * n1 + i], h10 = hs[j * n1 + i + 1], h01 = hs[(j + 1) * n1 + i], h11 = hs[(j + 1) * n1 + i + 1];
    if (tx + tz <= 1) return h00 + (h10 - h00) * tx + (h01 - h00) * tz;
    return h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz);
  },
  getNormal(x, z, out) {
    const e = 1.0;
    const nx = this.getHeight(x - e, z) - this.getHeight(x + e, z);
    const nz = this.getHeight(x, z - e) - this.getHeight(x, z + e);
    out = out || new THREE.Vector3();
    return out.set(nx, 2 * e, nz).normalize();
  },
  inBounds(x, z) { return Math.abs(x) < 760 && Math.abs(z) < 760; },
  densityAt(x, z) {
    const H = 800, C = this.CELL, n1 = this.N + 1;
    const i = G.U.clamp(Math.round((x + H) / C), 0, this.N), j = G.U.clamp(Math.round((z + H) / C), 0, this.N);
    return this.density[j * n1 + i] / 255;
  },
  surfaceAt(x, z) {
    const h = this.getHeight(x, z); const m = this.masks(x, z);
    if (h < 1.5) return 'sand';
    if (m.snow * G.U.smooth(40, 75, h) + G.U.smooth(130, 165, h) > 0.5) return 'snow';
    if (m.canyon > 0.5 || m.dV < 200 || m.castle > 0.6) return 'stone';
    return 'grass';
  },
  regionName(x, z) { return this.regionAt(x, z).name; },
  // 気温: -2 極寒, -1 寒い, 0 普通, 1 暑い, 2 灼熱
  temperature(x, z, y, night) {
    const m = this.masks(x, z);
    if (m.dV < 75 && y > 120) return 2;
    if (m.dV < 230) return 1;
    let t = 0;
    if (m.snow > 0.5 && y > 55) t = -1;
    if (y > 150) t = -2;
    if (night && m.snow > 0.3 && y > 40) t = Math.min(t, -1);
    return t;
  },
  // ---- 地図画像 ----
  makeMapImage(size = 512) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const ctx = cv.getContext('2d'); const img = ctx.createImageData(size, size);
    const H = 800, step = 1600 / size;
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
      const x = -H + (px + 0.5) * step, z = -H + (py + 0.5) * step;
      const n1 = this.N + 1, gi = G.U.clamp(Math.round((x + H) / this.CELL), 0, this.N), gj = G.U.clamp(Math.round((z + H) / this.CELL), 0, this.N);
      const g = gj * n1 + gi; const h = this.heights[g];
      let r = this.colors[g * 3], gg = this.colors[g * 3 + 1], b = this.colors[g * 3 + 2];
      const hx = this.getHeight(x + 3, z) - this.getHeight(x - 3, z), hz = this.getHeight(x, z + 3) - this.getHeight(x, z - 3);
      const shade = G.U.clamp(1 - (hx * 0.6 + hz * 0.6) * 0.06, 0.55, 1.35);
      r *= shade; gg *= shade; b *= shade;
      if (h < G.WATER_Y) { const d = G.U.clamp(-h / 14, 0, 1); r = 0.25 - d * 0.1; gg = 0.55 - d * 0.15; b = 0.78 - d * 0.1; }
      const dl = Math.hypot(x - G.World.lava.x, z - G.World.lava.z); if (dl < G.World.lava.r && h < G.World.lava.y) { r = 1; gg = 0.4; b = 0.1; }
      // 等高線
      if (Math.floor(h / 20) !== Math.floor(this.getHeight(x + step, z) / 20) && h > 2) { r *= 0.8; gg *= 0.8; b *= 0.8; }
      const o = (py * size + px) * 4;
      img.data[o] = G.U.clamp(r * 255, 0, 255); img.data[o + 1] = G.U.clamp(gg * 255, 0, 255); img.data[o + 2] = G.U.clamp(b * 255, 0, 255); img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // 道
    ctx.strokeStyle = 'rgba(120,90,50,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    for (const rd of G.World.roads) { ctx.beginPath(); rd.forEach((p, i) => { const px = (p[0] + H) / step, py = (p[1] + H) / step; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); }
    ctx.setLineDash([]);
    this.mapImage = cv;
    return cv;
  },
};
