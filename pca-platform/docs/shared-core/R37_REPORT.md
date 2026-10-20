# R37 보고 — Common Core 통합 지시

**최종 품질 판정은 Core PM 이 한다.** 이 보고는 PASS 를 선언하지 않는다. 운영 인증 코드 · DB 스키마 ·
기존 migration · 채점 규칙 · 등록부 · 학생 공개 상태를 한 줄도 바꾸지 않았고 다른 세션의 코드를
고치지 않았다. 배재 GM 세션에 회신을 **보내지 않았다**(초안만 저장).

## 1. 시작 · 종료 커밋과 가지

| | |
|---|---|
| 가지 | `feature/shared-core` · `claude/determined-brahmagupta-jwnqs9` (둘 다 같은 커밋 · fast-forward 만) |
| 시작 | `60f04ad8` (R36) |
| 종료 | 이 보고를 담은 커밋 (`git log -1 feature/shared-core`) |
| 운영 · 배재 가지 | `claude/amazing-thompson-w3f2o2` · `claude/careermatri-screen-review-p0c8kb` — 쓰지 않았다 |

## 2. Gate P0 + Track A~F

| Track | 구현 | 테스트 | 검증 | 차단 |
|---|---|---|---|---|
| Gate P0 | READY FOR REVIEW (미적용) | VERIFIED (shim) | READY FOR REVIEW | 승인 · 2단계 설계 · 운영 DB |
| A Assessment | — | IN PROGRESS | NOT VERIFIED | 전공자 자료 |
| B Scoring | — | VERIFIED | READY FOR REVIEW | 비정상 응답 사례 셋 |
| C Major/Role | — | IN PROGRESS | NOT VERIFIED | 내용 검토 |
| D Evidence/Gap | READY FOR REVIEW (해석 · 후보) | VERIFIED | READY FOR REVIEW | CC-006 · 파기 경로 |
| E Personalization | — | VERIFIED (기준선) | READY FOR REVIEW | CC-008 |
| F Integration | IN PROGRESS | VERIFIED (부분) | NOT VERIFIED (E2E) | npm 막힘 |

자세한 것 · 결함 우선순위 · 다음 순서: [R37_TRACKS.md](R37_TRACKS.md)

## 3. 실제로 구현한 파일과 변경 내용

`src/` 의 변경은 **한 파일**이다: `src/lib/shared-core/tenant/campus.ts` 가 읽는 법을 아는 등록부 판본
(`cm-campus-universities.5`)만 받고 모르는 판본은 `UNSUPPORTED_SCHEMA_VERSION` 으로 거절한다(판본 칸이 없는
fixture 는 받는다). 이 파일은 아직 어느 화면 · 인증에도 연결되지 않았다(SC-1 B2 가 센다).

나머지는 테스트 · 벤치마크 · 문서 · 제안 파일이다. 목록과 분류: [R37_TRACKS.md §4](R37_TRACKS.md).

## 4. 벤치마크와 재현 테스트 결과

환경: Node 22.22 `--experimental-strip-types` + `scripts/shared-core/test/register.mjs` · DB 검사는 일회용
PostgreSQL 16(`pg-sandbox.sh`, 검사마다 새로) · `SC_SHIMS=1` 이면 `pg` 는 **psql shim**(실제 패키지 아님).
npm 레지스트리가 막혀 `package.json` · lockfile 을 고치지 않고 이 길로 돌렸다.

