// ===== 敵（AI・同期） =====
'use strict';
// 敵の種類定義
G.EnemyTypes = {
  goblin_red:    { name: 'レッドゴブリン', model: ['goblin', 'red'], hp: 14, atk: 4, spd: 3.6, xp: 10, money: [1, 5], drops: [['goblin_horn', 0.6]], weapons: ['goblin_club', 'goblin_spear', 'stick'], radius: 0.5, height: 1.6, sight: 17 },
  goblin_blue:   { name: 'ブルーゴブリン', model: ['goblin', 'blue'], hp: 70, atk: 8, spd: 3.9, xp: 30, money: [4, 12], drops: [['goblin_horn', 0.7], ['goblin_fang', 0.3]], weapons: ['spiked_club', 'soldier_spear', 'trav_sword', 'trav_claymore'], radius: 0.5, height: 1.6, sight: 18 },
  goblin_black:  { name: 'ブラックゴブリン', model: ['goblin', 'black'], hp: 220, atk: 14, spd: 4.1, xp: 80, money: [10, 25], drops: [['goblin_fang', 0.7], ['goblin_horn', 0.5]], weapons: ['dragonbone_club', 'knight_spear', 'soldier_claymore', 'knight_sword'], radius: 0.55, height: 1.7, sight: 19, def: 2 },
  goblin_silver: { name: 'シルバーゴブリン', model: ['goblin', 'silver'], hp: 650, atk: 22, spd: 4.3, xp: 240, money: [30, 70], drops: [['goblin_fang', 1], ['amber', 0.4], ['opal', 0.3], ['topaz', 0.15]], weapons: ['royal_sword', 'knight_claymore', 'knight_spear', 'flame_sword', 'frost_spear'], radius: 0.6, height: 1.8, sight: 20, def: 5 },
  archer_red:    { name: 'ゴブリンの弓兵', model: ['goblin', 'red'], hp: 14, atk: 4, spd: 3.4, xp: 12, money: [2, 6], drops: [['goblin_horn', 0.6]], weapons: ['goblin_bow'], archer: true, radius: 0.5, height: 1.6, sight: 24 },
  archer_blue:   { name: 'ゴブリンの弓兵', model: ['goblin', 'blue'], hp: 70, atk: 8, spd: 3.6, xp: 32, money: [4, 12], drops: [['goblin_fang', 0.4]], weapons: ['trav_bow', 'soldier_bow'], archer: true, radius: 0.5, height: 1.6, sight: 26 },
  archer_black:  { name: 'ゴブリンの弓兵', model: ['goblin', 'black'], hp: 220, atk: 14, spd: 3.8, xp: 85, money: [10, 25], drops: [['goblin_fang', 0.6]], weapons: ['knight_bow', 'falcon_bow'], archer: true, radius: 0.55, height: 1.7, sight: 28, def: 2 },
  lizal_green:   { name: 'トカゲ戦士', model: ['lizal', 'green'], hp: 60, atk: 8, spd: 5.0, xp: 35, money: [5, 12], drops: [['lizal_tail', 0.6]], weapons: ['lizal_blade', 'lizal_trident'], radius: 0.5, height: 1.7, sight: 20, agile: true },
  lizal_blue:    { name: 'ブルートカゲ戦士', model: ['lizal', 'blue'], hp: 160, atk: 13, spd: 5.3, xp: 75, money: [10, 22], drops: [['lizal_tail', 0.8]], weapons: ['lizal_trident', 'lizal_blade', 'lizal_bow'], radius: 0.5, height: 1.7, sight: 21, agile: true, def: 1 },
  lizal_black:   { name: 'ブラックトカゲ戦士', model: ['lizal', 'black'], hp: 380, atk: 18, spd: 5.6, xp: 150, money: [20, 40], drops: [['lizal_tail', 1], ['opal', 0.3]], weapons: ['lizal_trident', 'thunder_sword'], radius: 0.55, height: 1.75, sight: 22, agile: true, def: 3 },
  slime:         { name: 'スライム', model: ['slime', 0x6ad84a], hp: 8, atk: 3, spd: 2.6, xp: 4, money: [0, 2], drops: [['jelly', 0.8]], radius: 0.6, height: 1.0, sight: 12, slime: true },
  slime_fire:    { name: '炎スライム', model: ['slime', 0xff6a30], hp: 24, atk: 6, spd: 2.8, xp: 12, money: [1, 4], drops: [['fire_jelly', 0.8]], radius: 0.6, height: 1.0, sight: 13, slime: true, elem: 'fire' },
  slime_ice:     { name: '氷スライム', model: ['slime', 0x7ad8ff], hp: 24, atk: 6, spd: 2.8, xp: 12, money: [1, 4], drops: [['ice_jelly', 0.8]], radius: 0.6, height: 1.0, sight: 13, slime: true, elem: 'ice' },
  slime_elec:    { name: '雷スライム', model: ['slime', 0xffee44], hp: 30, atk: 7, spd: 3.0, xp: 15, money: [1, 5], drops: [['elec_jelly', 0.8]], radius: 0.6, height: 1.0, sight: 13, slime: true, elem: 'elec' },
  wolf:          { name: '魔狼', model: ['wolf', 0x6a6a72], hp: 40, atk: 6, spd: 7.2, xp: 18, money: [0, 3], drops: [['wolf_fang', 0.6], ['meat', 0.5]], radius: 0.55, height: 1.0, sight: 22, quad: true },
  wolf_white:    { name: '白い魔狼', model: ['wolf', 0xdde4ec], hp: 120, atk: 12, spd: 7.8, xp: 50, money: [2, 6], drops: [['wolf_fang', 1], ['prime_meat', 0.4]], radius: 0.6, height: 1.0, sight: 24, quad: true },
  bat:           { name: 'コウモリ', model: ['bat', 0x4a3a5a], hp: 4, atk: 2, spd: 6, xp: 3, money: [0, 1], drops: [['bat_wing', 0.6]], radius: 0.4, height: 0.6, sight: 16, flying: true },
  bat_fire:      { name: '炎コウモリ', model: ['bat', 0xd84a2a], hp: 8, atk: 4, spd: 6, xp: 6, money: [0, 2], drops: [['bat_wing', 0.6]], radius: 0.4, height: 0.6, sight: 16, flying: true, elem: 'fire' },
  bat_ice:       { name: '氷コウモリ', model: ['bat', 0x7ab8e8], hp: 8, atk: 4, spd: 6, xp: 6, money: [0, 2], drops: [['bat_wing', 0.6]], radius: 0.4, height: 0.6, sight: 16, flying: true, elem: 'ice' },
  stal:          { name: 'スタルゴブリン', model: ['goblin', 'stal'], hp: 6, atk: 4, spd: 3.6, xp: 6, money: [0, 3], drops: [['bone', 0.7]], weapons: ['goblin_club', 'stick'], radius: 0.45, height: 1.6, sight: 18, night: true },
  guardian:      { name: '古代兵', model: ['guardian'], hp: 900, atk: 40, spd: 2.8, xp: 180, money: [0, 0], drops: [['ancient_screw', 1], ['ancient_screw', 0.7], ['ancient_gear', 0.6], ['ancient_core', 0.12]], radius: 2.0, height: 3.2, sight: 45, ancient: true, guardian: true, def: 4 },
  trial_s:       { name: '試練の機兵・小', model: ['trial', 1.0], hp: 160, atk: 6, spd: 3.5, xp: 0, money: [0, 0], drops: [], radius: 1.2, height: 2.4, sight: 40, ancient: true, trial: true },
  trial_m:       { name: '試練の機兵・中', model: ['trial', 1.4], hp: 520, atk: 12, spd: 3.8, xp: 0, money: [0, 0], drops: [], radius: 1.6, height: 3.2, sight: 40, ancient: true, trial: true, laser: true },
  trial_l:       { name: '試練の機兵・大', model: ['trial', 1.9], hp: 1400, atk: 18, spd: 4.0, xp: 0, money: [0, 0], drops: [], radius: 2.1, height: 4.2, sight: 40, ancient: true, trial: true, laser: true, def: 3 },
};
G.Zones = {
  1: { melee: ['goblin_red', 'goblin_red', 'goblin_red'], archer: 'archer_red', lizal: 'lizal_green', roam: ['slime', 'goblin_red', 'wolf'] },
  2: { melee: ['goblin_red', 'goblin_blue', 'goblin_blue'], archer: 'archer_blue', lizal: 'lizal_green', roam: ['goblin_blue', 'wolf', 'slime', 'lizal_green'] },
  3: { melee: ['goblin_blue', 'goblin_black', 'goblin_black'], archer: 'archer_black', lizal: 'lizal_blue', roam: ['goblin_black', 'wolf_white', 'lizal_blue', 'goblin_blue'] },
  4: { melee: ['goblin_black', 'goblin_silver', 'goblin_black'], archer: 'archer_black', lizal: 'lizal_black', roam: ['goblin_silver', 'lizal_black', 'wolf_white', 'goblin_black'] },
};

