import Link from "next/link";
import { currentUser } from "@/lib/session";
import { mentorForUser } from "@/lib/mentoring";
import { priceTable } from "@/lib/billing";
import { payoutSettings } from "@/lib/refund";
import { payoutOf, won } from "@/lib/payout-math";
import { CAREER_PATHS, CAREER_PATH_LABEL } from "@/lib/anon";
import MentoringShell from "@/components/mentoring-shell";

export const metadata = { title: "멘토 모집 — 현멘" };
export const dynamic = "force-dynamic";

/**
 * 멘토 모집.
 *
 * 지금까지 모집 안내가 멘토 콘솔(/mentoring/mentor) 안에 얹혀 있었다. 그래서
 * 로그인한 사람에게는 아예 안 보이고, 주소를 건네주면 받는 쪽이 보는 화면이
 * 로그인 여부에 따라 달라졌다. 모집 글은 누구에게 보내도 같은 것이 보여야 한다.
 *
 * 금액은 지어내지 않는다. 운영사가 정한 정가표와 수수료·원천징수 값을 그대로
 * 읽어 실수령액까지 계산해서 보여준다. 값이 바뀌면 이 화면도 같이 바뀐다.
 */
export default async function JoinPage() {
  const user = await currentUser();
  const [mine, prices, settings] = await Promise.all([
    user ? mentorForUser(user.id) : Promise.resolve(null),
    priceTable(),
    payoutSettings(),
  ]);

  const fee = Number(settings.fee_percent);
  const wh = Number(settings.withholding_percent);
  const rows = prices.map((p) => ({
    minutes: p.session_minutes,
    ...payoutOf(p.amount, fee, wh),
  }));

  /** 이미 멘토면 여기서 다시 가입시킬 이유가 없다. 콘솔로 보낸다 */
  const cta = mine
    ? { href: "/mentoring/mentor", label: "멘토 콘솔로 가기" }
    : user
      ? { href: "/mentoring/mentor", label: "프로필 만들기" }
      : { href: "/signup?next=%2Fmentoring%2Fmentor", label: "가입하고 프로필 만들기" };

  return (
    <MentoringShell user={user} current="/mentoring/join" isMentor={Boolean(mine)}>
      <div className="page-head">
        <h1>멘토 모집</h1>
      </div>

      <p className="lede">
        석·박사 과정을 지나 지금 그 경로에 있는 분을 찾습니다. 뒤따라오는 사람에게
        30분에서 한 시간, 자기가 겪은 것을 그대로 이야기해 주는 일입니다.{" "}
        <b>이름도 회사도 나가지 않습니다.</b>
      </p>

      <h2 className="sec-h first">이런 분을 찾습니다</h2>
      <div className="path-grid">
        {CAREER_PATHS.map((p) => (
          <div key={p}>{CAREER_PATH_LABEL[p]}</div>
        ))}
      </div>
      <p className="help" style={{ marginTop: 10 }}>
        여섯 경로 중 하나에 지금 계시면 됩니다. 석사·박사 어느 쪽이든 상관없고,
        연차 제한도 두지 않습니다. 다만 <b>지금 그 일을 하고 계셔야</b> 합니다 —
        신청자가 듣고 싶은 것은 몇 년 전 이야기가 아니라 지금의 이야기입니다.
      </p>

      <h2 className="sec-h">얼마를 받습니까</h2>
      <p className="body" style={{ marginBottom: 12 }}>
        가격은 운영사가 정합니다. 멘토가 각자 값을 매기면 가격이 곧 서열 신호가 되고,
        그러면 익명이 의미를 잃습니다. 아래가 지금 적용 중인 정가표입니다.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>세션</th>
              <th className="num">신청자가 내는 돈</th>
              <th className="num">플랫폼 수수료 {fee}%</th>
              <th className="num">원천징수 {wh}%</th>
              <th className="num">실수령</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.minutes}>
                <td>{r.minutes}분</td>
                <td className="num">{won(r.gross)}</td>
                <td className="num muted">−{won(r.fee)}</td>
                <td className="num muted">−{won(r.withholding)}</td>
                <td className="num">
                  <b>{won(r.net)}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="help" style={{ marginTop: 10 }}>
        원천징수는 수수료를 뗀 뒤 금액에 붙습니다. 소득세법상 신고 의무가 있어
        운영사가 대신 떼고 신고합니다. 1원 단위는 항상 내림하므로 표에 적힌 금액보다
        덜 받으시는 일은 없습니다. 세션이 끝나고 <b>{settings.hold_hours}시간</b>이
        지나면 정산이 잡히고, 등록하신 계좌로 보내드립니다.
      </p>
      <p className="help" style={{ marginTop: 8 }}>
        학과 계약으로 들어온 학생은 본인이 내지 않지만, <b>멘토에게는 같은 금액이 지급됩니다.</b>
        학과가 대신 부담합니다 — 신청자가 누구냐에 따라 받으실 돈이 달라지지 않습니다.
      </p>

      <h2 className="sec-h">시간은 얼마나 씁니까</h2>
      <div className="policy">
        <b>여는 만큼만</b>
        <ul>
          <li>직접 연 시간대에만 신청이 들어옵니다. 열지 않으면 신청도 없습니다</li>
          <li>신청이 와도 거절할 수 있습니다. 거절 이유는 그대로 신청자에게 전달됩니다</li>
          <li>
            답하지 않고 24시간이 지나면 — 또는 그 시간대가 지나가면 — 자동으로 취소되고
            신청자는 전액 돌려받습니다
          </li>
          <li>세션은 {rows.map((r) => `${r.minutes}분`).join(" · ")} 중에서 고르십니다</li>
        </ul>
        <span>최소 시간이나 월 몇 건 같은 약정은 없습니다.</span>
      </div>

      <h2 className="sec-h">회사에 알려지지 않습니까</h2>
      <div className="policy">
        <b>가려지는 것과 가려지지 않는 것</b>
        <ul>
          <li>신청자 화면에는 별명과 속성만 나갑니다. 이름·회사명·연락처는 나가지 않습니다</li>
          <li>회의 제목에도 실명을 넣지 않습니다. 줌 참가자 목록은 양쪽 다 보기 때문입니다</li>
          <li>줌 회의는 운영사 계정으로 만들고, 줌이 보내는 안내 메일은 꺼져 있습니다</li>
          <li>
            <b>얼굴과 목소리는 드러날 수 있습니다.</b> 화상으로 만나기 때문입니다.
            회의는 카메라가 꺼진 채로 시작하고, 켜는 것은 각자 정하십니다
          </li>
          <li>줌에 들어가신 뒤 표시 이름을 별명으로 바꿔주세요 — 이것만 시스템이 대신 못 합니다</li>
        </ul>
        <span>
          녹화는 금지입니다. 자동 녹화를 꺼 두었고 상대 동의 없는 녹음·녹화는{" "}
          <Link href="/terms">이용약관</Link>에서 막고 있습니다.
        </span>
      </div>

      <h2 className="sec-h">시작하기까지</h2>
      <div className="visitor-steps">
        <div>
          <span className="no">1</span>
          <b>프로필을 만듭니다</b>
          <span className="why">별명 · 학위 · 진로 경로 · 연차 · 회사 규모 · 다룰 수 있는 직무 영역</span>
        </div>
        <div>
          <span className="no">2</span>
          <b>운영사가 현직 여부를 확인합니다</b>
          <span className="why">
            재직증명서나 회사 메일 인증 같은 것으로 확인합니다. 무엇으로 확인했는지 기록이
            남고, 근거가 비어 있는 프로필은 갤러리에 올라가지 않습니다
          </span>
        </div>
        <div>
          <span className="no">3</span>
          <b>지급 계좌를 등록합니다</b>
          <span className="why">
            등록하지 않으면 금액이 계산돼도 이체가 막힙니다. 주민등록번호는 원천징수
            신고용이며 암호화해 보관하고 화면에는 끝자리만 보입니다
          </span>
        </div>
        <div>
          <span className="no">4</span>
          <b>시간대를 엽니다</b>
          <span className="why">
            승낙하면 줌 회의가 자동으로 만들어지고 링크가 양쪽에 발송됩니다
          </span>
        </div>
      </div>

      <h2 className="sec-h">자주 나오는 질문</h2>
      <dl className="faq">
        <div>
          <dt>신청자가 어떤 사람인지 보고 정할 수 있나요?</dt>
          <dd>
            네. 승낙 전에 전공·과정·질문 세 줄이 보입니다. 실명은 보이지 않습니다 —
            익명은 양쪽 모두에게 적용됩니다.
          </dd>
        </div>
        <div>
          <dt>신청자가 오지 않으면요?</dt>
          <dd>
            콘솔에서 신고하시면 됩니다. 운영사가 확인한 뒤 인정되면 그 건은 <b>정상 지급</b>
            됩니다. 반대로 멘토가 나타나지 않은 것으로 인정되면 신청자에게 전액
            환불되고 지급은 없습니다.
          </dd>
        </div>
        <div>
          <dt>그만두고 싶으면요?</dt>
          <dd>
            열어둔 시간대를 닫으면 새 신청이 들어오지 않습니다. 탈퇴 절차를 따로
            밟지 않아도 되고, 확정된 세션만 마치시면 됩니다.
          </dd>
        </div>
        <div>
          <dt>회사 겸직 규정에 걸리지 않나요?</dt>
          <dd>
            이것은 저희가 답해드릴 수 없는 부분입니다. 소득이 발생하고 원천징수
            신고가 들어가므로, 회사 규정은 직접 확인하셔야 합니다.
          </dd>
        </div>
      </dl>
      <p className="help" style={{ marginTop: 10 }}>
        나머지는 <Link href="/mentoring/faq">자주 묻는 질문</Link>과{" "}
        <Link href="/mentoring/guide#mentor">이용 안내</Link>에 있습니다. 답이 없으면{" "}
        <Link href="/mentoring/contact?kind=mentor">문의</Link>로 물어보셔도 됩니다.
      </p>

      <div className="join" style={{ marginTop: 26 }}>
        <Link className="act solid" href={cta.href}>
          {cta.label}
        </Link>
        {user ? null : (
          <Link className="act" href="/login?next=%2Fmentoring%2Fmentor">
            이미 계정이 있습니다
          </Link>
        )}
        <Link className="act" href="/mentoring">
          멘토들이 어떻게 보이는지 먼저 보기
        </Link>
      </div>
    </MentoringShell>
  );
}
