/**
 * **MAT 브리핑 · 지원서 문장 뼈대 · 달력 파일 · 알림 문장을 센다.**
 *
 *   npm run mat:brief                     # 순수 함수 + 로컬 DB
 *   UI_BASE=http://127.0.0.1:3150 npm run mat:brief   # 떠 있는 서버로 달력 주소까지
 *
 * 세는 것:
 * 1. 여러 공고가 함께 요구하는 빈 줄의 차례가 맞는가(공고 수 → 필수 수 →
 *    아직 없음 먼저 → 붙여 둔 차례). 닫은 공고 · 다른 전공 공고 · 이미 설명할
 *    경험이 있는 줄은 세지 않는가. 다음 작은 일이 비지 않는가
 * 2. 문장 뼈대에 경험 칸 밖의 말이 없는가. 경험 칸 · 이음말(`JOINS`) · 조사 ·
 *    대괄호 칸을 걷어 내면 남는 글자가 0 이어야 한다. 로컬 DB 의 경험 전부로도 잰다
 * 3. 달력 파일이 남의 공고를 내주지 않는가(함수와, 서버가 떠 있으면 주소로)
 * 4. 알림 문장(앱 안 · 기기)에 공고 이름 · 사람 이름 · 수 아닌 것이 없는가
 */
import { loadEnv, BASE, gateCreds, login } from "./_loop-fixture";
loadEnv();

