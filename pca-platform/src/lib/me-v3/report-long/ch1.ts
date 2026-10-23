/**
 * 01 한눈에 보기.
 */
import type { Inputs } from "./types";
import { AXES, BAND_WORD, EXP_WORD, STEP_WORD, ZONE_WORD, ZONES, type Bucket, type X } from "./derive";
import { C, donut, hbars, quadrant, ring } from "./charts";
import { DC, E, H, IC, LVC, PAL, T, ZC, band, chips, note, pip, ul, zoneTag, type Page } from "./kit";
import { GAP_KIND, GAP_WHY, actionLine, andJoin, askNoun, j, list3, okText, polite } from "./text";

const P = (title: string, body: string): Page => ({ part: "01", partName: "한눈에 보기", title, body });

export const BUCKET: Record<Bucket, { head: string; act: string; color: string }> = {
  A: { head: "지원서에 바로 쓴다", act: "정한 기준과 결과물 이름을 한 문단으로", color: PAL.blue },
  B: { head: "결과물을 하나 더 남긴다", act: "해 본 일에 비교 기록이나 문서를 붙이기", color: PAL.teal },
  C: { head: "짧은 과제로 겪어 본다", act: "수업이나 동아리에서 4주짜리 과제 하나", color: PAL.amber },
  D: { head: "지금은 미뤄 둔다", act: "다른 영역을 먼저 다지고 필요할 때", color: "#9aa6bb" },
};

