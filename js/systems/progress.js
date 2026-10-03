// ===== 成長・インベントリ・セーブ =====
'use strict';
G.SAVE_KEY = 'astra_save_v1';
G.SET_KEY = 'astra_settings_v1';
G.settings = Object.assign({
  quality: G.isTouch ? 0 : 1, viewDist: G.isTouch ? 380 : 620, volMaster: 0.8, volBgm: 0.6, volSfx: 0.8, sens: 1, invertY: false, pointerLock: true, showFps: false,
}, (() => { try { return JSON.parse(localStorage.getItem(G.SET_KEY)) || {}; } catch (e) { return {}; } })());
G.saveSettings = () => { try { localStorage.setItem(G.SET_KEY, JSON.stringify(G.settings)); } catch (e) { } };

G.Skills = [
  { col: '剣術', id: 'atk', name: '攻撃力アップ', max: 5, desc: '近接武器のダメージ+8%', lv: 1 },
  { col: '剣術', id: 'combo', name: '連撃の極意', max: 1, desc: '片手剣4連撃・両手剣3連撃・槍の連突きが増える', lv: 4 },
  { col: '剣術', id: 'spin', name: '回転斬り強化', max: 2, desc: 'ため攻撃の威力アップ＆がんばり消費減', lv: 3 },
  { col: '剣術', id: 'crit', name: '会心の一撃', max: 3, desc: '会心率+6%（会心は1.6倍）', lv: 6 },
  { col: '剣術', id: 'flurry', name: 'ラッシュ延長', max: 2, desc: 'ジャスト回避後のラッシュ時間が延びる', lv: 8 },
  { col: '弓術', id: 'bow', name: '弓の威力', max: 5, desc: '弓のダメージ+10%', lv: 1 },
  { col: '弓術', id: 'quick', name: '早引き', max: 2, desc: '弓を引く時間-25%', lv: 3 },
  { col: '弓術', id: 'headshot', name: '急所狙い', max: 2, desc: '弱点への矢のダメージがさらに上がる', lv: 5 },
  { col: '弓術', id: 'focus', name: '集中', max: 2, desc: '空中で弓を構えると時間がゆっくりになる', lv: 7 },
  { col: '弓術', id: 'multi', name: '追加の矢', max: 1, desc: '矢を1本おまけで同時に放つ（消費なし）', lv: 12 },
  { col: '魔法', id: 'mp', name: '最大MPアップ', max: 5, desc: '最大MP+15', lv: 1 },
  { col: '魔法', id: 'magic', name: '魔力アップ', max: 5, desc: '魔法のダメージ+12%', lv: 2 },
  { col: '魔法', id: 'mpRegen', name: 'MP回復速度', max: 3, desc: 'MPの自然回復+50%', lv: 4 },
  { col: '魔法', id: 'rodDur', name: 'ロッドの節約', max: 2, desc: '20%の確率でロッドの耐久を減らさない', lv: 6 },
  { col: '体術', id: 'hp', name: '体力アップ', max: 5, desc: 'ハート+1', lv: 1 },
  { col: '体術', id: 'stamina', name: 'がんばりアップ', max: 5, desc: 'がんばり+15', lv: 1 },
  { col: '体術', id: 'def', name: '防御アップ', max: 5, desc: '受けるダメージ-5%', lv: 2 },
  { col: '体術', id: 'cold', name: '寒さ耐性', max: 2, desc: 'Lv1:寒さ無効 Lv2:極寒も無効', lv: 4 },
  { col: '体術', id: 'heat', name: '暑さ耐性', max: 1, desc: '火山の暑さが平気になる', lv: 6 },
  { col: '体術', id: 'fireproof', name: '耐火', max: 1, desc: '火口でも燃えなくなる', lv: 12 },
  { col: '体術', id: 'climb', name: '登り上手', max: 2, desc: '登る速さ+25%・消費-20%', lv: 3 },
  { col: '体術', id: 'swim', name: '泳ぎ上手', max: 2, desc: '泳ぐ速さ+25%・消費-25%', lv: 3 },
  { col: '体術', id: 'durability', name: '武器の手入れ', max: 3, desc: '15%の確率で武器の耐久を減らさない', lv: 5 },
  { col: '冒険', id: 'cook', name: '料理上手', max: 2, desc: '料理の回復+25%・効果時間+50%', lv: 2 },
  { col: '冒険', id: 'treasure', name: '宝探し', max: 1, desc: '近くの宝箱と森の精の実がミニマップに映る', lv: 5 },
  { col: '冒険', id: 'sneak', name: '忍び足', max: 1, desc: '見つかりにくくなり、不意打ちが6倍に', lv: 4 },
  { col: '冒険', id: 'horse', name: '馬術', max: 1, desc: '馬が速くなり、ダッシュ回数が増える', lv: 3 },
  { col: '冒険', id: 'lucky', name: '幸運', max: 2, desc: '敵が落とすお金と素材が増える', lv: 6 },
];

