/**
 * KUS 학과 표를 문서로 뽑는다. **손으로 적지 않는다**: 등록부(fixture)와 상태 함수가
 * 정한 값을 그대로 옮긴다. 미리보기 문을 닫은 채(운영 규칙)와 연 채(시연) 두 칸을 함께 적는다.
 *
 *   APP_ENV=dev V3_CAMPUS_FIXTURE=scripts/fixtures/campus-kus.json npx tsx scripts/kus/departments-doc.ts > docs/kus/DEPARTMENTS.md
 */
import { kusDepartments, kusUniversity, MODE_KO } from "../../src/lib/kus/program";

const u = kusUniversity();
if (!u) { console.error("KUS fixture 가 없다"); process.exit(2); }
const cat = u.catalogs[0];
const live = kusDepartments(u);
process.env.V3_PREVIEW_OPEN = "CS_CORE_V1,EE_CORE_V1";
const demo = new Map(kusDepartments(u).map((d) => [d.code, d.mode]));
const lines = [
  "# 고려대학교 세종캠퍼스 학과 · 전공 등록부 (R1)",
  "",
  "`scripts/kus/departments-doc.ts` 가 `scripts/fixtures/campus-kus.json` 에서 뽑았다. 손으로 고치지 않는다.",
  "",
  `- Catalog: \`${cat.catalog_code}\` (${cat.catalog_year}학년도 · ${cat.label}) · 확인 상태 \`${cat.verification}\``,
  `- 출처: ${cat.source_name}`,
  `- 확인 메모: ${cat.verification_note ?? ""}`,
  `- 근거 파일: \`${cat.evidence_file ?? ""}\` (검색 요지 · 원문 미대조)`,
  "",
  "| 단과대학 | 학부 | 학과·전공 | 코드 | Core | 운영 규칙 | 시연(미리보기) | 메모 |",
  "|---|---|---|---|---|---|---|---|",
  ...live.map((d) => `| ${d.college} | ${d.unit ?? ""} | ${d.name} | \`${d.code}\` | ${d.core_code ?? "—"} | ${MODE_KO[d.mode]} | ${MODE_KO[demo.get(d.code) ?? "PREPARING"]} | ${(d.note ?? "").replace(/\|/g, "/")} |`),
  "",
  `운영 규칙으로 열린 자리 ${live.filter((d) => d.mode === "LIVE").length} · 시연으로만 열리는 자리 ${[...demo.values()].filter((m) => m === "DEMO").length} · 전체 ${live.length}`,
  "",
  "**제외한 것**",
  ...(u.excluded_units ?? []).map((x) => `- ${x.where ? `${x.where} ` : ""}${x.name}: ${x.why}`),
];
console.log(lines.join("\n"));
process.exit(0);
