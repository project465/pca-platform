/**
 * 지역 장(05)이 읽는 기업 자료.
 *
 * 공시(OpenDART)로 확인한 회사와 중소벤처기업부 벤처기업 확인 명단(공개 자료)만
 * 싣는다. 제3자 기업정보(KODATA)에서 온 사실은 읽지도 싣지도 않는다. 그래서
 * 대전·충청은 `kr-chungcheong-orgs.v2` 를 열지 않고, 같은 회사를 공시로 대어 본
 * `dart-checks` 의 공시 칸만 쓴다.
 *
 * 회사와 내 결과를 잇는 말은 이 전공의 산업팩과 관계표에서 온다. 회사의 업종을
 * 이 전공의 산업 묶음 하나에 대고, 그 산업이 이 전공의 어느 영역을 쓰는지(관계표의
 * `중심` · `있음`)를 학생의 영역 묶음과 나란히 놓는다. 점수를 만들지 않는다.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { IndustryPack, Inputs, RegionKey } from "./types";

export type Fin = { year: string; basis: "연결" | "별도"; sales: number | null; op: number | null; net: number | null };
export type ROrg = {
  name: string;
  /** 어디서 확인한 회사인가 */
  source: "dart" | "venture" | "venture+dart";
  sector: string; product: string;
  listed: string | null;
  adres: string | null; est: string | null; url: string | null;
  fin: Fin | null; staff: number | null; segments: { segment: string; count: number }[];
  report: { name: string; dt: string; url: string } | null;
};
export type Tier = "A" | "B" | "C";
export type FitGroup = {
  pack: IndustryPack; tier: Tier;
  /** 그 산업이 이 전공에서 쓰는 영역(관계표 `중심` 먼저) */
  uses: string[]; core: string[];
  /** 그중 이 결과에서 근거가 선 영역 · 해 본 일이 있는 영역 */
  z1: string[]; z2: string[];
  orgs: ROrg[];
};
export type RegionView = {
  key: RegionKey; label: string; area: string;
  checkedOn: string; sources: string[];
  all: ROrg[];
  listed: ROrg[];
  groups: FitGroup[];
  unmatched: number;
  neighbor: ROrg[];
  publicOrgs: ROrg[];
  big: { name: string; where: string; what: string }[];
  overview: { name: string; report: string; dt: string; url: string; excerpt: string }[];
};

const ROOT = () => process.cwd();
function readJson<T>(rel: string): T | null {
  const f = path.join(ROOT(), rel);
  if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, "utf8")) as T; } catch { return null; }
}

/** 표준산업분류(KSIC 10차) 중분류 이름. 공시의 업종 코드를 사람이 읽는 말로 */
const KSIC: Record<string, string> = {
  "01": "농업", "02": "임업", "03": "어업", "10": "식료품 제조업", "11": "음료 제조업", "13": "섬유제품 제조업",
  "14": "의복 제조업", "15": "가죽·가방·신발 제조업", "16": "목재 및 나무제품 제조업", "17": "펄프·종이 제조업",
  "18": "인쇄 및 기록매체 복제업", "19": "석유정제품 제조업", "20": "화학물질 및 화학제품 제조업",
  "21": "의료용 물질 및 의약품 제조업", "22": "고무 및 플라스틱제품 제조업", "23": "비금속 광물제품 제조업",
  "24": "1차 금속 제조업", "25": "금속가공제품 제조업", "26": "전자부품·컴퓨터·영상·통신장비 제조업",
  "27": "의료·정밀·광학기기 제조업", "28": "전기장비 제조업", "29": "기타 기계 및 장비 제조업",
  "30": "자동차 및 트레일러 제조업", "31": "기타 운송장비 제조업", "32": "가구 제조업", "33": "기타 제품 제조업",
  "35": "전기·가스·증기 공급업", "36": "수도업", "38": "폐기물 처리업", "41": "종합 건설업", "42": "전문직별 공사업",
  "46": "도매업", "47": "소매업", "49": "육상 운송업", "51": "항공 운송업", "52": "창고 및 운송 관련 서비스업",
  "55": "숙박업", "56": "음식점업", "58": "출판업", "59": "영상·오디오 제작업", "60": "방송업", "61": "통신업",
  "62": "컴퓨터 프로그래밍·시스템 통합 및 관리업", "63": "정보서비스업", "64": "금융업", "65": "보험업",
  "66": "금융 서비스 관련업", "68": "부동산업", "70": "연구개발업", "71": "전문 서비스업",
  "72": "건축기술·엔지니어링 서비스업", "73": "기타 전문·과학기술 서비스업", "85": "교육 서비스업",
  "86": "보건업", "87": "사회복지 서비스업", "90": "창작·예술 서비스업", "91": "스포츠·여가 서비스업",
};
const ksic = (code: string | null | undefined) => (code ? KSIC[String(code).slice(0, 2)] ?? "" : "");

