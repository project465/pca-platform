# 운영 500 복구. `career_profiles` 가 선 적이 없었다

2026-10-09. **새 기능을 만들지 않았다.** 마이그레이션 쪽만 고쳤고, 채점 ·
문항 은행 · ResultModel · 응시 routing · 격리 · 묶음 · Industry/Role 논리 ·
Workspace 정보구조 · Workspace 디자인 · 결과지 디자인 · Action 논리는 한
줄도 건드리지 않았다.

```
증상   https://app.careermatri.com/me → 500
로그   error: relation "career_profiles" does not exist   (PG 42P01)
그런데 npm run db:upgrade 는 끝까지 돌고, db:verify 는
       핵심 표 7 / 7 · ME_V3 표 5 / 5 · 내 CareerMatri 0 / 5
```

---

## A. `내 CareerMatri` 표 다섯의 실제 이름

`deploy/ops/db-verify.sh` 가 세는 다섯이고, 추측이 아니라 그 파일의
`table_name IN (...)` 를 그대로 옮긴 것이다.

| 표 | 만드는 파일 | 그 줄 | 없으면 |
|---|---|---|---|
| `career_profiles` | `db/schema_v3_arch.sql` | 165 | `/me` · `/me/state` · `/me/results` · `/me/next` 가 500 |
| `v3_experiences` | `db/schema_v3_platform.sql` | 27 | 경험 목록과 경험 추가가 500 |
| `v3_actions` | `db/schema_v3_platform.sql` | 99 | 다음 할 일이 500 |
| `v3_job_postings` | `db/schema_v3_platform.sql` | 141 | 공고와 Track 이 500 |
| `v3_track_interest` | `db/schema_v3_platform.sql` | 201 | Track 신청이 500 |

## B. `career_profiles` 를 만드는 자리

`db/schema_v3_arch.sql:165` 의 `CREATE TABLE IF NOT EXISTS career_profiles`
하나뿐이다. 같은 파일에 `regions`(63) · `region_industry`(90) ·
`industry_td_demand`(104) · `org_registry`(126) · `region_notes`(140) ·
`career_events`(214) 가 같이 선다. 그래서 이 파일이 안 들어가면 지역 층도
같이 빠진다.

칸은 열다섯이고 유일 제약이 `UNIQUE (user_id, core_code)` 다. 이 짝이
중요한 까닭은 쓰는 자리 셋(`syncProfile()` · `saveRegion()` ·
`saveTargets()`)이 전부 `ON CONFLICT (user_id, core_code)` 이기 때문이다.
표가 서도 그 제약이 없으면 PostgreSQL 이 42P10 으로 거절한다.

## C. 장애 원인. 목록이 두 벌이었고 운영은 뒤엣것을 읽는다

**이 저장소에는 DB 를 올리는 길이 두 벌 있었다.**

```
저장소 쪽   scripts/db-init.sh       scripts/db-upgrade.sh
컨테이너 쪽 deploy/ops/db-init.sh    deploy/ops/db-upgrade.sh
```

운영 이미지에서 `npm run db:upgrade` 가 뜻하는 것은 **뒤엣것**이다.
`Dockerfile` 이 `deploy/ops/package.json` 을 `/app/package.json` 으로
덮기 때문이다:

```
COPY --chown=metri:nodejs deploy/ops/package.json ./package.json
```

그리고 고치기 전의 `deploy/ops/db-upgrade.sh` 가 붓던 것은 일곱이었다:

```
phase2 · phase2_1 · phase2_2 · phase2_3 · phase2_4
schema_v3_runtime.sql · schema_v3_pilot.sql
```

빠진 넷이 이렇다: `schema_pilot.sql` · **`schema_v3_arch.sql`** ·
`schema_v3_platform.sql` · `seed/v3_regions.sql`.

ME_V3 네 줄을 저장소 쪽 목록에 더한 날 컨테이너 쪽은 둘만 받았다.
그래서 **`career_profiles` 가 운영에 선 적이 한 번도 없다.**
`db:upgrade` 가 정상 종료한 것은 고장이 아니고, **그 스크립트가 아는
일곱을 다 부었기 때문**이다. 모르는 넷은 실패할 기회조차 없었다.

후보로 적어 두신 다른 까닭은 전부 아니었다. 확인한 것을 적는다.

| 의심한 것 | 실제 |
|---|---|
| 옛 코드가 배포됐다 | 아니다. 최근 배포가 저장소 HEAD 다 (K 를 볼 것) |
| Docker 이미지에 파일이 빠졌다 | 아니다. `COPY /app/db ./db` 로 `db/` 전부가 들어간다 |
| 조건 분기로 건너뛴다 | 아니다. 그 파일을 가리키는 줄 자체가 없었다 |
| `db:init` 만 올린다 | 아니다. `db:init` 쪽에도 같은 넷이 빠져 있었다 |
| 번호까지만 돌린다 | 아니다. 번호로 돌리는 구조가 아니다 |

