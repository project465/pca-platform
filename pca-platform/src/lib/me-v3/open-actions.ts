/**
 * **지금 할 일을 읽는 한 자리.**
 *
 * 세 화면(홈 · 현재 상태 · 다음 할 일)이 `지금 할 일` 을 저마다 읽고
 * 있었고, 셋이 서로 다른 답을 냈다. 홈과 현재 상태는 굳은 결과가 낸 할
 * 일을 그려 주는데 `다음 할 일` 쪽은 **담아 둔 줄(`v3_actions`)만**
 * 읽어서, PRO 를 끝내고 들어온 사람이 이렇게 읽었다.
 *
 *   홈            지금 할 일 · 아직 정해 둔 할 일이 없습니다
 *   [지금 할 일]  → 다음 할 일 · 아직 담아 둔 할 일이 없습니다
 *
 * **담기는 사용자가 할 일이 아니다.** 결과는 이미 할 일을 냈고, 그것을
 * 표에 옮기는 것은 우리 쪽 사정이다. 그 한 번의 누름을 요구하는 동안
 * 제품의 가장 중요한 칸이 비어 있었다(규격 §3 — 지금 할 일이 1순위다).
 *
 * 그래서 읽는 자리를 하나로 모은다: 담아 둔 줄이 있으면 그것을 쓰고,
 * 없으면 **굳은 결과가 낸 할 일을 그대로 보여 준다.** 두 경우의 문장이
 * 같은 함수(`actionKo`)에서 나오므로 화면이 달라지지 않는다.
 *
 * **아무것도 쓰지 않는다.** 여는 것만으로 줄이 쌓이면 미리 불러오기가
 * 줄을 만들고, 그러면 지운 할 일이 되살아난 것처럼 보인다. 줄은 사람이
 * 담거나 상태를 바꿀 때만 생긴다.
 *
 * **지운 것을 되살리지 않는다.** 담아 둔 줄을 전부 `dropped` 로 치운
 * 사람은 `actionsOf` 가 빈 목록을 돌려주는데, 그때 결과에서 다시 끌어
 *오면 치운 일이 돌아온다. 그래서 치운 줄이 하나라도 있으면 결과 쪽을
 * 보지 않는다.
 */
import { actionsOf, droppedActionCount, latestResult, type ActionRow }
  from "./platform";
import { domainName } from "./runtime/session";
import { actionKo } from "./result/text.ko";
import type { ResultModel } from "./result/model";

/** 결과가 낸 할 일 한 줄을 화면이 읽는 모양으로 */
const H = { NOW: 30, NEXT: 90, LATER: 365 } as const;

export type OpenActions = {
  /** 화면에 세울 줄. 담아 둔 것이 있으면 그것, 없으면 결과가 낸 것 */
  rows: ActionRow[];
  /** 아직 표에 담기지 않은 상태인가. 담는 단추를 세울지 정한다 */
  fromResult: boolean;
  model: ResultModel | null;
};

export async function openActions(userId: string): Promise<OpenActions> {
  const [rows, model, dropped] = await Promise.all([
    actionsOf(userId), latestResult(userId), droppedActionCount(userId),
  ]);
  if (rows.length || !model || dropped > 0) {
    return { rows, fromResult: false, model };
  }
  const derived: ActionRow[] = model.actions.map((a, i) => ({
    /* 표에 없는 줄이라 번호가 없다. 화면이 이 값으로 상태를 바꾸지
       않는다(바꾸려면 먼저 담아야 한다) */
    id: `r${i}`,
    source: "result",
    td_code: a.domain ?? null,
    axis_code: a.axis ?? null,
    body: actionKo(a, a.domain ? domainName(a.domain) : "", model.stage).do,
    horizon: H[a.horizon],
    state: "open",
  }));
  return { rows: derived, fromResult: true, model };
}
