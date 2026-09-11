/**
 * 파기 — 지우는 것이 아니라 사람을 떼어내는 것.
 *
 * 두 법이 반대로 당긴다.
 *   개인정보보호법 제21조  보유기간이 끝나거나 본인이 요구하면 지체 없이 파기
 *   전자상거래법 제6조     대금결제·재화공급 기록은 5년 보존
 *
 * 그래서 users 행을 통째로 지우지 않는다. 사람을 알아볼 수 있는 값만 지우고
 * 거래 기록은 남긴다. 익명화가 끝나면 남은 행은 개인정보가 아니므로
 * 5년 보존과 부딪히지 않는다.
 *
 * 검사 응답과 점수는 남긴다 — 사람과 이어지지 않는 숫자는 규준(norm)의
 * 근거이고, 지우면 그 해 학과 집계가 뒤늦게 흔들린다. 대신 자유입력이 섞인
 * 것과 준식별자는 지운다. "기계공학과 3학년 대전 거주" 세 칸이면 사람이
 * 좁혀지기 때문이다.
 */
import { randomBytes } from "node:crypto";
import { queryOne, tx } from "./db";

/** 전자상거래법 시행령 제6조 — 대금결제·재화공급 기록 5년 */
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
 * 순서가 중요하다 — 참조가 걸린 쪽을 먼저 지운다.
 */
const REMOVE: { table: string; why: string }[] = [
  { table: "password_reset_tokens", why: "남기면 계정을 되살리는 열쇠가 된다" },
  { table: "learner_evidence", why: "과목·프로젝트 이름이 자유입력이라 본문에 사람이 들어갈 수 있다" },
  { table: "learner_competency_levels", why: "증거가 사라지면 근거 없는 값이 된다" },
  { table: "learner_preferences", why: "희망 지역·산업은 사람을 좁히는 값이다" },
  { table: "learner_profiles", why: "학교·학년·거주지는 셋만 모여도 사람이 특정된다" },
  { table: "outcome_records", why: "지원·합격 이력은 그 자체로 개인 이력이다" },
  { table: "match_feedback", why: "자유입력 의견" },
  { table: "jd_match_scores", why: "어떤 공고에 얼마나 맞았는지는 개인 이력이다" },
  { table: "memberships", why: "어느 학과 소속이었는지" },
];

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
 * users 행은 남긴다 — 주문·응시가 이 행을 가리키고 있어서, 지우면 보존해야
 * 할 기록까지 함께 끌려간다. 대신 이메일·아이디·이름·비밀번호를 없앤다.
 * 비밀번호는 NULL 로 둘 수 없으므로(NOT NULL) 아무도 모르는 난수를 넣는다.
 * 빈 문자열을 넣으면 언젠가 빈 비밀번호로 들어오는 길이 열린다.
 */
export async function anonymizeUser(
  userId: string,
  opts: { requestedBy: "self" | "admin"; reason?: string } = { requestedBy: "self" },
): Promise<ErasureResult> {
  return tx(async (c) => {
    const who = await c.query<{ id: string; erased_at: string | null }>(
      `SELECT id, erased_at FROM users WHERE id = $1 FOR UPDATE`,
      [userId],
    );
    if (!who.rows[0]) throw new Error("없는 계정입니다.");
    if (who.rows[0].erased_at) {
      // 이미 익명화됐다. 조용히 끝낸다 — 다시 지울 것이 없다.
      return { userId, removed: {}, kept: KEEP };
    }

    const removed: Record<string, number> = {};
    for (const { table } of REMOVE) {
      // 표 이름은 이 파일 안의 상수 목록에서만 온다. 밖에서 들어오지 않는다.
      const res = await c.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
      if (res.rowCount) removed[table] = res.rowCount;
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
}

/** 화면에 "무엇이 남고 무엇이 지워지는지" 를 먼저 보여주기 위한 목록. */
export function erasurePlan(): { remove: { table: string; why: string }[]; keep: Record<string, string> } {
  return { remove: REMOVE, keep: KEEP };
}
