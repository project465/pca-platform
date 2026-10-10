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
  void t.what;
  /* **가장 짧은 경우와 가장 긴 경우를 범위로 적는다.** 긴 쪽은 타계열
     대학원으로, 번역 맥락 묶음이 더 붙는 자리다. 두 값은 `estimate()` 가
     실제 계획을 세워 센 것이고 `npm run v3:length` 가 같은 함수로 같은
     값을 센다 */
  const low = estimate("bachelor", null);
  const high = estimate("master", "BUSINESS");
  const n = (k: string) => low.responses[k] === high.responses[k]
    ? `${low.responses[k]}` : `${low.responses[k]}~${high.responses[k]}`;

  const items = tier === "BASIC" ? n("BASIC")
    : tier === "STANDARD" ? n("STANDARD") : n("PRO");
  const raw = tier === "BASIC" ? low.minutes.basic
    : tier === "STANDARD" ? low.minutes.standardFresh : low.minutes.proFresh;
  /* **추정 시간을 분 단위로 못 박지 않는다.** 9분이라고 적으면 재어 본
     값처럼 읽힌다. 다섯 단위로 적는다.
     **반올림하지 않고 올린다**: 12분을 10분으로 적으면 적게 말한 쪽으로
     틀리고, 시간을 그만큼만 비워 둔 사람이 중간에 끊는다 */
  const mins = Math.max(5, Math.ceil(raw / 5) * 5);

  return (
    <div className="qs is-explore">
      <header className="qs-head">
        <div className="qs-head-in">
          <div className="qs-top" style={{ paddingBottom: 14 }}>
            <span className="qs-brand">CareerMatri</span>
            <span className="qs-tier">{tier} · <b>{t.label}</b></span>
          </div>
        </div>
      </header>

      <main className="qs-intro">
        <p className="qs-kicker">기계공학 진로 진단</p>
        <h1 className="qs-h1">해 본 일에서 직접 판단한 경험을 찾습니다</h1>
        <p className="qs-lead">
          적성이나 성격은 묻지 않습니다. 기계공학의 기술영역마다 무엇을 해 봤고
          무엇을 직접 정했는지, 아직 부족한 곳은 어디인지 알려드립니다.
        </p>

        {/* 무엇을 보는 검사인지 먼저. 분량은 아래로 내린다 */}
        <ul className="qs-three">
          <li>
            <b>무엇을 해 봤는지</b>
            <span>기술영역마다 해 본 일을 하나씩 묻습니다</span>
          </li>
          <li>
            <b>무엇을 직접 판단했는지</b>
            <span>같은 일이라도 주어진 조건대로 한 것과 직접 정한 것을 갈라 묻습니다</span>
          </li>
          <li>
            <b>어떤 경험이 아직 부족한지</b>
            <span>부족한 부분과 다음에 준비하면 좋을 것을 정리합니다</span>
          </li>
        </ul>

        <ul className="qs-facts">
          <li><b>{items}</b>문항</li>
          <li>약 <b>{mins}</b>분</li>
          <li><b>{tier}</b>{t.label}</li>
          <li>자동 저장</li>
        </ul>

        {/* 둘 다 읽히기는 해야 하지만 둘 다 주인공은 아니다. 가로로 벌려
            세로 길이를 줄이면 시작 단추가 한 화면 안에 들어온다 */}
        <div className="qs-two">
        <section className="qs-sect">
          <h2>묻는 순서</h2>
          <ul className="qs-steps">
            <li>기술영역을 하나씩 보며 관심과 해 본 적과 배울 뜻을 묻습니다</li>
            <li>경험이 있는 영역은 조금 더 자세히 질문합니다</li>
            {tier !== "BASIC" ? (
              <li>경험이 있는 영역은 여덟 가지 관점으로 나누어 묻습니다</li>
            ) : null}
            {tier === "PRO" ? (
              <li>연구나 프로젝트 하나를 직무 언어로 바꾸고, 산업과 역할을 하나씩 자세히 살펴봅니다</li>
            ) : null}
          </ul>
        </section>

        <section className="qs-sect">
          <h2>시작하기 전에</h2>
          <ul className="qs-steps">
            <li>경험이 없는 영역은 없다고 답해주세요. 그 답변도 결과에 쓰입니다</li>
            <li>학위가 높다고 결과가 좋아지지 않습니다. 질문에 나오는 상황 설명만 달라집니다</li>
            <li>창을 닫아도 보던 위치에서 이어집니다. 이전으로 돌아가 수정할 수 있습니다</li>
          </ul>
        </section>
        </div>

        <div className="qs-sect">
          <StartForm error={e} />
        </div>

        <p className="qs-fine">
          모르는 용어가 나오면 보기 아래에 쉬운 설명이 함께 나옵니다. 용어를
          몰라도 결과가 낮아지지 않습니다.
        </p>
      </main>
    </div>
  );
}
