// ===== 村人（NPC） =====
'use strict';
G.NPCs = {
  list: [],
  defs: [
    { key: 'elder', v: 'hajimari', spot: 'elder', talk: 'elder', main: true },
    { key: 'shop_hajimari', v: 'hajimari', spot: 'shop', shop: 'hajimari' },
    { key: 'inn_hajimari', v: 'hajimari', spot: 'inn', inn: true },
    { key: 'kid', v: 'hajimari', off: [8, 6], talk: 'kid', wander: 6 },
    { key: 'farmer', v: 'hajimari', off: [-10, -6], talk: 'farmer', wander: 4 },
    { key: 'stable', v: 'stable', spot: 'stable', shop: 'stable', inn: true, talk: 'stable' },
    { key: 'traveler1', v: 'stable', off: [6, 8], talk: 'traveler1', wander: 3 },
    { key: 'snow', v: 'snow', spot: 'shop', shop: 'snow', inn: true },
    { key: 'hunter', v: 'snow', off: [-6, 6], talk: 'hunter', wander: 3 },
    { key: 'fire', v: 'fire', spot: 'shop', shop: 'fire', inn: true },
    { key: 'smith', v: 'fire', off: [-6, 5], talk: 'smith', wander: 2 },
    { key: 'lake', v: 'lake', spot: 'shop', shop: 'lake', inn: true },
    { key: 'fisher', v: 'lake', off: [8, -4], talk: 'fisher', wander: 4 },
    { key: 'lab', v: 'lab', spot: 'lab', talk: 'lab' },
    { key: 'traveler2', pos: [30, 210], talk: 'traveler2', wander: 3 },
  ],
  init(scene) {
    this.scene = scene;
    for (const d of this.defs) {
      let x, z;
      if (d.pos) { [x, z] = d.pos; }
      else {
        const v = G.World.villages.find(vv => vv.id === d.v), sp = G.Struct.villageSpots[d.v] || {};
        if (d.spot && sp[d.spot]) { x = sp[d.spot].x; z = sp[d.spot].z; } else { x = v.x + (d.off ? d.off[0] : 0); z = v.z + (d.off ? d.off[1] : 0); }
      }
      this.add(d, x, z);
    }
    // 森の精の長
    const S = G.World.sealSword; this.add({ key: 'korok', talk: 'korok' }, S.x - 9, S.z + 6);
  },
  add(d, x, z) {
    const T = G.Text.npcs[d.key];
    const rig = T.korok ? G.Models.koroElder() : G.Models.npc(T.model);
    if (T.model && T.model.scale) rig.root.scale.setScalar(T.model.scale);
    this.scene.add(rig.root);
    const n = { d, name: T.name, rig, pos: new THREE.Vector3(x, G.Terrain.getHeight(x, z), z), home: new THREE.Vector3(x, 0, z), rotY: Math.random() * 6.28, anim: { st: 'idle', t: 0 }, talking: false, wt: Math.random() * 4, vel: new THREE.Vector3() };
    if (G.Struct.villageSpots[d.v] && G.Struct.villageSpots[d.v].center) { const c = G.Struct.villageSpots[d.v].center; n.rotY = Math.atan2(c.x - x, c.z - z); }
    n.inter = G.Interact.add({ x, y: n.pos.y, z, r: 2.6, label: '話す', priority: 0.5, action: () => this.talk(n) });
    this.list.push(n);
    return n;
  },
  talk(n) {
    const d = n.d; n.talking = true;
    const pl = G.player; n.rotY = Math.atan2(pl.pos.x - n.pos.x, pl.pos.z - n.pos.z);
    const done = () => { n.talking = false; };
    const roles = [];
    if (d.shop) roles.push({ label: '買い物をする', fn: () => { done(); G.UI.openShop(d.shop, n.name); } });
    if (d.inn) roles.push({ label: '休む（20ゴールド）', fn: () => { done(); G.UI.openInn(n.name, d.v); } });
    if (d.talk && (d.shop || d.inn)) roles.push({ label: '話を聞く', fn: () => G.Dialog.show(n.name, G.Text.talk[d.talk](), done) });
    if (roles.length > 1 || (roles.length === 1 && !d.talk)) {
      roles.push({ label: 'やめる', fn: done });
      const greet = d.shop ? 'いらっしゃい！ ' + (d.inn ? '買い物かい？ それとも休んでいくかい？' : '何か買っていくかい？') : 'ようこそ！ 休んでいくかい？';
      G.Dialog.show(n.name, [{ text: greet, choices: roles }], null);
      return;
    }
    const lines = G.Text.talk[d.talk]();
    const special = lines.filter(l => typeof l === 'string' && l.startsWith('__'));
    const text = lines.filter(l => !(typeof l === 'string' && l.startsWith('__')));
    G.Dialog.show(n.name, text, () => {
      done();
      if (special.includes('__lab__')) G.UI.openLab(n.name);
      if (special.includes('__korok__')) G.UI.openKorok(n.name);
    });
  },
  update(dt) {
    const pl = G.player; if (!pl) return;
    for (const n of this.list) {
      const d = Math.abs(n.pos.x - pl.pos.x) + Math.abs(n.pos.z - pl.pos.z);
      n.rig.root.visible = d < 200 && !G.Shrine.inside;
      if (!n.rig.root.visible) continue;
      let st = 'idle';
      if (n.talking) { st = 'talk'; n.rotY = G.U.dampAngle(n.rotY, Math.atan2(pl.pos.x - n.pos.x, pl.pos.z - n.pos.z), 6, dt); n.vel.set(0, 0, 0); }
      else if (n.d.wander) {
        n.wt -= dt;
        if (n.wt <= 0) { n.wt = 3 + Math.random() * 5; n.goal = Math.random() < 0.5 ? null : { x: n.home.x + (Math.random() - 0.5) * n.d.wander * 2, z: n.home.z + (Math.random() - 0.5) * n.d.wander * 2 }; }
        if (n.goal) {
          const dx = n.goal.x - n.pos.x, dz = n.goal.z - n.pos.z, l = Math.hypot(dx, dz);
          if (l > 0.4) { n.vel.set(dx / l * 1.4, 0, dz / l * 1.4); n.rotY = G.U.dampAngle(n.rotY, Math.atan2(dx, dz), 5, dt); st = 'walk'; } else { n.goal = null; n.vel.set(0, 0, 0); }
        }
        n.pos.x += n.vel.x * dt; n.pos.z += n.vel.z * dt;
        G.Col.resolve(n.pos, 0.35, 1.8, this._res || (this._res = {}));
        n.pos.y = G.Col.floorAt(n.pos.x, n.pos.z, n.pos.y + 0.6, 0.3);
      } else if (d < 6) { n.rotY = G.U.dampAngle(n.rotY, Math.atan2(pl.pos.x - n.pos.x, pl.pos.z - n.pos.z), 2, dt); }
      if (n.anim.st !== st) { n.anim.st = st; n.anim.t = 0; } else n.anim.t += dt;
      if (n.rig.parts) { n.rig.phase += n.vel.length() * dt * 1.6; G.Models.animHumanoid(n.rig, n.anim, dt); }
      else { n.rig.root.position.y = n.pos.y + Math.sin(n.anim.t * 2) * 0.05; }
      n.rig.root.position.set(n.pos.x, n.rig.parts ? n.pos.y : n.rig.root.position.y, n.pos.z); n.rig.root.rotation.y = n.rotY;
      n.inter.x = n.pos.x; n.inter.z = n.pos.z; n.inter.y = n.pos.y;
    }
  },
};
