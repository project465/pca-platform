/**
 * 결과지 화면 동결 대조.
 *
 * 응시 화면과 같은 방식이다. 화면을 이루는 파일의 지문을 `result-lock.json`
 * 과 견주고, 판본 넷이 그대로인지 본다. 파일을 **일부러** 고쳤으면 판본을
 * 올리고 `RESULT_FREEZE=update` 로 다시 적는다.
 *
 * 여기서 세는 것은 `무엇이 바뀌었는가` 뿐이다. **잘 만들어졌는가**는
 * 다른 검사가 센다. 동결 조건은 아래 아홉 가지이고, 각각을 어느 검사가
 * 지키는지 함께 적어 둔다 — 동결은 그 검사들이 모두 푸른 날에만 한다.
 *
 *   npm run v3:result:freeze
 *   RESULT_FREEZE=update npm run v3:result:freeze
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { ITEM_BANK_VERSION, SCORING_VERSION } from "../src/lib/me-v3/scoring/version";
import {
  RESULT_COPY_VERSION, RESULT_MODEL_VERSION, RESULT_UI_VERSION,
} from "../src/lib/me-v3/result/version";

const LOCK = "sites/pca-platform/assessment/ME_V3/result-lock.json";

/** 결과지를 이루는 파일. 여기 없는 파일을 고치면 이 검사가 모른다 */
const FILES = [
  "src/app/v3/result.css",
  "src/app/v3/[attemptId]/result/page.tsx",
  "src/app/v3/[attemptId]/result/fold.tsx",
  "src/app/v3/[attemptId]/result/disclose.tsx",
  "src/app/v3/[attemptId]/result/save.tsx",
  "src/app/v3/[attemptId]/result/track.tsx",
  "src/lib/me-v3/result/model.ts",
  "src/lib/me-v3/result/build.ts",
  "src/lib/me-v3/result/text.ko.ts",
  "src/lib/me-v3/result/josa.ts",
  "src/lib/me-v3/result/version.ts",
  "src/lib/me-v3/runtime/domain-facts.ts",
];

/** 동결 조건과 그것을 지키는 검사 */
const GUARDS: [string, string][] = [
  ["내부 코드·문항 번호가 화면과 종이에 0건", "v3:result · v3:result:shots · v3:result:pdf"],
  ["조사 오류 0건", "v3:result:copy"],
  ["네 축만 물은 응시에 근거 판정이 없다", "v3:result"],
  ["첫 화면과 아래 절이 같은 곳을 가리킨다", "v3:result (빈자리 차례) · 사람 눈"],
  ["같은 할 일이 한 사람에게 두 번 서지 않는다", "v3:result:copy"],
  ["웹과 종이가 같은 결과 모델을 읽는다", "v3:result (모델 되읽기) · v3:result:pdf"],
  ["사람마다 결과의 뜻이 같다", "v3:result (스냅샷 대조 · 팩 변형)"],
  ["320px 에서 가로로 밀리지 않는다", "v3:result:shots"],
  ["종이에 빈 쪽과 범위 밖 쪽수가 없다", "v3:result:pdf"],
];

const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");

type Lock = {
  schema_version: string; note: string;
  versions: Record<string, string>;
  guards: Record<string, string>;
  files: Record<string, string>;
};

const now: Lock = {
  schema_version: "me-v3-result-lock.1",
  note: "결과지 화면 1차 동결. 문장만 고치면 `RESULT_COPY_VERSION` 만 올리고,"
    + " 칸이나 절이 바뀌면 `RESULT_MODEL_VERSION`, 화면 구조가 바뀌면"
    + " `RESULT_UI_VERSION` 을 올린다. 채점 판본은 이 가운데 무엇으로도"
    + " 올리지 않는다",
  versions: {
    result_ui_version: RESULT_UI_VERSION,
    result_copy_version: RESULT_COPY_VERSION,
    result_model_version: RESULT_MODEL_VERSION,
    item_bank_version: ITEM_BANK_VERSION,
    scoring_version: SCORING_VERSION,
  },
  guards: Object.fromEntries(GUARDS),
  files: Object.fromEntries(FILES.map((f) => [f, sha(f)])),
};

if (process.env.RESULT_FREEZE === "update") {
  writeFileSync(LOCK, `${JSON.stringify(now, null, 1)}\n`);
  console.log(`  적었다  ${LOCK} — 파일 ${FILES.length}벌`);
  console.log(`  판본    ${RESULT_UI_VERSION} · ${RESULT_COPY_VERSION} · ${RESULT_MODEL_VERSION}`);
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
  ? `\n결과지가 ${bad.length}곳 달라졌다. 일부러 고쳤다면 `
    + "`result/version.ts` 의 판본을 올리고 `RESULT_FREEZE=update npm run v3:result:freeze`."
  : `\n결과지 동결 OK — ${RESULT_UI_VERSION} · ${RESULT_COPY_VERSION}`
    + ` · ${RESULT_MODEL_VERSION} · 파일 ${FILES.length}벌 그대로.`);
process.exitCode = bad.length ? 1 : 0;
