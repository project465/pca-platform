"use client";

import Link from "next/link";

/**
 * 손님이 보는 오류 화면.
 *
 * **개발용 오류 화면을 손님에게 내보내지 않는다**(규격 §39). 이 파일이
 * 없으면 Next 가 기본 화면을 내주는데, 운영 빌드에서는 그것이 흰 바탕에
 * 영문 한 줄이라 **고장 난 사이트로 읽힌다.**
 *
 * **안쪽 사정을 적지 않는다**: stack trace 도 표 이름도 적지 않고, 되짚을
 * 번호(`digest`)만 적는다. 그 번호로 운영 로그에서 같은 줄을 찾는다.
 *
 * 그리고 **나갈 길을 둔다.** 다시 해 보기 · 작업공간 · 고객지원 셋이다.
 * 오류 화면에서 끝나면 그 사람은 그날 돌아오지 않는다.
 */
export default function AppError(
  { error, reset }: { error: Error & { digest?: string }; reset: () => void },
) {
  return (
    <main className="sf-fail">
      <h1>화면을 불러오지 못했습니다</h1>
      <p>
        잠깐 생긴 문제일 수 있습니다. 다시 해 보셔도 같으면 아래 고객지원으로
        알려주세요. 적어 두신 답과 결과는 그대로 있습니다.
      </p>
      {error.digest ? <p className="sf-fail-ref">참조 번호 {error.digest}</p> : null}
      <div className="sf-fail-acts">
        <button type="button" onClick={reset}>다시 해 보기</button>
        <Link href="/me">내 CareerMatri</Link>
        <Link href="/support">고객지원</Link>
      </div>
    </main>
  );
}
