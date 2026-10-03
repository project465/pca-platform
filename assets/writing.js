/* 결과지 문장을 만드는 한 곳.
 *
 * BASIC·STANDARD·PRO 가 **같은 함수**를 부르고 `report_level` 만 다르게
 * 넘긴다. 상품마다 문체를 따로 두면 세 벌을 따로 고치게 되고, 그러면 한 벌은
 * 반드시 뒤처진다. 상품은 말투로 갈리지 않고 정보의 깊이로 갈린다.
 *
 * 문장은 네 조각으로 만든다.
 *
 *   fact    채점 결과에서 그대로 읽히는 것. 여기서는 평가하지 않는다
 *   interp  그 사실이 말할 수 있는 범위까지만 넓힌 설명
 *   msg     응시자가 가져갈 한 줄
 *   action  지금 할 수 있는 일. 범위와 개수를 적어 둔다
 *
 * 레벨이 고르는 조각은 아래 `PICK` 한 곳에 있다.
 *
 * **지키는 것**
 *  - 검사가 잰 것만 말한다. 적합·강점·역량 보유·합격 가능성을 쓰지 않는다
 *  - 성향을 사람의 유형으로 규정하지 않는다. 어느 쪽 응답이 많았는지로 쓴다
 *  - 낮은 점수를 능력 부족으로 읽지 않는다. 이번 응답에서 덜 골랐다고 적는다
 *  - 묻지 않은 경험·성과·도구·학위 요건을 지어내지 않는다
 *  - 조언은 셀 수 있는 행동으로 끝낸다
 */
