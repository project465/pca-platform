/**
 * 매트를 실제 DB 로 한 바퀴 돈다(로컬·staging 전용).
 *
 *   LOGIN=test-jju-cs-01 npx tsx scripts/lab/assistant-check.ts
 *
 * 열쇠(ANTHROPIC_API_KEY)가 없으면 규칙으로 읽는 길을, 있으면 Claude 길을
 * 본다. **어느 쪽이든 판정은 지금 상태가 정하는지**와 **목록 밖의 말이
 * 남지 않는지**를 센다. 운영에서는 멈춘다: 시험 공고와 알림을 쌓는다.
 */
import { query, queryOne } from "../../src/lib/db";
import { appEnv } from "../../src/lib/env";
import { aiReady } from "../../src/lib/assistant/claude";
import { catalog } from "../../src/lib/assistant/catalog";
import { analyzePosting, postingOf } from "../../src/lib/assistant/posting";
import { draftExperience, draftOf } from "../../src/lib/assistant/draft";
import { setAiConsent } from "../../src/lib/assistant/settings";
import { nudgeUser, runAssistantTick, unreadCount } from "../../src/lib/assistant/nudges";
import { activeCore, currentState } from "../../src/lib/me-v3/platform";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`  ${cond ? "통과" : "걸림"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const POSTING = `[신입] 소프트웨어 개발자 채용
담당 업무
- 웹 서비스 백엔드 API 설계와 구현
- 데이터베이스 스키마 설계 및 쿼리 성능 개선
- 코드 리뷰와 테스트 자동화
자격 요건
- 컴퓨터공학 관련 학사 이상
- 자료구조와 알고리즘에 대한 이해
우대 사항
- 클라우드 배포 경험 우대
- 보안 취약점 점검 경험 우대
접수 마감 2026.11.30`;

async function main(): Promise<void> {
  if (appEnv() === "production") { console.error("운영에서는 돌리지 않는다"); process.exit(2); }
  const login = process.env.LOGIN ?? "test-jju-cs-01";
  const u = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [login]);
  if (!u) { console.error(`${login} 이 없다`); process.exit(2); }
  const uid = u.id;
  const core = await activeCore(uid);
  console.log(`\n── 매트 (사용자 ${uid} · ${core} · AI ${aiReady() ? "켜짐" : "꺼짐"})\n`);

  /* 기간권 하나를 붙인다. 이 검사만의 줄이라 끝에서 지운다 */
  await query(`DELETE FROM entitlements WHERE user_id=$1 AND kind='track' AND product_code='TRACK_LAB'`, [uid]);
  await query(`INSERT INTO entitlements (user_id, product_code, kind, status, starts_at, ends_at)
               VALUES ($1,'TRACK_LAB','track','active',now(),now()+interval '30 days')`, [uid])
    .catch(async () => {
      /* 외래키가 상품을 요구하면 30일권으로 붙인다 */
      await query(`INSERT INTO entitlements (user_id, product_code, kind, status, starts_at, ends_at)
                   VALUES ($1,'TRACK_30D','track','active',now(),now()+interval '30 days')`, [uid]);
    });
  await query(`DELETE FROM assistant_nudges WHERE user_id=$1`, [uid]);
  await query(`DELETE FROM assistant_postings WHERE user_id=$1`, [uid]);
  await query(`DELETE FROM assistant_drafts WHERE user_id=$1`, [uid]);

  /* 1. 동의 전에는 밖으로 보내지 않는다 */
  await setAiConsent(uid, false);
  const p1 = await analyzePosting(uid, { label: "시험 공고", text: POSTING, deadline: null });
  ok("동의 전에는 규칙으로 읽는다", p1.by === "rules");
  const row = await postingOf(uid, p1.id);
  const a = row!.analysis;
  ok("요구 항목을 하나 이상 뽑는다", a.items.length > 0, `${a.items.length}개`);
  ok("넷으로 센 수가 항목 수와 같다",
    Object.values(a.counts).reduce((x, y) => x + y, 0) === a.items.length);
  const codes = new Set(catalog(core).map((d) => d.code));
  ok("영역 코드는 그 Core 의 목록 안이다", a.items.every((i) => !i.domain || codes.has(i.domain)));
  ok("공고의 마감일을 읽는다", row!.deadline === "2026-11-30", String(row!.deadline));
  ok("규칙으로 읽은 까닭을 적는다", Boolean(a.note));
  ok("점수 칸이 없다", !/"(score|fit|percent|rank)"/.test(JSON.stringify(a)));

  /* 2. 판정은 지금 상태가 정한다 */
  const st = await currentState(uid);
  const z1 = a.items.filter((i) => i.domain && st.zoneOf[i.domain] === "Z1_EVIDENCE_ESTABLISHED"
    && !st.gaps.some((g) => g.domain === i.domain && (!i.axis || g.axis === i.axis)));
  ok("근거가 선 영역만 '설명할 경험 있음' 이다",
    a.items.filter((i) => i.status === "ready").length === z1.length);

  /* 3. 남의 것은 열리지 않는다 */
  const other = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE id <> $1 LIMIT 1`, [uid]);
  ok("남의 공고는 열리지 않는다", (await postingOf(other!.id, p1.id)) === null);

  /* 4. 경험 초안: 목록 밖의 말이 남지 않는다 */
  const d = await draftExperience(uid,
    "자료구조 수업 팀 과제에서 해시 테이블과 트리로 검색 기능을 만들었고, 두 방식의 실행 시간을 비교해 보고서로 냈다.");
  const dv = await draftOf(uid, d.id);
  ok("초안이 저장되고 다시 열린다", Boolean(dv));
  const cat = catalog(core).filter((x) => dv!.value.td.includes(x.code));
  const pool = new Set(cat.flatMap((x) => [...x.checklist.J1.slice(0, 6), ...x.checklist.J3.slice(0, 8),
    ...x.artifacts, ...x.verify]));
  ok("초안의 보기는 전부 그 영역의 목록 안이다",
    [...dv!.value.problems, ...dv!.value.decisions, ...dv!.value.artifacts, ...dv!.value.verifications]
      .every((s) => pool.has(s)));
  ok("남의 초안은 열리지 않는다", (await draftOf(other!.id, d.id)) === null);

  /* 5. 알림: 같은 주에 두 번 쌓이지 않는다 */
  const n1 = await nudgeUser(uid);
  const n2 = await nudgeUser(uid);
  ok("이번 주 할 일 알림이 한 번 쌓인다", n1.weekly === 1 && n2.weekly === 0, `${n1.weekly} → ${n2.weekly}`);

  /* 6. 마감 알림: 사흘 남은 공고 */
  const soon = new Date(Date.now() + 9 * 3600_000 + 3 * 86400_000).toISOString().slice(0, 10);
  const p2 = await analyzePosting(uid, { label: "마감 임박 공고", text: POSTING, deadline: soon });
  const n3 = await nudgeUser(uid);
  const n4 = await nudgeUser(uid);
  ok("마감 알림이 한 번 쌓인다", n3.deadline === 1 && n4.deadline === 0, `${n3.deadline} → ${n4.deadline}`);
  ok("읽지 않은 알림이 센 대로다", (await unreadCount(uid)) === 2);

  /* 7. 밤 당번은 다시 돌려도 줄 수가 그대로다 */
  await runAssistantTick();
  const before = (await query<{ n: number }>(`SELECT count(*)::int n FROM assistant_nudges WHERE user_id=$1`, [uid]))[0].n;
  await runAssistantTick();
  const after = (await query<{ n: number }>(`SELECT count(*)::int n FROM assistant_nudges WHERE user_id=$1`, [uid]))[0].n;
  ok("밤 당번을 두 번 돌려도 알림이 늘지 않는다", before === after, `${before} → ${after}`);

  /* 8. 기한이 지난 본문은 비운다 */
  await query(`UPDATE assistant_postings SET purge_after = now() - interval '1 day' WHERE id = $1`, [p2.id]);
  await runAssistantTick();
  const purged = await queryOne<{ raw: string | null; n: number }>(
    `SELECT raw_text AS raw, jsonb_array_length(analysis->'items') AS n FROM assistant_postings WHERE id=$1`, [p2.id]);
  ok("기한이 지난 공고 본문은 비우고 읽은 결과는 남긴다", purged!.raw === null && purged!.n > 0);

  /* 9. 메일 종류를 DB 가 받는다 */
  const k = await queryOne<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname='outbox_kind_check'`);
  ok("outbox 가 assistant_digest 를 받는다", Boolean(k?.def.includes("assistant_digest")));

  /* 10. 동의하면 Claude 길로 간다(열쇠가 있을 때만 센다) */
  if (aiReady()) {
    await setAiConsent(uid, true);
    const p3 = await analyzePosting(uid, { label: "AI 공고", text: POSTING, deadline: null });
    ok("동의하고 열쇠가 있으면 Claude 로 읽는다", p3.by === "claude");
    const r3 = await postingOf(uid, p3.id);
    ok("Claude 가 읽어도 영역 코드는 목록 안이다",
      r3!.analysis.items.every((i) => !i.domain || codes.has(i.domain)));
    await setAiConsent(uid, false);
  } else {
    console.log("  (열쇠가 없어 Claude 길은 세지 않았다)");
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}\n`);
  process.exit(fail ? 1 : 0);
}
void main().catch((e) => { console.error(e); process.exit(1); });
