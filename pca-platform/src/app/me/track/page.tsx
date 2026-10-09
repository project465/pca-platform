import Link from "next/link";
import { requireUser } from "@/lib/session";
import { trackInterest } from "@/lib/me-v3/platform";
import { CmShell, CmHead } from "../shell";
import { toggleInterest } from "./actions";

export const metadata = { title: "CareerMatri Track" };

/**
 * CareerMatri Track.
 *
 * **산업팩을 더 여는 상품이 아니다.** 여덟 산업과 여덟 역할은 진단에
 * 포함되고 탐색에서 전부 볼 수 있다. Track 이 파는 것은 **내 커리어
 * 상황이 바뀔 때 다시 계산해 주는 일**이다.
 *
 * **마케팅 랜딩처럼 쓰지 않는다.** 기능을 짧게 적고 지금 되는 것과 안
 * 되는 것을 가른다. 과장한 문장은 켜는 날 지켜야 하는 약속이 된다.
 */
/**
 * Track 에는 **아직 없는 것만** 둔다.
 *
 * 전에는 이 목록에 이미 되는 것 셋(관심 산업·직무 바꾸기 · 지원한 곳
 * 관리 · 지원 직무별로 모아 보기)이 섞여 있었고, 되는 쪽에는 `지금
 * 열기` 단추가 붙어 있었다. **`준비 중` 묶음 안에서만 닿는 기능**은
 * 사용자에게 없는 기능이고, 같은 목록에 되는 것과 안 되는 것이 같은
 * 모양으로 서면 묶음 이름이 거짓말을 한다. 셋은 작업공간의 제 줄로
 * 옮겼고(`산업과 직무` · `지원한 곳`) 여기서는 그 자리를 가리키기만 한다.
 *
 * **여섯을 카드 여섯으로 세우지 않는다.** 카드마다 `켜지면 알려주세요`
 * 를 달면 아직 없는 기능이 쪽에서 가장 크고, 단추 여섯이 전부 같은
 * 일을 한다. 한 칸에 줄로 적고 **표시는 한 번만 받는다**: 세는 것은
 * `이 사람이 Track 을 기다린다` 이고, 어느 줄을 먼저 켤지는 우리가
 * 정할 일이지 응시자에게 여섯 번 물을 일이 아니다.
 */
const FEATURES: { label: string; blocked: string }[] = [
  { label: "새 채용공고 추적", blocked: "공고 자료 검토 전" },
  { label: "산업별 요구역량 변화", blocked: "표본과 근거 필요" },
  { label: "내 근거와 공고 자동 비교", blocked: "공고 자료 검토 전" },
  { label: "비어 있는 자리 추적", blocked: "자동 반영 전" },
  { label: "월간 변화 알림", blocked: "메일 연결 전" },
  { label: "목표를 바꾸면 다시 분석", blocked: "자동 반영 전" },
];

/** 표시를 받는 열쇠 하나. 줄마다 따로 받지 않는다 */
const WAIT = "track";

/** 지금 되는 것. **Track 안에 두지 않고 제자리를 가리킨다** */
const ALREADY: { href: string; label: string; body: string }[] = [
  { href: "/me/explore", label: "산업과 직무",
    body: "관심 산업과 직무는 지금 바꾸실 수 있습니다." },
  { href: "/me/apply", label: "지원한 곳",
    body: "직접 지원하신 곳을 직무별로 묶어 보는 것은 지금 됩니다." },
];

export default async function Track() {
  const user = await requireUser();
  const on = (await trackInterest(user.id)).length > 0;

  return (
    <CmShell active="/me/track" title="Track">
      <CmHead
        kicker="준비 중"
        title="상황이 바뀔 때 다시 계산해 주는 자리"
        lead={"검사 결과는 찍은 날의 상태입니다. 경험이 늘고 목표가 바뀌고 "
          + "산업이 요구하는 것이 달라지면 그때마다 다시 계산해야 합니다."}
      />

      {/* 준비 중인 것은 **한 칸에 줄로** 적는다 */}
      <section className="cm-soon">
        <b>아직 켜지지 않았습니다.</b> 켜는 날 이 여섯이 들어옵니다.
        <ul>
          {FEATURES.map((f) => (
            <li key={f.label}>{f.label} <em>{f.blocked}</em></li>
          ))}
        </ul>
        <form action={toggleInterest} style={{ marginTop: 14 }}>
          <input type="hidden" name="feature" value={WAIT} />
          <input type="hidden" name="on" value={on ? "0" : "1"} />
          <button className={`cm-btn${on ? "" : " is-primary"}`} type="submit">
            {on ? "알림 끄기" : "켜지면 알려주세요"}
          </button>
        </form>
      </section>

      {/* 지금 되는 것은 **여기서 끝내지 않고 제자리로 보낸다.** 준비 중
          묶음 안에서만 닿는 기능은 사용자에게 없는 기능이다 */}
      <h2 className="cm-sect">이것은 지금 됩니다</h2>
      <div className="cm-grid">
        {ALREADY.map((a) => (
          <div className="cm-card" key={a.href}>
            <h2>{a.label}</h2>
            <p>{a.body}</p>
            <div className="cm-grow" />
            <div className="cm-acts">
              <Link className="cm-btn" href={a.href}>열기</Link>
            </div>
          </div>
        ))}
      </div>

      <p className="cm-none" style={{ marginTop: 22 }}>
        값과 켜는 날은 정해지지 않았습니다. 정해지지 않은 것을 정해진 것처럼
        적지 않습니다.
      </p>
    </CmShell>
  );
}
