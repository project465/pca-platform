# 전주대 R3 — Platform-First Parallel Execution 보고

가지 `feature/jju-campus` · 작업 전 HEAD `71eca64e`(지시서의 값과 같음을 직접 확인) · 2026-10-20

**판정 한 줄.** 이 세션에서는 Next 를 설치하지도 띄우지도 못했다(Gate S1). 그래서 **제품 화면 · 실제 로그인 · 학생 E2E UI 는 하나도 PASS 가 아니다.** 실제로 돈 것은 PostgreSQL 16 위의 서버 함수, 라우트 파일을 소켓에 꽂은 HTTP, 리포트 HTML 의 실제 Chromium 렌더링이다. C16 은 독립 재현으로 범위가 넓어졌고 Track D 는 FAIL 이다.

## 실행 방식

격리 worktree 를 트랙마다 두지 않았다. 트랙끼리 같은 DB 와 같은 fixture 를 쓰기 때문이다. 대신 파일 소유를 나누고 차례로 커밋했다. Track B 의 출처 조사만 별도 에이전트에 맡겼다(쓴 파일은 `docs/jju/r3/data/fact-register.csv` 하나). C16 수정안은 저장소 밖 임시 worktree 에서만 적용·시험하고 지웠다.

| 트랙 | 소유 파일 |
|---|---|
| 0 | `docs/jju/r3/evidence/runtime.txt` |
| A | (변경 없음) |
| B | `docs/jju/r3/data/fact-register.csv` · `scripts/fixtures/campus-jju.json`(`region_facts` · 사실 caution) · `src/lib/jju/program.ts`(`regionFacts`) |
| C | `src/lib/jju/report.ts` · `src/lib/jju/report-pdf.ts` · `scripts/jju-report.ts` · `scripts/jju-report-http.ts` · `docs/jju/r3/track-c/**` · `docs/jju/r3/tests/http/**` |
| D | `scripts/jju-c16.ts` · `docs/jju/r3/security/C16/**` |
| E | `scripts/lab/offline/shims/next-auth.mjs` · `docs/jju/r3/tests/logs/**` |
| 통합 | `docs/jju/CHANGE_REQUESTS.md`(C16 갱신 · C17) · 이 문서 |

**공통 코드는 한 줄도 바꾸지 않았다**(`src/lib/campus/*` · 인증 · DB 스키마 · 공통 PDF · 채점 · 문항). 동결 다섯이 기록을 다시 적지 않은 채로 통과한다.

## 판정

R2 의 오프라인 결과와 R3 의 HTTP·브라우저 결과를 다른 줄로 적는다.

| 트랙 | 판정 | 실행 환경 | 근거 |
|---|---|---|---|
| 0 실제 런타임 | **BLOCKED** | 세션 컨테이너 | `evidence/runtime.txt` |
| A 학생 제품 화면 | **NOT VERIFIED** | — | Next 실행 불가. 이번 회차 UI 변경 없음 |
| B 콘텐츠·사실 | **CONDITIONAL** | WebSearch (WebFetch 전부 DNS 실패) | `data/fact-register.csv` 66줄 · 원문 대조 0줄 |
| C Gold Master PDF | **CONDITIONAL PASS** | 서버 함수 + 하네스 HTTP + 실제 Chromium | 14/14 · HTTP 20/20 · 쪽 그림 13장 사람 검토 |
| D 관리자·격리 | **FAIL** (C16) | 서버 함수 + PostgreSQL | C16 걸림 7/8 · 수정안 적용 시 8/8 |
| E 통합·보안 | **CONDITIONAL** | 오프라인 하네스 | 회귀 19묶음 · 제품 브라우저 0 |

### Track 0 — 실제 런타임

