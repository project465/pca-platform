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
import { termGlossOf } from "../src/lib/me-v3/runtime/terms";
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
  content, domainName, gridRowOf, industryChoices, industryGloss, industryScene, orgChoices,
  planDeps, roleChoices, roleName, wordingOf,
} from "../src/lib/me-v3/runtime/session";
import {
  INDUSTRY_HINT, ORG_HINT, OWNERSHIP_LABEL, OWNERSHIP_SHORT, ROLE_HINT, TIER_WHAT,
} from "../src/app/v3/tier-text";
import type { GradField, Stage, Tier } from "../src/lib/me-v3/scoring/types";

import { sellableCores } from "../src/lib/me-v3/core-registry";

/** 검사도 core 를 글자로 박지 않는다. 등록부가 지금 열어 둔 것을 쓴다 */
const CORE = sellableCores("KR")[0].code;


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
  { re: /판정 기준|판정이 낮|판정에 들어|판정 한 줄|영역 판정|판정은 그대로|판정이 올라|바뀐 판정/g, limit: 0,
    why: "이 검사의 결과를 가리키는 내부 용어", use: "평가 기준 · 결과" },
  /* ── 규격 §20 이 이름을 댄 말들 ──
     **낱말을 통째로 막지 않는다.** `자리` 와 `판정` 은 기계공학의 말이기도
     해서(`공정과 품질 판단이 자리를 많이 쓴다` · `기준을 만족하는지 재서
     판정한다`) 통째로 세면 영역 사전의 맞는 문장을 고치라고 요구하게 된다.
     세는 것은 **이 제품이 제 안쪽 일을 가리킬 때 쓰는 꼴**뿐이다 */
  { re: /반영하|반영되|반영됨|반영한|반영했|최근 반영|경험 반영/g, limit: 0,
    why: "안쪽 일을 가리키는 말(규격 §20)", use: "더하다 · 담다 · 바꾸다" },
  { re: /비어 있는 자리|비어 있던 자리|빈자리|자리별로|쓰인 자리|판단 자리/g, limit: 0,
    why: "안쪽 비유를 손님 화면에 적는다(규격 §20)", use: "부족한 부분 · 쓰인 곳 · 영역별" },
  /* **낱말 경계를 붙인다.** 안 붙이면 `T("navEvidence")` 같은 **열쇠
     이름**이 걸린다. 그 자리의 한국어는 `경험과 증거` 이고 영어는 en
     판의 값이라, 걸리는 것은 화면에 서는 글이 아니라 식별자다 */
  { re: /스냅샷|\bEvidence\b|\bGap\b|가져오기/g, limit: 0,
    why: "안쪽 이름과 영어 코드(규격 §20)", use: "검사 당시 결과 · 근거 · 부족한 부분 · 담기" },
  { re: /묶음으로 묶|묶음 판정|묶음이 달라/g, limit: 0,
    why: "안쪽 용어(규격 §20)", use: "영역이 달라졌습니다" },

  /* ── AI 가 쓴 글의 냄새 ──
     **상시 규칙이다.** 한 번 걷어도 다음 회차에 같은 말이 돌아오는 자리라
     세어서 막는다. 한도를 0 으로 둔 것은 이 말들이 **자연스러운 자리가
     없기 때문**이다: 어느 문장에 넣어도 그 문장이 무엇을 말하는지 줄어든다 */
  { re: /종합적으로 (분석|판단|고려|검토)|종합적인 분석/g, limit: 0,
    why: "AI 문체", use: "무엇을 보고 무엇을 알았는지 그대로" },
  { re: /다양한 가능성|새로운 가능성|무한한 가능성|가능성을 열어/g, limit: 0,
    why: "AI 문체", use: "지금 할 수 있는 것 하나" },
  { re: /잠재력/g, limit: 0, why: "재지 않은 것을 가리키는 말", use: "확인된 경험" },
  { re: /성장을 (지원|돕|응원)|커리어 여정|여정을/g, limit: 0,
    why: "AI 문체", use: "그 자리에서 할 일" },
  { re: /귀하/g, limit: 0, why: "설문지의 말", use: "빼거나 '~하시면'" },
  { re: /탐색해 ?보세요|발견해 ?보세요|경험해 ?보세요/g, limit: 0,
    why: "권유만 있고 무엇을 할지가 없다", use: "무엇을 누르면 되는지" },

  /* ⑤ **판정보다 관찰.** 이 검사는 적성도 유형도 재지 않는다. 그렇게
     적으면 재지 않은 것을 단정하는 말이 되고, 규준이 없는 지금은 거짓이다 */
  { re: /당신은[^.。]{0,14}(인재|유형|타입|형입니다)/g, limit: 0,
    why: "재지 않은 유형을 단정한다", use: "확인된 경험을 그대로" },
  { re: /에 적합합니다|적합한 직무|가장 잘 맞|적성에 맞|어울립니다/g, limit: 0,
    why: "합격 가능성으로 읽히는 판정", use: "근거가 확인된 영역" },

  /* ⑨ **제목은 서비스 언어로.** 영어 제목은 그 화면이 무엇을 하는 자리인지
     한 글자도 말하지 않는다. `Track` 은 파는 것의 이름이라 뺀다 */
  { re: /Career Insight|AI Recommendation|Personalized Analysis|Smart \w|\bInsight\b|\bRecommendation\b/g,
    limit: 0, why: "영어 제목(규격 §9)", use: "그 화면이 답하는 물음을 한국어로" },

  /* ⑭ **오류 문구에 기술 용어를 노출하지 않는다.** 상세한 원인은 로그에만
     적는다. 읽는 사람이 할 수 있는 것은 다시 해 보는 것뿐이다 */
  { re: /recompute failed|snapshot error|database|connection failed|stack trace|500 오류|internal server/gi,
    limit: 0, why: "손님 화면에 기술 용어(규격 §14)", use: "무엇이 안 됐고 다음에 무엇을 하면 되는지" },
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
  /* 검사 진입과 종료의 두 쪽. 여기가 설명서 말투면 **처음과 끝이 그렇다** */
  "src/app/v3/[attemptId]/intro/page.tsx",
  "src/app/v3/[attemptId]/done/page.tsx",
  "src/app/v3/tier-text.ts",
  /* 결과지의 시각화 넷. **그래프 옆의 한 줄도 손님이 읽는 글이다**:
     여기만 빠뜨리면 차트를 더하는 회차마다 검사 밖의 원고가 늘어난다 */
  "src/app/v3/[attemptId]/result/charts.tsx",
  "src/lib/me-v3/runtime/blocks.ts",
  "src/lib/me-v3/runtime/menus.ts",
  "src/lib/me-v3/student/translate.ts",
  "src/lib/me-v3/runtime/session.ts",
  /* 영어판 1단계에서 위 넷의 한국어 화면 글이 이리로 모였다. **빠뜨리면 그 글이 검사 밖으로 나간다** */
  "src/lib/me-v3/runtime/copy.ko.ts",
  /* 내 CareerMatri. **검사 화면만 재면 플랫폼 쪽이 다른 말투로 선다.**
     한 사람이 검사를 끝내고 이어서 누르는 쪽이라, 여기가 설명서 말투면
     그 어긋남은 한 쪽씩 볼 때 안 보이고 이어서 누를 때만 보인다 */
  "src/app/cores/page.tsx",
  /* 학교 전용 진입. **여기도 손님 화면이다**: 학교를 붙이는 회차마다
     원고가 늘어나는 자리라 상시 규칙 안에 둔다 */
  "src/app/campus/shell.tsx",
  "src/app/campus/[universityCode]/page.tsx",
  "src/app/campus/[universityCode]/majors/page.tsx",
  "src/app/campus/[universityCode]/d/[department]/page.tsx",
  "src/app/me/page.tsx",
  "src/app/me/nav.ts",
  "src/app/me/shell.tsx",
  "src/app/me/experience/page.tsx",
  "src/app/me/experience/new/page.tsx",
  "src/app/me/experience/steps.tsx",
  "src/app/me/experience/compose.tsx",
  "src/app/me/experience/upload.tsx",
  "src/app/me/experience/[id]/edit/page.tsx",
  "src/app/me/explore/page.tsx",
  "src/app/me/region/page.tsx",
  "src/app/me/jobs/page.tsx",
  "src/app/me/track/page.tsx",
  "src/app/me/track/guide.tsx",
  /* MAT 공고 확인 쪽과 그 쪽의 면접 준비·작은 일 문장 */
  "src/app/me/track/posting/[id]/page.tsx",
  "src/lib/assistant/prep.ts",
  /* MAT 브리핑과 지원서 문장 뼈대. 판 · 단추 · 알림 줄 · 이음말 */
  "src/app/me/track/brief.tsx",
  "src/app/me/track/copy-button.tsx",
  "src/lib/assistant/brief.ts",
  "src/lib/assistant/sentence.ts",
  "src/lib/assistant/calendar.ts",
  "src/app/me/gap/page.tsx",
  "src/app/me/apply/page.tsx",
  "src/app/me/recompute/page.tsx",
  "src/app/me/recompute/apply.tsx",
  "src/app/me/unsaved.tsx",
  /* 작업공간에서 새로 선 셋. 띠의 줄을 늘릴 때 여기도 늘린다 */
  "src/app/me/results/page.tsx",
  "src/app/me/state/page.tsx",
  "src/app/me/next/page.tsx",
  /* 세 화면이 같이 쓰는 문장. 여기가 안쪽 말을 들면 세 쪽이 같이 든다 */
  "src/lib/me-v3/change-text.ko.ts",
  /* 계정과 공통 조각. **조각이 말을 들면 그것을 쓰는 쪽이 전부 든다** */
  "src/app/my/page.tsx",
  "src/app/me/ui.tsx",
];

