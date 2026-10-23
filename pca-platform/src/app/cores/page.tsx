import Link from "next/link";
import { requireUser } from "@/lib/session";
import { coresForMarket } from "@/lib/me-v3/core-registry";
import { currentAttempt, v3Grants } from "@/lib/me-v3/runtime/session";
import { campusAttemptState } from "@/lib/campus/attempt-state";
import { campusStudentContext } from "@/lib/campus/students";
import "../surface.css";
import "../me/platform.css";
import { CmShell, CmHead } from "../me/shell";
import { DomainTile, PickCard, PickGrid, PrimaryActionHero, SectionHeader } from "../me/ui";
import type { IconName } from "@/components/sf/icon";

export const metadata = { title: "전공 Core · CareerMatri" };

/**
 * 전공 Core 고르기.
 *
 * **이 화면이 있는 까닭.** 검사를 바로 열면 사용자는 CareerMatri 를
 * `기계공학 검사 한 벌` 로 읽는다. 전공마다 Core 가 따로 있고 지금은 기계
 * 공학이 열려 있다는 것을 **첫 화면에서** 보여야, 전기전자 학생이 왜
 * 자기 것이 없는지 알고 열리는 날 돌아온다.
 *
 * **준비 중인 Core 를 눌러 404 로 보내지 않는다.** 등록부가 `planned` 로
 * 적어 둔 것은 자리를 잡아 둔 상태가 맞고, 그 자리에는 지금 없는 것과
 * 그 까닭이 적힌다.
 */
/** 담당자가 읽는 계열 이름. 등록부의 `family` 는 안쪽 코드다 */
const FAMILY_ORDER: [string, string, IconName, "b" | "c" | "v" | "w"][] = [
  ["STEM", "공학 · 자연과학", "spark", "b"],
  ["BUSINESS", "경상", "chart", "w"],
  ["HUMANITIES_SOCIAL", "인문 · 사회 · 교육", "users", "v"],
];

