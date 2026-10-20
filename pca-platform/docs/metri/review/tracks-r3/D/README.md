# Track D 3차 · 관리자 — 10개 학과 · 44명 가상 시드 회귀

격리 DB `cm_pcu_seed`(5433) · 실제 node-postgres 8.16.3 · 시드와 계정은 전부 **지어낸 시험 자료**(`../F/TEST_ACCOUNTS.md`).

## 실제 구현

- 이 회차에 Track D 코드는 고치지 않았다. **Track F 가 담당자 내려받기 접근 기록을 더했다**
  (`campus.export.*` · `f9e7825c`) — 담당자 화면의 숫자와 권한 규칙은 그대로이고, 아래 회귀가 그것을 다시 센다.

## 테스트 증거

| 검사 | 결과 | 로그 |
|---|---|---|
| `trackD-seed.ts` — 발급 44/44 · 응시 36 · 제출 31 · 학교 응시 전부 PRO · **학과별 집계 = 따로 쓴 SQL 10/10** · 5명 미만 학과 다섯 가림 · CSV 둘 | **33 / 33** | `logs/trackD-seed.log` · `SEED.md` · `exports/` |
| `trackD-admin.ts` — 두 학교 격리 · 역할(`org_admin` · `instructor`) · 기관 밖 사용자 거절 · 집계=SQL · 5명 규칙 · CSV 내용 | **38 / 38** | `logs/trackD-admin.log` |
| `trackF-audit.ts` — 담당자 CSV 내려받기가 누가 · 어느 학교 · 어느 범위로 기록되는가 · 다른 학교 담당자는 자기 학교로 | **10 / 10** | `../F/logs/trackF-audit.log` |

## BLOCKED

- 없음(서버 수준 검사는 이 환경에서 돈다).

## NOT VERIFIED

- **브라우저 관리자 화면 전부**(권한별 메뉴 · 다운로드 단추 · 숫자 화면 · 모바일 · 운영 요약 PDF) — Next 빌드 불가.
- 운영 요약 PDF 를 실제로 뽑아 접근 기록이 남는지(코드 자리만 확인).

## 다음 행동

1. CI 승인 뒤 `pcu:ops`(브라우저) · Staging 에서 `../F/BROWSER_CHECKLIST.md` #9 · #10.
2. 담당자 화면에 내려받기 기록을 보여 줄지 — 새 기능이라 사업주 판단.
