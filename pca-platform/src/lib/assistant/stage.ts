import { queryOne } from "@/lib/db";
import type { GradStage } from "./research";

/**
 * 이 사람의 학위 단계. **검사에서 답한 값을 쓴다**: 가장 최근 응시의
 * `education_stage` 다. MAT 이 따로 묻지 않는 까닭은, 두 곳에서 물으면
 * 어느 날 둘이 달라지고 그날 MAT 과 결과지가 다른 사람에게 말하게 되어서다.
 * 응시가 없으면 `null` (학부생 화면 그대로).
 */
export async function stageOf(userId: string): Promise<GradStage | null> {
  const row = await queryOne<{ s: GradStage }>(
    `SELECT education_stage AS s FROM v3_attempts
      WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [userId]).catch(() => null);
  return row?.s ?? null;
}
