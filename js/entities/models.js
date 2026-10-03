// ===== 手続き生成モデル（キャラクター・敵・武器）とアニメーション =====
'use strict';
G.Models = {
  geoCache: new Map(),
  g(key, fn) { let g = this.geoCache.get(key); if (!g) { g = fn(); this.geoCache.set(key, g); } return g; },
  m(geo, color, opts) { const mesh = new THREE.Mesh(geo, opts && opts.mat ? opts.mat : G.Mat.toon(color)); mesh.castShadow = true; return mesh; },
  boxG(w, h, d) { return this.g('b' + w + ',' + h + ',' + d, () => new THREE.BoxGeometry(w, h, d)); },
  sphG(r, ws = 10, hs = 8) { return this.g('s' + r + ',' + ws, () => new THREE.SphereGeometry(r, ws, hs)); },
  cylG(rt, rb, h, s = 8) { return this.g('c' + rt + ',' + rb + ',' + h + ',' + s, () => new THREE.CylinderGeometry(rt, rb, h, s)); },
  coneG(r, h, s = 8) { return this.g('k' + r + ',' + h + ',' + s, () => new THREE.ConeGeometry(r, h, s)); },
  pivot(parent, x, y, z) { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; },
  add(parent, mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh; },

  // ================= 人型 =================
  humanoid(o = {}) {
    const S = this; const root = new THREE.Group(); const rig = { root, kind: o.kind || 'human', o };
    const skin = o.skin != null ? o.skin : 0xf2c9a0, cloth = o.cloth != null ? o.cloth : 0x3a8a4a, pants = o.pants != null ? o.pants : 0xeee4cc, boots = o.boots != null ? o.boots : 0x6b4a2e;
    const body = rig.body = S.pivot(root, 0, 0.86, 0);
    // 脚
    for (const s of [-1, 1]) {
      const leg = S.pivot(body, s * 0.13, 0, 0);
      S.add(leg, S.m(S.boxG(0.2, 0.55, 0.22), pants), 0, -0.3, 0);
      S.add(leg, S.m(S.boxG(0.22, 0.32, 0.28), boots), 0, -0.7, 0.03);
      if (s < 0) rig.legL = leg; else rig.legR = leg;
    }
    // 胴
    const torso = rig.torso = S.pivot(body, 0, 0.02, 0);
    const bw = o.belly ? 0.6 : 0.46;
    S.add(torso, S.m(S.boxG(bw, 0.56, o.belly ? 0.42 : 0.28), cloth), 0, 0.3, 0);
    if (o.kind === 'hero' || o.belt) S.add(torso, S.m(S.boxG(bw + 0.02, 0.08, (o.belly ? 0.42 : 0.28) + 0.02), 0x5a3a20), 0, 0.06, 0);
    if (o.kind === 'hero') S.add(torso, S.m(S.boxG(0.5, 0.25, 0.3), cloth), 0, -0.08, 0);
    if (o.robe) S.add(torso, S.m(S.cylG(0.26, 0.42, 0.7, 8), cloth), 0, -0.18, 0);
    if (o.belly) S.add(torso, S.m(S.sphG(0.3), o.bellyColor || skin), 0, 0.22, 0.14);
    if (o.loin) S.add(torso, S.m(S.boxG(0.42, 0.28, 0.3), o.loin), 0, -0.06, 0);
    // 頭
    const head = rig.head = S.pivot(torso, 0, 0.6, 0);
    const hs = o.headScale || 1;
    const hg = S.pivot(head, 0, 0, 0); hg.scale.setScalar(hs);
    if (o.kind === 'skeleton') {
      S.add(hg, S.m(S.sphG(0.22), 0xeeeee2), 0, 0.22, 0);
      for (const s of [-1, 1]) S.add(hg, S.m(S.sphG(0.06, 6, 5), 0, { mat: G.Mat.glow(0xff4040) }), s * 0.08, 0.24, 0.18);
    } else if (o.kind === 'lizal') {
      S.add(hg, S.m(S.boxG(0.32, 0.3, 0.36), skin), 0, 0.2, 0);
      S.add(hg, S.m(S.boxG(0.22, 0.16, 0.36), skin), 0, 0.14, 0.32);
      S.add(hg, S.m(S.coneG(0.08, 0.4, 4), o.crest || 0xffb03a), 0, 0.42, -0.08, -0.5);
      for (const s of [-1, 1]) S.add(hg, S.m(S.sphG(0.05, 6, 5), 0, { mat: G.Mat.glow(0xffee55) }), s * 0.15, 0.26, 0.12);
    } else if (o.kind === 'goblin') {
      S.add(hg, S.m(S.boxG(0.46, 0.4, 0.42), skin), 0, 0.2, 0);
      S.add(hg, S.m(S.boxG(0.26, 0.18, 0.2), skin), 0, 0.12, 0.26);
      S.add(hg, S.m(S.sphG(0.06, 6, 5), 0x1a1a1a), 0, 0.15, 0.37);
      for (const s of [-1, 1]) {
        S.add(hg, S.m(S.coneG(0.1, 0.42, 4), skin), s * 0.3, 0.26, -0.02, 0, 0, -s * 1.3);
        S.add(hg, S.m(S.sphG(0.055, 6, 5), 0, { mat: G.Mat.glow(0xffe14a) }), s * 0.11, 0.28, 0.21);
      }
      S.add(hg, S.m(S.coneG(0.08, 0.3, 5), o.horn || 0xe8e0c8), 0, 0.48, 0.05, 0.3);
      if (o.mask) S.add(hg, S.m(S.boxG(0.5, 0.2, 0.05), o.mask), 0, 0.3, 0.22);
    } else {
      S.add(hg, S.m(S.boxG(0.38, 0.4, 0.36), skin), 0, 0.2, 0);
      for (const s of [-1, 1]) S.add(hg, S.m(S.boxG(0.06, 0.08, 0.02), 0x2a2030), s * 0.09, 0.22, 0.185);
      if (o.ears !== false && (o.kind === 'hero' || o.ears)) for (const s of [-1, 1]) S.add(hg, S.m(S.coneG(0.05, 0.22, 4), skin), s * 0.23, 0.22, -0.02, 0, 0, -s * 1.2);
      if (o.hair != null) {
        S.add(hg, S.m(S.boxG(0.42, 0.14, 0.4), o.hair), 0, 0.42, -0.01);
        S.add(hg, S.m(S.boxG(0.42, 0.3, 0.12), o.hair), 0, 0.28, -0.16);
        if (o.kind === 'hero') { S.add(hg, S.m(S.boxG(0.12, 0.3, 0.1), o.hair), 0, 0.12, -0.26, 0.4); S.add(hg, S.m(S.boxG(0.16, 0.06, 0.06), o.hair), 0.08, 0.36, 0.19); }
      }
      if (o.beard) S.add(hg, S.m(S.boxG(0.3, 0.3, 0.12), o.beard), 0, 0.02, 0.17);
      if (o.hat === 'cap') { S.add(hg, S.m(S.coneG(0.26, 0.4, 8), o.hatColor || 0x8a5a3a), 0, 0.6, -0.02); }
      if (o.hat === 'wide') { S.add(hg, S.m(S.cylG(0.42, 0.42, 0.05, 12), o.hatColor || 0xd8b878), 0, 0.42, 0); S.add(hg, S.m(S.cylG(0.2, 0.22, 0.2, 10), o.hatColor || 0xd8b878), 0, 0.52, 0); }
      if (o.hat === 'hood') { S.add(hg, S.m(S.boxG(0.44, 0.44, 0.42), o.hatColor || cloth), 0, 0.26, -0.03); }
      if (o.hat === 'fur') { S.add(hg, S.m(S.boxG(0.46, 0.2, 0.44), o.hatColor || 0xeeeeee), 0, 0.44, 0); }
      if (o.glasses) S.add(hg, S.m(S.boxG(0.3, 0.07, 0.03), 0x222222), 0, 0.24, 0.19);
      if (o.fishHead) { S.add(hg, S.m(S.coneG(0.16, 0.5, 6), skin), 0, 0.3, -0.3, -1.2); }
    }
    // 腕
    for (const s of [-1, 1]) {
      const arm = S.pivot(torso, s * (bw / 2 + 0.08), 0.52, 0);
      S.add(arm, S.m(S.boxG(0.13, 0.32, 0.14), o.sleeve != null ? o.sleeve : cloth), 0, -0.14, 0);
      S.add(arm, S.m(S.boxG(0.12, 0.3, 0.13), o.kind === 'hero' ? skin : (o.forearm != null ? o.forearm : skin)), 0, -0.44, 0);
      S.add(arm, S.m(S.sphG(0.08, 6, 5), skin), 0, -0.62, 0);
      const hand = S.pivot(arm, 0, -0.62, 0.02); hand.rotation.x = Math.PI / 2;
      if (s < 0) { rig.armL = arm; rig.handL = hand; } else { rig.armR = arm; rig.handR = hand; }
    }
    // しっぽ（トカゲ）
    if (o.kind === 'lizal') {
      const tail = rig.tail = S.pivot(body, 0, 0, -0.15);
      S.add(tail, S.m(S.coneG(0.14, 0.9, 6), skin), 0, -0.1, -0.4, -1.9);
    }
    // 背中（武器を背負う位置）
    rig.back = S.pivot(torso, 0, 0.35, -0.2);
    // パラセール
    const gl = rig.glider = S.pivot(torso, 0, 1.35, 0);
    const cloth2 = new THREE.MeshToonMaterial({ color: 0xd8b878, gradientMap: G.Mat.grad3, side: THREE.DoubleSide });
    const canopy = new THREE.Mesh(this.g('glider', () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1.4, 0, 0.3, 1.4, 0, 0.3, 0, 0.35, -0.7, -1.4, 0, 0.3, 0, 0.35, -0.7, 0, 0.1, 0.5, 1.4, 0, 0.3, 0, 0.1, 0.5, 0, 0.35, -0.7], 3)); g.computeVertexNormals(); return g; }), cloth2);
    canopy.castShadow = true; gl.add(canopy);
    S.add(gl, S.m(S.cylG(0.02, 0.02, 1.2, 4), 0x6b4a2e), 0, -0.6, 0);
    gl.visible = false;
    if (o.scale) root.scale.setScalar(o.scale);
    rig.cur = {}; rig.phase = 0;
    rig.parts = { body, torso, head, armL: rig.armL, armR: rig.armR, legL: rig.legL, legR: rig.legR };
    return rig;
  },

  // ポーズ設定（滑らかに補間）
  animHumanoid(rig, a, dt) {
    const P = {
      bodyY: 0.86, bodyRX: 0, bodyRY: 0, bodyRZ: 0, torsoRX: 0, torsoRY: 0, torsoRZ: 0, headRX: 0, headRY: 0,
      aLX: 0, aLY: 0, aLZ: 0.08, aRX: 0, aRY: 0, aRZ: -0.08, lLX: 0, lLZ: 0, lRX: 0, lRZ: 0, aRPZ: 0, tail: 0,
    };
    let snap = false; const t = a.t || 0, st = a.st;
    const sin = Math.sin;
    switch (st) {
      case 'idle': case 'talk': {
        P.bodyY += sin(t * 2) * 0.012; P.aLZ = 0.1 + sin(t * 2) * 0.02; P.aRZ = -0.1 - sin(t * 2) * 0.02;
        if (st === 'talk') P.headRX = sin(t * 6) * 0.06;
        if (rig.o.kind === 'goblin') { P.torsoRX = 0.25; P.aLX = -0.3; P.aRX = -0.3; }
        break;
      }
      case 'walk': case 'run': case 'dash': case 'sneak': {
        const ph = rig.phase, amp = st === 'walk' ? 0.55 : st === 'sneak' ? 0.4 : 0.9;
        P.lLX = sin(ph) * amp; P.lRX = -sin(ph) * amp; P.aLX = -sin(ph) * amp * 0.8; P.aRX = sin(ph) * amp * 0.8;
        P.bodyY += Math.abs(sin(ph)) * (st === 'walk' ? 0.03 : 0.07);
        P.torsoRX = st === 'walk' ? 0.04 : st === 'run' ? 0.14 : st === 'dash' ? 0.28 : 0.35;
        if (st === 'sneak') { P.bodyY -= 0.22; P.lLZ = 0.15; P.lRZ = -0.15; }
        if (st === 'dash') { P.aLX *= 1.2; P.aRX *= 1.2; }
        P.tail = sin(ph) * 0.4;
        break;
      }
      case 'jump': P.lLX = -0.7; P.lRX = 0.35; P.aLZ = 0.9; P.aRZ = -0.9; P.aLX = -0.3; P.aRX = -0.3; break;
      case 'fall': P.lLX = -0.25; P.lRX = 0.25; P.aLZ = 1.2 + sin(t * 10) * 0.1; P.aRZ = -1.2 - sin(t * 10) * 0.1; break;
      case 'glide': P.aLX = -2.95; P.aRX = -2.95; P.aLZ = 0.15; P.aRZ = -0.15; P.lLX = sin(t * 3) * 0.2 + 0.15; P.lRX = -sin(t * 3) * 0.2 + 0.15; P.torsoRX = 0.1; break;
      case 'climb': {
        const ph = rig.phase;
        P.aLX = -2.6 + sin(ph) * 0.5; P.aRX = -2.6 - sin(ph) * 0.5; P.aLZ = 0.3; P.aRZ = -0.3;
        P.lLX = -0.5 - sin(ph) * 0.4; P.lRX = -0.5 + sin(ph) * 0.4; P.torsoRX = -0.1; P.headRX = -0.3; break;
      }
      case 'swim': {
        const ph = rig.phase;
        P.bodyRX = 1.25; P.bodyY = 0.5; P.aLX = -2.2 + sin(ph) * 1.2; P.aRX = -2.2 - sin(ph) * 1.2; P.aLZ = 0.4; P.aRZ = -0.4;
        P.lLX = sin(ph * 2) * 0.4; P.lRX = -sin(ph * 2) * 0.4; P.headRX = -0.9; break;
      }
      case 'attack': {
        snap = true; const p = a.prog || 0, c = a.combo || 0, wt = a.wtype || 'sword';
        const e = p < 0.3 ? p / 0.3 : 1; const ease = 1 - Math.pow(1 - e, 3);
        if (wt === 'spear') {
          const th = p < 0.25 ? -p * 2 : p < 0.55 ? -0.5 + (p - 0.25) / 0.3 * 1.5 : 1 - (p - 0.55) / 0.45;
          P.aRX = -1.55; P.aRZ = -0.15; P.aRPZ = th * 0.45; P.aLX = -1.3; P.aLZ = 0.4; P.torsoRY = -0.35 + th * 0.2 * (c % 2 ? -1 : 1); P.lLX = -0.4; P.lRX = 0.3; P.torsoRX = 0.15;
        } else if (wt === 'heavy') {
          if (c % 2 === 0) { const sw = G.U.lerp(1.4, -1.6, ease); P.aRX = -1.5; P.aLX = -1.5; P.aRZ = sw * 0.5; P.aLZ = sw * 0.5; P.torsoRY = sw * 0.8; }
          else { const sw = G.U.lerp(-3.0, -0.5, ease); P.aRX = sw; P.aLX = sw; P.torsoRX = G.U.lerp(-0.2, 0.4, ease); }
          P.lLX = -0.35; P.lRX = 0.35;
        } else {
          if (c === 0) { const sw = G.U.lerp(1.3, -0.9, ease); P.aRX = -1.45; P.aRZ = sw; P.torsoRY = G.U.lerp(-0.6, 0.6, ease); }
          else if (c === 1) { const sw = G.U.lerp(-0.9, 1.3, ease); P.aRX = -1.45; P.aRZ = sw; P.torsoRY = G.U.lerp(0.6, -0.6, ease); }
          else if (c === 2) { P.aRX = G.U.lerp(-3.1, -0.4, ease); P.torsoRX = G.U.lerp(-0.2, 0.35, ease); }
          else { P.aRX = -1.5; P.aRZ = G.U.lerp(1.6, -1.6, ease); P.torsoRY = G.U.lerp(-1.2, 1.2, ease); }
          P.aLX = -0.5; P.aLZ = 0.5; P.lLX = -0.35; P.lRX = 0.3;
        }
        break;
      }
      case 'charge': P.aRX = -1.0; P.aRZ = 1.5; P.torsoRY = -0.9; P.lLX = -0.3; P.lRX = 0.3; P.bodyY -= 0.08; P.aLX = -0.6; P.aLZ = 0.6; break;
      case 'spin': snap = true; P.aRX = -1.5; P.aRZ = 1.4; P.aLZ = 1.2; P.lLX = -0.2; P.lRX = 0.2; break;
      case 'plunge': snap = true; P.aRX = -0.2; P.aLX = -0.2; P.lLX = -0.8; P.lRX = -0.8; P.torsoRX = 0.5; break;
      case 'aim': P.aLX = -1.55 + (a.pitch || 0); P.aLY = 0.25; P.aLZ = -0.05; P.aRX = -1.55 + (a.pitch || 0); P.aRZ = 0.35; P.aRY = 0.3; P.torsoRY = -0.25; P.headRY = 0.25; P.headRX = -(a.pitch || 0) * 0.6; P.aRPZ = -0.25 * (a.draw || 0); break;
      case 'cast': { const p = a.prog || 0; P.aRX = -1.6 - Math.sin(p * Math.PI) * 0.5; P.aLX = -0.3; P.torsoRY = -0.2; P.lLX = -0.3; P.lRX = 0.3; snap = p < 0.05; break; }
      case 'roll': snap = true; P.bodyRX = (a.prog || 0) * Math.PI * 2; P.lLX = -1.4; P.lRX = -1.4; P.aLX = -1.6; P.aRX = -1.6; P.bodyY = 0.6; break;
      case 'backflip': snap = true; P.bodyRX = -(a.prog || 0) * Math.PI * 2; P.lLX = -1.2; P.lRX = -1.2; P.aLZ = 1; P.aRZ = -1; P.bodyY = 1.0; break;
      case 'sidehop': P.bodyRZ = (a.dir || 1) * -0.3; P.lLZ = 0.4; P.lRZ = -0.4; P.aLZ = 0.8; P.aRZ = -0.8; break;
      case 'hurt': P.torsoRX = -0.45; P.aLZ = 1.0; P.aRZ = -1.0; P.aLX = -0.5; P.aRX = -0.5; P.headRX = -0.3; break;
      case 'stun': P.torsoRX = 0.3; P.headRX = 0.4 + sin(t * 4) * 0.1; P.headRY = sin(t * 3) * 0.4; P.aLZ = 0.3; P.aRZ = -0.3; break;
      case 'down': case 'dead': case 'sleep': P.bodyRX = -1.5; P.bodyY = 0.25; P.aLZ = 0.6; P.aRZ = -0.6; P.lLZ = 0.15; P.lRZ = -0.15; break;
      case 'ride': P.lLX = -1.25; P.lRX = -1.25; P.lLZ = 0.55; P.lRZ = -0.55; P.aLX = -0.9; P.aRX = -0.9; P.torsoRX = 0.12 + sin(t * (a.spd || 0) * 1.2) * 0.05 * Math.min(1, a.spd || 0); break;
      case 'sit': P.lLX = -1.5; P.lRX = -1.5; P.bodyY = 0.45; P.aLX = -0.5; P.aRX = -0.5; break;
      case 'interact': P.aLX = -1.2; P.aRX = -1.2; P.torsoRX = 0.2; break;
      case 'wave': P.aRX = -2.8; P.aRZ = -0.3 + sin(t * 8) * 0.35; break;
      case 'eat': P.aRX = -2.3; P.aRZ = 0.5; P.headRX = -0.2 + sin(t * 12) * 0.08; break;
      case 'lift': P.aLX = -2.9; P.aRX = -2.9; P.aLZ = 0.2; P.aRZ = -0.2; break;
      case 'shoot': P.aRX = -1.55; P.aLX = -1.55; P.aRZ = 0.2; P.aLY = 0.25; P.torsoRY = -0.25; break;
      case 'guard': P.aLX = -1.4; P.aLZ = 0.6; P.aRX = -0.9; P.torsoRX = 0.15; P.bodyY -= 0.08; P.lLX = -0.3; P.lRX = 0.3; break;
      case 'roar': P.torsoRX = -0.4; P.headRX = -0.6; P.aLZ = 1.4; P.aRZ = -1.4; P.aLX = -0.5; P.aRX = -0.5; break;
      case 'windup': P.aRX = -2.8; P.aRZ = 0.4; P.torsoRY = -0.5; P.torsoRX = -0.2; P.aLX = -0.4; P.lLX = -0.3; P.lRX = 0.3; break;
      case 'smash': snap = true; P.aRX = G.U.lerp(-2.8, -0.3, Math.min(1, (a.prog || 0) * 3)); P.torsoRX = 0.4; P.aLX = -0.4; break;
    }
    const k = snap ? 1 : 1 - Math.exp(-14 * dt);
    const c = rig.cur;
    for (const key in P) { if (c[key] == null) c[key] = P[key]; c[key] += (P[key] - c[key]) * k; }
    rig.body.position.y = c.bodyY; rig.body.rotation.set(c.bodyRX, c.bodyRY, c.bodyRZ);
    rig.torso.rotation.set(c.torsoRX, c.torsoRY, c.torsoRZ);
    rig.head.rotation.set(c.headRX, c.headRY, 0);
    rig.armL.rotation.set(c.aLX, c.aLY, c.aLZ); rig.armR.rotation.set(c.aRX, c.aRY, c.aRZ);
    rig.armR.position.z = c.aRPZ;
    rig.legL.rotation.set(c.lLX, 0, c.lLZ); rig.legR.rotation.set(c.lRX, 0, c.lRZ);
    if (rig.tail) rig.tail.rotation.y = c.tail + Math.sin(t * 3) * 0.15;
  },

  // ================= 四足動物 =================
  quadruped(o = {}) {
    const S = this, root = new THREE.Group(), rig = { root, o, cur: {}, phase: 0 };
    const col = o.color || 0x8a6a4a, L = o.len || 1.4, H = o.height || 0.9, W = o.width || 0.5;
    const body = rig.body = S.pivot(root, 0, H, 0);
    S.add(body, S.m(S.boxG(W, o.bodyH || 0.55, L), col), 0, 0, 0);
    if (o.mane) S.add(body, S.m(S.boxG(W * 0.5, 0.22, L * 0.7), o.mane), 0, 0.35, 0.1);
    const neck = rig.head = S.pivot(body, 0, 0.2, L / 2);
    if (o.longNeck) { S.add(neck, S.m(S.boxG(W * 0.55, 0.9, 0.4), col), 0, 0.35, 0.1, -0.5); if (o.mane) S.add(neck, S.m(S.boxG(0.12, 0.9, 0.3), o.mane), 0, 0.45, -0.05, -0.5); S.add(neck, S.m(S.boxG(W * 0.5, 0.35, 0.65), o.headColor || col), 0, 0.8, 0.45); if (o.ears !== false) for (const s of [-1, 1]) S.add(neck, S.m(S.coneG(0.06, 0.2, 4), col), s * 0.12, 1.02, 0.25); }
    else { S.add(neck, S.m(S.boxG(W * 0.75, 0.4, 0.45), o.headColor || col), 0, 0.05, 0.2); S.add(neck, S.m(S.boxG(W * 0.45, 0.22, 0.3), o.snout || col), 0, -0.05, 0.5); if (o.ears !== false) for (const s of [-1, 1]) S.add(neck, S.m(S.coneG(0.07, 0.2, 4), col), s * 0.16, 0.32, 0.15); }
    for (const s of [-1, 1]) S.add(neck, S.m(S.sphG(0.04, 5, 4), 0, { mat: G.Mat.glow(o.eye || 0x111111) }), s * W * 0.25, o.longNeck ? 0.88 : 0.1, o.longNeck ? 0.75 : 0.42);
    if (o.tusks) for (const s of [-1, 1]) S.add(neck, S.m(S.coneG(0.04, 0.2, 4), 0xeeeedd), s * 0.12, -0.08, 0.6, 1.2);
    if (o.antlers) for (const s of [-1, 1]) { S.add(neck, S.m(S.cylG(0.03, 0.04, 0.6, 4), 0xd8c8a8), s * 0.15, 1.3, 0.3, 0, 0, s * -0.4); S.add(neck, S.m(S.cylG(0.02, 0.03, 0.3, 4), 0xd8c8a8), s * 0.3, 1.5, 0.35, 0.4, 0, s * -0.9); }
    const legH = H - 0.05;
    const legs = [];
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const lg = S.pivot(body, sx * (W / 2 - 0.08), -0.15, sz * (L / 2 - 0.15));
      S.add(lg, S.m(S.boxG(0.14, legH, 0.16), o.legColor || col), 0, -legH / 2, 0);
      S.add(lg, S.m(S.boxG(0.16, 0.1, 0.18), o.hoof || 0x3a2a20), 0, -legH + 0.05, 0.01);
      legs.push(lg);
    }
    [rig.legFL, rig.legFR, rig.legBL, rig.legBR] = legs;
    const tail = rig.tail = S.pivot(body, 0, 0.15, -L / 2);
    S.add(tail, S.m(S.boxG(0.1, 0.1, o.tailLen || 0.5), o.tailColor || o.mane || col), 0, -0.1, -(o.tailLen || 0.5) / 2, -0.6);
    rig.saddle = S.pivot(body, 0, 0.3, 0);
    if (o.scale) root.scale.setScalar(o.scale);
    return rig;
  },
  animQuad(rig, a, dt) {
    const P = { bodyY: rig.o.height || 0.9, bodyRX: 0, bodyRZ: 0, headRX: 0, headRY: 0, fl: 0, fr: 0, bl: 0, br: 0, tail: 0 };
    const ph = rig.phase, t = a.t || 0;
    switch (a.st) {
      case 'idle': P.headRX = 0.1 + Math.sin(t * 0.8) * 0.05; P.tail = Math.sin(t * 2) * 0.3; break;
      case 'graze': P.headRX = 0.9 + Math.sin(t * 3) * 0.05; P.tail = Math.sin(t * 2) * 0.3; break;
      case 'walk': { const A = 0.45; P.fl = Math.sin(ph) * A; P.br = Math.sin(ph) * A; P.fr = -Math.sin(ph) * A; P.bl = -Math.sin(ph) * A; P.headRX = Math.sin(ph * 2) * 0.05; break; }
      case 'run': { const A = 0.9; P.fl = Math.sin(ph) * A; P.fr = Math.sin(ph + 0.6) * A; P.bl = -Math.sin(ph) * A; P.br = -Math.sin(ph + 0.6) * A; P.bodyRX = Math.sin(ph) * 0.08; P.bodyY += Math.abs(Math.sin(ph)) * 0.12; P.headRX = -0.15 + Math.sin(ph) * 0.1; P.tail = -0.5; break; }
      case 'attack': { const p = a.prog || 0; P.bodyRX = -Math.sin(p * Math.PI) * 0.4; P.headRX = -0.3; P.fl = -0.8 * Math.sin(p * Math.PI); P.fr = -0.8 * Math.sin(p * Math.PI); break; }
      case 'rear': P.bodyRX = -0.7; P.fl = -1; P.fr = -0.8; P.headRX = -0.4; break;
      case 'dead': P.bodyRZ = 1.5; P.bodyY = 0.35; break;
      case 'jump': P.fl = -0.9; P.fr = -0.9; P.bl = 0.8; P.br = 0.8; P.bodyRX = -0.2; break;
    }
    const k = 1 - Math.exp(-12 * dt), c = rig.cur;
    for (const key in P) { if (c[key] == null) c[key] = P[key]; c[key] += (P[key] - c[key]) * k; }
    rig.body.position.y = c.bodyY; rig.body.rotation.x = c.bodyRX; rig.body.rotation.z = c.bodyRZ;
    rig.head.rotation.x = c.headRX; rig.head.rotation.y = c.headRY;
    rig.legFL.rotation.x = c.fl; rig.legFR.rotation.x = c.fr; rig.legBL.rotation.x = c.bl; rig.legBR.rotation.x = c.br;
    rig.tail.rotation.y = c.tail + Math.sin(t * 4) * 0.1;
  },

  // ================= 主人公 =================
  hero(color) {
    return this.humanoid({ kind: 'hero', cloth: color != null ? color : 0x3a8a4a, hair: 0xd8b04a, skin: 0xf2c9a0, pants: 0xeee4cc, boots: 0x6b4a2e });
  },

  // ================= 武器 =================
  weapon(id) {
    const d = G.Items.weapons[id]; const g = new THREE.Group(); if (!d) return g;
    const S = this, c1 = d.c1 || 0xcccccc, c2 = d.c2 || 0x5d4037;
    const gm = d.glow ? G.Mat.glow(d.glow) : null;
    switch (d.mk) {
      case 'stick': S.add(g, S.m(S.cylG(0.035, 0.05, 1.0, 5), c1), 0, 0.4, 0); break;
      case 'club': S.add(g, S.m(S.cylG(0.05, 0.04, 0.3, 6), 0x4a3020), 0, 0.05, 0); S.add(g, S.m(S.cylG(0.11, 0.06, 0.75, 7), c1), 0, 0.55, 0);
        if (d.spikes) for (let k = 0; k < 6; k++) { const a = k * 1.05; S.add(g, S.m(S.coneG(0.03, 0.12, 4), 0xbbbbbb), Math.cos(a) * 0.1, 0.6 + (k % 3) * 0.1, Math.sin(a) * 0.1, Math.sin(a) * 1.5, 0, -Math.cos(a) * 1.5); }
        break;
      case 'sword': S.add(g, S.m(S.boxG(0.05, 0.22, 0.05), c2), 0, 0, 0); S.add(g, S.m(S.boxG(0.28, 0.05, 0.07), d.legendary ? 0x3d5afe : 0x8a7a5a), 0, 0.12, 0);
        S.add(g, S.m(S.boxG(0.08, 0.8, 0.025), c1, gm && d.legendary ? null : null), 0, 0.55, 0); S.add(g, S.m(S.coneG(0.057, 0.14, 4), c1), 0, 1.02, 0, 0, Math.PI / 4);
        if (gm) S.add(g, new THREE.Mesh(S.boxG(0.02, 0.7, 0.03), gm), 0, 0.55, 0);
        break;
      case 'scimitar': S.add(g, S.m(S.boxG(0.05, 0.2, 0.05), c2), 0, 0, 0); for (let k = 0; k < 5; k++) S.add(g, S.m(S.boxG(0.12, 0.2, 0.025), c1), 0.03 * k * k * 0.25, 0.18 + k * 0.17, 0, 0, 0, -k * 0.08); break;
      case 'claymore': S.add(g, S.m(S.boxG(0.06, 0.4, 0.06), c2), 0, 0.05, 0); S.add(g, S.m(S.boxG(0.42, 0.07, 0.09), 0x8a7a5a), 0, 0.26, 0);
        S.add(g, S.m(S.boxG(0.14, 1.2, 0.035), c1), 0, 0.88, 0); S.add(g, S.m(S.coneG(0.1, 0.2, 4), c1), 0, 1.58, 0, 0, Math.PI / 4);
        if (gm) S.add(g, new THREE.Mesh(S.boxG(0.04, 1.1, 0.04), gm), 0, 0.88, 0);
        break;
      case 'axe': S.add(g, S.m(S.cylG(0.04, 0.045, d.big ? 1.6 : 1.1, 6), 0x6b4a2e), 0, d.big ? 0.7 : 0.45, 0);
        S.add(g, S.m(S.boxG(d.big ? 0.6 : 0.36, d.big ? 0.45 : 0.3, 0.05), c1), d.big ? 0.25 : 0.15, d.big ? 1.35 : 0.88, 0); break;
      case 'hammer': S.add(g, S.m(S.cylG(0.045, 0.05, 1.2, 6), 0x6b4a2e), 0, 0.5, 0); S.add(g, S.m(S.boxG(0.5, 0.3, 0.3), c1), 0, 1.15, 0); break;
      case 'spear': S.add(g, S.m(S.cylG(0.03, 0.035, 1.9, 6), d.c1 === 0x9c6b3c || d.c1 === 0x7a5230 ? c1 : 0x6b4a2e), 0, 0.6, 0); S.add(g, S.m(S.coneG(0.06, 0.32, 4), c1), 0, 1.7, 0);
        if (gm) S.add(g, new THREE.Mesh(S.coneG(0.03, 0.25, 4), gm), 0, 1.72, 0); break;
      case 'trident': S.add(g, S.m(S.cylG(0.03, 0.035, 1.9, 6), 0x5a4a3a), 0, 0.6, 0); S.add(g, S.m(S.boxG(0.3, 0.04, 0.04), c1), 0, 1.55, 0); for (const x of [-0.14, 0, 0.14]) S.add(g, S.m(S.coneG(0.03, 0.3, 4), c1), x, 1.72, 0); break;
      case 'bow': {
        const arc = this.g('bowarc', () => new THREE.TorusGeometry(0.55, 0.025, 4, 16, Math.PI * 0.8));
        const b = S.m(arc, c1); b.rotation.z = Math.PI / 2 + Math.PI * 0.1; b.position.x = -0.3; g.add(b);
        const str = new THREE.Mesh(this.g('bowstr', () => new THREE.CylinderGeometry(0.005, 0.005, 1.04, 3)), G.Mat.toon(0xeeeeee)); str.position.x = 0.15; g.add(str); g.userData.string = str;
        if (gm) S.add(g, new THREE.Mesh(S.sphG(0.06, 6, 5), gm), -0.85, 0, 0);
        break;
      }
      case 'rod': S.add(g, S.m(S.cylG(0.03, 0.04, 1.3, 6), c1), 0, 0.45, 0); S.add(g, S.m(S.torusG ? S.torusG() : S.cylG(0.1, 0.06, 0.15, 6), 0x8a7a5a), 0, 1.12, 0);
        S.add(g, new THREE.Mesh(S.g('rodgem', () => new THREE.OctahedronGeometry(0.11, 0)), gm || G.Mat.glow(0xffffff)), 0, 1.25, 0); break;
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.userData.tip = d.mk === 'claymore' ? 1.6 : d.mk === 'spear' || d.mk === 'trident' ? 1.8 : d.mk === 'axe' ? (d.big ? 1.4 : 0.95) : 1.0;
    return g;
  },
  arrow(color) {
    const g = new THREE.Group();
    const s = this.m(this.cylG(0.015, 0.015, 0.8, 4), 0xc8b090); s.rotation.x = Math.PI / 2; g.add(s);
    const h = this.m(this.coneG(0.035, 0.1, 4), color || 0xaaaaaa); h.rotation.x = Math.PI / 2; h.position.z = 0.43; g.add(h);
    const f = this.m(this.boxG(0.08, 0.005, 0.12), 0xffffff); f.position.z = -0.36; g.add(f);
    return g;
  },

  // ================= 敵モデル =================
  goblin(tier) {
    const cols = { red: 0xd84a3a, blue: 0x3a6ad8, black: 0x3a3048, silver: 0xd8d8e8, stal: 0xeeeee2 };
    if (tier === 'stal') return this.humanoid({ kind: 'skeleton', skin: 0xeeeee2, cloth: 0xddddcc, pants: 0xddddcc, boots: 0xccccbb, sleeve: 0xddddcc, forearm: 0xddddcc, belt: false, scale: 0.95 });
    return this.humanoid({ kind: 'goblin', skin: cols[tier], cloth: cols[tier], pants: cols[tier], boots: 0x4a3020, sleeve: cols[tier], belly: true, loin: 0x8a6a3a, horn: tier === 'silver' ? 0x9a5ad8 : 0xe8e0c8, mask: tier === 'black' ? 0x8a1a1a : null, scale: tier === 'silver' ? 1.05 : 0.95 });
  },
  lizal(tier) {
    const cols = { green: 0x5aa04a, blue: 0x3a7ab0, black: 0x3a3a40, king: 0x6a4ab0 };
    return this.humanoid({ kind: 'lizal', skin: cols[tier], cloth: 0xd8c8a0, pants: cols[tier], boots: cols[tier], sleeve: cols[tier], crest: tier === 'king' ? 0xffd700 : 0xffb03a, scale: tier === 'king' ? 2.3 : 1.0 });
  },
  slime(color) {
    const root = new THREE.Group(); const S = this;
    const mat = new THREE.MeshToonMaterial({ color, gradientMap: G.Mat.grad3, transparent: true, opacity: 0.88 });
    const b = new THREE.Mesh(S.sphG(0.55, 12, 10), mat); b.position.y = 0.45; b.castShadow = true; root.add(b);
    for (const s of [-1, 1]) S.add(b, S.m(S.sphG(0.09, 6, 5), 0x111111), s * 0.18, 0.12, 0.45);
    return { root, body: b, kind: 'slime' };
  },
  bat(color) {
    const root = new THREE.Group(); const S = this;
    const b = S.add(root, S.m(S.sphG(0.25, 8, 6), color), 0, 0, 0);
    for (const s of [-1, 1]) S.add(b, S.m(S.sphG(0.05, 5, 4), 0, { mat: G.Mat.glow(0xffee44) }), s * 0.1, 0.06, 0.2);
    const wings = [];
    for (const s of [-1, 1]) { const w = S.pivot(root, s * 0.2, 0, 0); S.add(w, S.m(S.boxG(0.6, 0.03, 0.35), color), s * 0.3, 0, 0); wings.push(w); }
    return { root, body: b, wings, kind: 'bat' };
  },
  wolf(color) { return this.quadruped({ color: color || 0x6a6a72, len: 1.3, height: 0.7, width: 0.45, bodyH: 0.45, snout: 0x4a4a50, tailLen: 0.7, eye: 0xffcc22 }); },
  horse(color, mane) { return this.quadruped({ color, mane: mane || 0x2a2018, len: 1.9, height: 1.25, width: 0.62, bodyH: 0.7, longNeck: true, tailLen: 0.9, hoof: 0x2a2a2a }); },
  deer() { return this.quadruped({ color: 0xb07a4a, len: 1.2, height: 0.95, width: 0.4, bodyH: 0.45, longNeck: true, tailLen: 0.2, antlers: true }); },
  boar() { return this.quadruped({ color: 0x5a4030, len: 1.1, height: 0.55, width: 0.55, bodyH: 0.55, snout: 0x7a5a4a, tusks: true, tailLen: 0.25, mane: 0x3a2a20 }); },
  guardian(scale = 1, trial = false) {
    const root = new THREE.Group(), S = this; const rig = { root, kind: 'guardian', legs: [] };
    const stone = trial ? 0x8a9aa0 : 0xa49480, dark = trial ? 0x4a5a60 : 0x5a5248, glowC = trial ? 0x40c8ff : 0xff5a20;
    const body = rig.body = S.pivot(root, 0, 1.6, 0);
    S.add(body, S.m(S.cylG(0.9, 1.0, 0.7, 12), dark), 0, 0, 0);
    const head = rig.head = S.pivot(body, 0, 0.35, 0);
    S.add(head, S.m(this.g('gdome', () => new THREE.SphereGeometry(1.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), stone), 0, 0, 0);
    S.add(head, S.m(S.cylG(0.32, 0.36, 0.2, 10), dark), 0, 0.45, 0.62, 1.1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: glowC });
    rig.eye = S.add(head, new THREE.Mesh(S.sphG(0.2, 10, 8), eyeMat), 0, 0.48, 0.74); rig.eyeMat = eyeMat;
    for (let k = 0; k < 6; k++) S.add(head, new THREE.Mesh(S.boxG(0.1, 0.05, 0.4), eyeMat), Math.cos(k) * 0.75, 0.3, Math.sin(k) * 0.75, 0, -k, 0);
    if (!trial) {
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2; const leg = S.pivot(body, Math.cos(a) * 0.8, -0.2, Math.sin(a) * 0.8);
        leg.rotation.y = -a;
        S.add(leg, S.m(S.boxG(1.0, 0.15, 0.15), dark), 0.5, 0, 0, 0, 0, 0.5);
        S.add(leg, S.m(S.boxG(0.15, 1.4, 0.15), stone), 0.95, -0.6, 0);
        rig.legs.push(leg);
      }
    } else {
      for (const s of [-1, 1]) { const arm = S.pivot(body, s * 1.0, 0, 0); S.add(arm, S.m(S.boxG(0.12, 0.12, 0.9), dark), 0, 0, 0.3); const blade = S.add(arm, S.m(S.boxG(0.06, 0.1, 1.2), 0xddeeff), 0, 0, 1.2); rig.legs.push(arm); }
    }
    root.scale.setScalar(scale);
    return rig;
  },
  hinox() {
    const r = this.humanoid({ kind: 'goblin', skin: 0x8a6a5a, cloth: 0x8a6a5a, pants: 0x8a6a5a, boots: 0x4a3a2a, sleeve: 0x8a6a5a, belly: true, bellyColor: 0xb08a70, loin: 0x5a4a30, scale: 4.2 });
    const eye = this.add(r.head, new THREE.Mesh(this.sphG(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffee })), 0, 0.22, 0.3);
    r.eye = eye; return r;
  },
  talus(type) {
    const root = new THREE.Group(), S = this, rig = { root, kind: 'talus' };
    const col = type === 'ice' ? 0xa8c8e0 : 0x5a3a34, accent = type === 'ice' ? 0xe0f4ff : 0xff6a20;
    const rk = (s, sd) => S.m(this.g('rk' + sd, () => G.Geo.rock(1, sd, 0)), col);
    const body = rig.body = S.pivot(root, 0, 3.4, 0);
    const torso = S.add(body, rk(1, 31), 0, 0, 0); torso.scale.set(2.4, 2.0, 2.0);
    rig.weak = S.add(body, new THREE.Mesh(this.g('crys', () => new THREE.OctahedronGeometry(0.7, 0)), new THREE.MeshBasicMaterial({ color: type === 'ice' ? 0x40e0ff : 0xffa030 })), 0, 2.1, -0.4);
    for (const s of [-1, 1]) {
      const arm = S.pivot(body, s * 2.4, 0.6, 0);
      const a1 = S.add(arm, rk(1, 32 + s), 0, -1.0, 0); a1.scale.set(0.9, 1.1, 0.9);
      const a2 = S.add(arm, rk(1, 34 + s), 0, -2.4, 0.2); a2.scale.set(1.2, 1.0, 1.2);
      if (s < 0) rig.armL = arm; else rig.armR = arm;
    }
    for (const s of [-1, 1]) { const leg = S.pivot(body, s * 1.1, -1.6, 0); const l = S.add(leg, rk(1, 36 + s), 0, -0.8, 0); l.scale.set(0.9, 1.0, 0.9); if (s < 0) rig.legL = leg; else rig.legR = leg; }
    for (const s of [-1, 1]) S.add(body, new THREE.Mesh(S.sphG(0.22, 6, 5), G.Mat.glow(accent)), s * 0.6, 0.6, 1.85);
    return rig;
  },
  lynel() {
    const r = this.quadruped({ color: 0xc89a5a, len: 2.2, height: 1.4, width: 0.8, bodyH: 0.8, ears: false, tailLen: 1.0, mane: 0xd84a2a, hoof: 0x3a2a20 });
    r.head.visible = false;
    const up = this.humanoid({ kind: 'human', skin: 0xc89a5a, cloth: 0xc89a5a, pants: 0xc89a5a, sleeve: 0xc89a5a, hair: 0xd84a2a, ears: false, belt: false });
    up.legL.visible = false; up.legR.visible = false;
    up.root.position.set(0, r.o.height + 0.1, r.o.len / 2 - 0.2); up.root.scale.setScalar(1.35);
    r.body.add(up.root); up.root.position.set(0, 0.2, r.o.len / 2 - 0.25);
    // ライオンの顔とたてがみ
    this.add(up.head, this.m(this.sphG(0.36, 10, 8), 0xd84a2a), 0, 0.22, -0.08);
    for (const s of [-1, 1]) this.add(up.head, this.m(this.coneG(0.06, 0.4, 5), 0xeeeeee), s * 0.18, 0.5, 0, -0.3, 0, -s * 0.5);
    r.upper = up; return r;
  },
  omega() {
    const root = new THREE.Group(), S = this, rig = { root, kind: 'omega' };
    const metal = 0x5a5560, dark = 0x34303a, accent = 0xff2a5a;
    const glowMat = new THREE.MeshBasicMaterial({ color: accent }); rig.glowMat = glowMat;
    const body = rig.body = S.pivot(root, 0, 10, 0);
    S.add(body, S.m(S.boxG(6, 5, 4), metal), 0, 0, 0);
    S.add(body, S.m(S.boxG(7, 1.2, 4.4), dark), 0, 2.2, 0);
    rig.core = S.add(body, new THREE.Mesh(S.sphG(0.9, 12, 10), glowMat), 0, 0, 2.05);
    S.add(body, new THREE.Mesh(S.cylG(1.2, 1.2, 0.3, 12), G.Mat.toon(dark)), 0, 0, 1.95, Math.PI / 2);
    const head = rig.head = S.pivot(body, 0, 3.2, 0.4);
    S.add(head, S.m(this.g('odome', () => new THREE.SphereGeometry(2.0, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), metal), 0, 0, 0);
    rig.eye = S.add(head, new THREE.Mesh(S.sphG(0.55, 12, 10), glowMat), 0, 0.8, 1.7);
    for (const s of [-1, 1]) S.add(head, S.m(S.coneG(0.35, 2.2, 6), dark), s * 1.6, 1.2, -0.3, -0.4, 0, -s * 0.6);
    for (const s of [-1, 1]) {
      const arm = S.pivot(body, s * 3.7, 1.4, 0);
      S.add(arm, S.m(S.sphG(1.1, 10, 8), dark), 0, 0, 0);
      S.add(arm, S.m(S.boxG(1.2, 4, 1.2), metal), 0, -2.4, 0);
      S.add(arm, S.m(S.cylG(0.8, 1.0, 3.2, 10), dark), 0, -5.6, 0);
      S.add(arm, new THREE.Mesh(S.cylG(0.5, 0.5, 0.2, 10), glowMat), 0, -7.25, 0);
      if (s < 0) rig.armL = arm; else rig.armR = arm;
    }
    for (const s of [-1, 1]) {
      const leg = S.pivot(body, s * 2.0, -2.5, 0);
      S.add(leg, S.m(S.boxG(1.6, 4, 1.6), metal), 0, -2, 0);
      S.add(leg, S.m(S.boxG(2.2, 3.6, 2.4), dark), 0, -5.6, 0.2);
      if (s < 0) rig.legL = leg; else rig.legR = leg;
    }
    for (let k = 0; k < 8; k++) S.add(body, new THREE.Mesh(S.boxG(0.2, 0.2, 4.2), glowMat), -2.8 + k * 0.8, -1.6, 0);
    return rig;
  },
  // NPC
  npc(o) { return this.humanoid(Object.assign({ kind: 'human' }, o)); },
  koroElder() {
    const root = new THREE.Group(), S = this;
    S.add(root, S.m(S.sphG(1.4, 12, 10), 0x7a5a3a), 0, 1.4, 0);
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; S.add(root, S.m(S.sphG(0.8, 8, 6), 0x5aa83c), Math.cos(a) * 1.1, 2.6, Math.sin(a) * 1.1); }
    S.add(root, S.m(S.sphG(0.9, 8, 6), 0x6cbf45), 0, 3.1, 0);
    const face = S.add(root, S.m(S.boxG(1.1, 0.8, 0.1), 0xd8b878), 0, 1.6, 1.35);
    for (const s of [-1, 1]) S.add(root, S.m(S.sphG(0.1, 6, 5), 0x111111), s * 0.25, 1.7, 1.42);
    return { root, kind: 'koro' };
  },
};
