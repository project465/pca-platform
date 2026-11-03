# 커리어피크 · MAT 단추

커리어피크에 붙이는 단추다. 이름을 바꾸지 않고 **MAT 그대로** 쓴다(대표 결정
2026-10-31). 누르면 같은 탭에서 `https://app.careermatri.com/from/careerpeak`
로 가고, 거기서 커리어피크 표시가 붙은 MAT 소개 쪽(`/partner/careerpeak`)이 열린다.

- 잡인더스트리와 같은 틀이다: 링크 하나, 로그인과 결제는 커리어매트리 앱 한 곳
- 그 길로 가입하거나 작업공간을 연 사람은 `brand_touches` 표에 `careerpeak` 로 한 줄 남는다
- **새 탭으로 열지 않는다**

## 붙이는 법

커리어피크 사이트 편집기에서 HTML(코드) 블록을 하나 만들고 `mat-button.html` 을
그대로 붙인다. 글자 링크로만 걸 때는 주소만 쓰면 된다.

```
https://app.careermatri.com/from/careerpeak
```

## 확인

붙인 뒤 단추를 눌러 `커리어피크 MAT` 제목이 뜨면 된다. 소개 쪽 위의
`커리어피크로 돌아가기` 는 `https://www.careerpeak.co.kr` 로 간다. 실제 주소가
다르면 `src/lib/brand.ts` 의 `home` 한 줄만 고친다.
