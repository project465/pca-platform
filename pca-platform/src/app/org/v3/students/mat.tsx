"use client";

import { useActionState } from "react";
import { Kpi } from "@/components/sf/parts";
import { matAction, type ManageState } from "./actions";
import { campusSay } from "@/lib/campus/words";
import { sayTree } from "@/lib/campus/say-tree";

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
  pools, filter, total, usage, agency = false,
}: {
  pools: MatPoolView[];
  /** 집계만(누가 무엇을 했는지는 오지 않는다). 5명이 안 되는 칸은 null */
  usage?: { opened: number; active30: number | null; consults: number | null };
  /** 지금 명단의 조건. 그대로 보내 서버가 같은 조건으로 다시 읽는다 */
  filter: { q: string; department: string; college: string; state: string };
  /** 지금 조건에 맞는 학생 수 */
  total: number;
  /** 기관(진흥원 등)이면 `학생` 을 `참여자` 로(2026-11-02 운영 시험). 이 덩이는 쪽의 `sayTree` 가 닿지 않는다 */
  agency?: boolean;
}) {
  const [state, run, pending] = useActionState(matAction, EMPTY);
  const say = campusSay(agency ? { org_kind: "agency" } : null);
  const open = pools.filter((p) => p.open);

  return sayTree(
    <div>
      {state.err ? <p className="sf-note is-bad" role="alert">{state.err}</p> : null}
      {state.ok ? <p className="sf-note is-ok" role="status">{state.ok}</p> : null}

      {/* **사용 현황은 집계만**(2026-11-01 대표 결정). 학생의 자료 · 공고 · 상담 내용은
          이 화면에 오지 않는다. 5명이 안 되는 칸은 수 대신 `5명 미만` 이다 */}
      {usage && usage.opened ? (
        <div className="sf-grid sf-g3" style={{ marginBottom: 14 }}>
          <Kpi label="지금 열린 학생" value={usage.opened} unit="명" />
          <Kpi label="최근 30일 MAT을 쓴 학생" value={usage.active30 ?? "5명 미만"}
            unit={usage.active30 == null ? undefined : "명"} />
          <Kpi label="커리어피크 상담 신청" value={usage.consults ?? "5명 미만"}
            unit={usage.consults == null ? undefined : "명"} />
        </div>
      ) : null}

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
          MAT 이용 인원이 아직 없습니다. 계약하면 운영팀이 인원과 기간을 넣어 드리고, 그 뒤 여기서
          학생에게 열 수 있습니다. 그 전까지 학생은 MAT 무료 분석만 쓸 수 있습니다.
        </p>
      )}

      {/* 묶음은 있는데 열 수 있는 것이 없으면 단추가 사라진다. 까닭과 다음 할 일을 적는다 */}
      {pools.length && !open.length ? (
        <p className="sf-note" style={{ marginTop: 12 }}>
          지금 열 수 있는 이용 인원이 없습니다. 인원을 다 썼거나 열 수 있는 날이 지났습니다.
          인원이나 기간을 늘리려면 운영팀에 요청해 주세요. 이미 연 학생은 기간이 끝날 때까지 그대로 씁니다.
        </p>
      ) : null}

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
              if (!confirm(say(
                `지금 조건에 맞는 학생 ${total}명에게 MAT을 엽니다.\n`
                + "이미 열린 학생과 멈춘 계정은 건너뛰고, 남은 인원까지만 엽니다.\n"
                + "학생 줄의 'MAT 닫기'로 닫으면 인원이 돌아옵니다.",
              ))) e.preventDefault();
            }}>
            {pending ? "여는 중…" : `지금 조건의 학생 ${total}명에게 열기`}
          </button>
        </form>
      ) : null}
    </div>,
    say, agency,
  );
}
