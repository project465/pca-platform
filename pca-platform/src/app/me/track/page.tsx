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
const FEATURES: {
  code: string; label: string; body: string; blocked: string; href?: string;
}[] = [
  { code: "posting.watch", label: "새 채용공고 추적",
    body: "관심 산업과 직무에 새 공고가 뜨면 모아 둡니다.", blocked: "공고 자료 검토 전" },
  { code: "industry.shift", label: "산업별 요구역량 변화",
    body: "그 산업이 더 보는 판단이 달라지면 적습니다.", blocked: "표본과 근거 등급 필요" },
  { code: "evidence.match", label: "내 근거와 공고 자동 비교",
    body: "공고가 요구하는 축과 내가 가진 축을 가립니다.", blocked: "공고 자료 검토 전" },
  { code: "gap.timeline", label: "Gap 변화 추적",
    body: "무엇이 메워졌고 무엇이 남았는지 달마다 적습니다.", blocked: "자동 재분석 전" },
  { code: "monthly.report", label: "월간 Career Report",
    body: "한 달에 한 번 바뀐 것만 모아 보냅니다.", blocked: "메일 연결 전" },
  { code: "target.change", label: "목표를 바꾸면 다시 분석",
    body: "관심 산업이나 직무를 바꾸면 Gap을 다시 계산합니다.", blocked: "자동 재분석 전" },
  /* **지금 되는 것을 `준비 중` 으로 적지 않는다.** 관심 산업과 직무를 바꾸는
     일은 탐색 화면에서 이미 되고, Track 이 더할 것은 바꾼 뒤의 자동 재계산이다 */
  { code: "target.edit", label: "관심 산업·직무 바꾸기",
    body: "탐색 화면에서 언제든 바꾸실 수 있습니다.", blocked: "지금 됩니다",
    href: "/me/explore" },
  { code: "apply.track", label: "지원한 곳 관리",
    body: "직접 지원한 곳과 그 결과를 적어 둡니다.", blocked: "직접 적는 데까지",
    href: "/me/apply" },
  { code: "apply.role", label: "지원 직무별로 모아 보기",
    body: "같은 직무에 낸 곳을 묶어 어디서 막혔는지 봅니다.", blocked: "지원 기록이 쌓인 뒤",
    href: "/me/apply" },
];

export default async function Track() {
  const user = await requireUser();
  const on = new Set(await trackInterest(user.id));

  return (
    <CmShell active="/me/track" title="Track">
      <CmHead
        kicker="CareerMatri Track"
        title="상황이 바뀔 때 다시 계산해 주는 자리"
        lead={"검사 결과는 찍은 날의 상태입니다. 경험이 늘고 목표가 바뀌고 "
          + "산업이 요구하는 것이 달라지면 그때마다 다시 계산해야 합니다."}
      />

      <div className="cm-soon" style={{ marginBottom: 22 }}>
        <b>산업을 더 여는 상품이 아닙니다.</b> 여덟 산업과 여덟 직무는 진단에
        들어 있고 탐색에서 모두 보실 수 있습니다. Track이 맡는 것은 바뀐
        것을 따라가는 일입니다.
      </div>

      <div className="cm-grid">
        {FEATURES.map((f) => (
          <div className="cm-card" key={f.code}>
            <h2>{f.label} <em>{f.blocked}</em></h2>
            <p>{f.body}</p>
            <div className="cm-grow" />
            {f.href ? (
              <div className="cm-acts" style={{ marginBottom: 8 }}>
                <Link className="cm-btn" href={f.href}>지금 열기</Link>
              </div>
            ) : null}
            <form action={toggleInterest}>
              <input type="hidden" name="feature" value={f.code} />
              <input type="hidden" name="on" value={on.has(f.code) ? "0" : "1"} />
              <button className={`cm-btn${on.has(f.code) ? "" : " is-primary"}`} type="submit">
                {on.has(f.code) ? "알림 끄기" : "켜지면 알려주세요"}
              </button>
            </form>
          </div>
        ))}
      </div>

      <p className="cm-lead" style={{ marginTop: 22 }}>
        값과 켜는 날은 정해지지 않았습니다. 정해지지 않은 것을 정해진 것처럼
        적지 않습니다.
      </p>
      <div className="cm-acts" style={{ marginTop: 14 }}>
        <Link className="cm-btn" href="/me">내 CareerMatri로</Link>
      </div>
    </CmShell>
  );
}
