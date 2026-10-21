# 홈페이지 (careermatri.com)

서비스를 설명하고 앱(`app.careermatri.com`)으로 보내는 사이트다. 가입·결제·
검사·결과지·작업공간은 전부 앱에 있고 **여기에는 두지 않는다**(설계 원칙 5,
루트 CLAUDE.md 의 "집이 둘이고 문은 한 방향" · "홈페이지가 앱 기능을 복제하지
않는다").

## 쪽

| 주소 | 내용 |
|---|---|
| `/` | 첫 화면 · 이용 순서(`#how`) · 결과지(`#report`) · 전공 20개(`#majors`) · 대학·기관(`#campus`) · 개인(`#personal`) · 자주 묻는 질문 |
| `/universities` | 대학·기관 도입: 진행 순서 · 담당자 화면 기능 · 학교 전용 주소 · 개인정보 · FAQ |
| `/assistant` | MAT · AI 취업비서(30일권 · 365일권). 한국어판에만 있다 |
| `/contact` | 문의. 메일 주소·전화를 고를 수 있는 글자로 두고, 칸을 채우면 메일 앱이 열린다 |
| 그 밖 | 404 쪽, `sitemap.xml`, `robots.txt`, `icon.svg`, `og-kr.png` · `og-global.png` |

옛 주소는 301 로 넘긴다(`next.config.ts`): `/pricing` · `/pca` · `/terms` ·
`/privacy` · `/refund` 는 앱으로, `/adopt` · `/anchor` · `/about` ·
`/partnership` · `/localisation` 은 위의 쪽으로.

## 원고와 링크

- 원고: `src/content/kr.ts`(기본) · `src/content/global.ts`. 형태는 `src/content/model.ts`
- 앱으로 가는 주소는 원고에 `/cores` · `/login` · `/pricing` · `/me/track` 처럼 적고,
  `src/lib/platform.ts` 의 `withAppLinks` 가 `https://app.careermatri.com/...?lang=` 로 바꾼다
- 가격은 `src/lib/prices.ts` 에만 적는다(지금은 AI 취업비서 두 상품뿐. 검사 등급
  가격은 앱 `/pricing` 이 정본이라 여기 적지 않는다)
- `kz.ts` · `tr.ts` · `types.ts` 는 옛 구조의 원고라 **연결돼 있지 않다**
  (`SITE=kz|tr` 은 빌드가 멈춘다). 새 구조로 옮겨 쓰기 전까지 그대로 둔다
- 문의는 서버가 받지 않는다. 메일 앱을 여는 것과 복사하기까지이고, 화면도 그렇게 적는다

## 만들고 띄우기

이 폴더의 `node_modules` 로 굽는다. **상위(`pca-platform/node_modules`)의 next 로
굽지 않는다**: 그 next 가 이 폴더의 React 와 짝이 맞지 않아 `/404` 를 미리 그리다
`Cannot read properties of null (reading 'useContext')` 로 멈춘다.

```bash
SITE=kr ./node_modules/.bin/next build      # 기본값이 kr 이다
SITE=kr ./node_modules/.bin/next start -p 3200
# 의존성이 있는 곳에서는: SITE=kr npm run build && npm start (PORT 기본 3200)
```

`.next` 를 같이 쓰므로 `kr` 과 `global` 을 동시에 띄우려면 따로 빌드한 사본이 필요하다.

## 확인

```bash
BASE=http://127.0.0.1:3200 APP_LOCAL=http://127.0.0.1:3100 npm run verify
#   모든 링크·단추 주소를 누른다: 쪽 200 · 앵커 존재 · 앱 주소 꼴과 lang · (앱이 떠 있으면) 앱 경로 404/5xx 아님
BASE=http://127.0.0.1:3200 OUT=/tmp/shots PW_CHROME=... node scripts/shots.mjs
#   쪽마다 1440 · 390 전체 화면, 가로 넘침을 실패로 센다, 손전화 메뉴 연 그림 한 장
node scripts/gen-og.mjs        # 공유 썸네일 두 장을 다시 굽는다
bash scripts/static-export.sh kr out-kr   # 서버 없는 미리보기 (리디렉션은 없다)
```

루트에서 `npm run claims:check` 와 `npm run copy:audit` 이 이 원고를 같이 센다.

## 배포

저장소에는 이 사이트의 배포 설정(vercel.json · Dockerfile · railway.json)이 없다.
Railway(`railway.json` · 루트 `Dockerfile`)는 **앱만** 굽는다.
`docs/metri/20_domains.md` 에 적힌 `careermatri.com → 216.198.79.1` 은 Vercel 이
apex 도메인에 쓰는 주소라, 지금 그 도메인은 Vercel 프로젝트에 붙어 있는 것으로
보인다(이 환경에서는 바깥 DNS·HTTPS 가 막혀 확인하지 못했다).

Vercel 로 올리는 순서:

1. Vercel → Add New → Project → 이 저장소를 고른다
2. **Root Directory** 를 `marketing` 으로 둔다 (Framework: Next.js 로 잡힌다)
3. Environment Variables 에 `SITE=kr` 하나 (영어판을 따로 올릴 때만 `SITE=global`)
4. Deploy. 끝나면 Settings → Domains 에서 `careermatri.com` 과 `www.careermatri.com` 을 붙인다
5. 이미 `careermatri.com` 이 붙은 프로젝트가 있으면 그 프로젝트의 Root Directory 와
   Production Branch 를 이 저장소·가지에 맞추고 Redeploy 한다

Railway 로 올린다면: 같은 프로젝트에 서비스 하나를 더 만들고 Root Directory 를
`marketing`, 변수 `SITE=kr`, 시작 명령 `npm start`(PORT 를 읽는다), 도메인
`careermatri.com` 을 붙인다. 이 경우 DNS 의 A 레코드를 Railway 가 알려 주는 값으로
바꿔야 한다.
