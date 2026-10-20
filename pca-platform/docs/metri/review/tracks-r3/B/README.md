# Track B 3차 · 학과 — 2026 · 2027 전 학과 · 자율전공 두 갈래 · 학과별 결과

## 실제 구현

- 이 회차에 Track B 콘텐츠와 코드는 고치지 않았다(2차가 학과 콘텐츠 · 갈래 다섯 층을 채웠다). 아래는 **3차 변경
  (Track C 의 제출 · 저장 수정, Track F 의 접근 기록) 뒤에 학과 115 자리를 다시 끝까지 밟은 회귀**다.
- 18 Core 번역 메뉴 판본 변경: **Core 승인 요청만** 유지(`../../tracks-r2/B/CORE_REQUEST_TRANSLATE.md` · 바꾸지 않음).

## 테스트 증거

| 검사 | 결과 | 로그 · 표 |
|---|---|---|
| `trackB-dept-e2e.ts` — 배재대 2026 · 2027 자리 117 = 검사 대상 115 + 전공 고르기 2: 학교 등록 → 학교 맥락 응시 → 끝까지 답함 → 제출 → 결과 모델 · 판본 · 학교/학과 표시 | **115 / 115** · 전체 153 / 153 · 학생별 결과 갈림 **19 / 19 Core** | `logs/trackB-dept-e2e.log` · `DEPT_E2E.md` |
| `trackB-content.ts` — 같은 Core 의 학과 짝 176: 먼저 읽는 영역 · 산업 · 역할 · 근거 예시 · 행동 제안 · Gap | GENERIC **0** · 개편 계보 후보 6 · Gap 갈림 19/19 · 사람 갈림 19/19 | `logs/trackB-content.log` · `DEPT_CONTENT.md` · `dept-content.json` |
| `trackB-routing.ts` — 자율전공 `PCU26_SELFDESIGN → PCU26_BIZ` · `PCU27_SELFDESIGN → PCU27_AISW_SOFTWARE` (서버 동작 `startV3` 그대로) | **21 / 21** | `logs/trackB-routing.log` · `ROUTING_SELFDESIGN.md` |

**같은 Core 안에서 Evidence/Gap 이 학과에 따라 갈리지 않는 것은 설계다**(측정 동결). 학과마다 갈리는 것은 갈래
다섯 층이고, 그 여섯 칸이 거의 같은 짝은 0 이다.

## BLOCKED

- 2026/2027 공식 교육과정 원문 대조: `www.pcu.ac.kr` CONNECT 403(네트워크 정책). 계보 후보 6 의 확정도 같은 까닭으로 보류.

## NOT VERIFIED

- 학과 고르기 · 학교 시작 · 결과 화면(브라우저) · 모바일.
- 학과 근거 예시 · 행동 제안이 그 전공에서 실제로 나오는 경험인지(전공자 검토).

## 다음 행동

1. CI 승인 뒤 `pcu:coverage`(브라우저 · 자리 115) 를 러너에서.
2. 공식 원문에 닿는 자리에서 계보 6 확정 · 교육과정 대조.
3. 전공자 검토(대표 학과 열 · `docs/metri/PCU_REVIEW_PACK.md`).
