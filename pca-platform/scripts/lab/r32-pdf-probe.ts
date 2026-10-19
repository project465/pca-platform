/** 끝낸 응시 하나의 종이를 지금 빌드로 뽑아 쪽 수와 글자를 떠 둔다. OUT=var/r32/pdf-pre
 *  ATT=<응시번호> 를 주면 **그 응시**(예: R30 사람 C 의 BIZ 응시)를 그 주인으로 들어가 뽑는다.
 *  주지 않으면 가장 최근에 끝난 PRO 응시를 베껴 온다: 그 사이에 다른 Core 의 검사가
 *  돌았으면 그 Core 의 종이가 나온다(한 번 STYLE 이 나왔다). 비밀번호는 그 자리에서
 *  다시 적고 적어 두지 않는다 */
import { randomBytes } from "node:crypto";
import { hashPassword } from "../../src/lib/password";
import { query } from "../../src/lib/db";
import { loadEnv, BASE, makeStudent, cloneFinished, login } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { queryOne } from "../../src/lib/db";
async function main() {
  const OUT = process.env.OUT ?? "var/r32/pdf-pre"; mkdirSync(OUT, { recursive: true });
  let who: string; let pw: string; let att: string | null;
  if (process.env.ATT) {
    att = process.env.ATT;
    const u = await queryOne<{ login_id: string }>(
      `SELECT u.login_id FROM v3_attempts a JOIN users u ON u.id = a.user_id WHERE a.id = $1::bigint`, [att]);
    if (!u) throw new Error(`응시 ${att} 의 주인을 못 찾았다`);
    who = u.login_id; pw = randomBytes(18).toString("base64url");
    await query(`UPDATE users SET password_hash = $2 WHERE login_id = $1`, [who, await hashPassword(pw)]);
  } else {
    who = `r32p-${Date.now().toString(36)}`;
    const made = await makeStudent(who); pw = made.pw;
    att = await cloneFinished(made.id, "PRO");
  }
  if (!att) throw new Error("끝낸 응시를 못 만들었다");
  const row = await queryOne<{ core_code: string; university_code: string | null }>(`SELECT core_code, university_code FROM v3_attempts WHERE id = $1`, [att]);
  console.log("응시", att, row);
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await login(c, who, pw);
  const r = await p.request.get(`${BASE}/v3/${att}/result/pdf`);
  console.log("pdf", r.status(), r.headers()["content-type"]);
  const buf = await r.body(); writeFileSync(`${OUT}/result.pdf`, buf);
  execFileSync("pdftoppm", ["-r", "96", "-png", `${OUT}/result.pdf`, `${OUT}/page`]);
  const txt = execFileSync("pdftotext", ["-layout", `${OUT}/result.pdf`, "-"]).toString();
  writeFileSync(`${OUT}/result.txt`, txt);
  const pages = txt.split("\f").filter((x) => x.trim()).length;
  console.log("bytes", buf.length, "pages", pages);
  await b.close(); process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
