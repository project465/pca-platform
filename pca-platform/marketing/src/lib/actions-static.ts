/**
 * 정적 배포(STATIC=1)용 문의 폼 대체.
 *
 * 정적 내보내기에는 서버가 없어 server action 이 돌지 않는다. 폼을 지우면
 * 화면 구성이 달라져 미리보기의 의미가 없어지므로, 폼은 그대로 두고 보내는
 * 동작만 바꾼다 — 접수되지 않았다는 것을 사람이 읽을 수 있게 말해 준다.
 * 조용히 실패하는 폼이 가장 나쁘다.
 */
export type ContactState = { ok?: boolean; error?: string };

export async function submitContact(): Promise<ContactState> {
  return {
    error:
      "미리보기 화면이라 문의가 접수되지 않습니다. 실제 배포본에서는 이 폼이 그대로 동작합니다. / This is a static preview — the form does not submit here.",
  };
}
