/**
 * 03 영역별 해설: 영역마다 한 쪽, 고른 근거 원장, 경험 기록, 검사와 기록의 교차, 경험 번역.
 */
import type { Axis } from "../scoring/types";
import type { ResultDomain } from "../result/model";
import { TRANS_STEP_KO } from "../result/text.ko";
import type { Experience } from "../platform";
import type { Inputs } from "./types";
import { AXES, BAND_WORD, EXP_WORD, type X } from "./derive";
import { chain, radar, timeline } from "./charts";
import { C } from "./charts";
import { CYC, DC, E, H, PAL, T, band, chips, lines, note, paginate, pip, rowsOf, tag, ul, zoneTag, type Page } from "./kit";
import { actionLine, andJoin, j, list3, okOr, okText, q, polite } from "./text";

export const PART3 = (x: Inputs) => `${x.domainWord}별 해설`;

function domainHead(x: Inputs, d: X, z: ResultDomain): string {
  const nm = d.name(z.code);
  const ev = d.evidenceOf(z);
  switch (z.zone) {
    case "Z1_EVIDENCE_ESTABLISHED":
      return ev.decisions[0]
        ? `${nm}에서는 ${q(ev.decisions[0])}처럼 스스로 정한 판단과 그 판단을 담은 결과물이 함께 확인됩니다.`
        : `${nm}에서는 스스로 맡아 한 일과 남긴 결과물이 함께 확인됩니다.`;
    case "Z2_EVIDENCE_INCOMPLETE": {
      const miss = [!ev.artifacts.length && "남긴 결과물", !ev.comparisons.length && "무엇과 비교했는지", !z.owned.length && "기준을 직접 정한 장면"].filter(Boolean) as string[];
      return `${nm}에서 스스로 맡아 해 본 일은 확인되고, ${j(andJoin(miss) || "그 일을 보여 줄 기록", "은는")} 아직 보이지 않습니다.`;
    }
    case "Z3_EVIDENCE_LOW_INTEREST":
      return `${j(nm, "은는")} 해 본 일이 확인되는 영역이고, 지금 관심은 낮게 나왔습니다. 다른 직무에 지원할 때도 기본은 해 봤다는 근거로 쓸 수 있습니다.`;
    case "Z4_INSUFFICIENT_EVIDENCE":
      return `${j(nm, "은는")} 관심이 높다고 답했고, 스스로 맡아 해 본 일은 아직 적은 영역입니다. 짧은 과제 하나로 실제로 맞는 일인지 확인해 볼 차례입니다.`;
    default:
      return z.experience === "NONE"
        ? `${j(nm, "은는")} 아직 해 본 적이 없다고 답한 영역입니다. ${z.interest === "HIGH" ? "관심이 높으니 짧은 과제 하나로 먼저 겪어 볼 자리입니다." : "지금은 다른 영역을 먼저 다지고 필요할 때 넓혀도 됩니다."}`
        : `${j(nm, "은는")} 이번 검사에서 판단 여덟 가지를 깊게 묻지 않은 영역입니다. 해 본 횟수를 ${j(EXP_WORD[z.experience ?? ""] ?? "응답 없음", "으로")} 답했으니, 그때 맡은 일을 적어 두면 지원서에 쓸 근거가 하나 더 생깁니다.`;
  }
}

