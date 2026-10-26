/**
 * 영어판 1단계(이공계 셋)가 **한국어판과 같은 검사로 서는가.**
 *
 * 묻는 것은 다섯이다(`docs/metri/GLOBAL_EN_PLAN.md` 검사 절).
 *
 *   1. 원고   `content/en/` 이 원본과 구조가 같은가(id · 길이 · 비글자 칸),
 *             글자 칸이 비지 않았고 한글이 없는가. **없는 파일은 세고 넘어간다**
 *   2. 사전   화면 · 결과 사전이 한국어 열쇠를 빠짐없이 들고 있고 한글이 없는가
 *   3. 화면   영어 응시의 계획을 등급 × 학위로 세워 보이는 글자에 한글이 없는가
 *   4. 판정   같은 응답이면 두 언어의 스냅샷과 결과 모델이 글자까지 같은가
 *   5. 결과   영어로 읽은 결과 모델과 결과 문장에 한글이 없는가
 *
 * **원고가 없을 때도 돈다.** 3~5 는 원고가 다 있는 Core 만 보고, 없는 Core 는
 * 그 사실을 적는다. 4 의 왕복은 원고가 없어도 돌 수 있게 **임시 원고**를 만들어
 * (한국어 글자 앞에 표지를 붙인 벌) 한 번 더 돈다: 판정이 언어를 모른다는 것은
 * 원고의 품질과 무관하게 서야 한다.
 *
 * 번역의 **질**은 이 검사가 재지 못한다. 원어민 · 현직자 검수 전에는
 * `검증된 영어판` 으로 팔지 않는다(원칙 5).
 *
 *   npm run v3:i18n
 *   CORE=EE_CORE_V1 npm run v3:i18n     # 한 Core 만
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";

import {
  CONTENT_DIR, core as coreEntry, coreFile, packs, registry, sharedFileName, type CoreFile, type PackKind,
} from "../src/lib/me-v3/core-registry";
import { EDITION_CORES, TRANSLATED_FILES, hasEdition, localeFor } from "../src/lib/me-v3/i18n";
import { COPY_KO } from "../src/lib/me-v3/runtime/copy.ko";
import { COPY_EN } from "../src/lib/me-v3/runtime/copy.en";
import { tierText } from "../src/app/v3/tier-text.i18n";
import * as TEXT_KO from "../src/lib/me-v3/result/text.ko";
import * as TEXT_EN from "../src/lib/me-v3/result/text.en";
import { REASON_EN } from "../src/lib/me-v3/result/reason.en";
import { REASON_CODES } from "../src/lib/me-v3/scoring/reason-codes";
import { COMMON_BY_CORE, COMMON_NEUTRAL } from "../src/lib/me-v3/student/common";
import { commonItemEn } from "../src/lib/me-v3/result/common.en";
import { translateMenus } from "../src/lib/me-v3/student/translate";
import { CHAIN_KO, chainFor } from "../src/lib/me-v3/result/chains";
import { PHRASES_EN } from "../src/lib/me-v3/phrases.en";
import { RETAKE_BLOCKED_KO } from "../src/lib/me-v3/retake";
import { CHART_NOTE } from "../src/app/v3/[attemptId]/result/charts";
import { buildPlan, stageLabel, stageLeadOf, STAGES } from "../src/lib/me-v3/runtime/blocks";
import { progressOf } from "../src/lib/me-v3/runtime/progress";
import { controlOf, type MenuContext } from "../src/lib/me-v3/runtime/menus";
import { branchBlock, crossField } from "../src/lib/me-v3/runtime/routing";
import {
  axisAsk, canonicalPicks, checklistFor, content, domainName, domainSub, industryChoices,
  industryGloss, itemOf, optionGuidance, orgChoices, planDeps, roleChoices, wordingOf,
} from "../src/lib/me-v3/runtime/session";
import { exampleOf, sceneHint } from "../src/lib/me-v3/runtime/examples";
import { termGlossOf } from "../src/lib/me-v3/runtime/terms";
import { load, score } from "../src/lib/me-v3/scoring/engine";
import { expand, stable, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../src/lib/me-v3/result/build";
import { localizeResult } from "../src/lib/me-v3/result/localize";
import type { GradField, Stage, Submission, Tier } from "../src/lib/me-v3/scoring/types";
import type { ResultModel } from "../src/lib/me-v3/result/model";

const HANGUL = /[가-힣]/;
const CORES = process.env.CORE ? [process.env.CORE] : [...EDITION_CORES.en];

let pass = 0, fail = 0;
const notes: string[] = [];
function ok(name: string, good: boolean, detail = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${name}${detail ? " — " + detail : ""}`); }
  else { fail += 1; console.log(`  걸림  ${name}${detail ? " — " + detail : ""}`); }
}
const sample = (xs: string[], n = 3) => xs.slice(0, n).map((x) => x.slice(0, 90)).join(" | ");

/* ── 1. 원고 ─────────────────────────────────────────────────────────── */

/**
 * 원본과 영어 벌을 나란히 걷는다.
 *
 * 한국어 글자가 든 칸은 **글자 칸**이다: 영어 벌에서 비지 않았고 한글이 없어야
 * 한다. 한글이 없는 칸(코드 · 숫자 · 영문 약어)은 **비글자 칸**이고 글자까지
 * 같아야 한다. 배열 길이와 키 묶음은 언제나 같아야 한다: 차례가 곧 보기 번호다.
 */
