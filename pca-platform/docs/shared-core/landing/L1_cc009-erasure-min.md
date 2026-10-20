# 착지 요청 L1 · 파기 최소 범위 (CC-009) — 승인 요청 · **미발송**

| | |
|---|---|
| 요청 | `src/lib/erasure.ts` 의 지우는 목록(`REMOVE`)과 탈퇴 화면 묶음(`ERASE_GROUPS`)에 `v3_experiences` 를 더한다 |
| 패치 | [`proposed/cc009-l1.patch`](../proposed/cc009-l1.patch) · 1파일 +6/−1 |
| 승인 | 총괄 PM · 사업주(개인정보) |
| 분류 | 공통 코드(2구역) · **DB 스키마 변경 없음** · 마이그레이션 없음 |

## 왜

탈퇴(익명화) 뒤에도 작업공간에 적은 경험의 **제목과 한 줄(`note_text`)이 그대로 남는다.** 둘 다 자유입력이라 본문에
사람이 들어간다. Core R38 이 재현했고(ER-REPRO-2) 배재 3차가 독립으로 같은 것을 찾았다(D9). 배재 GM 패치 01 은
이 줄을 `gm_inputs` 로 한 벌 더 베끼므로, L1 없이 01 이 들어가면 사본만 지워지고 원본이 남는다.

## 증거 (공통 관문 `scripts/shared-core/gate.sh` · `evidence/R40/gate/`)

| 줄 | 결과 |
|---|---|
| 지금 코드 | ER-REPRO-2 통과 = **원본이 남는 것이 재현된다** · `user_id` 표 34 가운데 어디에도 없는 표 20 |
| 수정 사본 (L1 · L2 · L3 함께) | ER-FIX-1a 통과(파기 뒤 `v3_experiences` 0줄) · 어디에도 없는 표 19 · ER-G 통과(탈퇴 화면 묶음에 그 표가 있다) · 걸림 0 |
| 음성 대조 | 패치 없이 FIX 모드로 돌리면 ER-0 · ER-REPRO-5 · ER-FIX-1a 가 걸린다 (`evidence/R40/neg-l1.log`) |
| 보호 묶음 | 수정 사본 11/11 · 측정 동결 그대로 |

## 영향

| 기관 · 가지 | 이 파일 | 패치 적용 확인 (`git apply --check`) |
|---|---|---|
| 운영 `claude/amazing-thompson-w3f2o2` | `4f02d79b` 와 같음 | OK |
| 배재 `claude/happy-faraday-q85c13` | 같음 (GM 패치 01 이 같은 파일의 다른 자리를 고친다 — 차례: **L1 먼저**) | OK |
| 전주 `feature/jju-campus` | 같음 | OK |
| 세종 `claude/epic-galileo-lrvgxr` · `claude/ecstatic-cori-sv6lh5` | 같음 | OK |

사용자 쪽: 탈퇴 화면의 `적어 주신 경험과 설정` 묶음이 그 기록까지 지운다고 바르게 적게 된다. 굳은 결과(`v3_snapshots`)와
응답은 지금처럼 남는다(사람과 이어지지 않는 응답 · 점수).

## 배포 · 되돌림

- 배포 차례: 앱만. 마이그레이션 없음
- 되돌림: `git apply -R` 후 재배포. **지운 줄은 되살아나지 않는다** — 파기의 성질이다
- NOT VERIFIED: 실제 `pg` 트랜잭션 되돌림(shim 은 autocommit) · 탈퇴 화면(`/my/account`)을 거친 브라우저 경로 · 운영 DB

## 이 요청이 하지 않는 것 (L4 로 남김)

`v3_applications` · `campus_students` 학번 · `career_profiles` · `career_events` 의 분류, `purge_after` 기한 집행 명령.
분류는 사업주 · 법률 결정이 먼저다 (R39 6절).
