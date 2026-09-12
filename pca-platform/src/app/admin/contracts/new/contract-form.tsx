"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createContractAction, type ContractState } from "./actions";

const initial: ContractState = {};

export type DeptOption = { id: string; label: string };

export default function ContractForm({ depts }: { depts: DeptOption[] }) {
  const [state, formAction, pending] = useActionState(createContractAction, initial);
  const err = state.errors ?? {};
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="form" style={{ maxWidth: 520 }}>
      <div className="field">
        <label htmlFor="orgId">학과</label>
        <select id="orgId" name="orgId" defaultValue="" required>
          <option value="">— 고르세요 —</option>
          {depts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <span className="help" style={err.orgId ? { color: "var(--gap)" } : undefined}>
          {err.orgId ?? "계약과 응시권은 학과 단위로 붙습니다."}
        </span>
        {depts.length === 0 ? (
          <span className="help">등록된 학과가 없습니다. 기관을 먼저 등록하세요.</span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="title">계약명</label>
        <input
          id="title"
          name="title"
          placeholder="2026-1학기 기계공학과 진로검사"
          required
          aria-invalid={err.title ? true : undefined}
        />
        {err.title ? <span className="help" style={{ color: "var(--gap)" }}>{err.title}</span> : null}
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="startsOn">시작일</label>
          <input id="startsOn" name="startsOn" type="date" defaultValue={today} required />
        </div>
        <div className="field">
          <label htmlFor="endsOn">종료일</label>
          <input id="endsOn" name="endsOn" type="date" required aria-invalid={err.endsOn ? true : undefined} />
          {err.endsOn ? <span className="help" style={{ color: "var(--gap)" }}>{err.endsOn}</span> : null}
        </div>
      </div>

      <div className="field">
        <label htmlFor="seatCount">응시권 수</label>
        <input
          id="seatCount"
          name="seatCount"
          type="number"
          min={1}
          max={20000}
          defaultValue={50}
          required
          aria-invalid={err.seatCount ? true : undefined}
        />
        <span className="help" style={err.seatCount ? { color: "var(--gap)" } : undefined}>
          {err.seatCount ??
            "등록과 동시에 이 수만큼 응시권이 만들어집니다. 명단을 올릴 때 한 장씩 배정됩니다."}
        </span>
      </div>

      <div className="field">
        <label htmlFor="memo">메모 (선택)</label>
        <input id="memo" name="memo" maxLength={500} placeholder="계약서 번호, 담당자 등" />
      </div>

      {state.message ? <div className="notice error">{state.message}</div> : null}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="act solid" type="submit" disabled={pending}>
          {pending ? "등록 중…" : "등록"}
        </button>
        <Link className="act" href="/admin/contracts">
          취소
        </Link>
      </div>
    </form>
  );
}
