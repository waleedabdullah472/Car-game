/* The world: six-lane road that scrolls under the player, scenery that is recycled in cells,
   sky shader with sun, moon and stars, and the day and night colour blending. */
(function (FG) {
  'use strict';
  var T = THREE, TAU = FG.TAU, clamp = FG.clamp, lerp = FG.lerp, hash = FG.hash;

  /* ---------- canvas textures ---------- */
  function canvasTex(w, h, draw, repeat) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    return t;
  }

  function roadTexture() {
    // 26 m wide, 13 m long per tile at 39.4 px per metre.
    return canvasTex(1024, 512, function (g, w, h) {
      var ppm = w / 26, X = function (m) { return (m + 13) * ppm; }, i;
      g.fillStyle = '#3b4048'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2d3239'; g.fillRect(X(-10.8), 0, 21.6 * ppm, h);
      for (i = 0; i < 2600; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.09)';
        g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      g.fillStyle = 'rgba(0,0,0,0.10)';
      FG.LANES.forEach(function (lx) { g.fillRect(X(lx - 1.0), 0, 0.5 * ppm, h); g.fillRect(X(lx + 0.5), 0, 0.5 * ppm, h); });
      g.fillStyle = '#e8ecef';
      g.fillRect(X(-10.45) - 0.09 * ppm, 0, 0.18 * ppm, h);
      g.fillRect(X(10.45) - 0.09 * ppm, 0, 0.18 * ppm, h);
      [-7.2, -3.6, 3.6, 7.2].forEach(function (lx) { g.fillRect(X(lx) - 0.07 * ppm, 0, 0.14 * ppm, 4 * ppm); });
      g.fillStyle = '#f0b54a';
      g.fillRect(X(-0.22) - 0.06 * ppm, 0, 0.12 * ppm, h);
      g.fillRect(X(0.22) - 0.06 * ppm, 0, 0.12 * ppm, h);
    });
  }
  function grassTexture() {
    return canvasTex(256, 256, function (g, w, h) {
      g.fillStyle = '#5c8a4c'; g.fillRect(0, 0, w, h);
      var i;
      for (i = 0; i < 70; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(125,160,80,0.18)' : 'rgba(40,80,50,0.20)';
        g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 26, 5 + Math.random() * 16, Math.random() * 3, 0, TAU); g.fill();
      }
      for (i = 0; i < 700; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
        g.fillRect(Math.random() * w, Math.random() * h, 1, 2 + Math.random() * 3);
      }
    }, [30, 30]);
  }
  function glowTexture() {
    return canvasTex(64, 64, function (g) {
      var r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,205,130,0.9)'); r.addColorStop(0.5, 'rgba(255,190,110,0.28)'); r.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    });
  }
  function cloudTexture() {
    return canvasTex(128, 64, function (g) {
      for (var i = 0; i < 9; i++) {
        var x = 24 + i * 10 + Math.random() * 8, y = 34 + Math.random() * 8 - Math.abs(i - 4) * 2, r = 12 + Math.random() * 10;
        var gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 128, 64);
      }
    });
  }
  function signTexture() {
    return canvasTex(1024, 256, function (g, w, h) {
      g.fillStyle = '#0f6b46'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f2f4f6'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = '#f2f4f6'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 108px Unbounded, Arial, sans-serif';
      var gr = g.createLinearGradient(0, h * 0.2, w, h * 0.6); gr.addColorStop(0, '#ffe3ec'); gr.addColorStop(0.5, '#ffc46b'); gr.addColorStop(1, '#ff9bb8');
      g.shadowColor = 'rgba(255,200,120,.6)'; g.shadowBlur = 18; g.fillStyle = gr; g.fillText('FARIYA EXPRESSWAY', w / 2, h * 0.42); g.shadowBlur = 0;
      g.font = '600 52px Figtree, Arial, sans-serif'; g.fillStyle = '#ffd6e2'; g.fillText('Drive safe, Fariya  ♥', w / 2, h * 0.76);
    });
  }

  /* ---------- recycled cell strips ---------- */
  var DUM = new T.Object3D(), COL = new T.Color();
  function Strip(N, cell, K, meshes, fill, back) {
    this.N = N; this.cell = cell; this.K = K; this.meshes = meshes; this.fill = fill;
    this.cells = new Array(N); this.back = back == null ? Math.floor(N * 0.25) : back;
    for (var i = 0; i < N; i++) this.cells[i] = null;
    meshes.forEach(function (m) { m.frustumCulled = false; });
  }
  /* put(meshIndex, slot, x, y, z(game), rotY, sx, sy, sz, hexColour?) */
  Strip.prototype.put = function (mi, slot, x, y, zg, ry, sx, sy, sz, col) {
    DUM.position.set(x, y, -zg); DUM.rotation.set(0, ry || 0, 0); DUM.scale.set(sx, sy, sz); DUM.updateMatrix();
    var m = this.meshes[mi];
    m.setMatrixAt(slot, DUM.matrix);
    if (col != null) { COL.set(col); m.setColorAt(slot, COL); }
  };
  Strip.prototype.update = function (z) {
    var c0 = Math.floor(z / this.cell) - this.back, N = this.N, dirty = false;
    for (var i = 0; i < N; i++) {
      var c = c0 + i, s = ((c % N) + N) % N;
      if (this.cells[s] !== c) {
        this.cells[s] = c; dirty = true;
        for (var k = 0; k < this.K; k++) this.fill(this, c, k, s * this.K + k);
      }
    }
    if (dirty) this.meshes.forEach(function (m) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  };
  function inst(geo, mat, count) {
    var m = new T.InstancedMesh(geo, mat, count);
    for (var i = 0; i < count; i++) { DUM.position.set(0, -50, 0); DUM.scale.set(0, 0, 0); DUM.updateMatrix(); m.setMatrixAt(i, DUM.matrix); }
    return m;
  }

  /* ---------- palettes ---------- */
  var C = function (h) { return new T.Color(h); };
  var P = {
    dayTop: C(0x3d82d2), dayHor: C(0xbcdcf3), duskTop: C(0x34406f), duskHor: C(0xf29a5a),
    nightTop: C(0x050a18), nightHor: C(0x15223d),
    mtDay: C(0x7596ad), mtNight: C(0x0f1a2c), cloudDay: C(0xffffff), cloudNight: C(0x2a3a58),
    lampOn: C(0xffe2a0), lampOff: C(0x8a9097)
  };

  FG.createWorld = function (scene, renderer) {
    var W = { night: 0, name: 'Day', fogNear: 120, fogFar: 340 };
    var aniso = renderer && renderer.capabilities ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;

    scene.fog = new T.Fog(0xbcdcf3, W.fogNear, W.fogFar);
    scene.background = new T.Color(0xbcdcf3);

    // lights
    var hemi = new T.HemisphereLight(0xdfeeff, 0x4a6a40, 0.9); scene.add(hemi);
    var sun = new T.DirectionalLight(0xffffff, 0.9); sun.position.set(30, 60, -20); scene.add(sun); scene.add(sun.target);

    // sky dome
    var skyMat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new T.Color() }, hor: { value: new T.Color() }, sunDir: { value: new T.Vector3(0, 1, 0) },
        sunCol: { value: new T.Color(1, 0.85, 0.6) }, moonDir: { value: new T.Vector3(0, -1, 0) }, night: { value: 0 }
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform vec3 moonDir; uniform float night; varying vec3 vDir;',
        'float h3(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }',
        'void main(){ vec3 d = normalize(vDir); float y = clamp(d.y,0.0,1.0);',
        ' vec3 col = mix(hor, top, pow(y,0.55));',
        ' float sd = max(dot(d,sunDir),0.0);',
        ' col += sunCol*(pow(sd,700.0)*3.0 + pow(sd,10.0)*0.32);',
        ' float md = dot(d,moonDir);',
        ' col += vec3(0.92,0.95,1.0)*smoothstep(0.9990,0.9994,md)*night*1.3;',
        ' col += vec3(0.45,0.55,0.9)*pow(max(md,0.0),24.0)*0.10*night;',
        ' float s = step(0.9978, h3(floor(d*300.0)));',
        ' col += vec3(s)*night*night*smoothstep(0.06,0.35,d.y)*0.8;',
        ' gl_FragColor = vec4(col,1.0); }'
      ].join('\n')
    });
    var sky = new T.Mesh(new T.SphereGeometry(600, 24, 14), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

    // clouds
    var cloudMat = new T.SpriteMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, fog: false, opacity: 0.85 });
    var clouds = [];
    for (var ci = 0; ci < 12; ci++) {
      var sp = new T.Sprite(cloudMat); sp.scale.set(120 + Math.random() * 90, 50 + Math.random() * 30, 1);
      sp.userData = { ox: (Math.random() * 2 - 1) * 380, oy: 110 + Math.random() * 70, oz: -Math.random() * 700 + 120 };
      clouds.push(sp); scene.add(sp);
    }

    // ground and road
    var grassTex = grassTexture(); grassTex.anisotropy = aniso;
    var groundMat = new T.MeshLambertMaterial({ map: grassTex, color: 0xffffff });
    var ground = new T.Mesh(new T.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), groundMat); scene.add(ground);
    var roadTex = roadTexture(); roadTex.anisotropy = aniso; roadTex.repeat.set(1, 700 / 13);
    // polygonOffset keeps the road in front of the ground even on low-precision depth buffers
    var roadMat = new T.MeshLambertMaterial({ map: roadTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    var road = new T.Mesh(new T.PlaneGeometry(26, 700).rotateX(-Math.PI / 2), roadMat); road.position.y = 0.03; scene.add(road);

    // guardrail beams follow the player, posts are recycled in cells
    var railMat = new T.MeshLambertMaterial({ color: 0xc9d0d6 });
    var rails = [-1, 1].map(function (s) {
      var m = new T.Mesh(new T.BoxGeometry(0.12, 0.34, 700), railMat); m.position.set(s * FG.RAIL, 0.62, 0); scene.add(m); return m;
    });
    var postMat = new T.MeshLambertMaterial({ color: 0x59616a });
    var postMesh = inst(new T.BoxGeometry(0.14, 0.7, 0.14).translate(0, 0.35, 0), postMat, 200); scene.add(postMesh);
    var postStrip = new Strip(100, 4, 2, [postMesh], function (st, c, k, slot) {
      st.put(0, slot, (k ? 1 : -1) * (FG.RAIL + 0.02), 0, c * 4 + 1, 0, 1, 1, 1);
    }, 12);

    // trees
    var trunkGeo = new T.CylinderGeometry(0.22, 0.34, 1.8, 6).translate(0, 0.9, 0);
    var coneGeo = new T.ConeGeometry(1.7, 5.0, 7).translate(0, 4.0, 0);
    var blobGeo = new T.IcosahedronGeometry(1.9, 0).translate(0, 3.6, 0);
    var leafMat = new T.MeshLambertMaterial({ color: 0xffffff });
    var trunkMat = new T.MeshLambertMaterial({ color: 0x5b4330 });
    var KT = 6, NT = 24;
    var tTrunk = inst(trunkGeo, trunkMat, NT * KT), tCone = inst(coneGeo, leafMat, NT * KT), tBlob = inst(blobGeo, leafMat, NT * KT);
    [tTrunk, tCone, tBlob].forEach(function (m) { scene.add(m); });
    var greens = [0x2f6b3c, 0x3b7d45, 0x28583a, 0x4a8a4a, 0x2d5f3a];
    var treeStrip = new Strip(NT, 22, KT, [tTrunk, tCone, tBlob], function (st, c, k, slot) {
      var side = k < 3 ? -1 : 1, id = c * 17 + k * 5 + (side > 0 ? 3 : 0);
      var x = side * (17 + hash(id, 1) * 32), z = c * 22 + hash(id, 2) * 22, sc = 0.8 + hash(id, 3) * 0.9;
      var col = greens[Math.floor(hash(id, 4) * greens.length)], pine = hash(id, 5) < 0.55;
      st.put(0, slot, x, 0, z, 0, sc, sc, sc);
      if (pine) { st.put(1, slot, x, 0, z, hash(id, 6) * 6, sc, sc, sc, col); st.put(2, slot, x, -60, z, 0, 0, 0, 0, col); }
      else { st.put(1, slot, x, -60, z, 0, 0, 0, 0, col); st.put(2, slot, x, 0, z, hash(id, 6) * 6, sc, sc * 0.9, sc, col); }
    }, 5);

    // houses (small blocks with a roof slab)
    var KH = 2, NH = 12;
    var hBody = inst(new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new T.MeshLambertMaterial({ color: 0xffffff }), NH * KH);
    var hRoof = inst(new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new T.MeshLambertMaterial({ color: 0xffffff }), NH * KH);
    scene.add(hBody); scene.add(hRoof);
    var walls = [0xe9dcc3, 0xd9b99a, 0xcfd6dc, 0xe8c9c0, 0xc9d8c2], roofs = [0x8a4b3a, 0x6b4a3a, 0x59616b];
    var houseStrip = new Strip(NH, 60, KH, [hBody, hRoof], function (st, c, k, slot) {
      var id = c * 31 + k * 7, side = k ? 1 : -1;
      if (hash(id, 1) < 0.45) { st.put(0, slot, 0, -80, 0, 0, 0, 0, 0); st.put(1, slot, 0, -80, 0, 0, 0, 0, 0); return; }
      var w = 6 + hash(id, 2) * 6, h = 4 + hash(id, 3) * 4, d = 6 + hash(id, 4) * 6;
      var x = side * (24 + hash(id, 5) * 36), z = c * 60 + hash(id, 6) * 50;
      st.put(0, slot, x, 0, z, 0, w, h, d, walls[Math.floor(hash(id, 7) * walls.length)]);
      st.put(1, slot, x, h, z, 0, w + 0.6, 0.6, d + 0.6, roofs[Math.floor(hash(id, 8) * roofs.length)]);
    }, 2);

    // mountains on the horizon (never fogged, tinted by time of day)
    var mtMat = new T.MeshBasicMaterial({ color: 0x7596ad, fog: false });
    var NM = 9, mtMesh = inst(new T.ConeGeometry(1, 1, 5), mtMat, NM * 2); scene.add(mtMesh);
    var mtStrip = new Strip(NM, 120, 2, [mtMesh], function (st, c, k, slot) {
      var id = c * 13 + k * 3, side = k ? 1 : -1, r = 55 + hash(id, 1) * 60, h = 45 + hash(id, 2) * 75;
      st.put(0, slot, side * (260 + hash(id, 3) * 140), h / 2 - 4, c * 120 + hash(id, 4) * 100, hash(id, 5) * 3, r, h, r);
    }, 3);

    // lamp posts with glow pools on the road
    var lampMat = new T.MeshLambertMaterial({ color: 0x59616a });
    var headMat = new T.MeshBasicMaterial({ color: 0x8a9097 });
    var glowMat = new T.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    glowMat.visible = false;
    var NL = 16, KL = 2;
    var lPole = inst(new T.CylinderGeometry(0.1, 0.15, 8.4, 6).translate(0, 4.2, 0), lampMat, NL * KL);
    var lArm = inst(new T.BoxGeometry(3.6, 0.14, 0.14).translate(1.8, 8.4, 0), lampMat, NL * KL);
    var lHead = inst(new T.BoxGeometry(0.95, 0.18, 0.5).translate(3.4, 8.28, 0), headMat, NL * KL);
    var lPool = inst(new T.PlaneGeometry(16, 16).rotateX(-Math.PI / 2).translate(0, 0.05, 0), glowMat, NL * KL);
    [lPole, lArm, lHead, lPool].forEach(function (m) { scene.add(m); });
    var lampStrip = new Strip(NL, 30, KL, [lPole, lArm, lHead, lPool], function (st, c, k, slot) {
      var side = k ? 1 : -1, z = c * 30 + (k ? 22 : 7), x = side * 14.3, ry = k ? Math.PI : 0;
      st.put(0, slot, x, 0, z, ry, 1, 1, 1); st.put(1, slot, x, 0, z, ry, 1, 1, 1); st.put(2, slot, x, 0, z, ry, 1, 1, 1);
      st.put(3, slot, side * 9.6, 0, z, 0, 1, 1, 1);
    }, 4);

    // overhead sign gantries
    var gantMat = new T.MeshLambertMaterial({ color: 0x6f7780 });
    var signMat = new T.MeshBasicMaterial({ map: signTexture() });
    var gantries = [0, 1].map(function () {
      var g = new T.Group();
      [-1, 1].forEach(function (s) {
        var p = new T.Mesh(new T.BoxGeometry(0.5, 7.4, 0.5), gantMat); p.position.set(s * 14.6, 3.7, 0); g.add(p);
      });
      var beam = new T.Mesh(new T.BoxGeometry(29.6, 0.5, 0.5), gantMat); beam.position.set(0, 7.2, 0); g.add(beam);
      var sign = new T.Mesh(new T.PlaneGeometry(9, 2.25), signMat); sign.position.set(-5, 5.9, 0.3); g.add(sign);
      var back = new T.Mesh(new T.BoxGeometry(9.1, 2.35, 0.12), gantMat); back.position.set(-5, 5.9, -0.1); g.add(back);
      scene.add(g); return g;
    });

    var tmpC = new T.Color(), tmpD = new T.Vector3();

    /* Call every frame. zP is how far the player has driven, cam is the active camera. */
    W.update = function (zP, cam, tod) {
      var h = tod.h, night = tod.night;
      W.night = night; W.name = tod.name;
      var day = FG.smooth(-0.12, 0.45, h), dusk = 1 - FG.smooth(0.04, 0.5, Math.abs(h));

      // sky colours
      var top = skyMat.uniforms.top.value.copy(P.nightTop).lerp(P.dayTop, day).lerp(P.duskTop, dusk * 0.55);
      var hor = skyMat.uniforms.hor.value.copy(P.nightHor).lerp(P.dayHor, day).lerp(P.duskHor, dusk * 0.9);
      var a = tod.u * TAU;
      tmpD.set(Math.cos(a) * 0.9, Math.sin(a), -0.45).normalize();
      skyMat.uniforms.sunDir.value.copy(tmpD);
      skyMat.uniforms.moonDir.value.set(-tmpD.x, -tmpD.y, -0.5).normalize();
      skyMat.uniforms.night.value = night;
      skyMat.uniforms.sunCol.value.setRGB(1, 0.78 + 0.2 * day, 0.5 + 0.4 * day).multiplyScalar(1 - night);
      sky.position.copy(cam.position);
      scene.background.copy(hor);
      scene.fog.color.copy(hor); scene.fog.near = W.fogNear; scene.fog.far = W.fogFar;

      // lights
      hemi.color.copy(top).lerp(P.dayHor, 0.35 * day); hemi.groundColor.setRGB(0.25, 0.36, 0.22).multiplyScalar(0.35 + 0.65 * (1 - night));
      hemi.intensity = 0.34 + 0.62 * (1 - night);
      var sunUp = FG.smooth(-0.05, 0.3, h);
      if (sunUp > 0.02) { sun.position.copy(tmpD).multiplyScalar(80); sun.intensity = 0.95 * sunUp; sun.color.setRGB(1, 0.82 + 0.18 * day, 0.62 + 0.38 * day); }
      else { sun.position.set(-tmpD.x * 60, 60, -20); sun.intensity = 0.34 * night; sun.color.setRGB(0.6, 0.7, 1); }
      sun.target.position.set(0, 0, -zP);

      // follow the player
      ground.position.z = -zP; roadTex.offset.y = zP / 13; grassTex.offset.y = zP / 30;
      road.position.z = -zP;
      rails.forEach(function (r) { r.position.z = -zP; });
      mtMat.color.copy(P.mtNight).lerp(P.mtDay, 1 - night).lerp(P.duskHor, dusk * 0.3);

      // lamps
      tmpC.copy(P.lampOff).lerp(P.lampOn, FG.smooth(0.05, 0.4, night));
      headMat.color.copy(tmpC);
      glowMat.visible = night > 0.04; glowMat.opacity = 0.55 * FG.smooth(0.05, 0.6, night);

      // headlight cones and tail glow on all vehicles
      FG.M.cone.visible = night > 0.05; FG.M.cone.opacity = 0.9 * FG.smooth(0.05, 0.7, night);
      FG.M.tailGlow.opacity = 0.2 + 0.3 * night;

      // clouds drift slowly and fade at night
      cloudMat.opacity = 0.85 - 0.45 * night; cloudMat.color.copy(P.cloudNight).lerp(P.cloudDay, 1 - night).lerp(P.duskHor, dusk * 0.35);
      clouds.forEach(function (c) { c.position.set(cam.position.x + c.userData.ox, c.userData.oy, -zP + c.userData.oz); });

      // recycled strips
      postStrip.update(zP); treeStrip.update(zP); houseStrip.update(zP); mtStrip.update(zP); lampStrip.update(zP);

      // gantries every 700 m
      var k0 = Math.ceil((zP - 30) / 700);
      gantries[0].position.z = -(k0 * 700 + 350); gantries[1].position.z = -((k0 + 1) * 700 + 350);
    };

    W.setFog = function (near, far) { W.fogNear = near; W.fogFar = far; };
    return W;
  };
})(window.FG);
