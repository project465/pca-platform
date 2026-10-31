import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_DIR } from "@/lib/me-v3/core-registry";
import { catalog, wordsOf, type CatalogDomain } from "./catalog";
import { draftByRulesEn, looksEnglish, readPostingEn } from "./rules-en";

/**
 * MAT이 **AI 없이** 공고와 메모를 읽는 규칙.
 *
 * AI 분석을 켜지 않은 분과, 켜 두었는데 Claude 가 답하지 못한 분이 받는 길이다.
 * 운영에서는 개인정보처리방침을 고친 뒤까지 이 길이 전부다. 그래서 "AI 가 없을
 * 때 대충 돌아가는 길" 로 두지 않는다.
 *
 * **DB 를 읽지 않는다.** 글과 그 Core 의 목록만 받아 값을 돌려준다. 그래야
 * 시험지(`npm run mat:gold`)가 사람 없이 같은 입력에 같은 답을 받는다.
 *
 * **모르면 고르지 않는다.** 공고 한 줄을 어느 영역에도 확신 있게 잇지 못하면
 * `영역 확인 필요` 로 두고, 메모에서 직접 정한 것을 보기에 확신 있게 대지 못하면
 * 그 사람이 쓴 문장을 그대로 돌려주며 골라 달라고 묻는다. 잘못 켜 둔 보기는
 * 비워 둔 칸보다 비싸다: 사람이 그것을 맞는 것으로 읽고 저장한다.
 */

/* ── 전공별 낱말 사전 ─────────────────────────────────────────────── */

/**
 * 도구·기술·방법 이름에서 영역으로 가는 사전(`content/mat-terms.json`).
 *
 * 영역 이름만으로는 `Java` · `CATIA` · `GA4` 가 어느 영역인지 알 수 없다.
 * 공고와 메모에 가장 많이 나오는 것이 이런 이름이라, 이 표가 없으면 가장 중요한
 * 요구 항목부터 빠진다. **영역 코드는 그 Core 의 목록에 있는 것만 남긴다**:
 * 표가 틀린 코드를 들고 있어도 화면에 없는 영역이 서지 않는다.
 */
type Terms = Record<string, Record<string, string[]>>;
let TERMS: Terms | null = null;

function terms(core: string): { code: string; term: string; latin: RegExp | null }[] {
  if (!TERMS) {
    const f = join(process.cwd(), CONTENT_DIR, "mat-terms.json");
    TERMS = existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Terms) : {};
  }
  const codes = new Set(catalog(core).map((d) => d.code));
  const out: { code: string; term: string; latin: RegExp | null }[] = [];
  for (const [code, list] of Object.entries(TERMS[core] ?? {})) {
    if (!codes.has(code)) continue;
    for (const t of list) {
      const term = t.trim();
      if (term.length < 2) continue;
      /* 로마자는 낱말 경계로 잰다. `Go` 가 `Google` 안에서 걸리면 안 된다 */
      const latin = /^[\x20-\x7e]+$/.test(term)
        ? new RegExp(`(^|[^A-Za-z0-9+#])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9+#])`, "i")
        : null;
      out.push({ code, term, latin });
    }
  }
  return out;
}

/**
 * 그 영역들의 사전 이름(세 글자 이상). 공고 줄에 바로 이어진 경험이 없을 때,
 * 경험 기록의 글(제목 · 정한 것 · 남긴 것 · 비교해 확인한 것)에 이 이름이 있으면
 * `가까운 경험` 으로 잇는다(`posting.ts`)
 */
export function domainTerms(core: string, codes: string[]): string[] {
  return [...new Set(terms(core).filter((t) => codes.includes(t.code) && t.term.length >= 3).map((t) => t.term))];
}

/** 사전 표를 새로 읽게 한다(시험에서 표를 바꿔 넣을 때) */
export function resetTerms(): void { TERMS = null; }

/* ── 영역 맞추기 ─────────────────────────────────────────────────── */

/** 영역 이름에서 온 낱말 가운데 너무 흔해 어느 줄에나 걸리는 것 */
const WEAK = new Set(["보고서", "자료", "기록", "결과", "계획", "기준", "검토", "방법",
  "정리", "시험", "설계", "구현", "운영", "개발", "분석", "평가", "목록", "문서", "제안",
  "비교표", "사양", "규정", "절차", "현장", "시스템", "서비스", "프로그램", "데이터",
  "기획", "관리", "환자", "고객", "업무", "지원", "정보", "기술", "공정"]);

export type DomainHit = { code: string; score: number; terms: string[] };
type RawHit = { code: string; terms: Map<string, number> };

/**
 * 한 줄이 어느 영역을 가리키는가. 사전의 이름이 걸리면 3점, 영역 이름·세부
 * 이름에서 온 낱말이 걸리면 1점이다. 흔한 낱말은 세지 않는다.
 */
export function matchDomains(core: string, text: string): DomainHit[] {
  const lower = text.toLowerCase();
  const w = new Set(wordsOf(text));
  const by = new Map<string, RawHit>();
  const add = (code: string, n: number, term: string) => {
    const h = by.get(code) ?? { code, terms: new Map<string, number>() };
    h.terms.set(term, Math.max(n, h.terms.get(term) ?? 0));
    by.set(code, h);
  };
  for (const t of terms(core)) {
    const hit = t.latin ? t.latin.test(text) : lower.includes(t.term.toLowerCase());
    if (hit) add(t.code, 3, t.term);
  }
  for (const d of catalog(core)) {
    for (const x of nameWords(d)) {
      if (w.has(x) || text.includes(x)) add(d.code, 1, x);
    }
  }
  /* 긴 이름이 짧은 이름을 품으면(예: `Spring Boot` 와 `Spring`, `DB 테이블` 과
     `DB`) 짧은 쪽은 세지 않는다. 같은 말을 두 번 세면 그 영역이 부풀어 다른
     영역을 밀어낸다 */
  return [...by.values()]
    .map((h) => {
      const ks = [...h.terms.keys()];
      const keep = ks.filter((a) => !ks.some((b) => b !== a && b.toLowerCase().includes(a.toLowerCase())));
      return { code: h.code, terms: keep, score: keep.reduce((n, k) => n + (h.terms.get(k) ?? 0), 0) };
    })
    .sort((a, b) => b.score - a.score || b.terms.length - a.terms.length);
}

