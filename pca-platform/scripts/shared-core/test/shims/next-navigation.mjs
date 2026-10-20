/**
 * 검사용 `next/navigation` 대체. **제품에 들어가지 않는다.**
 *
 * `campus/manage.ts` 가 `runtime/session.ts` 를 거쳐 `me-v3/platform.ts` 를
 * 들여오고, 그 파일이 `redirect` 하나를 쓴다. 재현 검사가 부르는 함수는
 * 그 자리를 지나지 않는다. 지나면 **던져서** 드러나게 한다(조용히 넘기지 않는다).
 */
export function redirect(to) {
  throw new Error(`shim: redirect(${to}) 가 불렸습니다 — 이 검사의 경로가 아닙니다`);
}
export function notFound() {
  throw new Error("shim: notFound() 가 불렸습니다 — 이 검사의 경로가 아닙니다");
}
