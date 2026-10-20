# 세종 Track 작업판

한 장으로 둔다. 상태는 다섯 칸으로만 적고, 칸마다 **증거**가 있어야 채운다.

`CODE` = CODE COMPLETE · `AUTO` = AUTOMATED TEST PASS · `BROWSER` = BROWSER VERIFIED ·
`HUMAN` = HUMAN REVIEW PASS · `—` = NOT VERIFIED · `BLOCKED` = 막힘(까닭 적음)

**자동 검사가 통과했어도 `BROWSER` 와 `HUMAN` 이 비어 있으면 상품 품질 승인이 아니다.**
지금 `BROWSER` 는 전부 **CI 러너 안의 headless Chromium(localhost)** 기준이다. Staging 주소에서
사람이 본 것은 아직 하나도 없다.

## 0. 보존하는 기준선

| 항목 | 값 |
|---|---|
| 가지 | `claude/epic-galileo-lrvgxr` (기준 커밋 `0bff307c`) |
| CI 기준 실행 | GitHub Actions `sejong-verify` run 39393453011 · 커밋 `c038cb51` (잡 둘: verify · staging-rehearsal 모두 통과) |
| 세종 분석 | 23 / 23 |
| 브라우저 E2E | 33 / 33 (30 + 무단 접근 3) — standalone 서버와 운영 이미지 컨테이너 양쪽 |
| DB · 권한 | 16 / 16 |
| 공통 파일 변경 | 0 |
| 기존 회귀 16종 | **14 통과 · 2 걸림.** `golden:check` · `evidence:check` 는 기준 커밋 `0bff307c` 에서도 똑같이 걸린다(세종 이전부터). **"전체 회귀 PASS" 라고 적지 않는다.** 세종 때문에 새로 걸린 것 0 |

## 1. Track 상태

| Track | CODE | AUTO | BROWSER | HUMAN | 남은 것 |
|---|---|---|---|---|---|
| **A 플랫폼·UX** (홈 · 검사 화면 · 경험 입력 · 결과 · 탐색 · 모바일) | ✔ | ✔ 화면 200 · 390px 가로 넘침 0 | ✔ CI 캡처 22장 (사람에게 아직 전달 안 됨) | — | 캡처를 사람이 보는 경로(Staging) · 디자인 검수 |
| **B 검사·분석** (24문항 · 저장 · 이어하기 · 결과 · 경험 반영) | ✔ | ✔ 분석 23/23 | ✔ 24문항 · 새로고침 12/24 유지 · 제출 → '경험으로 확인됨' | — | **DEMO 유지** (`SJ_JOBSEEKER_DEMO_V0`, 인지 면접·예비 검사 전) · 개인별 결과 차별화 측정 |
| **C 관리자·보안** (사업 · 참여자 · 상담사 · PDF 상태 · 동의 · 권한 · 격리) | ✔ | ✔ DB·권한 16/16 | ✔ 상담사 동의·배정 경계 · 역할 차단 · 5명 미만 가림 · 계정 발급. 무단 접근 3줄 통과(남의 응시 주소 · 구직자의 상담사 화면 · 로그인 없는 PDF) | — | **기관 간 격리**: 시연 기관이 하나뿐이라 두 기관 사이는 아직 못 쟀다 |
| **D 개인별 PDF** | 11쪽 판 ✔ | ✔ PDF 200 · 11쪽 · 렌더 기록 | ✔ (CI) | — | 11쪽 판은 **기능 검증용**으로만 둔다. 최종 보고서는 아래 4절 기준으로 따로 설계 · 지금은 손대지 않는다(Staging 우선) |
| **E 지역 산업·기업** | 35곳 PREVIEW ✔ | ✔ 탐색에 '채용 중' 0 · '채용 여부 미확인' 표시 | ✔ (CI) | — | 공식 원문 재확인 0곳(`display_ready: false` 전부). 이 환경은 공식 사이트에 닿지 못한다 |
| **F Staging·통합 E2E** | 계획·시드·리허설 ✔ | ✔ 운영 이미지 리허설 6/6 | ✔ 컨테이너에 대고 E2E 33/33 (러너 안 · 접속 주소 아님) | — | **BLOCKED: Railway 프로젝트 생성 승인 대기** (유료 자원) |

## 2. P0 — Staging 개통 (Track F)

이 세션이 할 수 있는 것은 끝까지 했다. **남은 것은 사람이 Railway 에서 누르는 것뿐이다.**

