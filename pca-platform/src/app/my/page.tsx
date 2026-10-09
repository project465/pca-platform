import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { v2State } from "@/lib/me-v2/lifecycle";
import { currentState } from "@/lib/me-v3/platform";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { ROLE_LABEL } from "@/lib/roles";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_INDIVIDUAL } from "@/components/sf/nav";
import { Card, Defs } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";
import LoginMethods from "./login-methods";
import { isProvider, PROVIDER_LABEL } from "@/lib/auth-accounts";

export const metadata = { title: `계정 · ${BRAND.root}` };

/**
 * 계정 영역의 홈.
 *
 * **전에는 여기가 개인의 첫 화면이었다.** 그런데 이 쪽이 읽는 표가
 * 옛 검사 쪽(`attempts` · `report_snapshots`)이라, 기계공학 V3 를 끝낸
 * 사람이 로그인하면 `아직 응시한 검사가 없습니다` 를 읽고 주된 단추가
 * 옛 검사로 보냈다. 커리어 기록이 쌓이는 자리는 내 CareerMatri 이고,
 * 로그인은 이제 그쪽으로 떨어진다(`roles.ts`).
 *
 * **그래서 이 쪽에서 검사를 시작하지 않는다.** 계정 영역이 하는 일은
 * 셋이다: 로그인한 계정을 보여 주는 것 · 주문과 결제로 가는 길 ·
 * 그리고 옛 검사 기록을 찾을 수 있게 두는 것.
 *
 * **옛 기록을 지우지 않는다.** 전에 응시한 사람의 결과가 그 표에 있고,
 * 주소가 적힌 메일도 나가 있다. 다만 지금 검사의 결과가 어디 있는지를
 * 맨 위에 적는다.
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
  const [v3, v2] = await Promise.all([currentState(user.id), v2State(user.id)]);

  return (
    <Shell
      surface="individual"
      lang={L}
      nav={NAV_INDIVIDUAL}
      active="/my"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "", href: "/my/account" }}
      topTitle={T("acHome")}
      topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={T("acHome")}
        title={T("acTitle")}
        sub={T("acLead")}
        actions={<Link href="/me" className="sf-btn accent">{T("acBack")}</Link>}
      />

      <div className="sf-grid sf-g-2-1">
        <Card title={T("acWho")}>
          <Defs
            rows={[
              { k: T("acWho"), v: user.name },
              { k: T("navAccount"), v: ROLE_LABEL[user.role] ?? "" },
            ]}
          />
          <Link href="/my/account" className="sf-btn ghost sm" style={{ marginTop: 14 }}>
            {T("acSettings")}
          </Link>
        </Card>

        <Card title={T("acOrders")}>
          <p className="sf-sub" style={{ fontSize: 13.5, margin: 0 }}>{T("acOrdersBody")}</p>
          <Link href="/support" className="sf-btn ghost sm" style={{ marginTop: 14 }}>
            {T("navSupport")}
          </Link>
        </Card>
      </div>

      {/* ── 로그인 방법 ──
          **들어오는 길이 지금 무엇인지 적는다.** 적어 두지 않으면 구글로
          가입하신 분이 비밀번호 찾기를 누르고, 메일이 오지 않는 까닭을
          모른 채 기다린다 */}
      <div className="sf-grid sf-g-2-1" style={{ marginTop: 18 }}>
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
      </div>

      {/* ── 옛 검사 기록 ── 지금 검사의 결과가 어디 있는지를 먼저 적는다 ── */}
      <Section title={T("acOld")}>
        <Card>
          <p className="sf-sub" style={{ fontSize: 13.5, margin: "0 0 14px" }}>
            {T("acOldBody")}
          </p>
          <div className="sf-chips">
            {v3.model ? (
              <Link href="/me/results" className="sf-btn accent sm">{T("acOldResults")}</Link>
            ) : null}
            <Link href="/my/assessments" className="sf-btn ghost sm">{T("navAssessments")}</Link>
            <Link href="/my/results" className="sf-btn ghost sm">{T("navResults")}</Link>
            <Link href="/my/evidence" className="sf-btn ghost sm">{T("navEvidence")}</Link>
          </div>
        </Card>
      </Section>

      {/*
        전에 산 검사를 아직 끝내지 않은 분의 길. **줄을 지우지 않는다**:
        결제를 하고 중간에 멈춘 사람이 여기 말고 들어갈 자리가 없다.
      */}
      {v2.kind === "purchased" || v2.kind === "progress" ? (
        <Section>
          <Card title={T("myInProgress")}>
            <Defs rows={[{ k: T("okTier"), v: v2.tier }]} />
            <Link
              href={v2.kind === "progress" ? `/assessment/${v2.attemptId}` : "/assessment/start"}
              className="sf-btn ghost sm" style={{ marginTop: 14 }}
            >
              {v2.kind === "progress" ? T("asResume") : T("asStart")}
            </Link>
          </Card>
        </Section>
      ) : null}
    </Shell>
  );
}
