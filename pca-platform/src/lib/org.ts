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
};

/**
 * 명단을 붙여넣어 계정을 한 번에 만든다. 한 줄에 "이름, 학번" 또는 "이름, 이메일".
 *
 * 임시 비밀번호는 여기서 한 번만 보여주고 저장하지 않는다. 해시만 남는다.
 * 담당자가 그 화면을 닫으면 다시 볼 수 없고, 재발급만 된다.
 */
export async function enrollRoster(
  userId: string,
  sessionId: string,
  raw: string,
): Promise<EnrollResult> {
  if (!(await canManage(userId, sessionId))) throw new Error("명단을 올릴 권한이 없습니다.");

  const session = await queryOne<{ org_id: string; contract_id: string }>(
    `SELECT org_id, contract_id FROM test_sessions WHERE id = $1`,
    [sessionId],
  );
  if (!session?.contract_id) throw new Error("계약이 붙어 있지 않은 회차입니다.");

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 1000);

  const out: EnrollResult = { created: [], reused: 0, skipped: [] };

  for (const line of lines) {
    const parts = line.split(/[,\t]/).map((x) => x.trim());
    const name = parts[0];
    const ident = parts[1];
    if (!name || !ident) {
      out.skipped.push({ line, why: "이름과 학번(또는 이메일)을 쉼표로 나눠 적어 주세요." });
      continue;
    }
    const isEmail = ident.includes("@");

    try {
      await tx(async (c) => {
        const found = await c.query<{ id: string }>(
          isEmail ? `SELECT id FROM users WHERE email = $1` : `SELECT id FROM users WHERE login_id = $1`,
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
      out.skipped.push({ line, why: e instanceof Error ? e.message : "등록하지 못했습니다." });
    }
  }

  return out;
}

export async function releaseSession(userId: string, sessionId: string): Promise<void> {
  if (!(await canManage(userId, sessionId))) throw new Error("공개할 권한이 없습니다.");
  await query(
    `UPDATE test_sessions SET released_at = COALESCE(released_at, now())
      WHERE id = $1 AND kind = 'org'`,
    [sessionId],
  );
}
