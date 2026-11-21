// 작은 연못 — 소리 (전부 Web Audio 로 직접 만든다. 녹음 파일이 있으면 그걸 쓴다)
// 물속 웅웅 소리, 쿵쿵 심장 소리(게임 내내 아주 작게), 웅얼거리는 노래, 효과음, 엔딩 오르골.
window.SFX = (function () {
  'use strict';
  var ctx = null, master = null, ambGain = null, heartVol = 0.5, beatMs = 820, beatTimer = null;
  var beatFns = [], buffers = {};
  var A = window.AudioContext || window.webkitAudioContext;

  function init() {
    if (ctx || !A) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // 아이폰 무음 스위치
    ctx = new A();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  }
  // 첫 터치에 깨우기 (아이폰은 이때 소리를 한 번 내야 열린다)
  function unlock() {
    init(); if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume();
    var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(master); s.start(0);
  }
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
  var now = function () { return ctx.currentTime; };
  function env(g, t, peak, a, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f, t, dur, peak, dest, a) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    env(g, t, peak, a || 0.01, dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + (a || 0.01) + dur + 0.05);
    return o;
  }
  function noiseBuf(sec, brown) {
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }

  // ── 물속 웅웅 ──
  function ambient(on) {
    init(); if (!ctx) return;
    if (on && !ambGain) {
      var s = ctx.createBufferSource(); s.buffer = noiseBuf(3, true); s.loop = true;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      ambGain = ctx.createGain(); ambGain.gain.value = 0.0001;
      s.connect(lp); lp.connect(ambGain); ambGain.connect(master); s.start();
      ambGain.gain.exponentialRampToValueAtTime(0.22, now() + 2);
      ambGain._src = s;
    } else if (!on && ambGain) {
      var g = ambGain; ambGain = null;
      g.gain.setTargetAtTime(0.0001, now(), 0.4);
      setTimeout(function () { try { g._src.stop(); } catch (e) {} }, 2000);
    }
  }

  // ── 쿵쿵 (폰 스피커에서도 들리게 낮은 음 + 둔탁한 잡음) ──
  function thump(vol, at, single) {
    if (!ctx || vol <= 0.001) return;
    var t = at != null ? at : now();
    (single ? [0] : [0, 0.25]).forEach(function (d, k) {
      var v = vol * (k ? 0.6 : 1);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t + d); o.frequency.exponentialRampToValueAtTime(55, t + d + 0.16);
      env(g, t + d, v * 0.9, 0.012, 0.26); o.connect(g); g.connect(master); o.start(t + d); o.stop(t + d + 0.35);
      var n = ctx.createBufferSource(); n.buffer = thump.buf || (thump.buf = noiseBuf(0.2));
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
      var ng = ctx.createGain(); env(ng, t + d, v * 0.7, 0.005, 0.12);
      n.connect(f); f.connect(ng); ng.connect(master); n.start(t + d); n.stop(t + d + 0.2);
    });
  }
  // 폰 스피커·블루투스는 소리가 귀에 닿기까지 늦다 — 화면 반짝임을 그만큼 늦춰 맞춘다
  function latency() { if (!ctx) return 0; var l = ctx.outputLatency || ctx.baseLatency || 0; return Math.min(0.4, Math.max(0, l)); }
  // 심장 박동 시계 — 쿵쿵 소리는 오디오 시계로 미리 예약하고, 화면 박동은 그 소리가 들리는 순간에 맞춘다.
  // 소리가 아직 안 열렸으면(무음·첫 터치 전) 그냥 시계로 화면 박동만.
  var nextAudio = 0, lastWall = 0;
  // 박자 무늬 — 장면이 '이 박자엔 쿵, 이 박자엔 쉼'을 정하면 소리와 반짝임이 같은 박자 번호로 움직인다(1장 조개).
  // 무늬를 바꿀 때마다 gen 이 바뀌어, 미리 예약돼 있던 예전 박자는 화면이 무시한다.
  var pat = null, patSingle = false, beatNo = 0, gen = 0;
  function pattern(fn, opt) { pat = fn; patSingle = !!(fn && opt && opt.single); beatNo = 0; gen++; return gen; }
  function heart(vol) { if (vol != null) heartVol = vol; if (!beatTimer) beatTimer = setInterval(tick, 40); }
  function tick() {
    var beatSec = beatMs / 1000;
    if (ctx && ctx.state === 'running') {
      var t = ctx.currentTime;
      if (nextAudio < t) nextAudio = t + 0.08;
      while (nextAudio < t + 0.25) {
        var k = beatNo++, v = pat ? pat(k) : 1, g = gen;
        thump(heartVol * 0.55 * v, nextAudio, patSingle);
        setTimeout(fire.bind(null, k, v, g), Math.max(0, (nextAudio - t + latency()) * 1000));
        nextAudio += beatSec;
      }
      lastWall = performance.now();
    } else {
      var w = performance.now();
      if (w - lastWall >= beatMs) { lastWall = w; var k2 = beatNo++; fire(k2, pat ? pat(k2) : 1, gen); }
    }
  }
  function fire(k, v, g) {
    for (var i = 0; i < beatFns.length; i++) try { beatFns[i](k, v, g); } catch (e) { console.error(e); }
  }
  function onBeat(fn) { beatFns.push(fn); return function () { beatFns = beatFns.filter(function (f) { return f !== fn; }); }; }

  // ── 효과음 ──
  var fx = {
    bubble: function () { var t = now(), o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(320 + Math.random() * 200, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.11); env(g, t, 0.09, 0.005, 0.11); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2); },
    tick: function () { osc('triangle', 1500, now(), 0.03, 0.05); },
    tap: function () { osc('sine', 660, now(), 0.08, 0.08); },
    wrong: function () { var t = now(); osc('sine', 230, t, 0.18, 0.13); osc('sine', 185, t + 0.14, 0.26, 0.13); },
    solve: function () { var t = now(); [659, 784, 988, 1319].forEach(function (f, i) { osc('triangle', f, t + i * 0.09, 0.5, 0.11); osc('sine', f * 2, t + i * 0.09, 0.25, 0.03); }); },
    pluck: function () { var t = now(); osc('triangle', 520 + Math.random() * 120, t, 0.25, 0.1); osc('sine', 1040, t, 0.12, 0.04); },
    knot: function () { var t = now(); [523, 659, 784].forEach(function (f, i) { osc('sine', f, t + i * 0.06, 0.4, 0.08); }); },
    whoosh: function () {
      var t = now(), n = ctx.createBufferSource(); n.buffer = noiseBuf(2.2);
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3200, t + 1.8);
      var g = ctx.createGain(); env(g, t, 0.25, 1.2, 0.9); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + 2.2);
    },
    door: function () { var t = now(); [262, 330, 392, 523, 659].forEach(function (f, i) { osc('sine', f, t + i * 0.12, 2.6, 0.07, null, 0.6); osc('triangle', f * 2, t + i * 0.12, 1.4, 0.015, null, 0.5); }); },
    yum: function () { var t = now(); osc('sine', 340, t, 0.07, 0.12); osc('sine', 470, t + 0.08, 0.09, 0.12); osc('triangle', 880, t + 0.18, 0.18, 0.05); },
    nope: function () { var t = now(); osc('triangle', 300, t, 0.1, 0.07); osc('triangle', 240, t + 0.1, 0.14, 0.07); },
    static: function () {
      var t = now(), n = ctx.createBufferSource(); n.buffer = noiseBuf(0.4);
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.6;
      var g = ctx.createGain(); env(g, t, 0.06, 0.01, 0.3); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + 0.4);
    },
    sparkle: function () { var t = now(); for (var i = 0; i < 6; i++) osc('sine', 1600 + Math.random() * 1600, t + i * 0.07, 0.3, 0.03); },
  };
  function play(name) { init(); if (!ctx || ctx.state !== 'running') return; try { fx[name](); } catch (e) { console.error(e); } }

  // ── 노래: 「반짝반짝 작은 별」(옛 프랑스 민요 — 저작권 없음) ──
  // [음(미디), 박자]
  var TWINKLE = [[60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2], [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2],
    [67, 1], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2], [67, 1], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2],
    [60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2], [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2]];
  var hz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  // kind 'hum'(물 너머 흥얼거림 — 흐릿) · 'box'(오르골 — 또렷)
  function melody(kind, opt) {
    init(); if (!ctx) return { stop: function () {}, clarity: function () {} };
    opt = opt || {};
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opt.cut || (kind === 'hum' ? 520 : 9000);
    var out = ctx.createGain(); out.gain.value = opt.gain || (kind === 'hum' ? 0.5 : 0.6);
    lp.connect(out); out.connect(master);
    var beatSec = kind === 'hum' ? 0.52 : 0.6, i = 0, next = now() + 0.15, alive = true;
    var timer = setInterval(function () {
      if (!alive) return;
      while (next < now() + 0.4) {
        var n = TWINKLE[i % TWINKLE.length], f = hz(n[0] + (kind === 'box' ? 12 : 0)), d = n[1] * beatSec;
        if (kind === 'hum') {
          var o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
          o.type = 'triangle'; o.frequency.value = f; vib.frequency.value = 5; vg.gain.value = 3; vib.connect(vg); vg.connect(o.frequency);
          g.gain.setValueAtTime(0.0001, next); g.gain.linearRampToValueAtTime(0.32, next + 0.08); g.gain.setValueAtTime(0.3, next + d - 0.1); g.gain.linearRampToValueAtTime(0.0001, next + d);
          o.connect(g); g.connect(lp); o.start(next); vib.start(next); o.stop(next + d + 0.05); vib.stop(next + d + 0.05);
        } else {
          osc('sine', f, next, 1.6, 0.22, lp, 0.005); osc('sine', f * 3, next, 0.35, 0.05, lp, 0.003); osc('triangle', f * 2, next, 0.6, 0.04, lp, 0.004);
        }
        next += d; i++;
        if (i % TWINKLE.length === 0) { next += beatSec * 2; if (opt.once) { alive = false; break; } }
      }
    }, 120);
    return {
      stop: function (fade) { alive = false; clearInterval(timer); out.gain.setTargetAtTime(0.0001, now(), fade || 0.3); },
      clarity: function (c) { lp.frequency.setTargetAtTime(380 + c * c * 7000, now(), 0.15); },
    };
  }

  // ── 녹음 파일(목소리) — 미리 받아 두고, 물 너머처럼 흐리게도 튼다 ──
  function load(url) {
    init(); if (!ctx || !url) return Promise.resolve(null);
    if (buffers[url]) return buffers[url];
    buffers[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); })
      .catch(function (e) { console.warn('소리 파일을 못 읽음', url, e); return null; });
    return buffers[url];
  }
  function voiceFile(url, clarity, onEnd) {
    var h = { stop: function () {}, clarity: function () {} }, dead = false;
    load(url).then(function (buf) {
      if (dead) return;
      if (!buf) { // 디코드가 안 되면 그냥 <audio> 로(흐림 없이)
        var a = new Audio(url); a.play().catch(function () {}); a.onended = onEnd;
        h.stop = function () { a.pause(); }; return;
      }
      var s = ctx.createBufferSource(); s.buffer = buf;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      var g = ctx.createGain(); g.gain.value = 1;
      s.connect(lp); lp.connect(g); g.connect(master); s.start();
      s.onended = function () { if (!dead && onEnd) onEnd(); };
      h.clarity = function (c) { lp.frequency.setTargetAtTime(300 + c * c * 9000, now(), 0.1); };
      h.clarity(clarity);
      h.stop = function () { try { s.stop(); } catch (e) {} };
    });
    var stop0 = function () { dead = true; h.stop(); };
    return { stop: stop0, clarity: function (c) { h.clarity(c); } };
  }
  // 노래 파일을 벽 너머처럼 먹먹하게 반복 — 못 읽으면 직접 만든 흥얼거림으로
  function loopFile(url, opt) {
    opt = opt || {};
    var dead = false, inner = null;
    var h = { stop: function (f) { dead = true; if (inner) inner.stop(f); }, clarity: function (c) { if (inner) inner.clarity(c); } };
    load(url).then(function (buf) {
      if (dead) return;
      if (!buf) { inner = melody('hum', { cut: 460, gain: 0.5 }); return; }
      var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      // 반복 구간을 곡의 한 소절에 딱 맞추면 압축 파일 앞뒤 빈틈 없이 이어진다
      var lpt = opt.loop && opt.loop[0] + opt.loop[1] <= buf.duration ? opt.loop : null;
      if (lpt) { s.loopStart = lpt[0]; s.loopEnd = lpt[0] + lpt[1]; }
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opt.cut || 520; lp.Q.value = 0.7;
      var g = ctx.createGain(); g.gain.value = 0.0001;
      s.connect(lp); lp.connect(g); g.connect(master); s.start(0, lpt ? lpt[0] : 0);
      g.gain.setTargetAtTime(opt.gain || 1, now(), 0.8);
      inner = {
        stop: function (f) { g.gain.setTargetAtTime(0.0001, now(), f || 0.3); setTimeout(function () { try { s.stop(); } catch (e) {} }, 2000); },
        clarity: function (c) { lp.frequency.setTargetAtTime(380 + c * c * 9000, now(), 0.15); },
      };
    });
    return h;
  }

  // 엔딩 노래 — 미리 풀어 둔 소리를 정해진 순간에 딱 튼다(반복 구간이 한 소절이라 이음새 없이).
  // 파일을 못 읽으면(file:// 등) <audio> 로.
  var songH = null;
  function song(url, opt) {
    opt = opt || {};
    if (songH) songH.stop(0.05);
    var h = { on: true, s: null, g: null, a: null };
    h.stop = function (fade) {
      h.on = false; if (songH === h) songH = null;
      if (h.a) h.a.pause();
      if (h.g) { var s = h.s; h.g.gain.setTargetAtTime(0.0001, now(), fade || 0.25); setTimeout(function () { try { s.stop(); } catch (e) {} }, 1500); }
    };
    songH = h;
    load(url).then(function (buf) {
      if (!h.on) return;
      if (!buf) { h.a = track(url, { loop: true }); return; }
      var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      var lp = opt.loop && opt.loop[0] + opt.loop[1] <= buf.duration ? opt.loop : null;
      if (lp) { s.loopStart = lp[0]; s.loopEnd = lp[0] + lp[1]; }
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now()); g.gain.exponentialRampToValueAtTime(opt.gain || 0.9, now() + 0.06);
      s.connect(g); g.connect(master); s.start();
      h.s = s; h.g = g;
    });
    return h;
  }

  // 녹음이 없을 때: 말소리처럼 웅얼웅얼 (글자 수만큼)
  var VOWELS = [[800, 1200], [500, 1900], [320, 2300], [520, 900], [360, 800]];
  function babble(len, clarity, onEnd) {
    init(); if (!ctx) return { stop: function () {}, clarity: function () {} };
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    var out = ctx.createGain(); out.gain.value = 0.5; lp.connect(out); out.connect(master);
    var t = now() + 0.05, base = 190 + Math.random() * 60, nodes = [];
    for (var k = 0; k < len; k++) {
      var d = 0.11 + Math.random() * 0.09, v = VOWELS[Math.floor(Math.random() * VOWELS.length)];
      var o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(base * (1 + 0.12 * Math.sin(k * 0.9)), t); o.frequency.linearRampToValueAtTime(base * (1 + 0.1 * Math.sin(k * 0.9 + 1)), t + d);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.25, t + 0.03); g.gain.linearRampToValueAtTime(0.0001, t + d);
      var f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = v[0]; f1.Q.value = 5;
      var f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = v[1]; f2.Q.value = 6;
      o.connect(g); g.connect(f1); g.connect(f2); f1.connect(lp); f2.connect(lp);
      o.start(t); o.stop(t + d + 0.02); nodes.push(o);
      t += d + (k % 4 === 3 ? 0.18 : 0.02);
    }
    var tm = setTimeout(function () { if (onEnd) onEnd(); }, (t - now()) * 1000 + 100);
    var h = {
      stop: function () { clearTimeout(tm); out.gain.setTargetAtTime(0.0001, now(), 0.05); nodes.forEach(function (o) { try { o.stop(); } catch (e) {} }); },
      clarity: function (c) { lp.frequency.setTargetAtTime(300 + c * c * 6000, now(), 0.1); },
    };
    h.clarity(clarity);
    return h;
  }

  // ── 그냥 틀기(엔딩 녹음·노래) — 음악은 <audio> 그대로가 아이폰에서 안전 ──
  var tracks = {};
  function track(url, opt) {
    if (!url) return null;
    var a = tracks[url] || (tracks[url] = new Audio(url));
    a.loop = !!(opt && opt.loop); a.volume = (opt && opt.volume) || 1;
    a.currentTime = 0; a.play().catch(function (e) { console.warn('재생 안 됨', url, e); });
    return a;
  }
  function stopTracks() { Object.keys(tracks).forEach(function (k) { tracks[k].pause(); }); }
  // 첫 터치 때 무음으로 한 번 틀어 두면 나중에 바로 나온다(아이폰)
  function prime(urls) {
    urls.filter(Boolean).forEach(function (u) {
      var a = tracks[u] || (tracks[u] = new Audio(u)); a.preload = 'auto';
      a.muted = true; a.play().then(function () { a.pause(); a.currentTime = 0; a.muted = false; }).catch(function () { a.muted = false; });
    });
  }
  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  return {
    unlock: unlock, ambient: ambient, heart: heart, onBeat: onBeat, pattern: pattern, gen: function () { return gen; }, beatMs: beatMs, play: play,
    melody: melody, loopFile: loopFile, song: song, voiceFile: voiceFile, babble: babble, load: load, track: track, stopTracks: stopTracks, prime: prime, vibrate: vibrate,
    setHeart: function (v) { heartVol = v; },
    state: function () { return { ctx: ctx ? ctx.state : 'none', heart: heartVol, amb: !!ambGain, song: !!(songH && songH.on), latency: latency(), playing: Object.keys(tracks).filter(function (k) { return !tracks[k].paused; }) }; },
  };
})();
