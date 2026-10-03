// ===== 動物（シカ・イノシシ・鳥・魚・チョウ・ホタル） =====
'use strict';
G.Animals = {
  list: [], birds: [], spawnT: 0,
  init(scene) {
    this.scene = scene;
    this.birdGeo = G.Geo.merge([{ geo: new THREE.SphereGeometry(0.12, 6, 4), color: 0xffffff }, { geo: new THREE.ConeGeometry(0.04, 0.1, 4), matrix: G.Geo.mtx(0, 0, 0.14, Math.PI / 2), color: 0xffaa33 }], true);
    this.bfGeo = new THREE.PlaneGeometry(0.22, 0.16);
    this.butterflies = [];
    const bcol = [0xffe14a, 0xffffff, 0x7ab8ff, 0xff8ac8];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(this.bfGeo, new THREE.MeshBasicMaterial({ color: bcol[i % 4], side: THREE.DoubleSide }));
      m.visible = false; scene.add(m); this.butterflies.push({ m, ph: Math.random() * 6, c: new THREE.Vector3() });
    }
  },
  spawnAround(p) {
    if (G.Shrine.inside) return;
    const animals = this.list.filter(a => a.kind !== 'fish').length;
    if (animals < 10) {
      const a = Math.random() * 6.28, d = 60 + Math.random() * 60, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      const h = G.Terrain.getHeight(x, z);
      if (h > 2 && G.Terrain.inBounds(x, z) && G.Terrain.getNormal(x, z, G.tmp.v1).y > 0.8) {
        const m = G.Terrain.masks(x, z);
        if (m.dV > 220 && G.Terrain.densityAt(x, z) > 0.3 && !G.World.villages.some(v => Math.hypot(v.x - x, v.z - z) < v.flat + 15)) {
          const kind = m.forest > 0.4 ? (Math.random() < 0.5 ? 'boar' : 'deer') : Math.random() < 0.7 ? 'deer' : 'boar';
          const n = kind === 'deer' ? 1 + Math.floor(Math.random() * 3) : 1;
          for (let k = 0; k < n; k++) this.add(kind, x + k * 2, z + k * 1.5);
        }
      }
    }
    // 魚
    const fish = this.list.filter(a => a.kind === 'fish').length;
    if (fish < 8) {
      const a = Math.random() * 6.28, d = 15 + Math.random() * 40, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      const dep = G.Water.depthAt(x, z); if (dep > 0.6 && dep < 6) this.add('fish', x, z);
    }
    // 鳥
    if (this.birds.length < 3 && !G.Sky.isNight()) {
      const a = Math.random() * 6.28, d = 35 + Math.random() * 30, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (G.Terrain.getHeight(x, z) > 2 && G.Terrain.densityAt(x, z) > 0.4) this.addFlock(x, z);
    }
  },
  add(kind, x, z) {
    let rig;
    if (kind === 'deer') rig = G.Models.deer(); else if (kind === 'boar') rig = G.Models.boar();
    else { const m = new THREE.Mesh(G.Models.g('fishG', () => G.Geo.merge([{ geo: new THREE.SphereGeometry(0.25, 6, 4), matrix: G.Geo.mtx(0, 0, 0, 0, 0, 0, 0.6, 0.5, 1.4), color: 0xffffff }, { geo: new THREE.ConeGeometry(0.15, 0.25, 4), matrix: G.Geo.mtx(0, 0, -0.4, -Math.PI / 2), color: 0xffffff }], true)), new THREE.MeshToonMaterial({ color: 0x5a7a8a, gradientMap: G.Mat.grad3, vertexColors: true })); rig = { root: m }; }
    const a = { kind, rig, pos: new THREE.Vector3(x, G.Terrain.getHeight(x, z), z), vel: new THREE.Vector3(), rotY: Math.random() * 6.28, hp: kind === 'boar' ? 12 : kind === 'deer' ? 8 : 1, state: 'idle', t: Math.random() * 4, anim: { st: 'idle', t: 0 }, alive: true };
    if (kind === 'fish') a.pos.y = G.WATER_Y - 0.5;
    this.scene.add(rig.root);
    a.target = G.Targets.add({ pos: a.pos, r: kind === 'fish' ? 0.4 : 0.8, animal: a, onHit: (p) => { this.hit(a, p.dmg || 5, p.vel); return true; }, onMelee: (dmg, dir) => this.hit(a, dmg, dir) });
    if (kind === 'fish') a.inter = G.Interact.add({ x, y: G.WATER_Y, z, r: 1.6, dy: 3, label: '魚をつかまえる', action: () => { if (a.alive) { G.Prog.addMat(Math.random() < 0.25 ? 'big_fish' : 'fish'); G.Hud.itemGet(G.Items.mats.fish.name); G.Audio.play('splash'); this.kill(a, true); } } });
    this.list.push(a); return a;
  },
  addFlock(x, z) {
    const flock = { x, z, birds: [], fly: 0, t: 0 };
    const cols = [0x8a6a4a, 0xd8d8e0, 0x4a6a9a, 0xe8c040];
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(this.birdGeo, G.Mat.toon(cols[k % 4], { vertexColors: true }));
      const bx = x + (Math.random() - 0.5) * 4, bz = z + (Math.random() - 0.5) * 4;
      m.position.set(bx, G.Terrain.getHeight(bx, bz) + 0.1, bz); m.rotation.y = Math.random() * 6.28;
      this.scene.add(m); flock.birds.push({ m, v: new THREE.Vector3(), hop: Math.random() * 3 });
    }
    this.birds.push(flock);
  },
  hit(a, dmg, dir) {
    if (!a.alive) return;
    a.hp -= dmg; G.Particles.hit(a.pos.clone().setY(a.pos.y + 0.8));
    if (a.hp <= 0) { this.kill(a); return; }
    a.state = 'flee'; a.t = 6;
    if (a.kind === 'boar' && Math.random() < 0.5) a.state = 'charge';
  },
  kill(a, silent) {
    a.alive = false; G.Targets.remove(a.target); if (a.inter) G.Interact.remove(a.inter);
    if (!silent) {
      G.Particles.poof(a.pos.clone().setY(a.pos.y + 0.6), 0xaaaaaa);
      if (a.kind === 'deer') G.Pickups.dropMat(Math.random() < 0.3 ? 'prime_meat' : 'meat', a.pos.clone().setY(a.pos.y + 0.5));
      if (a.kind === 'boar') { G.Pickups.dropMat('meat', a.pos.clone().setY(a.pos.y + 0.5)); if (Math.random() < 0.4) G.Pickups.dropMat('prime_meat', a.pos.clone().setY(a.pos.y + 0.5)); }
      G.Prog.addXP(2);
    }
    this.scene.remove(a.rig.root);
    const i = this.list.indexOf(a); if (i >= 0) this.list.splice(i, 1);
  },
  update(dt) {
    const pl = G.player; if (!pl) return;
    const p = pl.pos;
    this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = 2; this.spawnAround(p); }
    for (const a of this.list.slice()) {
      const d = a.pos.distanceTo(p);
      if (d > 170 || G.Shrine.inside) { a.alive = false; G.Targets.remove(a.target); if (a.inter) G.Interact.remove(a.inter); this.scene.remove(a.rig.root); this.list.splice(this.list.indexOf(a), 1); continue; }
      a.t -= dt;
      if (a.kind === 'fish') {
        if (a.t <= 0) { a.t = 1 + Math.random() * 3; a.rotY += (Math.random() - 0.5) * 2; }
        if (d < 4 && pl.state !== 'swim') a.rotY = Math.atan2(a.pos.x - p.x, a.pos.z - p.z);
        const nx = a.pos.x + Math.sin(a.rotY) * 1.5 * dt, nz = a.pos.z + Math.cos(a.rotY) * 1.5 * dt;
        if (G.Water.depthAt(nx, nz) > 0.6) { a.pos.x = nx; a.pos.z = nz; } else a.rotY += Math.PI * 0.7;
        a.pos.y = G.WATER_Y - 0.45 + Math.sin(performance.now() / 400 + a.t) * 0.05;
        a.rig.root.position.copy(a.pos); a.rig.root.rotation.y = a.rotY;
        a.inter.x = a.pos.x; a.inter.z = a.pos.z;
        continue;
      }
      let tx = 0, tz = 0;
      const scare = pl.sneaking ? 5 : 13;
      if (a.state === 'idle') {
        if (a.t <= 0) { a.t = 2 + Math.random() * 5; a.walk = Math.random() < 0.5; a.dir = Math.random() * 6.28; }
        if (a.walk) { tx = Math.sin(a.dir) * 1.3; tz = Math.cos(a.dir) * 1.3; }
        if (d < scare) { a.state = 'flee'; a.t = 5; }
      } else if (a.state === 'flee') {
        const dx = a.pos.x - p.x, dz = a.pos.z - p.z, l = Math.hypot(dx, dz) || 1; tx = dx / l * (a.kind === 'deer' ? 11 : 8); tz = dz / l * (a.kind === 'deer' ? 11 : 8);
        if (a.t <= 0 && d > 25) a.state = 'idle';
      } else if (a.state === 'charge') {
        const dx = p.x - a.pos.x, dz = p.z - a.pos.z, l = Math.hypot(dx, dz) || 1; tx = dx / l * 9; tz = dz / l * 9;
        if (d < 1.4 && !a.hitP) { a.hitP = true; pl.takeDamage(3, a.pos, null, { kb: 6 }); a.state = 'flee'; a.t = 4; }
        if (a.t <= 0) { a.state = 'flee'; a.t = 3; }
      }
      a.vel.x = G.U.damp(a.vel.x, tx, 4, dt); a.vel.z = G.U.damp(a.vel.z, tz, 4, dt);
      const nx = a.pos.x + a.vel.x * dt, nz = a.pos.z + a.vel.z * dt;
      if (G.Water.depthAt(nx, nz) < 0.5 && G.Terrain.getNormal(nx, nz, G.tmp.v1).y > 0.7) { a.pos.x = nx; a.pos.z = nz; } else { a.vel.multiplyScalar(-0.5); a.dir = (a.dir || 0) + Math.PI; }
      G.Col.resolve(a.pos, 0.5, 1.2, this._res || (this._res = {}));
      a.pos.y = G.Terrain.getHeight(a.pos.x, a.pos.z);
      const hs = Math.hypot(a.vel.x, a.vel.z); if (hs > 0.3) a.rotY = G.U.dampAngle(a.rotY, Math.atan2(a.vel.x, a.vel.z), 6, dt);
      const st = hs > 5 ? 'run' : hs > 0.5 ? 'walk' : a.walk === false && a.state === 'idle' && a.kind === 'deer' ? 'graze' : 'idle';
      if (a.anim.st !== st) { a.anim.st = st; a.anim.t = 0; } else a.anim.t += dt;
      a.rig.phase += hs * dt * 1.6;
      G.Models.animQuad(a.rig, a.anim, dt);
      a.rig.root.position.copy(a.pos); a.rig.root.rotation.y = a.rotY;
    }
    // 鳥
    for (const f of this.birds.slice()) {
      const d = Math.hypot(f.x - p.x, f.z - p.z);
      if (!f.fly && (d < (pl.sneaking ? 3 : 8) || G.Sky.isNight())) { f.fly = 1; G.Audio.play('chirp', { vol: 1 }); for (const b of f.birds) b.v.set((Math.random() - 0.5) * 6, 5 + Math.random() * 3, (Math.random() - 0.5) * 6); }
      f.t += dt;
      for (const b of f.birds) {
        if (f.fly) { b.v.y += dt * 1.5; b.m.position.addScaledVector(b.v, dt); b.m.rotation.y = Math.atan2(b.v.x, b.v.z); b.m.scale.y = 1 + Math.sin(f.t * 30) * 0.4; }
        else { b.hop -= dt; if (b.hop <= 0) { b.hop = 1 + Math.random() * 3; b.m.rotation.y += (Math.random() - 0.5) * 2; const bx = b.m.position.x + Math.sin(b.m.rotation.y) * 0.3, bz = b.m.position.z + Math.cos(b.m.rotation.y) * 0.3; b.m.position.set(bx, G.Terrain.getHeight(bx, bz) + 0.1, bz); } }
      }
      if ((f.fly && f.t > 8) || d > 160 || G.Shrine.inside) { for (const b of f.birds) this.scene.remove(b.m); this.birds.splice(this.birds.indexOf(f), 1); }
    }
    // チョウ（昼）・ホタル（夜）
    const night = G.Sky.isNight(), grassy = G.Terrain.densityAt(p.x, p.z) > 0.45 && !G.Sky.indoor && G.Weather.rain < 0.3;
    const t = performance.now() / 1000;
    this.butterflies.forEach((b, i) => {
      const show = grassy && !night && i < 10;
      if (show && !b.m.visible) { b.c.set(p.x + (Math.random() - 0.5) * 24, 0, p.z + (Math.random() - 0.5) * 24); }
      b.m.visible = show;
      if (!show) return;
      if (b.c.distanceTo(G.tmp.v1.set(p.x, 0, p.z)) > 20) b.c.set(p.x + (Math.random() - 0.5) * 24, 0, p.z + (Math.random() - 0.5) * 24);
      b.ph += dt;
      const x = b.c.x + Math.sin(b.ph * 0.7 + i) * 2.5, z = b.c.z + Math.cos(b.ph * 0.5 + i * 2) * 2.5;
      b.m.position.set(x, G.Terrain.getHeight(x, z) + 0.8 + Math.sin(b.ph * 3) * 0.3, z);
      b.m.rotation.set(Math.sin(b.ph * 20) * 0.9, b.ph, 0);
    });
    if (night && grassy && Math.random() < dt * 8) {
      const x = p.x + (Math.random() - 0.5) * 30, z = p.z + (Math.random() - 0.5) * 30;
      G.Particles.emit(G.Particles.add, G.tmp.v1.set(x, G.Terrain.getHeight(x, z) + 0.5 + Math.random() * 1.5, z), { color: 0xc8ff6a, count: 1, speed: 0.3, life: 2.5, size: 0.18, vary: 0.05 });
    }
  },
};
