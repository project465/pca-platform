/**
 * **문항 의미 보존 Audit**(PCU GOLD MASTER §29).
 *
 * Humanization 전(기본값 `2448e43`)과 지금 문항을 나란히 놓고 **측정하는
 * 것이 같은지**를 센다. 세는 것은 넷이다: 문항이 그대로 있는가(id · 수) ·
 * 재는 자리가 같은가(construct · 축 · 척도 · 보기 값 · 역방향) · 행동
 * 수준과 조건이 같은가(소유를 가르는 말이 더해지거나 빠졌는가) · 범위가
 * 같은가(대상 낱말이 바뀌었는가).
 *
 * **고치지 않는다**(§29). `POSSIBLE DRIFT` 로 적고 사람이 읽는다: 자동으로
 * 다시 쓰면 그 순간 이 검사가 재는 것이 사라진다.
 *
 *   BASE=2448e43 npm run v3:drift
 *   OUT=docs/metri/PCU_ITEM_DRIFT.md npm run v3:drift
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { loadEnv } from "./_loop-fixture";
loadEnv();
import { registry } from "../src/lib/me-v3/core-registry";

const BASE = process.env.BASE ?? "2448e43";
const OUT = process.env.OUT ?? "docs/metri/PCU_ITEM_DRIFT.md";

type Item = {
  item_id: string;
  measurement_axis?: string | null;
  evidence_axis?: string | null;
  technical_domain?: string | null;
  role_function?: string | null;
  industry_pack?: string | null;
  response_scale?: string | null;
  option_values?: (number | null)[] | null;
  reverse_flag?: boolean | null;
  requirement?: string | null;
  education_routing?: string | null;
  wording?: string | null;
  grid_row?: string | null;
  grid_stem?: string | null;
  stage_wording?: Record<string, string> | null;
};
type Bank = { core?: string; item_bank_version?: string; items: Item[] };

/**
 * **소유와 조건을 가르는 말.** 이 가운데 하나가 더해지거나 빠지면 묻는
 * 행동의 수준이나 조건이 달라졌을 수 있다. 목록은 사람이 읽고 넣는다:
 * 자동으로 늘리면 어느 날 평범한 말이 섞여 들어온다.
 */
const LEVEL_WORDS = [
  "직접", "혼자", "함께", "받아", "주어진", "정해진", "스스로",
  "기준", "조건", "까닭", "근거", "처음", "끝까지", "모두", "전부",
  "이상", "한 번", "둘 이상", "맡아", "제가", "내가",
];
/** 범위를 가르는 말. 대상이 바뀌면 재는 자리가 달라진다 */
const SCOPE_WORDS = [
  "수업", "과제", "캡스톤", "동아리", "공모전", "실습", "현장", "인턴",
  "팀", "조별", "학회", "연구", "프로젝트", "아르바이트",
];

const bag = (s: string): Set<string> => {
  const out = new Set<string>();
  for (const w of [...LEVEL_WORDS, ...SCOPE_WORDS]) if (s.includes(w)) out.add(w);
  return out;
};
const diffBag = (a: Set<string>, b: Set<string>): string[] => {
  const out: string[] = [];
  for (const w of a) if (!b.has(w)) out.push(`-${w}`);
  for (const w of b) if (!a.has(w)) out.push(`+${w}`);
  return out;
};
const text = (i: Item): string =>
  [i.wording, i.grid_row, i.grid_stem,
    ...Object.values(i.stage_wording ?? {})].filter(Boolean).join(" ");

