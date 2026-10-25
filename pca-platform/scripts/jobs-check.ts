/**
 * 채용 공고 통계가 지킬 것을 센다. **로컬 DB 에서만 돈다.**
 *
 *   npx tsx scripts/jobs-check.ts
 *
 * 넣는 공고는 전부 `source = 'zz-check'` 이고 끝에서 지운다. 실제 공고
 * 표본이 아니라 규칙을 재는 재료다: 여기서 나온 수를 시장으로 읽지 않는다.
 */
import { registry, coreFile } from "../src/lib/me-v3/core-registry";
import { mapPosting, regionOf } from "../src/lib/jobs/map";
import { ingest, parseCsv, isoDate } from "../src/lib/jobs/ingest";
import { parseDetail, parseList } from "../src/lib/jobs/work24";
import { demandOf, MIN_TOTAL, MIN_CELL } from "../src/lib/jobs/stats";
import { query } from "../src/lib/db";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\/([^@/]*@)?(127\.0\.0\.1|localhost)(:\d+)?\/|^postgres(ql)?:\/\/\//.test(URL_)) {
  console.error(`로컬 DB 가 아니다: ${URL_.replace(/:[^:@/]*@/, ":***@")}`); process.exit(2);
}

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, note = "") => {
  if (cond) pass += 1; else fail += 1;
  console.log(`  ${cond ? "통과" : "걸림"}  ${name}${note ? ` — ${note}` : ""}`);
};
const SRC = "zz-check";

