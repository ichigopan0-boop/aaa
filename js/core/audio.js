// ===== サウンド（WebAudioで効果音・BGMを生成） =====
'use strict';
G.Audio = {
  ctx: null, master: null, sfx: null, bgm: null, amb: null, rev: null, noiseBuf: null,
  track: null, nextTime: 0, step: 0, bar: 0, trackGain: null, fading: [],
  rainG: null, windG: null, ambT: 0, ready: false,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.bgm = c.createGain(); this.bgm.connect(this.master);
    this.amb = c.createGain(); this.amb.connect(this.master);
    // リバーブ
    this.rev = c.createConvolver();
    const len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev.buffer = ir; this.revG = c.createGain(); this.revG.gain.value = 0.35; this.rev.connect(this.revG); this.revG.connect(this.master);
    // ノイズ
    this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // 環境音ループ
    const mkLoop = (type, freq, q) => {
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.amb); s.start();
      return { g, f };
    };
    this.rainG = mkLoop('lowpass', 1400, 0.5);
    this.windG = mkLoop('bandpass', 500, 0.8);
    this.applyVolume();
    this.ready = true;
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  applyVolume() {
    if (!this.ctx) return; const s = G.settings;
    this.master.gain.value = s.volMaster; this.sfx.gain.value = s.volSfx; this.bgm.gain.value = s.volBgm * 0.55; this.amb.gain.value = s.volSfx * 0.6;
  },
  // ---- 基本音 ----
  env(g, t, a, peak, d, sus = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + d); },
  osc(type, freq, t, dur, vol, dest, opts = {}) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + (opts.slideT || dur));
    if (opts.detune) o.detune.value = opts.detune;
    this.env(g, t, opts.a || 0.005, vol, dur);
    o.connect(g);
    if (opts.filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.filter; g.connect(f); f.connect(dest); if (opts.rev) f.connect(this.rev); }
    else { g.connect(dest); if (opts.rev) g.connect(this.rev); }
    o.start(t); o.stop(t + (opts.a || 0.005) + dur + 0.05);
  },
  noise(t, dur, vol, dest, type = 'bandpass', freq = 1000, q = 1, opts = {}) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.playbackRate.value = opts.rate || 1;
    f.type = type; f.frequency.setValueAtTime(freq, t); if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur); f.Q.value = q;
    this.env(g, t, opts.a || 0.004, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest); if (opts.rev) g.connect(this.rev);
    const off = Math.random() * 1.5; s.start(t, off); s.stop(t + dur + 0.1);
  },
  noteHz(n) { return 440 * Math.pow(2, (n - 69) / 12); },
  // ---- 効果音 ----
  play(name, opts = {}) {
    if (!this.ready || !G.settings) return;
    const c = this.ctx, t = c.currentTime + 0.005, d = this.sfx;
    let v = opts.vol != null ? opts.vol : 1;
    if (opts.pos && G.camera) { const dist = opts.pos.distanceTo(G.camera.position); v *= Math.max(0, 1 - dist / (opts.range || 70)); if (v <= 0.01) return; }
    const p = opts.pitch || 1;
    switch (name) {
      case 'swing': this.noise(t, 0.16, 0.35 * v, d, 'bandpass', 900 * p, 1.5, { sweep: 2600 * p }); break;
      case 'swingHeavy': this.noise(t, 0.3, 0.45 * v, d, 'bandpass', 400 * p, 1.2, { sweep: 1400 }); break;
      case 'hit': this.osc('square', 180 * p, t, 0.08, 0.25 * v, d, { slide: 60, filter: 1800 }); this.noise(t, 0.1, 0.5 * v, d, 'lowpass', 2500, 1); break;
      case 'hitMetal': this.osc('triangle', 1400 * p, t, 0.25, 0.18 * v, d, { rev: true }); this.osc('square', 2300 * p, t, 0.08, 0.06 * v, d); this.noise(t, 0.06, 0.4 * v, d, 'highpass', 3000, 1); break;
      case 'crit': this.osc('sawtooth', 300 * p, t, 0.18, 0.2 * v, d, { slide: 80, filter: 2000 }); this.noise(t, 0.15, 0.6 * v, d, 'lowpass', 3000, 1); break;
      case 'hurt': this.osc('sawtooth', 220, t, 0.22, 0.3 * v, d, { slide: 90, filter: 900 }); break;
      case 'jump': this.noise(t, 0.12, 0.15 * v, d, 'bandpass', 600, 1, { sweep: 1500 }); break;
      case 'land': this.noise(t, 0.12, 0.3 * v, d, 'lowpass', 400, 1); break;
      case 'step': this.noise(t, 0.05, 0.08 * v, d, 'bandpass', opts.surface === 'snow' ? 2500 : opts.surface === 'stone' ? 1800 : 900, 2); break;
      case 'splash': this.noise(t, 0.4, 0.4 * v, d, 'bandpass', 1200, 0.7, { sweep: 400 }); break;
      case 'glide': this.noise(t, 0.35, 0.3 * v, d, 'bandpass', 300, 1, { sweep: 1200 }); break;
      case 'bowDraw': this.noise(t, 0.3, 0.12 * v, d, 'bandpass', 2200, 4, { sweep: 3200 }); break;
      case 'arrow': this.osc('triangle', 520 * p, t, 0.12, 0.2 * v, d, { slide: 180 }); this.noise(t, 0.15, 0.2 * v, d, 'highpass', 2500, 1); break;
      case 'arrowHit': this.noise(t, 0.06, 0.3 * v, d, 'bandpass', 1500, 2); this.osc('square', 120, t, 0.05, 0.1 * v, d); break;
      case 'fire': this.noise(t, 0.5, 0.4 * v, d, 'lowpass', 900, 1, { sweep: 200, a: 0.03 }); this.osc('sawtooth', 110, t, 0.3, 0.1 * v, d, { slide: 60, filter: 600 }); break;
      case 'ice': for (let i = 0; i < 4; i++) this.osc('sine', 1800 + i * 600, t + i * 0.03, 0.3, 0.1 * v, d, { rev: true }); break;
      case 'thunder': this.noise(t, 1.6, 0.9 * v, d, 'lowpass', 600, 0.7, { sweep: 80, a: 0.01 }); this.noise(t, 0.12, 0.6 * v, d, 'highpass', 2000, 1); break;
      case 'zap': this.osc('sawtooth', 900, t, 0.25, 0.18 * v, d, { slide: 200, filter: 3000 }); this.noise(t, 0.2, 0.3 * v, d, 'highpass', 4000, 1); break;
      case 'explode': this.noise(t, 0.9, 0.9 * v, d, 'lowpass', 900, 0.8, { sweep: 60 }); this.osc('sine', 90, t, 0.6, 0.6 * v, d, { slide: 30 }); break;
      case 'laserCharge': this.osc('sine', 300, t, 1.0, 0.15 * v, d, { slide: 1600, slideT: 1.0, a: 0.05 }); break;
      case 'laser': this.osc('sawtooth', 1200, t, 0.5, 0.3 * v, d, { slide: 300, filter: 4000, rev: true }); this.noise(t, 0.4, 0.4 * v, d, 'bandpass', 3000, 1); break;
      case 'beep': this.osc('square', 1500 * p, t, 0.05, 0.08 * v, d); break;
      case 'poof': this.noise(t, 0.4, 0.4 * v, d, 'bandpass', 700, 0.8, { sweep: 200 }); this.osc('sine', 500, t, 0.3, 0.15 * v, d, { slide: 120 }); break;
      case 'break': this.noise(t, 0.3, 0.5 * v, d, 'highpass', 1500, 1); for (let i = 0; i < 5; i++) this.osc('triangle', 2000 + Math.random() * 2000, t + i * 0.03, 0.1, 0.08 * v, d); break;
      case 'chest': [72, 76, 79, 84].forEach((n, i) => this.osc('triangle', this.noteHz(n), t + i * 0.1, 0.5, 0.18 * v, d, { rev: true })); break;
      case 'itemGet': [67, 71, 74, 79, 83].forEach((n, i) => this.osc('square', this.noteHz(n), t + i * 0.09, 0.3, 0.08 * v, d, { filter: 3000, rev: true })); this.osc('triangle', this.noteHz(86), t + 0.5, 0.9, 0.14 * v, d, { rev: true }); break;
      case 'levelUp': [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.osc('triangle', this.noteHz(n), t + i * 0.07, 0.6, 0.15 * v, d, { rev: true })); break;
      case 'heal': [76, 79, 84].forEach((n, i) => this.osc('sine', this.noteHz(n), t + i * 0.08, 0.4, 0.15 * v, d, { rev: true })); break;
      case 'eat': this.noise(t, 0.08, 0.2 * v, d, 'bandpass', 800, 2); this.noise(t + 0.15, 0.08, 0.2 * v, d, 'bandpass', 900, 2); break;
      case 'pickup': this.osc('sine', 880, t, 0.08, 0.12 * v, d); this.osc('sine', 1320, t + 0.06, 0.12, 0.12 * v, d); break;
      case 'coin': this.osc('square', 1975, t, 0.05, 0.06 * v, d); this.osc('square', 2637, t + 0.05, 0.2, 0.06 * v, d); break;
      case 'select': this.osc('sine', 1200, t, 0.05, 0.08 * v, d); break;
      case 'cursor': this.osc('sine', 800, t, 0.03, 0.05 * v, d); break;
      case 'error': this.osc('square', 150, t, 0.15, 0.1 * v, d, { filter: 800 }); break;
      case 'alert': this.osc('square', 880, t, 0.07, 0.08 * v, d); this.osc('square', 1320, t + 0.08, 0.1, 0.08 * v, d); break;
      case 'shrine': [64, 69, 71, 76, 81].forEach((n, i) => this.osc('sine', this.noteHz(n), t + i * 0.18, 1.5, 0.1 * v, d, { rev: true, a: 0.05 })); break;
      case 'blessing': [72, 76, 79, 83, 86, 91].forEach((n, i) => this.osc('sine', this.noteHz(n), t + i * 0.15, 1.8, 0.12 * v, d, { rev: true, a: 0.02 })); break;
      case 'secret': [79, 78, 75, 69, 68, 76, 80, 84].forEach((n, i) => this.osc('triangle', this.noteHz(n), t + i * 0.11, 0.25, 0.12 * v, d, { rev: true })); break;
      case 'seed': this.osc('sine', 600, t, 0.1, 0.1 * v, d, { slide: 1400 }); [84, 88, 91].forEach((n, i) => this.osc('triangle', this.noteHz(n), t + 0.12 + i * 0.08, 0.3, 0.12 * v, d, { rev: true })); break;
      case 'whistle': this.osc('sine', 1400, t, 0.25, 0.15 * v, d, { slide: 1900 }); this.osc('sine', 1900, t + 0.3, 0.3, 0.15 * v, d, { slide: 1500 }); break;
      case 'neigh': this.osc('sawtooth', 600, t, 0.5, 0.12 * v, d, { slide: 350, filter: 1500 }); break;
      case 'gallop': this.noise(t, 0.05, 0.25 * v, d, 'lowpass', 500, 1); this.noise(t + 0.09, 0.05, 0.2 * v, d, 'lowpass', 450, 1); break;
      case 'roar': this.osc('sawtooth', 120 * p, t, 0.9, 0.35 * v, d, { slide: 70, filter: 700 }); this.noise(t, 0.9, 0.3 * v, d, 'lowpass', 500, 1); break;
      case 'stomp': this.osc('sine', 70, t, 0.4, 0.6 * v, d, { slide: 30 }); this.noise(t, 0.3, 0.5 * v, d, 'lowpass', 300, 1); break;
      case 'goblin': this.osc('square', 300 * p, t, 0.15, 0.08 * v, d, { slide: 450, filter: 1500 }); break;
      case 'slime': this.osc('sine', 300 * p, t, 0.15, 0.15 * v, d, { slide: 120 }); break;
      case 'chat': this.osc('sine', 1046, t, 0.08, 0.08 * v, d); this.osc('sine', 1318, t + 0.07, 0.1, 0.08 * v, d); break;
      case 'warp': this.osc('sine', 300, t, 0.8, 0.15 * v, d, { slide: 2000, rev: true }); this.noise(t, 0.8, 0.2 * v, d, 'bandpass', 800, 2, { sweep: 4000 }); break;
      case 'cook': [60, 62, 64, 67, 69, 72].forEach((n, i) => this.osc('triangle', this.noteHz(n), t + i * 0.12, 0.2, 0.12 * v, d)); break;
      case 'door': this.osc('sawtooth', 60, t, 0.8, 0.2 * v, d, { filter: 300 }); this.noise(t, 0.8, 0.2 * v, d, 'lowpass', 400, 1); break;
      case 'flurry': this.osc('sine', 2000, t, 0.6, 0.12 * v, d, { slide: 500, rev: true }); break;
      case 'chirp': { const f = 2500 + Math.random() * 1500; for (let i = 0; i < 3; i++) this.osc('sine', f, t + i * 0.09, 0.06, 0.03 * v, d, { slide: f * 1.4 }); break; }
      case 'cricket': for (let i = 0; i < 4; i++) this.osc('sine', 4200, t + i * 0.05, 0.025, 0.015 * v, d); break;
    }
  },
  // ---- 環境音 ----
  updateAmbient(dt, rain, wind, isNight, outdoors) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.rainG.g.gain.setTargetAtTime(rain * 0.35, t, 0.5);
    this.windG.g.gain.setTargetAtTime(wind * 0.25, t, 0.3);
    this.windG.f.frequency.setTargetAtTime(400 + wind * 600, t, 0.5);
    this.ambT -= dt;
    if (this.ambT <= 0 && outdoors) {
      this.ambT = 0.6 + Math.random() * 2.5;
      if (rain < 0.2) { if (isNight) this.play('cricket', { vol: 0.8 }); else if (Math.random() < 0.6) this.play('chirp', { vol: 0.8 }); }
    }
  },
  // ---- BGM ----
  tracks: {},
  setBgm(name) {
    if (!this.ready || this.trackName === name) return;
    this.trackName = name;
    const c = this.ctx, now = c.currentTime;
    if (this.trackGain) { const og = this.trackGain; og.gain.setTargetAtTime(0.0001, now, 0.6); setTimeout(() => og.disconnect(), 3000); }
    this.track = name ? this.tracks[name] : null;
    if (!this.track) { this.trackGain = null; return; }
    this.trackGain = c.createGain(); this.trackGain.gain.setValueAtTime(0.0001, now); this.trackGain.gain.setTargetAtTime(1, now + 0.3, 0.8);
    this.trackGain.connect(this.bgm);
    this.nextTime = now + 0.4; this.step = 0; this.bar = 0;
    this.trng = G.U.rng(name.length * 977 + 13);
  },
  updateBgm() {
    if (!this.ready || !this.track) return;
    const c = this.ctx, tr = this.track, spb = 60 / tr.bpm / 4; // 16分音符
    while (this.nextTime < c.currentTime + 0.25) {
      tr.step.call(this, this.nextTime, this.step % 16, this.bar, this.trackGain, this.trng, spb);
      this.nextTime += spb; this.step++; if (this.step % 16 === 0) this.bar++;
    }
  },
  // 楽器
  piano(n, t, dur, vol, dest) { const f = this.noteHz(n); this.osc('triangle', f, t, dur, vol, dest, { rev: true }); this.osc('sine', f * 2, t, dur * 0.5, vol * 0.3, dest); },
  pad(notes, t, dur, vol, dest) { for (const n of notes) { const f = this.noteHz(n); this.osc('sawtooth', f, t, dur, vol, dest, { a: dur * 0.3, filter: 900, detune: 7, rev: true }); this.osc('sawtooth', f, t, dur, vol, dest, { a: dur * 0.3, filter: 900, detune: -7 }); } },
  bell(n, t, vol, dest) { const f = this.noteHz(n); this.osc('sine', f, t, 1.6, vol, dest, { rev: true }); this.osc('sine', f * 3.5, t, 0.4, vol * 0.25, dest); },
  bass(n, t, dur, vol, dest) { this.osc('triangle', this.noteHz(n), t, dur, vol, dest); this.osc('square', this.noteHz(n), t, dur * 0.6, vol * 0.25, dest, { filter: 400 }); },
  pluck(n, t, vol, dest) { this.osc('square', this.noteHz(n), t, 0.25, vol, dest, { filter: 2200, rev: true }); },
  brass(n, t, dur, vol, dest) { this.osc('sawtooth', this.noteHz(n), t, dur, vol, dest, { a: 0.03, filter: 1600 }); this.osc('sawtooth', this.noteHz(n) * 1.003, t, dur, vol * 0.7, dest, { a: 0.03, filter: 1200 }); },
  kick(t, vol, dest) { this.osc('sine', 150, t, 0.25, vol, dest, { slide: 40, slideT: 0.12 }); },
  snare(t, vol, dest) { this.noise(t, 0.12, vol, dest, 'bandpass', 1800, 0.8); this.osc('triangle', 200, t, 0.08, vol * 0.5, dest); },
  hat(t, vol, dest) { this.noise(t, 0.03, vol, dest, 'highpass', 7000, 1); },
};

