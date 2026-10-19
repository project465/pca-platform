# R34 — PCU BIZ 실제 운영 검수 기반 품질 교정

판정: **LOCAL PASS · STAGING UNVERIFIED(이 컨테이너에서 Staging 주소가 열리지
않는다) · HUMAN REVIEW REQUIRED.** Design PASS · Product PASS · Scene Freeze 는
선언하지 않는다. 운영과 운영 DB 는 건드리지 않았고, 측정 · 채점 · 문항 은행
계약은 그대로다(`npm run v3:freeze:measure` 가 기록을 다시 적지 않은 채로
통과한다).

Staging: `https://charming-reverence-staging.up.railway.app` (경로별 확인 방법은
`STAGING_CHECKS.md`). 이 세션이 그 주소를 두드리면 HTTP 000 이라 아래 결과는
전부 **같은 모양을 로컬에 다시 세워** 낸 것이다.

## 1. 되짚은 학생 (ID 단위)

| 항목 | 값 |
|---|---|
| 재현한 응시 | 182 (응시 174 의 응답 109개를 같은 문항 번호 · 같은 값으로 옮기고 근거 8개를 같은 자리에 골라 제출) |
| `v3_responses` | 109 (scale5 15 · exposure 12 · choice 15 · level 67) |
| `v3_evidence_picks` | 8 (TD02 마케팅·시장: J3 2 · ARTIFACT 1 · VERIFY 1 / TD08 데이터·의사결정: J3 1 · J4 1 · ARTIFACT 1 · VERIFY 1) |
| `v3_snapshots` | 1 (id 154 · headline EVIDENCE_READY · focus 마케팅·시장 / 데이터·의사결정) |
| 종이 | BEFORE 11쪽 · AFTER 10쪽 |

근거 8개가 결과 모델의 어느 칸(`did` · `decided` · `artifacts` ·
`verifications`)으로 갔고 종이의 어느 쪽에 섰는지는 `TRACE_BEFORE.md` 와
`TRACE_AFTER.md` 에 표로 있다. 표현마다 **만든 함수**(`text.ko.ts` 의 어느
자리인가)를 적었다. 운영 컨테이너에서 같은 것을 읽는 질의는
`db/checks/v3_attempt_trace.sql` 이다(읽기만, `-v att=<응시번호>`).

**근거 6번(`자료에서 넣을 것과 뺄 것을 정했다`)은 전에 어디에도 서지
않았다.** 그 축이 확인에 못 미쳐 `did` 와 `decided` 에 들어가지 않고
`axes[].picks` 에만 남았는데, 그 자리를 읽는 화면이 없었다. 지금은
`골랐지만 응답으로는 아직 확인되지 않은 것` 으로 7쪽에 선다.

## 2. 고친 것 (요청 항목 ↔ 자리)

