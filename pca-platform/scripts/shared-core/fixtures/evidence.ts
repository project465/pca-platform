/**
 * R37 Evidence 재현 사례 (evidence-aggregation.test.ts 에서 옮겼다 · R38 content/integrity.ts 도 쓴다).
 * 합성 사례다. 실제 학생의 응답이 아니다.
 */
import type { Fixture } from "../../../src/lib/me-v3/scoring/fixtures";

const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
export const all = (v: number) => Object.fromEntries(AX.map((a) => [a, v]));

/* BIZ: 세 영역에 고르기 · TD02 의 비교·검증(J6)은 `받아서 해 봤다`(1)라 확인되지 않는다 */
export const BIZ_CASE: Fixture = {
  id: "E-BIZ", name: "배재 GM 격리 검사와 같은 모양", tier: "PRO", stage: "bachelor", field: null,
  probe: ["TD01", "TD02", "TD08"], deep: ["TD01", "TD08"],
  grid: { TD01: [5, 2, 5], TD02: [4, 1, 4], TD08: [4, 2, 4] },
  axes: { TD01: all(2), TD08: all(2), TD02: { J3: 2, J5: 2, J6: 1, J7: 2 } },
  checklist: {
    TD01: { J1: 2, J2: 1, J3: 2, J4: 1, J5: 1, J6: 1, J7: 1 },
    TD08: { J1: 1, J3: 2, J4: 2, J6: 1 },
    TD02: { J3: 2, J5: 1, J7: 1 },
  },
  artifacts: { TD01: 2, TD08: 1, TD02: 1 },
  verify: { TD01: 1, TD08: 1, TD02: 1 },
};