// ---- 曲データ（すべてオリジナルの自動生成フレーズ） ----
(function () {
  const A = G.Audio.tracks;
  const penta = [0, 2, 4, 7, 9];
  A.field = {
    bpm: 78,
    step(t, s, bar, d, r, spb) {
      const chords = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]];
      const ch = chords[bar % 4];
      if (s === 0) { this.pad(ch.slice(1), t, spb * 16, 0.018, d); this.piano(ch[0], t, 2.5, 0.09, d); }
      if (s === 8) this.piano(ch[0] + 7, t, 1.5, 0.05, d);
      if (s % 2 === 0 && r() < 0.32) { const n = 72 + penta[Math.floor(r() * 5)] + (r() < 0.25 ? 12 : 0); this.piano(n, t, 1.4, 0.07, d); }
    },
  };
  A.night = {
    bpm: 62,
    step(t, s, bar, d, r, spb) {
      const chords = [[45, 52, 60, 64], [41, 48, 57, 60], [43, 50, 55, 59], [40, 47, 55, 59]];
      const ch = chords[bar % 4];
      if (s === 0) { this.pad(ch.slice(1), t, spb * 16, 0.016, d); this.piano(ch[0], t, 3, 0.07, d); }
      if (s % 4 === 0 && r() < 0.3) { const sc = [0, 3, 5, 7, 10]; this.piano(69 + sc[Math.floor(r() * 5)], t, 2, 0.05, d); }
      if (s === 12 && r() < 0.3) this.bell(88 + penta[Math.floor(r() * 5)], t, 0.03, d);
    },
  };
  A.village = {
    bpm: 100,
    mel: [72, -1, 74, 76, 79, -1, 76, -1, 74, -1, 72, 74, 76, -1, -1, -1, 77, -1, 76, 74, 72, -1, 69, -1, 71, -1, 72, 74, 72, -1, -1, -1],
    step(t, s, bar, d, r, spb) {
      const chords = [[48, 60, 64, 67], [53, 57, 60, 65], [43, 59, 62, 67], [48, 55, 60, 64]];
      const ch = chords[bar % 4];
      if (s % 4 === 0) this.bass(ch[0] - 12 + (s === 8 ? 7 : 0), t, spb * 3, 0.12, d);
      if (s % 4 === 2) for (const n of ch.slice(1)) this.pluck(n, t, 0.025, d);
      const m = this.track.mel[(bar % 2) * 16 + s]; if (m > 0) this.pluck(m + 12, t, 0.05, d);
    },
  };
  A.battle = {
    bpm: 148,
    step(t, s, bar, d, r, spb) {
      const roots = [38, 38, 41, 36]; const rt = roots[bar % 4];
      this.bass(rt + ([0, 0, 12, 0, 0, 12, 0, 10][s % 8]), t, spb * 0.9, 0.11, d);
      if (s % 4 === 0) this.kick(t, 0.35, d);
      if (s % 8 === 4) this.snare(t, 0.22, d);
      if (s % 2 === 1) this.hat(t, 0.05, d);
      if (s === 0 || s === 6 || s === 12) this.brass(rt + 24 + (s === 6 ? 3 : s === 12 ? 7 : 0), t, spb * 2, 0.035, d);
    },
  };
  A.shrine = {
    bpm: 70,
    step(t, s, bar, d, r, spb) {
      const sc = [0, 2, 4, 6, 7, 9, 11];
      if (s === 0) this.pad([52, 59, 66], t, spb * 16, 0.02, d);
      if (s % 2 === 0 && r() < 0.45) this.bell(76 + sc[Math.floor(r() * 7)], t, 0.035, d);
    },
  };
  A.boss = {
    bpm: 164,
    step(t, s, bar, d, r, spb) {
      const roots = [40, 40, 41, 43]; const rt = roots[bar % 4];
      this.bass(rt + [0, 0, 1, 0, 0, 7, 0, 1][s % 8], t, spb * 0.8, 0.13, d);
      if (s % 4 === 0 || s === 14) this.kick(t, 0.4, d);
      if (s % 8 === 4) this.snare(t, 0.28, d);
      this.hat(t, s % 2 ? 0.03 : 0.06, d);
      if (s === 0) this.brass(rt + 24, t, spb * 6, 0.05, d);
      if (s === 8) this.brass(rt + 25, t, spb * 4, 0.045, d);
      if (s === 12) this.brass(rt + 31, t, spb * 4, 0.045, d);
      if (s % 2 === 0) this.osc('sawtooth', this.noteHz(rt + 36 + (s % 4 ? 3 : 0)), t, spb, 0.012, d, { filter: 2500 });
    },
  };
  A.title = {
    bpm: 84,
    mel: [76, -1, -1, 79, 81, -1, 79, -1, 76, -1, 74, -1, 72, -1, -1, -1, 74, -1, 76, -1, 79, -1, 84, -1, 83, -1, 79, -1, 81, -1, -1, -1],
    step(t, s, bar, d, r, spb) {
      const chords = [[45, 57, 60, 64], [41, 53, 57, 60], [48, 55, 60, 64], [43, 55, 59, 62]];
      const ch = chords[bar % 4];
      if (s === 0) { this.pad(ch.slice(1), t, spb * 16, 0.02, d); this.bass(ch[0], t, spb * 8, 0.1, d); }
      if (s === 8) this.bass(ch[0] + 7, t, spb * 8, 0.08, d);
      const m = this.track.mel[(bar % 2) * 16 + s]; if (m > 0) this.piano(m, t, 1.6, 0.09, d);
      if (s % 4 === 2) this.piano(ch[1 + (s / 4 | 0) % 3] + 12, t, 0.8, 0.03, d);
    },
  };
  A.ending = A.title;
})();
