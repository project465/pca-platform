import Link from "next/link";
import { requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { getProduct } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import {
  TRACK_PRODUCTS, TRACK_TRIAL, activeTrack, proTrialClaimable, trackHistory,
} from "@/lib/track";
import { aiReady } from "@/lib/assistant/claude";
import { settingsOf } from "@/lib/assistant/settings";
import { postingsOf } from "@/lib/assistant/posting";
import { nudgeUser, nudgesOf } from "@/lib/assistant/nudges";
import { CmShell, CmHead } from "../shell";
import { AssistantGuide } from "./guide";
import { SectionHeader } from "../ui";
import {
  addPosting, changeConsent, changeDigest, changeFileConsent, claimTrial, makeDraft, readAllNudges,
} from "./actions";

export const metadata = { title: "MAT · AI 취업비서" };

/**
 * MAT · 내 구독.
 *
 * **하는 일은 셋이다.** 매주 할 일 하나를 먼저 알려 주고, 적어 주신 메모를
 * 경험 기록으로 옮겨 주고, 직접 찾아 붙여 넣은 공고를 내 경험과 맞대어
 * 준다. 셋 다 결과지가 이미 정한 판정 위에서 돌고 **점수를 새로 만들지
 * 않는다**(설계 원칙 6).
 *
 * **공고를 우리가 고르지 않는다.** 사용자가 찾은 공고를 붙여 넣고, 지원도
 * 그 사람이 직접 한다(CLAUDE.md 법적 범위). 그래서 이 화면에 `추천 기업`
 * 이 서지 않는다.
 *
 * **기간권이다.** 30일권과 365일권을 한 번씩 팔고 자동으로 갱신하지 않는다.
 * 기간이 끝나면 저절로 닫히고 카드가 다시 긁히지 않는다.
 */

const day = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric",
  }).format(new Date(iso));

const short = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric",
  }).format(new Date(iso));

