-- 파일럿이 묻는 것을 여덟 가지로 맞춘다.
--
-- 받은 규격 §20 의 열 문항은 **그대로 둔다**(물음을 바꾸면 다른 것을 재게
-- 되고, 그러면 파일럿 결과를 규격과 견줄 수 없다). 더하는 것은 이번
-- 파일럿이 반드시 받아 와야 하는 여덟 가지다.
--
--   1. 결과가 본인과 맞는지              P11_FIT
--   2. 왜 그 직무가 나왔는지 이해했는지   P12_WHY
--   3. 새롭게 알게 된 직무가 있는지       P13_NEWROLE · P13B_NEWROLE_NAME
--   4. 부족한 근거가 무엇인지 이해했는지  P14_GAPCLEAR (+ 규격 P02_GAP)
--   5. 다음 행동이 실제로 실행 가능한지   P15_DOABLE (+ 규격 P03_NEXT)
--   6. 등급 사이에 가치 차이가 느껴지는지 P16_TIERVALUE
--   7. 이해하기 어려운 표현               규격 P06_CONFUSING
--   8. 진로 판단이 달라졌는지             P17_CHANGED
--
-- **점수를 만들지 않는다.** 이 표의 어느 값도 적합도에 들어가지 않는다
-- (`survey_items` 와 같은 규칙).

-- 무엇을 재는 칸인가. **검사가 코드로 짐작하지 않게** 데이터로 적는다:
-- 문항을 하나 더 넣는 사람이 그 칸만 채우면 `pilot:check` 가 따라온다.
ALTER TABLE pilot_items ADD COLUMN IF NOT EXISTS topic TEXT;

-- 누구에게 보이는가. `all` 은 전부, `paid` 는 **유료 등급으로 응시한 분만**.
-- 무료 BASIC 만 받은 분께 "유료와의 차이가 느껴집니까" 를 물으면 받은 적
-- 없는 것을 견주게 하는 셈이고, 그 답은 분포에서 거짓이 된다.
--
-- **ME_V2 에는 같은 응시를 넓히는 업그레이드가 없다.** 등급마다 문항 수가
-- 달라서(48 · 68 · 92) 48문항을 푼 응시에 유료 절을 얹을 수 없다. 그래서
-- 묻는 것을 '무료와 견주어 보라' 가 아니라 **'유료에만 있는 부분이 값을 낼
-- 만했는가'** 로 두었다. 받은 사람이 답할 수 있는 물음만 묻는다.
ALTER TABLE pilot_items ADD COLUMN IF NOT EXISTS cohort TEXT NOT NULL DEFAULT 'all';

DO $$ BEGIN
  ALTER TABLE pilot_items ADD CONSTRAINT pilot_items_cohort_chk
    CHECK (cohort IN ('all', 'paid'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN pilot_items.topic IS
  '이 문항이 재는 칸. pilot:check 가 여덟 가지가 덮였는지 이 값으로 센다';
COMMENT ON COLUMN pilot_items.cohort IS
  'all = 전부 · paid = 유료 구간이 열린 응시만. 받은 적 없는 것을 견주게
   하지 않는다';

-- 규격 열 문항에 칸 이름을 붙인다. 문면은 한 글자도 고치지 않는다
UPDATE pilot_items SET topic = 'paths'      WHERE code = 'P01_PATHS';
UPDATE pilot_items SET topic = 'gap'        WHERE code = 'P02_GAP';
UPDATE pilot_items SET topic = 'action'     WHERE code = 'P03_NEXT';
UPDATE pilot_items SET topic = 'clarity'    WHERE code = 'P04_CLARITY';
UPDATE pilot_items SET topic = 'useful'     WHERE code = 'P05_USEFUL';
UPDATE pilot_items SET topic = 'wording'    WHERE code = 'P06_CONFUSING';
UPDATE pilot_items SET topic = 'wtp'        WHERE code = 'P07_WTP';
UPDATE pilot_items SET topic = 'price'      WHERE code = 'P08_PRICE';
UPDATE pilot_items SET topic = 'recommend'  WHERE code = 'P09_RECOMMEND';
UPDATE pilot_items SET topic = 'again'      WHERE code = 'P10_AGAIN';

-- **고르는 것이 먼저고 적는 것이 나중이다.** 자유입력이 앞에 서면 세
-- 번째에서 닫는다. 척도를 앞에 모으고 적는 칸을 뒤로 돌린다
UPDATE pilot_items SET order_no = 15 WHERE code = 'P01_PATHS';
UPDATE pilot_items SET order_no = 16 WHERE code = 'P02_GAP';
UPDATE pilot_items SET order_no = 17 WHERE code = 'P03_NEXT';
UPDATE pilot_items SET order_no =  5 WHERE code = 'P04_CLARITY';
UPDATE pilot_items SET order_no = 19 WHERE code = 'P05_USEFUL';
UPDATE pilot_items SET order_no = 18 WHERE code = 'P06_CONFUSING';
UPDATE pilot_items SET order_no =  8 WHERE code = 'P07_WTP';
UPDATE pilot_items SET order_no = 20 WHERE code = 'P08_PRICE';
UPDATE pilot_items SET order_no =  9 WHERE code = 'P09_RECOMMEND';
UPDATE pilot_items SET order_no = 21 WHERE code = 'P10_AGAIN';

INSERT INTO pilot_items (code, order_no, kind, ko, en, topic, cohort) VALUES
  ('P11_FIT', 1, 'scale',
   '결과지에 적힌 것이 본인을 설명한다고 느끼셨습니까?',
   'Did the report describe you?',
   'fit', 'all'),
  ('P12_WHY', 2, 'scale',
   '그 직무들이 왜 나왔는지 결과지만 읽고 설명할 수 있습니까?',
   'Can you explain, from the report alone, why those roles came up?',
   'why', 'all'),
  ('P13_NEWROLE', 3, 'scale',
   '전에 생각해 보지 않은 직무를 결과지에서 보셨습니까?',
   'Did the report show you a role you had not considered?',
   'newrole', 'all'),
  ('P14_GAPCLEAR', 4, 'scale',
   '지금 어떤 근거가 부족한지 분명해졌습니까?',
   'Is it clear which evidence you are missing?',
   'gap_clear', 'all'),
  ('P15_DOABLE', 6, 'scale',
   '적힌 다음 행동을 실제로 하실 수 있습니까?',
   'Can you actually do the next steps as written?',
   'doable', 'all'),
  ('P17_CHANGED', 7, 'scale',
   '결과지를 읽고 진로에 대한 판단이 달라졌습니까?',
   'Did the report change how you judge your career options?',
   'changed', 'all'),
  ('P16_TIERVALUE', 10, 'scale',
   '무료 BASIC 에는 없고 지금 받으신 결과에만 있는 부분(조직이 보는 결과 · 비어 있는 증거 · 더 긴 계획)이 값을 낼 만했습니까?',
   'Were the parts that only the paid report carries (what an organisation counts, the empty evidence, the longer plan) worth paying for?',
   'tier_value', 'paid'),
  ('P13B_NEWROLE_NAME', 14, 'text',
   '새롭게 알게 된 직무가 있으면 그 이름을 적어 주십시오.',
   'If a role was new to you, write its name.',
   'newrole_name', 'all')
ON CONFLICT (code) DO UPDATE
  SET order_no = EXCLUDED.order_no, kind = EXCLUDED.kind,
      ko = EXCLUDED.ko, en = EXCLUDED.en,
      topic = EXCLUDED.topic, cohort = EXCLUDED.cohort, active = true;
