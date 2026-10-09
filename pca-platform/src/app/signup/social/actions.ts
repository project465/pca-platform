"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { randomBytes } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { signIn } from "@/lib/auth";
import { linkAccount, PROVIDER_LABEL, resolveIdentity } from "@/lib/auth-accounts";
import { open as openPending } from "@/lib/oauth-pending";
import { record as consentRecord } from "@/lib/consent";
import { resolveLang } from "@/lib/locale-server";
import { enqueue } from "@/lib/outbox";
import { safeNext } from "@/lib/safe-next";

export type SocialState = { message?: string };

/**
 * 소셜로 처음 들어온 사람의 계정을 **동의를 받은 뒤에** 만든다.
 *
 * 콜백에서 바로 만들지 않는 까닭이 이것이다. 가입 화면은 필수 동의를
 * 받고 빠지면 가입을 통째로 되돌리는데, 소셜이라고 그 자리를 건너뛰면
 * **동의 없는 계정**이 생긴다. 받는 동의가 같아야 두 길이 같은 계정을
 * 만든 것이 된다.
 *
 * **비밀번호를 만들어 주지 않는다.** `users.password_hash` 가
 * `NOT NULL` 이라 무언가는 들어가야 하므로 **아무 비밀번호와도 맞지 않는
 * 임의의 해시**를 넣고 `pw_login = false` 로 그 사실을 적는다. 임시
 * 비밀번호를 만들어 메일로 보내면 그 메일이 곧 열쇠가 되고, 소셜
 * 로그인을 붙인 까닭이 사라진다.
 */
export async function createSocialAccount(
  _prev: SocialState, form: FormData,
): Promise<SocialState> {
  const token = String(form.get("t") ?? "");
  const id = openPending(token);
  /* 봉투가 상했거나 십 분이 지났다. **왜인지는 가르지 않는다** */
  if (!id) redirect("/login?error=oauth_expired");

  /* **봉투를 믿되 그 사이에 달라진 것은 다시 본다.** 동의문을 읽는
     동안 같은 신원으로 계정이 생겼을 수 있다 */
  const again = await resolveIdentity(id);
  if (again.kind === "linked") {
    /* 이미 있다. 만들지 않고 들여보낸다 */
    return finish(id.provider, id.subject, form);
  }
  if (again.kind === "conflict") redirect(`/login/link?p=${id.provider}`);

  const lang2 = (await resolveLang().catch(() => "ko")) === "en" ? "en" : "ko";

  /* 아무 비밀번호와도 맞지 않는 해시. **적어 둔 값이 아니라 그 자리에서
     버리는 값이다** */
  const unusable = await hashPassword(randomBytes(32).toString("base64url"));
  const name = (id.name ?? "").trim() || PROVIDER_LABEL[id.provider];

  /* **이메일을 유일 열쇠로 쓰지 않는다.** 애플의 가려 준 주소는 들어
     오고, 확인 안 된 주소는 여기 들어오지 않는다. 같은 주소의 계정이
     있으면 위에서 이미 `conflict` 로 갈렸다 */
  const created = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash,
                        must_reset_pw, status, pw_login)
     VALUES ($1, $2, $3, false, 'active', false)
     RETURNING id::text`,
    [id.email, name, unusable],
  );
  if (!created) return { message: "계정을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };

  /* **필수가 빠지면 가입을 되돌린다.** 화면의 `required` 는 안내이고
     막는 것은 여기다(가입 화면과 같은 규칙) */
  const agreed = form.getAll("consent").map(String).filter(Boolean);
  const saved = await consentRecord({
    userId: created.id, locale: lang2, siteId: null, agreedIds: agreed,
  });
  if (!saved.ok) {
    await query(`DELETE FROM users WHERE id = $1`, [created.id]).catch(() => undefined);
    return { message: saved.reason };
  }

  const linked = await linkAccount(created.id, id);
  if (!linked.ok) {
    await query(`DELETE FROM users WHERE id = $1`, [created.id]).catch(() => undefined);
    redirect(`/login/link?p=${id.provider}`);
  }

  /* 인사 한 줄. **메일 서버를 여기서 기다리지 않는다** */
  if (id.email) {
    await enqueue({
      kind: "signup",
      userId: created.id,
      toAddr: id.email,
      dedupeKey: `signup:${created.id}`,
      locale: lang2,
    });
  }

  return finish(id.provider, id.subject, form);
}

/**
 * 만들었으면 그 자리에서 로그인시킨다.
 *
 * "가입됐습니다. 다시 로그인하세요" 는 이탈이다(가입 화면과 같은 규칙).
 * 이제 `auth_accounts` 에 줄이 있으므로 같은 공급자로 한 번 더 돌면
 * `signIn` 콜백이 `linked` 로 받는다.
 */
async function finish(
  provider: string, _subject: string, form: FormData,
): Promise<SocialState> {
  const next = safeNext(String(form.get("next") ?? ""), "/me");
  try {
    await signIn(provider, { redirectTo: next });
  } catch (e) {
    /* `redirect()` 가 던지는 것은 그대로 흘려보낸다 */
    if (e instanceof AuthError) {
      return { message: "로그인을 마치지 못했습니다. 로그인 화면에서 다시 시도해 주세요." };
    }
    throw e;
  }
  return {};
}
