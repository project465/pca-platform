/**
 * 파일럿 자료를 읽는 자리.
 *
 * **평균 하나로 합치지 않는다.** `만족도 4.3점` 으로 끝내면 무엇을 고쳐야
 * 할지 알 수 없다. 묻는 것이 여섯이라(문항 이해 · 소유 구분 · 결과 납득 ·
 * 공백 이해 · 실행 가능성 · 상품 가치) 나오는 것도 여섯이다.
 *
 * **다섯 명이 안 되는 칸은 값을 만들지 않는다.** 가려서 보여 주는 것이
 * 아니라 `null` 을 돌려준다. 화면이 알아서 가려 주기를 바라면 내보내기나
 * 캡처에서 새어 나간다.
 *
 * **평균만 보지 않는다.** 스무 명짜리 표본에서 평균은 한 사람에게 끌려
 * 다닌다. 걸린 시간은 중앙값과 사분위로 적는다.
 */
import { query } from "@/lib/db";
import { MIN_CELL } from "./store";

/* ── 통계라고 부르지 않을 만큼만 ─────────────────────────────────── */

export type Spread = { n: number; p25: number | null; median: number | null; p75: number | null };

/** 작은 표본에서 사분위를 가장 단순한 방법으로 집는다 */
export function spread(xs: number[]): Spread {
  const s = [...xs].filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const at = (q: number) => (s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null);
  /* 셋이 안 되면 사분위가 뜻을 가지지 않는다. 중앙값만 돌려준다 */
  if (s.length < 3) return { n: s.length, p25: null, median: at(0.5), p75: null };
  return { n: s.length, p25: at(0.25), median: at(0.5), p75: at(0.75) };
}

export type Mean = { n: number; mean: number | null };

/** 다섯 명이 안 되면 평균을 **만들지 않는다** */
export function mean(xs: number[]): Mean {
  const s = xs.filter((x) => Number.isFinite(x));
  if (s.length < MIN_CELL) return { n: s.length, mean: null };
  return { n: s.length, mean: Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 100) / 100 };
}

/* ── 블록마다 걸린 시간 ──────────────────────────────────────────── */

/**
 * 묻는 묶음 아홉.
 *
 * 화면 이름의 앞머리로 가른다. 응시 화면을 건드리지 않고 `v3_attempts.
 * current_screen` 이 지나간 자취(`v3_pilot_screen_events`)에서 읽는다.
 */
export const BLOCKS = [
  "profile", "basic_grid", "screening", "deep_domains", "evidence",
  "translation", "industry", "role", "result_reading",
] as const;
export type Block = typeof BLOCKS[number];

export const BLOCK_KO: Record<Block, string> = {
  profile: "기본 정보",
  basic_grid: "열두 영역 격자",
  screening: "선별 문항",
  deep_domains: "경험 심화",
  evidence: "근거 고르기",
  translation: "경험 번역",
  industry: "산업 고르기",
  role: "역할 고르기",
  result_reading: "결과 읽기",
};

/** 화면 이름 → 묶음. 화면이 늘면 여기 한 줄이 는다 */
export function blockOfScreen(screen: string): Block | null {
  if (screen.startsWith("profile")) return "profile";
  if (screen.startsWith("grid")) return "basic_grid";
  if (screen.startsWith("probe-") || screen.startsWith("common")) return "screening";
  if (screen.startsWith("checklist")) return "evidence";
  if (screen.startsWith("deep-")) return "deep_domains";
  if (screen.startsWith("trans")) return "translation";
  if (screen.startsWith("industry") || screen.startsWith("pick-industry")) return "industry";
  if (screen.startsWith("role") || screen.startsWith("pick-role")) return "role";
  return null;
}

/** 자리를 비운 시간을 섞지 않는다. 스무 분을 넘는 틈은 뺀다 */
const AWAY_MS = 20 * 60 * 1000;

export type BlockTime = { block: Block; label: string } & Spread;

/**
 * 블록마다 걸린 시간을 **사람마다 한 값**으로 모으고 그 분포를 적는다.
 *
 * 한 사람이 같은 블록에 두 번 들어오는 일이 있어서(뒤로 갔다가 다시 오면)
 * 그 시간은 더한다. 사람마다 한 값이라야 중앙값이 사람을 센다.
 */
