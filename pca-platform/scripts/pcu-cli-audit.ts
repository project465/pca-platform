/**
 * **학교 담당자의 일 가운데 CLI 가 필요한 것이 있는가**(규격 §24·§52).
 *
 * 묻는 것은 `그 쪽이 서는가` 가 아니다. **담당자가 로그인한 뒤 눌러서
 * 그 일을 끝낼 수 있는가**다. 쪽이 전부 200 이면서 어느 쪽에서도 그리로
 * 가는 길이 없을 수 있고, 그러면 그 일은 주소를 아는 사람만 할 수 있는
 * 일이 된다 — 주소를 알려 주는 것이 곧 CLI 의존이다.
 *
 * 그래서 업무마다 셋을 센다.
 *
 * - **끝내는 자리**가 담당자 쿠키로 열리는가(200 과 내용 종류)
 * - **들어가는 길**이 그 앞 쪽의 글자에 있는가(눌러서 닿는가)
 * - 그 업무가 **CLI 말고 다른 길이 없는 상태로 남아 있지 않은가**
 *
 * 그리고 반대쪽도 센다: 담당자 화면에 `Railway` 나 `psql` 이나
 * `npm run` 이 적혀 있으면, 그 화면은 할 일을 화면 밖으로 떠넘긴 것이다.
 *
 * **본사 운영용 CLI는 세지 않는다**(§52). 계약 등록과 Core 공개와 DB
 * 올리기와 진단은 우리 일이고, 학교 담당자가 그 일을 하지 않는다. 다만
 * 그 목록을 **여기 적어 두어야** 다음 사람이 학교 업무를 그 목록에
 * 끼워 넣지 못한다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npm run pcu:cli
 */
import {
  loadEnv, BASE, assertFreshServer, gateCreds, login,
} from "./_loop-fixture";
loadEnv();
import { chromium, type BrowserContext } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { clearCampusCohort, seedCampusCohort } from "./_campus-fixture";
import { hashPassword } from "../src/lib/password";

const UNI = "PCU";
let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

/**
 * 학교 담당자가 실제로 하는 일.
 *
 * `at` 이 그 일을 끝내는 자리이고 `from` 이 들어가는 길이 적혀 있어야 할
 * 앞 쪽이다. `needle` 은 그 앞 쪽에서 찾을 글자인데, 주소를 그대로 쓰는
 * 까닭은 **링크의 글자가 아니라 가는 자리**를 세려는 것이다: 단추의 말은
 * 바뀌어도 되고 가는 자리가 없어지면 안 된다.
 */
type Task = {
  id: string;
  what: string;
  at: string;
  kind: "html" | "csv" | "pdf";
  from: string;
  needle: string;
  /** 그 쪽에서 그 일을 실제로 끝내는 자리(폼이나 단추)가 있는가 */
  acts?: string[];
};

const TASKS: Task[] = [
  {
    id: "T1", what: "집계를 연다 (누가 몇 명 어디까지 왔는가)",
    at: "/org/v3", kind: "html", from: "/org", needle: "/org/v3",
    acts: ["아직 시작하지 않은 학생"],
  },
  {
    id: "T2", what: "학생 명단을 연다",
    at: "/org/v3/students", kind: "html", from: "/org/v3",
    needle: "/org/v3/students",
  },
  {
    id: "T3", what: "학생 한 명을 등록해 계정을 낸다",
    at: "/org/v3/students", kind: "html", from: "/org/v3",
    needle: "/org/v3/students", acts: ['name="student_id"', 'name="department_code"'],
  },
  {
    id: "T4", what: "명단을 CSV 로 한꺼번에 등록한다",
    at: "/org/v3/students/import", kind: "html", from: "/org/v3/students",
    needle: "/org/v3/students/import", acts: ["<textarea", "<form"],
  },
  {
    id: "T5", what: "비밀번호를 다시 낸다",
    at: "/org/v3/students", kind: "html", from: "/org/v3",
    needle: "/org/v3/students", acts: ['value="rotate"'],
  },
  {
    id: "T6", what: "계정을 멈추고 다시 연다",
    at: "/org/v3/students", kind: "html", from: "/org/v3",
    needle: "/org/v3/students", acts: ['value="status"'],
  },
  {
    id: "T7", what: "끝낸 학생에게 재응시를 한 번 열어 준다",
    at: "/org/v3/students?state=scored", kind: "html", from: "/org/v3",
    needle: "state=scored", acts: ['value="retake"'],
  },
  {
    id: "T8", what: "아직 안 친 학생만 좁혀 본다",
    at: "/org/v3/students?state=none", kind: "html", from: "/org/v3",
    needle: "state=none",
  },
  {
    id: "T9", what: "학과로 좁혀 본다",
    at: "/org/v3/students", kind: "html", from: "/org/v3/students",
    needle: 'name="department"', acts: ['name="q"'],
  },
  {
    id: "T10", what: "명단을 CSV 로 내려받는다",
    at: "/org/v3/export/students.csv", kind: "csv", from: "/org/v3",
    needle: "/org/v3/export/students.csv",
  },
  {
    id: "T11", what: "학과 집계를 CSV 로 내려받는다",
    at: "/org/v3/export/departments.csv", kind: "csv", from: "/org/v3",
    needle: "/org/v3/export/departments.csv",
  },
  {
    id: "T12", what: "대학 운영 요약 PDF 를 뽑는다",
    at: "/org/v3/report.pdf", kind: "pdf", from: "/org/v3",
    needle: "/org/v3/report.pdf",
  },
  {
    id: "T13", what: "운영 요약을 화면에서 먼저 본다",
    at: "/org/v3/report", kind: "html", from: "/org/v3",
    needle: "/org/v3/report",
  },
];

