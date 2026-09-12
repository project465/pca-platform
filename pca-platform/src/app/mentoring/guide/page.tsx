import Link from "next/link";
import { currentUser } from "@/lib/session";
import { mentorForUser } from "@/lib/mentoring";
import { priceTable } from "@/lib/billing";
import { payoutSettings, refundRules } from "@/lib/refund";
import MentoringShell from "@/components/mentoring-shell";

export const metadata = { title: "이용 안내 — 현멘" };
export const dynamic = "force-dynamic";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/**
 * 이용 안내.
 *
 * 요금·환불율·수수료는 글로 쓰지 않고 DB 에서 읽어 그린다. 값이 바뀌면 이 문서도
 * 같이 바뀌어야 하는데, 문장에 숫자를 박아두면 반드시 어긋난다. 어긋난 안내는
 * 없는 것보다 나쁘다.
 */
export default async function GuidePage() {
  const user = await currentUser();
  const [mine, prices, rules, settings] = await Promise.all([
    user ? mentorForUser(user.id) : Promise.resolve(null),
    priceTable(),
    refundRules(),
    payoutSettings(),
  ]);

  const fee = Number(settings.fee_percent);
  const wh = Number(settings.withholding_percent);
  const sample = prices.find((p) => p.session_minutes === 30) ?? prices[0] ?? null;
  const net = sample
    ? (() => {
        const f = Math.floor((sample.amount * fee) / 100);
        const t = Math.floor(((sample.amount - f) * wh) / 100);
        return { fee: f, wh: t, net: sample.amount - f - t };
      })()
    : null;

  return (
    <MentoringShell user={user} current="/mentoring/guide" isMentor={Boolean(mine)}>
      <div className="page-head">
        <h1>이용 안내</h1>
      </div>

      <p className="lede">
        현멘은 <b>석·박사가 석·박사에게 묻는 자리</b>입니다. 멘토는 학위 과정을 지나 지금 그
        경로에 있는 사람이고, 운영사가 현직 여부를 확인한 사람만 갤러리에 올라갑니다.
        회사 규모가 아니라 <b>학위와 진로 경로</b>가 먼저인 것이 학부 취업 서비스와 다른 점입니다.
      </p>

      <h2 className="sec-h first" id="how">신청부터 세션까지</h2>
      <ol className="flow-list">
        <li>
          <b>멘토를 고릅니다</b>
          <span>진로 경로·학위·전공 계열·직무 영역으로 거릅니다. 로그인 없이 둘러볼 수 있습니다.</span>
        </li>
        <li>
          <b>시간대를 고르고 세 줄로 묻습니다</b>
          <span>
            전공과 연구 주제 · 지금 고민 · 멘토에게 듣고 싶은 것. 멘토는 이 질문만 보고
            승낙을 판단하므로, 짧아도 구체적인 편이 좋습니다.
          </span>
        </li>
        <li>
          <b>결제합니다</b>
          <span>
            결제가 끝나야 멘토에게 전달됩니다. 결제창을 닫아도 ‘결제 대기’로 남아 내 신청에서
            이어서 낼 수 있습니다.
          </span>
        </li>
        <li>
          <b>멘토가 24시간 안에 답합니다</b>
          <span>
            거절되거나 24시간 안에 답이 없으면 자동으로 닫히고 결제도 함께 취소됩니다.
            기다리다 흐지부지되는 일은 없습니다.
          </span>
        </li>
        <li>
          <b>승낙되면 줌 회의가 자동으로 만들어집니다</b>
          <span>
            신청자에게는 참가 링크가, 멘토에게는 호스트 링크가 갑니다. 시작 24시간 전과
            1시간 전에 한 번씩 더 알려드립니다.
          </span>
        </li>
        <li>
          <b>세션이 끝나면 후기를 남깁니다</b>
          <span>별점과 한 줄. 작성자는 표시되지 않습니다.</span>
        </li>
      </ol>

      <h2 className="sec-h" id="price">요금</h2>
      <div className="panel">
        {prices.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>세션 길이</th>
                  <th style={{ textAlign: "right" }}>요금</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.session_minutes}>
                    <td>{p.session_minutes}분</td>
                    <td className="num">{won(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="help">요금은 준비 중입니다.</p>
        )}
        <p className="help" style={{ marginTop: 12 }}>
          세션 길이는 멘토가 정하고, 요금은 운영사가 정합니다. 멘토가 가격을 정하면 그 값이
          곧 서열 신호가 되어 익명이 흐려지기 때문입니다.
          <br />
          <b>학과 계약으로 계정을 받은 학생은 무료입니다.</b> 받은 계정으로 로그인하면
          결제 화면이 나오지 않습니다.
        </p>
      </div>

      <h2 className="sec-h" id="refund">취소와 환불</h2>
      <div className="panel">
        {rules.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>신청자가 스스로 취소하면</th>
                  <th style={{ textAlign: "right" }}>환불</th>
                  {sample ? (
                    <th style={{ textAlign: "right" }}>{won(sample.amount)} 기준</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.hours_before}>
                    <td>
                      {r.hours_before === 0
                        ? "그보다 늦게"
                        : `세션 시작 ${r.hours_before}시간 전까지`}
                    </td>
                    <td className="num">{r.percent === 0 ? "없음" : `${r.percent}%`}</td>
                    {sample ? (
                      <td className="num">
                        {won(Math.floor((sample.amount * r.percent) / 100))}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="help">환불 규정이 아직 정해지지 않았습니다.</p>
        )}
        <p className="help" style={{ marginTop: 12 }}>
          멘토가 거절하거나 24시간 안에 답하지 않거나 멘토 사정으로 취소된 경우에는 시점과
          무관하게 <b>전액 환불</b>합니다.
          <br />
          48시간을 전액 기준으로 둔 것은 멘토가 그 시간을 비워두기 때문입니다. 하루 전보다
          늦은 취소는 그 자리를 다시 팔 수 없습니다.
          <br />
          취소 버튼을 누르기 전에 그 건이 지금 얼마를 돌려받는지 금액으로 보여드립니다.
        </p>
      </div>

      <h2 className="sec-h" id="anon">익명은 어디까지인가</h2>
      <div className="panel">
        <p>
          <b>이름과 회사는 끝까지 가리고, 얼굴과 목소리는 각자 고릅니다.</b>
        </p>
        <div className="two-col">
          <div>
            <h3 className="mini-h">시스템이 가리는 것</h3>
            <ul className="tick">
              <li>실명·회사명·연락처가 어느 화면에도 나오지 않습니다</li>
              <li>줌 회의는 운영사 계정으로 만들고, 줌이 보내는 안내 메일은 꺼 둡니다</li>
              <li>카메라는 꺼진 채로 시작합니다</li>
              <li>자동 녹화를 하지 않습니다</li>
            </ul>
          </div>
          <div>
            <h3 className="mini-h">가릴 수 없는 것</h3>
            <ul className="tick">
              <li>세션에서 얼굴과 목소리는 드러날 수 있습니다</li>
              <li>줌의 표시 이름은 참가자가 스스로 적는 것이라 강제할 수 없습니다</li>
            </ul>
            <p className="help">
              멘토에게는 별명으로 바꾸는 방법을 안내하고 있습니다. 지킬 수 없는 것을
              지킨다고 말하지 않겠습니다.
            </p>
          </div>
        </div>
        <p className="help">
          멘토의 신원을 알아내려 하거나 세션을 상대 동의 없이 녹화·녹음하는 것은{" "}
          <Link href="/terms">이용약관</Link>에서 금지하고 있습니다.
        </p>
      </div>

      <h2 className="sec-h" id="noshow">나타나지 않았을 때</h2>
      <div className="panel">
        <p>
          약속한 시각에 상대가 오지 않으면 세션 종료 후 <b>{settings.hold_hours}시간 안에</b>{" "}
          신고할 수 있습니다. 신청자도 멘토도 자기 화면에서 신고합니다.
        </p>
        <ul className="tick">
          <li>
            <b>멘토가 오지 않은 것으로 판정되면</b> 전액 환불하고 그 세션의 정산은 하지 않습니다
          </li>
          <li>
            <b>신청자가 오지 않은 것으로 판정되면</b> 멘토가 그 시간을 비워둔 것이므로 환불하지 않습니다
          </li>
          <li>신고가 곧바로 환불이 되지는 않습니다. 운영사가 양쪽 이야기를 확인한 뒤 정합니다</li>
        </ul>
        <p className="help">
          판정할 시간을 벌기 위해 그동안 정산을 멈춥니다. 돈이 이미 나간 뒤에는 노쇼를
          인정해도 되돌릴 곳이 없기 때문입니다.
        </p>
      </div>

      <h2 className="sec-h" id="mentor">멘토가 받는 돈</h2>
      <div className="panel">
        {net && sample ? (
          <>
            <p>
              {sample.session_minutes}분 세션 {won(sample.amount)} 기준입니다.
            </p>
            <div className="calc">
              <span>{won(sample.amount)}</span>
              <span className="op">−</span>
              <span>
                운영 수수료 {fee}% <b>{won(net.fee)}</b>
              </span>
              <span className="op">−</span>
              <span>
                원천징수 {wh}% <b>{won(net.wh)}</b>
              </span>
              <span className="op">=</span>
              <span className="result">{won(net.net)}</span>
            </div>
          </>
        ) : (
          <p className="help">정산 요율이 아직 설정되지 않았습니다.</p>
        )}
        <ul className="tick" style={{ marginTop: 14 }}>
          <li>세션이 끝나고 신고 기간({settings.hold_hours}시간)이 지난 뒤 정산이 잡힙니다</li>
          <li>멘토 콘솔에 등록한 계좌로 보냅니다. 계좌가 없으면 지급할 수 없습니다</li>
          <li>
            신청자가 늦게 취소해 환불되지 않은 금액도 멘토 몫입니다 — 그 시간을 비워두었기
            때문입니다. 다만 그 시간대를 다른 사람이 가져갔으면 제외합니다
          </li>
        </ul>
        <div className="join" style={{ marginTop: 16 }}>
          <Link className="act solid" href="/mentoring/mentor">
            멘토로 참여하기
          </Link>
        </div>
      </div>

      <p className="foot-note">
        더 궁금한 것은 <Link href="/mentoring/faq">자주 묻는 질문</Link>에 있습니다.
      </p>
    </MentoringShell>
  );
}
