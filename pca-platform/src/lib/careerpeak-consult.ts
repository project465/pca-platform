import { query, queryOne } from "@/lib/db";
import { isStaging } from "@/lib/env";
import { mailReady, sendStaffAlert } from "@/lib/outbox";
import { DOC_TYPE_KO, type ResearchDoc } from "@/lib/assistant/research-docs";

/**
 * 커리어피크 상담 신청(2026-10-31 대표 결정).
 *
 * `내 자료 읽기` 결과 화면에서 고른 정리 하나를 **기업이 읽는 한 장 요약**으로
 * 묶어, 연락처와 함께 커리어피크 상담 메일함으로 보낸다. 같은 회사의 다른
 * 서비스라 제3자 제공이 아니지만, 처음 받을 때 알린 목적(1-5절)과 다른
 * 쓰임이라 **보낼 때마다 따로 동의를 받고 그 기록을 남긴다**
 * (`careerpeak_consults`).
 *
 * 열리는 조건은 셋이다. 하나라도 빠지면 칸 자체를 보이지 않는다.
 * 1. Railway 변수 `CAREERPEAK_CONSULT_EMAIL` 에 받을 주소가 있다
 * 2. 메일을 보낼 수 있다(`MAIL_HOST` · `MAIL_FROM`)
 * 3. 개인정보처리방침에 이 목적을 더한 판의 적용일이 지났다
 *    (`CONSULT_POLICY_FROM`. 공개 전 배포본은 날짜 전에도 연다)
 *
 * **원본 파일은 보내지 않는다.** 애초에 저장하지 않는다(`schema_research.sql`).
 */

/**
 * 방침 적용일(2026-10-31 대표 결정: 11월 7일, 그날로 7일 공지). `02-privacy.md` 의
 * 1-5 · 2 · 4 · 8 · 11절과 같이 고친다. 그 전에는 운영에서 닫혀 있다.
 */
export const CONSULT_POLICY_FROM: Date | null = new Date("2026-11-07T00:00:00+09:00");

/** 동의 문구의 판. 아래 문구를 고치면 올린다. 기록에 이 값이 남는다 */
export const CONSENT_VERSION = "cp-consult.1";

export const CONSULT_SENDS = ["한 장 요약(제목 · 요약 · 방법 · 핵심 결과 · 직무의 말 · 맞는 직무)", "이름", "메일 주소", "전화번호(적으신 경우)"];
export const CONSULT_KEEPS = ["올린 원본 파일", "지원서 문장 뼈대 · 면접 질문", "검사 점수와 결과"];
export const CONSENT_TEXT =
  "위 한 장 요약과 연락처를 커리어피크 상담 연결을 위해 커리어피크(주식회사 에이치에이연구원)에 보내는 데 동의합니다. " +
  "상담이 끝난 뒤 1년이 지나면 지웁니다. 동의하지 않으셔도 MAT 은 그대로 쓰실 수 있습니다.";