/**
 * 본사 운영용 CLI. **학교 담당자의 일이 아니다.**
 *
 * 적어 두는 까닭은 허용 목록이 필요해서가 아니라, 다음 사람이 학교 업무를
 * 이 목록에 끼워 넣는 것을 막으려는 것이다. 줄마다 **왜 우리 일인가**가
 * 함께 적혀 있어야 그 판단을 되짚을 수 있다.
 */
const HQ_ONLY: { cmd: string; why: string }[] = [
  { cmd: "pcu:org", why: "기관과 담당자 계정 발급 — 계약이 선 뒤 본사가 한 번 한다" },
  { cmd: "pcu:students", why: "발급 복구용. 같은 일을 담당자는 화면에서 한다(T3·T4·T5)" },
  { cmd: "pcu:diag", why: "장애를 좁히는 진단. 읽기만 한다" },
  { cmd: "pcu:open", why: "학생 공개 상태 확인 — 어느 Core 를 파는가는 본사 결정이다" },
  { cmd: "db:upgrade", why: "스키마 올리기 — 배포 작업이다" },
  { cmd: "db:verify", why: "배포 뒤 확인. 읽기만 한다" },
  { cmd: "ops:check", why: "배포본 상태 확인. 읽기만 한다" },
];

/** 담당자 하나. **발급 계정을 건드리지 않는다** */
async function staff(): Promise<{ login: string; pw: string }> {
  const name = "zzcli-staff";
  const pw = "cli-" + Math.random().toString(36).slice(2, 12);
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

async function get(ctx: BrowserContext, path: string): Promise<{
  status: number; type: string; body: string; bytes: number;
}> {
  const res = await ctx.request.get(`${BASE}${path}`);
  const buf = await res.body();
  return {
    status: res.status(), type: res.headers()["content-type"] ?? "",
    body: buf.toString("utf8"), bytes: buf.length,
  };
}

async function main(): Promise<void> {
  assertFreshServer();
  const cohort = await seedCampusCohort(UNI, "cli");
  const who = await staff();
  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  /** 업무마다 한 줄. 끝에서 표로 내놓는다(§52) */
  const table: { id: string; what: string; where: string; cli: string }[] = [];
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...(gate ? { httpCredentials: gate } : {}),
    });
    const p = await login(ctx, who.login, who.pw);
    ok("담당자로 로그인한다", !p.url().includes("/login"), p.url());

    /* **로그인한 뒤 서는 자리에서 시작한다.** 그 자리에서 집계로 가는 길이
       없으면 담당자는 주소를 받아 적어야 하고, 그것이 CLI 의존이다 */
    const landed = new URL(p.url()).pathname;
    ok("로그인한 자리가 담당자 화면이다", landed.startsWith("/org"), landed);

    const seen = new Map<string, string>();
    const bodyOf = async (path: string): Promise<string> => {
      const hit = seen.get(path);
      if (hit !== undefined) return hit;
      const r = await get(ctx, path);
      seen.set(path, r.body);
      return r.body;
    };

    console.log("\n[1] 업무마다 끝내는 자리와 들어가는 길");
    for (const t of TASKS) {
      const r = await get(ctx, t.at);
      const typeOk = t.kind === "csv" ? /csv|text\/plain/.test(r.type)
        : t.kind === "pdf" ? r.type.includes("pdf")
        : r.type.includes("html");
      const open = r.status === 200 && typeOk && r.bytes > 200;
      ok(`${t.id} 끝내는 자리가 열린다 — ${t.what}`, open,
        `${r.status} ${r.type} ${r.bytes}B`);
      const from = await bodyOf(t.from);
      const linked = from.includes(t.needle);
      ok(`${t.id} 눌러서 닿는다 (${t.from} → ${t.at})`, linked);
      let acted = true;
      for (const a of t.acts ?? []) {
        const has = r.body.includes(a);
        if (!has) acted = false;
        ok(`${t.id} 그 자리에서 끝낸다 — ${a}`, has);
      }
      table.push({
        id: t.id, what: t.what, where: t.at,
        cli: open && linked && acted ? "필요 없음" : "확인 필요",
      });
    }

    /* ── [2] 담당자 화면이 할 일을 화면 밖으로 떠넘기지 않는가(§24) ── */
    console.log("\n[2] 담당자 화면에 콘솔·CLI 를 적지 않는가");
    const FORBID = [
      "Railway", "psql", "npm run", "DATABASE_URL", "tsx scripts",
      "서버에 접속", "관리자에게 문의하여 DB",
    ];
    for (const path of ["/org", "/org/v3", "/org/v3/students",
      "/org/v3/students/import", "/org/v3/report"]) {
      const body = await bodyOf(path);
      const hit = FORBID.filter((w) => body.includes(w));
      ok(`${path} 에 콘솔 지시가 없다`, hit.length === 0, hit.join(" · "));
    }

    /* ── [3] 본사 운영용 CLI 목록이 학교 업무를 품지 않는가(§52) ── */
    console.log("\n[3] 본사 운영용 CLI 와 학교 업무가 갈려 있는가");
    const scripts = (await import("../package.json", { with: { type: "json" } }))
      .default.scripts as Record<string, string>;
    for (const h of HQ_ONLY) {
      ok(`본사 CLI 가 실제로 있다 — ${h.cmd}`, Boolean(scripts[h.cmd]));
      /* **글자 수를 세지 않는다.** 처음에는 까닭이 스무 자를 넘는지
         보았는데, 그 줄이 재는 것은 설명의 길이이고 아무 뜻이 없다(멀쩡한
         줄 넷이 걸렸다). 세야 하는 것은 **그 CLI 가 학교 업무를 끝내는
         유일한 길이 아닌가**다: 학교 업무마다 화면이 있으면(아래 줄) 그
         CLI 는 본사 쪽에 남아도 담당자를 붙들지 않는다 */
      ok(`왜 본사 일인지 적혀 있다 — ${h.cmd}`, h.why.trim().length > 0);
    }
    /* **학교 업무를 끝내는 자리가 전부 화면이다.** 한 업무라도 `확인 필요`
       면 그 업무는 지금 CLI 나 주소 전달로만 되는 상태다 */
    const left = table.filter((r) => r.cli !== "필요 없음");
    ok("학교 운영 업무 CLI 의존 0", left.length === 0,
      left.map((r) => r.id).join(" · "));

    /* ── [4] 표를 내놓는다(§52) ── */
    console.log("\n[4] 학교 운영 업무와 끝내는 자리");
    console.log("  업무                                             자리                               CLI");
    for (const r of table) {
      console.log(`  ${r.id} ${r.what.padEnd(44)} ${r.where.padEnd(34)} ${r.cli}`);
    }
    console.log("\n  본사 운영용 CLI (학교 담당자가 쓰지 않는다)");
    for (const h of HQ_ONLY) console.log(`  ${h.cmd.padEnd(16)} ${h.why}`);
  } finally {
    await browser.close();
    await clearCampusCohort(cohort.logins);
  }

  console.log(`\n통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) { for (const b of bad) console.log(`  - ${b}`); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
