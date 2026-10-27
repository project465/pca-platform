import { wsLang } from "@/lib/me-v3/ws-lang";
import { wsSay } from "@/lib/me-v3/ws-say";
import Link from "next/link";
import { currentUser, requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { coreIfAny } from "@/lib/me-v3/platform";
import { domainName, majorNameIn } from "@/lib/me-v3/runtime/session";
import { textFor } from "@/lib/me-v3/result/text";
import { localizeResult } from "@/lib/me-v3/result/localize";
import { getProduct } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { payOpen } from "@/lib/payments";
import {
  TRACK_TRIAL, activeTrack, hasV3Result, proTrialClaimable, trackHistory, trackProductsFor,
} from "@/lib/track";
import { aiReady } from "@/lib/assistant/claude";
import { settingsOf } from "@/lib/assistant/settings";
import { pushKeys } from "@/lib/push";
import { PushToggle } from "@/components/push-toggle";
import { livePostingsOf } from "@/lib/assistant/posting";
import { nudgeUser, nudgesOf } from "@/lib/assistant/nudges";
import { buildBrief, daysLeft, kstToday } from "@/lib/assistant/brief";
import { openActions } from "@/lib/me-v3/open-actions";
import { gradWeekTask, isGrad, researchCards } from "@/lib/assistant/research";
import { stageOf } from "@/lib/assistant/stage";
import { CmShell, CmHead } from "../shell";
import { AssistantGuide } from "./guide";
import { BriefPanel } from "./brief";
import { SectionHeader } from "../ui";
import {
  addPosting, changeConsent, changeDigest, changeFileConsent, claimTrial, makeDraft, readAllNudges,
} from "./actions";

export async function generateMetadata() {
  const u = await currentUser().catch(() => null);
  const t = wsSay(u ? await wsLang(u.id) : "ko");
  return { title: t("MAT · AI 취업비서") };
}

/**
 * MAT · 내 구독.
 *
 * **한 주를 끌고 가는 자리다.** 맨 위의 브리핑이 이번 주에 할 것을 한 판에
 * 모은다(가까운 마감 · 할 일 하나 · 여러 공고가 함께 요구하는데 비어 있는 것).
 * 그 아래 도구 셋(메모를 경험으로 옮기기 · 공고 맞대기 · 알림)이 그 판을
 * 채운다. 넷 다 결과지가 이미 정한 판정 위에서 돌고 **점수를 새로 만들지
 * 않는다**(설계 원칙 6).
 *
 * **공고를 우리가 고르지 않는다.** 사용자가 찾은 공고를 붙여 넣고, 지원도
 * 그 사람이 직접 한다(CLAUDE.md 법적 범위). 그래서 이 화면에 `추천 기업`
 * 이 서지 않는다.
 *
 * **기간권이다.** 30일권과 365일권을 한 번씩 팔고 자동으로 갱신하지 않는다.
 * 기간이 끝나면 저절로 닫히고 카드가 다시 긁히지 않는다.
 *
 * **검사 결과가 먼저다.** 결과가 없는 사람에게는 사는 단추 대신 무료 검사로
 * 가는 길을 세운다. 결과 없이 열면 브리핑이 비고 공고 맞대기는 전공을 모른
 * 채로 돈다(`hasV3Result`, 결제를 여는 자리도 한 번 더 막는다).
 *
 * **영어 작업공간도 같은 화면이다.** 다른 점은 셋이다: 해외판 기간권
 * (`TRACK_*_GL`, 값이 승인되기 전에는 사는 단추 대신 안내) · AI 분석과 파일
 * 읽기 동의를 세우지 않음(영문 개인정보처리방침이 서기 전이라 규칙으로만
 * 읽는다) · 국내 자료에 서 있는 줄(지원 기록 · 파일 올리기)을 빼는 것.
 */

/** 마감까지 남은 날. 한국 날짜로 센다(브리핑과 같은 함수) */
const leftDays = (deadline: string): number => daysLeft(deadline, kstToday());

const NAME: Record<string, string> = {
  TRACK_30D: "30일권",
  TRACK_365D: "365일권",
  TRACK_30D_GL: "30일권",
  TRACK_365D_GL: "365일권",
  [TRACK_TRIAL]: "PRO 구매 첫 1개월",
  /* 학교가 계약으로 산 이용권. 학생이 낸 돈이 없으므로 주문 칸은 비어 있다 */
  CAMPUS_MAT_6M: "학교 제공 6개월",
  CAMPUS_MAT_12M: "학교 제공 1년",
};

const FAIL: Record<string, string> = {
  off: "기간권이 열려 있지 않아 저장하지 못했습니다. 아래에서 기간권을 고르시면 바로 열립니다.",
  short: "공고 본문을 조금 더 붙여 넣어 주세요. 하는 일과 자격 요건이 들어 있으면 됩니다.",
  posting: "공고를 저장하지 못했습니다. 붙여 넣은 글은 그대로 두고 한 번 더 눌러 주세요.",
  memo: "메모를 한두 문장 더 적어 주세요. 무엇을 했고 무엇이 남았는지면 됩니다.",
  draft: "메모를 옮기지 못했습니다. 한 번 더 눌러 주세요.",
  needtest: "MAT 은 검사 결과에서 시작하므로 무료 검사를 먼저 마쳐 주세요.",
};

export default async function Track({
  searchParams,
}: {
  searchParams: Promise<{ trial?: string; e?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const lang = await wsLang(user.id);
  const t = wsSay(lang);
  const en = lang === "en";
  const day = (iso: string) =>
    new Intl.DateTimeFormat(en ? "en-US" : "ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric",
    }).format(new Date(iso));
  const short = (iso: string) =>
    new Intl.DateTimeFormat(en ? "en-US" : "ko-KR", {
      timeZone: "Asia/Seoul", month: en ? "short" : "numeric", day: "numeric",
    }).format(new Date(iso));

  const state = await activeTrack(user.id);
  /* 이번 주 한 줄이 아직 없으면 지금 만든다. **밤 당번을 기다리게 하지
     않는다**: 기간권을 막 산 사람이 빈 알림 칸을 본다 */
  if (state.on) await nudgeUser(user.id).catch(() => undefined);
  const [core, ready, history, claimable, prods, settings, live, nudges, open, stage] = await Promise.all([
    coreIfAny(user.id),
    hasV3Result(user.id),
    trackHistory(user.id),
    proTrialClaimable(user.id),
    Promise.all(trackProductsFor(lang).map((c) => getProduct(c))),
    settingsOf(user.id),
    /* 공고 목록과 브리핑이 **같은 값**을 읽는다: 붙여 넣은 뒤 적은 경험까지
       넣어 상태를 다시 단 것이다(`refreshPosting`) */
    state.on ? livePostingsOf(user.id) : Promise.resolve({ rows: [], core: null, exps: [] }),
    state.on ? nudgesOf(user.id, 6) : Promise.resolve([]),
    state.on ? openActions(user.id).catch(() => null) : Promise.resolve(null),
    stageOf(user.id),
  ]);
  const major = core ? (en ? majorNameIn(core, "en") : await activeMajorName(user.id)) : null;
  const postings = live.rows;
  const brief = state.on ? buildBrief({
    core: live.core, postings, exps: live.exps,
    actions: open?.rows ?? [], fromResult: open?.fromResult ?? false, lang,
  }) : null;
  /* **이번 주 할 일을 그 사람의 말로 다시 읽는다.** 담긴 줄의 `body` 는 담을
     때의 한국어 문장이다. 영어 작업공간에서는 `/me/next` 처럼 굳은 결과에서 같은
     할 일을 찾아 영어 문장으로 적고, 못 찾으면 담긴 문장을 그대로 둔다 */
  if (en && brief?.task && open?.model) {
    const row = (open.rows ?? []).find((r) => r.body === brief.task!.body);
    /* 굳은 결과는 한국어 원고로 들어 있다. 할 일의 재료(결과물 이름 · 비교 대상)도
       그래서 한국어라, `/me/next` 처럼 모델을 먼저 영어로 읽어 넘긴다 */
    const model = core ? localizeResult(open.model, core, "en") : open.model;
    const x = row ? model.actions.find((a) =>
      (a.domain ?? "") === (row.td_code ?? "") && (a.axis ?? "") === (row.axis_code ?? "")) : null;
    if (x && core) {
      brief.task.body = textFor("en").actionKo(
        x, x.domain ? domainName(core, x.domain, "en") : "", model.stage).do;
    }
  }
  /* **대학원생은 할 일이 비어도 빈칸으로 두지 않는다.** 연구 기록이 하나도
     없으면 학위 연구 하나를 적는 것이 이번 주 할 일이다 */
  if (brief && !brief.task) {
    const g = gradWeekTask(stage ?? "bachelor", live.exps, lang);
    if (g) brief.task = { body: g, state: "open", saved: true };
  }
  const cards = state.on && isGrad(stage) ? researchCards(stage, live.exps, lang) : [];
  const STAGE_KO: Record<string, string> = { master: "석사", phd: "박사", postdoc: "박사후연구원" };
  const sale = prods.filter((p): p is NonNullable<typeof p> => !!p);
  /* **값이 정해지지 않은 기간권은 사는 단추를 세우지 않는다.** 해외판이
     그렇다. 줄이 있다고 단추를 그리면 0원 결제로 보인다 */
  const priced = sale.filter((p) => p.price_status === "approved" && p.amount > 0);
  const p30 = priced.find((p) => p.duration_days === 30);
  const p365 = priced.find((p) => p.duration_days === 365);
  /* 1년치를 30일권으로 사면 얼마인지와 견준다. **지어낸 할인율이 아니고**
     두 상품의 값으로 그 자리에서 센 수다 */
  const save = p30 && p365 ? p30.amount * 12 - p365.amount : 0;
  /* 영어 작업공간은 AI 로 보내지 않는다: 영문 개인정보처리방침이 아직 없다 */
  const ai = !en && aiReady() && Boolean(settings.ai_consent_at);
  const pushKey = pushKeys()?.publicKey ?? null;
  const unread = nudges.filter((n) => !n.read_at).length;
  const fail = sp.e && FAIL[sp.e] ? t(FAIL[sp.e]) : null;

  return (
    <CmShell active="/me/track" title="MAT" major={major ?? undefined} lang={lang}>
      <CmHead
        kicker={state.on ? t("AI 취업비서 · 이용 중") : t("AI 취업비서")}
        title="MAT"
        lead={t("지원하는 동안 한 주씩 챙기는 취업비서입니다. 매주 브리핑에 가까운 마감, 이번 주 할 일 하나, 여러 공고가 함께 요구하는데 아직 비어 있는 것을 모읍니다. 공고마다 내 경험을 맞대 보고, 지원서 문장 뼈대를 내 기록으로 엮습니다. 지원은 직접 하시고, 자동으로 결제되지 않습니다.")}
      />

      {fail ? <p className="cm-fail" role="alert">{fail}</p> : null}
      {sp.trial === "1" ? (
        <p className="cm-none" role="status" style={{ marginBottom: 12 }}>
          {state.on ? t("첫 1개월이 열렸습니다.") : t("이미 받으셨거나 받을 수 있는 결제가 없습니다.")}
        </p>
      ) : null}

      {/* **결과가 없으면 여기서 시작한다.** 사는 단추보다 먼저 세운다 */}
      {!ready && !state.on ? (
        <>
          <SectionHeader icon="target" title={t("먼저 무료 검사부터")} />
          <div className="cm-panel is-one is-lead">
            <div className="cm-pane">
              <p className="cm-row">
                <b>{t("MAT 은 검사 결과에서 시작합니다")}</b>
                <span>{t("이번 주 할 일, 공고 맞대기, 지원서 문장 뼈대가 모두 검사에서 확인된 내 경험과 부족한 부분을 읽습니다. 무료 검사는 12분 정도 걸리고, 끝나면 이 화면에서 바로 MAT 을 시작할 수 있습니다.")}</span>
              </p>
              <div className="cm-acts">
                <Link className="cm-btn is-primary" href="/cores">{t("무료 검사 시작")}</Link>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {brief ? <BriefPanel brief={brief} lang={lang} /> : null}

      <SectionHeader icon="clock" title={t("지금 상태")} />
      <div className="cm-panel is-one">
        <div className="cm-pane">
          {state.on && state.until ? (
            <p className="cm-row">
              <b>{t("{date}까지 열려 있습니다", { date: day(state.until) })}</b>
              <span>{t(NAME[state.product ?? ""] ?? "기간권")}{state.queued ? t(" · 이어서 산 기간 포함") : ""}</span>
            </p>
          ) : (
            <p className="cm-row">
              <b>{t("열려 있지 않습니다")}</b>
              <span>{ready ? t("아래에서 기간권을 고르시면 바로 열립니다.") : t("무료 검사를 마치면 기간권을 고를 수 있습니다.")}</span>
            </p>
          )}
          {claimable ? (
            <form action={claimTrial} className="cm-acts">
              <span className="cm-none">{t("PRO 결과지를 사셨습니다. 첫 1개월을 받으실 수 있습니다.")}</span>
              <button className="cm-btn is-primary" type="submit">{t("첫 1개월 받기")}</button>
            </form>
          ) : null}
        </div>
      </div>

      {state.on ? <AssistantGuide on compact lang={lang} /> : <AssistantGuide on={false} lang={lang} />}

      {state.on ? (
        <>
          <span id="nudge" />
          <SectionHeader icon="spark" title={t("이번 주 알림")}
            sub={unread ? t("읽지 않은 알림 {n}개", { n: unread }) : t("새로 온 알림이 없습니다.")} />
          <div className="cm-panel is-one">
            <div className="cm-pane">
              <div className="cm-rows">
                {nudges.map((n) => (
                  <p className="cm-row" key={n.id}>
                    <b>{n.read_at ? "" : "● "}{n.title}</b>
                    <span>
                      {n.body}{" "}
                      {n.href ? <Link href={n.href}>{t("바로 가기")}</Link> : null}
                      {" · "}{short(n.created_at)}
                    </span>
                  </p>
                ))}
              </div>
              {unread ? (
                <form action={readAllNudges} className="cm-acts">
                  <button className="cm-btn" type="submit">{t("모두 읽음으로")}</button>
                </form>
              ) : null}
            </div>
          </div>

          <SectionHeader icon="log" title={t("공고 확인")}
            sub={t("직접 찾은 채용 공고를 붙여 넣으면 요구 항목마다 내 경험이 있는지 나눠 보여 줍니다.")} />
          <div className="cm-panel is-one" id="posting">
            <div className="cm-pane">
              <form action={addPosting} className="cm-compose">
                <label className="cm-field">
                  <span>{t("공고 이름")}</span>
                  <input className="cm-input" name="label" maxLength={80}
                    placeholder={t("예: OO전자 생산기술 신입")} />
                </label>
                <label className="cm-field">
                  <span>{t("마감일 (알면)")}</span>
                  <input className="cm-input" type="date" name="deadline" />
                </label>
                <label className="cm-field">
                  <span>{t("공고 본문")}</span>
                  <textarea className="cm-textarea" name="text" rows={8} maxLength={12000}
                    required placeholder={t("하는 일, 자격 요건, 우대 사항이 들어 있는 부분을 붙여 넣어 주세요.")} />
                </label>
                <p className="cm-none">
                  {en ? t("전공별 규칙으로 요구 항목을 뽑고, 판정은 내 결과와 경험으로 합니다.")
                    : ai ? "AI가 요구 항목을 뽑고, 판정은 내 결과와 경험으로 합니다."
                    : "지금은 규칙으로 요구 항목을 뽑습니다. 아래 설정에서 AI 분석을 켤 수 있습니다."}
                  {" "}{t("지원은 공고를 낸 곳에서 직접 하시면 됩니다.")}
                </p>
                <div className="cm-acts">
                  <button className="cm-btn is-primary" type="submit">{t("공고와 내 경험 맞대 보기")}</button>
                </div>
              </form>
              {postings.length ? (
                <div className="cm-rows" style={{ marginTop: 16 }}>
                  {postings.map((p) => {
                    const left = p.deadline ? leftDays(p.deadline) : null;
                    return (
                      <p className="cm-row" key={p.id}>
                        <b><Link href={`/me/track/posting/${p.id}`}>{p.label}</Link></b>
                        <span>
                          {left === null ? t("마감 미입력") : left < 0 ? t("마감 지남")
                            : left === 0 ? t("오늘 마감") : t("마감 {n}일 전", { n: left })}
                          {" · "}{t("설명할 경험 {n}", { n: p.analysis.counts.ready })}
                          {" · "}{t("정리 필요 {n}", { n: p.analysis.counts.partial })}
                          {" · "}{t("아직 없음 {n}", { n: p.analysis.counts.empty })}
                          {p.state === "applied" ? t(" · 지원함") : p.state === "closed" ? t(" · 닫음") : ""}
                          {p.deadline && left !== null && left >= 0 ? (
                            <>{" · "}<a href={`/me/track/calendar?id=${p.id}`} download>{t("달력에 넣기")}</a></>
                          ) : null}
                        </span>
                      </p>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <SectionHeader icon="check" title={t("경험 채우기")}
            sub={t("최근에 한 일을 편하게 적으면 경험 추가 화면의 보기로 옮겨 드립니다. 저장은 직접 하십니다.")} />
          {/* 파일 올리기는 국내 개인정보 동의로 열었다. 영어판에는 세우지 않는다 */}
          {!en ? (
            <p className="cm-none" style={{ marginBottom: 12 }}>
              성적증명서·수료증·상장 파일은{" "}
              <Link href="/me/experience/new#upload">경험 추가 화면</Link>에 끌어다 놓으면 옮겨 드립니다(한 달 10건).
            </p>
          ) : null}
          <div className="cm-panel is-one" id="draft">
            <div className="cm-pane">
              <form action={makeDraft} className="cm-compose">
                <label className="cm-field">
                  <span>{t("메모")}</span>
                  <textarea className="cm-textarea" name="note" rows={5} maxLength={1500} required
                    placeholder={t("예: 마케팅원론 팀 과제에서 20대 대상 설문 문항을 짰고, 응답 120개를 엑셀로 정리해 발표했다.")} />
                </label>
                <div className="cm-acts">
                  <button className="cm-btn is-primary" type="submit">{t("경험 기록으로 옮기기")}</button>
                </div>
              </form>
            </div>
          </div>

          {isGrad(stage) ? (
            <>
              <span id="research" />
              <SectionHeader icon="doc" title={t("연구 경험을 직무 말로")}
                sub={t("검사에서 {stage} 단계로 답하셨습니다. 연구·논문 기록마다 지원서 문장 뼈대와, 이 단계에서 먼저 적어 둘 한 줄을 붙였습니다.", { stage: t(STAGE_KO[stage!] ?? "") })} />
              {cards.length ? (
                <div className="cm-panel">
                  {cards.map((c) => (
                    <div className="cm-pane" key={c.experience.id}>
                      <h3>
                        <Link href={`/me/experience/${encodeURIComponent(c.experience.id)}/edit`}>{c.experience.title}</Link>
                      </h3>
                      <p className="cm-draft">{c.sentences.join(" ")}</p>
                      <p className="cm-none">{c.focus}</p>
                      {c.blanks.length ? (
                        <p className="cm-none">{t("대괄호 칸 {n}개는 기록을 고쳐 채우면 다음에 채워져 나옵니다.", { n: c.blanks.length })}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cm-panel is-one">
                  <div className="cm-pane">
                    <p className="cm-row">
                      <b>{t("연구 기록이 아직 없습니다")}</b>
                      <span>{t("학위 연구나 참여한 과제, 쓴 논문을 하나 적어 두면 여기서 지원서 문장 뼈대가 만들어집니다. 연구직 공고의 논문 · 특허 · 과제 요구도 이 기록과 맞대 봅니다.")}</span>
                    </p>
                    <div className="cm-acts">
                      <Link className="cm-btn is-primary" href="/me/experience/new?kind=research">{t("연구·실험 기록 적기")}</Link>
                      <Link className="cm-btn" href="/me/experience/new?kind=paper">{t("논문·학회 기록 적기")}</Link>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}

          <SectionHeader icon="box" title={t("함께 열리는 것")} />
          <div className="cm-panel is-one">
            <div className="cm-pane">
              <div className="cm-rows">
                <p className="cm-row">
                  <b><Link href="/me/explore">{t("관심 산업·직무 바꿔 다시 비교하기")}</Link></b>
                  <span>{t("산업과 직무를 둘씩 골라 그쪽 기준으로 내 경험을 다시 봅니다.")}</span>
                </p>
                {/* 지원 기록은 국내 공고와 이어진 쪽이다(`WS_KR_ONLY`) */}
                {!en ? (
                  <p className="cm-row">
                    <b><Link href="/me/apply">지원한 곳과 내 근거 나란히 보기</Link></b>
                    <span>적어 두신 지원 직무마다 설명할 수 있는 영역과 비어 있는 영역을 가릅니다.</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <SectionHeader icon="clock" title={t("설정")} />
          <div className="cm-panel is-one" id="settings">
            <div className="cm-pane">
              {!en ? (
                <>
                  <p className="cm-row">
                    <b>AI 분석 {settings.ai_consent_at ? "켜짐" : "꺼짐"}</b>
                    <span>
                      켜면 붙여 넣은 공고와 메모가 Anthropic(미국)의 Claude로 보내져 읽힙니다.
                      이름과 연락처는 보내지 않습니다. 끄면 규칙으로만 읽고 밖으로 보내지 않습니다.
                      {aiReady() ? "" : " 지금은 서비스 쪽 설정이 끝나지 않아 켜도 규칙으로 읽습니다."}
                    </span>
                  </p>
                  <form action={changeConsent} className="cm-acts">
                    <input type="hidden" name="on" value={settings.ai_consent_at ? "0" : "1"} />
                    <button className="cm-btn" type="submit">
                      {settings.ai_consent_at ? "AI 분석 끄기" : "동의하고 AI 분석 켜기"}
                    </button>
                  </form>
                  <p className="cm-row" style={{ marginTop: 12 }}>
                    <b>파일 읽기 {settings.file_consent_at ? "켜짐" : "꺼짐"}</b>
                    <span>
                      켜면 올린 파일이 Anthropic(미국)의 Claude로 보내져 읽힙니다. 파일에 적힌 이름·학번·
                      생년월일도 함께 보내집니다. 원본 파일은 읽은 뒤 바로 버립니다.
                    </span>
                  </p>
                  <form action={changeFileConsent} className="cm-acts">
                    <input type="hidden" name="on" value={settings.file_consent_at ? "0" : "1"} />
                    <button className="cm-btn" type="submit">
                      {settings.file_consent_at ? "파일 읽기 끄기" : "동의하고 파일 읽기 켜기"}
                    </button>
                  </form>
                </>
              ) : (
                <p className="cm-row">
                  <b>{t("공고와 메모는 밖으로 보내지 않습니다")}</b>
                  <span>{t("붙여 넣은 공고와 메모는 이 서비스 안에서 전공별 규칙으로 읽습니다.")}</span>
                </p>
              )}
              <p className="cm-row" style={{ marginTop: 12 }}>
                <b>{settings.email_digest ? t("주간 알림 메일 받음") : t("주간 알림 메일 받지 않음")}</b>
                <span>{t("한 주에 한 통이고, 할 일과 공고 이름은 메일에 적지 않습니다.")}</span>
              </p>
              <form action={changeDigest} className="cm-acts">
                <input type="hidden" name="on" value={settings.email_digest ? "0" : "1"} />
                <button className="cm-btn" type="submit">
                  {settings.email_digest ? t("메일 끄기") : t("메일로도 받기")}
                </button>
              </form>
              {/* 기기 알림(PWA). 열쇠(VAPID)가 없으면 서지 않는다(`push.ts`) */}
              {pushKey ? <PushToggle publicKey={pushKey} /> : null}
            </div>
          </div>
        </>
      ) : null}

      {ready || state.on ? (
        priced.length ? (
          <>
            <SectionHeader icon="box" title={state.on ? t("기간 늘리기") : t("기간권 고르기")}
              sub={state.on ? t("지금 기간이 끝나는 날에서 이어 붙습니다.") : t("PRO 결과지를 사시면 첫 1개월이 함께 열립니다.")} />
            <div className="cm-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              {priced.map((p) => (
                <div className="cm-panel is-one" key={p.code}>
                  <div className="cm-pane">
                    <p className="cm-row">
                      <b>{t(NAME[p.code] ?? "기간권")}</b>
                      <span>{formatMoney(p.amount, p.currency, en ? "en" : "ko") ?? "—"}{t(" · 한 번 결제 · 부가세 포함")}</span>
                    </p>
                    <p className="cm-none">
                      {p.duration_days === 365 && save > 0
                        ? t("30일권을 열두 번 사는 것보다 {amount} 적습니다.", {
                          amount: formatMoney(save, p.currency, en ? "en" : "ko") ?? "" })
                        : t("한 달만 써 보고 정해도 됩니다.")}
                    </p>
                    <div className="cm-acts">
                      {/* 가격표와 같은 물음이다(`payOpen`). 결제 대행사가 서기 전에는
                          누를 수 없는 단추로 그 사실만 적는다 */}
                      {payOpen(p.currency === "KRW" ? "KR" : "GLOBAL") ? (
                        <Link className={`cm-btn${p.duration_days === 365 ? " is-primary" : ""}`}
                          href={`/checkout?product=${encodeURIComponent(p.code)}`}>
                          {state.on ? t("이어서 사기") : t("결제하기")}
                        </Link>
                      ) : (
                        <span className="cm-btn" aria-disabled="true">{t("결제 준비 중")}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : en && !state.on ? (
          /* 해외판 값이 아직 승인되지 않았다. 0원을 그리지 않고 그 사실을 적는다 */
          <>
            <SectionHeader icon="box" title={t("기간권 고르기")} />
            <div className="cm-panel is-one">
              <div className="cm-pane">
                <p className="cm-row">
                  <b>{t("해외 요금을 준비하고 있습니다")}</b>
                  <span>{t("한국 밖에서 결제하는 기간권은 곧 열립니다. 그동안 검사 결과와 내 CareerMatri 는 그대로 쓰실 수 있습니다.")}</span>
                </p>
              </div>
            </div>
          </>
        ) : null
      ) : null}

      {history.length ? (
        <>
          <SectionHeader icon="log" title={t("이용 기록")} />
          <div className="cm-tablewrap">
            <table className="cm-table">
              <thead>
                <tr><th>{t("기간권")}</th><th>{t("시작")}</th><th>{t("끝")}</th><th>{t("주문")}</th></tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={`${h.order_no ?? "t"}-${i}`}>
                    <td><b>{t(NAME[h.product_code] ?? h.product_code)}</b></td>
                    <td>{day(h.starts_at)}</td>
                    <td>{day(h.ends_at)}</td>
                    <td>{h.order_no ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </CmShell>
  );
}
