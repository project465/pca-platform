# CareerMatri 인계 문서 (새 Claude 계정용)

작성 2026-10-26. 이 파일 하나를 읽으면 지금까지의 작업을 이어받을 수 있게 정리했다.
더 자세한 것은 저장소의 `CLAUDE.md`(약 1만 3천 줄, 결정 이력 전부)와 `docs/metri/` 문서에 있다.
**이 파일과 `CLAUDE.md` 가 어긋나면 `CLAUDE.md` 가 맞다.**

> 비밀번호 · API 열쇠 · 시험 계정 비밀번호는 이 파일에 없다. 값은 Railway 변수와 사업주가 들고 있다.

---

## 0. 새 계정에서 시작하는 법

**Claude Code(웹·앱)로 이어 갈 때**
1. 새 계정에 GitHub 를 연결하고 저장소 `project465/pca-platform` 접근을 허용한다
   (Claude GitHub App 이 그 저장소에 설치돼 있어야 한다).
2. 세션을 열 때 그 저장소를 고르고, 가지는 개발 가지 `claude/lucid-ptolemy-9my676` 에서 시작한다.
3. 첫 메시지로 이렇게 보낸다:
   `docs/HANDOFF_CLAUDE.md 와 CLAUDE.md 를 먼저 읽고, 거기 적힌 규칙대로 이어서 작업해줘.`
4. 저장소 안의 실제 앱은 `pca-platform/` 하위 폴더에 있다(저장소 맨 위에 폴더가 하나 더 있다).

**claude.ai 채팅(프로젝트)으로 쓸 때**
- 프로젝트를 하나 만들고 이 파일을 "프로젝트 지식"에 올린다. 코드 작업은 못 하지만 문서·PPT·문구 작업은 이어 갈 수 있다.

---

## 1. 사업주(사용자)와 일하는 방식

- 사업주는 **비개발자**다. 보고는 **쉬운 한국어**로, 전문용어 없이, 결과 먼저.
- 사업주가 반복해서 지적한 것: **"AI 티 나는 문장"**. 화면·결과지·홈페이지·PPT 문구 모두 해당(아래 4절 규칙).
- 확인하지 않은 것을 확인한 것처럼 쓰지 않는다. "확인함 / 확인 못 함 / 실패" 를 갈라서 보고한다.
- 결과물(PDF·PPT·그림)은 만들면 바로 파일로 보내 준다.
- 사업주가 쓴 말: "vercel 하기 싫다니까" → 배포는 **Railway** 하나로 간다. Vercel 제안 금지.

---

## 2. 무엇을 만드는가

**CareerMatri (커리어매트리)** — 대학생·대학원생용 진로 진단 + 커리어 작업공간.
- 검사(Major Core 별) → 결과지(웹 + PDF 책 70~84쪽) → **내 CareerMatri 작업공간**(경험 기록 · 현재 상태 · 다음 할 일) → **MAT(AI 취업비서, 구독)**.
- 점수는 산식이 만들고, 문장은 그 숫자를 읽기만 한다. **LLM 이 점수·판정을 만들지 않는다.**
- B2B(학교·기관 계약, 학교 진입은 늘 PRO) + B2C(개인 결제) 동시.
- 회사: 주식회사 에이치에이연구원. 직업정보제공사업 신고 J1700020220007호 (**알선 불가**, 정보 제공만).

**도메인**
| 주소 | 무엇 |
|---|---|
| `app.careermatri.com` | 앱(가입·결제·검사·결과·PDF·작업공간·관리자) — Next.js, Railway |
| `www.careermatri.com` | 소개 홈페이지(`marketing/`, ko/en/ja/zh) — Railway 별도 서비스 |

**계약·시연 기관** (학교 코드는 `sites/pca-platform/content/campus-universities.json`)
- `PCU` 배재대학교(전용 포털, 학과 115자리) · `KU`/`KUS` 고려대(세종캠퍼스) · `JJU` 전주대학교 · `SJEPA` 세종일자리경제진흥원 · 원광대(PPT 제안 단계)

