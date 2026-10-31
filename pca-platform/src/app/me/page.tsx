import Link from "next/link";
import { currentUser, requireUser } from "@/lib/session";
import {
  EXPERIENCE_KINDS, applicationsOf, currentState, experiencesOf, activeCoreOrPick } from "@/lib/me-v3/platform";
import { domainName, majorNameIn } from "@/lib/me-v3/runtime/session";
import {
  ZONE_TITLE_KO, domainChainKo,
} from "@/lib/me-v3/result/text.ko";
import { textFor } from "@/lib/me-v3/result/text";
import { stateLeadEn } from "@/lib/me-v3/result/text.en";
import { thingKo } from "@/lib/me-v3/result/say";
import { wsLang, type WsLang } from "@/lib/me-v3/ws-lang";
import { wsSay, type WsSay } from "@/lib/me-v3/ws-say";
import { Icon, type IconName } from "@/components/sf/icon";
import { openActions } from "@/lib/me-v3/open-actions";
import { recentChangeKo } from "@/lib/me-v3/change-text.ko";
import { mark } from "@/lib/me-v3/workspace-events";
import { majorNameOf } from "@/lib/me-v3/major-name";
import { activeTrack } from "@/lib/track";
import {
  FAMILY_LINE, NEUTRAL_LINE, studentStateView,
} from "@/lib/me-v3/student";
import { resultMeta } from "@/lib/me-v3/result/meta";
import { CmShell, CmHead } from "./shell";
import { InstallCard } from "@/components/install-card";
import {
  ActivityRow, DomainTile, PrimaryActionHero, RecordRow,
  SectionHeader, SectionNote,
} from "./ui";
import { continueAssessment } from "./actions";
import { queryOne } from "@/lib/db";

