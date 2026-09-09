"use client";

import { useActionState, useState } from "react";
import { approveAction, type ApproveState } from "./actions";

const initial: ApproveState = {};

export type ParentOption = { id: string; label: string };

export type Defaults = {
  code: string;
  nameKo: string;
  adminName: string;
  adminEmail: string;
  seatCount: string;
  orgLabel: string;
  country: string;
};

/** 오늘과 1년 뒤. 계약 기간의 기본값으로 쓴다 */
function defaultDates() {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date(now);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return { start: iso(now), end: iso(end) };
}

export default function ApproveForm({
  applicationId,
  parents,
  defaults,
}: {
  applicationId: string;
  parents: ParentOption[];
  defaults: Defaults;
}) {
  const bound = approveAction.bind(null, applicationId);
  const [state, formAction, pending] = useActionState(bound, initial);
  const [orgType, setOrgType] = useState("department");
  const [copied, setCopied] = useState(false);
  const err = state.errors ?? {};
  const dates = defaultDates();

  /* 승인이 끝났다. 담당자에게 그대로 보낼 수 있는 안내문을 띄운다.
     임시 비밀번호는 여기서만 볼 수 있으므로 화면을 떠나기 전에 옮겨야 한다 */
  if (state.issued) {
    const g = state.issued;
    const notice = [
      `${defaults.orgLabel} PCA 도입이 준비되었습니다.`,
      ``,
      `[학생 안내용 전용 링크]`,
      g.joinUrl,
      `학생은 이 링크로 들어와 응시자로 등록합니다.`,
      ``,
      `[담당자 로그인]`,
      `아이디: ${g.adminEmail}`,
      `임시 비밀번호: ${g.tempPassword}`,
      `첫 로그인 때 비밀번호를 바꾸셔야 합니다.`,
    ].join("\n");

    return (
      <section className="card" style={{ maxWidth: 720 }}>
        <p className="notice ok" style={{ marginTop: 0 }}>
          <b>승인했습니다</b>
          기관·담당자 계정·전용 링크가 함께 만들어졌습니다.
        </p>

        <h3 style={{ fontSize: 13 }}>전용 링크</h3>
        <code className="mono" style={{ wordBreak: "break-all", display: "block" }}>
          {g.joinUrl}
        </code>

        <h3 style={{ fontSize: 13 }}>담당자 임시 비밀번호</h3>
        <code className="mono" style={{ fontSize: 16 }}>{g.tempPassword}</code>
        <p className="help" style={{ color: "var(--gap)" }}>
          이 비밀번호는 지금 이 화면에서만 볼 수 있습니다. DB 에는 해시만 남으므로
          다시 꺼낼 수 없고, 놓치면 재설정 링크를 새로 발급해야 합니다.
        </p>

        <h3 style={{ fontSize: 13 }}>전달용 안내문</h3>
        <textarea readOnly rows={12} value={notice} style={{ width: "100%" }} />
        <p>
          <button
            type="button"
            className="act solid"
            onClick={() => {
              navigator.clipboard?.writeText(notice).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            {copied ? "복사했습니다" : "안내문 복사"}
          </button>
        </p>
        <p className="help">
          아직 메일 발송이 붙어 있지 않아 사람이 옮겨 보내야 합니다.
          메일이 연결되면 이 안내문이 자동으로 나갑니다.
        </p>
      </section>
    );
  }

  return (
    <form action={formAction} className="form" style={{ maxWidth: 720 }}>
      {state.message ? (
        <p className="notice err full" role="alert">
          {state.message}
        </p>
      ) : null}

      <h2 style={{ fontSize: 14, gridColumn: "1 / -1" }}>승인해서 발급하기</h2>
      <p className="help" style={{ gridColumn: "1 / -1", marginTop: -8 }}>
        누르면 기관, 담당자 계정, 계약과 응시권, 학생용 전용 링크가 한꺼번에
        만들어집니다. 신청서에 적힌 값을 채워 두었으니 확인하고 고치세요.
      </p>

      <div className="field">
        <label htmlFor="orgType">유형</label>
        <select id="orgType" name="orgType" value={orgType} onChange={(e) => setOrgType(e.target.value)}>
          <option value="university">대학</option>
          <option value="department">학과</option>
          <option value="company">기업</option>
        </select>
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
            <span className="help">등록된 대학이 없습니다. 대학을 먼저 등록하세요.</span>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="country">국가</label>
        <input id="country" name="country" defaultValue={defaults.country} maxLength={2} required />
        <span className="help">
          기관에 박히는 국가입니다. 신청이 들어온 사이트가 아니라 실제 소재국을 적으세요.
        </span>
        {err.country ? <span className="help" style={{ color: "var(--gap)" }}>{err.country}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="code">기관 코드</label>
        <input id="code" name="code" defaultValue={defaults.code} required />
        {err.code ? <span className="help" style={{ color: "var(--gap)" }}>{err.code}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="nameKo">기관명 (한국어)</label>
        <input id="nameKo" name="nameKo" defaultValue={defaults.nameKo} required />
        {err.nameKo ? <span className="help" style={{ color: "var(--gap)" }}>{err.nameKo}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="nameEn">기관명 (영어)</label>
        <input id="nameEn" name="nameEn" />
        <span className="help">비워 둬도 됩니다. 나중에 행으로 추가됩니다.</span>
      </div>

      <div className="field">
        <label htmlFor="adminName">담당자 이름</label>
        <input id="adminName" name="adminName" defaultValue={defaults.adminName} required />
        {err.adminName ? <span className="help" style={{ color: "var(--gap)" }}>{err.adminName}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="adminEmail">담당자 이메일 (로그인 아이디)</label>
        <input id="adminEmail" name="adminEmail" type="email" defaultValue={defaults.adminEmail} required />
        {err.adminEmail ? <span className="help" style={{ color: "var(--gap)" }}>{err.adminEmail}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="contractTitle">계약 이름</label>
        <input
          id="contractTitle"
          name="contractTitle"
          defaultValue={`${defaults.orgLabel} PCA 도입`}
          required
        />
        {err.contractTitle ? <span className="help" style={{ color: "var(--gap)" }}>{err.contractTitle}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="seatCount">응시권 수</label>
        <input
          id="seatCount"
          name="seatCount"
          type="number"
          min={1}
          defaultValue={defaults.seatCount || 50}
          required
        />
        <span className="help">전용 링크로 들어올 수 있는 학생 수의 상한이기도 합니다.</span>
        {err.seatCount ? <span className="help" style={{ color: "var(--gap)" }}>{err.seatCount}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="startsOn">시작일</label>
        <input id="startsOn" name="startsOn" type="date" defaultValue={dates.start} required />
        {err.startsOn ? <span className="help" style={{ color: "var(--gap)" }}>{err.startsOn}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="endsOn">종료일</label>
        <input id="endsOn" name="endsOn" type="date" defaultValue={dates.end} required />
        <span className="help">전용 링크도 이 날까지만 열립니다.</span>
        {err.endsOn ? <span className="help" style={{ color: "var(--gap)" }}>{err.endsOn}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="linkLabel">전용 링크 이름</label>
        <input
          id="linkLabel"
          name="linkLabel"
          defaultValue={`${defaults.orgLabel} 응시 링크`}
          required
        />
        {err.linkLabel ? <span className="help" style={{ color: "var(--gap)" }}>{err.linkLabel}</span> : null}
      </div>

      <div className="actions full">
        <button className="act solid" disabled={pending}>
          {pending ? "발급 중…" : "승인하고 발급"}
        </button>
      </div>
    </form>
  );
}
