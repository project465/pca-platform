/**
 * **staging 시험 학생을 처음 받은 상태로 되돌린다.** Railway 의 staging
 * 서비스 Shell 에서 한 번 치는 자리다.
 *
 *   LOGIN=test-cs-01 npm run staging:reset-student              # 지울 것을 세기만 한다
 *   LOGIN=test-cs-01 CONFIRM=yes npm run staging:reset-student  # 지운다
 *   LOGIN=test-cs-01,test-ee-01 CONFIRM=yes npm run staging:reset-student
 *
 * 응시(응답 · 근거 · 등급 기록 · 결과 사본은 응시를 따라 함께 지워진다)와
 * 그 학생이 작업공간에 남긴 것(경험 · 할 일 · 저장한 공고 · 관심 · 지원 기록
 * · 커리어 프로필 · 커리어 사건)을 지운다. 계정 · 비밀번호 · 학교 명단 줄 ·
 * 이용권은 그대로 둔다: 이용권은 응시가 가리키지 않게 되면 다시 쓸 수 있어서
 * 학생이 검사를 처음부터 다시 받을 수 있다.
 *
 * ## 이 스크립트가 지키는 것
 *
 * **운영에서는 돌지 않는다.** `APP_ENV` 가 `staging` 이 아니면 한 줄도 지우지
 * 않고 멈춘다(`staging-bootstrap` 과 같은 문).
 *
 * **시험 계정만 지운다.** 아이디가 `test-` 로 시작하는 학생만 받는다. 담당자
 * 계정이나 사람이 쓰는 계정은 이름을 잘못 넣어도 손대지 않는다.
 *
 * **세고 나서 지운다.** `CONFIRM=yes` 가 없으면 무엇이 몇 줄 지워질지만
 * 보여 주고 멈춘다. 지울 때는 한 트랜잭션이라 중간에 실패하면 통째로
 * 되돌린다.
 */
import { query, tx } from "../src/lib/db";
import { appEnv } from "../src/lib/env";

/* 학생 한 사람이 남기는 표. 응시 아래 표(v3_responses · v3_evidence_picks ·
   v3_tier_events · v3_snapshots)는 v3_attempts 를 ON DELETE CASCADE 로 따른다 */
const TABLES = [
  "v3_attempts", "v3_experiences", "v3_actions", "v3_saved_jobs",
  "v3_track_interest", "v3_applications", "career_profiles", "career_events",
] as const;

const LOGINS = (process.env.LOGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const CONFIRM = (process.env.CONFIRM ?? "").toLowerCase() === "yes";

async function main(): Promise<void> {
  const env = appEnv();
  console.log(`\n── 시험 학생 되돌리기 (APP_ENV=${env})\n`);
  if (env !== "staging") {
    console.error(`  멈춤  APP_ENV 가 staging 이 아니다 (${env}). 시험 학생은 staging 에서만 되돌린다.`);
    process.exit(2);
  }
  if (!process.env.DATABASE_URL) { console.error("  멈춤  DATABASE_URL 이 없다"); process.exit(2); }
  if (!LOGINS.length) { console.error("  멈춤  LOGIN 이 비어 있다 (예: LOGIN=test-cs-01)"); process.exit(2); }
  const bad = LOGINS.filter((l) => !/^test-[a-z0-9-]+$/.test(l));
  if (bad.length) {
    console.error(`  멈춤  시험 계정(test-…)이 아니다: ${bad.join(", ")}`);
    process.exit(2);
  }

  const have = await query<{ t: string }>(
    `SELECT table_name AS t FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = ANY($1::text[])`, [[...TABLES]]);
  const tables = have.map((r) => r.t);

  for (const login of LOGINS) {
    const users = await query<{ id: string }>(
      `SELECT id::text FROM users WHERE login_id = $1`, [login]);
    if (!users.length) { console.log(`  ${login}  없음 · 건너뜀`); continue; }
    const id = users[0].id;
    const counts: string[] = [];
    for (const t of tables) {
      const [r] = await query<{ n: string }>(
        `SELECT count(*)::text AS n FROM ${t} WHERE user_id = $1::bigint`, [id]);
      if (Number(r?.n ?? 0)) counts.push(`${t} ${r.n}`);
    }
    if (!counts.length) { console.log(`  ${login}  지울 것 없음 · 이미 처음 상태`); continue; }
    if (!CONFIRM) { console.log(`  ${login}  지울 것: ${counts.join(" · ")}`); continue; }
    await tx(async (c) => {
      for (const t of tables) await c.query(`DELETE FROM ${t} WHERE user_id = $1::bigint`, [id]);
    });
    console.log(`  ${login}  지웠다: ${counts.join(" · ")}`);
  }
  if (!CONFIRM) console.log("\n  세기만 했다. 지우려면 앞에 CONFIRM=yes 를 붙여 다시 친다.\n");
  else console.log("\n  끝. 그 학생은 다음 로그인에서 검사를 처음부터 받는다.\n");
  process.exit(0);
}
void main().catch((e) => { console.error(e); process.exit(1); });