**Major Core**: 등록부 `sites/pca-platform/content/major-cores.json` 에 39개. `building`(열림) 20개 안팎 —
기계(ME_CORE_V3) · 전기전자(EE) · 컴퓨터(CS) · 경영(BIZ) · 행정 · 건축 · 토목 · 바이오 · 간호 · 보건 · 식품 · 체육 · 원예 · 디자인 · 미디어 · 패션 · 국어 · 법 · 심리 · 교육 등. 나머지는 `planned`.

**가격(승인됨)**: 한국 무료 BASIC · STANDARD 14,900원 · PRO 21,900원 / 글로벌 Free · $14.99 · $24.99.
MAT 월 4,900원(30일권·365일권, 자동 갱신 없음), 학교 단체 MAT 6개월·1년. **가격은 사업주가 정한다 — 임의로 바꾸지 않는다.**

---

## 3. 가지(branch)와 배포 — 가장 중요

| 가지 | 역할 | 규칙 |
|---|---|---|
| `claude/lucid-ptolemy-9my676` | **개발** | 여기서 작업·커밋·푸시 |
| `claude/happy-faraday-q85c13` | **시험(staging)** | 개발 가지를 **fast-forward 로만** 올린다 (`git push origin HEAD:claude/happy-faraday-q85c13`) |
| `claude/amazing-thompson-w3f2o2` | **운영(production)** — Railway 가 이 가지를 굽는다 | **사업주가 "운영에 올려" 라고 그때그때 말해야만** 푸시. 한 번 허락이 다음 묶음까지 가지 않는다 |
| `main` | 오래 멈춰 있음 | 합치는 것도 배포라 건드리지 않는다 |

- **PR 은 사업주가 요청할 때만** 연다.
- 커밋 메시지에 모델 이름을 넣지 않는다. 끝에 붙이던 줄:
  `Co-Authored-By: Claude …` · `Claude-Session: …` (새 계정 환경이 주는 줄을 따른다)
- `rebase` · `force-push` 하지 않는다.
- `app.careermatri.com` DNS 와 Railway 앱 서비스 설정은 **건드리지 않는다**.
- 운영 DB 마이그레이션(`db:upgrade`)은 **사람이 Railway Shell 에서 손으로** 돌린다. 자동으로 돌리지 않는다.

**지금 운영에 아직 안 올라간 것**: 커밋 `dfb62e8a` 이후 전부(개인정보처리방침 1-6절 · 환율 표시 · 견본 결과지 V3 · MAT 강화 · 결과보고서 문구 정리 · 앱 화면 `/m`). 시험 가지에는 다 올라가 있다. 사업주 승인 대기.

---

## 4. 반드시 지키는 규칙

**법·표현**
- "추천 기업" 금지 → "적합도가 높은 기업" 또는 "알아보기 좋은 곳". 알선·대신 지원·이력서 대신 발송 금지.
- "합격 가능성"·순위·확률을 쓰지 않는다. 집계만 쓴다.
- 확인되지 않은 숫자(공고 수·기업 수·실적)를 지어내지 않는다. `npm run claims:check` 가 공개 원고를 센다.
- KODATA 자료는 배포물에 넣지 않는다. OpenDART 열쇠는 환경변수 `PCA_DART_KEY` 에만 두고 파일에 적지 않는다.
- `ANTHROPIC_API_KEY` 는 개인정보처리방침 개정 적용 뒤에만 넣는다. `OPS_TOKEN` · VAPID 비밀 열쇠는 파일·대화에 적지 않는다.
- 시험 계정 비밀번호는 화면 캡처·시험에만 쓰고 저장소·커밋·PR·PPT 에 적지 않는다.

**문체 (AI 티 금지)** — 근거 `docs/metri/report-writing-rules.md`, 검사 `npm run copy:audit`(기준선 46)
- 금지 낱말: 확정합니다 · 견줍니다 · 섭니다 · 세웁니다 · 가릅니다 · 끊습니다 · 묶음 · 축 · 갈래 · 소유 · Core (학생이 읽는 글에서)
- `A가 아니라 B` 대구, 문단을 잠언으로 닫기, 대시(—) 남발, `…니다.` 세 번 연속 금지.
- 결과지는 **학생에게** 말한다(상담사에게 말하지 않는다).

