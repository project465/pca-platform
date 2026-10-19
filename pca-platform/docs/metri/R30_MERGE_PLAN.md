# R30/R31 → 운영 브랜치 통합 계획

**지금은 통합하지 않는다.** 운영 브랜치 `claude/amazing-thompson-w3f2o2` 는
Railway 가 매 커밋을 `feisty-generosity / production`(`app.careermatri.com`)에
바로 배포한다. 통합은 Human Review 와 상용화 검증이 끝나고 **사업주가 승인한
뒤** 아래 절차로만 한다.

## 1. 브랜치 상태 (2026-10-19)

| 브랜치 | 머리 | 역할 |
|---|---|---|
| `claude/amazing-thompson-w3f2o2` | `02b6c610` | 운영(Railway 자동 배포). **직접 수정·푸시 금지** |
| `claude/careermatri-screen-review-p0c8kb` | `9151fd71` | R30/R31 개발. 운영 머리를 **이미 품고 있다**(merge `9151fd71`) |

- 갈린 지점 `1df2dde8`(R29). 운영 쪽이 그 뒤에 더한 것은 `02b6c610` 하나이고 **코드 0줄**, 캡처 PNG 넉 장이다. 작업 브랜치로 가져왔다.
- 겹치는 파일 0. 역방향(dev → ops) dry-run merge: **충돌 0 · 42 files · +1604 / −157**, fast-forward 가능.
- 데이터 계약 diff 0: `db/` · `deploy/` · 문항 은행 지문 · 측정 동결 · `scoring/` · 결과 모델. **마이그레이션 없음.**

## 2. 통합 전까지 지키는 것

1. 운영 브랜치에 새 커밋이 오면 **작업 브랜치로 merge 한다**(rebase 하지 않는다. 운영 쪽 역사를 다시 쓰지 않고 작업 쪽 커밋도 그대로 남긴다):
   ```
   git fetch origin claude/amazing-thompson-w3f2o2
   git merge --no-edit origin/claude/amazing-thompson-w3f2o2
   npm run v3:freeze:measure && npm run v3:result:freeze && npm run v3:workspace && npx tsc --noEmit
   git push -u origin claude/careermatri-screen-review-p0c8kb
   ```
   충돌이 나면 **양쪽을 다 살리는 쪽**으로 푼다. 동결 기록(`*-lock.json`)이 부딪히면 코드를 먼저 맞춘 뒤 `RESULT_FREEZE=update` · `WORKSPACE_FREEZE=update` · `CORE_UI_FREEZE=write` 로 다시 적는다. 측정 동결(`v3:freeze:measure`)은 **다시 적지 않는다**: 걸리면 그것은 충돌 해결이 측정을 건드렸다는 뜻이다.
2. R31 개발·테스트는 작업 브랜치에서만 한다.
3. 통합 직전에 §1 의 dry-run 을 다시 돌려 **충돌 0 · 계약 diff 0** 을 확인한다.

## 3. 승인 뒤 Merge 절차

```
# 0. 작업 브랜치가 운영 머리를 품고 있는지
git fetch origin claude/amazing-thompson-w3f2o2 claude/careermatri-screen-review-p0c8kb
git merge-base --is-ancestor origin/claude/amazing-thompson-w3f2o2 origin/claude/careermatri-screen-review-p0c8kb || exit 1

# 1. 작업 브랜치에서 회귀 전체(§4)를 돌리고 녹색 확인

# 2. 운영 브랜치에 merge commit 으로 올린다 (fast-forward 가 되어도 --no-ff: 되돌릴 한 점을 남긴다)
git checkout -B claude/amazing-thompson-w3f2o2 origin/claude/amazing-thompson-w3f2o2
git merge --no-ff -m "R30/R31: Human Review 승인 뒤 통합" origin/claude/careermatri-screen-review-p0c8kb
git push origin claude/amazing-thompson-w3f2o2        # 이 푸시가 곧 배포다

# 3. 배포 뒤 운영 컨테이너에서 (Railway Shell)
npm run db:verify      # 7/7 · 5/5 · 5/5  (R30 은 스키마 변경이 없어 db:upgrade 가 no-op 이어야 한다)
npm run ops:check
npm run pcu:diag
```
배포 확인: `/api/health` 200 → 운영 Canary 계정으로 `/me` · `/me/state` · `/me/experience/new` · 결과지 · PDF 를 사람이 한 번 연다.

## 4. 통합 전 회귀 묶음 (작업 브랜치 · staging 빌드)

| 묶음 | 명령 | 기준 |
|---|---|---|
| 측정 불변 | `npm run v3:freeze:measure` | 기록 다시 적지 않고 통과 |
| 동결 셋 + Core | `v3:freeze` · `v3:result:freeze` · `v3:workspace` · `v3:freeze:core` | 통과 |
| 판정 | `v3:result` · `v3:recompute` · `v3:student` · `v3:result:copy` · `v3:copy` | 걸림 0 |
| 제품 루프(브라우저) | `v3:product-loop` · `v3:gate` · `v3:launch` | 걸림 0 |
| 학교 길 | `campus:check` · `pcu:coverage` · `pcu:campus` | 걸림 0 |
| 시각 | `v3:visual` · `v3:screens` · `scripts/lab/r27-probe.ts` | 가로 넘침 0 · 벌어진 자리 0 |
| 종이 | `scripts/v3-pdf-audit.ts` | 22벌 걸림 0 |
| 시나리오 | `scripts/lab/r30-scenarios.ts` | A/B/C/D 두 화면 일치 |

## 5. 롤백

R30/R31 은 DB 스키마를 바꾸지 않으므로 **코드만 되돌리면 된다.**

```
# merge commit 하나를 되돌린다(역사를 다시 쓰지 않는다)
git revert -m 1 <merge commit> && git push origin claude/amazing-thompson-w3f2o2   # Railway 가 다시 배포
```
또는 Railway 대시보드에서 직전 성공 배포를 Redeploy. 이미 응시한 사람의 굳은 결과(`v3_snapshots`)는 판본을 들고 있어 어느 쪽이든 그대로 열린다. 되돌린 뒤 `db:verify` 와 `/api/health` 로 확인한다.

## 6. 하지 않는 것

- 운영 브랜치에 직접 커밋·푸시·rebase·force-push.
- 작업 브랜치의 커밋을 squash 하거나 역사 재작성.
- 통합을 자동화하거나 cron 으로 걸어 두기. **통합은 사람이 승인하고 사람이 누른다.**
