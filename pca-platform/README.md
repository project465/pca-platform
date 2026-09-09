# 시작하기

이 폴더를 Claude Code로 열면 프로젝트 맥락을 이미 알고 있는 상태에서 대화가 시작된다.

## 준비물

1. **Claude 데스크톱 앱** — 터미널 없이 Code 탭에서 쓸 수 있다
   (터미널이 편하면 Claude Code CLI를 써도 된다)
2. **Node.js LTS** — 개발 서버를 돌리는 데 필요하다. https://nodejs.org
3. **PostgreSQL** — 로컬에 설치하거나 관리형 서비스를 쓴다

## 첫 실행

1. 이 폴더를 압축 해제한다
2. Claude Code에서 이 폴더를 작업 폴더로 연다
3. 이렇게 말한다:

```
CLAUDE.md와 db/schema.sql을 읽고,
개발 순서 1단계(계정)부터 시작해줘.
Next.js 프로젝트를 이 폴더에 만들고 로그인 화면까지 만들어줘.
```

4. 만들어지면 개발 서버를 켠다

```
npm run dev
```

5. 브라우저에서 http://localhost:3000 을 연다

이제 Claude에게 "로그인 버튼 색을 바꿔줘"라고 말하면
파일이 수정되고 브라우저가 자동으로 새로고침된다.

## 작업할 때 요령

- **한 번에 하나씩 시킨다.** "계정이랑 응시랑 결과지 다 만들어줘"보다
  "로그인 화면부터 만들어줘"가 훨씬 잘 나온다
- **화면은 mockups 폴더를 가리킨다.** "mockups/01_test_screen.html처럼 만들어줘"
- **결정이 바뀌면 CLAUDE.md를 고친다.** 그래야 다음 세션에서도 유지된다
- **자주 저장한다.** git을 쓰면 되돌리기가 쉽다.
  Claude에게 "git 저장소 만들고 커밋해줘"라고 하면 된다

---

# 개발 환경 (1단계 완료 시점)

## 준비

```bash
npm install
cp .env.example .env.local     # DATABASE_URL, AUTH_SECRET 을 채운다
```

`AUTH_SECRET` 은 아래로 만든다.

```bash
openssl rand -base64 32
```

## 데이터베이스

```bash
createdb pca
npm run db:reset               # db/schema.sql 적용
npm run db:seed                # 개발용 계정과 기관 생성
```

시드가 만드는 개발용 계정 — **운영에서는 절대 쓰지 않는다.**

| 역할 | 아이디 | 비밀번호 |
|---|---|---|
| 운영사 관리자 | `admin` | `pca-dev-admin-1234` |
| 학과 담당자 | `me-admin` | `pca-dev-org-1234` |
| 학생 (첫 로그인) | `2021001234` | `TempPass2026` |

학생 계정은 `must_reset_pw` 가 켜져 있어 로그인하면 비밀번호 변경 화면으로 간다.

## 실행

```bash
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```

## 지금까지 만든 것

**1단계 — 계정**

- 로그인 (학번 또는 이메일). 아이디 존재 여부는 오류 메시지로 구분되지 않는다
- 첫 로그인 강제 비밀번호 변경 (`users.must_reset_pw`)
- 비밀번호 재설정 링크 (`password_reset_tokens`, 24시간·1회용, DB에는 해시만 저장)
- 역할별 진입 (`superadmin` / `org_admin` · `instructor` / `student`)
- 운영사 관리자: 기관 목록, 기관 등록 (대학–학과 계층, 이름은 `translations` 행으로 저장)

메일 발송은 아직 붙어 있지 않다. 학생 계정은 이메일이 없는 경우가 많아,
실제 운영에서는 학과 담당자가 재설정 링크를 발급해 전달하는 경로가 주가 된다.
그 화면은 2단계(명단 관리)에서 만든다.


## 단체 도입 흐름

소개 사이트에서 단체가 신청하면 운영자가 승인하고, 그 자리에서 기관·담당자
계정·계약·전용 링크가 함께 만들어진다. 학생은 그 링크로 들어와 응시자가 된다.

```
소개 사이트 도입 신청 폼
      │  서버에서 POST /api/applications  (x-intake-secret)
      ▼
org_applications  (접수번호 PCA-2026-XXXXXX 를 신청자에게 보여준다)
      │  운영자가 /admin/applications 에서 승인
      ▼
organizations + translations + 담당자 users/memberships
            + contracts + seats(좌석 수만큼)
            + org_links(전용 링크)
      │  담당자가 링크를 학생에게 뿌린다
      ▼
/join/<token>  →  학생 users/memberships + 좌석 1개 배정
```