export async function blockTimes(wave?: number): Promise<BlockTime[]> {
  const rows = await query<{ attempt_id: string; screen_id: string; at: string }>(
    `SELECT e.attempt_id::text, e.screen_id, e.at::text
       FROM v3_pilot_screen_events e
       JOIN v3_attempts a ON a.id = e.attempt_id
       JOIN v3_pilot_participants p ON p.user_id = a.user_id
      WHERE ($1::int IS NULL OR p.wave = $1)
      ORDER BY e.attempt_id, e.at`,
    [wave ?? null]);

  const per = new Map<string, Map<Block, number>>();
  let prevAttempt = "";
  let prevAt = 0;
  let prevBlock: Block | null = null;
  for (const r of rows) {
    const t = new Date(r.at).getTime();
    const b = blockOfScreen(r.screen_id);
    if (r.attempt_id === prevAttempt && prevBlock) {
      const d = t - prevAt;
      if (d > 0 && d < AWAY_MS) {
        const m = per.get(prevAttempt) ?? new Map<Block, number>();
        m.set(prevBlock, (m.get(prevBlock) ?? 0) + d / 1000);
        per.set(prevAttempt, m);
      }
    }
    prevAttempt = r.attempt_id;
    prevAt = t;
    prevBlock = b;
  }

  /* 결과 읽기는 결과지 발자국에서 읽는다 */
  const read = await query<{ attempt_id: string; secs: string }>(
    `SELECT e.attempt_id::text,
            EXTRACT(EPOCH FROM (max(e.at) - min(e.at)))::text AS secs
       FROM v3_pilot_events e
       JOIN v3_attempts a ON a.id = e.attempt_id
       JOIN v3_pilot_participants p ON p.user_id = a.user_id
      WHERE ($1::int IS NULL OR p.wave = $1)
      GROUP BY e.attempt_id`,
    [wave ?? null]);
  for (const r of read) {
    const n = Number(r.secs);
    if (!Number.isFinite(n) || n <= 0 || n > AWAY_MS / 1000) continue;
    const m = per.get(r.attempt_id) ?? new Map<Block, number>();
    m.set("result_reading", n);
    per.set(r.attempt_id, m);
  }

  return BLOCKS.map((block) => {
    const xs: number[] = [];
    for (const m of per.values()) {
      const v = m.get(block);
      if (v !== undefined) xs.push(Math.round(v));
    }
    return { block, label: BLOCK_KO[block], ...spread(xs) };
  });
}

/* ── 문항마다 머뭇거린 자리 ──────────────────────────────────────── */

export type SlowItem = {
  item_id: string; block: string; n: number;
  median_secs: number | null; changed: number;
};

/**
 * 오래 걸린 문항과 자주 고친 문항.
 *
 * **문항 번호는 운영자만 본다.** 응시자 화면에도 분석 표에도 그 번호가
 * 나가지 않고, 여기서는 고칠 자리를 집기 위해 쓴다.
 *
 * 걸린 시간은 **앞 답과의 사이**다. 화면에 시계를 심지 않았으므로 이것이
 * 쓸 수 있는 가장 가까운 값이고, 그래서 `proxy` 다.
 */
export async function slowItems(wave?: number, limit = 12): Promise<SlowItem[]> {
  const rows = await query<{
    item_id: string; attempt_id: string; answered_at: string; change_count: number;
  }>(
    `SELECT r.item_id, r.attempt_id::text, r.answered_at::text, r.change_count
       FROM v3_responses r
       JOIN v3_attempts a ON a.id = r.attempt_id
       JOIN v3_pilot_participants p ON p.user_id = a.user_id
      WHERE ($1::int IS NULL OR p.wave = $1)
      ORDER BY r.attempt_id, r.answered_at`,
    [wave ?? null]);

  const gaps = new Map<string, number[]>();
  const changed = new Map<string, number>();
  let prevAttempt = "";
  let prevAt = 0;
  for (const r of rows) {
    const t = new Date(r.answered_at).getTime();
    if (r.attempt_id === prevAttempt) {
      const d = (t - prevAt) / 1000;
      if (d > 0 && d < AWAY_MS / 1000) {
        gaps.set(r.item_id, [...(gaps.get(r.item_id) ?? []), Math.round(d)]);
      }
    }
    if (r.change_count > 0) changed.set(r.item_id, (changed.get(r.item_id) ?? 0) + 1);
    prevAttempt = r.attempt_id;
    prevAt = t;
  }

  const out: SlowItem[] = [];
  for (const [item_id, xs] of gaps) {
    const s = spread(xs);
    out.push({
      item_id, block: blockOfItem(item_id), n: s.n,
      median_secs: s.median, changed: changed.get(item_id) ?? 0,
    });
  }
  return out
    .sort((a, b) => (b.median_secs ?? 0) - (a.median_secs ?? 0))
    .slice(0, limit);
}

