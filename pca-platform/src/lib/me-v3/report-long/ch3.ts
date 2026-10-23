/**
 * 03 영역별 해설: 영역마다 한 쪽, 체크리스트 원장, 경험 기록, 검사와 기록의 교차, 경험 번역.
 *
 * 값이 없는 칸은 "없음" 으로 채우지 않고 뺀다. 쓰는 칸(빈 줄 · 빈 표)은 이 장에 한 곳만 둔다:
 * 경험 기록이 하나도 없을 때의 '지금 떠오르는 활동 셋' 표다.
 */
import type { Axis } from "../scoring/types";
import type { ResultDomain } from "../result/model";
import { TRANS_STEP_KO } from "../result/text.ko";
import type { Experience } from "../platform";
import type { Inputs } from "./types";
import { AXES, BAND_WORD, EXP_WORD, STEP_WORD, type X } from "./derive";
import { chain, radar, timeline } from "./charts";
import { C } from "./charts";
import { CYC, DC, E, H, PAL, T, band, chips, lines, note, paginate, pip, rowsOf, tag, ul, zoneTag, type Page } from "./kit";
import { actionLine, andJoin, j, list3, okOr, okText, q, polite } from "./text";

export const PART3 = (x: Inputs) => `${x.domainWord}별 해설`;

/** 칸 수에 맞는 격자. 하나면 격자 없이 그대로 둔다 */
const grid = (xs: string[]) => (xs.length >= 3 ? `<div class="g3">${xs.join("")}</div>` : xs.length === 2 ? `<div class="two">${xs.join("")}</div>` : xs.join(""));

function domainHead(x: Inputs, d: X, z: ResultDomain): string {
  const nm = d.name(z.code);
  const ev = d.evidenceOf(z);
  switch (z.zone) {
    case "Z1_EVIDENCE_ESTABLISHED":
      return ev.decisions[0]
        ? `${nm}에서는 ${j(q(ev.decisions[0]), "과와")} 같이 직접 정한 일이 있고, 그 결과물도 남아 있습니다. 지원서에 바로 쓸 수 있는 영역입니다.`
        : `${nm}에서는 직접 맡아 한 일과 그때 남긴 결과물이 함께 확인됩니다. 지원서에 바로 쓸 수 있는 영역입니다.`;
    case "Z2_EVIDENCE_INCOMPLETE": {
      const miss = [!ev.artifacts.length && "남긴 결과물", !ev.comparisons.length && "비교한 대상", !z.owned.length && "기준을 직접 정한 일"].filter(Boolean) as string[];
      return miss.length
        ? `${j(nm, "은는")} 직접 맡아 본 일이 있는 영역입니다. 여기에 ${andJoin(miss)}까지 더하면 서류에 그대로 옮길 수 있는 경험이 됩니다.`
        : `${j(nm, "은는")} 직접 맡아 본 일이 있는 영역입니다. 그 일을 경험 기록으로 한 번 정리해 두면 서류에 그대로 옮길 수 있습니다.`;
    }
    case "Z3_EVIDENCE_LOW_INTEREST":
      return `${j(nm, "은는")} 해 본 일이 있는데 지금 관심은 낮게 나온 영역입니다. 다른 직무에 지원할 때도 기본기를 보여 주는 경험으로 쓰이니, 기록만큼은 정리해 두시길 권합니다.`;
    case "Z4_INSUFFICIENT_EVIDENCE":
      return `${j(nm, "은는")} 관심은 높은데 직접 해 본 일이 아직 적은 영역입니다. 수업 과제나 짧은 프로젝트에서 한 번 맡아 보면 나에게 맞는 일인지 금방 드러납니다.`;
    default: {
      if (z.experience === "NONE") {
        return `${j(nm, "은는")} 아직 해 본 적이 없다고 답하신 영역입니다. ${z.interest === "HIGH" ? "관심이 높게 나왔으니 짧은 과제 하나로 먼저 겪어 보시길 권합니다." : "지금은 다른 영역을 먼저 다지고, 필요해질 때 넓혀도 늦지 않습니다."}`;
      }
      const times = EXP_WORD[z.experience ?? ""];
      return `${j(nm, "은는")} 이번 검사에서 관심과 해 본 횟수만 여쭌 영역입니다. ${times ? `${times} 해 봤다고 답하셨으니` : "해 본 적이 있다고 답하셨으니"}, 그때 맡은 일을 경험 기록에 적어 두면 지원서에 쓸 경험이 하나 늘어납니다.`;
    }
  }
}

