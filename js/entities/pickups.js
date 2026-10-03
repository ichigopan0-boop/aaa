// ===== 拾い物・宝箱・森の精の実・採取物・鉱石 =====
'use strict';
G.Pickups = {
  drops: [], chests: [], seeds: [], harvest: [], ores: [],
  init(scene) {
    this.scene = scene;
    this.genChests();
    this.genSeeds();
    this.genHarvest();
    this.genOres();
  },
  // ---------- 落とし物 ----------
  dropMesh(kind, id) {
    if (kind === 'w') { const m = G.Models.weapon(id); m.rotation.z = Math.PI / 2; const g = new THREE.Group(); g.add(m); m.position.x = -0.4; return g; }
    if (kind === 'g') { const m = new THREE.Mesh(G.Models.g('coin', () => new THREE.CylinderGeometry(0.18, 0.18, 0.05, 10)), G.Mat.toon(0xffd54f, { emissive: 0x6a5000 })); m.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.add(m); return g; }
    const g = new THREE.Group();
    const m = new THREE.Mesh(G.Models.sphG(0.16, 8, 6), G.Mat.toon(this.matColor(id))); m.position.y = 0.1; g.add(m);
    return g;
  },
  matColor(id) {
    const c = { apple: 0xe53935, berry: 0xd81b60, shroom: 0xc8a070, herb: 0x5aa83c, spicy: 0xff5a20, chill: 0x9ae86a, fireweed: 0xff7a20, mighty: 0xd84a4a, tough: 0x5a6ad8, swift: 0x8ad84a, honey: 0xffb300, mpflower: 0xb07ae8, meat: 0xc85a4a, prime_meat: 0xd84a5a, fish: 0x6a9ab0, big_fish: 0x4a8ab0, amber: 0xffa030, opal: 0xeeeeff, topaz: 0xffe040, ruby: 0xff2030, sapphire: 0x3060ff, diamond: 0xdfffff, ancient_screw: 0x40e0ff, ancient_gear: 0x40e0ff, ancient_core: 0x40ffff };
    return c[id] || 0xdddddd;
  },
  spawnDrop(kind, id, n, pos) {
    const mesh = this.dropMesh(kind, id); mesh.position.copy(pos); this.scene.add(mesh);
    const d = { kind, id, n, pos: pos.clone(), vel: new THREE.Vector3((Math.random() - 0.5) * 3, 4 + Math.random() * 2, (Math.random() - 0.5) * 3), mesh, t: 0, ground: false };
    if (kind === 'w') d.inter = G.Interact.add({ x: pos.x, y: pos.y, z: pos.z, r: 2.0, priority: 0.2, label: () => G.Items.weapons[id].name + 'を拾う', action: () => this.pickWeapon(d) });
    this.drops.push(d); return d;
  },
  dropWeapon(id, pos, dur) { if (!G.Items.weapons[id]) return; const w = G.Items.weapons[id]; const d = this.spawnDrop('w', id, 1, pos); d.dur = dur != null ? dur : Math.max(1, Math.round(w.dur * (0.5 + Math.random() * 0.5))); },
  dropMat(id, pos, n = 1) { this.spawnDrop('m', id, n, pos); },
  dropMoney(n, pos) { if (n > 0) this.spawnDrop('g', 'g', n, pos); },
  dropItem(it, pos) { if (it.k === 'w') this.dropWeapon(it.id, pos, G.Items.weapons[it.id].dur); else if (it.k === 'm') this.dropMat(it.id, pos, it.n || 1); else { const d = this.spawnDrop('x', 'x', 1, pos); d.item = it; } },
  pickWeapon(d) {
    if (!G.Prog.addWeapon(d.id, d.dur)) { G.Hud.notify('武器がいっぱいで持てない！（メニューで捨てられます）'); G.Audio.play('error'); return; }
    G.Hud.notify(G.Items.weapons[d.id].name + 'を手に入れた'); G.Audio.play('pickup');
    this.removeDrop(d);
  },
  removeDrop(d) { this.scene.remove(d.mesh); if (d.inter) G.Interact.remove(d.inter); const i = this.drops.indexOf(d); if (i >= 0) this.drops.splice(i, 1); },
  updateDrops(dt) {
    const pl = G.player;
    for (const d of this.drops.slice()) {
      d.t += dt;
      if (!d.ground) {
        d.vel.y -= 18 * dt; d.pos.addScaledVector(d.vel, dt);
        const fl = G.Col.floorAt(d.pos.x, d.pos.z, d.pos.y + 0.3, 0.1);
        if (d.pos.y <= fl + 0.1) { d.pos.y = fl + 0.1; d.ground = true; }
        if (d.pos.y < -100) { this.removeDrop(d); continue; }
      }
      d.mesh.position.set(d.pos.x, d.pos.y + (d.ground ? Math.sin(d.t * 3) * 0.06 + 0.1 : 0), d.pos.z);
      d.mesh.rotation.y += dt * 1.5;
      if (d.inter) { d.inter.x = d.pos.x; d.inter.y = d.pos.y; d.inter.z = d.pos.z; }
      if (d.ground && Math.random() < 0.03) G.Particles.sparkle(d.mesh.position, d.kind === 'w' ? 0xffffff : 0xfff0a0);
      // 自動で拾う（素材・お金）
      if (d.kind !== 'w' && pl && d.t > 0.5 && pl.pos.distanceTo(d.pos) < 1.6) {
        if (d.kind === 'g') { G.Prog.addMoney(d.n); G.Audio.play('coin'); G.Hud.notify('+' + d.n + ' ゴールド'); }
        else if (d.kind === 'm') { G.Prog.addMat(d.id, d.n); G.Audio.play('pickup'); G.Hud.notify(G.Items.mats[d.id].name + ' ×' + d.n); }
        else if (d.item) G.Prog.give(d.item);
        this.removeDrop(d); continue;
      }
      if (d.t > 150) this.removeDrop(d);
    }
  },
  // ---------- 宝箱 ----------
  chestMesh() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(G.Models.boxG(1.2, 0.7, 0.8), G.Mat.toon(0x8a5a2a)); base.position.y = 0.35; base.castShadow = true; g.add(base);
    const trim = new THREE.Mesh(G.Models.boxG(1.25, 0.12, 0.85), G.Mat.toon(0xd8b040)); trim.position.y = 0.66; g.add(trim);
    const lidP = new THREE.Group(); lidP.position.set(0, 0.7, -0.4); g.add(lidP);
    const lid = new THREE.Mesh(G.Models.g('lid', () => { const c = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10, 1, false, 0, Math.PI); c.rotateZ(Math.PI / 2); return c; }), G.Mat.toon(0x9a6a32)); lid.position.z = 0.4; lid.castShadow = true; lidP.add(lid);
    const lock = new THREE.Mesh(G.Models.boxG(0.18, 0.22, 0.06), G.Mat.toon(0xd8b040)); lock.position.set(0, 0.55, 0.42); g.add(lock);
    g.userData.lid = lidP;
    return g;
  },
  addChest(id, x, y, z, item, opts = {}) {
    const g = this.chestMesh(); g.position.set(x, y, z); g.rotation.y = opts.ry || 0; this.scene.add(g);
    const c = { id, item, pos: new THREE.Vector3(x, y, z), mesh: g, open: !!G.Prog.data.chests[id], camp: opts.camp, interior: opts.interior || null, hidden: !!opts.hidden };
    if (c.open) g.userData.lid.rotation.x = -1.9;
    c.inter = G.Interact.add({ x, y, z, r: 2.2, priority: 0.8, label: () => c.camp != null && !G.Enemies.campCleared(c.camp) ? '宝箱（敵を全滅させると開く）' : '宝箱を開ける', cond: () => !c.open && (!c.hidden || c.revealed), action: () => this.openChest(c) });
    if (c.hidden) g.visible = false;
    c.col = G.Col.addCyl(x, z, 0.6, y - 0.5, y + 0.6, { noFloor: false });
    this.chests.push(c); return c;
  },
  openChest(c) {
    if (c.open) return;
    if (c.camp != null && !G.Enemies.campCleared(c.camp)) { G.Hud.notify('まだ敵が残っている！'); G.Audio.play('error'); return; }
    if (c.item && c.item.k === 'w' && G.Prog.data.inv[G.Prog.wcat(c.item.id)].length >= G.Prog.data.slots[G.Prog.wcat(c.item.id)]) { G.Hud.notify('武器がいっぱい！ 捨ててから開けよう'); G.Audio.play('error'); return; }
    c.open = true; G.Prog.data.chests[c.id] = true;
    G.Audio.play('chest');
    const pl = G.player; pl.setState('interact'); setTimeout(() => { if (pl.state === 'interact') pl.setState('ground'); }, 700);
    const lid = c.mesh.userData.lid; let t = 0; const iv = setInterval(() => { t += 0.05; lid.rotation.x = -Math.min(1.9, t * 4); if (t > 0.5) clearInterval(iv); }, 16);
    setTimeout(() => { G.Prog.give(c.item); G.Prog.addXP(c.camp != null ? 15 : 25); G.Quests.update(); G.Prog.save(); }, 450);
    G.Particles.levelUp(c.pos.clone().setY(c.pos.y + 0.8));
  },
  zoneLoot(zone, r) {
    const T = {
      1: [{ k: 'a', id: 'fire', n: 3 }, { k: 'g', n: 30 }, { k: 'w', id: 'trav_spear' }, { k: 'w', id: 'woodcutter_axe' }, { k: 'm', id: 'amber', n: 1 }, { k: 'w', id: 'trav_claymore' }, { k: 'g', n: 50 }, { k: 'f', id: 'heal_potion' }],
      2: [{ k: 'w', id: 'soldier_sword' }, { k: 'w', id: 'soldier_bow' }, { k: 'a', id: 'fire', n: 5 }, { k: 'a', id: 'ice', n: 5 }, { k: 'g', n: 100 }, { k: 'm', id: 'opal', n: 1 }, { k: 'w', id: 'soldier_spear' }, { k: 'w', id: 'fire_rod' }, { k: 'a', id: 'elec', n: 5 }],
      3: [{ k: 'w', id: 'knight_sword' }, { k: 'w', id: 'knight_bow' }, { k: 'w', id: 'flame_sword' }, { k: 'w', id: 'thunder_sword' }, { k: 'w', id: 'frost_sword' }, { k: 'a', id: 'bomb', n: 5 }, { k: 'g', n: 200 }, { k: 'm', id: 'topaz', n: 1 }, { k: 'w', id: 'thunder_rod' }, { k: 'w', id: 'ice_rod' }, { k: 'w', id: 'falcon_bow' }, { k: 'w', id: 'knight_claymore' }],
      4: [{ k: 'w', id: 'royal_sword' }, { k: 'w', id: 'knight_claymore' }, { k: 'a', id: 'bomb', n: 10 }, { k: 'a', id: 'ancient', n: 3 }, { k: 'm', id: 'diamond', n: 1 }, { k: 'g', n: 500 }, { k: 'w', id: 'meteor_rod' }, { k: 'w', id: 'blizzard_rod' }, { k: 'w', id: 'storm_rod' }, { k: 'w', id: 'triple_bow' }, { k: 'm', id: 'ancient_core', n: 1 }],
    };
    return r.pick(T[zone] || T[1]);
  },
  // 面白い場所を探す
  findSpots(seed, n, minDist, filter) {
    const r = G.U.rng(seed), out = [];
    for (let tries = 0; tries < n * 60 && out.length < n; tries++) {
      const x = r.range(-740, 740), z = r.range(-740, 740);
      const h = G.Terrain.getHeight(x, z); if (h < 1.5) continue;
      if (G.World.villages.some(v => Math.hypot(v.x - x, v.z - z) < v.flat + 15)) continue;
      if (G.World.shrines.some(s => Math.hypot(s.x - x, s.z - z) < 10) || G.World.towers.some(s => Math.hypot(s.x - x, s.z - z) < 10)) continue;
      if (Math.hypot(x, z) < 52) continue;
      { const L = G.World.lostWoods; if (Math.hypot(x - L.cx, z - L.cz) < L.r + 5 && G.U.distPolyline(x, z, L.path) > 18) continue; }
      if (Math.hypot(x - G.World.lava.x, z - G.World.lava.z) < 50) continue;
      if (out.some(o => Math.hypot(o.x - x, o.z - z) < minDist)) continue;
      // 周囲より高い？
      let higher = -1e9; for (let a = 0; a < 6.28; a += 0.785) higher = Math.max(higher, G.Terrain.getHeight(x + Math.cos(a) * 9, z + Math.sin(a) * 9));
      const peak = h > higher + 0.3;
      const slope = G.Terrain.getNormal(x, z, G.tmp.v1).y;
      const info = { x, z, h, peak, slope, r: r() };
      if (filter && !filter(info)) continue;
      out.push(info);
    }
    return out;
  },
  genChests() {
    const r = G.U.rng(4242);
    // 頂上・景色のいい場所の宝箱
    const spots = this.findSpots(101, 36, 55, (i) => i.slope > 0.75 && (i.peak || i.r < 0.45));
    spots.forEach((s, i) => {
      const zone = G.Terrain.regionAt(s.x, s.z).zone;
      const item = this.zoneLoot(Math.min(4, zone + (s.peak ? 1 : 0)), r);
      this.addChest('c' + i, s.x, G.Terrain.getHeight(s.x, s.z), s.z, item, { ry: r.range(0, 6.28) });
    });
    // 特別な宝箱
    const special = [
      ['sp1', 55, 505, { k: 'w', id: 'trav_bow' }], ['sp2', -470, -40, { k: 'w', id: 'fire_rod' }], ['sp3', -560, -520, { k: 'w', id: 'triple_bow' }],
      ['sp4', 30, -600, { k: 'w', id: 'falcon_bow' }], ['sp5', 455, 455, { k: 'w', id: 'frost_spear' }], ['sp6', -70, 120, { k: 'm', id: 'ancient_gear', n: 2 }],
      ['sp7', 120, -60, { k: 'm', id: 'ancient_screw', n: 4 }], ['sp8', 600, -350, { k: 'w', id: 'meteor_rod' }], ['sp9', -640, 400, { k: 'a', id: 'bomb', n: 8 }],
      ['sp10', 250, 600, { k: 'w', id: 'golem_hammer' }],
    ];
    for (const [id, x, z, item] of special) this.addChest(id, x, G.Col.spawnY(x, z), z, item, { ry: r.range(0, 6.28) });
    // キャンプの宝箱
    G.World.camps.forEach((c, i) => { const x = c.x - 3, z = c.z + 4; this.addChest('camp' + i, x, G.Terrain.getHeight(x, z), z, this.zoneLoot(c.zone, r), { camp: i }); });
  },
  // ---------- 森の精の実 ----------
  // 高い方へ登って頂上を探す
  climbPeak(x, z) {
    let h = G.Terrain.getHeight(x, z);
    for (let k = 0; k < 40; k++) {
      let bx = x, bz = z, bh = h;
      for (let a = 0; a < 6.28; a += 0.785) { const nx = x + Math.cos(a) * 5, nz = z + Math.sin(a) * 5, nh = G.Terrain.getHeight(nx, nz); if (nh > bh && Math.abs(nx) < 740 && Math.abs(nz) < 740) { bh = nh; bx = nx; bz = nz; } }
      if (bx === x && bz === z) break; x = bx; z = bz; h = bh;
    }
    return { x, z, h };
  },
  genSeeds() {
    const spots = this.findSpots(202, 60, 38, (i) => i.slope > 0.6);
    const r = G.U.rng(303);
    spots.forEach((s, i) => {
      const id = 'k' + i;
      let type = s.peak ? 'leaf' : r() < 0.3 ? 'balloon' : r() < 0.55 ? 'flower' : 'rock';
      let x = s.x, z = s.z;
      if (i % 4 === 0) { const pk = this.climbPeak(x, z); if (Math.hypot(pk.x - x, pk.z - z) < 160 && !this.seeds.some(o => Math.hypot(o.pos.x - pk.x, o.pos.z - pk.z) < 20) && !G.World.villages.some(v => Math.hypot(v.x - pk.x, v.z - pk.z) < v.flat + 10)) { x = pk.x; z = pk.z; type = 'leaf'; } }
      this.addSeed(id, type, x, z, r);
    });
  },
  addSeed(id, type, x, z, r) {
    const h = G.Terrain.getHeight(x, z);
    const s = { id, type, pos: new THREE.Vector3(x, h, z), found: !!G.Prog.data.seeds[id], step: 0 };
    let g;
    if (type === 'rock') {
      g = new THREE.Mesh(G.Models.g('seedrock', () => G.Geo.rock(0.7, 12, 0)), G.Mat.toon(0x8a8a7a)); g.position.set(x, h + 0.2, z);
      const moss = new THREE.Mesh(G.Models.sphG(0.35, 6, 4), G.Mat.toon(0x5a9a3a)); moss.position.y = 0.45; moss.scale.y = 0.4; g.add(moss);
      s.inter = G.Interact.add({ x, y: h, z, r: 2, label: '岩を持ち上げる', cond: () => !s.found, action: () => { G.player.setState('interact'); setTimeout(() => G.player.state === 'interact' && G.player.setState('ground'), 500); g.position.y += 1.5; setTimeout(() => { g.visible = false; }, 400); this.foundSeed(s); } });
    } else if (type === 'leaf') {
      g = new THREE.Mesh(G.Models.g('leafG', () => { const c = new THREE.ConeGeometry(0.25, 0.7, 4); c.rotateX(Math.PI / 2); return c; }), G.Mat.glow(0xb8ff6a)); g.position.set(x, h + 1, z);
    } else if (type === 'balloon') {
      const by = h + 6 + r() * 6;
      g = new THREE.Group(); g.position.set(x, by, z);
      const b = new THREE.Mesh(G.Models.sphG(0.45, 10, 8), G.Mat.toon(0xff5a7a)); g.add(b);
      const leaf = new THREE.Mesh(G.Models.coneG(0.2, 0.4, 4), G.Mat.toon(0x5aa83c)); leaf.position.y = -0.55; leaf.rotation.x = Math.PI; g.add(leaf);
      s.pos.y = by;
      s.target = G.Targets.add({ pos: s.pos, r: 0.6, onHit: () => { if (s.found) return false; g.visible = false; G.Particles.burst(s.pos, 0xff5a7a, 16, 4); this.foundSeed(s); G.Targets.remove(s.target); return true; }, onMelee: () => { if (!s.found) { g.visible = false; this.foundSeed(s); G.Targets.remove(s.target); } } });
    } else {
      g = new THREE.Group(); g.position.set(x, h, z);
      const st = new THREE.Mesh(G.Models.cylG(0.03, 0.03, 0.7, 4), G.Mat.toon(0x4a8a3a)); st.position.y = 0.35; g.add(st);
      const fl = new THREE.Mesh(G.Models.sphG(0.2, 8, 6), G.Mat.glow(0xffee55)); fl.position.y = 0.75; g.add(fl);
      s.home = new THREE.Vector3(x, h, z);
    }
    g.visible = !s.found; if (g.isMesh) g.castShadow = true;
    this.scene.add(g); s.mesh = g; this.seeds.push(s);
  },
  foundSeed(s) {
    if (s.found) return;
    s.found = true; G.Prog.data.seeds[s.id] = true;
    G.Audio.play('seed');
    const p = s.pos.clone(); p.y += 1;
    G.Particles.burst(p, 0xb8ff6a, 20, 3);
    // 森の精がぴょこっと出る
    const sp = new THREE.Group(); sp.position.copy(p);
    sp.add(new THREE.Mesh(G.Models.sphG(0.3, 8, 6), G.Mat.toon(0x8a6a3a)));
    const lf = new THREE.Mesh(G.Models.coneG(0.25, 0.5, 4), G.Mat.toon(0x5aa83c)); lf.position.y = 0.4; sp.add(lf);
    const face = new THREE.Mesh(G.Models.boxG(0.3, 0.2, 0.05), G.Mat.toon(0xe8d8a8)); face.position.z = 0.27; sp.add(face);
    this.scene.add(sp); let t = 0; const iv = setInterval(() => { t += 0.05; sp.position.y = p.y + Math.sin(t * 3) * 0.3; sp.rotation.y += 0.2; if (t > 2) { clearInterval(iv); this.scene.remove(sp); G.Particles.poof(sp.position, 0xb8ff6a); } }, 30);
    G.Hud.itemGet('森の精の実', null, 'ヤッホー！ 見つかっちゃった！');
    G.Prog.addXP(15); G.Quests.update(); G.Prog.save();
  },
  updateSeeds(dt) {
    const pl = G.player; if (!pl) return;
    for (const s of this.seeds) {
      if (s.found) continue;
      const d = Math.hypot(pl.pos.x - s.pos.x, pl.pos.z - s.pos.z);
      if (d > 80) continue;
      if (s.type === 'leaf') { s.mesh.rotation.y += dt * 2; s.mesh.position.y = s.pos.y + 1 + Math.sin(performance.now() / 500) * 0.15; if (Math.random() < 0.1) G.Particles.sparkle(s.mesh.position, 0xb8ff6a); if (d < 1.6 && Math.abs(pl.pos.y - s.pos.y) < 2.5) { s.mesh.visible = false; this.foundSeed(s); } }
      else if (s.type === 'balloon') { s.mesh.position.y = s.pos.y + Math.sin(performance.now() / 700 + s.pos.x) * 0.3; }
      else if (s.type === 'flower') {
        if (Math.random() < 0.05) G.Particles.sparkle(s.mesh.position.clone().setY(s.mesh.position.y + 0.8), 0xffee55);
        if (d < 1.5 && Math.abs(pl.pos.y - s.mesh.position.y) < 2) {
          s.step++; G.Audio.play('beep', { pitch: 1 + s.step * 0.15 });
          if (s.step >= 5) { s.mesh.visible = false; s.pos.copy(s.mesh.position); this.foundSeed(s); }
          else { const a = Math.random() * 6.28; let x = s.mesh.position.x + Math.cos(a) * 9, z = s.mesh.position.z + Math.sin(a) * 9; if (G.Water.depthAt(x, z) > 0 || Math.hypot(x - s.home.x, z - s.home.z) > 25) { x = s.home.x; z = s.home.z; } s.mesh.position.set(x, G.Terrain.getHeight(x, z), z); G.Particles.burst(s.mesh.position, 0xffee55, 8, 2); }
        }
      }
    }
  },
  // ---------- 採取物 ----------
  genHarvest() {
    const r = G.U.rng(909);
    const types = {};
    const add = (id, x, z) => { const h = G.Terrain.getHeight(x, z); if (h < 0.8) return; (types[id] = types[id] || []).push({ id, x, z, y: h }); };
    for (let k = 0; k < 900; k++) {
      const x = r.range(-750, 750), z = r.range(-750, 750); const h = G.Terrain.getHeight(x, z);
      if (h < 1.2 || G.Terrain.getNormal(x, z, G.tmp.v1).y < 0.75) continue;
      const m = G.Terrain.masks(x, z); const rr = r();
      let id;
      if (m.dV < 240) id = rr < 0.6 ? 'fireweed' : 'chill';
      else if (m.snow > 0.5 && h > 45) id = rr < 0.5 ? 'spicy' : rr < 0.85 ? 'tough' : 'shroom';
      else if (m.canyon > 0.5) id = rr < 0.45 ? 'chill' : rr < 0.8 ? 'swift' : 'herb';
      else if (m.forest > 0.5) id = rr < 0.4 ? 'shroom' : rr < 0.65 ? 'mighty' : rr < 0.85 ? 'herb' : 'honey';
      else if (m.lake > 0.5) id = rr < 0.4 ? 'mpflower' : rr < 0.7 ? 'herb' : 'berry';
      else if (m.plains > 0.5) id = rr < 0.4 ? 'swift' : rr < 0.7 ? 'berry' : 'herb';
      else id = rr < 0.3 ? 'herb' : rr < 0.55 ? 'shroom' : rr < 0.75 ? 'berry' : rr < 0.9 ? 'mighty' : 'honey';
      add(id, x, z);
    }
    for (const t of G.Veg.appleTrees) for (let k = 0; k < 2; k++) add('apple', t.x + Math.cos(k * 3) * 1.3, t.z + Math.sin(k * 3) * 1.3);
    const geos = {
      fruit: G.Models.sphG(0.16, 8, 6), mush: G.Models.g('mushG', () => G.Geo.merge([{ geo: new THREE.CylinderGeometry(0.05, 0.06, 0.18, 6), matrix: G.Geo.mtx(0, 0.09, 0), color: 0xf4ead8 }, { geo: new THREE.SphereGeometry(0.16, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), matrix: G.Geo.mtx(0, 0.17, 0), color: 0xffffff }], true)),
      herb: G.Models.g('herbG', () => G.Geo.merge([0, 1, 2, 3].map(i => ({ geo: new THREE.ConeGeometry(0.06, 0.4, 3), matrix: G.Geo.mtx(Math.cos(i * 1.6) * 0.08, 0.18, Math.sin(i * 1.6) * 0.08, Math.cos(i) * 0.3, 0, Math.sin(i) * 0.3), color: 0xffffff })), true)),
      honey: G.Models.g('honeyG', () => G.Geo.merge([{ geo: new THREE.SphereGeometry(0.25, 8, 6), matrix: G.Geo.mtx(0, 0.25, 0, 0, 0, 0, 1, 1.3, 1), color: 0xffffff }], true)),
    };
    const shape = { apple: 'fruit', berry: 'fruit', spicy: 'fruit', chill: 'fruit', shroom: 'mush', mighty: 'mush', tough: 'mush', herb: 'herb', swift: 'herb', fireweed: 'herb', mpflower: 'herb', honey: 'honey' };
    for (const id in types) {
      const list = types[id], sh = shape[id];
      const mat = new THREE.MeshToonMaterial({ color: this.matColor(id), gradientMap: G.Mat.grad3, vertexColors: sh !== 'fruit' });
      const im = new THREE.InstancedMesh(geos[sh], mat, list.length);
      list.forEach((it, i) => {
        it.im = im; it.idx = i; it.t = 0;
        this.setInst(it, true);
        it.inter = G.Interact.add({ x: it.x, y: it.y, z: it.z, r: 1.7, label: G.Items.mats[id].name + 'を採る', cond: () => !it.picked, action: () => this.pickHarvest(it) });
        this.harvest.push(it);
      });
      im.instanceMatrix.needsUpdate = true; this.scene.add(im);
    }
  },
  setInst(it, show) {
    const m = G.tmp.m1; m.compose(G.tmp.v1.set(it.x, it.y, it.z), G.tmp.q1.setFromAxisAngle(G.tmp.v2.set(0, 1, 0), it.x), G.tmp.v3.setScalar(show ? 1 : 0));
    it.im.setMatrixAt(it.idx, m); it.im.instanceMatrix.needsUpdate = true;
  },
  pickHarvest(it) {
    it.picked = true; it.t = 600; this.setInst(it, false);
    G.Prog.addMat(it.id, 1); G.Audio.play('pickup'); G.Hud.notify(G.Items.mats[it.id].name + 'を手に入れた');
  },
  updateHarvest(dt) {
    this._ht = (this._ht || 0) - dt; if (this._ht > 0) return; this._ht = 2;
    for (const it of this.harvest) if (it.picked) { it.t -= 2; if (it.t <= 0) { it.picked = false; this.setInst(it, true); } }
  },
  // ---------- 鉱石 ----------
  genOres() {
    const r = G.U.rng(1111);
    const g = G.Models.g('oreG', () => G.Geo.merge([{ geo: G.Geo.rock(1, 21, 0), color: 0x7a7068 }, ...[0, 1, 2, 3, 4].map(i => ({ geo: new THREE.OctahedronGeometry(0.22, 0), matrix: G.Geo.mtx(Math.cos(i * 1.3) * 0.75, 0.2 + (i % 2) * 0.35, Math.sin(i * 1.3) * 0.75), color: 0xffd060 }))], true));
    const list = [];
    for (let k = 0; k < 700 && list.length < 90; k++) {
      const x = r.range(-750, 750), z = r.range(-750, 750), h = G.Terrain.getHeight(x, z);
      if (h < 2) continue; const m = G.Terrain.masks(x, z);
      const p = m.canyon * 0.6 + m.snow * 0.4 + (m.dV < 260 ? 0.5 : 0) + G.U.smooth(0.85, 0.65, G.Terrain.getNormal(x, z, G.tmp.v1).y) * 0.4;
      if (r() > p) continue;
      if (G.World.villages.some(v => Math.hypot(v.x - x, v.z - z) < v.flat + 10)) continue;
      list.push({ x, z, y: h, zone: G.Terrain.regionAt(x, z).zone, hp: 3 });
    }
    const mat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: G.Mat.grad3, vertexColors: true });
    const im = new THREE.InstancedMesh(g, mat, Math.max(1, list.length));
    list.forEach((o, i) => { o.im = im; o.idx = i; this.setInst(o, true); o.pos = new THREE.Vector3(o.x, o.y + 0.5, o.z); this.ores.push(o); o.col = G.Col.addCyl(o.x, o.z, 0.9, o.y - 1, o.y + 0.9, { ore: o }); });
    im.instanceMatrix.needsUpdate = true; im.castShadow = true; this.scene.add(im);
  },
  hitOre(o, power) {
    if (o.broken) return;
    o.hp -= power; G.Particles.spark(o.pos, 0xffd060, 8); G.Audio.play('hitMetal', { pos: o.pos, vol: 0.7 });
    if (o.hp > 0) return;
    o.broken = true; o.t = 900; this.setInst(o, false); if (o.col) o.col.active = false; G.Audio.play('break', { pos: o.pos }); G.Particles.burst(o.pos, 0x9a9088, 20, 5);
    const tables = { 1: ['amber', 'amber', 'opal'], 2: ['amber', 'opal', 'opal', 'topaz'], 3: ['opal', 'topaz', 'ruby', 'sapphire'], 4: ['topaz', 'ruby', 'sapphire', 'diamond'] };
    const t = tables[o.zone] || tables[1];
    const n = 1 + (Math.random() < 0.4 ? 1 : 0) + (G.Prog.skill('lucky') && Math.random() < 0.3 ? 1 : 0);
    for (let k = 0; k < n; k++) this.dropMat(G.U.pick(t), o.pos.clone());
    if (Math.random() < 0.15) this.dropMat('diamond', o.pos.clone());
    G.Prog.addXP(5);
  },
  updateOres(dt) {
    this._ot = (this._ot || 0) - dt; if (this._ot > 0) return; this._ot = 3;
    for (const o of this.ores) if (o.broken) { o.t -= 3; if (o.t <= 0) { o.broken = false; o.hp = 3; this.setInst(o, true); if (o.col) o.col.active = true; } }
  },
  // 近接攻撃で鉱石・的などを叩く
  meleeHit(pos, f, range, attack) {
    const hitSet = attack.hit || (attack.hit = new Set());
    const def = G.Prog.equippedDef('melee');
    for (const o of this.ores) {
      if (o.broken || hitSet.has(o)) continue;
      const dx = o.x - pos.x, dz = o.z - pos.z, d = Math.hypot(dx, dz);
      if (d > range + 0.9 || Math.abs(o.y - pos.y) > 2.5) continue;
      if (d > 0.5 && (dx * f.x + dz * f.z) / d < 0.3) continue;
      hitSet.add(o);
      this.hitOre(o, def && (def.mk === 'hammer' || def.type === 'heavy') ? 3 : 1);
      if (def) G.Prog.useDurability('melee', 1);
    }
    for (const t of G.Targets.list) {
      if (!t.onMelee || hitSet.has(t) || t.active === false) continue;
      const dx = t.pos.x - pos.x, dz = t.pos.z - pos.z, d = Math.hypot(dx, dz);
      if (d > range + (t.r || 0.5) || t.pos.y < pos.y - 1 || t.pos.y > pos.y + 3) continue;
      if (d > 0.5 && (dx * f.x + dz * f.z) / d < 0.2) continue;
      hitSet.add(t);
      const dmg = def ? def.atk * G.Prog.atkMul() : 1;
      t.onMelee(dmg, f, def && def.elem);
    }
  },
  updateCulling(px, pz) {
    const near = (p, r) => Math.abs(p.x - px) + Math.abs(p.z - pz) < r;
    for (const c of this.chests) c.mesh.visible = (!c.hidden || c.revealed) && (c.interior ? c.interior === G.Shrine.insideId : near(c.pos, 170));
    for (const s of this.seeds) if (!s.found) s.mesh.visible = near(s.pos, 150);
  },
  update(dt) {
    this.updateDrops(dt); this.updateSeeds(dt); this.updateHarvest(dt); this.updateOres(dt);
    // 宝箱の光
    const pl = G.player; if (!pl) return;
    for (const c of this.chests) if (!c.open && c.mesh.visible && Math.abs(c.pos.x - pl.pos.x) + Math.abs(c.pos.z - pl.pos.z) < 40 && Math.random() < 0.04) G.Particles.sparkle(c.pos.clone().setY(c.pos.y + 1), 0xffe9a0);
  },
};