const NAME_WORDS = new Map<string, string[]>();
function nameWords(d: CatalogDomain): string[] {
  const k = `${d.code}|${d.name}`;
  let v = NAME_WORDS.get(k);
  if (!v) {
    v = [...new Set([...wordsOf(d.name), ...wordsOf(d.sub)])]
      .filter((x) => x.length >= 2 && !WEAK.has(x));
    NAME_WORDS.set(k, v);
  }
  return v;
}

/* ── 공고 읽기 ───────────────────────────────────────────────────── */

export type ReadItem = {
  text: string;
  kind: "must" | "nice";
  domain: string | null;
  axis: string | null;
  /** 영역이 없을 때 그 까닭. 학력·연차·면허 같은 조건인가, 이을 영역을 못 찾았는가 */
  reason?: "condition" | "unmatched";
  /**
   * 그 줄에 사전 이름이 함께 걸린 다른 영역(3점 이상). `기계적 특성 평가 및 물성 보증
   * 시험` 은 재료와 시험 둘 다다. 경험을 이을 때 주 영역에 없으면 여기서 찾는다(`posting.ts`)
   */
  alt?: string[];
};
export type ReadOut = { role: string | null; deadline: string | null; requirements: ReadItem[] };

type Section = "none" | "duty" | "req" | "nice" | "skip";

/**
 * 머리말 낱말. **차례가 곧 우선순위다**: `우대사항` 이 `사항` 보다, `필수요건` 이
 * `요건` 보다 먼저 맞아야 한다. 공기업 직무기술서의 `필요지식 · 필요기술` 도
 * 요구 항목이다.
 */
const HEADS: [Section, RegExp][] = [
  ["nice", /^(우대하는\s*분|우대\s*사항|우대\s*자격|우대\s*조건|우대\s*요건|우대\s*역량|우대|가산점|가점\s*사항|이런 분이면 더 좋아요|플러스\s*포인트)$/],
  ["duty", /^(담당\s*업무|주요\s*업무|업무\s*내용|하는\s*일|직무\s*내용|수행\s*업무|업무\s*소개|직무\s*소개|이런 일을 해요|합류하면 하는 일|주요\s*직무|담당\s*직무|직무\s*수행\s*내용)$/],
  ["req", /^(자격\s*조건|필요\s*자격|자격\s*요건|지원\s*자격|응시\s*자격|필수\s*요건|필수\s*사항|필수\s*역량|자격\s*사항|필수|요구\s*사항|이런 분을 찾아요|필요\s*지식|필요\s*기술|필요\s*역량|직무\s*수행\s*태도|지원\s*요건|필수\s*자격|기본\s*자격|공통\s*자격|자격)$/],
  ["skip", /^(근무\s*조건|근무\s*형태|근무\s*지역|근무지|근무\s*시간|근무\s*장소|고용\s*형태|채용\s*형태|급여|연봉|처우|복리\s*후생|복지|혜택|전형\s*절차|채용\s*절차|전형\s*방법|접수\s*방법|지원\s*방법|제출\s*서류|문의|기타|기타\s*사항|회사\s*소개|기업\s*소개|모집\s*부문|모집\s*분야|모집\s*직무|모집\s*인원|채용\s*인원|채용\s*분야|근무\s*예정지|근무\s*부서|근무\s*환경|근무\s*기간|선발\s*방법|인원|지원|접수|접수\s*마감|전형|모집\s*요강|센터\s*소개|함께하면\s*받는\s*것들?|합류\s*여정|채용\s*여정|채용\s*과정|전형\s*과정|일하는\s*방식|근무\s*방식|채용\s*직무|포지션|직무|접수\s*기간|모집\s*기간|지원\s*기간|마감|마감일|유의\s*사항|직무\s*기술서|채용\s*개요|모집\s*요강)$/],
];

/** 그 줄의 머리말이 무엇이고, 머리말 뒤에 붙은 글이 무엇인가 */
function header(line: string): { sec: Section; head: string; rest: string } | null {
  /* 괄호에 싼 꼴: [담당업무] · <지원자격> · 【우대】 · (필수) */
  const br = line.match(/^[[<【(〔]\s*([^\]>】)〕]{1,16}?)\s*[\]>】)〕]\s*[:：]?\s*(.*)$/);
  /* 맨 꼴: `담당업무 :` · `자격요건` · `직무수행태도 : 안전수칙…` */
  const plain = line.match(/^([가-힣][가-힣\s/·]{0,16}?)\s*(?:[:：]\s*(.*)|$)/);
  for (const m of [br, plain]) {
    if (!m) continue;
    const head = m[1].replace(/\s+/g, " ").trim();
    /* `근무 조건 및 복리후생` · `모집분야 및 담당업무` 처럼 둘을 이은 머리말은
       조각마다 본다. 요구 항목 쪽이 하나라도 있으면 그쪽이다 */
    const parts = head.split(/\s*(?:및|·|\/|,|와|과)\s*/).filter(Boolean);
    const secs: { sec: Section; part: string }[] = [];
    for (const part of parts) {
      for (const [sec, re] of HEADS) if (re.test(part)) { secs.push({ sec, part }); break; }
    }
    /* 맞지 않은 조각은 짧은 꼬리(`조건` · `처우` · `혜택`)여야 한다. 긴 조각이
       섞였으면 머리말이 아닌 문장이다 */
    const loose = parts.filter((p) => !secs.some((x) => x.part === p));
    if (!secs.length || loose.some((p) => p.length > 4)) continue;
    const pick = secs.find((x) => x.sec === "duty") ?? secs.find((x) => x.sec === "req")
      ?? secs.find((x) => x.sec === "nice") ?? secs[0];
    return { sec: pick.sec, head: pick.part, rest: (m[2] ?? "").trim() };
  }
  return null;
}

