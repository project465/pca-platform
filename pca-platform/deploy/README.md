# 배포 순서

> 지금은 **공개 전 시험 배포(staging)** 까지다. 결제 대행사 · 메일 ·
> 사업자 표시가 아직 없으므로 손님에게 열지 않는다.

## 0. 두 배포본을 나눠 둔다

| | 파일 | `APP_ENV` | 가짜 결제 | 자물쇠 |
|---|---|---|---|---|
| 공개 전 | `deploy/docker-compose.staging.yml` | `staging` | 열린다 | 건다 |
| 운영 | `deploy/docker-compose.prod.yml` | `production` | **거절된다** | 없다 |

**한 파일을 돌려 쓰지 않는다.** 그러면 어느 날 운영에 가짜 결제가 켜져
있고, 그날 손님은 돈을 안 내고 결과지를 받는다.

## 1. 서버 한 대

Docker 와 Docker Compose 가 도는 리눅스 한 대. 80 · 443 이 열려 있어야
인증서를 받는다.

```bash
git clone -b claude/amazing-thompson-w3f2o2 <저장소> cm && cd cm
cp .env.staging.example .env.staging
$EDITOR .env.staging      # POSTGRES_PASSWORD · AUTH_SECRET · STAGING_BASIC_AUTH
```

`AUTH_SECRET` 과 자물쇠 비밀번호는 **만들어서 넣는다**:

```bash
openssl rand -base64 48      # AUTH_SECRET
openssl rand -base64 24      # 자물쇠 비밀번호
```

## 2. DNS

`app.careermatri.com` 의 A 레코드를 그 서버 IP 로 둔다.
**소개 사이트(`careermatri.com`)는 건드리지 않는다**: 그 줄은 지금
가리키는 곳에 그대로 둔다.

인증서는 Caddy 가 Let's Encrypt 에서 받는다. 받으려면 DNS 가 먼저
퍼져 있어야 하므로, `dig app.careermatri.com` 이 그 IP 를 돌려준 뒤에
띄운다.

## 3. 띄우기

```bash
docker compose -f deploy/docker-compose.staging.yml --env-file .env.staging up -d --build
docker compose -f deploy/docker-compose.staging.yml exec -T app npm run dev:setup
```

`dev:setup` 은 표 · 문항 · 승인된 가격 · 눌러 볼 자료를 **차례대로** 올린다.
빈 DB 에서 한 번에 돌아가는 것을 확인해 두었다.

## 4. 섰는지 센다

```bash
STAGING_BASE=https://app.careermatri.com \
STAGING_BASIC_AUTH=qa:... npm run staging:check
```

여덟 가지를 본다: `APP_ENV` · 자물쇠 · 자물쇠 비밀번호 길이 · staging 에서
가짜 결제가 열리는가 · **운영에서 거절되는가** · 이 배포본의 주소 ·
자물쇠 없이는 막히는가 · 색인하지 말라고 적혀 있는가.

그 다음 `npm run launch:check` 가 아직 막혀 있는 것을 세고,
`npm run domains:verify` 가 DNS · 인증서 · 리디렉션을 본다.

## 5. 백업

```bash
docker compose -f deploy/docker-compose.staging.yml exec -T app bash deploy/backup.sh
npm run backup:restore        # **받고 · 붓고 · 세고 · 기록까지**
```

**파일이 있다는 것은 되돌아올 수 있다는 뜻이 아니다.** 복구를 한 번
돌려 보고 그 기록이 남아야 `launch:check` 의 백업 줄이 열린다.

## 6. 손님에게 열 때

1. `PAYMENTS_PROVIDER=portone` 과 열쇠 네 개를 채운다
2. `MAIL_HOST` 를 채운다. 쌓여 있던 알림이 순서대로 나간다
3. `/admin/business` 에서 사업자 표시 일곱 칸을 넣는다
4. `.env.production` 에 `APP_ENV=production` 으로 두고 운영 compose 로 띄운다
5. `STAGING_BASIC_AUTH` 를 **지운다**
6. `npm run launch:check` 가 막힌 것을 0 으로 돌리는지 본다

**5번을 지우기 전에 1~3을 끝낸다.** 자물쇠를 먼저 풀면 결제가 가짜인
채로 열린다.
