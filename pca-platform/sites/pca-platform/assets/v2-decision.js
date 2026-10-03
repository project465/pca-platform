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
  /* '지원 준비 단계' 를 증거 사다리로 한 번 더 막는다.
     준비도 신호(수강·도구)는 그 일을 **해봤을 법하다**까지만 말해 주고,
     서류와 면접에서 꺼낼 물건이 있다는 말은 아니다. 산출물(E2)에 닿지
     않으면 지원 준비로 올리지 않는다. **올리는 쪽으로만 막는다**: 다른
     판정은 건드리지 않는다. 그리고 **경험을 안 적으신 분은 깎지 않는다**:
     사다리가 없는 것과 낮은 것은 다르다. */
  function gate(status, ladderLevel, hasLadder) {
    var R = rules(), G = R && R.apply_gate;
    if (!G || status !== G.status) return status;
    var need = ORDER.indexOf(G.requires_evidence_ladder);
    if (!hasLadder) return G.fallback_without_ladder;
    var got = ORDER.indexOf(ladderLevel || '');
    return got >= need ? status : G.fallback_with_ladder;
  }
  var ORDER = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5'];

  function table(v2, families, readiness, ladder) {
    var NAME = {};
    var fam = (window.PCA_FAMILIES && window.PCA_FAMILIES.ME);
    if (fam) fam.families.forEach(function (f) { NAME[f.career_family_id] = f.name_ko; });
    var extra = (window.PCA_V2_FAMILY_NAMES || {});
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
      row.evidence_ladder = (ladder && ladder[id]) || null;
      row.decision_status = gate(statusOf(row), row.evidence_ladder, !!ladder);
      return row;
    });
    /* 관심을 먼저 보되 **순위를 매기지 않는다.** 표는 비교하는 자리이고,
       1위라는 말은 쓰지 않는다. */
    rows.sort(function (a, b) {
      return ((b.interest && b.interest.score) || 0) - ((a.interest && a.interest.score) || 0);
    });
    return rows;
  }

  return { statusOf: statusOf, label: label, line: line, modeLabel: modeLabel, table: table };
})();