/** 괄호 밖의 쉼표에서만 나눈다 */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if ("([{（".includes(ch)) depth += 1;
    if (")]}）".includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** 글머리 기호와 번호를 걷는다 */
function stripBullet(s: string): string {
  let t = s.trim();
  for (let i = 0; i < 3; i++) {
    const n = t.replace(/^(?:[-–—*•·ㆍ∙◦○●■□◆◇▶▷►▪︎▫︎✓✔※☞→>]|\d{1,2}[.)](?!\d)|\(\d{1,2}\)|[①-⑳]|[가-하][.)]|[a-zA-Z][.)](?=\s))\s*/u, "");
    if (n === t) break;
    t = n.trim();
  }
  return t;
}

/**
 * 학력·전공·면허·자격·어학·병역·나이·거주. 줄에 전공이나 도구 이름이 들어 있어도
 * (`식품공학 관련 전공` · `HACCP 교육 이수자` · `전산회계 1급 보유자`) 조건이다.
 * 경험 기록으로 판단하는 것이 아니고, 그것을 영역에 이으면 `아직 없음` 이 떠서
 * 경험을 쌓으라는 말이 된다.
 */
const EDU_COND = /(제출\s*필수|필수\s*제출|학사|석사|박사|학위|졸업|전공|학력|병역|군필|면허|자격증|자격\s*소지|기사\s*(이상|자격)|토익|TOEIC|토스|OPIc|오픽|JLPT|HSK|어학\s*성적|어학성적|이수자|이수증|\d\s*급\s*(이상|이|또는|보유)|만\s*\d+\s*세|주소가|거주|결격\s*사유|미취업자|재학생|휴학생)/i;
/** 근무 여건. 도구 이름이 걸리면(`CATIA 사용 가능자`) 조건이 아니다 */
const AVAIL_COND = /(가능한\s*(자|분)|가능자|교대\s*근무|교대근무|주말\s*근무|야간\s*근무|출장\s*가능|소지자)/;
const COND = /(학사|석사|박사|학위|졸업|전공자|관련\s*전공|전공\s*무관|전공\s*제한|학력|경력|신입|년\s*이상|개월\s*이상|토익|TOEIC|토스|OPIc|오픽|JLPT|HSK|어학|자격증|면허|병역|군필|결격|국가\s*유공자|장애인|취업\s*지원\s*대상|해외\s*여행|거주자|출퇴근|입사\s*가능|근무\s*가능|연령|나이)/i;
const SOFT = /(책임감|성실|적극|열정|의사소통|커뮤니케이션|소통\s*능력|팀워크|협조|태도|인성|꼼꼼|윤리|준법|안전\s*수칙|글로벌\s*마인드|도전|주도적|자기\s*주도)/;
/** 괄호 하나에 싼 짧은 머리줄. 뒤에 글이 이어지면 머리줄이 아니다 */
const BRACKET_ONLY = /^[[【〔<]\s*[^\]】〕>]{1,16}?\s*[\]】〕>]$/;
const ROLE_HEAD = /^(모집\s*부문|모집\s*분야|모집\s*직무|채용\s*직무|채용\s*분야|포지션|직무)$/;
const NICE_INLINE = /(우대|가산|가점|선호|플러스|있으면\s*좋)/;
const DATE_WORD = /(마감|접수|모집\s*기간|지원\s*기간|기한|까지|~|∼|〜)/;
const ROLLING = /(상시\s*채용|상시\s*모집|수시\s*채용|채용\s*시\s*마감|채용시\s*마감|충원\s*시\s*마감)/;

type DateHit = { iso: string; at: number };

