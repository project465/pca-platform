# 영어판 1차: 이공계 3개 전공 (기계 · 전기전자 · 컴퓨터)

2026-10-24 사업주 결정: "영어판부터 이공계 3개 전공으로 시작해".
대상 Core: `ME_CORE_V3` · `EE_CORE_V1` · `CS_CORE_V1`. 시장 `GLOBAL`(locale_default `en`) 은
`markets.json` 에 이미 있고 STEM 만 연다.

## 원칙

1. **채점은 한 벌이다.** 영어판은 화면에 서는 글자만 바꾼다. 문항 id · 축 · 영역 · 보기 개수와
   차례 · 판정 규칙은 한국어판과 같고, 엔진은 언어를 모른다. 같은 응답이면 언어와 무관하게
   판정 지문(golden)이 같아야 한다.
2. **언어는 응시가 들고 다닌다.** `v3_attempts.locale`(`ko` | `en`). 응시를 시작할 때 정하고 바꾸지
   않는다. 한 응시 안에서 화면·결과·PDF 가 같은 언어다. 시장이 `GLOBAL` 이면 기본 `en`,
   `KR` 이면 `ko`. 고른 근거 항목(`v3_evidence_picks.item_text`)은 그 응시 언어의 글자로 저장된다.
3. **한국어 원본은 손대지 않는다.** 영어 콘텐츠는 `sites/pca-platform/content/en/` 에 **원본과
   같은 파일 이름 · 같은 구조**로 둔다. 사람이 읽는 글자 칸만 영어이고 나머지 칸(id · 코드 ·
   숫자 · 축 · 순서 · 배열 길이)은 원본과 글자까지 같다. 원본 은행 잠금(bank-lock)은 그대로다.
4. **모르는 칸을 한국어로 흘리지 않는다.** 영어 파일에 빠진 칸이 있으면 화면이 한국어로
   떨어지는 대신 검사(`v3:i18n`)가 걸린다. 영어 응시 화면·결과에 한글이 한 글자라도 서면 실패다.
5. **번역은 검수 전이다.** 원어민·현직자 검수 전에는 "검증된 영어판" 으로 팔지 않는다.
   검수표는 `v3:i18n` 이 만든다.

## 파일 계약 (`content/en/`)

Core 마다 번역하는 파일(등록부 `major-cores.json` 의 `files` · `packs` 가 가리키는 이름 그대로):

| 원본 | 영어로 바꾸는 칸 |
|---|---|
| `*-items.json` | `wording` · `stage_wording.*` · `grid_row` · `grid_stem` · `options[]` · 은행 머리의 `level_options` · `option_guidance` · 그 밖에 화면에 서는 글자 칸 |
| `*-checklists.json` | 각 항목의 `text` (배열 길이·차례 그대로) |
| `*-domains.json` | 영역 `name` · `artifacts[]` · `verify_targets[]` · 축 정의 `l2` · `l3` 등 글자 칸 |
| `*-taxonomy.json` | 영역·역할·조직 이름, `differs`, 세부 영역 이름 등 글자 칸 |
| 산업팩 · 역할팩 | `name_ko` 자리의 이름(키는 그대로 두고 값만 영어), `demands[]` · `scene` · `items[].gloss` · `owns` · `ask` 등 글자 칸 |

번역하지 않는 파일: `items_blueprint` · `migration` · `constructs` · `relations` · 잠금 파일(사람에게
보이지 않는다).

공용 칸(용어 풀이 · 학생 장면 · 전공 이름 · 예시 장면)은 `content/en/shared-<CORE>.json`:

```json
{ "core": "ME_CORE_V3", "core_name": "Mechanical Engineering",
  "examples": { "scene": [], "artifacts": [], "evidence": [] },
  "terms": { "<한국어 용어>": { "term": "...", "gloss": "..." } },
  "scenes": { ... me-v3-student-scenes.json 의 그 core 항목과 같은 모양 ... } }
```

## 코드 계약

- `coreFile(code, kind, dir, lang = "ko")` · `packs(code, kind, dir, lang)` 가 `lang !== "ko"` 이면
  `content/<lang>/<같은 이름>` 을 읽는다. 없으면 던진다(한국어로 대신하지 않는다).
- `content(core, lang)` 캐시 키는 `core|lang`.
- 화면 문구(`blocks.ts` · `screen.tsx` · `tier-text.ts` · start/intro/done)는 언어별 사전으로 빼고
  (`*.ko.ts` / `*.en.ts`), 결과 문장은 `result/text.ko.ts` 와 같은 내보내기를 가진
  `result/text.en.ts` 를 둔다. 고르는 자리는 하나(`textFor(lang)`).
- 70쪽 PDF(`report-long/`)는 2단계다. 1단계 동안 영어 응시의 PRO PDF 는 웹 결과 종이판으로
  내고 그 사실을 적는다.

## 검사

- `npm run v3:i18n` — 세 Core 의 영어 파일이 원본과 구조가 같은가(id · 길이 · 비글자 칸),
  글자 칸에 한글이 없는가, 빠진 칸이 없는가, 영어 응시 화면 문구 사전에 빠진 키가 없는가.
- 영어 응시로 `v3:runtime` · `v3:scoring` 골든이 한국어와 같은 판정을 내는가.
- 실제 브라우저로 영어 응시 한 바퀴(로그인 → 검사 → 결과 → PDF)에서 한글 0자.
