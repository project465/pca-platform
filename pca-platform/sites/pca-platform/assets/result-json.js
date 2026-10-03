/* 채점 결과를 결과지가 읽는 한 가지 모양으로 옮긴다.
 *
 * **여기서 점수를 만들지 않는다.** engine.js 가 낸 값을 자리만 바꿔 담는다.
 * 그래서 산식을 고치지 않고도 문장 쪽을 통째로 갈 수 있고, 반대로 문장을
 * 고쳐도 점수가 흔들리지 않는다.
 *
 * 모양은 마스터 문체 규격 19장의 표준 JSON 을 따른다. 우리가 재지 않는 칸은
 * 비워 둔다. **비운 칸을 채우지 않는 것이 이 파일의 절반**이다: 경험·프로젝트·
 * 자격은 응시자에게 묻지 않았으므로 빈 배열로 나가고, 문장 쪽은 그 빈 배열을
 * 보고 "지금 자료로는 거기까지 말할 수 없다" 고 적는다.
 */
window.PCAResultJSON = (function () {
  'use strict';

  var LEVEL = { QUICK: 'basic', STANDARD: 'standard', PRO: 'pro' };
  var SCHEMA_VERSION = '3.0';

  /* 직무 코드 → 직무군. 어느 나라 이름에도 기대지 않는 내부 id 와, 공고에서
     찾을 때 쓰는 영문 이름이 여기 붙는다. 외부 분류 코드는 공식 crosswalk
     파일로 대조하기 전까지 결과지 본문에 내보내지 않는다. */
  var FAMILY = (window.PCA_FAMILIES && window.PCA_FAMILIES.ME) || null;
  function familyOf(jobCode) {
    if (!FAMILY) return null;
    for (var i = 0; i < FAMILY.families.length; i++) {
      if (FAMILY.families[i].job_code === jobCode) return FAMILY.families[i];
    }
    return null;
  }

  /* 상품마다 쓸 수 있는 절. 레벨 조절을 문장 안에서 하지 않고 여기서 한다
     (규격 17장). 화면이 절을 고를 때도 이 목록을 본다. */
  var SECTIONS = {
    basic: ['fit', 'axes', 'style', 'job', 'why', 'quality',
            'resume', 'interview', 'jd', 'path', 'switch', 'course', 'cert', 'next'],
    standard: ['fit', 'axes', 'style', 'job', 'why', 'quality', 'scene', 'ready',
               'evidence', 'gap', 'project', 'resume', 'interview', 'jd', 'path',
               'switch', 'course', 'cert', 'next'],
    pro: ['fit', 'axes', 'style', 'job', 'why', 'quality', 'scene', 'ready',
          'evidence', 'gap', 'project', 'portfolio', 'resume', 'interview', 'jd',
          'path', 'switch', 'course', 'cert', 'industry', 'venture', 'next']
  };

  /* 어떤 경우에도 쓰지 않는 결론. 자체검수가 이 목록을 그대로 쓴다. */
  var FORBIDDEN = [
    '이 직무에 적합합니다', '합격 가능성', '성공 가능성', '추천 직무',
    '강점을 발휘합니다', '경쟁력', '잠재력', '뛰어난 역량'
  ];

  function r1(n) { return Math.round(n * 10) / 10; }

  /* 0~100 을 낮음·중간·높음으로. 경계는 셋으로 나눈 자리 그대로다.
     규준이 없으므로 "상위 몇 %" 는 쓰지 않는다. */
  function band(v) { return v >= 62 ? 'high' : (v <= 38 ? 'low' : 'mid'); }

  /* 직무가 기대는 축. 요구 벡터에서 높은 쪽 셋을 이름으로 돌려준다.
     요구값 자체는 담지 않는다. 그 표는 STANDARD 의 격차 절이 판다. */
  function evidenceAxes(job, major) {
    var v = job.v || {};
    return (major.dna || []).slice()
      .sort(function (a, b) { return (v[b] || 0) - (v[a] || 0); })
      .slice(0, 3)
      .map(function (d) { return (major.dna_labels || {})[d] || d; });
  }

  /* 이 직무를 읽을 때 조심할 것. 전부 채점에서 나온 사실이다. */
  function limits(row, r) {
    var out = [];
    if (r.group_size > 1 && row.group === 1) {
      out.push('같은 군에 직무가 ' + r.group_size + '개 있어 이 안에서는 순서를 가르지 않습니다');
    }
    if (row.evidence === null) {
      out.push('이 상품은 경험 근거를 묻지 않아 준비도는 계산하지 않습니다');
    }
    return out;
  }

  /* 업무 성향. 엔진은 축 셋(IC·CS·SQ)을 한 값으로 내고, 값이 높을수록
     앞쪽 극이다. 규격 19장은 여섯 칸을 쓰므로 양쪽 극으로 펴서 담는다.
     **펴는 것이지 새로 재는 것이 아니다**: 둘을 더하면 항상 100 이다. */
  function workStyle(r, major) {
    var s = r.work_style || {}, L = major.style_labels || {}, out = {};
    var KEY = {
      IC: ['independent', 'collaborative'],
      CS: ['challenge', 'stability'],
      SQ: ['speed', 'quality']
    };
    (major.style || []).forEach(function (d) {
      var k = KEY[d]; if (!k) return;
      out[k[0]] = r1(s[d]);
      out[k[1]] = r1(100 - s[d]);
    });
    out.axes = (major.style || []).map(function (d) {
      return {
        code: d, score: r1(s[d]),
        poles: (L[d] || [d, d]).slice(),
        leaning: s[d] >= 50 ? (L[d] || [])[0] : (L[d] || [])[1],
        margin: r1(Math.abs(s[d] - 50))
      };
    });
    return out;
  }

  function traitAxes(r, major) {
    var desc = major.dna_desc || {};
    return (major.dna || []).map(function (d) {
      var v = r.career_dna[d];
      return {
        code: d,
        name: (major.dna_labels || {})[d] || d,
        score: r1(v),
        level: band(v),
        rank: r.dna_ranked.indexOf(d) + 1,
        definition: desc[d] || null
      };
    });
  }

  /* 관심·경험·학습의향. 검사가 재는 것은 "무엇을 하고 싶은가" 이므로
     FIT 을 관심 쪽에 둔다. 경험은 증거 문항에서만 오고(QUICK 은 없다),
     학습의향은 FUTURE 문항이다. **세 값의 출처가 다르다는 것이 요점**이고,
     그래서 조합을 읽는 규칙(규격 6장)이 성립한다. */
  function interestExperience(r) {
    var fw = r.future_work;
    return r.jobs.map(function (j) {
      return {
        domain: j.name,
        interest: r1(j.fit),
        experience: j.evidence === null ? null : r1(j.evidence),
        learning_intent: fw === null || fw === undefined ? null : r1(fw)
      };
    });
  }

  function jobReference(job) {
    var jd = job.jd || {};
    return {
      actual_tasks: (job.tasks || []).slice(),
      common_requirements: (job.criteria || []).slice(),
      tools: (job.keywords || []).slice(),
      outputs: (job.scenes || []).slice(),
      education_requirements: [],      /* 직무 DB 에 없다. 지어내지 않는다 */
      industry_differences: (jd.watch || []).slice(),
      posting_names: (jd.names || []).slice()
    };
  }

  /* 측정 오차와 정보량은 다른 값이다.
     measurement_error 는 문항으로 잰 통계값이고, information_coverage 는
     응시자에 대해 우리가 **얼마나 알고 있는가**다. 둘을 한 칸에 담으면
     "자료가 적어서 넓은 구간" 과 "문항이 적어서 넓은 구간" 이 구별되지 않는다. */
  function coverage(r, S, ev, rpList, tgt) {
    var missing = [];
    if (!(S && S.stage)) missing.push('학위 단계');
    if (!((S && S.targetCountry) || (tgt && tgt.target_country))) missing.push('목표 국가');
    var e = ev || {};
    if (!((e.projects || []).length + (e.research || []).length + (rpList || []).length)) {
      missing.push('프로젝트·연구 경험');
    }
    if (!(e.tools || []).length) missing.push('사용해 본 도구');
    if (!(e.coursework || []).length) missing.push('수강 과목');
    if (r.product_type === 'QUICK') missing.push('경험 근거 문항(STANDARD 이상)');
    var answeredAll = r.question_count && r.answered === r.question_count;
    var level = missing.length <= 2 && answeredAll ? 'high'
      : (missing.length <= 4 && answeredAll ? 'medium' : 'low');
    return {
      level: level,
      /* 왜 그 수준인지를 적는다. 수준만 적으면 고칠 데를 모른다 */
      reasons: [r.answered + '/' + r.question_count + '문항 응답'].concat(
        missing.map(function (m) { return m + ' 없음'; })),
      missing_fields: missing
    };
  }

  function build(r, major, S) {
    /* 경험은 **채점 뒤에** 붙는다. 넣어도 r 의 값은 하나도 바뀌지 않는다.
       바뀌는 것은 준비 정도와 경험 지도와 그 뒤로 이어지는 절들이다. */
    var EVm = window.PCAEvidence;
    var evRaw = EVm ? EVm.loadEvidence() : null;
    var rpList = EVm ? EVm.loadResearch() : [];
    var tgt = EVm ? EVm.loadTarget() : null;
    var hasEv = EVm ? EVm.has(evRaw, rpList) : false;
    var level = LEVEL[r.product_type] || 'basic';
    var q = r.quality || {};
    var paid = level !== 'basic';

    var stage = window.PCAStage ? window.PCAStage.of((S && S.stage) || '') : null;
    var ctry = window.PCACountry
      ? window.PCACountry.profile((S && S.targetCountry) ||
          (tgt && tgt.target_country) || null) : null;

    var out = {
      schema_version: SCHEMA_VERSION,
      report_level: level,
      report_language: 'ko',
      profile: {
        major_id: major.code,
        major_name: major.name || major.code,
        /* 화면이 쓰는 다섯 단계와 규격이 쓰는 네 단계를 둘 다 담는다.
           하나만 담으면 다음 사람이 어느 쪽으로 읽을지 모른다. */
        stage_code: (S && S.stage) || null,
        education_stage: stage ? stage.id : null,
        education_detail: { year: null, thesis_topic: null, research_field: null },
        /* 국적은 받지 않는다. 받아도 적합도에 넣지 않는다. */
        citizenship_country: null,
        current_country: null,
        target_country: (S && S.targetCountry) || (tgt && tgt.target_country) || null,
        target_region: null,
        target_industries: (tgt && tgt.target_industries) || [],
        target_roles: (tgt && tgt.target_roles) || [],
        work_authorization_status: null
      },
      /* 아래 user 는 예전 모양이다. 화면이 아직 보고 있어 남겨 둔다. */
      user: {
        name: (S && S.name) || null,
        major: major.name || major.code,
        education_level: (S && S.stage) || null,
        target_industry: [],
        target_jobs: []
      },
      assessment: {
        version: (r.versions || {}).scoring_engine || null,
        item_count: r.question_count,
        answered: r.answered,
        measurement_error: r.fit_se,
        response_quality: {
          completion_rate: r.question_count
            ? r1((r.answered / r.question_count) * 100) : 0,
          consistency: q.extremeRatio === undefined ? null : r1(100 - q.extremeRatio),
          same_answer_ratio: q.straightLining === undefined ? null : r1(q.straightLining),
          note: null
        }
      },
      job_fit: r.jobs.map(function (j) {
        var fam = familyOf(j.code);
        return {
          job: j.name,
          code: j.code,
          career_family_id: fam ? fam.career_family_id : null,
          name_en: fam ? fam.name_en : null,
          /* 직무 이름은 회사마다 다르다. "당신의 직함" 이 아니라
             "찾아볼 이름" 으로 내보낸다(규격 17장). */
          search_titles_en: fam ? fam.search_titles_en.slice() : [],
          fit: r1(j.fit),
          group: j.group,
          rank: j.rank,
          job_definition: (j.job || {}).field || null,
          evidence_axes: evidenceAxes(j.job || {}, major),
          limitations: limits(j, r),
          ready: j.ready === null ? null : r1(j.ready),
          evidence: j.evidence === null ? null : r1(j.evidence),
          gaps: paid ? (j.gaps || []).slice(0, 3) : []
        };
      }),
      work_style: workStyle(r, major),
      trait_axes: traitAxes(r, major),
      interest_experience: interestExperience(r),
      /* 응시자가 낸 것만 담는다. 안 낸 칸은 빈 배열이고, 문장 쪽이 그 사실을
         그대로 적는다. **빈칸을 채워 넣지 않는다**(규격 20·48장). */
      evidence: EVm ? EVm.normalize(evRaw, rpList) : {
        coursework: [], projects: [], research: [], internships: [], employment: [],
        tools: [], methods: [], publications: [], patents: [], presentations: [],
        awards: [], certifications: [], leadership: [], mentoring: [], outputs: []
      },
      evidence_supplied: hasEv,
      /* 연구 과제는 응시자가 적은 그대로 담는다. 금액도 인원도 지어내지 않는다. */
      research_projects: rpList,
      research_maturity: window.PCAReadiness ? window.PCAReadiness.maturity(rpList) : null,
      job_reference: jobReference((r.jobs[0] || {}).job || {}),
      generation_constraints: {
        max_section_words: level === 'basic' ? 120 : (level === 'standard' ? 260 : 420),
        allowed_sections: SECTIONS[level].slice(),
        forbidden_claims: FORBIDDEN.slice()
      },
      /* 적합도·경험·학습의향을 하나로 합치지 않는다. 합치면 "커리어 점수"
         하나가 되고, 그 숫자는 아무것도 뜻하지 않는다(규격 8·35장). */
      career_family_candidates: r.jobs.map(function (j) {
        var fam = familyOf(j.code);
        return {
          career_family_id: fam ? fam.career_family_id : j.code,
          work_mode_fit: r1(j.fit),
          fit_group: j.group,
          fit_rank: j.rank,
          interest: r1(j.fit),
          experience: j.evidence === null ? null : r1(j.evidence),
          learning_intent: r.future_work === null || r.future_work === undefined
            ? null : r1(r.future_work),
          /* 경험 기반 준비 정도. 문항이 재는 READY 와 다른 값이라 따로 담는다. */
          evidence_readiness: null,
          /* 문항으로 잰 준비도. 경험을 넣어도 이 값은 바뀌지 않는다. */
          item_readiness: j.ready === null ? null : r1(j.ready),
          reasons: evidenceAxes(j.job || {}, major)
        };
      }),
      /* 통계로 잰 오차와, 우리가 아는 것이 얼마나 되는가는 다른 값이다. */
      information_coverage: coverage(r, S, EVm ? EVm.normalize(evRaw, rpList) : null, rpList, tgt),
      /* 학위 단계가 바꾸는 것은 질문과 기대하는 근거이지 점수가 아니다. */
      education_stage_lens: stage ? {
        id: stage.id, label: stage.label, question: stage.question,
        evidence: stage.evidence.slice(), deemphasize: stage.deemphasize.slice(),
        answers: stage.answers.slice(), now: stage.now
      } : null,
      /* 나라별 내용은 확인된 자료가 있을 때만 나간다. */
      country_context: ctry,
      /* 화면이 쓰는 꼬리표. 규격에 없는 칸이라 아래로 모았다. */
      _meta: {
        evidence_raw: evRaw,
        product_type: r.product_type,
        group_size: r.group_size,
        grad: r.grad ? { ranked: r.grad.ranked, scores: r.grad.scores } : null
      }
    };

    /* 준비 정도는 **경험에서만** 나온다. 경험이 없으면 비워 두고, 문장 쪽이
       "지금 자료로는 말할 수 없다" 로 받는다. 점수를 추측해 채우지 않는다. */
    if (hasEv && window.PCAReadiness) {
      var rd = window.PCAReadiness.all(out, evRaw, rpList);
      if (rd) {
        out.career_family_candidates.forEach(function (c2) {
          var x = rd[c2.career_family_id];
          if (x) c2.evidence_readiness = { level: x.level, supported_by: x.supported_by, missing: x.missing };
        });
        out.job_fit.forEach(function (f2) {
          var x = rd[f2.career_family_id];
          if (x) f2.evidence_readiness = { level: x.level, supported_by: x.supported_by, missing: x.missing };
        });
      }
    }
    return out;
  }

  return { build: build, SECTIONS: SECTIONS, FORBIDDEN: FORBIDDEN, band: band };
})();