| 검사 | 명령 (요지) | 종료 | PASS / FAIL / SKIP / TODO | 로그 | 검증하지 못한 범위 |
|---|---|---|---|---|---|
| SC-1 프로필 + 경계 | `--test tenant-profile tenant-boundary` | 0 | 33 / 0 / 0 / 0 | `evidence/R37/sc1-run.log` | 연결 뒤 동작 |
| 부분 타입 검사 | `typecheck.sh` (tsc 6.0.2 · 13 파일) | 0 | — | `typecheck.log` | **프로젝트 전체 typecheck 아님** |
| Evidence 집계 | `--test evidence-aggregation` | 0 | 5 / 0 / 0 / 0 | `evidence-aggregation.log` | GM 가지의 실제 응시 |
| 벤치마크 v1 | `bench/run.ts` | 0 | 사례 44/44 · 검사 556/556 | `bench/run.log` · `results.json` · `cases.md` | 합성 밖의 응답 · 타당성 |
| 인벤토리 | `bench/inventory.ts` | 0 | — | `bench/inventory.json` | 내용의 맞고 틀림 |
| P0 지금 코드 | `--test p0-login-collision` (shim) | 0 | 10 / 0 / 0 / 11 | `p0-current.log` | 실제 `pg` · next-auth |
| P0 수정 사본 | 같음 + `SC_EXPECT_FIX=1` · 저장소 밖 사본 | 0 | 14 / 0 / 6 / 1 | `p0-patched.log` | 같음 |
| ADJ-1 | `--test p0-demo-remark` (shim) | 0 | 6 / 0 / 0 / 0 | `p0-demo-remark.log` | 운영 DB |
| 기준시점 | `--test exp-timepoint` (shim) | 0 | 4 / 0 / 0 / 0 | `exp-timepoint.log` | PDF 실제 렌더 |
| 보호 묶음 (head) | `protect.sh . evidence/R37/protect/head` | 11 개 모두 0 | — | `protect/head/summary.tsv` | 브라우저 · E2E 검사 |
| 보호 묶음 (수정 사본) | 같음 · 사본 뿌리 | 11 개 모두 0 | — | `protect/patched-copy/summary.tsv` | 같음 |

**TODO 와 SKIP 을 PASS 에 넣지 않았다.** P0 의 켜지고 꺼지는 목록: [R37_P0_VERIFICATION.md §3](R37_P0_VERIFICATION.md).

## 5. 기존 Core 대비 개선 · 퇴행

| | |
|---|---|
| 엔진 | 채점 · 결과 모델 · 문항 · 등록부를 바꾸지 않았으므로 **엔진의 개선도 퇴행도 없다.** 보호 묶음 11 개의 종료코드가 R36 head 와 같다 |
| 검사 범위 | P0 시험 17 → 21 (FIX-8~10 · RISK-1) · SC-1 27 → 33 · 새 Evidence 5 · 기준시점 4 · ADJ-1 1 → 6 · 벤치마크 0 → 44 사례 |
| 검사 자신의 결함 | 벤치마크가 처음에 틀린 셈을 셋 했고(K5 · C05 · 객체 비교) v1 에서 하나 더(C08 의 `||` 묶음) 고쳤다 — [R37_BENCHMARK.md §5](R37_BENCHMARK.md). P0 의 FIX-10 · RISK-1 이 지금 코드에서 빈 통과하던 것을 전제 단언으로 막았다 |
| 새 동작 | 모르는 등록부 판본을 거절한다. 판본을 올릴 때 `KNOWN_CAMPUS_SCHEMAS` 에 한 줄을 같이 더해야 한다 |

## 6. 실제 출력 사례와 결함 근거

- **판정은 다른데 글이 같다** — ME C01(여덟 축 확인) · C07(심화 축 넷 무응답) · C08(J4 `없다`) 셋이 머리글
  `기구·제품 설계 과제에서 방향을 직접 정해 본 일이 있어요` 와 첫 할 일 `최근 기구·제품 설계 과제 하나. 개념안 몇
  개를 둘지와 … BOM에 한 줄씩 남깁니다.` 가 글자까지 같다. 스냅샷 `empty` 는 C07 `J1 J2 J4 J8` · C08 `J4` 로
  정확히 갈리고 결과지 빈자리는 셋 다 `J3:PARTIAL_EVIDENCE` 하나다 → CC-008
- **과장하지 않는다** — C04(근거 없이 `직접 결정` 주장): 머리글 `기구·제품 설계 과제는 해 봤고, 정리만 남았어요` ·
  소유 축 0 (근거 둘 미만이면 소유로 올리지 않는다, K3)
