/**
 * 전주대 시연 트랙이 이어지는 Major Core 가 **AI 쪽을 실제로 얼마나 묻는가.**
 *
 * 말로 적지 않고 그 Core 의 파일에서 센다: 상태(열림·성숙도) · 문항 수 ·
 * 영역 · 갈래 · 그리고 AI 하위 주제 아홉이 문항 문면·체크리스트·영역
 * 세부에 몇 번 나오는가. **0 이면 그 검사는 그 주제를 재지 않는다.**
 * 이름이 비슷하다고 잰다고 적지 않는다.
 *
 * DB 를 읽지 않는다.
 *
 *   V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json npx tsx scripts/jju-track-audit.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { jjuUniversity, tracksOf } from "../src/lib/jju/program";

const C = "sites/pca-platform/content";
const reg = JSON.parse(readFileSync(`${C}/major-cores.json`, "utf8")) as {
  cores: { code: string; name_ko: string; status: string; open_to_students?: boolean | null; maturity?: string;
    files?: Record<string, string>; specializations?: { code: string; name: string; lead_domains?: string[]; emphasis?: unknown }[] }[];
};

/** AI 하위 주제. 열쇠말은 한국어 문면에서 그 주제를 가리키는 말이다 */
const TOPICS: { id: string; name: string; keys: RegExp }[] = [
  { id: "ML", name: "기계학습 모델 학습·평가", keys: /기계학습|모형|모델 학습|학습 데이터|과적합|교차 검증|하이퍼파라미터|검증 세트|평가 지표|예측 모델/ },
  { id: "DL", name: "딥러닝·신경망", keys: /딥러닝|신경망|합성곱|역전파/ },
  { id: "LLM", name: "LLM·생성형 AI 응용", keys: /LLM|대규모 언어|언어 모델|생성형|프롬프트|임베딩|검색 증강|RAG/ },
  { id: "CV", name: "컴퓨터 비전", keys: /컴퓨터 비전|영상 인식|객체 검출|이미지 분류/ },
  { id: "DATA", name: "데이터 처리·시각화·통계", keys: /전처리|데이터 처리|시각화|통계|결측|이상치|분포/ },
  { id: "MLOPS", name: "모델 배포·운영(MLOps)", keys: /모델 배포|모델 서빙|추론 서버|MLOps|모델 버전|드리프트/ },
  { id: "EDGE", name: "엣지·온디바이스 AI", keys: /온디바이스|엣지 AI|추론 가속|경량화 모델|양자화/ },
  { id: "ROBOT", name: "로봇 인지·자율 동작", keys: /자율 주행|자율 비행|경로 계획|SLAM|인지 모듈|강화학습|로봇/ },
  { id: "AIOT", name: "센서 데이터 수집·IoT", keys: /센서|IoT|사물인터넷|데이터 수집 장치/ },
];

function bank(core: (typeof reg.cores)[number]) {
  const f = core.files ?? {};
  const read = (k: string) => { try { return readFileSync(`${C}/${f[k]}`, "utf8"); } catch { return ""; } };
  const items = (() => { try { return JSON.parse(read("items")).items as { item_id: string; technical_domain: string | null; wording: string; module: string }[]; } catch { return []; } })();
  const tax = (() => { try { return JSON.parse(read("taxonomy")).technical_domains as { code: string; name?: string; name_ko?: string; subareas?: string[] }[]; } catch { return []; } })();
  return { items, tax, text: { items: items.map((i) => i.wording).join("\n"), checklists: read("checklists") + read("checklist_additions"), tax: JSON.stringify(tax) } };
}

const u = jjuUniversity();
if (!u) throw new Error("V3_CAMPUS_FIXTURE 가 없다(전주대는 시연 fixture 로만 선다)");
const tracks = tracksOf(u).filter((t) => t.cohort.code === "JJU_2026");
const out: string[] = [];
const P = (s = "") => out.push(s);
P("# 전주대 트랙 × Major Core 감사");
P("");
P("`npx tsx scripts/jju-track-audit.ts` 가 만든다. **손으로 고치지 않는다**: 수는 전부 그 Core 의 파일에서 센 값이다.");
P("");
P("| 트랙(시연용) | 잇는 검사 | 갈래 | 상태 | 학생 공개 | 성숙도 | 문항 | 영역 |");
P("|---|---|---|---|---|---|---|---|");
const seen = new Map<string, ReturnType<typeof bank>>();
for (const t of tracks) {
  const c = reg.cores.find((x) => x.code === t.core_code);
  if (!c) { P(`| ${t.short} | — | — | — | — | — | — | — |`); continue; }
  if (!seen.has(c.code)) seen.set(c.code, bank(c));
  const b = seen.get(c.code)!;
  P(`| ${t.short} | ${c.name_ko} (${c.code}) | ${t.spec_name ?? "없음"} | ${c.status} | ${c.open_to_students === false ? "닫힘(시연 서버만)" : "열림"} | ${c.maturity ?? "—"} | ${b.items.length} | ${b.tax.length} |`);
}
P("");
P("## AI 하위 주제가 그 검사의 어디에 몇 번 나오는가");
P("");
P("**열쇠말로 센 근사치다.** 0 은 그 주제를 가리키는 말이 문항·체크리스트·영역 세부 어디에도 없다는 뜻이고, 1 이상은 그 말이 나온다는 뜻일 뿐 그 주제를 충분히 잰다는 뜻이 아니다. 전공자 검토가 이 표를 대신하지 않는다.");
P("");
P(`| 주제 | ${[...seen.keys()].join(" | ")} |`);
P(`|---|${[...seen.keys()].map(() => "---").join("|")}|`);
const notMeasured: Record<string, string[]> = {};
for (const tp of TOPICS) {
  const cells = [...seen.entries()].map(([code, b]) => {
    const n = (s: string) => (s.match(new RegExp(tp.keys.source, "g")) ?? []).length;
    const a = n(b.text.items), k = n(b.text.checklists), x = n(b.text.tax);
    if (a + k + x === 0) (notMeasured[code] ??= []).push(tp.name);
    return a + k + x === 0 ? "**0 · 재지 않음**" : `문항 ${a} · 체크리스트 ${k} · 영역 ${x}`;
  });
  P(`| ${tp.name} | ${cells.join(" | ")} |`);
}
P("");
for (const [code, b] of seen) {
  const ai = b.tax.filter((d) => /기계학습|데이터|신호처리|제어|임베디드|자동화/.test(d.name_ko ?? d.name ?? ""));
  P(`### ${code} 에서 AI 와 가까운 영역`);
  for (const d of ai) {
    const n = b.items.filter((i) => i.technical_domain === d.code).length;
    P(`- ${d.code} ${d.name_ko ?? d.name} — 문항 ${n}개${d.subareas?.length ? ` · 세부: ${d.subareas.join(", ")}` : ""}`);
  }
  P(`- 재지 않는 AI 주제: ${(notMeasured[code] ?? []).join(" · ") || "없음"}`);
  P("");
}
mkdirSync("docs/jju", { recursive: true });
writeFileSync("docs/jju/TRACK_CORE_AUDIT.md", out.join("\n") + "\n");
writeFileSync("docs/jju/qa/not-measured.json", JSON.stringify(notMeasured, null, 1));
console.log(out.join("\n"));
