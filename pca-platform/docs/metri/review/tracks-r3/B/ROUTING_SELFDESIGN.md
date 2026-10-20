# Track B 2차 · 자율전공학부 두 갈래 (서버 액션 `startV3` 그대로)

- 실행: 2026-10-20T10:19Z · DB `postgres:///cm_iso_c` (격리 클러스터 5433)
- 바꿔 끼운 것: 로그인 세션 · `next/navigation` redirect · `next/headers` cookies(메모리). 나머지는 제품 코드.
- 전공 목록 화면(`/campus/pcu/majors?pick=1`)의 모양과 쿠키를 적는 학과 쪽 화면은 **NOT VERIFIED**(Next 빌드 불가).

**통과 21 · 걸림 0 / 21**

| 판정 | 확인 | 값 |
|---|---|---|
| | **PCU26_SELFDESIGN → 고른 전공 PCU26_BIZ** | |
| PASS | R1 전공을 고르기 전에는 응시를 열지 않고 학교 시작 쪽(전공 고르기 단추)으로 보낸다 | /campus/pcu/start · 응시 0 |
| PASS | R3 자율전공 자리 자체를 고른 쿠키는 받지 않는다(등록부가 응시 가능 자리로 보지 않는다) | /campus/pcu/start · 응시 0 |
| PASS | R2 고른 전공으로 응시가 열린다(시작 안내로 간다) | /v3/547/intro |
| PASS | R2 Core 는 고른 전공의 Core 다 | BIZ_CORE_V1 |
| PASS | R2 소속 학과는 자율전공학부 그대로 · 단과대학 APPENZELLER | APPENZELLER · PCU26_SELFDESIGN |
| PASS | R2 학교 응시라 PRO 로 열린다 | PRO · PCU |
| PASS | R2 쿠키는 응시에 적힌 뒤 지워진다 |  |
| PASS | R5 다른 전공을 다시 골라 눌러도 열린 응시의 전공은 그대로다 | /v3/547 · 응시 1 · BIZ_CORE_V1 |
| PASS | R4 끝까지 풀고 제출하면 결과가 선다 | scored |
| | **PCU27_SELFDESIGN → 고른 전공 PCU27_AISW_SOFTWARE** | |
| PASS | R1 전공을 고르기 전에는 응시를 열지 않고 학교 시작 쪽(전공 고르기 단추)으로 보낸다 | /campus/pcu/start · 응시 0 |
| PASS | R3 자율전공 자리 자체를 고른 쿠키는 받지 않는다(등록부가 응시 가능 자리로 보지 않는다) | /campus/pcu/start · 응시 0 |
| PASS | R2 고른 전공으로 응시가 열린다(시작 안내로 간다) | /v3/548/intro |
| PASS | R2 Core 는 고른 전공의 Core 다 | CS_CORE_V1 |
| PASS | R2 소속 학과는 자율전공학부 그대로 · 단과대학 APPENZELLER | APPENZELLER · PCU27_SELFDESIGN |
| PASS | R2 학교 응시라 PRO 로 열린다 | PRO · PCU |
| PASS | R2 쿠키는 응시에 적힌 뒤 지워진다 |  |
| PASS | R5 다른 전공을 다시 골라 눌러도 열린 응시의 전공은 그대로다 | /v3/548 · 응시 1 · CS_CORE_V1 |
| PASS | R4 끝까지 풀고 제출하면 결과가 선다 | scored |
| | **집계: 두 학생이 각자 자율전공학부 줄에 선다** | |
| PASS | 자율전공학부 응시가 학교 집계에 들어간다(전체 시작 수 ≥ 2) | 시작 2 |
| PASS | 두 자율전공 자리는 각각 한 사람이다(SQL) | 2026 1 · 2027 1 |
| PASS | 한 사람짜리 학과 칸은 수를 내지 않는다 | [] |