/** 문항 번호가 어느 묶음인가. 운영 표에 적히는 것은 이 이름이다 */
export function blockOfItem(itemId: string): string {
  if (itemId.startsWith("G_")) return "열두 영역 격자";
  if (itemId.startsWith("TR_")) return "경험 번역";
  if (itemId.startsWith("IND_")) return "산업";
  if (itemId.startsWith("ROLE_")) return "역할";
  if (itemId.startsWith("TG_")) return "기본 정보";
  if (itemId.startsWith("CJ_") || itemId.startsWith("CO_") || itemId.startsWith("PO_")) {
    return "공통 판단";
  }
  if (/^TD\d\d/.test(itemId)) return "경험 심화";
  return "그 밖";
}

/* ── 소유 보기 넷을 실제로 가르는가 ──────────────────────────────── */

export type OwnershipRow = { label: string; n: number; share: number | null };

const OWN_KO = ["해 본 적 없음", "조건은 주어짐", "내가 수행", "내가 결정"];

/**
 * 보기 넷의 분포.
 *
 * **이번 파일럿에서 가장 중요한 검증 가운데 하나다.** 넷이 실제로 갈리지
 * 않고 한두 칸에 몰리면, 그 보기는 네 단계를 재는 것이 아니라 두 단계를
 * 재고 있는 것이다. 그러면 소유 판정 전체가 흔들린다.
 */
export async function ownershipSpread(wave?: number): Promise<OwnershipRow[]> {
  const rows = await query<{ value_int: number; n: string }>(
    `SELECT r.value_int, count(*)::text AS n
       FROM v3_responses r
       JOIN v3_attempts a ON a.id = r.attempt_id
       JOIN v3_pilot_participants p ON p.user_id = a.user_id
      WHERE r.kind = 'level' AND r.value_int IS NOT NULL
        AND ($1::int IS NULL OR p.wave = $1)
      GROUP BY r.value_int ORDER BY r.value_int`,
    [wave ?? null]);
  const by = new Map(rows.map((r) => [r.value_int, Number(r.n)]));
  const total = [...by.values()].reduce((a, b) => a + b, 0);
  return OWN_KO.map((label, i) => {
    const n = by.get(i) ?? 0;
    /* 바닥이 작으면 비율을 만들지 않는다 */
    return { label, n, share: total >= 20 ? Math.round((n / total) * 1000) / 10 : null };
  });
}

/* ── 운영자가 그날 봐야 하는 응시 ────────────────────────────────── */

export type IssueKind =
  | "RESULT_FAILED" | "INCONSISTENT" | "DURATION_EXTREME"
  | "NO_DOMAIN_OPENED" | "DISAGREE" | "PDF_FAILED";

export const ISSUE_KO: Record<IssueKind, string> = {
  RESULT_FAILED: "결과가 안 만들어졌다",
  INCONSISTENT: "응답이 엇갈린다",
  DURATION_EXTREME: "걸린 시간이 너무 짧거나 길다",
  NO_DOMAIN_OPENED: "깊게 본 영역이 없다",
  DISAGREE: "결과가 안 맞는다고 적었다",
  PDF_FAILED: "종이를 못 뽑았다",
};

/** 너무 짧거나 너무 긴 선. 등급마다 다르다 */
const DURATION: Record<string, [number, number]> = {
  BASIC: [4 * 60, 60 * 60],
  STANDARD: [10 * 60, 120 * 60],
  PRO: [15 * 60, 180 * 60],
};

