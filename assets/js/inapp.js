// 작은 연못 — 앱 안 브라우저 빠져나가기
// 카카오톡·라인·인스타그램 같은 앱 안 브라우저로 열리면 바깥 브라우저(크롬·사파리)로 다시 연다.
// 소리·저장·전체 화면이 앱 안에선 잘 안 되는 일이 많아서. 페이지 맨 앞에서 가장 먼저 돈다.
(function () {
  'use strict';
  var ua = navigator.userAgent || '', url = location.href;
  var android = /Android/i.test(ua), ios = /iPhone|iPad|iPod/i.test(ua);
  var info = { app: '', tried: false, ios: ios, android: android };
  window.INAPP = info;
  // 바깥으로 보냈다가 되돌아온 주소(?ext=1)면 다시 보내지 않는다 — 무한 반복 막기
  if (/[?&]ext=1/.test(url)) return;
  var ext = url + (url.indexOf('?') < 0 ? '?' : '&') + 'ext=1';

  if (/KAKAOTALK/i.test(ua)) {
    info.app = '카카오톡'; info.tried = true;
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(ext);
    return;
  }
  if (/ Line\//i.test(ua)) {
    info.app = '라인'; info.tried = true;
    location.href = url + (url.indexOf('?') < 0 ? '?' : '&') + 'openExternalBrowser=1&ext=1';
    return;
  }
  var named = (ua.match(/Instagram|FBAN|FBAV|NAVER|DaumApps|everytime|KAKAOSTORY|Twitter|Snapchat|Whale\/.*Mobile.*inapp/i) || [''])[0];
  var webview = android ? /; wv\)/.test(ua) : ios ? !/Safari\//.test(ua) : false;
  if (!named && !webview) return;
  info.app = /Instagram/i.test(named) ? '인스타그램' : /FBA/i.test(named) ? '페이스북' : /NAVER/i.test(named) ? '네이버' : /everytime/i.test(named) ? '에브리타임' : '앱';
  if (android) {
    // 안드로이드는 크롬으로 바로 넘긴다(크롬이 없으면 기본 브라우저)
    info.tried = true;
    location.href = 'intent://' + ext.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(ext) + ';end';
  }
  // 아이폰의 다른 앱들은 막아 둔 곳이 많아서, 화면에서 사파리로 여는 법을 안내한다(game.js)
})();
