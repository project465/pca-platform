/**
 * **한 종결 꼴에 쏠린 자리를 두 꼴로 가른다.**
 *
 * 묻는 말로 바꾸고 나니 한 Core 안에서 끝 아홉 자가 같은 문항이 최대
 * 10.8% 였다. 상담 자리에서 사람은 같은 말을 쉰 번 되풀이하지 않는다:
 * `…정한 적 있나요?` 와 `…정했나요?` 를 번갈아 쓴다. **뜻이 같은 두 꼴**로
 * 갈라 어느 꼴도 그 Core 사다리 문항의 5% 를 넘지 않게 한다.
 *
 * 바꾸는 것은 종결 한 토막뿐이고, 어느 문항을 바꿀지는 **문항 번호 차례**로
 * 정한다(같은 자료면 같은 결과가 나온다).
 *
 *   node scripts/lab/humanize-vary.mjs
 *   APPLY=yes node scripts/lab/humanize-vary.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const APPLY = process.env.APPLY === "yes";
const DIR = "sites/pca-platform/content";
const REG = JSON.parse(readFileSync(`${DIR}/major-cores.json`, "utf8")).cores;
const CAMPUS = readFileSync(`${DIR}/campus-universities.json`, "utf8");

/** 뜻이 같은 둘째 꼴. 앞에서부터 처음 맞는 하나만 쓴다 */
const PAIR = [
  [/맡아서 직접 정했나요\?$/, "맡아서 직접 결정했나요?"],
  [/정해 봤나요\?$/, "정했나요?"],
  [/정한 적 있나요\?$/, "정했나요?"],
  [/남겨 봤나요\?$/, "남겼나요?"],
  [/남긴 적 있나요\?$/, "남겼나요?"],
  [/대조해 봤나요\?$/, "대조했나요?"],
  [/견주어 봤나요\?$/, "견줬나요?"],
  [/적어 봤나요\?$/, "적었나요?"],
  [/적은 적 있나요\?$/, "적어 두었나요?"],
  [/고친 적 있나요\?$/, "고쳤나요?"],
  [/좁힌 적 있나요\?$/, "좁혔나요?"],
  [/가른 적 있나요\?$/, "갈랐나요?"],
  [/골라 봤나요\?$/, "골랐나요?"],
  [/바꿔 봤나요\?$/, "바꿨나요?"],
  [/세운 적 있나요\?$/, "세웠나요?"],
  [/맞춰 봤나요\?$/, "맞췄나요?"],
  [/잡은 적 있나요\?$/, "잡았나요?"],
  [/옮겨 적은 적 있나요\?$/, "옮겨 적었나요?"],
  [/옮겨 적어 두었나요\?$/, "옮겨 적었나요?"],
  [/적어 두었나요\?$/, "적어 뒀나요?"],
  [/남겨 두었나요\?$/, "남겨 뒀나요?"],
  [/문서로 남겼나요\?$/, "문서로 정리했나요?"],
  [/기록으로 남겼나요\?$/, "기록에 남겼나요?"],
];

const other = (s) => {
  for (const [re, to] of PAIR) if (re.test(s)) return s.replace(re, to);
  return null;
};

let moved = 0; const stuck = [];
for (const c of REG) {
  if (!c.files?.items || !CAMPUS.includes(`"${c.code}"`)) continue;
  const ip = `${DIR}/${c.files.items}`;
  const bank = JSON.parse(readFileSync(ip, "utf8"));
  const lad = bank.items.filter((i) => (i.options ?? []).length === 4);
  const cap = Math.floor(lad.length * 0.05);
  const byTail = new Map();
  for (const it of lad) {
    const k = it.wording.slice(-9);
    if (!byTail.has(k)) byTail.set(k, []);
    byTail.get(k).push(it);
  }
  for (const [tail, group] of byTail) {
    if (group.length <= cap) continue;
    /* **넘치는 만큼만 옮기지 않는다.** 한 꼴이 스물둘이고 한도가 열다섯일 때
       일곱만 옮기면 그 꼴이 딱 한도에 붙어 서고, 문항 하나가 늘면 다시
       걸린다. 절반을 옮겨 두 꼴이 비슷하게 선다 */
    const want = Math.ceil(group.length / 2);
    const sorted = group.sort((a, b) => a.item_id.localeCompare(b.item_id));
    let n = 0;
    for (const it of sorted) {
      if (n >= want) break;
      const now = other(it.wording);
      if (!now) { stuck.push(`${c.code} ${it.item_id} …${tail}`); continue; }
      it.wording = now; n++; moved++;
      if (it.stage_wording && typeof it.stage_wording === "object") {
        for (const k of Object.keys(it.stage_wording)) {
          const v = other(it.stage_wording[k]);
          if (v) it.stage_wording[k] = v;
        }
      }
    }
  }
  if (APPLY) writeFileSync(ip, `${JSON.stringify(bank, null, 1)}\n`);

  /** 팩 파일을 같은 값으로 맞춘다 */
  const map = new Map(bank.items.map((i) => [i.item_id, i.wording]));
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
console.log(`${APPLY ? "적었다" : "옮길 것"} — ${moved}개`);
if (stuck.length) {
  console.log(`둘째 꼴이 없는 자리 ${stuck.length}개`);
  for (const s of [...new Set(stuck)].slice(0, 20)) console.log(`  ${s}`);
}