export type IssueRow = { code: string; attempt_id: string | null; kinds: IssueKind[] };

export async function issues(wave?: number): Promise<IssueRow[]> {
  const rows = await query<{
    code: string; attempt_id: string | null; tier: string | null;
    submitted: boolean; has_snapshot: boolean; quality: string | null;
    secs: number | null; opened_deep: number; disagree: number | null;
    pdf_failed: boolean;
  }>(
    `SELECT p.code, a.id::text AS attempt_id, a.tier,
            (a.submitted_at IS NOT NULL) AS submitted,
            (s.id IS NOT NULL) AS has_snapshot,
            s.response_quality AS quality,
            CASE WHEN a.submitted_at IS NULL THEN NULL
                 ELSE EXTRACT(EPOCH FROM (a.submitted_at - a.started_at))::int END AS secs,
            COALESCE(array_length(a.opened_deep, 1), 0) AS opened_deep,
            (SELECT f.value FROM v3_pilot_feedback f
              WHERE f.attempt_id = a.id AND f.item_code = 'V13_DISAGREE') AS disagree,
            EXISTS (SELECT 1 FROM v3_pilot_events e
                     WHERE e.attempt_id = a.id AND e.kind = 'pdf_fail') AS pdf_failed
       FROM v3_pilot_participants p
       LEFT JOIN LATERAL (
         SELECT * FROM v3_attempts x WHERE x.user_id = p.user_id
          ORDER BY x.started_at DESC LIMIT 1) a ON true
       LEFT JOIN LATERAL (
         SELECT * FROM v3_snapshots y WHERE y.attempt_id = a.id
          ORDER BY y.id DESC LIMIT 1) s ON true
      WHERE ($1::int IS NULL OR p.wave = $1)
      ORDER BY p.code`,
    [wave ?? null]);

  const out: IssueRow[] = [];
  for (const r of rows) {
    const kinds: IssueKind[] = [];
    if (r.submitted && !r.has_snapshot) kinds.push("RESULT_FAILED");
    if (r.quality === "INCONSISTENT") kinds.push("INCONSISTENT");
    const band = DURATION[r.tier ?? "BASIC"] ?? DURATION.BASIC;
    if (r.secs !== null && (r.secs < band[0] || r.secs > band[1])) {
      kinds.push("DURATION_EXTREME");
    }
    if (r.submitted && r.opened_deep === 0 && r.tier !== "BASIC") {
      kinds.push("NO_DOMAIN_OPENED");
    }
    if ((r.disagree ?? 0) >= 4) kinds.push("DISAGREE");
    if (r.pdf_failed) kinds.push("PDF_FAILED");
    if (kinds.length) out.push({ code: r.code, attempt_id: r.attempt_id, kinds });
  }
  return out;
}

/* ── 의견을 지표마다 따로 ────────────────────────────────────────── */

export type MetricRow = { code: string; label: string; topic: string } & Mean;

/** 지표마다 따로 낸다. **한 줄로 합치지 않는다** */
export async function metrics(wave?: number): Promise<MetricRow[]> {
  const rows = await query<{ code: string; ko: string; topic: string; value: number }>(
    `SELECT i.code, i.ko, i.topic, f.value
       FROM v3_pilot_feedback f
       JOIN v3_pilot_items i ON i.code = f.item_code
       JOIN v3_attempts a ON a.id = f.attempt_id
       JOIN v3_pilot_participants p ON p.user_id = a.user_id
      WHERE f.value IS NOT NULL AND ($1::int IS NULL OR p.wave = $1)`,
    [wave ?? null]);
  const by = new Map<string, { ko: string; topic: string; xs: number[] }>();
  for (const r of rows) {
    const cur = by.get(r.code) ?? { ko: r.ko, topic: r.topic, xs: [] };
    cur.xs.push(r.value);
    by.set(r.code, cur);
  }
  return [...by].map(([code, v]) => ({
    code, label: v.ko, topic: v.topic, ...mean(v.xs),
  })).sort((a, b) => a.code.localeCompare(b.code));
}

