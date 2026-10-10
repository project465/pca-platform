/**
 * 측정체계를 **얼었다고 선언하고 그 선언을 매번 지킨다**(`ME_V3_MEASUREMENT_FREEZE_1`).
 *
 * 앞 회차까지 측정 쪽 검사는 열두 자리에 흩어져 있었다. 흩어져 있으면
 * `지금도 그대로인가` 를 묻는 사람이 열두 명령을 차례로 치고 그 가운데
 * 하나를 빠뜨린다. 그래서 **UI 작업이 측정체계를 건드렸는지**를 한 줄로
 * 묻는 자리를 둔다.
 *
 * 이 파일이 다루는 것은 셋이다.
 *
 *   1. 판본 넷과 측정 층 파일의 지문을 동결 기록과 글자로 견준다
 *   2. 사람 열두 벌을 실제로 다시 돌려 Core 지문을 견준다
 *   3. **UI 동결 파일과 측정 동결 파일이 겹치지 않는지** 센다
 *
 * 셋째가 이 파일을 두는 가장 큰 까닭이다. 겹쳐 있으면 홈의 카드 하나를
 * 옮긴 날 측정 동결이 깨지고, 그러면 사람이 `UI 때문이니 다시 적자` 로
 * 넘긴다. 한 번 그렇게 넘기면 그 동결은 아무것도 막지 않는다.
 *
 * **여기서 세지 않는 것을 적어 둔다.** 받고 쓰지 않는 문항(dead item)과
 * 꾸며 낸 응답과 고르게 답한 응답은 `v3:measure` 와 `v3:gaming` 이 센다.
 * 그 둘을 여기서 다시 돌리면 같은 판정이 두 곳에 생기고, 어느 날 갈린다.
 * 이 파일이 그 둘에 대해 세는 것은 **그 명령이 아직 사슬에 있는가**뿐이다.
 *
 *   npm run v3:freeze:measure
 *   MEASURE_FREEZE=write npm run v3:freeze:measure   동결 기록을 다시 적는다
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { core as coreEntry, registry } from "../src/lib/me-v3/core-registry";
import { coreOnly, load, score } from "../src/lib/me-v3/scoring/engine";
import { expand, stable, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { ITEM_BANK_VERSION, SCORING_VERSION } from "../src/lib/me-v3/scoring/version";
import { RESULT_MODEL_VERSION } from "../src/lib/me-v3/result/version";
import { constructRegistry } from "../src/lib/me-v3/measurement/registry";
import type { Answer, Submission } from "../src/lib/me-v3/scoring/types";

const LABEL = "ME_V3_MEASUREMENT_FREEZE_1";
const LOCK = "sites/pca-platform/assessment/ME_V3/measurement-lock.json";
const PERSONAS = "sites/pca-platform/assessment/ME_V3/personas.json";
const J3_SNAP = "sites/pca-platform/assessment/ME_V3/j3-before.json";

/**
 * 동결이 덮는 자리. **화면 파일이 한 줄도 없다.**
 *
 * 응답을 받는 방식(문항 은행과 보기)과 그것을 판단으로 바꾸는 방식(채점)과
 * 그 판단을 담는 모양(결과 모델)까지다. 결과지의 **문장과 화면**은 여기
 * 없다: 문장을 고치면 `me-v3-result-copy` 가 올라가고 그것은 판정이 아니다.
 */
