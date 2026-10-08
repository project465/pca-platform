import Link from "next/link";
import { requireUser } from "@/lib/session";
import {
  actionsOf, experiencesOf, latestResult, pendingRecompute, postingCount,
  profileOf, recentOf, savedJobCount, trackInterest,
} from "@/lib/me-v3/platform";
import { currentAttempt, domainName, industryChoices, roleName } from "@/lib/me-v3/runtime/session";
import { moveLabel, regionName } from "@/lib/me-v3/region";
import { gapShortKo } from "@/lib/me-v3/result/text.ko";
import { CmShell, CmHead } from "./shell";

/**
 * 할 일 세 층. **날수를 그대로 보여 주지 않는다.**
 *
 * `30일 안` 은 읽는 사람에게 마감으로 읽히는데, 이 값은 마감이 아니라
 * **할 수 있는 때**다. 지금 바로 할 수 있는 것과 다음 과제를 기다려야 하는
 * 것은 준비가 다르다.
 */
const LANES = [
  ["NOW", "지금 할 것", "오늘 앉아서 시작할 수 있습니다"],
  ["NEXT", "다음 과제에서", "맡는 일이 생겨야 합니다"],
  ["LATER", "나중에 볼 것", "앞의 둘이 끝난 뒤입니다"],
] as const;
const lane = (days: number) => (days <= 30 ? "NOW" : days <= 90 ? "NEXT" : "LATER");

export const metadata = { title: "내 CareerMatri" };

/** 언제였는지를 사람 말로. **빈 자리를 `-` 로 두지 않는다** */
function when(at: string | null): string {
  if (!at) return "아직 없습니다";
  const d = new Date(at);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 30) return `${days}일 전`;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

/**
 * 내 CareerMatri.
 *
 * **이 쪽이 있는 까닭.** 검사를 끝낸 사람이 다시 들어올 이유가 있어야
 * 커리어 관리 플랫폼이다. 결과지만 두면 PDF 를 받은 날 끝난다. 여기는
 * 지금 방향과 확인된 근거와 비어 있는 자리와 다음 행동을 한 쪽에 둔다.
 *
 * **지금 값을 읽는다.** 그때 낸 결과지는 `v3_snapshots` 에 굳어 있고 이
 * 쪽은 `career_profiles` 와 경험 표를 읽는다. 한 표에 담으면 갱신이
 * 스냅샷을 덮는다.
 */