export async function generateMetadata() {
  const u = await currentUser().catch(() => null);
  const t = wsSay(u ? await wsLang(u.id) : "ko");
  return { title: `${t("홈")} · CareerMatri` };
}

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
  const lang = await wsLang(user.id);
  const t = wsSay(lang);
  const tx = textFor(lang);
  const en = lang === "en";
  const day = (s: string | null | undefined) => daySay(s, lang);
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCoreOrPick(user.id);
  /* **홈이 묻지 않는 것은 읽지도 않는다**(규격 §10). 고르신 산업과
     직무와 지역은 왼쪽 띠의 제 쪽이 들고, 결과 기록은 머리의 링크가
     보낸다. 쓰지 않는 값을 네 번 더 물으면 홈이 그만큼 늦어진다 */
  const [st, exps, act, apps, track] = await Promise.all([
    currentState(user.id), experiencesOf(user.id), openActions(user.id),
    applicationsOf(user.id), activeTrack(user.id),
  ]);
  const actions = act.rows;
  /* 진행 중이면 몇 문항에 답했는지만 센다(Hero 한 줄). 전체 문항 수는
     등급과 고른 산업에 따라 갈려서 여기서 짐작해 적지 않는다 */
  const answered = st.stage === "IN_PROGRESS" && st.open
    ? Number((await queryOne<{ n: string }>(
        "SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1",
        [st.open.id]))?.n ?? 0)
    : 0;

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
  /* 학생이 공고 화면에서 고른 줄(`manual`)은 결과의 할 일로 바꿔 읽지 않는다 */
  const nowModel = first && st.model && first.source === "result"
    ? st.model.actions.find((a) =>
        (a.domain ?? "") === (first.td_code ?? "")
        && (a.axis ?? "") === (first.axis_code ?? "")) ?? null
    : null;
  /**
   * **Hero 는 머리 한 줄과 설명 두 줄까지다**(BIZ COMMERCIAL FINAL §7).
   *
   * 할 일 문장이 경험 → 행동 → 결과물 두 마디가 되면서(§8) 이 자리에
   * 그대로 들어가니 **큰 글씨가 다섯 줄**이 됐다. 홈에서 가장 강한 칸이
   * 가장 읽기 어려운 칸이 되는 자리다. 머리에는 할 일의 종류를 적고,
   * 어느 경험을 가져와 얼마나 적으면 되는지는 아래 줄이 든다.
   *
   * **문장을 여기서 짓지 않는다**: 결과지와 `다음 할 일` 이 쓰는 같은
   * 함수를 부른다. 굳은 결과에서 그 할 일을 못 찾으면(담아 둔 줄만 있는
   * 경우) 담긴 문장을 그대로 쓴다.
   */
  const nowDomain = nowModel?.domain ? domainName(core, nowModel.domain, lang) : "";
  const nowSay = nowModel && st.model
    ? {
      /* 머리에 **영역**을 담는다(R30). `그때 직접 정한 것을 적어 두기` 만
         읽은 사람은 어느 과제의 무엇을 적으라는 것인지 알 수 없었다.
         목표 화면의 Hero 가 영역과 할 일을 한 문장에 담는 자리다 */
      head: tx.actionHeadKo(nowModel, nowDomain),
      brief: tx.actionBriefKo(nowModel, nowDomain),
      /* **둘째 층은 그걸 하면 무엇이 남는지다**(SIGN-OFF §6). 결과지의
         `지금 할 일` 칸이 같은 함수를 부르므로 두 쪽의 말이 갈리지
         않는다. 어떻게 적으면 되는지는 `다음 할 일` 쪽이 든다 */
      gain: tx.actionWhyKo(nowModel),
    }
    : { head: first?.body ?? "", brief: "", gain: "" };
  const nowGap = first
    ? st.gaps.find((g) => g.domain === first.td_code
        && (g.axis ?? "") === (first.axis_code ?? ""))
      ?? st.gaps.find((g) => g.domain === first.td_code) ?? null
    : null;
  const nowWhy = nowGap ? tx.gapKo(nowGap, domainName(core, nowGap.domain, lang)).why : "";
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
  /* **결과지와 한 자리에서 읽는다**(R30 · PHASE 1). 전에는 이 쪽이
     `zoneOf` 를 영역 차례로 걸러 셋을 집어서, 근거가 선 영역(Z1)이 네
     번째 영역이면 **그 사람의 가장 센 자리가 홈에서 빠졌다**(시나리오 D).
     지금은 결과지와 같은 함수가 차례와 세부와 머리 한 줄을 정한다. 넘기는
     묶음은 **지금 값**(`st.zoneOf`)이라 경험을 더한 뒤의 변화가 그대로 선다 */
  const stateView = studentStateView(core, st.model, st.zoneOf, HOME_ROWS, en ? "en" : "ko");
  const ready = stateView.tiles.map((t) => t.code);
  /**
   * 영역 칸의 거드는 한 줄.
   *
   * 전에는 그 영역이 일하는 차례 두 토막을 가운뎃점으로 이어서
   * `전사 목표와 쓸 수 있는 자원 · 하지 않을 …` 로 **잘렸다.** 그 칸의
   * 글은 한 줄에서 끊기므로(`white-space: nowrap`) 긴 설명을 담을 수
   * 없고, 목표 화면의 그 자리도 세 낱말짜리 짧은 줄이다.
   *
   * **그 사람이 남긴 것을 적는다.** 영역 설명보다 짧고, 읽는 사람이 제
   * 답을 알아본다. 하나도 없으면 그 영역이 먼저 정하는 것으로 내려간다:
   * 비워 두면 칸 셋이 이름만 든 줄이 된다.
   */
  /* 세부 한 줄과 표시. **그 사람이 실제로 남긴 것이 먼저다**(R30). 전에는
     이 칸이 사전의 결과물 이름(`사업계획서`)을 남겼는지와 무관하게 적어서,
     아무것도 남기지 않은 사람이 그것을 가진 것으로 읽혔다. 남긴 것이 없으면
     사전의 활동 구(해 본 일)가 서고, 둘 다 `studentStateView` 가 정한다 */
  /* 영어판 세부 줄도 `studentStateView` 가 정한다(결과지와 한 자리) */
  const tileSub = (d: string): string => stateView.tiles.find((x) => x.code === d)?.sub ?? "";
  const tileIcon = (d: string): IconName => {
    const fam = stateView.tiles.find((t) => t.code === d)?.family ?? null;
    return fam ? FAMILY_LINE[fam] : NEUTRAL_LINE;
  };
  /* **홈이 요약을 따로 짓지 않는다**(규격 §11). 네 묶음이 전부
     `currentState()` 한 자리에서 오고, `최근 변화` 의 문장은 저장 직후
     화면과 현재 상태가 쓰는 함수를 그대로 부른다 */
  /* **줄 셋까지다**(규격 §7). 목표 화면의 `최근 변화` 가 세 줄짜리
     목록이고, 나머지 수는 마지막 줄이 든다. 전체는 `현재 상태` 가 든다 */
  const change = recentChangeKo(st, (td) => domainName(core, td, lang), 3, lang);

  /**
   * **주된 단추는 늘 `지금 할 일` 이다**(규격 §12).
   *
   * 전에는 상태마다 다른 단추를 세웠고, 경험을 반영한 사람에게는 가장
   * 짙은 단추가 `최근 변화 보기` 였다. 그러면 홈의 첫 행동이 **지난 일을
   * 돌아보는 쪽**이 된다. 결과가 있는 사람에게 다음 걸음은 하나뿐이라
   * 그 자리를 비워 두지 않는다. 검사 전과 진행 중만 갈린다.
   */
  /* **전공 이름을 글자로 적지 않는다.** 이 사람이 쓰는 Core 에서 읽는다 */
  const major = en ? majorEn(st.core) : majorNameOf(st.core);
  /**
   * 학교에서 받은 검사인가(규격 §15).
   *
   * **값을 여기서 만들지 않는다**: 결과지 머리와 검사 머리띠가 읽는 자리를
   * 그대로 쓴다(`resultMeta`). 세 화면이 따로 읽으면 어느 날 하나만 다른
   * 학과를 적는다(설계 원칙 10).
   */
  const meta = st.model
    ? await resultMeta(String(st.model.attempt_id), st.core)
    : null;
  const cta = st.stage === "NO_ASSESSMENT"
    ? { href: "/cores", label: major ? t("{major} 검사 시작", { major }) : t("검사 시작") }
    : st.stage === "IN_PROGRESS"
      ? { href: st.open ? `/v3/${st.open.id}` : "/cores", label: t("검사 이어하기") }
      : { href: "/me/next", label: t("지금 할 일") };
  const head = headSay(t);

  return (
    <CmShell active="/me" title={t("홈")} who={user.name} lang={lang}
      /* 바로가기 찾기가 더 찾게 해 줄 것. **이 쪽이 이미 들고 있는
         값이다**: 서버를 한 번도 더 부르지 않는다 */
      finds={Object.keys(st.zoneOf).map((d) => ({
        label: domainName(core, d, lang), sub: t("기술영역"), href: "/me/state",
      }))}
      /* **왼쪽 띠에 학교 이름이 선다**(규격 §15). 학교에서 받은 검사를
         푼 사람에게 전공 이름만 적어 두면, 이 작업공간이 학교와 무관한
         개인 서비스로 읽힌다 */
      major={meta?.school ? `${meta.school} · ${meta.department ?? major}` : major}
      /* **없는 기능을 그려 넣지 않는다**(규격 §4). 목표 화면의 검색과
         알림은 CareerMatri 에 없는 기능이라 두지 않았다. 여기 서는 것은
         실제로 있는 한 가지다 */
      bar={st.model
        ? <Link className="cm-btn" href="/me/experience/new">{t("+ 경험 추가")}</Link>
        : null}>
      <CmHead
        /* **첫 화면은 인사로 연다**(화면 시안 2026-10-20). 학교 포털의
           첫 화면처럼 `○○ 학생, 안녕하세요` 가 제목이고, 이 쪽이 지금
           어느 단계인지는 제목 위 한 줄로 옮겼다. 다른 쪽은 그대로 쪽
           이름이 제목이다 */
        kicker={head[st.stage]}
        title={t("{name} 학생, 안녕하세요", { name: user.name })}
        /* 제목 아래 한 줄(규격 §4) */
        meta={`${major ?? t("전공 진단")}${st.result_at ? t(" · 최근 업데이트 {at}", { at: day(st.result_at) ?? "" }) : ""}`}
        /* **설명 문단과 단추를 머리에 두지 않는다**(규격 §9 · §19). 바로
           아래 Hero 가 지금 할 일과 쪽의 짙은 단추 하나를 든다. 머리에도
           세우면 같은 화면에 짙은 단추가 둘이 된다 */
      />

      {/* ── A·B. 결과가 아직 없는 사람 ──
          **결과가 있는 홈과 같은 모양으로 선다**(전주대·원광대에 보인 화면).
          전에는 검사 전은 흰 칸 셋, 진행 중은 흰 카드 한 장만 서서, 같은
          작업공간인데 첫 화면이 다른 서비스처럼 보였다. 파란 Hero 가 지금
          할 한 가지(시작 · 이어하기)를 들고, 그 아래 칸들이 검사를 끝내면
          열리는 자리를 미리 보여 준다. **값을 지어내지 않는다**: 칸에는 그
          자리의 이름과 무엇을 담는지만 적는다 */}
      {!st.model && (st.stage === "NO_ASSESSMENT" || st.stage === "IN_PROGRESS") ? (
        <>
          <PrimaryActionHero
            tag={st.stage === "IN_PROGRESS" ? t("검사 진행 중") : t("검사 시작#tag")}
            tagIcon={st.stage === "IN_PROGRESS" ? "clipboard" : "target"}
            title={st.stage === "IN_PROGRESS"
              ? t("검사를 끝내면 결과와 할 일이 이 화면에 나옵니다.")
              : (major
                ? t("{major} 검사로 내 경험을 정리해 보세요.", { major })
                : t("전공 검사로 내 경험을 정리해 보세요."))}
            why={st.stage === "IN_PROGRESS"
              ? (answered
                ? t("지금까지 {n}문항에 답했습니다. 마지막으로 답한 문항에서 이어집니다.", { n: answered })
                : t("답한 것은 문항마다 저장되어, 마지막으로 답한 문항에서 이어집니다."))
              : t("적성이나 성격은 묻지 않습니다. 해 본 일에서 직접 판단한 경험을 찾습니다. 12분 안팎입니다.")}
            action={st.stage === "IN_PROGRESS" ? (
              /* 이어하기만 폼이다. 누른 것을 세려면 누르는 자리에서 센다 */
              <form action={continueAssessment}>
                <button className="cm-btn is-primary" type="submit">{t("검사 이어하기 →")}</button>
              </form>
            ) : (
              <Link className="cm-btn is-primary" href={cta.href}>{cta.label} →</Link>
            )}
          />

          <SectionHeader icon="chart" title={t("검사를 끝내면 열리는 곳")}
            sub={t("결과가 나오면 아래 자리마다 내 결과가 채워집니다.")} />
          <div className="cm-tiles">
            {preTiles(t).map((p) => (
              <DomainTile key={p.href} href={p.href} icon={p.icon}
                title={p.title} sub={p.sub} />
            ))}
          </div>

          {st.stage === "IN_PROGRESS" ? (
            <>
              <SectionHeader icon="clock" tone="c" title={t("최근 기록")}
                sub={t("풀던 검사와 적어 둔 경험이 여기에 쌓입니다.")} />
              <ul className="cm-feed is-rec">
                <RecordRow icon="clipboard"
                  title={major
                    ? t("{major} 검사 · 진행 중", { major })
                    : t("전공 검사 · 진행 중")}
                  note={answered
                    ? t("{n}문항 답함 · 문항마다 저장됨", { n: answered })
                    : t("문항마다 저장됨")}
                  actions={
                    <form action={continueAssessment}>
                      <button className="cm-btn" type="submit">{t("이어하기")}</button>
                    </form>
                  } />
              </ul>
            </>
          ) : null}
        </>
      ) : null}

      {/* ── 적어 둔 경험은 **검사 전에도 보인다** ──
          적는 자리가 홈에 없고 쌓인 것도 보이지 않으면, 결과가 없는 동안
          적은 글이 어디로 갔는지 알 수 없다. 결과가 생긴 뒤에는 아래
          `기록` 묶음이 같은 줄을 들고 가므로 여기는 그 전에만 선다 */}
      {!st.model && exps.length ? (
        <>
          <h2 className="cm-sect">{t("적어 둔 경험")}</h2>
          <div className="cm-panel">
            <div className="cm-pane">
              <h3>{t("최근 경험")}<em>{t("{n}개#count", { n: exps.length })}</em></h3>
              <div className="cm-rows">
                {exps.slice(0, HOME_RECENT).map((e) => (
                  <p className="cm-row" key={e.id}>
                    <b>{e.title}</b>
                    <span className="cm-when">{day(e.created_at.slice(0, 10))}</span>
                  </p>
                ))}
              </div>
              <p className="cm-none">
                {t("검사를 한 번 끝내면 이 경험이 어느 판단으로 가는지 맞춰 봅니다.")}
              </p>
              <div className="cm-acts">
                <Link className="cm-btn" href="/me/experience">{t("경험 전체 보기")}</Link>
              </div>
            </div>
          </div>
        </>
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
          <PrimaryActionHero
            tag={t("지금 할 일")}
            title={first ? nowSay.head : t("지금 꼭 해야 하는 일은 없습니다.")}
            /* **두 층이다**(SIGN-OFF §6): 위가 할 일이고 아래가 그걸
               하면 무엇이 남는지다. 어떻게 적으면 되는지와 그렇게 본
               까닭은 `다음 할 일` 과 `현재 상태` 쪽이 든다: 홈의 이 칸에
               셋을 다 세우면 다시 다섯 줄이 된다. **지어내지 않는다**:
               셋 다 없으면 그 줄이 없다 */
            why={first
              ? (nowSay.gain || nowSay.brief || nowWhy || undefined)
              : noActionWhy(t)}
            action={
              <Link className="cm-btn is-primary" href="/me/experience/new">
                {first ? t("지금 정리하기 →") : t("경험 추가 →")}
              </Link>
            }
            more={first && open.length > 1 ? (
              <Link className="cm-hero-more" href="/me/next">
                {t("그 밖에 할 일 {n}개", { n: open.length - 1 })}
                <Icon name="chev" size={14} />
              </Link>
            ) : null}
          />

          {/* ── 현재 상태 (규격 §6) ── 작은 가로 칸 셋. 큰 dashboard tile
              로 만들지 않는다.

              거드는 줄에 `영역` 을 쓰지 않는다: 바로 아래 칸이 그 분류를
              이름으로 적고 있어서, 위에서 한 번 더 세면 이 줄이 그 사람이
              한 일 대신 우리 표를 가리킨다 */}
          <SectionHeader icon="chart" title={t("현재 상태")}
            moreHref="/me/state" moreLabel={t("전체 보기 →")}
            /* **묶음이 말하는 것만 적는다**(R30): 정리가 덜 된 영역을
               `설명할 수 있다` 고 적지 않는다. 글자는 결과지와 같은 자리가 든다 */
            sub={ready.length
              ? t("{lead}입니다.", { lead: en ? stateLeadEn(stateView.counts) : stateView.lead })
              : readyNone(t)} />
          {ready.length ? (
            <div className="cm-tiles">
              {ready.map((d) => (
                <DomainTile key={d} href="/me/state"
                  icon={tileIcon(d)} title={domainName(core, d, lang)}
                  /* **여기서 새 수를 만들지 않는다**: 고르신 항목의
                     이름이거나 영역 설명 한 토막이다 */
                  sub={tileSub(d)} />
              ))}
            </div>
          ) : null}

          {/* ── 최근 변화 (규격 §7) ── 줄 중심. 줄마다 카드를 만들지 않는다 */}
          {st.stage === "RECOMPUTED" || st.pending > 0 ? (
            <>
              <SectionHeader icon="bolt" tone="b" title={t("최근 변화")}
                moreHref="/me/state#changes" moreLabel={t("모두 보기 →")} />
              {st.stage === "RECOMPUTED" ? (
                <>
                  <SectionNote>
                    {t("최근 추가한 경험으로 다음과 같은 변화가 생겼습니다.")}
                  </SectionNote>
                  <ul className="cm-feed">
                    {change.lines.map((line, i) => (
                      /* **앞쪽은 묶음이 옮겨 간 것이고 뒤는 축이 올라간
                         것이다**(`recentChangeKo` 가 그 차례로 잇는다).
                         표시를 갈라 두면 같은 줄 넷이 한 덩이로 읽히지
                         않는다. 색은 뜻을 갖지 않는다 */
                      <ActivityRow key={line} text={line} time={day(st.recomputed_at)}
                        tint={CHANGE_TINT[i % 3] || undefined}
                        icon={i < st.zoneMoved.length ? "ladder" : CHANGE_ICON[i % 3]} />
                    ))}
                    {change.more ? (
                      <ActivityRow rest icon="log"
                        text={t("그 밖에 {n}가지가 더 달라졌습니다.", { n: change.more })} />
                    ) : null}
                  </ul>
                </>
              ) : null}
              {st.pending > 0 ? (
                <>
                  <SectionNote>
                    {t("적어 두신 경험이 어느 판단으로 가는지 먼저 보고 더합니다."
                      + " 더해도 검사 당시 결과는 그대로 남습니다.")}
                  </SectionNote>
                  <ul className="cm-feed">
                    <ActivityRow icon="layers"
                      text={<b>{t("아직 더하지 않은 경험 {n}건", { n: st.pending })}</b>}
                      actions={
                        <Link className="cm-btn" href="/me/recompute">{t("새 경험 더하기")}</Link>
                      } />
                  </ul>
                </>
              ) : null}
            </>
          ) : null}

          {/* ── 최근 기록 (규격 §8) ── 굳은 결과 하나와 최근 경험 둘까지 */}
          {/* **거드는 줄을 되돌렸다.** 앞 회차에 `목표 화면의 그 자리에도
              없다` 고 적고 걷었는데, 그림을 세 배로 올려 다시 읽으니 이
              줄이 거기 그대로 있다(`최근 변화` 쪽도 같다). 눈으로 읽고
              적은 판정이 틀렸던 자리다 */}
          <SectionHeader icon="clock" tone="c" title={t("최근 기록")}
            moreHref="/me/results" moreLabel={t("모두 보기 →")}
            sub={t("최근 검사 결과와 경험을 확인할 수 있습니다.")} />
          {/* **학교 · 학과 · 검사일이 한 줄에 선다**(규격 §15). 전에는
              `경영 결과 (PRO)` 였고, 학교에서 받은 검사라는 것도 어느 학과로
              친 것인지도 이 줄에 없었다. 학교 진입이면 등급을 적지 않는다:
              학생이 고른 값이 아니다 */}
          <ul className="cm-feed is-rec">
            <RecordRow icon="report"
              title={meta?.school
                ? `${meta.school} · ${meta.department ?? major ?? t("진로진단")}`
                : t("{major} 결과 ({tier})", {
                  major: major ?? t("진로진단"), tier: tierSay(st.model.tier, lang),
                })}
              note={meta?.school
                ? t("{major} 진로 분석 리포트 · 고정됨", { major: major ?? t("진로진단") })
                : t("고정됨 · 그날의 문항과 기준 그대로입니다")}
              time={day(st.result_at) ?? ""}
              actions={
                <>
                  <Link className="cm-btn" href={`/v3/${st.model.attempt_id}/result`}>
                    {t("결과 보기")}
                  </Link>
                  {/* **`Link` 로 걸지 않는다.** Next 가 화면에 들어온 `Link` 를
                      미리 불러오면서 종이를 한 벌씩 만들어 버린다 */}
                  <a className="cm-btn is-quiet" href={`/v3/${st.model.attempt_id}/result/pdf`}>
                    PDF
                  </a>
                </>
              } />
            {/* **무료 검사 → MAT.** 결과를 받은 사람이 다음에 갈 자리다. MAT 을
                이미 쓰는 사람에게는 세우지 않는다(띠에 이미 있다) */}
            {!track.on ? (
              <RecordRow icon="spark" tint="t-2"
                title={t("이 결과로 매주 챙기기 · MAT")}
                note={t("이번 주 할 일 하나 · 가까운 마감 · 공고와 내 경험 비교")}
                actions={
                  <Link className="cm-btn" href="/me/track">{t("MAT 보기")}</Link>
                } />
            ) : null}
            {exps.slice(0, HOME_RECENT).map((e) => (
              <RecordRow key={e.id} icon="layers" tint="t-4" title={e.title}
                note={kindSay(t)[e.kind] ?? t("경험")}
                time={day(e.started_on ?? e.created_at.slice(0, 10))}
                actions={
                  <Link className="cm-btn" href="/me/experience">{t("자세히 보기")}</Link>
                } />
            ))}
            {/* 영어판에는 서지 않는다: 지원 기록은 국내 공고와 이어진 쪽이다(`WS_KR_ONLY`) */}
            {(en ? [] : apps).slice(0, HOME_RECENT).map((a) => (
              <RecordRow key={a.id} icon="send" tint="t-2"
                title={a.org_name ?? a.role_label ?? "이름 없음"}
                note={APPLY_SAY[a.state]}
                actions={
                  <Link className="cm-btn" href="/me/apply">지원 기록</Link>
                } />
            ))}
          </ul>
        </>
      ) : null}
      {/* 홈 화면에 설치(PWA). 설치할 수 있는 브라우저에서만 선다(`install-card.tsx`) */}
      <InstallCard lang={en ? "en" : "ko"} />
    </CmShell>
  );
}

