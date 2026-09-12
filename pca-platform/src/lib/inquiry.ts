import { query, queryOne } from "@/lib/db";
import { INQUIRY_KINDS, type InquiryKind } from "@/lib/inquiry-types";

// 화면이 쓰는 값은 inquiry-types.ts 에 있다. 여기서 다시 내보내 부르는 쪽이 한 곳만 보게 한다
export * from "@/lib/inquiry-types";

export class InquiryError extends Error {}

/**
 * 문의.
 *
 * 메일 주소만 적어두지 않고 표를 만든 이유는, 주소만 적어두면 놓친 문의가 어디에
 * 있는지 아무도 모르기 때문이다. 들어온 것과 답한 것이 남아야 한다.
 *
 * 로그인을 요구하지 않는다. 결제가 막힌 사람은 로그인부터 막혀 있을 수 있고,
 * 그 사람이야말로 연락이 제일 급하다.
 */

export type InquiryRow = {
  id: string;
  kind: string;
  name: string;
  email: string;
  message: string;
  from_path: string | null;
  status: string;
  memo: string | null;
  created_at: string;
  answered_at: string | null;
  user_name: string | null;
};

export async function createInquiry(input: {
  userId: string | null;
  kind: string;
  name: string;
  email: string;
  message: string;
  fromPath: string | null;
}): Promise<void> {
  const kind = INQUIRY_KINDS.includes(input.kind as InquiryKind) ? input.kind : "general";
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (name.length < 1 || name.length > 60) throw new InquiryError("이름을 적어주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    throw new InquiryError("답을 받으실 이메일을 다시 확인해주세요.");
  }
  if (message.length < 10) throw new InquiryError("내용을 조금만 더 적어주세요. 열 자 이상이면 됩니다.");
  if (message.length > 4000) throw new InquiryError("4000자 안으로 적어주세요.");

  // 같은 사람이 같은 내용을 연달아 보내는 것만 막는다. 다른 내용은 막지 않는다 —
  // 답이 급한 사람에게 "잠시 후 다시"는 도움이 되지 않는다
  const dup = await queryOne<{ id: string }>(
    `SELECT id FROM inquiries
      WHERE email = $1 AND message = $2 AND created_at > now() - interval '10 minutes'
      LIMIT 1`,
    [email, message],
  );
  if (dup) throw new InquiryError("같은 내용이 방금 접수됐습니다. 답변을 기다려주세요.");

  await query(
    `INSERT INTO inquiries (user_id, kind, name, email, message, from_path)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.userId, kind, name, email, message, input.fromPath?.slice(0, 200) ?? null],
  );
}

/** 운영사 화면. 답하지 않은 것이 위로 온다 */
export async function inquiryList(openOnly = true): Promise<InquiryRow[]> {
  return query<InquiryRow>(
    `SELECT i.id, i.kind, i.name, i.email, i.message, i.from_path, i.status, i.memo,
            to_char(i.created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS created_at,
            to_char(i.answered_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS answered_at,
            u.display_name AS user_name
       FROM inquiries i
       LEFT JOIN users u ON u.id = i.user_id
      WHERE ($1::bool IS FALSE OR i.status = 'open')
      ORDER BY i.status = 'open' DESC, i.created_at DESC
      LIMIT 200`,
    [openOnly],
  );
}

export async function openInquiryCount(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM inquiries WHERE status = 'open'`,
  );
  return row?.n ?? 0;
}

export async function markAnswered(id: string, adminId: string, memo: string | null): Promise<void> {
  const rows = await query<{ id: string }>(
    `UPDATE inquiries
        SET status = 'done', answered_at = now(), answered_by = $2, memo = $3
      WHERE id = $1 AND status = 'open'
      RETURNING id`,
    [id, adminId, memo?.slice(0, 1000) ?? null],
  );
  if (rows.length === 0) throw new InquiryError("이미 처리한 문의입니다.");
}
