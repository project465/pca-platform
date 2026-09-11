"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ContractRef } from "@/lib/org";
import { makeSession, type SessionState } from "../../actions";

export default function SessionForm({ contracts }: { contracts: ContractRef[] }) {
  const [state, action, pending] = useActionState<SessionState, FormData>(makeSession, {});
  const today = new Date().toISOString().slice(0, 10);
  const plus30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

  return (
    <form className="form" action={action}>
      <div className="field">
        <label htmlFor="name">회차 이름</label>
        <input id="name" name="name" required maxLength={80} placeholder="2026-1학기 기계공학과 3학년" />
      </div>

      <div className="field">
        <label htmlFor="contractId">좌석을 댈 계약</label>
        <select id="contractId" name="contractId" required>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} — 남은 좌석 {c.seatsFree} / {c.seatCount}
            </option>
          ))}
        </select>
        <span className="help">좌석이 모자라면 명단을 올릴 때 그 줄부터 멈춥니다.</span>
      </div>

      <div className="field">
        <label htmlFor="opensAt">응시 시작</label>
        <input id="opensAt" name="opensAt" type="date" required defaultValue={today} />
      </div>

      <div className="field">
        <label htmlFor="closesAt">응시 마감</label>
        <input id="closesAt" name="closesAt" type="date" required defaultValue={plus30} />
      </div>

      <label className="check">
        <input type="checkbox" name="instant" />
        <span>
          채점되는 대로 학생에게 바로 공개
          <i>끄면 담당자가 공개를 누를 때까지 학생에게 결과지가 보이지 않습니다.</i>
        </span>
      </label>

      {state.error && (
        <p className="notice warn" role="alert">
          {state.error}
        </p>
      )}

      <div className="row">
        <Link className="act" href="/org">
          취소
        </Link>
        <button type="submit" className="act solid" disabled={pending}>
          {pending ? "만드는 중…" : "회차 열기"}
        </button>
      </div>
    </form>
  );
}
