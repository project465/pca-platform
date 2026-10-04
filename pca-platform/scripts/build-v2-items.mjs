/**
 * assessment/ME_V2/*.json → data/me-v2.js
 *
 * 화면이 fetch 를 쓰지 않으므로 같은 내용을 전역에 담아 둔다.
 * **고칠 곳은 JSON 쪽이고 생성물은 직접 고치지 않는다.**
 *
 *   node scripts/build-v2-items.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const A = "sites/pca-platform/assessment/ME_V2";
const read = (f) => JSON.parse(readFileSync(`${A}/${f}`, "utf8"));

const core = read("items-core.json");
const standard = read("items-standard.json");
const pro = read("items-pro.json");
const variants = read("stage-variants.json");
const scales = read("response-scales.json");
const rules = read("decision-rules.json");
const names = read("family-names.json");
const modeFit = read("mode-fit.json");

const bank = {
  version: core.assessment_version,
  legacy: core.legacy_version,
  core, standard, pro, variants, scales, rules,
};

const out = `/* ME_V2 문항 은행. assessment/ME_V2/*.json 에서 만든다.
   화면이 fetch 를 쓰지 않아 같은 내용을 전역에 담는다.
   **V1 과 섞이지 않는다**: 전역 이름도 저장 키도 따로다.
   **고칠 곳은 JSON 쪽이다** (scripts/build-v2-items.mjs 가 다시 만든다). */
window.PCA_V2_ITEMS = window.PCA_V2_ITEMS || {};
window.PCA_V2_ITEMS.ME = ${JSON.stringify(bank)};
window.PCA_V2_FAMILY_NAMES = ${JSON.stringify(names.names, null, 1)};
window.PCA_V2_MODE_FIT = ${JSON.stringify(modeFit.major, null, 1)};
`;
writeFileSync("sites/pca-platform/data/me-v2.js", out);
console.log(`문항 ${core.items.length} + ${standard.items.length} + ${pro.items.length} · ` +
  `직무군 ${Object.keys(names.names).length} · 상태 ${Object.keys(rules.statuses).length}`);
