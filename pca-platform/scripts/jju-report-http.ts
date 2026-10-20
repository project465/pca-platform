/**
 * 전주대 리포트의 두 경로(`/jju/report/{id}` · `/jju/report/{id}/pdf`)를 **실제 HTTP 소켓**으로 부른다.
 *
 * Next 를 띄울 수 없는 환경이라(`docs/jju/r3/evidence/runtime.txt`) 라우트 파일의 `GET` 을
 * node http 서버에 그대로 꽂는다. 바뀐 것은 로그인 하나다: 쿠키 `harness_uid` 를 읽어
 * 그 사람을 세션으로 넘긴다(`next-auth` 하네스 대체기). **Auth.js 쿠키·미들웨어·302 를 재는
 * 검사가 아니다.** 여기서 재는 것은 그 아래다: 상태 코드 · Content-Type · Content-Disposition ·
 * 받은 바이트가 PDF 인가 · 남의 응시와 없는 응시가 막히는가.
 *
 *   V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json scripts/lab/offline/tsr scripts/jju-report-http.ts
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { queryOne } from "../src/lib/db";
import { GET as htmlGET } from "../src/app/jju/report/[attemptId]/route";
import { GET as pdfGET } from "../src/app/jju/report/[attemptId]/pdf/route";

const OUT = process.env.OUT ?? "docs/jju/r3/tests/http";
const als = new AsyncLocalStorage<{ uid: string | null }>();
(globalThis as Record<string, unknown>).__harnessAuth = async () => {
  const uid = als.getStore()?.uid;
  if (!uid) return null;
  const u = await queryOne<{ id: string; display_name: string }>(`SELECT id::text, display_name FROM users WHERE id=$1::bigint`, [uid]);
  return u ? { user: { id: u.id, name: u.display_name, locale: "ko", mustResetPw: false, role: "student", memberships: [] } } : null;
};

let pass = 0; const bad: string[] = []; const log: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) pass++; else bad.push(w);
  const s = `  ${c ? "통과" : "걸림"}  ${w}${saw ? " — " + saw : ""}`; console.log(s); log.push(s);
};

const server = createServer((req, res) => {
  const m = /^\/jju\/report\/([^/?]+)(\/pdf)?\/?$/.exec(req.url ?? "");
  const uid = /(?:^|;\s*)harness_uid=(\d+)/.exec(req.headers.cookie ?? "")?.[1] ?? null;
  if (!m) { res.writeHead(404).end(); return; }
  als.run({ uid }, async () => {
    try {
      const r = await (m[2] ? pdfGET : htmlGET)(new Request(`http://local${req.url}`), { params: Promise.resolve({ attemptId: decodeURIComponent(m[1]) }) });
      const h: Record<string, string> = {}; r.headers.forEach((v, k) => { h[k] = v; });
      res.writeHead(r.status, h).end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      const d = (e as { digest?: string }).digest ?? "";
      if (d.startsWith("NEXT_REDIRECT;")) { res.writeHead(307, { location: d.split(";")[1] }).end(); return; }
      res.writeHead(500).end(String(e));
    }
  });
});

async function main() {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  const id = async (l: string) => (await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [l]))?.id;
  const rows: [string, string][] = [["A", "qa-jju-qaa"], ["B", "qa-jju-qab"], ["C", "qa-jju-qac"]];
  mkdirSync(`${OUT}/pdf`, { recursive: true });
  const table = ["| 요청 | 누구 | 상태 | Content-Type | Content-Disposition | 바이트 |", "|---|---|---|---|---|---|"];
  const get = async (path: string, uid: string | null, who: string) => {
    const r = await fetch(base + path, { headers: uid ? { cookie: `harness_uid=${uid}` } : {}, redirect: "manual" });
    const body = Buffer.from(await r.arrayBuffer());
    table.push(`| \`${path.replace(/\d+/, "{id}")}\` | ${who} | ${r.status}${r.headers.get("location") ? ` → ${r.headers.get("location")}` : ""} | ${r.headers.get("content-type") ?? ""} | ${r.headers.get("content-disposition") ?? ""} | ${body.length} |`);
    return { r, body };
  };

  for (const [k, login] of rows) {
    const uid = await id(login);
    const att = (await queryOne<{ id: string }>(`SELECT id::text FROM v3_attempts WHERE user_id=$1::bigint AND status='scored'`, [uid]))?.id;
    if (!uid || !att) throw new Error(`${login}: scripts/jju-verify.ts 를 먼저 돌린다`);
    const h = await get(`/jju/report/${att}`, uid, `본인 ${k}`);
    ok(`${k} 웹 리포트 200 · text/html`, h.r.status === 200 && /text\/html/.test(h.r.headers.get("content-type") ?? ""), `${h.r.status} ${h.body.length}B`);
    const p = await get(`/jju/report/${att}/pdf`, uid, `본인 ${k}`);
    const disp = p.r.headers.get("content-disposition") ?? "";
    ok(`${k} PDF 200 · application/pdf · attachment · %PDF`, p.r.status === 200 && p.r.headers.get("content-type") === "application/pdf"
      && /^attachment; filename="careermatri-jju-\d+\.pdf"$/.test(disp) && p.body.subarray(0, 4).toString() === "%PDF", `${p.r.status} ${disp} ${p.body.length}B`);
    ok(`${k} PDF 를 캐시하지 않는다`, p.r.headers.get("cache-control") === "no-store");
    if (p.r.status === 200) writeFileSync(`${OUT}/pdf/jju-report-${k}.http.pdf`, p.body);
  }

  const A = (await id("qa-jju-qaa"))!, B = (await id("qa-jju-qab"))!;
  const attA = (await queryOne<{ id: string }>(`SELECT id::text FROM v3_attempts WHERE user_id=$1::bigint AND status='scored'`, [A]))!.id;
  for (const [who, uid] of [["같은 학교 학생 B", B], ["전주대 담당자", await id("qa-jju-admin")], ["배재대 학생", await id("qa-pcu-qap1")], ["배재대 담당자", await id("qa-pcu-admin")]] as [string, string][]) {
    for (const suf of ["", "/pdf"]) {
      const x = await get(`/jju/report/${attA}${suf}`, uid, who);
      ok(`${who} → A 의 ${suf ? "PDF" : "웹 리포트"} 404`, x.r.status === 404 && x.body.subarray(0, 4).toString() !== "%PDF", `${x.r.status}`);
    }
  }
  const anon = await get(`/jju/report/${attA}/pdf`, null, "로그인 안 함");
  ok("로그인하지 않으면 로그인 화면으로 보낸다(307 → /login)", anon.r.status === 307 && anon.r.headers.get("location") === "/login", `${anon.r.status} ${anon.r.headers.get("location")}`);
  const none = await get(`/jju/report/99999999/pdf`, A, "본인 A");
  ok("없는 응시 번호는 404", none.r.status === 404, `${none.r.status}`);
  const pcuAtt = (await queryOne<{ id: string; uid: string }>(`SELECT id::text, user_id::text uid FROM v3_attempts WHERE university_code='PCU' AND status='scored' LIMIT 1`));
  if (pcuAtt) {
    const o = await get(`/jju/report/${pcuAtt.id}/pdf`, pcuAtt.uid, "배재대 학생 본인");
    ok("배재대 학생 본인의 배재대 응시는 전주대 리포트로 그리지 않는다(404)", o.r.status === 404, `${o.r.status}`);
  }

  server.close();
  writeFileSync(`${OUT}/http-matrix.md`, ["# 전주대 리포트 경로 · 하네스 HTTP", "",
    "라우트 파일의 `GET` 을 node http 서버에 꽂고 `fetch` 로 불렀다. 로그인은 하네스 세션(쿠키 `harness_uid`)이고 Auth.js 가 아니다.", "", ...table, ""].join("\n"));
  writeFileSync(`${OUT}/jju-report-http.log`, log.join("\n") + `\n\n통과 ${pass} · 걸림 ${bad.length}\n${bad.map((b) => "- " + b).join("\n")}\n`);
  console.log(`\n  통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); server.close(); process.exit(2); });
