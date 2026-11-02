import { query } from "@/lib/db";
import { postingsForMe, type MatchedPosting } from "@/lib/assistant/match";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { isGrad } from "@/lib/assistant/research";
import { stageOf } from "@/lib/assistant/stage";
import { activeCoreOrPick } from "@/lib/me-v3/platform";
import { isEntryJob, isSeniorJob, jobTitle } from "./job-title";
import { matchDomains } from "@/lib/assistant/rules";

/**
 * MAT 이 보여 줄 공고를 고른다(2026-11-02 운영 시험: 인공지능학과 학생에게 대학원 연구실 모집 8건만 보였다).
 *
 * - **학부생에게는 대학원 · 연구실 모집을 따로 묶는다.** 잡인더스트리 `대학원생`(488) · `교원 임용`(439) 게시판과
 *   요구에 대학원 · 연구실 · 석박사 과정 말이 든 공고. 석사 이상이면 묶지 않는다(그 사람에게는 맞는 공고다)
 * - 위에 오는 차례: 내 자료 · 경험과 겹친 낱말 수(`postingsForMe`) + **전공 이름이 요구에 있음** + **신입 · 인턴 공고**
 * - **다른 전공 공고는 따로 묶는다**(2026-11-02 운영 시험: 인공지능학과 학생에게 화학시험보조 · 임상개발이 섞였다).
 *   모을 때 다른 전공으로 단 공고, 전공을 못 단 공고 가운데 내 자료 · 전공 이름과 겹치는 것이 없는 공고
 * - 점수를 화면에 내지 않는다. 왜 위에 왔는지는 칩(겹친 낱말 · 전공 · 신입)으로 보인다
 * - 회사 이름은 다루지 않는다(표에 없다)
 */
const GRAD_BOARD = /jobindustry\.co\.kr\/(488|439)\//;
const GRAD_TEXT = /대학원|연구실|석사|박사|석·박사|포닥|postdoc|학위\s?과정|대학원생|교수\s?(초빙|임용)|lab\b/i;

const stem = (m: string | null) => (m ?? "").replace(/\s+/g, "").replace(/(공학과|공학부|학과|학부|전공|과)$/, "");

export type PickedJobs = {
  main: MatchedPosting[]; grad: MatchedPosting[]; other: MatchedPosting[]; matched: boolean;
  /**
   * 내 전공으로 단 공고지만 전공 사전 낱말 · 내 자료와 겹치는 것이 없는 공고(2026-11-02 운영 시험: 인공지능학과에
   * "과제계약직" · "육아휴직 대체인력" 이 맞는 공고로 섰다). 맞는 공고가 없을 때만 "조건을 넓힌 공고" 로 밝혀 보인다
   */
  broad: MatchedPosting[];
  /**
   * 이번 주(7일)에 들어온 공고 가운데 **내 자료 · 경험 · 전공 이름과 실제로 겹친** 것의 수. 홈 알림과 브리핑이
   * 이 한 값을 읽는다(2026-11-02 운영 시험: 홈은 "새로 맞는 공고가 있어요", 브리핑은 "아직 없어요"였다.
   * 홈은 `신입 · 인턴` 칩까지 겹침으로 셌다)
   */
  fresh: number;
};

