# Railway 운영환경: 변수·DB·볼륨·복구

지금 이 저장소를 **Railway 가 직접 들고 있다.** `railway.json` 이
`DOCKERFILE` 빌더를 가리키고, 작업 가지에 커밋이 올라가면 Railway 가
이미지를 새로 굽고 `/api/health` 가 200 을 내면 갈아 끼운다.

이 문서가 답하는 것 넷이다.

1. 어떤 변수가 꽂혀 있어야 하는가 (§1)
2. 어디까지 코드가 볼 수 있고 어디부터 사람이 Railway 에서 봐야 하는가 (§2)
3. 구매자의 PDF 가 재배포를 넘기는가 (§3)
4. 운영 백업이 되돌아오는지 어떻게 확인하는가 (§4)

운영으로 넘기는 절차는 따로 있다. 저장소 뿌리의 `PRODUCTION_SWITCH.md` 다.

---

## §0 점검은 컨테이너 안에서 돌린다

```
Railway → 프로젝트 → 서비스(앱) → 오른쪽 위 ⋯ → Shell

  npm run ops:check
```

**밖에서 돌리면 세 줄이 영원히 `UNKNOWN` 이다.** 볼륨이 붙어 있는지,
이미지 안에 무엇이 들어왔는지, 어느 커밋이 돌고 있는지는 **그 컨테이너
안에서만** 답할 수 있는 질문이다. 개발 PC 에서는 그 자리에 "내가 그 값을
안 들고 있다" 가 찍히고, 그것이 운영이 비었다는 뜻은 아니다.

그래서 `ops-check` 를 **운영 이미지에 같이 담았다.** 운영 이미지에는 개발
의존성이 없어서 `tsx` 로 적힌 스크립트가 돌지 않는다. 빌드 층에서
esbuild 로 묶어 `/app/ops/ops-check.cjs` 로 넣는다(`make-admin` ·
`seed-instrument` 와 같은 방식, 합쳐 450KB).

**컨테이너 안에서는 Dockerfile 을 읽지 않는다.** 거기서는 더 좋은 증거가
있다: 그 자리가 실제로 있는지 보면 된다. `image:check` 는 배포 **전**에
Dockerfile 을 정적으로 읽어 "들어올 것이다" 를 보고, `ops:check` 는 배포
**뒤**에 "들어와 있다" 를 본다. 보는 목록은 `deploy/runtime-needs.json`
**한 파일**이다 — 두 벌로 적어 두면 한쪽만 늘어나는 날이 온다.

---

## §1 변수 점검표

**값을 여기 적지 않는다.** 이름과 **어떤 상태여야 하는가**만 적는다.
`SECRET` 으로 적힌 것은 화면에도 로그에도 찍지 않는다. 검사 명령들도
이름만 찍고 값은 안 찍는다.

네 갈래로 나눈다.

| 갈래 | 뜻 |
|---|---|
| `REQUIRED` | 없으면 그 자리가 깨진다 |
| `MUST_BE_EXACT` | **값이 정해져 있다.** 다르면 조용히 틀리게 돈다 |
| `SECRET` | 값을 아무 데도 적지 않는다. Railway 변수에만 둔다 |
| `OPTIONAL` | 없어도 기본값으로 돈다 |

### 지금 꽂혀 있어야 하는 것

| 변수 | 갈래 | 상태 | 없으면 |
|---|---|---|---|
| `DATABASE_URL` | `REQUIRED` `SECRET` | Railway Postgres 가 꽂아 준다 | 아무 화면도 안 뜬다 |
| `PLATFORM_URL` | `REQUIRED` `MUST_BE_EXACT` | `https://app.careermatri.com` (**바꾸지 않는다**) | 메일 링크·결제 콜백·결과지 주소가 빈 도메인으로 간다 |
| `APP_ENV` | `REQUIRED` `MUST_BE_EXACT` | 지금은 `staging` | 비면 `dev` 로 읽혀 가짜 결제가 열린 채 선다 |
| `STAGING_BASIC_AUTH` | `REQUIRED`(staging 동안) `SECRET` | `아이디:비밀번호` 한 줄 | 공개 전 배포본이 누구에게나 열리고 검색엔진이 들어온다 |
| `REPORT_PDF_DIR` | `MUST_BE_EXACT` | `/app/var/reports` (Dockerfile 이 못 박는다) | 결과지 PDF 가 어디에 쌓이는지 정해지지 않는다 |
| `DB_IS_PERSISTENT` | `OPTIONAL` | 지속형 Postgres 면 `yes` | `DATABASE` 줄이 WARNING 으로 선다(조회로는 모른다) |
| `DATABASE_SSL` | `OPTIONAL` | 관리형 Postgres 가 자체 인증서를 쓰면 `require` | TLS 검증에서 붙지 못할 수 있다 |
| `PORT` | 해당 없음 | **넣지 않는다.** Railway 가 넣어 준다 | 넣으면 Railway 가 준 포트로 안 듣는다 |
| `NODE_ENV` | 해당 없음 | **넣지 않는다.** 이미지가 `production` 으로 박는다 | |

