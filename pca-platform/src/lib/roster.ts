import { queryOne, tx } from "@/lib/db";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { readSheet, SheetError } from "@/lib/sheet";
import {
  CHUNK_SIZE,
  type IssueResult,
  type RosterEntry,
  type RosterParse,
} from "@/lib/roster-types";

export { CHUNK_SIZE };
export type { IssueResult, RosterEntry, RosterParse };

/**
 * 명단을 읽어 계정을 일괄 발급한다.
 *
 * 비밀번호 해싱이 1건당 0.4초쯤 걸린다(bcryptjs 12라운드). 100명을 한 요청에서
 * 처리하면 40초를 기다리게 되고, 중간에 끊기면 어디까지 됐는지 알 수 없다.
 * 그래서 발급은 작은 묶음으로 나눠 부르고(issueChunk), 화면이 진행률을 보여준다.
 * 라운드 수를 낮추면 빨라지지만 그건 보안 설정이라 여기서 정할 일이 아니다.
 *
 * 한 사람당 하는 일
 *   1. users — 없으면 만들고(임시 비밀번호·첫 로그인 변경 강제), 있으면 그대로 쓴다
 *   2. memberships — 그 학과의 student 로 넣는다
 *   3. seats — 계약의 남은 응시권 하나를 배정한다
 *   4. attempts — 그 회차의 응시 행을 만든다(status=ready)
 */

const HEAD_LOGIN = ["학번", "아이디", "id", "login", "loginid", "학생번호", "사번"];
const HEAD_NAME = ["이름", "성명", "name", "학생명"];
const HEAD_EMAIL = ["이메일", "메일", "email", "e-mail"];

function matchHeader(cell: string, keys: string[]): boolean {
  const v = cell.toLowerCase().replace(/[\s_]/g, "");
  return keys.some((k) => v === k || v.includes(k));
}

const LOGIN_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 표를 명단으로 해석한다.
 * 머리글이 있으면 그 줄을 보고 열을 정하고, 없으면 학번·이름·이메일 순서로 본다.
 */
export function parseRoster(rows: string[][]): RosterParse {
  const errors: string[] = [];
  const firstIdx = rows.findIndex((r) => r.some((c) => c.trim() !== ""));
  if (firstIdx < 0) return { entries: [], errors: ["빈 파일입니다."], columns: { loginId: 0, name: 1, email: 2 } };

  const head = rows[firstIdx];
  const loginCol = head.findIndex((c) => matchHeader(c, HEAD_LOGIN));
  const nameCol = head.findIndex((c) => matchHeader(c, HEAD_NAME));
  const emailCol = head.findIndex((c) => matchHeader(c, HEAD_EMAIL));

  const hasHeader = loginCol >= 0 && nameCol >= 0;
  const columns = hasHeader
    ? { loginId: loginCol, name: nameCol, email: emailCol >= 0 ? emailCol : null }
    : { loginId: 0, name: 1, email: 2 };

  const start = hasHeader ? firstIdx + 1 : firstIdx;
  const entries: RosterEntry[] = [];
  const seen = new Map<string, number>();

  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;
    const loginId = (row[columns.loginId] ?? "").trim();
    const name = (row[columns.name] ?? "").trim();
    const emailRaw = columns.email !== null ? (row[columns.email] ?? "").trim() : "";

    // 아무것도 없는 줄은 조용히 건너뛴다. 엑셀 파일 끝에 흔하다.
    if (!loginId && !name && !emailRaw) continue;

    if (!loginId) {
      errors.push(`${line}행: 학번이 비어 있습니다.`);
      continue;
    }
    if (!LOGIN_RE.test(loginId)) {
      errors.push(`${line}행: 학번 "${loginId}" 은(는) 영문·숫자·하이픈·밑줄 2~40자여야 합니다.`);
      continue;
    }
    if (!name) {
      errors.push(`${line}행: 이름이 비어 있습니다. (${loginId})`);
      continue;
    }
    if (name.length > 50) {
      errors.push(`${line}행: 이름이 너무 깁니다. (${loginId})`);
      continue;
    }
    if (emailRaw && !EMAIL_RE.test(emailRaw)) {
      errors.push(`${line}행: 이메일 "${emailRaw}" 형식이 올바르지 않습니다.`);
      continue;
    }

    const dup = seen.get(loginId);
    if (dup !== undefined) {
      errors.push(`${line}행: 학번 ${loginId} 이(가) ${dup}행과 겹칩니다.`);
      continue;
    }
    seen.set(loginId, line);
    entries.push({ line, loginId, name, email: emailRaw || null });
  }

  if (entries.length === 0 && errors.length === 0) errors.push("읽을 수 있는 줄이 없습니다.");
  return { entries, errors, columns };
}

export function parseRosterFile(fileName: string, buf: Buffer): RosterParse {
  try {
    return parseRoster(readSheet(fileName, buf));
  } catch (e) {
    if (e instanceof SheetError) return { entries: [], errors: [e.message], columns: { loginId: 0, name: 1, email: 2 } };
    throw e;
  }
}

