// ===== スマホ用タッチ操作 =====
'use strict';
G.Touch = {
  aimToggle: false, aimJustOn: false, joyId: null, lookId: null,
  init() {
    const ui = G.U.el('touch-ui');
    const activate = () => {
      if (G.isTouchActive) return;
      G.isTouchActive = true; document.body.classList.add('touch');
      if (G.state === 'playing') ui.classList.remove('hidden');
    };
    window.addEventListener('touchstart', activate, { passive: true });
    if (G.isTouch) activate();
    // ジョイスティック
    const zone = G.U.el('joy-zone'), base = G.U.el('joy-base'), knob = G.U.el('joy-knob');
    let ox = 0, oy = 0;
    zone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; this.joyId = t.identifier;
      const r = zone.getBoundingClientRect(); ox = t.clientX; oy = t.clientY;
      base.style.left = (t.clientX - r.left - 65) + 'px'; base.style.top = (t.clientY - r.top - 65) + 'px'; base.style.bottom = 'auto';
      G.Input.joy.active = true; e.preventDefault();
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.joyId) {
        let dx = t.clientX - ox, dy = t.clientY - oy; const l = Math.hypot(dx, dy), m = 52;
        if (l > m) { dx = dx / l * m; dy = dy / l * m; }
        knob.style.left = (37 + dx) + 'px'; knob.style.top = (37 + dy) + 'px';
        G.Input.joy.x = dx / m; G.Input.joy.y = -dy / m;
      }
      e.preventDefault();
    }, { passive: false });
    const endJoy = (e) => { for (const t of e.changedTouches) if (t.identifier === this.joyId) { this.joyId = null; G.Input.joy.x = G.Input.joy.y = 0; G.Input.joy.active = false; knob.style.left = '37px'; knob.style.top = '37px'; } };
    zone.addEventListener('touchend', endJoy); zone.addEventListener('touchcancel', endJoy);
    // 視点
    const look = G.U.el('look-zone'); let lx = 0, ly = 0;
    look.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; this.lookId = t.identifier; lx = t.clientX; ly = t.clientY; e.preventDefault(); }, { passive: false });
    look.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === this.lookId) { G.Input.addLook((t.clientX - lx) * 1.6, (t.clientY - ly) * 1.6); lx = t.clientX; ly = t.clientY; } e.preventDefault(); }, { passive: false });
    const endLook = (e) => { for (const t of e.changedTouches) if (t.identifier === this.lookId) this.lookId = null; };
    look.addEventListener('touchend', endLook); look.addEventListener('touchcancel', endLook);
    // ボタン
    const holdKeys = ['attack', 'jump', 'dash', 'interact'];
    ui.querySelectorAll('.tb').forEach((b) => {
      const k = b.dataset.k;
      b.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation(); b.classList.add('on');
        G.Audio.resume();
        if (k === 'bow') { this.aimToggle = !this.aimToggle; if (this.aimToggle) this.aimJustOn = true; b.classList.toggle('on', this.aimToggle); return; }
        if (k === 'menu') { G.UI.menuOpen ? G.UI.closeMenu() : G.UI.openMenu(); return; }
        if (k === 'map') { G.Map.open ? G.Map.close() : G.Map.show(); return; }
        if (k === 'chat') { G.UI.openChat(); return; }
        if (k === 'stamp') { G.UI.stampOpen ? G.UI.closeStamp() : G.UI.openStamp(); return; }
        if (holdKeys.includes(k)) G.Input.setVirtual(k, true); else G.Input.tap(k);
      }, { passive: false });
      const up = (e) => { e.preventDefault(); if (k !== 'bow') b.classList.remove('on'); if (holdKeys.includes(k)) G.Input.setVirtual(k, false); };
      b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false });
    });
  },
  show(on) { G.U.el('touch-ui').classList.toggle('hidden', !(on && G.isTouchActive)); },
  update() {
    const busy = G.UI.menuOpen || G.UI.panelOpen || G.Map.open || G.Dialog.active || G.state !== 'playing';
    if (busy !== this._busy) { this._busy = busy; G.U.el('touch-ui').style.visibility = busy ? 'hidden' : 'visible'; }
    const ib = G.U.el('tb-interact');
    const showI = !G.U.el('prompt').classList.contains('hidden');
    ib.style.opacity = showI ? 1 : 0.45;
    const bowBtn = document.querySelector('.tb[data-k=bow]'); if (bowBtn) bowBtn.classList.toggle('on', this.aimToggle);
    if (this.aimToggle && G.player && (G.player.state === 'climb' || G.player.state === 'swim')) this.aimToggle = false;
  },
};
