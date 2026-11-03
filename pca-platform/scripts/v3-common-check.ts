/**
 * **공통 자동 점검**(2026-11-02 대표 "제안순서대로 해" 1번). 기관마다 따로 보지 않고, 모든 기관 ·
 * 모든 과목 묶음(Core) · 갈래에 같은 답안 세 벌을 **제품과 같은 길**로 밟게 한 뒤 책(PDF 재료)을 엮어
 * 모순을 센다. 고칠 때마다 이것을 돌린다.
 *
 * 로컬 DB 에만 쓴다. 운영 · 미리보기 DB 에는 쓰지 않는다.
 *
 *   npx tsx scripts/v3-common-check.ts                 전부(UNIS=PCU,KUS,JJU,SJEPA · SETS=A,B,C)
 *   UNIS=JJU SETS=C npx tsx scripts/v3-common-check.ts
 *   OUT=var/common-check                               표(md · csv)와 응시 번호를 적는 자리
 *   REJUDGE=var/common-check OUT=var/common-check-2    세운 응시를 다시 세우지 않고 판정만 다시(고친 뒤 같은 답으로)
 *
 * 답안 세 벌(제품 화면을 그대로 지난다: 격자 → 실제 영역 고르기 → 판단 · 체크리스트 · 지원서 문장 단계):
 *   A = 관심 높음 · 해 봄 여러 번 · 모든 판단 `기준까지 직접 정함` · 체크리스트 · 결과물 · 비교 대상 채움
 *   B = 관심 모두 낮음 · 해 본 적 없음 · 판단 `시킨 대로` · 아무것도 고르지 않음
 *   C = 관심 칸 셋 중 하나 `모르겠다` · 학습 의향 일부 `모르겠다` · 판단 단계 섞음(정함 · 없음 · 직접 · 시킨 대로) ·
 *       `모르겠다` 보기 섞음 · 직접 쓴 문장(문제 · 바꾸지 않은 것 · 쓰지 않은 방법 · 횟수 · 판단 덧말) ·
 *       `없다` 는 보기 하나
 *
 * 판정(걸리면 표의 `걸림` 칸에 이름이 남는다):
 *   a  심화 영역이 0곳 열림
 *   b  판단을 `직접 해 봄` 이상으로 답했는데 06장이 그 판단을 `해 본 적이 없다고 답했어요` 라고 적음
 *   c  판단까지 물은 영역이 없는데 07장이 `빈 판단이 없다` 고 적음
 *   d  직접 쓴 문장이 그 칸 이름표(TRANS_NOTE_KO) 없이 실리거나 다른 이름표로 실림
 *   e  빈 판단이 없다고 적고 06장이 `07장 할 일에서 채워요` 를 냄(할 일 모순 · PB2)
 *   f  결과물을 고른 영역에 `결과물을 아직 고르지 않았습니다`(PB3)
 *   g  관심이 모두 낮은데 `관심이 높은 · 보통 이상인 영역 · 관심 있는 쪽` 을 권함(PB1)
 *   h  `없다` 는 답이 06 · 07장 문단 재료로 들어감(PK2)
 *   i  관심이 높지 않은 영역에 `관심이 높은데`(엔진의 Z4 는 관심과 상관없이 `확인된 판단 0`)
 *   j  관심을 `모르겠다` 로 답한 영역에 `관심도 높지 않다`(JA7)
 *   l  이미 직접 해 본(2단계 이상) 판단을 `직접 해 봤다는 답이 없다` 로 적음(PB2)
 *   m  해 본 일이 나온 영역 수가 쪽마다 다름(PB6)
 *   n  해 본 횟수에 답이 없는 영역에 `해 본 적이 있다고`(AI6)
 *   f  (넓힘) 결과물이 있는 영역에 `결과물을 아직 고르지 않았습니다`(AI8)
 *   o  할 일이 학생이 이미 고른 항목을 다시 시킴(AI3)
 *   p  판단까지 물은 영역 수가 쪽마다 다름 · 물은 영역에 `횟수까지만 물었어요`(AI1)
 *   k  준비 중 학과로 응시가 열림(KM1) — 기관마다 한 줄
 *
 * **결과 모순 점검 R1~R9**(2026-11-03 대표 지시. 규칙은 `_v3-contradiction.ts`). 모든 응시의 책(PDF 로 뽑히는 HTML)을
 * 브라우저에 올려 글자로 본다. `WEB=1` 이면 기관마다 대표 학과 하나(`WEB_PER_UNI`, 기본 1)를 실제 서버에서
 * 로그인해 **웹 결과(`/v3/N/result`)와 내려받은 PDF 글자**를 함께 본다(`UI_BASE`, 기본 http://127.0.0.1:3300).
 *   R1 한 덩이 안에 `아직 고르지 않았습니다` 와 `고른 항목: …` · `직접 만들어 봤다` 가 같이 섬
 *   R2 고른 항목 0 · 적은 문장 0 · `내가 정함` 답 0 인데 `고르신` · `적어 두셨습니다` · `직접 정한 것이 보입니다`
 *   R3 더한 경험 0 인데 `새 경험을 더했고` · `경험을 더한 뒤`
 *   R4 받침과 맞지 않는 조사(`설계은` · `조사은` · 일반 규칙)
 *   R5 안쪽 글 · 코드 · 엔티티(`채우는 중` · `(학교 · 기관 소재지 기준)` · `JJU26_` · `&amp;`)
 *   R6 J1: 경험 번역을 적었는데 모든 영역이 `묻지 않음 · 자세히 다루지 않은 영역` · 관심 칸을 비운 채 제출됨(기관마다 한 번)
 *   R7 같은 항목의 수가 웹과 PDF 에서 다름(WEB=1)
 *   R8 학생이 보는 응답일(웹 · PDF)과 담당자가 보는 완료일이 한국 시간으로 같은 날(WEB=1. 한국 시간 00:40 제출로 세운다)
 *   R9 AI 투(경고): 한 화면에 `아직 ~ 없습니다` 셋 이상 · `~하지 않는 것` 목록 제목 · 제목을 되풀이하는 부제
 *
 *   npm run v3:contradict                 한 번에(서버를 띄우고 4개 기관 × A·B·C 를 웹 · PDF 까지 본 뒤 끈다)
 *   CONTRA=0                              R 점검을 끈다(예전 판정만)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { universities, university, allLeaves, statusOf } from "../src/lib/campus/registry";
import { coreFile } from "../src/lib/me-v3/core-registry";
import { controlOf } from "../src/lib/me-v3/runtime/menus";
import {
  attemptOf, checklistFor, choosePack, content, itemOf, menuContextOf, moveTo, openAttempt, saveAnswer, saveNote,
  savePicks, submit, viewOf, industryChoices, roleChoices, type CampusEntry, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import { UNKNOWN, type Answer } from "../src/lib/me-v3/scoring/types";
import { loadInputs } from "../src/lib/me-v3/report-long/data";
import { assemble } from "../src/lib/me-v3/report-long";
import { derive, withTranslation } from "../src/lib/me-v3/report-long/derive";
import { TRANS_NOTE_KO, isNoneChoice } from "../src/lib/me-v3/result/text.ko";
import { query, queryOne } from "../src/lib/db";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { hashPassword } from "../src/lib/password";
import { buildLongReport } from "../src/lib/me-v3/report-long";
import { listStudents } from "../src/lib/campus/manage";
import { blocksOf, dedupe, r1, r2, r3, r4, r5, r7, r9, selfTest, type Facts, type Hit } from "./_v3-contradiction";
import type { Browser, BrowserContext, Page as PwPage } from "playwright";

const CONTRA = process.env.CONTRA !== "0";
const WEB = process.env.WEB === "1";
const WEB_PER_UNI = Number(process.env.WEB_PER_UNI ?? "1");
const UI_BASE = (process.env.UI_BASE ?? "http://127.0.0.1:3300").replace(/\/$/, "");

const OUT = path.resolve(process.env.OUT ?? "var/common-check");
const UNIS = (process.env.UNIS ?? "PCU,KUS,JJU,SJEPA").split(",");
const SETS = (process.env.SETS ?? "A,B,C").split(",") as Set[];
type Set = "A" | "B" | "C";

/** 직접 쓴 문장. 책에서 찾을 수 있게 칸마다 다른 글로 쓴다 */
const NOTES: Record<string, string> = {
  TR_T1: "점검C 문제 두 줄 메모",
  TR_T2: "점검C 무엇이 문제였나 메모",
  TR_T3: "점검C 검토했지만 쓰지 않은 방법 메모",
  TR_T4: "점검C 끝까지 바꾸지 않은 것 메모",
  TR_T5: "점검C 세 번 되풀이",
  TR_T10: "점검C 다음 학기 후배가 활용",
};
const JUDGE_NOTE = "점검C 판단 덧말";

