"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createContract, type ContractState } from "./actions";

export default function ContractForm({
  orgs,
  preset,
}: {
  orgs: { id: string; code: string; name: string }[];
  preset?: string;
}) {
  const [state, action, pending] = useActionState<ContractState, FormData>(createContract, {});
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);

  return (
    <form className="form" action={action}>
      <div className="field">
        <label htmlFor="orgId">기관</label>
        <select id="orgId" name="orgId" required defaultValue={preset}>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.code})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="title">계약명</label>
        <input id="title" name="title" required maxLength={80} placeholder="2026년 기계공학과 500석" />
      </div>
      <div className="field">
        <label htmlFor="seatCount">좌석 수</label>
        <input id="seatCount" name="seatCount" type="number" min={1} max={20000} required defaultValue={500} />
        <span className="help">좌석 1개 = 응시 1회. 저장과 동시에 만들어집니다.</span>
      </div>
      <div className="field">
        <label htmlFor="startsOn">시작일</label>
        <input id="startsOn" name="startsOn" type="date" required defaultValue={today} />
      </div>
      <div className="field">
        <label htmlFor="endsOn">종료일</label>
        <input id="endsOn" name="endsOn" type="date" required defaultValue={nextYear} />
      </div>

      {state.error && (
        <p className="notice warn" role="alert">
          {state.error}
        </p>
      )}

      <div className="row">
        <Link className="act" href="/admin/organizations">
          취소
        </Link>
        <button type="submit" className="act solid" disabled={pending}>
          {pending ? "만드는 중…" : "계약 등록"}
        </button>
      </div>
    </form>
  );
}
