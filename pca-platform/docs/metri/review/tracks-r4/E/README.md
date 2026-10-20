# Track E 4차 · PDF 앱 연동 — 편집판 렌더러로 바꿀 준비 (적용하지 않음)

## 상태

- 3차 승인 패키지(`../../tracks-r3/E/patches/01~04`)는 **그대로 적용하지 않았다**(공통 DB · 권한 · erasure · 다운로드 경로 · 런타임 → Core/PM 승인 대상).
- 패키지 03 의 생성 모듈은 v9 렌더러(`full6`)를 부른다. 4차 2판(매거진판, `../../pdf-gm/v11-magazine/`)이 승인되면 **바꿀 곳은 렌더 한 단계**다.
  1판(`render7`)은 연결 후보에서 내렸다:

```ts
// 패키지 03 · src/lib/me-v3/report-gm/pdf-gm.ts 의 render 단계
- const out = full6(r, lib, { href: pathToFileURL(fontDir).href, family: "Pretendard" });
+ const e = edit8(r);                                  // editorial8.ts
+ const html = html8(e, pages8(e), {                   // render8.ts
+   sans: pathToFileURL(path.join(fontDir, "pretendard")).href,
+   serif: pathToFileURL(path.join(fontDir, "notoserif")).href });
```

- **글꼴이 하나 늘었다**: 2판은 제목·번호에 Noto Serif KR(Bold · SemiBold · Medium, SIL OFL 1.1)을 쓴다. 패키지 04 의 런타임 묶음에
  `fonts/notoserif/` 세 파일과 `LICENSE` 를 더해야 한다(승인 요청 E-1). 운영 이미지의 `font-noto-cjk` 로 대신하면 글자 폭이 달라져 넘침 검사를 다시 돌려야 한다.

  편집판은 기업·공시 자료(`dart-*` · `kr-chungcheong-orgs`)를 읽지 않으므로 패키지 04 의 런타임 묶음에서 그 자료 파일을 뺄 수 있다. 줄여 맞추는 단계(FIT 17%)도 없어진다(넘치면 실패로 본다).
- 학생 배포 플래그는 **OFF 유지**. 담당자 개인 PDF 접근은 **기본 거절 유지**.

## 검사 (`scripts/lab/trackE-r4.ts` · 운영 경로 연결 없음)

| 검사 | 결과 | 로그 |
|---|---|---|
| 같은 굳은 결과에서 두 번 그린 HTML 이 같은가(다시 내려받아도 같음) | 3 / 3 | `logs/trackE-r4.log` |
| 지역 기업 목록의 이름·식별자 96개가 HTML 에 없는가 | 3 / 3 | 같은 로그 |
| 경험 기록 자유입력(note_text)이 없는가 | 3 / 3 | 같은 로그 |
| 줄여 맞추는 규칙(zoom)이 없는가 | 3 / 3 | 같은 로그 |
| **(2판)** 위 넷을 `editorial8 · render8` 로 다시 | 3 × 4 / 3 × 4 | `logs/trackE-r4-render8.log` (통과 20 · 걸림 0) |
| **(2판)** 12쪽 시안이 전체와 같은 렌더러의 같은 쪽인가(쪽 번호 칸만 다름) | 3 / 3 | 같은 로그 |
| **(2판)** 글꼴 파일 · 라이선스(Pretendard · Noto Serif KR) | 1 / 1 | 같은 로그 |

1판 로그 `logs/trackE-r4.log` 는 지난 판의 기록으로 남긴다.

## BLOCKED / NOT VERIFIED

- BLOCKED: 패키지 01~04 적용(승인 대기) · 운영 다운로드 경로.
- NOT VERIFIED: 브라우저에서 내려받기 · 운영 컨테이너 글꼴 경로 · 운영 볼륨.

## 다음 행동

1. Track A 2판 사람 검수 → 승인.
2. 패키지 01~04 와 E-1(글꼴) 승인 뒤, 03 의 render 단계를 위 줄로 바꾸어 적용.
3. Staging 에서 내려받기 두 번 → 텍스트 동일 · 권한 거절 · 파기 뒤 404.
