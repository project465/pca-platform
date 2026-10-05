# 커리어메트리 플랫폼 — 컨테이너 한 장.
#
# 도메인이 정해지는 날 며칠이 아니라 몇 분이어야 한다. 그래서 빌드에
# 필요한 것과 돌리는 데 필요한 것을 나눠 담는다.
#
#   docker build -t metri .
#   docker run -p 3000:3000 --env-file .env.production metri

FROM node:22-alpine AS build
WORKDIR /app
# 잠금파일만 먼저 넣는다 — 소스가 바뀌어도 의존성 층은 다시 받지 않는다
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts || npm install --ignore-scripts
COPY . .
# 빌드 때는 DB 에 붙지 않는다. 붙어야 하는 화면은 전부 동적 렌더다
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
# HOSTNAME 을 못 박는다. 도커는 이 값을 컨테이너 ID 로 채워 두는데,
# standalone 서버는 그것을 바인딩 주소로 읽어 밖에서 붙을 수 없게 된다.
# **PORT 를 못 박지 않는다.** 관리형 플랫폼은 띄울 때 제 값을 넣어 주고,
# 그 값으로 듣지 않으면 밖에서 아무도 못 붙는다. 여기 적는 것은 아무도
# 안 넣어 줬을 때의 값이다.
#
# HOSTNAME 은 못 박는다. 도커가 이 값을 컨테이너 ID 로 채워 두는데,
# standalone 서버는 그것을 바인딩 주소로 읽어 밖에서 붙을 수 없게 된다.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# 결과지 PDF 를 이 컨테이너가 찍는다. 그래서 셋이 필요하다.
#
#   chromium        결과지를 그리는 브라우저. **플레이라이트가 받아 오는
#                   것은 알파인에서 돌지 않는다**: musl 이라 링크가 안 맞는다.
#                   패키지로 깔린 것을 `CHROMIUM_PATH` 로 가리킨다
#   font-noto-cjk   한글. 없으면 결과지가 네모로 찍힌다
#   fonts-ko.conf   WenQuanYi 같은 중국어 글꼴이 같이 깔렸을 때 fontconfig
#                   가 `lang=ko` 에도 그쪽을 먼저 고르는 것을 막는다
RUN apk add --no-cache chromium nss freetype harfbuzz font-noto-cjk ca-certificates su-exec
ENV CHROMIUM_PATH=/usr/bin/chromium-browser \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    REPORT_PDF_DIR=/app/var/reports

# 루트로 돌리지 않는다
RUN addgroup -g 1001 -S nodejs && adduser -S metri -u 1001
COPY --from=build --chown=metri:nodejs /app/.next/standalone ./
COPY --from=build --chown=metri:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=metri:nodejs /app/public ./public
# 스키마와 시드는 컨테이너 안에 둔다. 처음 띄울 때 psql 로 부어 쓴다
COPY --from=build --chown=metri:nodejs /app/db ./db
# **결과지 엔진을 같이 담는다.** 플랫폼이 `/pca/*` 로 이 파일들을 내주고
# 결과지와 PDF 를 만들 때 불러 쓴다. 빠지면 결과지가 404 로 멈춘다
COPY --from=build --chown=metri:nodejs /app/sites/pca-platform ./sites/pca-platform
COPY --chown=metri:nodejs deploy/fonts-ko.conf /etc/fonts/conf.d/60-careermatri-ko.conf
# 찍은 PDF 를 두는 자리. 웹에서 직접 열리지 않고, 내려받는 길에서 본인인지 본다
RUN mkdir -p /app/var/reports && chown -R metri:nodejs /app/var
COPY --chown=metri:nodejs deploy/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# **root 로 들어와서 권한을 내려놓는다.** 붙여 준 디스크의 주인을 고치는
# 일은 root 만 할 수 있고, 그 한 줄 때문에 앱까지 root 로 돌릴 이유는 없다
EXPOSE 3000
# 살아 있는지 밖에서 물어볼 수 있어야 무인 운영이 된다. **포트를 못
# 박지 않는다**: 밖에서 넣어 준 값으로 듣고 있는데 3000 을 두드리면
# 멀쩡한 컨테이너가 죽은 것으로 보인다
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
