/**
 * 학과 쪽 — 회차를 열고, 명단을 올리고, 결과를 공개하고, 집계를 본다.
 *
 * 개인(B2C)은 결제가 좌석을 만들고 혼자 본다. 학과(B2B)는 계약이 좌석을
 * 만들고 담당자가 회차를 연다. 좌석 아래는 두 경로가 같은 길을 간다.
 *
 * 집계에는 규칙이 하나 있다 — 5명 미만 칸은 내보내지 않는다. 담당자가 특정
 * 학생을 지목할 수 있게 되는 순간 이 제품은 못 쓴다(cohort_reports.min_cell).
 */
import { query, queryOne, tx } from "./db";
import { generateTempPassword, hashPassword } from "./password";
import type { RosterParse } from "./roster";

/** 이보다 작은 칸은 숫자를 내지 않는다. */
export const MIN_CELL = 5;

export type OrgRef = { id: string; code: string; name: string };
export type ContractRef = {
  id: string;
  title: string;
  seatCount: number;
  seatsFree: number;
  endsOn: string;
};

export type SessionRow = {
  id: string;
  name: string;
  opensAt: string;
  closesAt: string;
  releaseMode: string;
  releasedAt: string | null;
  enrolled: number;
  started: number;
  scored: number;
};

const NAME = (t: string, alias: string) =>
  `COALESCE((SELECT value FROM translations WHERE table_name = '${t}'
              AND row_id = ${alias}.id AND lang = 'ko' AND field = 'name'), ${alias}.code)`;

/** 이 사람이 담당자·교수로 들어가 있는 기관. 여기 없는 기관은 못 본다. */
export async function orgsOf(userId: string): Promise<OrgRef[]> {
  return query<OrgRef>(
    `SELECT o.id, o.code, ${NAME("organizations", "o")} AS name
       FROM organizations o
       JOIN memberships m ON m.org_id = o.id
      WHERE m.user_id = $1 AND m.role IN ('org_admin', 'instructor')
      ORDER BY o.id`,
    [userId],
  );
}

export async function contractsOf(orgIds: string[]): Promise<ContractRef[]> {
  if (!orgIds.length) return [];
  return query<ContractRef>(
    `SELECT c.id, c.title, c.seat_count AS "seatCount", c.ends_on AS "endsOn",
            (SELECT count(*)::int FROM seats s
              WHERE s.contract_id = c.id AND s.user_id IS NULL) AS "seatsFree"
       FROM contracts c
      WHERE c.org_id = ANY($1::bigint[]) AND c.status = 'active'
      ORDER BY c.ends_on DESC`,
    [orgIds],
  );
}

export async function sessionsOf(orgIds: string[]): Promise<SessionRow[]> {
  if (!orgIds.length) return [];
  return query<SessionRow>(
    `SELECT ts.id, ts.name, ts.opens_at AS "opensAt", ts.closes_at AS "closesAt",
            ts.release_mode AS "releaseMode", ts.released_at AS "releasedAt",
            (SELECT count(*)::int FROM attempts a WHERE a.session_id = ts.id) AS enrolled,
            (SELECT count(*)::int FROM attempts a
              WHERE a.session_id = ts.id AND a.status <> 'ready') AS started,
            (SELECT count(*)::int FROM attempts a
              WHERE a.session_id = ts.id AND a.status = 'scored') AS scored
       FROM test_sessions ts
      WHERE ts.kind = 'org' AND ts.org_id = ANY($1::bigint[])
      ORDER BY ts.id DESC`,
    [orgIds],
  );
}

/** 담당자가 이 회차를 만질 수 있는지. 교수는 읽기만 한다. */
export async function canManage(userId: string, sessionId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT ts.id FROM test_sessions ts
       JOIN memberships m ON m.org_id = ts.org_id
      WHERE ts.id = $1 AND m.user_id = $2 AND m.role = 'org_admin'`,
    [sessionId, userId],
  );
  return !!row;
}

export async function canRead(userId: string, sessionId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT ts.id FROM test_sessions ts
       JOIN memberships m ON m.org_id = ts.org_id
      WHERE ts.id = $1 AND m.user_id = $2 AND m.role IN ('org_admin', 'instructor')`,
    [sessionId, userId],
  );
  return !!row;
}

