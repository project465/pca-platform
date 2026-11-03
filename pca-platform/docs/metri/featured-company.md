# 기관 프로그램의 중점 기업 카드 (2026-11-03)

기관이 기업탐방 같은 프로그램을 돌리면, 그 프로그램에 든 참여자의 결과 **지역 부분 맨 위**에
그 회사를 카드로 자세히 세운다. 첫 사례는 비전세미콘이다.

| 프로그램 코드 | 기관 | 이름 | 받는 사람 |
|---|---|---|---|
| `KUS26_VISIONSEMI_TOUR` | 고려대학교 세종캠퍼스 | 2026 세종 기업탐방 프로그램 – 비전세미콘 | school |
| `SJEPA26_JOBTALK11_TOUR` | 세종일자리경제진흥원 | 2026년 청년 구직활동 취업특강 (11차) 기업탐방 | agency |

## 어디에 서는가

| 자리 | 위치 | 코드 |
|---|---|---|
| 웹 결과 `/v3/{id}/result` | 지역 절(`#region-orgs`) h2 바로 아래 | `result/region.tsx` → `result/featured.tsx` |
| `/me/region` | 같은 지역 절 컴포넌트라 같은 자리 | 같음 |
| PRO 종이(책) | 지역 장 표지 바로 다음 한 쪽 | `report-long/featured-page.ts` (`index.ts` 에서 끼움) |
| BASIC · STANDARD 종이 | 웹 결과를 인쇄하므로 웹과 같음 | — |

프로그램에 들지 않은 사람에게는 아무것도 서지 않는다(견본의 대조군이 이것을 본다).

## 무엇이 어디에 있는가

- **프로그램 설정**: `sites/pca-platform/content/featured-programs.v1.json`
  기관 코드 · 프로그램 이름 · 기수 이름 · 회사 · 받는 사람(school/agency) · 현장 질문 주제
- **회사 사실**: `sites/pca-platform/content/featured-companies.v1.json`
  칸마다 `src`(출처) · `on`(기준일) · `official`. 공식 출처가 아닌 칸은 `review` 에 대조할 일을 적는다
- **누가 프로그램에 드는가**: DB 의 기수. `cohorts.program_code`(`db/schema_featured.sql`) → `cohort_members`.
  칸이 아직 없는 DB 에서는 기수 이름(`cohort_name`)으로 찾는다. **명단은 저장소에 두지 않는다**
- **잇는 규칙**: `src/lib/featured/index.ts`. 회사가 이 전공의 어느 산업 묶음에 드는지는
  지역 절(`regionView`)이 이미 가른 묶음을 그대로 읽는다. 그 산업이 쓰는 영역은 관계표의
  `중심` · `있음`, 영역 묶음은 굳은 결과 그대로다. 점수를 만들지 않는다
- **문구**: `src/lib/featured/text.ts`. agency 쪽은 학과 · 학번 · 수업 같은 학교 말을 쓰지 않는다

## 다른 회사 · 학교 · 기관에 쓰려면

1. `featured-companies.v1.json` 에 회사 한 줄(출처 · 기준일을 붙여서)
2. `featured-programs.v1.json` 에 프로그램 한 줄(기관 코드는 학교 등록부의 코드)
3. 참여자를 기수에 넣는다:
   ```bash
   PROGRAM=<코드> FILE=<저장소 밖 명단 CSV> npm run featured:enroll          # 미리 보기
   PROGRAM=<코드> FILE=<저장소 밖 명단 CSV> APPLY=1 npm run featured:enroll  # 넣기
   ```
4. `npm run featured:check`

회사가 그 지역 명단(공시 · 벤처기업 명단)에 있으면 지역 절과 같은 규칙으로 산업 묶음이 갈린다.
명단에 없으면 회사 자료의 `themes` 를 같은 업종 낱말표로 산업 묶음 이름에 대어 본다.

## 명단(CSV) 칸 제안

지금 계정 일괄 발급 CSV 에는 프로그램을 적을 칸이 없다. 두 길이 있다.

- **지금 바로**: 발급은 그대로 하고, 같은 CSV 를 `featured:enroll` 에 한 번 더 넣는다(아이디 · 학번 칸만 읽는다)
- **제안**: 발급 CSV 에 `프로그램` 칸(값은 프로그램 코드)을 더해, 발급하면서 기수에 넣는다.
  담당자 화면(`/org/*`)은 고려대 방 담당이라 이 브랜치에서는 고치지 않았다

## 사실 자료의 상태 (2026-11-03)

- 업종 · 주력 품목 · 소재지: 중소벤처기업부 벤처기업 확인 명단(공식)
- 제품 · 인재상: 회사 누리집(공식). 세션 네트워크에서 원문을 열지 못해 검색 발췌로 확인 → **원문 대조 필요**
- 매출 · 영업이익 · 직원 수: 사람인 기업정보(2차). **OpenDART 감사보고서 대조 전**.
  비전세미콘은 비상장이라 저장소의 OpenDART 자료(상장사 사업보고서 · 기업개황)에 들어 있지 않다
- 대표자 이름 · 연락처는 싣지 않는다
