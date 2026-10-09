/**
 * 소셜 로그인과 **같은 사람인가.**
 *
 * 로그인 방법을 하나 더 여는 일에서 가장 비싼 실수는 로그인이 안 되는
 * 것이 아니라 **같은 사람이 둘로 갈리는 것**이다. 갈리면 주문은 이쪽에,
 * 응시와 결과지는 저쪽에 남고, 그 사람은 돈을 내고 아무것도 못 본다.
 * 되돌리려면 사람이 손으로 붙여야 하는데 붙이는 코드는 가장 위험한
 * 코드다. 그래서 **갈리지 않게 막는 쪽**에 전부를 건다.
 *
 * 규칙 넷.
 *
 *   ① 사람을 찾는 열쇠는 공급자의 `sub` 이다(`auth_accounts`).
 *      이메일로 찾지 않는다: 이메일은 바뀌고, 애플은 가려 준 주소를
 *      주고, 같은 주소를 나중에 다른 사람이 받을 수 있다.
 *   ② **이메일이 같다고 자동으로 합치지 않는다.** 합치면 남의 주소를
 *      공급자에 등록한 사람이 남의 계정을 가져간다. 주소가 같으면
 *      "이미 계정이 있습니다" 로 멈추고, **그 계정으로 들어와서** 연결
 *      하게 한다. 그것이 소유를 증명하는 유일한 길이다.
 *   ③ 공급자가 확인하지 않은 이메일은 주소로 치지 않는다.
 *   ④ 처음 들어온 사람은 **동의를 받은 뒤에** 만든다. 가입 화면이
 *      받는 것을 소셜이라고 건너뛰면 동의 없는 계정이 생긴다.
 *
 * 되돌릴 수 있는 쪽으로만 틀린다: 못 들어오면 그날 문의가 오고, 남의
 * 계정으로 들어가면 아무도 모른다.
 */
import { query, queryOne } from "@/lib/db";

export type Provider = "google" | "apple";

export const PROVIDER_LABEL: Record<Provider, string> = {
  google: "Google",
  apple: "Apple",
};

export function isProvider(x: string): x is Provider {
  return x === "google" || x === "apple";
}

export type LinkedAccount = {
  provider: Provider;
  email: string | null;
  created_at: string;
};

/** 공급자가 건네준 신원. **열쇠(token)는 받지 않는다** */
export type ProviderIdentity = {
  provider: Provider;
  /** 공급자의 `sub`. 사람을 찾는 유일한 열쇠 */
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

/**
 * 이 신원이 누구인가.
 *
 *   linked     이 `sub` 에 붙은 계정이 있다 → 그 사람이다
 *   conflict   붙은 계정은 없는데 **확인된 같은 주소의 계정**이 있다
 *              → 자동으로 합치지 않는다. 그 계정으로 들어와 연결하게 한다
 *   fresh      아무것도 없다 → 동의를 받고 새로 만든다
 */
export type Resolution =
  | { kind: "linked"; userId: string; status: string }
  | { kind: "conflict"; email: string }
  | { kind: "fresh" };

export async function resolveIdentity(id: ProviderIdentity): Promise<Resolution> {
  const hit = await queryOne<{ user_id: string; status: string }>(
    `SELECT a.user_id::text AS user_id, u.status
       FROM auth_accounts a JOIN users u ON u.id = a.user_id
      WHERE a.provider = $1 AND a.provider_account_id = $2`,
    [id.provider, id.subject],
  );
  if (hit) return { kind: "linked", userId: hit.user_id, status: hit.status };

  /* **공급자가 확인하지 않은 주소는 주소로 치지 않는다.** 확인 안 된
     주소로 같은 계정을 찾으면, 남의 주소를 적어 둔 계정이 남의 것을
     가리키게 된다 */
  if (id.email && id.emailVerified) {
    const same = await queryOne<{ id: string }>(
      `SELECT id::text FROM users WHERE lower(email) = lower($1)`, [id.email]);
    if (same) return { kind: "conflict", email: id.email };
  }
  return { kind: "fresh" };
}

/** 로그인한 자리를 적는다. **실패해도 로그인을 막지 않는다** */
export async function markLogin(provider: Provider, subject: string): Promise<void> {
  await query(
    `UPDATE auth_accounts SET last_login_at = now()
      WHERE provider = $1 AND provider_account_id = $2`,
    [provider, subject],
  ).catch(() => undefined);
  await query(
    `UPDATE users SET last_login_at = now()
      WHERE id = (SELECT user_id FROM auth_accounts
                   WHERE provider = $1 AND provider_account_id = $2)`,
    [provider, subject],
  ).catch(() => undefined);
}

/**
 * 이 사람에게 로그인 방법을 하나 붙인다.
 *
 * **두 번 눌러도 둘이 생기지 않는다.** `(provider, sub)` 에 유일 제약이
 * 걸려 있고 DB 가 두 번째를 거절한다(코드의 `if` 가 아니다).
 *
 * **이미 남에게 붙어 있으면 거절한다.** 그 경우에 덮어쓰면 그 순간
 * 남의 계정을 빼앗는 코드가 된다.
 */
export async function linkAccount(
  userId: string, id: ProviderIdentity,
): Promise<{ ok: true } | { ok: false; reason: "taken" }> {
  const owner = await queryOne<{ user_id: string }>(
    `SELECT user_id::text AS user_id FROM auth_accounts
      WHERE provider = $1 AND provider_account_id = $2`,
    [id.provider, id.subject],
  );
  if (owner && owner.user_id !== userId) return { ok: false, reason: "taken" };
  if (owner) return { ok: true };

  await query(
    `INSERT INTO auth_accounts
       (user_id, provider, provider_account_id, email, email_verified, last_login_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (provider, provider_account_id) DO NOTHING`,
    [userId, id.provider, id.subject, id.email, id.emailVerified],
  );
  return { ok: true };
}

/**
 * 이 사람이 지금 들고 있는 로그인 방법.
 *
 * `/my` 의 `로그인 방법` 이 읽는다. **연결을 끊는 함수는 두지 않는다**:
 * 마지막 하나를 끊으면 그 사람이 다시는 못 들어오고, 그 상태를 되돌릴
 * 길이 화면에 없다. 끊기는 지금 만들지 않는 쪽이 맞다.
 */
export async function accountsOf(userId: string): Promise<LinkedAccount[]> {
  const rows = await query<{ provider: string; email: string | null; created_at: Date }>(
    `SELECT provider, email, created_at FROM auth_accounts
      WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  ).catch(() => []);
  return rows
    .filter((r) => isProvider(r.provider))
    .map((r) => ({
      provider: r.provider as Provider,
      email: r.email,
      created_at: new Date(r.created_at).toISOString().slice(0, 10),
    }));
}

/** 비밀번호로도 들어올 수 있는 계정인가 */
export async function hasPasswordLogin(userId: string): Promise<boolean> {
  const r = await queryOne<{ pw: boolean }>(
    `SELECT pw_login AS pw FROM users WHERE id = $1`, [userId]);
  return r?.pw ?? true;
}