export default async function MyCareerMatri() {
  const user = await requireUser();
  const [profile, recent, result, exps, actions, saved, postings, track, pending, open] =
    await Promise.all([
      profileOf(user.id), recentOf(user.id), latestResult(user.id),
      experiencesOf(user.id), actionsOf(user.id), savedJobCount(user.id),
      postingCount(), trackInterest(user.id), pendingRecompute(user.id),
      currentAttempt(user.id),
    ]);

  const indName = new Map(industryChoices().map((x) => [x.code, x.name]));
  const industries = (profile?.target_industry ?? []).map((c) => indName.get(c) ?? c);
  const roles = (profile?.target_role ?? []).map((c) => roleName(c));
  const region = regionName(profile?.home_region ?? null);
  const move = moveLabel(profile?.move_range ?? null);

  const confirmed = result?.overview.counts.confirmed_axes ?? 0;
  const owned = result?.overview.counts.owned_axes ?? 0;
  const evidenceN = result?.overview.counts.evidence_items ?? 0;
  const domainsN = result?.overview.counts.domains ?? 0;
  const ready = result?.evidence.ready ?? [];
  const readyDomains = [...new Set(ready.map((g) => g.domain))];
  const gaps = (result?.gaps ?? []).slice(0, 3);
  const openActions = actions.filter((a) => a.state !== "done").slice(0, 9);

  /* 결과를 아직 만들지 않은 사람에게 빈 카드를 줄줄이 세우지 않는다 */
  const hasResult = !!result;

  return (
    <CmShell active="/me" title="내 CareerMatri">
      <CmHead
        kicker="지금 상태"
        title={hasResult ? "내 CareerMatri" : "아직 만들어진 결과가 없습니다"}
        lead={hasResult
          ? "검사에서 확인된 근거와 비어 있는 자리, 그리고 이번 달에 할 일입니다."
          : "검사를 한 번 끝내면 이 자리에 방향과 근거와 Gap이 섭니다."}
        actions={
          <>
            {open ? (
              <Link className="cm-btn is-primary" href={`/v3/${open.id}`}>검사 이어하기</Link>
            ) : hasResult ? (
              <Link className="cm-btn is-primary"
                href={`/v3/${result.attempt_id}/result`}>결과 보기</Link>
            ) : (
              <Link className="cm-btn is-primary" href="/cores">검사 시작하기</Link>
            )}
            <Link className="cm-btn" href="/me/experience/new">새 경험 추가</Link>
          </>
        }
      />

      <div className="cm-grid">
        {/* ── 현재 방향 ── */}
        <div className="cm-card">
          <h2>현재 방향</h2>
          {industries.length || roles.length || region ? (
            <div className="cm-rows">
              <p className="cm-row"><b>관심 산업</b>
                <span>{industries.length ? industries.join(" · ") : "아직 고르지 않았습니다"}</span></p>
              <p className="cm-row"><b>관심 직무</b>
                <span>{roles.length ? roles.join(" · ") : "아직 고르지 않았습니다"}</span></p>
              <p className="cm-row"><b>지역</b>
                <span>{region ? `${region}${move ? ` · ${move}` : ""}` : "아직 고르지 않았습니다"}</span></p>
            </div>
          ) : (
            <p>검사에서 고른 산업과 직무가 여기로 옮겨 옵니다. 언제든 바꿀 수 있습니다.</p>
          )}
          <div className="cm-grow" />
          <div className="cm-acts">
            <Link className="cm-btn" href="/me/explore">산업과 직무 다시 보기</Link>
            <Link className="cm-btn" href="/me/region">지역 고르기</Link>
          </div>
        </div>

        {/* ── 기술 Evidence ── */}
        <div className="cm-card">
          <h2>기술 Evidence <em>검사에서 확인된 근거</em></h2>
          {hasResult ? (
            <>
              <p className="cm-num">{confirmed}<small>개 판단축이 확인됐습니다</small></p>
              <div className="cm-rows">
                <p className="cm-row"><b>근거가 선 기술영역</b>
                  <span>{readyDomains.length}개 / 살펴본 {domainsN}개</span></p>
                <p className="cm-row"><b>직접 정한 것으로 선 축</b><span>{owned}개</span></p>
                <p className="cm-row"><b>고른 근거</b><span>{evidenceN}개</span></p>
              </div>
              {/* **영역으로 묶는다.** 근거는 (영역 · 축)마다 한 줄이라
                  그대로 깔면 같은 영역 이름이 넷 선다 */}
              {readyDomains.length ? (
                <div className="cm-chips">
                  {readyDomains.slice(0, 4).map((d) => (
                    <span className="cm-chip is-on" key={d}>{domainName(d)}</span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p>검사를 끝내면 어느 판단축이 확인됐는지 여기 섭니다.</p>
          )}
          <div className="cm-grow" />
          <div className="cm-acts">
            <Link className={`cm-btn${hasResult ? "" : " is-off"}`}
              href={hasResult ? `/v3/${result.attempt_id}/result#evidence` : "/cores"}>
              내 Evidence 보기
            </Link>
          </div>
        </div>

        {/* ── Gap ──
            **영역 이름만 적지 않는다.** `구조·내구 해석` 세 칸은 무엇이
            비었는지를 말하지 않는다. 가장 급한 셋을 문장으로 적는다 */}
        <div className="cm-card">
          <h2>먼저 채울 것 <em>가장 급한 셋</em></h2>
          {gaps.length ? (
            <div className="cm-rows">
              {gaps.map((g, i) => (
                <p className="cm-row" key={g.id}>
                  <b>{i + 1}</b>
                  <span>{gapShortKo(g, domainName(g.domain))}</span>
                </p>
              ))}
            </div>
          ) : hasResult ? (
            <p>지금 비어 있는 자리가 잡히지 않았습니다. 남은 일은 가진 근거를 설명할 문장으로 만드는 것입니다.</p>
          ) : (
            <p>검사를 끝내면 무엇이 비어 있고 왜 그 자리가 필요한지 적힙니다.</p>
          )}
          <div className="cm-grow" />
          <div className="cm-acts">
            <Link className={`cm-btn${hasResult ? "" : " is-off"}`}
              href={hasResult ? "/me/gap" : "/cores"}>Gap 관리</Link>
          </div>
        </div>

        {/* ── 다음 행동 ──
            **한 줄로 늘어놓지 않는다.** 지금 할 수 있는 것과 다음 과제에서
            할 것과 나중에 볼 것은 준비가 다르다. 한 묶음으로 두면 읽는
            사람이 전부 오늘 해야 하는 줄 안다 */}
        <div className="cm-card is-wide">
          <h2>다음에 할 일 <em>{actions.filter((a) => a.state !== "done").length}개</em></h2>
          {openActions.length ? (
            <div className="cm-lanes">
              {LANES.map(([key, title, hint]) => {
                const mine = openActions.filter((a) => lane(a.horizon) === key);
                return (
                  <section key={key}>
                    <h3>{title}<small>{hint}</small></h3>
                    {mine.length ? (
                      <ul>{mine.map((a) => <li key={a.id}>{a.body}</li>)}</ul>
                    ) : <p className="cm-none">여기에 올 일은 아직 없습니다</p>}
                  </section>
                );
              })}
            </div>
          ) : (
            <p>
              결과에서 할 일을 가져오면 여기에 섭니다. 직접 적을 수도 있습니다.
            </p>
          )}
          <div className="cm-grow" />
          <div className="cm-acts">
            <Link className="cm-btn" href="/me/gap">할 일 관리</Link>
          </div>
        </div>

        {/* ── 최근 움직임 ── */}
        <div className="cm-card">
          <h2>최근 움직임</h2>
          <div className="cm-rows">
            <p className="cm-row"><b>마지막 검사</b>
              <span className="cm-when">{when(recent.last_attempt_at)}</span></p>
            <p className="cm-row"><b>경험 추가</b>
              <span className="cm-when">{when(recent.last_experience_at)}</span></p>
            <p className="cm-row"><b>재분석</b>
              <span className="cm-when">{when(recent.last_recomputed_at)}</span></p>
          </div>
          {pending > 0 ? (
            <p style={{ fontSize: 13, color: "var(--sf-part)" }}>
              다시 계산할 일이 {pending}건 쌓여 있습니다.
            </p>
          ) : null}
          <div className="cm-grow" />
          <div className="cm-acts">
            <Link className="cm-btn" href="/me/recompute">재분석 보기</Link>
          </div>
        </div>

        {/* ── 경험 ── */}
        <div className="cm-card">
          <h2>내가 적은 경험 <em>{exps.length}개</em></h2>
          {exps.length ? (
            <div className="cm-rows">
              {exps.slice(0, 3).map((e) => (
                <p className="cm-row" key={e.id}>
                  <b>{e.title}</b>
                  <span className="cm-when">{when(e.created_at)}</span>
                </p>
              ))}
            </div>
          ) : (
            <p>
              수업과 캡스톤과 연구와 인턴에서 직접 정한 것을 적어 두면 다음
              재분석에 들어갑니다.
            </p>
          )}
          <div className="cm-grow" />
          <div className="cm-acts">
            <Link className="cm-btn is-primary" href="/me/experience/new">새 경험 추가</Link>
            <Link className="cm-btn" href="/me/experience">모두 보기</Link>
          </div>
        </div>

        {/* ── 저장한 공고 ── */}
        <div className="cm-card">
          <h2>저장한 공고 <em>{saved}개</em></h2>
          <p>
            {postings === 0
              ? "공고 자료를 아직 모으지 않았습니다. 저작권과 이용약관을 먼저 따집니다."
              : `견줄 수 있는 공고가 ${postings}건 있습니다.`}
          </p>
          <div className="cm-grow" />
          <div className="cm-acts">
            <Link className="cm-btn" href="/me/jobs">공고 비교</Link>
          </div>
        </div>

        {/* ── Track ── */}
        <div className="cm-card">
          <h2>CareerMatri Track <em>구독 전</em></h2>
          <p>
            내 상황이 바뀔 때 다시 계산해 주는 자리입니다. 산업팩을 더 여는
            상품이 아닙니다.
          </p>
          {track.length ? (
            <p style={{ fontSize: 13, color: "var(--sf-ink-3)" }}>
              {track.length}개 기능에 알림을 걸어 두셨습니다.
            </p>
          ) : null}
          <div className="cm-grow" />
          <div className="cm-acts">
            <Link className="cm-btn" href="/me/track">무엇을 하는지 보기</Link>
          </div>
        </div>
      </div>
    </CmShell>
  );
}
