/* Interface: menu options, HUD, praise toasts, touch pads, keyboard, pause and game over,
   the welcome greeting with voice, and the cockpit dashboard. */
(function (FG) {
  'use strict';
  var G = FG.game, clamp = FG.clamp;
  function $(id) { return document.getElementById(id); }
  var ui = FG.ui = {};

  var isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 0 && Math.min(window.innerWidth, window.innerHeight) < 820);
  ui.isTouch = isTouch;
  var VIEWS = ['top', 'chase', 'cockpit'], VIEW_NAMES = { top: 'Top view', chase: 'Chase view', cockpit: 'Cockpit view' };
  var firstStart = true, welcomeTimer = 0, lastHud = 0, heartsShown = -1, lastClock = '';

  /* ---------- toasts ---------- */
  function toast(text, kind) {
    if (!text) return;
    var box = $('toast');
    while (box.children.length >= 3) box.removeChild(box.firstChild);
    var d = document.createElement('div');
    d.className = 'msg' + (kind === 'plain' ? ' plain' : '');
    FG.nameify(d, text);
    box.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2700);
  }

  /* ---------- screens ---------- */
  function show(id, on) { $(id).hidden = !on; }
  function refreshScreens() {
    var s = G.state, playing = s === 'play' || s === 'paused' || s === 'crashed' || s === 'over';
    show('menu', s === 'menu');
    if (s === 'menu' || s === 'over') { var wl = $('welcome'); wl.hidden = true; wl.classList.remove('show'); }
    show('pause', s === 'paused');
    show('over', s === 'over');
    show('hud', playing);
    show('touch', isTouch && (s === 'play'));
    var cock = G.settings.view === 'cockpit' && playing;
    show('cockpit', cock);
    G.hideCar = cock;
    $('hood').setAttribute('fill', G.settings.color);
    if (s !== 'play') show('badge', false);
    $('hView').textContent = VIEW_NAMES[G.settings.view];
  }

  ui.setView = function (v) {
    G.settings.view = v; FG.store.set('view', v);
    var r = document.querySelector('input[name="view"][value="' + v + '"]'); if (r) r.checked = true;
    refreshScreens();
  };
  ui.cycleView = function () {
    var i = VIEWS.indexOf(G.settings.view);
    ui.setView(VIEWS[(i + 1) % VIEWS.length]);
    toast(VIEW_NAMES[G.settings.view], 'plain');
  };

  G.hooks.toast = toast;
  G.hooks.voice = function (t) { FG.audio.speak(t, false); };
  G.hooks.state = function () { refreshScreens(); };
  G.hooks.over = function () {
    var sc = Math.floor(G.score), isBest = sc > G.prevBest && sc > 0;
    FG.nameify($('oTitle'), isBest ? 'A new best, Fariya!' : FG.pick(['Great drive, Fariya!', 'Beautifully done, Fariya!', 'What a drive, Fariya!']));
    $('oMsg').textContent = isBest ? 'Nobody drives like you. You are amazing.' : FG.pick(['You are something special.', 'Every drive with you is a good one.', 'Take a breath, then show them again.']);
    $('oScore').textContent = String(sc); $('oBest').textContent = String(G.best);
    $('oDist').textContent = (G.P.z / 1000).toFixed(2) + ' km';
    $('oOver').textContent = String(G.stats.overtakes); $('oShot').textContent = String(G.stats.shot); $('oNear').textContent = String(G.stats.near);
    $('mBest').textContent = String(G.best);
    FG.audio.speak(isBest ? 'A new best, Fariya. You are amazing.' : 'Great drive, Fariya.', true);
  };

  /* ---------- starting the game ---------- */
  function begin() {
    FG.audio.init();
    G.start();
    var w = $('welcome');
    clearTimeout(welcomeTimer);
    w.hidden = false; w.classList.remove('show'); void w.offsetWidth; w.classList.add('show');
    welcomeTimer = setTimeout(function () { w.classList.remove('show'); w.hidden = true; }, 4700);
    if (firstStart) FG.audio.speak('Welcome, Fariya. This game was made just for you, because you are very special.', true);
    else FG.audio.speak("Let's go, Fariya!", true);
    firstStart = false;
  }
  function toMenu() { G.toMenu(); $('mBest').textContent = String(G.best); refreshScreens(); }

  /* ---------- menu bindings ---------- */
  function bindMenu() {
    var S = G.settings;
    function radio(name, key, after) {
      var els = document.querySelectorAll('input[name="' + name + '"]');
      Array.prototype.forEach.call(els, function (el) {
        el.checked = el.value === S[key];
        el.addEventListener('change', function () { if (el.checked) { S[key] = el.value; FG.store.set(key, el.value); if (after) after(); } });
      });
    }
    radio('view', 'view', refreshScreens);
    radio('speed', 'speed');
    radio('side', 'side', function () { document.body.classList.toggle('side-right', S.side === 'right'); });
    radio('car', 'car', function () { G.setPlayer(S.car, S.color); });
    document.body.classList.toggle('side-right', S.side === 'right');

    var box = $('swatches');
    FG.PLAYER_COLORS.forEach(function (pc) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch'; b.style.background = pc[1];
      b.setAttribute('aria-label', pc[0] + ' car'); b.setAttribute('aria-pressed', String(pc[1] === S.color));
      b.addEventListener('click', function () {
        S.color = pc[1]; FG.store.set('color', pc[1]);
        Array.prototype.forEach.call(box.children, function (el) { el.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        G.setPlayer(S.car, S.color); refreshScreens();
      });
      box.appendChild(b);
    });

    if (S.autoGas === null) S.autoGas = isTouch;
    var ag = $('autoGas'); ag.checked = !!S.autoGas;
    function applyAuto() { S.autoGas = ag.checked; FG.store.set('autoGas', S.autoGas); document.body.classList.toggle('autogas', !!S.autoGas && isTouch); }
    ag.addEventListener('change', applyAuto); applyAuto();

    $('btnStart').addEventListener('click', begin);
    $('btnAgain').addEventListener('click', begin);
    $('btnRestart').addEventListener('click', begin);
    $('btnResume').addEventListener('click', function () { G.resume(); });
    $('btnMenu').addEventListener('click', toMenu);
    $('btnMenu2').addEventListener('click', toMenu);
    $('btnPause').addEventListener('click', function () { G.pause(); });
    $('btnView').addEventListener('click', ui.cycleView);
    var snd = $('btnSound');
    function paintSound() { snd.querySelector('use').setAttribute('href', FG.audio.muted ? '#i-mute' : '#i-sound'); snd.setAttribute('aria-pressed', String(FG.audio.muted)); }
    snd.addEventListener('click', function () { FG.audio.init(); FG.audio.setMuted(!FG.audio.muted); paintSound(); });
    paintSound();
    $('mBest').textContent = String(G.best);
  }

  /* ---------- input ---------- */
  var KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'gas', w: 'gas', W: 'gas', ArrowDown: 'brake', s: 'brake', S: 'brake', ' ': 'fire', f: 'fire', F: 'fire' };
  function bindInput() {
    window.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = KEYS[e.key];
      if (G.state === 'play' && k) { G.keys[k] = true; e.preventDefault(); return; }
      if (e.key === 'h' || e.key === 'H') { if (!e.repeat) G.honk(); return; }
      if (e.key === 'c' || e.key === 'C') { ui.cycleView(); return; }
      if (e.key === 'm' || e.key === 'M') { $('btnSound').click(); return; }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (G.state === 'play') G.pause(); else if (G.state === 'paused') G.resume(); return; }
      if (e.key === 'Enter' && (G.state === 'menu' || G.state === 'over') && document.activeElement && document.activeElement.tagName !== 'BUTTON') begin();
    });
    window.addEventListener('keyup', function (e) { var k = KEYS[e.key]; if (k) G.keys[k] = false; });
    function releaseAll() { Object.keys(G.keys).forEach(function (k) { G.keys[k] = false; }); Array.prototype.forEach.call(document.querySelectorAll('.pad.on'), function (p) { p.classList.remove('on'); }); }
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { releaseAll(); G.pause(); } });

    function hold(id, key) {
      var el = $(id);
      el.addEventListener('pointerdown', function (e) { e.preventDefault(); G.keys[key] = true; el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { el.addEventListener(ev, function () { G.keys[key] = false; el.classList.remove('on'); }); });
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
    hold('tLeft', 'left'); hold('tRight', 'right'); hold('tGas', 'gas'); hold('tBrake', 'brake'); hold('tFire', 'fire');
    $('tHorn').addEventListener('pointerdown', function (e) { e.preventDefault(); G.honk(); });
  }

  /* ---------- HUD, refreshed every frame (cheap parts) and at 10 Hz (text) ---------- */
  function buildHearts() {
    var box = $('hHearts'), html = '';
    for (var i = 0; i < 5; i++) html += '<svg class="' + (i < G.lives ? '' : 'off') + '"><use href="#i-heart"/></svg>';
    box.innerHTML = html; heartsShown = G.lives;
  }
  ui.update = function (t) {
    var s = G.state;
    if (s === 'menu') return;
    var P = G.P;
    if (G.settings.view === 'cockpit') {
      $('wheel').style.transform = 'rotate(' + (clamp(P.vx / 9, -1, 1) * 75).toFixed(1) + 'deg)';
    }
    if (t - lastHud < 0.1) return;
    lastHud = t;
    var kmh = Math.round(P.v * 3.6);
    $('hSpeed').textContent = String(kmh);
    $('hScore').textContent = String(Math.floor(G.score));
    $('hDist').textContent = (P.z / 1000).toFixed(2) + ' km';
    $('hAmmo').textContent = String(G.ammo);
    if (heartsShown !== G.lives) buildHearts();
    var name = G.tod.name;
    if (name !== lastClock) {
      lastClock = name;
      $('hClock').textContent = name;
      var night = G.tod.night > 0.5;
      $('hClockIcon').querySelector('use').setAttribute('href', night ? '#i-moon' : '#i-sun');
      document.querySelector('.clock').classList.toggle('night', night);
    }
    show('badge', s === 'play' && G.mult() === 2);
    if (G.settings.view === 'cockpit') {
      $('cSpeed').textContent = String(kmh);
      var f = clamp(P.v / G.cap(), 0, 1);
      $('needle').setAttribute('transform', 'rotate(' + (-130 + f * 260).toFixed(1) + ' 430 352)');
    }
  };

  ui.init = function () {
    bindMenu(); bindInput(); refreshScreens(); buildHearts();
    document.body.classList.toggle('is-touch', isTouch);
  };
})(window.FG);
