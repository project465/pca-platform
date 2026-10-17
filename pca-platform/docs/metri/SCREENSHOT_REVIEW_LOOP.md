# 학생 화면 SCREENSHOT REVIEW LOOP

학생용 제품을 대형 일괄 수정으로 끝내지 않는다. 한 회차에 화면을 제출하고,
사람이 읽어 PASS 또는 FAIL 을 적고, **FAIL 이 적힌 화면만** 고쳐 같은 화면을
다시 제출한다.

```
① 실제 화면 screenshot 제출 → ② Human Review → ③ FAIL 화면만 수정
→ ④ 같은 화면 다시 제출 → ⑤ PASS 화면은 다시 수정하지 않음
→ ⑥ 모든 Student Product Gate 가 PASS 되면 학생 화면 작업 종료
```

자동 테스트는 보조 수단이다. 자동 검사가 전부 통과한 것으로 Gate 를 PASS 로
적지 않는다.

**매 회차 전부 제출하지 않는다.** 이 문서의 r1 은 이 Loop 에서 Human Review 가
한 번도 돌지 않은 기준선이라 여덟 Gate 를 모두 담는다. r2 부터는 그 회차에
고친 Gate 의 화면만 올린다.

---

## 상태 표현

`PASS` · `FAIL` · `UNVERIFIED` 셋만 쓴다. `거의 마지막` 과 `Final` 과
`Ready 에 가까움` 은 쓰지 않는다.

- **PASS**: 사람이 그 화면을 읽고 PASS 로 적었다
- **FAIL**: 사람이 그 화면을 읽고 FAIL 로 적었다
- **UNVERIFIED**: 이 Loop 에서 아직 읽지 않았다

앞 회차의 Gate 검수(`PCU_GATE_REVIEW.md`)는 이 Loop 가 아니고, 그 판정을
여기로 옮겨 적지 않는다.

---

## Gate 여덟과 r1 판정

| Gate | 보는 것 | r1 판정 |
|---|---|---|
| 1 Assessment Desktop | 검사 화면이 설문표가 아니고 묻는 화면으로 읽히는가 | UNVERIFIED |
| 2 Assessment Mobile | 360 · 390 · 430 에서 답할 수 있는가 | UNVERIFIED |
| 3 Result Summary | 첫 화면이 상태와 다음 행동에 답하는가 | UNVERIFIED |
| 4 Evidence | 고른 항목이 지원서로 가는 한 줄기로 읽히는가 | UNVERIFIED |
| 5 Action | 무엇을 하고 무엇이 남는지 적혀 있는가 | UNVERIFIED |
| 6 "/me" | 결과를 받은 뒤 다시 들어올 자리로 읽히는가 | UNVERIFIED |
| 7 PDF | 학교가 보관하고 전달할 종이로 읽히는가 | UNVERIFIED |
| 8 Cross-Core | 전공명만 바뀐 같은 제품 문장으로 보이지 않는가 | UNVERIFIED |

---

## Human Review 기준

**문구**

- 사람이 쓴 문장으로 읽히는가
- 진로상담자가 학생 앞에서 그대로 말해도 자연스러운가
- 전공명만 바꾼 템플릿으로 보이지 않는가
- 시스템 용어가 앞에 나오지 않는가

**UI**

- 첫 시선에 무엇을 보는 화면인지 알 수 있는가
- 글이 너무 많지 않은가
- 설문지나 AI dashboard 로 보이지 않는가
- `/me` 와 같은 제품군으로 보이는가
- 손전화에서 쓸 수 있는가

**상품성**

- 학교 담당자에게 보여줄 수 있는가
- 돈을 받는 리포트로 느껴지는가

---

## 수정 규칙

FAIL 화면만 고친다. PASS 화면은 regression 이 없는 한 건드리지 않는다.

**같은 문제가 다시 나오면** 고치기 전에 넷을 먼저 적는다.

1. 이전에 무엇을 고쳤는지
2. 왜 다시 문제가 생겼는지
3. 공통 원인이 무엇인지
4. 재발 방지 검사를 어떻게 추가할지

**AI 문구 수정 원칙.** 단어만 치환하지 않는다. `근거가 선 영역` 을
`근거가 있는 영역` 으로 바꾸는 식은 같은 문장을 그대로 남긴다. 문맥 전체를
학생이 읽고 쓸 수 있는 자연어로 다시 쓴다.

