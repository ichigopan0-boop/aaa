// ===== 馬 =====
'use strict';
G.HorseObj = class {
  constructor(scene, color, mane, x, z, wild) {
    this.color = color; this.mane = mane; this.wild = wild;
    this.rig = G.Models.horse(color, mane); this.model = this.rig.root; scene.add(this.model);
    this.pos = new THREE.Vector3(x, G.Terrain.getHeight(x, z), z); this.vel = new THREE.Vector3(); this.rotY = Math.random() * 6.28;
    this.speed = 0; this.spurs = 3; this.spurT = 0; this.gallop = 0; this.ridden = false; this.anim = { st: 'idle', t: 0 }; this.ai = { t: 0 };
    this.home = new THREE.Vector3(x, 0, z); this.taming = null; this.callTarget = null; this.vy = 0;
    if (!wild) this.addSaddle();
    this.inter = G.Interact.add({ x, y: this.pos.y, z, r: 2.6, label: () => this.wild ? '野生の馬に乗る' : '馬に乗る', cond: () => !this.ridden && G.player && G.player.state === 'ground', action: () => G.Horse.mount(this) });
  }
  addSaddle() { if (this.saddle) return; const s = G.Models.m(G.Models.boxG(0.66, 0.15, 0.7), 0x6b3a20); s.position.y = 0.05; this.rig.saddle.add(s); this.saddle = s; }
  saddleWorld() { return this.rig.saddle.getWorldPosition(new THREE.Vector3()).add(G.tmp.v1.set(0, -0.15, 0)); }
  maxSpurs() { return 3 + (G.Prog.skill('horse') ? 2 : 0); }
  update(dt) {
    const pl = G.player;
    if (this.ridden && pl) this.updateRidden(dt);
    else if (this.callTarget) this.updateCalled(dt);
    else this.updateIdle(dt);
    // 物理
    const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    const n = G.Terrain.getNormal(nx, nz, G.tmp.v1);
    const steep = n.y < 0.72 && G.Terrain.getHeight(nx, nz) > this.pos.y;
    const deep = G.Water.depthAt(nx, nz) > 1.4;
    if (steep || deep) { this.vel.x *= -0.2; this.vel.z *= -0.2; this.speed *= 0.3; }
    else { this.pos.x = nx; this.pos.z = nz; }
    const res = G.Col.resolve(this.pos, 0.7, 2, this._res || (this._res = {}));
    if (res.hit && this.speed > 8) this.speed *= 0.6;
    const floor = G.Col.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.6, 0.5);
    this.vy -= 25 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= floor) { this.pos.y = floor; this.vy = 0; }
    if (Math.abs(this.pos.x) > 765) this.pos.x = Math.sign(this.pos.x) * 765; if (Math.abs(this.pos.z) > 765) this.pos.z = Math.sign(this.pos.z) * 765;
    // スパー回復
    if (this.spurs < this.maxSpurs()) { this.spurT += dt; if (this.spurT > 4) { this.spurT = 0; this.spurs++; } }
    this.gallop = Math.max(0, this.gallop - dt);
    // 見た目
    this.model.position.copy(this.pos); this.model.rotation.y = this.rotY;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const st = this.taming ? 'rear' : this.vy > 1 ? 'jump' : hs > 7 ? 'run' : hs > 0.6 ? 'walk' : this.ai.graze ? 'graze' : 'idle';
    if (this.anim.st !== st) { this.anim.st = st; this.anim.t = 0; } else this.anim.t += dt;
    this.rig.phase += hs * dt * (st === 'run' ? 0.9 : 1.6);
    G.Models.animQuad(this.rig, this.anim, dt);
    this.inter.x = this.pos.x; this.inter.y = this.pos.y; this.inter.z = this.pos.z;
    const camD = G.camera.position.distanceTo(this.pos); this.model.visible = camD < 220 && !G.Shrine.inside;
    if (st === 'run' && Math.random() < 0.15) G.Particles.dust(this.pos);
    if (st === 'run') { this._gt = (this._gt || 0) + dt; if (this._gt > 0.32) { this._gt = 0; if (this.ridden) G.Audio.play('gallop', { vol: 0.7 }); } }
  }
  updateIdle(dt) {
    const pl = G.player, a = this.ai;
    a.t -= dt;
    if (a.t <= 0) { a.t = 3 + Math.random() * 6; a.graze = Math.random() < 0.5; a.dir = Math.random() * 6.28; a.walk = !a.graze && Math.random() < 0.6; }
    let tx = 0, tz = 0;
    if (a.walk) { tx = Math.sin(a.dir) * 1.6; tz = Math.cos(a.dir) * 1.6; if (this.wild && this.pos.distanceTo(this.home) > 30) { const dx = this.home.x - this.pos.x, dz = this.home.z - this.pos.z, l = Math.hypot(dx, dz); tx = dx / l * 2; tz = dz / l * 2; } }
    // 野生の馬は人が近づくと逃げる
    if (this.wild && pl && !pl.sneaking) { const d = pl.pos.distanceTo(this.pos); if (d < 9 && d > 0.1) { const dx = this.pos.x - pl.pos.x, dz = this.pos.z - pl.pos.z; tx = dx / d * 9; tz = dz / d * 9; a.graze = false; } }
    this.vel.x = G.U.damp(this.vel.x, tx, 3, dt); this.vel.z = G.U.damp(this.vel.z, tz, 3, dt);
    const hs = Math.hypot(this.vel.x, this.vel.z); if (hs > 0.3) this.rotY = G.U.dampAngle(this.rotY, Math.atan2(this.vel.x, this.vel.z), 4, dt);
  }
  updateCalled(dt) {
    const t = this.callTarget, d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
    if (d < 4) { this.callTarget = null; this.vel.set(0, 0, 0); return; }
    const sp = Math.min(12, d); this.vel.x = (t.x - this.pos.x) / d * sp; this.vel.z = (t.z - this.pos.z) / d * sp;
    this.rotY = G.U.dampAngle(this.rotY, Math.atan2(this.vel.x, this.vel.z), 5, dt);
    t.x = G.player.pos.x; t.z = G.player.pos.z;
  }
  updateRidden(dt) {
    const pl = G.player, I = G.Input;
    if (this.taming) {
      const tm = this.taming; tm.t += dt;
      this.vel.x = Math.sin(tm.t * 9) * 2; this.vel.z = Math.cos(tm.t * 7) * 2;
      if (I.pressed('interact')) { if (pl.stamina >= 6) { pl.useStamina(9); tm.calm++; G.Audio.play('select'); G.Particles.heal(this.pos.clone().setY(this.pos.y + 2)); } }
      if (tm.calm >= 6) { this.taming = null; this.wild = false; this.addSaddle(); G.Horse.setMine(this); G.Hud.centerMsg('野生の馬をなだめた！\n相棒になった', 2.5); G.Audio.play('itemGet'); G.Audio.play('neigh'); G.Quests.onHorse(); }
      else if (pl.stamina <= 0 || tm.t > 10) { this.taming = null; G.Horse.dismount(true); pl.vel.set(Math.sin(this.rotY) * -5, 5, Math.cos(this.rotY) * -5); pl.setState('air'); G.Hud.notify('振り落とされた！ がんばりを増やすか、しゃがんで近づこう'); G.Audio.play('neigh'); }
      return;
    }
    const w = pl.wish;
    if (I.pressed('dash') && this.spurs > 0 && w.len > 0.2) { this.spurs--; this.gallop = 2.2; G.Audio.play('neigh', { vol: 0.5 }); }
    let want = w.len < 0.05 ? 0 : w.len < 0.55 ? 4 : 10;
    if (this.gallop > 0 && w.len > 0.2) want = 17;
    want *= 1 + (G.Prog.skill('horse') ? 0.15 : 0);
    this.speed = G.U.damp(this.speed, want, want > this.speed ? 2 : 4, dt);
    if (w.len > 0.1) this.rotY = G.U.dampAngle(this.rotY, Math.atan2(w.x, w.z), this.speed > 12 ? 2.2 : 3.5, dt);
    this.vel.x = Math.sin(this.rotY) * this.speed; this.vel.z = Math.cos(this.rotY) * this.speed;
  }
  jump() { if (this.vy === 0 && !this.taming) { this.vy = 7; G.Audio.play('jump'); } }
  dispose() { G.Interact.remove(this.inter); this.model.parent && this.model.parent.remove(this.model); }
};

