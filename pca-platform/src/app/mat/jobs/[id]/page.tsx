import Link from "next/link";
import { matTitle } from "@/lib/mat/title";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { activeCoreOrPick, experiencesOf } from "@/lib/me-v3/platform";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { matAccess } from "@/lib/mat-access";
import { itemDomainKo, livePostingOf, type PostingItem } from "@/lib/assistant/posting";
import { interviewPrep, smallTasks } from "@/lib/assistant/prep";
import { matAiOn, matTakeTasks, matTrackApp } from "../../actions";
import { aiConsented } from "@/lib/assistant/settings";
import { aiReady } from "@/lib/assistant/claude";
import { canBuyRefill, REFILL_HREF, REFILL_LABEL } from "@/lib/assistant/ai-budget";
import { queryOne } from "@/lib/db";
import { outLink } from "@/lib/mat/out-link";
import { sourceName } from "@/lib/mat/stage";
import { taskLine } from "@/lib/mat/short";
import { Paywall } from "../../paywall";
import { AiConsent } from "../../ai-consent";
import { consentText } from "@/lib/mat/consent-text";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { enSummaries } from "@/lib/mat/posting-en";
import { JOB_TEXT as J, TITLE_TEXT } from "../../mat-text";
import { PRICING_HREF } from "@/lib/pricing/config";
import { postingsOf } from "@/lib/assistant/posting";

export const generateMetadata = () => matTitle(TITLE_TEXT.job);

/**
 * 공고 바로 분석(예상 화면 2번의 안쪽). **맞는 점 · 보완할 점 · 마감 전 할 일** 세 덩이.
 *
 * - 줄마다 **근거 칩**을 단다: [경험: 제목] · [검사: 영역] · [공고: 필수/우대]. 근거가 없으면
 *   지어내지 않고 [기록 없음]이라고 적는다
 * - 맞고 안 맞음은 색만으로 가르지 않는다: 줄 앞 글자(맞음 · 덜 됨 · 없음)가 같이 선다
 * - 합격 가능성 · 점수를 내지 않는다. 줄 수를 그대로 센다
 * - 상태는 열 때마다 지금 적어 둔 경험으로 다시 단다(`livePostingOf`)
 * - 남의 분석은 열리지 않는다: 번호와 로그인한 사람으로 함께 거른다
 */
const majorStem = (m: string | null) => (m ?? "").replace(/\s+/g, "").replace(/(공학과|공학부|공학|학과|학부|전공|과)$/, "");

