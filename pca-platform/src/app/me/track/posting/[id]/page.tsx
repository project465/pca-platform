import { wsLang } from "@/lib/me-v3/ws-lang";
import { wsSay, type WsSay } from "@/lib/me-v3/ws-say";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser, requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { activeCoreOrPick, experiencesOf } from "@/lib/me-v3/platform";
import { matAccess } from "@/lib/mat-access";
import { itemDomainKo, livePostingOf, type ItemStatus, type PostingItem } from "@/lib/assistant/posting";
import { interviewPrep, smallTasks } from "@/lib/assistant/prep";
import { sentenceDrafts } from "@/lib/assistant/sentence";
import { gradQuestions, isGrad, researchAsks, researchKindOf, type ResearchStatus } from "@/lib/assistant/research";
import { stageOf } from "@/lib/assistant/stage";
import { areaName, axisName } from "@/lib/assistant/catalog";
import { CmShell, CmHead } from "../../../shell";
import { SectionHeader } from "../../../ui";
import { changePostingState, takePostingTasks } from "../../actions";
import { CopyButton } from "../../copy-button";

export async function generateMetadata() {
  const u = await currentUser().catch(() => null);
  const t = wsSay(u ? await wsLang(u.id) : "ko");
  return { title: t("공고 확인 · MAT") };
}

/**
 * 붙여 넣은 공고 하나와 내 경험을 비교한 결과.
 *
 * **합격 가능성을 적지 않는다.** 요구 항목마다 넷 가운데 하나를 적고 그
 * 수를 더해 점수 하나로 만들지 않는다. 비어 있는 줄에는 그 영역의 경험을
 * 적는 길을 붙인다.
 *
 * **남의 것은 열리지 않는다.** 번호와 로그인한 사람으로 함께 거른다.
 *
 * **상태는 지금 값이다.** 붙여 넣은 뒤 적은 경험까지 넣어 다시 단다
 * (`livePostingOf`). 브리핑과 이 표가 같은 공고를 다르게 적지 않게 한다.
 */

/** 문장 뼈대의 대괄호 칸을 눈에 띄게 칠한다. 글자는 그대로다 */
function withBlanks(s: string) {
  return s.split(/(\[[^\]]+\])/).map((x, i) => (/^\[[^\]]+\]$/.test(x)
    ? <mark className="cm-blank" key={i}>{x}</mark> : x));
}

/* 화면 글은 한국어 원문이 열쇠다(`ws-en/track-posting.ts`). 영어면 사전을 거친다 */
const STATUS: Record<ItemStatus, { label: string; why: string }> = {
  ready: { label: "설명할 경험 있음", why: "결과에서 근거가 선 영역입니다." },
  partial: { label: "정리가 덜 됨", why: "해 본 일은 있는데 직접 정한 것이나 남긴 것이 아직 적혀 있지 않습니다." },
  empty: { label: "아직 없음", why: "이 영역의 경험이 아직 기록에 없습니다." },
  unmapped: { label: "전공 밖 조건", why: "학력·자격·근무 여건·태도처럼 경험 기록으로 판단하지 않는 조건입니다." },
};

/**
 * 영역에 잇지 못한 줄은 조건과 따로 적는다. `Git 협업 경험` 같은 줄을 `전공 밖
 * 조건` 으로 적으면 읽는 사람이 그것을 준비하지 않아도 되는 줄로 읽는다.
 */
const UNMATCHED = { label: "영역 확인 필요", why: "이 전공의 업무 영역에 바로 잇지 못한 줄입니다. 어느 경험으로 설명할지 직접 정해 주세요." };
/** 연구 실적 줄(논문 · 특허 · 과제 …)은 아래 따로 세운 표에서 기록과 맞댄다 */
const RESEARCH = { label: "연구 실적 요구", why: "아래 ‘연구 실적 요구’ 표에서 내 기록과 비교해 드립니다." };
const isResearchLine = (it: PostingItem) => it.status === "unmapped" && researchKindOf(it.text) !== null;
const statusOf = (it: PostingItem, t: WsSay) => {
  const s = isResearchLine(it) ? RESEARCH
    : it.status === "unmapped" && it.reason === "unmatched" ? UNMATCHED : STATUS[it.status];
  return { label: t(s.label), why: t(s.why) };
};

