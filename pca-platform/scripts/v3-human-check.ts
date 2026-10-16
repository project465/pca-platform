/**
 * **사람이 쓴 글인가.** 학생에게 나가는 글자만 센다.
 *
 * 사람 검토가 먼저다. 기계가 하는 일은 셋이다: 한 번 고친 말이 다음
 * 회차에 조용히 돌아오는 것을 막고, 사람이 눈으로 세기 어려운 것(한 틀이
 * 몇 %인가 · 같은 판정문이 한 결과지에 몇 번인가)을 재고, **고치기 전과
 * 뒤의 수를 같은 자로** 적는다.
 *
 * 세는 자리가 둘이다.
 *
 *   은행   PCU 가 가리키는 Core 열아홉의 문항 은행(`wording` · `grid_row`
 *          · `stage_wording` · 팩 문항). **기계공학은 보지 않는다**:
 *          배재대에 자리가 없고 측정 동결이 그 은행을 들고 있다
 *   떠 둔 글 `v3:content:qa` 가 실제 runtime 으로 떠 둔 화면·결과·종이
 *          (`var/content-qa/<core>-<사람>.*`). 파일을 글자로 훑는 것으로는
 *          **어느 화면에 무엇이 서는지** 알 수 없다
 *
 *   npm run v3:human
 *   DUMP=var/content-qa-final npm run v3:human     떠 둔 자리를 고른다
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { registry } from "../src/lib/me-v3/core-registry";
import { studentScenes } from "../src/lib/me-v3/runtime/examples";

let pass = 0;
const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}${saw ? `  ${saw}` : ""}`); }
  else { bad.push(what); console.log(`  걸림  ${what}  ${saw}`); }
}
function note(s: string): void { console.log(`  보고  ${s}`); }

const DUMP = process.env.DUMP ?? "var/content-qa";

/** PCU 가 실제로 가리키는 Core. 등록부와 학교 등록부에서 읽는다 */
function pcuCores(): { code: string; items: string; name: string }[] {
  const camp = readFileSync(
    "sites/pca-platform/content/campus-universities.json", "utf8");
  return registry().cores
    .filter((c) => camp.includes(`"${c.code}"`) && c.files?.items)
    .map((c) => ({
      code: c.code, name: c.name_ko,
      items: `sites/pca-platform/content/${c.files!.items}`,
    }));
}

type Item = {
  item_id: string; module?: string; wording?: string; grid_row?: string;
  grid_stem?: string; options?: string[]; measurement_axis?: string;
  evidence_axis?: string | null; stage_wording?: Record<string, string> | string | null;
};

/** 보기 넷으로 받는 문항. 학생이 가장 많이 읽는 자리다 */
const ladder = (it: Item): boolean => (it.options ?? []).length === 4;

/** 그 문항에서 학생이 읽는 글 전부 */
function texts(it: Item): string[] {
  const out = [it.wording ?? "", it.grid_row ?? "", it.grid_stem ?? ""];
  const sw = it.stage_wording;
  if (typeof sw === "string") out.push(sw);
  else if (sw) out.push(...Object.values(sw));
  return out.filter(Boolean);
}

/* ── 1. 한도가 0 인 말 ──────────────────────────────────────────────
   어느 문장에 넣어도 그 문장이 무엇을 말하는지 줄어드는 말이다. 사람이
   쓰는 자리가 없으므로 한도를 두지 않는다 */
const BANNED: { re: RegExp; why: string }[] = [
  { re: /기반으로|바탕으로/g, why: "무엇을 보고 정했는지가 사라진다" },
  { re: /종합적으로|종합적인|종합하여/g, why: "무엇을 합쳤는지가 없다" },
  { re: /체계적으로|체계적인/g, why: "어떻게 했는지가 없다" },
  { re: /도출하|도출한|도출된|도출$/g, why: "보고서의 말이다" },
  { re: /활용하여|활용한 경험|를 활용/g, why: "무엇을 어떻게 썼는지로 적는다" },
  { re: /확인되었습니다|확인되지 않았습니다/g, why: "판정문이 되풀이된다" },
  { re: /역량을 (강화|키우|쌓)/g, why: "할 수 있는 일이 적혀 있지 않다" },
  { re: /경험을 (쌓아|쌓으)/g, why: "무엇을 하면 되는지가 없다" },
  { re: /수행하였|제시하였|실시하였|분석하였/g, why: "문어체 종결이다" },
  { re: /귀하/g, why: "학생에게 쓰지 않는 말이다" },
  { re: /잠재력|가능성을 지니/g, why: "이 검사가 재지 않은 것을 말한다" },
];

