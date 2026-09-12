# 인수인계

다른 계정·다른 사람이 이 프로젝트를 이어받을 때 먼저 읽는 문서다.
`CLAUDE.md` 가 "무엇을 만드는가"라면, 이 파일은 "지금 어디까지 왔는가"다.

---

## 0. 넘어가는 것과 넘어가지 않는 것

| 넘어감 | 방법 |
|---|---|
| 소스 코드 전부 | 깃허브 `project465/pca-platform` |
| 결정 사항·원칙 | `CLAUDE.md` |
| 진행 상황·남은 일 | 이 파일 |
| 화면 시안 | `mockups/*.html` |
| 참고 자료 원본 (제안서·교육부 보도자료) | `docs/reference/` |

| 안 넘어감 | 대신 |
|---|---|
| 대화 기록 | 이 문서로 대신한다 |
| 게시한 미리보기(아티팩트) | 계정에 묶여 있다. 아래 3번대로 다시 뽑으면 된다 |

**새 계정에서 할 일은 세 가지뿐이다.**
1. 그 계정에 `project465/pca-platform` 접근 권한을 준다
2. 세션을 열고 `CLAUDE.md` 와 이 파일을 읽힌다
3. 브랜치 `claude/project-summary-huym3u` 를 체크아웃한다 (기본 브랜치에 아직 병합 안 됨)

---

## 1. 레포 구조

한 레포 안에 **앱이 둘**이다. npm 프로젝트도 각각이다.

```
pca-platform/
├─ CLAUDE.md            ← 프로젝트 설명서. 여기부터
├─ db/schema.sql        ← 테이블 정의
├─ mockups/*.html       ← 확정된 화면 시안
├─ docs/HANDOFF.md      ← 이 파일
├─ src/                 ← ① 검사 플랫폼 (로그인·응시·결과)
└─ marketing/           ← ② 나라별 소개 사이트 (별도 npm 프로젝트)
   └─ src/content/*.ts     원고는 전부 여기. 컴포넌트에 한국어가 박혀 있지 않다
```

둘을 섞지 않는다 — `CLAUDE.md` 설계 원칙 5.

---

## 2. 띄우는 법

**플랫폼**
```bash
cd pca-platform
npm install
# PostgreSQL 16 필요. .env.local 에 DATABASE_URL, AUTH_SECRET
psql "$DATABASE_URL" -f db/schema.sql
npm run db:seed              # 관리자·학과담당자·학생 계정
npm run db:seed:mentoring    # 현멘 멘토 6명과 열린 시간대
npm run db:seed:questions    # 검사 문항 12개 (시안에서 가져온 예시)
npm run db:seed:report       # 채점된 응시 한 건 (결과지 화면 확인용)
npm run dev                  # :3000
```

현멘(현직자 멘토링)을 줌 없이 화면만 볼 거면 `.env.local` 에 `ZOOM_DRY_RUN=1`.
알림 발송기는 따로 돈다 — `npm run notify -- --dry` 로 나갈 것을 먼저 본다.

**소개 사이트**
```bash
cd pca-platform/marketing
npm install
SITE=kr     npm run dev      # 한국어판  :3100
SITE=global npm run dev      # 영어판
```

의존성 두 가지는 이유가 있어서 고정돼 있다.
- `next@15.5.25` — 15.5.4 는 CVE-2025-66478 이 있다. 내리지 말 것
- 폰트 Pretendard 는 npm 패키지에서 자체 호스팅한다. jsDelivr 는 이 환경의
  프록시가 막는다

---

## 3. 미리보기를 다시 뽑는 법

컨테이너에 인바운드 네트워크가 없어서 개발 서버 URL 을 밖에서 열 수 없다.
그래서 사이트 전체를 **HTML 한 장**으로 굽고 그걸 게시해 왔다.

```bash
cd pca-platform/marketing
SITE=kr npm run build && SITE=kr npm start &      # :3100
node scripts/export-preview.mjs kr out-kr.html
```

