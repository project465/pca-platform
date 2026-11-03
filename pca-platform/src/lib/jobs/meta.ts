/**
 * 공고 카드의 칸(분류 · 분야 · 학위 표시 · 지역 · 종류)을 글에서 읽는다(2026-11-03 대표 "카드의 분류 · 분야 ·
 * 학위 표시 · 마감일 · 지역을 칸으로 저장").
 *
 * **네트워크 없이 시험할 수 있게 따로 둔다**(`jobindustry:feed`). 잡인더스트리 화면 꼴은 2026-11-03 시험 세션이
 * 브라우저로 확인한 것을 따른다.
 * - 상세 본문(`.board_txt_area`)은 채용 게시판 다섯 곳 모두 같은 문장 틀이다:
 *   `모집 분야: … 지원 자격: … 고용 형태: … 근무지: … 접수 기간: …`. 줄이 바뀌지 않을 수 있어 칸 이름으로 자른다
 *   (`splitFields`). 학위는 지원 자격, 지역은 근무지, 마감은 접수 기간에서 읽는다
 * - 분류는 게시판(488 → 대학원 …), 분야는 목록 카드의 `.title em`(아임웹 게시판 분류, 예: `IT/AI/빅데이터/블록체인`)
 *
 * **못 읽으면 비운다.** 짐작으로 채운 칸은 카드에서 틀린 정보로 읽힌다.
 */

export type PostingKind = "job" | "grad" | "faculty" | "funding" | "evaluator" | "education";
export type DegreeMin = "bachelor" | "master" | "phd" | "any";

/* ── 종류: 대학원 · 연구실 모집인가 ─────────────────────────────── */

/**
 * 게시판이 정한 종류와 고용 형태로 이 공고의 종류를 정한다(2026-11-03 버그 ③).
 *
 * 전에는 요구 줄에 `석사` · `박사` 가 있으면 대학원 묶음에 넣었다. 요구 줄은 학력 조건을 일부러 남긴 것이라
 * (`map.ts` 의 `pick`), 기업 경력 채용("생체신호처리 엔지니어(2년 이상) 채용")이 "대학원 · 연구실 모집" 에 들어갔다.
 * 이제는 **대학원 게시판(488)에서 온 것만** 대학원이다. 488 에서 왔어도 **고용 형태가 정규직 · 계약직이면 채용**이다
 * (연구실이 연구원을 고용하는 공고). 요구 줄의 학위 말은 보지 않는다.
 */
export function kindOf(boardKind: PostingKind, employment?: string | null): PostingKind {
  if (boardKind !== "grad") return boardKind;
  return /정규직|계약직/.test(employment ?? "") ? "job" : "grad";
}

/**
 * **연구자 플랜이 쓸 묶음**(2026-11-03 결정 "대학원 · 교원 임용 · 기업 R&D · 박사급(정출연 캘린더 포함)").
 * 지금 화면에는 쓰지 않는다. 연구비 · 평가위원 · 교육은 채용 공고가 아니라 `researchExtraKinds` 로 따로 꺼낸다.
 */
export const RESEARCH_CATEGORIES = ["기업 R&D", "출연연", "정출연"] as const;
export function isResearchPosting(
  p: { posting_kind?: string | null; category?: string | null; degree_min?: string | null },
): boolean {
  if (p.posting_kind && RESEARCH_EXTRA_KINDS.includes(p.posting_kind as PostingKind)) return false;
  if (p.posting_kind === "grad" || p.posting_kind === "faculty") return true;
  if (p.category && (RESEARCH_CATEGORIES as readonly string[]).includes(p.category)) return true;
  return p.degree_min === "phd" || p.degree_min === "master";
}
/** 같은 묶음을 SQL 로(칸이 선 DB 에서만 쓴다). `isResearchPosting` 과 함께 고친다 */
export const RESEARCH_SQL = `(posting_kind IS DISTINCT FROM 'funding' AND posting_kind IS DISTINCT FROM 'evaluator'
  AND posting_kind IS DISTINCT FROM 'education'
  AND (posting_kind IN ('grad','faculty') OR category IN ('기업 R&D','출연연','정출연') OR degree_min IN ('phd','master')))`;
/** 채용이 아닌 연구자용 게시판(연구비 · 평가위원 · 교육). **MAT 공고 목록에 세우지 않는다** */
export const RESEARCH_EXTRA_KINDS: PostingKind[] = ["funding", "evaluator", "education"];
/** MAT 공고 목록에 서는 종류. 칸이 빈 옛 줄(null)도 선다 */
export const LISTED_SQL = `(posting_kind IS NULL OR posting_kind IN ('job','grad','faculty'))`;

