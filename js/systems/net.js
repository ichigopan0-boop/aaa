// ===== オンライン（PeerJS / WebRTC・ルームコード方式・最大4人） =====
'use strict';
G.Net = {
  role: 'single', myId: 0, peer: null, conns: new Map(), hostConn: null, code: null, pvp: false, kills: {},
  PREFIX: 'astra-rpg-v1-', sendT: 0, esT: 0, twT: 0, names: {},
  isMulti() { return this.role !== 'single'; },
  opts() {
    const q = new URLSearchParams(location.search); const o = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
    const ps = q.get('peer');
    if (ps) { const [h, p] = ps.split(':'); o.host = h; o.port = +(p || 9000); o.path = q.get('peerpath') || '/'; o.secure = q.get('secure') === '1'; }
    return o;
  },
  genCode() { const C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += C[Math.floor(Math.random() * C.length)]; return s; },
  available() { return typeof window.Peer === 'function'; },
  // ---- ホスト ----
  host() {
    return new Promise((res, rej) => {
      if (!this.available()) { rej(new Error('PeerJSが読み込めません')); return; }
      const code = this.genCode();
      let done = false;
      const peer = new Peer(this.PREFIX + code, this.opts());
      peer.on('open', () => { done = true; this.peer = peer; this.code = code; this.role = 'host'; this.myId = 0; this.names[0] = G.Prog.data.name; res(code); });
      peer.on('error', (e) => {
        console.warn('peer error', e.type, e);
        if (!done) { done = true; peer.destroy(); if (e.type === 'unavailable-id') this.host().then(res, rej); else rej(e); }
      });
      peer.on('connection', (c) => this.onConn(c));
      peer.on('disconnected', () => { if (this.role === 'host') { try { peer.reconnect(); } catch (e) { } } });
      setTimeout(() => { if (!done) { done = true; try { peer.destroy(); } catch (e) { } rej(new Error('接続サーバーに届きませんでした')); } }, 15000);
    });
  },
  onConn(conn) {
    conn.on('open', () => {
      if (this.conns.size >= 3) { conn.send({ t: 'reject', reason: 'ルームが満員です（最大4人）' }); setTimeout(() => conn.close(), 500); return; }
    });
    conn.on('data', (m) => { try { this.onHostMsg(conn, m); } catch (e) { console.error('net host msg', e); } });
    conn.on('close', () => this.dropConn(conn));
    conn.on('error', () => this.dropConn(conn));
  },
  dropConn(conn) {
    if (conn.pid == null || !this.conns.has(conn.pid)) return;
    const id = conn.pid; this.conns.delete(id);
    G.Hud.chatLine('system', (this.names[id] || 'プレイヤー') + ' が退出しました');
    G.Remote.remove(id); this.broadcast({ t: 'pleave', id });
    G.Hud.updateRoom();
  },
  freeId() { for (let i = 1; i <= 3; i++) if (!this.conns.has(i)) return i; return -1; },
  onHostMsg(conn, m) {
    if (!m || !m.t) return;
    if (m.t === 'hello') {
      if (m.ver !== G.VERSION) { conn.send({ t: 'reject', reason: 'ゲームのバージョンが違います' }); return; }
      const id = this.freeId(); if (id < 0) { conn.send({ t: 'reject', reason: 'ルームが満員です（最大4人）' }); return; }
      conn.pid = id; this.conns.set(id, conn); this.names[id] = m.name;
      const players = [{ id: 0, name: G.Prog.data.name, color: G.Prog.data.color }];
      for (const [pid] of this.conns) if (pid !== id) { const r = G.Remote.get(pid); if (r) players.push({ id: pid, name: r.name, color: r.color }); }
      const hp = G.player.pos;
      conn.send({ t: 'welcome', id, players, time: G.Sky.time, weather: G.Weather.target, pvp: this.pvp, host: [hp.x, hp.y, hp.z], interior: G.Shrine.insideId, es: G.Enemies.snapshot(null), pins: G.Map.pinsArray() });
      G.Remote.add(id, m.name, m.color);
      this.broadcast({ t: 'pjoin', id, name: m.name, color: m.color }, id);
      G.Hud.chatLine('system', m.name + ' が参加しました！'); G.Audio.play('chat');
      G.Hud.updateRoom();
      return;
    }
    const pid = conn.pid; if (pid == null) return;
    switch (m.t) {
      case 'ps': G.Remote.applyState(pid, m.s); m.id = pid; this.broadcast(m, pid); break;
      case 'ehit': { const e = G.Enemies.byId.get(m.id); if (e && e.alive) e.takeDamage(m.d, { elem: m.el, crit: m.cr, weak: m.w, kx: m.kx, kz: m.kz, kb: m.kb, src: m.src, from: pid, shatter: m.sh }); break; }
      case 'proj': this.broadcast(m, pid); this.spawnProj(m, 'r'); break;
      case 'chat': case 'stamp': case 'pin': m.id = pid; this.broadcast(m, pid); this.onSocial(m); break;
      case 'pvphit': if (m.to === 0) this.onPvpHit(m, pid); else { const c = this.conns.get(m.to); if (c) { m.from = pid; c.send(m); } } break;
      case 'pvpkill': this.onKill(pid, m.by); this.broadcast({ t: 'kill', victim: pid, by: m.by }); break;
      case 'revive': if (m.to === 0) G.player.revive(); else { const c = this.conns.get(m.to); if (c) c.send(m); } break;
    }
  },
  // ---- ゲスト ----
  join(code) {
    return new Promise((res, rej) => {
      if (!this.available()) { rej(new Error('PeerJSが読み込めません')); return; }
      let done = false;
      const peer = new Peer(this.opts());
      const fail = (msg) => { if (done) return; done = true; try { peer.destroy(); } catch (e) { } rej(new Error(msg)); };
      peer.on('error', (e) => { console.warn('peer error', e.type); fail(e.type === 'peer-unavailable' ? 'ルームが見つかりません（コードを確認してください）' : '接続エラー: ' + e.type); });
      peer.on('open', () => {
        const conn = peer.connect(this.PREFIX + code.toUpperCase(), { reliable: true, serialization: 'json' });
        conn.on('open', () => { conn.send({ t: 'hello', name: G.Prog.data.name, color: G.Prog.data.color, lv: G.Prog.data.level, ver: G.VERSION }); });
        conn.on('data', (m) => {
          if (m.t === 'welcome' && !done) { done = true; this.peer = peer; this.hostConn = conn; this.role = 'guest'; this.myId = m.id; this.code = code.toUpperCase(); res(m); return; }
          if (m.t === 'reject') { fail(m.reason); return; }
          try { this.onGuestMsg(m); } catch (e) { console.error('net guest msg', e); }
        });
        conn.on('close', () => { if (done) this.onHostLost(); else fail('接続が切れました'); });
      });
      setTimeout(() => fail('タイムアウトしました。コードとネット接続を確認してください'), 15000);
    });
  },
  applyWelcome(m) {
    G.Sky.time = m.time; G.Weather.target = m.weather; this.pvp = !!m.pvp;
    this.names[0] = m.players[0].name;
    for (const p of m.players) { if (p.id !== this.myId) G.Remote.add(p.id, p.name, p.color); this.names[p.id] = p.name; }
    G.Enemies.applySnapshot(m.es, 0.1);
    // ゲストの世界ではホストのボス状況に合わせる
    for (const e of G.Enemies.list) if (e.boss && !m.es.some(s => s[0] === e.id && s[6])) { e.alive = false; e.state = 'dead'; e.deadT = 99; }
    if (m.pins) G.Map.loadPins(m.pins);
    const h = m.host;
    if (!m.interior) G.player.teleport(h[0] + 2, null, h[2] + 2);
    G.Hud.updateRoom();
  },
  onGuestMsg(m) {
    switch (m.t) {
      case 'pjoin': G.Remote.add(m.id, m.name, m.color); this.names[m.id] = m.name; G.Hud.chatLine('system', m.name + ' が参加しました！'); G.Audio.play('chat'); G.Hud.updateRoom(); break;
      case 'pleave': G.Hud.chatLine('system', (this.names[m.id] || 'プレイヤー') + ' が退出しました'); G.Remote.remove(m.id); G.Hud.updateRoom(); break;
      case 'ps': G.Remote.applyState(m.id, m.s); break;
      case 'es': G.Enemies.applySnapshot(m.e, m.dt || 0.1); break;
      case 'edead': { const e = G.Enemies.byId.get(m.id); if (e) { if (e.alive) { e.alive = false; e.state = 'dead'; e.deadT = 0; e.atk = null; } e.pos.set(m.x, m.y, m.z); G.Particles.poof(G.tmp.v1.copy(e.pos).setY(e.pos.y + e.yOffset + 0.8), 0x6a2a7a, e.boss ? 3 : 1); G.Audio.play('poof', { pos: e.pos }); G.Enemies.rewardLocal(e, m.c.includes(this.myId)); if (e.boss) { if (e.kind !== 'omega') G.Events.emit('bossDefeated', e); } } break; }
      case 'erespawn': { const e = G.Enemies.byId.get(m.id); if (e) { e.alive = true; e.deadT = 0; e.hp = e.maxHp; e.model.scale.setScalar(e.baseScale || 1); } break; }
      case 'proj': this.spawnProj(m, m.o === 'e' ? 'e' : 'r'); break;
      case 'tw': G.Sky.time = m.time; G.Weather.target = m.w; if (this.pvp !== !!m.pvp) { this.pvp = !!m.pvp; G.Hud.notify(this.pvp ? '⚔ 対戦モードがONになった！' : '対戦モードがOFFになった'); } break;
      case 'chat': case 'stamp': case 'pin': this.onSocial(m); break;
      case 'pvphit': this.onPvpHit(m, m.from != null ? m.from : 0); break;
      case 'revive': G.player.revive(); break;
      case 'kill': this.onKill(m.victim, m.by); break;
      case 'ending': G.Quests.playEnding(); break;
    }
  },
  onHostLost() {
    if (this.role !== 'guest') return;
    this.role = 'single'; this.hostConn = null; try { this.peer.destroy(); } catch (e) { }
    G.Remote.clear(); this.pvp = false;
    G.Hud.updateRoom();
    G.Dialog.show('通知', ['ホストとの接続が切れました。', '自分のワールドで冒険を続けます。']);
  },
  leave() {
    if (this.role === 'host') { for (const c of this.conns.values()) { try { c.close(); } catch (e) { } } this.conns.clear(); }
    if (this.hostConn) { try { this.hostConn.close(); } catch (e) { } }
    if (this.peer) { try { this.peer.destroy(); } catch (e) { } }
    this.role = 'single'; this.peer = null; this.hostConn = null; this.code = null; this.pvp = false;
    G.Remote.clear(); G.Hud.updateRoom();
  },
  // ---- 送信 ----
  send(m) {
    if (this.role === 'guest' && this.hostConn && this.hostConn.open) this.hostConn.send(m);
    else if (this.role === 'host') {
      if (m.t === 'pvphit') { const c = this.conns.get(m.to); if (c) { m.from = 0; c.send(m); } return; }
      if (m.t === 'pvpkill') { this.onKill(0, m.by); this.broadcast({ t: 'kill', victim: 0, by: m.by }); return; }
      if (m.t === 'revive') { const c = this.conns.get(m.to); if (c) c.send(m); return; }
      m.id = 0; this.broadcast(m);
    }
  },
  broadcast(m, except) { if (this.role !== 'host') return; for (const [id, c] of this.conns) if (id !== except && c.open) { try { c.send(m); } catch (e) { } } },
  sendHit(e, d, o) { this.send({ t: 'ehit', id: e.id, d, el: o.elem || null, cr: !!o.crit, w: !!o.weak, kx: o.kx || 0, kz: o.kz || 0, kb: o.kb || 0, src: o.src || null, sh: !!o.shatter }); },
  sendProj(p) {
    const m = { t: 'proj', k: p.kind, p: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)], v: [+p.vel.x.toFixed(2), +p.vel.y.toFixed(2), +p.vel.z.toFixed(2)], o: p.owner === 'e' ? 'e' : 'p', d: p.dmg || 0, el: p.elem || null, g: p.gravity || 0, l: p.life, r: p.radius, c: p.color || null, at: p.atype || null };
    if (p.end) m.e = [+p.end.x.toFixed(2), +p.end.y.toFixed(2), +p.end.z.toFixed(2)];
    if (p.width) m.w = p.width; if (p.targetId != null) m.tg = p.targetId; if (p.speed) m.sp = p.speed; if (p.maxR) m.mr = p.maxR; if (p.hitR) m.hr = p.hitR;
    if (this.role === 'host') this.broadcast(m); else this.send(m);
  },
  spawnProj(m, owner) {
    if (G.Shrine.inside) return;
    const o = { kind: m.k, pos: new THREE.Vector3(m.p[0], m.p[1], m.p[2]), vel: new THREE.Vector3(m.v[0], m.v[1], m.v[2]), owner, dmg: m.d, elem: m.el, gravity: m.g, life: m.l, radius: m.r, color: m.c, atype: m.at, width: m.w, targetId: m.tg, speed: m.sp, maxR: m.mr, hitR: m.hr };
    if (m.e) o.end = new THREE.Vector3(m.e[0], m.e[1], m.e[2]);
    G.Proj.spawn(o, true);
  },
  // ---- 交流 ----
  chat(text) { text = String(text).slice(0, 80); if (!text.trim()) return; this.send({ t: 'chat', text }); this.onSocial({ t: 'chat', id: this.myId, text }); },
  stamp(n) { this.send({ t: 'stamp', n }); this.onSocial({ t: 'stamp', id: this.myId, n }); },
  pin(x, z) { this.send({ t: 'pin', x, z }); this.onSocial({ t: 'pin', id: this.myId, x, z }); },
  stamps: ['こっち！', '助けて！', 'ありがとう！', 'いいね！', 'ちょっと待って', '行こう！', 'ボスがいる！', '宝箱あるよ！'],
  onSocial(m) {
    const name = m.id === this.myId ? G.Prog.data.name : (this.names[m.id] || '？');
    if (m.t === 'chat') { G.Hud.chatLine(name, m.text); G.Remote.bubble(m.id, m.text); G.Audio.play('chat'); }
    if (m.t === 'stamp') { const s = this.stamps[m.n] || '!'; G.Hud.chatLine(name, '【' + s + '】'); G.Remote.bubble(m.id, s); G.Audio.play('chat'); }
    if (m.t === 'pin') { G.Map.setPin(m.id, m.x, m.z); G.Hud.chatLine('system', name + ' がマップにピンを置いた'); }
  },
  onPvpHit(m, from) {
    if (!this.pvp || !G.player || G.player.dead) return;
    G.player.lastPvpBy = from; G.player.lastPvpAt = performance.now();
    const src = G.Remote.get(from);
    G.player.takeDamage(m.dmg, src ? src.pos : null, m.elem, { kb: 5 });
  },
  onKill(victim, by) {
    this.kills[by] = (this.kills[by] || 0) + 1;
    const vn = victim === this.myId ? G.Prog.data.name : this.names[victim] || '？', bn = by === this.myId ? G.Prog.data.name : this.names[by] || '？';
    G.Hud.chatLine('system', '⚔ ' + bn + ' が ' + vn + ' を倒した！（' + this.kills[by] + 'キル）');
    G.Hud.updateRoom();
  },
  setPvp(on) { if (this.role !== 'host') return; this.pvp = on; this.twT = 0; G.Hud.notify(on ? '⚔ 対戦モードON' : '対戦モードOFF'); },
  // ---- 定期処理 ----
  update(dt) {
    if (this.role === 'single') return;
    this.sendT -= dt;
    if (this.sendT <= 0 && G.player) { this.sendT = 1 / 12; this.send({ t: 'ps', s: G.player.netState() }); }
    if (this.role === 'host') {
      this.esT -= dt;
      if (this.esT <= 0) {
        this.esT = 0.1;
        for (const [id, c] of this.conns) { const r = G.Remote.get(id); if (!r || !c.open) continue; c.send({ t: 'es', e: G.Enemies.snapshot(r.pos), dt: 0.1 }); }
      }
      this.twT -= dt;
      if (this.twT <= 0) { this.twT = 3; this.broadcast({ t: 'tw', time: +G.Sky.time.toFixed(3), w: G.Weather.target, pvp: this.pvp }); }
    }
  },
};
