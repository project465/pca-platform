/**
 * 06 자기소개서·면접 준비. 재료는 참여자가 고른 근거와 적어 둔 경험 기록뿐이다.
 * 맡은 역할 · 성과 수치 · 기간처럼 응답에 없는 것은 쓰는 칸으로 비워 둔다.
 */
import type { Axis } from "../scoring/types";
import type { EvidenceGroup } from "../result/model";
import type { Inputs } from "./types";
import { type X } from "./derive";
import { C, donut } from "./charts";
import { E, H, PAL, T, band, chips, lines, note, tag, ul, type Page } from "./kit";
import { j, q } from "./text";

const P = (title: string, body: string): Page => ({ part: "06", partName: "자기소개서·면접 준비", title, body });

type Story = { domain: string; axis: Axis; picks: string[]; artifacts: string[]; verifications: string[]; record: string | null; ready: boolean };

function stories(x: Inputs, d: X): Story[] {
  const groups: (EvidenceGroup & { ready: boolean })[] = [
    ...x.m.evidence.ready.map((g) => ({ ...g, ready: true })), ...x.m.evidence.partial.map((g) => ({ ...g, ready: false })),
  ];
  const seen = new Set<string>();
  const out: Story[] = [];
  for (const g of groups) {
    if (seen.has(g.domain) && out.length >= 2) continue;
    const z = d.dom(g.domain);
    if (!z) continue;
    const picks = g.picks.filter((p) => !z.artifacts.includes(p) && !z.verifications.includes(p));
    if (!picks.length && !g.picks.length) continue;
    seen.add(g.domain);
    const rec = x.exps.find((e) => e.td_codes.includes(g.domain));
    out.push({ domain: g.domain, axis: g.axis, picks: picks.length ? picks : g.picks, artifacts: z.artifacts, verifications: z.verifications, record: rec?.title ?? null, ready: g.ready });
    if (out.length >= 4) break;
  }
  return out;
}

export function storyPages(x: Inputs, d: X): Page[] {
  const ss = stories(x, d);
  if (!ss.length) {
    return [P("자기소개서 재료",
      T("자기소개서 재료는 아직 비어 있습니다", "체크리스트에서 고른 장면이 아직 없어 재료 칸을 채우지 않았습니다. 07장의 30일 할 일을 끝낸 뒤 그 결과물로 아래 네 칸을 채웁니다.") +
      `<div class="story"><div class="story-g">${["상황과 내 역할", "내가 정한 것", "남긴 것", "무엇과 비교했고 무엇이 달라졌나"].map((l) => `<div class="sp empty"><p class="k">${l}</p><p>참여자가 채웁니다</p></div>`).join("")}</div></div>` +
      lines(6, "지금 떠오르는 장면 하나") + band("쓰는 법", "한 문단에는 판단 하나만 깊게 씁니다."))];
  }
  const out: Page[] = [];
  for (let a = 0; a < ss.length; a += 2) {
    const st = ss.slice(a, a + 2);
    out.push(P(`자기소개서 재료 ${a + 1}${st.length > 1 ? `·${a + 2}` : ""}`,
      T(a === 0 ? "자기소개서 한 문단은 네 칸으로 씁니다" : "재료가 더 있습니다", "칸은 참여자가 고른 근거와 경험 기록에서 가져왔습니다. 빈 칸은 응답에 없는 내용이라 참여자가 직접 채웁니다.") +
      st.map((s) => {
        const roles = d.rolesOf(s.domain).filter((r) => r.strength === "중심").slice(0, 3).map((r) => d.roleName(r.role));
        const cell = (label: string, text: string | null) => text ? `<div class="sp"><p class="k">${label}</p><p>${E(text)}</p></div>` : `<div class="sp empty"><p class="k">${label}</p><p>참여자가 채웁니다</p></div>`;
        return `<div class="story"><div class="story-h"><b>${E(d.name(s.domain))} · ${E(d.axisName(s.axis))}</b><span>${s.ready ? tag("바로 쓸 수 있음", C.navy) : tag("정리가 덜 됨", C.teal)} 이어지는 직무: ${E(roles.join(" · ") || "관계표에 없음")}</span></div>
          <div class="story-g">${cell("상황과 내 역할", s.record ? `${s.record} (맡은 범위는 직접 적습니다)` : null)}${cell("내가 정한 것", s.picks.slice(0, 2).join(" / "))}${cell("남긴 것", s.artifacts.slice(0, 2).join(" · ") || null)}${cell("무엇과 비교했고 무엇이 달라졌나", s.verifications[0] ? `${j(s.verifications[0], "과와")} 비교 (달라진 것은 직접 적습니다)` : null)}</div></div>`;
      }).join("") +
      lines(3, "위 재료로 쓴 첫 문장")));
  }
  return out;
}