/** 한 줄에서 날짜를 뽑는다. 해가 빠진 날짜는 오늘 기준 앞으로 올 날로 본다 */
export function datesIn(line: string, today: Date): DateHit[] {
  const out: DateHit[] = [];
  const iso = (y: number, m: number, d: number) =>
    (m >= 1 && m <= 12 && d >= 1 && d <= 31)
      ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;
  const full = /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?/g;
  let m: RegExpExecArray | null;
  const taken: [number, number][] = [];
  while ((m = full.exec(line))) {
    const v = iso(+m[1], +m[2], +m[3]);
    if (v) { out.push({ iso: v, at: m.index }); taken.push([m.index, m.index + m[0].length]); }
  }
  const short = /(?<![\d.])(\d{1,2})\s*[./월]\s*(\d{1,2})\s*일?(?!\d|\.\d|\s*[:시]\s*\d)/g;
  while ((m = short.exec(line))) {
    if (taken.some(([a, b]) => m!.index >= a && m!.index < b)) continue;
    let y = today.getUTCFullYear();
    const mo = +m[1], d = +m[2];
    const cand = Date.UTC(y, mo - 1, d);
    if (cand < today.getTime() - 60 * 86400_000) y += 1;
    const v = iso(y, mo, d);
    if (v) out.push({ iso: v, at: m.index });
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * 공고 한 덩이를 요구 항목으로 끊는다.
 *
 * **머리말을 따라 읽는다.** 공고는 대개 `[우대사항]` 아래에 항목을 늘어놓고
 * 줄마다 `우대` 를 다시 적지 않는다. 그래서 줄만 보면 우대가 전부 필수가 된다.
 * 근무조건 · 복리후생 · 전형절차 · 접수방법 아래의 줄은 요구 항목이 아니다.
 *
 * **마감은 기간의 끝 날이다.** `접수기간 11.20 ~ 12.05` 에서 시작일을 마감으로
 * 읽으면 마감 알림이 보름 일찍 간다. `상시채용` · `채용 시 마감` 이면 비운다.
 */
export function readPosting(core: string, raw: string, today = new Date()): ReadOut {
  /* 영어 공고는 영어 규칙이 읽는다(`rules-en.ts`). 한국어 공고는 아래 그대로다 */
  if (looksEnglish(raw)) return readPostingEn(core, raw, today);
  /* 한 줄로 붙여 넣은 공고: 괄호 머리말 앞에서 줄을 바꿔 준다 */
  const text = raw
    .replace(/\r\n?/g, "\n").replace(/ /g, " ")
    .replace(/\s+(?=[[<【〔](?:[^\]>】〕\n]{1,16})[\]>】〕])/g, "\n")
    .replace(/\s+(?=[■◆●▣]\s)/g, "\n")
    /* 한 줄에 `담당업무: … 자격요건: … 우대사항: …` 로 이어 붙인 공고 */
    .replace(/\s+(?=(?:담당\s*업무|주요\s*업무|자격\s*요건|지원\s*자격|우대\s*사항|근무\s*조건|전형\s*절차|접수|복리\s*후생)\s*[:：])/g, "\n");
  const lines = text.split("\n").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);

  let sec: Section = "none";
  let sawHeader = false;
  let role: string | null = null;
  const reqs: ReadItem[] = [];
  const seen = new Set<string>();
  const deadlineHits: DateHit[] = [];
  let rangeEnd: string | null = null;
  let rolling = false;

  const hasHeaders = lines.some((l) => header(stripBullet(l)));

  /* 마감을 말하는 줄인가. 근무기간 · 입사일 · 교육 기간의 날짜는 마감이 아니다 */
  const DUE = /(마감|접수|지원\s*기간|모집\s*기간|원서|서류\s*제출|제출\s*기한|기한|까지)/;
  const NOT_DUE = /(근무|입사|교육|활동|계약|인턴\s*기간|실습\s*기간|발표|면접|합격|입학|수료)/;
  let dueSection = false;

  for (const rawLine of lines) {
    const line0 = stripBullet(rawLine);
    if (!line0) continue;
    /* 해시태그 줄과 `※` 안내는 요구 항목이 아니다. 마감 안내만 챙긴다 */
    /* `※ 지원자격` 처럼 머리말로 쓴 ※ 와 `※ … 소지자 우대` 처럼 요구를 적은 ※ 는 읽는다 */
    const note = /^※/.test(rawLine.trim()) && !header(line0)
      && !/(우대|필수|자격|가능|경험|소지|이수|전공|졸업)/.test(line0);
    if (/^#\S/.test(line0) || note) {
      if (ROLLING.test(line0) || /조기\s*마감/.test(line0)) rolling = true;
      continue;
    }
    const h0 = header(line0);
    /* **괄호에 싼 머리줄은 요구 항목이 아니다**(`[필수 자격]` · `【지원 대상】`). 아는
       머리말이 아니어도 그 줄만으로 끝나면 머리말로 보고, 낱말로 갈래를 짐작한다.
       짐작이 안 서면 지금 갈래를 그대로 둔다 */
    if (!h0 && BRACKET_ONLY.test(line0)) {
      const w = line0;
      sawHeader = true;
      if (/우대|가점|가산/.test(w)) sec = "nice";
      else if (/자격|요건|필수|조건|역량/.test(w)) sec = "req";
      else if (/업무|직무|하는\s*일|담당/.test(w)) sec = "duty";
      else if (/근무|복리|급여|전형|절차|접수|서류|문의|혜택|처우/.test(w)) sec = "skip";
      continue;
    }
    if (h0) dueSection = /(접수|마감|지원\s*방법|지원\s*기간|모집\s*기간)/.test(h0.head);

    /* 날짜가 든 줄은 요구 항목이 아니다. 마감 후보로만 쓴다 */
    if (ROLLING.test(line0)) rolling = true;
    const ds = datesIn(line0, today);
    if (ds.length) {
      const isRange = /[~∼〜]|\s-\s/.test(line0) && ds.length >= 2;
      const due = (DUE.test(line0) || dueSection) && !(NOT_DUE.test(line0) && !/(마감|접수|까지)/.test(line0));
      if (due) deadlineHits.push(isRange ? ds[ds.length - 1] : ds[0]);
      else if (isRange && !NOT_DUE.test(line0)) rangeEnd = ds[ds.length - 1].iso;
      if (due || isRange || DATE_WORD.test(line0) || !COND.test(line0)) continue;
    }

    const h = h0;
    let line = line0;
    if (h) {
      sawHeader = true;
      sec = h.sec;
      /* `모집부문 : 마케팅 신입` 은 하는 일의 이름이다. 그 아래에 머리말 없이
         늘어놓은 줄은 그 일의 업무로 읽는다(근무조건이 아니다) */
      if (ROLE_HEAD.test(h.head)) {
        if (h.rest && !role) role = h.rest.slice(0, 60);
        sec = "duty";
        continue;
      }
      if (!h.rest || sec === "skip") continue;
      /* 머리말 뒤에 여럿을 쉼표로 이어 적은 꼴(`자격요건: 학사 이상, 엑셀 활용 가능자`)은
         한 항목씩 나눈다. 괄호 안의 쉼표(`엑셀(VLOOKUP, 피벗)`)에서는 끊지 않는다 */
      const parts = splitTop(h.rest);
      if (parts.length > 1 && parts.every((x) => x.length >= 4)) {
        lines.splice(lines.indexOf(rawLine) + 1, 0, ...parts.slice(1));
        line = stripBullet(parts[0]);
      } else line = stripBullet(h.rest);
    } else if (!sawHeader && hasHeaders) {
      /* 첫 머리말 앞: 제목과 회사 소개다. 제목에서 하는 일 이름만 챙긴다 */
      if (!role && /(채용|모집|공고)/.test(line0) && line0.length <= 60) {
        role = line0.replace(/^[[(][^\])]*[\])]\s*/, "").replace(/\s*(채용|모집|공고).*$/, "").trim() || null;
      }
      continue;
    }
    if (sec === "skip") continue;
    /* `[품질관리] 원·부자재 입고 검사` 의 앞 꼬리표는 머리말이 아닌 갈래 이름이다 */
    line = line.replace(/^[[【〔(]\s*[^\]】〕)]{1,10}\s*[\]】〕)]\s*(?=\S)/, "");
    if (line.length < 4 || line.length > 200) continue;
    /* 요구 항목은 열다섯 줄까지다. 그 뒤로는 마감 날짜를 찾으러 끝까지 읽기만 한다 */
    if (reqs.length >= 15) continue;
    /* 제목 줄(`OO 신입 상시채용`)은 머리말이 없어도 걸러 낸다 */
    if (/(채용|모집)\s*(공고)?$/.test(line) && line.length <= 50) continue;

    const key = line.slice(0, 40);
    if (seen.has(key)) continue;

    const hits = matchDomains(core, line);
    const best = hits[0] ?? null;
    const strong = best && best.score >= 3;
    /* 근무 여건(`3교대 근무가 가능한 자`)은 조건이다. 도구를 쓸 수 있느냐를 묻는 줄
       (`CATIA 또는 NX 사용 가능자`)만 영역으로 읽는다 */
    const toolAsk = /(사용|활용|다룰|다루|운용|작성)/.test(line) || (best?.terms.some((t) => /^[\x20-\x7e]+$/.test(t)) ?? false);
    const isCond = EDU_COND.test(line) || (AVAIL_COND.test(line) && !toolAsk) || (COND.test(line) && !strong);
    const isSoft = SOFT.test(line) && !strong;
    /* 머리말이 없는 공고는 영역이 걸린 줄과 조건 줄만 챙긴다. 그 밖의 줄은
       회사 소개나 안내일 가능성이 더 크다 */
    if (sec === "none" && !best && !isCond) continue;
    seen.add(key);

    /* `(건강운동관리사 우대)` 처럼 괄호 안의 우대는 그 줄 전체를 우대로 만들지 않는다 */
    const kind: "must" | "nice" = sec === "nice"
      || NICE_INLINE.test(line.replace(/\([^)]*\)/g, ""))
      || /\(\s*(해당자\s*)?(우대|가점|가산점)(함|합니다)?\s*\)/.test(line) ? "nice" : "must";
    let domain: string | null = null;
    let reason: ReadItem["reason"];
    if (isCond || isSoft) reason = "condition";
    /* 영역 이름에서 온 낱말 하나(1점)로는 잇지 않는다. `환자` · `채널` 같은 낱말은
       어느 줄에나 있다. 사전의 이름 하나나 이름 낱말 둘은 있어야 한다 */
    else if (best && best.score >= 2) domain = best.code;
    else reason = "unmatched";
    const alt = domain ? hits.filter((h) => h.code !== domain && h.score >= 3).map((h) => h.code).slice(0, 2) : [];
    reqs.push({
      text: line.length > 120 ? `${line.slice(0, 118)}…` : line,
      kind, domain, axis: null, ...(reason ? { reason } : {}), ...(alt.length ? { alt } : {}),
    });
  }

  let deadline: string | null = null;
  if (deadlineHits.length) deadline = deadlineHits.map((d) => d.iso).sort().at(-1) ?? null;
  else if (rangeEnd) deadline = rangeEnd;
  if (rolling && !deadlineHits.length) deadline = null;

  return { role, deadline, requirements: reqs };
}

