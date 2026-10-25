/**
 * 01 한눈에 보기.
 *
 * 영어 책은 같은 쪽을 같은 그림으로 세운다. 한국어 글자는 `L(ko, en)` 의 첫 인자에 그대로 있고,
 * 영어 쪽 문장은 영어 도구(`andJoinEn` · `nEn` · `lcEn` …)로만 잇는다.
 */
import type { Inputs } from "./types";
import { AXES, BAND_WORD, EXP_WORD, STEP_WORD, ZONE_WORD, ZONES, type Bucket, type X, notAsked } from "./derive";
import { C, LEVEL_KO, donut, hbars, quadrant, ring } from "./charts";
import { DC, E, H, IC, LVC, PAL, T, ZC, band, chips, howto, note, pip, ul, zoneTag, type Page } from "./kit";
import { GAP_KIND, gapWhy, actionHead, actionLine, andJoin, andJoinEn, askNoun, j, lcEn, list3, nEn, okText, polite, sentenceEn } from "./text";
import { byLang, isEn, T as L } from "./lang";
import { partNames } from "./fill";
import type { Gap } from "../result/model";

/** 장 이름은 fill.ts partNames 한 곳에서 정한다. 장 첫 쪽(index.ts)과 같은 글자여야 차례와 쪽 머리가 한 장으로 묶인다 */
const P = (title: string, body: string): Page => ({ part: "01", partName: partNames().c1, title, body });

/** 공용 문장(text.ts)에 남은 옛 단계·영역 이름을 이 장에서는 학생에게 보이는 이름으로 적는다 */
const whyOf = (g: Pick<Gap, "kind" | "why">) => gapWhy(g)
  .replace(/기준까지 직접 결정/g, LEVEL_KO[3]).replace(/근거를 갖춘 영역/g, ZONE_WORD.Z1_EVIDENCE_ESTABLISHED.tag);
/** svg 를 쪽 안에서 조금 줄여 그 아래 읽는 법 자리를 만든다 */
const fitH = (svg: string, mm: number) => svg.replace("<svg ", `<svg style="max-height:${mm}mm" `);
/** 사분면 칸 바탕색(charts.ts quadrant 와 같은 값) */
const Q_HOT = "#eaf1fd", Q_WARM = "#fdf5e8";
/** 영역 수: `3곳` · `3 areas` */
const nArea = (n: number) => (isEn() ? nEn(n, "area") : `${n}곳`);

export const BUCKET: Record<Bucket, { head: string; act: string; color: string }> = byLang<Record<Bucket, { head: string; act: string; color: string }>>({
  A: { head: "지원서에 바로 쓰기", act: "정한 기준과 결과물 이름을 한 문단으로", color: PAL.blue },
  B: { head: "결과물 하나 더 남기기", act: "해 본 일에 비교 기록이나 문서를 붙이기", color: PAL.teal },
  C: { head: "짧은 과제로 겪어 보기", act: "수업이나 동아리에서 4주짜리 과제 하나", color: PAL.amber },
  D: { head: "지금은 미뤄 두기", act: "다른 영역을 먼저 다지고 필요할 때", color: "#9aa6bb" },
}, {
  A: { head: "Use it in applications now", act: "One paragraph on your criteria and output", color: PAL.blue },
  B: { head: "Keep one more deliverable", act: "Add a comparison or a document", color: PAL.teal },
  C: { head: "Try it in a short project", act: "One four-week class or club project", color: PAL.amber },
  D: { head: "Leave it for now", act: "Build other areas first", color: "#9aa6bb" },
});

