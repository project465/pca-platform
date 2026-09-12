import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { query, queryOne } from "@/lib/db";

export class AccountError extends Error {}

/**
 * 멘토 지급 계좌.
 *
 * 정산 금액은 계산되는데 보낼 곳이 없었다. 그 구멍을 메우는 자리다.
 *
 * 주민등록번호는 소득세법상 원천징수 신고에 필요해서 받는다. 그런데 평문으로
 * 두면 DB 백업 한 장이 그대로 사고가 된다. 그래서 암호문만 저장하고,
 * 키(PAYOUT_SECRET)가 없으면 아예 받지 않는다 — 키 없이 평문으로 받아두고
 * 나중에 암호화하자는 선택지는 두지 않았다.
 *
 * 계좌번호는 암호화하지 않는다. 운영자가 이체할 때마다 봐야 하고, 복호화 키를
 * 매번 꺼내는 구조는 결국 키를 아무 데나 두게 만든다. 대신 이 표를 갤러리·상세가
 * 읽지 않도록 mentors 와 분리했다.
 */

export type PayoutAccount = {
  bank: string;
  account_no: string;
  holder: string;
  rrn_tail: string | null;
  has_rrn: boolean;
  updated_at: string;
};

function key(): Buffer | null {
  const secret = process.env.PAYOUT_SECRET;
  if (!secret || secret.length < 16) return null;
  // 소금을 고정한다. 같은 비밀에서 늘 같은 키가 나와야 예전 암호문을 읽을 수 있다
  return scryptSync(secret, "pca-payout", 32);
}

export function rrnSupported(): boolean {
  return key() !== null;
}

/** iv:tag:cipher 를 base64 로 이어 붙인다 */
function encrypt(plain: string): string {
  const k = key();
  if (!k) throw new AccountError("암호화 키(PAYOUT_SECRET)가 없어 주민등록번호를 받을 수 없습니다.");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64")).join(":");
}

/** 원천징수 신고서를 만들 때만 부른다. 화면에는 내려보내지 않는다 */
export function decrypt(stored: string): string {
  const k = key();
  if (!k) throw new AccountError("암호화 키(PAYOUT_SECRET)가 없어 복호화할 수 없습니다.");
  const [iv, tag, body] = stored.split(":").map((s) => Buffer.from(s, "base64"));
  const d = createDecipheriv("aes-256-gcm", k, iv);
  d.setAuthTag(tag);
  return d.update(body).toString("utf8") + d.final("utf8");
}

const BANKS = [
  "국민", "신한", "우리", "하나", "농협", "기업", "카카오뱅크", "토스뱅크",
  "케이뱅크", "SC제일", "씨티", "새마을금고", "신협", "우체국", "부산", "대구",
  "경남", "광주", "전북", "제주", "수협", "산업",
];
export const BANK_LIST = BANKS;

/** 주민등록번호 검증. 형식과 체크섬까지 본다 — 오타 하나로 신고가 반려된다 */
function validRrn(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;
  const w = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * w[i];
  return (11 - (sum % 11)) % 10 === Number(digits[12]);
}

export async function accountOf(mentorId: string): Promise<PayoutAccount | null> {
  return queryOne<PayoutAccount>(
    `SELECT bank, account_no, holder, rrn_tail,
            (rrn_enc IS NOT NULL) AS has_rrn,
            to_char(updated_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS updated_at
       FROM mentor_payout_accounts WHERE mentor_id = $1`,
    [mentorId],
  );
}

export async function saveAccount(input: {
  mentorId: string;
  bank: string;
  accountNo: string;
  holder: string;
  /** 빈 문자열이면 건드리지 않는다. 이미 넣은 값을 다시 타이핑하게 만들지 않는다 */
  rrn: string;
}): Promise<void> {
  const bank = input.bank.trim();
  const holder = input.holder.trim();
  const accountNo = input.accountNo.replace(/\s/g, "");

  if (!BANKS.includes(bank)) throw new AccountError("은행을 골라주세요.");
  if (!/^[\d-]{8,20}$/.test(accountNo)) throw new AccountError("계좌번호는 숫자와 하이픈만 씁니다.");
  if (holder.length < 2 || holder.length > 30) throw new AccountError("예금주를 적어주세요.");

  let rrnEnc: string | null = null;
  let rrnTail: string | null = null;
  const rrn = input.rrn.replace(/[\s-]/g, "");
  if (rrn) {
    if (!rrnSupported()) {
      throw new AccountError(
        "주민등록번호를 안전하게 보관할 준비가 되지 않았습니다. 운영사에 문의해주세요.",
      );
    }
    if (!validRrn(rrn)) throw new AccountError("주민등록번호를 다시 확인해주세요.");
    rrnEnc = encrypt(rrn);
    rrnTail = rrn.slice(-1);
  }

  await query(
    `INSERT INTO mentor_payout_accounts
       (mentor_id, bank, account_no, holder, rrn_enc, rrn_tail, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (mentor_id) DO UPDATE
       SET bank = EXCLUDED.bank,
           account_no = EXCLUDED.account_no,
           holder = EXCLUDED.holder,
           -- 새로 적지 않았으면 있던 것을 지우지 않는다
           rrn_enc = COALESCE(EXCLUDED.rrn_enc, mentor_payout_accounts.rrn_enc),
           rrn_tail = COALESCE(EXCLUDED.rrn_tail, mentor_payout_accounts.rrn_tail),
           updated_at = now()`,
    [input.mentorId, bank, accountNo, holder, rrnEnc, rrnTail],
  );
}

/** 정산 화면에서 "보낼 곳이 있는가"를 한 번에 본다 */
export async function accountsFor(
  mentorIds: string[],
): Promise<Map<string, PayoutAccount>> {
  const out = new Map<string, PayoutAccount>();
  if (mentorIds.length === 0) return out;
  const rows = await query<PayoutAccount & { mentor_id: string }>(
    `SELECT mentor_id, bank, account_no, holder, rrn_tail,
            (rrn_enc IS NOT NULL) AS has_rrn,
            to_char(updated_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS updated_at
       FROM mentor_payout_accounts WHERE mentor_id = ANY($1::bigint[])`,
    [mentorIds],
  );
  for (const r of rows) out.set(r.mentor_id, r);
  return out;
}
