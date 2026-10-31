import { purgeUploads } from "./upload";
import { query } from "@/lib/db";
import { enqueue } from "@/lib/outbox";
import { pushReady, sendPush } from "@/lib/push";
import { openActions } from "@/lib/me-v3/open-actions";
import { coreIfAny } from "@/lib/me-v3/platform";
import { PUSH_TEXT, PUSH_TEXT_EN, buildBrief, weeklyNudgeText, weeklyNudgeTextEn } from "./brief";
import { wsLang } from "@/lib/me-v3/ws-lang";
import { livePostingsOf } from "./posting";
import { postingsForMe } from "./match";
import { opFail, ref } from "@/lib/oplog";

/**
 * MAT이 먼저 말을 거는 자리.
 *
 * **앱 안 알림이 먼저다.** 홈과 MAT 쪽에 한 줄씩 쌓이고, 메일은
 * 그 사람이 받겠다고 켠 경우에만 한 주에 한 통이다. 메일에는 본문을 담지
 * 않고 몇 가지가 쌓였는지만 적는다(`outbox` 의 규칙).
 *
 * **열려 있는 사람에게만 만든다.** 기간권이 끝난 사람에게 계속 알림을
 * 쌓으면 그것이 곧 결제를 조르는 일이 된다.
 *
 * **같은 일로 두 번 쌓지 않는다.** `(user_id, dedupe_key)` 가 유일하고,
 * 밤 당번을 두 번 돌려도 줄 수가 그대로다.
 */

export type Nudge = {
  id: string; kind: string; title: string; body: string; href: string | null;
  created_at: string; read_at: string | null;
};

export async function nudgesOf(userId: string, limit = 8): Promise<Nudge[]> {
  return query<Nudge>(
    `SELECT id::text, kind, title, body, href, created_at::text, read_at::text
       FROM assistant_nudges WHERE user_id = $1
      ORDER BY (read_at IS NOT NULL), created_at DESC LIMIT $2`,
    [userId, limit]).catch(() => []);
}

