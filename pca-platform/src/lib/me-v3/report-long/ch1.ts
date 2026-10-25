/**
 * 01 한눈에 보기.
 */
import type { Inputs } from "./types";
import { AXES, BAND_WORD, EXP_WORD, STEP_WORD, ZONE_WORD, ZONES, type Bucket, type X } from "./derive";
import { C, donut, hbars, quadrant, ring } from "./charts";
import { DC, E, H, IC, LVC, PAL, T, ZC, band, chips, note, pip, ul, zoneTag, type Page } from "./kit";
import { GAP_KIND, GAP_WHY, actionHead, actionLine, andJoin, askNoun, j, list3, okText, polite } from "./text";

const P = (title: string, body: string): Page => ({ part: "01", partName: "한눈에 보기", title, body });

export const BUCKET: Record<Bucket, { head: string; act: string; color: string }> = {
  A: { head: "지원서에 바로 쓴다", act: "정한 기준과 결과물 이름을 한 문단으로", color: PAL.blue },
  B: { head: "결과물을 하나 더 남긴다", act: "해 본 일에 비교 기록이나 문서를 붙이기", color: PAL.teal },
  C: { head: "짧은 과제로 겪어 본다", act: "수업이나 동아리에서 4주짜리 과제 하나", color: PAL.amber },
  D: { head: "지금은 미뤄 둔다", act: "다른 영역을 먼저 다지고 필요할 때", color: "#9aa6bb" },
};