G.Enemy = class {
  constructor(id, type, x, z, opts = {}) {
    this.id = id; this.type = type; this.def = G.EnemyTypes[type] || {};
    const d = this.def;
    this.home = new THREE.Vector3(x, 0, z); this.pos = new THREE.Vector3(x, 0, z); this.vel = new THREE.Vector3();
    this.rotY = opts.ry != null ? opts.ry : Math.random() * 6.28;
    this.hp = this.maxHp = d.hp || 10; this.alive = true; this.state = opts.sleep ? 'sleep' : 'idle'; this.stateT = Math.random() * 3;
    this.radius = d.radius || 0.5; this.height = d.height || 1.6; this.elem = d.elem || null; this.ancient = !!d.ancient; this.armor = d.def || 0;
    this.camp = opts.camp != null ? opts.camp : -1; this.local = !!opts.local; this.net = !this.local; this.boss = false;
    this.weaponId = opts.weapon || (d.weapons ? d.weapons[Math.floor(G.U.hash2(id * 7, 3) * d.weapons.length)] : null);
    this.burn = 0; this.frozen = 0; this.stun = 0; this.slow = 0; this.flash = 0; this.alertT = 0; this.atk = null; this.atkSeq = 0; this.lastHitSeq = -1;
    this.target = null; this.deadT = 0; this.respawnT = 0; this.seen = false; this.lookout = opts.lookout || null;
    this.yOffset = d.flying ? 3 : 0;
    this.netTarget = null; this.visibleRange = G.settings.quality === 0 ? 110 : 150;
    this.model = null; this.contrib = new Set();
  }
  buildModel(scene) {
    const m = this.def.model; let rig;
    if (m[0] === 'goblin') rig = G.Models.goblin(m[1]);
    else if (m[0] === 'lizal') rig = G.Models.lizal(m[1]);
    else if (m[0] === 'slime') rig = G.Models.slime(m[1]);
    else if (m[0] === 'wolf') rig = G.Models.wolf(m[1]);
    else if (m[0] === 'bat') rig = G.Models.bat(m[1]);
    else if (m[0] === 'guardian') rig = G.Models.guardian(1.4);
    else if (m[0] === 'trial') rig = G.Models.guardian(m[1], true);
    this.rig = rig; this.model = rig.root;
    if (this.weaponId && rig.handR) { this.wmesh = G.Models.weapon(this.weaponId); if (G.Items.weapons[this.weaponId].type === 'bow') { rig.handL.add(this.wmesh); this.wmesh.rotation.set(Math.PI / 2, 0, Math.PI / 2); } else rig.handR.add(this.wmesh); }
    this.anim = { st: 'idle', t: 0 };
    scene.add(this.model);
    this.model.visible = false;
    // 当たり用の色フラッシュ
    this.mats = []; this.model.traverse(o => { if (o.isMesh && o.material && o.material.isMeshToonMaterial) this.mats.push(o); });
  }
  dropWeapon() { if (this.wmesh && this.wmesh.parent && !this.def.archer) { this.wmesh.parent.remove(this.wmesh); this.droppedWeapon = this.weaponId; this.weaponId = null; G.Pickups.dropWeapon(this.droppedWeapon, this.pos.clone().setY(this.pos.y + 0.5), 1); } }
  unaware() { return this.state === 'idle' || this.state === 'sleep' || this.state === 'patrol' || this.state === 'sit'; }
  // 弱点（頭）
  weakPoint(out) {
    out = out || new THREE.Vector3();
    if (this.def.guardian || this.def.trial) { this.rig.eye.getWorldPosition(out); return out; }
    if (this.def.slime || this.def.flying) return null;
    if (this.def.quad) return out.set(this.pos.x + Math.sin(this.rotY) * 0.8, this.pos.y + 0.9, this.pos.z + Math.cos(this.rotY) * 0.8);
    return out.set(this.pos.x, this.pos.y + this.height * 0.9, this.pos.z);
  }
  weakRadius() { return this.def.guardian ? 0.6 : this.def.trial ? 0.5 : 0.32; }
  hitTest(p, r) {
    const w = this.weakPoint(G.tmp.v4);
    if (w && w.distanceTo(p) < r + this.weakRadius()) return 'weak';
    const cy = this.pos.y + this.yOffset;
    if (p.y < cy - 0.2 || p.y > cy + this.height + 0.2) return null;
    const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    return d < this.radius + r ? 'body' : null;
  }
  // ---- ダメージ（ホスト／ソロのみで呼ばれる） ----
  takeDamage(d, o = {}) {
    if (!this.alive) return;
    if (o.from != null) this.contrib.add(o.from); else this.contrib.add(G.Net.myId);
    if (this.frozen > 0 && o.shatter) { this.frozen = 0; G.Particles.ice(this.pos.clone().setY(this.pos.y + 1), 20); G.Audio.play('break', { pos: this.pos }); }
    this.hp -= d; this.flash = 0.15;
    if (o.elem) G.Combat.applyStatus(this, o.elem);
    if (this.state === 'sleep' || this.unaware()) { this.alert(this.nearestPlayer(), true); }
    // ひるみ
    const kb = (o.kb || 2) * (this.def.guardian || this.boss ? 0.1 : this.def.slime ? 1.5 : 1);
    if (o.kx != null) { this.vel.x += o.kx * kb; this.vel.z += o.kz * kb; }
    const heavy = this.maxHp >= 200 && Math.random() < 0.55 && kb < 5;
    if (!this.boss && !this.def.guardian && kb > 1 && this.state !== 'attack' && !heavy) { this.state = 'hurt'; this.stateT = 0; this.atk = null; }
    if (o.weak && (this.def.guardian || this.def.trial)) { this.stun = Math.max(this.stun, 2.2); this.atk = null; }
    if (this.hp <= 0) this.die(o.from);
  }
  die(killer) {
    if (!this.alive) return;
    this.alive = false; this.state = 'dead'; this.deadT = 0; this.respawnT = this.local || this.summoned ? 1e9 : 600 + Math.random() * 300;
    this.atk = null;
    G.Enemies.onDeath(this, killer);
  }
  // 最寄りのプレイヤー
  nearestPlayer() {
    let best = null, bd = 1e9;
    for (const p of G.Enemies.players()) { if (p.dead || p.downed) continue; const d = p.pos.distanceTo(this.pos); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  alert(p, instant) {
    if (!p) return;
    this.target = p;
    if (this.state === 'sleep' || this.unaware()) { this.state = 'alert'; this.stateT = instant ? 0.5 : 0; if (!this.local || true) G.Enemies.showAlert(this); G.Audio.play(this.def.slime ? 'slime' : this.def.guardian ? 'alert' : 'goblin', { pos: this.pos }); }
    // 同じキャンプの仲間も気づく
    if (this.camp >= 0) for (const e of G.Enemies.byCamp(this.camp)) if (e !== this && e.alive && e.unaware()) { e.target = p; e.state = 'alert'; e.stateT = 0.3; }
  }
  canSee(p) {
    const d = p.pos.distanceTo(this.pos);
    let sight = this.def.sight || 16;
    if (p.sneaking) sight *= G.Prog.skill('sneak') && p === G.player ? 0.35 : 0.5;
    if (G.Sky.isNight() && !this.def.night) sight *= 0.7;
    if (this.state === 'sleep') sight = p.sneaking ? 1.5 : 4;
    if (d > sight) return false;
    if (d < 4) return true;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const ang = Math.abs(G.U.angDiff(this.rotY, Math.atan2(dx, dz)));
    return ang < 1.2 || this.state === 'alert';
  }
  // ---- AI（ホスト／ソロ） ----
  update(dt) {
    this.stateT += dt; this.flash = Math.max(0, this.flash - dt);
    if (!this.alive) { this.deadT += dt; return; }
    // 状態異常
    if (this.burn > 0) { this.burn -= dt; this.burnTick = (this.burnTick || 0) - dt; if (this.burnTick <= 0) { this.burnTick = 0.5; this.hp -= Math.max(1, Math.round(this.maxHp * 0.02 + 1)); this.flash = 0.1; if (this.hp <= 0) { this.die(); return; } } }
    if (this.frozen > 0) { this.frozen -= dt; this.physics(dt, true); return; }
    if (this.stun > 0) { this.stun -= dt; this.physics(dt, true); return; }
    const spdMul = this.slow > 0 ? 0.5 : 1; this.slow = Math.max(0, this.slow - dt);
    const d = this.def;
    const tgt = this.target && !this.target.dead && !this.target.downed ? this.target : null;
    switch (this.state) {
      case 'sleep': case 'idle': case 'patrol': case 'sit': {
        // 見回り
        if (this.state !== 'sleep') {
          if (this.stateT > 3 + (this.id % 5)) { this.stateT = 0; this.wander = this.wander ? null : { x: this.home.x + (Math.random() - 0.5) * 12, z: this.home.z + (Math.random() - 0.5) * 12 }; }
          if (this.wander && !this.lookout) this.moveToward(this.wander.x, this.wander.z, d.spd * 0.35, dt);
        }
        const p = this.nearestPlayer();
        if (p && this.canSee(p)) this.alert(p);
        if (G.Sky.isNight() && this.camp >= 0 && this.state === 'idle' && !this.def.archer && (this.id % 3 === 0)) { this.state = 'sleep'; }
        break;
      }
      case 'alert': {
        if (tgt) this.faceToward(tgt.pos.x, tgt.pos.z, dt, 10);
        if (this.stateT > 0.7) { this.state = 'chase'; this.stateT = 0; }
        break;
      }
      case 'chase': {
        if (!tgt) { this.target = this.nearestPlayer(); if (!this.target || this.target.pos.distanceTo(this.pos) > 40) { this.state = 'return'; } break; }
        const dist = Math.hypot(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z);
        if (dist > (d.guardian ? 60 : 35) || this.pos.distanceTo(this.home) > 70) { this.state = 'return'; this.target = null; break; }
        if (this.stateT > 2) { const np = this.nearestPlayer(); if (np && np !== tgt && np.pos.distanceTo(this.pos) < dist - 4) this.target = np; this.stateT = 0; }
        this.faceToward(tgt.pos.x, tgt.pos.z, dt, 8);
        if (d.guardian || d.laser) { this.guardianAI(tgt, dist, dt); break; }
        if (d.archer) {
          if (dist < 7) this.moveToward(this.pos.x - (tgt.pos.x - this.pos.x), this.pos.z - (tgt.pos.z - this.pos.z), d.spd * spdMul, dt);
          else if (dist > 22) this.moveToward(tgt.pos.x, tgt.pos.z, d.spd * spdMul, dt);
          this.atkCool = (this.atkCool || 1.5) - dt;
          if (this.atkCool <= 0 && dist < 32) this.startAttack('shoot');
          break;
        }
        const reach = d.slime ? 1.2 : d.quad ? 1.8 : (this.weaponId && G.Items.weapons[this.weaponId].type === 'spear' ? 2.8 : 2.0);
        this.atkCool = (this.atkCool || 0) - dt;
        if (dist > reach + this.radius) {
          let sp = d.spd * spdMul;
          if (d.quad && dist < 8) { const a = this.rotY + Math.PI / 2 * (this.id % 2 ? 1 : -1); this.vel.x += Math.sin(a) * dt * 4; this.vel.z += Math.cos(a) * dt * 4; }
          this.moveToward(tgt.pos.x, tgt.pos.z, sp, dt);
        } else {
          this.vel.x *= 0.8; this.vel.z *= 0.8;
          if (this.atkCool <= 0) this.startAttack(d.slime ? 'hop' : d.quad ? 'lunge' : (Math.random() < 0.25 && d.atk >= 8 ? 'smash' : 'swing'));
          else if (d.agile && Math.random() < dt * 0.8) { const a = this.rotY + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); this.vel.x = Math.sin(a) * 6; this.vel.z = Math.cos(a) * 6; }
        }
        break;
      }
      case 'attack': this.updateAttack(dt); break;
      case 'hurt': this.vel.x *= Math.exp(-5 * dt); this.vel.z *= Math.exp(-5 * dt); if (this.stateT > 0.4) { this.state = 'chase'; this.stateT = 0; } break;
      case 'return': {
        this.moveToward(this.home.x, this.home.z, d.spd * 0.6, dt);
        if (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) < 2) { this.state = 'idle'; this.stateT = 0; this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.5); }
        const p = this.nearestPlayer(); if (p && this.canSee(p) && p.pos.distanceTo(this.pos) < 15) this.alert(p);
        break;
      }
    }
    this.physics(dt);
  }
  guardianAI(tgt, dist, dt) {
    const d = this.def;
    this.atkCool = (this.atkCool || 2) - dt;
    if (d.trial && dist > 3.5) this.moveToward(tgt.pos.x, tgt.pos.z, d.spd, dt);
    else if (!d.trial && dist > 14) this.moveToward(tgt.pos.x, tgt.pos.z, d.spd, dt);
    else { this.vel.x *= 0.9; this.vel.z *= 0.9; }
    if (this.atkCool <= 0) {
      if (d.trial && dist < 4.5) this.startAttack('spin');
      else if (dist < 45) this.startAttack('laser');
    }
  }
  startAttack(kind) {
    const A = {
      swing: { windup: 0.55, active: 0.2, recover: 0.6, range: 2.4, arc: 1.8, mul: 1 },
      smash: { windup: 0.9, active: 0.22, recover: 0.9, range: 2.8, arc: 1.2, mul: 1.6 },
      hop: { windup: 0.5, active: 0.35, recover: 0.6, range: 1.5, arc: 6.3, mul: 1 },
      lunge: { windup: 0.4, active: 0.3, recover: 0.7, range: 1.8, arc: 1.2, mul: 1 },
      shoot: { windup: 1.0, active: 0.1, recover: 0.8, proj: true },
      laser: { windup: this.def.trial ? 1.6 : 2.6, active: 0.1, recover: 1.6, laser: true },
      spin: { windup: 0.7, active: 1.2, recover: 0.8, range: 3.5 * (this.def.trial ? this.model.scale.x : 1), arc: 6.3, mul: 1, multi: true },
      swoop: { windup: 0.6, active: 0.5, recover: 0.6, range: 1.3, arc: 6.3, mul: 1 },
    };
    const a = A[kind]; if (!a) return;
    this.atk = Object.assign({ kind, t: 0 }, a); this.atkSeq++;
    this.state = 'attack'; this.stateT = 0;
    if (kind === 'laser') { this.atk.lockPos = null; G.Audio.play('laserCharge', { pos: this.pos }); }
    if (kind === 'hop' || kind === 'lunge') { this._lungeDir = this.rotY; }
  }
  updateAttack(dt) {
    const a = this.atk; if (!a) { this.state = 'chase'; return; }
    a.t += dt;
    const tgt = this.target;
    if (a.t < a.windup && tgt && a.kind !== 'spin') this.faceToward(tgt.pos.x, tgt.pos.z, dt, a.kind === 'laser' ? 3 : 6);
    if (a.kind === 'laser' && tgt) {
      if (a.t < a.windup - 0.35) a.lockPos = tgt.pos.clone().setY(tgt.pos.y + 1);
      if (!a.fired && a.t >= a.windup) {
        a.fired = true;
        const eye = this.rig.eye.getWorldPosition(new THREE.Vector3());
        const dir = a.lockPos.clone().sub(eye).normalize();
        const end = eye.clone().addScaledVector(dir, 60);
        for (let t = 1; t < 60; t += 1) { const x = eye.x + dir.x * t, y = eye.y + dir.y * t, z = eye.z + dir.z * t; if (y < G.Terrain.getHeight(x, z)) { end.set(x, y, z); break; } }
        G.Proj.spawn({ kind: 'laser', pos: eye, end, owner: 'e', dmg: this.def.atk, color: this.def.trial ? 0x40c8ff : 0xff5a20, width: 0.3, src: this });
      }
    }
    if ((a.kind === 'hop' || a.kind === 'lunge' || a.kind === 'swoop') && a.t > a.windup && a.t < a.windup + a.active) {
      const sp = a.kind === 'hop' ? 6 : 10; this.vel.x = Math.sin(this._lungeDir) * sp; this.vel.z = Math.cos(this._lungeDir) * sp;
      if (a.kind === 'hop' && !this._hopped) { this.vel.y = 6; this._hopped = true; }
    }
    if (a.kind === 'spin' && a.t > a.windup && a.t < a.windup + a.active) { this.rotY += dt * 12; if (tgt) this.moveToward(tgt.pos.x, tgt.pos.z, this.def.spd * 0.7, dt); }
    if (a.proj && !a.fired && a.t >= a.windup && tgt) {
      a.fired = true;
      const o = this.pos.clone(); o.y += 1.4;
      const tp = tgt.pos.clone(); tp.y += 1.1;
      const dist = o.distanceTo(tp), sp = 34, tf = dist / sp;
      const v = tp.sub(o).normalize().multiplyScalar(sp); v.y += 0.5 * 9 * tf;
      G.Proj.spawn({ kind: 'arrow', pos: o, vel: v, owner: 'e', gravity: 9, dmg: this.def.atk, radius: 0.2, life: 4, src: this });
      G.Audio.play('arrow', { pos: this.pos, vol: 0.6 });
      this.atkCool = 2 + Math.random() * 1.5;
    }
    if (a.t > a.windup + a.active + a.recover) { this.atk = null; this._hopped = false; this.state = 'chase'; this.stateT = 0.5; this.atkCool = (this.def.guardian || this.def.laser) ? 2.5 + Math.random() * 2 : 0.6 + Math.random() * 1.2; }
    this.vel.x *= Math.exp(-3 * dt); this.vel.z *= Math.exp(-3 * dt);
  }
  // 攻撃がローカルプレイヤーに当たるか（ホスト・ゲスト共通）
  checkHitLocal() {
    const a = this.atk, pl = G.player;
    if (!a || !pl || pl.dead || pl.downed || a.proj || a.laser) return;
    if (a.t < a.windup || a.t > a.windup + a.active) return;
    if (!a.multi && this.lastHitSeq === this.atkSeq) return;
    if (a.multi && this._multiT > 0) { this._multiT -= 1 / 60; return; }
    const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > a.range + this.radius + 0.4) return;
    if (Math.abs(pl.pos.y - (this.pos.y + this.yOffset)) > 2.5) return;
    const ang = Math.abs(G.U.angDiff(this.rotY, Math.atan2(dx, dz)));
    if (ang > a.arc / 2 + 0.3) return;
    this.lastHitSeq = this.atkSeq; this._multiT = 0.4;
    pl.takeDamage(this.def.atk * a.mul, this.pos, this.elem, { src: this, kb: a.kind === 'smash' ? 9 : 5 });
  }
  moveToward(x, z, sp, dt) {
    const dx = x - this.pos.x, dz = z - this.pos.z, l = Math.hypot(dx, dz);
    if (l < 0.3) return;
    this.vel.x = G.U.damp(this.vel.x, dx / l * sp, 6, dt); this.vel.z = G.U.damp(this.vel.z, dz / l * sp, 6, dt);
    this.faceToward(x, z, dt, 6);
  }
  faceToward(x, z, dt, k) { this.rotY = G.U.dampAngle(this.rotY, Math.atan2(x - this.pos.x, z - this.pos.z), k, dt); }
  physics(dt, frozen) {
    if (frozen) { this.vel.x *= 0.9; this.vel.z *= 0.9; }
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    if (!this.local || true) G.Col.resolve(this.pos, this.radius * 0.8, this.height, this._res || (this._res = {}));
    // 水に入らない
    if (!this.local && G.Water.depthAt(this.pos.x, this.pos.z) > 1.0 && !this.def.flying) { this.pos.x -= this.vel.x * dt * 1.5; this.pos.z -= this.vel.z * dt * 1.5; this.vel.x *= -0.5; this.vel.z *= -0.5; }
    let floor = this.lookout ? Math.max(G.Col.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.5, 0.3), 0) : G.Col.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.6, 0.3);
    if (this.local) floor = G.Col.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.6, 0.3);
    this.vel.y -= 25 * dt; this.pos.y += this.vel.y * dt;
    if (this.pos.y <= floor) { this.pos.y = floor; this.vel.y = 0; }
    if (this.def.flying) this.yOffset = 2.5 + Math.sin(this.stateT * 2 + this.id) * 0.4;
  }
  // ---- 見た目更新 ----
  updateVisual(dt) {
    if (!this.model) return;
    const camD = G.camera.position.distanceTo(this.pos);
    const show = (this.alive || this.deadT < 0.6) && camD < this.visibleRange && (!this.interior || this.interior === G.Shrine.insideId);
    this.model.visible = show && (this.netSeen !== false);
    if (!this.model.visible) return;
    this.model.position.set(this.pos.x, this.pos.y + this.yOffset, this.pos.z);
    this.model.rotation.y = this.rotY;
    const r = this.rig, a = this.anim;
    let st = 'idle';
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (!this.alive) st = 'dead';
    else if (this.frozen > 0) st = a.st;
    else if (this.state === 'sleep') st = 'sleep';
    else if (this.stun > 0) st = 'stun';
    else if (this.state === 'hurt') st = 'hurt';
    else if (this.state === 'attack' && this.atk) {
      const k = this.atk.kind, inW = this.atk.t < this.atk.windup;
      st = k === 'shoot' ? 'shoot' : k === 'smash' ? (inW ? 'windup' : 'smash') : (inW ? 'windup' : 'attack');
      if (this.def.quad) st = 'attack';
    } else if (this.state === 'alert') st = this.def.quad ? 'idle' : 'roar';
    else st = hs > 4 ? 'run' : hs > 0.4 ? 'walk' : 'idle';
    if (a.st !== st) { a.st = st; a.t = 0; } else a.t += dt;
    if (r.parts) {
      r.phase += hs * dt * 1.6;
      a.prog = this.atk ? Math.max(0, (this.atk.t - this.atk.windup) / Math.max(0.01, this.atk.active + this.atk.recover * 0.3)) : 0;
      a.combo = this.atkSeq % 2; a.wtype = this.weaponId ? G.Items.weapons[this.weaponId].type : 'sword';
      if (this.frozen <= 0) G.Models.animHumanoid(r, a, dt);
    } else if (r.legFL) {
      r.phase += hs * dt * 1.4;
      a.prog = this.atk ? Math.min(1, Math.max(0, (this.atk.t - this.atk.windup) / 0.4)) : 0;
      if (this.frozen <= 0) G.Models.animQuad(r, { st: st === 'walk' || st === 'run' ? st : st === 'attack' ? 'attack' : st === 'dead' ? 'dead' : 'idle', t: a.t, prog: a.prog }, dt);
    } else if (r.kind === 'slime') {
      const t = a.t; const sq = this.atk && this.atk.t > this.atk.windup * 0.6 ? 0.7 : 1 + Math.sin(t * 6) * 0.08;
      r.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); if (!this.alive) r.body.scale.multiplyScalar(Math.max(0.01, 1 - this.deadT * 2));
    } else if (r.kind === 'bat') {
      const f = Math.sin(a.t * 18) * 0.8; r.wings[0].rotation.z = f; r.wings[1].rotation.z = -f;
    } else if (r.kind === 'guardian') {
      const t = a.t;
      r.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 6 + i) * 0.15 * Math.min(1, hs); });
      if (this.atk && this.atk.kind === 'laser') { const p = this.atk.t / this.atk.windup; r.eyeMat.color.setHex(Math.floor(p * 12) % 2 ? 0xffffff : (this.def.trial ? 0x40c8ff : 0xff5a20)); }
      else r.eyeMat.color.setHex(this.stun > 0 ? 0x333333 : (this.def.trial ? 0x40c8ff : 0xff5a20));
      if (this.atk && this.atk.lockPos && this.atk.t < this.atk.windup) G.Enemies.drawLaserSight(this, this.atk.lockPos);
      r.body.rotation.z = this.alive ? 0 : 0.5;
    }
    // 色フラッシュ／凍結
    const fl = this.flash > 0, fr = this.frozen > 0;
    if (fl !== this._fl || fr !== this._fr) {
      this._fl = fl; this._fr = fr;
      for (const m of this.mats) { if (!m.userData.om) m.userData.om = m.material; m.material = fl ? G.Mat.glow(0xffffff) : fr ? G.Mat.toon(0x9ae8ff) : m.userData.om; }
    }
    if (this.burn > 0 && Math.random() < 0.4) G.Particles.fire(G.tmp.v1.copy(this.pos).setY(this.pos.y + this.height * 0.6), 1);
    if (this.stun > 0 && Math.random() < 0.2) G.Particles.elec(G.tmp.v1.copy(this.pos).setY(this.pos.y + this.height), 1);
    if (!this.alive) { this.model.scale.setScalar(Math.max(0.01, 1 - this.deadT * 1.2) * (this.baseScale || 1)); }
    else if (this.model.scale.x !== (this.baseScale || 1) && !this.def.trial && !this.def.guardian && !this.boss) this.model.scale.setScalar(this.baseScale || 1);
  }
  // ネットワークから受信した状態を補間
  applyNet(dt) {
    const n = this.netTarget; if (!n) return;
    const k = 1 - Math.exp(-12 * dt), ox = this.pos.x, oz = this.pos.z;
    this.pos.x += (n.x - this.pos.x) * k; this.pos.y += (n.y - this.pos.y) * k; this.pos.z += (n.z - this.pos.z) * k;
    this.rotY = G.U.dampAngle(this.rotY, n.r, 12, dt);
    if (dt > 0) { const vx = (this.pos.x - ox) / dt, vz = (this.pos.z - oz) / dt; this.vel.x = G.U.damp(this.vel.x, vx, 8, dt); this.vel.z = G.U.damp(this.vel.z, vz, 8, dt); }
    if (this.atk) { this.atk.t += dt; }
    this.stateT += dt;
  }
};

