/* ME_V2 결과지.
 *
 * **첫 화면이 막대 그래프가 아니다.** 다섯 칸이 각각 다른 것을 재고 마지막
 * 칸이 지금 무엇을 할 자리인지 적는다. 막대 하나로 줄이면 읽는 사람이 그
 * 길이를 등수로 읽고, 등수는 이 검사가 만들 수 있는 값이 아니다.
 *
 * 상품은 같은 자료를 **깊이만 달리** 읽는다. 문체는 세 상품이 같다.
 */
window.PCAV2Report = (function () {
  'use strict';

  var DEC = window.PCAV2Decision;

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  var LV = { high: '높음', medium: '보통', low: '낮음' };
  var RD = { high: '넉넉함', medium: '보통', low: '아직 적음' };

  function lv(o) { return o && o.level ? LV[o.level] : '자료 없음'; }

  /* ── 결정 표 (규격 22장) ────────────────────────────────────────── */
  function decisionTable(J, n) {
    var rows = J.decision_table.slice(0, n || 8);
    return '<div class="v2tw"><table><thead><tr>' +
      ['직무군', '업무방식', '관심', '경험', '학습의향', '증거 준비도', '지금 할 것']
        .map(function (h) { return '<th>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td><b>' + esc(r.name) + '</b></td>' +
          '<td>' + esc(DEC.modeLabel(r.work_mode)) + '</td>' +
          '<td>' + esc(lv(r.interest)) + '</td>' +
          '<td>' + esc(lv(r.exposure)) + '</td>' +
          '<td>' + esc(lv(r.learning)) + '</td>' +
          /* 경험을 아직 안 적은 것과, 적었는데 이 직무에 걸리는 것이 없는
             것은 다른 상태다. 한 말로 적으면 적어 주신 분이 자기가 안 적은
             줄 안다 */
          '<td>' + esc(r.evidence_readiness ? RD[r.evidence_readiness.level]
            : (J.evidence_supplied ? '걸린 근거 없음' : '경험 미입력')) + '</td>' +
          '<td><b>' + esc(DEC.label(r.decision_status)) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="note" style="margin-top:10px">여섯 칸을 하나로 합치지 않습니다. ' +
      '합치면 숫자 하나가 남고 그 숫자로는 무엇을 할지 알 수 없습니다. ' +
      '칸이 갈리는 자리가 할 일을 알려 줍니다.</p>';
  }

  /* ── 왜 이 직무가 나왔는가 (규격 11장) ──────────────────────────── */
  function why(J, row) {
    var bank = window.PCA_V2_ITEMS.ME;
    var all = [].concat(bank.core.items, bank.standard.items, bank.pro.items);
    var byNo = {};
    all.forEach(function (it) { byNo[it.question_no] = it; });
    var LABEL = {
      actual_work_interest: '관심', exposure: '경험',
      learning_intent: '학습의향', decision_ownership: '결정'
    };
    var lines = [];
    [['interest', row.interest], ['exposure', row.exposure], ['learning', row.learning]]
      .forEach(function (p) {
        var o = p[1];
        if (!o || !o.basis) return;
        o.basis.slice(0, 3).forEach(function (no) {
          var it = byNo[no];
          if (!it) return;
          lines.push('<li><b>Q' + no + '</b> ' + esc(LABEL[it.construct] || '') + ' · ' +
            esc(window.PCAV2.textOf(it, J.profile.education_stage)) + '</li>');
        });
      });
    if (!lines.length) return '';
    return '<div class="card contentcard"><div class="eyebrow">' + esc(row.name) +
      ' 이 앞에 온 까닭</div>' +
      '<ul class="qlist" style="margin-top:8px">' + lines.join('') + '</ul>' +
      '<p class="note" style="margin-top:10px">문항 번호를 그대로 적습니다. ' +
      '어느 답이 이 줄을 만들었는지 되짚을 수 있어야 고칠 데도 보입니다.</p></div>';
  }

  /* ── 업무 방식 (숫자를 내지 않는다) ─────────────────────────────── */
  function workMode(J) {
    return '<div class="grid">' + J.work_mode.profile.map(function (ax) {
      return '<div class="card contentcard"><div class="eyebrow">' +
        esc(ax.poles.join(' · ')) + '</div><h3 style="margin:6px 0 0">' +
        esc(ax.label) + '</h3></div>';
    }).join('') + '</div>' +
    '<p class="note" style="margin-top:10px">' + esc(J.work_mode.note) +
    ' 두 문항으로 잰 축에 소수점을 붙이면 그 정밀도가 있는 것처럼 읽힙니다.</p>';
  }

  /* ── 경험 지도 ──────────────────────────────────────────────────── */
  function evidenceMap(J) {
    if (!J.evidence_supplied) {
      return '<div class="card contentcard"><p>지금 등록된 프로젝트·연구·인턴 ' +
        '경험이 없어 경험을 바탕으로 한 분석은 제한적으로만 나갑니다. ' +
        '수업과 프로젝트와 도구를 적어 두시면 증거 준비도와 경험 지도가 ' +
        '함께 나옵니다.</p>' +
        '<button type="button" class="ns-btn" id="btnEvidence">경험 추가하기</button>' +
        '<p class="note ns-note">여기 적는 내용은 관심·경험·업무 방식 값을 ' +
        '바꾸지 않습니다.</p></div>';
    }
    var e = J.evidence;
    var box = function (t, items, note) {
      if (!items || !items.length) return '';
      return '<div class="card contentcard"><div class="eyebrow">' + esc(t) + '</div>' +
        '<div style="margin-top:8px">' + items.slice(0, 10).map(function (x) {
          return '<span class="tag">' + esc(x) + '</span>';
        }).join('') + '</div>' +
        (note ? '<p class="note" style="margin-top:10px">' + esc(note) + '</p>' : '') + '</div>';
    };
    return '<div class="grid">' +
      box('이미 해보신 것', [].concat(e.projects, e.research, e.internships, e.employment),
        '서류에서 바로 꺼내 쓸 수 있는 재료입니다') +
      box('배우신 것', e.coursework, '수업은 바탕이고, 결과물이 붙어야 근거가 됩니다') +
      box('써 보신 도구', e.tools, '이름만으로는 무엇을 할 줄 아는지 말할 수 없습니다') +
      box('남은 결과물', e.outputs, '') + '</div>';
  }

  /* ── 상품마다 다른 깊이 ─────────────────────────────────────────── */
  function plan(J, days) {
    var top = J.decision_table[0];
    var miss = top.evidence_readiness ? top.evidence_readiness.missing : [];
    var acts = [
      DEC.line(top.decision_status),
      '같은 직무 공고 세 건을 띄워 놓고 주요 업무를 한 줄씩 옮겨 적어 보세요.'
    ];
    if (miss.length) {
      acts.push('비어 있는 것 가운데 ' + miss[0] + '. 여기부터 손대시면 가장 빨리 표가 납니다.');
    }
    return '<div class="card contentcard"><div class="eyebrow">' + days + '일 동안</div>' +
      '<ul class="qlist" style="margin-top:8px">' +
      acts.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
  }

  function ownershipBox(J) {
    var o = J.decision_ownership;
    if (!o) return '';
    return '<div class="card contentcard"><div class="eyebrow">결정 소유</div>' +
      '<h3 style="margin:6px 0 0">' + esc(LV[o.level]) + '</h3>' +
      '<p class="note" style="margin-top:8px">' + o.items + '문항에서 나온 값입니다. ' +
      '참여와 소유를 가르는 자리라, 같은 프로젝트를 해도 무엇을 직접 정했는지에 ' +
      '따라 갈립니다.</p></div>';
  }

  function researchBox(J) {
    var r = J.research_project_evidence;
    if (!r) return '';
    var FACET = {
      objective_interpretation: '목표 해석', planning: '일정 설계',
      resource_allocation: '자원 배분', budget_exposure: '연구비',
      milestone: '중간 점검', success_criteria: '성공 기준',
      deliverable_ownership: '산출물', team_coordination: '팀 조율',
      proposal_rfp: '공고·제안서', compliance: '규정·안전',
      external_collaboration: '외부 협업', impact_use: '쓰임'
    };
    var rows = Object.keys(r.facets || {}).map(function (k) {
      return '<tr><th>' + esc(FACET[k] || k) + '</th><td>' + r.facets[k] + ' / 5</td></tr>';
    }).join('');
    return '<div class="card contentcard"><div class="eyebrow">연구·과제 소유</div>' +
      '<h3 style="margin:6px 0 0">' + esc(LV[r.level]) + '</h3>' +
      (rows ? '<table class="tw" style="margin-top:10px"><tbody>' + rows + '</tbody></table>' : '') +
      '<p class="note" style="margin-top:8px">학위로 정한 값이 아니고 답하신 ' +
      '것에서 읽은 값입니다. 학위가 올라간다고 이 칸이 자동으로 오르지 않습니다.</p></div>';
  }

  function sect(no, title, sub, body) {
    return '<div class="section"><h2 class="sect">' + (no ? no + '. ' : '') + esc(title) + '</h2>' +
      (sub ? '<p class="subdesc">' + esc(sub) + '</p>' : '') + body + '</div>';
  }

  function render(J) {
    var out = [], n = 0, no = function () { return pad2(++n); };
    var lvl = J.report_level;
    var top = J.decision_table[0];
    var TIER = { basic: 'BASIC', standard: 'STANDARD', pro: 'PRO' };

    out.push('<div class="resulthead">' +
      '<div class="eyebrow">기계공학과 · ' + esc((J.education_stage_lens || {}).label || '') +
      ' · ' + esc(TIER[lvl]) + ' · ' + esc(J.assessment_version) + '</div>' +
      '<h1>' + esc(J.profile.name || '응시자') + '님의<br>진로 결정 자료</h1>' +
      '<p class="desc">' + J.assessment.item_count + '문항 가운데 ' + J.assessment.answered +
      '문항 응답 · ' + esc(J.assessment.measurement_note) + '</p></div>');

    out.push('<div class="section"><div class="card contentcard">' +
      '<div class="eyebrow">이 자료를 읽는 법</div><ul class="qlist">' +
      '<li>여기 나오는 값은 어느 것도 합격 가능성이나 실력을 잰 값이 아닙니다.</li>' +
      '<li>관심·경험·학습의향·업무 방식은 서로 다른 문항에서 나와 따로 읽습니다.</li>' +
      '<li>종합 점수를 만들지 않습니다. 칸이 갈리는 자리가 할 일을 알려 줍니다.</li>' +
      '</ul></div></div>');

    /* 경험 안내는 맨 위에. 빈 상태를 조용히 두지 않는다 */
    out.push(sect(no(), '이미 가지고 계신 것',
      J.evidence_supplied ? '적어 주신 경험을 넷으로 갈랐습니다.' : '',
      evidenceMap(J)));

    out.push(sect(no(), '어디부터 볼지',
      '여섯 칸이 각각 다른 것을 재고, 마지막 칸이 지금 할 일을 적습니다.',
      decisionTable(J, lvl === 'basic' ? 6 : (lvl === 'standard' ? 10 : 16))));

    out.push(sect(no(), '왜 이 직무가 앞에 왔는가', '',
      J.decision_table.slice(0, lvl === 'basic' ? 1 : 3)
        .map(function (r) { return why(J, r); }).join('')));

    /* 전공지식 → 실제 업무 → 판단 → 산출물 → 조직 성과 → 내 증거.
       **이 자리가 제품의 중심이다.** 적합도만 내놓으면 '기계설계가 맞습니다'
       에서 끝나고, 읽는 사람은 그래서 무엇을 하라는 것인지 모른다. */
    var VR = window.PCAV2ValueReport;
    if (VR) {
      var chainN = lvl === 'basic' ? 1 : (lvl === 'standard' ? 3 : 5);
      var chains = VR.academiaToWork(J, chainN);
      if (chains) {
        out.push(sect(no(), '전공지식이 실제 업무에서 어떻게 쓰이는가',
          '배운 것에서 조직이 결과로 치는 것까지 한 줄로 잇고, 그 줄 위에 ' +
          '지금 가진 증거를 올려 뒀습니다.', chains));
      }
    }

    out.push(sect(no(), '업무 방식', '어느 쪽 응답이 더 많았는지를 보는 축입니다.',
      workMode(J)));

    if (VR && J.evidence_supplied) {
      var el2 = VR.ladder(J, lvl === 'basic' ? 2 : (lvl === 'standard' ? 4 : 10));
      if (el2) {
        out.push(sect(no(), '내 경험은 어디까지 증거가 되었나',
          '활동에서 반복 가능성까지 여섯 칸입니다. 아래 칸이 비면 위 칸을 ' +
          '확정으로 올리지 않습니다.', el2));
      }
      var ut = VR.untranslated(J, lvl === 'basic' ? 2 : 4);
      if (ut) {
        out.push(sect(no(), '아직 성과 언어로 번역되지 않은 경험',
          '겪으셨는데 아직 적지 않으신 칸이 있는 경험입니다.', ut));
      }
      var tb = VR.toolBox(J, lvl === 'pro');
      if (tb) {
        out.push(sect(no(), '쓰신 도구가 무엇을 받쳐 주는가',
          '도구 → 어디에 썼는가 → 무엇을 판단했는가 → 무엇이 남았는가 → ' +
          '무엇과 견주었는가.', tb));
      }
    }

    if (J.education_stage_lens) {
      var st = J.education_stage_lens;
      out.push(sect(no(), st.label + ' 단계에서 읽는 법', st.question + '.',
        '<div class="card contentcard"><p>' + esc(st.now) + '</p>' +
        '<div style="margin-top:10px">' + st.evidence.map(function (x) {
          return '<span class="tag">' + esc(x) + '</span>'; }).join('') + '</div>' +
        '<p class="note" style="margin-top:10px">지금 단계에서 무게를 두지 않아도 ' +
        '되는 것들입니다. ' + esc(st.deemphasize.join(', ')) + '.</p></div>'));
    }

    /* STANDARD 부터: 결정 소유 · 증거 매핑 · 90일 */
    if (lvl !== 'basic') {
      out.push(sect(no(), '무엇을 직접 정해 왔는가', '',
        ownershipBox(J) +
        (J.evidence_quality ? '<div class="card contentcard" style="margin-top:10px">' +
          '<div class="eyebrow">보여 줄 수 있는 사례</div><h3 style="margin:6px 0 0">' +
          esc(LV[J.evidence_quality.level]) + '</h3>' +
          '<p class="note" style="margin-top:8px">증거 준비도로 갑니다. ' +
          '업무 방식 값에는 들어가지 않습니다.</p></div>' : '')));

      if (VR) {
        var sm = VR.sameMajor(J);
        if (sm) {
          out.push(sect(no(), '같은 전공도 조직에 따라 성과가 달라집니다',
            '같은 지식으로 어디에서는 제품이 나오고 어디에서는 논문이 나옵니다.', sm));
        }
        var gp = VR.gap(J);
        if (gp) {
          out.push(sect(no(), '아직 비어 있는 증거',
            '그 직무가 보고 싶어 하는 것 가운데 지금 적어 주신 범위에 없는 것입니다.', gp));
        }
      }

      var mapped = J.decision_table.slice(0, 3).filter(function (r) { return r.evidence_readiness; });
      if (mapped.length) {
        out.push(sect(no(), '내 경험이 어느 직무에 걸리는가', '',
          '<div class="grid">' + mapped.map(function (r) {
            var x = r.evidence_readiness;
            return '<div class="card contentcard"><div class="eyebrow">' + esc(r.name) + '</div>' +
              '<h3 style="margin:6px 0 0">' + esc(RD[x.level]) + '</h3>' +
              (x.supported_by.length ? '<p class="note" style="margin-top:8px"><b>걸린 것</b> ' +
                esc(x.supported_by.slice(0, 3).join(' · ')) + '</p>' : '') +
              (x.missing.length ? '<p class="note" style="margin-top:6px"><b>비어 있는 것</b> ' +
                esc(x.missing.slice(0, 2).join(' · ')) + '</p>' : '') + '</div>';
          }).join('') + '</div>'));
      }
    }

    /* PRO: 과제 소유 · 근거 구조 */
    if (lvl === 'pro') {
      var rb = researchBox(J);
      if (rb) out.push(sect(no(), '연구·과제를 어디까지 맡아 봤는가', '', rb));
      if (J.research_maturity) {
        var m = J.research_maturity;
        out.push(sect(no(), '적어 주신 과제에서 읽은 자리', '',
          '<div class="card contentcard"><div class="eyebrow">' + esc(m.level) + ' · ' +
          esc(m.label) + '</div><p class="note" style="margin-top:8px"><b>이렇게 읽었습니다</b> ' +
          esc(m.evidence.join(' · ')) + '</p>' +
          (m.missing_for_next_level.length ? '<p class="note" style="margin-top:6px">' +
            '<b>다음 칸으로 가려면</b> ' + esc(m.missing_for_next_level.join(' · ')) +
            '</p>' : '') + '</div>'));
      }
      if (VR) {
        var pf = VR.portfolio(J);
        if (pf) {
          out.push(sect(no(), '직무별 가치 사슬 묶음',
            '위에서 본 사슬을 한 표로 모았습니다.', pf));
        }
        var rp2 = VR.repeat(J);
        if (rp2) {
          out.push(sect(no(), '한 번 낸 결과를 다시 쓸 수 있는가',
            '석사·박사·학위 후 연구 경력에서 가장 크게 갈리는 자리입니다.', rp2));
        }
        var cv = VR.cvBank(J);
        if (cv) {
          out.push(sect(no(), '자기소개서와 면접으로 옮기기',
            '적어 주신 판단과 결과물을 그대로 문장으로 옮겼습니다.', cv));
        }
      }

      out.push(sect(no(), '서류·면접·포트폴리오로 가져갈 것',
        '적어 주신 경험 가운데 밖으로 보여 줄 형태가 된 것과 아직 안 된 것입니다.',
        '<div class="card contentcard"><ul class="qlist">' +
        '<li><b>서류</b> 무엇을 했는지보다 무엇을 직접 정했는지를 한 줄로 적으십시오.</li>' +
        '<li><b>면접</b> ' + esc(top.name) + ' 쪽은 판단의 근거를 되묻습니다. ' +
        '고른 이유와 포기한 것을 같이 준비해 두세요.</li>' +
        '<li><b>포트폴리오</b> 결과물 사진보다 조건표 한 장이 먼저 읽힙니다.</li>' +
        '</ul></div>'));
    }

    if (VR) {
      var np = VR.nextProject(J);
      if (np) {
        out.push(sect(no(), '다음에 만들 경험',
          '지금 비어 있는 칸을 채우는 한 건입니다.', np));
      }
    }

    out.push(sect(no(), '다음에 할 것', '',
      plan(J, lvl === 'basic' ? 30 : (lvl === 'standard' ? 90 : 365))));

    if (J.country_context && J.country_context.notice) {
      out.push('<div class="section"><div class="card contentcard">' +
        '<div class="eyebrow">나라별 내용</div><p class="note">' +
        esc(J.country_context.notice) + '</p></div></div>');
    }

    out.push('<div class="section"><p class="foot">' +
      esc(J.assessment_version) + ' · 파일럿 검증 전입니다. 이 자료는 어디부터 ' +
      '살펴볼지를 좁히는 데 쓰이고, 합격 가능성을 말하지 않습니다.</p></div>');

    return out.join('');
  }

  return { render: render, decisionTable: decisionTable };
})();
