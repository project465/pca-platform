#!/usr/bin/env node
/**
 * 세종 시연 화면을 서버 없이 도는 HTML 한 장으로 묶는다(미리보기 링크용).
 *
 *   node scripts/sejong/preview/build.mjs <나갈 html 경로>
 *
 * 실제 화면의 CSS(`src/app/sejong/sejong.css`)와 콘텐츠 JSON 과 분석 함수
 * (`src/sejong/lib/analysis.ts`, 타입만 걷어 낸다)를 그대로 싣는다. 화면 마크업은
 * `app.js` 가 `src/app/sejong/**` 를 옮겨 적은 것이라 **화면을 고치면 여기도 고친다.**
 * 가상 참여자는 seed-demo.mjs 와 같은 씨앗으로 브라우저에서 만든다. 비밀번호·실명 없음.
 * 나간 파일은 저장소 밖에 둔다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.resolve(HERE, "../../..") + "/";
const OUT = process.argv[2];
if (!OUT) { console.error("나갈 html 경로를 주십시오"); process.exit(1); }
const rd = (f) => readFileSync(R + f, "utf8");
const tax = JSON.parse(rd("sites/pca-platform/content/me-v3-2-taxonomy.json"));
const D = {
  instrument: JSON.parse(rd("src/sejong/content/instrument.sj-jobseeker-demo-0.json")),
  axisInfo: tax.axes, levels: tax.levels,
  orgs: JSON.parse(rd("src/sejong/content/orgs.preview.json")),
  links: JSON.parse(rd("src/sejong/content/org-links.demo.json")),
  region: JSON.parse(rd("src/sejong/content/region.sejong.json")),
};
let css = rd("src/app/sejong/sejong.css");
css = css.replace(".sj-main { max-width: 1120px; margin: 0 auto; padding: 28px 16px 64px; }",
  ".sj-main { max-width: 1120px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }");
const extra = `
:root { color-scheme: light; }
body { background: #f4f6f8; margin: 0; }
.sj-nav a.on { background: var(--sj-brand-soft); color: var(--sj-brand); font-weight: 600; }
.sj-main { min-width: 0; }
.sj-grid > * { min-width: 0; }
.pv-bar { background: #13212f; color: #e8eef4; font-size: 12.5px; position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20;
  font-family: "Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif; }
.pv-in { max-width: 1120px; margin: 0 auto; padding-block: 8px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.pv-tag { background: #c9822b; color: #fff; font-weight: 700; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.pv-txt { flex: 1 1 320px; min-width: 0; color: #c4d0dc; line-height: 1.45; }
.pv-roles { display: inline-flex; border: 1px solid #3c4b5c; border-radius: 8px; overflow: hidden; }
.pv-roles button, .pv-reset { font: inherit; font-size: 12.5px; background: transparent; color: #e8eef4; border: 0; padding: 6px 10px; cursor: pointer; min-height: 32px; }
.pv-roles button + button { border-left: 1px solid #3c4b5c; }
.pv-roles button[aria-pressed="true"] { background: #e8eef4; color: #13212f; font-weight: 700; }
.pv-reset { border: 1px solid #3c4b5c; border-radius: 8px; }
.pv-inline { background: #eef2f7; border: 1px dashed #9fb0c3; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #3c4b5c; margin-top: 14px; }
.pv-link { font: inherit; background: none; border: 0; color: var(--sj-brand); text-decoration: underline; cursor: pointer; padding: 0; }
.sj-table { min-width: 560px; }
@media print { body { background: #fff; } .pv-bar, .pv-inline, #pv-pdf { display: none !important; } .sj-table { min-width: 0; } }
`;
const analysis = stripTypeScriptTypes(rd("src/sejong/lib/analysis.ts"), { mode: "strip" }).replace(/^export /gm, "");
const app = readFileSync(path.join(HERE, "app.js"), "utf8");
const html = `<title>세종 시연 화면</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}${extra}</style>
<div id="app"></div>
<script>
var D = ${JSON.stringify(D).replace(/</g, "\\u003c")};
${analysis}
${app}
</script>
`;
writeFileSync(OUT, html);
console.log("bytes", Buffer.byteLength(html));
