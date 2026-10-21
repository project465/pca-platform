import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { v2State } from "@/lib/me-v2/lifecycle";
import { resumePathFor } from "@/lib/engine-entry";
import { coreIfAny, currentState } from "@/lib/me-v3/platform";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { ROLE_LABEL } from "@/lib/roles";
import { CmShell, CmHead } from "@/app/me/shell";
import { Icon } from "@/components/sf/icon";
import LangSelect from "@/components/sf/lang-select";
import LogoutButton from "@/components/logout-button";
import LoginMethods from "./login-methods";
import { isProvider, PROVIDER_LABEL } from "@/lib/auth-accounts";
import { queryOne } from "@/lib/db";
import { activeTrack } from "@/lib/track";

export const metadata = { title: `계정 · ${BRAND.root}` };

/**
 * 계정.
 *
 * **전에는 여기가 개인의 첫 화면이었다.** 그런데 이 쪽이 읽는 표가
 * 옛 검사 쪽(`attempts` · `report_snapshots`)이라, 기계공학 V3 를 끝낸
 * 사람이 로그인하면 `아직 응시한 검사가 없습니다` 를 읽고 주된 단추가
 * 옛 검사로 보냈다. 커리어 기록이 쌓이는 자리는 작업공간이고, 로그인은
 * 이제 그쪽으로 떨어진다(`roles.ts`).
 *
 * **그래서 이 쪽에서 검사를 시작하지 않는다.** 계정이 하는 일은 넷이다:
 * 로그인한 계정을 보여 주는 것 · 들어오는 길을 적는 것 · 주문과 결제로
 * 가는 길 · 옛 검사 기록을 찾을 수 있게 두는 것.
 *
 * **껍데기는 작업공간과 같은 한 벌이다**(`CmShell`). 계정이 자기 띠를
 * 따로 들고 있으면 들른 사람이 다른 제품으로 넘어간 것처럼 보인다.
 */
