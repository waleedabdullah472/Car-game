/* Core game: player physics, scoring, lives, shooting, pickups, horn, day and night clock,
   and syncing the Three.js meshes with the simulation. UI hooks are set in ui.js. */
(function (FG) {
  'use strict';
  var clamp = FG.clamp, R = FG.R, LANES = FG.LANES, Tr = FG.Traffic;

  var G = FG.game = {
    state: 'menu', scene: null, fx: null, world: null,
    cars: [], bullets: [], pickups: [], P: null,
    keys: { left: false, right: false, gas: false, brake: false, fire: false },
    settings: {
      view: FG.store.get('view', 'chase'), car: FG.store.get('car', 'coupe'), color: FG.store.get('color', '#d8402f'),
      speed: FG.store.get('speed', 'normal'), side: FG.store.get('side', 'left'), autoGas: FG.store.get('autoGas', null)
    },
    hooks: { toast: function () {}, over: function () {}, shake: function () {}, state: function () {}, voice: function () {} },
    best: FG.store.get('best', 0),
    score: 0, lives: 3, ammo: 10, time: 0, tod: FG.tod(0), spawnLeft: 12, nextPickupZ: 160,
    stats: { overtakes: 0, near: 0, shot: 0, wrong: 0 }, shake: 0, crashT: 0, hornCd: 0, praiseCd: 0, hornToastCd: 0,
    streak: { shots: 0, t: 0, overtakes: 0 }, kmDone: 0, topSaid: false, lastName: 'Day', hideCar: false, prevBest: 0
  };

  G.mult = function () { return G.P && G.P.x > 0 ? 2 : 1; };
  G.cap = function () { return FG.SPEEDS[G.settings.speed] / 3.6; };

  G.init = function (scene, fx, world) {
    G.scene = scene; G.fx = fx; G.world = world;
    G.P = { x: LANES[1], z: 0, v: 12, vx: 0, steer: 0, yawExtra: 0, spin: 0, throttle: 0, L: 4.5, W: 1.9, type: 'coupe', mesh: null, inv: 0, fireCd: 0, braking: false };
    G.setPlayer(G.settings.car, G.settings.color);
  };

  G.setPlayer = function (type, color) {
    var P = G.P;
    if (P.mesh) FG.disposeVehicle(P.mesh);
    G.settings.car = type; G.settings.color = color;
    P.mesh = FG.makeVehicle(type, color, 0);
    P.type = type; P.L = FG.DIMS[type].L; P.W = FG.DIMS[type].W;
    G.scene.add(P.mesh);
  };

  G.clearWorld = function () {
    G.cars.slice().forEach(function (c) { Tr.remove(G, c); });
    G.bullets.forEach(function (b) { G.fx.freeBullet(b.mesh); }); G.bullets = [];
    G.pickups.forEach(function (p) { G.fx.freePickup(p.mesh); }); G.pickups = [];
  };

  G.reset = function (mode) {
    var P = G.P;
    G.clearWorld();
    P.x = LANES[1]; P.z = 0; P.v = mode === 'menu' ? 12 : 8; P.vx = 0; P.yawExtra = 0; P.spin = 0; P.inv = 0; P.fireCd = 0;
    G.score = 0; G.lives = 3; G.ammo = 10; G.shake = 0; G.crashT = 0; G.spawnLeft = 12; G.nextPickupZ = 150;
    G.stats = { overtakes: 0, near: 0, shot: 0, wrong: 0 }; G.streak = { shots: 0, t: 0, overtakes: 0 };
    G.kmDone = 0; G.topSaid = false; G.praiseCd = 0; G.prevBest = G.best;
    if (mode !== 'menu') G.time = 0;
    P.mesh.visible = true;
    Tr.fill(G);
  };

  G.setState = function (s) { G.state = s; G.hooks.state(s); };
  G.start = function () { G.reset('play'); G.setState('play'); };
  G.toMenu = function () { G.reset('menu'); G.setState('menu'); };
  G.pause = function () { if (G.state === 'play') G.setState('paused'); };
  G.resume = function () { if (G.state === 'paused') G.setState('play'); };

  /* Kind words. kind picks the list; force skips the cooldown. */
  G.praise = function (kind, force, voice) {
    if (!force && G.praiseCd > 0) return;
    G.praiseCd = 2.2;
    var text = FG.pick(FG.WORDS[kind] || FG.WORDS.general);
    G.hooks.toast(text, 'praise');
    if (voice) G.hooks.voice(text);
  };

  G.honk = function () {
    if (G.state !== 'play' || G.hornCd > 0) return;
    G.hornCd = 0.45; FG.audio.horn();
    var n = Tr.honk(G);
    if (n > 0 && G.hornToastCd <= 0) { G.hooks.toast('Cars ahead are making way', 'plain'); G.hornToastCd = 5; }
  };

  G.fire = function () {
    var P = G.P;
    if (G.state !== 'play' || P.fireCd > 0) return;
    if (G.ammo <= 0) {
      P.fireCd = 0.6;
      if (G.hornToastCd <= 0) { G.hooks.toast('Out of ammo. Grab a blue crate!', 'plain'); G.hornToastCd = 3; }
      return;
    }
    G.ammo--; P.fireCd = 0.16; FG.audio.shot();
    var m = G.fx.bullet();
    G.bullets.push({ mesh: m, x: P.x, z: P.z + P.L / 2, zPrev: P.z + P.L / 2, vz: P.v + 95, life: 1.4 });
  };

  /* ---------- pickups ---------- */
  function spawnPickup() {
    var kind = FG.wpick([['ammo', G.ammo < 20 ? 7 : 3], ['star', 6], ['heart', G.lives < 5 ? 1.2 : 0]]);
    for (var t = 0; t < 6; t++) {
      var li = Math.random() < 0.7 ? Math.floor(R(0, 3)) : Math.floor(R(3, 6));
      if (Tr.laneClear(G, li, G.nextPickupZ, 2, null, 6)) {
        var mesh = G.fx.makePickup(kind);
        mesh.position.set(LANES[li], 0, -G.nextPickupZ);
        G.pickups.push({ mesh: mesh, kind: kind, x: LANES[li], z: G.nextPickupZ });
        break;
      }
    }
    G.nextPickupZ += R(110, 200);
  }

  function collect(p) {
    var m = G.mult();
    if (p.kind === 'ammo') { G.ammo = Math.min(30, G.ammo + 8); G.hooks.toast('+8 ammo', 'plain'); }
    else if (p.kind === 'star') { G.score += 100 * m; G.praise('pickup', true); }
    else { G.lives = Math.min(5, G.lives + 1); G.praise('heart', true, true); }
    FG.audio.chime(p.kind === 'heart' ? 784 : p.kind === 'star' ? 880 : 587);
    G.fx.burst(p.x, 1.4, p.z, 14, 5, 6);
  }

  /* ---------- crash handling ---------- */
  function hit(c) {
    var P = G.P;
    G.lives--; G.shake = 1; G.hooks.shake();
    G.fx.explode((P.x + c.x) / 2, 0.9, (P.z + c.z) / 2, 1.2);
    FG.audio.crash();
    Tr.remove(G, c);
    if (G.lives <= 0) {
      G.setState('crashed'); G.crashT = 0; P.spin = (Math.random() < 0.5 ? -1 : 1) * R(2.5, 4);
      var sc = Math.floor(G.score);
      if (sc > G.best) { G.best = sc; FG.store.set('best', sc); }
    } else {
      P.v *= 0.35; P.inv = 2.4; P.vx += (P.x > c.x ? 1 : -1) * 3;
      G.hooks.toast('Oops! Breathe. You still have ' + G.lives + (G.lives === 1 ? ' heart' : ' hearts'), 'plain');
    }
  }

  function killCar(c, b) {
    var big = c.type === 'bus' || c.type === 'truck';
    G.fx.explode(c.x, 1.0, c.z, big ? 1.8 : 1.1);
    FG.audio.boom();
    Tr.remove(G, c);
    G.stats.shot++;
    var m = G.mult();
    G.score += 50 * m;
    G.streak.shots++; G.streak.t = 5;
    if (G.streak.shots >= 3 && G.streak.shots % 3 === 0) G.hooks.toast('Triple! +bonus', 'plain'), G.score += 100 * m;
    G.praise('shot');
  }

  /* ---------- main step ---------- */
  G.step = function (dt) {
    var P = G.P, K = G.keys, st = G.state, cap = G.cap(), i, c;
    G.time += dt;
    G.tod = FG.tod(G.time);
    G.hornCd = Math.max(0, G.hornCd - dt); G.praiseCd = Math.max(0, G.praiseCd - dt); G.hornToastCd = Math.max(0, G.hornToastCd - dt);
    P.fireCd = Math.max(0, P.fireCd - dt); G.shake = Math.max(0, G.shake - dt * 2.2);
    if (G.streak.t > 0) { G.streak.t -= dt; if (G.streak.t <= 0) G.streak.shots = 0; }

    var driving = st === 'play', steer = 0, gas = false, brake = false;
    if (driving) {
      steer = (K.right ? 1 : 0) - (K.left ? 1 : 0);
      gas = K.gas || !!G.settings.autoGas; brake = K.brake;
      if (K.fire) G.fire();
    } else if (st === 'menu') gas = P.v < 12;

    if (st === 'crashed' || st === 'over') {
      P.v *= Math.exp(-2.4 * dt); P.vx *= Math.exp(-2 * dt); P.spin *= Math.exp(-1.8 * dt); P.yawExtra += P.spin * dt;
      P.x = clamp(P.x + P.vx * dt, -(FG.RAIL - P.W / 2), FG.RAIL - P.W / 2); P.throttle = 0; P.braking = true;
      G.crashT += dt;
      if (st === 'crashed' && G.crashT > 1.3) { G.setState('over'); G.hooks.over(); }
    } else {
      var a;
      if (brake) a = -18; else if (gas) a = 9 * (1 - P.v / cap) + 0.5; else a = -(0.8 + P.v * 0.04);
      if (gas && P.v > cap) a = -4;
      if (Math.abs(P.x) > FG.ROAD_HALF + 0.2) a -= 5;
      P.v = clamp(P.v + a * dt, 0, cap * 1.02);
      P.throttle += ((gas ? 1 : 0) - P.throttle) * Math.min(1, dt * 6);
      P.braking = brake;
      var maxLat = FG.lerp(9.5, 5.2, clamp(P.v / 42, 0, 1)), sf = clamp(P.v / 4, 0.2, 1);
      P.vx += (steer * maxLat * sf - P.vx) * Math.min(1, dt * 6.5);
      P.x += P.vx * dt;
      var lim = FG.RAIL - P.W / 2 - 0.1;
      if (Math.abs(P.x) > lim) {
        P.x = clamp(P.x, -lim, lim); P.vx = -P.vx * 0.3; P.v *= 0.985;
        if (driving) { G.fx.sparks(P.x + Math.sign(P.x) * P.W / 2, 0.5, P.z, 2); G.shake = Math.max(G.shake, 0.15); }
      }
    }
    P.z += P.v * dt;
    P.inv = Math.max(0, P.inv - dt);

    Tr.update(G, dt);

    // bullets
    for (i = G.bullets.length - 1; i >= 0; i--) {
      var b = G.bullets[i]; b.zPrev = b.z; b.z += b.vz * dt; b.life -= dt;
      var dead = b.life <= 0;
      if (!dead) {
        for (var j = 0; j < G.cars.length; j++) {
          c = G.cars[j];
          if (Math.abs(c.x - b.x) > c.W / 2 + 0.35) continue;
          var pad = c.sp * dt + 0.3;
          if (b.z >= c.z - c.L / 2 - pad && b.zPrev <= c.z + c.L / 2 + pad) { killCar(c, b); dead = true; break; }
        }
      }
      if (dead) { G.fx.freeBullet(b.mesh); G.bullets.splice(i, 1); }
      else b.mesh.position.set(b.x, 0.7, -b.z);
    }

    if (driving) {
      var m = G.mult();
      G.score += P.v * dt * 0.1 * m;
      if (m === 2) G.stats.wrong += dt;

      // pickups
      if (P.z + 220 > G.nextPickupZ) spawnPickup();
      for (i = G.pickups.length - 1; i >= 0; i--) {
        var p = G.pickups[i];
        if (Math.abs(p.x - P.x) < 1.9 && Math.abs(p.z - P.z) < P.L / 2 + 1.1) { collect(p); G.fx.freePickup(p.mesh); G.pickups.splice(i, 1); }
        else if (p.z < P.z - 40) { G.fx.freePickup(p.mesh); G.pickups.splice(i, 1); }
      }

      // collisions, close calls, overtakes
      for (i = 0; i < G.cars.length; i++) {
        c = G.cars[i];
        var dz = Math.abs(c.z - P.z), dx = Math.abs(c.x - P.x);
        if (P.inv <= 0 && dz < (c.L + P.L) / 2 * 0.93 && dx < (c.W + P.W) / 2 * 0.9) { hit(c); break; }
        if (!c.near && P.v > 10 && dz < (P.L + c.L) / 2) {
          var gp = dx - (P.W + c.W) / 2;
          if (gp > 0 && gp < 0.7) {
            c.near = true; G.stats.near++; G.score += 25 * m;
            G.hooks.toast('Close call +' + 25 * m, 'plain');
            if (G.stats.near % 3 === 0) G.praise('near');
          }
        }
        if (!c.passed && c.z < P.z - (c.L + P.L) / 2 - 1) {
          c.passed = true;
          if (c.dir > 0) {
            G.stats.overtakes++; G.score += 10 * m; G.streak.overtakes++;
            if (G.streak.overtakes % 5 === 0) G.praise('overtake');
          } else G.score += 5 * m;
        }
      }

      // milestones
      var km = Math.floor(P.z / 1000);
      if (km > G.kmDone) { G.kmDone = km; G.praise('km', true, true); }
      if (!G.topSaid && P.v > cap * 0.96 && P.z > 300) { G.topSaid = true; G.praise('speed', false, true); }
      var name = G.tod.name;
      if (name !== G.lastName) {
        G.lastName = name;
        G.hooks.toast({ Dusk: 'Sunset. Headlights on', Night: 'Night drive', Dawn: 'Sunrise', Day: 'Good morning' }[name], 'plain');
      }
    }
    G.sync(dt);
  };

  /* ---------- keep meshes in step with the simulation ---------- */
  var TAIL_ON = new THREE.Color(0xff3b30), TAIL_AMBER = new THREE.Color(0xffb000), TAIL_DIM = new THREE.Color(0x8e1a1e), TAIL_NIGHT = new THREE.Color(0xb02228);
  function setTails(U, braking, hazard, night, t) {
    var col = braking ? TAIL_ON : (hazard && Math.floor(t * 4) % 2 === 0 ? TAIL_AMBER : (night > 0.3 ? TAIL_NIGHT : TAIL_DIM));
    for (var i = 0; i < U.tails.length; i++) U.tails[i].material.color.copy(col);
    if (U.glow) U.glow.visible = braking;
  }
  function spinWheels(U, dist, steerRel) {
    for (var i = 0; i < U.wheels.length; i++) {
      var w = U.wheels[i];
      w.spin.rotation.x -= dist / w.R;
      if (w.front) w.pivot.rotation.y = steerRel;
    }
  }

  G.sync = function (dt) {
    var P = G.P, t = G.time, night = G.tod.night, i, c, U;
    var phi = Math.atan2(-P.vx, Math.max(P.v, 5));
    P.mesh.position.set(P.x, 0.03, -P.z);
    P.mesh.rotation.y = phi + P.yawExtra;
    P.mesh.rotation.z = clamp(-P.vx * 0.006, -0.05, 0.05);
    P.mesh.visible = !G.hideCar && (P.inv <= 0 || Math.floor(P.inv * 10) % 2 === 0);
    U = P.mesh.userData;
    spinWheels(U, P.v * dt, phi * 0.9);
    setTails(U, P.braking && G.state === 'play', false, night, t);
    for (i = 0; i < G.cars.length; i++) {
      c = G.cars[i]; U = c.mesh.userData;
      c.mesh.position.set(c.x, 0.03, -c.z);
      c.mesh.rotation.y = Math.atan2(-c.vlat, c.dir * c.sp);
      spinWheels(U, c.sp * dt, 0);
      setTails(U, c.brake, c.hazard > 0, night, t);
    }
    G.fx.update(dt, G.pickups, night);
  };
})(window.FG);
