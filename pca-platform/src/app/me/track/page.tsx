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
 * **없는 것을 적어 두지 않는다**(규격 §22).
 *
 * 한동안 이 쪽이 켜는 날 들어올 기능 여섯을 줄로 적고 있었다. 카드가
 * 아니라 줄이었어도 **쪽에서 가장 긴 덩이가 아직 없는 것**이었고, 그러면
 * 읽는 사람은 지금 쓸 수 있는 제품이 얼마 없다고 읽는다. 적는 것을 한
 * 문장으로 줄이고, 지금 되는 자리 둘을 가리킨다.
 *
 * 켜지면 알려 달라는 표시는 남긴다. **그것은 아직 없는 기능이 아니라
 * 지금 도는 기능이고**, 누가 기다리는지를 세는 유일한 자리다. 줄마다
 * 따로 받지 않고 열쇠 하나로 한 번만 받는다.
 */

/** 표시를 받는 열쇠 하나. 줄마다 따로 받지 않는다 */
const WAIT = "track";

/** 지금 되는 것. **Track 안에 두지 않고 제자리를 가리킨다** */
const ALREADY: { href: string; label: string }[] = [
  { href: "/me/explore", label: "산업·직무" },
  { href: "/me/apply", label: "지원 기록" },
];

export default async function Track() {
  const user = await requireUser();
  const on = (await trackInterest(user.id)).length > 0;

  return (
    <CmShell active="/me/track" title="Track">
      <CmHead
        kicker="준비 중"
        title="상황이 바뀔 때 다시 계산해 주는 자리"
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

      {/* 지금 되는 것은 **여기서 끝내지 않고 제자리로 보낸다.** 준비 중
          묶음 안에서만 닿는 기능은 사용자에게 없는 기능이다 */}
      <p className="cm-none">
        관심 산업·직무를 바꾸는 일과 지원한 곳을 적는 일은 지금 됩니다.
      </p>
      <div className="cm-acts" style={{ marginTop: 12 }}>
        {ALREADY.map((a) => (
          <Link className="cm-btn" href={a.href} key={a.href}>{a.label}</Link>
        ))}
      </div>
    </CmShell>
  );
}
