"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createPackAction, type PackState } from "./actions";

const initial: PackState = {};

export type OrgOption = { id: string; label: string };

export default function PackForm({
  orgs,
  prices,
}: {
  orgs: OrgOption[];
  prices: { session_minutes: number; amount: number }[];
}) {
  const [state, formAction, pending] = useActionState(createPackAction, initial);
  const err = state.errors ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const suggested = prices.find((p) => p.session_minutes === 30)?.amount ?? 30000;

  return (
    <form action={formAction} className="form" style={{ maxWidth: 520 }}>
      <div className="field">
        <label htmlFor="orgId">기관</label>
        <select id="orgId" name="orgId" defaultValue="" required>
          <option value="">— 고르세요 —</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="help" style={err.orgId ? { color: "var(--gap)" } : undefined}>
          {err.orgId ?? "이 기관에 소속된 계정의 신청에서 차감됩니다."}
        </span>
      </div>

      <div className="field">
        <label htmlFor="title">이용권 이름</label>
        <input
          id="title"
          name="title"
          placeholder="2026-1학기 기계공학과 멘토링"
          required
          aria-invalid={err.title ? true : undefined}
        />
        {err.title ? <span className="help" style={{ color: "var(--gap)" }}>{err.title}</span> : null}
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="count">장수</label>
          <input
            id="count"
            name="count"
            type="number"
            min={1}
            max={20000}
            defaultValue={50}
            required
            aria-invalid={err.count ? true : undefined}
          />
          <span className="help" style={err.count ? { color: "var(--gap)" } : undefined}>
            {err.count ?? "1장 = 세션 1건"}
          </span>
        </div>
        <div className="field">
          <label htmlFor="unitPrice">한 장이 덮는 한도</label>
          <input
            id="unitPrice"
            name="unitPrice"
            type="number"
            min={1000}
            step={1000}
            defaultValue={suggested}
            required
            aria-invalid={err.unitPrice ? true : undefined}
          />
          <span className="help" style={err.unitPrice ? { color: "var(--gap)" } : undefined}>
            {err.unitPrice ?? "원"}
          </span>
        </div>
      </div>

      <div className="notice">
        <b>한도보다 비싼 세션은 덮이지 않습니다.</b>
        <br />
        지금 정가표는 {prices.map((p) => `${p.session_minutes}분 ${p.amount.toLocaleString("ko-KR")}원`).join(" · ")}
        입니다. 한도를 넘는 길이의 멘토를 고르면 그 학생은 본인 결제로 넘어갑니다.
        모든 길이를 덮으려면 한도를 가장 비싼 값에 맞추세요.
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="startsOn">시작일</label>
          <input id="startsOn" name="startsOn" type="date" defaultValue={today} required />
        </div>
        <div className="field">
          <label htmlFor="endsOn">종료일</label>
          <input
            id="endsOn"
            name="endsOn"
            type="date"
            required
            aria-invalid={err.endsOn ? true : undefined}
          />
          <span className="help" style={err.endsOn ? { color: "var(--gap)" } : undefined}>
            {err.endsOn ?? "이 날이 지나면 남은 장은 쓸 수 없습니다."}
          </span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="memo">메모</label>
        <input id="memo" name="memo" placeholder="계약 번호, 담당자 등" />
      </div>

      {state.message ? <div className="notice error">{state.message}</div> : null}

      <div className="join">
        <button className="act solid" type="submit" disabled={pending}>
          {pending ? "만드는 중…" : "이용권 발급"}
        </button>
        <Link className="act" href="/admin/mentoring-packs">
          취소
        </Link>
      </div>
    </form>
  );
}