type Row = { it: PostingItem; mark: "맞음" | "덜 됨" | "없음" | "확인 필요"; why: string; chips: string[] };
/* 공고가 이름을 든 도구(CATIA · ANSYS · CAD · Python …). 검사 답만으로는 그 도구를 써 봤는지 알 수 없다(MAT 시험 P1) */
const NOT_TOOL = /^(AI|IT|PM|PL|PO|MD|QA|QC|HR|CS|R|D|B2B|B2C|KPI|OKR|ESG|UI|UX|SW|HW|PC|OA|MOU|TOEIC|OPIC)$/;
const toolOf = (t: string): string | null =>
  [...t.matchAll(/[A-Za-z][A-Za-z0-9+#]{1,}/g)].map((m) => m[0]).find((w) => /[A-Z]/.test(w[0]) && !NOT_TOOL.test(w)) ?? null;
/** 전에 저장한 분석에 남은 꼬리 "(공고의 ‘…’)" 를 걷는다(지금은 칩으로 적는다) */
const clean = (t: string) => t.replace(/\s*\(공고의 ‘[^’]*’\)$/, "");

export default async function MatJob({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ taken?: string }>;
}) {
  const { id } = await params;
  const takenRaw = (await searchParams).taken;
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const CONSENT = consentText(lang);
  const MARK = { 맞음: t(J.mFit), "덜 됨": t(J.mPart), 없음: t(J.mNone), "확인 필요": t(J.mCheck) } as const;
  const core = await activeCoreOrPick(user.id);
  const [p, major, access, exps, consent] = await Promise.all([
    livePostingOf(user.id, id), activeMajorName(user.id), matAccess(user.id), experiencesOf(user.id, core),
    aiConsented(user.id).catch(() => false),
  ]);
  if (!p) notFound();
  const a = p.analysis;
  const stem = majorStem(major);
  const area = (it: PostingItem) => itemDomainKo(core, it, lang);
  /* 직무 이름으로 본 영역은 공고 글의 요구가 아니다. 칩이 그렇다고 적는다 */
  const need = (it: PostingItem) => (it.from === "role" ? t(J.needRole) : it.from === "words" ? t(J.needWords, { term: it.term ?? "" })
    : it.kind === "must" ? t(J.needMust) : t(J.needNice));
  const cExp = (x: string) => t(J.chipExp, { t: x });
  const cPost = (it: PostingItem) => t(J.chipPost, { need: need(it) });
  const byRole = a.items.some((i) => i.from);

  const fit: Row[] = [];
  const gap: Row[] = [];
  const cond: PostingItem[] = [];
  const expText = exps.map((e) => [e.title, ...e.decisions, ...e.artifacts, ...e.verifications].join(" ")).join(" \n ").toLowerCase();
  for (const it of a.items) {
    const tool = toolOf(it.text);
    if (tool && (it.status === "ready" || it.status === "unmapped") && !expText.includes(tool.toLowerCase())) {
      gap.push({ it, mark: "확인 필요",
        why: t(J.whyTool, { tool }),
        chips: [t(J.chipName, { tool }), cPost(it)] });
      continue;
    }
    if (it.status === "ready") {
      fit.push({
        it, mark: "맞음", why: t(J.whyFit, { area: area(it) }),
        chips: [...it.evidence.slice(0, 2).map(cExp), ...(it.evidence.length ? [] : [t(J.chipTest, { area: area(it) })]), cPost(it)],
      });
    } else if (it.status === "partial") {
      gap.push({
        it, mark: "덜 됨",
        /* 검사에서 해 봤다고 답했지만 체크리스트 · 경험 기록에 근거가 없는 자리다. 그 사실대로 적는다(2026-11-02 운영 시험) */
        why: it.near
          ? t(J.whyNear)
          : it.evidence.length
            ? t(J.whyPart)
            : t(J.whyTestOnly),
        chips: [...it.evidence.slice(0, 2).map(cExp), cPost(it)],
      });
    } else if (it.status === "empty") {
      gap.push({ it, mark: "없음", why: t(J.whyNone, { area: area(it) }), chips: [t(J.chipNone), cPost(it)] });
    } else if (stem.length >= 2 && it.reason !== "unmatched" && /전공/.test(it.text) && it.text.includes(stem)) {
      fit.push({ it, mark: "맞음", why: t(J.whyMajor), chips: [t(J.chipMajor, { major: major ?? "" }), cPost(it)] });
    } else {
      cond.push(it);
    }
  }
  /* 필수 먼저, 없음이 덜 됨보다 먼저 */
  gap.sort((x, y) => (x.it.kind === y.it.kind ? 0 : x.it.kind === "must" ? -1 : 1) || (x.mark === y.mark ? 0 : x.mark === "없음" ? -1 : 1));
  const sameCore = (p.core_code ?? core) === core;
  const allTasks = sameCore ? smallTasks(core, a.items, exps, lang) : [];
  /* 무료는 할 일 하나(`FREE_SCOPE.weekTasks`) */
  const tasks = access.paid ? allTasks : allTasks.slice(0, access.weekTasks);
  const analyzed = access.paid ? 0 : (await postingsOf(user.id).catch(() => [])).length;
  const asks = sameCore ? interviewPrep(core, a.items, exps, 3, lang) : [];
  const must = a.items.filter((x) => x.kind === "must").length;
  const taken = takenRaw === undefined ? null : takenRaw === "x" ? -1 : Number(takenRaw);
  /* 모아 둔 공고에서 분석했으면(이름이 `출처 공고 번호`) 원문 주소를 다시 찾는다. 붙여 넣은 공고는 없다 */
  const jobNo = /^(잡인더스트리|고용24) 공고 (\d{1,18})$/.exec(p.label)?.[2] ?? null;
  const src = jobNo ? await queryOne<{ source: string; source_url: string | null }>(
    `SELECT source, source_url FROM v3_job_postings WHERE id = $1`, [jobNo]).catch(() => null) : null;
  const link = src ? outLink(src.source_url, src.source) : null;
  /* 영어 화면 · 국내 유학생: 한국어 공고면 영어 요약(AI 가 영어로 읽은 것)을 먼저, 없으면 한국어 그대로에 표시만 */
  const isEn = lang === "en";
  const enSum = isEn && jobNo ? (await enSummaries([jobNo])).get(jobNo) ?? null : null;
  const koreanLines = isEn && a.items.some((i) => /[가-힣]{2}/.test(i.text));
  const title = enSum?.title ?? p.name ?? p.label;
  const lineLang = (x: string) => (isEn && /[가-힣]{2}/.test(x) ? "ko" : undefined);

  const chipRow = (chips: string[]) => (
    <div className="mt-chips">{chips.map((c) => <span key={c} className={`mt-chip${c === t(J.chipNone) ? " is-none" : ""}`}>{c}</span>)}</div>
  );

  return (
    <main>
      <p className="mt-week"><Link href="/mat/jobs">{t(J.back)}</Link>{p.deadline ? t(J.deadline, { d: p.deadline }) : ""}</p>
      <h1 className="mt-h1" lang={lineLang(title)}>{title}</h1>
      {enSum ? <p className="mt-note"><span className="mt-chip">{t(J.korean)}</span> {t(J.enSummary)}</p>
        : koreanLines ? <p className="mt-note"><span className="mt-chip">{t(J.korean)}</span> {t(J.koreanNote)}</p> : null}
      {/* 숫자를 늘어놓지 않고 먼저 할 일 한 줄(2026-11-02 대표 "AI같아"). 처리 방식 안내는 화면 위가 아니라 맨 아래 작은 글씨 */}
      <section className="mt-diag" aria-label={t(J.firstAria)}>
        {a.role ? <div className="mt-diag-k"><span>{t(J.role)}</span><b lang={lineLang(a.role)}>{a.role}</b></div> : null}
        <p>{!a.items.length
          ? t(J.readNone)
          : gap[0] ? t(J.fillFirst, { text: clean(gap[0].it.text) })
          : fit.length ? t(J.haveMust) : t(J.checkCond)}</p>
        {!a.items.length ? <Link href="/mat/jobs#paste">{t(J.pasteLink)}</Link>
          /* 채울 것이 있어도 지원서 화면으로 가는 길을 둔다(MAT 시험 M2: 분석 결과에서 지원서로 돌아오는 길이 없었다) */
          : gap[0]?.it.domain ? <><Link href={`/me/experience/new?td=${encodeURIComponent(gap[0].it.domain)}`}>{t(J.writeExp)}</Link>{" · "}<Link href={`/mat/draft?p=${p.id}`}>{t(J.seeOutline)}</Link></>
          : <Link href={`/mat/draft?p=${p.id}`}>{t(J.writeApp)}</Link>}
      </section>
      {link ? (
        <p className="mt-src">
          {t(J.source, { src: sourceName(src!.source, lang) })}
          <a className="mt-link" href={link} target="_blank" rel="noopener noreferrer">{t(J.original)}</a>
        </p>
      ) : null}

      <form action={matTrackApp} style={{ margin: "12px 0 0" }}>
        <input type="hidden" name="id" value={p.id} />
        <button type="submit" className="mt-btn is-block">{t(J.track)}</button>
      </form>

      {fit.length ? (<>
      <h2 className="mt-h2">{t(J.fitTitle)}</h2>
        <div className="mt-list">
          {fit.map((r, i) => (
            <div key={i} className="mt-row">
              <span className="mt-mark is-ok" aria-hidden>✓</span>
              <div className="mt-row-b"><p lang={lineLang(r.it.text)}><span className="mt-sr">{MARK[r.mark]}: </span>{clean(r.it.text)}</p><small>{r.why}</small>{chipRow(r.chips)}</div>
            </div>
          ))}
        </div>
      </>) : null}

      {gap.length ? (<>
      <h2 className="mt-h2">{t(J.gapTitle)}</h2>
        <div className="mt-list">
          {gap.map((r, i) => (
            <div key={i} className="mt-row">
              <span className={`mt-mark${r.mark === "없음" ? " is-none" : " is-part"}`} aria-hidden>{r.mark === "없음" ? "✕" : "△"}</span>
              <div className="mt-row-b">
                <p lang={lineLang(r.it.text)}><span className="mt-sr">{MARK[r.mark]}: </span>{clean(r.it.text)}</p>
                <small>{r.why}</small>
                {chipRow(r.chips)}
                {r.it.domain ? (
                  <Link className="mt-link" href={`/me/experience/new?td=${encodeURIComponent(r.it.domain)}`}>{t(J.writeExp)}</Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </>) : null}

      {/* 결제 입구: 무료 분석 결과 바로 아래(시안 Paywall). 기간권이 있으면 그리지 않는다 */}
      {!access.paid ? <Paywall userId={user.id} analyzed={analyzed} lang={lang} /> : null}

      {cond.length ? (
        <>
          {/* 학력 · 연차 · 면허 같은 조건과, 이 전공 영역에 잇지 못한 업무 · 우대 줄을 한 이름(자격 조건)으로 묶지 않는다(MAT 시험 P1) */}
          {cond.some((c) => c.reason !== "unmatched") ? (<>
            <h2 className="mt-h2">{t(J.condTitle)}</h2>
            <ul className="mt-incl">{cond.filter((c) => c.reason !== "unmatched").map((c, i) => <li key={i} lang={lineLang(c.text)}>{c.text}<span>{t(J.checkOriginal)}</span></li>)}</ul>
          </>) : null}
          {cond.some((c) => c.reason === "unmatched") ? (<>
            <h2 className="mt-h2">{t(J.unmatchedTitle)}</h2>
            <ul className="mt-incl">{cond.filter((c) => c.reason === "unmatched").map((c, i) => <li key={i} lang={lineLang(c.text)}>{c.text}<span>{c.kind === "must" ? t(J.mustWrite) : t(J.niceWrite)}</span></li>)}</ul>
          </>) : null}
        </>
      ) : null}

      {/* 마감일을 모르면 `마감 전` 이라고 쓰지 않는다(MAT 시험 P1: 마감을 넣는 칸이 없는데 `마감 전 할 일`) */}
      <h2 className="mt-h2" id="tasks">{p.deadline ? t(J.tasksDue) : t(J.tasksPre)}</h2>
      {tasks.length ? (
        <>
          <div className="mt-list">
            {tasks.map((tk, i) => (
              <div key={i} className="mt-row">
                <div className="mt-row-b"><p>{taskLine(tk.artifact, tk.verify, lang)}</p><small lang={lineLang(tk.text)}>{tk.text}</small></div>
              </div>
            ))}
          </div>
          {taken !== null ? (
            <p className="mt-note" role="status">
              {taken === -1 ? t(J.takenOther)
                : taken > 0 ? t(J.taken) : t(J.takenAlready)}
            </p>
          ) : null}
          {access.open ? (
            <form action={matTakeTasks} style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className="mt-btn is-main is-block">{t(J.take)}</button>
            </form>
          ) : <Link className="mt-btn is-block" href={PRICING_HREF} style={{ marginTop: 12 }}>{t(J.seePass)}</Link>}
        </>
      ) : <p className="mt-empty">{sameCore ? <>{t(J.noTask)} <Link href={`/mat/draft?p=${id}`}>{t(J.outlineLink)}</Link></> : t(J.otherCore)}</p>}

      {asks.length ? (
        <>
          <h2 className="mt-h2">{t(J.asksTitle)}</h2>
          <div className="mt-list">
            {asks.map((q, i) => (
              <div key={i} className="mt-row">
                <div className="mt-row-b">
                  <p>{q.question}</p>
                  {chipRow([q.experience ? cExp(q.experience.title) : t(J.chipNone), t(J.chipPost, { need: q.text.slice(0, 24) })])}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-note"><Link href={`/mat/draft?p=${p.id}`}>{t(J.practice)}</Link>{t(J.withPerson)}<Link href="/mat/consult">{t(J.consult)}</Link></p>
        </>
      ) : null}
      {byRole ? (
        <p className="mt-note" style={{ marginTop: 24 }}>{t(J.byRole)}</p>
      ) : null}
      {/* 읽은 방법은 화면에 적지 않는다(2026-11-02 대표: "AI가 썼어요" · "규칙으로 읽었어요" 같은 말 금지).
          기간권 횟수를 다 쓴 때만 다시 열리는 날을 적는다. 옛 분석의 안내 문장은 보이지 않는다 */}
      {p.analyzed_by === "claude" ? null : consent || !aiReady() ? (
        a.note?.startsWith("이번 기간") || a.note?.startsWith("You've used this period") ? (
          <>
            <p className="mt-note" style={{ marginTop: 12 }}>{a.note}</p>
            {await canBuyRefill(user.id)
              ? <Link className="mt-btn is-block" href={REFILL_HREF} style={{ marginTop: 8 }}>{isEn ? "Refill all · KRW 4,900" : REFILL_LABEL}</Link> : null}
          </>
        ) : null
      ) : (
        <div className="mt-box" style={{ marginTop: 24 }}>
          <h3>{CONSENT.open}</h3>
          {/* 무엇을 보내는지는 여는 창에서 한 번만 적는다(시안 Consent · '다음부터 묻지 않기' 는 꺼짐) */}
          <div style={{ marginTop: 12 }}>
            <AiConsent action={matAiOn} id={p.id} title={title} sub={a.role} label={CONSENT.open} lang={lang} />
          </div>
        </div>
      )}
    </main>
  );
}
