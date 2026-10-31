-- ============================================================
--  커리어피크 상담 신청 (2026-10-31 대표 결정)
--
--  `내 자료 읽기` 결과 화면에서 "커리어피크 상담 신청" 을 누르면 한 장 요약과
--  연락처를 커리어피크 상담 메일함(`CAREERPEAK_CONSULT_EMAIL`)으로 보낸다.
--  같은 회사(주식회사 에이치에이연구원)의 다른 서비스라 제3자 제공이 아니라
--  회사 안의 이용이다. 그래도 **보내기 전에 따로 동의를 받고, 그 동의를 여기
--  한 줄로 남긴다**: 누가(user_id) · 언제(consented_at) · 무엇을(items · doc_id ·
--  consent_version).
--
--  **보낸 글은 담지 않는다.** 요약 본문 · 메일 주소 · 전화번호는 메일로만 나가고
--  이 표에는 무엇을 보냈는지의 이름만 남는다(`summary` · `email` · `phone`).
--  원본 파일은 애초에 저장하지 않는다(`schema_research.sql`).
--
--  **보관은 상담 종료 후 1년이다.** 상담이 언제 끝났는지는 CareerMatri 가
--  모르므로 신청한 날부터 1년(`purge_after`)으로 둔다. 상담이 길어져 그보다
--  늦게 끝나면 운영자가 `closed_on` 을 적고 `purge_after` 를 그날부터 1년으로
--  민다. 밤 당번(`nudges.ts`)이 지난 줄을 지운다.
--
--  **표를 따로 둔다**(`schema_brand.sql` 과 같은 까닭). 이 파일을 올리기 전에는
--  신청 단추가 기록을 남기지 못하므로 보내지 않는다(`careerpeak-consult.ts`).
-- ============================================================

CREATE TABLE IF NOT EXISTS careerpeak_consults (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  /* 어느 정리를 보냈나. 그 정리를 나중에 지워도 동의 기록은 남는다 */
  doc_id           BIGINT REFERENCES research_docs(id) ON DELETE SET NULL,
  /* 보낸 것의 이름. 글은 담지 않는다 */
  items            TEXT[] NOT NULL CHECK (items <@ ARRAY['summary', 'email', 'phone', 'name']::text[]),
  /* 동의 문구의 판. 문구를 바꾸면 판을 올린다(`careerpeak-consult.ts`) */
  consent_version  TEXT NOT NULL,
  consented_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* 메일이 나갔나. 실패하면 failed 로 남고 사람에게 다시 누르라고 한다 */
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at          TIMESTAMPTZ,
  /* 상담이 끝난 날(운영자가 적는다). 비어 있으면 신청한 날부터 센다 */
  closed_on        DATE,
  purge_after      DATE NOT NULL DEFAULT (now() + interval '1 year')::date
);
CREATE INDEX IF NOT EXISTS careerpeak_consults_user_idx ON careerpeak_consults(user_id, consented_at DESC);
CREATE INDEX IF NOT EXISTS careerpeak_consults_purge_idx ON careerpeak_consults(purge_after);

COMMENT ON TABLE careerpeak_consults IS
  '커리어피크 상담 신청의 동의 기록(누가·언제·무엇을). 보낸 요약·연락처 본문은 담지 않는다. 상담 종료 후 1년 보관';
