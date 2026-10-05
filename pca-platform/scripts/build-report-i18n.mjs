/**
 * content/report-i18n.json  → data/report-i18n.js      화면에 나갈 글자
 * content/match-glossary.json → data/match-glossary.js  경험에서 찾을 말
 *
 * 화면이 fetch 를 쓰지 않으므로 둘 다 전역에 담아 둔다.
 * **고칠 곳은 JSON 쪽이고 생성물은 직접 고치지 않는다.**
 *
 * **둘을 한 파일에 담지 않는다.** 사전을 검색어에 들이대면 '요구조건' 을
 * 찾을 때 'requirements' 로 바뀌어 한국어로 적어 주신 분의 경험이 안
 * 걸린다. 반대로 어휘를 화면에 들이대면 낱말이 뜻 없이 흩어진다.
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

const GSRC = "sites/pca-platform/content/match-glossary.json";
const GOUT = "sites/pca-platform/data/match-glossary.js";
const g = JSON.parse(readFileSync(GSRC, "utf8"));
const gen = g.en || {};
writeFileSync(GOUT, `/* 맞추기 어휘. content/match-glossary.json 에서 만든다.
   **고칠 곳은 JSON 쪽이다** (scripts/build-report-i18n.mjs 가 다시 만든다).
   한국어 검색어 하나가 영어 낱말 여럿으로 퍼진다. 양쪽을 늘 함께 찾는다. */
window.PCA_MATCH_GLOSSARY = { en: ${JSON.stringify(gen)} };
`);
const n = Object.values(gen).reduce((a, x) => a + x.length, 0);
console.log(`검색어 ${Object.keys(gen).length}가지 · 영어 낱말 ${n}개 → ${GOUT}`);