type Diff = { path: string; why: string };
/** 한글이 들었지만 **코드**인 칸. 코드가 그 값을 글자로 비교한다(`response_scale === "5보기"`) */
const CODE_KEYS = new Set(["response_scale"]);
function compare(ko: unknown, en: unknown, path: string, out: Diff[]): void {
  if (out.length > 200) return;
  if (typeof ko === "string") {
    if (typeof en !== "string") { out.push({ path, why: "글자가 아님" }); return; }
    const key = path.slice(path.lastIndexOf(".") + 1);
    if (CODE_KEYS.has(key)) {
      if (ko !== en) out.push({ path, why: `코드 칸이 다름: ${ko} → ${en}` });
      return;
    }
    if (HANGUL.test(ko)) {
      if (!en.trim()) out.push({ path, why: "빈 글자" });
      else if (HANGUL.test(en)) out.push({ path, why: `한글 남음: ${en.slice(0, 60)}` });
    } else if (ko !== en) {
      out.push({ path, why: `비글자 칸이 다름: ${JSON.stringify(ko).slice(0, 40)} → ${JSON.stringify(en).slice(0, 40)}` });
    }
    return;
  }
  if (Array.isArray(ko)) {
    if (!Array.isArray(en)) { out.push({ path, why: "배열이 아님" }); return; }
    if (ko.length !== en.length) out.push({ path, why: `길이 ${ko.length} → ${en.length}` });
    ko.forEach((k, i) => compare(k, en[i], `${path}[${i}]`, out));
    return;
  }
  if (ko && typeof ko === "object") {
    if (!en || typeof en !== "object" || Array.isArray(en)) { out.push({ path, why: "객체가 아님" }); return; }
    const a = Object.keys(ko as object).sort();
    const b = Object.keys(en as object).sort();
    const miss = a.filter((k) => !b.includes(k));
    const extra = b.filter((k) => !a.includes(k));
    if (miss.length) out.push({ path, why: `빠진 키 ${miss.slice(0, 5).join(",")}` });
    if (extra.length) out.push({ path, why: `더한 키 ${extra.slice(0, 5).join(",")}` });
    for (const k of a) {
      if (b.includes(k)) {
        compare((ko as Record<string, unknown>)[k], (en as Record<string, unknown>)[k], `${path}.${k}`, out);
      }
    }
    return;
  }
  if (ko !== en) out.push({ path, why: `값이 다름: ${String(ko)} → ${String(en)}` });
}

/**
 * **고르는 목록 안에서 영어 글자가 겹치면 안 된다.** 고른 항목은 응시 언어의
 * 글자로 저장되고 채점 직전에 차례 번호로 원본에 되돌려지는데(`canonicalPicks`),
 * 두 항목이 같은 영어가 되면 뒤엣것이 앞엣것으로 돌아가 판정이 달라진다.
 */
function dupesIn(lists: [string, string[], string[]][]): string[] {
  const out: string[] = [];
  for (const [where, ko, en] of lists) {
    const seen = new Map<string, number>();
    en.forEach((t, i) => {
      const j = seen.get(t);
      if (j !== undefined && ko[j] !== ko[i]) out.push(`${where}: ${t.slice(0, 50)}`);
      else seen.set(t, i);
    });
  }
  return out;
}

type Checklists = { domains: Record<string, Record<string, { text: string }[]>> };
type Domains = { domains: { code: string; artifacts: string[]; verify_targets: string[] }[] };