| 점검 | 상태 | 증거 |
|---|---|---|
| 별도 Railway 프로젝트 | BLOCKED (승인 대기) | `STAGING_PLAN.md` 1~2절 |
| 세종 전용 테스트 PostgreSQL · 공개 접속 끔 | BLOCKED (같음) | 같음 2-2 |
| 세종 가지 연결 · 운영 Dockerfile 빌드 | ✔ 리허설: 이미지 빌드 · `/api/health` 200 | `sejong-verify` → `staging-rehearsal` 잡 |
| 운영·배재대와 격리 | 설계 ✔ · 시드가 실사용자 있는 DB 에서 스스로 멈춤 ✔ (로컬 · 리허설) | `db/sejong/seed_sejong_demo.sql` 머리 |
| 접근 제한 (Basic 인증 · noindex · 비공개 DEMO) | ✔ 리허설: 인증 없이 401 · 인증 200 · `X-Robots-Tag: noindex` · 헬스만 열림 | 리허설 `access gate` 줄 |
| 컨테이너 안 DB 세우기 · 시드 | ✔ 리허설: `db:init` → 세종 스키마 → 시드(참여자 21) · 안전장치 둘 | — |
| 실제 브라우저 사용자·관리자 | ✔ 리허설 컨테이너에 대고 E2E 33/33 · PDF(알파인 Chromium) · **Staging 주소에서는 개통 뒤** | — |

**리허설이 하는 일**: Railway 가 굽는 것과 같은 운영 `Dockerfile` 로 이미지를 굽고, `APP_ENV=staging` ·
Basic 인증으로 띄운 뒤, 계획서 6번 차례(컨테이너 안 `db:init` → 세종 스키마 → 시드)를 그대로 밟고,
그 컨테이너에 대고 브라우저 E2E 와 PDF(알파인 Chromium)를 돌린다. 리허설은 러너 안에서만 뜨므로
**접속 주소가 아니다.**

## 3. 파일 책임 (충돌 방지)

| 파일 | 주인 Track | 다른 Track 이 고칠 때 |
|---|---|---|
| `src/app/sejong/**` 화면 · `src/app/sejong/sejong.css` | A | 그 화면의 데이터 자리만 B·C 가 고치고 A 가 통합 확인 |
| `src/sejong/lib/analysis.ts` · `src/sejong/content/instrument.*` | B | 문항·분석을 바꾸면 B 가 `analysis-check` 23 을 다시 돌린다 |
| `src/sejong/lib/{session,access,metrics}.ts` · `src/app/sejong/{admin,counselor}/**` | C | 권한 조건을 바꾸면 C 가 `db-check` 와 E2E 무단 접근 줄을 다시 돌린다 |
| `src/sejong/lib/{report,store}.ts` · `src/sejong/ui/report-doc.tsx` · `src/app/sejong/report/**` | D | `store.ts` 는 B·C 도 읽는다 → 고치면 E2E 전체 |
| `src/sejong/content/{orgs.preview,org-links.demo,region.sejong}.json` · `docs/sejong/data/` | E | 표시 규칙(채용 미확인)은 A 와 함께 확인 |
| `.github/workflows/sejong-verify.yml` · `scripts/sejong/**` · `db/sejong/**` · `docs/sejong/STAGING_PLAN.md` | F | 통합 회귀는 F 가 돌린다 |
| 공통 Core (`src/lib/**` · `db/schema*.sql` · `sites/**` · `deploy/**`) | **세종 세션이 고치지 않는다** | `COMMON_CORE_CHANGE_REQUEST.md` 로 Core 세션에 넘긴다 |

## 4. Track D 기준 (2026-10-20 정정)

- **ChatGPT 로 만든 `CareerMatri_SEJONG_GoldMaster_93p.pdf` 는 Gold Master 가 아니다.** 내용·디자인 품질이
  승인되지 않았으므로 템플릿·목차·분량의 기준으로 쓰지 않는다. 93쪽에 맞출 필요도 없다.
- **현재 11쪽 PDF** = 기능 검증용(검사 → 결과 → PDF 생성·기록이 도는가). 납품용 보고서가 아니다.
- **최종 PDF 기준 여덟**: ① 실제 응답·Evidence 기반의 깊이 있는 개인 진단 ② 검증된 세종 산업·기업·직무
  정보 ③ 경력·경험 수준에 따른 차별화 ④ 실제 업무 상황과 직무별 요구 역량 ⑤ 개별 기업·직무에 이어지는
  구체적 준비 전략 ⑥ 자기소개서·포트폴리오·면접 활용 ⑦ Annual Report 수준의 편집 디자인 ⑧ 출처·검증
  상태·해석 한계 명시.
- **분량** 70~90쪽 목표. 쪽 수를 채우려는 반복·허위 자료는 금지.
- **차례**: 전체를 만들기 전에 **핵심 10쪽**(분석 내용과 디자인)을 실제 PDF 로 만들어 Human Review 를 받는다.
- **참고 결과지 68쪽 두 벌**은 내용의 깊이와 구성 방식만 참고한다. 그 점수·판정·개인정보는 가져오지 않는다.
- 공통 검사·채점 엔진은 고치지 않는다. 필요한 변경은 `COMMON_CORE_CHANGE_REQUEST.md` 로 Core 세션에 넘긴다.
- **지금은 착수하지 않는다.** Track F(Staging 개통)가 먼저다.

