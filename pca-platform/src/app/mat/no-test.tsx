import Link from "next/link";
import { sellableCores } from "@/lib/me-v3/core-registry";
import { activeCore } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import { pickJobs } from "@/lib/mat/pick-jobs";
import { oneLine } from "@/lib/mat/short";
import { minutesLabel, tierMinutes } from "@/lib/tier-minutes";
import { moneyText } from "@/lib/mat/money-text";
import type { MatUiLang } from "@/lib/mat/copy";
import { enSummaries } from "@/lib/mat/posting-en";
import { PRICING_HREF } from "@/lib/pricing/config";
import type { MatAccess } from "@/lib/mat-access";
import { JobCard } from "./job-card";
import { matPickCore } from "./actions";

/**
 * 검사 없이 시작한 MAT 홈(시안 NoTest, 2026-11-03 대표 결정 "개인은 검사 없이 가입해 MAT 바로 사용").
 *
 * - 전공이 없으면 먼저 하나 고른다(공고 목록과 요건 사전이 전공 단위다). 검사를 하면 그 전공으로 바뀐다
 * - `공고 분석하기 · 무료 1회` 는 공고 화면으로 간다. 무료를 쓰면 같은 자리에 쓴 것을 적는다
 * - 검사 전 · 후 비교는 **달라지는 것만** 적는다. 숫자(00% 더)를 쓰지 않는다
 * - 맞는 공고는 갯수와 위 세 개, 이번 주 할 일은 하나(무료 범위)
 */
export async function NoTestHome({ userId, acc, lang = "ko" }: { userId: string; acc: MatAccess; lang?: MatUiLang }) {
  const NOTEST = moneyText(lang).NOTEST;
  if (!acc.core) {
    const cores = sellableCores("KR");
    return (
      <main>
        <div className="mt-top"><span className="mt-week">{NOTEST.kicker}</span></div>
        <h1 className="mt-h1">{NOTEST.hello}</h1>
        <p className="mt-lead">{NOTEST.pickCore}</p>
        <form action={matPickCore} className="mt-form">
          <label className="mt-field">
            <span>{NOTEST.pickCore}</span>
            <select name="core" required defaultValue="">
              <option value="" disabled>-</option>
              {cores.map((c) => <option key={c.code} value={c.code}>{lang === "en" ? c.name_en ?? c.name_ko : c.name_ko}</option>)}
            </select>
          </label>
          <button type="submit" className="mt-btn is-main is-block">{NOTEST.pickCoreGo}</button>
          <p className="mt-note">{NOTEST.pickCoreNote}</p>
        </form>
      </main>
    );
  }
  const core = await activeCore(userId);
  const [jobs, act] = await Promise.all([
    pickJobs(userId, 60).catch(() => null),
    openActions(userId).catch(() => null),
  ]);
  const list = jobs ? (jobs.main.length ? jobs.main : jobs.broad) : [];
  const open = (act?.rows ?? []).filter((r) => r.state !== "done" && r.state !== "dropped");
  const week = open.slice(0, acc.weekTasks);
  const m = (() => { try { return minutesLabel(tierMinutes(core).BASIC, lang); } catch { return null; } })();
  const en = lang === "en" ? await enSummaries(list.slice(0, 3).map((p) => p.id)) : undefined;

  return (
    <main>
      <div className="mt-top"><span className="mt-week">{NOTEST.kicker}</span></div>
      <h1 className="mt-h1">{NOTEST.hello}</h1>
      <p className="mt-lead">{NOTEST.lead}</p>
      {acc.freeLeft > 0 ? (
        <Link className="mt-btn is-main is-block" href="/mat/jobs">{NOTEST.analyzeFree}</Link>
      ) : (
        <p className="mt-note">{NOTEST.analyzeUsed} · <Link href={PRICING_HREF}>{NOTEST.passLink}</Link></p>
      )}

      <section className="mt-box mt-cmp" aria-label={NOTEST.testTitle}>
        <h3>{NOTEST.testTitle}</h3>
        <dl>
          <div><dt>{NOTEST.before}</dt><dd>{NOTEST.beforeBody}</dd></div>
          <div className="is-after"><dt>{NOTEST.after}</dt><dd>{NOTEST.afterBody}</dd></div>
        </dl>
        <ul>{NOTEST.afterMore.map((x) => <li key={x}>{x}</li>)}</ul>
        {acc.slots.aftertest === "locked" ? <p className="mt-cmp-more">{NOTEST.oneMore}</p> : null}
        <Link className="mt-btn is-block" href="/cores">
          {[NOTEST.testGo, m, NOTEST.testFree].filter(Boolean).join(" · ")}
        </Link>
        <p className="mt-note">{NOTEST.testResume}</p>
      </section>

      {list.length ? (
        <>
          <h2 className="mt-h2">{NOTEST.jobsTitle} <small>{NOTEST.jobsCount(list.length)}</small> <Link href="/mat/jobs" className="mt-meta">{NOTEST.all}</Link></h2>
          <div className="mt-list">{list.slice(0, 3).map((p) => <JobCard key={p.id} p={p} lang={lang} en={en?.get(p.id)} />)}</div>
        </>
      ) : null}

      {week.length ? (
        <>
          <h2 className="mt-h2">{NOTEST.weekTitle}</h2>
          <div className="mt-list">
            {week.map((r) => (
              <div key={r.id} className="mt-row"><div className="mt-row-b"><p>{oneLine(r.body)}</p></div></div>
            ))}
          </div>
          {open.length > week.length ? <p className="mt-note">{NOTEST.weekLocked(open.length - week.length)} <Link href={PRICING_HREF}>{NOTEST.passLink}</Link></p> : null}
        </>
      ) : null}
    </main>
  );
}
