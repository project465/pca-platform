/**
 * 검사 화면에 나가는 한국어를 센다.
 *
 * **자동 검사가 카피를 정하지 않는다.** 여기 적힌 목록은 사람이 읽다가
 * 걸린 말을 적어 둔 것이고, 사람 검토가 먼저다. 기계가 하는 일은 한 번
 * 고친 말이 다음 회차에 조용히 돌아오는 것을 막는 것과, 사람이 놓치기
 * 쉬운 것(내부 코드 · 영어 자리표시 · 되풀이되는 도움말 · 너무 긴 도움말)
 * 을 후보로 올리는 것뿐이다.
 *
 * **문항 은행은 보지 않는다.** `ME_V3_ITEM_BANK_V1` 은 동결돼 있고
 * 측정 문항의 문면을 문체 규칙으로 다듬으면 그 순간 문항이 바뀐다
 * (설계 원칙 4). 여기서 보는 것은 안내문·설명문·단추·전환·머리글이다.
 *
 *   npm run v3:copy
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { coreFile } from "../src/lib/me-v3/core-registry";
import { buildPlan } from "../src/lib/me-v3/runtime/blocks";
import { branchBlock } from "../src/lib/me-v3/runtime/routing";
import {
  content, domainName, gridRowOf, industryGloss, industryScene, roleName,
  wordingOf,
} from "../src/lib/me-v3/runtime/session";
import {
  INDUSTRY_HINT, ORG_HINT, OWNERSHIP_HELP, OWNERSHIP_LABEL, ROLE_HINT, TIER_WHAT,
} from "../src/app/v3/tier-text";
import type { GradField, Stage, Tier } from "../src/lib/me-v3/scoring/types";

/* ── 1. 걸린 말 ─────────────────────────────────────────────────────
   한도는 **그 말이 자연스러운 자리**를 남긴다. 0 으로 두면 고치는 쪽이
   뜻을 비틀게 되고, 그렇게 비튼 문장이 더 기계처럼 읽힌다 */
const RULES: { re: RegExp; limit: number; why: string; use: string }[] = [
  { re: /주십시오|주시기 바랍니다/g, limit: 0,
    why: "지나치게 정중한 문어체", use: "~해주세요" },
  { re: /보시겠습니까|보시겠습니다|하시겠습니까/g, limit: 0,
    why: "지나치게 정중한 문어체", use: "~할까요? · ~해주세요" },
  { re: /고르신 것|겪어 보신|적으실|하실 수 있습니다/g, limit: 0,
    why: "높임이 겹쳐 읽기가 무겁다", use: "고른 것 · 해 본 · 할 수 있습니다" },
  { re: /귀하의|응답자님|최적의|맞춤형|AI 기반|보다 정확한/g, limit: 0,
    why: "설문지와 광고 문구의 말", use: "그 자리의 구체적인 말" },
  { re: /견주/g, limit: 0, why: "설계 문서의 말", use: "비교합니다" },
  { re: /깊게 (묻|보|살펴)/g, limit: 0, why: "설계 문서의 말", use: "자세히 묻습니다" },
  { re: /근거가 (섭|섰|선다)|자리가 비|빈 자리/g, limit: 0,
    why: "설계 문서의 말", use: "경험이 확인되었습니다 · 아직 부족합니다" },
  { re: /응답을 받습니다|응답을 받아/g, limit: 0,
    why: "시스템이 처리한다는 느낌", use: "답변을 봅니다" },
  { re: /를 통해|을 통해/g, limit: 0, why: "번역투", use: "~로 · ~에서" },
  { re: /기반으로|기반의/g, limit: 0, why: "번역투", use: "~을 보고 · ~에서" },
  { re: /하게 됩니다|되게 됩니다/g, limit: 0, why: "번역투", use: "~합니다" },
  { re: /전부를|전부 /g, limit: 0,
    why: "화면이 이미 보여 주는 것을 문장으로 다시 설명한다", use: "빼기" },
  { re: /다음 단계/g, limit: 0, why: "설명서의 말", use: "그 자리에서 할 일을 그대로" },
  { re: /드립니다/g, limit: 2, why: "되풀이하면 과한 겸양", use: "합니다" },
  { re: /묻는 장면/g, limit: 0, why: "내부 용어", use: "질문 속 상황" },
  /* `판정` 자체는 기계공학의 말이다(`합격 여부를 판정합니다`). 잡는 것은
     이 검사가 제 결과를 가리킬 때뿐이다 */
  { re: /판정 기준|판정이 낮|판정에 들어|판정 한 줄/g, limit: 0,
    why: "이 검사의 결과를 가리키는 내부 용어", use: "평가 기준 · 결과" },
];

