/* Vehicle catalogue. Profile-based cars use FG.assembleCar; rickshaw, bus and truck are hand built.
   Every vehicle returns a Group whose userData has: wheels, tails, glow, cone, L, W, H, type. */
(function (FG) {
  'use strict';
  var T = THREE, M = FG.M, box = FG.box;

  var SPECS = {
    sedan: {
      type: 'sedan', L: 4.6, W: 1.82, g: 0.22, hTail: 0.92, hBelt: 0.96, hHood: 0.84, hNose: 0.64, nose: 0.35,
      xDeck: -1.38, xWS: 0.62, cab: { rb: -1.22, rt: -0.55, ft: 0.12, fb: 0.62, roof: 1.44 },
      axleF: 1.42, axleR: -1.38, wheelR: 0.33, tireW: 0.26
    },
    hatch: {
      type: 'hatch', L: 3.9, W: 1.72, g: 0.22, hTail: 1.0, hBelt: 0.96, hHood: 0.82, hNose: 0.62, nose: 0.3,
      xDeck: -1.62, xWS: 0.5, cab: { rb: -1.8, rt: -1.64, ft: -0.02, fb: 0.5, roof: 1.5 }, cPillar: true,
      axleF: 1.2, axleR: -1.15, wheelR: 0.31, tireW: 0.24, tailDrop: 0.22, cabW: 0.88
    },
    suv: {
      type: 'suv', L: 4.75, W: 1.95, g: 0.3, hTail: 1.12, hBelt: 1.16, hHood: 1.0, hNose: 0.82, nose: 0.3,
      xDeck: -2.2, xWS: 0.76, cab: { rb: -2.24, rt: -2.12, ft: 0.35, fb: 0.78, roof: 1.84 }, cPillar: true, rails: true,
      axleF: 1.5, axleR: -1.4, wheelR: 0.38, tireW: 0.30, tailDrop: 0.2, cabW: 0.88
    },
    coupe: {
      type: 'coupe', L: 4.5, W: 1.92, g: 0.18, hTail: 0.92, hBelt: 0.86, hHood: 0.7, hNose: 0.5, nose: 0.5,
      xDeck: -1.3, xWS: 0.97, cab: { rb: -1.0, rt: -0.15, ft: 0.35, fb: 0.95, roof: 1.2 }, cabW: 0.84,
      axleF: 1.45, axleR: -1.35, wheelR: 0.35, tireW: 0.30, spoiler: true, stripes: true, tailDrop: 0.12
    },
    taxi: {
      type: 'taxi', L: 4.5, W: 1.8, g: 0.22, hTail: 0.92, hBelt: 0.96, hHood: 0.84, hNose: 0.64, nose: 0.35,
      xDeck: -1.35, xWS: 0.62, cab: { rb: -1.2, rt: -0.55, ft: 0.12, fb: 0.62, roof: 1.44 }, sign: true,
      axleF: 1.4, axleR: -1.35, wheelR: 0.32, tireW: 0.25
    },
    pickup: {
      type: 'pickup', L: 5.3, W: 1.95, g: 0.3, hTail: 1.05, hBelt: 1.2, hHood: 1.05, hNose: 0.85, nose: 0.4,
      xDeck: -0.5, xWS: 0.78, cab: { rb: -0.58, rt: -0.46, ft: 0.25, fb: 0.76, roof: 1.86 }, bed: true, cabW: 0.88,
      low: [[-2.65, 0.3], [-2.65, 1.05], [-0.66, 1.05], [-0.52, 1.2], [0.81, 1.2], [2.25, 1.05], [2.65, 0.85], [2.65, 0.3]],
      lowRad: [0.1, 0.1, 0.1, 0.12, 0.3, 0.38, 0.22, 0.1],
      axleF: 1.7, axleR: -1.62, wheelR: 0.38, tireW: 0.30, tailDrop: 0.12
    }
  };
  FG.SPECS = SPECS;

  FG.DIMS = {
    sedan: { L: 4.6, W: 1.82, H: 1.5 }, hatch: { L: 3.9, W: 1.72, H: 1.55 }, suv: { L: 4.75, W: 1.95, H: 1.9 },
    coupe: { L: 4.5, W: 1.92, H: 1.25 }, taxi: { L: 4.5, W: 1.8, H: 1.65 }, pickup: { L: 5.3, W: 1.95, H: 1.9 },
    rick: { L: 2.7, W: 1.44, H: 1.75 }, bus: { L: 10.8, W: 2.5, H: 3.1 }, truck: { L: 8.6, W: 2.45, H: 3.3 }
  };

  function finish(G, L, W, H, type) {
    var U = G.userData;
    U.L = L; U.W = W; U.H = H; U.type = type;
    return G;
  }
  function newBase() {
    var G = new T.Group();
    G.userData = { wheels: [], tails: [], L: 0, W: 0, H: 0, type: '' };
    return G;
  }
  function addWheel(G, side, x, R, tw, zf, front, xOut) {
    var w = FG.makeWheel(R, tw);
    w.pivot.position.set(side * xOut, R, -zf);
    G.add(w.pivot);
    var ar = new T.Mesh(w.archGeo, M.arch);
    ar.position.set(side * (xOut + tw / 2 - 0.02), R, -zf);
    G.userData.wheels.push({ pivot: w.pivot, spin: w.spin, front: !!front, R: R });
    return ar;
  }
  function headTail(G, W, yh, yt, L2, hx, tx) {
    [-1, 1].forEach(function (k) {
      G.add(box(0.36, 0.14, 0.05, M.head, k * hx, yh, -L2 - 0.02));
      var t = box(0.4, 0.14, 0.05, M.tailBase, k * tx, yt, L2 + 0.02);
      G.userData.tails.push(t); G.add(t);
    });
  }

  /* ---------- auto rickshaw ---------- */
  function buildRick(color, variant) {
    var G = newBase(), paint = M.paint(color), roofCol = M.paint(variant ? '#1f4d36' : '#1a1d22');
    var body = [[-1.3, 0.3], [-1.3, 0.92], [-0.1, 0.95], [0.55, 0.95], [1.0, 0.72], [1.25, 0.48], [1.25, 0.3]];
    G.add(new T.Mesh(FG.extrudeProfile(body, [0.1, 0.15, 0.2, 0.2, 0.4, 0.3, 0.1], 1.2, 0.07), paint));
    var roof = [[-1.34, 0.95], [-1.34, 1.66], [-0.2, 1.74], [0.2, 1.7], [0.52, 1.36], [0.52, 0.95]];
    G.add(new T.Mesh(FG.extrudeProfile(roof, [0.1, 0.18, 0.3, 0.3, 0.3, 0.1], 1.32, 0.05), roofCol));
    G.add(box(1.0, 0.5, 1.1, M.black, 0, 0.8, 0.55));
    var ws = box(1.14, 0.7, 0.05, M.glass, 0, 1.33, -0.41); ws.rotation.x = 0.5; G.add(ws);
    G.add(box(0.5, 0.1, 0.9, paint, 0, 0.64, -0.95));
    G.add(box(0.12, 0.12, 0.12, M.head, 0, 0.82, -1.3));
    G.add(box(0.5, 0.05, 0.05, M.black, 0, 1.0, -0.7));
    var tw = 0.16;
    G.add(addWheel(G, 0, 0, 0.26, tw, 0.95, true, 0));
    G.add(addWheel(G, -1, 0, 0.26, tw, -0.72, false, 0.62));
    G.add(addWheel(G, 1, 0, 0.26, tw, -0.72, false, 0.62));
    [-1, 1].forEach(function (k) {
      var t = box(0.2, 0.1, 0.04, M.tailBase, k * 0.46, 0.92, 1.36); G.userData.tails.push(t); G.add(t);
    });
    FG.addCarExtras(G, { W: 1.44, L: 2.7 });
    return finish(G, 2.7, 1.44, 1.75, 'rick');
  }

  /* ---------- bus ---------- */
  function buildBus(color, variant) {
    var G = newBase(), paint = M.paint(color), accent = M.paint(['#2f7fb8', '#d8402f', '#2f8a4f'][variant % 3]);
    var L = 10.8, W = 2.5, L2 = L / 2;
    var prof = [[-L2, 0.38], [-L2, 3.0], [L2 - 0.3, 3.05], [L2, 2.8], [L2, 0.38]];
    G.add(new T.Mesh(FG.extrudeProfile(prof, [0.04, 0.12, 0.12, 0.3, 0.04], W, 0.1), paint));
    G.add(box(W + 0.02, 0.28, L - 0.3, accent, 0, 1.0, 0));
    G.add(box(W + 0.02, 0.1, L - 0.3, accent, 0, 2.95, 0));
    G.add(box(W + 0.02, 0.9, L - 3.2, M.glass, 0, 2.05, 0.4));
    for (var i = -3; i <= 3; i++) G.add(box(W + 0.03, 1.0, 0.07, paint, 0, 2.05, 0.4 + i * 1.3));
    var ws = box(W * 0.92, 1.05, 0.05, M.glass, 0, 2.0, -L2 - 0.1); G.add(ws);
    G.add(box(W * 0.6, 0.22, 0.05, M.signLit, 0, 2.72, -L2 - 0.11));
    G.add(box(W * 0.8, 0.8, 0.05, M.glass, 0, 2.1, L2 + 0.1));
    G.add(box(1.5, 0.3, 3.2, M.paint('#c9ced3'), 0, 3.2, 0.5));
    G.add(box(W * 0.98, 0.16, 0.2, M.trim, 0, 0.45, -L2 + 0.02));
    G.add(box(W * 0.98, 0.16, 0.2, M.trim, 0, 0.45, L2 - 0.02));
    headTail(G, W, 0.62, 0.7, L2 + 0.08, 0.9, 0.95);
    G.add(box(0.5, 0.12, 0.03, M.plate, 0, 0.42, L2 + 0.13));
    var R = 0.52, tw = 0.34, xo = W / 2 - tw / 2 + 0.03;
    [[3.7, true], [-3.0, false], [-3.9, false]].forEach(function (a) {
      [-1, 1].forEach(function (k) { G.add(addWheel(G, k, 0, R, tw, a[0], a[1], xo)); });
    });
    FG.addCarExtras(G, { W: W, L: L });
    return finish(G, L, W, 3.1, 'bus');
  }

  /* ---------- truck with a tarp load ---------- */
  function buildTruck(color, variant) {
    var G = newBase(), paint = M.paint(color);
    var tarpCol = ['#5b6f4a', '#7a5d3b', '#3e5d7a', '#6a4a6a'][variant % 4];
    var tarp = M.paint(tarpCol);
    var L = 8.6, W = 2.45, L2 = L / 2;
    G.add(box(2.1, 0.45, L - 0.1, M.black, 0, 0.62, 0));
    G.add(box(W * 0.9, 0.45, 0.2, M.trim, 0, 0.72, L2 - 0.12));
    var cab = [[-1.1, 0.8], [-1.1, 3.1], [0.9, 3.1], [1.1, 2.9], [1.1, 0.8]];
    var cabG = FG.extrudeProfile(cab, [0.1, 0.14, 0.14, 0.2, 0.1], W, 0.1);
    var cabM = new T.Mesh(cabG, paint); cabM.position.z = -(L2 - 1.2); G.add(cabM);
    var ws = box(W * 0.88, 1.05, 0.05, M.glass, 0, 2.35, -L2 + 0.08); ws.rotation.x = -0.06; G.add(ws);
    G.add(box(W * 0.5, 0.3, 0.05, M.black, 0, 1.3, -L2 + 0.05));
    G.add(box(W * 0.6, 0.12, 0.05, M.chrome, 0, 1.08, -L2 + 0.04));
    var cargo = new T.Mesh(FG.extrudeProfile([[-2.95, 0.9], [-2.95, 3.3], [2.95, 3.3], [2.95, 0.9]], [0.05, 0.1, 0.1, 0.05], W, 0.1), tarp);
    cargo.position.z = 1.15; G.add(cargo);
    for (var i = -2; i <= 2; i++) G.add(box(W + 0.03, 0.05, 0.07, M.paint('#e7dcc0'), 0, 2.1, 1.15 + i * 1.3));
    ['#d8402f', '#f0b54a', '#3d9a5a', '#3f8fd0'].forEach(function (c, k) {
      G.add(box(W + 0.04, 0.2, 0.7, M.paint(c), 0, 1.0, 3.1 - k * 0.9));
    });
    headTail(G, W, 0.95, 0.9, L2, 0.88, 0.95);
    G.add(box(W * 0.98, 0.18, 0.2, M.trim, 0, 0.55, -L2 - 0.02));
    var R = 0.55, tw = 0.34, xo = W / 2 - tw / 2 + 0.03;
    [[3.1, true], [-2.3, false], [-3.45, false]].forEach(function (a) {
      [-1, 1].forEach(function (k) { G.add(addWheel(G, k, 0, R, tw, a[0], a[1], xo)); });
    });
    FG.addCarExtras(G, { W: W, L: L });
    return finish(G, L, W, 3.3, 'truck');
  }

  /* Public factory. color is a hex string such as '#d8402f'. variant picks palette variations. */
  FG.makeVehicle = function (type, color, variant) {
    var G;
    variant = variant || 0;
    if (SPECS[type]) {
      var s = SPECS[type];
      if (type === 'pickup') { s = Object.create(s); s.load = !!variant; }
      G = FG.assembleCar(s, color);
    } else if (type === 'rick') G = buildRick(color, variant);
    else if (type === 'bus') G = buildBus(color, variant);
    else G = buildTruck(color, variant);
    var d = FG.DIMS[type];
    G.userData.L = d.L; G.userData.W = d.W; G.userData.H = d.H; G.userData.type = type;
    return FG.personalise(G);
  };

  /* Remove per-car materials when a vehicle leaves the scene. */
  FG.disposeVehicle = function (G) {
    if (G.parent) G.parent.remove(G);
    G.userData.tails.forEach(function (t) { if (t.material && t.material !== M.tailBase) t.material.dispose(); });
  };
})(window.FG);
