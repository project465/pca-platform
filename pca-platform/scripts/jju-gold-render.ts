/**
 * 전주대 Gold Master PDF 를 **제품과 같은 함수로** 뽑고 쪽마다 그림으로 떠서 센다(Track E).
 *
 * `jjuReportFor`(본인 확인 · 굳은 결과) → `jjuReportPdf`(Chromium) 를 그대로 부른다.
 * 따로 쓴 HTML 이 아니다. 학생 셋은 `jju-verify.ts` 가 서로 다른 답으로 끝낸
 * 합성 QA 계정이다(답을 이 스크립트가 고르지 않는다).
 *
 * 세는 것: 쪽 수 · 빈 쪽 · 대체 글자(□ · U+FFFD) · 내장되지 않은 글꼴 · 학생 사이에
 * 갈리는 문장(요약 · 직무 · 빈자리 · 할 일 · 워크북). **디자인 합격은 여기서
 * 정하지 않는다** — 사람이 그림을 본다(`GOLD_MASTER_HUMAN_REVIEW.md`).
 *
 *   V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json OUT=var/jju-gold npx tsx scripts/jju-gold-render.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { query } from "../src/lib/db";
import { jjuReportFor, jjuReportPdf } from "../src/lib/jju/report-pdf";

const OUT = process.env.OUT ?? "var/jju-gold";
const DPI = process.env.DPI ?? "150";
let pass = 0; const bad: string[] = []; const log: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) pass++; else bad.push(w);
  const s = `  ${c ? "통과" : "걸림"}  ${w}${saw ? " — " + saw : ""}`; console.log(s); log.push(s);
};
const sh = (cmd: string, args: string[]) => { try { return execFileSync(cmd, args, { encoding: "utf8" }); } catch { return ""; } };

async function main() {
  const rows = await query<{ attempt: string; login: string; uid: string }>(
    `SELECT a.id::text attempt, u.login_id login, u.id::text uid
       FROM v3_attempts a JOIN users u ON u.id = a.user_id
      WHERE a.university_code = 'JJU' AND u.login_id IN ('qa-jju-qaa','qa-jju-qab','qa-jju-qac') AND a.status = 'scored'
      ORDER BY u.login_id`);
  if (rows.length < 3) throw new Error("jju-verify.ts 를 먼저 돌린다(A/B/C 응시가 없다)");
  mkdirSync(`${OUT}/pdf`, { recursive: true }); mkdirSync(`${OUT}/png`, { recursive: true });
  const dump: Record<string, unknown> = {};
  const say: Record<string, string[]> = {};
  for (const r of rows) {
    const k = r.login.slice(-1).toUpperCase();
    const got = await jjuReportFor(r.attempt, r.uid);
    ok(`${k} 본인 응시로 문서가 선다`, got.ok, got.ok ? "" : got.why);
    if (!got.ok) continue;
    writeFileSync(`${OUT}/pdf/jju-gold-${k}.html`, got.html);
    const pdf = await jjuReportPdf(got.html);
    const file = `${OUT}/pdf/jju-gold-${k}.pdf`;
    writeFileSync(file, pdf);
    ok(`${k} PDF 가 나온다`, pdf.subarray(0, 4).toString() === "%PDF", `${pdf.length}B`);
    const pages = Number(/Pages:\s+(\d+)/.exec(sh("pdfinfo", [file]))?.[1] ?? 0);
    sh("pdftoppm", ["-r", DPI, "-png", file, `${OUT}/png/${k}`]);
    const pngs = readdirSync(`${OUT}/png`).filter((f) => f.startsWith(`${k}-`)).length;
    ok(`${k} 쪽마다 그림이 있다`, pngs === pages && pages > 0, `${pages}쪽 · 그림 ${pngs}`);
    /* 빈 쪽: 쪽마다 글자 수 */
    const per: number[] = [];
    for (let i = 1; i <= pages; i += 1) per.push(sh("pdftotext", ["-f", String(i), "-l", String(i), file, "-"]).replace(/\s+/g, "").length);
    ok(`${k} 빈 쪽이 없다(머리말·쪽 번호만 있는 쪽 없음)`, per.every((n) => n > 120), per.join(","));
    const text = sh("pdftotext", ["-layout", file, "-"]);
    ok(`${k} 대체 글자(□ · U+FFFD)가 없다`, !/[□�]/.test(text));
    const fonts = sh("pdffonts", [file]).split("\n").slice(2).filter(Boolean);
    const unemb = fonts.filter((l) => /\sno\s+(yes|no)\s+(yes|no)\s/.test(l));
    ok(`${k} 글꼴이 모두 내장됐다`, fonts.length > 0 && unemb.length === 0, `${fonts.length}개 · 미내장 ${unemb.length}`);
    ok(`${k} 점수·적합도·합격 가능성 숫자를 만들지 않는다`, !/(적합도|합격\s*가능성|백분위|상위)\s*[:：]?\s*\d+\s*(%|점)/.test(text));
    say[k] = [got.gold.title, got.gold.brief.map((b) => b.v).join("|"), got.gold.roles.map((x) => x.name + x.condition).join("|"),
      got.gold.gaps.map((g) => g.title + g.domains.join()).join("|"), got.work.projects.map((p) => p.title).join("|"),
      got.work.studio.map((s) => s.competence).join("|"), got.work.plan.flatMap((c) => c.items.map((i) => i.what)).join("|")];
    dump[k] = { attempt: r.attempt, pages, chars_per_page: per, gold: got.gold, work: got.work };
  }
  const ks = Object.keys(say);
  const parts = ["표지 문장", "요약 다섯 줄", "직무 카드", "빈자리", "과제", "자소서 문장", "30/90/180"];
  parts.forEach((p, i) => ok(`학생 셋의 ${p}이(가) 서로 다르다`, new Set(ks.map((k) => say[k][i])).size === ks.length,
    ks.map((k) => `${k}:${(say[k][i] || "(없음)").slice(0, 28)}`).join(" / ")));
  writeFileSync(`${OUT}/gold-dump.json`, JSON.stringify(dump, null, 1));
  writeFileSync(`${OUT}/jju-gold-render.log`, log.join("\n") + `\n\nPASS ${pass} · FAIL ${bad.length}\n`);
  console.log(`\n  PASS ${pass} · FAIL ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
