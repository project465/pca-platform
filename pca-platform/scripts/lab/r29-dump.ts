/** 여섯 Core 의 영역 열둘을 적는다. **읽기만 한다** */
import { readFileSync } from "node:fs";
const CORES = ["BIZ_CORE_V1", "NURSING_CORE_V1", "PUBADM_CORE_V1",
  "CS_CORE_V1", "EE_CORE_V1", "MEDIA_CORE_V1"];
const reg = JSON.parse(readFileSync(
  "sites/pca-platform/content/major-cores.json", "utf8")) as {
    cores: { code: string; name_ko?: string; files?: Record<string, string> }[];
  };
for (const c of CORES) {
  const e = reg.cores.find((x) => x.code === c);
  if (!e) { console.log(`${c} 없음`); continue; }
  const tf = e.files?.taxonomy ?? "";
  const df = e.files?.domains ?? "";
  const tax = JSON.parse(readFileSync(`sites/pca-platform/content/${tf}`, "utf8")) as {
    technical_domains: { code: string; name: string; subareas?: string[] }[];
  };
  const dom = JSON.parse(readFileSync(`sites/pca-platform/content/${df}`, "utf8")) as {
    domains: { code: string; artifacts?: string[]; decide_first?: string[] }[];
  };
  console.log(`\n### ${c}  ${e.name_ko ?? ""}`);
  for (const d of tax.technical_domains) {
    const dd = dom.domains.find((x) => x.code === d.code);
    console.log(`${d.code} | ${d.name} | sub: ${(d.subareas ?? []).join(" / ")}`);
    console.log(`     artifacts: ${(dd?.artifacts ?? []).slice(0, 3).join(" / ")}`);
    console.log(`     decide:    ${(dd?.decide_first ?? []).slice(0, 2).join(" / ")}`);
  }
}
