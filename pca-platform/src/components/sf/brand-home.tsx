import Link from "next/link";
import type { ReactNode } from "react";
import { currentUser } from "@/lib/session";
import { homePathFor } from "@/lib/roles";
import { marketingHome } from "@/lib/urls";
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
 * 개인은 `/my`, Campus 는 `/org`, Admin 은 `/admin`. **눌러서 면이
 * 바뀌면** 기관 담당자가 자기 좌석 화면 대신 개인 화면으로 떨어진다.
 *
 * **로그인하지 않았으면 앱 밖으로 나간다.** 아직 손님이 아닌 사람에게
 * 이 자리는 제품이 아니라 서비스를 설명하는 홈페이지
 * (`careermatri.com`)다. 앱은 가입·결제·응시·결과를 맡고 홈페이지는
 * 설명과 영업을 맡는다. 주소는 `site_configs` 에서 읽고
 * (`marketingHome()`), 가리킬 자리가 없으면 앱 안의 문 고르는
 * 쪽(`/start`)으로 되돌린다.
 *
 * **같은 탭에서 간다.** 새 탭으로 열면 뒤로 가기가 끊기고, 돌아오려는
 * 사람이 창을 닫아 버린다. 세션도 두 사이트 사이에서 공유하지 않는다:
 * 홈페이지는 로그인을 모른다.
 *
 * `onClick` 으로 밀어내지 않는다. 앱 안이면 `<Link>`, 밖이면 `<a>` 하나라
 * 키보드로 닿고 가운데 단추로 새 탭에 열 수 있으며, 서버에서 그린 주소와
 * 브라우저가 보는 주소가 같아 hydration 이 어긋나지 않는다.
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
    to = user
      ? homePathFor(user.role)
      : (await marketingHome().catch(() => null)) ?? "/start";
  }
  const cls = className ? `sf-brand ${className}` : "sf-brand";
  const inside = (
    <>
      <span className="sf-brand-mark" aria-hidden="true">CM</span>
      <span className="sf-brand-name">
        {BRAND.root}
        {sub ? <span className="sf-brand-sub">{sub}</span> : null}
      </span>
    </>
  );
  /* 앱 밖으로 나가는 주소는 `<Link>` 가 미리 받아 올 것이 없다. 같은
     탭이라 `target` 을 붙이지 않는다 */
  return /^https?:\/\//i.test(to)
    ? <a href={to} className={cls}>{inside}</a>
    : <Link href={to} className={cls}>{inside}</Link>;
}
