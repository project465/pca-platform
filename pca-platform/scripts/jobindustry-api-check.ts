/**
 * 잡인더스트리 자체 API 자리 시험(`npm run jobindustry:api`). 네트워크 · DB 없이 돈다.
 *
 * 1. 열쇠가 없으면 화면을 읽는다
 * 2. **열쇠가 먼저 들어와도** API 자리를 채우기 전(`JI_API_READY=false`)에는 화면을 읽는다
 * 3. API 공고 하나가 지금 저장 꼴(`RawPosting`)로 바뀐다: 번호 · 원문 링크 · 날짜
 * 4. 제목도 본문도 없는 공고는 넣지 않는다
 */
import { JI_API_READY, fromApi } from "../src/lib/jobs/jobindustry-api";
import { JI_SOURCE, jiSource } from "../src/lib/jobs/jobindustry";

let bad = 0;
function check(name: string, ok: boolean, got?: unknown) {
  console.log(`  ${ok ? "통과" : "걸림"}  ${name}${ok ? "" : ` — ${JSON.stringify(got)}`}`);
  if (!ok) bad += 1;
}

delete process.env.JOBINDUSTRY_API_KEY;
check("열쇠가 없으면 화면을 읽는다", jiSource() === "page", jiSource());
process.env.JOBINDUSTRY_API_KEY = "시험용-가짜-값";
check("API 자리가 비어 있는 동안은 열쇠가 있어도 화면을 읽는다",
  JI_API_READY || jiSource() === "page", { JI_API_READY, src: jiSource() });
delete process.env.JOBINDUSTRY_API_KEY;

const row = fromApi({
  id: "41234", board: "487", title: " 양극재 개발 연구원 (박사) ", bodyText: "자격 요건\n- 박사 학위",
  images: [], closesOn: "2026.11.20", postedOn: "26-11-01", address: " 대전 ", url: null,
}, JI_SOURCE);
check("번호는 화면의 idx 자리로 간다", row?.sourceRef === "41234", row);
check("원문 링크가 없으면 게시판 · 번호로 만든다",
  row?.url === "https://www.jobindustry.co.kr/487/?bmode=view&idx=41234", row?.url);
check("날짜는 YYYY-MM-DD 로", row?.closesOn === "2026-11-20" && row?.postedOn === "2026-11-01", row);
check("앞뒤 빈칸을 걷는다", row?.title === "양극재 개발 연구원 (박사)" && row?.address === "대전", row);
check("마감이 상시면 null", fromApi({ id: "1", board: "430", title: "t", bodyText: "", images: [], closesOn: "상시", postedOn: null, address: null, url: "https://www.jobindustry.co.kr/430/?bmode=view&idx=1" }, JI_SOURCE)?.closesOn === null);
check("제목도 본문도 없으면 넣지 않는다",
  fromApi({ id: "2", board: "430", title: " ", bodyText: "", images: ["https://x/a.png"], closesOn: null, postedOn: null, address: null, url: null }, JI_SOURCE) === null);

console.log(`\n  확인 8가지 — 걸림 ${bad}`);
process.exit(bad ? 1 : 0);
