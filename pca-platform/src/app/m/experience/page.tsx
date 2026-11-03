import Link from "next/link";
import { experiencesOf, kindLabel, pendingRecompute } from "@/lib/me-v3/platform";
import { Icon } from "@/components/sf/icon";
import { appUser } from "../user";
import { AppHead, Empty, Section } from "../ui";

export const metadata = { title: "경험 · CareerMatri" };

/**
 * 경험. 적어 둔 기록을 한 줄씩 세우고, 아직 반영하지 않은 것이 있으면 맨
 * 위에서 알린다. **적는 화면은 웹 것을 그대로 쓴다**(`/me/experience/new`):
 * 일곱 칸짜리 단계 화면을 앱용으로 한 벌 더 두면 어느 날 둘이 갈린다.
 */
const STATUS: Record<string, { label: string; tone: string }> = {
  reflected: { label: "반영됨", tone: " is-ok" },
  saved: { label: "저장됨", tone: " is-blue" },
  draft: { label: "초안", tone: "" },
};

const month = (d: string | null) => (d ? `${d.slice(0, 4)}.${d.slice(5, 7)}` : "");

export default async function Experiences() {
  const user = await appUser();
  const [exps, pending] = await Promise.all([experiencesOf(user.id), pendingRecompute(user.id)]);

  return (
    <>
      <AppHead title="경험" kicker={exps.length ? `적어 둔 경험 ${exps.length}건` : "내 기록"} />
      <div className="ma-body">
        {pending ? (
          <div className="ma-card">
            <h3>새로 적은 경험 {pending}건을 아직 반영하지 않았어요</h3>
            <p>반영하면 현재 상태와 다음 할 일이 그 기록에 맞게 바뀝니다. 검사 당시 결과는 그대로 남습니다.</p>
            <Link className="ma-btn is-primary is-block" href="/me/recompute">반영하기</Link>
          </div>
        ) : null}

        {!exps.length ? (
          <Empty title="아직 적어 둔 경험이 없어요" cta={{ href: "/me/experience/new", label: "첫 경험 적기" }}>
            수업 과제, 캡스톤, 실습, 동아리 프로젝트 하나면 됩니다. 무엇을 직접 정했고 무엇이
            남았는지만 적어도 지원서에서 꺼내 쓸 수 있습니다.
          </Empty>
        ) : (
          <Section title="최근에 적은 것">
            <div className="ma-list">
              {exps.map((e) => {
                const s = STATUS[e.status] ?? STATUS.draft;
                const when = [month(e.started_on), month(e.ended_on)].filter(Boolean).join(" ~ ");
                return (
                  <Link key={e.id} href={`/me/experience/${e.id}/edit`} className="ma-row">
                    <span className="ma-row-ic"><Icon name="layers" size={18} /></span>
                    <span className="ma-row-body">
                      <b>{e.title}</b>
                      <small>{[kindLabel(e.kind), when].filter(Boolean).join(" · ")}</small>
                    </span>
                    <span className={`ma-chip${s.tone}`}>{s.label}</span>
                  </Link>
                );
              })}
            </div>
          </Section>
        )}

        <Section title="다른 방법으로 더하기">
          <div className="ma-list">
            <Link href="/m/capture" className="ma-row">
              <span className="ma-row-ic"><Icon name="doc" size={18} /></span>
              <span className="ma-row-body"><b>사진으로 옮기기</b><small>수료증·성적증명서를 찍으면 초안으로 옮깁니다</small></span>
              <Icon name="chev" size={16} className="ma-row-chev" />
            </Link>
            <Link href="/me/track#draft" className="ma-row">
              <span className="ma-row-ic"><Icon name="spark" size={18} /></span>
              <span className="ma-row-body"><b>메모로 남기기</b><small>편하게 적으면 MAT가 경험 양식으로 옮깁니다</small></span>
              <Icon name="chev" size={16} className="ma-row-chev" />
            </Link>
          </div>
        </Section>
      </div>
      <Link href="/me/experience/new" className="ma-fab">
        <span aria-hidden="true">＋</span> 경험 적기
      </Link>
    </>
  );
}
