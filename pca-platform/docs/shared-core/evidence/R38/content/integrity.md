# R38 콘텐츠 무결성 — 사례 표 (생성물 · 손으로 고치지 않는다)

`node … scripts/shared-core/content/integrity.ts` 가 만든다. 합성 사례의 규칙 일치이고 실제 추천 정확성이 아니다.

| case | core | input hash | snapshot hash | evidence refs | gap types | headline/action hash | discrepancy | expected_reason | observed_output | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| ME-C01 | ME_CORE_V3 | 754f0137e730 | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | c833dda39f30 | - | - | 기구·제품 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| ME-C02 | ME_CORE_V3 | 5ce723b6ab05 | 8a382bf9520c | PK 0 · 확인 0 · 후보 0 | REQUIRED_AXIS+OUTPUT+VERIFICATION | cadcbb6eca03 | - | - | 아직 직접 해 본 과제는 많지 않아요 / 짧게 한 번 해 보면 이야기할 거리가 생겨요. | PASS |
| ME-C03 | ME_CORE_V3 | 59428bd57806 | b7bda6d3ab6f | PK 26 · 확인 26 · 후보 0 | - | 146db8bfa623 | - | - | 기구·제품 설계 과제는 해 봤는데, 마음은 다른 쪽에 있어요 / 이 쪽을 계속 볼지만 정하면 돼요. | PASS |
| ME-C04 | ME_CORE_V3 | 359e0f0d2f0b | 444f315e73fa | PK 0 · 확인 0 · 후보 0 | PARTIAL_EVIDENCE+OUTPUT_EVIDENCE | 02570054792e | - | - | 기구·제품 설계 과제는 해 봤고, 정리만 남았어요 / 뭘 골랐는지만 덧붙이면 돼요. | PASS |
| ME-C05 | ME_CORE_V3 | 4ae6c382bcfe | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | c833dda39f30 | - | - | 기구·제품 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| ME-C06 | ME_CORE_V3 | 2c29cc9fc6fd | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | c833dda39f30 | - | - | 기구·제품 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| ME-C07 | ME_CORE_V3 | 40e02c6b2b9a | 2ea5b621949b | PK 26 · 확인 18 · 후보 8 | PARTIAL_EVIDENCE | c833dda39f30 | C-UNSEEN | C-UNSEEN→CC-008 | 기구·제품 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | XFAIL |
| ME-C08 | ME_CORE_V3 | d5c40d36c5c1 | 934d2ddd7bfd | PK 26 · 확인 24 · 후보 2 | PARTIAL_EVIDENCE | c833dda39f30 | C-UNSEEN | C-UNSEEN→CC-008 | 기구·제품 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | XFAIL |
| ME-C09 | ME_CORE_V3 | 6d27f4a4caf9 | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | c833dda39f30 | - | - | 기구·제품 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| ME-C10 | ME_CORE_V3 | 6cb7881cb800 | 41c1da7b177d | PK 26 · 확인 18 · 후보 8 | - | 6c3277f6157c | - | - | 기구·제품 설계 과제는 해 봤고, 정리만 남았어요 / 뭘 골랐는지만 덧붙이면 돼요. | PASS |
| ME-C11 | ME_CORE_V3 | dbf2385d83b8 | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | 0312b302125a | - | - | 기구·제품 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| BIZ-C01 | BIZ_CORE_V1 | 3c94fbedcd91 | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | db70f07ab7d6 | - | - | 경영전략·기획 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| BIZ-C02 | BIZ_CORE_V1 | 149831eb9579 | 8a382bf9520c | PK 0 · 확인 0 · 후보 0 | REQUIRED_AXIS+OUTPUT+VERIFICATION | a1bfb081a921 | - | - | 아직 직접 해 본 과제는 많지 않아요 / 짧게 한 번 해 보면 이야기할 거리가 생겨요. | PASS |
| BIZ-C03 | BIZ_CORE_V1 | 8b107567f976 | b7bda6d3ab6f | PK 26 · 확인 26 · 후보 0 | - | 2fbd64da3cc2 | - | - | 경영전략·기획 과제는 해 봤는데, 마음은 다른 쪽에 있어요 / 이 쪽을 계속 볼지만 정하면 돼요. | PASS |
| BIZ-C04 | BIZ_CORE_V1 | a26fa8748b74 | 444f315e73fa | PK 0 · 확인 0 · 후보 0 | PARTIAL_EVIDENCE+OUTPUT_EVIDENCE | 794de8f1e9ab | - | - | 경영전략·기획 과제는 해 봤고, 정리만 남았어요 / 뭘 골랐는지만 덧붙이면 돼요. | PASS |
| BIZ-C05 | BIZ_CORE_V1 | 18567ec8cef0 | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | db70f07ab7d6 | - | - | 경영전략·기획 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| BIZ-C06 | BIZ_CORE_V1 | 8edbd04566e1 | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | db70f07ab7d6 | - | - | 경영전략·기획 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| BIZ-C07 | BIZ_CORE_V1 | f45d93c4e842 | c342c5f4bb8a | PK 26 · 확인 18 · 후보 8 | REQUIRED_AXIS+PARTIAL_EVIDENCE | 88660a7ec069 | C-SKIP-CAL | C-SKIP-CAL→CC-008 | 경영전략·기획 과제는 해 봤고, 정리만 남았어요 / 뭘 골랐는지만 덧붙이면 돼요. | XFAIL |
| BIZ-C08 | BIZ_CORE_V1 | 9e42078d8240 | 934d2ddd7bfd | PK 26 · 확인 24 · 후보 2 | PARTIAL_EVIDENCE | db70f07ab7d6 | C-UNSEEN | C-UNSEEN→CC-008 | 경영전략·기획 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | XFAIL |
| BIZ-C09 | BIZ_CORE_V1 | a18d2f025c1e | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | db70f07ab7d6 | - | - | 경영전략·기획 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| BIZ-C10 | BIZ_CORE_V1 | 8d261da64cf2 | 39e5b6715274 | PK 26 · 확인 18 · 후보 8 | - | 27f1858813e1 | - | - | 경영전략·기획과 마케팅·시장 과제는 해 봤고, 정리만 남았어요 / 뭘 골랐는지만 덧붙이면 돼요. | PASS |
| BIZ-C11 | BIZ_CORE_V1 | 5fdbc06fb250 | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | 1186c8508912 | - | - | 경영전략·기획 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| EE-C01 | EE_CORE_V1 | 24738cb7c41b | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | 1131110ce9e9 | - | - | 아날로그 회로 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| EE-C02 | EE_CORE_V1 | c1c45dcda134 | 8a382bf9520c | PK 0 · 확인 0 · 후보 0 | REQUIRED_AXIS+OUTPUT+VERIFICATION | 770bded15d19 | - | - | 아직 직접 해 본 과제는 많지 않아요 / 짧게 한 번 해 보면 이야기할 거리가 생겨요. | PASS |
| EE-C03 | EE_CORE_V1 | 5c3b5694bd8e | b7bda6d3ab6f | PK 26 · 확인 26 · 후보 0 | - | 339ad408e58a | - | - | 아날로그 회로 설계 과제는 해 봤는데, 마음은 다른 쪽에 있어요 / 이 쪽을 계속 볼지만 정하면 돼요. | PASS |
| EE-C04 | EE_CORE_V1 | e3f835636952 | 444f315e73fa | PK 0 · 확인 0 · 후보 0 | PARTIAL_EVIDENCE+OUTPUT_EVIDENCE | b46f26daac9f | - | - | 아날로그 회로 설계 과제는 해 봤고, 정리만 남았어요 / 뭘 골랐는지만 덧붙이면 돼요. | PASS |
| EE-C05 | EE_CORE_V1 | 62bb5bb25224 | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | 1131110ce9e9 | - | - | 아날로그 회로 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| EE-C06 | EE_CORE_V1 | 9205796c182c | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | 1131110ce9e9 | - | - | 아날로그 회로 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| EE-C07 | EE_CORE_V1 | 1b394eec1f5c | 2ea5b621949b | PK 26 · 확인 18 · 후보 8 | PARTIAL_EVIDENCE | 1131110ce9e9 | C-UNSEEN | C-UNSEEN→CC-008 | 아날로그 회로 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | XFAIL |
| EE-C08 | EE_CORE_V1 | 8b944838c0fb | 934d2ddd7bfd | PK 26 · 확인 24 · 후보 2 | PARTIAL_EVIDENCE | 1131110ce9e9 | C-UNSEEN | C-UNSEEN→CC-008 | 아날로그 회로 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | XFAIL |
| EE-C09 | EE_CORE_V1 | cd1f928ff50b | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | 1131110ce9e9 | - | - | 아날로그 회로 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| EE-C10 | EE_CORE_V1 | 406f200ded12 | 41c1da7b177d | PK 26 · 확인 18 · 후보 8 | - | ddf55f306d69 | - | - | 아날로그 회로 설계 과제는 해 봤고, 정리만 남았어요 / 뭘 골랐는지만 덧붙이면 돼요. | PASS |
| EE-C11 | EE_CORE_V1 | 273d7873bfee | 933a5a3265d5 | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | 91937da3a89d | - | - | 아날로그 회로 설계 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| CS-C01 | CS_CORE_V1 | ca039e0cd49b | 5d8ab8777a1c | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | a676048420ca | - | - | 소프트웨어 설계·구조 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| CS-C02 | CS_CORE_V1 | 11845115b8af | 46b5b876e8b8 | PK 0 · 확인 0 · 후보 0 | REQUIRED_AXIS+OUTPUT+VERIFICATION | 75ffb7f477b6 | - | - | 아직 직접 해 본 과제는 많지 않아요 / 짧게 한 번 해 보면 이야기할 거리가 생겨요. | PASS |
| CS-C03 | CS_CORE_V1 | 609df721d141 | 7e60f3c23b50 | PK 26 · 확인 26 · 후보 0 | - | e120863176d4 | - | - | 소프트웨어 설계·구조 과제는 해 봤는데, 마음은 다른 쪽에 있어요 / 이 쪽을 계속 볼지만 정하면 돼요. | PASS |
| CS-C04 | CS_CORE_V1 | 7cb2aa607029 | bddf27889a5f | PK 0 · 확인 0 · 후보 0 | PARTIAL_EVIDENCE+OUTPUT_EVIDENCE | a5056fcb7a87 | - | - | 소프트웨어 설계·구조 과제는 해 봤고, 정리만 남았어요 / 뭘 골랐는지만 덧붙이면 돼요. | PASS |
| CS-C05 | CS_CORE_V1 | 4937d56c94e8 | 5d8ab8777a1c | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | a676048420ca | - | - | 소프트웨어 설계·구조 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| CS-C06 | CS_CORE_V1 | 00b41f428d48 | 5d8ab8777a1c | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | a676048420ca | - | - | 소프트웨어 설계·구조 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| CS-C07 | CS_CORE_V1 | 2c091bf71767 | a3c8c1bd9f16 | PK 26 · 확인 18 · 후보 8 | REQUIRED_AXIS+PARTIAL_EVIDENCE | 0a241b7cc3a7 | C-SKIP-CAL | C-SKIP-CAL→CC-008 | 소프트웨어 설계·구조 과제는 해 봤고, 정리만 남았어요 / 뭘 골랐는지만 덧붙이면 돼요. | XFAIL |
| CS-C08 | CS_CORE_V1 | 8e59c761aba0 | 236639ec7e4c | PK 26 · 확인 24 · 후보 2 | PARTIAL_EVIDENCE | a676048420ca | C-UNSEEN | C-UNSEEN→CC-008 | 소프트웨어 설계·구조 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | XFAIL |
| CS-C09 | CS_CORE_V1 | 2b5a6c62a49c | 5d8ab8777a1c | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | a676048420ca | - | - | 소프트웨어 설계·구조 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |
| CS-C10 | CS_CORE_V1 | 919a09f51602 | 166803ce2c6f | PK 26 · 확인 18 · 후보 8 | - | 1a8c14a90f27 | - | - | 소프트웨어 설계·구조 과제는 해 봤고, 정리만 남았어요 / 뭘 골랐는지만 덧붙이면 돼요. | PASS |
| CS-C11 | CS_CORE_V1 | 09ce0532c85e | 5d8ab8777a1c | PK 26 · 확인 26 · 후보 0 | PARTIAL_EVIDENCE | 5047f3d2edc1 | - | - | 소프트웨어 설계·구조 과제에서 방향을 직접 정해 본 일이 있어요 / 확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요. | PASS |