function fileCheck(core: string): { complete: boolean } {
  const c = coreEntry(core);
  const enDir = join(CONTENT_DIR, "en");
  const wanted: [string, () => unknown, () => unknown][] = [];
  for (const k of TRANSLATED_FILES) {
    const name = c.files[k as CoreFile];
    if (!name) continue;
    wanted.push([name, () => coreFile(core, k, CONTENT_DIR), () => coreFile(core, k, CONTENT_DIR, "en")]);
  }
  for (const [k, name] of Object.entries(c.packs ?? {})) {
    if (!name) continue;
    wanted.push([name, () => packs(core, k as PackKind, CONTENT_DIR), () => packs(core, k as PackKind, CONTENT_DIR, "en")]);
  }
  const missing: string[] = [];
  for (const [name, ko, en] of wanted) {
    if (!existsSync(join(enDir, name))) { missing.push(name); continue; }
    const diffs: Diff[] = [];
    compare(ko(), en(), name, diffs);
    ok(`${core} · ${name} 구조와 글자`, diffs.length === 0,
      diffs.length ? `${diffs.length}곳 · ${sample(diffs.map((d) => `${d.path} ${d.why}`))}` : "");
  }
  /* 공용 칸: 원본 짝이 없는 파일이라 모양과 한글만 본다 */
  const shared = sharedFileName(core);
  if (!existsSync(join(enDir, shared))) missing.push(shared);
  else {
    const raw = JSON.parse(readFileSync(join(enDir, shared), "utf8")) as Record<string, unknown>;
    const han: string[] = [];
    (function walk(v: unknown, p: string): void {
      if (typeof v === "string") { if (HANGUL.test(v)) han.push(`${p}: ${v.slice(0, 50)}`); return; }
      if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}[${i}]`)); return; }
      if (v && typeof v === "object") {
        /* `terms` 의 열쇠는 한국어 용어 자체다(문면에서 찾는 말). 값만 본다 */
        for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, `${p}.${k}`);
      }
    })(raw, shared);
    ok(`${core} · ${shared} 한글 없음`, raw.core === core && han.length === 0,
      raw.core !== core ? `core 칸이 ${String(raw.core)}` : han.length ? `${han.length}곳 · ${sample(han)}` : "");
  }
  if (missing.length) {
    ok(`${core} · 영어 원고 파일`, false, `없음 ${missing.length}: ${missing.join(", ")}`);
    return { complete: false };
  }
  ok(`${core} · 영어 원고 파일`, true, `${wanted.length + 1}벌`);

  /* 고르는 목록의 겹침 */
  const ko = { lists: coreFile<Checklists>(core, "checklists"), dom: coreFile<Domains>(core, "domains") };
  const en = { lists: coreFile<Checklists>(core, "checklists", CONTENT_DIR, "en"), dom: coreFile<Domains>(core, "domains", CONTENT_DIR, "en") };
  const lists: [string, string[], string[]][] = [];
  for (const [td, byAx] of Object.entries(ko.lists.domains)) {
    for (const [ax, items] of Object.entries(byAx)) {
      lists.push([`${td}.${ax}`, items.map((x) => x.text), (en.lists.domains[td]?.[ax] ?? []).map((x) => x.text)]);
    }
  }
  for (const d of ko.dom.domains) {
    const e = en.dom.domains.find((x) => x.code === d.code);
    lists.push([`${d.code}.artifacts`, d.artifacts, e?.artifacts ?? []]);
    lists.push([`${d.code}.verify`, d.verify_targets, e?.verify_targets ?? []]);
  }
  const dup = dupesIn(lists);
  ok(`${core} · 고르는 목록에 같은 영어가 없다`, dup.length === 0, dup.length ? sample(dup) : `${lists.length}목록`);
  return { complete: hasEdition(core, "en") };
}

/* ── 2. 사전 ─────────────────────────────────────────────────────────── */

/** 값 안의 한글. 함수는 표본 인자로 불러 본다 */
function hangulIn(v: unknown, p: string, out: string[], depth = 0): void {
  if (depth > 8) return;
  if (typeof v === "string") { if (HANGUL.test(v)) out.push(`${p}: ${v.slice(0, 60)}`); return; }
  if (typeof v === "function") {
    try {
      const args = Array.from({ length: (v as (...a: unknown[]) => unknown).length }, () => "X");
      hangulIn((v as (...a: unknown[]) => unknown)(...args), `${p}()`, out, depth + 1);
    } catch { /* 표본 인자로 못 부르는 함수는 넘긴다(아래 결과 검사가 실제 값으로 부른다) */ }
    return;
  }
  if (Array.isArray(v)) { v.forEach((x, i) => hangulIn(x, `${p}[${i}]`, out, depth + 1)); return; }
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) hangulIn(x, `${p}.${k}`, out, depth + 1);
  }
}

/** 한국어 벌의 키를 영어 벌이 다 들고 있는가(값이 객체면 그 안까지) */
function keysMissing(ko: unknown, en: unknown, p: string, out: string[], skip: (path: string) => boolean = () => false): void {
  if (skip(p)) return;
  if (Array.isArray(ko)) {
    if (!Array.isArray(en)) { out.push(`${p} 배열 아님`); return; }
    if (ko.length !== en.length) out.push(`${p} 길이 ${ko.length}→${en.length}`);
    return;
  }
  if (ko && typeof ko === "object" && typeof ko !== "function") {
    if (!en || typeof en !== "object") { out.push(`${p} 없음`); return; }
    for (const k of Object.keys(ko as object)) {
      const e = (en as Record<string, unknown>)[k];
      if (skip(`${p}.${k}`)) continue;
      if (e === undefined) { out.push(`${p}.${k}`); continue; }
      keysMissing((ko as Record<string, unknown>)[k], e, `${p}.${k}`, out, skip);
    }
  }
}

/** 소스에서 `tr("…")` · `t("…")` · `say("…")` · `phrase(x)("…")` 의 한국어 열쇠를 뽑는다 */
function phraseKeys(files: string[]): Map<string, string> {
  const keys = new Map<string, string>();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true,
      f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n)) {
        const e = n.expression;
        const name = ts.isIdentifier(e) ? e.text
          : ts.isCallExpression(e) && ts.isIdentifier(e.expression) ? `${e.expression.text}()` : "";
        const a0 = n.arguments[0];
        if (/^(tr|t|say|phrase\(\))$/.test(name) && a0
          && (ts.isStringLiteral(a0) || ts.isNoSubstitutionTemplateLiteral(a0))
          && HANGUL.test(a0.text) && !keys.has(a0.text)) {
          keys.set(a0.text, `${f}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return keys;
}

/** 사전을 거치는 화면 파일. 새로 바꾼 파일은 여기에 더한다 */
const PHRASE_FILES = [
  "src/app/v3/start/page.tsx", "src/app/v3/start/start-form.tsx",
  "src/app/v3/[attemptId]/page.tsx", "src/app/v3/[attemptId]/screen.tsx",
  "src/app/v3/[attemptId]/intro/page.tsx", "src/app/v3/[attemptId]/done/page.tsx",
  "src/app/v3/[attemptId]/result/body.tsx", "src/app/v3/[attemptId]/result/summary.tsx",
  "src/app/v3/[attemptId]/result/charts.tsx",
];

function dictCheck(): void {
  console.log("\n  [사전]");
  /* 화면 글 */
  {
    const miss: string[] = [];
    keysMissing(COPY_KO, COPY_EN, "copy", miss,
      /* Core 마다 다른 말(`coreCopy` · `axisAskByCore`)은 영어판이 공통 말로 선다 */
      (p) => p === "copy.coreCopy" || p === "copy.axisAskByCore"
        /* 갈래 말은 영어판을 여는 Core 만 본다 */
        || (p.startsWith("copy.branchByCore.") && !EDITION_CORES.en.includes(p.split(".")[2])));
    const han: string[] = [];
    hangulIn(COPY_EN, "COPY_EN", han);
    ok("검사 화면 사전(copy.en) 키", miss.length === 0, miss.length ? `${miss.length} · ${sample(miss)}` : "");
    ok("검사 화면 사전(copy.en) 한글 없음", han.length === 0, han.length ? sample(han) : "");
  }
  /* 등급 · 학위 · 보기 꼬리표 */
  {
    const ko = tierText("ko");
    const en = tierText("en");
    const miss: string[] = [];
    for (const k of Object.keys(ko) as (keyof typeof ko)[]) {
      if (k === "INDUSTRY_HINT" || k === "ROLE_HINT" || k === "ORG_HINT") {
        for (const core of CORES) {
          const kk = (ko[k] as Record<string, Record<string, string>>)[core] ?? {};
          const ee = (en[k] as Record<string, Record<string, string>>)[core] ?? {};
          const gone = Object.keys(kk).filter((c) => !ee[c]);
          /* 조직 꼬리표는 없으면 taxonomy 의 영어 `differs` 로 선다. 산업 · 직무는 빠지면 안 된다 */
          if (gone.length && k !== "ORG_HINT") miss.push(`${k}.${core}: ${gone.join(",")}`);
          else if (gone.length) notes.push(`${core} 조직 꼬리표 ${gone.length}개는 영어 taxonomy 의 설명으로 선다`);
        }
        continue;
      }
      keysMissing(ko[k], en[k], k, miss);
    }
    const han: string[] = [];
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      if (k === "INDUSTRY_HINT" || k === "ROLE_HINT" || k === "ORG_HINT") {
        for (const core of CORES) hangulIn((en[k] as Record<string, unknown>)[core], `${k}.${core}`, han);
        continue;
      }
      hangulIn(en[k], k, han);
    }
    hangulIn(en.undergradLabel("Mechanical Engineering"), "undergradLabel", han);
    hangulIn(en.undergradGloss("Mechanical Engineering", ""), "undergradGloss", han);
    ok("등급·학위 사전(tier-text.en) 키", miss.length === 0, miss.length ? sample(miss) : "");
    ok("등급·학위 사전(tier-text.en) 한글 없음", han.length === 0, han.length ? sample(han) : "");
  }
  /* 결과 문장: 내보내는 이름이 같은지는 타입이 이미 센다(`text.ts`). 여기는 값 */
  {
    const miss: string[] = [];
    const han: string[] = [];
    const names = Object.keys(TEXT_KO);
    const gone = names.filter((n) => !(n in TEXT_EN));
    for (const n of names) {
      const k = (TEXT_KO as Record<string, unknown>)[n];
      const e = (TEXT_EN as Record<string, unknown>)[n];
      if (typeof k === "function" || e === undefined) continue;
      keysMissing(k, e, n, miss);
      hangulIn(e, n, han);
    }
    ok("결과 문장(text.en) 내보내는 이름", gone.length === 0, gone.length ? gone.join(", ") : `${names.length}개`);
    ok("결과 문장(text.en) 표의 키", miss.length === 0, miss.length ? sample(miss) : "");
    ok("결과 문장(text.en) 표에 한글 없음", han.length === 0, han.length ? sample(han) : "");
  }
  /* 까닭 코드 · 공통 판단 · 번역 보기 · 일하는 차례 */
  {
    const gone = REASON_CODES.filter((c) => !REASON_EN[c]);
    const han: string[] = [];
    hangulIn(REASON_EN, "REASON_EN", han);
    ok("까닭 코드(reason.en)", gone.length === 0 && han.length === 0,
      gone.length ? `빠짐 ${gone.join(",")}` : han.length ? sample(han) : `${REASON_CODES.length}개`);
  }
  for (const core of CORES) {
    const ids = [...new Set([...Object.keys(COMMON_NEUTRAL), ...Object.keys(COMMON_BY_CORE[core] ?? {})])];
    const gone = ids.filter((id) => !commonItemEn(core, id));
    const han = ids.map((id) => commonItemEn(core, id) ?? "").filter((x) => HANGUL.test(x));
    ok(`${core} · 공통 판단 이름(common.en)`, gone.length === 0 && han.length === 0,
      gone.length ? `빠짐 ${gone.join(",")}` : han.length ? sample(han) : `${ids.length}개`);

    const mk = translateMenus(core, "ko");
    const me = translateMenus(core, "en");
    const tm: string[] = [];
    for (const [id, step] of Object.entries(mk)) {
      const e = me[id];
      if (!e) { tm.push(`${id} 없음`); continue; }
      if (e.options.length !== step.options.length) tm.push(`${id} 보기 ${step.options.length}→${e.options.length}`);
      if (Boolean(step.note) !== Boolean(e.note)) tm.push(`${id} 덧붙임 칸`);
      for (const x of [...e.options, e.note ?? ""]) if (HANGUL.test(x)) tm.push(`${id}: ${x.slice(0, 40)}`);
    }
    ok(`${core} · 번역 열 단계 보기`, tm.length === 0, tm.length ? sample(tm) : `${Object.keys(mk).length}단계`);

    const ch: string[] = [];
    for (const td of Object.keys(CHAIN_KO[core] ?? {})) {
      const k = chainFor(core, td, "ko");
      const e = chainFor(core, td, "en");
      if (k.length !== e.length) ch.push(`${td} 길이 ${k.length}→${e.length}`);
      for (const x of e) if (HANGUL.test(x)) ch.push(`${td}: ${x}`);
    }
    ok(`${core} · 일하는 차례(chains)`, ch.length === 0, ch.length ? sample(ch) : `${Object.keys(CHAIN_KO[core] ?? {}).length}영역`);
  }
  /* 화면 JSX 의 글: 소스에서 뽑은 열쇠 전부가 영어 사전에 있어야 한다 */
  {
    const keys = phraseKeys(PHRASE_FILES.filter((f) => existsSync(f)));
    /* 소스에 글자로 서지 않고 값으로 넘기는 열쇠 */
    const indirect = [CHART_NOTE, ...Object.values(RETAKE_BLOCKED_KO)];
    for (const k of indirect) if (!keys.has(k)) keys.set(k, "(값)");
    const gone = [...keys.entries()].filter(([k]) => !(k in PHRASES_EN)).map(([k, w]) => `${w} ${k}`);
    const han = Object.entries(PHRASES_EN).filter(([, v]) => HANGUL.test(v)).map(([k]) => k);
    const unused = Object.keys(PHRASES_EN).filter((k) => !keys.has(k));
    ok("화면 글 사전(phrases.en) 열쇠", gone.length === 0, gone.length ? `${gone.length} · ${sample(gone)}` : `${keys.size}개`);
    ok("화면 글 사전(phrases.en) 한글 없음", han.length === 0, han.length ? sample(han) : "");
    /* 배열에 담아 넘기는 자리(`intro` 의 세 칸 등)는 소스에서 열쇠로 안 잡힌다. 지우기 전에 찾아볼 것 */
    if (unused.length) notes.push(`소스에서 열쇠로 찾지 못한 영어 ${unused.length}개(값으로 넘기는 자리일 수 있다): ${sample(unused, 4)}`);
  }
}

/* ── 3. 화면 ─────────────────────────────────────────────────────────── */

function ctxOf(core: string, lang: "ko" | "en", tied: string[]): MenuContext {
  const tds = content(core, lang).domains.domains.map((d) => d.code);
  return {
    core, lang,
    tiedPair: tied.map((code) => ({ code, name: domainName(core, code, lang) })),
    domains: tds.map((code) => ({ code, name: domainName(core, code, lang) })),
    industries: industryChoices(core, lang).map((i) => ({ code: i.code, name: i.name })),
    roles: roleChoices(core, lang).map((r) => ({ code: r.code, name: r.name })),
    orgs: orgChoices(core, lang).map((o) => ({ code: o.code, name: o.name })),
  };
}

const BRANCHES: [Stage, GradField | null][] = [
  ["bachelor", null], ["master", "STEM"], ["phd", "STEM"], ["postdoc", "STEM"],
  ["master", "BUSINESS"],
];
const TIERS: Tier[] = ["BASIC", "STANDARD", "PRO"];

function screenCheck(core: string): void {
  const lang = "en" as const;
  const tds = content(core, lang).domains.domains.map((d) => d.code);
  const deps = planDeps(core, lang);
  const tt = tierText(lang);
  const ind = industryChoices(core, lang);
  const rol = roleChoices(core, lang);
  const han = new Set<string>();
  const add = (where: string, x: string | null | undefined) => {
    if (x && HANGUL.test(x)) han.add(`${where}: ${x.slice(0, 70)}`);
  };
  let screens = 0;
  for (const tier of TIERS) {
    for (const [stage, field] of BRANCHES) {
      const plan = buildPlan({
        tier, stage, branchBlock: branchBlock(stage, field), crossField: crossField(stage, field),
        probe: tds.slice(0, 2), deep: tds.slice(0, 3),
        industryInterest: ind.slice(0, 1).map((x) => x.code),
        roleInterest: rol.slice(0, 1).map((x) => x.code),
        tiedPair: [tds[0], tds[1]], touched: tds, consistAxis: null, strongCells: [],
      }, deps);
      for (const s of plan.screens) {
        screens += 1;
        const w = `${tier}/${stage}/${s.id}`;
        for (const x of [s.eyebrow, s.subject, s.question, s.help, s.term, s.strip,
          ...(s.body ?? []), ...(s.chips ?? []),
          ...(s.sections ?? []).flatMap((x) => [x.name, ...x.lines])]) add(w, x);
        add(`${w} stageLead`, stageLeadOf(s.stage, lang));
        const pr = progressOf(plan, s.id, lang);
        for (const st of pr.stages) add(`${w} progress`, st.label);
        for (const id of s.items) {
          const it = itemOf(core, id, lang);
          if (!it) continue;
          add(`${w} ${id}`, wordingOf(core, id, stage, lang));
          add(`${w} ${id} row`, it.grid_row);
          add(`${w} ${id} term`, termGlossOf(core, wordingOf(core, id, stage, lang), lang));
          add(`${w} ${id} example`, exampleOf(core, it, industryGloss(core, id, lang), undefined, lang));
          const c = controlOf(it, ctxOf(core, lang, [tds[0], tds[1]]));
          const opts = c.kind === "level" || c.kind === "exposure" ? c.options
            : c.kind === "scale5" ? c.labels
              : c.kind === "steps" ? [...c.options.map((o) => o.label), ...c.options.map((o) => o.short)]
                : [...c.options.map((o) => o.label), c.note?.label ?? ""];
          for (const o of opts) add(`${w} ${id} option`, o);
        }
        if (s.kind === "checklist" && s.domain) {
          for (const g of checklistFor(core, s.domain, lang)) {
            add(`${w} group`, g.label);
            add(`${w} group`, axisAsk(g.slot, core, lang));
            for (const i of g.items) add(`${w} item`, i);
          }
        }
      }
    }
  }
  /* 화면 밖에서 오는 글: 고르는 화면의 카드와 보기 안내 */
  for (const p of ind) { add("industry", p.name); add("industry", tt.INDUSTRY_HINT[core]?.[p.code] ?? p.first); }
  for (const p of rol) { add("role", p.name); add("role", tt.ROLE_HINT[core]?.[p.code] ?? p.domains.slice(0, 3).join(" · ")); }
  for (const p of orgChoices(core, lang)) { add("org", p.name); add("org", tt.ORG_HINT[core]?.[p.code] ?? p.first); }
  add("guide", optionGuidance(core, lang));
  for (const x of sceneHint(core, undefined, lang).split("\n")) add("scene", x);
  for (const td of tds) { add("domain", domainName(core, td, lang)); add("domainSub", domainSub(core, td, 40, lang)); }
  for (const st of STAGES) add("stage", stageLabel(st.code, lang));
  const list = [...han];
  ok(`${core} · 영어 응시 화면에 한글 없음`, list.length === 0,
    list.length ? `${list.length}곳 · ${sample(list)}` : `${screens}화면 (등급 3 × 학위 ${BRANCHES.length})`);
}

/**
 * 고르는 보기의 **값**이 두 언어에서 같은가. 강제 선택과 목표처럼 값이 글자인
 * 보기는 원본 글자를 값으로 쓰므로(`menus.ts`) 영어로 고른 답도 같은 값으로
 * 저장된다. 보이는 글자만 다르다.
 */
function controlCheck(core: string): void {
  const bank = content(core, "ko").bank.items;
  const tds = content(core, "ko").domains.domains.map((d) => d.code);
  const bad: string[] = [];
  for (const item of bank) {
    const ko = controlOf(item, ctxOf(core, "ko", [tds[0], tds[1]]));
    const enItem = itemOf(core, item.item_id, "en");
    if (!enItem) { bad.push(`${item.item_id} 영어 문항 없음`); continue; }
    const en = controlOf(enItem, ctxOf(core, "en", [tds[0], tds[1]]));
    if (ko.kind !== en.kind) { bad.push(`${item.item_id} 종류 ${ko.kind}→${en.kind}`); continue; }
    const vals = (c: typeof ko): string[] =>
      c.kind === "level" || c.kind === "exposure" ? c.options.map((_, i) => String(i))
        : c.kind === "scale5" ? c.labels.map((_, i) => String(i))
          : c.kind === "steps" ? c.options.map((o) => String(o.value))
            : c.options.map((o) => String(o.value));
    const a = vals(ko), b = vals(en);
    if (a.join("\u0001") !== b.join("\u0001")) bad.push(`${item.item_id} 값 ${a.length}→${b.length}`);
  }
  ok(`${core} · 보기 값이 두 언어에서 같다`, bad.length === 0, bad.length ? sample(bad) : `${bank.length}문항`);
}

/* ── 4. 판정 ─────────────────────────────────────────────────────────── */

type Picks = { checklists: Record<string, string[]>; artifacts: Record<string, string[]>; verifications: Record<string, string[]> };

/** 한국어로 고른 항목을 그 언어 원고의 **같은 자리** 글자로 옮긴다(영어로 응시한 사람이 고른 꼴) */
function toLang(core: string, lang: "en", p: Picks, dir: string): Picks {
  const ko = { lists: coreFile<Checklists>(core, "checklists", dir), dom: coreFile<Domains>(core, "domains", dir) };
  const xx = { lists: coreFile<Checklists>(core, "checklists", dir, lang), dom: coreFile<Domains>(core, "domains", dir, lang) };
  const at = (from: string[], to: string[], t: string) => to[from.indexOf(t)] ?? `?${t}`;
  const out: Picks = { checklists: {}, artifacts: {}, verifications: {} };
  for (const [k, list] of Object.entries(p.checklists)) {
    const [td, ax] = k.split(".");
    out.checklists[k] = list.map((t) => at((ko.lists.domains[td]?.[ax] ?? []).map((x) => x.text),
      (xx.lists.domains[td]?.[ax] ?? []).map((x) => x.text), t));
  }
  const d = (c: Domains, td: string) => c.domains.find((x) => x.code === td);
  for (const [td, list] of Object.entries(p.artifacts)) {
    out.artifacts[td] = list.map((t) => at(d(ko.dom, td)?.artifacts ?? [], d(xx.dom, td)?.artifacts ?? [], t));
  }
  for (const [td, list] of Object.entries(p.verifications)) {
    out.verifications[td] = list.map((t) => at(d(ko.dom, td)?.verify_targets ?? [], d(xx.dom, td)?.verify_targets ?? [], t));
  }
  return out;
}

function personas(core: string): Fixture[] {
  const f = coreEntry(core).fixtures?.personas;
  if (!f || !existsSync(f)) return [];
  return (JSON.parse(readFileSync(f, "utf8")) as { personas: Fixture[] }).personas;
}

/**
 * 같은 응답을 두 언어로 판정한다. 영어 응시는 고른 항목을 영어 글자로 저장하고,
 * 제출할 때 `canonicalPicks` 가 원본 글자로 되돌린다. 거기서 하나라도 어긋나면
 * 스냅샷이 달라진다.
 */
function goldenCheck(core: string, label: string, dir?: string): ResultModel[] {
  const fx = personas(core);
  if (!fx.length) { ok(`${core} · 영어 골든(${label})`, false, "persona fixture 가 없다"); return []; }
  const loaded = load(core);
  const bad: string[] = [];
  const models: ResultModel[] = [];
  for (const f of fx) {
    const ko = expand(f, core);
    const picksKo: Picks = { checklists: ko.checklists ?? {}, artifacts: ko.artifacts ?? {}, verifications: ko.verifications ?? {} };
    const picksEn = toLang(core, "en", picksKo, dir ?? CONTENT_DIR);
    const back = dir ? canonicalOf(core, picksEn, dir) : canonicalPicks(core, "en", picksEn);
    const en: Submission = { ...ko, ...back };
    const a = stable(score(ko, loaded));
    const b = stable(score(en, loaded));
    if (a !== b) { bad.push(f.id); continue; }
    const ra = buildResult(score(ko, loaded), loaded);
    const rb = buildResult(score(en, loaded), loaded);
    if (stable(ra) !== stable(rb)) bad.push(`${f.id}(결과 모델)`);
    models.push(ra);
  }
  ok(`${core} · 영어 골든(${label}): 두 언어의 스냅샷 · 결과 모델이 같다`, bad.length === 0,
    bad.length ? `어긋남 ${bad.join(", ")}` : `${fx.length}벌`);
  return models;
}

/**
 * 임시 원고 자리의 `canonicalPicks`. 제품 함수는 `CONTENT_DIR` 을 읽고 캐시를
 * 들고 있어서, 같은 규칙(같은 자리 번호로 되돌린다)을 그 자리의 파일로 돈다.
 */
function canonicalOf(core: string, p: Picks, dir: string): Picks {
  const ko = { lists: coreFile<Checklists>(core, "checklists", dir), dom: coreFile<Domains>(core, "domains", dir) };
  const xx = { lists: coreFile<Checklists>(core, "checklists", dir, "en"), dom: coreFile<Domains>(core, "domains", dir, "en") };
  const back = (from: string[], to: string[], t: string) => { const i = from.indexOf(t); return i >= 0 ? to[i] : t; };
  const out: Picks = { checklists: {}, artifacts: {}, verifications: {} };
  for (const [k, list] of Object.entries(p.checklists)) {
    const [td, ax] = k.split(".");
    out.checklists[k] = list.map((t) => back((xx.lists.domains[td]?.[ax] ?? []).map((x) => x.text),
      (ko.lists.domains[td]?.[ax] ?? []).map((x) => x.text), t));
  }
  const d = (c: Domains, td: string) => c.domains.find((x) => x.code === td);
  for (const [td, list] of Object.entries(p.artifacts)) {
    out.artifacts[td] = list.map((t) => back(d(xx.dom, td)?.artifacts ?? [], d(ko.dom, td)?.artifacts ?? [], t));
  }
  for (const [td, list] of Object.entries(p.verifications)) {
    out.verifications[td] = list.map((t) => back(d(xx.dom, td)?.verify_targets ?? [], d(ko.dom, td)?.verify_targets ?? [], t));
  }
  return out;
}

/** 임시 원고: 한국어 글자 앞에 표지를 붙인 벌. 원고가 없어도 왕복을 돌릴 수 있다 */
function syntheticDir(core: string): string {
  const root = mkdtempSync(join(tmpdir(), "v3-i18n-"));
  cpSync(CONTENT_DIR, root, { recursive: true, filter: (src) => !src.includes(`${CONTENT_DIR}/en`) });
  mkdirSync(join(root, "en"), { recursive: true });
  const mark = (v: unknown): unknown => typeof v === "string" ? (HANGUL.test(v) ? `EN⟨${v}⟩` : v)
    : Array.isArray(v) ? v.map(mark)
      : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, mark(x)])) : v;
  const c = coreEntry(core, root);
  for (const k of ["checklists", "domains"] as CoreFile[]) {
    const name = c.files[k];
    if (name) writeFileSync(join(root, "en", name), JSON.stringify(mark(coreFile(core, k, root))));
  }
  return root;
}