/**
 * ⑫ **아이콘은 구분용이고 emoji 는 쓰지 않는다.**
 *
 * emoji 는 기기마다 다른 그림이 서고 글자 크기를 따르지 않아, 한 줄 안에서
 * 그것만 다른 활자로 읽힌다. 표시는 `Icon` 하나로 간다.
 */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;

const out: string[] = [];
let bad = 0;
const flag = (s: string) => { bad += 1; out.push(`  걸림  ${s}`); };

for (const f of FILES) {
  const src = body(readFileSync(f, "utf8"));
  const emo = [...src.matchAll(EMOJI)];
  if (emo.length) flag(`${f} — emoji ${emo.length}개 (한도 0) · 표시는 Icon 하나로 간다`);
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
const TD = content(CORE).domains.domains.map((d) => d.code);
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
    /* **제품이 쓰는 묶음 하나를 그대로 읽는다**(`planDeps`) */
    }, planDeps(CORE));
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
  } else if (l.slot === "help" && isGloss(l.text)) {
    /**
     * **그 전공의 말에 붙는 받침은 다른 자로 잰다**(규격 §5).
     *
     * 안내문이 아니라 **낱말 하나를 받치는 줄**이고, 화면에 서는 꼴이
     * `낱말 — 쉬운 말` 이다. 안내문의 60자 한도로 재면 두 낱말이 걸린
     * 문항에서 멀쩡한 받침이 걸린다. 여기서 재는 것은 둘이다: 한 줄에
     * 두 낱말까지와, 낱말마다 쉬운 말이 40자 안이다
     */
    const parts = l.text.split(" · ");
    if (parts.length > 2) flag(`받침이 ${parts.length}개다 — [${l.id}] ${l.text}`);
    for (const one of parts) {
      const plain = one.split(" — ")[1] ?? "";
      if (plain.length > 40) flag(`받침이 길다(${plain.length}자) — [${l.id}] ${one}`);
    }
  } else if (l.slot === "help" && l.kind !== "transition" && l.text.length > 60) {
    flag(`도움말이 길다(${l.text.length}자) — [${l.id}] ${l.text}`);
  }
}

