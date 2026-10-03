// ===== ボス（各地の主・ラスボス） =====
'use strict';
G.BossTypes = {
  hinox: { name: 'ひとつ目巨人 ギガロス', hp: 750, atk: 16, spd: 3.2, xp: 1500, radius: 2.2, height: 7.5, sight: 26, money: [180, 240], drops: [['giant_eye', 1]], bossDrops: [{ k: 'w', id: 'giant_axe' }] },
  talus_ice: { name: '氷岩の巨人 フロストロック', hp: 1100, atk: 20, spd: 2.4, xp: 2000, radius: 2.8, height: 6.5, sight: 30, elem: 'ice', money: [250, 320], drops: [['talus_heart', 1], ['sapphire', 0.8], ['diamond', 0.25]], bossDrops: [{ k: 'w', id: 'frost_spear' }] },
  talus_fire: { name: '溶岩の巨人 イグニスロック', hp: 1300, atk: 22, spd: 2.4, xp: 2400, radius: 2.8, height: 6.5, sight: 30, elem: 'fire', money: [280, 360], drops: [['talus_heart', 1], ['ruby', 0.9], ['diamond', 0.3]], bossDrops: [{ k: 'w', id: 'flame_claymore' }] },
  lizal_king: { name: '沼の主 リザルドキング', hp: 1200, atk: 18, spd: 6.0, xp: 1900, radius: 1.3, height: 4.0, sight: 30, elem: 'elec', money: [220, 300], drops: [['lizal_crown', 1], ['opal', 0.8]], bossDrops: [{ k: 'w', id: 'thunder_sword' }, { k: 'a', id: 'elec', n: 10 }] },
  lynel: { name: '獣王 ライガ', hp: 3200, atk: 28, spd: 7.5, xp: 4200, radius: 1.6, height: 3.8, sight: 34, def: 4, money: [450, 600], drops: [['lynel_horn', 1], ['topaz', 0.8], ['diamond', 0.5]], bossDrops: [{ k: 'w', id: 'savage_sword' }, { k: 'w', id: 'savage_bow' }, { k: 'a', id: 'bomb', n: 10 }] },
  omega: { name: '暴走機神 オメガ', hp: 9500, atk: 30, spd: 2.6, xp: 15000, radius: 4.2, height: 17, sight: 60, def: 6, money: [2000, 2000], drops: [['ancient_core', 1], ['diamond', 1]], bossDrops: [] },
};

