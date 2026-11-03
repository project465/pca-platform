/**
 * 담당자 화면(`/org`) 문구 파일(CLAUDE.md 화면 문구 규칙 8). 번역은 같은 열쇠에 `en` · `ja` 를 붙인다.
 * 기관(진흥원 등) 낱말은 화면이 `sayTree` 로 바꾼다. 여기는 학교 낱말로 적는다. 높임은 `-습니다` 한 꼴.
 */
import type { Txt } from "../me/me-text";

/** 진단 집계(`/org/v3`) */
export const ORG_V3_TEXT = {
  scopeFail: { ko: "이 계정의 기관이 학교 등록부에 없어 자료를 내려받지 못했습니다. 집계 화면은 그대로 쓸 수 있습니다. 계속 안 되면 고객지원에 문의하면 됩니다." },
  extraStudents: { ko: "명단에 없는 학생 {n}명이 학교 전용 주소로 들어와 검사를 시작했습니다. 이 학생들도 대상자에 들어 있습니다." },
  collegeNote: { ko: "학교 전용 주소로 들어온 응시입니다. 막대는 대상자 가운데 결과 받음 · 푸는 중입니다" },
  watchNone: { ko: "주의가 필요한 학과가 없습니다. 기준: 시작한 학생 5명 이상, 끝내지 않은 학생이 남은 학과." },
  zoneTitle: { ko: "기술영역 분포" },
  zoneNote: { ko: "학생 한 명마다 영역이 12개입니다" },
} satisfies Record<string, Txt>;
