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
import { SOURCE_KO } from "@/lib/mat/stage";
import { taskLine } from "@/lib/mat/short";

export const generateMetadata = () => matTitle("내 경험과 맞춰 보기");

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

type Row = { it: PostingItem; mark: "맞음" | "덜 됨" | "없음"; why: string; chips: string[] };
/** 전에 저장한 분석에 남은 꼬리 "(공고의 ‘…’)" 를 걷는다(지금은 칩으로 적는다) */
const clean = (t: string) => t.replace(/\s*\(공고의 ‘[^’]*’\)$/, "");

export default async function MatJob({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ taken?: string }>;
}) {
  const { id } = await params;
  const takenRaw = (await searchParams).taken;
  const user = await requireUser();
  const core = await activeCoreOrPick(user.id);
  const [p, major, access, exps, consent] = await Promise.all([
    livePostingOf(user.id, id), activeMajorName(user.id), matAccess(user.id), experiencesOf(user.id, core),
    aiConsented(user.id).catch(() => false),
  ]);
  if (!p) notFound();
  const a = p.analysis;
  const stem = majorStem(major);
  const area = (it: PostingItem) => itemDomainKo(core, it, "ko");
  /* 직무 이름으로 본 영역은 공고 글의 요구가 아니다. 칩이 그렇다고 적는다 */
  const need = (it: PostingItem) => (it.from === "role" ? "직무 이름과 이어짐" : it.from === "words" ? `공고에 나온 말: ${it.term ?? ""}`
    : it.kind === "must" ? "필수" : "우대");
  const byRole = a.items.some((i) => i.from);

  const fit: Row[] = [];
  const gap: Row[] = [];
  const cond: PostingItem[] = [];
  for (const it of a.items) {
    if (it.status === "ready") {
      fit.push({
        it, mark: "맞음", why: `${area(it)} 경험이 있어요.`,
        chips: [...it.evidence.slice(0, 2).map((t) => `경험: ${t}`), ...(it.evidence.length ? [] : [`검사: ${area(it)}`]), `공고: ${need(it)}`],
      });
    } else if (it.status === "partial") {
      gap.push({
        it, mark: "덜 됨",
        /* 검사에서 해 봤다고 답했지만 체크리스트 · 경험 기록에 근거가 없는 자리다. 그 사실대로 적는다(2026-11-02 운영 시험) */
        why: it.near
          ? "비슷한 경험이 있어요. 직접 정한 것 한 줄을 더 적어 보세요."
          : it.evidence.length
            ? "해 본 일은 있어요. 직접 정한 것과 남긴 것을 적어 보세요."
            : "검사에서 해 봤다고 답했어요. 그때 직접 정한 기준이나 남긴 결과물을 경험으로 적으면 ‘맞음’이 돼요.",
        chips: [...it.evidence.slice(0, 2).map((t) => `경험: ${t}`), `공고: ${need(it)}`],
      });
    } else if (it.status === "empty") {
      gap.push({ it, mark: "없음", why: `${area(it)} 경험 한 줄부터 적어 보세요.`, chips: ["기록 없음", `공고: ${need(it)}`] });
    } else if (stem.length >= 2 && it.reason !== "unmatched" && /전공/.test(it.text) && it.text.includes(stem)) {
      fit.push({ it, mark: "맞음", why: "전공 조건에 맞아요.", chips: [`전공: ${major}`, `공고: ${need(it)}`] });
    } else {
      cond.push(it);
    }
  }
  /* 필수 먼저, 없음이 덜 됨보다 먼저 */
  gap.sort((x, y) => (x.it.kind === y.it.kind ? 0 : x.it.kind === "must" ? -1 : 1) || (x.mark === y.mark ? 0 : x.mark === "없음" ? -1 : 1));
  const sameCore = (p.core_code ?? core) === core;
  const tasks = sameCore ? smallTasks(core, a.items, exps, "ko") : [];
  const asks = sameCore ? interviewPrep(core, a.items, exps, 3, "ko") : [];
  const must = a.items.filter((x) => x.kind === "must").length;
  const taken = takenRaw === undefined ? null : takenRaw === "x" ? -1 : Number(takenRaw);
  /* 모아 둔 공고에서 분석했으면(이름이 `출처 공고 번호`) 원문 주소를 다시 찾는다. 붙여 넣은 공고는 없다 */
  const jobNo = /^(잡인더스트리|고용24) 공고 (\d{1,18})$/.exec(p.label)?.[2] ?? null;
  const src = jobNo ? await queryOne<{ source: string; source_url: string | null }>(
    `SELECT source, source_url FROM v3_job_postings WHERE id = $1`, [jobNo]).catch(() => null) : null;
  const link = src ? outLink(src.source_url, src.source) : null;

  const chipRow = (chips: string[]) => (
    <div className="mt-chips">{chips.map((c) => <span key={c} className={`mt-chip${c === "기록 없음" ? " is-none" : ""}`}>{c}</span>)}</div>
  );

  return (
    <main>
      <p className="mt-week"><Link href="/mat/jobs">← 공고</Link>{p.deadline ? ` · 마감 ${p.deadline}` : ""}</p>
      <h1 className="mt-h1">{p.name ?? p.label}</h1>
      {/* 숫자를 늘어놓지 않고 먼저 할 일 한 줄(2026-11-02 대표 "AI같아"). 처리 방식 안내는 화면 위가 아니라 맨 아래 작은 글씨 */}
      <section className="mt-diag" aria-label="먼저 할 일">
        {a.role ? <div className="mt-diag-k"><span>뽑는 자리</span><b>{a.role}</b></div> : null}
        <p>{!a.items.length
          ? "이 공고는 요건을 거의 읽지 못했어요. 원문을 열어 요건 부분을 붙여 넣어 주세요."
          : gap[0] ? `‘${clean(gap[0].it.text)}’부터 채워 봐요.`
          : fit.length ? "필수 요건에 댈 경험이 있어요. 문장 뼈대로 지원서를 써 보세요." : "공고 원문에서 자격 조건부터 확인해 보세요."}</p>
        {!a.items.length ? <Link href="/mat/jobs#paste">공고 글 붙여 넣기</Link>
          : gap[0]?.it.domain ? <Link href={`/me/experience/new?td=${encodeURIComponent(gap[0].it.domain)}`}>경험 적기</Link>
          : <Link href={`/mat/draft?p=${p.id}`}>지원서 쓰기</Link>}
      </section>
      {link ? (
        <p className="mt-src">
          출처 {SOURCE_KO[src!.source] ?? src!.source} · 지원은 원문에서 ·{" "}
          <a className="mt-link" href={link} target="_blank" rel="noopener noreferrer">공고 원문 보기</a>
        </p>
      ) : null}

      <form action={matTrackApp} style={{ margin: "12px 0 0" }}>
        <input type="hidden" name="id" value={p.id} />
        <button type="submit" className="mt-btn is-block">지원 현황에 담기</button>
      </form>

      {fit.length ? (<>
      <h2 className="mt-h2">맞는 점</h2>
        <div className="mt-list">
          {fit.map((r, i) => (
            <div key={i} className="mt-row">
              <span className="mt-mark is-ok" aria-hidden>✓</span>
              <div className="mt-row-b"><p><span className="mt-sr">맞음: </span>{clean(r.it.text)}</p><small>{r.why}</small>{chipRow(r.chips)}</div>
            </div>
          ))}
        </div>
      </>) : null}

      {gap.length ? (<>
      <h2 className="mt-h2">채울 것</h2>
        <div className="mt-list">
          {gap.map((r, i) => (
            <div key={i} className="mt-row">
              <span className={`mt-mark${r.mark === "없음" ? " is-none" : " is-part"}`} aria-hidden>{r.mark === "없음" ? "✕" : "△"}</span>
              <div className="mt-row-b">
                <p><span className="mt-sr">{r.mark}: </span>{clean(r.it.text)}</p>
                <small>{r.why}</small>
                {chipRow(r.chips)}
                {r.it.domain ? (
                  <Link className="mt-link" href={`/me/experience/new?td=${encodeURIComponent(r.it.domain)}`}>경험 적기</Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </>) : null}

      {cond.length ? (
        <>
          <h2 className="mt-h2">자격 조건</h2>
          <ul className="mt-incl">{cond.map((c, i) => <li key={i}>{c.text}<span>{c.reason === "unmatched" ? "댈 경험 고르기" : "원문 확인"}</span></li>)}</ul>
        </>
      ) : null}

      <h2 className="mt-h2" id="tasks">마감 전 할 일</h2>
      {tasks.length ? (
        <>
          <div className="mt-list">
            {tasks.map((t, i) => (
              <div key={i} className="mt-row">
                <div className="mt-row-b"><p>{taskLine(t.artifact, t.verify)}</p><small>{t.text}</small></div>
              </div>
            ))}
          </div>
          {taken !== null ? (
            <p className="mt-note" role="status">
              {taken === -1 ? "다른 전공으로 읽은 공고라 담지 않았어요."
                : taken > 0 ? "이번 주 할 일에 담았어요." : "이미 담겨 있어요."}
            </p>
          ) : null}
          {access.open ? (
            <form action={matTakeTasks} style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className="mt-btn is-main is-block">이번 주 할 일에 담기</button>
            </form>
          ) : <Link className="mt-btn is-block" href="/mat/pass" style={{ marginTop: 12 }}>이용권 보기</Link>}
        </>
      ) : <p className="mt-empty">{sameCore ? "지금은 따로 만들 결과물이 없어요. 문장 뼈대로 지원서를 써 보세요." : "다른 전공으로 읽은 공고예요."}</p>}

      {asks.length ? (
        <>
          <h2 className="mt-h2">나올 질문</h2>
          <div className="mt-list">
            {asks.map((q, i) => (
              <div key={i} className="mt-row">
                <div className="mt-row-b">
                  <p>{q.question}</p>
                  {chipRow([q.experience ? `경험: ${q.experience.title}` : "기록 없음", `공고: ${q.text.slice(0, 24)}`])}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-note"><Link href={`/mat/draft?p=${p.id}`}>면접 연습</Link> · 사람과 연습은 <Link href="/mat/consult">상담</Link></p>
        </>
      ) : null}
      {byRole ? (
        <p className="mt-note" style={{ marginTop: 24 }}>공고 글에 기술 요건이 따로 적혀 있지 않아, 직무 이름과 공고에 나온 말로 내 경험을 이었어요.</p>
      ) : null}
      {/* 읽은 방법은 화면에 적지 않는다(2026-11-02 대표: "AI가 썼어요" · "규칙으로 읽었어요" 같은 말 금지).
          기간권 횟수를 다 쓴 때만 다시 열리는 날을 적는다. 옛 분석의 안내 문장은 보이지 않는다 */}
      {p.analyzed_by === "claude" ? null : consent || !aiReady() ? (
        a.note?.startsWith("이번 기간") ? (
          <>
            <p className="mt-note" style={{ marginTop: 12 }}>{a.note}</p>
            {await canBuyRefill(user.id)
              ? <Link className="mt-btn is-block" href={REFILL_HREF} style={{ marginTop: 8 }}>{REFILL_LABEL}</Link> : null}
          </>
        ) : null
      ) : (
        <div className="mt-box" style={{ marginTop: 24 }}>
          <h3>AI로 더 자세히 읽기</h3>
          <p>켜면 이 공고 글이 Anthropic(미국)의 Claude로 보내져 담당 업무 · 자격 요건 · 우대 사항을 더 자세히 나눠 읽어요.
            이름과 연락처는 보내지 않아요. 끄는 곳은 <Link href="/me/track#settings">설정</Link>이에요.</p>
          <form action={matAiOn} style={{ marginTop: 12 }}>
            <input type="hidden" name="id" value={p.id} />
            <button type="submit" className="mt-btn is-block">동의하고 AI로 다시 읽기</button>
          </form>
        </div>
      )}
    </main>
  );
}
