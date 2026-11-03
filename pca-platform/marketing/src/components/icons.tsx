/**
 * 홈페이지가 쓰는 선 아이콘 한 벌.
 *
 * 앱(`src/components/sf/icon.tsx`)과 같은 결(24 칸 · 선 1.8 · 둥근 끝)로
 * 그렸다. 패키지를 들이지 않은 까닭은 홈페이지가 쓰는 그림이 스무 개
 * 남짓이라서다. 글자 옆에 서는 장식이므로 늘 `aria-hidden` 이다.
 */
const P: Record<string, string> = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.2 4.2L19 7",
  chevron: "M9 6l6 6-6 6",
  down: "M6 9l6 6 6-6",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  clipboard: "M9 4h6v3H9zM8 5H6a1 1 0 00-1 1v13a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-2M9 12h6M9 16h4",
  doc: "M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5M9 13h6M9 17h6",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  target: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01",
  users: "M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a3.5 3.5 0 00-3-3.46M15.5 4.2a3 3 0 010 5.6",
  upload: "M12 15V4M7.5 8.5L12 4l4.5 4.5M5 15v4a1 1 0 001 1h12a1 1 0 001-1v-4",
  download: "M12 4v11M7.5 10.5L12 15l4.5-4.5M5 15v4a1 1 0 001 1h12a1 1 0 001-1v-4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  key: "M15 7a4 4 0 11-3.9 4.9L4 19v2h3v-2h2v-2h2l1.1-1.1A4 4 0 0115 7zM16 9h.01",
  pause: "M12 21a9 9 0 100-18 9 9 0 000 18zM10 9v6M14 9v6",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  refresh: "M20 11a8 8 0 00-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0014.6 4.5L20 16M20 20v-4h-4",
  link: "M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1",
  shield: "M12 3l7 3v6c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3zM9 12l2 2 4-4",
  bell: "M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zM10 20a2 2 0 004 0",
  pencil: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  compare: "M8 4v16M16 4v16M4 8h8M12 16h8",
  swap: "M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4",
  calendar: "M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM4 10h16M8 3v4M16 3v4",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  phone: "M5 4h3l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v3a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z",
  building: "M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16M15 9h4a1 1 0 011 1v11M3 21h18M8 8h3M8 12h3M8 16h3",
  cap: "M2 9l10-5 10 5-10 5L2 9zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  cog: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7.7 7.7 0 00-1.7-1L15 3h-4l-.3 2.6a7.7 7.7 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1a7.7 7.7 0 001.7 1L11 21h4l.3-2.6a7.7 7.7 0 001.7-1l2.4 1 2-3.4-2-1.6z",
  cube: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9",
  wave: "M3 12h3l2-5 4 10 3-7 2 2h4",
  spark: "M13 3L5 14h6l-1 7 8-11h-6l1-7z",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
  home: "M4 11l8-7 8 7M6 9.5V20h12V9.5",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 20, stroke = 1.8, className }: {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={P[name]} />
    </svg>
  );
}

/** 공식 상표. 파일 하나(`/brand/mark.svg`)를 읽는다. 앱과 같은 그림이다 */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/mark.svg" width={size} height={size} alt="" className="brandmark-img" />
  );
}
