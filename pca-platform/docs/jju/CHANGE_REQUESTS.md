# 전주대 작업에서 넘기는 요청 (Core · PM)

이 세션은 공통 엔진 · 공통 DB/API/인증 계약 · 공통 배포 설정을 고치지 않는다.
고쳐야 풀리는 것은 여기 적어 담당 세션으로 넘긴다. C1~C8 은 `JJU_MVP.md` 7절에서
그대로 옮겼고 C9 부터가 R1 에서 새로 나온 것이다.

| # | 받는 곳 | 요청 | 근거 | 막는 것 |
|---|---|---|---|---|
| C1 | PM | 시연 이미지에 학교 fixture 를 담는 방법 → **선택지 B 로 처리**(`deploy/Dockerfile.jju-demo`). 운영 `Dockerfile` 은 그대로. Railway 에 이 파일을 쓰는 **별도 서비스**를 둘지 승인 | `node scripts/jju-dockerfile-drift.mjs` (덩이 3 · 그 밖 운영과 같음) | Staging 시연 |
| C2 | Core | 학교 진입 첫 화면의 `{지역}을` 조사 고정 | `campus/[universityCode]/page.tsx` | 받침 없는 지역명 |
| C3 | Core | 학교마다 다른 진입 문구·색(`--pcu-*` 고정) | 전주대 화면도 배재대 색 | 브랜드 |
| C4 | Core | 부트캠프 참여자의 학업 단계(재직자·졸업생) | `education_stage` CHECK 는 학위 넷 | 참여자 신분 |
| C5 | Core | V3 응시에 기수 칸 | 지금은 Catalog 코드 앞머리로 대신 | 기수 집계 |
| C6 | Core | CS·EE 학생 공개(`open_to_students`) | 도메인 검수 전 | AI·AIoT·피지컬 AI 트랙 실제 응시 |
| C7 | Core | 담당자 메뉴에 `/jju/admin` | 공통 사전 `TxKey` | 담당자 동선 |
| C8 | Core | 기관·학교별 PDF 템플릿과 지역 기업 자료 | Gold Master 계층이 BIZ·배재대·충청 고정 | 학교 PDF |
| **C9** | Core | **공통 PDF 경로에 학교 전용 절을 붙이는 자리.** 전주대 9절 구조는 `src/lib/jju/report.ts` 에 결과 모델만 읽는 순수 함수로 두었고 공통 `/v3/{id}/result/pdf` 는 건드리지 않았다. 학생이 실제로 받는 종이에 넣으려면 공통 PDF 가 기관별 묶음을 부를 자리가 필요하다 | `docs/jju/qa/pdf/jju-report-{A,B,C}.pdf` (구조 시안) | 학생용 JJU PDF |
| **C10** | Core | **CS·EE Core 에 AI 하위 주제가 없다.** 딥러닝·신경망 · LLM·생성형 AI 응용 · 컴퓨터 비전 · MLOps · 엣지 AI · 로봇 인지가 세 Core 모두 문항·체크리스트·영역 세부에서 0 이다. AI 갈래(`SPEC_CS_AI`)는 TD09 기계학습·데이터 분석(문항 29) 하나로 선다. **`LLM 응용` 트랙을 `SPEC_CS_SOFTWARE` 로 잇는 것은 LLM 을 재는 것이 아니다.** 선택지: (a) CS 에 AI 영역을 판본 올림으로 더한다 (b) AI Major Core 를 따로 세운다 (c) 트랙 이름을 재는 것에 맞게 바꾼다 | `docs/jju/TRACK_CORE_AUDIT.md` | AI·LLM·피지컬 AI 트랙 주장 |
| **C11** | Core | **경험 번역 열 단계 보기가 CS·EE 에서 기계공학 말을 쓴다**(`재료나 구성 요소를 바꿨다` · `설계안이나 사양으로 남았다`). `student/translate.ts` 가 ME·BIZ 만 들고 나머지는 중립 보기로 떨어진다 | `ABC_COMPARISON.md` · PDF 7절 | 자소서 뼈대 품질 |
| **C12** | Core | **같은 묶음 학생의 첫 줄이 글자까지 같다**(A·C 의 badge·lead). 묶음(Z2) 이 같으니 판정은 맞지만, 사업단이 두 학생을 나란히 보면 같은 말로 읽힌다. 머리글은 영역 이름이 달라 갈린다 | `ABC_COMPARISON.md` | 개인화 체감 |
| **C13** | Core | **빈자리 까닭 문장이 네 영역에 같은 줄로 반복된다**(B 의 Gap 넷). 같은 종류의 Gap 을 묶어 한 번만 적는 처리가 결과지에는 있고 결과 모델 → 외부 리포트 경로에는 없다 | PDF 5절 | 리포트 밀도 |
| **C14** | Core | **기관 담당자의 개인 결과·PDF 열람**은 `canReadParticipantReport` 가 계약 조항 + 본인 동의 + 감사 기록 셋을 요구하고 지금 그 길을 여는 화면·데이터가 없다(설계상 닫힘). 사업단이 개인 결과를 봐야 하면 동의 수집 화면과 계약 플래그가 먼저다 | `jju-verify.log` 5절 | 담당자 개별 열람 |
| **C15** | PM | **이 세션에서 npm registry 와 www.jj.ac.kr 에 닿지 못한다.** 그래서 Next 빌드·브라우저 화면·캡처가 전부 NOT VERIFIED 다. 환경 네트워크 설정에서 `registry.npmjs.org` 를 허용하면 `npm ci` → `npm run build` → `scripts/jju-shots.ts` 로 9장 캡처가 바로 돈다. 우회 프록시·미러는 쓰지 않았다 | 아래 R1 보고 8절 | 화면 증거 |
| **C16 · P0** | Core | **`provisionStudent()` 가 아이디가 겹치면 다른 학교 학생의 줄을 고친다.** 전주대 담당자가 `학생 추가`(공통 `addStudentAccount`)에 배재대 학생과 같은 아이디를 넣으면 **성공으로 응답하고** 그 배재대 학생의 `campus_students` 단과대학·학과·갈래가 전주대 값으로 바뀐다(학교 칸은 PCU 그대로라 그 학생의 학교 맥락이 통째로 깨진다). 기본 아이디가 학번이라 두 학교 사이의 충돌은 실제로 난다. `rotate` 경로는 더 세다: `ON CONFLICT (login_id) DO UPDATE password_hash` 와 `campus_students.university_code` 덮어쓰기로 **남의 학교 계정의 열쇠와 소속을 가져간다**(코드 읽기 · 되돌릴 수 없어 실행하지 않았다). 요청: 이미 있는 아이디가 **같은 학교의 학생**이 아니면(다른 학교 학생 · 개인 회원 · 담당자) 만들지도 고치지도 않고 거절한다. 담당자 화면에는 `이 아이디는 이미 쓰이고 있습니다` 만 적는다(누구 것인지 적지 않는다) | `docs/jju/r2/track-d/access-matrix.md` 4절 · `jju-access.log` | **전주대·배재대 동시 운영 · Track D PASS** |

