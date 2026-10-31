import Link from "next/link";
import { activeTrack } from "@/lib/track";
import { livePostingsOf } from "@/lib/assistant/posting";
import { buildBrief, daysLeft, kstToday } from "@/lib/assistant/brief";
import { openActions } from "@/lib/me-v3/open-actions";
import { appUser } from "../user";
import { AppHead, Dday, Empty, Row, Section } from "../ui";

export const metadata = { title: "MAT · CareerMatri" };

/**
 * MAT(AI 취업비서). 맨 위가 **이번 주 브리핑**이고 그 아래가 보고 있는
 * 공고다. 브리핑은 웹 MAT 와 같은 함수(`buildBrief`)를 부른다.
 *
 * **이 화면에서 결제하지 않는다.** 앱 안에서 디지털 상품을 팔면 스토어
 * 결제 규칙을 받는다(`APP_OPTIONS.md` 3절). 이용하지 않는 분께는 무엇을
 * 하는지만 적고 시작은 웹 MAT 화면으로 보낸다. 앱을 낼 때 이 자리를 정한다.
 */
const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" })
    .format(new Date(iso));

export default async function Mat() {
  const user = await appUser();
  const track = await activeTrack(user.id);

  if (!track.on) {
    return (
      <>
        <AppHead title="MAT" kicker="AI 취업비서" />
        <div className="ma-body">
          <div className="ma-card ma-hero">
            <p className="ma-kicker">매주 한 판으로</p>
            <h3>할 일 하나, 다가오는 마감, 여러 공고가 함께 묻는 빈칸</h3>
            <p>결과지에서 정한 할 일과 적어 둔 경험을 이어받아 이번 주에 할 것을 모아 줍니다.</p>
            <Link className="ma-btn is-block" href="/me/track">MAT 알아보기</Link>
          </div>
          <Section title="MAT가 하는 일">
            <div className="ma-list">
              <Row href="/me/track" icon="check" title="이번 주 할 일 하나" sub="끝냈다고 표시하면 다음 할 일이 이어서 나옵니다" />
              <Row href="/me/track" icon="send" title="공고와 내 기록 비교" sub="요구 항목마다 설명할 수 있는 것과 빈칸을 나눠 봅니다" />
              <Row href="/me/track" icon="doc" title="지원서 문장 뼈대" sub="내 기록으로 세 줄 뼈대까지만 만들고, 없는 내용은 지어 넣지 않습니다" />
              <Row href="/me/track" icon="clock" title="마감 챙기기" sub="D-day로 보여 주고 휴대전화 달력에 넣을 수 있습니다" />
            </div>
          </Section>
          <p className="ma-note">학교에서 MAT 이용권을 열어 준 경우 바로 쓸 수 있습니다.</p>
        </div>
      </>
    );
  }

  const [live, act] = await Promise.all([
    livePostingsOf(user.id).catch(() => ({ rows: [], core: null, exps: [] })),
    openActions(user.id).catch(() => null),
  ]);
  const brief = buildBrief({
    core: live.core, postings: live.rows, exps: live.exps,
    actions: act?.rows ?? [], fromResult: act?.fromResult ?? false,
  });
  const today = kstToday();
  const watching = live.rows.filter((p) => p.state !== "closed");

  return (
    <>
      <AppHead title="MAT" kicker={track.until ? `이용 중 · ${fmt(track.until)}까지` : "이용 중"} />
      <div className="ma-body">
        <Section title="이번 주 브리핑">
          <div className="ma-card ma-hero">
            <p className="ma-kicker">이번 주 할 일 하나</p>
            <h3>{brief.task?.body ?? "이번 주에 한 일 하나를 경험으로 적어 두세요"}</h3>
            <div className="ma-btns">
              <Link className="ma-btn" href={brief.task ? "/m/todo" : "/me/experience/new"}>
                {brief.task ? "할 일로 가기" : "경험 적기"}
              </Link>
            </div>
          </div>
          {brief.gaps.length ? (
            <div className="ma-card">
              <p className="ma-kicker" style={{ marginTop: 0 }}>여러 공고가 함께 요구하는데 아직 빈 것</p>
              {brief.gaps.slice(0, 3).map((g) => (
                <p key={g.domain} style={{ margin: "8px 0 0" }}>
                  <b>{g.area}</b>{" "}
                  <span className="ma-meta">공고 {g.total}개 중 {g.count}개가 요구{g.must ? ` · 필수 ${g.must}` : ""}</span>
                </p>
              ))}
            </div>
          ) : null}
        </Section>

        <Section title="보고 있는 공고" more={{ href: "/me/track#posting", label: "붙여 넣기" }}>
          {watching.length ? (
            <div className="ma-list">
              {watching.map((p) => {
                const left = p.deadline ? daysLeft(p.deadline, today) : null;
                return (
                  <Row key={p.id} href="/me/track#posting" icon="send" title={p.label}
                    sub={p.deadline ? `${fmt(p.deadline)} 마감` : "마감일 없음"}
                    tail={left !== null && left >= 0 ? <Dday left={left} /> : undefined} />
                );
              })}
            </div>
          ) : (
            <Empty title="붙여 둔 공고가 없어요" cta={{ href: "/me/track#posting", label: "공고 붙여 넣기" }}>
              직접 찾은 공고 본문을 붙여 넣으면 요구 항목마다 내 기록과 비교해 드립니다.
            </Empty>
          )}
        </Section>

        <Section title="도구">
          <div className="ma-list">
            <Row href="/me/track#draft" icon="spark" title="메모를 경험으로" sub="편하게 적으면 경험 양식으로 옮깁니다" />
            <Row href="/m/capture" icon="doc" title="사진으로 옮기기" sub="수료증·성적증명서를 찍어 초안으로" />
            <Row plain href="/me/track/calendar" icon="clock" title="마감을 달력에 넣기" sub="휴대전화 달력으로 한 번에" />
            <Row href="/m/profile#settings" icon="bell" title="알림 설정" sub="기기 알림과 메일 브리핑" />
          </div>
        </Section>
      </div>
    </>
  );
}
