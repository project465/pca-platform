/**
 * `출시 알림 신청`(2026-10-30 작업지시서 1단계 4).
 *
 * 결제가 아직 열리지 않은 자리에 누를 수 없는 `결제 준비 중` 단추를 세우면
 * 온 사람이 할 일 없이 돌아간다. 메일 주소 하나와 동의를 받아 명단에 적고,
 * 결제가 열리는 날 그 명단에 안내를 보낸다(`inquiries`, 도입 문의와 같은 표).
 *
 * **스크립트 없이 돈다.** 보통의 폼이 `/api/public/inquiry` 로 가고, 저장한
 * 뒤 이 화면으로 `?sent=1` 을 달고 돌아온다.
 */
/** 돌아온 주소의 `?sent=` · `?err=` · `?for=`. 쪽이 받은 그대로 넘긴다 */
export type NotifyQuery = { sent?: string; err?: string; for?: string };

const ERR_KO: Record<string, string> = {
  email: "메일 주소를 다시 확인해 주세요.",
  consent: "동의에 표시해 주셔야 신청됩니다.",
  busy: "잠시 뒤 다시 눌러 주세요. 짧은 시간에 신청이 많이 들어왔습니다.",
};
const ERR_EN: Record<string, string> = {
  email: "Please check the email address.",
  consent: "Please tick the consent box to sign up.",
  busy: "Please try again in a moment. Too many requests came in at once.",
};

export default function LaunchNotify({
  product, lang, email, source, q, back, compact = false,
}: {
  product: string;
  lang: "ko" | "en";
  email?: string | null;
  source: string;
  /** 돌아온 주소의 값. **이 상품의 것만 읽는다**: 한 쪽에 칸이 여럿이면
      하나에 신청한 것이 다른 칸까지 `신청했습니다` 로 바꾸면 안 된다 */
  q?: NotifyQuery;
  /** 돌아올 주소(이 화면) */
  back: string;
  compact?: boolean;
}) {
  const en = lang === "en";
  const sent = q?.sent === product;
  const err = q?.err && q.for === product
    ? (en ? ERR_EN : ERR_KO)[q.err] ?? (en ? "It didn't go through. Please try again." : "신청이 저장되지 않았습니다. 다시 눌러 주세요.")
    : null;
  if (sent) {
    return (
      <p className="ln-done" role="status">
        {en ? "You're on the list. We'll email you when payment opens."
          : "신청했습니다. 결제가 열리면 메일로 알려 드립니다."}
      </p>
    );
  }
  return (
    <form className={`ln-form${compact ? " is-compact" : ""}`} method="post" action="/api/public/inquiry">
      {err ? <p className="ln-err" role="alert">{err}</p> : null}
      <input type="hidden" name="kind" value="launch_notify" />
      <input type="hidden" name="product" value={product} />
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="t" value={String(Date.now())} />
      {/* 사람에게는 보이지 않는 칸. 무엇이든 들어 있으면 봇이다 */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
        className="ln-hp" defaultValue="" />
      <label className="ln-email">
        <span>{en ? "Email" : "메일 주소"}</span>
        <input type="email" name="email" required defaultValue={email ?? ""}
          placeholder={en ? "you@example.com" : "name@example.com"} />
      </label>
      <label className="ln-consent">
        <input type="checkbox" name="consent" value="yes" required />
        <span>
          {en ? "I agree to my email being kept for this launch notice only (deleted after 3 years)."
            : "결제 오픈 안내를 받기 위해 메일 주소를 수집·이용하는 데 동의합니다 (3년 보관 후 삭제)."}
        </span>
      </label>
      <button type="submit" className="sf-btn ghost sm">{en ? "Notify me at launch" : "출시 알림 신청"}</button>
    </form>
  );
}
