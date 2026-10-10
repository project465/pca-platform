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
 * **앞으로 할 것과 지금 되는 것을 같은 무게로 둔다**(규격 §16·§17).
 *
 * 한동안 이 쪽이 켜는 날 들어올 기능 여섯을 줄로 적고 있었고, 그것이
 * **쪽에서 가장 긴 덩이가 아직 없는 것**이라 지우고 한 문장으로 줄였다.
 * 그랬더니 이번에는 반대쪽으로 넘어갔다: 쪽에 선 것이 머리글과 단추
 * 하나뿐이라 **덜 만든 화면**으로 읽혔다.
 *
 * 그래서 둘을 나란히 둔다. 앞으로 할 것 넷과 지금 되는 것 둘이다.
 * **넷을 넘기지 않고 카드로 그리지 않는다**: 줄로 적으면 계획이고,
 * 테를 두르고 아이콘을 붙이면 그 순간 **있는 기능처럼 보인다**(규격
 * §16 — 디자인으로 기능이 있는 것처럼 보이게 하지 않는다).
 *
 * 켜지면 알려 달라는 표시는 남긴다. **그것은 아직 없는 기능이 아니라
 * 지금 도는 기능이고**, 누가 기다리는지를 세는 유일한 자리다. 줄마다
 * 따로 받지 않고 열쇠 하나로 한 번만 받는다.
 */

/** 표시를 받는 열쇠 하나. 줄마다 따로 받지 않는다 */
const WAIT = "track";

/**
 * 켜는 날 들어오는 것(규격 §16).
 *
 * **넷까지다.** 그리고 **날짜를 적지 않는다**: 값과 켜는 날이 정해지지
 * 않았으므로 적으면 그것이 약속이 된다.
 */
const PLANNED: string[] = [
  "관심 산업·직무가 바뀌면 다시 비교하기",
  "새 경험을 현재 상태에 저절로 더하기",
  "지원한 곳과 내 근거를 나란히 보기",
  "달라진 것만 모은 월간 리포트",
];

/** 지금 되는 것. **Track 안에 두지 않고 제자리를 가리킨다** */
const ALREADY: { href: string; label: string }[] = [
  { href: "/me/explore", label: "산업·직무" },
  { href: "/me/apply", label: "지원 기록" },
];

export default async function Track() {
  const user = await requireUser();
  const on = (await trackInterest(user.id)).length > 0;

  return (
    /* **세로 가운데로 띄우지 않는다**(규격 §17). 담긴 것이 둘 뿐일 때
       가운데 맞춤은 빈 면을 위아래로 갈라 놓아 더 비어 보인다 */
    <CmShell active="/me/track" title="Track">
      <CmHead
        kicker="준비 중"
        title="상황이 바뀌면 다시 계산해 드립니다"
        lead={"검사 결과는 찍은 날의 상태입니다. 경험이 늘고 목표가 바뀌면 "
          + "그때마다 다시 계산하는 일을 Track 이 맡습니다. 아직 켜지지 "
          + "않았고, 값과 켜는 날은 정해지지 않았습니다."}
        actions={
          <form action={toggleInterest}>
            <input type="hidden" name="feature" value={WAIT} />
            <input type="hidden" name="on" value={on ? "0" : "1"} />
            <button className={`cm-btn${on ? "" : " is-primary"}`} type="submit">
              {on ? "알림 끄기" : "켜지면 알려주세요"}
            </button>
          </form>
        }
      />

      {/* **두 묶음을 나란히 둔다**(규격 §16). 앞엣것은 줄이고 뒤엣것은
          누를 수 있는 자리라, 생김새가 달라서 어느 쪽이 지금 되는지가
          읽는 사람에게 모양으로 갈린다 */}
      <h2 className="cm-sect">앞으로 제공할 기능</h2>
      <div className="cm-panel is-one">
        <div className="cm-pane">
          <div className="cm-rows">
            {PLANNED.map((t) => (
              <p className="cm-row" key={t}><b>{t}</b></p>
            ))}
          </div>
          <p className="cm-none">
            켜는 날과 값은 아직 정해지지 않았습니다.
          </p>
        </div>
      </div>

      {/* 지금 되는 것은 **여기서 끝내지 않고 제자리로 보낸다.** 준비 중
          묶음 안에서만 닿는 기능은 사용자에게 없는 기능이다 */}
      <h2 className="cm-sect">지금 되는 것</h2>
      <div className="cm-panel is-one">
        <div className="cm-pane">
          <p>관심 산업·직무를 바꾸는 일과 지원한 곳을 적는 일은 지금 됩니다.</p>
          <div className="cm-acts">
            {ALREADY.map((a) => (
              <Link className="cm-btn" href={a.href} key={a.href}>{a.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </CmShell>
  );
}