export function glance(x: Inputs, d: X): Page {
  const m = x.m;
  const en = isEn();
  const points: { label: string; meaning: string; fact: string; action: string }[] = [];
  const s0 = d.strengths[0];
  if (s0) {
    const ev = d.evidenceOf(s0);
    const said = ev.decisions.length ? ev.decisions : ev.acts;
    const art = d.def(s0.code)?.artifacts[0];
    const nm = d.name(s0.code);
    const axes = s0.confirmed.slice(0, 4).map(d.axisName).join(", ");
    const more = s0.confirmed.length - 4;
    points.push(en ? {
      label: s0.zone === "Z1_EVIDENCE_ESTABLISHED" ? "Your clearest strength" : "Where you have done the most",
      meaning: ev.artifacts.length
        ? `In ${nm}, you did the work yourself and kept something to show for it: ${lcEn(ev.artifacts[0])}.`
        : `Your answers show ${nEn(s0.confirmed.length, "decision")} you handled yourself in ${nm}. You have not yet picked a deliverable that shows this work.`,
      fact: said.length ? `Items you picked: ${list3(said)}` : `Decisions you handled yourself: ${axes}${more > 0 ? ` and ${more} more` : ""}`,
      action: s0.zone === "Z1_EVIDENCE_ESTABLISHED"
        ? "Write it up as one paragraph for your applications. The application drafts later in this book walk you through it."
        : `In your next ${nm} project, make sure you keep ${art ? `the ${lcEn(art)}` : "a short results document"}.`,
    } : {
      label: s0.zone === "Z1_EVIDENCE_ESTABLISHED" ? "가장 분명한 강점" : "가장 많이 해 본 영역",
      meaning: ev.artifacts.length
        ? `${nm}에서는 일을 직접 맡아 했고, 그 결과를 ${j(ev.artifacts[0], "으로")} 남겼습니다.`
        : `${nm}에서 직접 해 본 판단이 ${s0.confirmed.length}가지 나왔어요. 그 일을 보여 줄 결과물은 아직 고르지 않았습니다.`,
      fact: said.length ? `고른 항목: ${list3(said)}` : `직접 해 본 판단: ${axes}${s0.confirmed.length > 4 ? ` 외 ${s0.confirmed.length - 4}가지` : ""}`,
      action: s0.zone === "Z1_EVIDENCE_ESTABLISHED"
        ? "06장 자기소개서 재료로 옮겨 한 문단을 써 보세요."
        : `다음 ${nm} 과제에서는 ${j(art ?? "결과 문서", "을를")} 남겨 두세요.`,
    });
  }
  const g0 = d.gaps[0];
  if (g0) {
    const a = d.actionOf(g0);
    points.push({
      label: L("먼저 채울 판단", "The first decision to fill in"),
      meaning: en
        ? `${d.name(g0.domain)}${g0.axis ? ` · ${d.axisName(g0.axis)}` : ""}: ${lcEn(GAP_KIND[g0.kind])}.`
        : `${d.name(g0.domain)}${g0.axis ? `의 ${d.axisName(g0.axis)}` : ""}: ${GAP_KIND[g0.kind]}.`,
      fact: en ? sentenceEn(gapWhy(g0)) : `${whyOf(g0)}.`,
      action: a ? actionLine(a, d.name(g0.domain), d.def(g0.domain)) : L("07장 실행 로드맵에서 언제 할지 정해 보세요.", "Pick a date for it in the roadmap at the end of this book."),
    });
  }
  const wish = m.domains.filter((v) => v.interest === "HIGH" && (v.zone === "Z4_INSUFFICIENT_EVIDENCE" || v.zone === "NOT_EXPLORED"));
  if (wish.length) {
    const wn = wish.slice(0, 3).map((v) => d.name(v.code));
    points.push({
      label: L("관심은 높은데 아직 해 본 일이 적은 영역", "High interest, little hands-on work yet"),
      meaning: en
        ? `You said your interest is high in ${andJoinEn(wn)}. Either you have not done much there yet, or this assessment only asked about your interest and experience in those areas.`
        : `${andJoin(wn)}에 관심이 높다고 답했어요. 아직 해 본 일이 적거나, 이번 검사에서 관심과 해 본 횟수까지만 물은 영역입니다.`,
      fact: (() => {
        const by = new Map<string, string[]>();
        for (const v of wish.slice(0, 3)) {
          const w = en
            ? (v.experience ? `times done: ${EXP_WORD[v.experience].toLowerCase()}` : "no answer on times done")
            : (v.experience ? `해 본 횟수 ${EXP_WORD[v.experience]}` : "해 본 횟수 응답 없음");
          by.set(w, [...(by.get(w) ?? []), d.name(v.code)]);
        }
        return en
          ? [...by].map(([w, ns]) => `${ns.join(", ")} (${w})`).join("; ")
          : [...by].map(([w, ns]) => `${w}: ${ns.join(", ")}`).join(" / ");
      })(),
      action: L("이 가운데 하나를 골라 수업이나 동아리에서 4주짜리 과제로 먼저 겪어 보세요.", "Pick one of these and try it first as a four-week class or club project."),
    });
  }
  const names = (z: string) => m.domains.filter((v) => v.zone === z).map((v) => d.name(v.code));
  const goal = [d.goalRole?.name_ko, d.goalInd?.name_ko].filter(Boolean).join(" · ");
  /* 영역 이름표는 읽는 법 쪽의 색 견본과 같은 모양으로 단다. 칸 왼쪽은 HTML 이다 */
  const ne = names("NOT_EXPLORED");
  const rows: [string, string][] = ([
    ...ZONES.filter((z) => z !== "NOT_EXPLORED").map((z) => [zoneTag(z), E(names(z).join(" · "))]),
    [zoneTag("NOT_EXPLORED"), ne.length ? L(`${ne.length}곳 <span class="mut">(관심과 해 본 횟수만 물음)</span>`, `${nEn(ne.length, "area")} <span class="mut">(we only asked about interest and experience)</span>`) : ""],
    [L("목표 직무 · 산업", "Target role · Industry"), E(goal)],
    [L("응답", "Your answers"), m.response_quality.flag === "OK" ? L("고르게 답했어요", "No issues found in how you answered") : L("다시 볼 응답이 있어요(02장 끝에서 설명)", "Some answers are worth a second look (explained at the end of Chapter 02)")],
  ] as [string, string][]).filter(([, b]) => b);
  const head = s0
    ? L(`지금 가장 자신 있게 말할 수 있는 영역은 ${d.name(s0.code)}입니다`, `${d.name(s0.code)} is the area you can speak about most confidently right now`)
    : L("지금은 어디서부터 경험을 쌓을지 정할 때입니다", "Now is the time to decide where to start building experience");
  const firstA = g0 ? d.actionOf(g0) : undefined;
  const dek = firstA && g0
    ? (en ? `If you do just one thing this term, start here: ${E(lcEn(actionHead(firstA, d.name(g0.domain))))}.` : `이번 학기에 하나만 한다면 ${E(actionHead(firstA, d.name(g0.domain)))}부터 시작해 보세요.`)
    : undefined;
  return P(L("핵심 진단 요약", "Key findings"),
    T(E(head), dek) +
    `<div class="pts">${points.map((p, i) => `<div class="pt"><span class="pt-n">${i + 1}</span><div><p class="k">${E(p.label)}</p><h4>${E(p.meaning)}</h4><p class="mut">${E(p.fact)}</p><p class="pt-a"><b>${L("할 일", "Next step")}</b> ${E(p.action)}</p></div></div>`).join("")}</div>` +
    `<table class="tb tb-s"><tbody>${rows.map(([a, b]) => `<tr><th class="w30">${a}</th><td>${b}</td></tr>`).join("")}</tbody></table>`);
}

function wrapT(text: string, n: number): string[] {
  const out: string[] = []; let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const add = cur ? ` ${w}` : w;
    if (cur && [...(cur + add)].length > n) { out.push(cur); cur = w; } else cur += add;
  }
  if (cur) out.push(cur);
  return out;
}
const svgText = (lines: string[], x: number, y: number, o: { size?: number; color?: string; weight?: number; lh?: number } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 12}" fill="${o.color ?? C.ink}" font-weight="${o.weight ?? 500}" text-anchor="middle">${lines.map((l, i) => `<tspan x="${x}" dy="${i ? (o.lh ?? 1.35) * (o.size ?? 12) : 0}">${E(l)}</tspan>`).join("")}</text>`;

/** 영어 칸에 들어가는 영역 이름 줄. 영어 이름은 길어서 아홉 줄까지 넣고 남은 수를 적는다 */
const EN_LINES = 9;
function enLeaf(g: string[]): { lines: string[]; shown: number } {
  const lines: string[] = [];
  let shown = 0;
  for (let i = 0; i < g.length; i++) {
    const ls = wrapT(g[i], 24);
    if (lines.length + ls.length + (i < g.length - 1 ? 1 : 0) > EN_LINES) break;
    lines.push(...ls); shown++;
  }
  if (shown < g.length) lines.push(`+${g.length - shown} more`);
  return { lines, shown };
}

