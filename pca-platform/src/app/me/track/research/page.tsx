import Link from "next/link";
import { requireUser } from "@/lib/session";
import { matAccess } from "@/lib/mat-access";
import { settingsOf } from "@/lib/assistant/settings";
import { aiReady } from "@/lib/assistant/claude";
import {
  DOC_TYPE_KO, RESEARCH_MONTHLY_CAP, researchDocsOf, researchOpen, touchResearch, researchUsedThisMonth, type ResearchDoc,
} from "@/lib/assistant/research-docs";
import { CmShell, CmHead } from "../../shell";
import { SectionHeader } from "../../ui";
import ResearchUpload from "./upload";
import CareerpeakConsult from "./consult";
import {
  CONSENT_TEXT, CONSULT_KEEPS, CONSULT_SENDS, consultOpen, consultsOf, onePager,
} from "@/lib/careerpeak-consult";
import { queryOne } from "@/lib/db";
import { gradeResearch, removeResearch } from "./actions";
import { GRADE_PARTS, VERDICT_KO, feedbackOf, type Part, type Verdict } from "@/lib/assistant/research-eval";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: "내 자료 읽기 · MAT · CareerMatri" };
}

/**
 * 내 자료 읽기(2026-10-31). 석·박사의 논문과 발표 자료, 누구에게나 있는 이력서와
 * 자기소개서를 MAT 이 읽고 정리하는 자리다. 여기서 뽑은 낱말로 공고를 찾는다
 * (`/me/track/jobs`).
 *
 * **학술지 지표를 Impact Factor 라고 부르지 않는다.** OpenAlex 의 공개 지표이고,
 * 무엇을 세는지와 가져온 날을 함께 적는다.
 */
export default async function ResearchPage() {
  const user = await requireUser();
  await touchResearch(user.id);
  const [acc, settings, used, docs, fb] = await Promise.all([
    matAccess(user.id), settingsOf(user.id), researchUsedThisMonth(user.id), researchDocsOf(user.id), feedbackOf(user.id),
  ]);
  /* 커리어피크 상담 칸은 받을 주소 · 메일 · 방침 적용일이 다 갖춰졌을 때만 그린다 */
  const cp = docs.length && consultOpen()
    ? await Promise.all([
      consultsOf(user.id),
      queryOne<{ email: string | null }>(`SELECT email FROM users WHERE id = $1`, [user.id]).catch(() => null),
    ])
    : null;
  const left = acc.paid
    ? `이번 달 남은 횟수 ${Math.max(0, RESEARCH_MONTHLY_CAP - used)}/${RESEARCH_MONTHLY_CAP}`
    : `무료 ${acc.freeLeft}번 남음(아무 도구나)`;

  return (
    <CmShell active="/me/track" title="MAT">
      <CmHead kicker="AI 취업비서 · MAT" title="내 자료 읽기"
        lead="논문 · 발표 자료 · 이력서를 올리면 기업이 읽기 좋은 한 장으로 정리하고, 맞는 공고를 찾아 드립니다." />

      {/* 커리어피크로 들어온 연구자는 검사 전에도 자료부터 올린다(`researchFirst`) */}
      {!acc.ready && !acc.paid && !acc.researchFirst ? (
        <div className="cm-panel is-one">
          <div className="cm-pane">
            <p className="cm-row">
              <b>먼저 무료 검사부터</b>
              <span>MAT 은 검사 결과에서 시작합니다. 검사를 마치면 아무 도구나 합쳐 2번 무료로 써 보실 수 있습니다.</span>
            </p>
            <div className="cm-acts"><Link className="cm-btn is-primary" href="/cores">무료 검사 시작</Link></div>
          </div>
        </div>
      ) : acc.paid || acc.left.research > 0 ? (
        !researchOpen()
          ? (
            /* 열리기 전에는 막다른 곳이 되지 않게 지금 되는 일로 이어 준다 */
            <div className="cm-panel is-one">
              <div className="cm-pane">
                <p className="cm-row">
                  <b>자료 올리기는 11월 7일부터 열립니다</b>
                  <span>
                    개인정보처리방침에 이 항목을 더해 7일 전부터 알리고 있습니다. 그 전에는 새로 들어온 연구직 · R&amp;D 공고를 먼저 보세요.
                    {acc.ready || acc.paid
                      ? " 지원할 공고를 붙여 넣으면 요구 항목을 정리하고 마감을 알려 드립니다."
                      : " 무료 검사를 마치시면 지원할 공고를 붙여 넣어 요구 항목 정리와 마감 알림을 받으실 수 있습니다."}
                  </span>
                </p>
                <div className="cm-acts">
                  <Link className="cm-btn is-primary" href="/me/track/jobs">새로 들어온 공고 보기</Link>
                  {acc.ready || acc.paid
                    ? <Link className="cm-btn" href="/me/track#posting">공고 붙여 넣기</Link>
                    : <Link className="cm-btn" href="/cores">무료 검사로 시작</Link>}
                </div>
              </div>
            </div>
          )
          : aiReady()
            ? <ResearchUpload consented={Boolean(settings.file_consent_at)} left={left} />
            : <p className="cm-fail">지금은 자료 읽기가 꺼져 있습니다. 잠시 뒤 다시 와 주세요.</p>
      ) : (
        <div className="cm-panel is-one">
          <div className="cm-pane">
            <p className="cm-row">
              <b>무료 2번을 다 쓰셨습니다</b>
              <span>기간권을 고르시면 한 달 {RESEARCH_MONTHLY_CAP}건까지 읽고, 뽑은 낱말로 맞는 공고를 계속 찾아 드립니다.</span>
            </p>
            <div className="cm-acts"><Link className="cm-btn is-primary" href="/me/track#plans">기간권 보기</Link></div>
          </div>
        </div>
      )}

      <SectionHeader icon="doc" title="읽은 자료"
        sub={docs.length ? `${docs.length}건 · 맞는 공고는 공고 찾기에서 봅니다` : "아직 읽은 자료가 없습니다"} />
      {docs.length ? (
        <div className="cm-acts" style={{ marginBottom: 12 }}>
          <Link className="cm-btn is-primary" href="/me/track/jobs">내 자료로 공고 찾기</Link>
          {cp ? <a className="cm-btn" href="#careerpeak">커리어피크 상담 신청</a> : null}
        </div>
      ) : null}
      {docs.map((d) => <DocCard key={d.id} d={d} fb={fb[d.id] ?? {}} />)}
      {cp ? (
        <CareerpeakConsult
          docs={docs.map((d) => ({ id: d.id, title: d.title }))}
          preview={Object.fromEntries(docs.map((d) => [d.id, onePager(d)]))}
          name={user.name ?? ""} email={cp[1]?.email ?? ""}
          sends={CONSULT_SENDS} keeps={CONSULT_KEEPS} consentText={CONSENT_TEXT}
          sent={cp[0].filter((c) => c.doc_id && Date.now() - new Date(c.sent_at).getTime() < 86_400_000).map((c) => c.doc_id!)} />
      ) : null}
    </CmShell>
  );
}

