// ===== 入力（キーボード・マウス・タッチ共通の抽象化） =====
'use strict';
G.Input = {
  held: new Set(), pressedSet: new Set(), releasedSet: new Set(),
  lookDX: 0, lookDY: 0, wheel: 0,
  joy: { x: 0, y: 0, active: false },
  locked: false, mouseX: 0, mouseY: 0,
  typing: false,
  keyMap: {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    Space: 'jump', ShiftLeft: 'dash', ShiftRight: 'dash', KeyC: 'dodge', KeyE: 'magic', KeyF: 'interact', KeyQ: 'lock',
    KeyZ: 'sneak', KeyR: 'heal', Tab: 'menu', KeyI: 'menu', KeyM: 'map', KeyH: 'whistle', KeyX: 'arrowType',
    Digit1: 'cycle1', Digit2: 'cycle2', Digit3: 'cycle3', Enter: 'chat', KeyV: 'stamp', Escape: 'esc', KeyP: 'esc',
  },
  init() {
    const canvas = G.renderer.domElement;
    window.addEventListener('keydown', (e) => {
      if (this.typing) { if (e.code === 'Escape') this._press('esc'); if (e.code === 'Enter') this._press('chatSend'); return; }
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      const a = this.keyMap[e.code];
      if (a) { if (!e.repeat) this._press(a); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => { const a = this.keyMap[e.code]; if (a) this._release(a); });
    window.addEventListener('blur', () => { for (const a of [...this.held]) this._release(a); });
    canvas.addEventListener('mousedown', (e) => {
      if (G.isTouchActive) return;
      if (G.state === 'playing' && !this.locked && G.settings.pointerLock) { this.requestLock(); }
      if (e.button === 0) this._press('attack');
      if (e.button === 2) this._press('aim');
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this._release('attack'); if (e.button === 2) this._release('aim'); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX; this.mouseY = e.clientY;
      if (this.locked) { this.lookDX += e.movementX; this.lookDY += e.movementY; }
      else if (G.state === 'playing' && !G.settings.pointerLock && (e.buttons & 1 || e.buttons & 2)) { this.lookDX += e.movementX; this.lookDY += e.movementY; }
    });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
  },
  requestLock() { const c = G.renderer.domElement; if (c.requestPointerLock && !G.isTouchActive) { try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { } } },
  exitLock() { if (document.pointerLockElement) document.exitPointerLock(); },
  _press(a) { if (!this.held.has(a)) { this.held.add(a); this.pressedSet.add(a); } },
  _release(a) { if (this.held.has(a)) { this.held.delete(a); this.releasedSet.add(a); } },
  setVirtual(a, on) { on ? this._press(a) : this._release(a); },
  tap(a) { this._press(a); setTimeout(() => this._release(a), 60); },
  addLook(dx, dy) { this.lookDX += dx; this.lookDY += dy; },
  down(a) { return this.held.has(a); },
  pressed(a) { return this.pressedSet.has(a); },
  released(a) { return this.releasedSet.has(a); },
  consume(a) { const p = this.pressedSet.has(a); this.pressedSet.delete(a); return p; },
  moveVec() {
    let x = 0, y = 0;
    if (this.held.has('left')) x -= 1; if (this.held.has('right')) x += 1;
    if (this.held.has('up')) y += 1; if (this.held.has('down')) y -= 1;
    if (this.joy.active) { x += this.joy.x; y += this.joy.y; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y, len: Math.min(1, l) };
  },
  endFrame() { this.pressedSet.clear(); this.releasedSet.clear(); this.lookDX = 0; this.lookDY = 0; this.wheel = 0; },
  clearAll() { this.held.clear(); this.pressedSet.clear(); this.releasedSet.clear(); this.joy.x = this.joy.y = 0; this.joy.active = false; },
};
