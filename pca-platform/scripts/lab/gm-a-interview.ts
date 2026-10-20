/**
 * **면접 질문 ↔ ‘내가 정한 것’ 이 같은 판단(J1~J8)을 가리키는가를 센다.** (Track A · v8)
 *
 * 질문이 묻는 판단(축)과, 그 질문 아래 ‘내가 정한 것’ 칸에 붙은 학생의 문장이 체크리스트에서
 * 서 있는 판단이 다르면 어긋남이다. 고른 문장이 없어서 직접 기입 칸으로 둔 것은 어긋남이 아니다.
 * 데이터(Report3)와 그린 글(gm-full6 이 남긴 HTML 의 70쪽) 둘 다 본다. 어긋남은 0 이어야 한다.
 *
 *   CASES=RICH:1,POOR:2,CONTRA:3 npx tsx scripts/lab/gm-a-interview.ts
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { load3 } from "./gm-report3";
import { content } from "../../src/lib/me-v3/runtime/session";
import { stepForAxis } from "../../src/lib/me-v3/report-gm/report3";

const CASES = (process.env.CASES ?? "RICH:1,POOR:2,CONTRA:3").split(",").map((x) => x.split(":") as [string, string]);
const WORK = path.resolve("var/pdf-gm");
const AXIS_NAME: Record<string, string> = { J1: "문제 정의", J2: "요구 해석", J3: "직접 판단", J4: "방법·도구", J5: "산출물", J6: "비교·검증", J7: "실패·수정", J8: "조직 활용" };
const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").trim();

async function main(): Promise<void> {
  let bad = 0;
  for (const [TAG, ID] of CASES) {
    const r = await load3(ID);
    const core = r.core;
    const ckl = content(core).checklists.domains;
    const axisOf = (td: string | undefined, text: string): string | undefined =>
      td ? Object.entries(ckl[td] ?? {}).find(([, list]) => list.some((x) => x.text === text))?.[0] : undefined;
    const qs = r.application.interview.filter((x) => !/^준비 —/.test(x.material)).slice(0, 5);
    console.log(`\n## ${TAG} (응시 ${ID}) · 확인된 경험 질문 ${qs.length}개`);
    let mis = 0, slot = 0, ok = 0;
    for (const [i, x] of qs.entries()) {
      const pickAxis = x.pick ? axisOf(x.domain, x.pick) : undefined;
      let state: string;
      if (!x.pick) { state = "직접 기입"; slot++; }
      else if (x.axis && pickAxis !== x.axis) { state = `어긋남(질문 ${x.axis} ≠ 문장 ${pickAxis ?? "?"})`; mis++; }
      else if (!x.axis && !pickAxis) { state = "판단 미상"; mis++; }
      else { state = "같은 판단"; ok++; }
      console.log(`  ${i + 1}. [${x.axis ?? pickAxis ?? "-"} ${AXIS_NAME[x.axis ?? pickAxis ?? ""] ?? ""}] ${x.q.replace(/^“|”$/g, "")}\n     내가 정한 것: ${x.pick ?? "(직접 기입)"} → ${state}`);
    }
    /* 그린 글: 70쪽의 ‘내가 정한 것’ 칸이 데이터의 pick(또는 직접 기입)과 같은가 */
    const html = path.join(WORK, `BIZ-PRO-${TAG}.html`);
    let rmis = 0;
    if (existsSync(html)) {
      const s = readFileSync(html, "utf8");
      const m = s.match(/data-page="70"[\s\S]*?(?=data-page="7[1-9]"|$)/);
      const dds = m ? [...m[0].matchAll(/<dt>내가 정한 것<\/dt><dd>([\s\S]*?)<\/dd>/g)].map((x) => strip(x[1])) : [];
      for (const [i, x] of qs.entries()) {
        const got = dds[i] ?? "";
        const want = x.pick ?? "";
        const same = want ? got === want : /직접 기입/.test(got);
        if (!same) { rmis++; console.log(`  그린 글 ${i + 1}: 기대 ‘${want || "직접 기입"}’ · 실제 ‘${got}’`); }
      }
      console.log(`  그린 글(70쪽) 칸 ${dds.length}개 · 데이터와 다른 칸 ${rmis}`);
    } else console.log("  그린 글: HTML 없음(gm-full6 을 먼저 돌린다)");
    console.log(`  같은 판단 ${ok} · 직접 기입 ${slot} · 어긋남 ${mis}`);
    /* v9: 기업 심층 쪽의 ‘기록·응답 문장 ↔ 회사 직무 단계’ 짝. 짝을 지었으면 그 단계가 문장과 같은 판단의 동사를 써야 한다
       (`stepForAxis` 가 고른 단계를 다시 대어 본다). 짝을 짓지 않은 자리는 어긋남이 아니고, 그 사실이 글에 적혀 있어야 한다 */
    let pmis = 0, pon = 0, poff = 0;
    for (const c of r.companies) for (const jb of c.jobs) {
      const pr = jb.pair;
      if (!pr) { console.log(`  [기업] ${c.name} · ${jb.name}: 짝 대상 없음 — ${jb.develop.slice(0, 60)}…`); continue; }
      const again = stepForAxis(pr.axis, jb.flow);
      if (pr.step) {
        pon++;
        const okStep = again === pr.step && jb.develop.includes(pr.step);
        if (!okStep) pmis++;
        console.log(`  [기업] ${c.name} · ${jb.name}: [${pr.axis} ${AXIS_NAME[pr.axis ?? ""] ?? ""}] ‘${pr.from}’ ↔ ‘${pr.step}’ → ${okStep ? "같은 판단" : "어긋남"}`);
      } else {
        poff++;
        const said = /짝을 짓지 않았습니다/.test(jb.develop);
        if (!said || again) pmis++;
        console.log(`  [기업] ${c.name} · ${jb.name}: [${pr.axis} ${AXIS_NAME[pr.axis ?? ""] ?? ""}] ‘${pr.from}’ ↔ (맞는 단계 없음) → ${said && !again ? "짝 안 지음(글에 적음)" : "어긋남"}`);
      }
    }
    console.log(`  기업 짝: 지음 ${pon} · 안 지음 ${poff} · 어긋남 ${pmis}`);
    bad += mis + rmis + pmis;
  }
  console.log(`\n어긋남 합계 ${bad}`);
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
