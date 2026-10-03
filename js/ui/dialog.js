// ===== 会話ウィンドウ =====
'use strict';
G.Dialog = {
  active: false, queue: [], idx: 0, onEnd: null, typing: false, full: '', shown: 0, sel: 0, choices: null,
  init() {
    this.box = G.U.el('dialog'); this.nameEl = G.U.el('dlg-name'); this.textEl = G.U.el('dlg-text'); this.chEl = G.U.el('dlg-choices'); this.nextEl = G.U.el('dlg-next');
    this.box.addEventListener('click', (e) => { if (e.target.classList.contains('dchoice')) return; this.advance(); });
  },
  show(name, lines, onEnd) {
    this.active = true; this.queue = lines.slice(); this.idx = 0; this.onEnd = onEnd || null;
    this.nameEl.textContent = name; this.nameEl.style.display = name ? 'block' : 'none';
    this.box.classList.remove('hidden');
    G.Input.exitLock();
    this.skip = true;
    this.showLine();
  },
  showLine() {
    const l = this.queue[this.idx];
    const text = typeof l === 'string' ? l : l.text;
    this.full = text; this.shown = 0; this.typing = true;
    this.choices = typeof l === 'object' && l.choices ? l.choices : null;
    this.chEl.innerHTML = ''; this.nextEl.style.display = 'none'; this.sel = 0;
    this.textEl.textContent = '';
  },
  finishTyping() {
    this.typing = false; this.textEl.textContent = this.full;
    if (this.choices) {
      this.choices.forEach((c, i) => {
        const b = G.U.html('button', 'dchoice' + (i === 0 ? ' sel' : ''), c.label);
        b.onclick = (e) => { e.stopPropagation(); this.choose(i); };
        this.chEl.appendChild(b);
      });
    } else this.nextEl.style.display = 'block';
  },
  choose(i) {
    const c = this.choices[i]; G.Audio.play('select');
    this.close(true);
    if (c && c.fn) c.fn();
  },
  advance() {
    if (!this.active) return;
    if (this.typing) { this.finishTyping(); return; }
    if (this.choices) return;
    G.Audio.play('cursor');
    this.idx++;
    if (this.idx >= this.queue.length) this.close();
    else this.showLine();
  },
  close(skipCb) {
    this.active = false; this.box.classList.add('hidden');
    const cb = this.onEnd; this.onEnd = null;
    G.Input.clearAll();
    if (!skipCb && cb) cb();
  },
  update(dt) {
    if (!this.active) return;
    if (this.typing) {
      this.shown += dt * 45;
      const n = Math.min(this.full.length, Math.floor(this.shown));
      this.textEl.textContent = this.full.slice(0, n);
      if (n >= this.full.length) this.finishTyping();
    }
    const I = G.Input;
    if (this.skip) { this.skip = false; return; }
    if (this.choices && !this.typing) {
      if (I.pressed('up') || I.pressed('down')) {
        this.sel = (this.sel + (I.pressed('up') ? -1 : 1) + this.choices.length) % this.choices.length;
        [...this.chEl.children].forEach((b, i) => b.classList.toggle('sel', i === this.sel)); G.Audio.play('cursor');
      }
      if (I.pressed('interact') || I.pressed('jump') || I.pressed('chat')) this.choose(this.sel);
      if (I.pressed('esc')) this.choose(this.choices.length - 1);
      return;
    }
    if (I.pressed('interact') || I.pressed('jump') || I.pressed('attack') || I.pressed('chat')) this.advance();
  },
};