export function framePage(x: Inputs, d: X): Page {
  const s = stories(x, d)[0];
  const u = (t: string | undefined) => (t ? `<u>${E(t)}</u>` : `<span class="blank"></span>`);
  return P("자기소개서 문단",
    T("한 문단은 상황, 내가 정한 것, 남긴 것, 달라진 것 순서입니다", "밑줄은 참여자가 고른 근거에서 가져온 말이고, 점선은 참여자가 채울 자리입니다.") +
    `<div class="frame">
      <p><span class="fb">[상황]</span> 과제: ${u(s?.record ?? undefined)} · 맡은 일: <span class="blank"></span></p>
      <p><span class="fb">[정한 것]</span> ${s ? u(s.picks[0]) : `<span class="blank"></span>`} · 기준: <span class="blank"></span> · 고르지 않은 안과 그 까닭: <span class="blank"></span></p>
      <p><span class="fb">[남긴 것]</span> 결과물: ${u(s?.artifacts[0])}</p>
      <p><span class="fb">[달라진 것]</span> 비교한 대상: ${u(s?.verifications[0])} · 달라진 점: <span class="blank"></span></p>
    </div>` +
    `<div class="two">
      ${note("잘 읽히는 문단", ul(["판단 하나만 깊게 씁니다", "‘우리’ 대신 ‘제가 정한 것’을 씁니다", "숫자 하나와 기간 하나를 넣습니다"]))}
      ${note("흔히 빠지는 함정", ul(["경험을 여러 개 늘어놓기", "느낀 점으로 문단 끝내기", "결과물 이름 없이 ‘열심히 했다’로 쓰기"]), true)}
    </div>` + lines(7, "완성한 문단"));
}

