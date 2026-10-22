# 홈페이지를 Railway 에 올리기 (careermatri.com)

앱(`app.careermatri.com`)이 있는 Railway 프로젝트에 **서비스 하나를 더한다.** 앱 서비스는 건드리지 않는다.

## 미리 해 둔 것 (2026-10-22)

- `marketing/railway.json` — 빌드·시작 명령, 상태 확인(`/`), 실패 시 다시 띄우기, `marketing/` 이 바뀔 때만 다시 올리기
- `package.json` 의 `engines.node` — Node 20.9 이상 22 이하
- `www.careermatri.com` 으로 들어오면 `careermatri.com` 으로 308 (`src/middleware.ts`)
- 빈 폴더에 `marketing/` 만 꺼내 `npm ci → npm run build → PORT=4321 npm run start` 를 돌려 네 언어·앱 링크·www 넘김·CSS 가 전부 서는 것을 확인했다. `SITE` 를 넣지 않아도 한국어판이 기본이다

## 누를 차례

1. Railway → 앱이 있는 프로젝트 → **production** 환경
2. **+ Create → GitHub Repo → `project465/pca-platform`**
3. 새 서비스 → **Settings**
   - **Source → Root Directory**: `/marketing`
   - **Source → Branch**: `claude/lucid-ptolemy-9my676`
   - 나머지(빌드·시작 명령, Watch Paths)는 `railway.json` 이 채운다. 화면에 다른 값이 적혀 있으면 비워 둔다
4. (선택) **Variables**: `SITE` = `kr`
5. 배포가 끝나면 **Settings → Networking → Generate Domain** → `…up.railway.app` 으로 먼저 열어 본다
6. **Custom Domain** 에 `careermatri.com` 과 `www.careermatri.com` 을 넣고, Railway 가 보여 주는 DNS 값을 도메인 업체에 넣는다

## 주의

- **`app.careermatri.com` 의 DNS 레코드를 지우거나 바꾸지 않는다.** 학생들이 쓰는 앱이다
- `careermatri.com`(www 없는 주소)에 CNAME 을 받지 않는 업체가 있다(가비아 등). 그때는
  - `www.careermatri.com` 만 Railway 에 연결하고 업체의 포워딩으로 `careermatri.com → www` 를 건다
    (이 경우 위의 www→정규 주소 넘김과 맞물려 돌지 않게 `src/lib/domains.ts` 의 `HOME_DOMAIN` 을
    `www.careermatri.com` 으로 바꿔야 한다), 또는
  - DNS 관리만 Cloudflare(무료)로 옮겨 CNAME 평탄화를 쓴다
- DNS 반영은 몇 분에서 몇 시간 걸린다
