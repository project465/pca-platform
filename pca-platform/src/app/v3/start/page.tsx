import { redirect } from "next/navigation";
import { BrandMark } from "@/components/sf/brand-mark";
import { requireUser } from "@/lib/session";
import { retakeState } from "@/lib/me-v3/retake";
import { upgradeTarget } from "@/lib/me-v3/upgrade";
import { currentAttempt, estimate } from "@/lib/me-v3/runtime/session";
import { core as coreEntry, sellableCores } from "@/lib/me-v3/core-registry";
import { startGate } from "@/lib/campus/start-gate";
import { pickRequired } from "@/lib/campus/registry";
import { campusAttemptState, campusTargetOf } from "@/lib/campus/attempt-state";
import type { Tier } from "@/lib/me-v3/scoring/types";
import { tierText } from "../tier-text.i18n";
import { phrase } from "@/lib/me-v3/phrase";
import { localeFor } from "@/lib/me-v3/i18n";
import { majorNameIn } from "@/lib/me-v3/runtime/session";
import { explicitLang } from "@/lib/locale-server";
import { resolveMarket } from "@/lib/market";
import StartForm from "./start-form";

/* 탭 제목은 고른 언어를 따른다. 아직 응시가 없어서 응시 언어를 읽을 수 없다 */
export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ lang?: string }> },
) {
  const { lang } = await searchParams;
  return { title: phrase(await explicitLang(lang ?? null))("검사 시작 · CareerMatri") };
}

/**
 * 검사 시작.
 *
 * **이어 볼 응시가 있으면 거기로 돌려보낸다.** 시작 화면을 다시 보여주면
 * 처음부터 푸는 줄 알고, 그 사람의 응답이 두 벌 쌓인다.
 *
 * 받을 것과 걸리는 시간을 먼저 적는다. 문항 수는 **routing 으로 달라지므로
 * 범위로 적는다**: 하나로 못 박으면 넷째 영역이 열린 사람이 속은 줄 안다.
 */
