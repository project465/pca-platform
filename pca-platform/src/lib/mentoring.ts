import { query, queryOne, tx } from "@/lib/db";
import { mentorTitle } from "@/lib/anon";
import {
  acceptedToApplicant,
  acceptedToMentor,
  cancelledNotice,
  declinedToApplicant,
  enqueue,
  expiredToApplicant,
  reminder,
  reminderTimes,
  type MeetingBrief,
} from "@/lib/notify";
import { createMeeting, deleteMeeting } from "@/lib/zoom";
import { createPayment, isFreeUser, priceOf, refundFor } from "@/lib/billing";

/**
 * 현멘 도메인 로직.
 *
 * 화면(page/actions)에는 SQL 을 두지 않고 여기로 모았다. 예약이 성립하는 규칙이
 * 여러 화면에 흩어지면, 한 곳만 고치고 다른 곳을 빼먹는다.
 *
 * 지켜야 하는 것
 *  - 한 시간대에 살아있는 신청은 하나뿐이다 (DB 부분 UNIQUE 인덱스가 최종 방어선)
 *  - 승낙은 줌 회의 생성과 알림 적재까지 끝나야 완료다. 중간에 실패하면 되돌린다
 *  - 신청자 화면에 멘토 실명·이메일·host_url 이 나가지 않는다
 */

export type MentorRow = {
  id: string;
  user_id: string;
  handle: string;
  alias: string;
  years: number;
  degree: string;
  field_track: string;
  career_path: string;
  company_scale: string;
  region: string | null;
  headline: string;
  bio: string | null;
  session_minutes: number;
  status: string;
};

export type GalleryCard = MentorRow & {
  open_slots: number;
  next_slot: string | null;
  job_ids: string[];
  /** 끝난 세션 수. 카드에 '누적 n회'로 뜬다 */
  done_count: number;
  review_count: number;
  /** 후기 평균. 후기가 없으면 null — 0.0 으로 보여 주면 나쁜 평가처럼 읽힌다 */
  rating_avg: string | null;
};

export async function mentorForUser(userId: string): Promise<MentorRow | null> {
  return queryOne<MentorRow>(
    `SELECT id, user_id, handle, alias, years, degree, field_track, career_path,
            company_scale, region, headline, bio, session_minutes, status
       FROM mentors WHERE user_id = $1`,
    [userId],
  );
}

export async function mentorByHandle(handle: string): Promise<MentorRow | null> {
  return queryOne<MentorRow>(
    `SELECT id, user_id, handle, alias, years, degree, field_track, career_path,
            company_scale, region, headline, bio, session_minutes, status
       FROM mentors WHERE handle = $1`,
    [handle],
  );
}

/**
 * 갤러리. 상품 목록처럼 보이는 화면이므로 "지금 신청할 수 있는가"가 카드마다
 * 보여야 한다. 열린 시간대 수와 가장 가까운 시간대를 같이 읽는다.
 */
export async function listGallery(filter: {
  jobId?: string;
  degree?: string;
  path?: string;
  track?: string;
}): Promise<GalleryCard[]> {
  const rows = await query<GalleryCard>(
    `SELECT m.id, m.user_id, m.handle, m.alias, m.years,
            m.degree, m.field_track, m.career_path, m.company_scale, m.region,
            m.headline, m.bio, m.session_minutes, m.status,
            (SELECT count(*) FROM mentor_slots s
              WHERE s.mentor_id = m.id AND s.status = 'open'
                AND s.starts_at > now() + interval '1 hour')::int AS open_slots,
            (SELECT min(s.starts_at) FROM mentor_slots s
              WHERE s.mentor_id = m.id AND s.status = 'open'
                AND s.starts_at > now() + interval '1 hour') AS next_slot,
            COALESCE(
              (SELECT array_agg(mjc.job_id::text ORDER BY mjc.job_id)
                 FROM mentor_job_clusters mjc WHERE mjc.mentor_id = m.id),
              '{}'
            ) AS job_ids,
            (SELECT count(*) FROM mentoring_requests dr
              WHERE dr.mentor_id = m.id AND dr.status = 'completed')::int AS done_count,
            (SELECT count(*) FROM mentor_reviews rv WHERE rv.mentor_id = m.id)::int AS review_count,
            (SELECT to_char(avg(rv.rating), 'FM0.0') FROM mentor_reviews rv
              WHERE rv.mentor_id = m.id) AS rating_avg
       FROM mentors m
      WHERE m.status = 'active'
        AND ($1::bigint IS NULL OR EXISTS (
              SELECT 1 FROM mentor_job_clusters x
               WHERE x.mentor_id = m.id AND x.job_id = $1::bigint))
        AND ($2::text IS NULL OR m.degree = $2::text)
        AND ($3::text IS NULL OR m.career_path = $3::text)
        AND ($4::text IS NULL OR m.field_track = $4::text)
      -- 신청할 수 있는 멘토를 앞에 둔다. 열린 시간대가 없으면 next_slot 이 NULL 이므로
      -- NULLS LAST 하나로 "신청 가능한 사람 먼저, 그중 가까운 순"이 된다.
      -- (출력 컬럼명은 ORDER BY 에서 식으로 쓸 수 없어 open_slots = 0 은 쓰지 않는다)
      ORDER BY next_slot NULLS LAST,
               m.created_at DESC`,
    [filter.jobId || null, filter.degree || null, filter.path || null, filter.track || null],
  );
  return rows;
}

