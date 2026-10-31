import { query } from "@/lib/db";

/**
 * 논문 읽기 채점표(2026-10-31 대표 지시).
 *
 * MAT 이 석·박사의 논문을 "충분히" 읽는지는 말로 답할 수 없다. 그래서 읽은 자료
 * 아래에 칸 여섯을 두고, **그 자료를 쓴 본인이** 누른다. 운영 화면
 * (`/admin/research-eval`)이 칸마다 맞은 비율을 세고 합격선과 견준다.
 *
 * **합격선을 자료보다 먼저 적는다.** 숫자를 보고 선을 정하면 그 선은 아무것도
 * 막지 못한다. 그리고 **열 건이 안 되면 판정하지 않는다**: 세 건이 다 맞았다고
 * "석·박사가 충분히 도움을 받는다" 고 말할 수 없다.
 *
 * **운영 화면에 자료 제목을 내보내지 않는다.** 논문 제목만으로 사람이 특정된다.
 * 운영자가 보는 것은 칸별 비율과 자료 종류·언어뿐이다.
 */

export type GradePart = "summary" | "methods" | "findings" | "job" | "interview";
export type Part = GradePart | "invented";
export type Verdict = "right" | "partly" | "wrong" | "yes" | "no";

export const GRADE_PARTS: { key: GradePart; label: string; ask: string; pass: number }[] = [
  { key: "summary", label: "핵심 요약", ask: "무엇을 했고 무엇이 나왔는지 맞게 정리했나요?", pass: 0.8 },
  { key: "methods", label: "방법·도구", ask: "실제로 쓴 방법과 도구가 맞나요?", pass: 0.8 },
  { key: "findings", label: "핵심 결과와 근거 위치", ask: "결과 숫자와 그 위치(그림·표·쪽)가 맞나요?", pass: 0.7 },
  { key: "job", label: "직무의 말", ask: "직무 말로 옮긴 것이 내가 실제로 한 일인가요?", pass: 0.7 },
  { key: "interview", label: "면접 질문", ask: "실제로 받을 만한 질문인가요?", pass: 0.6 },
];

/** 지어낸 곳이 있다고 답한 자료가 이 비율을 넘으면 실패다 */
export const INVENTED_MAX = 0.05;
/** 이보다 적게 채점됐으면 판정하지 않는다 */
export const MIN_DOCS = 10;
/** 영어 자료가 이보다 적으면 영어 논문에 대해서는 판정하지 않는다 */
export const MIN_EN = 3;

export const VERDICT_KO: Record<Verdict, string> = {
  right: "맞음", partly: "일부", wrong: "틀림", yes: "있음", no: "없음",
};

const isGrade = (p: string): p is GradePart => GRADE_PARTS.some((g) => g.key === p);

export function validPair(part: string, verdict: string): boolean {
  if (part === "invented") return verdict === "yes" || verdict === "no";
  return isGrade(part) && (verdict === "right" || verdict === "partly" || verdict === "wrong");
}

/** 본인 자료에만 적힌다: 남의 자료 번호를 넣으면 한 줄도 쓰이지 않는다 */
export async function saveFeedback(userId: string, docId: string, part: string, verdict: string): Promise<boolean> {
  if (!/^\d+$/.test(docId) || !validPair(part, verdict)) return false;
  const rows = await query<{ doc_id: string }>(
    `INSERT INTO research_feedback (doc_id, part, verdict)
     SELECT d.id, $3, $4 FROM research_docs d WHERE d.id = $2::bigint AND d.user_id = $1
     ON CONFLICT (doc_id, part) DO UPDATE SET verdict = EXCLUDED.verdict, updated_at = now()
     RETURNING doc_id::text`,
    [userId, docId, part, verdict]).catch(() => []);
  return rows.length === 1;
}

/** 자료 번호 → 칸 → 고른 값. 표가 아직 없으면 빈 것 */
export async function feedbackOf(userId: string): Promise<Record<string, Partial<Record<Part, Verdict>>>> {
  const rows = await query<{ doc_id: string; part: Part; verdict: Verdict }>(
    `SELECT f.doc_id::text, f.part, f.verdict
       FROM research_feedback f JOIN research_docs d ON d.id = f.doc_id
      WHERE d.user_id = $1`, [userId]).catch(() => []);
  const out: Record<string, Partial<Record<Part, Verdict>>> = {};
  for (const r of rows) (out[r.doc_id] ??= {})[r.part] = r.verdict;
  return out;
}

export type PartStat = {
  key: GradePart; label: string; pass: number;
  n: number; right: number; partly: number; wrong: number;
  /** 맞음 비율. 바닥이 0 이면 null */
  rate: number | null;
  status: "pass" | "fail" | "wait";
};

