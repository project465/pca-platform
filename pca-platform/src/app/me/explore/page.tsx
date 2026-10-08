import Link from "next/link";
import { requireUser } from "@/lib/session";
import { latestResult, profileOf } from "@/lib/me-v3/platform";
import {
  domainName, industryChoices, industryScene, roleChoices,
} from "@/lib/me-v3/runtime/session";
import { regionLayer } from "@/lib/me-v3/region";
import { CmShell, CmHead } from "../shell";

export const metadata = { title: "탐색 · 내 CareerMatri" };

/**
 * 탐색.
 *
 * **산업팩을 구독으로 잠그지 않는다.** 여덟 산업과 여덟 역할 전부를 여기서
 * 볼 수 있고, 한 응시에서 깊게 묻는 것이 산업 하나와 역할 하나다. 나머지는
 * Core 에서 확인된 축으로 견준다.
 *
 * **광고 문구를 적지 않는다.** 산업마다 적는 것은 그 산업에서 기계공학자가
 * 실제로 어떤 판단을 하는지다.
 */
export default async function Explore() {
  const user = await requireUser();
  const [profile, result] = await Promise.all([
    profileOf(user.id), latestResult(user.id),
  ]);
  const mine = new Set(profile?.target_industry ?? []);
  const myRoles = new Set(profile?.target_role ?? []);
  const region = regionLayer();
  const confirmed = new Set((result?.evidence.ready ?? []).map((g) => g.domain));

  return (
    <CmShell active="/me/explore" title="탐색">
      <CmHead
        kicker="탐색"
        title="산업과 직무와 지역"
        lead={"여덟 산업과 여덟 직무를 모두 볼 수 있습니다. "
          + "검사에서 깊게 물은 것은 그 가운데 고른 하나입니다."}
      />

      <h2 className="cm-h1" style={{ fontSize: 18, margin: "6px 0 14px" }}>산업</h2>
      <div className="cm-grid">
        {industryChoices().map((x) => {
          const sc = industryScene(x.code);
          return (
            <div className="cm-card" key={x.code}>
              <h2>
                {x.name}
                {mine.has(x.code) ? <em>관심 산업으로 고르셨습니다</em> : null}
              </h2>
              <p>{sc?.scene ?? x.first}</p>
              {sc?.demands?.length ? (
                <div className="cm-chips">
                  {sc.demands.slice(0, 4).map((d) => (
                    <span className="cm-chip" key={d}>{d}</span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <h2 className="cm-h1" style={{ fontSize: 18, margin: "28px 0 14px" }}>직무</h2>
      <div className="cm-grid">
        {roleChoices().map((r) => (
          <div className="cm-card" key={r.code}>
            <h2>
              {r.name}
              {myRoles.has(r.code) ? <em>관심 직무로 고르셨습니다</em> : null}
            </h2>
            <p>{r.first}</p>
          </div>
        ))}
      </div>

      <h2 className="cm-h1" style={{ fontSize: 18, margin: "28px 0 14px" }}>지역과 기관</h2>
      <div className="cm-grid">
        {region.regions.map((r) => (
          <div className="cm-card" key={r.code}>
            <h2>{r.name} <em>{r.includes.join(" · ")}</em></h2>
            <p>{r.scene}</p>
          </div>
        ))}
      </div>
      <div className="cm-acts" style={{ marginTop: 14 }}>
        <Link className="cm-btn" href="/me/region">희망 지역 고르기</Link>
      </div>

      {confirmed.size ? (
        <p className="cm-lead" style={{ marginTop: 24 }}>
          지금 근거가 선 기술영역은 {[...confirmed].map((c) => domainName(c)).join(" · ")}입니다.
          산업마다 더 보는 판단이 달라서, 같은 근거가 어느 산업에서는 충분하고
          어느 산업에서는 한 축이 빕니다.
        </p>
      ) : null}
    </CmShell>
  );
}
