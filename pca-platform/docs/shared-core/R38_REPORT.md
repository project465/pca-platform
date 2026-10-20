# R38 보고 — 콘텐츠 무결성 · 파기 재현 · 기관 회신

**최종 판정은 Core PM 이 한다.** 이 보고는 PASS 를 선언하지 않는다. 운영 배포 · 운영 DB · 인증 · DB 스키마 ·
migration · `db-chain.json` · 채점 · 측정 · 결과 모델 · 등록부 · 학생 공개 상태를 **한 줄도 바꾸지 않았다**
(보호 경로 diff 0). 다른 세션에 아무것도 보내지 않았다.

## 1. 가지 · 커밋 · 상태

| | |
|---|---|
| 가지 | `feature/shared-core` · `claude/determined-brahmagupta-jwnqs9` (같은 커밋 · fast-forward 만) |
| 시작 | `c4f39cdf` (R37) — `4f02d79b` 의 자손임을 확인 · 원격 두 가지 모두 `c4f39cdf` |
| 종료 | 이 보고를 담은 커밋 (`git log -1 feature/shared-core`) |
| 패키지 확인 | `99_SHA256_MANIFEST.txt` 131/131 일치 · `R37_REFERENCE` 122 파일이 저장소 HEAD 와 **바이트까지 같다** — 참고로만 읽고 덮어쓰지 않았다 |
| 변경 파일 · 해시 | `docs/shared-core/evidence/R38/FILES.sha256` |

## 2. 실행한 명령 (종료코드 · PASS / FAIL / SKIP / TODO 를 섞지 않는다)

환경: Node 22.22 `--experimental-strip-types` + `scripts/shared-core/test/register.mjs` · DB 검사는 일회용
PostgreSQL 16(검사마다 새로) · `pg` 는 **psql shim**(실제 패키지 아님). npm 레지스트리가 막혀 있어 `package.json` ·
lockfile 을 고치지 않고 이 길로 돌렸다. 로그는 전부 `docs/shared-core/evidence/R38/`.

| 검사 | 종료 | PASS | FAIL | SKIP | TODO | XFAIL | 로그 |
|---|---|---|---|---|---|---|---|
| 보호 묶음 (전 · 후) | 11 개 모두 0 | — | — | — | — | — | `protect/{before,after}/summary.tsv` (전후 같음) |
| SC-1 + 경계 | 0 | 33 | 0 | 0 | 0 | — | `sc1-run.log` |
| Evidence 집계 | 0 | 5 | 0 | 0 | 0 | — | `evidence-aggregation.log` |
| P0 SC-2 (지금 코드) | 0 | 10 | 0 | 0 | 11 | — | `p0-login-collision.log` |
| P0 ADJ-1 | 0 | 6 | 0 | 0 | 0 | — | `p0-demo-remark.log` |
| 경험 기준시점 | 0 | 4 | 0 | 0 | 0 | — | `exp-timepoint.log` |
| **P0-C 파기 (새)** | 0 | 6 | 0 | 0 | 3 | — | `p0-erasure.log` |
| R37 벤치마크 재실행 | 0 | 556 | 0 | — | — | — | `bench/results.json` — **R37 과 바이트까지 같다** |
| **콘텐츠 무결성 (새)** | 0 | 398 (+ 회귀 2) | 0 | — | — | **8** | `content/integrity.{json,md,log}` |
| **무결성 자기 검사 (새)** | 0 | 6/6 (일부러 넣은 결함을 잡음) | — | — | — | — | `content/selftest.log` |
| **페르소나 × Core (새)** | 0 | 16 | 0 | — | — | — | `content/personas.{json,md,log}` |
| 부분 타입 검사 (19 파일) | 0 | — | — | — | — | — | `typecheck.log` — **프로젝트 전체 typecheck 아님** |

SC-2 수정 사본(14 PASS / 6 SKIP / 1 TODO)은 R37 결과를 그대로 둔다: 패치와 인증 코드가 R37 과 같아 다시 돌리지 않았다.

## 3. 재현된 문제 / 독립 제안에서만 다룬 문제

| 지금 코드에서 재현된 것 (엔진 · 제품 그대로) | 독립 제안 코드에서만 다룬 것 (제품 미연결) |
|---|---|
| 파기가 `v3_experiences` · `campus_students`(학번) · `v3_applications` 를 남긴다 · `user_id` 표 20 이 어느 목록에도 없다 · `purge_after` 집행 0 | 세 범주 출력(`three-way.ts`)이 답하지 않은 축을 `미확인` 으로 · 후보 근거를 강점 밖으로 둔다 |
| 답하지 않은 필수 축이 `아직 없습니다` 로 선다 (BIZ · CS C07) | 개선 문단 넷(S1~S4) — 근거 ID · 추론 경계 · 금지 주장 |
| 판정이 다른데 머리글 · 할 일이 같다 6/20 (C07 · C08) | 근거 수 표시 CN-001 (원시 고유 · 확인 · 후보) |
| 네 목록 합 32 vs 고유 26 (GM 방식의 중복) | — |
| (정적) 비밀번호 찾기 `LIMIT 1` 에 차례 없음 | — |

