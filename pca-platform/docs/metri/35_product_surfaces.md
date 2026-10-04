# 세 제품 화면 — 개인 · Campus · Admin

개발용 화면을 **파는 제품의 화면**으로 다시 짰다.

**DB 는 다시 만들지 않았다.** 스키마 · RBAC · Organization · Contract ·
License · Entitlement · Site Config · 좌석 생애주기 · 5명 규칙 · 채점 ·
ME_V2 엔진은 한 줄도 건드리지 않았다. 바뀐 것은 그 값을 **어떤 순서로
어떤 모양으로** 내보내는가다.

## 1. 옛 정보 구조와 새 정보 구조

| | 옛 화면 | 새 화면 |
|---|---|---|
| 브랜드 | Careermetri · 단체 PCA 가 섞여 있었다 | `CareerMatri` · `CareerMatri Campus` · `CareerMatri Admin` |
| 메뉴 | 위쪽에 작은 글자 링크 | 왼쪽 띠. 좁은 화면에서는 가로로 접힌다 |
| 개인 첫 화면 | 할 일 목록 하나. 응시 전이면 거의 빈 쪽 | 세 상태(아직 · 보는 중 · 끝남)가 전부 완성된 화면 |
| 기관 첫 화면 | `0 / 0 / 0` 숫자 셋 | 숫자 여섯 + 참여 흐름 + 직무 · 증거 집계 + 손볼 일 |
| 운영 첫 화면 | **없었다**(`/admin` 은 404, 로그인하면 기관 목록으로) | `/admin` 이 B2C · B2B · 제품 · 시장 네 묶음 |
| 표 | DB 칸을 그대로 늘어놓음. 첫 칸이 내부 코드 | 견주는 자리에만. 코드는 이름 아래 메타 |
| 빈 상태 | 흰 사각형에 글 한 줄 | 그림 · 제목 · 설명 · 할 일 넷을 갖춘 자리 |

세 화면이 **같은 디자인 시스템을 쓰고 정보 구조만 갈린다.**

- 개인은 **다음 한 걸음**을 묻는다. 그래서 어느 상태에서도 주된 단추가 하나다.
- Campus 는 **좌석과 진행과 손볼 일**을 묻는다. 그래서 숫자가 맨 위다.
- Admin 은 **무엇이 멈췄는가**를 묻는다. 그래서 네 묶음이 한 쪽에 있다.

## 2. 디자인 시스템

`src/app/surface.css` 한 벌. 이름이 전부 `sf-` 로 시작하는 것은 옛 화면
(`globals.css`)과 규칙이 부딪히면 둘 다 조용히 깨지기 때문이다.

| | 값 |
|---|---|
| 바탕 | `#f6f8fb` (아주 연한 중성 회색) · 카드는 흰색 |
| 글 | `#0e1f38` deep navy · `#3f5370` slate · `#78879c` 보조 |
| 강조 | `#1c5fb0` **하나뿐이다** |
| 뜻이 있는 색 | 확인 · 일부 확인 · 아직 셋. **좋고 나쁨을 칠하지 않는다** |
| 본문 | 15px · 메타 12.5px · 숫자 31px · H1 27px |
| 폭 | 최대 1360px. **브라우저 폭 전체로 늘리지 않는다** |
| 여백 | 쪽 32px · 카드 사이 20px |
| 모서리 | 14px · 테두리 1px · 그림자는 거의 없다 |

**모든 요소에 테두리를 돌리지 않는다.** 테두리는 묶음을 가르는 자리에만
쓰고, 안쪽은 여백과 활자 굵기로 가른다.

**도넛과 파이를 쓰지 않는다.** 가로 막대와 순위 목록뿐이다. 길이는 사람
수이고 그 이상 읽히지 않는다.

## 3. 주소

```
개인    /my · /my/assessments · /my/results · /my/evidence
        /my/applications(자리만) · /my/account
Campus  /org · /org/participants · /org/cohorts · /org/licenses
        /org/insights · /org/evidence-insights · /org/contract
        /org/reports(자리만) · /org/settings(자리만)
Admin   /admin · /admin/organizations · /admin/contracts
        /admin/sites · /admin/countries · /admin/ops
        /admin/users · /admin/products · /admin/orders
        /admin/assessments · /admin/reports · /admin/audit  (여섯은 자리만)
```

