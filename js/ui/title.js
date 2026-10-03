// ===== タイトル画面 =====
'use strict';
G.Title = {
  colors: [0x3a8a4a, 0x2f6fd0, 0xd04a3a, 0x8a4ad0, 0xe0a030, 0x2aa8a0, 0xe06aa0, 0x555560],
  color: 0x3a8a4a, next: null, t: 0,
  init() {
    const $ = G.U.el;
    $('btn-continue').disabled = !G.Prog.hasSave();
    $('btn-continue').onclick = () => this.go('continue');
    $('btn-new').onclick = () => {
      if (G.Prog.hasSave() && !confirm('セーブデータを消して、はじめから遊びますか？')) return;
      this.profile('new');
    };
    $('btn-host').onclick = () => this.profile('host');
    $('btn-join').onclick = () => { G.Audio.init(); G.Audio.resume(); this.panel('title-join'); setTimeout(() => $('join-code').focus(), 50); };
    $('btn-join-back').onclick = () => this.panel('title-main');
    $('btn-join-go').onclick = () => { const c = $('join-code').value.trim().toUpperCase(); if (c.length !== 6) { $('join-status').textContent = '6文字のコードを入力してください'; return; } this.code = c; this.profile('join'); };
    $('join-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    $('btn-profile-back').onclick = () => this.panel('title-main');
    $('btn-profile-ok').onclick = () => { const n = $('profile-name').value.trim() || 'リンク'; this.name = n.slice(0, 10); this.go(this.next); };
    $('btn-settings').onclick = () => { G.Audio.init(); this.showSettings(); };
    $('btn-howto').onclick = () => this.showHowto();
    const cp = $('color-pick');
    this.colors.forEach((c) => { const d = document.createElement('div'); d.style.background = '#' + c.toString(16).padStart(6, '0'); d.onclick = () => { this.color = c; [...cp.children].forEach(x => x.classList.remove('sel')); d.classList.add('sel'); }; cp.appendChild(d); });
    cp.children[0].classList.add('sel');
    // URLに ?join=CODE があれば参加画面へ
    const q = new URLSearchParams(location.search).get('join'); if (q) { $('join-code').value = q.toUpperCase(); }
  },
  panel(id) { for (const p of ['title-main', 'title-join', 'title-profile']) G.U.el(p).classList.toggle('hidden', p !== id); },
  profile(next) {
    G.Audio.init(); G.Audio.resume(); G.Audio.setBgm('title');
    this.next = next;
    const has = G.Prog.hasSave() && next !== 'new';
    if (has) { try { const s = JSON.parse(localStorage.getItem(G.SAVE_KEY)); G.U.el('profile-name').value = s.name || ''; this.color = s.color != null ? s.color : this.color; } catch (e) { } }
    const cp = G.U.el('color-pick'); [...cp.children].forEach((x, i) => x.classList.toggle('sel', this.colors[i] === this.color));
    this.panel('title-profile');
    setTimeout(() => G.U.el('profile-name').focus(), 50);
  },
  show() {
    G.state = 'title';
    G.U.el('title').classList.remove('hidden');
    this.panel('title-main');
    const startAudio = () => { G.Audio.init(); G.Audio.resume(); G.Audio.setBgm('title'); window.removeEventListener('pointerdown', startAudio); };
    window.addEventListener('pointerdown', startAudio);
  },
  hide() { G.U.el('title').classList.add('hidden'); },
  // タイトル背景のカメラ
  update(dt) {
    this.t += dt * 0.04;
    const r = 180, cx = 0, cz = 300;
    G.camera.position.set(cx + Math.cos(this.t) * r, 95, cz + Math.sin(this.t) * r);
    G.camera.lookAt(0, 30, 120);
  },
  async go(mode) {
    G.Audio.init(); G.Audio.resume();
    const st = G.U.el('join-status');
    if (mode === 'join') {
      this.panel('title-join'); st.textContent = 'ホストに接続中…';
      G.U.el('btn-join-go').disabled = true;
      if (!G.Game.built) G.Game.loadData(G.Prog.hasSave() ? 'continue' : 'new', this.name, this.color);
      try {
        const welcome = await G.Net.join(this.code);
        st.textContent = 'ワールドを準備中…'; await G.U.nextFrame();
        G.Game.buildEntities();
        G.Game.begin();
        G.Net.applyWelcome(welcome);
        G.Hud.notify('ルーム ' + this.code + ' に参加しました！');
      } catch (e) {
        st.textContent = '参加できませんでした：' + e.message;
      }
      G.U.el('btn-join-go').disabled = false;
      return;
    }
    G.Game.prepare(mode === 'host' ? (G.Prog.hasSave() ? 'continue' : 'new') : mode, this.name, this.color);
    G.Game.begin();
    if (mode === 'host') {
      G.Hud.notify('ルームを準備中…');
      try { const code = await G.Net.host(); G.Hud.updateRoom(); G.Dialog.show('オンライン', ['ルームを開きました！', 'ルームコード：【 ' + code + ' 】', 'このコードを友達に伝えると、最大3人まで参加できます。', 'メニューの「システム」で対戦モード（PvP）の切り替えもできます。']); }
      catch (e) { G.Dialog.show('オンライン', ['ルームを開けませんでした。', '（' + e.message + '）', 'インターネット接続を確認してください。ひとりで冒険を続けます。']); }
    }
  },
  showSettings() {
    const B = G.UI.openPanel('設定'), S = G.settings;
    const add = (label, el) => { const r = G.U.html('div', 'opt-row'); r.appendChild(G.U.html('span', '', label)); r.appendChild(el); B.appendChild(r); };
    const q = document.createElement('select'); ['低（軽い・スマホ向け）', '中', '高（きれい）'].forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; if (S.quality === i) o.selected = true; q.appendChild(o); });
    q.onchange = () => { S.quality = +q.value; S.viewDist = [380, 620, 850][S.quality]; G.saveSettings(); };
    add('画質（変更後はページを再読み込み）', q);
    const v = document.createElement('input'); v.type = 'range'; v.min = 0; v.max = 1; v.step = 0.05; v.value = S.volMaster; v.oninput = () => { S.volMaster = +v.value; G.saveSettings(); G.Audio.applyVolume(); };
    add('音量', v);
    const rl = G.U.html('button', 'mbtn', '再読み込みして反映'); rl.onclick = () => location.reload(); B.appendChild(rl);
  },
  showHowto() {
    const B = G.UI.openPanel('操作方法');
    B.innerHTML = `<div class="sec-title">PC（キーボード＋マウス）</div>
<div class="stat-row"><span>移動</span><b>WASD / 矢印キー</b></div><div class="stat-row"><span>視点</span><b>マウス（クリックで画面にロック）</b></div>
<div class="stat-row"><span>攻撃（長押しで回転斬り）</span><b>左クリック</b></div><div class="stat-row"><span>弓を構える → 撃つ</span><b>右クリック長押し → 左クリック</b></div>
<div class="stat-row"><span>ジャンプ / 空中でパラセール</span><b>スペース</b></div><div class="stat-row"><span>ダッシュ / 泳ぎダッシュ / 馬のムチ</span><b>Shift</b></div>
<div class="stat-row"><span>回避（ロックオン中はスペースで横跳び）</span><b>C</b></div><div class="stat-row"><span>ロックオン</span><b>Q</b></div>
<div class="stat-row"><span>魔法（ロッド）</span><b>E</b></div><div class="stat-row"><span>調べる・話す・拾う・乗る</span><b>F</b></div>
<div class="stat-row"><span>しゃがむ（忍び足）</span><b>Z</b></div><div class="stat-row"><span>回復（料理を自動で食べる）</span><b>R</b></div>
<div class="stat-row"><span>武器 / 弓 / ロッド切り替え</span><b>1 / 2 / 3</b></div><div class="stat-row"><span>矢の種類</span><b>X</b></div>
<div class="stat-row"><span>馬笛</span><b>H</b></div><div class="stat-row"><span>メニュー / マップ</span><b>Tab(I) / M</b></div>
<div class="stat-row"><span>チャット / スタンプ（オンライン）</span><b>Enter / V</b></div><div class="stat-row"><span>カメラの距離</span><b>マウスホイール</b></div>
<div class="sec-title">スマホ</div><p>左側をドラッグで移動、右側をドラッグで視点。右下のボタンで攻撃・ジャンプなど。「弓」で構え（もう一度で解除）、構え中は「攻撃」で発射。</p>
<div class="sec-title">ゲームの目的</div><p>古城跡で暴走する「古代機兵オメガ」を倒すこと。いきなり挑むこともできますが非常に強いので、祠・観測塔・各地の主・封印の剣・古代兵装などで強くなってから挑みましょう。</p>`;
  },
};