export function tree(x: Inputs, d: X): Page {
  const en = isEn();
  const groups: Record<Bucket, string[]> = { A: [], B: [], C: [], D: [] };
  x.m.domains.forEach((v) => groups[d.bucket(v)].push(d.name(v.code)));
  const Wd = 700, Hd = 500;
  const box = (cx: number, y: number, w: number, h: number, fill: string, stroke: string, ls: string[], o: { size?: number; color?: string; weight?: number } = {}) =>
    `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="${Math.min(22, h / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>` +
    svgText(ls, cx, y + h / 2 - ((ls.length - 1) * (o.size ?? 12) * 1.35) / 2 + (o.size ?? 12) * 0.36, o);
  const edge = (x1: number, y1: number, x2: number, y2: number, label: string) => {
    const my = (y1 + y2) / 2;
    /* 영어 이름표(`Not yet`)는 한글 두 자보다 길어 알약을 글자만큼 넓힌다 */
    const pw = en ? Math.max(36, Math.round(label.length * 6.6 + 14)) : 36;
    return `<path d="M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}" fill="none" stroke="#b7c2d6" stroke-width="2"/>` +
      `<rect x="${(x1 + x2) / 2 - pw / 2}" y="${my - 10}" width="${pw}" height="19" rx="9.5" fill="#fff" stroke="#b7c2d6"/>` +
      svgText([label], (x1 + x2) / 2, my + 4, { size: 10.5, color: C.ink2, weight: 700 });
  };
  const leafX = [92, 268, 444, 616];
  const keys: Bucket[] = ["A", "B", "C", "D"];
  const YES = L("예", "Yes"), NO = L("아니오", "No"), NOTYET = L("아직", "Not yet");
  const leaf = (g: string[]) => (en ? enLeaf(g).lines : (g.length > 8 ? [...g.slice(0, 7), `외 ${g.length - 7}곳`] : g).flatMap((t) => wrapT(t, 11)).slice(0, 12));
  /* 갈림길마다 질문 하나. 뿌리에서 해 본 일이 확인됐는지 묻고, 그다음 왼쪽은 결과물까지 남았는지, 오른쪽은 관심이 높은지 묻는다(derive.ts bucket 과 같은 차례) */
  const svg = `<svg viewBox="0 0 ${Wd} ${Hd}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">
    ${edge(350, 52, 190, 102, YES)}${edge(350, 52, 530, 102, NO)}
    ${edge(190, 150, leafX[0], 214, YES)}${edge(190, 150, leafX[1], 214, NOTYET)}
    ${edge(530, 150, leafX[2], 214, YES)}${edge(530, 150, leafX[3], 214, NO)}
    ${box(350, 6, 380, 46, C.navy, C.navy, [L(`${x.domainWord} ${d.counts.domains}곳 · 직접 해 본 일이 확인됐나요?`, `${nEn(d.counts.domains, x.domainWord)} · Does your hands-on work show?`)], { size: 13, color: "#fff", weight: 800 })}
    ${box(190, 102, 250, 48, "#eef3fc", "#c9d6ee", en ? ["Do you have both decisions you", "made and a deliverable?"] : ["직접 정한 일과 결과물이", "둘 다 있나요?"], { size: 11.5, color: C.navy, weight: 700 })}
    ${box(530, 102, 250, 48, "#eef3fc", "#c9d6ee", en ? ["Did you say your interest or", "wish to learn is high?"] : ["관심이나 배울 뜻이", "높다고 답했나요?"], { size: 11.5, color: C.navy, weight: 700 })}
    ${keys.map((k, i) => {
      const b = BUCKET[k], cx = leafX[i], g = groups[k], top = 214;
      const listed = leaf(g);
      return `<rect x="${cx - 82}" y="${top}" width="164" height="${Hd - top - 4}" rx="18" fill="#fff" stroke="${b.color}" stroke-width="1.6"/>
        <rect x="${cx - 82}" y="${top}" width="164" height="50" rx="18" fill="${b.color}"/><rect x="${cx - 82}" y="${top + 30}" width="164" height="20" fill="${b.color}"/>
        ${svgText(wrapT(b.head, en ? 20 : 10), cx, top + 21, { size: 12.5, color: "#fff", weight: 800 })}
        ${svgText([nArea(g.length)], cx, top + 74, { size: 20, color: b.color === "#9aa6bb" ? C.ink2 : b.color, weight: 800 })}
        ${listed.length ? svgText(listed, cx, top + 100, { size: 10.5, color: C.ink, weight: 600, lh: 1.42 }) : ""}
        ${svgText(wrapT(b.act, en ? 24 : 12), cx, Hd - 34, { size: 9.5, color: C.ink3, weight: 500 })}`;
    }).join("")}
  </svg>`;
  /* 그림 칸에 이름이 다 들어가지 않은 칸만 아래에 전체 이름을 다시 적는다 */
  const over = keys.filter((k) => (en ? enLeaf(groups[k]).shown < groups[k].length : groups[k].length > 8));
  return P(L("결과에 따라 무엇을 할까", "What to do with each area"),
    T(L(`${E(x.domainWord)} ${d.counts.domains}곳을 지금 할 일 네 가지로 나눴습니다`, `Your ${nEn(d.counts.domains, E(x.domainWord))} fall into four kinds of next step`),
      L("직접 해 본 일이 확인됐는지, 관심이나 배울 뜻이 높은지에 따라 나눴어요. 이번 학기에 할 일이 칸마다 다릅니다.", "We sorted them by whether your hands-on work shows and whether your interest or wish to learn is high. Each box has a different job for this term.")) +
    `<div class="wide-art">${svg}</div>` +
    howto([
      [L("갈림길", "Branches"), L("위 상자의 질문에 ‘예’면 왼쪽, 아니면 오른쪽으로 내려가요", "If the answer to the box above is ‘Yes’, go left. Otherwise go right")],
      [L("색 칸 제목", "Colored heading"), L("그 칸에 든 영역에서 할 일", "What to do with the areas in that box")],
      [L("큰 숫자", "Large number"), L("그 칸에 든 영역 수", "How many areas are in that box")],
      [L("칸 맨 아래 작은 글", "Small text at the bottom"), L("할 일을 한 줄로 풀어 쓴 것", "The next step in one line")],
    ]) +
    (over.length ? `<div class="g2">${over.map((k) => `<div class="b4" style="--c:${BUCKET[k].color}"><b>${E(BUCKET[k].head)}</b><p>${groups[k].map(E).join(" · ")}</p></div>`).join("")}</div>` : "") +
    band(L("이번 학기에는", "This term"), (() => {
      const ab = groups.A.length + groups.B.length, c = groups.C.length;
      if (en) {
        const try1 = c ? `pick one of the ${nEn(c, "area")} under ‘${E(BUCKET.C.head)}’, such as ${E(groups.C[0])}, and try it as a four-week project.` : "pick one area that interests you and start with a four-week project.";
        return ab ? `${ab === 1 ? "One area already has" : `${ab} areas already have`} work you can turn into evidence for applications. On top of that, ${try1}` : sentenceEn(try1);
      }
      const try1 = c ? `${E(groups.C[0])}처럼 ‘${E(BUCKET.C.head)}’에 든 ${c}곳 가운데 하나를 4주 과제로 골라 보세요.` : "관심 가는 영역 하나를 골라 4주 과제로 시작해 보세요.";
      return ab ? `${ab}곳은 이미 해 본 일을 지원서 근거로 정리하면 되는 영역이에요. 여기에 더해 ${try1}` : try1;
    })()));
}

