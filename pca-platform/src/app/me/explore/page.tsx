import Link from "next/link";
import { requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { currentState, profileOf, activeCoreOrPick } from "@/lib/me-v3/platform";
import {
  domainName, industryChoices, industryDomains, industryScene,
  majorNameIn, roleChoices, roleDomains,
} from "@/lib/me-v3/runtime/session";
import { regionLayer } from "@/lib/me-v3/region";
import { wsLang } from "@/lib/me-v3/ws-lang";
import { wsSay } from "@/lib/me-v3/ws-say";
import { CmShell, CmHead } from "../shell";
import { Icon } from "@/components/sf/icon";
import { PickCard, PickGrid, SectionHeader } from "../ui";
import { activeTrack } from "@/lib/track";
import { changeTargets } from "./actions";
import { MAT_PUBLIC } from "@/lib/mat-switch";

export async function generateMetadata() {
  const user = await requireUser();
  const t = wsSay(await wsLang(user.id));
  return { title: t("탐색 · 내 CareerMatri") };
}


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
export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<{ targets?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const lang = await wsLang(user.id);
  const t = wsSay(lang);
  const majorKo = await activeMajorName(user.id);
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCoreOrPick(user.id);
  /* 영어면 전공 이름도 그 언어 원고에서 읽는다. 모르면 비워 껍데기가 채운다 */
  let major = majorKo;
  if (lang === "en" && majorKo) {
    try { major = majorNameIn(core, "en"); } catch { major = null; }
  }
  const [profile, st, track] = await Promise.all([
    profileOf(user.id), currentState(user.id), activeTrack(user.id),
  ]);
  const mine = new Set(profile?.target_industry ?? []);
  const myRoles = new Set(profile?.target_role ?? []);
  /* 지역 층은 한국 자료다. 영어 작업공간에는 세우지 않는다 */
  const region = lang !== "en" ? regionLayer() : null;
  /**
   * **홈과 같은 `현재 상태` 를 읽는다**(설계 원칙 10).
   *
   * 전에는 굳은 결과의 `evidence.ready`(근거가 선 영역)만 봤다. 그래서 해 본
   * 일은 있고 정리가 덜 된 영역(Z2)만 가진 사람과, 경험을 더해 근거가 선
   * 사람이 **홈에서는 `설명할 수 있는 일 2가지` 를 읽고 여기서는 산업과
   * 직무 열다섯 줄 전부 `겹치는 영역이 없습니다` 를 읽었다**(R35 인벤토리).
   * 홈이 세우는 영역(근거가 선 영역과 정리가 덜 된 영역)과 같은 묶음을
   * 지금 값(`zoneOf`)에서 읽는다. 판정을 여기서 다시 하지 않는다.
   */
  const confirmed = new Set(Object.entries(st.zoneOf)
    .filter(([, z]) => z === "Z1_EVIDENCE_ESTABLISHED" || z === "Z2_EVIDENCE_INCOMPLETE")
    .map(([d]) => d));

  /**
   * 확인된 영역과 겹치는 것만 이름으로 적는다.
   *
   * **`중심` 과 `있음` 을 가른다.** 관계표는 영역 열둘과 산업 여덟을 모두
   * 이어 두고 있어서, 강도를 보지 않고 겹치기만 재면 **여덟 산업이 전부
   * 똑같은 줄**을 들고 선다. 그러면 나누어 둔 뜻이 화면에 남지 않는다.
   * 묶음을 가르는 것은 `중심` 이고, 줄에 적는 것은 그 산업이 실제로 다루는
   * 영역(`중심` 과 `있음`)이다. **여기서 수를 만들지 않는다**(규격 §18).
   */
  const names = (cs: string[]) => cs.map((c) => domainName(core, c, lang));
  const pick = (rows: { td: string; strength: string }[], ...ok: string[]) =>
    [...new Set(rows.filter((r) => ok.includes(r.strength) && confirmed.has(r.td))
      .map((r) => r.td))];

  const industries = industryChoices(core, lang).map((x) => {
    const rows = industryDomains(core, x.code);
    return {
      ...x, scene: industryScene(core, x.code, lang),
      core: pick(rows, "중심"), link: pick(rows, "중심", "있음"),
    };
  });
  const roles = roleChoices(core, lang).map((r) => {
    const rows = roleDomains(core, r.code);
    return { ...r, core: pick(rows, "중심"), link: pick(rows, "중심", "있음") };
  });
  /* **나와 이어지는 쪽을 먼저 세운다**(규격 §18). 전부를 같은 중요도로
     깔면 어디부터 볼지 읽는 사람이 정해야 한다. 확인된 영역이 없으면
     묶음이 하나뿐이라 그대로 전부가 선다 */
  const indOn = industries.filter((x) => x.core.length);
  const roleOn = roles.filter((x) => x.core.length);

  /**
   * 위에 세울 둘셋을 고른다(규격 §4).
   *
   * **고른 것이 먼저다.** 그 사람이 응시에서 직접 고른 산업과 직무는 다시
   * 찾아보려고 들어오는 자리이므로 맨 위에 선다. 그다음이 `relations` 의
   * `중심` 으로 걸린 확인된 영역이 있는 쪽이다.
   *
   * **차례를 점수로 만들지 않는다**(규격 §4·§18). 묶는 기준이 둘(고름 ·
   * 중심 겹침)이고 묶음 안에서는 사전의 차례 그대로다. 적합도도 순위도
   * 만들지 않는다.
   */
  const topOf = <T extends { code: string }>(all: T[], on: T[], chosen: Set<string>) => {
    const top: T[] = [];
    for (const x of [...all.filter((y) => chosen.has(y.code)), ...on]) {
      if (top.length >= 3) break;
      if (!top.some((t) => t.code === x.code)) top.push(x);
    }
    const up = new Set(top.map((t) => t.code));
    const onCodes = new Set(on.map((x) => x.code));
    /* 아래 줄은 **겹치는 쪽이 먼저**다. 위에 선 것은 빼고 차례는 그대로다 */
    const rest = [
      ...on.filter((x) => !up.has(x.code)),
      ...all.filter((x) => !up.has(x.code) && !onCodes.has(x.code)),
    ];
    return { top, rest };
  };
  const ind = topOf(industries, indOn, mine);
  const role = topOf(roles, roleOn, myRoles);

  /**
   * 한 줄(규격 §8·§14).
   *
   * **카드 벽을 세우지 않는다.** 전에는 산업 여덟과 직무 여덟이 세 칸
   * 격자의 카드로 섰고, 카드 하나가 250px 이라 쪽이 2,500px 을 넘었다.
   * 훑어서 하나를 고르는 자리인데 **읽어 내려가는 자리**가 됐다. 지금은
   * 한 줄에 넷을 적는다: 이름 · 한 줄 설명 · 이어지는 기술영역 ·
   * 자세히 보기.
   */
  const Row = (
    { name, kind, line, core, link, chosen, more }: {
      /* **조사를 끼워 넣지 않는다.** `이 ${kind}가` 로 적었더니 받침이
         있는 `산업` 에서 `이 산업가` 가 나갔다. 묶음마다 온전한 말을
         들고 온다 */
      name: string; kind: "이 산업이" | "이 직무가"; line: string;
      core: string[]; link: string[];
      /** 고른 칸이면 읽어 줄 말(`고른 산업`). 화면에는 표시 하나만 선다 */
      chosen?: string;
      more?: { scene?: string; head: string; lines: string[] } | null;
    },
  ) => (
    <li className="cm-item">
      <details>
        <summary>
          <span className="cm-item-t">
            <b>{name}</b>
            <em>{line}</em>
          </span>
          <span className="cm-item-meta">
            {/* **`고르셨습니다` 를 적지 않는다**(규격 §4). 고른 줄이 둘이면
                그 말이 둘 서고, 읽는 사람은 자기가 고른 것을 이미 안다.
                표시 하나로 두고 읽어 주는 자리에만 글자를 남긴다 */}
            {chosen ? (
              <span className="cm-item-sel" role="img" aria-label={chosen}>
                <Icon name="check" size={12} />
              </span>
            ) : null}
            <span>{t("자세히 보기#explore")}</span>
          </span>
          {/* **겹치는 것이 없으면 그 사실을 적는다.** 칸을 비우면 읽는
              사람이 자기 결과가 덜 만들어진 줄 안다. 묶음마다 적는 말이
              달라야 왜 이쪽에 섰는지가 읽힌다 */}
          <span className="cm-item-sub">
            {core.length
              ? (kind === "이 산업이"
                ? t("이 산업이 가장 많이 보는 영역 가운데 내가 해 본 것 · {areas}",
                  { areas: names(core).join(" · ") })
                : t("이 직무가 가장 많이 보는 영역 가운데 내가 해 본 것 · {areas}",
                  { areas: names(core).join(" · ") }))
              : link.length
                ? t("내 경험과 겹치는 영역 · {areas}", { areas: names(link).join(" · ") })
                : t("아직 이 쪽과 겹치는 내 경험이 없습니다")}
          </span>
        </summary>
        {more?.lines.length ? (
          <div className="cm-item-more">
            {/* **긴 설명은 여기 안에서만 선다**(규격 §14). 줄의 기본은 한 줄이다 */}
            {more.scene ? <p className="cm-row">{more.scene}</p> : null}
            <p className="cm-none">{more.head}</p>
            <ul className="cm-bul">
              {more.lines.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
        ) : null}
      </details>
    </li>
  );

  return (
    <CmShell active="/me/explore" title={t("탐색")} major={major} lang={lang}>
      <CmHead
        title={t("산업과 직무")}
        lead={t("내가 해 본 영역과 이어지는 쪽이 먼저 나옵니다.")}
      />

      {/**
       * 관심 산업·직무 다시 고르기. **Track 이 여는 자리다.**
       *
       * 검사에서 고른 산업과 직무가 이 쪽의 차례를 정한다. 그 값을 바꾸면
       * 위에 서는 카드가 바뀌어 다른 쪽과 다시 견줄 수 있다. 굳은 결과는
       * 고치지 않는다.
       *
       * **닫혀 있을 때 폼을 흐리게 세우지 않는다.** 누를 수 없는 칸을
       * 깔아 두면 고장 난 폼으로 읽힌다. 무엇이 열리는지 한 줄과 Track
       * 으로 가는 길만 둔다.
       */}
      {track.on ? (
        <details className="cm-fold">
          <summary>{t("관심 산업·직무 다시 고르기")}</summary>
          <form action={changeTargets} className="cm-formcard">
            <p className="cm-none">
              {t("산업과 직무를 둘씩까지 고르면 그쪽이 맨 위에 서서 다시 견줄 수 "
                + "있습니다. 검사 당시 결과는 그대로 남습니다.")}
            </p>
            <p className="cm-listhead">{t("산업#explore")}</p>
            <div className="cm-pickset">
              {industryChoices(core, lang).map((x) => (
                <label className="cm-pick" key={x.code}>
                  <input type="checkbox" name="industry" value={x.code}
                    defaultChecked={mine.has(x.code)} />
                  {x.name}
                </label>
              ))}
            </div>
            <p className="cm-listhead">{t("직무#explore")}</p>
            <div className="cm-pickset">
              {roleChoices(core, lang).map((x) => (
                <label className="cm-pick" key={x.code}>
                  <input type="checkbox" name="role" value={x.code}
                    defaultChecked={myRoles.has(x.code)} />
                  {x.name}
                </label>
              ))}
            </div>
            <div className="cm-acts" style={{ marginTop: 16 }}>
              <button className="cm-btn is-primary" type="submit">{t("이대로 다시 비교하기")}</button>
            </div>
          </form>
        </details>
      ) : lang === "en" || !MAT_PUBLIC ? null : (
        /* Track 은 한국 상품이다(`WS_KR_ONLY`). 영어 작업공간에는 그리로 가는 길을 두지 않는다 */
        <p className="cm-soon" style={{ marginBottom: 18 }}>
          <b>관심 산업·직무를 바꿔 다시 비교하는 일은 Track 에서 열립니다.</b>{" "}
          지금은 검사에서 고르신 산업과 직무로 차례가 섭니다.{" "}
          <Link href="/me/track">Track 보기</Link>
        </p>
      )}
      {sp.targets === "1" && track.on ? (
        <p className="cm-none" role="status" style={{ marginBottom: 14 }}>
          {t("고르신 산업과 직무로 다시 세웠습니다.")}
        </p>
      ) : null}

      {/* **먼저 볼 산업은 카드로, 나머지는 줄로**(규격 §8). 여덟을 같은
          줄로 깔면 훑어 고르는 자리가 읽어 내려가는 표가 된다.
          **새 점수를 만들지 않는다**: 앞에 세우는 기준은 `relations` 의
          `중심`으로 걸린 확인된 영역이 있는가뿐이다 */}
      {ind.top.length ? (
        <>
          <SectionHeader icon="compass" title={t("먼저 볼 산업")}
            sub={mine.size
              ? t("응시에서 고른 산업이 먼저 서고, 그다음이 지금 확인된 영역과 겹치는 쪽입니다.")
              : t("지금 확인된 영역이 이 산업들이 보는 판단과 겹칩니다.")} />
          {/* **남는 칸을 두지 않는다**(규격 §17). 위에 서는 것이 하나나
              둘이면 세 칸 격자에 빈 면이 남는다. 칸 수를 담긴 수에
              맞춘다 */}
          <PickGrid cols={Math.min(ind.top.length, 3) as 1 | 2 | 3}>
            {ind.top.map((x) => (
              <PickCard key={x.code} href="#ind-all" icon="building" tone="b"
                title={x.name}
                selected={mine.has(x.code) ? { label: t("고른 산업") } : undefined}
                lead={x.first}
                meta={x.core.length
                  ? t("이어지는 영역 · {areas}", { areas: names(x.core).slice(0, 3).join(" · ") })
                  : t("지금 확인된 영역과 겹치는 것은 아직 없습니다")}
                cta={t("자세히 보기#explore")} />
            ))}
          </PickGrid>
        </>
      ) : null}
      {/* **적는 수가 실제 줄 수다.** 위에 선 것을 빼고 적지 않으면 일곱
          줄짜리 목록 머리에 `여덟` 이 선다 */}
      <p className="cm-listhead" id="ind-all">
        {ind.top.length ? t("다른 산업") : t("산업#explore")}
        <em>{t("{n}개#explore", { n: ind.rest.length })}</em>
      </p>
      <ul className="cm-list">
        {ind.rest.map((x) => (
          <Row key={x.code} name={x.name} kind="이 산업이" line={x.first}
            core={x.core} link={x.link}
            chosen={mine.has(x.code) ? t("고른 산업") : undefined}
            more={x.scene
              ? { scene: x.scene.scene, head: t("이 산업이 보는 판단"), lines: x.scene.demands }
              : null} />
        ))}
      </ul>

      {role.top.length ? (
        <>
          <SectionHeader icon="send" tone="c" title={t("먼저 볼 직무")}
            sub={myRoles.size
              ? t("응시에서 고른 직무가 먼저 서고, 그다음이 확인된 영역을 많이 쓰는 쪽입니다.")
              : t("확인된 영역을 가장 많이 쓰는 직무입니다.")} />
          <PickGrid cols={Math.min(role.top.length, 3) as 1 | 2 | 3}>
            {role.top.map((r) => (
              <PickCard key={r.code} href="#role-all" icon="target" tone="c"
                title={r.name}
                selected={myRoles.has(r.code) ? { label: t("고른 직무") } : undefined}
                lead={r.first}
                meta={r.core.length
                  ? t("이어지는 영역 · {areas}", { areas: names(r.core).slice(0, 3).join(" · ") })
                  : t("지금 확인된 영역과 겹치는 것은 아직 없습니다")}
                cta={t("자세히 보기#explore")} />
            ))}
          </PickGrid>
        </>
      ) : null}
      <p className="cm-listhead" id="role-all">
        {role.top.length ? t("다른 직무") : t("직무#explore")}
        <em>{t("{n}개#explore", { n: role.rest.length })}</em>
      </p>
      <ul className="cm-list">
        {role.rest.map((r) => (
          <Row key={r.code} name={r.name} kind="이 직무가" line={r.first}
            core={r.core} link={r.link}
            chosen={myRoles.has(r.code) ? t("고른 직무") : undefined}
            more={r.domains.length
              ? { head: t("이 직무가 다루는 기술영역"), lines: r.domains } : null} />
        ))}
      </ul>

      {/* **지역과 기관은 한국 자료다**(`WS_KR_ONLY`). 영어 작업공간에 세우면
          해외 손님이 한국 권역을 자기 것으로 읽는다 */}
      {region ? (
        <>
          <p className="cm-listhead" style={{ marginTop: 26 }}>
            지역과 기관
            <Link href="/me/region">희망 지역 고르기</Link>
          </p>
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
        </>
      ) : null}
    </CmShell>
  );
}
