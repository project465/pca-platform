import { readFileSync } from "node:fs";
import path from "node:path";
import { CONTENT_DIR } from "@/lib/me-v3/core-registry";
import { university } from "@/lib/campus/registry";
import type { Zone } from "@/lib/me-v3/scoring/types";

/**
 * **세종에서 이어 볼 기업**(고려대 세종 · 세종일자리경제진흥원).
 *
 * 공개 명단(중소벤처기업부 벤처기업 확인 명단 · OpenDART 기업개황)에서
 * 소재지가 세종인 회사를 옮긴 파일을 읽고, 그 회사의 업종과 주력 품목이
 * **이 결과에서 확인된 영역**과 같은 분야에 있는지를 나란히 놓는다.
 *
 * 지키는 것 넷(CLAUDE.md 법적 범위):
 *  - **추천하지 않는다.** 이름은 `내 결과와 잘 맞는 곳` · `이어서 볼 곳` 이다
 *  - **점수를 만들지 않는다.** 묶음은 겹치는 분야가 있는가로만 정하고,
 *    묶음 안의 차례는 상장 여부와 겹친 분야 수와 이름이다
 *  - **채용 여부를 확인하지 않았다**는 것과 지원은 본인이 한다는 것을 적는다
 *  - **명단에 없는 사실을 적지 않는다.** 회사 설명은 업종명과 주력 품목뿐이다
 *
 * Core 를 모르게 짠다: 영역 이름과 산업 이름을 낱말로 읽어 분야를 가른다.
 * 그래서 Core 를 하나 더 열어도 이 파일을 고치지 않는다.
 */

type Org = {
  name: string; source: string; sector: string; product?: string;
  group: string; listed?: string; adres?: string;
};
type OrgFile = { built_on: string; sources: Record<string, string>; orgs: Org[] };

/** 학교 등록부의 첫 도시 → 기업 파일. 파일이 있는 도시만 선다 */
const CITY_FILE: Record<string, string> = { 세종: "sejong-orgs.v1.json" };

/**
 * 분야와 그 분야를 가리키는 낱말. **회사 쪽과 학생 쪽을 같은 자로 잰다.**
 * 회사 쪽은 업종명과 주력 품목, 학생 쪽은 확인된 영역 이름과 그 영역이
 * 이어지는 산업 이름이다.
 */
const THEMES: { key: string; re: RegExp; try: string }[] = [
  { key: "반도체", re: /반도체|웨이퍼|플라즈마|plasma|디스플레이|증착|식각|클린룸/i,
    try: "누리집에서 주력 장비나 제품이 반도체 공정의 어느 단계에 쓰이는지 찾아 한 줄로 적어 보세요" },
  { key: "기계·장비", re: /기계|(?<!전기)장비|설비|기구|구동|금형|공작|자동화|로봇|모빌리티|자동차|조선|플랜트|생산·공정|공정기술/,
    try: "주력 장비 하나를 골라 어떤 부품과 구동 방식으로 움직일지 짐작해 적고, 누리집 자료와 맞춰 보세요" },
  { key: "전기·전자", re: /전기|전자(?!상거래)|회로|전력|제어|센서|계측|통신|무선|안테나|임베디드|펌웨어|신호|전지|배터리|에너지|충전|태양광/,
    try: "주력 제품의 사양표에서 전압·전류·통신 방식 같은 값을 찾아, 과제에서 다뤄 본 값과 나란히 적어 보세요" },
  { key: "소재·화학", re: /소재|화학|재료|고분자|코팅|필름|(?<!적)합성|도료|접착|세라믹/,
    try: "주력 소재가 어느 제품에 들어가는지와 그 소재에서 중요한 물성 하나를 찾아 적어 보세요" },
  { key: "소프트웨어·데이터", re: /소프트웨어|데이터|정보|플랫폼|인공지능|보안(?!등)|클라우드|프로그램|전산|네트워크|(^|[^a-z])ai([^a-z]|$)/i,
    try: "그 회사 서비스를 직접 써 보고 고칠 기능 하나와 그 근거가 될 지표를 적어 보세요" },
  { key: "바이오·의약·식품", re: /바이오|의약|의료(?!용? ?기기)|진단|식품|생명|건강|화장품|제약|간호|보건|영양|조리/,
    try: "주력 제품 하나의 허가·품질 기준을 찾아, 실험이나 실습에서 지킨 기준과 나란히 적어 보세요" },
  { key: "콘텐츠·디자인", re: /광고|디자인|콘텐츠|영상|출판|미디어|방송|공연|게임|웹툰/,
    try: "최근 작업물 하나를 골라 누구를 위해 만들었는지와 무엇을 바꾸면 좋을지 적어 보세요" },
  { key: "건설·환경", re: /건설|토목|건축|환경|시설|지반|측량|조경|상하수|폐기물/,
    try: "최근 맡은 공사나 사업 하나를 찾아 어떤 조건(지반·환경·안전)이 판단을 갈랐을지 적어 보세요" },
];

