/* Sound: synthesised engine, horn, shots, crashes, plus a spoken voice for Fariya.
   Everything is created on the first tap or key press, as browsers require. */
(function (FG) {
  'use strict';
  var AC = null, eng = null, master = null;
  var muted = !!FG.store.get('muted', false);
  var lastSpoken = -999;

  function ctxOk() { return AC && !muted; }

  FG.audio = {
    get muted() { return muted; },

    init: function () {
      if (AC) { if (AC.state === 'suspended') { try { AC.resume(); } catch (e) { /* ignore */ } } return; }
      try {
        var A = window.AudioContext || window.webkitAudioContext;
        if (!A) return;
        AC = new A();
        master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
        var o = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
        o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0;
        o.connect(f); o2.connect(f); f.connect(g); g.connect(master);
        o.start(); o2.start();
        eng = { o: o, o2: o2, f: f, g: g };
      } catch (e) { AC = null; eng = null; }
      if (window.speechSynthesis) { try { window.speechSynthesis.getVoices(); } catch (e) { /* ignore */ } }
    },

    setMuted: function (m) {
      muted = !!m;
      FG.store.set('muted', muted);
      if (muted && window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    },

    /* Called every frame. vol is 0 when not driving. */
    update: function (speed, throttle, driving) {
      if (!AC || !eng) return;
      try {
        var t = AC.currentTime, rpm = 40 + speed * 3.4;
        eng.o.frequency.setTargetAtTime(rpm, t, 0.06);
        eng.o2.frequency.setTargetAtTime(rpm * 0.5, t, 0.06);
        eng.f.frequency.setTargetAtTime(300 + speed * 26, t, 0.08);
        eng.g.gain.setTargetAtTime((muted || !driving) ? 0 : 0.028 + 0.03 * throttle, t, 0.1);
      } catch (e) { /* ignore */ }
    },

    horn: function () {
      if (!ctxOk()) return;
      try {
        var t = AC.currentTime, g = AC.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.07, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        g.connect(master);
        [392, 494].forEach(function (fq) {
          var o = AC.createOscillator(); o.type = 'square'; o.frequency.value = fq;
          o.connect(g); o.start(t); o.stop(t + 0.52);
        });
      } catch (e) { /* ignore */ }
    },

    shot: function () {
      if (!ctxOk()) return;
      try {
        var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(900, t);
        o.frequency.exponentialRampToValueAtTime(140, t + 0.14);
        g.gain.setValueAtTime(0.07, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.18);
      } catch (e) { /* ignore */ }
    },

    noise: function (dur, vol, cutoff) {
      if (!ctxOk()) return;
      try {
        var n = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4);
        var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
        f.type = 'lowpass'; f.frequency.value = cutoff; g.gain.value = vol;
        s.buffer = buf; s.connect(f); f.connect(g); g.connect(master); s.start();
      } catch (e) { /* ignore */ }
    },
    boom: function () { FG.audio.noise(0.5, 0.3, 1100); },
    crash: function () { FG.audio.noise(0.7, 0.4, 800); },

    chime: function (base) {
      if (!ctxOk()) return;
      try {
        var t = AC.currentTime;
        [0, 7, 12].forEach(function (semi, i) {
          var o = AC.createOscillator(), g = AC.createGain(), st = t + i * 0.07;
          o.type = 'sine'; o.frequency.value = (base || 660) * Math.pow(2, semi / 12);
          g.gain.setValueAtTime(0.0001, st);
          g.gain.exponentialRampToValueAtTime(0.08, st + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, st + 0.3);
          o.connect(g); g.connect(master); o.start(st); o.stop(st + 0.32);
        });
      } catch (e) { /* ignore */ }
    },

    /* Spoken lines. Skipped when muted, unsupported, or if one was spoken very recently
       (unless force is true). */
    speak: function (text, force) {
      if (muted || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      var now = Date.now() / 1000;
      if (!force && now - lastSpoken < 20) return;
      try {
        var synth = window.speechSynthesis;
        if (force) synth.cancel();
        var u = new SpeechSynthesisUtterance(text);
        var voices = synth.getVoices() || [];
        var en = voices.filter(function (v) { return /^en/i.test(v.lang); });
        var pref = en.filter(function (v) { return /female|zira|samantha|karen|moira|tessa|serena|susan|hazel|aria|jenny|libby|sonia|google uk english female|google us english/i.test(v.name); });
        var v = pref[0] || en[0];
        if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-US'; }
        u.rate = 0.95; u.pitch = 1.08; u.volume = 1;
        synth.speak(u);
        lastSpoken = now;
      } catch (e) { /* ignore */ }
    }
  };
})(window.FG);