G.Horse = {
  mine: null, wild: [], riding: null,
  init(scene) {
    this.scene = scene;
    const r = G.U.rng(555);
    const cols = [[0x8a5a3a, 0x2a1a10], [0xeeeeee, 0xcccccc], [0x3a2a20, 0x1a1008], [0xc89a5a, 0xf0e0c0], [0x6a6a6a, 0x222222], [0xa86e46, 0xe8d8b0]];
    for (const [hx, hz] of G.World.horseHerds) for (let k = 0; k < 3; k++) {
      const c = r.pick(cols); const h = new G.HorseObj(scene, c[0], c[1], hx + r.range(-10, 10), hz + r.range(-10, 10), true);
      h.home.set(hx, 0, hz); this.wild.push(h);
    }
    const d = G.Prog.data.horse;
    if (d && d.color != null) { const h = new G.HorseObj(scene, d.color, d.mane, d.x || 0, d.z || 460, false); this.mine = h; }
  },
  setMine(h) {
    if (this.mine && this.mine !== h) { const old = this.mine; old.wild = true; old.home.copy(old.pos); if (old.saddle) { old.rig.saddle.remove(old.saddle); old.saddle = null; } this.wild.push(old); }
    const i = this.wild.indexOf(h); if (i >= 0) this.wild.splice(i, 1);
    this.mine = h; G.Prog.data.horse = this.saveData(); G.Prog.save();
  },
  saveData() { const h = this.mine; return h ? { color: h.color, mane: h.mane, x: +h.pos.x.toFixed(1), z: +h.pos.z.toFixed(1) } : null; },
  mount(h) {
    const pl = G.player; if (!pl || pl.riding) return;
    h.ridden = true; this.riding = h; pl.riding = true; pl.setState('ride'); pl.attack = null; pl.lockTarget = null;
    h.callTarget = null; h.speed = 0;
    if (h.wild) { h.taming = { t: 0, calm: pl.sneaking ? 2 : 0 }; G.Hud.centerMsg('暴れている！\nFを連打してなだめろ', 2); G.Audio.play('neigh'); }
    else G.Audio.play('neigh', { vol: 0.4 });
  },
  dismount(force) {
    const pl = G.player, h = this.riding; if (!h) return;
    h.ridden = false; h.taming = null; h.speed = 0; h.vel.set(0, 0, 0); this.riding = null; pl.riding = false;
    if (pl.state === 'ride') { pl.setState('ground'); pl.pos.x += Math.cos(h.rotY) * 1.2; pl.pos.z -= Math.sin(h.rotY) * 1.2; pl.pos.y = G.Col.floorAt(pl.pos.x, pl.pos.z, pl.pos.y + 2) + 0.05; }
  },
  call() {
    const pl = G.player; if (!pl) return;
    G.Audio.play('whistle');
    if (!this.mine) { G.Hud.notify('相棒の馬がいない（平原で野生の馬を捕まえよう）'); return; }
    if (G.Shrine.inside) return;
    const h = this.mine; const d = h.pos.distanceTo(pl.pos);
    if (d > 140) {
      const a = G.Cam.yaw; let x = pl.pos.x + Math.sin(a) * 18, z = pl.pos.z + Math.cos(a) * 18;
      if (G.Water.depthAt(x, z) > 1 || G.Terrain.getNormal(x, z, G.tmp.v1).y < 0.75) { x = pl.pos.x + 3; z = pl.pos.z + 3; }
      h.pos.set(x, G.Terrain.getHeight(x, z), z);
    }
    h.callTarget = { x: pl.pos.x, z: pl.pos.z };
    G.Hud.notify('相棒を呼んだ');
    setTimeout(() => G.Audio.play('neigh', { vol: 0.5 }), 600);
  },
  jump() { if (this.riding) this.riding.jump(); },
  update(dt) {
    if (G.Input.pressed('interact') && this.riding && !this.riding.taming && G.state === 'playing' && !G.UI.anyOpen()) { G.Input.consume('interact'); this.dismount(); }
    if (this.mine) this.mine.update(dt);
    const p = G.player ? G.player.pos : null;
    for (const h of this.wild) { if (p && Math.abs(h.pos.x - p.x) + Math.abs(h.pos.z - p.z) > 260) { h.model.visible = false; continue; } h.update(dt); }
  },
};
