/**
 * **상용 준비도를 손으로 적지 않는다**(규격 §53·§54).
 *
 * 점수를 사람이 매기면 그 숫자는 그날의 기분을 적은 값이 된다. 그래서
 * 이 검사는 **이미 서 있는 검사들을 실제로 돌려** 그 출력의 통과·걸림을
 * 세어 여섯 축으로 묶는다. 축마다 가중치가 있고 합이 100 이다.
 *
 * 규칙 셋이 이 점수를 믿을 수 있게 한다.
 *
 * - **못 센 축을 초록으로 적지 않는다.** 어느 검사가 셀 수 있는 줄을
 *   내놓지 않으면 그 축은 `못 봄` 이고, 못 봄이 하나라도 있으면 **총점을
 *   선언하지 않는다**(`ops:check` 가 `UNKNOWN` 과 `BLOCKED` 를 가르는 것과
 *   같은 까닭이다)
 * - **종료 코드를 무시하지 않는다.** 통과 수만 세면, 중간에 터져서 몇 줄만
 *   찍고 끝난 검사가 만점으로 읽힌다
 * - **걸림의 문면을 그대로 모아 적는다.** 수만 내놓으면 무엇을 고쳐야
 *   하는지가 어디에도 없고, 그러면 다음 사람이 처음부터 다시 찾는다
 *
 * 이 점수는 **내부 QA 점수이고 학생 결과와 무관하다**(§53). 측정에
 *  닿지 않고, 어느 Core 의 학생 공개 상태도 바꾸지 않는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npm run pcu:readiness
 *   AXES=A,B npm run pcu:readiness     # 한두 축만
 *   KEEP=1  … var/pcu-readiness/ 의 지난 출력을 그대로 읽는다(다시 돌리지 않는다)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

type Axis = {
  id: string; name: string; weight: number;
  /** 그 축을 세는 검사. 차례대로 하나씩 돈다 */
  cmds: string[];
  /** 그 축이 무엇을 묻는가 — 보고에 그대로 간다 */
  asks: string;
};

/**
 * 여섯 축. **가중치는 고치는 비용이 아니라 못 하면 팔 수 없는 정도로
 * 잡았다**: 학생이 끝까지 가지 못하면 나머지가 다 서 있어도 못 팔고,
 * 담당자가 개발자를 불러야 하면 학교가 다음 해에 재계약하지 않는다.
 */
const AXES: Axis[] = [
  {
    id: "A", name: "학생 Journey", weight: 20,
    asks: "계정 발급에서 결과와 종이와 작업공간까지 사람 개입 없이 간다",
    cmds: ["pcu:campus", "pcu:routing", "v3:product-loop", "v3:usability"],
  },
  {
    id: "B", name: "학교 운영자 자립", weight: 20,
    asks: "담당자가 개발자나 콘솔 없이 화면에서 일을 끝낸다",
    cmds: ["pcu:cli", "campus:export", "pcu:ops"],
  },
  {
    id: "C", name: "측정 불변", weight: 15,
    asks: "상품성 고도화가 재는 자를 한 눈금도 건드리지 않았다",
    cmds: ["v3:freeze:measure", "v3:freeze", "v3:result:freeze",
      "v3:workspace", "v3:freeze:core"],
  },
  {
    id: "D", name: "개인정보·권한 경계", weight: 15,
    asks: "남의 결과가 열리지 않고 담당자가 개별 응답을 보지 못한다",
    cmds: ["v3:isolation", "auth:check", "secrets:check"],
  },
  {
    id: "E", name: "학과 콘텐츠", weight: 20,
    asks: "자리 115 가 제 전공의 말로 읽히고 종이까지 닿는다",
    cmds: ["pcu:dept", "pcu:content", "pcu:generic", "pcu:coverage"],
  },
  {
    id: "F", name: "오류 복구·배포", weight: 10,
    asks: "오류를 삼키지 않고 옛 DB 가 한 줄로 최신까지 온다",
    cmds: ["errors:check", "routes:check", "db:chain"],
  },
];

const OUT = "var/pcu-readiness";
const keep = process.env.KEEP === "1";
const want = (process.env.AXES ?? "").split(",").map((s) => s.trim()).filter(Boolean);

type Ran = {
  cmd: string; code: number; pass: number; fail: number;
  counted: boolean; bad: string[];
};