**`/admin` 을 기관 목록으로 넘기지 않는다**(`roles.ts` 의 `homePathFor`).
운영자가 아침에 여는 자리가 기관 목록이면 개인 쪽이 멈춘 날을 아무도 못 본다.

**자리만 잡아 둔 쪽은 가짜 숫자를 그리지 않는다.** 메뉴에 흐리게 두고,
들어가면 '이 화면은 아직 열려 있지 않습니다' 와 그 까닭을 적는다.

## 4. 새로 만든 파일

```
src/app/surface.css                 디자인 시스템 한 벌
src/lib/surface-text.ts             세 화면의 문구 (ko · en)
src/lib/my-home.ts                  개인 첫 화면의 세 상태
src/lib/admin-overview.ts           B2C · B2B · 제품 · 시장 집계
src/lib/evidence-insights.ts        기관 증거 집계 · 학년 · 기수 비교
src/components/sf/shell.tsx         왼쪽 띠 · 위쪽 띠 · 쪽 머리
src/components/sf/parts.tsx         숫자 칸 · 막대 · 흐름 · 빈 자리
src/components/sf/icon.tsx          선 아이콘 24개
src/components/sf/nav.ts            세 화면의 메뉴
src/components/sf/cells.ts          감춘 칸을 막대 줄로
src/components/sf/lang-select.tsx   언어 고르는 상자
db/seed/platform_demo_people.sql    눌러 볼 가상 참여자 24명
scripts/ui-shots.mjs                역할마다 로그인해 24장 캡처
```

## 5. i18n

**재사용하는 컴포넌트에 한국어를 박지 않는다.** 문구는 `surface-text.ts`
한 곳에 모으고 화면은 키로만 가져간다.

```ts
const T = txer(lang);   // lang 은 "ko" | "en"
T("campusSeats")        // 사전에 없는 키는 타입이 막는다
```

`locale.ts` 와 따로 둔 이유가 둘이다. 저기는 세 언어(ko·en·tr)를 한 줄에
쓰게 묶어 둔 사전이라 새 문구를 더하려면 **승인되지 않은 튀르키예어까지
지어내야 한다.** 그리고 저기는 응시 화면과 공개 페이지가 쓰고 있어서
건드리면 그쪽이 흔들린다.

**튀르키예어를 켜지 않았다.** 헤더에 탭이 떠 있었다는 것은 켤 이유가 되지
않는다. 화면 문구는 번역돼 있어도 결과지와 직무 분류가 그 언어로 검수되지
않았다. `SURFACE_LANGS` 에 한 줄을 더하면 그날 열린다.

언어 · 통화 · 사이트 지역 · 목표 국가는 이미 다른 칸이고(`attempts` 에 셋이
따로 있다) 화면은 그 값을 읽기만 한다.

## 6. 읽어 주는 장치

- 왼쪽 띠가 `<nav>` 이고 지금 쪽에 `aria-current="page"` 가 붙는다.
  **가장 길게 맞는 줄 하나만 켠다**: 앞자리만 보고 켜면
  `/org/participants` 에서 `/org` 도 같이 켜져 지금 어디인지가 안 읽힌다.
- 고르는 상자에 `sr-only` 이름표를 둔다. 화면에 또 적으면 군더더기이고,
  아예 없으면 무엇을 고르는 상자인지 읽어 주지 못한다.
- 상태를 **색으로만 말하지 않는다.** 확인 · 일부 확인 · 아직은 글자로 적고
  색은 거드는 자리다.
- 눌러서 고르는 것은 38px 이상이고 키보드 초점에 테두리가 보인다.
- `prefers-reduced-motion` 을 따른다.

## 7. 좁은 화면

| 폭 | 하는 일 |
|---|---|
| 1440 · 1280 | 왼쪽 띠 248px + 본문 최대 1360px |
| ~1180 | 숫자 칸이 넷에서 둘로, 두 칸 격자가 한 칸으로 |
| ~900 | 왼쪽 띠가 위로 접혀 가로 스크롤 띠가 된다 |
| ~560 | 모든 격자가 한 칸 |

`npm run ui:shots` 가 **가로 스크롤을 버그로 센다.** 좁은 화면에서 쪽이
옆으로 밀리면 실패로 떨어진다(표 자체의 넘침은 제 상자 안이라 괜찮다).

## 8. 고친 버그 셋

화면을 다시 그리다 **값이 틀리게 나오던 자리 셋**이 드러났다.

