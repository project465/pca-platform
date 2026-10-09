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
  userId, notice,
}: { userId: string; notice?: string }) {
  const [linked, pw] = await Promise.all([
    accountsOf(userId), hasPasswordLogin(userId),
  ]);
  const on = enabledProviders();
  const have = new Set(linked.map((l) => l.provider));

  const rows = [
    {
      k: "이메일 · 학번 로그인",
      v: pw ? "쓰고 있습니다" : "쓰지 않습니다",
    },
    ...ALL.map((p) => ({
      k: `${PROVIDER_LABEL[p]} 로그인`,
      v: have.has(p)
        ? `연결됨${(() => {
          const row = linked.find((l) => l.provider === p);
          if (!row?.email) return "";
          /* 애플이 가려 준 주소라는 것을 적는다. 적지 않으면 모르는
             주소를 보고 자기 계정이 아니라고 읽는다 */
          return isPrivateRelay(row.email)
            ? " · 애플이 가려 준 주소" : ` · ${row.email}`;
        })()}`
        : on.includes(p) ? "연결 안 됨" : "지금 켜져 있지 않습니다",
    })),
  ];

  return (
    <section className="cm-card is-wide">
      <h2>로그인 방법</h2>
      {notice ? <p className="cm-note">{notice}</p> : null}
      <dl className="cm-dl">
        {rows.map((r) => (
          <div key={r.k}>
            <dt>{r.k}</dt>
            <dd>{r.v}</dd>
          </div>
        ))}
      </dl>

      {/* 붙일 수 있는 것만 단추로 세운다. 켜지지 않은 공급자에 단추를
          달면 누른 사람이 공급자 쪽 오류 화면에서 끝난다 */}
      <div className="cm-acts">
        {ALL.filter((p) => on.includes(p) && !have.has(p)).map((p) => (
          <form key={p} action={linkProvider}>
            <input type="hidden" name="provider" value={p} />
            <button className="cm-btn" type="submit">
              {PROVIDER_LABEL[p]} 연결하기
            </button>
          </form>
        ))}
      </div>

      {!pw && linked.length === 1 ? (
        <p className="cm-none">
          지금 들어오는 길이 하나입니다. 하나를 더 연결해 두시면 그 길이
          막히는 날에도 들어오실 수 있습니다.
        </p>
      ) : null}
      <p className="cm-none">
        연결을 끊어야 하신다면 고객지원으로 알려 주십시오. 마지막 하나가
        끊기면 계정에 들어오실 수 없어서 화면에 두지 않았습니다.
      </p>
    </section>
  );
}
