import { query, queryOne } from "@/lib/db";

/**
 * 매트의 사람별 설정.
 *
 * **동의는 사람이 눌러야 생긴다.** 붙여 넣은 글을 Claude 로 보내는 것은
 * 그 글이 나라 밖(Anthropic, 미국)으로 나간다는 뜻이라, 켜 둔 채로 두지
 * 않는다. 동의하지 않은 분의 글은 규칙으로만 읽고 밖으로 나가지 않는다.
 */
export type AssistantSettings = {
  ai_consent_at: string | null;
  email_digest: boolean;
};

export async function settingsOf(userId: string): Promise<AssistantSettings> {
  const r = await queryOne<AssistantSettings>(
    `SELECT ai_consent_at::text, email_digest FROM assistant_settings WHERE user_id = $1`,
    [userId]).catch(() => null);
  return r ?? { ai_consent_at: null, email_digest: false };
}

export async function aiConsented(userId: string): Promise<boolean> {
  return Boolean((await settingsOf(userId)).ai_consent_at);
}

export async function setAiConsent(userId: string, on: boolean): Promise<void> {
  await query(
    `INSERT INTO assistant_settings (user_id, ai_consent_at, updated_at)
     VALUES ($1, CASE WHEN $2 THEN now() END, now())
     ON CONFLICT (user_id) DO UPDATE
       SET ai_consent_at = CASE WHEN $2 THEN now() END, updated_at = now()`,
    [userId, on]);
}

export async function setEmailDigest(userId: string, on: boolean): Promise<void> {
  await query(
    `INSERT INTO assistant_settings (user_id, email_digest, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET email_digest = $2, updated_at = now()`,
    [userId, on]);
}