const ORDER: ItemStatus[] = ["empty", "partial", "ready", "unmapped"];

/* 연구 실적 줄의 상태. 학위 조건(`info`)은 기록으로 판단하지 않는다 */
const R_STATUS: Record<ResearchStatus, string> = {
  ready: "적어 둔 기록 있음",
  partial: "기록은 있는데 덜 적힘",
  empty: "기록에 없음",
  info: "학위 조건",
};
const R_KIND: Record<string, string> = {
  paper: "논문", patent: "특허", project: "연구 과제", talk: "학회 발표", proposal: "연구계획서", degree: "학위",
};

export default async function Posting({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ taken?: string }>;
}) {
  const { id } = await params;
  const takenRaw = (await searchParams).taken;
  const user = await requireUser();
  /* 영어 작업공간도 이 쪽을 쓴다. 표 · 뼈대 · 면접 준비 · 작은 일이 그 말로 선다 */
  const lang = await wsLang(user.id);
  const t = wsSay(lang);
  const en = lang === "en";
  const area = (td: string) => areaName(core, td, lang);
  const [p, major, core, state, stage] = await Promise.all([
    livePostingOf(user.id, id), activeMajorName(user.id), activeCoreOrPick(user.id),
    /* 무료로 비교한 공고도 끝까지 다룬다(`mat-access.ts`): 기간권이 없어도
       결과가 있으면 할 일 담기와 상태 바꾸기를 연다 */
    matAccess(user.id).then((x) => ({ on: x.open })), stageOf(user.id),
  ]);
  if (!p) notFound();
  const a = p.analysis;
  const items = [...a.items].sort(
    (x, y) => ORDER.indexOf(x.status) - ORDER.indexOf(y.status)
      || (x.kind === y.kind ? 0 : x.kind === "must" ? -1 : 1));
  const firstGap = items.find((it) => it.status === "empty" && it.domain)
    ?? items.find((it) => it.status === "partial" && it.domain);
  const unmatched = items.filter((it) => it.status === "unmapped" && it.reason === "unmatched" && !isResearchLine(it)).length;
  const researchN = items.filter(isResearchLine).length;
  /* 면접 준비와 작은 일은 **분석 순서(공고에 적힌 차례)** 로 만든다. 표의 정렬은
     상태 차례라, 그것으로 고르면 필수 항목 여섯이 늘 `아직 없음` 쪽에서만 나온다 */
  const exps = await experiencesOf(user.id, core);
  const prep = interviewPrep(core, a.items, exps, 6, lang);
  const tasks = smallTasks(core, a.items, exps, lang);
  /* 다른 전공으로 읽은 공고는 영역 코드가 이 전공의 것이 아니라 뼈대를 만들지 않는다 */
  const sameCore = (p.core_code ?? core) === core;
  const sd = sameCore ? sentenceDrafts(a.items, exps, 6, lang) : { drafts: [], missing: 0 };
  /* 연구 실적 줄은 학위와 관계없이 연구직 공고면 선다. 학위별 질문은 석사 이상에게만 */
  const rAsks = researchAsks(a.items, exps, lang);
  const gq = isGrad(stage) ? gradQuestions(stage, exps, lang) : [];
  const taken = takenRaw === undefined ? null : takenRaw === "x" ? -1 : Number(takenRaw);

  return (
    <CmShell active="/me/track" title={t("공고 확인")} major={major} lang={lang}>
      <CmHead
        kicker={p.deadline ? t("마감 {date}", { date: p.deadline }) : t("마감 미입력")}
        title={p.label}
        lead={a.role ? t("공고가 뽑는 자리: {role}", { role: a.role }) : t("공고의 요구 항목을 내 경험과 비교했습니다.")}
      />
      {a.note ? <p className="cm-none" role="status">{a.note}</p> : null}

      <SectionHeader icon="check" title={t("한눈에")}
        sub={t("설명할 경험 {ready} · 정리가 덜 됨 {partial} · 아직 없음 {empty} · 전공 밖 조건 {cond}",
          { ready: a.counts.ready, partial: a.counts.partial, empty: a.counts.empty, cond: a.counts.unmapped - unmatched - researchN })
          + (unmatched ? t(" · 영역 확인 필요 {n}", { n: unmatched }) : "")
          + (researchN ? t(" · 연구 실적 요구 {n}", { n: researchN }) : "")} />
      {firstGap?.domain ? (
        <div className="cm-panel is-one">
          <div className="cm-pane">
            <p className="cm-row">
              <b>{t("먼저 채울 줄: {text}", { text: firstGap.text })}</b>
              <span>{t("{area} 쪽 경험 하나를 적어 두면 이 줄을 설명할 재료가 생깁니다.", { area: itemDomainKo(core, firstGap, lang) })}</span>
            </p>
            <div className="cm-acts">
              <Link className="cm-btn is-primary"
                href={`/me/experience/new?td=${encodeURIComponent(firstGap.domain)}`}>
                {t("이 영역 경험 적기")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <SectionHeader icon="log" title={t("요구 항목")} />
      {items.length ? (
        <div className="cm-tablewrap">
          <table className="cm-table">
            <thead>
              <tr><th>{t("공고의 요구")}</th><th>{t("구분")}</th><th>{t("이어지는 영역")}</th><th>{t("지금 내 상태")}</th><th>{t("적어 둔 경험")}</th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.text}</td>
                  <td>{it.kind === "must" ? t("필수") : t("우대")}</td>
                  <td>{isResearchLine(it) ? t("연구 실적") : itemDomainKo(core, it, lang)}</td>
                  <td><b>{statusOf(it, t).label}</b><br /><small>{statusOf(it, t).why}</small></td>
                  <td>
                    {it.evidence.length ? it.evidence.join(" / ")
                      : it.domain && it.status !== "ready" ? (
                        <Link href={`/me/experience/new?td=${encodeURIComponent(it.domain)}`}>{t("경험 적기")}</Link>
                      ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cm-none">{t("요구 항목을 찾지 못했습니다. 자격 요건과 하는 일이 적힌 부분을 다시 붙여 넣어 주세요.")}</p>
      )}

      {rAsks.length ? (
        <>
          <span id="research" />
          <SectionHeader icon="doc" title={t("연구 실적 요구")}
            sub={t("논문 · 특허 · 연구 과제 · 학회 발표 · 연구계획서 · 학위처럼 연구직 공고에 자주 붙는 줄을 따로 모았습니다. 편수나 등급이 공고 기준에 맞는지는 판단하지 않고, 기록에 있는지만 봅니다.")} />
          <div className="cm-tablewrap">
            <table className="cm-table">
              <thead>
                <tr><th>{t("공고의 요구")}</th><th>{t("종류")}</th><th>{t("내 기록")}</th><th>{t("다음에 할 일")}</th></tr>
              </thead>
              <tbody>
                {rAsks.map((r, i) => (
                  <tr key={i}>
                    <td>{r.text}<br /><small>{r.kind === "must" ? t("필수") : t("우대")}</small></td>
                    <td>{t(R_KIND[r.research])}</td>
                    <td>
                      <b>{t(R_STATUS[r.status])}</b>
                      {r.evidence.length ? (
                        <><br /><small>{r.evidence.map((e, j) => (
                          <span key={e.id}>{j ? " / " : ""}<Link href={`/me/experience/${encodeURIComponent(e.id)}/edit`}>{e.title}</Link></span>
                        ))}</small></>
                      ) : null}
                    </td>
                    <td>{r.next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cm-acts" style={{ marginTop: 10 }}>
            <Link className="cm-btn" href="/me/experience/new?kind=paper">{t("논문·학회 기록 적기")}</Link>
            <Link className="cm-btn" href="/me/experience/new?kind=research">{t("연구·실험 기록 적기")}</Link>
          </div>
        </>
      ) : null}

      <span id="sentences" />
      <SectionHeader icon="doc" title={t("지원서 문장 뼈대")}
        sub={t("내 기록으로 만든 초안입니다. 필수 항목마다 적어 둔 경험의 칸에 있는 말만 이었고, 비어 있는 칸은 대괄호로 남겼습니다.")} />
      {sd.drafts.length ? (
        <div className="cm-panel is-one">
          {sd.drafts.map((d, i) => {
            const text = d.sentences.join(" ");
            return (
              <div className="cm-pane" key={i}>
                <h3>{d.text}<em>{t("필수")} · {area(d.domain)} · {t(STATUS[d.status].label)}</em></h3>
                {d.also.length ? (
                  <p className="cm-none">{t("같은 초안으로 함께 설명할 수 있는 요구:")} {d.also.map((x) => (en ? `“${x}”` : `‘${x}’`)).join(" · ")}</p>
                ) : null}
                <p className="cm-draft">{withBlanks(text)}</p>
                <p className="cm-none">
                  {t("가져온 경험:")}{" "}
                  <Link href={`/me/experience/${encodeURIComponent(d.experience.id)}/edit`}>{d.experience.title}</Link>
                  {d.blanks.length ? t(" · 채울 칸 {n}개는 경험을 고쳐 적어 두면 다음에 채워져 나옵니다.", { n: d.blanks.length }) : ""}
                </p>
                <div className="cm-acts cm-copyrow">
                  <CopyButton text={text} label={t("이 초안 복사")} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="cm-none">
          {!sameCore ? t("지금 전공과 다른 전공으로 읽은 공고라 문장 뼈대를 만들지 않았습니다.")
            : sd.missing ? t("필수 항목에 이을 경험이 아직 적혀 있지 않습니다. 위 표의 경험 적기에서 하나를 적으면 여기에 뼈대가 생깁니다.")
              : t("설명할 경험이 있거나 정리가 덜 된 필수 항목이 없습니다.")}
        </p>
      )}
      {sd.drafts.length && sd.missing ? (
        <p className="cm-none" style={{ marginTop: 10 }}>{t("검사에서는 해 봤다고 답했지만 적어 둔 경험이 없는 필수 항목 {n}개는 뼈대를 만들지 않았습니다.", { n: sd.missing })}</p>
      ) : null}
      <p className="cm-note">{t("초안의 말은 내 경험 기록에 적힌 것만 썼습니다. 숫자나 결과는 직접 확인해 넣어 주세요.")}</p>

      <SectionHeader icon="users" title={t("이 공고로 면접을 본다면")}
        sub={t("필수 항목에서 나올 법한 질문과, 내 기록 가운데 가져갈 경험입니다. 소리 내어 한 번 답해 보세요.")} />
      {prep.length ? (
        <div className="cm-panel">
          {prep.map((x, i) => (
            <div className="cm-pane" key={i}>
              <h3>{x.question}<em>{x.kind === "must" ? t("필수") : t("우대")} · {area(x.domain)} · {axisName(x.axis, lang)}</em></h3>
              <dl className="cm-dl">
                <div><dt>{t("공고의 요구")}</dt><dd>{x.text}</dd></div>
                {x.experience ? (
                  <div><dt>{t("가져갈 경험")}</dt><dd>
                    <Link href={`/me/experience/${encodeURIComponent(x.experience.id)}/edit`}>{x.experience.title}</Link>
                  </dd></div>
                ) : null}
                {x.frame ? <div><dt>{t("답의 뼈대")}</dt><dd>{x.frame}</dd></div> : null}
                {x.honest ? (
                  <div>
                    <dt>{x.status === "empty" ? t("아직 이 영역 경험이 없다면 이렇게 답할 수 있어요") : t("적어 둔 경험이 없어요")}</dt>
                    <dd>{x.honest}</dd>
                  </div>
                ) : null}
              </dl>
              {!x.experience ? (
                <div className="cm-acts">
                  <Link className="cm-btn" href={`/me/experience/new?td=${encodeURIComponent(x.domain)}`}>{t("이 영역 경험 적기")}</Link>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="cm-none">{t("이 공고에서는 경험으로 답할 요구 항목을 찾지 못했습니다. 학력·자격 같은 조건만 적힌 공고일 수 있어요.")}</p>
      )}
      {gq.length ? (
        <>
          <SectionHeader icon="users" title={t("학위 연구를 두고 자주 받는 질문")}
            sub={t("검사에서 답한 학위 단계에 맞춘 질문과, 내 연구 기록에서 가져갈 재료입니다.")} />
          <div className="cm-panel">
            {gq.map((x, i) => (
              <div className="cm-pane" key={i}>
                <h3>{x.question}</h3>
                <dl className="cm-dl">
                  {x.experience ? (
                    <div><dt>{t("가져갈 경험")}</dt><dd>
                      <Link href={`/me/experience/${encodeURIComponent(x.experience.id)}/edit`}>{x.experience.title}</Link>
                    </dd></div>
                  ) : null}
                  <div><dt>{t("답의 뼈대")}</dt><dd>{x.frame}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        </>
      ) : null}
      <p className="cm-note">{t("질문은 공고 문장과 이 전공의 업무 영역으로 만든 예시입니다. 실제 면접에서 이대로 나온다는 뜻은 아니에요.")}</p>

      <SectionHeader icon="target" title={t("이번 주에 할 수 있는 작은 일")}
        sub={t("필수 항목 가운데 아직 없음 · 정리가 덜 됨인 줄마다 결과물 하나와 비교할 것 하나를 골랐습니다.")} />
      <div id="tasks" />
      {taken !== null ? (
        <p className="cm-none" role="status">
          {taken < 0 ? t("지금 전공과 다른 전공으로 읽은 공고라 할 일로 담지 않았어요.")
            : taken > 0 ? t("할 일 {n}개를 담았어요. 지금 할 일 쪽에서 이어서 볼 수 있어요.", { n: taken })
              : t("이미 담아 둔 할 일이라 새로 늘지 않았어요.")}
        </p>
      ) : null}
      {tasks.length ? (
        <div className="cm-panel is-one">
          <div className="cm-pane">
            <dl className="cm-dl">
              {tasks.map((t, i) => (
                <div key={i}><dt>{t.text}</dt><dd>{t.task}</dd></div>
              ))}
            </dl>
            <div className="cm-acts">
              {state.on ? (
                <form action={takePostingTasks}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="cm-btn is-primary" type="submit">{t("할 일 목록에 담기")}</button>
                </form>
              ) : null}
              <Link className="cm-btn" href="/me/next">{t("지금 할 일 보기")}</Link>
            </div>
          </div>
        </div>
      ) : (
        <p className="cm-none">{t("필수 항목 가운데 아직 없음이나 정리가 덜 된 줄이 없습니다.")}</p>
      )}

      <SectionHeader icon="clock" title={t("이 공고 상태")} />
      <div className="cm-panel is-one">
        <div className="cm-pane">
          <p className="cm-row">
            <b>{p.state === "applied" ? t("지원함") : p.state === "closed" ? t("닫음") : t("보고 있음")}</b>
            <span>{t("보고 있는 공고는 마감 7일 · 3일 · 1일 전에 알림이 옵니다.")}</span>
          </p>
          {p.deadline ? (
            <div className="cm-acts">
              <a className="cm-btn" href={`/me/track/calendar?id=${p.id}`} download>{t("마감일 휴대폰 달력에 넣기")}</a>
            </div>
          ) : null}
          {state.on ? (
            <div className="cm-acts">
              {(["watching", "applied", "closed"] as const).filter((s) => s !== p.state).map((s) => (
                <form action={changePostingState} key={s}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="state" value={s} />
                  <button className="cm-btn" type="submit">
                    {s === "watching" ? t("다시 보기") : s === "applied" ? t("지원했어요") : t("닫기")}
                  </button>
                </form>
              ))}
            </div>
          ) : null}
          <p className="cm-none">
            {t("합격 가능성은 적지 않습니다. 이 표는 공고에 적힌 요구와 내 기록을 나란히 놓은 것입니다.")}
          </p>
          <div className="cm-acts">
            <Link className="cm-btn" href="/me/track">{t("MAT으로")}</Link>
          </div>
        </div>
      </div>
    </CmShell>
  );
}
