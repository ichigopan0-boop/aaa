// ===== メイン（起動・ゲームループ） =====
'use strict';
G.state = 'loading'; G.frame = 0; G.timeScale = 1; G.timeScaleTarget = 1; G.hitStop = 0; G.paused = false;

G.Game = {
  musicT: 0, battleT: 0, saveT: 0, visT: 0, fpsT: 0, fpsN: 0, built: false,
  async boot() {
    const q = G.settings.quality;
    const setLoad = (f, txt) => { G.U.el('load-fill').style.width = Math.round(f * 100) + '%'; if (txt) G.U.el('load-text').textContent = txt; };
    try {
      if (!window.THREE) throw new Error('3Dライブラリ（three.js）を読み込めませんでした');
      const renderer = G.renderer = new THREE.WebGLRenderer({ antialias: q >= 1, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, [1, 1.25, 2][q]));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = q > 0; renderer.shadowMap.type = q >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
      G.U.el('game').appendChild(renderer.domElement);
      G.scene = new THREE.Scene();
      G.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2400);
      G.camera.position.set(0, 100, 300);
      G.Mat.init();
      G.Input.init();
      setLoad(0.02, '大地を生成しています…');
      await G.U.nextFrame();
      await G.Terrain.generate((f) => setLoad(0.02 + f * 0.4, '大地を生成しています… ' + Math.round(f * 100) + '%'));
      setLoad(0.45, '山や川を形づくっています…'); await G.U.nextFrame();
      G.Terrain.buildMeshes(G.scene);
      G.Terrain.makeMapImage(512);
      setLoad(0.52, '空と水を描いています…'); await G.U.nextFrame();
      G.Sky.init(G.scene); G.Water.init(G.scene);
      setLoad(0.58, '木々を植えています…'); await G.U.nextFrame();
      G.Veg.build(G.scene); G.Veg.initGrass(G.scene);
      setLoad(0.72, '村や祠を建てています…'); await G.U.nextFrame();
      G.Struct.build(G.scene); G.Quests.buildTorches(G.scene);
      G.Weather.init(G.scene); G.Particles.init(G.scene); G.Proj.init(G.scene);
      setLoad(0.85, '画面を準備しています…'); await G.U.nextFrame();
      G.Hud.init(); G.Dialog.init(); G.UI.init(); G.Map.init(); G.Touch.init(); G.Title.init(); G.Cam.init();
      window.addEventListener('resize', () => this.resize());
      // 一度描画してシェーダーを準備
      G.Sky.update(0, new THREE.Vector3(0, 30, 300));
      G.Water.update(0); G.Veg.update(0, new THREE.Vector3(0, 30, 300));
      renderer.compile(G.scene, G.camera);
      setLoad(1, '準備完了！');
      await G.U.sleep(200);
      G.U.el('loading').classList.add('hidden');
      G.Title.show();
      this.last = performance.now();
      requestAnimationFrame(() => this.loop());
    } catch (e) {
      console.error(e);
      G.U.el('load-text').innerHTML = 'エラーが発生しました：' + G.U.escape(e.message) + '<br>ブラウザがWebGLに対応しているか確認してください。';
    }
  },
  resize() {
    G.renderer.setSize(window.innerWidth, window.innerHeight);
    G.camera.aspect = window.innerWidth / window.innerHeight; G.camera.updateProjectionMatrix();
    if (G.Map.open) { G.Map.resize(); G.Map.draw(); }
  },
  // セーブデータの読み込み
  loadData(mode, name, color) {
    if (mode === 'continue' && G.Prog.load()) { if (name) G.Prog.data.name = name; if (color != null) G.Prog.data.color = color; }
    else { G.Prog.data = G.Prog.newData(name, color); this.isNew = true; }
  },
  // 敵や拾い物などを生成
  buildEntities() {
    if (this.built) return; this.built = true;
    const d = G.Prog.data;
    G.Enemies.init(G.scene); G.Pickups.init(G.scene); G.Horse.init(G.scene); G.NPCs.init(G.scene); G.Animals.init(G.scene);
    G.player = new G.Player(G.scene, d.color);
    for (const id in d.towers) G.Struct.setTowerActive(id, true);
    for (const id in d.shrines) G.Struct.setShrineCleared(id);
    if (d.flags.sealSword) G.Struct.removeSwordFromPedestal();
    G.Quests.init();
  },
  prepare(mode, name, color) { this.loadData(mode, name, color); this.buildEntities(); },
  begin() {
    const d = G.Prog.data, pl = G.player;
    G.Title.hide(); G.Hud.show(true); G.state = 'playing'; document.body.classList.add('playing');
    G.Sky.time = d.time != null ? d.time : 8; G.Weather.target = d.weather || 'clear';
    if (d.pos && !this.isNew) pl.teleport(d.pos[0], G.Col.floorAt(d.pos[0], d.pos[2], d.pos[1] + 1.5) + 0.05, d.pos[2], d.rotY);
    else pl.teleport(0, null, 482, Math.PI);
    pl.hp = Math.min(G.Prog.maxHp(), Math.max(d.hp || G.Prog.maxHp(), 4));
    G.Cam.yaw = pl.rotY + Math.PI; G.Cam.pitch = 0.25;
    G.Touch.show(true);
    G.Hud.eqDirty = true; G.Quests.update();
    G.Audio.setBgm(null); this.musicT = 1.5;
    if (this.isNew) {
      setTimeout(() => G.Dialog.show('', G.Text.intro, () => { G.Hud.notify('まずはハジマリ村の長老と話そう（★マーク）'); G.Hud.notify(G.isTouchActive ? '右下のボタンで操作できます' : 'クリックで視点ロック／Tabでメニュー'); }), 600);
    } else G.Hud.areaMsg(G.Terrain.regionName(pl.pos.x, pl.pos.z));
    G.Prog.save();
  },
  onPlayerDeath() {
    const d = G.Prog.data; d.stats.deaths++;
    const lost = Math.floor(d.money / 2); d.money -= lost;
    G.Audio.play('hurt'); G.Audio.setBgm(null);
    G.state = 'dead';
    setTimeout(() => G.UI.showDeath(lost), 1400);
    G.Prog.save();
  },
  respawn() {
    const pl = G.player; G.UI.hideDeath();
    G.UI.fade(true, () => {
      pl.dead = false; pl.downed = false; pl.hp = G.Prog.maxHp(); pl.stamina = pl.maxStamina(); pl.exhausted = false; pl.burn = 0; pl.invuln = 2;
      if (G.Shrine.inside) { G.Shrine.clear(); G.Shrine.inside = false; G.Shrine.insideId = null; G.Sky.indoor = false; }
      const r = G.Quests.respawnPoint(); pl.teleport(r.x, null, r.z);
      G.state = 'playing'; this.musicT = 0;
      G.UI.fade(false); G.Prog.save();
    });
  },
  pickMusic(dt) {
    this.musicT -= dt; if (this.musicT > 0) return; this.musicT = 1;
    const pl = G.player; let m;
    if (G.state === 'dead') return;
    const chase = G.Enemies.nearby(pl.pos.x, pl.pos.z, 32).some(e => e.alive && (e.state === 'chase' || e.state === 'attack') && e.target === pl);
    if (chase) this.battleT = 4; else this.battleT -= 1;
    if (G.Shrine.inside) m = 'shrine';
    else if (G.Bosses.activeNear(pl.pos, 70)) m = 'boss';
    else if (this.battleT > 0) m = 'battle';
    else if (G.Quests.curVillage) m = 'village';
    else m = G.Sky.isNight() ? 'night' : 'field';
    G.Audio.setBgm(m);
  },
  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now(); const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (this.manual) return;
    this.tick(dt, true);
  },
  // テスト用：描画なしで時間を進める
  steps(n, dt = 1 / 30) { for (let i = 0; i < n; i++) this.tick(dt, i === n - 1); },
  tick(dt, render) {
    const now = performance.now();
    G.frame++;
    G.Audio.updateBgm();
    if (G.state === 'title' || G.state === 'loading') {
      G.Title.update(dt);
      const c = new THREE.Vector3(0, 30, 300);
      G.Sky.update(dt, c); G.Water.update(dt); G.Veg.update(dt, c); G.Struct.update(dt, now / 1000); G.Particles.update(dt);
      G.Terrain.updateVisibility(c.x, c.z, G.settings.viewDist); G.Veg.updateVisibility(c.x, c.z, G.settings.viewDist); G.Struct.updateCulling(c.x, c.z, G.settings.viewDist);
      if (render) G.renderer.render(G.scene, G.camera);
      G.Input.endFrame();
      return;
    }
    G.UI.update(dt);
    const pl = G.player;
    G.paused = G.Net.role === 'single' && (G.UI.menuOpen || G.UI.panelOpen || G.Map.open);
    // 時間の流れ（スロー・ヒットストップ）
    G.timeScale = G.U.damp(G.timeScale, G.timeScaleTarget, 10, dt);
    let wdt = dt * G.timeScale, pdt = pl.flurry > 0 ? dt * 0.6 : (pl.focus ? dt * 0.5 : wdt);
    if (G.hitStop > 0) { G.hitStop -= dt; wdt *= 0.05; pdt *= 0.1; }
    if (G.paused) { wdt = 0; pdt = 0; }
    if (!G.paused) {
      G.Horse.update(pdt);
      pl.update(pdt);
      G.Enemies.update(wdt);
      G.Proj.update(wdt);
      G.Pickups.update(dt);
      G.Animals.update(wdt);
      G.NPCs.update(dt);
      G.Shrine.update(wdt);
      G.Quests.tick(dt);
      G.Prog.updateBuffs(dt); G.Prog.updateLegendary(dt);
      G.Prog.data.stats.play += dt;
      // バリアの状態（ゲストもオメガの状態で判定）
      const om = G.Bosses.omega; if (om) G.Quests.omegaEngaged(om.alive && om.engaged && (om.state !== 'idle' && om.state !== 'return'));
    }
    G.Remote.update(dt);
    G.Sky.update(G.paused ? 0 : dt, pl.pos);
    G.Weather.update(G.paused ? 0 : dt, pl.pos);
    G.Water.update(dt); G.Veg.update(dt, pl.pos); G.Struct.update(dt, now / 1000);
    G.Particles.update(G.paused ? 0 : wdt);
    G.Cam.update(dt);
    G.Hud.update(dt); G.Dialog.update(dt); G.Touch.update();
    G.Net.update(dt);
    this.pickMusic(dt);
    this.visT -= dt;
    if (this.visT <= 0) { this.visT = 0.4; const vd = G.Sky.indoor ? 0 : G.settings.viewDist; G.Terrain.updateVisibility(pl.pos.x, pl.pos.z, vd); G.Veg.updateVisibility(pl.pos.x, pl.pos.z, vd); G.Struct.updateCulling(pl.pos.x, pl.pos.z, G.Sky.indoor ? 0 : vd * 0.9); G.Pickups.updateCulling(pl.pos.x, pl.pos.z); }
    this.saveT += dt;
    if (this.saveT > 60 && G.state === 'playing' && !pl.dead && !G.Shrine.inside) { this.saveT = 0; G.Prog.data.hp = pl.hp; G.Prog.save(); }
    if (G.settings.showFps) { this.fpsN++; this.fpsT += dt; if (this.fpsT > 0.5) { G.toast('FPS ' + Math.round(this.fpsN / this.fpsT), 600); this.fpsN = 0; this.fpsT = 0; } }
    if (render) G.renderer.render(G.scene, G.camera);
    G.Input.endFrame();
  },
};

window.addEventListener('beforeunload', () => { if (G.state === 'playing' && G.Prog.data && G.player && !G.player.dead) { G.Prog.data.hp = G.player.hp; G.Prog.save(); } });
window.addEventListener('load', () => G.Game.boot());
