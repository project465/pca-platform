import { queryOne } from "@/lib/db";
import { runWork24, work24Ready } from "./work24";
import { JI_SOURCE, jiEnabled, jiIntervalMs, runJobindustry } from "./jobindustry";

async function lastCapture(source: string): Promise<number | null> {
  const r = await queryOne<{ at: string | null }>(
    `SELECT max(captured_at)::text AS at FROM v3_job_postings WHERE source = $1`, [source]);
  return r?.at ? new Date(r.at).getTime() : null;
}

/**
 * 밤 당번이 부른다. 출처마다 따로 돈다: 한쪽 열쇠가 없거나 한쪽 서버가 느려도
 * 다른 쪽을 막지 않는다.
 *
 * - 고용24: **하루 한 번만** 받아 온다. 호출 한도가 있어 자주 받으면 한도만
 *   먹는다. 마지막으로 받아 온 때가 스무 시간 안이면 건너뛴다.
 * - 잡인더스트리: **10분마다**(`JOBINDUSTRY_INTERVAL_MIN`). 우리 사이트라 한도가
 *   없고, 새 공고가 MAT 에 늦게 뜨지 않게 한다. 당번 자체가 그보다 드물게 돌면
 *   그 간격이 실제 간격이다.
 */
export async function runJobsTick(now = new Date()): Promise<unknown> {
  const out: Record<string, unknown> = {};

  if (!jiEnabled()) out.jobindustry = { skipped: "off" };
  else {
    const last = await lastCapture(JI_SOURCE).catch(() => null);
    if (jiRanAt && now.getTime() - jiRanAt < jiIntervalMs()) out.jobindustry = { skipped: "recent" };
    else {
      jiRanAt = now.getTime();
      out.jobindustry = await runJobindustry({ firstFill: last === null }).catch((e) => ({ ok: false, error: String((e as Error)?.message ?? e).slice(0, 120) }));
    }
  }

  if (!work24Ready()) out.work24 = { skipped: "no-key" };
  else {
    const last = await lastCapture("work24").catch(() => null);
    out.work24 = last && now.getTime() - last < 20 * 3600_000 ? { skipped: "recent" } : await runWork24(now);
  }
  return out;
}

/*
 * 잡인더스트리를 마지막으로 **돈** 때. `captured_at` 으로 재면 새 공고가 없던
 * 날은 그 값이 멈춰 있어 당번마다 다시 돈다. 이 프로세스 안에서 센다: 앱이
 * 다시 뜨면 한 번 더 도는 것뿐이라 표를 만들지 않는다.
 */
let jiRanAt = 0;
