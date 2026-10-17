# r1 screenshot index

Loop 와 Gate 와 Human Review 기준은 `docs/metri/SCREENSHOT_REVIEW_LOOP.md`.

이 회차는 Human Review 가 한 번도 돌지 않은 기준선이라 여덟 Gate 를 모두 담는다.
r2 부터는 그 회차에 고친 Gate 의 화면만 올린다.

찍은 자리마다 안쪽 코드가 없는지와 가로로 밀리지 않는지와 같은 그림이 두
이름으로 저장되지 않는지를 함께 센다. Core 하나에 확인 82가지이고 여섯 Core
모두 통과 82 · 걸림 0 이다.

| Core | 대표 학과 | 자리 | 파일 |
|---|---|---|---|
| `BIZ` | 경영학과 | `PCU26_BIZ` | 27벌 |
| `NURSING` | 간호학과 | `PCU26_NURSING` | 27벌 |
| `PUBADM` | 행정학과 일반행정트랙 | `PCU26_PUBADM_GENERAL` | 27벌 |
| `CS` | 컴퓨터공학전공 | `PCU26_SWF_COMPUTER` | 27벌 |
| `EE` | 전기전자공학과 | `PCU26_EE` | 27벌 |
| `MEDIA` | 광고사진영상학과 | `PCU26_ADPHOTO` | 27벌 |

## Gate 1 Assessment Desktop

| 파일 | BIZ | NURSING | PUBADM | CS | EE | MEDIA |
|---|---|---|---|---|---|---|
| `01-start` | 57KB | 57KB | 59KB | 61KB | 59KB | 60KB |
| `02-interest` | 90KB | 86KB | 95KB | 88KB | 90KB | 85KB |
| `03-experience` | 77KB | 80KB | 81KB | 82KB | 80KB | 81KB |
| `04-selected` | 79KB | 82KB | 83KB | 84KB | 82KB | 83KB |

## Gate 2 Assessment Mobile

| 파일 | BIZ | NURSING | PUBADM | CS | EE | MEDIA |
|---|---|---|---|---|---|---|
| `m1-interest` | 49KB | 47KB | 52KB | 48KB | 50KB | 46KB |
| `m2-experience` | 45KB | 43KB | 48KB | 44KB | 46KB | 42KB |
| `w360-interest` | 49KB | 47KB | 52KB | 47KB | 49KB | 45KB |
| `w360-experience` | 45KB | 42KB | 47KB | 43KB | 45KB | 41KB |
| `w360-picked` | 45KB | 43KB | 48KB | 43KB | 46KB | 42KB |
| `w430-interest` | 49KB | 47KB | 53KB | 49KB | 50KB | 47KB |
| `w430-experience` | 44KB | 42KB | 49KB | 44KB | 46KB | 42KB |
| `w430-picked` | 45KB | 43KB | 49KB | 44KB | 46KB | 42KB |

## Gate 3 Result Summary

| 파일 | BIZ | NURSING | PUBADM | CS | EE | MEDIA |
|---|---|---|---|---|---|---|
| `05-result-hero` | 113KB | 110KB | 115KB | 114KB | 109KB | 112KB |
| `m3-result` | 229KB | 227KB | 232KB | 230KB | 226KB | 229KB |

## Gate 4 Evidence

| 파일 | BIZ | NURSING | PUBADM | CS | EE | MEDIA |
|---|---|---|---|---|---|---|
| `06-result-evidence` | 90KB | 93KB | 92KB | 91KB | 91KB | 89KB |
| `m5-result-detail` | 1944KB | 1969KB | 1993KB | 1972KB | 1966KB | 1933KB |

## Gate 5 Action

| 파일 | BIZ | NURSING | PUBADM | CS | EE | MEDIA |
|---|---|---|---|---|---|---|
| `07-result-action` | 123KB | 120KB | 120KB | 120KB | 115KB | 121KB |

## Gate 6 "/me"

| 파일 | BIZ | NURSING | PUBADM | CS | EE | MEDIA |
|---|---|---|---|---|---|---|
| `10-me` | 214KB | 215KB | 218KB | 221KB | 217KB | 219KB |
| `m4-me` | 144KB | 145KB | 147KB | 148KB | 146KB | 147KB |

## Gate 7 PDF

| 파일 | BIZ | NURSING | PUBADM | CS | EE | MEDIA |
|---|---|---|---|---|---|---|
| `09-report` | 1705KB | 1727KB | 1774KB | 1800KB | 1773KB | 1757KB |
| `09-report-01` | 64KB | 63KB | 66KB | 67KB | 65KB | 65KB |
| `09-report-02` | 127KB | 124KB | 128KB | 129KB | 122KB | 125KB |
| `09-report-03` | 112KB | 107KB | 114KB | 110KB | 113KB | 110KB |
| `09-report-04` | 141KB | 154KB | 134KB | 132KB | 154KB | 142KB |
| `09b-appendix-10` | 177KB | 162KB | MISSING | 194KB | 176KB | 174KB |
| `09b-appendix-11` | 181KB | 188KB | 168KB | 172KB | 177KB | 182KB |

## Gate 8 Cross-Core

여섯 Core 의 `05-result-hero` 와 `06-result-evidence` 와 `07-result-action`
을 나란히 읽는다. 전공명만 바뀐 같은 제품 문장으로 보이면 FAIL 이다.

여섯 Core 사이에 바이트까지 같은 그림이 0개다(아래는 앞 16자).

| 파일 | BIZ | NURSING | PUBADM | CS | EE | MEDIA |
|---|---|---|---|---|---|---|
| `02-interest` | `c8332ebc7b9f007d` | `5c3b16ae91e01785` | `01a202ecba2de6b5` | `da9ede88d769a145` | `a70b910e5cefa6a9` | `c28e097f0dbc8529` |
| `05-result-hero` | `b9466c5b6a8dfeb1` | `2370a86941a9a31d` | `5a2f3f6e7fdd1f61` | `65be266e5838ead4` | `755dae30d7c8decb` | `7216518e29128ce5` |
| `06-result-evidence` | `37d08c614c8a21d7` | `ba02c2590f5354e0` | `70631fcd1b8a6a5d` | `78cc87b967de0174` | `239881c3e2debd6d` | `648bb6dd7bc54383` |
| `07-result-action` | `c42c5a674fdb3624` | `92918fed96a13c1f` | `8d24b6b26f4fef90` | `11fe8eca0190988a` | `6dd96af589dbdac0` | `75a389def6c4067b` |
| `10-me` | `1f8da009ed43547d` | `f4556c36e233cd21` | `b83dd5cbca0e03fa` | `50f25194ff8de7d1` | `86ffcb5e5e298244` | `fb8c686d6ec270e4` |

