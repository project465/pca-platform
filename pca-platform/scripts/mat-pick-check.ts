/**
 * **MAT 공고 고르기 점검**(2026-11-06 대표: 전주대 인공지능학과 추천에 무관 공고가 섞인다).
 *
 *   npm run mat:pick
 *
 * 인공지능 전공(AI_CORE_V1) 예시 계정 하나와 예시 공고 다섯으로 `pickJobs` 를 돌린다. 로컬 DB 에서만.
 * - 제목이 인공지능 직무인 공고 둘은 내 전공 공고(main)에 선다
 * - 본문 낱말로만 인공지능에 단 공고(임상 데이터 관리 · 화학 분석 · 바이오 시료)는 어느 묶음에도 서지 않는다
 * 예시 계정 · 공고는 끝나면 지운다.
 */
import { loadEnv } from "./_loop-fixture";

loadEnv();
let bad = 0;
const ok = (n: string, c: boolean, d = "") => { if (!c) bad += 1; console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`); };

(async () => {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error("로컬 DB 에서만 돈다");
  const { query, queryOne } = await import("../src/lib/db");
  const { pickJobs } = await import("../src/lib/mat/pick-jobs");
  const tag = `zzpick${Date.now().toString(36)}`;
  const u = (await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, is_demo, must_reset_pw)
     VALUES ($1, $1, '예시', 'x', 'active', 'ko', TRUE, FALSE) RETURNING id::text`, [`${tag}@example.test`]))!.id;
  await query(`INSERT INTO career_profiles (user_id, core_code, market_code) VALUES ($1, 'AI_CORE_V1', 'KR')`, [u]);
  const ids: string[] = [];
  const add = async (ref: string, title: string, req: string[], core: string | null, note: string) => {
    const r = await queryOne<{ id: string }>(
      `INSERT INTO v3_job_postings (source, source_ref, source_url, mapping_grade, mapping_note, title, raw_requirements, core_code, posting_kind, closes_on)
       VALUES ('jobindustry', $1, 'https://www.jobindustry.co.kr/487/?bmode=view&idx=1', '약함', $2, $3, $4, $5, 'job', (now() + interval '20 days')::date)
       RETURNING id::text`, [`${tag}-${ref}`, note, title, req, core]);
    ids.push(r!.id); return r!.id;
  };
  try {
    const a1 = await add("a1", "[예시] 머신러닝 엔지니어 신입 채용", ["딥러닝 모델 학습과 배포", "Python, PyTorch 경험 우대"], "AI_CORE_V1", "rules:title");
    const a2 = await add("a2", "[예시] 인공지능 연구원(컴퓨터 비전)", ["영상 인식 모델 개발", "석사 이상"], null, "rules:none");
    const x1 = await add("x1", "[예시] 임상 데이터 관리 연구원", ["임상시험 데이터 관리와 분석", "통계 모델 이해", "데이터 품질 관리"], "AI_CORE_V1", "rules:content");
    const x2 = await add("x2", "[예시] 화학 분석 시험원", ["시료 분석 데이터 정리", "분석 모델 검증", "인공지능 활용 가능자 우대"], "AI_CORE_V1", "rules:content");
    const x3 = await add("x3", "[예시] 바이오 시료 처리 연구보조원", ["시료 처리와 데이터 기록", "데이터 분석 보조"], null, "rules:none");
    const r = await pickJobs(u, 50);
    const all = [...r.main, ...r.broad, ...r.grad, ...r.other];
    const where = (id: string) => r.main.some((x) => x.id === id) ? "main" : r.broad.some((x) => x.id === id) ? "broad" : r.grad.some((x) => x.id === id) ? "grad" : all.some((x) => x.id === id) ? "other" : "없음";
    ok("인공지능 직무 제목(전공 단 공고)은 내 전공 공고", where(a1) === "main", where(a1));
    ok("인공지능 직무 제목(전공 못 단 공고)도 내 전공 공고", where(a2) === "main", where(a2));
    ok("본문으로만 인공지능에 단 임상 데이터 공고는 보이지 않는다", where(x1) === "없음", where(x1));
    ok("본문에 '인공지능' 한 번 나온 화학 분석 공고는 보이지 않는다", where(x2) === "없음", where(x2));
    ok("전공 낱말이 없는 바이오 공고는 보이지 않는다", where(x3) === "없음", where(x3));
  } finally {
    await query(`DELETE FROM v3_job_postings WHERE id = ANY($1::bigint[])`, [ids]).catch(() => undefined);
    await query(`DELETE FROM career_profiles WHERE user_id = $1`, [u]).catch(() => undefined);
    await query(`DELETE FROM users WHERE id = $1`, [u]).catch(() => undefined);
  }
  console.log(`\nMAT 공고 고르기 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
