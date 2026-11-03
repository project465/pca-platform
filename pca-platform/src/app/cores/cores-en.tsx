import Link from "next/link";
import EntryFrame from "@/components/sf/entry-frame";
import { Icon } from "@/components/sf/icon";
import PublicFooter from "@/components/sf/public-footer";
import LogoutButton from "@/components/logout-button";
import { entrySay } from "@/lib/entry-say";
import type { IconName } from "@/components/sf/icon";

export type CoreChoice = { code: string; name: string; minutes: string };

/**
 * 해외 개인의 전공 고르기(영어판 2단계).
 *
 * **작업공간 틀(`CmShell`)을 쓰지 않는다.** 그 틀의 메뉴는 아직 한국어
 * 한 벌인 작업공간으로 가고, 영어로 들어온 사람은 그 메뉴에서 한국어를
 * 만난다. 입구와 같은 틀(`EntryFrame`)에 서서, 할 수 있는 일만 둔다:
 * 이어하기 · 결과 보기 · 전공 골라 시작하기 · 로그아웃.
 *
 * **고를 수 있는 전공은 영어 원고가 다 있는 것뿐이다.** 시장이 여는 이공계
 * Core 가 열여섯이어도, 영어 원고가 없는 Core 를 고르면 응시가 한국어로
 * 열린다(`localeFor`). 고르는 자리에서부터 빼 둔다.
 */
export default function CoresEn({
  cores, openId, resultId,
}: {
  cores: CoreChoice[];
  openId: string | null;
  resultId: string | null;
}) {
  const say = entrySay("en");
  const icons: Record<string, IconName> = {
    ME_CORE_V3: "compass", EE_CORE_V1: "spark", CS_CORE_V1: "layers",
  };
  return (
    <>
      <EntryFrame lang="en" top={<LogoutButton className="sf-btn ghost sm" label={say("로그아웃")} />}>
        <p className="en-kicker">{say("검사 시작")}</p>
        <h1 className="en-h1">
          {openId ? say("이어서 풀 응시가 있습니다")
            : resultId ? say("결과가 나와 있습니다")
            : say("전공을 선택해주세요")}
        </h1>
        <p className="en-sub">
          {openId ? say("마지막으로 답한 문항에서 이어집니다.")
            : resultId ? say("검사 당시 결과는 고정돼 있어 언제든 다시 열립니다.")
            : say("전공에 따라 살펴보는 경험과 기술 분야가 달라집니다.")}
        </p>

        <ul className="en-doors">
          {openId ? (
            <li>
              <Link href={`/v3/${openId}`} className="en-door is-primary">
                <span className="en-door-ico"><Icon name="clipboard" size={24} /></span>
                <span className="en-door-txt"><b>{say("이어하기")}</b></span>
                <span className="en-door-go"><Icon name="chev" size={20} /></span>
              </Link>
            </li>
          ) : resultId ? (
            <li>
              <Link href={`/v3/${resultId}/result`} className="en-door is-primary">
                <span className="en-door-ico"><Icon name="report" size={24} /></span>
                <span className="en-door-txt"><b>{say("결과 보기")}</b></span>
                <span className="en-door-go"><Icon name="chev" size={20} /></span>
              </Link>
            </li>
          ) : (
            cores.map((c) => (
              <li key={c.code}>
                <Link href={`/v3/start?core=${c.code}`} className="en-door">
                  <span className="en-door-ico"><Icon name={icons[c.code] ?? "compass"} size={24} /></span>
                  <span className="en-door-txt">
                    <b>{c.name}</b>
                    <span>{say("무료 기본 검사")} · {say("약 {min}분 · 저장되며 진행됩니다", { min: c.minutes })}</span>
                  </span>
                  <span className="en-door-go"><Icon name="chev" size={20} /></span>
                </Link>
              </li>
            ))
          )}
        </ul>

        {!openId && !resultId ? (
          <p className="en-foot">{say("유료 등급(Standard · Pro)은 아직 한국 밖에서 결제할 수 없습니다.")}</p>
        ) : null}
      </EntryFrame>
      <PublicFooter lang="en" compact />
    </>
  );
}