- **근거 중복** — BIZ 사례: 고유 26 · `did` 25 · 네 목록 합 32 · CS TD01 `요구 목록` 저장 2 행 · `did` 1
- **계정이 넘어간다** — REPRO-4: rotate 뒤 같은 `users.id` · 이름 `가상 A → 가상 B` · 학교 `PCU → ZZTEST` ·
  소속 `[PCU, ZZTEST]` · 앞 학생 비밀번호 죽음 · 앞 학생 응시가 새 소유자에게 보임
- **시연 재표시** — ADJ-1b: `{"demo":false,"listed":1}` → `{"demo":true,"listed":0}`
- **기준시점** — TP-1 스냅숏 `2a58f66b…` 네 번 같음 · TP-2 live `d7517139 → df756eaf → b48d4612 → d7517139`

## 7. 동결 · 채점 · DB 계약 보호

| | 결과 |
|---|---|
| `v2:frozen` (Q1~Q92 포함 12 파일) | 어긋난 자리 0 |
| `v3:freeze:measure` | `ME_V3_MEASUREMENT_FREEZE_1` 과 같다 · **기록을 다시 적지 않았다** |
| 검사 화면 · 결과지 · 작업공간 동결 | 21 · 25 · 53 벌 그대로 |
| `v3:scoring` ME · BIZ · EE · CS | 각 31/31 · `GOLDEN=update` 없이 |
| `db:chain` · `campus:check` | 8/8 · 80/80 |
| 보호 경로 diff | 0 줄 (`evidence/R37/protected-diff.txt`) |
| 지문 | `db-chain.json` `9688a926…` · `campus-universities.json` `b029cf0a…` (R36 과 같다) |
| 응시 등급 BASIC 48 · STANDARD 68 · PRO 92 (ME_V2) | `v2:frozen` 이 지킨다 · 손대지 않았다 |
| 새 기관 ID | 없음 (PCU · ZZTEST 만) |

## 8. 승인 대기

| 항목 | 분류 | 승인 |
|---|---|---|
| SC-2 1단계 패치 `proposed/sc2-p0.patch` | AUTH/IDENTITY | 총괄 PM · 사업주 · 배재 |
| SC-2 2단계(기관 코드 로그인) 설계 | AUTH/IDENTITY | 총괄 PM · 본체 |
| ADJ-1 별도 SQL 을 upgrade 맨 뒤에 | DB/API CONTRACT | 총괄 PM · 배재 |
| 탐지 SQL 을 운영에서 한 번 | 운영 (읽기만) | 운영자 |
| CC-006 경험 기준시점 (A1 · A2) | DB/API CONTRACT | 총괄 PM · 사업주 · 배재 |
| CC-007 GM 입구 · 런타임 파일 | DEPLOYMENT/INFRA | 사업주 · 총괄 PM |
| CC-008 결과지 빈자리 범위 | ASSESSMENT/SCORING CONTRACT | 총괄 PM |
| 배재 GM 회신을 보낼지 | — | 사업주 |

## 9. NOT VERIFIED

- 프로젝트 **전체** typecheck (부분 13 파일만) · 실제 `pg` 패키지(전부 shim) · 실제 next-auth · JWT
- 브라우저 · PDF 실제 렌더 · 운영 배포본 · 운영 DB
- GM 가지의 실제 27 행 응시(같은 모양을 이쪽에서 재현했다)
- 학생이 제출 전에 경험을 적는 비율(CC-006 A1 의 영향)
- 파기 · `purge_after` 집행 경로 (정적 grep 으로만 봤다)
- 벤치마크의 학술 타당성 · 실제 직무 추천 정확성 (합성 사례다)
- Track A · C 의 내용 (구조만 셌다)

## 10. 다음 회차 우선순위

[R37_TRACKS.md §5](R37_TRACKS.md) 그대로: P0-1 · P0-2 승인 판단(두 번째 학교 명단 전) → 운영 탐지 SQL →
회신 전달 여부 → CC-006 · 파기 경로 → CC-008 → npm 이 열리는 환경에서 전체 typecheck · 실제 `pg` · E2E →
Track A · C 내용 검토.