/**
 * 분야와 그 분야를 가리키는 낱말. 회사 쪽(업종·주력 품목)과 이 전공의 산업팩
 * (이름·쓰는 말·공고 이름)을 같은 자로 읽는다. Core 이름을 모른다.
 */
const THEMES: { key: string; org: RegExp; pack?: RegExp; try: string }[] = [
  { key: "반도체", org: /반도체|웨이퍼|디스플레이|증착|식각|클린룸/, try: "주력 제품이나 장비가 반도체 공정의 어느 단계에 들어가는지 누리집에서 찾아 한 줄로 적어 보세요" },
  { key: "기계·장비", org: /기계|장비|설비|기구|구동|금형|자동화|로봇|자동차|트레일러|운송장비|조선|플랜트|발사체|항공기|무기|총포|방산|우주/, pack: /기계|(?<!시약·)장비|설비|구동|금형|자동화|로봇|자동차|조선|플랜트|발사체|항공|방산|우주/, try: "주력 장비 하나를 골라 어떤 부품과 구동 방식으로 움직일지 먼저 짐작해 적고, 누리집 자료와 맞춰 보세요" },
  { key: "전기·전자", org: /전기|전자(?!상거래)|회로|전력|제어|센서|계측|통신|무선|임베디드|전지|배터리|충전|태양광|연료전지/, try: "주력 제품의 사양표에서 전압, 전류, 통신 방식 같은 값을 찾아 수업에서 다뤄 본 값 옆에 적어 보세요" },
  { key: "소재·화학", org: /소재|화학|재료|고분자|코팅|필름|합성|도료|접착|세라믹|플라스틱|유리|금속|종이|펄프/, try: "주력 소재가 어느 제품에 들어가는지, 그 소재에서 따지는 물성이 무엇인지 하나만 찾아 적어 보세요" },
  { key: "소프트웨어·데이터", org: /소프트웨어|데이터|정보|플랫폼|인공지능|보안|클라우드|프로그램|전산|시스템 통합|(^|[^a-z])ai([^a-z]|$)/i, pack: /소프트웨어|플랫폼|인공지능|클라우드|전산|정보화|정보 ?시스템|개발자|서비스 기획|앱|웹 서비스/, try: "그 회사 서비스를 직접 써 본 뒤, 고치고 싶은 기능 하나와 그렇게 생각한 근거를 적어 보세요" },
  { key: "의약·바이오", org: /바이오|의약|진단|생명|제약|백신|시약|의료용 물질|건강기능/, pack: /바이오|의약|생명과학|제약|백신|시약|건강기능|체외진단|진단 ?키트/, try: "주력 제품 하나의 허가 기준이나 품질 기준을 찾아, 실험이나 실습에서 지켜 본 기준 옆에 적어 보세요" },
  { key: "식품", org: /식품|식료품|음료|제과|빵|육가공|급식|조리|발효|농산물/, try: "주력 제품 하나의 원료와 표시 사항을 찾아, 실습에서 다뤄 본 공정 옆에 적어 보세요" },
  { key: "화장품·뷰티", org: /화장품|미용|뷰티|네일|헤어|피부/, try: "주력 제품 하나를 골라 성분 표시와 누구를 위한 제품인지 찾아 정리해 보세요" },
  { key: "패션·섬유", org: /의류|의복|섬유|봉제|패션|직물|원단/, try: "주력 상품 하나가 어떤 소재로 어떻게 만들어지는지 찾아 한 줄로 적어 보세요" },
  { key: "의료기기", org: /의료(용)? ?기기|의료·정밀|광학기기|정밀기기/, try: "주력 기기 하나가 무엇을 재는지, 병원이나 현장에서 누가 쓰는지 찾아 적어 보세요" },
  { key: "콘텐츠·디자인", org: /광고|디자인|콘텐츠|영상(?!·(통신|음향))|출판|미디어|방송|공연|게임|웹툰|인쇄/, try: "최근 작업물 하나를 골라 누구를 위해 만들었는지, 내가 맡는다면 무엇을 바꿀지 적어 보세요" },
  { key: "건설·환경", org: /건설|토목|건축|환경|시설|지반|측량|조경|상하수|폐기물|수자원|수도|철도/, pack: /건설|토목|건축|지반|측량|조경|상하수|폐기물|수자원|시공|철도|도시계획|환경공학|환경 ?플랜트/, try: "최근 맡은 공사나 사업 하나를 찾아 지반, 환경, 안전 가운데 어떤 조건이 판단을 갈랐을지 짐작해 적어 보세요" },
  { key: "에너지", org: /에너지|전력|발전|연료전지|태양광|원자력|가스/, try: "주력 설비나 사업 하나가 어떤 에너지를 다루는지, 거기에 걸린 안전 기준이 무엇인지 찾아 적어 보세요" },
  { key: "농업·조경", org: /농업|원예|종묘|화훼|조경|산림|임업|스마트팜|종자/, try: "주력 품목 하나의 재배 조건과 관리 조건을 찾아, 실습에서 다뤄 본 조건 옆에 적어 보세요" },
  { key: "금융", org: /금융|보험|은행|캐피탈|지주회사|투자|증권/, pack: /금융|은행|캐피탈|증권|자산운용|보험사|손해보험|생명보험|결제/, try: "사업보고서에서 사업부문과 돈이 들어오는 구조를 찾아 한 장으로 정리해 보세요" },
  { key: "유통·서비스", org: /도매|소매|유통|숙박|음식점|관광|여행|운송|물류|호텔|항공 운송|창고/, try: "그 회사가 고객에게 내놓는 서비스 하나를 골라, 고객이 처음부터 끝까지 거치는 순서를 한 장에 그려 보세요" },
  { key: "교육", org: /교육|학원|에듀|교재/, pack: /학원|에듀|교재|교육청|유아교육|보육|평생교육|교육 ?서비스|기업교육|HRD|사교육|교육사업|교육기관/, try: "그 기관이 운영하는 프로그램 하나를 골라 누구를 대상으로 무엇을 하려는지 정리해 보세요" },
  { key: "보건·복지", org: /병원|의원|보건|요양|간호|재활|복지|돌봄/, try: "그 기관이 맡는 서비스 하나를 골라 누가 어떤 절차로 이용하는지 정리해 보세요" },
  { key: "공공", org: /공사$|공단|공공|행정|조폐|철도공사|수자원공사/, try: "공공기관 경영정보 공개시스템(ALIO)에서 그 기관의 주요 사업과 조직도를 찾아 한 장으로 정리해 보세요" },
  { key: "스포츠·여가", org: /스포츠|체육|피트니스|골프|레저|여가/, try: "그 회사의 서비스 하나를 골라 누가 어떻게 이용하는지 정리해 보세요" },
  { key: "제조·일반기업", org: /제조업|제조/, pack: /기업간 거래|일반기업/, try: "주력 제품 하나를 골라 원료가 들어와 납품되기까지의 흐름을 한 줄로 그려 보세요" },
];
const themesOrg = (s: string) => THEMES.filter((t) => t.org.test(s)).map((t) => t.key);
/**
 * 산업 묶음이 어느 업종과 이어지는지. 이름이나 공고 직무명에 걸리면 바로 잇고, 용어 목록에서는
 * 두 번 넘게 걸려야 잇는다. 간호의 '환경'이나 정신건강의 '프로그램' 한 낱말로 건설사와
 * 소프트웨어 회사가 그 산업에 붙던 것을 막는다.
 */
