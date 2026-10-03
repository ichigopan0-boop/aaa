// ===== プレイヤー =====
'use strict';
G.Player = class {
  constructor(scene, color) {
    this.scene = scene;
    this.rig = G.Models.hero(color);
    scene.add(this.rig.root);
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.rotY = Math.PI;
    this.state = 'ground'; this.stateT = 0;
    this.hp = G.Prog.maxHp(); this.stamina = this.maxStamina(); this.mp = G.Prog.maxMp();
    this.exhausted = false; this.staminaDelay = 0; this.staminaShow = 0;
    this.onGround = true; this.groundInfo = {}; this.airMaxY = 0; this.jumpT = 0;
    this.attack = null; this.chargeT = 0; this.dodge = null; this.aiming = false; this.drawT = 0; this.cast = null;
    this.invuln = 0; this.hurtT = 0; this.lockTarget = null; this.sneaking = false; this.drawnT = 0;
    this.lastSafe = new THREE.Vector3(); this.safeT = 0; this.burn = 0; this.tempT = 0; this.stun = 0; this.slow = 0;
    this.dead = false; this.downed = false; this.downT = 0; this.flurry = 0; this.flurryTarget = null;
    this.climb = null; this.res = {}; this.radius = 0.38; this.height = 1.8;
    this.stepPhase = 0; this.plunge = false; this.focus = false; this.swimDash = 0; this.dashing = false; this.respawnT = 0;
    this.anim = { st: 'idle', t: 0 };
    this.meshes = {};
    this.refreshWeapons();
    G.Events.on('invChanged', () => this.refreshWeapons());
  }
  maxStamina() { return G.Prog.maxStamina(); }
  setColor(c) { this.scene.remove(this.rig.root); this.rig = G.Models.hero(c); this.scene.add(this.rig.root); this.meshes = {}; this.refreshWeapons(); }
  // ---- 武器の見た目 ----
  refreshWeapons() {
    const P = G.Prog, ids = { melee: P.equipped('melee'), bow: P.equipped('bow'), rod: P.equipped('rod') };
    for (const cat of ['melee', 'bow', 'rod']) {
      const w = ids[cat], id = w && (w.dur > 0 || G.Items.weapons[w.id].legendary && !w.sleep) ? w.id : null;
      const cur = this.meshes[cat];
      if (cur && cur.userData.id === id) continue;
      if (cur && cur.parent) cur.parent.remove(cur);
      this.meshes[cat] = null;
      if (id) { const m = G.Models.weapon(id); m.userData.id = id; this.meshes[cat] = m; }
    }
    this.placeWeapons(true);
  }
  placeWeapons(force) {
    const r = this.rig, drawn = this.drawnT > 0 || this.attack || this.state === 'charge' || this.state === 'spin' || (this.state === 'ride' && this.attack);
    const aiming = this.aiming && this.state !== 'climb' && this.state !== 'glide' && this.state !== 'swim';
    const casting = !!this.cast;
    const key = (drawn ? 1 : 0) + (aiming ? 2 : 0) + (casting ? 4 : 0) + this.state;
    if (!force && key === this._wkey) return; this._wkey = key;
    const m = this.meshes.melee, b = this.meshes.bow, rd = this.meshes.rod;
    const hide = this.state === 'climb' || this.state === 'swim' || this.state === 'glide';
    if (m) {
      if (drawn && !aiming && !casting && !hide) { r.handR.add(m); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.setScalar(1); }
      else { r.back.add(m); m.position.set(0.15, 0.1, -0.02); m.rotation.set(0, 0, 2.5); m.scale.setScalar(0.85); }
    }
    if (b) {
      if (aiming) { r.handL.add(b); b.position.set(0, 0, 0); b.rotation.set(Math.PI / 2, 0, Math.PI / 2); }
      else { r.back.add(b); b.position.set(-0.1, 0, -0.05); b.rotation.set(0, Math.PI / 2, 0.3); }
    }
    if (rd) {
      if (casting) { r.handR.add(rd); rd.position.set(0, 0, 0); rd.rotation.set(0, 0, 0); rd.visible = true; }
      else { r.back.add(rd); rd.position.set(0.05, -0.1, -0.06); rd.rotation.set(0, 0, -2.6); rd.scale.setScalar(0.8); }
    }
    r.glider.visible = this.state === 'glide';
  }
  hasMetalEquipped() { const d = G.Prog.equippedDef('melee'); return !!(d && d.metal && this.state !== 'swim'); }
  handWorld() { return this.rig.handR.getWorldPosition(new THREE.Vector3()); }
  facing(out) { return (out || new THREE.Vector3()).set(Math.sin(this.rotY), 0, Math.cos(this.rotY)); }
  // ---- テレポート ----
  teleport(x, y, z, ry) {
    this.pos.set(x, y != null ? y : G.Col.floorAt(x, z, 9999) + 0.05, z); this.vel.set(0, 0, 0);
    if (ry != null) this.rotY = ry;
    this.state = 'ground'; this.climb = null; this.attack = null; this.dodge = null; this.airMaxY = this.pos.y;
    this.lastSafe.copy(this.pos);
    if (G.Horse && this.riding) G.Horse.dismount(true);
  }
  // ---- メイン更新 ----
  update(dt) {
    const I = G.Input, P = G.Prog;
    const canAct = G.state === 'playing' && !this.dead && !G.UI.anyOpen();
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.stun = Math.max(0, this.stun - dt);
    this.slow = Math.max(0, this.slow - dt);
    this.drawnT = Math.max(0, this.drawnT - dt);
    this.jumpT += dt;
    // MP自然回復
    this.mp = Math.min(P.maxMp(), this.mp + dt * 1.2 * (1 + P.skill('mpRegen') * 0.5));
    // 燃焼
    if (this.burn > 0) { this.burn -= dt; if (Math.random() < 0.5) G.Particles.fire(this.pos.clone().setY(this.pos.y + 1), 1); this._burnT = (this._burnT || 0) - dt; if (this._burnT <= 0) { this._burnT = 1; this.hurt(1, true); } if (this.state === 'swim') this.burn = 0; }
    if (this.downed) { this.updateDowned(dt, canAct); this.animate(dt); return; }
    if (this.dead) { this.animate(dt); return; }
    // 入力
    const mv = canAct ? I.moveVec() : { x: 0, y: 0, len: 0 };
    const yaw = G.Cam.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let wx = rx * mv.x + fx * mv.y, wz = rz * mv.x + fz * mv.y;
    const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
    this.wish = { x: wx, z: wz, len: Math.min(1, wl), mx: mv.x, my: mv.y };
    if (canAct) this.handleActions(dt);
    if (this.stun > 0) { this.wish.x = this.wish.z = this.wish.len = 0; }
    switch (this.state) {
      case 'ground': case 'attack': case 'charge': case 'spin': case 'cast': case 'hurt': case 'dodge': case 'interact': this.updateGround(dt); break;
      case 'air': case 'plunge': this.updateAir(dt); break;
      case 'glide': this.updateGlide(dt); break;
      case 'climb': this.updateClimb(dt); break;
      case 'swim': this.updateSwim(dt); break;
      case 'ride': this.updateRide(dt); break;
    }
    this.updateStamina(dt);
    this.updateEnvironment(dt);
    this.placeWeapons();
    this.animate(dt);
  }
  // ---- 行動入力 ----
  handleActions(dt) {
    const I = G.Input, P = G.Prog;
    // ロックオン
    if (I.pressed('lock')) {
      if (this.lockTarget) this.lockTarget = null;
      else { this.lockTarget = G.Enemies.findLockTarget(this.pos, G.Cam.forward(G.tmp.v1)); if (this.lockTarget) { G.Audio.play('select'); this.drawnT = 5; } }
    }
    if (this.lockTarget && (!this.lockTarget.alive || this.lockTarget.pos.distanceTo(this.pos) > 40)) this.lockTarget = null;
    if (I.pressed('sneak')) { this.sneaking = !this.sneaking; }
    if (I.pressed('heal')) P.quickHeal();
    if (I.pressed('whistle')) G.Horse.call();
    if (I.pressed('arrowType')) P.cycleArrow();
    if (I.pressed('cycle1')) P.cycle('melee');
    if (I.pressed('cycle2')) P.cycle('bow');
    if (I.pressed('cycle3')) P.cycle('rod');
    // 弓を構える
    const bowDef = P.equippedDef('bow');
    let wantAim = I.down('aim') || (G.Touch && G.Touch.aimToggle);
    if (wantAim && !bowDef) { if (I.pressed('aim') || (G.Touch && G.Touch.aimJustOn)) { G.Hud.notify('弓を持っていない'); } wantAim = false; if (G.Touch) G.Touch.aimToggle = false; }
    const aimable = ['ground', 'air', 'ride', 'glide'].includes(this.state) || (this.state === 'attack' && false);
    if (wantAim && aimable && !this.attack && !this.dodge) {
      if (!this.aiming) { this.aiming = true; this.drawT = 0; G.Audio.play('bowDraw'); }
      if (this.state === 'glide') this.setState('air');
    } else if (this.aiming) { this.aiming = false; this.drawT = 0; this.focus = false; }
    if (G.Touch) G.Touch.aimJustOn = false;
    if (this.aiming) {
      const drawTime = (bowDef && bowDef.fast ? 0.32 : 0.5) * (1 - P.skill('quick') * 0.25);
      this.drawT = Math.min(drawTime, this.drawT + dt);
      this.drawFrac = this.drawT / drawTime;
      if (I.pressed('attack') && this.drawFrac > 0.35) this.shootArrow(bowDef);
      // 空中で集中
      this.focus = this.state === 'air' && P.skill('focus') > 0 && this.stamina > 0 && !this.exhausted;
      return;
    }
    // 魔法
    if (I.pressed('magic')) this.castMagic();
    // 攻撃
    if (I.pressed('attack')) this.onAttackPressed();
    if (this.attack && I.down('attack')) { this.chargeHold = (this.chargeHold || 0) + dt; } else this.chargeHold = 0;
    if (this.attack && this.chargeHold > 0.42 && this.state === 'attack' && this.attack.combo === 0 && G.Prog.equipped('melee')) { this.attack = null; this.setState('charge'); this.chargeT = 0; }
    if (this.state === 'charge' && !I.down('attack')) this.releaseCharge();
    // ジャンプ・回避
    if (I.pressed('jump')) this.onJump();
    if (I.pressed('dodge')) this.startDodge(null);
    if (I.pressed('dash') && this.state === 'swim') this.swimDash = 0.5;
    // 調べる
    if (I.pressed('interact')) {
      const o = G.Interact.find(this.pos.x, this.pos.y, this.pos.z, Math.sin(this.rotY), Math.cos(this.rotY));
      if (o && ['ground', 'swim', 'ride'].includes(this.state)) { o.action(o); }
    }
  }
  setState(s) { if (this.state !== s) { this.state = s; this.stateT = 0; } }
  onJump() {
    if (this.state === 'ground' && this.onGround && !this.attack && this.stun <= 0) {
      if (this.lockTarget && this.wish.len > 0.3) { this.startDodge(this.wish.mx); return; }
      if (this.lockTarget && this.wish.len <= 0.3) { this.startDodge('back'); return; }
      this.vel.y = 9.6; this.onGround = false; this.setState('air'); this.jumpT = 0; this.airMaxY = this.pos.y;
      G.Audio.play('jump'); G.Particles.dust(this.pos);
    } else if (this.state === 'air' && this.jumpT > 0.18 && G.Prog.data.flags.paraglider && this.stamina > 0 && !this.exhausted && !this.aiming) {
      this.setState('glide'); G.Audio.play('glide'); this.plunge = false;
    } else if (this.state === 'glide') { this.setState('air'); this.jumpT = 0.2; }
    else if (this.state === 'climb') this.climbJump();
    else if (this.state === 'ride') G.Horse.jump();
  }
  // ---- 回避 ----
  startDodge(kind) {
    if (this.state !== 'ground' || !this.onGround || this.dodge || this.stun > 0) return;
    if (this.attack && this.attack.prog < 0.5) return;
    this.attack = null;
    let dx = this.wish.x, dz = this.wish.z, k = 'roll';
    if (kind === 'back' || (this.lockTarget && this.wish.len < 0.3)) { dx = -Math.sin(this.rotY); dz = -Math.cos(this.rotY); k = 'backflip'; }
    else if (typeof kind === 'number' && this.lockTarget) { const s = Math.sign(kind) || 1; dx = Math.cos(this.rotY) * -s; dz = -Math.sin(this.rotY) * -s; k = 'sidehop'; this._hopDir = s; }
    else if (this.wish.len < 0.2) { dx = Math.sin(this.rotY); dz = Math.cos(this.rotY); }
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    this.dodge = { t: 0, dur: k === 'roll' ? 0.5 : 0.45, dx, dz, kind: k };
    if (k !== 'roll') this.vel.y = 4.5;
    if (k === 'roll' && !this.lockTarget) this.rotY = Math.atan2(dx, dz);
    this.setState('dodge'); this.invuln = Math.max(this.invuln, 0.32);
    G.Audio.play('jump', { pitch: 1.3 });
  }
  // 完璧回避 → ラッシュ
  tryFlurry(src) {
    if (this.dodge && this.dodge.t < 0.28 && src && src.alive !== false) {
      this.flurry = 2.4 + G.Prog.skill('flurry') * 0.8; this.flurryTarget = src;
      G.timeScaleTarget = 0.12; G.Audio.play('flurry'); G.Hud.centerMsg('ラッシュ！', 0.8);
      return true;
    }
    return false;
  }
  // ---- 近接攻撃 ----
  meleeInfo() {
    const def = G.Prog.equippedDef('melee'); const w = G.Prog.equipped('melee');
    const usable = def && w && (w.dur > 0);
    const type = usable ? def.type : 'fist';
    const sk = G.Prog.skill('combo');
    const T = {
      sword: { durs: [0.36, 0.36, 0.44, 0.52], max: 3 + sk, range: 2.4, arc: 2.3, mul: [1, 1, 1.15, 1.4] },
      heavy: { durs: [0.72, 0.8, 0.85], max: 2 + sk, range: 3.0, arc: 2.9, mul: [1, 1.15, 1.4] },
      spear: { durs: [0.26, 0.26, 0.26, 0.3, 0.26, 0.4], max: 4 + sk * 2, range: 3.4, arc: 1.0, mul: [1, 1, 1, 1.1, 1, 1.3] },
      fist: { durs: [0.3, 0.3, 0.4], max: 3, range: 1.5, arc: 1.6, mul: [1, 1, 1.3] },
    }[type];
    return { def: usable ? def : { atk: 1, type: 'fist' }, type, T };
  }
  onAttackPressed() {
    if (this.flurry > 0 && this.flurryTarget) { this.flurryStrike(); return; }
    if (this.state === 'air' && G.Prog.equipped('melee')) { this.plunge = true; this.setState('plunge'); this.vel.y = -22; this.vel.x *= 0.3; this.vel.z *= 0.3; this.drawnT = 4; return; }
    if (this.state === 'ride') { if (!this.attack) this.startAttack(0); return; }
    if (this.attack) { if (this.attack.prog > 0.3) this.attack.queued = true; return; }
    if (['ground', 'dodge'].includes(this.state) && !this.dodge) this.startAttack(0);
  }
  startAttack(combo) {
    const mi = this.meleeInfo();
    const dur = mi.T.durs[Math.min(combo, mi.T.durs.length - 1)];
    this.attack = { combo, t: 0, dur, prog: 0, hit: new Set(), info: mi, landed: false, queued: false, swung: false };
    if (this.state !== 'ride') this.setState('attack');
    this.drawnT = 5;
    // 近くの敵の方を向く
    const tgt = this.lockTarget || G.Enemies.nearestInFront(this.pos, this.facing(G.tmp.v1), 4.5);
    if (tgt && this.state !== 'ride') this.rotY = Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z);
    else if (this.wish.len > 0.3 && this.state !== 'ride') this.rotY = Math.atan2(this.wish.x, this.wish.z);
  }
  updateAttack(dt) {
    const a = this.attack; if (!a) return;
    a.t += dt; a.prog = Math.min(1, a.t / a.dur);
    const mi = a.info, T = mi.T;
    if (!a.swung && a.prog > 0.18) { a.swung = true; G.Audio.play(mi.type === 'heavy' ? 'swingHeavy' : 'swing'); }
    if (this.state !== 'ride' && a.prog < 0.35) { const f = this.facing(G.tmp.v1); const lunge = mi.type === 'spear' ? 2 : 3.5; this.vel.x = f.x * lunge; this.vel.z = f.z * lunge; }
    if (a.prog > 0.22 && a.prog < 0.6) {
      const f = this.facing(G.tmp.v2); const range = T.range * (this.state === 'ride' ? 1.3 : 1);
      const hitsBefore = a.hit.size;
      G.Combat.arcHit(this.pos, f.x, f.z, range, T.arc, (e, remote) => this.meleeHit(e, remote, T.mul[Math.min(a.combo, T.mul.length - 1)]), a.hit);
      // 鉱石・木など
      G.Pickups.meleeHit(this.pos, f, range, a);
      if (a.hit.size > hitsBefore && !a.landed) { a.landed = true; if (G.Prog.equipped('melee')) G.Prog.useDurability('melee', 1); }
      const tip = this.handWorld(); G.Particles.trail(tip.addScaledVector(f, 0.8), mi.def.glow || 0xffffff, 0.25);
    }
    if (a.prog >= 1) {
      if (a.queued && a.combo + 1 < T.max) this.startAttack(a.combo + 1);
      else { this.attack = null; if (this.state === 'attack') this.setState('ground'); }
    }
  }
  meleeHit(e, remote, mul) {
    const mi = this.attack ? this.attack.info : this.meleeInfo();
    const res = G.Combat.meleeDamage(mi.def, mul, e);
    let dmg = res.dmg;
    if (!remote && e.unaware && e.unaware() && (this.sneaking || e.state === 'sleep')) { dmg *= G.Prog.skill('sneak') ? 6 : 4; G.Hud.centerMsg('不意打ち！', 0.7); }
    const f = this.facing(G.tmp.v3);
    const kb = mi.type === 'heavy' ? 6 : mi.type === 'spear' ? 2.5 : 3.5;
    if (remote) { G.Combat.hitRemote(e, dmg * 0.6, { elem: mi.def.elem, kx: f.x, kz: f.z }); }
    else G.Combat.hitEnemy(e, dmg, { elem: mi.def.elem, crit: res.crit, kx: f.x, kz: f.z, kb, src: 'melee' });
    G.Particles.hit(G.tmp.v4.copy(e.pos).setY(e.pos.y + (e.height || 1.6) * 0.55), res.crit);
    G.Audio.play(mi.def.metal ? 'hitMetal' : 'hit', { vol: 0.9 });
    if (res.crit) G.Audio.play('crit');
    G.hitStop = Math.max(G.hitStop || 0, mi.type === 'heavy' ? 0.08 : 0.045);
    G.Cam.addShake(mi.type === 'heavy' ? 0.25 : 0.12);
  }
  releaseCharge() {
    if (this.state !== 'charge') return;
    const full = this.chargeT > 0.25;
    const cost = 25 * (1 - G.Prog.skill('spin') * 0.25);
    if (!full || this.stamina <= 0 || this.exhausted) { this.setState('ground'); return; }
    this.useStamina(cost);
    this.setState('spin'); this.spinT = 0; this.spinHit = new Set();
    G.Audio.play('swingHeavy'); G.Audio.play('swing', { pitch: 1.3 });
  }
  updateSpin(dt) {
    this.spinT += dt; const dur = 0.45;
    this.rotY += dt * Math.PI * 2 / dur;
    const mi = this.meleeInfo(); const mul = 2 + G.Prog.skill('spin') * 0.5;
    G.Combat.arcHit(this.pos, 0, 1, mi.T.range + 0.6, Math.PI * 2.01, (e, remote) => this.meleeHit(e, remote, mul), this.spinHit);
    G.Pickups.meleeHit(this.pos, this.facing(G.tmp.v1), mi.T.range + 0.6, { hit: this.spinHit });
    G.Particles.trail(this.handWorld(), 0xbfe8ff, 0.35);
    if (this.spinT >= dur) { if (this.spinHit.size && G.Prog.equipped('melee')) G.Prog.useDurability('melee', 1); this.setState('ground'); }
  }
  flurryStrike() {
    const e = this.flurryTarget; if (!e || !e.alive) { this.flurry = 0; return; }
    const d = G.tmp.v1.subVectors(this.pos, e.pos); d.y = 0; d.normalize().multiplyScalar((e.radius || 0.6) + 1.2);
    this.pos.x = e.pos.x + d.x; this.pos.z = e.pos.z + d.z;
    this.rotY = Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
    this.attack = null; this.startAttack(Math.floor(Math.random() * 3)); this.attack.dur *= 0.4;
    this.attack.hit.clear();
  }
  // ---- 弓 ----
  shootArrow(bowDef) {
    const P = G.Prog, w = P.equipped('bow');
    if (!w || w.dur <= 0) return;
    const at = P.useArrow();
    if (!at) { G.Hud.notify('矢がない！'); G.Audio.play('error'); return; }
    const origin = G.tmp.v1.set(this.pos.x, this.pos.y + 1.45, this.pos.z);
    const right = G.tmp.v2.set(Math.cos(G.Cam.yaw), 0, -Math.sin(G.Cam.yaw));
    origin.addScaledVector(right, 0.25);
    const target = this.aimPoint(160);
    const dir = target.clone().sub(origin).normalize();
    const speed = bowDef.ancient ? 110 : 72, grav = bowDef.ancient ? 2 : 8;
    // 重力の分だけ上向きに補正
    const dist = target.distanceTo(origin); const tflight = dist / speed; dir.y += 0.5 * grav * tflight / speed; dir.normalize();
    const n = (bowDef.multi || 1) + (P.skill('multi') ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const spread = n > 1 ? (i - (n - 1) / 2) * 0.07 : 0;
      const d = dir.clone().applyAxisAngle(G.tmp.v3.set(0, 1, 0), spread);
      G.Proj.spawn({ kind: 'arrow', pos: origin.clone(), vel: d.multiplyScalar(speed * (0.55 + 0.45 * this.drawFrac)), owner: 'p', gravity: grav, life: 5, radius: 0.15, atype: at, elem: G.Items.arrows[at].elem, bowId: w.id, color: G.Items.arrows[at].color, dmg: bowDef.atk });
    }
    P.useDurability('bow', 1);
    G.Audio.play('arrow'); this.drawT = 0;
    if (at !== 'normal' && P.arrowCount(at) <= 0) { P.data.equip.arrow = 'normal'; }
  }
  // 画面中央の照準先
  aimPoint(maxD) {
    const o = G.camera.position, d = G.Cam.aimRay(G.tmp.v3);
    if (this.lockTarget && this.lockTarget.alive) { const lt = this.lockTarget; const w = lt.weakPoint ? lt.weakPoint(new THREE.Vector3()) : null; return w && !lt.boss ? w : lt.pos.clone().setY(lt.pos.y + (lt.yOffset || 0) + (lt.height || 1.5) * 0.6); }
    let best = maxD;
    for (const e of G.Enemies.nearby(o.x + d.x * 40, o.z + d.z * 40, 70)) {
      if (!e.alive) continue;
      const c = G.tmp.v4.copy(e.pos); c.y += (e.height || 1.5) * 0.5;
      const t = G.tmp.v2.subVectors(c, o).dot(d); if (t < 0 || t > best) continue;
      const pd = G.tmp.v2.copy(o).addScaledVector(d, t).distanceTo(c);
      if (pd < (e.radius || 0.6) + 0.3) best = t;
    }
    for (let t = 2; t < best; t += 1.5) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y < G.Terrain.getHeight(x, z) || G.Col.pointHit(x, y, z)) { best = t; break; } }
    return new THREE.Vector3(o.x + d.x * best, o.y + d.y * best, o.z + d.z * best);
  }
  // ---- 魔法 ----
  castMagic() {
    const P = G.Prog, w = P.equipped('rod'), def = P.equippedDef('rod');
    if (!w || !def || w.dur <= 0) { G.Hud.notify('ロッドを持っていない'); return; }
    if (this.cast || !['ground', 'air', 'ride'].includes(this.state) || this.attack) return;
    if (this.mp < def.mp) { G.Hud.notify('MPが足りない！'); G.Audio.play('error'); return; }
    this.mp -= def.mp; this.cast = { t: 0, def, fired: false };
    if (this.state === 'ground') this.setState('cast');
    if (this.lockTarget) this.rotY = Math.atan2(this.lockTarget.pos.x - this.pos.x, this.lockTarget.pos.z - this.pos.z);
    else this.rotY = Math.atan2(-Math.sin(G.Cam.yaw), -Math.cos(G.Cam.yaw));
  }
  updateCast(dt) {
    const c = this.cast; if (!c) return;
    c.t += dt;
    if (!c.fired && c.t > 0.15) {
      c.fired = true; const def = c.def;
      const origin = this.handWorld(); origin.y += 0.5;
      const target = this.lockTarget ? this.lockTarget.pos.clone().setY(this.lockTarget.pos.y + (this.lockTarget.height || 1.5) * 0.5) : this.aimPoint(120);
      const dir = target.clone().sub(origin).normalize();
      const dmg = G.Combat.magicDamage(def, null);
      const n = def.triple ? 3 : 1;
      if (def.magic === 'elec') this.castLightning(origin, dir, def, n);
      else if (def.magic === 'beam') {
        const end = origin.clone().addScaledVector(dir, 45);
        G.Proj.spawn({ kind: 'beam', pos: origin, end, owner: 'p', color: 0x40e0ff, width: 0.35, dmg });
        for (const e of G.Enemies.nearby(origin.x + dir.x * 22, origin.z + dir.z * 22, 30)) {
          if (!e.alive) continue; const cpos = G.tmp.v4.copy(e.pos); cpos.y += (e.height || 1.5) / 2;
          if (G.Proj.segDist(cpos, origin, end) < (e.radius || 0.6) + 0.6) G.Combat.hitEnemy(e, G.Combat.magicDamage(def, e), { kx: dir.x, kz: dir.z, kb: 4 });
        }
        G.Audio.play('laser');
      } else {
        for (let i = 0; i < n; i++) {
          const d = dir.clone().applyAxisAngle(G.tmp.v3.set(0, 1, 0), (i - (n - 1) / 2) * 0.18);
          G.Proj.spawn({ kind: def.magic === 'fire' ? 'fireball' : 'ice', pos: origin.clone(), vel: d.multiplyScalar(def.magic === 'fire' ? 28 : 34), owner: 'p', elem: def.magic, dmg, radius: 0.45, life: 3 });
        }
        G.Audio.play(def.magic === 'fire' ? 'fire' : 'ice');
      }
      G.Prog.useDurability('rod', 1);
    }
    if (c.t > 0.4) { this.cast = null; if (this.state === 'cast') this.setState('ground'); }
  }
  castLightning(origin, dir, def, n) {
    const hits = []; let from = origin.clone();
    const first = G.Enemies.nearestInCone(origin, dir, 30, 0.5);
    let cur = first;
    for (let k = 0; k < 2 + n; k++) {
      if (!cur || hits.includes(cur)) break;
      hits.push(cur);
      const to = cur.pos.clone().setY(cur.pos.y + (cur.height || 1.5) * 0.5);
      G.Proj.spawn({ kind: 'bolt', pos: from.clone(), end: to, owner: 'p', color: 0xfff066, width: 0.12 });
      G.Combat.hitEnemy(cur, G.Combat.magicDamage(def, cur) * (k === 0 ? 1 : 0.7), { elem: 'elec', kb: 1 });
      G.Particles.elec(to, 10);
      from = to; cur = G.Enemies.nearestTo(to, 9, hits);
    }
    if (!hits.length) { const end = origin.clone().addScaledVector(dir, 25); G.Proj.spawn({ kind: 'bolt', pos: origin, end, owner: 'p', color: 0xfff066, width: 0.12 }); }
    G.Audio.play('zap');
  }
  // ---- 地上 ----
  updateGround(dt) {
    const P = G.Prog, w = this.wish;
    if (this.state === 'attack' || (this.attack && this.state === 'ride')) this.updateAttack(dt);
    if (this.state === 'spin') this.updateSpin(dt);
    if (this.cast) this.updateCast(dt);
    if (this.state === 'charge') { this.chargeT += dt; this.drawnT = 5; if (Math.random() < 0.3) G.Particles.sparkle(this.handWorld(), 0xbfe8ff); }
    if (this.flurry > 0) { this.flurry -= dt; if (this.flurry <= 0) { G.timeScaleTarget = 1; this.flurryTarget = null; } }
    let speed = 0, accel = 14;
    const locked = !!this.lockTarget;
    this.dashing = false;
    if (this.state === 'dodge') {
      const d = this.dodge; d.t += dt; d.prog = d.t / d.dur;
      const sp = d.kind === 'roll' ? 9 : 8;
      this.vel.x = d.dx * sp * (1 - d.prog * 0.5); this.vel.z = d.dz * sp * (1 - d.prog * 0.5);
      if (d.t >= d.dur) { this.dodge = null; this.setState('ground'); }
    } else if (this.state === 'hurt') {
      this.vel.x *= Math.exp(-4 * dt); this.vel.z *= Math.exp(-4 * dt);
      if (this.hurtT <= 0) this.setState('ground');
    } else if (this.state === 'ground') {
      const dashHeld = G.Input.down('dash');
      let base = w.len < 0.55 ? 3.4 : 6.2;
      if (this.sneaking) base = 2.3;
      if (dashHeld && w.len > 0.1 && this.stamina > 0 && !this.exhausted && !this.sneaking && !this.aiming) { base = 9.6; this.dashing = true; this.useStamina(16 * dt); }
      if (this.aiming || this.state === 'charge') base = 2.6;
      if (this.exhausted) base = Math.min(base, 3.0);
      if (this.slow > 0) base *= 0.5;
      base *= 1 + P.buff('speed') * 0.12;
      speed = base * w.len;
      const tx = w.x / Math.max(w.len, 0.001) * speed, tz = w.z / Math.max(w.len, 0.001) * speed;
      if (w.len > 0.01) { this.vel.x = G.U.damp(this.vel.x, tx, accel, dt); this.vel.z = G.U.damp(this.vel.z, tz, accel, dt); }
      else { this.vel.x = G.U.damp(this.vel.x, 0, 18, dt); this.vel.z = G.U.damp(this.vel.z, 0, 18, dt); }
      // 向き
      if (this.aiming) this.rotY = G.U.dampAngle(this.rotY, Math.atan2(-Math.sin(G.Cam.yaw), -Math.cos(G.Cam.yaw)), 20, dt);
      else if (locked) this.rotY = G.U.dampAngle(this.rotY, Math.atan2(this.lockTarget.pos.x - this.pos.x, this.lockTarget.pos.z - this.pos.z), 12, dt);
      else if (w.len > 0.1) this.rotY = G.U.dampAngle(this.rotY, Math.atan2(w.x, w.z), 12, dt);
    } else if (this.state === 'charge' || this.state === 'cast') {
      this.vel.x = G.U.damp(this.vel.x, w.x * 2.4, 10, dt); this.vel.z = G.U.damp(this.vel.z, w.z * 2.4, 10, dt);
      if (locked) this.rotY = G.U.dampAngle(this.rotY, Math.atan2(this.lockTarget.pos.x - this.pos.x, this.lockTarget.pos.z - this.pos.z), 12, dt);
      else if (w.len > 0.1 && this.state === 'charge') this.rotY = G.U.dampAngle(this.rotY, Math.atan2(w.x, w.z), 8, dt);
    } else if (this.state === 'attack' || this.state === 'spin') {
      this.vel.x = G.U.damp(this.vel.x, 0, 10, dt); this.vel.z = G.U.damp(this.vel.z, 0, 10, dt);
    }
    this.vel.y -= 28 * dt;
    this.moveAndCollide(dt, true);
    if (!this.onGround && this.state !== 'dodge') { if (['ground', 'hurt', 'cast', 'charge'].includes(this.state)) { this.setState('air'); this.airMaxY = this.pos.y; this.jumpT = 1; this.attack = null; } }
    // 足音
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hs > 0.5) {
      this.stepPhase += hs * dt * 1.6;
      if (this.stepPhase > Math.PI) { this.stepPhase -= Math.PI; G.Audio.play('step', { surface: G.Terrain.surfaceAt(this.pos.x, this.pos.z), vol: this.sneaking ? 0.3 : this.dashing ? 1.2 : 0.8 }); if (this.dashing) G.Particles.dust(this.pos); }
    }
    this.checkWater();
  }
  // 移動と衝突
  moveAndCollide(dt, grounded) {
    const ox = this.pos.x, oz = this.pos.z;
    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    // 急斜面チェック（地形）
    if (grounded && this.onGround && !this.groundInfo.src) {
      const mvx = nx - ox, mvz = nz - oz, ml = Math.hypot(mvx, mvz);
      if (ml > 0.0001) {
        const n = G.Terrain.getNormal(nx, nz, G.tmp.v1);
        const uphill = -(n.x * mvx + n.z * mvz) / ml;
        const hNew = G.Terrain.getHeight(nx, nz);
        if (n.y < 0.64 && uphill > 0.15 && hNew > this.pos.y + 0.05) {
          if (this.canClimb() && this.state === 'ground' && this.wish.len > 0.5) { this.startClimbTerrain(); return; }
          nx = ox; nz = oz; this.vel.x *= 0.2; this.vel.z *= 0.2;
        }
      }
    }
    this.pos.x = nx; this.pos.z = nz;
    G.Col.resolve(this.pos, this.radius, this.height, this.res);
    // 箱を登る
    if (this.res.hit && this.res.col && this.res.col.climb && this.canClimb() && this.wish.len > 0.5 && ['ground', 'air', 'glide'].includes(this.state)) {
      const into = -(this.res.nx * this.wish.x + this.res.nz * this.wish.z);
      if (into > 0.6) { this.startClimbBox(this.res.col, this.res.nx, this.res.nz); return; }
    }
    // 世界の端
    const B = 770; if (Math.abs(this.pos.x) > B && !G.Shrine.inside) this.pos.x = Math.sign(this.pos.x) * B; if (Math.abs(this.pos.z) > B && !G.Shrine.inside) this.pos.z = Math.sign(this.pos.z) * B;
    // 垂直
    const floor = G.Col.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.1, this.radius, this.groundInfo);
    this.pos.y += this.vel.y * dt;
    if (this.vel.y > 0) { const ceil = G.Col.ceilingAt(this.pos.x, this.pos.z, this.pos.y + 0.5, this.radius); if (this.pos.y + this.height > ceil) { this.pos.y = ceil - this.height; this.vel.y = 0; } }
    // 動く足場に乗る
    const src = this.groundInfo.src;
    if (this.pos.y <= floor + 0.02 && this.vel.y <= 0.5) {
      const wasAir = !this.onGround;
      this.pos.y = floor; this.vel.y = Math.min(0, this.vel.y); this.onGround = true;
      if (src && src.dynamic && src.dx != null) { this.pos.x += src.dx; this.pos.z += src.dz; }
      if (wasAir) this.onLand();
    } else if (this.onGround && this.pos.y - floor < 0.45 && this.vel.y <= 0 && grounded) {
      this.pos.y = floor; this.vel.y = 0; // 段差を降りる
    } else this.onGround = false;
    // 急斜面で滑る
    if (this.onGround && !src && this.state === 'ground') {
      const n = G.Terrain.getNormal(this.pos.x, this.pos.z, G.tmp.v1);
      if (n.y < 0.6) { this.vel.x += n.x * 22 * dt; this.vel.z += n.z * 22 * dt; }
    }
  }
  onLand() {
    const fall = this.airMaxY - this.pos.y;
    const inWater = G.Water.depthAt(this.pos.x, this.pos.z) > 0.8;
    if (this.state === 'plunge') { this.plungeImpact(); }
    if (fall > 16 && !inWater && this.state !== 'glide') {
      if (fall > 48) { this.hurt(9999); G.Hud.notify('高いところから落ちてしまった…'); }
      else { this.hurt(Math.round((fall - 16) * 0.75) + 2); G.Cam.addShake(0.4); }
    }
    if (fall > 2) { G.Audio.play('land'); G.Particles.dust(this.pos); }
    if (['air', 'plunge', 'glide'].includes(this.state)) this.setState('ground');
    this.airMaxY = this.pos.y;
  }
  plungeImpact() {
    const mi = this.meleeInfo(); const hit = new Set();
    G.Combat.arcHit(this.pos, 0, 1, 2.8, Math.PI * 2.01, (e, r) => this.meleeHit(e, r, 1.6), hit);
    if (hit.size && G.Prog.equipped('melee')) G.Prog.useDurability('melee', 1);
    G.Particles.dust(this.pos); G.Particles.burst(this.pos, 0xffffff, 10, 5); G.Cam.addShake(0.35); G.Audio.play('stomp', { vol: 0.6 });
    this.plunge = false;
  }
  canClimb() { return this.stamina > 0 && !this.exhausted && !this.attack && !this.aiming && !this.riding; }
  // ---- 空中 ----
  updateAir(dt) {
    const w = this.wish;
    if (this.cast) this.updateCast(dt);
    if (this.state === 'plunge') { this.vel.y = Math.min(this.vel.y, -22); }
    else {
      const sp = 6.2;
      this.vel.x = G.U.damp(this.vel.x, w.x * sp, 2.5, dt); this.vel.z = G.U.damp(this.vel.z, w.z * sp, 2.5, dt);
      if (w.len > 0.1 && !this.aiming) this.rotY = G.U.dampAngle(this.rotY, Math.atan2(w.x, w.z), 6, dt);
      if (this.aiming) this.rotY = G.U.dampAngle(this.rotY, Math.atan2(-Math.sin(G.Cam.yaw), -Math.cos(G.Cam.yaw)), 20, dt);
      const g = this.focus ? 28 * 0.15 : 28;
      this.vel.y -= g * dt;
      if (this.focus) { this.vel.y = Math.max(this.vel.y, -3); this.useStamina(14 * dt); }
    }
    this.vel.y = Math.max(this.vel.y, -45);
    this.moveAndCollide(dt, false);
    // 空中で急斜面に触れたら登る
    if (this.state === 'air' && this.wish.len > 0.5 && this.canClimb() && this.vel.y < 2) {
      const ax = this.pos.x + this.wish.x * 0.6, az = this.pos.z + this.wish.z * 0.6;
      const h = G.Terrain.getHeight(ax, az);
      if (h > this.pos.y + 0.6 && h < this.pos.y + 5) { const n = G.Terrain.getNormal(ax, az, G.tmp.v1); if (n.y < 0.64) { this.startClimbTerrain(); } }
    }
    this.checkWater();
  }
  // ---- パラセール ----
  updateGlide(dt) {
    const w = this.wish;
    let up = false;
    for (const u of G.World.updrafts) if (Math.hypot(this.pos.x - u.x, this.pos.z - u.z) < u.r && this.pos.y < u.top) up = true;
    if (G.Shrine.inside && G.Shrine.updraftAt(this.pos)) up = true;
    const fwdX = w.len > 0.1 ? w.x : Math.sin(this.rotY) * 0.6, fwdZ = w.len > 0.1 ? w.z : Math.cos(this.rotY) * 0.6;
    this.vel.x = G.U.damp(this.vel.x, fwdX * 9, 2, dt); this.vel.z = G.U.damp(this.vel.z, fwdZ * 9, 2, dt);
    this.vel.y = up ? G.U.damp(this.vel.y, 10, 3, dt) : G.U.damp(this.vel.y, -2.3, 4, dt);
    if (w.len > 0.1) this.rotY = G.U.dampAngle(this.rotY, Math.atan2(w.x, w.z), 3, dt);
    this.useStamina(6 * dt);
    if (this.stamina <= 0) { this.setState('air'); G.Hud.notify('がんばりが切れた！'); }
    this.airMaxY = this.pos.y;
    this.moveAndCollide(dt, false);
    if (Math.random() < 0.2) G.Particles.trail(this.pos.clone().setY(this.pos.y + 2.6), 0xffffff, 0.15);
    this.checkWater();
  }
  // ---- 登る ----
  startClimbTerrain() { this.setState('climb'); this.climb = { mode: 'terrain', slipT: 0, jump: 0 }; this.vel.set(0, 0, 0); this.attack = null; this.plunge = false; }
  startClimbBox(col, nx, nz) { this.setState('climb'); this.climb = { mode: 'box', col, nx, nz, slipT: 0, jump: 0 }; this.vel.set(0, 0, 0); this.attack = null; }
  climbJump() {
    if (!this.climb || this.climb.jump > 0) return;
    if (this.stamina < 15) { G.Audio.play('error'); return; }
    this.useStamina(20); this.climb.jump = 0.35; G.Audio.play('jump');
  }
  updateClimb(dt) {
    const c = this.climb, w = this.wish, P = G.Prog;
    const sp = 2.3 * (1 + P.skill('climb') * 0.25);
    let my = w.my, mx = w.mx;
    if (c.jump > 0) { c.jump -= dt; my = 4.2; mx = 0; }
    const moving = Math.abs(my) + Math.abs(mx) > 0.1;
    const towerEase = c.mode === 'box' && c.col.tower ? 0.3 : 1; // 観測塔は登りやすい
    this.useStamina((moving ? 9 : 1.5) * dt * (1 - P.skill('climb') * 0.2) * towerEase);
    this.rig.phase += (moving ? 6 : 0) * dt;
    if (c.mode === 'terrain') {
      const n = G.Terrain.getNormal(this.pos.x, this.pos.z, G.tmp.v1);
      let wx = -n.x, wz = -n.z; const wl = Math.hypot(wx, wz) || 1; wx /= wl; wz /= wl;
      const rgx = -wz, rgz = wx;
      const ny = Math.max(0.12, n.y);
      let dx = (wx * my * ny + rgx * mx * 0.8) * sp * dt, dz = (wz * my * ny + rgz * mx * 0.8) * sp * dt;
      // 雨で滑る
      if (G.Weather.rain > 0.5 && my > 0) { c.slipT += dt; if (c.slipT > 1.6) { c.slipT = 0; dx -= wx * 0.25; dz -= wz * 0.25; G.Hud.notify('雨で滑る…'); } }
      this.pos.x += dx; this.pos.z += dz;
      G.Col.resolve(this.pos, this.radius, this.height, this.res);
      this.pos.y = G.Terrain.getHeight(this.pos.x, this.pos.z);
      this.rotY = Math.atan2(wx, wz);
      this.climbOffset = new THREE.Vector3(n.x * 0.45, 0, n.z * 0.45);
      const n2 = G.Terrain.getNormal(this.pos.x, this.pos.z, G.tmp.v2);
      if (n2.y > 0.72) { // 登りきった or 下りた
        this.climb = null; this.climbOffset = null; this.setState('ground'); this.onGround = true; this.airMaxY = this.pos.y;
        if (my > 0) { this.pos.x += wx * 0.4; this.pos.z += wz * 0.4; this.pos.y = G.Terrain.getHeight(this.pos.x, this.pos.z); }
        return;
      }
    } else {
      const b = c.col;
      this.pos.y += my * sp * dt;
      const tx = -c.nz, tz = c.nx;
      this.pos.x += tx * mx * sp * 0.8 * dt; this.pos.z += tz * mx * sp * 0.8 * dt;
      // 面に張り付く
      if (c.nx !== 0) { this.pos.x = (c.nx > 0 ? b.maxX : b.minX) + c.nx * (this.radius + 0.02); this.pos.z = G.U.clamp(this.pos.z, b.minZ - 0.2, b.maxZ + 0.2); }
      else { this.pos.z = (c.nz > 0 ? b.maxZ : b.minZ) + c.nz * (this.radius + 0.02); this.pos.x = G.U.clamp(this.pos.x, b.minX - 0.2, b.maxX + 0.2); }
      this.rotY = Math.atan2(-c.nx, -c.nz);
      this.climbOffset = null;
      if (this.pos.y > b.maxY - 0.6) { // 上に上がる
        this.pos.y = b.maxY + 0.02; this.pos.x -= c.nx * 0.9; this.pos.z -= c.nz * 0.9;
        this.climb = null; this.setState('ground'); this.onGround = true; this.airMaxY = this.pos.y; return;
      }
      const fl = G.Col.floorAt(this.pos.x + c.nx * 0.3, this.pos.z + c.nz * 0.3, this.pos.y, 0.2);
      if (my < 0 && this.pos.y <= fl + 0.05) { this.pos.y = fl; this.climb = null; this.setState('ground'); return; }
      const out = Math.max(Math.abs(this.pos.x - G.U.clamp(this.pos.x, b.minX, b.maxX)), Math.abs(this.pos.z - G.U.clamp(this.pos.z, b.minZ, b.maxZ)));
      if ((c.nx !== 0 && (this.pos.z < b.minZ - 0.15 || this.pos.z > b.maxZ + 0.15)) || (c.nz !== 0 && (this.pos.x < b.minX - 0.15 || this.pos.x > b.maxX + 0.15))) { this.climb = null; this.setState('air'); return; }
    }
    if (this.stamina <= 0 || G.Input.pressed('dodge')) {
      const n = c.mode === 'terrain' ? G.Terrain.getNormal(this.pos.x, this.pos.z, G.tmp.v1) : G.tmp.v1.set(c.nx, 0, c.nz);
      this.climb = null; this.climbOffset = null; this.setState('air'); this.vel.set(n.x * 3, 0, n.z * 3);
      this.pos.x += n.x * 0.5; this.pos.z += n.z * 0.5; this.airMaxY = this.pos.y; this.jumpT = 0.5;
    }
  }
  // ---- 泳ぐ ----
  checkWater() {
    if (G.Shrine.inside) return;
    const depth = G.Water.depthAt(this.pos.x, this.pos.z);
    if (depth > 1.35 && this.pos.y < G.WATER_Y - 0.5 && this.state !== 'swim' && this.state !== 'ride') {
      if (this.state !== 'climb') { this.setState('swim'); this.vel.y = 0; this.attack = null; this.dodge = null; this.aiming = false; this.plunge = false; G.Audio.play('splash'); G.Particles.splash(this.pos.clone().setY(G.WATER_Y)); this.burn = 0; }
    }
  }
  updateSwim(dt) {
    const w = this.wish, P = G.Prog;
    let sp = 3.0 * (1 + P.skill('swim') * 0.25);
    if (this.swimDash > 0 && this.stamina > 0 && !this.exhausted) { if (this.swimDash === 0.5) this.useStamina(18); this.swimDash -= dt; sp *= 2.1; }
    this.vel.x = G.U.damp(this.vel.x, w.x * sp, 4, dt); this.vel.z = G.U.damp(this.vel.z, w.z * sp, 4, dt);
    if (w.len > 0.1) this.rotY = G.U.dampAngle(this.rotY, Math.atan2(w.x, w.z), 6, dt);
    this.useStamina((w.len > 0.1 ? 5 : 1.2) * dt * (1 - P.skill('swim') * 0.25));
    this.rig.phase += (w.len > 0.1 ? 5 : 1.5) * dt;
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    G.Col.resolve(this.pos, this.radius, this.height, this.res);
    const t = performance.now() / 1000;
    this.pos.y = G.U.damp(this.pos.y, G.WATER_Y - 1.25 + Math.sin(t * 2) * 0.05, 6, dt);
    if (Math.random() < 0.08 && w.len > 0.1) G.Particles.splash(G.tmp.v1.set(this.pos.x, G.WATER_Y, this.pos.z));
    const depth = G.Water.depthAt(this.pos.x, this.pos.z);
    if (depth < 1.2) { this.setState('ground'); this.pos.y = Math.max(this.pos.y, G.Terrain.getHeight(this.pos.x, this.pos.z)); return; }
    if (this.stamina <= 0) { this.hurt(4, true); G.Hud.notify('おぼれてしまった…'); this.respawnSafe(); }
    // 水中から崖を登る
    if (w.len > 0.5 && this.canClimb()) {
      const ax = this.pos.x + w.x * 0.8, az = this.pos.z + w.z * 0.8;
      if (G.Terrain.getHeight(ax, az) > G.WATER_Y + 0.3) { const n = G.Terrain.getNormal(ax, az, G.tmp.v1); if (n.y < 0.64) { this.pos.y = G.Terrain.getHeight(this.pos.x, this.pos.z); this.startClimbTerrain(); } }
    }
  }
  // ---- 馬 ----
  updateRide(dt) {
    if (this.attack) this.updateAttack(dt);
    if (this.cast) this.updateCast(dt);
    const h = G.Horse.mine && G.Horse.mine.ridden ? G.Horse.mine : G.Horse.riding;
    if (!h) { this.setState('ground'); this.riding = false; return; }
    const s = h.saddleWorld();
    this.pos.copy(s); this.rotY = h.rotY; this.onGround = true; this.airMaxY = this.pos.y;
    if (this.aiming) this.rotY = Math.atan2(-Math.sin(G.Cam.yaw), -Math.cos(G.Cam.yaw));
  }
  // ---- がんばり ----
  useStamina(n) { this.stamina = Math.max(0, this.stamina - n); this.staminaDelay = 0.8; this.staminaShow = 2; if (this.stamina <= 0 && !this.exhausted) { this.exhausted = true; G.Audio.play('error'); } }
  updateStamina(dt) {
    const max = this.maxStamina();
    this.staminaDelay -= dt;
    const resting = ['ground', 'ride', 'attack', 'cast', 'hurt'].includes(this.state) && !this.dashing && !this.focus && this.state !== 'charge';
    if (resting && this.staminaDelay <= 0) this.stamina = Math.min(max, this.stamina + dt * (this.exhausted ? 22 : 38));
    if (this.exhausted && this.stamina >= max) this.exhausted = false;
    if (this.stamina < max) this.staminaShow = 1.5; else this.staminaShow = Math.max(0, this.staminaShow - dt);
    if (this.focus) G.timeScaleTarget = 0.3; else if (this._wasFocus) G.timeScaleTarget = this.flurry > 0 ? 0.12 : 1;
    this._wasFocus = this.focus;
  }
  // ---- 環境 ----
  updateEnvironment(dt) {
    if (G.Shrine.inside) { if (this.pos.y < G.Shrine.floorY() - 15) G.Shrine.fallOut(); return; }
    // 溶岩
    if (G.Water.inLava(this.pos.x, this.pos.z, this.pos.y)) {
      this.hurt(8, true); G.Particles.fire(this.pos, 20); G.Audio.play('fire'); this.burn = 3;
      if (!this.dead) { G.Hud.notify('溶岩に落ちてしまった！'); this.respawnSafe(); }
      return;
    }
    if (this.pos.y < -80) { this.respawnSafe(); return; }
    // 安全な位置
    this.safeT -= dt;
    if (this.safeT <= 0 && this.onGround && this.state === 'ground' && G.Water.depthAt(this.pos.x, this.pos.z) < 0.5) { this.safeT = 1; this.lastSafe.copy(this.pos); }
    // 気温
    const P = G.Prog;
    const temp = G.Terrain.temperature(this.pos.x, this.pos.z, this.pos.y, G.Sky.isNight());
    this.temp = temp;
    let dmgEvery = 0;
    if (temp === -1 && !(P.skill('cold') >= 1 || P.buff('warm') >= 1)) dmgEvery = 4;
    if (temp === -2 && !(P.skill('cold') >= 2 || P.buff('warm') >= 2 || (P.skill('cold') >= 1 && P.buff('warm') >= 1))) dmgEvery = 2;
    if (temp === 1 && !(P.skill('heat') >= 1 || P.buff('cool') >= 1)) dmgEvery = 3;
    if (temp === 2) { if (!(P.skill('fireproof') || P.buff('fireproof'))) { if (this.burn <= 0) { this.burn = 2; G.Hud.notify('熱で体が燃えている！ 耐火の効果が必要だ'); } } else if (!(P.skill('heat') >= 1 || P.buff('cool') >= 1)) dmgEvery = 3; }
    this.tempWarn = dmgEvery > 0 ? (temp < 0 ? 'cold' : 'hot') : null;
    if (dmgEvery) { this.tempT += dt; if (this.tempT >= dmgEvery) { this.tempT = 0; this.hurt(1, true); G.Hud.notify(temp < 0 ? 'さむい… 寒さ対策が必要だ' : 'あつい… 暑さ対策が必要だ'); } }
    else this.tempT = 0;
  }
  respawnSafe() {
    const s = this.lastSafe;
    this.teleport(s.x, G.Col.floorAt(s.x, s.z, s.y + 2) + 0.05, s.z);
    this.invuln = 1;
  }
  // ---- ダメージ ----
  takeDamage(amount, fromPos, elem, opts = {}) {
    if (this.dead || this.downed || G.cinematic) return false;
    if (this.state === 'dodge' && this.dodge && this.dodge.t < 0.3 && !opts.lightning) { if (opts.src && this.tryFlurry(opts.src)) return false; return false; }
    if (this.invuln > 0) return false;
    if (this.flurry > 0) return false;
    let dmg = amount * (1 - G.Prog.defPct());
    dmg = Math.max(1, Math.round(dmg));
    if (elem === 'fire' && !(G.Prog.skill('fireproof') || G.Prog.buff('fireproof')) && this.state !== 'swim') this.burn = 2.5;
    if (elem === 'ice') this.slow = 2;
    if (elem === 'elec') { this.stun = 0.6; }
    this.hurt(dmg);
    this.invuln = opts.lightning ? 1.5 : 0.75;
    // ノックバック
    if (fromPos && this.state !== 'ride' && this.state !== 'climb' && this.state !== 'swim') {
      let dx = this.pos.x - fromPos.x, dz = this.pos.z - fromPos.z; const l = Math.hypot(dx, dz) || 1;
      const kb = opts.kb != null ? opts.kb : 5;
      this.vel.x = dx / l * kb; this.vel.z = dz / l * kb; this.vel.y = kb > 6 ? 5 : 2.5;
      this.attack = null; this.dodge = null; this.aiming = false;
      if (this.onGround && !this.dead) { this.setState('hurt'); this.hurtT = 0.35 + kb * 0.02; }
    }
    if (this.state === 'glide') this.setState('air');
    G.Cam.addShake(0.3); G.Audio.play('hurt');
    G.Hud.flashDamage();
    G.Hud.damageNumber(this.pos, dmg, 'player', 1.9);
    return true;
  }
  hurt(n, silent) {
    if (this.dead || this.downed) return;
    this.hp = Math.max(0, this.hp - n);
    if (silent) { G.Hud.flashDamage(); }
    if (this.hp <= 0) this.die();
  }
  die() {
    this.lockTarget = null; this.attack = null; this.aiming = false; this.burn = 0; this.flurry = 0; G.timeScaleTarget = 1;
    if (this.riding) G.Horse.dismount(true);
    if (this.state === 'climb' || this.state === 'glide') this.setState('air');
    if (G.Net.role !== 'single' && G.Net.pvp && this.lastPvpBy != null && performance.now() - this.lastPvpAt < 3000) {
      // 対戦で倒された
      this.dead = true; this.respawnT = 3; G.Net.send({ t: 'pvpkill', by: this.lastPvpBy });
      G.Hud.centerMsg('倒された！ 3秒後に復活', 2.5);
      setTimeout(() => { if (this.dead) { this.dead = false; this.hp = G.Prog.maxHp(); this.invuln = 2; this.setState('ground'); } }, 3000);
      return;
    }
    if (G.Net.role !== 'single' && G.Remote.list().some(r => !r.dead && !r.downed)) {
      this.downed = true; this.downT = 30; this.setState('ground');
      G.Hud.notify('仲間の助けを待とう！（F長押しであきらめる）');
      return;
    }
    this.dead = true;
    G.Game.onPlayerDeath();
  }
  updateDowned(dt, canAct) {
    this.downT -= dt;
    this.vel.set(0, this.vel.y - 28 * dt, 0);
    const floor = G.Col.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.1, this.radius);
    this.pos.y = Math.max(floor, this.pos.y + this.vel.y * dt); if (this.pos.y <= floor) this.vel.y = 0;
    if (canAct && G.Input.down('interact')) { this._giveUp = (this._giveUp || 0) + dt; if (this._giveUp > 1.2) this.downT = 0; } else this._giveUp = 0;
    if (this.downT <= 0) { this.downed = false; this.dead = true; G.Game.onPlayerDeath(); }
  }
  revive() { if (!this.downed) return; this.downed = false; this.hp = Math.ceil(G.Prog.maxHp() / 2); this.invuln = 2; this.setState('ground'); G.Particles.heal(this.pos.clone().setY(this.pos.y + 1)); G.Audio.play('heal'); G.Hud.centerMsg('復活した！', 1.5); }
  // ---- アニメーション ----
  animate(dt) {
    const r = this.rig, a = this.anim;
    let st = 'idle';
    const hs = Math.hypot(this.vel.x, this.vel.z);
    switch (this.state) {
      case 'ground': st = hs < 0.3 ? 'idle' : this.sneaking ? 'sneak' : this.dashing ? 'dash' : hs < 4.2 ? 'walk' : 'run'; if (this.aiming) st = 'aim'; break;
      case 'air': st = this.aiming ? 'aim' : this.vel.y > 0 ? 'jump' : 'fall'; break;
      case 'plunge': st = 'plunge'; break;
      case 'glide': st = 'glide'; break;
      case 'climb': st = 'climb'; break;
      case 'swim': st = 'swim'; break;
      case 'attack': st = 'attack'; break;
      case 'charge': st = 'charge'; break;
      case 'spin': st = 'spin'; break;
      case 'cast': st = 'cast'; break;
      case 'hurt': st = 'hurt'; break;
      case 'dodge': st = this.dodge ? this.dodge.kind : 'roll'; break;
      case 'ride': st = this.aiming ? 'aim' : this.attack ? 'attack' : 'ride'; break;
    }
    if (this.downed || this.dead) st = 'down';
    if (this.cast && st !== 'down') st = 'cast';
    if (a.st !== st) { a.st = st; a.t = 0; } else a.t += dt;
    if (['walk', 'run', 'dash', 'sneak'].includes(st)) r.phase += hs * dt * 1.55;
    a.prog = this.attack ? this.attack.prog : this.dodge ? this.dodge.prog : this.cast ? Math.min(1, this.cast.t / 0.4) : 0;
    a.combo = this.attack ? this.attack.combo : 0; a.wtype = this.attack ? this.attack.info.type : 'sword';
    if (a.wtype === 'fist') a.wtype = 'sword';
    a.pitch = this.aiming ? -G.Cam.pitch * 0.8 : 0; a.draw = this.drawFrac || 0; a.dir = this._hopDir || 1;
    a.spd = this.riding && G.Horse.mine ? G.Horse.mine.speed : 0;
    G.Models.animHumanoid(r, a, dt);
    r.root.position.copy(this.pos);
    if (this.climbOffset && this.state === 'climb') r.root.position.add(this.climbOffset);
    if (this.state === 'swim') r.root.position.y += 0.3;
    r.root.rotation.y = this.rotY;
    r.root.visible = !(this.invuln > 0 && this.hurtT <= 0 && !this.dodge && Math.floor(this.invuln * 20) % 2 === 0 && this.invuln < 0.7);
    // 弓の弦
    const b = this.meshes.bow; if (b && b.userData.string) b.userData.string.position.x = 0.15 + (this.aiming ? this.drawFrac * 0.35 : 0);
  }
  // ---- ネット送信用 ----
  netState() {
    const w = G.Prog.equipped('melee');
    return {
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), r: +this.rotY.toFixed(2),
      s: this.anim.st, p: +(this.anim.prog || 0).toFixed(2), c: this.anim.combo || 0, wt: this.anim.wtype,
      w: w && w.dur > 0 ? w.id : null, b: G.Prog.equipped('bow') ? G.Prog.equipped('bow').id : null, aim: this.aiming ? 1 : 0, pt: +(this.anim.pitch || 0).toFixed(2),
      hp: this.hp, mh: G.Prog.maxHp(), lv: G.Prog.data.level, dn: this.downed ? 1 : 0, dd: this.dead ? 1 : 0,
      rd: this.riding ? 1 : 0, hc: G.Horse.mine ? G.Horse.mine.color : 0, hs: this.riding && G.Horse.mine ? +G.Horse.mine.speed.toFixed(1) : 0,
      in: G.Shrine.insideId, dr: this.drawnT > 0 || !!this.attack ? 1 : 0,
    };
  }
};
