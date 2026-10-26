import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_DIR } from "@/lib/me-v3/core-registry";
import { catalog, type CatalogDomain } from "./catalog";
import type { DomainHit, ReadItem, ReadOut, RuleDraft } from "./rules";

/**
 * MAT 이 **영어** 공고와 메모를 AI 없이 읽는 규칙.
 *
 * 한국어 규칙(`rules.ts`)과 파일을 나눈 까닭: 한국어 쪽은 시험지 세 벌
 * (`npm run mat:gold`)이 글자 단위로 붙들고 있다. 같은 함수 안에 영어 분기를
 * 섞으면 영어를 고친 날 한국어 답이 흔들려도 알아채기 어렵다.
 *
 * 원칙은 같다. **DB 를 읽지 않고**, **모르면 고르지 않는다**: 영역에 확신 있게
 * 잇지 못한 줄은 `unmatched` 로 두고, 메모에서 직접 정한 것을 보기에 대지 못하면
 * 그 사람의 문장을 돌려주며 묻는다.
 */

/** 글이 영어인가. 한글이 글자의 5% 안이고 로마자가 넉넉하면 영어로 읽는다 */
export function looksEnglish(text: string): boolean {
  const ko = (text.match(/[가-힣]/g) ?? []).length;
  const en = (text.match(/[A-Za-z]/g) ?? []).length;
  return en >= 30 && ko <= (ko + en) * 0.05;
}

/* ── 낱말 사전 ─────────────────────────────────────────────────── */

type Terms = Record<string, Record<string, string[]>>;
let EN: Terms | null = null;
let KO: Terms | null = null;
const TERM_CACHE = new Map<string, { code: string; term: string; re: RegExp }[]>();

const readJson = (name: string): Terms => {
  const f = join(process.cwd(), CONTENT_DIR, name);
  if (!existsSync(f)) return {};
  const raw = JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
  delete raw._note;
  return raw as Terms;
};

/**
 * 영어 사전(`mat-terms.en.json`)과 한국어 사전의 **로마자 낱말**(`CATIA` ·
 * `Spring Boot`)을 함께 쓴다. 영역 코드는 그 Core 의 목록에 있는 것만 남긴다.
 */
function terms(core: string): { code: string; term: string; re: RegExp }[] {
  const hit = TERM_CACHE.get(core);
  if (hit) return hit;
  if (!EN) EN = readJson("mat-terms.en.json");
  if (!KO) KO = readJson("mat-terms.json");
  const codes = new Set(catalog(core).map((d) => d.code));
  const out: { code: string; term: string; re: RegExp }[] = [];
  const seen = new Set<string>();
  const add = (code: string, t: string) => {
    const term = t.trim();
    if (term.length < 2 || !codes.has(code) || !/^[\x20-\x7e]+$/.test(term)) return;
    const k = `${code}|${term.toLowerCase()}`;
    if (seen.has(k)) return;
    seen.add(k);
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s-]+");
    out.push({ code, term, re: new RegExp(`(^|[^A-Za-z0-9+#])${esc}(?![A-Za-z0-9+#])`, "i") });
  };
  for (const [code, list] of Object.entries(EN[core] ?? {})) for (const t of list) add(code, t);
  for (const [code, list] of Object.entries(KO[core] ?? {})) for (const t of list) add(code, t);
  TERM_CACHE.set(core, out);
  return out;
}

/** 시험에서 표를 바꿔 넣을 때 */
export function resetTermsEn(): void { EN = null; KO = null; TERM_CACHE.clear(); }

/* ── 낱말 ─────────────────────────────────────────────────────── */

const STOP = new Set(("a an the and or of to in on for with by from at as is are be was were " +
  "this that these those it its your you our we they their will can able using use used " +
  "work working experience strong good knowledge understanding skills skill ability " +
  "including include other related relevant etc plus per into via such least years year " +
  "must have has had nice preferred required requirements across within new based level " +
  "basic minimum within team teams any all both each one two more than well also").split(" "));

