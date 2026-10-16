import { notFound, redirect } from "next/navigation";
import { BrandMark } from "@/components/sf/brand-mark";
import { Icon, type IconName } from "@/components/sf/icon";
import { requireUser } from "@/lib/session";
import { attemptOf, estimate } from "@/lib/me-v3/runtime/session";
import { core } from "@/lib/me-v3/core-registry";
import { specView } from "@/lib/me-v3/result/spec-view";
import { resultMeta } from "@/lib/me-v3/result/meta";
import { planFor } from "@/lib/me-v3/runtime/session";
import { STAGE_LEAD, STAGES } from "@/lib/me-v3/runtime/blocks";
import { TIER_WHAT } from "../../tier-text";

export const metadata = { title: "검사 시작 전 안내 · CareerMatri" };

/**
 * 첫 문항 앞의 안내 한 쪽.
 *
 * **여기서 묻는 것이 없다.** 응시를 연 직후에 한 번 서고, 응답도 routing 도
 * 등급도 건드리지 않는다. 나가도 응시는 그대로 열려 있고 `/v3/start` 가
 * 이어보기로 돌려보낸다.
 *
 * 세 가지를 10초 안에 읽히게 둔다: 이 검사가 무엇을 보는가 · 어떻게 답하면
 * 되는가 · 결과에서 무엇을 보게 되는가.
 *
 * **분량을 먼저 적지 않는다.** 문항 수와 시간은 아래 한 줄로 내린다. 맨
 * 위에 두면 읽는 쪽이 이 검사를 분량으로 값을 매긴다.
 */

/**
 * **읽을 것을 셋으로 줄인다**(COMMERCIAL GOLD MASTER §4).
 *
 * 학생이 시작 전에 알아야 하는 것은 셋뿐이다: 무엇을 보는 검사인가 ·
 * 어떻게 답하면 되는가 · 얼마나 걸리는가. 나머지(전공 장면 · 묻는 차례 ·
 * 문항 수)는 접어 둔다. 전에는 그 셋이 일곱 묶음 아래에 묻혀 있어서
 * **첫 인상이 `긴 검사`** 였다. 셋째 줄의 값은 부르는 쪽이 채운다.
 */
const GUIDE: [IconName, string, string][] = [
  ["compass", "무엇을 보나요",
    "관심과 해 본 일과 그때 직접 정한 것을 봅니다. 전공지식 시험이 아닙니다."],
  ["skip", "어떻게 답하나요",
    "보기에서 고르기만 하면 됩니다. 어려운 문항은 모르겠다로 넘어갑니다."],
  ["bolt", "얼마나 걸리나요", ""],
];

