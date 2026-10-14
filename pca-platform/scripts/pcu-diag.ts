/**
 * **운영에서 종이와 작업공간이 왜 안 되는지 그 자리에서 읽는다.** 읽기만 한다.
 *
 *   npm run pcu:diag              가장 최근에 낸 학교 학생 하나
 *   npm run pcu:diag 202612345    그 학번
 *
 * 운영 Canary 에서 결과지까지는 섰는데 종이와 `/me` 가 깨졌다. 그 둘은
 * **이 기계에서 운영과 같은 배치로 띄워도 재현되지 않는다**(로컬 45가지가
 * 전부 통과한다). 그러면 남는 답은 운영 자리에만 있는 값이다: 그 컨테이너의
 * 환경값과 그 DB 의 칸과 그 학생의 줄이다. 밖에서는 그 셋을 볼 수 없으므로
 * **그 자리에서 한 번 치고 읽는 자리**를 둔다.
 *
 * **고치지 않는다.** INSERT 도 UPDATE 도 DELETE 도 없고 등록부 파일도
 * 건드리지 않는다. 종이가 그려지는지는 브라우저를 한 번 띄워 보는 데까지이고
 * 그 결과를 DB 에 적지 않는다.
 *
 * **이름과 메일을 적지 않는다.** 운영자가 사람을 고를 수 있는 만큼만 적는다.
 */
import { existsSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { appEnv, stagingGate } from "../src/lib/env";
import { resolveChromium } from "../src/lib/me-v3/result/pdf";

const WANT = (process.argv[2] ?? "").trim();
const UNI = process.env.UNI ?? "PCU";

const line = (k: string, v: string): void =>
  console.log(`  ${k.padEnd(26)}${v}`);
const head = (t: string): void => console.log(`\n── ${t}\n`);
const yes = (b: boolean): string => (b ? "있다" : "없다");

/** 이름을 그대로 적지 않는다. 첫 글자만 남긴다 */
function mask(s: string | null | undefined): string {
  const t = (s ?? "").trim();
  if (!t) return "(비어 있음)";
  return `${t.slice(0, 1)}${"○".repeat(Math.max(1, t.length - 1))}`;
}

/**
 * `/me` 와 종이가 읽는 표와 칸.
 *
 * **표만 세지 않는다.** 표가 선 날 칸이 빠져 있으면 `5 / 5` 가 찍히고 화면은
 * 그대로 500 이다(`career_profiles` 가 그렇게 났다). 그래서 칸까지 적는다.
 */
const NEEDS: Array<[string, string[]]> = [
  ["v3_attempts", ["id", "user_id", "tier", "core_code", "specialization_code",
    "university_code", "college_code", "department_code", "submitted_at"]],
  ["v3_snapshots", ["attempt_id", "result_model", "module_versions"]],
  ["career_profiles", ["user_id", "core_code", "recomputed_at"]],
  ["v3_experiences", ["user_id", "started_on", "ended_on"]],
  ["v3_actions", ["user_id", "state", "td_code", "axis_code"]],
  ["v3_applications", ["user_id"]],
  ["campus_students", ["user_id", "university_code", "department_code"]],
  ["analytics_events", ["name"]],
  ["job_failures", ["kind", "trace_id", "message"]],
];

async function schema(): Promise<void> {
  head("`/me` 와 종이가 읽는 표와 칸");
  const rows = await query<{ t: string; c: string }>(
    `SELECT table_name AS t, column_name AS c
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [NEEDS.map(([t]) => t)],
  );
  const have = new Set(rows.map((r) => `${r.t}.${r.c}`));
  const tabs = new Set(rows.map((r) => r.t));
  let missing = 0;
  for (const [t, cols] of NEEDS) {
    if (!tabs.has(t)) {
      missing += 1; line(t, "표가 없다 — npm run db:upgrade 를 치십시오");
      continue;
    }
    const gone = cols.filter((c) => !have.has(`${t}.${c}`));
    missing += gone.length;
    line(t, gone.length ? `칸이 없다: ${gone.join(" · ")}` : "표와 칸이 전부 있다");
  }
  console.log(missing
    ? `\n  빠진 것 ${missing}가지. 이것이 그 화면의 500 입니다.`
    : "\n  빠진 것 없음. 화면이 깨진 까닭은 스키마가 아닙니다.");
}

async function env(): Promise<void> {
  head("이 컨테이너가 들고 있는 값");
  const { bin, tried } = resolveChromium();
  line("APP_ENV", appEnv());
  line("PLATFORM_URL", process.env.PLATFORM_URL ?? "(비어 있음)");
  line("PDF_BASE", process.env.PDF_BASE ?? "(비어 있음)");
  line("REPORT_PDF_DIR", process.env.REPORT_PDF_DIR ?? "(비어 있음)");
  line("STAGING_BASIC_AUTH", yes(Boolean(stagingGate())));
  line("CHROMIUM_PATH", process.env.CHROMIUM_PATH ?? "(비어 있음)");
  line("브라우저 실제 자리", bin ?? `못 찾았다 (찾아본 자리 ${tried.join(" ")})`);
  line("playwright", yes(existsSync("/app/node_modules/playwright")
    || existsSync("node_modules/playwright")));
}

type Who = { id: string; login: string; name: string; status: string };

async function who(): Promise<Who | null> {
  if (WANT) {
    return queryOne<Who>(
      `SELECT u.id::text, u.login_id AS login, u.display_name AS name, u.status
         FROM users u JOIN campus_students s ON s.user_id = u.id
        WHERE s.university_code = $1 AND s.student_id = $2`, [UNI, WANT]);
  }
  /* 적어 주지 않으면 **가장 최근에 낸 학교 학생**을 고른다. 운영자가 번호를
     모르고 치는 일이 많고, 깨진 자리를 보려면 끝까지 간 사람이 필요하다 */
  return queryOne<Who>(
    `SELECT u.id::text, u.login_id AS login, u.display_name AS name, u.status
       FROM v3_attempts a
       JOIN users u ON u.id = a.user_id
      WHERE a.university_code = $1 AND a.submitted_at IS NOT NULL
      ORDER BY a.submitted_at DESC LIMIT 1`, [UNI]);
}

async function student(w: Who): Promise<void> {
  head(`그 학생 (${UNI})`);
  line("아이디", w.login);
  line("이름", mask(w.name));
  line("상태", w.status);
  const cs = await queryOne<{ col: string; dep: string; sp: string | null }>(
    `SELECT college_code col, department_code dep, specialization sp
       FROM campus_students WHERE user_id = $1::bigint`, [w.id]);
  line("학교 안 신분", cs
    ? `${cs.col} · ${cs.dep} · ${cs.sp ?? "갈래 없음"}`
    : "campus_students 줄이 없다");
  const mem = await query<{ code: string; role: string }>(
    `SELECT o.code, m.role FROM memberships m
       JOIN organizations o ON o.id = m.org_id
      WHERE m.user_id = $1::bigint`, [w.id]);
  line("기관 소속", mem.length
    ? mem.map((m) => `${m.code}/${m.role}`).join(" · ")
    : "없다 — 담당자 화면이 이 학생을 못 센다");
}

async function attempts(w: Who): Promise<void> {
  head("응시와 굳은 결과");
  const rows = await query<{
    id: string; tier: string; core: string; sp: string | null;
    uni: string | null; dep: string | null; sub: string | null;
    snap: string | null; model: string; bank: string | null; ui: string | null;
  }>(
    `SELECT a.id::text, a.tier, a.core_code core, a.specialization_code sp,
            a.university_code uni, a.department_code dep,
            a.submitted_at::text sub,
            (SELECT (s.module_versions->>'core_version') FROM v3_snapshots s
              WHERE s.attempt_id = a.id ORDER BY s.id DESC LIMIT 1) snap,
            (SELECT (s.result_model IS NOT NULL)::text FROM v3_snapshots s
              WHERE s.attempt_id = a.id ORDER BY s.id DESC LIMIT 1) model,
            (SELECT (s.module_versions->>'item_bank_version') FROM v3_snapshots s
              WHERE s.attempt_id = a.id ORDER BY s.id DESC LIMIT 1) bank,
            (SELECT (s.module_versions->>'result_ui_version') FROM v3_snapshots s
              WHERE s.attempt_id = a.id ORDER BY s.id DESC LIMIT 1) ui
       FROM v3_attempts a WHERE a.user_id = $1::bigint
      ORDER BY a.id DESC LIMIT 5`, [w.id]);
  if (!rows.length) { line("응시", "한 줄도 없다"); return; }
  for (const r of rows) {
    line(`응시 ${r.id}`,
      `${r.tier} · ${r.core} · ${r.sp ?? "갈래 없음"} · ${r.uni ?? "학교 없음"}`
      + ` · ${r.dep ?? "학과 없음"} · ${r.sub ? "제출" : "진행 중"}`);
    line("  굳은 결과", r.snap
      ? `${r.snap} · 결과 모델 ${r.model === "true" ? "있다" : "없다"}`
        + ` · 은행 ${r.bank ?? "(안 적힘)"} · 결과지 화면 ${r.ui ?? "(안 적힘)"}`
      : "스냅샷이 없다 — 종이도 없다(404)");
  }
}

/**
 * `/me` 가 고르는 Core.
 *
 * **같은 질의를 그대로 쓴다.** 여기서 따로 판단하면 화면과 이 보고가 서로
 * 다른 말을 할 수 있고, 다르다는 것을 아무도 모른다(설계 원칙 10).
 */
async function core(w: Who): Promise<void> {
  head("`/me` 가 고르는 Core");
  const a = await queryOne<{ core: string }>(
    `SELECT core_code AS core FROM v3_attempts
      WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [w.id]);
  const prof = await queryOne<{ core: string; at: string | null }>(
    `SELECT core_code AS core, recomputed_at::text at FROM career_profiles
      WHERE user_id = $1 ORDER BY recomputed_at DESC NULLS LAST LIMIT 1`, [w.id]);
  line("가장 최근 응시의 Core", a?.core ?? "없다");
  line("지금 값의 Core", prof ? `${prof.core} · ${prof.at ?? "반영 전"}` : "줄이 없다");
  line("그래서 고르는 Core", a?.core ?? prof?.core ?? "둘 다 없다 — /cores 로 보낸다");
}

/**
 * **발급한 계정과 응시한 계정이 같은가.**
 *
 * 운영 Canary 에서 둘이 갈렸다. 학교가 `pcu:students` 로 발급한 계정은
 * 학번을 들고 있고 `campus_students` 에 줄이 있다. 그런데 실제로 응시한
 * 계정은 아이디가 없고 그 줄도 없었다. 그러면 담당자 화면은 그 응시를 그
 * 학과의 학생으로 세고, 발급받은 학생은 아직 아무것도 하지 않은 상태다.
 *
 * **세션은 여기서 볼 수 없다**(이 자리는 명령줄이다). A 와 B 를 적고,
 * C 는 브라우저에서 그 사람으로 들어가 `/me` 를 열어 맞춘다.
 */
async function identity(): Promise<void> {
  head(`발급한 계정과 응시한 계정 (${UNI})`);
  const issued = await query<{ sid: string; uid: string; login: string | null }>(
    `SELECT s.student_id sid, s.user_id::text uid, u.login_id login
       FROM campus_students s JOIN users u ON u.id = s.user_id
      WHERE s.university_code = $1 ORDER BY s.student_id`, [UNI]);
  line("발급한 계정", issued.length
    ? issued.map((x) => `${x.sid}(user ${x.uid})`).join(" · ")
    : "한 줄도 없다 — npm run pcu:students 로 발급합니다");
  const took = await query<{ aid: string; uid: string; login: string | null;
    dep: string | null; sub: string | null; reg: string }>(
    `SELECT a.id::text aid, a.user_id::text uid, u.login_id login,
            a.department_code dep, a.submitted_at::text sub,
            (EXISTS (SELECT 1 FROM campus_students s
                      WHERE s.user_id = a.user_id
                        AND s.university_code = a.university_code))::text reg
       FROM v3_attempts a JOIN users u ON u.id = a.user_id
      WHERE a.university_code = $1 ORDER BY a.id DESC LIMIT 10`, [UNI]);
  if (!took.length) { line("학교 맥락이 적힌 응시", "한 줄도 없다"); return; }
  let stray = 0;
  for (const t of took) {
    if (t.reg !== "true") stray += 1;
    line(`응시 ${t.aid}`,
      `user ${t.uid} · 아이디 ${t.login ?? "없다"} · ${t.dep ?? "학과 없음"}`
      + ` · ${t.sub ? "제출" : "진행 중"}`
      + ` · ${t.reg === "true" ? "발급 계정이다" : "발급 계정이 아니다"}`);
  }
  console.log(stray
    ? `\n  **신분이 갈린 응시 ${stray}건.** 발급하지 않은 계정에 학교가`
      + " 적혀 있습니다.\n  담당자 집계가 그 줄을 그 학과의 학생으로 셉니다."
    : "\n  갈린 줄 없음. 학교가 적힌 응시가 전부 발급 계정의 것입니다.");
}

async function pdfFails(): Promise<void> {
  head("종이가 깨진 기록 (`job_failures`)");
  const rows = await query<{ at: string; trace: string | null; msg: string }>(
    `SELECT created_at::text at, trace_id trace, message msg
       FROM job_failures WHERE kind = 'pdf'
      ORDER BY created_at DESC LIMIT 5`,
  ).catch(() => []);
  if (!rows.length) {
    console.log("  줄이 없다. 종이를 그리다 **던진 적이 없다**는 뜻입니다.");
    console.log("  그러면 남는 길은 둘입니다: 요청이 이 자리에 닿지 않았거나,");
    console.log("  그리는 동안 프로세스가 끊겼습니다(메모리가 모자라면 그렇습니다).");
    console.log("  Railway 로그에서 `[v3-pdf]` 를 찾아 시작 줄이 있는지 보십시오.");
    return;
  }
  for (const r of rows) console.log(`  ${r.at}  ${r.trace ?? "-"}\n    ${r.msg}`);
}

/**
 * 종이를 그릴 수 있는 자리인가.
 *
 * 열쇠 없이 할 수 있는 데까지만 본다: 브라우저가 뜨는가(`step=browser`)와
 * **제 주소로 다시 들어갈 수 있는가**(`step=open`). 그 둘이 운영에서만 나는
 * 실패의 거의 전부다. 로그인이 필요한 결과 쪽까지는 가지 않는다: 여기서
 * 열쇠를 만들어 내면 그것이 결과지를 여는 두 번째 길이 된다.
 */
async function canDraw(): Promise<void> {
  head("종이를 그릴 수 있는가");
  const { bin, tried } = resolveChromium();
  try {
    const { chromium } = await import("playwright");
    const b = await chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      ...(bin ? { executablePath: bin } : {}),
    });
    line("브라우저가 뜬다", `${b.version()}`);
    await b.close();
  } catch (e) {
    line("브라우저가 뜨지 않는다",
      `${String((e as Error).message).split("\n")[0].slice(0, 160)}`
      + ` / 찾아본 자리 ${tried.join(" ")}`);
    return;
  }
  const base = (process.env.PDF_BASE ?? "").trim()
    || (process.env.PLATFORM_URL ?? "").trim();
  if (!base) { line("제 주소", "PLATFORM_URL 이 비어 있어 두드릴 자리가 없다"); return; }
  const t0 = Date.now();
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/api/health`,
      { signal: AbortSignal.timeout(20000) });
    line("제 주소로 들어간다", `${r.status} · ${Date.now() - t0}ms · ${base}`);
  } catch (e) {
    line("제 주소로 못 들어간다",
      `${String((e as Error).message).slice(0, 160)} · ${base}`);
    console.log("  그리는 브라우저도 이 자리로 들어갑니다. 여기서 막히면");
    console.log("  종이는 `step=open` 으로 떨어집니다.");
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 이 없습니다."); process.exit(2);
  }
  console.log("\n── 배재대 Canary 진단 (읽기만 합니다)");
  await env();
  await schema();
  const w = await who();
  if (!w) {
    head("그 학생");
    console.log(WANT
      ? `  ${UNI} 에 학번 ${WANT} 인 학생이 없습니다.`
      : `  ${UNI} 로 제출한 응시가 한 줄도 없습니다.`);
  } else {
    await student(w);
    await attempts(w);
    await core(w);
  }
  await identity();
  await pdfFails();
  await canDraw();
  console.log("\n  읽기만 했습니다. 한 줄도 바꾸지 않았습니다.\n");
  process.exit(0);
}

main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