export async function unreadCount(userId: string): Promise<number> {
  const r = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM assistant_nudges
      WHERE user_id = $1 AND read_at IS NULL`, [userId]).catch(() => [{ n: 0 }]);
  return r[0]?.n ?? 0;
}

export async function markNudgesRead(userId: string): Promise<void> {
  await query(`UPDATE assistant_nudges SET read_at = now()
                WHERE user_id = $1 AND read_at IS NULL`, [userId]);
}

/** 한국 시각으로 이번 주. **ISO 주차**(월요일 시작) */
export function weekKey(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 3600_000);
  const day = (kst.getUTCDay() + 6) % 7;
  const thu = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - day + 3));
  const y = thu.getUTCFullYear();
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round(((thu.getTime() - jan4.getTime()) / 86400_000
    - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

async function put(userId: string, n: {
  kind: string; title: string; body: string; href: string; key: string;
}): Promise<boolean> {
  const r = await query<{ id: string }>(
    `INSERT INTO assistant_nudges (user_id, kind, title, body, href, dedupe_key)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, dedupe_key) DO NOTHING RETURNING id::text`,
    [userId, n.kind, n.title.slice(0, 80), n.body.slice(0, 200), n.href, n.key]);
  return r.length > 0;
}

/** 한 사람 몫. 화면에서 처음 열 때도 부른다(그 주의 한 줄이 없으면 만든다) */
export async function nudgeUser(userId: string, now = new Date()): Promise<{
  weekly: number; deadline: number;
}> {
  const wk = weekKey(now);
  let weekly = 0;
  let deadline = 0;
  /* **알림 줄은 쌓을 때의 언어로 남는다.** 작업공간이 영어인 분에게 한국어 줄이
     쌓이면 화면을 바꿔도 그 줄은 한국어로 남는다 */
  const en = (await wsLang(userId).catch(() => "ko")) === "en";
  try {
    /* **전공을 아직 고르지 않은 분은 짐작으로 고르지 않는다.** 할 일이
       없으므로 검사를 시작하는 자리로 보낸다 */
    if (!(await coreIfAny(userId))) {
      if (await put(userId, {
        kind: "weekly", title: en ? "One task for this week" : "이번 주 할 일 하나",
        body: en ? "Pick your major and finish the free assessment, and your weekly task will show up here."
          : "전공을 고르고 검사를 끝내면 할 일을 이 자리에 알려 드립니다.",
        href: "/cores", key: `weekly:${wk}`,
      })) weekly += 1;
      throw null;
    }
    /* 이번 주 줄이 이미 있으면 브리핑을 다시 세지 않는다. 화면을 열 때마다
       불리는 자리라, 줄이 있는데도 공고와 경험을 다 읽으면 그만큼 느려진다 */
    const had = await query<{ id: string }>(
      `SELECT id::text FROM assistant_nudges WHERE user_id = $1 AND dedupe_key = $2`,
      [userId, `weekly:${wk}`]);
    if (had.length) throw null;
    /* **브리핑으로 보낸다.** 알림 줄에는 몇 가지가 모였는지만 적고, 할 일
       문장과 공고 이름은 브리핑 판에서 읽는다. 같은 줄이 홈에도 서고 메일과
       기기 알림의 근거도 되므로 이름이 들어갈 자리를 두지 않는다 */
    const [open, live] = await Promise.all([openActions(userId), livePostingsOf(userId)]);
    const b = buildBrief({
      core: live.core, postings: live.rows, exps: live.exps,
      actions: open.rows, fromResult: open.fromResult, now, lang: en ? "en" : "ko",
    });
    const text = (en ? weeklyNudgeTextEn : weeklyNudgeText)({
      task: Boolean(b.task),
      deadlines: b.deadlines.filter((d) => d.left <= 7).length,
      gaps: b.gaps.length,
    });
    if (await put(userId, {
      kind: "weekly", title: text.title, body: text.body,
      href: "/me/track#brief", key: `weekly:${wk}`,
    })) weekly += 1;
  } catch (e) {
    /* 결과가 없거나 전공을 아직 고르지 않은 분. **알림 하나 때문에 다른
       사람 몫을 멈추지 않는다** */
    if (e !== null) opFail({ operation: "assistant.nudge", ref: ref("user", userId), step: "weekly", category: "db" }, e);
  }
  const due = await query<{ id: string; label: string; left: number }>(
    `SELECT id::text, label, (deadline - (now() AT TIME ZONE 'Asia/Seoul')::date)::int AS left
       FROM assistant_postings
      WHERE user_id = $1 AND state = 'watching' AND deadline IS NOT NULL
        AND deadline >= (now() AT TIME ZONE 'Asia/Seoul')::date
        AND deadline <= (now() AT TIME ZONE 'Asia/Seoul')::date + 7`,
    [userId]).catch(() => []);
  for (const p of due) {
    const step = p.left <= 1 ? "d1" : p.left <= 3 ? "d3" : "d7";
    if (await put(userId, {
      kind: "deadline",
      title: en
        ? (p.left === 0 ? `"${p.label}" closes today` : `"${p.label}" closes in ${p.left} day${p.left === 1 ? "" : "s"}`)
        : p.left === 0 ? `'${p.label}' 오늘 마감` : `'${p.label}' 마감 ${p.left}일 전`,
      body: en
        ? "Take one more look at how your experience lines up with this posting and fill in what's still empty. The calendar file is on that page too."
        : "공고와 내 경험을 비교한 표를 한 번 더 보고, 비어 있는 줄을 채워 두세요. 휴대폰 달력에 넣는 파일도 그 화면에 있습니다.",
      href: `/me/track/posting/${p.id}`,
      key: `deadline:${p.id}:${step}`,
    })) deadline += 1;
  }
  return { weekly, deadline };
}

/**
 * **기간권 끝을 미리 알리고, 새로 겹치는 공고를 알린다**(2026-10-31 · 100% 자동화).
 *
 * - renew: 기간권이 끝나기 10일 전 · 3일 전 · 끝나는 날 한 번씩. 이어 산 기간이 있으면 마지막
 *   끝나는 날로 센다. 같은 끝날 · 같은 단계는 한 번만(`dedupe_key`)
 * - match: 이번 주에 새로 모인 공고 가운데 내 자료와 겹치는 것이 있으면 주에 한 번
 *
 * **새 종류는 `db/schema_mat_auto.sql` 이 올라가야 쌓인다.** 그 전에는 줄 넣기가 실패하고,
 * 그 실패는 여기서 삼킨다: 알림 하나 때문에 밤 당번이 멈추면 안 된다.
 */
export async function autoNudges(userId: string, opts: { paid: boolean; now?: Date }): Promise<{
  renew: number; match: number;
}> {
  const now = opts.now ?? new Date();
  const en = (await wsLang(userId).catch(() => "ko")) === "en";
  let renew = 0, match = 0;
  if (opts.paid) {
    const end = await query<{ ends: string; left: number }>(
      `SELECT max(ends_at)::text AS ends,
              (max(ends_at) AT TIME ZONE 'Asia/Seoul')::date - (now() AT TIME ZONE 'Asia/Seoul')::date AS left
         FROM entitlements WHERE user_id = $1 AND kind = 'track' AND status = 'active' AND ends_at > now()`,
      [userId]).catch(() => []);
    const e = end[0];
    if (e?.ends && e.left !== null && e.left <= 10) {
      const step = e.left <= 0 ? "d0" : e.left <= 3 ? "d3" : "d10";
      const ok = await put(userId, {
        kind: "renew",
        title: en
          ? (e.left <= 0 ? "Your MAT pass ends today" : `Your MAT pass ends in ${e.left} day${e.left === 1 ? "" : "s"}`)
          : e.left <= 0 ? "MAT 이용 기간이 오늘 끝납니다" : `MAT 이용 기간이 ${e.left}일 남았습니다`,
        body: en
          ? "Buy again before it ends and the new days start the day after. Your records and results stay either way."
          : "끝나기 전에 다시 사면 끝나는 날 다음 날부터 이어 붙습니다. 끝나도 적어 둔 경험과 결과는 그대로 남습니다.",
        href: "/me/track#plans", key: `renew:${e.ends.slice(0, 10)}:${step}`,
      }).catch(() => false);
      if (ok) renew += 1;
    }
  }
  /* 이번 주에 새로 모인 공고 가운데 겹치는 것 */
  const m = await postingsForMe(userId, 500).catch(() => null);
  const since = now.getTime() - 7 * 86_400_000;
  const fresh = (m?.rows ?? []).filter((r) => Date.parse(r.captured_at) >= since).length;
  if (fresh > 0) {
    const ok = await put(userId, {
      kind: "match",
      title: en ? `${fresh} new posting${fresh === 1 ? "" : "s"} overlap with your documents`
        : `내 자료와 겹치는 새 공고 ${fresh}건`,
      body: en ? "See which words overlapped and check the originals."
        : "무엇이 겹쳤는지 보고, 마음에 드는 공고는 원문에서 직접 확인하세요.",
      href: "/me/track/jobs", key: `match:${weekKey(now)}`,
    }).catch(() => false);
    if (ok) match += 1;
  }
  return { renew, match };
}

/**
 * 밤 당번이 부른다. 열려 있는 사람마다 한 번.
 *
 * **붙여 넣은 글의 기한도 여기서 지킨다.** 공고 본문은 1년, 경험 메모 초안은
 * 30일이 지나면 본문만 비운다.
 */
export async function runAssistantTick(now = new Date()): Promise<{
  users: number; weekly: number; deadline: number; renew: number; match: number; free: number;
  mailed: number; purged: number;
}> {
  const users = await query<{ id: string; email_digest: boolean; email: string | null }>(
    `SELECT DISTINCT u.id::text, COALESCE(s.email_digest, false) AS email_digest, u.email
       FROM entitlements e JOIN users u ON u.id = e.user_id
       LEFT JOIN assistant_settings s ON s.user_id = u.id
      WHERE e.kind = 'track' AND e.status = 'active'
        AND e.starts_at <= now() AND e.ends_at > now()
        AND u.status = 'active'`).catch(() => []);
  let weekly = 0, deadline = 0, mailed = 0, renew = 0, match = 0, free = 0;
  const wk = weekKey(now);
  for (const u of users) {
    const r = await nudgeUser(u.id, now);
    const a = await autoNudges(u.id, { paid: true, now }).catch(() => ({ renew: 0, match: 0 }));
    const lang = await wsLang(u.id).catch(() => "ko" as const);
    weekly += r.weekly;
    deadline += r.deadline;
    renew += a.renew;
    match += a.match;
    if (a.renew + a.match > 0 && pushReady()) {
      await sendPush(u.id, { ...(lang === "en" ? PUSH_TEXT_EN : PUSH_TEXT)[a.renew > 0 ? "renew" : "match"] })
        .catch(() => undefined);
    }
    /* 기기 알림(PWA). **새로 쌓인 알림이 있을 때만** 한 번 보낸다: 알림 줄이
       같은 주에 두 번 쌓이지 않으므로(`dedupe_key`) 알림도 두 번 뜨지 않는다.
       글에는 공고 이름도 할 일 문장도 적지 않는다(잠긴 화면에 그대로 뜬다) */
    if (r.weekly + r.deadline > 0 && pushReady()) {
      await sendPush(u.id, { ...(lang === "en" ? PUSH_TEXT_EN : PUSH_TEXT)[r.deadline > 0 ? "deadline" : "weekly"] })
        .catch(() => undefined);
    }
    if (u.email_digest && u.email && r.weekly + r.deadline + a.renew + a.match > 0) {
      await enqueue({
        kind: "assistant_digest", userId: u.id,
        payload: { n: String(r.weekly + r.deadline + a.renew + a.match), deadlines: String(r.deadline) },
        dedupeKey: `assistant_digest:${u.id}:${wk}:${r.deadline}`,
        locale: lang,
      });
      mailed += 1;
    }
  }
  const p1 = await query<{ id: string }>(
    `UPDATE assistant_postings SET raw_text = NULL
      WHERE raw_text IS NOT NULL AND purge_after < now() RETURNING id::text`).catch(() => []);
  const p2 = await query<{ id: string }>(
    `UPDATE assistant_drafts SET note_text = NULL
      WHERE note_text IS NOT NULL AND purge_after < now() RETURNING id::text`).catch(() => []);
  const p3 = await purgeUploads();
  /* 기간권이 없는 분 가운데 자료를 올린 분에게도 새로 겹치는 공고를 알린다. 세 건까지는
     무료로 보이고 나머지는 기간권에서 열린다(`/me/track/jobs`). 주에 한 번이다 */
  const freeUsers = await query<{ id: string }>(
    `SELECT DISTINCT r.user_id::text AS id FROM research_docs r JOIN users u ON u.id = r.user_id
      WHERE u.status = 'active' AND NOT EXISTS (
        SELECT 1 FROM entitlements e WHERE e.user_id = r.user_id AND e.kind = 'track'
           AND e.status = 'active' AND e.starts_at <= now() AND e.ends_at > now())`).catch(() => []);
  for (const u of freeUsers) {
    const a = await autoNudges(u.id, { paid: false, now }).catch(() => ({ renew: 0, match: 0 }));
    if (a.match > 0) {
      free += 1;
      if (pushReady()) {
        const lang = await wsLang(u.id).catch(() => "ko" as const);
        await sendPush(u.id, { ...(lang === "en" ? PUSH_TEXT_EN : PUSH_TEXT).match }).catch(() => undefined);
      }
    }
  }
  /* 내 자료 읽기 정리는 마지막으로 쓴 날부터 1년(개인정보처리방침 1-5) */
  const p4 = await query<{ id: string }>(
    `DELETE FROM research_docs WHERE purge_after < now() RETURNING id::text`).catch(() => []);
  return {
    users: users.length, weekly, deadline, renew, match, free, mailed,
    purged: p1.length + p2.length + p3 + p4.length,
  };
}