const WATCH = [
  /* 응답을 받는 방식 */
  "sites/pca-platform/content/me-v3-2-items.json",
  "sites/pca-platform/content/me-v3-2-items-blueprint.json",
  "sites/pca-platform/content/me-v3-2-constructs.json",
  "sites/pca-platform/content/me-v3-2-domains.json",
  "sites/pca-platform/content/me-v3-2-checklists.json",
  "sites/pca-platform/content/me-v3-2-taxonomy.json",
  "sites/pca-platform/content/me-v3-2-relations.json",
  "sites/pca-platform/content/industry-packs-v2.json",
  "sites/pca-platform/content/role-packs-v2.json",
  /* 판단으로 바꾸는 방식 */
  "src/lib/me-v3/scoring/engine.ts",
  "src/lib/me-v3/scoring/axes.ts",
  "src/lib/me-v3/scoring/ownership.ts",
  "src/lib/me-v3/scoring/normalize.ts",
  "src/lib/me-v3/scoring/quality.ts",
  "src/lib/me-v3/scoring/zones.ts",
  "src/lib/me-v3/scoring/version.ts",
  "src/lib/me-v3/measurement/registry.ts",
  /* 판단을 담는 모양. **문장과 화면은 아니다** */
  "src/lib/me-v3/result/model.ts",
  "src/lib/me-v3/result/build.ts",
].filter((p) => existsSync(p));

/** UI 동결이 덮는 자리. 측정 동결과 겹치면 걸린다 */
const UI_LOCKS = [
  "sites/pca-platform/assessment/ME_V3/ui-lock.json",
  "sites/pca-platform/assessment/ME_V3/result-lock.json",
  "sites/pca-platform/assessment/ME_V3/workspace-lock.json",
];

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

const sha = (p: string): string =>
  createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);

const coreCode = process.env.CORE
  ?? registry().cores.filter((c) => c.status === "building")[0].code;
const loaded = load(coreCode);

type Item = {
  item_id: string; module: string; response_scale: string | null;
  evidence_axis: string | null; options: string[] | null;
  option_values: (number | null)[] | null;
};
const items = loaded.bank.items as unknown as Item[];

console.log(`  core  ${coreCode} · ${loaded.bank.assessment_version}`);
console.log(`  동결  ${LABEL}\n`);

/* ── 동결 기록을 적는다 ───────────────────────────────────────────── */
type Lock = {
  label: string; at: string;
  versions: Record<string, string>;
  files: Record<string, string>;
};
const now: Lock = {
  label: LABEL,
  at: new Date().toISOString().slice(0, 10),
  versions: {
    core: coreCode,
    item_bank: ITEM_BANK_VERSION,
    scoring: SCORING_VERSION,
    result_model: RESULT_MODEL_VERSION,
  },
  files: Object.fromEntries(WATCH.map((p) => [p, sha(p)])),
};

if (process.env.MEASURE_FREEZE === "write") {
  writeFileSync(LOCK, JSON.stringify({
    note: `${LABEL}. 응답을 받는 방식과 판단으로 바꾸는 방식과 판단을 담는`
      + " 모양의 지문이다. **화면 파일이 한 줄도 없다**: UI 를 고쳤다고 이"
      + " 기록이 흔들리면 사람이 `UI 때문이니 다시 적자` 로 넘기고, 한 번"
      + " 넘기면 그 동결은 아무것도 막지 않는다. 측정을 일부러 고치는"
      + " 회차에만 MEASURE_FREEZE=write 로 다시 적고 판본을 함께 올린다.",
    ...now,
  }, null, 2) + "\n");
  console.log(`  적었다  ${LOCK} — 파일 ${WATCH.length}벌\n`);
}

if (!existsSync(LOCK)) {
  console.log(`  동결 기록이 없다. \`MEASURE_FREEZE=write npm run v3:freeze:measure\``);
  process.exit(1);
}
const was = JSON.parse(readFileSync(LOCK, "utf8")) as Lock;

/* ── 1. 판본 넷 ──────────────────────────────────────────────────── */
const vdiff = Object.keys(now.versions)
  .filter((k) => was.versions[k] !== now.versions[k]);
ok("측정 판본 넷이 동결 기록과 같다", vdiff.length === 0,
   vdiff.length
     ? vdiff.map((k) => `${k} ${was.versions[k]} → ${now.versions[k]}`).join(" · ")
     : Object.values(now.versions).join(" · "));

