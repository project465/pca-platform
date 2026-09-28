/* PCA Platform — 화면 흐름 / 결과 렌더링
 *
 * 홈페이지 버튼에서 바로 들어오는 방법 (쿼리스트링)
 *   index.html                      → 소개 화면부터
 *   index.html?start=1              → 소개 건너뛰고 학과 선택부터
 *   index.html?major=ME             → 학과까지 지정, 응시자 정보부터
 *   index.html?major=ME&form=STANDARD
 *   index.html?major=ME&t=<토큰>&org=<기관명>   → 단체(1인 1링크) 응시
 *
 * form: QUICK(28) | STANDARD(68) | PRO(92). 기본값 QUICK.
 */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var E = window.PCAEngine;
  var KEY = 'pca_session_v1';

  var LIKERT = ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다'];
  var EXPLV = ['경험 없음', '접해봄', '직접 수행', '주도·성과'];
  var TYPE_LABEL = {
    LIKERT: '평소 생각과 가까운 정도를 선택해 주세요',
    FUTURE: '평소 생각과 가까운 정도를 선택해 주세요',
    CONSISTENCY: '평소 생각과 가까운 정도를 선택해 주세요',
    SJT: '실제 상황이라면 어떻게 하시겠습니까',
    PROBLEM: '어떻게 판단하시겠습니까',
    TRADEOFF: '둘 중 하나를 선택해 주세요',
    EXPERIENCE: '해당 경험의 수준을 선택해 주세요'
  };
  /* 단계. 무엇이 달라지는지를 화면에 그대로 적는다 — 고르는 사람이 고른
     결과를 알 수 있어야 한다. 대학원·연구 단계에서만 연구 역량 문항이 붙는다. */
  var STAGES = [
    { code: 'UNDERGRAD', label: '학부 재학 / 졸업예정', tag: 'UNDERGRAD',
      desc: '전공 안에서 어느 직무로 갈지를 봅니다.', grad: false },
    { code: 'EARLY',     label: '학부 졸업', tag: 'EARLY CAREER',
      desc: '같은 문항으로 보되, 경험 문항이 준비도에 그대로 반영됩니다.', grad: false },
    { code: 'MS',        label: '석사 재학 / 졸업예정', tag: 'GRAD M.S.',
      desc: '직무 적합도에 더해 연구 역량 8축을 함께 잽니다.', grad: true },
    { code: 'PHD',       label: '박사 재학 / 졸업예정', tag: 'GRAD Ph.D.',
      desc: '직무 적합도에 더해 연구 역량 8축을 함께 잽니다.', grad: true },
    { code: 'RESEARCH',  label: '석·박사 졸업 후', tag: 'RESEARCH CAREER',
      desc: '연구 경력 기준으로 읽습니다. 연구 역량 8축이 함께 나옵니다.', grad: true }
  ];
  var STAGE_BY = {};
  STAGES.forEach(function (x) { STAGE_BY[x.code] = x; });
  var GRAD = window.PCA_GRAD || null;

  var FORM_META = {
    QUICK: { n: 28, time: '4~6분' },
    STANDARD: { n: 68, time: '12~15분' },
    PRO: { n: 92, time: '18~25분' }
  };

  /* ── 상태 ─────────────────────────────────────────── */
  var S = {
    majorCode: null, form: 'QUICK', stage: null,
    profile: { name: '', gender: '', sid: '' },
    org: null, token: null,
    answers: {}, idx: 0, startedAt: null
  };
  var Q = [];          // 현재 출제 문항
  var major = null;    // 현재 학과 데이터
  var mem = null;      // localStorage 불가 시 대체
  var moving = false;  // 다음 문항으로 넘어가는 중 (두 번 두드림 막기)

  function store(v) {
    try {
      if (v === undefined) {
        var s = localStorage.getItem(KEY);
        return s ? JSON.parse(s) : null;
      }
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch (e) {
      if (v === undefined) return mem;
      mem = v;
    }
  }
  function save() {
    S.savedAt = Date.now();
    store(S);
  }
  function clearSession() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    mem = null;
  }

  function screen(id) {
    ['s-start', 's-stage', 's-major', 's-profile', 's-question', 's-result'].forEach(function (x) {
      var el = document.getElementById(x);
      if (el) el.classList.toggle('active', x === id);
    });
    $('#progArea').style.display = (id === 's-question') ? 'block' : 'none';
    $('#navQ').style.display = (id === 's-question') ? 'block' : 'none';
    $('#navMajor').style.display = (id === 's-major') ? 'block' : 'none';
    var ns = document.getElementById('navStage');
    if (ns) ns.style.display = (id === 's-stage') ? 'block' : 'none';
    window.scrollTo(0, 0);
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ── 학과 ─────────────────────────────────────────── */
  function majorReady(code) {
    return !!(window.PCA_DATA && window.PCA_DATA[code]);
  }

  function buildMajorList() {
    var list = (window.PCA_MAJORS || []).filter(function (m) { return m.status !== 'hidden'; });
    var ready = list.filter(function (m) { return m.status === 'ready' && majorReady(m.code); });
    var soon = list.filter(function (m) { return ready.indexOf(m) === -1; });

    var btn = function (m, ok) {
      return '<button class="major" data-code="' + esc(m.code) + '"' + (ok ? '' : ' disabled') + '>' +
        '<b>' + esc(m.name) + '</b>' +
        '<small>' + (ok ? '응시 가능' : '문항 개발 중') + '</small>' +
        (ok ? '' : '<span class="soon">준비중</span>') + '</button>';
    };

    var html = '<div class="groupname">응시 가능</div><div class="majorgrid">' +
      ready.map(function (m) { return btn(m, true); }).join('') + '</div>';

    if (soon.length) {
      var groups = [], seen = {};
      soon.forEach(function (m) {
        if (!seen[m.group]) { seen[m.group] = []; groups.push(m.group); }
        seen[m.group].push(m);
      });
      html += '<details class="soonwrap"><summary>준비중인 학과 ' + soon.length + '개 보기</summary>' +
        groups.map(function (g) {
          return '<div class="groupname">' + esc(g) + '</div><div class="majorgrid">' +
            seen[g].map(function (m) { return btn(m, false); }).join('') + '</div>';
        }).join('') + '</details>';
    }
    $('#majorList').innerHTML = html;

    $('#majorList').addEventListener('click', function (e) {
      var b = e.target.closest('.major');
      if (!b || b.disabled) return;
      Array.prototype.forEach.call(document.querySelectorAll('.major'), function (x) {
        x.classList.remove('selected');
      });
      b.classList.add('selected');
      S.majorCode = b.dataset.code;
      $('#btnMajorNext').disabled = false;
    });
  }

  function buildStageList() {
    var box = document.getElementById('stageList');
    if (!box) return;
    box.innerHTML = '<div class="majorgrid">' + STAGES.map(function (x) {
      return '<button class="major' + (S.stage === x.code ? ' selected' : '') +
        '" data-code="' + x.code + '"><strong>' + esc(x.label) + '</strong>' +
        '<small>' + esc(x.tag) + ' &middot; ' + esc(x.desc) + '</small></button>';
    }).join('') + '</div>' +
    (GRAD ? '<p class="note">연구 역량 문항은 ' + GRAD.items.length + '개입니다' +
      (GRAD.pending && GRAD.pending.length
        ? ' (설계된 ' + (GRAD.items.length + GRAD.pending.length) + '개 중 ' +
          GRAD.pending.length + '개는 선택지가 아직 없어 빠져 있습니다)' : '') + '.</p>' : '');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.major');
      if (!b) return;
      Array.prototype.forEach.call(box.querySelectorAll('.major'), function (x) {
        x.classList.remove('selected');
      });
      b.classList.add('selected');
      S.stage = b.dataset.code;
      document.getElementById('btnStageNext').disabled = false;
    });
  }
  function stageIsGrad() { return !!(S.stage && STAGE_BY[S.stage] && STAGE_BY[S.stage].grad); }
  function gradItems() {
    if (!stageIsGrad() || !GRAD) return [];
    return GRAD.items.map(function (it) {
      return { id: it.id, type: it.type, text: it.text, tier: 'QUICK', grad: true };
    });
  }

  function applyMajor(code) {
    S.majorCode = code;
    major = window.PCA_DATA[code];
    var meta = FORM_META[S.form] || FORM_META.QUICK;
    $('#badge').textContent = S.org || major.name;
    $('#pfMajor').textContent = major.name;
    $('#stQ').textContent = meta.n;
    $('#stT').textContent = meta.time;
    $('#stJ').textContent = major.jobs.length;
    Q = E.questionsFor(major, S.form).concat(gradItems());
    var st = STAGE_BY[S.stage];
    $('#stQ').textContent = Q.length;
    if (st) $('#badge').textContent = S.org || (major.name + ' · ' + st.tag);
  }

  /* ── 응시자 정보 ───────────────────────────────────── */
  function bindProfile() {
    $('#pfGender').addEventListener('click', function (e) {
      var b = e.target.closest('.seg');
      if (!b) return;
      Array.prototype.forEach.call(this.querySelectorAll('.seg'), function (x) {
        x.classList.remove('selected');
      });
      b.classList.add('selected');
      S.profile.gender = b.dataset.v;
    });
    $('#btnProfileNext').addEventListener('click', function () {
      S.profile.name = $('#pfName').value.trim();
      S.profile.sid = $('#pfSid').value.trim();
      var err = '';
      if (!S.profile.name) err = '이름을 입력해 주세요.';
      else if (!S.profile.gender) err = '성별을 선택해 주세요.';
      else if (!S.profile.sid) err = '학번을 입력해 주세요.';
      else if (!$('#pfAgree').checked) err = '결과 이용 동의가 필요합니다.';
      $('#pfErr').textContent = err;
      if (err) return;
      S.startedAt = S.startedAt || new Date().toISOString();
      S.idx = 0;
      save();
      renderQuestion();
      screen('s-question');
    });
  }

  /* ── 문항 ─────────────────────────────────────────── */
  function renderQuestion() {
    moving = false;
    if (S.idx >= Q.length) { showResult(); return; }
    var q = Q[S.idx];
    var cur = S.answers[q.id];

    $('#qidx').textContent = 'Q' + (S.idx + 1);
    $('#qtype').textContent = TYPE_LABEL[q.type] || '';
    $('#qtext').textContent = q.text;
    $('#btnPrev').style.visibility = S.idx === 0 ? 'hidden' : 'visible';

    var pct = Math.round((S.idx / Q.length) * 100);
    $('#prog').style.width = pct + '%';
    $('#progText').textContent = (S.idx + 1) + ' / ' + Q.length;
    $('#progPct').textContent = pct + '%';

    var hint = $('#scalehint'), opts = $('#opts'), html = '';

    if (q.type === 'EXPERIENCE') {
      hint.style.display = 'flex';
      hint.innerHTML = '<span>' + EXPLV[0] + '</span><span>' + EXPLV[3] + '</span>';
      html = EXPLV.map(function (t, i) {
        return '<button class="opt' + (String(cur) === String(i) ? ' selected' : '') +
          '" data-v="' + i + '"><span class="key">' + i + '</span><span>' + esc(t) + '</span></button>';
      }).join('');
    } else if (q.options) {
      hint.style.display = 'none';
      var keys = Object.keys(q.options);
      html = keys.map(function (k) {
        return '<button class="opt' + (cur === k ? ' selected' : '') +
          '" data-v="' + esc(k) + '"><span class="key">' + esc(k) + '</span><span>' +
          esc(q.options[k]) + '</span></button>';
      }).join('');
    } else {
      hint.style.display = 'flex';
      hint.innerHTML = '<span>' + LIKERT[0] + '</span><span>' + LIKERT[4] + '</span>';
      html = LIKERT.map(function (t, i) {
        var v = i + 1;
        return '<button class="opt' + (String(cur) === String(v) ? ' selected' : '') +
          '" data-v="' + v + '"><span class="key">' + v + '</span><span>' + esc(t) + '</span></button>';
      }).join('');
    }
    opts.innerHTML = html;
  }

  function bindQuestion() {
    $('#opts').addEventListener('click', function (e) {
      var b = e.target.closest('.opt');
      if (!b) return;
      /* 넘어가는 150ms 동안 선택지가 아직 화면에 있다. 손가락으로 두 번
         두드리면 두 번째 클릭이 여기까지 들어와 S.idx 를 한 칸 더 밀고,
         마지막 문항에서는 Q[S.idx] 가 없어 그대로 멈춘다. 잠그고, 없는
         문항이면 아무 일도 하지 않는다. */
      if (moving) return;
      var q = Q[S.idx];
      if (!q) return;
      Array.prototype.forEach.call(this.querySelectorAll('.opt'), function (x) {
        x.classList.remove('selected');
      });
      b.classList.add('selected');
      S.answers[q.id] = b.dataset.v;
      save();
      // 선택 즉시 150ms 후 다음 문항 (확인 버튼 없음)
      moving = true;
      setTimeout(function () {
        moving = false;
        S.idx++;
        save();
        if (S.idx >= Q.length) showResult();
        else renderQuestion();
      }, 150);
    });
    $('#btnPrev').addEventListener('click', function () {
      if (S.idx > 0) { S.idx--; save(); renderQuestion(); }
    });
  }

  /* ── 결과 ─────────────────────────────────────────── */
  var STRENGTH_TEXT = {
    APS: '문제를 여러 원인과 변수로 나누고 판단 근거를 만드는 데 강점이 나타납니다.',
    ST: '복잡한 문제를 구조와 관계로 정리하는 능력이 상대적으로 높습니다.',
    EI: '낯선 문제를 탐색하고 새로운 방법을 시도하는 성향이 높습니다.',
    VP: '결과의 정확성, 검증, 재현성을 중요하게 보는 경향이 나타납니다.',
    OPT: '기존 상태를 그대로 유지하기보다 성능·효율·재발 가능성을 개선하는 흐름이 강합니다.',
    DD: '수치와 데이터를 통해 문제를 확인하고 도구를 활용하는 방향이 강합니다.',
    EXE: '실제 현장에서 문제를 확인하고 행동으로 옮기는 경향이 강합니다.',
    CI: '여러 사람과 정보를 연결해 결과를 만드는 방향이 강합니다.'
  };
  var SCENE_TEXT = [
    '문제를 바로 해결하기보다 먼저 판단기준을 세우는 장면입니다.',
    '실제 업무에서는 여러 변수 중 우선 확인할 요소를 좁히는 과정이 중요합니다.',
    '결과를 한 번 얻는 것보다 오류와 차이를 검증하는 과정이 포함됩니다.',
    '최종 결과는 개인 분석에서 끝나지 않고 다른 부서나 후속 실행으로 연결됩니다.'
  ];
  var RESUME = [
    ['지원동기', '왜 이 직무인지 성향만 말하지 말고, 전공 경험과 실제 결과물로 연결합니다.'],
    ['직무역량', '프로젝트 이름보다 문제·역할·판단기준·결과를 중심으로 씁니다.'],
    ['문제해결', '무엇이 어려웠는지보다 어떤 가설을 세우고 무엇을 수정했는지를 보여줍니다.'],
    ['협업', '‘소통했다’보다 어떤 정보차이를 조정해 결과를 바꿨는지 설명합니다.']
  ];
  var CAUTIONS = [
    ['활동명만 나열하지 않기', '평가자는 활동 자체보다 본인의 역할과 판단을 확인합니다.'],
    ['직무 관심을 추상적으로 말하지 않기', '전공 경험·프로젝트 결과물과 직무 업무를 직접 연결합니다.'],
    ['결과만 강조하지 않기', '자료 수집, 기준 설정, 수정 과정까지 설명해야 합니다.'],
    ['모르는 전문용어를 과하게 쓰지 않기', '면접에서 설명 가능한 수준의 용어만 사용합니다.']
  ];
  var PORTFOLIO_STEPS = [
    ['문제 정의', '왜 이 문제를 선택했는지'],
    ['분석 기준', '어떤 변수와 기준으로 판단했는지'],
    ['핵심 발견', '데이터·해석·실험에서 무엇을 발견했는지'],
    ['개선 / 제안', '어떤 대안을 선택했고 왜 선택했는지'],
    ['직무 연결', '지원 직무의 어떤 업무와 닮아 있는지']
  ];

  function h(cls, inner) { return '<div class="' + cls + '">' + inner + '</div>'; }
  function sect(no, title, sub, body) {
    return '<div class="section"><h2 class="sect">' + (no ? no + '. ' : '') + esc(title) + '</h2>' +
      (sub ? '<p class="subdesc">' + sub + '</p>' : '') + body + '</div>';
  }
  function cards(arr) { return '<div class="grid">' + arr.join('') + '</div>'; }

  function jobCard(j, i) {
    var m = '<div class="metricgrid">' +
      '<div class="metric fit"><span>FIT</span><b>' + j.fit + '</b></div>' +
      (j.ready === null ? '' :
        '<div class="metric"><span>READY</span><b>' + j.ready + '</b></div>' +
        '<div class="metric"><span>EVIDENCE</span><b>' + j.evidence + '</b></div>') +
      '</div>';
    /* 번호 대신 군을 적는다. 01·02·03 은 그 순서가 실제로 갈린다는 뜻이고,
       여기서는 갈리지 않는다. */
    var badge = j.group ? j.group + '군' : pad2(i + 1);
    return '<div class="card job"><div class="jobtop"><div class="rank">' + badge +
      '</div><div class="jobname">' + esc(j.name) + '</div></div>' + m + '</div>';
  }

  function dnaRows(r) {
    return cards(major.dna.map(function (d) {
      return '<div class="card dnarow"><div class="dnatop"><span>' +
        esc(major.dna_labels[d]) + '</span><span>' + r.career_dna[d] + '</span></div>' +
        '<div class="bar"><i style="width:' + r.career_dna[d] + '%"></i></div></div>';
    }));
  }
  function styleRows(r) {
    return cards(major.style.map(function (d) {
      var v = r.work_style[d], l = major.style_labels[d];
      return '<div class="card stylerow"><div class="stylelabs"><span>' + esc(l[0]) +
        '</span><span>' + esc(l[1]) + '</span></div>' +
        '<div class="stylebar"><i class="dot" style="left:' + v + '%"></i></div>' +
        '<p class="note" style="text-align:center;margin:10px 0 0">' +
        Math.round(100 - v) + ' : ' + Math.round(v) + '</p></div>';
    }));
  }

  function showResult() {
    var r = E.score(major, S.form, S.answers);
    var gr = (stageIsGrad() && GRAD && E.scoreGrad) ? E.scoreGrad(GRAD, S.answers) : null;
    r.stage = S.stage || null;
    r.grad = gr;
    var top = r.jobs[0], c = top.job;
    var gs = top.gaps.slice(0, 3);
    var out = [];

    /* 머리말 */
    var when = new Date().toLocaleDateString('ko-KR');
    out.push('<div class="resulthead">' +
      '<div class="eyebrow">' + esc(major.name) +
        (STAGE_BY[S.stage] ? ' · ' + esc(STAGE_BY[S.stage].tag) : '') +
        ' · ' + esc(r.product_type) + ' RESULT</div>' +
      '<h1>' + esc(S.profile.name || '응시자') + '님의<br>진로·직무 진단 결과</h1>' +
      '<p class="desc">' + esc(when) + ' 응시 · ' + r.answered + '/' + r.question_count + '문항 응답' +
      (S.org ? ' · ' + esc(S.org) : '') + '</p>' +
      '<div class="insight"><small>CAREER PATTERN</small><strong>' + esc(r.career_pattern) +
      '</strong><p class="note" style="margin:10px 0 0">' +
      (r.group_size > 1
        ? esc(r.jobs.filter(function (j) { return j.group === 1; })
              .map(function (j) { return j.name; }).join(' · ')) +
          '이(가) 1군입니다. 이 안에서는 측정 오차보다 점수 차이가 작아 순위를 매기지 않습니다.'
        : esc(top.name) + '의 FIT은 ' + top.fit + '점으로 1군에 혼자 들어왔습니다.') +
      (top.ready === null ? ' 현재 준비도(READY)와 경험근거(EVIDENCE)는 STANDARD에서 확인할 수 있습니다.'
        : ' READY ' + top.ready + '점 / EVIDENCE ' + top.evidence + '점입니다. “잘 맞는 직무”와 “현재 준비된 직무”가 같은지는 별도로 확인해야 합니다.') +
      '</p></div></div>');

    var n = 0, no = function () { return pad2(++n); };

    /* 직무 적합도 */
    out.push(sect(no(), r.product_type === 'QUICK' ? 'TOP 3 직무 적합도' : 'TOP 5 직무 적합도',
      'FIT은 업무방식의 유사성입니다. 취업 가능성 점수가 아닙니다. ' +
      '같은 군에 있는 직무는 측정 오차(±' + r.fit_se + '점) 안에서 서로 갈리지 ' +
      '않습니다. 순서가 아니라 함께 살펴볼 묶음으로 읽어 주세요.',
      cards(r.top_jobs.map(jobCard))));

    /* 연구 역량 8축 — 대학원·연구 단계에서만 */
    if (gr) {
      var grRows = GRAD.dims.map(function (d) {
        var v = gr.scores[d.code], n = gr.items[d.code] || 0;
        return '<div class="card dnarow"><div class="dnatop"><span>' +
          esc(d.name) + ' <small style="opacity:.6">' + esc(d.code) + ' &middot; ' + n + '문항</small></span>' +
          '<span>' + v + '</span></div>' +
          '<div class="bar"><i style="width:' + v + '%"></i></div>' +
          '<p class="note" style="margin:8px 0 0">' + esc(d.signals) +
          '<br><b>읽는 곳</b> ' + esc(d.result_link) + '</p></div>';
      }).join('');
      out.push(sect(no(), '연구 역량 8축',
        '학위 연구에서 무엇을 해 왔는지를 보는 축입니다. 직무 적합도와 따로 계산하며, ' +
        '축마다 몇 문항으로 잰 값인지 함께 적었습니다. 두 문항으로 잰 축은 그만큼만 믿어 주세요.',
        '<div class="grid">' + grRows + '</div>'));
      out.push(sect(no(), '연구 역량 · 읽는 법', '',
        '<div class="card pad"><p class="note">가장 높게 나온 축은 <b>' +
        esc((GRAD.dims.filter(function (d) { return d.code === gr.ranked[0]; })[0] || {}).name || '') +
        '</b>, 가장 낮은 축은 <b>' +
        esc((GRAD.dims.filter(function (d) { return d.code === gr.ranked[gr.ranked.length - 1]; })[0] || {}).name || '') +
        '</b>입니다. ' + gr.answered + '/' + gr.item_count + '문항에 답하셨습니다.' +
        (gr.pending_items ? ' 설계된 문항 중 ' + gr.pending_items +
          '개는 선택지가 아직 없어 이번 결과에 들어가지 않았습니다.' : '') +
        '</p></div>'));
    }

    /* Career DNA */
    if (r.product_type === 'QUICK') {
      out.push(sect(no(), 'Core Career DNA', '가장 뚜렷하게 나타난 4개 특성입니다.',
        cards(r.dna_ranked.slice(0, 4).map(function (d) {
          return '<div class="card dnarow"><div class="dnatop"><span>' +
            esc(major.dna_labels[d]) + '</span><span>' + r.career_dna[d] + '</span></div>' +
            '<div class="bar"><i style="width:' + r.career_dna[d] + '%"></i></div></div>';
        }))));
    } else {
      out.push(sect(no(), 'Career DNA 8', '', dnaRows(r)));
    }

    /* Work Style */
    out.push(sect(no(), 'Work Style', '성향의 좋고 나쁨이 아니라 잘 맞는 업무 환경을 보는 축입니다.', styleRows(r)));

    if (r.product_type === 'QUICK') {
      /* QUICK — 즉시 행동 1개 + 안내 */
      out.push(sect(no(), '지금 해볼 행동 1개', '',
        '<div class="card contentcard"><div class="eyebrow">NEXT ACTION</div>' +
        '<h3>' + esc(top.name) + ' 채용공고 3개를 찾아 반복되는 업무를 적어보세요.</h3>' +
        '<p>' + esc(c.summary) + '</p><div class="divider"></div>' +
        c.tasks.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
        '</div>'));
      out.push('<div class="section"><div class="locked"><h4>현재 준비도까지 확인하려면</h4>' +
        '<p>STANDARD(68문항)에서는 FIT과 별도로 <b>READY(준비도)</b>, <b>EVIDENCE(경험근거)</b>,<br>' +
        '핵심 GAP과 30·60·90일 실행계획까지 제공합니다.<br>' +
        '지금까지 응답한 ' + Q.length + '문항은 그대로 이어집니다.</p></div></div>');
    } else {
      /* 핵심 강점 */
      out.push(sect(no(), '핵심 강점 프로파일', '',
        cards(r.dna_ranked.slice(0, 3).map(function (d, i) {
          return '<div class="card contentcard"><div class="eyebrow">CORE STRENGTH ' + pad2(i + 1) +
            '</div><h3>' + esc(major.dna_labels[d]) + ' · ' + r.career_dna[d] + '</h3><p>' +
            esc(STRENGTH_TEXT[d] || '') + '</p></div>';
        }))));

      /* TOP3 직무 상세 */
      out.push(sect(no(), 'TOP 3 직무 상세분석', '',
        cards(r.jobs.slice(0, 3).map(function (j, i) {
          return '<div class="card contentcard"><div class="eyebrow">TOP ' + pad2(i + 1) +
            ' · FIT ' + j.fit + '</div><h3>' + esc(j.name) + '</h3><p>' + esc(j.job.summary) + '</p>' +
            '<div class="divider"></div>' +
            j.job.tasks.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
            '<div class="divider"></div><p><b>확인할 부분:</b> READY ' + j.ready + ', EVIDENCE ' + j.evidence +
            '. FIT이 높더라도 실제 프로젝트·도구·현장 경험이 부족하면 지원 경쟁력은 별도로 보완해야 합니다.</p></div>';
        }))));

      /* 실제 업무 장면 */
      out.push(sect(no(), '실제 업무 장면',
        '입사하면 실제로 어떤 순서로 일하게 되는지 보여줍니다.',
        cards(c.scenes.map(function (x, i) {
          return '<div class="card contentcard"><div class="eyebrow">WORK SCENE ' + pad2(i + 1) +
            '</div><h4>' + esc(x) + '</h4><p>' + esc(SCENE_TEXT[i] || '') + '</p></div>';
        }))));

      /* FIT ≠ READY */
      out.push(sect(no(), 'FIT ≠ READY', '',
        '<div class="card contentcard"><h3>적합도는 높지만 준비도가 낮을 수 있습니다.</h3>' +
        '<p>FIT ' + top.fit + '은 업무방식의 유사성, READY ' + top.ready +
        '는 현재 준비상태를 의미합니다. 두 값을 같은 점수로 해석하지 않습니다.</p>' +
        '<div class="two" style="margin-top:12px">' +
        '<div class="scorebox"><span>FIT</span><b>' + top.fit + '</b></div>' +
        '<div class="scorebox"><span>READY</span><b>' + top.ready + '</b></div></div></div>' +
        '<div class="card contentcard" style="margin-top:10px"><h3>경험을 얼마나 증명할 수 있는가</h3>' +
        '<p>EVIDENCE ' + top.evidence + '은 “잘한다고 생각한다”가 아니라 실제 프로젝트·도구·문제해결 경험을 ' +
        '얼마나 제시할 수 있는지를 보는 값입니다. 이 직무의 판단 근거로 사용된 경험문항은 ' +
        top.evidenceBasis + '개입니다.</p></div>'));

      /* Experience Evidence */
      var evqs = Q.filter(function (q) { return q.type === 'EXPERIENCE' && q.role !== 'APPLY'; });
      out.push(sect(no(), 'Experience Evidence', '',
        cards(evqs.map(function (q) {
          var v = Number(S.answers[q.id] || 0);
          return '<div class="card contentcard"><h4>' +
            esc(q.text.replace('경험 수준은?', '').trim()) + '</h4>' +
            '<div class="bar"><i style="width:' + (v / 3 * 100) + '%"></i></div>' +
            '<p style="margin-top:8px">' + esc(EXPLV[v] || '미응답') + '</p></div>';
        }))));

      /* GAP */
      out.push(sect(no(), '핵심 GAP', '1순위 직무 요구수준과 가장 차이가 큰 영역입니다.',
        cards(gs.map(function (g, i) {
          return '<div class="card gapcard"><div class="eyebrow">PRIORITY ' + pad2(i + 1) +
            '</div><h4>' + esc(g.name) + '</h4>' +
            '<p>1순위 직무 요구수준 대비 현재 특성 점수에서 가장 큰 차이가 난 영역입니다.</p>' +
            '<div class="two" style="margin-top:10px">' +
            '<div class="scorebox"><span>현재</span><b>' + g.current + '</b></div>' +
            '<div class="scorebox"><span>직무 요구</span><b>' + g.target + '</b></div></div>' +
            '<p class="danger" style="margin-top:9px;font-weight:900">GAP ' + g.gap + '</p></div>';
        }))));

      /* 프로젝트 */
      out.push(sect(no(), '프로젝트 · 포트폴리오 전략', '',
        cards(c.projects.map(function (p, i) {
          return '<div class="card contentcard"><div class="eyebrow">PROJECT ' + pad2(i + 1) +
            '</div><h3>' + esc(p) + '</h3><ul>' +
            '<li>실제 문제 또는 공개 데이터를 사용합니다.</li>' +
            '<li>변수와 판단기준을 명확히 기록합니다.</li>' +
            '<li>결과보다 원인 분석과 개선 과정을 보여줍니다.</li>' +
            '<li>' + esc(top.name) + ' 채용공고의 업무 키워드와 연결합니다.</li></ul></div>';
        }))));

      /* 포트폴리오 구성법 */
      out.push(sect(no(), '포트폴리오 구성법',
        '결과물은 “관심 기록”이 아니라 직무 Evidence가 되어야 합니다.',
        cards(PORTFOLIO_STEPS.map(function (x, i) {
          return '<div class="card contentcard"><div class="eyebrow">STEP ' + pad2(i + 1) +
            '</div><h4>' + esc(x[0]) + '</h4><p>' + esc(x[1]) + '</p></div>';
        }))));

      /* 자소서 */
      out.push(sect(no(), '자기소개서 활용', '',
        cards(RESUME.map(function (x) {
          return '<div class="card contentcard"><h3>' + esc(x[0]) + '</h3><p>' + esc(x[1]) + '</p></div>';
        }))));

      /* 면접 */
      out.push(sect(no(), '면접 예상 질문', '',
        cards(c.interview.map(function (q, i) {
          return '<div class="card contentcard"><div class="eyebrow">QUESTION ' + pad2(i + 1) +
            '</div><h4>' + esc(q) + '</h4>' +
            '<p>답변은 상황 설명보다 판단 기준 → 행동 → 검증 결과 순서로 준비합니다.</p></div>';
        }))));

      /* 주의점 */
      out.push(sect(no(), '준비 시 주의할 점', '',
        cards(CAUTIONS.map(function (x) {
          return '<div class="card contentcard"><h4>' + esc(x[0]) + '</h4><p>' + esc(x[1]) + '</p></div>';
        }))));

      /* PRO 전용 */
      if (r.product_type === 'PRO') {
        var evdata = Q.filter(function (q) { return q.type === 'EXPERIENCE' && q.role !== 'APPLY'; })
          .map(function (q) { return { q: q, v: Number(S.answers[q.id] || 0) }; });
        var strong = evdata.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 4);
        var weak = evdata.slice().sort(function (a, b) { return a.v - b.v; }).slice(0, 4);
        var clean = function (t) { return esc(t.replace('경험 수준은?', '').trim()); };

        out.push(sect(no(), 'Evidence Strength Map', '가장 강하게 증명할 수 있는 경험입니다.',
          cards(strong.map(function (x, i) {
            return '<div class="card contentcard"><div class="eyebrow">STRONG EVIDENCE ' + pad2(i + 1) +
              '</div><h3>' + clean(x.q.text) + '</h3>' +
              '<div class="bar"><i style="width:' + (x.v / 3 * 100) + '%"></i></div>' +
              '<p style="margin-top:8px">' + esc(EXPLV[x.v] || '') + '</p></div>';
          }))));

        out.push(sect(no(), 'Experience → Job Transferability', '',
          cards(r.jobs.slice(0, 3).map(function (j, i) {
            return '<div class="card contentcard"><div class="eyebrow">TRANSFER ' + pad2(i + 1) +
              '</div><h3>' + esc(j.name) + '</h3><p>현재 보유 경험 중 <b>' +
              (strong[0] ? clean(strong[0].q.text) : '핵심 프로젝트') + '</b>를 이 직무의 ' +
              esc(j.job.tasks.slice(0, 2).join(', ')) + '와 연결해 설명할 수 있습니다.</p>' +
              '<div class="divider"></div><p><b>전환 포인트:</b> 경험 이름을 그대로 쓰기보다 ' +
              '문제 → 분석/판단 → 본인 행동 → 결과 → ' + esc(j.name) +
              ' 업무와의 유사성 순으로 재구성합니다.</p></div>';
          }))));

        out.push(sect(no(), 'Portfolio Priority', '',
          cards(c.projects.map(function (p, i) {
            return '<div class="card contentcard"><div class="eyebrow">PRIORITY ' + pad2(i + 1) +
              '</div><h3>' + esc(p) + '</h3><p>' +
              (i === 0 ? '현재 1순위 직무와 가장 직접적으로 연결되는 결과물입니다.'
                : '기존 경험의 부족한 Evidence를 보완하는 보조 결과물입니다.') + '</p><ul>' +
              '<li>문제 정의와 목표수치</li><li>본인 역할과 사용 도구</li>' +
              '<li>중간 실패/수정 과정</li><li>정량 결과와 직무 연결</li></ul></div>';
          }))));

        out.push(sect(no(), '지원직무별 경험 활용법', '',
          cards(r.jobs.slice(0, 3).map(function (j, i) {
            var s = strong[i] || strong[0];
            return '<div class="card contentcard"><h3>' + esc(j.name) + '</h3>' +
              '<p><b>강조할 경험:</b> ' + (s ? clean(s.q.text) : '핵심 프로젝트') + '</p>' +
              '<p style="margin-top:7px"><b>표현 방식:</b> ' + esc(j.name) + '에서 반복되는 ' +
              esc(j.job.tasks.slice(0, 2).join(', ')) + '와 연결해 본인 판단과 결과를 설명합니다.</p></div>';
          }))));

        out.push(sect(no(), 'Evidence 부족 영역', '먼저 보완하거나, 기존 경험에서 근거를 다시 찾아야 하는 영역입니다.',
          cards(weak.map(function (x, i) {
            return '<div class="card contentcard"><div class="eyebrow">WEAK ' + pad2(i + 1) +
              '</div><h4>' + clean(x.q.text) + '</h4>' +
              '<div class="bar"><i style="width:' + (x.v / 3 * 100) + '%"></i></div>' +
              '<p style="margin-top:8px">' + esc(EXPLV[x.v] || '미응답') + '</p></div>';
          }))));
      }

      /* 30/60/90 */
      var plan = [
        ['30일', '직무 기준 정리', top.name + ' 채용공고 5개를 분석하고 반복되는 업무·도구·요구역량을 정리합니다.'],
        ['60일', 'Evidence 제작', (gs[0] ? gs[0].name : '핵심 역량') + '을 보완할 프로젝트 1개를 수행하고 문제-분석-개선-결과 구조로 기록합니다.'],
        ['90일', '지원 준비 전환', '완성한 결과물을 포트폴리오·자소서·면접 답변으로 각각 변환합니다.']
      ];
      out.push(sect(no(), '30 · 60 · 90 Day Action Plan', '',
        cards(plan.map(function (p) {
          return '<div class="card planstep"><div class="day">' + esc(p[0]) + '</div><h4>' +
            esc(p[1]) + '</h4><p>' + esc(p[2]) + '</p></div>';
        }))));

      /* 다음 단계 */
      out.push(sect(no(), r.product_type === 'PRO' ? '최종 지원전략' : '다음 단계', '',
        '<div class="card contentcard"><div class="eyebrow">PRIORITY</div>' +
        '<h3>현재는 ' + esc(top.name) + '을 1순위 탐색 직무로 두고, ' +
        esc(gs[0] ? gs[0].name : '핵심 GAP') + '을 먼저 보완하는 것이 합리적입니다.</h3>' +
        '<p>다만 이 결과는 직무를 확정하는 판정이 아니라 탐색 우선순위입니다. ' +
        '실제 프로젝트와 공고 분석을 통해 적합성을 다시 확인하는 과정이 필요합니다.</p>' +
        (r.jobs[1] ? '<div class="divider"></div><p><b>2순위 활용:</b> ' + esc(r.jobs[1].name) +
          '은 FIT ' + r.jobs[1].fit + '으로 보조 지원 직무로 검토할 수 있습니다.</p>' : '') +
        '</div>'));
    }

    /* 응답 신뢰도 안내 */
    if (r.quality && (r.quality.straightLining >= 70 || r.quality.extremeRatio >= 80)) {
      out.push('<div class="section"><div class="card contentcard" style="border-color:#e8cfcf">' +
        '<h4 class="danger">결과 해석 시 참고</h4><p>동일하거나 극단적인 응답의 비율이 높게 나타났습니다. ' +
        '결과가 실제 성향과 다르게 느껴진다면 다시 응시해 비교해 보시는 것을 권합니다.</p></div></div>');
    }

    /* 버전 표기 */
    out.push('<div class="foot">' +
      '문항 ' + esc(r.versions.question_bank) + ' · 직무매트릭스 ' + esc(r.versions.job_matrix) +
      ' · 채점엔진 ' + esc(r.versions.scoring_engine) + '<br>' +
      '현재 가중치와 직무 매트릭스는 파일럿 검증 전 초기값입니다. 결과는 직무 확정이 아니라 탐색 우선순위로 활용해 주세요.' +
      '</div>');

    $('#resultBody').innerHTML = out.join('');
    window.PCA_RESULT = r;   // 운영 연동 시 서버 저장용
    screen('s-result');
  }

  /* ── 시작 ─────────────────────────────────────────── */
  function params() {
    var p = {};
    (location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i));
      var v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
      p[k] = v;
    });
    return p;
  }

  function init() {
    var p = params();
    buildStageList();
    buildMajorList();
    bindProfile();
    bindQuestion();

    $('#btnStart').addEventListener('click', function () {
      if (!S.stage) { screen('s-stage'); return; }
      if (S.majorCode && window.PCA_DATA[S.majorCode]) { applyMajor(S.majorCode); screen('s-profile'); }
      else screen('s-major');
    });
    document.getElementById('btnStageNext').addEventListener('click', function () {
      if (!S.stage) return;
      save();
      if (S.majorCode && window.PCA_DATA[S.majorCode]) { applyMajor(S.majorCode); screen('s-profile'); }
      else screen('s-major');
    });
    $('#btnMajorNext').addEventListener('click', function () {
      if (!S.majorCode) return;
      applyMajor(S.majorCode);
      save();
      screen('s-profile');
    });

    /* 이어서 응시 */
    var prev = store();
    var resumed = false;
    if (prev && prev.majorCode && window.PCA_DATA[prev.majorCode] &&
        prev.answers && Object.keys(prev.answers).length > 0 && !p.t) {
      S = prev;
      if (!S.profile) S.profile = { name: '', gender: '', sid: '' };
      applyMajor(S.majorCode);
      if (S.idx >= Q.length) { showResult(); return; }
      renderQuestion();
      screen('s-question');
      resumed = true;
    }
    if (resumed) return;

    /* 단체(1인 1링크) */
    if (p.t) { S.token = p.t; clearSession(); }
    if (p.org) {
      S.org = p.org;
      $('#profileDesc').textContent = p.org + ' 제출용입니다. 결과지 발급과 기관 통계에만 사용합니다.';
      $('#badge').textContent = p.org;
    }
    if (p.form && FORM_META[p.form.toUpperCase()]) S.form = p.form.toUpperCase();
    var st = (p.stage || '').toUpperCase();
    if (STAGE_BY[st]) { S.stage = st; buildStageList(); }

    var code = (p.major || '').toUpperCase();
    /* 단계를 먼저 묻는다. 학과가 주소에 있어도 단계가 없으면 단계부터다 —
       단계에 따라 출제 문항 수가 달라져서, 나중에 물으면 이미 시작한 사람의
       문항 수가 도중에 바뀐다. */
    if (!S.stage) {
      if (code && window.PCA_DATA[code]) S.majorCode = code;
      screen('s-stage');
    } else if (code && window.PCA_DATA[code]) {
      applyMajor(code);
      screen('s-profile');
    } else if (p.start === '1' || p.start === 'true') {
      screen('s-major');
    } else {
      screen('s-start');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