/** 한 화면에서 같은 어미가 되풀이되면 설명서처럼 읽힌다 */
const TICS: { re: RegExp; limit: number; what: string }[] = [
  { re: /할 수 있습니다|실 수 있습니다/g, limit: 4, what: "~할 수 있습니다" },
  { re: /확인합니다|확인됩니다/g, limit: 3, what: "~확인합니다" },
  { re: /제공합니다/g, limit: 0, what: "~제공합니다" },
  /* 사업주가 짚은 틀 셋을 더 센다. 판정 개념은 그대로 두고 **문장만** 사람이
     쓴 말로 간다: 같은 틀이 한 화면에 여러 번 서면 그것만으로 기계가 쓴 글로
     읽힌다 */
  { re: /연결됩니다|연결해 드립니다/g, limit: 1, what: "~연결됩니다" },
  { re: /확인됐습니다|확인된 것입니다/g, limit: 3, what: "~확인됐습니다" },
  { re: /반영됩니다|반영되지 않습니다/g, limit: 2, what: "~반영됩니다" },
  { re: /바탕으로|토대로/g, limit: 0, what: "~바탕으로" },
  { re: /제시합니다|도출합니다|산출합니다/g, limit: 0, what: "~제시합니다" },
];

/** 주석을 걷어 낸다. **왜 그렇게 썼는지 적어 둔 글까지 세면** 기록을 지우게 된다 */
const body = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const FILES = [
  "src/app/v3/start/page.tsx",
  "src/app/v3/start/start-form.tsx",
  "src/app/v3/[attemptId]/screen.tsx",
  "src/app/v3/[attemptId]/page.tsx",
  "src/app/v3/tier-text.ts",
  "src/lib/me-v3/runtime/blocks.ts",
  "src/lib/me-v3/runtime/menus.ts",
  "src/lib/me-v3/runtime/session.ts",
  /* 내 CareerMatri. **검사 화면만 재면 플랫폼 쪽이 다른 말투로 선다.**
     한 사람이 검사를 끝내고 이어서 누르는 쪽이라, 여기가 설명서 말투면
     그 어긋남은 한 쪽씩 볼 때 안 보이고 이어서 누를 때만 보인다 */
  "src/app/cores/page.tsx",
  "src/app/me/page.tsx",
  "src/app/me/nav.ts",
  "src/app/me/shell.tsx",
  "src/app/me/experience/page.tsx",
  "src/app/me/experience/new/page.tsx",
  "src/app/me/explore/page.tsx",
  "src/app/me/region/page.tsx",
  "src/app/me/jobs/page.tsx",
  "src/app/me/track/page.tsx",
  "src/app/me/gap/page.tsx",
  "src/app/me/apply/page.tsx",
  "src/app/me/recompute/page.tsx",
  /* 작업공간에서 새로 선 셋. 띠의 줄을 늘릴 때 여기도 늘린다 */
  "src/app/me/results/page.tsx",
  "src/app/me/state/page.tsx",
  "src/app/me/next/page.tsx",
];

const out: string[] = [];
let bad = 0;
const flag = (s: string) => { bad += 1; out.push(`  걸림  ${s}`); };

for (const f of FILES) {
  const src = body(readFileSync(f, "utf8"));
  for (const r of [...RULES, ...TICS.map((t) =>
    ({ re: t.re, limit: t.limit, why: `한 벌에서 ${t.what} 되풀이`, use: "어미를 바꾼다" }))]) {
    const hits = [...src.matchAll(r.re)];
    if (hits.length <= r.limit) continue;
    flag(`${f} — "${hits[0][0]}" ${hits.length}회 (한도 ${r.limit}) · ${r.why}`);
    out.push(`        대신: ${r.use}`);
    for (const m of hits.slice(0, 2)) {
      const i = m.index ?? 0;
      out.push(`        … ${src.slice(Math.max(0, i - 26), i + 24).replace(/\s+/g, " ").trim()} …`);
    }
  }
}

/* ── 2. 실제로 서는 화면의 글 ────────────────────────────────────
   파일을 글자로 훑는 것만으로는 **어느 화면에 무엇이 서는지** 모른다.
   계획을 만들어 머리말·주제·질문·도움말을 그대로 꺼내 센다 */
type Line = { kind: string; id: string; slot: string; text: string };
const lines: Line[] = [];
const TD = content().domains.domains.map((d) => d.code);
const SEEN = new Set<string>();

for (const tier of ["BASIC", "STANDARD", "PRO"] as Tier[]) {
  for (const stage of ["bachelor", "master", "phd", "postdoc"] as Stage[]) {
    const field: GradField | null = stage === "bachelor" ? null : "STEM";
    const plan = buildPlan({
      tier, stage, branchBlock: branchBlock(stage, field),
      crossField: false,
      probe: TD.slice(0, 2), deep: TD.slice(0, 3),
      industryInterest: ["INDUSTRY_SEMICON_V2"],
      roleInterest: ["ROLE_CAE_V2"],
      tiedPair: TD.slice(0, 2),
    }, {
      items: content().bank.items as never,
      domainName, wording: wordingOf, gridRow: gridRowOf,
      scene: industryScene, gloss: industryGloss, roleName,
    });
    for (const s of plan.screens) {
      for (const slot of ["eyebrow", "subject", "question", "help"] as const) {
        const text = (s as unknown as Record<string, string>)[slot];
        if (!text) continue;
        const key = `${s.kind}|${slot}|${text}`;
        if (SEEN.has(key)) continue;
        SEEN.add(key);
        lines.push({ kind: s.kind, id: s.id, slot, text });
      }
    }
  }
}

