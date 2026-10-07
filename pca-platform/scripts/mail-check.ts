/**
 * 메일이 **대행사만 꽂으면 나가는 상태인가.**
 *
 * 지금은 자격증명이 없어 한 통도 안 나간다. 그 상태에서 "구조는 다 됐다"
 * 고 말하려면 근거가 있어야 하고, 근거는 **실제로 보내 보는 것**이다.
 *
 * 그래서 가짜 SMTP 서버를 하나 띄우고 거기로 보낸다. 네트워크 건너편만
 * 가짜이고 나머지는 운영과 같은 길이다: 대기열에 쌓고 · 문면을 만들고 ·
 * nodemailer 로 보내고 · `sent` 로 표시한다.
 *
 * **쌓이기만 하는 것과 나가는 것은 다른 상태다.** 대행사를 붙인 날
 * 처음 보내 보면, 그날 못 나가는 까닭을 손님이 먼저 안다.
 *
 * ## 거래 메일 여덟 가지 — 무엇이 언제 나가는가
 *
 * | 종류 | 쌓는 자리 | 보내는 길 | 언어 | 링크 바탕 | 다시 시도 |
 * |---|---|---|---|---|---|
 * | `signup` | 가입 처리 | `flushOutbox` | 쌓을 때 적은 `locale` | `publicBaseForLocale` | 3번 |
 * | `purchase_done` | 결제 확인(웹훅·mock) | `flushOutbox` | 주문의 `locale` | 같음 | 3번 |
 * | `report_ready` | 채점·공개 확인 뒤 | `flushOutbox` | 응시자 `locale` | 같음 | 3번 |
 * | `upgrade_done` | 등급 상향 결제 확인 | `flushOutbox` | 주문의 `locale` | 같음 | 3번 |
 * | `refund_requested` | 환불 요청 접수 | `flushOutbox` | 주문의 `locale` | 같음 | 3번 |
 * | `refund_done` | 환불 처리 | `flushOutbox` | 주문의 `locale` | 같음 | 3번 |
 * | `code_low` | 재고 점검(야간) | `flushOutbox` | **한국어만** (받는 사람이 운영자) | 같음 | 3번 |
 * | `password_reset`·`verify_email` | **쌓지 않는다** | `sendNow` 즉시 | 부르는 쪽이 넘긴다 | 링크를 그 자리에서 만든다 | 없음 — 다시 누르면 된다 |
 *
 * 규칙 넷이 이 표를 받친다.
 *
 *   1. **언어는 쌓을 때 적는다.** 보낼 때는 그 사람이 화면에 없어서
 *      고를 수 없고, 짐작하면 영어로 결제한 사람에게 한국어가 간다
 *   2. **링크 바탕은 요청 호스트가 아니다.** 받는 사람은 다른 날 다른
 *      자리에서 연다. `PLATFORM_URL` 하나에서 읽는다
 *   3. **열쇠가 든 메일은 표에 적지 않는다.** 재설정 링크가
 *      `outbox.payload` 에 남으면 DB 가 새는 순간 남의 계정이 된다
 *   4. **못 보낸 것을 보냈다고 적지 않는다.** 자격증명이 없으면
 *      `held`(그대로 둠)이고 `sent` 가 아니다. 셋을 가른다:
 *      `sent` 나갔다 · `held` 아직 못 보낸다 · `skipped` 보낼 곳이 없다
 *
 *   DATABASE_URL=... npx tsx scripts/mail-check.ts
 *
 * 자격증명을 들고 돌리면 **진짜 서버까지** 본다. 없으면 그 줄은 BLOCKED 로
 * 끝낸다 — 실패처럼 숨기지 않는다.
 *
 *   MAIL_HOST=... MAIL_PORT=587 MAIL_USER=... MAIL_PASS=... \
 *   MAIL_FROM=... MAIL_CHECK_TO=나@example.com npx tsx scripts/mail-check.ts
 */
import { createServer, type Socket } from "node:net";
import { query, queryOne } from "../src/lib/db";
import { enqueue, flushOutbox, sendNow, renderMail } from "../src/lib/outbox";
import { hashPassword } from "../src/lib/password";

const T: { n: string; pass: boolean; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });

