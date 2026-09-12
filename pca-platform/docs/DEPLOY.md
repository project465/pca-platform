# 배포

현멘은 Next.js 서버와 PostgreSQL 하나로 돈다. 정적 사이트가 아니라서 서버가 필요하다
— 로그인·결제·줌 생성이 전부 서버에서 일어난다.

돌아가는 것이 셋이라는 점만 기억하면 된다.

| 무엇 | 없으면 |
|---|---|
| 웹 서버 (Next.js) | 화면이 열리지 않는다 |
| PostgreSQL | 아무것도 열리지 않는다 |
| **5분 크론** (`npm run notify`) | 확정 안내·리마인더가 안 나가고, 기한 만료와 정산도 멈춘다 |

세 번째를 빠뜨리는 경우가 많다. 화면은 멀쩡해 보이는데 아무 메일도 나가지 않는다.

---

## 올리기 전에

```bash
npm run check:env            # 무엇이 비었는지 알려준다
npm run check:money          # 지금 요율로 나오는 금액이 맞는지 본다
npm run typecheck && npm run build
```

`check:env` 가 "올릴 수 없습니다" 라고 하면 그대로 멈춰야 한다. 없으면 멈추는 값은 다섯이다.

- `DATABASE_URL`
- `AUTH_SECRET` — `openssl rand -base64 32`. **바꾸면 모든 세션이 끊긴다**
- `AUTH_URL` — 실제 주소. 소셜 로그인 리다이렉트와 메일 속 링크가 이 값을 쓴다
- `NEXT_PUBLIC_TOSS_CLIENT_KEY` · `TOSS_SECRET_KEY`
- `ZOOM_ACCOUNT_ID` · `ZOOM_CLIENT_ID` · `ZOOM_CLIENT_SECRET`

`NEXT_PUBLIC_` 으로 시작하는 값만 **빌드 시점에 번들에 박힌다.** 바꾸면 다시 빌드해야 한다.
나머지는 실행할 때 읽으므로 재시작만 하면 된다.

---

## 방법 1 — 서버 한 대 (docker compose)

관리형 서비스에 묶이지 않고, 한 대에서 끝난다.

```bash
cp .env.example .env
# .env 에 POSTGRES_PASSWORD, AUTH_SECRET, AUTH_URL 과 키들을 채운다

docker compose up -d --build
docker compose exec -T db psql -U pca -d pca < db/schema.sql   # 처음 한 번만
docker compose exec -T db psql -U pca -d pca -c "INSERT INTO payout_settings (id,fee_percent,withholding_percent,hold_hours) VALUES (1,10,3.3,48) ON CONFLICT (id) DO NOTHING"
```

`notifier` 컨테이너가 5분마다 발송기를 돌린다. 크론을 따로 걸 필요가 없다.

앞에 nginx나 Caddy를 두고 HTTPS를 붙인다. `AUTH_URL` 을 그 주소로 맞춘다.

확인:

```bash
curl -s https://<도메인>/api/health     # {"ok":true,"db":true,...}
```

이 응답은 프로세스가 떴다는 뜻이 아니라 **데이터베이스까지 닿았다**는 뜻이다.
프로세스만 보고 초록불을 켜면 DB가 끊겨도 아무도 모른다.

---

## 방법 2 — Vercel + 관리형 PostgreSQL

서버를 직접 관리하지 않으려면 이쪽이 편하다. 다만 **크론을 따로 걸어야 한다.**

1. 저장소를 Vercel 에 연결하고 Root Directory 를 `pca-platform` 으로 둔다
2. Neon·Supabase·Cloud SQL 중 하나로 PostgreSQL 을 만들고 `db/schema.sql` 을 한 번 실행한다
3. 환경변수를 Production 에 넣는다 (`npm run check:env` 목록 그대로)
4. `vercel.json` 의 크론이 5분마다 `/api/cron/notify` 를 부르게 하거나,
   외부 크론(cron-job.org 등)으로 같은 주소를 친다

> Vercel 무료 플랜의 크론은 하루 한 번이다. 현멘은 5분마다 돌아야 하므로
> 유료 플랜이거나 외부 크론이 필요하다. 이걸 모르고 올리면 알림이 하루에 한 번 나간다.

---

## 처음 한 번 해야 하는 것

```bash
psql "$DATABASE_URL" -f db/schema.sql    # 표 만들기
npm run db:fees                          # 수수료 10% · 원천징수 3.3% · 환불 규칙
```

`db:fees` 를 건너뛰면 **환불이 0원이 되고 정산이 아예 잡히지 않는다.**
수수료율이 0이면 정산 건을 만들지 않도록 되어 있기 때문이다.

운영자 계정은 `npm run db:seed` 가 만드는 개발용 계정을 그대로 쓰면 안 된다.
비밀번호를 바꾸거나 직접 만들어야 한다.

---

## 올린 뒤 확인할 것

순서대로 하면 각 단계가 어디서 막히는지 바로 드러난다.

1. `/api/health` 가 `{"ok":true,"db":true}` 인가
2. `/mentoring` 이 로그인 없이 열리는가
3. `/signup` 으로 가입하면 확인 메일이 오는가 — 안 오면 `MAIL_WEBHOOK_URL`
4. 멘토를 하나 승인하고 시간대를 연 뒤 신청해서 **결제창이 뜨는가** — 안 뜨면 토스 키
5. 멘토로 승낙했을 때 **줌 링크가 오는가** — 안 오면 줌 키
6. `npm run notify` 를 직접 한 번 돌려 큐가 비는가

6번이 비지 않으면 크론이 안 돌고 있는 것이다.

---

## 바꾸면 안 되는 값

- `AUTH_SECRET` — 바꾸면 로그인한 사람이 전부 튕긴다
- `PAYOUT_SECRET` — 바꾸면 이미 저장된 멘토 주민등록번호를 **읽을 수 없다**.
  복호화 불가이지 손실은 아니지만, 멘토에게 다시 받아야 한다

## 운영에서 꺼야 하는 것

`PAYMENTS_DRY_RUN` 과 `ZOOM_DRY_RUN` 은 개발용이다. 켜져 있으면 결제가 일어나지 않고
가짜 줌 링크가 발송된다. `check:env` 가 이 둘을 경고한다.
