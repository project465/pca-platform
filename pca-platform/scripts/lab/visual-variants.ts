/**
 * **BIZ Result Hero + Summary 의 Visual Variant 셋**(R4 §25).
 *
 * 제품 코드에 바로 적용하지 않는다. 굳은 결과(`v3_snapshots.result_model`)
 * 에서 **같은 글**을 꺼내 세 가지 짜임으로만 그려 보고, 어느 쪽이 나은지는
 * 사람이 고른다(§28·§29).
 *
 *   A  Centered editorial   가운데 정렬 · 여백이 결정한다
 *   B  Asymmetric modern    왼쪽 메타 · 오른쪽 본문의 비대칭 격자
 *   C  Rounded modular      둥근 면 여럿이 역할마다 다른 크기로
 *
 * **measurement / result logic 을 건드리지 않는다**(§26·§31): 읽기만 하고
 * 글은 `text.ko.ts` 가 만든 것을 그대로 쓴다. 이 파일이 따로 만드는 문장은
 * 머리글 한 줄뿐이고, 그것도 영역 사전의 `먼저 정하는 것` 에서 짓는다.
 *
 *   ATT=9715 OUT=docs/metri/shots/review-loop/r4 npx tsx scripts/lab/visual-variants.ts
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { queryOne } from "../../src/lib/db";
import { load } from "../../src/lib/me-v3/scoring/engine";
import type { ResultModel } from "../../src/lib/me-v3/result/model";
import { chainFor } from "../../src/lib/me-v3/result/chains";
import { industryChoices, roleChoices } from "../../src/lib/me-v3/runtime/session";
import {
  actionBriefKo, actionHeadKo, actionWhyKo, headlineKo, keptNoteKo,
  needSentenceKo, pickSentenceKo,
} from "../../src/lib/me-v3/result/text.ko";

const ATT = process.env.ATT ?? "9715";
const OUT = process.env.OUT ?? "docs/metri/shots/review-loop/r4";

/** 같은 그림이 두 이름으로 저장되면 그 자리에서 멈춘다 */
const seen = new Map<string, string>();
function mark(file: string): void {
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  if (had) throw new Error(`같은 그림이 두 이름으로: ${had} = ${file}`);
  seen.set(sum, file);
  console.log(`  떴다 ${file}`);
}

type Content = {
  school: string; dept: string; ident: string;
  eyebrow: string; headline: string; lead: string;
  expSentence: string; expTags: string[];
  actHead: string; actBrief: string; actWhy: string;
  keptItems: string[]; keptNote: string;
  gapItems: string[]; gapNeed: string;
  linkNames: string; linkText: string;
};

/**
 * 머리글 한 줄을 **사람의 경험에서** 연다(§13).
 *
 * 전에는 `경영전략·기획과 마케팅·시장에서 …` 처럼 분류 이름 둘을 앞에
 * 붙여 만든 문장이었다. 학생이 먼저 읽는 줄이 **자기가 한 일**이 되게,
 * 그 영역이 일하는 차례의 `먼저 정하는 것` 을 가져와 짓는다.
 * **하드코딩하지 않는다**: 두 토막이 전부 영역 사전에서 온다.
 */
function heroLine(core: string, codes: string[]): string | null {
  const steps = codes.map((c) => chainFor(core, c)[1] ?? "").filter(Boolean);
  if (!steps.length) return null;
  if (steps.length === 1) return `${steps[0]}을 직접 골라 본 경험이 있어요.`;
  return `${steps[0]}을 가리고, ${steps[1]}을 직접 골라 본 경험이 있어요.`;
}