export function domainPage(x: Inputs, d: X, z: ResultDomain, no: number): Page {
  const def = d.def(z.code), tx = d.tax(z.code);
  const nm = d.name(z.code);
  const asked = d.asked(z);
  const lv = d.levels(z.code);
  const roles = d.rolesOf(z.code).slice(0, 4);
  const inds = d.indsOf(z.code).slice(0, 4);
  const gapA = x.m.gaps.filter((g) => g.domain === z.code).map((g) => d.actionOf(g)).find(Boolean);
  const rowsHtml = AXES.map((a, k) => {
    const own = d.picks(z.code, a);
    const what = own.length ? own.slice(0, 2).map(E).join(" · ") + (own.length > 2 ? ` <span class="mut">외 ${own.length - 2}개</span>` : "") : `<span class="mut">${E(okOr(def?.axes?.[a]?.l2))}</span>`;
    return `<tr><td class="w22"><b>${E(d.axisName(a))}</b>${(def?.required_axes ?? []).includes(a) ? ` <span class="mut sm">필수</span>` : ""}</td><td class="w22">${pip(lv[k])}</td><td>${what}</td></tr>`;
  }).join("");
  const nextLine = gapA
    ? actionLine(gapA, nm, def)
    : asked
      ? `${nm}에서 지금 근거로 문단 하나를 쓸 수 있습니다. 결과 수치와 기간을 직접 적어 넣으면 됩니다.`
      : z.experience && z.experience !== "NONE"
        ? `해 본 일 가운데 ${q(def?.axes?.J3?.l2 ?? def?.workflow?.[2]?.detail ?? "기준 하나를 직접 정한 일")}에 가까운 장면이 있었는지 찾아 경험 기록에 적습니다. 남은 ${j(def?.artifacts?.[0] ?? "결과 문서", "이가")} 있으면 함께 적습니다.`
        : `수업 과제나 동아리 활동에서 ${q(def?.axes?.J3?.l2 ?? def?.workflow?.[2]?.detail ?? "기준 하나를 직접 정하는 일")} 정도의 일을 한 번 맡아 봅니다. 남길 것은 ${def?.artifacts?.[0] ?? "결과 문서"}입니다.`;
  return {
    part: "03", partName: PART3(x), title: `영역 ${String(no).padStart(2, "0")} · ${nm}`,
    body: `<div class="dh"><span class="dh-n">${String(no).padStart(2, "0")}</span><div><p class="k">${E(x.domainWord)}</p><h1>${E(nm)}</h1></div><div class="dh-t">${zoneTag(z.zone)}<span class="mut">관심 ${z.interest ? BAND_WORD[z.interest] : "응답 없음"} · 해 본 횟수 ${z.experience ? EXP_WORD[z.experience] : "응답 없음"}${asked ? "" : ` · 배울 뜻 ${z.learning ? BAND_WORD[z.learning] : "묻지 않음"}`}</span></div></div>
      <p class="dek">${E(domainHead(x, d, z))}${okText(tx?.owns) ? ` <span class="mut">이 영역은 ${E(polite(tx!.owns))}</span>` : ""}</p>
      ${tx?.subareas?.length ? chips(tx.subareas) : ""}
      ${H("이 영역의 일은 이렇게 흘러갑니다", "전공 사전")}<div class="wf2${asked ? "" : " wf2s"}">${(def?.workflow ?? []).map((w) => `<div class="wf2-i"><span>${w.step}</span><p><b>${E(w.name)}</b>${E(okOr(w.detail))}</p></div>`).join("")}</div>
      ${asked ? `${H("판단 여덟 가지와 지금 단계", "응답 · 고른 근거")}<table class="tb tb-xs"><tbody>${rowsHtml}</tbody></table>` : ""}
      <div class="g3">
        ${note("이어지는 직무", roles.length ? roles.map((r) => `${E(d.roleName(r.role))} <span class="mut">(${E(r.strength)})</span>`).join(" · ") : "관계표에 적힌 직무가 없습니다.")}
        ${note("이 영역을 쓰는 산업", inds.length ? inds.map((r) => `${E(d.indName(r.industry))} <span class="mut">(${E(r.strength)})</span>`).join(" · ") : "관계표에 적힌 산업이 없습니다.")}
        ${note("남기는 결과물", E((def?.artifacts ?? []).slice(0, 4).join(" · ")))}
      </div>` + band(gapA ? "다음 할 일" : asked ? "다음 단계" : z.experience && z.experience !== "NONE" ? "근거로 옮기기" : "처음 겪어 보기", E(nextLine)),
  };
}

