/** 책 HTML 을 그대로 떠 둔다(종이는 이 HTML 을 인쇄한다) */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import { buildLongReport } from "../../src/lib/me-v3/report-long";
async function main(): Promise<void> {
  mkdirSync("var/jju-consistency", { recursive: true });
  for (const id of (process.env.IDS ?? "1").split(",")) {
    const r = await buildLongReport(id, { fontBase: "/fonts/cm-book/" });
    writeFileSync(`var/jju-consistency/book-${id}.html`, r.html);
    console.log(id, r.html.length);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
