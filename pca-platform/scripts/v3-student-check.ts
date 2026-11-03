/**
 * **학생이 읽는 말을 세는 자리**(CROSS-CORE STUDENT LANGUAGE §4).
 *
 * `문구가 AI 같다` 를 눈으로 고치면 다음 회차에 그대로 돌아온다. 그래서
 * 금지 네 갈래를 기계가 센다. 느슨하게 하지 않는다: 한 Core 의 사정으로
 * 한도를 늘리면 다음 Core 가 그 느슨해진 줄을 물려받는다.
 */
import { readFileSync } from "node:fs";
import {
  EXAMPLE_FALLBACK, EXPERIENCE_EXAMPLE, EXPERIENCE_FLOW, FLOW_FALLBACK, STUDENT_COPY,
} from "../src/lib/me-v3/student/copy";
import { TRANSLATE_MENU, TRANSLATE_NEUTRAL } from "../src/lib/me-v3/student/translate";
import { COMMON_BY_CORE, COMMON_ME, COMMON_NEUTRAL, commonItemKo } from "../src/lib/me-v3/student/common";
import { FAMILY_FILL, FAMILY_LINE, FAMILY_MEANING }
  from "../src/lib/me-v3/student/icon";

/** R29 가 먼저 적은 여섯. 아래 세는 자리는 **콘텐츠가 선 Core 전부**를 본다 */
const FIRST_SIX = ["BIZ_CORE_V1", "NURSING_CORE_V1", "PUBADM_CORE_V1",
  "CS_CORE_V1", "EE_CORE_V1", "MEDIA_CORE_V1"];

/** **주석은 걷어 내고 본다.** 이 저장소는 `왜 지웠는가` 를 주석으로
 *  남기는 쪽을 택했고, 그 기록에는 지운 글자가 그대로 들어 있다. 세면
 *  맞는 기록을 지우라고 요구하게 된다 */