/* ── 메모 초안 ───────────────────────────────────────────────────── */

export type RuleDraft = {
  kind: string | null;
  title: string;
  td: string[];
  problems: string[];
  decisions: string[];
  artifacts: string[];
  verifications: string[];
  ask: string[];
};

/**
 * 직접 정한 것을 말하는 꼬리. `시킨 대로` · `받은 대로` 가 같은 마디에 있으면
 * 정한 것이 아니다.
 */
const DECIDE = /(정했|정함|정하고|정해서|결정|골랐|고름|골라서|선정|선택했|설계했|짰|짜고|맡았|맡아|맡음|잡았|잡음|잡자고|바꿨|바꿈|바꿔서|바꾸니|바꾸고|고쳤|수정했|개선했|도입|제안했|제안함|막았|정의했|세웠|나눴|배치했|배분|조정했|산정|계산해서|계산해 |계산하고|미뤘|미룸|미루고|빼기로|빼고|뺐|기로\s*(함|했|정|결정)|쓰기로|하기로|자고\s*(내가|제가)|우김|우겼|밀어붙|제안해|결국\s*.{0,12}(로|으로)\s*(감|갔|함|했)|골라서|골라\s*씀)/;
/**
 * 남이 정한 것을 따라 한 문장. 이 문장 안의 것은 그 사람이 정한 것도, 그 사람이
 * 남긴 것도 아니다(`선배가 짜준 코드 돌려보는 수준`).
 */
const FOLLOWED = /(시킨\s*대로|시키는\s*대로|받은\s*대로|하라는\s*대로|정해진\s*대로|정해\s*준\s*대로|정해준\s*대로|나온\s*대로|실험서\s*대로|체크리스트\s*대로|따라\s*했|따라함|따라만|따라다니|짜\s*준|짜준|만들어\s*준|해\s*준\s*거|보조만|도와만|돕기만|구경|옆에서\s*보|한\s*건\s*없|한게\s*없|한\s*게\s*없|(주신|준|해준|정해진|시킨|짠|나온|하라는)\s*[가-힣]{0,6}\s*대로)/;
/** 상태를 보고 판단해 알린 것. 간호·현장에서는 이것이 그 사람의 판단이다 */
const ESCALATE = /(서|길래|니까|는데)\s+.{0,20}(보고했|보고함|보고드|알렸|알려드|연락드|호출)/;
const VERIFY = /(비교|견주|검증|확인|피드백|다시\s*계산|재계산|테스트|시험해|측정값|실측|대조|검토\s*받|리뷰)/;

/** 문장으로 끊는다. `ㅋㅋ` · `ㅠ` 같은 맺음도 문장 끝으로 본다 */
function sentences(note: string): string[] {
  /* `38.2` 의 점은 문장 끝이 아니다 */
  return note.split(/[!?\n]+|\.(?!\d)|[ㅋㅎㅠㅜ]{2,}|\s[ㅋㅎㅠㅜ]+(?=\s|$)/).map((s) => s.trim()).filter(Boolean);
}
/** 남이 정한 것을 따라 한 문장을 뺀 메모 */
function ownText(note: string): string {
  return sentences(note).filter((x) => !FOLLOWED.test(x)).join(". ");
}
/** 마디로 끊는다. `~고,` · `~했고` · `~해서` 에서도 끊어 한 마디에 한 동작만 남긴다 */
function clauses(note: string): string[] {
  return note
    .split(/[!?\n]+|\.(?!\d)|[ㅋㅎㅠㅜ]{2,}|\s[ㅋㅎㅠㅜ]+(?=\s|$)|,\s*|(?<=[고며서])\s+(?=[가-힣A-Za-z0-9])/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 4);
}

