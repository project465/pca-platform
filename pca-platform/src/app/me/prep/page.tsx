import Link from "next/link";
import { requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { activeCoreOrPick, experiencesOf, latestResult } from "@/lib/me-v3/platform";
import { majorNameIn } from "@/lib/me-v3/runtime/session";
import { wsLang, type WsLang } from "@/lib/me-v3/ws-lang";
import { wsSay } from "@/lib/me-v3/ws-say";
import { coreOf } from "@/lib/me-v3/result/model";
import { resultMeta } from "@/lib/me-v3/result/meta";
import { buildPrep, prepAnswersOf, type PrepAnswer } from "@/lib/me-v3/prep";
import { CmShell, CmHead } from "../shell";
import { EmptyState, SectionHeader } from "../ui";
import { savePrep } from "./actions";

export async function generateMetadata() {
  const user = await requireUser();
  const t = wsSay(await wsLang(user.id));
  return { title: t("지원서·면접 준비 · 내 CareerMatri") };
}

/** 껍데기에 적을 전공 이름. 영어면 그 언어 원고에서 읽고, 모르면 비워 껍데기가 채운다 */
async function majorFor(userId: string, lang: WsLang): Promise<string | null> {
  const ko = await activeMajorName(userId);
  if (lang !== "en" || !ko) return ko;
  try { return majorNameIn(await activeCoreOrPick(userId), "en"); } catch { return null; }
}

/**
 * 지원서·면접 준비.
 *
 * **글을 대신 써 주지 않는다.** 이 쪽이 내놓는 것은 묻는 말과 쓸 재료와
 * 적는 차례다. 재료는 전부 그 사람의 결과와 적어 둔 경험에서 오고
 * (`buildPrep`), 답은 그 사람이 적어 저장한다. 결과가 없는 사람에게 일반
 * 예문을 채워 두지 않는다: 그러면 남의 글을 지원서에 옮기게 된다.
 */
export default async function Prep({
  searchParams,
}: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const lang = await wsLang(user.id);
  const t = wsSay(lang);
  const major = await majorFor(user.id, lang);
  const model = await latestResult(user.id);

  if (!model) {
    return (
      <CmShell active="/me/prep" title={t("지원서·면접")} major={major} lang={lang}>
        <CmHead title={t("지원서·면접 준비")}
          lead={t("검사 결과에서 지원서 문항의 재료와 예상 면접 질문을 꺼내고, 답을 직접 적어 연습하는 곳입니다.")} />
        <EmptyState>
          <b>{t("아직 검사 결과가 없습니다.")}</b>
          {" " + t("질문과 재료는 내 결과에서만 만들기 때문에, 검사를 마치면 여기에 섭니다.")}
          <p style={{ marginTop: 10 }}><Link href="/cores">{t("검사하러 가기")}</Link></p>
        </EmptyState>
      </CmShell>
    );
  }

  const core = coreOf(model);
  const [meta, exps, saved] = await Promise.all([
    resultMeta(model.attempt_id, core, lang),
    experiencesOf(user.id, core),
    prepAnswersOf(user.id, core),
  ]);
  const prep = buildPrep(model, core, meta.specializationCode, exps, lang);
  const answerOf = new Map(saved.map((a) => [`${a.kind}|${a.prompt_key}`, a]));
  const live = new Set([
    ...prep.essays.map((e) => `essay|${e.key}`),
    ...prep.interviews.map((q) => `interview|${q.key}`),
  ]);
  /* 결과가 바뀌어 지금은 서지 않는 물음에 적었던 답. **지우지 않는다** */
  const old = saved.filter((a) => !live.has(`${a.kind}|${a.prompt_key}`));
  const justSaved = (await searchParams)?.saved ?? "";
  const doneCount = prep.essays.filter((e) => answerOf.has(`essay|${e.key}`)).length
    + prep.interviews.filter((q) => answerOf.has(`interview|${q.key}`)).length;
  const total = prep.essays.length + prep.interviews.length;

  return (
    <CmShell active="/me/prep" title={t("지원서·면접")} major={major} lang={lang}>
      <CmHead
        title={t("지원서·면접 준비")}
        meta={t("{date} 검사 결과 기준 · 적어 둔 답 {done} / {total}",
          { date: meta.answeredOn ?? "", done: doneCount, total })}
        lead={t("내 결과와 경험에서 지원서 문항의 재료와 예상 면접 질문을 꺼냈습니다. "
          + "글은 직접 쓰고, 저장해 두면 다시 와서 고칠 수 있습니다.")}
      />

      <section style={{ marginTop: 8 }}>
        <SectionHeader icon="doc" title={t("지원서 문항")}
          sub={t("자기소개서에 자주 나오는 네 문항입니다. 문항마다 내 결과에서 쓸 재료를 모았습니다.")} />
        <ul className="cm-list">
          {prep.essays.map((e) => (
            <PrepItem key={e.key} kind="essay" pkey={e.key} title={e.title} ask={e.ask}
              answer={answerOf.get(`essay|${e.key}`)} open={justSaved === e.key} lang={lang}>
              {e.empty ? (
                <p className="cm-row"><span>{e.empty}{" "}
                  <Link href="/me/experience/new">{t("경험 추가")}</Link></span></p>
              ) : null}
              {e.materials.map((m) => (
                <p className="cm-row" key={m.label}>
                  <b>{m.label}</b><span>{m.items.join(" · ")}</span>
                </p>
              ))}
              <p className="cm-row"><b>{t("적는 차례")}</b>
                <span>{e.frame.map((f) => f.label).join(" → ")}</span></p>
              {e.frame.map((f) => (
                <p className="cm-row" key={f.label}>
                  <b>{f.label}</b>
                  <span>{f.items.length
                    ? t("{hint} · 내 재료: {items}", { hint: f.hint, items: f.items.join(" / ") })
                    : f.hint}</span>
                </p>
              ))}
            </PrepItem>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <SectionHeader icon="users" title={t("예상 면접 질문")}
          sub={t("내 결과에서 면접관이 파고들 만한 부분을 골랐습니다. 소리 내어 답해 본 뒤 요점을 적어 두세요.")} />
        {prep.interviews.length ? (
          <ul className="cm-list">
            {prep.interviews.map((q) => (
              <PrepItem key={q.key} kind="interview" pkey={q.key} title={q.q} ask={q.q}
                answer={answerOf.get(`interview|${q.key}`)} open={justSaved === q.key} lang={lang}>
                <p className="cm-row"><b>{t("왜 나오나요")}</b><span>{q.why}</span></p>
                {q.prepare.length ? (
                  <p className="cm-row"><b>{t("떠올릴 것")}</b><span>{q.prepare.join(" · ")}</span></p>
                ) : null}
              </PrepItem>
            ))}
          </ul>
        ) : (
          <EmptyState>
            <b>{t("아직 질문을 만들 재료가 없습니다.")}</b>
            {" " + t("경험을 하나 적어 두면 그 경험에서 나올 질문이 여기에 섭니다.")}
          </EmptyState>
        )}
      </section>

      {old.length ? (
        <section style={{ marginTop: 28 }}>
          <SectionHeader icon="log" title={t("전에 적어 둔 답")}
            sub={t("결과가 바뀌어 지금은 서지 않는 질문에 적었던 답입니다. 그대로 두었습니다.")} />
          <ul className="cm-list">
            {old.map((a) => (
              <PrepItem key={`${a.kind}|${a.prompt_key}`} kind={a.kind} pkey={a.prompt_key}
                title={a.prompt_text} ask={a.prompt_text} answer={a} open={false} lang={lang} />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="cm-soon" style={{ marginTop: 24 }}>
        <b>{t("성과와 숫자는 직접 적어 주세요.")}</b>
        {" " + t("여기 재료는 검사에서 고르신 답이라 기간·인원·수치가 들어 있지 않습니다. "
          + "실제로 없었던 내용을 지원서에 적으면 면접에서 그 한 줄이 가장 먼저 흔들립니다. "
          + "적은 답은 본인에게만 보입니다.")}
      </p>
    </CmShell>
  );
}

function PrepItem({
  kind, pkey, title, ask, answer, open, children, lang = "ko",
}: {
  kind: "essay" | "interview"; pkey: string; title: string; ask: string;
  answer: PrepAnswer | undefined; open: boolean; children?: React.ReactNode;
  lang?: WsLang;
}) {
  const t = wsSay(lang);
  const id = `p-${pkey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return (
    <li className="cm-item" id={id}>
      <details open={open}>
        <summary>
          <span className="cm-item-t"><b>{title}</b></span>
          <span className="cm-item-meta">
            <span className={`cm-dot${answer ? " is-on" : ""}`}>
              {answer
                ? t("적어 둠 · {n}자", { n: answer.answer_text.length })
                : t("아직 안 적음")}
            </span>
            {answer ? <time dateTime={answer.updated_at}>{answer.updated_at}</time> : null}
          </span>
          {kind === "essay" ? <span className="cm-item-sub">{ask}</span> : null}
        </summary>
        <div className="cm-item-more">
          {children ? <div className="cm-rows">{children}</div> : null}
          <form action={savePrep} className="cm-rows">
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="key" value={pkey} />
            <input type="hidden" name="prompt" value={ask} />
            <label className="cm-field">
              <span>{kind === "essay" ? t("내 답") : t("답의 요점")}</span>
              <em>{open ? t("저장했습니다.#prep") : t("비워서 저장하면 지웁니다.")}</em>
              <textarea className="cm-textarea" name="answer" maxLength={4000}
                rows={kind === "essay" ? 8 : 4} defaultValue={answer?.answer_text ?? ""} />
            </label>
            <div className="cm-acts">
              <button className="cm-btn is-primary" type="submit">{t("저장#prep")}</button>
            </div>
          </form>
        </div>
      </details>
    </li>
  );
}