/* ── 2. 직장 경력이 있어야 답할 수 있는 말 ────────────────────────
   학생이 수업·과제·동아리·실습에서 떠올릴 수 없는 자리다. 역할팩이 묻는
   `맡은 범위` 는 학생도 답할 수 있게 적는다 */
const WORKPLACE = [
  "권한을 가지고", "사내", "부서", "상사", "고객사", "결재", "결재선",
  "재직", "직원", "팀장", "상급자", "승인 권한", "발주처", "원청", "거래처",
  "담당 구역", "실무에서", "현업에서",
];

/** 학생이 자기 경험을 떠올리는 자리 */
const SCENE = [
  "수업", "과제", "팀 활동", "팀 프로젝트", "조별", "동아리", "학생회",
  "공모전", "캡스톤", "실습", "현장실습", "인턴", "아르바이트", "스터디",
  "졸업작품", "개인 프로젝트", "교내", "학과",
];

const cores = pcuCores();
console.log(`\n사람이 쓴 글인가 — PCU Core ${cores.length}개\n`);

type Row = {
  core: string; name: string; n: number; banned: string[]; work: string[];
  scene: number; topTail: [string, number]; tails: number;
};
const rows: Row[] = [];

for (const c of cores) {
  const bank = JSON.parse(readFileSync(c.items, "utf8")) as { items: Item[] };
  const lad = bank.items.filter(ladder);
  const hitB: string[] = []; const hitW: string[] = [];
  let scene = 0;
  const tail = new Map<string, number>();
  for (const it of bank.items) {
    for (const t of texts(it)) {
      for (const b of BANNED) {
        const m = t.match(b.re);
        if (m) hitB.push(`${it.item_id}:${m[0]}`);
      }
      for (const w of WORKPLACE) if (t.includes(w)) hitW.push(`${it.item_id}:${w}`);
    }
  }
  for (const it of lad) {
    const w = it.wording ?? "";
    if (SCENE.some((s) => w.includes(s))) scene++;
    const k = w.slice(-9);
    tail.set(k, (tail.get(k) ?? 0) + 1);
  }
  const top = [...tail.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  rows.push({
    core: c.code, name: c.name, n: lad.length, banned: hitB, work: hitW,
    scene, topTail: top as [string, number], tails: tail.size,
  });
}

const allBanned = rows.flatMap((r) => r.banned);
ok("학생이 읽는 문항에 한도 0 인 말이 없다", allBanned.length === 0,
  allBanned.length ? allBanned.slice(0, 6).join(" · ") : `문항 ${rows.reduce((n, r) => n + r.n, 0)}개`);

const allWork = rows.flatMap((r) => r.work);
ok("직장 경력이 있어야 답할 수 있는 문항이 없다", allWork.length === 0,
  allWork.length ? `${allWork.length}개 — ${allWork.slice(0, 5).join(" · ")}` : "");

/**
 * 학생 장면.
 *
 * **문항마다 장면을 붙이라고 요구하지 않는다.** 같은 말이 문항마다 서면
 * 그것이 새 틀이 되고, 더 나쁜 것은 장면이 그 판단과 안 맞는 자리가
 * 생기는 것이다(간호의 `줄 약을 처방과 대조했다` 에 `간호 동아리에서` 가
 * 붙었다). 장면은 **묶음마다 한 번** 서고, 그 목록이 Core 마다 적혀
 * 있는지를 여기서 센다. 화면에 실제로 섰는지는 아래 떠 둔 글이 센다.
 */
const noScenes: string[] = [];
for (const c of cores) {
  try { studentScenes(c.code); } catch { noScenes.push(c.code); }
}
ok("Core 마다 학생 장면 묶음이 적혀 있다", noScenes.length === 0,
  noScenes.length ? noScenes.join(" ") : `${cores.length}개 Core`);
note(`문면에 장면이 든 사다리 문항 — ${rows.map((r) => `${r.core.split("_")[0]} ${(r.scene / r.n * 100).toFixed(0)}%`).join(" · ")}`);

/* 틀 쏠림. 한 Core 안에서 끝 아홉 자가 같은 문항이 5% 를 넘지 않는다 */
const heavy = rows.filter((r) => r.topTail[1] / r.n > 0.05);
ok("한 종결 틀이 그 Core 사다리 문항의 5% 를 넘지 않는다", heavy.length === 0,
  heavy.length
    ? heavy.map((r) => `${r.core} ${(r.topTail[1] / r.n * 100).toFixed(1)}% …${r.topTail[0]}`).join(" · ")
    : `가장 쏠린 자리 ${Math.max(...rows.map((r) => r.topTail[1] / r.n * 100)).toFixed(1)}%`);

note(`종결 꼴 종류 — ${rows.map((r) => `${r.core.split("_")[0]} ${r.tails}`).join(" · ")}`);

/**
 * 영역 훑기 열두 줄.
 *
 * 격자는 응시자가 **가장 먼저 읽는 화면**이고 열두 줄이 한눈에 선다.
 * 그래서 줄마다 끝맺음이 같으면 그 화면이 진단이 아니라 **한 틀을 열두
 * 번 찍은 표**로 읽힌다. 실제로 EE·ARCH·VISUAL 은 열두 줄이 전부
 * `…정하는 일` 과 `…가리는 일` 하나로 끝났고, 위의 `사다리 문항` 쏠림
 * 규칙은 격자 줄을 세지 않아 그 자리를 한 번도 보지 못했다.
 *
 * **한도를 0 으로 두지 않는다.** 격자는 나란히 읽는 자리라 줄이 서로
 * 비슷한 꼴이어야 훑어진다. 재는 것은 한 끝맺음이 **절반을 넘는가**다.
 */
const gridHeavy: string[] = [];
const gridTop: string[] = [];
for (const c of cores) {
  const bank = JSON.parse(readFileSync(c.items, "utf8")) as { items: Item[] };
  const seen: string[] = [];
  for (const it of bank.items) {
    if (it.grid_row && !seen.includes(it.grid_row)) seen.push(it.grid_row);
  }
  if (!seen.length) continue;
  const tail = new Map<string, number>();
  for (const r of seen) {
    const k = r.slice(-5);
    tail.set(k, (tail.get(k) ?? 0) + 1);
  }
  const [top, n] = [...tail].sort((a, b) => b[1] - a[1])[0];
  gridTop.push(`${c.code.split("_")[0]} ${n}/${seen.length}`);
  if (n > seen.length / 2) gridHeavy.push(`${c.code} ${n}/${seen.length} …${top}`);
}
ok("영역 훑기 열두 줄이 한 틀로만 끝나지 않는다", gridHeavy.length === 0,
  gridHeavy.length ? gridHeavy.join(" · ") : `가장 쏠린 자리 ${gridTop
    .map((x) => Number(x.split(" ")[1].split("/")[0]))
    .reduce((a, b) => Math.max(a, b), 0)}줄`);
note(`격자 줄의 가장 쏠린 끝맺음 — ${gridTop.join(" · ")}`);

/* ── 3. 떠 둔 화면과 결과 ──────────────────────────────────────── */
if (!existsSync(DUMP)) {
  ok(`떠 둔 글이 있다 — ${DUMP}`, false,
    "`npm run v3:content:qa` 로 먼저 떠 둔다");
} else {
  const files = readdirSync(DUMP);
  const screens = files.filter((f) => f.endsWith(".screens.txt"));
  const webs = files.filter((f) => f.endsWith(".web.txt"));
  ok(`떠 둔 글이 있다 — ${DUMP}`, screens.length > 0 && webs.length > 0,
    `화면 ${screens.length}벌 · 결과 ${webs.length}벌`);

  /**
   * 설명문이 질문보다 세지 않다.
   *
   * **글자 수로 `더 길다` 를 재지 않는다.** 질문은 한 단 큰 활자로 서고
   * 도움말은 작은 회색 글이라, 열여섯 자 질문 아래 서른여덟 자 도움말이
   * 반드시 더 센 것은 아니다. 재는 것은 둘이다: 도움말이 질문의 두 배에
   * 가까워지는가와, 한 번에 읽히는 길이(예순 자)를 넘는가.
   */
  const louder: string[] = [];
  for (const f of screens) {
    const txt = readFileSync(`${DUMP}/${f}`, "utf8");
    const blocks = txt.split(/^### /m).slice(1);
    for (const b of blocks) {
      const id = b.split(/[\]\n]/)[0];
      const q = /^질문: (.+)$/m.exec(b)?.[1] ?? "";
      const h = /^도움말: (.+)$/m.exec(b)?.[1] ?? "";
      /* 묻지 않는 화면(장면 읽기 · 전환 · 완료)은 본문이 도움말 자리에
         서는 것이 맞다. 보기를 고르는 화면만 센다 */
      if (!q || !h) continue;
      if (!/문항 /.test(b)) continue;
      if (h.length > q.length * 1.8 || h.length > 60) {
        louder.push(`${f.split("-")[0]} ${id} 질문 ${q.length}자 · 도움말 ${h.length}자`);
      }
    }
  }
  ok("묻는 화면에서 설명문이 질문보다 길지 않다", louder.length === 0,
    louder.length ? `${louder.length}자리 — ${louder.slice(0, 3).join(" / ")}` : "");

  /**
   * 질문 → 예시 → 선택.
   *
   * **벌 단위로 세지 않는다.** 한 벌에 예시가 한 줄만 있어도 통과하므로,
   * 보기 넷으로 받는 문항마다 그 줄이 있는지 센다.
   */
  let lad = 0; let withEx = 0; const exGap: string[] = [];
  let blocks = 0; let withScene = 0;
  for (const f of screens) {
    const txt = readFileSync(`${DUMP}/${f}`, "utf8");
    for (const b of txt.split(/^### /m).slice(1)) {
      if (/^장면: /m.test(b)) withScene++;
      if (/^문항 /m.test(b)) blocks++;
      for (const chunk of b.split(/^문항 /m).slice(1)) {
        if (!/보기\(화면\)/.test(chunk)) continue;
        lad++;
        if (/^ {2}예시: /m.test(chunk)) withEx++;
        else exGap.push(`${f.split(".")[0]} ${chunk.split(/[ \n]/)[0]}`);
      }
    }
  }
  ok("보기 넷 문항마다 실제 예시가 한 줄 선다", lad > 0 && exGap.length === 0,
    exGap.length ? `${withEx} / ${lad} — ${exGap.slice(0, 3).join(" · ")}` : `${lad}자리`);
  note(`묶음 첫 질문의 장면 줄 — 묻는 화면 ${blocks}개 가운데 ${withScene}개`);

  /* 판정문 되풀이. 한 결과지에서 같은 판정 꼴이 네 번을 넘지 않는다 */
  const JUDGE = [
    /확인되었습니다/g, /확인됐습니다/g, /확인되지 않았습니다/g,
    /미확인/g, /보완이 필요/g, /근거가 있습니다/g, /아직 비어 있습니다/g,
  ];
  const noisy: string[] = [];
  for (const f of webs) {
    const txt = readFileSync(`${DUMP}/${f}`, "utf8");
    for (const re of JUDGE) {
      const n = (txt.match(re) ?? []).length;
      if (n > 4) noisy.push(`${f.replace(".web.txt", "")} ${re.source} ${n}회`);
    }
  }
  ok("한 결과지에서 같은 판정문이 네 번을 넘지 않는다", noisy.length === 0,
    noisy.length ? `${noisy.length}자리 — ${noisy.slice(0, 4).join(" · ")}` : `${webs.length}벌`);

  /* 할 일에 남길 결과물이 적혀 있다. 대상과 행동만 있으면 무엇이 남는지
     모른다. `세 줄` · `한 쪽` · 그 영역의 산출물 이름 가운데 하나는 있어야
     한다. **줄 수를 센 말도 남길 결과물이다**: `근거를 세 줄로 남겨보세요`
     는 무엇이 남는지를 적은 문장인데 `한 줄` 만 세면 그 할 일이 걸린다 */
  const RESULT = /[한두세네다섯여섯\d]+ ?줄|한 쪽|한 문단|한 벌|표|기록|문서|정리본|메모|보고서|계획서|도면|대본|대조표|목록/;
  const vague: string[] = [];
  let acts = 0;
  for (const f of webs) {
    const lines = readFileSync(`${DUMP}/${f}`, "utf8").split("\n")
      .map((l) => l.trim())
      .filter((l) => /보세요\.?$/.test(l) && l.length > 12);
    for (const l of new Set(lines)) {
      acts++;
      if (!RESULT.test(l)) vague.push(`${f.replace(".web.txt", "")} — ${l}`);
    }
  }
  ok("할 일에 남길 결과물이 적혀 있다", vague.length === 0,
    vague.length ? `${vague.length} / ${acts} — ${vague.slice(0, 3).join(" / ")}` : `${acts}개`);
}

console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
