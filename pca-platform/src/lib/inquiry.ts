import { query, queryOne } from "@/lib/db";
import { sendStaffAlert } from "@/lib/outbox";
import { supportConfig } from "@/lib/support";

/**
 * 도입 문의와 출시 알림 신청을 받는 한 곳(2026-10-30 작업지시서).
 *
 * 홈페이지(`careermatri.com/contact`)와 앱(가격표 · MAT)의 폼이 전부
 * `POST /api/public/inquiry` 로 오고, 그 길이 여기 하나를 부른다. 화면마다
 * 따로 받으면 동의를 안 받는 화면이 하나쯤 생긴다.
 *
 * **스팸을 사람 손에 맡기지 않는다.** 숨겨 둔 칸(`website`)에 무엇이든
 * 들어 있으면 사람이 아니고, 폼을 연 뒤 1.5초 안에 보낸 것도 사람이 아니다.
 * 막힌 요청에도 **접수된 것과 같은 답**을 준다: 다르게 답하면 봇이 그 차이로
 * 배운다.
 */

export const TOPICS = ["univ", "dept", "grad", "rise", "personal", "mat", "partner"] as const;
export type Topic = (typeof TOPICS)[number];

/** 화면에 적는 이름. 홈페이지 네 언어 원고도 이 열쇠로 이름을 고른다 */
export const TOPIC_KO: Record<Topic, string> = {
  univ: "대학·기관 도입",
  dept: "학과 단위 도입",
  grad: "대학원·BK21 사업단",
  rise: "RISE·앵커 사업",
  personal: "개인 이용",
  mat: "MAT",
  partner: "제휴·기타",
};

export type InquiryInput = {
  kind: "contact" | "launch_notify";
  topic?: string | null;
  orgName?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email: string;
  headcount?: string | null;
  timing?: string | null;
  message?: string | null;
  productCode?: string | null;
  lang?: string | null;
  source?: string | null;
  sourceBrand?: string | null;
  consent: boolean;
  /** 숨긴 칸 */
  honeypot?: string | null;
  /** 폼을 그린 시각(밀리초) */
  renderedAt?: number | null;
};

export type InquiryResult =
  | { ok: true; id: string | null; duplicate?: boolean; bot?: boolean }
  | { ok: false; why: "email" | "consent" | "required" | "too_long" };

const cut = (v: string | null | undefined, n: number) => {
  const t = (v ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, n) : null;
};
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** 사람이 아닌 요청인가. **판정만 하고 이유를 밖에 알리지 않는다** */
export function looksLikeBot(i: InquiryInput, now = Date.now()): boolean {
  if ((i.honeypot ?? "").trim()) return true;
  /* 1.5초. 3초로 두었더니 메일 칸이 이미 채워진 자리(`/me/track`)에서 동의만
     누르고 바로 신청한 사람이 봇으로 걸려 **접수된 것처럼 보이고 저장되지
     않았다.** 봇은 쪽을 받자마자 보낸다 */
  if (i.renderedAt && now - i.renderedAt < 1500) return true;
  return false;
}

