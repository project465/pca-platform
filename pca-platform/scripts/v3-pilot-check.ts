/**
 * 본 파일럿을 **사람을 부르기 전에** 센다.
 *
 * 파일럿은 한 번만 할 수 있다. 스무 명이 한 시간씩 쓰고 난 뒤에 `그 칸을
 * 안 받고 있었다` 를 알면, 다시 부를 수 없다. 그래서 부르기 전에 센다:
 * 받기로 한 칸이 다 있는가 · 묻기로 한 네 가지가 다 덮였는가 · 지우기로
 * 한 것을 지울 수 있는가 · 다섯 명 규칙이 코드에 있는가.
 *
 *   npm run v3:pilot
 */
import { readFileSync } from "node:fs";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

const sql = readFileSync("db/schema_v3_pilot.sql", "utf8");
const store = readFileSync("src/lib/me-v3/pilot/store.ts", "utf8");
const admin = readFileSync("src/app/admin/v3-pilot/page.tsx", "utf8");
const join = readFileSync("src/app/v3/pilot/actions.ts", "utf8");
const purge = readFileSync("scripts/v3-pilot-purge.ts", "utf8");
const track = readFileSync("src/app/api/v3/pilot/track/route.ts", "utf8");
const enroll = readFileSync("src/lib/me-v3/pilot/enroll.ts", "utf8");
const funnel = readFileSync("src/lib/me-v3/pilot/funnel.ts", "utf8");
const analyze = readFileSync("src/lib/me-v3/pilot/analyze.ts", "utf8");
const report = readFileSync("scripts/v3-pilot-report.ts", "utf8");
const fbPage = readFileSync("src/app/v3/[attemptId]/feedback/page.tsx", "utf8");
const adminOne = readFileSync("src/app/admin/v3-pilot/[attemptId]/page.tsx", "utf8");

/* 1. 받기로 한 칸이 다 있다 */
const WANT = [
  "education_stage", "major_name", "major_field", "current_status",
  "career_interest", "purge_after", "cohort", "code",
];
const missing = WANT.filter((c) => !sql.includes(c));
ok("참가자 표에 받기로 한 칸이 다 있다", missing.length === 0, missing.join(" "));

/* 2. 네 가지를 다 묻는다 */
const topics = ["item", "result", "product", "ui"];
const notAsked = topics.filter((t) => !new RegExp(`'${t}'`).test(sql));
ok("문항이 네 가지를 다 덮는다", notAsked.length === 0,
   notAsked.length ? notAsked.join(" ") : "문항 · 결과 · 상품 · 화면");

/* 3. 척도와 자유입력이 둘 다 있다 */
const scale = (sql.match(/'scale'/g) ?? []).length - 1;  /* CHECK 절 한 번 빼고 */
const text = (sql.match(/'text'/g) ?? []).length - 1;
ok("척도와 자유입력이 둘 다 선다", scale >= 5 && text >= 2, `척도 ${scale} · 자유입력 ${text}`);

/* 4. 전공명이 준식별자로 적혀 있다 */
ok("전공명을 준식별자로 적어 두었다",
   /COMMENT ON COLUMN v3_pilot_participants\.major_name[\s\S]{0,200}준식별자/.test(sql));

/* 5. 지우는 코드가 있다 */
ok("기한이 지난 자유입력을 지우는 코드가 있다",
   /major_name = NULL/.test(purge) && /career_interest = NULL/.test(purge)
   && /f\.text = NULL|SET text = NULL/.test(purge));

/* 6. 지우기 전에 무엇이 지워질지 먼저 보여 준다 */
ok("지우기 전에 무엇이 지워질지 먼저 센다", /PURGE !== "yes"/.test(purge));

/* 7. 다섯 명 규칙이 **값을 만들지 않는 쪽**으로 들어 있다 */
ok("다섯 명이 안 되면 평균을 만들지 않는다",
   /MIN_CELL = 5/.test(store) && /xs\.length >= MIN_CELL/.test(store)
   && /mean: xs\.length >= MIN_CELL[\s\S]{0,200}: null/.test(store));

/* 8. 운영 화면이 전공명을 뽑지 않는다.
 *
 * 뽑는 자리를 하나로 묶어 두었다(`purgeDue`). 거기서는 `IS NOT NULL` 로
 * 있는지만 보고 값을 돌려주지 않는다. 그래서 세는 것은 둘이다 — 화면
 * 코드에 그 이름이 아예 없고, 한 줄 타입에도 그 칸이 없다. */
const rowType = store.slice(store.indexOf("export type PilotRow"),
  store.indexOf("export async function pilotRows"));
ok("운영 화면에 전공명이 나가지 않는다",
   !/major_name/.test(admin) && !/major_name/.test(rowType),
   /major_name/.test(admin) ? "운영 화면" : /major_name/.test(rowType) ? "한 줄 타입" : "");

/* 9. 발자국이 남의 응시에 남지 않는다 */
ok("남의 응시 번호로 발자국을 남길 수 없다",
   /attemptOf\(attemptId, user\.id\)/.test(track) && /participantOf\(user\.id\)/.test(track));

