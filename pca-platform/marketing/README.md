# 소개 사이트

나라별 소개·영업용 사이트다. 학생이 검사를 보는 **플랫폼과는 별개 앱**이다
(설계 원칙 5). 각 사이트의 로그인 버튼은 전부 같은 플랫폼 한 곳을 가리킨다.

## 나라를 고르는 방법

코드는 하나고, 빌드할 때 `SITE` 로 어느 원고를 실을지 정한다.

```bash
SITE=global npm run dev     # 영어판
SITE=kr     npm run dev     # 한국어판
```

배포도 같다. 도메인마다 `SITE` 만 다르게 준 빌드를 올린다.

| SITE | 도메인(예정) | 언어 | 상태 |
|---|---|---|---|
| `global` | pca.example | en | 있음 |
| `kr` | pca.co.kr | ko | 있음 |
| `kz` | pca.kz | kk | 원고 없음 |
| `tr` | pca.com.tr | tr | 원고 없음 |

## 지금 볼 수 있는 링크

빌드해서 정적 한 장으로 뽑아 올려 둔 미리보기다. 메뉴는 실제로 넘어가고,
문의 폼만 접수되지 않는다 (뒤에 서버가 없다).

| 사이트 | 링크 |
|---|---|
| 글로벌 (영어) | https://claude.ai/code/artifact/14f526a6-4854-447e-a693-3fc072027899 |
| 한국 (한국어) | https://claude.ai/code/artifact/2489bd40-cdae-4413-8f99-804341b64cda |

도메인이 정해지면 이 미리보기는 버리고 각 도메인에 `SITE` 만 다르게 준
빌드를 올린다. 미리보기를 다시 뽑는 방법은 아래와 같다.

```bash
SITE=kr npm run build && SITE=kr npm start   # 다른 창에서
node scripts/export-preview.mjs kr /tmp/pca-korea.html
node scripts/check-preview.mjs /tmp/pca-korea.html   # 경로가 실제로 넘어가는지
```

`check-preview.mjs` 는 뽑아낸 파일을 브라우저로 열어 경로마다 제 페이지가
나오는지 본다. 타입 검사와 빌드로는 이걸 못 잡는다 — 본문 앵커와 칸의
id 가 겹쳐 요금제를 눌러도 홈이 나오던 적이 있었고, 그때도 타입과 빌드는
멀쩡했다. CI 가 나라마다 이 검사를 돌린다. 경로 목록은 파일에서 읽으므로
페이지를 늘려도 이 스크립트는 고치지 않는다.

## 나라를 추가하려면

1. `src/content/kz.ts` 를 만들고 `SiteContent` 형태를 채운다
2. `src/content/index.ts` 의 `SITES` 에 한 줄 추가한다

컴포넌트는 손대지 않는다. 화면에 박힌 한국어가 없도록 문구는 전부 원고에 있다.
검사 플랫폼의 `translations` 테이블과 같은 사고방식이다 — 나라가 늘 때
늘어나는 것은 구조가 아니라 내용이어야 한다.

## 아직 안 된 것

- **문의 접수**가 서버 파일(`.inquiries/contact.jsonl`)에 쌓이기만 한다.
  운영에 올리기 전에 메일 발송이나 CRM 연동으로 바꿔야 한다. `src/app/actions.ts` 참고
- **브랜드명과 도메인이 미정**이다. 지금은 `PCA` 와 `pca.example` 을 임시로 쓴다.
  정해지면 각 원고 파일의 `brand` · `domain` · `platformUrl` 만 고치면 된다
- 카자흐스탄·터키 원고

## 화면 촬영

```bash
SITE=kr npm run build && SITE=kr npm start
node scripts/shots.mjs kr        # /tmp/shots-mk/kr 에 구간별로 저장된다
```
