/* 준비 정도와 연구 수행 성숙도.
 *
 * **FIT 과 완전히 다른 값이다.** FIT 은 문항이 재는 업무 방식 유사도이고,
 * 여기 나오는 것은 **응시자가 낸 경험이 그 자리의 신호에 걸리는가**다. 둘은
 * 출처가 다르고 섞이면 둘 다 못 믿게 된다.
 *
 * **숫자를 먼저 만들지 않는다.** 검증된 모형이 없는 상태에서 가중 평균을
 * 내면 그 소수점이 근거처럼 보인다. 지금은 걸린 신호와 안 걸린 신호를
 * 세고, 무엇 때문에 걸렸는지를 같이 들고 다닌다. 나중에 자료가 쌓이면
 * 그때 수치로 바꾼다.
 */
window.PCAReadiness = (function () {
  'use strict';

  var RULES = (window.PCA_EVIDENCE_RULES && window.PCA_EVIDENCE_RULES.ME) || null;

  function lower(s) { return String(s || '').toLowerCase(); }
  function hit(hay, needles) {
    if (!needles || !needles.length) return null;
    for (var i = 0; i < hay.length; i++) {
      var h = lower(hay[i]);
      for (var j = 0; j < needles.length; j++) {
        if (h.indexOf(lower(needles[j])) >= 0) return hay[i];
      }
    }
    return null;
  }

  /* 신호 하나가 걸렸는가. 걸렸으면 **무엇 때문에 걸렸는지**를 돌려준다.
     근거 없이 레벨만 돌려주면 응시자가 고칠 데를 모른다. */
  function match(sig, ev, rp, toolCats) {
    var why = null;
    if (sig.courses) {
      why = hit(ev.coursework, sig.courses);
      if (why) return { by: '수강: ' + why };
    }
    if (sig.tools) {
      for (var i = 0; i < sig.tools.length; i++) {
        if (toolCats[sig.tools[i]]) return { by: '도구: ' + toolCats[sig.tools[i]] };
      }
    }
    var text = [].concat(
      ev.projects, ev.research, ev.internships, ev.employment,
      ev.methods, ev.outputs, ev.publications, ev.patents
    );
    if (sig.methods) {
      why = hit(text, sig.methods);
      if (why) return { by: why };
    }
    if (sig.outputs) {
      why = hit(ev.outputs.concat(ev.publications, ev.patents), sig.outputs);
      if (why) return { by: '결과물: ' + why };
    }
    if (sig.project_types) {
      /* 프로젝트 종류는 원본 객체에서만 알 수 있다 */
      for (var k = 0; k < (rp.rawProjects || []).length; k++) {
        var p = rp.rawProjects[k];
        if (sig.project_types.indexOf(p.type) >= 0 && p.title) {
          return { by: p.title };
        }
      }
    }
    return null;
  }

  /**
   * 직무군 하나의 준비 정도.
   *
   * 돌려주는 것은 레벨 하나와 **걸린 근거 · 아직 비어 있는 것** 두 목록이다.
   * 비어 있는 쪽이 다음에 무엇을 만들지 알려 준다.
   */
  function forFamily(familyId, ev, rawProjects, toolCats) {
    if (!RULES) return null;
    var fam = null;
    for (var i = 0; i < RULES.families.length; i++) {
      if (RULES.families[i].career_family_id === familyId) fam = RULES.families[i];
    }
    if (!fam) return null;
    var supported = [], missing = [];
    fam.signals.forEach(function (sig) {
      var m = match(sig, ev, { rawProjects: rawProjects }, toolCats);
      if (m) supported.push({ signal: sig.label, by: m.by });
      else missing.push(sig.label);
    });
    var n = fam.signals.length;
    var level = supported.length >= Math.ceil(n * 2 / 3) ? 'high'
      : (supported.length >= Math.ceil(n / 3) ? 'medium' : 'low');
    return {
      career_family_id: familyId,
      level: level,
      supported_by: supported.map(function (x) { return x.by; }),
      supported_signals: supported,
      missing: missing
    };
  }

  /** 응시자가 쓴 도구를 카테고리별로 모은다. 이름만으로 숙련을 말하지 않는다. */
  function toolCategories(evRaw) {
    var out = {};
    (evRaw.tools || []).forEach(function (t) {
      if (!t.cat || !t.name) return;
      if (!out[t.cat]) out[t.cat] = [];
      out[t.cat].push(t.name);
    });
    var flat = {};
    Object.keys(out).forEach(function (k) { flat[k] = out[k].join(', '); });
    return flat;
  }

  function all(J, evRaw, rpList) {
    if (!RULES || !evRaw) return null;
    var ev = window.PCAEvidence.normalize(evRaw, rpList);
    var cats = toolCategories(evRaw);
    var out = {};
    (J.job_fit || []).forEach(function (f) {
      if (!f.career_family_id) return;
      var r = forFamily(f.career_family_id, ev, evRaw.projects || [], cats);
      if (r) out[f.career_family_id] = r;
    });
    return out;
  }

  /* 연구 수행 성숙도 (RP0~RP4).
     **학위로 배정하지 않는다.** 응시자가 적은 과제에서 근거를 찾아 올린다.
     근거가 없으면 올라가지 않고, 왜 못 올라갔는지를 같이 적는다. */
  var LADDER = [
    { id: 'RP0', n: '참여' },
    { id: 'RP1', n: '과업 수행' },
    { id: 'RP2', n: '과제 덩어리' },
    { id: 'RP3', n: '과제 설계 참여' },
    { id: 'RP4', n: '과제 총괄' }
  ];

  function nonEmpty(a) { return Array.isArray(a) ? a.filter(Boolean).length > 0 : !!a; }
  function filled(v) { return !window.PCAEvidence.isBlank(v); }

  function maturity(rpList) {
    if (!rpList || !rpList.length) return null;
    var ev = [], level = 0;

    rpList.forEach(function (r) {
      var ex = r.execution || {}, pl = r.planning || {}, tm = r.team || {}, bd = r.budget || {};

      /* RP1. 내 과업을 내가 끌고 갔다 */
      if (filled(r.objective && r.objective.my_objective)) {
        ev.push({ lv: 1, t: '내가 맡은 목표를 적었다' });
      }
      if (nonEmpty(ex.methods) || nonEmpty(ex.experiments) || nonEmpty(ex.simulations)) {
        ev.push({ lv: 1, t: '쓴 방법을 적었다' });
      }
      /* RP2. 덩어리를 맡아 안팎을 맞췄다 */
      if (nonEmpty(pl.work_packages)) ev.push({ lv: 2, t: '세부 과제를 나눠 적었다' });
      if (filled(pl.timeline_role)) ev.push({ lv: 2, t: '일정에 관여했다' });
      if (nonEmpty(pl.milestones)) ev.push({ lv: 2, t: '중간 점검 기준이 있었다' });
      if (nonEmpty(ex.key_decisions)) ev.push({ lv: 2, t: '직접 고른 지점을 적었다' });
      if (nonEmpty(tm.collaborating_orgs)) ev.push({ lv: 2, t: '다른 기관과 맞물려 일했다' });
      /* RP3. 계획서 단계부터 들어갔다 */
      if (pl.rfp_reviewed === true) ev.push({ lv: 3, t: '공고와 과제요청서를 읽었다' });
      if (nonEmpty(pl.kpis)) ev.push({ lv: 3, t: '성과지표를 다뤘다' });
      if (nonEmpty(pl.deliverables)) ev.push({ lv: 3, t: '결과물 목록을 다뤘다' });
      if (filled(pl.risk_planning)) ev.push({ lv: 3, t: '위험 요인을 적었다' });
      if (filled(bd.my_budget_role) && ['B3', 'B4', 'B5'].indexOf(bd.my_budget_role) >= 0) {
        ev.push({ lv: 3, t: '예산 산정에 들어갔다' });
      }
      /* RP4. 끌고 갔다 */
      if (bd.my_budget_role === 'B5') ev.push({ lv: 4, t: '예산을 맡아 집행했다' });
      if (filled(tm.my_role) && /총괄|책임|리드|PI|과제책임/i.test(tm.my_role)) {
        ev.push({ lv: 4, t: '과제 책임 자리에 있었다' });
      }
      if (nonEmpty(ex.plan_changes)) ev.push({ lv: 4, t: '조건이 바뀌었을 때 계획을 고쳤다' });
    });

    /* 한 칸을 올리려면 그 칸의 근거가 둘 이상 있어야 한다. 하나로 올리면
       칸 하나를 채운 사람과 끌고 간 사람이 같아진다. */
    for (var lv = 1; lv <= 4; lv++) {
      var n = ev.filter(function (x) { return x.lv === lv; }).length;
      if (n >= 2) level = lv; else break;
    }
    var next = level + 1;
    var NEED = {
      1: ['내가 맡은 목표', '쓴 방법'],
      2: ['세부 과제 나누기', '일정 관여', '중간 점검 기준', '직접 고른 지점'],
      3: ['공고·과제요청서 해석', '성과지표', '결과물 목록', '위험 요인', '예산 산정'],
      4: ['예산 집행', '과제 책임', '계획 변경 결정']
    };
    return {
      level: LADDER[level].id,
      label: LADDER[level].n,
      evidence: ev.filter(function (x) { return x.lv <= level; })
        .map(function (x) { return x.t; })
        .filter(function (v, i, a) { return a.indexOf(v) === i; }),
      missing_for_next_level: next <= 4 ? NEED[next] : []
    };
  }

  return { all: all, forFamily: forFamily, maturity: maturity, LADDER: LADDER };
})();
