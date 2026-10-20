/**
 * **Track E 4차: 편집판 렌더러를 운영 경로에 붙이기 전 검사(파일만 · 운영 경로 연결 없음).**
 *   CASES=RICH:1,POOR:2,CONTRA:3 npx tsx scripts/lab/trackE-r4.ts
 * 1. 같은 굳은 결과에서 두 번 그린 HTML 이 바이트까지 같은가(다시 내려받아도 같은 결과지)
 * 2. 기업 자료(지역 기업 목록의 이름·식별자)가 HTML 에 한 글자도 없는가
 * 3. 경험 기록의 자유입력(note_text)이 들어가지 않는가 — 모델에 그 칸이 없다
 * 4. 줄여 맞추는 코드(zoom)가 없는가
 * 5. 12쪽 시안이 전체 결과지와 같은 렌더러의 같은 쪽인가(PROTO8 열쇠가 전체에 있고 그 쪽 HTML 이 같다)
 * 6. 렌더러가 부르는 글꼴 파일과 라이선스가 있는가(Pretendard · Noto Serif KR, 둘 다 OFL)
 *
 * 4차 2판부터 매거진 렌더러(editorial8 · render8)를 잰다. 1판(render7)은 저장소에 남아 있지만 운영 연결 후보가 아니다.
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { load3 } from "./gm-report3";
import { edit8 } from "../../src/lib/me-v3/report-gm/editorial8";
import { pages8, html8, PROTO8 } from "../../src/lib/me-v3/report-gm/render8";

const CASES = (process.env.CASES ?? "RICH:1,POOR:2,CONTRA:3").split(",").map((x) => x.split(":"));
const F = { sans: "fonts/pretendard", serif: "fonts/notoserif" };
const FONT_DIR = "var/pdf-gm";
const orgs = JSON.parse(readFileSync("data/region/kr-chungcheong-orgs.v2.json", "utf8"));
const names: string[] = (orgs.orgs ?? orgs.items ?? []).flatMap((o: { name: string; identifiers?: Record<string, string> }) => [o.name.replace(/\(주\)|㈜|주식회사/g, "").trim(), ...Object.values(o.identifiers ?? {}).map(String)]).filter((s: string) => s && s.length >= 3);
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); c ? pass++ : fail++; };
(async () => {
  ok(names.length > 10, `기업 목록에서 이름·식별자 ${names.length}개를 읽었다`);
  const need = ["pretendard/Pretendard-Regular.otf", "pretendard/Pretendard-SemiBold.otf", "pretendard/LICENSE.txt", "notoserif/NotoSerifKR-Bold.otf", "notoserif/NotoSerifKR-SemiBold.otf", "notoserif/LICENSE"];
  const miss = need.filter((n) => !existsSync(`${FONT_DIR}/fonts/${n}`));
  ok(miss.length === 0, `글꼴 파일과 라이선스가 있다 ${miss.join(",")}`);
  for (const [TAG, ID] of CASES) {
    const ea = edit8(await load3(ID)), eb = edit8(await load3(ID));
    const pa = pages8(ea);
    const a = html8(ea, pa, F);
    const b = html8(eb, pages8(eb), F);
    const ha = createHash("sha256").update(a).digest("hex").slice(0, 16);
    ok(a === b, `${TAG} 두 번 그린 HTML 이 같다 (${ha})`);
    const leak = names.filter((n) => a.includes(n));
    ok(leak.length === 0, `${TAG} 기업 이름·식별자 0 ${leak.length ? leak.slice(0, 5).join(",") : ""}`);
    ok(!/note_text/.test(a), `${TAG} 자유입력 칸 없음`);
    ok(!/zoom/.test(a), `${TAG} 줄여 맞추는 규칙 없음`);
    const keys = pa.map((p) => p.key);
    const lost = PROTO8.filter((k) => !keys.includes(k));
    ok(lost.length === 0, `${TAG} 12쪽 시안 열쇠가 전체 ${pa.length}쪽 안에 있다 ${lost.join(",")}`);
    const proto = pa.filter((p) => (PROTO8 as readonly string[]).includes(p.key));
    /* 쪽 번호만 html8 이 채운다(시안은 1~12, 전체는 제 자리 번호). 그 한 칸을 걷고 견준다 */
    const pnless = (x: string) => x.replace(/<span>(\d\d [^<]*· )?\d+<\/span>/g, "<span>#</span>");
    const fullN = pnless(a), protoN = pnless(html8(ea, proto, F));
    const secs = protoN.split("\n").filter((l) => l.startsWith("<section"));
    ok(secs.length === 12 && secs.every((l) => fullN.includes(l)), `${TAG} 시안 12쪽의 HTML 이 전체 결과지 안에 그대로 있다(쪽 번호 칸만 다름)`);
  }
  console.log(`\n통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