**UI 수정 원칙.** 화면이 약하다고 카드와 그래프와 설명을 더하는 것부터 하지
않는다. 무엇을 빼야 하는지와 무엇을 크게 보여야 하는지와 어떤 정보가 뒤로
가야 하는지를 먼저 정한다.

---

## 건드리지 않는 것

측정은 `ME_V3_MEASUREMENT_FREEZE_1` 에 머문다. scoring · threshold ·
item id · item count · construct · Domain · Core architecture ·
Result decision · Evidence decision · Gap decision · registry ·
DB schema · `student_open` · `open_to_students` 를 고치지 않는다.

모든 Gate 가 PASS 되면 학생 화면 polish 를 멈추고 University Operations 와
Production Canary 로 넘어간다.

---

## r1 제출 화면

여섯 Core 를 같은 길로 밟아 찍었다. 자리마다 안쪽 코드가 없는지와 가로로
밀리지 않는지와 같은 그림이 두 이름으로 저장되지 않는지를 함께 센다
(Core 하나에 확인 82가지).

```
Core          대표 학과                 자리
BIZ_CORE_V1   경영학과                  PCU26_BIZ
NURSING_CORE_V1 간호학과                PCU26_NURSING
PUBADM_CORE_V1  행정학과 일반행정트랙   PCU26_PUBADM_GENERAL
CS_CORE_V1    컴퓨터공학전공            PCU26_SWF_COMPUTER
EE_CORE_V1    전기전자공학과            PCU26_EE
MEDIA_CORE_V1 광고사진영상학과          PCU26_ADPHOTO
```

그림은 `docs/metri/shots/review-loop/r1/<Core>/` 에 있다. Gate 마다 읽을
파일은 이렇다.

| Gate | 파일 |
|---|---|
| 1 Assessment Desktop | `01-start` · `02-interest` · `03-experience` · `04-selected` |
| 2 Assessment Mobile | `m1-interest` · `m2-experience` · `w360-*` · `w430-*` |
| 3 Result Summary | `05-result-hero` · `m3-result` |
| 4 Evidence | `06-result-evidence` · `m5-result-detail` |
| 5 Action | `07-result-action` |
| 6 "/me" | `10-me` · `m4-me` |
| 7 PDF | `09-report.pdf` · `09-report-01`~`04` · `09b-appendix-*` |
| 8 Cross-Core | 여섯 Core 의 `05` · `06` · `07` 을 나란히 |

**근거가 있는 응시로 찍는다.** 보기를 흔들어 고르면 경험이 거의 없는 응답이
되고 그 결과지는 `아직 없습니다` 로 찬다. 그 그림으로는 상품성을 가릴 수
없어서, 검사 화면은 그대로 눌러서 찍고 남은 문항은 사람 셋의 규칙으로
채운다(`PERSON=C`).

```bash
V3_PREVIEW_OPEN='*' V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json \
  bash scripts/stage-serve.sh 3100
UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' PERSON=C \
  CORE=BIZ_CORE_V1 LEAF=PCU26_BIZ \
  OUT=docs/metri/shots/review-loop/r1/BIZ \
  npx tsx scripts/pcu-gold-shots.ts
```

---

## r1 에서 고친 것

제품 코드는 한 줄도 고치지 않았다. 고친 자리는 찍는 쪽 하나다.

**이미 고른 칸을 다시 눌러 같은 그림을 두 이름으로 저장하고 있었다.**
`PERSON=C` 는 남은 문항을 미리 채워 두므로 그 화면에 들어오면 보기 하나가
벌써 켜져 있다. 그런데 고른 상태를 찍는 자리가 `label` 몇 번째로 집고 있어서
라디오 차례와 어긋났고, 그래서 켜져 있는 칸을 또 눌러 화면이 한 점도 바뀌지
않았다. `w360-picked` 와 `w430-picked` 가 `w360-experience` 와
`w430-experience` 와 바이트까지 같은 그림으로 저장됐다.

같은 그림을 거르는 줄이 그것을 잡았다. 집는 자리를 라디오 차례로 바꿨다:
지금 켜져 있는 칸의 다음 보기를 고른다. 재는 것은 고른 상태가 화면에서
또렷한가이고 어느 보기든 그 묶음의 보기다.
