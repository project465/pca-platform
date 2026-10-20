/**
 * **Track E 4차: 편집판 렌더러를 운영 경로에 붙이기 전 검사(파일만 · 운영 경로 연결 없음).**
 *   CASES=RICH:1,POOR:2,CONTRA:3 npx tsx scripts/lab/trackE-r4.ts
 * 1. 같은 굳은 결과에서 두 번 그린 HTML 이 바이트까지 같은가(다시 내려받아도 같은 결과지)
 * 2. 기업 자료(지역 기업 목록의 이름·식별자)가 HTML 에 한 글자도 없는가
 * 3. 경험 기록의 자유입력(note_text)이 들어가지 않는가 — 모델에 그 칸이 없다
 * 4. 줄여 맞추는 코드(zoom)가 없는가
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { load3 } from "./gm-report3";
import { edit } from "../../src/lib/me-v3/report-gm/editorial";
import { pages7, html7 } from "../../src/lib/me-v3/report-gm/render7";

const CASES = (process.env.CASES ?? "RICH:1,POOR:2,CONTRA:3").split(",").map((x) => x.split(":"));
const F = { href: "fonts/pretendard", family: "Pretendard" };
const orgs = JSON.parse(readFileSync("data/region/kr-chungcheong-orgs.v2.json", "utf8"));
const names: string[] = (orgs.orgs ?? orgs.items ?? []).flatMap((o: { name: string; identifiers?: Record<string, string> }) => [o.name.replace(/\(주\)|㈜|주식회사/g, "").trim(), ...Object.values(o.identifiers ?? {}).map(String)]).filter((s: string) => s && s.length >= 3);
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); c ? pass++ : fail++; };
(async () => {
  ok(names.length > 10, `기업 목록에서 이름·식별자 ${names.length}개를 읽었다`);
  for (const [TAG, ID] of CASES) {
    const a = html7(edit(await load3(ID)), pages7(edit(await load3(ID))), F);
    const b = html7(edit(await load3(ID)), pages7(edit(await load3(ID))), F);
    const ha = createHash("sha256").update(a).digest("hex").slice(0, 16);
    ok(a === b, `${TAG} 두 번 그린 HTML 이 같다 (${ha})`);
    const leak = names.filter((n) => a.includes(n));
    ok(leak.length === 0, `${TAG} 기업 이름·식별자 0 ${leak.length ? leak.slice(0, 5).join(",") : ""}`);
    ok(!/note_text/.test(a), `${TAG} 자유입력 칸 없음`);
    ok(!/zoom/.test(a), `${TAG} 줄여 맞추는 규칙 없음`);
  }
  console.log(`\n통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
