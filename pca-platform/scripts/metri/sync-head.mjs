/**
 * 영문 Head Code 의 몸통을 한국 쪽 두 파일에 복사한다.
 *
 * 디자인은 두 사이트가 한 벌이어야 한다. 두 벌을 손으로 따로 고치면 반드시
 * 한쪽만 고쳐지는 날이 오고, 그날 두 사이트가 갈린다. 고칠 곳은 영문판
 * 하나이고, 이 명령이 나머지를 맞춘다. 맞았는지는 `npm run copy:audit` 이
 * 따로 센다 — 맞추는 쪽과 확인하는 쪽이 같으면 확인이 아니다.
 *
 *   npm run metri:head
 */
import { readFileSync, writeFileSync } from "node:fs";

const MARK = "<!-- Two font links.";
const FROM = "sites/careermetri/imweb-en/00-head-code.html";
const TO = [
  "sites/careermetri/imweb/00-head-code.html",
  "sites/careermetri/imweb/00b-head-code-as-widget.html",
];

const src = readFileSync(FROM, "utf8");
const i = src.indexOf(MARK);
if (i < 0) throw new Error(`${FROM} 에서 "${MARK}" 를 못 찾았다`);
const body = src.slice(i);

for (const path of TO) {
  const cur = readFileSync(path, "utf8");
  const j = cur.indexOf(MARK);
  if (j < 0) throw new Error(`${path} 에서 "${MARK}" 를 못 찾았다`);
  // 머리말은 그 파일 것을 그대로 둔다. 붙이는 곳이 서로 다르기 때문이다
  const head = cur.slice(0, j);
  writeFileSync(path, head + body, "utf8");
  console.log(`${path}  ${cur === head + body ? "그대로" : "맞춤"}`);
}