/** 받은 편지들 */
const inbox: { to: string; body: string }[] = [];

/**
 * 가짜 SMTP.
 *
 * RFC 5321 의 아주 작은 부분만 말한다: 인사하고 · 받는 사람을 받고 ·
 * 본문을 받고 · 끝났다고 한다. **인증을 요구하지 않는다**: 여기서 재는
 * 것은 우리 쪽 길이 끝까지 이어져 있는가이지 대행사의 인증 방식이 아니다.
 */
function smtpSink(port: number): Promise<() => void> {
  return new Promise((done) => {
    const srv = createServer((sock: Socket) => {
      let data = false;
      let to = "";
      let body = "";
      sock.write("220 cm-mail-sink\r\n");
      sock.on("data", (chunk) => {
        const text = chunk.toString();
        if (data) {
          body += text;
          if (text.includes("\r\n.\r\n")) {
            data = false;
            inbox.push({ to, body });
            sock.write("250 OK\r\n");
          }
          return;
        }
        for (const line of text.split("\r\n")) {
          if (!line) continue;
          const up = line.toUpperCase();
          if (up.startsWith("EHLO") || up.startsWith("HELO")) {
            sock.write("250-cm-mail-sink\r\n250 OK\r\n");
          } else if (up.startsWith("MAIL FROM")) {
            sock.write("250 OK\r\n");
          } else if (up.startsWith("RCPT TO")) {
            to = (line.match(/<([^>]+)>/) ?? [])[1] ?? "";
            sock.write("250 OK\r\n");
          } else if (up.startsWith("DATA")) {
            data = true; body = "";
            sock.write("354 go\r\n");
          } else if (up.startsWith("QUIT")) {
            sock.write("221 bye\r\n"); sock.end();
          } else {
            sock.write("250 OK\r\n");
          }
        }
      });
      sock.on("error", () => { /* 끊겨도 검사는 계속한다 */ });
    });
    srv.listen(port, "127.0.0.1", () => done(() => srv.close()));
  });
}

/**
 * 받은 메일의 몸통을 사람이 읽는 글자로 되돌린다.
 *
 * 머리와 몸통은 빈 줄로 갈리고, 몸통을 어떻게 쌌는지는
 * `Content-Transfer-Encoding` 이 적는다. 한국어는 7bit 로 못 가서 거의
 * 늘 base64 이고, 영어만 있으면 그대로 온다.
 */
