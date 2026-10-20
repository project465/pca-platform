/**
 * **학교 명단으로 학생 계정을 일괄 발급한다.** 운영에서 사람이 치는 자리다.
 *
 *   npm run pcu:students                       지금 몇 줄인가 (읽기만)
 *   npm run pcu:students import students.csv   미리 본다 (쓰지 않는다)
 *   APPLY=yes npm run pcu:students import students.csv
 *   APPLY=yes OUT=/tmp/pcu-accounts.csv npm run pcu:students import students.csv
 *   APPLY=yes ROTATE=yes npm run pcu:students rotate test001
 *
 * CSV 머리글: `student_id,name,email,college_code,department_code`
 * (`email` 과 `college_code` 는 비어 있어도 된다. `login_id` 칸을 두면
 * 학번 대신 그 값을 아이디로 쓴다)
 *
 * ## 이 스크립트가 지키는 것
 *
 * **기본은 쓰지 않는다.** `APPLY=yes` 가 없으면 등록부에 대고 한 줄씩
 * 보고 결과만 적는다. 운영에 붙은 창에서 명단을 잘못 올리는 자리라
 * 그렇게 둔다.
 *
 * **틀린 학과 코드는 만들지 않는다.** 한 줄이라도 거절되면 그 줄만
 * 빠지고 나머지는 들어간다. 전부 되돌리지 않는 까닭은 명단이 수백 줄일 때
 * 한 줄 때문에 다시 올리게 되고, 그러면 사람이 그 한 줄을 지워서 올린다.
 *
 * **열쇠는 그 자리에서 만들어 한 번만 내놓는다.** 평문을 DB 에도 로그에도
 * 두지 않는다. 파일로 받으려면 `OUT` 에 자리를 적어야 하고, 저장소 안은
 * 거절한다: 한 번 커밋되면 그 명단 전체가 샌다.
 *
 * **이미 있는 학생의 열쇠를 바꾸지 않는다.** 명단을 다시 올리는 것이 가장
 * 흔한 두 번째 실행이고, 그때 비밀번호가 갈리면 어제 받아 간 학생이 그
 * 자리에서 잠긴다. 바꾸려면 `ROTATE=yes` 를 함께 준다.
 *
 * **한 사람의 열쇠만 다시 내는 자리를 따로 둔다**(`rotate <아이디>`).
 * 명단으로도 `ROTATE=yes` 가 돌지만 그 길은 CSV 에 적힌 이름과 학과를
 * 그 사람의 줄에 **다시 쓴다**(`ON CONFLICT DO UPDATE`). 초기 비밀번호를
 * 잃어버려 다시 내는 자리에서는 바꿀 것이 열쇠 하나뿐인데, CSV 를 손으로
 * 적다 한 칸이 어긋나면 그 학생의 이름이나 학과가 조용히 갈리고 그 응시는
 * 담당자 화면에서 남의 학과 줄에 선다. 그래서 이쪽은 **DB 에 적힌 것을
 * 그대로 두고 `password_hash` 한 칸만** 바꾼다.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { query, queryOne } from "../src/lib/db";
import {
  checkStudent, LoginTaken, provisionStudent, campusStudentCount, initialPassword,
  type CampusStudentInput,
} from "../src/lib/campus/students";
import { hashPassword } from "../src/lib/password";

const UNI = process.env.UNI ?? "PCU";

/** 머리글을 보고 칸을 찾는다. 차례를 못 박지 않는다 */
function parseCsv(text: string): CampusStudentInput[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) throw new Error("빈 파일입니다");
  const head = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const at = (name: string): number => head.indexOf(name);
  const iSid = at("student_id");
  const iName = at("name");
  if (iSid < 0 || iName < 0) {
    throw new Error("머리글에 student_id 와 name 이 있어야 합니다"
      + ` (읽은 머리글: ${head.join(" ")})`);
  }
  const iMail = at("email");
  const iCol = at("college_code");
  const iDep = at("department_code");
  const iLogin = at("login_id");
  if (iDep < 0) throw new Error("머리글에 department_code 가 없습니다");
  const cell = (cols: string[], i: number): string =>
    i >= 0 ? (cols[i] ?? "").trim() : "";
  return lines.slice(1).map((l) => {
    const cols = l.split(",");
    return {
      student_id: cell(cols, iSid),
      name: cell(cols, iName),
      email: cell(cols, iMail) || null,
      login_id: cell(cols, iLogin) || null,
      college_code: cell(cols, iCol) || null,
      department_code: cell(cols, iDep),
    };
  });
}

/**
 * 열쇠가 든 파일을 **저장소 안에 쓰지 않는다.**
 *
 * 한 번 커밋되면 그 명단 전체가 샌다. 그래서 자리를 받을 때 거절하고,
 * 운영자가 `/tmp` 나 그 밖의 자리를 적게 한다.
 */
function assertOutside(out: string): string {
  const abs = resolve(out);
  const repo = resolve(__dirname, "..");
  if (abs.startsWith(`${repo}/`) || abs === repo) {
    throw new Error("열쇠가 든 파일을 저장소 안에 쓰지 않습니다."
      + ` /tmp 처럼 저장소 밖을 적어 주십시오 (받은 자리: ${abs})`);
  }
  return abs;
}