/* 내부 코드가 글자 그대로 새는가. 주소와 화면 이름은 여기서 안 본다 */
const CODE = /\bTD\d\d\b|\bJ[1-8]\b|\bZ[1-4]\b|\bRF\d\b|\bOC\d\b|ME_V3|_V1\b|[A-Z]{3,}_[A-Z0-9_]{2,}/;
const EN = /lorem|TODO|TBD|FIXME|placeholder|undefined|null\b/i;

for (const l of lines) {
  if (CODE.test(l.text)) flag(`내부 코드가 화면에 — [${l.id}.${l.slot}] ${l.text}`);
  if (EN.test(l.text)) flag(`영어 자리표시가 화면에 — [${l.id}.${l.slot}] ${l.text}`);
  /* 전환 화면의 도움말은 영역 이름을 줄로 세운 것이라 길이를 재지 않는다.
     산업 장면은 **읽는 자리의 본문**이라 길이를 재지 않는다: 그 자리의
     도움말은 묻기 전에 읽히는 한 절이고, 예순 자로 줄이면 그 산업에서
     기계공학자가 무엇을 다루는지가 안 적힌다. 대신 두 문장을 넘기지 않는다 */
  if (l.slot === "help" && l.kind === "scene") {
    const dots = (l.text.match(/\. /g) ?? []).length;
    if (dots > 1 || l.text.length > 160) {
      flag(`산업 장면이 길다(${l.text.length}자 · ${dots + 1}문장) — [${l.id}] ${l.text}`);
    }
  } else if (l.slot === "help" && l.kind !== "transition" && l.text.length > 60) {
    flag(`도움말이 길다(${l.text.length}자) — [${l.id}] ${l.text}`);
  }
}

/* 같은 도움말이 성격이 다른 화면에 돌려 쓰이는가. 같은 종류의 화면이
   열둘 서는 것(영역 격자)은 되풀이가 아니라 같은 질문이다 */
const byHelp = new Map<string, Set<string>>();
for (const l of lines) {
  if (l.slot !== "help") continue;
  if (!byHelp.has(l.text)) byHelp.set(l.text, new Set());
  byHelp.get(l.text)!.add(l.kind);
}
for (const [text, kinds] of byHelp) {
  if (kinds.size > 1) flag(`같은 도움말을 ${[...kinds].join(" · ")} 화면이 함께 쓴다 — ${text}`);
}

/* 고르는 자리에 붙는 한 줄도 같은 자로 잰다 */
for (const [k, v] of Object.entries({ ...INDUSTRY_HINT, ...ROLE_HINT, ...ORG_HINT })) {
  if (CODE.test(v)) flag(`팩 설명에 내부 코드 — ${k}: ${v}`);
  if (v.length > 34) flag(`팩 설명이 길다(${v.length}자) — ${k}: ${v}`);
}
/* 보기 넷을 화면에 적는 말. **한 줄에 들어와야 한다**: 두 줄로 접히면
   둘째와 셋째를 눈으로 가르는 자리가 사라진다 */
for (const t of OWNERSHIP_LABEL) {
  if (t.length > 14) flag(`보기 문면이 길다(${t.length}자) — ${t}`);
}
for (const t of OWNERSHIP_HELP) {
  if (t.length > 12) flag(`보기 아래 한 마디가 길다(${t.length}자) — ${t}`);
}
for (const [k, v] of Object.entries(TIER_WHAT)) {
  if (CODE.test(v.what)) flag(`등급 설명에 내부 코드 — ${k}`);
}

/* ── 3. 문항 은행은 그대로인가 ────────────────────────────────── */
const bank = coreFile<{ items: { item_id: string }[]; level_options: string[] }>(
  "ME_CORE_V3", "items");
const LEVEL = ["없다", "남이 한 것을 받아 썼다", "내가 했다", "내가 정하고 그 결과가 쓰였다"];
if (JSON.stringify(bank.level_options) !== JSON.stringify(LEVEL)) {
  flag("보기 넷의 문면이 바뀌었다 — 네 단계의 뜻이 판정 규칙과 묶여 있다");
}

if (out.length) console.log(out.join("\n"));
console.log(bad
  ? `\n화면 카피 ${bad}곳이 후보로 걸렸다. **최종 판단은 문맥으로 한다.**`
  : `\n화면 카피 OK — 파일 ${FILES.length}벌 · 화면 글 ${lines.length}줄`
    + ` · 규칙 ${RULES.length + TICS.length}가지 · 문항 ${bank.items.length}개 그대로.`);
process.exitCode = bad ? 1 : 0;
