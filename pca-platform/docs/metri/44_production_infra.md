# 운영 인프라와 백업

규격 §12·§13 이 요구하는 것. **이 컨테이너는 운영이 아니다**: 세션이
끝나면 디스크가 회수되고 DB 도 함께 사라진다. 그래서 여기 적는 것은
"어디에 올리는가" 와 "무엇을 올리기 전에 확인하는가" 다.

## 1. 지금 어디서 돌고 있는가

| 조각 | 지금 | 운영에서 필요한 것 |
|---|---|---|
| 앱 | `next dev -p 3100` (세션 컨테이너) | 컨테이너 한 장 (`Dockerfile` 이 이미 있다) |
| DB | 세션 안의 PostgreSQL 16 | 지속 PostgreSQL + 일일 백업 |
| 파일 | `var/reports/` (세션 디스크) | 지속 볼륨이나 S3 호환 저장소 |
| 메일 | 없음 | SMTP 대행사 + 우리 도메인 발신 |
| 결제 | `PAYMENTS_PROVIDER=mock` | 심사가 끝난 PG |
| 비밀 | `.env.local` | 호스팅의 비밀 관리 |
| 감시 | 없음 | 로그 모아 보기 + 헬스체크 경보 |

**가짜로 켜 두는 것이 닫아 두는 것보다 위험하다.** 운영에서
`PAYMENTS_PROVIDER=mock` 이면 서버가 뜨지 않는다
(`src/lib/payments/index.ts`). 돈을 안 받고 좌석이 나가는 사고는 코드가
거절한다.

## 2. 올리는 것

**조각을 나눈 한 벌이 `deploy/docker-compose.prod.yml` 이다.**

```bash
cp .env.example .env.production
docker compose -f deploy/docker-compose.prod.yml up -d
```

| 조각 | 어디 |
|---|---|
| application | `app` |
| PostgreSQL | `db` (관리형을 쓰면 이 줄을 지우고 `DATABASE_URL` 만 돌린다) |
| report/PDF | 이름 붙인 볼륨 `reports` (`REPORT_PDF_DIR=/var/reports`) |
| email | 밖. SMTP 대행사 |
| payment | 밖. PortOne |
| secrets | `.env.production` 또는 호스팅의 비밀 관리 |
| logs | `json-file` 20MB × 5 |
| backup | `backup` 이 하루 한 번 |

**각 조각이 서로 다른 이유로 죽는다.** 앱은 배포할 때, DB 는 디스크가 찰
때, 파일은 볼륨을 못 붙일 때, 메일과 결제는 남의 사정으로. 한 덩어리로
두면 어느 쪽이 죽었는지 로그를 다 뒤져야 안다.

**결과지 PDF 를 컨테이너 안에 두지 않는다**: 배포할 때마다 사라지고, 산
사람이 어제 받은 PDF 를 다시 못 받는다.

뿌리의 `docker-compose.yml` 은 한 대에 전부 올리는 가장 작은 구성으로
남겨 두었다. 눌러 볼 때 쓴다.

`HOSTNAME` 을 못 박는 줄이 있다. 도커가 이 값을 컨테이너 ID 로 채워 두면
standalone 서버가 그것을 바인딩 주소로 읽어 밖에서 붙을 수 없다.

**한글 글꼴을 깔아야 PDF 가 제대로 찍힌다.** `WenQuanYi` 와 `Noto` 가
같이 있으면 fontconfig 가 `lang=ko` 에도 중국어 글꼴을 먼저 골라 자형이
기운다(`deploy/fonts-ko.conf`).

## 3. 스키마 올리는 순서

