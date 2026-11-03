/**
 * MAT 브리핑 검사와 캡처가 함께 쓰는 기계공학 공고 셋.
 *
 * **지어낸 회사 이름을 쓰지 않는다.** 공고 이름은 학생이 붙이는 이름처럼
 * `OO` 로 가린다. 본문은 기계 신입 공고에 흔히 적히는 문장들이다.
 *
 * `seedMatStudent` 는 시험 사람 하나를 만든다(로컬·staging 전용): 기계공학
 * 결과 · 기간권 · 경험 셋 · 공고 셋. 공고는 규칙으로 읽는다(AI 동의가 없다).
 */
import { makeStudent } from "./_loop-fixture";
import { query, queryOne } from "../src/lib/db";
import { analyzePosting } from "../src/lib/assistant/posting";
import { addExperience } from "../src/lib/me-v3/platform";

export const ME_POSTINGS: { label: string; days: number; text: string }[] = [
  {
    label: "OO기계 기구설계 신입",
    days: 3,
    text: `[신입] 자동화 장비 기구설계
담당 업무
- 자동화 장비 기구 설계 및 3D CAD 모델링
- 구조 해석(FEA)으로 프레임 강성 검토
- 시제품 시험 및 측정 데이터 정리
자격 요건
- 기계공학 학사 이상
- 3D CAD 활용 능력
- 구조 해석 결과를 보고서로 정리할 수 있는 분
우대 사항
- 공차 해석 경험 우대
- 진동 측정 경험 우대`,
  },
  {
    label: "OO자동차부품 구조해석",
    days: 9,
    text: `[신입] 차량 부품 구조해석 엔지니어
주요 업무
- 차량 부품 구조 해석 및 내구 수명 예측
- 시험 결과와 해석 결과 비교 검증
- 설계 부서에 설계 변경 제안
자격 요건
- 기계공학 전공 학사 이상
- 유한요소 해석 툴 사용 경험
- 재료 강도 및 파손 이론 이해
우대 사항
- 기구 설계 및 도면 작성 경험 우대`,
  },
  {
    label: "OO중공업 생산기술",
    days: 20,
    text: `[신입] 생산기술 엔지니어
담당 업무
- 양산 라인 공정 개선 및 작업 표준 작성
- 설비 구조 검토와 강도 해석
- 시험 계측 데이터로 불량 원인 분석
자격 요건
- 기계 관련 학과 졸업(예정)자
- 구조 해석 또는 강도 계산 경험
- 기구 설계 도면 해독 능력
우대 사항
- 품질 관리 경험 우대`,
  },
];

/** 끝낸 기계공학 응시 하나를 베껴 둔다. `cloneFinished` 와 같고 전공만 고정한다 */
async function cloneMe(userId: string): Promise<string | null> {
  const src = await queryOne<{ id: string }>(
    `SELECT a.id::text FROM v3_attempts a JOIN v3_snapshots s ON s.attempt_id = a.id
      WHERE a.user_id <> $1 AND a.status = 'scored' AND a.core_code = 'ME_CORE_V3'
        AND a.tier = 'PRO' AND s.result_model IS NOT NULL
      ORDER BY s.created_at DESC LIMIT 1`, [userId]);
  if (!src) return null;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO v3_attempts
       (user_id, tier, core_code, market_code, education_stage, grad_field,
        assessment_version, item_bank_version, scoring_version, status,
        current_screen, opened_probe, opened_deep, fourth_reason,
        industry_pack, role_pack, started_at, last_saved_at, submitted_at,
        undergrad_core, industry_interest, role_interest, org_interest)
     SELECT $1, tier, core_code, market_code, education_stage, grad_field,
            assessment_version, item_bank_version, scoring_version, status,
            current_screen, opened_probe, opened_deep, fourth_reason,
            industry_pack, role_pack, started_at, last_saved_at, submitted_at,
            undergrad_core, industry_interest, role_interest, org_interest
       FROM v3_attempts WHERE id = $2::bigint RETURNING id::text`, [userId, src.id]);
  const id = row?.id;
  if (!id) return null;
  await query(`INSERT INTO v3_responses (attempt_id, item_id, kind, value_int, value_text, answered_at, note_text)
               SELECT $1::bigint, item_id, kind, value_int, value_text, answered_at, note_text
                 FROM v3_responses WHERE attempt_id = $2::bigint`, [id, src.id]);
  await query(`INSERT INTO v3_evidence_picks (attempt_id, domain_code, slot, item_text)
               SELECT $1::bigint, domain_code, slot, item_text FROM v3_evidence_picks WHERE attempt_id = $2::bigint`, [id, src.id]);
  await query(`INSERT INTO v3_snapshots (attempt_id, module_versions, response_quality, payload, result_model,
                                         result_model_version, result_copy_version)
               SELECT $1::bigint, module_versions, response_quality, payload, result_model,
                      result_model_version, result_copy_version FROM v3_snapshots WHERE attempt_id = $2::bigint`, [id, src.id]);
  await query(`UPDATE v3_snapshots SET result_model = jsonb_set(result_model, '{attempt_id}', to_jsonb($1::text))
                WHERE attempt_id = $2::bigint AND result_model IS NOT NULL`, [id, id]);
  return id;
}

/** 시험 사람 하나. 기계공학 결과 · 기간권 · 경험 셋 · 공고 셋 */
export async function seedMatStudent(login: string): Promise<{ id: string; pw: string; postings: string[] }> {
  const old = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id = $1`, [login]);
  if (old) {
    for (const t of ["assistant_nudges", "assistant_postings", "assistant_drafts", "assistant_settings"]) {
      await query(`DELETE FROM ${t} WHERE user_id = $1`, [old.id]).catch(() => undefined);
    }
  }
  const u = await makeStudent(login);
  await cloneMe(u.id);
  await query(`INSERT INTO entitlements (user_id, product_code, kind, status, starts_at, ends_at)
               VALUES ($1,'TRACK_30D','track','active',now(),now()+interval '30 days')`, [u.id]);
  await addExperience(u.id, {
    kind: "capstone", title: "캡스톤디자인: 소형 컨베이어 구동부 설계와 시제품 제작",
    td_codes: ["TD01"], axis_codes: ["J1", "J3", "J5"],
    problems: ["설계 범위와 다루지 않을 것을 적었다"],
    decisions: ["하중과 재질을 근거로 두께나 단면을 정했다"],
    artifacts: ["조립도", "부품도"], verifications: [],
  });
  await addExperience(u.id, {
    kind: "assignment", title: "유한요소해석 과제: 브래킷 응력 해석",
    td_codes: ["TD02"], axis_codes: ["J1", "J3", "J6"],
    problems: ["어떤 하중 조건과 현상을 볼지 정했다"],
    decisions: ["구속 조건과 하중 작용점을 정했다"],
    artifacts: ["해석 보고서"], verifications: ["손계산"],
  });
  await addExperience(u.id, {
    kind: "course", title: "기계공작실습: 선반 가공 부품 치수 측정과 불량 원인 기록",
    td_codes: ["TD07"], axis_codes: ["J6"],
    decisions: [], artifacts: ["시험 성적서"], verifications: ["반복 측정"],
  });
  const kst = new Date(Date.now() + 9 * 3600_000);
  const ids: string[] = [];
  for (const p of ME_POSTINGS) {
    const d = new Date(kst.getTime() + p.days * 86400_000).toISOString().slice(0, 10);
    ids.push((await analyzePosting(u.id, { label: p.label, text: p.text, deadline: d })).id);
  }
  return { id: u.id, pw: u.pw, postings: ids };
}

