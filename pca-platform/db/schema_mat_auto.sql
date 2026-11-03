-- ============================================================
--  MAT 이 사람 없이 먼저 말을 거는 자리 두 가지 (2026-10-31 · 100% 자동화)
--
--  renew  기간권이 끝나기 10일 전 · 3일 전 · 끝나는 날(작업지시서 4-1).
--         다시 사면 끝나는 날 뒤에 이어 붙는다는 것과, 끝나도 자료는 남는다는 것을 알린다
--  match  내 자료와 겹치는 공고가 이번 주에 새로 올라왔다(`match.ts`).
--         기간권이 없는 분에게도 보낸다: 세 건까지는 무료로 보이고 나머지는 기간권에서 열린다
--
--  **알림 줄 표의 종류 제약만 넓힌다.** 표를 새로 만들지 않는다: 같은 줄이 홈 · 메일 ·
--  기기 알림의 근거가 되는 구조(`nudges.ts`)를 그대로 탄다.
-- ============================================================

DO $$
BEGIN
  ALTER TABLE assistant_nudges DROP CONSTRAINT IF EXISTS assistant_nudges_kind_check;
  ALTER TABLE assistant_nudges ADD CONSTRAINT assistant_nudges_kind_check
    CHECK (kind IN ('weekly', 'deadline', 'gap', 'welcome', 'renew', 'match'));
END $$;
