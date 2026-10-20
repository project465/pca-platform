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

## 사람이 정해야 하는 것

1. 사업단 공식 트랙(또는 마이크로디그리) 구성 — 정해지면 fixture 의 `[시연]` 분류를 그 이름으로 바꾸고 `verification` 을 올린다.
2. ND1~ND6 과정의 이름·내용 — 받기 전까지 화면은 `세부 미확인` 으로만 적는다.
3. C10 의 선택지 (a)/(b)/(c).
4. C1 의 별도 Railway 서비스 승인 (유료 인프라라 승인 전 만들지 않는다).
