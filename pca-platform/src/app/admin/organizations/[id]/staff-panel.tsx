"use client";

import { useActionState, useState } from "react";
import { ROLE_LABEL } from "@/lib/roles";
import { issueStaff, resetStaff, type StaffState } from "./actions";

type Staff = {
  user_id: string;
  name: string;
  ident: string;
  role: string;
  must_reset: boolean;
  last_login: string | null;
};

/**
 * 담당자 발급.
 *
 * 임시 비밀번호는 발급 직후 한 번만 보여주고 저장하지 않는다. 명단 발급과
 * 같은 규칙이라, 잃어버리면 재발급뿐이다. 담당자가 그걸 모르면 곤란하므로
 * 화면에 그대로 적는다.
 */
export default function StaffPanel({ orgId, staff }: { orgId: string; staff: Staff[] }) {
  const [issue, issueAction, issuing] = useActionState<StaffState, FormData>(issueStaff, {});
  const [reset, resetAction, resetting] = useActionState<StaffState, FormData>(resetStaff, {});
  const [open, setOpen] = useState(staff.length === 0);
  const shown = issue.issued ?? reset.issued;

  return (
    <section className="staffpanel">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="page-h2" style={{ margin: 0 }}>
          담당자와 교수
        </h2>
        <button type="button" className="act small" onClick={() => setOpen(!open)}>
          {open ? "닫기" : "계정 발급"}
        </button>
      </div>

      {staff.length === 0 && !open && (
        <div className="empty">
          <b>담당자 계정이 없습니다</b>
          계정이 없으면 이 학과는 회차를 열 수 없습니다. 계약보다 먼저 만드셔도 됩니다.
        </div>
      )}

      {open && (
        <form className="staffform" action={issueAction}>
          <input type="hidden" name="orgId" value={orgId} />
          <label className="field">
            <span>역할</span>
            <select name="role" defaultValue="org_admin">
              <option value="org_admin">학과 담당자 — 회차·명단·공개 승인</option>
              <option value="instructor">교수 — 현황과 단체 리포트만</option>
            </select>
          </label>
          <label className="field">
            <span>이름</span>
            <input name="name" required maxLength={60} placeholder="김담당" />
          </label>
          <label className="field">
            <span>아이디</span>
            <input name="loginId" maxLength={40} placeholder="me-admin" autoComplete="off" />
          </label>
          <label className="field">
            <span>또는 이메일</span>
            <input name="email" type="email" maxLength={190} placeholder="me-admin@univ.ac.kr" />
            <i className="ev-hint">둘 중 하나만 있으면 됩니다.</i>
          </label>
          <button type="submit" className="act solid" disabled={issuing}>
            {issuing ? "만드는 중…" : "발급"}
          </button>
          {issue.error && (
            <p className="notice warn" role="alert" style={{ flexBasis: "100%" }}>
              {issue.error}
            </p>
          )}
        </form>
      )}

      {shown && (
        <div className="roster-result">
          <p className="page-note">
            <b>임시 비밀번호는 지금 한 번만 보입니다.</b> 저장하지 않으므로 이 화면을 벗어나면
            다시 볼 수 없고 재발급만 됩니다. 첫 로그인 때 본인이 바꾸게 되어 있습니다.
          </p>
          <div className="tablewrap">
            <table className="roster">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>아이디</th>
                  <th>역할</th>
                  <th>임시 비밀번호</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{shown.name}</td>
                  <td className="mono">{shown.loginId}</td>
                  <td>{ROLE_LABEL[shown.role as keyof typeof ROLE_LABEL] ?? shown.role}</td>
                  <td className="mono">
                    <code className="tempkey">{shown.tempPassword}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {staff.length > 0 && (
        <div className="tablewrap" style={{ marginTop: 16 }}>
          <table className="roster">
            <thead>
              <tr>
                <th>이름</th>
                <th>아이디</th>
                <th>역할</th>
                <th>마지막 로그인</th>
                <th>비밀번호</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.user_id + s.role}>
                  <td>{s.name}</td>
                  <td className="mono">{s.ident}</td>
                  <td>{ROLE_LABEL[s.role as keyof typeof ROLE_LABEL] ?? s.role}</td>
                  <td className="mono">
                    {s.last_login ?? (s.must_reset ? "첫 로그인 전" : "—")}
                  </td>
                  <td>
                    <form action={resetAction}>
                      <input type="hidden" name="orgId" value={orgId} />
                      <input type="hidden" name="userId" value={s.user_id} />
                      <button type="submit" className="act tiny" disabled={resetting}>
                        재발급
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {reset.error && (
        <p className="notice warn" role="alert">
          {reset.error}
        </p>
      )}
    </section>
  );
}