/**
 * 특정 직무 영역을 다루는 멘토 몇 명. 결과지에서 바로 보여주기 위한 것이다.
 * 지금 신청할 수 있는 사람(열린 시간대가 있는 사람)만 고른다 — 결과지에서 눌렀는데
 * 신청할 수 없는 사람이 나오면 동선이 거기서 끊긴다.
 */
export async function mentorsForJob(jobId: string, limit = 3): Promise<GalleryCard[]> {
  const all = await listGallery({ jobId });
  return all.filter((m) => m.open_slots > 0).slice(0, limit);
}

export type SlotRow = { id: string; starts_at: string; status: string };

/** 상세 화면에 뿌리는 시간대. 너무 임박한 것은 빼고 보여준다. */
export async function openSlots(mentorId: string): Promise<SlotRow[]> {
  return query<SlotRow>(
    `SELECT id, starts_at::text, status
       FROM mentor_slots
      WHERE mentor_id = $1 AND status = 'open'
        AND starts_at > now() + interval '1 hour'
      ORDER BY starts_at
      LIMIT 40`,
    [mentorId],
  );
}

export type RequestView = {
  id: string;
  status: string;
  question: string;
  decline_reason: string | null;
  starts_at: string;
  created_at: string;
  respond_by: string;
  has_review: boolean;
  handle: string;
  alias: string;
  years: number;
  degree: string;
  career_path: string;
  session_minutes: number;
  applicant_stage: string;
  join_url: string | null;
  host_url: string | null;
  passcode: string | null;
  provider: string | null;
  applicant_name: string;
  pay_status: string | null;
  pay_amount: number | null;
  pay_order_id: string | null;
};

/** 신청자 화면. host_url 은 고르지 않는다 (멘토만 본다). */
export async function requestsByApplicant(applicantId: string): Promise<RequestView[]> {
  return query<RequestView>(
    `SELECT r.id, r.status, r.question, r.decline_reason,
            s.starts_at::text, r.created_at::text, r.respond_by::text,
            EXISTS (SELECT 1 FROM mentor_reviews rv WHERE rv.request_id = r.id) AS has_review,
            m.handle, m.alias, m.years, m.degree, m.career_path, m.session_minutes,
            r.applicant_stage,
            mt.join_url, NULL::text AS host_url, mt.passcode, mt.provider,
            '' AS applicant_name,
            pm.status AS pay_status, pm.amount AS pay_amount, pm.order_id AS pay_order_id
       FROM mentoring_requests r
       JOIN mentor_slots s ON s.id = r.slot_id
       JOIN mentors m      ON m.id = r.mentor_id
       LEFT JOIN meetings mt ON mt.request_id = r.id AND mt.cancelled_at IS NULL
       LEFT JOIN payments pm ON pm.request_id = r.id
      WHERE r.applicant_id = $1
      ORDER BY s.starts_at DESC`,
    [applicantId],
  );
}