type Row = { uni: string; uniName: string; core: string; spec: string | null; leaf: string; leafName: string; college: string };

function combos(): Row[] {
  const out = new Map<string, Row>();
  /* `LEAVES=PCU26_BIZ,…` 이면 그 학과만(견본 결과지 만들 때) */
  const only = (process.env.LEAVES ?? "").split(",").filter(Boolean);
  for (const u0 of universities()) {
    if (!UNIS.includes(u0.university_code)) continue;
    const u = university(u0.university_code)!;
    for (const r of allLeaves(u)) {
      if (r.catalog.catalog_year > 2026 || statusOf(u, r) !== "READY" || !r.leaf.core_code) continue;
      if (only.length && !only.includes(r.leaf.code)) continue;
      const spec = (r.leaf as { specialization?: string | null }).specialization ?? null;
      const key = only.length ? r.leaf.code : `${u.university_code}:${r.leaf.core_code}:${spec ?? "-"}`;
      if (!out.has(key)) {
        out.set(key, { uni: u.university_code, uniName: u.university_name, core: r.leaf.core_code, spec,
          leaf: r.leaf.code, leafName: r.leaf.name, college: r.college.code });
      }
    }
  }
  /* `PER_UNI=n` 이면 기관마다 앞의 n 갈래만(결과 모순 점검을 한 번에 돌릴 때) */
  const per = Number(process.env.PER_UNI ?? "0");
  if (per > 0) {
    const seen = new Map<string, number>();
    return [...out.values()].filter((r) => { const n = seen.get(r.uni) ?? 0; seen.set(r.uni, n + 1); return n < per; });
  }
  return [...out.values()];
}

/** 웹으로 들어갈 학생의 아이디와 열쇠. **열쇠는 이 과정 안에서만 쓰고 어디에도 적지 않는다**(해시만 DB 에) */
const LOGINS = new Map<string, { login: string; pw: string }>();

