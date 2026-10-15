"use client";

import Link from "next/link";

/**
 * 담당자가 보는 오류 화면(규격 §21).
 *
 * 뿌리의 오류 화면은 나갈 길로 `내 CareerMatri` 를 내주는데, **담당자에게
 * 그 자리는 자기 화면이 아니다.** 그 길을 누른 담당자는 학생 화면에 떨어져
 * 자기가 보던 집계로 돌아오는 길을 다시 찾는다.
 *
 * **안쪽 사정을 적지 않는다**: 표 이름도 질의도 적지 않고 되짚을 번호만
 * 적는다. 그 번호로 운영 로그에서 같은 줄을 찾는다.
 */
export default function OrgError(
  { error, reset }: { error: Error & { digest?: string }; reset: () => void },
) {
  return (
    <main className="sf-fail">
      <h1>화면을 불러오지 못했습니다</h1>
      <p>
        잠깐 생긴 문제일 수 있습니다. 다시 해 보셔도 같으면 아래 고객지원으로
        알려주세요. <b>학생의 응시와 결과는 그대로 있습니다.</b>
      </p>
      {error.digest ? <p className="sf-fail-ref">참조 번호 {error.digest}</p> : null}
      <div className="sf-fail-acts">
        <button type="button" onClick={reset}>다시 해 보기</button>
        <Link href="/org/v3">전공 진단 집계</Link>
        <Link href="/org/v3/students">학생 관리</Link>
        <Link href="/support">고객지원</Link>
      </div>
    </main>
  );
}
