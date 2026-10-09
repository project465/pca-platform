/**
 * 작업공간이 실제로 쓰이는지 세는 자리.
 *
 * **표를 새로 만들지 않았다.** `analytics_events` 가 이미 있고 퍼널이
 * 그것을 쓴다(`src/lib/funnel.ts`). 표를 하나 더 만들면 같은 질문에
 * 답하는 자리가 둘이 되고, 그중 하나는 반드시 뒤처진다.
 *
 * **퍼널 걸음과 섞지 않는다.** 저쪽이 묻는 것은 `방문이 결제가 되는가`
 * 이고 여기가 묻는 것은 `결과를 받은 사람이 다시 들어오는가` 다. 한
 * 목록에 담으면 전환율의 분모가 흔들린다(`career_events` 를 따로 둔 것과
 * 같은 까닭이다).
 *
 * **여덟 개뿐이다.** 아무 문자열이나 적을 수 있게 두면 화면마다
 * `opened` · `open` · `view` 가 생기고, 그러면 세어 놓은 수가 거짓이
 * 된다.
 *
 * **침습적인 수집을 하지 않는다.** 화면 녹화도 키 입력도 마우스 자취도
 * 없다. 적히는 것은 `무슨 일이 일어났는가` 와 `등급` 과 `어느 쪽에서
 * 왔는가` 까지이고, 응시자가 적은 글은 한 글자도 담지 않는다.
 */
import { query } from "../db";

export const WORKSPACE_EVENTS = [
  "workspace_opened",            // 내 CareerMatri 홈을 열었다
  "assessment_continue_clicked", // 풀던 검사를 이어하기 눌렀다
  "result_opened",               // 검사 당시 결과를 열었다
  "experience_add_started",      // 경험 추가 화면을 열었다
  "experience_added",            // 경험 한 줄이 저장됐다
  "current_state_updated",       // 새 경험을 지금 상태에 반영했다
  "action_opened",               // 다음 할 일을 열었다
  "action_saved",                // 할 일을 가져오거나 상태를 바꿨다
] as const;

export type WorkspaceEvent = (typeof WORKSPACE_EVENTS)[number];

/**
 * 같이 적어도 되는 것. **사람을 좁히는 값과 자유입력은 없다.**
 *
 * `from` 은 어느 쪽에서 눌렀는가이고 주소가 아니라 **적어 둔 이름**이다.
 * 주소를 담으면 거기에 응시 번호가 섞여 들어온다.
 */
export type WorkspaceProps = {
  tier?: string;
  stage?: string;
  from?: string;
  /** 센 것. 경험 수나 할 일 수처럼 **자료가 아닌 수** */
  n?: number;
};

const ALLOWED = ["tier", "stage", "from", "n"] as const;

/**
 * 한 줄을 적는다. **던지지 않는다.**
 *
 * 계측이 저장이나 반영을 되돌리면 안 된다. 못 적었으면 그 한 줄이 없는
 * 것으로 끝난다(`track()` 과 `enqueue()` 와 같은 규칙).
 */
export async function mark(
  name: WorkspaceEvent,
  userId: string | null,
  props: WorkspaceProps = {},
): Promise<void> {
  const out: Record<string, string | number> = {};
  for (const k of ALLOWED) {
    const v = props[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.trunc(v);
    /* **길이를 자른다.** 자유입력이 실수로 흘러들어도 한 줄을 넘지 못한다 */
    else if (typeof v === "string" && v) out[k] = v.slice(0, 60);
  }
  try {
    await query(
      `INSERT INTO analytics_events (user_id, name, props)
       VALUES ($1,$2,$3::jsonb)`,
      [userId, name, JSON.stringify(out)],
    );
  } catch {
    /* 비워 둔다 */
  }
}

export type WorkspaceCount = { name: WorkspaceEvent; people: number; events: number };

/**
 * 며칠 동안 몇 사람이 그 일을 했는가.
 *
 * **사람으로 센다.** 홈을 하루에 다섯 번 연 사람이 다섯으로 세어지면
 * `다시 들어오는가` 에 답할 수 없다. 사건 수도 함께 내놓는 까닭은 **둘의
 * 비가 곧 다시 들어온 횟수**이기 때문이다.
 */
export async function workspaceCounts(days = 30): Promise<WorkspaceCount[]> {
  const rows = await query<{ name: string; people: number; events: number }>(
    `SELECT name,
            count(DISTINCT e.user_id)::int AS people,
            count(*)::int                  AS events
       FROM analytics_events e
      WHERE e.created_at > now() - ($1 || ' days')::interval
        AND e.name = ANY($2::text[])
        -- 시연 자료를 지표에 섞지 않는다
        AND NOT EXISTS (
          SELECT 1 FROM users du WHERE du.id = e.user_id AND du.is_demo)
      GROUP BY name`,
    [String(days), WORKSPACE_EVENTS as unknown as string[]],
  ).catch(() => []);
  const by = new Map(rows.map((r) => [r.name, r]));
  return WORKSPACE_EVENTS.map((name) => ({
    name,
    people: by.get(name)?.people ?? 0,
    events: by.get(name)?.events ?? 0,
  }));
}

/** 사람이 읽는 이름. **운영 화면에 열쇠를 그대로 적지 않는다** */
export const WORKSPACE_EVENT_KO: Record<WorkspaceEvent, string> = {
  workspace_opened: "작업공간 열기",
  assessment_continue_clicked: "검사 이어하기",
  result_opened: "검사 당시 결과 열기",
  experience_add_started: "경험 추가 시작",
  experience_added: "경험 저장",
  current_state_updated: "지금 상태에 반영",
  action_opened: "다음 할 일 열기",
  action_saved: "할 일 저장",
};
