# F · 격리 테스트 계정 (전부 테스트 데이터)

**모든 계정 · 이름 · 학번은 지어낸 시험 자료다.** 실제 학생 · 교직원과 무관하고 운영 · Staging 에 없다.
자리: 이 기계의 격리 클러스터 `16/iso`(5433) · DB `cm_pcu_seed`. 세우는 명령: `scripts/lab/trackD-seed.ts`
(담당자 화면이 부르는 `addAction` 으로 발급 · 응시는 제품과 같은 길). 비밀번호는 실행마다 새로 만들고
**어디에도 적지 않는다**(해시만 DB 에 있다).

| 규격 요구 | 계정(login_id) | 역할 · 소속 | 상태 | 쓰인 검사 |
|---|---|---|---|---|
| 학생 1 | `20261001` (김민준, 가명) | student · 배재대 경영학과 `PCU26_BIZ` | 제출 · PRO · BIZ_CORE_V1 | D seed · F audit |
| 학생 2 | `20261033` (김시우, 가명) | student · 심리상담학과 `PCU26_PSY` | 제출 · PRO · PSY_CORE_V1 | D seed |
| 전공 ≥3 | 44명 · 학과 10 (BIZ · MIS · EE · NURSING · TOURISM · PSY · MEDIACONTENT · BT · ARCH · SELFDESIGN) | | 제출 31 · 진행 5 · 미시작 8 | D seed `SEED.md` |
| 관리자 역할 1 | `seed-pcu-admin` | `org_admin` · 배재대 | — | D · F audit(명단 CSV) |
| 관리자 역할 2 | `seed-pcu-inst` | `instructor`(조회 담당) · 배재대 | — | D · F audit(집계 CSV) |
| 다른 학교 담당자 | `seed-zz-admin` | `org_admin` · 확인용 학교 `ZZTEST` (fixture) | — | D 격리 · F audit |
| 기관 밖 사용자 | `seed-outsider` | student · 소속 없음 | — | D 접근 거절 |

Staging 에서는 같은 구성을 `npm run staging:bootstrap` 이 만든다(`STAGING_PLAN.md` 5번 · `APP_ENV=staging` 에서만 돈다).
**Staging 계정 표는 아직 없다**(Staging 미생성 · 승인 대기).
