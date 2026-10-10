# 웹 결과지가 종이 문서를 펼치던 것

판정: `RESULT WEB RENDERING FIX PASS / PRODUCTION OWNER RECHECK REQUIRED`

측정은 `ME_V3_MEASUREMENT_FREEZE_1` 에 그대로 머문다. 문항 은행 · 채점 ·
소유 판정 · zone 규칙 · ResultModel · Major Core · Industry Pack · Role
Pack · 가격 · DB schema · 저장과 이어하기 · 굳은 결과 · 옛 결과 데이터를
한 줄도 건드리지 않았다. 고친 것은 UI 와 rendering 과 routing 과
호환성뿐이다.

---

## A. 원인

둘이고 겹쳐 있었다.

**첫째, 옛 판본 웹 결과지가 본문을 전부 펼쳐 놓고 있었다.** 그 결과지는
A4 열일곱 장짜리 문서 한 벌이고, 창에 그대로 그리면 본문 열 절이 처음부터
열려 있다. 접는 코드가 부록 한 자리에만 있었다(`apFold`). 가려 둔 것도
아니고 접는 자리가 아예 없었다.

**둘째, 창 높이를 주고받는 고리가 한 바퀴마다 늘어났다.** 안쪽 틀이
`document.documentElement.scrollHeight` 를 바깥으로 보내는데, 그 값은 담긴
것이 창보다 짧으면 **창 높이**를 돌려준다. 바깥이 거기에 40 을 더해
iframe 을 키우면 안쪽 창도 같이 커지고, 그 커진 값이 다시 올라간다. 담긴
것이 2,834px 인 결과지가 6,333px 에 서 있었다. 첫째를 고치고도 첫 화면이
창 여섯 배였던 까닭이 이것이다.

## B. 어떤 결과 version 이 어떤 renderer 를 탔는가

| 판본 | 굳은 자리 | 여는 주소 | 웹 renderer | 종이 |
|---|---|---|---|---|
| ME_V1 (`attempts.assessment_version` 이 비어 있음) | `attempts` · `responses` | `/report/[id]` | 서버가 그리는 쪽 | 없음 |
| ME_V2 (`attempts` 는 `ME_V2`, 스냅샷은 `ME_V2_DECISION_2026`) | `report_snapshots.payload` | `/assessment/[id]/report` | 창 안의 정적 엔진 (`public/me-v2/report-host.html`) | `/pca/v2.html` 를 머리 없는 브라우저로 |
| ME_V3_2 | `v3_snapshots.result_model` | `/v3/[id]/result` | React (`page.tsx` + `Detail` · `Fold`) | 같은 쪽을 인쇄 매체로 |
| 견본 | `public/me-v2/sample.*.json` | `/sample` | 같은 창 (여기서는 접지 않는다) | 없음 |

섞여 있지 않았다. 옛 결과가 지금 판본의 renderer 를 타지 않고, 지금 판본이
옛 renderer 를 타지도 않는다. 다만 **섞일 길이 열려 있었다**: 어느 쪽으로
보낼지를 화면이 `=== "ME_V2"` 글자로 판단하고 있었고, 그 칸에는 꼴이 다른
값이 둘 들어온다. 판단하는 자리를 `engine-entry.ts` 하나로 모았다.

## C. 실제 긴 스크롤 원인

규격이 적어 준 열 가지를 실제 DOM 으로 하나씩 봤다.

| 후보 | 결과 |
|---|---|
| 옛 결과가 지금 renderer 를 탄다 | 아니다 |
| 지금 결과가 옛 renderer 를 탄다 | 아니다 |
| 웹과 종이가 component tree 를 과하게 나눠 쓴다 | 아니다. 종이는 `/pca/v2.html`, 웹은 `report-host.html` 로 파일이 다르다 |
| 인쇄용 펼침 상태가 웹 기본에 섞였다 | 아니다. 반대로 **웹이 늘 펼쳐져 있었다** |
| `<details open>` · 인쇄 CSS · 서버가 넘긴 펼침값 · 주소 인자 | 없다. 접는 코드가 아예 없었다 |
| 안 보이는 요소가 높이를 잡는다 | 아니다 |
| 같은 것을 두 번 그린다 | 아니다 |
| 창이 바깥 높이를 먹는다 | **그렇다. 원인 하나가 여기다** |
| 고정 요소 때문에 높이가 두 번 세어진다 | 아니다. 띠는 붙어 서지만 높이를 더하지 않는다 |
| 부록이 무조건 올라온다 | 올라오되 접혀 있었다 |

재어 본 값이다. 같은 기계 · 같은 자료 · 같은 응시(PRO · 종이 17장)다.

