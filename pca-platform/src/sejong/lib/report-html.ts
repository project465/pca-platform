/**
 * 개인별 취업 전략 결과지 본문을 HTML 로 만든다. **웹 미리보기 · PDF · 상담사 열람 · 화면
 * 미리보기 링크가 모두 이 함수 하나를 부른다.** 두 벌로 적으면 어느 날 갈리고, 갈린 쪽을
 * 받은 사람만 그 차이를 안다.
 *
 * **이 파일은 아무것도 불러오지 않는다**(타입만). 내용은 전부 인자로 받는다. 그래야
 * `scripts/sejong/preview/build.mjs` 가 타입만 걷어 내고 브라우저에서 그대로 돌린다.
 *
 * **쓰는 원칙.**
 * - 쪽을 늘리는 것은 그 사람의 값뿐이다: 문항마다의 실제 응답 · 경험 한 건마다의 기록 ·
 *   사업장 한 곳마다의 출처. 같은 문장을 되풀이해 쪽을 채우지 않는다.
 * - 문장을 대신 지어 주지 않는다. 지원서 문장은 빈칸으로 두고 본인이 채운다.
 * - 꾸밈을 걷는다: 둥근 알약 · 그림자 · 흐린 원 대신 표 번호 · 출처 각주 · 손으로 적는 칸.
 * - 대시(—)와 'A가 아니라 B' 대구를 쓰지 않는다(`npm run copy:audit` 이 센다).
 */
import type { Axis, AxisState, Instrument, Result } from "./analysis";

type Option = { code: string; label: string };
type Src = { kind: string; title: string; url: string; checked_on: string };
type OrgIn = {
  id: string; name: string; org_type: string; region_scope: string; location_basis: string;
  hq: { address: string | null }; sejong_sites: { label: string; address: string }[];
  industry_text: string; verify: string; sources: (Src & { id: string; confirms: string })[];
};
type ExpIn = {
  id: string; kind: string; title: string; org_name: string | null; period_text: string | null;
  job_area: string | null; role_text: string | null; checks: string[]; skills: string[];
};

export type ReportInput = {
  r: Result;
  responses: Record<string, number>;
  name: string;
  participantNo: string | null;
  programName: string;
  scoredAt: string;
  experiences: ExpIn[];
  auxAllowed: boolean;
  instrument: Instrument & {
    experience_kinds: Option[];
    region_ranges: { options: Option[] };
    audiences: { options: Option[] };
  };
  levels: Record<string, string>;
  orgs: OrgIn[];
  links: { links: Record<string, string[]>; clusters: { code: string; name: string; where: string; orgs: string[] }[] };
  region: {
    facts: { text: string; verify: string; sources: Src[] }[];
    aux_status: string;
    notices: { info_only: string; hiring: string };
  };
  checkedOn: string;
  labels: {
    state: Record<AxisState, string>;
    verify: Record<string, string>;
    location: Record<string, string>;
    orgType: Record<string, string>;
  };
};

const e = (s: unknown): string => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);

/** 상태는 글자로 읽힌다. 기호는 흑백 인쇄에서도 갈리게 고른다 */
const MARK: Record<AxisState, string> = { CONFIRMED: "■", PARTIAL: "◩", CLAIMED: "□", EXPOSED: "▫", NONE: "–" };
const HZ: Record<string, string> = { D30: "30일 안", D60: "60일 안", D90: "90일 안" };
const DONE_WHEN: Record<string, string> = {
  evidence: "경험 기록에 한 건이 더해졌고 그 판단의 칸을 골랐다",
  growth: "한 일을 날짜와 함께 아래 기록장에 적었다",
  region: "고른 곳의 이름과 확인한 공고 주소를 적었다",
  apply: "지원한 날짜와 원 공고 주소를 적었다",
};
/** 경험 기록 칸마다 본인이 채울 문장 틀. 빈칸은 비워 둔다 */
const PROMPT: Record<string, string> = {
  problems: "제가 다룬 문제는 <u></u> 이었습니다. 그것이 문제라고 본 까닭은 <u></u> 입니다.",
  decisions: "그때 제가 직접 정한 것은 <u></u> 이고, 그렇게 정한 근거는 <u></u> 입니다.",
  artifacts: "일을 마치고 남은 것은 <u></u> 입니다. (문서·기록·작업물의 이름)",
  verifications: "결과를 <u></u> 와(과) 견주어 확인했고, 차이는 <u></u> 이었습니다.",
  used_where: "그 결과는 <u></u> 이(가) <u></u> 에 썼습니다.",
};

