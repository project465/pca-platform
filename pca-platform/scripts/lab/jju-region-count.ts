/** 같은 응시에서 웹(`webRegionView`)과 책(`assemble` 이 쓰는 입력)의 지역 회사 수를 나란히 센다 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { webRegionView } from "../../src/lib/me-v3/report-long/web-region";
import { loadInputs } from "../../src/lib/me-v3/report-long/data";
import { derive, withPicks, withPlan, withTranslation } from "../../src/lib/me-v3/report-long/derive";
import { regionView, type RegionView } from "../../src/lib/me-v3/report-long/region";

const sum = (rv: RegionView | null) => rv ? {
  all: rv.all.length, matched: rv.groups.reduce((a, g) => a + g.orgs.length, 0), groups: rv.groups.length,
  tiers: rv.groups.map((g) => `${g.pack.code}:${g.tier}:${g.orgs.length}`).join(" "), unmatched: rv.unmatched,
} : null;

async function main(): Promise<void> {
  for (const id of (process.env.IDS ?? "1").split(",")) {
    const web = await webRegionView(id);
    const x0 = await loadInputs(id);
    const x = withPicks(withPlan(withTranslation(x0)));
    const book = regionView(x, derive(x).name);
    console.log(id, JSON.stringify({ web: sum(web), book: sum(book) }, null, 1));
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
