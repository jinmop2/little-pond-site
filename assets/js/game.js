// 작은 연못 — 게임 진행
// 시작 → (폰 두 대: 🌙 안쪽 / ☀️ 바깥 고르기) → 들어가기 → 1~4장 → 엔딩(이름·되감기·초음파·편지·빙고 단서)
// 폰 두 대는 서로 연결되지 않는다. 각자 화면에만 있는 단서를 말로 주고받아야 풀린다.
(function () {
  'use strict';
  var B = window.BABY, P = PUZ.build(B), COL = PUZ.COLORS, esc = ART.esc;
  var KEY = 'little-pond-v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var app = $('#app');

  // ── 저장 ──
  function fresh() { return { stage: 'start', mode: null, role: null, ch: 1, view: 'inner', done: {}, heard: [], untied: [], ate: 0, faces: [], ending: 0 }; }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.stage) return Object.assign(fresh(), s); } catch (e) {} return fresh(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var S = load();
  if (/[?&]reset/.test(location.search)) { S = fresh(); save(); }

  // 장면이 바뀔 때 멈출 것들(타이머·소리)
  var live = [];
  function cleanup() { live.forEach(function (f) { try { f(); } catch (e) {} }); live = []; }
  function later(fn, ms) { var t = setTimeout(fn, ms); live.push(function () { clearTimeout(t); }); return t; }

  // 받침 따라 은/는, 이/가
  function josa(w, a, b) {
    var c = String(w).trim().slice(-1), code = c.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) return (code - 0xAC00) % 28 ? a : b;
    if (/[0-9]/.test(c)) return '013678'.indexOf(c) >= 0 ? a : b;
    return b;
  }

  var ROLE = { inner: { icon: '🌙', name: '안쪽' }, outer: { icon: '☀️', name: '바깥' } };
  var other = function (r) { return r === 'inner' ? 'outer' : 'inner'; };
  function roles() { return S.mode === 'one' ? ['inner', 'outer'] : [S.role]; }
  var CH = [null,
    { name: '어둠', stage: 0, tasks: { inner: ['c1i'], outer: ['c1o'] } },
    { name: '떠내려오는 것들', stage: 1, tasks: { inner: ['c2i'], outer: ['c2o'] } },
    { name: '물 밖의 목소리', stage: 2, tasks: { inner: ['c3i'], outer: ['c3o'] } },
    // 4장은 문 날짜만 맞으면 어느 쪽에서든 열림(매듭은 숫자를 찾는 길 — 날짜를 먼저 맞히면 남은 매듭은 저절로 풀림)
    { name: '긴 줄', stage: 3, tasks: { inner: ['c4d'], outer: ['c4d'] } },
  ];
  function roleDone(n, r) { return CH[n].tasks[r].every(function (k) { return S.done[k]; }); }
  function chDone(n) { return roles().every(function (r) { return roleDone(n, r); }); }

  var LINES = {
    1: { inner: '쿵쿵… 어디선가 커다란 소리가 나. 소리에 맞춰 조개들이 반짝여.', outer: '물 위로 커다랗고 따뜻한 그림자가 지나가. 어디로 가는 걸까?' },
    2: { inner: '위에서 맛있는 게 둥둥 떠내려와. 그런데 지금 먹어야 하는 건 따로 있는 것 같아.', outer: '물 밖이 어렴풋이 보여. 누군가 하루 종일 뭘 먹고 있어.' + (B.dawnLine ? ' ' + B.dawnLine : '') },
    3: { inner: '벽 너머 세 군데가 유난히 따뜻해. 저쪽에서 누가 자꾸 말을 거는 것 같아.', outer: '물 밖에서 누가 말을 거는데, 웅얼거려서 알아들을 수가 없어.' },
    4: { inner: '배에서 이어진 긴 줄이 저 위까지 뻗어 있어. 군데군데 꼬여 있네.', outer: '줄 끝에 빛이 새어 나오는 문이 있어. 저 문만 열면…' },
  };
  var HINTS = {
    1: { inner: ['물 위로 지나가는 그림자는 ☀️ 바깥에서만 보여.', '그림자가 지나간 방향 그대로, 네 번 쓱쓱 밀어 봐.'],
      outer: ['조개가 반짝이는 건 🌙 안쪽에서만 보여.', '◯ △ □ 조개가 각각 몇 번씩 반짝이는지 세어 달라고 해.'] },
    2: { inner: ['시간마다 먹어야 하는 건 ☀️ 바깥 식탁에 그림자로 보여.', '맨 위에 적힌 시간의 그림자 음식이 떠내려올 때, 그걸 눌러서 받아먹어.'],
      outer: ['먹을 때 표정은 🌙 안쪽에서 받아먹을 때 보여.', '안쪽에 시간마다 무슨 표정이었는지 물어보고, 얼굴을 눌러 그대로 맞춰.'] },
    3: { inner: ['목소리는 ☀️ 바깥에서 들려.', '목소리마다 또렷하게 빛나는 낱말이 하나씩 있어. 그 세 개를 골라.'],
      outer: ['다이얼을 어디에 맞출지는 🌙 안쪽 벽의 따뜻한 곳이 알려 줘.', '따뜻한 곳마다 콕콕 찍힌 점의 개수가 다이얼 번호야.'] },
    4: { inner: ['꼬인 매듭을 손가락으로 살살 문질러 봐.', '구슬이 문에 들어가는 순서는 ☀️ 바깥 문의 색 구멍 순서야.'],
      outer: ['숫자는 🌙 안쪽 줄의 구슬에 적혀 있어.', '문 구멍 색깔 순서대로, 그 색 구슬의 숫자를 넣어.'] },
  };

  // ── 소리 시작(첫 터치) ──
  var audioOn = false;
  function startAudio() {
    SFX.unlock();
    if (audioOn) return; audioOn = true;
    SFX.ambient(true); SFX.heart(0.3);
    SFX.prime([B.callAudio]);
    B.voices.forEach(function (v) { if (v.audio) SFX.load(v.audio); });
    if (B.song) SFX.load(B.song); // 엔딩에서 딱 나오게 미리 풀어 둔다
  }

  function foodHtml(f, cls) { return f.img ? '<img class="' + cls + '" src="' + esc(f.img) + '" alt="" draggable="false">' : '<span class="' + cls + '">' + f.emoji + '</span>'; }
  var HAND = '<svg viewBox="0 0 200 220" class="handsvg"><g><rect x="45" y="92" width="112" height="112" rx="48"/><rect x="48" y="28" width="25" height="100" rx="12.5"/><rect x="77" y="12" width="25" height="110" rx="12.5"/><rect x="106" y="16" width="25" height="106" rx="12.5"/><rect x="134" y="36" width="23" height="90" rx="11.5"/><rect x="8" y="96" width="24" height="86" rx="12" transform="rotate(-38 20 140)"/></g></svg>';

  // ═════════ 시작 화면 ═════════
  function showStart() {
    cleanup();
    var resumable = S.stage !== 'start' && S.mode;
    app.innerHTML = '<div class="screen start">' +
      '<div class="start-art">' + ART.svg(ART.water('inner') + ART.me(180, 150, 1.1, 0)).replace('xMidYMid meet', 'xMidYMid slice') + '</div>' +
      '<div class="start-body"><h1>' + esc(B.title) + '</h1><p class="tag">깜깜한 연못 속,<br>누군가 나를 부르고 있어.</p>' +
      (resumable
        ? '<button class="btn main" data-act="resume">이어서 하기</button><button class="btn ghost" data-act="new">처음부터</button>'
        : '<button class="btn main" data-act="two">폰 두 대로 같이</button><button class="btn" data-act="one">폰 한 대로 같이</button>') +
      '<p class="note">🔊 소리를 켜고, 무음 모드는 꺼 주세요</p>' +
      (window.INAPP && INAPP.app && INAPP.ios && !INAPP.tried ? '<p class="note warn">' + INAPP.app + ' 안에서는 소리가 잘 안 나요. 오른쪽 아래 ⋯ → 사파리로 열기</p>' : '') +
      '</div></div>';
    app.onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      startAudio(); SFX.play('tap');
      var a = b.dataset.act;
      if (a === 'two') { S = fresh(); S.mode = 'two'; save(); showRoles(); }
      else if (a === 'one') { S = fresh(); S.mode = 'one'; S.stage = 'intro'; save(); showIntro(); }
      else if (a === 'new') { S = fresh(); save(); showStart(); }
      else if (a === 'resume') resume();
    };
  }
  function resume() {
    if (S.stage === 'ending') return runEnding(S.ending);
    if (S.stage === 'play') return enterChapter(S.ch);
    if (S.stage === 'intro') return showIntro();
    if (S.mode === 'two' && !S.role) return showRoles();
    showStart();
  }

  function showRoles() {
    cleanup();
    app.innerHTML = '<div class="screen roles"><h2>어느 쪽을 맡을까?</h2>' +
      '<p class="sub">둘이 하나씩 골라요.<br>보이는 게 서로 달라서, 본 걸 말로 알려 줘야 해요.</p>' +
      '<button class="role-btn inner" data-r="inner"><span class="ic">🌙</span><b>안쪽 연못</b><small>깊고 깜깜한 곳</small></button>' +
      '<button class="role-btn outer" data-r="outer"><span class="ic">☀️</span><b>바깥 연못</b><small>물 위 빛이 비치는 곳</small></button>' +
      '<button class="btn ghost small" data-act="back">‹ 처음으로</button></div>';
    app.onclick = function (e) {
      var r = e.target.closest('[data-r]'), back = e.target.closest('[data-act="back"]');
      if (back) { S = fresh(); save(); return showStart(); }
      if (!r) return;
      startAudio(); SFX.play('tap');
      S.role = r.dataset.r; S.view = S.role; S.stage = 'intro'; save(); showIntro();
    };
  }

  // ═════════ 들어가기 ═════════
  function showIntro() {
    cleanup();
    var lines = ['…', '여긴… 어디지?', '깜깜하고, 따뜻해.', '어디선가 누가 나를 부르는 것 같아.', '그 목소리를 찾아가 보자.'];
    var i = 0;
    app.innerHTML = '<div class="screen intro"><div class="glow"></div><p class="iline"></p><span class="more">›</span></div>';
    var el = $('.intro'), ln = $('.iline');
    function show() {
      ln.classList.remove('in'); void ln.offsetWidth;
      ln.textContent = lines[i]; ln.classList.add('in');
      el.style.setProperty('--g', (0.15 + i * 0.2).toFixed(2));
      SFX.play('bubble');
    }
    show();
    var ready = false; later(function () { ready = true; }, 700);
    app.onclick = function () {
      startAudio();
      if (!ready) return; ready = false; later(function () { ready = true; }, 600);
      i++;
      if (i < lines.length) show();
      else { S.stage = 'play'; S.ch = 1; save(); enterChapter(1); }
    };
  }

  // ═════════ 장 ═════════
  function enterChapter(n) {
    cleanup();
    S.stage = 'play'; S.ch = n; save();
    var card = h('div', 'card', '<p class="no">' + n + '장</p><p class="nm">' + CH[n].name + '</p>');
    renderPlay();
    document.body.appendChild(card);
    SFX.play('whoosh');
    var t0 = Date.now();
    function close() { if (Date.now() - t0 < 700) return; card.classList.add('out'); setTimeout(function () { card.remove(); }, 600); }
    card.onclick = close; setTimeout(close, 2400);
  }

  function renderPlay() {
    cleanup();
    repair();
    var n = S.ch, rs = roles();
    if (rs.indexOf(S.view) < 0) S.view = rs[0];
    var v = S.view;
    app.innerHTML = '<div class="screen play ' + v + '">' +
      '<header class="top"><span class="chap">' + n + '장' + (S.mode === 'one' ? '' : ' · ' + CH[n].name) + '</span><div class="tabs" id="tabs"></div>' +
      '<button class="hint" data-act="hint" aria-label="힌트">💡</button></header>' +
      '<div class="scene" id="scene"></div><p class="line" id="line"></p><section class="panel" id="panel"></section></div>';
    renderTabs();
    SFX.setHeart(n === 1 && v === 'inner' ? 1 : 0.3);
    SCENE[n][v]($('#scene'));
    // 안쪽 장면은 심장 소리가 나는 박자마다 화면이 살짝 두근(1장은 세게)
    if (v === 'inner') {
      var sc = $('#scene'); if (n > 1) sc.classList.add('soft');
      live.push(SFX.onBeat(function (k, vol) { if (!vol) return; sc.classList.remove('beat'); void sc.offsetWidth; sc.classList.add('beat'); }));
    }
    $('#line').textContent = LINES[n][v];
    // 한참 못 풀면 💡 가 살짝 반짝(글로 안내하진 않음)
    if (!roleDone(n, v)) later(function () { var hb = $('.hint'); if (hb) hb.classList.add('nudge'); }, 75000);
    renderPanel();
    autoNext(n, 1600);
    app.onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = b.dataset.act;
      if (a === 'hint') showHint();
      else if (a === 'tab') { if (b.dataset.v !== S.view) { S.view = b.dataset.v; save(); SFX.play('tap'); renderPlay(); } }
      else if (a === 'next') { SFX.play('tap'); enterChapter(S.ch + 1); }
      else if (a === 'open') { SFX.play('tap'); startEnding(); }
    };
  }
  function renderTabs() {
    var t = $('#tabs'); if (!t) return;
    if (S.mode === 'one') {
      t.innerHTML = ['inner', 'outer'].map(function (r) {
        return '<button class="tab ' + r + (S.view === r ? ' on' : '') + '" data-act="tab" data-v="' + r + '">' + ROLE[r].icon + ' ' + ROLE[r].name + (roleDone(S.ch, r) ? ' <i>✓</i>' : '') + '</button>';
      }).join('');
    } else t.innerHTML = '<span class="badge ' + S.role + '">' + ROLE[S.role].icon + ' ' + ROLE[S.role].name + '</span>';
  }
  // 자물쇠 칸 — 다 풀었으면 맨 위에 다음으로 가는 띠
  function renderPanel() {
    var p = $('#panel'); if (!p) return;
    p.innerHTML = '';
    var n = S.ch, v = S.view;
    if (roleDone(n, v)) p.appendChild(banner(n, v));
    PANEL[n][v](p);
  }
  function banner(n, v) {
    var b = h('div', 'banner');
    if (n === 4) {
      b.innerHTML = '<span>문이 스르르 열리려고 해…' + (S.mode === 'two' ? '<br><small>짝꿍이랑 "하나, 둘, 셋!" 하고 같이 눌러</small>' : '') + '</span><button class="btn main" data-act="open">문 열기</button>';
    } else if (S.mode === 'one') {
      var o = other(v);
      b.innerHTML = roleDone(n, o) ? '<span>✓ 둘 다 열렸어!</span><button class="btn main" data-act="next">다음 장 ›</button>' : '<span>✓ ' + ROLE[v].icon + ' ' + ROLE[v].name + '은 열렸어!</span><button class="btn" data-act="tab" data-v="' + o + '">' + ROLE[o].icon + ' ' + ROLE[o].name + ' 보기</button>';
    } else {
      b.innerHTML = '<span>✓ 이쪽은 다 됐어!<br><small>짝꿍도 다 되면 같이 넘어가자</small></span><button class="btn main" data-act="next">다음 장 ›</button>';
    }
    return b;
  }

  // 푼 건 그 자리에서 바로 저장한다 — 탭을 바꾸거나 새로고침해도 취소되지 않게(소리·다시 그리기만 delay 뒤에)
  function solve(key, delay) {
    if (S.done[key]) return;
    S.done[key] = true; save();
    var n = S.ch;
    setTimeout(function () {
      if (S.stage !== 'play' || S.ch !== n) return;
      SFX.play('solve'); SFX.vibrate([30, 40, 30]);
      renderTabs(); renderPanel();
    }, delay || 0);
    autoNext(n, (delay || 0) + 1600);
  }
  // 폰 한 대: 둘 다 풀면 다음 장으로(탭을 바꿔도 취소되지 않게, 띠에도 단추가 있음)
  function autoNext(n, ms) {
    if (!(n < 4 && S.mode === 'one' && chDone(n))) return;
    setTimeout(function () {
      if (S.stage !== 'play' || S.ch !== n) return;
      if ($('.card')) return autoNext(n, 700); // 장 카드가 걷힌 뒤에
      enterChapter(n + 1);
    }, ms);
  }
  // 저장된 진행으로 이미 끝난 일은 끝난 걸로(예전에 중간에 끊긴 진행 살리기)
  function repair() {
    var f = false, set = function (k) { if (!S.done[k]) { S.done[k] = true; f = true; } };
    if (S.ate >= N2) set('c2i');
    if (S.faces && S.faces.slice(0, N2).join() === P.ch2.faces.join()) set('c2o');
    if (S.heard.length >= 3) set('c3o');
    if (S.done.c4d && S.untied.length < 4) { S.untied = [0, 1, 2, 3]; f = true; }
    if (S.untied.length >= 4) set('c4k');
    if (f) save();
  }
  function wrong(el) {
    SFX.play('wrong'); SFX.vibrate(80);
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }

  // ── 힌트 ──
  function showHint() {
    var list = HINTS[S.ch][S.view];
    var m = h('div', 'modal', '<div class="box"><h3>💡 힌트</h3><p>' + list[0] + '</p><p class="h2" hidden>' + list[1] + '</p>' +
      '<div class="row"><button class="btn" data-k="more">더 알려 줘</button><button class="btn main" data-k="x">알겠어</button></div></div>');
    document.body.appendChild(m);
    SFX.play('tap');
    m.onclick = function (e) {
      var k = e.target.closest('[data-k]');
      if (e.target === m || (k && k.dataset.k === 'x')) return m.remove();
      if (k && k.dataset.k === 'more') { $('.h2', m).hidden = false; k.remove(); SFX.play('tap'); }
    };
  }

  // ═════════ 자물쇠 부품 ═════════
  // 숫자 바퀴 — 위로 밀면 +1, 아래로 밀면 -1 (▲▼ 눌러도)
  function wheels(labels, answer, onOpen, opt) {
    opt = opt || {};
    var open = !!opt.open, vals = labels.map(function () { return 0; });
    if (open) vals = String(answer).split('').map(Number);
    var el = h('div', 'lock wheels' + (open ? ' open' : ''));
    labels.forEach(function (lb, i) {
      if (opt.sep && opt.sep[i]) el.appendChild(h('span', 'sep', opt.sep[i]));
      var w = h('div', 'wheel', '<div class="wl">' + lb + '</div><button class="up" aria-label="올리기">▲</button><div class="wv">' + vals[i] + '</div><button class="dn" aria-label="내리기">▼</button>');
      el.appendChild(w);
      var set = function (d) {
        if (open) return;
        vals[i] = (vals[i] + d + 10) % 10; $('.wv', w).textContent = vals[i];
        SFX.play('tick');
        if (vals.join('') === String(answer)) { open = true; el.classList.add('open'); onOpen(); }
      };
      $('.up', w).onclick = function (e) { e.stopPropagation(); set(1); };
      $('.dn', w).onclick = function (e) { e.stopPropagation(); set(-1); };
      var y0 = null, acc = 0, face = $('.wv', w);
      face.addEventListener('pointerdown', function (e) { y0 = e.clientY; acc = 0; face.setPointerCapture(e.pointerId); });
      face.addEventListener('pointermove', function (e) {
        if (y0 == null) return; var dy = y0 - e.clientY;
        while (dy - acc > 28) { acc += 28; set(1); }
        while (dy - acc < -28) { acc -= 28; set(-1); }
      });
      face.addEventListener('pointerup', function () { y0 = null; });
      face.addEventListener('pointercancel', function () { y0 = null; });
    });
    return el;
  }

  // ═════════ 장면 · 자물쇠 ═════════
  var SCENE = {}, PANEL = {};

  // ── 1장 어둠 ──
  SCENE[1] = {
    inner: function (el) {
      el.innerHTML = ART.svg(ART.water('inner') + ART.shells() + ART.me(180, 160, 1.7, 0));
      var seq = [];
      P.ch1.shells.forEach(function (n, i) { for (var k = 0; k < n; k++) seq.push(i); seq.push(-1, -1); });
      seq.push(-1, -1);
      // 쿵 한 번 = 반짝 한 번. 조개가 쉬는 박자엔 심장 소리도 쉰다(소리와 빛이 같은 박자 번호로)
      var sh = $$('.shell', el);
      var myGen = SFX.pattern(function (k) { return seq[k % seq.length] >= 0 ? 1 : 0; }, { single: true });
      live.push(function () { SFX.pattern(null); });
      live.push(SFX.onBeat(function (k, v, g) {
        if (g !== myGen || !v) return;
        var s = seq[k % seq.length];
        sh[s].classList.add('lit'); setTimeout(function () { sh[s].classList.remove('lit'); }, 450);
        SFX.vibrate(30);
      }));
    },
    outer: function (el) {
      el.innerHTML = ART.svg(ART.water('outer') + ART.me(180, 300, 1.05, 0)) + '<div class="hand">' + HAND + '</div>';
      var hand = $('.hand', el), V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, i = 0;
      function stroke() {
        var d = V[P.ch1.strokes[i % 4]];
        hand.style.transition = 'none'; hand.style.opacity = 0;
        hand.style.transform = 'translate(' + (-d[0] * 60) + '%,' + (-d[1] * 60) + '%)';
        void hand.offsetWidth;
        hand.style.transition = 'transform 1.8s ease-in-out, opacity .45s';
        hand.style.opacity = 1; hand.style.transform = 'translate(' + (d[0] * 60) + '%,' + (d[1] * 60) + '%)';
        later(function () { hand.style.opacity = 0; }, 1400);
        i++;
        later(stroke, i % 4 === 0 ? 4400 : 2300);
      }
      later(stroke, 700);
    },
  };
  PANEL[1] = {
    outer: function (p) {
      p.appendChild(wheels(PUZ.SHAPES, P.ch1.outer, function () { solve('c1o', 250); }, { open: S.done.c1o }));
    },
    inner: function (p) {
      var ans = P.ch1.strokes, got = [], done = S.done.c1i;
      var pad = h('div', 'lock pad' + (done ? ' open' : ''), '<div class="slots">' + ans.map(function (d) { return '<span class="slot">' + (done ? PUZ.DIRS[d] : '') + '</span>'; }).join('') + '</div><p class="padtip">〰 쓱 밀어서 헤엄치기</p>');
      p.appendChild(pad);
      if (done) return;
      var x0 = null, y0 = null;
      pad.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; pad.setPointerCapture(e.pointerId); });
      pad.addEventListener('pointerup', function (e) {
        if (x0 == null) return;
        var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
        var d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        got.push(d); SFX.play('bubble');
        var slots = $$('.slot', pad); slots[got.length - 1].textContent = PUZ.DIRS[d];
        if (got.length === ans.length) {
          if (got.join() === ans.join()) { pad.classList.add('open'); solve('c1i', 250); }
          else { wrong(pad); got = []; setTimeout(function () { slots.forEach(function (s) { s.textContent = ''; }); }, 450); }
        }
      });
    },
  };

  // ── 2장 떠내려오는 것들 ──
  // 🌙 안쪽: 위에서 여러 음식이 떠내려온다. 맨 위 시간(아침→새벽)에 엄마가 먹는 음식을 눌러 받아먹으면 표정이 나온다.
  // ☀️ 바깥: 시간마다 엄마 식탁의 음식 그림자가 보인다 → 안쪽에 알려 주고, 안쪽이 본 표정을 일기에 맞춘다.
  var N2 = P.ch2.times.length, TIMES2 = P.ch2.times;
  var TIME_ON = function () { return TIMES2[Math.min(S.ate, N2 - 1)]; };
  SCENE[2] = {
    inner: function (el) {
      el.innerHTML = ART.svg(ART.water('inner')) + '<div class="feed"><div class="nowtime"></div><div class="drift"></div>' +
        '<div class="me-dom">' + ART.meSvg(1) + '</div><div class="react"></div></div>';
      var box = $('.drift', el), me = $('.me-dom', el), react = $('.react', el), now = $('.nowtime', el);
      var HOME = [50, 80], busy = false, sinceTarget = 0;
      function showNow() {
        now.innerHTML = S.ate >= N2 ? '배불러 😊' : PUZ.TIME_ICON[TIME_ON()] + ' ' + TIME_ON() +
          '<span class="dots">' + TIMES2.map(function (t, i) { return '<i' + (i < S.ate ? ' class="on"' : '') + '></i>'; }).join('') + '</span>';
      }
      function place(x, y) { me.style.left = x + '%'; me.style.top = y + '%'; }
      place(HOME[0], HOME[1]); showNow();
      function pop(html, cls) {
        react.className = 'react ' + (cls || ''); react.innerHTML = html;
        react.style.left = me.style.left; react.style.top = me.style.top;
        void react.offsetWidth; react.classList.add('in');
      }
      // 떠내려오는 음식 — 지금 찾는 음식은 세 번에 한 번은 꼭
      function spawn() {
        if (S.ate >= N2) return;
        var want = P.ch2.foods[P.ch2.timeOrder[S.ate]];
        var pool = P.ch2.foods.filter(function (f) { return f !== want; }).map(function (f) { return { f: f }; })
          .concat(P.ch2.others.map(function (e) { return { e: e }; }));
        var pickWant = sinceTarget >= 2 || Math.random() < 0.38;
        var it = pickWant ? { f: want } : pool[Math.floor(Math.random() * pool.length)];
        sinceTarget = pickWant ? 0 : sinceTarget + 1;
        var d = h('button', 'fall2', it.f ? foodHtml(it.f, 'fd') : '<span class="fd">' + it.e + '</span>');
        if (it.f) d.dataset.i = it.f.i; else d.dataset.e = it.e;
        d.style.left = (12 + Math.random() * 76) + '%';
        d.addEventListener('animationend', function () { d.remove(); });
        d.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); grab(d); });
        box.appendChild(d);
        later(spawn, 1050);
      }
      // 눌렀다 → 주인공이 헤엄쳐 가서(0.35초) 닿는 순간 소리
      function grab(d) {
        if (busy || S.ate >= N2) return;
        busy = true; SFX.play('bubble'); // 누르는 순간 '휙', 닿는 순간 '냠'
        d.style.animationPlayState = 'paused';
        var r = el.getBoundingClientRect(), q = d.getBoundingClientRect();
        var x = (q.left + q.width / 2 - r.left) / r.width * 100, y = (q.top + q.height / 2 - r.top) / r.height * 100;
        place(x, y + 4);
        var want = P.ch2.foods[P.ch2.timeOrder[S.ate]], ok = d.dataset.i != null && +d.dataset.i === want.i;
        later(function () {
          if (ok) {
            d.remove(); SFX.play('yum');
            var t = PUZ.taste(want.taste);
            S.ate++; save();
            pop('<span class="rface">' + t.face + '</span><b>' + t.say + '</b>', 'good');
            showNow(); renderPanel();
            if (S.ate >= N2) solve('c2i', 900);
          } else {
            d.style.animationPlayState = 'running'; d.classList.add('nope'); SFX.play('nope');
            if (d.dataset.e && P.ch2.yuck.indexOf(d.dataset.e) >= 0) pop('<span class="rface">🤢</span><b>웩! 이건 싫어</b>', 'bad');
            else pop('<b>이건 지금 아니야…</b>', 'bad');
          }
          later(function () { place(HOME[0], HOME[1]); busy = false; }, ok ? 1300 : 650);
        }, 360);
      }
      live.push(function () { box.innerHTML = ''; });
      if (S.ate < N2) later(spawn, 400);
    },
    outer: function (el) {
      el.innerHTML = ART.svg(ART.water('outer') + ART.me(180, 322, 0.9, 1)) +
        '<div class="meals n' + N2 + '">' + TIMES2.map(function (t) {
          var f = P.ch2.foods.filter(function (x) { return x.time === t; })[0];
          return '<div class="meal"><b>' + PUZ.TIME_ICON[t] + ' ' + t + '</b>' + foodHtml(f, 'sil') + '</div>';
        }).join('') + '</div>';
    },
  };
  PANEL[2] = {
    // 🌙 받아먹은 기록 — 바깥에 알려 줄 표정이 여기 남는다
    inner: function (p) {
      var lk = h('div', 'lock diary' + (S.done.c2i ? ' open' : ''));
      lk.innerHTML = TIMES2.map(function (t, i) {
        var f = P.ch2.foods[P.ch2.timeOrder[i]], got = i < S.ate, ta = PUZ.taste(f.taste);
        return '<div class="drow' + (i === S.ate ? ' cur' : '') + (got ? ' got' : '') + '"><i>' + PUZ.TIME_ICON[t] + '</i><span class="dt">' + t + '</span>' +
          '<span class="df">' + (got ? foodHtml(f, 'sf') : '') + '</span><span class="dface">' + (got ? ta.face + ' <small>' + ta.say + '</small>' : '') + '</span></div>';
      }).join('');
      p.appendChild(lk);
    },
    // ☀️ 표정 일기 — 얼굴을 누를 때마다 바뀜
    outer: function (p) {
      var done = S.done.c2o, T = PUZ.TASTES.filter(function (t) { return P.ch2.faces.indexOf(t.id) >= 0; });
      var lk = h('div', 'lock diary faces' + (done ? ' open' : ''));
      function face(i) { var id = done ? P.ch2.faces[i] : S.faces[i]; var t = id && PUZ.taste(id); return t ? t.face + ' <small>' + t.id + '</small>' : '❔'; }
      lk.innerHTML = TIMES2.map(function (t, i) {
        var f = P.ch2.foods[P.ch2.timeOrder[i]];
        return '<div class="drow"><i>' + PUZ.TIME_ICON[t] + '</i><span class="dt">' + t + '</span><span class="df">' + foodHtml(f, 'sil sm') + '</span>' +
          '<button class="fbtn" data-i="' + i + '">' + face(i) + '</button></div>';
      }).join('');
      p.appendChild(lk);
      if (done) return;
      lk.onclick = function (e) {
        var b = e.target.closest('.fbtn'); if (!b) return;
        e.stopPropagation();
        var i = +b.dataset.i, cur = T.map(function (t) { return t.id; }).indexOf(S.faces[i]);
        S.faces[i] = T[(cur + 1) % T.length].id; save();
        b.innerHTML = face(i); SFX.play('tick');
        if (S.faces.slice(0, N2).join() === P.ch2.faces.join()) { lk.classList.add('open'); solve('c2o', 300); }
      };
    },
  };

  // ── 3장 물 밖의 목소리 ──
  SCENE[3] = {
    inner: function (el) {
      el.innerHTML = ART.svg(ART.water('inner') + ART.warmSpots(P.ch3.stations) + ART.me(200, 292, 1.3, 2));
    },
    outer: function (el) {
      el.innerHTML = ART.svg(ART.water('outer') + ART.me(180, 318, 0.95, 2)) +
        '<div class="radio"><p class="vsub" id="sub">치지직…</p><div class="heard" id="heard"></div></div>';
      drawHeard();
    },
  };
  function drawHeard() {
    var e = $('#heard'); if (!e) return;
    e.innerHTML = [0, 1, 2].map(function (i) { return '<span class="hd' + (S.heard.indexOf(i) >= 0 ? ' on' : '') + '"></span>'; }).join('');
  }
  var dialVal = 0;
  function garble(t, seed) {
    var out = '', k = seed;
    for (var i = 0; i < t.length; i++) { k = (k * 31 + 7) % 97; out += t[i] === ' ' ? ' ' : (k % 3 ? '·' : t[i]); }
    return out;
  }
  PANEL[3] = {
    inner: function (p) {
      var done = S.done.c3i, keys = P.ch3.keys, picked = done ? keys.slice() : [];
      var lk = h('div', 'lock words' + (done ? ' open' : ''));
      lk.innerHTML = P.ch3.words.map(function (w) { return '<button class="word' + (picked.indexOf(w) >= 0 ? ' on' : '') + '">' + esc(w) + '</button>'; }).join('');
      p.appendChild(lk);
      if (done) return;
      lk.onclick = function (e) {
        var b = e.target.closest('.word'); if (!b) return;
        e.stopPropagation();
        var w = b.textContent, at = picked.indexOf(w);
        if (at >= 0) { picked.splice(at, 1); b.classList.remove('on'); SFX.play('tap'); return; }
        picked.push(w); b.classList.add('on'); SFX.play('pluck');
        if (picked.length === keys.length) {
          if (PUZ.sameSet(picked, keys)) { lk.classList.add('open'); solve('c3i', 250); }
          else { wrong(lk); picked = []; setTimeout(function () { $$('.word', lk).forEach(function (x) { x.classList.remove('on'); }); }, 450); }
        }
      };
    },
    outer: function (p) {
      var val = dialVal, cur = null, dwell = null;
      var lk = h('div', 'lock dial' + (S.done.c3o ? ' open' : ''), '<button class="dbtn" data-d="-1">‹</button><div class="dnum">0</div><button class="dbtn" data-d="1">›</button>' +
        '<input type="range" min="0" max="9" step="1" value="0" class="drange" aria-label="다이얼">');
      p.appendChild(lk);
      var num = $('.dnum', lk), rg = $('.drange', lk);
      num.textContent = val; rg.value = val;

      function stop() { if (cur) { cur.stop(); cur = null; } clearTimeout(dwell); }
      live.push(stop);
      function play(i, clarity) {
        stop();
        var v = B.voices[i];
        cur = v.audio ? SFX.voiceFile(v.audio, clarity) : SFX.babble(Math.min(28, v.text.replace(/\s/g, '').length), clarity);
      }
      function tune(n) {
        val = dialVal = n; num.textContent = n; rg.value = n;
        SFX.play('tick');
        stop();
        var sub = $('#sub'); if (!sub) return;
        var at = P.ch3.stations.indexOf(n);
        var near = -1; P.ch3.stations.forEach(function (s, i) { if (Math.abs(s - n) === 1) near = i; });
        sub.classList.remove('clear', 'near');
        if (at >= 0) {
          var v = B.voices[at];
          sub.innerHTML = '…';
          dwell = setTimeout(function () {
            sub.classList.add('clear');
            sub.innerHTML = '<span>“' + esc(v.text).replace(esc(v.key), '<mark>' + esc(v.key) + '</mark>') + '”</span>';
            play(at, 1);
            if (S.heard.indexOf(at) < 0) { S.heard.push(at); save(); drawHeard(); SFX.play('sparkle'); }
            if (S.heard.length >= 3) solve('c3o', 900);
          }, 450);
        } else if (near >= 0) {
          sub.classList.add('near');
          sub.textContent = garble(B.voices[near].text, n + 3);
          dwell = setTimeout(function () { play(near, 0.12); }, 300);
        } else {
          sub.textContent = '치지직…';
          SFX.play('static');
        }
      }
      lk.onclick = function (e) { var b = e.target.closest('.dbtn'); if (!b) return; e.stopPropagation(); tune((val + +b.dataset.d + 10) % 10); };
      rg.oninput = function () { if (+rg.value !== val) tune(+rg.value); };
      var sub = $('#sub'); if (sub) sub.onclick = function () { if (P.ch3.stations.indexOf(val) >= 0) tune(val); };
    },
  };

  // ── 4장 긴 줄 ──
  SCENE[4] = {
    inner: function (el) {
      el.innerHTML = ART.svg(ART.water('inner') + ART.cord() + ART.me(150, 314, 1.2, 3)) + '<div class="knots"></div>';
      var box = $('.knots', el);
      ART.KNOTS.forEach(function (pt, k) {
        var pos = P.ch4.beads[k], col = COL[P.ch4.colorOf[pos]], dig = P.ch4.digits[pos];
        var kn = h('div', 'knot');
        kn.style.left = (pt[0] / 3.6) + '%'; kn.style.top = (pt[1] / 3.6) + '%';
        var bead = '<span class="bead" style="--c:' + col.hex + '">' + dig + '</span>';
        var tangle = '<svg viewBox="-30 -30 60 60" class="tangle"><g><path d="M-18 -4 C-10 -22 14 -18 10 -2 C6 12 -14 10 -10 -6 C-6 -20 20 -10 16 6 C12 20 -16 18 -18 -4Z" stroke="#e8a3a0" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-12 8 C0 -14 16 2 4 12" stroke="#ffd0c8" stroke-width="2.5" fill="none" opacity=".7"/></g></svg>';
        kn.innerHTML = S.untied.indexOf(k) >= 0 ? bead : tangle;
        box.appendChild(kn);
        if (S.untied.indexOf(k) >= 0) return;
        var last = null, dist = 0, tick = 0;
        kn.addEventListener('pointerdown', function (e) { last = [e.clientX, e.clientY]; kn.setPointerCapture(e.pointerId); kn.classList.add('rub'); });
        kn.addEventListener('pointermove', function (e) {
          if (!last || S.untied.indexOf(k) >= 0) return;
          dist += Math.hypot(e.clientX - last[0], e.clientY - last[1]); last = [e.clientX, e.clientY];
          if (dist - tick > 60) { tick = dist; SFX.play('pluck'); }
          kn.style.setProperty('--loose', Math.min(1, dist / 320).toFixed(2));
          if (dist > 320) {
            S.untied.push(k); save(); last = null;
            kn.classList.remove('rub'); kn.classList.add('freed'); kn.innerHTML = bead; SFX.play('knot');
            if (S.untied.length >= 4) solve('c4k');
          }
        });
        var up = function () { last = null; kn.classList.remove('rub'); };
        kn.addEventListener('pointerup', up); kn.addEventListener('pointercancel', up);
        kn.free = function () { last = null; kn.classList.remove('rub'); kn.classList.add('freed'); kn.innerHTML = bead; };
      });
      // 문 날짜를 먼저 맞히면 남은 매듭이 하나씩 스르르 풀린다
      el.freeAll = function (ks) {
        var kns = $$('.knot', box);
        ks.forEach(function (k, j) { setTimeout(function () { if (kns[k] && kns[k].free) { kns[k].free(); SFX.play('knot'); } }, 200 + j * 220); });
      };
    },
    outer: function (el) {
      el.innerHTML = ART.svg(ART.water('outer') + ART.door(P.ch4.digits.map(function (d, i) { return COL[P.ch4.colorOf[i]].hex; }), B.doorText));
    },
  };
  function doorLock(p) {
    p.appendChild(wheels(['', '', '', ''], P.ch4.answer, function () {
      var rest = [0, 1, 2, 3].filter(function (k) { return S.untied.indexOf(k) < 0; });
      if (rest.length) {
        S.untied = S.untied.concat(rest); S.done.c4k = true;
        var sc = $('#scene'); if (S.view === 'inner' && sc && sc.freeAll) sc.freeAll(rest);
      }
      solve('c4d', 250);
    }, { open: S.done.c4d, sep: { 2: '월' } }));
    var last = $$('.lock.wheels', p).pop(); if (last) last.appendChild(h('span', 'sep', '일'));
  }
  PANEL[4] = { inner: doorLock, outer: doorLock };

  // ═════════ 엔딩 ═════════
  var endMusic = null;
  function startMusic() {
    if (endMusic) return;
    SFX.ambient(false); SFX.setHeart(0);
    endMusic = B.song ? SFX.song(B.song, { loop: B.songLoop, gain: 0.9 }) : SFX.melody('box', { gain: 0.55 });
  }
  function startEnding() { S.stage = 'ending'; S.ending = 0; save(); runEnding(0); }

  var whos = B.voices.map(function (v) { return v.who; });
  var MEM = [
    { art: '<svg viewBox="0 0 100 90" class="memheart"><g><path d="M50 82 C20 60 5 42 5 26 C5 12 16 4 28 4 C38 4 46 10 50 18 C54 10 62 4 72 4 C84 4 95 12 95 26 C95 42 80 60 50 82Z" fill="#ff8a7a"/></g></svg>',
      lead: '쿵쿵, 쿵쿵.<br>그 커다란 소리는', truth: '엄마 심장 소리였어.', beat: true },
    { art: '<div class="memhand">' + HAND + '</div>', lead: '물 위로 지나가던<br>따뜻한 그림자는', truth: '엄마 배를 쓰다듬던<br>아빠 손이었어.' },
    { art: '<div class="memfood">' + P.ch2.foods.map(function (f) { return foodHtml(f, 'mf'); }).join('') + '</div>', lead: '둥둥 떠내려오던<br>맛있는 것들은', truth: '엄마가 먹고 싶다던<br>것들이었어.', small: B.foodNote },
    { art: '<div class="memwho">' + whos.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join('') + '</div>', lead: '물 밖에서 들리던<br>목소리들은', truth: '나를 기다리는<br>사람들 목소리였어.' },
    { art: '<svg viewBox="0 0 200 110" class="memcord"><g><circle cx="52" cy="58" r="40" fill="#ffd9c4"/><path d="M80 66 C110 90 130 30 160 58" stroke="#e8a3a0" stroke-width="7" fill="none" stroke-linecap="round"/>' + ART.me(166, 58, 1, 3) + '</g></svg>',
      lead: '나랑 이어진<br>긴 줄은', truth: '엄마랑 나를<br>이어 준 줄이었어.', small: [B.dateText + josa(B.dateText, '은', '는') + ',', B.dateMeaning + '.'] },
  ];

  var STEPS = [];
  // 0. 문이 열리고 빛
  STEPS.push({ wait: 99999, run: function (el) {
    el.classList.add('light');
    el.innerHTML = '<div class="burst"></div>';
    SFX.play('door'); SFX.play('whoosh');
    later(next, 2800);
  } });
  // 1. 어두운 곳에서 밝은 곳으로 나온 바로 그 순간 — 작은 별 노래가 시작되고, 이름이 처음 불린다
  STEPS.push({ wait: 4200, run: function (el) {
    el.classList.add('white');
    startMusic();
    el.innerHTML = '<p class="call">' + esc(B.call) + '.</p><p class="who w1">' + esc(B.name) + '…?</p><p class="who w2">그게… 나야?</p>';
    if (B.callAudio) later(function () { SFX.track(B.callAudio); }, 500);
  } });
  // 2~6. 되감기
  MEM.forEach(function (m) {
    STEPS.push({ wait: 2300, run: function (el) {
      el.innerHTML = '<div class="mem"><div class="memart">' + m.art + '</div><p class="lead">' + m.lead + '</p><p class="truth">' + m.truth + '</p>' + (m.small ? '<p class="memsmall">' + [].concat(m.small).map(esc).join('<br>') + '</p>' : '') + '</div>';
      if (m.beat) live.push(SFX.onBeat(function () { var a = $('.memheart', el); if (a) { a.classList.remove('b'); void a.getBoundingClientRect(); a.classList.add('b'); } }));
      SFX.setHeart(m.beat ? 1 : 0.15);
    } });
  });
  // 7. 안쪽과 바깥
  STEPS.push({ wait: 3000, run: function (el) {
    SFX.setHeart(0.15);
    el.innerHTML = '<div class="duo"><p class="d1">🌙 안쪽은<br><b>엄마가 나를 품어 준 세상</b></p><p class="d2">☀️ 바깥은<br><b>아빠와 모두가 나를 기다리는 세상</b></p><p class="d3">우리는 처음부터, 같이 있었어.</p></div>';
  } });
  // 8. 동그란 주인공이 환해지고 → 번쩍 → 초음파 사진(폰마다 사진 한 장 통째로)
  STEPS.push({ wait: 6200, run: function (el) {
    var pic = B.ultrasound ? '<img src="' + esc(B.ultrasound) + '" alt="" draggable="false">' : ART.ultrasound();
    el.innerHTML = '<div class="morph"><div class="mp">' + ART.svg(ART.water('inner') + ART.me(180, 180, 2.4, 3)) + '</div>' +
      '<div class="us whole"><div class="ui">' + pic + '</div></div></div><div class="flash"></div>' +
      '<p class="cap c2">엄마, 아빠.<br>나 여기 있어.</p>';
    later(function () { el.classList.add('m1'); SFX.play('sparkle'); }, 1300);
    later(function () { el.classList.add('m2'); SFX.play('sparkle'); }, 3000);
    later(function () { el.classList.add('m3'); }, 4600);
  } });
  // 9. 편지
  STEPS.push({ wait: B.letter.length * 900 + 1600, run: function (el) {
    startMusic();
    el.innerHTML = '<div class="letter">' + B.letter.map(function (l, i) { return '<p style="animation-delay:' + (i * 0.9 + 0.3).toFixed(1) + 's">' + esc(l) + '</p>'; }).join('') +
      '<p class="sign" style="animation-delay:' + (B.letter.length * 0.9 + 0.6).toFixed(1) + 's">— ' + esc(B.name) + ' 🐸</p></div>';
  } });
  // 10. 빙고 단서 (마지막) — 여기서 오프라인 빙고로
  STEPS.push({ wait: 1000, final: true, run: function (el) {
    startMusic();
    var b = B.bingo;
    el.innerHTML = '<div class="bingo"><p class="b1">' + esc(b.lead) + '</p><p class="b2">' + esc(b.where) + '</p>' +
      '<div class="bphoto">' + (b.photo ? '<img src="' + esc(b.photo) + '" alt="" draggable="false">' : '<span>?</span>') + '</div>' +
      '<p class="riddle">' + esc(b.riddle) + '</p><p class="rule">' + esc(b.rule) + ' 🐸</p>' +
      '<div class="row"><button class="btn ghost small" data-act="letter" type="button">편지 다시 보기</button></div></div>';
    el.onclick = function (e) { if (e.target.closest('[data-act="letter"]')) { SFX.play('tap'); runEnding(9); } };
  } });

  var stepAt = 0;
  function next() { if (stepAt + 1 < STEPS.length) runEnding(stepAt + 1); }
  function runEnding(i) {
    cleanup();
    stepAt = i; S.stage = 'ending'; S.ending = i; save();
    var oldCard = $('.card'); if (oldCard) oldCard.remove();
    app.innerHTML = '<div class="screen ending" id="end"></div><span class="more end-more">›</span>';
    var el = $('#end'), st = STEPS[i], ready = false;
    if (i >= 1) startMusic(); // 밝은 곳으로 나온 뒤(1단계)부터 끝까지
    app.onclick = function (e) {
      if (e.target.closest('button')) return;
      if (ready && !st.final) { SFX.play('tap'); next(); }
    };
    st.run(el);
    later(function () { ready = true; if (!st.final) app.classList.add('ready'); }, st.wait);
    app.classList.remove('ready');
  }

  // ── 시험용 손잡이 (콘솔·자동 플레이) ──
  window.__game = {
    state: function () { return JSON.parse(JSON.stringify(S)); },
    answers: P,
    solve: solve,
    go: function (n) { S.stage = 'play'; enterChapter(n); },
    ending: function (i) { runEnding(i || 0); },
    reset: function () { S = fresh(); save(); showStart(); },
    audio: startAudio,
  };

  // 확대·두 손가락 막기
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  showStart();
})();
