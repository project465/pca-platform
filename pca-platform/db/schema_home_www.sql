/* 홈페이지의 정규 주소를 www 로 (2026-10-26).

   소개 사이트는 Railway 에 올라 `www.careermatri.com` 으로 선다. www 없는
   `careermatri.com` 은 아직 예전 Vercel 프로젝트(단체 PCA 안내 한 장)를
   가리킨다. 그런데 앱의 로고·꼬리말이 읽는 홈페이지 주소(`marketingHome()`)가
   www 없는 쪽이라, 로그인하지 않은 사람이 로고를 누르면 **우리 홈페이지가
   아닌 다른 제품의 안내 쪽**에 떨어졌다(운영 크롤러가 찾았다).

   `domain` 은 그대로 둔다: 시장을 고르는 자리(`siteByHost`)가 그 값을 쓴다.
   바꾸는 것은 사람을 보내는 주소 하나다. 손으로 다른 값을 넣어 둔 줄은
   건드리지 않는다(앞 값이 www 없는 주소일 때만 바꾼다). */
UPDATE site_configs
   SET canonical_url = 'https://www.careermatri.com'
 WHERE domain = 'careermatri.com'
   AND canonical_url IN ('https://careermatri.com', 'https://careermatri.com/');