/** 영역 이름에서 온 낱말 가운데 어느 줄에나 걸리는 것 */
const WEAK = new Set(("design analysis system systems data report reports test testing process " +
  "development management operation operations engineering engineer software hardware tools " +
  "records record documents document plan planning results quality review support product " +
  "service services project projects selection organizing control").split(" "));

export function wordsEn(s: string): string[] {
  return s.toLowerCase()
    .split(/[^a-z0-9+#.-]+/)
    .map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

/** 낱말 꼬리를 걷은 줄기. `designed` 와 `design`, `analyses` 와 `analysis` 를 같은 것으로 본다 */
const stem = (w: string) => w.replace(/(ings|ing|ed|es|s)$/, "").slice(0, 7);

const NAME_WORDS = new Map<string, string[]>();
function nameWords(d: CatalogDomain): string[] {
  const k = `${d.code}|${d.name}`;
  let v = NAME_WORDS.get(k);
  if (!v) {
    v = [...new Set([...wordsEn(d.name), ...wordsEn(d.sub)])]
      .filter((x) => x.length >= 4 && !WEAK.has(x));
    NAME_WORDS.set(k, v);
  }
  return v;
}

/** 한 줄이 어느 영역을 가리키는가. 사전 낱말 3점, 영역 이름 낱말 1점 */
export function matchDomainsEn(core: string, text: string): DomainHit[] {
  const by = new Map<string, Map<string, number>>();
  const add = (code: string, n: number, term: string) => {
    const m = by.get(code) ?? new Map<string, number>();
    m.set(term, Math.max(n, m.get(term) ?? 0));
    by.set(code, m);
  };
  for (const t of terms(core)) if (t.re.test(text)) add(t.code, 3, t.term);
  const ws = new Set(wordsEn(text).map(stem));
  for (const d of catalog(core, "en")) {
    for (const x of nameWords(d)) if (ws.has(stem(x))) add(d.code, 1, x);
  }
  return [...by.entries()]
    .map(([code, m]) => {
      const ks = [...m.keys()];
      const keep = ks.filter((a) => !ks.some((b) => b !== a && b.toLowerCase().includes(a.toLowerCase())));
      return { code, terms: keep, score: keep.reduce((n, k) => n + (m.get(k) ?? 0), 0) };
    })
    .sort((a, b) => b.score - a.score || b.terms.length - a.terms.length);
}

/* ── 공고 ─────────────────────────────────────────────────────── */

type Section = "none" | "duty" | "req" | "nice" | "skip";

const HEADS: [Section, RegExp][] = [
  ["nice", /^(preferred(\s+(qualifications?|skills|experience))?|nice[\s-]to[\s-]haves?|bonus(\s+points?)?|(it'?s\s+)?a\s+plus|pluses|plus|desired(\s+(qualifications?|skills))?|desirable|good[\s-]to[\s-]have|extra\s+credit|ideally(,\s+you\s+(also\s+)?have)?|we'?d\s+love\s+(it\s+)?if\s+you(\s+have)?|even\s+better(\s+if\s+you\s+have)?)$/i],
  ["duty", /^((key\s+|main\s+|primary\s+|core\s+)?responsibilities|what\s+you('|’)?ll\s+do|what\s+you\s+will\s+do|what\s+you('|’)?ll\s+be\s+doing|the\s+role|your\s+role|role\s+overview|about\s+the\s+role|job\s+description|duties(\s+and\s+responsibilities)?|day[\s-]to[\s-]day|your\s+impact|in\s+this\s+role(,\s+you\s+will)?|what\s+the\s+job\s+involves|position\s+summary|job\s+summary|you\s+will)$/i],
  ["req", /^((minimum|basic|required|essential|key)\s+(qualifications?|requirements|skills)|qualifications?|requirements|what\s+you('|’)?ll\s+need|what\s+we('|’)?re\s+looking\s+for|what\s+we\s+look\s+for|who\s+you\s+are|about\s+you|you\s+have|you\s+bring|must[\s-]haves?|skills(\s+and\s+experience)?|required|requirements\s+and\s+skills|what\s+you\s+bring|your\s+background|experience)$/i],
  ["skip", /^(benefits|perks(\s+and\s+benefits)?|what\s+we\s+offer|why\s+join\s+us|why\s+you('|’)?ll\s+love\s+(it\s+here|working\s+here)|about\s+us|about\s+the\s+company|who\s+we\s+are|our\s+company|company\s+overview|how\s+to\s+apply|application\s+process|hiring\s+process|interview\s+process|compensation(\s+and\s+benefits)?|salary(\s+range)?|pay(\s+range)?|location|work\s+location|schedule|working\s+hours|employment\s+type|job\s+type|equal\s+(employment\s+)?opportunity|eeo(\s+statement)?|diversity(,?\s+equity,?\s+(and|&)\s+inclusion)?|our\s+values|our\s+culture|additional\s+information|other\s+information|note|notes|disclaimer|deadline|application\s+deadline|closing\s+date|dates?)$/i],
];
const ROLE_HEAD = /^(job\s+title|position|role|title|position\s+title)$/i;

/** 머리말인가. `Requirements:` · `## What you'll do` · `**Benefits**` · `Qualifications - ` */
function header(line: string): { sec: Section; head: string; rest: string } | null {
  const t = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
  const m = t.match(/^([A-Za-z][A-Za-z'’,&\s-]{1,48}?)\s*(?:[:：]\s*(.*)|$)/);
  if (!m) return null;
  const head = m[1].replace(/\s+/g, " ").trim().replace(/[\s-]+$/, "");
  if (ROLE_HEAD.test(head)) return { sec: "duty", head, rest: (m[2] ?? "").trim() };
  for (const [sec, re] of HEADS) if (re.test(head)) return { sec, head, rest: (m[2] ?? "").trim() };
  return null;
}

function stripBullet(s: string): string {
  let t = s.trim();
  for (let i = 0; i < 3; i++) {
    const n = t.replace(/^(?:[-–—*•·◦○●■□◆◇▶▷►▪✓✔→>]|\d{1,2}[.)](?!\d)|\(\d{1,2}\)|[a-zA-Z][.)](?=\s))\s*/u, "");
    if (n === t) break;
    t = n.trim();
  }
  return t;
}

/** 학력 · 연차 · 자격 · 체류 자격 · 언어 시험. 도구 이름이 있어도 조건이다 */
const EDU_COND = /\b(bachelor'?s|master'?s|ph\.?\s?d|doctorate|b\.?\s?s\.?c?|m\.?\s?s\.?c?|b\.?eng|m\.?eng|degree|diploma|graduat(e|ed|ing)|gpa|major\s+in|enrolled\s+in|citizen(ship)?|authori[sz]ed\s+to\s+work|work\s+authori[sz]ation|right\s+to\s+work|visa|sponsorship|security\s+clearance|clearance|toefl|ielts|toeic|fluen(t|cy)\s+in|native\s+speaker|driver'?s\s+licen[cs]e|background\s+check|\bage\b|years?\s+old|licen[cs]ed\s+professional|\bP\.?E\.?\b|EIT|FE\s+exam)\b/i;
const AVAIL_COND = /\b(willing(ness)?\s+to|able\s+to\s+(travel|relocate|lift|work\s+(on[\s-]?site|shifts|weekends|overtime))|travel\s+up\s+to|relocat(e|ion)|on[\s-]?site|in[\s-]office|hybrid|shift\s+work|weekends?|overtime|lift\s+\d+|stand\s+for)\b/i;
const COND = /(\b\d+\s*\+?\s*(years?|yrs)\b|\byears?\s+of\s+(professional\s+)?experience\b|\b(entry[\s-]level|new\s+grad(uate)?|internship\s+eligible|senior|junior)\b|\bcertif(ied|ication)\b|\blicen[cs]e\b)/i;
const SOFT = /\b(communication|communicate|teamwork|team\s+player|collaborat\w*|interpersonal|self[\s-]starter|self[\s-]motivated|motivated|detail[\s-]oriented|attention\s+to\s+detail|ownership|passion(ate)?|curious|curiosity|growth\s+mindset|fast[\s-]paced|work\s+independently|independently|organi[sz]ed|proactive|adaptab\w*|positive\s+attitude|eager\s+to\s+learn|willing\s+to\s+learn|problem[\s-]solving\s+skills|written\s+and\s+verbal|verbal\s+and\s+written)\b/i;
const NICE_INLINE = /\b(preferred|is\s+a\s+plus|a\s+plus|nice\s+to\s+have|bonus|desirable|an?\s+advantage|ideally|would\s+be\s+great|highly\s+valued)\b/i;
const TOOL_ASK = /\b(proficien\w*|experience\s+(with|in|using)|familiar\w*\s+with|hands[\s-]on|knowledge\s+of|working\s+knowledge|skilled\s+in|expertise\s+in|ability\s+to\s+(use|design|develop|write|build))\b/i;

const DUE = /\b(deadline|apply\s+by|applications?\s+(close|closing|due|deadline|accepted\s+until)|closing\s+date|closes?\s+on|posting\s+closes|open\s+until|accepting\s+applications\s+(until|through)|apply\s+before|submit\s+(by|before)|due\s+(date|by))\b/i;
const NOT_DUE = /\b(start\s+date|starting|start(s)?\s+on|begins?|internship\s+period|program\s+runs|from\s+.+\s+to|interview|posted|published|updated)\b/i;
const ROLLING = /\b(rolling\s+basis|until\s+(the\s+position\s+is\s+)?filled|open\s+until\s+filled|no\s+deadline|ongoing\s+basis)\b/i;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

/** 한 줄의 날짜. 해가 빠지면 오늘 기준 앞으로 올 날로 본다 */
export function datesInEn(line: string, today: Date): { iso: string; at: number }[] {
  const out: { iso: string; at: number }[] = [];
  const mk = (y: number | null, mo: number, d: number, at: number) => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return;
    let yy = y ?? today.getUTCFullYear();
    if (y === null && Date.UTC(yy, mo - 1, d) < today.getTime() - 60 * 86400_000) yy += 1;
    out.push({ iso: `${yy}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`, at });
  };
  const mon = (s: string) => MONTHS.indexOf(s.slice(0, 3).toLowerCase()) + 1;
  let m: RegExpExecArray | null;
  const iso = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;
  while ((m = iso.exec(line))) mk(+m[1], +m[2], +m[3], m.index);
  /* `11/30/2026` 은 미국식 달/일, 앞이 12 를 넘으면 일/달(`30/11/2026`) */
  const slash = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g;
  while ((m = slash.exec(line))) {
    const a = +m[1], b = +m[2];
    if (a > 12) mk(+m[3], b, a, m.index); else mk(+m[3], a, b, m.index);
  }
  const mdy = new RegExp(`\\b${MON}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`, "gi");
  while ((m = mdy.exec(line))) mk(m[3] ? +m[3] : null, mon(m[1]), +m[2], m.index);
  const dmy = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON}\\.?(?:,?\\s+(20\\d{2}))?\\b`, "gi");
  while ((m = dmy.exec(line))) mk(m[3] ? +m[3] : null, mon(m[2]), +m[1], m.index);
  return out.sort((a, b) => a.at - b.at);
}

const looksLikeTitle = (s: string) =>
  s.length <= 80 && /\b(engineer|developer|scientist|analyst|intern|internship|technician|designer|specialist|architect|programmer|researcher|co-?op|graduate)\b/i.test(s)
  && !/[.!?]$/.test(s);

/**
 * 영어 공고를 요구 항목으로 끊는다. 한국어 쪽(`readPosting`)과 같은 모양을
 * 돌려준다. 머리말을 따라 읽고(`Preferred qualifications` 아래는 우대),
 * 회사 소개 · 복리 · 지원 방법 · 평등 고용 문구는 요구 항목이 아니다.
 */
export function readPostingEn(core: string, raw: string, today = new Date()): ReadOut {
  const text = raw.replace(/\r\n?/g, "\n").replace(/ /g, " ")
    /* 한 줄에 `• a • b • c` 로 이어 적은 꼴 */
    .replace(/\s+[•●▪]\s+/g, "\n• ");
  const lines = text.split("\n").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  const hasHeaders = lines.some((l) => header(stripBullet(l)));

  let sec: Section = "none";
  let sawHeader = false;
  let role: string | null = null;
  let dueSection = false;
  let rolling = false;
  const due: string[] = [];
  const reqs: ReadItem[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line0 = stripBullet(rawLine);
    if (!line0) continue;
    const h = header(line0);
    if (h) dueSection = /deadline|closing|dates?/i.test(h.head);
    if (ROLLING.test(line0)) rolling = true;

    const ds = datesInEn(line0, today);
    if (ds.length) {
      const isDue = (DUE.test(line0) || dueSection) && !(NOT_DUE.test(line0) && !DUE.test(line0));
      if (isDue) { due.push(ds[ds.length - 1].iso); continue; }
      if (!COND.test(line0)) continue;
    }

    let line = line0;
    if (h) {
      sawHeader = true;
      if (ROLE_HEAD.test(h.head)) { if (h.rest && !role) role = h.rest.slice(0, 60); sec = "duty"; continue; }
      sec = h.sec;
      if (!h.rest || sec === "skip") continue;
      line = stripBullet(h.rest);
    } else if (!sawHeader && hasHeaders) {
      if (!role && looksLikeTitle(line0)) role = line0.replace(/\s*[-–|].*$/, "").trim() || null;
      continue;
    }
    if (sec === "skip") continue;
    if (line.length < 4 || line.length > 220) continue;
    if (reqs.length >= 15) continue;
    if (!role && looksLikeTitle(line) && sec === "none") { role = line; continue; }

    /* `; ` 로 여럿을 이어 적은 줄은 나눈다 */
    const parts = line.split(/;\s+/).filter((x) => x.length >= 4);
    if (parts.length > 1) { lines.splice(i + 1, 0, ...parts.slice(1)); line = parts[0]; }

    const key = line.toLowerCase().slice(0, 50);
    if (seen.has(key)) continue;

    const hits = matchDomainsEn(core, line);
    const best = hits[0] ?? null;
    const strong = Boolean(best && best.score >= 3);
    const toolAsk = TOOL_ASK.test(line) || strong;
    const isCond = EDU_COND.test(line) || (AVAIL_COND.test(line) && !toolAsk) || (COND.test(line) && !strong);
    const isSoft = SOFT.test(line) && !strong;
    if (sec === "none" && !best && !isCond) continue;
    seen.add(key);

    const kind: "must" | "nice" = sec === "nice" || NICE_INLINE.test(line.replace(/\([^)]*\)/g, ""))
      || /\(\s*(preferred|a plus|bonus|nice to have)\s*\)/i.test(line) ? "nice" : "must";
    let domain: string | null = null;
    let reason: ReadItem["reason"];
    if (isCond || isSoft) reason = "condition";
    else if (best && best.score >= 2) domain = best.code;
    else reason = "unmatched";
    reqs.push({
      text: line.length > 120 ? `${line.slice(0, 118)}…` : line,
      kind, domain, axis: null, ...(reason ? { reason } : {}),
    });
  }

  let deadline: string | null = due.length ? [...due].sort().at(-1) ?? null : null;
  if (rolling && !due.length) deadline = null;
  return { role, deadline, requirements: reqs };
}

/* ── 메모 ─────────────────────────────────────────────────────── */

/** 직접 정한 것을 말하는 마디. `I` · `we` 가 앞에 있어야 확신이 선다 */
const DECIDE = /\b(decided|chose|chosen|picked|selected|set|defined|designed|proposed|suggested|changed|switched|replaced|fixed|redesigned|specified|sized|determined|led|owned|planned|prioriti[sz]ed|split|reorganized|introduced|recommended|came\s+up\s+with|wrote|built|implemented|calculated)\b/i;
const DECIDE_STRONG = /\b(decided|chose|picked|selected|determined|set\s+the|defined)\b/i;
/** 남이 정한 것을 따라 한 문장. 정한 것도 남긴 것도 아니다 */
const FOLLOWED = /\b(as\s+instructed|as\s+told|was\s+told\s+to|were\s+told\s+to|followed\s+(the|a|my|our)\s+\w+|according\s+to\s+the\s+(manual|procedure|instructions|guide)|(my|our|the)\s+(senior|supervisor|ta|mentor|manager|professor|lead)\s+(set|chose|decided|wrote|gave|made|picked)|just\s+(helped|watched|observed|assisted|ran)|only\s+(helped|assisted|observed|watched)|shadow(ed|ing))\b/i;
const VERIFY = /\b(compared|comparing|validated|verified|checked\s+(it\s+)?against|cross[\s-]checked|tested|benchmarked|measured|reviewed|calibrated|hand\s+calc\w*|sanity[\s-]check\w*|matched\s+(it\s+)?(with|against))\b/i;

function sentencesEn(note: string): string[] {
  return note.split(/(?<!\d)[.!?]+(?!\d)|\n+/).map((s) => s.trim()).filter(Boolean);
}
function clausesEn(note: string): string[] {
  return note.split(/(?<!\d)[.!?]+(?!\d)|\n+|;\s*|,\s+(?:and\s+|then\s+|so\s+)?(?=(?:i|we)\b)|\s+(?:and then|then)\s+/i)
    .map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length >= 6);
}

const ITEM_STOP = new Set(["set", "chose", "made", "the", "and", "for", "with", "based", "own", "myself"]);
function overlapEn(item: string, clause: string): number {
  const iw = wordsEn(item).filter((w) => !ITEM_STOP.has(w));
  if (!iw.length) return 0;
  const cw = new Set(wordsEn(clause).map(stem));
  return iw.filter((w) => cw.has(stem(w))).length / iw.length;
}

function kindOfEn(note: string): string | null {
  if (/\b(capstone|senior\s+design|senior\s+project|final[\s-]year\s+project|thesis\s+project)\b/i.test(note)) return "capstone";
  if (/\b(intern(ship)?|co-?op|placement|work\s+term)\b/i.test(note)) return "internship";
  if (/\b(research\s+(lab|assistant|project)|undergraduate\s+research|lab\s+assistant|\bRA\b|professor'?s\s+lab)\b/i.test(note)) return "research";
  if (/\b(paper|publication|conference|journal|poster\s+session)\b/i.test(note)) return "paper";
  if (/\b(project|hackathon|competition|club|team\s+build|formula\s+(sae|student)|robotics\s+team|side\s+project)\b/i.test(note)) return "project";
  if (/\b(assignment|homework|lab\s+report|term\s+paper|problem\s+set)\b/i.test(note)) return "assignment";
  if (/\b(course|class|lecture|lab\s+session|module)\b/i.test(note)) return "course";
  if (/\b(certificate|certification|bootcamp|completed\s+(a|the)\s+course)\b/i.test(note)) return "credential";
  if (/\b(job|part[\s-]time|worked\s+at|employer|company)\b/i.test(note)) return "work";
  return null;
}

function titleEn(note: string): string {
  const first = (sentencesEn(note)[0] ?? note).replace(/\s+/g, " ").trim();
  if (first.length <= 60) return first;
  const cut = first.slice(0, 60);
  const sp = cut.lastIndexOf(" ");
  return (sp >= 20 ? cut.slice(0, sp) : cut).replace(/[\s,;:-]+(and|or|the|a|an|to|of|with|for|in|on)?$/i, "").trim();
}

const ART_ALIAS: [RegExp, string][] = [
  [/github|gitlab|repo(sitory)?|source\s+code|\bcode\b|pull\s+request/i, "code"],
  [/slides|presentation|deck|presented/i, "presentation"],
  [/report|write[\s-]?up/i, "report"],
  [/drawing|cad\s+model|solidworks|schematic/i, "drawing"],
  [/spreadsheet|excel|sheet/i, "table"],
  [/prototype|demo\s+board|test\s+board/i, "prototype"],
];
function pickArtifactsEn(pool: string[], note: string): string[] {
  const nw = new Set(wordsEn(note).map(stem));
  for (const [re, w] of ART_ALIAS) if (re.test(note)) nw.add(stem(w));
  const scored = pool.map((a) => {
    const aw = wordsEn(a).filter((w) => !ITEM_STOP.has(w));
    const head = aw[aw.length - 1] ?? "";
    if (!head || !nw.has(stem(head))) return null;
    return { a, head, s: aw.filter((w) => nw.has(stem(w))).length / aw.length };
  }).filter((x): x is { a: string; head: string; s: number } => Boolean(x)).sort((x, y) => y.s - x.s);
  const out: string[] = [];
  const heads = new Set<string>();
  for (const x of scored) {
    if (heads.has(x.head)) continue;
    heads.add(x.head); out.push(x.a);
    if (out.length >= 2) break;
  }
  return out;
}

const ART_WORD = /\b((?:[A-Za-z-]+\s){0,2}(report|drawings?|schematic|code|repo(sitory)?|slides|presentation|prototype|dashboard|spreadsheet|test\s+plan|poster|paper|app|website|model|script|manual|documentation|datasheet))\b/i;

/** 영어 메모를 경험 추가 화면의 보기로 옮긴다(한국어 `draftByRules` 와 같은 모양) */
export function draftByRulesEn(core: string, note: string): RuleDraft {
  const cat = catalog(core, "en");
  const hits = matchDomainsEn(core, note);
  const td: string[] = [];
  if (hits[0]) td.push(hits[0].code);
  if (hits[1] && hits[1].score >= 2 && hits[1].score * 2 >= hits[0].score) td.push(hits[1].code);
  const ds = cat.filter((d) => td.includes(d.code));

  const own = sentencesEn(note).filter((s) => !FOLLOWED.test(s)).join(". ");
  const cls = clausesEn(own);
  const pickFrom = (pool: string[], want: (c: string) => boolean, min: number, max: number) => {
    const out: { item: string; s: number }[] = [];
    for (const c of cls.filter(want)) {
      for (const it of pool) {
        const s = overlapEn(it, c);
        if (s >= min) out.push({ item: it, s });
      }
    }
    return [...new Map(out.sort((a, b) => b.s - a.s).map((x) => [x.item, x])).values()]
      .slice(0, max).map((x) => x.item);
  };

  const decided = cls.filter((c) => DECIDE.test(c) && !FOLLOWED.test(c))
    .map((c, i) => ({ c, i, s: (DECIDE_STRONG.test(c) ? 2 : 0) + (/\b(i|we)\b/i.test(c) ? 1 : 0) }))
    .sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.c);
  const decisions = pickFrom(ds.flatMap((d) => d.checklist.J3.slice(0, 8)),
    (c) => DECIDE.test(c) && !FOLLOWED.test(c), 0.5, 2);
  const problems = pickFrom(ds.flatMap((d) => d.checklist.J1.slice(0, 6)), () => true, 0.6, 1);
  const verifications = pickFrom(ds.flatMap((d) => d.verify), (c) => VERIFY.test(c), 0.5, 2);
  const artifacts = pickArtifactsEn(ds.flatMap((d) => d.artifacts), own);
  const mentioned = [...new Set(cls.map((c) => c.match(ART_WORD)?.[1]?.trim()).filter((x): x is string => !!x))].slice(0, 2);

  const ask: string[] = [];
  if (!td.length) ask.push("Which technical area was this work in? Pick one in the next step.");
  if (!decisions.length && decided.length) {
    const q = decided[0].length > 60 ? `${decided[0].slice(0, 58).replace(/\s+\S*$/, "")}…` : decided[0];
    ask.push(`"${q}" in your note sounds like something you decided yourself. Pick the closest option in the next step.`);
  } else if (!decisions.length) {
    ask.push("Did you set any criteria or conditions yourself? If so, pick them in the next step.");
  }
  if (!artifacts.length && mentioned.length) {
    ask.push(`Pick the option closest to ${mentioned.map((x) => `"${x}"`).join(" and ")} in the last step.`);
  } else if (!artifacts.length) {
    ask.push("What did you have in hand at the end (file, drawing, report, code)?");
  }
  if (!verifications.length && cls.some((c) => VERIFY.test(c))) {
    ask.push("Also pick what you checked your result against in the next step.");
  }
  return {
    kind: kindOfEn(note), title: titleEn(note), td,
    problems, decisions, artifacts, verifications, ask: ask.slice(0, 3),
  };
}