function Metrics({ d }: { d: ResearchDoc }) {
  const m = d.metrics;
  if (!m) {
    return ["paper", "thesis"].includes(d.doc_type)
      ? <p className="cm-none">학술지 지표를 찾지 못했습니다. 학술지 이름이나 DOI 가 자료에 없거나, 공개 자료에 없는 학술지입니다.</p>
      : null;
  }
  const bits = [
    m.journal ? `학술지 ${m.journal}` : null,
    m.two_year_mean_citedness !== null ? `2년 평균 피인용 ${m.two_year_mean_citedness}` : null,
    m.h_index !== null ? `h-index ${m.h_index}` : null,
    m.cited_by_count !== null ? `이 논문 피인용 ${m.cited_by_count}회` : null,
  ].filter(Boolean);
  return (
    <p className="cm-none">
      {bits.join(" · ")}. OpenAlex 공개 자료로 {m.fetched_at.slice(0, 10)}에 가져온 값입니다. 2년 평균 피인용은
      Impact Factor 와 비슷한 방식으로 세지만 공식 JCR 값은 아닙니다.
    </p>
  );
}

function DocCard({ d, fb }: { d: ResearchDoc; fb: Partial<Record<Part, Verdict>> }) {
  const x = d.data;
  return (
    <div className="cm-panel is-one" style={{ marginBottom: 16 }}>
      <div className="cm-pane">
        {/* 자료 종류는 배지, 정리한 양은 숫자 칸(공고 확인 화면과 같은 원칙 · 앱 공용 sf-pill · sf-kpi) */}
        <p style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="sf-pill accent">{DOC_TYPE_KO[d.doc_type] ?? "자료"}</span>
          {d.lang === "en" ? <span className="sf-pill">영어 자료</span> : null}
        </p>
        <h3 style={{ marginTop: 8 }}>{d.title}</h3>
        {d.venue || d.year ? <p className="cm-none">{[d.venue, d.year].filter(Boolean).join(" · ")}</p> : null}
        <Metrics d={d} />
        <div className="sf-grid sf-g4 cm-kpis" style={{ marginTop: 14 }}>
          {[
            { k: "accent", label: "방법 · 도구", n: x.methods?.length ?? 0 },
            { k: "ok", label: "핵심 결과", n: x.findings?.length ?? 0 },
            { k: "", label: "회사에서 쓸 역량", n: x.job_language?.length ?? 0 },
            { k: "", label: "맞는 직무", n: x.roles?.length ?? 0 },
          ].map((c) => (
            <div key={c.label} className={`sf-kpi${c.k ? ` is-${c.k}` : ""}`}>
              <span className="sf-kpi-l">{c.label}</span>
              <span className="sf-kpi-v">{c.n}<small>개</small></span>
            </div>
          ))}
        </div>
        {x.summary ? <p className="cm-draft">{x.summary}</p> : null}
        <dl className="cm-dl">
          {x.question ? <div><dt>무엇을 풀려 했나</dt><dd>{x.question}</dd></div> : null}
          {x.methods?.length ? <div><dt>방법·도구</dt><dd>{x.methods.join(" · ")}</dd></div> : null}
          {x.findings?.length ? <div><dt>핵심 결과</dt><dd>{x.findings.map((f, i) => <span key={i} style={{ display: "block" }}>· {f}</span>)}</dd></div> : null}
          {x.contribution?.length ? <div><dt>새로 보인 것</dt><dd>{x.contribution.join(" / ")}</dd></div> : null}
        </dl>
        {x.job_language?.length ? (
          <>
            <p className="cm-sub-h">회사에서 쓸 역량</p>
            <dl className="cm-dl">
              {x.job_language.map((j, i) => <div key={i}><dt>{j.skill}</dt><dd>근거: {j.evidence}</dd></div>)}
            </dl>
          </>
        ) : null}
        {x.roles?.length ? (
          <p style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            <span className="cm-none" style={{ marginRight: 4 }}>맞는 직무</span>
            {x.roles.map((r) => <span key={r} className="sf-pill ok">{r}</span>)}
          </p>
        ) : null}
        {x.sentences?.length ? (
          <>
            <p className="cm-sub-h">지원서 문장 뼈대</p>
            {x.sentences.map((s, i) => <p className="cm-draft" key={i}>{s}</p>)}
            <p className="cm-none">대괄호 칸은 자료만으로는 알 수 없어 비워 둔 곳입니다. 직접 채워 쓰세요.</p>
          </>
        ) : null}
        {x.interview?.length ? (
          <>
            <p className="cm-sub-h">면접에서 나올 만한 질문</p>
            {x.interview.map((q, i) => <p className="cm-row" key={i}><b>{q}</b></p>)}
          </>
        ) : null}
        {x.ask?.length ? (
          <>
            <p className="cm-sub-h">확인이 필요한 것</p>
            {x.ask.map((q, i) => <p className="cm-none" key={i}>· {q}</p>)}
          </>
        ) : null}
        <Grade id={d.id} fb={fb} />
        <div className="cm-acts" style={{ marginTop: 12 }}>
          {d.draft_ids.map((id, i) => (
            <Link key={id} className="cm-btn" href={`/me/experience/new?draft=${id}`}>
              경험 기록으로 옮기기{d.draft_ids.length > 1 ? ` ${i + 1}` : ""}
            </Link>
          ))}
          <form action={removeResearch}>
            <input type="hidden" name="id" value={d.id} />
            <button className="cm-btn" type="submit">이 정리 지우기</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * 채점표(2026-10-31). 자료를 쓴 본인이 칸마다 누른다. **누르지 않아도 아무것도
 * 막히지 않는다.** 고른 값만 남고 글은 받지 않는다(`research-eval.ts`).
 */
function Grade({ id, fb }: { id: string; fb: Partial<Record<Part, Verdict>> }) {
  const rows: { key: Part; label: string; ask: string; opts: Verdict[] }[] = [
    ...GRADE_PARTS.map((g) => ({ key: g.key as Part, label: g.label, ask: g.ask, opts: ["right", "partly", "wrong"] as Verdict[] })),
    { key: "invented", label: "지어낸 곳", ask: "자료에 없는 숫자나 사실이 들어갔나요?", opts: ["no", "yes"] },
  ];
  const done = rows.filter((r) => fb[r.key]).length;
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--sf-line)" }}>
      <p className="cm-sub-h">이 정리가 맞나요? <span className="cm-none" style={{ fontWeight: 400 }}>{done}/{rows.length}</span></p>
      <p className="cm-none">MAT 이 자료를 얼마나 바르게 읽는지 재는 데만 씁니다. 고른 값만 남고 글은 남지 않습니다.</p>
      {rows.map((r) => (
        <div key={r.key} style={{ marginTop: 10 }}>
          <p className="cm-row" style={{ margin: 0 }}><b>{r.label}</b><span>{r.ask}</span></p>
          {/* **값마다 폼 하나다.** 서버 액션 폼에서는 누른 단추의 name/value 가
              실려 가지 않아(React 가 단추의 name 을 그리지 않는다) 숨은 칸에 싣는다 */}
          <div className="cm-chips" style={{ marginTop: 6 }} data-part={r.key}>
            {r.opts.map((v) => (
              <form key={v} action={gradeResearch} style={{ display: "contents" }}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="part" value={r.key} />
                <input type="hidden" name="verdict" value={v} />
                <button type="submit" aria-pressed={fb[r.key] === v}
                  className={`cm-chip${fb[r.key] === v ? " is-on" : ""}`}
                  style={{ minHeight: 36, minWidth: 56, justifyContent: "center", cursor: "pointer" }}>
                  {VERDICT_KO[v]}
                </button>
              </form>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
