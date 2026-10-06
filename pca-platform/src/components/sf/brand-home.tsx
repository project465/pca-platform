import Link from "next/link";
import type { ReactNode } from "react";
import { currentUser } from "@/lib/session";
import { homePathFor } from "@/lib/roles";
import { BRAND } from "@/lib/surface-text";

/**
 * 로고와 브랜드 글자를 **하나의 홈 링크**로 그린다.
 *
 * 머리띠의 로고는 어느 제품에서나 홈으로 가는 자리인데, 여기서는 글자만
 * 서 있거나(`<span>`) 엉뚱한 쪽을 가리키고 있었다(가격표의 로고가 상품
 * 쪽으로 갔다). 로고를 눌러도 아무 일이 없으면 **처음 온 사람은 돌아갈
 * 길을 머리띠에서 못 찾는다.**
 *
 * **면이 섞이지 않는다.** 가는 곳은 지금 서 있는 제품 화면이 정한다:
 * 개인은 `/my`, Campus 는 `/org`, Admin 은 `/admin`. `href` 를 주지
 * 않으면 세션을 읽어 역할의 첫 화면으로, 로그인하지 않았으면 공개
 * 홈(`/start`)으로 간다. **눌러서 면이 바뀌면** 기관 담당자가 자기
 * 좌석 화면 대신 개인 화면으로 떨어진다.
 *
 * `onClick` 으로 밀어내지 않고 `<Link>` 하나다. 그래야 키보드로 닿고,
 * 가운데 단추로 새 탭에 열 수 있고, 서버에서 그린 주소와 브라우저가 보는
 * 주소가 같아 hydration 이 어긋나지 않는다.
 */
export default async function BrandHome({
  href,
  sub = null,
  className,
}: {
  /** 갈 곳. 주지 않으면 세션을 읽어 정한다 */
  href?: string;
  /** 브랜드 글자 아래 붙는 면 이름 (`Campus` · `Admin`) */
  sub?: ReactNode;
  className?: string;
}) {
  let to = href;
  if (!to) {
    const user = await currentUser();
    to = user ? homePathFor(user.role) : "/start";
  }
  return (
    <Link href={to} className={className ? `sf-brand ${className}` : "sf-brand"}>
      <span className="sf-brand-mark" aria-hidden="true">CM</span>
      <span className="sf-brand-name">
        {BRAND.root}
        {sub ? <span className="sf-brand-sub">{sub}</span> : null}
      </span>
    </Link>
  );
}
