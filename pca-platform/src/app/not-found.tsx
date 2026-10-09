import Link from "next/link";

/**
 * 없는 주소.
 *
 * **빈 화면으로 두지 않는다**(규격 §39). 명함과 메일에 적혀 나간 옛 주소가
 * 있어서, 여기 닿는 사람은 길을 잃은 것이지 잘못한 것이 아니다.
 */
export const metadata = { title: "없는 쪽입니다 · CareerMatri" };

export default function NotFound() {
  return (
    <main className="sf-fail">
      <h1>없는 쪽입니다</h1>
      <p>
        주소가 바뀌었거나 지워진 쪽입니다. 아래에서 가시려던 자리를 찾으실 수
        있습니다.
      </p>
      <div className="sf-fail-acts">
        <Link href="/me">내 CareerMatri</Link>
        <Link href="/cores">검사</Link>
        <Link href="/support">고객지원</Link>
      </div>
    </main>
  );
}