/** 멘토 콘솔. 신청자 실명 대신 마스킹한 표기를 쓴다 (applicantLabel). */
export async function requestsByMentor(mentorId: string): Promise<RequestView[]> {
  // 결제가 끝나지 않은 신청은 아직 신청이 아니다. 멘토 화면에 띄우지 않는다.
  return query<RequestView>(
    `SELECT r.id, r.status, r.question, r.decline_reason,
            s.starts_at::text, r.created_at::text, r.respond_by::text,
            EXISTS (SELECT 1 FROM mentor_reviews rv WHERE rv.request_id = r.id) AS has_review,
            m.handle, m.alias, m.years, m.degree, m.career_path, m.session_minutes,
            r.applicant_stage,
            mt.join_url, mt.host_url, mt.passcode, mt.provider,
            u.display_name AS applicant_name,
            NULL::text AS pay_status, NULL::int AS pay_amount, NULL::text AS pay_order_id
       FROM mentoring_requests r
       JOIN mentor_slots s ON s.id = r.slot_id
       JOIN mentors m      ON m.id = r.mentor_id
       JOIN users u        ON u.id = r.applicant_id
       LEFT JOIN meetings mt ON mt.request_id = r.id AND mt.cancelled_at IS NULL
      WHERE r.mentor_id = $1
        AND NOT EXISTS (SELECT 1 FROM payments p
                         WHERE p.request_id = r.id AND p.status <> 'paid')
      ORDER BY r.status = 'requested' DESC,   -- 처리할 것이 위로
               s.starts_at
      LIMIT 200`,
    [mentorId],
  );
}

export class MentoringError extends Error {}

/**
 * 신청. 시간대를 held 로 잡아두고 신청 행을 만든다.
 * 두 사람이 같은 시간대를 동시에 누르면 UPDATE ... WHERE status='open' 에서
 * 한 쪽만 1행을 얻는다. 진 쪽에는 다른 시간대를 고르라고 알린다.
 */
export async function createRequest(input: {
  mentorId: string;
  slotId: string;
  applicantId: string;
  question: string;
  applicantStage: string;
}): Promise<{ requestId: string; orderId: string | null; amount: number }> {
  const mentor = await queryOne<{ user_id: string; status: string; session_minutes: number }>(
    `SELECT user_id, status, session_minutes FROM mentors WHERE id = $1`,
    [input.mentorId],
  );
  if (!mentor || mentor.status !== "active") {
    throw new MentoringError("지금은 신청을 받지 않는 멘토입니다.");
  }
  if (mentor.user_id === input.applicantId) {
    throw new MentoringError("자기 자신에게는 신청할 수 없습니다.");
  }

  const live = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM mentoring_requests
      WHERE mentor_id = $1 AND applicant_id = $2 AND status IN ('requested', 'accepted')`,
    [input.mentorId, input.applicantId],
  );
  if (Number(live?.n ?? 0) > 0) {
    throw new MentoringError(
      "이 멘토에게 진행 중인 신청이 이미 있습니다. 끝나거나 취소된 뒤에 다시 신청하세요.",
    );
  }

  // 학과 계약으로 들어온 학생은 무료다. 개인은 정가표대로 낸다.
  const free = await isFreeUser(input.applicantId);
  const amount = free ? 0 : ((await priceOf(mentor.session_minutes)) ?? -1);
  if (!free && amount < 0) {
    throw new MentoringError("이 길이의 세션 가격이 정해져 있지 않습니다. 운영사에 문의하세요.");
  }

  return tx(async (c) => {
    const held = await c.query<{ id: string }>(
      `UPDATE mentor_slots
          SET status = 'held'
        WHERE id = $1 AND mentor_id = $2 AND status = 'open'
          AND starts_at > now() + interval '1 hour'
        RETURNING id`,
      [input.slotId, input.mentorId],
    );
    if (held.rowCount === 0) {
      throw new MentoringError(
        "방금 다른 사람이 그 시간대를 잡았거나, 시간이 너무 임박했습니다. 다른 시간대를 골라 주세요.",
      );
    }

    const r = await c.query<{ id: string }>(
      `INSERT INTO mentoring_requests
         (slot_id, mentor_id, applicant_id, question, applicant_stage)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        input.slotId,
        input.mentorId,
        input.applicantId,
        input.question,
        input.applicantStage,
      ],
    );
    const requestId = r.rows[0].id;

    if (free) return { requestId, orderId: null, amount: 0 };

    const orderId = await createPayment(c, {
      requestId,
      userId: input.applicantId,
      amount,
    });
    return { requestId, orderId, amount };
  });
}