export type EvalReport = {
  error: string | null;
  /** 한 칸이라도 채점된 자료 */
  graded: number;
  gradedEn: number;
  /** 읽은 자료 전체(채점 안 된 것 포함) */
  docs: number;
  parts: PartStat[];
  invented: { n: number; yes: number; rate: number | null; status: "pass" | "fail" | "wait" };
  /** 핵심 결과 줄 가운데 그림·표·쪽 같은 위치가 붙은 비율(사람 채점 없이 센다) */
  located: { lines: number; withPlace: number; rate: number | null };
  byType: { doc_type: string; lang: string | null; n: number }[];
  verdict: "wait" | "pass" | "fail";
};

/** 결과 줄에 근거 위치가 붙었는가. 한·영 표기 둘 다 본다 */
export const PLACE_RE = /(그림|표|쪽|페이지|식)\s*\d|\d+\s*(쪽|페이지|장|절)|\b(fig(ure)?|table|eq(uation)?|section|sec|p{1,2})\.?\s*\d/i;

export async function evalReport(opts: { demo?: boolean } = {}): Promise<EvalReport> {
  const demo = opts.demo ? "" : "AND NOT u.is_demo";
  const empty: EvalReport = {
    error: null, graded: 0, gradedEn: 0, docs: 0,
    parts: GRADE_PARTS.map((g) => ({ key: g.key, label: g.label, pass: g.pass, n: 0, right: 0, partly: 0, wrong: 0, rate: null, status: "wait" })),
    invented: { n: 0, yes: 0, rate: null, status: "wait" },
    located: { lines: 0, withPlace: 0, rate: null },
    byType: [], verdict: "wait",
  };
  try {
    const [cnt, docs, types, fb] = await Promise.all([
      query<{ graded: number; graded_en: number }>(
        `SELECT count(DISTINCT f.doc_id)::int graded,
                count(DISTINCT f.doc_id) FILTER (WHERE d.lang = 'en')::int graded_en
           FROM research_feedback f JOIN research_docs d ON d.id = f.doc_id JOIN users u ON u.id = d.user_id
          WHERE true ${demo}`, []),
      query<{ findings: unknown }>(
        `SELECT d.data->'findings' findings FROM research_docs d JOIN users u ON u.id = d.user_id WHERE true ${demo}`, []),
      query<{ doc_type: string; lang: string | null; n: number }>(
        `SELECT d.doc_type, d.lang, count(*)::int n
           FROM research_docs d JOIN users u ON u.id = d.user_id WHERE true ${demo}
          GROUP BY 1, 2 ORDER BY n DESC, 1`, []),
      query<{ part: Part; verdict: Verdict; n: number }>(
        `SELECT f.part, f.verdict, count(*)::int n
           FROM research_feedback f JOIN research_docs d ON d.id = f.doc_id JOIN users u ON u.id = d.user_id
          WHERE true ${demo} GROUP BY 1, 2`, []),
    ]);
    const r = { ...empty, graded: cnt[0]?.graded ?? 0, gradedEn: cnt[0]?.graded_en ?? 0, docs: docs.length, byType: types };
    const enough = r.graded >= MIN_DOCS;
    const get = (p: Part, v: Verdict) => fb.find((x) => x.part === p && x.verdict === v)?.n ?? 0;
    r.parts = GRADE_PARTS.map((g) => {
      const right = get(g.key, "right"), partly = get(g.key, "partly"), wrong = get(g.key, "wrong");
      const n = right + partly + wrong;
      const rate = n ? right / n : null;
      return { key: g.key, label: g.label, pass: g.pass, n, right, partly, wrong, rate,
        status: !enough || rate === null ? "wait" : rate >= g.pass ? "pass" : "fail" };
    });
    const yes = get("invented", "yes"), no = get("invented", "no"), n = yes + no;
    const irate = n ? yes / n : null;
    r.invented = { n, yes, rate: irate, status: !enough || irate === null ? "wait" : irate <= INVENTED_MAX ? "pass" : "fail" };
    let lines = 0, withPlace = 0;
    for (const d of docs) {
      for (const f of Array.isArray(d.findings) ? d.findings : []) {
        if (typeof f !== "string") continue;
        lines += 1;
        if (PLACE_RE.test(f)) withPlace += 1;
      }
    }
    r.located = { lines, withPlace, rate: lines ? withPlace / lines : null };
    const all = [...r.parts.map((p) => p.status), r.invented.status];
    r.verdict = all.includes("wait") ? "wait" : all.includes("fail") ? "fail" : "pass";
    return r;
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : String(e) };
  }
}
