/**
 * 파기: 지우는 것이 아니라 사람을 떼어내는 것.
 *
 * 두 법이 반대로 당긴다.
 *   개인정보보호법 제21조  보유기간이 끝나거나 본인이 요구하면 지체 없이 파기
 *   전자상거래법 제6조     대금결제·재화공급 기록은 5년 보존
 *
 * 그래서 users 행을 통째로 지우지 않는다. 사람을 알아볼 수 있는 값만 지우고
 * 거래 기록은 남긴다. 익명화가 끝나면 남은 행은 개인정보가 아니므로
 * 5년 보존과 부딪히지 않는다.
 *
 * 검사 응답과 점수는 남긴다. 사람과 이어지지 않는 숫자는 규준(norm)의
 * 근거이고, 지우면 그 해 학과 집계가 뒤늦게 흔들린다. 대신 자유입력이 섞인
 * 것과 준식별자는 지운다. "기계공학과 3학년 대전 거주" 세 칸이면 사람이
 * 좁혀지기 때문이다.
 */
import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { queryOne, tx } from "./db";
import { opFail, ref } from "./oplog";

/** 전자상거래법 시행령 제6조: 대금결제·재화공급 기록 5년 */
export const ORDER_RETENTION_YEARS = 5;

export type ErasureResult = {
  userId: string;
  removed: Record<string, number>;
  kept: Record<string, string>;
};

/**
 * 지우는 표. 자유입력이 섞였거나(증거 이름) 사람을 좁히는 값(학교·지역·소속)
 * 이거나, 남겨 봐야 위험만 되는 것(재설정 토큰)이다.
 *
 * 순서가 중요하다. 참조가 걸린 쪽을 먼저 지운다.
 */
const REMOVE: { table: string; why: string }[] = [
  { table: "password_reset_tokens", why: "남기면 계정을 되살리는 열쇠가 된다" },
  { table: "email_verify_tokens", why: "같음. 주소 확인 링크도 열쇠다" },
  { table: "pilot_feedback", why: "파일럿 자유입력. 어디가 헷갈렸는지는 그 사람의 말이다" },
  { table: "learner_evidence", why: "과목·프로젝트 이름이 자유입력이라 본문에 사람이 들어갈 수 있다" },
  { table: "learner_competency_levels", why: "증거가 사라지면 근거 없는 값이 된다" },
  { table: "learner_preferences", why: "희망 지역·산업은 사람을 좁히는 값이다" },
  { table: "learner_profiles", why: "학교·학년·거주지는 셋만 모여도 사람이 특정된다" },
  { table: "outcome_records", why: "지원·합격 이력은 그 자체로 개인 이력이다" },
  { table: "match_feedback", why: "자유입력 의견" },
  { table: "jd_match_scores", why: "어떤 공고에 얼마나 맞았는지는 개인 이력이다" },
  { table: "memberships", why: "어느 학과 소속이었는지" },
  { table: "v3_prep_answers", why: "본인이 적은 지원서·면접 답" },
  /* ── 지금 검사(ME_V3)와 작업공간 ─────────────────────────────
     **이 묶음이 한동안 빠져 있었다.** 파기 목록이 옛 검사의 표만 들고
     있어서, 지금 검사로 적은 경험·지원 기록·매트 메모가 탈퇴한
     뒤에도 남았다. `npm run erasure:check` 가 `user_id` 를 든 표를 전부
     세어 어느 목록에도 없는 표가 생기면 걸린다 */
  { table: "career_events", why: "다시 계산할 일. 적어 두신 경험을 가리킨다" },
  { table: "career_profiles", why: "지금 상태 · 목표 · 사는 권역은 사람을 좁히는 값이다" },
  { table: "v3_experiences", why: "경험 제목과 한 줄이 자유입력이다" },
  { table: "v3_applications", why: "지원한 기업 이름은 그 사람의 이력이다" },
  { table: "v3_actions", why: "담아 둔 할 일. 그 사람의 계획이다" },
  { table: "v3_saved_jobs", why: "저장한 공고는 그 사람의 관심이다" },
  { table: "v3_track_interest", why: "관심 표시" },
  { table: "assistant_drafts", why: "매트에 적은 메모" },
  { table: "assistant_postings", why: "붙여 넣은 공고 본문" },
  { table: "assistant_nudges", why: "그 사람에게 보낸 알림" },
  { table: "assistant_settings", why: "알림 · 동의 설정" },
  { table: "campus_students", why: "학번은 그 학교 안에서 사람을 바로 가리킨다" },
  { table: "cohort_members", why: "어느 회차 명단에 있었는지" },
  { table: "auth_accounts", why: "구글·애플 계정 번호와 주소는 그 사람을 가리킨다" },
];

