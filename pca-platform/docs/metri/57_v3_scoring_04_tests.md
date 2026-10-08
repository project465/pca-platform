# 검사와 되짚기

## 1. 사람 열두 벌

fixture 는 `sites/pca-platform/assessment/ME_V3/personas.json` 이고 **기대하는 묶음과 까닭을
자료보다 먼저 적어 두었다.** 규칙을 고치면 여기서 먼저 깨진다.

| 사람 | 등급 | 근거가 선 영역 | 덜 선 영역 |
|---|---|---|---|
| P01 경험 없는 학부생 | BASIC | 없음 | 없음 (부족 둘) |
| P02 관심만 높은 학부생 | BASIC | 없음 | 없음 (부족 둘) |
| P03 설계 캡스톤 학생 | STANDARD | TD01 | TD08 |
| P04 구조해석 석사 | STANDARD | TD02 | TD01 · TD07 |
| P05 열유체 석사 | STANDARD | TD03 | TD02 · TD07 |
| P06 제어 프로젝트 학생 | STANDARD | TD05 | TD01 · TD12 |
| P07 생산기술 경험자 | STANDARD | TD08 | TD09 · TD10 |
| P08 설비 경험자 | STANDARD | TD09 | TD08 |
| P09 재료·파손 박사 | PRO | TD06 · TD07 | 없음 (TD10 은 관심 낮음) |
| P10 연구성과는 많고 직접 판단이 적은 박사 | PRO | 없음 | TD02 · TD03 |
| P11 판단은 많고 산출물이 없는 포닥 | PRO | 없음 | TD02 · TD03 · TD04 |
| P12 판단·산출물·검증이 모두 강한 포닥 | PRO | TD02 · TD04 · TD07 | 없음 |

**P11 과 P12 가 이 묶음의 요지다.** P11 은 확인된 축이 여섯이고 P12 는
여덟인데, 갈리는 자리는 개수가 아니라 산출물이다. 그리고 P02 는 관심만
높아 **근거 부족**이고 P11 은 경험이 많아 **근거 미완성**이다. 같은 칸에
넣으면 둘 다 틀린 다음 걸음을 밟는다.

**`golden` 은 Core 판정의 지문이다.** 규칙을 일부러 바꿀 때만
`GOLDEN=update` 로 다시 적는다. 그렇지 않은 변화는 검사에서 걸린다.

## 2. 변형 검사 일곱

같은 응답에서 조건 하나만 바꾼다.

| 검사 | 바꾸는 것 | 기대 |
|---|---|---|
| A | 학위 넷 | Core 판정의 지문이 같다 |
| B | 전공계열 넷 | 같다 |
| C | 산업팩 셋과 없음 | 같다 |
| D | 역할팩 셋과 없음 | 같다 |
| E | 관심만 올림 | **축 상태가 그대로다.** 묶음은 옮겨도 된다 |
| F | 산출물 근거만 더함 | 조건을 채우면 덜 선 영역이 **근거가 선 영역이 된다** |
| G | 검증만 더함 | 그 축만 바뀌고 나머지 일곱은 글자까지 같다 |

## 3. 그 밖에 센 것

| 센 것 | 어떻게 |
|---|---|
| 문항 은행 1차 동결 | 여덟 파일의 지문을 `bank-lock.json` 과 대조 |
| 같은 응답이면 같은 판단 | 두 번 돌려 대조 · 응답을 넣은 순서를 거꾸로 해 대조 |
| 종합 적합도 숫자를 만들지 않는다 | 스냅샷에서 `total`·`fit`·`overall`·`composite` 를 찾는다 |
| 소유는 응답만으로 서지 않는다 | 근거가 하나면 확인까지 내려간다 |
| 받아 쓴 응답은 확인이 아니다 | 여덟 축을 전부 `받아 썼다` 로 답하면 확인 0 · 근거 부족 |
| ME_V2 를 읽지 않는다 | 엔진 파일에서 금지 낱말 일곱 갈래를 찾는다 |
| 무작위와 시각을 읽지 않는다 | `Math.random` · `Date.now` · `new Date` |
| 엔진에 한국어가 없다 | 주석과 예외 문면을 걷어 내고 남은 문자열을 센다 |
| 판본 여섯 칸 | 스냅샷에 적혔는지 |

## 4. 되짚기 예시 셋

### 4-1. 근거가 선 영역 (P12 · TD02)

```
TD02 zone=Z1_EVIDENCE_ESTABLISHED
confirmed=J1+J2+J3+J4+J5+J6+J7+J8
owned=J1+J3+J4+J5+J6
required=J3+J6 ok=true
output(J5)=OWNED evidence=true
verify(J6)=OWNED
J3:OWNED (ownership=DECIDED_USED & evidence=2>=2, evidence=2)
reasons=-
문항: TD02_J3=DECIDED_USED TD02_J5=DECIDED_USED TD02_J6=DECIDED_USED …
```

### 4-2. 산출물이 비어 떨어진 영역 (P11 · TD02)

```
TD02 zone=Z2_EVIDENCE_INCOMPLETE
confirmed=J1+J2+J3+J4+J6+J7
owned=J1+J3+J4+J6
required=J3+J6 ok=true
output(J5)=PARTICIPATED evidence=false
J5:PARTICIPATED (ownership=RECEIVED, evidence=0)
reasons=MISSING_OUTPUT
```

확인된 축이 여섯이고 필수 축도 둘 다 섰는데 산출물이 `받아 썼다` 다.
**남은 것이 없는 사람에게 지원서에 쓸 근거가 섰다고 적지 않는다.**

### 4-3. 판단할 근거가 부족한 영역 (P02 · TD01)

```
TD01 zone=Z4_INSUFFICIENT_EVIDENCE
confirmed=-
required=J3+J5 ok=false
interest=HIGH learning=HIGH
J3:NOT_OBSERVED (ownership=NONE, evidence=0)
reasons=TIER_WITHOUT_DEEP_AXES,NO_CONFIRMED_AXIS
next=TRY_SHORT_EXPERIENCE,STUDY_NEXT
```

관심은 높고 겪은 적이 없다. 그래서 첫 쪽에는 올라가지만(`focus`) 묶음은
`근거 부족` 이고 다음 걸음은 공부가 아닌 **짧게 겪어 보기**다.

```bash
TRACE=P11:TD02 npm run v3:scoring
```
