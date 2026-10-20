# SC-1 기관 프로필 — 읽기 전용 · 미연결 (R36)

`src/lib/shared-core/tenant/` · 스키마 `cm-tenant-profile.1`.
**아무 데도 붙지 않았다**: 화면 · 인증 · 채점 · 결과 · PDF · DB 가 이 폴더를 들여오지 않고,
이 폴더는 `node:` 내장과 자기 파일만 들여온다(`tenant-boundary.test.ts` B1~B5 가 센다).

## 1. 책임 경계

| | Common Core SC-1 | 본체 `src/lib/tenant/` |
|---|---|---|
| 지금 | 이 폴더 | **어느 가지에도 없다**(ops · 배재 dev · `feature/jju-campus` · `4f02d79b` 전부 0 파일) |
| 하는 일 | 기관이 **누구인가**와 **무엇을 가리키는가**를 읽어 한 꼴로 돌려준다 | (본체가 정할 일) |
| 하지 않는 일 | 설정을 쓰지 않는다 · 캐시를 두지 않는다 · DB 에 붙지 않는다 · 학과·Catalog·갈래 고르는 규칙을 다시 하지 않는다(`campus/registry.ts` 의 일) · fixture 를 덧붙이지 않는다 | — |
| 원천 | 학교 등록부 `content/campus-universities.json`(읽기만) · 기관 파일 `content/tenants/<CODE>.json`(아직 0 벌) | — |

본체가 나중에 `src/lib/tenant/` 를 **설정 저장소**로 세운다면 SC-1 은 그 저장소를 읽는 쪽으로만
붙는다. 두 곳이 같은 기관의 설정을 따로 들면 반드시 갈리므로, **원천은 늘 파일(또는 그 저장소)
한 곳**이고 SC-1 은 그것을 해석하지 않고 꼴만 맞춘다. 같은 코드를 두 원천이 들면 `CODE_CONFLICT` 다.

## 2. 새 기관 ID 를 만들지 않는다

`code` 는 이미 있는 식별자 그대로다: `organizations.code` = `university_code` =
`v3_attempts.university_code`. 숫자 `organizations.id` 는 DB 마다 다르므로 담지 않는다.
테스트는 이미 있는 확인용 코드 `ZZTEST` 만 쓰고 임시 디렉터리에만 둔다.

## 3. 출력 꼴

```ts
type TenantProfile = {
  schema_version: "cm-tenant-profile.1";
  code: string;                 // /^[A-Z][A-Z0-9_]{1,31}$/
  name: string;                 // 앞뒤 공백을 걷는다
  kind: "university" | "public_agency" | "individual";
  country: string;              // ISO 3166-1 alpha-2
  market: string;               // content/markets.json
  majors:  { cores: string[];   // major-cores.json · 정렬 · 중복 없음
             catalogs: string[] };// 학교만 · 정렬
  content: { region_codes: string[]; // region-layer.json · **적힌 차례가 우선순위** · 중복 없음
             org_dataset: string | null };
  source:  { kind: "campus-registry" | "tenant-file"; file: string; sha256: string };
};
```

돌려주는 객체는 **깊게 얼어 있다**. 호출마다 새 객체이고, `canonicalProfileJson()` 은 열쇠를
정렬해 같은 프로필이면 같은 글자를 낸다.

## 4. 함수

| 함수 | 동작 |
|---|---|
| `loadTenantProfile(code, opts?)` | 하나. 없으면 `TENANT_NOT_FOUND` 를 던진다. 코드 꼴이 아니면 원천을 읽기 전에 `INVALID_CODE` |
| `findTenantProfile(code, opts?)` | 던지지 않는 쪽 `{ ok, profile } \| { ok:false, error }`. 프로필 오류만 결과로 바꾸고 그 밖은 그대로 던진다 |
| `listTenantProfiles(opts?)` | 전 원천을 코드순으로. **원천 하나가 깨지면 전체를 거절한다**(깨진 파일이 어느 코드를 드는지 모르면 충돌을 놓친다) |
| `canonicalProfileJson(p)` | 정규화 글자 |

`opts`: `contentDir`(기본 `process.env.CONTENT_DIR ?? "sites/pca-platform/content"`) ·
`tenantsDir`(기본 `<contentDir>/tenants`, 없으면 빈 목록) · `campusRegistryFile`.

## 5. 오류 열하나