1. **기관 직무 집계가 늘 비어 있었다.** `insights.ts` 의
   `careerDistribution` 이 `f.cluster_id` 와 `jc.name_key` 를 읽는데 표에
   없는 칸이다(`job_id` · `code` 가 맞다). 뒤에 붙은 `catch` 가 그 오류를
   삼켜서, 화면에는 '아직 채점된 응시가 없습니다' 로 보였다. **자료가 없는
   것과 쿼리가 깨진 것이 구별되지 않았다.**
2. **회차 날짜를 그리면 화면이 터졌다.** `sessionsOf` 가 `opens_at` 을
   `string` 이라고 적어 두고 `Date` 를 돌려줬다. 옛 화면이 그 칸을 안
   그려서 아무도 몰랐다. 쓰는 쪽을 고치면 다음 사람이 같은 데서 넘어지므로
   쿼리에서 글자로 바꿨다.
3. **기관 이름 자리에 코드가 찍혔다.** 번역 줄이 없으면 바로 `o.code` 로
   떨어졌다. `organizations.name` 이 있는데 건너뛰고 있었다.

**참여 흐름도 다시 셌다.** 상태별 개수를 그대로 단계에 넣으면 뒤 단계가 앞
단계보다 커진다. 누적으로 센다: 완료한 사람도 한때 초대를 받았다.

## 9. 지키고 있는 것

- **5명 미만 칸은 숫자를 내지 않고 0 으로도 적지 않는다.** 감춘 칸은 빈
  막대를 빗금으로 그린다. 빈 막대는 0 으로 읽힌다.
- **나눌 바닥이 0 이면 비율을 만들지 않는다.** `—` 와 그 까닭을 적는다.
- **기관은 개인 결과지를 열지 못한다.** 참여자 표의 결과지 칸에 '열람 불가'
  와 그 까닭이 같이 적힌다. 담당자가 왜 못 여는지 모르면 운영사에 전화가 온다.
- **등수를 매기지 않는다.** "32% 가 CAE 에 적합" 이 아니라 "32명이 지금
  CAE 를 먼저 살펴보고 있다" 다.
- **초대를 좌석 사용으로 세지 않는다.** 숫자 칸이 그 경계를 가른다.
- **나라 자료를 지어내지 않는다.** 확인된 줄이 없으면 `Global Reference Mode`.

## 10. 직접 세워 보기

```bash
createdb cmlocal
export DATABASE_URL="postgres://localhost/cmlocal"
npm run db:reset && npm run db:platform && npm run metri:seed && npm run db:seed
npm run db:demo          # 눌러 볼 가상 자료 (운영 DB 에 넣지 않는다)
AUTH_SECRET=$(openssl rand -base64 48) npx next dev -p 3100
npm run ui:shots         # 역할마다 로그인해 24장
npm run platform:roles   # 남의 화면이 막히는지
```

`db:demo` 가 넣는 자료는 **지어낸 것이다.** 이름이 '가상 01' 인 것도,
점수가 채점 엔진을 거치지 않은 것도 일부러다. 이 자료로 산식을 판단하지
않는다.

## 11. 아직 읽기 전용이거나 비어 있는 것

- **`/admin/ops` 는 옛 화면 그대로다.** 밤 당번 브리핑이라 다른 화면과
  모양이 갈린다. 기능은 돌고 있다.
- **쓰는 단추가 거의 없다.** 초대 보내기 · 좌석 거두기 · 기수 만들기는
  라이브러리에 있지만 화면에 없다. 누르면 돈과 개인정보가 움직이는 자리라
  감사 기록과 확인 절차가 먼저다.
- **`/admin/sites` 와 `/admin/countries` 는 읽기만 한다.** 도메인은 한 글자가
  틀리면 남의 주소로 간다.
- **자리만 잡아 둔 쪽 여덟**: 개인 지원 준비 · Campus 보고 · Campus 설정 ·
  Admin 사용자 · 상품 · 주문 · 검사 · 보고 · 감사 기록.
- **ME_V2 는 아직 서버에 붙지 않았다.** 개인 화면의 결과는 ME_V1 응시를
  읽는다. 학위 단계 칸이 없어서 집계는 학년으로 세고, 화면에도 '학년' 이라고
  적는다.
- **참여자 표의 증거 칸이 비어 있다.** 개인 증거를 기관이 보는 경계를 먼저
  정해야 채울 수 있다.
