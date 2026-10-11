import Link from "next/link";
import { requireUser } from "@/lib/session";
import {
  EXPERIENCE_KINDS, applicationsOf, currentState, experiencesOf,
} from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import {
  ZONE_TITLE_KO, actionKo, domainChainKo, gapKo,
} from "@/lib/me-v3/result/text.ko";
import { Icon, type IconName } from "@/components/sf/icon";
import { openActions } from "@/lib/me-v3/open-actions";
import { recentChangeKo } from "@/lib/me-v3/change-text.ko";
import { mark } from "@/lib/me-v3/workspace-events";
import { CmShell, CmHead } from "./shell";
import { continueAssessment } from "./actions";

export const metadata = { title: "홈 · CareerMatri" };

/**
 * Workspace 홈.
 *
 * **5초 안에 셋을 알아야 한다**: 나는 지금 어떤 상태인가 · 지금 가장
 * 중요한 것은 무엇인가 · 다음에 무엇을 해야 하는가.
 *
 * **숫자 dashboard 를 만들지 않는다.** `82점` 이나 `완료율 67%` 같은 칸이
 * 없다. CareerMatri 는 KPI 판이 아니고, 수는 문장 안에서 보조로만 선다.
 *
 * **상태마다 다른 화면을 낸다.** 검사 전인 사람과 PRO 를 끝내고 경험까지
 * 반영한 사람이 같은 카드 아홉 칸을 받고 있었다. 빈 카드를 줄줄이 세우면
 * 읽는 사람은 자기 결과가 덜 만들어진 줄 안다.
 *
 * **판단을 여기서 하지 않는다.** 읽는 자리는 `currentState()` 하나이고
 * 그 함수가 굳은 결과와 반영 결과를 합쳐 준다.
 */