| 요청 | BEFORE (종이에 실제로 섰던 말) | AFTER | 자리 |
|---|---|---|---|
| 2 · 3쪽 `선택한 근거` | `확인은 됐지만 고르신 근거 항목이 없어 지금은 설명할 재료가 없는 판단 11: 마케팅·시장(주어진 범위 …` (괄호 벽) | `검사에서 해 봤다고 답했지만 근거 항목을 고르지 않은 판단이 11개 있습니다. 지금은 설명할 재료가 없습니다.` + 영역별 축 이름 한 줄씩 | `page.tsx` `EvidenceNone` |
| 2 · 8쪽 `아직 고른 근거 없음` | 근거 표의 빈 칸 글자 | 네 층으로 가른 이름표(`직접 정했다고 고른 것` · `해 봤다고 고른 것` · `남겼다고 고른 결과물` · `견줬다고 고른 대상`) + `골랐지만 응답으로는 아직 확인되지 않은 것` | `page.tsx` `Why` · `Strongest` |
| 2 · 결과물이 판단으로 적힌 것 | `지표 정의표` 가 `직접 정한 것` 에 섰다 | `남겼다고 고른 것` 으로만 선다 | `page.tsx` `evidenceRows` (`decided` 에서 결과물 이름을 뺀다) |
| 3 · 9쪽 타전공 문면 | `실험값과 계산값을 대조해 차이를 설명하기` · `캡스톤 …` (기계공학 한 벌이 스무 Core 에 섰다) | 경영 Core 의 문항 `wording` (`가정이나 추정 근거를 고쳐 다시 계산했다` …) | `student/common.ts` (19 Core 사전) · `text.ko.ts` `commonKo(v, core)` |
| 4 · 2쪽 지원서 단정 | `지원서에서 바로 꺼내 쓸 수 있는 경험 2가지입니다.` | `지원서로 옮길 재료가 있는 경험 2가지입니다.` + 줄마다 `남겼다고 고른 것 · …` / `남긴 것 확인 필요` + `수치 · 기간 · 결과는 여기 없습니다. 지원서에 옮길 때 직접 적습니다.` | `page.tsx` evRows · `text.ko.ts` 머리 알약 `지원서에 쓸 경험이 있어요` |
| 5 · 종이 위계와 마지막 쪽 | 11쪽 · 마지막 32% · 괄호 벽 · 축 목록 반복 | 10쪽 · 마지막 78% · 부록의 여덟 축 목록은 종이에서 접힘 · 지원서 틀은 쪽을 넘어 흐름 · 그 종이 하나에 대고 맞추는 `fitTail` | `result.css` 인쇄 규칙 · `result/pdf.ts` |
| 6 · 검사 화면 반복 | 다섯 칸 척도 낱말이 줄마다 되풀이 · 1440 에서 머리띠 `영역… › 실… › 근거 …` 로 잘림 | 첫 줄만 낱말, 뒤 줄은 번호와 고른 칸의 낱말 · 머리띠 전부 보임 · 응답 계약 그대로 | `screen.tsx` · `assessment.css` |
| 7 · AI | — | LLM 호출 0 · 외부 전송 0 · 개인화 출처 표 | `AI_AUDIT.md` |
| 9 · 담당자 | — | `npm run pcu:ops` 19 / 19 (LOCAL) | 변경 없음 |

**측정에 닿지 않았다.** 고친 파일은 결과지 읽는 층(`page.tsx` · `charts.tsx` ·
`text.ko.ts` · `student/common.ts` · `result.css`)과 검사 화면의 표시 층
(`screen.tsx` · `assessment.css`)과 종이 뽑는 자리(`result/pdf.ts`)다.
`scoring/*` · `result/model.ts` · `result/build.ts` · 문항 은행은 한 줄도
바뀌지 않았다.

## 3. 종이

| | BEFORE | AFTER |
|---|---|---|
| 쪽 수 | 11 | 10 |
| 쪽마다 찬 비율 | 89 / 96 / 98 / 95 / 91 / 99 / 97 / 99 / 87 / 94 / **32** | 89 / 94 / 97 / 96 / 98 / 95 / 98 / 96 / 99 / **78** |
| 2쪽 | 지원서 단정 | 재료 · 남긴 것 · 직접 적을 것 |
| 3쪽 | 괄호 벽 | 한 줄 + 영역별 축 |
| 8쪽 | `아직 고른 근거 없음` | 네 층 + 미확인 고름 |
| 9쪽 | 기계공학 문면 | 경영 문면 |

쪽마다의 그림은 `pdf/trace182-p-01..10.png`, 나란히 놓은 것은
`sheets/pdf-p02-to-p02.png` · `p03` · `p08` · `p09` · `p11-to-p10.png` 다. 두 PDF 는
`pdf/trace182-before.pdf` · `pdf/trace182-after.pdf`.

**마지막 쪽은 그 종이 하나에 대고 맞춘다.** 쪽 높이가 고정이라 CSS 한 벌로는 어느
학생의 꼬리도 보장할 수 없다(여러 회차가 제로섬으로 적어 둔 자리이고, 종이에서
축 목록을 접자 감사 19벌 가운데 7벌의 마지막 쪽이 13~17% 로 떨어졌다).
`/v3/<id>/result/pdf` 가 그대로 뽑은 것에서 쪽 수를 세고 글을 6% 안에서 줄여
**쪽이 하나 줄어드는 첫 배율**을 쓴다. 담긴 글은 그대로고 쪽이 줄지 않으면 1.0
이다(응시 182 는 1.0 그대로 10쪽 78%). 감사 19벌은 마지막 쪽이 83~97% 다.

A4: 글꼴 Noto/WenQuanYi 로 한글이 전부 뽑힌다(감사 1번) · 깨진 글자 0 · 좌우
14mm · 머리글 `배재대학교 · 경영학과 · CareerMatri 진로 분석 리포트` · 꼬리에
`쪽 / 전체` · 표 머리가 쪽 오른쪽으로 잘리던 것(`pv-matrix thead th`)을 줄 바꿈으로
고쳤다.

