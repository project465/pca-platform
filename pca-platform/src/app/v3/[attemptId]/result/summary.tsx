/**
 * 웹 결과 화면 한 장(2026-10-23 사장님 지적: "하나도 정리가 안 됐다").
 *
 * 전까지 웹 결과는 종이 결과지를 그대로 화면에 펼친 것이라 절이 열 개를
 * 넘고 펼치기 단추가 열 곳 가까이 있었다. 맨 위 큰 글씨는 그 사람이 고른
 * 보기 문장 하나였고 결론이 아니었다.
 *
 * 화면에는 **다섯 덩어리만** 세운다. 차례가 곧 읽는 차례다.
 *   1. 한 줄 결론 (`headlineKo`)
 *   2. 영역 지도 (묶음별 영역 이름)
 *   3. 내가 가진 근거 (고르신 항목 그대로)
 *   4. 비어 있는 자리와 다음 할 일 셋
 *   5. PDF 받기 · 내 CareerMatri
 *
 * **새 판단을 하지 않는다.** 전부 굳은 결과 모델이 든 값이고 문장은
 * 종이와 같은 함수에서 온다. 산업·직무 연결 · 경험 번역 · 지역 자료는
 * PDF 가 든다. 종이는 이 화면을 쓰지 않는다(`@media print` 에서 숨긴다).
 */
import Link from "next/link";
import { phrase } from "@/lib/me-v3/phrase";
import { renderLang } from "@/lib/me-v3/result/render-lang";

/* 그 응시의 언어(요청마다). 결과지 쪽과 같은 자리를 읽는다 */
const tr = (ko: string, vars?: Record<string, string | number>) => phrase(renderLang())(ko, vars);


export type SummaryZone = { key: string; title: string; lead: string; names: string[]; tone: "ready" | "partial" | "low" | "few" | "off" };
export type SummaryEvidence = {
  name: string;
  rows: { label: string; owned: boolean; items: string[] }[];
  left: string[];
};
export type SummaryStep = { head: string; body: string; why: string | null; href: string };

