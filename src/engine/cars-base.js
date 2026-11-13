/* Car building blocks: materials, rounded extrusions, wheels, shadows, headlight cones,
   and the assembler that turns a spec into a finished car with glass, wheels and lights.
   Car local axes: +x right, +y up, -z is the nose. */
(function (FG) {
  'use strict';
  var T = THREE;

  /* ---------- materials ---------- */
  var paintCache = {};
  var M = FG.M = {
    glass: new T.MeshPhongMaterial({ color: 0x0f1c28, specular: 0x9fb4c6, shininess: 140 }),
    tire: new T.MeshLambertMaterial({ color: 0x0b0c0e }),
    rimDark: new T.MeshPhongMaterial({ color: 0x23282e, shininess: 40 }),
    rim: new T.MeshPhongMaterial({ color: 0xcfd6dd, shininess: 100, specular: 0xffffff }),
    black: new T.MeshLambertMaterial({ color: 0x14161a }),
    trim: new T.MeshPhongMaterial({ color: 0x1b1e23, shininess: 30 }),
    chrome: new T.MeshPhongMaterial({ color: 0xdfe5ea, shininess: 130, specular: 0xffffff }),
    head: new T.MeshBasicMaterial({ color: 0xfff3cc }),
    tailBase: new T.MeshBasicMaterial({ color: 0x8e1a1e }),
    plate: new T.MeshLambertMaterial({ color: 0xf2f2ea }),
    arch: new T.MeshBasicMaterial({ color: 0x07080a }),
    paint: function (hex) {
      if (!paintCache[hex]) paintCache[hex] = new T.MeshPhongMaterial({ color: hex, shininess: 75, specular: 0x555555 });
      return paintCache[hex];
    }
  };

  /* Soft blob shadow and headlight cone share two canvas textures. */
  function blobTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(c);
  }
  function coneTexture() {
    var c = document.createElement('canvas'); c.width = 64; c.height = 128;
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 128, 0, 0);
    g.addColorStop(0, 'rgba(255,240,190,0.85)'); g.addColorStop(0.5, 'rgba(255,240,190,0.28)'); g.addColorStop(1, 'rgba(255,240,190,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 128);
    var m = x.createLinearGradient(0, 0, 64, 0);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.3, 'rgba(0,0,0,0)'); m.addColorStop(0.7, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = m; x.fillRect(0, 0, 64, 128);
    return new T.CanvasTexture(c);
  }
  var PO = { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 };
  M.shadow = new T.MeshBasicMaterial(Object.assign({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.8 }, PO));
  M.cone = new T.MeshBasicMaterial(Object.assign({ map: coneTexture(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.9, side: T.DoubleSide }, PO));
  M.cone.visible = false;
  M.tailGlow = new T.MeshBasicMaterial(Object.assign({ color: 0xff2a22, transparent: true, opacity: 0.0, depthWrite: false, blending: T.AdditiveBlending }, PO));

  var shadowGeo = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  var coneGeo = (function () {
    var g = new T.PlaneGeometry(1, 1);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * 2.4);
    g.rotateX(-Math.PI / 2);
    return g;
  })();

  /* ---------- geometry helpers ---------- */
  var boxCache = {};
  FG.box = function (w, h, d, mat, x, y, z) {
    var key = w.toFixed(3) + '|' + h.toFixed(3) + '|' + d.toFixed(3);
    var g = boxCache[key] || (boxCache[key] = new T.BoxGeometry(w, h, d));
    var m = new T.Mesh(g, mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  };
  M.signLit = new T.MeshBasicMaterial({ color: 0xf0b54a });
  M.crate = new T.MeshPhongMaterial({ color: 0xc9b184, shininess: 10 });

  /* Polygon with rounded corners. rad[i] is how far along the neighbouring edges the curve starts. */
  FG.roundedShape = function (pts, rad) {
    var n = pts.length, s = new T.Shape(), i;
    function lp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    function corner(k) {
      var v = pts[k], p = pts[(k + n - 1) % n], q = pts[(k + 1) % n], r = rad[k] == null ? 0.2 : rad[k];
      return { v: v, a: lp(v, p, r), b: lp(v, q, r) };
    }
    var c0 = corner(0);
    s.moveTo(c0.b[0], c0.b[1]);
    for (i = 1; i < n; i++) {
      var c = corner(i);
      s.lineTo(c.a[0], c.a[1]);
      s.quadraticCurveTo(c.v[0], c.v[1], c.b[0], c.b[1]);
    }
    s.lineTo(c0.a[0], c0.a[1]);
    s.quadraticCurveTo(c0.v[0], c0.v[1], c0.b[0], c0.b[1]);
    return s;
  };

  /* Extrude a side profile (x = along the car, nose at +x) across the car width. */
  var extCache = {};
  FG.extrudeProfile = function (pts, rad, width, bevel) {
    bevel = bevel == null ? 0.07 : bevel;
    var key = JSON.stringify([pts, rad, width, bevel]);
    if (extCache[key]) return extCache[key];
    var depth = Math.max(0.05, width - 2 * bevel);
    var geo = new T.ExtrudeGeometry(FG.roundedShape(pts, rad), {
      depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 3, curveSegments: 7, steps: 1
    });
    geo.translate(0, 0, -depth / 2);
    geo.rotateY(Math.PI / 2);
    extCache[key] = geo;
    return geo;
  };

  /* ---------- wheels ---------- */
  var wheelGeo = {};
  FG.makeWheel = function (R, w) {
    var key = R + '|' + w;
    var gg = wheelGeo[key];
    if (!gg) {
      var tire = new T.CylinderGeometry(R, R, w, 22).rotateZ(Math.PI / 2);
      var disc = new T.CylinderGeometry(R * 0.64, R * 0.64, w * 1.02, 16).rotateZ(Math.PI / 2);
      var spoke = new T.BoxGeometry(w * 1.04, R * 1.12, R * 0.13);
      var arch = new T.CylinderGeometry(R + 0.07, R + 0.07, 0.03, 22).rotateZ(Math.PI / 2);
      gg = wheelGeo[key] = { tire: tire, disc: disc, spoke: spoke, arch: arch };
    }
    var pivot = new T.Group(), spin = new T.Group();
    spin.add(new T.Mesh(gg.tire, M.tire));
    spin.add(new T.Mesh(gg.disc, M.rimDark));
    for (var i = 0; i < 5; i++) {
      var sp = new T.Mesh(gg.spoke, M.rim);
      sp.rotation.x = i * Math.PI * 2 / 10;
      spin.add(sp);
    }
    pivot.add(spin);
    pivot.userData = { spin: spin };
    return { pivot: pivot, spin: spin, archGeo: gg.arch };
  };

  /* ---------- assembler for cars built from a side profile ---------- */
  FG.assembleCar = function (s, colorHex) {
    var G = new T.Group();
    var U = G.userData = { wheels: [], tails: [], L: s.L, W: s.W, H: s.cab.roof, type: s.type, paint: null };
    var paint = M.paint(colorHex), L2 = s.L / 2, cb = s.cab, i, m;
    U.paint = paint;

    // lower body
    var low = s.low || [[-L2, s.g], [-L2, s.hTail], [s.xDeck, s.hBelt], [s.xWS + 0.03, s.hBelt], [L2 - s.nose, s.hHood], [L2, s.hNose], [L2, s.g]];
    var lowRad = s.lowRad || [0.10, 0.16, 0.30, 0.30, 0.38, 0.22, 0.10];
    G.add(new T.Mesh(FG.extrudeProfile(low, lowRad, s.W, 0.08), paint));

    // cabin: glass body, paint roof, pillars
    var Wc = s.W * (s.cabW || 0.86), b0 = s.hBelt - 0.03;
    var cab = [[cb.rb, b0], [cb.rt, cb.roof], [cb.ft, cb.roof], [cb.fb, b0]];
    G.add(new T.Mesh(FG.extrudeProfile(cab, s.cabRad || [0.05, 0.22, 0.22, 0.06], Wc, 0.04), M.glass));
    var rl = Math.abs(cb.ft - cb.rt);
    m = FG.box(Wc * 0.95, 0.06, rl + 0.06, paint, 0, cb.roof + 0.045, -(cb.ft + cb.rt) / 2);
    G.add(m);
    var cx = (cb.rt + cb.ft) / 2;
    G.add(FG.box(Wc + 0.012, cb.roof - s.hBelt, 0.09, paint, 0, (cb.roof + s.hBelt) / 2, -cx - (s.pillarShift || 0)));
    if (s.cPillar) G.add(FG.box(Wc + 0.012, cb.roof - s.hBelt, 0.10, paint, 0, (cb.roof + s.hBelt) / 2, -(cb.rt + 0.12)));
    if (s.rails) {
      [-1, 1].forEach(function (k) { G.add(FG.box(0.05, 0.05, rl * 0.9, M.black, k * Wc * 0.42, cb.roof + 0.1, -cx)); });
    }
    [-1, 1].forEach(function (k) {
      G.add(FG.box(0.11, 0.10, 0.2, paint, k * (Wc / 2 + 0.1), s.hBelt + 0.08, -(cb.fb - 0.12)));
    });

    // bumpers, plates, grille
    G.add(FG.box(s.W * 0.95, 0.15, 0.12, M.trim, 0, s.g + 0.10, -L2 + 0.0));
    G.add(FG.box(s.W * 0.95, 0.15, 0.12, M.trim, 0, s.g + 0.10, L2 + 0.0));
    G.add(FG.box(s.W * 0.46, 0.11, 0.05, M.black, 0, s.hNose - 0.2, -L2 - 0.085));
    G.add(FG.box(0.5, 0.12, 0.03, M.plate, 0, s.g + 0.32, L2 + 0.095));
    G.add(FG.box(0.5, 0.12, 0.03, M.plate, 0, s.g + 0.30, -L2 - 0.095));

    // lights
    var hx = s.W / 2 - 0.32, hy = s.hNose - 0.07;
    [-1, 1].forEach(function (k) {
      G.add(FG.box(0.40, 0.11, 0.05, M.head, k * hx, hy, -L2 - 0.085));
      var t = FG.box(0.50, 0.10, 0.05, M.tailBase, k * (s.W / 2 - 0.34), s.hTail - (s.tailDrop || 0.1), L2 + 0.085);
      t.userData.tail = true; U.tails.push(t); G.add(t);
    });

    // wheels
    var R = s.wheelR || 0.33, tw = s.tireW || 0.26, wx = s.W / 2 - tw / 2 + 0.03;
    [[-1, s.axleF, true], [1, s.axleF, true], [-1, s.axleR, false], [1, s.axleR, false]].forEach(function (a) {
      var w = FG.makeWheel(R, tw);
      w.pivot.position.set(a[0] * wx, R, -a[1]);
      G.add(w.pivot);
      var ar = new T.Mesh(w.archGeo, M.arch);
      ar.position.set(a[0] * (s.W / 2 + 0.005), R, -a[1]);
      G.add(ar);
      U.wheels.push({ pivot: w.pivot, spin: w.spin, front: a[2], R: R });
    });

    if (s.spoiler) {
      G.add(FG.box(s.W * 0.92, 0.07, 0.34, M.trim, 0, s.hTail + 0.2, L2 - 0.3));
      [-1, 1].forEach(function (k) { G.add(FG.box(0.06, 0.2, 0.2, M.trim, k * s.W * 0.34, s.hTail + 0.08, L2 - 0.3)); });
    }
    if (s.stripes) {
      [-0.16, 0.16].forEach(function (x) {
        G.add(FG.box(0.15, 0.012, s.L * 0.34, M.chrome, x, s.hHood + 0.085, -(L2 - s.L * 0.20)));
        G.add(FG.box(0.15, 0.012, rl, M.chrome, x, cb.roof + 0.078, -cx));
        G.add(FG.box(0.15, 0.012, s.L * 0.26, M.chrome, x, s.hTail + 0.075, L2 - s.L * 0.16));
      });
    }
    if (s.sign) {
      G.add(FG.box(0.62, 0.17, 0.26, M.plate, 0, cb.roof + 0.17, -cx));
      G.add(FG.box(0.5, 0.03, 0.2, M.signLit, 0, cb.roof + 0.265, -cx));
    }
    if (s.bed) {
      var bx0 = -L2 + 0.12, bx1 = cb.rb - 0.08, bl = bx1 - bx0;
      G.add(FG.box(s.W - 0.34, 0.05, bl, M.black, 0, s.hTail + 0.035, -(bx0 + bx1) / 2));
      if (s.load) {
        G.add(FG.box(0.9, 0.6, 0.9, M.crate, -0.3, s.hTail + 0.35, -(bx0 + 0.7)));
        G.add(FG.box(0.7, 0.45, 0.7, M.crate, 0.4, s.hTail + 0.28, -(bx0 + 1.3)));
      }
    }

    FG.addCarExtras(G, s);
    return G;
  };

  /* Shadow, headlight cone and tail glow added to every vehicle type. */
  FG.addCarExtras = function (G, s) {
    var sh = new T.Mesh(shadowGeo, M.shadow);
    sh.scale.set(s.W + 0.9, 1, s.L + 0.9); sh.position.y = 0.025; sh.renderOrder = 1;
    G.add(sh);
    var cone = new T.Mesh(coneGeo, M.cone);
    cone.scale.set(s.W * 0.95, 1, 20); cone.position.set(0, 0.06, -s.L / 2 - 10); cone.renderOrder = 2;
    G.add(cone);
    var gl = new T.Mesh(shadowGeo, M.tailGlow);
    gl.scale.set(s.W + 0.6, 1, 6); gl.position.set(0, 0.07, s.L / 2 + 2.6); gl.renderOrder = 2; gl.visible = false;
    G.userData.glow = gl; G.add(gl);
    G.userData.cone = cone;
  };

  /* Give each placed car its own tail-light material so brake lights act per car. */
  FG.personalise = function (G) {
    G.userData.tails.forEach(function (t) { t.material = M.tailBase.clone(); });
    return G;
  };
})(window.FG);
