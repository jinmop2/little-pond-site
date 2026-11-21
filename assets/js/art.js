// 작은 연못 — 그림 (전부 SVG 로 직접). 장면 판은 360×360.
// 주의: CSS 애니메이션은 transform 속성이 있는 요소 말고 그 안쪽 g 에 건다(위치가 덮어써짐).
window.ART = (function () {
  'use strict';
  var uid = 0;
  var id = function (n) { return n + '-' + (++uid); };
  function svg(inner, cls) { return '<svg class="' + (cls || 'art') + '" viewBox="0 0 360 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + inner + '</svg>'; }

  // 물속 바탕 — inner: 깊고 따뜻한 안쪽 / outer: 물 위 빛이 비치는 바깥 가까이
  function water(kind) {
    var g = id('w'), r = id('r'), b = id('b');
    var deep = kind === 'outer'
      ? '<stop offset="0" stop-color="#7a5a4a"/><stop offset=".28" stop-color="#4a3440"/><stop offset="1" stop-color="#1c0f18"/>'
      : '<stop offset="0" stop-color="#3a1d2a"/><stop offset=".6" stop-color="#21101a"/><stop offset="1" stop-color="#12080e"/>';
    var s = '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1">' + deep + '</linearGradient>' +
      '<radialGradient id="' + r + '" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#ff9e7a" stop-opacity=".22"/><stop offset="1" stop-color="#ff9e7a" stop-opacity="0"/></radialGradient>' +
      '<filter id="' + b + '"><feGaussianBlur stdDeviation="6"/></filter></defs>' +
      '<rect width="360" height="360" fill="url(#' + g + ')"/><rect class="warm" width="360" height="360" fill="url(#' + r + ')"/>';
    if (kind === 'outer') {
      // 물 위 — 일렁이는 빛줄기
      s += '<g opacity=".5" filter="url(#' + b + ')"><g class="rays">' +
        '<path d="M60 0 L100 0 L70 260 L40 260Z" fill="#ffd9a8" opacity=".35"/><path d="M170 0 L215 0 L200 300 L160 300Z" fill="#ffd9a8" opacity=".3"/><path d="M280 0 L310 0 L330 240 L295 240Z" fill="#ffd9a8" opacity=".28"/></g></g>' +
        '<g class="ripple"><path d="M0 22 Q45 12 90 22 T180 22 T270 22 T360 22" stroke="#ffe8c8" stroke-opacity=".45" stroke-width="2" fill="none"/>' +
        '<path d="M0 40 Q45 30 90 40 T180 40 T270 40 T360 40" stroke="#ffe8c8" stroke-opacity=".22" stroke-width="1.5" fill="none"/></g>';
    }
    // 떠다니는 작은 알갱이
    for (var i = 0; i < 14; i++) {
      var x = (i * 97 + 31) % 360, y = (i * 61 + 47) % 360, rr = 1 + (i % 3);
      s += '<g transform="translate(' + x + ' ' + y + ')"><circle class="mote m' + (i % 4) + '" r="' + rr + '" fill="#ffd8c0" opacity=".25"/></g>';
    }
    return s;
  }

  // 주인공 — 동그랗고 단순한 빛 덩이. stage 0~3 으로 조금씩 커진다
  function me(x, y, s, stage) {
    var r = [10, 12, 14, 16][stage || 0], g = id('mg'), b = id('mb');
    var e = function (sx) { return '<circle cx="' + (sx * r * 0.33).toFixed(1) + '" cy="' + (-r * 0.06).toFixed(1) + '" r="' + (r * 0.11).toFixed(1) + '" fill="#3a2a2a"/>'; };
    var k = function (sx) { return '<circle cx="' + (sx * r * 0.56).toFixed(1) + '" cy="' + (r * 0.24).toFixed(1) + '" r="' + (r * 0.15).toFixed(1) + '" fill="#f5a77a" opacity=".4"/>'; };
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><g class="swim"><g class="breathe">' +
      '<defs><radialGradient id="' + g + '"><stop offset="0" stop-color="#fff3c4" stop-opacity=".6"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + b + '" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fffdf4"/><stop offset=".65" stop-color="#ffeab0"/><stop offset="1" stop-color="#f3c978"/></radialGradient></defs>' +
      '<circle r="' + (r * 2.8) + '" fill="url(#' + g + ')"/>' +
      '<circle r="' + r + '" fill="url(#' + b + ')"/>' +
      '<g class="blink">' + e(-1) + e(1) + '</g>' + k(-1) + k(1) +
      '</g></g></g>';
  }
  // 따로 움직이는 주인공(2장 받아먹기)
  function meSvg(stage) { return '<svg class="mesvg" viewBox="-50 -50 100 100" aria-hidden="true">' + me(0, 0, 1.7, stage) + '</svg>'; }

  // 1장 — 조개 ◯ △ □
  function shells() {
    var shapes = [
      '<circle r="22" />',
      '<path d="M0 -24 L24 18 L-24 18Z" />',
      '<rect x="-20" y="-20" width="40" height="40" rx="4"/>',
    ];
    var s = '';
    [70, 180, 290].forEach(function (x, i) {
      s += '<g transform="translate(' + x + ' 288)"><g class="shell" data-shell="' + i + '">' +
        '<ellipse class="halo" rx="44" ry="30" fill="#ffe29a" opacity="0"/>' +
        '<path d="M-36 14 Q-30 -26 0 -30 Q30 -26 36 14 Q0 26 -36 14Z" fill="#4b2f3c" stroke="#6e4a58" stroke-width="2"/>' +
        '<g class="mark" fill="none" stroke="#c9a7b0" stroke-width="4" transform="translate(0 -4) scale(.55)">' + shapes[i] + '</g>' +
        '</g></g>';
    });
    return s;
  }

  // 3장 — 벽의 따뜻한 곳(점 개수 = 다이얼 번호)
  function warmSpots(nums) {
    var pos = [[70, 80], [290, 120], [120, 200]];
    var PIPS = { 1: [[0, 0]], 2: [[-8, -8], [8, 8]], 3: [[-9, -9], [0, 0], [9, 9]], 4: [[-8, -8], [8, -8], [-8, 8], [8, 8]], 5: [[-9, -9], [9, -9], [0, 0], [-9, 9], [9, 9]], 6: [[-9, -10], [9, -10], [-9, 0], [9, 0], [-9, 10], [9, 10]], 7: [[-10, -10], [10, -10], [-10, 0], [0, 0], [10, 0], [-10, 10], [10, 10]], 8: [[-10, -11], [10, -11], [-10, -3.5], [10, -3.5], [-10, 3.5], [10, 3.5], [-10, 11], [10, 11]], 9: [[-10, -10], [0, -10], [10, -10], [-10, 0], [0, 0], [10, 0], [-10, 10], [0, 10], [10, 10]] };
    var g = id('ws'), s = '<defs><radialGradient id="' + g + '"><stop offset="0" stop-color="#ffb37a" stop-opacity=".75"/><stop offset=".6" stop-color="#ff8a6a" stop-opacity=".25"/><stop offset="1" stop-color="#ff8a6a" stop-opacity="0"/></radialGradient></defs>';
    nums.forEach(function (n, i) {
      var p = pos[i];
      s += '<g transform="translate(' + p[0] + ' ' + p[1] + ')"><g class="warmspot w' + i + '"><circle r="46" fill="url(#' + g + ')"/>';
      (PIPS[n] || []).forEach(function (q) { s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.2" fill="#fff0d8" opacity=".9"/>'; });
      s += '</g></g>';
    });
    return s;
  }

  // 4장 — 배에서 위로 뻗은 긴 줄 (매듭 자리는 game.js 가 % 로 얹는다)
  var CORD = 'M150 300 C 90 280, 70 230, 120 200 S 260 170, 240 130 S 110 90, 150 60 S 230 20, 200 -10';
  function cord() {
    return '<path d="' + CORD + '" stroke="#e8a3a0" stroke-width="9" fill="none" stroke-linecap="round" opacity=".85"/>' +
      '<path d="' + CORD + '" stroke="#ffd0c8" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="2 9" opacity=".7"/>';
  }
  var KNOTS = [[96, 228], [233, 160], [128, 98], [205, 34]]; // 판 위 매듭 자리

  // 4장 바깥 — 빛이 새어 나오는 문, 색 구멍 네 개
  function door(colors, text) {
    var g = id('dg'), gl = id('dl');
    var s = '<defs><radialGradient id="' + g + '" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff7dc"/><stop offset="1" stop-color="#ffcf8a"/></radialGradient>' +
      '<radialGradient id="' + gl + '"><stop offset="0" stop-color="#ffe9b8" stop-opacity=".6"/><stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/></radialGradient></defs>' +
      '<g class="doorglow"><ellipse cx="180" cy="150" rx="170" ry="150" fill="url(#' + gl + ')"/></g>' +
      '<path d="M100 270 L100 110 Q100 40 180 40 Q260 40 260 110 L260 270Z" fill="#5a3a32" stroke="#8a6050" stroke-width="5"/>' +
      '<path d="M112 262 L112 112 Q112 54 180 54 Q248 54 248 112 L248 262Z" fill="url(#' + g + ')" opacity=".9"/>' +
      '<path d="M180 270 L180 300" stroke="#e8a3a0" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M180 300 C 175 330, 190 345, 180 370" stroke="#e8a3a0" stroke-width="9" fill="none" stroke-linecap="round"/>';
    colors.forEach(function (c, i) {
      var x = 135 + i * 30;
      s += '<circle cx="' + x + '" cy="215" r="10.5" fill="#3a2522"/><circle cx="' + x + '" cy="215" r="7" fill="' + c + '"/><rect x="' + (x - 2) + '" y="219" width="4" height="9" rx="1.5" fill="#3a2522"/>';
    });
    // 문 폭(약 130)에 맞게 — 길면 가운데 띄어쓰기에서 두 줄로
    var t = String(text || ''), lines = [t];
    if (t.length > 8 && t.indexOf(' ') > 0) {
      var sp = [], k = -1; while ((k = t.indexOf(' ', k + 1)) >= 0) sp.push(k);
      var mid = sp.reduce(function (a, b) { return Math.abs(b - t.length / 2) < Math.abs(a - t.length / 2) ? b : a; });
      lines = [t.slice(0, mid), t.slice(mid + 1)];
    }
    lines.forEach(function (l, i) {
      s += '<text x="180" y="' + (lines.length > 1 ? 120 + i * 22 : 130) + '" text-anchor="middle" font-size="17" fill="#6a4030" font-weight="700" class="doortext">' + esc(l) + '</text>';
    });
    return s;
  }

  // 엔딩 — 초음파 사진이 없을 때 쓰는 그림 (부채꼴 + 콩 모양 아기)
  function ultrasound() {
    var f = id('us'), g = id('ug');
    return '<svg class="us-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">' +
      '<defs><filter id="' + f + '"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .8  0 0 0 0 .8  0 0 0 0 .8  0 0 0 .5 0"/></filter>' +
      '<radialGradient id="' + g + '" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#6b6b6b"/><stop offset=".7" stop-color="#2a2a2a"/><stop offset="1" stop-color="#111"/></radialGradient></defs>' +
      '<rect width="400" height="300" fill="#050505"/>' +
      '<path d="M200 10 L360 260 Q200 310 40 260Z" fill="url(#' + g + ')"/>' +
      '<path d="M200 10 L360 260 Q200 310 40 260Z" filter="url(#' + f + ')" opacity=".55"/>' +
      '<ellipse cx="200" cy="170" rx="92" ry="66" fill="#0b0b0b" opacity=".9"/>' +
      '<g opacity=".92"><path d="M168 170 C160 130 205 115 228 135 C250 152 245 190 222 200 C205 208 196 196 190 190 C178 196 166 186 168 170Z" fill="#cfcfcf"/>' +
      '<circle cx="214" cy="146" r="22" fill="#d8d8d8"/><path d="M186 192 C176 205 170 210 164 206" stroke="#bdbdbd" stroke-width="5" fill="none" stroke-linecap="round"/></g>' +
      '<text x="18" y="28" font-size="11" fill="#9a9a9a" font-family="monospace">LITTLE POND</text>' +
      '</svg>';
  }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  return { svg: svg, water: water, me: me, meSvg: meSvg, shells: shells, warmSpots: warmSpots, cord: cord, CORD: CORD, KNOTS: KNOTS, door: door, ultrasound: ultrasound, esc: esc };
})();
