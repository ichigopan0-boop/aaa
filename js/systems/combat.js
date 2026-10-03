// ===== 戦闘計算 =====
'use strict';
G.Combat = {
  // 近接ダメージ
  meleeDamage(def, mul, target) {
    const P = G.Prog;
    let dmg = def.atk * P.atkMul() * mul;
    let crit = Math.random() < P.critChance();
    if (crit) dmg *= 1.6;
    if (target && target.ancient && def.ancient) dmg *= def.legendary ? 2 : 1.8;
    return { dmg, crit };
  },
  arrowDamage(bowDef, arrowType, target, weak) {
    const P = G.Prog, A = G.Items.arrows[arrowType];
    let dmg = bowDef.atk * A.mul * P.bowMul() + (A.bonus || 0);
    let crit = false;
    if (weak) { dmg *= 2 + P.skill('headshot') * 0.5; crit = true; }
    if (target && target.ancient) { if (A.ancientArrow) dmg *= target.boss ? 2.5 : 5; else if (bowDef.ancient) dmg *= 1.6; }
    return { dmg, crit, elem: A.elem };
  },
  magicDamage(rodDef, target) {
    let dmg = rodDef.atk * G.Prog.magicMul();
    if (target && target.ancient && rodDef.ancient) dmg *= 1.8;
    return dmg;
  },
  elemMul(target, elem) {
    if (!elem || !target.elem) return 1;
    if (target.elem === elem) return 0;
    if ((target.elem === 'fire' && elem === 'ice') || (target.elem === 'ice' && elem === 'fire')) return 2.5;
    return 1;
  },
  // 敵にダメージ（ネットワーク対応）
  hitEnemy(e, dmg, o = {}) {
    if (!e || !e.alive) return 0;
    if (e.invuln && e.invuln > 0) return 0;
    let d = dmg * this.elemMul(e, o.elem);
    if (e.frozen > 0 && !o.elem) { d *= 3; o.shatter = true; }
    d = Math.max(1, Math.round(d - (e.armor || 0)));
    if (this.elemMul(e, o.elem) === 0 && o.elem) d = o.elem && dmg > 0 ? Math.max(1, Math.round(dmg * 0.2)) : 0;
    if (G.Net.role === 'guest' && e.net) {
      G.Net.sendHit(e, d, o);
      e.flash = 0.15; // 見た目だけ先に反応
      G.Hud.damageNumber(e.pos, d, o.crit ? 'crit' : '', (e.height || 1.6));
    } else {
      e.takeDamage(d, o);
      G.Hud.damageNumber(e.pos, d, o.crit ? 'crit' : '', (e.height || 1.6));
    }
    return d;
  },
  // 扇形の範囲攻撃
  arcHit(origin, fx, fz, range, arc, cb, already) {
    const list = G.Enemies.nearby(origin.x, origin.z, range + 6);
    let n = 0;
    for (const e of list) {
      if (!e.alive || (already && already.has(e))) continue;
      const dx = e.pos.x - origin.x, dz = e.pos.z - origin.z;
      const d = Math.hypot(dx, dz) - (e.radius || 0.5);
      if (d > range) continue;
      const ey = e.pos.y, eh = e.height || 1.6;
      if (origin.y + 2.2 < ey || origin.y - 0.5 > ey + eh) continue;
      const ang = d > 0.3 ? Math.acos(G.U.clamp((dx * fx + dz * fz) / Math.max(0.001, Math.hypot(dx, dz)), -1, 1)) : 0;
      if (ang > arc / 2) continue;
      if (already) already.add(e);
      cb(e); n++;
    }
    // 対戦（PvP）
    if (G.Net.pvp && G.Net.role !== 'single') {
      for (const r of G.Remote.list()) {
        if (r.dead || r.interior !== G.Shrine.insideId || (already && already.has(r))) continue;
        const dx = r.pos.x - origin.x, dz = r.pos.z - origin.z, d = Math.hypot(dx, dz) - 0.4;
        if (d > range || Math.abs(r.pos.y - origin.y) > 2) continue;
        const ang = d > 0.3 ? Math.acos(G.U.clamp((dx * fx + dz * fz) / Math.max(0.001, Math.hypot(dx, dz)), -1, 1)) : 0;
        if (ang > arc / 2) continue;
        if (already) already.add(r);
        cb(r, true); n++;
      }
    }
    return n;
  },
  // 範囲（爆発など）
  radiusHit(p, r, cb) {
    for (const e of G.Enemies.nearby(p.x, p.z, r + 6)) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z, (e.pos.y + (e.height || 1.6) / 2) - p.y);
      if (d < r + (e.radius || 0.5)) cb(e, d);
    }
  },
  // PvPダメージ
  hitRemote(r, dmg, o = {}) {
    G.Net.send({ t: 'pvphit', to: r.id, dmg: Math.round(dmg), elem: o.elem || null, kx: o.kx || 0, kz: o.kz || 0 });
    G.Hud.damageNumber(r.pos, Math.round(dmg), 'player', 1.8);
    G.Particles.hit(r.pos.clone().setY(r.pos.y + 1.2));
  },
  // 敵へ状態異常を付与（ホスト側の処理）
  applyStatus(e, elem, power = 1) {
    if (!elem || e.elem === elem) return;
    if (elem === 'fire') { e.burn = 3; e.burnTick = 0; }
    else if (elem === 'ice' && !e.boss) { e.frozen = 4; }
    else if (elem === 'ice' && e.boss) { e.slow = 3; }
    else if (elem === 'elec') { if (e.kind === 'omega' || e.kind === 'hinox') return; e.stun = e.boss ? 0.5 : 1.6; if (e.dropWeapon) e.dropWeapon(); }
  },
};