export function dash(x: Inputs, d: X): Page {
  const en = isEn();
  const k = d.counts;
  const zoneParts = ZONES.map((z) => ({ label: ZONE_WORD[z].tag, value: x.m.domains.filter((v) => v.zone === z).length, color: ZC[z] })).filter((p) => p.value);
  const ints = (["HIGH", "MID", "LOW"] as const).map((v) => ({ label: L(`관심 ${BAND_WORD[v]}`, `${BAND_WORD[v]} interest`), value: x.m.domains.filter((z) => z.interest === v).length, color: IC[v] }));
  const noAns = x.m.domains.filter((z) => !z.interest).length;
  if (noAns) ints.push({ label: L("관심 응답 없음", "No interest answer"), value: noAns, color: "#d7dbe3" });
  /* 영어 칸은 단위(개 · 건 · 곳)를 따로 달지 않는다. 이름이 이미 무엇을 센 것인지 말한다 */
  const all: [string, number, string, string][] = en ? [
    ["Made the call", k.owned, "", "Decisions, across all areas asked"], ["Handled yourself", k.confirmed, "", "Decisions, including your own calls"],
    ["Items you picked", k.items, "", k.artifacts ? `${k.artifacts} of them deliverables` : "Work you did and things you kept"], ["Experience records", k.records, "", "Activities saved on the platform"],
    [`${ZONE_WORD.Z1_EVIDENCE_ESTABLISHED.tag}s`, k.z1, "", `Out of ${nEn(k.domains, x.domainWord)}`], ["Gaps to fill first", k.gaps, "", "One decision counted per area"],
  ] : [
    ["기준까지 직접 정한 판단", k.owned, "개", "물은 영역 전체에서"], ["직접 해 본 판단", k.confirmed, "개", "기준까지 정한 것 포함"],
    ["고른 항목", k.items, "개", k.artifacts ? `그중 결과물 ${k.artifacts}개` : "해 본 일과 남긴 것"], ["경험 기록", k.records, "건", "플랫폼에 적어 둔 활동"],
    [ZONE_WORD.Z1_EVIDENCE_ESTABLISHED.tag, k.z1, "곳", `${x.domainWord} ${k.domains}곳 가운데`], ["먼저 채울 판단", k.gaps, "곳", "영역마다 판단 하나씩 센 수"],
  ];
  const tiles = all.filter((t) => t[1] > 0);
  if (!tiles.length) tiles.push(all[1]);
  const did = en ? ZONES.slice(0, 3).map((z) => ZONE_WORD[z].tag).join(" + ") : ZONES.slice(0, 3).map((z) => ZONE_WORD[z].tag).join(" · ");
  const dn = (svg: string) => `<div style="width:100%;max-width:62mm;margin:0 auto">${svg}</div>`;
  const shown = k.z1 + k.z2 + k.z3;
  const head = en
    ? (k.confirmed ? (k.owned ? `You handled ${nEn(k.confirmed, "decision")} yourself and made the call on ${k.owned} of them` : `You handled ${nEn(k.confirmed, "decision")} yourself`) : "Not many decisions have been counted by step yet")
    : (k.confirmed ? (k.owned ? `직접 해 본 판단은 ${k.confirmed}개이고, 그중 ${k.owned}개는 기준까지 정했습니다` : `직접 해 본 판단은 ${k.confirmed}개입니다`) : "판단 단계로 센 것은 아직 많지 않습니다");
  return P(L("숫자로 본 근거", "Your evidence in numbers"),
    T(head, L("위 칸은 검사 응답과 고른 항목을 센 개수예요. 아래 두 도넛은 같은 영역들을 두 가지로 나눠 본 것입니다.", "The tiles count your answers and picks. The two donuts split the same areas in two ways.")) +
    `<div class="kpis">${tiles.map(([a, b, u, c]) => `<div class="kpi"><p>${E(a)}</p><b>${b}<small>${u}</small></b><span>${E(c)}</span></div>`).join("")}</div>` +
    `<div class="two">
      <div class="card cen">${H(L(`${E(j(x.domainWord, "은는"))} 어디에 놓였나`, "Where your areas sit"), L("영역 이름별", "By label"))}${dn(donut(zoneParts, { size: 220, center: [`${shown}`, L("해 본 일이 확인된 영역", "areas with work")] }))}<div class="lg">${zoneParts.map((p) => `<span><i style="background:${p.color}"></i>${E(p.label)}${L(" ", ": ")}${p.value}${L("곳", "")}</span>`).join("")}</div></div>
      <div class="card cen">${H(L("관심은 어떻게 나뉘었나", "How your interest splits"), L("관심 응답", "Interest answers"))}${dn(donut(ints, { size: 220, center: [`${ints[0].value}`, L("관심 높은 영역", "high interest")] }))}<div class="lg">${ints.map((p) => `<span><i style="background:${p.color}"></i>${E(p.label)}${L(" ", ": ")}${p.value}${L("곳", "")}</span>`).join("")}</div></div>
    </div>` +
    howto([
      [L("한 바퀴", "Full circle"), L(`${E(x.domainWord)} ${k.domains}곳 전체`, `All ${nEn(k.domains, E(x.domainWord))}`)],
      [L("조각 길이", "Slice length"), L("그 색에 든 영역 수(색 이름 옆 숫자와 같음)", "Areas with that color (the number by each label)")],
      [L("왼쪽 가운데 숫자", "Number in the left center"), L(`해 본 일이 확인된 영역 수(${E(j(did, "을를"))} 더한 것)`, `Areas with work (${E(did)})`)],
      [L("오른쪽 가운데 숫자", "Number in the right center"), L("관심이 높다고 답한 영역 수", "Areas you rated high interest")],
    ]) +
    band(L("다음 과제는", "Your next project"), en
      ? `Your interest came out high in ${nEn(ints[0].value, "area")}, and your work shows in ${shown}. Pick your next project from the areas where your interest is high but you have not done much yet.`
      : `관심이 높은 영역은 ${ints[0].value}곳, 해 본 일이 나온 영역은 ${shown}곳입니다. 관심은 높은데 아직 해 본 일이 적은 영역에서 다음 과제를 고르면 됩니다.`));
}

