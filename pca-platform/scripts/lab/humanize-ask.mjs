/**
 * **사다리 문항의 문면을 묻는 말로 바꾼다.** 한 번만 돌리고, 두 번 돌려도
 * 같은 결과가 나온다(이미 `나요?` 로 끝나는 문면은 건드리지 않는다).
 *
 * 바꾸는 것은 **종결 한 토막**이다. 앞의 장면과 동작과 대상은 한 글자도
 * 손대지 않는다: 그 자리가 그 Core 의 판단이고, 측정 의미를 들고 있다.
 *
 *   …본 적이 있다      →  …봤나요?
 *   …본 경험이 있다     →  …봤나요?
 *   …ㄴ 경험이 있다     →  …ㄴ 적 있나요?
 *   …ㄴ 적이 있다       →  …ㄴ 적 있나요?
 *
 * 왜 묻는 말인가. 보기 넷이 `해본 적 없음`부터 `기준부터 직접 정해봄`까지
 * **정도를 답하는 자리**인데 문면이 `…한 적이 있다` 로 단정하면 응시자가
 * 같은 말을 두 번 읽는다. 상담 자리에서 사람이 묻는 말은 `…해 봤나요?` 다.
 *
 * **보기와 자리 번호와 축과 척도는 건드리지 않는다.** 저장되는 값이
 * `{kind:"level", index:0~3}` 이고 그 번호의 뜻이 그대로이므로 채점과
 * 판정과 굳은 결과가 달라지지 않는다.
 *
 *   node scripts/lab/humanize-ask.mjs            바꿀 것만 센다
 *   APPLY=yes node scripts/lab/humanize-ask.mjs  적는다
 */
import { readFileSync, writeFileSync } from "node:fs";

const APPLY = process.env.APPLY === "yes";
const DIR = "sites/pca-platform/content";
const CORES = JSON.parse(readFileSync(`${DIR}/major-cores.json`, "utf8")).cores;
const CAMPUS = readFileSync(`${DIR}/campus-universities.json`, "utf8");

/** 종결을 바꾸는 규칙. 위에서부터 처음 맞는 하나만 쓴다 */
const RULES = [
  [/본 적이 있다$/, "봤나요?"],
  [/본 경험이 있다$/, "봤나요?"],
  [/경험이 있다$/, "적 있나요?"],
  [/적이 있다$/, "적 있나요?"],
  /* EE 의 J7 둘째 문항 여덟만 과거 단정으로 끝난다 */
  [/다시 쟀다$/, "다시 재 봤나요?"],
];

/** 묻는 말로 이미 서 있는 자리. 타계열 맥락은 고르는 문항이다 */
const ALREADY = /^XF_/;

function ask(s) {
  if (typeof s !== "string" || !s) return s;
  if (/나요\?$/.test(s)) return s;
  for (const [re, to] of RULES) if (re.test(s)) return s.replace(re, to);
  return s;
}

let changed = 0; let left = [];
for (const c of CORES) {
  if (!c.files?.items || !CAMPUS.includes(`"${c.code}"`)) continue;
  const ip = `${DIR}/${c.files.items}`;
  const bank = JSON.parse(readFileSync(ip, "utf8"));
  /** 바뀐 문면을 팩 파일에도 같은 값으로 적는다 */
  const map = new Map();
  for (const it of bank.items) {
    if ((it.options ?? []).length !== 4) continue;
    const was = it.wording;
    const now = ask(was);
    if (now !== was) { it.wording = now; changed++; }
    /* **팩 파일에 적는 값은 바뀐 것만이 아니다.** 바뀐 것만 넘기면 두 번째
       실행에서 map 이 비고, 그러면 팩이 옛 문면을 들고 남는다 */
    map.set(it.item_id, it.wording);
    if (it.stage_wording && typeof it.stage_wording === "object") {
      for (const k of Object.keys(it.stage_wording)) {
        it.stage_wording[k] = ask(it.stage_wording[k]);
      }
    } else if (typeof it.stage_wording === "string") {
      it.stage_wording = ask(it.stage_wording);
    }
    if (!ALREADY.test(it.item_id) && !/나요\?$/.test(it.wording)) left.push(`${c.code} ${it.item_id} ${it.wording}`);
  }
  if (APPLY) writeFileSync(ip, `${JSON.stringify(bank, null, 1)}\n`);

  for (const kind of ["industry", "role"]) {
    const f = c.packs?.[kind];
    if (!f) continue;
    const body = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
    for (const p of body.packs) {
      for (const i of p.items) {
        const now = map.get(i.id);
        if (now && now !== i.ask) i.ask = now;
      }
    }
    if (APPLY) writeFileSync(`${DIR}/${f}`, `${JSON.stringify(body, null, 1)}\n`);
  }
}
console.log(`${APPLY ? "적었다" : "바꿀 것"} — 문면 ${changed}개`);
if (left.length) {
  console.log(`묻는 말로 안 바뀐 자리 ${left.length}개`);
  for (const l of left.slice(0, 20)) console.log(`  ${l}`);
}
