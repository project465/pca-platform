import Link from "next/link";
import BrandHome from "@/components/sf/brand-home";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { attemptOf } from "@/lib/me-v2/attempt";
import { countOf, profileOf } from "@/lib/me-v2/evidence";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import EvidenceFrame from "./evidence-frame";

export const metadata = { title: `경험 적기 · ${BRAND.root}` };

/**
 * 경험을 적는 자리.
 *
 * **검사 끝에 한 번 들르는 자리와 결과지에서 고치러 들어오는 자리는 같은
 * 화면이고 나가는 말만 다르다.** 흐름 한가운데서 '그만두기' 라고 쓰면 검사를
 * 접는 단추로 읽힌다.
 *
 * **안 적으면 할 수 있는 말이 줄어든다는 사실을 적는다.** 적지 않으셔도
 * 결과지는 나가고, 그때 무엇이 빠지는지를 숨기지 않는다. 숨기면 읽는 사람은
 * 이 검사가 원래 그 정도인 줄 안다.
 */
export default async function EvidencePage({
  params, searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ lang?: string; flow?: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);

  const a = await attemptOf(attemptId, user.id);
  if (!a) notFound();

  const prof = await profileOf(user.id);
  const n = countOf(prof);
  const inFlow = sp.flow === "1";
  const back = `/assessment/${attemptId}/report`;

  return (
    <div className="pub">
      <header className="pubtop">
        {/* 로고와 브랜드 글자가 한 덩어리로 홈으로 간다. 로그인했으면 그
            역할의 첫 화면, 아니면 공개 홈이다 */}
        <BrandHome />
        <div className="pubtop-r">
          <span className="sf-meta">
            {n.items > 0 || n.research > 0
              ? `${T("evHave")} ${n.items + n.research}`
              : T("evNone")}
          </span>
          <Link href={back} className="sf-btn ghost sm">{T("evLater")}</Link>
        </div>
      </header>

      <div className="pubwrap" style={{ maxWidth: 820 }}>
        <div className="sf-head">
          <div className="sf-head-t">
            <div className="sf-eyebrow">{a.tier}</div>
            <h1 className="sf-h1">{T("evTitle")}</h1>
            <p className="sf-sub">{T("evBody")}</p>
          </div>
        </div>

        <EvidenceFrame
          attemptId={attemptId}
          stage={a.education_stage}
          inFlow={inFlow}
          seed={{ evidence: prof.evidence, research: prof.research, target: prof.target }}
          nextHref={back}
          labels={{ saving: T("asSaving"), retry: T("asRetry") }}
          lang={L}
        />
      </div>
    </div>
  );
}
