"use client";

import { useActionState, useState } from "react";
import { createLinkAction, revokeLinkAction, type LinkState } from "./actions";
import type { OrgLink, SeatSummary } from "@/lib/org-links";
import { MASK_HELP, maskExample, parseDomains } from "@/lib/join-rules";

const initial: LinkState = {};

/** 링크 한 줄. 담당자가 실제로 하는 일은 복사와 회수 둘뿐이다 */
function LinkRow({
  link,
  baseUrl,
  canManage,
}: {
  link: OrgLink;
  baseUrl: string;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(revokeLinkAction, initial);
  const [copied, setCopied] = useState(false);
  const url = `${baseUrl}/join/${link.token}`;
  const dead = link.revoked_at !== null;
  const used = Number(link.used_count);
  const max = link.max_uses === null ? null : Number(link.max_uses);
  const full = max !== null && used >= max;

  return (
    <div className="card" style={{ marginBottom: 12, opacity: dead ? 0.55 : 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <b>{link.label}</b>
        {dead ? <span className="tag rejected">회수됨</span> : null}
        {!dead && full ? <span className="tag rejected">정원 참</span> : null}
        <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12 }}>
          {used.toLocaleString("ko-KR")}
          {max !== null ? ` / ${max.toLocaleString("ko-KR")}` : ""}명 등록
        </span>
      </div>

      <code
        className="mono"
        style={{ display: "block", wordBreak: "break-all", margin: "8px 0" }}
      >
        {url}
      </code>

      <p className="help" style={{ marginTop: 0 }}>
        만든 날 {link.created_at}
        {link.expires_at ? ` · ${link.expires_at} 까지` : " · 기한 없음"}
        {dead ? ` · ${link.revoked_at} 에 회수` : ""}
      </p>

      {dead ? null : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="act"
            onClick={() => {
              navigator.clipboard?.writeText(url).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            {copied ? "복사했습니다" : "링크 복사"}
          </button>

          {canManage ? (
            <form action={formAction} style={{ display: "inline" }}>
              <input type="hidden" name="linkId" value={link.id} />
              <button className="act" disabled={pending}>
                {pending ? "회수 중…" : "회수"}
              </button>
            </form>
          ) : null}

          {state.message ? (
            <span className="help" style={{ color: "var(--gap)" }}>{state.message}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function LinksPanel({
  orgId,
  orgName,
  links,
  seats,
  baseUrl,
  canManage,
}: {
  orgId: string;
  orgName: string;
  links: OrgLink[];
  seats: SeatSummary;
  baseUrl: string;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(createLinkAction, initial);
  const [open, setOpen] = useState(false);
  const err = state.errors ?? {};
  const live = links.filter((l) => l.revoked_at === null);

  return (
    <section style={{ marginBottom: 32 }}>
      <div className="page-head">
        <h2 style={{ fontSize: 16 }}>{orgName}</h2>
        {/* 선불이면 산 응시권, 건당이면 나간 건수를 센다. 담당자에게는
            "얼마나 남았는가" 가 같은 자리에 보여야 한다 */}
        <span className="count">
          {seats.billing === "per_use" ? (
            seats.unlimited ? (
              <>나간 건수 {seats.taken.toLocaleString("ko-KR")} · 건수 제한 없음</>
            ) : (
              <>
                나간 건수 {seats.taken.toLocaleString("ko-KR")} /{" "}
                {seats.total.toLocaleString("ko-KR")}
                {" · "}
                남은 건수 {seats.free.toLocaleString("ko-KR")}
              </>
            )
          ) : (
            <>
              응시권 {seats.taken.toLocaleString("ko-KR")} /{" "}
              {seats.total.toLocaleString("ko-KR")}
              {" · "}
              남은 자리 {seats.free.toLocaleString("ko-KR")}
            </>
          )}
        </span>
        {canManage ? (
          <div className="right">
            <button type="button" className="act solid" onClick={() => setOpen((v) => !v)}>
              {open ? "닫기" : "새 링크 만들기"}
            </button>
          </div>
        ) : null}
      </div>

      {state.ok ? (
        <p className="notice ok" role="status">
          {state.ok}
        </p>
      ) : null}
      {state.message && !open ? (
        <p className="notice err" role="alert">
          {state.message}
        </p>
      ) : null}

      {open ? (
        <form action={formAction} className="form" style={{ maxWidth: 520, marginBottom: 16 }}>
          <input type="hidden" name="orgId" value={orgId} />

          {state.message ? (
            <p className="notice err full" role="alert">
              {state.message}
            </p>
          ) : null}

          <div className="field full">
            <label htmlFor="label">링크 이름</label>
            <input id="label" name="label" placeholder="2026-1학기 3학년" required />
            <span className="help">
              학생에게는 보이지 않습니다. 여러 개를 뿌릴 때 구분하려는 이름입니다.
            </span>
            {err.label ? <span className="help" style={{ color: "var(--gap)" }}>{err.label}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="maxUses">등록 가능 인원</label>
            <input
              id="maxUses"
              name="maxUses"
              type="number"
              min={1}
              max={seats.unlimited ? undefined : seats.free}
              placeholder={seats.unlimited ? "비우면 제한 없음" : String(seats.free)}
              />
            <span className="help">
              {seats.unlimited
                ? "이 계약에는 건수 상한이 없습니다. 비우면 링크에도 제한을 걸지 않습니다."
                : `비우면 남은 자리 전부(${seats.free.toLocaleString("ko-KR")}명)입니다.`}
            </span>
            {err.maxUses ? <span className="help" style={{ color: "var(--gap)" }}>{err.maxUses}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="days">기간</label>
            <input id="days" name="days" type="number" min={1} defaultValue={90} required />
            <span className="help">며칠 동안 열어 둘지.</span>
            {err.days ? <span className="help" style={{ color: "var(--gap)" }}>{err.days}</span> : null}
          </div>

          <div className="field full">
            <label htmlFor="loginIdMask">학번 형태 (선택)</label>
            <input id="loginIdMask" name="loginIdMask" placeholder="9999999999" />
            <span className="help">{MASK_HELP} 비우면 아무 학번이나 됩니다.</span>
            {err.loginIdMask ? <span className="help" style={{ color: "var(--gap)" }}>{err.loginIdMask}</span> : null}
          </div>

          <div className="field full">
            <label htmlFor="emailDomains">허용 이메일 도메인 (선택)</label>
            <input id="emailDomains" name="emailDomains" placeholder="hanyang.ac.kr, ac.kr" />
            <span className="help">
              쉼표로 나눠 적습니다. 적으면 등록 화면이 이메일을 함께 묻습니다.
              <code>ac.kr</code> 처럼 적으면 그 아래 도메인까지 됩니다.
            </span>
            {err.emailDomains ? <span className="help" style={{ color: "var(--gap)" }}>{err.emailDomains}</span> : null}
          </div>

          <div className="actions full">
            <button className="act solid" disabled={pending || (!seats.unlimited && seats.free === 0)}>
              {pending ? "만드는 중…" : "만들기"}
            </button>
          </div>
        </form>
      ) : null}

      {links.length === 0 ? (
        <div className="empty">
          <b>아직 전용 링크가 없습니다</b>
          도입이 승인되면 첫 링크가 함께 발급됩니다. 여기 보이지 않으면
          운영사에 문의해 주세요.
        </div>
      ) : (
        <>
          {live.length === 0 ? (
            <p className="notice err">
              <b>열려 있는 링크가 없습니다</b>
              전부 회수되었습니다. 학생이 등록하려면 새 링크가 필요합니다.
            </p>
          ) : null}
          {links.map((l) => (
            <LinkRow key={l.id} link={l} baseUrl={baseUrl} canManage={canManage} />
          ))}
        </>
      )}
    </section>
  );
}