/** 이 마디가 이 보기를 말하는가. 보기의 내용 낱말이 마디에 몇 개 있는가로 잰다 */
const ALIAS: [RegExp, string][] = [
  [/테이블|스키마|DB|데이터베이스/i, "표"],
  [/인덱스/i, "색인"],
  [/쿼리|SQL/i, "질의"],
  [/API|엔드포인트|endpoint/i, "요청"],
  [/화면|UI|버튼|레이아웃/i, "화면"],
  [/토크|하중/, "부하"],
  [/감속기|기어|모듈/, "감속비"],
  [/축\s*지름|지름|두께/, "단면"],
  [/모터/, "모터"],
  [/설문\s*문항|문항/, "설문"],
  [/타깃|타겟|대상/, "고객"],
  [/예산/, "예산"],
  [/비율|배합|레시피/, "배합"],
  [/보고했|보고함|알렸/, "보고"],
];
const ITEM_STOP = new Set(["정했다", "적었다", "나눠", "나눴다", "어떻게", "어디서", "어느", "무엇을", "이번에",
  "따져", "근거로", "맞춰", "고쳐", "갈랐다", "골라", "정해", "두었다", "세워", "있는", "하는", "것과", "것을"]);

function itemWords(s: string): string[] {
  return wordsOf(s).filter((w) => !ITEM_STOP.has(w) && !/(했다|었다|았다|였다)$/.test(w));
}

function clauseWords(c: string): Set<string> {
  const set = new Set(wordsOf(c));
  for (const [re, w] of ALIAS) if (re.test(c)) set.add(w);
  return set;
}

/** 보기 낱말 가운데 마디에 있는 것의 몫. 낱말 앞 두 글자가 같아도 같은 것으로 본다 */
function overlap(item: string, cw: Set<string>, clause: string): number {
  const iw = itemWords(item);
  if (!iw.length) return 0;
  let n = 0;
  for (const w of iw) {
    if (cw.has(w) || clause.includes(w)) { n += 1; continue; }
    if (w.length >= 3 && [...cw].some((x) => x.length >= 2 && (x.startsWith(w.slice(0, 2)) && w.startsWith(x.slice(0, 2))))) n += 0.5;
  }
  return n / iw.length;
}

/**
 * 메모 첫 문장으로 제목을 짓는다.
 *
 * 마흔 자가 넘으면 첫 마디(`~하고` 앞)까지만 쓴다. 마디가 `~고` 로 끝나면 맺어
 * 준다: 받침 ㅆ 뒤면 `다`(짰고 → 짰다), 아니면 `기`(정리하고 → 정리하기).
 * 그래도 길면 낱말 경계에서 자르고 끝의 조사를 걷는다. 말 중간에서 끊긴 제목은
 * 고쳐야 할 것으로 읽히고, 사람은 대개 고치지 않고 저장한다.
 */
const hasSsBatchim = (ch: number) => ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 === 20;
/**
 * 이어지는 꼬리로 끝난 마디를 맺는다. 맺을 수 없는 꼬리(`~려고` · `~라고`)는
 * 그대로 두고 부르는 쪽이 쓰지 않는다.
 */
function closeTail(t: string): string | null {
  if (/(려고|라고|다고|자고|으러|러)$/.test(t)) return null;
  if (t.endsWith("인데")) return `${t.slice(0, -2)}이다`;
  if (t.endsWith("는데") && hasSsBatchim(t.charCodeAt(t.length - 3))) return `${t.slice(0, -2)}다`;
  if (t.endsWith("고")) {
    const last = t.charCodeAt(t.length - 2);
    if (hasSsBatchim(last)) return `${t.slice(0, -1)}다`;
    if (last >= 0xac00 && last <= 0xd7a3) return `${t.slice(0, -1)}기`;
  }
  return /(는데|면서|며|서|고)$/.test(t) ? null : t;
}
function titleOf(note: string): string {
  const first = (sentences(note)[0] ?? note).split(/,\s*/)[0].trim().replace(/\s+/g, " ");
  let t = first;
  if (t.length > 48) {
    /* 마흔여덟 자가 넘으면 앞 마디(`~고` · `~는데` 앞)를 쓴다. 맺을 수 있을 때만 */
    for (const m of first.matchAll(/(?<=[가-힣](?:고|는데|인데))\s+/g)) {
      const head = first.slice(0, m.index).trim();
      const c = head.length >= 10 && head.length <= 48 ? closeTail(head) : null;
      if (c) { t = c; break; }
    }
  } else {
    t = closeTail(first) ?? first;
  }
  if (t.length > 48) {
    const cut = t.slice(0, 48);
    const sp = cut.lastIndexOf(" ");
    t = (sp >= 16 ? cut.slice(0, sp) : cut).replace(/\s*(을|를|이|가|은|는|의|에|와|과|로|으로|에서|하고)$/, "");
  }
  return t;
}

/**
 * 경험 종류. **차례가 곧 우선순위다**: 더 좁은 말이 먼저 이긴다.
 * `성인간호학 실습` 은 병동에서 환자를 맡았으면 현장실습이고, `실습실에서 술기
 * 연습` 은 수업이다. `텀프로젝트` 는 수업 안이어도 만든 것이 남는 프로젝트다.
 */
function kindOf(note: string): string | null {
  if (/캡스톤|졸업\s*작품|졸업작품|종합\s*설계|졸전|졸업\s*전시/.test(note)) return "capstone";
  if (/인턴|현장\s*실습|현장실습|실습생|교생|교육\s*실습|실습\s*나가|실습\s*나감/.test(note)) return "internship";
  if (/실습/.test(note) && !/실습실/.test(note) && /(환자|병동|프리셉터|병원|보건소|급식소|영양사님|센터|기관|현장)/.test(note)) return "internship";
  if (/연구실|랩실|학부\s*연구|학부연구|연구\s*보조|실험\s*보조|연구생/.test(note)) return "research";
  if (/논문|졸논|학회|투고|포스터\s*발표/.test(note)) return "paper";
  if (/프로젝트|해커톤|공모전|대회|동아리|팀플|단편\s*영화|단편영화|영화\s*촬영|작품\s*제작|전시회?\s*준비|공연\s*준비/.test(note)) return "project";
  if (/과제|레포트|리포트|보고서\s*제출/.test(note)) return "assignment";
  if (/수업|강의|과목|교과|실습실|실습|실험서|실험\s*시간|[가-힣]+(학|론)\s*(실험|시간|수업)|시간에/.test(note)) return "course";
  if (/자격증|수료|이수/.test(note)) return "credential";
  if (/회사|근무|재직|아르바이트|알바/.test(note)) return "work";
  return null;
}

