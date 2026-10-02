/* PCA Platform: 화면 흐름 / 결과 렌더링
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
  /* 단계. 무엇이 달라지는지를 화면에 그대로 적는다. 고르는 사람이 고른
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

  /* 상품. 고르는 사람이 무엇을 받는지 알고 고르도록 화면에 적을 것까지 둔다.
     쪽수는 인쇄로 찍어 센 값이다(학부 기준). */
  var FORM_META = {
    QUICK:    { n: 28, time: '4~6분',   label: 'BASIC',
                out: '화면 요약 한 장',
                desc: '직무 적합도 상위 셋과 공학 활동 8축까지 화면에서 봅니다. 결과지는 나오지 않습니다.' },
    STANDARD: { n: 68, time: '12~15분', label: 'STANDARD',
                out: '결과지 71쪽',
                desc: '직무마다 하는 일과 필요한 역량, 자기소개서 문장과 면접 질문, 30일 체크리스트까지 들어갑니다.' },
    PRO:      { n: 92, time: '18~25분', label: 'PRO',
                out: '결과지 77쪽',
                desc: 'STANDARD 에 창업 절이 붙고, 직무를 가르는 근거를 더 자세히 적습니다.' }
  };
  var FORM_ORDER = ['QUICK', 'STANDARD', 'PRO'];

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
    var el = document.getElementById('savedAt');
    if (el) el.textContent = '자동 저장됨 ' + hhmm(S.savedAt);
  }
  function hhmm(t) {
    var d = new Date(t), p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
  function ymdhm(t) {
    var d = new Date(t), p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() +
      '. ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
  function clearSession() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    mem = null;
  }

  /* 처음으로 돌아간다. 주소의 major·form·stage 는 그대로 두고 응답만 지운다.
     학과 링크로 들어온 사람이 처음으로를 눌렀다고 학과 선택으로 떨어지면
     자기가 무엇을 푸는지 다시 골라야 한다. */
  function resetAll() {
    clearSession();
    location.reload();
  }

  function screen(id) {
    ['s-resume', 's-start', 's-form', 's-stage', 's-major', 's-profile', 's-question', 's-result'].forEach(function (x) {
      var el = document.getElementById(x);
      if (el) el.classList.toggle('active', x === id);
    });
    /* 시작 화면과 이어서 화면에는 돌아갈 '처음' 이 이미 그 화면이다 */
    var home = document.getElementById('btnHome');
    if (home) home.style.display = (id === 's-start' || id === 's-resume') ? 'none' : 'inline-flex';
    $('#progArea').style.display = (id === 's-question') ? 'block' : 'none';
    $('#navQ').style.display = (id === 's-question') ? 'block' : 'none';
    $('#navMajor').style.display = (id === 's-major') ? 'block' : 'none';
    var ns = document.getElementById('navStage');
    if (ns) ns.style.display = (id === 's-stage') ? 'block' : 'none';
    var nf = document.getElementById('navForm');
    if (nf) nf.style.display = (id === 's-form') ? 'block' : 'none';
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

  function buildFormList() {
    var box = document.getElementById('formList');
    if (!box) return;
    box.innerHTML = '<div class="majorgrid">' + FORM_ORDER.map(function (code) {
      var m = FORM_META[code];
      return '<button class="major' + (S.form === code ? ' selected' : '') +
        '" data-code="' + code + '"><b>' + esc(m.label) + '</b>' +
        '<small>' + m.n + '문항 · ' + esc(m.time) + ' · ' + esc(m.out) + '</small>' +
        '<small>' + esc(m.desc) + '</small></button>';
    }).join('') + '</div>' +
    '<p class="note">지금은 셋 다 열려 있습니다. 학과가 계약하면 학생은 결제 없이 ' +
    '그대로 보고, 개인 결제는 도메인과 통신판매업 신고, 전자결제 심사가 끝나야 붙습니다.</p>';
    if (S.form) document.getElementById('btnFormNext').disabled = false;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.major');
      if (!b) return;
      Array.prototype.forEach.call(box.querySelectorAll('.major'), function (x) {
        x.classList.remove('selected');
      });
      b.classList.add('selected');
      S.form = b.dataset.code;
      document.getElementById('btnFormNext').disabled = false;
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
  /** 긴 원고에서 앞 몇 문장만 가져온다. 무료 화면은 요지까지만 적는다. */
  function firstSent(t, n) {
    if (!t) return '';
    var ss = String(t).split(/(?<=\.)\s+/);
    return ss.slice(0, n || 2).join(' ');
  }

  /** 받침을 보고 조사를 고른다. '기술기획·PM 는' 은 읽다가 걸린다. */
  function josa(word, withJong, noJong) {
    var w = String(word || '').replace(/[)\]」』·\s]+$/, '');
    var ch = w.charCodeAt(w.length - 1);
    var jong;
    if (ch >= 0xac00 && ch <= 0xd7a3) jong = (ch - 0xac00) % 28 !== 0;
    else if (/[1360LMNRlmnr]$/.test(w)) jong = true;   // 일·삼·육·공·엘·엠·엔·알
    else jong = false;
    return jong ? withJong : noJong;
  }

  /** 축 코드 배열을 사람이 읽는 이름으로 */
  function dnaName(d) { return (major.dna_labels || {})[d] || d; }

  function sect(no, title, sub, body) {
    return '<div class="section"><h2 class="sect">' + (no ? no + '. ' : '') + esc(title) + '</h2>' +
      (sub ? '<p class="subdesc">' + sub + '</p>' : '') + body + '</div>';
  }
  function cards(arr) { return '<div class="grid">' + arr.join('') + '</div>'; }

  function jobCard(j, i, lite) {
    var m = '<div class="metricgrid">' +
      '<div class="metric fit"><span>적합도</span><b>' + j.fit + '</b></div>' +
      (j.ready === null
        ? '<div class="metric"><span>구간</span><b>±' + (window.PCA_RESULT_SE || '') + '</b></div>' +
          '<div class="metric"><span>묶음</span><b>' + (j.group || 1) + '군</b></div>'
        : '<div class="metric"><span>READY</span><b>' + j.ready + '</b></div>' +
          '<div class="metric"><span>EVIDENCE</span><b>' + j.evidence + '</b></div>') +
      '</div>';
    /* 번호 대신 군을 적는다. 01·02·03 은 그 순서가 실제로 갈린다는 뜻이고,
       여기서는 갈리지 않는다. */
    var badge = j.group ? j.group + '군' : pad2(i + 1);
    /* 무료 화면에서는 이름과 점수만 두지 않는다. 그 직무가 무슨 일인지
       한 줄과 대표 업무 두 개를 같이 적어야 고를 거리가 된다. */
    var more = '';
    if (lite && j.job) {
      more = (j.job.field ? '<p class="note" style="margin:10px 0 0">' + esc(j.job.field) + '</p>' : '') +
        ((j.job.tasks || []).length
          ? '<div style="margin-top:8px">' + j.job.tasks.slice(0, 2).map(function (t) {
              return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>'
          : '');
    }
    return '<div class="card job"><div class="jobtop"><div class="rank">' + badge +
      '</div><div class="jobname">' + esc(j.name) + '</div></div>' + m + more + '</div>';
  }

  function dnaRows(r) {
    return cards(major.dna.map(function (d) {
      return '<div class="card dnarow"><div class="dnatop"><span>' +
        esc(major.dna_labels[d]) + '</span><span>' + r.career_dna[d] + '</span></div>' +
        '<div class="bar"><i style="width:' + r.career_dna[d] + '%"></i></div></div>';
    }));
  }
  /** 기운 쪽 성향의 '부담이 되는 국면' 한 줄. 원고는 데이터에 이미 있다. */
  function styleLoadNotes(r) {
    var load = major.style_load || {};
    var rows = major.style.map(function (d) {
      var v = r.work_style[d], l = major.style_labels[d];
      var side = (v >= 50 ? l[1] : l[0]);
      var pole = (side === '속도' || side === '품질') ? side + '중시형' : side + '형';
      var t = load[pole];
      if (!t) return '';
      return '<div class="card contentcard"><div class="eyebrow">' + esc(pole) +
        ' 쪽으로 기울었습니다</div><p>' + esc(firstSent(t, 2)) + '</p></div>';
    }).filter(Boolean);
    return rows.length ? '<div class="grid" style="margin-top:10px">' + rows.join('') + '</div>' : '';
  }

  /**
   * 왜 이 직무가 앞에 왔는가.
   *
   * 점수만 던지면 읽는 사람이 해석을 지어내고, 지어낸 해석은 대체로 틀린다.
   * 그래서 직무가 크게 기대는 축과 응답자의 축 순위를 나란히 둔다.
   * **요구값 자체와 격차는 적지 않는다.** 그건 STANDARD 의 몫이다.
   */
  function matchWhy(r, top) {
    var dims = major.dna;
    var need = top.job.v || {};
    var lean = dims.slice().sort(function (a, b) { return (need[b] || 0) - (need[a] || 0); }).slice(0, 3);
    var mineRank = {};
    r.dna_ranked.forEach(function (d, i) { mineRank[d] = i + 1; });
    var rows = lean.map(function (d) {
      return '<div class="card dnarow"><div class="dnatop"><span>' + esc(dnaName(d)) +
        '</span><span>' + r.career_dna[d] + '</span></div>' +
        '<div class="bar"><i style="width:' + r.career_dna[d] + '%"></i></div>' +
        '<p class="note" style="margin:8px 0 0">여덟 축 가운데 ' + mineRank[d] + '위</p></div>';
    }).join('');
    var hit = lean.filter(function (d) { return mineRank[d] <= 4; });
    var line = hit.length >= 2
      ? '이 직무가 크게 기대는 축 셋 가운데 ' + hit.length + '개가 응답자의 상위 네 축 안에 들어왔습니다. 적합도가 앞선 것은 이 겹침 때문입니다.'
      : '이 직무가 기대는 축과 응답자의 상위 축이 크게 겹치지는 않았습니다. 그래도 앞에 온 것은 나머지 직무와의 거리가 더 멀었기 때문이라, 1군 안의 다른 직무와 함께 보시는 편이 맞습니다.';
    return '<div class="card contentcard"><p>' + esc(line) + '</p>' +
      '<p class="note" style="margin-top:8px">적합도는 응답자의 여덟 축 모양과 직무가 요구하는 모양이 ' +
      '얼마나 닮았는지를 하나로 줄인 값입니다. 요구 수준과의 차이를 축마다 펼친 표는 ' +
      'STANDARD 결과지의 역량 격차 절에 들어갑니다.</p></div>' +
      '<div class="grid" style="margin-top:10px">' + rows + '</div>';
  }

  /** 이번 응답을 얼마나 믿을 수 있는가. 검사가 자기 한계를 먼저 적는다. */
  function qualityPanel(r) {
    var q = r.quality;
    var items = [];
    items.push(['답한 문항', r.answered + ' / ' + r.question_count]);
    items.push(['적합도 구간', '±' + r.fit_se + '점']);
    items.push(['같은 값으로 답한 비율', q ? Math.round(q.straightLining) + '%' : '—']);
    var grid = '<div class="metricgrid">' + items.map(function (x) {
      return '<div class="metric"><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>';
    }).join('') + '</div>';
    var warn = q && (q.straightLining >= 70 || q.extremeRatio >= 80);
    return '<div class="card contentcard">' + grid +
      '<p class="note" style="margin-top:12px">' + r.question_count + '문항으로 재면 적합도의 구간이 ±' +
      r.fit_se + '점입니다. 1군 안의 직무들은 이 폭 안에서 서로 갈리지 않아 순위를 매기지 ' +
      '않았습니다. 68문항으로 보시면 이 폭이 ±11.7점으로, 92문항에서는 ±11.3점으로 좁아집니다.' +
      (q ? ' 양 끝(전혀 아니다·매우 그렇다)으로 답하신 비율은 ' + Math.round(q.extremeRatio) +
        '%였습니다.' : '') + '</p>' +
      (warn ? '<p class="danger" style="margin-top:8px">같은 값이나 양 끝으로 답한 비율이 높게 ' +
        '나왔습니다. 결과가 실제와 다르게 느껴지시면 다시 응시해 비교해 보십시오.</p>' : '') +
      '</div>';
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

    /* STANDARD·PRO 는 긴 형식 결과지로 간다. QUICK 은 아래의 짧은 판 그대로다.
       무료 구간이 유료 구간과 같은 분량이면 경계가 없어진다. */
    if (r.product_type !== 'QUICK' && window.PCAReport) {
      var cmap = {};
      major.jobs.forEach(function (j) { cmap[j.name] = j; });
      /* 긴 결과지는 화면에서 끝나면 손에 남는 것이 없다. 저장 줄을 위에 붙인다.
         인쇄에서는 이 줄을 빼야 결과지 첫 장이 깨끗하다. */
      $('#resultBody').innerHTML =
        '<div class="rp-act">' +
          '<div class="rp-act-t"><b>' + esc(FORM_META[r.product_type] ? r.product_type : '') +
            ' 결과지</b><span>' + (r.product_type === 'PRO' ? '77쪽' : '71쪽') +
            ' · 이 기기에만 저장됩니다</span></div>' +
          '<button type="button" class="rp-act-b" id="btnPrint">인쇄 · PDF로 저장</button>' +
        '</div>' +
        window.PCAReport.render(r, major, cmap, S, GRAD);
      var bp = document.getElementById('btnPrint');
      if (bp) bp.addEventListener('click', function () { window.print(); });
      window.PCA_RESULT = r;
      screen('s-result');
      return;
    }
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

    /* 읽는 법을 맨 앞에 둔다. 점수부터 보면 숫자를 등수로 읽는다. */
    if (r.product_type === 'QUICK') {
      out.push('<div class="section"><div class="card contentcard">' +
        '<div class="eyebrow">이 결과를 읽는 법</div>' +
        '<ul class="qlist">' +
        '<li>적합도는 일하는 방식이 닮은 정도입니다. 합격 가능성이나 실력을 잰 값이 아닙니다.</li>' +
        '<li>같은 군에 묶인 직무는 이 검사로 우열을 가릴 수 없습니다. 둘 다 열어 두고 보십시오.</li>' +
        '<li>28문항으로 재서 구간이 ±' + r.fit_se + '점입니다. 문항이 늘면 이 폭이 좁아집니다.</li>' +
        '</ul></div></div>');
    }

    /* 직무 적합도 */
    var lite = r.product_type === 'QUICK';
    window.PCA_RESULT_SE = r.fit_se;
    out.push(sect(no(), lite ? '적합도가 앞선 직무 셋' : 'TOP 5 직무 적합도',
      '적합도는 일하는 방식이 얼마나 닮았는지를 보는 값이고, 붙을 가능성을 매긴 ' +
      '점수가 아닙니다. 같은 군에 있는 직무는 측정 오차(±' + r.fit_se + '점) 안에서 ' +
      '서로 갈리지 않아 순위를 매기지 않았습니다. 함께 살펴볼 묶음으로 읽어 주십시오.',
      cards(r.top_jobs.map(function (j, i) { return jobCard(j, i, lite); }))));

    /* 연구 역량 8축: 대학원·연구 단계에서만 */
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

    /* 공학 활동 축. 무료 화면은 넷까지 열고, 축마다 그 축이 무엇을 보는
       축인지 한두 문장을 붙인다. 숫자만 주면 읽는 사람이 해석을 지어낸다. */
    if (r.product_type === 'QUICK') {
      var four = r.dna_ranked.slice(0, 4);
      var lowOfFour = four.slice().sort(function (a, b) {
        return r.career_dna[a] - r.career_dna[b];
      })[0];
      out.push(sect(no(), '공학 활동 축 · 뚜렷한 넷',
        '여덟 축 가운데 이번 응답에서 가장 뚜렷하게 올라온 넷입니다. ' +
        '값은 검사지 기준 0에서 100이고, 다른 학생과 견준 값이 아닙니다.',
        cards(four.map(function (d) {
          var desc = (major.dna_desc || {})[d] || '';
          return '<div class="card dnarow"><div class="dnatop"><span>' +
            esc(dnaName(d)) + '</span><span>' + r.career_dna[d] + '</span></div>' +
            '<div class="bar"><i style="width:' + r.career_dna[d] + '%"></i></div>' +
            (desc ? '<p class="note" style="margin:10px 0 0">' + esc(firstSent(desc, 2)) + '</p>' : '') +
            '</div>';
        }))) );
      var lowTxt = (major.dna_low || {})[lowOfFour];
      if (lowTxt) {
        out.push('<div class="section"><div class="card contentcard">' +
          '<div class="eyebrow">넷 가운데 가장 낮은 축</div>' +
          '<h4>' + esc(dnaName(lowOfFour)) + ' · ' + r.career_dna[lowOfFour] + '</h4>' +
          '<p>' + esc(firstSent(lowTxt, 3)) + '</p></div></div>');
      }
    } else {
      out.push(sect(no(), 'Career DNA 8', '', dnaRows(r)));
    }

    /* Work Style */
    if (r.product_type === 'QUICK') {
      out.push(sect(no(), '업무 성향 3축',
        '좋고 나쁨을 가리는 축이 아니라 어느 환경에서 덜 소모되는지를 보는 축입니다. ' +
        '기운 쪽이 부담이 되는 국면도 함께 적었습니다.',
        styleRows(r) + styleLoadNotes(r)));
    } else {
      out.push(sect(no(), 'Work Style', '성향의 좋고 나쁨보다 잘 맞는 업무 환경을 보는 축입니다.', styleRows(r)));
    }

    if (r.product_type === 'QUICK') {
      /* 1순위 직무를 한 절로 펼친다. 무료 화면이라고 이름과 점수만 던지면
         읽는 사람은 그 직무가 무슨 일인지 모른 채로 창을 닫는다. */
      var sc = (c.scenarios || [])[0];
      out.push(sect(no(), top.name + josa(top.name, '은', '는') + ' 어떤 일인가',
        '적합도가 가장 앞선 직무입니다. 하는 일과 하루의 모양을 먼저 보시고, ' +
        '아래의 판단 기준으로 스스로 한 번 맞춰 보십시오.',
        '<div class="card contentcard">' +
          '<div class="eyebrow">' + esc(c.field || '') + '</div>' +
          '<p>' + esc(firstSent(c.overview, 4)) + '</p>' +
          '<div class="divider"></div>' +
          (c.keywords || []).map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join('') +
        '</div>' +
        '<div class="card contentcard" style="margin-top:10px">' +
          '<h4>하는 일</h4>' +
          '<ul class="qlist">' + (c.tasks || []).map(function (t) {
            return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        '</div>' +
        (sc ? '<div class="card contentcard" style="margin-top:10px">' +
          '<div class="eyebrow">현장에서 받는 요청 한 가지</div>' +
          '<h4>' + esc(sc.t) + '</h4><p>' + esc(sc.s) + '</p>' +
          '<p class="note" style="margin-top:10px">이 요청을 어떤 순서로 푸는지, ' +
          '무엇을 내놓아야 일이 끝나는지는 STANDARD 결과지에 적습니다.</p></div>' : '') +
        '<div class="card contentcard" style="margin-top:10px">' +
          '<h4>이 직무가 맞는지 스스로 묻는 기준</h4>' +
          '<ul class="qlist">' + (c.criteria || []).slice(0, 3).map(function (t) {
            return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
          '<p class="note" style="margin-top:8px">세 질문에 바로 답이 나오지 않는다면, ' +
          '그 자체가 지금 더 알아봐야 한다는 신호입니다.</p>' +
        '</div>'));

      /* 왜 이 직무가 앞에 왔는지. 숫자를 설명 없이 두지 않는다.
         요구값 자체는 적지 않는다. 요구 대비 격차는 STANDARD 의 몫이다. */
      out.push(sect(no(), '이 직무가 앞에 온 까닭', '',
        matchWhy(r, top)));

      /* 응답 신뢰도. 전문적인 검사는 자기 측정의 한계를 먼저 적는다. */
      out.push(sect(no(), '이번 응답의 신뢰도', '',
        qualityPanel(r)));

      /* 다음 이레. 한 가지만 고르게 한다 */
      var n30 = (c.next30 || []).slice(0, 2);
      out.push(sect(no(), '다음 이레 동안 할 것',
        '많이 적어 두면 아무것도 하지 않게 됩니다. 두 가지만 적었습니다.',
        '<div class="card contentcard">' +
          '<ul class="qlist">' + n30.map(function (t) {
            return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
          '<p class="note" style="margin-top:10px">' + esc(top.name) +
          josa(top.name, '은', '는') + ' 결과물보다 판단의 근거가 읽히는 자리라, 한 가지를 끝까지 해 보고 ' +
          '그 과정을 적어 두는 쪽이 자격증 한 줄보다 오래 남습니다.</p>' +
        '</div>'));
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
        '는 지금의 준비 상태를 뜻합니다. 두 값을 같은 점수처럼 읽지 않으셔야 합니다.</p>' +
        '<div class="two" style="margin-top:12px">' +
        '<div class="scorebox"><span>FIT</span><b>' + top.fit + '</b></div>' +
        '<div class="scorebox"><span>READY</span><b>' + top.ready + '</b></div></div></div>' +
        '<div class="card contentcard" style="margin-top:10px"><h3>경험을 얼마나 증명할 수 있는가</h3>' +
        '<p>EVIDENCE ' + top.evidence + '은 “잘한다고 생각한다” 대신 실제 프로젝트·도구·문제해결 경험을 ' +
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
        '결과물은 “관심 기록”에서 그치지 않고 직무 Evidence가 되어야 합니다.',
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
        '<p>다만 이 결과는 직무 확정 판정 대신 탐색 우선순위를 말합니다. ' +
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

    /* 무료 구간의 끝. 여기까지가 BASIC 이고 다음이 무엇인지 적는다.
       **결제창을 만들지 않는다**: 정적 사이트에는 결제를 검증할 서버가 없어서
       버튼만 두면 '돈 내면 열린다' 가 거짓이 된다. 실제로 살 수 있는 경로로만 잇는다. */
    if (r.product_type === 'QUICK') {
      out.push('<div class="section"><div class="card pad buybox">' +
        '<div class="buy-eye">여기까지가 BASIC 입니다</div>' +
        '<h3 class="buy-h">더 보려면 무엇이 달라지는가</h3>' +
        '<div class="buy-tw"><table><thead><tr>' +
          '<th>구분</th><th>BASIC</th><th>STANDARD</th><th>PRO</th></tr></thead><tbody>' +
          '<tr><th scope="row">문항</th><td>28</td><td>68</td><td>92</td></tr>' +
          '<tr><th scope="row">결과지</th><td>이 화면</td><td>71쪽</td><td>77쪽</td></tr>' +
          '<tr><th scope="row">업무성향 6유형</th><td>없음</td><td>있음</td><td>있음</td></tr>' +
          '<tr><th scope="row">역량 격차 (요구 대비 현재)</th><td>없음</td><td>있음</td><td>있음</td></tr>' +
          '<tr><th scope="row">자기소개서·면접</th><td>없음</td><td>있음</td><td>있음</td></tr>' +
          '<tr><th scope="row">경험 근거 문항</th><td>없음</td><td>6개</td><td>30개</td></tr>' +
          '<tr><th scope="row">창업 준비 전략</th><td>없음</td><td>없음</td><td>있음</td></tr>' +
        '</tbody></table></div>' +
        '<p class="note" style="margin-top:14px">셋은 같은 문항 은행에서 뽑고 같은 산식으로 ' +
          '채점합니다. 다만 문항이 늘수록 적합도의 구간이 좁아져서(±12.6 → ±11.7 → ±11.3점), ' +
          '지금 한 묶음으로 나온 직무가 더 많은 문항에서는 갈리기도 합니다. ' +
          '상품을 바꾸시면 문항을 처음부터 다시 푸셔야 합니다.</p>' +
        '<div class="buy-how">' +
          '<b>지금 받는 방법</b>' +
          '<p>학과나 취업지원처가 계약한 회차에 포함되어 있으면 결제 없이 열립니다. ' +
          '소속 학과에 먼저 확인해 보십시오.</p>' +
          '<p>개인으로 받고 싶으시면 아래로 문의해 주십시오. ' +
          '<b>개인 결제는 아직 열려 있지 않습니다.</b> 결제 심사와 도메인 등록이 끝나는 대로 ' +
          '이 화면에서 바로 결제할 수 있게 됩니다.</p>' +
          '<p class="buy-c">HARI CO.,LTD · 010-7392-7211 · ' +
            '<a href="mailto:hari_info@hari.re.kr">hari_info@hari.re.kr</a></p>' +
        '</div>' +
        '</div></div>');
    }

    /* 버전 표기 */
    out.push('<div class="foot">' +
      '문항 ' + esc(r.versions.question_bank) + ' · 직무매트릭스 ' + esc(r.versions.job_matrix) +
      ' · 채점엔진 ' + esc(r.versions.scoring_engine) + '<br>' +
      '현재 가중치와 직무 매트릭스는 파일럿 검증 전 초기값입니다. 결과는 직무 확정이 아니라 탐색 우선순위로 활용해 주세요.<br>' +
      '이 결과는 이 기기의 브라우저에만 저장되며 서버로 전송되지 않습니다. ' +
      '<a href="privacy.html" target="_blank" rel="noopener">개인정보처리방침</a>' +
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

    $('#btnHome').addEventListener('click', function () {
      // 답한 것이 있을 때만 묻는다. 없으면 지울 것도 없다
      var n = Object.keys(S.answers || {}).length;
      if (n > 0 && !confirm('처음 화면으로 돌아갑니다.\n지금까지 답한 ' + n +
        '문항이 저장되어 있어, 다시 들어오면 이어서 할 수 있습니다.')) return;
      if (n > 0) save();
      location.href = location.pathname + location.search;
    });

    $('#btnStart').addEventListener('click', function () {
      buildFormList();
      screen('s-form');
    });
    document.getElementById('btnFormNext').addEventListener('click', function () {
      if (!S.form) return;
      save();
      buildStageList();
      screen('s-stage');
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

    /* 이어서 응시.

       예전에는 저장된 응답이 있으면 말없이 문항 화면으로 되돌렸다. 그러면
       다시 들어온 사람이 34번 문항 앞에 떨어지고, 왜 여기인지도 처음부터
       다시 할 방법도 알 수 없다. 그래서 무엇이 남아 있는지 보여주고 고르게
       한다. */
    var prev = store();
    if (prev && prev.majorCode && window.PCA_DATA[prev.majorCode] &&
        prev.answers && Object.keys(prev.answers).length > 0 && !p.t) {
      /* Q 길이는 상품과 단계에 따라 달라지므로 S 를 먼저 넣고 계산한다.
         '처음부터 다시' 를 고르면 어차피 전부 지운다. */
      S = prev;
      if (!S.profile) S.profile = { name: '', gender: '', sid: '' };
      applyMajor(S.majorCode);
      var done = Object.keys(S.answers).length;
      var total = Q.length;
      var finished = S.idx >= total;
      var pst = STAGE_BY[S.stage];
      var rows = [
        ['학과', major.name],
        ['단계', pst ? pst.label : '선택 전'],
        ['상품', S.form + ' · ' + total + '문항'],
        [finished ? '응답' : '답한 문항', done + ' / ' + total + '문항'],
        ['마지막 저장', S.savedAt ? ymdhm(S.savedAt) : '기록 없음']
      ];
      $('#resumeInfo').innerHTML = rows.map(function (r) {
        return '<div class="rsum-row"><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>';
      }).join('');
      if (finished) {
        $('#resumeTitle').innerHTML = '끝낸 검사가<br>남아 있습니다';
        $('#resumeDesc').textContent =
          '이 기기의 브라우저에 저장된 응답입니다. 결과지를 다시 열 수 있습니다.';
        $('#btnResume').textContent = '결과지 다시 보기';
        $('#btnRestart').textContent = '새로 검사하기';
      }
      $('#btnResume').addEventListener('click', function () {
        if (finished) { showResult(); return; }
        renderQuestion();
        screen('s-question');
      });
      $('#btnRestart').addEventListener('click', function () {
        if (!confirm(finished
          ? '저장된 응답과 결과지를 지우고 새로 시작합니다.\n지운 응답은 되돌릴 수 없습니다.'
          : '저장된 응답을 지우고 처음부터 다시 시작합니다.\n지운 응답은 되돌릴 수 없습니다.')) return;
        resetAll();
      });
      screen('s-resume');
      return;
    }

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
    /* 단계를 먼저 묻는다. 학과가 주소에 있어도 단계가 없으면 단계부터다.
       단계에 따라 출제 문항 수가 달라져서, 나중에 물으면 이미 시작한 사람의
       문항 수가 도중에 바뀐다. */
    /* 주소에 학과와 상품이 적혀 있어도 설명을 건너뛰지 않는다. 무엇을 푸는
       검사인지 모르고 1번 문항을 만나면 거기서 그대로 나간다. 적힌 값은
       골라 둔 상태로만 쓰고, 고르는 화면은 그대로 보여준다. */
    if (code && window.PCA_DATA[code]) S.majorCode = code;
    if (S.stage && S.majorCode) {
      applyMajor(S.majorCode);
      screen('s-profile');          // 단체 링크(단계까지 지정)는 바로 들어간다
    } else {
      screen('s-start');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
