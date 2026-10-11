import Link from "next/link";
import { requireUser } from "@/lib/session";
import { latestResult, profileOf } from "@/lib/me-v3/platform";
import {
  domainName, industryChoices, industryDomains, industryScene,
  roleChoices, roleDomains,
} from "@/lib/me-v3/runtime/session";
import { regionLayer } from "@/lib/me-v3/region";
import { CmShell, CmHead } from "../shell";

export const metadata = { title: "탐색 · 내 CareerMatri" };


/**
 * 탐색.
 *
 * **산업팩을 구독으로 잠그지 않는다.** 여덟 산업과 여덟 직무 전부를 여기서
 * 볼 수 있고, 한 응시에서 깊게 묻는 것이 산업 하나와 역할 하나다. 나머지는
 * Core 에서 확인된 축으로 견준다.
 *
 * **첫 화면이 묻는 것은 `무엇을 볼 수 있고 내 경험이 어디와 이어지는가`
 * 까지다**(규격 §16). 전에는 카드마다 한 문단과 긴 문장 칩 넷이 붙어서,
 * 산업 여덟을 견주려면 **문장 마흔 줄을 읽어야** 했다. 전문적으로 보이는
 * 대신 읽을 양이 많았다. 지금은 카드가 넷을 든다: 이름 · 한 줄 · 내 경험과
 * 이어지는 영역 · 자세히 보기.
 *
 * **새 점수를 만들지 않는다**(규격 §18). `연결` 은 `relations` 표에 이미
 * 적혀 있는 관계와 굳은 결과의 확인된 영역이 겹치는지일 뿐이고, 적합도도
 * 순위도 만들지 않는다. 차례는 두 묶음으로만 갈린다.
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

  /**
   * 확인된 영역과 겹치는 것만 이름으로 적는다.
   *
   * **`중심` 과 `있음` 을 가른다.** 관계표는 영역 열둘과 산업 여덟을 모두
   * 이어 두고 있어서, 강도를 보지 않고 겹치기만 재면 **여덟 산업이 전부
   * 똑같은 줄**을 들고 선다. 그러면 나누어 둔 뜻이 화면에 남지 않는다.
   * 묶음을 가르는 것은 `중심` 이고, 줄에 적는 것은 그 산업이 실제로 다루는
   * 영역(`중심` 과 `있음`)이다. **여기서 수를 만들지 않는다**(규격 §18).
   */
  const names = (cs: string[]) => cs.map((c) => domainName(c));
  const pick = (rows: { td: string; strength: string }[], ...ok: string[]) =>
    [...new Set(rows.filter((r) => ok.includes(r.strength) && confirmed.has(r.td))
      .map((r) => r.td))];

  const industries = industryChoices().map((x) => {
    const rows = industryDomains(x.code);
    return {
      ...x, scene: industryScene(x.code),
      core: pick(rows, "중심"), link: pick(rows, "중심", "있음"),
    };
  });
  const roles = roleChoices().map((r) => {
    const rows = roleDomains(r.code);
    return { ...r, core: pick(rows, "중심"), link: pick(rows, "중심", "있음") };
  });
  /* **나와 이어지는 쪽을 먼저 세운다**(규격 §18). 전부를 같은 중요도로
     깔면 어디부터 볼지 읽는 사람이 정해야 한다. 확인된 영역이 없으면
     묶음이 하나뿐이라 그대로 전부가 선다 */
  const indOn = industries.filter((x) => x.core.length);
  const indOff = industries.filter((x) => !x.core.length);
  const roleOn = roles.filter((x) => x.core.length);
  const roleOff = roles.filter((x) => !x.core.length);

  const Card = (
    { name, line, core, link, chosen, more }: {
      name: string; line: string; core: string[]; link: string[];
      chosen?: boolean;
      more?: { scene?: string; head: string; lines: string[] } | null;
    },
  ) => (
    <div className="cm-card">
      <h2>{name}{chosen ? <em>고르셨습니다</em> : null}</h2>
      <p>{line}</p>
      {/* **겹치는 것이 없으면 그 사실을 적는다.** 칸을 비우면 읽는 사람이
          자기 결과가 덜 만들어진 줄 안다(규격 §42). 그리고 묶음마다 적는
          말이 달라야 왜 이쪽에 섰는지가 읽힌다 */}
      <p className="cm-none">
        {core.length
          ? `이 자리가 가장 많이 보는 영역 가운데 확인된 것 · ${names(core).join(" · ")}`
          : link.length
            ? `내 경험과 겹치는 영역 · ${names(link).join(" · ")}`
            : "아직 이 쪽과 겹치는 확인된 영역이 없습니다"}
      </p>
      {more?.lines.length ? (
        <details className="cm-fold">
          <summary>자세히 보기</summary>
          {/* **긴 설명은 여기 안에서만 선다**(규격 §16). 카드 기본은 한 줄이다 */}
          {more.scene ? <p style={{ marginTop: 0 }}>{more.scene}</p> : null}
          <p className="cm-none" style={{ marginBottom: 8 }}>{more.head}</p>
          <ul className="cm-bul">
            {more.lines.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </details>
      ) : null}
    </div>
  );

  return (
    <CmShell active="/me/explore" title="탐색">
      <CmHead
        kicker="탐색"
        title="산업과 직무와 지역"
        lead="여덟 산업과 여덟 직무를 모두 볼 수 있습니다."
      />

      <h2 className="cm-sect">산업</h2>
      {indOn.length ? (
        <>
          <p className="cm-lead" style={{ marginTop: 0 }}>
            지금 확인된 영역이 이 산업들이 보는 판단과 겹칩니다.
          </p>
          <div className="cm-grid">
            {indOn.map((x) => (
              <Card key={x.code} name={x.name} line={x.first}
                core={x.core} link={x.link} chosen={mine.has(x.code)}
                more={x.scene
                  ? { scene: x.scene.scene, head: "이 산업이 보는 판단", lines: x.scene.demands }
                  : null} />
            ))}
          </div>
        </>
      ) : null}
      {indOff.length ? (
        <>
          <h3 className="cm-sub-h">
            {indOn.length ? "다른 산업 둘러보기" : "여덟 산업"}
          </h3>
          <div className="cm-grid">
            {indOff.map((x) => (
              <Card key={x.code} name={x.name} line={x.first}
                core={x.core} link={x.link} chosen={mine.has(x.code)}
                more={x.scene
                  ? { scene: x.scene.scene, head: "이 산업이 보는 판단", lines: x.scene.demands }
                  : null} />
            ))}
          </div>
        </>
      ) : null}

      <h2 className="cm-sect">직무</h2>
      {roleOn.length ? (
        <div className="cm-grid">
          {roleOn.map((r) => (
            <Card key={r.code} name={r.name} line={r.first}
              core={r.core} link={r.link} chosen={myRoles.has(r.code)}
              more={r.domains.length
                ? { head: "이 자리가 다루는 기술영역", lines: r.domains } : null} />
          ))}
        </div>
      ) : null}
      {roleOff.length ? (
        <>
          {roleOn.length ? <h3 className="cm-sub-h">다른 직무 둘러보기</h3> : null}
          <div className="cm-grid">
            {roleOff.map((r) => (
              <Card key={r.code} name={r.name} line={r.first}
                core={r.core} link={r.link} chosen={myRoles.has(r.code)}
                more={r.domains.length
                  ? { head: "이 자리가 다루는 기술영역", lines: r.domains } : null} />
            ))}
          </div>
        </>
      ) : null}

      {/* 지역은 **고르는 자리가 따로 있다**. 여기서는 권역 이름과 한 줄까지다 */}
      <h2 className="cm-sect">
        지역과 기관
        <Link href="/me/region">희망 지역 고르기</Link>
      </h2>
      <div className="cm-panel is-quiet">
        <div className="cm-pane">
          <div className="cm-rows">
            {region.regions.map((r) => (
              <p className="cm-row" key={r.code}>
                <b>{r.name}</b>
                <span>{r.includes.join(" · ")}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </CmShell>
  );
}