type AcceptContext = {
  requestId: string;
  slotId: string;
  startsAt: Date;
  minutes: number;
  question: string;
  mentorTitle: string;
  mentorUserId: string;
  mentorEmail: string | null;
  applicantId: string;
  applicantEmail: string | null;
};

/**
 * 승낙. 여기가 이 기능의 심장이다. 순서를 이렇게 둔 이유가 있다.
 *
 *  1) DB 에서 신청을 먼저 잡는다(requested → accepted). 두 번 눌러도 한 번만 잡힌다
 *  2) 그 다음에 줌을 부른다. 외부 호출을 트랜잭션 안에 두면 응답이 느릴 때
 *     DB 연결과 행 잠금을 그만큼 붙잡고 있게 된다
 *  3) 줌이 실패하면 1)을 되돌린다. 회의 없는 '확정'이 남지 않는다
 *  4) 회의 저장과 알림 적재는 한 트랜잭션이다. 확정됐는데 아무 안내도 안 가는 경우가 없다
 */
export async function acceptRequest(input: {
  requestId: string;
  mentorUserId: string;
}): Promise<{ joinUrl: string; hostUrl: string | null }> {
  const ctx = await tx<AcceptContext>(async (c) => {
    const claimed = await c.query<{
      slot_id: string;
      starts_at: string;
      question: string;
      applicant_id: string;
      minutes: number;
      alias: string;
      years: number;
      degree: string;
      career_path: string;
    }>(
      `UPDATE mentoring_requests r
          SET status = 'accepted', decided_at = now()
         FROM mentor_slots s, mentors m
        WHERE r.id = $1
          AND s.id = r.slot_id
          AND m.id = r.mentor_id
          AND m.user_id = $2
          AND r.status = 'requested'
          AND s.starts_at > now()
        RETURNING r.slot_id, s.starts_at::text, r.question, r.applicant_id,
                  m.session_minutes AS minutes, m.alias, m.years, m.degree, m.career_path`,
      [input.requestId, input.mentorUserId],
    );
    if (claimed.rowCount === 0) {
      throw new MentoringError(
        "이미 처리됐거나 시간이 지난 신청입니다. 목록을 새로 불러오세요.",
      );
    }
    const row = claimed.rows[0];

    await c.query(`UPDATE mentor_slots SET status = 'booked' WHERE id = $1`, [row.slot_id]);

    const emails = await c.query<{ id: string; email: string | null }>(
      `SELECT id, email FROM users WHERE id = ANY($1::bigint[])`,
      [[input.mentorUserId, row.applicant_id]],
    );
    const emailOf = (id: string) => emails.rows.find((e) => e.id === id)?.email ?? null;

    return {
      requestId: input.requestId,
      slotId: row.slot_id,
      startsAt: new Date(row.starts_at),
      minutes: row.minutes,
      question: row.question,
      mentorTitle: mentorTitle(row),
      mentorUserId: input.mentorUserId,
      mentorEmail: emailOf(input.mentorUserId),
      applicantId: row.applicant_id,
      applicantEmail: emailOf(row.applicant_id),
    };
  });

  let meeting;
  try {
    meeting = await createMeeting({
      // 회의 제목에도 실명을 넣지 않는다. 줌 참가자 목록은 양쪽 다 본다.
      topic: `현직자 멘토링 · ${ctx.mentorTitle}`,
      agenda: ctx.question.slice(0, 1800),
      startsAt: ctx.startsAt,
      minutes: ctx.minutes,
    });
  } catch (e) {
    // 회의를 못 만들었으면 승낙을 되돌린다. 신청자는 계속 '신청 중' 상태로 남는다.
    await tx(async (c) => {
      await c.query(
        `UPDATE mentoring_requests SET status = 'requested', decided_at = NULL WHERE id = $1`,
        [ctx.requestId],
      );
      await c.query(`UPDATE mentor_slots SET status = 'held' WHERE id = $1`, [ctx.slotId]);
    });
    throw new MentoringError(
      `줌 회의를 만들지 못해 승낙을 취소했습니다. ${e instanceof Error ? e.message : ""}`.trim(),
    );
  }

  try {
    await tx(async (c) => {
      const saved = await c.query(
        `INSERT INTO meetings
           (request_id, provider, provider_meeting_id, join_url, host_url, passcode,
            starts_at, duration_min)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (request_id) DO NOTHING`,
        [
          ctx.requestId,
          meeting.provider,
          meeting.providerMeetingId,
          meeting.joinUrl,
          meeting.hostUrl,
          meeting.passcode,
          ctx.startsAt,
          ctx.minutes,
        ],
      );
      // 이미 회의가 있었다면(동시에 두 번 승낙) 방금 만든 줌 회의는 군더더기다.
      if (saved.rowCount === 0) throw new DuplicateMeeting();

      const brief: MeetingBrief = {
        requestId: ctx.requestId,
        startsAt: ctx.startsAt,
        minutes: ctx.minutes,
        mentorTitle: ctx.mentorTitle,
        question: ctx.question,
      };

      const toApplicant = acceptedToApplicant(brief, meeting.joinUrl, meeting.passcode);
      await enqueue(c, {
        requestId: ctx.requestId,
        recipientId: ctx.applicantId,
        recipientEmail: ctx.applicantEmail,
        kind: "accepted",
        ...toApplicant,
      });

      const toMentor = acceptedToMentor(brief, meeting.hostUrl, meeting.joinUrl);
      await enqueue(c, {
        requestId: ctx.requestId,
        recipientId: ctx.mentorUserId,
        recipientEmail: ctx.mentorEmail,
        kind: "accepted",
        ...toMentor,
      });

      // 리마인더는 같은 큐에 미래 시각으로 넣어둔다. 발송기가 때가 되면 보낸다.
      for (const t of reminderTimes(ctx.startsAt)) {
        await enqueue(c, {
          requestId: ctx.requestId,
          recipientId: ctx.applicantId,
          recipientEmail: ctx.applicantEmail,
          kind: t.kind,
          sendAfter: t.at,
          ...reminder(brief, meeting.joinUrl, t.kind),
        });
        await enqueue(c, {
          requestId: ctx.requestId,
          recipientId: ctx.mentorUserId,
          recipientEmail: ctx.mentorEmail,
          kind: t.kind,
          sendAfter: t.at,
          ...reminder(brief, meeting.hostUrl ?? meeting.joinUrl, t.kind),
        });
      }
    });
  } catch (e) {
    if (e instanceof DuplicateMeeting) {
      if (meeting.providerMeetingId) {
        await deleteMeeting(meeting.providerMeetingId).catch(() => {});
      }
      const existing = await queryOne<{ join_url: string; host_url: string | null }>(
        `SELECT join_url, host_url FROM meetings WHERE request_id = $1`,
        [ctx.requestId],
      );
      return { joinUrl: existing?.join_url ?? "", hostUrl: existing?.host_url ?? null };
    }
    throw e;
  }

  return { joinUrl: meeting.joinUrl, hostUrl: meeting.hostUrl };
}

