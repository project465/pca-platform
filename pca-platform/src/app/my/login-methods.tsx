import {
  accountsOf, hasPasswordLogin, PROVIDER_LABEL, type Provider,
} from "@/lib/auth-accounts";
import { enabledProviders, isPrivateRelay } from "@/lib/auth-oauth";
import { linkProvider } from "./link-actions";

const ALL: Provider[] = ["google", "apple"];

/**
 * **이 계정으로 들어오는 길이 지금 무엇인가.**
 *
 * 적어 두지 않으면 구글로 가입하신 분이 비밀번호 찾기를 누르고, 메일이
 * 오지 않는 까닭을 모른 채 기다린다.
 *
 * **끊는 단추를 두지 않는다.** 마지막 하나를 끊으면 그 사람이 다시는
 * 못 들어오고, 그 상태를 되돌릴 길이 화면에 없다. 끊기를 안전하게
 * 만들려면 "비밀번호가 있거나 다른 방법이 하나 더 있을 때만" 같은
 * 조건이 필요한데, 그 조건을 한 번 틀리면 사람을 잠근다. 붙이는 것만
 * 두고 끊기는 고객지원으로 보낸다.
 */
export default async function LoginMethods({
  userId, notice, lang = "ko", issued = false,
}: {
  userId: string; notice?: string; lang?: "ko" | "en";
  /** 학교 · 기관이 발급한 계정이면 소셜 로그인 줄을 세우지 않는다(발급한 아이디로만 들어온다) */
  issued?: boolean;
}) {
  const en = lang === "en";
  const [linked, pw] = await Promise.all([
    accountsOf(userId), hasPasswordLogin(userId),
  ]);
  const on = enabledProviders();
  const have = new Set(linked.map((l) => l.provider));

  /* 상태는 문장 말고 오른쪽 이름표로(2026-11-03 대표 "AI느낌"): 사용 중 · 연결됨 · 연결 안 됨 · 꺼짐 */
  const rows: { k: string; v: string; on: boolean }[] = [
    {
      k: en ? "Email or ID" : "이메일 · 아이디 로그인",
      v: pw ? (en ? "In use" : "사용 중") : (en ? "Not in use" : "꺼짐"),
      on: pw,
    },
    ...(issued ? [] : ALL).map((p) => ({
      on: have.has(p),
      k: en ? PROVIDER_LABEL[p] : `${PROVIDER_LABEL[p]} 로그인`,
      v: have.has(p)
        ? `${en ? "Connected" : "연결됨"}${(() => {
          const row = linked.find((l) => l.provider === p);
          if (!row?.email) return "";
          /* 애플이 가려 준 주소라는 것을 적는다. 적지 않으면 모르는
             주소를 보고 자기 계정이 아니라고 읽는다 */
          return isPrivateRelay(row.email)
            ? (en ? " · address hidden by Apple" : " · 애플이 가려 준 주소") : ` · ${row.email}`;
        })()}`
        : on.includes(p) ? (en ? "Not connected" : "연결 안 됨")
        : (en ? "Off" : "꺼짐"),
    })),
  ];

  return (
    <section className="cm-card is-wide">
      <h2>{en ? "Sign-in methods" : "로그인 방법"}</h2>
      {notice ? <p className="cm-note">{notice}</p> : null}
      <dl className="cm-dl">
        {rows.map((r) => (
          <div key={r.k}>
            <dt>{r.k}</dt>
            <dd><span className={`cm-dot${r.on ? " is-on" : ""}`}>{r.v}</span></dd>
          </div>
        ))}
      </dl>

      {/* 붙일 수 있는 것만 단추로 세운다. 켜지지 않은 공급자에 단추를
          달면 누른 사람이 공급자 쪽 오류 화면에서 끝난다 */}
      <div className="cm-acts">
        {(issued ? [] : ALL).filter((p) => on.includes(p) && !have.has(p)).map((p) => (
          <form key={p} action={linkProvider}>
            <input type="hidden" name="provider" value={p} />
            <button className="cm-btn" type="submit">
              {en ? `Connect ${PROVIDER_LABEL[p]}` : `${PROVIDER_LABEL[p]} 연결하기`}
            </button>
          </form>
        ))}
      </div>

      {!issued && !pw && linked.length === 1 ? (
        <p className="cm-none">
          {en ? "You have one way to sign in. Connect another so you can still get in if that one stops working."
            : "로그인 방법 1개 · 하나 더 연결 권장"}
        </p>
      ) : null}
      {issued ? null : (
        <p className="cm-none">{en ? "To disconnect: contact support" : "연결 해제: 고객지원 문의"}</p>
      )}
    </section>
  );
}