G.Boss = class extends G.Enemy {
  constructor(id, kind, x, z, worldId) {
    super(id, 'goblin_red', x, z, {});
    const B = G.BossTypes[kind];
    this.kind = kind; this.bossId = worldId; this.boss = true; this.ancient = kind === 'omega';
    this.def = Object.assign({}, B, { boss: true });
    this.hp = this.maxHp = B.hp; this.baseHp = B.hp; this.radius = B.radius; this.height = B.height; this.elem = B.elem || null; this.armor = B.def || 0;
    this.weaponId = null; this.bossDrops = B.bossDrops; this.name = B.name;
    this.state = kind === 'hinox' ? 'sleep' : 'idle';
    this.phase = 1; this.cooled = 0; this.engaged = false; this.visibleRange = 400;
    this.collider = G.Col.addCyl(x, z, B.radius * 0.8, -1000, 1000, { dynamic: true, noFloor: true, boss: true });
  }
  buildModel(scene) {
    const k = this.kind; let rig;
    if (k === 'hinox') rig = G.Models.hinox();
    else if (k === 'talus_ice') rig = G.Models.talus('ice');
    else if (k === 'talus_fire') rig = G.Models.talus('fire');
    else if (k === 'lizal_king') { rig = G.Models.lizal('king'); this.wmesh = G.Models.weapon('lizal_trident'); rig.handR.add(this.wmesh); }
    else if (k === 'lynel') { rig = G.Models.lynel(); const w = G.Models.weapon('savage_sword'); rig.upper.handR.add(w); }
    else if (k === 'omega') rig = G.Models.omega();
    this.rig = rig; this.model = rig.root; this.anim = { st: 'idle', t: 0 };
    scene.add(this.model); this.model.visible = false;
    this.mats = []; this.model.traverse(o => { if (o.isMesh && o.material && o.material.isMeshToonMaterial) this.mats.push(o); });
    if (k === 'omega') { this.home.y = 40; this.pos.y = 40; }
  }
  attackTable() {
    const k = this.kind, f = this.phase >= 3 ? 0.75 : 1;
    if (k === 'hinox') return {
      stomp: { windup: 1.0, active: 0.2, recover: 1.0, aoe: 5.5, fwd: 3, mul: 1.2 }, swipe: { windup: 0.9, active: 0.3, recover: 0.9, range: 7, arc: 2.6, mul: 1 },
      kick: { windup: 0.6, active: 0.2, recover: 0.8, range: 5, arc: 1.2, mul: 0.8, kb: 12 },
    };
    if (k === 'talus_ice' || k === 'talus_fire') return {
      slam: { windup: 1.2, active: 0.25, recover: 1.2, aoe: 5, fwd: 3.5, mul: 1.2 }, throw: { windup: 1.3, active: 0.1, recover: 1.0, proj: 'rock' },
      roll: { windup: 0.8, active: 2.0, recover: 1.0, range: 3.5, arc: 6.3, mul: 1, multi: true, rush: 13 },
    };
    if (k === 'lizal_king') return {
      combo: { windup: 0.5, active: 0.9, recover: 0.6, range: 4.5, arc: 2.2, mul: 0.8, multi: true }, leap: { windup: 0.7, active: 0.4, recover: 0.8, aoe: 4.5, fwd: 0, mul: 1.3, jump: true },
      spit: { windup: 0.8, active: 0.1, recover: 0.6, proj: 'spit' }, back: { windup: 0.1, active: 0.3, recover: 0.2, dodge: true },
    };
    if (k === 'lynel') return {
      swing: { windup: 0.7, active: 0.3, recover: 0.7, range: 5, arc: 2.6, mul: 1 }, charge: { windup: 0.9, active: 1.4, recover: 0.9, range: 2.8, arc: 1.6, mul: 1.3, rush: 18, kb: 12 },
      breath: { windup: 1.1, active: 1.0, recover: 0.8, proj: 'breath' }, arrows: { windup: 1.2, active: 0.1, recover: 0.8, proj: 'arrows' },
      roar: { windup: 0.4, active: 1.0, recover: 0.4, roar: true },
    };
    if (k === 'omega') return {
      sweep: { windup: 2.2 * f, active: 0.1, recover: 1.2 * f, proj: 'laser' }, stomp: { windup: 1.3 * f, active: 0.1, recover: 1.0 * f, proj: 'shock' },
      smash: { windup: 1.6 * f, active: 0.25, recover: 1.2 * f, proj: 'smash' }, missiles: { windup: 1.4 * f, active: 0.2, recover: 1.5 * f, proj: 'missiles' },
      summon: { windup: 1.5, active: 0.1, recover: 1.0, proj: 'summon' },
    };
    return {};
  }
  isAttackKind(st) { return !!this.attackTable()[st]; }
  onRespawn() { this.engaged = false; this.phase = 1; this.stun = 0; this.cooled = 0; this.maxHp = this.baseHp; this.hp = this.maxHp; this.state = this.kind === 'hinox' ? 'sleep' : 'idle'; this.target = null; this.collider.active = true; if (this.kind === 'omega') this.pos.set(this.home.x, 40, this.home.z); }
  startAttack(kind) {
    const a = this.attackTable()[kind]; if (!a) return;
    this.atk = Object.assign({ kind, t: 0 }, a); this.atkSeq++;
    this.state = 'attack'; this.stateT = 0;
    if (this.target) this.atk.tp = this.target.pos.clone();
    if (kind === 'sweep') G.Audio.play('laserCharge', { pos: this.pos, range: 120 });
    if (kind === 'roar' || (kind === 'stomp' && this.kind === 'omega')) G.Audio.play('roar', { pos: this.pos, range: 120, pitch: this.kind === 'omega' ? 0.6 : 1 });
  }
  unaware() { return this.state === 'sleep' || this.state === 'idle'; }
  weakPoint(out) {
    out = out || new THREE.Vector3();
    const r = this.rig;
    if (this.kind === 'hinox') return r.eye.getWorldPosition(out);
    if (this.kind.startsWith('talus')) return r.weak.getWorldPosition(out);
    if (this.kind === 'omega') return (this.stun > 0 ? r.core : r.eye).getWorldPosition(out);
    if (this.kind === 'lynel') return r.upper.head.getWorldPosition(out).setY(out.y + 0.3);
    return r.head.getWorldPosition(out).setY(out.y + 0.5);
  }
  hitTest(p, r) {
    const w = this.weakPoint(G.tmp.v4);
    const wr = this.kind === 'omega' ? 1.3 : this.kind.startsWith('talus') ? 1.0 : this.kind === 'hinox' ? 0.8 : 0.6;
    if (w.distanceTo(p) < r + wr) return 'weak';
    const base = this.pos.y + (this.stun > 0 && this.kind === 'omega' ? -5 : 0);
    if (p.y < base - 0.3 || p.y > base + this.height) return null;
    return Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < this.radius + r ? 'body' : null;
  }
  takeDamage(d, o = {}) {
    if (!this.alive) return;
    let mul = 1;
    if (this.kind.startsWith('talus')) {
      const weak = o.weak || this.stun > 0;
      if (!weak) mul = o.src === 'bomb' ? 1 : 0.3;
      if (this.kind === 'talus_fire' && o.elem === 'ice') { this.cooled = 8; mul = Math.max(mul, 1); }
      if (o.weak) { this.stun = Math.max(this.stun, 3.5); this.atk = null; this.state = 'chase'; }
    }
    if (this.kind === 'hinox' && o.weak && o.src === 'arrow') { this.stun = Math.max(this.stun, 4.5); this.atk = null; this.state = 'chase'; G.Hud.notify('目を射抜いた！'); }
    if (this.kind === 'lynel' && o.weak && o.src === 'arrow') { this.stun = Math.max(this.stun, 1.8); this.atk = null; }
    if (this.kind === 'omega') {
      if (o.weak && this.stun <= 0 && (o.src === 'arrow' || o.src === 'beam' || o.src === 'fireball' || o.src === 'ice')) { this.stun = 6; this.atk = null; this.state = 'chase'; G.Hud.centerMsg('オメガの目を撃ち抜いた！\nコアを攻撃しろ！', 2); G.Audio.play('explode', { pos: this.pos, range: 120 }); }
      else if (this.stun > 0) mul = o.weak ? 2.5 : 1.0;
      else mul = o.weak ? 0.6 : 0.25;
    }
    if (this.stun > 0 && !this.kind.startsWith('talus') && this.kind !== 'omega') mul *= 1.5;
    super.takeDamage(Math.max(1, Math.round(d * mul)), Object.assign({}, o, { kb: 0 }));
    if (this.state === 'sleep') { this.state = 'alert'; this.stateT = 0; }
    this.engaged = true;
  }
  die(killer) {
    if (!this.alive) return;
    super.die(killer);
    this.respawnT = this.kind === 'omega' ? 360 : 1e9;
    if (this.kind === 'omega') G.Quests.onOmegaDefeated(this);
    else G.Events.emit('bossDefeated', this);
  }
  update(dt) {
    if (!this.alive) { this.deadT += dt; return; }
    this.stateT += dt; this.flash = Math.max(0, this.flash - dt);
    this.cooled = Math.max(0, this.cooled - dt);
    if (this.burn > 0) { this.burn -= dt; this.burnTick = (this.burnTick || 0) - dt; if (this.burnTick <= 0) { this.burnTick = 0.5; this.hp -= 4; if (this.hp <= 0) { this.die(); return; } } }
    // フェーズ
    const f = this.hp / this.maxHp;
    const np = f < 0.25 ? 3 : f < 0.6 ? 2 : 1;
    if (np !== this.phase) { this.phase = np; if (this.kind === 'omega') { G.Net.role !== 'guest' && G.Hud.centerMsg(np === 2 ? 'オメガの装甲が開いた…！' : 'オメガが暴走している！', 2); this.startAttack(np === 2 ? 'summon' : 'missiles'); } }
    if (this.stun > 0) { this.stun -= dt; this.vel.x *= 0.9; this.vel.z *= 0.9; this.bphys(dt); return; }
    const tgt = this.target && !this.target.dead && !this.target.downed ? this.target : null;
    switch (this.state) {
      case 'sleep': { const p = this.nearestPlayer(); if (p && p.pos.distanceTo(this.pos) < (p.sneaking ? 6 : 13)) { this.state = 'alert'; this.stateT = 0; this.target = p; G.Audio.play('roar', { pos: this.pos }); } break; }
      case 'idle': case 'return': {
        if (this.state === 'return') { this.moveToward(this.home.x, this.home.z, this.def.spd, dt); if (this.pos.distanceTo(this.home) < 3) { this.state = 'idle'; this.hp = this.maxHp; this.engaged = false; } }
        const p = this.nearestPlayer();
        const engageR = this.kind === 'omega' ? 44 : this.def.sight;
        if (p && p.pos.distanceTo(this.pos) < engageR && (this.kind !== 'omega' || (Math.hypot(p.pos.x, p.pos.z) < 46 && p.pos.y > 34))) { this.target = p; this.state = 'alert'; this.stateT = 0; G.Audio.play('roar', { pos: this.pos, range: 150, pitch: this.kind === 'omega' ? 0.5 : 1 }); this.scaleHp(); }
        break;
      }
      case 'alert': if (tgt) this.faceToward(tgt.pos.x, tgt.pos.z, dt, 4); if (this.stateT > 1.2) { this.state = 'chase'; this.stateT = 0; this.engaged = true; if (this.kind === 'omega') G.Quests.omegaEngaged(true); } break;
      case 'chase': {
        if (!tgt) { this.target = this.nearestPlayer(); if (!this.target) { this.state = 'return'; } break; }
        const dist = Math.hypot(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z);
        if (this.kind === 'omega') { if (Math.hypot(tgt.pos.x, tgt.pos.z) > 50 || tgt.pos.y < 30) { this.target = this.nearestArenaPlayer(); if (!this.target) { this.state = 'return'; G.Quests.omegaEngaged(false); } break; } }
        else if (this.pos.distanceTo(this.home) > 60 || dist > 50) { this.state = 'return'; this.target = null; break; }
        if (this.stateT > 3) { this.stateT = 0; const np2 = this.kind === 'omega' ? this.nearestArenaPlayer() : this.nearestPlayer(); if (np2) this.target = np2; }
        this.faceToward(tgt.pos.x, tgt.pos.z, dt, this.kind === 'omega' ? 2 : 5);
        this.atkCool = (this.atkCool || 1.5) - dt;
        this.bossAI(tgt, dist, dt);
        break;
      }
      case 'attack': this.updateBossAttack(dt); break;
    }
    this.bphys(dt);
  }
  nearestArenaPlayer() { let b = null, bd = 1e9; for (const p of G.Enemies.players()) { if (p.dead || p.downed || Math.hypot(p.pos.x, p.pos.z) > 48 || p.pos.y < 30) continue; const d = p.pos.distanceTo(this.pos); if (d < bd) { bd = d; b = p; } } return b; }
  scaleHp() {
    const n = 1 + (G.Net.role === 'host' ? G.Remote.list().length : 0);
    const want = Math.round(this.baseHp * (1 + 0.6 * (n - 1)));
    if (want !== this.maxHp) { const f = this.hp / this.maxHp; this.maxHp = want; this.hp = Math.round(want * f); }
  }
  bossAI(tgt, dist, dt) {
    const k = this.kind, R = Math.random;
    if (k === 'hinox') {
      if (dist > 6) this.moveToward(tgt.pos.x, tgt.pos.z, this.def.spd, dt); else { this.vel.x *= 0.85; this.vel.z *= 0.85; }
      if (this.atkCool <= 0 && dist < 8) this.startAttack(dist < 4 ? (R() < 0.5 ? 'stomp' : 'kick') : 'swipe');
    } else if (k.startsWith('talus')) {
      if (dist > 5 && dist < 16) this.moveToward(tgt.pos.x, tgt.pos.z, this.def.spd, dt); else { this.vel.x *= 0.85; this.vel.z *= 0.85; }
      if (this.atkCool <= 0) this.startAttack(dist < 6 ? 'slam' : dist < 18 && R() < 0.5 ? 'roll' : 'throw');
    } else if (k === 'lizal_king') {
      if (dist > 3.5) this.moveToward(tgt.pos.x, tgt.pos.z, this.def.spd, dt); else { this.vel.x *= 0.8; this.vel.z *= 0.8; }
      if (this.atkCool <= 0) this.startAttack(dist < 4.5 ? (R() < 0.25 ? 'back' : 'combo') : dist < 12 ? 'leap' : 'spit');
    } else if (k === 'lynel') {
      if (dist > 4) this.moveToward(tgt.pos.x, tgt.pos.z, this.def.spd * (dist > 15 ? 1 : 0.6), dt); else { this.vel.x *= 0.85; this.vel.z *= 0.85; }
      if (this.atkCool <= 0) { const r = R(); this.startAttack(dist < 5.5 ? (r < 0.7 ? 'swing' : 'roar') : dist < 20 ? (r < 0.45 ? 'charge' : r < 0.75 ? 'breath' : 'arrows') : (r < 0.5 ? 'arrows' : 'charge')); }
    } else if (k === 'omega') {
      if (dist > 14) this.moveToward(tgt.pos.x, tgt.pos.z, this.def.spd, dt); else { this.vel.x *= 0.9; this.vel.z *= 0.9; }
      if (this.atkCool <= 0) { const r = R(); this.startAttack(this.phase >= 2 && r < 0.25 ? 'missiles' : dist < 12 ? (r < 0.6 ? 'stomp' : 'smash') : (r < 0.55 ? 'sweep' : r < 0.8 ? 'smash' : 'stomp')); }
    }
  }
  updateBossAttack(dt) {
    const a = this.atk; if (!a) { this.state = 'chase'; return; }
    a.t += dt;
    const tgt = this.target;
    if (a.t < a.windup && tgt) { this.faceToward(tgt.pos.x, tgt.pos.z, dt, this.kind === 'omega' ? 1.5 : 4); a.tp = tgt.pos.clone(); }
    if (this.kind === 'omega' && a.kind === 'sweep' && tgt && a.t < a.windup - 0.4) a.lockPos = tgt.pos.clone().setY(tgt.pos.y + 1);
    if (a.rush && a.t > a.windup && a.t < a.windup + a.active) { this.vel.x = Math.sin(this.rotY) * a.rush; this.vel.z = Math.cos(this.rotY) * a.rush; if (Math.random() < 0.3) G.Particles.dust(this.pos); }
    if (a.dodge && a.t > a.windup && a.t < a.windup + a.active) { this.vel.x = -Math.sin(this.rotY) * 12; this.vel.z = -Math.cos(this.rotY) * 12; }
    if (a.jump && a.t > a.windup * 0.6 && !a.jumped && tgt) { a.jumped = true; const dx = tgt.pos.x - this.pos.x, dz = tgt.pos.z - this.pos.z; this.vel.x = dx * 1.4; this.vel.z = dz * 1.4; this.vel.y = 9; }
    if (!a.fired && a.t >= a.windup) { a.fired = true; this.fireBossAttack(a); }
    if (a.aoe && !a.fx && a.t >= a.windup) { a.fx = true; const c = this.aoeCenter(a); G.Particles.dust(c); G.Particles.burst(c, 0xddccbb, 20, 6); G.Cam.addShake(0.5); G.Audio.play('stomp', { pos: c }); }
    if (a.roar && a.t > a.windup && !a.roared) { a.roared = true; const pl = G.player; if (pl && pl.pos.distanceTo(this.pos) < 14 && pl.state !== 'dodge') { pl.stun = 1.2; G.Hud.notify('獣王の咆哮で体がすくんだ！'); } }
    if (a.t > a.windup + a.active + a.recover) {
      this.atk = null; this.state = 'chase'; this.stateT = 0.5;
      this.atkCool = (this.kind === 'omega' ? (this.phase >= 3 ? 0.6 : 1.2) : this.kind === 'lizal_king' ? 0.4 : 0.9) + Math.random() * 0.8;
    }
    this.vel.x *= Math.exp(-2 * dt); this.vel.z *= Math.exp(-2 * dt);
  }
  aoeCenter(a) { return new THREE.Vector3(this.pos.x + Math.sin(this.rotY) * (a.fwd || 0), this.pos.y, this.pos.z + Math.cos(this.rotY) * (a.fwd || 0)); }
  fireBossAttack(a) {
    const tgt = this.target; const tp = (a.tp || (tgt && tgt.pos) || this.pos).clone();
    const atk = this.def.atk;
    if (a.proj === 'rock') {
      const o = this.pos.clone(); o.y += 6; const dist = o.distanceTo(tp), sp = 22, tf = dist / sp; const v = tp.clone().sub(o).normalize().multiplyScalar(sp); v.y += 0.5 * 14 * tf;
      G.Proj.spawn({ kind: 'rock', pos: o, vel: v, owner: 'e', gravity: 14, dmg: atk, radius: 1.2, life: 5, color: this.kind === 'talus_ice' ? 0xa8c8e0 : 0x5a3a34, elem: this.elem });
    } else if (a.proj === 'spit') {
      const o = this.pos.clone(); o.y += 3.4; const v = tp.clone().setY(tp.y + 1).sub(o).normalize().multiplyScalar(22);
      G.Proj.spawn({ kind: 'fireball', pos: o, vel: v, owner: 'e', dmg: atk * 0.8, elem: 'elec', radius: 0.5, life: 3, color: 0xffee44 });
    } else if (a.proj === 'breath') {
      for (let i = 0; i < 5; i++) {
        const o = this.pos.clone(); o.y += 3.6; const v = tp.clone().setY(tp.y + 1).sub(o).normalize().applyAxisAngle(G.tmp.v1.set(0, 1, 0), (i - 2) * 0.16).multiplyScalar(20);
        setTimeout(() => { if (this.alive) G.Proj.spawn({ kind: 'fireball', pos: o, vel: v, owner: 'e', dmg: atk * 0.6, elem: 'fire', radius: 0.6, life: 3 }); }, i * 120);
      }
      G.Audio.play('fire', { pos: this.pos });
    } else if (a.proj === 'arrows') {
      for (let i = 0; i < 3; i++) {
        const o = this.pos.clone(); o.y += 3.4; const dist = o.distanceTo(tp), sp = 40, tf = dist / sp;
        const v = tp.clone().setY(tp.y + 1).sub(o).normalize().applyAxisAngle(G.tmp.v1.set(0, 1, 0), (i - 1) * 0.1).multiplyScalar(sp); v.y += 0.5 * 9 * tf;
        G.Proj.spawn({ kind: 'arrow', pos: o, vel: v, owner: 'e', gravity: 9, dmg: atk * 0.6, radius: 0.25, life: 4, color: 0xff7043, elem: 'fire' });
      }
    } else if (a.proj === 'laser') {
      const eye = this.rig.eye.getWorldPosition(new THREE.Vector3());
      const lock = a.lockPos || tp.setY(tp.y + 1);
      const shots = this.phase >= 3 ? 3 : 1;
      for (let s = 0; s < shots; s++) {
        setTimeout(() => {
          if (!this.alive) return;
          const tgt2 = this.target; const lp = s === 0 ? lock : (tgt2 ? tgt2.pos.clone().setY(tgt2.pos.y + 1) : lock);
          const dir = lp.clone().sub(eye).normalize(); const end = eye.clone().addScaledVector(dir, 90);
          for (let t = 2; t < 90; t += 1) { const x = eye.x + dir.x * t, y = eye.y + dir.y * t, z = eye.z + dir.z * t; if (y < Math.max(G.Terrain.getHeight(x, z), Math.hypot(x, z) < 47 ? 40 : -999)) { end.set(x, y, z); break; } }
          G.Proj.spawn({ kind: 'laser', pos: eye, end, owner: 'e', dmg: atk * 1.5, color: 0xff2a5a, width: 0.6, hitR: 1.4 });
        }, s * 450);
      }
    } else if (a.proj === 'shock') {
      const rings = this.phase >= 3 ? 2 : 1;
      for (let s = 0; s < rings; s++) setTimeout(() => { if (this.alive) G.Proj.spawn({ kind: 'shock', pos: this.pos.clone().setY(this.pos.y + 0.3), owner: 'e', dmg: atk, life: 3, speed: 16, maxR: 45 }); }, s * 700);
      G.Cam.addShake(0.8); G.Audio.play('stomp', { pos: this.pos, range: 150 });
    } else if (a.proj === 'smash') {
      const c = tp.clone(); G.Particles.burst(c, 0xff2a5a, 30, 8); G.Particles.explosion(c, 5); G.Cam.addShake(0.8); G.Audio.play('explode', { pos: c, range: 150 });
      G.Proj.spawn({ kind: 'shock', pos: c.setY(c.y + 0.3), owner: 'e', dmg: atk * 0.8, life: 1, speed: 14, maxR: 9 });
      this._smashC = c.clone(); this._smashT = 0.3;
    } else if (a.proj === 'missiles') {
      const ps = G.Enemies.players().filter(p => !p.dead && Math.hypot(p.pos.x, p.pos.z) < 50);
      for (let i = 0; i < 6; i++) {
        const tg = ps[i % Math.max(1, ps.length)];
        const o = this.pos.clone(); o.y += 14; const v = new THREE.Vector3(Math.cos(i) * 6, 14, Math.sin(i) * 6);
        G.Proj.spawn({ kind: 'missile', pos: o, vel: v, owner: 'e', dmg: atk * 0.7, radius: 0.6, life: 6, speed: 13, targetId: tg ? (tg === G.player ? G.Net.myId : tg.id) : null });
      }
      G.Audio.play('laser', { pos: this.pos, range: 150 });
    } else if (a.proj === 'summon') {
      for (const id of [90001, 90002]) { const e = G.Enemies.byId.get(id); if (e && !e.alive) { G.Enemies.respawn(e); const ang = Math.random() * 6.28; e.pos.set(Math.cos(ang) * 25, 40, Math.sin(ang) * 25); e.home.copy(e.pos); e.state = 'chase'; e.target = this.target; G.Particles.poof(e.pos, 0x40c8ff, 2); } }
      G.Hud.notify('オメガが機兵を呼び出した！');
    }
  }
  // 当たり判定（各クライアントのプレイヤー）
  checkHitLocal() {
    const a = this.atk, pl = G.player;
    if (!a || !pl || pl.dead || pl.downed || a.proj || a.roar || a.dodge) return;
    if (a.t < a.windup || a.t > a.windup + a.active) return;
    if (!a.multi && this.lastHitSeq === this.atkSeq) return;
    if (a.multi) { this._mt = (this._mt || 0) - 1 / 60; if (this._mt > 0) return; }
    if (a.aoe) {
      const c = this.aoeCenter(a);
      if (Math.hypot(pl.pos.x - c.x, pl.pos.z - c.z) < a.aoe && Math.abs(pl.pos.y - c.y) < 2.5) { this.lastHitSeq = this.atkSeq; pl.takeDamage(this.def.atk * a.mul, c, this.elem, { src: this, kb: 10 }); }
      return;
    }
    const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > a.range + this.radius * 0.5 || Math.abs(pl.pos.y - this.pos.y) > this.height) return;
    const ang = Math.abs(G.U.angDiff(this.rotY, Math.atan2(dx, dz)));
    if (ang > a.arc / 2 + 0.2) return;
    this.lastHitSeq = this.atkSeq; this._mt = 0.45;
    pl.takeDamage(this.def.atk * a.mul, this.pos, this.elem, { src: this, kb: a.kb || 7 });
  }
  bphys(dt) {
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    if (this.kind === 'omega') { const d = Math.hypot(this.pos.x, this.pos.z); if (d > 38) { this.pos.x *= 38 / d; this.pos.z *= 38 / d; } this.pos.y = 40; }
    else {
      this.collider.active = false;
      G.Col.resolve(this.pos, this.radius * 0.5, this.height, this._res || (this._res = {}));
      const floor = G.Terrain.getHeight(this.pos.x, this.pos.z);
      this.vel.y -= 25 * dt; this.pos.y += this.vel.y * dt; if (this.pos.y <= floor) { this.pos.y = floor; this.vel.y = 0; }
      if (G.Water.depthAt(this.pos.x, this.pos.z) > 2 && this.kind !== 'lizal_king') { this.pos.x -= this.vel.x * dt * 2; this.pos.z -= this.vel.z * dt * 2; }
    }
    this.collider.x = this.pos.x; this.collider.z = this.pos.z; this.collider.y0 = this.pos.y - 1; this.collider.y1 = this.pos.y + this.height * 0.9;
    this.collider.active = this.alive;
    // 溶岩の巨人：触れると燃える
    if (this.kind === 'talus_fire' && this.cooled <= 0 && this.alive) { const pl = G.player; if (pl && pl.pos.distanceTo(this.pos) < this.radius + 1.2 && pl.state === 'attack') { if (!(G.Prog.skill('fireproof') || G.Prog.buff('fireproof'))) pl.burn = 2; } }
  }
  applyNet(dt) { super.applyNet(dt); this.collider.x = this.pos.x; this.collider.z = this.pos.z; this.collider.y0 = this.pos.y - 1; this.collider.y1 = this.pos.y + this.height * 0.9; this.collider.active = this.alive; }
  applyBossNet(s) { this.maxHp = s[12] || this.maxHp; this.phase = s[13] || this.phase; this.stun = s[14] || 0; this.cooled = s[15] || 0; this.engaged = !!s[16]; }
  updateVisual(dt) {
    if (!this.model) return;
    const camD = G.camera.position.distanceTo(this.pos);
    this.model.visible = (this.alive || this.deadT < 1.5) && camD < this.visibleRange && !G.Shrine.inside;
    if (!this.model.visible) return;
    this.model.position.copy(this.pos); this.model.rotation.y = this.rotY;
    const a = this.anim, r = this.rig, k = this.kind;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    let st = !this.alive ? 'dead' : this.stun > 0 ? 'stun' : this.state === 'sleep' ? 'sleep' : this.state === 'attack' && this.atk ? (this.atk.t < this.atk.windup ? 'windup' : 'act') : hs > 0.5 ? 'walk' : 'idle';
    if (a.st !== st) { a.st = st; a.t = 0; } else a.t += dt;
    const ak = this.atk ? this.atk.kind : '';
    if (k === 'hinox' || k === 'lizal_king') {
      let hst = st === 'windup' ? (ak === 'stomp' ? 'lift' : 'windup') : st === 'act' ? (ak === 'stomp' ? 'smash' : 'attack') : st === 'walk' ? (hs > 4 ? 'run' : 'walk') : st === 'dead' ? 'dead' : st;
      if (ak === 'leap' && st === 'act') hst = 'plunge';
      if (ak === 'back') hst = 'sidehop';
      r.phase += hs * dt * (k === 'hinox' ? 0.5 : 1.2);
      G.Models.animHumanoid(r, { st: hst, t: a.t, prog: this.atk ? Math.min(1, (this.atk.t - this.atk.windup) / 0.4) : 0, combo: Math.floor(a.t * 3) % 2, wtype: 'heavy' }, dt);
      if (k === 'hinox' && r.eye) r.eye.material.color.setHex(this.stun > 0 ? 0xff4444 : 0xffffee);
    } else if (k.startsWith('talus')) {
      const b = r.body; const t = a.t;
      let by = 3.4, bx = 0, arm = 0;
      if (st === 'stun') { by = 1.6; bx = 0.5; }
      else if (st === 'windup' && ak === 'slam') { arm = -2.6 * Math.min(1, t / 0.8); }
      else if (st === 'act' && ak === 'slam') { arm = -0.2; by = 2.8; }
      else if (ak === 'roll' && (st === 'act')) { b.rotation.x += dt * 10; }
      else if (st === 'windup' && ak === 'throw') { arm = -2.8; }
      else if (st === 'walk') { by = 3.4 + Math.abs(Math.sin(t * 3)) * 0.2; }
      else if (st === 'dead') { by = 1.2; bx = 0.8; }
      if (!(ak === 'roll' && st === 'act')) b.rotation.x = G.U.damp(b.rotation.x % (Math.PI * 2), bx, 6, dt);
      b.position.y = G.U.damp(b.position.y, by, 6, dt);
      r.armL.rotation.x = G.U.damp(r.armL.rotation.x, arm || Math.sin(t * 3) * 0.3 * (st === 'walk' ? 1 : 0.2), 8, dt);
      r.armR.rotation.x = G.U.damp(r.armR.rotation.x, arm || -Math.sin(t * 3) * 0.3 * (st === 'walk' ? 1 : 0.2), 8, dt);
      r.legL.rotation.x = st === 'walk' ? Math.sin(t * 3) * 0.4 : 0; r.legR.rotation.x = st === 'walk' ? -Math.sin(t * 3) * 0.4 : 0;
      r.weak.rotation.y += dt * 2;
      if (k === 'talus_fire' && this.alive) { if (this.cooled <= 0 && Math.random() < 0.3) G.Particles.fire(G.tmp.v1.copy(this.pos).setY(this.pos.y + 4), 2); }
    } else if (k === 'lynel') {
      r.phase += hs * dt * 1.0;
      G.Models.animQuad(r, { st: st === 'dead' ? 'dead' : ak === 'charge' && st === 'act' ? 'run' : hs > 4 ? 'run' : hs > 0.5 ? 'walk' : (ak === 'roar' ? 'rear' : 'idle'), t: a.t }, dt);
      const ust = st === 'windup' ? (ak === 'swing' ? 'windup' : ak === 'arrows' ? 'shoot' : ak === 'breath' ? 'roar' : 'roar') : st === 'act' ? (ak === 'swing' ? 'smash' : ak === 'roar' ? 'roar' : 'idle') : st === 'stun' ? 'stun' : 'idle';
      G.Models.animHumanoid(r.upper, { st: ust, t: a.t, prog: this.atk ? Math.min(1, (this.atk.t - this.atk.windup) * 3) : 0 }, dt);
    } else if (k === 'omega') {
      const t = a.t, b = r.body;
      let by = 10, arm = 0, armZ = 0, leg = 0;
      if (st === 'stun') by = 5.5;
      else if (st === 'windup' && ak === 'smash') arm = -2.8 * Math.min(1, t / 1);
      else if (st === 'act' && ak === 'smash') arm = -0.6;
      else if (st === 'windup' && ak === 'stomp') { leg = -1.0; by = 11; }
      else if (st === 'windup' && ak === 'missiles') { arm = -3.0; armZ = 0.5; }
      else if (st === 'walk') leg = Math.sin(t * 2) * 0.35;
      else if (st === 'dead') by = 4;
      b.position.y = G.U.damp(b.position.y, by + Math.sin(t * 1.5) * 0.15, 4, dt);
      r.armL.rotation.x = G.U.damp(r.armL.rotation.x, arm, 5, dt); r.armR.rotation.x = G.U.damp(r.armR.rotation.x, ak === 'missiles' ? arm : arm * 0.4 + Math.sin(t) * 0.1, 5, dt);
      r.armL.rotation.z = G.U.damp(r.armL.rotation.z, -armZ - 0.15, 5, dt); r.armR.rotation.z = G.U.damp(r.armR.rotation.z, armZ + 0.15, 5, dt);
      r.legL.rotation.x = G.U.damp(r.legL.rotation.x, leg, 6, dt); r.legR.rotation.x = G.U.damp(r.legR.rotation.x, st === 'walk' ? -leg : 0, 6, dt);
      // 目の色（攻撃予告）
      const charging = st === 'windup' && ak === 'sweep';
      r.glowMat.color.setHex(this.stun > 0 ? 0x444444 : charging && Math.floor(t * 10) % 2 ? 0xffffff : this.phase >= 3 ? 0xff0000 : 0xff2a5a);
      if (charging && this.atk.lockPos) G.Enemies.drawLaserSight(this, this.atk.lockPos);
      if (this.alive && Math.random() < 0.3) G.Particles.malice(G.tmp.v1.copy(this.pos).setY(this.pos.y + 8));
      r.core.scale.setScalar(this.stun > 0 ? 1.4 + Math.sin(t * 8) * 0.1 : 1);
      if (this._smashT > 0) this._smashT -= dt;
    }
    const fl = this.flash > 0;
    if (fl !== this._fl) { this._fl = fl; for (const m of this.mats) { if (!m.userData.om) m.userData.om = m.material; m.material = fl ? G.Mat.glow(0xffffff) : m.userData.om; } }
    if (k === 'talus_fire') { const cool = this.cooled > 0; if (cool !== this._cool) { this._cool = cool; for (const m of this.mats) if (!fl) m.material = cool ? G.Mat.toon(0x6a6a6a) : (m.userData.om || m.material); } }
    if (!this.alive && this.deadT > 0.2) { this.model.scale.setScalar(Math.max(0.01, 1 - (this.deadT - 0.2) / 1.3)); if (Math.random() < 0.5) G.Particles.poof(G.tmp.v1.copy(this.pos).setY(this.pos.y + this.height * Math.random()), 0x6a2a7a, 1); }
    else if (this.alive && this.model.scale.x !== 1 && !this.rig.root.userData.keepScale) this.model.scale.setScalar(1);
  }
};

G.Bosses = {
  list: [],
  spawnAll(idStart) {
    let id = 80000;
    const host = G.Prog.data;
    for (const b of G.World.bosses) {
      const e = new G.Boss(id++, b.type, b.x, b.z, b.id);
      if (host.bosses[b.id] && G.Net.role !== 'guest') { e.alive = false; e.respawnT = 1e9; e.collider.active = false; }
      G.Enemies.add(e); this.list.push(e);
    }
    const F = G.World.finalBoss;
    const o = new G.Boss(id++, 'omega', F.x, F.z, F.id); o.rotY = Math.PI;
    G.Enemies.add(o); this.list.push(o); this.omega = o;
    // オメガが呼ぶ機兵（最初は待機）
    for (const sid of [90001, 90002]) { const e = new G.Enemy(sid, 'trial_s', 0, 30, {}); e.alive = false; e.respawnT = 1e9; e.noDrop = true; e.boss = false; e.summoned = true; G.Enemies.add(e); }
  },
  // 地図表示用
  activeNear(p, r) { return this.list.find(b => b.alive && b.engaged && b.pos.distanceTo(p) < r); },
};