async function student(tag: string, web = false): Promise<string> {
  const login = `common-${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
  const pw = web ? randomBytes(18).toString("base64url") : "";
  const id = (await queryOne<{ id: string }>(
    `INSERT INTO users (email, login_id, display_name, password_hash, status, is_demo, must_reset_pw)
     VALUES ($1,$1,'점검 학생',$2,'active',TRUE,FALSE) RETURNING id::text`,
    [login, web ? await hashPassword(pw) : "x"]))!.id;
  if (web) {
    LOGINS.set(id, { login, pw });
    await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1, NULL, 'student') ON CONFLICT DO NOTHING`, [id]).catch(() => undefined);
  }
  await query(`INSERT INTO entitlements (user_id, product_code, kind, tier, major_code, assessment_version, status)
               VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [id]);
  return id;
}

/** C 의 판단 단계 순환(0 해 본 적 없음 · 1 시킨 대로 · 2 직접 해 봄 · 3 기준까지 직접 정함) */
const C_LEVELS = [3, 0, 2, 1, 3, 2];

async function walk(core: string, a0: V3Attempt, userId: string, set: Set): Promise<void> {
  const tds = content(core).domains.domains.map((d) => d.code);
  for (const [i, td] of tds.entries()) {
    const int: Answer = set === "A" ? { kind: "scale5", value: 5 } : set === "B" ? { kind: "scale5", value: 1 + (i % 2) }
      : i % 3 === 0 ? { kind: "choice", value: UNKNOWN } : { kind: "scale5", value: [5, 4, 2][i % 3] };
    const exp: Answer = { kind: "exposure", value: set === "A" ? 2 : set === "B" ? 0 : [2, 1, 0, 1][i % 4] };
    const lea: Answer = set === "C" && i % 4 === 1 ? { kind: "choice", value: UNKNOWN } : { kind: "scale5", value: set === "B" ? 2 : 4 };
    await saveAnswer(a0.id, `G_${td}_INT`, int);
    await saveAnswer(a0.id, `G_${td}_EXP`, exp);
    await saveAnswer(a0.id, `G_${td}_LEA`, lea);
  }
  const ind = industryChoices(core)[0]?.code ?? null;
  const rol = roleChoices(core)[0]?.code ?? null;
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let want: string | null = null, guard = 0, n = 0, judgeNoted = false, noneUsed = false;
  for (;;) {
    if ((guard += 1) > 500) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    const ctx = await menuContextOf(a);
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const it = itemOf(core, id);
      if (!it) continue;
      const control = controlOf(it, ctx);
      n += 1;
      let ans: Answer | null = null;
      if (control.kind === "level") {
        const idx = set === "A" ? 3 : set === "B" ? 1 : C_LEVELS[n % C_LEVELS.length];
        ans = { kind: "level", index: Math.min(idx, control.options.length - 1) };
      } else if (control.kind === "scale5") {
        ans = { kind: "scale5", value: set === "A" ? 5 : set === "B" ? 2 : 3 + (n % 3) };
      } else if (control.kind === "exposure") {
        ans = { kind: "exposure", value: set === "A" ? 2 : set === "B" ? 0 : n % 3 };
      } else if (control.kind === "steps") {
        const opts = control.options;
        const real = opts.filter((o) => o.value !== null);
        const unknown = opts.find((o) => o.value === null);
        if (set === "C" && unknown && n % 3 === 0) ans = { kind: "choice", value: UNKNOWN };
        else {
          const pick = set === "A" ? real[real.length - 1] : set === "B" ? real[0] : real[n % real.length];
          ans = control.answer === "exposure" ? { kind: "exposure", value: pick.value as number } : { kind: "scale5", value: pick.value as number };
        }
      } else if (control.kind === "choice" && control.options.length) {
        const none = control.options.find((o) => isNoneChoice(o.label));
        const some = control.options.filter((o) => !isNoneChoice(o.label));
        let o = some[0] ?? control.options[0];
        if (set === "B" && none) o = none;
        if (set === "C") {
          if (none && !noneUsed) { o = none; noneUsed = true; } else o = some[n % Math.max(1, some.length)] ?? o;
        }
        ans = { kind: "choice", value: o.value };
      }
      if (ans) await saveAnswer(a.id, id, ans);
      if (set === "C") {
        if (NOTES[id]) await saveNote(a.id, id, NOTES[id]);
        else if (!judgeNoted && control.kind === "level") { await saveNote(a.id, id, JUDGE_NOTE); judgeNoted = true; }
      }
    }
    if (v.screen.kind === "checklist" && v.screen.domain) {
      const di = tds.indexOf(v.screen.domain);
      for (const g of checklistFor(core, v.screen.domain)) {
        const k = set === "A" ? 2 : set === "B" ? 0 : di % 2 === 0 ? 1 : 0;
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, k));
      }
    }
    if (v.screen.kind === "pick-industry" && ind) await choosePack(core, a.id, "industry", ind);
    if (v.screen.kind === "pick-role" && rol) await choosePack(core, a.id, "role", rol);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
}

const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ");

type Verdict = { opened: number; deep: number; fails: string[]; detail: string[] };

async function judge(attemptId: string, core: string): Promise<Verdict> {
  const at = (await queryOne<{ p: string[] | null; d: string[] | null }>(
    `SELECT opened_probe AS p, opened_deep AS d FROM v3_attempts WHERE id = $1`, [attemptId]))!;
  const x = await loadInputs(attemptId);
  const { pages } = assemble(x);
  const d = derive(x);
  const fails: string[] = [], detail: string[] = [];
  const fail = (k: string, why: string) => { if (!fails.includes(k)) fails.push(k); detail.push(`${k}: ${why}`); };
  const byPart = (p: string) => pages.filter((g) => g.part === p).map((g) => strip(`${g.title} ${g.body}`)).join(" \n ");
  const all = pages.map((g) => strip(`${g.title} ${g.body}`)).join(" \n ");
  const ch6 = byPart("06"), ch7 = byPart("07");

  /* a */
  if (!(at.d ?? []).length && !(at.p ?? []).length) fail("a", "심화 · 선별 영역 0곳");

  /* b: 응답 그대로(원 응답 표)에서 축마다 가장 높은 단계 */
  const bank = coreFile<{ items: { item_id: string; technical_domain?: string; evidence_axis?: string; module?: string }[] }>(core, "items");
  const meta = new Map(bank.items.map((i) => [i.item_id, i]));
  const raw = await query<{ item_id: string; v: number | null; kind: string }>(
    `SELECT item_id, value_int AS v, kind FROM v3_responses WHERE attempt_id = $1`, [attemptId]);
  const maxLv = new Map<string, number>();
  for (const r of raw) {
    const mi = meta.get(r.item_id);
    /* 산업 · 직무팩 문항은 그 영역의 Core 판정에 들지 않는다(엔진이 Core 문항으로 축을 정한다) */
    if (r.kind !== "level" || r.v == null || !mi?.technical_domain || !mi.evidence_axis || /^(INDUSTRY|ROLE)/.test(mi.module ?? "")) continue;
    const k = `${mi.technical_domain}:${mi.evidence_axis}`;
    maxLv.set(k, Math.max(maxLv.get(k) ?? -1, r.v));
  }
  for (const def of x.defs) {
    const nm = d.name(def.code);
    for (const [ax, a] of Object.entries(def.axes ?? {})) {
      const l2 = (a as { l2?: string }).l2;
      if (!l2 || (maxLv.get(`${def.code}:${ax}`) ?? -1) < 1) continue;
      const i = ch6.indexOf(`${nm}에서 ‘${l2}’`) >= 0 ? ch6.indexOf(`${nm}에서 ‘${l2}’`) : ch6.indexOf(`${nm}에서 '${l2}'`);
      if (i >= 0 && /아직 해 본 적이 없다고 답했어요/.test(ch6.slice(i, i + 500).split(/면접 질문|스스로 묻기/)[0])) {
        fail("b", `${nm} ${ax} 응답 ${maxLv.get(`${def.code}:${ax}`)} 단계인데 06장 '해 본 적 없다'`);
      }
    }
  }

  /* c · e */
  const asked = x.m.domains.some((z) => d.asked(z));
  const saysNoGap = /지금 바로 메워야 할 판단은 나오지 않았습니다/.test(ch7);
  if (!asked && saysNoGap) fail("c", "물은 영역 0곳인데 '빈 판단 없음'");
  if (saysNoGap && (/07장 할 일[^.]*에서 채워요/.test(ch6) || d.gaps.length > 0)) fail("e", `빈 판단 없음이라 적고 빈 판단 ${d.gaps.length} · 06장 '채워요'`);

  /* d: 직접 쓴 문장은 그 칸 이름표와 함께만 */
  for (const [id, note] of Object.entries(NOTES)) {
    let from = 0;
    for (;;) {
      const i = all.indexOf(note, from);
      if (i < 0) break;
      const before = all.slice(Math.max(0, i - 40), i);
      const lab = TRANS_NOTE_KO[id];
      if (lab && !before.includes(lab)) fail("d", `${id} 문장 앞 이름표 '${lab}' 없음: …${before.slice(-25)}`);
      for (const [oid, other] of Object.entries(TRANS_NOTE_KO)) {
        if (oid !== id && before.endsWith(`${other}: “`)) fail("d", `${id} 문장이 '${other}' 이름표로 실림`);
      }
      from = i + note.length;
    }
  }

  /* f: 결과물을 고른 영역 */
  const picks = await query<{ td: string; slot: string; n: number }>(
    `SELECT domain_code AS td, slot, count(*)::int AS n FROM v3_evidence_picks WHERE attempt_id = $1 GROUP BY 1, 2`, [attemptId]);
  for (const p of picks.filter((r) => r.slot === "ARTIFACT" && r.n > 0)) {
    const nm = d.name(p.td);
    for (const pg of pages) {
      for (const tr of pg.body.split(/<\/tr>/)) {
        const t = strip(tr);
        if (t.includes(nm) && /결과물을 아직 고르지 않았습니다|결과물을 아직 고르지 않으셨습니다/.test(t)) fail("f", `${nm} 결과물 ${p.n}개 골랐는데 '${pg.title}' 줄이 '아직 고르지 않음'`);
      }
    }
  }

  /* g */
  if (!x.m.domains.some((z) => z.interest === "HIGH" || z.interest === "MID")) {
    const m = /관심이 (높은|보통 이상인) 영역[^.]{0,30}(골라|부터)|관심 있는 쪽은|관심 영역을 골라/.exec(all);
    if (m) fail("g", `관심 모두 낮은데 '${m[0]}'`);
  }

  /* i · j: 관심 응답과 다른 관심 말(엔진의 Z4 는 관심과 상관없다 · `모르겠다` 는 낮음이 아니다) */
  for (const z of x.m.domains) {
    const nm = d.name(z.code);
    if (z.interest !== "HIGH" && (all.includes(`${nm}에는 관심이 높은데`) || all.includes(`${nm}에 관심이 높다고 답했`))) fail("i", `${nm} 관심 ${z.interest ?? "모르겠다"}인데 '관심이 높은데'`);
    if (!z.interest && new RegExp(`${nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.]{0,80}\\. 관심도 높지 않다고`).test(all)) fail("j", `${nm} 관심 '모르겠다'인데 '관심도 높지 않다'`);
  }

  /* l: 이미 직접 해 본(응답 2단계 이상) 판단을 `직접 해 봤다는 답이 없다` 로 적음(PB2) */
  for (const g of d.gaps) {
    if (!g.axis || (maxLv.get(`${g.domain}:${g.axis}`) ?? -1) < 2) continue;
    const nm = d.name(g.domain);
    for (const [part, txt] of [["06", ch6], ["07", ch7]] as const) {
      let at = txt.indexOf(nm);
      while (at >= 0) {
        const win = txt.slice(at, at + 220);
        if (/직접 해 봤다는 답이 (아직 )?없/.test(win) && win.includes(d.axisName(g.axis))) {
          fail("l", `${nm} ${g.axis} 응답 ${maxLv.get(`${g.domain}:${g.axis}`)}단계인데 ${part}장 '직접 해 봤다는 답이 없다'`);
          break;
        }
        at = txt.indexOf(nm, at + nm.length);
      }
    }
  }

  /* m: 해 본 일이 나온 영역 수가 쪽마다 다름(PB6) */
  const nums = new Set([...all.matchAll(/해 본 일이 (?:나온|확인된) 영역(?:은| 수[^0-9]{0,30})\s*(\d+)곳/g)].map((v) => v[1]));
  if (nums.size > 1) fail("m", `해 본 영역 수 ${[...nums].join(" · ")}`);

  /* n: 해 본 횟수에 답이 없는 영역을 `해 본 적이 있다` 고 적음(AI6) */
  for (const z of x.m.domains.filter((v) => !v.experience)) {
    const nm = d.name(z.code);
    if (new RegExp(`${esc(nm)}[^.]{0,40}해 본 적이 있다고`).test(all)) fail("n", `${nm} 해 본 횟수 응답 없음인데 '해 본 적이 있다고'`);
  }
  /* f2: 결과물이 있는 영역에 `결과물을 아직 고르지 않았습니다`(AI8 · 문장 단위) */
  const xt = withTranslation(x);
  const hasArt = (td: string) => !!xt.m.domains.find((v) => v.code === td)?.artifacts.length || x.exps.some((e) => e.td_codes.includes(td) && e.artifacts.length > 0);
  for (const z of x.m.domains.filter((v) => hasArt(v.code))) {
    const nm = d.name(z.code);
    if (new RegExp(`${esc(nm)}[^.]{0,60}(?<!그 )결과물을 아직 고르지 않`).test(all.replace(/결과물은 기록에 있고, 검사의 체크리스트에서는 그 결과물을 아직 고르지 않았습니다/g, ""))) fail("f", `${nm} 결과물 있음인데 '결과물을 아직 고르지 않음'`);
  }
  /* o: 할 일이 학생이 이미 고른 항목을 다시 시킴(AI3) */
  for (const z of x.m.domains) for (const ax of z.axes) for (const pk of ax.picks ?? []) {
    if (new RegExp(`${esc(pk)}’?(에 해당하는 일을 떠올려| 같은 일을 직접 맡고)`).test(all)) fail("o", `고른 '${pk.slice(0, 20)}'를 할 일로 다시 시킴`);
  }
  /* o: 그 판단에서 고른 항목이 있는데 할 일이 사전 예문(l2)을 `해당하는 일을 떠올려` 로 듦(AI3 견본 A 꼴) */
  for (const a2 of x.m.actions) {
    if (!a2.domain || !a2.axis) continue;
    const picked = x.m.domains.find((z) => z.code === a2.domain)?.axes.find((v) => v.axis === a2.axis)?.picks ?? [];
    const l2 = x.defs.find((v) => v.code === a2.domain)?.axes?.[a2.axis]?.l2;
    if (picked.length && l2 && new RegExp(`${esc(l2)}’?(에 해당하는 일을 떠올려| 같은 일을 직접 맡고)`).test(all)) fail("o", `${d.name(a2.domain)} ${a2.axis} 고른 항목이 있는데 예문으로 할 일`);
  }
  /* p: 판단까지 물은 영역 수가 맞지 않음 · 물은 영역에 `횟수까지만 물었어요`(AI1) */
  const askedN = x.m.domains.filter((z) => d.asked(z)).length;
  for (const m2 of all.matchAll(/판단까지 물은 곳 (\d+)곳/g)) if (Number(m2[1]) !== askedN) fail("p", `'판단까지 물은 곳 ${m2[1]}곳' ≠ ${askedN}`);
  const neN = /관심·경험만 본 영역\s+(\d+)곳/.exec(all)?.[1];
  if (neN && Number(neN) + askedN !== x.m.domains.length) fail("p", `관심·경험만 ${neN} + 물은 ${askedN} ≠ ${x.m.domains.length}`);
  for (const z of x.m.domains.filter((v) => d.asked(v))) {
    const nm = d.name(z.code);
    if (new RegExp(`${esc(nm)}[^.]{0,10} 관심과 해 본 횟수까지만 물었어요`).test(all)) fail("p", `${nm} 판단을 물었는데 '횟수까지만 물었어요'`);
  }

  /* q: 테스트 방 정독에서 나온 문장 꼴(2026-11-03). 사실과 부딪치는 안내 */
  const anyHigh = x.m.domains.some((z) => z.interest === "HIGH");
  if (!anyHigh && /관심이 높게 나온 영역/.test(all)) fail("q", "관심 높음 0곳인데 '관심이 높게 나온 영역'");
  if ((x.m.overview?.counts?.confirmed_axes ?? 0) === 0 && /메워야 할 판단은 나오지 않았|비어 있다고 나온 판단이 없었어요/.test(all)) fail("q", "직접 판단 0개인데 '메워야 할 판단 없음'");
  const anyPick = x.m.domains.some((z) => z.axes.some((v) => (v.picks ?? []).length));
  const anyOwn = (x.m.overview?.counts?.confirmed_axes ?? 0) > 0;
  if (!anyPick && !anyOwn && /지금 응답만으로 지원서 한 문단/.test(all)) fail("q", "고른 항목 · 직접 판단 0인데 '지금 응답만으로 지원서 한 문단'");
  const lvAll = x.m.domains.filter((z) => d.asked(z)).flatMap((z) => d.levels(z.code)).filter((v) => v != null);
  if (lvAll.length >= 8 && new Set(lvAll).size === 1 && /한쪽으로 몰리지 않고/.test(all)) fail("q", "모든 칸 같은 답인데 '한쪽으로 몰리지 않고'");
  for (const m4 of ch7.matchAll(/쪽으로 갈 때 배울 순서/g)) {
    if (!ch7.slice(Math.max(0, (m4.index ?? 0) - 40), m4.index).includes("다른 길도 보고 싶다면")) { fail("q", "목표 로드맵 안에 다른 직무 '배울 순서'"); break; }
  }
  if (/관심 관심/.test(all)) fail("q", "'관심 관심'");
  if (x.issuerCode === "SJEPA") {
    const outside = all.replace(/“[^”]*”/g, "").replace(/(점검|견본) (학생|참여자)/g, "");
    const m3 = /동아리|학생회|교내|학과마다|그 학과라면|학기|(?<![대재휴])학생(?![회증])/.exec(outside);
    if (m3) fail("q", `진흥원 결과지에 학교 말 '${m3[0]}'`);
  }

  /* h: `없다` 는 답이 문단 재료로 */
  const chosen = await query<{ t: string }>(
    `SELECT value_text AS t FROM v3_responses WHERE attempt_id = $1 AND kind = 'choice' AND value_text IS NOT NULL`, [attemptId]);
  for (const r of chosen) {
    const label = r.t;
    if (!isNoneChoice(label)) continue;
    for (const [nm, txt] of [["06", ch6], ["07", ch7]] as const) {
      if (txt.includes(`“${label}`) || txt.includes(`${label}”`)) fail("h", `'${label}' 이 ${nm}장 문단 재료`);
    }
  }
  return { opened: (at.p ?? []).length, deep: (at.d ?? []).length, fails, detail };
}

async function km1(): Promise<string[][]> {
  const lines: string[][] = [];
  for (const u0 of universities()) {
    if (!UNIS.includes(u0.university_code)) continue;
    const u = university(u0.university_code)!;
    /* 전공을 고르는 자리(`routing_only` · 미네르바학부 같은 곳)는 학과가 아니다: 고르면 전공 목록으로 돌려보낸다 */
    const held = allLeaves(u).filter((r) => r.catalog.catalog_year <= 2026 && !r.leaf.routing_only && statusOf(u, r) !== "READY");
    let opened = 0;
    const names: string[] = [];
    for (const r of held) {
      const uid = await student("km1");
      const entry: CampusEntry = { university_code: u.university_code, college_code: r.college.code, department_code: r.leaf.code,
        core_code: r.leaf.core_code ?? "CS_CORE_V1", specialization: (r.leaf as { specialization?: string | null }).specialization ?? null };
      try {
        const a = await openAttempt({ userId: uid, tier: "PRO", stage: "bachelor", gradField: null, campus: entry });
        if (a.department_code === r.leaf.code) { opened += 1; names.push(r.leaf.name); }
      } catch { /* 막혔다: 기대한 대로 */ }
    }
    lines.push([u.university_name, String(held.length), String(opened), names.slice(0, 6).join(" · ")]);
  }
  return lines;
}

/* ── 결과 모순 점검(R1~R9) ─────────────────────────────────────────── */

const RULES = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"] as const;

/** 응답 사실. 판정 문장이 아니라 DB 에 쌓인 것만 센다 */
async function factsOf(attemptId: string): Promise<Facts & { userId: string }> {
  const r = (await queryOne<{ u: string; picks: number; notes: number; exps: number; own: number }>(
    `SELECT a.user_id::text AS u,
            (SELECT count(*)::int FROM v3_evidence_picks p WHERE p.attempt_id = a.id) AS picks,
            (SELECT count(*)::int FROM v3_responses r WHERE r.attempt_id = a.id AND coalesce(btrim(r.note_text), '') <> '') AS notes,
            (SELECT count(*)::int FROM v3_experiences e WHERE e.user_id = a.user_id) AS exps,
            (SELECT count(*)::int FROM v3_responses r WHERE r.attempt_id = a.id AND r.kind = 'level' AND r.value_int >= 3) AS own
       FROM v3_attempts a WHERE a.id = $1`, [attemptId]))!;
  return { userId: r.u, picks: r.picks, notes: r.notes, experiences: r.exps, ownDecided: r.own };
}

type Screen = { name: string; text: string; blocks: string[]; headings: string[]; pairs: [string, string][] };

/**
 * 브라우저에 그려진 글자를 덩이로 꺼낸다. **접힌 곳을 다 편다**(`details`): 접힌 채 innerText 를 읽으면 안쪽 문장이
 * 빠져 걸릴 것을 놓친다. 덩이는 `글이 700자 안쪽인 가장 큰 요소`(카드 · 표 줄 · 문단)다: R1 이 같은 카드 안에서
 * 부딪치는 말을 본다. 화면은 `section.pg`(책의 한 쪽)마다, 없으면 쪽 전체가 하나다.
 */
async function screensOf(p: PwPage): Promise<Screen[]> {
  /* 함수가 아니라 글로 넘긴다: tsx 가 함수 안에 `__name` 도우미를 끼워 넣어 브라우저에서 ReferenceError 가 난다 */
  return p.evaluate(SCREENS_JS) as Promise<Screen[]>;
}
const SCREENS_JS = `(() => {
  document.querySelectorAll("details").forEach((d) => { d.open = true; });
  const roots = [...document.querySelectorAll("section.pg")];
  const use = roots.length ? roots : [document.body];
  const txt = (el) => ((el && el.innerText) || "").trim();
  return use.map((root, i) => {
    const blocks = [];
    const walk = (el) => {
      const t = txt(el);
      if (!t) return;
      if (t.length <= 700) { blocks.push(t); return; }
      const kids = [...el.children];
      if (!kids.length) { blocks.push(t); return; }
      kids.forEach(walk);
    };
    walk(root);
    const hs = [...root.querySelectorAll("h1,h2,h3,h4,h5")];
    const pairs = [];
    for (const h of hs) {
      const n = h.nextElementSibling;
      if (n && /^(P|SMALL|SPAN|DIV)$/.test(n.tagName) && txt(n).length > 0 && txt(n).length < 160 && !n.querySelector("h1,h2,h3,h4,table,ul,ol")) pairs.push([txt(h), txt(n)]);
    }
    const head = txt(root.querySelector("h1,h2,h3") || root).split("\\n")[0].slice(0, 30);
    return { name: roots.length ? (i + 1) + "쪽 " + head : "화면", text: txt(root), blocks, headings: hs.map(txt), pairs };
  });
})()`;

/** PDF 글자. 쪽(\f)마다 한 화면이고 덩이는 빈 줄로 나눈다 */
function pdfScreens(pdf: Buffer, tag: string): Screen[] {
  const dir = path.join(OUT, "pdf");
  mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${tag}.pdf`);
  writeFileSync(f, pdf);
  const txt = execFileSync("pdftotext", ["-enc", "UTF-8", f, "-"], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  writeFileSync(path.join(dir, `${tag}.txt`), txt);
  return txt.split("\f").map((t, i) => {
    /* PDF 글자는 줄이 칸 폭에서 끊긴다. 한 문단 안의 줄바꿈을 이어 붙여야 문장 단위 규칙이 선다 */
    const joined = t.replace(/([^\n])\n(?=[^\n])/g, "$1 ");
    return { name: `PDF ${i + 1}쪽`, text: joined, blocks: blocksOf(t).map((b) => b.replace(/\n/g, " ")), headings: [], pairs: [] };
  }).filter((s) => s.text.trim());
}

