/**
 * **35개 검사를 만드는 것이 아니라 하나의 엔진에 Major Core 를 꽂는다.**
 *
 * 이 검사가 막는 것은 둘이다. **이름만 적어 두고 `검사 가능` 으로 여는
 * 일**과, **같은 학과가 두 Core 로 갈리는 일**이다. 앞엣것은 사는 쪽이
 * 속고, 뒤엣것은 같은 전공 학생 둘이 서로 다른 결과를 받는다.
 *
 *   npm run v3:majors
 */
import { readdirSync, readFileSync } from "node:fs";
import {
  coresForMarket, hasCoreFile, previewOpenCores, sellableCores,
} from "../src/lib/me-v3/core-registry";
import { buildPlan } from "../src/lib/me-v3/runtime/blocks";
import { branchBlock } from "../src/lib/me-v3/runtime/routing";
import {
  content, industryChoices, planDeps, roleChoices,
} from "../src/lib/me-v3/runtime/session";
import { xfieldKo } from "../src/lib/me-v3/result/text.ko";
import { CONTENT_DIR } from "../src/lib/me-v3/core-registry";
import { campusFixturePath } from "../src/lib/campus/registry";

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

  /**
   * **안쪽 성숙도 값이 손님 화면에 서지 않는다.**
   *
   * `READY_FOR_DOMAIN_REVIEW` 는 우리가 어디까지 했는지를 적는 안쪽 QA
   * 값이다. 그 글자가 학생 화면에 서면 읽는 사람이 자기가 받은 결과를
   * `검토 전인 것` 으로 읽고, 그것은 우리가 할 말이 아니다. 학생에게 할
   * 말은 `지금 열려 있는가` 하나이고 그것은 `status` 와
   * `open_to_students` 가 정한다.
   *
   * 운영 화면(`src/app/admin`)은 보지 않는다: 저기는 그 값을 읽어야 하는
   * 자리다.
   */
  const MATURITY = ["VALIDATED", "READY_FOR_REVIEW",
    "READY_FOR_DOMAIN_REVIEW", "FOUNDATION"];
  const SEEN = ["src/app", "src/components"];
  const leak: string[] = [];
  for (const root of SEEN) {
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = `${dir}/${e.name}`;
        if (e.isDirectory()) { if (e.name !== "admin") walk(full); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        const src = readFileSync(full, "utf8");
        for (const m of MATURITY) if (src.includes(m)) leak.push(`${full}:${m}`);
      }
    };
    walk(root);
  }
  ok("안쪽 성숙도 값이 손님 화면에 서지 않는다", leak.length === 0,
     leak.length ? leak.slice(0, 3).join(" · ") : `${SEEN.join(" · ")} — 0건`);

  /* 적어 둔 값이 정해진 넷 안에 있다. 새 값을 쓰면 위 검사가 못 본다 */
  const odd = cores.filter((c) => !MATURITY.includes(c.maturity));
  ok("성숙도 값이 정해진 넷 안에 있다", odd.length === 0,
     odd.length ? odd.map((c) => `${c.code}:${c.maturity}`).join(" ")
       : MATURITY.join(" · "));

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

  /**
   * **학생 공개 상태를 검사가 고치지 않는다.**
   *
   * 이번 회차의 가장 중요한 안전 조건이다. 전에는 눌러 보는 검사 다섯이
   * `open_to_students` 를 잠시 `true` 로 쓰고 끝에서 되돌렸다. 그 창이 열려
   * 있는 동안 **학생에게도 열려 있고**, 되돌림이 다른 쓰기와 겹치면 열린
   * 칸이 그대로 남는다: 실제로 한 번 열여섯 Core 가 남았다.
   *
   * 지금은 여는 일이 `V3_PREVIEW_OPEN` 이고 등록부 파일은 읽기만 한다.
   * **한 번 걷는 것으로는 돌아온다**: 다음 사람이 모르고 다시 쓴다. 그래서
   * `scripts/` 에서 등록부에 쓰는 줄을 센다.
   *
   * **주석은 걷어 내고 본다**: 이 저장소는 `왜 지웠는가` 를 주석으로 남기는
   * 쪽을 택했고, 그 기록에는 지운 코드가 그대로 들어 있다. 세면 맞는 기록을
   * 지우라고 요구하게 된다.
   */
  console.log("\n── 검사가 등록부를 쓰지 않는가\n");
  /* 학교 등록부도 같은 자리다: 확인용 학교를 거기 쓰고 되돌리던 자리가
     있었고, 가운데서 터지면 그 학교가 다음 커밋에 손님 자료로 섞인다 */
  {
    const strip = (t: string) => t
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n").map((l) => l.replace(/\s\/\/.*$/, "")).join("\n");
    const writes: string[] = [];
    const walkDir = (d: string): string[] => readdirSync(d, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walkDir(`${d}/${e.name}`)
        : [`${d}/${e.name}`]));
    for (const f of walkDir("scripts")) {
      if (!/\.(ts|mjs|js|sh)$/.test(f)) continue;
      if (f.endsWith("v3-majors-check.ts")) continue;
      const src = strip(readFileSync(f, "utf8"));
      /**
       * **임시 자리에 가짜 core 를 만드는 파일은 뺀다.** 확장성 검사가 그
       * 자리이고(`CONTENT_DIR` 를 `mkdtempSync` 로 바꿔 돌린다) 그 파일은
       * 운영 등록부를 쓸 수 없다. 대신 그런 파일이라도 **운영 경로를 글자로
       * 들고 쓰는 줄**은 그대로 센다: 임시 자리를 만들었다는 것이 운영에
       * 쓸 자격이 되지는 않는다.
       */
      const sandboxed = /mkdtempSync/.test(src);
      for (const line of src.split("\n")) {
        /* 등록부 파일 이름과 쓰는 낱말이 같은 줄에 있으면 쓰는 줄이다 */
        if (!/major-cores\.json|campus-universities\.json/.test(line)) continue;
        if (!/writeFileSync|appendFileSync|createWriteStream|>\s*["'`]?\S*major-cores/
          .test(line)) continue;
        const toReal = /sites\/pca-platform\/content|CONTENT_DIR/.test(line);
        if (toReal || !sandboxed) writes.push(`${f}: ${line.trim().slice(0, 70)}`);
      }
      /* `open_to_students` 에 값을 **대입하는** 줄도 센다. 등록부 이름이 상수로
         빠져 있으면 위의 줄이 못 본다 */
      for (const line of src.split("\n")) {
        if (/\bopen_to_students\s*=[^=]/.test(line)) {
          writes.push(`${f}: ${line.trim().slice(0, 70)}`);
        }
      }
    }
    ok("검사가 두 등록부를 쓰지 않는다 (Core · 학교)", writes.length === 0,
      writes.length ? writes.join(" · ") : "쓰는 줄 0");
  }

  /* 운영에서는 미리보기 문이 아예 열리지 않는다 */
  {
    const keptEnv = process.env.V3_PREVIEW_OPEN;
    const keptApp = process.env.APP_ENV;
    process.env.V3_PREVIEW_OPEN = "*";
    process.env.APP_ENV = "production";
    const prod = previewOpenCores();
    process.env.APP_ENV = "staging";
    const stage = previewOpenCores();
    if (keptEnv === undefined) delete process.env.V3_PREVIEW_OPEN;
    else process.env.V3_PREVIEW_OPEN = keptEnv;
    if (keptApp === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = keptApp;
    ok("운영에서는 미리보기로도 열리지 않는다", prod.length === 0,
      prod.join(" ") || "빈 목록");
    ok("staging 에서는 미리보기가 선다", stage.length === 1, stage.join(" "));
  }

  /* 확인용 학교 fixture 도 운영에서는 붙지 않는다 */
  {
    const keptFx = process.env.V3_CAMPUS_FIXTURE;
    const keptApp = process.env.APP_ENV;
    process.env.V3_CAMPUS_FIXTURE = "scripts/fixtures/campus-zztest.json";
    process.env.APP_ENV = "production";
    const prod = campusFixturePath();
    process.env.APP_ENV = "staging";
    const stage = campusFixturePath();
    if (keptFx === undefined) delete process.env.V3_CAMPUS_FIXTURE;
    else process.env.V3_CAMPUS_FIXTURE = keptFx;
    if (keptApp === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = keptApp;
    ok("운영에서는 확인용 학교가 붙지 않는다", prod === null, prod ?? "붙지 않는다");
    ok("staging 에서는 확인용 학교가 붙는다", stage !== null, stage ?? "없다");
  }

  /**
   * **다른 Core 가 기계공학 문맥으로 새지 않는다.**
   *
   * 운영에서 실제로 났다. 경영학과 학생이 관심 산업을 고른 바로 다음 화면
   * 에서 `고른 두 산업에서 기계공학자가 다루는 일` 을 읽었다. `core_code`
   * 도 등록부도 세션 복구도 멀쩡했고, Core 를 모르게 짠 화면 묶음 층이
   * 그 문구를 **글자로** 들고 있었다: 그래서 스무 Core 전부가 그 자리에서
   * 같은 것을 받았다.
   *
   * 그 모양을 고친 것으로 끝내지 않는다. 화면 묶음의 틀(머리말 · 주제 ·
   * 질문 · 도움말 · 맥락 줄 · 알약)은 전공 이름 말고는 Core 를 모르는
   * 글이라, **거기에 다른 전공 이름이 서면 그것이 곧 누출이다.** 문항
   * 문면과 팩 이름은 그 Core 의 콘텐츠라 여기서 세지 않는다.
   */
  console.log("\n── 다른 Core 가 남의 전공 문맥을 받지 않는가\n");
  {
    const terms = JSON.parse(readFileSync(
      `${CONTENT_DIR}/me-v3-terms.json`, "utf8")) as
      { by_core: Record<string, Record<string, string>> };
    const withItems = cores.filter((c) => hasCoreFile(c.code, "items"));
    const names = withItems.map((c) => c.name_ko);
    const noOwn: string[] = [];
    const leaked: string[] = [];
    for (const c of withItems) {
      const tds = content(c.code).domains.domains.map((d) => d.code);
      const inds = industryChoices(c.code).map((x) => x.code);
      const roles = roleChoices(c.code).map((x) => x.code);
      /* 타계열 대학원생으로 세운다: 대학원 맥락 묶음까지 서게 해야
         그 자리의 알약도 함께 세어진다 */
      const plan = buildPlan({
        tier: "PRO", stage: "master",
        branchBlock: branchBlock("master", "BUSINESS"), crossField: true,
        probe: tds.slice(0, 2), deep: tds.slice(0, 3),
        industryInterest: inds.slice(0, 2), roleInterest: roles.slice(0, 1),
        tiedPair: tds.slice(0, 2),
      }, planDeps(c.code));
      const scene = plan.screens.find((x) => x.id === "scene");
      if (!scene?.question?.includes(c.name_ko)) {
        noOwn.push(`${c.code} ← ${scene?.question ?? "장면 화면 없음"}`);
      }
      /* 그 Core 의 콘텐츠에서 온 이름(산업팩 · 역할팩)은 걷어 내고 본다.
         걷지 않으면 팩 이름 안의 글자가 남의 전공 이름으로 세어져
         **멀쩡한 Core 가 걸린다** */
      /* 그 Core 의 콘텐츠에서 오는 말은 전부 걷어 낸다: 전공 이름 ·
         산업팩 · 역할팩 · 영역 이름 · 그 전공의 용어 받침. 걷지 않으면
         간호의 `처치나 교육` 과 보건의 `건강 교육·캠페인 운영` 이 남의
         전공 이름으로 세어져 **멀쩡한 Core 가 걸린다** */
      const mine = [
        c.name_ko,
        ...industryChoices(c.code).map((x) => x.name),
        ...roleChoices(c.code).map((x) => x.name),
        ...content(c.code).domains.domains.map((d) => d.name),
        ...Object.values(terms.by_core[c.code] ?? {}),
      ];
      /**
       * **문항이 선 화면의 큰 글씨와 주제는 세지 않는다.** 저쪽은 문항
       * 문면과 영역 이름이 그대로 서는 자리라 그 Core 의 콘텐츠다. 간호의
       * `처치나 교육` 과 보건의 `건강 교육·캠페인 운영` 이 거기서 와서,
       * 세면 **멀쩡한 Core 가 걸린다.** 세는 것은 화면 묶음이 스스로 적는
       * 글(머리말 · 도움말 · 맥락 줄 · 알약)과 **읽기만 하는 화면의 큰
       * 글씨**(산업 장면 · 전환 · 고르기)다.
       */
      const chrome = plan.screens.flatMap((x) => [
        x.eyebrow ?? "", x.help ?? "", x.strip ?? "", ...(x.chips ?? []),
        ...(x.items.length ? [] : [x.subject ?? "", x.question ?? ""]),
      ]).join(" ⋮ ");
      /* **긴 말을 먼저 걷는다.** 짧은 쪽을 먼저 걷으면 긴 말 안이 끊겨
         남은 토막이 남의 전공 이름으로 세어진다: `간호` 를 먼저 걷으면
         `간호사가 직접 하는 처치나 교육` 이라는 용어 받침이 그 뒤로는
         짝이 맞지 않아 `교육` 이 남았다 */
      let left = chrome;
      for (const m of [...mine].sort((a, b) => b.length - a.length)) {
        left = left.split(m).join(" ");
      }
      for (const n of names) {
        if (n !== c.name_ko && left.includes(n)) leaked.push(`${c.code} ← ${n}`);
      }
      /* 결과지의 대학원 맥락 이름표도 같은 자리였다 */
      const bridge = xfieldKo("XF_BRIDGE", c.name_ko) ?? "";
      if (!bridge.includes(c.name_ko)) leaked.push(`${c.code} ← 결과 이름표`);
      for (const n of names) {
        if (n !== c.name_ko && !c.name_ko.includes(n) && bridge.includes(n)) {
          leaked.push(`${c.code} ← 결과 이름표에 ${n}`);
        }
      }
    }
    ok("Core 마다 제 전공 이름이 산업 장면 화면에 선다", noOwn.length === 0,
      noOwn.length ? noOwn.join(" · ") : `${withItems.length}개`);
    ok("화면 틀에 남의 전공 이름이 서지 않는다", leaked.length === 0,
      leaked.length ? leaked.join(" · ") : `${withItems.length}개 × 틀 전부`);
  }

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