export default async function Home() {
  const user = await requireUser();
  /* **홈이 묻지 않는 것은 읽지도 않는다**(규격 §10). 고르신 산업과
     직무와 지역은 왼쪽 띠의 제 쪽이 들고, 결과 기록은 머리의 링크가
     보낸다. 쓰지 않는 값을 네 번 더 물으면 홈이 그만큼 늦어진다 */
  const [st, exps, act, apps] = await Promise.all([
    currentState(user.id), experiencesOf(user.id), openActions(user.id),
    applicationsOf(user.id),
  ]);
  const actions = act.rows;

  /* **센 것이 화면을 늦추거나 깨지 않는다.** `mark()` 는 던지지 않는다 */
  await mark("workspace_opened", user.id, { stage: st.stage });

  const open = actions.filter((a) => a.state !== "done");
  const first = open[0] ?? null;

  /**
   * 1순위 칸이 드는 말(규격 §3).
   *
   * **여기서 문장을 짓지 않는다.** 결과지와 `다음 할 일` 이 쓰는 같은
   * 함수를 부른다: 세 곳에서 따로 적으면 같은 할 일이 화면마다 다른 말로
   * 읽히고, 어느 날 한 곳만 고쳐진다.
   *
   * **까닭은 빈자리에서 가져온다.** 못 찾으면 그 줄을 적지 않는다:
   * 지어낸 까닭은 그 자리에서 가장 그럴듯하게 읽히고 가장 먼저 거짓이
   * 된다.
   */
  const nowModel = first && st.model
    ? st.model.actions.find((a) =>
        (a.domain ?? "") === (first.td_code ?? "")
        && (a.axis ?? "") === (first.axis_code ?? "")) ?? null
    : null;
  const nowSay = nowModel && st.model
    ? actionKo(nowModel, nowModel.domain ? domainName(nowModel.domain) : "",
               st.model.stage)
    : { do: first?.body ?? "" };
  const nowGap = first
    ? st.gaps.find((g) => g.domain === first.td_code
        && (g.axis ?? "") === (first.axis_code ?? ""))
      ?? st.gaps.find((g) => g.domain === first.td_code) ?? null
    : null;
  const nowWhy = nowGap ? gapKo(nowGap, domainName(nowGap.domain)).why : "";
  /**
   * **홈은 요약이고 세부 쪽이 전체다.**
   *
   * 전에는 홈이 영역을 묶음마다 셋씩(최대 여섯 줄) 세우고 비어 있는
   * 자리도 셋을 세웠다. 그러면 세부 쪽을 눌러 들어갈 이유가 없어지고,
   * **`현재 상태` 와 `다음 할 일` 이 있어도 아무도 안 연다.** 홈이 드는
   * 것은 상태 셋 · 비어 있는 자리 하나 · 할 일 하나다.
   */
  /**
   * 첫 화면에 서는 영역 셋(규격 §6).
   *
   * **차례를 여기서 만들지 않는다.** `currentState()` 가 정한 묶음에서
   * 설명할 수 있는 쪽만 집어 세 줄까지다. 나머지는 `현재 상태` 가 든다.
   */
  const ready = Object.entries(st.zoneOf)
    .filter(([, z]) => READY_ZONES.includes(z))
    .map(([d]) => d)
    .slice(0, HOME_ROWS);
  /* **홈이 요약을 따로 짓지 않는다**(규격 §11). 네 묶음이 전부
     `currentState()` 한 자리에서 오고, `최근 변화` 의 문장은 저장 직후
     화면과 현재 상태가 쓰는 함수를 그대로 부른다 */
  /* **줄 셋까지다**(규격 §7). 목표 화면의 `최근 변화` 가 세 줄짜리
     목록이고, 나머지 수는 마지막 줄이 든다. 전체는 `현재 상태` 가 든다 */
  const change = recentChangeKo(st, domainName, 3);

  /**
   * **주된 단추는 늘 `지금 할 일` 이다**(규격 §12).
   *
   * 전에는 상태마다 다른 단추를 세웠고, 경험을 반영한 사람에게는 가장
   * 짙은 단추가 `최근 변화 보기` 였다. 그러면 홈의 첫 행동이 **지난 일을
   * 돌아보는 쪽**이 된다. 결과가 있는 사람에게 다음 걸음은 하나뿐이라
   * 그 자리를 비워 두지 않는다. 검사 전과 진행 중만 갈린다.
   */
  const cta = st.stage === "NO_ASSESSMENT"
    ? { href: "/cores", label: "기계공학 검사 시작" }
    : st.stage === "IN_PROGRESS"
      ? { href: st.open ? `/v3/${st.open.id}` : "/cores", label: "검사 이어하기" }
      : { href: "/me/next", label: "지금 할 일" };

  return (
    <CmShell active="/me" title="홈" who={user.name}
      /* **없는 기능을 그려 넣지 않는다**(규격 §4). 목표 화면의 검색과
         알림은 CareerMatri 에 없는 기능이라 두지 않았다. 여기 서는 것은
         실제로 있는 한 가지다 */
      bar={st.model
        ? <Link className="cm-btn" href="/me/experience/new">+ 경험 추가</Link>
        : null}>
      <CmHead
        /* **이름을 제목으로 쓰지 않는다.** 로그인한 사람은 자기 이름을
           이미 알고, 쪽 제목 자리는 `이 쪽이 무엇인가` 를 말하는 자리다.
           이름이 제목이면 쪽마다 같은 글자가 가장 크게 선다 */
        title={HEAD[st.stage]}
        /* 제목 아래 한 줄(규격 §4) */
        meta={`기계공학${st.result_at ? ` · 최근 업데이트 ${st.result_at}` : ""}`}
        /* **결과가 있는 사람에게는 설명 문단을 두지 않는다**(규격 §9).
           바로 아래 Hero 가 그 사람이 지금 할 일을 들고 있어서, 그 위의
           문단은 행동 앞에 놓인 읽을거리가 된다 */
        lead={st.model ? undefined : LEAD[st.stage]}
        /* **짙은 단추는 쪽에 하나다**(규격 §19).
           결과가 있는 사람에게는 바로 아래 `지금 할 일` 칸이 그 단추를
           들고 있으므로 머리에 또 세우지 않는다. 둘을 세워 두었더니 같은
           화면에 짙은 단추가 둘이고, 그 둘이 **서로 다른 쪽으로** 갔다. */
        actions={st.model ? null : (
          <>
            {st.stage === "IN_PROGRESS" ? (
              /* 이어하기만 폼이다. 누른 것을 세려면 누르는 자리에서 센다 */
              <form action={continueAssessment}>
                <button className="cm-btn is-primary" type="submit">{cta.label}</button>
              </form>
            ) : (
              <Link className="cm-btn is-primary" href={cta.href}>{cta.label}</Link>
            )}
          </>
        )}
      />

      {/* ── A. 검사 전 ── 받는 것 셋만 세운다. 빈 카드를 쌓지 않는다 ── */}
      {st.stage === "NO_ASSESSMENT" ? (
        <>
          <div className="cm-grid">
            {[
              ["무엇을 해 봤는지", "전체 기술영역에서 해 본 일을 하나씩 묻습니다"],
              ["무엇을 직접 정했는지", "받아서 한 일과 직접 정한 일을 가릅니다"],
              ["다음에 무엇을 할지", "아직 부족한 부분과 그것을 메우는 일을 적습니다"],
            ].map(([t, b]) => (
              <div className="cm-card" key={t}>
                <h2>{t}</h2>
                <p>{b}</p>
              </div>
            ))}
          </div>
          <div className="cm-soon" style={{ marginTop: 18 }}>
            <b>적성이나 성격은 묻지 않습니다.</b> 해 본 일에서 직접 판단한
            경험을 찾고, 그것을 지원서와 면접에서 설명할 수 있는 근거로
            정리합니다. 12분 안팎입니다.
          </div>
        </>
      ) : null}

      {/* ── 적어 둔 경험은 **검사 전에도 보인다** ──
          적는 자리가 홈에 없고 쌓인 것도 보이지 않으면, 결과가 없는 동안
          적은 글이 어디로 갔는지 알 수 없다. 결과가 생긴 뒤에는 아래
          `기록` 묶음이 같은 줄을 들고 가므로 여기는 그 전에만 선다 */}
      {!st.model && exps.length ? (
        <>
          <h2 className="cm-sect">적어 둔 경험</h2>
          <div className="cm-panel">
            <div className="cm-pane">
              <h3>최근 경험<em>{exps.length}개</em></h3>
              <div className="cm-rows">
                {exps.slice(0, HOME_RECENT).map((e) => (
                  <p className="cm-row" key={e.id}>
                    <b>{e.title}</b>
                    <span className="cm-when">{e.created_at.slice(0, 10)}</span>
                  </p>
                ))}
              </div>
              <p className="cm-none">
                검사를 한 번 끝내면 이 경험이 어느 판단으로 가는지 맞춰 봅니다.
              </p>
              <div className="cm-acts">
                <Link className="cm-btn" href="/me/experience">경험 전체 보기</Link>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* ── B. 진행 중 ── 이어하기 하나만 ── */}
      {st.stage === "IN_PROGRESS" ? (
        <div className="cm-card is-wide">
          <h2>풀던 검사가 있습니다 <em>{st.open?.tier}</em></h2>
          <p>
            마지막으로 답한 자리에서 이어집니다. 답한 것은 서버에 저장되어
            있어 다른 기기에서도 그 자리로 돌아옵니다.
          </p>
          <div className="cm-acts">
            {/* **짙은 단추는 쪽에 하나다**(규격 §26). 쪽 머리의 단추가
                같은 `이어하기` 이므로 여기는 거드는 자리다 */}
            <form action={continueAssessment}>
              <button className="cm-btn" type="submit">이어하기</button>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── C~F. 결과가 있는 사람 ──
          **네 묶음의 무게가 서로 달라야 한다**(규격 §3): 지금 할 일 →
          현재 상태 → 최근 변화 → 기록. 전에는 차례만 다르고 넷이 **같은
          크기의 흰 판**으로 서서, 세로로 쌓아 두어도 무엇을 먼저 읽는지가
          화면에 없었다. 이제 첫 묶음만 짙은 판에 행동 단추를 들고, 나머지
          셋은 읽는 줄이다.

          **1순위가 `지금 할 일` 인 까닭**은 홈을 여는 이유가 그것이어서다.
          현재 상태는 그 할 일이 왜 나왔는지의 배경이고, 배경을 먼저 읽게
          하면 읽는 사람이 **행동 앞에서 한 번 더 고르는 일**을 한다.

          **빈 카드를 세우지 않는다**: 자료가 없는 묶음은 아예 그리지
          않는다. 점선 테두리에 `아직 없습니다` 를 적은 칸이 넷까지 서면
          읽는 사람은 자기 결과가 덜 만들어진 줄 안다. */}
      {st.model ? (
        <>
          {/* ── 지금 할 일 Hero (규격 §5) ──
              쪽에서 가장 강한 자리다. 옅은 파란 면 하나에 꼬리표와 할 일과
              까닭과 주된 단추와 나머지 수를 담는다. **문장을 여기서 짓지
              않는다**: 결과지와 `다음 할 일` 이 쓰는 같은 함수를 부른다 */}
          <section className="cm-hero">
            {/* 오른쪽의 가벼운 표시. **새 그림 파일을 만들지 않는다**
                (규격 §5): 네모와 선과 동그라미뿐이고 값도 상태도 적지 않는다 */}
            <div className="cm-hero-art" aria-hidden>
              <svg width="200" height="162" viewBox="0 0 200 162" fill="none">
                {/* 흰 판 하나가 그림을 담는다. Hero 의 파란 면 위에서 한
                    단 떠 보이게 하는 자리라 **값도 상태도 적지 않는다** */}
                <rect x="26" y="10" width="168" height="134" rx="18"
                  fill="#fff" stroke="#d8e5f7" />
                <rect x="48" y="30" width="124" height="98" rx="13"
                  fill="#f4f9ff" stroke="#dde8f8" />
                <rect x="88" y="21" width="44" height="17" rx="7"
                  fill="#dce9fa" stroke="#c6dbf3" />
                {[48, 72, 96].map((y, i) => (
                  <g key={y}>
                    <rect x="61" y={y} width="17" height="17" rx="5"
                      fill="#dceafb" stroke="#bcd6f2" />
                    <path d={`M65 ${y + 8.5}l3.1 3.1 5.6 -6`} stroke="#1c5fb0"
                      strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="86" y={y + 5} width={i === 2 ? 44 : 70} height="7" rx="3.5"
                      fill={i === 2 ? "#dce7f6" : "#cfe0f5"} />
                  </g>
                ))}
                {/* 판의 왼쪽 아래 모서리에 **걸친** 동그라미 하나.
                    떨어져 서면 떠 있는 표시가 되고, 걸쳐야 두 면이 앞뒤로 선다 */}
                <circle cx="44" cy="122" r="31" fill="#fff" />
                <circle cx="44" cy="122" r="25" fill="url(#cmHeroG)" />
                <path d="M33 122l7.5 7.5 14.5 -15.5" stroke="#fff" strokeWidth="3.6"
                  strokeLinecap="round" strokeLinejoin="round" />
                {/* 거드는 모양 둘. 담긴 뜻이 없고 면의 깊이를 만든다 */}
                <circle cx="186" cy="34" r="8" stroke="#c6dbf3" strokeWidth="2" />
                <circle cx="16" cy="56" r="4.5" fill="#c6dbf3" />
                <defs>
                  <linearGradient id="cmHeroG" x1="19" y1="97" x2="69" y2="147"
                    gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2f7ad6" />
                    <stop offset="1" stopColor="#1b5aa8" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="cm-hero-txt">
              <p className="cm-hero-tag"><Icon name="target" size={17} />지금 할 일</p>
              {first ? (
                <>
                  <h2 className="cm-hero-h">{nowSay.do}</h2>
                  {nowWhy ? <p className="cm-hero-why">{nowWhy}</p> : null}
                  <div className="cm-hero-acts">
                    <Link className="cm-btn is-primary" href="/me/experience/new">
                      지금 정리하기 →
                    </Link>
                    {open.length > 1 ? (
                      <Link className="cm-hero-more" href="/me/next">
                        그 밖에 할 일 {open.length - 1}개
                        <Icon name="chev" size={14} />
                      </Link>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="cm-hero-h">지금 꼭 해야 하는 일은 없습니다.</h2>
                  <p className="cm-hero-why">
                    새 경험을 적으면 현재 상태가 다시 서고 그다음 할 일이
                    나옵니다.
                  </p>
                  <div className="cm-hero-acts">
                    <Link className="cm-btn is-primary" href="/me/experience/new">
                      경험 추가 →
                    </Link>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ── 현재 상태 (규격 §6) ── 작은 가로 칸 셋. 큰 dashboard tile
              로 만들지 않는다 */}
          <h2 className="cm-sh">
            <Icon name="chart" size={18} />
            현재 상태
            <Link href="/me/state">전체 보기 →</Link>
          </h2>
          {ready.length ? (
            <>
              <p className="cm-shsub">
                지금 설명할 수 있는 주요 영역 {ready.length}가지입니다.
              </p>
              <div className="cm-tiles">
                {ready.map((d) => (
                  <Link className="cm-tile" href="/me/state" key={d}>
                    <span className="cm-tile-ico">
                      <Icon name={TILE_ICON[d] ?? "box"} size={18} />
                    </span>
                    <span className="cm-tile-txt">
                      <b>{domainName(d)}</b>
                      {/* 그 영역이 일하는 차례. **응답에서 온 값이 아니라
                          영역 설명이다**: 여기서 새 수를 만들지 않는다 */}
                      <small>{domainChainKo(d).slice(0, 2).join(" · ")}</small>
                    </span>
                    <Icon name="chev" size={16} />
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="cm-shsub">
              지원서에서 설명할 만한 경험이 아직 없습니다. 관심이 높은
              영역에서 짧게 한 번 해 보는 것이 다음 걸음입니다.
            </p>
          )}

          {/* ── 최근 변화 (규격 §7) ── 줄 중심. 줄마다 카드를 만들지 않는다 */}
          {st.stage === "RECOMPUTED" || st.pending > 0 ? (
            <>
              <h2 className="cm-sh">
                <Icon name="bolt" size={18} />
                최근 변화
                <Link href="/me/state#changes">모두 보기 →</Link>
              </h2>
              {st.stage === "RECOMPUTED" ? (
                <>
                  <p className="cm-shsub">
                    최근 추가한 경험으로 다음과 같은 변화가 생겼습니다.
                  </p>
                  <ul className="cm-feed">
                    {change.lines.map((line, i) => (
                      <li key={line}>
                        {/* **앞쪽은 묶음이 옮겨 간 것이고 뒤는 축이 올라간
                            것이다**(`recentChangeKo` 가 그 차례로 잇는다).
                            표시를 갈라 두면 같은 줄 넷이 한 덩이로 읽히지
                            않는다. 색은 뜻을 갖지 않는다 */}
                        <span className={`cm-feed-ico${CHANGE_TINT[i % 3]}`}>
                          <Icon name={i < st.zoneMoved.length ? "ladder" : CHANGE_ICON[i % 3]}
                            size={15} />
                        </span>
                        <p className="cm-feed-txt">{line}</p>
                        <time>{st.recomputed_at}</time>
                      </li>
                    ))}
                    {change.more ? (
                      <li className="is-rest">
                        <span className="cm-feed-ico"><Icon name="log" size={15} /></span>
                        <p className="cm-feed-txt">
                          그 밖에 {change.more}가지가 더 달라졌습니다.
                        </p>
                      </li>
                    ) : null}
                  </ul>
                </>
              ) : null}
              {st.pending > 0 ? (
                <>
                  <p className="cm-shsub">
                    적어 두신 경험이 어느 판단으로 가는지 먼저 보고 더합니다.
                    더해도 검사 당시 결과는 그대로 남습니다.
                  </p>
                  <ul className="cm-feed">
                    <li>
                      <span className="cm-feed-ico"><Icon name="layers" size={15} /></span>
                      <p className="cm-feed-txt">
                        <b>아직 더하지 않은 경험 {st.pending}건</b>
                      </p>
                      <span className="cm-feed-acts">
                        <Link className="cm-btn" href="/me/recompute">새 경험 더하기</Link>
                      </span>
                    </li>
                  </ul>
                </>
              ) : null}
            </>
          ) : null}

          {/* ── 최근 기록 (규격 §8) ── 굳은 결과 하나와 최근 경험 둘까지 */}
          <h2 className="cm-sh">
            <Icon name="clock" size={18} />
            최근 기록
            <Link href="/me/results">모두 보기 →</Link>
          </h2>
          <p className="cm-shsub">최근 검사 결과와 경험을 확인할 수 있습니다.</p>
          <ul className="cm-feed is-rec">
            <li>
              <span className="cm-feed-ico"><Icon name="report" size={15} /></span>
              <p className="cm-feed-txt">
                <b>기계공학 진로진단 결과 ({st.model.tier})</b>
                <small>고정됨 · 그날의 문항과 기준으로 굳어 있습니다</small>
              </p>
              <time>{st.result_at ?? ""}</time>
              <span className="cm-feed-acts">
                <Link className="cm-btn" href={`/v3/${st.model.attempt_id}/result`}>
                  결과 보기
                </Link>
                {/* **`Link` 로 걸지 않는다.** Next 가 화면에 들어온 `Link` 를
                    미리 불러오면서 종이를 한 벌씩 만들어 버린다 */}
                <a className="cm-btn is-quiet" href={`/v3/${st.model.attempt_id}/result/pdf`}>
                  PDF
                </a>
              </span>
            </li>
            {exps.slice(0, HOME_RECENT).map((e) => (
              <li key={e.id}>
                <span className="cm-feed-ico t-4"><Icon name="layers" size={15} /></span>
                <p className="cm-feed-txt">
                  <b>{e.title}</b>
                  <small>{KIND_KO.get(e.kind) ?? "경험"}</small>
                </p>
                <time>{e.started_on ?? e.created_at.slice(0, 10)}</time>
                <span className="cm-feed-acts">
                  <Link className="cm-btn" href="/me/experience">자세히 보기</Link>
                </span>
              </li>
            ))}
            {apps.slice(0, HOME_RECENT).map((a) => (
              <li key={a.id}>
                <span className="cm-feed-ico t-2"><Icon name="send" size={15} /></span>
                <p className="cm-feed-txt">
                  <b>{a.org_name ?? a.role_label ?? "이름 없음"}</b>
                  <small>{APPLY_SAY[a.state]}</small>
                </p>
                <span className="cm-feed-acts">
                  <Link className="cm-btn" href="/me/apply">지원 기록</Link>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </CmShell>
  );
}

/**
 * 쪽 제목. **이름을 넣지 않는다**(§5). 상태마다 이 쪽이 무엇인지가
 * 달라서 제목도 갈린다: 검사 전에는 받을 것의 이름이고, 끝낸 뒤에는
 * 지금 들고 있는 것의 이름이다.
 */
const HEAD: Record<string, string> = {
  NO_ASSESSMENT: "기계공학 진로 검사",
  IN_PROGRESS: "풀던 검사가 있습니다",
  /* 홈의 제목을 `현재 상태` 로 두지 않는다. 그 이름은 띠에 제 줄이 있는
     다른 쪽(`/me/state`)의 이름이고, 홈의 첫 카드가 그쪽의 요약이다 */
  BASIC_DONE: "내 커리어",
  STANDARD_DONE: "내 커리어",
  PRO_DONE: "내 커리어",
  RECOMPUTED: "내 커리어",
};

const LEAD: Record<string, string> = {
  NO_ASSESSMENT: "검사를 한 번 끝내면 여기에 확인된 근거와 아직 부족한 부분과"
    + " 다음 할 일이 섭니다.",
  IN_PROGRESS: "답한 것은 문항마다 저장되어 있어, 마지막으로 멈춘 자리에서"
    + " 그대로 이어집니다.",
  BASIC_DONE: "어느 영역부터 살펴볼지 정하는 데까지 확인했습니다."
    + " 경험을 자세히 묻는 질문은 아직 받지 않았습니다.",
  STANDARD_DONE: "지금 확인된 근거와 아직 부족한 부분입니다. 경험을 하나 더 적으면"
    + " 이 값이 다시 달라집니다.",
  PRO_DONE: "확인된 근거를 산업과 직무의 말로 옮긴 결과까지 있습니다.",
  RECOMPUTED: "새 경험까지 더한 현재 상태이고, 검사 당시 결과는 그대로"
    + " 남아 있습니다.",
};

/** 지원 기록의 상태를 사람의 말로. **영문 코드를 화면에 내지 않는다** */
const APPLY_SAY: Record<string, string> = {
  watching: "보는 중", applied: "지원함", interview: "면접",
  offer: "합격 통보", closed: "마감",
};

/** 변화 줄의 표시. **값을 뜻하지 않는다**: 줄 넷이 한 덩이로 읽히지
 *  않게 하는 자리이고, 차례는 `recentChangeKo` 가 정한 것을 따른다 */
const CHANGE_ICON: IconName[] = ["chart", "spark", "report"];
const CHANGE_TINT = ["", " t-2", " t-3"];

/** 홈이 드는 줄 수. **요약이 세부를 대신하면 세부 쪽이 죽는다** */
const HOME_ROWS = 3;

/**
 * `기록` 묶음이 드는 줄 수(규격 §8).
 *
 * **검사 결과 하나와 최근 경험 하나까지다**(규격 §3). 나머지는
 * `모두 보기` 뒤에 둔다. 둘씩 세우면 홈의 꼬리가 몸통보다 길어지고,
 * 세로 차례가 곧 중요도라는 규칙이 아래에서 뒤집힌다. 4순위 묶음이
 * 1순위 묶음보다 길면 그 차례는 화면에서 지켜지지 않는다.
 */
const HOME_RECENT = 1;

/** 첫 카드에 올리는 묶음. **아직 판단하기 어려운 영역은 올리지 않는다** */
const READY_ZONES: string[] = ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE"];

/**
 * 영역 칸의 아이콘(규격 §6).
 *
 * **값을 뜻하지 않는다.** 열두 영역이 한 줄에 셋씩 설 때 서로 구별되게
 * 하는 표시이고, 영역마다 고정이라 새로고침해도 같은 자리에 같은 그림이
 * 선다. 여기 없는 코드는 기본 모양으로 간다.
 */
const TILE_ICON: Record<string, IconName> = {
  TD01: "gear", TD02: "box", TD03: "globe", TD04: "spark",
  TD05: "window", TD06: "alert", TD07: "chart", TD08: "layers",
  TD09: "building", TD10: "ladder", TD11: "compass", TD12: "log",
};

/** 경험 종류를 사람의 말로. **표의 코드를 화면에 내지 않는다** */
const KIND_KO = new Map(EXPERIENCE_KINDS.map((k) => [k.code as string, k.label]));

void ZONE_TITLE_KO;


