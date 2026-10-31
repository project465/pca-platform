# 인계: 'AI 티 표시 문제' 방 → 'CareerMatri 본체 개발 및 상용화' 방 (2026-10-31)

대표 결정(2026-10-31): 운영 가지 `claude/amazing-thompson-w3f2o2` 에는 본체 방만 올린다.
이 방은 오늘부터 자기 가지 `claude/lucid-ptolemy-9my676` 이나 PR 로만 올린다.
**PR #10(전공 16개 Core 전공자 검토)은 본체 검토 · 대표 결정 전까지 운영에 합치지 않는다.**

## 이 방이 운영 가지에 이미 올린 것 (오늘, 전부 지금 운영 가지 안에 있다)

| 커밋 | 내용 | DB |
|---|---|---|
| `b2c29d1d` | MAT 자동 알림: 기간권 끝 10·3·0일, 새로 겹치는 공고, 보관 기한 지난 자료 정리 | `schema_mat_auto.sql` (알림 종류 제약) |
| `0f3f39db` | 커리어피크 입구(`/from/careerpeak` → `/partner/careerpeak`, 이름 MAT) | 없음 |
| `d15f23fd` · `321d4b21` | 논문 읽기 채점표(`/admin/research-eval`) · Dockerfile 빌드 힙 4GB | `schema_research_eval.sql` |
| `9c366a6a` | 잡인더스트리 연동: 떠 있는 단추(`public/embed/jobindustry.js`) · 보던 공고 가져오기(`/me/track/import`) · `sites/jobindustry/INSTALL.md` | 없음 |
| `7d917476` | 요금 화면 · 제휴 소개의 MAT 무료 범위 안내(대표 승인) | 없음 |

새 스키마 둘(`schema_mat_auto.sql` · `schema_research_eval.sql`)은 `deploy/db-chain.json` 의 upgrade 목록에
들어 있다. 코드는 표가 없어도 멈추지 않게(쓰기 실패를 삼킴) 짜여 있다. **운영 db:upgrade 는 본체가 돌린다.**
기록상(배포·통합 세션) 오전에 운영·staging 에서 db:upgrade 가 한 번 돌았고, 그 뒤에 들어온 0ec4081e(가격) ·
`schema_research_eval.sql` 은 다음 db:upgrade 에서 반영된다.

## 검사 명령 (이 방이 만든 것)

```bash
npm run mat:auto      # 자동 알림 7가지
npm run mat:eval      # 채점표 25가지 (서버 필요)
npm run partner:check # 잡인더스트리 · 커리어피크 입구 (PARTNER_BASE=…)
JOBINDUSTRY_TEST_HOSTS=127.0.0.1:3988 bash scripts/stage-serve.sh 3151
npm run partner:job   # 잡인더스트리 공고 가져오기 23가지 (가짜 잡인더스트리)
```

## 진행 중이던 것 · 남은 것

- **설치는 끝남(기록상)**: 잡인더스트리 아임웹 Body Code 에 단추 한 줄. 실제 공고 화면에서 단추 → 소개 쪽까지
  배포·통합 세션이 확인. **로그인 뒤 `이 공고 맞대 보기` 로 실제 공고가 읽히는지는 아직 아무도 못 봤다**
  (잡인더스트리가 바깥 서버 접속을 막으면 `공고 화면을 열지 못했습니다` 로 안내된다)
- **커리어피크 단추**: `sites/careerpeak/` 에 코드만 있고 붙이지 않았다. `home` 주소(`https://www.careerpeak.co.kr`)는 미확인
- **논문 읽기 실제 품질**: 0건 측정. 채점표는 섰고, 석·박사 10건이 채점돼야 판정이 나온다
- **대표가 정해야 하는 것**
  - Railway Postgres 백업 없음("No Backups", Pro 필요)
  - DB 지역 US West 인데 개인정보처리방침은 AI 분석 외 국외 이전이 없다고 적혀 있음 → 방침 수정 또는 이전 결정 필요
  - VAPID 열쇠 두 개를 Variables 에 넣기(값은 운영 콘솔 화면에만 있음)
- **설계 문서**: Claude Docs `MAT 100% 자동화 설계` (https://claude.ai/artifact/J5Pg2npaAz6HoE3zkbbWEY)