export default async function V3Start({
  searchParams,
}: { searchParams: Promise<{ e?: string; core?: string; lang?: string }> }) {
  const user = await requireUser();
  const { e, core: want, lang: wantLang } = await searchParams;

  const open = await currentAttempt(user.id);
  if (open) redirect(`/v3/${open.id}`);

  /**
   * **학교가 발급한 계정에는 개인 응시의 시작 화면을 세우지 않는다.**
   *
   * 판정은 `startGate()` 한 자리이고 서버 액션도 같은 함수를 읽는다.
   * 학교 쿠키 없이 이 주소를 바로 친 학교 학생은 학교 경로로 간다: 거기서
   * 그 학생의 학과와 지금 상태(시작 · 이어하기 · 결과 보기)가 선다.
   */
  const gate = await startGate(user.id);
  if (gate.kind === "school_only") redirect(gate.to);

  /**
   * **이미 끝낸 사람은 새 응시를 열지 않는다**(규격 §7).
   *
   * 전에는 여기서 아무것도 보지 않아 결과를 받은 학생이 단추를 한 번 더
   * 누르면 응시가 하나 더 생겼다. 지금은 **담당자가 열어 준 때만**(쓰지
   * 않은 이용권 한 줄) 다시 열리고, 그렇지 않으면 지난 결과로 보낸다.
   * **지난 결과를 지우지 않는다**: 막는 것은 새 줄을 만드는 일이다.
   * 다시 여는 권한은 **그 길의 이용권만** 센다(`startGate`).
   */
  /* **산 등급이 지난 응시보다 높으면 새로 열지 않고 넓힌다**(`upgrade.ts`).
     새로 열면 같은 사람의 응답이 두 벌 쌓이고 앞에서 답한 것을 다시 푼다 */
  if (gate.kind !== "campus" && (await upgradeTarget(user.id))) redirect("/v3/upgrade");

  /* **학교 응시는 학과마다 한 번이다**(2026-11-03 대표 결정 "다른 학과도 검사"). 이번에 잴 학과로 낸 결과가 있고
     담당자가 다시 열어 주지 않았으면 그 학과 쪽으로 돌려보낸다. 개인 응시는 전과 같다 */
  const retake = await retakeState(user.id);
  const target = gate.kind === "campus" ? campusTargetOf(gate.entry, gate.mine) : null;
  const deptState = target
    ? await campusAttemptState(user.id, {
      universityCode: target.university_code, code: target.department_code,
      core: pickRequired(target) ? gate.kind === "campus" ? gate.entry?.core_code ?? null : null : null,
    }) : null;
  if (target && deptState?.kind === "result") {
    redirect(`/campus/${target.university_code.toLowerCase()}/d/${encodeURIComponent(target.department_code)}`);
  }
  if (!target && retake.done > 0 && !gate.grants.length && retake.lastAttemptId) {
    redirect(`/v3/${retake.lastAttemptId}/result?again=1`);
  }

  const grants = gate.grants;
  /**
   * **학교 진입으로 고른 학과가 있으면 그 전공이다**(규격 §11 · §12).
   *
   * 쿠키에 적힌 학교·학과를 등록부로 다시 맞춰 본 값이고, 그 사람이 그
   * 학교의 등록된 학생일 때만 선다. 아니면 개인 응시의 화면이다.
   */
  const campus = gate.kind === "campus" ? gate.entry : null;
  /**
   * **학교 진입은 등급을 고르지 않는다. 늘 PRO 다.**
   *
   * 정하는 자리는 `openAttempt()` 하나이고(설계 원칙 10) 이 화면은 그
   * 규칙을 **읽어서** 적는 수를 고를 뿐이다. 두 자리가 따로 정하면 학교
   * 학생이 선별 등급의 문항 수를 보고 앉았다가 여덟 축을 답하게 된다.
   */
  const tier: Tier = campus ? "PRO" : (grants[0]?.tier ?? "BASIC");
  /**
   * **전공 목록에서 고른 Core 를 받는다**(규격 §20).
   *
   * 전에는 학교 맥락이 없으면 늘 `sellableCores("KR")[0]` 이었다. 전공이
   * 하나만 열려 있던 동안에는 그 값이 곧 고른 전공이었는데, 둘이 열린
   * 날부터는 **경영학 카드를 누른 사람이 기계공학 시작 화면에 앉았다.**
   *
   * 받은 값을 그대로 믿지 않는다: 지금 응시할 수 있는 Core 가 아니면
   * 버린다. 그리고 여기서 정한 값은 적는 수를 고르는 데만 쓰이고, 응시
   * 줄에 적는 자리는 `openAttempt()` 하나다(설계 원칙 10).
   */
  const picked = want && sellableCores("KR").some((c) => c.code === want)
    ? want : null;
  const core = campus?.core_code ?? picked ?? sellableCores("KR")[0]?.code ?? null;
  if (!core) redirect("/cores");
  /* 쪽 머리에 전공 이름을 적는다. **안쪽 코드를 적지 않는다** */
  /**
   * **이 쪽은 열릴 응시의 언어로 선다.** 응시 언어를 정하는 자리는
   * `openAttempt()` 하나이고(`localeFor`) 여기서는 같은 함수로 미리 읽는다:
   * 시작 화면이 한국어인데 첫 문항이 영어로 열리면 같은 흐름이 두 언어가 된다.
   */
  const mk = (await resolveMarket().catch(() => null))?.market ?? "KR";
  const market = campus ? "KR"
    : picked && !sellableCores(mk).some((c) => c.code === picked) ? "KR" : mk;
  const chosen = campus ? null : await explicitLang(wantLang ?? null);
  /**
   * **글로벌 시장의 개인은 전공 고르기를 거쳐 온다**(영어판 2단계). 전공 없이
   * 이 주소로 오면 기본 전공이 한국 시장 목록의 첫째라, 영어 원고가 없는
   * 전공으로 한국어 응시가 열릴 수 있다. 고른 전공에 영어 원고가 없을 때도
   * 같다. 한국어를 직접 고른 사람은 그대로 둔다.
   */
  if (!campus && mk === "GLOBAL" && chosen !== "ko"
    && (!picked || localeFor({ core: picked, market: "GLOBAL", override: "en" }) !== "en")) {
    redirect("/cores");
  }
  const lang = campus ? "ko" : localeFor({ core, market, override: chosen });
  const say = phrase(lang);
  const coreName = (() => {
    if (lang !== "ko") return majorNameIn(core, lang);
    try { return coreEntry(core).name_ko; } catch { return "전공"; }
  })();
  const t = tierText(lang).TIER_WHAT[tier];
  void t.what;
  /* **가장 짧은 경우와 가장 긴 경우를 범위로 적는다.** 긴 쪽은 타계열
     대학원으로, 번역 맥락 묶음이 더 붙는 자리다. 두 값은 `estimate()` 가
     실제 계획을 세워 센 것이고 `npm run v3:length` 가 같은 함수로 같은
     값을 센다 */
  const low = estimate(core, "bachelor", null);
  const high = estimate(core, "master", "BUSINESS");
  /* **긴 쪽은 영역 넷을 깊게 묻는 계획까지 센다**(2026-11-01 배재대 운영 시험: `110~114문항`
     으로 적었는데 실제로 122문항을 받았다). 깊게 묻는 영역 수는 답에 따라 셋 또는 넷이고,
     앞 판본은 셋인 경우만 셌다. 짧은 쪽은 셋 · 학부, 긴 쪽은 넷 · 타계열 대학원이다 */
  const n = (k: string, k4: string = k) => low.responses[k] === high.responses[k4]
    ? `${low.responses[k]}` : `${low.responses[k]}~${high.responses[k4]}`;

  const items = tier === "BASIC" ? n("BASIC")
    : tier === "STANDARD" ? n("STANDARD", "STANDARD4") : n("PRO", "PRO4");
  /* 시간은 긴 쪽으로 적는다. 짧게 적으면 그만큼만 비워 둔 사람이 중간에 끊는다 */
  const raw = tier === "BASIC" ? high.minutes.basic
    : tier === "STANDARD" ? high.minutes.standardFourth : high.minutes.proFourth;
  /* **추정 시간을 분 단위로 못 박지 않는다.** 9분이라고 적으면 재어 본
     값처럼 읽힌다. 다섯 단위로 적는다.
     **반올림하지 않고 올린다**: 12분을 10분으로 적으면 적게 말한 쪽으로
     틀리고, 시간을 그만큼만 비워 둔 사람이 중간에 끊는다 */
  const mins = Math.max(5, Math.ceil(raw / 5) * 5);

  return (
    <div className="qs is-explore">
      <header className="qs-head">
        <div className="qs-head-in">
          <div className="qs-top" style={{ paddingBottom: 14 }}>
            <span className="qs-brand"><BrandMark size={20} />CareerMatri</span>
            {/* **학교 진입에는 등급을 적지 않는다.** 학생이 고를 수 있는
                값이 아니고, 적어 두면 사지 않은 상품 이름으로 읽힌다.
                안쪽 응시 줄에는 PRO 가 그대로 적힌다 */}
            {campus ? null : <span className="qs-tier">{tier} · <b>{t.label}</b></span>}
          </div>
        </div>
      </header>

      <main className="qs-intro">
        {/* **설명을 쌓지 않는다**(2026-11-03 대표 "여기 ai티 난다"). 부정 설명 · 제목을 되풀이하는 카드 셋 · 절차 목록을
            빼고, 무엇을 얼마나 하는지 한 줄과 막히는 자리 한 줄, 단추만 둔다. 같은 안내를 첫 문항 앞에서 다시 하지 않는다 */}
        {campus ? <p className="qs-kicker">{`${campus.university_name} ${campus.department_name}`}</p> : null}
        <h1 className="qs-h1">{say("{major} 진로 진단", { major: coreName })}</h1>
        <p className="qs-lead">{say("{n}문항 · 약 {mins}분 · 답할 때마다 저장됩니다", { n: items, mins })}</p>
        <p className="qs-lead">{say("해 본 적 없는 일은 ‘해 본 적 없음’을 고르시면 됩니다")}</p>
        {/* 견본은 개인 응시에만(견본 쪽에 가격표 단추가 있다: `campus:check`) */}
        {campus ? null : (
          <p className="qs-sample">
            <a href="/sample" target="_blank" rel="noopener noreferrer">{say("결과지 견본 보기 (기계공학 전공 예시)")}</a>
          </p>
        )}
        <div className="qs-sect">
          <StartForm error={e} core={campus ? undefined : (picked ?? undefined)}
            lang={lang} chosen={chosen ?? undefined} fixedStage={campus ? "bachelor" : undefined} />
        </div>
      </main>
    </div>
  );
}
