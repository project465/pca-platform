/**
 * 최종 runtime image 에 무엇이 들어가는가.
 *
 * **"저장소에 있음" 과 "손님이 읽음" 은 다른 말이다.** 법정 문서가 그
 * 차이로 사라졌다: 파일은 멀쩡히 있었는데 `Dockerfile` 이 옮기지 않아
 * `/legal/terms` · `/legal/privacy` · `/legal/refund` 셋이 전부 빈 본문으로
 * 섰다. 화면은 200 이었고 가게는 약관이 없는 상태였다.
 *
 * 도커 데몬 없이 **정적으로** 센다. `Dockerfile` 의 마지막 스테이지에 있는
 * `COPY` 를 읽어 이미지 안의 경로를 만들고, 돌리는 데 꼭 필요한 자리가
 * 그 안에 들어오는지 본다. 빌드가 되는지와는 다른 질문이라 데몬이 없어도
 * 답할 수 있고, CI 에서도 30초가 아니라 30밀리초다.
 *
 *   npm run image:check
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const DF = readFileSync("Dockerfile", "utf8");
const IGNORE = existsSync(".dockerignore")
  ? readFileSync(".dockerignore", "utf8").split("\n")
      .map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && !l.startsWith("!"))
  : [];

/* 마지막 `FROM` 뒤가 돌리는 스테이지다. 앞 스테이지의 COPY 는 이미지에
   남지 않으므로 세면 안 된다 */
const lines = DF.split("\n");
const lastFrom = lines.reduce((at, l, i) => (/^FROM\s/i.test(l) ? i : at), 0);
const runStage = lines.slice(lastFrom);

/** `COPY [--flags] src... dest` 를 읽는다. 줄바꿈(`\`)은 먼저 잇는다 */
function copies(src) {
  const joined = src.join("\n").replace(/\\\n\s*/g, " ");
  const out = [];
  for (const l of joined.split("\n")) {
    const m = l.match(/^\s*COPY\s+(.*)$/i);
    if (!m) continue;
    const parts = m[1].split(/\s+/).filter(Boolean);
    const flags = parts.filter((p) => p.startsWith("--"));
    const rest = parts.filter((p) => !p.startsWith("--"));
    const dest = rest.pop();
    const fromBuild = flags.some((f) => /^--from=/.test(f));
    out.push({ sources: rest, dest, fromBuild });
  }
  return out;
}

/* 빌드가 만드는 것. 저장소에 없어도 정상이다 */
const BUILT = ["/app/.next/standalone", "/app/.next/static", "/app/ops-build"];

/**
 * standalone 이 **스스로** 넣어 주는 것.
 *
 * Next 의 standalone 출력은 서버와 추적된 `node_modules` 까지다. `sites/`
 * 나 `db/` 같은 자료는 **넣어 주지 않는다.** 그래서 뿌리에 푸는 줄이
 * 아무 경로나 품는 것으로 보면, 법정 문서 줄을 지워도 이 검사가 통과한다.
 * 실제로 그렇게 통과했다(빌드 산출물 폴더에 손으로 복사해 둔 것이 남아
 * 있어서 더 그럴듯해 보였다). 품는 것을 적어 두고 그 밖은 안 품는다.
 */
const STANDALONE_GIVES = ["server.js", "package.json", "node_modules", ".next/server"];

/**
 * 이미지 안에 있어야 하는 자리와, 없으면 무엇이 깨지는가.
 *
 * **깨지는 결과를 같이 적는다.** 경로만 적어 두면 다음 사람이 지워도 되는
 * 줄인지 알 수 없다.
 */
const NEED = [
  ["server.js", "앱이 뜨지 않는다"],
  [".next/static", "CSS·JS 가 안 와서 화면이 맨몸으로 선다"],
  ["public", "파비콘·이미지가 404"],
  ["db", "`db:init` 으로 DB 를 세울 수 없다"],
  ["ops/make-admin.cjs", "운영자 계정을 만들 수 없다"],
  ["ops/seed-instrument.cjs", "문항을 적재할 수 없다"],
  ["ops/db-init.sh", "빈 운영 DB 를 세울 수 없다"],
  ["ops/db-upgrade.sh", "배포마다 스키마를 올릴 수 없다"],
  ["ops/db-verify.sh", "팔 수 있는 상태인지 볼 수 없다"],
  ["data/metri/items_pca_me_v1.json", "옛 검사 문항 적재가 막힌다"],
  ["sites/pca-platform/v2.html", "결과지 엔진이 404 — 결과지와 PDF 가 멈춘다"],
  ["sites/pca-platform/assets", "채점·문장 엔진이 없다"],
  ["sites/pca-platform/data", "문항 은행과 가치 사슬 자료가 없다"],
  ["sites/careermetri/legal/01-terms.md", "`/legal/terms` 본문이 빈다"],
  ["sites/careermetri/legal/02-privacy.md", "`/legal/privacy` 본문이 빈다"],
  ["sites/careermetri/legal/03-refund.md", "`/legal/refund` 본문이 빈다"],
];

/**
 * 이미지 안의 경로 하나를 어느 COPY 가 넣어 주는가.
 *
 * 도커의 규칙 셋만 쓴다.
 *   `COPY a/b ./x/y`  → `x/y` 가 b 의 **내용**이 된다
 *   `COPY a/b ./x/`   → `x/b` 가 된다 (끝의 `/` 가 안에 넣으라는 뜻)
 *   `COPY a/b ./`     → 뿌리에 b 의 **내용**을 푼다
 * 돌려주는 `probe` 는 그 자리를 저장소에서 가리키는 경로다.
 */
