import Link from "next/link";
import { currentState, experiencesOf, resultHistory } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import { domainName } from "@/lib/me-v3/runtime/session";
import { ZONE_TITLE_KO, gapKo } from "@/lib/me-v3/result/text.ko";
import { activeTrack } from "@/lib/track";
import { unreadCount } from "@/lib/assistant/nudges";
import { livePostingsOf } from "@/lib/assistant/posting";
import { nearDeadlines, kstToday } from "@/lib/assistant/brief";
import { majorNameOf } from "@/lib/me-v3/major-name";
import { Icon } from "@/components/sf/icon";
import { appUser } from "./user";
import { AppHead, Dday, Row, Section } from "./ui";
import { appMoveAction } from "./actions";

export const metadata = { title: "홈 · CareerMatri" };

/**
 * 앱 홈. **열자마자 셋을 안다**: 이번 주에 무엇을 하면 되는가 · 다가오는
 * 마감 · 지금까지 무엇이 확인됐는가.
 *
 * 웹 홈(`/me`)과 같은 함수를 읽는다(`currentState` · `openActions`). 판정을
 * 여기서 다시 하지 않고, 점수나 백분율도 만들지 않는다.
 */
export default async function AppHome() {
  const user = await appUser();
  const [st, act, track, unread, exps, hist] = await Promise.all([
    currentState(user.id), openActions(user.id), activeTrack(user.id),
    unreadCount(user.id), experiencesOf(user.id), resultHistory(user.id),
  ]);
  const live = track.on ? await livePostingsOf(user.id).catch(() => null) : null;
  const deadlines = live ? nearDeadlines(live.rows, kstToday()) : [];
  const open = act.rows.filter((r) => r.state !== "done" && r.state !== "dropped");
  const first = open.find((r) => r.horizon <= 30) ?? open[0] ?? null;
  const lastResult = hist.find((h) => h.kind === "SNAPSHOT") ?? null;
  const name = (n: string) => domainName(st.core, n);
  const zones = (z: keyof typeof ZONE_TITLE_KO) =>
    Object.entries(st.zoneOf).filter(([, v]) => v === z).map(([td]) => name(td));
  const strong = zones("Z1_EVIDENCE_ESTABLISHED");
  const half = zones("Z2_EVIDENCE_INCOMPLETE");
  const gap = st.gaps[0] ?? null;
  const major = st.model ? majorNameOf(st.core) : "";

  return (
    <>
      <AppHead
        kicker={major || "CareerMatri"}
        title={`${user.name}님, 오늘은 이것부터`}
        right={
          <Link href="/m/alerts" className="ma-icon-btn" aria-label={`알림 ${unread}개`}>
            <Icon name="bell" size={22} />
            {unread ? <span className="ma-badge">{unread > 9 ? "9+" : unread}</span> : null}
          </Link>
        }
      />
      <div className="ma-body">
        {st.stage === "NO_ASSESSMENT" ? (
          <div className="ma-card ma-hero">
            <p className="ma-kicker">시작하기</p>
            <h3>전공에서 해 본 일부터 확인해 볼까요?</h3>
            <p>가장 짧은 검사는 12분 정도 걸립니다. 끝나면 할 일과 경험 기록이 이 화면에 모입니다.</p>
            <Link className="ma-btn is-block" href="/cores">검사 시작</Link>
          </div>
        ) : st.stage === "IN_PROGRESS" && st.open ? (
          <div className="ma-card ma-hero">
            <p className="ma-kicker">풀던 검사</p>
            <h3>답한 데까지 저장돼 있어요</h3>
            <p>멈춘 문항에서 이어서 풀 수 있습니다.</p>
            <Link className="ma-btn is-block" href={`/v3/${st.open.id}`}>이어서 풀기</Link>
          </div>
        ) : first ? (
          <div className="ma-card ma-hero">
            <p className="ma-kicker">이번 주 할 일</p>
            <h3>{first.body}</h3>
            {first.td_code ? <p>{name(first.td_code)}</p> : null}
            <div className="ma-btns">
              <form action={appMoveAction}>
                <input type="hidden" name="id" value={first.id} />
                <input type="hidden" name="state" value="done" />
                <input type="hidden" name="body" value={first.body} />
                <input type="hidden" name="td" value={first.td_code ?? ""} />
                <input type="hidden" name="back" value="/m" />
                <button className="ma-btn is-block" type="submit">끝냈어요</button>
              </form>
              <Link className="ma-btn is-ghost" href="/m/todo">할 일 모두 보기</Link>
            </div>
          </div>
        ) : (
          <div className="ma-card ma-hero">
            <p className="ma-kicker">이번 주 할 일</p>
            <h3>담아 둔 할 일을 모두 끝냈어요</h3>
            <p>이번 주에 한 일 가운데 하나를 경험으로 적어 두면 다음 할 일이 이어집니다.</p>
            <Link className="ma-btn is-block" href="/me/experience/new">경험 적기</Link>
          </div>
        )}

        {deadlines.length ? (
          <Section title="다가오는 마감" more={{ href: "/m/mat", label: "MAT" }}>
            <div className="ma-list">
              {deadlines.map((d) => (
                <Row key={d.id} href="/me/track#brief" icon="clock" title={d.label}
                  sub={`${Number(d.deadline.slice(5, 7))}월 ${Number(d.deadline.slice(8, 10))}일 마감`}
                  tail={<Dday left={d.left} />} />
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="바로 하기">
          <div className="ma-quick">
            <Link href="/me/experience/new">
              <span className="ma-quick-ic"><Icon name="layers" size={18} /></span>
              <span><b>경험 적기</b><small>수업·프로젝트·실습 하나</small></span>
            </Link>
            <Link href="/m/capture">
              <span className="ma-quick-ic"><Icon name="doc" size={18} /></span>
              <span><b>사진으로 옮기기</b><small>수료증·성적증명서</small></span>
            </Link>
            <Link href="/me/track#posting">
              <span className="ma-quick-ic"><Icon name="send" size={18} /></span>
              <span><b>공고 붙여 넣기</b><small>내 기록과 맞대 보기</small></span>
            </Link>
            <Link href={lastResult?.attempt_id ? `/v3/${lastResult.attempt_id}/result` : "/m/profile#results"}>
              <span className="ma-quick-ic"><Icon name="report" size={18} /></span>
              <span><b>결과지 보기</b><small>{lastResult?.at ? `${lastResult.at} 검사` : "검사를 마치면 열립니다"}</small></span>
            </Link>
          </div>
        </Section>

        {st.model ? (
          <Section title="지금까지 확인된 것" more={{ href: "/me/state", label: "자세히" }}>
            <div className="ma-card ma-zones">
              {strong.length ? (
                <div className="ma-zone">
                  <span className="ma-zone-h">{ZONE_TITLE_KO.Z1_EVIDENCE_ESTABLISHED}</span>
                  <div className="ma-zone-names">
                    {strong.map((n) => <span key={n} className="ma-chip is-ok">{n}</span>)}
                  </div>
                </div>
              ) : null}
              {half.length ? (
                <div className="ma-zone">
                  <span className="ma-zone-h">{ZONE_TITLE_KO.Z2_EVIDENCE_INCOMPLETE}</span>
                  <div className="ma-zone-names">
                    {half.map((n) => <span key={n} className="ma-chip is-part">{n}</span>)}
                  </div>
                </div>
              ) : null}
              {!strong.length && !half.length ? (
                <p>아직 해 본 일이 적어서 영역을 나누지 못했습니다. 경험을 하나 적어 두면 여기부터 채워집니다.</p>
              ) : null}
              <p className="ma-meta">
                적어 둔 경험 {exps.length}건{st.recomputed_at ? ` · ${st.recomputed_at} 반영` : ""}
                {st.pending ? ` · 아직 반영하지 않은 경험 ${st.pending}건` : ""}
              </p>
            </div>
          </Section>
        ) : null}

        {gap ? (
          <Section title="먼저 채우면 좋은 자리">
            <div className="ma-card">
              <h3>{gapKo(gap, name(gap.domain)).title}</h3>
              <p>{gapKo(gap, name(gap.domain)).why}</p>
              <Link className="ma-btn is-sm" href="/me/state#gaps">왜 필요한지 보기</Link>
            </div>
          </Section>
        ) : null}
      </div>
    </>
  );
}
