// ===== 当たり判定（円柱・箱・地形） =====
'use strict';
G.Col = {
  CELL: 16, grid: new Map(), dynamic: [], stamp: 1, STEP: 0.6,
  key(i, j) { return (i + 2000) * 8192 + (j + 2000); },
  _insert(c, minX, minZ, maxX, maxZ) {
    const C = this.CELL;
    const i0 = Math.floor(minX / C), i1 = Math.floor(maxX / C), j0 = Math.floor(minZ / C), j1 = Math.floor(maxZ / C);
    c._cells = [];
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = this.key(i, j); let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); }
      a.push(c); c._cells.push(k);
    }
  },
  addCyl(x, z, r, y0, y1, opts) {
    const c = Object.assign({ t: 'c', x, z, r, y0, y1, active: true, _s: 0 }, opts || {});
    if (c.dynamic) this.dynamic.push(c); else this._insert(c, x - r, z - r, x + r, z + r);
    return c;
  },
  addBox(minX, minY, minZ, maxX, maxY, maxZ, opts) {
    const b = Object.assign({ t: 'b', minX, minY, minZ, maxX, maxY, maxZ, active: true, _s: 0 }, opts || {});
    if (b.dynamic) this.dynamic.push(b); else this._insert(b, minX, minZ, maxX, maxZ);
    return b;
  },
  // 中心とサイズで箱を追加
  box(cx, cy, cz, w, h, d, opts) { return this.addBox(cx - w / 2, cy, cz - d / 2, cx + w / 2, cy + h, cz + d / 2, opts); },
  remove(c) {
    c.active = false;
    if (c._cells) for (const k of c._cells) { const a = this.grid.get(k); if (a) { const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); } }
    const di = this.dynamic.indexOf(c); if (di >= 0) this.dynamic.splice(di, 1);
  },
  moveBox(b, dx, dy, dz) { b.minX += dx; b.maxX += dx; b.minY += dy; b.maxY += dy; b.minZ += dz; b.maxZ += dz; },
  query(x, z, r, out) {
    out = out || []; out.length = 0;
    const C = this.CELL, s = ++this.stamp;
    const i0 = Math.floor((x - r) / C), i1 = Math.floor((x + r) / C), j0 = Math.floor((z - r) / C), j1 = Math.floor((z + r) / C);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const a = this.grid.get(this.key(i, j)); if (!a) continue;
      for (const c of a) if (c._s !== s && c.active) { c._s = s; out.push(c); }
    }
    for (const c of this.dynamic) if (c.active) out.push(c);
    return out;
  },
  _q: [],
  // 足元の高さ（地形と、乗れる箱・円柱の上面）
  floorAt(x, z, y, r = 0.3, info) {
    let best = G.Terrain.getHeight(x, z), src = null;
    const list = this.query(x, z, r + 0.5, this._q);
    for (const c of list) {
      if (c.noFloor) continue;
      let top = -1e9;
      if (c.t === 'b') { if (x > c.minX - r * 0.6 && x < c.maxX + r * 0.6 && z > c.minZ - r * 0.6 && z < c.maxZ + r * 0.6) top = c.maxY; }
      else { if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + r * 0.4) ** 2) top = c.y1; }
      if (top > best && top <= y + this.STEP) { best = top; src = c; }
    }
    if (info) info.src = src;
    return best;
  },
  // 水平方向の押し出し
  resolve(pos, r, h, res) {
    res = res || {}; res.hit = false; res.nx = 0; res.nz = 0; res.col = null;
    const list = this.query(pos.x, pos.z, r + 1, this._q);
    for (let pass = 0; pass < 2; pass++) for (const c of list) {
      if (c.noWall) continue;
      const top = c.t === 'b' ? c.maxY : c.y1, bot = c.t === 'b' ? c.minY : c.y0;
      if (top <= pos.y + this.STEP || bot >= pos.y + h) continue;
      if (c.t === 'c') {
        const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), m = r + c.r;
        if (d < m) {
          const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
          pos.x = c.x + nx * m; pos.z = c.z + nz * m;
          res.hit = true; res.nx = nx; res.nz = nz; res.col = c;
        }
      } else {
        const cx = G.U.clamp(pos.x, c.minX, c.maxX), cz = G.U.clamp(pos.z, c.minZ, c.maxZ);
        let dx = pos.x - cx, dz = pos.z - cz; const d = Math.hypot(dx, dz);
        if (d < r) {
          let nx, nz;
          if (d > 1e-4) { nx = dx / d; nz = dz / d; pos.x = cx + nx * r; pos.z = cz + nz * r; }
          else {
            const l = pos.x - c.minX, rr = c.maxX - pos.x, f = pos.z - c.minZ, b = c.maxZ - pos.z, mn = Math.min(l, rr, f, b);
            if (mn === l) { nx = -1; nz = 0; pos.x = c.minX - r; } else if (mn === rr) { nx = 1; nz = 0; pos.x = c.maxX + r; }
            else if (mn === f) { nx = 0; nz = -1; pos.z = c.minZ - r; } else { nx = 0; nz = 1; pos.z = c.maxZ + r; }
          }
          res.hit = true; res.nx = nx; res.nz = nz; res.col = c;
        }
      }
    }
    return res;
  },
  // 天井（ジャンプで頭をぶつける）
  ceilingAt(x, z, y, r) {
    let best = 1e9;
    const list = this.query(x, z, r + 0.5, this._q);
    for (const c of list) {
      if (c.t !== 'b' || c.noWall) continue;
      if (x > c.minX - r * 0.5 && x < c.maxX + r * 0.5 && z > c.minZ - r * 0.5 && z < c.maxZ + r * 0.5 && c.minY >= y && c.minY < best) best = c.minY;
    }
    return best;
  },
  // カメラ用レイ（箱と地形）
  rayDist(o, dir, maxD) {
    let best = maxD;
    const steps = Math.ceil(maxD / 0.5);
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * maxD;
      const x = o.x + dir.x * t, y = o.y + dir.y * t, z = o.z + dir.z * t;
      if (y < G.Terrain.getHeight(x, z) + 0.35) { best = Math.max(0.3, t - 0.5); break; }
    }
    const mx = o.x + dir.x * maxD * 0.5, mz = o.z + dir.z * maxD * 0.5;
    const list = this.query(mx, mz, maxD * 0.5 + 1, this._q);
    for (const c of list) {
      if (c.noCam) continue;
      const t = c.t === 'b' ? this.rayBox(o, dir, c) : (c.tree ? -1 : this.rayCyl(o, dir, c));
      if (t >= 0 && t < best) best = Math.max(0.3, t - 0.3);
    }
    return best;
  },
  // レイと縦の円柱
  rayCyl(o, d, c) {
    const ox = o.x - c.x, oz = o.z - c.z;
    const a = d.x * d.x + d.z * d.z; if (a < 1e-6) return -1;
    const b = 2 * (ox * d.x + oz * d.z), cc = ox * ox + oz * oz - c.r * c.r;
    if (cc < 0) return -1; // 内側から（プレイヤーが中にいる）
    const disc = b * b - 4 * a * cc; if (disc < 0) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a); if (t < 0) return -1;
    const y = o.y + d.y * t; return y > c.y0 && y < c.y1 ? t : -1;
  },
  rayBox(o, d, b) {
    let tmin = 0, tmax = 1e9;
    for (const ax of ['x', 'y', 'z']) {
      const mn = ax === 'x' ? b.minX : ax === 'y' ? b.minY : b.minZ, mx = ax === 'x' ? b.maxX : ax === 'y' ? b.maxY : b.maxZ;
      if (Math.abs(d[ax]) < 1e-6) { if (o[ax] < mn || o[ax] > mx) return -1; }
      else {
        let t1 = (mn - o[ax]) / d[ax], t2 = (mx - o[ax]) / d[ax]; if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return -1;
      }
    }
    return tmin;
  },
  // 点が箱の中にあるか（投射物用）
  pointHit(x, y, z) {
    const list = this.query(x, z, 0.5, this._q);
    for (const c of list) {
      if (c.noProj) continue;
      if (c.t === 'b') { if (x > c.minX && x < c.maxX && y > c.minY && y < c.maxY && z > c.minZ && z < c.maxZ) return c; }
      else if (y > c.y0 && y < c.y1 && (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return c;
    }
    return null;
  },
};