`TENANT_NOT_FOUND` · `INVALID_CODE` · `INVALID_JSON` · `INVALID_SCHEMA` · `MISSING_FIELD` ·
`UNKNOWN_FIELD` · `UNSUPPORTED_SCHEMA_VERSION` · `CODE_MISMATCH`(파일 이름 ≠ code) ·
`CODE_CONFLICT`(두 원천 · 등록부 안 중복) · `UNKNOWN_REFERENCE`(Core · 권역 · 시장) ·
`SOURCE_UNREADABLE`. 메시지는 `[CODE] …` 로 시작하고 `detail` 에 파일·칸만 담는다(개인정보 없음).

**모르는 칸을 받지 않는다**: `region_code` 처럼 한 글자 틀린 칸이 조용히 버려지면 그 기관은
권역 없이 선다. **짐작하지 않는다**: 학교 등록부에는 country 칸이 없어서 시장 코드가 두 글자
나라 꼴일 때만 그 값을 쓰고 `GLOBAL` 이면 거절한다.

## 6. 학교 등록부에서 읽는 값

`university_code → code` · `university_name → name` · `kind = university` ·
`market_code → market`(= country) · 모든 Catalog 의 학과·전공(`units` · `majors` 끝까지)의
`core_code` 합집합 → `majors.cores` · `catalog_code` → `majors.catalogs` ·
`region_hint → region_codes`(없으면 `[]`) · `org_dataset = null`.
PCU 는 Core 19 · Catalog 2(`PCU_2027` · `PCU_CUR`) · `KR-CHUNGCHEONG`.

## 7. 검사

```bash
node --no-warnings --experimental-strip-types --import ./scripts/shared-core/test/register.mjs \
  --test scripts/shared-core/tenant-profile.test.ts scripts/shared-core/tenant-boundary.test.ts
bash scripts/shared-core/test/typecheck.sh   # 부분 타입 검사 (shared-core 와 그 테스트만)
```

- `tenant-profile.test.ts` 27 가지 (T01~T26 · T99 · R37 에서 T21~T26 을 더했다). T99 가 운영 콘텐츠 디렉터리와 PCU 등록부의
  지문이 시작할 때와 같은지 끝에서 센다.
- `tenant-boundary.test.ts` 6 가지 (B0~B5).
- 일부러 깨 본 것: 모르는 칸 검사 끄기 → T10 · 충돌 검사 끄기 → T13 · 얼리기 끄기 → T03 ·
  파일 이름 검사 끄기 → T12 · DB·쓰기·환경변수를 shared-core 에 넣기 → B1/B3/B4/B5 ·
  밖에서 shared-core 들여오기(부수효과 import · 동적 import) → B2. 전부 걸렸고 되돌렸다.
  (처음에는 `import "…"` 꼴을 B2 가 못 봤다 — 정규식을 넓혔다.)

## 8. R37 계약 검증 (원천 충돌 · ID · 판본 · 참조 경계)

33 / 33 통과(`docs/shared-core/evidence/R37/sc1-run.log`) · 부분 타입 검사 TSC_EXIT=0(13 파일 ·
`typecheck.log` · **프로젝트 전체 typecheck 가 아니다**).

| 시험 | 묻는 것 | 결과 |
|---|---|---|
| T21 | 파일을 만든 차례 · 객체 키 차례가 결과를 바꾸는가 | 안 바꾼다 |
| T22 | 국가와 시장이 다른 칸인가 (KR 기관 · GLOBAL 시장) | 받는다 |
| T23 | 등록부 · fixture 의 학교 코드가 그대로 기관 코드인가 (새 ID 를 만들지 않는다) | 같다 |
| T24 | 같은 코드를 두 원천이 들면 — **내용이 같아도** | `CODE_CONFLICT`. 우선순위 규칙을 두지 않는다 |
| T25 | 칸 이름이 바뀐 등록부 | 판본을 올리면 `UNSUPPORTED_SCHEMA_VERSION`. **판본을 그대로 두면 Core 0 개 프로필이 오류 없이 선다** — 막을 수 없는 자리로 적어 둔다 |
| T26 | 학교 코드 꼴이 아닌 줄 | `INVALID_CODE` |

R37 에서 고친 것 하나: `campus.ts` 가 **읽는 법을 아는 판본**(`KNOWN_CAMPUS_SCHEMAS =
["cm-campus-universities.5"]`)만 받는다. 판본 칸이 없는 파일(fixture 꼴)은 받는다. 분류
SHARED CORE INTERNAL · 운영 등록부를 읽는 자리는 아직 아무 데도 연결되지 않았다(B2).

## 9. 다음 (이번 회차 밖)

SC-2 적용 뒤 학교 로그인 쪽이 기관 코드를 넘길 때 `loadTenantProfile` 로 그 코드가 등록된
기관인지를 묻는 것이 첫 연결 후보다. 연결은 계약(CC-001) 승인 뒤 하고, 그때 B2 를 그 한 파일만
허용하도록 좁힌다.
