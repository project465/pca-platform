import Link from "next/link";

/** KUS 담당자가 아닌 사람이 담당자 화면에 온 자리. 누구인지 · 왜인지 적지 않는다 */
export default function KusDenied() {
  return (
    <div className="kus-admin">
      <header className="kus-head" style={{ maxWidth: 560 }}>
        <h1 className="kus-h1">이 화면은 볼 수 없어요</h1>
        <p className="kus-lead">고려대학교 세종캠퍼스 담당자 계정으로만 열려요.</p>
        <div className="kus-actions kus-head-acts"><Link className="kus-btn" href="/kus">홈으로</Link></div>
      </header>
    </div>
  );
}