export function glance(x: Inputs, d: X): Page {
  const m = x.m;
  const points: { label: string; meaning: string; fact: string; action: string; limit: string }[] = [];
  const s0 = d.strengths[0];
  if (s0) {
    const ev = d.evidenceOf(s0);
    const said = ev.decisions.length ? ev.decisions : ev.acts;
    points.push({
      label: s0.zone === "Z1_EVIDENCE_ESTABLISHED" ? "가장 분명한 강점" : "가장 많이 해 본 영역",
      meaning: ev.artifacts.length
        ? `${d.name(s0.code)}의 일을 스스로 맡아 해 봤고, 그 결과를 ${j(ev.artifacts[0], "으로")} 남겼다는 점이 가장 분명하게 확인됩니다.`
        : `${d.name(s0.code)}에서 스스로 해 본 판단 ${s0.confirmed.length}가지가 확인됩니다. 그 일을 보여 줄 결과물은 아직 고르지 않았습니다.`,
      fact: said.length ? `고른 장면: ${list3(said)}` : `응답에서 판단 ${s0.confirmed.length}가지를 스스로 해 봤다고 답했습니다.`,
      action: s0.zone === "Z1_EVIDENCE_ESTABLISHED" ? "06장의 자기소개서 재료로 옮겨 한 문단을 씁니다." : "같은 일을 한 번 더 할 때 결과물 하나를 남깁니다.",
      limit: "결과물의 완성도와 실제 성과 수치는 이 검사로 확인하지 않았습니다.",
    });
  }
  const g0 = d.gaps[0];
  if (g0) {
    const a = d.actionOf(g0);
    points.push({
      label: "먼저 채울 빈자리",
      meaning: `${d.name(g0.domain)}${g0.axis ? `의 ${d.axisName(g0.axis)}` : ""}: ${GAP_KIND[g0.kind]}.`,
      fact: `${GAP_WHY[g0.why]}.`,
      action: a ? actionLine(a, d.name(g0.domain), d.def(g0.domain)) : "07장에서 할 일을 정합니다.",
      limit: "빈자리는 이번 응답과 고른 근거에서 아직 보이지 않은 자리입니다. 해 본 적이 없다는 판정으로 읽지 않습니다.",
    });
  }
  const wish = m.domains.filter((v) => v.interest === "HIGH" && (v.zone === "Z4_INSUFFICIENT_EVIDENCE" || v.zone === "NOT_EXPLORED"));
  if (wish.length) {
    points.push({
      label: "관심은 높고 경험은 적은 영역",
      meaning: `${andJoin(wish.slice(0, 3).map((v) => d.name(v.code)))}에 관심이 높다고 답했고, 직접 해 본 일은 아직 적거나 이번에 깊게 묻지 않았습니다.`,
      fact: `관심 응답: ${wish.slice(0, 3).map((v) => `${d.name(v.code)} 높음 · 해 본 횟수 ${EXP_WORD[v.experience ?? ""] ?? "응답 없음"}`).join(" / ")}`,
      action: "이 가운데 하나를 골라 4주짜리 과제로 먼저 겪어 봅니다.",
      limit: "관심은 응답한 날의 마음입니다. 겪어 본 뒤에 달라질 수 있습니다.",
    });
  }
  const names = (z: string) => m.domains.filter((v) => v.zone === z).map((v) => d.name(v.code));
  const rows: [string, string][] = [
    ["근거 갖춘 영역", names("Z1_EVIDENCE_ESTABLISHED").join(" · ") || "아직 없음"],
    ["근거 일부 영역", [...names("Z2_EVIDENCE_INCOMPLETE"), ...names("Z3_EVIDENCE_LOW_INTEREST")].join(" · ") || "아직 없음"],
    ["관심 높음 · 경험 적음", names("Z4_INSUFFICIENT_EVIDENCE").join(" · ") || "해당 없음"],
    ["이번에 깊게 묻지 않은 영역", `${names("NOT_EXPLORED").length}곳`],
    ["목표 직무 · 산업", [d.goalRole?.name_ko, d.goalInd?.name_ko].filter(Boolean).join(" · ") || "적어 두지 않음"],
    ["응답 품질", m.response_quality.flag === "OK" ? "고르게 답했고 다시 볼 응답은 없습니다" : "다시 볼 응답이 있습니다(02장 끝에서 설명)"],
  ];
  const head = s0
    ? `지금 설명할 수 있는 일은 ${d.name(s0.code)} 쪽에 가장 많이 모여 있습니다`
    : "지금은 어디서부터 경험을 쌓을지 정하는 단계입니다";
  return P("핵심 진단 요약",
    T(E(head), "세 가지만 먼저 읽으면 됩니다. 확인된 사실, 그 뜻, 해석의 한계, 할 일을 차례로 적었습니다.") +
    `<div class="pts">${points.map((p, i) => `<div class="pt"><span class="pt-n">${i + 1}</span><div><p class="k">${E(p.label)}</p><h4>${E(p.meaning)}</h4><p class="mut">${E(p.fact)}</p><p class="pt-a"><b>할 일</b> ${E(p.action)}</p><p class="pt-l">${E(p.limit)}</p></div></div>`).join("")}</div>` +
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
    `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>` +
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
      return `<rect x="${cx - 82}" y="${top}" width="164" height="${Hd - top - 4}" rx="10" fill="#fff" stroke="${b.color}" stroke-width="1.6"/>
        <rect x="${cx - 82}" y="${top}" width="164" height="50" rx="10" fill="${b.color}"/><rect x="${cx - 82}" y="${top + 38}" width="164" height="12" fill="${b.color}"/>
        ${svgText(wrapT(b.head, 10), cx, top + 21, { size: 12.5, color: "#fff", weight: 800 })}
        ${svgText([`${g.length}곳`], cx, top + 74, { size: 20, color: b.color === "#9aa6bb" ? C.ink2 : b.color, weight: 800 })}
        ${svgText(listed.length ? listed.flatMap((t) => wrapT(t, 11)).slice(0, 12) : ["해당 영역 없음"], cx, top + 100, { size: 10.5, color: C.ink, weight: 600, lh: 1.42 })}
        ${svgText(wrapT(b.act, 12), cx, Hd - 34, { size: 9.5, color: C.ink3, weight: 500 })}`;
    }).join("")}
  </svg>`;
  return P("결과에 따라 무엇을 할까",
    T(`${d.counts.domains}가지 ${E(x.domainWord)}은 지금 할 일에 따라 네 갈래로 나뉩니다`, "두 가지 질문만 따라가면 영역마다 이번 학기에 무엇을 할지 정해집니다. 갈래는 결과 모델의 묶음과 관심·배울 뜻 응답으로 정했고, 점수는 쓰지 않았습니다.") +
    `<div class="wide-art">${svg}</div>` +
    `<div class="g4">${keys.map((k) => `<div class="b4" style="--c:${BUCKET[k].color}"><b>${E(BUCKET[k].head)}</b><p>${groups[k].length ? groups[k].map(E).join(" · ") : "해당 영역 없음"}</p></div>`).join("")}</div>` +
    band("이번 학기에는", groups.A.length + groups.B.length
      ? `왼쪽 두 갈래(${groups.A.length + groups.B.length}곳)는 이미 해 본 일을 지원서 근거로 바꾸는 자리입니다. ‘짧은 과제로 겪어 본다’ ${groups.C.length}곳 가운데 하나를 골라 4주 과제로 시작하면 됩니다.`
      : `아직 해 본 일이 확인된 영역이 없습니다. ‘짧은 과제로 겪어 본다’ ${groups.C.length}곳 가운데 하나를 골라 4주 과제로 시작하면 됩니다.`));
}

export function dash(x: Inputs, d: X): Page {
  const k = d.counts;
  const zoneParts = ZONES.map((z) => ({ label: ZONE_WORD[z].tag, value: x.m.domains.filter((v) => v.zone === z).length, color: ZC[z] })).filter((p) => p.value);
  const ints = (["HIGH", "MID", "LOW"] as const).map((v) => ({ label: `관심 ${BAND_WORD[v]}`, value: x.m.domains.filter((z) => z.interest === v).length, color: IC[v] }));
  const noAns = x.m.domains.filter((z) => !z.interest).length;
  if (noAns) ints.push({ label: "관심 응답 없음", value: noAns, color: "#d7dbe3" });
  const tiles: [string, number, string, string][] = [
    ["기준까지 직접 정한 판단", k.owned, "개", "물은 영역 전체에서"], ["직접 해 본 판단", k.confirmed, "개", "기준까지 정한 것 포함"],
    ["고른 장면과 결과물", k.items, "개", `그중 결과물 ${k.artifacts}개`], ["경험 기록", k.records, "건", "플랫폼에 적어 둔 활동"],
    ["근거 갖춘 영역", k.z1, "곳", `${k.domains}가지 ${x.domainWord} 가운데`], ["먼저 채울 빈자리", k.gaps, "곳", "판단 단위"],
  ];
  return P("숫자로 본 근거",
    T("세어 보면 이렇습니다", "아래 수는 모두 센 개수이고 점수로 바꾸지 않았습니다. 무엇을 얼마나 골랐고, 어디에 근거가 모였는지만 보여 줍니다.") +
    `<div class="kpis">${tiles.map(([a, b, u, c]) => `<div class="kpi"><p>${E(a)}</p><b>${b}<small>${u}</small></b><span>${E(c)}</span></div>`).join("")}</div>` +
    `<div class="two">
      <div class="card cen">${H(`${E(x.domainWord)}은 어디에 놓였나`, "묶음")}${donut(zoneParts, { size: 220, center: [`${k.z1 + k.z2 + k.z3}`, "해 본 일이 확인된 영역"] })}<div class="lg">${zoneParts.map((p) => `<span><i style="background:${p.color}"></i>${E(p.label)} ${p.value}곳</span>`).join("")}</div></div>
      <div class="card cen">${H("관심은 어떻게 나뉘었나", "관심 응답")}${donut(ints, { size: 220, center: [`${ints[0].value}`, "관심 높은 영역"] })}<div class="lg">${ints.map((p) => `<span><i style="background:${p.color}"></i>${E(p.label)} ${p.value}곳</span>`).join("")}</div></div>
    </div>` +
    band("읽는 법", `관심이 높은 영역은 ${ints[0].value}곳이고, 해 본 일이 확인된 영역은 ${k.z1 + k.z2 + k.z3}곳입니다. 관심이 높은데 아직 해 본 일이 적은 영역이 다음 활동에서 경험을 만들 자리입니다.`));
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
    T(hiNot.length ? `관심이 높은데 아직 해 본 적이 없는 영역이 ${hiNot.length}곳 있습니다` : "관심과 해 본 횟수를 한 장에 놓았습니다", "가로는 관심 정도, 세로는 그 영역을 해 본 횟수입니다. 둘 다 응답 그대로이고, 오른쪽 위로 갈수록 하고 싶고 해 본 영역입니다.") +
    `<div class="wide-art">${quadrant(dots, { width: 680, xNames: ["관심 낮음", "보통", "관심 높음"], yNames: ["해 본 적 없음", "한두 번", "여러 번"] })}</div>` +
    `<div class="g3">
      ${note("오른쪽 위 · 하고 싶고 여러 번 해 본 영역", hiDid.length ? `${E(hiDid.join(", "))}. 지원서의 중심 이야기가 여기서 나옵니다.` : "해당하는 영역이 아직 없습니다.")}
      ${note("오른쪽 아래 · 하고 싶은데 아직인 영역", hiNot.length ? `${E(hiNot.join(", "))}. 다음 학기에 짧게라도 겪어 볼 영역입니다.` : "해당하는 영역이 없습니다.", true)}
      ${note("왼쪽 · 관심이 낮은 영역", low.length ? `${E(low.join(", "))}. 지금은 우선순위에서 내려 두어도 됩니다.` : "관심이 낮다고 답한 영역은 없습니다.")}
    </div>` + band("상담에서", "오른쪽 아래 칸의 영역 하나를 골라 이번 학기에 짧게라도 겪어 볼 수 있는 과제를 함께 찾아보세요. 겪어 본 뒤에는 다음 검사에서 그 영역을 ‘해 본 적 있다’로 답할 수 있습니다."));
}

export function bestPage(x: Inputs, d: X): Page {
  const rows = d.best.map((b) => ({ label: d.axisName(b.axis), value: b.level ?? 0, color: LVC[Math.max(1, b.level ?? 0)], note: b.level == null ? "이번에 묻지 않음" : b.where.length > 2 ? `${b.where.slice(0, 2).map(d.name).join(" · ")} 외 ${b.where.length - 2}곳` : b.where.map(d.name).join(" · ") }));
  const owned = d.best.filter((b) => b.level === 3).length;
  const sceneOf = (b: (typeof d.best)[number]) => {
    const td = b.where[0] ?? d.radarDoms[0]?.code ?? x.defs[0]?.code;
    return td ? d.def(td)?.axes?.[b.axis]?.l2 ?? "" : "";
  };
  return P("판단 여덟 가지의 가장 깊은 단계",
    T(owned ? `여덟 판단 가운데 ${owned}가지는 기준까지 직접 정해 봤습니다` : "여덟 판단마다 가장 깊이 해 본 단계를 모았습니다", "영역을 가리지 않고 판단마다 가장 깊이 해 본 단계를 골랐습니다. 막대 오른쪽은 그 단계가 나온 영역입니다.") +
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
  const headline = d.goalRole
    ? `목표 직무 ${r.name_ko}의 핵심 영역 ${cov.tds.length}곳 가운데 ${cov.z1.length + cov.z2.length}곳에서 해 본 일이 확인됩니다`
    : `목표 직무를 적어 두지 않아, 근거가 가장 많이 겹치는 ${r.name_ko}로 읽었습니다`;
  return P("목표 직무 준비 한눈에",
    T(E(headline), `${E(j(r.name_ko, "은는"))} ${E(polite(r.owns))} 이 직무가 특히 보는 판단과 지금 단계를 나란히 놓았습니다.`) +
    `<div class="two">
      <div class="card">${H("이 직무가 정하는 것", "직무팩")}${chips(r.decides)}<p class="k" style="margin-top:3mm">핵심 영역</p><p>${cov.tds.map((t) => `<span class="nw">${E(d.name(t))}<span class="dot" style="background:${ZC[d.dom(t)?.zone ?? "NOT_EXPLORED"]}"></span></span>`).join(" ")}</p><p class="k" style="margin-top:3mm">지원 서류에 쓰는 결과물</p>${chips(r.application_material, "art")}</div>
      <div class="card">${H("특히 보는 판단과 지금 단계", "응답")}${hbars(rows, { max: 3, width: 340, label: 110, ticks: ["지시받아", "직접", "기준까지"], row: 44, valueText: (b) => String((b as { note?: string }).note ?? "") })}<p class="mut sm">단계는 핵심 영역 가운데 가장 깊이 해 본 것을 씁니다.</p></div>
    </div>` +
    `<div class="two">
      ${note("이미 두 쪽 말로 설명할 수 있는 자리", overlap.length ? `<ul class="ls">${overlap.map((t) => `<li>${E(t)}</li>`).join("")}</ul><p class="mut sm">${E(x.major)} 영역에서도, 이 직무가 묻는 말로도 확인된 판단입니다.</p>` : "직무 문항과 영역 응답이 함께 확인된 자리는 아직 없습니다.")}
      ${note("이 직무와 산업이 더 보는 빈자리", requested.length ? `<ul class="ls">${requested.map((t) => `<li>${E(t)}</li>`).join("")}</ul>` : "고른 직무와 산업이 더 보는 판단 가운데 비어 있는 자리는 없습니다.", true)}
    </div>` +
    `<div class="two">
      ${note("다른 직무와 다른 점", ul(r.differs_from.filter((v) => okText(v.line)).slice(0, 3).map((v) => `<b>${E(d.roleName(v.vs))}</b> ${E(polite(v.line))}`)) || "직무팩에 적힌 비교가 없습니다.")}
      ${note(ind ? `${E(ind.name_ko)}에서 먼저 묻는 판단` : "함께 비교해 볼 직무", ind ? ul(ind.judgement_dimensions.filter((v) => okText(v.name)).slice(0, 4).map((v) => `${E(askNoun(v.name))} <span class="mut">${E(d.name(v.domain))}</span> ${pip(d.level(v.domain, v.axis))}`)) : chips(r.compare_with.map(d.roleName)), true)}
    </div>` +
    (ind ? band("목표 산업", `${E(ind.name_ko)}. ${E(okText(ind.result_line) ? ind.result_line : okText(ind.scene) ? ind.scene : "")}`) : band("준비 상태", "이 직무가 보는 판단을 해 본 근거가 어디까지 있는지를 적었습니다. 직무 적합도나 합격 가능성은 계산하지 않았습니다.")));
}

export function ch1Pages(x: Inputs, d: X): Page[] {
  return [glance(x, d), tree(x, d), dash(x, d), ringPage(x, d), quad(x, d), bestPage(x, d), goalPage(x, d)];
}
