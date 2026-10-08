/**
 * 파일럿 퍼널. **`career_events` 와 섞지 않는다.**
 *
 * 사건 표가 셋이고 묻는 것이 다르다. `analytics_events` 는 어디서 멈췄는가를
 * 묻고, `outbox` 는 메일이 나갔는가를 묻고, `career_events` 는 무엇을 다시
 * 계산해야 하는가를 묻는다. 퍼널에 재계산을 섞으면 전환율이 거짓이 되고,
 * 재계산 대기열에 퍼널을 섞으면 다시 계산해야 할 일이 조회수에 묻힌다.
 *
 * **이름에 꼬리표를 붙인다.** `v3_pilot.` 으로 시작하는 것만 이 파일럿의
 * 것이고, 상용 퍼널(`pricing_viewed` · `purchase`)과 한 표에 살면서도
 * 집계에서 섞이지 않는다.
 *
 * **적는 것을 좁게 둔다.** 참가자 가명과 wave 와 등급까지다. IP 도
 * User-Agent 도 화면 해상도도 적지 않는다: 그 셋이 붙으면 가명이
 * 가명이 아니게 된다.
 */
import { query } from "@/lib/db";

/**
 * 파일럿이 세는 걸음.
 *
 * **등급마다 완료를 따로 센다.** 하나로 두면 BASIC 을 끝낸 사람과 PRO 를
 * 끝낸 사람이 한 칸에 들어가고, 그러면 등급이 올라갈수록 끝까지 가는
 * 사람이 줄어드는지를 볼 수 없다.
 */
export const FUNNEL = [
  "pilot_link_opened",
  "assessment_started",
  "basic_completed",
  "standard_completed",
  "pro_completed",
  "result_opened",
  "domain_detail_viewed",
  "evidence_viewed",
  "action_viewed",
  "action_saved",
  "pdf_opened",
  "feedback_started",
  "feedback_submitted",
] as const;

export type FunnelStep = typeof FUNNEL[number];

const PREFIX = "v3_pilot.";

/** 결과지 절 이름 → 퍼널 걸음. 절이 늘면 여기 한 줄이 는다 */
const SECTION_STEP: Record<string, FunnelStep> = {
  focus: "domain_detail_viewed",
  evidence: "evidence_viewed",
  plan: "action_viewed",
};

export function stepForSection(section: string): FunnelStep | null {
  return SECTION_STEP[section] ?? null;
}

export type Who = {
  userId?: string | null;
  participant?: string | null;
  wave?: number | null;
  tier?: string | null;
  attemptId?: string | null;
};

/**
 * 걸음 하나를 적는다.
 *
 * **사람으로 센다, 사건으로 세지 않는다.** 결과지를 다섯 번 새로 고친
 * 사람이 다섯 명으로 세어지면 전환율이 바닥으로 보인다. 그래서 같은
 * 응시의 같은 걸음은 한 번만 적는다. 다시 눌렀다는 것은 이 파일럿이
 * 묻는 물음이 아니다.
 *
 * 적지 못해도 화면은 멈추지 않는다. 재는 일이 읽는 일보다 뒤다.
 */
export async function mark(step: FunnelStep, who: Who): Promise<void> {
  const name = PREFIX + step;
  try {
    if (who.attemptId) {
      const had = await query<{ id: string }>(
        `SELECT id FROM analytics_events
          WHERE name = $1 AND props->>'attempt' = $2 LIMIT 1`,
        [name, who.attemptId]);
      if (had.length) return;
    }
    await query(
      `INSERT INTO analytics_events (user_id, name, props) VALUES ($1,$2,$3)`,
      [who.userId ?? null, name, JSON.stringify({
        attempt: who.attemptId ?? null,
        participant: who.participant ?? null,
        wave: who.wave ?? null,
        tier: who.tier ?? null,
      })]);
  } catch {
    /* 퍼널이 응시를 막지 않는다 */
  }
}

/** 등급을 끝낸 걸음 이름 */
export function completedStep(tier: string): FunnelStep {
  if (tier === "PRO") return "pro_completed";
  if (tier === "STANDARD") return "standard_completed";
  return "basic_completed";
}

export type FunnelRow = { step: FunnelStep; people: number };

/**
 * wave 별 퍼널.
 *
 * **사람 수로 센다.** 같은 응시의 같은 걸음이 한 줄이므로 줄 수가 곧 사람
 * 수다. 비율을 여기서 만들지 않는다: 바닥이 0 인데 0% 를 찍으면 거짓말이고,
 * 다섯 명이 안 되는 칸은 비율을 내지 않는 규칙이 분석 쪽에 있다.
 */
export async function funnelByWave(wave?: number): Promise<FunnelRow[]> {
  const rows = await query<{ name: string; people: string }>(
    `SELECT name, count(DISTINCT COALESCE(props->>'attempt', id::text)) AS people
       FROM analytics_events
      WHERE name LIKE $1
        AND ($2::int IS NULL OR (props->>'wave')::int = $2)
      GROUP BY name`,
    [`${PREFIX}%`, wave ?? null]);
  const by = new Map(rows.map((r) => [r.name.slice(PREFIX.length), Number(r.people)]));
  return FUNNEL.map((step) => ({ step, people: by.get(step) ?? 0 }));
}
