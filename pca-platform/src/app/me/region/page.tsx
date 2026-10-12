import { requireUser } from "@/lib/session";
import { profileOf, activeCore } from "@/lib/me-v3/platform";
import { regionGaps, regionLayer, regionOpen, regionOrganizations } from "@/lib/me-v3/region";
import { industryChoices, roleChoices } from "@/lib/me-v3/runtime/session";
import { CmShell, CmHead } from "../shell";
import { EmptyState, PickCard, PickGrid, SectionHeader } from "../ui";
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
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCore(user.id);
  const profile = await profileOf(user.id);
  const L = regionLayer();
  /* 이름을 못 찾은 코드는 버린다. 화면에 `OC1` 이 서던 자리다 */
  const orgNames = (profile?.target_org ?? [])
    .map((c) => L.org_types.find((o) => o.code === c)?.label)
    .filter((x): x is string => !!x);
  const open = regionOpen("KR");
  const gaps = regionGaps();
  /* 확인된 줄만 선다. 출처 없는 줄은 DB 가 거절하므로 걸러낼 일이 없다 */
  const orgs = await regionOrganizations(profile?.home_region ?? null, [], 6);

  return (
    <CmShell active="/me/region" title="지역과 기관">
      <CmHead
        title="어디에서 일하고 싶은지"
        lead={"이 선택은 기술영역 결과를 바꾸지 않습니다. "
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
      {/* **고르신 것을 chip 으로 요약한다**(규격 §9). 전에는 정의 목록
          넷이 큰 카드 하나를 채웠고, 고른 값이 네 줄의 글로 읽혔다 */}
      <SectionHeader icon="target" title="지금 고른 것" />
      <div className="cm-chips cm-mb">
        {[
          ["권역", L.regions.find((r) => r.code === profile?.home_region)?.name],
          ["기관 유형", orgNames.join(" · ")],
          ["산업", (profile?.target_industry ?? []).map((c) =>
            industryChoices(core).find((x) => x.code === c)?.name ?? c).join(" · ")],
          ["직무", (profile?.target_role ?? []).map((c) =>
            roleChoices(core).find((x) => x.code === c)?.name ?? c).join(" · ")],
        ].map(([k, v]) => (
          <span className="cm-chip" key={k as string}>
            {k}<b style={{ marginLeft: 6 }}>{v || "아직"}</b>
          </span>
        ))}
      </div>

      {/* ── 이 지역에서 함께 볼 곳 ──
          **지어내지 않는다**(규격 §9). 자료가 없으면 EmptyState 하나이고,
          법적·자료 설명은 아래 작은 자리로 내린다 */}
      <SectionHeader icon="building" tone="c" title="이 지역에서 함께 볼 곳"
        sub="채용 여부나 합격 가능성과는 관계가 없습니다." />
      {orgs.length ? (
        <PickGrid>
          {orgs.map((o) => (
            <PickCard key={o.organization_id} href={o.homepage_url}
              icon="building" tone="b" title={o.name}
              tag={L.org_types.find((t) => t.code === o.org_type_code)?.label}
              lead={[o.city, o.industry_code].filter(Boolean).join(" · ") || undefined}
              meta={o.related_majors.length
                ? `${o.related_majors.join(" · ")} 전공에서 이어 볼 수 있습니다`
                : undefined}
              cta="기관 보기" />
          ))}
        </PickGrid>
      ) : (
        <EmptyState style={{ marginBottom: 16 }}>
          <b>확인된 기업·기관 자료를 준비하고 있습니다.</b>{" "}
          공식 홈페이지와 공공데이터에서 확인한 곳만 적습니다.
        </EmptyState>
      )}

      <SectionHeader icon="grid" tone="c" title="기관마다 일이 서는 모양이 다릅니다" />
      <PickGrid cols={3}>
        {L.org_types.map((o, i) => (
          <PickCard key={o.code} icon="building"
            tone={(["b", "c", "v", "w"] as const)[i % 4]}
            title={o.label} lead={o.scene} />
        ))}
      </PickGrid>

      {/* **긴 방어문을 첫 화면에 크게 세우지 않는다**(규격 §9). 자료가
          왜 비어 있는지는 눌러서 읽는 자리로 내린다 */}
      <details className="cm-fold">
        <summary>기업·기관 자료가 아직 비어 있는 까닭</summary>
        <ul className="cm-bul">
          {gaps.map((g) => <li key={g.table}>{g.why}</li>)}
        </ul>
        <p className="cm-note">
          기관 수를 짐작으로 채우지 않습니다. 그 수가 근거처럼 읽히고, 그걸
          믿고 움직이는 사람이 생깁니다.
        </p>
      </details>
    </CmShell>
  );
}
