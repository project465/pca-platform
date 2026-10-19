# Staging 에서 사람이 확인할 것 (이 컨테이너는 Staging 을 열 수 없다)

주소: `https://charming-reverence-staging.up.railway.app`

## 0. 먼저 (Railway → staging 서비스 → ⋯ → Shell)

```bash
npm run db:upgrade      # 담당자 재응시 상품(CM_V3_CAMPUS_PRO) 한 줄이 선다
npm run db:verify
npm run pcu:open        # 학생에게 열린 자리가 무엇인지
```

`db:upgrade` 전에는 담당자 화면의 `재응시 열어 주기` 가 실패한다(외래키).

## 1. 학교 계정이 개인 응시를 열지 못한다 (P0)

1. `/campus/pcu/login` 에서 학교가 발급한 학생 계정으로 로그인 (단추 글자가 `로그인`)
2. 주소창에 `/v3/start` 를 직접 친다
   - 통과 기준: `/campus/pcu/start` 로 간다. 학교 · 학과 · 학번이 서고 단추가 `검사 시작하기`
   - 실패 기준: `기계공학 진로 진단` 이나 `BASIC` 이 적힌 시작 화면이 선다
3. `/v3/start?core=BIZ_CORE_V1` 도 같다

## 2. 상태별 단추

1. `/campus/pcu/start` → `검사 시작하기` → 학부 → `검사 시작` → 문항 몇 개 답하고 창 닫기
2. 다시 `/campus/pcu/start`
   - 통과 기준: 단추가 `이어하기`, 누르면 답하던 화면
3. 끝까지 답하고 결과를 받은 뒤 `/campus/pcu/start`
   - 통과 기준: 단추가 `결과 보기`, `검사 시작하기` 가 없다, 아래에 `학과 담당자에게` 안내
4. 담당자 계정 → `/org/v3/students` → 그 학생 줄 `재응시 열어 주기`
5. 학생 `/campus/pcu/start`
   - 통과 기준: `다시 검사 시작하기` + `지난 결과 보기`
6. 다른 학과 쪽 `/campus/pcu/d/PCU26_PUBADM_GENERAL` 에 학생으로 들어가기
   - 통과 기준: `등록된 학과로 가기`, 시작 단추 없음

## 3. 결과 · 종이

1. 결과 쪽에서 `PDF` 받기 → 9~11쪽, 학교·학과가 표지에 선다
2. 근거를 고른 응시와 안 고른 응시의 `내가 이미 가진 근거` 가 다르다
3. 종이에 `스스로 고른 답` · `수치 · 기간 · 결과는 직접 적습니다` 가 선다

## 4. 배포된 커밋 확인

GitHub → Deployments → `feisty-generosity / staging` 의 가장 위 줄 커밋이 이 회차의
커밋인지. 아니면 Railway → staging → Deployments 의 커밋 해시.
