// ===== HUD（画面表示） =====
'use strict';
G.Icons = {
  cache: {},
  draw(cv, id, small) {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    if (!id) return;
    const d = G.Items.weapons[id]; if (!d) return;
    const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');
    const c1 = hex(d.c1 || 0xcccccc), c2 = hex(d.c2 || 0x6d4c41);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(W / 48, H / 48);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (d.glow) { ctx.shadowColor = hex(d.glow); ctx.shadowBlur = 8; }
    const line = (x1, y1, x2, y2, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    ctx.rotate(-Math.PI / 4);
    switch (d.mk) {
      case 'stick': line(0, 18, 0, -18, 4, c1); break;
      case 'club': line(0, 18, 0, 6, 4, '#4a3020'); line(0, 8, 0, -17, 8, c1); if (d.spikes) for (let i = -14; i < 6; i += 6) { line(-5, i, -8, i - 2, 2, '#bbb'); line(5, i + 3, 8, i + 1, 2, '#bbb'); } break;
      case 'sword': line(0, 19, 0, 11, 4, c2); line(-7, 10, 7, 10, 3, d.legendary ? '#3d5afe' : '#8a7a5a'); line(0, 9, 0, -16, 5, c1); line(0, -16, 0, -20, 2.5, c1); break;
      case 'scimitar': line(0, 19, 0, 11, 4, c2); ctx.strokeStyle = c1; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(10, -4, 2, -19); ctx.stroke(); break;
      case 'claymore': line(0, 21, 0, 10, 4, c2); line(-9, 9, 9, 9, 3.5, '#8a7a5a'); line(0, 8, 0, -19, 7, c1); break;
      case 'axe': line(0, 20, 0, -18, 3.5, '#6b4a2e'); ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(1, -16); ctx.lineTo(13, -20); ctx.lineTo(13, -6); ctx.lineTo(1, -9); ctx.fill(); break;
      case 'hammer': line(0, 20, 0, -12, 3.5, '#6b4a2e'); ctx.fillStyle = c1; ctx.fillRect(-9, -20, 18, 10); break;
      case 'spear': line(0, 21, 0, -14, 2.5, '#6b4a2e'); ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(4, -13); ctx.lineTo(-4, -13); ctx.fill(); break;
      case 'trident': line(0, 21, 0, -12, 2.5, '#5a4a3a'); line(-6, -12, 6, -12, 2.5, c1); for (const x of [-6, 0, 6]) line(x, -12, x, -21, 2.5, c1); break;
      case 'bow': ctx.rotate(Math.PI / 4); ctx.strokeStyle = c1; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(8, 0, 18, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke(); line(-6, -15, -6, 15, 1, '#eee'); break;
      case 'rod': line(0, 20, 0, -12, 3, c1); ctx.fillStyle = d.glow ? hex(d.glow) : '#fff'; ctx.beginPath(); ctx.arc(0, -16, 5, 0, Math.PI * 2); ctx.fill(); break;
    }
    ctx.restore();
  },
  heartSVG(fill) {
    // fill: 0..4 (1/4単位)
    const f = fill / 4;
    const p = 'M12 21s-7.5-4.6-9.6-9.2C.6 7.8 3.2 4 6.9 4c2.2 0 3.6 1.2 5.1 3 1.5-1.8 2.9-3 5.1-3 3.7 0 6.3 3.8 4.5 7.8C19.5 16.4 12 21 12 21z';
    const id = 'hc' + Math.random().toString(36).slice(2, 8);
    return `<svg viewBox="0 0 24 24"><defs><clipPath id="${id}"><rect x="0" y="0" width="${24 * f}" height="24"/></clipPath></defs><path d="${p}" fill="#3a1418" stroke="#fff" stroke-width="1.4"/><path d="${p}" fill="#ff3b4e" clip-path="url(#${id})"/></svg>`;
  },
};

G.Hud = {
  el: {}, labels: [], dmgEls: [],
  init() {
    const ids = ['hud', 'hearts', 'mp-fill', 'mp-text', 'lv-text', 'xp-fill', 'buffs', 'stamina-wheel', 'minimap', 'clock', 'weather-ic', 'temp-ic', 'money', 'quest-track', 'chat-log', 'notify', 'prompt', 'boss-bar', 'boss-name', 'boss-fill', 'center-msg', 'area-msg', 'crosshair', 'room-info', 'party', 'downed-msg', 'vignette', 'labels', 'arrow-count'];
    for (const id of ids) this.el[id] = document.getElementById(id);
    this.eq = { melee: document.getElementById('eq-melee'), bow: document.getElementById('eq-bow'), rod: document.getElementById('eq-rod') };
    this.swCtx = this.el['stamina-wheel'].getContext('2d');
    this.mmCtx = this.el.minimap.getContext('2d');
    G.Events.on('invChanged', () => { this.eqDirty = true; });
    this.eqDirty = true; this._hk = '';
    const t = document.createElement('div'); t.id = 'shrine-timer'; t.style.cssText = 'position:absolute;left:50%;top:70px;transform:translateX(-50%);font-size:28px;font-weight:bold;text-shadow:0 2px 6px #000;display:none;color:#fff8e0';
    this.el.hud.appendChild(t); this.el.timer = t;
  },
  show(on) { this.el.hud.classList.toggle('hidden', !on); },
  update(dt) {
    const p = G.player, P = G.Prog, d = P.data; if (!p) return;
    // ハート
    const maxH = P.heartCount(), hp = p.hp;
    const hk = maxH + ':' + hp;
    if (hk !== this._hk) {
      this._hk = hk; let html = '';
      for (let i = 0; i < maxH; i++) { const f = G.U.clamp(hp - i * 4, 0, 4); html += '<div class="heart">' + G.Icons.heartSVG(f) + '</div>'; }
      this.el.hearts.innerHTML = html;
    }
    const mm = P.maxMp(); this.el['mp-fill'].style.width = (p.mp / mm * 100) + '%'; this.el['mp-text'].textContent = Math.floor(p.mp) + '/' + mm;
    this.el['lv-text'].textContent = 'Lv ' + d.level + (d.sp > 0 ? '  ★SP' + d.sp : '');
    this.el['xp-fill'].style.width = (d.level >= 50 ? 100 : d.xp / P.xpNext(d.level) * 100) + '%';
    // バフ
    this._bt = (this._bt || 0) - dt;
    if (this._bt <= 0) {
      this._bt = 0.5; let bh = '';
      for (const k in P.buffs) { const b = P.buffs[k]; if (b.t > 0) bh += '<span class="buff">' + (G.Items.effectIcon[k] || '') + G.Items.effectNames[k] + 'Lv' + b.pow + ' ' + Math.ceil(b.t) + 's</span>'; }
      if (p.burn > 0) bh += '<span class="buff">🔥燃えている</span>';
      this.el.buffs.innerHTML = bh;
      this.el.clock.textContent = G.Sky.clockText();
      const W = G.Weather; this.el['weather-ic'].textContent = G.Sky.indoor ? '🏛️' : W.snow > 0.3 ? W.icons.snow : (G.Sky.isNight() && W.target === 'clear') ? W.icons.night : W.icons[W.target];
      const tp = p.temp || 0; this.el['temp-ic'].textContent = tp <= -2 ? '🥶極寒' : tp === -1 ? '❄寒い' : tp === 1 ? '🌡暑い' : tp >= 2 ? '🔥灼熱' : '';
      this.el.money.textContent = '💰 ' + G.U.fmt(d.money) + ' G';
    }
    // がんばりの輪
    const sw = this.el['stamina-wheel'];
    const showSW = p.staminaShow > 0 || p.exhausted;
    sw.style.opacity = showSW ? 1 : 0;
    if (showSW) {
      const c = this.swCtx, max = p.maxStamina(), f = p.stamina / max;
      c.clearRect(0, 0, 64, 64);
      c.lineWidth = 8; c.strokeStyle = '#0008'; c.beginPath(); c.arc(32, 32, 22, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = p.exhausted ? '#ff6b3b' : f < 0.25 ? '#ffd23b' : '#7ee07a';
      c.beginPath(); c.arc(32, 32, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); c.stroke();
    }
    // 装備
    if (this.eqDirty) { this.eqDirty = false; this.drawEquip(); }
    this._dt2 = (this._dt2 || 0) - dt; if (this._dt2 <= 0) { this._dt2 = 0.3; this.drawEquipDur(); }
    // 照準
    this.el.crosshair.classList.toggle('hidden', !(p.aiming));
    // 調べる表示
    if (!this._promptForced) {
      const o = (G.state === 'playing' && !G.UI.anyOpen() && ['ground', 'swim', 'ride'].includes(p.state)) ? G.Interact.find(p.pos.x, p.pos.y, p.pos.z, Math.sin(p.rotY), Math.cos(p.rotY)) : null;
      const lab = p.riding ? (G.Horse.riding && G.Horse.riding.taming ? 'なだめる（連打）' : '降りる') : o ? (typeof o.label === 'function' ? o.label() : o.label) : null;
      this.setPrompt(lab ? '<b>' + (G.isTouchActive ? '調べる' : 'F') + '</b>' + G.U.escape(lab) : null);
    }
    this._promptForced = false;
    // ボスバー
    const boss = G.Bosses.activeNear(p.pos, 70);
    if (boss) { this.el['boss-bar'].classList.remove('hidden'); this.el['boss-name'].textContent = boss.name; this.el['boss-fill'].style.width = (boss.hp / boss.maxHp * 100) + '%'; }
    else this.el['boss-bar'].classList.add('hidden');
    // 画面効果
    const v = this.el.vignette; const low = hp <= 4 && hp > 0;
    const cls = low ? 'low' : p.tempWarn === 'cold' ? 'cold' : p.tempWarn === 'hot' ? 'hot' : '';
    if (v.className !== cls) v.className = cls;
    // ダウン
    const dm = this.el['downed-msg'];
    if (p.downed) { dm.classList.remove('hidden'); dm.textContent = '倒れてしまった… 仲間の救助を待とう（残り ' + Math.ceil(p.downT) + ' 秒）\nF長押しであきらめる'; } else dm.classList.add('hidden');
    // パーティー
    this._pt = (this._pt || 0) - dt;
    if (this._pt <= 0) { this._pt = 0.4; this.updateParty(); }
    // ミニマップ
    this._mt = (this._mt || 0) - dt; if (this._mt <= 0) { this._mt = 0.1; G.Map.drawMini(this.mmCtx, 180); }
    this.updateDamage(dt);
    // 自分の吹き出し
    if (G.Remote.selfBubble) { if (!this.selfLabel) this.selfLabel = this.makeLabel(); this.placeLabel(this.selfLabel, p.pos, 2.3, true, '', -1, G.Remote.selfBubble.text, null); }
    else if (this.selfLabel) { this.selfLabel.style.display = 'none'; }
  },
  drawEquip() {
    for (const cat of ['melee', 'bow', 'rod']) {
      const w = G.Prog.equipped(cat), slot = this.eq[cat];
      G.Icons.draw(slot.querySelector('canvas'), w ? w.id : null);
      slot.classList.toggle('empty', !w);
    }
    this.drawEquipDur();
  },
  drawEquipDur() {
    for (const cat of ['melee', 'bow', 'rod']) {
      const w = G.Prog.equipped(cat), slot = this.eq[cat]; const bar = slot.querySelector('.dur div');
      if (!w) { bar.style.width = '0%'; continue; }
      const d = G.Items.weapons[w.id]; const f = w.sleep ? 0 : w.dur / d.dur;
      bar.style.width = (f * 100) + '%'; bar.style.background = w.sleep ? '#888' : f < 0.25 ? '#ff5a4e' : f < 0.5 ? '#ffd23b' : '#7ee07a';
    }
    const at = G.Prog.data.equip.arrow;
    this.el['arrow-count'].textContent = (at !== 'normal' ? G.Items.arrows[at].name.replace('の矢', '').replace('矢', '') + ' ' : '') + G.Prog.arrowText(at);
  },
  setPrompt(html) {
    const e = this.el.prompt;
    if (!html) { if (!e.classList.contains('hidden')) e.classList.add('hidden'); return; }
    if (e.innerHTML !== html) e.innerHTML = html; e.classList.remove('hidden');
  },
  prompt(text) { this._promptForced = true; this.setPrompt('<b>!</b>' + G.U.escape(text)); },
  notify(text) {
    const e = G.U.html('div', 'ntf', text); this.el.notify.appendChild(e);
    while (this.el.notify.children.length > 6) this.el.notify.removeChild(this.el.notify.firstChild);
    setTimeout(() => { e.style.transition = 'opacity 0.5s'; e.style.opacity = 0; setTimeout(() => e.remove(), 500); }, 3200);
  },
  centerMsg(text, sec = 2) {
    const e = this.el['center-msg']; e.textContent = text; e.style.opacity = 1;
    clearTimeout(this._cmT); this._cmT = setTimeout(() => (e.style.opacity = 0), sec * 1000);
  },
  areaMsg(text) {
    const e = this.el['area-msg']; e.textContent = text; e.style.whiteSpace = 'pre-line'; e.style.opacity = 1;
    clearTimeout(this._amT); this._amT = setTimeout(() => (e.style.opacity = 0), 3000);
  },
  itemGet(name, weaponId, desc) {
    G.Audio.play('itemGet');
    this.centerMsg(name + ' を手に入れた！' + (desc ? '\n' + desc : ''), desc ? 3.5 : 2.2);
    this.notify('★ ' + name);
  },
  setQuest(title, desc, tip) {
    this.el['quest-track'].innerHTML = '<div class="qt-title">◆ ' + G.U.escape(title) + '</div><div class="qt-sub">' + G.U.escape(desc) + '</div>' + (tip ? '<div class="qt-sub" style="color:#9fe0ff">▶ ' + G.U.escape(tip) + '</div>' : '');
  },
  setTimer(t) { const e = this.el.timer; if (t == null) { e.style.display = 'none'; return; } e.style.display = 'block'; e.textContent = '⏱ ' + Math.max(0, t).toFixed(1); e.style.color = t < 3 ? '#ff6b6b' : '#fff8e0'; },
  chatLine(name, text) {
    const e = G.U.html('div');
    e.innerHTML = name === 'system' ? '<span style="color:#9fe0ff">' + G.U.escape(text) + '</span>' : '<b style="color:#e8c872">' + G.U.escape(name) + '</b>: ' + G.U.escape(text);
    this.el['chat-log'].appendChild(e);
    while (this.el['chat-log'].children.length > 7) this.el['chat-log'].removeChild(this.el['chat-log'].firstChild);
    setTimeout(() => { e.style.transition = 'opacity 1s'; e.style.opacity = 0; setTimeout(() => e.remove(), 1000); }, 12000);
  },
  updateRoom() {
    const e = this.el['room-info'];
    if (G.Net.role === 'single') { e.classList.add('hidden'); return; }
    e.classList.remove('hidden');
    const n = 1 + G.Remote.list().length;
    e.innerHTML = (G.Net.role === 'host' ? 'ルームコード <b>' + G.Net.code + '</b>' : 'ルーム <b>' + G.Net.code + '</b> に参加中') + '　👥 ' + n + '/4' + (G.Net.pvp ? '　<span style="color:#ff8a80">⚔対戦ON</span>' : '');
  },
  updateParty() {
    const box = this.el.party; const list = G.Remote.list();
    if (!list.length) { if (box.innerHTML) box.innerHTML = ''; return; }
    let h = '';
    for (const r of list) {
      const f = G.U.clamp(r.hp / Math.max(1, r.mhp), 0, 1);
      const where = r.interior ? '（祠の中）' : r.downed ? '（ダウン！）' : '';
      h += '<div class="pm">' + G.U.escape(r.name) + ' Lv' + r.lv + ' <span style="color:#aaa">' + Math.round(r.pos.distanceTo(G.player.pos)) + 'm' + where + '</span>' + (G.Net.pvp ? ' ⚔' + (G.Net.kills[r.id] || 0) : '') + '<div class="pmhp"><div style="width:' + (f * 100) + '%"></div></div></div>';
    }
    box.innerHTML = h;
  },
  // ---- 3Dに追従するラベル ----
  project(pos, h) {
    const v = G.tmp.v4.set(pos.x, pos.y + h, pos.z).project(G.camera);
    if (v.z > 1 || v.z < -1) return null;
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
  },
  makeLabel() { const e = G.U.html('div', 'lbl'); this.el.labels.appendChild(e); return e; },
  removeLabel(e) { e.remove(); },
  placeLabel(e, pos, h, visible, name, hpFrac, bubble, extra) {
    const s = visible ? this.project(pos, h) : null;
    const dist = G.camera.position.distanceTo(pos);
    if (!s || dist > 150) { e.style.display = 'none'; return; }
    e.style.display = 'block'; e.style.left = s.x + 'px'; e.style.top = s.y + 'px';
    const key = name + '|' + (hpFrac >= 0 ? Math.round(hpFrac * 20) : -1) + '|' + bubble + '|' + extra;
    if (e._k !== key) {
      e._k = key;
      e.innerHTML = (bubble ? '<div class="bubble">' + G.U.escape(bubble) + '</div>' : '') + (extra ? '<div style="color:#ff8a80;font-weight:bold">' + extra + '</div>' : '') + (name ? '<div>' + G.U.escape(name) + '</div>' : '') + (hpFrac >= 0 ? '<div class="hpb"><div style="width:' + (hpFrac * 100) + '%"></div></div>' : '');
    }
  },
  damageNumber(pos, val, type, h = 1.6) {
    if (this.dmgEls.length > 30) return;
    const e = G.U.html('div', 'dmg ' + (type || ''), String(val)); this.el.labels.appendChild(e);
    this.dmgEls.push({ e, pos: pos.clone(), h: h + 0.2, t: 0, ox: (Math.random() - 0.5) * 30 });
  },
  floatXP(n) { if (G.player && n > 0) { const e = G.U.html('div', 'dmg heal', '+' + Math.round(n) + ' EXP'); e.style.fontSize = '14px'; this.el.labels.appendChild(e); this.dmgEls.push({ e, pos: G.player.pos.clone(), h: 2.4, t: 0, ox: 40 }); } },
  enemyAlert(e) { const el = G.U.html('div', 'enemy-alert', '!'); this.el.labels.appendChild(el); this.dmgEls.push({ e: el, pos: e.pos, h: (e.height || 1.6) + 0.6, t: 0, ox: 0, alert: true, follow: e }); },
  updateDamage(dt) {
    for (let i = this.dmgEls.length - 1; i >= 0; i--) {
      const d = this.dmgEls[i]; d.t += dt;
      const life = d.alert ? 1.0 : 1.0;
      const pos = d.follow ? d.follow.pos : d.pos;
      const s = this.project(pos, d.h + (d.alert ? 0 : d.t * 1.2));
      if (!s || d.t > life) { d.e.remove(); this.dmgEls.splice(i, 1); continue; }
      d.e.style.left = (s.x + d.ox) + 'px'; d.e.style.top = s.y + 'px'; d.e.style.opacity = Math.min(1, (life - d.t) * 3);
    }
  },
  flashDamage() { const v = this.el.vignette; v.style.boxShadow = 'inset 0 0 160px rgba(255,0,0,0.6)'; setTimeout(() => (v.style.boxShadow = ''), 160); },
};
