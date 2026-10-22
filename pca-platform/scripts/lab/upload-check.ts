/**
 * MAT 파일 읽기를 실제 DB 로 한 바퀴 돈다(로컬·staging 전용).
 *
 *   LOGIN=test-jju-cs-01 npx tsx scripts/lab/upload-check.ts
 *
 * **Claude 쪽은 가짜 서버로 받는다**(`ANTHROPIC_BASE_URL`). 그래서 열쇠 없이도
 * 돌고, 대신 **보내는 요청의 모양**을 센다: 모델이 Haiku 인가 · 서버 쪽 대체
 * 모델을 보내지 않는가 · 문서/그림 블록이 실렸는가 · 그림을 줄여 보내는가.
 * 돌려받은 것은 목록 밖의 보기와 학번 같은 숫자가 걸러지는지를 센다.
 *
 * 쌓는 줄(이용권 · 초안 · 업로드 기록)은 끝에서 지운다. 운영에서는 멈춘다.
 */
import { createServer, type IncomingMessage } from "node:http";
import { chromium } from "playwright";
import { query, queryOne } from "../../src/lib/db";
import { appEnv } from "../../src/lib/env";
import { catalog } from "../../src/lib/assistant/catalog";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`  ${cond ? "통과" : "걸림"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/* 가짜 Claude. 받은 본문을 남기고 정해 둔 답을 돌려준다 */
const seen: { path: string; body: Record<string, unknown>; headers: IncomingMessage["headers"] }[] = [];
let answer: unknown = null;
const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => { raw += c; });
  req.on("end", () => {
    seen.push({ path: req.url ?? "", body: JSON.parse(raw || "{}"), headers: req.headers });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      id: "msg_lab", type: "message", role: "assistant", model: "claude-haiku-5-5",
      content: [{ type: "text", text: JSON.stringify(answer) }],
      stop_reason: "end_turn", stop_sequence: null,
      usage: { input_tokens: 4321, output_tokens: 987 },
    }));
  });
});

const TRANSCRIPT = `<html><body style="font-family:sans-serif;padding:30px">
<h2>성 적 증 명 서</h2><p>성명: 홍길동 · 학번: 2023123456 · 생년월일: 2004.03.01</p>
<table border=1 cellpadding=4><tr><th>과목</th><th>학점</th><th>성적</th></tr>
<tr><td>캡스톤디자인</td><td>3</td><td>A+</td></tr><tr><td>자료구조</td><td>3</td><td>A0</td></tr>
<tr><td>대학영어</td><td>2</td><td>B+</td></tr></table></body></html>`;

async function files(): Promise<{ pdf: Buffer; png: Buffer }> {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 2400, height: 3200 } });
  await p.setContent(TRANSCRIPT);
  const pdf = await p.pdf({ format: "A4" });
  const png = await p.screenshot({ type: "png", fullPage: true });
  await b.close();
  return { pdf, png };
}

async function main(): Promise<void> {
  if (appEnv() === "production") { console.error("운영에서는 돌리지 않는다"); process.exit(2); }
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_API_KEY = "lab-not-a-key";
  /* 환경을 바꾼 뒤에 들여온다: 클라이언트가 처음 부를 때 주소를 읽는다 */
  const up = await import("../../src/lib/assistant/upload");
  const { setFileConsent } = await import("../../src/lib/assistant/settings");
  const { activeCoreOrPick } = await import("../../src/lib/me-v3/platform");

  const login = process.env.LOGIN ?? "test-jju-cs-01";
  const u = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [login]);
  if (!u) { console.error(`${login} 이 없다`); process.exit(2); }
  const uid = u.id;
  const core = await activeCoreOrPick(uid);
  const cat = catalog(core);
  const d0 = cat[0];
  console.log(`\n── MAT 파일 읽기 (사용자 ${uid} · ${core})\n`);

  const clean = async () => {
    await query(`DELETE FROM assistant_uploads WHERE user_id=$1`, [uid]);
    await query(`DELETE FROM assistant_drafts WHERE user_id=$1 AND draft->>'from'='file'`, [uid]);
  };
  await clean();
  await setFileConsent(uid, false);
  const { pdf, png } = await files();

  ok("PDF 를 첫 바이트로 알아본다", up.sniff(pdf) === "pdf");
  ok("PNG 를 첫 바이트로 알아본다", up.sniff(png) === "png");
  ok("이름만 .pdf 인 글은 받지 않는다", up.sniff(Buffer.from("hello world")) === null);
  ok("쪽 수를 어림한다", up.pdfPages(pdf) === 1, `${up.pdfPages(pdf)}쪽`);

  let r = await up.readUpload(uid, pdf);
  ok("동의가 없으면 읽지 않는다", !r.ok && r.reason === "consent");
  ok("동의 없이 Claude 를 부르지 않았다", seen.length === 0);
  await setFileConsent(uid, true);
  r = await up.readUpload(uid, Buffer.from("not a file at all"));
  ok("모르는 형식은 거절한다", !r.ok && r.reason === "type");

  /* 목록 밖의 보기 하나와 학번이 섞인 제목을 돌려준다 */
  const j1 = d0.checklist.J1[0] ?? "";
  answer = {
    doc_type: "transcript",
    items: [
      { kind: "capstone", title: "캡스톤디자인 2023123456", domains: [d0.code, "TD99"],
        problems: [j1, "목록에 없는 지어낸 문장"], decisions: [], artifacts: [], verifications: [],
        ask: ["캡스톤에서 직접 정한 기준은 무엇이었나요?"], source: "course" },
      { kind: "course", title: "자료구조", domains: [d0.code], problems: [], decisions: [],
        artifacts: [], verifications: [], ask: [], source: "course" },
    ],
  };
  r = await up.readUpload(uid, pdf);
  ok("PDF 를 읽어 초안 둘을 만든다", r.ok && r.drafts.length === 2, JSON.stringify(r).slice(0, 120));
  const req = seen.at(-1);
  const body = req?.body as { model?: string; fallbacks?: unknown; messages?: { content: { type: string }[] }[] } | undefined;
  ok("Haiku 5.5 로 부른다", body?.model === "claude-haiku-5-5", String(body?.model));
  ok("서버 쪽 대체 모델을 보내지 않는다", body?.fallbacks === undefined
    && !String(req?.headers["anthropic-beta"] ?? "").includes("server-side-fallback"));
  ok("문서 블록이 실렸다", body?.messages?.[0]?.content?.[0]?.type === "document");
  const drafts = await query<{ draft: { title: string; td: string[]; problems: string[]; from: string } }>(
    `SELECT draft FROM assistant_drafts WHERE user_id=$1 AND draft->>'from'='file' ORDER BY id`, [uid]);
  const first = drafts[0]?.draft;
  ok("학번 같은 긴 숫자를 제목에서 걷는다", first?.title === "캡스톤디자인", first?.title);
  ok("목록 밖의 영역 코드를 버린다", JSON.stringify(first?.td) === JSON.stringify([d0.code]));
  ok("목록 밖의 보기 문장을 버린다", first?.problems.length === (j1 ? 1 : 0), JSON.stringify(first?.problems));
  ok("초안이 파일에서 왔다고 적힌다", first?.from === "file");
  const row = await queryOne<{ status: string; input_tokens: number; sha256: string }>(
    `SELECT status, input_tokens, sha256 FROM assistant_uploads WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [uid]);
  ok("업로드 기록에 원본도 파일 이름도 없다", row?.status === "read" && row.sha256.length === 64);
  ok("쓴 토큰을 적어 둔다", row?.input_tokens === 4321);

  const before = seen.length;
  r = await up.readUpload(uid, pdf);
  ok("같은 파일은 다시 읽지 않는다", r.ok && r.reused && seen.length === before);
  ok("다시 올린 것은 건수에 세지 않는다", (await up.usedThisMonth(uid)) === 1);

  r = await up.readUpload(uid, png);
  const img = seen.at(-1)?.body as { messages?: { content: { type: string; source?: { media_type: string } }[] }[] };
  ok("그림을 읽는다", r.ok);
  ok("그림을 JPEG 로 줄여 보낸다", img.messages?.[0]?.content?.[0]?.source?.media_type === "image/jpeg");

  answer = { doc_type: "unreadable", items: [] };
  r = await up.readUpload(uid, Buffer.concat([pdf, Buffer.from(" ")]));
  ok("옮길 것이 없으면 그 사실을 돌려준다", !r.ok && r.reason === "empty");

  /* 한도: 이번 달 기록을 채워 둔다 */
  for (let i = 0; i < up.UPLOAD_MONTHLY_CAP; i++) {
    await query(`INSERT INTO assistant_uploads (user_id, core_code, sha256, file_kind, status)
                 VALUES ($1,$2,$3,'pdf','read')`, [uid, core, `lab${i}`.padEnd(64, "0")]);
  }
  const n = seen.length;
  r = await up.readUpload(uid, Buffer.concat([pdf, Buffer.from("  ")]));
  ok("한 달 10건을 넘으면 읽지 않는다", !r.ok && r.reason === "cap" && seen.length === n);

  const pend = await up.pendingFileDrafts(uid);
  ok("아직 적지 않은 초안을 다시 찾을 수 있다", pend.length >= 2);

  await clean();
  await setFileConsent(uid, false);
  server.close();
  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
