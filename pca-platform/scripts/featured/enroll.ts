/**
 * **프로그램 참여자를 기수에 넣는다**(중점 기업 카드가 서는 자리).
 *
 *   PROGRAM=KUS26_VISIONSEMI_TOUR FILE=<저장소 밖의 CSV> npm run featured:enroll          # 미리 보기
 *   PROGRAM=KUS26_VISIONSEMI_TOUR FILE=<저장소 밖의 CSV> APPLY=1 npm run featured:enroll  # 실제로 넣기
 *
 * 운영 이미지에는 tsx 가 없어 같은 것을 node 하나로 돈다(`Dockerfile` 이 `ops/featured-enroll.cjs` 로 묶는다):
 *
 *   PROGRAM=… FILE=/tmp/명단.csv node ops/featured-enroll.cjs            # 미리 보기
 *   PROGRAM=… FILE=/tmp/명단.csv APPLY=1 node ops/featured-enroll.cjs    # 넣기
 *   … FILE=- node ops/featured-enroll.cjs < 명단.csv                       # 표준입력으로 받기
 *   PROGRAM=… IDS="sjepa-01012345678, 01087654321" APPLY=1 node ops/featured-enroll.cjs  # 아이디만 붙여 넣기
 *
 * `IDS` 는 콘솔에 바로 붙여 넣는 길이다(파일을 옮기지 않는다). 쉼표 · 공백 · 줄바꿈으로 나눈 아이디 또는 학번 · 휴대전화
 * 번호를 받는다. 학교 머리(`kus-` · `sjepa-`)가 붙은 아이디도, 머리 없는 번호도 같은 계정으로 찾는다.
 *
 * CSV 는 계정 일괄 발급에 쓴 명단을 그대로 써도 된다. 머리글에서 아이디 · 학번 · 휴대전화 번호 칸 하나를
 * 찾아 읽고 나머지 칸(이름 · 학과)은 읽지 않는다. 휴대전화 번호는 하이픈을 떼고 숫자로 맞춘다(발급할 때와 같다).
 * 찾는 범위는 프로그램의 기관(`org_code`)에 속한 계정뿐이다.
 *
 * **화면과 로그에 개인정보를 적지 않는다.** 찾은 수 · 넣은 수 · 못 찾은 줄 번호만 낸다.
 * 명단 파일은 저장소에 두지 않는다(저장소 안 경로면 멈춘다).
 *
 * **들이는 것은 `pg` 하나다.** 프로그램 목록은 `featured-programs.v1.json` 을 직접 읽는다(`lib/featured` 를 들이면
 * 결과지 엔진까지 묶여 운영 단독 실행 파일이 커진다).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { query, queryOne } from "../../src/lib/db";

/* `.env.local` 이 있으면 읽는다(로컬). 운영은 환경 변수가 이미 있다 */
(() => {
  try {
    for (const line of readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* 없으면 그대로 */ }
})();

type Program = { code: string; org_code: string; cohort_name: string; title: string };

function programs(): Program[] {
  const dir = process.env.CONTENT_DIR ?? "sites/pca-platform/content";
  const f = path.resolve(process.cwd(), dir, "featured-programs.v1.json");
  if (!existsSync(f)) throw new Error(`프로그램 목록이 없습니다: ${f} (작업 폴더를 앱 뿌리로 두십시오)`);
  return (JSON.parse(readFileSync(f, "utf8")) as { programs: Program[] }).programs ?? [];
}

const ID_HEADS = ["아이디", "login_id", "loginid", "id"];
const SID_HEADS = ["학번", "student_id", "studentid", "참여자번호", "참여번호",
  "휴대전화번호", "휴대전화", "전화번호", "휴대폰번호", "휴대폰"];

async function main() {
  const prog = programs().find((p) => p.code === (process.env.PROGRAM ?? "")) ?? null;
  if (!prog) throw new Error(`PROGRAM 을 featured-programs.v1.json 의 code 로 적으십시오: ${programs().map((p) => p.code).join(", ")}`);
  const ids = (process.env.IDS ?? "").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  const file = process.env.FILE ?? "";
  if (!file && !ids.length) throw new Error("IDS 에 아이디를 붙여 넣거나, FILE 에 명단 CSV 를 적으십시오(표준입력이면 FILE=-)");
  if (file && file !== "-" && path.resolve(file).startsWith(path.resolve("."))) throw new Error("명단은 저장소 · 앱 폴더 밖에 두십시오(개인정보)");
  const apply = process.env.APPLY === "1";

  /* 아이디만 받으면 머리글 하나짜리 명단으로 바꿔 같은 길로 찾는다 */
  const text = ids.length ? ["아이디", ...ids].join("\n")
    : file === "-" ? readFileSync(0, "utf8") : readFileSync(file, "utf8");
  const rows = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim())
    .map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
  if (rows.length < 2) throw new Error("명단에 머리글 아래 줄이 없습니다");
  const head = rows[0].map((h) => h.toLowerCase().replace(/\s/g, ""));
  const col = head.findIndex((h) => ID_HEADS.includes(h));
  const scol = head.findIndex((h) => SID_HEADS.includes(h));
  if (col < 0 && scol < 0) throw new Error(`머리글에서 아이디 · 학번 · 휴대전화 번호 칸을 찾지 못했습니다(찾는 이름: ${[...ID_HEADS, ...SID_HEADS].join(", ")})`);
  /* 학번 · 휴대전화 번호는 발급할 때처럼 숫자만 남긴다(010-1234-5678 → 01012345678) */
  const digits = (s: string) => (/^[\d\s-]+$/.test(s) ? s.replace(/\D/g, "") : s);

  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [prog.org_code]);
  if (!org) throw new Error(`${prog.org_code} 기관 줄이 없습니다`);

  const found: string[] = []; const miss: number[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const login = col >= 0 ? rows[i][col] ?? "" : "";
    /* 아이디 칸에 머리 없는 번호(01012345678 · 20261234)를 적었으면 학번 · 번호로도 찾는다 */
    const sid = scol >= 0 ? digits(rows[i][scol] ?? "")
      : /^[\d\s-]+$/.test(login) ? digits(login) : login.replace(/^[a-z]+-/i, "");
    const u = await queryOne<{ id: string }>(
      `SELECT u.id::text FROM users u JOIN memberships m ON m.user_id = u.id AND m.org_id = $1::bigint
        LEFT JOIN campus_students cs ON cs.user_id = u.id
        WHERE ($2 <> '' AND u.login_id = $2) OR ($3 <> '' AND cs.student_id = $3) LIMIT 1`,
      [org.id, login, sid]);
    if (u) found.push(u.id); else miss.push(i + 1);
  }
  console.log(`${prog.title}: 명단 ${rows.length - 1}줄 · 계정을 찾은 줄 ${found.length} · 못 찾은 줄 ${miss.length}${miss.length ? ` (줄 번호 ${miss.join(", ")})` : ""}`);
  if (!apply) { console.log("미리 보기입니다. 넣으려면 APPLY=1"); return; }

  /* 기수가 어느 프로그램인지 적는 칸(`db/schema_featured.sql`). 없으면 넣지 않고 멈춘다 */
  const hasCol = await queryOne<{ ok: boolean }>(
    `SELECT TRUE AS ok FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'program_code'`);
  if (!hasCol) throw new Error("cohorts.program_code 칸이 없습니다. db/schema_featured.sql 을 먼저 반영하십시오(npm run db:upgrade)");

  let c = await queryOne<{ id: string }>(
    `SELECT id::text FROM cohorts WHERE org_id = $1::bigint AND (program_code = $2 OR name = $3) ORDER BY id LIMIT 1`,
    [org.id, prog.code, prog.cohort_name]);
  if (!c) {
    c = await queryOne<{ id: string }>(
      `INSERT INTO cohorts (org_id, name, description, program_code) VALUES ($1::bigint, $2, $3, $4) RETURNING id::text`,
      [org.id, prog.cohort_name, prog.title, prog.code]);
  } else {
    await query(`UPDATE cohorts SET program_code = $2 WHERE id = $1::bigint AND program_code IS NULL`, [c.id, prog.code]);
  }
  let added = 0;
  for (const uid of [...new Set(found)]) {
    const r = await query(`INSERT INTO cohort_members (cohort_id, user_id) VALUES ($1::bigint, $2::bigint) ON CONFLICT DO NOTHING RETURNING user_id`, [c!.id, uid]);
    added += r.length;
  }
  console.log(`기수에 넣었습니다: 새로 ${added}명 · 이미 있던 ${new Set(found).size - added}명`);
}
main().then(() => process.exit(0), (e) => { console.error(String(e)); process.exit(1); });