내비게이션에 걸린 모든 라우트를 돌며 `<main>` 을 모으고, CSS 와 쓰인 woff2
서브셋을 파일 안에 넣고, `href="/x"` 를 `#x` 로 바꿔 `:target` 으로 페이지를
넘기게 만든다. 자바스크립트 없이 동작한다. 결과 파일을 아티팩트로 올리면 된다.

다른 스크립트
- `scripts/gen-world-map.mjs` — world-atlas 로 세계지도 SVG 를 굽는다
- `scripts/gen-og.mjs` — 공유 썸네일
- `scripts/shots.mjs`, `../scripts/screenshots.mjs` — 화면 촬영

---

## 4. 지금까지 된 것

**플랫폼 (`src/`)** — 개발 순서 1단계까지
- PostgreSQL 스키마 적용. `password_reset_tokens` 를 schema.sql 10절에 추가했다
- Auth.js(next-auth 5 beta) Credentials + JWT, bcryptjs 12 라운드
- 로그인 / 비밀번호 재설정
- 운영사 관리자 — 기관 생성, 기관 목록

**단체 리포트 (2026-09-12)** — `/org/sessions/[id]/report`
시안대로. 집계는 `src/lib/group-report.ts`. 담당자·교수·운영사만 보고 학생은 404다.
시연용 응답을 채우려면 `npm run db:seed:responses -- <회차id>`.

**채점 (2026-09-12)** — 개발 순서 4단계
`src/lib/scoring.ts`. 운영사가 `/admin/instruments/[id]` 에서 지표 × 직무 가중치를
채우고, 담당자가 회차 화면에서 채점을 돌린 뒤 결과를 공개한다.
가중치가 비어 있으면 채점 버튼 대신 안내가 뜬다.

**응시 (2026-09-12)** — 개발 순서 3단계, `/exam/[attemptId]`
시안(`mockups/01_test_screen.html`)대로. 시작 → 문항 → 제출, 문항마다 즉시 저장,
창을 닫아도 이어보기. 응시권은 시작할 때 소진된다.
- 문항은 처음에 전부 내려주고 서버로는 시작·저장·제출만 간다. 배점은 내리지 않는다
- 저장은 대기열 + 재시도. 연결이 끊기면 다시 보내고, 마감된 회차처럼 소용없는
  실패는 멈추고 새로고침을 권한다. 저장 안 된 응답이 있으면 제출을 막는다
- 키보드만으로 끝까지 갈 수 있다. 숫자키로 고르고 Alt+방향키로 문항을 옮긴다.
  선택지는 라디오 그룹이라 방향키는 그룹 안에서 움직인다

**계약·회차·명단 (2026-09-12)** — 개발 순서 2단계
- 운영사 `/admin/contracts` — 계약 등록. 등록과 동시에 응시권(seats)이 그 수만큼 생긴다
- 학과 `/org` — 남은 응시권과 회차 목록. `/org/sessions/new` 회차 생성
- 학과 `/org/sessions/[id]` — 명단 업로드(xlsx·csv·tsv) → 계정 일괄 발급 → 진행 현황 →
  결과 공개 버튼. 담당자만 바꿀 수 있고 교수는 보기만 한다

명단 파서를 직접 만들었다(`src/lib/sheet.ts`). 후보였던 exceljs 는 21MB 에 취약점이
보고된 uuid 를 물고 오는데 우리는 읽기만 하면 된다. xlsx 는 ZIP 안의 XML 두 개이고
압축 해제는 node:zlib 에 이미 있다. 실제 엑셀 파일로 확인한다 — `npm run check:sheet`.

**결과지 (2026-09-12)** — `/my/report/[attemptId]`
시안대로 그리고, 맨 아래에 1순위 직무의 현직자 멘토를 붙였다. 게이지마다
'현직자 n명' 링크가 `/mentoring?job=..&from=report` 로 간다. 점수는 계산하지 않고
저장된 값을 읽기만 한다(`src/lib/report.ts`).

