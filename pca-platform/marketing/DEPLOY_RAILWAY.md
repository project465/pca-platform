# 홈페이지를 Railway 에 올리기 (www.careermatri.com)

앱(`app.careermatri.com`)이 있는 Railway 프로젝트에 **서비스 하나를 더한다.** 앱 서비스는 건드리지 않는다.

## 미리 해 둔 것 (2026-10-22)

- `marketing/railway.json` — 빌드·시작 명령, 상태 확인(`/`), 실패 시 다시 띄우기, `marketing/` 이 바뀔 때만 다시 올리기
- `package.json` 의 `engines.node` — Node 20.9 이상 22 이하
- **정규 주소는 `www.careermatri.com`** 이다. `careermatri.com` 으로 들어오면 www 로 308 (`src/middleware.ts`)
- 앱 쪽 `site_configs` 의 정규 주소(로고가 가리키는 홈페이지)는 아직 `https://careermatri.com` 이다. 포워딩으로 www 에 닿으니 급하지 않고, 운영 DB 한 줄이라 따로 고친다
- 빈 폴더에 `marketing/` 만 꺼내 `npm ci → npm run build → PORT=4321 npm run start` 를 돌려 네 언어·앱 링크·www 넘김·CSS 가 전부 서는 것을 확인했다. `SITE` 를 넣지 않아도 한국어판이 기본이다

## 누를 차례

1. Railway → 앱이 있는 프로젝트 → **production** 환경
2. **+ Create → GitHub Repo → `project465/pca-platform`**
3. 새 서비스 → **Settings**
   - **Source → Root Directory**: `/pca-platform/marketing` (저장소 맨 위에 `pca-platform/` 폴더가 한 겹 더 있다)
   - **Source → Branch**: `claude/amazing-thompson-w3f2o2` (운영 가지. 손님이 보는 쪽이라 개발 가지를 물리지 않는다)
   - 나머지(빌드·시작 명령, Watch Paths)는 `railway.json` 이 채운다. 화면에 다른 값이 적혀 있으면 비워 둔다
4. (선택) **Variables**: `SITE` = `kr`
5. 배포가 끝나면 **Settings → Networking → Generate Domain** → `…up.railway.app` 으로 먼저 열어 본다
6. **Custom Domain** 에 `www.careermatri.com` 을 넣고, Railway 가 보여 주는 **CNAME** 값을 도메인 업체에 `www` 레코드로 넣는다
7. `careermatri.com`(www 없는 주소)은 도메인 업체의 **포워딩**으로 `https://www.careermatri.com` 에 걸어 둔다. 업체가 CNAME 평탄화를 지원하면 Railway 에 둘째 Custom Domain 으로 넣어도 된다(그때는 이 사이트가 www 로 넘긴다)

## 주의

- **`app.careermatri.com` 의 DNS 레코드를 지우거나 바꾸지 않는다.** 학생들이 쓰는 앱이다
- DNS 반영은 몇 분에서 몇 시간 걸린다
