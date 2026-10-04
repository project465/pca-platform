/**
 * content/*.json → data/value-data.js
 *
 * 화면이 fetch 를 쓰지 않으므로(정적 배포에서 file:// 과 추가 요청을 둘 다
 * 피한다) 같은 내용을 전역에 담아 둔다. **고칠 곳은 json 쪽이다.**
 *
 *   node scripts/build-value-data.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const C = "sites/pca-platform/content";
const read = (f) => JSON.parse(readFileSync(`${C}/${f}`, "utf8"));

const knowledge = read("me-knowledge.json");
const tools = read("me-tools.json");
const paths = read("me-value-paths.json");
const orgs = read("org-types.json");
const evmap = read("me-evidence-map.json");
const follow = read("followups.json");

const out = `/* 전공지식 → 조직 성과 번역에 쓰는 참조 자료.
   content/me-knowledge.json · me-tools.json · me-value-paths.json ·
   org-types.json 에서 만든다. 화면은 fetch 를 쓰지 않으므로 같은 내용을
   전역에 담아 둔다. **고칠 곳은 json 쪽이고 이 파일은 손대지 않는다**
   (scripts/build-value-data.mjs 가 다시 만든다). */
window.PCA_KNOWLEDGE = ${JSON.stringify(knowledge, null, 1)};
window.PCA_TOOLS = ${JSON.stringify(tools, null, 1)};
window.PCA_VALUE_PATHS = ${JSON.stringify(paths, null, 1)};
window.PCA_ORG_TYPES = ${JSON.stringify(orgs, null, 1)};
window.PCA_EVIDENCE_MAP = ${JSON.stringify(evmap, null, 1)};
window.PCA_FOLLOWUPS = ${JSON.stringify(follow, null, 1)};
`;
writeFileSync("sites/pca-platform/data/value-data.js", out);
const reqs = evmap.families.reduce((a, f) => a + f.evidence_requirements.length, 0);
console.log(`지식 ${knowledge.domains.length} · 도구 갈래 ${tools.categories.length} · ` +
  `직무군 ${paths.families.length} · 조직 유형 ${orgs.organization_types.length} · ` +
  `증거 영역 ${reqs} · 되물음 ${follow.gaps.length}갈래`);
