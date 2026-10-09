import { requireUser } from "@/lib/session";
import { profileOf } from "@/lib/me-v3/platform";
import { regionGaps, regionLayer, regionOpen } from "@/lib/me-v3/region";
import { industryChoices, roleChoices } from "@/lib/me-v3/runtime/session";
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
  /* 이름을 못 찾은 코드는 버린다. 화면에 `OC1` 이 서던 자리다 */
  const orgNames = (profile?.target_org ?? [])
    .map((c) => L.org_types.find((o) => o.code === c)?.label)
    .filter((x): x is string => !!x);
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

          {/* **기관 유형을 읽기만 하는 카드로 두지 않는다.** 고를 수 없으면
              그 줄은 설명이고, 설명은 탐색의 열쇠가 되지 못한다. 산업 ·
              직무 · 권역 · 기관 유형 넷이 모여야 뒤에 올 자료를 물어볼 수
              있다 */}
          <fieldset className="cm-field">
            <legend>
              <span>보고 싶은 기관 유형</span>
              <small>셋까지 고르실 수 있습니다</small>
            </legend>
            <div className="cm-pickset">
              {L.org_types.map((o) => (
                <label className="cm-pick" key={o.code}>
                  <input type="checkbox" name="org" value={o.code}
                    defaultChecked={(profile?.target_org ?? []).includes(o.code)} />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="cm-acts" style={{ marginBottom: 24 }}>
            <button className="cm-btn is-primary" type="submit">저장하기</button>
          </div>
        </form>
      )}

      {/* ── 네 가지가 모이면 무엇을 물어볼 수 있는가 ──
          **자료가 0줄이어도 열쇠는 보여 준다.** 무엇이 모이면 답이 나오는지
          알아야, 비어 있는 것이 고장이 아니라 아직인 줄로 읽힌다 */}
      <h2 className="cm-h1" style={{ fontSize: 18, margin: "8px 0 12px" }}>
        지금 고르신 네 가지
      </h2>
      <div className="cm-card" style={{ marginBottom: 24 }}>
        <dl className="cm-dl">
          <div>
            <dt>산업</dt>
            <dd>{(profile?.target_industry ?? []).length
              ? (profile!.target_industry).map((c) =>
                  industryChoices().find((x) => x.code === c)?.name ?? c).join(" · ")
              : "아직 고르지 않으셨습니다"}</dd>
          </div>
          <div>
            <dt>직무</dt>
            <dd>{(profile?.target_role ?? []).length
              ? (profile!.target_role).map((c) =>
                  roleChoices().find((x) => x.code === c)?.name ?? c).join(" · ")
              : "아직 고르지 않으셨습니다"}</dd>
          </div>
          <div>
            <dt>권역</dt>
            <dd>{L.regions.find((r) => r.code === profile?.home_region)?.name
              ?? "아직 고르지 않으셨습니다"}</dd>
          </div>
          <div>
            <dt>기관 유형</dt>
            {/* **모르는 코드를 적지 않고 비운다.** 칸을 나누기 전에 적힌
                줄은 `target_org` 에 Core 의 조직환경 코드를 들고 있다 */}
            <dd>{orgNames.length
              ? orgNames.join(" · ")
              : "아직 고르지 않으셨습니다"}</dd>
          </div>
        </dl>
        <p className="cm-note">
          이 넷이 모이면 그 조합의 기관 수와 공고를 물어볼 수 있습니다. 지금은
          물어볼 자료가 없어서 답을 내지 않습니다.
        </p>
      </div>

      <h2 className="cm-h1" style={{ fontSize: 18, margin: "8px 0 12px" }}>
        기관마다 일이 서는 모양이 다릅니다
      </h2>
      <div className="cm-grid">
        {L.org_types.map((o) => (
          <div className="cm-card" key={o.code}>
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