### 메일을 붙이는 날: 다섯 줄

대행사에서 받는 것이 이 다섯 줄이고, 코드는 한 줄도 고치지 않는다.

| 변수 | 갈래 | 상태 |
|---|---|---|
| `MAIL_HOST` | `REQUIRED` | 대행사 SMTP 호스트 |
| `MAIL_PORT` | `OPTIONAL` | 안 넣으면 587. 465 면 TLS 로 붙는다 |
| `MAIL_USER` | `REQUIRED` `SECRET` | 대행사가 준다 |
| `MAIL_PASS` | `REQUIRED` `SECRET` | 같다 |
| `MAIL_FROM` | `REQUIRED` `MUST_BE_EXACT` | `hari_info@hari.re.kr` |

넣은 뒤 **진짜로 한 통 보내 본다.** 검사가 그것까지 한다.

```
MAIL_CHECK_TO=나@example.com npm run mail:check
```

자격증명이 없으면 그 두 줄은 `막힘` 으로 끝난다. 실패로도 통과로도
적지 않는다.

### PG 를 붙이는 날: 다섯 줄 (**이 회차에서는 시작하지 않는다**)

심사가 끝난 뒤에 받는 것이다. 받기 전에 `PAYMENTS_PROVIDER` 를 먼저 돌리면
결제를 거치는 화면이 500 이 된다.

| 변수 | 갈래 | 상태 |
|---|---|---|
| `PAYMENTS_PROVIDER` | `MUST_BE_EXACT` | `portone` |
| `PORTONE_STORE_ID` | `REQUIRED` | 대행사가 준다 |
| `PORTONE_CHANNEL_KEY` | `REQUIRED` `SECRET` | 한국 채널 |
| `PORTONE_API_SECRET` | `REQUIRED` `SECRET` | 같다 |
| `PORTONE_WEBHOOK_SECRET` | `REQUIRED` `SECRET` | 비면 웹훅이 서명을 못 본다 |
| `PORTONE_CHANNEL_KEY_GLOBAL` | `OPTIONAL` `SECRET` | 글로벌 채널. 한국만 열 때는 비운다 |

### 나머지: 기본값으로 둔다

`OPS_TOKEN`(`SECRET`, 16자 미만이면 운영 주소가 안 열린다) ·
`OPS_EMAIL` · `CODE_STOCK_MIN`(기본 20) · `DEFAULT_MARKET`(기본 KR) ·
`NEXT_PUBLIC_LANGS`(기본 ko,en) · `FEATURE_APPLY`(Phase 3 전까지 비움) ·
`PILOT_OPEN` · `MARKETING_URL` · `DB_BACKUP_CRON` ·
`DATABASE_POOL_MAX` · `DATABASE_CONNECT_TIMEOUT_MS`.

`ALLOW_MOCK_PAYMENTS` 는 **없는 변수다.** 그 문을 아예 없앴다. 그 한 줄이
운영에 섞여 들어가면 돈을 안 받고 이용권이 나갔다.

### 변수를 고치는 자리

Railway → 프로젝트 → 서비스(앱) → **Variables**. 고치면 Railway 가
스스로 다시 띄운다. 고친 뒤 **Deployments** 탭에서 새 줄이 초록이 되는
것까지 본다.

---

## §2 Postgres: 코드가 보는 것과 사람이 보는 것

### 코드가 본다

`npm run ops:check` 의 `DATABASE` 줄이 아홉 가지를 한 줄로 본다: 붙는가 ·
핵심 표 7개 · 승인된 ME_V2 상품 6개 · 운영자 1명 이상 · 중복 결제를 막는
제약 2개 · 외래키 50개 이상 · 시연 자료 0명 · 이 자리에서만 사는 DB 가
아닌가 · `DB_IS_PERSISTENT=yes` 로 확인됐는가. 앞의 여섯 중 하나라도
틀리면 `BLOCKED` 이고, 뒤의 셋은 `WARNING` 이다.

**시연 자료는 막지 않고 경고한다.** 지우는 것은 사람이 판단할 일이고,
지우라고 막아 버리면 그 줄 때문에 다른 줄을 못 본다. `users.is_demo` 는
트리거가 예약된 시험용 도메인(RFC 2606)을 보고 켜므로 진짜 손님은 걸리지
않는다.