/** 마감까지 남은 날. 한국 날짜로 센다 */
function leftDays(deadline: string): number {
  const today = new Date(new Date().getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  return Math.round((Date.parse(deadline) - Date.parse(today)) / 86400_000);
}

const NAME: Record<string, string> = {
  TRACK_30D: "30일권",
  TRACK_365D: "365일권",
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
};

export default async function Track({
  searchParams,
}: {
  searchParams: Promise<{ trial?: string; e?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const state = await activeTrack(user.id);
  /* 이번 주 한 줄이 아직 없으면 지금 만든다. **밤 당번을 기다리게 하지
     않는다**: 기간권을 막 산 사람이 빈 알림 칸을 본다 */
  if (state.on) await nudgeUser(user.id).catch(() => undefined);
  const [major, history, claimable, prods, settings, postings, nudges] = await Promise.all([
    activeMajorName(user.id),
    trackHistory(user.id),
    proTrialClaimable(user.id),
    Promise.all(TRACK_PRODUCTS.map((c) => getProduct(c))),
    settingsOf(user.id),
    state.on ? postingsOf(user.id) : Promise.resolve([]),
    state.on ? nudgesOf(user.id, 6) : Promise.resolve([]),
  ]);
  const sale = prods.filter((p): p is NonNullable<typeof p> => !!p);
  const p30 = sale.find((p) => p.code === "TRACK_30D");
  const p365 = sale.find((p) => p.code === "TRACK_365D");
  /* 1년치를 30일권으로 사면 얼마인지와 견준다. **지어낸 할인율이 아니고**
     두 상품의 값으로 그 자리에서 센 수다 */
  const save = p30 && p365 ? p30.amount * 12 - p365.amount : 0;
  const ai = aiReady() && Boolean(settings.ai_consent_at);
  const unread = nudges.filter((n) => !n.read_at).length;

  return (
    <CmShell active="/me/track" title="MAT" major={major}>
      <CmHead
        kicker={state.on ? "AI 취업비서 · 이용 중" : "AI 취업비서"}
        title="MAT"
        lead={"검사 결과를 받은 뒤 지원하는 동안 매주 옆에서 챙깁니다. "
          + "이번 주 할 일을 먼저 알리고, 메모를 경험 기록으로 옮기고, "
          + "직접 찾은 공고에서 내 경험이 비어 있는 부분을 짚어 줍니다. 자동으로 결제되지 않습니다."}
      />

      {sp.e && FAIL[sp.e] ? (
        <p className="cm-fail" role="alert">{FAIL[sp.e]}</p>
      ) : null}
      {sp.trial === "1" ? (
        <p className="cm-none" role="status" style={{ marginBottom: 12 }}>
          {state.on ? "첫 1개월이 열렸습니다." : "이미 받으셨거나 받을 수 있는 결제가 없습니다."}
        </p>
      ) : null}

      <SectionHeader icon="clock" title="지금 상태" />
      <div className="cm-panel is-one">
        <div className="cm-pane">
          {state.on && state.until ? (
            <p className="cm-row">
              <b>{day(state.until)}까지 열려 있습니다</b>
              <span>{NAME[state.product ?? ""] ?? "기간권"}{state.queued ? " · 이어서 산 기간 포함" : ""}</span>
            </p>
          ) : (
            <p className="cm-row">
              <b>열려 있지 않습니다</b>
              <span>아래에서 기간권을 고르시면 바로 열립니다.</span>
            </p>
          )}
          {claimable ? (
            <form action={claimTrial} className="cm-acts">
              <span className="cm-none">PRO 결과지를 사셨습니다. 첫 1개월을 받으실 수 있습니다.</span>
              <button className="cm-btn is-primary" type="submit">첫 1개월 받기</button>
            </form>
          ) : null}
        </div>
      </div>

      {state.on ? <AssistantGuide on compact /> : <AssistantGuide on={false} />}

      {state.on ? (
        <>
          <span id="nudge" />
          <SectionHeader icon="spark" title="이번 주 알림"
            sub={unread ? `읽지 않은 알림 ${unread}개` : "새로 온 알림이 없습니다."} />
          <div className="cm-panel is-one">
            <div className="cm-pane">
              <div className="cm-rows">
                {nudges.map((n) => (
                  <p className="cm-row" key={n.id}>
                    <b>{n.read_at ? "" : "● "}{n.title}</b>
                    <span>
                      {n.body}{" "}
                      {n.href ? <Link href={n.href}>바로 가기</Link> : null}
                      {" · "}{short(n.created_at)}
                    </span>
                  </p>
                ))}
              </div>
              {unread ? (
                <form action={readAllNudges} className="cm-acts">
                  <button className="cm-btn" type="submit">모두 읽음으로</button>
                </form>
              ) : null}
            </div>
          </div>

          <SectionHeader icon="log" title="공고 확인"
            sub="직접 찾은 채용 공고를 붙여 넣으면 요구 항목마다 내 경험이 있는지 나눠 보여 줍니다." />
          <div className="cm-panel is-one" id="posting">
            <div className="cm-pane">
              <form action={addPosting} className="cm-compose">
                <label className="cm-field">
                  <span>공고 이름</span>
                  <input className="cm-input" name="label" maxLength={80}
                    placeholder="예: OO전자 생산기술 신입" />
                </label>
                <label className="cm-field">
                  <span>마감일 (알면)</span>
                  <input className="cm-input" type="date" name="deadline" />
                </label>
                <label className="cm-field">
                  <span>공고 본문</span>
                  <textarea className="cm-textarea" name="text" rows={8} maxLength={12000}
                    required placeholder="하는 일, 자격 요건, 우대 사항이 들어 있는 부분을 붙여 넣어 주세요." />
                </label>
                <p className="cm-none">
                  {ai ? "AI가 요구 항목을 뽑고, 판정은 내 결과와 경험으로 합니다."
                    : "지금은 규칙으로 요구 항목을 뽑습니다. 아래 설정에서 AI 분석을 켤 수 있습니다."}
                  {" "}지원은 공고를 낸 곳에서 직접 하시면 됩니다.
                </p>
                <div className="cm-acts">
                  <button className="cm-btn is-primary" type="submit">공고와 내 경험 맞대 보기</button>
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
                          {left === null ? "마감 미입력" : left < 0 ? "마감 지남"
                            : left === 0 ? "오늘 마감" : `마감 ${left}일 전`}
                          {" · "}설명할 경험 {p.analysis.counts.ready} · 정리 필요 {p.analysis.counts.partial}
                          {" · "}아직 없음 {p.analysis.counts.empty}
                          {p.state === "applied" ? " · 지원함" : p.state === "closed" ? " · 닫음" : ""}
                        </span>
                      </p>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <SectionHeader icon="check" title="경험 채우기"
            sub="최근에 한 일을 편하게 적으면 경험 추가 화면의 보기로 옮겨 드립니다. 저장은 직접 하십니다." />
          <p className="cm-none" style={{ marginBottom: 12 }}>
            성적증명서·수료증·상장 파일은{" "}
            <Link href="/me/experience/new#upload">경험 추가 화면</Link>에 끌어다 놓으면 옮겨 드립니다(한 달 10건).
          </p>
          <div className="cm-panel is-one" id="draft">
            <div className="cm-pane">
              <form action={makeDraft} className="cm-compose">
                <label className="cm-field">
                  <span>메모</span>
                  <textarea className="cm-textarea" name="note" rows={5} maxLength={1500} required
                    placeholder="예: 마케팅원론 팀 과제에서 20대 대상 설문 문항을 짰고, 응답 120개를 엑셀로 정리해 발표했다." />
                </label>
                <div className="cm-acts">
                  <button className="cm-btn is-primary" type="submit">경험 기록으로 옮기기</button>
                </div>
              </form>
            </div>
          </div>

          <SectionHeader icon="box" title="함께 열리는 것" />
          <div className="cm-panel is-one">
            <div className="cm-pane">
              <div className="cm-rows">
                <p className="cm-row">
                  <b><Link href="/me/explore">관심 산업·직무 바꿔 다시 비교하기</Link></b>
                  <span>산업과 직무를 둘씩 골라 그쪽 기준으로 내 경험을 다시 봅니다.</span>
                </p>
                <p className="cm-row">
                  <b><Link href="/me/apply">지원한 곳과 내 근거 나란히 보기</Link></b>
                  <span>적어 두신 지원 직무마다 설명할 수 있는 영역과 비어 있는 영역을 가릅니다.</span>
                </p>
              </div>
            </div>
          </div>

          <SectionHeader icon="clock" title="설정" />
          <div className="cm-panel is-one" id="settings">
            <div className="cm-pane">
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
              <p className="cm-row" style={{ marginTop: 12 }}>
                <b>주간 알림 메일 {settings.email_digest ? "받음" : "받지 않음"}</b>
                <span>한 주에 한 통이고, 할 일과 공고 이름은 메일에 적지 않습니다.</span>
              </p>
              <form action={changeDigest} className="cm-acts">
                <input type="hidden" name="on" value={settings.email_digest ? "0" : "1"} />
                <button className="cm-btn" type="submit">
                  {settings.email_digest ? "메일 끄기" : "메일로도 받기"}
                </button>
              </form>
            </div>
          </div>
        </>
      ) : null}

      {sale.length ? (
        <>
          <SectionHeader icon="box" title={state.on ? "기간 늘리기" : "기간권 고르기"}
            sub={state.on ? "지금 기간이 끝나는 날에서 이어 붙습니다." : "PRO 결과지를 사시면 첫 1개월이 함께 열립니다."} />
          <div className="cm-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {sale.map((p) => (
              <div className="cm-panel is-one" key={p.code}>
                <div className="cm-pane">
                  <p className="cm-row">
                    <b>{NAME[p.code]}</b>
                    <span>{formatMoney(p.amount, p.currency, "ko") ?? "—"} · 한 번 결제 · 부가세 포함</span>
                  </p>
                  <p className="cm-none">
                    {p.code === "TRACK_365D" && save > 0
                      ? `30일권을 열두 번 사는 것보다 ${formatMoney(save, p.currency, "ko")} 적습니다.`
                      : "한 달만 써 보고 정해도 됩니다."}
                  </p>
                  <div className="cm-acts">
                    <Link className={`cm-btn${p.code === "TRACK_365D" ? " is-primary" : ""}`}
                      href={`/checkout?product=${encodeURIComponent(p.code)}`}>
                      {state.on ? "이어서 사기" : "결제하기"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {history.length ? (
        <>
          <SectionHeader icon="log" title="이용 기록" />
          <div className="cm-tablewrap">
            <table className="cm-table">
              <thead>
                <tr><th>기간권</th><th>시작</th><th>끝</th><th>주문</th></tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={`${h.order_no ?? "t"}-${i}`}>
                    <td><b>{NAME[h.product_code] ?? h.product_code}</b></td>
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