G.Prog = {
  data: null,
  newData(name, color) {
    return {
      ver: 1, name: name || 'リンク', color: color != null ? color : 0x3a8a4a,
      level: 1, xp: 0, sp: 0, skills: {},
      hp: 12, hearts: 0, staminaUp: 0, blessings: 0, blessingsTotal: 0,
      money: 50,
      inv: { melee: [{ id: 'stick', dur: 8 }], bow: [], rod: [], arrows: { normal: 0 }, mats: { apple: 2 }, foods: [], key: [] },
      equip: { melee: 0, bow: -1, rod: -1, arrow: 'normal' },
      slots: { melee: 8, bow: 4, rod: 3 },
      flags: {}, chests: {}, seeds: {}, shrines: {}, towers: {}, bosses: {}, seedsSpent: 0,
      pos: null, rotY: Math.PI, respawn: null,
      horse: null, time: 8, weather: 'clear',
      stats: { kills: 0, deaths: 0, play: 0 },
    };
  },
  hasSave() { try { return !!localStorage.getItem(G.SAVE_KEY); } catch (e) { return false; } },
  load() {
    try { const s = JSON.parse(localStorage.getItem(G.SAVE_KEY)); if (s && s.ver) { this.data = Object.assign(this.newData(), s); this.data.inv = Object.assign(this.newData().inv, s.inv); return true; } } catch (e) { console.warn(e); }
    return false;
  },
  save() {
    if (!this.data) return;
    const p = G.player;
    if (p && !G.Shrine.inside) { this.data.pos = [p.pos.x, p.pos.y, p.pos.z]; this.data.rotY = p.rotY; }
    if (!(G.Net && G.Net.role === 'guest')) { this.data.time = G.Sky.time; this.data.weather = G.Weather.target; }
    if (G.Horse && G.Horse.mine) this.data.horse = G.Horse.saveData();
    try { localStorage.setItem(G.SAVE_KEY, JSON.stringify(this.data)); } catch (e) { console.warn('save failed', e); }
  },
  reset() { try { localStorage.removeItem(G.SAVE_KEY); } catch (e) { } },
  skill(id) { return (this.data && this.data.skills[id]) || 0; },
  // ---- ステータス ----
  heartCount() { const d = this.data; return 3 + d.hearts + Math.floor((d.level - 1) / 2) + this.skill('hp'); },
  maxHp() { return this.heartCount() * 4; },
  maxStamina() { return 100 + this.data.staminaUp * 20 + this.skill('stamina') * 15; },
  maxMp() { return 40 + this.skill('mp') * 15 + Math.floor(this.data.level / 3) * 3; },
  buff(eff) { const b = this.buffs[eff]; return b && b.t > 0 ? b.pow : 0; },
  atkMul() { return 1 + (this.data.level - 1) * 0.045 + this.skill('atk') * 0.08 + this.buff('attack') * 0.15; },
  bowMul() { return 1 + (this.data.level - 1) * 0.035 + this.skill('bow') * 0.1 + this.buff('attack') * 0.1; },
  magicMul() { return 1 + (this.data.level - 1) * 0.035 + this.skill('magic') * 0.12; },
  defPct() { return Math.min(0.72, (this.data.level - 1) * 0.014 + this.skill('def') * 0.05 + this.buff('defense') * 0.12); },
  critChance() { return 0.04 + this.skill('crit') * 0.06; },
  xpNext(lv) { return Math.floor(30 + 20 * Math.pow(lv, 1.5)); },
  addXP(n) {
    const d = this.data; if (!d || n <= 0) return;
    d.xp += Math.round(n);
    G.Hud && G.Hud.floatXP(n);
    let up = false;
    while (d.level < 50 && d.xp >= this.xpNext(d.level)) {
      d.xp -= this.xpNext(d.level); d.level++; d.sp += (d.level % 5 === 0) ? 2 : 1; up = true;
      if (G.player) { G.player.hp = this.maxHp(); G.player.mp = this.maxMp(); }
    }
    if (up) G.Events.emit('levelUp', d.level);
  },
  canLearn(sk) { const r = this.skill(sk.id); return r < sk.max && this.data.sp > 0 && this.data.level >= sk.lv + r * 2; },
  learn(sk) {
    if (!this.canLearn(sk)) return false;
    this.data.skills[sk.id] = this.skill(sk.id) + 1; this.data.sp--;
    if (G.player) { G.player.hp = Math.min(this.maxHp(), G.player.hp + (sk.id === 'hp' ? 4 : 0)); }
    this.save(); return true;
  },
  // ---- 武器 ----
  wcat(id) { const t = G.Items.weapons[id].type; return t === 'bow' ? 'bow' : t === 'rod' ? 'rod' : 'melee'; },
  addWeapon(id, dur) {
    const cat = this.wcat(id), list = this.data.inv[cat];
    if (list.length >= this.data.slots[cat]) return false;
    list.push({ id, dur: dur != null ? dur : G.Items.weapons[id].dur });
    if (this.data.equip[cat] < 0) this.data.equip[cat] = list.length - 1;
    G.Events.emit('invChanged');
    return true;
  },
  removeWeapon(cat, idx) {
    const list = this.data.inv[cat]; if (idx < 0 || idx >= list.length) return null;
    const it = list.splice(idx, 1)[0];
    const e = this.data.equip[cat];
    if (e === idx) this.data.equip[cat] = list.length ? this.bestIndex(cat) : -1;
    else if (e > idx) this.data.equip[cat] = e - 1;
    G.Events.emit('invChanged');
    return it;
  },
  bestIndex(cat) { const l = this.data.inv[cat]; let b = -1, ba = -1; l.forEach((w, i) => { const d = G.Items.weapons[w.id]; if (w.dur > 0 && d.atk > ba) { ba = d.atk; b = i; } }); return b; },
  equipped(cat) { const i = this.data.equip[cat]; const l = this.data.inv[cat]; return i >= 0 && i < l.length ? l[i] : null; },
  equippedDef(cat) { const w = this.equipped(cat); return w ? G.Items.weapons[w.id] : null; },
  equip(cat, idx) { if (idx >= 0 && idx < this.data.inv[cat].length) { this.data.equip[cat] = idx; G.Events.emit('invChanged'); } },
  cycle(cat) {
    const l = this.data.inv[cat]; if (!l.length) return;
    let i = this.data.equip[cat];
    for (let k = 0; k < l.length; k++) { i = (i + 1) % l.length; const w = l[i]; if (w.dur > 0 || G.Items.weapons[w.id].legendary) break; }
    this.equip(cat, i);
    const w = l[i]; G.Hud && G.Hud.notify('装備: ' + G.Items.weapons[w.id].name);
  },
  useDurability(cat, amt = 1) {
    const w = this.equipped(cat); if (!w) return;
    const def = G.Items.weapons[w.id];
    if (cat === 'melee' && Math.random() < this.skill('durability') * 0.15) return;
    if (cat === 'rod' && Math.random() < this.skill('rodDur') * 0.2) return;
    w.dur -= amt;
    if (w.dur <= 0) {
      if (def.legendary) { w.dur = 0; w.sleep = 300; G.Hud.notify('封印の剣は力を使い果たし眠りについた…（約5分で回復）'); G.Audio.play('break'); this.data.equip[cat] = this.bestIndex(cat); G.Events.emit('invChanged'); return; }
      G.Events.emit('weaponBreak', def.name);
      const idx = this.data.equip[cat]; this.data.inv[cat].splice(idx, 1);
      this.data.equip[cat] = this.bestIndex(cat);
      G.Events.emit('invChanged');
    }
  },
  updateLegendary(dt) {
    for (const w of this.data.inv.melee) if (w.sleep > 0) { w.sleep -= dt; if (w.sleep <= 0) { w.sleep = 0; w.dur = G.Items.weapons[w.id].dur; G.Hud.notify('封印の剣が目覚めた！'); G.Events.emit('invChanged'); } }
  },
  // ---- 矢 ----
  addArrows(t, n) { this.data.inv.arrows[t] = (this.data.inv.arrows[t] || 0) + n; G.Events.emit('invChanged'); },
  arrowCount(t) { return this.data.inv.arrows[t || this.data.equip.arrow] || 0; },
  useArrow() { const t = this.data.equip.arrow; if (this.arrowCount(t) <= 0) return null; this.data.inv.arrows[t]--; G.Events.emit('invChanged'); return t; },
  cycleArrow() {
    const order = G.Items.arrowOrder; let i = order.indexOf(this.data.equip.arrow);
    for (let k = 0; k < order.length; k++) { i = (i + 1) % order.length; if (this.arrowCount(order[i]) > 0 || order[i] === 'normal') break; }
    this.data.equip.arrow = order[i]; G.Events.emit('invChanged'); G.Hud.notify('矢: ' + G.Items.arrows[order[i]].name + ' ×' + this.arrowCount(order[i]));
  },
  // ---- 素材・料理 ----
  addMat(id, n = 1) { this.data.inv.mats[id] = (this.data.inv.mats[id] || 0) + n; G.Events.emit('invChanged'); },
  removeMat(id, n = 1) { const c = this.data.inv.mats[id] || 0; if (c < n) return false; this.data.inv.mats[id] = c - n; if (!this.data.inv.mats[id]) delete this.data.inv.mats[id]; G.Events.emit('invChanged'); return true; },
  matCount(id) { return this.data.inv.mats[id] || 0; },
  addFood(f, n = 1) {
    const k = f.name + '|' + f.heal + '|' + f.eff + '|' + f.pow;
    const ex = this.data.inv.foods.find(x => x.k === k);
    if (ex) ex.n += n; else this.data.inv.foods.push(Object.assign({ k, n }, f));
    G.Events.emit('invChanged');
  },
  buffs: {},
  applyFood(f) {
    const p = G.player; const ck = this.skill('cook');
    const heal = Math.round(f.heal * (1 + ck * 0.25));
    if (heal > 0 && p) { p.hp = Math.min(this.maxHp(), p.hp + heal); G.Particles.heal(p.pos.clone().setY(p.pos.y + 1)); G.Audio.play('heal'); }
    if (f.eff === 'stamina' && p) p.stamina = Math.min(p.maxStamina(), p.stamina + 60 * f.pow);
    else if (f.eff === 'mp' && p) p.mp = Math.min(this.maxMp(), p.mp + 25 * f.pow);
    else if (f.eff) {
      const dur = f.dur * (1 + ck * 0.5);
      const cur = this.buffs[f.eff];
      this.buffs[f.eff] = { pow: Math.max(f.pow, cur && cur.t > 0 ? cur.pow : 0), t: Math.max(dur, cur ? cur.t : 0) };
      G.Hud.notify(G.Items.effectNames[f.eff] + 'の効果 Lv' + f.pow + '（' + Math.round(dur) + '秒）');
    }
  },
  eatFood(idx) {
    const f = this.data.inv.foods[idx]; if (!f) return false;
    this.applyFood(f); f.n--; if (f.n <= 0) this.data.inv.foods.splice(idx, 1);
    G.Audio.play('eat'); G.Events.emit('invChanged'); return true;
  },
  eatMat(id) {
    if (!G.Items.edible(id) || !this.removeMat(id, 1)) return false;
    const m = G.Items.mats[id]; this.applyFood({ heal: m.heal, eff: null }); G.Audio.play('eat'); return true;
  },
  quickHeal() {
    const p = G.player, miss = this.maxHp() - p.hp;
    if (miss <= 0) { G.Hud.notify('ハートは満タンです'); return false; }
    const foods = this.data.inv.foods.map((f, i) => ({ f, i })).filter(o => o.f.heal > 0);
    if (foods.length) {
      foods.sort((a, b) => { const da = a.f.heal >= miss ? a.f.heal - miss : 1000 + miss - a.f.heal; const db = b.f.heal >= miss ? b.f.heal - miss : 1000 + miss - b.f.heal; return da - db; });
      const pick = foods[0]; G.Hud.notify(pick.f.name + 'を食べた'); return this.eatFood(pick.i);
    }
    const mats = Object.keys(this.data.inv.mats).filter(id => G.Items.edible(id)).sort((a, b) => G.Items.mats[b].heal - G.Items.mats[a].heal);
    if (mats.length) { G.Hud.notify(G.Items.mats[mats[0]].name + 'を食べた'); return this.eatMat(mats[0]); }
    G.Hud.notify('回復できる食べ物がない！'); G.Audio.play('error'); return false;
  },
  updateBuffs(dt) {
    for (const k in this.buffs) { const b = this.buffs[k]; if (b.t > 0) { b.t -= dt; if (b.t <= 0) { G.Hud.notify(G.Items.effectNames[k] + 'の効果が切れた'); delete this.buffs[k]; } } }
  },
  addMoney(n) { this.data.money = Math.max(0, Math.min(999999, this.data.money + Math.round(n))); G.Events.emit('invChanged'); },
  spend(n) { if (this.data.money < n) return false; this.data.money -= n; G.Events.emit('invChanged'); return true; },
  // 宝箱などの中身を受け取る
  give(item, silent) {
    if (!item) return true;
    if (item.k === 'w') { if (!this.addWeapon(item.id, item.dur)) { G.Hud.notify('武器がいっぱいで持てない！（メニューで捨てられます）'); return false; } if (!silent) G.Hud.itemGet(G.Items.weapons[item.id].name, item.id); return true; }
    if (item.k === 'a') { this.addArrows(item.id, item.n || 1); if (!silent) G.Hud.itemGet(G.Items.arrows[item.id].name + ' ×' + (item.n || 1)); return true; }
    if (item.k === 'm') { this.addMat(item.id, item.n || 1); if (!silent) G.Hud.itemGet(G.Items.mats[item.id].name + ' ×' + (item.n || 1)); return true; }
    if (item.k === 'g') { this.addMoney(item.n); if (!silent) G.Hud.itemGet(item.n + ' ゴールド'); G.Audio.play('coin'); return true; }
    if (item.k === 'f') { const f = G.Items.potions[item.id]; this.addFood(f, item.n || 1); if (!silent) G.Hud.itemGet(f.name); return true; }
    return true;
  },
  itemName(item) {
    if (item.k === 'w') return G.Items.weapons[item.id].name;
    if (item.k === 'a') return G.Items.arrows[item.id].name + ' ×' + (item.n || 1);
    if (item.k === 'm') return G.Items.mats[item.id].name + ' ×' + (item.n || 1);
    if (item.k === 'g') return item.n + ' ゴールド';
    if (item.k === 'f') return G.Items.potions[item.id].name;
    return '?';
  },
};
