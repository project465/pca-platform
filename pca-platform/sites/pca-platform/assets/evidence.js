/* 경험을 받아 두는 곳.
 *
 * **이 값은 직무 적합도에 들어가지 않는다.** 검사 응답과 채점은 손대지
 * 않고, 여기 적힌 것은 준비 정도·경험 지도·자소서·면접·포트폴리오에만
 * 쓰인다. 경험을 고쳐도 FIT 은 그대로여야 한다. 그래서 저장도 따로 둔다.
 *
 *   pca_session_v1   응답과 점수 (손대지 않는다)
 *   pca_evidence_v1  경험
 *   pca_research_v1  연구 과제
 *   pca_target_v1    목표 국가 · 산업 · 직무
 *
 * **모르는 것을 쓰게 하지 않는다.** 총 연구비를 모르면 '모름' 이고, 해당이
 * 없으면 '해당 없음' 이며, 아직 안 적었으면 비어 있는 것이다. 셋은 다른
 * 뜻이라 따로 담는다. 그리고 **비었다고 불리해지지 않는다**: 준비 정도는
 * 걸린 신호만 세고, 안 적은 칸을 감점으로 쓰지 않는다.
 */
window.PCAEvidence = (function () {
  'use strict';

  var K_EV = 'pca_evidence_v1';
  var K_RP = 'pca_research_v1';
  var K_TG = 'pca_target_v1';

  /* 빈칸의 세 가지 뜻. 화면에서도 이 셋을 고르게 한다. */
  var BLANK = {
    UNKNOWN: 'unknown',             /* 있었는데 내가 모른다 */
    NOT_SUPPLIED: 'not_supplied',   /* 아직 안 적었다 */
    NOT_APPLICABLE: 'not_applicable' /* 그런 것이 없었다 */
  };
  function isBlank(v) {
    return v === null || v === undefined || v === '' ||
      v === BLANK.UNKNOWN || v === BLANK.NOT_SUPPLIED || v === BLANK.NOT_APPLICABLE;
  }
  /** 값이 있는 것만 돌려준다. 빈칸 표시는 숫자로도 문장으로도 쓰지 않는다. */
  function val(v) { return isBlank(v) ? null : v; }

  /* STEP 1 에서 고르는 경험의 종류. 고른 것만 다음 단계에 폼이 뜬다. */
  var KINDS = [
    { id: 'course',     n: '수강과목',        stages: ['bachelor', 'master', 'phd', 'postdoc'] },
    { id: 'project',    n: '프로젝트',        stages: ['bachelor', 'master', 'phd', 'postdoc'] },
    { id: 'research',   n: '연구',            stages: ['bachelor', 'master', 'phd', 'postdoc'] },
    { id: 'internship', n: '인턴 · 현장실습', stages: ['bachelor', 'master', 'phd', 'postdoc'] },
    { id: 'work',       n: '직장',            stages: ['bachelor', 'master', 'phd', 'postdoc'] },
    { id: 'tool',       n: '사용해 본 도구',  stages: ['bachelor', 'master', 'phd', 'postdoc'] },
    { id: 'paper',      n: '논문',            stages: ['master', 'phd', 'postdoc'] },
    { id: 'patent',     n: '특허',            stages: ['master', 'phd', 'postdoc'] },
    { id: 'competition', n: '공모전 · 대회',  stages: ['bachelor', 'master', 'phd', 'postdoc'] },
    { id: 'cert',       n: '자격증',          stages: ['bachelor', 'master', 'phd', 'postdoc'] },
    { id: 'talk',       n: '발표 · 학회',     stages: ['bachelor', 'master', 'phd', 'postdoc'] },
    { id: 'mentor',     n: '지도 · 리더십',   stages: ['master', 'phd', 'postdoc'] },
    { id: 'etc',        n: '그 밖에',         stages: ['bachelor', 'master', 'phd', 'postdoc'] }
  ];
  function kindsFor(stage) {
    return KINDS.filter(function (k) { return k.stages.indexOf(stage || 'bachelor') >= 0; });
  }

  /* 프로젝트 한 건. `what_i_did` 와 `decisions_i_made` 를 반드시 가른다.
     무엇을 했는지보다 무엇을 골랐는지가 서류와 면접에서 읽히는 자리다. */
  var PROJECT_TYPES = [
    { id: 'course_project', n: '수업 과제' },
    { id: 'capstone',       n: '졸업 과제 · 캡스톤' },
    { id: 'personal',       n: '개인 프로젝트' },
    { id: 'competition',    n: '공모전 · 대회' },
    { id: 'research',       n: '연구 · 연구실' },
    { id: 'internship',     n: '인턴 · 현장실습' },
    { id: 'work',           n: '직장' }
  ];

  function emptyProject() {
    return {
      id: 'p' + Date.now() + Math.floor(Math.random() * 1000),
      title: '', type: 'course_project',
      period: { start: '', end: '' },
      team_size: null, my_role: '', objective: '',
      what_i_did: '', decisions_i_made: '',
      tools: [], methods: [], outputs: [],
      result: '', measurable_result: '',
      difficulty: '', what_changed: '', what_i_learned: ''
    };
  }

  function emptyResearch() {
    return {
      id: 'r' + Date.now() + Math.floor(Math.random() * 1000),
      project_title: '',
      funding_context: {
        sponsor_name: '', management_agency: '', program_name: '',
        call_name: '', rfp_reference: ''
      },
      period: { start_date: '', end_date: '' },
      budget: {
        total_amount: null, currency: 'KRW',
        direct_cost: null, indirect_cost: null, my_budget_role: ''
      },
      team: { total_people: null, roles: [], my_role: '', collaborating_orgs: [] },
      objective: { project_objective: '', my_objective: '' },
      planning: {
        rfp_reviewed: BLANK.NOT_SUPPLIED, work_packages: [], timeline_role: '',
        milestones: [], kpis: [], deliverables: [],
        resource_planning: '', risk_planning: ''
      },
      execution: {
        methods: [], experiments: [], simulations: [], equipment: [], data: [],
        key_decisions: [], plan_changes: []
      },
      compliance: {
        safety: [], ethics: [], regulatory: [], security: [],
        quality: [], data_management: [], ip: []
      },
      outputs: {
        papers: [], patents: [], reports: [], prototypes: [],
        datasets: [], software: [], other: []
      }
    };
  }

  /* 학위 단계마다 **먼저 묻는 것**이 다르다. 학부생에게 연구비와 공고
     해석을 필수로 묻지 않는다. 겪은 사람만 선택으로 연다. */
  var ASK = {
    bachelor: {
      first: ['course', 'project', 'internship', 'competition', 'tool'],
      detail: ['decisions_i_made', 'outputs', 'what_i_learned'],
      research_detail: false
    },
    master: {
      first: ['course', 'project', 'research', 'tool', 'paper'],
      detail: ['decisions_i_made', 'methods', 'outputs', 'my_role'],
      research_detail: true,
      research_fields: ['funding_context', 'period', 'team', 'objective', 'execution', 'outputs']
    },
    phd: {
      first: ['research', 'project', 'paper', 'patent', 'tool', 'mentor'],
      detail: ['decisions_i_made', 'methods', 'outputs', 'my_role'],
      research_detail: true,
      research_fields: ['funding_context', 'period', 'budget', 'team', 'objective',
                        'planning', 'execution', 'compliance', 'outputs']
    },
    postdoc: {
      first: ['research', 'paper', 'patent', 'mentor', 'tool'],
      detail: ['decisions_i_made', 'methods', 'outputs', 'my_role'],
      research_detail: true,
      research_fields: ['funding_context', 'period', 'budget', 'team', 'objective',
                        'planning', 'execution', 'compliance', 'outputs']
    }
  };
  function askFor(stage) { return ASK[stage || 'bachelor'] || ASK.bachelor; }

  /* ── 저장 ──────────────────────────────────────────────────────────── */
  var mem = {};
  function get(k) {
    try {
      var s = localStorage.getItem(k);
      return s ? JSON.parse(s) : (mem[k] || null);
    } catch (e) { return mem[k] || null; }
  }
  function set(k, v) {
    mem[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  function emptyEvidence() {
    return {
      version: 1, updated_at: null,
      kinds: [],                 /* STEP 1 에서 고른 종류 */
      courses: [],               /* [{n, grade}] 성적은 선택이고 FIT 에 쓰지 않는다 */
      projects: [],
      tools: [],                 /* [{cat, name, level, where, why}] */
      certifications: [],
      publications: [], patents: [], presentations: [],
      awards: [], leadership: [], mentoring: [],
      internships: [], employment: [],
      notes: ''
    };
  }

  function loadEvidence() {
    var v = get(K_EV);
    if (!v) return emptyEvidence();
    var base = emptyEvidence();
    Object.keys(base).forEach(function (k) { if (v[k] === undefined) v[k] = base[k]; });
    return v;
  }
  function saveEvidence(v) { v.updated_at = Date.now(); set(K_EV, v); return v; }
  function loadResearch() { return get(K_RP) || []; }
  function saveResearch(a) { set(K_RP, a); return a; }
  function loadTarget() {
    var v = get(K_TG) || {};
    return {
      target_country: v.target_country || '',
      target_industries: v.target_industries || [],
      target_roles: v.target_roles || [],
      /* 가고 싶은 조직 유형. 적합도에 들어가지 않고 번역만 바꾼다 */
      target_org_type: v.target_org_type || ''
    };
  }
  function saveTarget(v) { set(K_TG, v); return v; }
  function clearAll() {
    [K_EV, K_RP, K_TG].forEach(function (k) {
      mem[k] = null;
      try { localStorage.removeItem(k); } catch (e) {}
    });
  }

  /** 넣은 것이 하나라도 있는가. 없으면 결과지가 fallback 으로 간다. */
  function has(ev, rp) {
    if (!ev) return false;
    return !!(ev.courses.length || ev.projects.length || ev.tools.length ||
      ev.certifications.length || ev.publications.length || ev.patents.length ||
      ev.presentations.length || ev.internships.length || ev.employment.length ||
      ev.mentoring.length || (rp && rp.length));
  }

  /* ── 규격 30장의 evidence 객체로 옮긴다 ─────────────────────────────── */
  function normalize(ev, rp) {
    ev = ev || emptyEvidence();
    rp = rp || [];
    var projects = ev.projects || [];
    var pick = function (t) {
      return projects.filter(function (p) { return p.type === t; })
        .map(function (p) { return p.title; }).filter(Boolean);
    };
    var methods = [], outputs = [];
    projects.forEach(function (p) {
      (p.methods || []).forEach(function (m) { if (methods.indexOf(m) < 0) methods.push(m); });
      (p.outputs || []).forEach(function (o) { if (outputs.indexOf(o) < 0) outputs.push(o); });
    });
    rp.forEach(function (r) {
      ((r.execution || {}).methods || []).forEach(function (m) {
        if (methods.indexOf(m) < 0) methods.push(m);
      });
    });
    return {
      coursework: (ev.courses || []).map(function (c) { return c.n; }).filter(Boolean),
      projects: projects.map(function (p) { return p.title; }).filter(Boolean),
      research: pick('research').concat(rp.map(function (r) { return r.project_title; })).filter(Boolean),
      internships: pick('internship').concat(ev.internships || []).filter(Boolean),
      employment: pick('work').concat(ev.employment || []).filter(Boolean),
      tools: (ev.tools || []).map(function (t) { return t.name; }).filter(Boolean),
      methods: methods,
      publications: (ev.publications || []).slice(),
      patents: (ev.patents || []).slice(),
      presentations: (ev.presentations || []).slice(),
      awards: (ev.awards || []).slice(),
      certifications: (ev.certifications || []).slice(),
      leadership: (ev.leadership || []).slice(),
      mentoring: (ev.mentoring || []).slice(),
      outputs: outputs
    };
  }

  return {
    BLANK: BLANK, isBlank: isBlank, val: val,
    KINDS: KINDS, kindsFor: kindsFor,
    PROJECT_TYPES: PROJECT_TYPES,
    emptyProject: emptyProject, emptyResearch: emptyResearch, emptyEvidence: emptyEvidence,
    askFor: askFor,
    loadEvidence: loadEvidence, saveEvidence: saveEvidence,
    loadResearch: loadResearch, saveResearch: saveResearch,
    loadTarget: loadTarget, saveTarget: saveTarget,
    clearAll: clearAll, has: has, normalize: normalize,
    KEYS: { evidence: K_EV, research: K_RP, target: K_TG }
  };
})();
