/* ME_V2 결과를 결과지가 읽는 한 가지 모양으로 옮긴다.
 *
 * **여기서 점수를 만들지 않는다.** `v2-scoring.js` 가 낸 값을 자리만 바꿔
 * 담고, 경험은 그 뒤에 붙인다. 경험을 고쳐도 관심·경험·결정 소유·업무 방식·
 * 학습 의향은 한 값도 바뀌지 않는다.
 *
 * **합쳐 놓은 점수를 만들지 않는다.** 종합 적합도·Career Score·
 * Employability Score 같은 칸은 없다. 다섯을 평균 내면 숫자 하나가 남고
 * 그 숫자로는 무엇을 할지 알 수 없다.
 */
window.PCAV2ResultJSON = (function () {
  'use strict';

  var LEVEL = { BASIC: 'basic', STANDARD: 'standard', PRO: 'pro' };

  function build(v2, S) {
    var EVm = window.PCAEvidence;
    var evRaw = EVm ? EVm.loadEvidence() : null;
    var rpList = EVm ? EVm.loadResearch() : [];
    var tgt = EVm ? EVm.loadTarget() : null;
    var hasEv = EVm ? EVm.has(evRaw, rpList) : false;

    /* 증거 준비도는 경험에서만 나온다. 없으면 비워 두고 문장 쪽이 받는다. */
    var readiness = null;
    if (hasEv && window.PCAReadiness) {
      readiness = window.PCAReadiness.all(
        { job_fit: v2.families.map(function (f) { return { career_family_id: f }; }) },
        evRaw, rpList);
    }
    /* ── 전공과 경험을 조직의 성과로 옮긴다 ─────────────────────────
       여기서도 점수를 만들지 않는다. 사슬과 단계와 근거만 나온다. */
    var VE = window.PCAValue;
    var exps = VE ? VE.experiences(evRaw, rpList) : [];
    var toolEv = VE ? VE.toolEvidence(evRaw, exps) : [];
    var orgCtx = VE ? VE.organizationContext(tgt) : null;
    var orgPick = (tgt && tgt.target_org_type) || null;

    /* ValuePath 는 상위 직무군에만 만든다. 열여섯을 전부 그리면 읽는
       사람이 어디를 볼지 모른다. 상품마다 깊이가 다르다 */
    var topN = v2.tier === 'PRO' ? 6 : (v2.tier === 'STANDARD' ? 4 : 3);
    var order = window.PCAV2Decision.table(v2, v2.families, readiness)
      .map(function (r) { return r.career_family_id; });
    var paths = {};
    if (VE) {
      order.slice(0, topN).forEach(function (fid) {
        /* 조직을 안 고르셨으면 그 직무가 실제로 가는 자리 가운데 첫 번째를
           기본으로 쓴다. 지어낸 기관이 아니라 유형이다 */
        var fam = VE.vpById(fid);
        var fallback = fam ? Object.keys(fam.org_variants || {})[0] : null;
        var p = VE.valuePath(fid, orgPick || fallback, evRaw, exps, toolEv);
        if (p) {
          p.organization_type_is_default = !orgPick;
          paths[fid] = p;
        }
      });
    }
    var ladder = VE ? VE.ladderByFamily(paths) : null;

    /* ── 직무가 바라는 증거를 얼마나 넓게 확인했는가 ───────────────
       사다리(깊이)와 합치지 않는다. 깊이는 경험 하나가 얼마나 멀리
       갔는가이고, 여기는 그 직무의 영역을 얼마나 덮었는가다. */
    var CV = window.PCACoverage;
    var covered = CV ? CV.all(order, exps, toolEv, evRaw) : null;
    var ready = {};
    if (CV && covered) {
      Object.keys(covered).forEach(function (fid) {
        ready[fid] = CV.applicationReady(covered[fid], exps);
      });
    }

    /* 문항이 낸 판정을 증거 범위로 한 번 더 거른다. 올리는 쪽으로만
       거르고, 경험을 아직 안 적으신 분은 깎지 않는다 */
    var rows = window.PCAV2Decision.table(v2, v2.families, readiness,
      covered, ready, hasEv);

    var stage = window.PCAStage ? window.PCAStage.of(S.stage || '') : null;
    var ctry = window.PCACountry
      ? window.PCACountry.profile((tgt && tgt.target_country) || null) : null;

    return {
      schema_version: '3.0',
      assessment_version: v2.assessment_version,
      legacy_version: v2.legacy_version,
      report_level: LEVEL[v2.tier] || 'basic',
      /* **언어를 못 박지 않는다.** 결과 객체 하나가 두 언어로 그려지므로
         이 칸도 그때 그린 언어를 적어야 한다. 스냅샷이 이 값을 그대로
         들고 가고, 영어로 뽑은 결과지가 'ko' 라고 적혀 있으면 되짚을 수 없다 */
      report_language: (window.PCAI18N ? window.PCAI18N.lang() : 'ko'),
      profile: {
        major_id: 'ME', major_name: '기계공학과',
        name: (S.profile && S.profile.name) || null,
        education_stage: v2.education_stage,
        /* 국적은 받지 않는다. 받아도 결과에 넣지 않는다. */
        citizenship_country: null, current_country: null,
        target_country: (tgt && tgt.target_country) || null,
        target_industries: (tgt && tgt.target_industries) || [],
        target_roles: (tgt && tgt.target_roles) || []
      },
      assessment: {
        version: v2.assessment_version,
        item_count: v2.item_count,
        answered: v2.answered,
        /* V2 는 아직 검증 전이라 측정오차를 내지 않는다. 숫자를 지어내는
           것보다 없다고 적는 쪽이 낫다. */
        measurement_error: null,
        measurement_note: '파일럿 검증 전이라 측정 오차를 산출하지 않습니다.'
      },
      /* ── 다섯을 따로 담는다 ─────────────────────────────────────── */
      actual_work_interest: v2.actual_work_interest,
      exposure: v2.exposure,
      decision_ownership: v2.decision_ownership,
      work_mode: v2.work_mode,
      learning_intent: v2.learning_intent,
      research_project_evidence: v2.research_project_evidence,
      evidence_quality: v2.evidence_quality,
      /* 맥락. 점수에 들어가지 않는다 */
      career_path_preferences: v2.career_path_preferences,
      decision_constraints: v2.career_path_preferences,
      /* 결정 표. 첫 화면이 이것을 그린다 */
      decision_table: rows,
      /* 경험 */
      evidence: EVm ? EVm.normalize(evRaw, rpList) : null,
      evidence_supplied: hasEv,
      research_projects: rpList,
      research_maturity: window.PCAReadiness ? window.PCAReadiness.maturity(rpList) : null,
      education_stage_lens: stage ? {
        id: stage.id, label: stage.label, question: stage.question,
        evidence: stage.evidence.slice(), deemphasize: stage.deemphasize.slice(),
        answers: stage.answers.slice(), now: stage.now
      } : null,
      country_context: ctry,
      /* ── 다음에 붙일 자리. 지금은 비어 있다고 적어 둔다 ──────────────
         규격 29~64장(조직 가치 다리)이 여기로 들어온다. 비워 두는 것과
         없는 것은 다르므로 칸을 먼저 만들어 둔다. */
      /* ── 조직 가치 번역 ─────────────────────────────────────────── */
      organization_context: orgCtx,
      value_path: {
        note: '같은 전공과 같은 경험이라도 조직이 결과로 치는 것이 다릅니다. ' +
          '적합도는 조직을 바꿔도 그대로입니다.',
        selected_organization_type: orgPick,
        order: order.slice(0, topN),
        paths: paths
      },
      performance_evidence: VE ? VE.performanceEvidence(exps) : [],
      /* 깊이와 범위를 **따로** 담는다. 한 칸에 넣으면 둘이 섞여 읽힌다 */
      evidence_depth: ladder,
      role_evidence_coverage: covered,
      application_evidence: ready,
      evidence_map_version: (window.PCA_EVIDENCE_MAP || {}).schema_version || null,
      tool_evidence: toolEv,
      evidence_ladder: VE ? VE.LADDER : [],
      repeatability: VE ? VE.repeatability(exps, evRaw) : null,
      untranslated_evidence: (exps || []).filter(function (x) {
        return !x.top || window.PCAValue.LV[x.top.id] < 3;
      }).map(function (x) {
        return {
          experience_id: x.id, title: x.title || '(제목 없음)',
          confirmed_up_to: x.top ? { id: x.top.id, name: x.top.name } : null,
          next_rung: x.next ? x.next.name : null,
          follow_up: x.next ? x.next.questions : []
        };
      }),
      _meta: { evidence_raw: evRaw, tier: v2.tier }
    };
  }

  return { build: build };
})();
