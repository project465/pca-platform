/* 직무군마다 '지금 무엇을 할 자리인가' 를 정한다.
 *
 * 좋고 나쁨을 가르는 값이 아니다. 여덟 가지 상태는 **다음 행동이 다르다**는
 * 뜻이고, 그래서 결과지 첫 화면이 막대 그래프가 아니라 표가 된다.
 *
 * 다섯 값을 합치지 않는다. 합쳐서 하나로 줄이면 왜 그 상태인지 되짚을 수
 * 없고, 되짚을 수 없는 판정은 응시자가 고칠 데를 모른다.
 */
window.PCAV2Decision = (function () {
  'use strict';
  /* 결과지의 두 언어. **글자만 갈리고 판단은 갈리지 않는다**:
     한국어면 받은 것을 그대로 돌려주므로 한국어 쪽은 손대지 않은 것과 같다 */
  var T = window.PCAI18N ? window.PCAI18N.T : function (s) { return s; };

  function rules() {
    return (window.PCA_V2_ITEMS && window.PCA_V2_ITEMS.ME &&
            window.PCA_V2_ITEMS.ME.rules) || null;
  }

  function want(spec, got) {
    if (spec === undefined) return true;
    if (got === null || got === undefined) return false;
    return Array.isArray(spec) ? spec.indexOf(got) >= 0 : spec === got;
  }

  /** 한 직무군의 상태. 규칙은 데이터에 있고 순서가 곧 우선순위다. */
  function statusOf(row) {
    var R = rules();
    if (!R) return 'INSUFFICIENT_DATA';
    if (!row.interest || row.interest.level === undefined) return 'INSUFFICIENT_DATA';
    for (var i = 0; i < R.rules.length; i++) {
      var r = R.rules[i].if;
      if (want(r.interest, row.interest && row.interest.level) &&
          want(r.exposure, row.exposure && row.exposure.level) &&
          want(r.learning, row.learning && row.learning.level) &&
          want(r.evidence, row.evidence_readiness && row.evidence_readiness.level)) {
        return R.rules[i].then;
      }
    }
    return 'EXPLORE_FIRST';
  }

  function label(id) {
    var R = rules();
    return (R && R.statuses[id]) ? R.statuses[id].label : id;
  }
  function line(id) {
    var R = rules();
    return (R && R.statuses[id]) ? R.statuses[id].line : '';
  }
  function modeLabel(k) {
    var R = rules();
    return (R && R.work_mode_labels[k]) ? R.work_mode_labels[k] : k;
  }

  /**
   * 결과지 첫 화면에 쓰는 표.
   *
   * 막대 하나로 줄이지 않는 것이 요점이다. 다섯 칸이 각각 다른 것을 재고,
   * 마지막 칸이 그래서 지금 무엇을 할 자리인지를 적는다.
   */
  /* 문항이 낸 판정을 **역할별 증거 범위**로 한 번 더 거른다.
   *
   * 관심과 경험이 높다고 해서 지원서에서 꺼낼 물건이 있는 것은 아니다.
   * 그 말을 하려면 그 직무가 보고 싶어 하는 영역이 실제로 확인돼 있어야
   * 하고, 그것은 적어 주신 경험에서만 나온다. 문항은 말해 주지 못한다.
   *
   * **올리는 쪽으로만 거른다.** 내리는 판정은 건드리지 않는다. 그리고
   * **경험을 안 적으신 분은 깎지 않는다**: 범위가 없는 것과 좁은 것은
   * 다르다. 다만 경험을 적으셨는데 핵심이 하나도 안 걸리면 비교 단계로
   * 두지 않는다. 비교는 꺼낼 것이 있을 때 쓸모 있는 말이다. */
  function gate(status, cov, ready, hasEvidence) {
    var R = rules(), G = R && R.apply_gate;
    if (!G || !cov || status !== G.from_status) return status;
    if (!hasEvidence) return status;
    if (ready && ready.ok) return G.to_if_application_ready;
    var core = cov.summary.core;
    if (core.confirmed === 0) return G.to_if_core_thin;
    var left = core.partial + core.not_yet;
    if (left > 0 && left <= (G.one_gap_left_max || 1)) return G.to_if_one_gap_left;
    return status;
  }

  function table(v2, families, readiness, coverage, ready, hasEvidence) {
    /* 직무군 이름은 **한 곳에서만** 고른다(`PCAI18N.family`). 이름표가
       둘(`PCA_FAMILIES` 의 `name_ko` 와 `PCA_V2_FAMILY_NAMES`)이라, 앞엣것이
       먼저 걸리면 영어 화면에도 한국어가 나간다. 키는 두 언어가 같으므로
       판정은 갈리지 않고 글자만 갈린다 */
    var NAME = {};
    var fam = (window.PCA_FAMILIES && window.PCA_FAMILIES.ME);
    var isEn = !!(window.PCAI18N && window.PCAI18N.lang() === 'en');
    if (fam && !isEn) {
      fam.families.forEach(function (f) { NAME[f.career_family_id] = f.name_ko; });
    }
    var extra = (isEn
      ? (window.PCA_V2_FAMILY_NAMES_EN || window.PCA_V2_FAMILY_NAMES || {})
      : (window.PCA_V2_FAMILY_NAMES || {}));
    var rows = (families || v2.families).map(function (id) {
      var row = {
        career_family_id: id,
        name: NAME[id] || extra[id] || id,
        interest: v2.actual_work_interest[id] || null,
        exposure: v2.exposure[id] || null,
        learning: v2.learning_intent[id] || null,
        evidence_readiness: (readiness && readiness[id]) || null,
        work_mode: window.PCAV2.modeCloseness(v2.work_mode, id)
      };
      var cov = (coverage && coverage[id]) || null;
      row.evidence_coverage = cov ? cov.summary : null;
      row.evidence_depth = cov ? depthOf(cov) : null;
      row.decision_status = gate(statusOf(row), cov,
        (ready && ready[id]) || null, !!hasEvidence);
      return row;
    });
    /* 관심을 먼저 보되 **순위를 매기지 않는다.** 표는 비교하는 자리이고,
       1위라는 말은 쓰지 않는다. */
    rows.sort(function (a, b) {
      return ((b.interest && b.interest.score) || 0) - ((a.interest && a.interest.score) || 0);
    });
    return rows;
  }

  /* 그 직무에 걸린 경험 가운데 가장 깊이 간 칸. **범위와 합치지 않는다** */
  function depthOf(cov) {
    var ORDER = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5'], best = -1;
    cov.coverage.forEach(function (r) {
      var i = ORDER.indexOf(r.depth || '');
      if (i > best) best = i;
    });
    return best >= 0 ? ORDER[best] : null;
  }

  return {
    statusOf: statusOf, label: label, line: line, modeLabel: modeLabel,
    table: table, depthOf: depthOf
  };
})();