| | 고치기 전 | 고친 뒤 |
|---|---|---|
| 1440 × 900 | 13,773px (창 15.3배) | 2,981px (창 3.3배) |
| 390 × 844 | 18,003px (창 21.3배) | 3,519px (창 4.2배) |
| 접힌 본문 절 | 0절 | 10절 |

## D. 수정 파일

```
public/me-v2/report-host.html                   절 접기 · 띠 연동 · 담긴 높이 보내기
src/app/assessment/[attemptId]/report/page.tsx  첫 화면(판본 표시 · 핵심 요약 · 상세)
src/app/assessment/[attemptId]/report/report-view.tsx  받은 높이에 더하지 않는다
src/app/sample/sample-frame.tsx                 같은 고리를 끊는다
src/lib/me-v2/legacy-summary.ts                 굳은 기록에서 세 줄을 꺼낸다 (새 파일)
src/lib/engine-entry.ts                         isLegacyV2 · legacyReportPathFor
src/lib/labels.ts · my/results · my/assessments 판본 분기를 그 함수로
src/lib/surface-text.ts · src/app/surface.css   문구와 생김새
scripts/v3-result-height.ts                     자동검사 (새 파일)
scripts/v3-legacy-shots.ts                      캡처 (새 파일)
scripts/stage-serve.sh                          PDF 두는 자리를 cwd 에 매달지 않는다
```

## E. 옛 결과에 미치는 영향

데이터는 한 줄도 바뀌지 않았다. `report_snapshots` 도 `attempts` 도
`v2_responses` 도 그대로이고, 지우거나 옮긴 것이 없다. 바뀐 것은 그 줄을
화면에 어떤 차례로 내놓는가다.

첫 화면에 서는 것은 이전 검사 결과라는 표시와 검사일과 전공과 등급,
그리고 굳은 기록에서 꺼낸 세 줄이다. 그 세 줄은 결과를 만들 때 이미
적어 둔 값(`payload.summary`)이고 여기서 다시 계산하지 않는다. 옛 줄에
그 칸이 없으면 요약 없이 상세만 선다.

전체 보고서는 그 아래에 그대로 있고 절마다 접혀 있다. 눌러서 펼치면
문서가 그만큼 길어진다(2,981px 에서 15,433px). 부록도 전처럼 접혀 있고
펼치면 2,303자가 그대로 나온다.

## F. 지금 판본에 미치는 영향

화면 코드를 고치지 않았다. 지금 판본 결과지는 전부터 요약에서 시작하고
본문을 `자세한 내용 보기` 안에 두고 있었고, 재어 보니 세 등급 모두 첫
화면이 900px(창 1배)이다. 펼치면 4,772 · 7,779 · 10,768px 가 된다.

바뀐 것은 그 구조를 **검사가 지키게 한 것**뿐이다. 전에는 지금 판본의 첫
화면 길이를 세는 자리가 없었다.

## G. 종이에 미치는 영향

없다. 세 가지로 확인했다.

- 종이를 그리는 자리는 웹 틀이 아니라 `/pca/v2.html` 이다(`me-v2/render.ts`). 이번 회차에서 바뀐 파일 가운데 그 길에 있는 것이 **0개**다
- 접힌 자리는 인쇄 매체에서 전부 펴진다(10절 가운데 10절). 화면에서 접은 것이 종이에서 사라지지 않는다
- 내려받는 길이 그대로 열린다(HTTP 200 · 1,686,408바이트). 두 언어 결과지를 다시 뽑아 쪽수를 세는 검사도 그대로 통과한다(한국어 17장 · 영어 17장)

앞선 회차에서 같은 응시의 결과지를 실제로 다시 만들어 보고 장수가
19장에서 19장으로 같고 renderer 지문도 같은 것을 확인했다.

## H. 굳은 결과에 미치는 영향

없다. 스키마도 값도 그대로이고 마이그레이션이 필요하지 않다. 굳은 결과를
글자째 견주는 검사(`v3:owner` · `v3:product-loop` · `v3:recompute`)가 전부
그대로 통과한다.

## I. 새 자동검사

`npm run v3:result:height` 로 스물여덟 가지를 센다. `v3:all` 사슬에 들어
있다.

```
A 초기 높이     창 대비 비율 (옛 결과 · 지금 판본 세 등급 · 손전화)
B 접힘          본문 절과 부록과 상세가 처음에 접혀 있다
C 종이 불변     인쇄에서 전부 펴지고 내려받는 길이 살아 있다
D 옛 결과 호환  500 없음 · 띠가 절을 연다 · 펼치면 전부 보인다
E 판본 분리     renderer 를 섞지 않고 분기를 글자로 적지 않는다
```

