import Link from "next/link";
import BrandHome from "@/components/sf/brand-home";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { toLang2, BRAND } from "@/lib/surface-text";
import { attemptOf } from "@/lib/me-v2/attempt";
import { items, done } from "@/lib/pilot";
import LangSelect from "@/components/sf/lang-select";
import { PilotForm } from "./pilot-form";

export const metadata = { title: `파일럿 · ${BRAND.root}` };

/**
 * 파일럿 열 문항.
 *
 * **결과지를 설문으로 막지 않는다.** 결과지를 먼저 보여 주고 여기로 오는
 * 길만 둔다(부가 문항 화면과 같은 규칙). 답하지 않아도 잃는 것이 없다.
 *
 * **본인 응시만이다.** 남의 응시 번호를 주소에 넣어도 열리지 않는다.
 */
export default async function PilotPage({
  params, searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ lang?: string; done?: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));

  const a = await attemptOf(attemptId, user.id);
  if (!a) notFound();
  /* 끝내지 않은 응시로는 답할 수 없다. 묻는 것이 결과지를 읽은 뒤의
     이해와 다음 행동이다 */
  if (!a.submitted_at) notFound();

  const all = await items(L);
  const already = await done(attemptId);

  return (
    <div className="pub">
      <header className="pubtop">
        {/* 로고와 브랜드 글자가 한 덩어리로 홈으로 간다. 로그인했으면 그
            역할의 첫 화면, 아니면 공개 홈이다 */}
        <BrandHome />
        <div className="pubtop-r">
          <LangSelect current={L} />
          <Link href={`/assessment/${attemptId}/report`} className="sf-btn ghost sm">
            {L === "en" ? "Back to the report" : "결과지로"}
          </Link>
        </div>
      </header>

      <div className="pubwrap" style={{ maxWidth: 760 }}>
        <div className="sf-head">
          <div className="sf-head-t">
            <div className="sf-eyebrow">{a.tier}</div>
            <h1 className="sf-h1">
              {L === "en" ? "Ten questions about the report" : "결과지에 대한 열 가지"}
            </h1>
            <p className="sf-sub">
              {L === "en"
                ? "Your answers do not change your report or your scores. They tell "
                  + "us which parts landed and which did not."
                : "답하신 것은 결과지와 점수를 바꾸지 않습니다. 어느 대목이 읽혔고 "
                  + "어느 대목이 안 읽혔는지를 알려 줍니다."}
            </p>
          </div>
        </div>

        {sp.done === "1" || already ? (
          <div className="pdcard">
            <h3>{L === "en" ? "Thank you" : "고맙습니다"}</h3>
            <p className="sf-meta">
              {L === "en"
                ? "We have your answers."
                : "답하신 것이 들어왔습니다."}
            </p>
            <div className="pdcta">
              <Link href={`/assessment/${attemptId}/report`} className="sf-btn ghost">
                {L === "en" ? "Back to the report" : "결과지로"}
              </Link>
            </div>
          </div>
        ) : (
          <PilotForm
            attemptId={attemptId}
            items={all}
            labels={{
              send: L === "en" ? "Send" : "보내기",
              scale: L === "en"
                ? ["Not at all", "", "", "", "Very much"]
                : ["전혀 아니다", "", "", "", "매우 그렇다"],
              skip: L === "en" ? "You can leave any of these empty."
                : "비워 두셔도 됩니다.",
            }}
          />
        )}
      </div>
    </div>
  );
}