export function glance(x: Inputs, d: X): Page {
  const m = x.m;
  const points: { label: string; meaning: string; fact: string; action: string }[] = [];
  const s0 = d.strengths[0];
  if (s0) {
    const ev = d.evidenceOf(s0);
    const said = ev.decisions.length ? ev.decisions : ev.acts;
    const art = d.def(s0.code)?.artifacts[0];
    points.push({
      label: s0.zone === "Z1_EVIDENCE_ESTABLISHED" ? "가장 분명한 강점" : "가장 많이 해 본 영역",
      meaning: ev.artifacts.length
        ? `${d.name(s0.code)}에서는 일을 직접 맡아 했고, 그 결과를 ${j(ev.artifacts[0], "으로")} 남겼습니다.`
        : `${d.name(s0.code)}에서 직접 해 본 판단이 ${s0.confirmed.length}가지 나왔습니다. 그 일을 보여 줄 결과물은 아직 고르지 않았습니다.`,
      fact: said.length ? `고른 항목: ${list3(said)}` : `직접 해 본 판단: ${s0.confirmed.slice(0, 4).map(d.axisName).join(", ")}${s0.confirmed.length > 4 ? ` 외 ${s0.confirmed.length - 4}가지` : ""}`,
      action: s0.zone === "Z1_EVIDENCE_ESTABLISHED"
        ? "06장 자기소개서 재료로 옮겨 한 문단을 써 보세요."
        : `다음 ${d.name(s0.code)} 과제에서는 ${j(art ?? "결과 문서", "을를")} 남겨 두세요.`,
    });
  }
  const g0 = d.gaps[0];
  if (g0) {
    const a = d.actionOf(g0);
    points.push({
      label: "먼저 채울 판단",
      meaning: `${d.name(g0.domain)}${g0.axis ? `의 ${d.axisName(g0.axis)}` : ""}: ${GAP_KIND[g0.kind]}.`,
      fact: `${GAP_WHY[g0.why]}.`,
      action: a ? actionLine(a, d.name(g0.domain), d.def(g0.domain)) : "07장 실행 로드맵에서 언제 할지 정해 보세요.",
    });
  }
  const wish = m.domains.filter((v) => v.interest === "HIGH" && (v.zone === "Z4_INSUFFICIENT_EVIDENCE" || v.zone === "NOT_EXPLORED"));
  if (wish.length) {
    points.push({
      label: "관심은 높고 해 본 일은 적은 영역",
      meaning: `${andJoin(wish.slice(0, 3).map((v) => d.name(v.code)))}에 관심이 높다고 답했습니다. 직접 해 본 일은 아직 적거나, 이번에 자세히 묻지 않은 영역입니다.`,
      fact: (() => {
        const by = new Map<string, string[]>();
        for (const v of wish.slice(0, 3)) { const w = v.experience ? `해 본 횟수 ${EXP_WORD[v.experience]}` : "해 본 횟수 응답 없음"; by.set(w, [...(by.get(w) ?? []), d.name(v.code)]); }
        return [...by].map(([w, ns]) => `${w}: ${ns.join(", ")}`).join(" / ");
      })(),
      action: "이 가운데 하나를 골라 수업이나 동아리에서 4주짜리 과제로 먼저 겪어 보세요.",
    });
  }
  const names = (z: string) => m.domains.filter((v) => v.zone === z).map((v) => d.name(v.code));
  const goal = [d.goalRole?.name_ko, d.goalInd?.name_ko].filter(Boolean).join(" · ");
  const rows: [string, string][] = ([
    ["근거 갖춘 영역", names("Z1_EVIDENCE_ESTABLISHED").join(" · ")],
    ["근거 일부 영역", [...names("Z2_EVIDENCE_INCOMPLETE"), ...names("Z3_EVIDENCE_LOW_INTEREST")].join(" · ")],
    ["관심 높음 · 경험 적음", names("Z4_INSUFFICIENT_EVIDENCE").join(" · ")],
    ["이번에 깊게 묻지 않은 영역", names("NOT_EXPLORED").length ? `${names("NOT_EXPLORED").length}곳` : ""],
    ["목표 직무 · 산업", goal],
    ["응답 품질", m.response_quality.flag === "OK" ? "고르게 답했습니다" : "다시 볼 응답이 있습니다(02장 끝에서 설명)"],
  ] as [string, string][]).filter(([, b]) => b);
  const head = s0
    ? `지금 가장 자신 있게 말할 수 있는 영역은 ${d.name(s0.code)}입니다`
    : "지금은 어디서부터 경험을 쌓을지 정할 때입니다";
  const firstA = g0 ? d.actionOf(g0) : undefined;
  const dek = firstA && g0 ? `이번 학기에 하나만 한다면 ${E(actionHead(firstA, d.name(g0.domain)))}부터 시작해 보세요.` : undefined;
  return P("핵심 진단 요약",
    T(E(head), dek) +
    `<div class="pts">${points.map((p, i) => `<div class="pt"><span class="pt-n">${i + 1}</span><div><p class="k">${E(p.label)}</p><h4>${E(p.meaning)}</h4><p class="mut">${E(p.fact)}</p><p class="pt-a"><b>할 일</b> ${E(p.action)}</p></div></div>`).join("")}</div>` +
    `<table class="tb tb-s"><tbody>${rows.map(([a, b]) => `<tr><th class="w30">${E(a)}</th><td>${E(b)}</td></tr>`).join("")}</tbody></table>`);
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

export function tree(x: Inputs, d: X): Page {
  const groups: Record<Bucket, string[]> = { A: [], B: [], C: [], D: [] };
  x.m.domains.forEach((v) => groups[d.bucket(v)].push(d.name(v.code)));
  const Wd = 700, Hd = 500;
  const box = (cx: number, y: number, w: number, h: number, fill: string, stroke: string, ls: string[], o: { size?: number; color?: string; weight?: number } = {}) =>
    `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="${Math.min(22, h / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>` +
    svgText(ls, cx, y + h / 2 - ((ls.length - 1) * (o.size ?? 12) * 1.35) / 2 + (o.size ?? 12) * 0.36, o);
  const edge = (x1: number, y1: number, x2: number, y2: number, label: string) => {
    const my = (y1 + y2) / 2;
    return `<path d="M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}" fill="none" stroke="#b7c2d6" stroke-width="2"/>` +
      `<rect x="${(x1 + x2) / 2 - 18}" y="${my - 10}" width="36" height="19" rx="9.5" fill="#fff" stroke="#b7c2d6"/>` +
      svgText([label], (x1 + x2) / 2, my + 4, { size: 10.5, color: C.ink2, weight: 700 });
  };
  const leafX = [92, 268, 444, 616];
  const keys: Bucket[] = ["A", "B", "C", "D"];
  const svg = `<svg viewBox="0 0 ${Wd} ${Hd}" width="100%" xmlns="http://www.w3.org/2000/svg">
    ${edge(350, 52, 190, 102, "있음")}${edge(350, 52, 530, 102, "없음")}
    ${edge(190, 150, leafX[0], 214, "예")}${edge(190, 150, leafX[1], 214, "아직")}
    ${edge(530, 150, leafX[2], 214, "예")}${edge(530, 150, leafX[3], 214, "아니오")}
    ${box(350, 6, 320, 46, C.navy, C.navy, [`내 결과 · ${d.counts.domains}가지 ${x.domainWord}`], { size: 14, color: "#fff", weight: 800 })}
    ${box(190, 102, 250, 48, "#eef3fc", "#c9d6ee", ["직접 해 본 일이", "확인됐나요?"], { size: 11.5, color: C.navy, weight: 700 })}
    ${box(530, 102, 250, 48, "#eef3fc", "#c9d6ee", ["관심이나 배울 뜻이", "높게 나왔나요?"], { size: 11.5, color: C.navy, weight: 700 })}
    ${keys.map((k, i) => {
      const b = BUCKET[k], cx = leafX[i], g = groups[k], top = 214;
      const listed = g.length > 8 ? [...g.slice(0, 7), `외 ${g.length - 7}곳`] : g;
      return `<rect x="${cx - 82}" y="${top}" width="164" height="${Hd - top - 4}" rx="18" fill="#fff" stroke="${b.color}" stroke-width="1.6"/>
        <rect x="${cx - 82}" y="${top}" width="164" height="50" rx="18" fill="${b.color}"/><rect x="${cx - 82}" y="${top + 30}" width="164" height="20" fill="${b.color}"/>
        ${svgText(wrapT(b.head, 10), cx, top + 21, { size: 12.5, color: "#fff", weight: 800 })}
        ${svgText([`${g.length}곳`], cx, top + 74, { size: 20, color: b.color === "#9aa6bb" ? C.ink2 : b.color, weight: 800 })}
        ${listed.length ? svgText(listed.flatMap((t) => wrapT(t, 11)).slice(0, 12), cx, top + 100, { size: 10.5, color: C.ink, weight: 600, lh: 1.42 }) : ""}
        ${svgText(wrapT(b.act, 12), cx, Hd - 34, { size: 9.5, color: C.ink3, weight: 500 })}`;
    }).join("")}
  </svg>`;
  return P("결과에 따라 무엇을 할까",
    T(`${d.counts.domains}가지 ${E(j(x.domainWord, "은는"))} 지금 할 일에 따라 네 갈래로 나뉩니다`, "직접 해 본 일이 나왔는지, 관심이나 배울 뜻이 높은지 두 가지만 물어 나눴습니다. 갈래마다 이번 학기에 할 일이 다릅니다.") +
    `<div class="wide-art">${svg}</div>` +
    (() => { const ks = keys.filter((k) => groups[k].length); return `<div class="g${ks.length >= 4 ? 4 : Math.max(ks.length, 2)}">${ks.map((k) => `<div class="b4" style="--c:${BUCKET[k].color}"><b>${E(BUCKET[k].head)}</b><p>${groups[k].map(E).join(" · ")}</p></div>`).join("")}</div>`; })() +
    band("이번 학기에는", (() => {
      const ab = groups.A.length + groups.B.length, c = groups.C.length;
      const try1 = c ? `${E(groups.C[0])}처럼 ‘짧은 과제로 겪어 본다’에 든 ${c}곳 가운데 하나를 4주 과제로 골라 보세요.` : "관심 가는 영역 하나를 골라 4주 과제로 시작해 보세요.";
      return ab ? `${ab}곳은 이미 해 본 일을 지원서 근거로 정리하면 되는 영역입니다. 여기에 더해 ${try1}` : try1;
    })()));
}

export function dash(x: Inputs, d: X): Page {
  const k = d.counts;
  const zoneParts = ZONES.map((z) => ({ label: ZONE_WORD[z].tag, value: x.m.domains.filter((v) => v.zone === z).length, color: ZC[z] })).filter((p) => p.value);
  const ints = (["HIGH", "MID", "LOW"] as const).map((v) => ({ label: `관심 ${BAND_WORD[v]}`, value: x.m.domains.filter((z) => z.interest === v).length, color: IC[v] }));
  const noAns = x.m.domains.filter((z) => !z.interest).length;
  if (noAns) ints.push({ label: "관심 응답 없음", value: noAns, color: "#d7dbe3" });
  const all: [string, number, string, string][] = [
    ["기준까지 직접 정한 판단", k.owned, "개", "물은 영역 전체에서"], ["직접 해 본 판단", k.confirmed, "개", "기준까지 정한 것 포함"],
    ["고른 항목", k.items, "개", k.artifacts ? `그중 결과물 ${k.artifacts}개` : "해 본 일과 남긴 것"], ["경험 기록", k.records, "건", "플랫폼에 적어 둔 활동"],
    ["근거 갖춘 영역", k.z1, "곳", `${k.domains}가지 ${x.domainWord} 가운데`], ["먼저 채울 판단", k.gaps, "곳", "영역과 판단으로 센 수"],
  ];
  const tiles = all.filter((t) => t[1] > 0);
  if (!tiles.length) tiles.push(all[1]);
  return P("숫자로 본 근거",
    T(k.confirmed ? (k.owned ? `직접 해 본 판단은 ${k.confirmed}개이고, 그중 ${k.owned}개는 기준까지 정했습니다` : `직접 해 본 판단은 ${k.confirmed}개입니다`) : "판단 단계로 센 것은 아직 많지 않습니다") +
    `<div class="kpis">${tiles.map(([a, b, u, c]) => `<div class="kpi"><p>${E(a)}</p><b>${b}<small>${u}</small></b><span>${E(c)}</span></div>`).join("")}</div>` +
    `<div class="two">
      <div class="card cen">${H(`${E(j(x.domainWord, "은는"))} 어디에 놓였나`, "묶음")}${donut(zoneParts, { size: 220, center: [`${k.z1 + k.z2 + k.z3}`, "해 본 일이 확인된 영역"] })}<div class="lg">${zoneParts.map((p) => `<span><i style="background:${p.color}"></i>${E(p.label)} ${p.value}곳</span>`).join("")}</div></div>
      <div class="card cen">${H("관심은 어떻게 나뉘었나", "관심 응답")}${donut(ints, { size: 220, center: [`${ints[0].value}`, "관심 높은 영역"] })}<div class="lg">${ints.map((p) => `<span><i style="background:${p.color}"></i>${E(p.label)} ${p.value}곳</span>`).join("")}</div></div>
    </div>` +
    band("다음 과제는", `관심이 높은 영역은 ${ints[0].value}곳, 해 본 일이 나온 영역은 ${k.z1 + k.z2 + k.z3}곳입니다. 관심은 높은데 아직 해 본 일이 적은 영역에서 다음 과제를 고르면 됩니다.`));
}

export function ringPage(x: Inputs, d: X): Page {
  const secs = x.m.domains.map((z) => ({ name: d.name(z.code), fill: ZC[z.zone], ring2: z.interest ? IC[z.interest] : "#f1f2f5", mark: z.zone === "NOT_EXPLORED" ? C.ink2 : "#fff" }));
  return P(`${x.domainWord} 지도`,
    T(`${d.counts.domains}가지 ${E(x.domainWord)} 가운데 ${d.counts.z1 + d.counts.z2 + d.counts.z3}곳에서 해 본 일이 확인됐습니다`, "안쪽 색은 영역 묶음, 바깥 얇은 띠는 관심 정도입니다. 숫자는 영역 번호이고 03장의 쪽 번호와 같습니다.") +
    `<div class="wide-art ring-art">${ring(secs, { size: 400, center: [`${d.counts.z1}`, "근거 갖춘 영역"] })}</div>` +
    `<div class="lg">${ZONES.filter((z) => x.m.domains.some((v) => v.zone === z)).map((z) => `<span><i style="background:${ZC[z]}"></i>${E(ZONE_WORD[z].tag)}</span>`).join("")}${(["HIGH", "MID", "LOW"] as const).map((v) => `<span><i class="thin" style="background:${IC[v]}"></i>관심 ${BAND_WORD[v]}</span>`).join("")}</div>` +
    `<table class="tb tb-xs"><thead><tr><th>번호</th><th>영역</th><th>묶음</th><th>관심</th><th>해 본 횟수</th><th>배울 뜻</th></tr></thead><tbody>${x.m.domains.map((z, i) => `<tr><td>${i + 1}</td><td><b>${E(d.name(z.code))}</b></td><td>${zoneTag(z.zone)}</td><td>${z.interest ? BAND_WORD[z.interest] : "응답 없음"}</td><td>${z.experience ? EXP_WORD[z.experience] : "응답 없음"}</td><td>${z.learning ? BAND_WORD[z.learning] : "묻지 않음"}</td></tr>`).join("")}</tbody></table>`);
}

export function quad(x: Inputs, d: X): Page {
  const dots = x.m.domains.map((z, i) => ({ z, i })).filter(({ z }) => z.interest && z.experience)
    .map(({ z, i }) => ({ label: d.name(z.code), x: z.interest === "HIGH" ? 2 : z.interest === "MID" ? 1 : 0, y: z.experience === "SEVERAL" ? 2 : z.experience === "ONCE_OR_TWICE" ? 1 : 0, color: DC(z.code), n: i + 1 }));
  const nm = (f: (z: (typeof x.m.domains)[number]) => boolean) => x.m.domains.filter(f).map((z) => d.name(z.code));
  const hiDid = nm((z) => z.interest === "HIGH" && z.experience === "SEVERAL");
  const hiNot = nm((z) => z.interest === "HIGH" && z.experience === "NONE");
  const low = nm((z) => z.interest === "LOW");
  return P("관심과 해 본 횟수",
    T(hiNot.length ? `관심이 높은데 아직 해 본 적이 없는 영역이 ${hiNot.length}곳 있습니다` : "관심과 해 본 횟수를 한 장에 놓았습니다", "가로는 관심 정도, 세로는 해 본 횟수입니다. 오른쪽 위로 갈수록 하고 싶고 여러 번 해 본 영역입니다.") +
    `<div class="wide-art">${quadrant(dots, { width: 680, xNames: ["관심 낮음", "보통", "관심 높음"], yNames: ["해 본 적 없음", "한두 번", "여러 번"] })}</div>` +
    (() => {
      const ns = [
        hiDid.length ? note("오른쪽 위 · 하고 싶고 여러 번 해 본 영역", `${E(hiDid.join(", "))}. 지원서의 중심 이야기는 여기서 꺼내면 됩니다.`) : "",
        hiNot.length ? note("오른쪽 아래 · 하고 싶은데 아직인 영역", `${E(hiNot.join(", "))}. 다음 학기에 짧게라도 겪어 볼 영역입니다.`, true) : "",
        low.length ? note("왼쪽 · 관심이 낮은 영역", `${E(low.join(", "))}. 지금은 뒤로 미뤄 두어도 됩니다.`) : "",
      ].filter(Boolean);
      return ns.length ? `<div class="g${Math.max(ns.length, 2)}">${ns.join("")}</div>` : "";
    })() + band("상담에서", hiNot.length
      ? `${E(hiNot[0])}처럼 관심은 높은데 아직 안 해 본 영역에서 이번 학기 과제를 하나 찾아보세요. 한 번 해 보면 다음 검사에서는 ‘해 본 적 있다’로 답할 수 있습니다.`
      : hiDid.length ? `${E(hiDid[0])}에서 해 본 일을 지원서 한 문단으로 먼저 정리해 보세요.` : "관심이 보통 이상인 영역 하나를 골라 짧은 과제로 겪어 보세요."));
}

export function bestPage(x: Inputs, d: X): Page {
  const rows = d.best.map((b) => ({ label: d.axisName(b.axis), value: b.level ?? 0, color: LVC[Math.max(1, b.level ?? 0)], note: b.level == null ? "이번에 묻지 않음" : b.where.length > 2 ? `${b.where.slice(0, 2).map(d.name).join(" · ")} 외 ${b.where.length - 2}곳` : b.where.map(d.name).join(" · ") }));
  const owned = d.best.filter((b) => b.level === 3).length;
  const sceneOf = (b: (typeof d.best)[number]) => {
    const td = b.where[0] ?? d.radarDoms[0]?.code ?? x.defs[0]?.code;
    return td ? d.def(td)?.axes?.[b.axis]?.l2 ?? "" : "";
  };
  const did = d.best.filter((b) => (b.level ?? 0) >= 2).length;
  return P("판단별 가장 깊은 단계",
    T(owned ? `여덟 판단 가운데 ${owned}가지는 기준까지 직접 정해 봤습니다` : did === 8 ? "여덟 판단을 모두 직접 해 봤습니다" : did ? `여덟 판단 가운데 ${did}가지를 직접 해 봤습니다` : "판단마다 가장 깊이 해 본 단계를 모았습니다", "영역과 관계없이 판단마다 가장 깊이 해 본 단계를 골랐고, 막대 오른쪽에 그 단계가 나온 영역을 적었습니다.") +
    `<div class="wide-art">${hbars(rows, { max: 3, width: 690, label: 130, ticks: ["지시받아 수행", "직접 수행", "기준까지 결정"], row: 36, valueText: (b) => String((b as { note?: string }).note ?? "") })}</div>` +
    `<table class="tb tb-xs"><thead><tr><th>판단</th><th>무엇을 묻나</th><th>${E(x.major)} 일에서 보이는 모습</th></tr></thead><tbody>${AXES.map((a) => { const b = d.best.find((z) => z.axis === a)!; return `<tr><th>${E(d.axisName(a))}</th><td>${E(d.axisWhat(a))}</td><td class="mut">${E(sceneOf(b))}</td></tr>`; }).join("")}</tbody></table>`);
}

export function goalPage(x: Inputs, d: X): Page {
  const r = d.goalRole ?? d.roleOrder[0];
  const cov = d.roleCover(r);
  const rc = x.m.role_context?.code === r.code ? x.m.role_context : null;
  const ind = d.goalInd;
  const ic = ind && x.m.industry_context?.code === ind.code ? x.m.industry_context : null;
  const rows = cov.req.map((q0) => ({ label: d.axisName(q0.axis), value: q0.level ?? 0, color: LVC[Math.max(1, q0.level ?? 0)], note: q0.level == null ? "이번에 묻지 않음" : STEP_WORD[q0.level].tag }));
  const overlap = (rc?.overlap ?? []).slice(0, 4).map((o) => `${d.name(o.domain)} · ${d.axisName(o.axis)}`);
  const requested = (rc?.requested ?? ic?.requested ?? []).slice(0, 4).map((o) => `${d.name(o.domain)} · ${d.axisName(o.axis)}`);
  const hit = cov.z1.length + cov.z2.length;
  const headline = !d.goalRole
    ? `근거가 가장 많이 겹치는 직무는 ${r.name_ko}입니다`
    : hit
      ? `목표 직무 ${r.name_ko}의 핵심 영역 ${cov.tds.length}곳 가운데 ${hit}곳에서 해 본 일이 나왔습니다`
      : `${r.name_ko} 직무로 가려면 ${andJoin(cov.tds.slice(0, 2).map(d.name))} 쪽 경험부터 쌓으면 됩니다`;
  const notes = [
    overlap.length ? note("두 쪽 말로 다 설명할 수 있는 판단", `<ul class="ls">${overlap.map((t) => `<li>${E(t)}</li>`).join("")}</ul><p class="mut sm">${E(x.major)} 영역 응답에서도, 이 직무 문항에서도 나온 판단입니다.</p>`) : "",
    requested.length ? note("이 직무와 산업이 더 보는 판단", `<ul class="ls">${requested.map((t) => `<li>${E(t)}</li>`).join("")}</ul>`, true) : "",
    (() => { const xs = r.differs_from.filter((v) => okText(v.line)).slice(0, 3); return xs.length ? note("다른 직무와 다른 점", ul(xs.map((v) => `<b>${E(d.roleName(v.vs))}</b> ${E(polite(v.line))}`))) : ""; })(),
    ind ? (() => { const xs = ind.judgement_dimensions.filter((v) => okText(v.name)).slice(0, 4); return xs.length ? note(`${E(ind.name_ko)}에서 먼저 묻는 판단`, ul(xs.map((v) => `${E(askNoun(v.name))} <span class="mut">${E(d.name(v.domain))}</span> ${pip(d.level(v.domain, v.axis))}`)), true) : ""; })()
      : r.compare_with.length ? note("함께 비교해 볼 직무", chips(r.compare_with.map(d.roleName)), true) : "",
  ].filter(Boolean);
  const pairs: string[] = [];
  for (let i = 0; i < notes.length; i += 2) pairs.push(`<div class="two">${notes[i]}${notes[i + 1] ?? ""}</div>`);
  const tail = ind
    ? band("목표 산업", `${E(ind.name_ko)}. ${E(okText(ind.result_line) ? ind.result_line : okText(ind.scene) ? ind.scene : "")}`)
    : r.application_material[0] ? band("다음 과제에서", `${E(r.name_ko)} 지원 서류에 들어가는 ${E(j(r.application_material[0], "을를"))}${/(한 (벌|장|편|권|건|개|줄|쪽|부)|하나)$/.test(r.application_material[0]) ? "" : " 하나"} 만들어 보세요. 형식을 미리 익혀 두면 지원할 때 바로 꺼내 쓸 수 있습니다.`) : "";
  return P("목표 직무 준비 한눈에",
    T(E(headline), E(`${j(r.name_ko, "은는")} ${polite(r.owns)}`)) +
    `<div class="two">
      <div class="card">${H("이 직무가 정하는 것", "직무 안내")}${chips(r.decides)}<p class="k" style="margin-top:3mm">핵심 영역</p><p>${cov.tds.map((t) => `<span class="nw">${E(d.name(t))}<span class="dot" style="background:${ZC[d.dom(t)?.zone ?? "NOT_EXPLORED"]}"></span></span>`).join(" ")}</p><p class="k" style="margin-top:3mm">지원 서류에 쓰는 결과물</p>${chips(r.application_material, "art")}</div>
      <div class="card">${H("특히 보는 판단과 지금 단계", "응답")}${hbars(rows, { max: 3, width: 340, label: 110, ticks: ["지시받아", "직접", "기준까지"], row: 44, valueText: (b) => String((b as { note?: string }).note ?? "") })}<p class="mut sm">단계는 핵심 영역 가운데 가장 깊이 해 본 것을 씁니다.</p></div>
    </div>` +
    pairs.join("") + tail);
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
    note("이 쪽은 점수에 들어가지 않습니다", "학과 안내는 읽는 차례와 예시를 돕는 자료입니다. 강점과 비어 있는 판단은 앞 쪽과 02장이 응답으로 정한 그대로입니다."),
  ].join("");
  return { ...P(`${name} 쪽에서 보면`, body), keep: true };
}

export function ch1Pages(x: Inputs, d: X): Page[] {
  const dept = deptPage(x, d);
  return [glance(x, d), tree(x, d), dash(x, d), ringPage(x, d), quad(x, d), bestPage(x, d), goalPage(x, d), ...(dept ? [dept] : [])];
}
