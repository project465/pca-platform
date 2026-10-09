import Link from "next/link";
import { requireUser } from "@/lib/session";
import {
  actionsOf, currentState, experiencesOf, profileOf, resultHistory,
} from "@/lib/me-v3/platform";
import { domainName, industryChoices, roleName } from "@/lib/me-v3/runtime/session";
import { moveLabel, regionName } from "@/lib/me-v3/region";
import { AXIS_KO, HORIZON_KO, ZONE_TITLE_KO, gapKo } from "@/lib/me-v3/result/text.ko";
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
  const [st, exps, actions, profile, history] = await Promise.all([
    currentState(user.id), experiencesOf(user.id), actionsOf(user.id),
    profileOf(user.id), resultHistory(user.id),
  ]);

  /* **센 것이 화면을 늦추거나 깨지 않는다.** `mark()` 는 던지지 않는다 */
  await mark("workspace_opened", user.id, { stage: st.stage });

  const name = user.name?.trim() || "반갑습니다";
  const open = actions.filter((a) => a.state !== "done");
  const first = open[0] ?? null;
  const gaps = st.gaps.slice(0, 3);
  const indName = new Map(industryChoices().map((x) => [x.code, x.name]));

  /* 어느 자리에서든 **주된 단추가 하나다** */
  const cta = {
    NO_ASSESSMENT: { href: "/cores", label: "기계공학 검사 시작" },
    IN_PROGRESS: { href: st.open ? `/v3/${st.open.id}` : "/cores", label: "검사 이어하기" },
    BASIC_DONE: { href: "/me/state", label: "먼저 볼 영역 보기" },
    STANDARD_DONE: { href: "/me/state", label: "지금 상태 보기" },
    PRO_DONE: { href: "/me/state", label: "산업과 직무 언어로 보기" },
    RECOMPUTED: { href: "/me/results", label: "무엇이 달라졌는지 보기" },
  }[st.stage];

  return (
    <CmShell active="/me" title="홈">
      <CmHead
        kicker={`기계공학${st.result_at ? ` · 마지막 분석 ${st.result_at}` : ""}`}
        title={`${name}님의 CareerMatri`}
        lead={LEAD[st.stage]}
        actions={
          <>
            {st.stage === "IN_PROGRESS" ? (
              /* 이어하기만 폼이다. 누른 것을 세려면 누르는 자리에서 센다 */
              <form action={continueAssessment}>
                <button className="cm-btn is-primary" type="submit">{cta.label}</button>
              </form>
            ) : (
              <Link className="cm-btn is-primary" href={cta.href}>{cta.label}</Link>
            )}
            {st.model ? (
              <Link className="cm-btn" href="/me/experience/new">새 경험 추가</Link>
            ) : null}
          </>
        }
      />

      {/* ── A. 검사 전 ── 받는 것 셋만 세운다. 빈 카드를 쌓지 않는다 ── */}
      {st.stage === "NO_ASSESSMENT" ? (
        <>
          <div className="cm-grid">
            {[
              ["무엇을 해 봤는지", "열두 기술영역에서 해 본 일을 하나씩 묻습니다"],
              ["무엇을 직접 정했는지", "받아서 한 일과 직접 정한 일을 가릅니다"],
              ["다음에 무엇을 할지", "비어 있는 자리와 그것을 메우는 일을 적습니다"],
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

      {/* ── B. 진행 중 ── 이어하기 하나만 ── */}
      {st.stage === "IN_PROGRESS" ? (
        <div className="cm-card is-wide">
          <h2>풀던 검사가 있습니다 <em>{st.open?.tier}</em></h2>
          <p>
            마지막으로 답한 자리에서 이어집니다. 답한 것은 서버에 저장되어
            있어 다른 기기에서도 그 자리로 돌아옵니다.
          </p>
          <div className="cm-acts">
            <form action={continueAssessment}>
              <button className="cm-btn is-primary" type="submit">이어하기</button>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── C~F. 결과가 있는 사람 ── */}
      {st.model ? (
        <div className="cm-grid">
          {/* 1. 지금 확인된 것 */}
          <div className="cm-card">
            <h2>지금 확인된 것</h2>
            {READY_ZONES.map((z) => {
              const list = Object.entries(st.zoneOf)
                .filter(([, v]) => v === z).map(([d]) => d).slice(0, 3);
              if (!list.length) return null;
              return (
                <div className="cm-rows" key={z}>
                  {list.map((d) => (
                    <p className="cm-row" key={d}>
                      <b>{domainName(d)}</b>
                      <span>{ZONE_SAY[z]}</span>
                    </p>
                  ))}
                </div>
              );
            })}
            {Object.values(st.zoneOf).every((z) => !READY_ZONES.includes(z)) ? (
              <p>
                아직 근거가 선 영역이 잡히지 않았습니다. 관심이 높은 영역에서
                짧게 한 번 해 보는 것이 다음 걸음입니다.
              </p>
            ) : null}
            <div className="cm-grow" />
            <div className="cm-acts">
              <Link className="cm-btn" href="/me/state">지금 상태 보기</Link>
            </div>
          </div>

          {/* 2. 지금 가장 먼저 할 것 — 하나만 */}
          <div className="cm-card">
            <h2>지금 가장 먼저 할 것</h2>
            {first ? (
              <>
                <p>{first.body}</p>
                <p style={{ fontSize: 13, color: "var(--sf-ink-3)" }}>
                  {HORIZON_KO[lane(first.horizon)]}
                  {open.length > 1 ? ` · 그 밖에 ${open.length - 1}가지` : ""}
                </p>
              </>
            ) : (
              <p>
                결과에서 할 일을 가져오면 여기에 섭니다. 직접 적을 수도
                있습니다.
              </p>
            )}
            <div className="cm-grow" />
            <div className="cm-acts">
              <Link className="cm-btn" href="/me/next">
                {first ? "이 행동 자세히 보기" : "할 일 가져오기"}
              </Link>
            </div>
          </div>

          {/* 3. 현재 채울 부분 — 전부가 아니라 급한 셋 */}
          <div className="cm-card">
            <h2>현재 채울 부분 <em>급한 셋</em></h2>
            {gaps.length ? (
              <div className="cm-rows">
                {gaps.map((g) => (
                  <p className="cm-row" key={g.id}>
                    <b>{gapKo(g, domainName(g.domain)).title}</b>
                  </p>
                ))}
              </div>
            ) : (
              <p>
                지금 비어 있는 자리가 잡히지 않았습니다. 남은 일은 가진 근거를
                지원서에서 설명할 문장으로 만드는 것입니다.
              </p>
            )}
            <div className="cm-grow" />
            <div className="cm-acts">
              <Link className="cm-btn" href="/me/state#gaps">왜 필요한지 보기</Link>
            </div>
          </div>

          {/* 4. 최근 경험 */}
          <div className="cm-card">
            <h2>최근 경험 <em>{exps.length}개</em></h2>
            {exps.length ? (
              <div className="cm-rows">
                {exps.slice(0, 3).map((e) => (
                  <p className="cm-row" key={e.id}>
                    <b>{e.title}</b>
                    <span className="cm-when">{e.created_at.slice(0, 10)}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p>
                아직 추가한 경험이 없습니다. 새로 한 프로젝트나 연구나 인턴을
                적으면 지금 상태를 다시 볼 수 있습니다.
              </p>
            )}
            <div className="cm-grow" />
            <div className="cm-acts">
              <Link className="cm-btn is-primary" href="/me/experience/new">
                {exps.length ? "경험 추가하기" : "첫 경험 추가"}
              </Link>
              {exps.length ? (
                <Link className="cm-btn" href="/me/experience">모두 보기</Link>
              ) : null}
            </div>
          </div>

          {/* 5. 최근 결과 — 굳은 기록 */}
          <div className="cm-card">
            <h2>최근 결과 <em>검사 당시 기록</em></h2>
            <div className="cm-rows">
              <p className="cm-row">
                <b>{st.result_at ?? ""}</b>
                <span>{st.model.tier} · 기계공학</span>
              </p>
            </div>
            <p style={{ fontSize: 13, color: "var(--sf-ink-3)" }}>
              응시하신 그날의 문항과 기준으로 굳어 있습니다. 경험을 더해도
              이 줄은 달라지지 않습니다.
            </p>
            <div className="cm-grow" />
            <div className="cm-acts">
              <Link className="cm-btn" href={`/v3/${st.model.attempt_id}/result`}>
                검사 당시 결과 보기
              </Link>
              {history.length > 2 ? (
                <Link className="cm-btn" href="/me/results">결과 기록</Link>
              ) : null}
            </div>
          </div>

          {/* 6. 변화 — 반영한 적이 있을 때만. 그래프를 그리지 않는다 */}
          {st.stage === "RECOMPUTED" ? (
            <div className="cm-card">
              <h2>무엇이 달라졌는지 <em>{st.recomputed_at} 기준</em></h2>
              <div className="cm-rows">
                <p className="cm-row">
                  <b>올라간 판단</b>
                  <span>
                    {st.raised.length
                      ? st.raised.slice(0, 2)
                        .map((r) => `${domainName(r.domain)} · ${AXIS_KO[r.axis]}`)
                        .join(" / ")
                      : "아직 없습니다"}
                    {st.raised.length > 2 ? ` 외 ${st.raised.length - 2}` : ""}
                  </span>
                </p>
                <p className="cm-row">
                  <b>묶음이 달라진 영역</b>
                  <span>
                    {st.zoneMoved.length
                      ? st.zoneMoved.map((z) => domainName(z.domain)).join(" · ")
                      : "그대로입니다"}
                  </span>
                </p>
              </div>
              <div className="cm-grow" />
              <div className="cm-acts">
                <Link className="cm-btn" href="/me/recompute">반영한 내용 보기</Link>
              </div>
            </div>
          ) : st.pending > 0 ? (
            <div className="cm-card">
              <h2>반영할 거리가 쌓였습니다 <em>{st.pending}건</em></h2>
              <p>
                적어 두신 경험이 어느 판단으로 가는지 먼저 보고 반영합니다.
                반영해도 검사 당시 결과는 그대로 남습니다.
              </p>
              <div className="cm-grow" />
              <div className="cm-acts">
                <Link className="cm-btn is-primary" href="/me/recompute">
                  새 경험 반영하기
                </Link>
              </div>
            </div>
          ) : null}

          {/* 보고 있는 자리. 고른 것만 적는다 */}
          {(profile?.target_industry?.length ?? 0) > 0
            || (profile?.target_role?.length ?? 0) > 0 || profile?.home_region ? (
            <div className="cm-card">
              <h2>보고 있는 자리</h2>
              <div className="cm-rows">
                {profile?.target_industry?.length ? (
                  <p className="cm-row"><b>산업</b>
                    <span>{profile.target_industry
                      .map((c) => indName.get(c) ?? c).join(" · ")}</span></p>
                ) : null}
                {profile?.target_role?.length ? (
                  <p className="cm-row"><b>직무</b>
                    <span>{profile.target_role.map((c) => roleName(c)).join(" · ")}</span></p>
                ) : null}
                {profile?.home_region ? (
                  <p className="cm-row"><b>지역</b>
                    <span>
                      {regionName(profile.home_region)}
                      {profile.move_range ? ` · ${moveLabel(profile.move_range)}` : ""}
                    </span></p>
                ) : null}
              </div>
              <div className="cm-grow" />
              <div className="cm-acts">
                <Link className="cm-btn" href="/me/explore">산업과 직무</Link>
                <Link className="cm-btn" href="/me/region">지역과 기관</Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </CmShell>
  );
}

const LEAD: Record<string, string> = {
  NO_ASSESSMENT: "검사를 한 번 끝내면 이 자리에 확인된 근거와 비어 있는 자리와"
    + " 다음 할 일이 섭니다.",
  IN_PROGRESS: "답한 것은 문항마다 저장되어 있어, 마지막으로 멈춘 자리에서"
    + " 그대로 이어집니다.",
  BASIC_DONE: "어느 영역부터 살펴볼지 정하는 데까지 확인했습니다."
    + " 경험을 자세히 묻는 질문은 아직 받지 않았습니다.",
  STANDARD_DONE: "지금 확인된 근거와 비어 있는 자리입니다. 경험을 하나 더 적으면"
    + " 이 값이 다시 달라집니다.",
  PRO_DONE: "확인된 근거를 산업과 직무의 말로 옮긴 결과까지 있습니다.",
  RECOMPUTED: "새 경험까지 반영한 지금 상태이고, 검사 당시 결과는 그대로"
    + " 남아 있습니다.",
};

/** 첫 카드에 올리는 묶음. **아직 판단하기 어려운 영역은 올리지 않는다** */
const READY_ZONES: string[] = ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE"];
const ZONE_SAY: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "설명할 수 있는 경험이 있습니다",
  Z2_EVIDENCE_INCOMPLETE: "경험은 있고 근거를 더 붙일 자리가 있습니다",
};
void ZONE_TITLE_KO;

/** 날수를 마감으로 읽지 않게 **할 수 있는 때**로 묶는다 */
const lane = (days: number): "NOW" | "NEXT" | "LATER" =>
  (days <= 30 ? "NOW" : days <= 90 ? "NEXT" : "LATER");
