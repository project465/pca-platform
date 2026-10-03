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
    var rows = window.PCAV2Decision.table(v2, v2.families, readiness);

    var stage = window.PCAStage ? window.PCAStage.of(S.stage || '') : null;
    var ctry = window.PCACountry
      ? window.PCACountry.profile((tgt && tgt.target_country) || null) : null;

    return {
      schema_version: '3.0',
      assessment_version: v2.assessment_version,
      legacy_version: v2.legacy_version,
      report_level: LEVEL[v2.tier] || 'basic',
      report_language: 'ko',
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
      organization_context: null,
      value_path: null,
      performance_evidence: [],
      _meta: { evidence_raw: evRaw, tier: v2.tier }
    };
  }

  return { build: build };
})();