## 짝 (OUT-3) — 같아야 할 때 같은가 · 다를 때 왜인가

| core | a | b | 관계 | Core 같음 | 글 같음 | 분류 | 까닭(why_same / why_differs) |
|---|---|---|---|---|---|---|---|
| ME_CORE_V3 | ME-C01 | ME-C02 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| ME_CORE_V3 | ME-C01 | ME-C03 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| ME_CORE_V3 | ME-C01 | ME-C04 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| ME_CORE_V3 | ME-C01 | ME-C05 | CORE_SAME | true | true | SAME_AS_EXPECTED | 산업 맥락만 다르다 — Core 판정이 같다. 산업 문장은 팩 절이 따로 든다 |
| ME_CORE_V3 | ME-C01 | ME-C06 | FULL_SAME | true | true | SAME_AS_EXPECTED | 같은 응답 · 차례만 다르다 — 같아야 한다 |
| ME_CORE_V3 | ME-C01 | ME-C07 | CORE_DIFFERS | false | true | DISCREPANCY | 달라진 축이 전부 비필수 · 미요청이다(TD01.J1:CONFIRMED→NOT_OBSERVED, TD01.J2:CONFIRMED→NOT_OBSERVED, TD01.J4:CONFIRMED→NOT_OBSERVED, TD01.J8:CONFIRMED→NOT_OBSERVED) — gapsOf 범위 밖이라 글에 안 선다 · CC-008 |
| ME_CORE_V3 | ME-C01 | ME-C08 | CORE_DIFFERS | false | true | DISCREPANCY | 달라진 축이 전부 비필수 · 미요청이다(TD01.J4:CONFIRMED→NOT_OBSERVED) — gapsOf 범위 밖이라 글에 안 선다 · CC-008 |
| ME_CORE_V3 | ME-C01 | ME-C09 | CORE_SAME | true | true | SAME_AS_EXPECTED | 목표 역할만 다르다 — Core 판정이 같다. 역할 문장은 팩 절이 따로 든다 |
| ME_CORE_V3 | ME-C01 | ME-C11 | CORE_SAME | true | false | TEXT_ONLY_DIFFERS | 학위만 다르다 — Core 판정과 머리글은 같고 할 일의 덧붙이는 줄만 학위에 맞게 갈린다(actionKo 의 stage · 설계된 동작) |
| BIZ_CORE_V1 | BIZ-C01 | BIZ-C02 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| BIZ_CORE_V1 | BIZ-C01 | BIZ-C03 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| BIZ_CORE_V1 | BIZ-C01 | BIZ-C04 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| BIZ_CORE_V1 | BIZ-C01 | BIZ-C05 | CORE_SAME | true | true | SAME_AS_EXPECTED | 산업 맥락만 다르다 — Core 판정이 같다. 산업 문장은 팩 절이 따로 든다 |
| BIZ_CORE_V1 | BIZ-C01 | BIZ-C06 | FULL_SAME | true | true | SAME_AS_EXPECTED | 같은 응답 · 차례만 다르다 — 같아야 한다 |
| BIZ_CORE_V1 | BIZ-C01 | BIZ-C07 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| BIZ_CORE_V1 | BIZ-C01 | BIZ-C08 | CORE_DIFFERS | false | true | DISCREPANCY | 달라진 축이 전부 비필수 · 미요청이다(TD01.J4:CONFIRMED→NOT_OBSERVED) — gapsOf 범위 밖이라 글에 안 선다 · CC-008 |
| BIZ_CORE_V1 | BIZ-C01 | BIZ-C09 | CORE_SAME | true | true | SAME_AS_EXPECTED | 목표 역할만 다르다 — Core 판정이 같다. 역할 문장은 팩 절이 따로 든다 |
| BIZ_CORE_V1 | BIZ-C01 | BIZ-C11 | CORE_SAME | true | false | TEXT_ONLY_DIFFERS | 학위만 다르다 — Core 판정과 머리글은 같고 할 일의 덧붙이는 줄만 학위에 맞게 갈린다(actionKo 의 stage · 설계된 동작) |
| EE_CORE_V1 | EE-C01 | EE-C02 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| EE_CORE_V1 | EE-C01 | EE-C03 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| EE_CORE_V1 | EE-C01 | EE-C04 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| EE_CORE_V1 | EE-C01 | EE-C05 | CORE_SAME | true | true | SAME_AS_EXPECTED | 산업 맥락만 다르다 — Core 판정이 같다. 산업 문장은 팩 절이 따로 든다 |
| EE_CORE_V1 | EE-C01 | EE-C06 | FULL_SAME | true | true | SAME_AS_EXPECTED | 같은 응답 · 차례만 다르다 — 같아야 한다 |
| EE_CORE_V1 | EE-C01 | EE-C07 | CORE_DIFFERS | false | true | DISCREPANCY | 달라진 축이 전부 비필수 · 미요청이다(TD01.J1:CONFIRMED→NOT_OBSERVED, TD01.J2:CONFIRMED→NOT_OBSERVED, TD01.J4:CONFIRMED→NOT_OBSERVED, TD01.J8:CONFIRMED→NOT_OBSERVED) — gapsOf 범위 밖이라 글에 안 선다 · CC-008 |
| EE_CORE_V1 | EE-C01 | EE-C08 | CORE_DIFFERS | false | true | DISCREPANCY | 달라진 축이 전부 비필수 · 미요청이다(TD01.J4:CONFIRMED→NOT_OBSERVED) — gapsOf 범위 밖이라 글에 안 선다 · CC-008 |
| EE_CORE_V1 | EE-C01 | EE-C09 | CORE_SAME | true | true | SAME_AS_EXPECTED | 목표 역할만 다르다 — Core 판정이 같다. 역할 문장은 팩 절이 따로 든다 |
| EE_CORE_V1 | EE-C01 | EE-C11 | CORE_SAME | true | false | TEXT_ONLY_DIFFERS | 학위만 다르다 — Core 판정과 머리글은 같고 할 일의 덧붙이는 줄만 학위에 맞게 갈린다(actionKo 의 stage · 설계된 동작) |
| CS_CORE_V1 | CS-C01 | CS-C02 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| CS_CORE_V1 | CS-C01 | CS-C03 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| CS_CORE_V1 | CS-C01 | CS-C04 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| CS_CORE_V1 | CS-C01 | CS-C05 | CORE_SAME | true | true | SAME_AS_EXPECTED | 산업 맥락만 다르다 — Core 판정이 같다. 산업 문장은 팩 절이 따로 든다 |
| CS_CORE_V1 | CS-C01 | CS-C06 | FULL_SAME | true | true | SAME_AS_EXPECTED | 같은 응답 · 차례만 다르다 — 같아야 한다 |
| CS_CORE_V1 | CS-C01 | CS-C07 | CORE_DIFFERS | false | false | DIFFERS_AS_EXPECTED | 판정이 달라 글도 다르다 |
| CS_CORE_V1 | CS-C01 | CS-C08 | CORE_DIFFERS | false | true | DISCREPANCY | 달라진 축이 전부 비필수 · 미요청이다(TD01.J4:CONFIRMED→NOT_OBSERVED) — gapsOf 범위 밖이라 글에 안 선다 · CC-008 |
| CS_CORE_V1 | CS-C01 | CS-C09 | CORE_SAME | true | true | SAME_AS_EXPECTED | 목표 역할만 다르다 — Core 판정이 같다. 역할 문장은 팩 절이 따로 든다 |
| CS_CORE_V1 | CS-C01 | CS-C11 | CORE_SAME | true | false | TEXT_ONLY_DIFFERS | 학위만 다르다 — Core 판정과 머리글은 같고 할 일의 덧붙이는 줄만 학위에 맞게 갈린다(actionKo 의 stage · 설계된 동작) |
