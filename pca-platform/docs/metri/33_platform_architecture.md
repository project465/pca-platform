# 플랫폼 층 — 개인 · 기관 · 운영사

검사 하나를 파는 사이트에서 **플랫폼**으로 넓히는 작업이다. 받은 규격을
그대로 옮기기 전에 지금 저장소에 무엇이 이미 있는지부터 봤다.

## 1. 이미 있던 것

규격이 요구한 것의 절반 가까이가 이미 돌고 있었다.

| 규격이 부르는 이름 | 저장소에 이미 있는 것 |
|---|---|
| User | `users` + `memberships` |
| Organization | `organizations` (code · country · org_type · parent_id) |
| Contract | `contracts` (seat_count · 기간 · 상태) |
| License / Seat | `seats` (contract_id · user_id · consumed_at) |
| Product · Order · Payment · Refund | `products` · `orders` · `payments` · `refunds` |
| Entitlement | `entitlements` + `src/lib/entitlement.ts` |
| Assessment | `test_sessions` · `attempts` · `responses` |
| Aggregate privacy threshold | `cohort_reports.min_cell` = 5 · `src/lib/cohort.ts` |
| Admin 화면 | `/admin/organizations` · `/admin/contracts` · `/admin/ops` |
| Institution 화면 | `/org` · `/org/sessions` |

**그래서 새로 만들지 않았다.** 표를 하나 더 만들면 등급을 정하는 자리가 둘이
되고, 둘 중 하나는 반드시 뒤처진다(설계 원칙 10).

## 2. 고친 것 하나

`db/schema_metri.sql` 을 **빈 DB 에 올릴 수 없었다.** 948번째 줄의
`scoring_profiles` 적재가 `tracks` 에 'HS' 행을 요구하는데 그 행은 생성되는
시드 파일에만 있었다. 지금까지 아무도 몰랐던 것은 이미 올라간 DB 에만
덧붙여 왔기 때문이다.

트랙 네 줄을 스키마로 옮겼다. 그것은 내용이 아닌 **검사지를 고르는 열쇠**이고,
같은 파일 아래쪽이 바로 참조한다. 이제 세 벌이 순서대로 올라가고 표가
100개가 된다. `npm run platform:check` 가 매번 빈 스키마에서 다시 올린다.

## 3. 새로 만든 것

`db/schema_platform.sql` 한 벌이다. 적용 순서는
`schema.sql → schema_metri.sql → schema_platform.sql`.

| 표 | 왜 |
|---|---|
| `organization_types` | 조직 종류를 코드에서 빼내 표에 둔다 |
| `roles` | 역할 여섯. 예전 네 가지를 `legacy_code` 로 잇는다 |
| `invitations` | 초대. 코드는 sha256 만 저장한다 |
| `cohorts` · `cohort_members` | 기수. 회차와 다른 축이다 |
| `site_configs` | 도메인·언어·통화·결제 시장 |
| `country_packs` | 나라 묶음. **틀만 만들고 비워 뒀다** |
| `consents` | 약관·개인정보·마케팅·기관 참여를 따로 받는다 |
| `audit_logs` | 누가 무엇을 했는가 |
| `analytics_events` | 행동 기록 |
| `evidence_profiles` · `evidence_snapshots` | 경험은 사람에게, 결과지는 사본에 |
| `report_snapshots` | 결과지 판본 |

`organizations` · `contracts` · `seats` · `attempts` 에는 칸만 더했다.

## 4. 좌석에 생애주기를 붙였다

규격은 `licenses` 를 따로 두라고 하지만 좌석은 이미 `seats` 한 줄이고 등급을
정하는 함수가 그 표를 본다. 그래서 표를 늘리지 않고 상태를 붙였다.

```
available → invited → claimed → started → completed
                 ↘ revoked     ↘ expired
```

**초대를 좌석 사용으로 치지 않는다.** 쓴 것은 `started` 부터다. 초대만 보내
놓고 아무도 안 들어온 날 숫자가 틀리면 기관이 돈을 더 냈다고 생각한다.

**이미 시작한 좌석은 거두지 않는다.** 응시 중인 사람의 화면이 끊기고, 그
사람은 자기가 무엇을 잘못했는지 모른다. `revokeSeat` 의 `WHERE` 가 막는다.

## 5. 역할 여섯과 범위

예전 네 가지를 버리지 않는다. 이미 발급된 계정의 `memberships` 행을 건드리지
않으려고 이름만 이어 뒀다.

| 지금 | 예전 | 할 수 있는 것 |
|---|---|---|
| `platform_super_admin` | superadmin | 나라·상품·검사 판본까지 |
| `platform_admin` | — | 계약·조직·주문을 본다 |
| `org_admin` | org_admin | 좌석·초대·기수·집계 |
| `org_staff` | instructor | 참여자 상태와 집계만 |
| `org_participant` | student | 자기 것만 |
| `individual` | — | 자기 것 + 결제 |

