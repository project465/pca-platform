# 오프라인 검증 실행기

**제품 코드가 아니다.** npm registry 에 닿지 못하는 세션에서 서버 함수를 실제 PostgreSQL 에
대고 돌리려고 만든 대역 한 벌이다. 이미지에 들어가지 않고(`Dockerfile` 은 `scripts/lab` 를
옮기지 않는다) 운영 DB 에 붙지 않는다.

| 대역 | 하는 일 | 하지 않는 일 |
|---|---|---|
| `shims/pg.mjs` | PostgreSQL v3 프로토콜(trust 인증) · Pool/Client · 형 변환(int8→문자열, json, 날짜, 배열) | SCRAM·TLS |
| `shims/bcryptjs.mjs` | scrypt 로 만든 **이 대역끼리만 맞는** 해시 | 진짜 bcrypt 해시 검증 |
| `shims/next-*.mjs` | `redirect` · `cookies` 를 요청 없는 자리에서 던지거나 비운다 | 화면 |
| `shims/nodemailer.mjs` | 메일을 보내지 않는다 | 발송 |

npm 이 열린 환경에서는 쓰지 않는다: 같은 스크립트를 `npx tsx` 로 돌린다.