export default function Summary({
  title, lead, who, zones, evidence, steps, pdfHref, keepAction, kept, tierNote,
  book = true, upgradeHref = null,
}: {
  title: string;
  lead: string;
  who: string;
  zones: SummaryZone[];
  evidence: SummaryEvidence[];
  steps: SummaryStep[];
  /** 종이 길. **견본이면 `null`** 이고, 그러면 작업공간 길도 세우지 않는다 */
  pdfHref: string | null;
  keepAction: (() => Promise<void>) | null;
  kept: number;
  tierNote: string | null;
  /** 종이가 긴 책인가. PRO(한국어)만 책이고 나머지는 이 화면의 A4 판이다 */
  book?: boolean;
  /** 개인 응시가 더 넓힐 수 있으면 가격표. 학교 응시는 늘 PRO 라 없다 */
  upgradeHref?: string | null;
}) {
  /* 작업공간(`/me`)이 두 언어로 선다(영어판 2단계b). 견본에는 작업공간이 없다 */
  const ws = pdfHref !== null;
  return (
    <div className="rsum">
      <section className="rsum-top">
        <p className="rsum-who">{who}</p>
        <h1 className="rsum-h1">{title}</h1>
        <p className="rsum-lead">{lead}</p>
        {tierNote ? <p className="rsum-note">{tierNote}</p> : null}
      </section>

      <section className="rsum-sect" aria-labelledby="rsum-map">
        <h2 id="rsum-map" className="rsum-h2"><span>1</span>{tr("영역별로 보면")}</h2>
        <ul className="rsum-zones">
          {zones.map((z) => (
            <li key={z.key} className={`rsum-zone is-${z.tone}`}>
              <b>{z.title}</b>
              <p>{z.lead}</p>
              <ul className="rsum-names">
                {z.names.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="rsum-sect" aria-labelledby="rsum-ev">
        <h2 id="rsum-ev" className="rsum-h2"><span>2</span>{tr("지원서에 꺼내 쓸 경험")}</h2>
        {evidence.length ? (
          <ul className="rsum-ev">
            {evidence.map((e) => (
              <li key={e.name}>
                <b className="rsum-ev-name">{e.name}</b>
                <dl>
                  {e.rows.map((r) => (
                    <div key={r.label} className="rsum-ev-row">
                      <dt>{r.label}{r.owned ? <em>{tr("직접 정함")}</em> : null}</dt>
                      <dd>{r.items.join(" / ")}</dd>
                    </div>
                  ))}
                  {e.left.length ? (
                    <div className="rsum-ev-row">
                      <dt>{tr("남은 결과물")}</dt><dd>{e.left.join(" / ")}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rsum-empty">
            {tr("이번 답에서는 아직 지원서에 바로 쓸 만큼 정리된 경험이 없습니다. 아래 할 일 하나를 해 보고 경험을 적으면 여기가 채워집니다.")}
          </p>
        )}
      </section>

      <section className="rsum-sect" aria-labelledby="rsum-do">
        <h2 id="rsum-do" className="rsum-h2"><span>3</span>{tr("다음에 할 일")}</h2>
        {steps.length ? (
          <ol className="rsum-steps">
            {steps.map((s, i) => (
              <li key={`${s.head}-${i}`}>
                <b>{s.head}</b>
                <p>{s.body}</p>
                {s.why ? <p className="rsum-why">{s.why}</p> : null}
                {ws ? <Link className="rsum-write" href={s.href}>{tr("해 본 일 적기")}</Link> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="rsum-empty">{tr("지금 답으로는 따로 적을 할 일이 없습니다.")}</p>
        )}
        {keepAction ? (
          <form action={keepAction} className="rsum-keep">
            <button type="submit">{tr("할 일 목록에 담기")}</button>
            {kept ? <span>{tr("담아 둔 할 일 {n}개 ·", { n: kept })} <Link href="/me/next">{tr("보기")}</Link></span> : null}
          </form>
        ) : null}
      </section>

      <section className="rsum-end">
        <div>
          {/* **받지 않을 책을 약속하지 않는다.** 책은 PRO 만 뽑는다(`pdf/route.ts`).
              BASIC 에 `한 권으로 묶었습니다` 를 적으면 받은 사람이 A4 몇 장을 열고
              나머지를 찾는다 */}
          {pdfHref === null ? (<>
            <b>{tr("견본은 여기까지입니다")}</b>
            <p>{tr("직접 검사를 보시면 내 답으로 이 화면이 만들어지고, PDF로도 받을 수 있습니다.")}</p>
          </>) : book ? (<>
            <b>{tr("자세한 분석은 PDF에 있습니다")}</b>
            <p>{tr("영역별 해설, 산업·직무 연결, 지원서 문장, 지역 기업 자료를 한 권으로 묶었습니다.")}</p>
          </>) : (<>
            <b>{tr("이 결과를 PDF로 받을 수 있습니다")}</b>
            <p>{upgradeHref
              ? tr("PRO로 넓히면 영역별 해설, 산업·직무 연결, 지원서 문장을 70쪽 안팎의 한 권으로 받습니다. 앞에서 답한 것은 다시 풀지 않습니다.")
              : tr("이 화면의 내용을 A4로 받습니다.")}</p>
          </>)}
        </div>
        <div className="rsum-end-a">
          {/* 종이 길은 `Link` 로 걸지 않는다: 미리 불러오면 종이가 만들어진다 */}
          {pdfHref === null
            ? <Link className="rsum-pdf" href="/pricing">{tr("검사 시작하기")}</Link>
            : <a className="rsum-pdf" href={pdfHref}>{tr("PDF 받기")}</a>}
          {upgradeHref ? <Link className="rsum-me" href={upgradeHref}>{tr("PRO로 넓히기")}</Link> : null}
          {ws ? <Link className="rsum-me" href="/me">{tr("내 CareerMatri")}</Link> : null}
        </div>
      </section>
    </div>
  );
}
