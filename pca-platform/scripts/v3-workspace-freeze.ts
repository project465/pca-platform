/**
 * 작업공간 화면 동결 대조.
 *
 * 검사 화면과 결과지와 같은 방식이다. 쪽을 이루는 파일의 지문을
 * `workspace-lock.json` 과 견주고, 판본이 그대로인지 본다. 파일을
 * **일부러** 고쳤으면 판본을 올리고 `WORKSPACE_FREEZE=update` 로 다시
 * 적는다.
 *
 * **여기서 세는 것은 `무엇이 바뀌었는가` 뿐이다.** 잘 만들어졌는가는
 * 다른 검사가 센다. 동결 조건과 그것을 지키는 검사를 함께 적어 두는
 * 까닭은, 동결이 그 검사들이 모두 푸른 날에만 할 일이기 때문이다.
 *
 * **한 가지를 더 센다.** 작업공간은 검사 엔진 위에 올라가는 층이라
 * 그 아래의 판정에 닿으면 안 된다. 그래서 작업공간 파일에 채점 모듈을
 * 들고 오는 줄이 있는지 본다. 문서에 적어 두는 것으로는 지켜지지
 * 않는다(계열 값이 채점에 안 들어가는 것을 검사로 막은 것과 같다).
 *
 *   npm run v3:workspace
 *   WORKSPACE_FREEZE=update npm run v3:workspace
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  WORKSPACE_COPY_VERSION, WORKSPACE_UI_VERSION,
} from "../src/lib/me-v3/workspace-version";
import { ALIAS_OK, CM_NAV, navKnown } from "../src/app/me/nav";

const LOCK = "sites/pca-platform/assessment/ME_V3/workspace-lock.json";

/** 작업공간을 이루는 파일. 여기 없는 파일을 고치면 이 검사가 모른다 */
const FILES = [
  /* 껍데기와 띠 */
  "src/app/me/platform.css",
  "src/app/me/shell.tsx",
  /* 적다 만 것을 들고 나가지 않게 막는 자리(규격 §4) */
  "src/app/me/unsaved.tsx",
  "src/app/me/nav.ts",
  "src/app/me/layout.tsx",
  "src/app/me/actions.ts",
  /* 지금 */
  "src/app/me/page.tsx",
  "src/app/cores/page.tsx",
  /* 내 커리어 */
  "src/app/me/results/page.tsx",
  "src/app/me/state/page.tsx",
  "src/app/me/next/page.tsx",
  "src/app/me/next/actions.ts",
  "src/app/me/experience/page.tsx",
  "src/app/me/experience/new/page.tsx",
  "src/app/me/experience/new/steps.tsx",
  "src/app/me/experience/actions.ts",
  "src/app/me/recompute/page.tsx",
  "src/app/me/recompute/apply.tsx",
  "src/app/me/recompute/actions.ts",
  "src/app/me/gap/page.tsx",
  /* 탐색 */
  "src/app/me/explore/page.tsx",
  "src/app/me/region/page.tsx",
  "src/app/me/region/actions.ts",
  "src/app/me/apply/page.tsx",
  "src/app/me/apply/actions.ts",
  /* 기타 */
  "src/app/me/track/page.tsx",
  /* 계정 — 같은 껍데기를 쓰므로 같은 목록에 든다 */
  "src/app/my/layout.tsx",
  "src/app/my/page.tsx",
  "src/app/my/login-methods.tsx",
  "src/app/my/account/page.tsx",
  "src/app/my/results/page.tsx",
  "src/app/my/assessments/page.tsx",
  "src/app/my/evidence/page.tsx",
  "src/app/my/applications/page.tsx",
  "src/components/sf/older-note.tsx",
  "src/app/me/track/actions.ts",
  "src/app/me/jobs/page.tsx",
  /* 읽는 자리와 계측 */
  "src/lib/me-v3/platform.ts",
  "src/lib/me-v3/workspace-events.ts",
  "src/lib/me-v3/workspace-version.ts",
];

/** 동결 조건과 그것을 지키는 검사 */
const GUARDS: [string, string][] = [
  ["작업공간이 검사 판정을 다시 하지 않는다", "v3:workspace (채점 모듈 들여오기 0건) · v3:recompute"],
  ["굳은 결과와 지금 값이 화면에서 갈린다", "v3:owner · 사람 눈 (결과 기록 쪽)"],
  ["내부 코드가 손님 화면에 0건", "v3:copy"],
  ["가짜 숫자가 없고 자료가 없으면 빈 상태다", "사람 눈 · v3:smoke"],
  ["남의 기록이 보이지 않는다", "v3:isolation"],
  ["쓰는 class 이름에 CSS 가 있다", "v3:workspace (이름 대조)"],
  ["320px 에서 가로로 밀리지 않는다", "v3:smoke (캡처)"],
  ["열어서 500 이 나는 쪽이 없다", "v3:smoke"],
];

/**
 * 작업공간이 들여와서는 안 되는 것.
 *
 * 판정은 `scoring/` 과 `result/` 가 하고 작업공간은 그 결과를 읽는
 * `platform.ts` 하나만 지난다. 화면이 채점 모듈을 직접 부르면 **같은
 * 판단을 UI 를 위해 새로 만드는 길**이 열린다.
 */
const BANNED = ["me-v3/scoring/engine", "me-v3/scoring/zone", "me-v3/scoring/axis"];

const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");