**높이만 재지 않는다.** 그러면 `max-height` 와 `overflow` 한 줄로 통과한다.
펼친 뒤의 높이도 같이 재서 접기가 담긴 것을 접은 것인지 본다. 가려 둔
화면은 펼쳐도 늘어나지 않는다.

되돌려 보고 실제로 걸리는 것까지 확인했다. 접기를 빼면 A 와 B 가 걸리고
(통과 22 · 걸림 6), 판본 분기를 화면에 글자로 적으면 E 가 걸린다.

## J. 데스크톱 캡처

`docs/metri/shots/legacy/` 에 열 자리를 첫 창과 쪽 전체로 찍어 두었다.
같은 그림이 두 이름으로 저장되면 걸리게 해 두었고 겹침은 0 이다.

```
01_legacy_first_desktop    2,981px   첫 화면에 요약과 단추가 선다
02_legacy_section_desktop  3,766px   절 하나를 펼친 자리
03_legacy_appendix_desktop 8,780px   부록까지 펼친 자리
04_v3_first_desktop          900px   지금 판본 첫 화면
05_v3_detail_desktop      10,768px   본문을 펼친 자리
```

## K. 손전화 캡처

```
01_legacy_first_mobile     3,519px
02_legacy_section_mobile   5,111px
03_legacy_appendix_mobile 12,454px
04_v3_first_mobile         1,169px
05_v3_detail_mobile       17,238px
```

첫 창 안에서 이전 검사 결과라는 표시와 검사일과 전공과 등급과 PDF 단추와
핵심 요약 세 줄이 전부 읽힌다. 전에는 그 자리를 경험 안내 칸이 거의 다
먹고 있어서 요약을 한 줄도 못 읽고 스크롤이 시작됐다. 그 칸을 요약 다음으로
내렸다.

## L. 전체 회귀

`v3:all` 의 마흔한 묶음을 나눠 돌려 전부 종료코드 0 이다. 밖에서 더 돌린
것은 `josa:check` 와 `global:check` 이고 둘 다 통과한다. 작업공간 동결은
파일 지문만 다시 적었다. 고친 두 쪽에서 사람이 보는 글자가 한 자도
달라지지 않아서 판본은 올리지 않았다(`CAREERMATRI_WORKSPACE_UI_V10` ·
`careermatri-workspace-copy.9` 그대로).

판본을 하나도 올리지 않았다. 검사 화면과 결과지 화면과 판단 규칙과 결과
모델이 전부 그대로다.

## M. commit

`4728301` 과 이 문서를 담는 커밋이다. 가지는 `claude/amazing-thompson-w3f2o2`.

## N. 운영에서 다시 눌러야 하는 다섯 걸음

재배포가 먼저다. 고친 것이 전부 이미지 안으로 들어가는 파일이다.

```
1. 결과 기록 → 계정 → 옛 결과 목록에서 지난 결과를 연다
   정상  첫 창 안에서 이전 검사 결과 표시와 검사일과 핵심 요약이 읽힌다
   FAIL  오른쪽 스크롤이 끝없이 내려간다

2. 그 쪽에서 상세 결과의 절 하나를 펼친다
   정상  그 절의 본문이 그 자리에서 열리고 쪽이 그만큼 길어진다
   FAIL  눌러도 아무 일이 없거나 안쪽에 스크롤이 하나 더 생긴다

3. 맨 아래 부록의 상세 분석을 펼친다
   정상  열여섯 직무와 문항 되짚기가 그대로 나온다
   FAIL  비어 있거나 글자가 잘린다

4. PDF 받기를 누른다
   정상  전체 보고서가 전처럼 받아진다
   FAIL  404 이거나 쪽수가 줄었다

5. 지금 판본 결과를 연다 (내 CareerMatri → 결과 기록)
   정상  첫 화면이 요약이고 자세한 내용 보기로 본문이 열린다
   FAIL  옛 결과와 같은 창이 뜨거나 본문이 처음부터 펼쳐져 있다
```

손전화에서 1번과 2번과 4번을 다시 누른다.

## O. 최종 판정

`RESULT WEB RENDERING FIX PASS / PRODUCTION OWNER RECHECK REQUIRED`

네트워크 정책이 `app.careermatri.com:443` 을 막아 운영 배포본을 밖에서 한
번도 열지 못했다. 위의 값은 전부 이 기계에서 운영과 같은 배치로 띄워 잰
것이다. 사업주가 N 절의 다섯 걸음을 운영에서 누르기 전까지
`COMMERCIAL READY` 를 쓰지 않는다.
