/**
 * PWA 1단계가 **돌아가는지** 센다. 적혀 있는지가 아니라.
 *
 *   1. 매니페스트 · 아이콘(파일 크기가 적힌 크기와 같은가)
 *   2. 서비스 워커가 로그인한 뒤의 쪽을 저장하지 않는가
 *   3. 웹 알림 암호화를 **받는 쪽 열쇠로 다시 연다**(RFC 8291) · 서명을 공개
 *      열쇠로 확인한다(RFC 8292). 직접 쓴 암호라 풀어 보지 않으면 맞는지 모른다
 *   4. 구독은 본인 것만 · 남의 기기를 옮겨 받으면 앞사람 줄이 사라진다 ·
 *      404/410 이면 지운다 · 탈퇴 목록에 있다
 *   5. 알림 글에 사람을 가리키는 말이 없다
 *   6. (UI_BASE 가 있으면) 실제 브라우저로 서비스 워커가 붙고, 연결을 끊으면
 *      안내 한 장이 서는지
 *
 *   npm run pwa:check
 *   UI_BASE=http://127.0.0.1:3100 npm run pwa:check
 */
import { loadEnv } from "./_loop-fixture";
loadEnv();
import { createDecipheriv, createECDH, hkdfSync, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import manifest from "../src/app/manifest";
import { query, queryOne } from "../src/lib/db";
import {
  deleteSubscription, encryptPayload, generateVapidKeys, pushKeys, saveSubscription, sendPush,
  vapidHeader, verifyVapid,
} from "../src/lib/push";

let pass = 0, fail = 0;
const ok = (n: string, good: boolean, d = "") => {
  if (good) pass += 1; else fail += 1;
  console.log(`  ${good ? "통과" : "걸림"}  ${n}${d ? " — " + d : ""}`);
};

function pngSize(path: string): [number, number] {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

/** 받는 쪽(브라우저)이 하는 일. 시험에서만 쓴다 */
function decrypt(body: Buffer, ua: ReturnType<typeof createECDH>, auth: Buffer): Buffer {
  const salt = body.subarray(0, 16);
  const idlen = body[20];
  const asPublic = body.subarray(21, 21 + idlen);
  const ct = body.subarray(21 + idlen);
  const shared = ua.computeSecret(asPublic);
  const h = (s: Buffer, i: Buffer, info: string | Buffer, n: number) => Buffer.from(hkdfSync("sha256", i, s, info, n));
  const ikm = h(auth, shared, Buffer.concat([Buffer.from("WebPush: info\0"), ua.getPublicKey(), asPublic]), 32);
  const cek = h(salt, ikm, "Content-Encoding: aes128gcm\0", 16);
  const nonce = h(salt, ikm, "Content-Encoding: nonce\0", 12);
  const d = createDecipheriv("aes-128-gcm", cek, nonce);
  d.setAuthTag(ct.subarray(ct.length - 16));
  const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  const end = plain.lastIndexOf(2);
  return plain.subarray(0, end);
}

function fakeDevice() {
  const ua = createECDH("prime256v1"); ua.generateKeys();
  const auth = randomBytes(16);
  return { ua, auth, p256dh: ua.getPublicKey("base64url"), authB64: auth.toString("base64url") };
}

async function main() {
  console.log("\n── 1. 매니페스트 · 아이콘 ──");
  const m = manifest();
  ok("여는 자리가 작업공간이다", m.start_url === "/me" && m.id === "/me");
  ok("홈 화면 앱으로 연다", m.display === "standalone");
  ok("색이 상표의 파랑이다", m.theme_color === "#2F6BFF");
  for (const ic of m.icons ?? []) {
    const p = `public${ic.src}`;
    const [w, h] = existsSync(p) ? pngSize(p) : [0, 0];
    ok(`아이콘 ${ic.src} 이 적힌 크기다`, `${w}x${h}` === ic.sizes, `${w}x${h}`);
  }
  ok("잘라 쓰는 아이콘(maskable)이 있다", (m.icons ?? []).some((i) => i.purpose === "maskable"));
  ok("아이폰 아이콘이 180 이다", existsSync("public/brand/careermatri/apple-touch-180.png")
    && pngSize("public/brand/careermatri/apple-touch-180.png")[0] === 180);
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  ok("모든 쪽에서 서비스 워커를 붙인다", /<PwaRegister \/>/.test(layout));
  ok("아이폰 홈 화면 표시가 있다", /apple-touch-180/.test(layout) && /appleWebApp/.test(layout));

  console.log("\n── 2. 서비스 워커 ──");
  const sw = readFileSync("public/sw.js", "utf8");
  const code = sw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok("쪽 응답을 저장하지 않는다(cache.put 없음)", !/\.put\(/.test(code));
  const keep = /const KEEP = \[([^\]]+)\]/.exec(code)?.[1] ?? "";
  ok("저장하는 것은 안내 한 장과 아이콘뿐이다", !/\/me|\/v3|\/my|\/api/.test(keep), keep.trim());
  ok("저장해 둘 파일이 전부 있다", [...keep.matchAll(/"([^"]+)"/g)].every((x) => existsSync(`public${x[1]}`)));
  ok("알림을 띄우고 누르면 연다", /addEventListener\("push"/.test(code) && /notificationclick/.test(code));
  ok("알림이 바깥 주소를 열지 않는다", /startsWith\("\/"\)/.test(code) && /self\.location\.origin/.test(code));

  console.log("\n── 3. 암호와 서명 ──");
  const keys = generateVapidKeys();
  const kset = { ...keys, subject: "mailto:test@example.com" };
  const dev = fakeDevice();
  const msg = Buffer.from(JSON.stringify({ title: "CareerMatri", body: "이번 주 할 일이 하나 있습니다." }));
  const enc = encryptPayload(msg, dev.p256dh, dev.authB64);
  let opened = "";
  try { opened = decrypt(enc, dev.ua, dev.auth).toString(); } catch (e) { opened = String(e); }
  ok("받는 쪽 열쇠로 다시 열린다", opened === msg.toString());
  ok("열 때마다 다른 글이 된다(한 번 쓰는 열쇠)", !encryptPayload(msg, dev.p256dh, dev.authB64).equals(enc));
  const other = fakeDevice();
  let wrong = false; try { decrypt(enc, other.ua, other.auth); } catch { wrong = true; }
  ok("남의 기기 열쇠로는 열리지 않는다", wrong);
  const hdr = vapidHeader("https://fcm.googleapis.com/fcm/send/abc", kset);
  ok("서명이 공개 열쇠로 풀린다", verifyVapid(hdr, keys.publicKey));
  ok("다른 공개 열쇠로는 풀리지 않는다", !verifyVapid(hdr, generateVapidKeys().publicKey));
  const claims = JSON.parse(Buffer.from(/t=[^.]+\.([^.]+)\./.exec(hdr)![1], "base64url").toString());
  ok("받는 서버(aud)가 그 푸시 서버다", claims.aud === "https://fcm.googleapis.com");
  ok("기한이 하루 안이다", claims.exp - Date.now() / 1000 <= 24 * 3600);

  const saved = { pub: process.env.VAPID_PUBLIC_KEY, priv: process.env.VAPID_PRIVATE_KEY };
  delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY;
  ok("열쇠가 없으면 꺼져 있다", pushKeys() === null);
  process.env.VAPID_PUBLIC_KEY = "abc"; process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  ok("꼴이 틀린 열쇠면 꺼져 있다", pushKeys() === null);
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  ok("두 열쇠가 맞으면 켜진다", pushKeys()?.publicKey === keys.publicKey);

  console.log("\n── 4. 구독 ──");
  const mk = async (tag: string) => (await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, is_demo)
     VALUES ($1, $2, '시험', 'x', 'active', true) RETURNING id::text`,
    [`pwa-${tag}-${Date.now()}`, `pwa-${tag}-${Date.now()}@example.com`]))!.id;
  const A = await mk("a"), B = await mk("b");
  const d1 = fakeDevice(), d2 = fakeDevice();
  const ep1 = `https://push.example.com/send/${randomBytes(8).toString("hex")}`;
  const ep2 = `https://push.example.com/send/${randomBytes(8).toString("hex")}`;
  await saveSubscription(A, { endpoint: ep1, p256dh: d1.p256dh, auth: d1.authB64 });
  await saveSubscription(A, { endpoint: ep1, p256dh: d1.p256dh, auth: d1.authB64 });
  await saveSubscription(B, { endpoint: ep2, p256dh: d2.p256dh, auth: d2.authB64 });
  const cnt = async (u: string) => (await query<{ n: number }>(`SELECT count(*)::int n FROM push_subscriptions WHERE user_id=$1`, [u]))[0].n;
  ok("같은 기기를 두 번 켜도 한 줄이다", (await cnt(A)) === 1);
  ok("남의 구독을 지울 수 없다", (await deleteSubscription(A, ep2)) === 0 && (await cnt(B)) === 1);
  let bad = false; try { await saveSubscription(A, { endpoint: "http://insecure/x", p256dh: d1.p256dh, auth: d1.authB64 }); } catch { bad = true; }
  ok("https 가 아닌 주소는 받지 않는다", bad);
  /* 공용 기기: B 가 A 가 쓰던 기기에서 켜면 A 의 줄이 B 로 옮겨 간다 */
  await saveSubscription(B, { endpoint: ep1, p256dh: d1.p256dh, auth: d1.authB64 });
  ok("공용 기기에서는 마지막 사람만 받는다", (await cnt(A)) === 0 && (await cnt(B)) === 2);

  const got: { url: string; body: Buffer; auth: string }[] = [];
  let reply = 201;
  const fake = (async (url: string, init: RequestInit) => {
    got.push({ url, body: Buffer.from(init.body as Uint8Array), auth: String((init.headers as Record<string, string>).Authorization) });
    return new Response(null, { status: reply });
  }) as unknown as typeof fetch;
  const r1 = await sendPush(B, { title: "CareerMatri", body: "이번 주 할 일이 하나 있습니다.", url: "/me/next" }, fake);
  ok("기기마다 한 번씩 보낸다", r1.sent === 2 && got.length === 2);
  const one = got.find((g) => g.url === ep1)!;
  const plain = JSON.parse(decrypt(one.body, d1.ua, d1.auth).toString());
  ok("보낸 글이 그 기기에서 열린다", plain.body === "이번 주 할 일이 하나 있습니다." && plain.url === "/me/next");
  ok("글에 이름 · 이메일 · 점수가 없다", Object.keys(plain).sort().join(",") === "body,tag,title,url"
    && !/시험|@|점/.test(JSON.stringify(plain)));
  ok("서명이 우리 열쇠다", verifyVapid(one.auth, keys.publicKey));
  const r2 = await sendPush(B, { title: "x", body: "y", url: "https://evil.example/" }, fake);
  const last = JSON.parse(decrypt(got[got.length - 1].url === ep1 ? got[got.length - 1].body : got[got.length - 2].body, d1.ua, d1.auth).toString());
  ok("바깥 주소는 /me 로 바뀐다", r2.sent === 2 && last.url === "/me");
  reply = 410;
  const r3 = await sendPush(B, { title: "x", body: "y", url: "/me" }, fake);
  ok("기기에서 끈 구독(410)은 지운다", r3.dropped === 2 && (await cnt(B)) === 0);

  const er = readFileSync("src/lib/erasure.ts", "utf8");
  ok("탈퇴하면 지운다", /table: "push_subscriptions"/.test(er));
  const chain = JSON.parse(readFileSync("deploy/db-chain.json", "utf8"));
  ok("운영 DB 차례에 들어 있다", chain.upgrade.includes("db/schema_push.sql"));
  await query(`DELETE FROM users WHERE id = ANY($1::bigint[])`, [[A, B]]);
  if (saved.pub) process.env.VAPID_PUBLIC_KEY = saved.pub; else delete process.env.VAPID_PUBLIC_KEY;
  if (saved.priv) process.env.VAPID_PRIVATE_KEY = saved.priv; else delete process.env.VAPID_PRIVATE_KEY;

  const BASE = process.env.UI_BASE;
  if (BASE) {
    console.log("\n── 5. 실제 브라우저 ──");
    /* 서비스 워커가 내는 요청까지 가로채려면 이 값이 있어야 한다(크로뮴 · Playwright) */
    process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
    const { chromium } = await import("playwright");
    const br = await chromium.launch();
    const ctx = await br.newContext();
    const p = await ctx.newPage();
    const man = await p.request.get(`${BASE}/manifest.webmanifest`);
    const mj = man.ok() ? await man.json() : {};
    ok("매니페스트가 내려온다", man.ok() && mj.start_url === "/me", String(man.status()));
    const swr = await p.request.get(`${BASE}/sw.js`);
    ok("서비스 워커 파일이 내려온다", swr.ok() && /javascript/.test(swr.headers()["content-type"] ?? ""), swr.headers()["content-type"]);
    await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    const ready = await p.evaluate(() => Promise.race([
      navigator.serviceWorker.ready.then((r) => r.active?.scriptURL ?? ""),
      new Promise<string>((res) => setTimeout(() => res(""), 15000)),
    ]));
    ok("쪽을 열면 서비스 워커가 붙는다", /\/sw\.js$/.test(ready), ready);
    const link = await p.$eval('link[rel="manifest"]', (l) => l.getAttribute("href")).catch(() => null);
    ok("쪽 머리에 매니페스트가 걸려 있다", link === "/manifest.webmanifest", String(link));
    await p.reload({ waitUntil: "networkidle" });
    /* `setOffline` 은 서비스 워커가 내는 요청에 먹지 않아(크로뮴) 끊긴 것처럼 보이지
       않는다. 그래서 쪽 요청을 **망 오류로 끊는다**: 서비스 워커의 fetch 가 실패하는
       모양이 실제로 연결이 끊긴 때와 같다. 서버를 실제로 꺼 보는 확인은 따로 했다 */
    await ctx.route(/\/me(\?|$)/, (r) => r.abort("internetdisconnected"));
    await p.goto(`${BASE}/me`).catch(() => undefined);
    const txt = await p.locator("body").innerText().catch(() => "");
    ok("연결이 끊기면 안내 한 장이 선다", /인터넷 연결이 끊겼습니다/.test(txt), txt.slice(0, 30).replace(/\n/g, " "));
    await ctx.unroute(/\/me(\?|$)/);
    await br.close();
  } else {
    console.log("\n  못 봄  실제 브라우저 — UI_BASE 를 주면 봅니다");
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
