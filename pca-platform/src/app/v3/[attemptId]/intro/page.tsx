import { notFound, redirect } from "next/navigation";
import { BrandMark } from "@/components/sf/brand-mark";
import { Icon, type IconName } from "@/components/sf/icon";
import { requireUser } from "@/lib/session";
import { attemptOf, estimate } from "@/lib/me-v3/runtime/session";
import { core } from "@/lib/me-v3/core-registry";
import { specView } from "@/lib/me-v3/result/spec-view";
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

/** 안내 셋. 아이콘은 저장소의 선 아이콘 한 벌에서 가져온다 */
const GUIDE: [IconName, string, string][] = [
  ["compass", "정답은 없습니다",
    "지금 자신에게 가장 가까운 선택지를 고르세요."],
  ["skip", "잘 모르겠으면 넘어가도 됩니다",
    "판단하기 어려운 문항은 모르겠다를 고를 수 있습니다."],
  ["bolt", "결과는 다음 행동으로 이어집니다",
    "현재 상태와 보완할 부분과 산업·직무 연결과 다음 행동을 봅니다."],
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
            <span className="qs-tier">{a.tier} · <b>{t.label}</b></span>
          </div>
        </div>
      </header>

      <main className="qs-intro">
        <p className="qs-kicker">{coreName} CareerMatri</p>
        <h1 className="qs-h1">검사를 시작하기 전에</h1>
        <p className="qs-lead">
          이 검사는 전공지식 자체를 시험하는 문제가 아닙니다. 지금의 관심과
          경험과 판단과 학습 의향을 묻고, 지금 설명할 수 있는 영역과 앞으로
          보완할 부분을 정리합니다.
        </p>

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

        <ul className="qs-three">
          {GUIDE.map(([ic, title, note]) => (
            <li key={title}>
              <span className="qs-three-ic" aria-hidden>
                <Icon name={ic} size={18} />
              </span>
              <div className="qs-three-tx">
                <b>{title}</b>
                <span>{note}</span>
              </div>
            </li>
          ))}
        </ul>

        <ul className="qs-facts">
          <li><span>예상 소요시간</span><b>약 {mins}분</b></li>
          <li><span>문항</span><b>{items}개</b></li>
          <li><span>응답 방식</span><b>선택형</b></li>
          <li><span>중간 저장</span><b>문항마다 자동 저장</b></li>
          <li><span>결과</span><b>완료 후 바로 확인</b></li>
        </ul>

        <div className="qs-start-nav">
          <a className="qs-btn qs-btn-main qs-btn-go" href={`/v3/${attemptId}`}>
            검사 시작하기 →
          </a>
          <a className="qs-btn qs-btn-ghost" href="/me">나중에 하기</a>
        </div>

        <p className="qs-fine">
          나중에 하기를 눌러도 지금까지의 응답은 그대로 남습니다. 다시
          들어오면 보던 자리에서 이어집니다.
        </p>
      </main>
    </div>
  );
}
