# R35 — CareerMatri Product Gold Master (Human Review 패키지)

판정: **LOCAL PASS · STAGING NOT VERIFIED · PRODUCTION 변경 없음 · HUMAN REVIEW
REQUIRED.** Product PASS · Design PASS · Freeze 는 선언하지 않는다(사람의 검토
전이다). 운영 DB · 결제 · 외부 메일은 건드리지 않았고, 측정 · 채점 · 문항 은행 ·
결과 모델 · 데이터 계약은 그대로다(`npm run v3:freeze:measure` 가 기록을 다시
적지 않은 채로 통과한다).

| 항목 | 값 |
|---|---|
| 가지 | `claude/careermatri-screen-review-p0c8kb` |
| 시작 커밋(STEP 0) | `c22632ad` (R34) — Staging 이 같은 커밋으로 배포돼 있었다(GitHub deployment `feisty-generosity / staging` 2026-10-19T10:32:19Z · 상태 `success`) |
| 운영 | `claude/amazing-thompson-w3f2o2` @ `02b6c610` — **이 회차에 바뀌지 않았다** |
| 이 패키지의 빌드 | `0GYVR-XZr9ykVXBjlhxp_` (로컬 PostgreSQL 16 · 실제 브라우저 Chromium) |
| Staging | `https://charming-reverence-staging.up.railway.app` — 이 컨테이너에서 HTTP 000(네트워크 정책). 확인 방법은 9절 |

## 1. STEP 1 · 전체 인벤토리

`INVENTORY.md` 에 자리마다 분류가 있다. 학생 · 검사 전 학생 · 학과 담당자 ·
로그인 전 넷을 들고 145자리(데스크톱 1440 · 모바일 390)를 열었고 **5xx 0 · 안쪽
코드 0 · 가로 넘침 0** 이다. 표 원본은 `checks/inventory-before.md` ·
`checks/inventory-after.md`.

## 2. 고친 것 (재현된 FAIL 만)

| # | 재현 | BEFORE | AFTER | 자리 |
|---|---|---|---|---|
| 1 | 담당자가 로그인하면 | `/org` 첫 화면이 `현재 활성 계약이 없습니다 · 회차 0`, 메뉴 11줄 중 9줄이 옛 표를 읽어 `완료 0` · 38명 전부 `시작 전` | 학교 전용 진입 기관은 `/org/v3` 전공 진단 집계로 들어오고 메뉴는 2줄(집계 · 학생 관리). 옛 화면 9개는 `/org/v3` 로 보낸다 | `src/lib/campus/org-mode.ts` · `nav.ts` · `/org/*` 9쪽 |
| 2 | 홈에서 `설명할 수 있는 일 2가지` 인 학생이 탐색을 열면 | 산업 7 · 직무 8 줄 전부 `아직 이 쪽과 겹치는 확인된 영역이 없습니다` (굳은 결과의 `ready` 만 읽었다) | 홈과 같은 지금 값(`zoneOf`)을 읽어 `내 경험과 겹치는 영역 · …` | `src/app/me/explore/page.tsx` |
| 3 | 학교 학생의 계정 화면 | 기록이 없는 `옛 검사 기록`(링크 셋) · `주문과 결제` 칸 | 기록이 있을 때만 선다 | `src/app/my/page.tsx` |
| 4 | 1440 현재 상태 셋째 칸 | `남긴 것을 더 붙이면 설명이…`(말줄임) | `정리만 남은 영역` (위 한 줄과 같은 말) · geometry 그대로 | `src/app/me/state/page.tsx` |
| 5 | 검사 머리띠 | `배재대학교경영학과` | `배재대학교 경영학과` | `screen.tsx` |
| 6 | 종이 4쪽(사람이 PDF 를 넘기다 찾음) | `경영 일반 쪽에서 지금 할 수 있는 한 걸음` 묶음이 **머리 없이 목록만** 남았다(단추 이름이 유일한 머리였다) | 종이에서만 그 이름을 머리로 세운다 | `result/disclose.tsx` `printLabel` · `result.css` |

그림: `shots/admin-org-before-after.png` · `shots/explore-before-after.png` ·
`shots/pdf-p4-before-after.png` · `shots/before/` · `shots/after/`.