const themesOf = (s: string) => THEMES.filter((t) => t.re.test(s)).map((t) => t.key);

/** 회사 이름에서 법인 표시를 걷는다. 찾기와 줄 세우기에만 쓴다 */
const bare = (n: string) => n.replace(/주식회사|\(주\)|㈜|\s/g, "");

let cache: { file: string; data: OrgFile } | null = null;
function load(file: string, dir = CONTENT_DIR): OrgFile | null {
  if (cache?.file === file) return cache.data;
  try {
    const data = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as OrgFile;
    cache = { file, data };
    return data;
  } catch {
    /* 파일이 없는 배포본이면 이 절을 세우지 않는다. 지어낸 목록으로 채우지 않는다 */
    return null;
  }
}

export type SejongOrgLine = {
  name: string; listed: string | null; sector: string; product: string;
  /** 겹친 분야 */
  themes: string[];
  /** 그 분야를 확인한 영역(또는 산업) 이름 */
  via: string[];
};

/** 같은 분야로 묶은 회사들. **까닭은 묶음에 한 번만 적는다** */
export type SejongGroup = {
  theme: string;
  /** 그 분야를 확인한 영역(또는 산업) 이름 */
  via: string[];
  orgs: SejongOrgLine[];
  /** 같은 묶음에 더 있는 곳 */
  more: number;
};

export type SejongView = {
  city: string;
  total: number;
  builtOn: string;
  /** 비전세미콘. 명단에 있으면 늘 선다 */
  focus: {
    org: SejongOrgLine;
    /** 이 결과에서 그 회사와 같은 분야로 근거가 확인된 영역 */
    linked: string[];
    /** 해 봤지만 정리가 덜 된, 같은 분야의 영역 */
    open: string[];
    /** 고르신 산업·직무 가운데 같은 분야 */
    paths: string[];
  } | null;
  /** 명단에서 업종·주력 품목에 반도체가 적힌 곳의 수(비전세미콘 포함) */
  semiCount: number;
  /** 이 결과에 반도체 쪽 영역·산업·학과 갈래가 있는가 */
  semiRelevant: boolean;
  strong: SejongGroup[];
  next: SejongGroup[];
  strongN: number;
  nextN: number;
  /** 분야마다 해 볼 것 */
  tries: { theme: string; text: string }[];
};

export type SejongInput = {
  universityCode: string | null;
  /** 영역 이름과 묶음 */
  domains: { name: string; zone: Zone; confirmed: number }[];
  /** 확인된 영역에서 이어지는 산업·직무 이름 */
  linked: string[];
  /** 학과 갈래 이름 · 전공 이름 */
  labels: string[];
};

const STRONG: Zone[] = ["Z1_EVIDENCE_ESTABLISHED"];
const PARTIAL: Zone[] = ["Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST"];

