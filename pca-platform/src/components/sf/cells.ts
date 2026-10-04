/**
 * 집계 칸을 막대 줄로 옮긴다.
 *
 * **감춘 칸을 0 으로 적지 않는다.** `insights.ts` 가 다섯 명 미만인 칸을
 * `hidden` 으로 내보내므로, 그 표시를 그대로 들고 와서 화면이 빗금으로
 * 그리게 한다. 여기서 숫자를 지어내면 5명 규칙이 화면에서 깨진다.
 */
import type { Cell } from "@/lib/insights";
import type { BarRow } from "./parts";

export function toBars(cells: Cell[], suffix = "명"): BarRow[] {
  return cells.map((c) =>
    "hidden" in c
      ? { label: c.label, hidden: true }
      : { label: c.label, value: c.n, suffix },
  );
}