/* ── 본문 칸 ────────────────────────────────────────────────────── */

/** 잡인더스트리 본문 틀의 칸 이름. 채용 · 연구비 · 평가위원 게시판을 다 받는다 */
export const FIELD_LABELS: Record<string, RegExp> = {
  모집분야: /모집\s?분야/, 지원자격: /지원\s?자격/, 고용형태: /고용\s?형태/, 근무지: /근무\s?지(?:역)?/,
  접수기간: /접수\s?기간/, 소관부처: /소관\s?부처/, 전문기관: /전문\s?기관/, 공고번호: /공고\s?번호/,
  공모유형: /공모\s?유형/, 모집인원: /모집\s?인원/,
};

/**
 * `모집 분야: … 지원 자격: … 고용 형태: …` 를 칸마다 나눈다. 한 줄에 이어 적혀 있어도 칸 이름에서 자른다.
 * 값은 120자까지. 없는 칸은 빠진다.
 */
export function splitFields(text: string): Record<string, string> {
  const s = text ?? "";
  const marks: { key: string; at: number; end: number }[] = [];
  for (const [key, re] of Object.entries(FIELD_LABELS)) {
    const g = new RegExp(`(?:^|[\\s\\n·•■▶-])(${re.source})\\s*[:：]`, "g");
    let m: RegExpExecArray | null;
    while ((m = g.exec(s))) {
      const at = m.index + m[0].indexOf(m[1]);
      if (!marks.some((x) => x.key === key)) marks.push({ key, at, end: m.index + m[0].length });
    }
  }
  marks.sort((a, b) => a.at - b.at);
  const out: Record<string, string> = {};
  marks.forEach((m, i) => {
    const v = s.slice(m.end, marks[i + 1]?.at ?? s.length).replace(/\s+/g, " ").trim();
    if (v) out[m.key] = v.slice(0, 120);
  });
  return out;
}

/**
 * 접수 기간의 끝 날짜. `~ 2026.11.01(일)` · `2026.10.27 ~ 2026.11.10 14:00` → 끝 날짜.
 * `상시 모집` · `채용 시` 처럼 날짜가 없으면 빈 글(상시: 남긴다).
 */
export function periodEnd(v: string | null | undefined): string {
  const s = v ?? "";
  if (/상시|채용\s?시/.test(s) && !/\d{2}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}/.test(s)) return "";
  const all = [...s.matchAll(/((?:20)?\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/g)];
  const last = all[all.length - 1];
  return last ? `${last[1].length === 2 ? `20${last[1]}` : last[1]}.${last[2]}.${last[3]}` : "";
}

/** 고용 형태 값을 짧게: 정규직 · 무기계약직 · 계약직 · 비정규직 · 인턴 · 위촉. 못 읽으면 null */
export function employmentOf(v: string | null | undefined): string | null {
  const m = (v ?? "").match(/무기\s?계약직|비정규직?|정규직|계약직|인턴|위촉직?|파견직?|기타/);
  return m ? m[0].replace(/\s+/g, "") : null;
}

/* ── 학위 표시 ──────────────────────────────────────────────────── */

const RANK: Record<Exclude<DegreeMin, "any">, number> = { bachelor: 1, master: 2, phd: 3 };
const KO: Record<Exclude<DegreeMin, "any">, string> = { bachelor: "학사", master: "석사", phd: "박사" };
const OF: Record<string, Exclude<DegreeMin, "any">> = { 학사: "bachelor", 석사: "master", 박사: "phd" };

