// ===== 空・昼夜・ライティング =====
'use strict';
G.Sky = {
  time: 8, // 0-24時
  DAY_SECONDS: 16 * 60, // 1日＝16分
  sun: null, hemi: null, dome: null, uniforms: null, clouds: null,
  indoor: false, flash: 0,
  keys: [
    // 時刻, 天頂色, 地平色, フォグ色, 太陽強度, 環境光強度, 太陽色
    [0, 0x070c1e, 0x17223e, 0x141c30, 0.0, 0.32, 0x8899cc],
    [4.5, 0x0d1530, 0x2a2f52, 0x262a44, 0.0, 0.34, 0x8899cc],
    [5.6, 0x2d3d6e, 0xee9a6c, 0xc08a78, 0.35, 0.5, 0xffb07a],
    [7, 0x4a8be0, 0xbfe0ff, 0xb8d6ef, 0.9, 0.62, 0xfff0d8],
    [12, 0x3a7fe6, 0xcfe8ff, 0xc6def2, 1.05, 0.68, 0xffffff],
    [16.5, 0x467cd2, 0xffe2b0, 0xd8d6cc, 0.95, 0.62, 0xfff1d6],
    [18.3, 0x3a4a8a, 0xff8a52, 0xd89070, 0.45, 0.5, 0xffa060],
    [19.4, 0x141c3e, 0x3c3264, 0x2c2a48, 0.0, 0.38, 0x8899cc],
    [24, 0x070c1e, 0x17223e, 0x141c30, 0.0, 0.32, 0x8899cc],
  ],
  init(scene) {
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5a6b3a, 0.6); scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.12); scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffffff, 1); scene.add(this.sun); scene.add(this.sun.target);
    this.sun.castShadow = G.settings.quality > 0;
    const ss = G.settings.quality >= 2 ? 2048 : 1024;
    this.sun.shadow.mapSize.set(ss, ss);
    const sc = this.sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 400;
    this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.04;
    // 空のドーム
    this.uniforms = {
      uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uNight: { value: 0 }, uTime: { value: 0 }, uCloud: { value: 0 }, uSunCol: { value: new THREE.Color(1, 1, 1) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }`,
      fragmentShader: `
        uniform vec3 uTop, uHorizon, uSunDir, uMoonDir, uSunCol; uniform float uNight, uTime, uCloud; varying vec3 vDir;
        float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        void main(){
          vec3 d = normalize(vDir); float e = d.y;
          vec3 col = mix(uHorizon, uTop, pow(clamp(e,0.0,1.0), 0.55));
          if (e < 0.0) col = mix(uHorizon, uHorizon*0.7, clamp(-e*4.0,0.0,1.0));
          float sd = dot(d, uSunDir);
          col += uSunCol * pow(max(sd,0.0), 8.0) * 0.35 * (1.0-uCloud);
          col += uSunCol * smoothstep(0.9975, 0.9985, sd) * 2.0 * (1.0-uCloud*0.8);
          float md = dot(d, uMoonDir);
          col += vec3(0.9,0.95,1.0) * smoothstep(0.9988, 0.9993, md) * uNight * (1.0-uCloud);
          col += vec3(0.4,0.5,0.7) * pow(max(md,0.0), 30.0) * 0.25 * uNight;
          if (uNight > 0.01 && e > 0.0) {
            vec3 sp = floor(d * 260.0); float h = hash(sp);
            float star = step(0.9965, h) * (0.6 + 0.4*sin(uTime*2.0 + h*100.0));
            col += vec3(star) * uNight * smoothstep(0.0, 0.25, e) * (1.0-uCloud);
          }
          col = mix(col, vec3(dot(col, vec3(0.33)))*0.85, uCloud*0.6);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), mat);
    this.dome.frustumCulled = false; this.dome.renderOrder = -10;
    scene.add(this.dome);
    scene.fog = new THREE.Fog(0xc6def2, 120, 900);
    this.makeClouds(scene);
  },
  makeClouds(scene) {
    const parts = [];
    const r = G.U.rng(42);
    for (let k = 0; k < 6; k++) parts.push({ geo: new THREE.IcosahedronGeometry(1, 1), matrix: G.Geo.mtx((k - 2.5) * 1.6 + r.range(-0.4, 0.4), r.range(-0.2, 0.5), r.range(-0.8, 0.8), 0, 0, 0, r.range(1.2, 2.0), r.range(0.8, 1.3), r.range(1.0, 1.6)), color: 0xffffff });
    const geo = G.Geo.merge(parts, false);
    const n = 70;
    this.cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: G.Mat.grad3, emissive: 0x334455, transparent: true, opacity: 0.92 });
    const im = new THREE.InstancedMesh(geo, this.cloudMat, n);
    this.cloudData = [];
    for (let i = 0; i < n; i++) {
      this.cloudData.push({ x: r.range(-1100, 1100), z: r.range(-1100, 1100), y: r.range(260, 360), s: r.range(10, 22), ry: r.range(0, 6.28) });
    }
    im.frustumCulled = false;
    scene.add(im); this.clouds = im; this.updateClouds(0);
  },
  updateClouds(dt) {
    const m = G.tmp.m1, q = G.tmp.q1, v = G.tmp.v1, s = G.tmp.v2;
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i];
      c.x += dt * 4; if (c.x > 1100) c.x = -1100;
      q.setFromAxisAngle(G.tmp.v3.set(0, 1, 0), c.ry);
      m.compose(v.set(c.x, c.y, c.z), q, s.set(c.s, c.s * 0.6, c.s));
      this.clouds.setMatrixAt(i, m);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  },
  isNight() { return this.time < 5.3 || this.time > 19.2; },
  sample(t) {
    const K = this.keys; let i = 0; while (i < K.length - 1 && K[i + 1][0] <= t) i++;
    const a = K[i], b = K[Math.min(i + 1, K.length - 1)]; const f = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0;
    const c1 = G.tmp.c1, c2 = G.tmp.c2;
    const mix = (ia) => { c1.set(a[ia]); c2.set(b[ia]); return c1.clone().lerp(c2, f); };
    return { top: mix(1), hor: mix(2), fog: mix(3), sun: G.U.lerp(a[4], b[4], f), amb: G.U.lerp(a[5], b[5], f), sunCol: mix(6) };
  },
  update(dt, center) {
    if (!(G.Net && G.Net.role === 'guest')) this.time = (this.time + dt * 24 / this.DAY_SECONDS) % 24;
    const s = this.sample(this.time);
    const W = G.Weather; const cloud = W ? W.cloudiness : 0;
    // 太陽の位置
    const ang = (this.time - 6) / 12 * Math.PI;
    const sd = this.uniforms.uSunDir.value.set(Math.cos(ang) * 0.75, Math.sin(ang), 0.4).normalize();
    this.uniforms.uMoonDir.value.copy(sd).multiplyScalar(-1);
    const night = G.U.smooth(0.05, -0.2, sd.y);
    this.uniforms.uNight.value = night;
    this.uniforms.uTime.value += dt;
    this.uniforms.uCloud.value = cloud;
    const grey = new THREE.Color(0x6a7280).multiplyScalar(0.6 + (1 - night) * 0.6);
    const top = s.top.clone().lerp(grey, cloud * 0.7), hor = s.hor.clone().lerp(grey, cloud * 0.6);
    this.uniforms.uTop.value.copy(top); this.uniforms.uHorizon.value.copy(hor); this.uniforms.uSunCol.value.copy(s.sunCol);
    // 光
    const lightDir = sd.y > -0.05 ? sd : this.uniforms.uMoonDir.value;
    const sunI = sd.y > -0.05 ? s.sun : 0.28;
    this.sun.intensity = sunI * (1 - cloud * 0.55) + this.flash * 1.5;
    this.sun.color.copy(sd.y > -0.05 ? s.sunCol : new THREE.Color(0x9fb3e0));
    this.hemi.intensity = s.amb * (1 - cloud * 0.2) + this.flash;
    this.hemi.color.copy(top).lerp(new THREE.Color(0xffffff), 0.35);
    this.hemi.groundColor.setHex(night > 0.5 ? 0x223040 : 0x6a7a45);
    this.flash = Math.max(0, this.flash - dt * 4);
    if (center) {
      this.sun.position.set(center.x + lightDir.x * 150, center.y + lightDir.y * 150, center.z + lightDir.z * 150);
      this.sun.target.position.copy(center);
      this.dome.position.copy(G.camera.position);
    }
    // フォグ
    const fog = G.scene.fog;
    const fc = s.fog.clone().lerp(grey, cloud * 0.6);
    let near = 120, far = G.settings.viewDist;
    if (W) { near *= 1 - W.rain * 0.6; far *= 1 - W.rain * 0.45; }
    if (this.indoor) { fc.setHex(0x0c1420); near = 30; far = 140; }
    if (G.lostFog) { near = G.U.lerp(near, 4, G.lostFog); far = G.U.lerp(far, 40, G.lostFog); fc.lerp(new THREE.Color(0xd0d8d0), G.lostFog); }
    fog.color.copy(fc); fog.near = near; fog.far = far;
    G.renderer.setClearColor(fc);
    this.cloudMat.color.copy(new THREE.Color(0xffffff).lerp(s.sunCol, 0.3).multiplyScalar(0.4 + (1 - night) * 0.6)).lerp(grey, cloud * 0.5);
    this.cloudMat.emissive.setHex(night > 0.5 ? 0x0a0f1a : 0x2a3340);
    this.updateClouds(dt);
    this.clouds.visible = !this.indoor;
    this.dome.visible = !this.indoor;
    if (this.indoor) { this.sun.intensity = 0.55; this.hemi.intensity = 0.55; this.hemi.color.setHex(0x9ad8ff); this.hemi.groundColor.setHex(0x203040); this.sun.color.setHex(0xcfeaff); }
  },
  clockText() { const h = Math.floor(this.time), m = Math.floor((this.time - h) * 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; },
};