**엔진이 잘 지키는 것도 적는다**: 44 사례에서 후보 근거가 `did` · `decided` · 머리글로 샌 것 0 · Gap↔Action↔영역
연결 끊김 0 · Gap 종류와 축 상태 모순 0 · 결핍 말(`부족` 등) 0 · 산업 · 역할 말이 팩 밖에서 온 것 0.

## 4. 구현한 것 / 문서만 쓴 것

| 실제 코드 (`scripts/shared-core/` 안 · 기존 동결 fixture 변경 0) | 문서만 |
|---|---|
| `content/integrity.ts` OUT-1 · OUT-2 · OUT-3 · OUT-5 · 연결 그래프 · 자기 검사 | `R38_OUTPUT_CONTENT_QA.md` |
| `content/three-way.ts` CC-008 독립 실험 · `content/personas.ts` · `content/sample-ids.ts` | `R38_TRACKS.md` · 이 보고 |
| `p0-erasure.test.ts` (실제 `anonymizeUser`) | `CONTRACTS.md` 상태 표 · CC-006 · CC-008 · **CC-009** · **CN-001** |
| `bench/keys.ts` · `fixtures/evidence.ts` (R37 코드를 옮겨 공용 · 결과 바이트 같음) | 회신 초안 넷 |
| `test/shims/pg.mjs` — `SC_SHIM_TX=autocommit` 일 때만 원자성 없는 클라이언트(기본 동작 그대로) | |

## 5. 증거 종류를 섞지 않는다

| 종류 | 이번 회차 |
|---|---|
| 합성 벤치마크 | 44 사례 · 페르소나 16 — 규칙 일치율이고 실제 추천 정확성이 아니다 |
| 실학생 비식별 분석 | **0 건** (자료를 받지 않았다) |
| 전공 내용 타당성 검사 | **0 건** (전공자 검토 없음) |
| 기관 실제 PDF · 화면 | **0 건** |

## 6. 문장 개선 — 전 / 후 (하나만 옮긴다 · 넷 전부는 `R38_OUTPUT_CONTENT_QA.md`)

- **전** (엔진 · BIZ-C07): `경영전략·기획 · 받은 요구를 어떤 조건으로 옮겼는지가 아직 없습니다`
- **후** (제안): `경영전략·기획에서 받은 요구를 조건으로 옮긴 경험은 이번 검사에서 답하지 않아 판단하지 않았습니다. … 함께 고르신 두 항목은 그 확인 뒤에 근거로 씁니다.`
- **근거 ID**: `EV-TD01-J2-9d68` · `EV-TD01-J2-2fc8` (후보) · 스냅샷 `TD01.J2.missing = SKIPPED`
- **바꾼 까닭**: 미응답과 부재가 같은 말로 읽힌다(Gap calibration 1 → 3)
- **금지 과장**: `요구 해석 능력이 부족합니다` · `이 경험이 없습니다` · 후보를 확인된 경험으로

이 제안은 **제품 문장을 바꾸지 않았다**(CC-008 승인 대상).

## 7. 기관 회신 (전부 미발송)

| 파일 | 대상 | 판정 |
|---|---|---|
| `handoffs/R38_PCU_gm-evidence-cc006-cc008.md` | 배재 GM | 세는 법 PASS(합성) · PDF NV · 기준시점 CONDITIONAL · 빈자리 XFAIL |
| `handoffs/R38_MAIN_p0-identity-erasure.md` | 본체 | 재현 PASS(shim) · 운영 NV · **STOP 권고** |
| `handoffs/R38_JJU_status.md` | 전주대 | NOT VERIFIED (자료 없음) · P0 STOP 권고 |
| `handoffs/R38_SEJONG_status.md` | 세종 | NOT VERIFIED · 참여자 확장 STOP |

## 8. Core PM 검수 요청

1. CC-009 파기 · 기한 — 표 20 분류와 집행 명령(본체 · 사업주)
2. CC-008 세 범주 안과 S1 · S2 개선 방향 — 결과 계약 변경 승인 여부
3. CC-006 A2 와 종이 두 칸 표기 — CC-009 뒤 순서
4. CC-002 1단계 · CC-002a — 두 번째 기관 명단 전
5. R38 콘텐츠 무결성 검사를 Core 회귀 묶음에 둘지(지금은 `scripts/shared-core/` 안 독립 검사)

## 9. NOT VERIFIED · STOP GATE

- **STOP 유지**: P0(신원 · ADJ-1 · 파기) 미해결 → 두 번째 기관 실학생 명단 · 운영 전환 금지 권고
- NV: 실제 `pg` · next-auth · 브라우저 · 운영 DB · 운영 배포본 · 프로젝트 전체 typecheck
- NV: 기관 PDF · 화면 · 비식별 응시 · GM 27 행 원본
- NV: 파기 실패 때의 되돌림(autocommit shim) · 비밀번호 찾기 차례의 실제 재현
- NV: 문항 타당성 · 전공 내용 · 기업 · 지역 · 시장 사실 · 실제 취업 성과
- 측정 routing 변경(세종 참여자) STOP
