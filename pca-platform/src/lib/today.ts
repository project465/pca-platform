/** 인사말 옆에 붙는 오늘 날짜. 예: 2026.10.20 (화) */
export function todayLabel(): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}.${p.month}.${p.day} (${p.weekday})`;
}
