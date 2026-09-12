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
# 이 프로젝트에는 public/ 이 없다. 마지막 단계의 COPY 가 실패하지 않게 빈 폴더를 둔다
RUN mkdir -p /app/public
# 알림 발송기를 한 파일로 묶는다. standalone 에는 서버 번들만 들어 있어
# scripts/ 가 부르는 src/lib/* 이 없고, tsx 를 넣자니 제 의존성까지 딸려온다.
# 묶어두면 실행 이미지에는 js 한 장만 있으면 된다
RUN npx esbuild scripts/notify.ts --bundle --platform=node --format=esm \
      --outfile=/app/dist/notify.mjs --packages=external --alias:@=./src

# ── 3. 실행 ──────────────────────────────────────────────────
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# 루트로 돌리지 않는다
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S next -G nodejs

# public/ 은 없을 수도 있다. COPY 는 원본이 없으면 빌드를 통째로 실패시키므로
# 빌드 단계에서 미리 만들어 둔다 (아래 build 단계의 mkdir 참고)
COPY --from=build /app/public ./public
COPY --from=build --chown=next:nodejs /app/.next/standalone ./
COPY --from=build --chown=next:nodejs /app/.next/static ./.next/static
# 스키마(처음 한 번 넣는다)와 묶어둔 발송기
COPY --from=build /app/db ./db
COPY --from=build --chown=next:nodejs /app/dist ./dist

USER next
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