class DuplicateMeeting extends Error {}

export async function declineRequest(input: {
  requestId: string;
  mentorUserId: string;
  reason: string | null;
}): Promise<void> {
  await tx(async (c) => {
    const done = await c.query<{
      slot_id: string;
      starts_at: string;
      applicant_id: string;
      alias: string;
      years: number;
      degree: string;
      career_path: string;
    }>(
      `UPDATE mentoring_requests r
          SET status = 'declined', decided_at = now(), decline_reason = $3
         FROM mentor_slots s, mentors m
        WHERE r.id = $1
          AND s.id = r.slot_id AND m.id = r.mentor_id
          AND m.user_id = $2
          AND r.status = 'requested'
        RETURNING r.slot_id, s.starts_at::text, r.applicant_id,
                  m.alias, m.years, m.degree, m.career_path`,
      [input.requestId, input.mentorUserId, input.reason],
    );
    if (done.rowCount === 0) throw new MentoringError("이미 처리된 신청입니다.");
    const row = done.rows[0];

    // 거절한 시간대는 다시 열어 다른 사람이 신청할 수 있게 한다.
    await c.query(
      `UPDATE mentor_slots SET status = 'open'
        WHERE id = $1 AND starts_at > now()`,
      [row.slot_id],
    );

    const applicant = await c.query<{ email: string | null }>(
      `SELECT email FROM users WHERE id = $1`,
      [row.applicant_id],
    );
    await enqueue(c, {
      requestId: input.requestId,
      recipientId: row.applicant_id,
      recipientEmail: applicant.rows[0]?.email ?? null,
      kind: "declined",
      ...declinedToApplicant({
        startsAt: new Date(row.starts_at),
        mentorTitle: mentorTitle(row),
        reason: input.reason,
      }),
    });
  });

  await refundFor(input.requestId, "멘토 거절");
}

