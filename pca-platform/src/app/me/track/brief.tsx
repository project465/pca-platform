import Link from "next/link";
import type { Brief } from "@/lib/assistant/brief";
import { SectionHeader } from "../ui";
import { wsSay } from "@/lib/me-v3/ws-say";
import type { WsLang } from "@/lib/me-v3/ws-lang";

/**
 * MAT 브리핑 판. `/me/track` 맨 위에 선다(기간권이 열려 있을 때만).
 *
 * 묻는 것은 하나다: **이번 주 무엇을 하면 되나.** 그래서 세 칸만 둔다.
 * 가까운 마감 · 이번 주 할 일 하나 · 여러 공고가 함께 요구하는데 아직 채우지
 * 못한 것. 값은 `brief.ts` 가 세고 여기서는 그리기만 한다.
 *
 * **합격 가능성을 적지 않는다.** 칸마다 서는 수는 남은 날과 공고 수뿐이다.
 */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mdIn = (lang: WsLang) => (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return lang === "en" ? `${MON[m - 1]} ${d}` : `${m}월 ${d}일`;
};
const cut = (s: string, n = 26) => {
  const x = s.replace(/\s+/g, " ").trim();
  return x.length > n ? `${x.slice(0, n - 1).trim()}…` : x;
};

export function BriefPanel({ brief, lang = "ko" }: { brief: Brief; lang?: WsLang }) {
  const { deadlines, task, gaps, pool } = brief;
  const t = wsSay(lang);
  const md = mdIn(lang);
  const dday = (left: number) => (left === 0 ? t("오늘") : `D-${left}`);
  return (
    <>
      <span id="brief" />
      <SectionHeader icon="target" title={t("이번 주 브리핑")}
        sub={t("{date} 기준입니다. 붙여 둔 공고와 적어 둔 경험만 읽고 정리했습니다.", { date: md(brief.today) })} />
      <div className="cm-panel is-one is-lead cm-brief">
        <div className="cm-brief-top">
          <section className="cm-brief-box" aria-labelledby="brief-dl">
            <h3 id="brief-dl">{t("가까운 마감")}</h3>
            {deadlines.length ? (
              <ul className="cm-brief-list">
                {deadlines.map((d) => (
                  <li key={d.id}>
                    <span className={`cm-brief-dday${d.left <= 3 ? " is-near" : ""}`}>{dday(d.left)}</span>
                    <Link href={`/me/track/posting/${d.id}`}>{d.label}</Link>
                    <small>{md(d.deadline)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cm-none">{t("마감일을 적어 둔 공고가 없습니다. 공고를 붙여 넣을 때 마감일을 적으면 여기에 남은 날이 나옵니다.")}</p>
            )}
            {deadlines.length ? (
              <a className="cm-brief-ics" href="/me/track/calendar" download>{t("보고 있는 공고 마감일을 휴대폰 달력에 넣기")}</a>
            ) : null}
          </section>

          <section className="cm-brief-box" aria-labelledby="brief-task">
            <h3 id="brief-task">{t("이번 주 할 일 하나")}</h3>
            {task ? (
              <>
                <p className="cm-brief-task">{task.body}</p>
                <p className="cm-none">
                  {!task.saved ? t("결과지에서 나온 할 일입니다.") : task.state === "doing" ? t("하는 중입니다.") : t("아직 시작하지 않았습니다.")}
                  {" "}{t("끝내면 지금 할 일 쪽에서 끝냄으로 바꿔 주세요.")}
                </p>
                <div className="cm-acts">
                  <Link className="cm-btn is-primary" href="/me/next">{t("지금 할 일 열기")}</Link>
                </div>
              </>
            ) : (
              <>
                <p className="cm-none">{t("남은 할 일이 없습니다. 이번 주에 한 과제나 활동 하나를 경험으로 적어 두세요.")}</p>
                <div className="cm-acts">
                  <Link className="cm-btn" href="/me/experience/new">{t("경험 적기")}</Link>
                </div>
              </>
            )}
          </section>
        </div>

        <section className="cm-brief-gaps" aria-labelledby="brief-gap">
          <h3 id="brief-gap">{t("여러 공고가 함께 요구하는데 아직 채우지 못한 것")}</h3>
          {gaps.length ? (
            <ol className="cm-brief-gaplist">
              {gaps.map((g) => (
                <li key={g.domain}>
                  <p className="cm-brief-gap-h">
                    <b>{g.area}</b>
                    <span className="cm-chip is-gap">{t("붙여 둔 공고 {total}개 중 {count}개가 요구", { total: g.total, count: g.count })}</span>
                    <span className="cm-chip">{g.status === "empty" ? t("아직 없음#track") : t("정리가 덜 됨")}</span>
                  </p>
                  <p className="cm-brief-asks">
                    {t("공고에 적힌 말:")} {g.asks.map((a) => `‘${cut(a.text)}’`).join(" · ")}
                  </p>
                  {g.next ? (
                    <p className="cm-brief-next"><b>{t("이번 주 작은 일")}</b><span>{g.next}</span></p>
                  ) : null}
                  <div className="cm-acts">
                    <Link className="cm-btn" href={`/me/experience/new?td=${encodeURIComponent(g.domain)}`}>
                      {t("이 영역 경험 적기")}
                    </Link>
                    <Link className="cm-btn" href={`/me/track/posting/${g.asks[0].id}`}>{t("공고 표 보기")}</Link>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="cm-none">
              {pool < 2
                ? t("공고를 두 개 이상 붙여 두면, 여러 공고가 함께 요구하는데 아직 비어 있는 것을 여기에 모읍니다.")
                : t("붙여 둔 공고 {n}개 가운데 두 곳 이상이 함께 요구하면서 비어 있는 것은 지금 없습니다.", { n: pool })}
            </p>
          )}
        </section>
        <p className="cm-note cm-brief-foot">
          {t("합격 가능성은 적지 않습니다. 공고에 적힌 요구와 내 기록을 나란히 놓고 공고 수를 센 것입니다.")}
        </p>
      </div>
    </>
  );
}
