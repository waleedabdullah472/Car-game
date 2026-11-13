/* Visual effects: explosions and sparks, tracer bullets, and the three bonus pickups
   (ammo crate, gold star, pink heart). Game coordinates are (x, z-forward); Three uses -z. */
(function (FG) {
  'use strict';
  var T = THREE, TAU = FG.TAU, R = FG.R;

  FG.createFx = function (scene) {
    var fx = {}, i;

    /* ---------- particles ---------- */
    var pmats = [0xffb347, 0xffe08a, 0xff6a3a, 0x555a60].map(function (c) { return new T.MeshBasicMaterial({ color: c }); });
    var pgeo = new T.BoxGeometry(0.22, 0.22, 0.22);
    var parts = [];
    for (i = 0; i < 160; i++) {
      var pm = new T.Mesh(pgeo, pmats[i % 4]); pm.visible = false; scene.add(pm);
      parts.push({ m: pm, vx: 0, vy: 0, vz: 0, life: 0, max: 0, on: false });
    }
    var pi = 0;
    fx.burst = function (x, y, zg, n, spd, up) {
      for (var k = 0; k < n; k++) {
        var p = parts[pi = (pi + 1) % parts.length], a = R(0, TAU), s = R(0.3, 1) * spd;
        p.on = true; p.life = 0; p.max = R(0.4, 1.1);
        p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = R(0.3, 1) * up;
        p.m.position.set(x, y, -zg); p.m.scale.setScalar(R(0.6, 1.5)); p.m.visible = true;
      }
    };

    /* ---------- fireballs ---------- */
    var fbs = [];
    for (i = 0; i < 8; i++) {
      var mat = new T.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
      var fm = new T.Mesh(new T.SphereGeometry(1, 12, 8), mat); fm.visible = false; scene.add(fm);
      fbs.push({ m: fm, t: 0, max: 0.5, size: 3, on: false });
    }
    var fi = 0;
    fx.explode = function (x, y, zg, size) {
      size = size || 1;
      var f = fbs[fi = (fi + 1) % fbs.length];
      f.on = true; f.t = 0; f.max = 0.55; f.size = 3.2 * size; f.m.position.set(x, y, -zg); f.m.visible = true;
      fx.burst(x, y, zg, Math.round(26 * size), 11 * size, 8 * size);
    };
    fx.sparks = function (x, y, zg, n) { fx.burst(x, y, zg, n || 4, 5, 3); };

    /* ---------- tracer bullets ---------- */
    var bGeo = new T.BoxGeometry(0.16, 0.16, 2.6), bMat = new T.MeshBasicMaterial({ color: 0xfff2a0 });
    var bPool = [];
    fx.bullet = function () {
      var m = bPool.pop();
      if (!m) m = new T.Mesh(bGeo, bMat);
      m.visible = true; scene.add(m); return m;
    };
    fx.freeBullet = function (m) { scene.remove(m); bPool.push(m); };

    /* ---------- pickups ---------- */
    var pillarMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, depthWrite: false, blending: T.AdditiveBlending });
    var pillarGeo = new T.CylinderGeometry(0.55, 0.55, 7, 12, 1, true).translate(0, 3.5, 0);
    function star() {
      var s = new T.Shape(), n = 5;
      for (var k = 0; k < n * 2; k++) {
        var a = Math.PI / 2 + k * Math.PI / n, r = k % 2 ? 0.27 : 0.62;
        if (k) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      var g = new T.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
      g.translate(0, 0, -0.08);
      return new T.Mesh(g, new T.MeshPhongMaterial({ color: 0xffc933, emissive: 0x6a4300, shininess: 90 }));
    }
    function heart() {
      var s = new T.Shape();
      s.moveTo(0, -0.55); s.bezierCurveTo(-0.95, 0.05, -0.55, 0.78, 0, 0.35); s.bezierCurveTo(0.55, 0.78, 0.95, 0.05, 0, -0.55);
      var g = new T.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 });
      g.translate(0, 0, -0.09);
      return new T.Mesh(g, new T.MeshPhongMaterial({ color: 0xff6f9f, emissive: 0x5a1230, shininess: 90 }));
    }
    function crate() {
      var g = new T.Group();
      g.add(FG.box(0.86, 0.58, 0.58, new T.MeshPhongMaterial({ color: 0x2f7be0, emissive: 0x0a2a55, shininess: 60 })));
      g.add(FG.box(0.9, 0.1, 0.62, new T.MeshPhongMaterial({ color: 0xdbe6f2 }), 0, 0.3, 0));
      g.add(FG.box(0.2, 0.34, 0.03, new T.MeshBasicMaterial({ color: 0xffd23f }), 0, 0, 0.3));
      g.add(FG.box(0.2, 0.34, 0.03, new T.MeshBasicMaterial({ color: 0xffd23f }), 0, 0, -0.3));
      return g;
    }
    var PCOL = { ammo: 0x6bb2ff, star: 0xffd34d, heart: 0xff7aa8 };
    fx.makePickup = function (kind) {
      var g = new T.Group(), body = kind === 'star' ? star() : kind === 'heart' ? heart() : crate();
      body.position.y = 1.35; body.scale.setScalar(kind === 'ammo' ? 1.15 : 1.35);
      var pm2 = pillarMat.clone(); pm2.color.setHex(PCOL[kind]);
      var pillar = new T.Mesh(pillarGeo, pm2);
      g.add(body); g.add(pillar);
      g.userData = { body: body, pillar: pillar, kind: kind, t: Math.random() * 6 };
      scene.add(g);
      return g;
    };
    fx.freePickup = function (g) { scene.remove(g); g.userData.pillar.material.dispose(); };

    /* Per-frame update. pickups is an array of {mesh}. */
    fx.update = function (dt, pickups, night) {
      var k, p;
      for (k = 0; k < parts.length; k++) {
        p = parts[k]; if (!p.on) continue;
        p.life += dt;
        if (p.life > p.max) { p.on = false; p.m.visible = false; continue; }
        p.vy -= 18 * dt;
        p.m.position.x += p.vx * dt; p.m.position.z += p.vz * dt; p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt);
        p.m.scale.multiplyScalar(1 - 1.1 * dt);
      }
      for (k = 0; k < fbs.length; k++) {
        var f = fbs[k]; if (!f.on) continue;
        f.t += dt;
        var u = f.t / f.max;
        if (u >= 1) { f.on = false; f.m.visible = false; continue; }
        f.m.scale.setScalar(f.size * (0.3 + 0.9 * Math.sqrt(u)));
        f.m.material.opacity = 0.85 * (1 - u);
      }
      for (k = 0; k < pickups.length; k++) {
        var u2 = pickups[k].mesh.userData;
        u2.t += dt;
        u2.body.rotation.y = u2.t * 2.2;
        u2.body.position.y = 1.35 + Math.sin(u2.t * 3) * 0.18;
        u2.pillar.material.opacity = 0.12 + 0.1 * night + 0.04 * Math.sin(u2.t * 5);
      }
    };
    return fx;
  };
})(window.FG);
