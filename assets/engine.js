/* PCA Platform: 채점 엔진 (Career Matri V2.0 기준)
 *
 * 원칙
 *  - FIT(적합도) / READY(준비도) / EVIDENCE(경험근거)는 서로 분리한다.
 *  - EXPERIENCE 문항은 Career DNA에 가산하지 않고 Evidence에만 사용한다.
 *  - QUICK은 READY / EVIDENCE를 산출하지 않는다.
 *  - MARKET은 설문에서 계산하지 않는다(외부 DB).
 *
 * ── 인수인계 문서(Career_Matri_V2_Handoff.md)와 다르게 구현한 3가지 ────────
 * 아래 CONFIG로 전부 되돌릴 수 있습니다. 기본값을 바꾼 이유는 주석에 적었습니다.
 *  (1) FUTURE 문항(ME065~068)을 Career DNA에서 제외      → futureInDna: false
 *      이유: 같은 문항이 DNA와 READY(FutureWork 25%)에 이중 반영되어
 *            "FIT과 READY는 분리"라는 원칙이 깨집니다.
 *  (2) CONSISTENCY 문항을 Career DNA에서 제외             → consistencyInDna: false
 *      이유: 문서상 신뢰도 플래그 전용 문항입니다. (현재 전부 RESERVE라 미출제)
 *  (3) ME087~092를 EVIDENCE에서 제외                      → applyItemsInEvidence: false
 *      이유: 6문항 모두 "채용공고 분석·PAR 정리·면접 설명" 등 지원준비 문항이고,
 *            PRO READY의 Application Readiness(10%)에 이미 쓰입니다.
 *  (4) FIT 공식                                           → fitMode: 'shape'
 *      'absdiff' = 문서 원안 100 - 평균절대차.
 *      이 방식은 직무 벡터 평균이 72.5~83.6에 몰려 있어 응답 높이가 순위를
 *      좌우합니다(전 문항 낮게 답하면 항상 기계설계가 1위).
 *      'shape' = 개인/직무 벡터를 각각 중심화한 뒤 코사인유사도 → 0~100.
 *      "FIT은 업무방식의 유사성"이라는 제품 정의와 일치하고, 응답 높이의
 *      영향을 받지 않습니다. 원안으로 돌리려면 'absdiff'로 바꾸세요.
 * ────────────────────────────────────────────────────────────────────────── */

