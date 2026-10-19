/**
 * 학교 학생의 응시가 지금 어디에 있는가. **단추의 말은 이 값이 정한다.**
 *
 * 학교 쪽 쪽들이 상태를 보지 않고 늘 `검사 시작하기` 를 세웠다. 결과를
 * 받은 학생이 그 단추를 누르면 실제로는 지난 결과로 돌아가는데 단추는
 * 시작한다고 말했고, 푸는 중인 학생에게도 같은 말이 섰다. 적힌 말과 일어나는
 * 일이 다르면 읽는 사람은 자기가 무엇을 잘못 누른 줄 안다.
 *
 * - `start`  : 아직 응시가 없다 → 검사 시작
 * - `resume` : 푸는 중인 응시가 있다 → 이어하기 (그 응시로 바로 간다)
 * - `result` : 결과를 받았고 다시 열 권한이 없다 → 결과 보기
 * - `retake` : 결과를 받았고 담당자가 다시 열어 주었다 → 다시 검사 시작 +
 *              지난 결과 보기
 *
 * 다시 여는 권한은 **학교 이용권만** 센다(`startGate` 와 같은 자다): 학생이
 * 따로 산 개인 이용권으로 학교 응시가 하나 더 열리지 않는다.
 */
import { queryOne } from "@/lib/db";
import { v3Grants } from "@/lib/me-v3/runtime/session";
import { CAMPUS_GRANT_PRODUCT } from "./start-gate";

export type CampusAttemptState =
  | { kind: "start" }
  | { kind: "resume"; attemptId: string }
  | { kind: "result"; attemptId: string }
  | { kind: "retake"; attemptId: string };

export async function campusAttemptState(
  userId: string,
): Promise<CampusAttemptState> {
  const r = await queryOne<{ open: string | null; last: string | null }>(
    `SELECT max(id) FILTER (WHERE status = 'in_progress')::text AS open,
            max(id) FILTER (WHERE status = 'scored')::text AS last
       FROM v3_attempts WHERE user_id = $1::bigint`, [userId]);
  if (r?.open) return { kind: "resume", attemptId: r.open };
  if (!r?.last) return { kind: "start" };
  const granted = (await v3Grants(userId))
    .some((g) => g.product_code === CAMPUS_GRANT_PRODUCT);
  return granted
    ? { kind: "retake", attemptId: r.last }
    : { kind: "result", attemptId: r.last };
}

/** 단추와 그 아래 한 줄. **누르면 일어나는 일 그대로 적는다** */
export const CAMPUS_CTA_KO = {
  start: { label: "검사 시작하기", note: "문항마다 저장되어 창을 닫아도 보던 자리에서 이어집니다." },
  resume: { label: "이어하기", note: "마지막으로 답한 자리에서 이어집니다. 앞에 답한 것은 그대로 남아 있습니다." },
  result: { label: "결과 보기", note: "검사는 한 번 응시합니다. 다시 응시해야 할 사정이 있으면 학과 담당자에게 말씀해 주세요." },
  retake: { label: "다시 검사 시작하기", note: "지난 결과는 지워지지 않고 그대로 남습니다. 새로 응시한 결과는 따로 한 번 더 쌓입니다." },
} as const;
