// ===== 水面・溶岩 =====
'use strict';
G.Water = {
  init(scene) {
    const fogU = () => ({ uFogColor: { value: new THREE.Color() }, uFogNear: { value: 100 }, uFogFar: { value: 800 } });
    this.u = Object.assign({
      uHeight: { value: G.Terrain.heightTex }, uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) },
      uLight: { value: 1 }, uShallow: { value: new THREE.Color(0x4fc4cf) }, uDeep: { value: new THREE.Color(0x1d5f8c) },
    }, fogU());
    const common = `
      uniform sampler2D uHeight; uniform float uTime; uniform vec3 uSunDir, uSunCol, uFogColor, uShallow, uDeep; uniform float uFogNear, uFogFar, uLight;
      varying vec3 vPos;
      float decodeH(vec2 ij){ vec2 uv = (ij + 0.5) / 401.0; vec4 t = texture2D(uHeight, uv); return (t.r*65280.0 + t.g*255.0) / 65535.0 * 600.0 - 100.0; }
      float terrainH(vec2 p){ vec2 f = (p + 800.0) / 4.0; vec2 i = floor(f); vec2 t = f - i;
        float a = decodeH(i), b = decodeH(i + vec2(1.0,0.0)), c = decodeH(i + vec2(0.0,1.0)), d = decodeH(i + vec2(1.0,1.0));
        return mix(mix(a,b,t.x), mix(c,d,t.x), t.y); }
    `;
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false,
      vertexShader: `varying vec3 vPos; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: common + `
        void main(){
          float h = terrainH(vPos.xz); float depth = -h;
          if (depth < -0.3) discard;
          vec3 col = mix(uShallow, uDeep, smoothstep(0.5, 9.0, depth));
          float w1 = sin(vPos.x*0.35 + uTime*1.3) * cos(vPos.z*0.3 - uTime*1.1);
          float w2 = sin((vPos.x+vPos.z)*0.12 + uTime*0.7);
          vec3 n = normalize(vec3(w1*0.15 + w2*0.08, 1.0, cos(vPos.x*0.25+uTime)*0.12));
          vec3 v = normalize(cameraPosition - vPos);
          vec3 hv = normalize(uSunDir + v);
          float spec = pow(max(dot(n, hv), 0.0), 90.0);
          col *= uLight;
          col += uSunCol * step(0.55, spec) * 0.7 * uLight;
          float stripe = step(0.93, sin(vPos.x*0.6 + w1*3.0 + uTime) * sin(vPos.z*0.5 - uTime*0.8));
          col += vec3(0.25) * stripe * smoothstep(1.0, 4.0, depth) * uLight;
          float foam = step(depth, 0.45 + 0.25*sin(uTime*2.0 + vPos.x*0.5 + vPos.z*0.3));
          col = mix(col, vec3(0.95,0.98,1.0) * (0.5 + 0.5*uLight), foam*0.85);
          float fres = pow(1.0 - max(v.y, 0.0), 3.0);
          col = mix(col, uFogColor, fres*0.35);
          float a = mix(0.55, 0.88, smoothstep(0.0, 5.0, depth)); a = max(a, foam*0.9);
          float fd = length(cameraPosition - vPos);
          col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, fd));
          gl_FragColor = vec4(col, a);
        }`,
    });
    const geo = new THREE.PlaneGeometry(1600, 1600, 1, 1); geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.position.y = G.WATER_Y; this.mesh.renderOrder = 2;
    scene.add(this.mesh);
    // 溶岩
    const L = G.World.lava;
    this.lu = Object.assign({ uTime: { value: 0 } }, fogU());
    const lmat = new THREE.ShaderMaterial({
      uniforms: this.lu,
      vertexShader: `varying vec3 vPos; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime; uniform vec3 uFogColor; uniform float uFogNear, uFogFar; varying vec3 vPos;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        void main(){ vec2 p = vPos.xz*0.15; float n = noise(p + vec2(uTime*0.2, uTime*0.1)) * 0.6 + noise(p*2.3 - uTime*0.15)*0.4;
          vec3 col = mix(vec3(0.75,0.12,0.02), vec3(1.0,0.75,0.2), smoothstep(0.45, 0.8, n));
          col = mix(col, vec3(1.0,0.95,0.6), step(0.82, n));
          float fd = length(cameraPosition - vPos); col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, fd)*0.7);
          gl_FragColor = vec4(col, 1.0); }`,
    });
    const lgeo = new THREE.CircleGeometry(L.r, 40); lgeo.rotateX(-Math.PI / 2);
    this.lava = new THREE.Mesh(lgeo, lmat); this.lava.position.set(L.x, L.y, L.z);
    scene.add(this.lava);
    this.lavaLight = new THREE.PointLight(0xff6a20, 2, 120); this.lavaLight.position.set(L.x, L.y + 15, L.z); scene.add(this.lavaLight);
  },
  update(dt) {
    this.u.uTime.value += dt; this.lu.uTime.value += dt;
    const f = G.scene.fog;
    for (const u of [this.u, this.lu]) { u.uFogColor.value.copy(f.color); u.uFogNear.value = f.near; u.uFogFar.value = f.far; }
    this.u.uSunDir.value.copy(G.Sky.uniforms.uSunDir.value.y > -0.05 ? G.Sky.uniforms.uSunDir.value : G.Sky.uniforms.uMoonDir.value);
    this.u.uSunCol.value.copy(G.Sky.sun.color);
    this.u.uLight.value = G.U.clamp(G.Sky.hemi.intensity * 1.3, 0.25, 1.1);
    this.lavaLight.intensity = 1.6 + Math.sin(this.lu.uTime.value * 3) * 0.3;
  },
  depthAt(x, z) { return G.WATER_Y - G.Terrain.getHeight(x, z); },
  inLava(x, z, y) { const L = G.World.lava; return Math.hypot(x - L.x, z - L.z) < L.r && y < L.y + 0.4 && G.Terrain.getHeight(x, z) < L.y; },
};
