import type { PoolClient } from "pg";
import { meetingTimezone } from "@/lib/zoom";

/**
 * 알림은 보내는 순간 발송하지 않고 큐(notifications)에 넣는다.
 *
 * 이유 두 가지.
 *  1. 메일 서버가 죽어 있어도 승낙은 성립해야 한다. 승낙 트랜잭션 안에서 메일을
 *     보내려 하면, 메일 실패가 예약 실패로 번진다.
 *  2. 리마인더(24시간 전·1시간 전)는 애초에 나중에 나가는 것이다. 확정 안내와
 *     같은 표에 넣어두면 발송기 하나로 둘 다 처리된다.
 *
 * dedupe_key 가 UNIQUE 이므로 같은 알림은 두 번 쌓이지 않는다.
 * 승낙 버튼이 두 번 눌려도 안내가 두 통 가지 않는다.
 */

export type NotifyKind =
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired"
  | "reminder_24h"
  | "reminder_1h";

const KST_DATE = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

/** 사람이 읽는 일정 표기. 저장은 timestamptz, 표시는 한국 시간 기준이다. */
export function formatWhen(d: Date, timeZone = "Asia/Seoul"): string {
  if (timeZone === "Asia/Seoul") return KST_DATE.format(d);
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(d);
}

export function formatSlot(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(d);
}

type QueueRow = {
  requestId: string;
  recipientId: string;
  /** users.email. NULL 이면 화면 알림으로 돌린다 */
  recipientEmail: string | null;
  kind: NotifyKind;
  subject: string;
  body: string;
  sendAfter?: Date;
};

/**
 * 큐에 한 건 넣는다. 반드시 부르는 쪽의 트랜잭션 client 로 실행해
 * 예약 확정과 알림 적재가 같이 성립하거나 같이 없어지게 한다.
 *
 * 이메일이 없는 계정(학번 로그인 학생)은 channel=inapp 으로 넣고,
 * 화면에서 읽게 한다. 보낼 수 없는 주소로 보내는 척하지 않는다.
 */