**순서가 있다.** 뒤엣것이 앞엣것의 표를 고치므로 건너뛸 수 없다.

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/schema_metri.sql
psql "$DATABASE_URL" -f db/schema_platform.sql
psql "$DATABASE_URL" -f db/schema_phase2.sql
npm run db:phase2_1
npm run db:phase2_2
npm run db:phase2_3     # 승인된 런칭 가격 · 운영 설정 · 도메인 소유
```

마지막 두 줄을 빼먹으면 환불 요청과 퍼널과 메일 확인이 **조용히** 안
돈다. 파기(`erasure.ts`)도 `pilot_feedback` 과 `email_verify_tokens` 를
지우려 하다 그 자리에서 멈춘다.

## 4. 백업

```bash
0 17 * * *  /app/deploy/backup.sh >> /var/log/cm-backup.log 2>&1
```

17:00 UTC 는 한국 새벽 두 시다. 되돌릴 일이 생기면 그 시각이 복구
지점이 되고, 그 지점이 영업시간 가운데면 잃는 것이 많다.

| 값 | 기본 | 뜻 |
|---|---|---|
| `BACKUP_DIR` | `/var/backups/careermatri` | 받아 둘 자리 |
| `BACKUP_KEEP_DAYS` | 35 | 며칠 치를 남기는가 |
| `BACKUP_GPG_RECIPIENT` | 비어 있음 | 채우면 받은 파일을 잠근다 |

**35일인 까닭.** 전자상거래법은 결제 기록 5년을 요구하지만 그것은 운영
DB 가 들고 있는 것이고, 백업은 사고에서 되돌아오기 위한 것이다. 한 달치가
있으면 "지난달에 지운 그 줄" 까지 닿는다. 그보다 길게 두면 개인정보가
백업 안에서 파기 요청보다 오래 산다.

**받은 파일을 그 자리에서 읽어 본다.** `pg_restore --list` 가 머리말이
깨진 덤프를 바로 잡는다. 열 수 없는 파일은 백업이 아니다.

**보존기간이 지나도 마지막 하나는 남긴다.** 기간을 잘못 적어 둔 날 전부
지워지면 그날이 복구 불가능한 날이 된다.

## 5. 복구 절차 (손으로 하는 것)

**스크립트가 한 바퀴를 다 돈다**: `npm run backup:restore`. 받고 · 읽어
보고 · 빈 DB 에 붓고 · 일곱 표의 줄 수를 운영과 대조하고 · 제약 여덟
가지가 살아 있는지 보고 · 결과지가 열리는지 보고 · 기록을 남긴다.
아래는 그 안에서 무슨 일이 일어나는지다.

**이것을 한 번 해 보기 전까지 백업은 완료가 아니다.** 그래서
`npm run launch:check` 가 복구 시험 기록이 비어 있으면 런칭을
막는다.

```bash
# 1. 받은 것 가운데 하나를 고른다
ls -lt /var/backups/careermatri | head

# 2. **운영 DB 에 바로 붓지 않는다.** 빈 DB 를 하나 만들어 거기에 붓는다
createdb cm_restore_test
pg_restore --dbname=cm_restore_test --no-owner --no-privileges \
  /var/backups/careermatri/cm-<그 파일>.dump

# 3. 돈과 사람이 들어 있는 표를 센다. 숫자가 그날 것과 맞는지 본다
psql cm_restore_test -c "
  SELECT 'users' t, count(*) FROM users
  UNION ALL SELECT 'orders', count(*) FROM orders
  UNION ALL SELECT 'payments', count(*) FROM payments
  UNION ALL SELECT 'entitlements', count(*) FROM entitlements
  UNION ALL SELECT 'attempts', count(*) FROM attempts
  UNION ALL SELECT 'report_snapshots', count(*) FROM report_snapshots"

# 4. 결과지 한 장이 실제로 열리는지 본다. 표가 다 있어도 payload 가
#    깨져 있으면 결과지가 안 그려진다
psql cm_restore_test -c "
  SELECT id, generated_at, (payload->'result') IS NOT NULL AS has_result
    FROM report_snapshots ORDER BY id DESC LIMIT 3"

