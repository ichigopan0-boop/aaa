// ===== メニュー・ショップ・料理などのパネル =====
'use strict';
G.UI = {
  menuOpen: false, panelOpen: false, tab: 'melee', sel: null, pot: [],
  init() {
    this.menu = G.U.el('menu'); this.tabsEl = G.U.el('menu-tabs'); this.body = G.U.el('menu-body');
    this.panel = G.U.el('panel'); this.pTitle = G.U.el('panel-title'); this.pBody = G.U.el('panel-body');
    G.U.el('menu-close').onclick = () => this.closeMenu();
    G.U.el('panel-close').onclick = () => this.closePanel();
    this.tabs = [['melee', '武器'], ['bow', '弓・矢'], ['rod', 'ロッド'], ['mats', '素材'], ['foods', '料理'], ['skills', 'スキル'], ['quests', 'クエスト'], ['status', 'ステータス'], ['system', 'システム']];
    this.tabs.forEach(([id, name]) => { const b = G.U.html('button', 'mtab', name); b.dataset.t = id; b.onclick = () => { this.tab = id; this.sel = null; G.Audio.play('cursor'); this.render(); }; this.tabsEl.appendChild(b); });
    // チャット
    this.chatWrap = G.U.el('chat-input-wrap'); this.chatInput = G.U.el('chat-input');
    this.chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = this.chatInput.value; this.closeChat(); if (v.trim()) G.Net.chat(v); e.preventDefault(); } if (e.key === 'Escape') this.closeChat(); e.stopPropagation(); });
    this.chatInput.addEventListener('blur', () => setTimeout(() => this.closeChat(), 100));
    this.stampEl = G.U.el('stamp-menu');
    G.Net.stamps.forEach((s, i) => { const b = G.U.html('button', '', s); b.onclick = () => { G.Net.stamp(i); this.closeStamp(); }; this.stampEl.appendChild(b); });
    G.U.el('btn-revive').onclick = () => G.Game.respawn();
  },
  anyOpen() { return this.menuOpen || this.panelOpen || G.Dialog.active || G.Map.open || this.chatOpen || this.stampOpen || G.state !== 'playing'; },
  // ---- メニュー ----
  openMenu(tab) {
    if (tab) this.tab = tab; this.menuOpen = true; this.sel = null; this.menu.classList.remove('hidden'); G.Input.exitLock(); G.Audio.play('select'); this.render();
  },
  closeMenu() { this.menuOpen = false; this.menu.classList.add('hidden'); G.Audio.play('cursor'); G.Input.clearAll(); },
  render() {
    [...this.tabsEl.children].forEach(b => b.classList.toggle('sel', b.dataset.t === this.tab));
    const P = G.Prog, d = P.data, B = this.body; B.innerHTML = '';
    if (this.tab === 'melee' || this.tab === 'bow' || this.tab === 'rod') this.renderWeapons(this.tab);
    else if (this.tab === 'mats') this.renderMats();
    else if (this.tab === 'foods') this.renderFoods();
    else if (this.tab === 'skills') this.renderSkills();
    else if (this.tab === 'quests') this.renderQuests();
    else if (this.tab === 'status') this.renderStatus();
    else if (this.tab === 'system') this.renderSystem();
  },
  cell(content, opts = {}) {
    const c = G.U.html('div', 'cell' + (opts.sel ? ' sel' : '') + (opts.eq ? ' eq' : '') + (opts.empty ? ' empty' : ''));
    if (content) c.appendChild(content);
    if (opts.cnt != null) c.appendChild(G.U.html('span', 'cnt', '×' + opts.cnt));
    if (opts.dur != null) { const b = G.U.html('div', 'dur'); const i = G.U.html('div'); i.style.width = (opts.dur * 100) + '%'; i.style.background = opts.dur < 0.25 ? '#ff5a4e' : opts.dur < 0.5 ? '#ffd23b' : '#7ee07a'; b.appendChild(i); c.appendChild(b); }
    if (opts.onclick) c.onclick = opts.onclick;
    return c;
  },
  iconCanvas(id) { const cv = document.createElement('canvas'); cv.width = cv.height = 48; G.Icons.draw(cv, id); return cv; },
  renderWeapons(cat) {
    const P = G.Prog, d = P.data, B = this.body;
    const list = d.inv[cat];
    B.appendChild(G.U.html('div', 'sec-title', { melee: '近接武器', bow: '弓', rod: '魔法ロッド' }[cat] + '（' + list.length + ' / ' + d.slots[cat] + '）'));
    const grid = G.U.html('div', 'grid');
    for (let i = 0; i < d.slots[cat]; i++) {
      const w = list[i];
      if (!w) { grid.appendChild(this.cell(null, { empty: true })); continue; }
      const def = G.Items.weapons[w.id];
      grid.appendChild(this.cell(this.iconCanvas(w.id), { sel: this.sel === i, eq: d.equip[cat] === i, dur: w.sleep ? 0 : w.dur / def.dur, onclick: () => { this.sel = i; G.Audio.play('cursor'); this.render(); } }));
    }
    B.appendChild(grid);
    if (cat === 'bow') {
      B.appendChild(G.U.html('div', 'sec-title', '矢（Xキーで切り替え・普通の矢は無限）'));
      const g2 = G.U.html('div', 'grid');
      for (const at of G.Items.arrowOrder) {
        const n = P.arrowText(at); const A = G.Items.arrows[at];
        const e = G.U.html('div', '', A.name); e.style.cssText = 'font-size:12px;text-align:center;padding:4px;color:#' + A.color.toString(16).padStart(6, '0');
        g2.appendChild(this.cell(e, { cnt: n, eq: d.equip.arrow === at, onclick: () => { d.equip.arrow = at; G.Events.emit('invChanged'); this.render(); } }));
      }
      B.appendChild(g2);
    }
    const det = G.U.html('div', 'detail');
    const w = list[this.sel];
    if (w) {
      const def = G.Items.weapons[w.id];
      const tn = { sword: '片手剣', heavy: '両手武器', spear: '槍', bow: '弓', rod: 'ロッド' }[def.type];
      let html = '<h3>' + def.name + '</h3><p>' + tn + '　攻撃力 <b>' + def.atk + '</b>（実際 ' + Math.round(def.atk * (cat === 'bow' ? P.bowMul() : cat === 'rod' ? P.magicMul() : P.atkMul())) + '）　耐久 ' + Math.max(0, w.dur) + ' / ' + def.dur + (w.sleep ? '（眠っている：残り' + Math.ceil(w.sleep) + '秒）' : '') + '</p>';
      const tags = []; if (def.elem) tags.push({ fire: '🔥炎', ice: '❄氷', elec: '⚡雷' }[def.elem]); if (def.ancient) tags.push('💠古代'); if (def.metal) tags.push('金属'); if (def.multi) tags.push(def.multi + '連射'); if (def.mp) tags.push('MP' + def.mp);
      if (tags.length) html += '<p>' + tags.join('　') + '</p>';
      html += '<p>' + def.desc + '</p>';
      det.innerHTML = html;
      const row = G.U.html('div', 'btnrow');
      const eb = G.U.html('button', 'mbtn', '装備する'); eb.disabled = d.equip[cat] === this.sel; eb.onclick = () => { P.equip(cat, this.sel); G.Audio.play('select'); this.render(); };
      const db = G.U.html('button', 'mbtn danger', '捨てる'); db.onclick = () => { const it = P.removeWeapon(cat, this.sel); if (it && G.player) G.Pickups.dropWeapon(it.id, G.player.pos.clone().add(G.player.facing(G.tmp.v1).multiplyScalar(1.2)).setY(G.player.pos.y + 1), it.dur); this.sel = null; G.Audio.play('cursor'); this.render(); };
      if (def.legendary) db.disabled = true;
      row.append(eb, db); det.appendChild(row);
    } else det.innerHTML = '<p>武器を選ぶと詳細が表示されます。1/2/3キーで装備を切り替えられます。</p>';
    B.appendChild(det);
  },
  renderMats() {
    const P = G.Prog, d = P.data, B = this.body;
    const ids = Object.keys(d.inv.mats).filter(id => d.inv.mats[id] > 0);
    B.appendChild(G.U.html('div', 'sec-title', '素材（' + ids.length + '種類）'));
    const grid = G.U.html('div', 'grid');
    for (const id of ids) { const m = G.Items.mats[id]; if (!m) continue; grid.appendChild(this.cell(G.U.html('div', 'emo', m.ic), { cnt: d.inv.mats[id], sel: this.sel === id, onclick: () => { this.sel = id; this.render(); } })); }
    B.appendChild(grid);
    const det = G.U.html('div', 'detail'); const m = G.Items.mats[this.sel];
    if (m && d.inv.mats[this.sel]) {
      det.innerHTML = '<h3>' + m.ic + ' ' + m.name + '</h3><p>' + m.desc + '</p><p>' + (m.heal ? '回復 ' + (m.heal / 4) + 'ハート　' : '') + (m.eff ? '効果: ' + G.Items.effectDesc[m.eff] + '　' : '') + '売値 ' + m.price + 'G</p>';
      const row = G.U.html('div', 'btnrow');
      if (G.Items.edible(this.sel)) { const b = G.U.html('button', 'mbtn', 'そのまま食べる'); b.onclick = () => { P.eatMat(this.sel); this.render(); }; row.appendChild(b); }
      const db = G.U.html('button', 'mbtn danger', '1つ捨てる'); db.onclick = () => { P.removeMat(this.sel, 1); this.render(); }; row.appendChild(db);
      det.appendChild(row);
    } else det.innerHTML = '<p>料理鍋で素材を組み合わせると、回復量が増えたり特別な効果がつきます。</p>';
    B.appendChild(det);
  },
  renderFoods() {
    const P = G.Prog, d = P.data, B = this.body;
    B.appendChild(G.U.html('div', 'sec-title', '料理・薬（Rキーで自動で食べる）'));
    const grid = G.U.html('div', 'grid');
    d.inv.foods.forEach((f, i) => grid.appendChild(this.cell(G.U.html('div', 'emo', f.ic || '🍲'), { cnt: f.n, sel: this.sel === i, onclick: () => { this.sel = i; this.render(); } })));
    B.appendChild(grid);
    const det = G.U.html('div', 'detail'); const f = d.inv.foods[this.sel];
    if (f) {
      det.innerHTML = '<h3>' + (f.ic || '') + ' ' + f.name + '</h3><p>' + (f.heal ? '回復 ' + (f.heal / 4) + 'ハート　' : '') + (f.eff ? G.Items.effectDesc[f.eff] + ' Lv' + f.pow + (f.dur ? '（' + Math.round(f.dur * (1 + P.skill('cook') * 0.5)) + '秒）' : '') : '') + '</p>';
      const row = G.U.html('div', 'btnrow');
      const b = G.U.html('button', 'mbtn', '食べる'); b.onclick = () => { P.eatFood(this.sel); if (!d.inv.foods[this.sel]) this.sel = null; this.render(); }; row.appendChild(b);
      const db = G.U.html('button', 'mbtn danger', '1つ捨てる'); db.onclick = () => { f.n--; if (f.n <= 0) { d.inv.foods.splice(this.sel, 1); this.sel = null; } this.render(); }; row.appendChild(db);
      det.appendChild(row);
    } else det.innerHTML = '<p>' + (d.inv.foods.length ? '料理を選んでください。' : '料理がありません。村の料理鍋で作ろう。') + '</p>';
    B.appendChild(det);
  },
  renderSkills() {
    const P = G.Prog, d = P.data, B = this.body;
    B.appendChild(G.U.html('div', 'sec-title', 'スキルポイント：' + d.sp + '　（レベルアップでもらえる。5レベルごとに2ポイント）'));
    const tree = G.U.html('div', 'skill-tree'); const cols = {};
    for (const sk of G.Skills) {
      if (!cols[sk.col]) { cols[sk.col] = G.U.html('div', 'skill-col'); cols[sk.col].appendChild(G.U.html('h4', '', sk.col)); tree.appendChild(cols[sk.col]); }
      const r = P.skill(sk.id), need = sk.lv + r * 2;
      const row = G.U.html('div', 'skill' + (d.level < sk.lv ? ' locked' : ''));
      row.innerHTML = '<div><div>' + sk.name + '</div><div class="sk-desc">' + sk.desc + (r < sk.max ? '（必要Lv' + need + '）' : '') + '</div></div><span class="sk-rank">' + r + '/' + sk.max + '</span>';
      const b = G.U.html('button', 'mbtn', r >= sk.max ? '最大' : '習得'); b.disabled = !P.canLearn(sk);
      b.onclick = () => { if (P.learn(sk)) { G.Audio.play('levelUp'); G.Hud.notify(sk.name + ' を習得した！'); this.render(); } };
      row.appendChild(b); cols[sk.col].appendChild(row);
    }
    B.appendChild(tree);
  },
  renderQuests() {
    const B = this.body;
    for (const q of G.Quests.list()) {
      const e = G.U.html('div', 'quest' + (q.main ? ' main' : '') + (q.done ? ' done' : ''));
      e.innerHTML = '<h4>' + (q.main ? '【メイン】' : '') + q.title + (q.prog ? '　<span style="color:#e8c872">' + q.prog + '</span>' : '') + (q.done ? ' ✔' : '') + '</h4><p>' + q.desc + '</p>';
      B.appendChild(e);
    }
    B.appendChild(G.U.html('div', 'sec-title', 'ヒント'));
    for (const h of G.Text.hints) B.appendChild(G.U.html('p', '', h));
  },
  renderStatus() {
    const P = G.Prog, d = P.data, B = this.body, c = G.Quests.counts();
    const rows = [
      ['名前', d.name], ['レベル', d.level + (d.level < 50 ? '（次まで ' + (P.xpNext(d.level) - d.xp) + ' EXP）' : '（最大）')], ['ハート', P.heartCount() + '個（最大HP ' + P.maxHp() / 4 + '）'],
      ['がんばり', P.maxStamina()], ['MP', P.maxMp()], ['近接の攻撃倍率', '×' + P.atkMul().toFixed(2)], ['弓の攻撃倍率', '×' + P.bowMul().toFixed(2)], ['魔法の攻撃倍率', '×' + P.magicMul().toFixed(2)],
      ['ダメージ軽減', Math.round(P.defPct() * 100) + '%'], ['会心率', Math.round(P.critChance() * 100) + '%'], ['祝福の光（未使用）', d.blessings], ['所持金', G.U.fmt(d.money) + ' G'],
      ['観測塔', c.towers + '/' + c.towersT], ['祠', c.shrines + '/' + c.shrinesT], ['森の精の実', c.seeds + '/' + c.seedsT + '（使用 ' + d.seedsSpent + '）'], ['各地の主', c.bosses + '/' + c.bossesT], ['宝箱', c.chests + '/' + c.chestsT],
      ['倒した敵', d.stats.kills], ['力尽きた回数', d.stats.deaths], ['プレイ時間', Math.floor(d.stats.play / 3600) + '時間' + Math.floor(d.stats.play / 60 % 60) + '分'],
    ];
    B.appendChild(G.U.html('div', 'sec-title', 'ステータス'));
    for (const [k, v] of rows) { const r = G.U.html('div', 'stat-row'); r.innerHTML = '<span>' + k + '</span><b>' + G.U.escape(String(v)) + '</b>'; B.appendChild(r); }
  },
  renderSystem() {
    const B = this.body, S = G.settings;
    // オンライン
    B.appendChild(G.U.html('div', 'sec-title', 'オンライン'));
    const on = G.U.html('div', 'detail');
    if (G.Net.role === 'single') {
      on.innerHTML = '<p>今はひとりで遊んでいます。ホストになると、友達がルームコードで参加できます（最大4人）。</p>';
      const b = G.U.html('button', 'mbtn', 'ホストになる（ルームを開く）');
      b.onclick = () => { b.disabled = true; b.textContent = '接続中…'; G.Net.host().then((code) => { G.Hud.updateRoom(); G.Hud.notify('ルームを開いた！ コード: ' + code); this.render(); }).catch((e) => { G.Hud.notify('ルームを開けませんでした: ' + e.message); this.render(); }); };
      on.appendChild(b);
    } else {
      on.innerHTML = '<p>' + (G.Net.role === 'host' ? 'あなたはホストです。ルームコード: <b style="font-size:20px;color:#6fe3ff;letter-spacing:0.15em">' + G.Net.code + '</b>（友達に伝えよう）' : 'ルーム ' + G.Net.code + ' に参加中') + '</p>';
      const row = G.U.html('div', 'btnrow');
      if (G.Net.role === 'host') {
        const pv = G.U.html('button', 'mbtn', G.Net.pvp ? '⚔ 対戦モードをOFFにする' : '⚔ 対戦モードをONにする');
        pv.onclick = () => { G.Net.setPvp(!G.Net.pvp); G.Hud.updateRoom(); this.render(); }; row.appendChild(pv);
        const cp = G.U.html('button', 'mbtn', 'コードをコピー'); cp.onclick = () => { try { navigator.clipboard.writeText(G.Net.code); G.toast('コピーしました'); } catch (e) { } }; row.appendChild(cp);
      }
      for (const r of G.Remote.list()) {
        const w = G.U.html('button', 'mbtn', r.name + ' のところへワープ'); w.disabled = !!r.interior || G.Shrine.inside;
        w.onclick = () => { this.closeMenu(); G.UI.fade(true, () => { G.player.teleport(r.pos.x + 1.5, null, r.pos.z + 1.5); G.Audio.play('warp'); G.UI.fade(false); }); };
        row.appendChild(w);
      }
      const lv = G.U.html('button', 'mbtn danger', 'ルームを抜ける'); lv.onclick = () => { G.Net.leave(); G.Hud.notify('ルームを抜けました'); this.render(); }; row.appendChild(lv);
      on.appendChild(row);
      on.appendChild(G.U.html('p', '', 'チャット：Enter　スタンプ：V　マップでピン：右クリック'));
    }
    B.appendChild(on);
    // 設定
    B.appendChild(G.U.html('div', 'sec-title', '設定'));
    const opt = (label, el) => { const r = G.U.html('div', 'opt-row'); r.appendChild(G.U.html('span', '', label)); r.appendChild(el); B.appendChild(r); };
    const range = (k, min, max, step, cb) => { const i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = S[k]; i.oninput = () => { S[k] = +i.value; G.saveSettings(); cb && cb(); }; return i; };
    const check = (k, cb) => { const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!S[k]; i.onchange = () => { S[k] = i.checked; G.saveSettings(); cb && cb(); }; return i; };
    const q = document.createElement('select'); ['低（軽い）', '中', '高（きれい）'].forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; if (S.quality === i) o.selected = true; q.appendChild(o); });
    q.onchange = () => { S.quality = +q.value; S.viewDist = [380, 620, 850][S.quality]; G.saveSettings(); G.toast('画質は次回起動時に反映されます（描画距離は今すぐ反映）'); };
    opt('画質', q);
    opt('描画距離', range('viewDist', 250, 900, 10));
    opt('全体の音量', range('volMaster', 0, 1, 0.05, () => G.Audio.applyVolume()));
    opt('BGM', range('volBgm', 0, 1, 0.05, () => G.Audio.applyVolume()));
    opt('効果音', range('volSfx', 0, 1, 0.05, () => G.Audio.applyVolume()));
    opt('カメラ感度', range('sens', 0.3, 2.5, 0.05));
    opt('上下反転', check('invertY'));
    opt('マウスを画面にロック（PC）', check('pointerLock'));
    opt('FPS表示', check('showFps'));
    const row = G.U.html('div', 'btnrow');
    const sv = G.U.html('button', 'mbtn', '今すぐセーブ'); sv.onclick = () => { G.Prog.save(); G.toast('セーブしました'); };
    const tt = G.U.html('button', 'mbtn danger', 'セーブしてタイトルへ'); tt.onclick = () => { G.Prog.save(); G.Net.leave(); location.reload(); };
    const hw = G.U.html('button', 'mbtn', '操作方法'); hw.onclick = () => G.Title.showHowto();
    row.append(sv, hw, tt); B.appendChild(row);
  },
  // ---- パネル共通 ----
  openPanel(title) { this.panelOpen = true; this.panel.classList.remove('hidden'); this.pTitle.textContent = title; this.pBody.innerHTML = ''; G.Input.exitLock(); return this.pBody; },
  closePanel() { this.panelOpen = false; this.panel.classList.add('hidden'); G.Input.clearAll(); },
  // ---- ショップ ----
  openShop(id, name, mode = 'buy') {
    const B = this.openPanel(name + ' のお店　💰 ' + G.U.fmt(G.Prog.data.money) + ' G');
    const tabs = G.U.html('div', 'btnrow');
    const bb = G.U.html('button', 'mbtn', '買う'), sb = G.U.html('button', 'mbtn', '売る');
    bb.onclick = () => this.openShop(id, name, 'buy'); sb.onclick = () => this.openShop(id, name, 'sell');
    if (mode === 'buy') bb.style.borderColor = '#e8c872'; else sb.style.borderColor = '#e8c872';
    tabs.append(bb, sb); B.appendChild(tabs);
    const P = G.Prog;
    if (mode === 'buy') {
      for (const it of G.Items.shops[id]) {
        const row = G.U.html('div', 'shop-item');
        let nm, desc, icon;
        if (it.k === 'w') { const w = G.Items.weapons[it.id]; nm = w.name; desc = '攻撃力' + w.atk + ' 耐久' + w.dur + '　' + w.desc; icon = this.iconCanvas(it.id); }
        else if (it.k === 'a') { nm = G.Items.arrows[it.id].name + ' ×' + it.n; desc = '所持 ' + P.arrowText(it.id); icon = G.U.html('div', 'emo', '🏹'); }
        else if (it.k === 'm') { const m = G.Items.mats[it.id]; nm = m.name; desc = m.desc + '（所持 ' + P.matCount(it.id) + '）'; icon = G.U.html('div', 'emo', m.ic); }
        else if (it.k === 'f') { const f = G.Items.potions[it.id]; nm = f.name; desc = (f.heal ? '回復' + f.heal / 4 + 'ハート ' : '') + (f.eff ? G.Items.effectDesc[f.eff] + ' Lv' + f.pow : ''); icon = G.U.html('div', 'emo', f.ic); }
        icon.style.fontSize = '26px'; row.appendChild(icon);
        const info = G.U.html('div', 'si-name'); info.innerHTML = nm + '<div class="si-desc">' + desc + '</div>'; row.appendChild(info);
        row.appendChild(G.U.html('div', 'si-price', it.p + ' G'));
        const b = G.U.html('button', 'mbtn', '買う'); b.disabled = P.data.money < it.p;
        b.onclick = () => {
          if (it.k === 'w' && P.data.inv[P.wcat(it.id)].length >= P.data.slots[P.wcat(it.id)]) { G.Hud.notify('武器がいっぱい！'); G.Audio.play('error'); return; }
          if (!P.spend(it.p)) { G.Audio.play('error'); return; }
          P.give(it, true); G.Audio.play('coin'); G.Hud.notify(nm + ' を買った'); this.openShop(id, name, 'buy');
        };
        row.appendChild(b); B.appendChild(row);
      }
    } else {
      const ids = Object.keys(P.data.inv.mats).filter(k => P.data.inv.mats[k] > 0);
      if (!ids.length) B.appendChild(G.U.html('p', '', '売れるものがありません。'));
      for (const mid of ids) {
        const m = G.Items.mats[mid]; if (!m) continue;
        const row = G.U.html('div', 'shop-item'); const ic = G.U.html('div', 'emo', m.ic); ic.style.fontSize = '26px'; row.appendChild(ic);
        const info = G.U.html('div', 'si-name'); info.innerHTML = m.name + ' ×' + P.data.inv.mats[mid] + '<div class="si-desc">' + m.desc + '</div>'; row.appendChild(info);
        row.appendChild(G.U.html('div', 'si-price', m.price + ' G'));
        const b1 = G.U.html('button', 'mbtn', '1つ売る'); b1.onclick = () => { if (P.removeMat(mid, 1)) { P.addMoney(m.price); G.Audio.play('coin'); this.openShop(id, name, 'sell'); } };
        const ba = G.U.html('button', 'mbtn', '全部売る'); ba.onclick = () => { const n = P.matCount(mid); if (P.removeMat(mid, n)) { P.addMoney(m.price * n); G.Audio.play('coin'); this.openShop(id, name, 'sell'); } };
        row.append(b1, ba); B.appendChild(row);
      }
    }
  },
  // ---- 宿屋 ----
  openInn(name, vid) {
    const B = this.openPanel(name + '：宿屋（20ゴールド）');
    B.appendChild(G.U.html('p', '', 'ぐっすり休むとハートとがんばりが全回復し、時間が進みます。ここが復活地点になります。'));
    const row = G.U.html('div', 'btnrow');
    for (const [label, t] of [['朝まで（6時）', 6], ['昼まで（12時）', 12], ['夜まで（20時）', 20]]) {
      const b = G.U.html('button', 'mbtn', label);
      b.onclick = () => {
        if (!G.Prog.spend(20)) { G.Hud.notify('お金が足りない…'); G.Audio.play('error'); return; }
        this.closePanel();
        this.fade(true, () => {
          const pl = G.player; pl.hp = G.Prog.maxHp(); pl.stamina = pl.maxStamina(); pl.mp = G.Prog.maxMp(); pl.exhausted = false;
          if (G.Net.role !== 'guest') { G.Sky.time = t; G.Enemies.respawnAll(); if (G.Net.role === 'host') G.Net.twT = 0; }
          const v = G.World.villages.find(x => x.id === vid); if (v) G.Prog.data.respawn = { x: v.x, y: null, z: v.z + 3 };
          G.Prog.save(); G.Audio.play('heal');
          setTimeout(() => { this.fade(false); G.Hud.centerMsg(G.Net.role === 'guest' ? 'ぐっすり休んだ！（時間はホストに合わせます）' : 'ぐっすり休んだ！', 2); }, 900);
        });
      };
      row.appendChild(b);
    }
    B.appendChild(row);
  },
  // ---- 料理 ----
  openCooking() {
    this.pot = [];
    this.renderCooking();
  },
  renderCooking() {
    const B = this.openPanel('料理鍋（素材を5つまで入れよう）'), P = G.Prog;
    const potRow = G.U.html('div', 'grid'); potRow.style.marginBottom = '10px';
    for (let i = 0; i < 5; i++) { const id = this.pot[i]; potRow.appendChild(this.cell(id ? G.U.html('div', 'emo', G.Items.mats[id].ic) : null, { empty: !id, onclick: () => { if (id) { this.pot.splice(i, 1); this.renderCooking(); } } })); }
    B.appendChild(potRow);
    const row = G.U.html('div', 'btnrow');
    const cb = G.U.html('button', 'mbtn', '🍳 料理する'); cb.disabled = !this.pot.length;
    cb.onclick = () => {
      const res = G.Items.cook(this.pot); if (!res) return;
      for (const id of this.pot) P.removeMat(id, 1);
      P.addFood(res); this.pot = []; G.Audio.play('cook');
      setTimeout(() => G.Audio.play('itemGet'), 700);
      G.Hud.centerMsg(res.name + ' ができた！\n' + (res.heal ? '回復 ' + res.heal / 4 + 'ハート ' : '') + (res.eff ? G.Items.effectDesc[res.eff] + ' Lv' + res.pow : ''), 3);
      this.renderCooking();
    };
    const clr = G.U.html('button', 'mbtn', 'もどす'); clr.onclick = () => { this.pot = []; this.renderCooking(); };
    row.append(cb, clr); B.appendChild(row);
    if (this.pot.length) { const pv = G.Items.cook(this.pot); B.appendChild(G.U.html('p', '', '予想：' + pv.name + '（回復 ' + pv.heal / 4 + 'ハート' + (pv.eff ? '・' + G.Items.effectDesc[pv.eff] + ' Lv' + pv.pow : '') + '）')); }
    B.appendChild(G.U.html('div', 'sec-title', '手持ちの素材（クリックで鍋に入れる）'));
    const grid = G.U.html('div', 'grid');
    for (const id of Object.keys(P.data.inv.mats)) {
      const m = G.Items.mats[id]; if (!m || ['gem', 'ancient'].includes(m.cat)) continue;
      const left = P.matCount(id) - this.pot.filter(x => x === id).length; if (left <= 0) continue;
      const c = this.cell(G.U.html('div', 'emo', m.ic), { cnt: left, onclick: () => { if (this.pot.length < 5) { this.pot.push(id); G.Audio.play('cursor'); this.renderCooking(); } } });
      c.title = m.name + (m.eff ? '（' + G.Items.effectDesc[m.eff] + '）' : ''); grid.appendChild(c);
    }
    B.appendChild(grid);
  },
  // ---- 女神像 ----
  openStatue() {
    const B = this.openPanel('女神像'), d = G.Prog.data;
    B.appendChild(G.U.html('p', '', '祝福の光を4つ捧げると、ハートの器かがんばりの器を授かることができます。（所持：' + d.blessings + '個）'));
    const row = G.U.html('div', 'btnrow');
    const h = G.U.html('button', 'mbtn', '❤ ハートの器（ハート+1）'), s = G.U.html('button', 'mbtn', '🟢 がんばりの器（がんばり+20）');
    h.disabled = s.disabled = d.blessings < 4;
    h.onclick = () => { d.blessings -= 4; d.hearts++; G.player.hp = G.Prog.maxHp(); G.Audio.play('blessing'); G.Hud.centerMsg('ハートが増えた！', 2); G.Prog.save(); G.Quests.update(); this.openStatue(); };
    s.onclick = () => { d.blessings -= 4; d.staminaUp++; G.player.stamina = G.player.maxStamina(); G.Audio.play('blessing'); G.Hud.centerMsg('がんばりが増えた！', 2); G.Prog.save(); this.openStatue(); };
    row.append(h, s); B.appendChild(row);
  },
  // ---- 古代研究所 ----
  openLab(name) {
    const B = this.openPanel(name + '：古代研究所'), P = G.Prog;
    B.appendChild(G.U.html('p', '', '古代の部品とお金で、古代兵装を作ってもらえます。古代兵装はオメガや古代兵に大ダメージ！'));
    for (const ex of G.Items.lab) {
      const row = G.U.html('div', 'shop-item');
      const g = ex.give; const nm = g.k === 'w' ? G.Items.weapons[g.id].name : G.Items.arrows[g.id].name + ' ×' + g.n;
      row.appendChild(g.k === 'w' ? this.iconCanvas(g.id) : G.U.html('div', 'emo', '🏹'));
      let need = ex.money + 'G'; let ok = P.data.money >= ex.money;
      for (const k in ex.mats) { need += '・' + G.Items.mats[k].name + '×' + ex.mats[k] + '（' + P.matCount(k) + '）'; if (P.matCount(k) < ex.mats[k]) ok = false; }
      const info = G.U.html('div', 'si-name'); info.innerHTML = nm + '<div class="si-desc">' + need + '</div>'; row.appendChild(info);
      const b = G.U.html('button', 'mbtn', '作ってもらう'); b.disabled = !ok;
      b.onclick = () => {
        if (g.k === 'w' && P.data.inv[P.wcat(g.id)].length >= P.data.slots[P.wcat(g.id)]) { G.Hud.notify('武器がいっぱい！'); return; }
        P.spend(ex.money); for (const k in ex.mats) P.removeMat(k, ex.mats[k]);
        P.give(g); if (g.k === 'w') { P.data.flags.ancientGear = true; G.Quests.update(); } G.Prog.save(); this.openLab(name);
      };
      row.appendChild(b); B.appendChild(row);
    }
  },
  // ---- 森の精の長 ----
  korokCost(cat) {
    const d = G.Prog.data; const base = { melee: 8, bow: 4, rod: 3 }[cat], max = { melee: 16, bow: 8, rod: 6 }[cat];
    const n = d.slots[cat] - base; if (d.slots[cat] >= max) return -1;
    return cat === 'melee' ? n + 1 : n + 2;
  },
  openKorok(name) {
    const B = this.openPanel(name), d = G.Prog.data;
    const have = Object.keys(d.seeds).length - d.seedsSpent;
    B.appendChild(G.U.html('p', '', '森の精の実を渡すと、ポーチを広げてやろう。（手持ちの実：' + have + '個）'));
    for (const [cat, label] of [['melee', '近接武器'], ['bow', '弓'], ['rod', 'ロッド']]) {
      const cost = this.korokCost(cat);
      const row = G.U.html('div', 'shop-item');
      const info = G.U.html('div', 'si-name'); info.innerHTML = label + 'ポーチ　' + d.slots[cat] + '枠' + '<div class="si-desc">' + (cost < 0 ? 'これ以上は広げられない' : '実 ' + cost + '個で +1枠') + '</div>'; row.appendChild(info);
      const b = G.U.html('button', 'mbtn', '広げる'); b.disabled = cost < 0 || have < cost;
      b.onclick = () => { d.seedsSpent += cost; d.slots[cat]++; G.Audio.play('itemGet'); G.Hud.centerMsg(label + 'ポーチが広がった！', 2); G.Prog.save(); this.openKorok(name); };
      row.appendChild(b); B.appendChild(row);
    }
  },
  // ---- チャット・スタンプ ----
  openChat() {
    if (G.Net.role === 'single') { G.Hud.notify('チャットはオンラインで遊んでいる時に使えます'); return; }
    this.chatOpen = true; this.chatWrap.classList.remove('hidden'); this.chatInput.value = ''; G.Input.typing = true; G.Input.exitLock();
    setTimeout(() => this.chatInput.focus(), 30);
  },
  closeChat() { if (!this.chatOpen) return; this.chatOpen = false; this.chatWrap.classList.add('hidden'); G.Input.typing = false; this.chatInput.blur(); G.Input.clearAll(); },
  openStamp() { if (G.Net.role === 'single') { G.Hud.notify('スタンプはオンラインで遊んでいる時に使えます'); return; } this.stampOpen = true; this.stampEl.classList.remove('hidden'); G.Input.exitLock(); },
  closeStamp() { this.stampOpen = false; this.stampEl.classList.add('hidden'); },
  // ---- 演出 ----
  fade(on, cb) {
    const f = G.U.el('fade'); f.style.opacity = on ? 1 : 0;
    if (cb) setTimeout(cb, 480);
  },
  showDeath(lost) {
    G.U.el('death-sub').textContent = lost > 0 ? '所持金が半分になった（-' + G.U.fmt(lost) + ' G）' : '';
    G.U.el('death-screen').classList.remove('hidden'); G.Input.exitLock();
  },
  hideDeath() { G.U.el('death-screen').classList.add('hidden'); },
  showEnding(lines, cb) {
    const e = G.U.el('ending'), t = G.U.el('ending-text');
    e.classList.remove('hidden'); t.textContent = lines.join('\n');
    t.style.transition = 'none'; t.style.transform = 'translateY(60vh)';
    setTimeout(() => { t.style.transition = 'transform 22s linear'; t.style.transform = 'translateY(-80vh)'; }, 50);
    const end = () => { e.classList.add('hidden'); e.onclick = null; cb && cb(); };
    e.onclick = () => { if (this._endT) clearTimeout(this._endT); end(); };
    this._endT = setTimeout(end, 23000);
  },
  // ---- 毎フレームの入力処理 ----
  update(dt) {
    const I = G.Input;
    if (this.chatOpen) { if (I.pressed('esc')) this.closeChat(); return; }
    if (this.stampOpen) { if (I.pressed('esc') || I.pressed('stamp')) this.closeStamp(); return; }
    if (this.panelOpen) { if (I.pressed('esc') || I.pressed('menu')) this.closePanel(); return; }
    if (this.menuOpen) { if (I.pressed('esc') || I.pressed('menu')) this.closeMenu(); return; }
    if (G.Map.open) { if (I.pressed('esc') || I.pressed('map')) G.Map.close(); return; }
    if (G.Dialog.active || G.state !== 'playing') return;
    if (I.pressed('menu')) this.openMenu();
    else if (I.pressed('esc')) this.openMenu('system');
    else if (I.pressed('map')) G.Map.show();
    else if (I.pressed('chat')) this.openChat();
    else if (I.pressed('stamp')) this.openStamp();
  },
};