export function ringPage(x: Inputs, d: X): Page {
  const secs = x.m.domains.map((z) => ({ name: d.name(z.code), fill: ZC[z.zone], ring2: z.interest ? IC[z.interest] : "#f1f2f5", mark: z.zone === "NOT_EXPLORED" ? C.ink2 : "#fff" }));
  const noInt = x.m.domains.some((z) => !z.interest);
  const shown = d.counts.z1 + d.counts.z2 + d.counts.z3;
  const NA = L("응답 없음", "No answer");
  return P(L(`${x.domainWord} 지도`, "Area map"),
    T(L(`${E(x.domainWord)} ${d.counts.domains}곳 가운데 ${shown}곳에서 해 본 일이 확인됐습니다`, `Your work shows in ${shown} of your ${nEn(d.counts.domains, E(x.domainWord))}`),
      L("영역마다 지금 놓인 자리와 관심 정도를 한 바퀴에 그렸어요. 아래 표에 같은 내용을 번호 차례로 적었습니다.", "Where each area sits and how interested you are, in one ring. The table repeats it by number.")) +
    `<div class="wide-art ring-art">${fitH(ring(secs, { size: 400, center: [`${d.counts.z1}`, ZONE_WORD.Z1_EVIDENCE_ESTABLISHED.tag] }), isEn() ? 74 : 84)}</div>` +
    howto([
      ...ZONES.filter((z) => x.m.domains.some((v) => v.zone === z)).map((z) => [ZC[z], L(`안쪽 칸 · ${E(ZONE_WORD[z].tag)}`, `Inner · ${E(ZONE_WORD[z].tag)}`)] as [string, string]),
      ...(["HIGH", "MID", "LOW"] as const).map((v) => [IC[v], L(`바깥 얇은 띠 · 관심 ${BAND_WORD[v]}`, `Outer band · ${BAND_WORD[v]} interest`)] as [string, string]),
      ...(noInt ? [["#f1f2f5", L("바깥 얇은 띠 · 관심 응답 없음", "Outer band · No interest answer")] as [string, string]] : []),
      [L("칸 안 숫자", "Number in a segment"), L("영역 번호(아래 표, 03장과 같은 번호)", "Area number (as in the table and Chapter 03)")],
      [L("가운데 숫자", "Number in the center"), L(`${E(ZONE_WORD.Z1_EVIDENCE_ESTABLISHED.tag)} 수`, `How many areas are a ‘${E(ZONE_WORD.Z1_EVIDENCE_ESTABLISHED.tag)}’`)],
    ], L("칸 하나가 영역 하나예요. 칸 색은 그 영역이 놓인 자리이고, 바깥 띠 색은 그 영역에 관심이 얼마나 있다고 답했는지입니다.", "Each segment is one area. The inner color is its label and the outer band is your interest.")) +
    `<table class="tb tb-xs"><thead><tr>${[L("번호", "No."), L("영역", "Area"), L("놓인 자리", "Label"), L("관심", "Interest"), L("해 본 횟수", "Times done"), L("배울 뜻", "Want to learn")].map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${x.m.domains.map((z, i) => `<tr><td>${i + 1}</td><td><b>${E(d.name(z.code))}</b></td><td>${zoneTag(z.zone)}</td><td>${z.interest ? BAND_WORD[z.interest] : NA}</td><td>${z.experience ? EXP_WORD[z.experience] : NA}</td><td>${z.learning ? BAND_WORD[z.learning] : notAsked()}</td></tr>`).join("")}</tbody></table>`);
}

