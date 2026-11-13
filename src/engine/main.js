/* Boot, camera rigs (top, chase, cockpit, menu orbit) and the main loop. */
(function (FG) {
  'use strict';
  var T = THREE, G = FG.game, clamp = FG.clamp;
  function $(id) { return document.getElementById(id); }

  var canvas = $('gl'), renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: !FG.ui.isTouch || (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
  } catch (e) { renderer = null; }
  if (!renderer) { $('nogl').hidden = false; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, FG.ui.isTouch ? 1.6 : 2));

  var scene = new T.Scene();
  var cam = new T.PerspectiveCamera(60, 1, 0.8, 900);
  var fx = FG.createFx(scene);
  var world = FG.createWorld(scene, renderer);
  G.init(scene, fx, world);
  G.reset('menu');
  FG.ui.init();

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var camPos = new T.Vector3(0, 4, 10), camLook = new T.Vector3(0, 1, 0), tPos = new T.Vector3(), tLook = new T.Vector3();
  var fov = 60, W = 1, H = 1, offsetOn = false;

  function resize() {
    W = Math.max(1, window.innerWidth); H = Math.max(1, window.innerHeight);
    renderer.setSize(W, H, false);
    cam.aspect = W / H; cam.updateProjectionMatrix();
    offsetOn = false;
  }

  /* In the menu the car sits beside the card: right of centre on wide screens, above it on phones. */
  function menuOffset(on) {
    if (on) {
      if (W / H > 1.1) cam.setViewOffset(W, H, -W * 0.18, 0, W, H);
      else cam.setViewOffset(W, H, 0, H * 0.3, W, H);
      offsetOn = true;
    } else if (offsetOn) { cam.clearViewOffset(); offsetOn = false; }
  }

  var FOG = { top: [170, 440], chase: [110, 330], cockpit: [110, 330] };

  function updateCamera(dt, t) {
    var P = G.P, cap = Math.max(1, G.cap()), sp = clamp(P.v / cap, 0, 1), view = G.settings.view, st = G.state;
    var k = 1 - Math.exp(-dt * 7), fovT, rigid = false;
    var phi = Math.atan2(-P.vx, Math.max(P.v, 5));

    if (st === 'menu') {
      var a = t * 0.3 + 0.7;
      var wide = W / H > 1.1, rad = wide ? 9.6 : 17;
      tPos.set(P.x + Math.sin(a) * rad, 2.6 + 0.4 * Math.sin(t * 0.5), -P.z + Math.cos(a) * rad);
      tLook.set(P.x, 0.85, -P.z); fovT = wide ? 36 : 50;
      menuOffset(true);
    } else {
      menuOffset(false);
      if (view === 'top') {
        var Ht = 26 + P.v * 0.8;
        tPos.set(P.x * 0.45, Ht, -P.z + Ht * 0.2); tLook.set(P.x * 0.45, 0, -P.z - Ht * 0.22); fovT = 48;
      } else if (view === 'cockpit') {
        rigid = true;
        tPos.set(P.x + 0.4, 1.18, -P.z - 0.35);
        tLook.set(P.x + 0.4 - Math.sin(phi) * 30, 1.0, -P.z - 30); fovT = 72 + sp * 8;
      } else {
        tPos.set(P.x * 0.78, 3.9 + sp * 0.8, -P.z + 9.2 + sp * 2.5);
        tLook.set(P.x * 0.9, 1.3, -P.z - 16); fovT = 58 + sp * 16;
      }
    }
    if (rigid) { camPos.copy(tPos); camLook.copy(tLook); }
    else { camPos.lerp(tPos, k); camLook.lerp(tLook, k); }
    fov += (fovT - fov) * (1 - Math.exp(-dt * 4));
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.position.copy(camPos);
    if (G.shake > 0 && !reduce && st !== 'menu') {
      var s = G.shake * 0.35;
      cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s;
    }
    cam.lookAt(camLook);
    var f = FOG[st === 'menu' ? 'chase' : view], shrink = 1 - 0.22 * world.night;
    world.setFog(f[0] * shrink, f[1] * shrink);
  }

  var last = 0;
  function frame(ms) {
    var t = ms / 1000, dt = Math.min(0.05, last ? t - last : 0.016);
    last = t;
    if (G.state !== 'paused') {
      var n = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / n;
      for (var i = 0; i < n; i++) G.step(h);
    }
    updateCamera(dt, t);
    world.update(G.P.z, cam, G.tod);
    FG.audio.update(G.P.v, G.P.throttle, G.state === 'play');
    FG.ui.update(t);
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  /* Hooks for automated tests. */
  window.__fg = {
    FG: FG, G: G, scene: scene, cam: cam, world: world, renderer: renderer,
    tick: function (sec, dt) {
      dt = dt || 1 / 60;
      for (var t = 0; t < sec; t += dt) G.step(dt);
    }
  };
})(window.FG);