**현멘 — 현직자 멘토링 (2026-09-12)** — schema.sql 11절, `/mentoring`
석·박사 대상. 갤러리 → 신청 → 승낙 → 줌 자동 생성 → 일정 자동 발송까지 돈다.
- 화면 다섯 — 갤러리 / 멘토 상세·신청 / 내 신청 / 멘토 콘솔 / 운영사 승인
- 줌은 Server-to-Server OAuth 로 운영사 계정 하나에서 만든다 (`src/lib/zoom.ts`).
  멘토에게 줌 계정을 요구하지 않으므로 멘토 이메일이 회의에 남지 않는다
- 알림은 `notifications` 큐에 쌓고 `scripts/notify.ts` 가 비운다.
  확정 안내 2통 + 24시간 전·1시간 전 리마인더 4통이 승낙 한 번에 들어간다
- 이메일이 없는 계정(학번 로그인)은 `channel=inapp` 으로 넣고 `/mentoring/requests`
  화면에서 읽게 한다. 보낼 수 없는 주소로 보낸 척하지 않는다

주의할 구현 세 가지
- 승낙은 **DB 선점 → 줌 생성 → 회의·알림 저장** 순서다. 줌이 실패하면 승낙을
  되돌린다. 외부 호출을 트랜잭션 안에 넣지 않는다
- `meetings.request_id` 가 UNIQUE 다. 승낙이 두 번 눌려도 회의가 겹쳐 생기지 않고,
  뒤늦게 만들어진 줌 회의는 지운다
- `src/lib/anon.ts` 는 클라이언트 컴포넌트도 불러온다. `node:crypto` 를 쓰면
  번들이 깨진다 — 웹 표준 `crypto.getRandomValues` 를 쓴다

주의할 구현 두 가지
- `src/lib/db.ts` 의 풀은 **게으르게** 만든다. 모듈 로드 시점에 만들면
  `.env.local` 을 읽기 전에 연결하려다 죽는다
- JWT 타입 보강은 `"@auth/core/jwt"` 와 `"next-auth/jwt"` **둘 다** 해야 한다.
  뒤쪽만 하면 `token.displayName` 이 `{}` 가 된다

**소개 사이트 (`marketing/`)**
- 라우트 7개. 한국 `/ /pca /anchor /adopt /pricing /about /contact`,
  글로벌은 `/anchor /adopt` 대신 `/localisation /partnership`
- 원고 `src/content/kr.ts` · `global.ts`. 번역판이 아니라 **말 거는 상대가 다르다**
  (한국은 학과·앵커사업, 글로벌은 대학·부처·현지 파트너)
- 결과지 뷰어 — 한국 11개 섹션, 글로벌 10개 (09 지역연계는 한국 전용).
  라디오 기반이라 JS 없이 탭이 넘어간다
- 예시 결과지 — 홈 첫 화면 바로 다음. 직무 10개 순위 막대, 성향 6축 레이더,
  12개월 할 일, 지역 연계 집계
- 세계지도 — 운영 6개국(KR/DE/US/JP/CN/TR), 예정 4개국(KZ/FR/ZA/PH)
- 국가 선택 드롭다운(글로벌 헤더), 요금제 3단, 문의 폼(간단형·전체형)

---

## 5. 아직 안 된 것

**플랫폼** — MVP 화면은 다 만들었다
남은 것은 가중치 값 자체다. 표는 만들어 뒀지만 무엇을 넣을지는 정해지지 않았다.

명단 발급에서 알아둘 것
- 비밀번호 해싱이 1건당 0.4초다. 발급을 10명씩 끊어 부르는 이유이고,
  대량(수백 명) 발급을 자주 한다면 라운드 수나 해싱 방식을 다시 볼 일이다
