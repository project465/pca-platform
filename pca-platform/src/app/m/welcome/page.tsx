import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";

export const metadata = { title: "CareerMatri" };

/**
 * 앱을 처음 연 사람의 첫 화면. **무엇을 하는 앱인지 세 줄로 말하고 로그인으로
 * 보낸다.** 넘겨 보는 소개 화면 여러 장을 두지 않는다: 이 앱을 여는 사람은
 * 대부분 학교에서 아이디를 받고 온 학생이라 곧장 로그인하려 한다.
 *
 * 로그인한 사람은 바로 홈으로 간다.
 */
export default async function Welcome() {
  const u = await currentUser().catch(() => null);
  if (u) redirect("/m");
  return (
    <main className="ma-welcome">
      <div>
        <div className="ma-brand">
          <img src="/brand/careermatri/app-192.png" alt="" width={36} height={36} />
          CareerMatri
        </div>
        <h1>전공에서 해 본 일을 지원서에 쓸 경험으로</h1>
        <p className="ma-lead">검사 결과에서 정한 할 일을 매주 이어 가고, 해 본 일을 기록으로 쌓습니다.</p>
      </div>

      <ol className="ma-steps">
        <li>
          <span className="ma-step-no">1</span>
          <span><b>검사로 시작해요</b><small>전공에서 무엇을 직접 정해 봤는지 확인합니다</small></span>
        </li>
        <li>
          <span className="ma-step-no">2</span>
          <span><b>할 일을 하나씩 끝내요</b><small>이번 주에 할 일 하나와 다가오는 마감을 챙깁니다</small></span>
        </li>
        <li>
          <span className="ma-step-no">3</span>
          <span><b>해 본 일을 남겨요</b><small>수업·실습·수료증을 경험 기록으로 옮겨 지원서에 씁니다</small></span>
        </li>
      </ol>

      <div>
        <div style={{ display: "grid", gap: 10 }}>
          <Link className="ma-btn is-primary is-block" href="/login?next=/m">로그인</Link>
          <Link className="ma-btn is-block" href="/start">처음이에요</Link>
        </div>
        <p className="ma-fine">학교에서 받은 아이디도 같은 로그인으로 들어갑니다.</p>
      </div>
    </main>
  );
}
