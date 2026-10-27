import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import LoginForm from "./login-form";
import OauthButtons from "./oauth-buttons";
import EntryFrame from "@/components/sf/entry-frame";
import PublicFooter from "@/components/sf/public-footer";
import { enabledProviders } from "@/lib/auth-oauth";
import { safeNext } from "@/lib/safe-next";
import { resolveLang } from "@/lib/locale-server";
import { entrySay } from "@/lib/entry-say";

export async function generateMetadata() {
  const say = entrySay(await resolveLang().catch(() => "ko"));
  return { title: say("로그인 · CareerMatri") };
}

/**
 * 소셜 로그인이 끊긴 자리마다 **사람이 읽을 수 있는 한 줄.**
 *
 * 공급자 쪽에서 돌아오는 길은 여러 갈래로 끊긴다: 사람이 취소했고,
 * 공급자가 거절했고, 설정이 안 꽂혀 있고, 봉투가 상했다. **날것의
 * 오류를 보여 주지 않는다**: `OAuthCallbackError` 를 읽은 사람은 자기가
 * 무엇을 해야 하는지 모른다.
 *
 * 그리고 **어느 경우에도 다른 길을 같이 적는다.** 소셜이 막힌 날 비밀번호
 * 로그인이 그대로 있다는 것을 모르면 그 사람은 그냥 나간다.
 */
const ERRORS: Record<string, string> = {
  oauth_profile:
    "로그인 정보를 다 받지 못했습니다. 다시 눌러 보시고, 그래도 안 되면"
    + " 아래 이메일 로그인을 쓰실 수 있습니다.",
  oauth_expired:
    "가입을 마치는 데 시간이 조금 지났습니다. 다시 눌러 주십시오.",
  account_inactive:
    "이 계정은 지금 이용이 멈춰 있습니다. 고객지원으로 알려 주십시오.",
  provider_off:
    "그 로그인 방법은 지금 켜져 있지 않습니다. 이메일로 들어오실 수 있습니다.",
  /* Auth.js 가 제 오류 이름으로 돌려보내는 것들 */
  OAuthCallback:
    "로그인 공급자에서 돌아오는 길이 끊겼습니다. 다시 눌러 주십시오.",
  OAuthAccountNotLinked:
    "이 이메일로 만들어진 계정이 이미 있습니다. 쓰시던 방법으로 들어오신 뒤"
    + " 계정 화면에서 연결해 주십시오.",
  AccessDenied:
    "로그인이 취소됐습니다. 다시 눌러 보시거나 이메일로 들어오실 수 있습니다.",
  Configuration:
    "로그인 설정에 문제가 있습니다. 이메일로 들어오시고, 이 사실을 알려 주십시오.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  /* 열린 리다이렉트를 막는 자리가 한 곳이다(`safe-next.ts`) */
  const nx = safeNext(next, "");
  /* **담당자로만 들어와 있으면 폼을 연다.** 담당자와 학생은 로그인을 따로
     들고 있어서(`auth.ts`), 같은 브라우저에서 학생 계정으로 들어가 볼 수
     있어야 한다. 담당자 화면으로 가려던 길이면 그대로 보낸다 */
  const who = await currentUser();
  if (who && (who.scope !== "staff" || /^\/(admin|org)(\/|\?|$)/.test(nx))) redirect(nx || "/");

  const providers = enabledProviders();
  /* **들어온 화면의 언어로 선다**(영어판 2단계). 해외 개인이 영어 가입
     화면에서 `로그인` 을 누르면 여기로 온다 */
  const lang = (await resolveLang().catch(() => "ko")) === "en" ? "en" : "ko";
  const say = entrySay(lang);
  const msg = error ? say(ERRORS[error] ?? ERRORS.OAuthCallback) : null;

  return (
    /* **작업공간 홈과 같은 톤으로 연다**(EntryFrame) */
    <EntryFrame lang={lang}>
      <div className="authwrap">
        <div className="panel narrow">
          <h1>{say("다시 오셨군요")}</h1>
          <p className="sub">
            {say("학교에서 받은 아이디나, 개인으로 가입하신 이메일로 들어오세요.")}
          </p>

          {msg ? <p className="notice error" role="alert">{msg}</p> : null}

          {/* **소셜을 위에 둔다.** 누르는 수가 적은 쪽이 위다. 다만
              단추를 광고처럼 키우지 않는다: 학교 계정으로 들어오는 분이
              아직 대부분이고, 그분들에게는 아래 칸이 유일한 길이다 */}
          {providers.length ? (
            <>
              <OauthButtons providers={providers} next={nx} lang={lang} />
              <div className="orline"><span>{say("또는")}</span></div>
            </>
          ) : null}

          <LoginForm next={nx} lang={lang} />

          <div className="foot-links">
            <Link href="/password/forgot">{say("비밀번호를 잊으셨나요?")}</Link>
            <Link href={`/signup${nx ? `?next=${encodeURIComponent(nx)}` : ""}`}>
              {say("개인으로 가입하기")}
            </Link>
          </div>
        </div>

        {/* 한 가지만 하는 쪽이라 법적 표시 전체는 두지 않는다. 약관과
            고객지원으로 가는 길만 남긴다 */}
        <PublicFooter lang={lang} compact />
      </div>
    </EntryFrame>
  );
}
