# Track B 2차 · 전체 학과 심화

| PM 지시 | 판정 | 근거 |
|---|---|---|
| 학과마다 전공지식 · 도구 · 산업 · 역할 · Evidence/Gap · 행동 제안이 실제로 갈리는가 | **PASS** 같은 Core 의 학과 짝 176 가운데 GENERIC 0 | `DEPT_CONTENT.md` · `dept-content.json` · `logs/content-realpg.log` |
| ↳ 같은 갈래를 쓰는 학년도 개편 계보 후보 짝 6 | 같은 내용이 맞다(계보 미확정) | 등록부 `lineage_candidates` |
| ↳ Evidence/Gap | Core 마다 갈림 19/19 · 같은 Core 의 학생 B ≠ C 19/19 · **같은 Core 안 학과끼리는 같다(설계 · 측정 동결)** | `DEPT_CONTENT.md` 요약 |
| ↳ 기업 | **NOT AVAILABLE** | 학생 결과지에 기업 칸 없음(지역 기관 0줄) · BIZ GM 미리보기만 |
| 2026/2027 공식 교육과정 대조 | **NOT VERIFIED** | `www.pcu.ac.kr` CONNECT 403 · `logs/pcu-reach.log` |
| 자율전공 2개 분기(2026 · 2027) | **PASS** 21/21 | `ROUTING_SELFDESIGN.md` · 실제 시작 동작 `startV3` |
| 번역 메뉴 18 Core 확장 | **Core 승인 요청 제출(코드 변경 없음)** | `CORE_REQUEST_TRANSLATE.md` |
| 1차 115 자리 서버 E2E 회귀 | **PASS** 115/115 · 153/153 · 갈림 19/19 | `../REGRESSION/logs/trackB-dept-e2e-realpg.log` |

- 자율전공 첫 실행에서 4줄이 걸렸다: 내 검사가 `majors?pick=1` 로 바로 간다고 기대했는데 실제 경로는 `startGate` 가 학교 시작 쪽(`/campus/pcu/start`)으로 보내고 그 쪽이 `majors?pick=1` 단추를 세운다(`src/app/campus/[universityCode]/start/page.tsx:69`). **검사 기대값을 고쳤다(제품 변경 없음).** 그 덕에 `startV3` 안의 `pickRequired` 되돌림(`actions.ts:123`)이 닿지 않는 방어 경로라는 것도 드러났다: `startGate` 가 학교로 판정하려면 쿠키가 응시 가능한 자리여야 하고, 그 자리는 늘 Core 를 든다.
- 같은 검사 스크립트의 묶음 코드 비교 실수(`Z1` ↔ `Z1_EVIDENCE_ESTABLISHED`)를 한 번 고쳐 다시 돌렸다.
- 전공 목록 화면과 학과 쪽의 쿠키 설정 화면은 **NOT VERIFIED**(브라우저).