function at(rev: string, path: string): Bank | null {
  try {
    const raw = execFileSync("git", ["show", `${rev}:pca-platform/${path}`],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(raw) as Bank;
  } catch { return null; }
}
function now(path: string): Bank | null {
  try {
    const raw = execFileSync("git", ["show", `HEAD:pca-platform/${path}`],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(raw) as Bank;
  } catch { return null; }
}

type Row = {
  core: string; id: string; why: string; before: string; after: string;
};

function main(): void {
  const reg = registry();
  const cores = reg.cores.filter((c) => c.files?.items);
  const lines: string[] = [];
  const drift: Row[] = [];
  let same = 0, seen = 0, missing = 0;
  const gone: string[] = [];
  const added: string[] = [];

  for (const c of cores) {
    const path = `sites/pca-platform/content/${c.files.items}`;
    const a = at(BASE, path);
    const b = now(path);
    if (!b) continue;
    if (!a) {
      lines.push(`| ${c.code} | 기준에 없음 | ${b.items.length}개 | 이 회차 뒤에 생긴 Core 라 견줄 자리가 없다 |`);
      continue;
    }
    const byA = new Map(a.items.map((x) => [x.item_id, x]));
    const byB = new Map(b.items.map((x) => [x.item_id, x]));
    for (const id of byA.keys()) if (!byB.has(id)) gone.push(`${c.code}:${id}`);
    for (const id of byB.keys()) if (!byA.has(id)) added.push(`${c.code}:${id}`);

    let coreSame = 0, coreDrift = 0;
    for (const [id, x] of byA) {
      const y = byB.get(id);
      if (!y) { missing += 1; continue; }
      seen += 1;
      const why: string[] = [];
      /* ① 재는 자리. 하나라도 다르면 그 문항은 다른 것을 잰다 */
      const key = (i: Item) => [
        i.measurement_axis ?? "", i.evidence_axis ?? "",
        i.technical_domain ?? "", i.role_function ?? "", i.industry_pack ?? "",
        i.response_scale ?? "", JSON.stringify(i.option_values ?? []),
        String(i.reverse_flag ?? false), i.requirement ?? "",
        i.education_routing ?? "",
      ].join("|");
      if (key(x) !== key(y)) why.push("재는 자리가 다르다");
      /* ② 행동 수준과 조건 · ③ 범위 */
      const d = diffBag(bag(text(x)), bag(text(y)));
      const lvl = d.filter((w) => LEVEL_WORDS.includes(w.slice(1)));
      const scp = d.filter((w) => SCOPE_WORDS.includes(w.slice(1)));
      if (lvl.length) why.push(`행동 수준·조건 ${lvl.join(" ")}`);
      if (scp.length) why.push(`범위 ${scp.join(" ")}`);
      if (why.length) {
        coreDrift += 1;
        drift.push({
          core: c.code, id, why: why.join(" · "),
          before: text(x).slice(0, 120), after: text(y).slice(0, 120),
        });
      } else { coreSame += 1; same += 1; }
    }
    lines.push(`| ${c.code} | ${byA.size} | ${byB.size} | SAME ${coreSame} · POSSIBLE DRIFT ${coreDrift} |`);
  }

  const md: string[] = [];
  md.push("# 문항 의미 보존 Audit (PCU GOLD MASTER §29)");
  md.push("");
  md.push(`기준 ${BASE} 와 지금을 나란히 놓고 센다. **고치지 않는다**:`);
  md.push("`POSSIBLE DRIFT` 는 사람이 읽고 정할 자리이고, 자동으로 다시 쓰면");
  md.push("그 순간 이 검사가 재는 것이 사라진다.");
  md.push("");
  md.push("세는 것은 셋이다. 재는 자리(construct · 축 · 척도 · 보기 값 ·");
  md.push("역방향 · 필수 · routing)가 같은가, 행동 수준과 조건을 가르는 말이");
  md.push("더해지거나 빠졌는가, 범위를 가르는 말이 바뀌었는가.");
  md.push("");
  md.push("| Core | 기준 문항 | 지금 문항 | 판정 |");
  md.push("|---|---|---|---|");
  md.push(...lines);
  md.push("");
  md.push(`**합계** SAME ${same} · POSSIBLE DRIFT ${drift.length} ·`
    + ` 견준 문항 ${seen} · 기준에만 있는 문항 ${gone.length} ·`
    + ` 이번에 생긴 문항 ${added.length}`);
  md.push("");
  if (gone.length) {
    md.push("## 기준에만 있는 문항");
    md.push("");
    md.push(gone.join(" · "));
    md.push("");
  }
  if (drift.length) {
    md.push("## POSSIBLE DRIFT (사람이 읽을 자리)");
    md.push("");
    for (const r of drift) {
      md.push(`### ${r.core} · ${r.id}`);
      md.push("");
      md.push(`- 걸린 까닭: ${r.why}`);
      md.push(`- BEFORE: ${r.before}`);
      md.push(`- AFTER: ${r.after}`);
      md.push("");
    }
  }
  writeFileSync(OUT, `${md.join("\n")}\n`);
  console.log(`  기준 ${BASE} · 견준 문항 ${seen}`);
  console.log(`  SAME ${same} · POSSIBLE DRIFT ${drift.length}`);
  console.log(`  기준에만 있는 문항 ${gone.length} · 이번에 생긴 문항 ${added.length}`);
  console.log(`  적었다 ${OUT}`);
  /* **걸림으로 떨어뜨리지 않는다.** 이 검사가 내는 것은 사람이 읽을
     목록이고, 빨강으로 적으면 고치는 쪽이 문항을 다시 쓰게 된다 */
}

main();
