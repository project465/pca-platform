/* 전공과 경험을 조직의 성과로 옮긴 부분을 그린다.
 *
 * 그리기만 한다. 판단은 `value-engine.js` 가 끝내 놓고 여기는 받은 객체를
 * 화면에 옮길 뿐이다. 그래야 웹과 인쇄가 같은 것을 보여 준다.
 *
 * **추상어를 먼저 쓰지 않는다.** 강점·적합·경쟁력 같은 말 대신 무엇을 보고
 * 그렇게 적었는지를 먼저 적는다. 읽는 사람이 "왜 이런 결론이 나왔지" 라고
 * 묻게 되면 그 자리는 실패한 자리다.
 */
window.PCAV2ValueReport = (function () {
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

  function tags(a, n) {
    return (a || []).slice(0, n || 6).map(function (x) {
      return '<span class="tag">' + esc(x) + '</span>';
    }).join('');
  }
  function has(o) { return o && Object.keys(o.paths || {}).length > 0; }

  var CONF = {
    known: '쓴 자리가 보입니다',
    inferred_from_course: '수업에서 들으셨습니다',
    unknown: '아직 걸린 것이 없습니다'
  };
  var STATE = { confirmed: '확인', partial: '일부', not_yet: '아직' };

  /* ── 1. 전공지식의 실무 전환 ─────────────────────────────────────── */
  function chain(p) {
    var known = (p.academic_inputs || []).filter(function (a) { return a.confidence === 'known'; });
    var course = (p.academic_inputs || []).filter(function (a) {
      return a.confidence === 'inferred_from_course';
    });
    var lead = known.length ? known : (course.length ? course : (p.academic_inputs || []));
    var step = function (lab, body, note) {
      return '<div class="vpstep"><div class="vplab">' + esc(lab) + '</div>' +
        '<div class="vpbody">' + body + '</div>' +
        (note ? '<p class="note">' + esc(note) + '</p>' : '') + '</div>';
    };
    var mine = p.user_evidence || [];
    return '<div class="card contentcard vpcard">' +
      '<div class="eyebrow">' + esc(p.career_family_name) + '</div>' +
      '<p class="vpprob">' + esc(p.problem) + '</p>' +
      '<div class="vpchain">' +
      step(T('배운 것'),
        tags(lead.map(function (a) { return a.label; }), 5) || T('<span class="note">아직 걸린 과목이 없습니다</span>'),
        known.length ? T('쓴 자리가 보이는 지식입니다')
          : (course.length ? T('수업에서 들으신 것입니다. 들었다는 것과 할 수 있다는 것은 다릅니다') : '')) +
      /* **칸마다 셋까지.** 여기 들어오는 것은 낱말이 아니라 문장이라서,
         넷을 넣으면 한 칸이 일곱 줄이 되고 사슬 하나가 종이 두 장을
         먹는다. 전부는 아래 직무 쪽과 부록에 있다 */
      step(T('실제 업무'), tags(p.work_activities, 3)) +
      step(T('기술 판단'), tags(p.technical_decisions, 3)) +
      step(T('산출물'), tags(p.outputs, 3)) +
      step(T('조직이 보는 결과'), tags(p.performance_criteria, 3),
        p.organization_type_name
          ? (p.organization_type_name + (p.organization_type_is_default
              ? JO(p.organization_type_name, '를')
                + T(' 기준으로 적었습니다. 조직 유형을 고르시면 이 줄이 바뀝니다.')
              : T(' 기준입니다.')))
          : '') +
      step(T('현재 내 증거'),
        mine.length
          ? mine.slice(0, 4).map(function (e) {
              return '<span class="tag">' + (u(e.title) || T('(제목 없음)')) +
                (e.evidence_level_name ? ' · ' + esc(e.evidence_level_name) : '') + '</span>';
            }).join('')
          : T('<span class="note">이 직무에 걸리는 경험이 아직 없습니다</span>')) +
      step(T('아직 필요한 증거'),
        (p.missing_evidence || []).length
          ? tags(p.missing_evidence, 3)
          : T('<span class="note">적어 주신 범위에서는 비어 있는 것이 없습니다</span>')) +
      '</div>' +
      /* **'다음에 확인할 것' 목록을 여기 다시 적지 않는다.** 할 일은 결과지
         뒤쪽의 ACTION 쪽이 한 번만 말한다. 사슬에도 적으면 같은 할 일이
         결과지에 두 번 나오고, 읽는 사람은 무엇을 먼저 할지 더 모른다 */
      '</div>';
  }

  function academiaToWork(J, n) {
    var vp = J.value_path;
    if (!has(vp)) return '';
    return '<div class="grid vpgrid">' +
      vp.order.slice(0, n).map(function (fid) {
        return vp.paths[fid] ? chain(vp.paths[fid]) : '';
      }).join('') + '</div>';
  }

  /* ── 2. 증거 사다리 ──────────────────────────────────────────────── */
  function rungRow(r) {
    return '<div class="elrow el-' + r.state + '">' +
      '<span class="elname">' + esc(r.name) + '</span>' +
      '<span class="elstate">' + esc(TX(STATE, r.state)) + '</span>' +
      '<span class="elby">' + ulist(r.by, 2).join(' · ') + '</span>' +
      '</div>';
  }
  function ladder(J, n) {
    var list = (J.performance_evidence || []).slice(0, n || 4);
    if (!list.length) return '';
    return '<div class="grid">' + list.map(function (x) {
      return '<div class="card contentcard"><div class="eyebrow">' +
        (u(x.title) || T('(제목 없는 경험)')) + '</div>' +
        '<div class="elbox">' + x.rungs.map(rungRow).join('') + '</div>' +
        (x.next ? '<p class="note" style="margin-top:10px"><b>' + esc(x.next.name) +
          T('까지 가려면</b> ') + esc((x.next.questions || [])[0] || '') + '</p>' : '') +
        '</div>';
    }).join('') + '</div>';
    /* 여기 있던 '낮은 칸이라는 뜻이 아니고…' 한 줄은 뺐다. 이 사다리를
       싣는 쪽의 머리말이 이미 같은 말을 한다. 같은 말을 두 번 적으면
       종이만 먹고, 읽는 사람은 어느 쪽이 설명인지 헷갈린다 */
  }

  /* ── 3. 같은 전공, 다른 조직 ─────────────────────────────────────── */
  function sameMajor(J) {
    var vp = J.value_path;
    if (!has(vp)) return '';
    var fid = vp.order[0];
    var p = vp.paths[fid];
    var variants = p.org_variants || {};
    var keys = Object.keys(variants);
    if (!keys.length) return '';
    var names = {};
    ((J.organization_context || {}).available || []).forEach(function (o) { names[o.id] = o.name; });
    return '<div class="grid orggrid">' + keys.map(function (k) {
      return '<div class="card contentcard"><div class="eyebrow">' + esc(names[k] || k) + '</div>' +
        T('<p class="orgline"><b>결과물</b><br>') + esc(variants[k].output) + '</p>' +
        T('<p class="orgline"><b>성과 기준</b><br>') + esc(variants[k].performance) + '</p></div>';
    }).join('') + '</div>' +
      T('<p class="note" style="margin-top:10px">같은 ') + esc(p.career_family_name) +
      T(' 지식이 조직마다 다른 결과로 읽힙니다. 적합도는 조직을 바꿔도 그대로입니다.</p>');
  }

  /* ── 4. 아직 성과 언어로 번역되지 않은 경험 ──────────────────────── */
  function untranslated(J, n) {
    var list = (J.untranslated_evidence || []).slice(0, n || 4);
    if (!list.length) return '';
    return '<div class="grid">' + list.map(function (ue) {
      /* 규격이 요구한 세 칸이다: 지금 적어 주신 것 / 지금 확인되는 것 /
         아직 확인되지 않은 것. **'아직 확인되지 않음' 이라고 쓴다**:
         '더하시면 좋은 것' 은 권유로 읽혀서, 무엇이 비어 있는지가 흐려진다 */
      /* 제목을 두 번 적지 않는다. '지금 적어 주신 것' 칸이 곧 제목이라,
         위에 머리글로 또 달면 같은 글자가 카드마다 두 번 나온다 */
      return '<div class="card contentcard">' +
        T('<div class="utrow utfirst"><span>지금 적어 주신 것</span><span>') +
        (u(ue.title) || T('(제목 없는 경험)')) + '</span></div>' +
        T('<div class="utrow"><span>지금 확인되는 것</span><span>') +
        esc(ue.confirmed_up_to ? ue.confirmed_up_to.name : T('아직 없습니다')) +
        '</span></div>' +
        T('<div class="utrow"><span>아직 확인되지 않음</span><span>') +
        '<ul class="qlist">' + (ue.follow_up || []).map(function (q) {
          return '<li>' + esc(q) + '</li>'; }).join('') + '</ul></span></div></div>';
    }).join('') + '</div>' +
      T('<p class="note" style="margin-top:10px">경험이 적다는 말이 아닙니다. ') +
      T('겪으신 것 가운데 아직 적지 않으신 칸이 있다는 말입니다.</p>') +
      /* 화면에서는 단추, 종이에서는 안내 한 줄. **같은 객체를 쓰고 그리는
         법만 다르다**: 인쇄본에 누를 수 없는 단추를 남기지 않는다 */
      '<div class="evnav" style="margin-top:12px"><button type="button" class="primary" ' +
      T('id="btnEvidenceFix">경험 보완하기</button></div>') +
      T('<p class="note rponly">웹 결과지에서 경험 보완하기를 누르시면 이 칸을 ') +
      T('채우실 수 있습니다. 채우신 뒤 결과지를 다시 받으시면 이 자리가 바뀝니다.</p>');
  }

  /* ── 5. 도구·기술 증거 ───────────────────────────────────────────── */
  var TLV = { E0: '사용 경험', E1: '판단까지', E2: '산출물까지', E3: '성과까지', E4: '조직 가치까지' };
  function toolBox(J, deep) {
    var list = J.tool_evidence || [];
    if (!list.length) return '';
    return '<div class="grid">' + list.slice(0, deep ? 12 : 5).map(function (t) {
      var rows = [
        [T('사용 경험'), T('확인')],
        [T('연결된 경험'), u(t.linked_experience) || T('연결 안 됨')],
        [T('어디에 썼는가'), u(t.usage_purpose) || ''],
        [T('무엇을 판단했는가'), u(t.decision_supported) || ''],
        [T('무엇이 남았는가'), u(t.output) || ''],
        [T('무엇과 견주었는가'), u(t.validation) || '']
      ].filter(function (r) { return deep || r[1]; });
      return '<div class="card contentcard"><div class="eyebrow">' +
        (u(t.tool_name) || T('(이름 없는 도구)')) +
        (t.category_name ? ' · ' + esc(t.category_name) : '') + '</div>' +
        '<div class="toolst">' + esc(TX(TLV, t.evidence_level) || t.evidence_level) + '</div>' +
        '<div class="tooltb">' + rows.map(function (r) {
          return '<div class="toolrow"><span>' + esc(r[0]) + '</span><span>' +
            (r[1] ? r[1] : T('<i class="note">아직 비어 있습니다</i>')) + '</span></div>';
        }).join('') + '</div></div>';
    }).join('') + '</div>' +
      T('<p class="note" style="margin-top:10px">도구 이름만으로는 활동까지입니다. ') +
      T('개수를 점수로 쓰지 않습니다.</p>');
  }

  /* ── 6. 비어 있는 증거 ───────────────────────────────────────────── */
  function gap(J) {
    var vp = J.value_path;
    if (!has(vp)) return '';
    var rows = vp.order.map(function (fid) { return vp.paths[fid]; })
      .filter(function (p) { return p && p.missing_evidence.length; });
    if (!rows.length) return '';
    return '<div class="card contentcard"><table class="v2gap"><thead><tr>' +
      T('<th>직무군</th><th>지금 확인되는 데까지</th><th>아직 비어 있는 것</th></tr></thead><tbody>') +
      rows.map(function (p) {
        return '<tr><td><b>' + esc(p.career_family_name) + '</b></td>' +
          '<td>' + esc(p.evidence_top_level ? (p.evidence_top_level + ' ' +
            ({ E0: T('활동'), E1: T('판단'), E2: T('산출물'), E3: T('성과'), E4: T('조직 가치'), E5: T('반복') }[p.evidence_top_level] || ''))
            : T('걸린 경험 없음')) + '</td>' +
          '<td>' + esc(p.missing_evidence.slice(0, 3).join(' · ')) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ── 7. 반복 가능성 ──────────────────────────────────────────────── */
  function repeat(J) {
    var r = J.repeatability;
    if (!r) return '';
    return '<div class="card contentcard"><div class="elbox">' +
      r.steps.map(function (st) {
        return '<div class="elrow el-' + st.state + '">' +
          '<span class="elname">' + esc(st.n) + '</span>' +
          '<span class="elstate">' + esc(TX(STATE, st.state)) + '</span>' +
          '<span class="elby">' + ulist(st.by, 2).join(' · ') +
          '</span></div>';
      }).join('') + '</div><p class="note" style="margin-top:10px">' + esc(r.note) + '</p></div>';
  }

  /* ── 8. 다음에 만들 경험 ─────────────────────────────────────────── */
  function nextProject(J) {
    var vp = J.value_path;
    if (!has(vp)) return '';
    var p = vp.paths[vp.order[0]];
    var need = (p.missing_evidence || []).slice(0, 2);
    /* 조사는 앞말이 정하므로 앞말을 먼저 굳힌다 */
    var whatOne = need.length ? need.join(' · ') : ((p.outputs || [])[0] || '');
    var firstGap = null;
    (J.performance_evidence || []).forEach(function (x) {
      if (!firstGap && x.next) firstGap = x.next;
    });
    return '<div class="card contentcard">' +
      '<div class="eyebrow">' + esc(p.career_family_name) + T(' 쪽으로 한 건</div>') +
      '<ul class="qlist">' +
      T('<li><b>무엇을</b> ') + esc(whatOne) + JO(whatOne, '를') + T(' 남기는 일 한 건</li>') +
      T('<li><b>왜</b> 지금 ') +
      esc(p.evidence_top_level ? (p.evidence_top_level + T(' 까지 확인됩니다')) : T('걸리는 경험이 없습니다')) +
      T('. 그 위 칸이 서류와 면접에서 읽히는 자리입니다</li>') +
      T('<li><b>무엇을 정할 것인가</b> ') + esc((p.technical_decisions || []).slice(0, 3).join(' · ')) + '</li>' +
      T('<li><b>무엇과 견줄 것인가</b> ') + esc((p.performance_criteria || []).slice(0, 3).join(' · ')) + '</li>' +
      (firstGap ? T('<li><b>이미 하신 것부터</b> ') + esc(firstGap.questions[0] || '') + '</li>' : '') +
      '</ul></div>';
  }

  /* ── 9. 서류와 면접으로 옮기기 (PRO) ─────────────────────────────── */
  function cvBank(J) {
    var list = (J.performance_evidence || []).filter(function (x) {
      return x.decided || (x.made || []).length;
    });
    if (!list.length) return '';
    return '<div class="grid">' + list.slice(0, 5).map(function (x) {
      var line = [];
      if (x.decided) line.push(x.decided);
      if ((x.made || []).length) { var md2 = (x.made || []).slice(0, 2).join(' · ');
        line.push(md2 + JO(md2, '를') + T(' 남김')); }
      if ((x.checked_against || []).length) { var ca2 = (x.checked_against || [])[0];
        line.push(ca2 + JO(ca2, '와') + T(' 견줌')); }
      return '<div class="card contentcard"><div class="eyebrow">' +
        (u(x.title) || T('(제목 없는 경험)')) + '</div>' +
        '<p class="cvline">' + line.join(', ') + '</p>' +
        T('<p class="note" style="margin-top:8px"><b>면접에서 받을 질문</b> ') +
        esc(x.next ? (x.next.questions || [])[0] : T('그 판단을 되돌린다면 무엇을 다르게 하시겠습니까')) +
        '</p></div>';
    }).join('') + '</div>' +
      T('<p class="note" style="margin-top:10px">한 일보다 직접 정한 것이 먼저 읽힙니다. ') +
      T('위 줄을 그대로 자기소개서 문장으로 옮기셔도 됩니다.</p>');
  }

  /* ── 10. ValuePath 묶음 (PRO) ────────────────────────────────────── */
  function portfolio(J) {
    var vp = J.value_path;
    if (!has(vp)) return '';
    return '<div class="card contentcard"><table class="v2gap"><thead><tr>' +
      T('<th>직무군</th><th>조직 기준</th><th>산출물</th><th>내 증거</th></tr></thead><tbody>') +
      vp.order.map(function (fid) {
        var p = vp.paths[fid];
        if (!p) return '';
        return '<tr><td><b>' + esc(p.career_family_name) + '</b></td>' +
          '<td>' + esc(p.organization_type_name || T('고르지 않음')) + '</td>' +
          '<td>' + esc((p.outputs || []).slice(0, 2).join(' · ')) + '</td>' +
          '<td>' + esc(p.user_evidence.length
            ? (p.user_evidence.length + T('건 · ') + (p.evidence_top_level || '')) : T('없음')) +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  return {
    academiaToWork: academiaToWork,
    ladder: ladder,
    sameMajor: sameMajor,
    untranslated: untranslated,
    toolBox: toolBox,
    gap: gap,
    repeat: repeat,
    nextProject: nextProject,
    cvBank: cvBank,
    portfolio: portfolio
  };
})();
