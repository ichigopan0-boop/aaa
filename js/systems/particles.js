// ===== パーティクル =====
'use strict';
G.Particles = {
  systems: [],
  init(scene) {
    this.add = this.make(scene, 2500, true);
    this.norm = this.make(scene, 1800, false);
  },
  make(scene, max, additive) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(max * 3), col = new Float32Array(max * 4), size = new Float32Array(max);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: window.innerHeight / 2 } },
      vertexShader: `attribute float size; attribute vec4 color; varying vec4 vC; uniform float uScale;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, d) * vC.a; if (a < 0.01) discard; gl_FragColor = vec4(vC.rgb, a); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
    const s = { pts, max, n: 0, pos, col, size, vel: new Float32Array(max * 3), life: new Float32Array(max), maxLife: new Float32Array(max), grav: new Float32Array(max), base: new Float32Array(max * 4), sz0: new Float32Array(max), drag: new Float32Array(max) };
    this.systems.push(s); return s;
  },
  emit(sys, p, o) {
    const c = G.tmp.c1.set(o.color != null ? o.color : 0xffffff);
    for (let k = 0; k < (o.count || 1); k++) {
      if (sys.n >= sys.max) return;
      const i = sys.n++;
      const sp = (o.speed || 2) * (0.4 + Math.random() * 0.6);
      let vx = (Math.random() - 0.5) * 2, vy = (Math.random() - 0.5) * 2, vz = (Math.random() - 0.5) * 2;
      const l = Math.hypot(vx, vy, vz) || 1; vx /= l; vy /= l; vz /= l;
      vy = vy * (o.spreadY != null ? o.spreadY : 1) + (o.up || 0);
      const sr = o.spread || 0;
      sys.pos[i * 3] = p.x + (Math.random() - 0.5) * sr; sys.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * sr * (o.spreadYPos != null ? o.spreadYPos : 1); sys.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * sr;
      sys.vel[i * 3] = vx * sp + (o.vx || 0); sys.vel[i * 3 + 1] = vy * sp + (o.vy || 0); sys.vel[i * 3 + 2] = vz * sp + (o.vz || 0);
      const lf = (o.life || 0.6) * (0.6 + Math.random() * 0.6); sys.life[i] = lf; sys.maxLife[i] = lf;
      sys.grav[i] = o.gravity != null ? o.gravity : 0; sys.drag[i] = o.drag || 0;
      const v = o.vary || 0.15;
      sys.base[i * 4] = c.r * (1 - v + Math.random() * v); sys.base[i * 4 + 1] = c.g * (1 - v + Math.random() * v); sys.base[i * 4 + 2] = c.b * (1 - v + Math.random() * v); sys.base[i * 4 + 3] = o.alpha || 1;
      sys.sz0[i] = (o.size || 0.3) * (0.7 + Math.random() * 0.6);
    }
  },
  update(dt) {
    for (const s of this.systems) {
      let i = 0;
      while (i < s.n) {
        s.life[i] -= dt;
        if (s.life[i] <= 0) { // 末尾と入れ替え
          const j = --s.n;
          if (i !== j) {
            for (let k = 0; k < 3; k++) { s.pos[i * 3 + k] = s.pos[j * 3 + k]; s.vel[i * 3 + k] = s.vel[j * 3 + k]; }
            for (let k = 0; k < 4; k++) s.base[i * 4 + k] = s.base[j * 4 + k];
            s.life[i] = s.life[j]; s.maxLife[i] = s.maxLife[j]; s.grav[i] = s.grav[j]; s.sz0[i] = s.sz0[j]; s.drag[i] = s.drag[j];
          }
          continue;
        }
        const d = 1 - s.drag[i] * dt;
        s.vel[i * 3] *= d; s.vel[i * 3 + 1] = s.vel[i * 3 + 1] * d - s.grav[i] * dt; s.vel[i * 3 + 2] *= d;
        s.pos[i * 3] += s.vel[i * 3] * dt; s.pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt; s.pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
        const f = s.life[i] / s.maxLife[i];
        s.col[i * 4] = s.base[i * 4]; s.col[i * 4 + 1] = s.base[i * 4 + 1]; s.col[i * 4 + 2] = s.base[i * 4 + 2]; s.col[i * 4 + 3] = s.base[i * 4 + 3] * Math.min(1, f * 2.5);
        s.size[i] = s.sz0[i] * (0.4 + f * 0.6);
        i++;
      }
      const g = s.pts.geometry; g.setDrawRange(0, s.n);
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.size.needsUpdate = true;
      s.pts.material.uniforms.uScale.value = window.innerHeight / 2 / Math.tan(G.camera.fov * Math.PI / 360) * 0.6 * G.renderer.getPixelRatio();
    }
  },
  // ---- 便利関数 ----
  burst(p, color, n = 12, speed = 4) { this.emit(this.add, p, { color, count: n, speed, life: 0.5, size: 0.25, gravity: 6 }); },
  spark(p, color = 0xfff2b0, n = 6) { this.emit(this.add, p, { color, count: n, speed: 5, life: 0.25, size: 0.15, gravity: 10 }); },
  hit(p, crit) { this.emit(this.add, p, { color: crit ? 0xffd54f : 0xffffff, count: crit ? 16 : 9, speed: crit ? 8 : 6, life: 0.3, size: crit ? 0.3 : 0.2, gravity: 4 }); },
  poof(p, color = 0x7a3a8a, big = 1) { this.emit(this.norm, p, { color, count: 18 * big, speed: 2.5 * big, life: 0.9, size: 0.9 * big, spread: 0.8 * big, up: 0.6, drag: 2 }); this.emit(this.add, p, { color: 0xff66cc, count: 8 * big, speed: 4, life: 0.4, size: 0.2 }); },
  smoke(p, n = 3, color = 0x888888) { this.emit(this.norm, p, { color, count: n, speed: 0.6, life: 1.6, size: 0.8, up: 1.2, spread: 0.4, drag: 0.5, alpha: 0.5 }); },
  dust(p) { this.emit(this.norm, p, { color: 0xc8b89a, count: 5, speed: 1.2, life: 0.6, size: 0.45, spread: 0.4, spreadY: 0.3, drag: 3, alpha: 0.6 }); },
  splash(p) { this.emit(this.norm, p, { color: 0xddf4ff, count: 20, speed: 4, life: 0.6, size: 0.3, up: 1.5, gravity: 12, spread: 0.5 }); },
  fire(p, n = 2) { this.emit(this.add, p, { color: 0xff7a20, count: n, speed: 0.6, life: 0.5, size: 0.45, up: 2, spread: 0.5 }); this.emit(this.add, p, { color: 0xffd040, count: 1, speed: 0.4, life: 0.3, size: 0.3, up: 2, spread: 0.3 }); },
  ice(p, n = 3) { this.emit(this.add, p, { color: 0x9ae8ff, count: n, speed: 1.5, life: 0.6, size: 0.25, spread: 0.6 }); },
  elec(p, n = 3) { this.emit(this.add, p, { color: 0xfff066, count: n, speed: 6, life: 0.15, size: 0.18, spread: 0.6 }); },
  trail(p, color = 0xffffff, size = 0.2) { this.emit(this.add, p, { color, count: 1, speed: 0.05, life: 0.25, size }); },
  heal(p) { this.emit(this.add, p, { color: 0xff8fb0, count: 14, speed: 1, life: 1.0, size: 0.25, up: 2, spread: 1.0 }); },
  levelUp(p) { this.emit(this.add, p, { color: 0xffe082, count: 60, speed: 2, life: 1.4, size: 0.3, up: 3, spread: 1.5 }); },
  magic(p, color) { this.emit(this.add, p, { color, count: 2, speed: 0.6, life: 0.35, size: 0.35, spread: 0.2 }); },
  explosion(p, r = 4) {
    this.emit(this.add, p, { color: 0xffa040, count: 50, speed: r * 3, life: 0.5, size: 0.7, drag: 4 });
    this.emit(this.norm, p, { color: 0x555555, count: 25, speed: r * 1.2, life: 1.4, size: 1.6, up: 0.8, drag: 2, alpha: 0.7 });
  },
  sparkle(p, color = 0xffffaa) { this.emit(this.add, p, { color, count: 1, speed: 0.4, life: 0.8, size: 0.18, spread: 0.6, up: 0.3 }); },
  malice(p) { this.emit(this.add, p, { color: 0xff2266, count: 2, speed: 0.8, life: 1.0, size: 0.6, up: 1.5, spread: 2 }); },
};
