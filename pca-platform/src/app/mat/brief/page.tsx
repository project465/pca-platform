import Link from "next/link";
import { requireUser } from "@/lib/session";
import { livePostingsOf } from "@/lib/assistant/posting";
import { buildBrief } from "@/lib/assistant/brief";
import { postingsForMe } from "@/lib/assistant/match";
import { settingsOf } from "@/lib/assistant/settings";
import { openActions } from "@/lib/me-v3/open-actions";
import { isoWeek, monthWeekKo } from "@/lib/mat/stage";
import { matDigestAction } from "../actions";

export const metadata = { title: "주간 브리핑 · MAT" };

/**
 * MAT 주간 브리핑(예상 화면 4번). 웹 작업공간의 브리핑과 **같은 계산**(`buildBrief`)을 MAT 꼴로 보인다.
 *
 * - 이번 주 할 일 하나 · 마감이 다가오는 분석한 공고 · 여러 공고에서 되풀이된 보완점 · 이번 주 새로 겹친 공고
 * - 받는 길: 메일(켜고 끄기) · 웹 알림. 카카오 알림톡은 준비 중이라 그렇게 적는다
 * - 숫자는 센 그대로다. 점수 · 합격 가능성을 만들지 않는다
 */
export default async function MatBrief() {
  const user = await requireUser();
  const [live, open, pool, set] = await Promise.all([
    livePostingsOf(user.id), openActions(user.id).catch(() => null),
    postingsForMe(user.id, 200).catch(() => null), settingsOf(user.id),
  ]);
  const brief = buildBrief({
    core: live.core, postings: live.rows, exps: live.exps,
    actions: open?.rows ?? [], fromResult: open?.fromResult ?? false, lang: "ko",
  });
  const weekAgo = Date.now() - 7 * 86_400_000;
  const fresh = (pool?.rows ?? []).filter((r) => Date.parse(r.captured_at) >= weekAgo).length;

  return (
    <main>
      <div className="mt-top"><span className="mt-week">W{isoWeek()} · {monthWeekKo()}</span><span className="mt-week">{brief.today}</span></div>
      <h1 className="mt-h1">이번 주 브리핑</h1>

      <section className="mt-diag" aria-label="이번 주 할 일">
        <div className="mt-diag-k"><span>이번 주 할 일 하나</span><b>{brief.task ? (brief.task.state === "doing" ? "하는 중" : "시작 전") : "없음"}</b></div>
        <p>{brief.task ? brief.task.body : "열린 할 일이 없습니다. 공고를 하나 분석하면 마감 전 할 일이 생깁니다."}</p>
        <Link href="/mat">홈에서 끝냄 표시하기</Link>
      </section>

      <h2 className="mt-h2">마감이 다가오는 공고 <small>{brief.deadlines.length ? `${brief.deadlines.length}건` : ""}</small></h2>
      {brief.deadlines.length ? (
        <div className="mt-list">
          {brief.deadlines.map((d) => (
            <Link key={d.id} href={`/mat/jobs/${d.id}`} className="mt-row mt-row-link">
              <div className="mt-row-b">
                <div className="mt-job-h"><p>{d.label}</p>
                  <span className={`mt-dday${d.left <= 7 ? "" : " is-quiet"}`}>{d.left <= 0 ? "오늘 마감" : `D-${d.left}`}</span></div>
                <small>마감 {d.deadline}</small>
              </div>
            </Link>
          ))}
        </div>
      ) : <p className="mt-empty">2주 안에 마감되는 분석한 공고가 없습니다.</p>}

      <h2 className="mt-h2">여러 공고에서 되풀이된 보완점</h2>
      {brief.gaps.length ? (
        <div className="mt-list">
          {brief.gaps.map((g) => (
            <div key={g.domain} className="mt-row">
              <span className={`mt-mark${g.status === "empty" ? " is-none" : " is-part"}`} aria-hidden>{g.status === "empty" ? "✕" : "△"}</span>
              <div className="mt-row-b">
                <p><span className="mt-sr">{g.status === "empty" ? "없음" : "덜 됨"}: </span>{g.area}</p>
                <small>분석한 공고 {g.total}개 중 {g.count}개가 요구합니다(필수 {g.must}개).{g.next ? ` 이번 주: ${g.next}` : ""}</small>
                <div className="mt-chips">{g.asks.slice(0, 3).map((a) => <span key={a.id + a.text} className="mt-chip">공고: {a.label}</span>)}</div>
                <Link className="mt-link" href={`/me/experience/new?td=${encodeURIComponent(g.domain)}`}>이 영역 경험 적기</Link>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="mt-empty">공고를 두 개 이상 분석하면 여러 공고가 같이 요구하는 것이 여기 섭니다.</p>}

      <h2 className="mt-h2">이번 주 새로 겹친 공고</h2>
      <p className="mt-empty" style={{ borderStyle: "solid" }}>
        {fresh ? <>내 경험 · 자료와 겹치는 새 공고 <b>{fresh}건</b> — <Link href="/mat/jobs">공고 보기</Link></> : "이번 주에 새로 겹친 공고는 없습니다."}
      </p>

      <h2 className="mt-h2">받는 방법</h2>
      <ul className="mt-incl">
        <li>메일 브리핑 (월요일 아침)<span>
          <form action={matDigestAction} style={{ display: "inline" }}>
            <input type="hidden" name="on" value={set.email_digest ? "0" : "1"} />
            <button type="submit" className="mt-link mt-linkbtn">{set.email_digest ? "받는 중 · 끄기" : "꺼짐 · 켜기"}</button>
          </form></span></li>
        <li>웹 알림 (마감 · 새 공고)<span><Link href="/me/track">설정</Link></span></li>
        <li>카카오 알림톡<span>준비 중</span></li>
      </ul>
    </main>
  );
}