export function domainPage(x: Inputs, d: X, z: ResultDomain, no: number): Page {
  const def = d.def(z.code), tx = d.tax(z.code);
  const nm = d.name(z.code);
  const asked = d.asked(z);
  const lv = d.levels(z.code);
  const roles = d.rolesOf(z.code).slice(0, 4);
  const inds = d.indsOf(z.code).slice(0, 4);
  const arts = (def?.artifacts ?? []).slice(0, 4);
  const gapA = x.m.gaps.filter((g) => g.domain === z.code).map((g) => d.actionOf(g)).find(Boolean);
  const rowsHtml = AXES.map((a, k) => {
    const own = d.picks(z.code, a);
    const what = own.length ? own.slice(0, 2).map(E).join(" · ") + (own.length > 2 ? ` <span class="mut">외 ${own.length - 2}개</span>` : "") : `<span class="mut">${E(okOr(def?.axes?.[a]?.l2))}</span>`;
    return `<tr><td class="w22"><b>${E(d.axisName(a))}</b>${(def?.required_axes ?? []).includes(a) ? ` <span class="mut sm">필수</span>` : ""}</td><td class="w22">${pip(lv[k])}</td><td>${what}</td></tr>`;
  }).join("");
  const scene = def?.axes?.J3?.l2 ?? def?.workflow?.[2]?.detail;
  const art0 = def?.artifacts?.[0] ?? "결과 문서";
  const nextLine = gapA
    ? actionLine(gapA, nm, def)
    : asked
      ? `${nm}에서는 지금 응답만으로 지원서 한 문단을 쓸 수 있습니다. 결과 수치와 걸린 기간만 직접 채워 넣으면 됩니다.`
      : z.experience && z.experience !== "NONE"
        ? `해 본 일 가운데 ${scene ? `${q(scene)}에 가까운 경우` : "기준 하나를 직접 정한 경우"}가 있었는지 떠올려 경험 기록에 적어 보세요. ${j(art0, "이가")} 남아 있다면 함께 올려 두면 됩니다.`
        : `수업 과제나 동아리 활동에서 ${scene ? q(scene) : "기준 하나를 직접 정하는 일"} 정도의 몫을 한 번 맡아 보세요. 끝나면 ${j(art0, "을를")} 남겨 두시면 됩니다.`;
  const meta = [
    z.interest ? `관심 ${BAND_WORD[z.interest]}` : "",
    z.experience ? (z.experience === "NONE" ? "아직 해 보기 전" : `해 본 횟수 ${EXP_WORD[z.experience]}`) : "",
    !asked && z.learning ? `배울 뜻 ${BAND_WORD[z.learning]}` : "",
  ].filter(Boolean).join(" · ");
  const notes = [
    roles.length ? note("이 영역을 쓰는 직무", roles.map((r) => `${E(d.roleName(r.role))} <span class="mut">(${E(r.strength)})</span>`).join(" · ")) : "",
    inds.length ? note("이 영역을 쓰는 산업", inds.map((r) => `${E(d.indName(r.industry))} <span class="mut">(${E(r.strength)})</span>`).join(" · ")) : "",
    arts.length ? note("이 일에서 남기는 결과물", E(arts.join(" · "))) : "",
  ].filter(Boolean);
  const wf = def?.workflow ?? [];
  return {
    part: "03", partName: PART3(x), title: `영역 ${String(no).padStart(2, "0")} · ${nm}`,
    body: `<div class="dh"><span class="dh-n">${String(no).padStart(2, "0")}</span><div><p class="k">${E(x.domainWord)}</p><h1>${E(nm)}</h1></div><div class="dh-t">${zoneTag(z.zone)}${meta ? `<span class="mut">${meta}</span>` : ""}</div></div>
      <p class="dek">${E(domainHead(x, d, z))}${okText(tx?.owns) ? ` <span class="mut">이 영역은 ${E(polite(tx!.owns))}</span>` : ""}</p>
      ${tx?.subareas?.length ? chips(tx.subareas) : ""}
      ${wf.length ? `${H("현장에서 이 일은 이런 순서로 진행됩니다", "전공 사전")}<div class="wf2${asked ? "" : " wf2s"}">${wf.map((w) => `<div class="wf2-i"><span>${w.step}</span><p><b>${E(w.name)}</b>${E(okOr(w.detail))}</p></div>`).join("")}</div>` : ""}
      ${asked ? `${H("단계별로 어디까지 해 봤는지", "응답 · 체크리스트")}<table class="tb tb-xs"><tbody>${rowsHtml}</tbody></table>` : ""}
      ${grid(notes)}` + band(gapA ? "다음 할 일" : asked ? "지원서로 옮기기" : z.experience && z.experience !== "NONE" ? "기록으로 남기기" : "처음 해 보기", E(nextLine)),
  };
}