function placedBy(want, cps) {
  /* **가장 좁게 맞는 줄이 이긴다.** 뿌리에 통째로 푸는 줄(`COPY … ./`)이
     모든 경로에 걸리기 때문에, 먼저 맞는 것을 집으면 법정 문서 줄을 지워도
     이 검사가 통과한다. 그러면 검사가 아니라 장식이 된다 */
  let best = null;
  for (const c of cps) {
    const dest = c.dest.replace(/^\.\//, "").replace(/\/$/, "");
    for (const s of c.sources) {
      const src = s.replace(/^\/app\//, "");
      if (dest === "" || dest === ".") {
        /* 뿌리에 푸는 줄. **품는 것만 품는다** */
        const gives = BUILT.some((b) => s === b)
          ? STANDALONE_GIVES.some((g) => want === g || want.startsWith(g + "/"))
          : true;
        if (gives && !best) best = { c, s, probe: path.join(src, want), len: -1 };
        continue;
      }
      const target = c.dest.endsWith("/") ? `${dest}/${path.basename(s)}` : dest;
      const hit = want === target
        ? { c, s, probe: src, len: target.length }
        : want.startsWith(target + "/")
          ? { c, s, probe: path.join(src, want.slice(target.length + 1)), len: target.length }
          : null;
      if (hit && (!best || hit.len > best.len)) best = hit;
    }
  }
  return best;
}

const cps = copies(runStage);
let bad = 0;
const say = (okish, msg, why) => {
  console.log(`  ${okish ? "OK  " : "없음"} ${msg}${okish ? "" : `  — ${why}`}`);
  if (!okish) bad += 1;
};

console.log("── 옮기는 줄의 원본이 실제로 있는가 ──────────────");
for (const c of cps) {
  for (const s of c.sources) {
    const inRepo = s.replace(/^\/app\//, "");
    if (BUILT.some((b) => s === b || s.startsWith(b + "/"))) {
      console.log(`  OK   ${s}  (빌드가 만든다)`);
      continue;
    }
    const hit = existsSync(inRepo);
    say(hit, `${s}`, "원본이 저장소에 없다");
    /* `.dockerignore` 가 걷어 가면 빌드 컨텍스트에 안 들어온다 */
    if (hit && !c.fromBuild) {
      const first = inRepo.split("/")[0];
      if (IGNORE.includes(first) || IGNORE.includes(inRepo)) {
        say(false, `${s} 가 .dockerignore 에 걸린다`, "빌드 컨텍스트에 안 들어온다");
      }
    }
  }
}

console.log("\n── 돌리는 데 필요한 자리가 이미지에 들어오는가 ────");
for (const [want, why] of NEED) {
  const by = placedBy(want, cps);
  if (!by) { say(false, want, why); continue; }
  /* 빌드가 만드는 것은 저장소에 없는 것이 정상이다 */
  if (BUILT.some((b) => by.s === b || by.s.startsWith(b + "/"))) {
    console.log(`  OK   ${want}  ← ${by.s}`);
    continue;
  }
  /* 넣어 주는 줄은 찾았다. 원본 쪽에 그 파일이 실제로 있는지도 본다 */
  say(existsSync(by.probe), `${want}  ← ${by.s}`, `${by.probe} 가 없다 — ${why}`);
}

console.log("\n── 이미지가 들고 있어야 하는 환경값 ──────────────");
for (const [k, want] of [
  ["REPORT_PDF_DIR", "/app/var/reports"],
  ["CHROMIUM_PATH", "/usr/bin/chromium-browser"],
  ["HOSTNAME", "0.0.0.0"],
]) {
  const re = new RegExp(`${k}=(\\S+)`);
  const m = DF.match(re);
  say(Boolean(m) && m[1] === want, `${k}=${want}`, `지금 ${m ? m[1] : "없음"}`);
}
for (const [pkg, why] of [
  ["chromium", "결과지 PDF 를 못 찍는다"],
  ["font-noto-cjk", "결과지 한글이 네모로 찍힌다"],
  ["postgresql-client", "컨테이너 안에서 DB 를 세울 수 없다"],
  ["bash", "ops 스크립트가 돌지 않는다"],
]) say(DF.includes(pkg), `패키지 ${pkg}`, why);
say(DF.includes("fonts-ko.conf"), "fonts-ko.conf",
  "중국어 글꼴이 먼저 골라져 한글 자형이 기운다");
say(/RUN mkdir -p \/app\/var\/reports/.test(DF), "PDF 폴더를 미리 만든다",
  "첫 PDF 에서 쓰기가 실패한다");
say(!/^ENV[^\n]*\bPORT=3000\b[^\n]*$/m.test(DF) || DF.includes("PORT:-3000"),
  "PORT 를 밖에서 받는다", "관리형 플랫폼이 넣어 준 포트로 안 듣는다");

console.log(bad === 0
  ? "\n이미지 구성 OK."
  : `\n${bad}가지가 이미지에서 빠진다. 올리면 그 자리가 운영에서 깨진다.`);
process.exit(bad === 0 ? 0 : 1);