export function reportHtml(x: ReportInput): string {
  const { r, instrument: ins, labels } = x;
  const day = x.scoredAt.slice(0, 10);
  const pno = (x.participantNo ?? "000").replace(/[^A-Z0-9-]/gi, "");
  const docNo = `${/^SJ-/i.test(pno) ? pno : `SJ-${pno}`}-${day.replace(/-/g, "")}`;
  const areaName = (c: string) => ins.job_areas.find((j) => j.code === c)?.name ?? c;
  const areas = r.profile.job_areas.map(areaName);
  const opt = (list: Option[], code: string | null | undefined, dflt: string) => list.find((o) => o.code === code)?.label ?? dflt;
  const regionLabel = opt(ins.region_ranges.options, r.profile.region_range, "-");
  const audienceLabel = opt(ins.audiences.options, r.profile.audience, "선택하지 않음");
  const kindLabel = (k: string) => opt(ins.experience_kinds, k, k);
  const checkOf = (code: string) => ins.experience_checks.find((c) => c.code === code);
  const checkForAxis = (ax: Axis) => ins.experience_checks.find((c) => c.axis === ax);
  const axisOf = (ax: Axis) => r.axes.find((a) => a.axis === ax)!;
  const scaleLabel = (v: number | undefined) => v === undefined ? "답 없음" : (ins.scale.find((s) => s.value === v)?.label ?? String(v));

  const by = (st: AxisState[]) => r.axes.filter((a) => st.includes(a.state));
  const strong = by(["CONFIRMED", "PARTIAL"]);
  const claimed = by(["CLAIMED"]);
  const toFill = by(["EXPOSED", "NONE"]);
  const gapAxes = [...new Set(r.gaps.map((g) => g.axis))].map(axisOf);
  const hz = (h: string) => r.actions.filter((a) => a.horizon === h);

  const linked = (o: OrgIn) => x.links.links[o.id] ?? [];
  const reportable = (o: OrgIn) => (o.verify === "OFFICIAL_CROSSCHECKED" || o.verify === "OFFICIAL_SINGLE")
    && o.location_basis !== "UNCONFIRMED" && o.sejong_sites.length > 0;
  const touching = x.orgs.filter((o) => linked(o).some((c) => r.profile.job_areas.includes(c)));
  const ready = touching.filter(reportable);
  const sejong = ready.filter((o) => o.region_scope === "SEJONG");
  const aux = x.auxAllowed ? ready.filter((o) => o.region_scope !== "SEJONG") : [];
  const sejongAll = x.orgs.filter((o) => o.region_scope === "SEJONG");

  /* 출처는 처음 나온 차례로 번호를 매기고 부록에 모은다 */
  const cites: Src[] = [];
  const cite = (s: Src) => {
    let i = cites.findIndex((c) => c.url === s.url);
    if (i < 0) { cites.push(s); i = cites.length - 1; }
    return `<sup>[${i + 1}]</sup>`;
  };

  let t = 0;
  const tableNo = (part: number) => `표 ${part}-${++t}`;
  const caption = (no: string, title: string) => `<p class="rp-cap"><b>${no}.</b> ${e(title)}</p>`;
  const st = (s: AxisState) => `<span class="rp-st ${s}">${MARK[s]} ${e(labels.state[s])}</span>`;
  const head = (no: string, title: string) => `<h2 class="rp-h"><span>${e(no)}</span>${e(title)}</h2>`;
  const page = (cls: string, inner: string) => `<section class="rp-page ${cls}">${inner}</section>`;
  const lines = (n: number) => `<div class="rp-lines">${"<i></i>".repeat(n)}</div>`;
  const runner = (part: string) => `<div class="rp-run"><span>${e(part)}</span><span>${e(docNo)}</span></div>`;

  const out: string[] = [];

  /* ── 표지 ── */
  out.push(`<section class="rp-cover">
  <div class="rp-cover-top"><span>세종 구직자 직무 경험 진단</span><span class="rp-demo">시연판 · DEMO</span></div>
  <div class="rp-cover-title"><h1>개인별 취업 전략 결과지</h1><p>해 온 일로 다음 일을 찾습니다</p></div>
  <table class="rp-cover-meta"><tbody>
    <tr><th>이름</th><td>${e(x.name)}</td><th>참여번호</th><td>${e(x.participantNo ?? "-")}</td></tr>
    <tr><th>참여 사업</th><td colspan="3">${e(x.programName)}</td></tr>
    <tr><th>희망 직무</th><td colspan="3">${e(areas.join(", "))}</td></tr>
    <tr><th>진단 제출</th><td>${e(day)}</td><th>문서 번호</th><td>${e(docNo)}</td></tr>
  </tbody></table>
  <div class="rp-cover-foot"><b>세종일자리경제진흥원 × CareerMatri</b>
    <span>진단 ${e(r.instrument_version)} · 분석 ${e(r.analysis_version)} · 기업 자료 확인일 ${e(x.checkedOn)}</span>
    <span>검증 전 시연판 진단으로 만든 문서입니다. 점수·순위·적합도를 담지 않고, 선발이나 평가에 쓰지 않습니다.</span></div>
</section>`);

  /* ── 이 결과지에 대하여 ── */
  t = 0;
  out.push(page("rp-about", `${runner("이 결과지에 대하여")}
${head("", "이 결과지에 대하여")}
<p>${e(x.name)}님이 ${e(day)}에 직무 경험 진단 ${ins.sections.reduce((n, s) => n + s.items.length, 0)}문항에 답하고,
경험 ${x.experiences.length}건을 기록한 내용으로 만들었습니다. 희망 직무는 ${e(areas.join(", "))}이고, 일하고 싶은 지역 범위는 ‘${e(regionLabel)}’로 고르셨습니다.</p>
<p>판단 여덟 갈래마다 진단에서 고른 단계와, 그 판단을 받치는 경험 기록이 있는지를 함께 봅니다. 그 둘로 다섯 상태 가운데 하나를 적습니다.
상담 때 이 문서를 펴 놓고 빈칸을 같이 채우는 것을 전제로 만들었습니다.</p>
<div class="rp-cols">
  <div><h3>이 문서에 있는 것</h3><ul>
    <li>판단 여덟 갈래의 지금 상태와, 문항마다 고르신 답</li><li>상태를 받친 경험 기록과, 지원서에 옮길 빈칸 문장</li>
    <li>희망 직무와 이어지는 세종 사업장 목록과 그 출처</li><li>30·60·90일 실행 계획과 기록장</li></ul></div>
  <div><h3>이 문서에 없는 것</h3><ul>
    <li>총점, 순위, 직무 적합도 숫자</li><li>기업의 채용 여부 (확인하지 않았습니다)</li>
    <li>지원 대행이나 기업 추천</li><li>합격 가능성이나 취업 결과 예측</li></ul></div>
</div>
${head("", "차례")}
<table class="rp-toc"><tbody>
  <tr><th>1</th><td>지금의 나</td><td>한눈에 보기 · 희망 직무별 살펴보기 · 판단 여덟 갈래 · 판단별 응답 · 경험 기록 · 상담 메모</td></tr>
  <tr><th>2</th><td>세종에서 찾기</td><td>세종 산업 환경 · 사업장 안내 ${sejong.length}곳 · 보조 권역</td></tr>
  <tr><th>3</th><td>다음 90일</td><td>실행 계획 · 실행 기록장 · 다시 진단할 때 볼 칸 · 지원사업 안내</td></tr>
  <tr><th>부록</th><td>근거와 한계</td><td>분석 규칙 · 자료 출처 · 이 문서의 한계</td></tr>
</tbody></table>`));
  out.push(page("rp-about", `${runner("이 결과지에 대하여")}
${head("", "읽는 법")}
<p>판단마다 두 가지를 봅니다. 문항에서 고르신 단계와, 그 판단을 받치는 경험 기록이 몇 건인지입니다. 아래 두 표는 문서 전체에서 같은 뜻으로 씁니다.</p>
${caption("표 0-1", "상태 다섯 가지")}
<table class="rp-t"><thead><tr><th>상태</th><th>무엇을 뜻하나</th><th>다음 걸음</th></tr></thead><tbody>
  <tr><td>${st("CONFIRMED")}</td><td>두 문항 이상에서 ‘직접 해 봤다’ 이상을 골랐고, 받치는 경험 기록이 둘 이상입니다.</td><td>지원서와 면접에서 먼저 씁니다.</td></tr>
  <tr><td>${st("PARTIAL")}</td><td>같은 조건에서 받치는 경험 기록이 하나입니다.</td><td>다른 경험에서 하나 더 찾아 적습니다.</td></tr>
  <tr><td>${st("CLAIMED")}</td><td>직접 해 봤다고 답했지만 받치는 기록이 아직 없습니다.</td><td>해 본 경험을 기록에 적습니다.</td></tr>
  <tr><td>${st("EXPOSED")}</td><td>옆에서 보거나 정해진 대로 따라 해 본 단계입니다.</td><td>직접 맡아 해 볼 기회를 찾습니다.</td></tr>
  <tr><td>${st("NONE")}</td><td>아직 해 보지 않았다고 답했습니다.</td><td>희망 직무에 필요하면 60일 계획에 넣습니다.</td></tr>
</tbody></table>
${caption("표 0-2", "문항의 답 네 단계")}
<table class="rp-t"><thead><tr><th>단계</th><th>고르신 답</th><th>뜻</th></tr></thead><tbody>
${ins.scale.map((s) => `<tr><td>${e(s.level)}</td><td>${e(s.label)}</td><td>${e(x.levels[s.level] ?? "")}</td></tr>`).join("")}
</tbody></table>`));

  /* ── Part 1 ── */
  const divider = (no: string, title: string, summary: string, items: string[]) => `<section class="rp-divider">
  <div class="rp-div-top"><b>${no}</b></div>
  <div class="rp-div-bottom"><h2>${e(title)}</h2><p>${summary}</p><ol>${items.map((i) => `<li>${e(i)}</li>`).join("")}</ol></div>
</section>`;
  out.push(divider("01", "지금의 나",
    `판단 여덟 갈래 가운데 경험 기록이 받쳐 준 것이 ${strong.length}갈래, 응답으로만 확인된 것이 ${claimed.length}갈래, 접해 봤거나 아직인 것이 ${toFill.length}갈래입니다.`
    + (gapAxes.length ? ` 희망 직무에서 먼저 채울 판단은 ${e(gapAxes.map((a) => a.name).join(", "))}입니다.` : " 희망 직무의 핵심 판단에 비어 있는 칸은 없습니다."),
    ["1.1 한눈에 보기", "1.2 희망 직무별 살펴보기", "1.3 판단 여덟 갈래", "1.4 판단별 응답과 근거", "1.5 경험 기록", "1.6 상담 메모"]));

  t = 0;
  const t11 = tableNo(1), t12 = tableNo(1);
  out.push(page("", `${runner("1 지금의 나")}
${head("1.1", "한눈에 보기")}
${caption(t11, "판단 여덟 갈래의 지금 상태")}
<table class="rp-t"><thead><tr><th>상태</th><th class="n">갈래</th><th>해당 판단</th></tr></thead><tbody>
${(["CONFIRMED", "PARTIAL", "CLAIMED", "EXPOSED", "NONE"] as AxisState[]).map((s) => {
    const list = r.axes.filter((a) => a.state === s);
    return `<tr><td>${st(s)}</td><td class="n">${list.length}</td><td>${list.length ? e(list.map((a) => a.name).join(", ")) : "<span class=\"rp-mute\">없음</span>"}</td></tr>`;
  }).join("")}
</tbody></table>
${caption(t12, "진단을 시작할 때 고르신 것")}
<table class="rp-t rp-kv"><tbody>
  <tr><th>희망 직무</th><td>${e(areas.join(", "))}</td></tr>
  <tr><th>일하고 싶은 지역</th><td>${e(regionLabel)}</td></tr>
  <tr><th>해당 구분</th><td>${e(audienceLabel)}</td></tr>
  <tr><th>보유 기술·도구</th><td>${r.profile.skills.length ? e(r.profile.skills.join(", ")) : "<span class=\"rp-mute\">적지 않음</span>"}</td></tr>
  <tr><th>기록한 경험</th><td>${x.experiences.length}건 (제출할 때 ${r.evidence_count}건)</td></tr>
</tbody></table>
<h3>지원서에 먼저 쓸 판단</h3>
${strong.length ? `<ol>${strong.map((a) => `<li><b>${e(a.name)}</b>: ${e(a.evidence.map((v) => v.title).join(", "))}에서 받쳐졌습니다.</li>`).join("")}</ol>`
    : `<p>아직 경험 기록이 받쳐 준 판단이 없습니다. 응답으로만 확인된 ${claimed.length}갈래부터 경험을 하나씩 적으면 이 칸이 찹니다.</p>`}
<h3>희망 직무에서 먼저 채울 판단</h3>
${gapAxes.length ? `<ol>${gapAxes.map((a) => `<li><b>${e(a.name)}</b>: ${e(a.question)} (지금 ${e(labels.state[a.state])})</li>`).join("")}</ol>`
    : "<p>고르신 직무의 핵심 판단에 비어 있는 칸이 없습니다.</p>"}
${r.quality.flat ? `<p class="rp-warn">응답이 한 값에 몰려 있습니다. 결과를 읽기 전에 상담사와 함께 문항을 다시 보기를 권합니다.</p>` : ""}`));

  /* 1.2 희망 직무별 */
  out.push(page("", `${runner("1 지금의 나")}
${head("1.2", "희망 직무별 살펴보기")}
<p>고르신 직무마다 자주 쓰는 판단 ${r.areas[0]?.key.length ?? 4}갈래를 골라 지금 상태를 적었습니다. 직무와 판단의 연결은 시연판의 해석입니다.</p>
${r.areas.map((ar) => {
    const no = tableNo(1);
    const ors = sejong.filter((o) => linked(o).includes(ar.code));
    const gaps = ar.key.filter((k) => k.state === "NONE" || k.state === "EXPOSED");
    return `<div class="rp-area">
<h3>${e(ar.name)}</h3><p class="rp-sub">${e(ar.one_line)}</p>
${caption(no, `${ar.name}에서 자주 쓰는 판단`)}
<table class="rp-t"><thead><tr><th>판단</th><th>묻는 것</th><th>지금 상태</th></tr></thead><tbody>
${ar.key.map((k) => `<tr><td>${e(k.name)}</td><td>${e(axisOf(k.axis).question)}</td><td>${st(k.state)}</td></tr>`).join("")}
</tbody></table>
<p>확인 ${ar.counts.confirmed} · 응답만 ${ar.counts.claimed} · 채울 것 ${ar.counts.to_fill}.
${gaps.length ? ` 채울 판단은 ${e(gaps.map((g) => g.name).join(", "))}이고, 60일 계획에 들어 있습니다.` : " 이 직무에서 비어 있는 판단은 없습니다."}
${ors.length ? ` 세종에서 이 직무와 이어 볼 곳은 ${ors.length}곳입니다(2.2): ${e(ors.slice(0, 6).map((o) => o.name).join(", "))}${ors.length > 6 ? " 외" : ""}.` : " 이 직무와 이어지는, 소재가 확인된 세종 사업장은 아직 없습니다."}</p>
</div>`;
  }).join("")}`));

  /* 1.3 판단 여덟 갈래 */
  const t13 = tableNo(1);
  out.push(page("", `${runner("1 지금의 나")}
${head("1.3", "판단 여덟 갈래")}
<p>세 문항 가운데 두 문항 이상이 닿은 단계를 그 판단의 단계로 봅니다. 한 문항만 높게 고른 것으로는 올라가지 않습니다.</p>
${caption(t13, "판단별 단계와 상태")}
<table class="rp-t"><thead><tr><th>판단</th><th>묻는 것</th><th class="n">단계</th><th>상태</th><th>받친 경험</th></tr></thead><tbody>
${r.axes.map((a) => `<tr><td><b>${e(a.name)}</b></td><td>${e(a.question)}</td><td class="n">L${a.level}</td><td>${st(a.state)}</td>
<td>${a.evidence.length ? e(a.evidence.map((v) => v.title).join(", ")) : a.evidence_possible ? "<span class=\"rp-mute\">없음</span>" : "<span class=\"rp-mute\">기록으로 받치는 칸이 없는 판단</span>"}</td></tr>`).join("")}
</tbody></table>
<p class="rp-note">‘기록으로 받치는 칸이 없는 판단’은 경험 기록 양식에 그 판단을 고르는 칸이 없다는 뜻입니다. 이런 판단은 면접에서 말로 설명할 장면을 따로 준비합니다.</p>`));

  /* 1.4 판단별 응답 */
  const axisBlocks = r.axes.map((a) => {
    const items = ins.sections.flatMap((s) => s.items).filter((i) => i.axis === a.axis);
    const ck = checkForAxis(a.axis);
    let next: string;
    if (a.state === "CONFIRMED") {
      const [t1, t2] = a.evidence.map((v) => v.title);
      next = `면접에서 ‘${e(a.question)}’라고 물으면 ‘${e(t1)}’ 이야기로 답합니다.`
        + (t2 ? ` ‘${e(t2)}’는 두 번째 사례로 둡니다.` : "");
    }
    else if (a.state === "PARTIAL") next = `받친 경험이 ‘${e(a.evidence[0]?.title)}’ 하나입니다. 다른 경험 가운데 ‘${e(ck?.label)}’ 칸을 고를 수 있는 것을 하나 더 적습니다.`;
    else if (a.state === "CLAIMED") next = ck ? `해 봤다고 답하셨습니다. 그 경험을 기록에 적고 ‘${e(ck.label)}’ 칸을 고릅니다.` : "기록으로 받칠 칸이 없는 판단입니다. 면접에서 말할 장면 하나를 1.5의 빈칸에 적어 둡니다.";
    else next = e(ins.growth_actions[a.axis]);
    return `<div class="rp-axis">
<h3><span>${e(a.axis)}</span>${e(a.name)} <small>${e(a.question)}</small></h3>
<table class="rp-t"><thead><tr><th>문항</th><th>고르신 답</th></tr></thead><tbody>
${items.map((i) => `<tr><td>${e(i.text)}${i.example ? `<div class="rp-ex">예: ${e(i.example)}</div>` : ""}</td><td>${e(scaleLabel(x.responses[i.code]))}</td></tr>`).join("")}
</tbody></table>
<p>단계 L${a.level} · ${st(a.state)} · 받친 경험 ${a.evidence.length}건</p>
<p class="rp-next"><b>다음 걸음.</b> ${next}</p>
</div>`;
  });
  out.push(page("rp-axes", `${runner("1 지금의 나")}
${head("1.4", "판단별 응답과 근거")}
<p>문항마다 고르신 답을 그대로 옮겼습니다. 상담 때 답을 고친 까닭이 생기면 다음 진단에서 다시 고르시면 됩니다. 이 문서의 값은 제출한 때의 것으로 굳어 있습니다.</p>
${axisBlocks.join("")}`));

  /* 1.5 경험 기록 */
  const expBlocks = x.experiences.map((v, k) => {
    const axes = v.checks.map((c) => checkOf(c)).filter(Boolean).map((c) => axisOf(c!.axis).name);
    return `<div class="rp-exp">
<h3><span>경험 ${k + 1}</span>${e(v.title)}</h3>
<table class="rp-t rp-kv"><tbody>
  <tr><th>종류</th><td>${e(kindLabel(v.kind))}</td><th>가까운 직무</th><td>${v.job_area ? e(areaName(v.job_area)) : "-"}</td></tr>
  <tr><th>어디서</th><td>${e(v.org_name || "-")}</td><th>언제</th><td>${e(v.period_text || "-")}</td></tr>
  <tr><th>맡은 일</th><td colspan="3">${e(v.role_text || "-")}</td></tr>
  <tr><th>말할 수 있는 것</th><td colspan="3">${v.checks.length ? e(v.checks.map((c) => checkOf(c)?.label ?? c).join(" / ")) : "-"}</td></tr>
  <tr><th>받치는 판단</th><td colspan="3">${axes.length ? e(axes.join(", ")) : "-"}</td></tr>
  ${v.skills.length ? `<tr><th>쓴 기술·도구</th><td colspan="3">${e(v.skills.join(", "))}</td></tr>` : ""}
</tbody></table>
<p class="rp-sub">지원서에 옮길 문장. 빈칸은 직접 채웁니다.</p>
<ol class="rp-fill">${v.checks.filter((c) => PROMPT[c]).map((c) => `<li>${PROMPT[c]}</li>`).join("")}
<li>숫자로 적을 수 있는 것 (양·기간·횟수·금액): <u></u></li></ol>
</div>`;
  });
  out.push(page("rp-exps", `${runner("1 지금의 나")}
${head("1.5", "경험 기록")}
${x.experiences.length
    ? `<p>기록하신 경험 ${x.experiences.length}건입니다. 고르신 칸마다 지원서에 옮길 문장의 틀을 붙였습니다. 이 문서는 문장을 대신 지어 드리지 않습니다. 빈칸에 들어갈 숫자와 이름은 본인만 압니다.</p>${expBlocks.join("")}`
    : `<p>기록한 경험이 없습니다. 아르바이트·인턴·훈련·봉사 가운데 두 가지를 골라 아래에 적어 오시면 상담 때 경험 기록으로 옮깁니다.</p>
<div class="rp-exp"><h3><span>경험 1</span>무슨 일이었나요</h3>${lines(4)}</div><div class="rp-exp"><h3><span>경험 2</span>무슨 일이었나요</h3>${lines(4)}</div>`}`));

  /* 1.6 상담 메모 */
  out.push(page("rp-memo", `${runner("1 지금의 나")}
${head("1.6", "상담 메모")}
<p>상담 때 직접 적는 칸입니다. 이 칸의 내용은 시스템에 저장되지 않습니다.</p>
<h3>상담사 의견</h3>${lines(8)}
<h3>본인 메모</h3>${lines(6)}
<table class="rp-t rp-sign"><tbody><tr><th>상담일</th><td></td><th>상담사</th><td></td><th>확인</th><td></td></tr></tbody></table>`));

  /* ── Part 2 ── */
  out.push(divider("02", "세종에서 찾기",
    `세종에서 조사한 기업·기관 ${sejongAll.length}곳 가운데 고르신 직무와 이어지는 곳은 ${touching.filter((o) => o.region_scope === "SEJONG").length}곳입니다. 그중 공식 출처로 세종 사업장 소재를 확인한 ${sejong.length}곳을 싣습니다. 채용 여부는 한 곳도 확인하지 않았습니다.`,
    ["2.1 세종 산업 환경", `2.2 사업장 안내 (${sejong.length}곳)`, "2.3 보조 권역"]));

  t = 0;
  const t21 = tableNo(2);
  out.push(page("", `${runner("2 세종에서 찾기")}
${head("2.1", "세종 산업 환경")}
${caption(t21, "세종의 산업 묶음 (시연 자료)")}
<table class="rp-t"><thead><tr><th>묶음</th><th>어디</th><th class="n">조사</th><th>조사한 곳 (일부)</th></tr></thead><tbody>
${x.links.clusters.map((c) => `<tr><td><b>${e(c.name)}</b></td><td>${e(c.where)}</td><td class="n">${c.orgs.length}곳</td>
<td>${e(c.orgs.map((id) => x.orgs.find((o) => o.id === id)?.name).filter(Boolean).slice(0, 5).join(", "))}${c.orgs.length > 5 ? " 외" : ""}</td></tr>`).join("")}
</tbody></table>
<h3>지역에서 알아 둘 것</h3>
<ul>${x.region.facts.map((f) => `<li>${e(f.text)}${f.sources.map(cite).join("")} <span class="rp-mute">(${e(labels.verify[f.verify] ?? f.verify)})</span></li>`).join("")}</ul>
${head("2.2", "사업장 안내")}
<p>${e(x.region.notices.info_only)} ${e(x.region.notices.hiring)}</p>
<p>순서는 자료에 적힌 차례이고 점수로 줄 세우지 않았습니다. 지원하기 전에 아래 셋을 직접 확인하세요.</p>
<ol><li>기업 누리집이나 고용24에 올라온 원 공고와 마감일</li><li>근무지 주소 (본사와 다를 수 있습니다)</li><li>지원 자격과 제출 서류</li></ol>`));

  const orgBlocks = sejong.map((o, k) => {
    const site = o.sejong_sites[0];
    return `<div class="rp-org">
<h3><span>${k + 1}</span>${e(o.name)}</h3>
<table class="rp-t rp-kv"><tbody>
  <tr><th>구분</th><td>${e(labels.orgType[o.org_type] ?? o.org_type)} · ${e(labels.location[o.location_basis] ?? o.location_basis)}</td></tr>
  <tr><th>세종 사업장</th><td>${e(site?.address)}${site?.label ? ` (${e(site.label)})` : ""}</td></tr>
  ${o.hq.address && o.location_basis !== "HQ_IN_SEJONG" ? `<tr><th>본사</th><td>${e(o.hq.address)}</td></tr>` : ""}
  <tr><th>업종·사업</th><td>${e(o.industry_text)}</td></tr>
  <tr><th>이어 볼 직무</th><td>${e(linked(o).filter((c) => r.profile.job_areas.includes(c)).map(areaName).join(", "))} <span class="rp-mute">(시연판 해석)</span></td></tr>
  <tr><th>확인 상태</th><td>${e(labels.verify[o.verify] ?? o.verify)} · 확인일 ${e(o.sources[0]?.checked_on)} ${o.sources.map(cite).join("")}</td></tr>
  <tr><th>채용</th><td>확인하지 않았습니다</td></tr>
</tbody></table></div>`;
  });
  if (orgBlocks.length) out.push(page("rp-orgs", `${runner("2 세종에서 찾기")}${orgBlocks.join("")}`));

  out.push(page("", `${runner("2 세종에서 찾기")}
${head("2.3", "보조 권역 (대전·충남·충북)")}
${x.auxAllowed
    ? (aux.length ? `<p>통근권에서 함께 볼 곳: ${e(aux.map((o) => o.name).join(", "))}.</p>` : `<p>${e(x.region.aux_status)}</p>`)
    : "<p>일하고 싶은 지역을 ‘세종 안에서만’으로 고르셨거나 참여 사업에 지역 조건이 있어 싣지 않았습니다.</p>"}
<h3>가 보고 싶은 곳을 적어 두세요</h3>
<table class="rp-t rp-write"><thead><tr><th>기업·기관</th><th>확인한 공고 주소</th><th>마감일</th><th>메모</th></tr></thead>
<tbody>${"<tr><td></td><td></td><td></td><td></td></tr>".repeat(5)}</tbody></table>`));

  /* ── Part 3 ── */
  out.push(divider("03", "다음 90일",
    `할 일 ${r.actions.length}가지를 기한별로 나눴습니다. 30일 안 ${hz("D30").length}가지, 60일 안 ${hz("D60").length}가지, 90일 안 ${hz("D90").length}가지입니다. 이미 한 일을 근거로 남기는 것부터 시작합니다.`,
    ["3.1 실행 계획", "3.2 실행 기록장", "3.3 다시 진단할 때 볼 칸", "3.4 진흥원 지원사업 안내"]));

  t = 0;
  const t31 = tableNo(3);
  const kindAxis = (a: Result["actions"][number]) => a.axis ? axisOf(a.axis).name : a.kind === "region" ? "세종 탐색" : a.kind === "apply" ? "지원" : "직업훈련";
  out.push(page("", `${runner("3 다음 90일")}
${head("3.1", "실행 계획")}
<p>먼저 이미 한 일을 근거로 남기고, 희망 직무에서 비어 있는 판단을 채우고, 원 공고에 직접 지원합니다. 플랫폼이 대신 지원하지 않습니다.</p>
${caption(t31, "30·60·90일 할 일")}
<table class="rp-t rp-plan"><thead><tr><th class="n">번호</th><th>기한</th><th>할 일</th><th>이어지는 것</th><th>다 했다고 볼 때</th><th>확인</th></tr></thead><tbody>
${r.actions.map((a, k) => `<tr><td class="n">${k + 1}</td><td>${HZ[a.horizon]}</td><td>${e(a.text)}</td><td>${e(kindAxis(a))}</td><td>${e(DONE_WHEN[a.kind])}</td><td class="rp-box">☐</td></tr>`).join("")}
</tbody></table>`));

  out.push(page("rp-log", `${runner("3 다음 90일")}
${head("3.2", "실행 기록장")}
<p>한 일을 날짜와 함께 적습니다. 다음 상담과 다시 받는 진단에서 이 쪽을 먼저 봅니다.</p>
${(["D30", "D60", "D90"]).map((h) => `<h3>${HZ[h]}</h3>
<table class="rp-t rp-write"><thead><tr><th>날짜</th><th>한 일</th><th>남은 것 (문서·기록·사진)</th></tr></thead>
<tbody>${"<tr><td></td><td></td><td></td></tr>".repeat(4)}</tbody></table>`).join("")}`));

  const recheck = r.axes.filter((a) => a.state !== "CONFIRMED");
  out.push(page("", `${runner("3 다음 90일")}
${head("3.3", "다시 진단할 때 볼 칸")}
<p>90일 뒤 진단을 다시 받으면 아래 판단이 달라졌는지 봅니다. 이번 상태를 적어 두었습니다.</p>
<table class="rp-t"><thead><tr><th>판단</th><th>이번 상태</th><th>다음 진단에서 볼 것</th><th>다음 상태</th></tr></thead><tbody>
${recheck.map((a) => `<tr><td>${e(a.name)}</td><td>${st(a.state)}</td><td>${a.state === "PARTIAL" ? "받친 경험이 둘이 됐는가" : a.state === "CLAIMED" ? "경험 기록이 하나라도 붙었는가" : "직접 해 본 일이 생겼는가"}</td><td></td></tr>`).join("")}
</tbody></table>
${head("3.4", "진흥원 지원사업 안내")}
<p class="rp-mute">진흥원과 사업 목록이 정해지면 이 자리에 연결합니다. 시연판에서는 비워 둡니다.</p>`));

  /* ── 부록 ── */
  out.push(page("rp-appx", `${runner("부록")}
${head("부록 A", "분석 규칙")}
<ul>
  <li>진단 ${e(r.instrument_version)}은 검증 전 시연판입니다. 문항 ${ins.sections.reduce((n, s) => n + s.items.length, 0)}개, 판단 여덟 갈래이고 갈래마다 문항이 셋입니다. 판단 이름은 CareerMatri ME_V3의 판단 축 이름을 그대로 씁니다.</li>
  <li>판단의 단계는 세 문항 가운데 두 문항 이상이 닿은 가장 높은 단계입니다.</li>
  <li>상태 규칙(${e(r.analysis_version)}): 단계가 L2 이상이고 받친 경험이 둘이면 ‘${e(labels.state.CONFIRMED)}’, 하나면 ‘${e(labels.state.PARTIAL)}’, 없으면 ‘${e(labels.state.CLAIMED)}’입니다. L1은 ‘${e(labels.state.EXPOSED)}’, L0은 ‘${e(labels.state.NONE)}’입니다.</li>
  <li>경험 기록의 칸과 판단의 연결: ${e(ins.experience_checks.map((c) => `${c.label} → ${axisOf(c.axis).name}`).join("; "))}.</li>
  <li>경험 기록은 점수를 만들지 않고, 이미 고른 단계를 올리지도 않습니다. 근거만 붙습니다.</li>
</ul>
${head("부록 B", "자료 출처")}
<ol class="rp-cites">${cites.map((c) => `<li>${e(c.title)}. ${e(c.url)} (${e(c.kind)}, 확인 ${e(c.checked_on)})</li>`).join("")}</ol>
<p class="rp-note">기업·기관 자료는 공식 출처의 검색 발췌로 확인했고 원문 재확인 전입니다. 기업과 직무를 잇는 줄은 시연판의 해석이고 기업이 밝힌 채용 직무가 아닙니다.</p>
${head("부록 C", "이 문서의 한계")}
<ul>
  <li>문항과 규칙은 인지 면접과 예비 검사를 거치지 않았습니다. 결과를 선발·평가에 쓰지 않습니다.</li>
  <li>답은 본인이 고른 것이고, 받친 경험도 본인이 적은 것입니다. 이 문서는 그 사실을 따로 확인하지 않습니다.</li>
  <li>채용 여부, 취업 가능성, 지역 정주 결과를 이 문서가 산출하지 않습니다.</li>
</ul>`));

  return out.join("\n");
}
