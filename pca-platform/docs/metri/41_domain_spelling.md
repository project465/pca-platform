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

## 3. 남은 결정 (**상용화 블로커**)

`npm run domains:check` 를 돌려 보면 이렇다 (2026-10-05, DNS 조회).

```
careermatri.com        응답 216.198.79.1      ← 남의 서버가 떠 있다
careermetri.com        조용함 (ENOTFOUND)
app.careermatri.com    조용함 (ENOTFOUND)
careermatri.co.kr      조용함 (ENOTFOUND)
careermetri.co.kr      조용함 (ENOTFOUND)
```

**규격이 적은 철자의 `.com` 은 이미 누군가 쓰고 있고, 저장소가 오래 쓴
철자의 `.com` 은 비어 있다.** 둘 중 어느 쪽으로 갈지는 코드가 정할 수 있는
일이 아니다.

- **DNS 가 뜬다고 남의 것이고 안 뜬다고 빈 것은 아니다.** 등록만 해 두고
  레코드를 안 건 도메인은 조용하다. 그래서 `careermetri.*` 가 조용한 것도
  "살 수 있다" 는 뜻이 아니다. **등록대행자/WHOIS 조회가 먼저다**
- 이 컨테이너에서는 `whois` 와 RDAP 이 막혀 있어 소유 여부를 확인할 수 없다
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