/**
 * 쪽 제목. **이름을 넣지 않는다**(§5). 상태마다 이 쪽이 무엇인지가
 * 달라서 제목도 갈린다: 검사 전에는 받을 것의 이름이고, 끝낸 뒤에는
 * 지금 들고 있는 것의 이름이다.
 */
/** 결과가 나오기 전 홈의 칸. 검사를 끝내면 그 자리가 내 결과로 채워진다 */
const preTiles = (t: WsSay): { href: string; icon: IconName; title: string; sub: string }[] => [
  { href: "/me/state", icon: "chart", title: t("현재 상태"), sub: t("설명할 수 있는 영역") },
  { href: "/me/next", icon: "target", title: t("지금 할 일"), sub: t("부족한 부분 메우기") },
  { href: "/me/results", icon: "report", title: t("결과 기록"), sub: t("결과지와 PDF") },
];

const headSay = (t: WsSay): Record<string, string> => ({
  NO_ASSESSMENT: t("전공 진로 검사"),
  IN_PROGRESS: t("풀던 검사가 있습니다"),
  /* 홈의 제목을 `현재 상태` 로 두지 않는다. 그 이름은 띠에 제 줄이 있는
     다른 쪽(`/me/state`)의 이름이고, 홈의 첫 카드가 그쪽의 요약이다 */
  BASIC_DONE: t("내 커리어"),
  STANDARD_DONE: t("내 커리어"),
  PRO_DONE: t("내 커리어"),
  RECOMPUTED: t("내 커리어"),
});

