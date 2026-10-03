// ===== 三人称カメラ =====
'use strict';
G.Cam = {
  yaw: Math.PI, pitch: 0.25, dist: 7, targetDist: 7, shake: 0, aimBlend: 0, fov: 60,
  pivot: new THREE.Vector3(), cur: new THREE.Vector3(), dir: new THREE.Vector3(), lockTarget: null,
  cine: null,
  init() { this.cur.set(0, 30, 0); },
  addShake(v) { this.shake = Math.max(this.shake, v); },
  update(dt) {
    const I = G.Input, cam = G.camera, p = G.player;
    if (this.cine) { this.updateCine(dt); return; }
    if (!p) return;
    const sens = 0.0024 * G.settings.sens * (this.aimBlend > 0.5 ? 0.6 : 1);
    if (G.state === 'playing') {
      this.yaw -= I.lookDX * sens;
      this.pitch += I.lookDY * sens * (G.settings.invertY ? -1 : 1);
      if (I.wheel && !G.UI.anyOpen()) this.targetDist = G.U.clamp(this.targetDist + I.wheel * 0.8, 3, 14);
    }
    this.pitch = G.U.clamp(this.pitch, -1.1, 1.35);
    const aiming = p.state === 'aim' || (p.aiming && p.state !== 'climb');
    this.aimBlend = G.U.damp(this.aimBlend, aiming ? 1 : 0, 10, dt);
    // ロックオン中は敵の方へ
    const lt = p.lockTarget;
    if (lt && lt.alive !== false && !aiming) {
      const dx = lt.pos.x - p.pos.x, dz = lt.pos.z - p.pos.z;
      const want = Math.atan2(-dx, -dz);
      this.yaw = G.U.dampAngle(this.yaw, want, 5, dt);
      const dy = (lt.pos.y + (lt.height || 1.5) * 0.5) - (p.pos.y + 1.5), dd = Math.hypot(dx, dz);
      this.pitch = G.U.damp(this.pitch, G.U.clamp(0.22 - Math.atan2(dy, dd) * 0.5, -0.4, 0.9), 4, dt);
    }
    const riding = p.state === 'ride';
    const baseDist = (riding ? this.targetDist + 2 : this.targetDist) * (p.big ? 1.5 : 1);
    const dist = G.U.lerp(baseDist, 2.4, this.aimBlend);
    const right = G.tmp.v1.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.pivot.set(p.pos.x, p.pos.y + (riding ? 2.4 : 1.55) + (p.state === 'swim' ? -0.4 : 0), p.pos.z);
    this.pivot.addScaledVector(right, this.aimBlend * 0.75);
    this.dir.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    let d = G.Col.rayDist(this.pivot, this.dir, dist);
    this.dist = d < this.dist ? d : G.U.damp(this.dist, d, 6, dt);
    const tx = this.pivot.x + this.dir.x * this.dist, ty = this.pivot.y + this.dir.y * this.dist, tz = this.pivot.z + this.dir.z * this.dist;
    cam.position.set(tx, ty, tz);
    if (this.shake > 0) { cam.position.x += (Math.random() - 0.5) * this.shake; cam.position.y += (Math.random() - 0.5) * this.shake; this.shake = Math.max(0, this.shake - dt * 3); }
    cam.lookAt(this.pivot.x - this.dir.x * 10, this.pivot.y - this.dir.y * 10, this.pivot.z - this.dir.z * 10);
    const fov = G.U.lerp(this.fov, 42, this.aimBlend) + (p.state === 'glide' ? 6 : 0) + (p.dashing ? 4 : 0);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = G.U.damp(cam.fov, fov, 6, dt); cam.updateProjectionMatrix(); }
  },
  // カメラの前方（水平）
  forward(out) { return (out || new THREE.Vector3()).set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); },
  // 照準方向（画面中央）
  aimRay(out) { const c = G.camera; return (out || new THREE.Vector3()).set(0, 0, -1).applyQuaternion(c.quaternion); },
  // 演出用カメラ
  startCine(points, dur, onEnd) { this.cine = { points, dur, t: 0, onEnd }; },
  updateCine(dt) {
    const c = this.cine; c.t += dt; const f = Math.min(1, c.t / c.dur);
    const n = c.points.length - 1, seg = Math.min(n - 1, Math.floor(f * n)), lf = f * n - seg;
    const a = c.points[seg], b = c.points[seg + 1];
    G.camera.position.lerpVectors(a.pos, b.pos, lf);
    const look = G.tmp.v2.lerpVectors(a.look, b.look, lf);
    G.camera.lookAt(look);
    if (f >= 1) { const cb = c.onEnd; this.cine = null; cb && cb(); }
  },
};
