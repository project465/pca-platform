/**
 * CareerMatri 공식 Primary Logo Mark.
 *
 * **출처는 파일 하나다**: `public/brand/careermatri/mark.svg`.
 * 왼쪽 띠 · 손전화 머리띠 · 로그인 · 검사 · 결과지 · 계정이 전부 이
 * 컴포넌트를 거쳐 그 한 파일을 읽는다. 모양을 쓰는 자리에서 다시
 * 그리면 두 벌이 되고, 두 벌은 어느 날 갈려 한 제품이 두 상표로 선다.
 *
 * **글자로 대신하지 않는다.** 전에는 `CM` 두 글자를 네모에 넣은 자리와
 * 사다리 아이콘을 원에 넣은 자리와 아무것도 없는 사각형이 따로 있었다.
 * 셋 다 임시 표시였고, 이어서 누르면 서로 다른 서비스로 읽혔다.
 */
export const BRAND_MARK_SRC = "/brand/careermatri/mark.svg";

export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <img
      src={BRAND_MARK_SRC}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className ? `sf-mark ${className}` : "sf-mark"}
      /* **비율을 고정한다.** 띠가 좁아지는 자리에서 flex 가 이 칸을
         줄이면 상표가 타원이 된다 */
      style={{ width: size, height: size, flex: `0 0 ${size}px` }}
    />
  );
}