export function portfolioPage(x: Inputs, d: X): Page {
  const have = [...new Set(x.m.domains.flatMap((z) => z.artifacts.map((a) => `${a}|${z.code}`)))].map((k) => { const [a, td] = k.split("|"); return { title: a, td, status: "보유" as const }; });
  const make = x.m.actions.filter((a) => a.code === "BUILD_OUTPUT" && a.domain).map((a) => ({ title: a.material.artifacts[0] ?? a.material.workflow?.output ?? "", td: a.domain!, status: "새로 만들기" as const })).filter((v) => v.title);
  const rec = x.exps.flatMap((e) => e.artifacts.map((a) => ({ title: a, td: e.td_codes[0] ?? "", status: "보유" as const })));
  const all = [...have, ...rec, ...make].filter((v, i, arr) => arr.findIndex((w) => w.title === v.title) === i).slice(0, 14);
  const nh = all.filter((v) => v.status === "보유").length;
  return P("포트폴리오 목록",
    T(all.length ? `포트폴리오에 넣을 결과물은 이미 ${nh}개, 새로 만들 것은 ${all.length - nh}개입니다` : "포트폴리오에 넣을 결과물을 아직 고르지 않았습니다", "검사와 경험 기록에서 고른 결과물과, 07장 할 일에서 새로 만들 결과물을 한 목록으로 모았습니다.") +
    (all.length ? `<div class="two r46"><div class="card cen">${donut([{ label: "보유", value: nh, color: PAL.teal }, { label: "새로 만들기", value: all.length - nh, color: PAL.amber }], { size: 200, center: [`${nh}`, "이미 가진 결과물"] })}<div class="lg"><span><i style="background:${PAL.teal}"></i>보유 ${nh}</span><span><i style="background:${PAL.amber}"></i>새로 만들기 ${all.length - nh}</span></div></div>
      <table class="tb tb-xs"><thead><tr><th>결과물</th><th>상태</th><th>영역</th></tr></thead><tbody>${all.map((v) => `<tr><td><b>${E(v.title)}</b></td><td>${tag(v.status, v.status === "보유" ? C.teal : C.amber)}</td><td class="mut">${E(v.td ? d.name(v.td) : "")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="na-box"><b>고른 결과물이 없습니다</b>다음 과제에서 남길 결과물 이름을 먼저 정해 두면 이 목록이 생깁니다.</div>`) +
    H("결과물 한 장의 구성") +
    `<div class="g3">${note("1. 결과물", "표나 문서 한 장(캡처해도 됩니다)")}${note("2. 내가 정한 것", "직접 정한 기준 한 줄")}${note("3. 비교한 대상", "목표나 지난 결과나 다른 안 가운데 무엇과 비교했는지 한 줄")}</div>` +
    H("포트폴리오 첫 장", "참여자가 채웁니다") +
    `<table class="tb ws"><tbody>${["결과물 이름", "어떤 과제에서", "내가 정한 것", "비교한 대상과 결과", "이 결과물로 답할 면접 질문"].map((h) => `<tr><th>${h}</th><td></td></tr>`).join("")}</tbody></table>`);
}

type Qn = { q: string; why: string; material: string; dir: string };

function questions(x: Inputs, d: X): Qn[] {
  const out: Qn[] = [];
  for (const g of x.m.evidence.ready.slice(0, 4)) {
    const z = d.dom(g.domain);
    const pick = g.picks.find((p) => !z?.artifacts.includes(p)) ?? g.picks[0];
    if (!pick) continue;
    out.push({
      q: `${d.name(g.domain)}에서 ${q(pick)}고 하셨는데, 그때 무엇을 기준으로 정했고 다른 안은 왜 고르지 않았나요?`,
      why: `${d.axisName(g.axis)}: ${d.axisWhat(g.axis)}`,
      material: `${pick}${z?.artifacts[0] ? ` · 결과물 ${z.artifacts[0]}` : ""}`,
      dir: "장면 하나를 정해 기준, 버린 안, 결과 차례로 30초 안에 말합니다.",
    });
  }
  for (const g of x.m.evidence.partial.slice(0, 2)) {
    const pick = g.picks[0];
    if (!pick || out.length >= 5) continue;
    out.push({ q: `${d.name(g.domain)}에서 ${q(pick)}고 하셨는데, 그 결과를 무엇과 비교해 확인했나요?`, why: `${d.axisName(g.axis)}: ${d.axisWhat(g.axis)}`, material: pick, dir: "비교한 대상이 아직 없다면, 다음 과제에서 비교표 한 장을 만든 뒤 그 표를 들고 답합니다." });
  }
  for (const g of d.gaps.slice(0, 3)) {
    if (out.length >= 6 || !g.axis) continue;
    out.push({ q: `${d.name(g.domain)}에서 ${j(q(d.axisName(g.axis)), "을를")} 직접 해 본 적이 있나요?`, why: `${d.axisWhat(g.axis)}. 이 결과에서 아직 비어 있는 칸입니다.`, material: "아직 없음 · 07장 할 일과 이어집니다", dir: "실행 과제를 끝낸 뒤 그 결과물을 들고 기준, 버린 안, 결과 차례로 답합니다." });
  }
  return out.slice(0, 6);
}

export function interviewPages(x: Inputs, d: X): Page[] {
  const qs = questions(x, d);
  if (!qs.length) return [];
  const out: Page[] = [];
  for (let a = 0; a < qs.length; a += 3) {
    out.push(P(`면접 질문 ${a + 1}–${Math.min(a + 3, qs.length)}`.replace("–", "~"),
      T(a === 0 ? "면접관은 고른 판단을 다시 묻습니다" : "질문이 더 있습니다", "질문은 참여자가 고른 근거와 비어 있는 칸에서 만들었습니다. 준비한 답은 아래 줄에 직접 적습니다.") +
      qs.slice(a, a + 3).map((v, i) => `<div class="qa"><div class="qa-q"><span>Q${a + i + 1}</span><b>${E(v.q)}</b></div>
        <div class="g3 qa-b"><div><p class="k">왜 묻나</p><p>${E(v.why)}</p></div><div><p class="k">내 재료</p><p>${E(v.material)}</p></div><div><p class="k">답의 방향</p><p>${E(v.dir)}</p></div></div>
        ${lines(2)}</div>`).join("")));
  }
  return out;
}

export function roleQPage(x: Inputs, d: X): Page {
  const r = d.goalRole ?? d.roleOrder[0];
  const g = x.guide.roles[r.code];
  const bestOf = (a: Axis) => d.best.find((b) => b.axis === a)?.level ?? null;
  const items = g ? g.interview.slice(0, 3).map((v) => ({ axis: v.axis, q: v.q, why: v.why })) : r.items.filter((it) => r.required_axes.includes(it.axis)).slice(0, 3).map((it) => ({ axis: it.axis, q: it.ask, why: `${d.name(it.domain)}에서 ${d.axisWhat(it.axis)}` }));
  return P(`${r.name_ko} 직무 면접 질문`,
    T(`${E(r.name_ko)} 직무 면접에서는 이런 질문을 받습니다`, g ? "직무 안내의 질문입니다. 참여자의 지금 단계를 옆에 붙였습니다." : "직무팩의 질문을 면접 질문으로 옮겼습니다. 참여자의 지금 단계를 옆에 붙였습니다.") +
    items.map((v) => {
      const lv = bestOf(v.axis);
      return `<div class="qa"><div class="qa-q"><span>${E(d.axisName(v.axis))}</span><b>${E(v.q)}</b></div><div class="two qa-b"><div><p class="k">왜 묻나</p><p>${E(v.why)}</p></div><div><p class="k">지금 단계</p><p>${lv == null ? "이번에 묻지 않음" : ["해 본 적 없음", "지시받아 수행", "직접 수행", "기준까지 직접 결정"][lv]}</p><p class="mut sm">${lv != null && lv >= 2 ? "근거가 있는 판단입니다. 장면 하나를 정해 둡니다." : "아직 장면이 적은 판단입니다. 30일 할 일과 이어집니다."}</p></div></div>${lines(2)}</div>`;
    }).join("") + band("연습", "질문마다 30초 답을 소리 내어 한 번씩 말해 보고, 막힌 곳을 줄 위에 적어 둡니다."));
}

export function checkPage(x: Inputs, d: X): Page {
  const groups: [string, string[]][] = [
    ["자기소개서", ["문단마다 ‘내가 정한 것’이 하나씩 있다", "결과물 이름이 문장에 들어 있다", "결과 수치와 기간을 직접 적었다", "공고의 담당 업무 표현을 썼다"]],
    ["포트폴리오", ["결과물마다 정한 것 한 줄과 비교 대상 한 줄이 있다", "보유 결과물 가운데 셋을 골랐다", "새로 만들 결과물 하나의 마감일을 정했다"]],
    ["면접", ["질문마다 장면 하나를 정했다", "버린 안의 까닭을 말할 수 있다", "결과가 다음 결정에 쓰인 장면을 하나 준비했다"]],
    ["기관 조사", ["공시와 누리집과 채용 공고를 직접 열어 봤다", "한 장 정리 양식을 채웠다", "아직 확인하지 못한 것을 적어 두었다"]],
  ];
  return P("제출 전 점검표",
    T("자기소개서와 면접 전에 열세 가지를 점검합니다", "하나씩 확인하며 직접 표시합니다.") +
    `<div class="g2">${groups.map(([h, xs]) => `<div class="card">${H(h)}<ul class="cb">${xs.map((t) => `<li><i></i>${E(t)}</li>`).join("")}</ul></div>`).join("")}</div>` +
    lines(5, `30초 자기소개 (${x.major} 전공 · 가장 분명한 강점 하나 · 하고 싶은 일)`) +
    chips(d.goalRole ? d.goalRole.application_material.slice(0, 3) : [], "art"));
}

export function ch6Pages(x: Inputs, d: X): Page[] {
  return [...storyPages(x, d), framePage(x, d), portfolioPage(x, d), ...interviewPages(x, d), roleQPage(x, d), checkPage(x, d)];
}