export function consultTo(): string | null {
  const t = (process.env.CAREERPEAK_CONSULT_EMAIL ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null;
}

export function consultOpen(now = new Date()): boolean {
  if (!consultTo() || !mailReady()) return false;
  if (isStaging()) return true;
  return CONSULT_POLICY_FROM !== null && now >= CONSULT_POLICY_FROM;
}

/** 같은 정리로 하루에 한 번만 보낸다(두 번 눌러 상담 메일함이 겹치지 않게) */
export async function sentToday(userId: string, docId: string): Promise<boolean> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM careerpeak_consults
      WHERE user_id = $1 AND doc_id = $2 AND status = 'sent' AND consented_at > now() - interval '1 day'`,
    [userId, docId]).catch(() => null);
  return (r?.n ?? 0) > 0;
}

/** 이 사람이 보낸 신청(화면에 "보냈습니다" 를 적는 데 쓴다) */
export async function consultsOf(userId: string): Promise<{ doc_id: string | null; sent_at: string }[]> {
  return query<{ doc_id: string | null; sent_at: string }>(
    `SELECT doc_id::text, sent_at::text FROM careerpeak_consults
      WHERE user_id = $1 AND status = 'sent' ORDER BY sent_at DESC LIMIT 20`, [userId]).catch(() => []);
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * 한 장 요약. **기업이 읽는 순서로** 적는다: 무엇을 했나 → 어떻게 → 무엇이
 * 나왔나 → 회사 말로 무엇을 할 수 있나 → 맞는 직무. 문장 뼈대와 면접 질문은
 * 본인용이라 넣지 않는다.
 */
export function onePager(d: ResearchDoc): string {
  const x = d.data;
  const lines: string[] = [];
  lines.push(`[${DOC_TYPE_KO[d.doc_type] ?? "자료"}] ${d.title}`);
  const where = [d.venue, d.year ? String(d.year) : null, d.doi ? `DOI ${d.doi}` : null].filter(Boolean).join(" · ");
  if (where) lines.push(where);
  lines.push("");
  if (x.summary) lines.push("요약", clip(x.summary, 800), "");
  if (x.question) lines.push("무엇을 풀려 했나", clip(x.question, 400), "");
  if (x.methods?.length) lines.push("방법 · 도구", x.methods.slice(0, 12).join(" · "), "");
  if (x.findings?.length) lines.push("핵심 결과", ...x.findings.slice(0, 6).map((f) => `- ${clip(f, 300)}`), "");
  if (x.contribution?.length) lines.push("새로 보인 것", ...x.contribution.slice(0, 4).map((c) => `- ${clip(c, 300)}`), "");
  if (x.job_language?.length) {
    lines.push("직무의 말로 옮기면", ...x.job_language.slice(0, 8).map((j) => `- ${j.skill}: ${clip(j.evidence, 240)}`), "");
  }
  if (x.roles?.length) lines.push(`맞는 직무: ${x.roles.slice(0, 8).join(" · ")}`);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type ConsultResult = { ok: true } | { ok: false; reason: "closed" | "consent" | "doc" | "again" | "db" | "mail" };

/**
 * 신청 하나. **동의 기록을 먼저 남기고**(`pending`) 메일을 보낸 뒤 결과를 적는다.
 * 기록을 남기지 못하면(이 표를 아직 올리지 않았으면) 보내지 않는다: 누가 언제
 * 무엇에 동의했는지 모르는 채로 연락처가 나가지 않게 한다.
 */
export async function requestConsult(opts: {
  userId: string; doc: ResearchDoc | null; consent: boolean;
  name: string; email: string; phone: string;
}): Promise<ConsultResult> {
  const to = consultTo();
  if (!to || !consultOpen()) return { ok: false, reason: "closed" };
  if (!opts.consent) return { ok: false, reason: "consent" };
  if (!opts.doc) return { ok: false, reason: "doc" };
  if (await sentToday(opts.userId, opts.doc.id)) return { ok: false, reason: "again" };

  const items = ["summary", "email", ...(opts.name ? ["name"] : []), ...(opts.phone ? ["phone"] : [])];
  const row = await queryOne<{ id: string }>(
    `INSERT INTO careerpeak_consults (user_id, doc_id, items, consent_version)
     VALUES ($1, $2, $3::text[], $4) RETURNING id::text`,
    [opts.userId, opts.doc.id, items, CONSENT_VERSION]).catch(() => null);
  if (!row) return { ok: false, reason: "db" };

  const text = [
    "CareerMatri MAT 에서 커리어피크 상담을 신청하셨습니다.",
    "",
    `이름: ${opts.name || "(적지 않음)"}`,
    `메일: ${opts.email}`,
    `전화: ${opts.phone || "(적지 않음)"}`,
    `신청 번호: CP-${row.id} · 동의 문구 ${CONSENT_VERSION}`,
    "",
    "──────── 한 장 요약 ────────",
    onePager(opts.doc),
    "",
    "────────────────────────",
    "MAT 이 올린 자료를 읽고 정리한 것입니다. 원본 파일은 보내지 않으며 CareerMatri 도 저장하지 않습니다.",
    "이 메일의 개인정보는 상담 연결에만 쓰고, 상담이 끝난 뒤 1년이 지나면 지워 주세요(개인정보처리방침).",
  ].join("\n");
  /* 받는 주소는 Railway 변수 `CAREERPEAK_CONSULT_EMAIL`(코드에 적지 않는다). 지금 알림 메일과
     같은 길(`MAIL_*`)로 보내고, 보낸 사람 이름은 CareerMatri, 제목에 신청자 이름을 적는다 */
  const who = opts.name.replace(/[\r\n]/g, " ").trim() || "이름 없음";
  const ok = await sendStaffAlert({
    to, fromName: "CareerMatri",
    subject: `[커리어피크 상담 신청] ${clip(who, 30)} · ${clip(opts.doc.title, 50)} (CP-${row.id})`,
    text, replyTo: opts.email,
  });
  await query(
    `UPDATE careerpeak_consults SET status = $2, sent_at = CASE WHEN $2 = 'sent' THEN now() ELSE NULL END WHERE id = $1`,
    [row.id, ok ? "sent" : "failed"]).catch(() => undefined);
  return ok ? { ok: true } : { ok: false, reason: "mail" };
}

export function consultFailKo(r: Exclude<ConsultResult, { ok: true }>["reason"]): string {
  return {
    closed: "지금은 상담 신청을 받지 않습니다.",
    consent: "동의 칸을 켜야 보낼 수 있습니다. 켜지 않으면 아무것도 보내지 않습니다.",
    doc: "보낼 정리를 골라 주세요.",
    again: "이 정리로는 오늘 이미 신청하셨습니다. 커리어피크에서 메일로 연락드립니다.",
    db: "신청 기록을 남기지 못해 보내지 않았습니다. 잠시 뒤 다시 눌러 주세요.",
    mail: "메일을 보내지 못했습니다. 잠시 뒤 다시 눌러 주세요.",
  }[r];
}

/** 밤 당번이 부른다. 보관 기간이 지난 신청 기록을 지운다 */
export async function purgeConsults(): Promise<number> {
  const r = await query<{ id: string }>(
    `DELETE FROM careerpeak_consults WHERE purge_after < now() RETURNING id::text`).catch(() => []);
  return r.length;
}
