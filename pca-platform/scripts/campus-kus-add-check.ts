/**
 * **고려대 세종에 더한 두 학과가 학생 · 담당자 화면이 읽는 자리마다 서는가**(2026-11-03).
 *
 * 지능형반도체공학과(`KUS26_INTSEMI`, 별칭 `지능형반도체공학부`) · 신소재화학과(`KUS26_MATCHEM`).
 * 2026 세종 기업탐방(비전세미콘) 명단에 이 두 학과 학생이 있는데 등록부에 자리가 없어 계정을 낼 수 없었다.
 *
 * 화면은 전부 등록부에서 읽는다: 학과 쪽(`/campus/kus/d/<코드>`)은 `findLeaf` · `statusOf`, 목록 배지와
 * 단과대학 칸(`?c=SCITECH`)은 `leavesOf` · `statusOf`, 담당자 학과 거르기는 `leafChoices`, 내려받기의
 * 학과 칸은 `campusNames().dept`. 그래서 이 검사는 그 함수들을 직접 부르고, CSV 일괄 등록은 **실제 DB 에
 * 넣어 보고** 명단 · 거르기 · 내려받기에서 다시 읽은 뒤 치운다.
 *
 *   DATABASE_URL=postgres:///cm_dev npm run campus:kus-add
 *
 * 학번 · 이름은 지어낸 시험 값이다(`9999` 로 시작). 실제 학생 정보를 넣지 않는다.
 */
import { loadEnv } from "./_loop-fixture";
loadEnv();
import { query, queryOne } from "../src/lib/db";
import {
  allLeaves, findLeaf, leavesOf, mappingStatusOf, offered, statusOf, university,
} from "../src/lib/campus/registry";
import { campusNames, leafChoices } from "../src/lib/campus/labels";
import { checkStudent } from "../src/lib/campus/students";
import { applyImport, listStudents, parseStudentCsv, previewImport } from "../src/lib/campus/manage";
import { studentStatusCsv } from "../src/lib/campus/export";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\/(\/cm_dev\b|[^@/]*@?(127\.0\.0\.1|localhost)(:\d+)?\/)/.test(URL_)) {
  console.error(`로컬 개발 DB 가 아니다: ${URL_}`); process.exit(2);
}