**고치지 않은 것(재현은 되지만 범위 밖 · 사업주 판단)**: 쿠키 없이 `/v3/start` 를
직접 친 학교 학생에게 개인 응시가 열리는 자리(앞 회차부터 적어 둔 것), 담당자가
`/me` 를 치면 `/cores` 로 가는 것(쓸 일이 없는 자리), 학교 학생의
`/campus/pcu/start` 가 결과를 받은 뒤에도 `검사 시작하기` 를 세우는 것(누르면 지난
결과로 간다 · 새 응시는 열리지 않는다).

## 3. STEP 4 · 실제 여정 (실제 브라우저 · 실제 PostgreSQL)

| 전공 · 학과 | 응시 | 확인 | 결과 | 비고 |
|---|---|---|---|---|
| 경영 · 경영학과 | 289 | **70 / 70** | 고장 내기 포함 | 최종 빌드 `0GYVR` |
| 경영 · 경영학과 (앞 빌드) | 248 | 70 / 70 | 고장 내기 포함 | 빌드 `q-X5V8` |
| 전기전자 · 전기전자공학과 | 251 | 54 / 54 | | 빌드 `6QdW` |
| 컴퓨터·SW · 소프트웨어학전공 | 284 | 54 / 54 | | 빌드 `6QdW` |
| 행정 · 행정학과(일반행정) | 285 | 54 / 54 | | 빌드 `6QdW` |
| 간호 · 간호학과 | 286 | 54 / 54 | | 빌드 `6QdW` |
| 미디어 · 미디어콘텐츠학과 | 287 | 54 / 54 | | 빌드 `6QdW` |

