/**
 * content/report-i18n.json → data/report-i18n.js
 *
 * 화면이 fetch 를 쓰지 않으므로 사전을 전역에 담아 둔다.
 * **고칠 곳은 JSON 쪽이고 생성물은 직접 고치지 않는다.**
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "sites/pca-platform/content/report-i18n.json";
const OUT = "sites/pca-platform/data/report-i18n.js";
const d = JSON.parse(readFileSync(SRC, "utf8"));
const en = d.en || {};

writeFileSync(OUT, `/* 결과지 문구 사전. content/report-i18n.json 에서 만든다.
   **고칠 곳은 JSON 쪽이다** (scripts/build-report-i18n.mjs 가 다시 만든다).
   열쇠가 한국어 원문이라 한국어는 사전을 거쳐도 그대로 나온다. */
window.PCA_REPORT_I18N = { en: ${JSON.stringify(en)} };
`);
console.log(`문구 ${Object.keys(en).length}가지 → ${OUT}`);
