# 50. Railway 배포

> GitHub 에 올리면 Railway 가 받아서 띄운다. **VPS 한 대를 손으로 꾸리는
> 길(`deploy/docker-compose.*.yml` · `deploy/Caddyfile`)과 나눠 둔다**:
> 둘은 서로 다른 길이고, 한 길을 고를 때 다른 길의 파일을 보지 않는다.

```
GitHub ──▶ Railway App (Dockerfile)
              ├── Railway PostgreSQL     DATABASE_URL 하나로 붙는다
              ├── Volume                 결과지 PDF
              └── app.careermatri.com    인증서는 Railway 가 받는다
```

## 1. 무엇을 고쳤는가

**포트를 못 박지 않는다.** Railway 는 띄울 때 `PORT` 를 넣어 주고, 그
값으로 듣지 않으면 밖에서 아무도 못 붙는다. Next 의 standalone 서버는
`process.env.PORT` 를 읽으므로 Dockerfile 의 `ENV PORT=3000` 은 **아무도
안 넣어 줬을 때의 값**이다. 컨테이너 자체 헬스체크도 `${PORT:-3000}` 으로
바꿨다: 밖에서 넣어 준 값으로 듣고 있는데 3000 을 두드리면 멀쩡한
컨테이너가 죽은 것으로 보인다.

**붙여 준 디스크의 주인을 고쳐 준다**(`deploy/entrypoint.sh`). 볼륨을
걸어 주면 그 자리는 root 것인데 우리는 root 로 돌지 않는다. 그대로 두면
결과지를 쓰는 순간 `EACCES` 가 나고, **그 자리가 결제를 마친 손님이
내려받기를 누른 자리다.** root 로 들어와 주인을 고치고, 실제로 한 번 써
보고, 권한을 내려놓고 앱을 띄운다. 못 쓰면 **지금 멈춘다**: 결제 뒤에
멈추는 것보다 싸다.

**쉬고 있는 연결이 끊겼다고 프로세스를 죽이지 않는다.** 관리형 DB 는
점검이나 재배포로 연결을 끊고, `pg` 는 그것을 풀의 `error` 로 올린다.
받아 주는 자리가 없으면 Node 가 통째로 죽어서 **DB 가 1초 끊긴 일이 앱이
재시작하는 일**이 된다. 받아 주고, 못 붙은 질의는 두 번 더 해 본다
(0.3초 · 1.2초). **문법이 틀린 질의는 다시 하지 않는다**: 다시 해도
틀리고 그 사이 손님은 세 배로 기다린다.

**플랫폼 주소가 정규 주소보다 먼저다.** 메일 링크 · 결제 콜백 · 결과지
주소는 **플랫폼이 떠 있는 자리로 돌아와야 한다.** `site_configs` 의 정규
주소는 소개 사이트가 서는 자리(`careermatri.co.kr` · `careermatri.com`)라,
그쪽을 먼저 보면 결제를 끝낸 사람이 소개 사이트로 떨어진다.
`PLATFORM_URL` 이 먼저고, 비어 있을 때만 정규 주소로 되돌아간다.

**운영에 시드를 붓지 않는다.** `db:seed` 는 비밀번호가 저장소에 적힌
계정을 만든다. 운영에 한 번 들어가면 **아이디와 비밀번호가 공개된
운영자 계정**이 생긴다. `APP_ENV=production` 이면 시드와 시연 자료가
거절되고(`scripts/not-in-production.mjs`), 운영자는
`scripts/make-admin.ts` 로 하나만 만든다. 비밀번호는 그 자리에서 만들어
**한 번만 보여 주고 해시만 남긴다.**

## 2. 마이그레이션을 셋으로 나눈다

| | 언제 | 넣는 것 |
|---|---|---|
| `db:init` | **빈 운영 DB 처음 한 번** | 표 · 문항 · 승인된 가격 |
| `db:upgrade` | 그 다음 배포마다 | 더해진 칸만 (전부 `IF NOT EXISTS`) |
| `dev:setup` | **개발에서만** | 위 전부 + 시드 + 시연 자료 |

`db:init` 은 표가 하나라도 있으면 **스스로 멈춘다**: `db/schema.sql` 은
`CREATE TABLE` 이라 이미 선 DB 에서는 첫 줄에서 깨지고, 그 깨짐을 보고
사람이 당황하는 것보다 미리 막는 쪽이 낫다.

## 3. Railway 에서 쓰지 않는 것

`deploy/docker-compose.staging.yml` · `deploy/docker-compose.prod.yml` ·
`deploy/Caddyfile` 은 **VPS 한 대를 손으로 꾸릴 때의 길**이다. Railway 는
서비스마다 컨테이너를 따로 띄우고 인증서도 직접 받으므로 이 셋을 보지
않는다. 지우지 않는 까닭은 Railway 를 떠날 날이 올 수 있어서다.

## 4. 아직 밖에서 정해져야 하는 것

결제 대행사 · 메일 대행사 · 사업자 표시 일곱 칸. 셋이 다 빌 때까지는
`APP_ENV=staging` 으로 띄우고 자물쇠를 건다. 셋이 채워지는 날
`APP_ENV=production` 으로 바꾸고 자물쇠를 뗀다. **순서를 거꾸로 하지
않는다**: 자물쇠를 먼저 떼면 결제가 가짜인 채로 열린다.
