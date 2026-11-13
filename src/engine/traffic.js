/* Traffic: spawning, following behaviour, lane changes, and how cars react to the horn.
   Works on the shared game object G (G.cars, G.P, G.scene). Lanes 0-2 go your way, 3-5 come at you. */
(function (FG) {
  'use strict';
  var R = FG.R, clamp = FG.clamp, LANES = FG.LANES;

  var TYPE_W = [['sedan', 26], ['hatch', 22], ['suv', 15], ['taxi', 9], ['pickup', 10], ['rick', 7], ['bus', 5], ['truck', 6]];
  var SPEED = {
    hatch: [14, 19], sedan: [15, 21], suv: [15, 21], taxi: [12, 16], pickup: [12, 16], rick: [8, 11], bus: [14, 17], truck: [10, 13]
  };
  var CAR_COLS = [['#eef0f2', 30], ['#b9c0c8', 18], ['#1c1f24', 14], ['#59616b', 10], ['#2c5ea5', 8], ['#b8312b', 7], ['#6e2530', 4], ['#cfc2a4', 5], ['#2f6b4f', 4]];
  var SPAWN_AHEAD = 250, DESPAWN_AHEAD = 330, DESPAWN_BEHIND = 70;

  var Tr = FG.Traffic = {};

  function groupOf(li) { return li < 3 ? 0 : 3; }

  Tr.laneClear = function (G, li, z, len, ignore, margin) {
    var lx = LANES[li], i, o, m = margin == null ? 9 : margin;
    for (i = 0; i < G.cars.length; i++) {
      o = G.cars[i];
      if (o === ignore) continue;
      if (Math.abs(o.x - lx) < 2.2 || Math.abs(o.tx - lx) < 2.2) {
        if (Math.abs(o.z - z) < (o.L + len) / 2 + m) return false;
      }
    }
    if (G.state !== 'menu' && Math.abs(G.P.x - lx) < 2.4 && Math.abs(G.P.z - z) < (G.P.L + len) / 2 + m + 2) return false;
    return true;
  };

  Tr.make = function (G, type, li, z) {
    var d = FG.DIMS[type], col, variant = 0;
    if (type === 'taxi') col = '#f1c232';
    else if (type === 'rick') { variant = Math.random() < 0.5 ? 0 : 1; col = variant ? '#2f8a4f' : '#f0b54a'; }
    else if (type === 'bus') { variant = Math.floor(Math.random() * 3); col = variant === 2 ? '#f6ead0' : '#f2f4f6'; }
    else if (type === 'truck') { variant = Math.floor(Math.random() * 4); col = ['#2f7f6f', '#c24a2f', '#2b5fa8', '#c8962c'][variant]; }
    else col = FG.wpick(CAR_COLS);
    if (type === 'pickup') variant = Math.random() < 0.5 ? 1 : 0;
    var sp = R(SPEED[type][0], SPEED[type][1]);
    var mesh = FG.makeVehicle(type, col, variant);
    G.scene.add(mesh);
    return {
      mesh: mesh, type: type, color: col, x: LANES[li], tx: LANES[li], z: z, sp: sp, v0: sp, dir: li < 3 ? 1 : -1,
      L: d.L, W: d.W, lane: li, tlane: li, blink: 0, sliding: false, cool: R(2, 7), brake: false, near: false,
      passed: false, vlat: 0, hazard: 0, yield: 0
    };
  };

  Tr.spawnAt = function (G, z) {
    for (var tries = 0; tries < 5; tries++) {
      var li = FG.wpick([[0, 3], [1, 3], [2, 3], [3, 2], [4, 2], [5, 2]]);
      if (G.state === 'menu' && li === 1) continue;
      var type = FG.wpick(TYPE_W), len = FG.DIMS[type].L;
      if (Tr.laneClear(G, li, z, len + (li > 2 ? 10 : 0), null)) { G.cars.push(Tr.make(G, type, li, z)); return true; }
    }
    return false;
  };

  Tr.fill = function (G) {
    var z = 24, top = SPAWN_AHEAD * 0.8;
    while (z < top) { Tr.spawnAt(G, z); z += R(14, 26); }
  };

  Tr.remove = function (G, c) {
    var i = G.cars.indexOf(c);
    if (i >= 0) G.cars.splice(i, 1);
    FG.disposeVehicle(c.mesh);
  };

  function startLaneChange(G, c, target, delay) {
    c.tlane = target; c.tx = LANES[target]; c.blink = delay;
  }

  /* Cars ahead of you in nearby lanes get out of the way when you honk. Returns how many moved. */
  Tr.honk = function (G) {
    var P = G.P, moved = 0;
    G.cars.forEach(function (c) {
      var ahead = c.z - P.z;
      if (c.dir < 0 || ahead < 3 || ahead > 60 || Math.abs(c.x - P.x) > 2.6) return;
      c.yield = 2.4; c.hazard = 2.4;
      if (c.sliding || c.blink > 0) { moved++; return; }
      var cands = [c.lane - 1, c.lane + 1].filter(function (li) { return li >= 0 && li <= 2 && Tr.laneClear(G, li, c.z, c.L, c, 6); });
      if (cands.length) {
        cands.sort(function (a, b) { return Math.abs(LANES[b] - P.x) - Math.abs(LANES[a] - P.x); });
        startLaneChange(G, c, cands[0], 0.12); moved++;
      } else { c.v0 = Math.min(c.v0 + 3, 24); }
    });
    return moved;
  };

  Tr.update = function (G, dt) {
    var P = G.P, i, j, c, o;
    for (i = G.cars.length - 1; i >= 0; i--) {
      c = G.cars[i];
      var gap = 1e9, leadSp = 0;
      for (j = 0; j < G.cars.length; j++) {
        o = G.cars[j];
        if (o === c || o.dir !== c.dir) continue;
        if (Math.abs(o.x - c.x) > (o.W + c.W) / 2 + 0.5) continue;
        var d = (o.z - c.z) * c.dir;
        if (d <= 0) continue;
        var g = d - (o.L + c.L) / 2;
        if (g < gap) { gap = g; leadSp = o.sp; }
      }
      if (c.dir > 0 && G.state !== 'menu') {
        var dz = P.z - c.z;
        if (dz > 0 && Math.abs(P.x - c.x) < (P.W + c.W) / 2 + 0.5) {
          var g2 = dz - (P.L + c.L) / 2;
          if (g2 < gap) { gap = g2; leadSp = P.v; }
        }
      }
      var want = c.v0, safe = 6 + c.sp * 0.9;
      if (gap < safe) want = Math.min(c.v0, leadSp * (gap < 3 ? 0.6 : 0.95));
      var prev = c.sp;
      c.sp = c.sp > want ? Math.max(want, c.sp - 9 * dt) : Math.min(want, c.sp + 2.2 * dt);
      c.brake = prev > want + 0.3 && c.sp < prev;
      if (c.yield > 0) c.yield -= dt;
      if (c.hazard > 0) c.hazard -= dt;

      c.cool -= dt;
      if (c.blink > 0) {
        if (!Tr.laneClear(G, c.tlane, c.z, c.L, c, 5)) { c.blink = 0; c.tx = c.x; c.tlane = c.lane; }
        else { c.blink -= dt; if (c.blink <= 0) c.sliding = true; }
      }
      c.vlat = 0;
      if (c.sliding) {
        var dx = c.tx - c.x, stp = Math.sign(dx) * Math.min(Math.abs(dx), 2.0 * dt);
        c.x += stp; c.vlat = stp / dt;
        if (Math.abs(c.tx - c.x) < 0.02) { c.x = c.tx; c.sliding = false; c.lane = c.tlane; }
      }
      if (!c.sliding && c.blink <= 0 && c.cool <= 0) {
        if (gap < safe + 2 && want < c.v0 - 1.5) {
          var la = groupOf(c.lane), opts = [c.lane - 1, c.lane + 1].filter(function (li) { return li >= la && li <= la + 2; });
          var tgt = FG.pick(opts);
          if (tgt != null && Tr.laneClear(G, tgt, c.z, c.L, c)) startLaneChange(G, c, tgt, 0.9);
        }
        c.cool = R(4, 9);
      }

      c.z += c.dir * c.sp * dt;
      if (c.z < P.z - DESPAWN_BEHIND || c.z > P.z + DESPAWN_AHEAD) Tr.remove(G, c);
    }

    G.spawnLeft -= Math.max(P.v, 8) * dt;
    if (G.spawnLeft <= 0) {
      Tr.spawnAt(G, P.z + SPAWN_AHEAD + R(0, 8));
      var diff = Math.min(1, P.z / 4000);
      G.spawnLeft = R(11, 22) * (1 - 0.4 * diff);
    }
  };
})(window.FG);
