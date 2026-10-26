/**
 * 견본 결과지(`/sample`)를 **지금 파는 검사의 실제 엔진으로** 떠 둔다.
 *
 * 견본을 손으로 적어 두면 제품을 고친 날 견본만 옛것으로 남는다. 그래서
 * 지어낸 응시자 한 사람(그 Core 의 fixture 가운데 하나)을 채점 엔진과 결과
 * 엔진에 끝까지 돌리고, 나온 결과 모델을 그대로 파일로 남긴다. 화면은 산
 * 사람의 결과지와 **같은 한 벌**(`v3/[attemptId]/result/body.tsx`)로 그린다.
 *
 * **담긴 값은 전부 지어낸 것이다.** 실제 응시자의 자료를 쓰지 않으므로 이
 * 파일은 로그인 없이 열린다.
 *
 * **STANDARD 학부생을 쓴다.** BASIC 은 등급 차이를 못 보여 주고, PRO 를
 * 통째로 보여 주면 대학원생 사례라 학부생이 자기 일로 읽지 않는다.
 *
 *   npm run v3:sample            # 다시 뜬다
 *   CHECK=1 npm run v3:sample    # 엔진이 바뀌어 견본이 옛것이 됐는지만 본다
 */
import { readFileSync, writeFileSync } from "node:fs";
import { core as coreEntry, defaultCore } from "../src/lib/me-v3/core-registry";
import { load, score } from "../src/lib/me-v3/scoring/engine";
import { expand, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../src/lib/me-v3/result/build";
import { industryChoices, roleChoices } from "../src/lib/me-v3/runtime/session";
import { RESULT_MODEL_VERSION } from "../src/lib/me-v3/result/version";

const OUT = "src/lib/me-v3/sample/standard.json";
const PERSONA = process.env.PERSONA ?? "P03";

const core = process.env.CORE ?? defaultCore();
const FIX = coreEntry(core).fixtures?.personas;
if (!FIX) throw new Error(`${core} 의 fixtures.personas 가 등록부에 없습니다`);
const fx = JSON.parse(readFileSync(FIX, "utf8")) as {
  personas: Fixture[]; cases?: { pack?: { industry?: string; role?: string } };
};
const f = fx.personas.find((p) => p.id === PERSONA);
if (!f) throw new Error(`${PERSONA} 가 ${FIX} 에 없습니다`);

/* 산업과 직무를 하나씩 고른 사람으로 둔다. 고르지 않으면 견본에서 그 절이
   비고, 사는 사람은 그 절이 무엇을 하는지 못 본다. **고른 팩은 판정을
   바꾸지 않는다**(`v3:scoring` 의 변형 검사가 매번 본다) */
const person: Fixture = {
  ...f,
  industry: f.industry ?? fx.cases?.pack?.industry ?? null,
  role: f.role ?? fx.cases?.pack?.role ?? null,
};

const loaded = load(core);
const snapshot = score(expand(person, core), loaded);
const model = buildResult(snapshot, loaded, {
  packs: {
    industries: industryChoices(core).map((x) => x.code),
    roles: roleChoices(core).map((x) => x.code),
  },
});

const out = {
  note: "견본 결과지. 지어낸 응시자 한 사람을 실제 엔진으로 돌린 값이다. 손으로 고치지 말고 npm run v3:sample 로 다시 뜬다",
  persona: PERSONA,
  core,
  result_model_version: RESULT_MODEL_VERSION,
  model,
};
const text = JSON.stringify(out, null, 1) + "\n";

if (process.env.CHECK) {
  let old = "";
  try { old = readFileSync(OUT, "utf8"); } catch { /* 없으면 옛것이다 */ }
  if (old !== text) {
    console.log(`  걸림  견본이 지금 엔진과 다릅니다 — npm run v3:sample 로 다시 뜨십시오`);
    process.exit(1);
  }
  console.log(`  통과  견본이 지금 엔진과 같습니다 (${PERSONA} · ${model.tier} · ${RESULT_MODEL_VERSION})`);
} else {
  writeFileSync(OUT, text);
  console.log(`  ${OUT} · ${PERSONA} ${model.tier} · 영역 ${model.domains.length} · 할 일 ${model.actions.length}`);
}
