import { query, queryOne } from "@/lib/db";
import { PUSH_POLICY_FROM, pushKeys } from "@/lib/push";

/**
 * 알림을 켠 사람 수(2026-10-31 사업주 요청). 스토어 앱을 만들지는 이 숫자를
 * 보고 정한다: 아이폰은 `홈 화면에 추가` 를 해야 알림을 켤 수 있어서, 애플 쪽이
 * 구글 쪽보다 확연히 적으면 앱으로 감쌀 때가 된 것이다.
 *
 * **새로 모으지 않는다.** 개인정보처리방침 1-6절이 "기기 이름, 브라우저 종류는
 * 알림 때문에 따로 수집하지 않는다" 고 약속했다. 그래서 이미 받아 둔 알림 주소의
 * **앞부분(어느 회사의 알림 서버인가)** 으로만 가른다. 애플 알림 서버는 아이폰 ·
 * 아이패드 · 맥 사파리를, 구글 알림 서버는 안드로이드와 크롬을 함께 받으므로
 * 화면에도 그렇게 적는다. 아이폰만 따로 세는 척하지 않는다.
 *
 * **사람으로 센다.** 한 사람이 휴대폰과 PC 에서 켜면 기기는 둘이고 사람은
 * 하나다. 시연 계정(`users.is_demo`)은 빼고 센다.
 */

export type PushService = "apple" | "google" | "mozilla" | "microsoft" | "other";

export const SERVICE_LABEL: Record<PushService, { name: string; note: string }> = {
  apple: { name: "애플 알림", note: "아이폰 · 아이패드 · 맥 사파리" },
  google: { name: "구글 알림", note: "안드로이드 · 크롬(PC 포함)" },
  mozilla: { name: "모질라 알림", note: "파이어폭스" },
  microsoft: { name: "마이크로소프트 알림", note: "엣지(윈도)" },
  other: { name: "그 밖", note: "위에 없는 알림 서버" },
};

const SERVICE_SQL = `CASE
  WHEN s.endpoint LIKE 'https://web.push.apple.com/%' THEN 'apple'
  WHEN s.endpoint LIKE 'https://fcm.googleapis.com/%'
    OR s.endpoint LIKE 'https://android.googleapis.com/%' THEN 'google'
  WHEN s.endpoint LIKE 'https://%.mozilla.com/%' THEN 'mozilla'
  WHEN s.endpoint LIKE 'https://%.notify.windows.com/%' THEN 'microsoft'
  ELSE 'other' END`;

export type PushStats = {
  /** 지금 알림이 실제로 나가는가와 아니면 그 까닭 */
  state: { on: boolean; why: string };
  people: number;
  devices: number;
  /** 개인 회원(시연 빼고) 가운데 몇 명인가 */
  members: number;
  new7: number;
  failing: number;
  byService: { service: PushService; people: number; devices: number }[];
  weeks: { week: string; apple: number; google: number; other: number }[];
  /** 표가 아직 없는 DB 등으로 못 읽었을 때 */
  error: string | null;
};

export function pushState(now = new Date()): { on: boolean; why: string } {
  if (now < PUSH_POLICY_FROM) return { on: false, why: "개인정보처리방침 적용일(11월 2일) 전이라 아직 꺼져 있습니다." };
  if (!pushKeys(now)) {
    return { on: false, why: "Railway 변수에 알림 열쇠가 없습니다. Shell 에서 npm run push:keys 를 돌려 나온 두 줄을 Variables 에 넣어 주세요." };
  }
  return { on: true, why: "켜져 있습니다. 매주 할 일과 공고 마감 알림이 나갑니다." };
}

export async function pushStats(): Promise<PushStats> {
  const state = pushState();
  const empty: PushStats = {
    state, people: 0, devices: 0, members: 0, new7: 0, failing: 0, byService: [], weeks: [], error: null,
  };
  try {
    const live = `FROM push_subscriptions s JOIN users u ON u.id = s.user_id WHERE NOT u.is_demo`;
    const [tot, members, svc, weeks] = await Promise.all([
      queryOne<{ people: string; devices: string; new7: string; failing: string }>(
        `SELECT count(DISTINCT s.user_id)::text AS people, count(*)::text AS devices,
                count(DISTINCT s.user_id) FILTER (WHERE s.created_at > now() - interval '7 days')::text AS new7,
                count(*) FILTER (WHERE s.fail_count > 0)::text AS failing
           ${live}`, []),
      queryOne<{ n: string }>(
        `SELECT count(*)::text AS n FROM users u
          WHERE NOT u.is_demo AND u.status = 'active'
            AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = u.id AND m.role <> 'student')`, []),
      query<{ service: PushService; people: string; devices: string }>(
        `SELECT ${SERVICE_SQL} AS service, count(DISTINCT s.user_id)::text AS people, count(*)::text AS devices
           ${live} GROUP BY 1 ORDER BY 2 DESC`, []),
      query<{ week: string; service: PushService; people: string }>(
        `SELECT to_char(date_trunc('week', s.created_at), 'MM-DD') AS week, ${SERVICE_SQL} AS service,
                count(DISTINCT s.user_id)::text AS people
           ${live} AND s.created_at > now() - interval '8 weeks'
          GROUP BY date_trunc('week', s.created_at), 2 ORDER BY date_trunc('week', s.created_at) DESC`, []),
    ]);
    const wk = new Map<string, { week: string; apple: number; google: number; other: number }>();
    for (const r of weeks) {
      const row = wk.get(r.week) ?? { week: r.week, apple: 0, google: 0, other: 0 };
      const k = r.service === "apple" || r.service === "google" ? r.service : "other";
      row[k] += Number(r.people);
      wk.set(r.week, row);
    }
    return {
      state,
      people: Number(tot?.people ?? 0),
      devices: Number(tot?.devices ?? 0),
      members: Number(members?.n ?? 0),
      new7: Number(tot?.new7 ?? 0),
      failing: Number(tot?.failing ?? 0),
      byService: svc.map((r) => ({ service: r.service, people: Number(r.people), devices: Number(r.devices) })),
      weeks: [...wk.values()],
      error: null,
    };
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : String(e) };
  }
}