export function ledgerPages(x: Inputs, d: X): Page[] {
  const asked = x.m.domains.filter((z) => d.asked(z) && AXES.some((a) => d.picks(z.code, a).length));
  type Row = { z: ResultDomain; a: Axis; picks: string[] } | { z: ResultDomain; head: true };
  const rows: Row[] = asked.flatMap((z) => [{ z, head: true as const }, ...AXES.filter((a) => d.picks(z.code, a).length).map((a) => ({ z, a, picks: d.picks(z.code, a) }))]);
  if (!rows.length) {
    return [{
      part: "03", partName: PART3(x), title: "고른 근거 원장",
      body: T("체크리스트에서 고른 장면이 아직 없습니다", "판단 문항에는 답했지만 그 장면을 체크리스트에서 고르지 않았습니다. 다음 검사나 경험 기록에서 해 본 장면을 고르면 이 쪽이 지원서 재료의 목록이 됩니다.") +
        band("쓰는 법", "자기소개서 한 문단에는 ‘직접 정한 것’ 하나와 ‘결과물’ 하나만 씁니다."),
    }];
  }
  const w = (r: Row) => ("head" in r ? 2.2 : Math.max(1, rowsOf(r.picks.join(" · "), 62)));
  const total = rows.filter((r) => !("head" in r)).reduce((a, r) => a + (r as { picks: string[] }).picks.length, 0);
  return paginate(rows, w, 38, 31).map((chunk, k) => ({
    part: "03", partName: PART3(x), title: `고른 근거 원장${k ? ` (${k + 1})` : ""}`,
    body: (k === 0 ? T(`고른 장면 ${total}개를 영역과 판단별로 모았습니다`, "참여자가 체크리스트에서 직접 고른 문장 그대로입니다. 이 목록이 자기소개서와 면접 답변의 재료가 됩니다.") : `<p class="k">고른 근거 원장 · 이어서</p>`) +
      `<table class="tb tb-xs"><tbody>${chunk.map((r) => "head" in r
        ? `<tr><td colspan="2" style="background:#f2f5fb"><b>${E(d.name(r.z.code))}</b> ${zoneTag(r.z.zone)}</td></tr>`
        : `<tr><td class="w22">${E(d.axisName(r.a))}</td><td>${r.picks.map((p) => (r.z.artifacts.includes(p) ? `<b>${E(p)}</b>` : E(p))).join(" · ")}</td></tr>`).join("")}</tbody></table>` +
      band("쓰는 법", "굵은 글씨는 결과물입니다. 자기소개서 한 문단에는 ‘직접 정한 것’ 하나와 결과물 하나만 씁니다."),
  }));
}

const KIND: Record<string, string> = {
  course: "수업", assignment: "수업 과제", capstone: "캡스톤 디자인", research: "연구", paper: "논문",
  internship: "현장실습·인턴", project: "교내외 활동", work: "근무", credential: "자격 준비",
};
const period = (e: Experience) => [e.started_on?.slice(0, 7), e.ended_on?.slice(0, 7) ?? (e.started_on ? "진행 중" : null)].filter(Boolean).join(" ~ ");

