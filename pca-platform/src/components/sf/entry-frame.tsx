import type { ReactNode } from "react";
import BrandHome from "@/components/sf/brand-home";
import { Icon, type IconName } from "@/components/sf/icon";
import { entrySay } from "@/lib/entry-say";
import "@/app/entry.css";

/**
 * 처음 닿는 쪽들(문 고르기 · 로그인 · 가입 · 비밀번호 찾기)의 틀.
 *
 * **학생 작업공간 홈과 같은 톤으로 선다**(전주대·원광대에 보인 화면).
 * 전에는 입구가 흰 바탕에 카드 하나뿐이라, 로그인하고 나서야 남색 띠와
 * 파란 면이 나타나 **들어오기 전과 후가 다른 서비스**처럼 보였다. 왼쪽
 * 남색 판은 작업공간의 왼쪽 띠(`--cm-rail-bg`)와 같은 색이고, 그 안의 색
 * 칸 셋은 홈의 영역 타일과 같은 기울기다.
 *
 * **값을 지어내지 않는다.** 왼쪽 판이 드는 것은 이 서비스가 하는 일 세
 * 가지뿐이고 숫자나 실적을 적지 않는다.
 */
const STEPS: { icon: IconName; title: string; sub: string }[] = [
  { icon: "layers", title: "해 본 일 확인", sub: "직접 정한 것과 받아서 한 것을 나눠 봅니다" },
  { icon: "compass", title: "산업·직무 연결", sub: "확인된 경험이 이어지는 자리를 찾습니다" },
  { icon: "target", title: "다음 할 일", sub: "비어 있는 자리를 메우는 한 가지를 냅니다" },
];

export default function EntryFrame({
  children, top, lang,
}: {
  children: ReactNode;
  /** 오른쪽 위 한 줄(언어 고르기 등) */
  top?: ReactNode;
  /** 왼쪽 판의 언어. 오른쪽 본문과 같은 언어로 선다(영어판 2단계) */
  lang?: string | null;
}) {
  const t = entrySay(lang);
  return (
    <div className="en">
      <aside className="en-side">
        <BrandHome className="en-brand" />
        <p className="en-tag">{t("전공과 경험으로 찾는 내 커리어")}</p>
        <ul className="en-steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <span className="en-step-ico"><Icon name={s.icon} size={18} /></span>
              <span className="en-step-txt"><b>{t(s.title)}</b><small>{t(s.sub)}</small></span>
            </li>
          ))}
        </ul>
        <p className="en-note">{t("대학·기관 계정과 개인 계정이 같은 화면을 씁니다.")}</p>
      </aside>
      <div className="en-main">
        {top ? <div className="en-top">{top}</div> : null}
        <div className="en-body">{children}</div>
      </div>
    </div>
  );
}