function decodeBody(raw: string): string {
  const head = raw.indexOf("\r\n\r\n");
  if (head < 0) return raw;
  const enc = (raw.slice(0, head).match(/^Content-Transfer-Encoding:\s*(\S+)/mi) ?? [])[1];
  const body = raw.slice(head + 4).replace(/\r\n\.\r\n[\s\S]*$/, "");
  if (/^base64$/i.test(enc ?? "")) {
    return Buffer.from(body.replace(/\r?\n/g, ""), "base64").toString("utf8");
  }
  if (/^quoted-printable$/i.test(enc ?? "")) {
    return body.replace(/=\r?\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
  return body;
}

/**
 * 대행사 자격증명을 **main() 이 덮어쓰기 전에** 떠 둔다.
 *
 * 아래에서 가짜 SMTP 로 바꿔 꽂으므로, 그 뒤에 읽으면 늘 가짜가 보인다.
 */
const REAL = {
  host: (process.env.MAIL_HOST ?? "").trim(),
  port: (process.env.MAIL_PORT ?? "").trim(),
  user: (process.env.MAIL_USER ?? "").trim(),
  pass: (process.env.MAIL_PASS ?? "").trim(),
  from: (process.env.MAIL_FROM ?? "").trim(),
  to: (process.env.MAIL_CHECK_TO ?? "").trim(),
  platform: (process.env.PLATFORM_URL ?? "").trim(),
};

/** 아직 못 본 것. 실패와 섞지 않는다 */
const BLOCKED: { n: string; why: string }[] = [];
const blocked = (n: string, why: string) => BLOCKED.push({ n, why });

async function main() {
  const PORT = 2526;
  const stop = await smtpSink(PORT);

  /* 운영과 같은 환경변수로 꽂는다. **코드를 고치지 않는다**: 대행사를
     붙이는 날 바뀌는 것이 이 다섯 줄뿐이라는 것이 이 검사의 요지다 */
  process.env.MAIL_HOST = "127.0.0.1";
  process.env.MAIL_PORT = String(PORT);
  process.env.MAIL_FROM = "no-reply@careermatri.com";
  delete process.env.MAIL_USER;
  delete process.env.MAIL_PASS;

  const pw = await hashPassword("mail-check-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status, locale)
     VALUES ('mail-check@example.com','메일 검사',$1,'active','ko')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id::text`, [pw]);
  const uid = u!.id;
  await query(`DELETE FROM outbox WHERE user_id = $1`, [uid]);

  /* ── 1. 다섯 가지가 쌓이고 나간다 ───────────────────────────────── */
  const kinds = ["signup", "purchase_done", "report_ready",
    "refund_requested", "refund_done"] as const;
  for (const k of kinds) {
    await enqueue({
      kind: k, userId: uid, toAddr: "mail-check@example.com",
      payload: { orderNo: "MAILCHECK1" },
      dedupeKey: `mailcheck:${k}:${Date.now()}`, locale: "ko",
    });
  }
  const queued = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox WHERE user_id = $1 AND status='queued'`,
    [uid]);
  ok("거래 메일 다섯 가지가 대기열에 쌓인다", (queued?.n ?? 0) === kinds.length,
    `${queued?.n}통`);

  const r = await flushOutbox(50);
  ok("대기열이 실제로 나간다", r.sent >= kinds.length,
    `보냄 ${r.sent} · 건너뜀 ${r.skipped} · 보류 ${r.held} · 실패 ${r.failed}`);
  ok("받는 쪽에 그만큼 도착한다", inbox.length >= kinds.length,
    `${inbox.length}통`);

  const left = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox WHERE user_id = $1 AND status='queued'`,
    [uid]);
  ok("보낸 것은 대기열에 남지 않는다", (left?.n ?? 0) === 0, `${left?.n}통 남음`);

  /* ── 2. 문면이 비어 있지 않다 ──────────────────────────────────── */
  const subjects = inbox.map((m) => m.body)
    .map((b) => (b.match(/^Subject: (.*)$/m) ?? [])[1] ?? "")
    .filter(Boolean);
  ok("보낸 메일에 제목이 들어 있다", subjects.length >= kinds.length,
    `${subjects.length}개`);
  /* **본문에 링크가 있는가.** 정규 주소가 비어 있으면 링크 없는 메일이
     나가고, 받은 사람은 어디로 가야 하는지 모른다.

     **몸통을 먼저 푼다.** 한국어 본문은 7bit 로 못 보내서 nodemailer 가
     base64 로 싸고, 그러면 날것에서 `https://` 를 찾는 검사는 링크가
     멀쩡히 들어 있어도 늘 실패한다. 실제로 그랬다: 이 줄이 `0 / 5통` 으로
     오래 빨간 채였고 풀어 보니 `https://careermatri.co.kr/login` 이 그대로
     들어 있었다. **거짓 경보를 내는 검사는 그 다음부터 아무도 안 본다** */
  const withLink = inbox.filter((m) => /https?:\/\//.test(decodeBody(m.body))).length;
  ok("본문에 돌아올 주소가 들어 있다", withLink > 0,
    `${withLink} / ${inbox.length}통. 비었으면 site_configs.canonical_url 을 봅니다`);

  /* ── 3. 열쇠가 든 메일은 대기열을 거치지 않는다 ────────────────── */
  const before = inbox.length;
  const sent = await sendNow({
    kind: "password_reset", userId: uid,
    link: "https://careermatri.com/password/reset/TOKEN", hours: 24,
  });
  ok("비밀번호 재설정이 그 자리에서 나간다", sent && inbox.length === before + 1,
    `${inbox.length - before}통`);
  const stored = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox
      WHERE user_id = $1 AND payload::text LIKE '%TOKEN%'`, [uid]);
  ok("재설정 링크가 표에 적히지 않는다", (stored?.n ?? 0) === 0,
    `${stored?.n}줄`);

  const vsent = await sendNow({
    kind: "verify_email", userId: uid,
    link: "https://careermatri.com/verify/TOKEN2", hours: 72,
  });
  ok("주소 확인 메일이 그 자리에서 나간다", vsent, vsent ? "나감" : "안 나감");

  /* ── 4. 자격증명이 없으면 쌓아만 둔다 ──────────────────────────── */
  delete process.env.MAIL_HOST;
  await query(`DELETE FROM outbox WHERE user_id = $1`, [uid]);
  await enqueue({
    kind: "signup", userId: uid, toAddr: "mail-check@example.com",
    dedupeKey: `mailcheck:hold:${Date.now()}`, locale: "ko",
  });
  /* `transport()` 가 값을 기억해 두므로 다음 줄이 그것을 비운다 */
  const { resetMailTransport } = await import("../src/lib/outbox");
  resetMailTransport();
  const held = await flushOutbox(50);
  ok("자격증명이 없으면 보내지 않고 그대로 둔다", held.sent === 0 && held.held > 0,
    `보냄 ${held.sent} · 보류 ${held.held}`);

  /* ── 5. 두 언어가 다 선다 ──────────────────────────────────────── */
  ok("여섯 가지가 두 언어로 선다",
    (["signup", "purchase_done", "report_ready", "upgrade_done",
      "refund_requested", "refund_done"] as const)
      .every((k) => renderMail(k, "ko")?.subject && renderMail(k, "en")?.subject),
    "src/lib/outbox.ts 의 MAIL");

  /* ── 6. 손님에게 닿는 주소인가 ─────────────────────────────────
     **문면이 서는 것과 그 링크가 닿는 것은 다른 질문이다.** 여기까지는
     가짜 SMTP 가 받아 줬으므로 전부 초록이었다. 링크가 `localhost` 를
     가리키고 있어도 그렇다. */
  const { publicBaseForLocale } = await import("../src/lib/urls");
  const { ephemeralHost, appDomain } = await import("../src/lib/app-domain");
  /* 가짜 SMTP 를 꽂느라 지운 값을 되돌려 놓고 본다 */
  if (REAL.platform) process.env.PLATFORM_URL = REAL.platform;
  const baseKo = (await publicBaseForLocale("ko")) ?? "";
  const baseEn = (await publicBaseForLocale("en")) ?? "";

  ok("메일 링크의 바탕 주소가 있다", Boolean(baseKo && baseEn),
    `ko=${baseKo || "(빈 값)"} · en=${baseEn || "(빈 값)"}`);
  /* **localhost 가 적힌 메일은 되돌릴 수 없다.** 받은 사람이 눌러도 제
     컴퓨터를 열고, 우리는 그것을 알 방법이 없다 */
  ok("링크 바탕이 localhost·사설 주소가 아니다",
    ![baseKo, baseEn].some((b) => /localhost|127\.0\.0\.1|0\.0\.0\.0|\.local(?::|$)|^http:\/\//i.test(b)),
    `ko=${baseKo} · en=${baseEn}`);
  /* **관리형 플랫폼의 임시 주소도 안 된다.** 도메인을 붙이는 날 그
     주소가 바뀌고, 그 전에 나간 메일은 전부 끊긴다 */
  const temp = [baseKo, baseEn].map(ephemeralHost).find(Boolean) ?? null;
  ok("링크 바탕이 임시 주소가 아니다", temp === null, temp ?? `ko=${baseKo}`);
  /* **PLATFORM_URL 하나가 정본이다**(설계 원칙 10). 메일이 다른 자리에서
     주소를 읽으면 어느 날 화면은 초록인데 링크가 빈 도메인으로 간다 */
  const app = appDomain();
  /* **적혀 있는데 못 쓰는 것이 비어 있는 것보다 나쁘다.** 그러면
     `publicBase` 가 조용히 소개 사이트 주소로 되돌아가고, 결제를 끝낸
     사람이 가격표 쪽으로 떨어진다. 비어 있는 것은 아직 안 넣은 것이라
     `launch:check` 가 막지만, 틀린 것은 초록을 지나간다 */
  ok("PLATFORM_URL 이 적혀 있으면 쓸 수 있다",
    REAL.platform === "" || app.ok,
    app.ok ? app.url : `${REAL.platform || "(빈 값)"} — ${app.ok ? "" : app.reason}`);
  ok("링크 바탕이 PLATFORM_URL 과 같다",
    !app.ok || (baseKo === app.url && baseEn === app.url),
    app.ok ? `PLATFORM_URL=${app.url}` : `PLATFORM_URL 이 아직 없다 (${app.reason})`);

  /* ── 7. 발신 주소의 꼴 ─────────────────────────────────────────── */
  const addr = REAL.from.replace(/^.*<|>.*$/g, "").trim();
  ok("MAIL_FROM 이 주소 꼴이다",
    REAL.from === "" || /^[^@\s<>]+@[^@\s<>.]+\.[^@\s<>]+$/.test(addr),
    REAL.from === "" ? "아직 비어 있다 — 아래 BLOCKED 를 본다" : REAL.from);

  /* ── 8. 진짜 서버까지 ──────────────────────────────────────────
     **자격증명이 없으면 BLOCKED 로 끝낸다.** 여기를 초록으로 적으면
     "메일 다 됐다" 로 읽히고, 그 상태로 켜면 가입한 사람이 먼저 안다.
     실패(빨강)로 적어도 안 된다 — 고칠 코드가 없는 빨간 줄은 다음부터
     아무도 안 본다. */
  if (!REAL.host || !REAL.from) {
    blocked("진짜 SMTP 에 붙어 본다",
      "MAIL_HOST · MAIL_FROM 이 없다. 대행사 다섯 줄(MAIL_HOST · MAIL_PORT · " +
      "MAIL_USER · MAIL_PASS · MAIL_FROM)을 받아야 한다");
    blocked("진짜로 한 통 보내 본다",
      "같은 다섯 줄과 받을 주소(MAIL_CHECK_TO)가 없다");
  } else {
    const { createTransport } = await import("nodemailer");
    const port = Number(REAL.port || 587);
    const tx = createTransport({
      host: REAL.host, port, secure: port === 465,
      auth: REAL.user ? { user: REAL.user, pass: REAL.pass } : undefined,
    });
    let why = "";
    const up = await tx.verify().then(() => true).catch((e) => { why = String(e).slice(0, 160); return false; });
    ok("진짜 SMTP 에 붙어 본다", up, up ? `${REAL.host}:${port}` : why);

    if (!REAL.to) {
      blocked("진짜로 한 통 보내 본다",
        "받을 주소가 없다. MAIL_CHECK_TO=나@example.com 을 넣고 다시 돌린다");
    } else if (up) {
      let sendWhy = "";
      const went = await tx.sendMail({
        from: REAL.from, to: REAL.to,
        subject: "[CareerMatri] 발송 점검",
        text: "이 메일이 보이면 거래 메일이 실제로 나갑니다.\n" +
          `보낸 자리: ${app.ok ? app.url : "(PLATFORM_URL 없음)"}\n`,
      }).then(() => true).catch((e) => { sendWhy = String(e).slice(0, 160); return false; });
      ok("진짜로 한 통 보내 본다", went, went ? `${REAL.to} 로 보냈다` : sendWhy);
    } else {
      blocked("진짜로 한 통 보내 본다", "서버에 못 붙어서 보내 보지 못했다");
    }
    tx.close();
  }

  await query(`DELETE FROM outbox WHERE user_id = $1`, [uid]);
  stop();

  const bad = T.filter((x) => !x.pass);
  for (const t of T) {
    console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  }
  /* **못 본 것을 따로 적는다.** 초록도 빨강도 아니다. 섞으면 둘 다
     쓸모가 없어진다 */
  for (const b of BLOCKED) console.log(`  막힘 ${b.n}  (${b.why})`);
  console.log(bad.length
    ? `\n${bad.length}개가 걸렸다.`
    : BLOCKED.length
      ? `\n코드 쪽 ${T.length}가지 OK. ${BLOCKED.length}가지는 자격증명이 없어 ` +
        `아직 못 봤다 — 대행사만 꽂으면 나간다.`
      : `\n메일 검사 OK — ${T.length}가지. 진짜 서버까지 나갔다.`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