/** 표(tag) 글이 학위 표시인가: `석사·박사` · `경력·신입박사` · `전문연구요원(석사)` · `박사 이상` */
const DEGREE_TAG = /^[\s(]*(학사|석사|박사|석·박사|학·석사|경력|신입|전문연구요원|학력\s?무관)[\s\S]{0,20}$/;

/**
 * 학위 표시와 가장 낮은 요구 학위. 글에 학위 말이 없으면 둘 다 null.
 *
 * - `석·박사` · `석박사` · `석/박사` 는 석사와 박사 둘 다. `박사후연구원` 은 박사를 요구한다
 * - `석사 이상` 처럼 `이상` 이 붙으면 그 학위가 가장 낮은 요구다. 아니면 나온 것 가운데 가장 낮은 것
 * - `학력 무관` 만 있으면 `any`
 */
export function degreeOf(text: string, tags: string[] = []): { label: string | null; min: DegreeMin | null } {
  const tag = tags.map((t) => t.trim()).find((t) => DEGREE_TAG.test(t) && /학사|석사|박사|무관/.test(t));
  const s = (text ?? "").replace(/\s+/g, " ");
  const got = new Set<Exclude<DegreeMin, "any">>();
  if (/학\s?[·.,/]?\s?석\s?[·.,/]?\s?박사/.test(s)) { got.add("bachelor"); got.add("master"); got.add("phd"); }
  if (/석\s?[·.,/]?\s?박사/.test(s)) { got.add("master"); got.add("phd"); }
  if (/학\s?[·.,/]\s?석사|학석사/.test(s)) { got.add("bachelor"); got.add("master"); }
  for (const m of s.matchAll(/(학사|석사|박사)/g)) got.add(OF[m[1]]);
  /* `석사 이상` 은 석사가 가장 낮다. `학사·석사·박사 이상` 처럼 여럿을 늘어놓은 끝의 `이상` 은 아니다(가장 낮은 것) */
  const atLeast = s.match(/(?<![·.,/]\s?)(학사|석사|박사)\s?(학위\s?)?(취득\s?)?(소지\s?)?(자\s?)?이상/);
  const sorted = [...got].sort((a, b) => RANK[a] - RANK[b]);
  let min: DegreeMin | null = atLeast ? OF[atLeast[1]] : sorted[0] ?? null;
  if (!min && /학력\s?(무관|제한\s?없)/.test(s)) min = "any";
  if (tag) {
    /* 사이트가 단 표시가 있으면 글자 그대로 둔다. 가장 낮은 학위는 표시에서 다시 읽는다 */
    const t = degreeOf(tag);
    return { label: tag.replace(/\s+/g, " "), min: t.min ?? min };
  }
  if (!sorted.length) return { label: min === "any" ? "학력 무관" : null, min };
  const names = sorted.map((d) => KO[d]);
  let label = names.join("·");
  if (/전문\s?연구\s?요원/.test(s)) label = `전문연구요원(${names.filter((n) => n !== "학사").join("·") || names[0]})`;
  else if (/신입\s?박사/.test(s)) label = /경력/.test(s) ? "경력·신입박사" : "신입박사";
  else if (atLeast && sorted.length === 1) label = `${names[0]} 이상`;
  return { label, min };
}

/* ── 분야 ───────────────────────────────────────────────────────── */

/** 사이트 카드의 분야 이름. 앞에 있는 것이 같은 점수일 때 이긴다 */
export const FIELDS: [string, RegExp][] = [
  ["IT·AI·통신", /\bIT\b|인공\s?지능|\bAI\b|빅\s?데이터|머신\s?러닝|딥\s?러닝|소프트웨어|\bSW\b|컴퓨터|정보\s?통신|통신|네트워크|블록체인|클라우드|정보\s?보안|자연어|\bLLM\b|데이터\s?(과학|사이언스|분석|엔지니어)/i],
  ["전기·전자·반도체", /반도체|전자|전기|회로|디스플레이|이차\s?전지|배터리|전력|임베디드|\bRF\b|센서|광학/],
  ["기계·항공우주", /기계|항공|우주|자동차|로봇|모빌리티|조선|드론|발사체|추진/],
  ["바이오·의료", /바이오|의료|의약|제약|생명|임상|헬스|의공|생체|유전체|세포|신약|의학|병원/],
  ["화학·소재·에너지", /화학|화공|소재|재료|고분자|촉매|에너지|원자력|수소|태양광|나노/],
  ["환경·건설", /환경|건설|토목|건축|기후|대기|수질|지반/],
  ["자연과학", /수학|물리|천문|지구\s?과학|통계학|기초\s?과학/],
  ["경영·사회·인문", /경영|경제|사회\s?과학|인문|정책|행정|법학|교육학|심리|마케팅|회계/],
];

/**
 * 분야 하나. 표 글은 5점, 제목은 3점, 본문은 그 분야 말이 든 줄마다 1점(최대 3).
 * **3점 이상이고 둘째보다 앞설 때만** 단다: 본문에 한 번 지나가는 말로 분야를 달지 않는다.
 */
export function fieldOf(title: string, body: string, tags: string[] = []): string | null {
  const lines = (body ?? "").split("\n");
  const scored = FIELDS.map(([label, re]) => {
    let n = 0;
    if (tags.some((t) => re.test(t))) n += 5;
    if (re.test(title ?? "")) n += 3;
    n += Math.min(3, lines.filter((l) => re.test(l)).length);
    return { label, n };
  });
  const sorted = [...scored].sort((a, b) => b.n - a.n);
  const [a, b] = sorted;
  return a.n >= 3 && a.n > (b?.n ?? 0) ? a.label : null;
}

/* ── 지역 ───────────────────────────────────────────────────────── */

/* 시 · 도. **세종대학교는 서울이다**: `세종` 뒤에 `대` 가 오면 세종으로 보지 않는다 */
const SIDO: [string, RegExp][] = [
  ["서울", /서울/], ["인천", /인천|송도/], ["경기", /경기|판교|수원|성남|용인|화성시|평택|안산|안양|고양|파주|이천|분당|광교/],
  ["대전", /대전|대덕/], ["세종", /세종(?!대)/], ["충북", /충북|충청북도|청주|오송|오창|진천|음성/],
  ["충남", /충남|충청남도|천안|아산|당진|서산/], ["부산", /부산/], ["대구", /대구/], ["울산", /울산/],
  ["경북", /경북|경상북도|포항|구미|경산|안동/], ["경남", /경남|경상남도|창원|진주|김해|사천|거제/],
  ["광주", /광주광역시|광주\s|광주$|광주과학기술원|GIST/], ["전북", /전북|전라북도|전주|익산|완주|군산/],
  ["전남", /전남|전라남도|여수|순천|나주|광양/], ["강원", /강원|춘천|원주|강릉/], ["제주", /제주/],
];
/* 나라. 해외 연구실 공고(ASU · NUS · Iowa)가 있다. 두 나라에 다 있는 이름(Cambridge · Georgia)은 넣지 않는다 */
const ABROAD: [string, RegExp][] = [
  ["미국", /미국|\bUSA\b|\bU\.S\.|United States|Arizona|Iowa|California|Texas|Massachusetts|New York|Michigan|Illinois|Pennsylvania|Ohio State|\bASU\b|\bMIT\b|Stanford|Harvard|Purdue|UCLA|UC Berkeley/i],
  ["싱가포르", /싱가포르|Singapore|\bNUS\b|\bNTU\b/i], ["캐나다", /캐나다|Canada|Toronto/i],
  ["영국", /영국|United Kingdom|\bUK\b|London|Oxford/i], ["독일", /독일|Germany|Max Planck/i],
  ["일본", /일본|Japan|Tokyo|Kyoto/i], ["중국", /중국|China|Beijing|Shanghai/i], ["홍콩", /홍콩|Hong Kong/i],
  ["대만", /대만|Taiwan/i], ["호주", /호주|Australia/i], ["스위스", /스위스|Switzerland|\bETH\b|EPFL/i],
  ["네덜란드", /네덜란드|Netherlands/i], ["프랑스", /프랑스|France/i], ["스웨덴", /스웨덴|Sweden/i],
  ["사우디아라비아", /사우디|KAUST/i],
];

const firstHit = (s: string, table: [string, RegExp][]): string | null => {
  let best: { label: string; at: number } | null = null;
  for (const [label, re] of table) {
    const m = re.exec(s);
    if (m && (!best || m.index < best.at)) best = { label, at: m.index };
  }
  return best?.label ?? null;
};

/**
 * 지역 표시와 해외 여부. 근무지 칸(`place`, `splitFields` 의 `근무지`) → 근무지 줄 → 제목 → 표 글 → 위치를 말하는
 * 줄 차례로 본다. **본문 아무 데서나 줍지 않는다**: 대전 공고 본문에 `서울대 졸업` 이 있어도 서울이 아니다.
 */
export function regionLabelOf(title: string, body: string, tags: string[] = [], place?: string | null): { label: string | null; abroad: boolean | null } {
  if (place) {
    const away = firstHit(place, ABROAD);
    const home = firstHit(place, SIDO);
    if (home) return { label: home, abroad: false };
    if (away) return { label: away, abroad: true };
  }
  const lines = (body ?? "").split("\n");
  const placed = lines
    .map((l) => l.match(/(근무\s?(지|지역|장소|처|위치)|소재지|위치|지역|Location)\s*[:：]\s*(.{1,80})/i)?.[3] ?? "")
    .filter(Boolean);
  const where = lines.filter((l) => /근무|위치|소재|주소|University|Univ\.|Institute/i.test(l)).slice(0, 6);
  for (const s of [...placed, title ?? "", tags.join(" "), ...where]) {
    const away = firstHit(s, ABROAD);
    const home = firstHit(s, SIDO);
    if (away && !home) return { label: away, abroad: true };
    if (home) return { label: home, abroad: false };
  }
  return { label: null, abroad: null };
}

/* ── 마감 ───────────────────────────────────────────────────────── */

/** 서울 날짜로 오늘(`2026-11-03`). 마감이 지났는지 이 날짜로 잰다 */
export function todayKst(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}
/** 마감일이 오늘보다 앞인가. 날짜가 없으면(상시 · 채용 시) 지나지 않았다고 본다 */
export function isClosed(closesIso: string | null | undefined, now = new Date()): boolean {
  return !!closesIso && closesIso < todayKst(now);
}