export async function createSession(
  userId: string,
  input: { contractId: string; name: string; opensAt: string; closesAt: string; instant: boolean },
): Promise<string> {
  const contract = await queryOne<{ id: string; org_id: string }>(
    `SELECT c.id, c.org_id FROM contracts c
       JOIN memberships m ON m.org_id = c.org_id
      WHERE c.id = $1 AND m.user_id = $2 AND m.role = 'org_admin' AND c.status = 'active'`,
    [input.contractId, userId],
  );
  if (!contract) throw new Error("이 계약으로 회차를 열 권한이 없습니다.");
  if (new Date(input.closesAt) <= new Date(input.opensAt)) {
    throw new Error("마감이 시작보다 빨라서는 안 됩니다.");
  }

  const inst = await queryOne<{ id: string }>(
    `SELECT id FROM instruments WHERE status = 'published' ORDER BY id DESC LIMIT 1`,
  );
  if (!inst) throw new Error("공개된 검사지가 없습니다.");

  const row = await queryOne<{ id: string }>(
    `INSERT INTO test_sessions
       (org_id, contract_id, kind, instrument_id, name, opens_at, closes_at, release_mode, released_at)
     VALUES ($1, $2, 'org', $3, $4, $5, $6, $7, CASE WHEN $7 = 'instant' THEN now() END)
     RETURNING id`,
    [
      contract.org_id,
      contract.id,
      inst.id,
      input.name.trim(),
      input.opensAt,
      input.closesAt,
      input.instant ? "instant" : "manual",
    ],
  );
  return row!.id;
}

export type EnrollResult = {
  created: { name: string; loginId: string; tempPassword: string }[];
  reused: number;
  skipped: { line: string; why: string }[];
  /** 어느 열을 이름·학번으로 봤는지. 담당자가 눈으로 확인할 수 있게 돌려준다 */
  columns: { name: string; ident: string } | null;
};

/**
 * 명단을 계정으로 바꾼다. 붙여넣기든 엑셀이든 여기 오기 전에 같은 모양
 * (RosterLine[])이 돼 있다 — 파일 형식을 아는 곳은 roster.ts 하나뿐이다.
 *
 * 임시 비밀번호는 여기서 한 번만 돌려주고 저장하지 않는다. 해시만 남는다.
 * 담당자가 그 화면을 닫으면 다시 볼 수 없고, 재발급만 된다.
 */