/**
 * 취소. 신청자와 멘토 양쪽이 부를 수 있다.
 * 확정된 건이면 줌 회의도 지우고, 아직 안 나간 리마인더는 큐에서 뺀다.
 */
export async function cancelRequest(input: {
  requestId: string;
  userId: string;
}): Promise<void> {
  const found = await queryOne<{
    id: string;
    status: string;
    slot_id: string;
    starts_at: string;
    applicant_id: string;
    mentor_user_id: string;
    provider_meeting_id: string | null;
  }>(
    `SELECT r.id, r.status, r.slot_id, s.starts_at::text, r.applicant_id,
            m.user_id AS mentor_user_id, mt.provider_meeting_id
       FROM mentoring_requests r
       JOIN mentor_slots s ON s.id = r.slot_id
       JOIN mentors m      ON m.id = r.mentor_id
       LEFT JOIN meetings mt ON mt.request_id = r.id AND mt.cancelled_at IS NULL
      WHERE r.id = $1 AND (r.applicant_id = $2 OR m.user_id = $2)`,
    [input.requestId, input.userId],
  );
  if (!found) throw new MentoringError("신청을 찾을 수 없습니다.");
  if (!["requested", "accepted"].includes(found.status)) {
    throw new MentoringError("이미 끝난 신청입니다.");
  }

  const byApplicant = found.applicant_id === input.userId;
  const otherId = byApplicant ? found.mentor_user_id : found.applicant_id;

  await tx(async (c) => {
    await c.query(
      `UPDATE mentoring_requests SET status = 'cancelled', decided_at = now() WHERE id = $1`,
      [input.requestId],
    );
    await c.query(
      `UPDATE mentor_slots SET status = CASE WHEN starts_at > now() THEN 'open' ELSE 'closed' END
        WHERE id = $1`,
      [found.slot_id],
    );
    await c.query(
      `UPDATE meetings SET cancelled_at = now() WHERE request_id = $1 AND cancelled_at IS NULL`,
      [input.requestId],
    );
    // 아직 때가 되지 않은 리마인더는 지운다. 취소된 회의 링크를 다시 보내면 안 된다.
    // sent_at 이 아니라 send_after 로 자르는 이유: 화면 알림(inapp)은 큐에 넣는 순간
    // 전달된 것으로 표시되므로, sent_at IS NULL 로만 지우면 취소된 회의의 리마인더가
    // 신청자 알림함에 그대로 남는다.
    await c.query(
      `DELETE FROM notifications
        WHERE request_id = $1
          AND kind IN ('reminder_24h', 'reminder_1h')
          AND send_after > now()`,
      [input.requestId],
    );

    if (found.status === "accepted") {
      const other = await c.query<{ email: string | null }>(
        `SELECT email FROM users WHERE id = $1`,
        [otherId],
      );
      await enqueue(c, {
        requestId: input.requestId,
        recipientId: otherId,
        recipientEmail: other.rows[0]?.email ?? null,
        kind: "cancelled",
        ...cancelledNotice({
          startsAt: new Date(found.starts_at),
          byWhom: byApplicant ? "applicant" : "mentor",
        }),
      });
    }
  });

  // 줌 삭제와 결제 취소는 DB 가 정리된 뒤에 한다. 실패해도 취소 자체는 이미 성립했다.
  if (found.provider_meeting_id) {
    await deleteMeeting(found.provider_meeting_id).catch(() => {});
  }
  await refundFor(input.requestId, byApplicant ? "신청자 취소" : "멘토 취소", { byApplicant });
}

/**
 * 응답 기한이 지난 신청을 닫는다. 코멘토가 '24시간 내 답변'을 약속으로 내세우는데,
 * 그 약속은 기한을 넘긴 신청을 실제로 닫아줄 때만 약속이다.
 * 알림 발송기(scripts/notify.ts)가 주기적으로 부른다.
 */
