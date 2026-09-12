/**
 * 줌 회의 자동 생성.
 *
 * 서버 간 인증(Server-to-Server OAuth)을 쓴다. 멘토에게 줌 계정을 요구하지 않고
 * 운영사 계정 하나로 회의를 만든다. 그래야 멘토의 이메일이 회의 어디에도
 * 남지 않아 익명이 유지된다. 멘토는 host_url(start_url)로 들어와 호스트가 된다.
 *
 * 필요한 값 (.env.local)
 *   ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET
 *   ZOOM_HOST_USER   회의를 만들 계정. 기본값 me (앱에 연결된 계정 소유자)
 *   MEETING_TIMEZONE 기본값 Asia/Seoul
 *
 * 값이 없으면 회의를 만들지 않고 오류를 낸다. 가짜 링크를 만들어 보내는 것보다
 * 승낙이 실패하는 편이 낫다. 개발 중 화면만 보려면 ZOOM_DRY_RUN=1 을 준다.
 */

const TOKEN_URL = "https://zoom.us/oauth/token";
const API_BASE = "https://api.zoom.us/v2";

export type CreatedMeeting = {
  provider: "zoom" | "dryrun";
  providerMeetingId: string | null;
  joinUrl: string;
  hostUrl: string | null;
  passcode: string | null;
};

export function zoomConfigured(): boolean {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID &&
      process.env.ZOOM_CLIENT_ID &&
      process.env.ZOOM_CLIENT_SECRET,
  );
}

export function zoomDryRun(): boolean {
  return process.env.ZOOM_DRY_RUN === "1";
}

export function meetingTimezone(): string {
  return process.env.MEETING_TIMEZONE || "Asia/Seoul";
}

/**
 * 토큰은 1시간 유효하다. 매 요청마다 새로 받으면 분당 호출 제한에 걸리므로
 * 만료 1분 전까지 재사용한다. 개발 중 HMR 로 모듈이 다시 평가돼도 남도록 global 에 둔다.
 */
declare global {
  // eslint-disable-next-line no-var
  var __zoomToken: { token: string; expiresAt: number } | undefined;
}

async function accessToken(): Promise<string> {
  const cached = global.__zoomToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const accountId = process.env.ZOOM_ACCOUNT_ID ?? "";
  const basic = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch(
    `${TOKEN_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`줌 인증 실패 (${res.status}). 앱 자격 증명을 확인하세요.`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  global.__zoomToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

/** 줌이 읽는 형식은 초 단위까지의 UTC ISO 다 (2026-09-20T05:00:00Z). */
function toZoomTime(d: Date): string {
  return `${d.toISOString().slice(0, 19)}Z`;
}

export async function createMeeting(input: {
  topic: string;
  agenda?: string;
  startsAt: Date;
  minutes: number;
}): Promise<CreatedMeeting> {
  if (zoomDryRun()) {
    // 개발용. provider 를 dryrun 으로 남겨 화면에서 진짜 회의와 구분한다.
    const fake = `dry-${Math.random().toString(36).slice(2, 10)}`;
    return {
      provider: "dryrun",
      providerMeetingId: fake,
      joinUrl: `https://example.invalid/dry-run/${fake}`,
      hostUrl: `https://example.invalid/dry-run/${fake}?host=1`,
      passcode: null,
    };
  }

  if (!zoomConfigured()) {
    throw new Error(
      "줌 연동이 설정되지 않았습니다. ZOOM_ACCOUNT_ID·ZOOM_CLIENT_ID·ZOOM_CLIENT_SECRET 를 넣으세요.",
    );
  }

  const token = await accessToken();
  const host = process.env.ZOOM_HOST_USER || "me";

  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(host)}/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      topic: input.topic,
      agenda: input.agenda ?? "",
      type: 2, // 예약 회의
      start_time: toZoomTime(input.startsAt),
      duration: input.minutes,
      timezone: meetingTimezone(),
      settings: {
        // 호스트가 늦어도 시작할 수 있게 한다. 30분짜리에서 대기는 치명적이다.
        join_before_host: true,
        jbh_time: 5,
        waiting_room: false,
        // 안내 메일은 우리가 보낸다. 줌이 따로 보내면 멘토 계정 정보가 드러난다.
        email_notification: false,
        auto_recording: "none",
        mute_upon_entry: true,
        // 카메라는 꺼진 채로 시작한다(2026-09-12 결정). 켜는 것은 각자 고른다.
        // 기본을 켜짐으로 두면 멘토는 얼굴을 보일지 말지 고를 새도 없이 노출된다.
        // 반대로 끄기를 강제하면 30분 대화가 어색해지고 상대가 진짜인지도 흐려진다.
        host_video: false,
        participant_video: false,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`줌 회의 생성 실패 (${res.status}) ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    id: number;
    join_url: string;
    start_url?: string;
    password?: string;
  };

  return {
    provider: "zoom",
    providerMeetingId: String(json.id),
    joinUrl: json.join_url,
    hostUrl: json.start_url ?? null,
    passcode: json.password ?? null,
  };
}

/**
 * 취소. 회의가 이미 없으면(404) 성공으로 본다.
 * 취소는 사용자가 기다리는 동작이 아니므로 실패해도 예약 취소 자체는 진행한다.
 */
export async function deleteMeeting(providerMeetingId: string): Promise<void> {
  if (!zoomConfigured() || zoomDryRun()) return;

  const token = await accessToken();
  const res = await fetch(
    `${API_BASE}/meetings/${encodeURIComponent(providerMeetingId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`줌 회의 취소 실패 (${res.status})`);
  }
}