/* 10. 참가자가 아니면 적지 않는다 */
ok("파일럿 참가자가 아니면 아무것도 적지 않는다",
   /if \(!p\) return NextResponse\.json\(\{ ok: true, recorded: 0 \}/.test(track));

/* 11. 블록 시간을 응시 화면이 아니라 응답 시각에서 읽는다 */
ok("블록 시간을 응답 시각에서 읽는다(화면을 건드리지 않는다)",
   /v3_responses/.test(store) && /answered_at/.test(store) && /AWAY_MS/.test(store));

/* 12. 이름과 학교와 학번을 받지 않는다 */
const NEVER = ["student_id", "school_name", "phone", "birth"];
const got = NEVER.filter((c) => sql.includes(c) || join.includes(c));
ok("이름·학교·학번·연락처를 받지 않는다", got.length === 0, got.join(" "));

/* 13. 보존 기한이 줄을 만드는 자리에 박혀 있다.
       **화면이 아니라 등록이 박는다**: 화면은 늘어나고, 늘어난 화면 하나가
       빠뜨리면 그 참가자의 자유입력에 지울 날이 없다 */
ok("보존 기한을 줄을 만드는 자리에서 박는다",
   /purge_after[\s\S]{0,120}interval '90 days'/.test(enroll));

/* ── 이번 회차에 더한 자리 ─────────────────────────────────────── */

/* 14. wave 가 표와 등록 양쪽에 있다 */
ok("wave 를 표와 등록이 같이 든다",
   /wave\s+SMALLINT[\s\S]{0,80}CHECK/.test(sql) && /wave: number/.test(
     readFileSync("src/lib/me-v3/pilot/store.ts", "utf8")));

/* 15. 초대 열쇠를 날것으로 저장하지 않는다 */
ok("초대 열쇠는 해시만 저장한다",
   /token_hash/.test(sql) && /sha\(t\)/.test(enroll) && !/token\s+TEXT/.test(sql));

/* 16. 한 번만 쓰이는 것을 UPDATE 가 보장한다 */
ok("초대 한 자리는 한 번만 쓰인다",
   /WHERE id = \$1 AND used_at IS NULL RETURNING/.test(enroll));

/* 17. 가명을 주소에 실어도 자리가 열리지 않는다 */
ok("가명으로는 등록이 열리지 않는다",
   /enrollmentByToken/.test(enroll) && !/WHERE code = \$1[\s\S]{0,120}INSERT INTO v3_pilot_participants/
     .test(enroll));

/* 18. 퍼널을 상용 퍼널과 섞지 않는다 */
ok("퍼널 이름에 꼬리표가 붙는다",
   /PREFIX = "v3_pilot\."/.test(funnel) && /name LIKE \$1/.test(funnel));

/* 19. 같은 걸음을 두 번 세지 않는다. 응시 번호가 있으면 그것으로,
       없으면 가명으로 가른다 — 참가 화면은 응시 전에도 열린다 */
ok("같은 사람의 같은 걸음은 한 번만 적힌다",
   /props->>\$2 = \$3 LIMIT 1/.test(funnel) && /col: "participant"/.test(funnel));

/* 20. 자리를 비운 시간을 섞지 않는다 */
ok("20분 넘는 틈은 빼고 센다",
   /AWAY_MS = 20 \* 60 \* 1000/.test(analyze) && /d < 1200/.test(
     readFileSync("src/lib/me-v3/pilot/store.ts", "utf8")));

/* 21. 결과를 인질로 잡지 않는다 — 결과를 본 뒤에만 묻는다 */
ok("의견은 결과를 한 번 본 뒤에 묻는다",
   /kind = 'result_open'/.test(fbPage) && /redirect\(`\/v3\/\$\{attemptId\}\/result`\)/.test(fbPage));

/* 22. 빈칸을 억지로 채우게 하지 않는다 */
ok("빈칸으로 두어도 보낼 수 있다",
   !/required/.test(readFileSync("src/app/v3/[attemptId]/feedback/actions.ts", "utf8"))
   && /if \(!raw\) continue;/.test(
     readFileSync("src/app/v3/[attemptId]/feedback/actions.ts", "utf8")));

/* 23. 고르는 문항이 문항이 아는 보기만 받는다 */
ok("폼이 보낸 보기 값을 그대로 적지 않는다",
   /allow\.has\(raw\)/.test(
     readFileSync("src/app/v3/[attemptId]/feedback/actions.ts", "utf8")));

/* 24. 손볼 일 여섯 갈래가 다 있다 */
const KINDS = ["RESULT_FAILED", "INCONSISTENT", "DURATION_EXTREME",
  "NO_DOMAIN_OPENED", "DISAGREE", "PDF_FAILED"];
const noKind = KINDS.filter((k) => !new RegExp(`${k}:`).test(analyze));
ok("손볼 일 여섯 갈래가 선다", noKind.length === 0, noKind.join(" "));

/* 25. 거르는 자리를 넷으로 둔다 */
ok("거르는 자리는 wave · 등급 · 진행 · 손볼 일 넷뿐이다",
   /wave\?: number \| null/.test(readFileSync("src/lib/me-v3/pilot/store.ts", "utf8"))
   && !/ILIKE|to_tsquery/.test(readFileSync("src/lib/me-v3/pilot/store.ts", "utf8")));

/* 26. 한 사람 화면도 전공명을 뽑지 않는다 */
ok("한 사람 화면에도 전공명이 나가지 않는다",
   !/major_name/.test(adminOne));

/* 27. 분석 골격이 다섯 명 규칙과 자기보고 표시를 든다 */
ok("분석 골격이 다섯 명 규칙을 적는다", /MIN_CELL/.test(report));
ok("값에 대한 답을 자기보고로 적어 둔다",
   /치러 본 값이 아닌 짐작/.test(report));

/* 28. 통계 유의성을 만들지 않는다 */
ok("기계적인 통계 유의성 기준을 만들지 않는다",
   !/p\s*<\s*0\.0|significan|t-test|chi2/i.test(report) && /유의성/.test(report));

console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
console.log("  사람을 부르기 전에 도는 검사입니다. 실제 모집은 이 다음입니다.");
process.exitCode = fail ? 1 : 0;