/**
 * 줄은 남기고 칸만 비우는 자리.
 *
 * **응답과 점수는 남기되 그 안의 자유입력은 지운다.** 줄을 지우면 규준과
 * 학과 집계가 흔들리고(`KEEP` 과 같은 까닭), 칸을 남기면 그 글에 사람이
 * 들어 있다. 표 이름과 칸은 이 파일 안의 상수에서만 온다.
 */
const SCRUB: { key: string; sql: string; why: string }[] = [
  { key: "v3_responses.note_text",
    sql: `UPDATE v3_responses SET note_text = NULL
           WHERE note_text IS NOT NULL
             AND attempt_id IN (SELECT id FROM v3_attempts WHERE user_id = $1)`,
    why: "검사 중에 덧붙인 한 줄" },
  { key: "evidence_snapshots.payload",
    sql: `UPDATE evidence_snapshots SET payload = '{}'::jsonb
           WHERE profile_id IN (SELECT id FROM evidence_profiles WHERE user_id = $1)`,
    why: "옛 검사(ME_V2)의 경험 사본. 자유입력이다" },
  { key: "evidence_profiles.payload",
    sql: `UPDATE evidence_profiles SET payload = '{}'::jsonb WHERE user_id = $1`,
    why: "같음. 결과지 사본이 이 줄을 가리켜 줄은 남긴다" },
  { key: "report_snapshots.payload",
    sql: `UPDATE report_snapshots SET payload = NULL, pdf_path = NULL
           WHERE attempt_id IN (SELECT id FROM attempts WHERE user_id = $1)`,
    why: "옛 결과지 본문과 PDF 자리. 경험 글이 그대로 들어 있다" },
  { key: "outbox.to_addr",
    sql: `UPDATE outbox SET to_addr = NULL, payload = '{}'::jsonb,
                  status = CASE WHEN status = 'queued' THEN 'skipped' ELSE status END
           WHERE user_id = $1`,
    why: "보낼 주소와 메일 본문. 아직 안 보낸 메일은 보내지 않는다" },
  { key: "v3_pilot_participants",
    sql: `UPDATE v3_pilot_participants
             SET major_name = NULL, career_interest = NULL, interest_area = NULL,
                 purged_at = coalesce(purged_at, now())
           WHERE user_id = $1`,
    why: "파일럿 참가자의 전공명과 관심은 준식별자다" },
];

/**
 * **어느 쪽에도 넣지 않고 그대로 두는 표.** 까닭을 적어 두어야 다음 사람이
 * 빠뜨린 것과 일부러 둔 것을 가를 수 있다. `erasure:check` 가 이 셋
 * (`REMOVE` · `SCRUB` · 여기 · `KEEP`)에 들지 않은 `user_id` 표를 센다.
 */
export const LEFT_AS_IS: Record<string, string> = {
  users: "줄은 남기고 이름·이메일·아이디·비밀번호를 지운다(아래 UPDATE)",
  erasure_log: "파기했다는 증명. 이름도 이메일도 담지 않는다",
  consent_records: "동의를 받았다는 증명. 무엇에 언제 동의했는지만 있다",
  consents: "같음",
  entitlements: "산 것의 기록. 주문과 함께 5년 보존한다",
  refund_requests: "환불 판정의 기록. 거래 기록과 함께 보존한다",
  v3_attempts: "사람과 이어지지 않는 응시. 학과 집계와 규준의 근거다",
  analytics_events: "방문 차례만 담고 이름·주소·글이 없다",
  evidence_profiles: "칸을 비운다(SCRUB). 결과지 사본이 이 줄을 가리킨다",
  outbox: "칸을 비운다(SCRUB). 보낸 기록의 차례는 남긴다",
  v3_pilot_participants: "칸을 비운다(SCRUB). 파일럿 분석의 줄 수가 흔들리지 않게 한다",
};

/** 남기는 것과 그 이유. 화면과 기록에 그대로 쓴다. */
const KEEP: Record<string, string> = {
  orders: `전자상거래법 제6조 — 대금결제 기록 ${ORDER_RETENTION_YEARS}년 보존`,
  payments: `전자상거래법 제6조 — 대금결제 기록 ${ORDER_RETENTION_YEARS}년 보존`,
  seats: "계약이 산 자산이지 개인정보가 아니다",
  attempts: "사람과 이어지지 않는 응답·점수는 규준의 근거로 남긴다",
  responses: "같음",
  area_scores: "같음",
  indicator_scores: "같음",
  job_fit_scores: "같음",
  attempt_quality: "같음",
};

/** 이미 익명화된 계정인가. 두 번 돌려도 탈이 없어야 한다. */
export async function isErased(userId: string): Promise<boolean> {
  const row = await queryOne<{ erased_at: string | null }>(
    `SELECT erased_at FROM users WHERE id = $1`,
    [userId],
  );
  return !!row?.erased_at;
}

