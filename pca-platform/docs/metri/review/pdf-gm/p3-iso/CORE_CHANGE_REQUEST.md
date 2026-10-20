# Core 변경 요청 · 배재대 Gold Master PDF 연동 (2026-10-20)

보낸 곳: 배재대학교 CareerMatri 세션 → CareerMatri Common Core 개발 세션.
**이 세션은 Core · DB · 공통 코드를 고치지 않았다.** 아래는 요청이고, 결정과 구현은 Core 세션이 한다.

## 요청 1 · 리포트 입력의 경험 기록을 응시에 고정 (DB)

- 지금: Gold Master 는 `v3_experiences` 를 리포트를 뽑는 순간 읽는다(`experiencesOf(user_id, core)`). 굳은 결과(`v3_snapshots`)는
  응시 날 고정되지만 경험 기록은 고정되지 않아, 학생이 기록을 고치면 같은 응시의 PDF 가 달라진다.
- 바라는 것(둘 중 하나): ① 제출 때 그 시점의 경험 기록을 스냅숏에 함께 적는 칸, 또는 ② 리포트가 ‘기록 기준일’ 을 지정해 읽을 수 있는
  이력(`updated_at` 이력 표). 결정 전까지 Gold Master 는 쪽마다 ‘경험 기록은 뽑은 날 기준’ 을 적는다.

## 요청 2 · 결과 모델 `did` 와 저장 근거 수 (확인만)

- 격리 검사에서 저장된 `v3_evidence_picks` 27행, 결과 모델 `did` 26개. 빠진 한 줄은 `TD02 · VERIFY · ‘지난 캠페인 반응’` 으로,
  `verifications` 에는 있다(그 영역의 J6 판단은 묻지 않음). TD01 · TD08 의 VERIFY 근거는 `did` 에 들어 있다.
- 의도라면 그대로 두면 된다. Gold Master 는 네 목록(`did · decided · artifacts · verifications`)의 합으로 세도록 바꿨다.

## 요청 3 · Gold Master 서버 입구와 런타임 파일 (공통 코드 · 배포) — 승인 뒤

- 운영 PDF(`/v3/{id}/result/pdf`)는 건드리지 않고, 승인 플래그 뒤의 별도 입구가 필요하다(예: 담당자 전용 미리보기).
- 런타임 이미지에 `data/report-gm/*`, `data/region/*`(공시 스냅숏 포함), PDF 글꼴(Pretendard, OFL)을 넣는 일 —
  `deploy/runtime-needs.json` · `Dockerfile` 변경. 지금은 저장소에 글꼴이 없다.
- 이 요청은 Gold Master 디자인 승인 뒤에 진행한다. 그 전에는 아무것도 연결하지 않는다.

## 참고

- 격리 검사: `docs/metri/review/pdf-gm/p3-iso/ISO_CHECK.md` (통과 33 / 33)
- 전체 보고서 렌더러: `src/lib/me-v3/report-gm/render6.ts` · `scripts/lab/gm-full6.ts`
