/**
 * **전공마다 "맞는 공고" 가 몇 건인가**(2026-11-02 운영 시험: 인공지능학과에 맞는 공고가 1건뿐이었다).
 *
 * 모아 둔 공고(최근 180일 · 마감 전) 가운데 **제목 · 모집 분야**에 그 전공 사전 낱말이 있는 공고 수를 전공마다 센다
 * (MAT 공고 화면의 맞춤 기준과 같다: `pick-jobs.ts`). 기관을 주면 그 기관 학과가 쓰는 전공만 본다.
 *
 *   npm run mat:jobs-coverage            전공마다 맞는 공고 수와 예시 제목 둘
 *   UNI=JJU npm run mat:jobs-coverage    전주대 학과가 쓰는 전공만
 */
import { query } from "../src/lib/db";
import { registry } from "../src/lib/me-v3/core-registry";
import { allLeaves, universities } from "../src/lib/campus/registry";
import { matchDomains } from "../src/lib/assistant/rules";
import { jobTitle } from "../src/lib/mat/job-title";

async function main(): Promise<void> {
  const want = (process.env.UNI ?? "").toUpperCase();
  let cores = registry().cores.filter((c) => c.status === "building" || c.status === "live").map((c) => c.code);
  if (want) {
    const u = universities().find((x) => x.university_code === want);
    const used = new Set(u ? allLeaves(u).map((r) => r.leaf.core_code).filter(Boolean) as string[] : []);
    cores = cores.filter((c) => used.has(c));
  }
  const pool = await query<{ req: string[]; role: string | null }>(
    `SELECT raw_requirements AS req, role_code AS role FROM v3_job_postings
      WHERE captured_at > now() - interval '180 days'
        AND (closes_on IS NULL OR closes_on >= (now() AT TIME ZONE 'Asia/Seoul')::date)`, []);
  console.log(`모아 둔 공고 ${pool.length}건`);
  for (const core of cores) {
    const hit = pool.map((p) => [jobTitle(p.req ?? [], p.role).title ?? "", p.role ?? ""].join(" "))
      .filter((h) => matchDomains(core, h).some((x) => x.score >= 3));
    console.log(`${core}\t맞는 공고 ${hit.length}${hit.length ? `\t예: ${hit.slice(0, 2).map((t) => t.slice(0, 30)).join(" | ")}` : ""}`);
  }
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
