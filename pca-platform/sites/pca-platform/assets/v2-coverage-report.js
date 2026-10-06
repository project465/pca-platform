/* 역할별 증거 범위를 그린다.
 *
 * **점수로 줄이지 않는다.** 아홉 칸 가운데 넷이면 넷이라고 적는다. 44점으로
 * 바꾸면 비교할 자가 없는 숫자가 하나 남고, 나머지 다섯이 무엇인지가 가려진다.
 *
 * **'아직' 을 못 한다는 뜻으로 적지 않는다.** 지금 적어 주신 것으로
 * 확인되지 않는다는 뜻이고, 그 자리마다 고르기만 하면 되는 되물음이 붙는다.
 */
window.PCAV2CoverageReport = (function () {
  'use strict';
  /* **표는 한국어로 둔다.** 모듈 최상위에서 `T()` 를 부르면 불러올 때
     한 번만 평가돼 그 뒤로 언어를 바꿔도 한국어가 그대로 남는다.
     옮기는 것은 꺼내 쓰는 자리(`TX()`)다 */
  /** 표에서 꺼낸 한국어를 지금 언어로. 꺼낼 때마다 다시 본다 */
  function TX(tbl, key, dflt) {
    var v = tbl && tbl[key];
    return (typeof v === 'string' && v) ? T(v) : (dflt === undefined ? '' : dflt);
  }
  /* 결과지의 두 언어. **글자만 갈리고 판단은 갈리지 않는다**:
     한국어면 받은 것을 그대로 돌려주므로 한국어 쪽은 손대지 않은 것과 같다 */
  var T = window.PCAI18N ? window.PCAI18N.T : function (s) { return s; };
  /* 조사는 앞말이 정한다. 영어에서는 빈 글자가 돌아온다 */
  var JO = function (w, k) {
    return window.PCAI18N ? window.PCAI18N.josa(w, k) : (' ' + k);
  };

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  /* 조사. 받침이 있으면 을·은, 없으면 를·는. 이름이 데이터에서 오므로
     문장에 그냥 붙이면 '제품개발 를' 이 나간다 */
  function josa(word, withBatchim, without) {
    var w = String(word || '');
    var c = w.charCodeAt(w.length - 1);
    if (!(c >= 0xac00 && c <= 0xd7a3)) return without;
    return ((c - 0xac00) % 28) ? withBatchim : without;
  }


  /* 응시자가 적은 글. **그리기 직전에만 거른다**: 판정은 이미 끝났고
     여기서 바꾸는 것은 화면에 나가는 글자뿐이다. 거를 것이 남지 않으면
     null 이 오고, 그 자리를 비운다. 뜻을 지어내 채우지 않는다. */
  function u(v) {
    var S = window.PCASanitize;
    if (!S) return esc(v);
    return S.safe(v);
  }
  function ulist(a, n) {
    var S = window.PCASanitize;
    var l = S ? S.list(a) : (a || []).map(String);
    return l.slice(0, n || l.length).map(function (x) { return esc(x); });
  }

  var MARK = { confirmed: '✓', partial: '△', not_yet: '○' };
  var HEAD = { confirmed: '현재 확인된 것', partial: '일부 확인', not_yet: '아직 확인되지 않음' };
  var IMP = { core: '핵심', supporting: '뒷받침', optional: '선택' };

  function group(rows, st) {
    return rows.filter(function (r) { return r.status === st; });
  }

  /* ── 한 직무의 범위 카드 ─────────────────────────────────────────── */
  function card(cov, opts) {
    opts = opts || {};
    var rows = cov.coverage.filter(function (r) {
      return opts.coreOnly ? r.importance === 'core' : true;
    });
    var c = cov.summary.core;
    var block = function (st) {
      var list = group(rows, st);
      if (!list.length) return '';
      return '<div class="cvgrp cv-' + st + '">' +
        '<div class="cvgh">' + esc(TX(HEAD, st)) + '</div>' +
        list.map(function (r) {
          return '<div class="cvrow"><span class="cvmk">' + MARK[r.status] + '</span>' +
            '<span class="cvlb">' + esc(r.label) +
            (r.importance !== 'core' ? ' <i>' + esc(TX(IMP, r.importance)) + '</i>' : '') +
            '</span>' +
            '<span class="cvby">' +
            (r.supported_by.length ? ulist(r.supported_by, 2).join(' · ')
              : (r.status === 'partial' ? esc(r.minimum_depth_name + T('까지 필요합니다')) : '')) +
            '</span></div>';
        }).join('') + '</div>';
    };
    return '<div class="card contentcard cvcard">' +
      '<div class="eyebrow">' + esc(cov.career_family_name) + '</div>' +
      /* 숫자를 세어서 적되 합치지 않는다 */
      T('<div class="cvsum"><b>핵심 영역</b>') +
      T('<span>확인 ') + c.confirmed + '</span>' +
      T('<span>부분 ') + c.partial + '</span>' +
      T('<span>아직 ') + c.not_yet + '</span>' +
      T('<i>모두 ') + c.total + '</i></div>' +
      block('confirmed') + block('partial') + block('not_yet') +
      '</div>';
  }

  /** 상위 직무의 범위를 나란히 둔다. */
  function coverage(J, n, coreOnly) {
    var cv = J.role_evidence_coverage;
    if (!cv) return '';
    var ids = J.decision_table.slice(0, n).map(function (r) { return r.career_family_id; })
      .filter(function (id) { return cv[id]; });
    if (!ids.length) return '';
    return '<div class="grid cvgrid">' +
      ids.map(function (id) { return card(cv[id], { coreOnly: coreOnly }); }).join('') +
      '</div>' +
      /* 여기에 보기로라도 점수를 적지 않는다. 적어 두면 읽는 사람이
         그 숫자를 가져가고, 검사도 제 꼬리를 문다 */
      T('<p class="note" style="margin-top:10px">확인한 칸 수를 하나의 ') +
      T('숫자로 합치지 않습니다. 합치면 나머지 칸이 무엇인지가 가려집니다. ') +
      T('선택 영역이 비어 있다고 불리하게 보지 않습니다.</p>');
  }

  /** 지금 상태를 사람 말로 한 줄. 추상어 대신 무엇이 비었는지를 적는다. */
  function sentence(J, fid) {
    var cv = (J.role_evidence_coverage || {})[fid];
    if (!cv) return '';
    var c = cv.summary.core;
    var gaps = cv.priority_gaps;
    var nm = cv.career_family_name;
    var head = c.confirmed === 0
      ? esc(nm) + T(' 쪽은 지금 적어 주신 것에서 핵심 영역이 아직 확인되지 않습니다.')
      : esc(nm) + josa(nm, T('을'), T('를')) + T(' 살펴볼 근거는 핵심 ') + c.total +
        T('개 가운데 ') + c.confirmed + T('개가 확인됩니다.');
    var last = gaps.length ? gaps[gaps.length - 1].label : '';
    var tail = gaps.length
      ? T(' 다만 ') + gaps.map(function (g) { return esc(g.label); }).join(' · ') +
        josa(last, T('은'), T('는')) + T(' 현재 입력에서 확인되지 않습니다.')
      : T(' 핵심 영역은 모두 확인됩니다.');
    return '<p class="cvline">' + head + tail + '</p>';
  }

  /* ── 비어 있는 자리를 고르기로 채우게 한다 ───────────────────────── */
  function askBox(J, fid) {
    var cv = (J.role_evidence_coverage || {})[fid];
    if (!cv) return '';
    var seen = {}, gaps = [];
    cv.priority_gaps.forEach(function (g) {
      if (!g.follow_up || seen[g.follow_up.id]) return;
      seen[g.follow_up.id] = true;
      gaps.push({ label: g.label, f: g.follow_up });
    });
    if (!gaps.length) return '';
    return '<div class="card contentcard">' +
      T('<div class="eyebrow">고르기만 하시면 됩니다</div>') +
      '<p class="note" style="margin-top:6px">' +
      esc(T((window.PCA_FOLLOWUPS || {}).answer_note || '')) + '</p>' +
      gaps.slice(0, 2).map(function (g) {
        return '<div class="cvask"><div class="cvaskh">' + esc(g.label) +
          ' · ' + esc(g.f.title) + '</div>' +
          '<p class="note">' + esc(g.f.why) + '</p>' +
          g.f.questions.map(function (q) {
            return '<div class="cvq"><div class="cvqq">' + esc(q.q) +
              (q.kind === 'multi' ? T(' <i>여러 개 고르셔도 됩니다</i>') : '') + '</div>' +
              '<div class="cvopts">' + q.options.map(function (o) {
                return '<span class="cvopt">' + esc(o) + '</span>';
              }).join('') + '</div></div>';
          }).join('') + '</div>';
      }).join('') +
      '<div class="evnav" style="margin-top:12px">' +
      T('<button type="button" class="primary" id="btnEvidenceFix">경험 보완하기</button></div>') +
      '</div>';
  }

  /* ── 다음에 만들 경험. 비어 있는 자리에서 만든다 ─────────────────── */
  function nextEvidence(J, fid) {
    var cv = (J.role_evidence_coverage || {})[fid];
    var vp = (J.value_path && J.value_path.paths) ? J.value_path.paths[fid] : null;
    if (!cv || !cv.priority_gaps.length) return '';
    var g = cv.priority_gaps[0];
    /* 조사는 앞말이 정하므로 앞말을 먼저 굳힌다 */
    var cmp = (vp && vp.performance_criteria)
      ? vp.performance_criteria.slice(0, 2).join(' · ') : T('기준');
    var steps = [
      T('작게 잡을 수 있는 ') + esc(cv.career_family_name) + T(' 쪽 문제를 하나 고릅니다'),
      T('조건과 가정을 먼저 적어 둡니다'),
      esc(g.label) + T(' 에 해당하는 것을 직접 합니다'),
      cmp + JO(cmp, '와') + T(' 견주어 맞는지 확인합니다'),
      T('차이가 났다면 왜 났는지 적고 고칩니다'),
      T('두 쪽짜리 기록으로 남깁니다')
    ];
    return '<div class="card contentcard">' +
      T('<div class="eyebrow">비어 있는 자리</div>') +
      '<h3 style="margin:6px 0 0">' + esc(g.label) + '</h3>' +
      '<p class="note" style="margin-top:6px">' + esc(g.description) + '</p>' +
      '<div class="cvsteps">' + steps.map(function (t, i) {
        return '<div class="cvstep"><span>' + (i + 1) + '</span>' + t + '</div>';
      }).join('') + '</div>' +
      T('<p class="note" style="margin-top:10px"><b>남길 것</b> ') +
      esc((vp && vp.outputs ? vp.outputs.slice(0, 2).join(' · ') : T('결과물'))) +
      T(' · 고른 근거 · 견준 기준 · 한계</p></div>');
  }

  /* ── 30 / 90 / 365 일 ────────────────────────────────────────────
     일반적인 문장을 돌려주지 않는다. 비어 있는 자리와 학위 단계에서 만든다. */
  var STAGE_PLAN = {
    bachelor: {
      30: '수업이나 동아리 안에서 작게 한 번 끝까지 해봅니다',
      90: '졸업 과제나 현장 실습에서 한 건을 결과물까지 끌고 갑니다',
      365: '서로 성격이 다른 경험 두세 개를 남겨 포트폴리오로 묶습니다'
    },
    master: {
      30: '학위 연구에서 쓴 방법 가운데 직무로 옮겨 갈 것을 추려 적습니다',
      90: '그 방법을 산업 쪽 문제에 한 번 대 봅니다',
      365: '학위 주제와 직무를 잇는 설명을 한 장으로 만들고 근거를 붙입니다'
    },
    phd: {
      30: '내가 직접 정한 것과 받은 것을 과제별로 갈라 적습니다',
      90: '방법 하나를 골라 다른 문제에도 되는지 보입니다',
      365: '연구 깊이를 조직의 결과물 언어로 옮긴 자료를 만듭니다'
    },
    postdoc: {
      30: '맡아서 끌고 간 범위를 과제별로 적고 근거를 붙입니다',
      90: '같은 방법을 다른 주제나 다른 사람에게 넘겨 봅니다',
      365: '제안서·마일스톤·지도 기록을 묶어 과제 운영 근거로 정리합니다'
    }
  };

  function plan(J, days, fid) {
    var cv = (J.role_evidence_coverage || {})[fid];
    var stage = (J.education_stage_lens || {}).id || 'bachelor';
    /* **중첩 표는 잎에서 옮긴다.** `TX` 는 글자 하나를 옮기는 것이라
       묶음을 넘기면 빈 글자가 돌아오고, 그러면 계획 문장이 통째로 사라진다 */
    var sp = STAGE_PLAN[stage] || STAGE_PLAN.bachelor;
    var gaps = cv ? cv.priority_gaps : [];
    var acts = [];
    if (days === 30) {
      acts.push(gaps.length
        ? '<b>' + esc(gaps[0].label) + T('</b> 한 자리만 채웁니다. ') + esc(gaps[0].description)
        : T('핵심 영역이 모두 확인됩니다. 같은 직무 공고 세 건과 내 근거를 한 줄씩 맞춰 보세요.'));
      acts.push(T(sp[30]));
    } else if (days === 90) {
      acts.push(gaps.length
        ? '<b>' + esc(gaps.slice(0, 2).map(function (g) { return g.label; }).join(' · ')) +
          T('</b> 를 결과물과 기준 비교까지 끌고 갑니다')
        : T('확인된 근거를 산출물과 성과 수준으로 넓힙니다'));
      acts.push(T(sp[90]));
      acts.push(T('직무를 둘 놓고 같은 근거가 어느 쪽에서 더 잘 읽히는지 견줍니다'));
    } else {
      acts.push(T(sp[365]));
      acts.push(T('가려는 조직 유형에 맞춰 같은 경험을 다르게 적은 판을 둘 만들어 둡니다'));
      acts.push(T('같은 방법을 다른 문제에 한 번 더 써서 반복 가능성을 남깁니다'));
    }
    return '<div class="card contentcard"><div class="eyebrow">' + days + T('일 동안</div>') +
      '<ul class="qlist" style="margin-top:8px">' +
      acts.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
      T('<p class="note" style="margin-top:10px">지금 비어 있는 자리에서 만든 계획입니다. ') +
      T('경험을 더 적으시면 이 줄이 바뀝니다.</p></div>');
  }

  /* ── 지원서에서 설명할 수 있는가 ─────────────────────────────────── */
  function applicationBox(J, fid) {
    var a = (J.application_evidence || {})[fid];
    if (!a) return '';
    return '<div class="card contentcard">' +
      T('<div class="eyebrow">지원서와 면접에서 설명할 수 있는가</div>') +
      '<h3 style="margin:6px 0 0">' + (a.ok ? T('설명할 근거가 모였습니다') : T('아직 모이는 중입니다')) +
      '</h3>' +
      (a.met.length ? T('<p class="note" style="margin-top:8px"><b>맞은 것</b> ') +
        esc(a.met.join(' · ')) + '</p>' : '') +
      (a.reasons.length ? T('<p class="note" style="margin-top:6px"><b>아직인 것</b> ') +
        esc(a.reasons.join(' · ')) + '</p>' : '') +
      '<p class="note" style="margin-top:10px">' + esc(a.note) + '</p></div>';
  }

  return {
    coverage: coverage, card: card, sentence: sentence, askBox: askBox,
    nextEvidence: nextEvidence, plan: plan, applicationBox: applicationBox
  };
})();