// ===== 敵の管理 =====
G.Enemies = {
  list: [], byId: new Map(), grid: new Map(), alertEls: [], nextLocal: 100000,
  init(scene) {
    this.scene = scene;
    const r = G.U.rng(2024); let id = 1;
    // キャンプ
    G.World.camps.forEach((c, ci) => {
      const Z = G.Zones[c.zone]; const camp = G.Struct.campObjs[ci];
      for (let k = 0; k < c.n; k++) {
        let type = Z.melee[k % Z.melee.length];
        if (c.lizal && k % 2 === 0) type = Z.lizal;
        if (c.archer && k === 0) type = Z.archer;
        const a = k / c.n * Math.PI * 2 + r() * 0.5, d = 3 + r() * 3;
        const opts = { camp: ci, ry: a + Math.PI };
        let x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
        if (c.archer && k === 0 && camp && camp.lookout) { x = camp.lookout.x; z = camp.lookout.z; opts.lookout = camp.lookout; }
        this.add(new G.Enemy(id++, type, x, z, opts));
      }
    });
    // 野良の敵
    for (let k = 0; k < 140; k++) {
      const x = r.range(-740, 740), z = r.range(-740, 740);
      const h = G.Terrain.getHeight(x, z); if (h < 1.5) continue;
      if (G.World.villages.some(v => Math.hypot(v.x - x, v.z - z) < v.flat + 30)) continue;
      if (Math.hypot(x, z - 470) < 120 && r() < 0.6) continue;
      const reg = G.Terrain.regionAt(x, z); const zone = reg.zone;
      const m = G.Terrain.masks(x, z);
      let type = r.pick(G.Zones[zone].roam);
      if (m.snow > 0.5 && h > 50) type = r() < 0.5 ? 'slime_ice' : (r() < 0.5 ? 'wolf_white' : 'bat_ice');
      else if (m.dV < 240) type = r() < 0.5 ? 'slime_fire' : (r() < 0.4 ? 'bat_fire' : 'goblin_black');
      else if (m.lake > 0.5 && r() < 0.5) type = r() < 0.5 ? 'slime_elec' : G.Zones[zone].lizal;
      else if (m.forest > 0.5 && r() < 0.3) type = r() < 0.5 ? 'wolf' : 'bat';
      if (type === 'wolf' || type === 'wolf_white') { for (let w = 0; w < 3; w++) this.add(new G.Enemy(id++, type, x + w * 2, z + w * 1.5)); continue; }
      this.add(new G.Enemy(id++, type, x, z));
    }
    // 古代兵
    for (const [x, z] of G.World.guardians) this.add(new G.Enemy(id++, 'guardian', x, z));
    // ボス
    G.Bosses.spawnAll(id);
    for (const e of this.list) { e.pos.y = G.Col.floorAt(e.pos.x, e.pos.z, 9999); if (e.lookout) e.pos.y = e.lookout.y; e.home.y = e.pos.y; e.buildModel(scene); e.baseScale = e.model.scale.x; }
    // レーザー照準線
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.laserLine = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.8 })); this.laserLine.frustumCulled = false; this.laserLine.visible = false; scene.add(this.laserLine);
  },
  add(e) { this.list.push(e); this.byId.set(e.id, e); return e; },
  remove(e) { const i = this.list.indexOf(e); if (i >= 0) this.list.splice(i, 1); this.byId.delete(e.id); if (e.model) this.scene.remove(e.model); },
  addLocal(type, x, y, z, opts = {}) {
    const e = new G.Enemy(this.nextLocal++, type, x, z, Object.assign({ local: true }, opts));
    e.pos.y = y; e.home.y = y; e.buildModel(this.scene); e.baseScale = e.model.scale.x; e.interior = opts.interior || null;
    this.add(e); return e;
  },
  byCamp(ci) { return this.list.filter(e => e.camp === ci); },
  campCleared(ci) { return this.list.every(e => e.camp !== ci || !e.alive); },
  players() { const a = []; if (G.player) a.push(G.player); if (G.Net.role === 'host') for (const r of G.Remote.list()) if (r.interior === null || r.interior === undefined) a.push(r); return a; },
  nearby(x, z, r) { const out = []; for (const e of this.list) if (Math.abs(e.pos.x - x) < r && Math.abs(e.pos.z - z) < r && (!e.interior || e.interior === G.Shrine.insideId)) out.push(e); return out; },
  findLockTarget(pos, fwd) {
    let best = null, bs = 1e9;
    for (const e of this.nearby(pos.x, pos.z, 30)) {
      if (!e.alive) continue;
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, d = Math.hypot(dx, dz); if (d > 30) continue;
      const dot = (dx * fwd.x + dz * fwd.z) / (d || 1);
      if (dot < 0.2 && d > 5) continue;
      const s = d - dot * 10 - (e.boss ? 10 : 0);
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  },
  nearestInFront(pos, fwd, maxD) {
    let best = null, bd = maxD;
    for (const e of this.nearby(pos.x, pos.z, maxD + 2)) { if (!e.alive) continue; const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, d = Math.hypot(dx, dz) - e.radius; if (d < bd && (dx * fwd.x + dz * fwd.z) > 0) { bd = d; best = e; } }
    return best;
  },
  nearestInCone(o, dir, maxD, cosMin) {
    let best = null, bd = maxD;
    for (const e of this.nearby(o.x, o.z, maxD)) { if (!e.alive) continue; const v = G.tmp.v1.set(e.pos.x - o.x, e.pos.y + 1 - o.y, e.pos.z - o.z); const d = v.length(); if (d > bd) continue; if (v.normalize().dot(dir) < cosMin) continue; bd = d; best = e; }
    return best;
  },
  nearestTo(p, maxD, exclude) {
    let best = null, bd = maxD;
    for (const e of this.nearby(p.x, p.z, maxD)) { if (!e.alive || exclude.includes(e)) continue; const d = e.pos.distanceTo(p); if (d < bd) { bd = d; best = e; } }
    return best;
  },
  showAlert(e) { G.Hud.enemyAlert(e); },
  drawLaserSight(e, target) {
    const eye = e.rig.eye.getWorldPosition(G.tmp.v1);
    const a = this.laserLine.geometry.attributes.position.array;
    a[0] = eye.x; a[1] = eye.y; a[2] = eye.z; a[3] = target.x; a[4] = target.y; a[5] = target.z;
    this.laserLine.geometry.attributes.position.needsUpdate = true; this.laserLine.visible = true; this._laserShown = true;
    this.laserLine.material.color.setHex(e.def.trial ? 0x40c8ff : 0xff3020);
  },
  onDeath(e, killer) {
    G.Particles.poof(G.tmp.v1.copy(e.pos).setY(e.pos.y + e.yOffset + 0.8), e.def.guardian ? 0x553333 : 0x6a2a7a, e.boss ? 3 : e.def.guardian ? 2 : 1);
    G.Audio.play(e.def.guardian || e.boss ? 'explode' : 'poof', { pos: e.pos });
    if (e.def.slime && e.elem) this.slimeBurst(e);
    if (G.Net.role === 'host' && !e.local) G.Net.broadcast({ t: 'edead', id: e.id, x: +e.pos.x.toFixed(1), y: +e.pos.y.toFixed(1), z: +e.pos.z.toFixed(1), c: [...e.contrib] });
    this.rewardLocal(e, e.contrib.has(G.Net.myId) || e.local);
    G.Events.emit('enemyKilled', e);
  },
  // 撃破報酬（各プレイヤーが自分の分だけ受け取る）
  rewardLocal(e, contributed) {
    const pl = G.player; if (!pl) return;
    const near = pl.pos.distanceTo(e.pos) < 90;
    if (!near && !contributed) return;
    const d = e.def;
    G.Prog.addXP((d.xp || 0) * (e.boss ? 1 : 1));
    G.Prog.data.stats.kills++;
    if (d.trial || e.noDrop) return;
    const luck = 1 + G.Prog.skill('lucky') * 0.3;
    const pos = e.pos.clone(); pos.y += 0.5;
    if (d.money && d.money[1] > 0) G.Pickups.dropMoney(Math.round(G.U.randInt(d.money[0], d.money[1]) * luck), pos);
    for (const [id, p] of (d.drops || [])) if (Math.random() < p * luck) G.Pickups.dropMat(id, pos);
    if (e.weaponId && Math.random() < 0.85 && !e.boss) G.Pickups.dropWeapon(e.weaponId, pos);
    if (e.boss && e.bossDrops) for (const it of e.bossDrops) G.Pickups.dropItem(it, pos);
  },
  slimeBurst(e) {
    const p = e.pos.clone(); p.y += 0.5;
    if (e.elem === 'fire') G.Particles.fire(p, 20); else if (e.elem === 'ice') G.Particles.ice(p, 20); else G.Particles.elec(p, 20);
    const pl = G.player; if (pl && pl.pos.distanceTo(p) < 2.8) pl.takeDamage(e.def.atk, p, e.elem, { kb: 5 });
  },
  update(dt) {
    const isGuest = G.Net.role === 'guest';
    this._laserShown = false;
    const players = this.players();
    for (const e of this.list) {
      // 近くにプレイヤーがいる敵だけ動かす
      let near = 1e9; for (const p of players) { const d = Math.abs(p.pos.x - e.pos.x) + Math.abs(p.pos.z - e.pos.z); if (d < near) near = d; }
      if (isGuest && !e.local) {
        e.applyNet(dt);
        if (e.alive) { e.checkHitLocal(); e.flash = Math.max(0, e.flash - dt); }
        else e.deadT += dt;
      } else {
        if (!e.alive) {
          e.deadT += dt;
          if (!e.local && (!e.boss || e.kind === 'omega')) { e.respawnT -= dt; if (e.respawnT <= 0 && near > 100) this.respawn(e); }
        } else if (near < 150 || e.state === 'attack') {
          e.update(dt);
          e.checkHitLocal();
        }
      }
      e.updateVisual(dt);
    }
    this.laserLine.visible = this._laserShown;
    // 夜のスタル出現
    this.nightSpawnT = (this.nightSpawnT || 10) - dt;
    if (this.nightSpawnT <= 0 && G.Sky.isNight() && !G.Shrine.inside && G.player) {
      this.nightSpawnT = 25 + Math.random() * 20;
      const live = this.list.filter(e => e.type === 'stal' && e.alive).length;
      if (live < 6) {
        const a = Math.random() * 6.28, d = 18 + Math.random() * 15, x = G.player.pos.x + Math.cos(a) * d, z = G.player.pos.z + Math.sin(a) * d;
        if (G.Terrain.getHeight(x, z) > 1.5 && !G.World.villages.some(v => Math.hypot(v.x - x, v.z - z) < v.flat + 20)) {
          const e = this.addLocal('stal', x, G.Col.floorAt(x, z, 9999), z); e.noRespawn = true;
          e.state = 'alert'; e.target = G.player; G.Particles.dust(e.pos);
        }
      }
    }
    // 朝になったらスタルは消える
    if (!G.Sky.isNight()) for (const e of this.list.slice()) if (e.type === 'stal' && e.alive && e.noRespawn) { G.Particles.poof(e.pos, 0x555555); this.remove(e); }
    for (const e of this.list.slice()) if (e.local && !e.alive && e.deadT > 2) this.remove(e);
  },
  respawn(e) {
    e.alive = true; e.hp = e.maxHp; e.state = 'idle'; e.pos.copy(e.home); e.vel.set(0, 0, 0); e.burn = e.frozen = e.stun = 0; e.atk = null; e.contrib.clear(); e.deadT = 0;
    if (e.droppedWeapon && !e.weaponId) { e.weaponId = e.droppedWeapon; e.droppedWeapon = null; if (e.wmesh && e.rig.handR) e.rig.handR.add(e.wmesh); }
    e.model.scale.setScalar(e.baseScale || 1);
    if (e.onRespawn) e.onRespawn();
    if (G.Net.role === 'host') G.Net.broadcast({ t: 'erespawn', id: e.id });
  },
  // 宿で寝た時など
  respawnAll() { for (const e of this.list) if (!e.alive && !e.local && !e.boss) this.respawn(e); },
  // ---- ネット用 ----
  snapshot(forPos) {
    const out = [];
    for (const e of this.list) {
      if (e.local) continue;
      if (forPos && Math.abs(e.pos.x - forPos.x) + Math.abs(e.pos.z - forPos.z) > 180) continue;
      out.push([e.id, +e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2), +e.rotY.toFixed(2), Math.max(0, Math.round(e.hp)), e.alive ? 1 : 0,
        e.state === 'attack' && e.atk ? e.atk.kind : e.state, e.atk ? +e.atk.t.toFixed(2) : 0, e.atkSeq, (e.frozen > 0 ? 1 : 0) | (e.burn > 0 ? 2 : 0) | (e.stun > 0 ? 4 : 0),
        e.atk && e.atk.lockPos ? [+e.atk.lockPos.x.toFixed(1), +e.atk.lockPos.y.toFixed(1), +e.atk.lockPos.z.toFixed(1)] : 0]);
      if (e.boss) out[out.length - 1].push(e.maxHp, e.phase, +e.stun.toFixed(1), +e.cooled.toFixed(1), e.engaged ? 1 : 0);
    }
    return out;
  },
  applySnapshot(arr, dt) {
    for (const s of arr) {
      const e = this.byId.get(s[0]); if (!e) continue;
      const [id, x, y, z, r, hp, alive, st, at, seq, fl, lp] = s;
      e.netTarget = { x, y, z, r, dt };
      if (!e._init) { e.pos.set(x, y, z); e._init = true; }
      e.hp = hp; e.netSeen = true;
      if (!alive && e.alive) { e.alive = false; e.state = 'dead'; e.deadT = 0; }
      if (alive && !e.alive) { e.alive = true; e.deadT = 0; e.model.scale.setScalar(e.baseScale || 1); }
      e.frozen = fl & 1 ? 1 : 0; e.burn = fl & 2 ? 1 : 0; e.stun = fl & 4 ? 1 : 0;
      const kinds = ['swing', 'smash', 'hop', 'lunge', 'shoot', 'laser', 'spin', 'swoop'];
      if (e.isAttackKind ? e.isAttackKind(st) : kinds.includes(st)) {
        if (!e.atk || e.atkSeq !== seq) { e.startAttack(st); e.atkSeq = seq; }
        if (e.atk) { e.atk.t = at; if (lp) e.atk.lockPos = new THREE.Vector3(lp[0], lp[1], lp[2]); if (st === 'laser') e.atk.fired = true; }
        e.state = 'attack';
      } else { e.atk = null; e.state = st; }
      if (e.boss && e.applyBossNet) e.applyBossNet(s);
    }
  },
};
