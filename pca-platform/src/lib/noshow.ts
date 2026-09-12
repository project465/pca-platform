import { query, queryOne, tx } from "@/lib/db";
import { refundFor } from "@/lib/billing";
import { payoutSettings } from "@/lib/refund";
import { enqueue, formatSlot, noShowReported, noShowResolved } from "@/lib/notify";

export class NoShowError extends Error {}

/**
 * 노쇼 — 약속한 시각에 한쪽이 나타나지 않은 경우.
 *
 * 취소와 다르게 다루는 이유는 알게 되는 시점이 다르기 때문이다. 취소는 미리 알려서
 * 시간대가 풀리지만, 노쇼는 상대가 그 자리에 앉아 기다린 뒤에 안다.
 *
 * 신고가 곧바로 환불이 되지는 않는다. 한쪽 말만 듣고 돈이 움직이면 안 되기 때문이다.
 * 대신 판정할 시간을 벌려고 정산을 유예한다 — 세션이 끝나고 hold_hours 가 지나야
 * 정산 건이 잡히고, 그 사이가 신고 기간이다. 이미 나간 돈은 되돌릴 곳이 없다.
 *
 * 판정이 실제로 돈을 바꾸는 경우는 하나다.
 *   멘토 노쇼 인정  →  신청자 전액 환불, 멘토 정산 없음
 * 신청자 노쇼는 인정하든 기각하든 멘토가 그 시간을 비웠으므로 정산은 그대로다.
 * 그래도 따로 받는 이유는 누가 나오지 않았는지가 기록으로 남아야 하기 때문이다.
 */

export type ReportRow = {
  id: string;
  request_id: string;
  against: string;
  note: string;
  resolution: string | null;
  resolve_note: string | null;
  created_at: string;
  starts_at: string;
  minutes: number;
  handle: string;
  alias: string;
  mentor_real_name: string;
  applicant_name: string;
  reporter_name: string;
  amount: number | null;
};

/** 신고 가능 시각 — 세션이 시작된 뒤부터, 끝나고 hold_hours 가 지나기 전까지 */
export async function reportWindow(): Promise<number> {
  const s = await payoutSettings();
  return Number(s.hold_hours);
}

/**
 * 노쇼를 신고한다. 신청자도 멘토도 부를 수 있고, 자기 반대편을 지목한다.
 * 신고가 들어오면 신청은 no_show 로 바뀌어 정산 대상에서 빠진다.
 */
