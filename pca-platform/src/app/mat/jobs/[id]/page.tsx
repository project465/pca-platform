import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { activeCoreOrPick, experiencesOf } from "@/lib/me-v3/platform";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { matAccess } from "@/lib/mat-access";
import { itemDomainKo, livePostingOf, type PostingItem } from "@/lib/assistant/posting";
import { interviewPrep, smallTasks } from "@/lib/assistant/prep";
import { matTakeTasks, matTrackApp } from "../../actions";
import { queryOne } from "@/lib/db";
import { outLink } from "@/lib/mat/out-link";
import { SOURCE_KO } from "@/lib/mat/stage";

export const metadata = { title: "공고 분석 · MAT" };

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

export default async function MatJob({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ taken?: string }>;
}) {
  const { id } = await params;
  const takenRaw = (await searchParams).taken;
  const user = await requireUser();
  const core = await activeCoreOrPick(user.id);
  const [p, major, access, exps] = await Promise.all([
    livePostingOf(user.id, id), activeMajorName(user.id), matAccess(user.id), experiencesOf(user.id, core),
  ]);
  if (!p) notFound();
  const a = p.analysis;
  const stem = majorStem(major);
  const area = (it: PostingItem) => itemDomainKo(core, it, "ko");
  const need = (it: PostingItem) => (it.kind === "must" ? "필수" : "우대");

  const fit: Row[] = [];
  const gap: Row[] = [];
  const cond: PostingItem[] = [];
  for (const it of a.items) {
    if (it.status === "ready") {
      fit.push({
        it, mark: "맞음", why: `${area(it)} 쪽에 설명할 경험이 있습니다.`,
        chips: [...it.evidence.slice(0, 2).map((t) => `경험: ${t}`), ...(it.evidence.length ? [] : [`검사: ${area(it)}`]), `공고: ${need(it)}`],
      });
    } else if (it.status === "partial") {
      gap.push({
        it, mark: "덜 됨",
        why: it.near
          ? "가까운 경험이 있습니다. 이 일에 맞게 직접 정한 것과 남긴 것을 더 적어 주세요."
          : "해 본 일은 있는데 직접 정한 것이나 남긴 것이 아직 적혀 있지 않습니다.",
        chips: [...it.evidence.slice(0, 2).map((t) => `경험: ${t}`), `공고: ${need(it)}`],
      });
    } else if (it.status === "empty") {
      gap.push({ it, mark: "없음", why: `${area(it)} 쪽 경험이 아직 기록에 없습니다.`, chips: ["기록 없음", `공고: ${need(it)}`] });
    } else if (stem.length >= 2 && it.reason !== "unmatched" && /전공/.test(it.text) && it.text.includes(stem)) {
      fit.push({ it, mark: "맞음", why: "회원님 전공이 이 조건의 전공 목록에 들어 있습니다.", chips: [`전공: ${major}`, `공고: ${need(it)}`] });
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
      <h1 className="mt-h1">{p.label}</h1>
      <section className="mt-diag" aria-label="한 줄 요약">
        <div className="mt-diag-k"><span>{a.role ? `뽑는 자리 · ${a.role}` : "공고 요구 항목"}</span><b>{a.items.length}줄</b></div>
        <p>
          필수 {must}줄 가운데 설명할 경험이 있는 줄 {fit.filter((r) => r.it.kind === "must").length}개,
          보완할 줄 {gap.filter((r) => r.it.kind === "must").length}개입니다.
          {gap[0] ? ` 먼저 ‘${gap[0].it.text}’부터 채우세요.` : ""}
        </p>
        {a.note ? <p className="mt-diag-note">{a.note}</p> : null}
      </section>
      {link ? (
        <p className="mt-src">
          출처 {SOURCE_KO[src!.source] ?? src!.source} · 회사 이름과 지원은 원문에서 ·{" "}
          <a className="mt-link" href={link} target="_blank" rel="noopener noreferrer">공고 원문 보기</a>
        </p>
      ) : null}

      <form action={matTrackApp} style={{ margin: "12px 0 0" }}>
        <input type="hidden" name="id" value={p.id} />
        <button type="submit" className="mt-btn is-block">지원 현황에 담기</button>
      </form>

      <h2 className="mt-h2">맞는 점 <small>{fit.length}줄</small></h2>
      {fit.length ? (
        <div className="mt-list">
          {fit.map((r, i) => (
            <div key={i} className="mt-row">
              <span className="mt-mark is-ok" aria-hidden>✓</span>
              <div className="mt-row-b"><p><span className="mt-sr">맞음: </span>{r.it.text}</p><small>{r.why}</small>{chipRow(r.chips)}</div>
            </div>
          ))}
        </div>
      ) : <p className="mt-empty">아직 이 공고에 바로 댈 경험이 없습니다. 아래 보완할 점부터 채우세요.</p>}

      <h2 className="mt-h2">보완할 점 <small>{gap.length}줄</small></h2>
      {gap.length ? (
        <div className="mt-list">
          {gap.map((r, i) => (
            <div key={i} className="mt-row">
              <span className={`mt-mark${r.mark === "없음" ? " is-none" : " is-part"}`} aria-hidden>{r.mark === "없음" ? "✕" : "△"}</span>
              <div className="mt-row-b">
                <p><span className="mt-sr">{r.mark}: </span>{r.it.text}</p>
                <small>{r.why}</small>
                {chipRow(r.chips)}
                {r.it.domain ? (
                  <Link className="mt-link" href={`/me/experience/new?td=${encodeURIComponent(r.it.domain)}`}>이 영역 경험 적기</Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : <p className="mt-empty">보완할 줄이 없습니다.</p>}

      {cond.length ? (
        <>
          <h2 className="mt-h2">자격 조건 <small>경험으로 판단하지 않음</small></h2>
          <ul className="mt-incl">{cond.map((c, i) => <li key={i}>{c.text}<span>{c.reason === "unmatched" ? "어느 경험으로 설명할지 직접 정하기" : "공고 원문에서 확인"}</span></li>)}</ul>
        </>
      ) : null}

      <h2 className="mt-h2" id="tasks">마감 전 할 일 <small>{tasks.length ? `${tasks.length}개` : ""}</small></h2>
      {tasks.length ? (
        <>
          <div className="mt-list">
            {tasks.map((t, i) => (
              <div key={i} className="mt-row">
                <div className="mt-row-b"><p>{t.task}</p>{chipRow([`공고: ${t.text.slice(0, 24)}`])}</div>
              </div>
            ))}
          </div>
          {taken !== null ? (
            <p className="mt-note" role="status">
              {taken === -1 ? "다른 전공으로 읽은 공고라 할 일에 담지 않았습니다."
                : taken > 0 ? `이번 주 할 일에 ${taken}개를 담았습니다.` : "이미 담겨 있는 할 일입니다."}
            </p>
          ) : null}
          {access.open ? (
            <form action={matTakeTasks} style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className="mt-btn is-main is-block">이번 주 할 일에 담기</button>
            </form>
          ) : <Link className="mt-btn is-block" href="/mat/pass" style={{ marginTop: 12 }}>이용권으로 할 일 담기</Link>}
        </>
      ) : <p className="mt-empty">{sameCore ? "필수 항목 가운데 지금 만들 결과물이 정해진 줄이 없습니다." : "다른 전공으로 읽은 공고라 할 일을 만들지 않았습니다."}</p>}

      {asks.length ? (
        <>
          <h2 className="mt-h2">이 공고에서 나올 질문</h2>
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
          <p className="mt-note">답 연습과 상담은 <Link href="/mat/consult">상담</Link>에서 커리어피크로 이어집니다.</p>
        </>
      ) : null}
    </main>
  );
}
