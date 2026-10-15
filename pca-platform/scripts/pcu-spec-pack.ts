/**
 * **그 전공을 아는 분이 읽을 묶음**(갈래 전문가 검토 §16 · §17).
 *
 * 계열마다 대표 갈래 하나를 세우고 열 칸을 적는다: 학과 · 갈래 · 대표
 * 경험 셋 · 남길 Evidence 셋 · Gap · Action · 지원서 재료 · 면접 질문
 * 셋 · 산업과 직무 · **왜 이 학과답다고 보았는지.**
 *
 * **손으로 적지 않는다.** 문면을 고친 날 이 문서가 조용히 옛 글을 들고
 * 있으면, 읽어 주신 분의 판정이 지금 제품에 대한 판정이 아니게 된다.
 * 열 칸 전부 등록부와 영역 사전에서 읽어 온다.
 *
 * **Red-Team 한 줄도 지어내지 않는다**(§17). `이 결과가 틀렸다고 비판한다면
 * 어디를 공격할 수 있는가` 를 다섯 갈래로 **재어서** 가장 약한 쪽을 적는다.
 *
 *   현업 중심        소속이 있어야 쓰는 말이 든 줄 수
 *   학부에 안 나옴   어디에서 하는 일인지가 없는 줄 수 · 저학년 줄 수
 *   다른 학과에도    다른 갈래와 뜻이 가장 겹치는 폭
 *   Evidence 추상적  남길 것의 글자 수와 그 전공 말이 든 수
 *   Action 이 큼     한 걸음에 든 산출물 수와 글자 수
 *
 * 다섯 다 선 아래면 `지금 세는 자로는 공격할 자리가 없다` 를 적는다.
 * **비판을 지어내지 않는다**: 없는 약점을 적으면 읽는 분이 그 자리를
 * 먼저 보고, 정작 있는 자리를 못 본다.
 *
 *   npm run pcu:spec:pack
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { registry, coreFile, packs as packsOf } from "../src/lib/me-v3/core-registry";
import { specView, type SpecView } from "../src/lib/me-v3/result/spec-view";
import { REASON_KO } from "../src/lib/me-v3/scoring/text.ko";
import { allLeaves, offered, universities, visible } from "../src/lib/campus/registry";

const OUT = process.env.OUT ?? "docs/metri/PCU_SPEC_REVIEW_PACK";
const UNIV = process.env.UNIV ?? "PCU";
const WANT = Number(process.env.N ?? 20);

/** §2 소속이 있어야 쓰는 말과 학부 자리. 감사 도구와 같은 자다 */
const PRO_SOFT = /고객사|거래처|양산|납품|출시한/;
const SITE = /수업|과제|팀 프로젝트|조별|캡스톤|실습|현장실습|학회|동아리|공모전|대회|인턴|스터디|봉사|졸업작품|견학|실험|실기|모의|세미나|강의/;
const BASIC_CUE = /관찰|조사|찾아|모은|모아|읽고|정리|적어 본|기초|따라가며|견학|둘러보|목록을 만들|견주어 본|정리해|적은 일/;
const JUNIOR_SITE = /수업|실습|동아리|봉사|견학|스터디|강의|세미나/;
const SENIOR_SITE = /캡스톤|현장실습|공모전|대회|연재|학회/;

/** 2자 이상 한글 낱말. 꼬리를 떼고 센다 */
function words(t: string): string[] {
  return (t.match(/[가-힣]{2,}/g) ?? [])
    .map((w) => w.replace(/(으로|에서|에게|과의|와의|로서|까지|부터|이고|하고|한다|했다|들의|을|를|이|가|은|는|의|에|와|과|도|로|만)$/, ""))
    .filter((w) => w.length >= 2);
}

type Row = {
  core: string; coreName: string; spec: string; specName: string; note: string;
  depts: string[]; sv: SpecView;
  domainLead: string[]; industry: string[]; role: string[];
  gap: string; red: string;
};

