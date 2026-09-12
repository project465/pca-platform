"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createSessionAction, type SessionState } from "./actions";

const initial: SessionState = {};

export type Option = { id: string; label: string; note?: string };

export default function SessionForm({
  contracts,
  instruments,
}: {
  contracts: Option[];
  instruments: Option[];
}) {
  const [state, formAction, pending] = useActionState(createSessionAction, initial);
  const err = state.errors ?? {};

  if (contracts.length === 0 || instruments.length === 0) {
    return (
      <div className="notice">
        {contracts.length === 0
          ? "쓸 수 있는 계약이 없습니다. 운영사에 문의하세요."
          : "공개된 검사 도구가 없습니다. 운영사가 문항을 등록해야 합니다."}
      </div>
    );
  }

  return (
    <form action={formAction} className="form" style={{ maxWidth: 560 }}>
      <div className="field">
        <label htmlFor="contractId">계약</label>
        <select id="contractId" name="contractId" defaultValue={contracts[0].id}>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="help" style={err.contractId ? { color: "var(--gap)" } : undefined}>
          {err.contractId ?? "명단을 올리면 이 계약의 응시권이 한 장씩 배정됩니다."}
        </span>
      </div>

      <div className="field">
        <label htmlFor="instrumentId">검사 도구</label>
        <select id="instrumentId" name="instrumentId" defaultValue={instruments[0].id}>
          {instruments.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="name">회차 이름</label>
        <input
          id="name"
          name="name"
          placeholder="2026-1학기 기계공학과 3학년"
          required
          aria-invalid={err.name ? true : undefined}
        />
        <span className="help" style={err.name ? { color: "var(--gap)" } : undefined}>
          {err.name ?? "학생 화면에도 이 이름이 그대로 보입니다."}
        </span>
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="opensAt">시작</label>
          <input id="opensAt" name="opensAt" type="datetime-local" required />
        </div>
        <div className="field">
          <label htmlFor="closesAt">종료</label>
          <input
            id="closesAt"
            name="closesAt"
            type="datetime-local"
            required
            aria-invalid={err.closesAt ? true : undefined}
          />
          {err.closesAt ? (
            <span className="help" style={{ color: "var(--gap)" }}>{err.closesAt}</span>
          ) : null}
        </div>
      </div>

      <div className="field">
        <label htmlFor="releaseMode">결과 공개</label>
        <select id="releaseMode" name="releaseMode" defaultValue="manual">
          <option value="manual">담당자가 공개 버튼을 누른 뒤 (권장)</option>
          <option value="instant">채점되는 대로 바로</option>
        </select>
        <span className="help">
          먼저 내용을 확인하고 열어주는 쪽이 기본입니다. 한국 시간 기준으로 저장됩니다.
        </span>
      </div>

      {state.message ? <div className="notice error">{state.message}</div> : null}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="act solid" type="submit" disabled={pending}>
          {pending ? "만드는 중…" : "회차 만들기"}
        </button>
        <Link className="act" href="/org">
          취소
        </Link>
      </div>
    </form>
  );
}