export default async function Cores() {
  const user = await requireUser();
  const open = await currentAttempt(user.id);
  const grants = await v3Grants(user.id);
  const cores = coresForMarket("KR");
  const live = cores.filter((c) => c.status === "building" || c.status === "live");
  const planned = cores.filter((c) => c.status === "planned");
  /**
   * **학교가 발급한 계정은 학교 쪽 문으로 보낸다.**
   *
   * 이 쪽의 `검사 시작` 은 개인 회원의 길이다. 학교 학생이 그 길로 들어가면
   * 응시에 학교와 학과가 적히지 않고 등급도 학교 계약이 정한 것이 아니어서,
   * **담당자 화면이 그 학생을 세지 못하고** 그 결과가 같은 학과의 나머지와
   * 한 표에서 읽히지 않는다. 가입 쪽에서 이미 막아 둔 것과 같은 자리다.
   *
   * **여기서 짐작해 적지 않는다.** 하는 일은 학교가 적어 준 학과로 가는 길
   * 하나를 세우는 것뿐이고, 응시에 학교를 적는 자리는 전과 같이
   * `openAttempt()` 하나다(설계 원칙 10).
   */
  const mine = await campusStudentContext(user.id);
  /* 학교 학생의 단추는 그 학생의 응시 상태가 정한다: 결과를 받은
     학생에게 `시작하기` 를 세우지 않는다(누르면 지난 결과로 돌아간다) */
  const st = mine ? await campusAttemptState(user.id) : null;

  return (
    /* **로그아웃이 이 쪽에도 선다.** 학교 학생이 로그인하면 처음 닿는 자리가
       여기인데, 실용 줄이 없어 나가는 길이 계정 쪽에만 있었다 */
    <CmShell active="/cores" title="검사" who={user.name}>
      {/* **구조를 설명하지 않는다.** `Core` 와 `엔진` 과 `판단축` 은
          우리가 안쪽에서 쓰는 말이고, 고르는 사람에게 필요한 것은
          전공에 따라 무엇이 달라지는가 한 줄이다 */}
      <CmHead
        kicker="검사 시작"
        /* 학교 계정은 학과가 정해져 있어 고를 것이 없다. 고르라는 제목을
           세우면 학생이 어디서 학과를 바꾸는지 찾는다 */
        title={mine ? `${user.name} 학생, 안녕하세요` : "전공을 선택해주세요"}
        lead={mine ? undefined : "전공에 따라 살펴보는 경험과 기술 분야가 달라집니다."}
      />

      {/*
        **검사가 끝이 아니라는 것을 고르는 자리에서 적는다.** 전에는 이
        쪽이 전공 카드만 세워서, 읽는 사람이 CareerMatri 를 검사 한 벌로
        읽고 결과 PDF 를 받는 데까지로 생각했다. 그 뒤에 무엇이 쌓이는지를
        네 줄로 적는다.
      */}
      {open && !mine ? (
        <div className="cm-card is-wide" style={{ marginBottom: 18 }}>
          <h2>이어서 풀 응시가 있습니다 <em>{open.tier}</em></h2>
          <p>
            마지막으로 답한 문항에서 이어집니다. 다시 시작하면 앞 응답이
            두 벌 쌓이므로 이어하기로만 들어갑니다.
          </p>
          <div className="cm-acts">
            <Link className="cm-btn is-primary" href={`/v3/${open.id}`}>이어하기</Link>
          </div>
        </div>
      ) : null}

      {mine ? (
        <>
          {/* **학생 홈과 같은 면으로 연다**(전주대·원광대에 보인 화면).
              파란 Hero 가 학교·학과와 시작 단추 하나를 들고, 아래 칸이
              검사를 끝내면 열리는 자리를 보여 준다 */}
          <PrimaryActionHero
            tag="학교 계약 · 내 학과"
            tagIcon="building"
            title={`${mine.university_name} ${mine.department_name}`}
            why={open
              ? "풀던 검사가 있습니다. 마지막으로 답한 문항에서 이어집니다."
              : "학교가 적어 준 학과로 검사를 시작합니다. 결과는 그 학과 담당자의 집계에 들어갑니다."
                + " 적힌 학과가 다르면 학과 담당자에게 알려 주세요."}
            action={
              <Link className="cm-btn is-primary"
                href={open ? `/v3/${open.id}`
                  : st?.kind === "result" ? `/v3/${st.attemptId}/result`
                  : `/campus/${mine.row.university_code.toLowerCase()}/start`}>
                {open ? "이어하기 →" : st?.kind === "result" ? "결과 보기 →"
                  : st?.kind === "retake" ? "학과 확인하고 다시 시작하기 →"
                  : "학과 확인하고 시작하기 →"}
              </Link>
            }
          />
          <SectionHeader icon="chart" title="검사를 끝내면 열리는 곳"
            sub="결과가 나오면 아래 자리마다 내 결과가 채워집니다." />
          <div className="cm-tiles">
            <DomainTile href="/me/state" icon="chart" title="현재 상태" sub="설명할 수 있는 영역" />
            <DomainTile href="/me/next" icon="target" title="지금 할 일" sub="부족한 부분 메우기" />
            <DomainTile href="/me/results" icon="report" title="결과 기록" sub="결과지와 PDF" />
          </div>
        </>
      ) : (
      <>
      <SectionHeader icon="clipboard" title="사용 가능한 전공" />
      <PickGrid cols={live.length === 1 ? 1 : 2}>
        {live.map((c) => (
          <PickCard
            key={c.code}
            /* **고른 전공을 들고 간다**(규격 §20). 전에는 카드마다 같은
               `/v3/start` 를 가리켜서, 전공이 둘 열린 날부터 경영학을 누른
               사람이 기계공학으로 시작했다. 믿는 자리는 서버 하나다 */
            href={open ? `/v3/${open.id}` : `/v3/start?core=${c.code}`}
            icon="compass"
            title={c.name_ko}
            tag="지금 검사 가능"
            lead={"해 본 일과 직접 판단한 경험을 읽어 관심 분야와 "
              + "아직 준비할 것을 정리합니다."}
            meta={`관심 산업과 직무, 일하고 싶은 지역까지 이어서 볼 수 있습니다${
              grants.length === 0 ? " · 이용권이 없으면 선별 등급으로 시작합니다" : ""}`}
            cta={open ? "이어하기" : "검사 시작하기"}
            strong
          />
        ))}
      </PickGrid>
      </>
      )}

      {/* **같은 문장을 아홉 번 쓰지 않는다.** 준비 중인 Core 마다 카드를
          세우고 같은 설명을 되풀이하면, 아홉 장이 한 문단을 아홉 번 읽게
          한다. 까닭은 한 번만 적고 이름은 줄로 세운다 */}
      {/* **준비 중인 전공을 활성 메뉴처럼 보이지 않게 한다.** 지금 열린
          전공은 카드 하나뿐이고, 나머지는 눌러도 들어갈 데가 없다. 묶음
          이름을 한 단 작게 두고 이름은 조용한 줄로 눕힌다 */}
      {/* **계열로 묶어 적는다.** 서른 줄을 한 덩이로 깔면 담당자가
          `우리 단과대가 들어 있는가` 를 눈으로 세야 한다. 묶음 이름이
          있으면 그 물음에 한눈에 답한다 */}
      {/* **서른한 개를 pill 로 늘어놓지 않는다**(규격 §6). 계열마다 칸
          하나를 세우고 대표 전공 서넛만 적는다. 전부 펼치면 `준비 중` 이
          메뉴처럼 보이고, 그 순간 검사 가능한 것으로 읽힌다 */}
      {/* 학교 계정에는 세우지 않는다. 학과가 이미 정해져 있어 읽을 까닭이
          없고, `반도체공학 · 준비 중` 이 반도체 학과 학생에게 자기 검사가
          막힌 것으로 읽힌다 */}
      {mine ? null : (<>
      <SectionHeader icon="layers" tone="c" title="준비 중인 전공"
        sub="문항과 산업 자료를 그 전공을 아는 분이 써야 열립니다. 지금은 응시할 수 없습니다." />
      <PickGrid cols={3}>
        {FAMILY_ORDER.map(([fam, label, icon, tone]) => {
          const rows = planned.filter((c) => c.family === fam);
          if (!rows.length) return null;
          return (
            <PickCard
              key={fam}
              disabled
              icon={icon}
              tone={tone}
              title={label}
              tag="준비 중"
              lead={rows.slice(0, 4).map((c) => c.name_ko).join(" · ")}
              meta={rows.length > 4 ? `외 ${rows.length - 4}개 전공` : undefined}
            />
          );
        })}
      </PickGrid>
      </>)}

      {/* **긴 설명은 첫 화면에서 내린다**(규격 §9 · §15). 고르는 자리에
          필요한 것은 무엇이 달라지는가 한 줄이고, 그 뒤에 쌓이는 것은
          눌러서 읽는다 */}
      <details className="cm-fold">
        <summary>검사 뒤에 무엇이 쌓이는지 보기</summary>
        <dl className="cm-dl">
          <div>
            <dt>검사에서 받는 것</dt>
            <dd>근거가 확인된 기술영역과 아직 부족한 부분, 그리고 다음 할 일</dd>
          </div>
          <div>
            <dt>그 뒤에 쌓는 것</dt>
            <dd>새로 겪은 경험을 적고 현재 상태에 더하면 부족했던 부분이 채워집니다</dd>
          </div>
          <div>
            <dt>등급 차이</dt>
            <dd>문항 수보다 판단의 종류가 다릅니다</dd>
          </div>
          <div>
            <dt>중간에 멈춰도</dt>
            <dd>답한 것은 문항마다 저장되어 멈춘 곳에서 이어집니다</dd>
          </div>
        </dl>
      </details>
    </CmShell>
  );
}