export function packThemes(p: IndustryPack): string[] {
  const vocab = (p.vocabulary ?? []).join(" ");
  return THEMES.filter((t) => {
    const re = t.pack ?? t.org;
    if (re.test(packHead(p))) return true;
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    return (vocab.match(g) ?? []).length >= 2;
  }).map((t) => t.key);
}
const packHead = (p: IndustryPack) => [p.name_ko, ...(p.job_aliases ?? [])].join(" ");
/** 이름이나 공고 직무명에 걸린 업종. 용어에서만 걸린 업종보다 앞선다 */
export function packHeadThemes(p: IndustryPack): string[] {
  return THEMES.filter((t) => (t.pack ?? t.org).test(packHead(p))).map((t) => t.key);
}
/** 묶음 이름에서 가점을 줄 낱말. 여러 업종에 다 쓰이는 낱말은 뺀다(`장비` 하나로 고압 설비 회사가 통신 장비에 붙었다) */
const GENERIC = /^(장비|전문|발주|개발|서비스|정보|관리|운영|일반|기업|산업|공공|시설)$/;
export const tryOf = (key: string) => THEMES.find((t) => t.key === key)?.try ?? "";

/** 전공마다 받을 업종 · 품목 낱말. 없는 전공은 거르지 않는다 */
const SECTOR_MUST: Record<string, RegExp> = {
  CS_CORE_V1: /소프트웨어|정보|데이터|프로그램|컴퓨터|통신|플랫폼|게임|인터넷|인공지능|AI|앱|애플리케이션|어플리케이션|솔루션|디지털|전자상거래|금융업|보안|클라우드|IT|웹|모바일/i,
  EE_CORE_V1: /전기|전자|반도체|통신|장비|기계|계측|측정|제어|전력|에너지|로봇|자동차|디스플레이|광학|의료용 기기|정밀|배터리|전지|조명|소프트웨어|센서|회로/,
};