- `registry.npmjs.org` · `registry.yarnpkg.com`: DNS 응답 없음 / 프록시 `connect_rejected`. `npm view next version` 시간 초과.
- `www.jj.ac.kr` · `app.careermatri.com`: 프록시가 CONNECT 에 403.
- Docker 소켓 없음. 저장소 `node_modules` 0개. 저장소에 CI workflow 없음(`.github/workflows` 없음).
- 우회 프록시·미러를 쓰지 않았다. Railway 서비스를 만들지 않았다. **CI workflow 를 새로 더하지 않았다**: 공통 파일이고 GitHub Actions 사용량이 들 수 있어 본체 PM 승인 사항이다(Gate S4).
- 풀리는 조건: 환경 네트워크 설정에서 `registry.npmjs.org` 허용(https://code.claude.com/docs/en/cloud-environments#network-access), 또는 본체 PM 이 승인한 CI/스테이징.

### Track A — 학생 제품 화면

변경 없음. 로그인 → `/jju` → 검사 → 저장·재개 → 제출 → 결과 → PDF 를 사람이 누르는 화면은 Next 없이는 그릴 수도 찍을 수도 없다. 그릴 수 없는 UI 코드를 더 쓰지 않았다. R2 의 학생 상태 덩이(서버 함수 PASS)는 그대로다. Slack형 Premium Home 레퍼런스 이미지는 이번에도 첨부되지 않아 **시각적 동일성은 미검증**이다.

### Track B — 사실 장부

- `data/fact-register.csv` 66줄 · 13칸 + `strict_status`. 모든 줄에 URL · 확인일 2026-10-20 · 확인 방식 · 유효기간 · 주의가 있다.
- **원문을 연 줄은 0줄이다.** WebFetch 가 jj.ac.kr · korea.kr · moe.go.kr · 언론사 전부에서 DNS 실패했다. 그래서 지시의 엄격 규칙대로 `strict_status` 는 60줄 `CLAIM_SEARCH_ONLY` · 6줄 `UNREACHABLE` 이고 `VERIFIED_FACT` 는 0이다.
- 사업주 사실 대조: F1(선정) · F3(목표) · F4(운영 방식)는 보도 검색 결과와 맞는다. F2 의 `총 80억`(국비 71억 2,500만 원 포함)은 맞고 **`2026~2030` 의 끝 해는 `5년간` 까지만 확인**된다. F5(AI 기초 과정) · F6(ND1~ND6)은 공개 출처에서 찾지 못했다. fixture 의 각 사실에 그 결과를 caution 으로 적었다.
- 섞이기 쉬운 다른 사업 하나를 찾았다: 전주대의 **청년도약 인재양성 부트캠프**(LLM 응용 · 재학생이 아닌 청년 대상, A13·A14). 같은 사업으로 적지 않는다.
- 전북 산업 사실(피지컬 AI 예타 면제 · AI 팩토리 · AI로봇 원년 · RISE 8대 전략산업 · 새만금 이차전지 · 김제 스마트팜 등)을 넣었고 **기업 이름과 채용·협약 주장은 0줄**이다.
- 리포트에는 트랙에 걸리는 줄만 넷까지 `검색 결과만 · 원문 확인 전` 표시를 붙여 싣는다.
- 측정 공백은 R2 그대로다(LLM · 비전 · MLOps · 엣지 · 로봇 인지 미측정 → C10-R2).

### Track C — Gold Master PDF 와 다운로드

리포트 `jju-report.4` 가 열 절이 됐다: ① 진단 요약(가진 것 · 비어 있는 것 · 다음 한 가지) ② 전공지식·도구(그 Core 사전의 도구 · AI 역량 세 층) ③ 산업·직무 비교 ④ 역할별 직무 역량(Role → 그 역할이 보는 판단 → 이 학생의 상태 → 다음 할 일) ⑤ Evidence/Gap ⑥ 조직 유형과 지역에서의 쓰임 ⑦ AI 학습·프로젝트 ⑧ 이력서·자기소개서·면접·포트폴리오 ⑨ 단계별 계획 ⑩ 출처와 한계.

- **새 판정을 만들지 않았다.** 값은 굳은 결과 모델 · 그 Core 의 사전(`domains` 의 도구·결과물·조직 성과)과 관계표(`td_role` · `td_industry` 의 `중심`)에서 온다. 점수 · 백분위 · 적합도 · 합격 가능성 0.
- 학생마다 갈린 절 9/10(6절만 같다: 셋 다 같은 트랙이고 조직 유형을 고르지 않음). 역할별 직무 역량 표가 셋 다 다르다: A 는 탐색·연구, B 는 설계·개발, C 는 빌드·배포 자동화로 그 학생의 확인된 판단에서 고른다.
- 근거 없는 연결 0: `확인된 판단에서 이어짐` 줄은 확인된 판단이 있는 학생에게만 선다.
- **하네스 HTTP 20/20**(`tests/http/http-matrix.md`): 본인 A/B/C 의 웹 200 `text/html` · PDF 200 `application/pdf` · `attachment; filename="careermatri-jju-{id}.pdf"` · `no-store` · 받은 바이트 `%PDF`. 같은 학교 학생 · 전주대 담당자 · 배재대 학생 · 배재대 담당자 → 404, 없는 번호 404, 배재대 본인 응시 404, 로그인 없음 307 → `/login`. **로그인은 하네스 세션(쿠키 `harness_uid`)이고 Auth.js 가 아니다.**
- 사람이 쪽 그림 13장을 읽고 고친 것: 확인 칸 수를 두 번 세던 것(`owned ⊂ confirmed` · R2 에서 `10칸` 이 나간 결함) · 중심 영역이 없는 산업의 `0개 모두 아직` · 9절에서 같은 꼬리말이 줄마다 되풀이 · 응답 품질 코드(`LOW_VARIANCE`)가 종이에 그대로 · 390px 에서 긴 URL 이 쪽을 3px 넓히던 것.
- 남은 것: C 의 마지막 쪽이 한 덩이만 들고 선다. 자기소개서 뼈대의 `설계안이나 사양으로 남았다` 는 기계공학 말이다(C11). 공통 PDF 경로 연결은 C9 승인 전이라 하지 않았다.

### Track D — 관리자·개인정보·격리 (C16)

`scripts/jju-c16.ts` 가 진입점마다 합성 피해자를 새로 만들어 줄을 통째로 견주고 지운다.

| 진입점 | 지금 HEAD | 수정안 |
|---|---|---|
| 단건 추가 JJU→PCU · PCU→JJU | 성공 응답 · 학과·갈래 덮어씀 | 거절 · 변화 없음 |
| 다른 기관 담당자 · B2C 아이디 | 성공 응답(줄은 그대로 · 감사 기록 남음) | 거절 |
| CSV | `고침 1` 로 적용 · 덮어씀 | 그 줄 거절 |
| rotate(운영 스크립트) | **비밀번호 해시 · 이름 · 학교 · 소속 탈취** | 거절 |
| 비밀번호 재발급 | 거절(소유 확인 있음) | 같음 |
| 동시 생성 | 둘 다 성공 · 한쪽 비밀번호 무효 · 섞인 줄 | 한쪽만 |

- 수정안 `security/C16/C16_proposed.patch`(공통 파일 둘 · 스키마 변경 없음 · advisory lock + 같은 학교 학생이 아니면 `LoginTaken`)를 임시 worktree 에서 돌려 8/8, 회귀 jju-verify 42/42 · campus:check 80/80 을 확인했고 **이 가지에는 적용하지 않았다.**
- 전주대가 소유한 쓰기 진입점은 0개다(학생 추가·CSV 는 공통 `src/app/org/v3/students/actions.ts`). 그래서 fail-closed 는 정책으로 둔다: **C16 이 닫히기 전 PCU·JJU 운영 DB 공유와 실제 계정 발급 금지**(Gate S0).
- 과거 오염 확인 질의 `c16_readonly_audit.sql`(읽기만)을 이 기계에서 돌렸고 R2 재현이 남긴 교차 감사 기록 3줄을 잡았다. 운영에서는 아직 돌리지 않았다.
- 관리자 통계는 이미 실제 응시를 세는 함수(`campusV3` · `studentCounts`)에서 온다(코드 확인 · 화면 미확인). 개인 리포트 관리자 열람은 계속 닫혀 있다(C14).

### Track E — 통합·보안·브라우저 QA

`tests/logs/SUMMARY.txt`. 공통 회귀 14묶음 rc=0 · 동결 다섯 그대로 · jju-verify 42/42 · jju-report 14/14 · jju-report-http 20/20 · jju-access 23/26 · jju-c16 1/8(둘 다 C16). typecheck: 이번에 바뀐 파일의 실제 오류 0(남은 것은 패키지 타입이 없어 나는 것).

| 항목 | R2 오프라인 | R3 |
|---|---|---|
| 정상 로그인(실제 bcrypt·Auth.js) | — | NOT VERIFIED |
| 검사 중단·재개 · 중복 제출 1회 | 서버 함수 PASS(R1) | 제품 화면 NOT VERIFIED |
| 남의 응시 접근 거부 | 서버 함수 PASS | **하네스 HTTP PASS**(404) |
| PDF 200 · 권한 없음 404 · 로그인 없음 307 | — | **하네스 HTTP PASS** |
| 기관 격리(결과) | PASS | PASS |
| 기관 격리(계정 발급) | FAIL | **FAIL**(C16 확장) |
| PC·모바일 화면 캡처 12장 | NOT VERIFIED | **NOT VERIFIED**(제품 화면 0장) · 리포트 웹 보기 9장만 |
| PCU 회귀 | PASS | PASS |

스크린샷은 **리포트 HTML 의 웹 보기만** 있다(1440 · 768 · 390 × A/B/C). 로그인 · 홈 · 검사 · 저장/재개 · 관리자 · 권한 실패 화면은 0장이고 PASS 로 적지 않는다.

## Stop Gate

| Gate | 상태 |
|---|---|
| S0 C16 전 공유 DB·실계정 금지 | 지킴 · 수정안 승인 대기 |
| S1 정상 빌드·실제 브라우저 | **미충족** → 상용 기능 PASS 없음 |
| S2 AI 측정 공백 | 리포트가 한계·시연 표시를 단다 · AI 전문역량 점수 납품 불가 |
| S3 다운로드·학생별 PDF·접근 통제 | 하네스 HTTP 로 확인 · 실제 인증 경로 미확인 → CONDITIONAL |
| S4 인프라·배포·병합 | 하지 않음 |

## 다음 단일 실행명령

환경 네트워크에서 `registry.npmjs.org` 를 허용한 뒤:

```bash
cd pca-platform && npm ci && npm run build && \
V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1,BIZ_CORE_V1 V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json \
  bash scripts/stage-serve.sh 3100
```

그다음 같은 서버에 `scripts/jju-report-http.ts` 의 요청을 실제 Auth.js 로그인 쿠키로 다시 보내고, 열두 화면을 1440·390 으로 찍는다.
