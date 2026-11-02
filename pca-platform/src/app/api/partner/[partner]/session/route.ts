import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { isPartner } from "@/lib/brand";
import { clientIpFrom } from "@/lib/login-throttle";
import {
  cleanProfile, createHandoff, freshNonce, HANDOFF_MIN, logCall, partnerConfig, verifyKey,
} from "@/lib/partner/link";

export const dynamic = "force-dynamic";

/**
 * 제휴 서버 → CareerMatri: 한 번 쓰는 로그인 링크를 받는다(문서: `docs/partner-api.md`).
 *
 *   POST /api/partner/{partner}/session
 *   Authorization: Bearer cmk_{env}_{prefix}_{secret}
 *   X-CM-Timestamp: 유닉스 초(±300초)
 *   X-CM-Nonce: 16~64자, 한 번만
 *   { "member_id": "...", "profile": {...}, "posting_id": "..." }
 *   → 201 { "url": "https://…/from/{partner}/enter?t=…", "expires_at": "…" }
 *
 * **브라우저가 부르는 길이 아니다.** CORS 를 열지 않고, 쿠키를 읽지 않는다. 키는 기록에 남기지 않고
 * 호출 기록(`partner_calls`)에는 키 번호 · 결과 · 까닭 코드 · IP 만 적는다. 본문(이력서 요약)은 적지 않는다.
 * 제휴가 꺼져 있으면(`partner_configs.status = off`) 받지 않는다. 시험 상태에서는 시험 키만 받는다.
 */
const ERR = (status: number, code: string) =>
  NextResponse.json({ error: code }, { status, headers: { "cache-control": "no-store" } });


const PLATFORM = (process.env.PLATFORM_URL ?? "https://app.careermatri.com").replace(/\/+$/, "");

export async function POST(req: Request, { params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  const raw = clientIpFrom(req.headers);
  /* 로그인 시도 제한과 같은 자로 읽는다(앞단이 붙인 주소를 믿는 방식이 같아야 한다) */
  const ip = raw && raw !== "unknown" ? raw : null;
  const endpoint = "session";
  if (!isPartner(partner)) return ERR(404, "unknown_partner");
  const done = async (status: number, reason: string | null, keyId: string | null = null) => {
    await logCall({ partner, keyId, endpoint, status, reason, ip });
  };

  const cfg = await partnerConfig(partner);
  if (!cfg || cfg.status === "off") { await done(403, "partner_off"); return ERR(403, "partner_off"); }

  const auth = req.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? await verifyKey(partner, auth.slice(7)) : null;
  if (!key) { await done(401, "bad_key"); return ERR(401, "bad_key"); }
  if (cfg.status === "test" && key.env !== "test") { await done(403, "live_key_in_test", key.id); return ERR(403, "live_key_in_test"); }

  if (cfg.ip_allowlist.length) {
    const inList = ip ? await queryOne<{ ok: boolean }>(
      `SELECT $1::inet <<= ANY(ip_allowlist) AS ok FROM partner_configs WHERE partner = $2`, [ip, partner]).catch(() => null) : null;
    if (!inList?.ok) { await done(403, "ip", key.id); return ERR(403, "ip_not_allowed"); }
  }

  const ts = Number(req.headers.get("x-cm-timestamp") ?? "");
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) { await done(422, "stale", key.id); return ERR(422, "stale_timestamp"); }
  const nonce = req.headers.get("x-cm-nonce") ?? "";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(nonce)) { await done(400, "bad_nonce", key.id); return ERR(400, "bad_nonce"); }
  if (!(await freshNonce(partner, nonce))) { await done(409, "replay", key.id); return ERR(409, "replay"); }

  if (!(req.headers.get("content-type") ?? "").includes("application/json")) { await done(415, "type", key.id); return ERR(415, "json_only"); }
  let body: { member_id?: unknown; profile?: unknown; posting_id?: unknown };
  try { body = (await req.json()) as typeof body; } catch { await done(400, "json", key.id); return ERR(400, "bad_json"); }
  const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
  if (!/^[A-Za-z0-9._:@-]{1,120}$/.test(memberId)) { await done(400, "member_id", key.id); return ERR(400, "bad_member_id"); }
  const posting = typeof body.posting_id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(body.posting_id) ? body.posting_id : null;

  const h = await createHandoff({
    partner, keyId: key.id, memberId, profile: cleanProfile(body.profile, cfg.share_fields), postingRef: posting,
  });
  await done(201, null, key.id);
  return NextResponse.json(
    { url: `${PLATFORM}/from/${partner}/enter?t=${h.token}`, expires_at: h.expiresAt, expires_in: HANDOFF_MIN * 60 },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}