/**
 * 메모를 경험 추가 화면의 보기로 옮긴다.
 *
 * **영역은 둘까지다.** 캡스톤 하나가 화면과 서버와 DB 를 같이 건드리는 일이
 * 흔하다. 둘째는 첫째의 절반 이상 걸릴 때만 붙인다.
 *
 * **직접 정한 것은 확신이 설 때만 켠다.** 메모의 마디가 정한 것을 말하고(`정했다`
 * · `짰다` · `맡았다`), 보기 문장의 낱말이 그 마디에 충분히 있을 때다. 정한 것을
 * 말하는데 맞는 보기를 못 찾으면 그 마디를 그대로 돌려주며 골라 달라고 묻는다.
 * `시킨 대로 측정만 했다` 는 정한 것이 아니다.
 */
export function draftByRules(core: string, note: string, lang?: "ko" | "en"): RuleDraft {
  /* 보기는 **경험 추가 화면의 말**과 같아야 켜진다. 그래서 부르는 쪽이 작업공간
     언어를 알면 그것을 따르고, 모르면(시험) 글을 보고 고른다 */
  if (lang ? lang === "en" : looksEnglish(note)) return draftByRulesEn(core, note);
  const cat = catalog(core);
  const hits = matchDomains(core, note);
  const td: string[] = [];
  if (hits[0]) td.push(hits[0].code);
  if (hits[1] && hits[1].score >= 2 && hits[1].score * 2 >= hits[0].score) td.push(hits[1].code);
  const ds = cat.filter((d) => td.includes(d.code));

  /* 남이 정한 것을 따라 한 문장은 정한 것도 남긴 것도 아니다. 영역과 종류는
     메모 전체로 보고, 판단과 결과물은 그 사람의 문장에서만 찾는다 */
  const own = ownText(note);
  const cls = candidateClauses(own);
  const pickFrom = (pool: string[], want: (c: string) => boolean, min: number, max: number) => {
    const out: { item: string; s: number }[] = [];
    for (const c of cls.filter(want)) {
      const cw = clauseWords(c);
      for (const it of pool) {
        const s = overlap(it, cw, c);
        if (s >= min) out.push({ item: it, s });
      }
    }
    return [...new Map(out.sort((a, b) => b.s - a.s).map((x) => [x.item, x])).values()]
      .slice(0, max).map((x) => x.item);
  };

  const decidedClauses = rankDecided(cls);
  const decisions = pickFrom(ds.flatMap((d) => d.checklist.J3.slice(0, 8)),
    (c) => DECIDE.test(c) && !FOLLOWED.test(c), 0.5, 2);
  const problems = pickFrom(ds.flatMap((d) => d.checklist.J1.slice(0, 6)), () => true, 0.6, 1);
  const verifications = pickFrom(ds.flatMap((d) => d.verify), (c) => VERIFY.test(c), 0.5, 2);

  const artifacts = pickArtifacts(ds.flatMap((d) => d.artifacts), own);
  const mentioned = artifactMentions(own);

  const ask: string[] = [];
  /* 경험 추가 화면은 세 걸음이고 걸음 이름이 전공마다 다르다(`기술 판단` · `직접
     정한 것`). 칸 이름을 박지 않고 어느 걸음인지로 가리킨다 */
  if (!td.length) ask.push("이 경험이 어느 업무 영역의 일이었는지 골라 주세요.");
  if (!decisions.length && decidedClauses.length) {
    /* 따옴표 안의 말은 그 사람이 쓴 그대로다. 우리가 고친 말을 넣지 않고, 길면
       판단이 있는 쪽을 남기고 낱말 경계에서 자른다 */
    const q = quoteOf(decidedClauses[0]);
    ask.push(`메모에 적으신 "${q}" 부분이 직접 정한 것으로 보입니다. 다음 단계에서 맞는 보기를 골라 주세요.`);
  } else if (!decisions.length) {
    ask.push("그 일에서 직접 정한 기준이나 조건이 있었나요? 있었다면 다음 단계에서 골라 주세요.");
  }
  if (!artifacts.length && mentioned.length) {
    const named = mentioned.slice(0, 2).map((x) => `"${x}"`).join(", ");
    ask.push(`메모에 적으신 ${named}에 가장 가까운 것을 마지막 단계에서 골라 주세요.`);
  } else if (!artifacts.length) {
    ask.push("끝나고 손에 남은 결과물(파일·도면·보고서·코드 등)은 무엇인가요?");
  }
  if (!verifications.length && cls.some((c) => VERIFY.test(c))) {
    ask.push("무엇과 견주어 확인하셨는지도 다음 단계에서 골라 주세요.");
  }

  return {
    kind: kindOf(note), title: titleOf(note), td,
    problems, decisions, artifacts, verifications, ask: ask.slice(0, 3),
  };
}

/**
 * 남긴 것을 보기에 댄다.
 *
 * 보기 이름은 짧다(`처리 대장` · `서버 코드` · `조립도`). 낱말을 전부 요구하면
 * `민원 접수 대장` 이 `처리 대장` 에 닿지 않는다. 그래서 **이름의 마지막 낱말**
 * (무엇이 남았는가)이 메모에 있으면 후보로 두고, 다른 낱말까지 맞는 것을 먼저
 * 고른다. 같은 끝 낱말을 가진 보기는 하나만 켠다(`서버 코드` 와 `요청 시험 코드`
 * 를 함께 켜지 않는다). `깃허브에 올렸다` 는 코드가 남았다는 말이다.
 */