/** 화면 묶음에 글자 규칙(R1 · R2 · R3 · R4 · R5 · R9)을 건다 */
function textRules(screens: Screen[], f: Facts): Hit[] {
  const hits: Hit[] = [];
  for (const s of screens) {
    const tag = (h: Hit): Hit => ({ ...h, sentence: `(${s.name}) ${h.sentence}` });
    hits.push(...r1(s.blocks).map(tag), ...r2(s.text, f).map(tag), ...r3(s.text, f).map(tag),
      ...r4(s.text).map(tag), ...r5(s.text).map(tag), ...r9(s.text, s.headings, s.pairs).map(tag));
  }
  return dedupe(hits);
}

/**
 * R6 앞쪽(J1): 경험 번역을 적었는데 **모든 영역**이 `묻지 않음 · 자세히 다루지 않은 영역` 으로 섬.
 * 영역 단위로 본다: 응시가 연 선별 · 심화 영역이 0 이거나, 웹 결과의 `이번 검사에서는 자세히 다루지 않은 영역`
 * 묶음에 그 Core 의 영역 이름이 전부 들어 있으면 걸린다. (책의 판단 칸마다 붙는 `이번 검사에서 묻지 않음` 은
 * 영역이 열려도 묻지 않은 칸에 서므로 세지 않는다)
 */
