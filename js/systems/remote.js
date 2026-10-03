// ===== 他プレイヤーのアバター =====
'use strict';
G.Remote = {
  map: new Map(),
  list() { return [...this.map.values()]; },
  get(id) { return this.map.get(id); },
  add(id, name, color) {
    if (this.map.has(id)) return this.map.get(id);
    const rig = G.Models.hero(color);
    G.scene.add(rig.root);
    const r = { id, name, color, rig, pos: new THREE.Vector3(0, -500, 0), tgt: null, rotY: 0, anim: { st: 'idle', t: 0 }, dead: false, downed: false, interior: null, hp: 12, mhp: 12, lv: 1, wid: null, bid: null, meshes: {}, horse: null, bubbleT: 0, bubbleText: '', reviveT: 0, sneaking: false };
    r.label = G.Hud.makeLabel();
    this.map.set(id, r);
    return r;
  },
  remove(id) {
    const r = this.map.get(id); if (!r) return;
    G.scene.remove(r.rig.root); if (r.horse) G.scene.remove(r.horse.root);
    G.Hud.removeLabel(r.label); this.map.delete(id); G.Map.removePin(id);
  },
  clear() { for (const id of [...this.map.keys()]) this.remove(id); },
  applyState(id, s) {
    const r = this.map.get(id); if (!r || !s) return;
    if (!r.tgt) r.pos.set(s.x, s.y, s.z);
    r.tgt = s; r.dead = !!s.dd; r.downed = !!s.dn; r.interior = s.in || null; r.hp = s.hp; r.mhp = s.mh; r.lv = s.lv; r.sneaking = s.s === 'sneak';
    if (s.w !== r.wid) { r.wid = s.w; this.setMesh(r, 'melee', s.w); }
    if (s.b !== r.bid) { r.bid = s.b; this.setMesh(r, 'bow', s.b); }
  },
  setMesh(r, cat, id) { const cur = r.meshes[cat]; if (cur && cur.parent) cur.parent.remove(cur); r.meshes[cat] = id ? G.Models.weapon(id) : null; },
  bubble(id, text) {
    if (id === G.Net.myId) { this.selfBubble = { text, t: 5 }; return; }
    const r = this.map.get(id); if (!r) return; r.bubbleText = text; r.bubbleT = 5;
  },
  update(dt) {
    const pl = G.player;
    for (const r of this.map.values()) {
      const s = r.tgt;
      const visible = s && (r.interior || null) === (G.Shrine.insideId || null);
      r.rig.root.visible = !!visible;
      if (!s) continue;
      const k = 1 - Math.exp(-14 * dt);
      r.pos.x += (s.x - r.pos.x) * k; r.pos.y += (s.y - r.pos.y) * k; r.pos.z += (s.z - r.pos.z) * k;
      if (r.pos.distanceTo(G.tmp.v1.set(s.x, s.y, s.z)) > 20) r.pos.set(s.x, s.y, s.z);
      r.rotY = G.U.dampAngle(r.rotY, s.r, 14, dt);
      // アニメーション
      const st = r.downed || r.dead ? 'down' : s.s;
      if (r.anim.st !== st) { r.anim.st = st; r.anim.t = 0; } else r.anim.t += dt;
      const sp = Math.hypot(s.x - (r._lx != null ? r._lx : s.x), s.z - (r._lz != null ? r._lz : s.z));
      r._lx = r.pos.x; r._lz = r.pos.z;
      if (['walk', 'run', 'dash', 'sneak', 'climb', 'swim'].includes(st)) r.rig.phase += (st === 'climb' || st === 'swim' ? 5 : (st === 'walk' ? 6 : st === 'dash' ? 14 : 10)) * dt;
      Object.assign(r.anim, { prog: s.p, combo: s.c, wtype: s.wt, pitch: s.pt, draw: 1, spd: s.hs });
      G.Models.animHumanoid(r.rig, r.anim, dt);
      r.rig.root.position.copy(r.pos); r.rig.root.rotation.y = r.rotY;
      if (st === 'swim') r.rig.root.position.y += 0.3;
      r.rig.glider.visible = st === 'glide';
      // 武器
      const m = r.meshes.melee, b = r.meshes.bow;
      if (m) { if (s.dr && !s.aim) { if (m.parent !== r.rig.handR) { r.rig.handR.add(m); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.setScalar(1); } } else if (m.parent !== r.rig.back) { r.rig.back.add(m); m.position.set(0.15, 0.1, -0.02); m.rotation.set(0, 0, 2.5); m.scale.setScalar(0.85); } }
      if (b) { if (s.aim) { if (b.parent !== r.rig.handL) { r.rig.handL.add(b); b.position.set(0, 0, 0); b.rotation.set(Math.PI / 2, 0, Math.PI / 2); } } else if (b.parent !== r.rig.back) { r.rig.back.add(b); b.position.set(-0.1, 0, -0.05); b.rotation.set(0, Math.PI / 2, 0.3); } }
      // 馬
      if (s.rd) {
        if (!r.horse || r.horse.col !== s.hc) { if (r.horse) G.scene.remove(r.horse.root); const h = G.Models.horse(s.hc || 0x8a5a3a); h.col = s.hc; G.scene.add(h.root); r.horse = h; }
        r.horse.root.visible = !!visible;
        r.horse.root.position.set(r.pos.x, r.pos.y - 1.5, r.pos.z); r.horse.root.rotation.y = r.rotY;
        r.horse.phase += (s.hs || 0) * dt * 1.2;
        G.Models.animQuad(r.horse, { st: (s.hs || 0) > 7 ? 'run' : (s.hs || 0) > 0.5 ? 'walk' : 'idle', t: r.anim.t }, dt);
      } else if (r.horse) { G.scene.remove(r.horse.root); r.horse = null; }
      // ラベル
      r.bubbleT = Math.max(0, r.bubbleT - dt);
      G.Hud.placeLabel(r.label, r.pos, 2.3, visible, r.name + ' Lv' + r.lv + (G.Net.pvp ? ' ⚔' : ''), r.hp / Math.max(1, r.mhp), r.bubbleT > 0 ? r.bubbleText : null, r.downed ? '助けて！' : null);
      // 仲間の蘇生
      if (visible && r.downed && pl && !pl.dead && !pl.downed && pl.pos.distanceTo(r.pos) < 2.6) {
        G.Hud.prompt('F長押し：' + r.name + 'を助け起こす');
        if (G.Input.down('interact')) { r.reviveT += dt; G.Particles.heal(r.pos.clone().setY(r.pos.y + 0.5)); if (r.reviveT > 2) { r.reviveT = 0; G.Net.send({ t: 'revive', to: r.id }); G.Hud.notify(r.name + 'を助け起こした！'); r.downed = false; } }
        else r.reviveT = 0;
      }
    }
    if (this.selfBubble) { this.selfBubble.t -= dt; if (this.selfBubble.t <= 0) this.selfBubble = null; }
  },
};
