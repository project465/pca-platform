# pca-platform — 배포본

`project465.github.io/pca-platform/` 으로 나가는 **정적 파일만** 들어 있습니다.
빌드 단계가 없고, 이 브랜치에 push 하면 그대로 반영됩니다.

**고칠 곳은 여기가 아닙니다.** 원본과 문서와 생성 도구는 `main` 브랜치의
`sites/pca-platform/` 에 있습니다. 고친 뒤 아래 파일들만 이 브랜치로 옮깁니다.

```
index.html  .nojekyll  assets/  content/  data/
```

인수인계 문서(`HANDOFF.md`·`CLAUDE.md`)와 계산 원본(`source/`)·생성 도구
(`tools/`)는 **일부러 빼 두었습니다.** 이 브랜치는 공개되므로, 밖에 나갈
이유가 없는 파일은 두지 않습니다.

## 들어가는 주소

| 목적 | 주소 |
|---|---|
| 처음부터 | `/` |
| 단계부터 | `/?start=1` |
| 기계공학과 무료 진단 | `/?major=ME&form=QUICK` |
| 단계까지 지정 | `/?major=ME&form=QUICK&stage=MS` |
| 단체 1인 1링크 | `/?major=ME&form=STANDARD&t=<토큰>&org=<기관명>` |

`stage` 는 `UNDERGRAD` · `EARLY` · `MS` · `PHD` · `RESEARCH` 다섯입니다.
`stage` 가 없으면 단계 화면부터 시작합니다.

## 지금 열려 있는 것

기계공학과 하나입니다. 나머지 학과는 화면에 준비중으로 표시되고 눌리지
않습니다. 문항 가중치와 직무 매트릭스는 파일럿 검증 전 초기값이고, 결과
화면에도 같은 문장이 찍힙니다.