async function r6j1(attemptId: string, core: string, webText: string | null): Promise<Hit[]> {
  const tr = await translatedNotes(attemptId);
  if (!tr) return [];
  const at = (await queryOne<{ p: string[] | null; d: string[] | null }>(
    `SELECT opened_probe AS p, opened_deep AS d FROM v3_attempts WHERE id = $1`, [attemptId]))!;
  const names = content(core).domains.domains.map((x) => x.name);
  const out: Hit[] = [];
  if (!(at.p ?? []).length && !(at.d ?? []).length) out.push({ rule: "R6", sentence: `경험 번역 ${tr}칸을 적었는데 선별 · 심화로 연 영역이 0곳(영역 ${names.length}곳 모두 묻지 않음)` });
  if (webText) {
    const i = webText.indexOf("이번 검사에서는 자세히 다루지 않은 영역");
    if (i >= 0) {
      const seg = webText.slice(i, i + 1500).split(/\n\d+\n/)[0];
      const inSeg = names.filter((n) => seg.includes(n)).length;
      if (inSeg >= names.length) out.push({ rule: "R6", sentence: `(웹) 경험 번역 ${tr}칸을 적었는데 영역 ${names.length}곳이 모두 '이번 검사에서는 자세히 다루지 않은 영역'` });
    }
  }
  return out;
}