/* ── 2. 측정 층 파일의 지문 ──────────────────────────────────────── */
const fdiff = WATCH.filter((p) => was.files[p] !== now.files[p]);
const gone = Object.keys(was.files).filter((p) => !WATCH.includes(p));
ok("측정 층 파일의 지문이 그대로다", fdiff.length === 0 && gone.length === 0,
   fdiff.length || gone.length
     ? [...fdiff.map((p) => `바뀜 ${p}`), ...gone.map((p) => `없어짐 ${p}`)].join(" · ")
     : `파일 ${WATCH.length}벌`);

/* ── 3. 소유 네 단계 ─────────────────────────────────────────────── */
const lv = loaded.bank.level_options;
ok("보기 넷의 문면과 수가 그대로다",
   lv.length === 4 && lv[0] === "없다" && lv[3] === "내가 정하고 그 결과가 쓰였다",
   lv.join(" / "));

/* ── 4. 보기 자리 번호의 뜻 ──────────────────────────────────────── */
/* **이것을 지문으로만 세지 않는다.** 지문은 파일이 바뀐 것을 말해 주고
   자리 번호의 뜻이 그대로인지는 말해 주지 않는다 */
const OWN_ORDER = ["NONE", "RECEIVED", "DID", "DECIDED_USED"];
const ownSrc = readFileSync("src/lib/me-v3/scoring/ownership.ts", "utf8");
const ownSeen = OWN_ORDER.filter((k) => ownSrc.includes(k));
ok("소유 네 단계의 이름이 그대로다", ownSeen.length === 4, ownSeen.join(" < "));

/* ── 5. 사람 열두 벌 Core 지문 ───────────────────────────────────── */
const fx = JSON.parse(readFileSync(PERSONAS, "utf8")) as { personas: Fixture[] };
const snap = existsSync(J3_SNAP)
  ? (JSON.parse(readFileSync(J3_SNAP, "utf8")) as
      { personas: Record<string, { core: string }> }).personas
  : null;
const pdiff: string[] = [];
for (const f of fx.personas) {
  const mine = stable(coreOnly(score(expand(f, coreCode), loaded)));
  if (snap?.[f.id] && snap[f.id].core !== mine) pdiff.push(f.id);
}
ok("사람 열두 벌의 Core 판정이 기준선과 같다", snap !== null && pdiff.length === 0,
   snap === null ? "기준선이 없다" : pdiff.length ? `달라진 벌: ${pdiff.join(" ")}`
     : `열두 벌 가운데 ${fx.personas.length}벌 대조`);

/* ── 6. 산업·역할 문항이 Core 를 바꾸지 않는다 ──────────────────── */
/**
 * 문서에 적어 두는 것으로는 지켜지지 않으므로 **실제로 다시 돌린다.**
 * 팩 문항을 바닥에서 천장까지 바꿔 넣고 Core 지문이 글자까지 같은지 본다.
 */
const base = fx.personas.find((f) => f.industry && f.role) ?? fx.personas[0];
const sub0 = expand(base, coreCode);
const packItems = items.filter((i) =>
  /^(INDUSTRY|ROLE)_/.test(i.item_id) && i.response_scale === "L0~L3");
const bump = (lvl: number): Submission => {
  const a: Record<string, Answer> = { ...sub0.answers };
  for (const i of packItems) a[i.item_id] = { kind: "level", index: lvl };
  return { ...sub0, answers: a };
};
const core0 = stable(coreOnly(score(bump(0), loaded)));
const core3 = stable(coreOnly(score(bump(3), loaded)));
ok("팩 문항을 바닥에서 천장까지 바꿔도 Core 판정이 같다", core0 === core3,
   `팩 문항 ${packItems.length}개 · 지문 ${core0.length === core3.length ? "같음" : "다름"}`);

/* ── 7. 산업을 갈아 끼워도 Core 가 같다 ─────────────────────────── */
const inds = [...new Set(items.map((i) => i.item_id.match(/^(INDUSTRY_[A-Z]+_V2)/)?.[1])
  .filter((x): x is string => Boolean(x)))];
const swapped = inds.slice(0, 2).map((code) =>
  stable(coreOnly(score({ ...sub0, industry: code } as Submission, loaded))));