window.PCAEngine = (function () {
  'use strict';

  var CONFIG = {
    futureInDna: false,
    consistencyInDna: false,
    applyItemsInEvidence: false,
    fitMode: 'shape',            // 'shape' | 'absdiff'
    readyStandard: { evidence: 0.75, future: 0.25, apply: 0 },
    readyPro:      { evidence: 0.75, future: 0.15, apply: 0.10 },
    /* FIT 의 표준오차. 문항을 복원추출해 다시 채점하는 방식으로 쟀다
       (기계공학과 120문항, 응시자 120명 x 재추출 25회).
       QUICK 12.6 / STANDARD 11.7 / PRO 11.3 이고, 같은 조건에서 1위와
       2위의 FIT 차이는 평균 6~8점이었다. **오차가 차이보다 크다.**
       그래서 1·2·3위를 순위로 내보내면 없는 정밀도를 파는 것이 된다.
       이 값만큼 안에 들어오는 직무는 한 군으로 묶어 내보낸다. */
    fitSe: { QUICK: 12.6, STANDARD: 11.7, PRO: 11.3 },
    engineVersion: '2.0.1-web.1'
  };

  var TIER_ORDER = { QUICK: 1, STANDARD: 2, PRO: 3 };
  var LIKERT_TYPES = ['LIKERT', 'FUTURE', 'CONSISTENCY'];
  var OPTION_TYPES = ['SJT', 'PROBLEM', 'TRADEOFF'];

  function clamp(n, lo, hi) {
    if (lo === undefined) lo = 0;
    if (hi === undefined) hi = 100;
    return Math.max(lo, Math.min(hi, n));
  }
  function r1(n) { return Math.round(n * 10) / 10; }
  function has(arr, v) { return arr.indexOf(v) !== -1; }

  /* 해당 상품에서 출제되는 문항 */
  function questionsFor(major, form) {
    var max = TIER_ORDER[form];
    return major.questions.filter(function (q) {
      return TIER_ORDER[q.tier] && TIER_ORDER[q.tier] <= max;
    });
  }

  /* 특성 점수 계산에 쓰는 문항인지 */
  function countsForDna(q) {
    if (q.type === 'EXPERIENCE') return false;
    if (q.type === 'FUTURE' && !CONFIG.futureInDna) return false;
    if (q.type === 'CONSISTENCY' && !CONFIG.consistencyInDna) return false;
    return has(LIKERT_TYPES, q.type) || has(OPTION_TYPES, q.type);
  }

  /* 문항 집합의 이론적 최소/최대 (정규화 기준) */
  function bounds(qs, dims) {
    var b = {};
    dims.forEach(function (d) { b[d] = { min: 0, max: 0 }; });
    qs.forEach(function (q) {
      if (!countsForDna(q)) return;
      dims.forEach(function (d) {
        if (has(LIKERT_TYPES, q.type)) {
          var w = Math.abs((q.w && q.w[d]) || 0);
          b[d].min += -2 * w;
          b[d].max += 2 * w;
        } else {
          var vals = [];
          for (var k in (q.vec || {})) vals.push(Number((q.vec[k] || {})[d] || 0));
          if (!vals.length) return;
          b[d].min += Math.min.apply(null, vals);
          b[d].max += Math.max.apply(null, vals);
        }
      });
    });
    return b;
  }

  /* 원점수 합산 */
  function raw(qs, answers, dims) {
    var out = {};
    dims.forEach(function (d) { out[d] = 0; });
    qs.forEach(function (q) {
      if (!countsForDna(q)) return;
      var a = answers[q.id];
      if (a === undefined || a === null || a === '') return;
      if (has(LIKERT_TYPES, q.type)) {
        var sig = Number(a) - 3;               // 1..5 → -2..+2
        dims.forEach(function (d) { out[d] += sig * ((q.w && q.w[d]) || 0); });
      } else {
        var vec = (q.vec || {})[String(a)] || {};
        dims.forEach(function (d) { out[d] += Number(vec[d] || 0); });
      }
    });
    return out;
  }

  function normalize(rawScores, b, dims) {
    var out = {};
    dims.forEach(function (d) {
      var lo = b[d].min, hi = b[d].max;
      out[d] = (hi === lo) ? 50 : r1(clamp(((rawScores[d] - lo) / (hi - lo)) * 100));
    });
    return out;
  }

  function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce(function (s, x) { return s + x; }, 0) / arr.length;
  }

  /* FIT */
  function fit(person, job, dims) {
    if (CONFIG.fitMode === 'absdiff') {
      var diff = mean(dims.map(function (d) {
        return Math.abs(Number(person[d]) - Number(job[d]));
      }));
      return r1(clamp(100 - diff));
    }
    // shape: 중심화 후 코사인유사도
    var pm = mean(dims.map(function (d) { return Number(person[d]); }));
    var jm = mean(dims.map(function (d) { return Number(job[d]); }));
    var dot = 0, np = 0, nj = 0;
    dims.forEach(function (d) {
      var p = Number(person[d]) - pm, j = Number(job[d]) - jm;
      dot += p * j; np += p * p; nj += j * j;
    });
    if (np === 0 || nj === 0) return 50;
    var cos = dot / (Math.sqrt(np) * Math.sqrt(nj));
    return r1(clamp(50 + 50 * cos));
  }

  /* EVIDENCE: 직무별 경험문항 가중평균. 근거 문항 수를 함께 반환 */
  function evidence(major, qs, answers, jobCode) {
    var num = 0, den = 0, basis = 0, answered = 0;
    qs.forEach(function (q) {
      if (q.type !== 'EXPERIENCE') return;
      if (!CONFIG.applyItemsInEvidence && q.role === 'APPLY') return;
      var w = Number(((major.evidence_weights || {})[q.id] || {})[jobCode] || 0);
      if (w <= 0) return;
      basis++;
      var a = answers[q.id];
      if (a === undefined || a === null || a === '') return;
      answered++;
      num += clamp((Number(a) / 3) * 100) * w;
      den += w;
    });
    return { score: den ? r1(num / den) : 0, basis: basis, answered: answered };
  }

  /* FutureWork: FUTURE 문항 평균 (0~100) */
  function futureWork(qs, answers) {
    var vals = [];
    qs.forEach(function (q) {
      if (q.type !== 'FUTURE') return;
      var v = Number(answers[q.id]);
      if (v >= 1 && v <= 5) vals.push(((v - 1) / 4) * 100);
    });
    return vals.length ? mean(vals) : 50;
  }

  /* Application Readiness: ME087~092 (PRO 전용) */
  function applyReadiness(qs, answers) {
    var vals = [];
    qs.forEach(function (q) {
      if (q.type !== 'EXPERIENCE' || q.role !== 'APPLY') return;
      var a = answers[q.id];
      if (a === undefined || a === null || a === '') return;
      vals.push(clamp((Number(a) / 3) * 100));
    });
    return vals.length ? mean(vals) : 50;
  }

  function ready(form, ev, fw, ar) {
    if (form === 'QUICK') return null;
    var w = (form === 'PRO') ? CONFIG.readyPro : CONFIG.readyStandard;
    return r1(clamp(w.evidence * ev + w.future * fw + w.apply * ar));
  }

  function gaps(person, job, dims, labels) {
    return dims.map(function (d) {
      return {
        dim: d,
        name: labels[d],
        current: Number(person[d]),
        target: Number(job[d]),
        gap: r1(Math.max(0, Number(job[d]) - Number(person[d])))
      };
    }).sort(function (a, b) { return b.gap - a.gap; });
  }

  /* 응답 일관성 플래그 (출제된 경우에만) */
  function consistencyFlag(qs, answers) {
    var vals = [];
    qs.forEach(function (q) {
      var a = Number(answers[q.id]);
      if (q.type === 'CONSISTENCY' && a >= 1 && a <= 5) vals.push(a);
    });
    if (vals.length < 4) return null;
    var extreme = vals.filter(function (v) { return v === 1 || v === 5; }).length / vals.length;
    return { items: vals.length, extremeRatio: r1(extreme * 100) };
  }

  /* 전 문항 동일응답 / 극단응답 비율: 결과 신뢰도 안내용 */
  function responseQuality(qs, answers) {
    var likert = [], same = {}, extreme = 0;
    qs.forEach(function (q) {
      if (!has(LIKERT_TYPES, q.type)) return;
      var v = Number(answers[q.id]);
      if (!(v >= 1 && v <= 5)) return;
      likert.push(v);
      same[v] = (same[v] || 0) + 1;
      if (v === 1 || v === 5) extreme++;
    });
    if (likert.length < 8) return null;
    var maxSame = 0;
    for (var k in same) maxSame = Math.max(maxSame, same[k]);
    return {
      items: likert.length,
      straightLining: r1((maxSame / likert.length) * 100),
      extremeRatio: r1((extreme / likert.length) * 100)
    };
  }

  /* ── 메인 ─────────────────────────────────────────────── */
  function score(major, form, answers) {
    var dims = major.dna, styleDims = major.style;
    var allDims = dims.concat(styleDims);
    var qs = questionsFor(major, form);

    var b = bounds(qs, allDims);
    var rawScores = raw(qs, answers, allDims);
    var norm = normalize(rawScores, b, allDims);

    var dna = {}, style = {};
    dims.forEach(function (d) { dna[d] = norm[d]; });
    styleDims.forEach(function (d) { style[d] = norm[d]; });

    var fw = futureWork(qs, answers);
    var ar = applyReadiness(qs, answers);

    var rows = major.jobs.map(function (job) {
      var f = fit(dna, job.v, dims);
      var ev = (form === 'QUICK') ? null : evidence(major, qs, answers, job.code);
      return {
        code: job.code,
        name: job.name,
        job: job,
        fit: f,
        evidence: ev ? ev.score : null,
        evidenceBasis: ev ? ev.basis : null,
        ready: ev ? ready(form, ev.score, fw, ar) : null,
        gaps: gaps(dna, job.v, dims, major.dna_labels)
      };
    }).sort(function (a, b2) { return b2.fit - a.fit || b2.fit - a.fit; });

    rows.sort(function (a, b2) { return b2.fit - a.fit; });
    rows.forEach(function (r, i) { r.rank = i + 1; });

    /* 군 나누기. 앞선 군의 머리와 FIT 차이가 표준오차 안이면 같은 군이다.
       머리를 기준으로 재는 것은, 이어 붙이기로 재면 1점씩 스무 번 떨어져도
       전부 한 군이 되기 때문이다. */
    var se = CONFIG.fitSe[form] || 12;
    var lead = rows.length ? rows[0].fit : 0, gno = 1;
    rows.forEach(function (r) {
      if (lead - r.fit > se) { gno += 1; lead = r.fit; }
      r.group = gno;
    });

    // Career Pattern: 상위 2개 특성으로 명명
    var sorted = dims.slice().sort(function (a, b2) { return dna[b2] - dna[a]; });
    var PATTERN = {
      APS: 'ANALYZE', ST: 'STRUCTURE', EI: 'EXPLORE', VP: 'VERIFY',
      OPT: 'OPTIMIZE', DD: 'DATA', EXE: 'EXECUTE', CI: 'INTEGRATE'
    };
    var pattern = PATTERN[sorted[0]] + ' & ' + PATTERN[sorted[1]];

    return {
      product_type: form,
      major_code: major.code,
      career_pattern: pattern,
      career_dna: dna,
      dna_ranked: sorted,
      work_style: style,
      future_work: r1(fw),
      application_readiness: (form === 'PRO') ? r1(ar) : null,
      jobs: rows,
      top_jobs: rows.slice(0, form === 'QUICK' ? 3 : 5),
      /* 이 상품에서 출제된 문항만 센다. 대학원 단계에서는 연구 문항이 같은
         answers 에 함께 들어오는데, 그것까지 세면 "54/28문항 응답" 이 찍힌다. */
      answered: qs.filter(function (q) {
        var a = answers[q.id];
        return a !== undefined && a !== null && a !== '';
      }).length,
      question_count: qs.length,
      fit_se: se,
      group_size: rows.filter(function (r) { return r.group === 1; }).length,
      quality: responseQuality(qs, answers),
      consistency: consistencyFlag(qs, answers),
      config: {
        fitMode: CONFIG.fitMode,
        futureInDna: CONFIG.futureInDna,
        applyItemsInEvidence: CONFIG.applyItemsInEvidence
      },
      versions: {
        question_bank: major.question_bank_version,
        job_matrix: major.job_matrix_version,
        market_db: null,
        scoring_engine: CONFIG.engineVersion
      }
    };
  }

  /* GRAD: 연구 역량 8축. 직무 적합도와 같은 방식으로 이론적 최소·최대에
     맞춰 0~100 으로 옮긴다. 축마다 몇 문항으로 잰 값인지 함께 돌려주는 것은,
     두 문항으로 잰 축과 다섯 문항으로 잰 축을 같은 무게로 읽으면 안 되기
     때문이다. 화면이 그 숫자를 같이 적는다. */
  function scoreGrad(bank, answers) {
    if (!bank || !bank.items || !bank.items.length) return null;
    var per = {}, out = {}, n = {}, answered = 0;
    bank.dims.forEach(function (d) { per[d.code] = { lo: 0, hi: 0, raw: 0 }; n[d.code] = 0; });
    bank.items.forEach(function (it) {
      var p = per[it.dim]; if (!p) return;
      n[it.dim] += 1;
      var a = answers[it.id];
      var has = !(a === undefined || a === null || a === '');
      if (has) answered += 1;
      if (it.type === 'EXPERIENCE') {          /* 0~3 */
        p.lo += 0; p.hi += 3 * it.w;
        if (has) p.raw += Number(a) * it.w;
      } else {                                  /* 1~5 → -2~+2 */
        p.lo += -2 * it.w; p.hi += 2 * it.w;
        if (has) p.raw += (Number(a) - 3) * it.w;
      }
    });
    bank.dims.forEach(function (d) {
      var p = per[d.code];
      out[d.code] = (p.hi === p.lo) ? 50 : r1(clamp(((p.raw - p.lo) / (p.hi - p.lo)) * 100));
    });
    var ranked = bank.dims.map(function (d) { return d.code; })
      .sort(function (a, b) { return out[b] - out[a]; });
    return {
      version: bank.version, scores: out, items: n, ranked: ranked,
      answered: answered, item_count: bank.items.length,
      pending_items: (bank.pending || []).length
    };
  }

  return {
    CONFIG: CONFIG,
    questionsFor: questionsFor,
    score: score,
    scoreGrad: scoreGrad,
    clamp: clamp
  };
})();