/** 응시 하나의 책(PDF 로 뽑히는 HTML)을 브라우저에 올려 본다 */
async function bookCheck(br: Browser, attemptId: string, core: string): Promise<Hit[]> {
  const f = await factsOf(attemptId);
  const rep = await buildLongReport(attemptId, { fontBase: "/nonexistent/" });
  const p = await br.newPage();
  try {
    await p.setContent(rep.html, { waitUntil: "domcontentloaded" });
    const ss = await screensOf(p);
    return dedupe([...textRules(ss, f), ...(await r6j1(attemptId, core, null))]);
  } finally { await p.close(); }
}

async function translatedNotes(attemptId: string): Promise<number> {
  return (await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM v3_responses WHERE attempt_id = $1 AND item_id LIKE 'TR\\_%' AND coalesce(btrim(note_text), '') <> ''`, [attemptId]))?.n ?? 0;
}

/** 한국 시간으로 어제 00:40. 이 시각은 UTC 로 그 전날 15:40 이라, 날짜를 UTC 로 자르면 하루가 밀린다 */
async function kstEarly(): Promise<{ at: string; day: string }> {
  return (await queryOne<{ at: string; day: string }>(
    `SELECT (((now() AT TIME ZONE 'Asia/Seoul')::date - 1 + time '00:40') AT TIME ZONE 'Asia/Seoul')::text AS at,
            to_char((now() AT TIME ZONE 'Asia/Seoul')::date - 1, 'YYYY-MM-DD') AS day`))!;
}

const ymd = (s: string): string[] => [...s.matchAll(/(\d{4})\s*[-.년/]\s*(\d{1,2})\s*[-.월/]\s*(\d{1,2})/g)]
  .map((m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);

type WebVerdict = { hits: Hit[]; webChars: number; pdfPages: number; err?: string };

async function login(ctx: BrowserContext, who: { login: string; pw: string }): Promise<void> {
  const p = await ctx.newPage();
  await p.goto(`${UI_BASE}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"]', who.login);
  await p.fill('input[name="password"]', who.pw);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 }).catch(() => undefined);
  await p.close();
}

/**
 * 웹 결과 · PDF · 담당자 완료일을 실제 서버에서 본다.
 * 담당자 완료일은 담당자 명단 화면(`/org/v3/students`)과 CSV 가 읽는 함수(`listStudents`)를 그대로 부른다.
 */
