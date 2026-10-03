// ===== 建造物（村・塔・祠・古城・キャンプ・橋・遺跡）と「調べる」対象 =====
'use strict';
G.Interact = {
  list: [],
  add(o) { o.active = o.active !== false; this.list.push(o); return o; },
  remove(o) { const i = this.list.indexOf(o); if (i >= 0) this.list.splice(i, 1); },
  find(px, py, pz, fx, fz) {
    let best = null, bs = 1e9;
    for (const o of this.list) {
      if (!o.active) continue;
      const dx = o.x - px, dz = o.z - pz, d = Math.hypot(dx, dz);
      if (d > (o.r || 2.2)) continue;
      if (Math.abs((o.y != null ? o.y : py) - py) > (o.dy || 3)) continue;
      if (o.cond && !o.cond()) continue;
      const facing = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
      const score = d - facing * 0.8 - (o.priority || 0);
      if (score < bs) { bs = score; best = o; }
    }
    return best;
  },
};

G.Geo.prism = function (w, h, d) {
  const hw = w / 2, hd = d / 2;
  const v = [
    -hw, 0, -hd, hw, 0, -hd, 0, h, -hd, // 前
    hw, 0, hd, -hw, 0, hd, 0, h, hd, // 後
    -hw, 0, -hd, 0, h, -hd, 0, h, hd, -hw, 0, -hd, 0, h, hd, -hw, 0, hd, // 左斜面
    hw, 0, -hd, hw, 0, hd, 0, h, hd, hw, 0, -hd, 0, h, hd, 0, h, -hd, // 右斜面
  ];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  return g;
};