**저장소의 회귀검사가 이 차이를 못 본 까닭도 같다.**
`npm run db:migration` 이 `scripts/db-upgrade.sh` 를 돌렸고, 그쪽에는 네
줄이 다 있었다. 그래서 검사는 초록이고 운영은 깨져 있었다. 전에 이
저장소가 적어 둔 말이 그대로 한 층 위에서 일어났다. *적어 둔 스키마와
올라간 스키마는 다른 것이고 그 차이는 아무 검사도 세지 않았다.*

## D. verify 안내가 없는 명령을 가리킨 까닭

고치기 전의 `db-verify.sh` 는 표가 모자라면 이렇게 적었다.

```
없는 표가 있습니다. 올리는 길: npm run db:v3:arch && npm run db:v3:platform
```

그 둘은 **저장소의 `package.json` 에만 있다.** 운영 이미지의
`package.json` 은 `deploy/ops/package.json` 이고 거기 적힌 것은 여덟뿐이다:
`db:init` · `db:upgrade` · `db:verify` · `make:admin` · `ops:check` ·
`pg:smoke` · `pg:confirm` · `pilot:check`. 컨테이너에서 그대로 치면
`npm error Missing script: "db:v3:arch"` 다.

안내문을 적을 때 **어느 `package.json` 안에서 돌 글인지**를 보지 않은
것이고, 이것도 같은 두 벌 문제다.

## E. 고친 것

| 파일 | 무엇을 |
|---|---|
| `deploy/db-chain.json` | **새로 만들었다.** DB 를 세우고 올리는 유일한 목록 (base 4 · upgrade 11) |
| `deploy/ops/db-upgrade.sh` | 손으로 적은 일곱 줄을 지우고 목록을 읽어 붓는다 |
| `deploy/ops/db-init.sh` | 같다 (`base` + `upgrade`) |
| `scripts/db-upgrade.sh` | `npm run -s db:*` 로 SQL 을 붓던 것을 지우고 같은 목록을 읽는다 |
| `scripts/db-init.sh` | 같다 |
| `deploy/ops/db-verify.sh` | 없는 명령 안내를 지웠다 · 내 CareerMatri 가 모자라면 **실패**로 떨어진다 · `career_profiles` 의 칸 열넷과 `(user_id, core_code)` 유일 제약을 본다 |
| `Dockerfile` | `deploy/db-chain.json` 을 이미지에 담는다 |
| `deploy/runtime-needs.json` | 그 자리를 목록에 더했다 (`image:check` · `ops:check` 가 같이 본다) |
| `scripts/db-chain-check.ts` | **새로 만들었다.** `npm run db:chain` 여덟 가지 |
| `scripts/db-migration-check.ts` | 지금 나무의 차례를 목록에서 읽는다 (옛 판본 쪽 파싱은 그대로) |
| `scripts/v3-smoke.mjs` | `/me` 가 200 인 것만 보던 것을 **Workspace 자료 경로까지** 본다 |

**목록을 한 자리로 모으는 것만으로는 돌아온다.** 그래서
`npm run db:chain` 이 여덟 가지를 센다.

1. 네 runner 가 `deploy/db-chain.json` 만 읽는다 (손으로 적은 `-f db/...`
   와 `npm run -s db:*` 가 0건)
2. `db/*.sql` 과 올리는 시드가 전부 목록에 있거나, 안 올리는 까닭이 적혀
   있다 (`not_in_chain`)
3. 목록의 파일이 전부 실제로 있다
4. 차례가 조건을 지킨다. `schema_v3_arch.sql` 이 `schema_v3_platform.sql`
   과 `seed/v3_regions.sql` 보다 먼저다
5. `db:verify` 가 세는 다섯 표가 목록 안에서 실제로 만들어진다
   (표 이름을 여기 적지 않고 `db-verify.sh` 에서 읽는다)
6. 컨테이너 안내문이 **그 컨테이너에 있는 스크립트**만 가리킨다
7. `career_profiles` 에 `/me` 가 읽는 칸이 전부 적혀 있다
   (칸 목록도 `db-verify.sh` 에서 읽는다)
8. 그 목록이 운영 이미지가 들고 있어야 하는 자리에 적혀 있다

**6번과 7번은 두 벌을 못 만들게 하는 줄이다.** 처음에는 7번이 칸 열셋을
손으로 들고 있었는데, 그러면 `db-verify.sh` 에 칸을 더한 날 이쪽이 안 늘고
그것이 바로 이번 장애의 모양이다. 읽는 자리로 바꿨다.

## F. 데이터 보존

