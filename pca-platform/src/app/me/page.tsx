import Link from "next/link";
import { requireUser } from "@/lib/session";
import {
  actionsOf, applicationsOf, currentState, experiencesOf, profileOf, resultHistory,
} from "@/lib/me-v3/platform";
import { domainName, industryChoices, roleName } from "@/lib/me-v3/runtime/session";
import { moveLabel, regionName } from "@/lib/me-v3/region";
import { HORIZON_KO, ZONE_TITLE_KO, gapKo } from "@/lib/me-v3/result/text.ko";
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
  const [st, exps, actions, profile, history, apps] = await Promise.all([
    currentState(user.id), experiencesOf(user.id), actionsOf(user.id),
    profileOf(user.id), resultHistory(user.id), applicationsOf(user.id),
  ]);

  /* **센 것이 화면을 늦추거나 깨지 않는다.** `mark()` 는 던지지 않는다 */
  await mark("workspace_opened", user.id, { stage: st.stage });

  const open = actions.filter((a) => a.state !== "done");
  const first = open[0] ?? null;
  /**
   * **홈은 요약이고 세부 쪽이 전체다.**
   *
   * 전에는 홈이 영역을 묶음마다 셋씩(최대 여섯 줄) 세우고 비어 있는
   * 자리도 셋을 세웠다. 그러면 세부 쪽을 눌러 들어갈 이유가 없어지고,
   * **`현재 상태` 와 `다음 할 일` 이 있어도 아무도 안 연다.** 홈이 드는
   * 것은 상태 셋 · 비어 있는 자리 하나 · 할 일 하나다.
   */
  const gaps = st.gaps.slice(0, 1);
  const moreGaps = Math.max(0, st.gaps.length - gaps.length);
  /* **홈이 요약을 따로 짓지 않는다**(규격 §11). 네 묶음이 전부
     `currentState()` 한 자리에서 오고, `최근 변화` 의 문장은 저장 직후
     화면과 현재 상태가 쓰는 함수를 그대로 부른다 */
  const change = recentChangeKo(st, domainName);
  const indName = new Map(industryChoices().map((x) => [x.code, x.name]));

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
    <CmShell active="/me" title="홈">
      <CmHead
        kicker={`기계공학${st.result_at ? ` · 마지막 분석 ${st.result_at}` : ""}`}
        /* **이름을 제목으로 쓰지 않는다.** 로그인한 사람은 자기 이름을
           이미 알고, 쪽 제목 자리는 `이 쪽이 무엇인가` 를 말하는 자리다.
           이름이 제목이면 쪽마다 같은 글자가 가장 크게 선다 */
        title={HEAD[st.stage]}
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
            {/* **단추는 둘까지다**(규격 §12). 거드는 자리는 경험 추가
                하나이고, 최근 변화는 아래 제 묶음이 링크를 들고 있다 */}
            {st.model ? (
              <Link className="cm-btn" href="/me/experience/new">경험 추가</Link>
            ) : null}
          </>
        }
      />

      {/* ── A. 검사 전 ── 받는 것 셋만 세운다. 빈 카드를 쌓지 않는다 ── */}
      {st.stage === "NO_ASSESSMENT" ? (
        <>
          <div className="cm-grid">
            {[
              ["무엇을 해 봤는지", "전체 기술영역에서 해 본 일을 하나씩 묻습니다"],
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
          **세로 차례가 곧 중요도다**(규격 §12): 현재 상태 → 지금 할 일 →
          최근 변화 → 기록. 전에는 앞의 셋이 같은 크기의 카드로 가로에
          나란히 서서 **무엇을 먼저 읽는지가 화면에 없었다.** 셋이 같은
          무게면 읽는 사람이 매번 셋을 다 읽고 고른다.

          **빈 카드를 세우지 않는다**: 자료가 없는 묶음은 아예 그리지
          않는다. 점선 테두리에 `아직 없습니다` 를 적은 칸이 넷까지 서면
          읽는 사람은 자기 결과가 덜 만들어진 줄 안다. */}
      {st.model ? (
        <>
          {/* 1. 현재 상태 — **한 판에 세 줄** */}
          <h2 className="cm-sect">현재 상태</h2>
          <div className="cm-panel">
            <div className="cm-pane">
              {READY_ZONES.map((z, zi) => {
                const used = READY_ZONES.slice(0, zi).reduce((n, pz) =>
                  n + Object.values(st.zoneOf).filter((v) => v === pz).length, 0);
                const room = Math.max(0, HOME_ROWS - used);
                const list = Object.entries(st.zoneOf)
                  .filter(([, v]) => v === z).map(([d]) => d).slice(0, room);
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
              <div className="cm-acts">
                <Link className="cm-btn" href="/me/state">전체 기술영역 보기</Link>
              </div>
            </div>

            {/* 먼저 채워볼 부분은 **현재 상태의 일부다**: 지금 어떤 상태인가에
                비어 있는 자리가 들어가야 그 둘이 같은 곳을 가리킨다 */}
            {gaps.length ? (
              <div className="cm-pane">
                <h3>먼저 채워볼 부분{moreGaps ? <em>그 밖에 {moreGaps}가지</em> : null}</h3>
                <div className="cm-rows">
                  {gaps.map((g) => (
                    <p className="cm-row" key={g.id}>
                      <b>{gapKo(g, domainName(g.domain)).title}</b>
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* 2. 지금 할 일 — **문장 하나다**(규격 §12).
              `할 일 가져오기` 같은 시스템 문구를 쓰지 않는다: 읽는 사람이
              할 일은 그 문장을 하는 것이지 무엇을 가져오는 것이 아니다 */}
          <h2 className="cm-sect">지금 할 일</h2>
          <div className="cm-panel">
            <div className="cm-pane">
              {first ? (
                <>
                  <p>{first.body}</p>
                  <p className="cm-none">
                    {HORIZON_KO[lane(first.horizon)]}
                    {open.length > 1 ? ` · 그 밖에 ${open.length - 1}가지` : ""}
                  </p>
                </>
              ) : (
                <p>
                  아직 정해 둔 할 일이 없습니다. 결과에서 하나를 고르면 여기에
                  섭니다.
                </p>
              )}
              <div className="cm-acts">
                <Link className="cm-btn" href="/me/next">지금 할 일 보기</Link>
              </div>
            </div>
          </div>

          {/* 3. 최근 변화 — **반영한 적이 있을 때만 선다.** 그래프를
              그리지 않는다. 반영했는데 올라간 자리가 없는 것도 자료라서
              그때는 그 사실을 적는다 */}
          {st.stage === "RECOMPUTED" || st.pending > 0 ? (
            <>
              <h2 className="cm-sect">최근 변화</h2>
              <div className="cm-panel">
                {st.stage === "RECOMPUTED" ? (
                  <div className="cm-pane">
                    <h3>달라진 점 <em>{st.recomputed_at} 반영</em></h3>
                    {/* **`경험이 추가되었습니다` 로 적지 않는다**(규격 §12).
                        그 사실은 적은 사람이 이미 안다. 알고 싶은 것은 그
                        경험이 현재 상태의 무엇을 움직였는가이고, 움직인 것이
                        없으면 그 사실이다. 문장을 여기서 짓지 않고 세 화면이
                        같이 쓰는 `change-text.ko.ts` 가 든다: 홈과 저장 직후와
                        현재 상태가 따로 적으면 같은 변화가 다른 말로 읽힌다 */}
                    <div className="cm-rows">
                      {change.lines.map((line) => (
                        <p className="cm-row" key={line}><b>{line}</b></p>
                      ))}
                    </div>
                    {change.more ? (
                      <p className="cm-none">그 밖에 {change.more}가지가 더 달라졌습니다.</p>
                    ) : null}
                    <div className="cm-acts">
                      <Link className="cm-btn" href="/me/state">달라진 점 보기</Link>
                    </div>
                  </div>
                ) : null}
                {st.pending > 0 ? (
                  <div className="cm-pane">
                    <h3>아직 반영하지 않은 경험 <em>{st.pending}건</em></h3>
                    <p>
                      적어 두신 경험이 어느 판단으로 가는지 먼저 보고 반영합니다.
                      반영해도 검사 당시 결과는 그대로 남습니다.
                    </p>
                    <div className="cm-acts">
                      <Link className="cm-btn" href="/me/recompute">새 경험 반영하기</Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {/* ── 4. 기록 ── **카드를 넷 더 쌓지 않는다**: 같은 무게의 흰
              상자가 일곱이면 홈에서 무엇이 먼저인지가 사라진다. 한 판 안에
              줄로 세우고 선으로 가른다(규격 §31) */}
          <h2 className="cm-sect">기록</h2>
          <div className="cm-panel">
            {/* 검사 당시 결과 — 굳은 기록 */}
            <div className="cm-pane">
              <h3>검사 당시 결과 <em>고정됨</em></h3>
              <div className="cm-rows">
                <p className="cm-row">
                  <b>{st.result_at ?? ""}</b>
                  <span>{st.model.tier} · 기계공학</span>
                </p>
              </div>
              <p className="cm-none">
                응시하신 그날의 문항과 기준으로 굳어 있습니다. 경험을 더해도
                이 줄은 달라지지 않습니다.
              </p>
              <div className="cm-acts">
                <Link className="cm-btn" href={`/v3/${st.model.attempt_id}/result`}>
                  결과 보기
                </Link>
                {history.length > 1 ? (
                  <Link className="cm-btn" href="/me/results">결과 기록 전체</Link>
                ) : null}
              </div>
            </div>

            {/* **줄을 둘까지 세운다**(규격 §8). 홈의 `기록` 은 최근 것이
                있다는 것과 어디서 다 볼 수 있는지까지다. 셋씩 세우면 이
                묶음이 아래에서 가장 긴 덩이가 되고, 홈의 세로 차례(현재
                상태 → 지금 할 일 → 최근 변화 → 기록)에서 꼬리가 몸통보다
                커진다 */}
            {exps.length ? (
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
                <div className="cm-acts">
                  <Link className="cm-btn" href="/me/experience">
                    {exps.length > HOME_RECENT ? "경험 모두 보기" : "경험 전체 보기"}
                  </Link>
                </div>
              </div>
            ) : null}

            {/* 지원 기록. **고른 것만 적는다**: 한 건도 없으면 이 칸을
                세우지 않는다(규격 §12·§19) */}
            {apps.length ? (
              <div className="cm-pane">
                <h3>지원 기록<em>{apps.length}곳</em></h3>
                <div className="cm-rows">
                  {apps.slice(0, HOME_RECENT).map((a) => (
                    <p className="cm-row" key={a.id}>
                      <b>{a.org_name ?? a.role_label ?? "이름 없음"}</b>
                      <span>{APPLY_SAY[a.state]}</span>
                    </p>
                  ))}
                </div>
                <div className="cm-acts">
                  <Link className="cm-btn" href="/me/apply">
                    {apps.length > HOME_RECENT ? "지원 기록 모두 보기" : "지원 기록 보기"}
                  </Link>
                </div>
              </div>
            ) : null}

            {/* **`관심 산업과 직무` 칸을 홈에서 걷었다**(규격 §8).
                홈의 첫 화면에 서는 것은 넷이다: 현재 상태 · 지금 할 한
                가지 · 최근 변화 · 최근 기록. 고르신 산업과 직무는 그 넷의
                어느 것도 아니고 **바꾸는 자리가 왼쪽 띠의 `산업·직무` 와
                `지역·기관`** 이라, 홈에 두면 바꿀 수 없는 칸이 하나 늘고
                넷의 차례가 다섯으로 읽힌다. 값은 그 두 쪽에 그대로 있다 */}
          </div>
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
  NO_ASSESSMENT: "검사를 한 번 끝내면 이 자리에 확인된 근거와 비어 있는 자리와"
    + " 다음 할 일이 섭니다.",
  IN_PROGRESS: "답한 것은 문항마다 저장되어 있어, 마지막으로 멈춘 자리에서"
    + " 그대로 이어집니다.",
  BASIC_DONE: "어느 영역부터 살펴볼지 정하는 데까지 확인했습니다."
    + " 경험을 자세히 묻는 질문은 아직 받지 않았습니다.",
  STANDARD_DONE: "지금 확인된 근거와 비어 있는 자리입니다. 경험을 하나 더 적으면"
    + " 이 값이 다시 달라집니다.",
  PRO_DONE: "확인된 근거를 산업과 직무의 말로 옮긴 결과까지 있습니다.",
  RECOMPUTED: "새 경험까지 반영한 현재 상태이고, 검사 당시 결과는 그대로"
    + " 남아 있습니다.",
};

/** 지원 기록의 상태를 사람의 말로. **영문 코드를 화면에 내지 않는다** */
const APPLY_SAY: Record<string, string> = {
  watching: "보는 중", applied: "지원함", interview: "면접",
  offer: "합격 통보", closed: "마감",
};

/** 홈이 드는 줄 수. **요약이 세부를 대신하면 세부 쪽이 죽는다** */
const HOME_ROWS = 3;

/**
 * `기록` 묶음이 드는 줄 수(규격 §8).
 *
 * 하나나 둘까지이고 나머지는 `모두 보기` 뒤에 둔다. 셋씩 세우면 홈의
 * 꼬리가 몸통보다 길어지고, 세로 차례가 곧 중요도라는 규칙이 아래에서
 * 뒤집힌다.
 */
const HOME_RECENT = 2;

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
