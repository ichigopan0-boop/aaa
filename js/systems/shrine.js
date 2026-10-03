// ===== 祈りの祠（試練の内部） =====
'use strict';
G.Shrine = {
  inside: false, insideId: null, group: null, cols: [], targets: [], inters: [], enemies: [], movers: [], hazards: [], updrafts: [], doors: {}, checkpoint: null, timer: null,
  loot: {
    s01: { k: 'w', id: 'trav_bow' }, s02: { k: 'w', id: 'soldier_sword' }, s03: { k: 'w', id: 'soldier_bow' }, s04: { k: 'a', id: 'ice', n: 10 }, s05: { k: 'w', id: 'flame_sword' },
    s06: { k: 'w', id: 'knight_spear' }, s07: { k: 'w', id: 'knight_claymore' }, s08: { k: 'w', id: 'thunder_rod' }, s09: { k: 'a', id: 'ancient', n: 3 }, s10: { k: 'w', id: 'royal_sword' },
    s11: { k: 'w', id: 'thunder_sword' }, s12: { k: 'm', id: 'diamond', n: 1 }, s13: { k: 'w', id: 'blizzard_rod' }, s14: { k: 'w', id: 'flame_claymore' }, s15: { k: 'w', id: 'storm_rod' }, s16: { k: 'w', id: 'knight_bow' },
  },
  origin(s) { const i = G.World.shrines.indexOf(s); return new THREE.Vector3(3000 + i * 320, 0, 0); },
  floorY() { return this.O ? this.O.y : 0; },
  enter(s) {
    if (this.inside) return;
    if (G.player.riding) G.Horse.dismount(true);
    G.UI.fade(true, () => {
      this.cur = s; this.O = this.origin(s); this.inside = true; this.insideId = s.id;
      const so = G.Struct.shrineObjs[s.id]; this.ret = { x: so.ex, z: so.ez };
      this.build(s);
      G.Sky.indoor = true;
      const sy = G.Col.floorAt(this.O.x, this.O.z - 2, this.O.y + 50);
      this.exitPad.position.y = sy + 0.06; this.exitInter.y = sy;
      this.checkpoint = { x: this.O.x, y: sy, z: this.O.z - 2 };
      G.player.teleport(this.O.x, sy + 0.05, this.O.z - 2, 0);
      G.player.lockTarget = null;
      G.Audio.setBgm('shrine'); G.Audio.play('shrine');
      G.Hud.areaMsg(s.name + '\n' + s.desc);
      G.UI.fade(false);
      if (!G.Prog.data.flags['visit_' + s.id]) { G.Prog.data.flags['visit_' + s.id] = true; }
    });
  },
  exit() {
    G.UI.fade(true, () => {
      this.clear();
      this.inside = false; this.insideId = null; G.Sky.indoor = false;
      const x = this.ret.x, z = this.ret.z;
      G.player.teleport(x, G.Col.floorAt(x, z, 9999) + 0.05, z);
      G.Audio.setBgm(null); G.Game.musicT = 0;
      G.UI.fade(false);
      G.Prog.save();
    });
  },
  clear() {
    if (this.group) { G.scene.remove(this.group); this.group = null; }
    for (const c of this.cols) G.Col.remove(c);
    for (const t of this.targets) G.Targets.remove(t);
    for (const i of this.inters) G.Interact.remove(i);
    for (const e of this.enemies) G.Enemies.remove(e);
    for (const c of G.Pickups.chests.filter(c => c.interior)) { G.scene.remove(c.mesh); G.Interact.remove(c.inter); if (c.col) G.Col.remove(c.col); }
    G.Pickups.chests = G.Pickups.chests.filter(c => !c.interior);
    this.cols = []; this.targets = []; this.inters = []; this.enemies = []; this.movers = []; this.hazards = []; this.updrafts = []; this.doors = {}; this.timer = null; this.memory = null;
    G.Hud.setTimer(null);
  },
  // ---- 部品 ----
  box(x, y, z, w, h, d, color, opts = {}) {
    const O = this.O;
    const m = new THREE.Mesh(G.Models.boxG(w, h, d), G.Mat.toon(color || 0x56606c));
    m.position.set(O.x + x, O.y + y + h / 2, O.z + z); m.receiveShadow = true; m.castShadow = true; this.group.add(m);
    if (opts.glow !== false && h < 3 && w > 1.5) { const e = new THREE.Mesh(G.Models.boxG(w + 0.05, 0.08, d + 0.05), G.Mat.glow(opts.glowColor || 0x40c8ff)); e.position.set(0, h / 2, 0); m.add(e); }
    if (opts.noCol) return { m };
    const c = G.Col.addBox(O.x + x - w / 2, O.y + y, O.z + z - d / 2, O.x + x + w / 2, O.y + y + h, O.z + z + d / 2, { climb: !!opts.climb, dynamic: !!opts.dynamic, noFloor: !!opts.noFloor });
    this.cols.push(c);
    return { m, c };
  },
  room(w, L, h = 18, noFloor) {
    const c = 0x3e4652;
    if (!noFloor) this.box(0, -1, L / 2, w, 1, L + 12, 0x4a525e, { glow: false });
    else this.box(0, -1, -1, w, 1, 10, 0x4a525e, { glow: false });
    this.box(-w / 2 - 0.5, -1, L / 2, 1, h, L + 12, c, { glow: false, noFloor: true }); this.box(w / 2 + 0.5, -1, L / 2, 1, h, L + 12, c, { glow: false, noFloor: true });
    this.box(0, -1, -6.5, w, h, 1, c, { glow: false, noFloor: true }); this.box(0, -1, L + 6.5, w, h, 1, c, { glow: false, noFloor: true });
    this.box(0, h - 1, L / 2, w + 2, 1, L + 14, c, { glow: false, noFloor: true });
    // 壁の光る模様
    for (let z = 0; z < L; z += 8) for (const s of [-1, 1]) { const g = new THREE.Mesh(G.Models.boxG(0.1, 3, 0.3), G.Mat.glow(0x40c8ff)); g.position.set(this.O.x + s * (w / 2 - 0.02), this.O.y + 5, this.O.z + z); this.group.add(g); }
    const lt = new THREE.PointLight(0x9ad8ff, 1.2, 80); lt.position.set(this.O.x, this.O.y + 12, this.O.z + L / 2); this.group.add(lt);
    // 入口の台座
    const pad = new THREE.Mesh(G.Models.cylG(1.4, 1.4, 0.1, 16), G.Mat.glow(0x40c8ff, 0.6)); pad.position.set(this.O.x, this.O.y + 0.06, this.O.z - 2); this.group.add(pad);
    this.exitPad = pad;
    this.exitInter = G.Interact.add({ x: this.O.x, y: this.O.y, z: this.O.z - 2, r: 1.6, label: '祠から出る', action: () => this.exit() });
    this.inters.push(this.exitInter);
  },
  pit(x, z, w, d) { /* 穴は床を置かないことで表現 */ },
  crystal(id, x, y, z, opts = {}) {
    const O = this.O, p = new THREE.Vector3(O.x + x, O.y + y, O.z + z);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8a30 });
    const m = new THREE.Mesh(G.Models.g('crys2', () => new THREE.OctahedronGeometry(0.5, 0)), mat); m.position.copy(p); this.group.add(m);
    const ped = new THREE.Mesh(G.Models.cylG(0.3, 0.4, y > 1.5 ? 0.3 : y - 0.2, 6), G.Mat.toon(0x56606c)); ped.position.set(p.x, y > 1.5 ? p.y - 0.65 : O.y + (y - 0.2) / 2, p.z); this.group.add(ped);
    const t = { pos: p, r: 0.7, on: false, mesh: m, mat, id, req: opts.elem || null, onHit: null, onMelee: null };
    const act = (elem) => {
      if (t.req && elem !== t.req) { G.Hud.notify(t.req === 'elec' ? '電気を当てないと反応しない…' : t.req === 'fire' ? '炎を当てないと反応しない…' : '反応しない…'); return; }
      this.onCrystal(t);
    };
    t.onHit = (pp) => { act(pp.elem); return true; };
    t.onMelee = (d, f, elem) => { act(elem); };
    G.Targets.add(t); this.targets.push(t);
    this.anims = this.anims || [];
    return t;
  },
  setCrystal(t, on) { t.on = on; t.mat.color.setHex(on ? 0x40c8ff : 0xff8a30); },
  brazier(x, z) {
    const O = this.O, p = new THREE.Vector3(O.x + x, O.y + 1.6, O.z + z);
    this.box(x, 0, z, 0.8, 1.2, 0.8, 0x56606c, { glow: false });
    const bowl = new THREE.Mesh(G.Models.cylG(0.6, 0.35, 0.4, 8), G.Mat.toon(0x3a3a40)); bowl.position.set(p.x, O.y + 1.4, p.z); this.group.add(bowl);
    const fl = new THREE.Mesh(G.Models.coneG(0.4, 1, 6), G.Mat.glow(0xff7a20, 0.9)); fl.position.set(p.x, O.y + 2.1, p.z); fl.visible = false; this.group.add(fl);
    const t = { pos: p, r: 0.9, lit: false, fl };
    const light = (elem) => { if (t.lit) return; if (elem !== 'fire') { G.Hud.notify('炎で火をつけよう'); return; } t.lit = true; fl.visible = true; G.Audio.play('fire', { pos: p }); G.Particles.fire(p, 10); this.onBrazier(); };
    t.onHit = (pp) => { light(pp.elem); return true; }; t.onMelee = (d, f, elem) => light(elem);
    G.Targets.add(t); this.targets.push(t);
    return t;
  },
  door(key, x, z, w, h = 6) {
    const d = this.box(x, 0, z, w, h, 1, 0x6a7280, { glow: false });
    const g = new THREE.Mesh(G.Models.boxG(w * 0.6, 0.3, 1.05), G.Mat.glow(0xff8a30)); g.position.y = 0; d.m.add(g);
    d.h = h; d.glow = g; this.doors[key] = d; return d;
  },
  openDoor(key) {
    const d = this.doors[key]; if (!d || d.opened) return;
    d.opened = true; G.Col.remove(d.c); G.Audio.play('door'); d.glow.material = G.Mat.glow(0x40c8ff);
    let t = 0; const y0 = d.m.position.y; const iv = setInterval(() => { t += 0.03; d.m.position.y = y0 - Math.min(1, t) * (d.h + 0.2); if (t >= 1) clearInterval(iv); }, 16);
  },
  closeDoor(key) {
    const d = this.doors[key]; if (!d || !d.opened) return;
    d.opened = false; d.m.position.y += d.h + 0.2; const O = this.O;
    const b = d.m.position; const bx = d.m.geometry.parameters;
    d.c = G.Col.addBox(b.x - bx.width / 2, b.y - bx.height / 2, b.z - bx.depth / 2, b.x + bx.width / 2, b.y + bx.height / 2, b.z + bx.depth / 2, {}); this.cols.push(d.c);
    d.glow.material = G.Mat.glow(0xff8a30); G.Audio.play('door');
  },
  mover(x, y, z, w, d, path, speed) {
    const b = this.box(x, y, z, w, 0.6, d, 0x6a7a8a, { dynamic: true, glowColor: 0xffd040 });
    const O = this.O;
    const mv = { b, path: path.map(p => new THREE.Vector3(O.x + p[0], O.y + p[1], O.z + p[2])), speed, t: 0, w, d };
    this.movers.push(mv); return mv;
  },
  bar(x, y, z, len, speed) {
    const O = this.O; const piv = new THREE.Group(); piv.position.set(O.x + x, O.y + y, O.z + z); this.group.add(piv);
    const m = new THREE.Mesh(G.Models.boxG(len, 0.35, 0.35), G.Mat.toon(0xd84a3a)); m.position.x = len / 2 - 0.5; piv.add(m);
    const hub = new THREE.Mesh(G.Models.cylG(0.5, 0.5, 0.6, 8), G.Mat.toon(0x56606c)); piv.add(hub);
    this.hazards.push({ piv, len, speed, y: O.y + y });
  },
  fan(x, z, top) {
    const O = this.O; const m = new THREE.Mesh(G.Models.cylG(1.4, 1.6, 0.5, 10), G.Mat.toon(0x56606c)); m.position.set(O.x + x, O.y + 0.25, O.z + z); this.group.add(m);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, top, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })); col.position.set(O.x + x, O.y + top / 2, O.z + z); this.group.add(col);
    this.updrafts.push({ x: O.x + x, z: O.z + z, r: 1.8, top: O.y + top });
  },
  updraftAt(p) { return this.updrafts.some(u => Math.hypot(p.x - u.x, p.z - u.z) < u.r && p.y < u.top); },
  pedestal(x, z, label, give) {
    const O = this.O; this.box(x, 0, z, 1, 1.1, 1, 0x56606c, { glow: false });
    const orb = new THREE.Mesh(G.Models.sphG(0.25, 8, 6), G.Mat.glow(0xffd040)); orb.position.set(O.x + x, O.y + 1.45, O.z + z); this.group.add(orb);
    const it = G.Interact.add({ x: O.x + x, y: O.y, z: O.z + z, r: 2, label, cond: () => orb.visible, action: () => { give(); orb.visible = false; G.Audio.play('itemGet'); } });
    this.inters.push(it);
  },
  checkpointPad(x, z) {
    const O = this.O, fy = this.floorAt(x, z); const pad = new THREE.Mesh(G.Models.cylG(1, 1, 0.08, 12), G.Mat.glow(0xffd040, 0.5)); pad.position.set(O.x + x, O.y + fy + 0.05, O.z + z); this.group.add(pad);
    this.cps = this.cps || []; this.cps.push({ x: O.x + x, z: O.z + z, y: O.y + fy, pad });
  },
  altar(z) {
    const O = this.O, s = this.cur;
    const by = this.floorAt(0, z);
    this.box(0, by, z, 6, 0.8, 6, 0x56606c);
    const st = G.Models.npc({ cloth: 0x8a9aa0, skin: 0xa8b8c0, robe: true, hair: null, beard: 0xc8d8e0 });
    st.root.position.set(O.x, O.y + by + 0.8, O.z + z + 1.5); st.root.rotation.y = Math.PI; this.group.add(st.root);
    G.Models.animHumanoid(st, { st: 'sit', t: 0 }, 1);
    const orb = new THREE.Mesh(G.Models.sphG(0.35, 10, 8), G.Mat.glow(0xfff0a0)); orb.position.set(O.x, O.y + by + 2.4, O.z + z + 0.6); this.group.add(orb);
    this.altarOrb = orb; this.altarY = O.y + by + 2.4;
    this.inters.push(G.Interact.add({ x: O.x, y: O.y + by + 0.8, z: O.z + z + 0.4, r: 2.8, priority: 1, label: () => G.Prog.data.shrines[s.id] ? '祠から出る' : '祈りを捧げる', action: () => { if (G.Prog.data.shrines[s.id]) this.exit(); else this.complete(); } }));
  },
  chest(x, z, ry) {
    const s = this.cur, O = this.O;
    G.Pickups.addChest('sc_' + s.id, O.x + x, O.y + this.floorAt(x, z), O.z + z, this.loot[s.id], { ry: ry || Math.PI, interior: s.id });
  },
  floorAt(x, z) { return G.Col.floorAt(this.O.x + x, this.O.z + z, this.O.y + 50) - this.O.y; },
  complete() {
    const s = this.cur, d = G.Prog.data;
    d.shrines[s.id] = true; d.blessings++; d.blessingsTotal++;
    const idx = G.World.shrines.indexOf(s);
    G.Prog.addXP(250 + idx * 30);
    d.respawn = { x: this.ret.x, y: null, z: this.ret.z };
    G.Struct.setShrineCleared(s.id);
    G.Audio.play('blessing'); G.Particles.levelUp(this.altarOrb.position);
    this.altarOrb.material = G.Mat.glow(0x40c8ff);
    G.Hud.itemGet('祝福の光', null, '女神像に4つ捧げると、ハートかがんばりが増える（' + d.blessings + '個）');
    G.Quests.update(); G.Prog.save();
  },
  // ---- 試練ごとのイベント ----
  onCrystal(t) {
    const tr = this.cur.trial;
    if (this.memory) { this.memoryHit(t); return; }
    if (t.on && tr !== 'timed') return;
    this.setCrystal(t, true); G.Audio.play('beep', { pitch: 1.5 });
    if (tr === 'tutorial') { if (t.id === 'a') this.openDoor('d1'); if (t.id === 'b') this.openDoor('d2'); }
    else if (tr === 'archery') {
      if (!this.timer) { this.timer = { t: 60, onEnd: () => { G.Hud.notify('時間切れ… もう一度！'); for (const c of this.targets) if (c.mat) this.setCrystal(c, false); this.timer = null; G.Hud.setTimer(null); } }; }
      if (this.targets.filter(c => c.mat).every(c => c.on)) { this.openDoor('d1'); this.timer = null; G.Hud.setTimer(null); G.Audio.play('secret'); }
    } else if (tr === 'timed') {
      this.openDoor('d1'); this.timer = { t: 9, onEnd: () => { this.closeDoor('d1'); this.setCrystal(t, false); this.timer = null; G.Hud.setTimer(null); } };
    } else if (tr === 'thunder' || tr === 'maze') {
      if (this.targets.filter(c => c.mat).every(c => c.on)) { this.openDoor('d1'); G.Audio.play('secret'); }
    }
  },
  onBrazier() { if (this.targets.filter(t => t.fl).every(t => t.lit)) { this.openDoor('d1'); G.Audio.play('secret'); } },
  memoryHit(t) {
    const m = this.memory; if (m.showing) return;
    G.Audio.play('beep', { pitch: 1 + m.cr.indexOf(t) * 0.25 });
    this.setCrystal(t, true); setTimeout(() => this.setCrystal(t, false), 300);
    if (m.seq[m.idx] === m.cr.indexOf(t)) {
      m.idx++;
      if (m.idx >= m.seq.length) {
        m.round++;
        if (m.round >= 3) { this.memory = null; this.openDoor('d1'); G.Audio.play('secret'); G.Hud.notify('記憶の試練を越えた！'); return; }
        G.Hud.notify('正解！ 次は ' + (m.round + 3) + ' 回'); setTimeout(() => this.memoryShow(), 1200);
      }
    } else { G.Audio.play('error'); G.Hud.notify('違う… もう一度よく見て'); setTimeout(() => this.memoryShow(), 1200); }
  },
  memoryShow() {
    const m = this.memory; if (!m) return;
    m.seq = []; for (let i = 0; i < m.round + 3; i++) m.seq.push(Math.floor(Math.random() * 4));
    m.idx = 0; m.showing = true;
    m.seq.forEach((v, i) => { setTimeout(() => { if (!this.memory) return; this.setCrystal(m.cr[v], true); G.Audio.play('beep', { pitch: 1 + v * 0.25 }); setTimeout(() => this.memory && this.setCrystal(m.cr[v], false), 450); }, 700 * i + 400); });
    setTimeout(() => { if (this.memory) m.showing = false; }, 700 * m.seq.length + 500);
  },
  // ---- 内部の組み立て ----
  build(s) {
    this.clear();
    this.group = new THREE.Group(); G.scene.add(this.group);
    const tr = s.trial; this.cps = [];
    this.checkpoint = { x: this.O.x, y: this.O.y, z: this.O.z - 2 };
    const W = 30;
    if (tr === 'tutorial') {
      this.room(W, 64);
      this.box(0, 0, 14, 12, 3, 1, 0x56606c, { climb: true, glow: false });
      this.box(0, 0, 20, 30, 3, 12, 0x4e5864, { climb: true });
      this.box(0, 0, 36.5, 30, 3, 15, 0x4e5864, { climb: true });
      this.box(0, 0, 27.5, 30, 0.2, 3, 0x2a2f36, { glow: false });
      this.crystal('a', -6, 4.5, 40);
      this.door('d1', 0, 44, 30, 9);
      this.box(0, 0, 54, 30, 3, 20, 0x4e5864);
      this.chest(-6, 48);
      this.door('d2', 0, 52, 30, 9);
      this.crystal('b', 8, 11, 51.4);
      this.altar(59);
      this.hint('高い所にある水晶は弓で射よう（右クリックで構えて左クリック）', 46);
      this.hint('壁に向かって進むと登れる。ジャンプで隙間を越えよう', 10);
    } else if (tr === 'combat1' || tr === 'combat2' || tr === 'combat3') {
      this.room(W, 50);
      this.door('d1', 0, 40, 30, 10);
      const types = tr === 'combat1' ? ['trial_s'] : tr === 'combat2' ? ['trial_m'] : ['trial_l', 'trial_s', 'trial_s'];
      types.forEach((tp, i) => { const e = G.Enemies.addLocal(tp, this.O.x + (i - (types.length - 1) / 2) * 7, this.O.y, this.O.z + 24, { interior: s.id }); e.state = 'alert'; e.target = G.player; e.rotY = Math.PI; this.enemies.push(e); });
      this.combatCheck = true;
      this.chest(7, 44); this.altar(48);
    } else if (tr === 'archery') {
      this.room(W, 56);
      this.pedestal(-4, 3, '台座を調べる（弓と矢）', () => { if (!G.Prog.equipped('bow')) G.Prog.addWeapon('trav_bow'); G.Prog.addArrows('normal', 20); G.Hud.notify('矢を20本手に入れた'); });
      this.crystal('a', -10, 6, 20); this.crystal('b', 10, 9, 26); this.crystal('c', 0, 14, 34);
      const m1 = this.mover(-6, 5, 30, 2, 2, [[-10, 5, 30], [10, 5, 30]], 4); const c1 = this.crystal('d', -6, 6.3, 30); c1.follow = m1;
      const m2 = this.mover(6, 3, 38, 2, 2, [[6, 3, 38], [6, 12, 38]], 3); const c2 = this.crystal('e', 6, 4.3, 38); c2.follow = m2;
      this.door('d1', 0, 44, 30, 10); this.chest(-7, 48); this.altar(52);
      this.hint('5つの水晶をすべて射抜け！（1つ目を射ると60秒の制限時間）', 8);
    } else if (tr === 'glide') {
      this.room(W, 78, 26, true);
      this.box(0, -1, 12, 12, 15, 14, 0x4e5864, { climb: true });
      this.fan(0, 30, 22); this.box(0, -1, 30, 4, 1, 4, 0x4e5864); this.box(-11, -1, 30, 6, 17, 6, 0x4e5864); this.chest(-11, 30, Math.PI / 2);
      this.box(0, -1, 66, 30, 9, 22, 0x4e5864);
      this.altar(70);
      this.hint('台に登り、パラセール（空中でジャンプ）で飛ぼう。風に乗れば上昇できる', 2);
    } else if (tr === 'fire') {
      this.room(W, 50);
      this.pedestal(0, 4, '台座を調べる（炎の矢）', () => { G.Prog.addArrows('fire', 8); if (!G.Prog.equipped('bow')) G.Prog.addWeapon('trav_bow'); G.Hud.notify('炎の矢を8本手に入れた'); });
      this.brazier(-10, 14); this.brazier(10, 14); this.brazier(-10, 30); this.brazier(10, 30);
      this.box(0, 0, 22, 4, 6, 4, 0x56606c, { glow: false });
      this.door('d1', 0, 38, 30, 10); this.chest(7, 43); this.altar(47);
      this.hint('4つの燭台すべてに火を灯せ（炎の矢・炎のロッド・炎の武器）', 8);
    } else if (tr === 'platform') {
      this.room(W, 90, 22, true);
      this.box(0, -1, 6, 30, 5, 10, 0x4e5864, { climb: true });
      this.mover(0, 3.4, 12, 4, 4, [[0, 3.4, 12], [0, 3.4, 26]], 3.5);
      this.mover(-6, 3.4, 32, 4, 4, [[-8, 3.4, 32], [8, 3.4, 32]], 4);
      this.box(8, -1, 40, 6, 5, 6, 0x4e5864); this.checkpointPad(8, 40);
      this.mover(4, 3.4, 48, 4, 4, [[4, 3.4, 48], [4, 10, 48]], 2.5);
      this.box(4, -1, 56, 6, 11, 6, 0x4e5864);
      this.mover(-4, 9.4, 62, 4, 4, [[-4, 9.4, 62], [-4, 9.4, 74], [4, 9.4, 74]], 3.5);
      this.box(0, -1, 84, 30, 11, 14, 0x4e5864); this.chest(-8, 82); this.altar(87);
      this.hint('動く足場を乗り継いで奥へ進め。落ちても途中から再開できる', 4);
    } else if (tr === 'memory') {
      this.room(W, 44);
      const cr = [this.crystal('0', -9, 2, 18), this.crystal('1', -3, 2, 20), this.crystal('2', 3, 2, 20), this.crystal('3', 9, 2, 18)];
      this.memory = { cr, round: 0, seq: [], idx: 0, showing: false };
      this.inters.push(G.Interact.add({ x: this.O.x, y: this.O.y, z: this.O.z + 8, r: 2.5, label: '試練を始める', cond: () => this.memory && !this.memory.started, action: () => { this.memory.started = true; this.memoryShow(); } }));
      this.door('d1', 0, 30, 30, 10); this.chest(7, 35); this.altar(40);
      this.hint('水晶が光る順番を覚えて、同じ順に叩こう（3回）', 5);
    } else if (tr === 'timed') {
      this.room(W, 70);
      this.crystal('a', 0, 1.5, 6);
      for (let k = 0; k < 4; k++) this.box(k % 2 ? 6 : -6, 0, 16 + k * 9, 16, 3, 1.5, 0x56606c, { glow: false });
      this.door('d1', 0, 56, 30, 10); this.chest(0, 62); this.altar(66);
      this.hint('水晶を叩くと奥の扉が9秒だけ開く。ダッシュで駆け抜けろ！', 3);
    } else if (tr === 'thunder') {
      this.room(W, 50);
      this.pedestal(0, 4, '台座を調べる（雷の矢）', () => { G.Prog.addArrows('elec', 6); if (!G.Prog.equipped('bow')) G.Prog.addWeapon('trav_bow'); G.Hud.notify('雷の矢を6本手に入れた'); });
      this.crystal('a', -10, 8, 26, { elem: 'elec' }); this.crystal('b', 10, 12, 30, { elem: 'elec' });
      this.door('d1', 0, 38, 30, 10); this.chest(-7, 43); this.altar(47);
      this.hint('この水晶は電気でしか反応しない（雷の矢・雷のロッド・雷の剣）', 8);
    } else if (tr === 'maze') {
      this.room(40, 70);
      const walls = [[-8, 10, 24, 1], [10, 18, 20, 1], [-6, 26, 28, 1], [8, 34, 24, 1], [-10, 42, 20, 1], [4, 50, 32, 1]];
      for (const [x, z, w, d] of walls) this.box(x, 0, z, w, 5, d, 0x56606c, { glow: false });
      this.bar(0, 0.6, 14, 9, 1.6); this.bar(-6, 0.6, 30, 8, -2); this.bar(6, 0.6, 46, 9, 2.2);
      this.crystal('a', 17, 1.5, 22); this.crystal('b', -17, 1.5, 38);
      this.door('d1', 0, 58, 40, 10); this.chest(-12, 63); this.altar(66);
      this.hint('赤い棒に当たるとはね飛ばされる。2つの水晶を叩けば扉が開く', 4);
    } else {
      // 祝福の祠
      this.room(24, 26);
      this.chest(6, 14); this.altar(18);
      this.hint('よくぞ辿り着いた。その旅路こそが試練であった…', 6);
    }
  },
  hint(text, z) {
    const O = this.O; const p = { x: O.x, y: O.y + this.floorAt(3, z), z: O.z + z };
    this.inters.push(G.Interact.add({ x: p.x + 3, y: p.y, z: p.z, r: 2.2, label: '石碑を読む', action: () => G.Dialog.show('古い石碑', [text]) }));
    const st = new THREE.Mesh(G.Models.boxG(1.2, 1.6, 0.3), G.Mat.toon(0x6a7280)); st.position.set(p.x + 3, p.y + 0.8, p.z); this.group.add(st);
    const gl = new THREE.Mesh(G.Models.boxG(0.8, 0.1, 0.32), G.Mat.glow(0x40c8ff)); gl.position.y = 0.4; st.add(gl);
    this.cols.push(G.Col.addBox(p.x + 2.4, p.y, p.z - 0.15, p.x + 3.6, p.y + 1.6, p.z + 0.15, {}));
  },
  fallOut() {
    const pl = G.player; let cp = this.checkpoint;
    pl.hurt(2, true); G.Hud.notify('落ちてしまった…');
    if (!pl.dead) pl.teleport(cp.x, cp.y + 0.05, cp.z);
  },
  update(dt) {
    if (!this.inside) return;
    const pl = G.player;
    // 動く足場
    for (const mv of this.movers) {
      mv.t += dt * mv.speed;
      const n = mv.path.length; let total = 0; const segs = [];
      for (let i = 0; i < n - 1; i++) { const l = mv.path[i].distanceTo(mv.path[i + 1]); segs.push(l); total += l; }
      const cyc = total * 2; let d = mv.t % cyc; if (d > total) d = cyc - d;
      let i = 0; while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
      const p = G.tmp.v1.lerpVectors(mv.path[i], mv.path[i + 1], Math.min(1, d / segs[i]));
      const c = mv.b.c, m = mv.b.m;
      const ox = (c.minX + c.maxX) / 2, oz = (c.minZ + c.maxZ) / 2, oy = c.minY;
      const dx = p.x - ox, dy = p.y - oy, dz = p.z - oz;
      G.Col.moveBox(c, dx, dy, dz); c.dx = dx; c.dz = dz;
      m.position.set(p.x, p.y + 0.3, p.z);
    }
    for (const t of this.targets) if (t.follow) { const m = t.follow.b.m.position; t.pos.set(m.x, m.y + 1.3, m.z); t.mesh.position.copy(t.pos); }
    for (const t of this.targets) if (t.mesh) t.mesh.rotation.y += dt * 1.5;
    // 回転する棒
    for (const h of this.hazards) {
      h.piv.rotation.y += dt * h.speed;
      if (pl.invuln <= 0 && Math.abs(pl.pos.y + 0.5 - h.y) < 1.2) {
        const a = -h.piv.rotation.y, ex = h.piv.position.x + Math.cos(a) * (h.len - 0.5), ez = h.piv.position.z + Math.sin(a) * (h.len - 0.5);
        const d = G.U.distSeg(pl.pos.x, pl.pos.z, h.piv.position.x, h.piv.position.z, ex, ez);
        if (d < 0.6) pl.takeDamage(4, new THREE.Vector3(h.piv.position.x, pl.pos.y, h.piv.position.z), null, { kb: 9 });
      }
    }
    // チェックポイント
    for (const cp of this.cps || []) if (Math.hypot(pl.pos.x - cp.x, pl.pos.z - cp.z) < 1.2 && pl.onGround) { if (this.checkpoint !== cp) { this.checkpoint = cp; G.Audio.play('beep'); G.Hud.notify('チェックポイント'); } }
    // 戦闘の試練
    if (this.combatCheck && this.enemies.length && this.enemies.every(e => !e.alive)) { this.combatCheck = false; this.openDoor('d1'); G.Audio.play('secret'); G.Hud.centerMsg('試練の機兵を倒した！', 2); }
    // タイマー
    if (this.timer) { this.timer.t -= dt; G.Hud.setTimer(this.timer.t); if (this.timer.t <= 0) this.timer.onEnd(); }
    if (this.altarOrb) this.altarOrb.position.y = this.altarY + Math.sin(performance.now() / 600) * 0.1;
  },
};
