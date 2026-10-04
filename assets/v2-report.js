/* ME_V2 결과지.
 *
 * **읽는 순서가 곧 구조다.**
 *
 *   결정 → 왜 → 내 증거 → 조직이 보는 결과 → 비어 있는 것 → 할 일
 *
 * 예전 결과지는 분석 모듈을 만든 순서대로 늘어놓아서, 한 직무가 결정 표와
 * 범위와 사슬과 격차와 지원 자료에 다섯 번 나왔다. 읽는 사람은 같은 직무를
 * 다섯 번 만나고도 그래서 무엇을 하라는 것인지 몰랐다. **직무 하나는 한
 * 자리에서 끝낸다**(`roleDeepDive`).
 *
 * **첫 장에서 서른 초 안에 넷을 답할 수 있어야 한다.**
 *   ① 먼저 볼 직무 셋  ② 왜  ③ 가장 큰 공백  ④ 지금 할 일
 * 그래서 첫 장에 검사 설명도 측정 방법도 문항 번호도 넣지 않는다. 그런
 * 것은 부록으로 간다.
 *
 * **점수를 만들지 않는다.** 여기는 그리기만 한다. 판단은 `v2-scoring.js` ·
 * `value-engine.js` · `coverage-engine.js` 가 끝내 놓는다.
 */