async function webCheck(br: Browser, r: Row, set: Set, attemptId: string): Promise<WebVerdict> {
  const f = await factsOf(attemptId);
  const who = LOGINS.get(f.userId)!;
  const hits: Hit[] = [];
  /* R8 준비: 이 학생을 기관 명단에 올리고, 제출을 한국 시간 00:40 으로 둔다 */
  const sid = `CC${set}${randomBytes(4).toString("hex")}`;
  await query(`INSERT INTO campus_students (user_id, university_code, student_id, college_code, department_code, specialization)
               VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO NOTHING`, [f.userId, r.uni, sid, r.college, r.leaf, r.spec]);
  const early = await kstEarly();
  await query(`UPDATE v3_attempts SET submitted_at = $2::timestamptz WHERE id = $1`, [attemptId, early.at]);

  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    await login(ctx, who);
    const p = await ctx.newPage();
    const res = await p.goto(`${UI_BASE}/v3/${attemptId}/result`, { waitUntil: "networkidle", timeout: 120000 });
    if (!res || res.status() >= 400 || new URL(p.url()).pathname !== `/v3/${attemptId}/result`) {
      return { hits, webChars: 0, pdfPages: 0, err: `웹 결과를 못 엶(${res?.status()} ${new URL(p.url()).pathname})` };
    }
    const web = await screensOf(p);
    /* 같은 학생이 보는 내 CareerMatri 의 지역 · 할 일 화면. R7(웹과 종이의 수)을 견줄 웹 쪽 수가 결과 요약에는
       적어서 함께 읽는다. 글자 규칙도 같이 건다 */
    const more: Screen[] = [];
    for (const pth of ["/me/region", "/me/next"]) {
      const r2x = await p.goto(`${UI_BASE}${pth}`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => null);
      if (r2x && r2x.status() < 400 && new URL(p.url()).pathname === pth) more.push(...(await screensOf(p)).map((s) => ({ ...s, name: `웹 ${pth}` })));
    }
    await p.close();
    const pdfRes = await ctx.request.get(`${UI_BASE}/v3/${attemptId}/result/pdf`, { timeout: 300000 });
    const buf = await pdfRes.body();
    if (pdfRes.status() !== 200 || !(pdfRes.headers()["content-type"] ?? "").includes("pdf")) {
      return { hits, webChars: web[0]?.text.length ?? 0, pdfPages: 0, err: `PDF 를 못 받음(${pdfRes.status()})` };
    }
    const pdf = pdfScreens(buf, `${r.uni}-${set}-${attemptId}`);
    const webText = web.map((s) => s.text).join("\n"), pdfText = pdf.map((s) => s.text).join("\n");
    const moreText = more.map((s) => s.text).join("\n");
    writeFileSync(path.join(OUT, "pdf", `${r.uni}-${set}-${attemptId}.web.txt`), `${webText}\n\n===== /me/region · /me/next =====\n${moreText}`);
    hits.push(...textRules([...web.map((s) => ({ ...s, name: "웹 결과" })), ...more], f));
    hits.push(...textRules(pdf, f));
    hits.push(...(await r6j1(attemptId, r.core, webText)));
    hits.push(...r7(`${webText}\n${moreText}`, pdfText));

    /* R8 날짜 */
    const webDay = ymd((/(\d{4}\s*[-.년]\s*\d{1,2}\s*[-.월]\s*\d{1,2})\s*일?\s*응답/.exec(webText) ?? [""])[0])[0] ?? null;
    const pdfDay = ymd((/응답일\s*[:：]?\s*(\d{4}\s*[-.년]\s*\d{1,2}\s*[-.월]\s*\d{1,2})/.exec(pdfText) ?? /(\d{4}\s*[-.년]\s*\d{1,2}\s*[-.월]\s*\d{1,2})\s*일?\s*응답/.exec(pdfText) ?? [""])[0])[0] ?? null;
    const adm = await listStudents({ universityCode: r.uni, q: sid, withDemo: true });
    const admDay = adm.rows[0]?.completed_at ?? null;
    const bad = [["학생 웹 응답일", webDay], ["학생 PDF 응답일", pdfDay], ["담당자 명단 완료일", admDay]]
      .filter(([, v]) => v !== early.day);
    if (bad.length) {
      hits.push({ rule: "R8", sentence: `제출 ${early.day} 00:40(한국 시간) · ${[["학생 웹 응답일", webDay], ["학생 PDF 응답일", pdfDay], ["담당자 명단 완료일", admDay]].map(([k, v]) => `${k} ${v ?? "(안 보임)"}`).join(" · ")} → 다른 것: ${bad.map(([k]) => k).join(", ")}` });
    }
    return { hits: dedupe(hits), webChars: webText.length, pdfPages: pdf.length };
  } finally { await ctx.close(); }
}

/** R6 뒤쪽: 관심 칸을 비운 채 `결과 만들기`(finishAction → submit)를 누르면 결과가 만들어지는가 */
async function blankInterest(r: Row): Promise<Hit[]> {
  const uid = await student("blank");
  const entry: CampusEntry = { university_code: r.uni, college_code: r.college, department_code: r.leaf, core_code: r.core, specialization: r.spec };
  const a0 = await openAttempt({ userId: uid, tier: "PRO", stage: "bachelor", gradField: null, campus: entry });
  await walk(r.core, a0, uid, "C");
  const n = (await queryOne<{ n: number }>(
    `WITH d AS (DELETE FROM v3_responses WHERE attempt_id = $1 AND item_id LIKE 'G\\_%\\_INT' RETURNING 1) SELECT count(*)::int AS n FROM d`, [a0.id]))!.n;
  try {
    /* 화면의 `결과 만들기` 가 부르는 서버 함수(finishAction)는 주인만 보고 곧바로 submit 을 부른다. 같은 길을 밟는다 */
    await submit((await attemptOf(a0.id, uid)) as V3Attempt);
    const made = await queryOne<{ id: string }>(`SELECT id::text FROM v3_snapshots WHERE attempt_id = $1 LIMIT 1`, [a0.id]);
    return made ? [{ rule: "R6", sentence: `관심 칸 ${n}개를 비운 채 제출했는데 거절되지 않고 결과가 만들어짐(응시 ${a0.id})` }] : [];
  } catch { return []; }
}

type Cell = { uni: string; set: string; source: string; hits: Hit[]; note?: string };
const CELLS: Cell[] = [];

function contraReport(): string {
  const sets = [...new Set(CELLS.map((c) => c.set))];
  const unis = [...new Set(CELLS.map((c) => c.uni))];
  const head = ["기관", "답안", "본 것", ...RULES];
  const rows: string[][] = [];
  for (const u of unis) for (const s of sets) {
    const cs = CELLS.filter((c) => c.uni === u && c.set === s);
    if (!cs.length) continue;
    const all = cs.flatMap((c) => c.hits);
    rows.push([u, s, cs.map((c) => c.source + (c.note ? `(${c.note})` : "")).join(" · "),
      ...RULES.map((k) => {
        const h = all.filter((x) => x.rule === k);
        if (!h.length) return "통과";
        return h.every((x) => x.warn) ? `경고 ${h.length}` : `실패 ${h.length}`;
      })]);
  }
  const md = [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((l) => `| ${l.map((c) => c.replace(/\|/g, "/")).join(" | ")} |`)].join("\n");
  const detail: string[] = [];
  for (const c of CELLS) {
    if (!c.hits.length) continue;
    detail.push(`\n### ${c.uni} · ${c.set} · ${c.source}${c.note ? ` (${c.note})` : ""}\n`);
    for (const k of RULES) {
      const h = c.hits.filter((x) => x.rule === k);
      if (!h.length) continue;
      detail.push(`- **${k}** ${h.length}곳`);
      for (const x of h.slice(0, 12)) detail.push(`  - ${x.sentence.replace(/\|/g, "/")}`);
      if (h.length > 12) detail.push(`  - … 외 ${h.length - 12}곳`);
    }
  }
  return `# 결과 모순 점검(R1~R9)\n\n칸의 수는 걸린 곳 수. R9 는 경고(반려 기준)이며 실패로 세지 않는다.\n\n${md}\n\n## 걸린 문장\n${detail.join("\n")}\n`;
}

const HEAD = ["기관", "Core", "갈래", "대표 학과", "답안", "선별/심화", "걸림", "자세히", "응시"];

