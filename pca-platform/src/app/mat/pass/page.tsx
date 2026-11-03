import Link from "next/link";
import { AI_TOOLS_OPEN_KO } from "@/lib/mat/open-dates";
import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { activeTrack, trackOffers } from "@/lib/track";
import { payOpen } from "@/lib/payments";
import { university } from "@/lib/campus/registry";
import { campusStudentContext } from "@/lib/campus/students";
import { withJosa } from "@/lib/me-v3/result/josa";
import { CONSULT_OPENS_KO } from "@/lib/mat/open-dates";

export const generateMetadata = () => matTitle("이용권");

/**
 * 이용권(예상 화면 6번, 2026-11-01 대표 결정: 하나의 MAT, 두 가지 이용권).
 *
 * - **학교 칸이 먼저다.** 학교 좌석이 열려 있으면 결제 없이 쓴다는 것과 언제까지인지. 학교 코드를
 *   적는 칸은 두지 않는다(대표 결정 사-3: 코드만 알면 남이 좌석을 쓸 수 있다). 학교에서 받은
 *   계정으로 로그인하면 이어진다
 * - 개인 이용권은 30 · 90일, 90일이 기본. 값은 `products` 에서 읽는다(화면과 결제 값이 갈리지 않게)
 * - **결제가 열리기 전에는 사는 단추를 끈다**(`payOpen`). 누를 수 없는 결제 화면으로 보내지 않는다
 * - 들어 있는 것은 **지금 되는 것만 된다고 적는다.** 아직 만들고 있는 것은 `준비 중`
 */
export default async function MatPass() {
  const user = await requireUser();
  const [state, offers, campus] = await Promise.all([
    activeTrack(user.id),
    trackOffers("KR"),
    campusStudentContext(user.id).catch(() => null),
  ]);
  const open = payOpen("KR");
  const day = (s: string) => s.slice(0, 10);
  const school = state.source?.kind === "school"
    ? (university(state.source.university)?.university_name ?? "학교")
    : null;
  const o30 = offers.find((o) => o.days === 30) ?? null;
  const o90 = offers.find((o) => o.days === 90) ?? null;
  const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

  return (
    <main>
      <div className="mt-top"><span className="mt-week">이용권</span></div>
      <h1 className="mt-h1">이용권</h1>

      {state.on && state.until ? (
        <p className="mt-lead">
          {school ? `${school} 제공` : "개인 이용권"} · {day(state.until)}까지
          {state.queued ? " · 이어서 산 기간 포함" : ""}
        </p>
      ) : null}

      <section className={`mt-box is-school`}>
        <h3>학교에서 검사를 받았나요?</h3>
        {school && state.source?.kind === "school" ? (
          <p>{withJosa(school, "이가")} 열어 준 MAT으로 쓰고 있어요. {day(state.source.until)}까지이고, 끝나도 개인 이용권으로 이어 쓸 수 있어요. 자료는 그대로 남아요.</p>
        ) : campus ? (
          <p>{campus.university_name} 계정이에요. 학교가 MAT을 열어 주면 결제 없이 바로 쓸 수 있어요.</p>
        ) : (
          <ul>
            <li>학교가 MAT을 열어 주면 결제 없이 써요.</li>
            <li>학교에서 받은 계정으로 로그인하면 이어져요.</li>
          </ul>
        )}
      </section>

      <h2 className="mt-h2">개인으로 쓰기</h2>
      {o30 || o90 ? (
        <form action="/checkout" method="get">
          <fieldset className="mt-opts">
            <legend className="mt-meta" style={{ marginBottom: 8 }}>자동 연장 없음 · 기간이 끝나면 닫혀요</legend>
            {o30 ? (
              <label className="mt-opt">
                <input type="radio" name="product" value={o30.code} />
                <span><b>30일</b>한 번 지원해 볼 때</span>
                <span className="mt-price">{won(o30.amount)}</span>
              </label>
            ) : null}
            {o90 ? (
              <label className="mt-opt">
                <input type="radio" name="product" value={o90.code} defaultChecked />
                <span><b>90일</b>약 석 달 · 한 달 {won(Math.round(o90.amount / 3 / 100) * 100)}꼴</span>
                <span className="mt-price">{won(o90.amount)}</span>
              </label>
            ) : null}
          </fieldset>
          <div style={{ marginTop: 12 }}>
            {open ? (
              <button type="submit" className="mt-btn is-main is-block">이 기간으로 결제하기</button>
            ) : (
              <button type="button" className="mt-btn is-block" disabled aria-disabled="true">결제 준비 중</button>
            )}
          </div>
          {state.on && open ? (
            <p className="mt-note">지금 기간이 끝난 다음 날부터 이어져요.</p>
          ) : null}
          {/* 결제 단추 곁에 청약철회 · 환불 조건이 있는 자리를 둔다(전자상거래법 제13조 제2항, 2026-11-03 MAT 시험 M3) */}
          <p className="mt-note">
            결제 전에 <Link href="/legal/refund">환불정책</Link>(청약철회 · 환불 조건)과 <Link href="/legal/terms">이용약관</Link>을 확인해 주세요.
          </p>
        </form>
      ) : (
        <p className="mt-empty">지금 살 수 있는 이용권이 없어요.</p>
      )}

      <h2 className="mt-h2">들어 있는 것</h2>
      <ul className="mt-incl">
        <li>맞는 공고<span>내 경험과 겹치는 공고 · 마감순</span></li>
        {/* 지금 되는 것만 된다고 적는다(2026-11-03 MAT 시험 M1: 이 줄은 '준비 중', 지원서 화면은 '만들어 드려요') */}
        <li>지원서 문장 뼈대 · 나올 면접 질문<span>분석한 공고의 필수 요건마다 내 경험으로</span></li>
        <li>문장 고치기 · 면접 연습 · 질문하기<span>{AI_TOOLS_OPEN_KO}부터 · 한 달 문장 10번 · 면접 연습 3번(번마다 8턴)</span></li>
        <li>주간 브리핑 · 마감 알림<span>메일 · 웹 알림</span></li>
        <li>경험 즉시 반영<span>적으면 할 일과 공고가 바로 바뀜</span></li>
        <li>커리어피크 상담 연결<span>{CONSULT_OPENS_KO}부터</span></li>
      </ul>
    </main>
  );
}
