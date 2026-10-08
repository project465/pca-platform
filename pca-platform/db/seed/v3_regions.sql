-- 권역 다섯과 산업 여덟. **기업 자료는 한 줄도 없다.**
--
-- 이 시드가 넣는 것은 **열쇠뿐**이다. 기관 수와 사업체 수와 요구 강도는
-- 공개 통계와 공고 자료가 와야 서고, 그 표는 출처와 기준 연도 없이 줄이
-- 서지 않는다. 열쇠를 먼저 두는 까닭은 화면이 가리킬 자리가 있어야
-- `아직 자료가 없다` 를 적을 수 있기 때문이다.
--
-- 적용: psql --single-transaction -f db/seed/v3_regions.sql

INSERT INTO regions (code, name, market_code, adjacent, source) VALUES
 ('KR-CAPITAL',      '수도권',   'KR', ARRAY['KR-CHUNGCHEONG'], '행정구역 권역 구분'),
 ('KR-CHUNGCHEONG',  '충청권',   'KR', ARRAY['KR-CAPITAL','KR-YEONGNAM','KR-HONAM'], '행정구역 권역 구분'),
 ('KR-YEONGNAM',     '영남권',   'KR', ARRAY['KR-CHUNGCHEONG','KR-HONAM'], '행정구역 권역 구분'),
 ('KR-HONAM',        '호남권',   'KR', ARRAY['KR-CHUNGCHEONG','KR-YEONGNAM'], '행정구역 권역 구분'),
 ('KR-ETC',          '그 밖',    'KR', ARRAY[]::TEXT[], '행정구역 권역 구분')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, adjacent = EXCLUDED.adjacent, source = EXCLUDED.source;

-- **산업 목록을 DB 에 넣지 않는다.** V3 의 산업 정본은 그 core 의 산업팩
-- 파일이고(`industry-packs-v2.json`) 코드와 이름이 거기 함께 있다. DB 에
-- 한 벌 더 두면 산업을 늘리는 날 한쪽만 늘어난다. 그리고 `industries` 라는
-- 이름은 이미 옛 표가 쓰고 있다.
