/**
 * **35개 검사를 만드는 것이 아니라 하나의 엔진에 Major Core 를 꽂는다.**
 *
 * 이 검사가 막는 것은 둘이다. **이름만 적어 두고 `검사 가능` 으로 여는
 * 일**과, **같은 학과가 두 Core 로 갈리는 일**이다. 앞엣것은 사는 쪽이
 * 속고, 뒤엣것은 같은 전공 학생 둘이 서로 다른 결과를 받는다.
 *
 *   npm run v3:majors
 */
import { coresForMarket, sellableCores } from "../src/lib/me-v3/core-registry";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

/**
 * 받은 35개 전공군. **이 목록이 덮이는지 센다.**
 *
 * 한 Core 가 여러 줄을 맡을 수 있다: 전자와 전기는 전기전자 Core 의
 * 갈래이고, 소프트웨어와 인공지능은 컴퓨터 Core 의 갈래다. **이름이
 * 비슷해서 묶은 것이 아니라 같은 영역 사전을 읽기 때문이다.**
 */
const TARGET: [string, string][] = [
  ["기계공학", "ME_CORE_V3"], ["전자공학", "EE_CORE_V1"], ["전기공학", "EE_CORE_V1"],
  ["반도체공학", "SEMI_CORE_V1"], ["신소재·재료공학", "MSE_CORE_V1"],
  ["화학공학", "CHE_CORE_V1"], ["산업공학", "IE_CORE_V1"],
  ["컴퓨터공학", "CS_CORE_V1"], ["소프트웨어공학", "CS_CORE_V1"],
  ["인공지능·데이터", "CS_CORE_V1"], ["로봇공학", "ROBOT_CORE_V1"],
  ["자동차·모빌리티", "AUTO_CORE_V1"], ["에너지공학", "ENER_CORE_V1"],
  ["환경공학", "ENV_CORE_V1"], ["건축공학", "ARCH_CORE_V1"],
  ["토목공학", "CIV_CORE_V1"], ["수학·통계", "MATH_CORE_V1"],
  ["물리학", "PHYS_CORE_V1"], ["화학", "CHEM_CORE_V1"],
  ["생명과학", "BIO_CORE_V1"], ["바이오·생명공학", "BT_CORE_V1"],
  ["식품공학", "FOOD_CORE_V1"], ["경영학", "BIZ_CORE_V1"],
  ["경제학", "ECON_CORE_V1"], ["회계·세무", "ACCT_CORE_V1"],
  ["금융", "FIN_CORE_V1"], ["무역·국제통상", "TRADE_CORE_V1"],
  ["행정학", "PUBADM_CORE_V1"], ["정치외교·정책", "POL_CORE_V1"],
  ["사회학", "SOC_CORE_V1"], ["심리학", "PSY_CORE_V1"],
  ["미디어·광고홍보", "MEDIA_CORE_V1"], ["국어·언어·문학", "LANG_CORE_V1"],
  ["교육학", "EDU_CORE_V1"], ["상담·아동청소년", "COUN_CORE_V1"],
];

function main(): void {
  const cores = coresForMarket("KR");
  const byCode = new Map(cores.map((c) => [c.code, c]));

  console.log("\n── 등록부\n");
  ok("35개 전공군이 전부 Core 로 덮인다",
     TARGET.every(([, code]) => byCode.has(code)),
     `${TARGET.length}줄 → core ${new Set(TARGET.map((t) => t[1])).size}개 · 등록 ${cores.length}개`);

  const noAlias = cores.filter((c) => !c.aliases?.length);
  ok("Core 마다 학과 별칭이 있다", noAlias.length === 0,
     noAlias.length ? noAlias.map((c) => c.code).join(" ")
       : `별칭 ${cores.reduce((n, c) => n + c.aliases.length, 0)}개`);

  /* **같은 학과가 두 Core 로 갈리면 안 된다.** 갈리면 같은 전공 학생
     둘이 서로 다른 영역 사전을 읽고, 그 둘의 결과를 견줄 수 없다 */
  const owner = new Map<string, string>();
  const clash: string[] = [];
  for (const c of cores) {
    for (const a of c.aliases) {
      const had = owner.get(a);
      if (had && had !== c.code) clash.push(`${a}: ${had} ↔ ${c.code}`);
      else owner.set(a, c.code);
    }
  }
  ok("한 학과 이름이 두 Core 로 갈리지 않는다", clash.length === 0,
     clash.length ? clash.slice(0, 3).join(" · ") : `이름 ${owner.size}개`);

  console.log("\n── status 와 maturity 를 합치지 않는다\n");
  const bad = cores.filter((c) => !c.maturity);
  ok("Core 마다 maturity 가 적혀 있다", bad.length === 0,
     bad.length ? bad.map((c) => c.code).join(" ") : `${cores.length}개`);

  /* **내용이 없는 전공을 응시로 열지 않는다.** 이것이 이 검사의 요지다 */
  const open = sellableCores("KR");
  const hollow = open.filter((c) => c.maturity === "FOUNDATION");
  ok("FOUNDATION 인 전공이 응시로 열려 있지 않다", hollow.length === 0,
     hollow.length ? hollow.map((c) => c.code).join(" ")
       : `열린 core ${open.map((c) => c.code).join(", ")}`);

  /* 열린 core 는 required 파일 넷을 실제로 들고 있어야 한다 */
  const noFiles = open.filter((c) =>
    !(c.files?.taxonomy && c.files?.domains && c.files?.checklists && c.files?.items_blueprint));
  ok("열린 Core 는 required 파일 넷을 들고 있다", noFiles.length === 0,
     noFiles.length ? noFiles.map((c) => c.code).join(" ") : `${open.length}개 확인`);

  /* **규준도 인지 면접도 없다.** 어느 전공도 검증된 검사로 적지 않는다 */
  const claimed = cores.filter((c) => c.maturity === "VALIDATED");
  ok("`VALIDATED` 로 적은 전공이 없다", claimed.length === 0,
     claimed.length ? claimed.map((c) => c.code).join(" ")
       : "규준과 인지 면접 전이라 어느 전공도 검증된 검사가 아니다");

  console.log("\n── 갈래\n");
  const spec = cores.filter((c) => c.specializations?.length);
  const dupSpec: string[] = [];
  const seen = new Set<string>();
  for (const c of spec) {
    for (const s of c.specializations ?? []) {
      if (seen.has(s.code)) dupSpec.push(s.code);
      seen.add(s.code);
    }
  }
  ok("갈래 코드가 겹치지 않는다", dupSpec.length === 0,
     dupSpec.length ? dupSpec.join(" ")
       : spec.map((c) => `${c.code}(${c.specializations?.length})`).join(" "));

  console.log("\n── 시장 정책\n");
  const gl = coresForMarket("GLOBAL");
  ok("GLOBAL 에 비이공계가 새지 않는다",
     gl.every((c) => c.family === "STEM"),
     `GLOBAL ${gl.length}개 · 전부 STEM`);

  console.log("\n── 성숙도 분포\n");
  const dist: Record<string, number> = {};
  for (const c of cores) dist[c.maturity] = (dist[c.maturity] ?? 0) + 1;
  for (const [k, v] of Object.entries(dist)) console.log(`  ${k.padEnd(18)} ${v}개`);

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  if (!fail) {
    console.log("\n  35개 전공군이 Core 로 덮였고 **내용이 없는 전공은 열려 있지 않다.**");
  }
  process.exit(fail ? 1 : 0);
}

main();
