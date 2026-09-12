/**
 * 시연용 응답 시드. 단체 리포트는 사람이 여럿이어야 볼 것이 생긴다.
 * 명단에 있으나 아직 응시하지 않은 사람에게 무작위 응답을 넣고 제출 상태로 만든다.
 *
 *   npm run db:seed:responses -- <sessionId>
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { query } from "../src/lib/db";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 없으면 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(".env.local");

async function main() {
  const sessionId = process.argv[2];
  if (!sessionId) throw new Error("회차 id 를 인자로 주세요. 예: npm run db:seed:responses -- 3");

  const filled = await query<{ id: string }>(
    `WITH target AS (
       SELECT a.id AS attempt_id, q.id AS question_id
         FROM attempts a
         JOIN test_sessions ts ON ts.id = a.session_id
         JOIN questions q      ON q.instrument_id = ts.instrument_id
        WHERE a.session_id = $1 AND a.status IN ('ready', 'in_progress')
     )
     INSERT INTO responses (attempt_id, question_id, option_id)
     SELECT t.attempt_id, t.question_id,
            (SELECT o.id FROM question_options o
              WHERE o.question_id = t.question_id ORDER BY random() LIMIT 1)
       FROM target t
     ON CONFLICT (attempt_id, question_id) DO NOTHING
     RETURNING attempt_id AS id`,
    [sessionId],
  );

  const done = await query<{ id: string }>(
    `UPDATE attempts
        SET status = 'submitted', started_at = COALESCE(started_at, now()), submitted_at = now(),
            last_order_no = (SELECT max(order_no) FROM questions q
                              JOIN test_sessions ts ON ts.instrument_id = q.instrument_id
                             WHERE ts.id = $1)
      WHERE session_id = $1 AND status IN ('ready', 'in_progress')
      RETURNING id`,
    [sessionId],
  );

  console.log(`응답 ${filled.length}건을 넣고 ${done.length}명을 제출 상태로 바꿨습니다.`);
  console.log("회차 화면에서 채점을 돌리면 단체 리포트가 채워집니다.");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
