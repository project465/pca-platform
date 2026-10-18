/** §12.B 표를 사전에서 만든다. **손으로 적으면 고친 날 표가 옛 글을 든다** */
import { readFileSync } from "node:fs";
import { STUDENT_COPY } from "../../src/lib/me-v3/student/copy";
import { FAMILY_MEANING } from "../../src/lib/me-v3/student/icon";

const SHOW: Record<string, string[]> = {
  BIZ_CORE_V1: ["TD01", "TD02", "TD05"],
  NURSING_CORE_V1: ["TD01", "TD02", "TD03"],
  PUBADM_CORE_V1: ["TD01", "TD02", "TD03"],
  CS_CORE_V1: ["TD01", "TD02", "TD03"],
  EE_CORE_V1: ["TD01", "TD02", "TD03"],
  MEDIA_CORE_V1: ["TD01", "TD02", "TD03"],
};
const reg = JSON.parse(readFileSync(
  "sites/pca-platform/content/major-cores.json", "utf8")) as {
    cores: { code: string; files?: Record<string, string> }[];
  };
function names(core: string): Map<string, string> {
  const f = reg.cores.find((x) => x.code === core)?.files?.taxonomy ?? "";
  const t = JSON.parse(readFileSync(`sites/pca-platform/content/${f}`, "utf8")) as {
    technical_domains: { code: string; name: string }[];
  };
  return new Map(t.technical_domains.map((d) => [d.code, d.name]));
}
console.log("| Core | Internal taxonomy | Student activity | Evidence | 표시 갈래 |");
console.log("|---|---|---|---|---|");
for (const [core, tds] of Object.entries(SHOW)) {
  const nm = names(core);
  for (const td of tds) {
    const v = STUDENT_COPY[core]?.[td];
    if (!v) continue;
    console.log(`| ${core.replace("_CORE_V1", "")} | ${nm.get(td)} | ${v.activity} | ${v.evidence} | ${FAMILY_MEANING[v.family]} |`);
  }
}
