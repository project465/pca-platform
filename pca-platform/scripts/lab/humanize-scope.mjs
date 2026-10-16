/**
 * **직장에 다녀야 답할 수 있는 자리를 학생이 답할 수 있게 바꾼다.**
 *
 * 역할팩이 묻는 것은 `그 자리에서 가진 권한과 범위` 이고 그 설계는 그대로
 * 둔다. 바꾸는 것은 **그 범위를 가리키는 말**이다: `권한을 가지고` 는
 * 직책이 있어야 쓰는 말이고, 팀 과제에서 한 토막을 맡은 학생은 같은 일을
 * 하고도 `해 본 적 없음` 을 고른다.
 *
 *   …을 가를 권한을 가지고 그것을 정한 적 있나요?
 *   →  …을 가르는 몫을 맡아서 직접 정했나요?
 *
 * 그 밖에 학교에 없는 자리를 가리키는 말을 바꾼다(`사내` · `부서` ·
 * `거래처` · `고객사` · `발주처` · `결재`). **산업팩이 그 산업의 판단을
 * 묻는 설계는 그대로다**: 가리키는 자리의 이름만 학생이 아는 말로 적는다.
 *
 *   node scripts/lab/humanize-scope.mjs
 *   APPLY=yes node scripts/lab/humanize-scope.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const APPLY = process.env.APPLY === "yes";
const DIR = "sites/pca-platform/content";
const REG = JSON.parse(readFileSync(`${DIR}/major-cores.json`, "utf8")).cores;
const CAMPUS = readFileSync(`${DIR}/campus-universities.json`, "utf8");

/** `-ㄹ` 관형형을 `-는` 관형형으로. 불규칙이 섞여 있어 손으로 적는다 */
const ADNOM = {
  가를: "가르는", 고를: "고르는", 바꿀: "바꾸는", 정할: "정하는",
  끊을: "끊는", 확정할: "확정하는", 좁힐: "좁히는", 쓸: "쓰는",
  막을: "막는", 자를: "자르는", 뺄: "빼는", 세울: "세우는",
  반송할: "반송하는", 고칠: "고치는", 나눌: "나누는", 올릴: "올리는",
  깎을: "깎는", 멈출: "멈추는", 돌려보낼: "돌려보내는", 정리할: "정리하는",
};

/** 뒤 토막. `그것을` 은 바로 앞에서 이미 가리킨 말이라 덜어 낸다 */
const TAIL = {
  "그것을 정한 적 있나요?": "직접 정했나요?",
  "그것을 정했나요?": "직접 정했나요?",
  "정해 봤나요?": "직접 정했나요?",
  "직접 정했나요?": "직접 정했나요?",
  "그것을 좁혀 정한 적 있나요?": "그 범위를 좁혀 정했나요?",
  "그것을 바꾼 적 있나요?": "직접 바꿨나요?",
  "그것을 끊은 적 있나요?": "직접 끊었나요?",
  "그것을 적은 적 있나요?": "직접 적었나요?",
  "그것을 낸 적 있나요?": "직접 냈나요?",
  "정한 적 있나요?": "직접 정했나요?",
};

/** 학교에 없는 자리를 가리키는 말 */
const WORD = [
  [/사내 /g, "내부 "], [/사내에서/g, "조직에서"],
  [/부서/g, "팀"], [/거래처/g, "거래 상대"], [/고객사/g, "의뢰한 쪽"],
  [/발주처/g, "맡긴 쪽"], [/내 결재로/g, "내 판단으로"],
  [/결재선/g, "승인 절차"], [/다른 직원이/g, "다른 사람이"],
];

function scope(s) {
  if (typeof s !== "string") return s;
  let out = s;
  const m = /([가-힣]+) 권한을 가지고 (.*)$/.exec(out);
  if (m && ADNOM[m[1]]) {
    const tail = TAIL[m[2]] ?? m[2];
    out = `${out.slice(0, m.index)}${ADNOM[m[1]]} 몫을 맡아서 ${tail}`;
  }
  for (const [re, to] of WORD) out = out.replace(re, to);
  return out;
}

let n = 0;
for (const c of REG) {
  if (!c.files?.items || !CAMPUS.includes(`"${c.code}"`)) continue;
  const ip = `${DIR}/${c.files.items}`;
  const bank = JSON.parse(readFileSync(ip, "utf8"));
  for (const it of bank.items) {
    const was = it.wording;
    const now = scope(was);
    if (now !== was) { it.wording = now; n++; }
    if (it.stage_wording && typeof it.stage_wording === "object") {
      for (const k of Object.keys(it.stage_wording)) {
        it.stage_wording[k] = scope(it.stage_wording[k]);
      }
    }
    if (typeof it.gloss === "string") it.gloss = scope(it.gloss);
  }
  if (APPLY) writeFileSync(ip, `${JSON.stringify(bank, null, 1)}\n`);

  const map = new Map(bank.items.map((i) => [i.item_id, i.wording]));
  for (const kind of ["industry", "role"]) {
    const f = c.packs?.[kind];
    if (!f) continue;
    const body = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
    for (const p of body.packs) {
      for (const i of p.items) {
        const now = map.get(i.id);
        if (now && now !== i.ask) i.ask = now;
        if (typeof i.gloss === "string") i.gloss = scope(i.gloss);
      }
    }
    if (APPLY) writeFileSync(`${DIR}/${f}`, `${JSON.stringify(body, null, 1)}\n`);
  }
}
console.log(`${APPLY ? "적었다" : "바꿀 것"} — 문면 ${n}개`);