function body(f: string): string {
  return readFileSync(f, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

const reg = JSON.parse(readFileSync(
  "sites/pca-platform/content/major-cores.json", "utf8")) as {
    cores: { code: string; files?: Record<string, string> }[];
  };
/** 사전이 덮어야 하는 Core: 등록부에서 taxonomy 파일을 든 것 전부(Track B,
 *  2026-10-20). 손으로 적지 않는다: Core 를 하나 더 지은 날 이 목록이 따라온다 */
const GOLD = reg.cores.filter((c) => !!c.files?.taxonomy).map((c) => c.code);
function taxonomyCodes(core: string): string[] {
  const e = reg.cores.find((x) => x.code === core);
  const f = e?.files?.taxonomy;
  if (!f) return [];
  const t = JSON.parse(readFileSync(
    `sites/pca-platform/content/${f}`, "utf8")) as {
      technical_domains: { code: string }[];
    };
  return t.technical_domains.map((d) => d.code);
}

console.log("\n── 1. 사전이 taxonomy 를 빠짐없이 덮는가 ──");
for (const core of GOLD) {
  const want = taxonomyCodes(core);
  const got = Object.keys(STUDENT_COPY[core] ?? {});
  const miss = want.filter((c) => !got.includes(c));
  const extra = got.filter((c) => !want.includes(c));
  ok(`${core} 영역 ${want.length}개를 다 적었다`,
    want.length > 0 && miss.length === 0 && extra.length === 0,
    `빠진 ${miss.join(",")} 남는 ${extra.join(",")}`);
}

/* ── §4 금지 1 : 이름씨 둘을 가운뎃점으로 이은 taxonomy 축약 ── */
console.log("\n── 2. 금지 1 · 가운뎃점으로 이은 축약 ──");
{
  const hit: string[] = [];
  for (const core of GOLD) {
    for (const [td, v] of Object.entries(STUDENT_COPY[core] ?? {})) {
      if (v.activity.includes("·")) hit.push(`${core}/${td} ${v.activity}`);
    }
  }
  ok("활동 구에 가운뎃점이 없다", hit.length === 0, hit.slice(0, 3).join(" | "));
}

/* ── §4 금지 2 : 기계적인 이름씨 ──
   활동 구는 **행동으로 풀어 쓴다**. 영역 TITLE 은 전문 용어라 허용이고
   여기서 세지 않는다 */
console.log("\n── 3. 금지 2 · 기계적인 이름씨 ──");
{
  const TAIL = ["관리", "분석", "설계", "평가", "운영", "수행", "구현", "처리"];
  const hit: string[] = [];
  for (const core of GOLD) {
    for (const [td, v] of Object.entries(STUDENT_COPY[core] ?? {})) {
      const a = v.activity;
      /* 움직씨에서 온 이름씨 구인가: 끝이 `기` 이고 띄어쓰기가 있다 */
      const verby = /기$/.test(a) && a.includes(" ");
      const nouny = TAIL.some((t) => a.endsWith(t));
      if (!verby || nouny) hit.push(`${core}/${td} ${a}`);
    }
  }
  ok("활동 구가 전부 행동으로 끝난다", hit.length === 0, hit.slice(0, 3).join(" | "));
}

/* ── §4 금지 3 : 학생이 말하지 않는 추상어 ── */
console.log("\n── 4. 금지 3 · 안쪽 용어 ──");
{
  const WORD = ["산출물", "근거 수준", "판단 범위", "조건 이동", "증거",
    "적용 맥락", "성과 레이어", "확인된 판단", "채울 자리"];
  const hit: string[] = [];
  for (const core of GOLD) {
    for (const [td, v] of Object.entries(STUDENT_COPY[core] ?? {})) {
      const line = `${v.activity} ${v.evidence}`;
      for (const w of WORD) if (line.includes(w)) hit.push(`${core}/${td} ${w}`);
    }
  }
  ok("안쪽 용어가 0 이다", hit.length === 0, hit.slice(0, 3).join(" | "));
}

/* ── §4 금지 4 : 열둘이 같은 문법 틀로 끝나지 않는다 ── */
console.log("\n── 5. 금지 4 · 같은 틀 되풀이 ──");
for (const core of GOLD) {
  const list = Object.values(STUDENT_COPY[core] ?? {}).map((v) => v.activity);
  const tail = new Map<string, number>();
  for (const a of list) {
    const t = a.slice(-3);
    tail.set(t, (tail.get(t) ?? 0) + 1);
  }
  let top = ""; let n = 0;
  for (const [t, c] of tail) if (c > n) { top = t; n = c; }
  /* 한 끝맺음이 절반을 넘으면 그 열둘은 한 틀이다 */
  ok(`${core} 한 끝맺음이 절반을 넘지 않는다`,
    list.length > 0 && n * 2 <= list.length, `${top} ${n}/${list.length}`);
}

/* ── 카드 두 줄 안에 들어가는가 ──
   **문구가 안 들어가면 UI 를 늘리지 않고 문구를 다시 쓴다**(§13). 자리
   셋이 한 줄에 서는데 한 Core 만 세 줄로 접히면 그 줄이 서로 다른
   부품을 모아 놓은 것으로 읽힌다 */
console.log("\n── 6. 활동 구가 카드 두 줄 안에 들어간다 ──");
{
  const LIMIT = 16;
  const hit: string[] = [];
  for (const core of GOLD) {
    for (const [td, v] of Object.entries(STUDENT_COPY[core] ?? {})) {
      if (v.activity.length > LIMIT) {
        hit.push(`${core}/${td} ${v.activity}(${v.activity.length})`);
      }
    }
  }
  ok(`활동 구가 ${LIMIT}자 안짝이다`, hit.length === 0, hit.slice(0, 3).join(" | "));
}

/* ── 작업공간 타일 한 줄에 들어가는가 ── */
console.log("\n── 7. 남는 것의 이름이 한 줄에 들어간다 ──");
{
  const LIMIT = 8;
  const hit: string[] = [];
  for (const core of GOLD) {
    for (const [td, v] of Object.entries(STUDENT_COPY[core] ?? {})) {
      const n = v.evidence.replace(/\s/g, "").length;
      if (!v.evidence || n > LIMIT) hit.push(`${core}/${td} ${v.evidence}(${n})`);
    }
  }
  ok(`남는 것의 이름이 ${LIMIT}자 안짝이다`, hit.length === 0,
    hit.slice(0, 3).join(" | "));
}

/* ── §5 표시는 자리가 아니라 뜻이 고른다 ── */
console.log("\n── 8. 표시 ──");
{
  const fams = Object.keys(FAMILY_MEANING);
  ok("갈래가 여덟에서 열둘 사이다", fams.length >= 8 && fams.length <= 12,
    `${fams.length}`);
  const miss = fams.filter((f) => !(f in FAMILY_FILL) || !(f in FAMILY_LINE));
  ok("갈래마다 면 글리프와 선 글리프가 있다", miss.length === 0, miss.join(","));
  const glyphs = new Set(Object.values(FAMILY_FILL));
  ok("면 글리프가 갈래마다 다르다", glyphs.size === fams.length,
    `${glyphs.size}`);
  /* 갈래 밖의 값을 쓰지 않는다 */
  const wrong: string[] = [];
  for (const core of GOLD) {
    for (const [td, v] of Object.entries(STUDENT_COPY[core] ?? {})) {
      if (!(v.family in FAMILY_MEANING)) wrong.push(`${core}/${td} ${v.family}`);
    }
  }
  ok("사전이 적은 갈래가 전부 표 안에 있다", wrong.length === 0,
    wrong.slice(0, 3).join(" | "));

  /* **자리로 정하는 코드가 남아 있지 않다.** 되돌려 넣으면 걸린다 */
  const strip = [
    "src/app/v3/[attemptId]/result/body.tsx",
    "src/app/me/page.tsx",
  ].map(body).join("\n");
  ok("표시를 카드 차례로 고르지 않는다",
    !/TILE_IC\b/.test(strip) && !/icon:\s*[A-Z_]+\[\s*i\s*%/.test(strip));
  ok("표시를 코드 번호 한 표로 고르지 않는다",
    !/TILE_ICON\s*:/.test(strip) && !/TILE_ICON\[/.test(strip));
}

/* ── §7 경험 예시가 전공마다 다르다 ── */
console.log("\n── 9. 경험 추가의 예시 ──");
{
  const vals = GOLD.map((c) => EXPERIENCE_EXAMPLE[c] ?? "");
  ok(`${GOLD.length} Core 에 예시가 있다`, vals.every(Boolean));
  ok(`${GOLD.length} 예시가 서로 다르다`, new Set(vals).size === vals.length);
  ok("먼저 적은 여섯이 그 안에 있다", FIRST_SIX.every((c) => GOLD.includes(c)));
  ok("되돌아갈 자리가 전공을 가리키지 않는다",
    !/기계|경영|간호|회로|행정|영상/.test(EXAMPLE_FALLBACK), EXAMPLE_FALLBACK);
  const srcs = body("src/app/me/experience/compose.tsx");
  ok("공통 화면에 한 전공의 예시가 글자로 박혀 있지 않다",
    !/전동 스쿠터/.test(srcs));
}

/* ── §6 두 화면이 한 사전을 읽는다 ── */
console.log("\n── 10. 한 사전을 읽는가 ──");
{
  /* R30: 두 화면이 `현재 상태` 를 **한 함수**(`studentStateView`)로 읽는다.
     어느 영역을 세우고 세부에 무엇을 적고 머리에 무엇을 적는지가 그 한
     자리에서 정해지고, 그 함수가 사전을 읽는다 */
  const r = body("src/app/v3/[attemptId]/result/body.tsx");
  const m = body("src/app/me/page.tsx");
  const v = body("src/lib/me-v3/student/state.ts");
  ok("결과지가 학생 사전을 읽는다", /studentStateView/.test(r));
  ok("작업공간이 학생 사전을 읽는다", /studentStateView/.test(m));
  ok("그 자리가 사전을 읽는다", /STUDENT_COPY/.test(v));
  /* `subareas` 를 잘라 쓰는 길이 학생 화면에 직접 남아 있지 않다 */
  ok("결과지가 taxonomy 토막을 직접 쓰지 않는다", !/domainSub/.test(r) && !/\btileSub\(/.test(r));
  /* 실제로 남긴 것이 사전의 결과물 이름보다 먼저다 */
  ok("세부 줄이 실제 산출물을 먼저 본다", /artifacts/.test(v) && /thingKo/.test(v));
}

/* ── Core 를 건너 같은 문장을 돌려 쓰지 않는다 ──
 *
 * 한 Core 안의 열둘이 서로 달라도, 경영과 행정이 **글자까지 같은 줄**을
 * 들면 그 둘은 전공명만 바뀐 같은 화면으로 읽힌다. R29 의 첫 판본이 그
 * 모양이었다: `목표와 성과 기준 정하기 / 세우기` 와 `사업계획서` 가 두
 * Core 의 첫 카드에 나란히 섰다.
 *
 * **표시 갈래는 세지 않는다**: 같은 뜻이면 갈래를 나눠 쓰는 것이 §5 다. */
console.log("\n── 11. Core 를 건너 겹치지 않는가 ──");
{
  for (const key of ["activity", "evidence"] as const) {
    const m = new Map<string, string[]>();
    for (const c of GOLD)
      for (const [td, v] of Object.entries(STUDENT_COPY[c] ?? {})) {
        const w = m.get(v[key]) ?? [];
        w.push(`${c.replace("_CORE_V1", "")}/${td}`);
        m.set(v[key], w);
      }
    const dup = [...m].filter(([, w]) => w.length > 1);
    ok(`${key === "activity" ? "활동" : "결과물"} 이 Core 를 건너 겹치지 않는다`,
      dup.length === 0, dup.map(([s, w]) => `${s}(${w.join(",")})`).join(" · "));
  }
}

/* ── R30 PHASE 2 : 경험 추가가 그 Core 의 말로 묻는다 ──
 *
 * 2단의 이름과 영역을 부르는 말이 `기술 판단` 과 `기술영역` 으로 화면에
 * 글자로 박혀 있었다. 기계공학에서 온 말이라 경영학과 학생은 자기 과제를
 * 그 말로 읽지 못한다. 지금은 사전(`EXPERIENCE_FLOW`)이 들고, 아홉 종류를
 * 세 묶음으로 세우되 **종류를 하나도 빠뜨리거나 더하지 않는다**. */
console.log("\n── 12. 경험 추가가 그 Core 의 말로 묻는가 ──");
{
  for (const c of GOLD) ok(`${c} 에 흐름 말이 있다`, Boolean(EXPERIENCE_FLOW[c]));
  ok("되돌아갈 자리가 전공을 가리키지 않는다",
    !/기술|경영|간호|행정|개발|제작/.test(FLOW_FALLBACK.step2 + FLOW_FALLBACK.domainWord));
  const steps = body("src/app/me/experience/steps.tsx");
  const comp = body("src/app/me/experience/compose.tsx");
  ok("걸음 이름과 영역 말이 화면에 글자로 박혀 있지 않다",
    !/["'`>]기술 판단["'`<]|어느 기술영역의/.test(steps + comp));
  ok("두 화면이 사전의 흐름 말을 읽는다",
    /experienceFlow\(/.test(comp) && /flow\.domainWord/.test(steps) && /flow\.step2/.test(steps));
  ok("영역 칸이 학생 활동 구를 든다", /studentActivity\(/.test(comp) && /d\.sub/.test(steps));
  ok("걸음마다 안내가 선다", (steps.match(/<Guide /g) ?? []).length === 3);
  /* 아홉 종류가 세 묶음에 빠짐없이 한 번씩 든다. 종류의 정본은 `platform.ts` 다 */
  const platform = body("src/lib/me-v3/platform.ts");
  /* 종류 블록만 본다: 같은 파일의 지원 기록 상태(`watching` …)가 같은 꼴이다 */
  const block = platform.slice(platform.indexOf("EXPERIENCE_KINDS = ["),
    platform.indexOf("] as const", platform.indexOf("EXPERIENCE_KINDS = [")));
  const kinds = [...block.matchAll(/\{ code: "([a-z]+)", label:/g)].map((m) => m[1]);
  const grouped = [...comp.matchAll(/codes: \[([^\]]+)\]/g)]
    .flatMap((m) => m[1].split(",").map((x) => x.trim().replace(/"/g, "")));
  ok("종류 아홉이 세 묶음에 빠짐없이 한 번씩 든다",
    kinds.length === 9 && grouped.length === 9 && kinds.every((k) => grouped.includes(k)),
    `정본 ${kinds.join(",")} / 묶음 ${grouped.join(",")}`);
}

/* ── §13 R31 Human Review 결함 다섯 ── */
console.log("\n── 13. Human Review 결함이 닫혔는가 ──");
{
  const v = body("src/lib/me-v3/student/state.ts");
  /* (a) 카드 셋의 세부가 한 종류다: 전부 남긴 것일 때만 그 이름 */
  ok("현재 상태 세부가 한 종류다", /rows\.every\(\(r\) => r\.left\)/.test(v) && /kind: StateTileKind;/.test(v));
  const steps = body("src/app/me/experience/steps.tsx");
  const comp = body("src/app/me/experience/compose.tsx");
  /* (b) 2단이 그 사람의 결과가 서 있는 영역부터 세우고 나머지를 접는다 */
  ok("2단이 결과가 선 영역부터 세운다", /suggest/.test(steps) && /is-dom-more/.test(steps));
  ok("먼저 세울 영역을 두 화면과 같은 함수로 고른다", /studentStateView\(/.test(comp));
  ok("접힌 안의 칸도 같은 이름으로 보낸다",
    (steps.match(/name="td"/g) ?? []).length === 1 && /rest\.map\(domPick\)/.test(steps));
  /* (c) 저장 직후가 일곱을 차례로 적고 내부 근거 수를 나열하지 않는다 */
  const rc = body("src/app/me/recompute/page.tsx");
  for (const h of ["경험이 저장됐어요", "기록으로 확인된 역할과 판단",
    "실제 달라진 현재 상태", "다음에 보완할 것", "현재 상태 확인하기", "다른 경험 추가하기"]) {
    ok(`저장 직후에 \`${h}\` 가 선다`, rc.includes(h));
  }
  ok("저장 직후가 경험 근거 수를 나열하지 않는다", !/경험 근거 \{/.test(rc) && !/AXIS_SLOT_KO/.test(rc));
  ok("저장 직후의 제목이 그 사람의 말이다", /fresh\.title/.test(rc) && /cm-saved-title/.test(rc));
  ok("고른 판단이 없으면 그 절이 서지 않는다", /said\.length \?/.test(rc));
  /* (d) 반쯤 선 축의 말이 머리글과 부딪히지 않는다 */
  const t = body("src/lib/me-v3/result/text.ko.ts");
  ok("반쯤 선 축이 `아직 없습니다` 로 적히지 않는다",
    !/어디까지 직접 정했는지가 아직 없습니다/.test(t) && /직접 정한 것은 보이고/.test(t));
  /* (e) 홈 영역 칸의 거드는 줄이 한 줄 말줄임이 아니다 */
  const css = body("src/app/me/platform.css");
  const small = css.slice(css.indexOf(".cm-tile-txt small {"), css.indexOf("}", css.indexOf(".cm-tile-txt small {")));
  ok("영역 칸 거드는 줄이 한 줄에서 잘리지 않는다", !/nowrap/.test(small) && /line-clamp: 2/.test(small));
}

/* ── §14 경험 번역 보기가 Core 마다 든다 (R31 · PDF 검증에서 찾은 자리) ── */
console.log("\n── 14. 번역 보기가 Core 마다 서는가 ──");
{
  const menus = body("src/lib/me-v3/runtime/menus.ts");
  ok("공통 층이 번역 보기를 글자로 들지 않는다", !/const TRANS\b/.test(menus) && /translateMenu\(ctx\.core/.test(menus));
  const ids = Object.keys(TRANSLATE_NEUTRAL);
  ok("중립 벌이 열 단계를 다 든다", ids.length === 10 && ids.every((k) => /^TR_T\d+$/.test(k)));
  for (const c of ["ME_CORE_V3", "BIZ_CORE_V1"]) {
    const m = TRANSLATE_MENU[c];
    ok(`${c} 에 번역 보기가 있다`, !!m && Object.keys(m).length === 10);
    /* 저장되는 값이 보기의 자리라 **수와 차례**가 세 벌에서 같아야 한다 */
    ok(`${c} 의 단계마다 보기 수가 중립 벌과 같다`,
      !!m && ids.every((k) => m[k].options.length === TRANSLATE_NEUTRAL[k].options.length));
    ok(`${c} 의 \`없다\` 보기가 같은 자리에 선다`, !!m
      && /없다$/.test(m.TR_T6.options[3]) && /않았다$/.test(m.TR_T7.options[4])
      && /없다$/.test(m.TR_T8.options[3]) && /없다$/.test(m.TR_T9.options[4]));
  }
  const biz = Object.values(TRANSLATE_MENU.BIZ_CORE_V1).flatMap((x) => x.options).join(" ");
  ok("경영 벌에 기계공학의 말이 없다", !/치수|재질|부품|해석|시험|계측|도면|공정|인증|형상/.test(biz),
    (biz.match(/치수|재질|부품|해석|시험|계측|도면|공정|인증|형상/) ?? ["없다"])[0]);
  const neu = Object.values(TRANSLATE_NEUTRAL).flatMap((x) => x.options).join(" ");
  ok("중립 벌이 한 전공을 가리키지 않는다", !/치수|재질|부품|해석|도면|공정|인증|형상|고객|예산|매출/.test(neu),
    (neu.match(/치수|재질|부품|해석|도면|공정|인증|형상|고객|예산|매출/) ?? ["없다"])[0]);
  const cores = Object.keys(TRANSLATE_MENU);
  console.log(`  적어둠  제 벌을 드는 Core ${cores.length} (${cores.join(" · ")}) · 나머지는 중립 벌`);
}

/* ── §15 영역에 걸치지 않는 판단의 이름이 Core 마다 든다 (R34 · Staging PDF 9쪽) ── */
console.log("\n── 15. 공통 판단·학위 묶음의 이름이 Core 마다 서는가 ──");
{
  const tko = body("src/lib/me-v3/result/text.ko.ts");
  ok("결과 문장이 그 Core 의 벌을 읽는다", /commonItemKo\(core, id\)/.test(tko) && /COMMON_ITEM_KO: Record<string, string> = COMMON_ME/.test(tko));
  ok("결과지가 Core 를 넘긴다", /commonKo\(model\.common, core\)/.test(body("src/app/v3/[attemptId]/result/body.tsx")));
  const ids = Object.keys(COMMON_ME);
  ok("기계공학 벌이 서른을 든다", ids.length === 30);
  ok("중립 벌이 같은 번호를 빠짐없이 든다", ids.every((k) => !!COMMON_NEUTRAL[k]) && Object.keys(COMMON_NEUTRAL).length === 30);
  /* 기계공학에서만 쓰는 말만 센다. `설계` 와 `해석` 은 건축과 전기전자의 말이기도 하다 */
  const ME_WORDS = /치수|실험값|계산값|시작품|캡스톤/;
  const all = reg.cores.map((c) => c.code).filter((c) => !!COMMON_BY_CORE[c] || c !== "ME_CORE_V3");
  const missing: string[] = []; const stray: string[] = [];
  for (const c of all) {
    for (const k of ids) {
      const t = commonItemKo(c, k);
      if (!t) missing.push(`${c}:${k}`);
      else if (c !== "ME_CORE_V3" && c !== "EE_CORE_V1" && ME_WORDS.test(t)) stray.push(`${c}:${k}:${t}`);
    }
  }
  ok("Core 마다 서른 번호가 전부 이름을 든다", missing.length === 0, missing.slice(0, 4).join(" "));
  ok("이공계 밖 Core 의 벌에 기계공학의 말이 없다", stray.length === 0, stray.slice(0, 3).join(" | "));
  const extra = Object.entries(COMMON_BY_CORE).flatMap(([c, m]) => Object.keys(m).filter((k) => !ids.includes(k)).map((k) => `${c}:${k}`));
  ok("Core 벌에 은행에 없는 번호가 없다", extra.length === 0, extra.join(" "));
  const biz = ids.map((k) => commonItemKo("BIZ_CORE_V1", k)).join(" ");
  ok("경영 벌이 조건이나 치수를 말하지 않는다", !/치수|실험값/.test(biz));
  console.log(`  적어둠  제 벌을 드는 Core ${Object.keys(COMMON_BY_CORE).length} · 나머지는 중립 벌`);
}

console.log(`\n통과 ${pass} · 걸림 ${bad.length}`);
if (bad.length) { for (const b of bad) console.log(`  - ${b}`); process.exit(1); }
console.log("학생 언어 OK");
