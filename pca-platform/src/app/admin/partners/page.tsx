import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2 } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_ADMIN } from "@/components/sf/nav";
import LangSelect from "@/components/sf/lang-select";
import { PARTNERS, type Partner } from "@/lib/brand";
import { FIELD_KO, keysOf, partnerConfig } from "@/lib/partner/link";
import { query } from "@/lib/db";
import { AddPreview, Allowlist, IssueKey } from "./forms";
import { grantTestPassAction, removePreviewAction, revokeKeyAction, setStatusAction } from "./actions";
import { MAT_PUBLIC } from "@/lib/mat-public";

export const metadata = { title: `제휴 연결 · ${BRAND.admin}` };
export const dynamic = "force-dynamic";

/**
 * 제휴 연결(잡인더스트리 · 커리어피크). 운영자만.
 * 받기 상태 · 정산 비율 · 넘겨받는 항목 · 키(앞 12자만) · 최근 호출 결과를 본다. 원래 키는 만든 순간 한 번만 보인다.
 */
export default async function AdminPartners({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const L = toLang2(await resolveLang((await searchParams).lang));
  const names = Object.keys(PARTNERS) as Partner[];
  const rows = await Promise.all(names.map(async (p) => ({
    p, cfg: await partnerConfig(p), keys: await keysOf(p),
    calls: await query<{ status: number; reason: string | null; n: number }>(
      `SELECT status, reason, count(*)::int AS n FROM partner_calls WHERE partner = $1 AND at > now() - interval '7 days'
        GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 6`, [p]).catch(() => []),
  })));
  const previews = await query<{ id: string; who: string; note: string | null; added_at: string; pass_until: string | null }>(
    `SELECT p.user_id::text AS id, coalesce(u.login_id, u.email, u.display_name) AS who, p.note, p.added_at::text,
            (SELECT max(e.ends_at)::text FROM entitlements e WHERE e.user_id = p.user_id AND e.kind = 'track'
               AND e.status = 'active' AND e.ends_at > now()) AS pass_until
       FROM mat_preview_users p JOIN users u ON u.id = p.user_id ORDER BY p.added_at DESC LIMIT 50`, []).catch(() => []);
  return (
    <Shell surface="admin" lang={L} nav={NAV_ADMIN} active="/admin/partners"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }} topTitle={BRAND.admin} topRight={<LangSelect current={L} />}>
      <PageHead eyebrow={BRAND.admin} title="제휴 연결"
        sub="제휴 사이트의 MAT 단추로 들어오는 길. 운영 키와 '운영' 상태는 대표 승인 뒤에만 켭니다." />
      <Section title="MAT 미리보기 계정" note={MAT_PUBLIC ? "공개 중 — 쓰이지 않음" : `${previews.length}명 · 공개 전 시험용`}>
        <p className="sf-note">MAT_PUBLIC 이 꺼져 있는 동안 여기 넣은 계정만 MAT 화면을 봅니다. 연동이 ‘시험’ 상태인 제휴 링크로 만든 계정은 저절로 들어옵니다.</p>
        <AddPreview />
        {previews.length ? (
          <div className="sf-tw"><table className="sf-table">
            <thead><tr><th scope="col">계정</th><th scope="col">메모</th><th scope="col">넣은 날</th><th scope="col">이용권</th><th scope="col">할 일</th></tr></thead>
            <tbody>{previews.map((v) => (
              <tr key={v.id}><td>{v.who}</td><td>{v.note ?? ""}</td><td>{v.added_at.slice(0, 10)}</td>
                <td>{v.pass_until ? `${v.pass_until.slice(0, 10)}까지` : "없음"}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <form action={grantTestPassAction}><input type="hidden" name="id" value={v.id} />
                    <button type="submit" className="sf-btn ghost sm">시험 이용권 30일</button></form>
                  <form action={removePreviewAction}><input type="hidden" name="id" value={v.id} />
                    <button type="submit" className="sf-btn quiet sm">빼기</button></form></td></tr>))}</tbody>
          </table></div>
        ) : null}
      </Section>

      {rows.map(({ p, cfg, keys, calls }) => (
        <Section key={p} title={PARTNERS[p].name} note={cfg ? `상태 ${cfg.status}` : "표가 아직 없습니다(DB 승인 전)"}>
          {cfg ? (
            <>
              <p className="sf-note">
                단추 글자 ‘{cfg.button_label}’ · 정산 {cfg.settlement_bps === null ? "미정" : `${cfg.settlement_bps / 100}%`} · 넘겨받는 항목:{" "}
                {cfg.share_fields.length ? cfg.share_fields.map((f) => FIELD_KO[f] ?? f).join(", ") : "없음(회원 번호만)"}
                {cfg.ip_allowlist.length ? ` · 허용 IP ${cfg.ip_allowlist.join(", ")}` : " · 허용 IP 제한 없음"}
              </p>
              <form action={setStatusAction} className="sf-filters">
                <input type="hidden" name="partner" value={p} />
                <label className="sf-field"><span>받기 상태</span>
                  <select name="status" defaultValue={cfg.status}>
                    <option value="off">꺼짐</option><option value="test">시험(시험 키만)</option><option value="live">운영</option>
                  </select>
                </label>
                <button type="submit" className="sf-btn ghost">상태 바꾸기</button>
              </form>
              <Allowlist partner={p} current={cfg.ip_allowlist} />
              <IssueKey partner={p} />
              {keys.length ? (
                <div className="sf-tw"><table className="sf-table">
                  <thead><tr><th scope="col">키 앞부분</th><th scope="col">종류</th><th scope="col">만든 날</th><th scope="col">상태</th><th scope="col">할 일</th></tr></thead>
                  <tbody>{keys.map((k) => (
                    <tr key={k.id}>
                      <td><code>cmk_{k.env}_{k.key_prefix}_…</code></td><td>{k.env === "live" ? "운영" : "시험"}</td>
                      <td>{k.created_at.slice(0, 10)}</td>
                      <td>{!k.revoked_at ? "사용 중" : Date.parse(k.revoked_at) > Date.now() ? `${k.revoked_at.slice(0, 16)}까지 함께 받음` : `폐기 ${k.revoked_at.slice(0, 10)}`}</td>
                      <td>{k.revoked_at && Date.parse(k.revoked_at) <= Date.now() ? null : (
                        <div style={{ display: "flex", gap: 6 }}>
                          {!k.revoked_at ? (
                            <form action={revokeKeyAction}><input type="hidden" name="partner" value={p} /><input type="hidden" name="id" value={k.id} />
                              <input type="hidden" name="grace" value="24" />
                              <button type="submit" className="sf-btn ghost sm">24시간 뒤 폐기(교체)</button></form>) : null}
                          <form action={revokeKeyAction}><input type="hidden" name="partner" value={p} /><input type="hidden" name="id" value={k.id} />
                            <button type="submit" className="sf-btn quiet sm">지금 폐기</button></form>
                        </div>)}</td>
                    </tr>))}</tbody>
                </table></div>
              ) : null}
              <p className="sf-note">최근 7일 호출: {calls.length ? calls.map((c) => `${c.status}${c.reason ? `(${c.reason})` : ""} ${c.n}건`).join(" · ") : "없음"}</p>
            </>
          ) : null}
        </Section>
      ))}
    </Shell>
  );
}
