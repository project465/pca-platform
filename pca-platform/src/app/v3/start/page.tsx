import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { currentAttempt, estimate, v3Grants } from "@/lib/me-v3/runtime/session";
import type { Tier } from "@/lib/me-v3/scoring/types";
import { TIER_WHAT } from "../tier-text";
import StartForm from "./start-form";

export const metadata = { title: "검사 시작 · CareerMatri" };

/**
 * 검사 시작.
 *
 * **이어 볼 응시가 있으면 거기로 돌려보낸다.** 시작 화면을 다시 보여주면
 * 처음부터 푸는 줄 알고, 그 사람의 응답이 두 벌 쌓인다.
 *
 * 받을 것과 걸리는 시간을 먼저 적는다. 문항 수는 **routing 으로 달라지므로
 * 범위로 적는다**: 하나로 못 박으면 넷째 영역이 열린 사람이 속은 줄 안다.
 */
export default async function V3Start({
  searchParams,
}: { searchParams: Promise<{ e?: string }> }) {
  const user = await requireUser();
  const { e } = await searchParams;

  const open = await currentAttempt(user.id);
  if (open) redirect(`/v3/${open.id}`);

  const grants = await v3Grants(user.id);
  const tier: Tier = grants[0]?.tier ?? "BASIC";
  const t = TIER_WHAT[tier];
  /* 학부 기준으로 적는다. 계열 분기가 둘 더 붙는 자리는 범위에 들어 있다 */
  const low = estimate("bachelor", null);
  const high = estimate("master", "OTHER_INTERDISCIPLINARY");
  const n = (k: string) => low.responses[k] === high.responses[k]
    ? `${low.responses[k]}` : `${low.responses[k]}~${high.responses[k]}`;

  const items = tier === "BASIC" ? n("BASIC")
    : tier === "STANDARD" ? n("STANDARD") : n("PRO");
  const raw = tier === "BASIC" ? low.minutes.basic
    : tier === "STANDARD" ? low.minutes.standardFresh : low.minutes.proFresh;
  /* **추정 시간을 분 단위로 못 박지 않는다.** 9분이라고 적으면 재어 본
     값처럼 읽힌다. 다섯 단위로 올려 적고 "안팎" 을 붙인다 */
  const mins = Math.max(5, Math.round(raw / 5) * 5);

  return (
    <div className="qs">
      <header className="qs-top">
        <span className="qs-brand">CareerMatri</span>
        <span className="qs-tier">{tier} · <b>{t.label}</b></span>
      </header>

      <main className="qs-intro">
        <p className="qs-kicker">기계공학 진로 진단</p>
        <h1 className="qs-h1">해 본 일에서 확인되는 판단을 찾습니다</h1>
        <p className="qs-lead">
          적성이나 성격을 묻지 않습니다. 열두 기술영역에서 <b>무엇을 직접
          정했는지</b>를 묻고, 그 응답으로 확인되는 판단과 아직 비어 있는
          자리를 그대로 적어 드립니다.
        </p>

        <ul className="qs-facts">
          <li><b>{items}</b>문항</li>
          <li><b>{mins}</b>분 안팎</li>
          <li><b>{tier}</b> {t.label}</li>
        </ul>

        <section className="qs-sect">
          <h2>이번 검사에서 받으시는 것</h2>
          <p style={{ margin: 0, fontSize: "var(--t-sm)" }}>{t.what}</p>
        </section>

        <section className="qs-sect">
          <h2>묻는 순서</h2>
          <ul className="qs-steps">
            <li>열두 기술영역을 한 화면에 하나씩 놓고 관심과 경험과 배울 뜻을 받습니다</li>
            <li>겪어 보신 영역을 조금 더 자세히 묻습니다</li>
            {tier !== "BASIC" ? (
              <li>앞에서 나타난 영역을 여덟 가지 판단으로 나눠 묻습니다</li>
            ) : null}
            {tier === "PRO" ? (
              <li>연구나 과제 하나를 직무 언어로 옮기고, 산업과 역할을 하나씩 깊게 봅니다</li>
            ) : null}
          </ul>
        </section>

        <section className="qs-sect">
          <h2>미리 알아 두실 것</h2>
          <ul className="qs-steps">
            <li>겪어 본 적이 없는 영역은 <b>없다</b>를 고르시면 됩니다. 그것도 자료입니다</li>
            <li>답하신 것은 문항마다 저장됩니다. 창을 닫으셔도 보던 자리에서 이어집니다</li>
            <li>이전으로 돌아가 고치실 수 있고, 고치면 뒤에 묻는 것이 다시 정해집니다</li>
          </ul>
        </section>

        <div className="qs-sect">
          <StartForm error={e} />
        </div>

        <p className="qs-fine">
          전문 용어가 나오면 보기 아래 쉬운 말 설명이 함께 섭니다. 용어를
          모르셔도 판정이 낮아지지 않습니다.
        </p>
      </main>
    </div>
  );
}
