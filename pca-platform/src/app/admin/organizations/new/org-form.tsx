"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createOrgAction, type OrgState } from "./actions";

const initial: OrgState = {};

export type ParentOption = { id: string; label: string };

export default function OrgForm({ parents }: { parents: ParentOption[] }) {
  const [state, formAction, pending] = useActionState(createOrgAction, initial);
  const [orgType, setOrgType] = useState("department");
  const err = state.errors ?? {};

  return (
    <form action={formAction} className="form" style={{ maxWidth: 520 }}>
      <div className="field">
        <label htmlFor="orgType">유형</label>
        <select
          id="orgType"
          name="orgType"
          value={orgType}
          onChange={(e) => setOrgType(e.target.value)}
        >
          <option value="university">대학</option>
          <option value="department">학과</option>
          <option value="company">기업</option>
        </select>
        <span className="help">
          계약과 응시권은 학과 단위로 붙습니다. 대학은 학과를 묶는 상위 단위입니다.
        </span>
      </div>

      {orgType === "department" ? (
        <div className="field">
          <label htmlFor="parentId">소속 대학</label>
          <select id="parentId" name="parentId" defaultValue="">
            <option value="">— 고르세요 —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {err.parentId ? <span className="help" style={{ color: "var(--gap)" }}>{err.parentId}</span> : null}
          {parents.length === 0 ? (
            <span className="help">
              등록된 대학이 없습니다. 대학을 먼저 등록하세요.
            </span>
          ) : null}
        </div>
      ) : (
        <input type="hidden" name="parentId" value="" />
      )}

      <div className="field">
        <label htmlFor="code">기관 코드</label>
        <input
          id="code"
          name="code"
          type="text"
          placeholder="HYU-ME"
          autoCapitalize="characters"
          spellCheck={false}
          required
          aria-invalid={err.code ? true : undefined}
        />
        <span className="help" style={err.code ? { color: "var(--gap)" } : undefined}>
          {err.code ?? "내부 식별용. 영문·숫자·하이픈. 나중에 바꾸지 않습니다."}
        </span>
      </div>

      <div className="field">
        <label htmlFor="country">국가</label>
        <select id="country" name="country" defaultValue="KR">
          <option value="KR">대한민국 (KR)</option>
          <option value="TR">튀르키예 (TR)</option>
          <option value="US">미국 (US)</option>
          <option value="JP">일본 (JP)</option>
          <option value="KZ">카자흐스탄 (KZ)</option>
        </select>
        {err.country ? <span className="help" style={{ color: "var(--gap)" }}>{err.country}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="nameKo">기관명 (한국어)</label>
        <input
          id="nameKo"
          name="nameKo"
          type="text"
          placeholder="한양대학교 기계공학과"
          required
          aria-invalid={err.nameKo ? true : undefined}
        />
        {err.nameKo ? <span className="help" style={{ color: "var(--gap)" }}>{err.nameKo}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="nameEn">기관명 (영어)</label>
        <input
          id="nameEn"
          name="nameEn"
          type="text"
          placeholder="Dept. of Mechanical Engineering, Hanyang Univ."
        />
        <span className="help">
          비워둬도 됩니다. 이름은 컬럼이 아니라 translations 의 행으로 저장됩니다.
        </span>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="act solid" type="submit" disabled={pending}>
          {pending ? "등록 중…" : "등록"}
        </button>
        <Link className="act" href="/admin/organizations">
          취소
        </Link>
      </div>
    </form>
  );
}
