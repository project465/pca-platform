# 세종일자리경제진흥원 전용 작업

이 폴더는 세종 세션의 기록이다. 앱과 검사 스크립트는 이 폴더를 읽지 않는다
(`copy-audit` 은 `docs/metri` 만 센다).

## 가지와 기준 커밋

| 항목 | 값 |
|---|---|
| 실제 작업 가지 | `claude/epic-galileo-lrvgxr`. Claude Code 웹 세션이 시작할 때 만든 이름이다 |
| 프로젝트 목표 가지 이름 | `feature/sejong-jobs`. 원격에 만들지 않았다. 이름을 옮길 때는 사업주 지시로 한다 |
| 기준 커밋 | `0bff307c41aac286549a9a85503e4a9af162ca9e` — "GM v4 대표 5쪽을 Pretendard 로 다시 뽑았다" (2026-10-20 05:42Z) |
| 기준 커밋의 출처 | `claude/careermatri-screen-review-p0c8kb`. CareerMatri 작업 가지이고 배재대 작업도 여기서 한다 |
| 포함 확인 | R35 `e6da7ec2` · `4f02d79b`, GM v4 `6b08b35b`, 운영 가지 머리 `02b6c610` 이 모두 조상이다 |

### 어떻게 옮겼는가 (2026-10-20)

1. 세션 시작 때 가지는 `main`(`0079cd86`)에 서 있었다.
   - 이 가지만의 커밋은 0 이었고, 작업 트리는 깨끗했고, 원격에는 아직 없었다.
2. `0079cd86` 이 `0bff307c` 의 조상임을 확인했다.
3. `git merge --ff-only 0bff307c` 로 앞으로만 옮겼다.
   - 역사를 고치지 않았다(fast-forward).
   - 강제 푸시나 가지 삭제가 필요 없다.
   - 잃은 작업은 없다.
4. 기준 커밋 뒤에 작업 가지에 더해진 `76394221` · `3c67c09d`(PRO 80쪽 설계, OpenDART 대조)는 **가져오지 않았다.**
   기준선을 고정해 두기 위해서다. 필요해지면 그때 앞으로 감기(fast-forward) 또는 병합으로 가져온다.

## 이 가지에서 지키는 것

- 공통 엔진 파일을 고치지 않는다. 바꿀 일이 생기면 `COMMON_CORE_CHANGE_REQUEST.md` 에 적는다.
- 다음 가지는 건드리지 않는다.
  - `claude/careermatri-screen-review-p0c8kb`(작업·배재대)
  - `claude/amazing-thompson-w3f2o2`(운영)
  - `feature/jju-campus`(전주대)
  - `main`
- 운영 PDF 연결, Production 배포, Staging 설정 변경은 하지 않는다.
- 배재대 납품 작업이 우선한다.
  - 세종 쪽에 필요한 공통 변경은 배재대 Gold Master 동결 뒤로 요청한다.
  - 공용 Staging 은 쓰지 않는다.

## 문서

| 파일 | 내용 |
|---|---|
| `COMMON_CORE_CHANGE_REQUEST.md` | 본체에 넘길 공통 엔진 변경 제안 여섯(CR-1~6) |
| `SEJONG_SERVICE_DESIGN.md` | 세종 전용 서비스 설계: 대상·화면·콘텐츠·PDF·관리자·흐름·파일 구조·계획 |
| `data/README.md` | 세종 기업·기관 자료의 조사 방법과 검증 상태 |
| `data/sejong-orgs.preview.json` | 1차 자료. PREVIEW_ONLY, 채용 여부 미확인 |