async function content(): Promise<Content> {
  const row = await queryOne<{
    result_model: ResultModel; core_code: string;
    university_code: string | null; department_code: string | null;
  }>(
    `SELECT y.result_model, a.core_code, a.university_code, a.department_code
       FROM v3_snapshots y JOIN v3_attempts a ON a.id = y.attempt_id
      WHERE y.attempt_id = $1::bigint ORDER BY y.id DESC LIMIT 1`, [ATT]);
  if (!row) throw new Error(`응시 ${ATT} 의 굳은 결과가 없습니다`);
  const m = row.result_model;
  const loaded = load(row.core_code);
  const NAME = new Map<string, string>(
    (loaded.domains.domains as { code: string; name: string }[])
      .map((d) => [d.code, d.name]));
  const nm = (c: string): string => NAME.get(c) ?? c;

  const focus = m.domains.filter((d) => m.overview.focus.includes(d.code));
  const h = headlineKo(m, nm);
  const hero = heroLine(row.core_code, m.overview.focus.slice(0, 2)) ?? h.title;
  const left = [...new Set(focus.flatMap((d) => d.artifacts))];
  const g0 = m.gaps[0];
  const a0 = m.actions[0];
  const gapDomains = [...new Set(m.gaps.map((g) => nm(g.domain)))].slice(0, 2);
  /**
   * 이어 볼 산업과 역할의 **이름**.
   *
   * 결과 모델이 들고 있는 것은 고르신 팩의 코드(`industry_context` ·
   * `role_context`)이고, 사람이 읽는 이름은 그 Core 의 팩 목록이 든다.
   * 제품 결과지가 쓰는 같은 자리를 그대로 읽는다(설계 원칙 10).
   */
  const iName = (c: string): string =>
    industryChoices(row.core_code).find((x) => x.code === c)?.name ?? c;
  const rName = (c: string): string =>
    roleChoices(row.core_code).find((x) => x.code === c)?.name ?? c;
  const linkNames = [
    m.industry_context ? iName(m.industry_context.code) : null,
    m.role_context ? rName(m.role_context.code) : null,
  ].filter(Boolean).join(" · ");

  return {
    school: "배재대학교",
    dept: "경영학과 · 경영 일반",
    ident: `CareerMatri ${m.tier} · ${new Date().toISOString().slice(0, 10)} 응답`,
    eyebrow: "경영 진로 진단 결과",
    headline: hero,
    lead: "여기까지 해 봤으면 지원서에서 이야기할 거리는 이미 모였어요.",
    expSentence: pickSentenceKo(focus[0]?.decided.length
      ? focus[0].decided : focus[0]?.did ?? []) || "해 보신 일이 있습니다",
    expTags: focus.slice(0, 3).map((d) => nm(d.code)),
    actHead: a0 ? actionHeadKo(a0) : "",
    actBrief: a0 ? actionBriefKo(a0, (a0.domain && nm(a0.domain)) || "") : "",
    actWhy: a0 ? actionWhyKo(a0) : "",
    keptItems: left.slice(0, 2),
    keptNote: keptNoteKo(left.length > 0),
    gapItems: gapDomains,
    gapNeed: g0 ? needSentenceKo(g0.axis ? [g0.axis] : []) : "",
    linkNames,
    linkText: "에서 해 본 일이 이어져요",
  };
}

/* ── 공통 팔레트(§21) ─────────────────────────────────────────────────
   deep navy 하나 · clean blue 하나 · muted cyan 하나 · cool gray.
   면은 white 와 cool off-white 와 neutral light gray 다. **베이지와
   brown tone 을 쓰지 않는다**(§1). 한 화면에서 면은 셋까지다(§20) */
const PALETTE = `
  --navy:#15284a; --navy-2:#24395f;
  --blue:#2563c9; --blue-ink:#1d4ea6;
  --cyan:#1b7f8c;
  --ink:#16203a; --ink-2:#44506b; --ink-3:#737e96;
  --white:#ffffff; --off:#fbfbfd; --cool:#f6f8fc; --gray:#f2f4f7;
  --pale:#eaf1fd; --pale-line:#d4e2f8;
  --line:#e6e9f0; --line-2:#eef0f5;
`;

const BASE = `
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",
      "Noto Sans KR","Malgun Gothic",sans-serif;
    -webkit-font-smoothing:antialiased; color:var(--ink-2);
    word-break:keep-all; overflow-wrap:break-word; line-height:1.6;
  }
  h1,h2,h3,p,ul{margin:0}
  ul{padding:0;list-style:none}
  .eyebrow{font-size:12px;font-weight:600;letter-spacing:.14em;color:var(--blue-ink)}
  .ident{font-size:12.5px;color:var(--ink-3)}
  .school{font-size:15px;font-weight:700;color:var(--ink)}
  .dept{font-size:13.5px;color:var(--ink-2)}
  .lead{color:var(--ink-2)}
  .label{font-size:11.5px;font-weight:700;letter-spacing:.12em;color:var(--ink-3)}
  .tagrow{display:flex;flex-wrap:wrap;gap:6px}
  .tag{font-size:12px;color:var(--ink-3);background:var(--gray);
       padding:4px 10px;border-radius:999px}
  .chip{font-size:13px;color:var(--navy);background:var(--pale);
        padding:6px 12px;border-radius:999px;font-weight:600}
`;