/* ── 5. 결과 ─────────────────────────────────────────────────────────── */

function resultCheck(core: string, models: ResultModel[]): void {
  const han = new Set<string>();
  const add = (w: string, x: unknown) => {
    const out: string[] = [];
    hangulIn(x, w, out);
    for (const s of out) han.add(s);
  };
  const T = TEXT_EN;
  const dn = (td: string) => domainName(core, td, "en");
  for (const m0 of models) {
    const m = localizeResult(m0, core, "en");
    /* 원고 글자가 사전에 다 걸렸는가. 되짚는 칸(provenance · trace)은 화면에 서지 않는다 */
    const skip = (k: string) => k === "provenance" || k === "trace";
    (function walk(v: unknown, p: string): void {
      if (typeof v === "string") { if (HANGUL.test(v)) han.add(`model ${p}: ${v.slice(0, 60)}`); return; }
      if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}[${i}]`)); return; }
      if (v && typeof v === "object") {
        for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (!skip(k)) walk(x, `${p}.${k}`);
      }
    })(m, m.attempt_id ?? "?");
    /* 결과 문장: 모델의 실제 값으로 불러 본다 */
    for (const a of m.actions) {
      const nm = a.domain ? dn(a.domain) : "";
      add(`action ${a.code}`, T.actionKo(a, nm, m.stage));
      add(`actionHead ${a.code}`, T.actionHeadKo(a, nm));
      add(`actionWhy ${a.code}`, T.actionWhyKo(a));
    }
    for (const g of m.gaps) add(`gap ${g.kind}`, T.gapKo(g, g.domain ? dn(g.domain) : ""));
    add("common", T.commonKo(m.common, core));
  }
  const list = [...han];
  ok(`${core} · 영어로 읽은 결과에 한글 없음`, list.length === 0,
    list.length ? `${list.length}곳 · ${sample(list)}` : `${models.length}벌`);
}

/* ── 6. 언어를 정하는 규칙 ───────────────────────────────────────────── */

function localeRuleCheck(): void {
  console.log("\n  [언어 규칙]");
  const me = "ME_CORE_V3";
  const cases: [string, Parameters<typeof localeFor>[0], "ko" | "en"][] = [
    ["KR 시장은 한국어", { core: me, market: "KR" }, "ko"],
    ["GLOBAL 시장은 영어", { core: me, market: "GLOBAL" }, "en"],
    ["KR 에서 영어를 고르면 영어", { core: me, market: "KR", override: "en" }, "en"],
    ["GLOBAL 에서 한국어를 고르면 한국어", { core: me, market: "GLOBAL", override: "ko" }, "ko"],
    ["모르는 언어는 무시하고 시장 기본", { core: me, market: "GLOBAL", override: "tr" }, "en"],
  ];
  /* 영어판을 열지 않는 Core 는 GLOBAL 이어도 한국어다(원고가 없으면 화면 첫 장에서 멈춘다) */
  const other = registry().cores.find((c) => !EDITION_CORES.en.includes(c.code) && c.markets.includes("GLOBAL"));
  if (other) cases.push([`영어판이 아닌 Core(${other.code})는 한국어`, { core: other.code, market: "GLOBAL", override: "en" }, "ko"]);
  for (const [name, args, want] of cases) {
    const got = localeFor(args);
    ok(name, got === want, `${got}`);
  }
}

/* ── 7. 실제 DB 로 한 바퀴 ──────────────────────────────────────────── */

/**
 * 같은 사람이 같은 답을 **한국어와 영어로 한 번씩** 응시한다. 영어 응시는 고른
 * 근거를 영어 글자로 저장하고(`v3_evidence_picks`), 제출할 때 원본으로 되돌려
 * 채점한다. 둘의 판정이 글자까지 같아야 한다.
 *
 * `DATABASE_URL` 이 없으면 건너뛴다. 응시를 연 Core 는 기본 전공(지금 열린
 * Core)이다: 짓는 중인 Core 는 응시가 열리지 않는다.
 */
async function dbCheck(): Promise<void> {
  console.log("\n  [실제 DB]");
  if (!process.env.DATABASE_URL) { notes.push("DATABASE_URL 이 없어 실제 DB 왕복을 건너뛰었다"); return; }
  const { query, queryOne } = await import("../src/lib/db");
  const S = await import("../src/lib/me-v3/runtime/session");
  const { coreOnly } = await import("../src/lib/me-v3/scoring/engine");
  const LOGIN = "v3i18n@example.com";
  let uid = (await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id = $1`, [LOGIN]))?.id;
  if (!uid) {
    uid = (await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, is_demo)
       VALUES ($1,$1,'V3 i18n check','x','active','en',TRUE) RETURNING id::text`, [LOGIN]))?.id;
  }
  const userId = uid as string;

  const run = async (market: string, lang: string | null) => {
    await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [userId]);
    const a0 = await S.openAttempt({ userId, tier: "PRO", stage: "bachelor", gradField: null, market, lang });
    const core = a0.core_code;
    const bank = content(core).bank.items;
    const answer = (id: string): import("../src/lib/me-v3/scoring/types").Answer | null => {
      const it = bank.find((x) => x.item_id === id);
      if (!it) return null;
      /* 문항마다 값을 조금씩 달리 준다: 같은 값만 주면 영역 사이에 차이가 없어 묶음이 하나로 선다 */
      const h = [...id].reduce((n, ch) => n + ch.charCodeAt(0), 0);
      if (it.response_scale === "L0~L3") return { kind: "level", index: h % 4 };
      if (it.response_scale === "5보기") return { kind: "scale5", value: 2 + (h % 4) };
      if (it.response_scale === "3보기") return { kind: "exposure", value: h % 3 };
      if (it.module === "CORE-FORCE") return { kind: "choice", value: "A" };
      return null;
    };
    let a = (await S.attemptOf(a0.id, userId))!;
    let want: string | null = null;
    for (let guard = 0; guard < 400; guard += 1) {
      const v = await S.viewOf(a, want);
      for (const id of v.screen.items) {
        if (v.answers[id]) continue;
        const ans = answer(id);
        if (ans) await S.saveAnswer(a.id, id, ans);
      }
      if (v.screen.kind === "checklist" && v.screen.domain) {
        /* 화면이 내미는 그 언어의 목록에서 고른다. 사람이 누르는 것과 같다 */
        for (const g of checklistFor(core, v.screen.domain, a.locale)) {
          await S.savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, 2));
        }
      }
      if (v.screen.kind === "pick-industry") await S.choosePack(core, a.id, "industry", industryChoices(core)[0].code);
      if (v.screen.kind === "pick-role") await S.choosePack(core, a.id, "role", roleChoices(core)[0].code);
      if (!v.nextId) { await S.moveTo(a.id, v.screen.id); break; }
      await S.moveTo(a.id, v.nextId);
      want = v.nextId;
      a = (await S.attemptOf(a.id, userId))!;
    }
    const picks = await S.picksOf(a.id);
    const out = await S.submit((await S.attemptOf(a.id, userId))!);
    const ver = await queryOne<{ v: Record<string, unknown> }>(
      `SELECT module_versions AS v FROM v3_snapshots WHERE attempt_id = $1 ORDER BY id DESC LIMIT 1`, [a.id]);
    const model = await S.latestResult(a.id);
    return { a, core, picks, snap: out.snapshot, ver: ver?.v ?? {}, model };
  };

  try {
    const ko = await run("KR", null);
    const en = await run("GLOBAL", null);
    ok("KR 응시는 ko · GLOBAL 응시는 en 으로 열린다", ko.a.locale === "ko" && en.a.locale === "en",
      `${ko.a.locale} · ${en.a.locale} · ${en.core}`);
    const enPicked = Object.values(en.picks.checklists).flat();
    ok("영어 응시의 고른 근거는 영어 글자로 저장된다",
      enPicked.length > 0 && enPicked.every((t) => !HANGUL.test(t)), `${enPicked.length}개`);
    ok("두 언어의 판정이 글자까지 같다", stable(coreOnly(ko.snap)) === stable(coreOnly(en.snap)),
      `영역 ${ko.snap.domains.length}`);
    ok("스냅샷 판본에 응시 언어가 적힌다", ko.ver.locale === "ko" && en.ver.locale === "en",
      `${String(ko.ver.locale)} · ${String(en.ver.locale)}`);
    if (ko.model && en.model) {
      const pick = (m: ResultModel) => stable({ d: m.domains, g: m.gaps, x: m.actions, e: m.evidence });
      ok("두 언어의 결과 모델이 같다(원고 글자는 원본으로 굳는다)", pick(ko.model) === pick(en.model));
      const han: string[] = [];
      const loc = localizeResult(en.model, en.core, "en");
      (function walk(v: unknown, p: string): void {
        if (typeof v === "string") { if (HANGUL.test(v)) han.push(`${p}: ${v.slice(0, 50)}`); return; }
        if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}[${i}]`)); return; }
        if (v && typeof v === "object") {
          for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
            if (k !== "provenance" && k !== "trace") walk(x, `${p}.${k}`);
          }
        }
      })(loc, "model");
      ok("영어 응시의 결과를 영어로 읽으면 한글이 없다", han.length === 0, han.length ? sample(han) : "");
    } else ok("결과 모델이 굳는다", false, "latestResult 가 비었다");
  } finally {
    await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [userId]).catch(() => undefined);
  }
}