G.Struct = {
  anim: [], villageSpots: {}, towerObjs: {}, shrineObjs: {}, campObjs: [], lamps: [],
  add(scene, obj) { scene.add(obj); return obj; },
  mesh(geo, color, x, y, z, opts = {}) {
    const m = new THREE.Mesh(geo, opts.mat || G.Mat.toon(color));
    m.position.set(x, y, z); if (opts.ry) m.rotation.y = opts.ry; if (opts.rx) m.rotation.x = opts.rx; if (opts.rz) m.rotation.z = opts.rz;
    m.castShadow = opts.shadow !== false; m.receiveShadow = true;
    return m;
  },
  box(group, w, h, d, color, x, y, z, opts) { const m = this.mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, opts); group.add(m); return m; },
  cyl(group, rt, rb, h, color, x, y, z, seg = 10, opts) { const m = this.mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, opts); group.add(m); return m; },
  build(scene) {
    this.scene = scene;
    for (const v of G.World.villages) this.buildVillage(v);
    for (const t of G.World.towers) this.buildTower(t);
    for (const s of G.World.shrines) this.buildShrine(s);
    G.World.camps.forEach((c, i) => this.buildCamp(c, i));
    this.buildCastle();
    this.buildRuins();
    this.buildBridges();
    this.buildSwordPedestal();
    this.buildUpdrafts();
  },
  groundY(x, z) { return G.Terrain.getHeight(x, z); },
  // ---- 家 ----
  house(v, x, z, ry, style, r) {
    const g = new THREE.Group(); const y = this.groundY(x, z);
    const W = r.range(5.5, 7.5), D = r.range(5, 6.5), H = r.range(3.4, 4.2);
    let wall = 0xf1e3c6, roof = r.pick([0xc4553a, 0x3f6fb5, 0xb5743a, 0x5a8a4a]), beam = 0x6b4a2e;
    if (style === 'snow') { wall = 0x8a6a4a; roof = 0xeef3f8; beam = 0x4a3020; }
    if (style === 'lake') { wall = 0xeaf6f7; roof = r.pick([0x2f8fb0, 0x3fb5a0]); beam = 0x6fa8b8; }
    if (style === 'fire') {
      this.cyl(g, W * 0.5, W * 0.55, H, 0x8a7060, 0, H / 2, 0, 9);
      this.mesh; const c = this.mesh(new THREE.ConeGeometry(W * 0.62, H * 0.9, 9), 0x5a4038, 0, H + H * 0.45, 0); g.add(c);
      this.box(g, 1.4, 2.2, 0.3, 0x2a1a14, 0, 1.1, W * 0.53);
      g.position.set(x, y, z); g.rotation.y = ry; this.scene.add(g);
      G.Col.addCyl(x, z, W * 0.55, y - 1, y + H, {});
      return g;
    }
    this.box(g, W, H, D, wall, 0, H / 2, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(g, 0.35, H, 0.35, beam, sx * W / 2, H / 2, sz * D / 2);
    this.box(g, W + 0.3, 0.3, D + 0.3, beam, 0, H, 0);
    const rf = this.mesh(G.Geo.prism(D + 1.2, 2.6, W + 1.2), roof, 0, H + 0.15, 0, { ry: Math.PI / 2 }); g.add(rf);
    this.box(g, 1.3, 2.3, 0.2, 0x4a3020, 0, 1.15, D / 2 + 0.05);
    const winM = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (const sx of [-1, 1]) { const w = this.mesh(new THREE.BoxGeometry(0.9, 0.8, 0.15), 0, sx * W * 0.3, H * 0.6, D / 2 + 0.05, { mat: winM, shadow: false }); g.add(w); this.lamps.push(w); }
    this.box(g, 0.8, 2, 0.8, 0x8a7a6a, W * 0.3, H + 1.4, -D * 0.2);
    g.position.set(x, y - 0.05, z); g.rotation.y = ry; this.scene.add(g);
    const sw = (Math.abs(Math.sin(ry)) > 0.5) ? D : W, sd = (Math.abs(Math.sin(ry)) > 0.5) ? W : D;
    G.Col.box(x, y - 1, z, sw + 0.4, H + 1, sd + 0.4, {});
    return g;
  },
  buildVillage(v) {
    const r = G.U.rng(v.x * 31 + v.z * 17 + 5);
    const style = v.snow ? 'snow' : v.rocky ? 'fire' : v.id === 'lake' ? 'lake' : 'normal';
    const spots = { center: { x: v.x, z: v.z } };
    const n = v.houses;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4, rad = v.flat * 0.62;
      const x = v.x + Math.cos(a) * rad, z = v.z + Math.sin(a) * rad;
      // 中心を向く（90度単位）
      const face = Math.atan2(v.x - x, v.z - z); const ry = Math.round(face / (Math.PI / 2)) * (Math.PI / 2);
      this.house(v, x, z, ry, style, r);
      if (i === 0) spots.inn = { x: x + Math.sin(ry) * 5, z: z + Math.cos(ry) * 5 };
    }
    const y = this.groundY(v.x, v.z);
    // 店（屋台）
    if (v.shop) {
      const sx = v.x + 6, sz = v.z - 4; const g = new THREE.Group(); const gy = this.groundY(sx, sz);
      this.box(g, 3.2, 1.1, 1.2, 0x8a5a32, 0, 0.55, 0);
      for (const px of [-1.5, 1.5]) this.box(g, 0.15, 2.8, 0.15, 0x6b4a2e, px, 1.4, -0.7);
      const aw = this.mesh(new THREE.BoxGeometry(3.6, 0.15, 2), v.snow ? 0x3f6fb5 : 0xd8463a, 0, 2.8, -0.2, { rx: 0.25 }); g.add(aw);
      for (let k = 0; k < 4; k++) this.box(g, 0.4, 0.4, 0.4, [0xff5252, 0xffd54f, 0x8bc34a, 0xff9800][k], -1.1 + k * 0.7, 1.3, 0.1);
      g.position.set(sx, gy, sz); this.scene.add(g);
      G.Col.box(sx, gy - 1, sz, 3.2, 2.1, 1.2, {});
      spots.shop = { x: sx, z: sz - 1.3 };
    }
    // 料理鍋
    if (v.pot) {
      const px = v.x - 6, pz = v.z + 5; spots.pot = this.cookingPot(px, pz);
    }
    // 女神像
    if (v.statue) { const sx = v.x, sz = v.z - 12; spots.statue = this.goddess(sx, sz); }
    // 井戸・街灯
    if (style !== 'fire') {
      const wx = v.x + 3, wz = v.z + 9, wy = this.groundY(wx, wz); const g = new THREE.Group();
      this.cyl(g, 1.1, 1.2, 1, 0x9a948a, 0, 0.5, 0, 10);
      this.cyl(g, 0.9, 0.9, 1.05, 0x2a4a6a, 0, 0.55, 0, 10);
      for (const s of [-1, 1]) this.box(g, 0.15, 2.2, 0.15, 0x6b4a2e, s * 0.9, 1.6, 0);
      this.mesh; g.add(this.mesh(G.Geo.prism(2.4, 0.8, 1.6), 0xb5543a, 0, 2.6, 0));
      g.position.set(wx, wy, wz); this.scene.add(g); G.Col.addCyl(wx, wz, 1.2, wy - 1, wy + 1, {});
    }
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + 0.8, lx = v.x + Math.cos(a) * v.flat * 0.9, lz = v.z + Math.sin(a) * v.flat * 0.9;
      this.lampPost(lx, lz);
    }
    // 風車（ハジマリ村）
    if (v.id === 'hajimari') {
      const wx = v.x - 18, wz = v.z - 16, wy = this.groundY(wx, wz); const g = new THREE.Group();
      this.cyl(g, 1.6, 2.6, 11, 0xe8dcc0, 0, 5.5, 0, 8);
      g.add(this.mesh(new THREE.ConeGeometry(2.2, 2.5, 8), 0xb5543a, 0, 12.2, 0));
      const hub = new THREE.Group(); hub.position.set(0, 9.5, 2.4);
      for (let k = 0; k < 4; k++) { const b = this.mesh(new THREE.BoxGeometry(0.7, 7, 0.1), 0xf4ead8, 0, 3.6, 0); const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2; arm.add(b); hub.add(arm); }
      g.add(hub); g.position.set(wx, wy, wz); this.scene.add(g);
      G.Col.addCyl(wx, wz, 2.6, wy - 1, wy + 11, {});
      this.anim.push((dt) => { hub.rotation.z += dt * 0.6; });
    }
    // 馬宿
    if (v.stable) {
      const g = new THREE.Group(); const tx = v.x - 4, tz = v.z - 12, ty = this.groundY(tx, tz);
      g.add(this.mesh(new THREE.ConeGeometry(9, 8, 10), 0xd9c39a, 0, 4, 0));
      this.box(g, 3, 3, 0.3, 0x3a2a1a, 0, 1.5, 7.4);
      const head = this.mesh(new THREE.BoxGeometry(2, 2.6, 3.4), 0xa86e46, 0, 8, 2.5, { rx: -0.4 }); g.add(head);
      g.position.set(tx, ty, tz); this.scene.add(g); G.Col.addCyl(tx, tz, 7.5, ty - 1, ty + 6, {});
      // 柵
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 1.4 + 0.3, fx = v.x + 10 + Math.cos(a) * 9, fz = v.z + 6 + Math.sin(a) * 9; const fy = this.groundY(fx, fz); const p = this.mesh(new THREE.BoxGeometry(0.2, 1.3, 0.2), 0x7a5a3a, fx, fy + 0.65, fz); this.scene.add(p); }
      spots.stable = { x: v.x - 4, z: v.z - 3 };
    }
    // 研究所
    if (v.lab) {
      const g = new THREE.Group(); const ly = this.groundY(v.x, v.z - 6);
      this.box(g, 9, 5, 7, 0xd8d0c0, 0, 2.5, 0);
      const dome = this.mesh(new THREE.SphereGeometry(3.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x3a8a9a, 0, 5, 0); g.add(dome);
      const tube = this.mesh(new THREE.CylinderGeometry(0.5, 0.7, 4, 8), 0x5a5550, 1.5, 7, 0, { rz: -0.6 }); g.add(tube);
      this.box(g, 1.4, 2.3, 0.2, 0x3a2a1a, 0, 1.15, 3.55);
      g.position.set(v.x, ly, v.z - 6); this.scene.add(g); G.Col.box(v.x, ly - 1, v.z - 6, 9.4, 6, 7.4, {});
      // 古代炉（青い炎）
      const fx = v.x + 6, fz = v.z + 2, fy = this.groundY(fx, fz); const f = new THREE.Group();
      this.cyl(f, 1.2, 1.5, 1.6, 0x5a5550, 0, 0.8, 0, 8);
      const fl = this.mesh(new THREE.ConeGeometry(0.8, 2, 8), 0, 0, 2.4, 0, { mat: G.Mat.glow(0x40e0ff, 0.85), shadow: false }); f.add(fl);
      f.position.set(fx, fy, fz); this.scene.add(f); G.Col.addCyl(fx, fz, 1.5, fy - 1, fy + 1.6, {});
      this.anim.push((dt, t) => { fl.scale.set(1 + Math.sin(t * 9) * 0.1, 1 + Math.sin(t * 7) * 0.2, 1 + Math.cos(t * 8) * 0.1); });
      spots.lab = { x: v.x, z: v.z - 1.5 };
    }
    spots.elder = { x: v.x - 3, z: v.z + 2 };
    this.villageSpots[v.id] = spots;
  },
  lampPost(x, z) {
    const y = this.groundY(x, z); const g = new THREE.Group();
    this.box(g, 0.2, 3, 0.2, 0x5a4030, 0, 1.5, 0);
    this.box(g, 0.9, 0.12, 0.12, 0x5a4030, 0.35, 2.9, 0);
    const lm = new THREE.MeshBasicMaterial({ color: 0x665533 });
    const l = this.mesh(new THREE.BoxGeometry(0.45, 0.55, 0.45), 0, 0.75, 2.55, 0, { mat: lm, shadow: false }); g.add(l);
    g.position.set(x, y, z); this.scene.add(g);
    this.lamps.push(l);
    G.Col.addCyl(x, z, 0.25, y - 1, y + 3, {});
  },
  cookingPot(x, z) {
    const y = this.groundY(x, z); const g = new THREE.Group();
    for (let k = 0; k < 3; k++) { const lg = this.mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 5), 0x6b4a2e, 0, 0.2, 0, { rz: Math.PI / 2, ry: k * 1.05 }); g.add(lg); }
    const pot = this.mesh(new THREE.SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), 0x2a2a2e, 0, 1.2, 0); g.add(pot);
    const soup = this.mesh(new THREE.CircleGeometry(0.7, 12), 0, 0, 1.55, 0, { rx: -Math.PI / 2, mat: new THREE.MeshToonMaterial({ color: 0xd8a040, gradientMap: G.Mat.grad3 }) }); g.add(soup);
    const fl = this.mesh(new THREE.ConeGeometry(0.45, 0.9, 6), 0, 0, 0.5, 0, { mat: G.Mat.glow(0xff8a30, 0.9), shadow: false }); g.add(fl);
    g.position.set(x, y, z); this.scene.add(g);
    G.Col.addCyl(x, z, 0.9, y - 1, y + 1.4, {});
    this.anim.push((dt, t) => { fl.scale.set(1, 0.8 + Math.sin(t * 12 + x) * 0.25, 1); });
    G.Interact.add({ x, y: y + 0.5, z, r: 2.6, label: '料理する', action: () => G.UI && G.UI.openCooking() });
    return { x, z };
  },
  goddess(x, z) {
    const y = this.groundY(x, z); const g = new THREE.Group(); const st = 0xe8e4da;
    this.cyl(g, 2, 2.3, 1, 0xb0aa9c, 0, 0.5, 0, 10);
    g.add(this.mesh(new THREE.ConeGeometry(1.3, 4, 10), st, 0, 3, 0));
    g.add(this.mesh(new THREE.SphereGeometry(0.6, 10, 8), st, 0, 5.4, 0));
    for (const s of [-1, 1]) { const w = this.mesh(new THREE.BoxGeometry(2.4, 2.8, 0.15), st, s * 1.3, 4.2, -0.3, { rz: s * 0.35 }); g.add(w); }
    const orb = this.mesh(new THREE.SphereGeometry(0.35, 10, 8), 0, 0, 4.2, 0.8, { mat: G.Mat.glow(0xfff0a0), shadow: false }); g.add(orb);
    g.position.set(x, y, z); this.scene.add(g);
    G.Col.addCyl(x, z, 2.2, y - 1, y + 1, {}); G.Col.addCyl(x, z, 1.3, y, y + 6, {});
    this.anim.push((dt, t) => { orb.position.y = 4.2 + Math.sin(t * 2) * 0.15; });
    G.Interact.add({ x, y: y + 1, z, r: 3.6, label: '女神像に祈る', action: () => G.UI && G.UI.openStatue() });
    return { x, z };
  },
  // ---- 観測塔 ----
  buildTower(t) {
    const y = this.groundY(t.x, t.z), H = 46; const g = new THREE.Group();
    const stone = 0x5f5a54, dark = 0x3e3a36;
    this.cyl(g, 6, 7, 1.2, dark, 0, 0.6, 0, 8);
    this.box(g, 4.4, H, 4.4, stone, 0, H / 2, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = this.mesh(new THREE.BoxGeometry(0.7, H + 2, 0.7), dark, sx * 3.6, (H + 2) / 2, sz * 3.6); g.add(leg);
    }
    for (let k = 1; k < 8; k++) this.box(g, 7.6, 0.4, 7.6, dark, 0, k * H / 8, 0);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff8a30 });
    const lines = [];
    for (let k = 0; k < 6; k++) { const ln = this.mesh(new THREE.BoxGeometry(4.5, 0.25, 4.5), 0, 0, 3 + k * 7.3, 0, { mat: glowMat, shadow: false }); g.add(ln); lines.push(ln); }
    this.box(g, 11, 1, 11, dark, 0, H + 0.5, 0);
    const term = this.mesh(new THREE.CylinderGeometry(0.5, 0.8, 1.4, 8), stone, 0, H + 1.7, 0); g.add(term);
    const orb = this.mesh(new THREE.SphereGeometry(0.4, 10, 8), 0, 0, H + 2.7, 0, { mat: glowMat, shadow: false }); g.add(orb);
    g.position.set(t.x, y, t.z); this.scene.add(g);
    G.Col.box(t.x, y - 2, t.z, 4.6, H + 2, 4.6, { climb: true, tower: t.id });
    G.Col.box(t.x, y + H, t.z, 11, 1, 11, { climb: true });
    G.Col.addCyl(t.x, t.z, 6.5, y - 2, y + 1.2, {});
    G.Col.addCyl(t.x, t.z, 0.8, y + H + 1, y + H + 2.4, {});
    this.towerObjs[t.id] = { g, glowMat, top: y + H + 1, x: t.x, z: t.z };
    G.Interact.add({ x: t.x, y: y + H + 1, z: t.z, r: 3, label: '観測塔を起動する', priority: 1, cond: () => !G.Prog.data.towers[t.id], action: () => G.Quests.activateTower(t) });
    this.anim.push((dt, tm) => { orb.position.y = H + 2.7 + Math.sin(tm * 2) * 0.1; });
  },
  setTowerActive(id, on) { const o = this.towerObjs[id]; if (o) o.glowMat.color.setHex(on ? 0x40e0ff : 0xff8a30); },
  // ---- 祠 ----
  buildShrine(s) {
    const y = this.groundY(s.x, s.z); const g = new THREE.Group();
    const stone = 0x5a5650;
    this.cyl(g, 5, 5.5, 0.6, 0x4a4640, 0, 0.3, 0, 12);
    for (const sx of [-1, 1]) this.box(g, 0.9, 5, 0.9, stone, sx * 2.2, 2.8, 0);
    this.box(g, 5.6, 0.9, 1.2, stone, 0, 5.6, 0);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.85 });
    const panel = this.mesh(new THREE.PlaneGeometry(3.4, 4.4), 0, 0, 2.6, 0, { mat: glowMat, shadow: false }); glowMat.side = THREE.DoubleSide; g.add(panel);
    const sym = this.mesh(new THREE.TorusGeometry(0.8, 0.12, 6, 16), 0, 0, 2.8, 0.05, { mat: new THREE.MeshBasicMaterial({ color: 0xffffff }), shadow: false }); g.add(sym);
    const ped = this.mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.1, 8), stone, 0, 1.15, 2.6); g.add(ped);
    const pedTop = this.mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 8), 0, 0, 1.75, 2.6, { mat: glowMat, shadow: false }); g.add(pedTop);
    g.position.set(s.x, y, s.z);
    g.rotation.y = Math.atan2(-s.x, -s.z) + Math.PI; // 外側を向く
    this.scene.add(g);
    G.Col.addCyl(s.x, s.z, 5.2, y - 2, y + 0.6, {});
    const ca = g.rotation.y;
    for (const sx of [-1, 1]) { const px = s.x + Math.cos(ca) * sx * 2.2, pz = s.z - Math.sin(ca) * sx * 2.2; G.Col.addCyl(px, pz, 0.6, y, y + 6, {}); }
    const px = s.x + Math.sin(ca) * 2.6, pz = s.z + Math.cos(ca) * 2.6;
    G.Col.addCyl(px, pz, 0.55, y, y + 1.7, {});
    this.shrineObjs[s.id] = { g, glowMat, x: s.x, y: y + 0.6, z: s.z, ex: s.x + Math.sin(ca) * 4.2, ez: s.z + Math.cos(ca) * 4.2 };
    G.Interact.add({ x: px, y: y + 0.6, z: pz, r: 2.8, label: () => (G.Prog.data.shrines[s.id] ? '祠に入る（クリア済み）' : '祠に入る'), action: () => G.Shrine.enter(s) });
    this.anim.push((dt, t) => { sym.rotation.z += dt * 0.5; glowMat.opacity = 0.7 + Math.sin(t * 2 + s.x) * 0.15; });
  },
  setShrineCleared(id) { const o = this.shrineObjs[id]; if (o) o.glowMat.color.setHex(0x40c8ff); },
  // ---- 敵キャンプ ----
  buildCamp(c, idx) {
    const y = this.groundY(c.x, c.z); const g = new THREE.Group();
    for (let k = 0; k < 4; k++) { const lg = this.mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.5, 5), 0x5a3a24, 0, 0.15, 0, { rz: Math.PI / 2, ry: k * 0.8 }); g.add(lg); }
    const fl = this.mesh(new THREE.ConeGeometry(0.6, 1.4, 6), 0, 0, 0.8, 0, { mat: G.Mat.glow(0xff7a20, 0.9), shadow: false }); g.add(fl);
    const r = G.U.rng(idx * 13 + 7);
    for (let k = 0; k < 2; k++) {
      const a = r.range(0, 6.28), tx = Math.cos(a) * 6, tz = Math.sin(a) * 6;
      const tent = this.mesh(new THREE.ConeGeometry(2.4, 3.2, 6), r.pick([0x8a6a4a, 0x7a5a6a, 0x6a6a4a]), tx, 1.6, tz); g.add(tent);
      const sk = this.mesh(new THREE.SphereGeometry(0.4, 6, 5), 0xeeeeee, tx, 3.3, tz); g.add(sk);
      G.Col.addCyl(c.x + tx, c.z + tz, 2.0, y - 1, y + 3, {});
    }
    const camp = { x: c.x, z: c.z, y, idx, lookout: null };
    if (c.archer) {
      const lx = 5, lz = -5, H = 5.5;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(g, 0.3, H, 0.3, 0x6b4a2e, lx + sx * 1.3, H / 2, lz + sz * 1.3);
      this.box(g, 3.2, 0.3, 3.2, 0x7a5a3a, lx, H, lz);
      G.Col.box(c.x + lx, y + H - 0.3, c.z + lz, 3.2, 0.3, 3.2, { noWall: true });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.Col.addCyl(c.x + lx + sx * 1.3, c.z + lz + sz * 1.3, 0.2, y - 1, y + H - 0.3, {});
      camp.lookout = { x: c.x + lx, z: c.z + lz, y: y + H };
    }
    g.position.set(c.x, y, c.z); this.scene.add(g);
    this.anim.push((dt, t) => { fl.scale.set(1, 0.85 + Math.sin(t * 11 + idx) * 0.2, 1); });
    this.campObjs.push(camp);
  },
  // ---- 古城 ----
  buildCastle() {
    const cy = 40, g = new THREE.Group(); const stone = 0x7c7a72, dark = 0x5a5852;
    // 闘技場
    const floor = this.mesh(new THREE.CylinderGeometry(46, 47, 1.2, 40), 0x8e8a80, 0, cy - 0.5, 0); g.add(floor);
    const ring = this.mesh(new THREE.TorusGeometry(30, 0.4, 4, 40), 0x6a665e, 0, cy + 0.12, 0, { rx: Math.PI / 2 }); g.add(ring);
    G.Col.addCyl(0, 0, 46.5, cy - 4, cy + 0.1, {});
    // 柱
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2, x = Math.cos(a) * 50, z = Math.sin(a) * 50, h = 6 + (k * 7 % 5) * 2.2;
      const ph = this.groundY(x, z);
      this.cyl(g, 1.3, 1.5, h, stone, x, ph + h / 2, z, 8);
      G.Col.addCyl(x, z, 1.5, ph - 1, ph + h, {});
    }
    // 外壁（門のすき間あり）
    for (let k = 0; k < 28; k++) {
      const a = k / 28 * Math.PI * 2; if (k % 7 === 0 || k % 7 === 1) continue;
      const x = Math.cos(a) * 80, z = Math.sin(a) * 80, gy = this.groundY(x, z);
      const h = 9 + (k * 13 % 7);
      const wm = this.mesh(new THREE.BoxGeometry(17, h, 3.4), k % 3 ? stone : dark, x, gy + h / 2 - 1, z, { ry: -a + Math.PI / 2 }); g.add(wm);
      const bx = Math.abs(Math.cos(a)) > 0.7 ? 3.4 : 12, bz = Math.abs(Math.cos(a)) > 0.7 ? 12 : 3.4;
      G.Col.box(x, gy - 2, z, Math.abs(Math.cos(a)) > 0.35 && Math.abs(Math.sin(a)) > 0.35 ? 9 : bx, h + 1, Math.abs(Math.cos(a)) > 0.35 && Math.abs(Math.sin(a)) > 0.35 ? 9 : bz, { climb: true });
    }
    // 崩れた塔
    for (const [tx, tz, h] of [[-62, -40, 34], [58, -48, 28], [0, -70, 44], [-40, 60, 22], [60, 52, 26]]) {
      const ty = this.groundY(tx, tz);
      this.cyl(g, 5, 6, h, dark, tx, ty + h / 2 - 1, tz, 10);
      g.add(this.mesh(new THREE.ConeGeometry(6.5, 8, 10), 0x6a3a4a, tx, ty + h + 3, tz));
      G.Col.addCyl(tx, tz, 6, ty - 2, ty + h, { climb: true });
    }
    // 瘴気
    const malice = new THREE.MeshBasicMaterial({ color: 0x8a1a4a, transparent: true, opacity: 0.75 });
    const r = G.U.rng(66);
    const blobs = [];
    for (let k = 0; k < 26; k++) {
      const a = r.range(0, 6.28), d = r.range(52, 140), x = Math.cos(a) * d, z = Math.sin(a) * d, gy = this.groundY(x, z);
      const b = this.mesh(new THREE.SphereGeometry(r.range(1.5, 3.5), 8, 6), 0, x, gy, z, { mat: malice, shadow: false }); b.scale.y = 0.4; g.add(b); blobs.push(b);
      const eye = this.mesh(new THREE.SphereGeometry(0.4, 6, 5), 0, x, gy + 0.8, z, { mat: G.Mat.glow(0xffcc33), shadow: false }); g.add(eye);
    }
    this.scene.add(g);
    this.anim.push((dt, t) => { blobs.forEach((b, i) => { b.scale.x = b.scale.z = 1 + Math.sin(t * 1.5 + i) * 0.12; }); });
    // ボス戦の障壁
    const bm = new THREE.MeshBasicMaterial({ color: 0xff2266, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    this.barrier = this.mesh(new THREE.CylinderGeometry(47, 47, 30, 40, 1, true), 0, 0, cy + 14, 0, { mat: bm, shadow: false });
    this.barrier.visible = false; this.scene.add(this.barrier);
    this.barrierCols = [];
  },
  setBarrier(on) {
    this.barrier.visible = on;
    if (on && !this.barrierCols.length) {
      for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; this.barrierCols.push(G.Col.addCyl(Math.cos(a) * 49, Math.sin(a) * 49, 3.9, 30, 80, { noFloor: true })); }
    } else if (!on) { for (const c of this.barrierCols) G.Col.remove(c); this.barrierCols = []; }
  },
  // ---- 遺跡 ----
  buildRuins() {
    const r = G.U.rng(808); const stone = 0x8a867c;
    for (let k = 0; k < 46; k++) {
      const a = r.range(0, 6.28), d = r.range(110, 330), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - 0, z - 470) < 80) continue;
      const y = this.groundY(x, z); if (y < 1) continue;
      const kind = r.int(0, 2); const g = new THREE.Group();
      if (kind === 0) { const h = r.range(3, 8); this.cyl(g, 0.9, 1.1, h, stone, 0, h / 2, 0, 8); g.rotation.z = r.range(-0.15, 0.15); G.Col.addCyl(x, z, 1.1, y - 1, y + h, {}); }
      else if (kind === 1) { const w = r.range(5, 10), h = r.range(2.5, 5); this.box(g, w, h, 1.4, stone, 0, h / 2, 0); G.Col.box(x, y - 1, z, w, h + 1, w * 0.3 + 1.4, {}); }
      else { const h = 5; for (const s of [-1, 1]) this.box(g, 1.2, h, 1.2, stone, s * 2.5, h / 2, 0); this.box(g, 6.4, 1.1, 1.4, stone, 0, h + 0.5, 0); for (const s of [-1, 1]) G.Col.addCyl(x + s * 2.5, z, 0.8, y - 1, y + h, {}); }
      g.position.set(x, y - 0.3, z); this.scene.add(g);
    }
  },
  // ---- 橋 ----
  buildBridges() {
    const river = G.World.river;
    for (const road of G.World.roads) for (let i = 0; i < road.length - 1; i++) {
      const [ax, az] = road[i], [bx, bz] = road[i + 1];
      const len = Math.hypot(bx - ax, bz - az), steps = Math.ceil(len / 2);
      let inside = false, start = null;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const wet = G.U.distPolyline(x, z, river) < 24 && G.Terrain.getHeight(x, z) < 6;
        if (wet && !inside) { inside = true; start = Math.max(0, t - 6 / len); }
        if (inside && (!wet || s === steps)) { inside = false; this.bridge(ax, az, bx, bz, start, Math.min(1, t + 6 / len)); }
      }
    }
  },
  bridge(ax, az, bx, bz, t0, t1) {
    const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
    const y = Math.max(G.Terrain.getHeight(x0, z0), G.Terrain.getHeight(x1, z1), 3) + 0.4;
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    const g = new THREE.Group();
    this.box(g, 5, 0.5, len, 0x8a6a42, 0, 0, 0);
    for (const s of [-1, 1]) { this.box(g, 0.25, 1, len, 0x6b4a2e, s * 2.4, 0.75, 0); for (let k = 0; k <= len; k += 4) this.box(g, 0.35, 1.3, 0.35, 0x5a3a24, s * 2.4, 0.4, -len / 2 + k); }
    g.position.set((x0 + x1) / 2, y - 0.25, (z0 + z1) / 2); g.rotation.y = ang; this.scene.add(g);
    const n = Math.ceil(len / 1.5);
    for (let k = 0; k <= n; k++) { const t = k / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; G.Col.box(x, y - 1.5, z, 3.4, 1.5, 3.4, { noWall: true, noCam: true }); }
  },
  // ---- 封印の剣 ----
  buildSwordPedestal() {
    const S = G.World.sealSword, y = this.groundY(S.x, S.z); const g = new THREE.Group();
    this.cyl(g, 2.2, 2.6, 0.8, 0x8a867c, 0, 0.4, 0, 10);
    this.cyl(g, 1.2, 1.4, 0.6, 0x9a968c, 0, 1.1, 0, 8);
    const sw = G.Models.weapon('seal_sword'); sw.rotation.x = Math.PI; sw.position.y = 2.9; g.add(sw);
    const beam = this.mesh(new THREE.CylinderGeometry(1.4, 1.4, 60, 12, 1, true), 0, 0, 30, 0, { mat: new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), shadow: false }); g.add(beam);
    g.position.set(S.x, y, S.z); this.scene.add(g);
    G.Col.addCyl(S.x, S.z, 2.4, y - 1, y + 0.8, {});
    this.swordObj = { g, sw, beam };
    G.Interact.add({ x: S.x, y: y + 0.8, z: S.z, r: 3, priority: 1, label: '封印の剣を抜く', cond: () => !G.Prog.data.flags.sealSword, action: () => G.Quests.pullSword() });
    this.anim.push((dt, t) => { beam.material.opacity = 0.08 + Math.sin(t * 1.5) * 0.04; });
  },
  removeSwordFromPedestal() { if (this.swordObj) { this.swordObj.sw.visible = false; this.swordObj.beam.visible = false; } },
  // ---- 上昇気流の見た目 ----
  buildUpdrafts() {
    for (const u of G.World.updrafts) {
      const y = this.groundY(u.x, u.z);
      const m = this.mesh(new THREE.CylinderGeometry(u.r, u.r, u.top - y, 16, 1, true), 0, u.x, (u.top + y) / 2, u.z, { mat: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }), shadow: false });
      this.scene.add(m);
      const g = new THREE.Group();
      this.cyl(g, u.r * 0.4, u.r * 0.5, 0.6, 0x6a5a4a, 0, 0.3, 0, 8);
      g.position.set(u.x, y, u.z); this.scene.add(g);
    }
  },
  update(dt, t) {
    for (const f of this.anim) f(dt, t);
    const night = G.Sky.isNight();
    if (night !== this._night) { this._night = night; for (const l of this.lamps) l.material.color.setHex(night ? 0xffd27a : 0x665533); }
  },
};
