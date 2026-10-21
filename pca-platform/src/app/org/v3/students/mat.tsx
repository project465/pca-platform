"use client";

import { useActionState } from "react";
import { matAction, type ManageState } from "./actions";

const EMPTY: ManageState = {};

export type MatPoolView = {
  id: string;
  name: string;
  seats: number;
  used: number;
  left: number;
  grant_until: string;
  open: boolean;
  closed: boolean;
};

/**
 * 학교가 산 MAT 인원과, 지금 조건의 학생에게 한꺼번에 여는 자리.
 *
 * **산 인원을 넘겨 열지 않는다.** 넘는 만큼은 서버가 건너뛰고 몇 명을
 * 못 열었는지 적는다(`grantMat`). 화면에서 단추를 끄는 것은 안내이고
 * 막는 자리는 서버다.
 *
 * **결제를 받지 않는다.** 학교 단체 이용권은 계약으로 받는다. 여기서
 * 금액을 적지 않는 까닭은 학생 화면에 학교가 낸 값이 새어 나가지 않게
 * 하려는 것이기도 하다.
 */
export default function MatPanel({
  pools, filter, total,
}: {
  pools: MatPoolView[];
  /** 지금 명단의 조건. 그대로 보내 서버가 같은 조건으로 다시 읽는다 */
  filter: { q: string; department: string; college: string; state: string };
  /** 지금 조건에 맞는 학생 수 */
  total: number;
}) {
  const [state, run, pending] = useActionState(matAction, EMPTY);
  const open = pools.filter((p) => p.open);

  return (
    <div>
      {state.err ? <p className="sf-note is-bad" role="alert">{state.err}</p> : null}
      {state.ok ? <p className="sf-note is-ok" role="status">{state.ok}</p> : null}

      {pools.length ? (
        <div className="sf-tw">
          <table className="sf-table">
            <thead>
              <tr>
                <th scope="col">이용권</th>
                <th scope="col">연 학생</th>
                <th scope="col">남은 인원</th>
                <th scope="col">열 수 있는 날</th>
                <th scope="col">상태</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="sf-strong">{p.name}</th>
                  <td>{p.used.toLocaleString()} / {p.seats.toLocaleString()}명</td>
                  <td><b>{p.left.toLocaleString()}명</b></td>
                  <td>{p.grant_until}까지</td>
                  <td>
                    <span className={`sf-pill${p.open ? "" : " is-off"}`}>
                      {p.closed ? "닫힘" : p.open ? "열 수 있음" : p.left ? "기간 지남" : "인원 다 씀"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="sf-note">
          학교가 산 MAT 인원이 아직 없습니다. 계약을 맺으면 운영팀이 6개월 또는 1년
          인원을 넣어 드리고, 그때부터 이 화면에서 학생에게 열 수 있습니다.
        </p>
      )}

      {open.length ? (
        <form className="sf-filters" action={run} style={{ marginTop: 16 }}>
          <input type="hidden" name="scope" value="filter" />
          <input type="hidden" name="q" value={filter.q} />
          <input type="hidden" name="department" value={filter.department} />
          <input type="hidden" name="college" value={filter.college} />
          <input type="hidden" name="state" value={filter.state} />
          <label className="sf-field">
            <span>열어 줄 이용권</span>
            <select name="pool_id" defaultValue={open[0].id}>
              {open.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · 남은 {p.left}명</option>
              ))}
            </select>
          </label>
          <button type="submit" className="sf-btn accent" disabled={pending || !total}
            onClick={(e) => {
              if (!confirm(
                `지금 조건에 맞는 학생 ${total}명에게 MAT 을 엽니다.\n`
                + "이미 열린 학생과 멈춘 계정은 건너뛰고, 남은 인원까지만 엽니다.\n"
                + "연 인원은 되돌릴 수 없습니다.",
              )) e.preventDefault();
            }}>
            {pending ? "여는 중…" : `지금 조건의 학생 ${total}명에게 열기`}
          </button>
        </form>
      ) : null}
    </div>
  );
}