/* ── 실행 ─────────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  console.log(`  영어판 1단계 · Core ${CORES.join(" · ")}\n`);
  const complete = new Map<string, boolean>();
  console.log("  [원고]");
  for (const core of CORES) complete.set(core, fileCheck(core).complete);

  dictCheck();

  for (const core of CORES) {
    console.log(`\n  [${core}]`);
    if (!complete.get(core)) {
      console.log("  (원고가 다 있지 않아 화면 · 결과는 건너뛴다. 응시도 한국어로 열린다)");
      const dir = syntheticDir(core);
      try { goldenCheck(core, "임시 원고", dir); } finally { rmSync(dir, { recursive: true, force: true }); }
      continue;
    }
    screenCheck(core);
    controlCheck(core);
    const models = goldenCheck(core, "실제 원고");
    const dir = syntheticDir(core);
    try { goldenCheck(core, "임시 원고", dir); } finally { rmSync(dir, { recursive: true, force: true }); }
    resultCheck(core, models);
  }

  localeRuleCheck();
  await dbCheck();

  if (notes.length) {
    console.log("\n  [참고]");
    for (const n of notes) console.log(`  · ${n}`);
  }
  console.log(`\n  통과 ${pass} · 걸림 ${fail}`);
  console.log("  번역의 질은 이 검사가 재지 않는다: 원어민 · 현직자 검수 전에는 검증된 영어판으로 팔지 않는다");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
