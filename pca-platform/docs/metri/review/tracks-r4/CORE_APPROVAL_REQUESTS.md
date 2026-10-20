# 4차 승인 요청 — 전 트랙 통합 (A · B · C · D · E · F)

작성 2026-10-20 · 받는 사람: 본체 총괄 PM · Core · 사업주.
**이 회차는 아래 어느 것도 수행하지 않았다**(공통 금지: Q1~92 · BASIC48/STANDARD68/PRO92 측정·채점 · 공통 Core · DB/API 계약 · 인증 ·
PDF 엔진 · 브랜치 병합 · 인프라 생성·배포 · 운영 DB/Production). 승인이 오면 그 항목만 따로 수행하고 증거를 남긴다.

PCU 승인 영역(이 회차가 바꾼 것 — 승인 없이 한 것)과 외부 승인 영역(아래 표)을 가른다:

- **PCU 영역에서 한 것**: 실험 경로의 편집 렌더러 두 판(`report-gm/editorial*.ts` · `render7.ts` · `render8.ts`) · 직무 안내 자료
  `data/report-gm/biz-editorial.v1.json` · 뽑기·검사 스크립트(`scripts/lab/gm-ed*.ts` · `trackE-r4.ts`) · 문서. **운영 PDF 경로 · 학생 화면 · DB 는 그대로다.**
- B · C · D · F 에서 코드 변경 0(각 README §1).

## 1. Track A · E (이 회차 새로 생김)

| # | 승인 받을 것 | 담당 | 위험 | 풀리는 것 | 근거 |
|---|---|---|---|---|---|
| E-1 | **글꼴 묶음에 Noto Serif KR 추가**(Bold · SemiBold · Medium OTF + LICENSE, SIL OFL 1.1, 합 약 30MB 미만) — 운영 렌더러 이미지 또는 런타임 볼륨 | PM · Core | 낮음 — 라이선스 OFL(묶어 배포 가능). 이미지 크기 증가. 대신 `font-noto-cjk` 를 쓰면 글자 폭이 달라져 넘침 검사를 다시 돌려야 함 | 4차 2판(매거진판) 제목 · 번호 글꼴 | `pdf-gm/v11-magazine/STYLE_GUIDE.md` §4 · `E/README.md` |
| E-2 | **3차 패키지 01~04 적용**(공통 DB · 권한 · 파기 · 다운로드 경로 · 런타임) — 03 의 render 단계를 `edit8 → pages8 → html8` 로 바꾸어 | PM · Core | 중간 — 공통 영역 변경. 학생 배포 플래그 OFF · 담당자 개인 PDF 기본 거절은 그대로 | 학생별 GM PDF 운영 연결 | `../tracks-r3/E/APPROVAL_PACKAGE.md` · `E/README.md` |
| A-1 | **Track A 2판 사람 검수**(쪽별 메모의 ‘약함’ 6쪽 판단 · 표지/정리 가운데 여백 수용 여부) | 사업주 · 사람 검수자 | 없음(검수) | Track A PASS 판정 | `pdf-gm/v11-magazine/HUMAN_REVIEW.md` |
| A-2 | **참고 이미지 전달**(4차 명령이 말한 “사용자가 전달한 참고 이미지” — 이 세션에 첨부되지 않음) | 사업주 | 없음 | 이미지 대조 · 편집 기준 확정 | `STYLE_GUIDE.md` §0 |
| A-3 | 직무 안내 문장(장면 · 조직 유형 · 결과물 양식) 전공 교수 · 현직자 검토 | 사업주 | 낮음 | 직무 일반 서술의 정확성 | `HUMAN_REVIEW.md` §3 |

## 2. Track B · C · D · F (3차부터 이어짐, 상세는 `CORE_APPROVAL_REQUESTS_BCDF.md`)

| # | 승인 받을 것 | 담당 | 위험 |
|---|---|---|---|
| A1 | CI 워크플로 `pcu-verify` 추가(`contents: read` 하나 · 일회용 DB · 합성 계정) | PM | 낮음 |
| A2 | Railway Staging 생성(운영과 분리 · 새 Postgres · 평소 0 replica) | PM · 사업주(비용) | 중간 |
| A3 | API 계약 `c5f22344` 운영 병합(`{ok:false}` 확장 · 반환 꼴 그대로) | PM | 낮음 |
| A4 | (선택) `ok:false` 에 `reason` 칸 · 다른 탭 제출 안내 | PM | 낮음 |
| A5 | 파기 목록에 `v3_experiences` 추가 · `erasure.ts` 가 `purgeGm*` 를 부름 | Core · PM | 중간 |
| A6 | `eligible()` 학부 `"ME"` 고정(`routing.ts:247`) — 경영학 학부 대학원생 거절 | 사업주 | 중간 |
| A7 | 자율전공 학생이 고른 전공을 기억하는 칸(DB 변경) | 사업주 · Core | 중간 |
| A8 | 재응시 상품 줄 `CM_V3_CAMPUS_PRO` 를 Staging · 운영에 `db:upgrade` | PM · 사업주 | 낮음 |
| A9 | 등록부 Catalog `verification` 올리기(공식 원문 대조 뒤) · 계보 후보 6 확정 | 사업주 → Core | 낮음 |
| A10 | KODATA 학생 배포 권리 · 처리방침 GM 반영 · 학교 계정 동의 절차 | 사업주 · 법률 | 높음 |
| A11 | 실험 HTML 잔재 `var/pdf-gm/gm-student-*.html` 5개 정리 | Track E · PM | 낮음 |
| **A12** | **경험 번역 메뉴를 ME · BIZ 밖 18 Core 로 넓히기**(`student/translate.ts` · 검사 화면 동결 안) — 2차부터 승인 대기, 이 회차에도 적용하지 않음(18 Core 는 중립 벌 그대로) | Core · PM | 중간 — 검사 화면 판본 갱신 |

## 3. 권고 차례

A-2(참고 이미지) → A-1(사람 검수) → E-1 · E-2 →
A1 → A3 → A2 → (A2 위에서) 브라우저 13걸음 · A8 → A5 · A10 → 배포 게이트 재판정.
A6 · A7 · A9 · A12 는 출시 게이트와 따로 사업주 · Core 판단.