/**
 * 익명화한다.
 *
 * users 행은 남긴다. 주문·응시가 이 행을 가리키고 있어서, 지우면 보존해야
 * 할 기록까지 함께 끌려간다. 대신 이메일·아이디·이름·비밀번호를 없앤다.
 * 비밀번호는 NULL 로 둘 수 없으므로(NOT NULL) 아무도 모르는 난수를 넣는다.
 * 빈 문자열을 넣으면 언젠가 빈 비밀번호로 들어오는 길이 열린다.
 */
export async function anonymizeUser(
  userId: string,
  opts: { requestedBy: "self" | "admin"; reason?: string } = { requestedBy: "self" },
): Promise<ErasureResult> {
  const pdfFiles: string[] = [];
  const out = await tx(async (c) => {
    const who = await c.query<{ id: string; erased_at: string | null }>(
      `SELECT id, erased_at FROM users WHERE id = $1 FOR UPDATE`,
      [userId],
    );
    if (!who.rows[0]) throw new Error("없는 계정입니다.");
    if (who.rows[0].erased_at) {
      // 이미 익명화됐다. 조용히 끝낸다. 다시 지울 것이 없다.
      return { userId, removed: {}, kept: KEEP };
    }

    const removed: Record<string, number> = {};
    /* 지울 PDF 자리를 먼저 적어 둔다. 칸을 비운 뒤에는 어디 있었는지 모른다 */
    const pdfs = await c.query<{ p: string }>(
      `SELECT pdf_path AS p FROM report_snapshots
        WHERE pdf_path IS NOT NULL
          AND attempt_id IN (SELECT id FROM attempts WHERE user_id = $1)`, [userId]);
    pdfFiles.push(...pdfs.rows.map((r) => r.p));
    for (const { table } of REMOVE) {
      // 표 이름은 이 파일 안의 상수 목록에서만 온다. 밖에서 들어오지 않는다.
      const res = await c.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
      if (res.rowCount) removed[table] = res.rowCount;
    }
    for (const { key, sql } of SCRUB) {
      const res = await c.query(sql, [userId]);
      if (res.rowCount) removed[key] = res.rowCount;
    }

    const dead = randomBytes(32).toString("base64");
    await c.query(
      `UPDATE users
          SET email = NULL,
              login_id = NULL,
              display_name = '탈퇴한 회원',
              password_hash = $2,
              must_reset_pw = false,
              last_login_at = NULL,
              status = 'erased',
              erased_at = now()
        WHERE id = $1`,
      [userId, dead],
    );

    await c.query(
      `INSERT INTO erasure_log (user_id, requested_by, reason, removed, kept)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, opts.requestedBy, opts.reason ?? "withdraw", JSON.stringify(removed), JSON.stringify(KEEP)],
    );

    return { userId, removed, kept: KEEP };
  });
  /* **파일은 거래가 끝난 뒤에 지운다.** 거래 안에서 지웠는데 거래가 되돌아가면
     DB 는 그대로이고 파일만 사라진다. 이미 익명화된 계정(빈 `removed`)은
     지울 것이 없다 */
  if (Object.keys(out.removed).length) await removeFiles(userId, pdfFiles);
  return out;
}

/** 옛 결과지 PDF 가 놓이는 자리. `me-v2/render.ts` 의 `PDF_DIR` 과 같은 규칙이다 */
const PDF_ROOT = () => path.resolve(process.env.REPORT_PDF_DIR
  ?? path.join(process.cwd(), "var", "reports"));

/**
 * 거래 밖에서 지우는 파일. **실패해도 파기를 되돌리지 않는다**: 계정은 이미
 * 사람과 떨어졌고, 남은 파일은 운영 로그에 적혀 사람이 지운다.
 */
async function removeFiles(userId: string, pdfFiles: string[]): Promise<void> {
  const root = PDF_ROOT();
  for (const f of pdfFiles) {
    const abs = path.resolve(root, f);
    /* DB 에서 온 값이다. 두는 자리 밖을 가리키면 손대지 않는다 */
    if (abs !== root && !abs.startsWith(root + path.sep)) continue;
    await rm(abs, { force: true }).catch((e) =>
      opFail({ operation: "erasure.pdf", ref: ref("user", userId), step: "rm", category: "unknown" }, e));
  }
  /* 결과지 Gold Master 의 입력·출력 사본(var/gm-inputs) */
  try {
    const { purgeGmForUser } = await import("./me-v3/report-gm/inputs");
    await purgeGmForUser(userId);
  } catch (e) {
    opFail({ operation: "erasure.gm", ref: ref("user", userId), step: "purge", category: "unknown" }, e);
  }
}

/** 화면에 "무엇이 남고 무엇이 지워지는지" 를 먼저 보여주기 위한 목록. */
export function erasurePlan(): { remove: { table: string; why: string }[]; keep: Record<string, string> } {
  return { remove: REMOVE, keep: KEEP };
}

/**
 * 같은 일을 **손님의 말로** 적는다.
 *
 * 위의 `REMOVE`·`KEEP` 은 표 이름이라 지우는 코드가 읽는 값이고, 그것을
 * 그대로 화면에 찍으면 탈퇴 직전의 사람이 `jd_match_scores` 를 읽는다.
 * 읽을 수 없는 글자를 보여 주면서 돌이킬 수 없는 단추를 누르라고 하는
 * 셈이다. **묶음은 사람이 무엇을 잃는가로 가른다.**
 *
 * 표가 늘면 여기도 늘려야 한다. 그래서 묶음마다 어느 표를 담았는지
 * 적어 두고, `erasure:check` 가 빠진 표가 없는지 센다.
 */
export const ERASE_GROUPS: {
  ko: string; en: string; detail: { ko: string; en: string }; tables: string[];
}[] = [
  {
    ko: "계정 정보", en: "Account details",
    detail: { ko: "이름 · 이메일 · 아이디 · 비밀번호", en: "Name, email, login id, password" },
    tables: ["users"],
  },
  {
    ko: "적어 주신 경험과 설정", en: "Your experience and settings",
    detail: {
      ko: "프로젝트 · 수업 · 도구 · 희망 지역과 산업 · 학교와 학년",
      en: "Projects, courses, tools, preferred regions and industries, school and year",
    },
    tables: ["learner_evidence", "learner_competency_levels", "learner_preferences",
      "learner_profiles", "pilot_feedback", "match_feedback",
      "v3_experiences", "career_profiles", "career_events", "v3_actions",
      "v3_track_interest"],
  },
  {
    ko: "지원서·면접 준비와 매트", en: "Application prep and AI assistant",
    detail: {
      ko: "적어 두신 지원서·면접 답 · 붙여 넣은 공고 · 메모 · 알림 설정",
      en: "Your application and interview answers, pasted postings, notes, notification settings",
    },
    tables: ["v3_prep_answers", "assistant_drafts", "assistant_postings",
      "assistant_nudges", "assistant_settings"],
  },
  {
    ko: "지원 준비 자료", en: "Application material",
    detail: {
      ko: "공고와 맞춰 본 기록 · 지원과 합격 이력",
      en: "Job-match records, applications and outcomes",
    },
    tables: ["jd_match_scores", "outcome_records", "v3_applications", "v3_saved_jobs"],
  },
  {
    ko: "소속", en: "Membership",
    detail: {
      ko: "어느 학과·기관에 속해 있었는지 · 학번 · 회차 명단",
      en: "Which department or institution you belonged to, your student number, cohort rosters",
    },
    tables: ["memberships", "campus_students", "cohort_members"],
  },
  {
    ko: "인증과 재설정 정보", en: "Sign-in and reset material",
    detail: {
      ko: "비밀번호 재설정 링크 · 주소 확인 링크 · 구글·애플 계정 연결",
      en: "Password-reset links, address-verification links, Google and Apple sign-in links",
    },
    tables: ["password_reset_tokens", "email_verify_tokens", "auth_accounts"],
  },
];

/** 남는 것도 같은 말로 적는다. 법이 요구하는 자리와 그 까닭까지다 */
export const KEEP_GROUPS: {
  ko: string; en: string; detail: { ko: string; en: string }; tables: string[];
}[] = [
  {
    ko: "주문과 결제 기록", en: "Orders and payments",
    detail: {
      ko: `전자상거래법 제6조에 따라 ${ORDER_RETENTION_YEARS}년 보존합니다. 누가 샀는지는 지워지고 거래만 남습니다.`,
      en: `Kept for ${ORDER_RETENTION_YEARS} years under Korean e-commerce law. Who bought is erased; the transaction remains.`,
    },
    tables: ["orders", "payments", "seats"],
  },
  {
    ko: "사람과 이어지지 않는 응답과 점수", en: "Answers and scores, no longer linked to you",
    detail: {
      ko: "규준의 근거로 남습니다. 지우면 그 해 학과 집계가 뒤늦게 흔들립니다. 그 안에 적으신 글과 옛 결과지 PDF 는 지웁니다.",
      en: "Kept as the basis for norms. Removing them would shift cohort statistics after the fact. Notes you wrote inside them and old report PDFs are erased.",
    },
    tables: ["attempts", "responses", "area_scores", "indicator_scores",
      "job_fit_scores", "attempt_quality", "v3_attempts"],
  },
];