- 임시 비밀번호는 발급 화면을 벗어나면 다시 볼 수 없다. 재발급은
  비밀번호 재설정(`password_reset_tokens`)으로 해야 하는데, 담당자가 링크를
  발급하는 화면은 아직 없다

**현멘 — 공개 전에 반드시**
- 줌 앱 자격 증명(`ZOOM_ACCOUNT_ID`·`ZOOM_CLIENT_ID`·`ZOOM_CLIENT_SECRET`).
  없으면 승낙이 실패한다. 멘토 콘솔에 그 경고를 띄워 뒀다
- 알림 발송 웹훅(`MAIL_WEBHOOK_URL`)과 크론 `*/5 * * * * npm run notify`.
  크론이 안 돌면 리마인더도, 응답 기한 자동 만료도 일어나지 않는다
- 검사 결과지와의 연결 — 결과지 상위 직무 영역에서 바로 멘토를 찾아가는 동선.
  데이터(`mentor_job_clusters`)는 준비됐고 화면만 없다
- 과금과 멘토 보상이 정해지지 않았다 (CLAUDE.md 「아직 정해지지 않은 것」)

**소개 사이트 — 공개 전에 반드시**
- 문의 폼 백엔드. 지금은 서버 액션이 JSONL 파일에 쓴다. 서버리스에 올리면 날아간다.
  DB 나 메일로 바꿔야 한다
- 한국판 개인정보 수집·이용 동의 체크박스와 개인정보처리방침 페이지 (PIPA)
- 결제. 요금제의 `price` 가 `string | null` 이고, 값이 채워지면 버튼이
  "가격 문의"에서 "바로 신청"으로 바뀌도록만 만들어 뒀다. PG 연동은 없다

---

## 6. 사람이 정해줘야 하는 것

임의로 정하지 말 것.

| 항목 | 쓰이는 곳 |
|---|---|
| 가격 (개인 / 학과 / 대학 전체) | `content/*.ts` 의 `pricing.plans[].price` |
| 결제 수단 (토스페이먼츠·아임포트 / Stripe) | 신청 흐름 |
| 국가별 실제 도메인 | `regions.items[].domain`, `footer.sites` |
| 행사 사진 11장 | `PhotoSlot` 자리. 스톡 사진으로 채우지 않았다 |
| ACADEMIX 로고 파일 | 지금은 글자 마크 |
| 파트너 기관명 공개 동의 | `about.partners` |
| 지도에 한국을 "운영 중"으로 둘지 | `map.countries` |
| 채점 산식 · 문항 | 플랫폼 4단계 |

---

## 7. 지키기로 한 선

원고를 고칠 때 이건 유지한다.

- **지역정주 취업률을 PCA 가 산출한다고 쓰지 않는다.** 졸업 후 취업 통계로
  확정되는 지표다. PCA 가 대는 것은 학생 체감의 증거와 정주로 가는 과정 데이터다
- **정책 수치에는 출처를 붙인다.** 앵커사업 숫자는 교육부 보도자료(2026.4.2) 출처를
  화면에 함께 적는다
- **예시 결과지는 예시라고 밝힌다.** 직무 10개·성향 6유형·지역 연계 수치(대전 184곳)는
  실제 제품의 것이지만, 학생 한 명분 응시 자료는 지어낸 것이다. 문서 아래 고지 줄을
  지우지 않는다
- **도입 실적·가격을 지어내지 않는다.** 없으면 빈칸으로 두고 물어본다

---

## 8. 막힌 것

이 환경의 프록시가 CONNECT 단계에서 403 을 준다. 우회할 방법은 없다.

- `www.academix.co.kr` — 실제 사이트. 스크린샷을 사람이 올려서 해결했다
- `www.moe.go.kr` — 교육부 보도자료. PDF 를 사람이 올려서 해결했다
- `cdn.jsdelivr.net` — 폰트. npm 패키지 자체 호스팅으로 해결했다

같은 자료가 또 필요하면 `docs/reference/` 에 원본을 넣어 뒀으니 그걸 읽으면 된다.
