import { queryOne } from "@/lib/db";
import { runWork24, work24Ready } from "./work24";

/**
 * 밤 당번이 부른다. **하루 한 번만 받아 온다.** 당번은 몇 분마다 돌지만
 * 공고를 그만큼 자주 받으면 호출 한도를 먹고 얻는 것이 없다. 마지막으로
 * 받아 온 때가 스무 시간 안이면 건너뛴다.
 */
export async function runJobsTick(now = new Date()): Promise<unknown> {
  if (!work24Ready()) return { skipped: "no-key" };
  const last = await queryOne<{ at: string | null }>(
    `SELECT max(captured_at)::text AS at FROM v3_job_postings WHERE source = 'work24'`);
  if (last?.at && now.getTime() - new Date(last.at).getTime() < 20 * 3600_000) {
    return { skipped: "recent" };
  }
  return runWork24(now);
}
