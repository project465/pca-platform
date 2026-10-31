# 커리어피크 · AI 취업 비서 단추

커리어피크에 붙이는 단추다. 커리어피크에서는 **`AI 취업 비서`** 라고 부른다(대표 결정
2026-10-31 17:55. 그 전에는 MAT 그대로였다). 누르면 같은 탭에서 `https://app.careermatri.com/from/careerpeak`
로 가고, 거기서 커리어피크 AI 취업 비서 소개 쪽(`/partner/careerpeak`)이 열린다.

- 잡인더스트리와 같은 틀이다: 링크 하나, 로그인과 결제는 커리어매트리 앱 한 곳
- 그 길로 가입하거나 작업공간을 연 사람은 `brand_touches` 표에 `careerpeak` 로 한 줄 남는다
- **새 탭으로 열지 않는다**

## 붙이는 법

커리어피크 사이트 편집기에서 HTML(코드) 블록을 만들고 붙인다. 커리어피크는 PC 와
모바일이 **다른 칸**이라 두 번 넣는다(2026-10-31 아임웹 게시본과 같은 판).

- PC 칸: `mat-button.html`
- 모바일 칸: `mat-button-mobile.html` — 같은 띠에 `cp-mat--m` 을 더하고, 아임웹이 모바일로
  보는 990px 이하에서만 서게 한 판이다

글자 링크로만 걸 때는 주소만 쓰면 된다.

```
https://app.careermatri.com/from/careerpeak
```

## 카드 모양

어두운 띠 한 줄이다. 왼쪽에 큰 `AI 취업 비서` 글자, 가운데에 `Careerpeak × CareerMatri` 와 한 줄
설명, 오른쪽에 `AI 취업 비서 시작하기 →` 단추가 선다. 640px 아래에서는 세로로 쌓이고 단추가
한 줄을 다 쓴다. 한국어는 낱말 가운데서 끊지 않는다(`word-break: keep-all`).

## 확인

붙인 뒤 단추를 눌러 `커리어피크 AI 취업 비서` 제목이 뜨면 된다. 소개 쪽 위의
`커리어피크로 돌아가기` 는 `https://www.careerpeak.co.kr` 로 간다. 실제 주소가
다르면 `src/lib/brand.ts` 의 `home` 한 줄만 고친다.
