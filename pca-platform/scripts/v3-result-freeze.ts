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

/**
 * 결과지를 이루는 파일. 여기 없는 파일을 고치면 이 검사가 모른다.
 *
 * **결과 모델 둘(`result/model.ts` · `result/build.ts`)이 이 목록에서
 * 빠졌다.** 그 둘은 `ME_V3_MEASUREMENT_FREEZE_1` 이 들고
 * (`v3:freeze:measure`), 한 파일이 두 동결에 걸려 있으면 화면을 고친 날
 * 측정 동결이 같이 흔들린다. 그러면 사람이 `UI 때문이니 다시 적자` 로
 * 넘기고, 한 번 넘기면 그 동결은 아무것도 막지 않는다. **판본은 여전히
 * 함께 적는다**: 아래 `versions` 에 `result_model_version` 이 그대로 있어서
 * 모델이 올라간 것을 이 기록도 같이 안다.
 */
const FILES = [
  "src/app/v3/result.css",
  /* **활자 여섯 단의 정본도 이 화면의 일부다.** 크기와 여백과 둥글기의 값이
     `surface.css` 의 `--ui-*` 한 자리에 있고 세 면이 그것을 별명으로 받는다.
     그 파일을 어느 동결 목록에도 두지 않아서, 본문을 16 에서 19.9 로 올린 날
     **세 동결이 그 파일을 모르는 채로 통과했다**(`chains.ts` 와 `icon.tsx` 와
     같은 자리다). 한 벌을 셋이 함께 적는 것이 맞다: 그 값을 고치면 검사지와
     결과지와 작업공간이 **같이** 바뀌므로 판본도 셋이 같이 올라야 한다 */
  "src/app/surface.css",
  "src/app/v3/[attemptId]/result/page.tsx",
  "src/app/v3/[attemptId]/result/fold.tsx",
  "src/app/v3/[attemptId]/result/disclose.tsx",
  "src/app/v3/[attemptId]/result/save.tsx",
  "src/app/v3/[attemptId]/result/track.tsx",
  /* 곁근거를 여는 전환 줄. **학생이 읽는 글이고 누르는 자리인데 이 목록에
     없었다**: R18 에서 그 줄의 말과 모양을 바꾸고서야 드러났다. 목록에
     없는 파일은 고쳐도 동결이 모르는 채로 통과한다 */
  "src/app/v3/[attemptId]/result/second.tsx",
  "src/lib/me-v3/result/text.ko.ts",
  "src/lib/me-v3/result/say.ts",
  "src/lib/me-v3/result/josa.ts",
  "src/lib/me-v3/result/version.ts",
  /* 갈래가 적어 둔 사례와 읽는 차례를 꺼내는 자리. **판정에 닿지 않지만**
     학생이 읽는 글을 고르므로 이 동결이 덮는다 */
  /* 카드 세부 한 줄을 학생의 말로 적는 자리. **판정에 닿지 않지만**
     학생이 읽는 글을 고르므로 이 동결이 덮는다 */
  "src/lib/me-v3/result/tile-sub.ts",
  /* **학생이 읽는 말의 정본**(CROSS-CORE §1 · §6). 결과지와 작업공간이
     같은 object 를 읽으므로 **두 동결이 함께 덮는다**: 한쪽만 적어 두면
     그 사전을 고친 날 다른 쪽이 모르는 채로 통과한다(`surface.css` 와
     같은 자리다) */
  "src/lib/me-v3/student/copy.ts",
  "src/lib/me-v3/student/icon.ts",
  "src/lib/me-v3/student/index.ts",
  "src/lib/me-v3/student/state.ts",
  /* R34: 공통 판단·학위 묶음의 이름을 Core 마다 드는 사전 */
  "src/lib/me-v3/student/common.ts",
  "src/lib/me-v3/result/spec-view.ts",
  "src/lib/me-v3/result/meta.ts",
  /* 시각화 넷과 그것이 읽을 값. **결과지가 그리는 것이라 이 동결이
     덮는다**: 새 파일을 목록에 적지 않으면 그 파일을 고친 날 동결이
     모르는 채로 통과한다 */
  "src/app/v3/[attemptId]/result/charts.tsx",
  /* hero 의 그림. **값을 그리지 않지만 학생이 가장 먼저 보는 면**이라
     이 동결이 덮는다 */
  "src/app/v3/[attemptId]/result/art.tsx",
  "src/lib/me-v3/result/chart-data.ts",
  "src/lib/me-v3/runtime/domain-facts.ts",
  /* 영역마다의 작성 차례. **학생이 읽는 글인데 이 목록에 없었다**: 사람이
     짚어 세 자리를 고칠 때까지 고쳐도 아무 기록이 흔들리지 않았다
     (PCU HUMAN REVIEW FINAL CORRECTION §4) */
  "src/lib/me-v3/result/chains.ts",
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