const SECTOR_NOISE = /전자부품, ?컴퓨터, ?영상, ?음향 및 통신장비 제조업/g;

/** 묶음 이름의 낱말이 회사 이름에 다른 꼴로 적히는 경우(로봇 → 로보틱스) */
const ALIAS: Record<string, string[]> = { 로봇: ["로보"] };

/** 묶음의 회사들이 가장 많이 함께 가진 업종. 해 볼 것 한 줄을 그 업종에 맞춘다 */
export function groupTheme(pack: IndustryPack, orgs: { sector: string; product: string; name: string }[]): string {
  const all = packThemes(pack);
  const head = packHeadThemes(pack);
  const pt = head.length ? head : all;
  const n = new Map<string, number>();
  for (const o of orgs) for (const t of themesOrg(`${o.sector} ${o.product} ${o.name}`)) if (pt.includes(t)) n.set(t, (n.get(t) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? pt[0] ?? "제조·일반기업";
}

type DartRaw = {
  corp_name?: string; name?: string; corp_cls?: string; stock_code?: string | null; adres?: string; induty_code?: string;
  est_dt?: string; hm_url?: string;
  financials?: { year?: string | number; consolidated?: Record<string, number | null> | null; separate?: Record<string, number | null> | null } | null;
  staff?: { total?: number; by_segment?: { segment: string; count: number }[] } | null;
  annual_reports?: { report: string; rcept_dt: string; url: string }[];
};
function finOf(f: DartRaw["financials"]): Fin | null {
  if (!f) return null;
  const c = f.consolidated?.["매출액"] != null ? f.consolidated : null;
  const s = f.separate?.["매출액"] != null ? f.separate : null;
  const v = c ?? s;
  if (!v) return null;
  return { year: String(f.year ?? ""), basis: c ? "연결" : "별도", sales: v["매출액"] ?? null, op: v["영업이익"] ?? null, net: v["당기순이익"] ?? null };
}
const CLS: Record<string, string> = { Y: "유가증권", K: "코스닥", N: "코넥스", 코스닥: "코스닥", 유가증권시장: "유가증권" };
const bare = (n: string) => n.replace(/주식회사|\(주\)|㈜|\s/g, "");
const tidyName = (n: string) => n.replace(/\s+/g, " ").trim();
function staffOf(s: DartRaw["staff"]): number | null {
  if (!s) return null;
  if (typeof s.total === "number") return s.total;
  const segs = s.by_segment ?? [];
  return segs.length ? segs.reduce((a, b) => a + b.count, 0) : null;
}
function fromDart(d: DartRaw, extra: Partial<ROrg> = {}): ROrg {
  const rep = d.annual_reports?.[0];
  return {
    name: tidyName(d.corp_name ?? d.name ?? ""), source: "dart",
    sector: ksic(d.induty_code), product: "", listed: d.corp_cls ? CLS[d.corp_cls] ?? null : null,
    adres: (d.adres ?? "").replace(/\s+/g, " ").replace(/\s-$/, "").trim() || null,
    est: d.est_dt ? d.est_dt.slice(0, 4) : null, url: d.hm_url ?? null,
    fin: finOf(d.financials), staff: staffOf(d.staff), segments: d.staff?.by_segment ?? [],
    report: rep ? { name: rep.report, dt: rep.rcept_dt, url: rep.url } : null,
    ...extra,
  };
}

type Directory = {
  built_on: string; sources: Record<string, string>;
  orgs: { name: string; source: string; sector: string; product?: string; listed?: string; stock_code?: string; adres?: string; induty_code?: string }[];
};
type DartFile = { checked_on: string; listed_checked?: number; orgs: DartRaw[] };
type Checks = { checked_on: string; orgs: { id: string; name: string; compare?: { hq_region?: string }; dart?: DartRaw | null; financials?: DartRaw["financials"]; staff?: DartRaw["staff"]; annual_reports?: DartRaw["annual_reports"] }[] };
type Overview = { checked_on: string; orgs: { id: string; name: string; report: string; rcept_dt: string; url: string; excerpt: string }[] };

const PROFILE: Record<RegionKey, { label: string; area: string; addr: RegExp; listed?: string; directory?: string; big?: string; checks: boolean; overview: boolean }> = {
  sejong: { label: "세종", area: "세종·충청", addr: /세종/, listed: "data/region/dart-sejong.v1.json", directory: "sites/pca-platform/content/sejong-orgs.v1.json", checks: true, overview: true },
  jeonbuk: { label: "전북", area: "전주·익산·전북", addr: /전북|전라북도/, listed: "data/region/dart-jeonbuk.v1.json", directory: "data/region/jeonbuk-orgs.v1.json", big: "data/region/jeonbuk-big.v1.json", checks: false, overview: false },
  chungcheong: { label: "대전·충청", area: "대전·세종·충청", addr: /대전|세종|충청/, checks: true, overview: true },
};

const ZONE_A = new Set(["Z1_EVIDENCE_ESTABLISHED"]);
const ZONE_B = new Set(["Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST"]);

export function regionView(x: Inputs, name: (td: string) => string): RegionView | null {
  if (!x.region) return null;
  const P = PROFILE[x.region];
  const sources: string[] = [];
  let checkedOn = "";
  const all: ROrg[] = [];
  const listedFile = P.listed ? readJson<DartFile>(P.listed) : null;
  const dir = P.directory ? readJson<Directory>(P.directory) : null;
  const checks = P.checks ? readJson<Checks>("data/region/dart-checks.v1.json") : null;

  if (dir) {
    const byStock = new Map((listedFile?.orgs ?? []).map((o) => [o.stock_code ?? "", o]));
    const byName = new Map((listedFile?.orgs ?? []).map((o) => [bare(o.corp_name ?? ""), o]));
    for (const o of dir.orgs) {
      const d = (o.stock_code && byStock.get(o.stock_code)) || byName.get(bare(o.name));
      const src = o.source === "venture+dart" ? "venture+dart" : o.source === "dart" ? "dart" : "venture";
      const base: ROrg = d ? fromDart(d) : {
        name: tidyName(o.name), source: "venture", sector: "", product: "", listed: null, adres: o.adres ?? null,
        est: null, url: null, fin: null, staff: null, segments: [], report: null,
      };
      all.push({ ...base, name: tidyName(o.name), source: src, sector: o.sector || base.sector, product: (o.product ?? "").replace(/[\s　]+/g, " ").trim(), listed: o.listed ?? base.listed });
    }
    sources.push(...Object.values(dir.sources));
    checkedOn = dir.built_on;
  } else if (listedFile) {
    for (const d of listedFile.orgs) all.push(fromDart(d));
  }
  if (listedFile) {
    for (const d of listedFile.orgs) if (!all.some((o) => bare(o.name) === bare(d.corp_name ?? ""))) all.push(fromDart(d));
    checkedOn = checkedOn || listedFile.checked_on;
    sources.push(`OpenDART 기업개황 · 사업보고서 주요 계정 · 직원 현황 (상장사 ${listedFile.listed_checked ?? ""}곳 가운데 본점이 ${P.label}인 회사, 확인일 ${listedFile.checked_on})`);
  }

  /* 공시로 대어 본 회사: 본점이 같은 시도로 확인되고 주소가 이 지역인 것만 */
  const checked: ROrg[] = (checks?.orgs ?? [])
    .filter((o) => !!o.dart && o.compare?.hq_region === "SAME" && /대전|세종|충청/.test(o.dart.adres ?? ""))
    .map((o) => fromDart({ ...(o.dart as DartRaw), financials: o.financials, staff: o.staff, annual_reports: o.annual_reports }));
  if (x.region === "chungcheong") {
    for (const o of checked) all.push(o);
    if (checks) { checkedOn = checks.checked_on; sources.push(`OpenDART 기업개황 · 사업보고서 주요 계정 · 직원 현황 (확인일 ${checks.checked_on})`); }
  }
  const neighbor = x.region === "sejong" ? checked.filter((o) => o.fin && /대전|충청/.test(o.adres ?? "")) : [];
  if (neighbor.length && checks) sources.push(`OpenDART 사업보고서 주요 계정 (대전·충청 상장사, 확인일 ${checks.checked_on})`);

  const bigRaw = P.big ? readJson<{ checked_on: string; orgs: { name: string; where: string; what: string; check: string }[] }>(P.big) : null;
  /* 공시 기업개황으로 본점을 확인한 줄만 싣는다. 보도·투자유치 자료로만 확인한 사업장은 뺀다 */
  const big = (bigRaw?.orgs ?? []).filter((o) => /^공시 기업개황 본점/.test(o.check)).map(({ name, where, what }) => ({ name, where, what: what.replace(/\s*\([^)]*(순위|1위|매출)[^)]*\)/g, "") }));

  const ov = P.overview ? readJson<Overview>("data/region/dart-overview.v1.json") : null;
  const ovNames = new Set([...all, ...neighbor].map((o) => bare(o.name)));
  const overview = (ov?.orgs ?? []).filter((o) => ovNames.has(bare(o.name))).map((o) => ({ name: o.name, report: o.report, dt: o.rcept_dt, url: o.url, excerpt: o.excerpt }));

  const publicOrgs = all.filter((o) => /공사|공단/.test(o.name) && !o.listed);
  const listed = all.filter((o) => o.listed && o.fin);

  /* 회사 → 이 전공의 산업 묶음 하나 */
  const packTh = x.inds.map((p) => ({ p, th: packThemes(p), head: packHeadThemes(p), tokens: p.name_ko.split(/[·\s/]+/).filter((k) => k.length >= 2 && !GENERIC.test(k)) }));
  const themeUse = new Map<string, number>();
  for (const { th } of packTh) for (const t of th) themeUse.set(t, (themeUse.get(t) ?? 0) + 1);
  const zoneOf = new Map(x.m.domains.map((d) => [d.code, d.zone]));
  const confirmedOf = new Map(x.m.domains.map((d) => [d.code, d.confirmed.length]));
  const byPack = new Map<string, ROrg[]>();
  let unmatched = 0;
  /* 공기업은 따로 표를 세운다. 다만 이 전공에 공기업·발주청을 다루는 묶음이 있으면(경영 · 행정 ·
     토목) 그 묶음으로도 받는다. 그 학생에게 이 지역 공기업은 남의 전공 회사가 아니다 */
  const PUBLIC_PACK = /공기업|공기관|공공기관|발주청/;
  /* **전공 밖 업종은 받지 않는다.** 묶음 낱말이 겹친다는 것만으로 받으면 컴퓨터 책의 ‘자동차·모빌리티 소프트웨어’ 에
     연료전지 · 소재 회사가, 전기전자 책의 ‘자동차 전장’ 에 화학 회사가 들어갔다. 업종이나 주력 품목에 그 전공의
     일이 적혀 있는 회사만 받는다. 경영처럼 어느 업종에서나 일하는 전공은 거르지 않는다 */
  const must = SECTOR_MUST[x.coreCode];
  for (const o of all) {
    /* 표준산업분류의 ‘전자부품, 컴퓨터, 영상, 음향 및 통신장비 제조업’ 은 낱말에 컴퓨터와 통신이 들어 있어
       부품 · 소재 회사가 컴퓨터 책에 들어왔다. 그 업종명은 지우고 주력 품목과 나머지 업종으로만 본다 */
    if (must && !must.test(`${o.sector} ${o.product}`.replace(SECTOR_NOISE, " "))) { unmatched++; continue; }
    const pub = publicOrgs.includes(o);
    if (pub && !packTh.some((t) => PUBLIC_PACK.test(packHead(t.p)))) continue;
    const text = `${o.sector} ${o.product} ${o.name}`;
    const th = themesOrg(text);
    let best: { code: string; n: number } | null = null;
    const flat = text.replace(/\s/g, "");
    for (const { p, th: pt, head, tokens } of packTh) {
      /* 공기업은 공기업·발주청을 다루는 묶음으로만 받는다. `공공` 한 낱말로 수도 공사가 학교 묶음에 들던 것을 막는다 */
      if (pub && !PUBLIC_PACK.test(packHead(p))) continue;
      /* 여러 묶음이 함께 가진 업종은 가볍게, 묶음 이름의 낱말이 업종에 그대로 있으면 무겁게 센다.
         **이름에 걸린 업종이 있는 묶음은 그 업종으로만 받는다**: 시설원예 묶음이 용어의 `센서`
         두 번으로 전자부품 회사를 받으면 그 학생에게 전압·전류를 읽어 보라는 할 일이 나간다 */
      const shared = th.filter((t) => pt.includes(t));
      if (!shared.length) continue;
      if (head.length && !shared.some((t) => head.includes(t))) continue;
      const n = shared.reduce((a, t) => a + 1 / (themeUse.get(t) ?? 1), 0) + (tokens.some((k) => flat.includes(k) || (ALIAS[k] ?? []).some((v) => flat.includes(v))) ? 2 : 0);
      if (!best || n > best.n) best = { code: p.code, n };
    }
    if (!best) { unmatched++; continue; }
    const g = byPack.get(best.code) ?? []; g.push(o); byPack.set(best.code, g);
  }
  const groups: FitGroup[] = [];
  for (const p of x.inds) {
    const orgs = byPack.get(p.code);
    if (!orgs?.length) continue;
    const rows = x.rel.td_industry.filter((r) => r.industry === p.code && r.strength !== "드묾");
    const core = rows.filter((r) => r.strength === "중심").map((r) => r.td);
    const uses = [...core, ...rows.filter((r) => r.strength === "있음").map((r) => r.td)];
    const z1 = uses.filter((t) => ZONE_A.has(zoneOf.get(t) ?? ""));
    const z2 = uses.filter((t) => ZONE_B.has(zoneOf.get(t) ?? "") || (!ZONE_A.has(zoneOf.get(t) ?? "") && (confirmedOf.get(t) ?? 0) > 0));
    const tier: Tier = z1.length ? "A" : z2.length ? "B" : "C";
    orgs.sort((a, b) => Number(!!b.listed) - Number(!!a.listed) || bare(a.name).localeCompare(bare(b.name), "ko"));
    groups.push({ pack: p, tier, uses: uses.map(name), core: core.map(name), z1: z1.map(name), z2: z2.map(name), orgs });
  }
  groups.sort((a, b) => a.tier.localeCompare(b.tier) || b.orgs.length - a.orgs.length);
  if (!all.length) return null;
  /* 사업의 개요는 이 전공의 묶음에 든 회사부터 싣는다. 생명공학 책 첫 장에 건설사가 오지 않게 */
  const mine = new Set(groups.flatMap((g) => g.orgs.map((o) => bare(o.name))));
  /* **이 전공의 묶음에 든 회사만 싣는다.** 앞으로 세우기만 하면, 묶음에 든 회사가 하나도 없는 책(반도체물리학
     책에 백신 · 건설 회사)에서는 남의 전공 회사의 사업 개요가 그대로 실린다. 하나도 없으면 그 쪽을 세우지 않는다 */
  const overviewMine = overview.filter((o) => mine.has(bare(o.name)));
  return {
    key: x.region, label: P.label, area: P.area, checkedOn, sources: [...new Set(sources)],
    all, listed, groups, unmatched, neighbor, publicOrgs, big, overview: overviewMine,
  };
}

/**
 * 05장 첫 쪽에 한 번만 싣는 범위 안내. 직업 정보일 뿐이라는 것 · 채용 여부를 확인하지
 * 않았다는 것 · 지원은 본인이 직접 한다는 것을 한 문단에 담는다. 쪽마다 붙이지 않는다.
 */
export const REGION_LAW = "이 장은 회사의 업종과 내 검사 결과를 나란히 놓은 직업 정보예요. 회사가 지금 사람을 뽑는지와 근무 조건은 확인하지 않았고, 지원은 각 회사의 공식 채용 경로로 직접 하시면 됩니다. CareerMatri는 직업소개나 알선을 하지 않습니다.";
