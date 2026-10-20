import Link from "next/link";
import AppShell from "@/components/app-shell";
import Icon from "@/components/icons";
import { requireRole } from "@/lib/session";
import { todayLabel } from "@/lib/today";

export const metadata = { title: "내 검사" };

export default async function StudentHome() {
  const user = await requireRole(["student"]);

  return (
    <AppShell user={user} area="student" current="/my">
      <div className="hello">
        <h1>
          <em>{user.name}</em> 학생, 안녕하세요
        </h1>
        <span className="today">{todayLabel()}</span>
      </div>

      <div className="grid-2">
        <div className="stack">
          <div className="schedule">
            <div className="row">
              <Icon name="calendar" />
              검사 일정
              <span className="pill">응시 대기</span>
            </div>
            <div className="inner">
              <b>지금 열린 검사가 없어요</b>
              <p>학과에서 회차를 열고 명단에 이름이 올라가면 응시 기간이 여기에 표시됩니다.</p>
            </div>
          </div>

          <div>
            <div className="section-title">바로가기</div>
            <div className="tiles">
              <div className="tile t1">
                <b>검사 응시</b>
                <span>열린 검사를 이어서 풀어요</span>
                <span className="ico"><Icon name="pencil" size={26} /></span>
                <span className="wait">열린 검사 없음</span>
              </div>
              <div className="tile t2">
                <b>내 결과지</b>
                <span>직무 적합도와 추천 과목</span>
                <span className="ico"><Icon name="report" size={26} /></span>
                <span className="wait">공개 전</span>
              </div>
              <Link className="tile t3" href="/password/change">
                <b>비밀번호 변경</b>
                <span>임시 비밀번호를 바꿔 두세요</span>
                <span className="ico"><Icon name="key" size={26} /></span>
                <span className="go"><Icon name="arrow" size={16} /></span>
              </Link>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>검사는 이렇게 진행돼요</h2>
          </div>
          <ol className="steps">
            <li>
              <div>
                <b>학과 명단 등록</b>
                <span>학과가 응시 명단에 올리면 검사가 열립니다.</span>
              </div>
            </li>
            <li>
              <div>
                <b>응시</b>
                <span>문항마다 바로 저장돼요. 중간에 나가도 이어서 풀 수 있습니다.</span>
              </div>
            </li>
            <li>
              <div>
                <b>학과 확인</b>
                <span>담당 교수가 결과를 확인합니다.</span>
              </div>
            </li>
            <li>
              <div>
                <b>결과지 공개</b>
                <span>공개되면 &lsquo;내 결과지&rsquo;에서 볼 수 있어요.</span>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
