/**
 * **R6 문서판.** 쪽마다 고정된 카드 틀을 버리고, 글이 흘러가는 인쇄 문서 한 벌로 쓴다.
 *
 * 앞 판들(R5 · v9 다시 입힘)이 'AI 가 만든 문서' 로 읽힌 까닭을 세어 보면 넷이다
 * (`scripts/lab/gm_aitell.py`): 띄운 가운뎃점 · 화살표 · 동그라미 숫자 · 기호로 문장을
 * 대신하는 버릇, 쪽마다 되풀이되는 범례와 출처 꼬리표, 같은 틀의 카드가 쪽을 채우는
 * 모양, 그리고 반쯤 빈 채로 끝나는 고정 쪽. 그래서 이 판은
 *
 *  - 글이 흘러간다. 장만 새 쪽에서 시작하고, 나머지는 내용이 끝나는 자리에서 다음이 이어진다.
 *  - 범례와 한계는 앞에서 한 번 · 끝에서 한 번만 적는다. 쪽마다 붙이지 않는다.
 *  - 절은 보고서처럼 번호를 단다(Ⅰ · 1. · 가.). 카드 · 배지 · 아이콘 · 그라데이션을 쓰지 않는다.
 *  - 목록을 가운뎃점으로 잇지 않고 문장으로 잇는다. 화살표 대신 말로 잇는다.
 *
 * **새 판단을 만들지 않는다.** 묶음 · 단계 · 고른 문장은 결과 모델과 `Report3`/`Ed8` 의
 * 값 그대로이고, 문항 문면과 고른 보기는 문항 은행에서 읽는다. 지어낼 수 없는 칸(맡은 몫 ·
 * 수치 · 기간)은 비워 두고 학생이 채우게 한다. 기업 · 지역 기업 자료는 읽지 않는다.
 */
import type { ResultModel } from "../result/model";
import { domainName, itemOf, levelOptions, roleName, wordingOf, orgChoices, checklistFor } from "../runtime/session";
import { translateMenu } from "../student/translate";
import type { Report3 } from "./report3";
import type { Ed8 } from "./editorial8";
import { JUDGE, STEP, ZONE_SAID } from "./words";
import { industryPacks, rolePacks } from "./profile";
import { roleGuide } from "./guide";
import { domainDef } from "./analysis3";
import { SUBST9 } from "./render10";

const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** 마지막 한글 글자의 받침을 보고 조사를 붙인다(따옴표·괄호로 끝나도 안쪽 글자를 본다) */
const bat = (s: string) => { const m = String(s).match(/[가-힣](?=[^가-힣]*$)/); return m ? (m[0].charCodeAt(0) - 0xac00) % 28 !== 0 : false; };
const JO = { 을: ["을", "를"], 은: ["은", "는"], 이: ["이", "가"], 과: ["과", "와"], 이라: ["이라", "라"] } as const;
const J = (s: string, k: keyof typeof JO) => `${s}${JO[k][bat(s) ? 0 : 1]}`;

/** 학생 종이에 서지 않는 말(기업·공시 자료 · 점수처럼 읽히는 말)을 바꾼다. R5 긴 판의 표 위에 둘을 더한다 */
const SUBST12: [RegExp, string][] = [...SUBST9, [/추정 재무제표/g, "추정 손익과 현금 흐름 표"], [/재무제표/g, "재무 자료"], [/영업이익/g, "본업 이익"], [/\s*\(‘[^’]+’ 장\)/g, ""], [/‘[^’]+’ 장에 있습니다/g, "뒤의 장에 있습니다"], [/매출액/g, "매출"], [/\(KOSIS\)/g, ""]];
/** 데이터 문자열을 문서 말투로 고른다: 띄운 가운뎃점 · 화살표 · 대시 · 동그라미 숫자를 걷는다 */
export function plain(s: string): string {
  return SUBST12.reduce((a, [re, to]) => a.replace(re, to), String(s ?? ""))
    .replace(/\s*[①②③④⑤⑥⑦⑧⑨]\s*/g, " ")
    .replace(/\s+→\s+/g, ", ")
    .replace(/→/g, "")
    .replace(/\s+—\s+/g, ", ")
    .replace(/—/g, "")
    .replace(/\s+·\s+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();
}
const P = (s: string) => h(plain(s));
const q = (s: string) => `‘${plain(s).replace(/^‘|’$/g, "")}’`;
/** 목록을 문장으로 잇는다: A, B와 C */
function and(a: string[]): string {
  const x = a.map((s) => plain(s)).filter(Boolean);
  if (x.length <= 1) return x.join("");
  if (x.length === 2) return `${J(x[0], "과")} ${x[1]}`;
  return `${x.slice(0, -2).join(", ")}, ${J(x[x.length - 2], "과")} ${x[x.length - 1]}`;
}
const andQ = (a: string[]) => and(a.map((s) => q(s)));
/** ‘~다’ 로 끝나는 고른 문장을 문장 안에 넣을 꼴로: ~한 일 */
const deed = (s: string) => plain(s).replace(/했다$/, "한 일").replace(/었다$/, "은 일").replace(/았다$/, "은 일").replace(/다$/, "는 일");

/* ───────────────────────── 입력 ───────────────────────── */

export type RawResponse = { item_id: string; kind: string; value_int: number | null; value_text: string | null; answered_at?: string | Date | null; change_count?: number | null };
export type RawPick = { domain_code: string; slot: string; item_text: string };
export type Doc12 = {
  r: Report3; e: Ed8; model: ResultModel; core: string; stage: string;
  responses: RawResponse[]; picks: RawPick[]; fonts: { href: string };
  /** 차례의 쪽 번호. 첫 판은 비우고, 한 번 뽑은 뒤 머리글을 찾아 채운다 */
  pages?: Record<string, number>;
  /** 첫 판에서만 켠다: 머리글 자리에 보이지 않는 표식 글자를 넣어 몇 쪽인지 찾는다(자리를 차지하지 않는다) */
  marks?: boolean;
};

/* ───────────────────────── 응답 한 줄 ───────────────────────── */

export type AnswerRow = { id: string; group: string; q: string; a: string; td: string | null };
const GROUP_OF = (id: string, core: string): { group: string; td: string | null } => {
  let m: RegExpMatchArray | null;
  if ((m = id.match(/^G_(TD\d+)_/))) return { group: "열두 영역 훑기", td: m[1] };
  if (id.startsWith("CF_PAIR")) return { group: "둘 가운데 먼저 해 볼 영역", td: null };
  if (id.startsWith("CJ_")) return { group: "영역을 가리지 않고 묻는 판단", td: null };
  if (id.startsWith("UG_") || id.startsWith("GR_") || id.startsWith("MS_") || id.startsWith("PD_")) return { group: "학업 과정에서 겪은 장면", td: null };
  if (id.startsWith("CN_")) return { group: "같은 일을 두 번 묻는 문항", td: null };
  if ((m = id.match(/^(TD\d+)_J\d/))) return { group: `영역별 판단 · ${domainName(core, m[1])}`, td: m[1] };
  if (id.startsWith("ROLE_")) return { group: "직무 판단", td: null };
  if (id.startsWith("INDUSTRY_")) return { group: "산업 판단", td: null };
  if (id.startsWith("TR_")) return { group: "경험을 지원서 말로 옮기기", td: null };
  if (id.startsWith("TG_")) return { group: "고른 목표", td: null };
  return { group: "그 밖의 문항", td: null };
};

export function answerRows(core: string, stage: string, rows: RawResponse[]): AnswerRow[] {
  const lv = levelOptions(core);
  const inds = industryPacks(core), roles = rolePacks(core);
  return rows.map((x) => {
    const it = itemOf(core, x.item_id);
    const g = GROUP_OF(x.item_id, core);
    let qq = it ? wordingOf(core, x.item_id, stage) : x.item_id;
    if (it?.grid_row && it.grid_stem) qq = `${it.grid_row}, ${it.grid_stem}`;
    let a = "";
    if (x.kind === "skipped") a = "건너뜀";
    else if (x.kind === "level") a = (it?.options && it.options[x.value_int ?? 0]) || lv[x.value_int ?? 0] || String(x.value_int);
    else if (x.kind === "scale5" || x.kind === "exposure") {
      const vals = it?.option_values ?? [];
      const i = vals.findIndex((v) => v === x.value_int);
      a = i >= 0 && it?.options ? it.options[i] : x.value_int === null ? "잘 모르겠다" : String(x.value_int);
    } else if (x.kind === "choice") {
      const v = x.value_text ?? "";
      if (x.item_id.startsWith("TR_")) {
        const menu = translateMenu(core, x.item_id);
        const n = Number(v.replace(/^S/, "")) - 1;
        a = menu?.options[n] ?? v;
      } else if (/^TD\d+$/.test(v)) a = domainName(core, v);
      else if (v.startsWith("ROLE_")) a = roles.find((r) => r.code === v)?.name_ko ?? roleName(core, v);
      else if (v.startsWith("INDUSTRY_")) a = inds.find((p) => p.code === v)?.name_ko ?? v;
      else if (/^OC\d+$/.test(v)) a = orgChoices(core).find((o) => o.code === v)?.name ?? v;
      else a = v;
    }
    return { id: x.item_id, group: g.group, q: plain(qq), a: plain(a), td: g.td };
  });
}

/* ───────────────────────── 말 ───────────────────────── */

const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ"];
const KO_LIST = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];
const COVER_WORD: Record<string, string> = { strong: "스스로 맡아 해 봤다고 답함", partial: "다른 사람이 정한 조건 안에서 해 봄", none: "해 본 적 없다고 답함", unasked: "이번에 묻지 않음" };
const LEVEL_SHORT = ["해 본 적 없음", "조건 안에서 해 봄", "스스로 해 봄", "기준까지 직접 정함"];
const BAND_SAID: Record<string, string> = { HIGH: "높게", MID: "보통으로", LOW: "낮게" };

