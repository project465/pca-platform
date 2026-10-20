# 기존 Staging 에 닿지 못함 — 원인과 최소 조치 (한 장)

**대상**: `https://charming-reverence-staging.up.railway.app/me` (사용자 지시: 이 주소를 먼저)
**결과**: 이 세션에서 열리지 않음 · 학생 · 담당자 브라우저 화면 **0장**

## 원인 (정확히)

이 클라우드 세션의 송신 프록시가 그 호스트로 가는 HTTPS 터널을 거절한다.

```
CONNECT charming-reverence-staging.up.railway.app:443  →  403
relay: kind=connect_rejected  "gateway answered 403 to CONNECT (policy denial or upstream failure)"
curl: (56) CONNECT tunnel failed, response 403   · HTTP 000
시각: 2026-10-20T12:24:02Z · 12:46:05Z · 12:55Z (세 번 같음)
```

같은 정책으로 `railway.app` · `backboard.railway.app`(Railway 화면 · API) · `app.careermatri.com`(운영) · `registry.npmjs.org`(빌드
의존성)도 403 이다. Staging 서버가 죽었다는 뜻이 아니다. 원본 기록: `logs/staging-reach.log`.

그래서 **배포 가지 · 커밋 SHA · 실행 상태 · DB 분리 여부 넷 다 확인하지 못했다.** (`/api/health` 는 열려도 판본을 내놓지 않는다.)

## 하지 않은 것

403 우회 재시도 · 프록시 설정 변경 · 다른 경로 접속 · 운영 접속 · **새 Railway 서비스 생성 · 배포**. 최신 코드가 Staging 에 없더라도
본체 총괄 PM 승인 없이 배포하지 않는다 → 변경 요청 R5-3.

## 최소 조치 (셋 가운데 하나)

| | 누가 | 어디서 | 하면 |
|---|---|---|---|
| A | 사업주 | claude.ai 환경 설정 → **Network access → Allowed domains** 에 `charming-reverence-staging.up.railway.app` 한 줄 | 이 세션에서 바로 1440 · 390 · 360 캡처 |
| B | PM | CI `pcu-verify` R5 판 승인(`ci/pcu-verify.yml.draft`) + 저장소 비밀값(`STAGING_BASIC_AUTH` · 시험 학생 · 담당자 계정 · `PCU_ARTIFACT_KEY`) | GitHub 러너가 읽기만 하며 같은 화면을 찍어 잠가 올린다 |
| C | 사업주 · PM | Railway → staging 환경 → 서비스 → **Deployments 맨 위 줄** | 배포 가지 · SHA · 상태 · Postgres 가 운영과 다른 서비스인지 알려 주시면 `04_RELEASE_GATE.md` §1 을 채운다 |
