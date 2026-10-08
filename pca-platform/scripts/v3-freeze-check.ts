/**
 * 검사 화면 동결 대조.
 *
 * 화면 파일의 지문을 `ui-lock.json` 과 견준다. 결과지 작업 중에 검사
 * 화면을 편의상 고치면 여기서 걸린다. **일부러 고쳤다면** 판본을 올리고
 * `FREEZE=update` 로 다시 적는다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { ITEM_BANK_VERSION, SCORING_VERSION } from "../src/lib/me-v3/scoring/version";
import {
  ASSESSMENT_COPY_VERSION, ASSESSMENT_UI_VERSION,
} from "../src/lib/me-v3/runtime/ui-version";
import { ASSESSMENT_VERSION } from "../src/lib/me-v3/runtime/session";

const LOCK = "sites/pca-platform/assessment/ME_V3/ui-lock.json";

/** 화면을 이루는 파일. 여기 없는 파일을 고치면 이 검사가 모른다 */
const FILES = [
  "src/app/v3/layout.tsx",
  "src/app/v3/assessment.css",
  "src/app/v3/tier-text.ts",
  "src/app/v3/start/page.tsx",
  "src/app/v3/start/start-form.tsx",
  "src/app/v3/start/actions.ts",
  "src/app/v3/[attemptId]/page.tsx",
  "src/app/v3/[attemptId]/screen.tsx",
  "src/app/v3/[attemptId]/model.ts",
  "src/app/v3/[attemptId]/actions.ts",
  "src/lib/me-v3/runtime/blocks.ts",
  "src/lib/me-v3/runtime/menus.ts",
  "src/lib/me-v3/runtime/session.ts",
];

const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");

type Lock = {
  schema_version: string; note: string;
  versions: Record<string, string>;
  files: Record<string, string>;
};

const now: Lock = {
  schema_version: "me-v3-ui-lock.1",
  note: "검사 화면 1차 동결. 결과지 작업 중에는 명백한 버그와 접근성 오류만 고치고,"
    + " 고쳤으면 `ui-version.ts` 의 판본을 올린 뒤 `FREEZE=update npm run v3:freeze`"
    + " 로 지문을 다시 적는다",
  versions: {
    assessment_ui_version: ASSESSMENT_UI_VERSION,
    assessment_copy_version: ASSESSMENT_COPY_VERSION,
    assessment_version: ASSESSMENT_VERSION,
    item_bank_version: ITEM_BANK_VERSION,
    scoring_version: SCORING_VERSION,
  },
  files: Object.fromEntries(FILES.map((f) => [f, sha(f)])),
};

if (process.env.FREEZE === "update") {
  writeFileSync(LOCK, `${JSON.stringify(now, null, 1)}\n`);
  console.log(`  적었다  ${LOCK} — 파일 ${FILES.length}벌`);
  console.log(`  판본    ${ASSESSMENT_UI_VERSION} · ${ASSESSMENT_COPY_VERSION}`);
  process.exit(0);
}

const was = JSON.parse(readFileSync(LOCK, "utf8")) as Lock;
const bad: string[] = [];

for (const [k, v] of Object.entries(now.versions)) {
  if (was.versions[k] !== v) bad.push(`판본 ${k}: ${was.versions[k]} → ${v}`);
}
for (const f of FILES) {
  if (!(f in was.files)) bad.push(`잠근 목록에 없는 파일: ${f}`);
  else if (was.files[f] !== now.files[f]) bad.push(`바뀐 파일: ${f}`);
}
for (const f of Object.keys(was.files)) {
  if (!FILES.includes(f)) bad.push(`목록에서 빠진 파일: ${f}`);
}

for (const x of bad) console.log(`  걸림  ${x}`);
console.log(bad.length
  ? `\n검사 화면이 ${bad.length}곳 달라졌다. 일부러 고쳤다면 `
    + "`ui-version.ts` 의 판본을 올리고 `FREEZE=update npm run v3:freeze`."
  : `\n검사 화면 동결 OK — ${ASSESSMENT_UI_VERSION} · ${ASSESSMENT_COPY_VERSION}`
    + ` · 파일 ${FILES.length}벌 그대로.`);
process.exitCode = bad.length ? 1 : 0;
