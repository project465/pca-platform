/* 결과지의 두 언어.
 *
 * **엔진을 두 벌로 나누지 않는다.** 채점도 판정도 한 벌이고, 갈리는 것은
 * 화면에 나가는 글자뿐이다. 그래서 여기는 사전 하나와 찾아보는 함수 하나다.
 *
 * **열쇠가 한국어 원문 자체다.** 짧은 키(`rp.gap.title`)를 따로 지으면
 * 이름 짓기에서 다투고, 결과지를 고칠 때마다 키와 글이 따로 놀다 어긋난다.
 * 원문을 열쇠로 쓰면 한국어는 **사전을 거쳐도 그대로 나온다**: 한국어 쪽
 * 회귀가 구조적으로 불가능하다.
 *
 * **빠진 번역을 조용히 넘기지 않는다.** 영어인데 사전에 없으면 한국어가
 * 그대로 나가는데, 그 사실을 아무도 모르면 영어권 응시자가 한국어 결과지를
 * 받는다. 빠진 것을 세어 두고(`missing()`) 검사가 그 수를 읽는다.
 */
window.PCAI18N = (function () {
  'use strict';

  var lang = 'ko';
  var miss = {};

  /** 사전은 `data/report-i18n.js` 가 채운다. 없으면 한국어만 돈다 */
  function dict() {
    return (window.PCA_REPORT_I18N && window.PCA_REPORT_I18N.en) || null;
  }

  function setLang(l) {
    lang = (l === 'en') ? 'en' : 'ko';
    try { document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'ko'); }
    catch (e) { /* 머리 없는 브라우저에서 문서가 아직 없을 수 있다 */ }
    return lang;
  }
  function getLang() { return lang; }

  /**
   * 주소가 언어를 들고 온다.
   *
   * **싣는 쪽마다 따로 부르게 두지 않는다.** 결과지를 싣는 자리가
   * 셋이고(정적 `v2.html` · 플랫폼 결과지 틀 · PDF 를 찍는 머리 없는
   * 브라우저) 한 자리라도 부르는 것을 빠뜨리면 그 자리만 한국어로 나간다.
   * 그래서 사전이 올라오는 순간 스스로 한 번 읽는다.
   */
  function fromUrl() {
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q) return setLang(q);
      var h = document.documentElement.getAttribute('lang');
      if (h) return setLang(h.slice(0, 2));
    } catch (e) { /* 주소가 없는 자리도 있다 */ }
    return lang;
  }

  /**
   * 한 문구를 지금 언어로.
   *
   * 한국어면 받은 것을 그대로 돌려준다. **거치는 것만으로 글자가 바뀌면
   * 안 된다**: 그러면 이 공사가 한국어 결과지를 건드린 셈이 된다.
   */
  function T(ko) {
    if (lang === 'ko') return ko;
    if (typeof ko !== 'string' || !ko) return ko;
    var d = dict();
    var v = d ? d[ko] : null;
    if (typeof v === 'string' && v) return v;
    /* 뜻 있는 글자가 들어 있는 것만 샌 것으로 센다. 숫자나 기호뿐인
       문자열은 번역할 것이 없다 */
    if (/[가-힣]/.test(ko)) miss[ko] = (miss[ko] || 0) + 1;
    return ko;
  }

  /** 직무군 이름. **키는 두 언어가 같다**: 갈리는 것은 글자뿐이다 */
  function family(id) {
    var en = window.PCA_V2_FAMILY_NAMES_EN || {};
    var ko = window.PCA_V2_FAMILY_NAMES || {};
    if (lang === 'en' && en[id]) return en[id];
    return ko[id] || id;
  }

  /** 문항 본문. 학위 단계가 묻는 장면을 바꾸고 점수는 바꾸지 않는다 */
  function itemText(item, stage) {
    if (!item) return '';
    var bank = window.PCA_V2_ITEMS && window.PCA_V2_ITEMS.ME;
    if (item.stage_adaptive && bank && bank.variants) {
      var v = (bank.variants.variants || bank.variants)[item.item_id];
      if (v) {
        if (lang === 'en' && v.en && v.en[stage]) return v.en[stage];
        if (v[stage]) return v[stage];
      }
    }
    if (lang === 'en' && item['en-US']) return item['en-US'];
    return item['ko-KR'] || item.semantic || item.item_id;
  }

  /** 고르기형 보기. **날 번호를 내보내지 않는다** */
  function optionText(item, idx) {
    if (!item || !item.options) return '';
    if (lang === 'en' && item['options-en'] && item['options-en'][idx]) {
      return item['options-en'][idx];
    }
    var o = item.options[idx];
    return (typeof o === 'string') ? o : (o && (o['ko-KR'] || o.value)) || '';
  }

  /** 척도 보기. `response-scales.json` 이 두 언어를 들고 있다 */
  function scalePoints(scaleId) {
    var bank = window.PCA_V2_ITEMS && window.PCA_V2_ITEMS.ME;
    var s = bank && bank.scales && (bank.scales.scales || bank.scales)[scaleId];
    if (!s) return [];
    if (lang === 'en' && s['points-en']) return s['points-en'];
    return s.points || [];
  }

  /**
   * 묶음을 통째로 옮긴다.
   *
   * **구조와 키는 그대로 두고 글자만 바꾼다.** 데이터 파일에서 온 이름표는
   * 묶음으로 오는 일이 많아서, 잎마다 손으로 부르면 한 자리를 빠뜨린다.
   * 빠뜨린 자리는 영어 화면에 한국어로 남는다.
   *
   * **응시자가 적은 글에는 쓰지 않는다.** 그쪽은 사전에 없을뿐더러, 있어도
   * 남의 글을 우리 말로 바꾸는 셈이 된다.
   */
  function deep(v) {
    if (typeof v === 'string') return T(v);
    if (Array.isArray(v)) return v.map(deep);
    if (v && typeof v === 'object') {
      var o = {};
      for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = deep(v[k]);
      return o;
    }
    return v;
  }

  function missing() { return Object.keys(miss); }
  function resetMissing() { miss = {}; }

  fromUrl();

  return {
    setLang: setLang, lang: getLang, fromUrl: fromUrl, T: T, deep: deep, family: family,
    itemText: itemText, optionText: optionText, scalePoints: scalePoints,
    missing: missing, resetMissing: resetMissing
  };
})();
