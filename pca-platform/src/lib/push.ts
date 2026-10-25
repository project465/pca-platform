import { createCipheriv, createECDH, createPrivateKey, createPublicKey, hkdfSync, randomBytes, sign, verify, createHash } from "node:crypto";
import { query } from "@/lib/db";
import { opFail, ref } from "@/lib/oplog";

/**
 * 웹 알림(Web Push). 홈 화면에 설치한 CareerMatri 와 브라우저에 MAT 할 일 ·
 * 공고 마감을 띄운다.
 *
 * **패키지를 쓰지 않는다.** 표준 둘(RFC 8292 VAPID · RFC 8291 메시지 암호화)을
 * Node 의 `crypto` 로 직접 쓴다. 들여올 것이 서명 하나와 암호화 하나뿐이고,
 * 의존성을 하나 늘리면 그것이 고쳐지지 않는 날 알림 전체가 멈춘다.
 * 맞는지는 `npm run pwa:check` 가 **풀어서** 본다: 암호화한 것을 받는 쪽
 * 열쇠로 다시 열고, 서명을 공개 열쇠로 확인한다.
 *
 * **열쇠가 없으면 아무것도 하지 않는다**(`VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY`).
 * 화면도 알림 켜기 단추를 세우지 않는다. 열쇠는 `npm run push:keys` 가
 * 한 번 만들어 보여 주고, 사업주가 Railway 변수에 넣는다.
 *
 * **보내는 글에 사람을 가리키는 말을 넣지 않는다.** 푸시 서버(구글·애플·
 * 모질라)는 본문을 못 읽지만(암호화), 잠긴 화면에는 그대로 뜬다. 그래서
 * 이름 · 점수 · 결과를 적지 않고 "이번 주 할 일이 하나 있습니다" 수준으로 쓴다.
 */

const b64u = (b: Buffer): string => b.toString("base64url");
const unb64u = (s: string): Buffer => Buffer.from(s, "base64url");

export type PushKeys = { publicKey: string; privateKey: string; subject: string };

/** 열쇠가 둘 다 꼴이 맞을 때만 켠다. 반쯤 들어간 값으로 보내면 푸시 서버가 거절하고 그 줄이 지워진다 */
export function pushKeys(): PushKeys | null {
  const pub = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
  const priv = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
  if (!pub || !priv) return null;
  try {
    if (unb64u(pub).length !== 65 || unb64u(priv).length !== 32) return null;
  } catch { return null; }
  const subject = (process.env.VAPID_SUBJECT ?? "").trim() || "mailto:hari_info@hari.re.kr";
  return { publicKey: pub, privateKey: priv, subject };
}

export function pushReady(): boolean { return pushKeys() !== null; }

/** 새 열쇠 한 벌. `push:keys` 가 부른다 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) };
}

function vapidKeyObject(pubRaw: Buffer, privRaw: Buffer) {
  return createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: b64u(privRaw), x: b64u(pubRaw.subarray(1, 33)), y: b64u(pubRaw.subarray(33, 65)) },
    format: "jwk",
  });
}

/** RFC 8292: 받는 푸시 서버(aud)에 대해 12시간짜리 서명 */
export function vapidHeader(endpoint: string, keys: PushKeys, now = Date.now()): string {
  const aud = new URL(endpoint).origin;
  const head = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(Buffer.from(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: keys.subject })));
  const data = Buffer.from(`${head}.${body}`);
  const sig = sign("sha256", data, { key: vapidKeyObject(unb64u(keys.publicKey), unb64u(keys.privateKey)), dsaEncoding: "ieee-p1363" });
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${keys.publicKey}`;
}

/** 시험용: 서명이 공개 열쇠로 풀리는지 */
export function verifyVapid(header: string, publicKey: string): boolean {
  const m = /t=([^.]+)\.([^.]+)\.([^,\s]+)/.exec(header);
  if (!m) return false;
  const pub = unb64u(publicKey);
  const key = createPublicKey({ key: { kty: "EC", crv: "P-256", x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: "jwk" });
  return verify("sha256", Buffer.from(`${m[1]}.${m[2]}`), { key, dsaEncoding: "ieee-p1363" }, unb64u(m[3]));
}

const hkdf = (salt: Buffer, ikm: Buffer, info: Buffer, len: number): Buffer =>
  Buffer.from(hkdfSync("sha256", ikm, salt, info, len));

/**
 * RFC 8291 aes128gcm. 받는 쪽 공개 열쇠(p256dh)와 비밀(auth)로 한 번 쓰는
 * 열쇠를 만들고, 본문을 한 덩어리(레코드 하나)로 싼다.
 */
export function encryptPayload(plain: Buffer, p256dh: string, auth: string, fixed?: { salt: Buffer; ecdh: ReturnType<typeof createECDH> }): Buffer {
  const uaPublic = unb64u(p256dh);
  const authSecret = unb64u(auth);
  const ecdh = fixed?.ecdh ?? createECDH("prime256v1");
  if (!fixed) ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const ikm = hkdf(authSecret, shared, Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]), 32);
  const salt = fixed?.salt ?? randomBytes(16);
  const cek = hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);
  const c = createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([c.update(Buffer.concat([plain, Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

export type PushMessage = { title: string; body: string; url: string; tag?: string };

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** 같은 사람이 같은 기기를 두 번 켜도 한 줄이다(endpoint 가 유일하다) */
export async function saveSubscription(userId: string, s: { endpoint: string; p256dh: string; auth: string }): Promise<void> {
  if (!/^https:\/\//.test(s.endpoint) || s.endpoint.length > 1000) throw new Error("bad endpoint");
  if (unb64u(s.p256dh).length !== 65 || unb64u(s.auth).length !== 16) throw new Error("bad keys");
  /* 다른 사람이 쓰던 기기(같은 endpoint)면 그 줄을 이 사람에게 옮긴다. 남겨 두면
     공용 PC 에서 앞사람의 할 일 알림이 뒷사람 화면에 뜬다 */
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
           fail_count = 0, created_at = now()`,
    [userId, s.endpoint, s.p256dh, s.auth]);
}

