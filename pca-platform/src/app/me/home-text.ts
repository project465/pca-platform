/**
 * 홈(`/me`) 문구 파일(CLAUDE.md 화면 문구 규칙 8). 시안(`Main.dc.html`)과 MAT 처럼 높임은 `-요` 한 꼴이다.
 * 번역은 같은 열쇠에 `en` · `ja` 를 붙인다.
 */
import type { Txt } from "./me-text";

/** 홈(`/me`) */
export const HOME_TEXT = {
  greet: { ko: "{name}님, 이번 주에는 {what}" },
  openMat: { ko: "MAT 열기" },
  findSub: { ko: "기술영역" },
  stepsTitle: { ko: "내 취업 준비" },
  stepsOf: { ko: "5단계 중 {n}단계" },
  now: { ko: "지금" },
  done: { ko: "끝남" },

  /* 인사 줄의 할 일. 지금 단계가 정한다 */
  doStart: { ko: "검사를 시작해 보세요" },
  doFinish: { ko: "풀던 검사를 끝내 보세요" },
  doJobs: { ko: "맞는 공고를 확인해 보세요" },
  doAnalyze: { ko: "공고 1개를 분석해 보세요" },
  doExperience: { ko: "경험 1개를 적어 보세요" },
  doDraft: { ko: "지원서 초안을 만들어 보세요" },
  doTrack: { ko: "지원 현황을 확인해 보세요" },

  /* 1단계 */
  s1: { ko: "검사 결과" },
  s1Strong: { ko: "강점 {n}개" },
  s1StrongNone: { ko: "결과지 보기" },
  s1StrongNoneSub: { ko: "강점은 아직 0개예요" },
  s1Going: { ko: "검사 진행 중" },
  s1GoingSub: { ko: "{n}문항 답함" },
  s1GoingSub0: { ko: "이어서 풀기" },
  s1Start: { ko: "검사 시작" },
  s1StartSub: { ko: "걸리는 시간 {time}" },
  s1StartSubPlain: { ko: "결과가 나오면 강점이 보여요" },

  /* 2단계 */
  s2: { ko: "MAT 연결" },
  s2Jobs: { ko: "맞는 공고 {n}개" },
  s2None: { ko: "공고 보기" },
  s2NoneSub: { ko: "MAT에서 공고를 찾아요" },

  /* 3단계 */
  s3: { ko: "공고 분석" },
  s3Count: { ko: "{n}개 분석" },
  s3Gap: { ko: "채울 요건 {n}개" },
  s3Gap0: { ko: "채울 요건 없음" },
  s3None: { ko: "공고 1개 분석하기" },
  s3NoneSub: { ko: "맞는 공고에서 골라요" },

  /* 4단계 */
  s4: { ko: "파일 · 경험" },
  s4Count: { ko: "경험 {n}개" },
  s4None: { ko: "경험 1개 적기" },
  s4NoneSub: { ko: "파일을 올려도 돼요" },

  /* 5단계 */
  s5: { ko: "지원서 · 면접" },
  s5Count: { ko: "지원 {n}곳" },
  s5Interview: { ko: "면접 {n}곳" },
  s5Board: { ko: "지원 현황 보기" },
  s5None: { ko: "초안 만들기" },
  s5NoneSub: { ko: "분석한 공고로 만들어요" },
  s5NoneSubFirst: { ko: "공고를 먼저 분석해요" },

  /* 이번 주 할 일 */
  weekTitle: { ko: "이번 주 할 일" },
  weekAll: { ko: "전체 보기" },
  weekFirst: { ko: "이번 주" },
  weekThen: { ko: "그다음" },
  weekPending: { ko: "반영하지 않은 경험 {n}개" },
  weekPendingSub: { ko: "결과에 더하기" },
  weekNoneResult: { ko: "검사를 마치면 할 일이 나와요." },
  weekNone: { ko: "열린 할 일이 없어요." },
  weekAddExp: { ko: "경험 추가" },

  /* 맞는 공고 */
  jobsTitle: { ko: "맞는 공고" },
  jobsBroad: { ko: "조건을 넓힌 공고" },
  jobsAll: { ko: "전체 보기" },
  jobsNone: { ko: "맞는 공고가 아직 없어요." },
  jobsAlways: { ko: "상시" },
  jobsToday: { ko: "오늘 마감" },
  jobsSource: { ko: "공고 출처 {src}" },
} satisfies Record<string, Txt>;