function names(core: string, kind: "industry" | "role"): Map<string, string> {
  const m = new Map<string, string>();
  try {
    const p = packsOf<{ packs?: { code?: string; name_ko?: string; name?: string }[] }>(core, kind);
    for (const x of p.packs ?? []) if (x.code) m.set(x.code, x.name_ko ?? x.name ?? x.code);
  } catch { /* 팩이 없으면 코드를 그대로 쓴다 */ }
  return m;
}

type DomainRow = { code: string; name: string; artifacts?: string[]; verify_targets?: string[] };
function domains(core: string): DomainRow[] {
  try { return coreFile<{ domains?: DomainRow[] }>(core, "domains").domains ?? []; }
  catch { return []; }
}

function grams(t: string): Set<string> {
  const s = t.replace(/\s+/g, "");
  const out = new Set<string>();
  for (let i = 0; i + 3 <= s.length; i += 1) out.add(s.slice(i, i + 3));
  return out;
}
function sim(a: string, b: string): number {
  const x = grams(a), y = grams(b);
  if (!x.size || !y.size) return 0;
  let hit = 0;
  for (const g of x) if (y.has(g)) hit += 1;
  return hit / (x.size + y.size - hit);
}

function main(): void {
  /* 어느 학과가 그 갈래를 가리키는가. **자리 수가 아니라 학과 이름으로 센다** */
  const u = universities().find((x) => x.university_code === UNIV);
  const deptOf = new Map<string, Set<string>>();
  if (u) {
    for (const r of allLeaves(u).filter(offered).filter((x) => visible(x.leaf))) {
      if (!r.leaf.core_code) continue;
      const k = `${r.leaf.core_code}/${r.leaf.specialization ?? "-"}`;
      deptOf.set(k, (deptOf.get(k) ?? new Set()).add(r.leaf.name));
    }
  }

  /* 세트 예순셋 */
  const all: Row[] = [];
  for (const c of registry().cores) {
    const raw = c as unknown as Record<string, unknown>;
    const push = (spec: string, specName: string, note: string) => {
      const sv = specView(c.code, spec || null);
      const key = `${c.code}/${spec || "-"}`;
      const ind = names(c.code, "industry"), rol = names(c.code, "role");
      const ds = domains(c.code);
      all.push({
        core: c.code, coreName: c.name_ko, spec, specName, note,
        depts: [...(deptOf.get(key) ?? new Set<string>())],
        sv,
        domainLead: sv.domainLead.map((x) => ds.find((d) => d.code === x)?.name ?? x),
        industry: sv.industryLead.map((x) => ind.get(x) ?? x),
        role: sv.roleLead.map((x) => rol.get(x) ?? x),
        gap: "", red: "",
      });
    };
    for (const s of c.specializations ?? []) push(s.code, s.name_ko, s.note ?? "");
    if (raw.examples || raw.evidence_action || raw.application) {
      push("", `${c.name_ko}(갈래 없이 Core)`, typeof raw.note === "string" ? raw.note : "");
    }
  }

  /* 계열마다 대표 하나. **학과가 가장 많이 가리키는 갈래**를 세운다 */
  const byCore = new Map<string, Row[]>();
  for (const r of all) byCore.set(r.core, [...(byCore.get(r.core) ?? []), r]);
  const pick: Row[] = [];
  for (const [, rs] of byCore) {
    pick.push([...rs].sort((a, b) => b.depts.length - a.depts.length
      || a.spec.localeCompare(b.spec))[0]);
  }
  /* 남은 자리는 학과를 많이 가리키는 갈래로 채운다 */
  const rest = all.filter((r) => !pick.includes(r))
    .sort((a, b) => b.depts.length - a.depts.length || a.spec.localeCompare(b.spec));
  while (pick.length < WANT && rest.length) pick.push(rest.shift()!);
  pick.sort((a, b) => a.core.localeCompare(b.core) || a.spec.localeCompare(b.spec));

  /* Gap 은 공통 문면과 그 영역의 재료로 적는다 */
  for (const r of pick) {
    const ds = domains(r.core).filter((d) => r.sv.domainLead.includes(d.code));
    const verify = ds.flatMap((d) => d.verify_targets ?? []).slice(0, 2);
    const arti = ds.flatMap((d) => d.artifacts ?? []).slice(0, 2);
    r.gap = `${REASON_KO.MISSING_OUTPUT} / 그 영역에서 견줄 것: ${verify.join(" · ") || "(없음)"}`
      + ` / 남길 것: ${arti.join(" · ") || "(없음)"}`;
  }

  /** 낱말마다 그것을 든 세트 수. **흔한 말은 그 전공의 말이 아니다** */
  const wordSets = new Map<string, Set<string>>();
  for (const r of all) {
    const own = `${r.sv.scene.join(" ")} ${r.sv.artifacts.join(" ")} ${r.sv.evidence.join(" ")}`;
    for (const w of new Set(words(own))) {
      wordSets.set(w, (wordSets.get(w) ?? new Set()).add(`${r.core}/${r.spec}`));
    }
  }
  const rare = (w: string) => (wordSets.get(w)?.size ?? 0) <= 8;

  /* §17 Red-Team. **재어서 가장 약한 쪽을 적는다** */
  for (const r of pick) {
    const ev = r.sv.evidence;
    const pro = ev.filter((t) => PRO_SOFT.test(t)).length;
    const noSite = ev.filter((t) => !SITE.test(t)).length;
    const junior = ev.filter((t) => BASIC_CUE.test(t)
      && JUNIOR_SITE.test(t) && !SENIOR_SITE.test(t)).length;
    const body = [...ev, r.sv.evidenceFirst, r.sv.evidenceNext].join(" ");
    let near = 0, nearKey = "";
    for (const o of all) {
      if (o === r) continue;
      const s = sim(body, [...o.sv.evidence, o.sv.evidenceFirst, o.sv.evidenceNext].join(" "));
      if (s > near) { near = s; nearKey = o.specName; }
    }
    /**
     * **글자 수로 추상을 재지 않는다.** `콘티` 와 `단선도` 는 두세 글자인데
     * 손에 쥐어 줄 수 있는 산출물이고, 그것을 추상적이라고 적으면 읽는
     * 분이 멀쩡한 자리를 먼저 보게 된다. 세는 것은 **그 전공의 말이
     * 들어 있는가**다: 예순셋 가운데 여덟 자리 이하가 드는 낱말이 하나도
     * 없으면 어느 학과에나 쓸 수 있는 이름이다.
     */
    const flatArt = r.sv.artifacts.filter((t) => !words(t).some(rare)).length;
    const long = Math.max(r.sv.evidenceFirst.length, r.sv.evidenceNext.length);
    const hits: string[] = [];
    if (pro) hits.push(`현업 중심 — 소속이 있어야 쓰는 말이 든 줄 ${pro} / ${ev.length}`);
    if (noSite >= 2) hits.push(`학부에 안 나옴 — 어디에서 하는 일인지가 없는 줄 ${noSite} / ${ev.length}`);
    if (!junior) {
      hits.push(`학년이 높다 — 1~2학년이 수업·실습·동아리에서 할 수 있는 줄 0 / ${ev.length}`);
    }
    if (near >= 0.5) hits.push(`다른 학과에도 쓸 수 있다 — 가장 겹치는 갈래 ${nearKey} 와 ${near.toFixed(2)}`);
    if (flatArt) hits.push(`Evidence 가 어느 학과에나 쓸 수 있다 — 그 전공의 말이 없는 산출물 ${flatArt} / ${r.sv.artifacts.length}`);
    if (long >= 110) hits.push(`Action 이 크다 — 한 걸음이 ${long}자`);
    r.red = hits.length ? hits.join(" · ")
      : `지금 세는 자로는 공격할 자리가 없다(겹침 최대 ${near.toFixed(2)} · 저학년 자리 ${junior} · 현업 말 0)`;
  }

  /* ── 내보내기 ── */
  mkdirSync("docs/metri", { recursive: true });
  const md: string[] = [];
  md.push("# PCU 갈래 전문가 검토 묶음", "",
    "**이 문서는 생성물이다.** `npm run pcu:spec:pack` 이 등록부와 영역 사전에서",
    "읽어 다시 만든다. 손으로 고치면 다음 생성에서 사라진다.", "",
    `계열 ${byCore.size} · 세트 ${all.length} · 이 묶음 ${pick.length}`, "",
    "판정 칸은 비어 있다. **그 전공을 아는 분이 적는다**: 유지 · 수정 필요 ·",
    "삭제 · 표현 수정 가운데 하나와 까닭을 적어 주시면 그 자리만 고친다.", "");
  pick.forEach((r, i) => {
    md.push(`## ${i + 1}. ${r.specName}  (${r.core}${r.spec ? ` · ${r.spec}` : ""})`, "");
    md.push(`- **배재대 학과** ${r.depts.length ? r.depts.join(" · ") : "(이 갈래를 가리키는 자리가 아직 없다)"}`);
    if (r.note) md.push(`- **이 갈래가 보는 쪽** ${r.note}`);
    md.push(`- **왜 이 학과답다고 보았는가** 그 전공이 자주 서는 영역이 ${r.domainLead.join(" · ")} 이고,`
      + ` 내놓는 것이 ${r.sv.artifacts.slice(0, 2).join(" · ")} 이며,`
      + ` 이 경험이 활용될 수 있는 일이 ${r.industry.slice(0, 2).join(" · ")} 쪽의 ${r.role.slice(0, 2).join(" · ")} 이다`);
    md.push("", "### 대표 경험 셋");
    r.sv.evidence.slice(0, 3).forEach((t) => md.push(`- ${t}`));
    md.push("", "### 남길 수 있는 Evidence 셋");
    r.sv.artifacts.slice(0, 3).forEach((t) => md.push(`- ${t}`));
    md.push("", "### Gap", `- ${r.gap}`);
    md.push("", "### Action 두 걸음",
      `- 먼저 ${r.sv.evidenceFirst}`, `- 다음 ${r.sv.evidenceNext}`);
    md.push("", "### 지원서 문장 재료", `- ${r.sv.application.resume}`);
    md.push("", "### 면접 질문 셋");
    r.sv.application.interview.forEach((t) => md.push(`- ${t}`));
    md.push("", "### Industry / Role",
      `- 산업 ${r.industry.join(" · ")}`, `- 직무 ${r.role.join(" · ")}`);
    md.push("", "### Red-Team (§17)", `- ${r.red}`);
    md.push("", "### 전공자 판정", "- 판정: ", "- 까닭: ", "");
  });
  writeFileSync(`${OUT}.md`, `${md.join("\n")}\n`);

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const head = ["번호", "갈래", "Core", "배재대 학과", "대표 경험 셋", "남길 Evidence 셋",
    "Gap", "Action 먼저", "Action 다음", "지원서 재료", "면접 질문 셋",
    "산업", "직무", "왜 이 학과다운가", "Red-Team", "판정", "까닭"];
  const csv = [head.join(",")];
  pick.forEach((r, i) => csv.push([
    String(i + 1), r.specName, r.core, r.depts.join(" · "),
    r.sv.evidence.slice(0, 3).join(" / "), r.sv.artifacts.slice(0, 3).join(" / "),
    r.gap, r.sv.evidenceFirst, r.sv.evidenceNext, r.sv.application.resume,
    r.sv.application.interview.join(" / "), r.industry.join(" · "), r.role.join(" · "),
    `${r.domainLead.join(" · ")} 영역에 서고 ${r.sv.artifacts.slice(0, 2).join(" · ")} 를 남긴다`,
    r.red, "", "",
  ].map(esc).join(",")));
  writeFileSync(`${OUT}.csv`, `${csv.join("\n")}\n`);

  console.log(`갈래 전문가 검토 묶음 — ${OUT}.md · ${OUT}.csv`);
  console.log(`  계열 ${byCore.size} · 세트 ${all.length} · 이 묶음 ${pick.length}`);
  const red = pick.filter((r) => !r.red.startsWith("지금 세는 자로는"));
  console.log(`\n[§17 Red-Team] 재어서 공격할 자리가 적힌 갈래 ${red.length} / ${pick.length}`);
  for (const r of red) console.log(`  ${r.specName.padEnd(22)} ${r.red}`);
}

main();
