/* 경험 입력 화면.
 *
 * 한 화면에 전부 늘어놓지 않는다. **고른 것만 묻는다.** 먼저 어떤 경험이
 * 있는지 고르게 하고, 고른 종류의 폼만 다음 단계에 띄운다. 쓸 일이 없는
 * 칸이 스무 개 보이면 사람은 거기서 닫는다.
 *
 * 세 걸음이다.
 *
 *   1  어떤 경험이 있나요            종류 고르기
 *   2  고른 것만 적기                 빠른 입력 (3~5분)
 *   3  더 적을 수 있는 것             선택. 판단·자원·일정·성과지표·규정
 *
 * 2단계까지만 하고 나가도 결과지가 달라진다. 3단계는 STANDARD·PRO 에서
 * 쓸 곳이 더 많다고 적어 두고 강요하지 않는다.
 */
window.PCAEvidenceUI = (function () {
  'use strict';

  var EV = window.PCAEvidence;
  var RULES = (window.PCA_EVIDENCE_RULES && window.PCA_EVIDENCE_RULES.ME) || {};
  var ev = null, rp = null, tg = null, stage = 'bachelor', onDone = null, step = 1;

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function $(s) { return document.querySelector(s); }
  function el(id) { return document.getElementById(id); }
  function lines(v) {
    return String(v || '').split(/\n|,/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function join(a) { return (a || []).join(', '); }

  /* ── 1단계 ─────────────────────────────────────────────────────────── */
  function stepKinds() {
    var ks = EV.kindsFor(stage);
    return '<div class="evhead"><div class="eyebrow">1 / 3</div>' +
      '<h2>어떤 경험이 있나요</h2>' +
      '<p class="desc">고르신 것만 다음 화면에서 묻습니다. 없는 것은 고르지 ' +
      '않으셔도 되고, 나중에 다시 들어와 더하실 수 있습니다. 여기 적는 내용은 ' +
      '적합도 점수를 바꾸지 않습니다.</p></div>' +
      '<div class="evkinds">' + ks.map(function (k) {
        var on = ev.kinds.indexOf(k.id) >= 0;
        return '<button type="button" class="evkind' + (on ? ' on' : '') +
          '" data-k="' + k.id + '">' + esc(k.n) + '</button>';
      }).join('') + '</div>' +
      '<div class="evnav"><button type="button" class="ghost" id="evCancel">그만두기</button>' +
      '<button type="button" class="primary" id="evNext">다음</button></div>';
  }

  /* ── 2단계 ─────────────────────────────────────────────────────────── */
  function courseBox() {
    var cat = RULES.course_catalog || [];
    var mine = (ev.courses || []).map(function (c) { return c.n; });
    return '<div class="evsec"><h3>수강과목</h3>' +
      '<p class="note">들으신 과목을 고르시면 됩니다. 성적은 적지 않으셔도 되고, ' +
      '적으셔도 적합도에는 쓰지 않습니다.</p>' +
      '<div class="evchips">' + cat.map(function (c) {
        return '<button type="button" class="evchip' + (mine.indexOf(c) >= 0 ? ' on' : '') +
          '" data-course="' + esc(c) + '">' + esc(c) + '</button>';
      }).join('') + '</div>' +
      '<label class="evlab">목록에 없는 과목<input type="text" id="evCourseEtc" ' +
      'placeholder="쉼표로 구분" value="' + esc(join(ev.courseEtc)) + '"></label></div>';
  }

  function toolBox() {
    var cats = RULES.tool_categories || [], lv = RULES.tool_levels || [];
    return '<div class="evsec"><h3>사용해 본 도구</h3>' +
      '<p class="note">프로그램 이름만으로는 무엇을 할 줄 아는지 알 수 없어서, ' +
      '어디서 썼고 무엇을 하려고 썼는지를 같이 받습니다.</p>' +
      '<div id="evTools">' + (ev.tools || []).map(function (t, i) {
        return toolRow(t, i, cats, lv);
      }).join('') + '</div>' +
      '<button type="button" class="ghost small" id="evAddTool">도구 추가</button></div>';
  }
  function toolRow(t, i, cats, lv) {
    return '<div class="evrow" data-ti="' + i + '">' +
      '<select data-f="cat">' + cats.map(function (c) {
        return '<option value="' + c.id + '"' + (t.cat === c.id ? ' selected' : '') + '>' +
          esc(c.n) + '</option>';
      }).join('') + '</select>' +
      '<input type="text" data-f="name" placeholder="프로그램 이름" value="' + esc(t.name) + '">' +
      '<select data-f="level">' + lv.map(function (x) {
        return '<option value="' + x.id + '"' + (t.level === x.id ? ' selected' : '') + '>' +
          esc(x.n) + '</option>';
      }).join('') + '</select>' +
      '<input type="text" data-f="why" placeholder="무엇을 하려고 썼는가" value="' + esc(t.why) + '">' +
      '<button type="button" class="evdel" data-del="tool">지우기</button></div>';
  }

  function projectBox() {
    return '<div class="evsec"><h3>프로젝트 · 인턴 · 직장</h3>' +
      '<p class="note">한 건씩 적습니다. <b>무엇을 했는가</b>와 <b>무엇을 ' +
      '직접 골랐는가</b>를 따로 받는 것은, 서류와 면접에서 읽히는 쪽이 ' +
      '뒤엣것이기 때문입니다.</p>' +
      '<div id="evProjects">' + (ev.projects || []).map(projectCard).join('') + '</div>' +
      '<button type="button" class="ghost small" id="evAddProj">경험 추가</button></div>';
  }
  function projectCard(p, i) {
    return '<div class="evcard" data-pi="' + i + '">' +
      '<div class="evcard-h"><b>' + (i + 1) + '</b>' +
      '<button type="button" class="evdel" data-del="proj">지우기</button></div>' +
      '<label class="evlab">제목<input type="text" data-f="title" value="' + esc(p.title) + '"></label>' +
      '<label class="evlab">종류<select data-f="type">' + EV.PROJECT_TYPES.map(function (t) {
        return '<option value="' + t.id + '"' + (p.type === t.id ? ' selected' : '') + '>' +
          esc(t.n) + '</option>';
      }).join('') + '</select></label>' +
      '<div class="evpair">' +
        '<label class="evlab">시작<input type="text" data-f="start" placeholder="2025-03" value="' + esc(p.period.start) + '"></label>' +
        '<label class="evlab">끝<input type="text" data-f="end" placeholder="2025-12" value="' + esc(p.period.end) + '"></label>' +
      '</div>' +
      '<div class="evpair">' +
        '<label class="evlab">인원<input type="text" data-f="team_size" placeholder="모르면 비워 두십시오" value="' + esc(p.team_size) + '"></label>' +
        '<label class="evlab">내 역할<input type="text" data-f="my_role" value="' + esc(p.my_role) + '"></label>' +
      '</div>' +
      '<label class="evlab">목표<input type="text" data-f="objective" placeholder="무엇을 하려던 일이었는가" value="' + esc(p.objective) + '"></label>' +
      '<label class="evlab">한 일<textarea data-f="what_i_did" rows="2">' + esc(p.what_i_did) + '</textarea></label>' +
      '<label class="evlab"><b>직접 고른 것</b><textarea data-f="decisions_i_made" rows="2" ' +
        'placeholder="무엇을 놓고 고민했고 무엇을 골랐는가">' + esc(p.decisions_i_made) + '</textarea></label>' +
      '<div class="evpair">' +
        '<label class="evlab">쓴 도구<input type="text" data-f="tools" placeholder="쉼표로" value="' + esc(join(p.tools)) + '"></label>' +
        '<label class="evlab">쓴 방법<input type="text" data-f="methods" placeholder="쉼표로" value="' + esc(join(p.methods)) + '"></label>' +
      '</div>' +
      '<label class="evlab">남은 결과물<input type="text" data-f="outputs" placeholder="도면, 보고서, 코드, 시제품 …" value="' + esc(join(p.outputs)) + '"></label>' +
      '<div class="evmore" data-open="0">' +
        '<button type="button" class="evmore-b">더 적기 (선택)</button>' +
        '<div class="evmore-c">' +
          '<label class="evlab">결과<input type="text" data-f="result" value="' + esc(p.result) + '"></label>' +
          '<label class="evlab">숫자로 남은 것<input type="text" data-f="measurable_result" ' +
            'placeholder="실제로 잰 값만 적으십시오" value="' + esc(p.measurable_result) + '"></label>' +
          '<label class="evlab">가장 막혔던 곳<input type="text" data-f="difficulty" value="' + esc(p.difficulty) + '"></label>' +
          '<label class="evlab">계획에서 바뀐 것<input type="text" data-f="what_changed" value="' + esc(p.what_changed) + '"></label>' +
          '<label class="evlab">남은 것<input type="text" data-f="what_i_learned" value="' + esc(p.what_i_learned) + '"></label>' +
        '</div>' +
      '</div></div>';
  }

  function listBox(key, title, note) {
    return '<div class="evsec"><h3>' + esc(title) + '</h3>' +
      (note ? '<p class="note">' + esc(note) + '</p>' : '') +
      '<textarea data-list="' + key + '" rows="3" placeholder="한 줄에 하나씩">' +
      esc((ev[key] || []).join('\n')) + '</textarea></div>';
  }

  function stepForms() {
    var k = ev.kinds, out = [];
    out.push('<div class="evhead"><div class="eyebrow">2 / 3</div>' +
      '<h2>고르신 것만 적습니다</h2>' +
      '<p class="desc">3~5분이면 끝납니다. 모르는 칸은 비워 두셔도 되고, ' +
      '비워 둔다고 결과가 불리해지지 않습니다.</p></div>');
    if (k.indexOf('course') >= 0) out.push(courseBox());
    if (k.indexOf('project') >= 0 || k.indexOf('research') >= 0 ||
        k.indexOf('internship') >= 0 || k.indexOf('work') >= 0 ||
        k.indexOf('competition') >= 0) out.push(projectBox());
    if (k.indexOf('tool') >= 0) out.push(toolBox());
    if (k.indexOf('paper') >= 0) out.push(listBox('publications', '논문'));
    if (k.indexOf('patent') >= 0) out.push(listBox('patents', '특허'));
    if (k.indexOf('talk') >= 0) out.push(listBox('presentations', '발표 · 학회'));
    if (k.indexOf('cert') >= 0) out.push(listBox('certifications', '자격증'));
    if (k.indexOf('mentor') >= 0) out.push(listBox('mentoring', '지도 · 리더십',
      '후배나 학생을 지도한 것, 작은 묶음을 맡아 본 것을 적습니다.'));
    if (k.indexOf('etc') >= 0) out.push(listBox('awards', '그 밖에'));
    out.push('<div class="evnav"><button type="button" class="ghost" id="evBack">뒤로</button>' +
      '<button type="button" class="primary" id="evNext">다음</button></div>');
    return out.join('');
  }

  /* ── 3단계: 연구 과제와 목표 ──────────────────────────────────────── */
  function researchBox() {
    var ask = EV.askFor(stage);
    if (!ask.research_detail) {
      return '<div class="evsec"><h3>연구 과제 상세</h3>' +
        '<p class="note">학부 단계에서는 연구비와 공고 해석을 묻지 않습니다. ' +
        '연구 과제에 들어가 보신 적이 있으면 아래를 열어 적으실 수 있습니다.</p>' +
        '<button type="button" class="ghost small" id="evAddRp">연구 과제 적기</button>' +
        '<div id="evRps">' + rp.map(researchCard).join('') + '</div></div>';
    }
    return '<div class="evsec"><h3>연구 과제</h3>' +
      '<p class="note">과제 한 건을 적어 두시면 결과지에서 과제 카드와 면접 ' +
      '질문으로 이어집니다. 모르는 칸은 비워 두시고, 지어내서 적으시면 ' +
      '면접에서 바로 갈립니다.</p>' +
      '<div id="evRps">' + rp.map(researchCard).join('') + '</div>' +
      '<button type="button" class="ghost small" id="evAddRp">연구 과제 추가</button></div>';
  }
  function researchCard(r, i) {
    var f = r.funding_context, b = r.budget, t = r.team, o = r.objective,
        p = r.planning, x = r.execution;
    var adv = stage === 'phd' || stage === 'postdoc';
    return '<div class="evcard" data-ri="' + i + '">' +
      '<div class="evcard-h"><b>과제 ' + (i + 1) + '</b>' +
      '<button type="button" class="evdel" data-del="rp">지우기</button></div>' +
      '<label class="evlab">과제명<input type="text" data-f="project_title" value="' + esc(r.project_title) + '"></label>' +
      '<div class="evpair">' +
        '<label class="evlab">발주 · 지원 기관<input type="text" data-f="sponsor_name" placeholder="모르면 비워 두십시오" value="' + esc(f.sponsor_name) + '"></label>' +
        '<label class="evlab">전문기관<input type="text" data-f="management_agency" value="' + esc(f.management_agency) + '"></label>' +
      '</div>' +
      '<div class="evpair">' +
        '<label class="evlab">사업 · 공고 이름<input type="text" data-f="program_name" value="' + esc(f.program_name) + '"></label>' +
        '<label class="evlab">기간<input type="text" data-f="period" placeholder="2024-03 ~ 2025-02" value="' +
          esc(r.period.start_date + (r.period.end_date ? ' ~ ' + r.period.end_date : '')) + '"></label>' +
      '</div>' +
      '<div class="evpair">' +
        '<label class="evlab">총 연구비<input type="text" data-f="total_amount" placeholder="모르면 비워 두십시오" value="' +
          esc(EV.isBlank(b.total_amount) ? '' : b.total_amount) + '"></label>' +
        '<label class="evlab">연구비에 닿은 정도<select data-f="my_budget_role">' +
          '<option value="">고르지 않음</option>' +
          (window.PCAResearch.BUDGET || []).map(function (x2) {
            return '<option value="' + x2.id + '"' + (b.my_budget_role === x2.id ? ' selected' : '') +
              '>' + esc(x2.id + ' · ' + x2.w) + '</option>';
          }).join('') + '</select></label>' +
      '</div>' +
      '<div class="evpair">' +
        '<label class="evlab">팀 인원<input type="text" data-f="total_people" placeholder="모르면 비워 두십시오" value="' +
          esc(EV.isBlank(t.total_people) ? '' : t.total_people) + '"></label>' +
        '<label class="evlab">내 역할<input type="text" data-f="my_role" value="' + esc(t.my_role) + '"></label>' +
      '</div>' +
      '<label class="evlab">협력 기관<input type="text" data-f="collaborating_orgs" placeholder="쉼표로" value="' + esc(join(t.collaborating_orgs)) + '"></label>' +
      '<label class="evlab">과제 목표<input type="text" data-f="project_objective" value="' + esc(o.project_objective) + '"></label>' +
      '<label class="evlab"><b>내가 맡은 목표</b><input type="text" data-f="my_objective" value="' + esc(o.my_objective) + '"></label>' +
      '<label class="evlab">쓴 방법<input type="text" data-f="methods" placeholder="쉼표로" value="' + esc(join(x.methods)) + '"></label>' +
      '<label class="evlab"><b>직접 고른 지점</b><textarea data-f="key_decisions" rows="2" placeholder="한 줄에 하나씩">' +
        esc((x.key_decisions || []).join('\n')) + '</textarea></label>' +
      (adv ? '<div class="evmore" data-open="0"><button type="button" class="evmore-b">기획 · 규정까지 적기 (선택)</button>' +
        '<div class="evmore-c">' +
        '<label class="evlab">공고 · 과제요청서를 보셨습니까<select data-f="rfp_reviewed">' +
          '<option value="not_supplied"' + (p.rfp_reviewed === 'not_supplied' ? ' selected' : '') + '>아직 안 적음</option>' +
          '<option value="true"' + (p.rfp_reviewed === true ? ' selected' : '') + '>읽고 반영했다</option>' +
          '<option value="false"' + (p.rfp_reviewed === false ? ' selected' : '') + '>확인하지 않았다</option>' +
          '<option value="not_applicable"' + (p.rfp_reviewed === 'not_applicable' ? ' selected' : '') + '>해당 없음</option>' +
        '</select></label>' +
        '<label class="evlab">세부 과제<input type="text" data-f="work_packages" placeholder="쉼표로" value="' + esc(join(p.work_packages)) + '"></label>' +
        '<label class="evlab">일정에 관여한 범위<input type="text" data-f="timeline_role" value="' + esc(p.timeline_role) + '"></label>' +
        '<label class="evlab">중간 점검<input type="text" data-f="milestones" placeholder="쉼표로" value="' + esc(join(p.milestones)) + '"></label>' +
        '<label class="evlab">성과지표<input type="text" data-f="kpis" placeholder="관여하지 않았으면 비워 두십시오" value="' + esc(join(p.kpis)) + '"></label>' +
        '<label class="evlab">결과물<input type="text" data-f="deliverables" placeholder="쉼표로" value="' + esc(join(p.deliverables)) + '"></label>' +
        '<label class="evlab">위험 요인<input type="text" data-f="risk_planning" value="' + esc(p.risk_planning) + '"></label>' +
        '<label class="evlab">계획에서 바뀐 것<textarea data-f="plan_changes" rows="2" placeholder="한 줄에 하나씩">' +
          esc((x.plan_changes || []).join('\n')) + '</textarea></label>' +
        '<label class="evlab">안전 · 규정 · 보안<input type="text" data-f="compliance" placeholder="쉼표로. 없으면 비워 두십시오" value="' +
          esc(join((r.compliance || {}).regulatory)) + '"></label>' +
        '</div></div>' : '') +
      '</div>';
  }

  function targetBox() {
    return '<div class="evsec"><h3>목표</h3>' +
      '<p class="note">목표 국가를 적으시면 그 나라에서 쓰는 직무 이름과 ' +
      '채용 관행을 결과지에 넣습니다. 지금은 확인된 자료가 있는 나라가 없어 ' +
      '비워 두셔도 결과가 달라지지 않습니다. <b>국적은 묻지 않습니다.</b> ' +
      '국적은 적합도와 아무 관계가 없습니다.</p>' +
      '<div class="evpair">' +
        '<label class="evlab">목표 국가<input type="text" id="evCountry" placeholder="KR · US · DE …" value="' + esc(tg.target_country) + '"></label>' +
        '<label class="evlab">목표 산업<input type="text" id="evInd" placeholder="쉼표로" value="' + esc(join(tg.target_industries)) + '"></label>' +
      '</div>' +
      '<label class="evlab">목표 직무<input type="text" id="evRoles" placeholder="쉼표로" value="' + esc(join(tg.target_roles)) + '"></label></div>';
  }

  function stepDetail() {
    return '<div class="evhead"><div class="eyebrow">3 / 3</div>' +
      '<h2>더 적으실 수 있는 것</h2>' +
      '<p class="desc">여기는 선택입니다. 적지 않으셔도 2단계까지로 결과지가 ' +
      '달라집니다. STANDARD·PRO 에서는 이 칸들이 쓰이는 곳이 더 많습니다.</p></div>' +
      researchBox() + targetBox() +
      '<div class="evnav"><button type="button" class="ghost" id="evBack">뒤로</button>' +
      '<button type="button" class="primary" id="evSave">저장하고 결과 보기</button></div>';
  }

  /* ── 그리기와 저장 ─────────────────────────────────────────────────── */
  function render() {
    var host = el('evBody');
    if (!host) return;
    host.innerHTML = step === 1 ? stepKinds() : (step === 2 ? stepForms() : stepDetail());
    wire();
    window.scrollTo(0, 0);
  }

  function collect() {
    /* 2단계 */
    var ce = el('evCourseEtc');
    if (ce) {
      ev.courseEtc = lines(ce.value);
      var base = (ev.courses || []).filter(function (c) { return !c.etc; });
      ev.courses = base.concat(ev.courseEtc.map(function (n) { return { n: n, etc: true }; }));
    }
    var tool = el('evTools');
    if (tool) {
      ev.tools = [].slice.call(tool.querySelectorAll('.evrow')).map(function (row) {
        var g = function (f) { var e2 = row.querySelector('[data-f="' + f + '"]'); return e2 ? e2.value.trim() : ''; };
        return { cat: g('cat'), name: g('name'), level: g('level'), where: '', why: g('why') };
      }).filter(function (t) { return t.name; });
    }
    var ps = el('evProjects');
    if (ps) {
      ev.projects = [].slice.call(ps.querySelectorAll('.evcard')).map(function (card, i) {
        var old = (ev.projects || [])[i] || EV.emptyProject();
        var g = function (f) { var e2 = card.querySelector('[data-f="' + f + '"]'); return e2 ? e2.value.trim() : ''; };
        return {
          id: old.id, title: g('title'), type: g('type'),
          period: { start: g('start'), end: g('end') },
          team_size: g('team_size') || null, my_role: g('my_role'),
          objective: g('objective'), what_i_did: g('what_i_did'),
          decisions_i_made: g('decisions_i_made'),
          tools: lines(g('tools')), methods: lines(g('methods')), outputs: lines(g('outputs')),
          result: g('result'), measurable_result: g('measurable_result'),
          difficulty: g('difficulty'), what_changed: g('what_changed'),
          what_i_learned: g('what_i_learned')
        };
      }).filter(function (p) { return p.title; });
    }
    [].slice.call(document.querySelectorAll('[data-list]')).forEach(function (t) {
      ev[t.getAttribute('data-list')] = lines(t.value);
    });
    /* 3단계 */
    var rps = el('evRps');
    if (rps) {
      rp = [].slice.call(rps.querySelectorAll('.evcard')).map(function (card, i) {
        var old = rp[i] || EV.emptyResearch();
        var g = function (f) { var e2 = card.querySelector('[data-f="' + f + '"]'); return e2 ? e2.value.trim() : ''; };
        var per = g('period').split('~');
        var rfp = g('rfp_reviewed');
        return {
          id: old.id, project_title: g('project_title'),
          funding_context: {
            sponsor_name: g('sponsor_name'), management_agency: g('management_agency'),
            program_name: g('program_name'), call_name: '', rfp_reference: ''
          },
          period: { start_date: (per[0] || '').trim(), end_date: (per[1] || '').trim() },
          budget: {
            total_amount: g('total_amount') || null, currency: 'KRW',
            direct_cost: null, indirect_cost: null, my_budget_role: g('my_budget_role')
          },
          team: {
            total_people: g('total_people') || null, roles: [],
            my_role: g('my_role'), collaborating_orgs: lines(g('collaborating_orgs'))
          },
          objective: { project_objective: g('project_objective'), my_objective: g('my_objective') },
          planning: {
            rfp_reviewed: rfp === 'true' ? true : (rfp === 'false' ? false : (rfp || EV.BLANK.NOT_SUPPLIED)),
            work_packages: lines(g('work_packages')), timeline_role: g('timeline_role'),
            milestones: lines(g('milestones')), kpis: lines(g('kpis')),
            deliverables: lines(g('deliverables')),
            resource_planning: '', risk_planning: g('risk_planning')
          },
          execution: {
            methods: lines(g('methods')), experiments: [], simulations: [],
            equipment: [], data: [],
            key_decisions: lines(g('key_decisions')), plan_changes: lines(g('plan_changes'))
          },
          compliance: {
            safety: [], ethics: [], regulatory: lines(g('compliance')),
            security: [], quality: [], data_management: [], ip: []
          },
          outputs: old.outputs || EV.emptyResearch().outputs
        };
      }).filter(function (r) { return r.project_title; });
    }
    var c = el('evCountry');
    if (c) {
      tg = {
        target_country: c.value.trim().toUpperCase(),
        target_industries: lines((el('evInd') || {}).value),
        target_roles: lines((el('evRoles') || {}).value)
      };
    }
  }

  function wire() {
    var host = el('evBody');
    host.onclick = function (e) {
      var t = e.target;
      if (t.classList.contains('evkind')) {
        var k = t.getAttribute('data-k'), i = ev.kinds.indexOf(k);
        if (i >= 0) ev.kinds.splice(i, 1); else ev.kinds.push(k);
        t.classList.toggle('on');
        return;
      }
      if (t.classList.contains('evchip')) {
        var n = t.getAttribute('data-course');
        var at = -1;
        (ev.courses || []).forEach(function (c, j) { if (c.n === n) at = j; });
        if (at >= 0) ev.courses.splice(at, 1); else ev.courses.push({ n: n });
        t.classList.toggle('on');
        return;
      }
      if (t.classList.contains('evmore-b')) {
        var box = t.parentNode;
        box.setAttribute('data-open', box.getAttribute('data-open') === '1' ? '0' : '1');
        return;
      }
      if (t.classList.contains('evdel')) {
        collect();
        var kind = t.getAttribute('data-del');
        var card = t.closest('.evcard, .evrow');
        var idx = [].slice.call(card.parentNode.children).indexOf(card);
        if (kind === 'proj') ev.projects.splice(idx, 1);
        if (kind === 'tool') ev.tools.splice(idx, 1);
        if (kind === 'rp') rp.splice(idx, 1);
        render();
        return;
      }
      if (t.id === 'evAddProj') { collect(); ev.projects.push(EV.emptyProject()); render(); return; }
      if (t.id === 'evAddTool') { collect(); ev.tools.push({ cat: 'cad', name: '', level: 'used', where: '', why: '' }); render(); return; }
      if (t.id === 'evAddRp') { collect(); rp.push(EV.emptyResearch()); render(); return; }
      if (t.id === 'evNext') {
        collect();
        if (step === 1 && !ev.kinds.length) { alert('하나 이상 고르십시오.'); return; }
        step += 1; render(); return;
      }
      if (t.id === 'evBack') { collect(); step -= 1; render(); return; }
      if (t.id === 'evCancel') { if (onDone) onDone(false); return; }
      if (t.id === 'evSave') {
        collect();
        EV.saveEvidence(ev); EV.saveResearch(rp); EV.saveTarget(tg);
        if (onDone) onDone(true);
        return;
      }
    };
  }

  function open(opts) {
    stage = (opts && opts.stage) || 'bachelor';
    onDone = opts && opts.onDone;
    ev = EV.loadEvidence(); rp = EV.loadResearch(); tg = EV.loadTarget();
    ev.courseEtc = (ev.courses || []).filter(function (c) { return c.etc; })
      .map(function (c) { return c.n; });
    step = 1;
    render();
  }

  return { open: open };
})();
