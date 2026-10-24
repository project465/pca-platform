import { redirect } from "next/navigation";
import { BrandMark } from "@/components/sf/brand-mark";
import { requireUser } from "@/lib/session";
import { retakeState } from "@/lib/me-v3/retake";
import { currentAttempt, estimate } from "@/lib/me-v3/runtime/session";
import { core as coreEntry, sellableCores } from "@/lib/me-v3/core-registry";
import { startGate } from "@/lib/campus/start-gate";
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
  const retake = await retakeState(user.id);
  if (retake.done > 0 && !gate.grants.length && retake.lastAttemptId) {
    redirect(gate.kind === "campus"
      ? `/campus/${gate.mine.row.university_code.toLowerCase()}/start`
      : `/v3/${retake.lastAttemptId}/result?again=1`);
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
  const n = (k: string) => low.responses[k] === high.responses[k]
    ? `${low.responses[k]}` : `${low.responses[k]}~${high.responses[k]}`;

  const items = tier === "BASIC" ? n("BASIC")
    : tier === "STANDARD" ? n("STANDARD") : n("PRO");
  const raw = tier === "BASIC" ? low.minutes.basic
    : tier === "STANDARD" ? low.minutes.standardFresh : low.minutes.proFresh;
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
        <p className="qs-kicker">
          {campus
            ? `${campus.university_name} ${campus.department_name} · ${coreName} 진로 진단`
            : say("{major} 진로 진단", { major: coreName })}
        </p>
        <h1 className="qs-h1">{say("해 본 일 가운데 직접 정해 본 경험을 찾아 드립니다")}</h1>
        {/* **`기술영역` 을 적지 않는다.** 기계공학 Core 의 말이 스무 Core 의
            시작 화면에 그대로 섰다. 경영 학생은 자기 일을 그렇게 부르지 않는다 */}
        <p className="qs-lead">
          {say("적성이나 성격 검사가 아닙니다. {major}의 여러 업무 영역에서 무엇을 해 봤고 무엇을 직접 정했는지, 어디가 아직 부족한지 알려 드립니다.", { major: coreName })}
        </p>

        {/* 무엇을 보는 검사인지 먼저. 분량은 아래로 내린다 */}
        <ul className="qs-three">
          <li>
            <b>{say("무엇을 해 봤는지")}</b>
            <span>{say("영역마다 해 본 일을 여쭙니다")}</span>
          </li>
          <li>
            <b>{say("무엇을 직접 정했는지")}</b>
            <span>{say("같은 일이라도 시킨 대로 한 것과 내가 정한 것을 구분합니다")}</span>
          </li>
          <li>
            <b>{say("어떤 경험이 아직 부족한지")}</b>
            <span>{say("부족한 부분과 다음에 준비하면 좋을 것을 정리합니다")}</span>
          </li>
        </ul>

        <ul className="qs-facts">
          <li><b>{items}</b>{say("문항#unit")}</li>
          <li>{say("약")} <b>{mins}</b>{say("분#unit")}</li>
          {campus ? null : <li><b>{tier}</b>{t.label}</li>}
          <li>{say("자동 저장")}</li>
        </ul>

        {/* 둘 다 읽히기는 해야 하지만 둘 다 주인공은 아니다. 가로로 벌려
            세로 길이를 줄이면 시작 단추가 한 화면 안에 들어온다 */}
        <div className="qs-two">
        <section className="qs-sect">
          <h2>{say("묻는 순서")}</h2>
          <ul className="qs-steps">
            <li>{say("업무 영역마다 관심이 있는지, 해 봤는지, 배우고 싶은지 여쭙니다")}</li>
            <li>{say("해 본 일이 있는 영역은 조금 더 자세히 여쭙니다")}</li>
            {tier !== "BASIC" ? (
              <li>{say("그 가운데 몇 영역은 범위·방법·결과·활용까지 나눠서 여쭙니다")}</li>
            ) : null}
            {tier === "PRO" ? (
              <li>{say("과제나 프로젝트 하나를 골라 지원서에 쓸 말로 정리하고, 관심 산업과 직무를 하나씩 더 자세히 봅니다")}</li>
            ) : null}
          </ul>
        </section>

        <section className="qs-sect">
          <h2>{say("시작하기 전에")}</h2>
          <ul className="qs-steps">
            <li>{say("해 본 적 없는 일은 ‘해 본 적 없음’을 고르시면 됩니다. 그 답도 결과에 들어갑니다")}</li>
            <li>{say("학위가 높다고 결과가 좋아지지 않습니다. 질문에 나오는 상황 설명만 달라집니다")}</li>
            <li>{say("창을 닫아도 보던 위치에서 이어집니다. 이전으로 돌아가 수정할 수 있습니다")}</li>
          </ul>
        </section>
        </div>

        <div className="qs-sect">
          <StartForm error={e} core={campus ? undefined : (picked ?? undefined)}
            lang={lang} chosen={chosen ?? undefined} />
        </div>

        <p className="qs-fine">
          {say("낯선 용어에는 질문 바로 아래에 쉬운 풀이를 붙였습니다. 용어를 몰라도 결과에 불리하지 않습니다.")}
        </p>
      </main>
    </div>
  );
}
