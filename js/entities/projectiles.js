// ===== 投射物（矢・魔法・レーザー・ミサイル・岩・衝撃波） =====
'use strict';
G.Targets = { list: [], add(o) { this.list.push(o); return o; }, remove(o) { const i = this.list.indexOf(o); if (i >= 0) this.list.splice(i, 1); } };

G.Proj = {
  list: [], scene: null,
  init(scene) { this.scene = scene; },
  mats: {},
  makeMesh(kind, color) {
    if (kind === 'arrow') return G.Models.arrow(color);
    if (kind === 'fireball' || kind === 'missile') { const m = new THREE.Mesh(G.Models.sphG(kind === 'missile' ? 0.45 : 0.35, 8, 6), G.Mat.glow(kind === 'missile' ? 0xff3355 : 0xff7a20)); return m; }
    if (kind === 'ice') { const m = new THREE.Mesh(G.Models.g('iceproj', () => new THREE.OctahedronGeometry(0.35, 0)), G.Mat.glow(0x9ae8ff)); return m; }
    if (kind === 'rock') { const m = new THREE.Mesh(G.Models.g('rkp', () => G.Geo.rock(1, 77, 0)), G.Mat.toon(color || 0x7a6a5a)); m.scale.setScalar(1.2); m.castShadow = true; return m; }
    if (kind === 'shock') { const m = new THREE.Mesh(G.Models.g('shockring', () => new THREE.TorusGeometry(1, 0.25, 4, 32)), new THREE.MeshBasicMaterial({ color: color || 0xff4a6a, transparent: true, opacity: 0.8 })); m.rotation.x = Math.PI / 2; return m; }
    if (kind === 'beam' || kind === 'laser' || kind === 'bolt') {
      const m = new THREE.Mesh(G.Models.g('beamcyl', () => { const g = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.5); return g; }), new THREE.MeshBasicMaterial({ color: color || 0xff5a20, transparent: true, opacity: 0.9, depthWrite: false }));
      return m;
    }
    return new THREE.Mesh(G.Models.sphG(0.3), G.Mat.glow(0xffffff));
  },
  // o: {kind, pos, vel, owner:'p'|'e'|'r', dmg, elem, ...}
  spawn(o, fromNet) {
    const p = Object.assign({ life: 4, radius: 0.3, gravity: 0, hit: new Set() }, o);
    p.pos = o.pos.clone ? o.pos.clone() : new THREE.Vector3(o.pos[0], o.pos[1], o.pos[2]);
    p.vel = o.vel ? (o.vel.clone ? o.vel.clone() : new THREE.Vector3(o.vel[0], o.vel[1], o.vel[2])) : new THREE.Vector3();
    p.auth = p.owner === 'p' || (p.owner === 'e');
    p.mesh = this.makeMesh(p.kind, p.color);
    p.mesh.position.copy(p.pos);
    this.scene.add(p.mesh);
    if (p.kind === 'laser' || p.kind === 'beam' || p.kind === 'bolt') this.instantBeam(p);
    if (p.kind === 'shock') { p.r = 1; p.life = p.life || 2; }
    this.list.push(p);
    if (!fromNet && G.Net.role !== 'single' && (p.owner === 'p' || p.owner === 'e')) G.Net.sendProj(p);
    return p;
  },
  instantBeam(p) {
    const end = p.end;
    const len = p.pos.distanceTo(end);
    p.mesh.position.copy(p.pos); p.mesh.lookAt(end); p.mesh.scale.set(p.width || 0.25, p.width || 0.25, len);
    p.life = p.kind === 'laser' ? 0.35 : 0.2; p.beam = true;
    // 当たり判定
    if (p.owner === 'e') {
      const pl = G.player; if (pl && !pl.dead) {
        const c = G.tmp.v1.copy(pl.pos); c.y += 1;
        const d = this.segDist(c, p.pos, end);
        if (d < (p.hitR || 1.1)) pl.takeDamage(p.dmg, p.pos, p.elem, { laser: true, kb: 8 });
      }
      G.Particles.explosion(end, 2); G.Audio.play('laser', { pos: p.pos }); if (p.kind === 'laser') G.Audio.play('explode', { pos: end, vol: 0.6 });
    }
  },
  segDist(c, a, b) {
    const ab = G.tmp.v2.subVectors(b, a), ac = G.tmp.v3.subVectors(c, a);
    const t = G.U.clamp(ac.dot(ab) / Math.max(1e-6, ab.lengthSq()), 0, 1);
    return G.tmp.v4.copy(a).addScaledVector(ab, t).distanceTo(c);
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.beam) { p.mesh.material.opacity = Math.max(0, p.life * 3); if (p.life <= 0) this.kill(i); continue; }
      if (p.stuck) { if (p.life <= 0) this.kill(i); continue; }
      if (p.kind === 'shock') { this.updateShock(p, dt); if (p.life <= 0) this.kill(i); continue; }
      // 誘導
      if (p.kind === 'missile' && p.life > 0.5) {
        const tp = p.targetId === G.Net.myId || p.targetId == null ? (G.player && G.player.pos) : (G.Remote.get(p.targetId) || {}).pos;
        if (tp) { const want = G.tmp.v1.set(tp.x - p.pos.x, tp.y + 1 - p.pos.y, tp.z - p.pos.z).normalize().multiplyScalar(p.speed || 14); p.vel.lerp(want, Math.min(1, dt * 1.6)); }
        G.Particles.smoke(p.pos, 1, 0x666666);
      }
      p.vel.y -= p.gravity * dt;
      const steps = Math.max(1, Math.ceil(p.vel.length() * dt / 0.6));
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        p.pos.addScaledVector(p.vel, dt / steps);
        dead = this.checkHit(p);
      }
      if (!dead) {
        p.mesh.position.copy(p.pos);
        if (p.kind === 'arrow') p.mesh.lookAt(G.tmp.v1.copy(p.pos).add(p.vel));
        if (p.kind === 'fireball') G.Particles.fire(p.pos, 1);
        if (p.kind === 'ice') { G.Particles.ice(p.pos, 1); p.mesh.rotation.x += dt * 8; }
        if (p.kind === 'rock') { p.mesh.rotation.x += dt * 3; p.mesh.rotation.z += dt * 2; }
        if (p.kind === 'arrow' && p.elem) G.Particles.magic(p.pos, G.Items.arrows[p.atype] ? G.Items.arrows[p.atype].color : 0xffffff);
      }
      if (dead || p.life <= 0) { if (!p.stuck) this.kill(i); }
    }
  },
  kill(i) { const p = this.list[i]; this.scene.remove(p.mesh); this.list.splice(i, 1); },
  // 衝撃波
  updateShock(p, dt) {
    p.r += (p.speed || 16) * dt;
    p.mesh.scale.set(p.r, p.r, 1); p.mesh.position.copy(p.pos); p.mesh.material.opacity = Math.min(0.8, p.life);
    const pl = G.player;
    if (pl && !pl.dead && !p.hitLocal) {
      const d = Math.hypot(pl.pos.x - p.pos.x, pl.pos.z - p.pos.z);
      const ground = pl.onGround && Math.abs(pl.pos.y - p.pos.y) < 2.5;
      if (ground && Math.abs(d - p.r) < 1.0) { p.hitLocal = true; pl.takeDamage(p.dmg, p.pos, p.elem, { kb: 10 }); }
    }
    if (p.r > (p.maxR || 30)) p.life = 0;
  },
  explode(p, r) {
    G.Particles.explosion(p.pos, r); G.Audio.play('explode', { pos: p.pos }); G.Cam.addShake(0.4);
    if (p.owner === 'p') {
      G.Combat.radiusHit(p.pos, r, (e) => { G.Combat.hitEnemy(e, p.dmg, { elem: p.elem, kx: e.pos.x - p.pos.x, kz: e.pos.z - p.pos.z, kb: 6, src: 'bomb' }); });
      for (const t of G.Targets.list) if (t.pos.distanceTo(p.pos) < r + (t.r || 0.5) && t.onHit) t.onHit(p);
      if (G.Net.pvp) for (const rp of G.Remote.list()) if (rp.pos.distanceTo(p.pos) < r) G.Combat.hitRemote(rp, p.dmg * 0.5, {});
    } else if (p.owner === 'e') {
      const pl = G.player; if (pl && pl.pos.distanceTo(p.pos) < r + 0.5) pl.takeDamage(p.dmg, p.pos, p.elem, { kb: 8 });
    }
  },
  checkHit(p) {
    const pos = p.pos;
    // 地形
    const th = G.Terrain.getHeight(pos.x, pos.z);
    const hitGround = pos.y < th && th > -500;
    const col = !hitGround && G.Col.pointHit(pos.x, pos.y, pos.z);
    if (p.owner === 'p') {
      // 敵
      for (const e of G.Enemies.nearby(pos.x, pos.z, 10)) {
        if (!e.alive || p.hit.has(e)) continue;
        const h = e.hitTest(pos, p.radius);
        if (!h) continue;
        p.hit.add(e);
        this.onEnemyHit(p, e, h === 'weak');
        if (p.kind !== 'beam') return true;
      }
      for (const t of G.Targets.list) {
        if (t.active === false) continue;
        if (t.pos.distanceTo(pos) < (t.r || 0.6) + p.radius) { if (t.onHit && t.onHit(p) !== false) { if (p.kind === 'fireball') this.explode(p, 1.5); return true; } }
      }
      if (G.Net.pvp) for (const r of G.Remote.list()) {
        if (r.dead || p.hit.has(r)) continue;
        if (Math.hypot(r.pos.x - pos.x, r.pos.z - pos.z) < 0.6 && pos.y > r.pos.y && pos.y < r.pos.y + 1.9) { p.hit.add(r); G.Combat.hitRemote(r, p.dmg, { elem: p.elem }); return true; }
      }
    } else if (p.owner === 'e') {
      const pl = G.player;
      if (pl && !pl.dead && Math.hypot(pl.pos.x - pos.x, pl.pos.z - pos.z) < 0.5 + p.radius && pos.y > pl.pos.y - 0.2 && pos.y < pl.pos.y + 1.9) {
        if (p.kind === 'missile' || p.kind === 'rock') { this.explode(p, p.kind === 'rock' ? 2.5 : 3); return true; }
        pl.takeDamage(p.dmg, p.pos.clone().sub(p.vel), p.elem, { kb: 4 });
        if (p.kind === 'fireball') G.Particles.fire(pos, 6);
        return true;
      }
    } else {
      // 他プレイヤーの投射物（見た目だけ）
      for (const e of G.Enemies.nearby(pos.x, pos.z, 8)) if (e.alive && e.hitTest(pos, p.radius)) { G.Particles.hit(pos); return true; }
    }
    if (hitGround || col) {
      if (p.kind === 'arrow') {
        if (p.atype === 'bomb') { this.explode(p, 4); return true; }
        p.stuck = true; p.life = 6; p.mesh.position.copy(pos); G.Audio.play('arrowHit', { pos, vol: 0.5 });
        if (p.atype === 'fire' && G.Terrain.densityAt(pos.x, pos.z) > 0.3) G.Particles.fire(pos, 8);
        return false;
      }
      if (p.kind === 'missile' || p.kind === 'rock') { this.explode(p, p.kind === 'rock' ? 2.5 : 3); return true; }
      if (p.kind === 'fireball') { G.Particles.fire(pos, 10); if (p.owner === 'p') this.explode(p, 1.8); G.Audio.play('fire', { pos, vol: 0.5 }); return true; }
      if (p.kind === 'ice') { G.Particles.ice(pos, 12); G.Audio.play('ice', { pos, vol: 0.5 }); return true; }
      return true;
    }
    return false;
  },
  onEnemyHit(p, e, weak) {
    let dmg = p.dmg, crit = false;
    if (p.kind === 'arrow') {
      const bowDef = G.Items.weapons[p.bowId] || G.Items.weapons.trav_bow;
      const r = G.Combat.arrowDamage(bowDef, p.atype || 'normal', e, weak); dmg = r.dmg; crit = r.crit;
      if (p.atype === 'bomb') { this.explode(p, 4); return; }
      if (p.atype === 'ancient' && e.ancient && !e.boss) dmg = Math.max(dmg, e.hp + 10);
      G.Audio.play('arrowHit', { pos: p.pos });
    } else if (p.kind === 'fireball') { G.Particles.fire(p.pos, 10); G.Audio.play('fire', { pos: p.pos, vol: 0.6 }); }
    else if (p.kind === 'ice') { G.Particles.ice(p.pos, 14); G.Audio.play('ice', { pos: p.pos, vol: 0.6 }); }
    G.Particles.hit(p.pos, crit);
    const kx = p.vel.x, kz = p.vel.z, kl = Math.hypot(kx, kz) || 1;
    G.Combat.hitEnemy(e, dmg, { elem: p.elem, crit, weak, kx: kx / kl, kz: kz / kl, kb: p.kind === 'arrow' ? 1.5 : 3, src: p.kind });
  },
  clearAll() { for (let i = this.list.length - 1; i >= 0; i--) this.kill(i); },
};
