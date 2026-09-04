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
