import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { attemptOf } from "@/lib/me-v2/attempt";
import { BRAND, toLang2, txer } from "@/lib/surface-text";

export const metadata = { title: `응시 완료 · ${BRAND.root}` };

/**
 * 응시가 끝난 자리.
 *
 * **여기서 멈추지 않게 한다.** 경험을 적으면 결과지가 훨씬 구체적으로
 * 바뀌는데, 그 사실을 적지 않으면 읽는 사람은 이 검사가 원래 그 정도인 줄
 * 안다. 그래도 지금 결과를 보고 싶은 사람을 막지는 않는다.
 */
export default async function AssessmentDone({
  params, searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const a = await attemptOf(attemptId, user.id);
  if (!a) notFound();

  return (
    <div className="aswrap">
      <header className="astop">
        <span className="asbrand">{BRAND.root}</span>
        <span className="asmeta">{a.tier}</span>
      </header>
      <main className="asdone">
        <h1 className="asH1">{T("asDoneTitle")}</h1>
        <p className="sf-sub">{T("asDoneBody")}</p>
        <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/evidence" className="sf-btn accent">{T("asAddEvidence")}</Link>
          <Link href="/my" className="sf-btn ghost">{T("navHome")}</Link>
        </div>
      </main>
    </div>
  );
}