export function ledgerPages(x: Inputs, d: X): Page[] {
  const asked = x.m.domains.filter((z) => d.asked(z) && AXES.some((a) => d.picks(z.code, a).length));
  type Row = { z: ResultDomain; a: Axis; picks: string[] } | { z: ResultDomain; head: true };
  const rows: Row[] = asked.flatMap((z) => [{ z, head: true as const }, ...AXES.filter((a) => d.picks(z.code, a).length).map((a) => ({ z, a, picks: d.picks(z.code, a) }))]);
  const w = (r: Row) => ("head" in r ? 2.2 : Math.max(1, rowsOf(r.picks.join(" · "), 62)));
  const headRow = (z: ResultDomain) => `<tr><td colspan="2" style="background:#f2f5fb"><b>${E(d.name(z.code))}</b> ${zoneTag(z.zone)}</td></tr>`;
  if (!rows.length) {
    /* 체크리스트에서 고른 것이 없으면, 직접 해 봤다고 답한 판단과 그 판단이 현장에서 어떤 일인지를 대신 싣는다 */
    type Hint = { z: ResultDomain; a: Axis; lv: number; l2: string } | { z: ResultDomain; head: true };
    const hints: Hint[] = x.m.domains.filter((z) => d.asked(z)).flatMap((z) => {
      const own = AXES.map((a, k) => ({ a, lv: d.levels(z.code)[k], l2: okOr(d.def(z.code)?.axes?.[a]?.l2) }))
        .filter((v) => v.lv !== null && v.lv >= 2 && v.l2).map((v) => ({ z, a: v.a, lv: v.lv as number, l2: v.l2 }));
      return own.length ? [{ z, head: true as const }, ...own] : [];
    });
    const n = hints.filter((h) => !("head" in h)).length;
    if (!n) return [];
    return paginate(hints, (h) => ("head" in h ? 2.2 : Math.max(1, rowsOf(h.l2, 62))), 38, 31).map((chunk, k) => ({
      part: "03", partName: PART3(x), title: `지원서 재료 찾기${k ? ` (${k + 1})` : ""}`,
      body: (k === 0 ? T(`직접 해 봤다고 답한 판단이 ${n}가지 있습니다`, "다만 체크리스트에서는 그 장면을 아직 표시하지 않으셨습니다. 오른쪽 문장에 맞는 과제가 있었다면 경험 기록에 그 과제를 적고 같은 문장을 골라 주세요. 그러면 이 표가 자기소개서에 쓸 재료 목록이 됩니다.") : `<p class="k">지원서 재료 찾기 · 이어서</p>`) +
        `<table class="tb tb-xs"><tbody>${chunk.map((h) => "head" in h
          ? headRow(h.z)
          : `<tr><td class="w22">${E(d.axisName(h.a))} <span class="mut sm">${E(STEP_WORD[h.lv as 0 | 1 | 2 | 3].tag)}</span></td><td>${E(h.l2)}</td></tr>`).join("")}</tbody></table>` +
        band("쓰는 법", "자기소개서 한 문단에는 직접 정한 것 하나와 그 결과물 하나를 담으면 충분합니다."),
    }));
  }
  const total = rows.filter((r) => !("head" in r)).reduce((a, r) => a + (r as { picks: string[] }).picks.length, 0);
  return paginate(rows, w, 38, 31).map((chunk, k) => ({
    part: "03", partName: PART3(x), title: `체크리스트 원장${k ? ` (${k + 1})` : ""}`,
    body: (k === 0 ? T(`체크리스트에서 표시한 ${total}개 항목을 영역과 판단별로 모았습니다`, "직접 고르신 문장을 그대로 옮겼습니다. 자기소개서와 면접 답변을 준비할 때 여기서 하나씩 꺼내 쓰면 됩니다.") : `<p class="k">체크리스트 원장 · 이어서</p>`) +
      `<table class="tb tb-xs"><tbody>${chunk.map((r) => "head" in r
        ? headRow(r.z)
        : `<tr><td class="w22">${E(d.axisName(r.a))}</td><td>${r.picks.map((p) => (r.z.artifacts.includes(p) ? `<b>${E(p)}</b>` : E(p))).join(" · ")}</td></tr>`).join("")}</tbody></table>` +
      band("쓰는 법", "굵은 글씨는 결과물입니다. 한 문단에는 직접 정한 것 하나와 결과물 하나를 담으면 충분합니다."),
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
    /* 이 장의 쓰는 칸은 여기 한 곳이다. 해 본 적이 있다고 답한 영역을 둘째 칸에 미리 적어 둔다 */
    const tried = x.m.domains.filter((z) => z.experience && z.experience !== "NONE")
      .sort((a, b) => (b.experience === "SEVERAL" ? 1 : 0) - (a.experience === "SEVERAL" ? 1 : 0)).slice(0, 3).map((z) => d.name(z.code));
    const rows = [0, 1, 2].map((i) => `<tr><td></td><td>${tried[i] ? E(tried[i]) : ""}</td><td></td><td></td></tr>`).join("");
    return [{
      keep: true,
      part: "03", partName: PART3(x), title: "경험 기록",
      body: T("경험 기록을 하나 적어 두면 이 장이 훨씬 구체적이 됩니다", `이 리포트에는 결과를 확정한 ${E(x.builtOn)}까지 저장된 경험 기록만 들어갑니다. 그 뒤에 적은 기록은 내 CareerMatri에서 바로 볼 수 있습니다. 수업 과제나 캡스톤, 현장실습, 동아리 활동 하나만 적어도 검사에서 나온 영역과 실제 활동이 같은 방향인지 맞춰 볼 수 있습니다.`) +
        `<div class="two">${note("이렇게 적으면 됩니다", ul(["활동 이름과 기간", "어느 영역의 일이었는지", "내가 직접 정한 것 한두 가지", "남은 결과물, 그리고 무엇과 비교했는지"]))}${note("적고 나면", ul(["내 CareerMatri에서 그 활동이 해당 영역의 경험으로 붙습니다", "다음 검사 리포트에 그 활동의 해설과 자기소개서 재료가 실립니다", "지금 받은 이 리포트의 내용은 그대로 보존됩니다"]), true)}</div>` +
        H("지금 떠오르는 활동 셋", tried.length ? "해 본 적이 있다고 답한 영역을 미리 적어 두었습니다" : "직접 채워 보세요") +
        `<table class="tb ws rec"><thead><tr><th style="width:24%">활동 이름 · 기간</th><th style="width:20%">어느 ${E(x.domainWord)}</th><th>직접 정한 것</th><th style="width:22%">남은 결과물 · 비교한 것</th></tr></thead><tbody>${rows}</tbody></table>` +
        band("어디서", "내 CareerMatri의 ‘경험 추가’ 화면에 위 표 그대로 옮겨 적으면 됩니다."),
    }];
  }
  const out: Page[] = [];
  const dated = exps.filter((e) => e.started_on);
  if (dated.length) {
    const items = dated.map((e, i) => ({ label: e.title, from: e.started_on!.slice(0, 7), to: (e.ended_on ?? e.started_on)!.slice(0, 7), color: CYC[i % CYC.length] }));
    out.push({
      part: "03", partName: PART3(x), title: "경험 기록 시간축",
      body: T(`경험 기록 ${exps.length}건을 시간 순서로 놓았습니다`, "직접 적어 두신 활동입니다. 검사 응답과는 따로 받은 자료라서, 뒤쪽에서 두 자료가 같은 영역을 가리키는지 맞춰 봤습니다.") +
        `<div class="wide-art">${timeline(items, { width: 700 })}</div>` +
        exps.slice(0, 4).map((e, i) => {
          const cols = [
            (e.problems ?? []).length ? `<div><p class="k">다룬 문제</p>${ul((e.problems ?? []).slice(0, 3).map(E))}</div>` : "",
            e.decisions.length ? `<div><p class="k">직접 정한 것</p>${ul(e.decisions.slice(0, 3).map(E))}</div>` : "",
            e.artifacts.length || (e.used_where ?? []).length ? `<div><p class="k">남긴 것 · 쓰인 곳</p>${ul([...e.artifacts.slice(0, 2).map((a) => `<b>${E(a)}</b>`), ...(e.used_where ?? []).slice(0, 2).map(E)])}</div>` : "",
          ].filter(Boolean);
          const meta = [KIND[e.kind] ?? "활동", period(e), e.td_codes.map(d.name).join(", ")].filter(Boolean).map(E).join(" · ");
          return `<div class="rec" style="--c:${CYC[i % CYC.length]}"><div class="rec-h"><b>${E(e.title)}</b><span>${meta}</span></div>${cols.length ? `<div class="${cols.length >= 3 ? "g3" : cols.length === 2 ? "two" : ""} sm">${cols.join("")}</div>` : ""}</div>`;
        }).join(""),
    });
  }
  for (const e of exps.slice(0, 3)) {
    const says = e.td_codes.map((td) => {
      const z = d.dom(td);
      if (!z || !d.asked(z)) return { n: d.name(td), t: z?.experience === "NONE" ? "영역별 질문에서는 이 영역을 해 본 적이 없다고 답하셨습니다. 이 활동을 다른 이름의 일로 생각하셨을 수 있으니, 다음 검사에서 ‘해 봤다’로 답해도 되는지 한 번 따져 보세요." : "이번 검사에서는 이 영역의 판단을 자세히 여쭙지 않았습니다. 지금은 이 기록이 이 영역의 경험을 보여 주는 자료입니다." };
      if (z.confirmed.length) return { n: d.name(td), t: `검사에서도 이 영역의 판단 ${z.confirmed.length}가지를 직접 해 봤다고 답하셔서, 기록과 응답이 같은 방향을 가리킵니다.` };
      return { n: d.name(td), t: "검사에서는 이 영역의 판단을 직접 해 봤다고 답하지 않으셨습니다. 이 활동에서 맡은 몫이 어디까지였는지 먼저 정리해 보시길 권합니다." };
    });
    const jobs = x.roles.filter((r) => r.core_ref.td.some((t) => e.td_codes.includes(t))).slice(0, 3);
    const steps = [
      { head: "다룬 문제", body: (e.problems ?? [])[0], color: C.navy }, { head: "직접 정한 것", body: e.decisions[0], color: C.blue },
      { head: "남긴 것", body: e.artifacts[0], color: C.teal }, { head: "비교한 것", body: e.verifications[0], color: C.amber },
    ].filter((s): s is { head: string; body: string; color: string } => !!s.body);
    const cards = [
      `<div class="card">${H("검사도 같은 쪽을 가리키나")}${ul(says.map((s) => `<b>${E(s.n)}</b> ${E(s.t)}`))}</div>`,
      jobs.length ? `<div class="card">${H("이 기록이 이어지는 직무", "직무팩")}${ul(jobs.map((r) => `<b>${E(r.name_ko)}</b> ${E(polite(r.owns))}`))}</div>` : "",
    ].filter(Boolean);
    /* 빈 줄 대신 이 기록에서 뽑은 질문을 미리 적는다 */
    const asks = [
      `${E(e.title)}에서 맡은 역할과 범위는 어디까지였나요?`,
      e.decisions[0] ? `${E(j(q(e.decisions[0]), "을를"))} 정할 때 다른 선택지는 무엇이었고, 왜 그쪽을 버렸나요?` : "이 활동에서 내가 직접 정한 값이나 기준은 무엇이었나요?",
      e.verifications[0] ? `${E(j(q(e.verifications[0]), "과와"))} 견줬을 때 차이는 얼마였고, 그 차이를 어떻게 해석했나요?` : "결과를 무엇과 견줬나요? 아직 견주지 않았다면 지금 무엇과 비교할 수 있을까요?",
      e.artifacts[0] ? `${E(q(e.artifacts[0]))}에 담긴 결과 수치와 걸린 기간은 얼마였나요?` : "결과를 숫자 하나로 말한다면 무엇이 되나요?",
    ];
    out.push({
      part: "03", partName: PART3(x), title: `경험 기록 · ${e.title.slice(0, 24)}`,
      body: T(E(e.title), `${E(KIND[e.kind] ?? "활동")}${period(e) ? ` · ${E(period(e))}` : ""} · ${E(andJoin(e.td_codes.map(d.name)))} 영역의 일로 적으셨습니다.`) +
        (steps.length >= 2 ? chain(steps, { width: 700, height: 104 }) : "") +
        grid(cards) +
        H("면접 전에 답을 준비해 둘 질문", "이 기록에서 뽑았습니다") + ul(asks) +
        band("쓰는 법", e.decisions.length ? `${j(q(e.decisions[0]), "을를")} 문단 첫머리에 두고, 그 판단으로 나온 결과물을 바로 이어 쓰면 자기소개서 한 문단이 됩니다.` : "맡았던 부분 가운데 직접 정한 것 하나를 기록에 더해 두면, 이 활동이 서류에 쓸 수 있는 경험이 됩니다."),
    });
  }
  return out;
}

export function crossPage(x: Inputs, d: X): Page | null {
  if (!x.exps.length) return null;
  const rows = x.m.domains.map((z) => {
    const rec = x.exps.filter((e) => e.td_codes.includes(z.code));
    const test = !d.asked(z) ? "관심과 경험만 여쭘" : z.confirmed.length ? `판단 ${z.confirmed.length}가지 직접 해 봄` : "직접 해 본 판단은 아직";
    const kind = rec.length && z.confirmed.length ? "검사·기록 모두" : rec.length ? "기록에만" : z.confirmed.length ? "검사에만" : null;
    return { z, rec, test, kind };
  }).filter((r) => r.kind);
  const color: Record<string, string> = { "검사·기록 모두": C.navy, "기록에만": C.teal, "검사에만": C.blue };
  return {
    part: "03", partName: PART3(x), title: "검사와 기록의 교차 확인",
    body: T("검사 응답과 경험 기록이 같은 영역을 가리키는지 맞춰 봤습니다", "두 자료가 같은 영역을 가리키면 면접에서 ‘언제, 어떤 과제에서 해 봤나요?’라는 질문에 바로 답할 수 있습니다. 한쪽에만 있는 영역은 나머지 한쪽을 채우면 됩니다.") +
      `<table class="tb tb-s"><thead><tr><th>영역</th><th>근거</th><th>검사</th><th>경험 기록</th></tr></thead><tbody>${rows.map((r) => `<tr><th>${E(d.name(r.z.code))}</th><td>${tag(r.kind!, color[r.kind!])}</td><td>${E(r.test)}</td><td>${r.rec.length ? E(r.rec.map((e) => e.title).join(" / ")) : `<span class="mut">‘경험 추가’에 적을 차례</span>`}</td></tr>`).join("")}</tbody></table>` +
      `<div class="two">
        ${note("검사·기록 모두", "그 기록을 면접 첫 답변의 장면으로 쓰세요. 기록에 적은 결과물과 체크리스트에서 고른 항목이 같은 일을 말하는지 한 번만 맞춰 보면 됩니다.")}
        ${note("한쪽에만 있는 영역", "검사에만 있다면 그 과제를 경험 기록으로 남기고, 기록에만 있다면 다음 검사에서 그 영역을 ‘해 봤다’로 답할 수 있는지 따져 보세요.", true)}
      </div>`,
  };
}

/** 열 단계를 쓰는 사람이 막힐 때 볼 한 줄. 답이 없을 때 빈 칸 대신 싣는다 */
const TRANS_HINT: Record<string, string> = {
  TR_TAG_1: "그 과제가 주로 닿은 기술영역", TR_TAG_2: "함께 걸친 영역이 있다면 하나",
  TR_T1: "다룬 문제를 한 줄로", TR_T2: "그대로 두면 무엇이 곤란했는지", TR_T3: "해석, 시험, 제작 가운데 어떤 방법을 썼는지",
  TR_T4: "바꾼 치수, 재질, 조건", TR_T5: "같은 조건으로 몇 번 반복했는지", TR_T6: "기준값, 이전 결과, 다른 안 가운데 무엇과 견줬는지",
  TR_T7: "처음 결과가 틀렸을 때 고친 것", TR_T8: "결과를 보고 내가 정한 값이나 기준", TR_T9: "보고서, 도면, 시편처럼 남은 것", TR_T10: "그 결과를 누가 어디에 썼는지",
};

export function translationPage(x: Inputs, d: X): Page | null {
  const t = x.m.translation;
  if (!t || !t.steps.length || !x.m.limits.allows_translation) return null;
  const steps = t.steps.filter((s) => TRANS_STEP_KO[s.item_id]);
  if (!steps.length) return null;
  const answered = steps.some((s) => s.choice);
  const ch = (id: string) => steps.find((s) => s.item_id === id)?.choice ?? null;
  /* 고른 보기로 문단 순서를 미리 짜 둔다(빈 줄을 두지 않는다) */
  const draft = [
    ch("TR_T1") && `첫 문장에서 어떤 문제였는지(${q(ch("TR_T1")!)}) 밝힙니다.`,
    ch("TR_T8") && ch("TR_T9") ? `가운데에는 직접 정한 것(${q(ch("TR_T8")!)})과 그 결과로 남은 것(${q(ch("TR_T9")!)})을 이어 씁니다.`
      : ch("TR_T8") ? `가운데에는 직접 정한 것(${q(ch("TR_T8")!)})을 씁니다.` : ch("TR_T9") ? `가운데에는 결과로 남은 것(${q(ch("TR_T9")!)})을 씁니다.` : "",
    ch("TR_T6") && (/없/.test(ch("TR_T6")!) ? `비교한 대상을 묻는 줄에는 ${q(ch("TR_T6")!)}를 고르셨습니다. 다음에 같은 일을 할 때 기준값이나 이전 결과 하나와 견줘 두면 문단이 훨씬 단단해집니다.` : `비교한 대상(${q(ch("TR_T6")!)})은 결과 바로 뒤에 붙여 근거로 씁니다.`),
    ch("TR_T10") && `마지막 문장은 그 결과가 쓰인 곳(${q(ch("TR_T10")!)})으로 마무리합니다.`,
  ].filter(Boolean) as string[];
  return {
    part: "03", partName: PART3(x), title: "경험 하나를 직무의 말로",
    keep: !answered,
    body: (answered
      ? T("검사에서 고른 경험 하나를 열 단계로 풀어 봤습니다", "검사 마지막 묶음에서 경험 하나를 골라 문제부터 쓰임새까지 차례로 답하셨습니다. 고르신 보기를 그대로 옮겼으니 지원서 문단의 뼈대로 쓰면 됩니다.")
      : T("경험 하나를 열 단계로 풀어 써 보세요", "검사에서 자세히 본 영역의 경험 하나를 떠올려 아래 질문에 한 줄씩 답해 보세요. 오른쪽에 무엇을 적으면 되는지 짧게 적어 두었습니다. 답이 모이면 그대로 지원서 문단의 뼈대가 됩니다.")) +
      `<table class="tb tb-s${answered ? "" : " trs"}"><tbody>${steps.map((s) => `<tr><th class="w30">${E(TRANS_STEP_KO[s.item_id])}</th><td>${s.choice ? E(s.choice) : `<span class="mut">${E(TRANS_HINT[s.item_id] ?? "")}</span>`}</td></tr>`).join("")}</tbody></table>` +
      (t.domains.length ? `<p class="sm">이 경험이 닿은 영역: ${E(t.domains.map(d.name).join(" · "))}</p>` : "") +
      (draft.length ? note("이 열 줄로 문단을 짜는 순서", ul(draft.map(E))) : "") +
      band("쓰는 법", "‘무엇을 직접 정했나’에 대한 답은 면접에서 30초 안에 말할 수 있게 소리 내어 연습해 두세요."),
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
