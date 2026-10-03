// ===== 植生（木・茂み・岩・草・花） =====
'use strict';
G.Veg = {
  timeU: { value: 0 },
  chunkMeshes: [], appleTrees: [], treeList: [],
  windMat(color, vertexColors) {
    const m = new THREE.MeshToonMaterial({ color, gradientMap: G.Mat.grad3, vertexColors: !!vertexColors });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = G.Veg.timeU;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3][0] * 0.13 + instanceMatrix[3][2] * 0.17;
        #else
          float ph = 0.0;
        #endif
        float sw = sin(uTime * 1.6 + ph) * 0.05 + sin(uTime * 2.7 + ph * 1.7) * 0.025;
        transformed.x += sw * max(position.y - 2.0, 0.0);
        transformed.z += sw * 0.6 * max(position.y - 2.0, 0.0);`);
    };
    m.customProgramCacheKey = () => 'wind' + (vertexColors ? 'vc' : '');
    return m;
  },
  buildTypes() {
    const M = G.Geo.mtx;
    const T = {};
    const trunk = (h, r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, h, 6, 1); g.translate(0, h / 2, 0); return g; };
    // 広葉樹
    T.broad = {
      parts: [
        { geo: trunk(4.2, 0.5, 0.32), mat: G.Mat.toon(0xffffff), colors: [0x7a5232, 0x6b4a2e, 0x80583a] },
        { geo: G.Geo.merge([
          { geo: new THREE.IcosahedronGeometry(2.4, 0), matrix: M(0, 5.6, 0) },
          { geo: new THREE.IcosahedronGeometry(1.8, 0), matrix: M(1.3, 4.6, 0.6, 0.5, 0.3) },
          { geo: new THREE.IcosahedronGeometry(1.7, 0), matrix: M(-1.2, 4.8, -0.5, 0.2, 1.1) },
          { geo: new THREE.IcosahedronGeometry(1.5, 0), matrix: M(0.2, 7.1, 0.3, 0.9) },
        ], false), mat: this.windMat(0xffffff), colors: [0x5aa83c, 0x6cbf45, 0x4e9a36, 0x7ac74f, 0x62b040], wind: true },
      ], col: { r: 0.45, h: 8 },
    };
    // 針葉樹
    const pineGeo = (snow) => G.Geo.merge([
      { geo: new THREE.ConeGeometry(2.6, 3.4, 7), matrix: M(0, 3.2, 0), color: snow ? 0xdde8f0 : 0xffffff },
      { geo: new THREE.ConeGeometry(2.0, 3.0, 7), matrix: M(0, 5.2, 0, 0, 0.4), color: snow ? 0xeef4fa : 0xffffff },
      { geo: new THREE.ConeGeometry(1.3, 2.6, 7), matrix: M(0, 7.0, 0, 0, 0.9), color: 0xffffff },
    ], true);
    T.pine = {
      parts: [
        { geo: trunk(2.4, 0.35, 0.25), mat: G.Mat.toon(0xffffff), colors: [0x5d4030, 0x6b4a34] },
        { geo: pineGeo(false), mat: this.windMat(0xffffff, true), colors: [0x2f6b3a, 0x3a7a3f, 0x2a5f36, 0x357040], wind: true },
      ], col: { r: 0.35, h: 8 },
    };
    T.snowpine = {
      parts: [
        { geo: trunk(2.4, 0.35, 0.25), mat: G.Mat.toon(0xffffff), colors: [0x5d4030] },
        { geo: G.Geo.merge([
          { geo: new THREE.ConeGeometry(2.6, 3.4, 7), matrix: M(0, 3.2, 0), color: 0x3a6b48 },
          { geo: new THREE.ConeGeometry(2.3, 1.2, 7), matrix: M(0, 4.4, 0), color: 0xf4f8fc },
          { geo: new THREE.ConeGeometry(2.0, 3.0, 7), matrix: M(0, 5.2, 0, 0, 0.4), color: 0x3f7350 },
          { geo: new THREE.ConeGeometry(1.7, 1.0, 7), matrix: M(0, 6.3, 0, 0, 0.4), color: 0xf4f8fc },
          { geo: new THREE.ConeGeometry(1.3, 2.6, 7), matrix: M(0, 7.0, 0, 0, 0.9), color: 0xf4f8fc },
        ], true), mat: this.windMat(0xffffff, true), colors: [0xffffff, 0xeeeeee], wind: true },
      ], col: { r: 0.35, h: 8 },
    };
    // 枯れ木
    T.dead = {
      parts: [{ geo: G.Geo.merge([
        { geo: trunk(5, 0.4, 0.18) },
        { geo: trunk(2.2, 0.16, 0.06), matrix: M(0, 2.8, 0, 0, 0, 0.9) },
        { geo: trunk(1.8, 0.14, 0.05), matrix: M(0, 3.6, 0, 0.8, 0, -0.7) },
        { geo: trunk(1.5, 0.12, 0.05), matrix: M(0, 4.2, 0, -0.7, 0.5, 0.3) },
      ], false), mat: G.Mat.toon(0xffffff), colors: [0x5a4a40, 0x4a3c34, 0x6a5a4e] }], col: { r: 0.4, h: 5 },
    };
    // 平たい木（峡谷・平原）
    T.flat = {
      parts: [
        { geo: trunk(4.5, 0.45, 0.28), mat: G.Mat.toon(0xffffff), colors: [0x7a5a3a] },
        { geo: G.Geo.merge([{ geo: new THREE.CylinderGeometry(3.2, 2.6, 1.3, 8), matrix: M(0, 5.0, 0) }, { geo: new THREE.CylinderGeometry(2.0, 2.2, 0.8, 7), matrix: M(0.5, 5.9, 0.3) }], false), mat: this.windMat(0xffffff), colors: [0x8aa83a, 0x9cb848, 0xc9a23a], wind: true },
      ], col: { r: 0.45, h: 6 },
    };
    // 茂み
    T.bush = {
      parts: [{ geo: G.Geo.merge([
        { geo: new THREE.IcosahedronGeometry(0.9, 0), matrix: M(0, 0.6, 0) }, { geo: new THREE.IcosahedronGeometry(0.7, 0), matrix: M(0.7, 0.45, 0.2) }, { geo: new THREE.IcosahedronGeometry(0.65, 0), matrix: M(-0.6, 0.4, -0.3) },
      ], false), mat: this.windMat(0xffffff), colors: [0x4f9a38, 0x5fae42, 0x3f8a30, 0x6ab84a] }],
    };
    // 岩
    T.rock = { parts: [{ geo: G.Geo.rock(1, 5, 0), mat: G.Mat.toon(0xffffff), colors: [0x9a958c, 0x8a857c, 0xa8a297, 0x7d786f] }], rock: true };
    T.rock2 = { parts: [{ geo: G.Geo.rock(1, 9, 0), mat: G.Mat.toon(0xffffff), colors: [0x8f8a80, 0x9e988c] }], rock: true };
    this.types = T;
  },
  place() {
    const r = G.U.rng(777), Tr = G.Terrain;
    const excl = [];
    for (const v of G.World.villages) excl.push([v.x, v.z, v.flat + 8]);
    for (const v of G.World.shrines) excl.push([v.x, v.z, 13]);
    for (const v of G.World.towers) excl.push([v.x, v.z, 12]);
    for (const v of G.World.camps) excl.push([v.x, v.z, 17]);
    for (const v of G.World.bosses) excl.push([v.x, v.z, 32]);
    excl.push([G.World.sealSword.x, G.World.sealSword.z, 22], [0, 0, 105], [G.World.lava.x, G.World.lava.z, 70]);
    const nrm = new THREE.Vector3();
    const items = [];
    const sp = 5.2, q = G.settings.quality;
    const treeKeep = q === 0 ? 0.55 : 1;
    for (let gx = -780; gx < 780; gx += sp) for (let gz = -780; gz < 780; gz += sp) {
      const x = gx + r.range(-2.4, 2.4), z = gz + r.range(-2.4, 2.4);
      const roll = r(), roll2 = r(), sRoll = r();
      const h = Tr.getHeight(x, z);
      if (h < 1.0) continue;
      let bad = false; for (const e of excl) if ((x - e[0]) ** 2 + (z - e[1]) ** 2 < e[2] * e[2]) { bad = true; break; }
      if (bad) continue;
      Tr.getNormal(x, z, nrm);
      const m = Tr.masks(x, z);
      const grove = G.Noise.fbm(x / 140 + 20, z / 140 - 4, 3);
      const snowAmt = G.U.clamp(m.snow * G.U.smooth(40, 75, h) + G.U.smooth(130, 165, h), 0, 1);
      const volc = G.U.smooth(270, 160, m.dV);
      // 岩は急斜面OK
      let pRock = 0.006 + m.canyon * 0.03 + m.snow * 0.02 + volc * 0.03 + G.U.smooth(0.85, 0.6, nrm.y) * 0.05;
      if (roll < pRock) { items.push({ type: r() < 0.5 ? 'rock' : 'rock2', x, z, h, s: 0.6 + sRoll * sRoll * 3.2, ry: roll2 * 6.28 }); continue; }
      if (nrm.y < 0.8) continue;
      if (Tr.roadDist(x, z) < 6) continue;
      const meadow = Math.max(0, 1 - m.forest - m.plains - m.lake - m.canyon - m.castle - m.snow - volc);
      let pBroad = (0.02 + Math.max(0, grove) * 0.3) * meadow + m.forest * 0.42 + m.plains * 0.012 + m.lake * (0.04 + Math.max(0, grove) * 0.2) + m.castle * 0.01;
      let pPine = m.forest * 0.18 + (h < 165 ? m.snow * 0.22 : 0) + meadow * Math.max(0, grove) * 0.06;
      let pDead = volc * (m.dV > 120 ? 0.035 : 0) + m.canyon * 0.012;
      let pFlat = m.canyon * 0.02 + m.plains * 0.01;
      let pBush = 0.025 + m.forest * 0.06 - snowAmt * 0.02 - volc * 0.03;
      pBroad *= (1 - snowAmt) * (1 - volc); pBush = Math.max(0, pBush);
      const tot = pBroad + pPine + pDead + pFlat + pBush;
      const rr = r() * 1.0;
      if (rr > tot) continue;
      let type;
      if (rr < pBroad) type = 'broad'; else if (rr < pBroad + pPine) type = snowAmt > 0.35 ? 'snowpine' : 'pine';
      else if (rr < pBroad + pPine + pDead) type = 'dead'; else if (rr < pBroad + pPine + pDead + pFlat) type = 'flat'; else type = 'bush';
      if (type !== 'bush' && r() > treeKeep) continue;
      const s = type === 'bush' ? 0.7 + sRoll * 0.8 : 0.8 + sRoll * 0.7 + (m.forest > 0.5 ? 0.4 : 0);
      items.push({ type, x, z, h, s, ry: roll2 * 6.28, autumn: type === 'broad' && G.Noise.n2(x / 90, z / 90) > 0.55 });
    }
    return items;
  },
  build(scene) {
    this.buildTypes();
    const items = this.place();
    const CH = 8, size = 200;
    const buckets = new Map();
    for (const it of items) {
      const ci = G.U.clamp(Math.floor((it.x + 800) / size), 0, CH - 1), cj = G.U.clamp(Math.floor((it.z + 800) / size), 0, CH - 1);
      const k = ci * CH + cj; let b = buckets.get(k); if (!b) { b = { ci, cj, list: {} }; buckets.set(k, b); }
      (b.list[it.type] = b.list[it.type] || []).push(it);
      // 当たり判定
      const T = this.types[it.type];
      if (T.col) { G.Col.addCyl(it.x, it.z, T.col.r * it.s, it.h - 2, it.h + T.col.h * it.s, { tree: true, noFloor: true }); this.treeList.push(it); }
      if (T.rock && it.s > 1.0) G.Col.addCyl(it.x, it.z, it.s * 0.75, it.h - 2, it.h + it.s * 0.7, { rock: true });
      if (it.type === 'broad' && G.U.hash2(it.x * 10, it.z * 10) < 0.07) this.appleTrees.push(it);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    for (const b of buckets.values()) {
      const group = new THREE.Group();
      group.userData.cx = -800 + (b.ci + 0.5) * size; group.userData.cz = -800 + (b.cj + 0.5) * size;
      for (const type in b.list) {
        const list = b.list[type], T = this.types[type];
        let ay = 0; for (const it of list) ay += it.h; ay /= list.length;
        T.parts.forEach((part, pi) => {
          const cg = part.geo.clone();
          cg.boundingSphere = new THREE.Sphere(new THREE.Vector3(group.userData.cx, ay, group.userData.cz), 200);
          const im = new THREE.InstancedMesh(cg, part.mat, list.length);
          im.frustumCulled = true;
          list.forEach((it, i) => {
            q.setFromAxisAngle(up, it.ry);
            const yOff = T.rock ? -it.s * 0.25 : -0.15;
            m4.compose(v.set(it.x, it.h + yOff, it.z), q, sc.set(it.s, it.s * (T.rock ? 0.8 : 1), it.s));
            im.setMatrixAt(i, m4);
            const cs = part.colors; let c = cs[Math.floor(G.U.hash2(it.x * 7 + pi, it.z * 3) * cs.length)];
            if (it.autumn && part.wind) c = G.U.hash2(it.x, it.z) < 0.5 ? 0xe0a53a : 0xd2703a;
            col.setHex(c); im.setColorAt(i, col);
          });
          im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
          im.castShadow = G.settings.quality >= 2 || (G.settings.quality === 1 && !T.rock && type !== 'bush');
          im.receiveShadow = true;
          group.add(im);
        });
      }
      scene.add(group); this.chunkMeshes.push(group);
    }
    this.buildBigTree(scene);
  },
  // 森の大樹（封印の剣のそば）
  buildBigTree(scene) {
    const S = G.World.sealSword, x = S.x + 14, z = S.z - 10, h = G.Terrain.getHeight(x, z);
    const g = new THREE.Group();
    const trunkM = G.Mat.toon(0x6b4a2e);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 26, 10), trunkM); tr.position.y = 12; tr.castShadow = true; g.add(tr);
    for (let i = 0; i < 6; i++) { const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 8, 6), trunkM); const a = i / 6 * Math.PI * 2; rt.position.set(Math.cos(a) * 4.5, 1, Math.sin(a) * 4.5); rt.rotation.z = Math.cos(a) * 0.9; rt.rotation.x = -Math.sin(a) * 0.9; g.add(rt); }
    const fm = this.windMat(0x4f9a3a);
    const r = G.U.rng(5);
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r.range(6, 9), 0), fm); f.position.set(r.range(-9, 9), 26 + r.range(-3, 5), r.range(-9, 9)); f.castShadow = true; g.add(f); }
    g.position.set(x, h - 1, z); scene.add(g);
    G.Col.addCyl(x, z, 5, h - 2, h + 24, { tree: true, noFloor: true });
  },
  updateVisibility(px, pz, far) {
    const lim = Math.min(far * 0.85, 470); for (const g of this.chunkMeshes) { const d = Math.hypot(g.userData.cx - px, g.userData.cz - pz) - 145; g.visible = d < lim; }
  },
  // ---- 草と花（GPUで地形に沿わせる） ----
  initGrass(scene) {
    const q = G.settings.quality;
    const count = [9000, 22000, 42000][q], flowers = [700, 1600, 3000][q];
    const size = [46, 66, 84][q];
    const common = `
      uniform sampler2D uHeight, uColor; uniform vec2 uCenter; uniform float uSize, uTime; uniform vec3 uPlayer; uniform float uFlower;
      attribute vec2 aOffset; attribute vec3 aRand; attribute vec3 aCol;
      varying vec3 vCol; varying float vTip; varying vec3 vWorld;
      float decodeH(vec2 ij){ vec2 uv = (ij + 0.5) / 401.0; vec4 t = texture2D(uHeight, uv); return (t.r*65280.0 + t.g*255.0) / 65535.0 * 600.0 - 100.0; }
      float terrainH(vec2 p){ vec2 f = (p + 800.0) / 4.0; vec2 i = floor(f); vec2 t = f - i;
        float a = decodeH(i), b = decodeH(i + vec2(1.0,0.0)), c = decodeH(i + vec2(0.0,1.0)), d = decodeH(i + vec2(1.0,1.0));
        if (t.x + t.y <= 1.0) return a + (b - a) * t.x + (c - a) * t.y;
        return d + (c - d) * (1.0 - t.x) + (b - d) * (1.0 - t.y); }
      void main(){
        vec2 wp = aOffset + floor((uCenter - aOffset) / uSize + 0.5) * uSize;
        float dist = length(wp - uCenter);
        float fade = 1.0 - smoothstep(uSize * 0.3, uSize * 0.5, dist);
        vec2 ij = floor((wp + 800.0) / 4.0 + 0.5);
        vec4 ht = texture2D(uHeight, (ij + 0.5) / 401.0);
        float dens = ht.b;
        float patchN = sin(wp.x * 0.05 + 1.3) * sin(wp.y * 0.047 + 0.4) + sin(wp.x * 0.13 - wp.y * 0.11) * 0.5;
        float vis = step(aRand.z, dens);
        if (uFlower > 0.5) vis *= step(0.55, patchN) * step(0.45, dens);
        float s = aRand.x * fade * vis;
        float c = cos(aRand.y), sn = sin(aRand.y);
        vec3 p = position; p.xz = mat2(c, -sn, sn, c) * p.xz;
        float tip = clamp(position.y / 0.9, 0.0, 1.0);
        p *= s;
        float h = terrainH(wp);
        float wv = sin(uTime * 1.8 + wp.x * 0.21 + wp.y * 0.17) + 0.5 * sin(uTime * 3.1 + wp.x * 0.5);
        p.x += wv * 0.13 * tip * tip * s; p.z += wv * 0.08 * tip * tip * s;
        vec2 dp = wp - uPlayer.xz; float dl = length(dp);
        float push = (1.0 - smoothstep(0.3, 1.5, dl)) * (1.0 - step(2.0, abs(uPlayer.y - h)));
        p.xz += normalize(dp + vec2(0.0001)) * push * 0.55 * tip * s; p.y *= 1.0 - push * 0.55;
        vec3 world = vec3(wp.x + p.x, h + p.y - 0.05, wp.y + p.z);
        vCol = texture2D(uColor, (ij + 0.5) / 401.0).rgb;
        if (uFlower > 0.5) vCol = mix(vCol, aCol, step(0.75, tip));
        vTip = tip; vWorld = world;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }`;
    const frag = `
      uniform vec3 uFogColor; uniform float uFogNear, uFogFar, uLight; uniform float uFlower;
      varying vec3 vCol; varying float vTip; varying vec3 vWorld;
      void main(){
        vec3 col = vCol * mix(0.5, 1.12, vTip);
        if (uFlower > 0.5 && vTip > 0.75) col = vCol;
        col *= uLight;
        float fd = length(cameraPosition - vWorld);
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, fd));
        gl_FragColor = vec4(col, 1.0);
      }`;
    const mkU = (flower) => ({
      uHeight: { value: G.Terrain.heightTex }, uColor: { value: G.Terrain.colorTex }, uCenter: { value: new THREE.Vector2() }, uSize: { value: size },
      uTime: this.timeU, uPlayer: { value: new THREE.Vector3() }, uFlower: { value: flower }, uFogColor: { value: new THREE.Color() }, uFogNear: { value: 100 }, uFogFar: { value: 800 }, uLight: { value: 1 },
    });
    const mk = (blade, n, flower) => {
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', blade.attributes.position);
      geo.setIndex(blade.index);
      const off = new Float32Array(n * 2), rnd = new Float32Array(n * 3), col = new Float32Array(n * 3);
      const r = G.U.rng(flower ? 99 : 11);
      const fcols = [[1, 1, 1], [1, 0.9, 0.3], [1, 0.55, 0.75], [0.6, 0.7, 1], [0.85, 0.5, 1], [1, 0.45, 0.35]];
      for (let i = 0; i < n; i++) {
        off[i * 2] = r() * size; off[i * 2 + 1] = r() * size;
        rnd[i * 3] = flower ? 0.5 + r() * 0.35 : 0.38 + r() * 0.5; rnd[i * 3 + 1] = r() * 6.28; rnd[i * 3 + 2] = r() * 0.95;
        const fc = fcols[Math.floor(r() * fcols.length)]; col[i * 3] = fc[0]; col[i * 3 + 1] = fc[1]; col[i * 3 + 2] = fc[2];
      }
      geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 2));
      geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 3));
      geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(col, 3));
      geo.instanceCount = n;
      const u = mkU(flower ? 1 : 0);
      const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: common, fragmentShader: frag, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
      scene.add(mesh);
      return { mesh, u };
    };
    // 草の葉（1株に5枚）
    const pos = [], idx = []; const r = G.U.rng(3);
    for (let b = 0; b < 5; b++) {
      const a = r() * Math.PI * 2, d = r() * 0.25, cx = Math.cos(a) * d, cz = Math.sin(a) * d, ra = r() * Math.PI, w = 0.07 + r() * 0.05, h = 0.55 + r() * 0.45;
      const dx = Math.cos(ra) * w, dz = Math.sin(ra) * w, lean = (r() - 0.5) * 0.3;
      const base = pos.length / 3;
      pos.push(cx - dx, 0, cz - dz, cx + dx, 0, cz + dz, cx + lean, h, cz + lean * 0.5);
      idx.push(base, base + 1, base + 2);
    }
    const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); blade.setIndex(idx);
    // 花（茎＋花びら）
    const fp = [-0.02, 0, 0, 0.02, 0, 0, 0, 0.6, 0, -0.14, 0.62, -0.14, 0.14, 0.62, -0.14, 0.14, 0.62, 0.14, -0.14, 0.62, 0.14, 0, 0.7, 0];
    const flowerGeo = new THREE.BufferGeometry(); flowerGeo.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); flowerGeo.setIndex([0, 1, 2, 3, 4, 7, 4, 5, 7, 5, 6, 7, 6, 3, 7]);
    this.grass = mk(blade, count, false);
    this.flowers = mk(flowerGeo, flowers, true);
  },
  update(dt, center) {
    this.timeU.value += dt;
    if (!this.grass) return;
    const f = G.scene.fog, light = G.U.clamp(G.Sky.hemi.intensity * 1.25 + G.Sky.sun.intensity * 0.35, 0.22, 1.25);
    for (const g of [this.grass, this.flowers]) {
      g.u.uCenter.value.set(center.x, center.z); g.u.uPlayer.value.copy(center);
      g.u.uFogColor.value.copy(f.color); g.u.uFogNear.value = f.near; g.u.uFogFar.value = f.far; g.u.uLight.value = light;
      g.mesh.visible = !G.Sky.indoor && G.Terrain.inBounds(center.x, center.z);
    }
  },
};
