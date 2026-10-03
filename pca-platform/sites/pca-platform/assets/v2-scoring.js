/* ME_V2 채점. 다섯 값을 **따로** 낸다.
 *
 * 관심 · 경험 · 결정 소유 · 업무 방식 · 학습 의향은 서로 다른 문항에서
 * 나온다. 평균을 내면 '커리어 점수' 하나가 남는데, 그 숫자로는 무엇을
 * 할지 알 수 없다. 갈리는 자리가 쓸모 있다.
 *
 * **V1 을 건드리지 않는다.** `engine.js` 와 `pca_session_v1` 은 그대로 있고,
 * 여기는 `ME_V2_DECISION_2026` 응답만 읽는다. 전에 응시한 사람의 점수는
 * 달라지지 않는다.
 *
 * **숫자를 함부로 내지 않는다.** 업무 방식은 검증 전이라 가까움·혼합·먼 편
 * 세 마디로만 내보낸다(규격 12장). 83.7 같은 값은 없는 정밀도를 파는 것이다.
 */
window.PCAV2 = (function () {
  'use strict';

  var VERSION = 'ME_V2_DECISION_2026';
  var LEGACY = 'ME_V1';

  function bank() {
    return (window.PCA_V2_ITEMS && window.PCA_V2_ITEMS.ME) || null;
  }
  /** 상품이 내는 문항. BASIC 48 · STANDARD 68 · PRO 92 */
  function itemsFor(tier) {
    var b = bank();
    if (!b) return [];
    var out = b.core.items.slice();
    if (tier === 'STANDARD' || tier === 'PRO') out = out.concat(b.standard.items);
    if (tier === 'PRO') out = out.concat(b.pro.items);
    return out;
  }
  /** 단계별로 문장이 갈리는 문항은 여기서 고른다. 구성개념은 같다. */
  function textOf(item, stage) {
    if (!item.stage_adaptive) return item['ko-KR'];
    var v = (bank().variants.variants || {})[item.item_id];
    if (!v) return item['ko-KR'] || '';
    return v[stage || 'bachelor'] || v.bachelor;
  }

  function r1(n) { return Math.round(n * 10) / 10; }
  function band(v) { return v >= 62 ? 'high' : (v <= 38 ? 'low' : 'medium'); }

  /* 1~5 응답을 0~100 으로. 척도마다 뜻이 다르지만 자리를 옮기는 방식은 같다. */
  function pct(v) { return ((Number(v) - 1) / 4) * 100; }

  /**
   * 직무군마다 관심·경험·학습의향을 따로 낸다.
   *
   * 문항 하나가 여러 직무군에 걸리므로 가중 평균을 쓰되, **가중치는 전부
   * 데이터에 드러나 있다**(items-*.json 의 career_family_weights).
   */
  function byFamily(items, answers, construct) {
    var num = {}, den = {}, basis = {};
    items.forEach(function (it) {
      if (it.construct !== construct) return;
      var a = answers[it.item_id];
      if (a === undefined || a === null || a === '') return;
      var v = pct(a);
      Object.keys(it.career_family_weights || {}).forEach(function (f) {
        var w = it.career_family_weights[f];
        num[f] = (num[f] || 0) + v * w;
        den[f] = (den[f] || 0) + w;
        (basis[f] = basis[f] || []).push(it.question_no);
      });
    });
    var out = {};
    Object.keys(num).forEach(function (f) {
      out[f] = { score: r1(num[f] / den[f]), level: band(num[f] / den[f]), basis: basis[f] };
    });
    return out;
  }

  /** 응시자 전체의 결정 소유. 직무군별로 가르지 않는다. 사람 단위 값이다. */
  function ownership(items, answers) {
    var vals = [], basis = [];
    items.forEach(function (it) {
      if (it.construct !== 'decision_ownership') return;
      var a = answers[it.item_id];
      if (a === undefined || a === null || a === '') return;
      vals.push(pct(a)); basis.push(it.question_no);
    });
    if (!vals.length) return null;
    var m = vals.reduce(function (s, x) { return s + x; }, 0) / vals.length;
    return { score: r1(m), level: band(m), items: vals.length, basis: basis };
  }

  /** 연구 과제 소유(Q77~88). 학위로 올려 주지 않는다. 답한 것만 센다. */
  function projectOwnership(items, answers) {
    var vals = [], facets = {};
    items.forEach(function (it) {
      if (it.construct !== 'research_project_evidence') return;
      var a = answers[it.item_id];
      if (a === undefined || a === null || a === '') return;
      vals.push(pct(a));
      facets[it.facet] = Number(a);
    });
    if (!vals.length) return null;
    var m = vals.reduce(function (s, x) { return s + x; }, 0) / vals.length;
    return { score: r1(m), level: band(m), items: vals.length, facets: facets };
  }

  /**
   * 업무 방식. 세 축이고 짝으로 묶인다.
   *
   * **숫자를 내보내지 않는다.** 두 문항으로 잰 축에 소수점을 붙이면 그
   * 정밀도가 있는 것처럼 읽힌다. 검증 전까지 세 마디로만 말한다.
   */
  function workMode(items, answers) {
    var AX = { IC: ['독립', '협력'], CS: ['도전', '안정'], SQ: ['속도', '품질'] };
    var acc = {};
    items.forEach(function (it) {
      if (it.construct !== 'work_mode') return;
      var a = answers[it.item_id];
      if (a === undefined || a === null || a === '') return;
      var s = acc[it.axis] = acc[it.axis] || { 0: null, 1: null };
      s[it.pole] = pct(a);
    });
    var axes = Object.keys(AX).map(function (k) {
      var s = acc[k];
      if (!s || s[0] === null || s[1] === null) {
        return { axis: k, poles: AX[k], leaning: null, label: '자료 없음' };
      }
      var d = s[0] - s[1];
      return {
        axis: k, poles: AX[k],
        leaning: Math.abs(d) < 15 ? null : (d > 0 ? AX[k][0] : AX[k][1]),
        label: Math.abs(d) < 15 ? '양쪽 비슷' : (d > 0 ? AX[k][0] : AX[k][1]) + ' 쪽',
        margin: Math.abs(r1(d))
      };
    });
    return { profile: axes, note: '검증 전이라 점수로 내보내지 않습니다.' };
  }

  /** 맥락 문항. 점수에 들어가지 않는다(규격 19장). */
  function context(items, answers) {
    var out = {};
    items.forEach(function (it) {
      if (it.scored !== false) return;
      var a = answers[it.item_id];
      if (a === undefined || a === null || a === '') return;
      out[it.item_id] = { question_no: it.question_no, construct: it.construct, value: a };
    });
    return out;
  }

  /** 증거의 질(Q57~62). 증거 준비도로 가고 FIT 에 들어가지 않는다. */
  function evidenceQuality(items, answers) {
    var vals = [];
    items.forEach(function (it) {
      if (it.construct !== 'evidence_quality') return;
      var a = answers[it.item_id];
      if (a === undefined || a === null || a === '') return;
      vals.push(Number(a));
    });
    if (!vals.length) return null;
    var m = vals.reduce(function (s, x) { return s + x; }, 0) / vals.length;
    return { level: m >= 3.5 ? 'high' : (m <= 2 ? 'low' : 'medium'), items: vals.length };
  }

  /** 업무 방식이 그 직무군과 가까운가. 세 마디로만 답한다. */
  function modeCloseness(wm, famId) {
    var FIT = (window.PCA_V2_MODE_FIT && window.PCA_V2_MODE_FIT.ME) || null;
    if (!FIT || !FIT[famId]) return 'mixed';
    var want = FIT[famId], hit = 0, seen = 0;
    (wm.profile || []).forEach(function (ax) {
      if (!want[ax.axis]) return;
      seen += 1;
      if (ax.leaning === null) return;
      if (ax.leaning === want[ax.axis]) hit += 1;
    });
    if (!seen) return 'mixed';
    return hit >= seen - 0.5 ? 'closer' : (hit === 0 ? 'farther' : 'mixed');
  }

  function score(tier, stage, answers) {
    var items = itemsFor(tier);
    if (!items.length) return null;
    var interest = byFamily(items, answers, 'actual_work_interest');
    var exposure = byFamily(items, answers, 'exposure');
    var learning = byFamily(items, answers, 'learning_intent');
    var own = ownership(items, answers);
    var wm = workMode(items, answers);
    var fams = {};
    [interest, exposure, learning].forEach(function (o) {
      Object.keys(o).forEach(function (f) { fams[f] = 1; });
    });
    var answered = items.filter(function (it) {
      var a = answers[it.item_id];
      return a !== undefined && a !== null && a !== '';
    }).length;
    return {
      assessment_version: VERSION,
      legacy_version: LEGACY,
      tier: tier,
      education_stage: stage || 'bachelor',
      item_count: items.length,
      answered: answered,
      /* 다섯을 따로 담는다. 합치지 않는다. */
      actual_work_interest: interest,
      exposure: exposure,
      learning_intent: learning,
      decision_ownership: own,
      work_mode: wm,
      research_project_evidence: projectOwnership(items, answers),
      evidence_quality: evidenceQuality(items, answers),
      career_path_preferences: context(items, answers),
      families: Object.keys(fams)
    };
  }

  return {
    VERSION: VERSION, LEGACY: LEGACY,
    itemsFor: itemsFor, textOf: textOf, score: score,
    band: band, modeCloseness: modeCloseness
  };
})();
