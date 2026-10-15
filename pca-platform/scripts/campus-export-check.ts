/**
 * **담당자가 내려받는 자료가 제 몫을 하는가**(규격 §17·§18·§19·§23).
 *
 * `쪽이 서는가` 와 `받은 파일이 쓸 만한가` 는 다른 질문이다. 세 자리가
 * 전부 200 이면서 파일이 비어 있을 수도 있고, 더 나쁘게는 **나가면 안 되는
 * 칸이 들어 있을 수도** 있다. 그래서 이 검사는 실제 브라우저로 로그인해
 * 담당자의 쿠키를 들고 받아, **받은 글자를 센다.**
 *
 * 세는 것 가운데 둘이 이 제품에서 가장 비싼 자리다.
 *
 * - **개별 학생의 답변이 한 칸도 나가지 않는가**(§18·§23). 명단 CSV 에는
 *   문항 번호도 응답 값도 결과 묶음도 없어야 한다
 * - **5명 미만 칸이 수를 내지 않는가**(§19). 가리는 자리가 화면과 파일로
 *   둘이면 어느 날 한쪽만 고쳐지고, 그날 내려받은 파일에서 네 명짜리
 *   학과가 드러난다
 *
 *   UI_BASE=http://127.0.0.1:3100 npm run campus:export
 */
import { loadEnv, BASE, assertFreshServer, gateCreds, login, makeStudent, registerCampusStudent } from "./_loop-fixture";
loadEnv();
import { chromium, type APIResponse, type BrowserContext } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { clearCampusCohort, seedCampusCohort } from "./_campus-fixture";
import { hashPassword } from "../src/lib/password";
import { MIN_CELL } from "../src/lib/org";
import { allLeaves, university } from "../src/lib/campus/registry";

const UNI = "PCU";
let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

/** 담당자 하나. **발급 계정을 건드리지 않는다**: 운영에서 쓰는 열쇠는
    사람이 받는 것이고, 검사가 그 줄의 해시를 갈아 끼우면 그 담당자가
    다음 날 못 들어온다 */
