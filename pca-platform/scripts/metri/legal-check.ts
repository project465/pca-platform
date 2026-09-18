/**
 * 약관 셋을 올릴 수 있는 상태인지 본다.
 *
 * **지어낸 사업자 정보 하나가 통신판매업 신고 심사를 되돌린다.** 그래서
 * 비운 칸은 대괄호로 남겨 두고, 이 검사가 그 수를 세어 준다. 0 이 되면
 * 올릴 수 있다는 뜻이고, 0 이 아니면 무엇이 없는지 이름으로 말한다.
 *
 *   npx tsx scripts/metri/legal-check.ts
 */
import { readFileSync, readdirSync } from "node:fs";

const DIR = "sites/careermetri/legal";
const files = readdirSync(DIR).filter((f) => f.endsWith(".md")).sort();

/** 약관에 반드시 있어야 하는 문장. 없으면 법이 요구하는 칸이 빈 것이다 */
const MUST: { file: string; needle: string; why: string }[] = [
  { file: "01-terms.md", needle: "J1700020220007",
    why: "직업정보제공사업 신고번호 — 직업안정법" },
  { file: "01-terms.md", needle: "5명 미만",
    why: "익명 집계에서 개인이 특정되지 않게 하는 선" },
  { file: "01-terms.md", needle: "무료",
    why: "전자상거래법 제17조 제6항 — 시용 제공이 없으면 환불 거절이 무효" },
  { file: "02-privacy.md", needle: "제21조",
    why: "개인정보보호법 제21조 — 파기 근거" },
  { file: "02-privacy.md", needle: "시행령 제6조",
    why: "전자상거래법 시행령 제6조 — 5년 보존 근거" },
  { file: "02-privacy.md", needle: "만 14세",
    why: "개인정보보호법 제22조의2" },
  { file: "02-privacy.md", needle: "주민등록번호",
    why: "수집하지 않는다는 명시" },
  { file: "03-refund.md", needle: "제21조의2",
    why: "시용 제공 방법을 정한 시행령" },
  { file: "03-refund.md", needle: "기간 제한 없음",
    why: "응시 전은 법보다 넓게 준다는 약속" },
  { file: "03-refund.md", needle: "위약금을 받지 않습니다",
    why: "기간권 해지 시 위약금 없음" },
];

let bad = 0;

console.log("=== 비운 칸 ===");
let blanks = 0;
for (const f of files) {
  const t = readFileSync(`${DIR}/${f}`, "utf8");
  const found = [...new Set(t.match(/\[[가-힣A-Za-z ]+\]/g) ?? [])];
  blanks += found.length;
  console.log(found.length ? `  ${f}  ${found.join(" ")}` : `  ${f}  없다`);
}
console.log(blanks ? `  → ${blanks}종이 비어 있다. 값이 생기면 채운다` : "  → 다 채웠다");

console.log("\n=== 반드시 있어야 하는 문장 ===");
for (const m of MUST) {
  const t = readFileSync(`${DIR}/${m.file}`, "utf8");
  const ok = t.includes(m.needle);
  if (!ok) bad++;
  console.log(`  ${ok ? "있다  " : "없다  "} ${m.file}  "${m.needle}"  ${m.why}`);
}

console.log("\n=== 약관과 코드가 같은 말을 하는지 ===");
const code = readFileSync("src/lib/refund.ts", "utf8");
const refund = readFileSync(`${DIR}/03-refund.md`, "utf8");
const pairs: [string, boolean, string][] = [
  ["업그레이드 기간 7일", /WINDOW_DAYS\s*=\s*7/.test(code) && refund.includes("7일 내 전액"),
   "refund.ts 의 WINDOW_DAYS 와 규정의 7일"],
  ["처음 연 때가 선", code.includes("first_viewed_at") && refund.includes("처음 연 때"),
   "report_grants.first_viewed_at"],
  ["위약금 없음", code.includes("위약금을 떼지 않는다") && refund.includes("위약금을 받지 않습니다"),
   "기간권 일할 환불"],
];
for (const [name, ok, how] of pairs) {
  if (!ok) bad++;
  console.log(`  ${ok ? "같다  " : "다르다" } ${name}  (${how})`);
}

console.log(bad ? `\n${bad}개가 어긋났다.` : "\n약관 OK. 비운 칸만 채우면 올릴 수 있다.");
process.exit(bad ? 1 : 0);