/* eslint-disable import/first */
import { query, queryOne } from "../src/lib/db";
import { appEnv } from "../src/lib/env";
import {
  PUSH_TEXT, buildBrief, nearDeadlines, repeatedGaps, weekTask, weeklyNudgeText,
} from "../src/lib/assistant/brief";
import { BLANK, JOINS, JOSA, composeSentences, sentenceDrafts, sourceWords } from "../src/lib/assistant/sentence";
import { buildIcs, calendarRows, fold, icsText } from "../src/lib/assistant/calendar";
import type { PostingItem, PostingRow } from "../src/lib/assistant/posting";
import { livePostingsOf } from "../src/lib/assistant/posting";
import { nudgeUser } from "../src/lib/assistant/nudges";
import { openActions } from "../src/lib/me-v3/open-actions";
import { activeCore, type ActionRow, type Experience } from "../src/lib/me-v3/platform";
import { ME_POSTINGS, seedMatStudent } from "./_mat-brief-fixtures";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) pass += 1; else fail += 1;
  console.log(`  ${cond ? "통과" : "걸림"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/* ── 1. 여러 공고가 함께 요구하는 빈 줄 ───────────────────────────── */

const it = (domain: string | null, status: PostingItem["status"], kind: "must" | "nice" = "must",
  text = `${domain ?? "조건"} 요구`, evidence: string[] = []): PostingItem =>
  ({ text, kind, domain, axis: null, status, evidence, ...(domain ? {} : { reason: "condition" as const }) });

let pid = 0;
const post = (items: PostingItem[], o: Partial<PostingRow> = {}): PostingRow => {
  pid += 1;
  return {
    id: String(pid), label: `시험 공고 ${pid}`, deadline: null, state: "watching",
    analyzed_by: "rules", created_at: "2026-10-01", core_code: "ME_CORE_V3",
    analysis: { schema: "assistant-posting.1", role: null, items, note: null,
      counts: { ready: 0, partial: 0, empty: 0, unmapped: 0 } },
    ...o,
  };
};

let seq = 0;
const exp = (title: string, td: string[], f: Partial<Experience> = {}): Experience => ({
  id: `e${++seq}`, kind: "project", title, started_on: null, ended_on: null,
  td_codes: td, axis_codes: [], problems: [], decisions: [], artifacts: [], verifications: [],
  note_text: null, status: "saved", created_at: "2026-10-01", ...f,
});

console.log("\n── 1. 여러 공고가 함께 요구하는 빈 줄\n");
{
  const P = [
    post([it("TD02", "empty"), it("TD01", "partial", "must", "기구 설계 및 3D CAD"), it("TD07", "empty", "nice"),
      it("TD04", "ready"), it(null, "unmapped")]),
    post([it("TD02", "empty", "must", "구조 해석 수행"), it("TD01", "partial", "nice"), it("TD06", "empty")]),
    post([it("TD02", "empty", "nice"), it("TD04", "ready"), it("TD06", "empty", "must", "파손 원인 분석"),
      it("TD01", "ready")], { state: "applied" }),
    post([it("TD07", "empty"), it("TD07", "empty"), it("TD04", "partial")], { state: "closed" }),
    post([it("TD07", "empty")], { core_code: "BIZ_CORE_V1" }),
  ];
  const exps = [exp("캡스톤디자인: 컨베이어 구동부", ["TD01"], { artifacts: ["조립도"] })];
  const g = repeatedGaps("ME_CORE_V3", P, exps);
  ok("차례가 공고 수 → 필수 수 순이다", g.map((x) => x.domain).join(",") === "TD02,TD06,TD01",
    g.map((x) => `${x.domain}:${x.count}/${x.total}(필수 ${x.must})`).join(" "));
  ok("분모는 닫지 않은 같은 전공 공고 수다(셋)", g.every((x) => x.total === 3));
  ok("셋 모두 요구한 영역은 3개 중 3개다", g[0]?.count === 3 && g[0]?.status === "empty");
  ok("설명할 경험이 있는 줄은 세지 않는다(TD01 은 둘)", g.find((x) => x.domain === "TD01")?.count === 2);
  ok("닫은 공고와 다른 전공 공고는 세지 않는다(TD07 없음)", !g.some((x) => x.domain === "TD07"));
  ok("이미 설명할 경험만 있는 영역은 서지 않는다(TD04 없음)", !g.some((x) => x.domain === "TD04"));
  ok("공고마다 요구 문장이 따라온다", g[0]?.asks.length === 3 && g[0].asks.some((a) => a.text === "구조 해석 수행"));
  ok("한 공고 안에서는 필수 줄이 대표다", g.find((x) => x.domain === "TD01")?.asks[0].text === "기구 설계 및 3D CAD");
  ok("줄마다 이번 주 작은 일이 있다", g.every((x) => !!x.next && x.next.startsWith(x.area)),
    g.map((x) => x.next ?? "(없음)").join(" / ").slice(0, 160));
  ok("정리가 덜 된 영역의 작은 일은 적어 둔 경험에서 시작한다",
    (g.find((x) => x.domain === "TD01")?.next ?? "").includes("캡스톤디자인: 컨베이어 구동부"));

  const T = [
    post([it("TD03", "partial"), it("TD05", "empty"), it("TD09", "empty"), it("TD10", "empty")]),
    post([it("TD10", "empty"), it("TD09", "empty"), it("TD05", "empty"), it("TD03", "partial")]),
  ];
  const t = repeatedGaps("ME_CORE_V3", T, [], 3);
  ok("같은 수면 아직 없음이 먼저, 그다음 붙여 둔 차례", t.map((x) => x.domain).join(",") === "TD05,TD09,TD10",
    t.map((x) => x.domain).join(","));
  ok("셋까지만 낸다", repeatedGaps("ME_CORE_V3", T, [], 3).length === 3);
  ok("공고가 하나면 서지 않는다", repeatedGaps("ME_CORE_V3", [T[0]], []).length === 0);

  const D = [
    post([], { deadline: "2026-10-29" }), post([], { deadline: "2026-10-26" }),
    post([], { deadline: "2026-10-20" }), post([], { deadline: "2026-11-30", state: "applied" }),
    post([], { deadline: null }), post([], { deadline: "2026-11-02" }), post([], { deadline: "2026-11-20" }),
  ];
  const dl = nearDeadlines(D, "2026-10-26");
  ok("마감은 지난 것 · 지원한 것 · 없는 것을 빼고 가까운 차례로 셋", dl.map((x) => x.left).join(",") === "0,3,7",
    dl.map((x) => `${x.deadline}(${x.left})`).join(" "));

  const rows: ActionRow[] = [
    { id: "1", source: "manual", td_code: null, axis_code: null, body: "끝낸 일", horizon: 30, state: "done" },
    { id: "2", source: "result", td_code: "TD01", axis_code: null, body: "나중 일", horizon: 90, state: "open" },
    { id: "3", source: "result", td_code: "TD02", axis_code: null, body: "이번 주 일", horizon: 30, state: "doing" },
  ];
  const w = weekTask(rows, false);
  ok("이번 주 할 일은 끝내지 않은 30일 안의 줄이다", w?.body === "이번 주 일" && w.state === "doing" && w.saved);
  ok("할 일이 없으면 비어 있다", weekTask([rows[0]], false) === null);

  const b = buildBrief({ core: "ME_CORE_V3", postings: P, exps, actions: rows, fromResult: true,
    now: new Date("2026-10-26T03:00:00Z") });
  ok("브리핑이 세 칸을 한 번에 낸다", b.gaps.length === 3 && b.task?.saved === false && b.pool === 3 && b.today === "2026-10-26");
}

/* ── 2. 문장 뼈대에 경험 칸 밖의 말이 없는가 ───────────────────────── */

console.log("\n── 2. 문장 뼈대\n");

/** 경험 칸 · 이음말 · 대괄호 칸 · 조사를 걷어 내고 남는 글자 */
function leftover(sentences: string[], e: Experience): string {
  const text = sentences.join(" ");
  const words = sourceWords(e).sort((a, b) => b.length - a.length);
  const joins = [...JOINS].sort((a, b) => b.length - a.length);
  const blanks = Object.values(BLANK);
  const strip = (s: string, list: readonly string[]) => list.reduce((acc, w) => acc.split(w).join(" "), s);
  /* 걷는 차례 둘. 경험 칸 글에 이음말이 들어 있을 수도, 그 반대일 수도 있다 */
  const tries = [
    strip(strip(strip(text, blanks), words), joins),
    strip(strip(strip(text, blanks), joins), words),
  ];
  const josa = new RegExp(`(?<=[\\s’\\]])(${[...JOSA].sort((a, b) => b.length - a.length).join("|")})(?=[\\s.,])`, "g");
  const clean = (s: string) => s.replace(josa, " ").replace(/[\s.,‘’]/g, "");
  return tries.map(clean).sort((a, b) => a.length - b.length)[0];
}

{
  const full = exp("캡스톤디자인: 소형 컨베이어 구동부 설계와 시제품 제작", ["TD01"], {
    problems: ["설계 범위와 다루지 않을 것을 적었다"],
    decisions: ["하중과 재질을 근거로 두께나 단면을 정했다", "끼워 맞춤과 공차 등급을 정했다"],
    artifacts: ["조립도", "부품도"], verifications: ["손계산", "다른 설계안"],
  });
  const c = composeSentences(full);
  ok("칸이 다 차면 대괄호가 없다", c.blanks.length === 0 && !/\[/.test(c.sentences.join(" ")),
    c.sentences.join(" "));
  ok("두세 문장이다", c.sentences.length >= 2 && c.sentences.length <= 3);
  ok("경험 칸 밖의 말이 없다(다 찬 경험)", leftover(c.sentences, full) === "", leftover(c.sentences, full));
  const c2 = composeSentences(full, 1);
  ok("같은 경험을 두 번 쓰면 다른 보기를 꺼낸다", c2.sentences[1].includes("끼워 맞춤") && c2.sentences[2].includes("부품도"));

  const empty = exp("기계공작실습: 선반 가공", ["TD07"]);
  const ce = composeSentences(empty);
  ok("빈 칸은 대괄호로 남는다(넷)", ce.blanks.length === 4
    && Object.values(BLANK).every((b) => ce.sentences.join(" ").includes(b)), ce.sentences.join(" "));
  ok("경험 칸 밖의 말이 없다(빈 경험)", leftover(ce.sentences, empty) === "", leftover(ce.sentences, empty));

  const noun = exp("동아리 로봇 대회", ["TD05"], {
    problems: ["모터 과열"], decisions: ["감속비"], artifacts: ["동작 순서표"], verifications: ["목표 사이클 시간과 실측"],
  });
  const cn = composeSentences(noun);
  ok("문장이 아닌 칸도 따옴표로 그대로 들어간다", cn.sentences.join(" ").includes("‘모터 과열’")
    && cn.sentences.join(" ").includes("‘감속비’"), cn.sentences.join(" "));
  ok("경험 칸 밖의 말이 없다(낱말 칸)", leftover(cn.sentences, noun) === "", leftover(cn.sentences, noun));

  /* 지어낸 말을 넣으면 검사가 잡는가. **검사가 늘 0 을 내는 검사가 아닌지** 본다 */
  const forged = [...c.sentences.slice(0, 2), "결과는 조립도로 남겼고, 불량률을 30% 줄였다."];
  ok("지어낸 말을 넣으면 잡는다", leftover(forged, full) !== "", leftover(forged, full));

  const items: PostingItem[] = [
    it("TD01", "partial", "must", "기구 설계"), it("TD01", "ready", "must", "도면 작성"),
    it("TD02", "partial", "must", "구조 해석"), it("TD07", "empty", "must"), it("TD01", "partial", "nice"),
    it(null, "unmapped"),
  ];
  const sd = sentenceDrafts(items, [full, empty]);
  ok("필수 · 설명할 경험 있음/정리가 덜 됨 · 경험이 있는 줄만 뼈대를 만든다", sd.drafts.length === 2
    && sd.drafts.every((d) => d.domain === "TD01"), sd.drafts.map((d) => d.text).join(","));
  ok("경험이 없는 필수 줄은 수로만 센다", sd.missing === 1);
  const one = exp("유한요소해석 과제", ["TD02"], {
    problems: ["어떤 하중 조건과 현상을 볼지 정했다"], decisions: ["구속 조건과 하중 작용점을 정했다"],
    artifacts: ["해석 보고서"], verifications: ["손계산"],
  });
  const merged = sentenceDrafts([it("TD02", "ready", "must", "구조 해석"), it("TD02", "ready", "must", "해석 보고서 작성")], [one]);
  ok("같은 문장이 나오는 두 요구는 초안 하나로 묶는다", merged.drafts.length === 1
    && merged.drafts[0].also.join() === "해석 보고서 작성");
}

/** 로컬 DB 의 경험 전부. 사람이 실제로 고른 보기와 지어 쓴 제목으로 잰다 */
async function draftsOnDb(): Promise<void> {
  console.log("\n── 2-1. 로컬 DB 경험으로 만든 문장 뼈대\n");
  const all = await query<Experience>(
    `SELECT id::text, kind, title, started_on::text, ended_on::text, td_codes, axis_codes,
            problems, decisions, artifacts, verifications, used_where, note_text, status, created_at::text
       FROM v3_experiences ORDER BY id DESC LIMIT 2000`).catch(() => [] as Experience[]);
  let bad = 0; let firstBad = "";
  for (const e of all) {
    for (const u of [0, 1]) {
      const s = composeSentences(e, u).sentences;
      const l = leftover(s, e);
      if (l) { bad += 1; if (!firstBad) firstBad = `${e.id}: ${l} ← ${s.join(" ")}`; }
    }
  }
  ok(`로컬 DB 경험 ${all.length}건으로 만든 뼈대에 경험 밖의 말이 없다`, all.length > 0 && bad === 0,
    bad ? `${bad}건 · ${firstBad.slice(0, 200)}` : "");
}

/* ── 3. 달력 파일 ─────────────────────────────────────────────────── */

console.log("\n── 3. 달력 파일\n");
{
  const ics = buildIcs([
    { id: "7", label: "OO기계, 기구설계; 신입", deadline: "2026-10-29" },
    { id: "8", label: "아주 긴 공고 이름이 들어가도 한 줄이 일흔다섯 바이트를 넘지 않게 접혀야 하는 공고 이름", deadline: "2026-12-31" },
  ], { base: "https://app.example", now: new Date("2026-10-26T00:00:00Z") });
  const lines = ics.split("\r\n");
  ok("줄은 CRLF 로 끝나고 접힌 줄도 75바이트 안이다",
    ics.endsWith("\r\n") && !/[^\r]\n/.test(ics) && lines.every((l) => Buffer.byteLength(l, "utf8") <= 75));
  ok("쉼표와 쌍반점을 막는다", ics.includes("SUMMARY:OO기계\\, 기구설계\\; 신입 마감"));
  ok("하루 종일 일정이고 다음 날에 끝난다", ics.includes("DTSTART;VALUE=DATE:20261029") && ics.includes("DTEND;VALUE=DATE:20261030")
    && ics.includes("DTEND;VALUE=DATE:20270101"));
  ok("공고마다 UID 가 따로다", ics.includes("UID:mat-posting-7@careermatri") && ics.includes("UID:mat-posting-8@careermatri"));
  ok("공고 화면 주소가 붙는다", ics.includes("URL:https://app.example/me/track/posting/7"));
  ok("접은 줄을 다시 펴면 원래 줄이다", fold("가".repeat(60)).replace(/\r\n /g, "") === "가".repeat(60));
  ok("줄바꿈도 막는다", icsText("a\nb") === "a\\nb");
}

/* ── 4. 알림 문장 ─────────────────────────────────────────────────── */

console.log("\n── 4. 알림 문장\n");
{
  const combos = [
    { task: true, deadlines: 2, gaps: 3 }, { task: false, deadlines: 0, gaps: 0 },
    { task: true, deadlines: 0, gaps: 1 }, { task: false, deadlines: 1, gaps: 0 },
  ];
  const texts = combos.map((c) => weeklyNudgeText(c));
  /* 문장을 만드는 함수가 받는 것은 수 셋뿐이다. 이름을 넣을 길이 있는지 꼴로 본다 */
  const src = readFileSync("src/lib/assistant/brief.ts", "utf8");
  ok("주간 알림 문장은 수 셋만 받는다",
    /export function weeklyNudgeText\(n: \{ task: boolean; deadlines: number; gaps: number \}\)/.test(src));
  ok("주간 알림 문장에 숫자 밖의 바뀌는 말이 없다",
    texts.every((t) => t.title === "이번 주 MAT 브리핑") && new Set(texts.map((t) => t.body.replace(/\d+/g, "#"))).size === combos.length);
  const push = Object.values(PUSH_TEXT);
  ok("기기 알림에는 숫자도 이름도 없다", push.every((p) => !/\d/.test(p.body) && p.title === "CareerMatri"
    /* 가는 곳도 고정된 쪽이다: 공고 번호나 응시 번호가 주소에 붙으면 잠금 화면에 그 번호가 남는다 */
    && ["/me/track#brief", "/me/track#plans", "/me/track/jobs"].includes(p.url)));
  const nsrc = readFileSync("src/lib/assistant/nudges.ts", "utf8");
  const call = /sendPush\(([\s\S]*?)\)\s*\.catch/.exec(nsrc)?.[1] ?? "";
  ok("밤 당번은 기기 알림을 PUSH_TEXT 로만 보낸다", call.includes("PUSH_TEXT") && !call.includes("${") && !call.includes("label"),
    call.replace(/\s+/g, " "));
}

/* ── 5. 로컬 DB 로 한 바퀴 ────────────────────────────────────────── */


async function dbRound(): Promise<void> {
  console.log("\n── 5. 로컬 DB(공고 셋 · 달력 · 주간 알림)\n");
  if (appEnv() === "production") { console.log("  건너뜀  운영에서는 시험 사람을 만들지 않는다"); return; }
  const A = await seedMatStudent("zz-mat-brief-a");
  const B = await seedMatStudent("zz-mat-brief-b");
  ok("시험 사람의 전공이 기계공학이다", (await activeCore(A.id)) === "ME_CORE_V3");

  const live = await livePostingsOf(A.id);
  const open = await openActions(A.id);
  const b = buildBrief({ core: live.core, postings: live.rows, exps: live.exps, actions: open.rows, fromResult: open.fromResult });
  const top = b.gaps[0];
  ok("붙여 둔 기계 공고 셋에서 셋 모두 요구한 빈 영역이 맨 위다", !!top && top.count === 3 && top.total === 3,
    b.gaps.map((g) => `${g.area} ${g.count}/${g.total} ${g.status}`).join(" · "));
  ok("가까운 마감이 셋이고 가까운 차례다", b.deadlines.length === 3 && b.deadlines[0].left <= b.deadlines[1].left,
    b.deadlines.map((d) => `${d.label} D-${d.left}`).join(" · "));
  ok("이번 주 할 일이 있다", !!b.task, b.task?.body.slice(0, 60));

  /* 남의 공고 */
  const mine = await calendarRows(A.id, A.postings[0]);
  const theirs = await calendarRows(B.id, A.postings[0]);
  const allB = await calendarRows(B.id);
  ok("달력: 내 공고 한 건은 나온다", mine.length === 1 && mine[0].label === ME_POSTINGS[0].label);
  ok("달력: 남의 번호를 넣으면 빈 목록이다", theirs.length === 0);
  ok("달력: 전부 받기에 남의 공고가 섞이지 않는다", allB.length === 3 && allB.every((r) => B.postings.includes(r.id)));
  ok("달력: 숫자가 아닌 번호는 빈 목록이다", (await calendarRows(A.id, "1 OR 1=1")).length === 0);

  /* 주간 알림 */
  await query(`DELETE FROM assistant_nudges WHERE user_id = $1`, [A.id]);
  await nudgeUser(A.id);
  const n = await queryOne<{ title: string; body: string; href: string }>(
    `SELECT title, body, href FROM assistant_nudges WHERE user_id = $1 AND kind = 'weekly'`, [A.id]);
  const name = (await queryOne<{ display_name: string }>(`SELECT display_name FROM users WHERE id = $1`, [A.id]))?.display_name ?? "";
  const leak = [...ME_POSTINGS.map((p) => p.label), name].filter((w) => w && `${n?.title} ${n?.body}`.includes(w));
  ok("주간 알림은 브리핑으로 보낸다", n?.href === "/me/track#brief", `${n?.title} · ${n?.body}`);
  ok("주간 알림에 공고 이름 · 사람 이름이 없다", !!n && leak.length === 0, leak.join(","));

  if (process.env.UI_BASE) await httpRound(A, B);
  else console.log("  건너뜀  UI_BASE 가 없어 달력 주소는 함수로만 쟀다");
}

/* ── 6. 떠 있는 서버로 달력 주소 ──────────────────────────────────── */

async function httpRound(A: { pw: string; postings: string[] }, B: { pw: string }): Promise<void> {
  const { chromium } = await import("playwright");
  const gate = gateCreds();
  const browser = await chromium.launch();
  try {
    const anon = await browser.newContext(gate ? { httpCredentials: gate } : {});
    const r0 = await anon.request.get(`${BASE}/me/track/calendar?id=${A.postings[0]}`);
    ok("주소: 로그인하지 않으면 401", r0.status() === 401, String(r0.status()));

    const cb = await browser.newContext(gate ? { httpCredentials: gate } : {});
    await login(cb, "zz-mat-brief-b", B.pw);
    const r1 = await cb.request.get(`${BASE}/me/track/calendar?id=${A.postings[0]}`);
    const t1 = await r1.text();
    ok("주소: 남의 공고 번호는 404 이고 이름이 새지 않는다", r1.status() === 404 && !t1.includes(ME_POSTINGS[0].label),
      String(r1.status()));

    const ca = await browser.newContext(gate ? { httpCredentials: gate } : {});
    await login(ca, "zz-mat-brief-a", A.pw);
    const r2 = await ca.request.get(`${BASE}/me/track/calendar?id=${A.postings[0]}`);
    const t2 = await r2.text();
    ok("주소: 내 공고는 달력 파일이다", r2.status() === 200 && /text\/calendar/.test(r2.headers()["content-type"] ?? "")
      && t2.includes("BEGIN:VEVENT") && /attachment/.test(r2.headers()["content-disposition"] ?? ""),
      `${r2.status()} ${r2.headers()["content-type"]}`);
    const r3 = await ca.request.get(`${BASE}/me/track/calendar`);
    const t3 = await r3.text();
    ok("주소: 전부 받기는 내 공고 셋이다", r3.status() === 200 && (t3.match(/BEGIN:VEVENT/g) ?? []).length === 3);
    ok("주소: 저장하지 않게 막는다", /no-store/.test(r2.headers()["cache-control"] ?? ""));
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  await draftsOnDb().catch((e) => { fail += 1; console.log(`  걸림  DB 경험 훑기 — ${(e as Error).message}`); });
  await dbRound().catch((e) => { fail += 1; console.log(`  걸림  로컬 DB 한 바퀴 — ${(e as Error).message}`); });
  console.log(`\n통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

void main();
