import Link from "next/link";

/** KUS 담당자가 아닌 사람이 담당자 화면에 온 자리. 누구인지 · 왜인지 적지 않는다 */
export default function KusDenied() {
  return (
    <main className="cm-canvas" style={{ maxWidth: 560, margin: "60px auto", padding: 16 }}>
      <h1 className="cm-h1">이 화면을 볼 수 없습니다</h1>
      <p className="cm-lead">고려대학교 세종캠퍼스 담당자 계정으로만 열립니다.</p>
      <div className="kus-actions"><Link className="cm-btn is-primary" href="/kus">KUS 홈</Link></div>
    </main>
  );
}