export function recordPages(x: Inputs, d: X): Page[] {
  const exps = x.exps;
  if (!exps.length) {
    return [{
      keep: true,
      part: "03", partName: PART3(x), title: "경험 기록",
      body: T("이 결과를 굳힌 때까지 적어 둔 경험 기록이 없습니다", `이 리포트는 결과를 굳힌 ${E(x.builtOn)}까지 저장된 경험 기록만 싣습니다. 그 뒤에 적은 기록은 내 CareerMatri의 현재 상태에서 봅니다. 수업 과제, 캡스톤, 실습, 동아리 활동 하나를 적으면 검사가 가리킨 영역과 그 활동이 같은 쪽을 가리키는지 맞춰 볼 수 있습니다.`) +
        `<div class="two">${note("적는 법", ul(["활동 이름과 기간", "어느 영역의 일이었는지", "직접 정한 것 한두 가지", "남은 결과물과 무엇과 비교했는지"]))}${note("적으면 달라지는 것", ul(["내 CareerMatri의 현재 상태에 그 활동이 근거로 붙습니다", "다음 검사를 마치고 받는 리포트에 그 활동의 쪽과 자기소개서 재료가 실립니다", "이 리포트와 검사 당시 결과는 그대로 남습니다"]), true)}</div>` +
        H("지금 떠오르는 활동 셋", "참여자가 채웁니다 · 경험 추가에 그대로 옮깁니다") +
        `<table class="tb ws rec"><thead><tr><th style="width:24%">활동 이름 · 기간</th><th style="width:20%">어느 ${E(x.domainWord)}</th><th>직접 정한 것</th><th style="width:22%">남은 결과물 · 비교한 것</th></tr></thead><tbody>${"<tr><td></td><td></td><td></td><td></td></tr>".repeat(3)}</tbody></table>` +
        band("어디서", "내 CareerMatri의 ‘경험 추가’에서 적습니다."),
    }];
  }
  const out: Page[] = [];
  const dated = exps.filter((e) => e.started_on);
  if (dated.length) {
    const items = dated.map((e, i) => ({ label: e.title, from: e.started_on!.slice(0, 7), to: (e.ended_on ?? e.started_on)!.slice(0, 7), color: CYC[i % CYC.length] }));
    out.push({
      part: "03", partName: PART3(x), title: "경험 기록 시간축",
      body: T(`경험 기록 ${exps.length}건을 시간 순서로 놓았습니다`, "참여자가 플랫폼에 적어 둔 활동입니다. 검사 응답과 따로 받았고, 같은 영역을 가리키는지 뒤쪽에서 맞춰 봅니다.") +
        `<div class="wide-art">${timeline(items, { width: 700 })}</div>` +
        exps.slice(0, 4).map((e, i) => `<div class="rec" style="--c:${CYC[i % CYC.length]}"><div class="rec-h"><b>${E(e.title)}</b><span>${E(KIND[e.kind] ?? "활동")} · ${E(period(e) || "기간 적지 않음")} · ${E(e.td_codes.map(d.name).join(", "))}</span></div>
          <div class="g3 sm"><div><p class="k">다룬 문제</p>${ul((e.problems ?? []).slice(0, 3).map(E)) || "<p class='mut'>적지 않음</p>"}</div><div><p class="k">직접 정한 것</p>${ul(e.decisions.slice(0, 3).map(E)) || "<p class='mut'>적지 않음</p>"}</div><div><p class="k">남긴 것 · 쓰인 곳</p>${ul([...e.artifacts.slice(0, 2).map((a) => `<b>${E(a)}</b>`), ...(e.used_where ?? []).slice(0, 2).map(E)]) || "<p class='mut'>적지 않음</p>"}</div></div></div>`).join(""),
    });
  }
  for (const e of exps.slice(0, 3)) {
    const says = e.td_codes.map((td) => {
      const z = d.dom(td);
      if (!z || !d.asked(z)) return { n: d.name(td), t: z?.experience === "NONE" ? "영역 훑기에서는 이 영역을 해 본 적이 없다고 답했습니다. 같은 활동을 두 질문이 다르게 불렀을 수 있습니다." : "이번 검사에서 이 영역의 판단은 깊게 묻지 않았습니다. 지금은 이 기록이 이 영역의 근거입니다." };
      if (z.confirmed.length) return { n: d.name(td), t: `검사에서도 이 영역의 판단 ${z.confirmed.length}가지를 스스로 해 봤다고 답해, 기록과 응답이 같은 쪽을 가리킵니다.` };
      return { n: d.name(td), t: "검사에서는 이 영역의 판단을 스스로 해 봤다고 답하지 않았습니다. 기록을 응답보다 앞세우지 않습니다." };
    });
    const jobs = x.roles.filter((r) => r.core_ref.td.some((t) => e.td_codes.includes(t))).slice(0, 3);
    out.push({
      part: "03", partName: PART3(x), title: `경험 기록 · ${e.title.slice(0, 24)}`,
      body: T(E(e.title), `${E(KIND[e.kind] ?? "활동")}${period(e) ? ` · ${E(period(e))}` : ""} · ${E(andJoin(e.td_codes.map(d.name)))} 영역의 일로 적었습니다.`) +
        chain([
          { head: "다룬 문제", body: (e.problems ?? [])[0] ?? "적지 않음", color: C.navy }, { head: "직접 정한 것", body: e.decisions[0] ?? "적지 않음", color: C.blue },
          { head: "남긴 것", body: e.artifacts[0] ?? "적지 않음", color: C.teal }, { head: "비교한 것", body: e.verifications[0] ?? "적지 않음", color: C.amber },
        ], { width: 700, height: 104 }) +
        `<div class="two">
          <div class="card">${H("검사가 같은 쪽을 가리키나")}${ul(says.map((s) => `<b>${E(s.n)}</b> ${E(s.t)}`))}</div>
          <div class="card">${H("이 기록이 이어지는 직무", "직무팩")}${ul(jobs.map((r) => `<b>${E(r.name_ko)}</b> ${E(polite(r.owns))}`)) || "<p class='mut'>관계표에 이어지는 직무가 없습니다.</p>"}</div>
        </div>` +
        H("면접 전에 적어 둘 것", "참여자가 채웁니다") +
        `<div class="g3">${lines(3, "팀에서 맡은 역할과 범위")}${lines(3, e.verifications.length ? "비교한 결과와 그 차이" : "결과를 무엇과 비교했는지")}${lines(3, "결과 수치와 기간")}</div>` +
        band("쓰는 법", e.decisions.length ? `${j(q(e.decisions[0]), "을를")} 문단의 중심에 두고, 그 판단의 결과물을 함께 보여 주면 자기소개서 한 문단이 됩니다.` : "이 기록에는 직접 정한 것이 아직 없습니다. 맡았던 부분을 먼저 떠올려 적으면 서류에 쓸 수 있는 경험이 됩니다."),
    });
  }
  return out;
}

