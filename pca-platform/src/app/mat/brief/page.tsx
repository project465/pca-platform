import Link from "next/link";
import { matTitle } from "@/lib/mat/title";
import { requireUser } from "@/lib/session";
import { livePostingsOf } from "@/lib/assistant/posting";
import { buildBrief } from "@/lib/assistant/brief";
import { pickJobs } from "@/lib/mat/pick-jobs";
import { settingsOf } from "@/lib/assistant/settings";
import { openActions } from "@/lib/me-v3/open-actions";
import { ddayLabel, monthWeek } from "@/lib/mat/stage";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { BRIEF_TEXT as B, TITLE_TEXT } from "../mat-text";
import { oneLine } from "@/lib/mat/short";
import { matDigestAction } from "../actions";

export const generateMetadata = () => matTitle(TITLE_TEXT.brief);

/**
 * MAT 주간 브리핑(예상 화면 4번). 웹 작업공간의 브리핑과 **같은 계산**(`buildBrief`)을 MAT 꼴로 보인다.
 *
 * - 이번 주 할 일 하나 · 마감이 다가오는 분석한 공고 · 여러 공고에서 되풀이된 보완점 · 이번 주 새로 겹친 공고
 * - 받는 길: 메일(켜고 끄기) · 웹 알림. 카카오 알림톡은 준비 중이라 그렇게 적는다
 * - 숫자는 센 그대로다. 점수 · 합격 가능성을 만들지 않는다
 */
export default async function MatBrief() {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const [live, open, pool, set] = await Promise.all([
    livePostingsOf(user.id), openActions(user.id).catch(() => null),
    pickJobs(user.id, 1).catch(() => null), settingsOf(user.id),
  ]);
  const brief = buildBrief({
    core: live.core, postings: live.rows, exps: live.exps,
    actions: open?.rows ?? [], fromResult: open?.fromResult ?? false, lang,
  });
  /* 홈 알림과 같은 값(`pickJobs().fresh`) */
  const fresh = pool?.fresh ?? 0;
  const nameOf = new Map(live.rows.map((r) => [r.id, r.name ?? r.label]));

  return (
    <main>
      <div className="mt-top"><span className="mt-week">{monthWeek(lang)}</span></div>
      <h1 className="mt-h1">{t(B.title)}</h1>

      <section className="mt-diag" aria-label={t(B.task)}>
        <div className="mt-diag-k"><span>{t(B.task)}</span><b>{brief.task ? (brief.task.state === "doing" ? t(B.doing) : t(B.todo)) : ""}</b></div>
        <p>{brief.task ? oneLine(brief.task.body) : t(B.noTask)}</p>
        <Link href="/mat">{t(B.home)}</Link>
      </section>

      {/* 빈 칸은 칸째 숨긴다(2026-11-03 대표 "AI 느낌") */}
      {brief.deadlines.length ? (<>
        <h2 className="mt-h2">{t(B.near)}</h2>
        <div className="mt-list">
          {brief.deadlines.map((d) => (
            <Link key={d.id} href={`/mat/jobs/${d.id}`} className="mt-row mt-row-link">
              <div className="mt-row-b">
                <div className="mt-job-h"><p>{nameOf.get(d.id) ?? d.label}</p>
                  <span className={`mt-dday${d.left <= 7 ? "" : " is-quiet"}`}>{ddayLabel(d.left, lang)}</span></div>
                <small>{t(B.deadline, { d: d.deadline })}</small>
              </div>
            </Link>
          ))}
        </div>
      </>) : null}

      {brief.gaps.length ? (<>
        <h2 className="mt-h2">{t(B.gaps)}</h2>
        <div className="mt-list">
          {brief.gaps.map((g) => (
            <div key={g.domain} className="mt-row">
              <span className={`mt-mark${g.status === "empty" ? " is-none" : " is-part"}`} aria-hidden>{g.status === "empty" ? "✕" : "△"}</span>
              <div className="mt-row-b">
                <p><span className="mt-sr">{g.status === "empty" ? (lang === "en" ? "Missing" : "없음") : (lang === "en" ? "Partly" : "덜 됨")}: </span>{g.area} <span className="mt-meta">{t(B.places, { n: g.count })}</span></p>
                <small>{g.next ? oneLine(g.next) : t(B.gapNext)}</small>
                <Link className="mt-link" href={`/me/experience/new?td=${encodeURIComponent(g.domain)}`}>{t(B.writeExp)}</Link>
              </div>
            </div>
          ))}
        </div>
      </>) : null}

      {fresh ? (<>
        <h2 className="mt-h2">{t(B.fresh)}</h2>
        <p className="mt-empty" style={{ borderStyle: "solid" }}><Link href="/mat/jobs">{t(B.freshGo)}</Link></p>
      </>) : null}

      <h2 className="mt-h2">{t(B.alerts)}</h2>
      <ul className="mt-incl">
        <li>{t(B.mail)}<span>
          <form action={matDigestAction} style={{ display: "inline" }}>
            <input type="hidden" name="on" value={set.email_digest ? "0" : "1"} />
            <button type="submit" className="mt-link mt-linkbtn">{set.email_digest ? t(B.off) : t(B.on)}</button>
          </form></span></li>
        <li>{t(B.web)}<span><Link href="/mat/settings">{t(B.settings)}</Link></span></li>
        <li>{t(B.kakao)}<span>{t(B.soon)}</span></li>
      </ul>
    </main>
  );
}