export async function enrollRoster(
  userId: string,
  sessionId: string,
  parsed: RosterParse,
): Promise<EnrollResult> {
  if (!(await canManage(userId, sessionId))) throw new Error("명단을 올릴 권한이 없습니다.");

  const session = await queryOne<{ org_id: string; contract_id: string }>(
    `SELECT org_id, contract_id FROM test_sessions WHERE id = $1`,
    [sessionId],
  );
  if (!session?.contract_id) throw new Error("계약이 붙어 있지 않은 회차입니다.");

  const out: EnrollResult = {
    created: [],
    reused: 0,
    skipped: [...parsed.skipped],
    columns: parsed.columns,
  };

  for (const { name, ident } of parsed.lines) {
    const isEmail = ident.includes("@");
    try {
      await tx(async (c) => {
        const found = await c.query<{ id: string }>(
          isEmail
            ? `SELECT id FROM users WHERE lower(email) = lower($1)`
            : `SELECT id FROM users WHERE lower(login_id) = lower($1)`,
          [ident],
        );

        let uid: string;
        let temp: string | null = null;
        if (found.rows[0]) {
          uid = found.rows[0].id;
          out.reused += 1;
        } else {
          temp = generateTempPassword();
          const hash = await hashPassword(temp);
          const made = await c.query<{ id: string }>(
            `INSERT INTO users (email, login_id, display_name, password_hash, must_reset_pw)
             VALUES ($1, $2, $3, $4, true) RETURNING id`,
            [isEmail ? ident : null, isEmail ? null : ident, name, hash],
          );
          uid = made.rows[0].id;
        }

        await c.query(
          `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'student')
           ON CONFLICT (user_id, org_id, role) DO NOTHING`,
          [uid, session.org_id],
        );

        // 이미 좌석이 있으면 다시 잡지 않는다. 빈 좌석이 없으면 여기서 멈춘다.
        const seat = await c.query<{ id: string }>(
          `UPDATE seats SET user_id = $2, assigned_at = now()
            WHERE id = (
              SELECT s.id FROM seats s
               WHERE s.contract_id = $1
                 AND (s.user_id IS NULL OR s.user_id = $2)
               ORDER BY (s.user_id = $2) DESC, s.id
               LIMIT 1 FOR UPDATE SKIP LOCKED)
          RETURNING id`,
          [session.contract_id, uid],
        );
        if (!seat.rows[0]) throw new Error("남은 좌석이 없습니다.");

        await c.query(
          `INSERT INTO attempts (session_id, user_id, seat_id, status)
           VALUES ($1, $2, $3, 'ready')
           ON CONFLICT (session_id, user_id) DO UPDATE SET seat_id = EXCLUDED.seat_id`,
          [sessionId, uid, seat.rows[0].id],
        );

        if (temp) out.created.push({ name, loginId: ident, tempPassword: temp });
      });
    } catch (e) {
      out.skipped.push({
        line: `${name}, ${ident}`,
        why: e instanceof Error ? e.message : "등록하지 못했습니다.",
      });
    }
  }

  return out;
}

/**
 * 비밀번호 재발급.
 *
 * 임시 비밀번호를 저장하지 않으므로 "다시 보여주기" 는 없고 재발급만 있다.
 * 새 비밀번호를 넣고 must_reset_pw 를 다시 세워, 학생이 처음 들어올 때
 * 반드시 자기 것으로 바꾸게 한다. 이 회차 명단에 있는 학생만 가능하다.
 */
export async function reissuePassword(
  userId: string,
  sessionId: string,
  studentId: string,
): Promise<{ name: string; loginId: string; tempPassword: string }> {
  if (!(await canManage(userId, sessionId))) throw new Error("재발급 권한이 없습니다.");

  const student = await queryOne<{ id: string; name: string; ident: string }>(
    `SELECT u.id, u.display_name AS name, COALESCE(u.login_id, u.email) AS ident
       FROM attempts a JOIN users u ON u.id = a.user_id
      WHERE a.session_id = $1 AND u.id = $2`,
    [sessionId, studentId],
  );
  if (!student) throw new Error("이 회차 명단에 없는 학생입니다.");

  const temp = generateTempPassword();
  const hash = await hashPassword(temp);
  await query(
    `UPDATE users SET password_hash = $2, must_reset_pw = true WHERE id = $1`,
    [student.id, hash],
  );
  // 예전 재설정 링크가 살아 있으면 같이 끊는다. 재발급했는데 옛 링크로
  // 또 바꿀 수 있으면 담당자가 건네준 비밀번호가 조용히 무력해진다.
  await query(
    `UPDATE password_reset_tokens SET used_at = now()
      WHERE user_id = $1 AND used_at IS NULL`,
    [student.id],
  );

  return { name: student.name, loginId: student.ident, tempPassword: temp };
}

export async function releaseSession(userId: string, sessionId: string): Promise<void> {
  if (!(await canManage(userId, sessionId))) throw new Error("공개할 권한이 없습니다.");
  await query(
    `UPDATE test_sessions SET released_at = COALESCE(released_at, now())
      WHERE id = $1 AND kind = 'org'`,
    [sessionId],
  );
}