window.PCAV2Report = (function () {
  'use strict';

  var DEC = window.PCAV2Decision;
  var VR = window.PCAV2ValueReport;
  var CR = window.PCAV2CoverageReport;
  var SN = window.PCASanitize;

  function esc(s) { return SN ? SN.esc(s) : String(s == null ? '' : s); }
  function clean(v) { return SN ? SN.safe(v) : esc(v); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  var LV = { high: '높음', medium: '보통', low: '낮음' };
  /* 결과지에서 가장 조심해야 하는 두 문장. **한 번만 적어 둔다**: 세 자리에
     따로 적어 두었더니 손볼 때마다 세 군데가 갈렸고, 문체 검사에도 같은
     대구가 여섯 번 센 것으로 걸렸다 */
  var NOT_ABILITY = '못 한다는 뜻이 아닙니다. 지금 적어 주신 것으로는 ' +
    '확인되지 않는다는 뜻입니다.';
  var LOW_RUNG = '낮은 칸이 모자라다는 뜻이 아닙니다. 지금 적어 주신 것으로 ' +
    '확인되는 범위입니다.';
  var RUNG = { E0: '활동', E1: '판단', E2: '산출물', E3: '성과', E4: '조직 가치', E5: '반복' };

  /* ── 쪽 ─────────────────────────────────────────────────────────────
     한 쪽에 핵심 메시지 하나. 인쇄에서 쪽이 갈리는 자리가 여기다. */
  function page(n, eyebrow, title, sub, body, cls, nav) {
    return '<section class="rpage' + (cls ? ' ' + cls : '') + '"' +
      ' id="rp' + n + '"' + (nav ? ' data-nav="' + esc(nav) + '"' : '') + '>' +
      '<div class="rpnum">' + pad2(n) + '</div>' +
      (eyebrow ? '<div class="eyebrow">' + esc(eyebrow) + '</div>' : '') +
      '<h2 class="rptitle">' + esc(title) + '</h2>' +
      (sub ? '<p class="rpsub">' + esc(sub) + '</p>' : '') +
      body + '</section>';
  }

  /* ── 1쪽. 결정 요약 ─────────────────────────────────────────────── */

  /** 지금 가장 큰 공백 하나. 상위 직무의 핵심 미확인에서 고른다. */
  function biggestGap(J) {
    var cv = J.role_evidence_coverage || {};
    for (var i = 0; i < Math.min(3, J.decision_table.length); i++) {
      var fid = J.decision_table[i].career_family_id;
      var c = cv[fid];
      if (c && c.priority_gaps.length) {
        return { family: c.career_family_name, gap: c.priority_gaps[0] };
      }
    }
    return null;
  }

  /** 지금 할 일 한 줄. 공백이 있으면 그것, 없으면 비교로 넘어간다. */
  function nextOneThing(J) {
    var g = biggestGap(J);
    if (g) {
      return '<b>' + esc(g.gap.label) + '</b> 한 자리를 채우는 일을 하나 하십시오. ' +
        esc(g.gap.description);
    }
    var top = J.decision_table[0];
    return '핵심 영역이 모두 확인됩니다. ' + esc(top.name) +
      ' 공고 세 건을 띄워 놓고 요구사항과 내 근거를 한 줄씩 맞춰 보십시오.';
  }

  /**
   * 핵심 판단 두세 개.
   *
   * **사실에서만 만든다.** 관심과 경험이 갈리는 자리, 범위가 비어 있는
   * 자리, 깊이가 멈춘 자리. 없는 것은 쓰지 않는다.
   */
  function findings(J) {
    var out = [];
    var rows = J.decision_table.slice(0, 3);
    var cv = J.role_evidence_coverage || {};

    rows.forEach(function (r) {
      if (out.length >= 3) return;
      var i = r.interest && r.interest.level, e = r.exposure && r.exposure.level;
      if (i === 'high' && e === 'low') {
        out.push(esc(r.name) + ' 는 해보고 싶은 쪽으로 답하셨는데 해본 경험이 ' +
          '아직 확인되지 않습니다.');
      }
    });
    rows.forEach(function (r) {
      if (out.length >= 3) return;
      var c = cv[r.career_family_id];
      if (c && c.summary.core.confirmed > 0 && c.priority_gaps.length) {
        out.push(esc(r.name) + ' 는 핵심 ' + c.summary.core.total + '개 가운데 ' +
          c.summary.core.confirmed + '개가 확인되고, ' +
          esc(c.priority_gaps[0].label) + ' 가 비어 있습니다.');
      }
    });
    if (out.length < 3 && J.performance_evidence && J.performance_evidence.length) {
      var deep = null;
      J.performance_evidence.forEach(function (x) {
        if (x.confirmed_up_to && (!deep || x.confirmed_up_to.id > deep.id)) deep = x.confirmed_up_to;
      });
      if (deep) {
        out.push('적어 주신 경험은 지금 ' + esc(deep.name) + ' 까지 확인됩니다.');
      }
    }
    if (out.length < 2 && rows[1]) {
      out.push(esc(rows[0].name) + ' 와 ' + esc(rows[1].name) +
        ' 가 가까이 있어 둘을 견주어 보실 단계입니다.');
    }
    return out.slice(0, 3);
  }

  /**
   * 첫 쪽을 만드는 **객체 하나**.
   *
   * 규격이 요구한 모양이다: `top_roles` · `key_findings` · `critical_gap` ·
   * `next_action` · `confidence_note`. **웹과 PDF 가 같은 객체를 받는다.**
   * 그리기 전에 이 객체를 먼저 만들어 두면, 첫 쪽에 무엇이 들어가는지가
   * 그리는 코드를 읽지 않고도 보인다. 여기서 점수를 만들지 않는다.
   */
  function summary(J) {
    var g = biggestGap(J);
    return {
      top_roles: J.decision_table.slice(0, 3).map(function (r, i) {
        return {
          rank: i + 1,
          career_family_id: r.career_family_id,
          name: r.name,
          interest: LV[r.interest && r.interest.level] || null,
          exposure: LV[r.exposure && r.exposure.level] || null,
          core_confirmed: r.evidence_coverage ? r.evidence_coverage.core.confirmed : null,
          core_total: r.evidence_coverage ? r.evidence_coverage.core.total : null,
          decision_status: r.decision_status,
          decision_status_label: DEC.label(r.decision_status)
        };
      }),
      key_findings: findings(J),
      critical_gap: g ? { label: g.gap.label, family: g.family, why: g.gap.description } : null,
      next_action: nextOneThing(J),
      confidence_note: '여기 나오는 값은 합격 가능성이나 실력을 잰 값이 아닙니다. ' +
        '지금 적어 주신 응답과 경험에서 확인되는 것만 적었습니다.'
    };
  }

  function decisionSummary(J) {
    var S = summary(J);
    var g = S.critical_gap;
    return '<div class="dsum">' +
      '<div class="dstop">' +
      S.top_roles.map(function (r, i) {
        return '<div class="dscard">' +
          '<div class="dsrank">' + r.rank + '</div>' +
          '<h3>' + esc(r.name) + '</h3>' +
          '<div class="dsmeta">' +
          '<span>관심 ' + esc(r.interest || '—') + '</span>' +
          '<span>경험 ' + esc(r.exposure || '—') + '</span>' +
          (r.core_total !== null
            ? '<span>핵심 ' + r.core_confirmed + '/' + r.core_total + ' 확인</span>' : '') +
          '</div>' +
          '<div class="dsnow">' + esc(r.decision_status_label) + '</div>' +
          '</div>';
      }).join('') + '</div>' +

      '<div class="dsgrid">' +
      '<div class="dsbox"><h4>지금 결과에서 가장 중요한 것</h4><ul class="qlist">' +
      S.key_findings.map(function (t) { return '<li>' + t + '</li>'; }).join('') +
      '</ul></div>' +

      '<div class="dsbox dsgap"><h4>가장 큰 공백</h4>' +
      (g
        ? '<p class="dsgapname">' + esc(g.label) + '</p>' +
          '<p class="note">' + esc(g.family) + ' · ' + esc(g.why) + '</p>'
        : '<p class="note">핵심 영역에서 비어 있는 자리가 없습니다.</p>') +
      '</div>' +
      '</div>' +

      '<div class="dsact"><div class="eyebrow">지금 할 일</div>' +
      '<p>' + S.next_action + '</p></div>' +

      '<p class="note dsfoot">' + esc(S.confidence_note) + '</p>' +
      '</div>';
  }

  /* ── 2쪽. 직무 견주기 ───────────────────────────────────────────── */
  function topComparison(J) {
    var top = J.decision_table.slice(0, 3);
    var adj = J.decision_table.slice(3, 5);
    var cell = function (r) {
      var c = r.evidence_coverage;
      return '<tr><td><b>' + esc(r.name) + '</b></td>' +
        '<td>' + esc(DEC.modeLabel(r.work_mode)) + '</td>' +
        '<td>' + esc(LV[r.interest && r.interest.level] || '—') + '</td>' +
        '<td>' + esc(LV[r.exposure && r.exposure.level] || '—') + '</td>' +
        '<td>' + esc(LV[r.learning && r.learning.level] || '—') + '</td>' +
        '<td>' + (c ? c.core.confirmed + ' / ' + c.core.total : '—') + '</td>' +
        '<td>' + (r.evidence_depth ? esc(r.evidence_depth + ' ' + RUNG[r.evidence_depth]) : '—') + '</td>' +
        '<td><b>' + esc(DEC.label(r.decision_status)) + '</b></td></tr>';
    };
    return '<div class="v2tw"><table><thead><tr>' +
      ['직무', '업무방식', '관심', '경험', '학습의향', '핵심 확인', '증거 깊이', '지금 단계']
        .map(function (h) { return '<th>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + top.map(cell).join('') +
      (adj.length
        ? '<tr class="v2adj"><td colspan="8">곁에 두실 후보</td></tr>' + adj.map(cell).join('')
        : '') +
      '</tbody></table></div>' +
      '<p class="note" style="margin-top:12px">칸을 하나로 합치지 않습니다. ' +
      '관심이 높은데 경험이 비어 있으면 먼저 작게 한 번 해보시는 것이 지원보다 ' +
      '앞섭니다. 그 말을 하려면 두 칸이 갈려 있어야 합니다. ' +
      '열여섯 직무 전부는 부록에 있습니다.</p>';
  }

  /* ── 직무 하나를 한 자리에서 ─────────────────────────────────────── */

  /** 왜 이 직무가 앞에 왔는가. **문항 번호는 부록으로 보낸다.** */
  function whyPlain(J, row) {
    var bank = window.PCA_V2_ITEMS.ME;
    var all = [].concat(bank.core.items, bank.standard.items, bank.pro.items);
    var hits = [];
    all.forEach(function (it) {
      var w = (it.career_family_weights || {})[row.career_family_id];
      if (!w || w < 0.6) return;
      if (it.construct !== 'actual_work_interest' && it.construct !== 'learning_intent') return;
      var txt = window.PCAV2.textOf(it, J.education_stage);
      if (txt) hits.push({ no: it.question_no, t: txt });
    });
    if (!hits.length) return '';
    /* 문항 문장을 그대로 베끼지 않고 사람이 읽는 이유로 줄인다 */
    var reasons = hits.slice(0, 3).map(function (h) {
      return h.t.replace(/일을 해보고 싶다\.?$/, '').replace(/\.$/, '').trim();
    });
    return '<p class="rdwhy">' +
      reasons.map(function (r) { return esc(r); }).join(' · ') +
      ' 쪽으로 답하셨습니다.</p>';
  }

  function roleDeepDive(J, row, opts) {
    opts = opts || {};
    var fid = row.career_family_id;
    var vp = (J.value_path && J.value_path.paths) ? J.value_path.paths[fid] : null;
    var cv = (J.role_evidence_coverage || {})[fid];
    var box = function (label, body) {
      return body ? '<div class="rdbox"><div class="rdlab">' + esc(label) + '</div>' +
        body + '</div>' : '';
    };
    var tags = function (a, n) {
      return (a || []).slice(0, n || 5).map(function (x) {
        return '<span class="tag">' + esc(x) + '</span>'; }).join('');
    };

    /* 지금 내 증거. **비어 있으면 빈 표를 그리지 않는다** */
    var mine = '';
    if (cv) {
      var okRows = cv.coverage.filter(function (r) {
        return r.importance === 'core' && r.status === 'confirmed'; });
      var part = cv.coverage.filter(function (r) {
        return r.importance === 'core' && r.status === 'partial'; });
      if (okRows.length || part.length) {
        /* **줄을 다 적지 않는다.** 확인된 칸을 열 줄 늘어놓으면 한 장을 다
           먹고, 정작 읽어야 할 '아직 필요한 증거' 가 다음 장으로 밀린다.
           전체는 부록의 직무별 증거 범위에 그대로 있다 */
        var CAP = 3;
        var extra = Math.max(0, okRows.length + part.length - CAP);
        var okShow = okRows.slice(0, CAP);
        var partShow = part.slice(0, Math.max(0, CAP - okShow.length));
        mine = '<ul class="rdlist">' +
          okShow.map(function (r) {
            return '<li><span class="ok">확인</span>' + esc(r.label) +
              (r.supported_by.length
                ? '<i>' + (SN ? SN.list(r.supported_by).slice(0, 2).map(esc).join(' · ')
                    : esc(r.supported_by.slice(0, 2).join(' · '))) + '</i>' : '') + '</li>';
          }).join('') +
          partShow.map(function (r) {
            return '<li><span class="part">일부</span>' + esc(r.label) +
              '<i>' + esc(r.minimum_depth_name) + '까지 가면 확인됩니다</i></li>';
          }).join('') + '</ul>' +
          (extra ? '<p class="note">나머지 ' + extra + '개는 부록의 직무별 증거 ' +
            '범위에 그대로 있습니다.</p>' : '');
      } else {
        mine = '<p class="note">현재 입력에서는 이 직무의 핵심 증거가 아직 ' +
          '충분히 확인되지 않습니다.</p>';
      }
    }

    /* 아직 필요한 것. **두셋만 적는다**: 여덟 줄을 다 적으면 아무것도 안 읽힌다 */
    var need = '';
    if (cv && cv.priority_gaps.length) {
      need = '<ul class="rdlist">' + cv.priority_gaps.slice(0, 3).map(function (g) {
        return '<li><span class="not">아직</span>' + esc(g.label) +
          '<i>' + esc(g.description) + '</i></li>';
      }).join('') + '</ul>';
    }

    var act = cv && cv.priority_gaps.length
      ? esc(cv.priority_gaps[0].label) + ' 를 남기는 일을 한 건 하십시오.'
      : (vp ? esc((vp.next_validation_actions || [])[0] || '') : '');

    return '<article class="rdeep">' +
      '<header class="rdhead">' +
      '<h3>' + esc(row.name) + '</h3>' +
      '<span class="rdstatus">' + esc(DEC.label(row.decision_status)) + '</span>' +
      '</header>' +
      (vp ? '<p class="rdprob">' + esc(vp.problem) + '</p>' : '') +
      whyPlain(J, row) +
      '<div class="rdgrid">' +
      box('실제 하는 일', vp ? tags(vp.work_activities, 4) : '') +
      box('자주 내리는 판단', vp ? tags(vp.technical_decisions, 4) : '') +
      box('전공지식 연결', vp
        ? tags(vp.academic_inputs.filter(function (a) { return a.confidence !== 'unknown'; })
            .map(function (a) { return a.label; }), 5) ||
          '<span class="note">아직 걸린 과목이 없습니다</span>'
        : '') +
      box('조직에서 보는 결과', vp ? tags(vp.performance_criteria, 4) : '') +
      '</div>' +
      '<div class="rdgrid rdev">' +
      box('현재 내 증거', mine) +
      box('아직 필요한 증거', need || '<p class="note">핵심에서 비어 있는 자리가 없습니다.</p>') +
      '</div>' +
      (act ? '<div class="rdact"><b>다음 행동</b> ' + act + '</div>' : '') +
      '</article>';
  }

  /* ── 4쪽. 지금 내 증거 ──────────────────────────────────────────── */
  function evidenceToday(J, n, lean) {
    if (!J.evidence_supplied) {
      return '<div class="card contentcard"><p>아직 등록된 경험이 없습니다.</p>' +
        '<p class="note" style="margin-top:8px">프로젝트·연구·인턴 경험을 ' +
        '더하시면 직무별 증거가 구체적으로 바뀝니다. 지금 결과지는 응답만으로 ' +
        '말할 수 있는 데까지입니다.</p>' +
        '<div class="evnav" style="margin-top:12px">' +
        '<button type="button" class="primary" id="btnEvidence">경험 추가하기</button>' +
        '</div></div>';
    }
    /* `lean` 은 BASIC. 도구 상자는 한 장을 더 먹는데, BASIC 은 이 쪽에
       비어 있는 것까지 같이 올려야 해서 자리가 없다. 도구는 STANDARD 부터 */
    return (VR ? VR.ladder(J, n) : '') +
      (lean ? '' : (VR ? VR.toolBox(J, false) : ''));
  }

  /* ── 8쪽. 아직 번역되지 않은 것과 비어 있는 것 ──────────────────── */
  function missingEvidence(J, lvl) {
    var out = '';
    /* **이름을 붙여 둔다.** 결과지를 쪽으로 다시 짜면서 절 제목을 없앴더니
       이 카드들이 이름 없이 떠 있었다. 무엇을 보는 칸인지 모르면 '적다는
       뜻이 아니다' 라는 다음 줄도 무슨 말인지 알 수 없다 */
    var ut = VR ? VR.untranslated(J, lvl === 'basic' ? 1 : 4) : '';
    if (ut) {
      out += '<h3 class="rpsub2">아직 성과 언어로 번역되지 않은 경험</h3>' +
        '<p class="note">조직이 결과로 읽는 칸이 아직 비어 있는 경험입니다.</p>' + ut;
    }
    /* 비어 있는 자리를 고르기로 채우는 칸. **긴 주관식을 요구하지 않는다**:
       적는 일이 길어지면 거기서 닫고 나간다 */
    if (CR) {
      var ask = CR.askBox(J, J.decision_table[0].career_family_id);
      if (ask) out += '<div style="margin-top:16px">' + ask + '</div>';
    }
    /* 직무별로 핵심 영역이 어디까지 확인되었나. **BASIC 은 한 줄만 받는다**:
       네댓 장 안에서 세 직무를 다 펼치면 자리가 없고, 첫 쪽이 이미 가장 큰
       공백을 이름으로 적었다. 그래도 세 상태(확인·일부·아직)는 등급에
       관계없이 보여야 해서 표 자체를 없애지는 않는다 */
    var cv = J.role_evidence_coverage || {};
    var rows = J.decision_table.slice(0, lvl === 'basic' ? 1 : 3)
      .map(function (r) { return cv[r.career_family_id]; })
      .filter(function (c) { return c && c.priority_gaps.length; });
    if (rows.length) {
      /* **세 상태를 글자로 적는다.** 색으로만 말하지 않고, '확인 / 일부
         확인 / 아직 확인되지 않음' 을 칸 이름으로 둔다. 직무 쪽을 받지
         않는 등급(BASIC·STANDARD)에서도 세 상태가 그대로 보여야 한다 */
      out += '<div class="card contentcard" style="margin-top:16px">' +
        '<div class="eyebrow">직무별로 핵심 영역이 어디까지 확인되었나</div>' +
        '<table class="v2gap"><thead><tr><th>직무</th><th>현재 확인된 것</th>' +
        '<th>일부 확인</th><th>아직 확인되지 않음</th>' +
        '<th>먼저 채울 자리</th></tr></thead><tbody>' +
        rows.map(function (c) {
          var k = c.summary.core;
          return '<tr><td><b>' + esc(c.career_family_name) + '</b></td>' +
            '<td>' + k.confirmed + ' / ' + k.total + '</td>' +
            '<td>' + k.partial + '</td>' +
            '<td>' + k.not_yet + '</td>' +
            '<td>' + esc(c.priority_gaps.slice(0, 2).map(function (g) { return g.label; })
              .join(' · ')) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    return out;
  }

  /* ── 10쪽. 서류·면접·포트폴리오 ─────────────────────────────────── */
  function translation(J) {
    var list = (J.performance_evidence || []).filter(function (x) {
      return x.decided || (x.made || []).length; });
    var top = J.decision_table[0];
    var cards = list.slice(0, 3).map(function (x) {
      var line = [];
      if (x.decided) line.push(clean(x.decided));
      if ((x.made || []).length) line.push(SN.list(x.made).slice(0, 2).join(' · ') + ' 를 남김');
      if ((x.checked_against || []).length) line.push(SN.list(x.checked_against)[0] + ' 와 견줌');
      line = line.filter(Boolean);
      if (!line.length) return '';
      return '<div class="card contentcard"><div class="eyebrow">' +
        (clean(x.title) || '(제목 없는 경험)') + '</div>' +
        '<p class="cvline">' + line.join(', ') + '</p>' +
        '<p class="note" style="margin-top:8px"><b>면접에서 받을 질문</b> ' +
        esc(x.next ? (x.next.questions || [])[0] : '그 판단을 되돌린다면 무엇을 다르게 하시겠습니까') +
        '</p></div>';
    }).filter(Boolean).join('');
    /* 서류·면접·포트폴리오는 **셋을 나란히 둔다.** 한 상자 안의 목록으로
       두면 셋 중 어느 것을 지금 손볼 차례인지가 안 보인다. 카드가 셋이면
       고르는 일이 된다 */
    var three = [
      ['서류', '한 일보다 직접 정한 것을 한 줄로 적으십시오. 위 문장을 그대로 ' +
        '옮기셔도 됩니다.'],
      ['면접', esc(top.name) + ' 쪽은 판단의 근거를 되묻습니다. 고른 이유와 ' +
        '포기한 것을 같이 준비해 두십시오.'],
      ['포트폴리오', '결과물 사진보다 조건표 한 장이 먼저 읽힙니다.']
    ].map(function (t) {
      return '<div class="card contentcard"><div class="eyebrow">' + esc(t[0]) +
        '</div><p class="cvline">' + t[1] + '</p></div>';
    }).join('');
    return (cards ? '<div class="grid">' + cards + '</div>' : '') +
      '<div class="rpgap"><h3 class="rpsub2">지원서 · 면접 · 포트폴리오</h3>' +
      '<div class="grid three">' + three + '</div></div>';
  }

  /* ── 부록 ───────────────────────────────────────────────────────── */
  /**
   * 쪽에 붙여 둔 내비 이름을 모아 **머리에 붙는 띠**를 만든다.
   *
   * 규격이 요구한 자리다. 쪽을 그린 뒤에 긁어모으기 때문에, 등급마다
   * 없는 쪽(BASIC 의 조직 비교 같은 것)은 **띠에도 나오지 않는다**:
   * 없는 데로 데려가는 단추를 만들지 않는다.
   */
  function navBar(html) {
    var items = [];
    html.replace(/id="(rp\d+)" data-nav="([^"]+)"/g, function (_, id, name) {
      items.push({ id: id, name: name });
      return _;
    });
    if (items.length < 3) return '';
    return '<nav class="rpnav" aria-label="결과지 안에서 옮겨 가기">' +
      items.map(function (x) {
        return '<a href="#' + x.id + '">' + x.name + '</a>';
      }).join('') +
      '<a href="#rpapx" class="rpnav-a">상세 분석</a></nav>';
  }

  function appendix(J) {
    var out = [];
    var A = function (title, body, note) {
      return '<section class="apsec"><h3>' + esc(title) + '</h3>' +
        (note ? '<p class="note">' + esc(note) + '</p>' : '') + body + '</section>';
    };

    /* 열여섯 직무 전부 */
    out.push(A('직무군 열여섯 전부',
      '<div class="v2tw"><table><thead><tr>' +
      ['직무', '업무방식', '관심', '경험', '학습의향', '핵심 확인', '지금 단계']
        .map(function (h) { return '<th>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + J.decision_table.map(function (r) {
        var c = r.evidence_coverage;
        return '<tr><td>' + esc(r.name) + '</td>' +
          '<td>' + esc(DEC.modeLabel(r.work_mode)) + '</td>' +
          '<td>' + esc(LV[r.interest && r.interest.level] || '—') + '</td>' +
          '<td>' + esc(LV[r.exposure && r.exposure.level] || '—') + '</td>' +
          '<td>' + esc(LV[r.learning && r.learning.level] || '—') + '</td>' +
          '<td>' + (c ? c.core.confirmed + ' / ' + c.core.total : '—') + '</td>' +
          '<td>' + esc(DEC.label(r.decision_status)) + '</td></tr>';
      }).join('') + '</tbody></table></div>',
      '본문에는 먼저 보실 셋과 곁에 두실 둘만 담았습니다.'));

    /* 근거 문항 */
    var bank = window.PCA_V2_ITEMS.ME;
    var all = [].concat(bank.core.items, bank.standard.items, bank.pro.items);
    var trace = J.decision_table.slice(0, 5).map(function (r) {
      var nos = all.filter(function (it) {
        return ((it.career_family_weights || {})[r.career_family_id] || 0) >= 0.6;
      }).map(function (it) { return 'Q' + it.question_no; });
      return nos.length
        ? '<tr><td>' + esc(r.name) + '</td><td>' + esc(nos.join(', ')) + '</td></tr>' : '';
    }).join('');
    if (trace) {
      out.push(A('어느 문항이 이 줄을 만들었는가',
        '<table class="v2gap"><thead><tr><th>직무</th><th>근거 문항</th></tr></thead>' +
        '<tbody>' + trace + '</tbody></table>',
        '본문에서는 문항 번호를 빼고 사람이 읽는 이유로 적었습니다. 되짚고 ' +
        '싶으실 때 쓰시라고 여기 남깁니다.'));
    }

    /* 업무 방식 자세히 */
    if (J.work_mode && J.work_mode.profile) {
      out.push(A('업무 방식 자세히',
        '<table class="v2gap"><thead><tr><th>축</th><th>기운 쪽</th><th>문항 수</th></tr></thead><tbody>' +
        J.work_mode.profile.map(function (p) {
          return '<tr><td>' + esc(p.poles.join(' ↔ ')) + '</td>' +
            '<td>' + esc(p.leaning === null ? '어느 쪽도 아님' : p.leaning) + '</td>' +
            '<td>' + (p.items || 2) + '</td></tr>';
        }).join('') + '</tbody></table>',
        '두 문항으로 잰 축이라 숫자를 붙이지 않습니다. 검증 전까지 ' +
        '가까움·혼합·먼 편 세 마디로만 말합니다.'));
    }

    /* 연구·과제 소유 */
    if (J.research_maturity) {
      var m = J.research_maturity;
      out.push(A('연구·과제를 어디까지 맡아 봤는가',
        '<p><b>' + esc(m.level) + ' · ' + esc(m.label) + '</b></p>' +
        '<p class="note"><b>이렇게 읽었습니다</b> ' + esc(m.evidence.join(' · ')) + '</p>' +
        (m.missing_for_next_level.length
          ? '<p class="note"><b>다음 칸으로 가려면</b> ' +
            esc(m.missing_for_next_level.join(' · ')) + '</p>' : ''),
        '학위로 배정하지 않습니다. 적어 주신 과제에서만 올라갑니다.'));
    }

    /* 반복 가능성 */
    if (VR && J.repeatability) {
      out.push(A('한 번 낸 결과를 다시 쓸 수 있는가', VR.repeat(J)));
    }

    /* 전체 증거 범위 */
    if (CR) {
      var full = CR.coverage(J, 5, false);
      if (full) {
        out.push(A('직무별 증거 범위 전체', full,
          '핵심·뒷받침·선택을 모두 폅니다. 선택이 비어 있다고 불리하게 보지 않습니다.'));
      }
    }

    /* 방법과 한계 */
    out.push(A('어떻게 만든 자료인가',
      '<ul class="qlist">' +
      '<li>관심·경험·결정 소유·업무 방식·학습 의향은 서로 다른 문항에서 나와 ' +
      '따로 읽습니다. 합쳐서 하나의 점수로 만들지 않습니다.</li>' +
      '<li>경험은 적합도에 들어가지 않습니다. 증거가 어디까지 확인되는지만 ' +
      '달라집니다.</li>' +
      '<li>증거 사다리는 경험 하나의 깊이이고, 증거 범위는 그 직무의 영역을 ' +
      '얼마나 덮었는가입니다. 둘을 합치지 않습니다.</li>' +
      '<li>학위로 증거 단계를 올리지 않습니다.</li>' +
      '</ul>'));

    out.push(A('한계',
      '<ul class="qlist">' +
      '<li>인지 면접과 파일럿을 돌리기 전이라 측정 오차를 산출하지 않습니다.</li>' +
      '<li>합격 가능성이나 실력을 잰 값이 아닙니다.</li>' +
      '<li>' + esc((J.country_context && J.country_context.notice) ||
        '목표 국가의 확인된 자료가 없어 나라별 내용을 넣지 않았습니다.') + '</li>' +
      '<li>직무군 열여섯과 증거 영역은 기계공학과에서만 맞습니다.</li>' +
      '</ul>'));

    out.push(A('판본',
      '<table class="v2gap"><tbody>' +
      '<tr><th>검사</th><td>' + esc(J.assessment_version) + '</td></tr>' +
      '<tr><th>결과 스키마</th><td>' + esc(J.schema_version) + '</td></tr>' +
      '<tr><th>증거 지도</th><td>' + esc(J.evidence_map_version || '—') + '</td></tr>' +
      '<tr><th>문항 수</th><td>' + J.assessment.item_count + ' 가운데 ' +
      J.assessment.answered + ' 응답</td></tr>' +
      '<tr><th>만든 때</th><td>' + new Date().toISOString().slice(0, 10) + '</td></tr>' +
      '</tbody></table>'));

    return '<div class="appendix" id="rpapx">' +
      '<div class="apmark">부록</div>' +
      '<p class="note">본문에서 뺀 것들입니다. 되짚어 보실 때 쓰십시오.</p>' +
      /* 화면에서는 접어 둔다. **종이에서는 늘 펼친다**: 인쇄본에서 접힌
         자리는 사라진 자리와 같다. `<details>` 를 쓰지 않은 이유가 이것이다
         (닫힌 `<details>` 는 인쇄 규칙으로 못 펼친다) */
      '<button type="button" class="apfold" id="apFold" aria-expanded="false" ' +
      'aria-controls="apBody">상세 분석 펼치기</button>' +
      '<div class="apbody is-folded" id="apBody">' + out.join('') + '</div></div>';
  }

  /* ── 전체 ───────────────────────────────────────────────────────── */
  function render(J) {
    if (SN) SN.reset();
    var out = [], n = 0, no = function () { return ++n; };
    var lvl = J.report_level;
    var top = J.decision_table[0];
    var topId = top.career_family_id;
    var TIER = { basic: 'BASIC', standard: 'STANDARD', pro: 'PRO' };

    /* 표지. 쪽 번호를 받지 않는다 */
    out.push('<header class="rcover">' +
      '<div class="rceyebrow">CAREERMATRI · 진로 결정 자료</div>' +
      '<h1>' + esc(clean(J.profile.name) || '응시자') + '</h1>' +
      '<p class="rcmeta">기계공학과 · ' +
      esc((J.education_stage_lens || {}).label || '') + ' · ' + esc(TIER[lvl]) +
      ' · ' + new Date().toISOString().slice(0, 10) + '</p>' +
      '</header>');

    /* 쪽을 짜는 자리. **등급마다 쪽수가 규격에 묶여 있다**:
       BASIC 네댓 쪽 · STANDARD 여섯에서 여덟 · PRO 아홉에서 열하나.
       그래서 아래는 "있으면 다 넣는다" 가 아니라 **등급마다 무엇을 한
       쪽에 합치는지**를 적어 둔 표다. 쪽을 더 쓰고 싶으면 합친 것을
       풀지 말고 등급을 올려야 한다. */
    var isB = lvl === 'basic', isP = lvl === 'pro';
    /* **사슬은 맨 앞 직무 하나만 그린다.** 둘째·셋째 직무의 사슬을 여기
       같이 그리면 아래 직무 쪽(`roleDeepDive`)과 같은 말이 두 번 나온다.
       예전 결과지가 한 직무를 다섯 번 보여 준 자리가 바로 여기였다 */
    var chains = VR ? VR.academiaToWork(J, 1) : '';
    var sm = VR ? VR.sameMajor(J) : '';
    var tr = lvl === 'pro' ? translation(J) : '';
    var miss = missingEvidence(J, lvl);
    var ne = CR ? CR.nextEvidence(J, topId) : '';
    var days = isB ? [30] : (isP ? [30, 90, 365] : [30, 90]);
    var plan = '<div class="grid">' + days.map(function (d) {
      return CR ? CR.plan(J, d, topId) : '';
    }).join('') + '</div>';
    /* **직무 쪽은 PRO 만 받는다.** 규격의 등급 구성이 그렇다: BASIC 은
       결정·사슬·증거·할 일 네 가지(§14), STANDARD 는 거기에 조직 비교와
       공백을 더한 견주기 깊이(§15, "STANDARD value = comparison depth"),
       직무 하나를 파고드는 쪽(§9)은 PRO 의 값이다. 앞서 STANDARD 에 둘을
       넣었더니 규격 쪽수를 넘기면서 등급 값도 흐려졌다 */
    var deepN = isP ? 3 : 0;

    /* 1. 결정. 서른 초에 읽는 쪽이다 */
    out.push(page(no(), 'DECISION', '지금 먼저 보실 세 가지',
      '', decisionSummary(J), 'p-decision', '요약'));

    /* 2. 견주기 */
    out.push(page(no(), 'DECISION', '먼저 볼 직무를 견주면',
      '칸이 갈리는 자리가 지금 할 일을 알려 줍니다.', topComparison(J), '', '직무 비교'));

    /* 3. 왜. 배운 것에서 조직이 결과로 치는 것까지 잇는다. **맨 앞 직무
       하나만.**
       조직 넷을 견주는 쪽은 바로 다음 쪽이 받는다(STANDARD 이상) */
    if (chains) {
      out.push(page(no(), 'WHY', '배운 것이 실제 업무에서 어떻게 쓰이는가',
        '배운 것에서 조직이 결과로 치는 것까지 한 줄로 이었습니다.', chains,
        '', '전공 → 실무'));
    }

    /* 4. 내 증거. **BASIC 은 비어 있는 것까지 이 쪽에서 끝낸다**(규격 §14 의
       "Current Evidence + Gap"). 그러면 다섯째 쪽이 할 일만 받는다 */
    out.push(page(no(), 'EVIDENCE',
      isB ? '지금 내가 가진 증거와 아직 확인되지 않은 것' : '지금 내가 가진 증거',
      J.evidence_supplied
        ? (isB ? LOW_RUNG
          : '경험 하나가 활동에서 반복 가능성까지 어디쯤 와 있는지 봅니다. ' + LOW_RUNG)
        : '',
      evidenceToday(J, isB ? 2 : (isP ? 8 : 4), isB) +
      (isB && miss ? '<div class="rpgap">' +
        '<h3 class="rpsub2">아직 확인되지 않은 것</h3>' +
        '<p class="note">' + NOT_ABILITY + '</p>' + miss + '</div>' : ''),
      '', '내 Evidence'));

    /* 5. 조직이 보는 결과. **BASIC 은 이 쪽을 받지 않는다**: 네댓 장
       안에서는 결정·사슬·증거·할 일이 먼저다. BASIC 의 사슬에도 '어느
       조직 기준으로 적었다' 는 줄은 들어 있어서, 조직이 결과를 가른다는
       말 자체는 빠지지 않는다. 조직 넷을 나란히 견주는 쪽은 STANDARD 부터 */
    if (!isB && (sm || tr)) {
      out.push(page(no(), 'ORGANIZATION VALUE', '같은 전공도 조직에 따라 결과가 달라집니다',
        '같은 지식으로 어디에서는 제품이 나오고 어디에서는 논문이 나옵니다.',
        sm + tr, '', '조직 비교'));
    }

    /* 6~8. 직무 하나씩 깊게. **한 자리에서 끝낸다.**
       BASIC 은 이 쪽을 받지 않는다: 네댓 쪽 안에서는 앞의 결정 쪽이
       먼저다. 직무별 자료는 STANDARD 부터 */
    J.decision_table.slice(0, deepN).forEach(function (r, i) {
      out.push(page(no(), 'WHY · EVIDENCE', r.name, '', roleDeepDive(J, r), '',
        i === 0 ? '직무 자세히' : ''));
    });

    /* 9. 비어 있는 것. BASIC 은 넷째 쪽에서 이미 봤다 */
    if (!isB && miss) {
      out.push(page(no(), 'GAP', '아직 확인되지 않은 것', NOT_ABILITY, miss,
        '', '아직 없는 것'));
    }

    /* 10. 다음에 만들 경험 **하나**, 그리고 그 뒤 일정 */
    out.push(page(no(), 'ACTION',
      ne ? '다음에 만들 경험 하나' : '언제 무엇을 할 것인가',
      ne ? '여러 개를 벌이지 마십시오. 지금 가장 크게 비어 있는 한 자리만 채웁니다.' : '',
      (ne || '') +
      '<div class="rpgap"><h3 class="rpsub2">언제 무엇을 할 것인가</h3>' + plan + '</div>',
      '', '다음 행동'));

    /* 부록 */
    out.push(appendix(J));

    /* 안쪽 경고는 화면에 내보내지 않는다. 뜻 없는 입력을 고쳐 주지도 않는다 */
    if (SN) window.PCA_V2_INPUT_WARNINGS = SN.warnings();
    /* 첫 쪽을 만든 객체를 그대로 내보낸다. 결과 JSON·플랫폼·검사가 화면을
       긁지 않고 같은 값을 읽을 수 있어야 '웹과 PDF 가 같은 객체' 가 된다 */
    window.PCA_V2_DECISION_SUMMARY = summary(J);

    var body = out.join('');
    return '<div class="report">' + navBar(body) + body + '</div>';
  }

  return {
    render: render, summary: summary,
    decisionSummary: decisionSummary, roleDeepDive: roleDeepDive
  };
})();