const ART_ALIAS: [RegExp, string][] = [
  [/깃허브|깃헙|github|깃랩|gitlab|레포|저장소|리액트|react|스프링|spring|파이썬|python|코드|코딩|구현|앱을? 만들|웹을? 만들/i, "코드"],
  [/발표|PPT|피피티|슬라이드/i, "발표"],
  [/레포트|리포트|보고서/i, "보고서"],
  [/도면|캐드|CAD/i, "도면"],
  [/엑셀|스프레드시트|시트/i, "표"],
  [/영상|편집본|유튜브/i, "편집본"],
  [/시안|피그마|figma/i, "시안"],
  [/리스트|목록/i, "목록"],
];
const AMBIG_HEAD = new Set(["보고", "정리", "결과", "기록", "목록", "계획", "표"]);
function pickArtifacts(pool: string[], note: string): string[] {
  /* 메모의 낱말 그대로만 본다. 판단을 맞출 때 쓰는 바꿔 읽기(`비율` → `배합`)를
     여기 쓰면 `설탕 비율을 정했다` 가 `배합표가 남았다` 가 된다 */
  const nw = new Set(wordsOf(note));
  for (const [re, w] of ART_ALIAS) if (re.test(note)) nw.add(w);
  /* 두 글자 낱말은 낱말째로 같아야 한다. `보고서` 안에 `보고` 가 있다고 `해석 보고` 가
     남은 것이 아니다. 세 글자 이상은 메모 안에 그대로 있으면 된다(`조립도까지`) */
  const has = (w: string) => nw.has(w) || (w.length >= 3 && note.includes(w));
  const scored = pool.map((a) => {
    const aw = itemWords(a);
    const head = aw[aw.length - 1] ?? "";
    if (!head || !has(head)) return null;
    /* 흔한 끝 낱말이거나 동사로 더 자주 쓰이는 낱말(`옆에서 보고`)이면 이름의 다른
       낱말도 메모에 있어야 한다 */
    if ((WEAK.has(head) || AMBIG_HEAD.has(head)) && aw.length > 1 && !aw.slice(0, -1).some(has)) return null;
    return { a, head, s: aw.filter(has).length / aw.length };
  }).filter((x): x is { a: string; head: string; s: number } => Boolean(x))
    .sort((x, y) => y.s - x.s);
  const out: string[] = [];
  const heads = new Set<string>();
  for (const x of scored) {
    if (heads.has(x.head)) continue;
    heads.add(x.head); out.push(x.a);
    if (out.length >= 2) break;
  }
  return out;
}

/** 메모에서 남은 것을 말하는 낱말(`실습 보고서` · `질문 목록`). 보기에 없을 때 되묻는 데 쓴다 */
const ART_WORD = /(보고서|레포트|리포트|도면|조립도|부품도|코드|발표\s*자료|PPT|시안|목록|대장|기록지?|일지|계획서|기획서|기획안|홍보안|제안서|명세서?|README|비교표|결과표|정리표|식단표?|수정본|편집본|영상|포스터|논문|시제품|시작품|프로토타입|웹사이트|대본|콘티|포트폴리오|매뉴얼|지도안|교안|모형|패널|변론서|의견서|서면|체크표|점검표|체크리스트|회로도|설문지|블로그)/i;
function artifactMentions(note: string): string[] {
  const out: string[] = [];
  /* `엑셀로 정리했다` 는 표가 남았다는 말이다. 낱말만 돌려주면 `"엑셀"이 남았다` 가 된다 */
  if (/엑셀|스프레드시트/i.test(note) && /정리|기록|만들|집계/.test(note)) out.push("엑셀로 정리한 자료");
  if (/깃허브|깃헙|github|깃랩|gitlab/i.test(note)) out.push("깃허브에 올린 코드");
  for (const c of clauses(note)) {
    const m = c.match(new RegExp(`(?:[가-힣A-Za-z0-9]+\\s)?[가-힣A-Za-z0-9]*${ART_WORD.source}`, "i"));
    if (m) {
      const t = m[0].replace(/(을|를|이|가|은|는|에|로|으로|도)$/, "").trim();
      if (t && !out.includes(t)) out.push(t);
    }
  }
  return out.slice(0, 3);
}

/**
 * 정한 것을 말하는 마디를 또렷한 차례로 둔다. `정했다 · 골랐다 · 결정했다` 가
 * `설계했다 · 맡았다` 보다 먼저고, `제가 · 내가 · 직접` 이 붙으면 더 먼저다.
 * 되물을 때 가장 또렷한 마디를 돌려줘야 그 사람이 무엇을 고를지 안다.
 */
const DECIDE_STRONG = /(정했|정함|정하고|정해서|결정|골랐|고름|골라서|선정|선택했)/;
function rankDecided(cls: string[]): string[] {
  const score = (c: string) => (DECIDE_STRONG.test(c) ? 2 : 0) + (/(제가|내가|직접|스스로)/.test(c) ? 1 : 0);
  return cls.filter((c) => (DECIDE.test(c) || ESCALATE.test(c)) && !FOLLOWED.test(c))
    .map((c, i) => ({ c, i, s: score(c) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c);
}

/**
 * 되물을 때 돌려줄 그 사람의 말. 마흔 자 안이면 그대로, 길면 판단이 있는 쪽
 * (`~라서 바로 보고드림` 의 까닭부터)을 남기고 앞을 낱말 경계에서 걷는다.
 */
function quoteOf(c: string): string {
  if (c.length <= 40) return c;
  const m = ESCALATE.exec(c) ?? DECIDE.exec(c);
  let from = m ? Math.max(0, m.index - 14) : c.length - 40;
  const sp = c.indexOf(" ", from);
  if (from > 0 && sp > 0 && sp < (m?.index ?? c.length)) from = sp + 1;
  const tail = c.slice(from).trim();
  return tail.length > 44 ? `${tail.slice(0, 42).replace(/\s+\S*$/, "")}…` : tail;
}

/** 시험용: 메모에서 정한 것을 말하는 마디 */
export function decidedClausesOf(note: string): string[] {
  return rankDecided(candidateClauses(ownText(note)));
}

/** 판단을 찾을 마디. `~라서 바로 보고드림` 은 마디로 끊으면 까닭과 보고가 갈려서 문장째로도 본다 */
function candidateClauses(own: string): string[] {
  const cls = clauses(own);
  for (const x of sentences(own)) if (ESCALATE.test(x) && !cls.includes(x)) cls.push(x);
  return cls;
}
