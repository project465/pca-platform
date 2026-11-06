/**
 * **전공마다 "맞는 공고" 가 몇 건인가**(2026-11-02 운영 시험: 인공지능학과에 맞는 공고가 1건뿐이었다).
 *
 * 모아 둔 공고(최근 180일 · 마감 전) 가운데 MAT 공고 화면이 맞는 공고로 세우는 것(`job-fit.ts` 의 `fitOf`, 제목 ·
 * 모집 분야 · 분류)을 전공마다 센다. 기관을 주면 그 기관 학과가 쓰는 전공만 본다. 학과 · 갈래까지 견본으로 재는 것은
 * `npm run mat:match` 다.
 *
 *   npm run mat:jobs-coverage            전공마다 맞는 공고 수와 예시 제목 둘
 *   UNI=JJU npm run mat:jobs-coverage    전주대 학과가 쓰는 전공만
 */
import { registry } from "../src/lib/me-v3/core-registry";
import { allLeaves, universities } from "../src/lib/campus/registry";
import { jobTitle } from "../src/lib/mat/job-title";
import { jobPool } from "../src/lib/mat/pick-jobs";
import { fitOf, profileOf } from "../src/lib/mat/job-fit";

async function main(): Promise<void> {
  const want = (process.env.UNI ?? "").toUpperCase();
  let cores = registry().cores.filter((c) => c.status === "building" || c.status === "live").map((c) => c.code);
  if (want) {
    const u = universities().find((x) => x.university_code === want);
    const used = new Set(u ? allLeaves(u).map((r) => r.leaf.core_code).filter(Boolean) as string[] : []);
    cores = cores.filter((c) => used.has(c));
  }
  const pool = await jobPool();
  console.log(`모아 둔 공고 ${pool.length}건`);
  for (const core of cores) {
    const prof = profileOf(core);
    const hit = pool
      .map((p) => ({ p, title: p.title?.trim() || jobTitle(p.raw_requirements ?? [], p.role_code).title || "" }))
      .filter(({ p, title }) => title && fitOf(prof, { title, recruit_field: p.recruit_field, field: p.field, job_family: p.job_family }).real)
      .map((x) => x.title);
    console.log(`${core}\t맞는 공고 ${hit.length}${hit.length ? `\t예: ${hit.slice(0, 2).map((t) => t.slice(0, 30)).join(" | ")}` : ""}`);
  }
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