async function staff(): Promise<{ login: string; pw: string }> {
  const name = "zzexport-staff";
  const pw = "exp-" + Math.random().toString(36).slice(2, 12);
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error(`${UNI} 기관 줄이 없습니다 (npm run pcu:org)`);
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [name]);
  const hash = await hashPassword(pw);
  let id = old?.id;
  if (id) {
    await query(`UPDATE users SET password_hash = $2, status = 'active' WHERE id = $1`,
      [id, hash]);
    await query(`DELETE FROM memberships WHERE user_id = $1`, [id]);
  } else {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash,
                          status, locale, is_demo, must_reset_pw)
       VALUES ($1,$1,'학과 담당자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [name, hash]);
    id = row?.id as string;
  }
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'org_admin')`,
    [id, org.id]);
  return { login: name, pw };
}

/** 받은 본문과 머리글을 함께 본다. 쿠키는 그 자리의 것을 그대로 쓴다 */
async function get(ctx: BrowserContext, path: string): Promise<{
  status: number; type: string; body: string; bytes: number; res: APIResponse;
}> {
  const res = await ctx.request.get(`${BASE}${path}`);
  const buf = await res.body();
  return {
    status: res.status(),
    type: res.headers()["content-type"] ?? "",
    body: buf.toString("utf8"), bytes: buf.length, res,
  };
}

async function main(): Promise<void> {
  assertFreshServer();
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);
  const leaf = allLeaves(u)[0];

  /**
   * **엑셀 수식으로 읽히는 이름을 하나 넣어 둔다.**
   *
   * 명단에 `=cmd|...` 같은 이름이 한 줄 있으면, 그 CSV 를 연 담당자의
   * 엑셀에서 그것이 수식으로 실행된다. 막는 자리는 `cell()` 하나이고
   * 여기서 실제로 그 줄을 만들어 받은 글자를 센다.
   */
  const trap = "=cmd|' /c calc'!A1";
  const s = await makeStudent("zzexport-trap@test.invalid");
  /* **시연 계정이 아니어야 명단에 선다.** 담당자 화면과 내려받는 자료가
     시연·검사 계정을 거르므로, 시연으로 두면 이 줄이 CSV 에 아예 서지
     않고 **막는 자리를 세지 못한 채로 초록이 된다** */
  await query(`UPDATE users SET display_name = $2, is_demo = FALSE WHERE id = $1`,
    [s.id, trap]);
  await registerCampusStudent(s.id, UNI, leaf.leaf.code);

  /* 바탕은 **한 자리에 둔다**: 찍는 검사와 같은 묶음을 쓴다 */
  const cohort = await seedCampusCohort(UNI, "export");
  const tinyCode = cohort.tiny.code;

  const who = await staff();
  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...(gate ? { httpCredentials: gate } : {}),
    });
    const p = await login(ctx, who.login, who.pw);
    ok("담당자로 로그인한다", !p.url().includes("/login"), p.url());

    /* ── 1. 집계 화면이 좁히는 폼과 내려받기를 든다(§16·§18) ── */
    const home = await get(ctx, "/org/v3");
    ok("집계 화면이 선다", home.status === 200, String(home.status));
    for (const nm of ["from", "to", "college", "department"]) {
      ok(`좁히는 칸이 있다 — ${nm}`, home.body.includes(`name="${nm}"`));
    }
    ok("내려받기 링크 셋이 있다",
      home.body.includes("/org/v3/export/students.csv")
      && home.body.includes("/org/v3/export/departments.csv")
      && home.body.includes("/org/v3/report.pdf"));
    /* §17 — 미응시·진행중·완료가 한 자리에 선다 */
    ok("응시 상태별 학생이 선다", home.body.includes("아직 시작하지 않은 학생"));
    /* **메일·문자 발송 단추를 만들지 않는다**(§17). 없는 기능을 단추로
       두면 누른 담당자가 보낸 줄로 읽고 학생은 아무것도 받지 않는다 */
    ok("발송 단추를 만들지 않는다",
      !/(메일 보내기|문자 보내기|안내 발송|리마인드 발송)/.test(home.body));

    /* ── 2. 좁혀 본 주소가 그대로 선다 ── */
    const nar = await get(ctx, `/org/v3?college=${encodeURIComponent(leaf.college.code)}`);
    ok("단과대학으로 좁혀도 선다", nar.status === 200, String(nar.status));
    ok("좁혀 본 범위를 화면이 적는다", nar.body.includes("지금 보는 범위"));
    const bogus = await get(ctx, "/org/v3?from=abc&college=");
    /* **날짜 꼴이 아닌 값을 질의에 넘기지 않는다.** 넘기면 PostgreSQL 이
       그 자리에서 거절하고 화면이 통째로 멈춘다 */
    ok("날짜 꼴이 아닌 값에도 화면이 선다", bogus.status === 200, String(bogus.status));

    /* ── 3. 학생 응시 상태 CSV(§18) ── */
    const csv = await get(ctx, "/org/v3/export/students.csv");
    ok("명단 CSV 가 내려온다", csv.status === 200, String(csv.status));
    ok("CSV 로 내려온다", csv.type.includes("text/csv"), csv.type);
    ok("파일로 내려온다",
      (csv.res.headers()["content-disposition"] ?? "").includes("attachment"));
    /* 엑셀이 UTF-8 CSV 를 BOM 없이 열면 한글이 깨진다 */
    ok("BOM 이 앞에 있다", csv.body.charCodeAt(0) === 0xFEFF);
    ok("무엇으로 뽑은 것인지 파일이 적는다",
      csv.body.includes("조건") && csv.body.includes("뽑은 때"));
    ok("칸 이름이 적혀 있다",
      csv.body.includes("학번") && csv.body.includes("응시 상태"));
    /**
     * **개별 답변이 한 칸도 나가지 않는다**(§18·§23).
     *
     * 문항 번호 모양과 응답 값과 결과 묶음 코드를 찾는다. 한 줄이라도
     * 걸리면 그 파일은 나가면 안 되는 것을 들고 있다.
     */
    const leak = [
      /\bQ\d{1,3}\b/, /\b(TD|RF|OC)\d{2}\b/, /\bJ[1-8]\b/,
      /\bZ[1-5]_/, /value_int/, /문항/, /응답 값/,
    ].filter((re) => re.test(csv.body)).map(String);
    ok("개별 답변과 문항 번호가 들어 있지 않다", !leak.length, leak.join(" "));
    /* 엑셀 수식 주입을 막는다 */
    ok("수식으로 읽히는 이름 앞에 따옴표가 붙는다",
      csv.body.includes(`"'${trap}"`) || csv.body.includes(`'${trap}`),
      csv.body.split("\r\n").find((l) => l.includes("cmd"))?.slice(0, 60) ?? "");

    /* ── 4. 리마인드 대상(§17) ── */
    const none = await get(ctx, "/org/v3/export/students.csv?state=none");
    ok("리마인드 대상 CSV 가 내려온다", none.status === 200, String(none.status));
    ok("무엇으로 좁힌 것인지 제목이 적는다", none.body.includes("미응시"));
    const rows = none.body.split("\r\n").filter((l) => /^zz|^\d/.test(l));
    ok("미응시로 좁히면 완료 줄이 섞이지 않는다",
      !rows.some((l) => l.includes(",완료,")), rows.find((l) => l.includes(",완료,")) ?? "");

    /* ── 5. 학과별 집계 CSV(§18·§19) ── */
    const dep = await get(ctx, "/org/v3/export/departments.csv");
    ok("학과 집계 CSV 가 내려온다", dep.status === 200, String(dep.status));
    for (const k of ["대상자", "검사를 시작한 학생", "결과를 받은 학생", "완료율(%)"]) {
      ok(`집계 CSV 에 ${k} 가 있다`, dep.body.includes(k));
    }
    /* **5명 미만 칸은 수를 내지 않는다.** 가리는 것이 아니라 값이
       만들어지지 않고, 그 까닭이 그 줄에 적힌다 */
    const small = dep.body.split("\r\n").filter((l) => l.includes(`${MIN_CELL}명 미만`));
    for (const l of small) {
      const cols = l.split(",");
      ok(`5명 미만 줄에 수가 없다 — ${cols[0]?.slice(0, 18)}`,
        cols.slice(1, -1).every((c) => !/^\d+$/.test(c.trim())), l.slice(0, 80));
    }
    ok("5명 미만 학과 줄이 실제로 있다", small.length > 0,
      "그 줄이 없으면 이 검사가 가리는 자리를 세지 않는다");
    /* 그 학과로 좁혀 받아도 수가 나오지 않는다. **좁히는 조건이 가리는
       규칙보다 뒤에 적용되면** 네 명짜리 학과가 그 자리에서 드러난다 */
    const one = await get(ctx,
      `/org/v3/export/departments.csv?department=${encodeURIComponent(tinyCode)}`);
    /* **빈 표를 까닭 없이 내보내지 않는다.** 그 범위에 든 학생이 다섯이
       안 되면 집계가 아래 칸을 아예 만들지 않는데, 표만 비워 보내면 받은
       담당자는 내려받기가 깨진 줄로 읽고 다시 누른다 */
    ok("한 학과로 좁히면 수가 나오지 않고 그 까닭이 적힌다",
      one.status === 200
      && !/\n학과,[\s\S]*\n[^,\r\n]+,\d/.test(one.body)
      && one.body.includes(`${MIN_CELL}명이 안 되어`),
      `${one.status} ${one.body.split("\r\n").slice(0, 8).join(" | ").slice(0, 160)}`);

    /* ── 6. 운영 요약(§19) ── */
    const rep = await get(ctx, "/org/v3/report");
    ok("운영 요약 쪽이 선다", rep.status === 200, String(rep.status));
    ok("표지가 혼자 말한다",
      rep.body.includes("대학 운영 요약") && rep.body.includes("범위"));
    ok("무엇을 하지 않는지 적는다", rep.body.includes("이 자료로 하지 않는 것"));
    ok("개인 응답이 들어 있지 않다고 적는다",
      rep.body.includes("개인 응답"));
    /* **담당자 화면에 안쪽 코드를 적지 않는다**(§16) */
    const codes = [/\bZ[1-5]_[A-Z]/, /\bNOT_EXPLORED\b/, /\bTD\d{2}\b/]
      .filter((re) => re.test(rep.body)).map(String);
    ok("안쪽 코드가 새지 않는다", !codes.length, codes.join(" "));

    const pdf = await get(ctx, "/org/v3/report.pdf");
    ok("운영 요약 PDF 가 내려온다", pdf.status === 200, String(pdf.status));
    ok("PDF 로 내려온다", pdf.type.includes("application/pdf"), pdf.type);
    ok("빈 종이가 아니다", pdf.bytes > 5000, `${pdf.bytes}바이트`);
    await ctx.close();

    /**
     * ── 7. 권한(§23) ──
     *
     * **막히는 것만 세면 전부 막는 코드가 이 검사를 통과한다.** 그래서
     * 위에서 담당자가 열리는 것을 먼저 보고, 여기서 학생이 막히는 것을
     * 짝으로 본다.
     */
    const st = await makeStudent("zzexport-student@test.invalid");
    const sctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ...(gate ? { httpCredentials: gate } : {}),
    });
    const sp = await login(sctx, "zzexport-student@test.invalid", st.pw);
    ok("학생으로 로그인한다", !sp.url().includes("/login"), sp.url());
    for (const path of [
      "/org/v3", "/org/v3/export/students.csv",
      "/org/v3/export/departments.csv", "/org/v3/report", "/org/v3/report.pdf",
    ]) {
      const r = await get(sctx, path);
      /* 담당자 자료가 학생에게 **열리지 않는다.** 로그인 쪽으로 보내든
         거절하든 담긴 글이 나가지 않으면 된다 */
      const leaked = r.status === 200 && !/login|로그인/.test(r.body)
        && (r.body.includes("대상자") || r.body.includes("학번"));
      ok(`학생에게 ${path} 가 열리지 않는다`, !leaked, `${r.status} ${r.type}`);
    }
    await sctx.close();
  } finally {
    await browser.close();
    /* **쓴 자료는 가운데서 터져도 지운다.** `finally` 밖에 두면 한 번
       걸린 날 남은 줄이 다음 사람의 집계에 섞인다 */
    await clearCampusCohort([
      ...cohort.logins,
      "zzexport-trap@test.invalid", "zzexport-student@test.invalid",
    ]);
  }
  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) process.exit(1);
}
void main();