async function main() {
  await query(`DELETE FROM v3_job_postings WHERE source = $1`, [SRC]);

  /* 1. 제목으로 전공을 단다 */
  const cores = registry().cores.filter((c) => c.status === "building" || c.status === "live").map((c) => c.code);
  let right = 0, wrong: string[] = [], none = 0, total = 0;
  for (const core of cores) {
    const aliases = (coreFile<{ job_aliases?: { posting_name: string }[] }>(core, "taxonomy").job_aliases ?? []);
    for (const a of aliases.slice(0, 4)) {
      total += 1;
      const m = mapPosting(`${a.posting_name} 신입 채용`, "");
      if (m.core === core) right += 1;
      else if (m.core === null) none += 1;
      else wrong.push(`${a.posting_name}: ${core}→${m.core}`);
    }
  }
  ok("직무명 제목이 그 전공으로 달린다", right / total >= 0.8,
    `맞음 ${right} · 비움 ${none} · 다른 전공 ${wrong.length} / ${total}`);
  ok("다른 전공으로 잘못 다는 일이 5% 아래다", wrong.length / total < 0.05, wrong.slice(0, 4).join(" · "));

  /* 2. 갈리지 않으면 비운다 */
  ok("어느 전공인지 알 수 없는 공고는 비운다", mapPosting("단순 사무 보조 아르바이트", "성실하신 분").core === null);

  /* 3. 권역 */
  ok("주소 앞머리로 권역을 가른다",
    regionOf("세종특별자치시 한누리대로") === "KR-CHUNGCHEONG" && regionOf("서울 강남구") === "KR-CAPITAL"
    && regionOf("부산광역시") === "KR-YEONGNAM" && regionOf("") === null);
  ok("날짜 꼴 셋을 읽는다", isoDate("20261021") === "2026-10-21" && isoDate("2026.10.1") === "2026-10-01" && isoDate("모름") === null);
  ok("고용24 의 두 자리 연도(26-10-21)와 '채용시까지' 를 읽는다",
    isoDate("26-10-21") === "2026-10-21" && isoDate("채용시까지 26-11-19") === "2026-11-19"
    && isoDate("채용시까지") === null && isoDate("2026-10-21") === "2026-10-21",
    `${isoDate("26-10-21")} · ${isoDate("채용시까지 26-11-19")} · ${isoDate("채용시까지")}`);

  /* 3-1. 고용24 응답 꼴. **꼴을 흉내 낸 응답이다**(이 환경에서 고용24 가 열리지 않아 실제
     응답으로 확인하지 못했다). 열쇠를 받은 날 `runWork24` 가 돌려주는 seenFields 로 칸
     이름을 다시 맞춘다. 여기서는 읽는 쪽이 회사 이름을 들고 오지 않는지와 번호 없는 줄을
     버리는지를 본다 */
  const listXml = `<?xml version="1.0" encoding="UTF-8"?><wantedRoot><total>2</total>
<wanted><wantedAuthNo>K151612610210001</wantedAuthNo><company>(주)가나다정밀</company><title>기구설계 엔지니어 채용</title>
<region>세종특별자치시 조치원읍</region><regDt>26-10-21</regDt><closeDt>채용시까지 26-11-19</closeDt>
<wantedInfoUrl>https://www.work24.go.kr/wk/a/b/1500/empDetailAuthView.do?wantedAuthNo=K151612610210001</wantedInfoUrl></wanted>
<wanted><company>번호없음</company><title>번호 없는 줄</title></wanted></wantedRoot>`;
  const listed = parseList(listXml);
  ok("고용24 목록에서 번호 있는 줄만 읽는다", listed.length === 1 && listed[0].ref === "K151612610210001", `${listed.length}줄`);
  ok("고용24 목록의 날짜를 날짜로 바꾼다", isoDate(listed[0]?.posted) === "2026-10-21" && isoDate(listed[0]?.closes) === "2026-11-19");
  ok("고용24 목록에서 회사 이름을 들고 오지 않는다", !JSON.stringify(listed).includes("가나다"));
  const detailXml = `<wantedDtl><corpInfo><corpNm>(주)가나다정밀</corpNm></corpInfo><wantedInfo>
<jobCont><![CDATA[- 3D CAD 로 구동부 기구를 설계하고 공차를 정합니다<br>- 시제품 시험 결과로 설계를 고칩니다]]></jobCont>
<compAbl>CATIA 또는 SolidWorks 사용 가능자</compAbl></wantedInfo></wantedDtl>`;
  const detailBody = parseDetail(detailXml);
  ok("고용24 상세에서 요구 본문을 읽고 회사 이름은 읽지 않는다",
    detailBody.includes("공차") && detailBody.includes("SolidWorks") && !detailBody.includes("가나다"), detailBody.slice(0, 60));

  /* 4. CSV: 회사 칸이 있어도 읽지 않는다 */
  const csv = `번호,회사,제목,내용,주소\n1,"(주)가나다","경영기획 담당","예산을 배분하고, ""목표""를 지표로 옮긴다",세종\n`;
  const rows = parseCsv(csv, SRC);
  ok("CSV 를 따옴표째 읽는다", rows.length === 1 && rows[0].body.includes('"목표"'));
  ok("CSV 의 회사 칸을 담지 않는다", !JSON.stringify(rows).includes("가나다"));

  /* 5. 적으면 통계를 세우지 않는다 */
  const core = "BIZ_CORE_V1";
  const body = "예산을 어디에 쓸지 계획을 세우고 목표를 지표로 옮깁니다.\n재무제표를 읽고 투자 판단 근거를 남깁니다.";
  const make = (i: number) => ({ source: SRC, sourceRef: `r${i}`, title: "경영기획 담당자", body, address: i % 2 ? "세종 어진동" : "서울 중구", postedOn: new Date().toISOString().slice(0, 10) });
  await ingest(Array.from({ length: MIN_TOTAL - 1 }, (_, i) => make(i)));
  const before = await demandOf(core);
  ok(`${MIN_TOTAL}건이 안 되면 표를 세우지 않는다`, !before.ready && before.total === MIN_TOTAL - 1, `${before.total}건`);

  /* 6. 넘으면 세우고, 수는 SQL 과 같다 */
  await ingest([make(MIN_TOTAL - 1), make(MIN_TOTAL)]);
  const d = await demandOf(core);
  ok("넘으면 표를 세운다", d.ready && d.total === MIN_TOTAL + 1, `${d.total}건`);
  if (d.ready) {
    const sql = await query<{ k: string; n: number }>(
      `SELECT k, count(*)::int AS n FROM v3_job_postings, jsonb_object_keys(required_td) k
        WHERE source = $1 AND core_code = $2 GROUP BY k`, [SRC, core]);
    const same = sql.every((r) => {
      const x = d.domains.find((y) => y.domain === r.k);
      return x && (r.n >= MIN_CELL ? x.postings === r.n : x.postings === null);
    });
    ok("영역마다 센 수가 SQL 과 같다", same, d.domains.map((x) => `${x.domain}:${x.postings ?? "-"}`).join(" "));
    ok("비율은 센 수를 전체로 나눈 것뿐이다",
      d.domains.every((x) => x.postings === null || x.share === Math.round((x.postings / d.total) * 100)));
    ok("출처와 기준일이 함께 온다", d.sources.length > 0 && !!d.asOf && !!d.from);
  }

  /* 7. 같은 공고를 두 번 넣어도 한 번 센다 */
  await ingest([make(1), make(2)]);
  const again = await demandOf(core);
  ok("같은 번호를 다시 넣어도 수가 늘지 않는다", again.total === d.total);

  /* 8. 회사 이름을 담을 칸이 없다 */
  const cols = await query<{ c: string }>(
    `SELECT column_name AS c FROM information_schema.columns WHERE table_name = 'v3_job_postings'`);
  ok("공고 표에 회사 이름 칸이 없다", !cols.some((x) => /company|corp|employer|co_nm/i.test(x.c)), cols.map((x) => x.c).join(","));

  await query(`DELETE FROM v3_job_postings WHERE source = $1`, [SRC]);
  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  await query(`DELETE FROM v3_job_postings WHERE source = $1`, [SRC]).catch(() => undefined);
  console.error(e); process.exit(1);
});
