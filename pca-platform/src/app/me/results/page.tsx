import Link from "next/link";
import { requireUser } from "@/lib/session";
import { currentState, resultHistory } from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { AXIS_KO } from "@/lib/me-v3/result/text.ko";
import { registry } from "@/lib/me-v3/core-registry";
import { CmShell, CmHead } from "../shell";

export const metadata = { title: "결과 기록 · CareerMatri" };

/**
 * 결과 기록.
 *
 * **굳은 기록과 변하는 상태를 같은 카드 모양으로 그리지 않는다.** 전에는
 * `/me` 카드 한 줄에 둘이 나란히 있어서, 날짜만 다른 같은 값으로 읽혔다.
 * 여기서는 생김새를 갈라 둔다: 검사 당시 결과는 흰 카드에 자물쇠 표시,
 * 현재 상태는 점선 테두리에 `바뀔 수 있습니다`.
 *
 * **판본 코드를 앞세우지 않는다.** 접어 두고, 펼치면 보인다. 응시자에게
 * 필요한 것은 결과가 고정돼 있다는 사실이다.
 */
export default async function Results() {
  const user = await requireUser();
  const [st, rows] = await Promise.all([currentState(user.id), resultHistory(user.id)]);
  const snaps = rows.filter((r) => r.kind === "SNAPSHOT");

  return (
    <CmShell active="/me/results" title="결과 기록">
      <CmHead
        kicker="결과 기록"
        title="검사 당시 결과와 현재 상태"
        lead={"검사 당시 결과는 응시하신 그날의 문항과 기준으로 굳어 있습니다. "
          + "현재 상태는 그 뒤에 더한 경험까지 반영한 값이라 달라질 수 있습니다."}
      />

      {!snaps.length ? (
        <div className="cm-soon">
          <b>아직 완료한 검사가 없습니다.</b> 검사를 한 번 끝내면 그날의
          결과가 날짜와 함께 줄로 섭니다.
          <p style={{ marginTop: 10 }}><Link href="/cores">기계공학 검사 시작</Link></p>
        </div>
      ) : null}

      {/* ── 현재 상태. 점선 테두리로 `변한다` 를 생김새로 말한다 ── */}
      {st.model ? (
        <section className="cm-live">
          <header>
            <h2>현재 상태</h2>
            <span>
              {st.recomputed_at
                ? `${st.recomputed_at} 에 새 경험을 반영했습니다`
                : "아직 새 경험을 반영한 적이 없어 검사 당시 결과와 같습니다"}
            </span>
          </header>
          <div className="cm-rows">
            <p className="cm-row"><b>올라간 판단</b>
              <span>
                {st.raised.length
                  ? st.raised.slice(0, 3)
                    .map((r) => `${domainName(r.domain)} · ${AXIS_KO[r.axis]}`).join(" / ")
                  : "없습니다"}
                {st.raised.length > 3 ? ` 외 ${st.raised.length - 3}` : ""}
              </span></p>
            <p className="cm-row"><b>남아 있는 빈자리</b>
              <span>{st.gaps.length ? `${st.gaps.length}곳` : "지금 잡힌 것이 없습니다"}</span></p>
          </div>
          <p className="cm-live-note">이 줄은 경험을 더하면 바뀝니다.</p>
          <div className="cm-acts">
            <Link className="cm-btn is-primary" href="/me/state">현재 상태 보기</Link>
            {st.pending > 0 ? (
              <Link className="cm-btn" href="/me/recompute">새 경험 반영하기</Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── 검사 당시 결과. 왼쪽 날짜 띠와 자물쇠 ── */}
      {snaps.length ? (
        <>
          <h2 className="cm-sect">검사 당시 결과 <em>{snaps.length}건</em></h2>
          <div className="cm-snaps">
            {snaps.map((r) => (
              <article className="cm-snap" key={`${r.attempt_id}-${r.at}`}>
                <div className="cm-snap-date">
                  <b>{r.at?.slice(5) ?? ""}</b>
                  <small>{r.at?.slice(0, 4) ?? ""}</small>
                </div>
                <div className="cm-snap-body">
                  <h3>
                    기계공학 · {r.tier ?? ""}
                    <span className="cm-lockmark">고정됨</span>
                  </h3>
                  <p>
                    {r.confirmed !== null
                      ? `확인된 판단 ${r.confirmed}개`
                      : "그날의 응답으로 굳어 있습니다"}
                  </p>
                  <div className="cm-acts">
                    <Link className="cm-btn" href={`/v3/${r.attempt_id}/result`}>
                      결과 보기
                    </Link>
                    {/* **`Link` 로 걸지 않는다.** Next 가 화면에 들어온 `Link` 를
                        미리 불러오면서 종이를 한 벌씩 만들어 버린다 */}
                    <a className="cm-btn" href={`/v3/${r.attempt_id}/result/pdf`}>PDF</a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <details className="cm-fold">
            <summary>당시 판본 보기</summary>
            <div className="cm-rows">
              {Object.entries(st.model?.provenance.module_versions ?? {}).map(([k, v]) => (
                <p className="cm-row" key={k}><b>{VER_KO[k] ?? k}</b>
                  <span>{v === null ? "없음" : verSay(k, String(v))}</span></p>
              ))}
            </div>
          </details>
        </>
      ) : null}
    </CmShell>
  );
}

/**
 * 판본 값 가운데 **사람 말로 바꿀 수 있는 것**만 바꾼다.
 *
 * `core_version` 의 값은 `ME_CORE_V3` 인데 그 글자는 읽는 사람에게 아무
 * 뜻이 없다. 어느 전공의 검사였는지가 그 칸이 답해야 하는 것이라 전공
 * 이름을 적는다. 등록부에 없는 코드는 **지어내지 않고 그대로 적는다**:
 * 모르는 것을 그럴듯한 이름으로 바꾸면 되짚을 때 틀린 줄을 읽는다.
 *
 * 나머지 판본 글자는 그대로 둔다. 이 묶음이 접혀 있는 까닭이 그것이다:
 * **되짚어 보실 자리라** 고객지원에 적어 보낼 수 있는 값이어야 한다.
 */
function verSay(key: string, value: string): string {
  if (key !== "core_version") return value;
  const hit = registry().cores.find((c) => c.code === value);
  return hit ? hit.name_ko : value;
}

/** 판본 칸 이름을 사람 말로. **내부 열쇠를 그대로 적지 않는다** */
const VER_KO: Record<string, string> = {
  core_version: "전공",
  item_bank_version: "문항",
  scoring_version: "판단 규칙",
  assessment_ui_version: "검사 화면",
  assessment_copy_version: "검사 문장",
  result_model_version: "결과 구성",
  result_copy_version: "결과 문장",
  result_ui_version: "결과 화면",
  industry_pack_version: "산업",
  role_pack_version: "직무",
  region_layer_version: "지역",
};