ok("산업을 갈아 끼워도 Core 판정이 같다",
   swapped.length < 2 || swapped[0] === swapped[1],
   inds.slice(0, 2).join(" ↔ "));

/* ── 8. 2026-10-10 에 문면을 고친 문항의 저장 계약 ──────────────── */
/**
 * 문면을 고친 문항이 **저장된 응답의 뜻을 바꾸지 않았는지**를 센다.
 * 바뀌면 안 되는 것은 넷이다: 보기 · 자리 수 · 척도 · 축. 이 넷이 그대로면
 * 옛 응답을 다시 해석할 일이 없고 migration 도 필요하지 않다.
 */
const cj = items.find((i) => i.item_id === "CJ_GIVEN_REV");
ok("문면을 고친 문항의 보기와 척도와 축이 그대로다",
   Boolean(cj) && cj!.response_scale === "L0~L3" && cj!.evidence_axis === "J3"
     && (cj!.options?.length ?? 0) === 4 && cj!.option_values === null,
   cj ? `${cj.response_scale} · ${cj.evidence_axis} · 보기 ${cj.options?.length}` : "없다");

/* ── 9. 채점과 결과 모델이 문면을 읽지 않는다 ───────────────────── */
/**
 * 이것이 §2 의 `저장값 의미 불변` 을 **구조로** 보장하는 자리다. 문면을
 * 읽는 코드가 한 줄도 없으면, 문면을 고쳐도 같은 응답이 같은 판정으로
 * 간다. 주석은 걷어 내고 본다: 이 저장소는 까닭을 주석으로 남기는 쪽이라
 * 세면 맞는 기록을 지우라고 요구하게 된다.
 */
const strip = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*\*.*$/gm, "");
const readsWording = WATCH
  .filter((p) => p.startsWith("src/lib/me-v3/scoring/")
    || p.startsWith("src/lib/me-v3/result/"))
  .filter((p) => /\b(wording|stage_wording)\b/.test(strip(readFileSync(p, "utf8"))));
ok("채점과 결과 모델이 문항 문면을 읽지 않는다", readsWording.length === 0,
   readsWording.length ? readsWording.join(" ") : "문면을 읽는 줄 0");

/* ── 10. construct 가 비어 있는 문항이 없다 ─────────────────────── */
const reg = constructRegistry(coreCode);
const known = new Set(reg.items.map((r) => r.item_id));
const unknown = items.filter((i) => !known.has(i.item_id));
ok("construct 가 적히지 않은 문항이 없다", unknown.length === 0,
   unknown.length ? unknown.slice(0, 5).map((i) => i.item_id).join(" ")
     : `문항 ${items.length}개 · 등록부 ${reg.items.length}줄`);

/* ── 11. 코드가 글자로 적은 문항 번호가 은행에 있다 ─────────────── */
/**
 * 같은 탈이 두 번 났다: `DEEP-J8`·`PROBE-J4` 가 for 문의 몸통을 영원히
 * 건너뛰게 만들고, `CJ_PROBLEM` 이 역방향 짝 규칙을 한 번도 세우지 않았다.
 * **지난 판본의 번호도 산 번호로 센다**: 그 판본으로 응시한 사람의
 * 결과지를 다시 만들 수 있어야 한다.
 */
const alive = new Set<string>(items.map((i) => i.item_id));
for (const c of registry().cores) {
  for (const f of (c as { frozen?: { files?: { items?: string } }[] }).frozen ?? []) {
    const p = f.files?.items && `sites/pca-platform/content/${f.files.items}`;
    if (!p || !existsSync(p)) continue;
    for (const i of (JSON.parse(readFileSync(p, "utf8")) as { items: Item[] }).items) {
      alive.add(i.item_id);
    }
  }
}
const ID = /\b(?:CJ|UG|MS|PHD|PD|CN|CF|TG|TR|XF|G)_[A-Z0-9_]{2,}\b/g;
const bad: string[] = [];
for (const p of WATCH.filter((x) => x.endsWith(".ts"))) {
  for (const m of strip(readFileSync(p, "utf8")).match(ID) ?? []) {
    if (!alive.has(m) && !bad.includes(m)) bad.push(m);
  }
}
ok("코드가 글자로 적은 문항 번호가 전부 은행에 있다", bad.length === 0,
   bad.length ? bad.join(" ") : `산 번호 ${alive.size}개`);