window.PCAWriting = (function () {
  'use strict';

  var DEPTH = { basic: 1, standard: 2, pro: 3 };

  /* 레벨이 어느 조각까지 쓰는가. 규격 17장을 이 표 하나로 옮겼다. */
  var PICK = {
    basic:    ['fact', 'msg', 'action'],
    standard: ['fact', 'interp', 'msg', 'action'],
    pro:      ['fact', 'interp', 'msg', 'action', 'more']
  };

  function depth(level) { return DEPTH[level] || 1; }
  function at(level, n) { return depth(level) >= n; }

  /* 조각을 레벨에 맞춰 문장으로 잇는다. 빈 조각은 건너뛴다. */
  function say(level, parts) {
    var keep = PICK[level] || PICK.basic, out = [];
    keep.forEach(function (k) { if (parts[k]) out.push(parts[k]); });
    return out.join(' ');
  }

  /* 받침을 보고 조사를 고른다. */
  function josa(w, a, b) {
    var s = String(w || ''); if (!s) return a;
    var c = s.charCodeAt(s.length - 1);
    if (c >= 0xac00 && c <= 0xd7a3) return ((c - 0xac00) % 28) ? a : b;
    return '1360LMNRlmnr'.indexOf(s[s.length - 1]) >= 0 ? a : b;
  }

  /* ── 업무 성향 (규격 9장) ─────────────────────────────────────────────
     "당신은 독립형입니다" 를 쓰지 않는다. 응답이 어느 쪽에 더 많았는지를
     적고, 그 방식이 실제로 쓰이는 업무를 보여 준 다음, 그 방식이 부담이
     되는 국면을 같이 적는다. 좋고 나쁨을 가르는 축이 아니다. */
  var POLE = {
    '독립형': {
      resp: '맡은 범위를 혼자 정리해 진행하는 쪽의 응답이 더 많았습니다.',
      work: '해석 모델을 세우고 계산을 돌리는 일, 도면을 확정하는 일, 고장 원인을 ' +
            '끝까지 파는 일처럼 한 사람이 붙어 있어야 진도가 나가는 업무가 여기 해당합니다.',
      load: '정보가 여러 부서에 흩어져 있을 때는 이 방식이 느려집니다. 주 단위로 ' +
            '중간 상태를 밖으로 내보내는 자리를 만들어 두면 전제가 어긋난 것을 일찍 찾습니다.'
    },
    '협력형': {
      resp: '여러 사람의 의견을 모아 하나로 맞추는 쪽의 응답이 더 많았습니다.',
      work: '설계 변경 하나를 확정하려면 구매·생산·품질의 확인이 필요합니다. ' +
            '생산기술·품질·기술기획처럼 부서 사이에 서 있는 자리에서 이 방식을 많이 씁니다.',
      load: '혼자 계산에 붙어 있어야 하는 일은 회의 사이에 끼면 끝나지 않습니다. ' +
            '하루에 두 시간쯤은 일정표에서 비워 두는 편이 좋습니다.'
    },
    '도전형': {
      resp: '정답이 정해지지 않은 문제를 직접 시험해 보는 쪽의 응답이 더 많았습니다.',
      work: '요구조건이 아직 없는 상태에서 시작하는 R&D, 한 번도 의심받지 않은 공정 ' +
            '조건을 다시 보는 일, 반복 고장의 원인을 없애는 개선보전이 여기 가깝습니다.',
      load: '결과가 예상과 다를 때 그것을 정보로 보는 자리에서는 이 방식이 쓰입니다. ' +
            '다만 기준이 이미 정해진 일에서는 바꾸자는 제안이 늦게 받아들여집니다.'
    },
    '안정형': {
      resp: '기준과 절차가 어느 정도 정해져 있을 때 일을 시작하기 편한 쪽입니다.',
      work: '판정 기준을 세우는 품질 업무, 안전 절차가 걸린 설비 보전, 도면 릴리스 전 ' +
            '검도가 그렇습니다. 변화를 꺼린다는 뜻과는 다르고, 흔들리지 않는 기준을 만드는 쪽입니다.',
      load: '기준이 아직 없는 과제를 받으면 시작이 늦어집니다. 임시 기준을 먼저 적고 ' +
            '한 주 뒤에 고치는 식으로 돌리면 출발이 빨라집니다.'
    },
    '속도중시형': {
      resp: '정보가 다 모이기 전에 방향을 먼저 정하는 쪽의 응답이 더 많았습니다.',
      work: '라인이 멈춘 상황, 개념 설계에서 대안을 여러 개 만들어 보는 단계, 납기 안에 ' +
            '결론을 내야 하는 검토가 여기 해당합니다.',
      load: '근거를 남기지 않고 지나가면 나중에 같은 판단을 다시 합니다. 결정 하나에 ' +
            '한 줄씩 사유를 적는 칸을 체크리스트에 넣어 두십시오.'
    },
    '품질중시형': {
      resp: '결과를 내기 전에 한 번 더 확인하는 쪽의 응답이 더 많았습니다.',
      work: '해석의 수렴을 확인하는 일, 공차를 정하는 일, 측정 조건을 통제하는 일처럼 ' +
            '확인을 건너뛰면 결과 자체가 쓸모없어지는 업무가 많습니다.',
      load: '확인할 것이 남아 있어 결정을 미루게 되는 순간이 옵니다. 언제까지 확인하고 ' +
            '넘어갈지를 미리 정해 두면 그 자리에서 덜 걸립니다.'
    }
  };

  /* 축 하나를 읽는다. margin 은 50 에서 얼마나 떨어졌는가다. */
  function style(level, axis) {
    var p = POLE[axis.leaning] || {};
    if (axis.margin < 6) {
      return say(level, {
        fact: '이 축은 양쪽 응답이 거의 같았습니다.',
        interp: '한쪽 방식을 더 편하게 느낀다고 보기 어려운 폭이라 어느 쪽으로도 읽지 않습니다.',
        msg: '업무 환경을 고를 때 이 축은 기준으로 쓰지 않는 편이 낫습니다.'
      });
    }
    return say(level, {
      fact: p.resp,
      interp: p.work,
      msg: axis.margin >= 18
        ? '세 축 가운데 이 축이 가장 한쪽으로 기울었습니다.' : '',
      action: p.load,
      more: ''
    });
  }

  /* 성향 조합. 축 하나씩 읽는 것보다 짝으로 읽는 쪽이 자리를 좁힌다. */
  function stylePair(level, axes) {
    if (!at(level, 2) || axes.length < 2) return '';
    var lead = axes.slice().sort(function (a, b) { return b.margin - a.margin; }).slice(0, 2);
    if (lead[1].margin < 6) return '';
    return '응답이 가장 많이 기운 두 축은 ' + lead[0].leaning + '과 ' + lead[1].leaning +
      '입니다. 두 축을 같이 놓고 보면 어떤 자리가 편한지가 축 하나씩 볼 때보다 좁혀집니다.';
  }

  /* ── FIT (규격 7장) ───────────────────────────────────────────────── */
  function fitMeaning(level) {
    return say(level, {
      fact: '적합도는 응답에서 나타난 업무 방식과 그 직무에서 자주 쓰이는 ' +
            '업무 방식이 얼마나 가까운지를 보여 주는 값입니다.',
      interp: '실력이나 합격 여부를 재는 값이 아니고, 재지도 않았습니다. ' +
              '먼저 살펴볼 자리를 좁히는 데 씁니다.',
      msg: ''
    });
  }

  /* ── 측정 오차 (규격 8장) ─────────────────────────────────────────── */
  function groupMeaning(level, J) {
    var g1 = J.job_fit.filter(function (j) { return j.group === 1; });
    var names = g1.map(function (j) { return j.job; });
    if (g1.length <= 1) {
      return say(level, {
        fact: '1군에 들어온 직무는 ' + names[0] + ' 하나입니다.',
        interp: '2순위와의 차이가 측정 오차 ±' + J.assessment.measurement_error +
                '점보다 커서 두 자리를 같은 후보로 묶지 않았습니다.',
        msg: '이 직무의 실제 업무부터 보시면 됩니다.'
      });
    }
    return say(level, {
      fact: names.join(' · ') + ' ' + josa(names[names.length - 1], '이', '가') +
            ' 1군으로 함께 묶였습니다.',
      interp: '이 ' + g1.length + '개 사이의 점수 차이가 측정 오차 ±' +
              J.assessment.measurement_error + '점 안에 있습니다. 순서를 가를 만한 차이가 아닙니다.',
      msg: '한 자리를 고르기 전에 ' + g1.length + '개의 실제 업무를 같은 기준으로 비교해 보세요.',
      action: '각 직무의 채용공고를 두 건씩 열어 주요 업무를 옮겨 적어 보면 ' +
              '겹치는 부분과 갈리는 부분이 한 장에 들어옵니다.'
    });
  }

  /* 어느 직무가 먼저 왔는지. 추천하는 자리가 아니고 살펴볼 순서를 적는 자리다. */
  function fitLead(level, J) {
    var top = J.job_fit[0];
    return say(level, {
      fact: top.job + josa(top.job, '은', '는') + ' ' + top.job_definition + '입니다.',
      interp: '이번 응답은 이 자리에서 자주 쓰이는 업무 방식과 비교적 가깝습니다.',
      msg: '먼저 살펴볼 이유가 있는 직무로 보시면 됩니다.',
      action: ''
    });
  }

  /* ── 관심 · 경험 · 학습의향 조합 (규격 6장) ───────────────────────────
     세 값의 출처가 다르다. 관심은 하고 싶은가를 묻는 문항, 경험은 증거
     문항, 학습의향은 앞으로 배울 뜻을 묻는 문항이다. 그래서 조합이 뜻을
     가진다. 경험 문항이 없는 상품에서는 경험 자리를 비우고 말하지 않는다. */
  function combo(level, row) {
    var hi = function (v) { return v !== null && v >= 60; };
    var lo = function (v) { return v !== null && v < 45; };
    var i = row.interest, e = row.experience, l = row.learning_intent;

    if (e === null) {
      return say(level, {
        fact: '이 상품은 경험을 묻는 문항이 없어 지금 자료로는 실제 경험까지 ' +
              '판단하기 어렵습니다.',
        interp: '여기서 말할 수 있는 것은 업무 방식이 가깝다는 것까지입니다.',
        msg: '',
        action: '관련 수업이나 프로젝트를 하나 떠올려 무엇을 직접 판단했는지 ' +
                '세 줄로 적어 두면 뒤에 쓸 데가 많습니다.'
      });
    }
    if (hi(i) && hi(e)) {
      return say(level, {
        fact: '업무 방식도 가깝고 관련 경험도 응답에 들어 있습니다.',
        interp: '지원 서류에서 쓸 재료가 이미 있다는 뜻입니다.',
        msg: '어떤 일을 맡았고 무엇을 직접 판단했는지를 정리해 두세요.',
        action: '경험 하나를 골라 조건, 내가 고른 것, 결과를 세 줄로 적어 보세요.'
      });
    }
    if (hi(i) && lo(e) && hi(l)) {
      return say(level, {
        fact: '업무 방식은 가까운데 직접 해본 경험은 아직 많지 않습니다. ' +
              '더 배우고 싶다는 응답은 분명합니다.',
        interp: '지금은 직무를 확정할 단계보다 작게 한 번 해보고 확인할 단계입니다.',
        msg: '짧게라도 직접 해본 뒤 진로 후보로 남길지 판단해 보세요.',
        action: '관심 기업 공고 세 건에서 반복되는 업무 하나를 골라, 2~4주 안에 ' +
                '끝낼 수 있는 크기로 줄여 해보세요.'
      });
    }
    if (hi(i) && lo(e)) {
      return say(level, {
        fact: '업무 방식은 가깝지만 직접 해본 경험은 아직 많지 않습니다.',
        interp: '경험이 적다는 것이 못한다는 뜻은 아니고, 이번 응답에 그 항목이 ' +
                '적게 들어왔다는 뜻입니다.',
        msg: '직무를 결정하기 전에 관련 수업이나 작은 프로젝트를 한 번 거쳐 보세요.',
        action: '이번 학기 수업 하나를 골라 결과물을 한 장으로 남겨 두세요.'
      });
    }
    if (lo(i) && hi(e)) {
      return say(level, {
        fact: '관련 경험은 있는데 이번 응답에서는 그 방식을 덜 골랐습니다.',
        interp: '과거에 해본 일과 앞으로 계속하고 싶은 일이 다를 수 있습니다.',
        msg: '지금도 이 일을 계속하고 싶은지는 따로 확인해 볼 필요가 있습니다.',
        action: '그 경험에서 가장 오래 붙들고 있던 장면 하나를 떠올려, 그 장면이 ' +
                '다시 와도 괜찮은지 적어 보세요.'
      });
    }
    if (lo(i) && lo(e)) {
      return say(level, {
        fact: '업무 방식도 경험도 이번 응답에서는 많이 나오지 않았습니다.',
        interp: '지금 탐색 순서에서는 뒤에 두어도 되는 자리입니다.',
        msg: '다른 직무를 먼저 살펴본 뒤 필요할 때 다시 비교해도 됩니다.'
      });
    }
    return say(level, {
      fact: '업무 방식과 경험이 모두 중간 범위에 있습니다.',
      interp: '이 자리는 실제 업무를 더 보고 나서 판단하는 쪽이 낫습니다.',
      msg: '공고와 현직자의 하루를 먼저 확인해 보세요.'
    });
  }

  /* ── 축 읽기 (규격 15장) ──────────────────────────────────────────── */
  function axisHigh(level, ax, desc) {
    return say(level, {
      fact: ax.name + ' 쪽 활동을 상대적으로 많이 골랐습니다.',
      interp: desc || '',
      msg: '', action: ''
    });
  }

  function axisLow(level, ax, note) {
    return say(level, {
      fact: '이번 응답에서는 ' + ax.name + ' 쪽 활동이 상대적으로 적게 나왔습니다.',
      interp: '능력을 잰 값이 아니므로 못한다는 뜻으로 읽지 않습니다. ' +
              '이 항목을 자주 요구하는 직무를 지원하신다면 실제 경험이 어느 정도 ' +
              '있는지 따로 확인해 보세요.',
      msg: note || '',
      action: ''
    });
  }

  /* ── 강점을 말할 수 있는 세 단계 (규격 10장) ───────────────────────── */
  function strengthLevel(level, hasEvidence, hasResult) {
    if (hasResult) {
      return '결과까지 남아 있다면 그때 역량으로 설명할 근거가 생깁니다.';
    }
    if (hasEvidence) {
      return '관련 경험이 있어 자기소개서나 면접에서 사례로 연결할 수 있습니다.';
    }
    return '지금 말할 수 있는 것은 이런 방식의 업무를 비교적 편하게 느끼는 쪽이라는 ' +
      '것까지입니다. 실제 역량으로 설명하려면 그 방향으로 무엇을 해본 기록이 필요합니다.';
  }

  /* ── 응답 품질 (사실만) ───────────────────────────────────────────── */
  function quality(level, J) {
    var q = J.assessment.response_quality;
    var same = q.same_answer_ratio;
    return say(level, {
      fact: J.assessment.item_count + '문항 가운데 ' + J.assessment.answered +
            '문항에 답하셨고, 같은 값을 이어서 고른 구간이 전체의 ' + same + '%입니다.',
      interp: same >= 40
        ? '같은 값이 이어진 구간이 넓으면 축 사이의 차이가 작게 잡힙니다. ' +
          '결과를 읽을 때 1군 안의 순서는 더 가볍게 보시는 편이 좋습니다.'
        : '응답이 한쪽으로 몰리지 않아 축 사이의 차이가 그대로 잡혔습니다.',
      msg: '', action: ''
    });
  }

  /* ── 자기소개서 예시 표시 (규격 13장) ─────────────────────────────── */
  var SAMPLE_TAG = '[구조 예시]';
  function sampleNote() {
    return '아래는 문장의 뼈대만 보여 주는 예시입니다. 숫자와 사례는 본인이 실제로 ' +
      '한 일로 바꿔 쓰셔야 합니다. 겪지 않은 수치를 그대로 옮기면 면접에서 바로 갈립니다.';
  }

  /* ── 자체검수 (규격 29장) ────────────────────────────────────────────
     만든 문장을 다시 본다. 부정문은 지나간다. "합격 가능성이 아닙니다" 는
     금지한 결론이 아니라 그 결론을 막는 문장이다. */
  var BANNED = [
    '적합합니다', '잘 맞습니다', '강점을 발휘', '강점이 드러', '경쟁력',
    '역량을 강화', '잠재력', '성장 가능성', '뛰어난', '탁월한', '우수한',
    '종합적으로', '유의미', '시사', '경향을 보', '두드러', '관찰됩니다',
    '효과적으로', '긍정적인 영향', '보는 것이 적절', '현실적입니다', '안전합니다'
  ];
  var NEGATOR = /아니|않|없|못|말고|막/;

  function lint(text) {
    var hits = [];
    String(text).split(/(?<=[.!?])\s+|\n+/).forEach(function (s) {
      if (NEGATOR.test(s)) return;
      BANNED.forEach(function (w) { if (s.indexOf(w) >= 0) hits.push([w, s.slice(0, 60)]); });
    });
    return hits;
  }

  return {
    depth: depth, at: at, say: say, josa: josa,
    POLE: POLE, style: style, stylePair: stylePair,
    fitMeaning: fitMeaning, fitLead: fitLead, groupMeaning: groupMeaning,
    combo: combo, axisHigh: axisHigh, axisLow: axisLow,
    strengthLevel: strengthLevel, quality: quality,
    SAMPLE_TAG: SAMPLE_TAG, sampleNote: sampleNote,
    BANNED: BANNED, lint: lint
  };
})();