/** 그 전공의 말에 붙는 받침인가. 꼴이 `낱말 — 쉬운 말` 이다 */
function isGloss(t: string): boolean {
  return t.split(" · ").every((x) => / — /.test(x)) && / — /.test(t);
}

/* 같은 도움말이 성격이 다른 화면에 돌려 쓰이는가. 같은 종류의 화면이
   열둘 서는 것(영역 격자)은 되풀이가 아니라 같은 질문이다 */
const byHelp = new Map<string, Set<string>>();
for (const l of lines) {
  if (l.slot !== "help") continue;
  /* 받침은 **말마다 하나씩** 적어 둔 표에서 온다. 같은 낱말이 single 화면과
     pair 화면에 다 서는 것이 그 표의 설계이고, 그것을 돌려 쓴 안내문으로
     세면 멀쩡한 받침을 지우라고 요구하게 된다 */
  if (isGloss(l.text)) continue;
  if (!byHelp.has(l.text)) byHelp.set(l.text, new Set());
  byHelp.get(l.text)!.add(l.kind);
}
for (const [text, kinds] of byHelp) {
  if (kinds.size > 1) flag(`같은 도움말을 ${[...kinds].join(" · ")} 화면이 함께 쓴다 — ${text}`);
}

/* 고르는 자리에 붙는 한 줄도 같은 자로 잰다. **세 표 모두 Core 마다 따로**
   들어서(`ORG_HINT[core][code]`) 펼쳐서 잰다: 그대로 펼치면 표 하나가 글
   한 줄로 세어져 길이도 코드도 재지 않은 채 지나간다 */