/* ── 12. 결과지가 굳은 결과를 다시 계산하지 않는다 ──────────────── */
/**
 * 옛 응답이 **다시 해석되는 길이 있는가**를 코드로 묻는다. 결과지 route 가
 * 채점 엔진을 부르지 않으면, 그때 낸 결과지는 판본이 올라가도 그대로다.
 * 실제로 이 기계의 굳은 결과 여덟 줄이 문항 은행 판본 셋에 걸쳐 있고
 * 셋 다 그대로 열린다(`db/checks/v3_measurement_impact.sql`).
 */
const RESULT_ROUTES = [
  "src/app/v3/[attemptId]/result/page.tsx",
  "src/app/me/results/page.tsx",
].filter((p) => existsSync(p));
const recompute = RESULT_ROUTES.filter((p) =>
  /from\s+"[^"]*scoring\/engine"/.test(strip(readFileSync(p, "utf8"))));
ok("결과지가 채점 엔진을 다시 부르지 않는다", recompute.length === 0,
   recompute.length ? recompute.join(" ") : `읽는 쪽 ${RESULT_ROUTES.length}곳`);

/* ── 13. UI 동결과 측정 동결이 겹치지 않는다 ────────────────────── */
/**
 * §4 가 금지한 것을 **구조로** 막는 자리다. 화면 파일이 측정 동결 목록에
 * 들어 있으면 홈의 카드 하나를 옮긴 날 측정 동결이 깨지고, 사람이 그것을
 * `UI 때문` 으로 넘긴다. 한 번 넘기면 그 동결은 아무것도 막지 않는다.
 */
const uiFiles = new Set<string>();
for (const p of UI_LOCKS) {
  if (!existsSync(p)) continue;
  const j = JSON.parse(readFileSync(p, "utf8")) as { files?: Record<string, string> };
  for (const k of Object.keys(j.files ?? {})) uiFiles.add(k);
}
const overlap = WATCH.filter((p) => uiFiles.has(p));
ok("UI 동결 파일과 측정 동결 파일이 겹치지 않는다", overlap.length === 0,
   overlap.length ? overlap.join(" ") : `화면 ${uiFiles.size}벌 · 측정 ${WATCH.length}벌`);

/* ── 14. 여기서 세지 않는 것을 세는 명령이 사슬에 있다 ──────────── */
/**
 * 받고 쓰지 않는 문항과 꾸며 낸 응답과 고르게 답한 응답은 `v3:measure` 와
 * `v3:gaming` 이 센다. **그 판정을 여기서 다시 하지 않는다**: 두 곳에서
 * 따로 판정하면 어느 날 갈리고, 갈린 날 둘 다 못 믿는다. 이 줄이 세는
 * 것은 그 명령이 아직 사슬에 있는가뿐이고, 그것이 조용히 빠지는 일을
 * 막는다.
 */
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as
  { scripts: Record<string, string> };
const chain = pkg.scripts["v3:all"] ?? "";
const NEED = ["v3:measure", "v3:gaming", "v3:registry", "v3:j3", "v3:result"];
const missing = NEED.filter((n) => !pkg.scripts[n] || !chain.includes(`run ${n} `)
  && !chain.endsWith(`run ${n}`));
ok("dead item 과 사람 벌을 세는 명령이 사슬에 남아 있다", missing.length === 0,
   missing.length ? `빠진 명령: ${missing.join(" ")}` : NEED.join(" · "));

console.log(`\n  확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
if (!fail) {
  console.log(`\n  ${LABEL} — 측정체계가 동결 기록과 같다.`);
  console.log(`  받고 쓰지 않는 문항과 사람 열세 벌은 v3:measure 와 v3:gaming 이 센다.`);
}
process.exit(fail ? 1 : 0);
