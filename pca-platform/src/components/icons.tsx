/**
 * 화면에 쓰는 선 아이콘. 외부 아이콘 패키지 없이 24×24 경로만 둔다.
 * 색은 currentColor 를 따른다.
 */
const PATHS = {
  home: "M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9",
  building: "M4 21V5l8-3v19M12 8h8v13M8 7v.01M8 11v.01M8 15v.01M16 12v.01M16 16v.01M2 21h20",
  contract: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  calendar: "M4 6h16v15H4zM4 10h16M9 3v4M15 3v4",
  users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.87M15.5 3.13a3.5 3.5 0 0 1 0 6.75",
  upload: "M12 15V3M7 8l5-5 5 5M4 15v5h16v-5",
  pencil: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  report: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h3",
  key: "M15 7a4 4 0 1 1-3.87 5H8v3H5v-3H3v-3h8.13A4 4 0 0 1 15 7zM16 11h.01",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5 10 17l9-10",
  mark: "M5 19V5l7 8 7-8v14",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
