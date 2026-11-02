import { query } from "@/lib/db";
import { postingsForMe, type MatchedPosting } from "@/lib/assistant/match";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { isGrad } from "@/lib/assistant/research";
import { stageOf } from "@/lib/assistant/stage";

/**
 * MAT 이 보여 줄 공고를 고른다(2026-11-02 운영 시험: 인공지능학과 학생에게 대학원 연구실 모집 8건만 보였다).
 *
 * - **학부생에게는 대학원 · 연구실 모집을 따로 묶는다.** 잡인더스트리 `대학원생`(488) · `교원 임용`(439) 게시판과
 *   요구에 대학원 · 연구실 · 석박사 과정 말이 든 공고. 석사 이상이면 묶지 않는다(그 사람에게는 맞는 공고다)
 * - 위에 오는 차례: 내 자료 · 경험과 겹친 낱말 수(`postingsForMe`) + **전공 이름이 요구에 있음** + **신입 · 인턴 공고**
 * - 점수를 화면에 내지 않는다. 왜 위에 왔는지는 칩(겹친 낱말 · 전공 · 신입)으로 보인다
 * - 회사 이름은 다루지 않는다(표에 없다)
 */
const GRAD_BOARD = /jobindustry\.co\.kr\/(488|439)\//;
const GRAD_TEXT = /대학원|연구실|석사|박사|석·박사|포닥|postdoc|학위\s?과정|대학원생|교수\s?(초빙|임용)|lab\b/i;
const ENTRY = /신입|인턴|채용\s?연계|졸업\s?예정|경력\s?무관|학사\s?(이상|졸업)/;

const stem = (m: string | null) => (m ?? "").replace(/\s+/g, "").replace(/(공학과|공학부|학과|학부|전공|과)$/, "");

export type PickedJobs = { main: MatchedPosting[]; grad: MatchedPosting[]; matched: boolean };

export async function pickJobs(userId: string, limit = 20): Promise<PickedJobs> {
  const [mine, major, stage] = await Promise.all([
    postingsForMe(userId, 300).catch(() => null),
    activeMajorName(userId).catch(() => null),
    stageOf(userId).catch(() => null),
  ]);
  const pool = await query<{
    id: string; source: string; source_url: string | null; closes_on: string | null; captured_at: string;
    region_code: string | null; raw_requirements: string[];
  }>(
    `SELECT id::text, source, source_url, closes_on::text, captured_at::text, region_code, raw_requirements
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
    if (st.length >= 2 && text.includes(st)) { score += 3; if (!hits.includes(st)) hits.unshift(st); }
    const entry = ENTRY.test(text);
    if (entry) { score += 2; if (!hits.includes("신입 · 인턴")) hits.push("신입 · 인턴"); }
    const research = GRAD_BOARD.test(p.source_url ?? "") || GRAD_TEXT.test(text);
    const row: MatchedPosting = {
      id: p.id, source: p.source, source_url: p.source_url, closes_on: p.closes_on, captured_at: p.captured_at,
      region_code: p.region_code, requirements: (p.raw_requirements ?? []).slice(0, 8), hits, tdHits: m?.tdHits ?? [],
    };
    return { row, score, research };
  });
  const order = (a: typeof scored[number], b: typeof scored[number]) =>
    b.score - a.score || (a.row.closes_on ?? "9999").localeCompare(b.row.closes_on ?? "9999");
  const main = scored.filter((x) => grad || !x.research).sort(order);
  const gradRows = grad ? [] : scored.filter((x) => x.research).sort(order);
  return {
    main: main.slice(0, limit).map((x) => x.row),
    grad: gradRows.slice(0, 10).map((x) => x.row),
    matched: main.some((x) => x.score > 0),
  };
}