/**
 * **한 사람의 열쇠만 다시 낸다.** 바꾸는 칸이 `password_hash` 하나다.
 *
 * 초기 비밀번호를 적어 둔 파일이 사라졌을 때 쓰는 자리다. 들고 있던 열쇠를
 * 되살릴 길은 없다(해시만 남기므로 그것이 설계다). 그래서 새로 하나 내고
 * 그 자리에서 한 번 보여 준다.
 *
 * **그 학교의 발급 계정만 받는다.** `campus_students` 줄이 없는 사람은
 * 거절한다: 학교가 발급하지 않은 계정의 열쇠를 이 자리에서 바꿀 일이
 * 없고, 그 길을 열어 두면 아이디 하나로 아무 계정의 열쇠를 바꿀 수 있다.
 *
 * **아이디로만 찾는다.** 로그인 쪽은 아이디와 이메일을 둘 다 받지만, 여기는
 * 운영자가 적어 준 글자가 아이디다. 이메일로도 찾으면 같은 글자를 든 다른
 * 사람의 열쇠를 바꿀 수 있다.
 */
async function rotateOne(
  loginId: string, apply: boolean, rotate: boolean,
): Promise<void> {
  if (!loginId) {
    console.error("쓰임: npm run pcu:students rotate <아이디>");
    process.exit(2);
  }
  const who = await queryOne<{
    id: string; login: string; name: string; status: string;
    sid: string; col: string; dep: string; sp: string | null; hash: string;
  }>(
    `SELECT u.id::text, u.login_id AS login, u.display_name AS name, u.status,
            s.student_id AS sid, s.college_code AS col,
            s.department_code AS dep, s.specialization AS sp,
            u.password_hash AS hash
       FROM users u JOIN campus_students s ON s.user_id = u.id
      WHERE u.login_id = $1 AND s.university_code = $2`, [loginId, UNI]);
  console.log(`\n── ${UNI} 초기 비밀번호 ${apply ? "재발급" : "미리보기"}\n`);
  if (!who) {
    console.error(`  ${loginId} 는 ${UNI} 가 발급한 학생 계정이 아닙니다.`);
    console.error("  학번(아이디)을 그대로 적었는지 보십시오."
      + " 발급 목록은 npm run pcu:diag 가 적습니다.");
    process.exit(1);
  }
  console.log(`  아이디       ${who.login}  (user ${who.id})`);
  console.log(`  학번         ${who.sid}`);
  console.log(`  학과         ${who.col} · ${who.dep} · ${who.sp ?? "갈래 없음"}`);
  console.log(`  상태         ${who.status}`);
  if (!apply || !rotate) {
    console.log("\n  아직 아무것도 바꾸지 않았습니다.");
    console.log("  바꾸려면 두 자물쇠를 함께 주십시오:");
    console.log(`    APPLY=yes ROTATE=yes npm run pcu:students rotate ${who.login}\n`);
    process.exit(0);
  }
  const pw = initialPassword();
  await query(
    `UPDATE users SET password_hash = $2 WHERE id = $1::bigint`,
    [who.id, await hashPassword(pw)]);
  /* **바꾼 것이 그 한 칸뿐임을 값으로 센다.** 적어 두는 것으로는 다음
     사람이 믿을 수 없고, 이 자리가 틀리면 그 학생의 학과가 조용히 갈린다 */
  const after = await queryOne<{ same: string }>(
    `SELECT (u.login_id = $2 AND u.display_name = $3 AND u.status = $4
             AND s.student_id = $5 AND s.college_code = $6
             AND s.department_code = $7
             AND coalesce(s.specialization,'') = coalesce($8,'')
             AND u.password_hash <> $9)::text AS same
       FROM users u JOIN campus_students s ON s.user_id = u.id
      WHERE u.id = $1::bigint`,
    [who.id, who.login, who.name, who.status, who.sid, who.col, who.dep,
     who.sp, who.hash]);
  console.log(`\n  바꾼 칸      password_hash 하나`);
  console.log(`  그대로       아이디 · 이름 · 상태 · 학번 · 학과`
    + ` (${after?.same === "true" ? "값으로 확인했습니다" : "확인하지 못했습니다"})`);
  console.log("  건드리지 않은 것  소속 · 응시 · 결과 · 학과 매핑");
  console.log("\n  초기 비밀번호 (이 화면에서 한 번만 보여 줍니다)\n");
  console.log(`  ${who.sid},${who.name},${who.login},${pw}`);
  console.log("\n  전달한 뒤 이 화면을 닫으십시오."
    + " 다시 보여 주는 길은 없고 또 내면 그때 것이 됩니다.\n");
  process.exit(after?.same === "true" ? 0 : 1);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 이 없습니다."); process.exit(2);
  }
  const [cmd, file] = process.argv.slice(2);
  const apply = (process.env.APPLY ?? "").toLowerCase() === "yes";
  const rotate = (process.env.ROTATE ?? "").toLowerCase() === "yes";
  const out = (process.env.OUT ?? "").trim();

  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);

  if (cmd === "rotate") { await rotateOne(file, apply, rotate); return; }

  if (cmd !== "import") {
    console.log(`\n── ${UNI} 학생 계정 (읽기만)\n`);
    console.log(`  기관 줄      ${org ? "있다" : "없다 — npm run pcu:org 로 먼저 만든다"}`);
    console.log(`  학생 계정    ${await campusStudentCount(UNI)}명\n`);
    console.log("  명단을 올리려면:");
    console.log("    npm run pcu:students import students.csv        미리 본다");
    console.log("    APPLY=yes npm run pcu:students import students.csv\n");
    console.log("  한 사람의 초기 비밀번호만 다시 내려면:");
    console.log("    npm run pcu:students rotate <아이디>            미리 본다");
    console.log("    APPLY=yes ROTATE=yes npm run pcu:students rotate <아이디>\n");
    process.exit(0);
  }
  if (!file) {
    console.error("쓰임: npm run pcu:students import <파일.csv>");
    process.exit(2);
  }
  if (!org) {
    console.error(`${UNI} 기관 줄이 없습니다. npm run pcu:org 로 먼저 만드십시오.`);
    process.exit(1);
  }

  /**
   * **쓸 자리를 먼저 본다.** 전에는 이 검사가 계정을 만든 뒤에 있었고,
   * 저장소 안을 적으면 **계정은 생기고 초기 비밀번호는 사라졌다.** 그
   * 학생은 아이디만 있고 들어갈 수 없는 상태로 남고, 받은 사람은
   * 비밀번호를 의심한다. 되돌리려면 그 줄을 지우고 다시 발급해야 한다.
   */
  const outAbs = out ? assertOutside(out) : null;

  const rows = parseCsv(readFileSync(file, "utf8"));
  console.log(`\n── ${UNI} 학생 계정 ${apply ? "발급" : "미리보기"} · 명단 ${rows.length}줄\n`);

  /* 같은 학번이 두 번 적힌 명단을 거절한다. 두 줄이 한 계정을 만들면
     뒤엣줄이 앞엣줄의 학과를 덮는다 */
  const seen = new Set<string>();
  const made: { student_id: string; name: string; login_id: string; pw: string }[] = [];
  const kept: string[] = [];
  const bad: string[] = [];

  for (const r of rows) {
    if (seen.has(r.student_id)) {
      bad.push(`${r.student_id} 명단에 두 번 적혀 있습니다`); continue;
    }
    seen.add(r.student_id);
    const c = checkStudent(UNI, r);
    if (!c.ok) { bad.push(`${r.student_id || "(학번 없음)"} ${c.why}`); continue; }
    if (!apply) { kept.push(`${r.student_id} ${r.name} → ${c.value.ctx.department_code}`); continue; }
    /* 이미 있는 아이디가 이 학교 학생이 아니면 공통 쪽이 던진다(C16). 그 줄만 거르고 이어 간다 */
    let res;
    try { res = await provisionStudent(org.id, c.value, { rotate }); }
    catch (e) { if (e instanceof LoginTaken) { bad.push(`${r.student_id} ${e.message}`); continue; } throw e; }
    if (res.password) {
      made.push({
        student_id: r.student_id, name: r.name,
        login_id: c.value.loginId, pw: res.password,
      });
    } else {
      kept.push(`${r.student_id} 이미 있습니다 (열쇠를 바꾸지 않았습니다)`);
    }
  }

  if (!apply) {
    for (const k of kept) console.log(`  만들 수 있다  ${k}`);
    for (const b of bad) console.log(`  거절          ${b}`);
    console.log(`\n  만들 수 있는 줄 ${kept.length} · 거절 ${bad.length}`);
    console.log("  실제로 만들려면 APPLY=yes 를 붙이십시오.\n");
    process.exit(bad.length ? 1 : 0);
  }

  for (const k of kept) console.log(`  그대로        ${k}`);
  for (const b of bad) console.log(`  거절          ${b}`);
  console.log(`\n  새로 만든 계정 ${made.length} · 그대로 ${kept.length} · 거절 ${bad.length}`);

  if (made.length) {
    if (outAbs) {
      const abs = outAbs;
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs,
        "student_id,name,login_id,initial_password\n"
        + made.map((m) => `${m.student_id},${m.name},${m.login_id},${m.pw}`)
          .join("\n") + "\n", { mode: 0o600 });
      console.log(`\n  학교에 전달할 파일: ${abs} (권한 600)`);
      console.log("  **이 파일에는 초기 비밀번호가 들어 있습니다.**"
        + " 전달한 뒤 지우십시오.");
    } else {
      console.log("\n  초기 비밀번호 (이 화면에서 한 번만 보여 줍니다)\n");
      console.log("  학번,이름,아이디,초기 비밀번호");
      for (const m of made) {
        console.log(`  ${m.student_id},${m.name},${m.login_id},${m.pw}`);
      }
      console.log("\n  파일로 받으려면 OUT=/tmp/pcu-accounts.csv 를 붙이십시오.");
    }
  }
  console.log();
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
