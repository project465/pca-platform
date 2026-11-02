# 커리어피크 × CareerMatri MAT 연동 키트 · 초안 v0.1 (2026-11-02)

잡인더스트리와 **같은 방식**(API 키 → 5분 한 번 쓰는 링크 → 연결 동의 → MAT)입니다. 다른 것은 아래 값뿐입니다.
API 자세한 내용은 `api.md`, 단추 모양은 `button.html`. 기존 파트너 화면 기준안(CP-Mobile-Start · CP-Mobile-Result · CP-PC)의
단추 자리에 이 단추를 놓습니다.

## 1. 정해진 값

| 항목 | 값 |
|---|---|
| 제휴 이름(주소에 들어감) | `careerpeak` |
| API | `POST https://app.careermatri.com/api/partner/careerpeak/session` |
| 단추 글자(기본) | `AI 취업비서 MAT 시작` |
| 넘겨받는 항목 | 잡인더스트리와 같은 여섯 칸(이름 또는 별명 · 관심 직무 · 관심 지역 · 학력 · 자격증 · 경력 요약) |
| 받지 않는 항목 | 연락처 · 주소 · 사진 · 생년월일 · 회사 이름 |
| 결제 · 정산 | 결제는 CareerMatri. 커리어피크 유입 회원 결제액의 [정산 비율] |

연결 방식(API 키)은 추천안으로 정한 값입니다. 대표님이 다른 방식을 정하시면 이 문서를 고칩니다.

## 2. 붙일 자리

1. **첫 화면(CP-Mobile-Start · CP-PC)** — 상담 신청 단추 아래 `is-line` 단추.
2. **상담 결과 화면(CP-Mobile-Result)** — "결과를 MAT으로 이어 가기" 자리에 `is-block` 단추.
3. **마이페이지** — 첫 카드 영역.

공고 번호(`posting_id`)는 보내지 않아도 됩니다.

## 3. 커리어피크 서버에서 할 일 · 4. 시험 순서

잡인더스트리 키트(`jobindustry.md`) 3 · 4절과 같습니다. 주소의 `jobindustry` 를 `careerpeak` 로 바꿉니다.
연동 상태 · 키는 운영자 화면(`/admin/partners`)의 커리어피크 칸에서 따로 켜고 만듭니다.