const perCore = (t: Record<string, Record<string, string>>) => Object.fromEntries(Object.entries(t)
  .flatMap(([core, x]) => Object.entries(x).map(([k, v]) => [`${core}.${k}`, v])));
/* 산업 · 직무 표도 Core 마다 따로 든다(팩 코드가 Core 사이에 겹친다). 키에 Core 를
   붙여 펼치므로 같은 코드가 두 Core 에 있어도 한쪽이 다른 쪽을 덮지 않는다 */
for (const [k, v] of Object.entries({
  ...perCore(INDUSTRY_HINT), ...perCore(ROLE_HINT), ...perCore(ORG_HINT),
})) {
  if (CODE.test(v)) flag(`팩 설명에 내부 코드 — ${k}: ${v}`);
  if (v.length > 34) flag(`팩 설명이 길다(${v.length}자) — ${k}: ${v}`);
}
/* 표의 줄은 **그 Core 가 실제로 내놓는 카드**에만 붙어야 한다. 다른 Core 의
   코드를 적어 두면 화면에는 안 서고, 그 Core 의 카드는 빈 채로 남는다 */
for (const [t, offered] of [
  [INDUSTRY_HINT, (c: string) => industryChoices(c).map((p) => p.code)],
  [ROLE_HINT, (c: string) => roleChoices(c).map((p) => p.code)],
  [ORG_HINT, (c: string) => orgChoices(c).map((p) => p.code)],
] as const) {
  for (const [core, x] of Object.entries(t)) {
    const has = new Set(offered(core));
    for (const k of Object.keys(x)) {
      if (!has.has(k)) flag(`그 Core 가 내놓지 않는 카드의 설명 — ${core}.${k}`);
    }
  }
}
/* 보기 넷을 화면에 적는 말. **한 줄에 들어와야 한다**: 두 줄로 접히면
   둘째와 셋째를 눈으로 가르는 자리가 사라진다 */
/* 첫 줄은 **두 낱말 안짝**이어야 한다(GOLD MASTER §6): 백 번 가까이
   보는 보기라, 첫 줄이 길면 둘째와 넷째가 끝까지 읽어야 갈린다 */
for (const t of OWNERSHIP_SHORT) {
  if (t.length > 8) flag(`보기 첫 줄이 길다(${t.length}자) — ${t}`);
}
for (const t of OWNERSHIP_LABEL) {
  if (t.length > 14) flag(`보기 아래 한 마디가 길다(${t.length}자) — ${t}`);
}
for (const [k, v] of Object.entries(TIER_WHAT)) {
  if (CODE.test(v.what)) flag(`등급 설명에 내부 코드 — ${k}`);
}

/* ── 3. 문항 은행은 그대로인가 ────────────────────────────────── */
const bank = coreFile<{ items: { item_id: string }[]; level_options: string[] }>(
  "ME_CORE_V3", "items");
/* V2.8 에서 전기전자 · 경영 은행과 같은 말로 바꿨다. 수 · 차례 · 자리 번호의 뜻은 그대로다 */
const LEVEL = [
  "해 본 적 없다", "남이 정한 대로 하거나 남이 한 것을 받아 썼다", "내가 직접 했다",
  "내가 정했고, 그 결정대로 다음 일이 진행됐다",
];
if (JSON.stringify(bank.level_options) !== JSON.stringify(LEVEL)) {
  flag("보기 넷의 문면이 바뀌었다 — 네 단계의 뜻이 판정 규칙과 묶여 있다");
}

if (out.length) console.log(out.join("\n"));
console.log(bad
  ? `\n화면 카피 ${bad}곳이 후보로 걸렸다. **최종 판단은 문맥으로 한다.**`
  : `\n화면 카피 OK — 파일 ${FILES.length}벌 · 화면 글 ${lines.length}줄`
    + ` · 규칙 ${RULES.length + TICS.length}가지 · 문항 ${bank.items.length}개 그대로.`);
process.exitCode = bad ? 1 : 0;
