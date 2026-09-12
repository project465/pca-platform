# 현멘 운영 이미지.
#
# 세 단계로 나눈 이유는 마지막 이미지에 소스와 빌드 도구를 남기지 않기 위해서다.
# next.config.ts 의 output: "standalone" 이 있어야 마지막 단계가 성립한다.

# ── 1. 의존성 ────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── 2. 빌드 ──────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 빌드 때 DB 에 붙지 않는다. 모든 페이지가 force-dynamic 이라 그럴 필요가 없다
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_ 로 시작하는 값은 빌드 시점에 번들에 박힌다. 나머지는 실행할 때 읽는다
ARG NEXT_PUBLIC_TOSS_CLIENT_KEY=""
ENV NEXT_PUBLIC_TOSS_CLIENT_KEY=$NEXT_PUBLIC_TOSS_CLIENT_KEY
RUN npm run build

# ── 3. 실행 ──────────────────────────────────────────────────
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# 루트로 돌리지 않는다
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S next -G nodejs

COPY --from=build /app/public ./public
COPY --from=build --chown=next:nodejs /app/.next/standalone ./
COPY --from=build --chown=next:nodejs /app/.next/static ./.next/static
# 스키마와 시드·알림 발송기는 운영에서도 쓴다
COPY --from=build /app/db ./db
COPY --from=build /app/scripts ./scripts

USER next
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
