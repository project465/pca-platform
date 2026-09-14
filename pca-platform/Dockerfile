# 메트리 플랫폼 — 컨테이너 한 장.
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
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# 루트로 돌리지 않는다
RUN addgroup -g 1001 -S nodejs && adduser -S metri -u 1001
COPY --from=build --chown=metri:nodejs /app/.next/standalone ./
COPY --from=build --chown=metri:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=metri:nodejs /app/public ./public
# 스키마와 시드는 컨테이너 안에 둔다. 처음 띄울 때 psql 로 부어 쓴다
COPY --from=build --chown=metri:nodejs /app/db ./db
USER metri
EXPOSE 3000
# 살아 있는지 밖에서 물어볼 수 있어야 무인 운영이 된다
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
