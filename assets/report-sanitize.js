/* 결과지에 나가기 전에 입력을 한 번 거른다.
 *
 * **의도를 지어내지 않는다.** 'ㅁㅁㅁㅁ' 를 '모델링' 으로 고쳐 주지 않는다.
 * 그런 칸은 본문에서 빼고 안쪽에 경고로만 남긴다. 억지로 내보내면 결과지에
 * 뜻 없는 글자가 박히고, 고쳐 주면 응시자가 적지 않은 말이 결과지에 선다.
 *
 * **빈 칸과 뜻 없는 칸을 가른다.** 안 적은 것은 비워 두면 되고, 뜻 없는
 * 것은 되물을 자리다.
 */
window.PCASanitize = (function () {
  'use strict';

  var MAX = 400;          /* 한 칸이 이보다 길면 잘라서 보여 준다 */
  var MIN = 2;            /* 이보다 짧으면 담지 않는다 */
  var warnings = [];

  /* 제어문자와 보이지 않는 글자. **소스에 진짜 글자를 넣지 않는다**:
     편집기에서 안 보여서 다음 사람이 지우거나 복사하다 잃는다 */
  var INVISIBLE = new RegExp(
    '[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f' +
    '\\u200b-\\u200f\\u2028\\u2029\\ufeff]', 'g');

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* 눈에 안 보이는 글자와 줄바꿈을 한 모양으로 만든다 */
  function normalize(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(INVISIBLE, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* 자판을 눌러 본 자국. 손으로 고르지 않고 세어서 잡는다 */
  var MASH = [
    'asdf', 'qwer', 'zxcv', 'ㅁㄴㅇㄹ', 'ㅂㅈㄷㄱ', 'ㅋㅌㅊㅍ', '1234', 'test',
    'ㅁㅁㅁ', 'aaa', '...', 'ㅇㅇ', 'ㄴㄴ', 'abcd'
  ];

  function looksEmpty(v) {
    var t = normalize(v);
    if (t.length < MIN) return true;
    /* 같은 글자가 다섯 번 이어지면 내용이 아니다 */
    if (/(.)\1{4,}/.test(t)) return true;
    /* 글자다운 글자가 하나도 없는 경우 */
    if (!/[가-힣a-zA-Z0-9]/.test(t)) return true;
    var low = t.toLowerCase().replace(/\s/g, '');
    for (var i = 0; i < MASH.length; i++) {
      if (low === MASH[i] || low === MASH[i] + MASH[i]) return true;
    }
    /* 같은 토막이 세 번 넘게 되풀이되는 경우 */
    var parts = t.split(' ');
    if (parts.length >= 3) {
      var uniq = parts.filter(function (p, j, a) { return a.indexOf(p) === j; });
      if (uniq.length === 1) return true;
    }
    return false;
  }

  /**
   * 본문에 쓸 문자열. 담을 것이 없으면 null 을 준다.
   * null 이 오면 **그 자리를 비운다**: 빈 문자열을 넣으면 빈 칸이 그려진다.
   */
  function text(v, label) {
    var t = normalize(v);
    if (!t) return null;
    if (looksEmpty(t)) {
      warnings.push({ field: label || null, reason: 'unreadable', length: t.length });
      return null;
    }
    if (t.length > MAX) t = t.slice(0, MAX).replace(/\s\S*$/, '') + '…';
    return t;
  }

  /** 본문에 바로 넣을 수 있게 거르고 이스케이프까지 한다 */
  function safe(v, label) {
    var t = text(v, label);
    return t === null ? null : esc(t);
  }

  function list(arr, label) {
    return (Array.isArray(arr) ? arr : [])
      .map(function (x) { return text(x, label); })
      .filter(Boolean)
      .filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  function reset() { warnings = []; }
  function report() { return warnings.slice(); }

  return {
    esc: esc, normalize: normalize, text: text, safe: safe, list: list,
    looksEmpty: looksEmpty, reset: reset, warnings: report, MAX: MAX
  };
})();