export class RosterError extends Error {}

export type SessionForIssue = {
  session_id: string;
  org_id: string;
  contract_id: string;
  session_name: string;
  closes_at: string;
  free_seats: number;
};

export async function sessionForIssue(sessionId: string): Promise<SessionForIssue | null> {
  return queryOne<SessionForIssue>(
    `SELECT ts.id AS session_id, ts.org_id, ts.contract_id, ts.name AS session_name,
            ts.closes_at::text,
            (SELECT count(*) FROM seats s
              WHERE s.contract_id = ts.contract_id AND s.user_id IS NULL)::int AS free_seats
       FROM test_sessions ts
      WHERE ts.id = $1`,
    [sessionId],
  );
}

/**
 * 한 묶음을 발급한다. 화면이 CHUNK_SIZE 만큼 잘라 여러 번 부른다.
 *
 * 해싱은 트랜잭션 밖에서 먼저 끝낸다. 0.4초짜리 작업을 트랜잭션 안에서 하면
 * 그동안 행 잠금과 커넥션을 붙잡고 있게 된다.
 */
export async function issueChunk(input: {
  sessionId: string;
  entries: RosterEntry[];
}): Promise<IssueResult[]> {
  if (input.entries.length === 0) return [];
  if (input.entries.length > CHUNK_SIZE) {
    throw new RosterError(`한 번에 ${CHUNK_SIZE}명까지 발급합니다.`);
  }

  const session = await sessionForIssue(input.sessionId);
  if (!session) throw new RosterError("회차를 찾을 수 없습니다.");

  // 이미 있는 계정은 비밀번호를 만들지 않는다. 남의 비밀번호를 바꾸는 일이 된다.
  const existing = await queryOne<{ ids: string[] }>(
    `SELECT COALESCE(array_agg(login_id), '{}') AS ids
       FROM users WHERE login_id = ANY($1::text[])`,
    [input.entries.map((e) => e.loginId)],
  );
  const known = new Set(existing?.ids ?? []);
  const fresh = input.entries.filter((e) => !known.has(e.loginId));

  if (fresh.length > session.free_seats) {
    throw new RosterError(
      `남은 응시권이 ${session.free_seats}개뿐입니다. 새로 발급할 계정은 ${fresh.length}명입니다.`,
    );
  }

  const temp = new Map<string, { plain: string; hash: string }>();
  await Promise.all(
    fresh.map(async (e) => {
      const plain = generateTempPassword();
      temp.set(e.loginId, { plain, hash: await hashPassword(plain) });
    }),
  );

  return tx(async (c) => {
    const out: IssueResult[] = [];

    for (const e of input.entries) {
      const made = temp.get(e.loginId);

      const user = await c.query<{ id: string }>(
        `INSERT INTO users (login_id, email, display_name, password_hash, must_reset_pw)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (login_id) DO UPDATE
           -- 이름과 이메일은 명단을 최신으로 본다. 비밀번호는 건드리지 않는다.
           SET display_name = EXCLUDED.display_name,
               email = COALESCE(EXCLUDED.email, users.email)
         RETURNING id`,
        [e.loginId, e.email, e.name, made?.hash ?? "-"],
      );
      const userId = user.rows[0].id;

      await c.query(
        `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'student')
         ON CONFLICT (user_id, org_id, role) DO NOTHING`,
        [userId, session.org_id],
      );

      // 이 회차에 이미 배정된 응시권이 있으면 그것을 쓴다. 두 번 올려도 두 장 쓰지 않는다.
      const seat = await c.query<{ id: string }>(
        `WITH mine AS (
           SELECT s.id FROM seats s
             JOIN attempts a ON a.seat_id = s.id AND a.session_id = $3
            WHERE s.contract_id = $1 AND s.user_id = $2
            LIMIT 1
         ), taken AS (
           UPDATE seats SET user_id = $2, assigned_at = now()
            WHERE id = (SELECT id FROM seats
                         WHERE contract_id = $1 AND user_id IS NULL
                         ORDER BY id
                         FOR UPDATE SKIP LOCKED
                         LIMIT 1)
              AND NOT EXISTS (SELECT 1 FROM mine)
            RETURNING id
         )
         SELECT id FROM mine UNION ALL SELECT id FROM taken`,
        [session.contract_id, userId, input.sessionId],
      );
      const seatId = seat.rows[0]?.id ?? null;
      if (!seatId) throw new RosterError("남은 응시권이 없습니다. 계약의 좌석 수를 늘려야 합니다.");

      await c.query(
        `INSERT INTO attempts (session_id, user_id, seat_id) VALUES ($1, $2, $3)
         ON CONFLICT (session_id, user_id) DO NOTHING`,
        [input.sessionId, userId, seatId],
      );

      out.push({
        loginId: e.loginId,
        name: e.name,
        tempPassword: made?.plain ?? null,
        status: made ? "created" : "reused",
      });
    }

    return out;
  });
}
