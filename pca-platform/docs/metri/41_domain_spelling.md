# 도메인 철자 — 감사 결과와 남은 결정

Phase 2.1 12번 항목(`careermatri.com` / `careermatri.co.kr` 도메인 철자 전체
감사)의 결과다. **코드는 한 철자로 맞췄고, 어느 철자를 살 것인지는 남아 있다.**

## 1. 무엇이 어긋나 있었는가

| 쪽 | 쓰던 철자 |
|---|---|
| 받은 규격 (Phase 2.1 문서) | `careermatri` |
| 플랫폼 `db/schema_platform.sql` 의 `site_configs` | `careermatri` |
| 소개 사이트 원고 네 벌 (`marketing/src/content/*.ts`) | `careermetri` |
| 정적 페이지 (`sites/metri-plus` · `sites/status` · `sites/careermetri/imweb-en`) | `careermetri` |
| 주소를 재 보는 검사 (`scripts/domains-check.mjs`) | `careermetri` |
| `LAUNCH.md` · `CLAUDE.md` · 문서 네 편 | `careermetri` |

**한 글자 차이**라 눈으로 읽으면 둘이 같아 보인다. 그런데 소개 사이트의
'시작하기' 가 `app.careermetri.com` 을 가리키고 플랫폼이 `careermatri.com`
으로 서 있으면, 학생은 **우리가 올리지 않은 주소**로 간다. 그 주소에 남이
있으면 남의 집으로 간다.

## 2. 고친 것

저장소 전체를 규격 철자(`careermatri`)로 맞췄다. 52줄이고, 디렉터리 이름
(`sites/careermetri/`)과 옛 이름을 적어 둔 내력 문서
(`docs/metri/20_domains.md` · `24_naming.md`)는 건드리지 않았다. 그쪽은
도메인이 아니고 기록이다.

**적어 두는 자리를 줄였다.** 소개 사이트 원고 네 벌에 흩어져 있던 열여섯
줄을 `marketing/src/lib/domains.ts` 한 곳에서 읽어 오게 했다. 정적 빌드라
DB 의 `site_configs` 를 볼 수 없어 적어 둘 수밖에 없지만, **네 번 적어 두면
고칠 때 한 곳이 반드시 남는다**. 실제로 이번에 그랬다.

`npm run domains:audit` 이 셋을 본다.

1. 저장소 안에 두 철자가 같이 사는가. 같이 살면 그 자체로 탈이다
2. 플랫폼과 소개 사이트가 같은 철자인가
3. 도메인이 적어 두어도 되는 자리 밖에 박혀 있는가. 허용 목록을 늘리려면
   그 줄을 늘려야 하므로 늘리는 것이 눈에 띈다

## 3. 소유 (**2026-10-05 정정**)

`careermatri.com` 은 **우리 것이다.** 소유자가 확인해 주었고
`site_configs.ownership = 'confirmed'` 에 적혀 있다. 정규 주소는
`https://careermatri.com` 이다.

**앞서 이 문서는 그 도메인을 제3자 소유라고 적었다. 틀렸다.**

```
careermatri.com        응답 216.198.79.1      ← 지금 그 주소에 무언가 떠 있다
app.careermatri.com    조용함 (ENOTFOUND)
careermatri.co.kr      조용함 (ENOTFOUND)
```

모르는 IP 가 응답한다는 것만 보고 남의 것이라고 적었는데, **DNS 가 어디를
가리키는지와 도메인이 누구 것인지는 별개다.** 사 둔 도메인을 등록대행자의
주차 페이지나 CDN 에 걸어 두면 모르는 IP 가 응답한다. 조회로 알 수 있는
것은 "지금 그 주소에 무언가 떠 있다" 까지다.

그래서 판단하는 자리를 옮겼다.

| 무엇 | 누가 말하는가 |
|---|---|
| 소유 | 소유자. `site_configs.ownership` 에 적는다 |
| 지금 그 주소에 떠 있는 것 | `npm run domains:check` (DNS) |
| 우리 운영이 떠 있는가 | `npm run domains:verify` (배포 뒤 HTTPS·리디렉션·정규 주소) |

- **`careermetri` 는 공식 브랜드 도메인으로 쓰지 않는다.** 한 글자 다른
  철자이고, 그쪽이 조용하다는 것이 그것을 쓸 이유가 되지 않는다
- 한국 도메인 `careermatri.co.kr` 은 아직 소유가 확인되지 않았다
- `careermatri.com` 에 HTTPS 로 물어봤을 때 본문이 오지 않았다. 주차
  페이지일 수도 있고 이 컨테이너의 바깥 연결이 막힌 것일 수도 있다.
  **어느 쪽인지 확인하지 않았으므로 단정하지 않는다**

### 결정해야 하는 것

1. **어느 철자를 살 것인가.** 규격의 `careermatri` 인가, 저장소가 쓰던
   `careermetri` 인가
2. `careermatri.com` 의 현재 소유자가 누구인가 (WHOIS). 주차 중이면
   매입 가능 여부와 값
3. `.co.kr` 은 양쪽 다 조용하다. `.com` 만 걸린다면 한국 먼저 가는
   길도 있다

### 정하고 나면 고칠 곳

두 곳이다. 그래서 이 결정이 늦어도 다른 작업이 막히지 않는다.

- `db/schema_platform.sql` 의 `site_configs` 두 줄 (플랫폼)
- `marketing/src/lib/domains.ts` (소개 사이트)

그리고 `scripts/domains-audit.mjs` 의 `SPEC` 한 줄과
`scripts/domains-check.mjs` 의 목록을 같이 맞춘다.

**통신판매업 신고서에 웹사이트 주소 칸이 있다.** 도메인이 그 앞 단계이고,
개인 결제를 켜려면 신고가 먼저다. 이 블로커는 결제 블로커와 한 줄로
이어져 있다.