**제품·코드**
- 점수·판정을 바꾸지 않는다(문구 작업에서도). 판본 잠금 파일(`*-v1-domains.json`, 기계 팩 `industry-packs.json` · `industry-packs-v2.json` · `role-packs-v2.json`)은 지문으로 잠겨 있어 고치지 않는다.
- 무료/유료 경계는 `src/lib/entitlement.ts` 한 곳. 화면에서 따로 판단하지 않는다.
- CSS 이름 겹침이 버그를 여섯 번 냈다(`.btn` · `.lg` · `empty` …). 새 화면은 고유 접두어를 쓴다(앱 화면은 `ma-`).
- 파일을 내려주는 주소(PDF · 달력 .ics)는 Next `<Link>` 로 걸지 않고 `<a>` 로 건다(미리 불러오기 문제).

---

## 5. 코드 지도

```
pca-platform/
  src/app/            Next.js 앱 (App Router)
    v3/               검사 · 결과지(result/body.tsx) · PDF
    me/               내 CareerMatri 작업공간 (웹)
    me/track/         MAT(AI 취업비서)
    m/                앱 화면(2026-10-26 신규, 아직 아무 데서도 연결 안 함)
    campus/           학교 전용 진입
    org/ admin/       학교 담당자 · 운영자 화면
  src/lib/me-v3/      채점·결과 엔진, report-long/(PDF 책 생성기)
  src/lib/assistant/  MAT (공고 읽기 · 메모 초안 · 파일 읽기 · 브리핑 · 알림)
  sites/pca-platform/content/   Core·문항·산업팩·직무팩·학교 등록부 (콘텐츠는 여기서 고친다)
  data/report-gm/     책(PDF)의 직무 안내 원고 · data/region/ 지역 기업 자료
  marketing/          www.careermatri.com 홈페이지
  db/                 스키마 SQL
  docs/metri/         설계·운영 문서 (번호순)
```

핵심 문서: `78_production_runbook.md`(운영 정본) · `APP_OPTIONS.md`(앱 출시 길) · `66_owner_test.md`(사업주 시험 길) · `45_owner_decisions.md`.

---

## 6. 자주 쓰는 명령 (`pca-platform/` 안에서)

```bash
set -a && . ./.env.local && set +a          # 환경변수 (DATABASE_URL 등, 값은 커밋 안 됨)
npx tsc --noEmit -p .                        # 타입 검사
npm run v3:all                               # 검사·결과 엔진 전체 점검
npm run copy:audit                           # 문체(AI 티) — 46 이 기준선
npm run claims:check                         # 공개 원고에 지어낸 숫자 없는지
npm run routes:check  /  npm run mat:gold  /  npm run v3:result  /  npm run v3:sample:check
npm run build && bash scripts/stage-serve.sh 3150   # 로컬에서 운영처럼 띄우기 (next start 쓰지 말 것)
ATTEMPT=1413,1414,1417 OUT=<폴더> npm run -s report:long   # PDF 책 생성 + 점검(넘침·금지어·빈 쪽·66~84쪽)
UI_BASE=http://127.0.0.1:3150 npm run app:shots           # 앱 화면 8장 캡처 + 점검
```

**클라우드 컨테이너에서 겪은 함정**
- 로컬 Postgres(포트 55433)는 컨테이너가 재시작되면 꺼진다. `pg_ctl ... start` 로 다시 띄운다.
- `pkill -f 패턴` 이 내 셸 자신을 죽인 적이 있다. 프로세스는 `/proc/*/comm` 으로 찾아 `kill` 한다.
- npm 레지스트리가 `no_proxy` 때문에 막히면 `env -u no_proxy -u NO_PROXY -u npm_config_noproxy npm install …`.
- 바깥 HTTPS(운영 주소)는 프록시가 막아 이 컨테이너에서 운영 화면을 직접 못 연다 → "확인 못 함" 으로 보고.

**필요한 환경변수 이름**(값은 Railway 에): `DATABASE_URL` · `AUTH_SECRET` · `NEXTAUTH_SECRET` · `AUTH_TRUST_HOST` · `APP_ENV` · `PLATFORM_URL` ·
`PCA_DART_KEY` · `ANTHROPIC_API_KEY`(방침 적용 뒤) · `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` · `OPS_TOKEN` · `MAIL_*` · `PORTONE_*` · `STAGING_BASIC_AUTH`(시험 서버 자물쇠).

---

## 7. 최근 작업 (2026-10-21 ~ 10-26)