더 자세한 표는 이쪽이다.

```
npm run db:verify
```

| 보는 것 | 깨지면 |
|---|---|
| PostgreSQL 판 | (적어 둔다) |
| 표 개수 · **핵심 표 7개** | 핵심 표가 빠지면 그 자리에서 장사가 안 된다 |
| **외래키 개수** | 반쪽으로 올라가면 지운 사람의 주문이 남는다 |
| `orders_order_no_key` · `entitlements_order_uniq` | 같은 결제가 두 번 적힌다 |
| 승인된 상품 여섯 줄(값·통화·`approved`·`active`) | 가격표가 비어 보인다 |
| 필수 동의문 4개(ko·en × 약관·개인정보) | 그 언어로 가입이 되돌려진다 |
| 시연 사람 수 | 운영에 시연 자료가 섞여 있다 |

핵심 표 일곱: `users` · `orders` · `entitlements` · `attempts` ·
`v2_responses` · `report_snapshots` · `evidence_profiles`.

### 사람이 Railway 에서 본다

조회로는 알 수 없다. **묻는 척하면 초록이 거짓이 된다.**

| 보는 것 | 어디 | 왜 |
|---|---|---|
| 자동 백업 주기·보관 기간 | Railway → Postgres 서비스 → **Backups** | 없으면 지운 날 되돌릴 것이 없다 |
| 디스크 크기와 남은 용량 | Railway → Postgres → **Metrics** / Settings | 꽉 차면 그날 쓰기가 멈춘다 |
| 동시 접속 상한 | 요금제가 정한다 | 넘기면 결제 한가운데서 붙지 못한다 |
| 어느 지역에 서 있는가 | Railway → Postgres → Settings → Region | 한국 손님과 멀면 응답이 느리다 |
| **Postgres 가 지속형인가** | 같은 자리 | 세션형이면 결제 기록이 사라지고 5년 보존이 깨진다 |

마지막 줄을 사람이 눈으로 확인했으면 `DB_IS_PERSISTENT=yes` 를 꽂고, 그
변수가 `ops:check` 의 `DATABASE` 줄을 WARNING 에서 READY 로 올린다.
**확인하기 전에 꽂지 않는다**: 조회로는 거기까지 알 수 없어서 이 변수가
유일한 근거이고, 근거 없이 꽂으면 그 줄이 초록인 채로 거짓이 된다.

**운영 DB 를 고치지 않는다.** 이 문서의 어떤 명령도 운영 DB 에 쓰지
않는다. 단 하나, §4 의 마지막 한 줄만 예외다.

---

## §3 결과지 PDF: 재배포를 넘기는가

**운영에서 구매자의 PDF 가 redeploy 때 사라지는 상태는 허용하지 않는다.**

PDF 는 `/app/var/reports` 에 쌓인다. 그 자리가 **이미지 안쪽**이면 다음
배포에 이미지와 함께 새로 만들어지고, 돈을 낸 사람의 결과지가 전부
사라진다. 화면은 멀쩡하고 `/my` 의 내려받기만 404 가 되므로 **사라졌다는
것을 손님이 먼저 안다.**

### 걸어야 하는 것

Railway → 서비스(앱) → **Settings → Volumes → Add Volume** 에서 두 칸을
채운다.

| 칸 | 값 |
|---|---|
| Mount path | `/app/var/reports` 를 그대로 적는다. 이미지가 그 자리를 못 박아 둔다 |
| 크기 | 결과지 한 장이 1MB 안쪽이다. 시작은 작게 잡고 Metrics 를 보며 늘린다 |

볼륨을 걸면 그 자리의 주인이 root 가 된다. 우리는 root 로 돌지 않으므로
`deploy/entrypoint.sh` 가 **깰 때마다 주인을 고치고 실제로 써 본다.**
못 쓰면 거기서 멈춘다. 결제 뒤에 멈추는 것보다 싸다.

### 확인

```
npm run ops:check     # 컨테이너 안에서. PDF_VOLUME 줄
```

**빈 파일을 만들었다 지우는 것으로는 모자랐다.** 결과지 PDF 는 1MB 쯤이고
용량이 찬 볼륨은 0바이트는 받아 주면서 1MB 에서 실패한다. 그래서 **PDF 한
장 크기**를 쓰고 되읽어 바이트와 앞머리까지 견준다. 쌓여 있는 장수도 세고
그 중 한 장이 아직 열리는지 본다.