/* ───────────────────────── 쪽 조각 ───────────────────────── */

type Sec = { id: string; title: string; level: 1 | 2 };
class Book {
  out: string[] = [];
  toc: Sec[] = [];
  ch = 0; sec = 0;
  constructor(public pages: Record<string, number> = {}, public marks = false) {}
  mk(id: string) { return `<span class="mk">${this.marks ? `[[${id}]]` : ""}</span>`; }
  apx = 0;
  chapter(title: string, intro: string, appendix = false) {
    this.ch++; this.sec = 0;
    const id = `c${this.ch}`;
    const no = appendix ? `부록 ${KO_LIST[this.apx++]}` : ROMAN[this.ch - 1];
    this.toc.push({ id, title: appendix ? `${no}. ${title}` : `${no}. ${title}`, level: 1 });
    this.out.push(`<section class="ch" id="${id}"><div class="chn">${no}</div><h1>${this.mk(id)}${h(title)}</h1><p class="chi">${P(intro)}</p>`);
  }
  end() { this.out.push(`</section>`); }
  h2(title: string) {
    this.sec++;
    const id = `c${this.ch}s${this.sec}`;
    this.toc.push({ id, title: `${this.sec}. ${title}`, level: 2 });
    this.out.push(`<h2>${this.mk(id)}<span>${this.sec}.</span>${h(title)}</h2>`);
  }
  h3(i: number, title: string) { this.out.push(`<h3><span>${KO_LIST[i] ?? i + 1}.</span>${h(title)}</h3>`); }
  /** 같은 문장을 두 번 적지 않는다(스무 자 넘는 문장만 센다). 사람이 고쳐 읽을 때 지우는 자리다 */
  said = new Set<string>();
  keep(s: string): string {
    return plain(s).split(/(?<=[.?!])\s+/).filter((x) => { const k = x.trim(); if (k.length < 20 || /‘|“/.test(k)) return true; if (this.said.has(k)) return false; this.said.add(k); return true; }).join(" ");
  }
  p(s: string, cls = "") { const t = this.keep(s); if (t) this.out.push(`<p${cls ? ` class="${cls}"` : ""}>${h(t)}</p>`); }
  raw(s: string) { this.out.push(s); }
  note(s: string) { const t = this.keep(s); if (t) this.out.push(`<p class="nt">${h(t)}</p>`); }
  table(head: string[], rows: string[][], cls = "") {
    if (!rows.length) return;
    this.out.push(`<table class="tb ${cls}"><thead><tr>${head.map((x) => `<th>${h(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
  }
  dl(rows: [string, string][]) {
    const rs = rows.filter(([, v]) => plain(v));
    if (!rs.length) return;
    this.out.push(`<dl class="dl">${rs.map(([k, v]) => `<dt>${h(k)}</dt><dd>${P(v)}</dd>`).join("")}</dl>`);
  }
  ol(items: string[]) { const xs = items.map(plain).filter(Boolean); if (xs.length) this.out.push(`<ol class="ol">${xs.map((x) => `<li>${h(x)}</li>`).join("")}</ol>`); }
  lines(n: number, label = "") { this.out.push(`<div class="wr">${label ? `<div class="wrl">${h(label)}</div>` : ""}${"<i></i>".repeat(n)}</div>`); }
}

/* ───────────────────────── 표지 · 앞쪽 ───────────────────────── */

function cover(d: Doc12): string {
  const e = d.e, w = e.who;
  const year = (w.answeredOn || "").slice(0, 4) || "2026";
  const rows: [string, string][] = [
    ["학과", `${w.department}${w.specialization ? `, ${w.specialization}` : ""}`],
    ["응답일", w.answeredOn],
    ["목표로 고른 직무", e.goal.role],
    ["이 리포트의 바탕", "학생이 검사에서 고른 답과, 내 CareerMatri 에 직접 적은 경험 기록"],
  ];
  return `<section class="cover">
  <div class="cvl"><div class="cvs">${h(w.school)}<em>${h(w.school === "배재대학교" ? "PAI CHAI UNIVERSITY" : "")}</em></div>
    <div class="cvt"><span>${h(year)}학년도</span>진로·직무<br>리포트</div><div class="cvr"></div>
    <div class="cvb">CareerMatri</div></div>
  <div class="cvd"><h2>${h(w.department)} 학생에게 드리는 리포트</h2>
    ${rows.map(([k, v]) => `<div class="cvrow"><b>${h(k)}</b><span>${P(v)}</span></div>`).join("")}
    <p class="cvn">이 리포트는 점수나 순위를 내지 않습니다. 다른 학생과 견주지 않고, 채용 결과를 예측하지 않습니다.</p></div>
</section>`;
}

function about(d: Doc12, b: Book) {
  const r = d.r, e = d.e;
  const n = d.responses.length, picks = r.profile.picks, recs = r.records.length;
  b.raw(`<section class="fr" id="about"><h1 class="frh">${b.mk("about")}이 리포트를 읽기 전에</h1>`);
  b.p(`${e.who.department} 학생이 ${e.who.answeredOn}에 답한 검사 결과를 정리한 리포트입니다. 검사에서 답한 문항은 ${n}개이고, 체크리스트에서 고른 항목은 ${picks}개입니다. 내 CareerMatri 에 적어 둔 경험 기록은 ${recs ? `${recs}건이며, 이것도 함께 읽었습니다` : "아직 없습니다"}.`);
  b.p(`검사가 묻는 것은 무엇을 좋아하는가보다 무엇을 해 봤고 그 안에서 무엇을 직접 정했는가입니다. 그래서 이 리포트에 나오는 판단은 모두 학생이 고른 답에서 온 것입니다. 결과물이 얼마나 잘 만들어졌는지, 실제 성과 수치가 얼마였는지는 검사로 확인할 수 없어서 적지 않았습니다. 그런 칸은 비워 두었으니 기록을 보며 직접 채워 주세요.`);
  b.p(`본문에서 자주 쓰는 말이 몇 가지 있습니다. ‘영역’은 경영 일을 열두 갈래로 나눈 것이고, ‘판단’은 한 영역 안에서 일이 흘러가는 여덟 자리입니다. 같은 판단이라도 어디까지 해 봤는지를 네 단계로 나누어 물었습니다. 낱말 풀이는 부록에 모아 두었습니다.`);
  b.table(["단계", "학생이 고른 보기", "이 리포트에서 쓰는 말"], ([0, 1, 2, 3] as const).map((i) => [String(i + 1), h(levelOptions(d.core)[i] ?? ""), h(STEP[i].tag)]));
  b.p(`이 판에는 회사별 자료를 읽는 쪽을 넣지 않았습니다. 회사 자료를 학생에게 내보낼 권리와 원문 확인이 끝나지 않아서입니다. 직무 설명은 특정 회사가 아니라 그 직무 일반의 이야기입니다.`, "sm");
  b.raw(`</section>`);
}

function tocPage(b: Book, pages: Record<string, number>): string {
  const rows = b.toc.map((s) => `<li class="l${s.level}"><span>${h(s.title)}</span><i></i><b>${pages[s.id] ?? ""}</b></li>`).join("");
  return `<section class="fr toc"><h1 class="frh">차례</h1><ol class="tocl">${rows}</ol></section>`;
}

/* ───────────────────────── 본문 장 ───────────────────────── */

function chSummary(d: Doc12, b: Book) {
  const r = d.r, e = d.e;
  b.chapter("요약", "검사 결과 전체를 먼저 한자리에 모았습니다. 자세한 근거는 뒤의 장마다 따로 적었습니다.");
  b.h2("이 결과를 한 문단으로 줄이면");
  b.p(r.summary.lead);
  b.p(r.profile.lead);
  b.p(e.styleLine ? `판단 여덟 자리를 한 줄로 줄이면 이렇습니다. ${e.styleLine}` : "");
  b.h2("확인된 것과 아직 확인되지 않은 것");
  r.summary.points.forEach((pt, i) => {
    b.h3(i, pt.label.replace("가장 분명한 강점", "가장 분명하게 확인된 것"));
    b.p(pt.fact);
    b.p(pt.meaning);
    b.dl([["읽을 때 주의할 것", pt.limit], ["해 볼 일", pt.action]]);
  });
  b.h2("앞으로 90일 동안 할 일");
  b.p(`할 일을 많이 늘어놓지 않고 세 가지로 줄였습니다. 첫 번째부터 차례로 하면 되고, 하나를 끝낼 때마다 결과물을 경험 기록에 더해 두면 다음 검사에서 그 내용이 다시 읽힙니다.`);
  b.table(["때", "할 일", "왜 이것부터인가"], r.final.map((f) => [h(f.when), P(f.text), P(f.why)]));
  b.end();
}

function chOverview(d: Doc12, b: Book, rows: AnswerRow[]) {
  const r = d.r, e = d.e, core = d.core;
  b.chapter("응답 전체 그림", "열두 영역을 훑은 답과, 영역마다 여덟 판단을 어디까지 해 봤는지를 표로 옮겼습니다.");
  b.h2("열두 영역에서 고른 관심과 경험");
  b.p(`검사의 첫 부분에서는 경영 일 열두 갈래를 한 줄씩 보여 드리고, 해 보고 싶은 정도와 해 본 횟수와 배워 보고 싶은 정도를 물었습니다. 아래 표의 글은 학생이 실제로 고른 보기 그대로입니다.`);
  const grid = (td: string, k: string) => rows.find((x) => x.id === `G_${td}_${k}`)?.a ?? "";
  b.table(["영역", "해 보고 싶다", "해 본 적", "배워 보고 싶다", "이 리포트의 분류"],
    r.map.map((m) => [`<b>${h(m.name)}</b>`, h(grid(m.code, "INT")), h(grid(m.code, "EXP")), h(grid(m.code, "LEA")), h(ZONE_SAID[m.zone]?.tag ?? "")]), "grid");
  const hi = r.map.filter((m) => m.interest === "HIGH");
  const deep = r.domains.filter((x) => x.askedHow === "DEEP");
  b.p(`관심을 높게 고른 영역은 ${hi.length ? and(hi.map((m) => m.name)) : "없습니다"}${hi.length ? "입니다" : ""}. 이 가운데 ${deep.length ? `${and(deep.map((x) => x.name))}에서는 판단을 자세히 물었습니다` : "판단을 자세히 물은 영역은 없습니다"}. 관심이 높은데도 자세히 묻지 않은 영역은 뒤의 장에서 ‘관심만 확인된 영역’으로 따로 적었습니다.`);
  b.h2("관심, 경험, 배울 뜻이 서로 다른 영역");
  const v = (td: string, k: string) => d.responses.find((x) => x.item_id === `G_${td}_${k}`)?.value_int ?? null;
  const pats: { name: string; kind: string; read: string }[] = [];
  for (const m of r.map) {
    const I = v(m.code, "INT"), E = v(m.code, "EXP"), L = v(m.code, "LEA");
    if (I !== null && I >= 4 && E === 0) pats.push({ name: m.name, kind: "끌리지만 아직 해 보지 않음", read: "수업 과제 하나로 짧게 겪어 보면 관심이 실제 일에서도 이어지는지 알 수 있습니다." });
    else if (I !== null && I <= 2 && E === 2) pats.push({ name: m.name, kind: "여러 번 해 봤지만 끌리지 않음", read: "해 본 경험은 지원서의 재료가 되지만, 직무를 고를 때는 이 영역이 중심인 자리를 피하는 편이 맞을 수 있습니다." });
    else if (I !== null && I >= 4 && L !== null && L <= 2) pats.push({ name: m.name, kind: "관심은 높은데 배울 뜻은 낮음", read: "일 자체보다 그 일의 결과에 끌리는 것일 수 있습니다. 실제로 이 영역의 하루가 어떤지 먼저 알아보세요." });
    else if (L !== null && L >= 4 && I !== null && I <= 3) pats.push({ name: m.name, kind: "배울 뜻이 관심보다 앞섬", read: "지금은 끌림보다 필요를 느끼는 영역입니다. 목표 직무에서 이 영역을 얼마나 쓰는지 확인하면 우선순위가 정해집니다." });
  }
  if (pats.length) {
    b.p(`세 줄의 답이 늘 같은 방향을 가리키지는 않습니다. 서로 갈리는 영역을 모았습니다. 갈린다는 것이 잘못 답했다는 뜻은 아니고, 진로를 고를 때 따로 생각해 볼 자리라는 뜻입니다.`);
    b.table(["영역", "어떻게 갈렸나", "생각해 볼 것"], pats.map((x) => [`<b>${h(x.name)}</b>`, h(x.kind), P(x.read)]));
  } else b.p(`열두 영역 모두에서 해 보고 싶은 정도와 해 본 횟수와 배워 보고 싶은 정도가 크게 갈리지 않았습니다. 관심이 있는 곳에서 해 봤고, 배울 뜻도 같은 쪽을 가리킵니다.`);
  b.h2("여덟 판단을 어디까지 해 봤는가");
  b.p(`자세히 물은 영역마다 일이 흘러가는 여덟 자리를 하나씩 물었습니다. 칸에 적은 말은 네 단계 가운데 학생이 고른 단계입니다. 묻지 않은 칸은 비워 두었습니다. 비어 있다는 것이 ‘해 본 적 없음’이라는 뜻은 아닙니다.`);
  const asked = r.domains.filter((x) => x.levels.some((l) => l.level !== null));
  if (asked.length) b.table(["판단", ...asked.map((x) => x.name)], (Object.keys(JUDGE) as (keyof typeof JUDGE)[]).map((a) => [
    `<b>${h(JUDGE[a].name)}</b>`, ...asked.map((x) => { const l = x.levels.find((y) => y.axis === a)?.level; return l === null || l === undefined ? "" : h(LEVEL_SHORT[l]); })]), "mx");
  for (const p of r.profile.paragraphs) b.p(p);
  b.note(r.profile.evidenceLine);
  b.h2("이번 응답에 대하여");
  const ts = d.responses.map((x) => (x.answered_at ? new Date(x.answered_at).getTime() : NaN)).filter((x) => !Number.isNaN(x)).sort((a, z) => a - z);
  const mins = ts.length > 1 ? Math.round((ts[ts.length - 1] - ts[0]) / 60000) : null;
  const unsure = rows.filter((x) => x.a === "잘 모르겠다").length;
  const changed = d.responses.filter((x) => (x.change_count ?? 0) > 0).length;
  const skipped = d.responses.filter((x) => x.kind === "skipped").length;
  b.p(`이번 검사에서는 문항 ${d.responses.length}개에 답했습니다.${mins !== null && mins > 0 && mins < 600 ? ` 첫 답부터 마지막 답까지 약 ${mins}분이 걸렸습니다.` : ""} ‘잘 모르겠다’를 고른 문항은 ${unsure ? `${unsure}개` : "없었고"}${unsure ? "였고" : ""}, 건너뛴 문항은 ${skipped ? `${skipped}개입니다` : "없습니다"}. 한 번 고른 답을 다시 바꾼 문항은 ${changed ? `${changed}개입니다` : "없습니다"}.`);
  b.p(`답을 바꾼 문항이 있다는 것은 문항을 다시 읽고 생각했다는 뜻이고, 결과를 읽는 데 문제가 되지 않습니다. ‘잘 모르겠다’를 고른 문항은 그 영역의 관심을 ‘보통’으로 셈하지 않고 따로 두었습니다.`);
  b.h2("판단마다 무엇을 물었는가");
  b.p(`여덟 판단은 경영 일 어디에서나 나오는 자리입니다. 같은 판단이 영역마다 다른 모습으로 나타나기 때문에, 문항도 영역에 맞춰 바꿔 물었습니다. 아래는 판단마다 뜻과 경영 일에서 흔히 보이는 장면입니다.`);
  b.table(["판단", "뜻", "흔히 보이는 장면"], (Object.keys(JUDGE) as (keyof typeof JUDGE)[]).map((a) => [`<b>${h(JUDGE[a].name)}</b>`, P(JUDGE[a].plain), P(JUDGE[a].scene)]));
  b.h2("먼저 해 볼 영역을 고른 문항");
  const pairs = rows.filter((x) => x.id.startsWith("CF_PAIR"));
  if (pairs.length) {
    b.p(`관심이 비슷하게 나온 영역 둘을 맞세우고, 하나만 먼저 해 본다면 어느 쪽인지 물었습니다. ${pairs.map((x, i) => `${i ? "다음 물음에서는 " : ""}${J(q(x.a), "을")} 골랐습니다`).join(". ")}.`);
  } else b.p(`관심이 비슷한 영역을 맞세우는 문항은 이번에 나오지 않았습니다.`);
  b.end();
}

function domainSection(d: Doc12, b: Book, dom: Report3["domains"][number], rows: AnswerRow[]) {
  const core = d.core;
  b.h2(dom.name);
  const grid = (k: string) => rows.find((x) => x.id === `G_${dom.code}_${k}`)?.a ?? "";
  const zs = ZONE_SAID[dom.zone];
  b.p(`이 영역의 줄에서 해 보고 싶은 정도로 ${q(grid("INT"))}, 해 본 횟수로 ${J(q(grid("EXP")), "을")} 골랐습니다. ${zs ? `그래서 이 리포트는 ${J(dom.name, "을")} ‘${zs.tag}’로 봅니다. ${J(zs.said, "이라")}는 뜻입니다.` : ""}`);
  b.p(dom.headline);

  b.h3(0, "이 영역의 일이 흘러가는 차례");
  b.table(["차례", "그 자리에서 하는 일", "고른 답"], dom.flow.map((f) => [h(String(f.step)), `<b>${h(f.name)}</b><br>${P(f.detail)}`, h(COVER_WORD[f.cover] ?? "")]), "flow");

  b.h3(1, "판단마다 물은 문항과 고른 답");
  const mine = rows.filter((x) => x.td === dom.code && /_J\d/.test(x.id));
  if (mine.length) {
    const byAx = (id: string) => (id.match(/_(J\d)_/)?.[1] ?? "J1") as keyof typeof JUDGE;
    b.table(["판단", "문항", "고른 답"], mine.map((x) => [h(JUDGE[byAx(x.id)]?.name ?? ""), h(x.q), `<b>${h(x.a)}</b>`]), "qa");
  } else b.p(`이 영역은 판단을 하나하나 묻지 않았습니다. 열두 영역을 훑는 줄의 답만 있습니다.`);

  b.h3(2, "체크리스트에서 고른 장면");
  const parts: string[] = [];
  if (dom.decisions.length) parts.push(`직접 정했다고 고른 장면은 ${andQ(dom.decisions)}입니다.`);
  if (dom.acts.length) parts.push(`스스로 해 봤다고 고른 장면은 ${andQ(dom.acts)}입니다.`);
  if (dom.artifacts.length) parts.push(`그때 남긴 자료로는 ${J(and(dom.artifacts), "을")} 골랐습니다.`);
  else parts.push(`남긴 자료는 아직 고르지 않았습니다.`);
  if (dom.comparisons.length) parts.push(`결과를 맞춰 본 대상으로는 ${J(and(dom.comparisons), "을")} 골랐습니다.`);
  else parts.push(`결과를 무엇과 맞춰 봤는지는 고르지 않았습니다.`);
  b.p(parts.join(" "));

  const def = domainDef(core, dom.code) as (ReturnType<typeof domainDef> & { tools?: string[]; org_outcomes?: Record<string, string> }) | undefined;
  if (def?.axes) {
    b.h3(3, "판단마다 한 단계 더 가면");
    b.p(`같은 판단이라도 스스로 해 본 것과 기준까지 정해 결과가 쓰인 것은 다릅니다. 고른 단계 옆에 이 영역에서 두 단계가 각각 어떤 모습인지 적었습니다. 다음 과제에서 노려 볼 칸은 지금 고른 단계의 바로 위 칸입니다.`);
    b.table(["판단", "고른 단계", "스스로 해 본 모습", "기준까지 정한 모습"], dom.levels.map((l) => {
      const ax = def.axes[l.axis as keyof typeof def.axes];
      return [`<b>${h(l.name)}</b>`, h(l.level === null ? "묻지 않음" : LEVEL_SHORT[l.level]), l.level !== null && l.level < 2 ? `<b>${P(ax?.l2 ?? "")}</b>` : P(ax?.l2 ?? ""), l.level === 2 ? `<b>${P(ax?.l3 ?? "")}</b>` : P(ax?.l3 ?? "")];
    }), "lv");
    b.note(`굵게 적은 칸이 지금 고른 단계 바로 위의 모습입니다.`);
  }
  b.h3(4, "이 답으로 말할 수 있는 것");
  for (const m of dom.meaning) b.p(m);
  b.h3(5, "아직 말할 수 없는 것");
  for (const l of dom.limits) if (!l.startsWith("이 해설은")) b.p(l);
  if (def?.tools?.length || def?.org_outcomes) {
    b.h3(6, "이 영역에서 쓰는 도구와 일하는 곳에 따른 차이");
    if (def.tools?.length) b.p(`이 영역에서 자주 쓰는 도구는 ${and(def.tools)}입니다. 결과를 맞춰 보는 대상으로는 ${and(def.verify_targets ?? [])}이 흔히 쓰입니다.`.replace(/이 흔히/, (bat(and(def.verify_targets ?? [])) ? "이" : "가") + " 흔히"));
    if (def.org_outcomes) {
      const oc = d.model.targets?.goal?.org ?? null;
      const names = orgChoices(core);
      b.p(`같은 일이라도 어떤 조직에서 하느냐에 따라 결과가 돌아오는 모양이 달라집니다.`);
      b.table(["일하는 곳", "이 영역의 일이 돌아오는 모양"], Object.entries(def.org_outcomes).map(([k, v]) => [`<b>${h(names.find((n) => n.code === k)?.name ?? k)}</b>${k === oc ? " (고른 곳)" : ""}`, P(v)]));
    }
  }

  if (dom.develop.length || dom.developNote) {
    b.h3(7, "다음 과제에서 해 볼 일");
    b.table(["판단", "어떻게 해 보나", "남길 것"], dom.develop.map((x) => [`<b>${P(x.what)}</b>`, P(x.how), P(x.output)]), "dev");
    if (dom.developNote) b.note(dom.developNote);
  }
  if (dom.jobs.length) {
    b.h3(8, "이 영역을 많이 쓰는 직무");
    b.p(dom.jobs.map((x) => `${J(x.name, "은")} ${J(plain(x.work), "을")} 맡습니다.`).join(" "));
  }
}

function chDomains(d: Doc12, b: Book, rows: AnswerRow[]) {
  const r = d.r;
  const deep = r.domains.filter((x) => x.askedHow !== "NONE");
  const rest = r.domains.filter((x) => x.askedHow === "NONE");
  b.chapter("영역별 기록", `판단을 자세히 물은 영역 ${deep.length}곳을 하나씩 풀었습니다. 영역마다 같은 차례로 적었습니다. 먼저 그 영역의 일이 흘러가는 차례와 자리마다 고른 답을 보이고, 이어서 물은 문항과 고른 보기, 체크리스트에서 고른 장면을 옮긴 다음, 그 답으로 말할 수 있는 것과 아직 말할 수 없는 것을 나눴습니다.`);
  for (const dom of deep) domainSection(d, b, dom, rows);
  if (rest.length) {
    b.h2("관심만 확인된 영역");
    b.p(`아래 영역은 관심을 높게 골랐지만 이번 검사에서 판단을 자세히 묻지 않았습니다. 그래서 할 수 있는 말이 관심의 크기와 해 본 횟수까지입니다.`);
    rest.forEach((dom, i) => {
      const grid = (k: string) => rows.find((x) => x.id === `G_${dom.code}_${k}`)?.a ?? "";
      b.h3(i, dom.name);
      b.p(`해 보고 싶은 정도는 ${q(grid("INT"))}, 해 본 횟수는 ${q(grid("EXP"))}, 배워 보고 싶은 정도는 ${q(grid("LEA"))}입니다.${dom.records.length ? ` 경험 기록 ${andQ(dom.records)}도 이 영역을 가리킵니다.` : ""} 다음 검사에서 이 영역을 깊게 묻는 등급을 고르면, 여덟 판단을 하나씩 확인할 수 있습니다.`);
      if (dom.flow.length) {
        b.p(`이 영역의 일이 어떻게 흘러가는지 적어 둡니다. 이번에 묻지 않았으니 고른 답 칸은 없습니다.`);
        b.table(["차례", "이름", "그 자리에서 하는 일"], dom.flow.map((f) => [h(String(f.step)), `<b>${h(f.name)}</b>`, P(f.detail)]), "flow2");
      }
      const def = domainDef(d.core, dom.code);
      if (def?.axes) {
        b.p(`이 영역에서 여덟 판단은 아래 같은 모습으로 나타납니다. 다음 검사 전에 이 가운데 해 본 장면이 있는지 떠올려 두면, 그때 답하기가 쉽습니다.`);
        b.table(["판단", "스스로 해 본 모습", "기준까지 정한 모습"], (Object.keys(JUDGE) as (keyof typeof JUDGE)[]).map((a) => [`<b>${h(JUDGE[a].name)}</b>`, P(def.axes[a]?.l2 ?? ""), P(def.axes[a]?.l3 ?? "")]), "lv2");
      }
    });
  }
  b.end();
}

function chRecords(d: Doc12, b: Book) {
  const r = d.r, e = d.e;
  b.chapter("경험 기록과 검사 응답", r.records.length ? "내 CareerMatri 에 적어 둔 경험 기록을 한 건씩 읽고, 검사 응답과 같은 곳을 가리키는지 맞춰 봤습니다." : "아직 적어 둔 경험 기록이 없습니다. 이 장에는 기록을 적을 때 쓸 칸과 순서를 남겼습니다.");
  r.records.forEach((x) => {
    b.h2(x.title.split(" — ")[0]);
    b.p(`${x.title.includes(" — ") ? `${J(plain(x.title.split(" — ")[1]), "을")} 다룬 ` : ""}${x.kind}입니다. 기간은 ${x.period}로 적혀 있습니다. ${plain(x.purpose)}`);
    b.p(x.role);
    b.dl([
      ["다룬 문제", x.problems.length ? andQ(x.problems) : "적혀 있지 않음"],
      ["직접 정한 것", x.decisions.length ? andQ(x.decisions) : "적혀 있지 않음"],
      ["남긴 결과물", x.artifacts.length ? and(x.artifacts) : "적혀 있지 않음"],
      ["견준 대상", x.comparisons.length ? and(x.comparisons) : "적혀 있지 않음"],
    ]);
    for (const t of x.testSays) b.p(`${t.domain}에 대해 검사 응답은 이렇게 말합니다. ${plain(t.text)}`);
    for (const jb of x.jobs) b.p(jb.why);
    b.p(x.application);
    if (x.check.length) { b.p(`면접 전에 이 기록에 채워 둘 것은 다음과 같습니다.`); b.ol(x.check); }
    const ch = e.chains.find((c) => c.title === x.title);
    if (ch) {
      b.p(`이 기록을 다섯 칸으로 나누어 보면 아래와 같습니다. 비어 있는 칸에는 무엇을 적으면 되는지 적어 두었습니다.`);
      b.table(["칸", "기록에 있는 것", "비어 있으면 적을 것"], ch.rows.map((rw) => [`<b>${h(rw.label)}</b>`, rw.items.length ? P(rw.items.join(", ")) : `<span class="bl">비어 있음</span>`, rw.items.length ? "" : P(rw.empty)]));
    }
  });
  if (r.cross.length) {
    b.h2("검사와 기록이 같은 곳을 가리키는가");
    b.p(`영역마다 검사 응답과 경험 기록을 나란히 놓았습니다. 둘이 같은 곳을 가리키면 면접에서 그 기록을 장면으로 쓸 수 있고, 한쪽만 있으면 다른 쪽을 채우는 것이 다음 일입니다.`);
    b.table(["영역", "검사 응답", "경험 기록", "읽은 결과"], r.cross.map((c) => [`<b>${h(c.name)}</b>`, P(c.test), P(c.record), P(c.reading)]));
    for (const c of r.cross) if (c.verify) b.note(`${c.name}: ${c.verify}`);
  }
  if (!r.records.length) {
    b.h2("첫 경험 기록을 적는 순서");
    b.p(`수업 과제나 팀 프로젝트 하나를 골라 아래 네 칸을 채우면 됩니다. 길게 쓰지 않아도 됩니다. 칸마다 한 줄이면 검사 응답과 맞춰 볼 수 있습니다.`);
    b.ol(["어떤 수업·활동이었고, 팀에서 무엇을 맡았는지", "그 안에서 내가 직접 정한 것 하나", "남긴 자료의 이름(파일 이름 그대로)", "결과를 무엇과 견줬는지"]);
  }
  b.end();
}

function roleDetail(b: Book, code: string, name: string, full: boolean) {
  const gd = roleGuide(code);
  if (!gd) return;
  if (full) b.h2(`${name} 담당자가 맡는 일과 쓰는 것`);
  if (gd.responsibilities?.length) { b.p(`${J(name, "이")} 맡는 일을 꼽으면 다음과 같습니다.`); b.ol(gd.responsibilities); }
  if (gd.process?.length) b.table(["일의 차례", "하는 일"], gd.process.map((x) => [`<b>${h(x.step)}</b>`, P(x.what)]));
  b.dl([["알아 두면 좋은 지식", and(gd.knowledge ?? [])], ["자주 쓰는 도구", and(gd.tools ?? [])], ["학생 때 해 볼 수 있는 경험", and(gd.experiences ?? [])], ["첫 자리에 들어가는 길", and(gd.entry ?? [])]]);
  if (gd.learnOrder?.length) { b.h3(0, `${name}을 배우는 차례`.replace(/(\S+)을 배우는/, (_m, w) => `${J(w, "을")} 배우는`)); b.table(["차례", "무엇을", "왜"], gd.learnOrder.map((x, i) => [String(i + 1), `<b>${h(x.step)}</b>`, P(x.why)])); }
  const pr = Object.entries(gd.practice ?? {}).filter(([a]) => a in JUDGE);
  if (pr.length) {
    b.h3(1, "판단마다 학생 때 연습해 볼 과제");
    b.p(`${J(name, "이")} 매일 하는 판단을 수업이나 팀 과제에서 미리 해 보는 방법입니다. ${plain(gd.practiceWhere ?? "")} 하기 좋습니다.`.replace(/ 하기 좋습니다\.$/, gd.practiceWhere ? " 하기 좋습니다." : ""));
    b.table(["판단", "해 볼 일", "남길 것", "다 했는지 보는 법"], pr.map(([a, x]) => [`<b>${h(JUDGE[a as keyof typeof JUDGE].name)}</b>`, P(x.task), P(x.output), P(x.check)]), "pr");
  }
  if (full && gd.portfolio?.length) { b.h3(2, "포트폴리오에 흔히 넣는 것"); b.ol(gd.portfolio); }
  if (full && gd.postingCheck?.length) { b.h3(3, "채용 공고를 읽을 때 확인할 것"); b.p(`공고마다 같은 직무 이름으로 다른 일을 묻는 경우가 많습니다. 공고를 볼 때 아래를 먼저 확인하세요.`); b.ol(gd.postingCheck); }
  if (gd.watch) b.note(gd.watch);
}

function chJobs(d: Doc12, b: Book) {
  const r = d.r, e = d.e, core = d.core;
  b.chapter("직무", `목표로 고른 직무 ${J(e.goal.role, "을")} 먼저 자세히 보고, 이어서 비교해 볼 직무와 이 학과에서 이어지는 다른 직무를 적었습니다.`);
  const goal = r.directions.find((x) => x.goal) ?? r.directions[0];
  const view = e.roles.find((x) => x.target) ?? e.roles[0];
  if (goal) {
    b.h2(`${J(goal.name, "은")} 어떤 일을 하는가`);
    const g = (view?.guide ?? {}) as { line?: string; cycle?: { phase: string; scene: string; input: string; decide: string; with: string; output: string }[] };
    if (g.line) b.p(g.line);
    if (goal.guide?.summary) b.p(`한 줄로 말하면 ${plain(goal.guide.summary)}입니다.`);
    if (g.cycle?.length) {
      b.p(`아래는 ${goal.name} 담당자의 한 주기를 장면으로 적은 것입니다. 특정 회사의 이야기가 아니라 이 직무에서 흔히 일어나는 흐름입니다.`);
      g.cycle.forEach((c, i) => { b.h3(i, c.phase); b.p(c.scene); b.dl([["손에 들어오는 것", c.input], ["여기서 정하는 것", c.decide], ["함께 일하는 사람", c.with], ["남기는 것", c.output]]); });
    }
    roleDetail(b, goal.code, goal.name, true);
    b.h2(`지금 응답으로 본 ${goal.name} 준비 상태`);
    b.p(`이 리포트는 목표 직무의 핵심 판단을 기준으로 준비 상태를 세 가지로 나눕니다. 지금은 ‘${goal.readiness}’입니다. ${plain(goal.summary)}`);
    if (goal.have.length) { b.p(`이미 응답에서 보이는 것은 다음과 같습니다.`); b.table(["영역", "확인된 것"], goal.have.map((x) => [h(x.domain), P(x.text)])); }
    if (goal.need.length) { b.p(`아직 채워야 할 것은 다음과 같습니다.`); b.table(["채울 것", "왜 필요한가"], goal.need.map((x) => [`<b>${h(x.name)}</b>`, P(x.why)])); }
    if (goal.differs.length) { b.p(`비슷해 보이는 직무와 다른 점도 적어 둡니다.`); b.ol(goal.differs); }
  }
  if (e.versus) {
    b.h2(`${J(e.versus.a.name, "과")} ${J(e.versus.b.name, "을")} 견주면`);
    b.p(e.versus.call);
    b.ol(e.versus.why);
  }
  const others = r.directions.filter((x) => x !== goal);
  if (others.length) {
    b.p(`목표 직무 말고도 응답에서 함께 걸린 직무가 있습니다. 진로를 하나로 좁히기 전에 견주어 보도록 같은 차례로 적었습니다.`);
    others.forEach((x) => {
      b.h2(`함께 볼 직무: ${x.name}`);
      b.p(`${plain(x.owns)} 지금 응답으로 보면 ‘${x.readiness}’입니다. ${plain(x.summary)}`);
      if (x.have.length) b.table(["영역", "응답에서 보이는 것"], x.have.map((y) => [h(y.domain), P(y.text)]));
      if (x.need.length) b.p(`이 직무로 가려면 ${J(and(x.need.map((n) => n.name)), "을")} 더 채워야 합니다.`);
      roleDetail(b, x.code, x.name, false);
    });
  }
  if (r.directions.length > 1) {
    b.h2("직무를 나란히 놓고 보면");
    b.p(`응답에서 걸린 직무를 한 표에 놓았습니다. 직무마다 무엇을 맡고 지금 무엇을 더 채워야 하는지가 다릅니다.`);
    b.table(["", ...r.directions.map((x) => x.name)], [
      ["<b>맡는 일</b>", ...r.directions.map((x) => P(x.owns))],
      ["<b>지금 준비 상태</b>", ...r.directions.map((x) => h(x.readiness))],
      ["<b>더 채울 것</b>", ...r.directions.map((x) => P(and(x.need.map((n) => n.name))) || "응답에서 크게 비는 판단이 없음")],
    ], "side");
    const packs = rolePacks(core);
    const best = new Map(e.style.map((x) => [x.axis, x.best]));
    b.p(`판단 여덟 가운데 각 직무가 특히 보는 판단을 표시하고, 학생이 가장 멀리까지 해 봤다고 답한 단계를 옆에 적었습니다. 표시가 있는데 단계가 낮은 칸이 그 직무로 갈 때 먼저 채울 곳입니다.`);
    b.table(["판단", "가장 멀리 간 단계", ...r.directions.map((x) => x.name)], (Object.keys(JUDGE) as (keyof typeof JUDGE)[]).map((a) => {
      const bl = best.get(a); return [`<b>${h(JUDGE[a].name)}</b>`, h(bl === null || bl === undefined ? "묻지 않음" : LEVEL_SHORT[bl]),
        ...r.directions.map((x) => (packs.find((p) => p.code === x.code)?.required_axes ?? []).includes(a) ? "특히 봄" : "")];
    }), "mx");
  }
  const all = rolePacks(core).filter((p) => !r.directions.some((x) => x.code === p.code));
  if (all.length) {
    b.h2("이 학과에서 이어지는 다른 직무");
    b.p(`응답에서 크게 걸리지 않았지만 같은 학과 졸업생이 많이 가는 직무입니다. 진로를 넓게 볼 때 참고하세요.`);
    b.table(["직무", "하는 일", "주로 정하는 것"], all.map((p) => [`<b>${h(p.name_ko)}</b>`, P(roleGuide(p.code)?.summary ?? p.owns ?? ""), P(and(p.decides ?? []))]));
  }
  b.end();
}

function chIndustryRole(d: Doc12, b: Book, rows: AnswerRow[]) {
  const core = d.core, m = d.model;
  const ind = industryPacks(core).find((p) => p.code === (m.targets.goal.industry ?? m.industry_context?.code));
  const role = rolePacks(core).find((p) => p.code === m.targets.goal.role);
  const ir = rows.filter((x) => x.id.startsWith("INDUSTRY_")), rr = rows.filter((x) => x.id.startsWith("ROLE_"));
  if (!ir.length && !rr.length) return;
  b.chapter("고른 산업과 직무에서 물은 것", "목표로 고른 산업과 직무에 맞춰 더 물은 문항입니다. 같은 판단을 그 산업과 직무의 장면으로 바꿔 물었습니다.");
  if (ind && ir.length) {
    b.h2(`${ind.name_ko}에서 묻는 판단`);
    if (ind.scene) b.p(ind.scene);
    if (ind.demands?.length) { b.p(`이 산업에서 일할 때 자주 마주치는 요구는 다음과 같습니다.`); b.ol(ind.demands); }
    if (ind.judgement_dimensions?.length) { b.p(`이 산업에서 특히 보는 판단과 그 까닭입니다.`); b.table(["판단", "영역", "왜 보는가"], ind.judgement_dimensions.map((x) => [`<b>${P(x.name)}</b>`, h(domainName(core, x.domain)), P(x.why)])); }
    b.table(["문항", "고른 답"], ir.map((x) => [h(x.q), `<b>${h(x.a)}</b>`]), "qa");
    const top = ir.filter((x) => x.a.startsWith("내가 정하고")); const low = ir.filter((x) => x.a === "없다" || x.a.startsWith("남이"));
    b.p(`${top.length ? `기준까지 직접 정했다고 답한 문항은 ${top.length}개입니다. ` : ""}${low.length ? `해 본 적이 없거나 남이 한 것을 받아 썼다고 답한 문항은 ${low.length}개이고, 이 자리가 이 산업으로 갈 때 먼저 채울 곳입니다.` : "해 본 적이 없다고 답한 문항은 없습니다."}`);
  }
  if (role && rr.length) {
    b.h2(`${role.name_ko} 자리에서 묻는 판단`);
    if (role.owns) b.p(`${role.name_ko} 담당자는 ${plain(role.owns)}`.replace(/([^.])$/, "$1."));
    b.table(["문항", "고른 답"], rr.map((x) => [h(x.q), `<b>${h(x.a)}</b>`]), "qa");
    if (role.application_material?.length) b.p(`이 직무에 지원할 때 흔히 내는 자료는 ${and(role.application_material)}입니다.`);
  }
  b.end();
}

function chPlaces(d: Doc12, b: Book) {
  const core = d.core, m = d.model;
  const orgs = orgChoices(core) as { code: string; name: string; first: string }[];
  const tax = (orgs.length ? orgs : []);
  const inds = industryPacks(core);
  const goalInd = m.targets.goal.industry ?? m.industry_context?.code ?? null, goalOrg = m.targets.goal.org;
  b.chapter("일하는 곳과 산업", "같은 직무라도 어떤 조직, 어떤 산업에서 하느냐에 따라 매일 정하는 것이 달라집니다. 학생이 고른 곳을 표시하고 나머지도 함께 적었습니다.");
  b.h2("조직의 종류");
  b.p(`조직을 일곱 가지로 나누어 보면, 내 결정이 어떤 모양으로 돌아오는지가 서로 다릅니다.${goalOrg ? ` 학생은 ${J(orgs.find((o) => o.code === goalOrg)?.name ?? goalOrg, "을")} 골랐습니다.` : ""}`);
  b.table(["조직", "이곳에서 일이 다른 점"], tax.map((o) => [`<b>${h(o.name)}</b>${o.code === goalOrg ? "<br><span class=\"mut\">고른 곳</span>" : ""}`, P(o.first)]));
  b.h2("산업마다 먼저 보는 것");
  b.p(`이 학과의 일이 이어지는 산업 ${inds.length}곳을 적었습니다. 산업마다 매일 마주치는 요구가 다르고, 그 요구가 어떤 판단을 먼저 묻는지도 다릅니다.`);
  inds.forEach((x, i) => {
    b.h3(i, `${x.name_ko}${x.code === goalInd ? " (고른 산업)" : ""}`);
    if (x.scene) b.p(x.scene);
    if (x.demands?.length) b.p(`이 산업에서는 ${and(x.demands.slice(0, 3).map((y) => plain(y).replace(/[.]$/, "").replace(/다$/, "다는 점")))}을 자주 마주칩니다.`.replace(/점을 자주/, "점을 자주"));
    const dims = (x.judgement_dimensions ?? []).slice(0, 4);
    if (dims.length) b.table(["이 산업이 묻는 판단", "영역"], dims.map((y) => [P(y.name), h(domainName(core, y.domain))]), "dim");
  });
  b.end();
}

function chApplication(d: Doc12, b: Book) {
  const r = d.r, e = d.e;
  b.chapter("지원서와 면접", "검사 응답과 경험 기록을 지원서 문장과 면접 답으로 옮기는 장입니다. 비워 둔 칸은 학생만 채울 수 있는 자리입니다.");
  b.h2("지원서 한 문단의 뼈대");
  b.p(`지원서 문단은 상황, 내가 정한 것, 남긴 것, 견준 결과의 차례로 쓰면 읽기 쉽습니다. 아래는 응답과 기록에서 채울 수 있는 칸을 채운 것입니다.`);
  r.application.stories.forEach((s, i) => {
    b.h3(i, `${plain(s.from)}에서`);
    b.table(["칸", "채운 내용"], s.parts.map((p) => [`<b>${h(p.label)}</b>`, p.filled ? P(p.text) : `<span class="bl">${P(p.text)}</span>`]));
    b.note(`이 문단이 맞는 직무: ${and(s.fits)}. ${s.add}`);
  });
  if (e.draft) {
    b.h2("문장으로 이어 쓴 초안");
    b.p(`위 칸을 한 문단으로 이으면 다음과 같습니다. 대괄호 자리는 기록을 보며 채우세요. 없는 수치를 만들어 넣지 않는 것이 중요한 원칙입니다.`.replace("중요한 원칙입니다", "원칙입니다"));
    b.raw(`<blockquote class="dr">${e.draft.parts.map((p) => p.blank ? `<span class="bl">${h(p.text)}</span>` : h(p.text)).join("")}</blockquote>`);
    b.ol(e.draft.tips);
  }
  b.h2("면접에서 받을 질문");
  b.p(`면접관은 지원서에 적은 판단을 되짚어 묻습니다. 아래 질문은 학생이 고른 답에서 나온 것이고, 답할 재료가 응답에 있는 질문과 아직 준비해야 하는 질문을 나눠 적었습니다.`);
  const qs = r.application.interview;
  qs.forEach((x, i) => {
    b.h3(i, plain(x.q).replace(/^“|”$/g, ""));
    b.p(x.why);
    b.p(x.pick ? `답의 재료는 ${q(x.pick)}입니다. ${x.material.includes(" · ") ? `함께 꺼낼 것은 ${and(x.material.split(" · ").slice(1))}입니다.` : ""}` : `아직 응답에서 재료가 보이지 않습니다. ${plain(x.material).replace(/^준비,?\s*/, "준비할 것: ")}`);
  });
  const gg = roleGuide(d.model.targets.goal.role ?? "");
  if (gg?.interview?.length) {
    b.h2(`${e.goal.role} 면접에서 흔히 나오는 질문`);
    b.p(`응답과 관계없이 이 직무 면접에서 자주 나오는 질문입니다. 위의 질문과 겹치는 것도 있으니, 같은 경험으로 답할 수 있는지 맞춰 보세요.`);
    b.table(["질문", "묻는 까닭"], gg.interview.map((x) => [`<b>${P(x.q)}</b>`, P(x.why)]));
  }
  if (e.answers.length) {
    b.h2("판단마다 답하는 방향");
    b.table(["질문", "면접관이 보는 것", "답하는 방향"], e.answers.map((x) => [P(x.q), P(x.why), P(x.dir)]));
  }
  if (r.application.portfolio.length) {
    b.h2("포트폴리오에 넣을 것");
    b.p(`포트폴리오에는 결과물 한 장과 함께, 그 안에서 내가 정한 것 한 줄과 견준 대상 한 줄을 붙이면 됩니다.`);
    b.table(["결과물", "지금 상태", "어디서 나왔나"], r.application.portfolio.map((x) => [`<b>${h(x.title)}</b>`, h(x.status === "보유" ? "고른 자료에 있음" : "새로 만들기"), P(x.from)]));
  }
  b.end();
}

function chPlan(d: Doc12, b: Book) {
  const r = d.r, e = d.e;
  b.chapter("실행 계획", "앞 장에서 나온 할 일을 때와 결과물로 묶었습니다. 결과물을 하나 만들 때마다 경험 기록에 더하면 다음 검사에서 다시 읽힙니다.");
  b.h2("30일, 60일, 90일");
  b.table(["때", "할 일", "어디서", "남길 것", "끝났는지 보는 법"], r.plan.map((p) => [h(p.period), `<b>${P(p.label)}</b><br>${P(p.what)}`, P(p.how), P(p.output), P(p.check)]), "plan");
  for (const p of r.plan) if (p.why) { /* 까닭은 표 아래에 모아 적는다 */ }
  b.p(`표의 할 일마다 까닭을 짧게 적어 둡니다. ${r.plan.map((p) => `${plain(p.label)}: ${plain(p.why)}`).join(" ")}`);
  if (e.project) {
    b.h2(`첫 번째 과제: ${plain(e.project.title)}`);
    b.p(`${plain(e.project.where)} 할 수 있는 과제입니다. ${plain(e.project.why)}`);
    b.p(`아래 차례로 진행합니다.`); b.ol(e.project.steps);
    b.p(`다 했는지는 다음 두 가지로 확인합니다.`); b.ol(e.project.done);
    if (e.project.answers) b.note(`이 과제를 끝내면 면접 질문 ‘${plain(e.project.answers)}’에 답할 재료가 생깁니다.`);
  }
  const fp = roleGuide(d.model.targets.goal.role ?? "")?.firstProject;
  if (fp) {
    b.h2(`${e.goal.role} 첫 프로젝트: ${plain(fp.title)}`);
    b.p(`${plain(fp.goal)}`);
    b.ol(fp.steps);
    b.dl([["남길 것", fp.output], ["끝났는지 보는 법", fp.check]]);
  }
  if (e.templates.length) {
    b.h2("결과물 서식");
    b.p(`처음부터 빈 종이에 쓰기보다, 직무에서 실제로 쓰는 서식의 칸을 먼저 채워 보는 편이 빠릅니다.`);
    e.templates.forEach((t, i) => {
      b.h3(i, t.title);
      b.p(`${plain(t.use)}에 씁니다.${t.mine.length ? ` 고른 자료 가운데 ${J(and(t.mine), "이")} 이 서식과 비슷합니다.` : ""}`);
      b.raw(`<table class="tb form"><tbody>${t.fields.map((f) => `<tr><th>${h(f)}</th><td></td></tr>`).join("")}</tbody></table>`);
      b.note(`잘 썼는지 보는 법: ${t.judge.map(plain).join(" 그리고 ")}`);
    });
  }
  if (r.growth) {
    b.h2(`${J(r.growth.role, "을")} 처음 준비할 때`);
    const g = r.growth;
    b.p(g.start);
    if (g.entry?.length) { b.p(`처음 들어가는 길은 이렇습니다.`); b.ol(g.entry); }
    if (g.learn?.length) b.table(["차례", "무엇을 배우나", "왜"], g.learn.map((x, i) => [String(i + 1), `<b>${P(x.step)}</b>`, P(x.why)]));
    if (g.project) { b.h3(0, `처음 해 볼 과제: ${plain(g.project.title)}`); b.p(g.project.goal); b.ol(g.project.steps); b.dl([["남길 것", g.project.output], ["끝났는지 보는 법", g.project.check]]); }
    if (g.research?.length) { b.h3(1, "직무를 알아보는 방법"); b.table(["무엇을", "어떻게"], g.research.map((x) => [`<b>${P(x.step)}</b>`, P(x.how)])); }
    if (g.months.length) { b.h3(2, "달마다 할 일"); b.table(["때", "할 일", "남길 것"], g.months.map((x) => [h(x.when), P(x.what), P(x.output)])); }
    if (g.portfolio?.length) { b.h3(3, "모아 둘 포트폴리오"); b.ol(g.portfolio); }
  }
  b.end();
}

function chLimits(d: Doc12, b: Book) {
  const e = d.e, r = d.r;
  b.chapter("이 리포트가 하지 않은 것", "결과를 읽을 때 기억해 둘 것을 한자리에 모았습니다.");
  b.h2("확인하지 않은 것");
  b.ol(e.limits);
  b.h2("같은 결과를 다시 만들 수 있게 남긴 기록");
  b.p(`이 리포트는 아래 판본의 검사와 문항으로 만들었습니다. 같은 응답이면 같은 결과가 다시 나옵니다.`);
  b.table(["항목", "판본"], Object.entries(r.versions).map(([k, v]) => [h(k), h(v)]), "ver");
  b.end();
}

/* ───────────────────────── 부록 ───────────────────────── */

function apxAnswers(b: Book, rows: AnswerRow[]) {
  b.chapter("문항별 응답 전체", "검사에서 답한 문항을 나온 차례대로 모두 옮겼습니다. 결과를 다시 확인하고 싶을 때 이 표를 보면 됩니다.", true);
  const groups: string[] = [];
  for (const x of rows) if (!groups.includes(x.group)) groups.push(x.group);
  for (const g of groups) {
    const xs = rows.filter((x) => x.group === g);
    b.h2(`${g} (${xs.length}문항)`);
    b.table(["번호", "문항", "고른 답"], xs.map((x, i) => [String(i + 1), h(x.q), `<b>${h(x.a)}</b>`]), "ans");
  }
  b.end();
}

function apxChecklist(d: Doc12, b: Book) {
  const r = d.r;
  const deep = r.domains.filter((x) => x.askedHow !== "NONE");
  if (!deep.length) return;
  b.chapter("체크리스트 전체", "판단을 자세히 물은 영역마다 체크리스트의 항목을 모두 옮기고, 학생이 고른 항목을 표시했습니다. 고르지 않은 항목은 다음 과제에서 해 볼 거리로 읽어도 됩니다.", true);
  for (const dom of deep) {
    b.h2(dom.name);
    const picked = new Set(d.picks.filter((p) => p.domain_code === dom.code).map((p) => p.item_text));
    const cl = checklistFor(d.core, dom.code);
    for (const c of cl) {
      if (!c.items.length) continue;
      const n = c.items.filter((t) => picked.has(t)).length;
      b.raw(`<h4>${h(c.label)} <small>${c.items.length}개 가운데 ${n}개를 고름</small></h4>`);
      b.raw(`<ul class="ck">${c.items.map((t) => `<li class="${picked.has(t) ? "on" : ""}"><i>${picked.has(t) ? "고름" : ""}</i>${h(plain(t))}</li>`).join("")}</ul>`);
    }
  }
  b.end();
}

function apxDomains(d: Doc12, b: Book) {
  const r = d.r, core = d.core;
  const shown = new Set(r.domains.map((x) => x.code));
  const rest = r.map.filter((x) => !shown.has(x.code));
  if (!rest.length) return;
  b.chapter("나머지 영역의 일", "본문에서 다루지 않은 영역의 일이 어떻게 흘러가는지 적었습니다. 이번 응답과는 관계없는 일반 안내이고, 관심이 생긴 영역이 있으면 다음 검사에서 그 영역을 자세히 물어볼 수 있습니다.", true);
  for (const x of rest) {
    const def = domainDef(core, x.code) as (ReturnType<typeof domainDef> & { tools?: string[] }) | undefined;
    if (!def) continue;
    b.h2(x.name);
    b.table(["차례", "이름", "그 자리에서 하는 일"], def.workflow.map((f) => [h(String(f.step)), `<b>${h(f.name)}</b>`, P(f.detail)]), "flow2");
    b.dl([["남기는 결과물", and(def.artifacts ?? [])], ["결과를 맞춰 보는 대상", and(def.verify_targets ?? [])], ["자주 쓰는 도구", and(def.tools ?? [])]]);
  }
  b.end();
}

function apxTerms(d: Doc12, b: Book) {
  b.chapter("낱말 풀이", "본문에서 쓴 말 가운데 검사에서 온 말을 풀어 적었습니다.", true);
  b.h2("판단 여덟");
  b.table(["말", "뜻"], (Object.keys(JUDGE) as (keyof typeof JUDGE)[]).map((a) => [`<b>${h(JUDGE[a].name)}</b>`, P(JUDGE[a].plain)]));
  b.h2("단계 넷");
  b.table(["말", "뜻"], ([0, 1, 2, 3] as const).map((i) => [`<b>${h(STEP[i].tag)}</b>`, P(STEP[i].said)]));
  b.h2("영역의 분류");
  b.table(["말", "뜻"], Object.values(ZONE_SAID).map((z) => [`<b>${h(z.tag)}</b>`, P(z.said)]));
  b.end();
}

function apxSheets(d: Doc12, b: Book) {
  const r = d.r;
  b.chapter("쓰기 칸", "결과를 읽고 바로 적어 볼 수 있게 칸을 남겼습니다. 인쇄해서 손으로 써도 되고, 적은 내용을 내 CareerMatri 경험 기록에 옮겨도 됩니다.", true);
  const ws = r.worksheet.length ? r.worksheet : [{ title: "경험 하나 정리", prefill: {} as Record<string, string> }];
  ws.forEach((w) => {
    b.h2(plain(w.title));
    const pf = w.prefill as Record<string, string>;
    b.raw(`<table class="tb form"><tbody>
      <tr><th>어떤 수업·활동이었나</th><td></td></tr><tr><th>팀에서 맡은 몫</th><td></td></tr>
      <tr><th>내가 직접 정한 것</th><td>${pf.decided ? `<span class="pf">${P(pf.decided)}</span>` : ""}</td></tr>
      <tr><th>남긴 결과물</th><td>${pf.artifact ? `<span class="pf">${P(pf.artifact)}</span>` : ""}</td></tr>
      <tr><th>무엇과 견줬나</th><td>${pf.verify ? `<span class="pf">${P(pf.verify)}</span>` : ""}</td></tr>
      <tr><th>결과 수치와 기간</th><td></td></tr></tbody></table>`);
    b.lines(8, "이 경험을 지원서 한 문단으로");
  });
  for (const dom of r.domains.filter((x) => x.askedHow !== "NONE")) {
    const def = domainDef(d.core, dom.code);
    if (!def?.axes) continue;
    b.h2(`${dom.name}에서 해 본 장면 적기`);
    b.p(`판단마다 이 영역에서 흔히 보이는 장면을 왼쪽에 적었습니다. 해 본 적이 있으면 언제, 어떤 과제였는지 오른쪽에 한 줄씩 적어 보세요. 빈칸이 많아도 괜찮습니다. 빈칸이 다음에 해 볼 일입니다.`);
    b.raw(`<table class="tb form wide"><thead><tr><th>판단과 흔한 장면</th><th>내 장면(언제, 어떤 과제에서)</th></tr></thead><tbody>${dom.levels.map((l) => `<tr><th><b>${h(l.name)}</b><br><span class="pf">${P(def.axes[l.axis as keyof typeof def.axes]?.l2 ?? "")}</span></th><td></td></tr>`).join("")}</tbody></table>`);
  }
  b.h2("면접 답 연습");
  b.p(`위 ‘지원서와 면접’ 장의 질문입니다. 답을 소리 내어 해 본 뒤, 기억할 낱말만 적어 두세요. 문장을 다 적지 않아도 됩니다.`);
  r.application.interview.forEach((x) => { b.raw(`<p class="qq">${P(x.q)}</p>`); b.lines(4); });
  b.end();
}

/* ───────────────────────── 조립 ───────────────────────── */

export function render12(d: Doc12): { html: string; toc: Sec[] } {
  const rows = answerRows(d.core, d.stage, d.responses);
  const b = new Book(d.pages ?? {}, !!d.marks);
  const front = new Book({}, !!d.marks);
  about(d, front);
  chSummary(d, b);
  chOverview(d, b, rows);
  chDomains(d, b, rows);
  chRecords(d, b);
  chJobs(d, b);
  chIndustryRole(d, b, rows);
  chPlaces(d, b);
  chApplication(d, b);
  chPlan(d, b);
  chLimits(d, b);
  apxAnswers(b, rows);
  apxChecklist(d, b);
  apxDomains(d, b);
  apxTerms(d, b);
  apxSheets(d, b);
  const toc: Sec[] = [{ id: "about", title: "이 리포트를 읽기 전에", level: 1 }, ...b.toc];
  const tb = new Book(); tb.toc = toc;
  const who = `${d.e.who.school} ${d.e.who.department}`;
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${h(who)} 진로·직무 리포트</title><style>${CSS12(d.fonts.href, who, d.e.who.answeredOn)}</style></head><body>
${cover(d)}
${front.out.join("\n")}
${tocPage(tb, d.pages ?? {})}
${b.out.join("\n")}
</body></html>`;
  return { html, toc };
}

/* ───────────────────────── 모양 ───────────────────────── */

const CSS12 = (f: string, who: string, day: string) => `
@font-face{font-family:P;src:url("${f}/Pretendard-Regular.otf");font-weight:400}
@font-face{font-family:P;src:url("${f}/Pretendard-Medium.otf");font-weight:500}
@font-face{font-family:P;src:url("${f}/Pretendard-SemiBold.otf");font-weight:600}
@font-face{font-family:P;src:url("${f}/Pretendard-Bold.otf");font-weight:700}
:root{--ink:#16191f;--ink2:#3b414b;--mute:#6b7280;--rule:#c9d0da;--rule2:#e3e7ed;--head:#0e2a63;--blue:#1c56ad;--red:#c8262e;--th:#eef1f5}
@page{size:A4;margin:24mm 21mm 20mm 23mm;
  @top-left{content:"${who} 진로·직무 리포트";font:500 8.5pt P,sans-serif;color:#6b7280;vertical-align:bottom;padding-bottom:3mm}
  @top-right{content:"${day} 응답";font:500 8.5pt P,sans-serif;color:#6b7280;vertical-align:bottom;padding-bottom:3mm}
  @bottom-center{content:counter(page);font:500 9pt P,sans-serif;color:#3b414b}}
@page cover{margin:0;@top-left{content:none}@top-right{content:none}@bottom-center{content:none}}
@page front{@bottom-center{content:none}}
*{box-sizing:border-box}
html{font-family:P,sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.78;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;word-break:keep-all;overflow-wrap:break-word}
p{margin:0 0 3.2mm;text-align:justify}
b{font-weight:700}
.sm{font-size:9.5pt;color:var(--ink2)}
.nt{font-size:9.5pt;color:var(--ink2);padding-left:4mm;border-left:.8pt solid var(--rule)}
/* 표지 */
.cover{page:cover;width:210mm;height:297mm;display:grid;grid-template-columns:86mm 1fr;break-after:page}
.cvl{background:var(--head);color:#fff;position:relative}
.cvs{position:absolute;left:14mm;top:18mm;font-size:11pt;font-weight:700}.cvs em{display:block;font-style:normal;font-size:8.5pt;font-weight:500;letter-spacing:.1em;color:#c9d6ee;margin-top:1mm}
.cvt{position:absolute;left:14mm;top:84mm;font-size:30pt;font-weight:700;line-height:1.22}.cvt span{display:block;font-size:12pt;font-weight:500;color:#c9d6ee;margin-bottom:3mm}
.cvr{position:absolute;left:14mm;top:132mm;width:20mm;height:.8mm;background:var(--red)}
.cvb{position:absolute;left:14mm;bottom:16mm;font-size:9pt;font-weight:600;color:#c9d6ee}
.cvd{padding:84mm 18mm 18mm 14mm}
.cvd h2{font-size:15pt;font-weight:700;color:var(--head);margin:0 0 9mm;line-height:1.4}
.cvrow{display:grid;grid-template-columns:32mm 1fr;gap:3mm;padding:3.6mm 0;border-top:.5pt solid var(--rule2);font-size:10.5pt;line-height:1.6}
.cvrow:last-of-type{border-bottom:.5pt solid var(--rule2)}.cvrow b{color:var(--head);font-weight:600}
.cvn{margin-top:10mm;font-size:9.5pt;color:var(--ink2)}
/* 앞쪽 */
.fr{page:front;break-after:page}
.frh{font-size:17pt;font-weight:700;color:var(--head);margin:0 0 7mm;padding-bottom:3mm;border-bottom:1.2pt solid var(--head)}
.tocl{list-style:none;margin:0;padding:0;columns:2;column-gap:10mm}
.tocl li.l1{break-after:avoid}
.tocl li{display:flex;align-items:baseline;gap:2mm;line-height:1.5}
.tocl li.l1{font-weight:700;font-size:10pt;margin-top:3mm;color:var(--head)}
.tocl li.l2{font-size:8.8pt;padding-left:5mm;color:var(--ink2);line-height:1.45}
.tocl li i{flex:1;border-bottom:.5pt dotted #a3abb8;transform:translateY(-1mm)}
.tocl li b{font-weight:500;min-width:7mm;text-align:right}
/* 장 */
.ch{break-before:page}
.chn{font-size:11pt;font-weight:700;color:var(--blue);margin:2mm 0 1mm}
.ch h1{font-size:20pt;font-weight:700;color:var(--head);margin:0 0 4mm;line-height:1.35}
.chi{font-size:11pt;color:var(--ink2);padding-bottom:5mm;margin-bottom:7mm;border-bottom:1.2pt solid var(--head)}
h2{font-size:13pt;font-weight:700;color:var(--head);margin:8mm 0 3mm;line-height:1.45;break-after:avoid}
h2 span{color:var(--blue);margin-right:2mm}
h3{font-size:11pt;font-weight:700;color:var(--ink);margin:5mm 0 2mm;break-after:avoid}
h3 span{color:var(--blue);margin-right:1.6mm;font-weight:600}
h4{font-size:10pt;font-weight:700;margin:4mm 0 1.6mm;break-after:avoid}h4 small{font-weight:500;color:var(--mute);margin-left:2mm;font-size:9pt}
/* 표 */
.tb{width:100%;border-collapse:collapse;margin:1mm 0 5mm;font-size:9.5pt;line-height:1.55;border-top:1pt solid var(--head)}
.tb th{background:var(--th);font-weight:600;text-align:left;padding:1.8mm 2.4mm;border-bottom:.6pt solid var(--rule);vertical-align:top}
.tb td{padding:1.8mm 2.4mm;border-bottom:.5pt solid var(--rule2);vertical-align:top}
.tb tr{break-inside:avoid}
.tb.mx td,.tb.mx th{text-align:center}.tb.mx td:first-child,.tb.mx th:first-child{text-align:left}
.tb.grid td:first-child{width:30mm}
.tb.flow td:first-child{width:10mm;text-align:center;color:var(--mute)}.tb.flow td:last-child{width:40mm}
.tb.qa td:first-child{width:30mm;color:var(--ink2)}.tb.qa td:last-child{width:38mm}
.tb.ans td:first-child{width:10mm;text-align:center;color:var(--mute)}.tb.ans td:last-child{width:42mm}
.tb.plan td:first-child{width:12mm}
.tb.form th{width:38mm;background:#f6f7f9}.tb.form td{height:12mm}
.tb.form.wide th{width:72mm;font-weight:500}.tb.form.wide thead th{font-weight:600;background:var(--th)}.tb.form.wide td{height:19mm}
.tb.ver td{font-size:8.6pt}
.tb.lv td:first-child{width:30mm}.tb.lv td:nth-child(2){width:24mm;color:var(--ink2)}
.tb.lv2 td:first-child{width:30mm}.tb.pr td:first-child{width:27mm}.tb.dev td:first-child{width:30mm}.tb.dev td:last-child{width:34mm}.tb.dim td:last-child{width:36mm}.tb.side td:first-child{width:26mm}.tb.pr td:nth-child(3){width:30mm}.mut{font-size:8.6pt;color:var(--blue);font-weight:600}
.tb.flow2 td:first-child{width:10mm;text-align:center;color:var(--mute)}.tb.flow2 td:nth-child(2){width:30mm}
.dl{display:grid;grid-template-columns:30mm 1fr;margin:0 0 4mm;font-size:10pt;line-height:1.65;border-top:.5pt solid var(--rule2)}
.dl dt{font-weight:600;color:var(--head);padding:1.6mm 0;border-bottom:.5pt solid var(--rule2)}
.dl dd{margin:0;padding:1.6mm 0;border-bottom:.5pt solid var(--rule2)}
.ol{margin:0 0 4mm;padding-left:6mm}.ol li{margin:0 0 1.4mm}
.bl{color:var(--mute)}
blockquote.dr{margin:2mm 0 4mm;padding:3mm 0 3mm 5mm;border-left:1.2pt solid var(--blue);font-size:10.5pt;line-height:1.85}
blockquote.dr .bl{border-bottom:.6pt solid #9aa3b0;color:var(--mute)}
.ck{list-style:none;margin:0 0 3mm;padding:0;font-size:9.5pt;line-height:1.5}
.ck li{display:grid;grid-template-columns:12mm 1fr;padding:1.1mm 0;border-bottom:.5pt solid var(--rule2);break-inside:avoid}
.ck li i{font-style:normal;font-size:8.6pt;font-weight:700;color:var(--blue)}
.ck li:not(.on){color:var(--ink2)}
.wr{margin:2mm 0 6mm}.wrl{font-size:9.5pt;color:var(--ink2);margin-bottom:1mm}
.wr i{display:block;height:9mm;border-bottom:.5pt solid #b9c0cb}
.pf{color:var(--ink2)}
.qq{font-weight:600;margin:5mm 0 0}
h1,h2{position:relative}.mk{position:absolute;left:0;top:0;font-size:1pt;color:#fff;line-height:1}
`;