export async function pickJobs(userId: string, limit = 20): Promise<PickedJobs> {
  const [mine, major, stage, core] = await Promise.all([
    postingsForMe(userId, 300).catch(() => null),
    activeMajorName(userId).catch(() => null),
    stageOf(userId).catch(() => null),
    activeCoreOrPick(userId).catch(() => null),
  ]);
  const pool = await query<{
    id: string; source: string; source_url: string | null; closes_on: string | null; captured_at: string;
    region_code: string | null; raw_requirements: string[]; core_code: string | null; role_code: string | null;
  }>(
    `SELECT id::text, source, source_url, closes_on::text, captured_at::text, region_code, raw_requirements, core_code, role_code
       FROM v3_job_postings
      WHERE captured_at > now() - interval '180 days'
        AND (closes_on IS NULL OR closes_on >= (now() AT TIME ZONE 'Asia/Seoul')::date)
      ORDER BY captured_at DESC LIMIT 1500`, []).catch(() => []);
  const hitsOf = new Map((mine?.rows ?? []).map((r) => [r.id, r]));
  const grad = isGrad(stage);
  const st = stem(major);

  const scored = pool.map((p) => {
    const text = (p.raw_requirements ?? []).join(" ");
    const m = hitsOf.get(p.id);
    const hits = [...(m?.hits ?? [])];
    let score = (m?.hits.length ?? 0) + (m?.tdHits.length ?? 0);
    const majorHit = st.length >= 2 && text.includes(st);
    if (majorHit) { score += 3; if (!hits.includes(st)) hits.unshift(st); }
    /* 아래에서 제목 · 모집 분야로 다시 정한다 */
    let mineField = p.core_code ? p.core_code === core : (m?.hits.length ?? 0) > 0 || majorHit;
    /* **전공 관련도가 먼저다**: 내 전공 사전의 낱말(예: 딥러닝 · PyTorch · AI 엔지니어)이 **제목 · 모집 분야**에 나오는가.
       본문에 한 번 나온 것만으로는 맞춤으로 치지 않고 순위만 조금 올린다(2026-11-02 운영 시험: 본문의 "인공지능" 한 번으로
       "과제계약직" 공고가 인공지능학과의 첫 줄에 섰다) */
    const head = [jobTitle(p.raw_requirements ?? [], p.role_code).title ?? "", p.role_code ?? ""].join(" ");
    const dictHead = core ? matchDomains(core, head).filter((x) => x.score >= 3) : [];
    const dictBody = core ? matchDomains(core, text).filter((x) => x.score >= 3) : [];
    const rel = dictHead.reduce((n, x) => n + x.terms.length, 0);
    const relBody = dictBody.reduce((n, x) => n + x.terms.length, 0);
    score += rel * 4 + Math.min(relBody, 2);
    for (const x of dictHead) for (const t of x.terms) if (hits.length < 6 && !hits.includes(t)) hits.push(t);
    /* **제목 · 모집 분야가 내 전공 말이면 내 전공 공고다**(2026-11-02 운영 시험: 모을 때 다른 전공으로 단 "AI Engineer" 가
       인공지능학과의 "다른 전공 공고" 에 들어갔다). 내 자료 · 전공 이름도 제목에 있어야 맞춤으로 친다(본문에만 있으면 순위만) */
    const headLow = head.toLowerCase();
    const headUser = (m?.hits ?? []).some((h) => headLow.includes(h.toLowerCase())) || (st.length >= 2 && head.includes(st));
    if (rel > 0) mineField = true;
    const entry = isEntryJob(text);
    if (entry) { score += 2; if (!hits.includes("신입 · 인턴")) hits.push("신입 · 인턴"); }
    /* 경력 채용은 표를 달고 뒤로(2026-11-02 운영 시험: 경력직이 학부생에게 표시 없이 섰다) */
    else if (isSeniorJob(text)) { score -= 3; hits.unshift("경력 채용"); }
    const research = GRAD_BOARD.test(p.source_url ?? "") || GRAD_TEXT.test(text);
    const row: MatchedPosting = {
      id: p.id, source: p.source, source_url: p.source_url, closes_on: p.closes_on, captured_at: p.captured_at,
      region_code: p.region_code, requirements: (p.raw_requirements ?? []).slice(0, 8), hits, tdHits: m?.tdHits ?? [],
      role: p.role_code,
    };
    const real = rel > 0 || headUser;
    return { row, score, research, mineField, real };
  });
  const order = (a: typeof scored[number], b: typeof scored[number]) =>
    b.score - a.score || (a.row.closes_on ?? "9999").localeCompare(b.row.closes_on ?? "9999");
  const field = scored.filter((x) => (grad || !x.research) && x.mineField);
  const main = field.filter((x) => x.real).sort(order);
  const broad = field.filter((x) => !x.real).sort(order);
  const gradRows = grad ? [] : scored.filter((x) => x.research && x.mineField).sort(order);
  /* **무관한 공고는 보이지 않는다**(2026-11-02 운영 시험: 대웅제약 임상개발 · PCB 설계가 인공지능학과 화면에 섰다) */
  const other: typeof scored = [];
  return {
    main: main.slice(0, limit).map((x) => x.row),
    broad: main.length ? [] : broad.slice(0, limit).map((x) => x.row),
    grad: gradRows.slice(0, 10).map((x) => x.row),
    other: other.map((x) => x.row),
    matched: main.some((x) => x.score > 0),
    fresh: main.filter((x) => x.real && Date.parse(x.row.captured_at) >= Date.now() - 7 * 86_400_000).length,
  };
}