/** 본인 것만 지운다. endpoint 를 몰라도 그 사람 것 전부를 지울 수 있다 */
export async function deleteSubscription(userId: string, endpoint?: string): Promise<number> {
  const r = await query<{ id: string }>(
    endpoint
      ? `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2 RETURNING id::text`
      : `DELETE FROM push_subscriptions WHERE user_id = $1 RETURNING id::text`,
    endpoint ? [userId, endpoint] : [userId]);
  return r.length;
}

export async function subscriptionCount(userId: string): Promise<number> {
  const r = await query<{ n: number }>(`SELECT count(*)::int AS n FROM push_subscriptions WHERE user_id = $1`, [userId])
    .catch(() => [{ n: 0 }]);
  return r[0]?.n ?? 0;
}

/**
 * 그 사람의 기기마다 한 번씩 보낸다. **실패해도 던지지 않는다**: 알림 하나
 * 때문에 밤 당번의 다른 일이 멈추면 안 된다. 404 · 410 은 기기에서 지운
 * 구독이라 줄을 지우고, 그 밖의 실패가 다섯 번 쌓이면 지운다.
 */
export async function sendPush(userId: string, msg: PushMessage, send: typeof fetch = fetch): Promise<{ sent: number; dropped: number }> {
  const keys = pushKeys();
  if (!keys) return { sent: 0, dropped: 0 };
  const subs = await query<Sub>(
    `SELECT id::text, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, [userId]).catch(() => []);
  let sent = 0, dropped = 0;
  const payload = Buffer.from(JSON.stringify({
    title: msg.title.slice(0, 60), body: msg.body.slice(0, 140),
    url: msg.url.startsWith("/") ? msg.url : "/me", tag: msg.tag ?? "careermatri",
  }));
  for (const s of subs) {
    try {
      const res = await send(s.endpoint, {
        method: "POST",
        headers: {
          "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream",
          TTL: String(24 * 3600), Urgency: "normal",
          Authorization: vapidHeader(s.endpoint, keys),
        },
        body: new Uint8Array(encryptPayload(payload, s.p256dh, s.auth)),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 404 || res.status === 410) {
        await query(`DELETE FROM push_subscriptions WHERE id = $1`, [s.id]); dropped += 1; continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await query(`UPDATE push_subscriptions SET last_ok_at = now(), fail_count = 0 WHERE id = $1`, [s.id]);
      sent += 1;
    } catch (e) {
      const r = await query<{ fail_count: number }>(
        `UPDATE push_subscriptions SET fail_count = fail_count + 1 WHERE id = $1 RETURNING fail_count`, [s.id]).catch(() => []);
      if ((r[0]?.fail_count ?? 0) >= 5) { await query(`DELETE FROM push_subscriptions WHERE id = $1`, [s.id]).catch(() => undefined); dropped += 1; }
      opFail({ operation: "push.send", ref: ref("user", userId), step: "send", category: "upstream" }, e);
    }
  }
  return { sent, dropped };
}

/** 시험용: 지문으로 endpoint 를 가린다(로그에 주소를 남기지 않는다) */
export const endpointTag = (endpoint: string): string => createHash("sha256").update(endpoint).digest("hex").slice(0, 10);