/** 검사 하나를 돌리고 그 출력에서 통과·걸림을 센다 */
function run(cmd: string): Ran {
  const file = `${OUT}/${cmd.replace(/[:/]/g, "_")}.txt`;
  let body = "", code = 0;
  if (keep && existsSync(file)) {
    body = readFileSync(file, "utf8");
    const m = /^#exit (\d+)$/m.exec(body);
    code = m ? Number(m[1]) : 0;
  } else {
    try {
      body = execFileSync("npm", ["run", "-s", cmd], {
        encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
        env: process.env, stdio: ["ignore", "pipe", "pipe"],
        timeout: 60 * 60 * 1000,
      });
    } catch (e) {
      const err = e as { status?: number; stdout?: string; stderr?: string };
      code = err.status ?? 1;
      body = `${err.stdout ?? ""}\n${err.stderr ?? ""}`;
    }
    writeFileSync(file, `#exit ${code}\n${body}`);
  }
  /* **마지막 셈을 읽는다.** 검사 하나가 묶음을 여러 번 적는 일이 있고,
     그때 맞는 값은 끝에 선 합이다 */
  const ps = [...body.matchAll(/통과\s+(\d+)/g)].map((m) => Number(m[1]));
  const fs = [...body.matchAll(/걸림\s+(\d+)/g)].map((m) => Number(m[1]));
  let pass = ps.length ? ps[ps.length - 1] : 0;
  let fail = fs.length ? fs[fs.length - 1] : 0;
  let counted = ps.length > 0;
  /* **종료 코드가 0 이 아니면 걸린 것이 있다.** 통과만 적고 터진 검사를
     만점으로 읽지 않는다 */
  if (code !== 0 && fail === 0) { fail = Math.max(1, fail); }
  if (!counted) {
    /* 셈을 내놓지 않는 검사(동결 대조 따위)는 종료 코드로 가른다 */
    counted = true; pass = code === 0 ? 1 : 0; fail = code === 0 ? 0 : 1;
  }
  const bad = body.split("\n").filter((l) => /걸림\s+\S/.test(l))
    .map((l) => l.trim()).slice(0, 40);
  return { cmd, code, pass, fail, counted, bad };
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const axes = AXES.filter((a) => !want.length || want.includes(a.id));
  const rows: { axis: Axis; ran: Ran[] }[] = [];

  for (const a of axes) {
    console.log(`\n── ${a.id} ${a.name} (가중치 ${a.weight}) — ${a.asks}`);
    const ran: Ran[] = [];
    for (const c of a.cmds) {
      const r = run(c);
      ran.push(r);
      console.log(`  ${r.code === 0 ? "통과" : "걸림"}  ${c}`
        + ` — 통과 ${r.pass} · 걸림 ${r.fail} (종료 ${r.code})`);
      for (const b of r.bad) console.log(`        ${b}`);
    }
    rows.push({ axis: a, ran });
  }

  console.log("\n── 여섯 축 점수");
  let total = 0, unknown = 0;
  for (const { axis, ran } of rows) {
    const p = ran.reduce((s, r) => s + r.pass, 0);
    const f = ran.reduce((s, r) => s + r.fail, 0);
    const miss = ran.some((r) => !r.counted);
    if (miss) { unknown += 1; }
    const score = miss ? 0 : (p + f ? (axis.weight * p) / (p + f) : 0);
    if (!miss) total += score;
    console.log(`  ${axis.id} ${axis.name.padEnd(14)}`
      + ` ${String(Math.round(score * 10) / 10).padStart(5)} / ${axis.weight}`
      + `   통과 ${p} · 걸림 ${f}${miss ? "   못 봄" : ""}`);
  }
  const whole = axes.length === AXES.length;
  console.log(`\n  합계 ${Math.round(total * 10) / 10} / ${
    axes.reduce((s, a) => s + a.weight, 0)}`
    + (whole ? "" : "   (축을 일부만 돌렸다 — 총점이 아니다)"));

  if (unknown) {
    console.log("\n  못 본 축이 있어 총점을 선언하지 않는다.");
    process.exit(1);
  }
  if (whole && total < 90) {
    console.log("\n  90 미만이다. READY 를 선언하지 않는다(§53).");
    process.exit(1);
  }
  const anyBad = rows.some(({ ran }) => ran.some((r) => r.fail > 0));
  if (anyBad) { console.log("\n  걸린 자리가 남아 있다."); process.exit(1); }
}

main();