**`DROP TABLE` · `TRUNCATE` · reset · `db:init` 을 한 줄도 쓰지 않았다.**
목록의 열한 파일이 전부 `CREATE TABLE IF NOT EXISTS` ·
`ADD COLUMN IF NOT EXISTS` · `ON CONFLICT` 로 짜여 있고, 모든 psql 이
`--single-transaction` 이라 파일 하나가 통째로 들어가거나 통째로 안
들어간다.

운영을 그대로 재현한 DB(`base` 넷 + 고치기 전 일곱, 표 120개,
`career_profiles` 없음)에 사람 둘 · 주문 둘 · 이용권 둘을 넣고 올렸다.

```
              올리기 전   두 번 올린 뒤
users                 2   2
orders                2   2
entitlements          2   2
products             21   21
consent_documents     6   6

orders md5   52ca4e09a41472fb21ce126c7ab9466e → 52ca4e09a41472fb21ce126c7ab9466e
users  md5   a1b4a9f2ab78b1c8d460c67bb851e770 → a1b4a9f2ab78b1c8d460c67bb851e770
```

줄 수뿐 아니라 주문의 번호·금액·상태·결제시각과 사람의 아이디·메일·이름을
이어 붙여 md5 로 떠 두고 대조했다. 글자까지 같다.

## G. 멱등. 두 번 다 끝까지

운영 이미지의 배치를 그대로 만들어(`/app/ops/*.sh` ·
`/app/package.json` ← `deploy/ops/package.json` · `/app/deploy/db-chain.json` ·
`/app/db` · esbuild 로 묶은 `/app/ops/seed-instrument.cjs`) **컨테이너가
실제로 돌리는 `npm run db:upgrade`** 를 두 번 돌렸다.

```
1번째 종료코드 0
2번째 종료코드 0
두 번째에서 난 ERROR 0건
표 133개 · 외래키 215개 (두 번 다 같다)
```

`db:migration` 도 같은 것을 자기 자리에서 세고, 그 줄이
`옛 DB 에서 db:upgrade 가 두 번 돈다 · 두 번 다 끝까지` 다.

## H. `db:verify` 최종 결과 (실제 출력)

**고치기 전 · 운영 재현 DB.** 장애가 그대로 재현된다.

```
PostgreSQL      16.13
표              120개
핵심 표         7 / 7
ME_V3 표        5 / 5
내 CareerMatri  0 / 5
실패 내 CareerMatri 표가 모자랍니다. npm run db:upgrade 로 올립니다.
...
1가지가 걸렸습니다.
```

**고친 뒤 · 같은 DB 에 `npm run db:upgrade` 한 번**

```
── db/schema_phase2.sql
── db/schema_phase2_1.sql
── db/schema_phase2_2.sql
── db/schema_phase2_3.sql
── db/schema_phase2_4.sql
── db/schema_pilot.sql
── db/schema_v3_runtime.sql
── db/schema_v3_arch.sql
── db/schema_v3_platform.sql
── db/schema_v3_pilot.sql
── db/seed/v3_regions.sql
── 검사 문항
문항 253개 (채점 250 · 성향 반영 120 · 성실도 3)

PostgreSQL      16.13
표              133개
핵심 표         7 / 7
ME_V3 표        5 / 5
내 CareerMatri  5 / 5
외래키          215개

필수 동의문      4개
사람            2명 (시연 2명)

팔 수 있는 상태입니다.
```

### `career_profiles` 를 직접 들여다본 것

칸 열다섯이 서 있고, `/me` 가 읽는 열넷이 전부 그 안에 있다.

```
id · user_id · core_code · market_code · base_attempt_id
axis_levels(jsonb) · zones(jsonb) · gaps(jsonb)
target_industry(text[]) · target_role(text[]) · target_org(text[])
target_org_context(text[]) · home_region · move_range · recomputed_at
```

제약과 인덱스:

```
career_profiles_pkey                   PRIMARY KEY (id)
career_profiles_user_id_core_code_key  UNIQUE (user_id, core_code)
career_profiles_user_id_fkey           FK users(id) ON DELETE CASCADE
career_profiles_base_attempt_id_fkey   FK v3_attempts(id) ON DELETE SET NULL
career_profiles_home_region_fkey       FK regions(code)
```

그리고 **`/me` 가 쓰는 질의를 그대로 돌려 봤다.** `currentState()` 의
네 칸 조회 · `profileOf()` 의 여섯 칸 조회 · `saveTargets()` 의
`ON CONFLICT (user_id, core_code)` 를 두 번. 셋 다 돌고, 두 번 써도
`career_profiles` 가 한 줄이다.

**세는 것이 헛돌지 않는지도 봤다.** 일부러 `market_code` 를 빼면
`실패 career_profiles.market_code 가 없습니다`, 유일 제약만 떼면
`실패 career_profiles 에 (user_id, core_code) 유일 제약이 없습니다` 로
떨어진다. 둘 다 종료코드 1 이다.

