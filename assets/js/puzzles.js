// 작은 연못 — 퍼즐 정답은 전부 여기서 config.js 를 보고 계산한다 (브라우저·node 둘 다)
(function (root, make) {
  if (typeof module === 'object' && module.exports) module.exports = make();
  else root.PUZ = make();
})(this, function () {
  'use strict';
  // 2장 시간 칸 — 음식 수에 맞춰(세 가지면 아침·낮·밤, 네 가지면 아침·낮·저녁·새벽). config 의 times 로 바꿀 수도 있음
  var TIMES = ['아침', '낮', '저녁', '새벽'];
  var TIMES3 = ['아침', '낮', '밤'];
  var TIME_ICON = { 아침: '🌅', 낮: '☀️', 점심: '☀️', 저녁: '🌇', 밤: '🌙', 새벽: '🌙' };
  function timesFor(B) { return B.times || ((B.foods || []).length === 3 ? TIMES3 : TIMES); }
  // 성별을 떠올리게 하는 파랑·분홍은 일부러 뺐다
  var COLORS = [
    { id: 'yellow', name: '노랑', hex: '#f6c945' },
    { id: 'green', name: '초록', hex: '#5fc27e' },
    { id: 'purple', name: '보라', hex: '#a97de6' },
    { id: 'orange', name: '주황', hex: '#f28a3d' },
  ];
  var DIRS = { up: '↑', down: '↓', left: '←', right: '→' };
  // 2장 — 받아먹었을 때 표정
  var TASTES = [
    { id: '달콤', face: '😋', say: '달콤해!' },
    { id: '새콤', face: '😖', say: '새콤해!' },
    { id: '매콤', face: '🥵', say: '매워!' },
    { id: '시원', face: '🥶', say: '시원해!' },
    { id: '고소', face: '🤤', say: '고소해!' },
  ];
  var taste = function (id) { return TASTES.filter(function (t) { return t.id === id; })[0]; };
  var SHAPES = ['◯', '△', '□'];

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function shuffle(a, r) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function build(B) {
    var r = rng(20261117);
    var foods = B.foods.map(function (f, i) { return Object.assign({ i: i }, f); });
    var times = timesFor(B);
    var timeOrder = foods.slice().sort(function (a, b) { return times.indexOf(a.time) - times.indexOf(b.time); }).map(function (f) { return f.i; });
    var keys = B.voices.map(function (v) { return v.key; });
    var words = shuffle(keys.concat(B.decoys.slice(0, 5)), r);
    var digits = String(B.date).split('').map(Number);
    var colorOf = shuffle([0, 1, 2, 3], r);           // 날짜 i 번째 숫자 → 구슬 색
    var beads = shuffle([0, 1, 2, 3], r);             // 줄 위에 매듭이 놓인 순서(날짜 자리)
    return {
      ch1: { shells: B.shells.slice(), strokes: B.strokes.slice(), outer: B.shells.join(''), inner: B.strokes.join(',') },
      // 🌙 안쪽: 시간 순서대로 그때 음식을 받아먹기 · ☀️ 바깥: 시간마다 표정 고르기
      ch2: { foods: foods, times: times, timeOrder: timeOrder, yuck: B.yuck || [], others: (B.others || []).filter(function (e) { return !foods.some(function (f) { return f.emoji === e; }); }),
        faces: timeOrder.map(function (i) { return foods[i].taste; }) },
      ch3: { stations: B.voices.map(function (v) { return v.station; }), keys: keys, words: words },
      ch4: { digits: digits, colorOf: colorOf, beads: beads, answer: String(B.date) },
    };
  }

  // 자물쇠 맞는지
  var same = function (a, b) { return String(a) === String(b); };
  var sameSet = function (a, b) { return a.length === b.length && a.every(function (x) { return b.indexOf(x) >= 0; }); };

  // config 가 퍼즐로 쓸 수 있는지 — 문제 목록(빈 배열이면 통과)
  function validate(B) {
    var bad = [];
    var need = function (ok, msg) { if (!ok) bad.push(msg); };
    need(B.name && B.call, '태명(name)·부르는 말(call)이 비었어요');
    need(Array.isArray(B.shells) && B.shells.length === 3 && B.shells.every(function (n) { return n >= 1 && n <= 9 && n === Math.floor(n); }), 'shells 는 1~9 숫자 세 개');
    need(Array.isArray(B.strokes) && B.strokes.length === 4 && B.strokes.every(function (d) { return DIRS[d]; }), 'strokes 는 up/down/left/right 네 개');
    need(B.strokes && new Set(B.strokes).size >= 3, 'strokes 는 적어도 세 방향을 섞어 주세요');
    need(Array.isArray(B.foods) && (B.foods.length === 3 || B.foods.length === 4), '음식은 세 가지나 네 가지');
    if (Array.isArray(B.foods)) {
      need(sameSet(B.foods.map(function (f) { return f.time; }), timesFor(B)), '음식 time 은 ' + timesFor(B).join('·') + ' 하나씩');
      B.foods.forEach(function (f, i) {
        need(taste(f.taste), (i + 1) + '번째 음식 taste 는 ' + TASTES.map(function (t) { return t.id; }).join('·') + ' 중 하나');
        need(f.emoji || f.img, (i + 1) + '번째 음식에 emoji 나 img 가 있어야 해요');
        need(f.name, (i + 1) + '번째 음식 이름이 비었어요');
      });
      need(new Set(B.foods.map(function (f) { return f.name; })).size === B.foods.length, '음식 이름이 겹쳐요');
      need(new Set(B.foods.map(function (f) { return f.taste; })).size === B.foods.length, '음식 taste(표정)가 겹쳐요 — 서로 다르게');
      need(Array.isArray(B.others) && B.others.length >= 3, '같이 떠내려오는 다른 음식(others)은 세 개 이상');
    }
    need(Array.isArray(B.voices) && B.voices.length === 3, '목소리는 세 개');
    if (Array.isArray(B.voices)) {
      var st = B.voices.map(function (v) { return v.station; });
      need(st.every(function (n) { return n >= 1 && n <= 9; }) && new Set(st).size === 3, '목소리 station 은 1~9 서로 다르게');
      B.voices.forEach(function (v, i) {
        need(v.text && v.key && v.text.indexOf(v.key) >= 0, (i + 1) + '번째 목소리: key 가 text 안에 그대로 있어야 해요');
        need(v.text.indexOf(B.name) < 0 && v.text.indexOf(B.call) < 0, (i + 1) + '번째 목소리에 태명이 들어 있어요 — 엔딩 전에 들켜요');
        need(v.who, (i + 1) + '번째 목소리 who(누구 목소리) 가 비었어요');
      });
      need(new Set(B.voices.map(function (v) { return v.key; })).size === 3, '목소리 key 가 겹쳐요');
      need(Array.isArray(B.decoys) && B.decoys.length >= 5, '가짜 낱말(decoys)은 다섯 개 이상');
      if (Array.isArray(B.decoys)) need(B.decoys.every(function (d) { return B.voices.every(function (v) { return v.text.indexOf(d) < 0; }); }), '가짜 낱말이 목소리 말 속에 들어 있어요');
    }
    var m = /^(\d\d)(\d\d)$/.exec(String(B.date));
    need(m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31, 'date 는 월일 네 자리(예: 0514)');
    need(Array.isArray(B.letter) && B.letter.length > 0, '편지가 비었어요');
    need(B.bingo && B.bingo.riddle, '빙고 장소 수수께끼가 비었어요');
    // 엔딩 전 글에 태명이 새지 않게
    var early = [B.title, B.dawnLine, B.doorText].concat((B.decoys || []));
    need(early.every(function (t) { return !t || (t.indexOf(B.name) < 0 && t.indexOf(B.call) < 0); }), '엔딩 전에 보이는 글에 태명이 있어요');
    return bad;
  }

  return { TIMES: TIMES, TIMES3: TIMES3, timesFor: timesFor, TIME_ICON: TIME_ICON, TASTES: TASTES, taste: taste, COLORS: COLORS, DIRS: DIRS, SHAPES: SHAPES, build: build, validate: validate, same: same, sameSet: sameSet };
});
