# ME_V2 92문항 영어판 — 감사

Phase 2.1 의 1~2번이다. **문항을 지어내지 않는다**(설계 원칙 4)가 이
문서의 전제다.

## 1. 어디에 들어 있는가

```
assessment/ME_V2/items-*.json      문항 92개      'ko-KR' + 'en-US'
assessment/ME_V2/stage-variants.json  학위별 변주   네 단계 × 두 언어
assessment/ME_V2/response-scales.json 척도 보기     'points' + 'points-en'
assessment/ME_V2/family-names.json    직무군 열여섯 'names' + 'names-en'
```

**사전을 거치지 않는다.** 문항은 규격이 준 그대로이고, 사전에 넣으면
문체 규칙(`copy:audit`)이 문항을 다듬게 된다. 그 순간 문항이 바뀐다.
그래서 문항 은행 자체가 두 언어를 들고 있고 `PCAI18N.itemText()` ·
`optionText()` · `scalePoints()` 가 그 짝을 읽는다.

생성물은 `npm run v2:build` 가 `data/me-v2.js` 로 묶는다. 고칠 곳은
JSON 쪽이다.

## 2. 숫자

| | 개수 | 빠진 것 |
|---|---:|---:|
| 문항 본문 | 92 | 0 |
| 학위별 변주 | 12문항 × 4단계 | 0 |
| 척도 보기 | 전부 | 0 |
| 직무군 이름 | 16 | 0 |

`missingTranslations('en')` · `missingScaleTranslations('en')` ·
`missingFamilyTranslations('en')` 이 셋을 센다. `global:check` 가 매번
0 인지 확인한다.

## 3. 고르기형 문항에서 **값과 글자를 가른다**

```js
'<button data-v="' + esc(o) + '">' + esc(T_option) + '</button>'
//          ↑ 한국어 그대로            ↑ 그 언어로
```

값까지 갈리면 같은 응답이 언어마다 다른 답으로 저장되고, 그러면 영어로
푼 사람과 한국어로 푼 사람을 **같은 자로 못 잰다.** 채점은 값을 읽으므로
한 자 위에 선다.

## 4. 날 번호를 내보내지 않는다

`choicesOf()` 가 한동안 고르기형 문항에 `1 2 3 4` 를 그렸다. 보기 목록이
문자열 배열일 때 값과 이름을 같이 못 꺼내서 번호로 떨어졌다. 규격 §6 이
금지한 자리다.

```js
const val = typeof o === "string" ? String(i + 1) : String(o.value ?? i + 1);
return { value: val, label: (en?.[i] ?? ko) || val };
```

## 5. 학위 단계는 묻는 장면만 바꾼다

Q77~Q88 은 단계마다 문장이 갈리지만 **같은 답이면 석사와 박사의 소유
점수가 같다**(`v2:check` T3). 영어판도 같은 규칙으로 네 단계를 모두
들고 있다.

## 6. 검사

```bash
npm run v2:check      # 골든 여덟 + 문항 수 · 합산 없음 · 옛 판 보존
npm run v2:flow       # 실제 브라우저로 끝까지 응시 (V1 회귀까지)
npm run intake:i18n   # 응시 화면의 두 언어 (+ 한국어 회귀 해시)
npm run global:check  # 문항 은행 두 언어 · 영어 결과지 · 영어 PDF
```

## 7. 아직 아닌 것

**인지 면접과 파일럿 200명을 돌리지 않았다.** 영어 문항이 한국어 문항과
같은 것을 재는지(측정 동등성)는 확인되지 않았다. 번역이 있다는 것과
같은 것을 잰다는 것은 다른 말이다.

그래서 **"과학적으로 검증된 영어판" 이라고 팔지 않는다.** 규준이 생기기
전까지 "상위 몇 %" 를 쓰지 않는 것과 같은 규칙이다.
