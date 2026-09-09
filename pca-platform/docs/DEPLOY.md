# 배포

세 가지를 따로 띄운다. 셋 다 같은 레포에서 나온다.

| | 무엇 | 예시 주소 |
|---|---|---|
| 플랫폼 | 학생·담당자·운영자가 로그인하는 곳 | `app.⟨도메인⟩` |
| 소개 사이트 (한국) | `SITE=kr` 로 빌드한 `marketing/` | `⟨한국 도메인⟩` |
| 소개 사이트 (글로벌) | `SITE=global` 로 빌드한 `marketing/` | `⟨글로벌 도메인⟩` |

**플랫폼은 하나다.** 나라가 늘어도 소개 사이트만 늘고 플랫폼은 그대로다
(설계 원칙 5).

---

## 0. 먼저 정해야 하는 것

이게 정해지기 전에는 배포해도 쓸 수 없다.

- [ ] 도메인 세 개 (또는 한 도메인의 서브도메인)
- [ ] `AUTH_SECRET` — `openssl rand -base64 32`
- [ ] `INTAKE_SECRET` — `openssl rand -base64 24`. 플랫폼과 소개 사이트가 같은 값을 쓴다
- [ ] 메일 발송 계정 (SMTP)
- [ ] 사업자 정보 — `src/content/privacy.ts` 의 `⟨…⟩` 를 채운다

## 1. 데이터베이스

관리형 PostgreSQL 16 을 하나 만든다 (Neon · Supabase · RDS 등).

```bash
# 스키마를 한 번 넣는다. 처음 한 번만이다
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
```

그다음 **문항을 넣는다.** 문항이 없으면 회차를 열 수 없고, 회차가 없으면
학생이 등록해도 응시할 것이 없다.

```bash
npx tsx scripts/load-instrument.ts ⟨실제 문항 파일⟩.json
# 넣은 뒤 published 로 올려야 학생에게 보인다
psql "$DATABASE_URL" -c "UPDATE instruments SET status='published', published_at=now() WHERE version='⟨판⟩'"
```

> **`npm run db:seed` 를 운영에 돌리지 않는다.** 아무나 아는 비밀번호로
> 운영사 관리자 계정을 만든다. `NODE_ENV=production` 이면 스스로 멈추도록
> 막아 두었지만, 애초에 부르지 않는다.

운영사 관리자 계정은 손으로 하나 만든다.

```bash
# 비밀번호 해시를 만들어서
npx tsx -e "import('./src/lib/password').then(m=>m.hashPassword('⟨긴 비밀번호⟩').then(console.log))"
# users 에 넣고 role 을 준다
```

이후 마이그레이션은 `db/migrations/README.md` 를 따른다.

## 2. 플랫폼

Next.js 15 이므로 Vercel 이 가장 손이 덜 간다. 다른 곳도 Node 20 이상이면 된다.

**환경변수**

```
DATABASE_URL=postgres://…
AUTH_SECRET=⟨openssl rand -base64 32⟩
AUTH_URL=https://app.⟨도메인⟩
INTAKE_SECRET=⟨소개 사이트와 같은 값⟩
MAIL_TRANSPORT=smtp
MAIL_FROM=PCA <no-reply@⟨도메인⟩>
SMTP_HOST=…
SMTP_PORT=587
SMTP_USER=…
SMTP_PASS=…
```

**서버가 뜰 때 설정을 검사한다.** 위 값이 비었거나 검사용 기본값이면
서버가 뜨지 않고 무엇이 빠졌는지 찍는다 (`src/instrumentation.ts`).
특히 `MAIL_TRANSPORT` 가 `log` 면 뜨지 않는다 — 그대로 뒀다가는 승인 메일이
파일에만 쌓이고 담당자는 링크를 못 받는데 화면에는 "보냈습니다" 가 뜬다.

```bash
npm ci && npm run build && npm start
```

**확인**

```bash
curl -s https://app.⟨도메인⟩/api/health     # {"status":"ok"}
```

## 3. 소개 사이트

**여기가 제일 자주 틀리는 곳이다.** 소개 사이트는 페이지를 미리 그려 두므로
`SITE` 와 `PLATFORM_URL` 이 **빌드할 때** 있어야 한다. 실행할 때 넣으면
아무 효과가 없다.