/** 주석은 걷어 내고 본다. 금지한 이름을 왜 금지했는지 적을 수 있어야 한다 */
function code(p: string): string {
  return readFileSync(p, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

type Lock = {
  schema_version: string; note: string;
  versions: Record<string, string>;
  guards: Record<string, string>;
  files: Record<string, string>;
};

const now: Lock = {
  schema_version: "careermatri-workspace-lock.1",
  note: "작업공간 1차 동결. 문장만 고치면 `WORKSPACE_COPY_VERSION` 만"
    + " 올리고, 쪽이나 띠의 묶음이 바뀌면 `WORKSPACE_UI_VERSION` 을 올린다."
    + " 검사 판본과 결과지 판본은 이 가운데 무엇으로도 올리지 않는다:"
    + " 작업공간은 기존 검사 엔진 위에 올라가는 사용자 경험 층이다",
  versions: {
    workspace_ui_version: WORKSPACE_UI_VERSION,
    workspace_copy_version: WORKSPACE_COPY_VERSION,
  },
  guards: Object.fromEntries(GUARDS),
  files: Object.fromEntries(FILES.map((f) => [f, sha(f)])),
};

if (process.env.WORKSPACE_FREEZE === "update") {
  writeFileSync(LOCK, `${JSON.stringify(now, null, 1)}\n`);
  console.log(`  적었다  ${LOCK} — 파일 ${FILES.length}벌`);
  console.log(`  판본    ${WORKSPACE_UI_VERSION} · ${WORKSPACE_COPY_VERSION}`);
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

/* 화면이 채점을 직접 부르지 않는다 */
for (const f of FILES) {
  if (f.startsWith("src/lib/")) continue;
  const src = code(f);
  for (const b of BANNED) {
    if (src.includes(b)) bad.push(`화면이 채점 모듈을 들여온다: ${f} → ${b}`);
  }
}

/*
 * **쓰는 이름이 CSS 에 있는지 본다.**
 *
 * 이 저장소에서 같은 탈이 여섯 번 났다(`.btn` · `--sf-r` · `.lg` ·
 * `empty` · `industries` · `OC*`). CSS 는 모르는 class 를 조용히 넘기고,
 * 그러면 쪽은 200 으로 멀쩡히 뜨고 생김새만 없다.
 */
const css = readFileSync("src/app/me/platform.css", "utf8");
const used = new Set<string>();
for (const f of FILES) {
  if (!f.endsWith(".tsx")) continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bcm-[a-z0-9-]+/g)) used.add(m[0]);
}
for (const name of [...used].sort()) {
  if (!new RegExp(`\\.${name}\\b`).test(css)) bad.push(`CSS 에 없는 이름: .${name}`);
}

/*
 * **한 route 가 남의 메뉴를 켜지 않는다.**
 *
 * `/me/apply` 가 쪽에서 `/me/jobs` 를 넘기고 그 별칭이 `/me/track` 으로
 * 다시 접혀서, **`지원한 곳` 을 열면 `Track` 이 켜졌다.** 별칭의 왼쪽은
 * 메뉴에 제 줄이 없는 주소여야 하고, 쪽이 넘기는 `active` 는 메뉴나
 * 별칭에 있는 주소여야 한다.
 */
for (const a of ALIAS_OK) {
  if (!a.ok) bad.push(`별칭이 메뉴에 있는 줄을 가린다: ${a.from} → ${a.to}`);
}
for (const f of FILES) {
  if (!f.endsWith(".tsx")) continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/<CmShell\s+active="([^"]+)"/g)) {
    if (!navKnown(m[1])) bad.push(`메뉴에 없는 active: ${f} → ${m[1]}`);
    /* **메뉴에 제 줄이 있는데 남의 줄을 넘기지 않는다.** 쪽의 주소와
       넘긴 `active` 가 둘 다 메뉴에 있는데 서로 다르면 그 쪽은 남의
       줄을 켠다 */
    const own = `/${f.replace(/^src\/app\//, "").replace(/\/page\.tsx$/, "")}`;
    if (CM_NAV.some((n) => n.href === own) && m[1] !== own) {
      bad.push(`쪽이 남의 줄을 켠다: ${own} 이 ${m[1]} 을 넘긴다`);
    }
  }
}

/*
 * **면이 바뀌어도 같아야 하는 것에 이름이 있다.**
 *
 * 토큰이 네 벌(`--sf-*` · `--q-*` · `--r-*` · `--cm-*`)이라 새 자리를
 * 만드는 사람이 색을 직접 적기 쉽다. 공용 이름 여덟이 `surface.css` 에
 * 서 있는지만 센다 — **네 벌을 하나로 합치지 않는다**(합치면 세 쪽이
 * 한꺼번에 틀어진다).
 */
{
  const sf = readFileSync("src/app/surface.css", "utf8");
  const want = ["--ui-surface", "--ui-bg", "--ui-text", "--ui-text-2",
    "--ui-border", "--ui-accent", "--ui-radius", "--ui-read"];
  const miss = want.filter((w) => !sf.includes(`${w}:`));
  if (miss.length) bad.push(`공용 토큰이 없다: ${miss.join(" ")}`);
}

for (const x of bad) console.log(`  걸림  ${x}`);
console.log(bad.length
  ? `\n작업공간이 ${bad.length}곳 달라졌다. 일부러 고쳤다면 `
    + "`src/lib/me-v3/workspace-version.ts` 의 판본을 올리고 "
    + "`WORKSPACE_FREEZE=update npm run v3:workspace`."
  : `\n작업공간 동결 OK — ${WORKSPACE_UI_VERSION} · ${WORKSPACE_COPY_VERSION}`
    + ` · 파일 ${FILES.length}벌 그대로 · 쓰는 이름 ${used.size}개가 전부 CSS 에 있다.`);
process.exitCode = bad.length ? 1 : 0;
