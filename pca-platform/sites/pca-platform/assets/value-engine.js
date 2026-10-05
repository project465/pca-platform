/* 전공과 경험을 조직의 성과로 옮기는 엔진.
 *
 * **점수를 만들지 않는다.** 여기서 나오는 것은 전부 사슬과 단계와 근거이고,
 * 적합도·관심·경험·결정 소유·업무 방식·학습 의향은 한 값도 건드리지 않는다.
 * 조직 유형을 바꿔도 그 여섯은 그대로고 ValuePath 만 갈린다.
 *
 * **도구 이름으로 숙련을 말하지 않는다.** `ANSYS 를 씁니다` 는 활동까지다.
 * 무엇을 판단했고 무엇을 남겼고 무엇과 견주었는지가 있어야 그 위로 간다.
 *
 * **학위로 단계를 배정하지 않는다.** 석사라서 E2, 박사라서 E3 로 두면 그
 * 줄은 아무것도 재지 않은 줄이 된다. 적어 주신 칸에서만 올라간다.
 */
window.PCAValue = (function () {
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

  var K = (window.PCA_KNOWLEDGE || {}).domains || [];
  var TOOLS = window.PCA_TOOLS || { categories: [] };
  var VP = (window.PCA_VALUE_PATHS || {}).families || [];
  var ORG = (window.PCA_ORG_TYPES || {}).organization_types || [];

  /* ── 증거 사다리 여섯 칸 ────────────────────────────────────────────
     아래 칸이 비어 있으면 위 칸을 확정으로 올리지 않는다. 도구를 썼다는
     말만으로 성과까지 건너뛰면 그 줄이 거짓이 된다. */
  /* **배열도 모듈 최상위다.** 여기서 `T()` 를 부르면 불러올 때 한 번만
     평가돼 한국어로 굳는다. 사다리는 꺼내 쓰는 자리에서 옮긴다 */
  var LADDER = [
    { id: 'E0', n: '활동', q: '무엇을 했는가' },
    { id: 'E1', n: '판단', q: '무엇을 직접 정했는가' },
    { id: 'E2', n: '산출물', q: '무엇을 남겼는가' },
    { id: 'E3', n: '성과', q: '어떤 기준과 견주었는가' },
    { id: 'E4', n: '조직 가치', q: '어디에 쓰였는가' },
    { id: 'E5', n: '반복 가능성', q: '다시 쓸 수 있는가' }
  ];
  var LV = { E0: 0, E1: 1, E2: 2, E3: 3, E4: 4, E5: 5 };

  /** 가치 사슬은 데이터 파일에서 묶음으로 온다. 잎마다 부르면 빠뜨린다 */
  function DEEP(v) { return window.PCAI18N ? window.PCAI18N.deep(v) : v; }


  function s(v) { return String(v === null || v === undefined ? '' : v).trim(); }
  function nz(v) { return s(v).length > 0; }
  function arr(v) { return Array.isArray(v) ? v.filter(function (x) { return nz(x); }) : []; }
  function low(v) { return s(v).toLowerCase(); }
  function uniq(a) { return a.filter(function (v, i, x) { return x.indexOf(v) === i; }); }

  /* 기준과 견주었다고 볼 수 있는 말. 숫자나 기준이 함께 있어야 성과다.
     '잘 됐습니다' 는 성과가 아니고 소감이다. */
  var MEASURED = /\d|%|배|이상|이하|기준|규격|스펙|목표치|허용|오차|편차|대비|비교|감소|증가|단축|향상|만족|합격|불합격|통과/;

  /* ── 경험 하나를 사다리에 올린다 ─────────────────────────────────── */
  function rungsOf(x) {
    /* x: { id, title, kind, did, decided, outputs[], result, measured,
            changed, tools[], methods[], used_in, reused } */
    var hit = { E0: [], E1: [], E2: [], E3: [], E4: [], E5: [] };

    if (nz(x.title) || nz(x.did) || arr(x.tools).length) {
      hit.E0.push(nz(x.did) ? x.did : (nz(x.title) ? x.title : arr(x.tools).join(', ')));
    }
    if (nz(x.decided)) hit.E1.push(x.decided);
    arr(x.decisions_by_tool).forEach(function (d) { hit.E1.push(d); });

    arr(x.outputs).forEach(function (o) { hit.E2.push(o); });

    if (nz(x.measured) && MEASURED.test(x.measured)) hit.E3.push(x.measured);
    else if (nz(x.result) && MEASURED.test(x.result)) hit.E3.push(x.result);
    arr(x.validations).forEach(function (v) { if (nz(v)) hit.E3.push(v); });

    if (nz(x.used_in)) hit.E4.push(x.used_in);
    if (nz(x.changed)) hit.E4.push(x.changed);

    if (x.reused) hit.E5.push(x.reused);

    /* 상태를 정한다. 아래가 비었으면 위는 확정으로 가지 않는다. */
    var out = [], capped = false;
    (window.PCAI18N ? window.PCAI18N.deep(LADDER) : LADDER).forEach(function (r) {
      var by = uniq(hit[r.id]);
      var state = by.length ? 'confirmed' : 'not_yet';
      if (capped && state === 'confirmed') state = 'partial';
      if (state !== 'confirmed') capped = true;
      out.push({ id: r.id, name: r.n, question: r.q, state: state, by: by });
    });
    return out;
  }

  function topRung(rungs) {
    var t = null;
    for (var i = 0; i < rungs.length; i++) {
      if (rungs[i].state === 'confirmed') t = rungs[i]; else break;
    }
    return t;
  }

  /* 다음 칸을 채우려면 무엇을 더 적어야 하는가. '경험이 부족하다' 고
     쓰지 않는다. 적지 않은 것과 없는 것은 다르다. */
  var ASK_NEXT = {
    E1: ['그 일에서 직접 정한 것은 무엇이었습니까',
         '고를 수 있던 다른 안은 무엇이었습니까',
         '그 안을 고른 기준은 무엇이었습니까'],
    E2: ['남은 결과물은 무엇입니까 (도면 · 보고서 · 코드 · 데이터)',
         '그 결과물을 지금도 꺼내 보실 수 있습니까'],
    E3: ['결과가 맞다는 것을 무엇으로 확인했습니까',
         '견준 기준이나 숫자가 있었습니까',
         '시험값이나 다른 방법과 맞춰 보셨습니까'],
    E4: ['그 결과가 실제로 어디에 쓰였습니까',
         '그것 때문에 무엇이 달라졌습니까',
         '다른 사람이 그 결과를 받아 썼습니까'],
    E5: ['같은 방법을 다른 과제에도 쓰셨습니까',
         '다른 사람이 그대로 따라 할 수 있게 적어 두셨습니까']
  };
  /* 도구 한 줄은 되묻는 말이 다르다. 규격 11장이 든 예가 이 자리다 */
  var ASK_TOOL = {
    E1: ['무엇을 분석하셨습니까',
         '어떤 조건을 바꿔 가며 견주셨습니까',
         '그 결과로 무엇을 정하셨습니까'],
    E2: ['무엇을 결과물로 남기셨습니까 (보고서 · 도면 · 데이터)'],
    E3: ['결과를 어떻게 검증하셨습니까',
         '시험값이나 다른 방법과 맞춰 보셨습니까'],
    E4: ['그 결과가 실제 과제나 제품에 쓰였습니까'],
    E5: ['같은 방법을 다른 과제에도 쓰셨습니까']
  };
  function nextAsk(rungs, kind) {
    var table = kind === 'tool' ? ASK_TOOL : ASK_NEXT;
    for (var i = 0; i < rungs.length; i++) {
      if (rungs[i].state !== 'confirmed') {
        return {
          rung: rungs[i].id, name: T(rungs[i].name),
          questions: DEEP(table[rungs[i].id] || [])
        };
      }
    }
    return null;
  }

  /* ── 응시자의 경험을 한 모양으로 모은다 ──────────────────────────── */
  function experiences(evRaw, rpList) {
    var out = [];
    evRaw = evRaw || {};
    rpList = rpList || [];

    /* 도구는 경험에 붙여 둔다. 어느 경험에 붙었는지 적지 않은 도구는
       그 자체로 한 줄이 되지만 활동까지만 간다. */
    var toolsByExp = {};
    (evRaw.tools || []).forEach(function (t) {
      var key = s(t.exp_id);
      if (!key) return;
      if (!toolsByExp[key]) toolsByExp[key] = [];
      toolsByExp[key].push(t);
    });

    (evRaw.projects || []).forEach(function (p) {
      var linked = toolsByExp[p.id] || [];
      out.push({
        id: p.id, title: p.title, kind: 'project', type: p.type,
        did: p.what_i_did, decided: p.decisions_i_made,
        decisions_by_tool: linked.map(function (t) { return t.decision; }),
        validations: linked.map(function (t) { return t.validation; }),
        outputs: arr(p.outputs).concat(linked.map(function (t) { return t.output; })),
        result: p.result, measured: p.measurable_result,
        changed: p.what_changed,
        used_in: (p.type === 'work' || p.type === 'internship' || p.type === 'research')
          ? (nz(p.objective) ? p.objective : '') : '',
        tools: arr(p.tools).concat(linked.map(function (t) { return t.name; })),
        methods: arr(p.methods)
      });
    });

    (evRaw.internships || []).forEach(function (n, i) {
      if (!nz(n)) return;
      out.push({ id: 'in' + i, title: n, kind: 'internship', did: n,
        outputs: [], tools: [], methods: [], used_in: n });
    });
    (evRaw.employment || []).forEach(function (n, i) {
      if (!nz(n)) return;
      out.push({ id: 'em' + i, title: n, kind: 'work', did: n,
        outputs: [], tools: [], methods: [], used_in: n });
    });

    /* 경험에 붙이지 않은 도구도 한 줄이 된다. "ANSYS 를 씁니다" 는 그
       자체로 활동이고, 그 위 칸이 비어 있다는 것을 보여 줘야 응시자가
       무엇을 더 적을지 안다. 붙인 도구는 그 경험 쪽에서 이미 센다 */
    (evRaw.tools || []).forEach(function (t, i) {
      if (s(t.exp_id) || !nz(t.name)) return;
      out.push({
        id: 'tool' + i, title: t.name, kind: 'tool',
        did: nz(t.why) ? t.why : (t.name + T(' 를 써 봤습니다')),
        decided: t.decision,
        outputs: arr([t.output]),
        validations: arr([t.validation]),
        measured: t.validation, result: '',
        used_in: '', changed: '',
        tools: [t.name], methods: []
      });
    });

    rpList.forEach(function (r) {
      var ex = r.execution || {}, pl = r.planning || {}, ob = r.objective || {},
          op = r.outputs || {}, fc = r.funding_context || {};
      var outs = [].concat(arr(op.papers), arr(op.patents), arr(op.reports),
        arr(op.prototypes), arr(op.datasets), arr(op.software), arr(op.other));
      out.push({
        id: r.id, title: r.project_title, kind: 'research',
        did: arr(ex.methods).join(', '),
        decided: arr(ex.key_decisions).join(', '),
        outputs: outs,
        result: arr(pl.kpis).join(', '),
        measured: arr(pl.kpis).join(', '),
        validations: arr(ex.experiments).concat(arr(ex.simulations)),
        /* 과제에 발주처와 목표가 있으면 그 결과가 쓰인 자리가 분명하다 */
        used_in: (nz(fc.sponsor_name) || nz(fc.program_name))
          ? (s(fc.program_name) || s(fc.sponsor_name)) : '',
        changed: arr(ex.plan_changes).join(', '),
        tools: arr(ex.equipment).concat(arr(ex.simulations)),
        methods: arr(ex.methods),
        my_objective: ob.my_objective
      });
    });

    /* 반복 가능성. **학위로 짐작하지 않는다.** 같은 방법이 두 경험 이상에
       나오거나, 같은 도구를 여러 과제에서 반복해 썼다고 적으신 경우만
       올린다. 전달 가능성은 지도·멘토링 기록이 있을 때만 본다. */
    var methodCount = {};
    out.forEach(function (x) {
      uniq(arr(x.methods)).forEach(function (m) {
        methodCount[low(m)] = (methodCount[low(m)] || 0) + 1;
      });
    });
    var repeatedTools = {};
    (evRaw.tools || []).forEach(function (t) {
      /* 여러 과제에서 반복해 썼다고 **적어 주신** 경우만 센다 */
      if (t.level === 'repeated') repeatedTools[low(t.name)] = t.name;
    });
    out.forEach(function (x) {
      var reuse = arr(x.methods).filter(function (m) { return methodCount[low(m)] >= 2; });
      var rt = arr(x.tools).filter(function (t) { return repeatedTools[low(t)]; });
      if (reuse.length) x.reused = T('다른 경험에서도 쓴 방법: ') + uniq(reuse).join(', ');
      else if (rt.length) x.reused = T('여러 과제에서 반복해 쓴 도구: ') + uniq(rt).join(', ');
    });

    out.forEach(function (x) {
      x.rungs = rungsOf(x);
      x.top = topRung(x.rungs);
      x.next = nextAsk(x.rungs, x.kind);
    });
    return out;
  }

  /* ── 도구·기술 증거 ─────────────────────────────────────────────── */
  function catOf(name) {
    var n = low(name);
    for (var i = 0; i < TOOLS.categories.length; i++) {
      var c = TOOLS.categories[i];
      for (var j = 0; j < c.tools.length; j++) {
        if (low(c.tools[j]) === n) return c;
      }
    }
    return null;
  }
  /* 입력 화면의 갈래 코드와 여기 갈래가 따로 자랐다. 둘 다 받는다 */
  function catById(id) {
    if (!id) return null;
    for (var i = 0; i < TOOLS.categories.length; i++) {
      var c = TOOLS.categories[i];
      if (c.id === id) return c;
      if ((c.intake || []).indexOf(id) >= 0) return c;
    }
    return null;
  }

  function toolEvidence(evRaw, exps) {
    var byId = {};
    (exps || []).forEach(function (x) { byId[x.id] = x; });
    return (evRaw && evRaw.tools ? evRaw.tools : []).map(function (t) {
      var c = catById(t.cat) || catOf(t.name);
      var exp = byId[s(t.exp_id)] || null;
      /* 사다리는 적어 주신 칸에서만 올라간다. 아래가 비면 위는 안 센다. */
      var lv = 'E0';
      if (nz(t.decision)) lv = 'E1';
      if (lv === 'E1' && nz(t.output)) lv = 'E2';
      if (lv === 'E2' && nz(t.validation) && MEASURED.test(t.validation)) lv = 'E3';
      if (lv === 'E3' && exp && exp.top && LV[exp.top.id] >= 4) lv = 'E4';
      return {
        tool_name: t.name,
        category: c ? c.id : (t.cat || null),
        category_name: c ? T(c.n) : null,
        linked_experience_id: exp ? exp.id : null,
        linked_experience: exp ? exp.title : null,
        usage_level: t.level || null,
        usage_purpose: s(t.why) || null,
        usage_context: s(t.where) || null,
        decision_supported: s(t.decision) || null,
        output: s(t.output) || null,
        validation: s(t.validation) || null,
        evidence_level: lv,
        families: c ? (c.families || []) : [],
        /* 비어 있는 칸을 되묻는다. 모자라다고 적지 않는다 */
        missing: [
          nz(t.why) ? null : T('어디에 썼는지'),
          nz(t.decision) ? null : T('무엇을 판단했는지'),
          nz(t.output) ? null : T('무엇을 남겼는지'),
          nz(t.validation) ? null : T('무엇과 견주었는지')
        ].filter(Boolean)
      };
    });
  }

  /* ── 전공지식: 들은 것과 쓴 것을 가른다 ──────────────────────────── */
  function domainById(id) {
    for (var i = 0; i < K.length; i++) { if (K[i].id === id) return K[i]; }
    return null;
  }

  function academicInputs(domainIds, evRaw, exps) {
    var courses = (evRaw && evRaw.courses ? evRaw.courses : [])
      .map(function (c) { return s(c.n); }).filter(nz);
    var expText = (exps || []).map(function (x) {
      return [x.title, x.did, x.decided, arr(x.methods).join(' '), arr(x.outputs).join(' ')].join(' ');
    });
    return (domainIds || []).map(function (id) {
      var d = domainById(id);
      if (!d) return null;
      var byCourse = courses.filter(function (c) {
        return (d.aliases || []).some(function (a) { return low(c).indexOf(low(a)) >= 0; });
      });
      var byUse = [];
      (exps || []).forEach(function (x, i) {
        var t = low(expText[i]);
        if ((d.aliases || []).some(function (a) { return t.indexOf(low(a)) >= 0; })) {
          byUse.push(x.title || x.id);
        }
      });
      /* **수강은 노출이지 역량이 아니다.** 쓴 자리가 보여야 known 으로 간다 */
      var conf = byUse.length ? 'known' : (byCourse.length ? 'inferred_from_course' : 'unknown');
      return {
        domain_id: d.id, label: T(d.name_ko),
        /* 과목 이름은 응시자가 적은 글이라 **옮기지 않는다** */
        user_evidence: uniq(byUse.concat(byCourse.map(function (c) { return T('수강: ') + c; }))),
        confidence: conf,
        work: DEEP(d.work), decisions: DEEP(d.decisions),
        outputs: DEEP(d.outputs), performance: DEEP(d.performance)
      };
    }).filter(Boolean);
  }

  /* ── 조직 유형 ──────────────────────────────────────────────────── */
  function orgById(id) {
    for (var i = 0; i < ORG.length; i++) { if (ORG[i].id === id) return ORG[i]; }
    return null;
  }
  function vpById(id) {
    for (var i = 0; i < VP.length; i++) { if (VP[i].career_family_id === id) return VP[i]; }
    return null;
  }

  /** 조직 맥락. 고르지 않으셨으면 고르지 않았다고 적고 네 유형을 나란히 둔다. */
  function organizationContext(target) {
    var picked = target && target.target_org_type ? orgById(target.target_org_type) : null;
    return {
      selected: picked ? picked.id : null,
      selected_name: picked ? T(picked.name_ko) : null,
      note: picked
        ? T('조직 유형은 적합도를 바꾸지 않습니다. 같은 응답이라도 결과물과 성과 기준이 달라집니다.')
        : T('조직 유형을 고르지 않으셨습니다. 네 유형을 나란히 두고 같은 지식이 어떻게 달리 읽히는지 보여 드립니다.'),
      available: ORG.map(function (o) {
        return {
          id: o.id, name: T(o.name_ko), one_line: T(o.one_line),
          output_types: DEEP(o.output_types),
          performance_criteria: DEEP(o.performance_criteria),
          what_counts_as_value: DEEP(o.what_counts_as_value),
          reads_your_work_as: DEEP(o.reads_your_work_as)
        };
      }),
      target_organization: null,
      target_organization_note: T('특정 기관의 평가 지표는 확인된 자료가 있을 때만 넣습니다. 지금은 넣지 않았습니다.')
    };
  }

  /* ── ValuePath ──────────────────────────────────────────────────── */
  function matchExperiences(fam, exps, toolEv) {
    var famTools = {};
    (toolEv || []).forEach(function (t) {
      if ((t.families || []).indexOf(fam.career_family_id) >= 0 && t.linked_experience_id) {
        famTools[t.linked_experience_id] = true;
      }
    });
    var aliases = [];
    (fam.knowledge || []).forEach(function (id) {
      var d = domainById(id);
      if (d) aliases = aliases.concat(d.aliases || []);
    });
    var evShow = DEEP(fam.evidence_you_can_show || []);
    return (exps || []).filter(function (x) {
      if (famTools[x.id]) return true;
      var t = low([x.title, x.did, x.decided, arr(x.methods).join(' '),
        arr(x.outputs).join(' '), arr(x.tools).join(' ')].join(' '));
      if (aliases.some(function (a) { return t.indexOf(low(a)) >= 0; })) return true;
      return (fam.outputs || []).concat(evShow).some(function (o) {
        var head = low(o).split(/[ ·]/)[0];
        return head.length >= 2 && t.indexOf(head) >= 0;
      });
    });
  }

  function valuePath(familyId, orgTypeId, evRaw, exps, toolEv) {
    var fam = vpById(familyId);
    if (!fam) return null;
    var org = orgById(orgTypeId) || null;
    var variant = (fam.org_variants || {})[orgTypeId] || null;
    var mine = matchExperiences(fam, exps, toolEv);
    var myTools = (toolEv || []).filter(function (t) {
      return (fam.tool_categories || []).indexOf(t.category) >= 0;
    });

    var best = null;
    mine.forEach(function (x) {
      if (x.top && (!best || LV[x.top.id] > LV[best])) best = x.top.id;
    });

    /* 아직 성과 언어로 번역되지 않은 경험. '부족' 이라고 쓰지 않는다 */
    var untranslated = mine.filter(function (x) {
      return !x.top || LV[x.top.id] < 2;
    }).map(function (x) {
      return {
        experience_id: x.id, title: x.title || T('(제목 없음)'),
        confirmed_up_to: x.top ? x.top.name : null,
        follow_up: x.next ? x.next.questions : []
      };
    });

    /* 아직 비어 있는 증거. 그 직무가 보고 싶어 하는 것 가운데 안 걸린 것 */
    var shown = mine.length ? low(mine.map(function (x) {
      return [x.title, x.did, x.decided, arr(x.outputs).join(' '), arr(x.methods).join(' ')].join(' ');
    }).join(' ')) : '';
    var missing = DEEP(fam.evidence_you_can_show || []).filter(function (e) {
      var head = low(e).split(/[ ·]/)[0];
      return !(head.length >= 2 && shown.indexOf(head) >= 0);
    });

    return {
      value_path_id: familyId + '::' + (orgTypeId || 'any'),
      career_family_id: familyId,
      career_family_name: (window.PCAI18N
        ? window.PCAI18N.family(familyId)
        : ((window.PCA_V2_FAMILY_NAMES || {})[familyId] || familyId)),
      organization_type: orgTypeId || null,
      organization_type_name: org ? T(org.name_ko) : null,
      target_organization_id: null,
      problem: DEEP(fam.problem),

      academic_inputs: academicInputs(fam.knowledge, evRaw, exps),
      tools_technologies: myTools,
      work_activities: DEEP(fam.work),
      technical_decisions: DEEP(fam.decisions),
      /* 조직별 줄을 맨 앞에 두고 공통 줄을 잇는다. 같은 말이 두 번
         나오면 읽는 사람이 둘을 다른 것으로 읽는다 */
      outputs: DEEP(uniq(variant ? [variant.output].concat(fam.outputs) : fam.outputs)),
      performance_criteria: DEEP(uniq(variant
        ? s(T(variant.performance)).split(' · ').map(function (x) { return s(x); })
            .concat(fam.performance)
        : fam.performance)),
      organizational_value: org ? DEEP(org.what_counts_as_value) : [],
      reads_your_work_as: org ? T(org.reads_your_work_as) : null,

      user_evidence: mine.map(function (x) {
        return {
          evidence_id: x.id, source_experience_id: x.id,
          title: x.title || T('(제목 없음)'),
          evidence_level: x.top ? x.top.id : null,
          evidence_level_name: x.top ? x.top.name : null,
          rungs: x.rungs,
          why_it_matters: x.top
            ? (fam.career_family_id + T(' 에서 ') + x.top.name + T(' 까지 확인됩니다'))
            : null
        };
      }),
      evidence_top_level: best,
      untranslated_evidence: untranslated,
      missing_evidence: missing,
      next_validation_actions: DEEP((fam.check_missing || []).slice(0, 3)),
      org_variants: DEEP(fam.org_variants || {}),
      limitations: []
    };
  }

  /* ── 경험 전체를 성과 언어로 ─────────────────────────────────────── */
  function performanceEvidence(exps) {
    return (exps || []).map(function (x) {
      return {
        experience_id: x.id, title: x.title || T('(제목 없음)'), kind: x.kind,
        did: s(x.did) || null,
        decided: s(x.decided) || null,
        made: arr(x.outputs),
        checked_against: [s(x.measured), s(x.result)].filter(function (v) {
          return nz(v) && MEASURED.test(v);
        }).concat(arr(x.validations)),
        used_in: s(x.used_in) || null,
        rungs: x.rungs,
        confirmed_up_to: x.top ? { id: x.top.id, name: x.top.name } : null,
        next: x.next
      };
    });
  }

  /* ── 반복 가능성 ─────────────────────────────────────────────────
     한 번 냄 → 다시 쓸 수 있음 → 다른 문제로 옮김 → 남에게 넘김.
     **학위로 올리지 않는다.** 네 칸 전부 적어 주신 것에서만 나온다. */
  function repeatability(exps, evRaw) {
    var steps = [
      { id: 'once', n: T('한 번 결과를 냈습니다'), by: [] },
      { id: 'reusable', n: T('같은 방법을 다시 썼습니다'), by: [] },
      { id: 'transferable', n: T('다른 문제에도 옮겼습니다'), by: [] },
      { id: 'teachable', n: T('다른 사람이 쓰도록 넘겼습니다'), by: [] }
    ];
    var byMethod = {};
    (exps || []).forEach(function (x) {
      if (x.top && LV[x.top.id] >= 2) steps[0].by.push(x.title || x.id);
      uniq(arr(x.methods)).forEach(function (m) {
        if (!byMethod[low(m)]) byMethod[low(m)] = { name: m, kinds: {}, where: [] };
        byMethod[low(m)].kinds[x.type || x.kind] = true;
        byMethod[low(m)].where.push(x.title || x.id);
      });
    });
    Object.keys(byMethod).forEach(function (k) {
      var m = byMethod[k];
      if (m.where.length >= 2) {
        steps[1].by.push(m.name + ' (' + uniq(m.where).join(' · ') + ')');
        if (Object.keys(m.kinds).length >= 2) {
          steps[2].by.push(m.name + ' (' + Object.keys(m.kinds).join(' · ') + ')');
        }
      }
    });
    var ev = evRaw || {};
    [].concat(ev.mentoring || [], ev.leadership || []).forEach(function (n) {
      if (nz(n)) steps[3].by.push(n);
    });
    (ev.tools || []).forEach(function (t) {
      if (t.level === 'taught' && nz(t.name)) steps[3].by.push(t.name + T(' 를 남에게 설명해 봄'));
    });
    (exps || []).forEach(function (x) {
      if (x.kind === 'research' && nz(x.changed)) steps[3].by.push(x.title + T(': 계획을 고쳐 끌고 감'));
    });

    var level = null;
    for (var i = 0; i < steps.length; i++) {
      steps[i].by = uniq(steps[i].by);
      steps[i].state = steps[i].by.length ? 'confirmed' : 'not_yet';
      if (steps[i].state === 'confirmed') level = steps[i].id;
    }
    return {
      level: level, steps: steps,
      note: T('학위로 올리지 않습니다. 적어 주신 과제와 방법에서만 올라갑니다.')
    };
  }

  /* 사다리가 모자란데 '지원 준비' 라고 쓰지 않기 위한 값 */
  function ladderByFamily(paths) {
    var out = {};
    Object.keys(paths || {}).forEach(function (fid) {
      out[fid] = paths[fid] ? paths[fid].evidence_top_level : null;
    });
    return out;
  }

  return {
    LADDER: (window.PCAI18N ? window.PCAI18N.deep(LADDER) : LADDER), LV: LV,
    experiences: experiences,
    toolEvidence: toolEvidence,
    organizationContext: organizationContext,
    valuePath: valuePath,
    performanceEvidence: performanceEvidence,
    repeatability: repeatability,
    ladderByFamily: ladderByFamily,
    orgById: orgById, vpById: vpById, domainById: domainById,
    /* 표는 **날것으로 내보낸다.** 여기서 옮기면 두 가지가 틀어진다:
       이 줄이 파일을 읽을 때 한 번 돌아서 그때의 언어로 굳고, 묶음을
       통째로 옮기므로 별칭·검색어·과목 목록까지 영어가 되어 응시자가
       적은 글과 견주는 쪽이 조용히 깨진다. 옮기는 것은 **그리는 자리**다 */
    ORG_TYPES: ORG, PATHS: VP, KNOWLEDGE: K, TOOL_CATS: TOOLS.categories
  };
})();