export function sejongView(x: SejongInput): SejongView | null {
  const u = x.universityCode ? university(x.universityCode) : null;
  const city = u?.region_cities?.[0] ?? null;
  const file = city ? CITY_FILE[city] : undefined;
  if (!city || !file) return null;
  const data = load(file);
  if (!data) return null;

  /* 학생 쪽 분야. **어디서 왔는지를 함께 든다**: 회사마다 `무엇과
     이어지는가` 를 영역 이름으로 적기 위해서다 */
  const strongVia = new Map<string, string[]>();
  const partialVia = new Map<string, string[]>();
  /** 영역이 아닌 이름(산업·직무). 비전세미콘 칸에서 영역과 섞지 않는다 */
  const pathVia = new Map<string, string[]>();
  const add = (m: Map<string, string[]>, k: string, v: string) => {
    const l = m.get(k) ?? []; if (!l.includes(v)) l.push(v); m.set(k, l);
  };
  for (const d of x.domains) {
    const ts = themesOf(d.name);
    if (STRONG.includes(d.zone)) ts.forEach((t) => add(strongVia, t, d.name));
    else if (PARTIAL.includes(d.zone) || d.confirmed > 0) ts.forEach((t) => add(partialVia, t, d.name));
  }
  /* 산업 이름과 학과 이름은 확인된 영역에서 이어진 것이라 `이어서 볼 곳`
     쪽에만 보탠다. 영역 하나 없이 산업 이름만으로 `잘 맞는 곳` 을 세우지 않는다 */
  for (const n of [...x.linked, ...x.labels]) themesOf(n).forEach((t) => add(partialVia, t, n));
  for (const n of x.linked) themesOf(n).forEach((t) => add(pathVia, t, n));
  const domainNames = new Set(x.domains.map((d) => d.name));

  const line = (o: Org, via: Map<string, string[]>, ts: string[]): SejongOrgLine => ({
    name: o.name.replace(/\s+/g, " ").trim(), listed: o.listed ?? null,
    sector: o.sector.replace(/^그 외 (기타 )?/, "").replace(/^기타 /, ""),
    product: (o.product ?? "").trim(),
    themes: ts, via: [...new Set(ts.flatMap((t) => via.get(t) ?? []))].slice(0, 3),
  });
  const order = (a: SejongOrgLine, b: SejongOrgLine) =>
    Number(!!b.listed) - Number(!!a.listed) || b.themes.length - a.themes.length
    || bare(a.name).localeCompare(bare(b.name), "ko");

  const strong: SejongOrgLine[] = [];
  const next: SejongOrgLine[] = [];
  let focus: SejongView["focus"] = null;
  for (const o of data.orgs) {
    const own = themesOf(`${o.sector} ${o.product ?? ""}`);
    const s = own.filter((t) => strongVia.has(t));
    const p = own.filter((t) => !strongVia.has(t) && partialVia.has(t));
    if (bare(o.name).includes("비전세미콘")) {
      const linked = [...new Set(own.flatMap((t) => strongVia.get(t) ?? []))];
      const open = [...new Set(own.flatMap((t) => partialVia.get(t) ?? []))]
        .filter((n) => !linked.includes(n) && domainNames.has(n));
      const paths = [...new Set(own.flatMap((t) => pathVia.get(t) ?? []))];
      focus = { org: line(o, new Map([...partialVia, ...strongVia]), own), linked, open, paths };
      continue;
    }
    if (s.length) strong.push(line(o, strongVia, s));
    else if (p.length) next.push(line(o, partialVia, p));
  }
  /* 분야 하나에 묶는다: 회사마다 같은 까닭을 되풀이하면 기계가 찍은 표로
     읽힌다. 회사는 겹친 분야 가운데 확인한 영역이 가장 많은 쪽에 선다 */
  const group = (lines: SejongOrgLine[], via: Map<string, string[]>, maxG: number, per: number) => {
    const by = new Map<string, SejongOrgLine[]>();
    for (const l of lines) {
      const t = [...l.themes].sort((a, b) => (via.get(b)?.length ?? 0) - (via.get(a)?.length ?? 0))[0];
      const g = by.get(t) ?? []; g.push(l); by.set(t, g);
    }
    return [...by.entries()]
      /* 분야 차례는 THEMES 차례다(반도체가 앞). 회사 수로 세우면 회사가 많은
         분야가 늘 앞에 서고, 그 수는 명단의 크기이지 이 결과가 아니다 */
      .sort((a, b) => THEMES.findIndex((t) => t.key === a[0]) - THEMES.findIndex((t) => t.key === b[0]))
      .slice(0, maxG)
      .map(([theme, orgs]) => {
        orgs.sort(order);
        return { theme, via: (via.get(theme) ?? []).slice(0, 3), orgs: orgs.slice(0, per), more: Math.max(0, orgs.length - per) };
      });
  };
  const strongG = group(strong, strongVia, 3, 4);
  const nextG = group(next, partialVia, 2, 3);
  const used = new Set([...strongG, ...nextG].map((g) => g.theme));
  if (focus) (focus as NonNullable<SejongView["focus"]>).org.themes.forEach((t) => used.add(t));
  const semiCount = data.orgs.filter((o) => themesOf(`${o.sector} ${o.product ?? ""}`).includes("반도체")).length;
  return {
    city, total: data.orgs.length, builtOn: data.built_on, focus,
    semiCount, semiRelevant: strongVia.has("반도체") || partialVia.has("반도체"),
    strong: strongG, next: nextG,
    strongN: strong.length, nextN: next.length,
    tries: THEMES.filter((t) => used.has(t.key)).slice(0, 3)
      .map((t) => ({ theme: t.key, text: t.try })),
  };
}

/** 법적 범위를 한 줄로. 쪽마다 같은 글이 선다 */
export const SEJONG_LAW =
  "업종과 검사 결과를 나란히 놓은 정보입니다. 채용 여부와 근무 조건은 확인하지 않았고, "
  + "지원은 각 회사의 공식 채용 경로로 본인이 직접 합니다. CareerMatri는 직업소개·알선을 하지 않습니다.";