**숨긴 메뉴는 권한이 아니다.** 링크를 빼는 것은 안내이고, 막는 것은 서버가
`src/lib/rbac.ts` 를 읽는 검사다.

**역할만 보지 않고 범위도 같이 본다.** `canInOrg(actor, cap, orgId)` 가
A 대학 담당자의 B 대학 접근을 막는다.

## 6. 기관은 개인 결과지를 기본으로 못 본다

`org.participant.report.read` 는 **어느 역할의 목록에도 없다.** 운영사
시스템 관리자에게도 없다. 열리는 길은 셋이 다 맞을 때뿐이다.

1. 계약에 그렇게 적혀 있다
2. 본인이 그 기관에 대해 동의했다
3. 연 기록이 `audit_logs` 에 남는다

기본값을 열어 두면 아무도 항의하지 않고 몇 달이 간다.

## 7. 집계

**5명 미만 칸은 숫자를 내지 않는다.** 감춘 칸을 0 으로 적지도 않는다. 0 과
'적어서 안 보여 준다' 는 다른 말이다. 기준은 `organizations.aggregate_min_cell`
에 있고 기본값이 5 다.

**등수를 매기지 않는다.** "학생의 32% 가 CAE 에 적합" 이 아니라 "32명이 지금
CAE 를 먼저 살펴보고 있다" 로 적는다. 적합은 이 검사가 만들 수 있는 값이
아니다.

**나눌 바닥이 0 이면 비율을 만들지 않는다.** 아무도 시작하지 않았는데 0% 를
찍으면 거짓말이다. `completion_rate` 가 `null` 로 나가고 화면이 그 까닭을
적는다.

## 8. 사이트와 목표 국가

```json
{ "interface_language": "ko", "site_region": "KR", "target_country": "US" }
```

셋은 다른 값이다. 한국 사이트를 한국어로 쓰면서 미국 시장을 보는 사람이 가장
흔하고, 셋을 하나로 묶으면 그 사람에게 한국 공고가 나간다. `attempts` 에
세 칸이 따로 있다.

**도메인을 코드에 적지 않았다.** `site_configs` 한 표에서만 읽는다.

> **철자를 확인해 주셔야 합니다.** 받은 규격은 `careermatri.com` 으로 적혀
> 있고 이 저장소와 `docs/metri/20_domains.md` 는 `careermetri.com` 입니다.
> 한 글자 차이라 사고 나면 되돌리기 어렵습니다. 지금은 저장소가 쓰던 쪽으로
> 넣어 뒀고, 바뀌면 `site_configs` 의 두 줄만 고치면 됩니다.

## 9. 나라 자료를 지어내지 않는다

`country_packs` 는 틀만 있고 행이 없다. 확인된 자료가 생길 때만 늘고, 그
전까지 결과지는 전부 `GLOBAL_REFERENCE_MODE` 로 나가며 그 사실을 화면에
적는다. 임금·비자·면허를 지어내면 그것을 믿고 움직이는 사람이 생긴다.

## 10. 결제는 아직 붙이지 않았다

규격이 그러라고 했고, 실제로도 PG 가 안 정해졌다. 만든 것은 경계뿐이다.

```
결제 또는 계약이 확정된다 → 이용권이 생긴다 → 응시 자격이 열린다
```

화면은 결제 표를 직접 보지 않고 `entitlements` 만 본다.

## 11. 검사

```bash
npm run platform:check   # 빈 DB 에 스키마를 올리고 스물여섯 가지
```

규격 53~55장을 그대로 옮겼다. 기관이 개인 결과지를 못 보는지 · 참여 상태는
보는지 · 5명 미만이 가려지는지 · A 기관이 B 기관을 못 보는지 · 개인이 운영사
화면에 못 들어가는지 · 끝난 계약이 좌석을 안 내주는지 · 거둔 좌석으로 응시를
못 시작하는지 · 이미 시작한 좌석은 안 거둬지는지. 거기에 이용권 여섯과 사이트
다섯을 더했다.

**실제 DB 에 올려서 돌린다.** 스키마를 글로만 두면 올라가는지 모른다.

## 12. 아직 안 한 것

- **화면은 읽기만 한다.** 초대 보내기·좌석 거두기·기수 만들기가 라이브러리에는
  있지만 버튼은 아직 없다. 누르면 돈과 개인정보가 움직이는 자리라 화면보다
  감사 기록과 확인 절차가 먼저다
- **결제 연동**. PG 가 정해져야 한다
- **나라 묶음 내용**. 틀만 있다
- **개인 대시보드의 새 칸**. `/my` 는 아직 예전 모양이다
- **영문 화면**. `site_configs` 에 영어가 들어 있지만 화면 문구는 한국어다
- **ME_V2 를 이 플랫폼에 붙이는 것.** 지금 ME_V2 는 정적 페이지(`v2.html`)
  에서 돌고 서버 쪽 `attempts` 와 이어져 있지 않다. 둘을 잇는 것이 다음이다