export async function expireStaleRequests(): Promise<number> {
  const expired = await tx(async (c) => {
    const rows = await c.query<{
      id: string;
      slot_id: string;
      starts_at: string;
      applicant_id: string;
      alias: string;
      years: number;
      degree: string;
      career_path: string;
      email: string | null;
    }>(
      `UPDATE mentoring_requests r
          SET status = 'expired', decided_at = now()
         FROM mentor_slots s, mentors m, users u
        WHERE r.status = 'requested'
          AND (r.respond_by < now() OR s.starts_at < now())
          AND s.id = r.slot_id AND m.id = r.mentor_id AND u.id = r.applicant_id
        RETURNING r.id, r.slot_id, s.starts_at::text, r.applicant_id,
                  m.alias, m.years, m.degree, m.career_path, u.email`,
    );

    for (const row of rows.rows) {
      await c.query(
        `UPDATE mentor_slots
            SET status = CASE WHEN starts_at > now() + interval '1 hour' THEN 'open' ELSE 'closed' END
          WHERE id = $1`,
        [row.slot_id],
      );
      await enqueue(c, {
        requestId: row.id,
        recipientId: row.applicant_id,
        recipientEmail: row.email,
        kind: "expired",
        ...expiredToApplicant({
          startsAt: new Date(row.starts_at),
          mentorTitle: mentorTitle(row),
        }),
      });
    }
    return rows.rows.map((r) => r.id);
  });

  for (const id of expired) await refundFor(id, "멘토 무응답으로 기한 초과");
  return expired.length;
}

/** 끝난 시간이 지난 확정 건을 completed 로 넘긴다. 후기는 그 뒤에 쓸 수 있다. */
export async function completeDueSessions(): Promise<number> {
  const rows = await query<{ id: string }>(
    `UPDATE mentoring_requests r
        SET status = 'completed'
       FROM mentor_slots s, mentors m
      WHERE r.status = 'accepted'
        AND s.id = r.slot_id AND m.id = r.mentor_id
        AND s.starts_at + (m.session_minutes || ' minutes')::interval < now()
      RETURNING r.id`,
  );
  return rows.length;
}

export async function submitReview(input: {
  requestId: string;
  applicantId: string;
  rating: number;
  comment: string | null;
}): Promise<void> {
  const row = await queryOne<{ mentor_id: string }>(
    `SELECT mentor_id FROM mentoring_requests
      WHERE id = $1 AND applicant_id = $2 AND status = 'completed'`,
    [input.requestId, input.applicantId],
  );
  if (!row) throw new MentoringError("끝난 멘토링에만 후기를 남길 수 있습니다.");

  const done = await query<{ id: string }>(
    `INSERT INTO mentor_reviews (request_id, mentor_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (request_id) DO NOTHING
     RETURNING id`,
    [input.requestId, row.mentor_id, input.rating, input.comment],
  );
  if (done.length === 0) throw new MentoringError("이미 후기를 남겼습니다.");
}

/** 상세 화면의 후기 목록. 작성자는 표시하지 않는다. */
export async function reviewsFor(mentorId: string) {
  return query<{ rating: number; comment: string | null; created_at: string }>(
    `SELECT rating, comment, to_char(created_at, 'YYYY-MM-DD') AS created_at
       FROM mentor_reviews
      WHERE mentor_id = $1 AND comment IS NOT NULL AND comment <> ''
      ORDER BY created_at DESC
      LIMIT 10`,
    [mentorId],
  );
}

export async function mentorStats(mentorId: string) {
  return queryOne<{ done_count: number; review_count: number; rating_avg: string | null }>(
    `SELECT (SELECT count(*) FROM mentoring_requests
              WHERE mentor_id = $1 AND status = 'completed')::int AS done_count,
            (SELECT count(*) FROM mentor_reviews WHERE mentor_id = $1)::int AS review_count,
            (SELECT to_char(avg(rating), 'FM0.0') FROM mentor_reviews WHERE mentor_id = $1) AS rating_avg`,
    [mentorId],
  );
}

/** 이메일이 없는 계정에게 보낸 알림. 화면에서 읽는다. */
export async function inboxFor(userId: string) {
  return query<{ id: string; kind: string; subject: string; body: string; created_at: string }>(
    `SELECT id, kind, subject, body, to_char(created_at, 'MM-DD HH24:MI') AS created_at
       FROM notifications
      WHERE recipient_id = $1 AND channel = 'inapp'
      ORDER BY created_at DESC, id DESC
      LIMIT 5`,
    [userId],
  );
}
