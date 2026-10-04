/**
 * 선 아이콘 한 벌.
 *
 * 밖에서 아이콘 꾸러미를 받아 오지 않는다. 메뉴와 빈 자리에 쓰는 것이
 * 열대여섯 개뿐이라, 의존성 하나를 들이는 값이 그림 열여섯 개보다 비싸다.
 *
 * **이모지를 쓰지 않는다.** 글꼴에 따라 색과 크기가 멋대로 바뀌고,
 * 운영 화면에서 장식으로 읽힌다.
 */
import type { SVGProps } from "react";

export type IconName =
  | "home" | "clipboard" | "report" | "layers" | "send" | "user"
  | "grid" | "users" | "group" | "seat" | "compass" | "ladder"
  | "doc" | "contract" | "gear" | "building" | "box" | "cart"
  | "globe" | "window" | "log" | "spark" | "lock" | "alert";

const P: Record<IconName, string> = {
  home: "M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9.5Z",
  clipboard: "M7 3h6v2H7V3Zm-2 2h2m8 0h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2M7 9h6M7 12h4",
  report: "M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v3h3M7 11h6M7 14h4",
  layers: "M10 3 3 7l7 4 7-4-7-4Zm-7 7 7 4 7-4m-14 4 7 4 7-4",
  send: "M3 10l14-6-5 14-3-6-6-2Z",
  user: "M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 7a6 6 0 0 1 12 0",
  grid: "M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm8 0h6v6h-6v-6Z",
  users: "M7.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 0a2 2 0 1 0 0-4m-11 8a5 5 0 0 1 10 0m1-5a4 4 0 0 1 3 4",
  group: "M4 7h5v5H4V7Zm7 2h5v8h-5V9ZM4 14h5v3H4v-3Z",
  seat: "M5 4h10a1 1 0 0 1 1 1v6H4V5a1 1 0 0 1 1-1Zm-1 7h12v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4Z",
  compass: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm2.5-9.5-1.6 4L7 13l1.6-4L13 7.5Z",
  ladder: "M6 3v14m8-14v14M6 7h8M6 11h8M6 15h8",
  doc: "M5 3h7l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v3h3M7 10h6M7 13h6",
  contract: "M5 3h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 4h6M7 10h6m-6 3h3",
  gear: "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm7-2.5-1.6-.4a5.4 5.4 0 0 0-.5-1.2l.9-1.4-1.4-1.4-1.4.9a5.4 5.4 0 0 0-1.2-.5L11 4H9l-.4 1.6a5.4 5.4 0 0 0-1.2.5l-1.4-.9L4.6 6.6l.9 1.4a5.4 5.4 0 0 0-.5 1.2L3 10v2l1.6.4a5.4 5.4 0 0 0 .5 1.2l-.9 1.4 1.4 1.4 1.4-.9a5.4 5.4 0 0 0 1.2.5L9 17h2l.4-1.6a5.4 5.4 0 0 0 1.2-.5l1.4.9 1.4-1.4-.9-1.4a5.4 5.4 0 0 0 .5-1.2L17 12v-2Z",
  building: "M4 17V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v12M12 9h3a1 1 0 0 1 1 1v7M6 7h4M6 10h4M6 13h4M3 17h14",
  box: "M10 3 3 6.5v7L10 17l7-3.5v-7L10 3Zm0 0v14M3 6.5l7 3.5 7-3.5",
  cart: "M3 4h2l2 8h8l2-6H6m2 10.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  globe: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm-7-7h14M10 3c2 2.2 2 11.8 0 14M10 3c-2 2.2-2 11.8 0 14",
  window: "M3 5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5Zm0 3h14M6 6.4h.01M8.2 6.4h.01",
  log: "M4 4h12M4 8h12M4 12h8M4 16h8",
  spark: "M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6L10 3Z",
  lock: "M6 9V7a4 4 0 0 1 8 0v2m-9 0h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z",
  alert: "M10 4l7 12H3l7-12Zm0 4v4m0 2.5h.01",
};

export function Icon({
  name, size = 16, ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      {...rest}
    >
      <path d={P[name]} />
    </svg>
  );
}
