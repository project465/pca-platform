/**
 * 어디까지 왔는지. **두 수준으로 보여 주고 거짓 정밀도를 쓰지 않는다.**
 *
 * `42 / 107` 만 적으면 그 수가 routing 으로 달라진다는 것을 말하지 않는다.
 * 심화 영역을 하나 더 열면 분모가 늘고, 그러면 응시자는 진행률이 거꾸로
 * 간다고 읽는다. 그래서 큰 단계는 **이름으로** 적고, 지금 묶음 안에서만
 * 숫자를 적는다.
 */
import { STAGES, type Plan, type StageCode } from "./blocks";

export type Progress = {
  /** 큰 단계. 이름과 지난 자리 */
  stages: { code: StageCode; label: string; state: "done" | "current" | "todo" }[];
  /** 지금 묶음 안에서 */
  inStage: { index: number; total: number; label: string };
  /** 전체 화면 가운데 몇째인지. **남은 문항 수로 적지 않는다** */
  screen: { index: number; total: number };
};

export function progressOf(plan: Plan, screenId: string): Progress {
  const at = Math.max(0, plan.screens.findIndex((s) => s.id === screenId));
  const cur = plan.screens[at];
  const order = STAGES.map((s) => s.code);
  const curRank = order.indexOf(cur.stage);
  const sameStage = plan.screens.filter((s) => s.stage === cur.stage);
  const inIndex = sameStage.findIndex((s) => s.id === screenId) + 1;

  return {
    stages: STAGES.filter((s) => (plan.perStage[s.code] ?? 0) > 0 || s.code === "DONE")
      .map((s) => ({
        code: s.code, label: s.label,
        state: order.indexOf(s.code) < curRank ? "done"
          : s.code === cur.stage ? "current" : "todo",
      })),
    inStage: {
      index: inIndex, total: sameStage.length,
      label: STAGES.find((s) => s.code === cur.stage)?.label ?? "",
    },
    screen: { index: at + 1, total: plan.screens.length },
  };
}