export async function reportNoShow(input: {
  requestId: string;
  userId: string;
  note: string;
}): Promise<void> {
  const note = input.note.trim();
  if (note.length < 5) throw new NoShowError("무슨 일이 있었는지 한 줄이라도 적어주세요.");
  if (note.length > 600) throw new NoShowError("600자 안으로 적어주세요.");

  const hold = await reportWindow();

  const found = await queryOne<{
    id: string;
    status: string;
    starts_at: string;
    minutes: number;
    applicant_id: string;
    mentor_user_id: string;
    handle: string;
    alias: string;
    degree: string;
    field_track: string;
    career_path: string;
    started: boolean;
    over: boolean;
  }>(
    `SELECT r.id, r.status, s.starts_at::text, m.session_minutes AS minutes,
            r.applicant_id, m.user_id AS mentor_user_id,
            m.handle, m.alias, m.degree, m.field_track, m.career_path,
            (s.starts_at <= now()) AS started,
            (s.starts_at + (m.session_minutes || ' minutes')::interval
               + ($3 || ' hours')::interval < now()) AS over
       FROM mentoring_requests r
       JOIN mentor_slots s ON s.id = r.slot_id
       JOIN mentors m      ON m.id = r.mentor_id
      WHERE r.id = $1 AND (r.applicant_id = $2 OR m.user_id = $2)`,
    [input.requestId, input.userId, hold],
  );
  if (!found) throw new NoShowError("신청을 찾을 수 없습니다.");
  if (!["accepted", "completed"].includes(found.status)) {
    throw new NoShowError("확정된 멘토링만 신고할 수 있습니다.");
  }
  if (!found.started) {
    throw new NoShowError("아직 시작 시각이 되지 않았습니다. 미리 아셨다면 취소해주세요.");
  }
  if (found.over) throw new NoShowError(`신고 기간(세션 종료 후 ${hold}시간)이 지났습니다.`);

  const byApplicant = found.applicant_id === input.userId;
  const against = byApplicant ? "mentor" : "applicant";
  const otherId = byApplicant ? found.mentor_user_id : found.applicant_id;

  await tx(async (c) => {
    const made = await c.query<{ id: string }>(
      `INSERT INTO no_show_reports (request_id, reported_by, against, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (request_id) DO NOTHING
       RETURNING id`,
      [input.requestId, input.userId, against, note],
    );
    if (made.rows.length === 0) {
      throw new NoShowError("이미 신고가 접수된 세션입니다.");
    }

    // 판정 전까지 정산 대상에서 뺀다. 기각되면 completed 로 돌아간다
    await c.query(`UPDATE mentoring_requests SET status = 'no_show' WHERE id = $1`, [
      input.requestId,
    ]);

    const other = await c.query<{ email: string | null }>(
      `SELECT email FROM users WHERE id = $1`,
      [otherId],
    );
    await enqueue(c, {
      requestId: input.requestId,
      recipientId: otherId,
      recipientEmail: other.rows[0]?.email ?? null,
      kind: "no_show_reported",
      ...noShowReported({
        startsAt: new Date(found.starts_at),
        against,
        hold,
      }),
    });
  });
}

/**
 * 운영사 판정. 인정이든 기각이든 여기서 돈이 정해진다.
 * 멘토 노쇼를 인정하면 전액 환불한다 — 신청자 잘못이 아니므로 환불 규칙을 타지 않는다.
 */
export async function resolveNoShow(input: {
  reportId: string;
  adminId: string;
  accept: boolean;
  note: string | null;
}): Promise<void> {
  const r = await queryOne<{
    id: string;
    request_id: string;
    against: string;
    resolution: string | null;
    applicant_id: string;
    mentor_user_id: string;
    starts_at: string;
  }>(
    `SELECT n.id, n.request_id, n.against, n.resolution,
            q.applicant_id, m.user_id AS mentor_user_id, s.starts_at::text
       FROM no_show_reports n
       JOIN mentoring_requests q ON q.id = n.request_id
       JOIN mentors m      ON m.id = q.mentor_id
       JOIN mentor_slots s ON s.id = q.slot_id
      WHERE n.id = $1`,
    [input.reportId],
  );
  if (!r) throw new NoShowError("신고를 찾을 수 없습니다.");
  if (r.resolution) throw new NoShowError("이미 판정한 신고입니다.");

  const resolution = input.accept ? "accepted" : "rejected";
  const refundApplicant = input.accept && r.against === "mentor";

  await tx(async (c) => {
    const done = await c.query<{ id: string }>(
      `UPDATE no_show_reports
          SET resolution = $2, resolve_note = $3, resolved_at = now(), resolved_by = $4
        WHERE id = $1 AND resolution IS NULL
        RETURNING id`,
      [input.reportId, resolution, input.note?.slice(0, 600) ?? null, input.adminId],
    );
    if (done.rows.length === 0) throw new NoShowError("이미 판정한 신고입니다.");

    // 기각이면 세션은 열렸던 것으로 본다. 후기도 쓸 수 있고 정산도 잡힌다
    if (!input.accept) {
      await c.query(
        `UPDATE mentoring_requests SET status = 'completed' WHERE id = $1 AND status = 'no_show'`,
        [r.request_id],
      );
    }

    for (const [userId, side] of [
      [r.applicant_id, "applicant"],
      [r.mentor_user_id, "mentor"],
    ] as const) {
      const u = await c.query<{ email: string | null }>(
        `SELECT email FROM users WHERE id = $1`,
        [userId],
      );
      await enqueue(c, {
        requestId: r.request_id,
        recipientId: userId,
        recipientEmail: u.rows[0]?.email ?? null,
        kind: input.accept ? "no_show_accepted" : "no_show_rejected",
        ...noShowResolved({
          startsAt: new Date(r.starts_at),
          against: r.against as "mentor" | "applicant",
          accepted: input.accept,
          toMentor: side === "mentor",
        }),
      });
    }
  });

  // 환불은 DB 가 정리된 뒤에 한다. 실패해도 판정 자체는 이미 성립했다
  if (refundApplicant) {
    await refundFor(r.request_id, "멘토 노쇼 인정");
  }
}