| **C16 · R3 갱신** | Core · 본체 PM | **독립 재현으로 범위가 넓어졌다**(`docs/jju/r3/security/C16/`). 양방향(JJU↔PCU) · CSV · rotate(비밀번호·학교·소속 탈취) · 동시 생성(둘 다 성공 응답 · 한쪽 비밀번호 무효 · 섞인 줄)이 실제로 난다. 담당자·B2C 아이디는 줄은 안 바뀌지만 **성공으로 응답하고 감사 기록을 남긴다.** 수정안 `C16_proposed.patch`(공통 파일 둘 · 스키마 변경 없음)를 임시 worktree 에 적용해 8/8 통과 · 회귀 통과를 확인했고 **이 가지에는 적용하지 않았다.** 과거 오염 확인 질의 `c16_readonly_audit.sql`(읽기만)을 운영에서 돌려 달라 | `C16_ESCALATION_R3.md` · `c16-current-head.log` · `c16-with-patch.log` | **Gate S0 · Track D PASS** |
| **C16 · R4 적용** | 본체 PM 승인(2026-10-20 · 이 세션의 사용자 응답) | 수정안을 **`feature/jju-campus` 에만** 적용했다(공통 `src/lib/campus/students.ts` · `manage.ts` + 운영 스크립트 `pcu-students` · `staging-bootstrap` 이 `LoginTaken` 을 거절 줄로 받는다). `jju-c16` 8/8 · `jju-access` 26/26 · 공통 회귀 통과. **main 이나 PCU 가지에 합치지 않았고 운영에 배포하지 않았다.** 실제 bcrypt·Auth.js 서버 액션 E2E 와 운영 오염 확인 질의는 아직이다 | `docs/jju/r4/R4_REPORT.md` · `docs/jju/r4/tests/logs/` | 운영 반영(본체 병합) |
| **C17** | PM | **공식 출처 원문 대조.** R3 사실 장부 66줄은 WebFetch 가 모든 호스트(jj.ac.kr · korea.kr · moe.go.kr · 언론사)에서 DNS 실패라 **한 줄도 원문을 열지 못했다**(전부 검색 결과만). 사업주가 준 F2 의 `2026~2030` 은 보도에서 `5년간` 까지만 확인되고, F5·F6(AI 기초 과정 · ND1~ND6)은 공개 출처에서 찾지 못했다. 원문 대조 전에는 리포트에 `검색 결과만 · 원문 확인 전` 표시를 떼지 않는다 | `docs/jju/r3/data/fact-register.csv`(strict_status) | 사실 장부의 외부 사용 |
| **C16·R5** | 본체 PM | **C16 을 실제 bcrypt·PostgreSQL 16.15 로 다시 쟀다**(CI run 39417128563): `jju-c16` 8/8 · 동시 등록 경쟁 성공 1·실패 1 · 계정 한 학교. 수정은 여전히 이 가지에만 있다 | `docs/jju/r5/ci/c16-repro.realbcrypt.log` | main/PCU 병합 결정 |
| **C18** | 공통 Core | **로그인한 학교 학생의 첫 자리.** 전주대 학생이 로그인하면 `/cores`(일반 전공 고르기)로 간다(R5 E2E `로그인 뒤 첫 자리 /cores`). 학교 학생이면 그 학교 진입이나 트랙으로 가야 한다. `homePathFor` 는 공통 로그인 길이라 JJU 가 고치지 않는다 | `docs/jju/r5/ci/jju-e2e-next.log` | 학교 학생 첫 화면 |
| **C19** | 공통 UI | **390px 검사 화면 머리 겹침.** `[시연] AI·…` · `영역 훑기` · `자동 저장` 이 한 줄에서 겹친다(R5 `07-resume.mobile.png`). 공통 검사 화면이고 Gate 1·2 동결이라 JJU 가 고치지 않는다 | `jju-ci-evidence` 의 `e2e/shots/07-resume.mobile.png` | 손전화 응시 |
| **C20** | 공통 Core | **한 학생에 학과와 과정을 함께 적는 칸.** 인공지능학과 학생이 부트캠프 과정에도 참여하면 지금 등록부·`campus_students` 는 자리 하나(`department_code`)만 든다. 그래서 사업단 화면이 `인공지능학과` 와 `2026 AI 기초 과정` 을 서로 다른 학생으로 센다. 요청: 학과(소속)와 과정(참여)을 따로 적는 칸 — 예) `campus_students.program_codes text[]` 또는 참여 표 하나. **DB 변경이라 이 가지에서 하지 않았다** | `src/app/jju/admin/page.tsx` 기능 상태 표 · fixture `open_questions[0]` | 학과 × 과정 교차 집계 |
전주대 소유 스크립트(`jju-demo-setup` · `jju-verify`)는 `src/lib/jju/login-guard.ts` 로 같은 경우를 들어가기 전에 멈춘다. **담당자 화면 경로는 공통이라 C16 전까지 열려 있다.**

## 사람이 정해야 하는 것

1. ~~사업단 공식 트랙 구성~~ → **2026-10-20 사용자 지시로 시연 트랙 다섯을 내리고 `소프트웨어융합대학 인공지능학과`(학과 페이지 검색 사본) + `2026 AI 기초 과정`(공지 F5) + `후속 ND1~ND6`(F6 · 검사 미연결)으로 바꿨다.** 옛 코드(`JJU1_*`)는 `retired_codes` 에 있다. 학과 페이지 원문 대조(C17)가 남는다.
2. ND1~ND6 과정의 이름·내용 — 받기 전까지 화면은 `세부 미확인` 으로만 적는다.
3. C10 의 선택지 (a)/(b)/(c).
4. C1 의 별도 Railway 서비스 승인 (유료 인프라라 승인 전 만들지 않는다).
5. C16 이 닫히기 전까지 전주대와 배재대를 같은 운영 DB 에서 동시에 열지 않는다(사업주 판단).
