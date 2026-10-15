/**
 * 재응시 정책(규격 §7).
 *
 * **정책이 없었다.** 결과를 받은 학생이 `/v3/start` 를 다시 열면 전에는
 * **새 응시가 그대로 하나 더** 생겼다. 같은 사람의 응답이 두 벌 쌓이면
 * 담당자 화면에서 어느 줄이 그 학생의 결과인지 갈리고, 규준이 생기는 날
 * 그 두 벌이 함께 들어간다.
 *
 * **임의로 만들지 않고 가장 보수적인 기본안을 둔다**: 끝낸 사람은 기본적
 * 으로 다시 열 수 없고, **학과 담당자가 한 번 열어 줄 때만** 열린다.
 * 여는 길은 **이용권 한 줄**이라 DB 스키마를 바꾸지 않는다: 응시는 전부터
 * 이용권이 등급을 정하는 구조였고, 쓰지 않은 줄이 있으면 그것이 곧 한 번의
 * 권한이다(`v3Grants`).
 *
 * **지난 결과를 지우거나 덮지 않는다.** 재응시가 열려도 굳은 결과는 그대로
 * 남고 줄이 하나 더 쌓인다. 어느 줄이 최신인지는 `resultHistory` 가 든다.
 */
import { queryOne } from "@/lib/db";
import { v3Grants } from "@/lib/me-v3/runtime/session";

export type RetakeState = {
  /** 결과를 받은 응시가 몇 번인가 */
  done: number;
  /** 아직 쓰지 않은 이용권이 있는가. 있으면 한 번 더 열 수 있다 */
  granted: boolean;
  /** 지금 새 응시를 열 수 있는가 */
  canStart: boolean;
  /** 가장 최근에 결과를 받은 응시. 막힌 사람을 그리로 보낸다 */
  lastAttemptId: string | null;
};

export async function retakeState(userId: string): Promise<RetakeState> {
  const r = await queryOne<{ n: string; last: string | null }>(
    `SELECT count(*)::text AS n, max(id)::text AS last
       FROM v3_attempts WHERE user_id = $1 AND status = 'scored'`, [userId]);
  const done = Number(r?.n ?? 0);
  const granted = (await v3Grants(userId)).length > 0;
  return {
    done, granted,
    canStart: done === 0 || granted,
    lastAttemptId: r?.last ?? null,
  };
}

/** 막힌 사람에게 적는 말. **무엇을 하면 되는지까지 적는다**(규격 §21) */
export const RETAKE_BLOCKED_KO = {
  title: "이미 결과를 받으셨습니다",
  body: "검사는 한 번만 응시합니다. 같은 사람의 응답이 두 벌 쌓이면"
    + " 결과를 어느 쪽으로 읽어야 하는지가 갈립니다.",
  how: "다시 응시해야 할 사정이 있으면 학과 담당자에게 말씀해 주세요."
    + " 담당자가 열어 주면 그 자리에서 한 번 더 시작할 수 있습니다.",
} as const;
