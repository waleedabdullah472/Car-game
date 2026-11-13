/* Shared helpers, constants and tiny storage wrapper. Everything lives on the FG namespace. */
window.FG = window.FG || {};
(function (FG) {
  'use strict';

  FG.TAU = Math.PI * 2;
  /* Writes text into an element and gives every "Fariya" the premium animated name style. */
  FG.nameify = function (el, text) {
    while (el.firstChild) el.removeChild(el.firstChild);
    String(text).split(/(Fariya)/).forEach(function (part) {
      if (!part) return;
      if (part === 'Fariya') { var s = document.createElement('span'); s.className = 'fname'; s.textContent = part; el.appendChild(s); }
      else el.appendChild(document.createTextNode(part));
    });
  };
  FG.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  FG.lerp = function (a, b, t) { return a + (b - a) * t; };
  FG.R = function (a, b) { return a + Math.random() * (b - a); };
  FG.smooth = function (a, b, x) {
    var t = FG.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  FG.hash = function (i, k) {
    var s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  FG.wpick = function (list) {
    var s = 0, i;
    for (i = 0; i < list.length; i++) s += list[i][1];
    var r = Math.random() * s;
    for (i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
    return list[0][0];
  };
  FG.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  FG.store = {
    get: function (key, def) {
      try {
        var v = localStorage.getItem('fariya.' + key);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set: function (key, val) {
      try { localStorage.setItem('fariya.' + key, JSON.stringify(val)); } catch (e) { /* ignore */ }
    }
  };

  /* Road layout, in metres. Lanes 0-2 carry your direction (left side, as on Pakistani roads),
     lanes 3-5 carry oncoming traffic. x grows to the right. */
  FG.LANE_W = 3.6;
  FG.LANES = [-9, -5.4, -1.8, 1.8, 5.4, 9];
  FG.ROAD_HALF = 10.8;
  FG.SHOULDER = 12.6;
  FG.RAIL = 13.3;

  FG.SPEEDS = { relaxed: 100, normal: 140, turbo: 180 }; // km/h caps

  FG.PLAYER_COLORS = [
    ['Red', '#d8402f'], ['Blue', '#2f6fd0'], ['White', '#eceff2'],
    ['Green', '#2f9a62'], ['Pink', '#f06a9a'], ['Black', '#1c1f24']
  ];

  /* Day and night: one full cycle takes DAY_LEN seconds. u=0.25 is noon, u=0.75 is midnight. */
  FG.DAY_LEN = 160;
  FG.START_U = 0.13;
  FG.tod = function (t) {
    var u = ((t / FG.DAY_LEN) + FG.START_U) % 1;
    var h = Math.sin(u * FG.TAU);
    var night = FG.smooth(0.10, -0.28, h);
    var name = 'Day';
    if (night > 0.6) name = 'Night';
    else if (h < 0.3) name = (u < 0.25 || u > 0.75) ? 'Dawn' : 'Dusk';
    return { u: u, h: h, night: night, name: name };
  };

  /* Kind words for Fariya, grouped by what just happened. */
  FG.WORDS = {
    general: [
      'Beautiful driving, Fariya!', 'You make it look easy, Fariya!', 'Smooth and stylish, Fariya!',
      'Fariya, you are a star!', 'Nobody drives like you, Fariya!', 'Keep shining, Fariya!',
      'Absolutely amazing, Fariya!', 'You are unstoppable, Fariya!', 'That was perfect, Fariya!'
    ],
    overtake: ['Brilliant overtake, Fariya!', 'So smooth, Fariya!', 'Perfect line, Fariya!', 'Right past them, Fariya!'],
    near: ['Nerves of steel, Fariya!', 'That was close, and you nailed it!', 'Cool and calm, Fariya!'],
    shot: ['Great shot, Fariya!', 'Bullseye, Fariya!', 'What aim, Fariya!', 'Boom! Nice one, Fariya!'],
    pickup: ['Lucky star, Fariya!', 'Treasure found, Fariya!', 'You deserve it, Fariya!'],
    heart: ['A heart for you, Fariya!', 'Extra life, because you are special!'],
    speed: ['Full speed and still smiling, Fariya!', 'Flying, Fariya!'],
    km: ['Another kilometre, another win, Fariya!', 'You are on fire, Fariya!']
  };
})(window.FG);
