# 잡인더스트리 · AI취업지원도우미 단추

잡인더스트리(www.jobindustry.co.kr)에 붙이는 단추다. 누르면 같은 탭에서
`https://app.careermatri.com/from/jobindustry` 로 가고, 거기서 잡인더스트리
표시가 붙은 MAT 소개 쪽(`/partner/jobindustry`)이 열린다.

- **링크 하나만 쓴다**(대표 결정 2026-10-30 (가)). 로그인과 결제는 커리어매트리
  앱에서 하고, 두 사이트가 계정을 나눠 쓰지 않는다
- 그 길로 가입하거나 작업공간을 연 사람은 `brand_touches` 표에
  `jobindustry` 로 한 줄 남는다. 결제·채점에는 들어가지 않는다
- **새 탭으로 열지 않는다.** 뒤로 가기가 끊기면 돌아오려는 사람이 창을 닫는다

## 붙이는 법

**설치 순서 전체는 `INSTALL.md`** 에 있다. 가장 효과가 큰 것은 모든 화면에 떠 있는 단추
한 줄이다(공고 화면에서 누르면 그 공고를 MAT 이 바로 맞대 본다):

```html
<script src="https://app.careermatri.com/embed/jobindustry.js" defer></script>
```

### 카드 하나만 붙일 때

잡인더스트리 사이트 편집기에서 HTML(코드) 블록을 하나 만들고
`mat-button.html` 내용을 그대로 붙인다. 메뉴에 글자 링크로만 걸 때는 주소만
쓰면 된다.

```
https://app.careermatri.com/from/jobindustry
```

## 확인

붙인 뒤 단추를 눌러 `잡인더스트리 AI취업지원도우미` 제목이 뜨면 된다.
제목 대신 커리어매트리 홈이 뜨면 주소의 `jobindustry` 철자가 틀린 것이다.
