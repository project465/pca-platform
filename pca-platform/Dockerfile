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

# **DB 를 세우는 두 스크립트만 한 덩이로 묶는다.**
#
# 운영 이미지에 개발 의존성을 통째로 넣지 않는다. 그런데 DB 를 세우려면
# TypeScript 로 적힌 둘(`make-admin` · `seed-instrument`)이 필요하다.
# 개발 의존성이 다 있는 이 층에서 미리 묶어 두면, 밖에서는 node 하나로
# 돈다. `pg` 는 이미 standalone 에 들어 있으니 묶지 않고 빌려 쓴다.
RUN npx esbuild scripts/make-admin.ts \
      --bundle --platform=node --format=cjs --target=node22 \
      --external:pg --outfile=ops-build/make-admin.cjs \
 && npx esbuild scripts/metri/seed-instrument.ts \
      --bundle --platform=node --format=cjs --target=node22 \
      --external:pg --outfile=ops-build/seed-instrument.cjs

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
# postgresql-client 와 bash 는 **DB 를 세울 때만** 쓴다. 앱은 쓰지 않는다.
# 넣어 두는 까닭: 이 이미지 밖에서 DB 를 세우려면 사람 PC 에 psql 과
# node 를 깔아야 하고, 그러면 복구할 때마다 그 PC 가 있어야 한다.
RUN apk add --no-cache chromium nss freetype harfbuzz font-noto-cjk ca-certificates su-exec \
      postgresql-client bash
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
# **DB 를 세우는 길.** 앱이 뜰 때 돌지 않는다 — 사람이 `npm run db:init` 을
# 쳐야만 돈다. 여기 적힌 package.json 은 standalone 이 넣어 둔 것을 덮는데,
# 그 안의 스크립트는 개발 의존성을 전제해서 이 이미지에서는 어차피 돌지
# 않는다. **시드와 시연 자료는 적지 않는다**: 적을 자리가 없으면 실수로도
# 안 돈다.
COPY --from=build --chown=metri:nodejs /app/ops-build ./ops
COPY --from=build --chown=metri:nodejs /app/data/metri/items_pca_me_v1.json ./data/metri/
COPY --chown=metri:nodejs deploy/ops/db-init.sh deploy/ops/db-upgrade.sh deploy/ops/db-verify.sh ./ops/
COPY --chown=metri:nodejs deploy/ops/package.json ./package.json
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
