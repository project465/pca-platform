import Link from "next/link";
import { requireUser } from "@/lib/session";
import { matAccess } from "@/lib/mat-access";
import { settingsOf } from "@/lib/assistant/settings";
import { aiReady } from "@/lib/assistant/claude";
import {
  DOC_TYPE_KO, RESEARCH_MONTHLY_CAP, researchDocsOf, researchOpen, researchUsedThisMonth, type ResearchDoc,
} from "@/lib/assistant/research-docs";
import { CmShell, CmHead } from "../../shell";
import { SectionHeader } from "../../ui";
import ResearchUpload from "./upload";
import { removeResearch } from "./actions";

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
  const [acc, settings, used, docs] = await Promise.all([
    matAccess(user.id), settingsOf(user.id), researchUsedThisMonth(user.id), researchDocsOf(user.id),
  ]);
  const left = acc.paid
    ? `이번 달 남은 횟수 ${Math.max(0, RESEARCH_MONTHLY_CAP - used)}/${RESEARCH_MONTHLY_CAP}`
    : `무료로 ${acc.left.research}건 남음`;

  return (
    <CmShell active="/me/track" title="MAT">
      <CmHead kicker="AI 취업비서 · MAT" title="내 자료 읽기"
        lead="논문·발표 자료·이력서·자기소개서를 올리면 무엇을 했고 무엇이 나왔는지 정리하고, 회사와 연구소가 읽는 직무의 말로 옮깁니다. 여기서 뽑은 낱말로 맞는 공고를 찾습니다." />

      {!acc.ready && !acc.paid ? (
        <div className="cm-panel is-one">
          <div className="cm-pane">
            <p className="cm-row">
              <b>먼저 무료 검사부터</b>
              <span>MAT 은 검사 결과에서 시작합니다. 검사를 마치면 자료 한 건을 무료로 읽어 드립니다.</span>
            </p>
            <div className="cm-acts"><Link className="cm-btn is-primary" href="/cores">무료 검사 시작</Link></div>
          </div>
        </div>
      ) : acc.paid || acc.left.research > 0 ? (
        !researchOpen()
          ? <p className="cm-none">내 자료 읽기는 2026년 11월 7일부터 열립니다. 개인정보처리방침에 이 항목을 더해 7일 전부터 알리고 있습니다.</p>
          : aiReady()
            ? <ResearchUpload consented={Boolean(settings.file_consent_at)} left={left} />
            : <p className="cm-fail">지금은 자료 읽기가 꺼져 있습니다. 잠시 뒤 다시 와 주세요.</p>
      ) : (
        <div className="cm-panel is-one">
          <div className="cm-pane">
            <p className="cm-row">
              <b>무료로 읽어 볼 수 있는 자료 1건을 쓰셨습니다</b>
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
        </div>
      ) : null}
      {docs.map((d) => <DocCard key={d.id} d={d} />)}
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

function DocCard({ d }: { d: ResearchDoc }) {
  const x = d.data;
  return (
    <div className="cm-panel is-one" style={{ marginBottom: 16 }}>
      <div className="cm-pane">
        <p className="cm-kicker">{DOC_TYPE_KO[d.doc_type] ?? "자료"}{d.lang === "en" ? " · 영어" : ""}</p>
        <h3 style={{ marginTop: 4 }}>{d.title}</h3>
        {d.venue || d.year ? <p className="cm-none">{[d.venue, d.year].filter(Boolean).join(" · ")}</p> : null}
        <Metrics d={d} />
        {x.summary ? <p className="cm-draft">{x.summary}</p> : null}
        <dl className="cm-dl">
          {x.question ? <div><dt>무엇을 풀려 했나</dt><dd>{x.question}</dd></div> : null}
          {x.methods?.length ? <div><dt>방법·도구</dt><dd>{x.methods.join(" · ")}</dd></div> : null}
          {x.findings?.length ? <div><dt>핵심 결과</dt><dd>{x.findings.map((f, i) => <span key={i} style={{ display: "block" }}>· {f}</span>)}</dd></div> : null}
          {x.contribution?.length ? <div><dt>새로 보인 것</dt><dd>{x.contribution.join(" / ")}</dd></div> : null}
        </dl>
        {x.job_language?.length ? (
          <>
            <p className="cm-sub-h">직무의 말로 옮기면</p>
            <dl className="cm-dl">
              {x.job_language.map((j, i) => <div key={i}><dt>{j.skill}</dt><dd>근거: {j.evidence}</dd></div>)}
            </dl>
          </>
        ) : null}
        {x.roles?.length ? <p className="cm-none">이 자료가 근거가 되는 직무: {x.roles.join(" · ")}</p> : null}
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
