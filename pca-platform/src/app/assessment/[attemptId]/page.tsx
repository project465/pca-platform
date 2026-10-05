import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { answersOf, attemptOf, progressOf } from "@/lib/me-v2/attempt";
import { choicesOf, scaleOf, sectionsFor, textOf } from "@/lib/me-v2/bank";
import { BRAND, toLang2, txer, type TxKey } from "@/lib/surface-text";
import SectionForm, { type Q } from "./section-form";

export const metadata = { title: `검사 · ${BRAND.root}` };

/** 묶음 이름. **`43/92` 만 보여주지 않는다**(규격 §43). */
const SECTION_LABEL: Record<string, TxKey> = {
  actual_work_interest: "secInterest",
  exposure: "secExposure",
  decision_ownership: "secOwnership",
  work_mode: "secWorkMode",
  learning_intent: "secLearning",
  career_context: "secContext",
};

/**
 * ME_V2 응시 화면.
 *
 * **등급과 학위 단계는 응시가 들고 있다.** 주소에 `?tier=` 를 붙여도 여기까지
 * 오지 못한다: 응시를 열 때 이용권이 등급을 정했고, 이 화면은 그 응시를
 * 읽기만 한다(규격 §11).
 *
 * **이어서 들어오면 안 찬 묶음으로 간다.** 처음부터 다시 시작하지 않는다.
 */
export default async function AssessmentPage({
  params, searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ s?: string; lang?: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);

  const a = await attemptOf(attemptId, user.id);
  if (!a) notFound();
  if (a.submitted_at) redirect(`/assessment/${attemptId}/done`);

  const secs = sectionsFor(a.tier);
  const prog = await progressOf(a);
  /* 주소에 쪽 번호가 없으면 안 찬 첫 묶음으로 보낸다 */
  const want = sp.s === undefined ? prog.resumeSection : Number(sp.s);
  const idx = Number.isFinite(want) ? Math.min(Math.max(0, want), secs.length - 1) : 0;
  const sec = secs[idx];

  const answers = await answersOf(a.id);
  const lang = a.interface_language ?? L;
  const questions: Q[] = sec.items.map((it) => ({
    id: it.item_id,
    no: it.question_no,
    text: textOf(it, a.education_stage, lang),
    choices: choicesOf(it),
    scaleLabel: scaleOf(it)?.label ?? "",
  }));
  const initial = Object.fromEntries(
    sec.items.filter((i) => answers[i.item_id] !== undefined)
      .map((i) => [i.item_id, answers[i.item_id]]),
  );

  return (
    <div className="aswrap">
      <header className="astop">
        <span className="asbrand">{BRAND.root}</span>
        <span className="asmeta">
          {a.tier} · {T(`asStage${a.education_stage[0].toUpperCase()}${a.education_stage.slice(1)}` as TxKey)}
        </span>
      </header>

      {/* 뜻이 있는 단계 이름을 띠로 보여준다. 숫자만 보여주지 않는다 */}
      <nav className="assteps" aria-label={T("asSectionOf")}>
        {secs.map((s, i) => {
          const p = prog.sections[i];
          const state = p.answered >= p.total ? "done" : i === idx ? "now" : "todo";
          /* **누를 수 있게 둔다.** 남은 묶음을 보고도 그리로 갈 길이
             없으면 응시자는 처음부터 다시 훑는다 */
          return (
            <a key={s.key} href={`/assessment/${a.id}?s=${i}`} className={`asstep is-${state}`}>
              <b>{T(SECTION_LABEL[s.key] ?? "secContext")}</b>
              <i>{p.answered}/{p.total}</i>
            </a>
          );
        })}
      </nav>

      <div className="asprog">
        <span style={{ width: `${prog.percent}%` }} />
      </div>

      <main className="asmain">
        <h1 className="asH1">{T(SECTION_LABEL[sec.key] ?? "secContext")}</h1>
        <SectionForm
          attemptId={a.id}
          sectionIndex={idx}
          lastSection={idx === secs.length - 1}
          questions={questions}
          initial={initial}
          sectionLabels={secs.map((x) => T(SECTION_LABEL[x.key] ?? "secContext"))}
          labels={{
            saving: T("asSaving"), saved: T("asSaved"), retry: T("asRetry"),
            prev: T("asPrev"), next: T("asNext"), submit: T("asSubmit"),
            notAll: T("asNotAll"), missingHead: T("asMissingHead"),
            missingLeft: T("asMissingLeft"), gone: T("asGone"),
          }}
        />
      </main>
    </div>
  );
}
