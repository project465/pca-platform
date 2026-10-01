# PCA Platform: 전공 기반 진로·직무 진단

홈페이지 버튼에서 바로 진입해 응시하고 결과까지 보는 웹 플랫폼입니다.
빌드 도구 없이 정적 파일만으로 동작하며 GitHub Pages에 그대로 올라갑니다.

현재 열려 있는 학과: **기계공학과(ME)** 1개
나머지 학과는 화면에 "준비중"으로 표시되고 선택되지 않습니다.

---

## 실행

```bash
python3 -m http.server 8000
# http://localhost:8000
```

빌드 단계가 없습니다. 파일을 수정하고 새로고침하면 바로 반영됩니다.

---

## 파일 구조

```
index.html              화면 5개(시작/학과선택/응시자정보/문항/결과)의 마크업
assets/app.css          공통 스타일
assets/engine.js        채점 엔진: 순수 계산만, DOM을 건드리지 않음
assets/app.js           화면 흐름과 결과 렌더링
data/majors.js          학과 목록과 공개 여부(status)
data/me.js              기계공학과 데이터 (자동 생성물: 직접 수정 금지)
content/me.json         기계공학과 직무별 서술 콘텐츠 + 직무 코드 (사람이 쓰는 파일)
tools/build_major.py    계산엔진 xlsx → data/<code>.js 생성기
tools/make_links.py     단체 응시용 1인 1링크 CSV 생성기
```

`data/*.js`는 도구가 만드는 산출물입니다. 문항이나 가중치를 바꿔야 하면
원본 xlsx를 고치고 `tools/build_major.py`를 다시 돌리세요.

---

## 홈페이지에서 연결하기

버튼의 링크만 걸면 됩니다.

| 목적 | 링크 |
|---|---|
| 소개 화면부터 | `https://<주소>/` |
| 학과 선택부터 | `https://<주소>/?start=1` |
| 기계공학과 무료검사 바로 | `https://<주소>/?major=ME&form=QUICK` |
| 기계공학과 STANDARD 바로 | `https://<주소>/?major=ME&form=STANDARD` |
| 단체 1인 1링크 | `https://<주소>/?major=ME&form=STANDARD&t=<토큰>&org=<기관명>` |

아임웹 버튼 예시:

```html
<a href="https://project465.github.io/pca-platform/?major=ME&form=QUICK"
   class="btn">무료 진로진단 시작하기</a>
```

`org`를 넘기면 상단 배지와 안내문에 기관명이 표시되고 결과지에도 들어갑니다.

### 단체 링크 만들기

```bash
python3 tools/make_links.py \
  --base https://project465.github.io/pca-platform/ \
  --org "한국대학교 공과대학" --major ME --form STANDARD \
  --count 120 --out 한국대학교_링크.csv
```

명단이 있으면 `--roster 명단.csv`(이름,학번)를 붙입니다.
결과 CSV를 기관 담당자에게 전달하면 됩니다.

---

## 학과 추가하기

1. 해당 학과의 계산엔진 xlsx를 준비합니다. 시트 구성은 기계공학과 파일과 같아야 합니다.
   - `04_*_QuestionBank_120` · `05_Option_Scoring` · `03_*_Job_Matrix` · `15_JOB_Evidence_Matrix`
2. `content/<code>.json`에 직무별 코드와 서술 콘텐츠를 씁니다.
   각 직무마다 `code`, `summary`, `tasks`(4), `scenes`(4), `projects`(3), `interview`(3)이 필요합니다.
   형식은 `content/me.json`을 그대로 따라가면 됩니다.
3. 데이터 파일을 만듭니다.
   ```bash
   python3 tools/build_major.py \
     --xlsx Career_Matri_V2_0_EE.xlsx --code EE --name 전기전자공학과 \
     --content content/ee.json --out data/ee.js
   ```
   문항 수, 선택지 수, 옵션 벡터, Evidence 가중치, 콘텐츠 누락을 검사하고
   하나라도 어긋나면 파일을 쓰지 않고 이유를 출력합니다.
4. `index.html`에 `<script src="data/ee.js"></script>` 한 줄을 추가합니다.
5. `data/majors.js`에서 해당 학과의 `status`를 `'ready'`로 바꿉니다.

학과 코드가 `window.PCA_DATA`에 없으면 `status`가 `ready`여도 자동으로
선택 불가 상태가 됩니다. 데이터 없이 열리는 사고는 나지 않습니다.

---

## 상품 구성

| 상품 | 문항 | 소요 | 공개 결과 |
|---|---|---|---|
| QUICK | 28 | 4~6분 | Career Pattern, TOP3 FIT, Core DNA 4, Work Style, 즉시 행동 1개 |
| STANDARD | 68 | 12~15분 | Career DNA 8, TOP5, FIT/READY/EVIDENCE, GAP, 업무장면, 포트폴리오, 자소서·면접, 30/60/90 |
| PRO | 92 | 18~25분 | STANDARD 전체 + Evidence Strength Map, 경험→직무 전환, Portfolio Priority, 지원전략 |

QUICK에서는 READY/EVIDENCE를 계산하지 않습니다(측정하지 않았기 때문).

---

## 응답 저장

현재는 `localStorage`에 저장하고, 같은 기기·같은 브라우저에서 이어서 응시합니다.
`localStorage`를 못 쓰는 환경에서는 메모리에 담고 새로고침 시 초기화됩니다.

운영 전환 시 `assets/app.js`의 `store()` / `save()` 두 함수만 서버 API로 바꾸면 됩니다.
결과 객체는 계산 직후 `window.PCA_RESULT`에 들어 있어 그대로 전송할 수 있습니다.

---

## 주의

문항 가중치와 직무 매트릭스는 파일럿 검증 전 초기값입니다.
"검증 완료된 검사"로 홍보하지 않습니다. 결과 화면에도 같은 내용이 표기됩니다.