export function crossPage(x: Inputs, d: X): Page | null {
  if (!x.exps.length) return null;
  const rows = x.m.domains.map((z) => {
    const rec = x.exps.filter((e) => e.td_codes.includes(z.code));
    const test = !d.asked(z) ? "깊게 묻지 않음" : z.confirmed.length ? `판단 ${z.confirmed.length}가지 해 봄` : "해 봤다고 답한 판단 없음";
    const kind = rec.length && z.confirmed.length ? "검사·기록 모두" : rec.length ? "기록에만" : z.confirmed.length ? "검사에만" : null;
    return { z, rec, test, kind };
  }).filter((r) => r.kind);
  const color: Record<string, string> = { "검사·기록 모두": C.navy, "기록에만": C.teal, "검사에만": C.blue };
  return {
    part: "03", partName: PART3(x), title: "검사와 기록의 교차 확인",
    body: T("검사 응답과 경험 기록이 같은 영역을 가리키는지 맞춰 봤습니다", "두 근거가 같은 쪽을 가리키면 면접에서 ‘언제, 어떤 과제에서’라는 질문에 바로 답할 수 있습니다. 한쪽에만 있으면 다른 쪽을 채울 차례입니다.") +
      `<table class="tb tb-s"><thead><tr><th>영역</th><th>근거</th><th>검사</th><th>경험 기록</th></tr></thead><tbody>${rows.map((r) => `<tr><th>${E(d.name(r.z.code))}</th><td>${tag(r.kind!, color[r.kind!])}</td><td>${E(r.test)}</td><td>${E(r.rec.map((e) => e.title).join(" / ") || "없음")}</td></tr>`).join("")}</tbody></table>` +
      `<div class="two">
        ${note("검사·기록 모두", "그 기록을 면접의 첫 장면으로 씁니다. 기록의 결과물과 검사에서 고른 항목이 같은 것을 가리키는지 한 번 맞춰 봅니다.")}
        ${note("한쪽에만 있는 영역", "검사에만 있으면 그 과제를 경험 기록으로 남기고, 기록에만 있으면 다음 검사에서 그 영역을 ‘해 봤다’로 답할 수 있는지 확인합니다.", true)}
      </div>`,
  };
}

export function translationPage(x: Inputs, d: X): Page | null {
  const t = x.m.translation;
  if (!t || !t.steps.length || !x.m.limits.allows_translation) return null;
  const steps = t.steps.filter((s) => TRANS_STEP_KO[s.item_id]);
  if (!steps.length) return null;
  const answered = steps.some((s) => s.choice);
  return {
    part: "03", partName: PART3(x), title: "경험 하나를 직무의 말로",
    keep: !answered,
    body: (answered
      ? T("고른 경험 하나를 열 단계로 옮겼습니다", "검사의 마지막 묶음에서 경험 하나를 골라 문제부터 활용까지 차례로 답했습니다. 고른 보기를 그대로 적었고, 이 표가 지원서 문단의 뼈대가 됩니다.")
      : T("경험 하나를 열 단계로 옮겨 적는 쪽입니다", "이번 응답에는 열 단계에서 고른 보기가 남아 있지 않아 칸을 비워 두었습니다. 검사에서 깊게 본 영역의 경험 하나를 골라 직접 채웁니다.")) +
      `<table class="tb tb-s${answered ? "" : " trs"}"><tbody>${steps.map((s) => `<tr><th class="w30">${E(TRANS_STEP_KO[s.item_id])}</th><td>${s.choice ? E(s.choice) : `<div class="wl"><i></i></div>`}</td></tr>`).join("")}</tbody></table>` +
      (t.domains.length ? `<p class="sm">이 경험이 닿은 영역: ${E(t.domains.map(d.name).join(" · "))}</p>` : "") +
      lines(answered ? 4 : 6, "이 열 줄을 이어 쓴 한 문단") +
      band("쓰는 법", "‘무엇을 직접 정했나’와 ‘무엇이 남았나’ 두 줄이 문단의 중심입니다. 나머지 줄은 그 두 줄을 받쳐 주는 순서로 놓습니다."),
  };
}

export function ch3Pages(x: Inputs, d: X): Page[] {
  const out: Page[] = [];
  x.m.domains.forEach((z, i) => out.push(domainPage(x, d, z, i + 1)));
  out.push(...ledgerPages(x, d), ...recordPages(x, d));
  const c = crossPage(x, d); if (c) out.push(c);
  const t = translationPage(x, d); if (t) out.push(t);
  return out;
}

