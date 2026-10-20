# R38 Track 상태

표기: `[x]` 실행 증거 있음 · `[~]` 구현했으나 일부만 검증 · `[!]` 차단 · 승인 대기 · `[ ]` 미착수 · `NV` NOT VERIFIED.
**Track 완료율로 출시 PASS 를 표시하지 않는다.** 테스트 PASS 는 품질 검수 PASS 가 아니다.

| Track | 구현 | 테스트 | 실물 증거 | 미검증 | 차단 | 다음 행동 |
|---|---|---|---|---|---|---|
| P0 Identity/Privacy | `[~]` 파기 재현 검사 새로 · shim 에 opt-in autocommit · 제품 패치 0 | `[x]` SC-2 10 PASS / 11 TODO · ADJ-1 6/6 · 파기 6 PASS / 3 TODO | 일회용 DB 로그 (`evidence/R38/p0-*.log`) | 실제 `pg` · next-auth · 운영 DB · 2단계 · 비밀번호 찾기 차례 | `[!]` CC-002 · CC-002a · CC-009 승인 | 본체 · 배재 승인 판단 → Staging 적용 · 운영 탐지 SQL(승인 뒤) |
| A Assessment | `[ ]` | `[ ]` (인벤토리만 · R37) | — | 문항 타당성 · 편향 · 누락 | 전공 전문가 자료 없음 | 전공자 검토 자료 확보 |
| B Scoring | — (규칙 변경 0) | `[x]` 결정성 44/44 · 불변식 396/396 · `v3:scoring` 4×31 | `evidence/R38/bench/results.json` = R37 와 바이트 같음 | 정규화 · 비정상 입력 확장 | — | 비정상 응답 사례 더하기(독립) |
| C Major/Role | `[~]` 팩 등록부 대조 검사(OUT-5) | `[x]` 88/88 · 지어낸 말 0 · 자기 검사에서 넣으면 걸린다 | `content/integrity.json` | 요구 내용의 맞고 틀림 · 기업 · 지역 · 시장 사실 | 기관 · 시장 자료 없음 | 출처 · 날짜가 붙은 기관 자료가 오면 대조 |
| D Evidence/Gap | `[x]` 근거 열쇠 공용화 · 후보 누출 · 연결 그래프 · 회귀 | `[x]` OUT-2 134 PASS · LINEAGE 88 PASS · R-BIZ · R-CS-SLOT | `content/integrity.*` · `sample-ids.log` | GM 실제 27 행 · 실제 PDF 수 표시 | `[!]` CC-006 (A2) · CC-009 먼저 | 배재가 비식별 응시 · PDF 를 주면 CN-001 로 대조 |
| E Personalization/Content | `[x]` 세 범주 독립 실험 · 페르소나 비교 · 개선 문단 넷 | `[x]` OUT-1 88 PASS / **8 XFAIL** · 짝 36 분류 · 페르소나 규칙 16/16 · 자기 검사 6/6 | `content/personas.*` · `R38_OUTPUT_CONTENT_QA.md` | 사람(전공자 · 학생) 검수 · 실제 PDF 문장 | `[!]` CC-008 승인 | Core PM 이 S1~S4 와 세 범주 안을 검토 |
| F B2C/B2B/Institution integration | `[~]` 기관별 회신 초안 넷(미발송) | `[x]` 보호 묶음 11/11 전후 같음 | `evidence/R38/protect/{before,after}` | 기관 PDF · 화면 · 격리 E2E · 브라우저 | npm 막힘 · 기관 자료 0 건 | 기관 자료 수신 시 `03` 프로토콜 체크리스트로 검토 |

## 진행 줄 (증거 파일)

- `[x]` 기준 확인 — `4f02d79b` · `c4f39cdf` 조상 · 원격 두 가지 `c4f39cdf` · 패키지 sha256 131/131 · R37_REFERENCE 122 파일 = HEAD 바이트 같음
- `[x]` 보호 묶음 전 — `evidence/R38/protect/before/summary.tsv`
- `[x]` P0-C 파기 재현 — `scripts/shared-core/p0-erasure.test.ts` · `evidence/R38/p0-erasure.log`
- `[x]` 콘텐츠 무결성 — `scripts/shared-core/content/integrity.ts` · `evidence/R38/content/integrity.{json,md,log}` · `selftest.log`
- `[x]` 페르소나 × Core · 세 범주 — `content/personas.ts` · `content/three-way.ts` · `evidence/R38/content/personas.*`
- `[x]` 근거 ID 추출 — `content/sample-ids.ts` · `evidence/R38/content/sample-ids.log`
- `[~]` 결과 본문 QA — `R38_OUTPUT_CONTENT_QA.md` (합성 · 실제 PDF NV)
- `[!]` 계약 — `CONTRACTS.md` CC-006 · CC-008 · CC-009 PROPOSED · 승인 증거 없음
- `[x]` 회신 초안 — `handoffs/R38_*.md` 넷 · **미발송**
- `[x]` 보호 묶음 후 — `evidence/R38/protect/after/summary.tsv` (전과 같음)
- `[ ]` 2단계 로그인 설계 · 기관 실물 검수 · 전체 typecheck · 브라우저 E2E