/* 작은 선 아이콘 하나. **emoji 를 쓰지 않는다**(§35) */
const CHECK = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none"
  aria-hidden="true"><path d="M3.2 8.4 6.3 11.5 12.8 5" stroke="currentColor"
  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ARROW = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"
  aria-hidden="true"><path d="M3.5 8h8.5M8.6 4.4 12.2 8l-3.6 3.6" stroke="currentColor"
  stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function page(css: string, body: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CareerMatri</title>
<style>:root{${PALETTE}}${BASE}${css}</style></head><body>${body}</body></html>`;
}

/* ── A. Centered editorial ────────────────────────────────────────────
   한 화면에 핵심 메시지 하나. 가운데 정렬과 넓은 여백이 그 메시지를
   세우고, 긴 설명은 그 아래 면 안에서 왼쪽으로 돌아온다(§5) */
function variantA(c: Content): string {
  const css = `
  body{background:var(--off)}
  .wrap{max-width:1040px;margin:0 auto;padding:0 32px 72px}
  .top{display:flex;align-items:baseline;gap:10px;padding:26px 0 0}
  .top .ident{margin-left:auto}
  .hero{text-align:center;padding:84px 0 64px;max-width:720px;margin:0 auto}
  .hero .eyebrow{display:block;margin-bottom:22px}
  .hero h1{font-size:44px;line-height:1.3;letter-spacing:-.035em;
    font-weight:800;color:var(--ink);text-wrap:balance}
  .hero .lead{margin-top:20px;font-size:17px}
  .cue{display:inline-flex;align-items:center;gap:8px;margin-top:34px;
    padding:13px 22px;border-radius:999px;background:var(--navy);color:#fff;
    font-size:14.5px;font-weight:700}
  .surface{background:var(--white);border-radius:22px;padding:38px 40px;
    box-shadow:0 1px 2px rgba(21,40,74,.05)}
  .exp h2{font-size:21px;line-height:1.5;color:var(--ink);font-weight:700;
    letter-spacing:-.015em;margin-top:10px}
  .exp .tagrow{margin-top:18px}
  .act{margin-top:20px;background:var(--pale);border-radius:18px;padding:30px 34px}
  .act .head{display:flex;align-items:center;gap:8px;color:var(--blue-ink);
    font-size:11.5px;font-weight:700;letter-spacing:.12em}
  .act h3{margin-top:12px;font-size:20px;color:var(--navy);font-weight:700;
    letter-spacing:-.015em}
  .act p{margin-top:10px;font-size:14.5px;color:var(--navy-2)}
  .act .why{margin-top:14px;padding-top:14px;border-top:1px solid var(--pale-line);
    font-size:13.5px;color:var(--ink-2)}
  .sub{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:34px;
    padding:0 6px}
  .sub h4{font-size:15px;font-weight:700;color:var(--ink);margin-top:8px}
  .sub p{margin-top:6px;font-size:13.5px;color:var(--ink-3)}
  .link{margin-top:40px;text-align:center;font-size:13.5px;color:var(--ink-3)}
  .link b{color:var(--ink);font-weight:700}
  @media(max-width:719px){
    .wrap{padding:0 20px 56px}
    .hero{padding:56px 0 44px}
    .hero h1{font-size:31px;letter-spacing:-.03em}
    .hero .lead{font-size:15.5px;margin-top:16px}
    .surface{padding:26px 22px;border-radius:18px}
    .act{padding:22px 20px}
    .exp h2{font-size:18px}
    .sub{grid-template-columns:1fr;gap:20px;margin-top:26px}
    .top{flex-wrap:wrap;gap:4px}
    .top .ident{margin-left:0;width:100%}
  }`;
  const body = `<div class="wrap">
  <div class="top"><span class="school">${c.school}</span>
    <span class="dept">${c.dept}</span><span class="ident">${c.ident}</span></div>
  <header class="hero">
    <span class="eyebrow">${c.eyebrow}</span>
    <h1>${c.headline}</h1>
    <p class="lead">${c.lead}</p>
    <span class="cue">${CHECK}${c.actHead}</span>
  </header>
  <section class="surface exp">
    <span class="label">내가 해본 경험</span>
    <h2>${c.expSentence}</h2>
    <ul class="tagrow">${c.expTags.map((t) => `<li class="tag">${t}</li>`).join("")}</ul>
  </section>
  <section class="act">
    <span class="head">${ARROW} 지금 하면 좋은 일</span>
    <h3>${c.actHead}</h3>
    <p>${c.actBrief}</p>
    <p class="why">${c.actWhy}</p>
  </section>
  <div class="sub">
    <div><span class="label">남긴 근거</span><h4>${c.keptItems.join(" · ")}</h4>
      <p>${c.keptNote}</p></div>
    <div><span class="label">더 채울 부분</span><h4>${c.gapItems.join(" · ")}</h4>
      <p>${c.gapNeed}</p></div>
  </div>
  <p class="link"><b>${c.linkNames}</b> ${c.linkText}</p>
</div>`;
  return page(css, body);
}

/* ── B. Asymmetric modern ─────────────────────────────────────────────
   왼쪽은 신분과 자리표, 오른쪽은 본문. 두 단의 폭이 달라서 눈이 오른쪽
   큰 문장에 먼저 닿고, 할 일은 오른쪽 단의 맨 위 카드가 든다 */
function variantB(c: Content): string {
  const css = `
  body{background:var(--gray)}
  .wrap{max-width:1180px;margin:0 auto;padding:0 40px 80px}
  .hero{display:grid;grid-template-columns:230px 1fr;gap:56px;
    padding:62px 0 54px;align-items:start}
  .meta{display:grid;gap:10px;padding-top:10px}
  .meta .eyebrow{color:var(--cyan)}
  .meta .school{font-size:16px}
  .hero h1{font-size:40px;line-height:1.28;letter-spacing:-.035em;
    font-weight:800;color:var(--ink)}
  .hero .lead{margin-top:18px;font-size:16.5px;max-width:46ch}
  /* 두 단의 폭이 다르되 길이는 서로 받는다. 한 단에만 카드를 쌓으면
     다른 단의 아래가 통째로 빈 면이 되어 덜 그린 화면으로 읽힌다 */
  .grid{display:grid;grid-template-columns:1.45fr 1fr;gap:26px;align-items:start}
  .exp{background:var(--white);border-radius:18px;padding:34px 36px}
  .exp h2{margin-top:12px;font-size:22px;line-height:1.5;color:var(--ink);
    font-weight:700;letter-spacing:-.015em}
  .exp .tagrow{margin-top:20px}
  .side{display:grid;gap:18px;align-content:start}
  .act{background:var(--navy);color:#fff;border-radius:18px;padding:28px 28px 24px}
  .act .head{display:flex;align-items:center;gap:7px;font-size:11.5px;
    font-weight:700;letter-spacing:.12em;color:#9fc0f2}
  .act h3{margin-top:12px;font-size:19px;font-weight:700;letter-spacing:-.015em}
  .act p{margin-top:10px;font-size:14px;color:#cfdcf2}
  .act .why{margin-top:14px;padding-top:13px;border-top:1px solid rgba(255,255,255,.18);
    font-size:13px;color:#aec4e6}
  .box{background:var(--white);border-radius:12px;padding:18px 20px}
  .box h4{margin-top:7px;font-size:14.5px;font-weight:700;color:var(--ink)}
  .box p{margin-top:5px;font-size:13px;color:var(--ink-3)}
  .link{margin-top:30px;padding-top:16px;border-top:1px solid var(--line);
    font-size:13.5px;color:var(--ink-3)}
  .link b{color:var(--ink);font-weight:700}
  @media(max-width:719px){
    .wrap{padding:0 20px 56px}
    .hero{grid-template-columns:1fr;gap:20px;padding:40px 0 34px}
    .meta{padding-top:0;gap:5px}
    .hero h1{font-size:30px;letter-spacing:-.03em}
    .hero .lead{font-size:15.5px;margin-top:14px}
    /* 좁은 화면은 두 단을 그대로 쌓지 않는다: 그대로 쌓으면 할 일이
       남긴 근거 아래로 밀려 엄지로 한 번 더 넘겨야 닿는다 */
    .grid{display:flex;flex-direction:column;gap:16px}
    .side{display:contents}
    .exp{order:1;padding:24px 22px}
    .act{order:2;padding:22px 20px}
    .box.kept{order:3}
    .box.lack{order:4}
    .exp h2{font-size:18.5px}
  }`;
  const body = `<div class="wrap">
  <header class="hero">
    <div class="meta">
      <span class="eyebrow">${c.eyebrow}</span>
      <span class="school">${c.school}</span>
      <span class="dept">${c.dept}</span>
      <span class="ident">${c.ident}</span>
    </div>
    <div><h1>${c.headline}</h1><p class="lead">${c.lead}</p></div>
  </header>
  <div class="grid">
    <div class="side">
      <section class="exp">
        <span class="label">내가 해본 경험</span>
        <h2>${c.expSentence}</h2>
        <ul class="tagrow">${c.expTags.map((t) => `<li class="tag">${t}</li>`).join("")}</ul>
      </section>
      <div class="box kept"><span class="label">남긴 근거</span>
        <h4>${c.keptItems.join(" · ")}</h4><p>${c.keptNote}</p></div>
    </div>
    <div class="side">
      <section class="act">
        <span class="head">${CHECK} 지금 하면 좋은 일</span>
        <h3>${c.actHead}</h3><p>${c.actBrief}</p><p class="why">${c.actWhy}</p>
      </section>
      <div class="box lack"><span class="label">더 채울 부분</span>
        <h4>${c.gapItems.join(" · ")}</h4><p>${c.gapNeed}</p></div>
    </div>
  </div>
  <p class="link"><b>${c.linkNames}</b> ${c.linkText}</p>
</div>`;
  return page(css, body);
}

/* ── C. Rounded modular ───────────────────────────────────────────────
   둥근 면 넷이 역할마다 다른 크기와 다른 바탕으로 선다. 머리와 할 일이
   한 면 안에 들어가 **결과를 연 사람이 보는 첫 덩이가 하나**가 된다 */
function variantC(c: Content): string {
  const css = `
  body{background:var(--cool)}
  .wrap{max-width:1080px;margin:0 auto;padding:30px 32px 76px}
  .top{display:flex;align-items:baseline;gap:10px;padding-bottom:22px}
  .top .ident{margin-left:auto}
  .hero{background:var(--white);border-radius:28px;padding:54px 48px 0;
    overflow:hidden}
  .hero .eyebrow{display:block;color:var(--cyan)}
  /* 글 폭을 좁게 잡으면 그 오른쪽이 빈 면으로 남는다. 면이 넓으면 글도
     그만큼 쓴다: 머리는 두 줄, 거드는 줄은 한 줄이다 */
  .hero h1{margin-top:20px;font-size:38px;line-height:1.32;letter-spacing:-.033em;
    font-weight:800;color:var(--ink);max-width:28ch;text-wrap:balance}
  .hero .lead{margin-top:18px;font-size:16.5px;max-width:62ch}
  .act{margin:38px -48px 0;background:var(--pale);padding:28px 48px 30px;
    display:flex;gap:20px;align-items:flex-start}
  .act .ic{flex:none;width:36px;height:36px;border-radius:12px;background:var(--navy);
    color:#fff;display:grid;place-items:center}
  .act .head{font-size:11.5px;font-weight:700;letter-spacing:.12em;color:var(--blue-ink)}
  .act h3{margin-top:7px;font-size:19px;font-weight:700;color:var(--navy);
    letter-spacing:-.015em}
  .act p{margin-top:8px;font-size:14.5px;color:var(--navy-2);max-width:62ch}
  .act .why{margin-top:10px;font-size:13.5px;color:var(--ink-2)}
  .mods{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
  .exp{grid-column:1/-1;background:var(--white);border-radius:22px;padding:32px 36px}
  .exp h2{margin-top:12px;font-size:21px;line-height:1.5;color:var(--ink);
    font-weight:700;letter-spacing:-.015em}
  .exp .tagrow{margin-top:18px}
  .mod{background:var(--white);border-radius:14px;padding:22px 24px}
  .mod h4{margin-top:8px;font-size:15px;font-weight:700;color:var(--ink)}
  .mod p{margin-top:6px;font-size:13.5px;color:var(--ink-3)}
  .link{margin-top:22px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;
    font-size:13.5px;color:var(--ink-3);padding:0 6px}
  @media(max-width:719px){
    .wrap{padding:18px 16px 52px}
    .top{flex-wrap:wrap;gap:4px;padding-bottom:14px}
    .top .ident{margin-left:0;width:100%}
    .hero{border-radius:22px;padding:34px 22px 0}
    .hero h1{font-size:28px;letter-spacing:-.028em;max-width:none}
    .hero .lead{font-size:15.5px;margin-top:14px}
    .act{margin:26px -22px 0;padding:22px 22px 24px;gap:14px}
    .act .ic{width:30px;height:30px;border-radius:10px}
    .mods{grid-template-columns:1fr;gap:12px;margin-top:12px}
    .exp{padding:24px 22px;border-radius:18px}
    .exp h2{font-size:18px}
  }`;
  const body = `<div class="wrap">
  <div class="top"><span class="school">${c.school}</span>
    <span class="dept">${c.dept}</span><span class="ident">${c.ident}</span></div>
  <header class="hero">
    <span class="eyebrow">${c.eyebrow}</span>
    <h1>${c.headline}</h1>
    <p class="lead">${c.lead}</p>
    <div class="act">
      <span class="ic">${CHECK}</span>
      <div><span class="head">지금 하면 좋은 일</span><h3>${c.actHead}</h3>
        <p>${c.actBrief}</p><p class="why">${c.actWhy}</p></div>
    </div>
  </header>
  <div class="mods">
    <section class="exp">
      <span class="label">내가 해본 경험</span>
      <h2>${c.expSentence}</h2>
      <ul class="tagrow">${c.expTags.map((t) => `<li class="tag">${t}</li>`).join("")}</ul>
    </section>
    <div class="mod"><span class="label">남긴 근거</span>
      <h4>${c.keptItems.join(" · ")}</h4><p>${c.keptNote}</p></div>
    <div class="mod"><span class="label">더 채울 부분</span>
      <h4>${c.gapItems.join(" · ")}</h4><p>${c.gapNeed}</p></div>
  </div>
  <p class="link"><span class="chip">${c.linkNames}</span> ${c.linkText}</p>
</div>`;
  return page(css, body);
}

async function main(): Promise<void> {
  const c = await content();
  mkdirSync(OUT, { recursive: true });
  const made: [string, string][] = [
    ["A", variantA(c)], ["B", variantB(c)], ["C", variantC(c)],
  ];
  console.log(`\n### 같은 글 (셋이 공유한다)`);
  console.log(`  머리글   ${c.headline}`);
  console.log(`  거드는 줄 ${c.lead}`);
  console.log(`  해본 경험 ${c.expSentence}`);
  console.log(`  분류     ${c.expTags.join(" · ")}`);
  console.log(`  할 일    ${c.actHead} / ${c.actBrief}`);
  console.log(`  남긴 근거 ${c.keptItems.join(" · ")}`);
  console.log(`  더 채울  ${c.gapItems.join(" · ")} / ${c.gapNeed}`);

  const browser = await chromium.launch();
  try {
    for (const [id, html] of made) {
      const f = `${OUT}/variant-${id}.html`;
      writeFileSync(f, html, "utf8");
      for (const [tag, w] of [["desktop", 1440], ["mobile", 390]] as const) {
        const p = await browser.newPage({ viewport: { width: w, height: 900 } });
        await p.goto(`file://${process.cwd()}/${f}`, { waitUntil: "load" });
        await p.waitForTimeout(250);
        /* **가로로 밀리면 그 자리에서 멈춘다.** 줄여 보내지 않는다 */
        const over = await p.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (over > 1) throw new Error(`Variant ${id} ${tag} 가로 넘침 ${over}px`);
        const file = `${OUT}/variant-${id}-${tag}.png`;
        await p.screenshot({ path: file, fullPage: true });
        mark(file);
        await p.close();
      }
    }
  } finally {
    await browser.close();
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e); process.exit(1);
});