승인 전에는 아무 권한도 생기지 않는다. 링크는 좌석 수를 상한으로 하고
만료·회수가 있으며, 남은 좌석이 없으면 등록이 막힌다.

### 메일

공급자를 코드에 박지 않고 SMTP 로만 말한다. SES·SendGrid·Postmark·학교 메일
서버가 전부 SMTP 를 쓰므로 어디로 보낼지는 환경변수로 정한다. 도메인과
공급자가 아직 정해지지 않은 상태에서 한쪽에 묶이지 않으려는 것이다.

| 언제 | 받는 사람 | 내용 |
|---|---|---|
| 신청이 들어왔을 때 | 신청자 | 접수번호 |
| 승인했을 때 | 담당자 | 전용 링크 + 비밀번호 설정 링크 |
| 비밀번호 찾기 | 본인 | 재설정 링크 |

**임시 비밀번호를 메일로 보내지 않는다.** 메일은 남고 전달되므로 비밀번호가
오래 떠돈다. 대신 한 번 쓰면 닫히는 설정 링크(72시간)를 보낸다.

**메일이 실패해도 본 작업은 되돌아가지 않는다.** 승인은 트랜잭션 안에서
끝나고 발송은 그 밖에서 한다. 못 보냈으면 승인 화면이 그렇게 밝히고,
전달용 안내문을 띄워 사람이 옮길 수 있게 한다.

`MAIL_TRANSPORT=log` 면 실제로 보내지 않고 `.mail/outbox.jsonl` 에 쌓는다.
메일이 아직 연결되지 않은 배포에서도 무엇이 나갔어야 하는지 남는다.

### 필요한 환경변수

| 곳 | 변수 | 뜻 |
|---|---|---|
| 플랫폼 | `INTAKE_SECRET` | 소개 사이트가 신청을 넘길 때 대는 값 |
| 소개 사이트 | `PLATFORM_INTAKE_URL` | 플랫폼의 접수 주소 |
| 소개 사이트 | `INTAKE_SECRET` | 플랫폼 쪽과 같은 값 |
| 플랫폼 | `MAIL_TRANSPORT` | `smtp` 면 실제 발송, `log` 면 파일에만 (기본값) |
| 플랫폼 | `MAIL_FROM` | 보내는 사람 |
| 플랫폼 | `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | `smtp` 일 때 |

소개 사이트에 이 값이 없으면 신청은 파일(`.inquiries/contact.jsonl`)에만 쌓인다.
플랫폼이 응답하지 않을 때도 파일에는 남으므로 신청을 잃지 않는다.

### 담당자 화면 (`/org`)

담당자는 자기 기관의 전용 링크를 직접 관리한다 — 복사, 회수, 새로 만들기.
회차마다 링크를 나눠 뿌리면 어느 쪽이 얼마나 들어왔는지 링크별로 보인다.

여기서 지키는 것이 하나 있다. **화면에서 넘어온 기관 id 나 링크 id 를 믿지
않는다.** 볼 수 있는 기관은 세션의 소속에서 나오고, 회수는 링크 id 로 기관을
되짚어 소속과 맞춰 본다. 남의 링크는 "없는 링크" 와 똑같이 답한다 — 존재
여부조차 알려줄 이유가 없다. 교수(instructor)는 보기만 하고, 만들고 회수하는
것은 담당자(org_admin) 몫이다.

새 링크의 등록 상한은 남은 응시권 수로 눌린다. 화면의 `max` 는 브라우저에만
있는 제한이므로 서버에서 다시 자른다.

```bash
node scripts/e2e-org-links.mjs                      # 만들기·회수·상한
FOREIGN_LINK_ID=5 node scripts/e2e-org-links.mjs    # 남의 링크까지 시험
```

### 아직 안 된 것

- 메일이 반송되었는지(bounce) 추적하지 않는다. 주소를 잘못 적으면 담당자는
  아무것도 못 받고, 운영자는 그 사실을 모른다. 승인 화면의 안내문이
  지금으로서는 유일한 대비책이다

### 흐름 전체를 한 번 돌려보기

```bash
npm run db:reset && npm run db:seed
npm run build && npm start
node scripts/e2e-join.mjs      # 신청→승인→링크→학생 등록까지 브라우저로 확인
```