export function quad(x: Inputs, d: X): Page {
  const en = isEn();
  const dots = x.m.domains.map((z, i) => ({ z, i })).filter(({ z }) => z.interest && z.experience)
    .map(({ z, i }) => ({ label: d.name(z.code), x: z.interest === "HIGH" ? 2 : z.interest === "MID" ? 1 : 0, y: z.experience === "SEVERAL" ? 2 : z.experience === "ONCE_OR_TWICE" ? 1 : 0, color: DC(z.code), n: i + 1 }));
  const nm = (f: (z: (typeof x.m.domains)[number]) => boolean) => x.m.domains.filter(f).map((z) => d.name(z.code));
  const hiDid = nm((z) => z.interest === "HIGH" && z.experience === "SEVERAL");
  const hiNot = nm((z) => z.interest === "HIGH" && z.experience === "NONE");
  const low = nm((z) => z.interest === "LOW");
  const missing = x.m.domains.length - dots.length;
  return P(L("관심과 해 본 횟수", "Interest and experience"),
    T(hiNot.length
      ? L(`관심이 높은데 아직 해 본 적이 없는 영역이 ${hiNot.length}곳 있습니다`, `You have high interest in ${nEn(hiNot.length, "area")} you have not worked in yet`)
      : L("관심과 해 본 횟수를 한 장에 놓았습니다", "Your interest and experience on one page"),
      L("오른쪽 위로 갈수록 하고 싶고 여러 번 해 본 영역이에요.", "The further up and to the right an area sits, the more you want to do it and the more often you have done it.")) +
    `<div class="wide-art">${fitH(quadrant(dots, { width: 680, xNames: en ? ["Low interest", "Medium", "High interest"] : ["관심 낮음", "보통", "관심 높음"], yNames: en ? ["Never done", "Once or twice", "Several times"] : ["해 본 적 없음", "한두 번", "여러 번"] }), 98)}</div>` +
    howto([
      [L("가로축", "Horizontal axis"), L("관심 정도(낮음 · 보통 · 높음)", "Interest (low · medium · high)")],
      [L("세로축", "Vertical axis"), L("해 본 횟수(해 본 적 없음 · 한두 번 · 여러 번)", "How often you have done it (never · once or twice · several times)")],
      [L("점 안 숫자", "Number in a dot"), L("영역 번호(앞 쪽 지도와 같은 번호)", "Area number (the same as on the area map)")],
      [L("점 색", "Dot color"), L("영역을 알아보기 쉽게 나눈 색이고 따로 뜻은 없어요", "Only there to tell the areas apart. It has no other meaning")],
      [Q_HOT, L("관심이 높고 해 본 적도 있는 칸", "High interest, done at least once")],
      [Q_WARM, L("관심은 높은데 아직 해 본 적이 없는 칸", "High interest, never done yet")],
    ], missing ? L(`관심이나 해 본 횟수에 답이 없는 ${missing}곳은 점을 찍지 않았어요.`, `${missing === 1 ? "One area has" : `${missing} areas have`} no answer for interest or experience, so ${missing === 1 ? "it has" : "they have"} no dot.`) : undefined) +
    (() => {
      const ns = en ? [
        hiDid.length ? note("Top right · you want to do it and have done it several times", `${E(hiDid.join(", "))}. Draw the main story for your applications from here.`) : "",
        hiNot.length ? note("Bottom right · you want to do it but have not yet", `${E(hiNot.join(", "))}. Try these next term, even briefly.`, true) : "",
        low.length ? note("Left · low interest", `${E(low.join(", "))}. You can leave these for later.`) : "",
      ] : [
        hiDid.length ? note("오른쪽 위 · 하고 싶고 여러 번 해 본 영역", `${E(hiDid.join(", "))}. 지원서의 중심 이야기는 여기서 꺼내면 됩니다.`) : "",
        hiNot.length ? note("오른쪽 아래 · 하고 싶은데 아직인 영역", `${E(hiNot.join(", "))}. 다음 학기에 짧게라도 겪어 볼 영역입니다.`, true) : "",
        low.length ? note("왼쪽 · 관심이 낮은 영역", `${E(low.join(", "))}. 지금은 뒤로 미뤄 두어도 됩니다.`) : "",
      ];
      const ns1 = ns.filter(Boolean);
      return ns1.length ? `<div class="g${Math.max(ns1.length, 2)}">${ns1.join("")}</div>` : "";
    })() + band(L("이번 학기에", "This term"), en
      ? (hiNot.length
        ? `Find a project this term in an area you are keen on but have not tried, such as ${E(hiNot[0])}. Once you have done it, you can answer ‘yes, I have done this’ next time.`
        : hiDid.length ? `Start by writing up your work in ${E(hiDid[0])} as one paragraph for your applications.` : "Pick one area where your interest is medium or higher and try it in a short project.")
      : (hiNot.length
        ? `${E(hiNot[0])}처럼 관심은 높은데 아직 안 해 본 영역에서 이번 학기 과제를 하나 찾아보세요. 한 번 해 보면 다음 검사에서는 ‘해 본 적 있다’로 답할 수 있습니다.`
        : hiDid.length ? `${E(hiDid[0])}에서 해 본 일을 지원서 한 문단으로 먼저 정리해 보세요.` : "관심이 보통 이상인 영역 하나를 골라 짧은 과제로 겪어 보세요.")));
}

export function bestPage(x: Inputs, d: X): Page {
  const en = isEn();
  const rows = d.best.map((b) => ({ label: d.axisName(b.axis), value: b.level ?? 0, color: LVC[Math.max(1, b.level ?? 0)], note: b.level == null ? notAsked() : b.level === 0 ? LEVEL_KO[0] : b.where.length > 2 ? (en ? `${b.where.slice(0, 2).map(d.name).join(" · ")} +${b.where.length - 2} more` : `${b.where.slice(0, 2).map(d.name).join(" · ")} 외 ${b.where.length - 2}곳`) : b.where.map(d.name).join(" · ") }));
  const owned = d.best.filter((b) => b.level === 3).length;
  const sceneOf = (b: (typeof d.best)[number]) => {
    const td = b.where[0] ?? d.radarDoms[0]?.code ?? x.defs[0]?.code;
    return td ? d.def(td)?.axes?.[b.axis]?.l2 ?? "" : "";
  };
  const did = d.best.filter((b) => (b.level ?? 0) >= 2).length;
  const nAx = AXES.length;
  const head = en
    ? (owned ? `You made the call on ${owned} of the ${nAx} decisions you make at work` : did === nAx ? `You have handled all ${nAx} work decisions yourself` : did ? `You have handled ${did} of the ${nAx} work decisions yourself` : "The deepest step you reached on each decision")
    : (owned ? `일할 때 내리는 판단 ${nAx}가지 가운데 ${owned}가지는 기준까지 직접 정해 봤습니다` : did === nAx ? `일할 때 내리는 판단 ${nAx}가지를 모두 직접 해 봤습니다` : did ? `일할 때 내리는 판단 ${nAx}가지 가운데 ${did}가지를 직접 해 봤습니다` : "판단마다 가장 깊이 해 본 단계를 모았습니다");
  return P(L("판단별 가장 깊은 단계", "Deepest step on each decision"),
    T(head, L("물어본 영역을 모두 놓고, 판단마다 가장 깊이 해 본 단계 하나를 골랐어요.", "Across every area we asked about, we took the deepest step you reached on each decision.")) +
    `<div class="wide-art">${hbars(rows, { max: 3, width: 690, label: en ? 196 : 130, ticks: LEVEL_KO.slice(1), row: 36, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>` +
    howto([
      [LVC[1], LEVEL_KO[1]], [LVC[2], LEVEL_KO[2]], [LVC[3], LEVEL_KO[3]],
      [L("막대 길이", "Bar length"), L("그 판단을 가장 깊이 해 본 단계(위 점선 눈금의 이름)", "The deepest step you reached on that decision (named on the dotted scale above)")],
      [L("막대 끝 글", "Text at the bar end"), L("그 단계가 나온 영역", "The area where that step came from")],
      [L("막대 없음", "No bar"), L(`${E(LEVEL_KO[0])}이라고 답했거나 이번 검사에서 묻지 않은 판단`, `You answered ‘${E(LEVEL_KO[0])}’, or this assessment did not ask about that decision`)],
    ]) +
    `<table class="tb tb-xs"><thead><tr><th>${L("판단", "Decision")}</th><th>${L("무엇을 묻나", "What it asks")}</th><th>${L(`${E(x.major)} 일에서 보이는 모습`, `What it looks like in ${E(x.major)} work`)}</th></tr></thead><tbody>${AXES.map((a) => { const b = d.best.find((z) => z.axis === a)!; return `<tr><th>${E(d.axisName(a))}</th><td>${E(d.axisWhat(a))}</td><td class="mut">${E(sceneOf(b))}</td></tr>`; }).join("")}</tbody></table>`);
}

