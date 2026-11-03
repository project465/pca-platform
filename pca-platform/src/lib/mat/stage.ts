import type { Zone } from "@/lib/me-v3/scoring/types";

/**
 * MAT 홈의 진단 단계 4칸(2026-11-01 대표 결정 "제안대로 해", MAT 문서 사-7).
 *
 * **화면용 계산이다.** 판정 · 채점 · 결과 모델을 바꾸지 않고, 이미 나온 영역 판정을 세어
 * 이름을 붙일 뿐이다.
 * - 탐색: 근거를 갖춘 영역(`Z1_EVIDENCE_ESTABLISHED`) 0~1개
 * - 준비: 2~3개
 * - 실행: 4개 이상
 * - 도약: 실행 기준을 넘고, 기준까지 직접 정한(`owned` 축이 있는) 영역이 2개 이상
 */
export const MAT_STAGES = ["탐색", "준비", "실행", "도약"] as const;
export type MatStage = (typeof MAT_STAGES)[number];

export function matStage(
  zoneOf: Record<string, Zone>,
  ownedDomains: string[],
): { stage: MatStage; index: number; established: string[]; owned: string[] } {
  const established = Object.entries(zoneOf)
    .filter(([, z]) => z === "Z1_EVIDENCE_ESTABLISHED").map(([d]) => d);
  const owned = ownedDomains.filter((d) => established.includes(d));
  const n = established.length;
  const index = n >= 4 && owned.length >= 2 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0;
  return { stage: MAT_STAGES[index], index, established, owned };
}

/** ISO 주차(월요일 시작). 화면 머리의 `W45` */
export function isoWeek(d = new Date()): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86_400_000 + 1) / 7);
}

/** `11월 첫째 주`. 그 달의 몇째 월요일 주인가로 센다 */
export function monthWeekKo(d = new Date()): string {
  const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const nth = Math.floor((kst.getDate() - 1) / 7);
  return `${kst.getMonth() + 1}월 ${["첫째", "둘째", "셋째", "넷째", "다섯째"][nth]} 주`;
}

/** 마감까지 남은 날(서울 기준). 날짜가 없으면 null */
export function daysLeft(closesOn: string | null, now = new Date()): number | null {
  if (!closesOn) return null;
  const today = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${closesOn}T00:00:00+09:00`).getTime() - today.getTime()) / 86_400_000);
}

export const REGION_KO: Record<string, string> = {
  "KR-CAPITAL": "수도권", "KR-CHUNGCHEONG": "충청권", "KR-YEONGNAM": "영남권", "KR-HONAM": "호남권", "KR-ETC": "그 밖",
};
export const SOURCE_KO: Record<string, string> = { work24: "고용24", jobindustry: "잡인더스트리", careerpeak: "커리어피크" };

/* ── 영어 화면(2026-11-03). 한국어 이름 표와 같은 열쇠 ── */
export const MAT_STAGES_EN: Record<MatStage, string> = { 탐색: "Explore", 준비: "Prepare", 실행: "Act", 도약: "Advance" };
export const REGION_EN: Record<string, string> = {
  "KR-CAPITAL": "Seoul area", "KR-CHUNGCHEONG": "Chungcheong", "KR-YEONGNAM": "Yeongnam", "KR-HONAM": "Honam", "KR-ETC": "Other",
};
export const SOURCE_EN: Record<string, string> = { work24: "Work24", jobindustry: "JobIndustry", careerpeak: "CareerPeak" };

/** 출처 이름 · 지역 이름을 그 언어로 */
export const sourceName = (src: string, lang: "ko" | "en" = "ko") => (lang === "en" ? SOURCE_EN : SOURCE_KO)[src] ?? src;
export const regionName = (code: string, lang: "ko" | "en" = "ko") =>
  (lang === "en" ? REGION_EN[code] ?? "Other" : REGION_KO[code] ?? "그 밖");

/** `Week 1 of November` */
export function monthWeek(lang: "ko" | "en", d = new Date()): string {
  if (lang !== "en") return monthWeekKo(d);
  const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const nth = Math.floor((kst.getDate() - 1) / 7) + 1;
  return `Week ${nth} of ${kst.toLocaleString("en-US", { month: "long" })}`;
}

/** 마감 표시(`D-3` · `오늘 마감` · `상시`) */
export function ddayLabel(left: number | null, lang: "ko" | "en" = "ko"): string {
  if (lang === "en") return left === null ? "Open" : left <= 0 ? "Closes today" : `D-${left}`;
  return left === null ? "상시" : left <= 0 ? "오늘 마감" : `D-${left}`;
}
