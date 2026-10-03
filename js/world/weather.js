// ===== 天気（晴れ・くもり・雨・雷雨・雪） =====
'use strict';
G.Weather = {
  state: 'clear', target: 'clear', cloudiness: 0, rain: 0, snow: 0, timer: 120, boltT: 10, warn: null,
  names: { clear: '晴れ', cloudy: 'くもり', rain: '雨', storm: '雷雨' },
  icons: { clear: '☀️', cloudy: '☁️', rain: '🌧️', storm: '⛈️', snow: '❄️', night: '🌙' },
  init(scene) {
    const n = G.settings.quality === 0 ? 1200 : 3000;
    const pos = new Float32Array(n * 6); this.rainN = n;
    this.rainOff = new Float32Array(n * 3);
    const r = G.U.rng(9);
    for (let i = 0; i < n; i++) { this.rainOff[i * 3] = r.range(-40, 40); this.rainOff[i * 3 + 1] = r.range(0, 40); this.rainOff[i * 3 + 2] = r.range(-40, 40); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaaccee, transparent: true, opacity: 0.5 }));
    this.rainMesh.frustumCulled = false; scene.add(this.rainMesh);
    const sp = new Float32Array(n * 3);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.snowMesh = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0.9 }));
    this.snowMesh.frustumCulled = false; scene.add(this.snowMesh);
    // 稲妻
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
    this.bolt = new THREE.Line(bg, new THREE.LineBasicMaterial({ color: 0xffffff })); this.bolt.visible = false; this.bolt.frustumCulled = false; scene.add(this.bolt);
    this.boltLife = 0;
  },
  setState(s) { this.target = s; },
  isHost() { return !(G.Net && G.Net.role === 'guest'); },
  regionType(p) {
    const m = G.Terrain.masks(p.x, p.z);
    if (m.dV < 240) return 'dry';
    if ((m.snow > 0.5 && p.y > 45) || p.y > 140) return 'snow';
    return 'rain';
  },
  update(dt, p) {
    if (this.isHost()) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 90 + Math.random() * 200;
        const rr = Math.random();
        this.target = rr < 0.45 ? 'clear' : rr < 0.7 ? 'cloudy' : rr < 0.9 ? 'rain' : 'storm';
      }
    }
    const indoor = G.Sky.indoor;
    const rt = this.regionType(p);
    const wantCloud = { clear: 0, cloudy: 0.55, rain: 0.8, storm: 0.95 }[this.target];
    const precip = (this.target === 'rain' || this.target === 'storm') && !indoor ? 1 : 0;
    this.cloudiness = G.U.damp(this.cloudiness, indoor ? 0 : (rt === 'dry' ? wantCloud * 0.5 : wantCloud), 0.4, dt);
    this.rain = G.U.damp(this.rain, rt === 'rain' ? precip : 0, 0.6, dt);
    this.snow = G.U.damp(this.snow, rt === 'snow' ? Math.max(precip, this.target === 'cloudy' ? 0.4 : 0) : 0, 0.6, dt);
    this.state = this.target;
    // 雨粒
    const cam = G.camera.position;
    this.rainMesh.visible = this.rain > 0.02;
    if (this.rainMesh.visible) {
      const a = this.rainMesh.geometry.attributes.position.array, n = Math.floor(this.rainN * this.rain);
      for (let i = 0; i < this.rainN; i++) {
        let oy = this.rainOff[i * 3 + 1] - dt * 38; if (oy < -5) oy += 45; this.rainOff[i * 3 + 1] = oy;
        if (i >= n) { a[i * 6 + 1] = a[i * 6 + 4] = -9999; continue; }
        const x = cam.x + this.rainOff[i * 3], y = cam.y + oy - 10, z = cam.z + this.rainOff[i * 3 + 2];
        a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x + 0.1; a[i * 6 + 4] = y + 1.1; a[i * 6 + 5] = z;
      }
      this.rainMesh.geometry.attributes.position.needsUpdate = true;
    }
    this.snowMesh.visible = this.snow > 0.02;
    if (this.snowMesh.visible) {
      const a = this.snowMesh.geometry.attributes.position.array, n = Math.floor(this.rainN * this.snow), t = performance.now() / 1000;
      for (let i = 0; i < this.rainN; i++) {
        let oy = this.rainOff[i * 3 + 1] - dt * 3; if (oy < -5) oy += 45; this.rainOff[i * 3 + 1] = oy;
        if (i >= n) { a[i * 3 + 1] = -9999; continue; }
        a[i * 3] = cam.x + this.rainOff[i * 3] + Math.sin(t + i) * 0.8; a[i * 3 + 1] = cam.y + oy - 10; a[i * 3 + 2] = cam.z + this.rainOff[i * 3 + 2] + Math.cos(t * 0.7 + i) * 0.8;
      }
      this.snowMesh.geometry.attributes.position.needsUpdate = true;
    }
    // 雷
    if (this.target === 'storm' && rt === 'rain' && !indoor) {
      this.boltT -= dt;
      if (this.boltT <= 0) {
        this.boltT = 8 + Math.random() * 14;
        const pl = G.player;
        if (pl && pl.hasMetalEquipped() && Math.random() < 0.55 && !this.warn) { this.warn = { t: 3 }; G.Hud && G.Hud.notify('⚡ 金属の武器に電気が走っている！'); }
        else { const a = Math.random() * 6.28, d = 25 + Math.random() * 60; this.strike(p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, false); }
      }
    }
    if (this.warn) {
      this.warn.t -= dt;
      const pl = G.player;
      if (pl && Math.random() < 0.5) G.Particles.spark(pl.handWorld(), 0xfff59d, 2);
      if (this.warn.t <= 0) { this.warn = null; if (pl && pl.hasMetalEquipped() && !G.Sky.indoor) this.strike(pl.pos.x, pl.pos.z, true); }
    }
    if (this.boltLife > 0) { this.boltLife -= dt; if (this.boltLife <= 0) this.bolt.visible = false; }
    G.Audio.updateAmbient(dt, this.rain, Math.max(this.snow * 0.6, G.player && G.player.state === 'glide' ? 0.8 : 0), G.Sky.isNight(), !indoor);
  },
  strike(x, z, hitPlayer) {
    const y = G.Terrain.getHeight(x, z);
    const a = this.bolt.geometry.attributes.position.array;
    let cx = x, cz = z;
    for (let i = 0; i < 16; i++) { const t = i / 15; a[i * 3] = cx; a[i * 3 + 1] = y + (1 - t) * 120; a[i * 3 + 2] = cz; cx = x + (Math.random() - 0.5) * 8 * (1 - t); cz = z + (Math.random() - 0.5) * 8 * (1 - t); }
    a[45] = x; a[46] = y; a[47] = z;
    this.bolt.geometry.attributes.position.needsUpdate = true;
    this.bolt.visible = true; this.boltLife = 0.18;
    G.Sky.flash = 1;
    const d = G.camera.position.distanceTo(G.tmp.v1.set(x, y, z));
    setTimeout(() => G.Audio.play('thunder', { vol: Math.max(0.3, 1 - d / 150) }), Math.min(2500, d * 8));
    G.Particles.burst(G.tmp.v1.set(x, y + 0.5, z), 0xfff59d, 18, 8);
    if (hitPlayer && G.player) G.player.takeDamage(12, new THREE.Vector3(x + 1, y, z), 'elec', { lightning: true });
  },
};