export default async function V3Intro({
  params,
}: { params: Promise<{ attemptId: string }> }) {
  const user = await requireUser();
  const { attemptId } = await params;

  const a = await attemptOf(attemptId, user.id);
  if (!a) notFound();
  /* 이미 제출한 응시에 이 쪽을 세우지 않는다. 다 푼 사람에게 시작 안내를
     보여 주면 처음부터 다시 푸는 줄 안다 */
  if (a.status !== "in_progress") redirect(`/v3/${attemptId}/result`);

  const t = TIER_WHAT[a.tier];
  const coreName = (() => {
    /* **모르면 전공 이름을 지어내지 않는다.** 전에는 기계공학으로
       떨어져서, 다른 전공 응시의 시작 안내가 기계공학으로 적혔다 */
    try { return core(a.core_code).name_ko; } catch { return "이 전공"; }
  })();

  /**
   * 적는 수는 **이 응시의 학업 단계와 계열로 센 값**이다(설계 원칙 10).
   * `/v3/start` 는 아직 단계를 모르므로 범위로 적고, 여기서는 하나로
   * 좁힌다. 세는 자리는 양쪽 다 `planCost()` 하나다.
   *
   * 심화 영역이 넷까지 열릴 수 있어 수가 늘 수 있으므로 **올려 적는다**:
   * 적게 말하면 시간을 그만큼만 비워 둔 사람이 중간에 끊는다.
   */
  /**
   * **그 전공에서 자주 서는 장면**(갈래 계약의 `examples.scene`).
   *
   * 전까지 이 줄은 등록부에 적혀 있고 **학생이 읽는 자리에 한 글자도
   * 닿지 않았다.** 그래서 어느 전공으로 들어와도 시작 안내가 같은 말을
   * 했고, 읽는 쪽은 이 검사가 자기 전공을 모른다고 읽었다.
   *
   * **묻는 것이 아니다.** 문항도 보기도 routing 도 등급도 건드리지 않고,
   * 답을 유도하지 않게 **장면만 적고 무엇을 고르라고 적지 않는다.**
   */
  const sv = specView(a.core_code, a.specialization_code);

  /**
   * **누구의 검사인지를 첫 줄에 적는다**(GOLD MASTER §9·§12).
   *
   * 결과지의 첫 줄과 같은 자리(`resultMeta`)에서 읽는다: 학교와 학과를
   * 두 곳에서 따로 만들면 어느 날 둘이 갈린다.
   */
  const meta = await resultMeta(attemptId, a.core_code);

  /**
   * **이 응시가 실제로 지나는 단계**를 미리 보여 준다(GOLD MASTER §3).
   *
   * 관심을 묻는 자리와 해 본 일을 묻는 자리와 남긴 것을 고르는 자리는
   * 응답 방식이 다르다. 시작 전에 그 차례를 한 번 보여 주면, 중간에
   * 화면이 바뀔 때 **다른 검사가 시작됐다**고 읽지 않는다.
   *
   * **없는 단계를 지어내지 않는다**: routing 이 연 단계만 센다.
   */
  const plan = await planFor(a);
  const steps = STAGES
    .filter((x) => (plan.perStage[x.code] ?? 0) > 0 && STAGE_LEAD[x.code])
    .map((x) => ({ label: x.label, lead: STAGE_LEAD[x.code] }));

  const est = estimate(a.core_code, a.education_stage, a.grad_field);
  const low = est.responses[a.tier] ?? 0;
  const high = a.tier === "BASIC" ? low
    : (est.responses[`${a.tier}4`] ?? low);
  const items = high > low ? `${low}~${high}` : `${low}`;
  const raw = a.tier === "BASIC" ? est.minutes.basic
    : a.tier === "STANDARD" ? est.minutes.standardFourth
      : est.minutes.proFourth;
  const mins = Math.max(5, Math.ceil(raw / 5) * 5);

  return (
    <div className="qs is-calm">
      <header className="qs-head">
        <div className="qs-head-in">
          <div className="qs-top" style={{ paddingBottom: 14 }}>
            <span className="qs-brand"><BrandMark size={20} />CareerMatri</span>
            {/* **학교로 들어온 응시에는 등급을 적지 않는다**(GOLD MASTER §19).
                학교 계약은 등급을 고르지 않고 서버가 PRO 로 연다. 고를 수
                없는 값을 머리에 적으면 학생이 `나는 어느 등급을 받은
                것인가` 를 묻게 된다. 한동안 등급 이름만 남겨 두었는데
                (`경험 번역`), 그 말도 파는 쪽의 이름이라 시작 화면에서
                가장 오른쪽에 혼자 섰다(COMMERCIAL GOLD MASTER §4).
                안쪽 응시 줄과 스냅샷에는 그대로 남는다 */}
            {meta.school
              ? null
              : <span className="qs-tier">{a.tier} · <b>{t.label}</b></span>}
          </div>
        </div>
      </header>

      <main className="qs-intro">
        <p className="qs-kicker">
          {[meta.school, meta.department ?? coreName].filter(Boolean).join(" · ")}
        </p>
        {/* **첫 인상이 `긴 검사` 가 아니어야 한다**(§4). 제목이 분량을
            말하지 않고 **이 검사가 무엇을 하는 자리인가**를 말한다 */}
        <h1 className="qs-h1">내 전공과 경험을 정리합니다</h1>
        {/* **두 줄 안에서 끝낸다**(FINAL POLISH §4). 손전화에서 한 줄이
            스물여섯 자쯤이라 쉰 자를 넘으면 세 줄이 되고, 그러면 제목과
            카드 사이에 읽을거리가 한 덩이 더 선다 */}
        <p className="qs-lead">
          {coreName} 쪽에서 해 본 일과 그때 직접 정한 것을 묻고, 설명할 수
          있는 영역과 채울 부분을 정리합니다.
        </p>

        <ul className="qs-three">
          {GUIDE.map(([ic, title, note], i) => (
            <li key={title}>
              <span className="qs-three-ic" aria-hidden>
                <Icon name={ic} size={18} />
              </span>
              <div className="qs-three-tx">
                <b>{title}</b>
                {/* 셋째 줄만 이 응시의 값이다. **문항 수를 여기 적지
                    않는다**: 분량이 첫 인상이 되면 읽는 쪽이 이 검사를
                    길이로 값 매긴다 */}
                <span>{i === 2
                  ? `약 ${mins}분입니다. 문항마다 자동 저장되어 중간에 닫아도 이어집니다.`
                  : note}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* **이 쪽의 단추는 하나다**(FINAL POLISH §4). `나중에 하기` 가
            테를 두른 단추로 나란히 서니 둘 가운데 어느 쪽이 이 쪽의 행동
            인지 고르는 일이 한 번 더 생겼다. 나가는 길은 남기되 **글줄**
            로 내린다: 길이 사라진 것이 아니라 무게가 갈린 것이다 */}
        <div className="qs-start-nav">
          <a className="qs-btn qs-btn-main qs-btn-go" href={`/v3/${attemptId}`}>
            검사 시작하기 →
          </a>
          <a className="qs-later" href="/me">나중에 하기</a>
        </div>

        {/* **나머지는 접는다**(§4). 지우지 않는 까닭은 전공 장면과 묻는
            차례가 이 검사가 무엇을 묻는지 미리 알고 싶은 사람에게 쓸모가
            있어서다. 다만 시작을 막는 자리에 두지 않는다 */}
        <details className="qs-more">
          <summary>검사에 대해 더 알아보기</summary>
          {sv.scene.length ? (
            <section className="qs-major">
              <h2>{coreName} 쪽에서 자주 서는 자리</h2>
              <p>
                아래 같은 자리에서 무엇을 직접 정했는지를 묻습니다. 겪은 적이
                없는 자리는 없다고 고르시면 됩니다.
              </p>
              <ul>
                {sv.scene.slice(0, 3).map((t) => <li key={t}>{t}</li>)}
              </ul>
            </section>
          ) : null}

          {steps.length > 2 ? (
            <section className="qs-steps-pre">
              <h2>이런 차례로 묻습니다</h2>
              <ol>
                {steps.map((x, i) => (
                  <li key={x.label}>
                    <b>{`${i + 1}. ${x.label}`}</b>
                    <span>{x.lead}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <ul className="qs-facts">
            <li><span>문항</span><b>{items}개</b></li>
            <li><span>응답 방식</span><b>선택형</b></li>
            <li><span>중간 저장</span><b>문항마다 자동 저장</b></li>
            <li><span>결과</span><b>완료 후 바로 확인</b></li>
          </ul>
        </details>

        {/* **이어진다는 말을 세 번 적지 않는다**(FINAL POLISH §4).
            카드 셋째가 이미 `중간에 닫아도 이어집니다` 를 적고 접힌 자리의
            표가 `문항마다 자동 저장` 을 한 번 더 적는다. 그리고 이 쪽은
            **첫 문항 앞**이라 `지금까지의 응답` 이라고 할 응답이 아직
            없다: 맞지도 않는 줄을 바닥에 한 줄 더 두면 시작 단추가 그만큼
            아래로 밀린다 */}
      </main>
    </div>
  );
}