export async function enqueue(client: PoolClient, row: QueueRow): Promise<void> {
  const channel = row.recipientEmail ? "email" : "inapp";
  await client.query(
    `INSERT INTO notifications
       (request_id, recipient_id, channel, kind, dedupe_key, subject, body, send_after, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $3 = 'inapp' THEN now() ELSE NULL END)
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [
      row.requestId,
      row.recipientId,
      channel,
      row.kind,
      `${row.requestId}:${row.recipientId}:${row.kind}`,
      row.subject,
      row.body,
      row.sendAfter ?? new Date(),
    ],
  );
}

export type MeetingBrief = {
  requestId: string;
  startsAt: Date;
  minutes: number;
  /** 멘토의 익명 표기. 실명은 들어오지 않는다 */
  mentorTitle: string;
  question: string;
};

/** 신청자에게 가는 확정 안내. 참가 링크(join_url)만 들어간다. */
export function acceptedToApplicant(m: MeetingBrief, joinUrl: string, passcode: string | null) {
  return {
    subject: `[현멘] 멘토링이 확정됐습니다 — ${formatSlot(m.startsAt)}`,
    body: [
      `신청하신 현직자 멘토링이 확정됐습니다.`,
      ``,
      `  멘토      ${m.mentorTitle}`,
      `  일시      ${formatWhen(m.startsAt)} (${meetingTimezone()})`,
      `  진행 시간  ${m.minutes}분`,
      `  참가 링크  ${joinUrl}`,
      passcode ? `  암호      ${passcode}` : ``,
      ``,
      `시작 24시간 전과 1시간 전에 한 번 더 알려드립니다.`,
      `사정이 생기면 신청 목록에서 취소해 주세요. 멘토에게도 바로 전달됩니다.`,
    ]
      .filter((l) => l !== ``)
      .join("\n"),
  };
}

/** 멘토에게 가는 확정 안내. 호스트 링크(start_url)는 이쪽에만 들어간다. */
export function acceptedToMentor(m: MeetingBrief, hostUrl: string | null, joinUrl: string) {
  return {
    subject: `[현멘] 멘토링 일정이 잡혔습니다 — ${formatSlot(m.startsAt)}`,
    body: [
      `승낙하신 멘토링 일정이 확정됐습니다.`,
      ``,
      `  일시      ${formatWhen(m.startsAt)} (${meetingTimezone()})`,
      `  진행 시간  ${m.minutes}분`,
      `  시작 링크  ${hostUrl ?? joinUrl}`,
      ``,
      `신청자가 남긴 질문`,
      m.question
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n"),
      ``,
      `시작 링크는 호스트 권한이 담겨 있습니다. 다른 사람에게 전달하지 마세요.`,
      `신청자에게는 참가 링크만 발송됐습니다.`,
    ].join("\n"),
  };
}

export function declinedToApplicant(m: {
  startsAt: Date;
  mentorTitle: string;
  reason: string | null;
}) {
  return {
    subject: `[현멘] 신청이 받아들여지지 않았습니다 — ${formatSlot(m.startsAt)}`,
    body: [
      `${m.mentorTitle} 님이 ${formatSlot(m.startsAt)} 신청을 받지 못했습니다.`,
      m.reason ? `\n멘토가 남긴 말\n  ${m.reason}` : ``,
      ``,
      `그 시간대는 다시 열렸습니다. 다른 시간대나 다른 멘토로 신청할 수 있습니다.`,
    ]
      .filter((l) => l !== ``)
      .join("\n"),
  };
}

export function cancelledNotice(m: {
  startsAt: Date;
  byWhom: "applicant" | "mentor";
}) {
  const who = m.byWhom === "applicant" ? "신청자" : "멘토";
  return {
    subject: `[현멘] 멘토링이 취소됐습니다 — ${formatSlot(m.startsAt)}`,
    body: [
      `${formatSlot(m.startsAt)} 로 확정됐던 멘토링이 ${who} 요청으로 취소됐습니다.`,
      `줌 회의도 함께 삭제됐습니다. 달력에 남아 있으면 지워 주세요.`,
    ].join("\n"),
  };
}

/**
 * 응답 기한이 지나 자동으로 닫힌 신청. 멘토가 아무 말도 하지 않은 경우다.
 * 신청자를 가만히 기다리게 두지 않는 것이 이 알림의 목적이다.
 */
export function expiredToApplicant(m: { startsAt: Date; mentorTitle: string }) {
  return {
    subject: `[현멘] 응답 기한이 지나 신청이 닫혔습니다 — ${formatSlot(m.startsAt)}`,
    body: [
      `${m.mentorTitle} 님이 24시간 안에 응답하지 않아 신청을 닫았습니다.`,
      `기다리신 시간에 대해 죄송합니다.`,
      ``,
      `그 시간대는 다시 열렸고, 다른 멘토에게 바로 신청할 수 있습니다.`,
    ].join("\n"),
  };
}

export function reminder(
  m: MeetingBrief,
  url: string,
  when: "reminder_24h" | "reminder_1h",
) {
  const lead = when === "reminder_24h" ? "내일" : "1시간 뒤";
  return {
    subject: `[현멘] ${lead} 멘토링이 있습니다 — ${formatSlot(m.startsAt)}`,
    body: [
      `${lead} 멘토링이 예정돼 있습니다.`,
      ``,
      `  일시   ${formatWhen(m.startsAt)} (${meetingTimezone()})`,
      `  링크   ${url}`,
      ``,
      `들어가기 전에 마이크와 카메라를 한 번 확인해 주세요.`,
    ].join("\n"),
  };
}

/** 리마인더를 보낼 시각. 이미 지난 시점이면 큐에 넣지 않는다. */
export function reminderTimes(startsAt: Date): { kind: "reminder_24h" | "reminder_1h"; at: Date }[] {
  const out: { kind: "reminder_24h" | "reminder_1h"; at: Date }[] = [];
  const day = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
  const hour = new Date(startsAt.getTime() - 60 * 60 * 1000);
  const now = Date.now();
  if (day.getTime() > now) out.push({ kind: "reminder_24h", at: day });
  if (hour.getTime() > now) out.push({ kind: "reminder_1h", at: hour });
  return out;
}