/** 지원 기록의 상태를 사람의 말로. **영문 코드를 화면에 내지 않는다** */
const APPLY_SAY: Record<string, string> = {
  watching: "보는 중", applied: "지원함", interview: "면접",
  offer: "합격 통보", closed: "마감",
};

/** 변화 줄의 표시. **값을 뜻하지 않는다**: 줄 넷이 한 덩이로 읽히지
 *  않게 하는 자리이고, 차례는 `recentChangeKo` 가 정한 것을 따른다 */
const CHANGE_ICON: IconName[] = ["chart", "spark", "report"];
const CHANGE_TINT = ["", "t-2", "t-3"];

/** 할 일이 없는 사람에게 적는 까닭 한 줄 */
const noActionWhy = (t: WsSay) => t("새 경험을 적으면 현재 상태가 다시 서고 그다음 할 일이"
  + " 나옵니다.");

/** 설명할 수 있는 영역이 아직 없을 때 묶음 머리 아래에 서는 줄 */
const readyNone = (t: WsSay) => t("지원서에서 설명할 만한 경험이 아직 없습니다. 관심이 높은"
  + " 영역에서 짧게 한 번 해 보는 것이 다음 걸음입니다.");

/** 날짜. 한국어는 받은 글자(`YYYY-MM-DD`) 그대로이고 영어는 `Oct 24, 2026` 이다 */
function daySay(s: string | null | undefined, lang: WsLang): string | null {
  if (!s) return s ?? null;
  if (lang !== "en" || !/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  const d = new Date(`${s.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

/** 영어판 전공 이름. **모르면 `null`** 이다(`majorNameOf` 와 같은 규칙) */
function majorEn(core: string | null | undefined): string | null {
  if (!core) return null;
  try { return majorNameIn(core, "en") || null; } catch { return null; }
}

/** 등급 이름. 한국어 화면은 코드를 그대로 적어 왔다 */
function tierSay(tier: string, lang: WsLang): string {
  if (lang !== "en") return tier;
  return ({ BASIC: "Basic", STANDARD: "Standard", PRO: "Pro" } as Record<string, string>)[tier] ?? tier;
}

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

/* 첫 카드에 올리는 묶음과 차례는 `studentStateView` 가 든다(R30): 근거가 선
   영역 → 정리가 덜 된 영역 → 둘 다 없으면 관심이 높은 영역 */

/**
 * 영역 칸의 아이콘(규격 §6).
 *
 * **값을 뜻하지 않는다.** 열두 영역이 한 줄에 셋씩 설 때 서로 구별되게
 * 하는 표시이고, 영역마다 고정이라 새로고침해도 같은 자리에 같은 그림이
 * 선다. 여기 없는 코드는 기본 모양으로 간다.
 */
/**
 * **표시를 코드 번호로 정하지 않는다**(CROSS-CORE §5).
 *
 * 전에는 이 자리가 `TD01: gear` 한 표였고 **스무 Core 가 그것을 같이
 * 썼다.** TD01 은 Core 마다 다른 일이라, 경영전략·기획과 간호 사정과
 * 소프트웨어 설계가 모두 기어를 들었다. 지금은 그 영역이 어느 갈래인지를
 * 사전이 적고 이 화면은 갈래를 글리프로 옮기기만 한다.
 */

/** 경험 종류를 사람의 말로. **표의 코드를 화면에 내지 않는다** */
const KIND_KO = new Map(EXPERIENCE_KINDS.map((k) => [k.code as string, k.label]));
/* 열쇠가 `EXPERIENCE_KINDS` 의 이름과 글자까지 같아서 한국어는 그대로 나간다 */
const kindSay = (t: WsSay): Record<string, string> => ({
  course: t("수업"), assignment: t("과제"), capstone: t("캡스톤·설계 과제"),
  research: t("연구·실험"), paper: t("논문·학회"), internship: t("인턴·현장실습"),
  project: t("개인·동아리 프로젝트"), work: t("직장 경험"), credential: t("자격·교육 이수"),
});
void KIND_KO;

void ZONE_TITLE_KO;