/** 고른 보기의 분포(첫 화면에서 먼저 본 곳 · 가격 인식) */
export async function choiceSpread(
  itemCode: string, wave?: number,
): Promise<{ value: string; n: number }[]> {
  const rows = await query<{ choice: string; n: string }>(
    `SELECT f.choice, count(*)::text AS n
       FROM v3_pilot_feedback f
       JOIN v3_attempts a ON a.id = f.attempt_id
       JOIN v3_pilot_participants p ON p.user_id = a.user_id
      WHERE f.item_code = $1 AND f.choice IS NOT NULL
        AND ($2::int IS NULL OR p.wave = $2)
      GROUP BY f.choice ORDER BY count(*) DESC`,
    [itemCode, wave ?? null]);
  return rows.map((r) => ({ value: r.choice, n: Number(r.n) }));
}

/**
 * 응시마다 적어 둔 판본. **사람 말로 적는 이름표도 여기 둔다.**
 *
 * 열쇠를 그대로 늘어놓으면 운영자가 어느 줄이 결과에 닿는지 모른다.
 * 결과에 닿는 것은 셋뿐이고(문항 은행 · 채점 · 결과 모델) 나머지는
 * 읽은 화면과 문장을 되짚는 자리다.
 */
export const VERSION_KO: Record<string, string> = {
  core_version: "전공 Core",
  item_bank_version: "문항 은행 (결과에 닿는다)",
  scoring_version: "판단 규칙 (결과에 닿는다)",
  result_model_version: "결과 모델 (결과에 닿는다)",
  assessment_ui_version: "검사 화면",
  assessment_copy_version: "검사 문장",
  result_copy_version: "결과지 문장",
  result_ui_version: "결과지 화면",
  workspace_ui_version: "작업공간 화면",
  industry_pack_version: "산업팩",
  role_pack_version: "역할팩",
  region_layer_version: "지역 층",
};

/** 결과에 닿는 판본. **wave 안에서 이 셋이 섞이면 분석이 깨진다** */
export const VERSION_DECIDES = [
  "item_bank_version", "scoring_version", "result_model_version",
] as const;

export type MixedVersion = { key: string; label: string; values: string[] };

/**
 * 이 wave 안에서 **판본이 섞였는가.**
 *
 * 섞이면 앞사람과 뒷사람의 결과를 같은 표에서 읽을 수 없다. 그래서
 * Wave 가 끝날 때까지 결과에 닿는 셋을 올리지 않기로 했는데, **적어 둔
 * 규칙은 지켜지지 않는다.** 운영 표가 그 사실을 적는다.
 *
 * 결과에 닿지 않는 판본(화면 · 문장)이 섞인 것도 함께 내놓는다. 그쪽은
 * 막을 일이 아니고 **읽을 때 알아야 하는 일**이다: 문장을 고친 뒤의
 * 사람이 다른 글을 읽었다.
 */
export async function mixedVersions(wave?: number): Promise<MixedVersion[]> {
  const rows = await query<{ j: string }>(
    `SELECT s.module_versions::text AS j
       FROM v3_snapshots s
       JOIN v3_attempts a ON a.id = s.attempt_id
       JOIN v3_pilot_participants p ON p.user_id = a.user_id
      WHERE ($1::int IS NULL OR p.wave = $1)`,
    [wave ?? null]).catch(() => []);
  const by = new Map<string, Set<string>>();
  for (const r of rows) {
    let mv: Record<string, unknown> = {};
    try { mv = JSON.parse(r.j) as Record<string, unknown>; } catch { continue; }
    for (const [k, v] of Object.entries(mv)) {
      /* **비어 있는 것을 값으로 세지 않는다.** 산업을 고른 사람과 안
         고른 사람이 섞인 것은 섞인 판본이 아니다 */
      if (typeof v !== "string" || !v) continue;
      const set = by.get(k) ?? new Set<string>();
      set.add(v);
      by.set(k, set);
    }
  }
  return [...by]
    .filter(([, set]) => set.size > 1)
    .map(([key, set]) => ({
      key, label: VERSION_KO[key] ?? key, values: [...set].sort(),
    }))
    .sort((a, b) => Number(VERSION_DECIDES.includes(b.key as "scoring_version"))
      - Number(VERSION_DECIDES.includes(a.key as "scoring_version")));
}