1. **MAT(AI 취업비서)** — 이번 주 브리핑(할 일 하나 · 가까운 마감 · 여러 공고가 함께 요구하는 빈칸), 공고 붙여 넣기 → 내 경험과 맞대기, 지원서 문장 뼈대, 메모 → 경험 초안, 파일(성적증명서·수료증) → 경험 초안(Haiku, 월 10건), 마감 달력(.ics), 주간 메일·웹 알림.
2. **PWA 1단계** — 홈 화면 설치, 오프라인 안내, 웹 알림(VAPID 열쇠 넣기 전엔 꺼짐).
3. **개인정보처리방침** 1-6절(웹 알림) — **11월 2일 적용**으로 적어 둠. 그 전에 VAPID 열쇠를 넣지 않는다.
4. **환율 어림 표시** — 홈페이지 영·일·중, 앱 영어 가격표에 그 나라 통화 어림값(결제는 원화).
5. **견본 결과지 `/sample`** — 지금 검사(V3) 엔진으로 다시 만듦.
6. **결과보고서(책) 문구 전수 정리** — 배재대 경영 박서진(1413) · 고려대 세종 반도체물리 김하준(1414) · 전주대 AI 부트캠프 정예린(1417) 3권, 80·82·84쪽. 되풀이 문장 정리, 직무 비교 48줄·산업팩 150줄 다시 씀, **MAT 쪽 추가**(7장 실행 로드맵 뒤), 지역 장 회사 분류 보정.
7. **앱 화면 `/m`** — 첫 화면 · 홈 · 할 일 · 경험 · 사진으로 옮기기 · MAT · 알림 · 내 정보. 실제 자료로 돎. 아직 연결 안 함(`noindex`). 앱 낼 때 `src/app/manifest.ts` 의 `start_url`·`id` 만 `/m` 으로.
8. PPT: 전주대·원광대 소개 PPT(MAT 두 장, 대학 요금표, 검사 과정, 결과지 예시), 세종진흥원 70쪽 PDF 샘플.

---

## 8. 남은 일 · 사업주가 정할 것

**사업주 결정 대기**
- 운영 배포 승인("운영에 올려") — 위 3절의 미반영분.
- 11-02 이후: VAPID 열쇠 넣기(Railway 변수) + 운영 DB 에 `db/schema_push.sql` 올리기.
- `ANTHROPIC_API_KEY` 넣을 시점(방침 9절 적용 뒤). 그 전까지 MAT 는 규칙 길로만 돈다.
- 스토어 앱을 낼지: 앱 안 개인 결제 여부(수수료 20~30%), 애플·구글 개발자 계정 사업자 이름. (`docs/metri/APP_OPTIONS.md` 5·7절)
- 통신판매업 신고번호 — 없으면 운영 공개 유료 판매가 닫혀 있다(설계상).

**알고 있는 미흡한 점**
- 책 지역 장: 회사 업종 분류가 낱말 맞춤이라 일부 엉뚱한 회사가 묶음에 들어간다(예: 전주대 책의 "자동차·모빌리티 소프트웨어" 에 교통신호·금속 제조사).
- 책 영어판은 한 문장씩 다듬지 않았다.
- MAT 도구 이름 사전·메모 읽기는 현직자 검토 전. 파일 읽기는 실제 Haiku 로 한 번도 돌리지 않았다(열쇠 없음).
- 운영 화면을 이 컨테이너에서 직접 열어 확인하지 못했다(프록시). 운영 확인은 사람이 브라우저로.

---

## 9. 관련 저장소 (같은 회사, 다른 제품 — 헷갈리지 말 것)

| 저장소 | 무엇 |
|---|---|
| `project465/pca-platform` | **CareerMatri (이 문서의 대상)** |
| `pca-line` | 단체 PCA 양산 라인(구글 시트·결과지 원고·§9 지역연계). 자체 `CLAUDE.md` 와 방(room) 규칙이 따로 있다 |
| `pcahari0316-byte/pca-web` | 단체용 PCA 웹(pcagroup.haricareer.com, Vercel) — CareerMatri 아님 |
| `pcahari0316-byte/pca-site` | 개인용 커리어핏(haricareer.com, Firebase) — main 푸시가 곧 손님 사이트 배포 |
