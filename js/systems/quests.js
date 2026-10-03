// ===== クエスト・進行イベント =====
'use strict';
G.Quests = {
  regionId: null, lostT: 0,
  init() {
    G.Events.on('bossDefeated', (b) => {
      const pl = G.player; if (!pl) return;
      if (pl.pos.distanceTo(b.pos) < 100 || b.contrib.has(G.Net.myId)) {
        G.Prog.data.bosses[b.bossId] = true;
        G.Hud.centerMsg(b.name + '\nを倒した！', 3); G.Audio.play('levelUp');
        G.Prog.save(); this.update();
      }
    });
    G.Events.on('levelUp', (lv) => { G.Hud.centerMsg('レベルアップ！ Lv ' + lv + '\nスキルポイント +' + (lv % 5 === 0 ? 2 : 1), 2.5); G.Audio.play('levelUp'); if (G.player) G.Particles.levelUp(G.player.pos.clone().setY(G.player.pos.y + 1)); this.update(); G.Prog.save(); });
    G.Events.on('weaponBreak', (name) => { G.Hud.centerMsg(name + 'が壊れた！', 1.5); G.Audio.play('break'); });
    this.update();
  },
  counts() {
    const d = G.Prog.data;
    return {
      towers: Object.keys(d.towers).length, towersT: G.World.towers.length,
      shrines: Object.keys(d.shrines).length, shrinesT: G.World.shrines.length,
      seeds: Object.keys(d.seeds).length, seedsT: G.Pickups.seeds.length,
      bosses: G.World.bosses.filter(b => d.bosses[b.id]).length, bossesT: G.World.bosses.length,
      chests: Object.keys(d.chests).filter(k => !k.startsWith('sc_')).length, chestsT: G.Pickups.chests.filter(c => !c.interior).length,
    };
  },
  list() {
    const d = G.Prog.data, f = d.flags, c = this.counts();
    const q = [];
    if (!f.metElder) q.push({ main: true, title: '目覚め', desc: 'ハジマリ村の長老と話そう。', target: G.Struct.villageSpots.hajimari && G.Struct.villageSpots.hajimari.elder });
    else if (!f.paraglider) q.push({ main: true, title: 'はじまりの試練', desc: d.shrines.s01 ? '長老ロウに報告しよう。' : '村の南東にある「目覚めの祠」で試練を受けよう。', target: d.shrines.s01 ? G.Struct.villageSpots.hajimari.elder : G.World.shrines[0] });
    q.push({ main: true, title: '古代機兵オメガを止めよ', desc: f.omegaDefeated ? 'オメガを倒した！ アストラの大地に平和が戻った。（再戦も可能）' : '北の古城跡で暴走するオメガを倒す。最初から挑めるが非常に強い。目安：レベル30・ハート15以上。', done: !!f.omegaDefeated, target: { x: 0, z: 0 } });
    q.push({ title: '観測塔を起動する', desc: '塔の頂上の台座を調べると、その地方の地図が手に入る。', prog: c.towers + ' / ' + c.towersT, done: c.towers >= c.towersT });
    q.push({ title: '祈りの祠を巡る', desc: '祠の試練を越えて祝福の光を集めよう。4つで女神像からハートかがんばりがもらえる。', prog: c.shrines + ' / ' + c.shrinesT, done: c.shrines >= c.shrinesT });
    q.push({ title: '各地の主を倒す', desc: '巨人、岩の巨人、沼の主、獣王…強敵を倒して経験値と強い武器を手に入れよう。', prog: c.bosses + ' / ' + c.bossesT, done: c.bosses >= c.bossesT });
    q.push({ title: '封印の剣', desc: f.sealSword ? '封印の剣を手に入れた！ 古代兵器に2倍のダメージを与える。' : '迷いの森の奥に眠る伝説の剣。抜くにはハート10個以上が必要。森では道をはずれると霧に迷う…松明をたどれ。', done: !!f.sealSword, target: f.sealSword ? null : G.World.sealSword });
    q.push({ title: '古代兵装', desc: f.ancientGear ? '古代兵装を手に入れた！' : '古代研究所のシエナに古代兵の部品を渡して、古代兵装を作ってもらおう。', done: !!f.ancientGear });
    q.push({ title: '相棒の馬', desc: d.horse ? '相棒の馬がいる。Hキー（馬笛）で呼べる。' : 'かぜの平原の野生の馬を捕まえよう。しゃがんで近づき、乗ったらFを連打。', done: !!d.horse });
    q.push({ title: '森の精の実を集める', desc: '岩の下、高い所、風船、逃げる花…あちこちに森の精が隠れている。迷いの森のハッパ爺に渡すとポーチが広がる。', prog: c.seeds + ' / ' + c.seedsT, done: c.seeds >= c.seedsT });
    q.push({ title: '宝箱を探す', desc: '山の頂上や敵のキャンプに宝箱がある。', prog: c.chests + ' / ' + c.chestsT, done: c.chests >= c.chestsT });
    return q;
  },
  update() {
    if (!G.Prog.data || !G.Hud) return;
    const q = this.list();
    const main = q.find(x => x.main && !x.done) || q[0];
    const lv = G.Prog.data.level;
    let tip = '';
    if (G.Prog.data.flags.paraglider && !G.Prog.data.flags.omegaDefeated) {
      const c = this.counts();
      if (lv < 8) tip = '近くの祠やキャンプで力をつけよう';
      else if (c.towers < 4) tip = '観測塔を起動して地図を広げよう';
      else if (!G.Prog.data.flags.sealSword && G.Prog.heartCount() >= 10) tip = '封印の剣を抜けるかもしれない…';
      else if (lv < 25) tip = '各地の主を倒して強くなろう';
      else tip = '準備ができたら古城へ！';
    }
    G.Hud.setQuest(main.title, main.desc.length > 34 ? main.desc.slice(0, 34) + '…' : main.desc, tip);
  },
  activateTower(t) {
    const d = G.Prog.data; if (d.towers[t.id]) return;
    d.towers[t.id] = true;
    G.Struct.setTowerActive(t.id, true);
    G.Audio.play('secret'); G.Audio.play('itemGet');
    G.Hud.centerMsg(G.World.regions.find(r => r.id === t.region).name + 'の\n地図を手に入れた！', 3);
    const o = G.Struct.towerObjs[t.id];
    d.respawn = { x: o.x + 7, y: null, z: o.z + 7 };
    G.Prog.addXP(200);
    G.Particles.levelUp(new THREE.Vector3(o.x, o.top + 1, o.z));
    G.Map.revealDirty = true;
    this.update(); G.Prog.save();
  },
  pullSword() {
    const d = G.Prog.data, need = G.World.sealSword.needHearts;
    if (G.Prog.heartCount() < need) {
      G.Dialog.show('封印の剣', ['剣はびくともしない……。', '（ハートが ' + need + ' 個以上必要なようだ。現在 ' + G.Prog.heartCount() + ' 個）', 'レベルを上げるか、祠の祝福を女神像に捧げてハートを増やそう。']);
      return;
    }
    if (d.inv.melee.length >= d.slots.melee) { G.Hud.notify('武器がいっぱい！ 1つ捨ててから抜こう'); G.Audio.play('error'); return; }
    d.flags.sealSword = true;
    G.Prog.addWeapon('seal_sword');
    G.Struct.removeSwordFromPedestal();
    G.Audio.play('blessing'); G.Cam.addShake(0.5);
    G.Particles.levelUp(G.player.pos.clone().setY(G.player.pos.y + 1));
    G.Hud.itemGet('封印の剣', 'seal_sword', '古代機兵を封じた伝説の剣。古代兵器に2倍のダメージ！');
    G.Prog.addXP(500); this.update(); G.Prog.save();
  },
  omegaEngaged(on) {
    if (on === this._omegaOn) return;
    this._omegaOn = on;
    G.Struct.setBarrier(on);
    if (on) { G.Hud.areaMsg('暴走機神 オメガ'); }
  },
  onOmegaDefeated(o) {
    if (G.Net.role === 'host') G.Net.broadcast({ t: 'ending' });
    this.playEnding();
  },
  playEnding() {
    if (this._ending) return; this._ending = true;
    const d = G.Prog.data; const first = !d.flags.omegaDefeated;
    d.flags.omegaDefeated = true;
    G.Prog.save(); this.omegaEngaged(false);
    G.cinematic = true;
    G.Audio.setBgm(null);
    setTimeout(() => {
      const pts = [
        { pos: new THREE.Vector3(60, 70, 60), look: new THREE.Vector3(0, 45, 0) },
        { pos: new THREE.Vector3(-60, 90, 50), look: new THREE.Vector3(0, 40, 0) },
        { pos: new THREE.Vector3(-30, 160, -120), look: new THREE.Vector3(0, 30, 200) },
      ];
      G.Cam.startCine(pts, 14, null);
      G.Sky.time = 7;
      G.UI.showEnding(G.Text.ending, () => { G.cinematic = false; this._ending = false; G.Audio.setBgm(null); G.Game.musicT = 0; this.update(); if (first) G.Hud.centerMsg('クリアおめでとう！', 3); });
      G.Audio.setBgm('ending');
    }, 2500);
  },
  onHorse() { this.update(); },
  // 地域・村・迷いの森
  tick(dt) {
    const pl = G.player; if (!pl || G.Shrine.inside) { G.lostFog = 0; return; }
    const reg = G.Terrain.regionAt(pl.pos.x, pl.pos.z);
    if (reg.id !== this.regionId) { if (this.regionId) G.Hud.areaMsg(reg.name); this.regionId = reg.id; }
    for (const v of G.World.villages) {
      if (Math.hypot(pl.pos.x - v.x, pl.pos.z - v.z) < v.flat) {
        if (!G.Prog.data.flags['v_' + v.id]) { G.Prog.data.flags['v_' + v.id] = true; G.Hud.areaMsg(v.name); G.Prog.save(); }
        if (!this._inVillage) { this._inVillage = v.id; G.Prog.data.respawn = { x: v.x, y: null, z: v.z + 3 }; }
        this._inVillage = v.id; this.curVillage = v; return this.lost(dt, pl);
      }
    }
    this._inVillage = null; this.curVillage = null;
    this.lost(dt, pl);
  },
  lost(dt, pl) {
    const L = G.World.lostWoods;
    const dc = Math.hypot(pl.pos.x - L.cx, pl.pos.z - L.cz);
    const dp = G.U.distPolyline(pl.pos.x, pl.pos.z, L.path);
    const nearSword = Math.hypot(pl.pos.x - G.World.sealSword.x, pl.pos.z - G.World.sealSword.z) < 40;
    if (dc < L.r && dp > 26 && !nearSword && pl.pos.y < 120) {
      this.lostT += dt;
      G.lostFog = Math.min(1, this.lostT / 6);
      if (this.lostT > 8) {
        this.lostT = 0; G.lostFog = 0;
        G.UI.fade(true, () => { pl.teleport(L.entrance[0], null, L.entrance[1]); G.Hud.notify('深い霧に迷ってしまった… 松明の道をたどろう'); G.UI.fade(false); });
      }
    } else { this.lostT = Math.max(0, this.lostT - dt * 2); G.lostFog = Math.min(1, this.lostT / 6); }
  },
  // 迷いの森の松明
  buildTorches(scene) {
    const L = G.World.lostWoods;
    for (let i = 0; i < L.path.length - 1; i++) {
      const [ax, az] = L.path[i], [bx, bz] = L.path[i + 1]; const len = Math.hypot(bx - ax, bz - az);
      for (let t = 0; t < len; t += 12) {
        const x = ax + (bx - ax) * t / len + 3, z = az + (bz - az) * t / len + 3, y = G.Terrain.getHeight(x, z);
        const g = new THREE.Group();
        const p = new THREE.Mesh(G.Models.cylG(0.1, 0.12, 1.8, 5), G.Mat.toon(0x5a3a20)); p.position.y = 0.9; g.add(p);
        const f = new THREE.Mesh(G.Models.coneG(0.25, 0.6, 6), G.Mat.glow(0xffa030, 0.9)); f.position.y = 2.0; g.add(f);
        g.position.set(x, y, z); scene.add(g);
      }
    }
  },
  // リスポーン地点
  respawnPoint() {
    const r = G.Prog.data.respawn;
    if (r) return { x: r.x, z: r.z };
    return { x: 0, z: 478 };
  },
  // ワープ地点
  travelPoints() {
    const d = G.Prog.data, out = [];
    for (const s of G.World.shrines) if (d.shrines[s.id]) { const o = G.Struct.shrineObjs[s.id]; out.push({ name: s.name, x: o.ex, z: o.ez, kind: 'shrine' }); }
    for (const t of G.World.towers) if (d.towers[t.id]) out.push({ name: t.name, x: t.x + 7, z: t.z + 7, kind: 'tower' });
    for (const v of G.World.villages) if (d.flags['v_' + v.id]) out.push({ name: v.name, x: v.x, z: v.z + 3, kind: 'village' });
    return out;
  },
};