길: 학교 계정 발급 → 로그인 → 검사 시작 → 응답 저장 → 새로고침 → 이어하기 →
(BIZ: DB 를 실제로 멈춘 저장 실패와 다시 시도 · 응시 중 서버 재시작) → 제출(두 번
누름 · BIZ: 동시 제출 둘) → 결과 → PDF 다운로드 → 경험 추가 → 현재 상태 자동 반영
→ 로그아웃 → 재로그인 → 지난 기록 · 결과 · PDF · 경험 그대로 → 다른 학생 차단 →
(BIZ: PDF 를 못 만들 때 503 안내 · 서버 재시작 뒤 자료 그대로). 줄마다의 기록은
`journeys/*-e2e.md`. 다섯 전공은 `FAULTS=0` 으로 학생의 길만 밟았다 — 고장 쪽은
전공을 가리지 않아 BIZ 에서 두 번 봤다. `6QdW` 와 최종 빌드의 차이는 종이 머리 한
줄(2절 #6)과 판본 문자열뿐이다.

**응답 ↔ 결과 대조**(`checks/trace-289.txt` 와 같은 질의):

| 응시 | 전공 | 답 | 고른 근거 | 굳은 결과 | 경험 | 결과 머리 | 묶음 |
|---|---|---|---|---|---|---|---|
| 289 | BIZ | 109 | 0 | 1 | 1 | EVIDENCE_PARTIAL | TD02 · TD08 · TD09 = Z2 |
| 251 | EE | 109 | 0 | 1 | 1 | EVIDENCE_PARTIAL | 같은 자리 Z2 |
| 284 | CS | 107 | 0 | 1 | 1 | EVIDENCE_PARTIAL | 같은 자리 Z2 |
| 285 | PUBADM | 109 | 0 | 1 | 1 | EVIDENCE_PARTIAL | 같은 자리 Z2 |
| 286 | NURSING | 109 | 0 | 1 | 1 | EVIDENCE_PARTIAL | 같은 자리 Z2 |
| 287 | MEDIA | 109 | 0 | 1 | 1 | EVIDENCE_PARTIAL | 같은 자리 Z2 |

**이 대조가 말하는 것과 말하지 않는 것.** 걷는 도구는 보기를 정해진 자리로 누르고
근거 칩을 고르지 않는다. 그래서 여섯 응시가 같은 모양(근거 0 → 확인된 판단은
있는데 직접 정한 근거가 없음 → Z2 · `해 봤고, 정리만 남았어요`)으로 나오고, 그것이
규칙(소유는 응답과 고른 근거 둘을 함께 본다)대로다. 화면과 종이의 글은 전공마다
그 전공의 영역 이름과 말로 섰다(`v3:majors` 18 / 18 · 종이 22벌의 남의 전공 말 0).
**근거 8개를 고른 실제 모양의 학생**을 ID 단위로 되짚은 표는 R34 의
`docs/metri/review/r34/TRACE_AFTER.md`(응시 182)다.

## 4. 학교 담당자 · 격리

| 검사 | 결과 |
|---|---|
| `pcu:ops` 담당자 집계가 실제 응시를 반영하는가 | 19 / 19 |
| `pcu:cli` 담당자 업무 13개가 화면에서 끝나는가(CLI 의존 0) | 57 / 57 |
| `campus:export` 내려받기 · 5명 규칙 · 개별 답변 없음 · 권한 | 59 / 59 |
| `v3:isolation` 학생 A · B · 운영 화면 격리 | 11 / 11 |
| e2e §12 다른 학생의 PDF · 결과 · 응시 404, 학생은 담당자 화면을 못 연다 | 6 / 6 (전공 여섯 모두) |
| 담당자가 학생 개인 결과 · PDF 를 열면 | 404 (인벤토리) |

`campus:export` 의 한 줄을 고쳤다: 단과대학 줄의 `5명 미만` 은 **시작한 학생**을
두고 하는 말인데, 대상자가 마침 다섯인 단과대학이 생긴 날 대상자 칸(5명 규칙
안이다)까지 세어 멀쩡한 줄이 걸렸다. 대상자가 다섯 미만이면 비어야 한다는 것은
그대로 센다.

## 5. 종이 (PDF 전 쪽)

`pdf/` 에 여섯 전공의 PDF · 전 쪽을 모은 한 장(`*-sheet.png`) · 쪽마다 찬 비율
(`*-pages.json`)이 있고 BIZ 는 쪽 그림 아홉 장(`BIZ-p-*.png`)이 따로 있다.

| 전공 | 쪽 | 쪽마다 찬 비율(%) |
|---|---|---|
| BIZ | 9 | 88 · 100 · 100 · 97 · 98 · 100 · 100 · 100 · 86 |
| EE | 9 | 87 · 99 · 98 · 100 · 98 · 99 · 100 · 100 · 89 |
| CS | 9 | 87 · 99 · 99 · 98 · 98 · 95 · 100 · 97 · 99 |
| PUBADM | 9 | 84 · 100 · 99 · 98 · 100 · 100 · 97 · 99 · 73 |
| NURSING | 9 | 87 · 99 · 98 · 100 · 98 · 100 · 99 · 100 · 89 |
| MEDIA | 9 | 84 · 100 · 99 · 100 · 100 · 97 · 97 · 99 · 78 |

`v3-pdf-audit` 22벌(20 Core + ME 세 등급) **걸림 0**(`checks/pdf-audit.log`). 사람이
BIZ 아홉 쪽을 넘겨 본 판정: 한글 깨짐 0 · 잘린 줄 0 · 빈 쪽 0 · 쪽 나눔에서 머리가
홀로 남은 자리 0(고친 뒤) · 학교 · 학과 · 갈래가 표지와 머리말에 선다 · 전공의 말이
그 전공의 것이다. 걸어 둔 것: 응답이 기계적이라 같은 쪽에 `남은 것이 없다` 와
`의사결정이나 보고의 근거로` 가 함께 서는 등 고른 보기가 서로 어긋나 보이는 자리가
있다 — 그 사람이 고른 보기를 그대로 돌려준 것이고 `일부 답변이 서로 달라` 안내가
3쪽에 선다.

## 6. 다섯 Gate

| Gate | 판정 | 근거 |
|---|---|---|
| 1 재계약할 만한 디자인 | **NOT VERIFIED** | 사람이 판정할 자리다. 자동 검사 PASS 를 디자인 승인으로 쓰지 않는다. 그림: `shots/after/` · `shots/reference-vs-home.png` |
| 2 학생이 3~5초 안에 이해 | **NOT VERIFIED** | 실제 학생에게 보이지 않았다. 첫 화면은 `지금 할 일` 한 가지 · 현재 상태 셋 · 최근 변화 차례로 선다(그림 `shots/after/student_me-*.png`) |
| 3 전공 · 직무 · 근거 해석이 자료와 맞는가 | **PASS (LOCAL)** | 3절 대조 · 2절 #2(탐색이 홈과 같은 값을 읽는다) · `v3:majors` 18/18 · `v3:student` 79/79 · `v3:result` 25/25 · 종이 22벌 |
| 4 자소서 · 면접 · 포트폴리오 · 다음 경험에 쓸 수 있는가 | **NOT VERIFIED** | 구조는 있다: 지원서 문단의 뼈대(역할·행동·판단·결과) · 면접에서 되묻는 자리 · 영역별 할 일 · 그 학과의 한 걸음(종이 4~5쪽). 실제 학생이 그것으로 써 본 적이 없어 PASS 하지 않는다 |
| 5 실제 AI 가 정확도 · 개인화를 올렸는가 | **FAIL** | LLM 호출 0 · 외부 전송 0(R34 `AI_AUDIT.md` 그대로). 개인화는 결과 모델과 사전과 규칙이 만든다 |

## 7. STEP 6 · 출시 안전

| 항목 | 판정 | 근거 |
|---|---|---|
| 운영 배포 · 운영 DB · 결제 · 외부 메일 | 건드리지 않음 | 운영 가지 `02b6c610` 그대로 · 이 세션은 운영에 닿을 수 없다 |
| Staging 코드 = 배포 커밋 | **NOT VERIFIED (이 회차 커밋)** | 시작 시 `c22632ad` = 배포 · 상태 success. 이 회차 커밋은 푸시 뒤 GitHub deployment 기록으로만 본다(9절) |
| 오류 처리 | PASS (LOCAL) | `errors:check` 8/8 · e2e: DB 정지 시 `저장 실패 · 다시 시도` · PDF 실패 503 + 사람의 말 + `job_failures` 한 줄 |
| 세션 | PASS (LOCAL) | 서버 재시작 뒤 세션 유지 · 로그아웃 시 쿠키 0 · 로그아웃 뒤 PDF 307 |
| 권한 | PASS (LOCAL) | 4절 |
| 학생 자료 보존 | PASS (LOCAL) | 재시작 전후 답 · 결과 · 경험 수가 같다 · 재로그인 뒤 그대로 |
| 백업 → 복구 | PASS (LOCAL) / 운영 NOT VERIFIED | `checks/backup-restore.log`: 받고 → 빈 DB 에 붓고 → 표 14개 줄 수 같음 · 제약 10 · 외래키 218 · 굳은 결과 83장. `READ_ONLY=1` 이라 기록은 남기지 않았다 |
| 측정 동결 | PASS | `v3:freeze:measure` 14/14 (기록 그대로) |
| 화면 동결 | 다시 적음 | 검사 화면 `ME_V3_2_ASSESSMENT_UI_V43` · 결과지 `ME_V3_RESULT_UI_V77` · 작업공간 `CAREERMATRI_WORKSPACE_UI_V47` / `careermatri-workspace-copy.31` · Core 묶음 동결 |
| 원고 감사 | 기준선 그대로 | `copy:audit` 46 |
| 학생 공개 상태 | 바뀌지 않음 | 등록부 `open_to_students` diff 0 |

## 8. 이 패키지의 파일

```
README.md            이 문서
INVENTORY.md         STEP 1 분류
shots/after/         최종 빌드 화면(데스크톱 -d · 모바일 -m) 56장
shots/before/        고치기 전 18장
shots/*-before-after.png · reference-vs-home.png
pdf/                 여섯 전공 PDF · 전 쪽 한 장 · 쪽 비율 · BIZ 쪽 그림
journeys/            여섯 전공 e2e 기록
checks/              인벤토리 표 · 격리 · 집계 · CLI · 내려받기 · PDF 감사 · 백업 복구 · 응시 289 추적
```

## 9. Staging 에서 확인하는 방법 (사람이 한다)

이 컨테이너는 Staging 주소를 열지 못한다. 푸시 뒤:

1. GitHub → 이 저장소 → Deployments(또는 커밋 옆 체크) 에서 `feisty-generosity /
   staging` 이 이 회차 커밋을 `success` 로 적었는지 본다. 그 커밋이 지금 Staging 에
   떠 있는 코드다.
2. Railway → staging 서비스 → Shell 에서
   `npm run db:verify` (7/7 · 5/5 · 5/5) 와 `npm run ops:check` 를 친다.
3. 배재대 담당자 계정으로 로그인 → **전공 진단 집계** 로 바로 들어오는지, 메뉴가
   `전공 진단 집계 · 학생 관리` 두 줄인지, `/org/participants` 를 치면 집계로
   돌아오는지 본다.
4. 학생 계정으로 `/me/explore` → 홈의 `현재 상태` 에 선 영역이 산업 줄의
   `내 경험과 겹치는 영역` 에 서는지 본다.
5. 결과 PDF 를 내려받아 4쪽 근처에 `… 쪽에서 지금 할 수 있는 한 걸음` 머리가
   서는지 본다.
6. 응시 하나를 되짚을 때: `psql "$DATABASE_URL" -v att=<응시번호> -f
   /app/db/checks/v3_attempt_trace.sql` (읽기만 한다).
