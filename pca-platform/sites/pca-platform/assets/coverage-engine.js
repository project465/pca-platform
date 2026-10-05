/* 직무가 보고 싶어 하는 증거를 얼마나 **넓게** 확인했는가.
 *
 * 증거 사다리(`value-engine.js`)와 **합치지 않는다.** 사다리는 경험 하나가
 * 얼마나 깊은지를 보고, 여기는 그 직무에서 확인해야 할 영역을 얼마나
 * 넓게 덮었는지를 본다. 둘을 곱하거나 평균 내면 숫자 하나가 남고, 그
 * 숫자로는 무엇을 더 해야 할지 알 수 없다.
 *
 * **점수로 바꾸지 않는다.** 아홉 칸 가운데 넷이면 넷이라고 적고 44점이라고
 * 적지 않는다. 44 는 비교할 자가 없는 숫자고, 나머지 다섯이 무엇인지를
 * 가린다.
 *
 * **'아직' 은 못 한다는 뜻이 아니다.** 지금 적어 주신 것으로 확인되지
 * 않는다는 뜻이다. 화면 문구도 그렇게 쓴다.
 */
window.PCACoverage = (function () {
  'use strict';
  /* **표는 한국어로 둔다.** 모듈 최상위에서 `T()` 를 부르면 불러올 때
     한 번만 평가돼 그 뒤로 언어를 바꿔도 한국어가 그대로 남는다 */
  function TX(tbl, key, dflt) {
    var v = tbl && tbl[key];
    return (typeof v === 'string' && v) ? T(v) : (dflt === undefined ? '' : dflt);
  }
  /* 결과지의 두 언어. **글자만 갈리고 판단은 갈리지 않는다**:
     한국어면 받은 것을 그대로 돌려주므로 한국어 쪽은 손대지 않은 것과 같다 */
  var T = window.PCAI18N ? window.PCAI18N.T : function (s) { return s; };

  var MAP = (window.PCA_EVIDENCE_MAP || {}).families || [];
  var FOLLOW = (window.PCA_FOLLOWUPS || {}).gaps || [];
  var LV = { E0: 0, E1: 1, E2: 2, E3: 3, E4: 4, E5: 5 };
  var NAME = { E0: '활동', E1: '판단', E2: '산출물', E3: '성과', E4: '조직 가치', E5: '반복 가능성' };

  /** 되묻는 말은 묶음으로 온다. 잎마다 부르면 보기 하나를 빠뜨린다 */
  function DEEP(v) { return window.PCAI18N ? window.PCAI18N.deep(v) : v; }

  function s(v) { return String(v === null || v === undefined ? '' : v).trim(); }
  function low(v) { return s(v).toLowerCase(); }
  function arr(v) { return Array.isArray(v) ? v.filter(function (x) { return s(x); }) : []; }
  function uniq(a) { return a.filter(function (v, i, x) { return x.indexOf(v) === i; }); }

  function mapOf(id) {
    for (var i = 0; i < MAP.length; i++) {
      if (MAP[i].career_family_id === id) return MAP[i];
    }
    return null;
  }
  function followOf(id) {
    for (var i = 0; i < FOLLOW.length; i++) { if (FOLLOW[i].id === id) return FOLLOW[i]; }
    return null;
  }

  /* 경험 하나를 한 덩어리 글로 만든다. **응시자가 직접 적은 것만** 넣는다.
     우리가 붙인 이름표를 여기 섞으면 아무 말이나 걸린다. */
  function textOf(x) {
    return low([
      x.title, x.did, x.decided, x.used_in, x.changed, x.result, x.measured,
      arr(x.methods).join(' '), arr(x.outputs).join(' '), arr(x.validations).join(' ')
    ].join(' '));
  }
  function toolTextOf(x) { return low(arr(x.tools).join(' ')); }

  function hitWords(hay, words) {
    var got = [];
    (words || []).forEach(function (w) {
      if (w && hay.indexOf(low(w)) >= 0) got.push(w);
    });
    return got;
  }

  /**
   * 직무군 하나의 영역별 확인 상태.
   *
   * confirmed  걸린 경험이 그 영역이 바라는 칸까지 올라와 있다
   * partial    관련 경험은 있는데 판단·산출물·검증 가운데 비어 있다
   * not_yet    지금 적어 주신 것에서 확인되지 않는다
   */
  function forFamily(familyId, exps, toolEv, evRaw) {
    var fam = mapOf(familyId);
    if (!fam) return null;
    var courses = ((evRaw && evRaw.courses) || []).map(function (c) { return low(c.n); });
    var toolCats = {};
    (toolEv || []).forEach(function (t) { if (t.category) toolCats[t.category] = t; });

    var rows = fam.evidence_requirements.map(function (req) {
      var m = req.match || {};
      var need = LV[req.minimum_depth] || 0;
      var best = null, by = [], why = [];

      (exps || []).forEach(function (x) {
        var hit = hitWords(textOf(x), m.keywords);
        /* 도구 이름만으로 핵심 영역을 채우지 않는다. 그 영역이 도구를
           보겠다고 밝힌 자리에서만 도구가 센다 */
        if (!hit.length && m.tool_only_ok) {
          hit = hitWords(toolTextOf(x), m.keywords);
        }
        if (!hit.length) return;
        var d = x.top ? LV[x.top.id] : 0;
        if (best === null || d > best.depth) best = { depth: d, exp: x };
        by.push(x.title || x.id);
        why = why.concat(hit);
      });

      /* 수강은 노출이다. 그것만으로 확인까지 가지 않는다 */
      var byCourse = [];
      (m.courses || []).forEach(function (c) {
        courses.forEach(function (mine) {
          if (mine.indexOf(low(c)) >= 0) byCourse.push(T('수강: ') + c);
        });
      });

      /* 도구 갈래만 걸린 경우. tool_only_ok 가 아니면 근거로 세지 않는다 */
      var byTool = [];
      if (m.tool_only_ok) {
        (m.tool_categories || []).forEach(function (c) {
          if (toolCats[c]) byTool.push(T('도구: ') + toolCats[c].tool_name);
        });
      }

      var status, depth = null;
      if (best) {
        depth = best.exp.top ? best.exp.top.id : null;
        status = best.depth >= need ? 'confirmed' : 'partial';
      } else if (byTool.length) {
        /* 도구를 보겠다고 한 영역이고 필요한 칸이 활동이면 확인까지 간다 */
        status = need <= 0 ? 'confirmed' : 'partial';
        depth = 'E0';
      } else if (byCourse.length) {
        status = 'partial';
        depth = null;
      } else {
        status = 'not_yet';
      }

      return {
        evidence_id: req.evidence_id,
        /* **증거 지도에서 온 이름표는 사전을 거친다.** 아니면 영어 결과지에
           영역 이름만 한국어로 남는다. 번호(`evidence_id`)는 안 바뀐다 */
        label: T(req.label),
        importance: req.importance,
        minimum_depth: req.minimum_depth,
        minimum_depth_name: TX(NAME, req.minimum_depth),
        description: T(req.description),
        status: status,
        depth: depth,
        depth_name: depth ? TX(NAME, depth) : null,
        supported_by: uniq(by.concat(byCourse, byTool)).slice(0, 4),
        matched_words: uniq(why).slice(0, 4),
        /* 부분 확인일 때 되묻는 말. 긴 주관식을 요구하지 않는다 */
        gap_kind: status === 'confirmed' ? null : req.gap_kind,
        follow_up: status === 'confirmed' ? null : DEEP(followOf(req.gap_kind))
      };
    });

    var cnt = function (imp, st) {
      return rows.filter(function (r) {
        return (!imp || r.importance === imp) && r.status === st;
      }).length;
    };
    return {
      career_family_id: familyId,
      career_family_name: (window.PCAI18N
        ? window.PCAI18N.family(familyId)
        : ((window.PCA_V2_FAMILY_NAMES || {})[familyId] || familyId)),
      coverage: rows,
      /* **숫자를 점수로 바꾸지 않는다.** 센 것을 그대로 적는다 */
      summary: {
        core: { confirmed: cnt('core', 'confirmed'), partial: cnt('core', 'partial'),
                not_yet: cnt('core', 'not_yet'),
                total: rows.filter(function (r) { return r.importance === 'core'; }).length },
        supporting: { confirmed: cnt('supporting', 'confirmed'),
                      partial: cnt('supporting', 'partial'),
                      not_yet: cnt('supporting', 'not_yet') },
        optional: { confirmed: cnt('optional', 'confirmed'),
                    partial: cnt('optional', 'partial'),
                    not_yet: cnt('optional', 'not_yet') },
        note: T('숫자를 하나로 합치지 않습니다. 선택 영역이 비어 있다고 불리하게 ') +
          T('보지 않습니다.')
      },
      /* 다음에 채울 자리. 핵심부터, 그 안에서는 사다리를 덜 요구하는 것부터 */
      priority_gaps: rows.filter(function (r) {
        return r.importance === 'core' && r.status !== 'confirmed';
      }).sort(function (a, b) {
        if (a.status !== b.status) return a.status === 'partial' ? -1 : 1;
        return (LV[a.minimum_depth] || 0) - (LV[b.minimum_depth] || 0);
      }).slice(0, 3),
      /* 다음 단계에서 특정 기관 요구사항을 얹을 자리 */
      target_organization: null,
      target_role: null,
      organization_specific_evidence: []
    };
  }

  function all(familyIds, exps, toolEv, evRaw) {
    var out = {};
    (familyIds || []).forEach(function (id) {
      var c = forFamily(id, exps, toolEv, evRaw);
      if (c) out[id] = c;
    });
    return out;
  }

  /* ── 지원 설명 가능 여부 ─────────────────────────────────────────────
     **합격 가능성이 아니다.** 지원서와 면접에서 이 직무를 설명할 재료가
     일부라도 모였는가다. 넷을 모두 본다. 하나라도 비면 아직이다.
       ① 핵심 영역이 여럿 확인됐다
       ② 산출물(E2) 이상이 하나 이상 있다
       ③ 성과(E3) 이상이 하나 이상 있다
       ④ 직접 정한 것(E1)이 있다
     **임의의 숫자를 과학적 기준처럼 쓰지 않는다.** 여기 셋은 '여럿' 을
     절반으로 잡은 운영상의 선이고, 파일럿 뒤에 다시 본다. */
  function applicationReady(cov, exps) {
    if (!cov) return { ok: false, reasons: [T('자료 없음')], met: [] };
    var core = cov.summary.core;
    var half = Math.max(2, Math.ceil(core.total / 2));
    var depths = (exps || []).map(function (x) { return x.top ? LV[x.top.id] : -1; });
    var maxD = depths.length ? Math.max.apply(null, depths) : -1;
    var hasOutput = depths.some(function (d) { return d >= 2; });
    var hasPerf = depths.some(function (d) { return d >= 3; });
    var hasDecision = depths.some(function (d) { return d >= 1; });

    var need = [
      { id: 'core', ok: core.confirmed >= half,
        t: T('핵심 영역 ') + half + T('개 이상 확인 (지금 ') + core.confirmed + T('개)') },
      { id: 'output', ok: hasOutput, t: T('산출물까지 간 경험 하나 이상') },
      { id: 'performance', ok: hasPerf, t: T('기준과 견준 경험 하나 이상') },
      { id: 'decision', ok: hasDecision, t: T('직접 정한 것이 적힌 경험 하나 이상') }
    ];
    return {
      ok: need.every(function (n) { return n.ok; }),
      met: need.filter(function (n) { return n.ok; }).map(function (n) { return n.t; }),
      reasons: need.filter(function (n) { return !n.ok; }).map(function (n) { return n.t; }),
      max_depth: maxD >= 0 ? Object.keys(LV)[maxD] : null,
      note: T('지원서와 면접에서 설명할 재료가 모였는지를 보는 값입니다. ') +
        T('합격 가능성을 잰 값이 아닙니다.')
    };
  }

  return {
    forFamily: forFamily, all: all, applicationReady: applicationReady,
    mapOf: mapOf, followOf: followOf, MAP: MAP, DEPTH_NAME: NAME
  };
})();