export async function submitInquiry(i: InquiryInput): Promise<InquiryResult> {
  const email = cut(i.email, 200)?.toLowerCase() ?? "";
  if (!EMAIL.test(email)) return { ok: false, why: "email" };
  if (!i.consent) return { ok: false, why: "consent" };
  const topic = (TOPICS as readonly string[]).includes(i.topic ?? "") ? (i.topic as Topic) : null;
  if (i.kind === "contact") {
    if (!topic || !cut(i.contactName, 80)) return { ok: false, why: "required" };
    if ((i.message ?? "").length > 4000) return { ok: false, why: "too_long" };
  }
  if (looksLikeBot(i)) return { ok: true, id: null, bot: true };

  const brand = ["careermatri", "jobindustry", "careerpeak"].includes(i.sourceBrand ?? "")
    ? i.sourceBrand : "careermatri";
  const row = await queryOne<{ id: string }>(
    `INSERT INTO inquiries
       (kind, topic, org_name, contact_name, phone, email, headcount, timing,
        message, product_code, lang, source, source_brand, consent_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
     ON CONFLICT (lower(email), COALESCE(product_code, '')) WHERE kind = 'launch_notify'
     DO NOTHING
     RETURNING id::text`,
    [i.kind, topic, cut(i.orgName, 120), cut(i.contactName, 80), cut(i.phone, 40), email,
     cut(i.headcount, 40), cut(i.timing, 60), (i.message ?? "").trim().slice(0, 4000) || null,
     cut(i.productCode, 40), cut(i.lang, 8), cut(i.source, 80), brand],
  );
  /* 같은 알림을 다시 신청했다. 이미 명단에 있으므로 접수된 것과 같다 */
  if (!row) return { ok: true, id: null, duplicate: true };

  /* 담당자 알림. 못 보내도 접수는 끝났다: 표에 남았고 운영 화면이 센다 */
  const to = process.env.INQUIRY_ALERT_TO || (await supportConfig()).email || "hari_info@hari.re.kr";
  const label = i.kind === "contact"
    ? `[CareerMatri 도입 문의] ${topic ? TOPIC_KO[topic] : ""} · ${cut(i.orgName, 60) ?? "기관 미기재"}`
    : `[CareerMatri 출시 알림 신청] ${cut(i.productCode, 40) ?? ""}`;
  const lines = [
    `접수 번호: ${row.id}`,
    `종류: ${i.kind === "contact" ? "도입 문의" : "출시 알림 신청"}`,
    topic ? `문의 유형: ${TOPIC_KO[topic]}` : null,
    i.orgName ? `기관·학교: ${cut(i.orgName, 120)}` : null,
    i.contactName ? `담당자: ${cut(i.contactName, 80)}` : null,
    i.phone ? `회신 연락처: ${cut(i.phone, 40)}` : null,
    `이메일: ${email}`,
    i.headcount ? `예상 인원: ${cut(i.headcount, 40)}` : null,
    i.timing ? `희망 시기: ${cut(i.timing, 60)}` : null,
    i.productCode ? `상품: ${cut(i.productCode, 40)}` : null,
    `들어온 곳: ${cut(i.source, 80) ?? "-"} · 언어 ${cut(i.lang, 8) ?? "-"} · ${brand}`,
    i.message ? `\n${(i.message ?? "").trim().slice(0, 4000)}` : null,
  ].filter(Boolean).join("\n");
  const sent = await sendStaffAlert({ to, subject: label, text: lines, replyTo: email });
  if (sent) await query(`UPDATE inquiries SET alerted_at = now() WHERE id = $1`, [row.id]).catch(() => undefined);
  return { ok: true, id: row.id };
}

/** 운영 화면이 읽는 최근 줄. 개인정보가 있어 운영자만 본다(부르는 쪽이 막는다) */
export async function recentInquiries(limit = 200) {
  return query<{
    id: string; kind: string; topic: string | null; org_name: string | null;
    contact_name: string | null; phone: string | null; email: string;
    headcount: string | null; timing: string | null; message: string | null;
    product_code: string | null; lang: string | null; source: string | null;
    source_brand: string; created_at: string; alerted_at: string | null; status: string;
  }>(
    `SELECT id::text, kind, topic, org_name, contact_name, phone, email, headcount, timing,
            message, product_code, lang, source, source_brand, created_at::text,
            alerted_at::text, status
       FROM inquiries ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
}

/** 기한이 지난 줄을 지운다(밤 당번이 부른다) */
export async function purgeInquiries(): Promise<number> {
  const r = await query<{ n: number }>(
    `WITH d AS (DELETE FROM inquiries WHERE purge_after < CURRENT_DATE RETURNING 1)
     SELECT count(*)::int AS n FROM d`,
  ).catch(() => [{ n: 0 }]);
  return r[0]?.n ?? 0;
}