/** 운영사 화면. 판정을 기다리는 것이 위로 온다 */
export async function reportList(open = true): Promise<ReportRow[]> {
  return query<ReportRow>(
    `SELECT n.id, n.request_id, n.against, n.note, n.resolution, n.resolve_note,
            to_char(n.created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS created_at,
            to_char(s.starts_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS starts_at,
            m.session_minutes AS minutes,
            m.handle, m.alias, mu.display_name AS mentor_real_name,
            au.display_name AS applicant_name,
            ru.display_name AS reporter_name,
            p.amount
       FROM no_show_reports n
       JOIN mentoring_requests q ON q.id = n.request_id
       JOIN mentor_slots s ON s.id = q.slot_id
       JOIN mentors m      ON m.id = q.mentor_id
       JOIN users mu       ON mu.id = m.user_id
       JOIN users au       ON au.id = q.applicant_id
       JOIN users ru       ON ru.id = n.reported_by
       LEFT JOIN payments p ON p.request_id = q.id
      WHERE ($1::bool IS FALSE OR n.resolution IS NULL)
      ORDER BY n.resolution IS NULL DESC, n.created_at DESC
      LIMIT 200`,
    [open],
  );
}

export async function openReportCount(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM no_show_reports WHERE resolution IS NULL`,
  );
  return row?.n ?? 0;
}

/** 화면에 신고 버튼을 띄울지, 이미 신고된 건인지 알려준다 */
export type NoShowState = {
  canReport: boolean;
  reported: boolean;
  resolution: string | null;
  /** 신고 기간이 끝나는 시각 (사람이 읽는 표기) */
  until: string | null;
};

export async function noShowStates(
  requestIds: string[],
): Promise<Map<string, NoShowState>> {
  const out = new Map<string, NoShowState>();
  if (requestIds.length === 0) return out;
  const hold = await reportWindow();

  const rows = await query<{
    request_id: string;
    status: string;
    resolution: string | null;
    reported: boolean;
    started: boolean;
    over: boolean;
    until: string;
  }>(
    `SELECT r.id AS request_id, r.status, n.resolution,
            (n.id IS NOT NULL) AS reported,
            (s.starts_at <= now()) AS started,
            (s.starts_at + (m.session_minutes || ' minutes')::interval
               + ($2 || ' hours')::interval < now()) AS over,
            (s.starts_at + (m.session_minutes || ' minutes')::interval
               + ($2 || ' hours')::interval)::text AS until
       FROM mentoring_requests r
       JOIN mentor_slots s ON s.id = r.slot_id
       JOIN mentors m      ON m.id = r.mentor_id
       LEFT JOIN no_show_reports n ON n.request_id = r.id
      WHERE r.id = ANY($1::bigint[])`,
    [requestIds, hold],
  );

  for (const r of rows) {
    out.set(r.request_id, {
      canReport:
        !r.reported &&
        r.started &&
        !r.over &&
        ["accepted", "completed"].includes(r.status),
      reported: r.reported,
      resolution: r.resolution,
      until: r.over ? null : formatSlot(new Date(r.until)),
    });
  }
  return out;
}