/** 이미 세운 응시를 다시 판정만 한다(고친 뒤 같은 답으로 다시 보기). `REJUDGE=<앞 실행의 OUT>` */
async function rejudge(from: string): Promise<string[][]> {
  const csv = readFileSync(path.join(from, "공통점검.csv"), "utf8").replace(/^\ufeff/, "").split("\n").slice(1);
  const lines: string[][] = [];
  for (const row of csv) {
    const c = [...row.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'));
    if (c.length < 9 || !c[8]) { if (c.length >= 9) lines.push(c); continue; }
    const core = `${c[1]}_CORE_V1`;
    const real = (await queryOne<{ core_code: string }>(`SELECT core_code FROM v3_attempts WHERE id = $1`, [c[8]]))?.core_code ?? core;
    try {
      const v = await judge(c[8], real);
      lines.push([...c.slice(0, 5), `${v.opened}/${v.deep}`, v.fails.join(",") || "통과", v.detail.slice(0, 3).join(" / "), c[8]]);
    } catch (e) { lines.push([...c.slice(0, 6), "오류", String((e as Error).message).slice(0, 140), c[8]]); }
  }
  return lines;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const rs = combos();
  const head = HEAD;
  const lines: string[][] = process.env.REJUDGE ? await rejudge(path.resolve(process.env.REJUDGE)) : [];
  let i = 0;
  if (CONTRA) {
    const broken = selfTest();
    if (broken.length) throw new Error(`결과 모순 규칙 자기 점검 실패: ${broken.join(" · ")}`);
  }
  const br: Browser | null = CONTRA ? await (await import("playwright")).chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) : null;
  const webDone = new Map<string, number>();
  const bookCells = new Map<string, Cell & { n: number }>();
  if (!process.env.REJUDGE) for (const r of rs) {
    const web = WEB && !!br && (webDone.get(r.uni) ?? 0) < WEB_PER_UNI;
    if (web) webDone.set(r.uni, (webDone.get(r.uni) ?? 0) + 1);
    for (const set of SETS) {
      i += 1;
      let attempt = "", v: Verdict | null = null, err = "";
      try {
        const uid = await student(set, web);
        const entry: CampusEntry = { university_code: r.uni, college_code: r.college, department_code: r.leaf, core_code: r.core, specialization: r.spec };
        const a0 = await openAttempt({ userId: uid, tier: "PRO", stage: "bachelor", gradField: null, campus: entry });
        attempt = a0.id;
        await walk(r.core, a0, uid, set);
        await submit((await attemptOf(a0.id, uid)) as V3Attempt);
        v = await judge(a0.id, r.core);
        if (br) {
          /* 책(종이로 뽑히는 HTML) — 모든 응시 */
          const hits = await bookCheck(br, a0.id, r.core);
          const key = `${r.uniName}|${set}`;
          const cell = bookCells.get(key) ?? { uni: r.uniName, set, source: "책", hits: [], n: 0 };
          cell.n += 1;
          cell.hits.push(...hits.map((h) => ({ ...h, sentence: `[${r.leafName} · 응시 ${a0.id}] ${h.sentence}` })));
          bookCells.set(key, cell);
          for (const k of new Set(hits.filter((h) => !h.warn).map((h) => h.rule))) v.fails.push(k);
          v.detail.push(...hits.filter((h) => !h.warn).slice(0, 3).map((h) => `${h.rule}: ${h.sentence.slice(0, 120)}`));
          /* 웹 결과 · 내려받은 PDF · 담당자 완료일 — 기관마다 대표 학과 */
          if (web) {
            const wv = await webCheck(br, r, set, a0.id).catch((e) => ({ hits: [] as Hit[], webChars: 0, pdfPages: 0, err: String((e as Error).message).slice(0, 160) }));
            CELLS.push({ uni: r.uniName, set, source: "웹+PDF", hits: wv.hits,
              note: wv.err ?? `${r.leafName} · 응시 ${a0.id} · 웹 ${wv.webChars}자 · PDF ${wv.pdfPages}쪽` });
            for (const k of new Set(wv.hits.filter((h) => !h.warn).map((h) => h.rule))) v.fails.push(k);
            if (wv.err) v.fails.push("웹오류");
          }
        }
      } catch (e) { err = String((e as Error).message).slice(0, 140); }
      lines.push([r.uniName, r.core.replace(/_CORE_V1$/, ""), r.spec ?? "", r.leafName, set,
        v ? `${v.opened}/${v.deep}` : "", err ? "오류" : ([...new Set(v!.fails)].join(",") || "통과"), err || (v?.detail.slice(0, 3).join(" / ") ?? ""), attempt]);
      process.stdout.write(`\r${i}/${rs.length * SETS.length}`);
    }
  }
  if (br) {
    CELLS.push(...[...bookCells.values()].map((c) => ({ ...c, source: `책 ${c.n}벌` })));
    /* R6 뒤쪽: 기관마다 한 번 */
    for (const u of [...new Set(rs.map((r) => r.uni))]) {
      const r = rs.find((x) => x.uni === u)!;
      const hits = await blankInterest(r).catch((e) => [{ rule: "R6", sentence: `점검 오류: ${String((e as Error).message).slice(0, 120)}` }] as Hit[]);
      CELLS.push({ uni: r.uniName, set: "관심 빈칸", source: "제출", hits, note: r.leafName });
    }
    await br.close();
    writeFileSync(path.join(OUT, "결과모순점검.md"), contraReport());
    writeFileSync(path.join(OUT, "결과모순점검.json"), JSON.stringify(CELLS, null, 1));
  }
  const k = process.env.REJUDGE ? [] : await km1();
  const pass = lines.filter((l) => l[6] === "통과").length;
  const tally = (key: string) => lines.filter((l) => l[6].split(",").includes(key)).length;
  const sum = `세운 응시 ${lines.length} · 통과 ${pass} · 오류 ${lines.filter((l) => l[6] === "오류").length} · ` +
    ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "l", "m", "n", "o", "p", "q", ...(CONTRA ? RULES.filter((x) => x !== "R9") : [])].map((x) => `${x} ${tally(x)}`).join(" · ");
  const md = (h: string[], ls: string[][]) => [`| ${h.join(" | ")} |`, `|${h.map(() => "---").join("|")}|`, ...ls.map((l) => `| ${l.map((c) => c.replace(/\|/g, "/")).join(" | ")} |`)].join("\n");
  writeFileSync(path.join(OUT, "공통점검.md"), `# 공통 자동 점검\n\n${sum}\n\n${md(head, lines)}\n\n## 준비 중 학과 응시(KM1)\n\n${md(["기관", "준비 중 학과", "열린 응시", "열린 학과(앞 6)"], k)}\n`);
  writeFileSync(path.join(OUT, "공통점검.csv"), "﻿" + [head, ...lines].map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n"));
  console.log(`\n${sum}`);
  console.log(`KM1 ${k.map((l) => `${l[0]} ${l[2]}/${l[1]}`).join(" · ")}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