```bash
cd marketing
rm -rf .next                      # 남은 빌드가 있으면 옛 값이 그대로 나간다
SITE=kr \
PLATFORM_URL=https://app.⟨도메인⟩ \
PLATFORM_INTAKE_URL=https://app.⟨도메인⟩/api/applications \
INTAKE_SECRET=⟨플랫폼과 같은 값⟩ \
npm run build
npm start
```

글로벌판은 `SITE=global` 로 같은 것을 한 번 더 한다. Vercel 이면 프로젝트를
두 개 만들고 환경변수만 다르게 준다.

**확인**

```bash
curl -s https://⟨한국 도메인⟩ | grep -o 'href="https://app[^"]*"' | sort -u
# https://app.⟨도메인⟩/login 과 /privacy 가 나와야 한다
```

## 4. 도메인 연결

1. 도메인을 산다 (가비아 · 후이즈 · Cloudflare)
2. 배포처가 알려주는 대로 DNS 를 건다
   - 루트(`⟨도메인⟩`) → A 레코드
   - 서브도메인(`app.⟨도메인⟩`) → CNAME
3. HTTPS 인증서는 Vercel 이 자동으로 발급한다. 다른 곳이면 Let's Encrypt
4. 도메인이 붙은 **뒤에** `AUTH_URL` 과 `PLATFORM_URL` 을 실제 주소로 바꾸고
   **소개 사이트를 다시 빌드한다**

## 5. 배포 뒤 확인

손으로 한 바퀴 돈다. 15분이면 된다.

- [ ] `/api/health` 가 `ok`
- [ ] 소개 사이트에서 로그인을 누르면 플랫폼으로 간다
- [ ] 소개 사이트 꼬리의 개인정보 처리방침이 열린다
- [ ] 소개 사이트 문의 폼을 넣으면 접수번호가 나온다
- [ ] 운영자로 로그인해 그 신청이 보인다
- [ ] 승인하면 **담당자 메일이 실제로 도착한다** (여기서 대부분 걸린다)
- [ ] 설정 링크로 담당자 비밀번호를 정하고 로그인된다
- [ ] 회차를 연다
- [ ] 전용 링크로 학생 등록 → 동의 없이는 막히는지
- [ ] 응시 → 제출
- [ ] 결과 공개 → 학생이 결과지를 본다
- [ ] 건당 계약이면 `/admin/billing` 에 건이 잡힌다

## 6. 아직 없는 것

배포 전에 알고 있어야 한다. 없다고 못 여는 것은 아니지만, 학교가 물으면
없다고 답해야 한다.

- **채점 산식** — 지표에서 직무 적합도를 내는 가중치가 정해지지 않았다.
  응시와 제출은 되지만 결과지가 채워지지 않는다
- **실제 문항** — 지금 들어 있는 것은 예시 12문항이다
- **매핑 데이터** — 직무·역량·과목 표
- 백업·복구 절차, 사고 대응 절차
- 부하 시험 (학과 단위 수십~수백 명은 문제없다고 보지만 재 본 적이 없다)
- ISMS 인증, 취약점 점검
- 개인정보 처리방침 법률 검토

---

## 자주 나는 사고

| 증상 | 원인 |
|---|---|
| 소개 사이트의 로그인이 localhost 로 간다 | `PLATFORM_URL` 을 실행할 때 줬다. 빌드할 때 줘야 한다 |
| 값을 바꿨는데 그대로다 | `marketing/.next` 를 안 지웠다 |
| 승인은 되는데 메일이 안 온다 | `MAIL_TRANSPORT=log`. 운영에서는 서버가 아예 뜨지 않게 막았다 |
| 비밀번호 설정 링크가 안 열린다 | `AUTH_URL` 이 실제 주소가 아니다 |
| 소개 사이트 문의가 플랫폼에 안 들어온다 | 두 쪽의 `INTAKE_SECRET` 이 다르다 |
| 학생이 등록은 되는데 응시할 것이 없다 | 회차를 안 열었거나, 문항이 `published` 가 아니다 |