export function goalPage(x: Inputs, d: X): Page[] {
  const en = isEn();
  const r = d.goalRole ?? d.roleOrder[0];
  const cov = d.roleCover(r);
  const rc = x.m.role_context?.code === r.code ? x.m.role_context : null;
  const ind = d.goalInd;
  const ic = ind && x.m.industry_context?.code === ind.code ? x.m.industry_context : null;
  const rows = cov.req.map((q0) => ({ label: d.axisName(q0.axis), value: q0.level ?? 0, color: LVC[Math.max(1, q0.level ?? 0)], note: q0.level == null ? notAsked() : STEP_WORD[q0.level].tag }));
  const tdZones = ZONES.filter((z) => cov.tds.some((t) => (d.dom(t)?.zone ?? "NOT_EXPLORED") === z));
  /* 영어 글은 길어 한 쪽에 넘치므로 묶음마다 하나씩 덜 싣는다 */
  const cut = en ? 3 : 4;
  const overlap = (rc?.overlap ?? []).slice(0, cut).map((o) => `${d.name(o.domain)} · ${d.axisName(o.axis)}`);
  const requested = (rc?.requested ?? ic?.requested ?? []).slice(0, cut).map((o) => `${d.name(o.domain)} · ${d.axisName(o.axis)}`);
  const hit = cov.z1.length + cov.z2.length;
  const headline = en
    ? (!d.goalRole
      ? `${r.name_ko} is the role your evidence overlaps with most`
      : hit
        ? `Your work shows in ${hit} of the ${nEn(cov.tds.length, "core area")} for ${r.name_ko}, your target role`
        : `To move toward ${r.name_ko}, build experience in ${d.name(cov.tds[0])} first`)
    : (!d.goalRole
      ? `근거가 가장 많이 겹치는 직무는 ${r.name_ko}입니다`
      : hit
        ? `목표 직무 ${r.name_ko}의 핵심 영역 ${cov.tds.length}곳 가운데 ${hit}곳에서 해 본 일이 나왔습니다`
        : `${r.name_ko} 직무로 가려면 ${andJoin(cov.tds.slice(0, 2).map(d.name))} 쪽 경험부터 쌓으면 됩니다`);
  /* 영어 글은 길어 한 쪽에 다 들어가지 않는다. 응답에서 나온 판단 한 묶음과 다른 직무와의 차이만 싣고,
     목표 산업이 먼저 묻는 판단은 04장(산업 쪽)에 맡긴다 */
  const notes = en ? [
    overlap.length ? note("Decisions that came up in both sets of answers", `<ul class="ls">${overlap.map((t) => `<li>${E(t)}</li>`).join("")}</ul><p class="mut sm">They came up in your ${E(x.major)} area answers and in the questions for this role.</p>`)
      : requested.length ? note("Decisions this role and industry look at more", `<ul class="ls">${requested.map((t) => `<li>${E(t)}</li>`).join("")}</ul>`, true) : "",
    (() => { const xs = r.differs_from.filter((v) => okText(v.line)).slice(0, 2); return xs.length ? note("How it differs from other roles", ul(xs.map((v) => `<b>${E(d.roleName(v.vs))}</b> ${E(sentenceEn(v.line))}`)))
      : r.compare_with.length ? note("Roles to compare with", chips(r.compare_with.map(d.roleName)), true) : ""; })(),
  ] : [
    overlap.length ? note("두 쪽 응답에서 모두 나온 판단", `<ul class="ls">${overlap.map((t) => `<li>${E(t)}</li>`).join("")}</ul><p class="mut sm">${E(x.major)} 영역 응답에서도, 이 직무 문항에서도 나온 판단입니다.</p>`) : "",
    requested.length ? note("이 직무와 산업이 더 보는 판단", `<ul class="ls">${requested.map((t) => `<li>${E(t)}</li>`).join("")}</ul>`, true) : "",
    (() => { const xs = r.differs_from.filter((v) => okText(v.line)).slice(0, 3); return xs.length ? note("다른 직무와 다른 점", ul(xs.map((v) => `<b>${E(d.roleName(v.vs))}</b> ${E(polite(v.line))}`))) : ""; })(),
    ind ? (() => { const xs = ind.judgement_dimensions.filter((v) => okText(v.name)).slice(0, 4); return xs.length ? note(`${E(ind.name_ko)}에서 먼저 묻는 판단`, ul(xs.map((v) => `${E(askNoun(v.name))} <span class="mut">${E(d.name(v.domain))}</span> ${pip(d.level(v.domain, v.axis))}`)), true) : ""; })()
      : r.compare_with.length ? note("함께 비교해 볼 직무", chips(r.compare_with.map(d.roleName)), true) : "",
  ];
  const ns = notes.filter(Boolean);
  const pairs: string[] = [];
  for (let i = 0; i < ns.length; i += 2) pairs.push(`<div class="two">${ns[i]}${ns[i + 1] ?? ""}</div>`);
  const am0 = r.application_material[0];
  const indLine = ind ? (okText(ind.result_line) ? ind.result_line : okText(ind.scene) ? ind.scene : "") : "";
  const tail = ind
    ? band(L("목표 산업", "Target industry"), en ? `${E(ind.name_ko)}. ${E(indLine.split(/(?<=\.)\s+/)[0])} Chapter 04 shows what this industry asks about first.` : `${E(ind.name_ko)}. ${E(indLine)}`)
    : am0
      ? (en
        ? band("In your next project", `Put together ${E(lcEn(am0))}, the kind of material ${E(r.name_ko)} applications ask for. If you know the format early, you can use it as soon as you apply.`)
        : band("다음 과제에서", `${E(r.name_ko)} 지원 서류에 들어가는 ${E(j(am0, "을를"))}${/(한 (벌|장|편|권|건|개|줄|쪽|부)|하나)$/.test(am0) ? "" : " 하나"} 만들어 보세요. 형식을 미리 익혀 두면 지원할 때 바로 꺼내 쓸 수 있습니다.`))
      : "";
  const title = L("목표 직무 준비 한눈에", "Readiness for your target role");
  const main = P(title,
    T(E(headline), E(en ? sentenceEn(`The ${r.name_ko} role ${lcEn(r.owns)}`) : `${j(r.name_ko, "은는")} ${polite(r.owns)}`)) +
    `<div class="two">
      <div class="card">${H(L("이 직무가 정하는 것", "What the role decides"), L("직무 안내", "Role guide"))}${chips(r.decides)}<p class="k" style="margin-top:3mm">${L("핵심 영역", "Core areas")}</p><p>${cov.tds.map((t) => `<span class="nw">${E(d.name(t))}<span class="dot" style="background:${ZC[d.dom(t)?.zone ?? "NOT_EXPLORED"]}"></span></span>`).join(" ")}</p><p class="k" style="margin-top:3mm">${L("지원 서류에 쓰는 결과물", "Deliverables used in applications")}</p>${chips(r.application_material, "art")}</div>
      <div class="card">${H(L("특히 보는 판단과 지금 단계", "What it watches"), L("응답", "Your step"))}${hbars(rows, { max: 3, width: en ? 440 : 340, label: en ? 172 : 110, ticks: en ? ["Followed", "Did it", "Made call"] : ["시킨 대로", "직접", "기준까지"], row: 38, valueText: (b) => String((b as { note?: string }).note ?? "") })}${howto([
        ...([1, 2, 3] as const).filter((k) => rows.some((r) => r.value === k)).map((k) => [LVC[k], LEVEL_KO[k]] as [string, string]),
        ...(rows.some((r) => !r.value) ? [[L("막대 없음", "No bar"), L(`${E(LEVEL_KO[0])}이거나 핵심 영역에서 묻지 않은 판단`, `‘${E(LEVEL_KO[0])}’, or not asked in the core areas`)] as [string, string]] : []),
        ...tdZones.map((z) => [ZC[z], L(`왼쪽 핵심 영역 옆 점 · ${E(ZONE_WORD[z].tag)}`, `Dot by a core area on the left · ${E(ZONE_WORD[z].tag)}`)] as [string, string]),
      ], L("막대 길이는 이 직무가 특히 보는 판단을 핵심 영역에서 가장 깊이 해 본 단계예요.", "Bar length is the deepest step you reached, across the core areas, on each decision this role watches."))}</div>
    </div>` +
    pairs.join("") + tail);
  return [main];
}