## I. 회귀검사

`package.json` 에 실제로 있는 script 만 돌렸다.

| 명령 | 결과 |
|---|---|
| `npm run db:chain` | PASS · 확인 8가지 · 통과 8 · 걸림 0 |
| `npm run db:migration` | PASS · 확인 6가지 · 통과 6 · 걸림 0 (칸 1002개 · 제약 484개 · 인덱스 255개 · 코드가 부르는 칸 523개) |
| `npm run db:verify` | PASS · 7 / 7 · 5 / 5 · 5 / 5 · 외래키 215 |
| `npm run v3:all` | PASS · 스물두 묶음 전부, 종료코드 0 |
| `npm run v3:workspace` | PASS · `CAREERMATRI_WORKSPACE_UI_V1` · 파일 29벌 그대로 · 쓰는 이름 57개 |
| `npm run v3:isolation` | PASS · 확인 11가지 (여섯 자리 A 열림 · B 막힘) |
| `npm run v3:owner` | PASS · 확인 18가지 |
| `npm run v3:smoke` | PASS · 확인 28자리 · 통과 28 (이 기계의 공개 전 배포본) |
| `npm run image:check` | PASS · `deploy/db-chain.json` 포함 |

`v3:all` 은 `v3:isolation` · `v3:owner` · `v3:workspace` · `v3:pilot` 을
안에서 같이 돌리지만, 위 표에는 따로 돌린 결과도 적는다.

### `/me` 연기 검사를 강화한 것

전에는 상태코드만 봤다. 그러면 **표가 통째로 없는 날에도 오류 경계가
200 으로 나가는 배포본에서 초록이 선다.** 지금은 셋을 더 본다.

1. 로그인한 사용자로 `/me` 쪽 열넷을 열고 Workspace 띠
   (`nav[aria-label="CareerMatri 메뉴"]`)가 섰는지 본다. 서버 쪽에서
   질의가 깨지면 이 띠가 서지 않는다
2. `career_profiles` 를 읽는 세 자리를 따로 센다: `/me` ·
   `/me/state`(`currentState()` + `profileOf()`) · `/me/results`.
   셋 다 머리글과 제 본문을 그려야 통과다
3. 브라우저 쪽 오류가 하나라도 나면 걸린다

**`career_profiles` 를 떼고 돌려 보고 실제로 걸리는 것까지 확인했다.**

```
표를 뺀 DB 로 띄우고 npm run v3:smoke
  걸림  내 CareerMatri 홈이 지금 상태를 읽는다 — 500
  걸림  지금 상태가 career_profiles 와 굳은 결과를 읽는다 — 500
  걸림  결과 기록이 스냅샷 이력을 읽는다 — 500
  걸림  career_profiles 를 읽는 세 자리가 전부 돈다
확인 28자리 — 통과 16 · 걸림 12       종료코드 1
```

같은 서버·같은 코드로 표가 있는 DB 를 보게 하면 28 / 28 이다. 차이는
표 하나뿐이다.

## J~M

보고의 나머지(새 commit · 재배포 필요 여부 · 실행할 한 줄 · 확인할 주소)는
`CLAUDE.md` 의 이 회차 절과 같다. 요지만 적는다.

- **재배포가 필요하다.** 이번에 고친 것은 전부 이미지 안으로 들어가는
  파일이다(`deploy/ops/*.sh` · `deploy/db-chain.json` · `Dockerfile`).
  지금 떠 있는 컨테이너에서 `npm run db:upgrade` 를 치면 **옛 스크립트가
  돌아** 여전히 `schema_v3_arch.sql` 을 붓지 않는다. 밀어 넣고 Railway 가
  새 이미지를 구운 **다음에** 쳐야 한다.
- 그다음 Railway Shell 에서 칠 것은 한 줄이다.

  ```
  npm run db:upgrade && npm run db:verify && npm run ops:check
  ```

- 그 줄이 끝나면 `https://app.careermatri.com/me` 가 500 없이 열리고,
  검사를 끝내지 않은 계정에서는 `기계공학 검사 시작` 이 있는
  내 CareerMatri 홈이 떠야 한다.

## 아직 아닌 것

**이 세션에서 운영을 직접 건드리지 않았다.** Railway Shell 을 돌리지
않았고(권한이 없다), 운영 DB 에 한 줄도 쓰지 않았고, 배포본을 밖에서
브라우저로 열어 보지 못했다. 이 컨테이너의 네트워크 정책이 바깥
HTTPS 를 막는다. 위의 모든 결과는 **이 기계에서 운영 배치를 재현해 돌린
것**이다. `02c43799` 이라는 커밋은 이 저장소에 없다 (K).
