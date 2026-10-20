import AppShell from "@/components/app-shell";
import Icon from "@/components/icons";
import { requireRole } from "@/lib/session";
import { todayLabel } from "@/lib/today";

export const metadata = { title: "학과 담당자" };

export default async function OrgHome() {
  const user = await requireRole(["org_admin", "instructor"]);
  const honorific = user.role === "instructor" ? "교수님" : "담당자님";

  return (
    <AppShell user={user} area="org" current="/org">
      <div className="hello">
        <h1>
          <em>{user.name}</em> {honorific}, 안녕하세요
        </h1>
        <span className="today">{todayLabel()}</span>
      </div>

      <div className="grid-2">
        <div className="stack">
          <div className="schedule">
            <div className="row">
              <Icon name="calendar" />
              회차 일정
              <span className="pill">진행 중 0</span>
            </div>
            <div className="inner">
              <b>진행 중인 회차가 없습니다</b>
              <p>회차를 열면 응시 기간과 응시 인원이 여기에 표시됩니다.</p>
            </div>
          </div>

          <div>
            <div className="section-title">자주 쓰는 메뉴</div>
            <div className="tiles">
              <div className="tile t1">
                <b>회차 만들기</b>
                <span>학기·학년별 응시 기간</span>
                <span className="ico"><Icon name="calendar" size={26} /></span>
                <span className="wait">준비 중</span>
              </div>
              <div className="tile t2">
                <b>명단 업로드</b>
                <span>엑셀로 계정 일괄 발급</span>
                <span className="ico"><Icon name="upload" size={26} /></span>
                <span className="wait">준비 중</span>
              </div>
              <div className="tile t3">
                <b>응시 현황</b>
                <span>응시·미응시 학생 확인</span>
                <span className="ico"><Icon name="chart" size={26} /></span>
                <span className="wait">준비 중</span>
              </div>
              <div className="tile t4">
                <b>단체 리포트</b>
                <span>학과 전체 결과와 공개</span>
                <span className="ico"><Icon name="report" size={26} /></span>
                <span className="wait">준비 중</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>검사 운영 순서</h2>
          </div>
          <ol className="steps">
            <li>
              <div>
                <b>회차 만들기</b>
                <span>대상 학년과 응시 기간을 정합니다.</span>
              </div>
            </li>
            <li>
              <div>
                <b>명단 올리기</b>
                <span>엑셀 명단으로 학생 계정이 한 번에 발급됩니다.</span>
              </div>
            </li>
            <li>
              <div>
                <b>학생 응시</b>
                <span>응시 현황에서 미응시 학생을 확인할 수 있습니다.</span>
              </div>
            </li>
            <li>
              <div>
                <b>결과 확인과 공개</b>
                <span>단체 리포트를 확인한 뒤 학생에게 결과를 공개합니다.</span>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
