import Link from "next/link";
import { requireUser } from "@/lib/session";
import { coresForMarket } from "@/lib/me-v3/core-registry";
import { currentAttempt, v3Grants } from "@/lib/me-v3/runtime/session";
import "../surface.css";
import "../me/platform.css";
import { CmShell, CmHead } from "../me/shell";
import { PickCard, PickGrid, SectionHeader } from "../me/ui";
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

  return (
    <CmShell active="/cores" title="검사">
      {/* **구조를 설명하지 않는다.** `Core` 와 `엔진` 과 `판단축` 은
          우리가 안쪽에서 쓰는 말이고, 고르는 사람에게 필요한 것은
          전공에 따라 무엇이 달라지는가 한 줄이다 */}
      <CmHead
        kicker="검사 시작"
        title="전공을 선택해주세요"
        lead="전공에 따라 살펴보는 경험과 기술 분야가 달라집니다."
      />

      {/*
        **검사가 끝이 아니라는 것을 고르는 자리에서 적는다.** 전에는 이
        쪽이 전공 카드만 세워서, 읽는 사람이 CareerMatri 를 검사 한 벌로
        읽고 결과 PDF 를 받는 데까지로 생각했다. 그 뒤에 무엇이 쌓이는지를
        네 줄로 적는다.
      */}
      {open ? (
        <div className="cm-card is-wide" style={{ marginBottom: 18 }}>
          <h2>이어서 풀 응시가 있습니다 <em>{open.tier}</em></h2>
          <p>
            마지막으로 답한 자리에서 이어집니다. 다시 시작하면 앞 응답이
            두 벌 쌓이므로 이어하기로만 들어갑니다.
          </p>
          <div className="cm-acts">
            <Link className="cm-btn is-primary" href={`/v3/${open.id}`}>이어하기</Link>
          </div>
        </div>
      ) : null}

      <SectionHeader icon="clipboard" title="사용 가능한 전공" />
      <PickGrid cols={live.length === 1 ? 1 : 2}>
        {live.map((c) => (
          <PickCard
            key={c.code}
            href={open ? `/v3/${open.id}` : "/v3/start"}
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
            <dd>문항 수가 아니라 판단의 종류가 다릅니다</dd>
          </div>
          <div>
            <dt>중간에 멈춰도</dt>
            <dd>답한 것은 문항마다 저장되어 멈춘 자리에서 이어집니다</dd>
          </div>
        </dl>
      </details>
    </CmShell>
  );
}
