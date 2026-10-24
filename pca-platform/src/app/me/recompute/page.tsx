import Link from "next/link";
import { currentUser, requireUser } from "@/lib/session";
import { wsLang } from "@/lib/me-v3/ws-lang";
import { wsSay, type WsSay } from "@/lib/me-v3/ws-say";
import { activeMajorName } from "@/lib/me-v3/major-name";
import {
  previewRecompute, recomputeStatus, type Candidate,
} from "@/lib/me-v3/recompute";
import { axisLabel, domainName, majorNameIn } from "@/lib/me-v3/runtime/session";
import {
  experiencesOf, kindLabel, latestResult, activeCoreOrPick,
} from "@/lib/me-v3/platform";
import { textFor } from "@/lib/me-v3/result/text";
import {
  noChangeText, noChangeWhy, raisedKo, zoneMovedKo,
} from "@/lib/me-v3/change-text.ko";
import { CmShell, CmHead } from "../shell";
import { contentLang } from "../experience/compose";
import ApplyButton from "./apply";
import { runRecompute } from "./actions";

export async function generateMetadata() {
  const u = await currentUser().catch(() => null);
  const t = wsSay(u ? await wsLang(u.id) : "ko");
  return { title: t("저장한 경험 · 내 CareerMatri") };
}

const stateSay = (t: WsSay): Record<string, string> => ({
  NOT_OBSERVED: t("아직 없음"),
  PARTICIPATED: t("받아서 수행"),
  CONFIRMED: t("직접 수행"),
  OWNED: t("직접 결정"),
});

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2025-03-01` → `2025년 3월`(영어는 `Mar 2025`). 날은 받지 않으므로 적지 않는다 */
function monthKo(d: string | null, lang = "ko"): string {
  const m = /^(\d{4})-(\d{2})/.exec(d ?? "");
  if (!m) return "";
  return lang === "en" ? `${MONTHS_EN[Number(m[2]) - 1]} ${m[1]}` : `${m[1]}년 ${Number(m[2])}월`;
}

/**
 * 저장한 경험이 어디로 가는지.
 *
 * **저절로 반영된다**(규격 §1). 저장이 끝나면 그 자리에서 다시 세고, 이
 * 화면은 사이에 서서 묻는 자리가 아니라 **무엇이 달라졌는지 적는 자리**다.
 *
 * **일곱을 차례로 적는다**(R31 · Human Review). 경험이 저장됐어요 → 그
 * 사람이 적은 경험 제목 → 실제 달라진 현재 상태 → 보완할 근거 → 현재 상태
 * 확인하기 → 다른 경험 추가하기 → 기록으로 확인된 역할과 판단 (R32: 변화와
 * 다음 행동이 먼저다).
 *
 * 전에는 `경영전략·기획 · 문제로 잡은 것 · 경험 근거 2개` 처럼 **우리 쪽
 * 자료 구조의 줄**이 영역·축마다 되풀이됐다. 적은 사람이 알고 싶은 것은
 * 자기가 고른 말이 어디로 갔는가이고, 그 말은 그 기록에 그대로 있다.
 *
 * **학생 실제 데이터가 없는 항목은 만들지 않는다.** 고른 판단이 없으면 그
 * 절이 서지 않고, 달라진 것이 없으면 그 사실과 까닭을 적고, 보완할 자리가
 * 없으면 그 절도 서지 않는다. 지어낸 요약도 가짜 수도 두지 않는다.
 *
 * **굳은 결과를 고치지 않는다.** 그때 낸 결과지는 그대로 열리고, 여기서
 * 바뀌는 것은 지금 값과 할 일뿐이다.
 */
export default async function Recompute(
  { searchParams }: { searchParams: Promise<{ new?: string; e?: string; r?: string }> },
) {
  const user = await requireUser();
  const lang = await wsLang(user.id);
  const t = wsSay(lang);
  const STATE_KO = stateSay(t);
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCoreOrPick(user.id);
  const cl = contentLang(core, lang);
  const major = lang === "en" ? majorNameIn(core, "en") : await activeMajorName(user.id);
  const sp = await searchParams;
  /* 방금 저장하고 온 사람인가. 번호가 있으면 **이번 경험**으로 좁혀 적고,
     없으면(띠에서 바로 들어온 사람) 쌓인 것 전부를 적는다 */
  const newId = sp.new ?? "";
  const [plan, exps, model, st] = await Promise.all([
    previewRecompute(user.id), experiencesOf(user.id), latestResult(user.id),
    recomputeStatus(user.id),
  ]);
  /* **상태는 DB 가 들고 주소가 거든다**(규격 §2). 주소의 `r` 은 방금
     어떻게 끝났는지이고, 새로 고치면 사라진다. 그래서 새로 고쳐도 남아야
     하는 `돌고 있다 · 실패했다` 는 `career_events` 에서 읽는다 */
  const failed = sp.e === "recompute" || sp.r === "failed" || st.failed > 0;
  const running = st.running || sp.r === "busy";
  /* 집을 줄이 없다는 것은 **이미 다 세어졌다**는 뜻이다 */
  const applied = !failed && !running && st.pending === 0 && !!st.recomputed_at;
  const fresh = newId ? exps.find((e) => e.id === newId) ?? null : null;
  const kindKo = fresh ? kindLabel(fresh.kind, lang) ?? "" : "";
  /* `아직 쓰인 곳이 없다` 는 쓰인 곳이 아니다. 영어 작업공간에서는 그 영어가 저장된다 */
  const noUse = wsSay("en")("아직 쓰인 곳이 없다");

  /* ── 3. 기록으로 확인된 역할과 판단 ──
     **그 사람이 고른 말 그대로다.** 묻는 자리마다 한 줄이고, 고른 것이 없는
     자리는 서지 않는다. 영역은 이름으로 적고 코드도 축 이름도 적지 않는다 */
  const said = fresh ? [
    { label: t("다룬 문제"), items: fresh.problems ?? [] },
    { label: t("직접 정한 것"), items: fresh.decisions },
    { label: t("남긴 것"), items: fresh.artifacts },
    { label: t("비교해 확인한 것"), items: fresh.verifications },
    { label: t("쓰인 곳"), items: (fresh.used_where ?? [])
      .filter((u) => !/아직 쓰인 곳이 없다/.test(u) && u !== noUse) },
  ].filter((g) => g.items.length) : [];
  const where = fresh ? fresh.td_codes.map((td) => domainName(core, td, cl)).filter(Boolean) : [];

  /* 이번 경험이 만든 자리만. **쌓인 것과 섞지 않는다**: 섞으면 어제 적은
     경험이 올린 자리를 오늘 적은 것이 올린 줄로 읽는다 */
  const mine: Candidate[] = fresh
    ? plan.candidates.filter((c) => c.from.some((f) => f.id === fresh.id))
    : plan.candidates;
  const mineMoved = mine.filter((c) => c.moved);

  /* ── 4. 실제 달라진 현재 상태 ──
     문장은 **세 화면이 같이 쓰는 자리**가 든다(규격 §12). `+1점` 도
     `2 → 3` 도 쓰지 않는다 */
  const changes = [
    ...plan.zone_moves.map((z) => zoneMovedKo(z, domainName(core, z.domain, cl), lang)),
    ...mineMoved.map((c) =>
      raisedKo({ domain: c.domain, axis: c.axis, state: c.after }, domainName(core, c.domain, cl),
        lang)),
  ];
  const why = noChangeWhy({
    candidates: mine.length,
    alreadyHigh: mine.filter((c) => !c.moved).length,
  });

  /* ── 5. 보완할 근거 하나 ──
     **메워질 자리는 내지 않는다**: 반영하면 닫히는 일을 다음 할 일로 적으면
     그 자리에서 루프가 끊긴다. 이번 경험의 영역이 있으면 그 영역의 빈자리가
     먼저다: 적은 사람이 묻는 것은 `그 일에서 무엇이 더 필요한가` 다 */
  const closed = new Set(plan.closed_gaps.map((g) => `${g.domain}.${g.axis ?? ""}`));
  const openGaps = (model?.gaps ?? [])
    .filter((g) => !closed.has(`${g.domain}.${g.axis ?? ""}`));
  const nextGap = openGaps.find((g) => fresh?.td_codes.includes(g.domain))
    ?? openGaps[0] ?? null;
  const gap = nextGap ? textFor(lang).gapKo(nextGap, domainName(core, nextGap.domain, cl)) : null;
  const noChange = noChangeText(why, lang);
  const noPick = noChangeText("NO_DOMAIN_PICK", lang);

  return (
    <CmShell active="/me/experience" title={t("저장한 경험")} major={major} lang={lang}>
      <CmHead
        kicker={t("경험 저장")}
        /* 상태 말은 제품 전체가 같은 마디를 쓴다(규격 §21) */
        title={
          failed ? t("경험은 저장됐어요")
            : running ? t("현재 상태를 다시 확인하고 있어요")
              : fresh ? t("경험이 저장됐어요")
                : t("적어 두신 경험이 어디로 갔는지")}
        lead={
          failed
            ? t("현재 상태 갱신만 끝내지 못했습니다. 적어 주신 기록은 그대로 있습니다.")
            : running
              ? t("곧 끝납니다. 끝나면 현재 상태와 다음 할 일에 들어갑니다.")
              : fresh
                ? undefined
                : t("저장한 경험이 어느 판단으로 갔는지 묶어 현재 상태와 맞춰 봤습니다.")}
      />

      {/* **세 상태를 글자로 적는다**(규격 §2). 색으로만 말하지 않는다.
          그리고 **저장 실패와 반영 실패를 가른다**(규격 §19): 여기 선
          사람의 경험은 이미 저장돼 있다. `경험을 저장하지 못했습니다` 로
          적으면 그 사람이 처음부터 다시 적고, 같은 기록이 두 벌 쌓인다 */}
      {failed ? (
        <p className="cm-fail" role="alert">
          {t("경험은 저장했지만 현재 상태를 갱신하지 못했습니다. 적어 주신 기록은 그대로 있으니"
            + " 다시 적지 않으셔도 됩니다. 아래에서 `다시 시도` 를 눌러 주세요.")}
        </p>
      ) : running ? (
        <p className="cm-state is-run" role="status">
          {t("현재 상태를 다시 확인하고 있습니다. 잠시 뒤 이 쪽을 새로 열면 더해진 내용이 보입니다.")}
        </p>
      ) : applied ? (
        <p className="cm-state is-done" role="status">
          {t("현재 상태에 더했습니다. 검사 당시 결과는 그대로 남습니다.")}
        </p>
      ) : null}

      {/* ── 2. 그 사람이 적은 경험 ──
          제목은 **그 사람의 말**이고 이 쪽에서 가장 큰 글이다. 종류와 달은
          그 아래 한 줄이고, 적지 않은 달은 적지 않는다 */}
      {fresh ? (
        <div className="cm-panel cm-saved">
          <div className="cm-pane">
            <p className="cm-saved-meta">
              {[kindKo, monthKo(fresh.started_on, lang), ...where].filter(Boolean).join(" · ")}
            </p>
            <h2 className="cm-saved-title">{fresh.title}</h2>
          </div>
        </div>
      ) : null}

      {!plan.base_attempt_id ? (
        <div className="cm-soon">
          <b>{t("아직 바탕이 될 결과가 없습니다.")}</b> {t("경험은 저장됐습니다. 검사를 한 번 끝내면 그 결과 위에 이 기록이 쌓입니다.")}
          <p style={{ marginTop: 10 }}>
            <Link href="/cores">{t("검사 시작하기")}</Link>
          </p>
        </div>
      ) : (
        <>
          {/* ── 3. 실제 달라진 현재 상태 ──
              달라진 것이 없으면 그 사실과 까닭을 적는다(규격 §13). `경험이
              추가되었습니다` 로 끝내면 적은 사람이 자기 기록이 버려진 줄 안다 */}
          <h2 className="cm-sect">
            {applied ? t("실제 달라진 현재 상태") : t("현재 상태에서 달라지는 것")}
          </h2>
          <div className="cm-panel">
            <div className="cm-pane">
              {changes.length ? (
                <div className="cm-rows">
                  {changes.map((line) => (
                    <p className="cm-row" key={line}><b>{line}</b></p>
                  ))}
                </div>
              ) : (
                <>
                  <h3>{noChange.title}</h3>
                  <p>{noChange.why}</p>
                </>
              )}
              {plan.closed_gaps.length ? (
                <p className="cm-none">
                  {(() => {
                    const v = {
                      n: plan.closed_gaps.length,
                      names: plan.closed_gaps
                        .map((g) => domainName(core, g.domain, cl)).join(" · "),
                    };
                    return applied ? t("부족했던 부분 {n}곳이 메워졌습니다 · {names}", v)
                      : t("부족했던 부분 {n}곳이 메워집니다 · {names}", v);
                  })()}
                </p>
              ) : null}
              <p className="cm-none">{t("검사 당시 결과는 그대로 남습니다.")}</p>
            </div>
          </div>

          {/* ── 4. 보완할 근거 ──
              **하나만 적는다**(규격 §10). 나머지는 `지금 할 일` 이 든다. 보완할
              자리가 없으면 절을 세우지 않는다 */}
          {gap ? (
            <>
              <h2 className="cm-sect">{t("다음에 보완할 것")}</h2>
              <div className="cm-panel">
                <div className="cm-pane">
                  <p><b>{gap.title}</b></p>
                  <p className="cm-none">{gap.why}</p>
                </div>
              </div>
            </>
          ) : null}

          {/* ── 어디로 가는가 ──
              주된 단추는 달라진 현재 상태를 보는 것이고, 그 옆이 다른 경험을
              하나 더 적는 길이다. **틀어진 사람에게는 `다시 시도` 가 선다** */}
          <div className="cm-acts" style={{ marginTop: 20 }}>
            {failed ? (
              <form action={runRecompute}>
                <ApplyButton retry lang={lang} />
              </form>
            ) : (
              <Link className="cm-btn is-primary" href="/me/state">{t("현재 상태 확인하기")}</Link>
            )}
            <Link className="cm-btn" href="/me/experience/new">{t("다른 경험 추가하기")}</Link>
          </div>

          {/* ── 5. 기록으로 확인된 역할과 판단 ──
              R32: 달라진 현재 상태와 다음 행동 뒤로 내렸다. 적은 사람이 바로 알고
              싶은 것은 `그래서 무엇이 달라지나` 이고, 고른 항목은 그다음이다 ──
              고른 것이 하나도 없으면 이 절은 서지 않는다 */}
          {said.length ? (
            <>
              <h2 className="cm-sect">{t("기록으로 확인된 역할과 판단")}</h2>
              <div className="cm-panel">
                <div className="cm-pane">
                  <dl className="cm-said">
                    {said.map((g) => (
                      <div key={g.label}>
                        <dt>{g.label}</dt>
                        <dd>{g.items.join(" · ")}</dd>
                      </div>
                    ))}
                  </dl>
                  {mine.length ? (
                    <p className="cm-none">
                      {applied
                        ? t("현재 상태에 들어갔습니다. 같은 영역의 같은 판단에서 고른 항목이 둘이 되면 그때 직접 수행으로 올라갑니다.")
                        : t("현재 상태에 들어갑니다. 같은 영역의 같은 판단에서 고른 항목이 둘이 되면 그때 직접 수행으로 올라갑니다.")}
                    </p>
                  ) : (
                    <p className="cm-none">{noPick.why}</p>
                  )}
                </div>
              </div>
            </>
          ) : fresh ? (
            <>
              <h2 className="cm-sect">{t("기록으로 확인된 역할과 판단")}</h2>
              <div className="cm-panel">
                <div className="cm-pane">
                  <h3>{t("아직 고른 판단이 없습니다")}</h3>
                  <p>{noPick.why}</p>
                  <div className="cm-acts">
                    <Link className="cm-btn" href={`/me/experience/${fresh.id}/edit`}>{t("이 경험 고치기")}</Link>
                  </div>
                </div>
              </div>
            </>
          ) : null}


          {/* ── 상세는 눌러서 ──
              되짚을 사람에게만 필요한 표다. 늘 펼쳐 두면 이 화면에서 가장
              큰 덩이가 되고, 적은 사람이 묻는 것이 그 아래로 밀린다 */}
          {plan.candidates.length ? (
            <details className="cm-fold">
              <summary>{t("어느 경험이 어느 판단으로 갔는지 보기")}</summary>
              <div className="cm-tablewrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>{t("기술영역")}</th><th>{t("판단")}</th><th>{t("검사 당시")}</th>
                      <th>{t("지금")}</th>
                      <th>{t("고르신 항목")}</th><th>{t("어느 경험에서")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.candidates.map((c) => (
                      <tr key={`${c.domain}.${c.axis}`}>
                        <td><b>{domainName(core, c.domain, cl)}</b></td>
                        <td>{axisLabel(c.axis, lang)}</td>
                        <td>{STATE_KO[c.before] ?? c.before}</td>
                        <td>
                          {c.moved
                            ? <b>{STATE_KO[c.after] ?? c.after}</b>
                            : <span>{t("그대로")}</span>}
                        </td>
                        <td>{c.picks.slice(0, 2).join(" · ")}
                          {c.picks.length > 2 ? t(" 외 {n}", { n: c.picks.length - 2 }) : ""}</td>
                        <td>{[...new Set(c.from.map((f) => f.title))].join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="cm-none" style={{ marginTop: 10 }}>
                {t("경험으로 올라갈 수 있는 가장 높은 단계는 직접 수행까지입니다."
                  + " 직접 결정은 검사에서만 확인됩니다.")}
              </p>
            </details>
          ) : null}
        </>
      )}
    </CmShell>
  );
}