## 4. 검사 화면

`sheets/assessment-02-interest.png` · `assessment-03-experience.png` ·
`assessment-m1-interest.png` 가 BEFORE | AFTER 다(1440 과 390). 응답 계약은
그대로다: 문항 번호 · 보기 값 · 저장 함수 · 화면 수가 전과 같고 검사 화면 동결
파일 21벌의 지문만 다시 적었다(`ME_V3_2_ASSESSMENT_UI_V42` · 문장 판본
그대로).

## 5. 검사 결과

| 검사 | 결과 |
|---|---|
| `npm run v3:freeze:measure` | 동결 기록과 같다 (다시 적지 않음) |
| `npm run v3:result:copy` | 16 / 16 |
| `npm run v3:student` | 79 / 79 (§15 Core 를 건너 기계공학 말이 새지 않는가 8가지 포함) |
| `npm run v3:workspace` | 파일 53벌 그대로 · CSS 이름 133개 |
| `npm run copy:audit` | 46개 (기준선 그대로) |
| `v3-pdf-audit` (17 Core · 19벌) | 걸림 0 · 보고 0 · 마지막 쪽 83~97% |
| `scripts/lab/r33-e2e.ts` (실제 브라우저 · 실제 DB) | 70 / 70 (로그인 → 응시 → 저장 → 새로고침 → 이어하기 → 저장 실패 → 제출 중복 → 결과 → PDF → 경험 → 현재 상태 → 로그아웃 → 재로그인 → 권한 → PDF 오류 → 재시작) |
| `npm run v3:isolation` | 11 / 11 (학생 둘 · 학교 둘) |
| `npm run pcu:ops` | 19 / 19 (LOCAL) |
| `scripts/pcu-gold-shots.ts` PERSON=C | 82 / 82 (1440 · 390 · 360 · 430 · 가로 넘침 0) |
| `tsc --noEmit` · `next build` | 0 (BUILD_ID `dvrJ7P6n_uMqzUdsYQaoK`) |

## 6. 확인하지 못한 것

- **Staging 을 이 컨테이너에서 열지 못했다**(HTTP 000). Staging DB 의 109 · 8 과
  그 학생의 PDF 는 `STAGING_CHECKS.md` 의 질의와 경로로 사람이 확인한다. Staging
  은 세션 시작 때 `8c9755e8` 을 들고 있었고 이 가지의 새 커밋은 **재배포 뒤에**
  선다.
- `v3-pdf-audit` 이 `EE_CORE_V1` · `PUBADM_CORE_V1` · `NURSING_CORE_V1` 에서
  `없는 산업팩이다` 로 멈춘다. 이 회차 전부터 있던 자리이고 고칠 데가 `scoring/packs.ts`
  와 팩 자료라 측정 동결 안이다. 그 셋은 세지 못했다.
- 사람이 읽지 않았다. 사람 열두 벌 골든은 그대로이고 자동 검사는 전부 통과했지만
  Human Review 전이라 Design PASS · Product PASS · Scene Freeze 를 선언하지
  않는다.
- 운영 Canary 판정(`PRODUCTION UNVERIFIED` · `PCU CANARY BLOCKED`)은 그대로다.

## 7. 증거 파일

- `TRACE_BEFORE.md` · `TRACE_AFTER.md` — 응답 → 근거 → 결과 모델 → 종이 (ID 단위)
- `AI_AUDIT.md` — LLM 사용 0 · 개인화 출처 · 고정 문구
- `STAGING_CHECKS.md` — Staging 주소 · 경로별 기대값과 FAIL 기준 · 읽기 전용 질의
- `pdf/` — AFTER 쪽 그림 10장 · BEFORE / AFTER PDF
- `sheets/` — PDF 다섯 쪽과 화면 다섯 자리의 BEFORE | AFTER
- `shots/before` · `shots/after` — 데스크톱 · 손전화(390 · 360 · 430) 화면
- `db/checks/v3_attempt_trace.sql` — 운영 컨테이너에서 한 응시를 읽는 질의

## 8. 커밋

- `68d29b3d` R34(진행): 근거 · 결과물 · 검증 분리와 Core 별 공통 문면
- (이 커밋) R34: 종이 마지막 쪽 맞춤 · 검사 화면 되풀이 · 감사 · 보고
