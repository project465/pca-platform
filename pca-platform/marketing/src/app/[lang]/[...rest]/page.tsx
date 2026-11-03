import { notFound } from "next/navigation";

/**
 * 없는 주소를 그 언어의 404 로 보낸다.
 *
 * 쪽이 `app/[lang]` 아래에만 있어서, 이 자리가 없으면 `/en/xyz` 가 언어를
 * 모르는 Next 기본 404(흰 바탕에 영문 한 줄)로 떨어진다.
 */
export default function Rest() {
  notFound();
}
