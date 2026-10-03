/* ME_V2 응시 화면.
 *
 * **V1 을 건드리지 않는다.** 파일도 화면도 저장 키도 따로다. `app.js` 는 한
 * 줄도 바뀌지 않았고, 두 검사를 같은 기기에서 동시에 볼 수 있다.
 *
 *   pca_session_v1     V1 응답. 여기서 읽지도 쓰지도 않는다
 *   pca_v2_session_v1  V2 응답
 *   pca_evidence_v1    경험 (두 판이 같이 본다. 사람이 하나니까)
 *
 * 흐름은 이렇다.
 *
 *   상품 → 학위 단계 → 섹션별 응시 → 채점 → 경험 입력 → 결과
 *
 * **92문항을 한 화면에 늘어놓지 않는다.** 구성개념 묶음을 한 화면씩 낸다.
 * 한 문항씩 넘기면 92번을 눌러야 하고, 전부 펼치면 스크롤에서 지친다.
 */
(function () {
  'use strict';

  var KEY = 'pca_v2_session_v1';
  var V2 = window.PCAV2, DEC = window.PCAV2Decision;

  var S = {
    tier: 'BASIC', stage: 'bachelor', sec: 0,
    answers: {}, profile: { name: '' }, startedAt: null, savedAt: null
  };
  var SECTIONS = [];
  var mem = null;

  function $(s) { return document.querySelector(s); }
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function store(v) {
    try {
      if (v === undefined) { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; }
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch (e) { if (v === undefined) return mem; mem = v; }
  }
  function save() { S.savedAt = Date.now(); store(S); }
  function clearSession() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    mem = null;
  }

  var SCREENS = ['s2-start', 's2-stage', 's2-question', 's2-evidence', 's2-result'];
  function screen(id) {
    SCREENS.forEach(function (x) {
      var e = el(x);
      if (e) e.classList.toggle('active', x === id);
    });
    var p = el('v2Prog');
    if (p) p.style.display = (id === 's2-question') ? 'block' : 'none';
    window.scrollTo(0, 0);
  }

  var TIERS = [
    { id: 'BASIC', n: 'BASIC', q: 48, t: '10~14분', d: '어디부터 볼지와 그 까닭, 다음 한 달에 할 것까지 봅니다.' },
    { id: 'STANDARD', n: 'STANDARD', q: 68, t: '15~20분', d: '직무를 견주고, 내 경험이 어디에 걸리는지와 90일 계획이 더 붙습니다.' },
    { id: 'PRO', n: 'PRO', q: 92, t: '20~28분', d: '무엇을 직접 정해 왔는지와 연구·과제 소유, 서류·면접·포트폴리오까지 갑니다.' }
  ];
  var STAGES = [
    { id: 'bachelor', n: '학사', d: '학부 재학 또는 졸업' },
    { id: 'master', n: '석사', d: '석사 재학 또는 졸업' },
    { id: 'phd', n: '박사', d: '박사 재학 또는 졸업' },
    { id: 'postdoc', n: '포닥', d: '학위 후 연구 경력' }
  ];

  /* ── 섹션 나누기 ──────────────────────────────────────────────────
     구성개념이 바뀌면 척도도 바뀐다. 한 화면에 한 척도만 두면 응시자가
     보기 방식을 다시 익히지 않아도 된다. */
  var SEC_META = {
    actual_work_interest: { n: '해보고 싶은 일', d: '각 문장을 읽고 그 일을 해보고 싶은 정도를 고르십시오. 잘하는지를 묻는 것이 아닙니다.' },
    exposure: { n: '해본 적 있는 일', d: '얼마나 해봤는지만 고르십시오. 잘했는지는 묻지 않습니다.' },
    decision_ownership: { n: '내가 정한 것', d: '그 일에서 무엇을 직접 정했는지를 고르십시오. 참여와 소유는 다릅니다.' },
    work_mode: { n: '일하는 방식', d: '어느 쪽이 더 편한지만 고르십시오. 좋고 나쁨을 가르지 않습니다.' },
    learning_intent: { n: '더 배우고 싶은 것', d: '앞으로 더 배울 뜻이 있는지를 고르십시오.' },
    evidence_quality: { n: '보여 줄 수 있는 사례', d: '밖에 보여 줄 수 있는 사례가 몇 건인지 고르십시오.' },
    research_project_evidence: { n: '과제를 맡아 본 정도', d: '단계에 맞는 문장으로 묻습니다. 학위가 올라간다고 점수가 오르지 않습니다.' },
    context: { n: '진로 맥락', d: '여기 고르신 것은 점수에 들어가지 않습니다. 결과를 읽는 자리를 좁히는 데만 씁니다.' },
    career_path_preferences: { n: '진로 맥락', d: '점수에 들어가지 않습니다. 결과를 읽는 자리를 좁히는 데만 씁니다.' },
    decision_constraints: { n: '지금의 조건', d: '점수에 들어가지 않습니다.' },
    organization_preference: { n: '관심 있는 조직', d: '점수에 들어가지 않습니다.' },
    market_transition_intent: { n: '지금 알고 싶은 것', d: '점수에 들어가지 않습니다.' }
  };

  /* 점수에 들어가지 않는 맥락 문항은 한 화면에 모은다. 구성개념대로 쪼개면
     한 문항짜리 화면이 네 번 나오고, 응시자는 그때마다 새 절이 시작한 줄
     안다 */
  var CONTEXT = {
    career_path_preferences: 1, decision_constraints: 1,
    organization_preference: 1, market_transition_intent: 1
  };
  function bucketOf(it) { return CONTEXT[it.construct] ? 'context' : it.construct; }

  function buildSections() {
    var items = V2.itemsFor(S.tier);
    /* 같은 것을 묻는 문항은 BASIC 묶음에 있든 PRO 묶음에 있든 한 화면에
       모은다. 묶음 순서대로만 자르면 '해보고 싶은 일' 이 두 번, '진로 맥락'
       이 세 번 나와서 응시자가 같은 데를 또 도는 줄 안다 */
    var order = [], byKey = {};
    items.forEach(function (it) {
      var key = bucketOf(it);
      if (!byKey[key]) { byKey[key] = []; order.push(key); }
      byKey[key].push(it);
    });
    var out = [];
    order.forEach(function (key) {
      var list = byKey[key];
      var pages = Math.ceil(list.length / 16);
      for (var i = 0; i < pages; i += 1) {
        out.push({
          construct: key, items: list.slice(i * 16, i * 16 + 16),
          part: pages > 1 ? (i + 1) : 0, parts: pages > 1 ? pages : 0
        });
      }
    });
    SECTIONS = out;
  }

  /* ── 문항 그리기 ───────────────────────────────────────────────── */
  function scalePoints(scaleId) {
    var sc = window.PCA_V2_ITEMS.ME.scales.scales[scaleId];
    return (sc && sc.points) || null;
  }

  function optionRow(it) {
    var pts = scalePoints(it.scale);
    if (pts) {
      return '<div class="v2opts" data-id="' + esc(it.item_id) + '">' +
        pts.map(function (p, i) {
          var on = String(S.answers[it.item_id]) === String(i + 1);
          return '<button type="button" class="v2opt' + (on ? ' on' : '') +
            '" data-v="' + (i + 1) + '"><b>' + (i + 1) + '</b><span>' + esc(p) + '</span></button>';
        }).join('') + '</div>';
    }
    /* 고르기 문항. 점수에 들어가지 않는다 */
    var multi = it.scale === 'choice_multi2';
    var cur = S.answers[it.item_id];
    var sel = multi ? (Array.isArray(cur) ? cur : []) : [cur];
    return '<div class="v2choice" data-id="' + esc(it.item_id) + '" data-multi="' + (multi ? 1 : 0) + '">' +
      (it.options || []).map(function (o) {
        return '<button type="button" class="v2chip' + (sel.indexOf(o) >= 0 ? ' on' : '') +
          '" data-v="' + esc(o) + '">' + esc(o) + '</button>';
      }).join('') + '</div>' +
      (multi ? '<p class="note">최대 둘까지 고르실 수 있습니다.</p>' : '');
  }

  function renderSection() {
    var sec = SECTIONS[S.sec];
    if (!sec) return;
    var meta = SEC_META[sec.construct] || { n: '문항', d: '' };
    var base = 0;
    for (var i = 0; i < S.sec; i++) base += SECTIONS[i].items.length;
    var total = V2.itemsFor(S.tier).length;

    el('v2QBody').innerHTML =
      '<div class="evhead"><div class="eyebrow">' + (S.sec + 1) + ' / ' + SECTIONS.length +
      ' · ' + esc(meta.n) + '</div>' +
      /* 열여섯을 넘겨 두 화면으로 나뉘면 몇 번째 장인지 적는다. 안 적으면
         같은 제목이 두 번 나와서 뒤로 돌아간 줄 안다 */
      '<h2>' + esc(meta.n) + (sec.part ? ' (' + sec.part + '/' + sec.parts + ')' : '') +
      '</h2><p class="desc">' + esc(meta.d) + '</p></div>' +
      sec.items.map(function (it, k) {
        return '<div class="v2q" data-id="' + esc(it.item_id) + '">' +
          '<div class="v2qh"><span class="v2no">Q' + it.question_no + '</span>' +
          '<p>' + esc(V2.textOf(it, S.stage)) + '</p></div>' +
          optionRow(it) + '</div>';
      }).join('') +
      '<div class="evnav">' +
      '<button type="button" class="ghost" id="v2Prev"' + (S.sec === 0 ? ' disabled' : '') + '>뒤로</button>' +
      '<button type="button" class="primary" id="v2Next">' +
      (S.sec === SECTIONS.length - 1 ? '제출하고 결과 보기' : '다음') + '</button></div>';

    var done = Object.keys(S.answers).length;
    el('v2Bar').style.width = Math.round((done / total) * 100) + '%';
    el('v2Count').textContent = done + ' / ' + total + '문항';
    window.scrollTo(0, 0);
  }

  function sectionAnswered() {
    var sec = SECTIONS[S.sec];
    var miss = sec.items.filter(function (it) {
      var a = S.answers[it.item_id];
      return a === undefined || a === null || a === '' || (Array.isArray(a) && !a.length);
    });
    return miss;
  }

  /* ── 채점과 결과 ───────────────────────────────────────────────── */
  function showResult() {
    var v2 = V2.score(S.tier, S.stage, S.answers);
    var J = window.PCAV2ResultJSON.build(v2, S);
    window.PCA_V2_RESULT = v2;
    window.PCA_V2_RESULT_JSON = J;
    el('v2ResultBody').innerHTML =
      '<div class="rp-act"><div class="rp-act-t"><b>' + esc(S.tier) +
      ' 결과</b><span>이 기기에만 저장됩니다</span></div>' +
      '<button type="button" class="rp-act-b" id="v2Print">인쇄 · PDF로 저장</button>' +
      '<button type="button" class="rp-act-b ghost" id="v2Evi">경험 고치기</button></div>' +
      window.PCAV2Report.render(J);
    var bp = el('v2Print');
    if (bp) bp.addEventListener('click', function () { window.print(); });
    [el('v2Evi'), el('btnEvidence'), el('btnEvidenceFix')].forEach(function (b) {
      if (b) b.addEventListener('click', function () { openEvidence(false); });
    });
    screen('s2-result');
  }

  /* 검사 끝에 한 번 들르는 자리(inFlow)와 결과지에서 고치러 들어오는 자리는
     같은 화면이지만 나가는 말이 다르다. 흐름 한가운데서 '그만두기' 라고 쓰면
     검사를 접는 단추로 읽힌다 */
  function openEvidence(inFlow) {
    if (!window.PCAEvidenceUI) { showResult(); return; }
    window.PCAEvidenceUI.open({
      stage: S.stage,
      cancelLabel: inFlow ? '지금은 건너뛰기' : '그만두기',
      onDone: function () { showResult(); }
    });
    screen('s2-evidence');
  }

  /* ── 배선 ──────────────────────────────────────────────────────── */
  function renderStart() {
    el('v2TierList').innerHTML = TIERS.map(function (t) {
      return '<button type="button" class="major' + (S.tier === t.id ? ' on' : '') +
        '" data-code="' + t.id + '"><b>' + esc(t.n) + '</b>' +
        '<span>' + t.q + '문항 · ' + esc(t.t) + '</span>' +
        '<small>' + esc(t.d) + '</small></button>';
    }).join('');
  }
  function renderStage() {
    el('v2StageList').innerHTML = STAGES.map(function (x) {
      return '<button type="button" class="major' + (S.stage === x.id ? ' on' : '') +
        '" data-code="' + x.id + '"><b>' + esc(x.n) + '</b>' +
        '<span>' + esc(x.d) + '</span></button>';
    }).join('');
  }

  function wire() {
    el('v2TierList').addEventListener('click', function (e) {
      var b = e.target.closest('.major'); if (!b) return;
      S.tier = b.getAttribute('data-code'); renderStart(); save();
    });
    el('v2StageList').addEventListener('click', function (e) {
      var b = e.target.closest('.major'); if (!b) return;
      S.stage = b.getAttribute('data-code'); renderStage(); save();
    });
    el('v2ToStage').addEventListener('click', function () {
      renderStage(); screen('s2-stage');
    });
    el('v2ToQ').addEventListener('click', function () {
      buildSections(); S.sec = 0; S.startedAt = S.startedAt || Date.now();
      save(); renderSection(); screen('s2-question');
    });
    el('v2Back').addEventListener('click', function () { screen('s2-start'); });
    el('v2Reset').addEventListener('click', function () {
      if (!confirm('응답을 지우고 처음부터 다시 하시겠습니까?')) return;
      clearSession(); location.reload();
    });

    el('v2QBody').addEventListener('click', function (e) {
      var o = e.target.closest('.v2opt');
      if (o) {
        var id = o.parentNode.getAttribute('data-id');
        S.answers[id] = Number(o.getAttribute('data-v'));
        [].slice.call(o.parentNode.children).forEach(function (x) { x.classList.remove('on'); });
        o.classList.add('on');
        save();
        var done = Object.keys(S.answers).length, total = V2.itemsFor(S.tier).length;
        el('v2Bar').style.width = Math.round((done / total) * 100) + '%';
        el('v2Count').textContent = done + ' / ' + total + '문항';
        return;
      }
      var c = e.target.closest('.v2chip');
      if (c) {
        var box = c.parentNode, cid = box.getAttribute('data-id');
        var multi = box.getAttribute('data-multi') === '1';
        var v = c.getAttribute('data-v');
        if (multi) {
          var cur = Array.isArray(S.answers[cid]) ? S.answers[cid].slice() : [];
          var at = cur.indexOf(v);
          if (at >= 0) cur.splice(at, 1);
          else { if (cur.length >= 2) cur.shift(); cur.push(v); }
          S.answers[cid] = cur;
          [].slice.call(box.children).forEach(function (x) {
            x.classList.toggle('on', cur.indexOf(x.getAttribute('data-v')) >= 0);
          });
        } else {
          S.answers[cid] = v;
          [].slice.call(box.children).forEach(function (x) { x.classList.remove('on'); });
          c.classList.add('on');
        }
        save();
        return;
      }
      if (e.target.id === 'v2Next') {
        var miss = sectionAnswered();
        if (miss.length) {
          var first = el('v2QBody').querySelector('[data-id="' + miss[0].item_id + '"]');
          if (first) { first.classList.add('v2miss'); first.scrollIntoView({ block: 'center' }); }
          alert('답하지 않은 문항이 ' + miss.length + '개 있습니다.');
          return;
        }
        if (S.sec === SECTIONS.length - 1) { save(); openEvidence(true); return; }
        S.sec += 1; save(); renderSection();
        return;
      }
      if (e.target.id === 'v2Prev') { S.sec = Math.max(0, S.sec - 1); save(); renderSection(); }
    });
  }

  function params() {
    var p = {};
    (location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      p[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] =
        i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
    });
    return p;
  }

  function init() {
    var p = params();
    if (p.fresh === '1') clearSession();
    var saved = store();
    if (saved && saved.answers) S = saved;
    if (p.tier && TIERS.some(function (t) { return t.id === p.tier; })) S.tier = p.tier;
    if (p.stage && STAGES.some(function (x) { return x.id === p.stage; })) S.stage = p.stage;
    renderStart(); renderStage(); wire();
    if (saved && Object.keys(saved.answers || {}).length) {
      buildSections();
      S.sec = Math.min(S.sec || 0, SECTIONS.length - 1);
      renderSection();
      screen('s2-question');
      return;
    }
    screen('s2-start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* 검사가 들여다보는 자리 */
  window.PCAV2App = {
    state: function () { return S; },
    KEY: KEY,
    openEvidence: openEvidence,
    showResult: showResult
  };
})();