# 5. 치운다
dropdb cm_restore_test
```

**날짜를 손으로 적지 않는다.** `npm run backup:restore` 가 끝까지 돈
자리에서만 `site_settings` 에 기록이 생기고, 런칭 화면이 그것을 읽는다.
어느 DB 에서 해 봤는지도 함께 적어서, 개발 DB 에서 한 번 돌린 것을 운영
백업이 돌아온다는 말로 쓰지 않는다.

90일이 지나면 `/admin/launch` 가 그 줄을 WARNING 으로 돌린다. 스키마가
바뀌면 복구 절차도 같이 바뀌므로, 한 번 해 보고 끝나는 일이 아니다.

## 6. 파일 저장소

`var/reports/` 는 바깥에서 열리지 않는 자리다. PDF 를 웹에 그대로 올려
두면 번호를 하나씩 올려 남의 결과지를 받아 갈 수 있다. 내려받는 길에서
로그인한 본인인지 다시 본다
(`src/app/assessment/[attemptId]/report/pdf/route.ts`).

**지속 볼륨이 없으면 PDF 가 배포마다 사라진다.** 웹 결과지는 DB 에 있는
결과 객체로 다시 그려지므로 남지만, PDF 는 파일이라 없어진다. 그 상태에서
결과지 쪽이 죽은 단추를 그리지 않고 다시 만드는 쪽으로 보낸다(규격 §16).

## 7. 감시

```bash
GET  /api/health          앱과 DB 가 붙어 있는가
POST /api/ops/tick        쌓인 알림을 내보낸다 (OPS_TOKEN 필요)
```

**타이머를 앱 안에 두지 않는다.** 앱을 둘로 늘리면 타이머도 둘이 되어
같은 메일이 두 번 나간다. `OPS_TOKEN` 이 16자 미만이면 그 주소는 열리지
않는다: 비었을 때 통과시키면 채우는 것을 잊은 날 그대로 열린 채 운영된다.

아침에 읽는 자리는 화면이다.

| 화면 | 무엇을 묻는가 |
|---|---|
| `/admin/launch` | 오늘 켤 수 있는가 |
| `/admin/incidents` | 무엇이 막혀 있는가 |
| `/admin/ops` | 밤사이 무엇이 쌓였는가 |
| `/admin/funnel` | 방문이 결제가 되는가 |
| `/admin/readiness` | 팔 수 있는 상태인가 |
| `/admin/business` | 사업자 표시를 넣는 자리 |

## 8. 환경변수 한 벌

```
DATABASE_URL=
AUTH_SECRET=                       # openssl rand -base64 48
PLATFORM_URL=https://app.careermatri.com

PAYMENTS_PROVIDER=portone
PORTONE_STORE_ID=
PORTONE_CHANNEL_KEY=               # 국내
PORTONE_CHANNEL_KEY_GLOBAL=        # 해외 Visa·Mastercard
PORTONE_API_SECRET=
PORTONE_WEBHOOK_SECRET=

MAIL_HOST=
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=
MAIL_FROM=no-reply@careermatri.com
OPS_EMAIL=

SUPPORT_EMAIL=
SUPPORT_HOURS=

BUSINESS_NAME=
BUSINESS_CEO=
BUSINESS_ADDRESS=
BUSINESS_PHONE=
BUSINESS_REG_NO=
BUSINESS_MAILORDER_NO=
JOBINFO_LICENSE_NO=J1700020220007

OPS_TOKEN=                         # 16자 이상
DB_IS_PERSISTENT=                  # 지속형 DB 가 맞으면 yes
DB_BACKUP_CRON=0 17 * * *
BACKUP_KEEP_DAYS=35
BACKUP_GPG_RECIPIENT=              # 채우면 받은 파일을 잠근다

NEXT_PUBLIC_LANGS=                 # 비우면 내놓는 언어가 전부다
```

**비어 있는 칸을 지어내지 않았다.** `npm run launch:check` 가 어느 칸이
비었는지와 누가 정하는지를 같이 말한다.
