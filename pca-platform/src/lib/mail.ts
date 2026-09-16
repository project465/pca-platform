import { createTransport, type Transporter } from "nodemailer";
import { appendFile, mkdir } from "node:fs/promises";

/**
 * 메일 발송.
 *
 * 공급자를 코드에 박지 않고 SMTP 로만 말한다. SES·SendGrid·Postmark·
 * 학교 메일 서버가 전부 SMTP 를 쓰므로, 어디로 보낼지는 환경변수로 정한다.
 * 도메인과 공급자가 아직 정해지지 않은 상태에서 한쪽에 묶이지 않으려는 것이다.
 *
 *   MAIL_TRANSPORT=smtp   실제 발송
 *   MAIL_TRANSPORT=log    파일과 콘솔에만 남긴다 (기본값. 개발·미설정 배포)
 *
 * 보내기가 실패해도 예외를 던지지 않는다. 승인·접수 같은 본 작업이 메일
 * 때문에 되돌아가면 안 되기 때문이다. 실패는 결과로 돌려주고, 부른 쪽이
 * 화면에 알린다.
 */

export type MailResult = { ok: true; via: "smtp" | "log" } | { ok: false; error: string };

export type Mail = {
  to: string;
  subject: string;
  text: string;
};

let cached: Transporter | null = null;

function smtpTransport(): Transporter {
  if (cached) return cached;

  const host = process.env.SMTP_HOST;
  if (!host) throw new Error("SMTP_HOST 가 없습니다.");
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  cached = createTransport({
    host,
    port,
    // 465 는 처음부터 TLS, 그 밖에는 STARTTLS 로 올라간다
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  return cached;
}

/** 보낸 사람. 없으면 발송을 시도하지 않는다 — 받는 쪽에서 스팸으로 떨어진다 */
function from(): string {
  return process.env.MAIL_FROM ?? "PCA <no-reply@localhost>";
}

export async function sendMail(mail: Mail): Promise<MailResult> {
  const mode = process.env.MAIL_TRANSPORT ?? "log";

  if (mode !== "smtp") {
    /* 아직 메일이 연결되지 않은 배포. 무엇이 나갔어야 하는지 남겨 두면
       운영자가 손으로 옮겨 보낼 수 있다 */
    const line = JSON.stringify({ at: new Date().toISOString(), ...mail });
    try {
      await mkdir(".mail", { recursive: true });
      await appendFile(".mail/outbox.jsonl", line + "\n", "utf8");
    } catch (e) {
      console.error("[mail] 파일 기록 실패", e);
    }
    console.info("[mail:log]", mail.to, "·", mail.subject);
    return { ok: true, via: "log" };
  }

  try {
    await smtpTransport().sendMail({
      from: from(),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
    console.info("[mail:smtp] 보냄", mail.to, "·", mail.subject);
    return { ok: true, via: "smtp" };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[mail:smtp] 실패", mail.to, error);
    return { ok: false, error };
  }
}