/**
 * 그 학과 쪽에서 보면.
 *
 * 한 Core 를 여러 학과가 나눠 쓴다(배재대 경영 쪽 학과만 스물이 넘는다). 웹 결과는
 * 학과마다 먼저 보는 영역과 흔히 남기는 것과 그 학과의 한 걸음을 따로 세우는데,
 * 책자에는 그 자리가 없어서 **같은 Core 학생 둘이 학과 이름만 다른 책을 받았다.**
 * 웹과 같은 `specView` 를 읽어 한 쪽에 싣는다.
 *
 * **판정에 닿지 않는다.** 여기 적는 것은 그 학과라면 흔히 보는 것이고, 앞 쪽들의
 * 결과는 응답에서 나온 것이다. 둘이 섞여 읽히지 않게 머리말에서 가른다.
 * 학과 자료가 하나도 없으면 쪽을 세우지 않는다(빈 쪽은 덜 만든 책으로 읽힌다).
 */
export function deptPage(x: Inputs, d: X): Page | null {
  const sv = x.spec;
  const name = x.specialization ?? x.department;
  if (!name) return null;
  const lead = sv.domainLead.map((c) => d.name(c)).filter(Boolean).slice(0, 4);
  const steps = [sv.evidenceFirst, sv.evidenceNext].filter(Boolean);
  if (!lead.length && !sv.artifacts.length && !steps.length && !sv.application.resume) return null;
  const body = [
    T(`${E(name)} 쪽에서 보면`,
      "같은 전공 계열이라도 학과마다 먼저 보는 일과 손에 남기는 결과물이 다릅니다. 이 쪽은 그 학과라면 흔히 보는 것을 적은 안내이고, 앞 쪽의 결과는 검사 응답에서 나온 것입니다."),
    lead.length ? `${H("먼저 보는 영역")}${chips(lead)}` : "",
    sv.scene.length ? `${H("자주 마주치는 장면")}${ul(sv.scene.slice(0, 4).map(E))}` : "",
    sv.artifacts.length ? `${H("흔히 남기는 것", "하나라도 손에 있으면 03장의 근거로 옮겨 적을 수 있습니다")}${chips(sv.artifacts.slice(0, 8))}` : "",
    steps.length ? `${H("지금 할 수 있는 한 걸음")}${ul(steps.map(E))}` : "",
    sv.application.resume ? `${H("지원서에서 꺼내는 법")}<p>${E(sv.application.resume)}</p>` : "",
    sv.application.interview.length ? `${H("면접에서 다시 묻는 질문", "답은 고른 항목과 경험 기록에서 찾습니다")}${ul(sv.application.interview.map(E))}` : "",
    note("이 쪽은 내 결과를 바꾸지 않아요", "학과 안내는 어디부터 읽을지와 예시를 보여 드리는 자료예요. 강점과 비어 있는 판단은 앞 쪽과 02장이 내 응답으로 정한 그대로입니다."),
  ].join("");
  return { ...P(`${name} 쪽에서 보면`, body), keep: true };
}

export function ch1Pages(x: Inputs, d: X): Page[] {
  const dept = deptPage(x, d);
  return [glance(x, d), tree(x, d), dash(x, d), ringPage(x, d), quad(x, d), bestPage(x, d), ...goalPage(x, d), ...(dept ? [dept] : [])];
}