let pass = 0; const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}${saw ? `  ${saw}` : ""}`); }
  else { bad.push(what); console.log(`  걸림  ${what}  ${saw}`); }
}

const UNI = "KUS";
const NEW = [
  { code: "KUS26_INTSEMI", name: "지능형반도체공학과", core: "EE_CORE_V1", spec: "SPEC_EE_SEMI", aliases: ["지능형반도체공학부"] },
  { code: "KUS26_MATCHEM", name: "신소재화학과", core: "ME_CORE_V3", spec: "SPEC_ME_GENERAL", aliases: [] as string[] },
];

async function main(): Promise<void> {
  const u = university(UNI);
  if (!u) throw new Error("등록부에 KUS 가 없다");
  const leaves = allLeaves(u);
  console.log(`KUS 자리 ${leaves.length}`);

  console.log("\n1. 등록부");
  ok("KUS 학과 자리가 26 → 28", leaves.length === 28, String(leaves.length));
  const open = new Set(u.student_open?.mode === "LEAF" ? u.student_open.leaves ?? [] : []);
  for (const n of NEW) {
    const f = findLeaf(u, n.code);
    ok(`${n.name}: 자리가 있다`, !!f);
    if (!f) continue;
    ok(`${n.name}: 이름 · 종류`, f.leaf.name === n.name && f.leaf.kind === "department");
    ok(`${n.name}: 과학기술대학(SCITECH) 칸`, f.college.code === "SCITECH", f.college.code);
    ok(`${n.name}: 묶음 ${n.core} · ${n.spec} · 임시 연결`,
      f.leaf.core_code === n.core && f.leaf.specialization === n.spec && f.leaf.provisional === true);
    ok(`${n.name}: 학교 열린 목록에 있다`, open.has(n.code));
    ok(`${n.name}: 매핑 EXACT`, mappingStatusOf(f.leaf) === "EXACT", mappingStatusOf(f.leaf));
    /* 운영과 같게: 미리보기 문을 열지 않고 본다 */
    ok(`${n.name}: 학생 상태 검사 가능(READY)`, statusOf(u, f, undefined, { preview: false }) === "READY",
      statusOf(u, f, undefined, { preview: false }));
    ok(`${n.name}: 소문자 코드로도 찾는다(/campus/kus/d/${n.code.toLowerCase()})`, findLeaf(u, n.code.toLowerCase())?.leaf.code === n.code);
    ok(`${n.name}: 별칭 ${JSON.stringify(n.aliases)}`, JSON.stringify(f.leaf.aliases ?? []) === JSON.stringify(n.aliases));
  }
  const codes = leaves.map((l) => l.leaf.code);
  ok("코드가 겹치지 않는다", new Set(codes).size === codes.length);
  const names = leaves.flatMap((l) => [l.leaf.name, ...(l.leaf.aliases ?? [])]);
  ok("이름 · 별칭이 다른 자리와 겹치지 않는다", new Set(names).size === names.length);

  console.log("\n2. 학과 목록(배지 · 단과대학 칸)");
  const cat = u.catalogs[0];
  const live = leavesOf(cat).filter(offered);
  for (const n of NEW) {
    const row = live.find((l) => l.leaf.code === n.code);
    ok(`${n.name}: 목록에 보인다 · 과학기술대학 칸`, !!row && row.college.code === "SCITECH");
    ok(`${n.name}: 배지 '검사 가능'`, !!row && statusOf(u, row, undefined, { preview: false }) === "READY");
  }

  console.log("\n3. 담당자 학과 거르기 · 내려받기 학과 칸");
  const ch = leafChoices(UNI);
  const chNow = leafChoices(UNI, { uptoYear: 2026 });
  const dept = campusNames(UNI).dept;
  for (const n of NEW) {
    const c = ch.find((x) => x.code === n.code);
    ok(`${n.name}: 거르기 목록에 있다 · 검사 가능 표시`, !!c && c.name === n.name && c.college === "SCITECH" && c.ready);
    ok(`${n.name}: 학생 넣는 자리(2026)에도 있다`, chNow.some((x) => x.code === n.code));
    ok(`${n.name}: 내려받기 학과 칸이 이름으로 적힌다`, dept(n.code) === n.name, dept(n.code));
  }

  console.log("\n4. CSV 일괄 등록: 학과 칸의 이름 · 별칭 · 코드");
  /* 학과 칸에 적혀 올 수 있는 모양들. 마지막 둘은 거절돼야 한다 */
  const cases: { dep: string; want: string | null }[] = [
    { dep: "지능형반도체공학과", want: "KUS26_INTSEMI" },
    { dep: "지능형반도체공학부", want: "KUS26_INTSEMI" },
    { dep: "지능형 반도체 공학부", want: "KUS26_INTSEMI" },
    { dep: "KUS26_INTSEMI", want: "KUS26_INTSEMI" },
    { dep: "kus26_intsemi", want: "KUS26_INTSEMI" },
    { dep: "신소재화학과", want: "KUS26_MATCHEM" },
    { dep: "신소재 화학과", want: "KUS26_MATCHEM" },
    { dep: "KUS26_MATCHEM", want: "KUS26_MATCHEM" },
    { dep: "반도체물리학부", want: "KUS26_SEMIPHYS" },
    { dep: "지능형반도체학부", want: null },
    { dep: "신소재화학부", want: null },
  ];
  for (const c of cases) {
    const r = checkStudent(UNI, { student_id: "99990000", name: "시험", email: null, login_id: null, college_code: null, department_code: c.dep });
    /* 저장되는 값은 맥락의 코드다(`provisionStudent` 가 `ctx.department_code` 를 적는다) */
    const got = r.ok ? r.value.ctx.department_code : null;
    ok(`'${c.dep}' → ${c.want ?? "거절"}`, got === c.want, r.ok ? got! : r.why);
  }
  ok("단과대학 코드를 함께 적어도 맞는다(SCITECH)",
    checkStudent(UNI, { student_id: "99990000", name: "시험", email: null, login_id: null, college_code: "SCITECH", department_code: "지능형반도체공학부" }).ok);

  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error("KUS 기관 줄이 없다 (UNI=KUS APPLY=yes npm run pcu:org)");
  const sids = ["99990001", "99990002", "99990003", "99990004", "99990005", "99990006"];
  const cleanup = async () => {
    const ids = await query<{ id: string }>(`SELECT id::text FROM users WHERE login_id = ANY($1)`, [sids.map((s) => `kus-${s}`)]);
    for (const { id } of ids) {
      await query(`DELETE FROM campus_students WHERE user_id = $1`, [id]).catch(() => undefined);
      await query(`DELETE FROM memberships WHERE user_id = $1`, [id]).catch(() => undefined);
      await query(`DELETE FROM users WHERE id = $1`, [id]).catch(() => undefined);
    }
  };
  await cleanup();
  const csv = [
    "학번,이름,학과,이메일",
    "99990001,시험일,지능형반도체공학과,",
    "99990002,시험이,지능형반도체공학부,",
    "99990003,시험삼, 지능형 반도체공학부 ,",
    "99990004,시험사,신소재화학과,",
    "99990005,시험오,KUS26_MATCHEM,",
    "99990006,시험육,지능형반도체학부,",
  ].join("\n");
  const parsed = parseStudentCsv(csv);
  ok("한글 머리글(학번 · 이름 · 학과)을 읽는다", parsed.ok && parsed.rows.length === 6);
  const pre = await previewImport(UNI, csv);
  ok("미리 보기: 다섯 줄 맞음 · 한 줄 거절(없는 학과)",
    pre.ok && pre.rows.filter((r) => r.ok).length === 5 && !pre.rows[5].ok,
    pre.rows.map((r) => `${r.line}:${r.ok ? "ok" : r.why}`).join(" | "));
  const actor = { userId: "0", role: "org_admin", orgId: org.id };
  const admin = await queryOne<{ id: string }>(`SELECT user_id::text AS id FROM memberships WHERE role = 'superadmin' ORDER BY user_id LIMIT 1`);
  if (admin) actor.userId = admin.id;
  try {
    const ap = await applyImport(UNI, org.id, csv, actor as never);
    ok("적용: 만듦 5 · 거절 1", ap.ok && ap.created.length === 5 && ap.rejected.length === 1,
      `만듦 ${ap.created.length} · 고침 ${ap.updated} · 거절 ${ap.rejected.length}`);
    const stored = await query<{ login_id: string; department_code: string; college_code: string; specialization: string | null }>(
      `SELECT u.login_id, cs.department_code, cs.college_code, cs.specialization
         FROM campus_students cs JOIN users u ON u.id = cs.user_id
        WHERE u.login_id = ANY($1) ORDER BY u.login_id`, [sids.map((s) => `kus-${s}`)]);
    const byLogin = Object.fromEntries(stored.map((r) => [r.login_id, r]));
    const want: Record<string, [string, string]> = {
      "kus-99990001": ["KUS26_INTSEMI", "EE_CORE_V1"], "kus-99990002": ["KUS26_INTSEMI", "EE_CORE_V1"],
      "kus-99990003": ["KUS26_INTSEMI", "EE_CORE_V1"], "kus-99990004": ["KUS26_MATCHEM", "ME_CORE_V3"],
      "kus-99990005": ["KUS26_MATCHEM", "ME_CORE_V3"],
    };
    for (const [lid, [d, core]] of Object.entries(want)) {
      const r = byLogin[lid];
      const leafCore = r ? findLeaf(u, r.department_code)?.leaf.core_code : null;
      ok(`${lid}: 학과 코드 ${d} · Core ${core} · SCITECH 로 저장`, !!r && r.department_code === d && leafCore === core && r.college_code === "SCITECH",
        r ? `${r.department_code} ${leafCore} ${r.college_code} ${r.specialization}` : "없음");
    }
    ok("거절된 줄은 계정이 생기지 않았다", !byLogin["kus-99990006"]);

    const f1 = await listStudents({ universityCode: UNI, department: "KUS26_INTSEMI", withDemo: true });
    const f2 = await listStudents({ universityCode: UNI, department: "KUS26_MATCHEM", withDemo: true });
    ok("담당자 학과 거르기: 지능형반도체공학과 3명", f1.rows.filter((r) => r.login_id.startsWith("kus-9999")).length === 3, String(f1.total));
    ok("담당자 학과 거르기: 신소재화학과 2명", f2.rows.filter((r) => r.login_id.startsWith("kus-9999")).length === 2, String(f2.total));
    const out = await studentStatusCsv({ universityCode: UNI, q: "9999", withDemo: true }, dept, "전체");
    const lines = out.split("\n").filter((l) => l.includes("kus-9999"));
    ok("내려받기 CSV: 학과 칸이 이름으로 적힌다(지능형반도체공학과 3 · 신소재화학과 2)",
      lines.length === 5 && lines.filter((l) => l.includes("지능형반도체공학과")).length === 3
        && lines.filter((l) => l.includes("신소재화학과")).length === 2
        && !lines.some((l) => l.includes("KUS26_")),
      `${lines.length}줄`);
  } finally {
    await cleanup();
  }

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
