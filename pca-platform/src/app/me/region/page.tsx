import { requireUser } from "@/lib/session";
import { profileOf } from "@/lib/me-v3/platform";
import { regionGaps, regionLayer, regionOpen } from "@/lib/me-v3/region";
import { CmShell, CmHead } from "../shell";
import { pickRegion } from "./actions";

export const metadata = { title: "지역과 기관 · 내 CareerMatri" };

/**
 * 지역과 기관 유형.
 *
 * **Core 판정에 들어가지 않는다.** 권역도 기관 유형도 이동 범위도 축
 * 수준이나 영역 묶음을 바꾸지 않는다. 쓰는 자리는 탐색과 결과를 읽는
 * 순서뿐이다.
 *
 * **기업 자료가 한 줄도 없다.** 이 회차에 세운 것은 구조와 빈 data
 * contract 까지다. 무엇이 비어 있고 왜 비어 있는지를 화면이 적는다:
 * 빈 자리를 조용히 두면 읽는 사람은 이 서비스가 원래 그 정도인 줄 안다.
 */
export default async function Region() {
  const user = await requireUser();
  const profile = await profileOf(user.id);
  const L = regionLayer();
  const open = regionOpen("KR");
  const gaps = regionGaps();

  return (
    <CmShell active="/me/explore" title="지역과 기관">
      <CmHead
        kicker="지역 · 기관"
        title="어디에서 일하고 싶은지"
        lead={"이 선택은 기술영역 결과에 반영되지 않습니다. "
          + "산업과 직무를 읽는 순서와 탐색 화면만 달라집니다."}
      />

      {!open ? (
        <div className="cm-soon">이 시장에서는 지역 층을 켜지 않았습니다.</div>
      ) : (
        <form action={pickRegion}>
          <fieldset className="cm-field">
            <legend><span>지금 기준이 되는 권역</span></legend>
            <div className="cm-pickset">
              {L.regions.map((r) => (
                <label className="cm-pick" key={r.code}>
                  <input type="radio" name="region" value={r.code}
                    defaultChecked={profile?.home_region === r.code} />
                  {r.name}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="cm-field">
            <legend><span>옮겨 갈 수 있는 범위</span></legend>
            <div className="cm-pickset">
              {L.move_ranges.map((m) => (
                <label className="cm-pick" key={m.code}>
                  <input type="radio" name="move" value={m.code}
                    defaultChecked={profile?.move_range === m.code} />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="cm-acts" style={{ marginBottom: 24 }}>
            <button className="cm-btn is-primary" type="submit">저장하기</button>
          </div>
        </form>
      )}

      <h2 className="cm-h1" style={{ fontSize: 18, margin: "8px 0 12px" }}>기관 유형</h2>
      <div className="cm-grid">
        {L.org_types.map((o) => (
          <div className="cm-card" key={o.oc}>
            <h2>{o.label}</h2>
            <p>{o.scene}</p>
          </div>
        ))}
      </div>

      <h2 className="cm-h1" style={{ fontSize: 18, margin: "28px 0 12px" }}>
        아직 비어 있는 자료
      </h2>
      <div className="cm-soon">
        <b>권역과 기관 유형의 열쇠만 섰고 기업 자료는 한 줄도 없습니다.</b>
        <ul>
          {gaps.map((g) => (
            <li key={g.table}>{g.why}</li>
          ))}
        </ul>
        <p style={{ marginTop: 10 }}>
          기관 수를 짐작으로 채우지 않습니다. 그 수가 근거처럼 읽히고, 그걸
          믿고 움직이는 사람이 생깁니다.
        </p>
      </div>
    </CmShell>
  );
}
