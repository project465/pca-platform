import Link from "next/link";
import { currentState, resultHistory } from "@/lib/me-v3/platform";
import { majorNameOf } from "@/lib/me-v3/major-name";
import { activeTrack } from "@/lib/track";
import { settingsOf } from "@/lib/assistant/settings";
import { pushKeys } from "@/lib/push";
import { PushToggle } from "@/components/push-toggle";
import LogoutButton from "@/components/logout-button";
import { appUser } from "../user";
import { AppHead, Empty, Row, Section } from "../ui";
import { appDigest } from "../actions";
import { MAT_PUBLIC } from "@/lib/mat-switch";

export const metadata = { title: "내 정보 · CareerMatri" };

/**
 * 내 정보. 결과 기록 · 알림 · 계정 셋이다. **결과 기록은 날짜마다 한 줄이고
 * 고쳐지지 않는다**: 검사 당시 결과와 지금 상태를 다른 줄로 세운다(웹 `결과
 * 기록` 과 같은 함수).
 */
const TIER: Record<string, string> = { BASIC: "BASIC", STANDARD: "STANDARD", PRO: "PRO" };

export default async function Profile() {
  const user = await appUser();
  const [st, hist, track, settings] = await Promise.all([
    currentState(user.id), resultHistory(user.id), activeTrack(user.id), settingsOf(user.id),
  ]);
  const pushKey = pushKeys()?.publicKey ?? null;
  const snaps = hist.filter((h) => h.kind === "SNAPSHOT");
  const now = hist.find((h) => h.kind === "CURRENT");

  return (
    <>
      <AppHead title={`${user.name}님`} kicker={(st.model ? majorNameOf(st.core) : null) ?? "내 정보"} />
      <div className="ma-body">
        <Section title="결과 기록">
          <span id="results" />
          {!snaps.length ? (
            <Empty title="아직 끝낸 검사가 없어요" cta={{ href: "/cores", label: "검사 시작" }}>
              검사를 끝내면 그날의 결과가 날짜와 함께 한 줄씩 쌓입니다.
            </Empty>
          ) : (
            <div className="ma-list">
              {now ? (
                <Row href="/me/state" icon="ladder" title="경험 반영 후 현재 상태"
                  sub={`${now.at} 반영 · 경험을 더하면 바뀝니다`} />
              ) : null}
              {snaps.map((h) => (
                <Row key={h.attempt_id} href={`/v3/${h.attempt_id}/result`} icon="report"
                  title={`검사 당시 결과 · ${TIER[h.tier ?? ""] ?? h.tier ?? ""}`}
                  sub={`${h.at}${h.domains ? ` · 근거가 확인된 영역 ${h.domains}곳` : ""} · 고정됨`} />
              ))}
            </div>
          )}
          {snaps[0]?.attempt_id ? (
            <a className="ma-btn is-block" href={`/v3/${snaps[0].attempt_id}/result/pdf`}>최근 결과지 PDF 받기</a>
          ) : null}
        </Section>

        <Section title="알림">
          <span id="settings" />
          <div className="ma-card">
            {pushKey ? <PushToggle publicKey={pushKey} /> : (
              <p className="ma-note">기기 알림은 준비 중입니다. 메일 브리핑은 지금 켤 수 있습니다.</p>
            )}
            {track.on ? (
              <form action={appDigest} style={{ marginTop: 12 }}>
                <input type="hidden" name="on" value={settings.email_digest ? "0" : "1"} />
                <button className="ma-btn is-sm" type="submit">
                  {settings.email_digest ? "메일 브리핑 끄기" : "메일 브리핑 받기"}
                </button>
              </form>
            ) : null}
          </div>
        </Section>

        <Section title="계정">
          <div className="ma-list">
            {MAT_PUBLIC || track.on ? <Row href="/m/mat" icon="spark" title="MAT 이용" sub={track.on && track.until ? `${Number(track.until.slice(5, 7))}월 ${Number(track.until.slice(8, 10))}일까지 이용 중` : "이용하지 않음"} /> : null}
            <Row href="/my" icon="user" title="계정 · 주문 · 탈퇴" />
            <Row href="/me" icon="window" title="웹 화면으로 보기" sub="넓은 화면에서 전체 메뉴로" />
            <Row href="/support" icon="alert" title="도움이 필요할 때" />
          </div>
          <LogoutButton className="ma-btn is-block" redirectTo="/m/welcome" />
        </Section>

        <p className="ma-note" style={{ textAlign: "center" }}>
          <Link href="/legal/terms">이용약관</Link> · <Link href="/legal/privacy">개인정보처리방침</Link>
        </p>
      </div>
    </>
  );
}