**손님의 PDF 를 건드리지 않는다.** 쓰는 파일 이름이 `.probe-<프로세스
번호>.pdf` 이고 손님 것은 `<응시번호>-<시각>.pdf` 꼴이라 겹칠 수 없다.
**지우는 것은 그 한 파일뿐이고** 다른 파일은 열어 보지도 않는다(세는 것과
한 장 앞머리를 읽는 것만 한다).

| 줄 | 뜻 |
|---|---|
| `READY` | 붙여 준 디스크이고 쓸 수 있다. 재배포를 넘긴다 |
| `BLOCKED` | **이미지 안쪽이다.** 다음 배포에 사라진다 |
| `UNKNOWN` | 배포본 밖에서 돌렸다. Railway 의 Volumes 를 눈으로 본다 |

`/admin/launch` 의 `PDF` 갈래에도 같은 줄(`PDF 저장소`)이 선다. 두
자리가 **같은 함수**(`src/lib/pdf-volume.ts`)를 읽으므로 화면만 초록인
일이 없다.

---

## §4 복구: 운영 원본은 읽기만 한다

**백업은 복구해 보기 전까지 완료가 아니다.** 파일이 있다는 것은 받았다는
뜻이지 되돌아올 수 있다는 뜻이 아니다.

### 먼저 계획만 읽는다

```
PLAN=1 DATABASE_URL=<운영> bash scripts/backup-restore.sh
```

아무것도 실행하지 않고 아홉 걸음을 찍는다. 운영에서 처음 돌리는 날은
이것부터 읽는다.

### 절차

```
받는다(pg_dump)  →  새 임시 PostgreSQL 에 빈 DB  →  붓는다(pg_restore)
→  아홉 표의 줄 수를 운영과 맞춘다  →  제약 여덟 가지와 외래키 개수
→  결과지가 실제로 열리는지  →  기록 한 줄  →  임시 DB 를 지운다
```

세는 아홉 표: `users` · `orders` · `payments` · `entitlements` ·
`attempts` · `v2_responses` · `report_snapshots` · `evidence_profiles` ·
`products`.

### 운영 원본을 건드리지 않는다

| 규칙 | 어떻게 |
|---|---|
| 운영 DB 는 **읽기만** | `pg_dump` 하나. 손님 자료가 든 표에 한 줄도 쓰지 않는다 |
| **붓는 자리는 따로** | `RESTORE_URL` 로 임시 PostgreSQL 을 가리킨다 |
| 운영 서버에 DB 를 만들지 않는다 | 운영처럼 보이는 주소면 **스크립트가 거절한다.** 그래도 하려면 `SAME_SERVER=1` |
| 끝나면 임시 DB 를 지운다 | 기본 동작. 남기려면 `KEEP=1` |
| 한 줄도 쓰지 않으려면 | `READ_ONLY=1` (기록도 안 남는다) |

예외는 마지막 한 줄이다: `site_settings` 의 두 칸
(`backup_restore_verified_at` · `backup_restore_target`).

### 돌리는 법

```
DATABASE_URL=<운영> \
RESTORE_URL=postgres://<임시 PostgreSQL>/postgres \
  bash scripts/backup-restore.sh
```

임시 PostgreSQL 은 Railway 에서 **새 Postgres 서비스**를 하나 띄워 쓰고
끝나면 지우면 된다 (Railway → **+ New → Database → PostgreSQL**).

### 날짜를 손으로 적을 수 없다

기록은 **이 스크립트가 끝까지 돈 자리에서만** 생긴다.

- `backup_restore_verified_at` 을 읽는 자리는 `settings.get()` 하나이고,
  **환경변수로 되돌아가지 않는다**(`get(key)` 를 두 번째 인자 없이 부른다)
- `/admin/business` 가 쓸 수 있는 키 목록에 그 이름이 없다
- `launch:check` 가 그 사실을 센다: "복구 시험 기록이 손으로 적는 값이 아니다"

옛 문서에 `DB_BACKUP_VERIFIED_AT` 이 적혀 있었는데 **그 변수를 읽는
코드는 없다.** 꽂아도 아무 일이 안 일어난다. 사람이 날짜 한 줄 넣어서
초록을 만들 수 있으면 그 화면은 거짓말을 하기 때문이다.

### 운영에서 한 번 돌린 뒤

`/admin/launch` 의 `BACKUP_RESTORE` 와 `npm run ops:check` 의 `BACKUP` 이
같은 기록을 읽는다. 복구를 **운영 DB 에서** 해 봤으면 READY 가 되고,
개발 DB 에서만 해 봤으면 WARNING 으로 선다. 절차는 도는데 운영에서는
아직 안 해 본 상태를 그렇게 가른다. 90일이 지나면 다시 WARNING 이다.