export default async function AccountHome({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; linked?: string; link?: string }>;
}) {
  const user = await requireRole(["student"]);
  const { lang: q, linked: justLinked, link: linkErr } = await searchParams;
  const lang = await resolveLang(q);
  const L = toLang2(lang);
  const T = txer(L);

  /* 지금 검사와 옛 검사를 같은 칸에 섞지 않는다. 여기서 보는 것은
     `그쪽에 결과가 있는가` 하나뿐이다 */
  /**
   * **전공을 아직 고르지 않은 사람도 이 쪽은 열려야 한다**(규격 §4 · §21).
   *
   * `currentState()` 는 Core 를 알아야 지금 값을 읽을 수 있고, 답할 수
   * 없으면 던진다. 그 설계는 맞지만 여기서 Core 로 읽는 것은 아래 한
   * 줄뿐이고 **그 답은 전공을 고르지 않은 사람에게 늘 `없다`** 다. 그래서
   * 열린 전공이 하나가 아닌 배포본에서는 학교가 나눠 준 계정으로 처음
   * 들어온 학생이 `계정` 을 누르는 순간 500 을 받았다. 모르면 묻지 않는다.
   */
  const core = await coreIfAny(user.id);
  const [v3, v2, held, track] = await Promise.all([
    core ? currentState(user.id) : Promise.resolve(null),
    v2State(user.id),
    /* **없는 기록으로 가는 길을 세우지 않는다.** 학교가 발급한 계정은 옛
       검사도 주문도 한 줄 없는데, 두 칸이 그대로 서서 누르면 빈 목록과
       고객지원으로 갔다. 그 사람에게 그 두 칸은 무엇이 빠졌는지 찾게
       만드는 자리다. 있는지만 묻고 없으면 칸을 세우지 않는다 */
    queryOne<{ old: boolean; orders: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM attempts WHERE user_id = $1)
           OR EXISTS (SELECT 1 FROM evidence_profiles WHERE user_id = $1) AS old,
              EXISTS (SELECT 1 FROM orders WHERE user_id = $1) AS orders`,
      [user.id]).catch(() => ({ old: true, orders: true })),
    activeTrack(user.id),
  ]);
  const hasOld = held?.old ?? true;
  const hasOrders = held?.orders ?? true;

  return (
    <CmShell active="/my" title="계정">
      <CmHead title="계정" lead={T("acLead")}
        /* **나가는 길이 한 자리에는 있어야 한다.** 계정 쪽이 작업공간
           껍데기로 옮겨 오면서 로그아웃이 **어느 손님 화면에도 없는
           상태**가 됐다(`components/sf/shell` 에만 남아 있었고 그쪽은
           Campus 와 Admin 이 쓴다). 학교 실습실처럼 한 PC 를 여럿이
           쓰는 자리에서는 앞사람의 계정이 그대로 열려 있게 된다.
           머리띠의 계정 한 자리가 이 쪽으로 보내므로 길은 두 번이다 */
        actions={<LogoutButton className="cm-btn" label={T("signOut")} />} />

      <div className="cm-grid">
        <section className="cm-card">
          <h2><Icon name="user" size={17} />계정 정보</h2>
          <dl className="cm-dl">
            <div>
              <dt>이름</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>구분</dt>
              <dd>{ROLE_LABEL[user.role] ?? ""}</dd>
            </div>
          </dl>
          <div className="cm-acts">
            <Link href="/my/account" className="cm-btn">계정 설정과 탈퇴</Link>
          </div>
        </section>

        {/* ── Track 구독 ── 기간이 언제 끝나는지는 이 계정에서 찾는 사람이 많다 */}
        <section className="cm-card">
          <h2><Icon name="clock" size={17} />Track 구독</h2>
          <p>
            {track.on && track.until
              ? `${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(track.until))}까지 열려 있습니다. 자동으로 갱신되지 않습니다.`
              : "열려 있지 않습니다. 30일권과 365일권이 있습니다."}
          </p>
          <div className="cm-acts">
            <Link href="/me/track" className="cm-btn">{track.on ? "내 구독 보기" : "Track 보기"}</Link>
          </div>
        </section>

        {hasOrders ? (
          <section className="cm-card">
            <h2><Icon name="cart" size={17} />주문과 결제</h2>
            <p>{T("acOrdersBody")}</p>
            <div className="cm-acts">
              <Link href="/support" className="cm-btn">문의하기</Link>
            </div>
          </section>
        ) : null}

        {/* ── 들어오는 길 ──
            **지금 무엇으로 들어오는지 적는다.** 적어 두지 않으면 구글로
            가입하신 분이 비밀번호 찾기를 누르고, 메일이 오지 않는 까닭을
            모른 채 기다린다 */}
        <LoginMethods
            userId={user.id}
            notice={
              isProvider(justLinked ?? "")
                ? `${PROVIDER_LABEL[justLinked as "google" | "apple"]} 를 연결했습니다.`
                : linkErr === "taken"
                  ? "그 계정은 이미 다른 CareerMatri 계정에 연결돼 있습니다."
                  : linkErr === "off"
                    ? "그 로그인 방법은 지금 켜져 있지 않습니다."
                    : undefined
            }
          />

        <section className="cm-card">
          <h2><Icon name="globe" size={17} />언어</h2>
          <p>고르면 바로 바뀌고 다음에 들어올 때도 그대로입니다.</p>
          <div className="cm-acts">
            <LangSelect current={L} />
          </div>
        </section>

        {/* ── 옛 검사 기록 ── 지금 검사의 결과가 어디 있는지를 먼저 적는다 ── */}
        {hasOld ? (
        <section className="cm-card">
          <h2>{T("acOld")}</h2>
          <p>{T("acOldBody")}</p>
          <div className="cm-acts">
            {v3?.model ? (
              <Link href="/me/results" className="cm-btn is-primary">{T("acOldResults")}</Link>
            ) : null}
            <Link href="/my/assessments" className="cm-btn">{T("navAssessments")}</Link>
            <Link href="/my/results" className="cm-btn">{T("navResults")}</Link>
            <Link href="/my/evidence" className="cm-btn">{T("navEvidence")}</Link>
          </div>
        </section>
        ) : null}

        {/*
          전에 산 검사를 아직 끝내지 않은 분의 길. **줄을 지우지 않는다**:
          결제를 하고 중간에 멈춘 사람이 여기 말고 들어갈 자리가 없다.
        */}
        {v2.kind === "purchased" || v2.kind === "progress" ? (
          <section className="cm-card">
            <h2>{T("myInProgress")}</h2>
            <dl className="cm-dl">
              <div>
                <dt>{T("okTier")}</dt>
                <dd>{v2.tier}</dd>
              </div>
            </dl>
            <div className="cm-acts">
              <Link
                href={v2.kind === "progress"
                  ? `/assessment/${v2.attemptId}`
                  : (resumePathFor("ME_V2") ?? "/me")}
                className="cm-btn"
              >
                {v2.kind === "progress" ? T("asResume") : T("asStart")}
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </CmShell>
  );
}
