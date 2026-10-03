// ===== 地図（全体マップ・ミニマップ・ピン・ワープ） =====
'use strict';
G.Map = {
  open: false, zoom: 1, cx: 0, cz: 0, pins: {}, revealDirty: true, colors: ['#ffd54f', '#4fc3f7', '#ff8a80', '#b2ff59'],
  init() {
    this.cv = G.U.el('map-canvas'); this.ctx = this.cv.getContext('2d');
    G.U.el('map-close').onclick = () => this.close();
    const size = 512; this.size = size;
    // ピクセルごとの地域
    this.pixRegion = new Uint8Array(size * size);
    const n1 = G.Terrain.N + 1, step = 1600 / size;
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
      const gi = Math.min(G.Terrain.N, Math.round(((px + 0.5) * step) / G.Terrain.CELL)), gj = Math.min(G.Terrain.N, Math.round(((py + 0.5) * step) / G.Terrain.CELL));
      this.pixRegion[py * size + px] = G.Terrain.regionIdx[gj * n1 + gi];
    }
    this.revealed = document.createElement('canvas'); this.revealed.width = this.revealed.height = size;
    // 操作
    let drag = null, pinch = null, longT = null;
    const toWorld = (sx, sy) => { const r = this.cv.getBoundingClientRect(); const s = this.scale(); return { x: this.cx + (sx - r.left - r.width / 2) / s, z: this.cz + (sy - r.top - r.height / 2) / s }; };
    this.cv.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: this.cx, cz: this.cz, moved: false }; });
    window.addEventListener('mousemove', (e) => { if (!drag || !this.open) return; const s = this.scale(); if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true; this.cx = drag.cx - (e.clientX - drag.x) / s; this.cz = drag.cz - (e.clientY - drag.y) / s; this.draw(); });
    window.addEventListener('mouseup', (e) => { if (!drag || !this.open) { drag = null; return; } if (!drag.moved) { const w = toWorld(e.clientX, e.clientY); if (e.button === 2) this.placePin(w.x, w.z); else this.clickAt(w.x, w.z); } drag = null; });
    this.cv.addEventListener('contextmenu', (e) => e.preventDefault());
    this.cv.addEventListener('wheel', (e) => { this.zoom = G.U.clamp(this.zoom * (e.deltaY > 0 ? 0.85 : 1.18), 0.5, 6); this.draw(); e.preventDefault(); }, { passive: false });
    this.cv.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) { const a = e.touches[0], b = e.touches[1]; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: this.zoom }; drag = null; clearTimeout(longT); return; }
      const t = e.touches[0]; drag = { x: t.clientX, y: t.clientY, cx: this.cx, cz: this.cz, moved: false };
      longT = setTimeout(() => { if (drag && !drag.moved) { const w = toWorld(drag.x, drag.y); this.placePin(w.x, w.z); drag.moved = true; } }, 600);
      e.preventDefault();
    }, { passive: false });
    this.cv.addEventListener('touchmove', (e) => {
      if (pinch && e.touches.length === 2) { const a = e.touches[0], b = e.touches[1]; this.zoom = G.U.clamp(pinch.z * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.d, 0.5, 6); this.draw(); e.preventDefault(); return; }
      if (!drag) return; const t = e.touches[0]; const s = this.scale();
      if (Math.abs(t.clientX - drag.x) + Math.abs(t.clientY - drag.y) > 8) { drag.moved = true; clearTimeout(longT); }
      this.cx = drag.cx - (t.clientX - drag.x) / s; this.cz = drag.cz - (t.clientY - drag.y) / s; this.draw(); e.preventDefault();
    }, { passive: false });
    this.cv.addEventListener('touchend', (e) => { clearTimeout(longT); if (pinch) { if (e.touches.length < 2) pinch = null; return; } if (drag && !drag.moved) { const w = toWorld(drag.x, drag.y); this.clickAt(w.x, w.z); } drag = null; });
    this.legend();
  },
  legend() { G.U.el('map-legend').innerHTML = '<span style="color:#ff9a3c">▲</span> 観測塔　<span style="color:#ff9a3c">◆</span> 祠（青=クリア）<br><span style="color:#ff5252">☠</span> 各地の主　<span style="color:#7cff7c">▼</span> 自分　● 仲間<br><span style="color:#ffd54f">★</span> 目的地　📍 ピン'; },
  isRevealed(regionId) { return G.World.towers.some(t => t.region === regionId && G.Prog.data.towers[t.id]); },
  buildRevealed() {
    const size = this.size, base = G.Terrain.mapImage, ctx = this.revealed.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(base, 0, 0);
    const img = ctx.getImageData(0, 0, size, size), d = img.data;
    const regs = G.World.regions.map(r => this.isRevealed(r.id));
    for (let i = 0; i < size * size; i++) {
      if (regs[this.pixRegion[i]]) continue;
      const o = i * 4, g = (d[o] * 0.3 + d[o + 1] * 0.5 + d[o + 2] * 0.2) * 0.55;
      d[o] = g * 0.8 + 20; d[o + 1] = g * 0.85 + 26; d[o + 2] = g + 36;
    }
    ctx.putImageData(img, 0, 0);
    this.revealDirty = false;
  },
  scale() { return Math.min(this.cv.width, this.cv.height) / 1600 * this.zoom; },
  show() {
    if (G.Shrine.inside) { G.Hud.notify('祠の中では地図が使えない'); return; }
    this.open = true; G.U.el('map-screen').classList.remove('hidden'); G.Input.exitLock();
    this.cx = G.player.pos.x; this.cz = G.player.pos.z; this.zoom = 2;
    this.resize(); this.draw(); G.Audio.play('select');
  },
  close() { this.open = false; G.U.el('map-screen').classList.add('hidden'); G.Input.clearAll(); },
  resize() { this.cv.width = window.innerWidth; this.cv.height = window.innerHeight; },
  w2s(x, z) { const s = this.scale(); return { x: this.cv.width / 2 + (x - this.cx) * s, y: this.cv.height / 2 + (z - this.cz) * s }; },
  draw() {
    if (this.revealDirty) this.buildRevealed();
    const c = this.ctx, W = this.cv.width, H = this.cv.height, s = this.scale();
    c.fillStyle = '#0b1118'; c.fillRect(0, 0, W, H);
    const tl = this.w2s(-800, -800);
    c.imageSmoothingEnabled = true; c.drawImage(this.revealed, tl.x, tl.y, 1600 * s, 1600 * s);
    c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1;
    for (let g = -800; g <= 800; g += 100) { const a = this.w2s(g, -800), b = this.w2s(g, 800); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); const e = this.w2s(-800, g), f = this.w2s(800, g); c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(f.x, f.y); c.stroke(); }
    // 地名
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const l of G.World.labels) {
      const reg = G.Terrain.regionAt(l.x, l.z); if (!this.isRevealed(reg.id) && !G.Prog.data.flags['v_' + (G.World.villages.find(v => v.name === l.name) || {}).id]) continue;
      const p = this.w2s(l.x, l.z); c.font = (l.big ? 'bold 16px ' : '12px ') + 'sans-serif'; c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillText(l.name, p.x + 1, p.y + (l.big ? -18 : 14) + 1); c.fillStyle = l.big ? '#fff8e0' : '#ffe9a8'; c.fillText(l.name, p.x, p.y + (l.big ? -18 : 14));
    }
    this.drawMarkers(c, (x, z) => this.w2s(x, z), 1);
    // ワープ地点の説明
    c.font = '13px sans-serif'; c.fillStyle = '#ccc'; c.textAlign = 'center';
    c.fillText('ワープ：クリア済みの祠・起動した塔・訪れた村のアイコンを選ぶ', W / 2, 22);
  },
  drawMarkers(c, w2s, big) {
    const d = G.Prog.data;
    const icon = (p, ch, col, size) => { c.font = 'bold ' + (size * big) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000a'; c.fillText(ch, p.x + 1, p.y + 1); c.fillStyle = col; c.fillText(ch, p.x, p.y); };
    for (const t of G.World.towers) icon(w2s(t.x, t.z), '▲', d.towers[t.id] ? '#4fc3f7' : '#ff9a3c', 15);
    for (const s of G.World.shrines) {
      const reg = G.Terrain.regionAt(s.x, s.z);
      if (!(d.shrines[s.id] || d.flags['visit_' + s.id] || this.isRevealed(reg.id))) continue;
      icon(w2s(s.x, s.z), '◆', d.shrines[s.id] ? '#4fc3f7' : '#ff9a3c', 13);
    }
    for (const v of G.World.villages) if (d.flags['v_' + v.id]) icon(w2s(v.x, v.z), '⌂', '#ffe082', 14);
    for (const b of G.World.bosses) { const reg = G.Terrain.regionAt(b.x, b.z); if (this.isRevealed(reg.id) && !d.bosses[b.id]) icon(w2s(b.x, b.z), '☠', '#ff5252', 13); }
    if (!d.flags.omegaDefeated) icon(w2s(0, 0), '☠', '#ff2a5a', 18);
    // 目的地
    const q = G.Quests.list().find(x => x.main && !x.done && x.target);
    if (q && q.target) icon(w2s(q.target.x, q.target.z), '★', '#ffd54f', 16);
    // ピン
    for (const id in this.pins) { const pin = this.pins[id]; icon(w2s(pin.x, pin.z), '📍', '#fff', 16); }
    // 仲間
    for (const r of G.Remote.list()) { if (r.interior) continue; const p = w2s(r.pos.x, r.pos.z); c.fillStyle = '#' + (r.color >>> 0).toString(16).padStart(6, '0'); c.beginPath(); c.arc(p.x, p.y, 5 * big, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); if (big > 0.9) { c.font = '11px sans-serif'; c.fillStyle = '#fff'; c.fillText(r.name, p.x, p.y - 11); } }
    // 自分
    const pl = G.player; const pp = w2s(pl.pos.x, pl.pos.z);
    c.save(); c.translate(pp.x, pp.y); c.rotate(-pl.rotY + Math.PI);
    c.fillStyle = '#7cff7c'; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -9 * big); c.lineTo(6 * big, 7 * big); c.lineTo(0, 3 * big); c.lineTo(-6 * big, 7 * big); c.closePath(); c.fill(); c.stroke();
    c.restore();
  },
  drawMini(ctx, S) {
    const pl = G.player; if (!pl) return;
    ctx.clearRect(0, 0, S, S);
    ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
    if (G.Shrine.inside) { ctx.fillStyle = '#123'; ctx.fillRect(0, 0, S, S); ctx.fillStyle = '#6fe3ff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('祠の中', S / 2, S / 2); ctx.restore(); return; }
    if (this.revealDirty) this.buildRevealed();
    const range = 110, sc = S / (range * 2); // 1ワールド単位あたりのピクセル
    const mpx = 512 / 1600;
    const sx = (pl.pos.x - range + 800) * mpx, sy = (pl.pos.z - range + 800) * mpx, sw = range * 2 * mpx;
    ctx.drawImage(this.revealed, sx, sy, sw, sw, 0, 0, S, S);
    const w2s = (x, z) => ({ x: S / 2 + (x - pl.pos.x) * sc, y: S / 2 + (z - pl.pos.z) * sc });
    // カメラの向き
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(S / 2, S / 2); const cy = G.Cam.yaw;
    const ca = Math.atan2(-Math.cos(cy), -Math.sin(cy));
    ctx.arc(S / 2, S / 2, S * 0.4, ca - 0.55, ca + 0.55); ctx.closePath(); ctx.fill();
    // 宝探しスキル
    if (G.Prog.skill('treasure')) {
      for (const c of G.Pickups.chests) if (!c.open && !c.interior && Math.hypot(c.pos.x - pl.pos.x, c.pos.z - pl.pos.z) < 80) { const p = w2s(c.pos.x, c.pos.z); ctx.fillStyle = '#ffd54f'; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
      for (const s of G.Pickups.seeds) if (!s.found && Math.hypot(s.pos.x - pl.pos.x, s.pos.z - pl.pos.z) < 80) { const p = w2s(s.pos.x, s.pos.z); ctx.fillStyle = '#b8ff6a'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.3); ctx.fill(); }
    }
    // 追いかけてくる敵
    for (const e of G.Enemies.nearby(pl.pos.x, pl.pos.z, range)) if (e.alive && (e.state === 'chase' || e.state === 'attack') && !e.boss) { const p = w2s(e.pos.x, e.pos.z); ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 6.3); ctx.fill(); }
    this.drawMarkers(ctx, w2s, 0.75);
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', S / 2, 12);
  },
  clickAt(x, z) {
    const pts = G.Quests.travelPoints(); const s = this.scale();
    let best = null, bd = 18 / s;
    for (const p of pts) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
    if (!best) return;
    if (G.Quests._omegaOn && Math.hypot(G.player.pos.x, G.player.pos.z) < 50) { G.Hud.notify('戦いの最中はワープできない！'); return; }
    G.Dialog.show('ワープ', [{ text: best.name + ' へワープしますか？', choices: [{ label: 'ワープする', fn: () => this.warp(best) }, { label: 'やめる' }] }]);
  },
  warp(p) {
    this.close();
    if (G.player.riding) G.Horse.dismount(true);
    G.Audio.play('warp');
    G.UI.fade(true, () => { G.player.teleport(p.x, null, p.z); G.Particles.levelUp(G.player.pos.clone().setY(G.player.pos.y + 1)); G.UI.fade(false); G.Prog.save(); });
  },
  placePin(x, z) { if (G.Net.role === 'single') this.setPin(G.Net.myId, x, z); else G.Net.pin(+x.toFixed(1), +z.toFixed(1)); G.Audio.play('select'); if (this.open) this.draw(); },
  setPin(id, x, z) { this.pins[id] = { x, z }; if (this.open) this.draw(); },
  removePin(id) { delete this.pins[id]; },
  pinsArray() { return Object.keys(this.pins).map(id => [+id, this.pins[id].x, this.pins[id].z]); },
  loadPins(a) { for (const [id, x, z] of a) this.pins[id] = { x, z }; },
};
