# Track B · 배재대 학과 자리별 검사 → 결과 (서버 레벨)

- 실행: 2026-10-20T08:29Z · DB `postgres:///cm_dev` (로컬 개발 DB · 운영 아님) · 동시 4
- 길: 학교 학생 등록 → 학교 맥락 응시 → 끝까지 답함 → 제출 → 결과 모델 · 판본 · 학교/학과 표시. **브라우저 아님** (화면은 NOT VERIFIED).
- PCU 자리 117 = 검사 대상 115 + 전공 고르기 2 + Core 없음 0

**학과 자리 통과 115 / 115** · 전체 실행 통과 153 / 153 · 학생별 결과 갈림 19 / 19 Core

## 학생에 따라 결과가 갈리는가 (Core 마다 첫 자리 · 사람 A/B/C 의 영역 판정)

| Core | 자리 | A≠B | B≠C | A≠C |
|---|---|---|---|---|
| LANG_CORE_V1 | PCU26_KOREAN | 다름 | 다름 | 다름 |
| LAW_CORE_V1 | PCU26_POLICE | 다름 | 다름 | 다름 |
| PUBADM_CORE_V1 | PCU26_PUBADM_GENERAL | 다름 | 다름 | 다름 |
| PSY_CORE_V1 | PCU26_PSY | 다름 | 다름 | 다름 |
| EDU_CORE_V1 | PCU26_EARLYCHILD | 다름 | 다름 | 다름 |
| BIZ_CORE_V1 | PCU26_BIZ | 다름 | 다름 | 다름 |
| BT_CORE_V1 | PCU26_BT | 다름 | 다름 | 다름 |
| FOOD_CORE_V1 | PCU26_FOOD | 다름 | 다름 | 다름 |
| AGRI_CORE_V1 | PCU26_HORTI | 다름 | 다름 | 다름 |
| HEALTH_CORE_V1 | PCU26_HEALTHWELFARE | 다름 | 다름 | 다름 |
| NURSING_CORE_V1 | PCU26_NURSING | 다름 | 다름 | 다름 |
| SPORTS_CORE_V1 | PCU26_SPORTSREHAB | 다름 | 다름 | 다름 |
| EE_CORE_V1 | PCU26_EE | 다름 | 다름 | 다름 |
| CIV_CORE_V1 | PCU26_RAIL | 다름 | 다름 | 다름 |
| CS_CORE_V1 | PCU26_SWF_COMPUTER | 다름 | 다름 | 다름 |
| ARCH_CORE_V1 | PCU26_ARCH | 다름 | 다름 | 다름 |
| VISUAL_CORE_V1 | PCU26_ARTWEBTOON_MAIN | 다름 | 다름 | 다름 |
| MEDIA_CORE_V1 | PCU26_ADPHOTO | 다름 | 다름 | 다름 |
| STYLE_CORE_V1 | PCU26_FASHION | 다름 | 다름 | 다름 |

## 자리마다 (사람 B)

| 판정 | 자리 | 학과 | Core | 갈래 | 결과에 적힌 학과 | 걸린 까닭 | 초 |
|---|---|---|---|---|---|---|---|
| PASS | PCU26_KOREAN | 국어국문한국어교육학과 | LANG_CORE_V1 | SPEC_LANG_KOREAN | 국어국문한국어교육학과 |  | 14 |
| PASS | PCU26_JAPAN | 일본학과 | LANG_CORE_V1 | SPEC_LANG_JAPAN | 일본학과 |  | 14 |
| PASS | PCU26_POLICE | 경찰학전공 | LAW_CORE_V1 | SPEC_LAW_POLICE | 경찰법학부 · 경찰학전공 |  | 13 |
| PASS | PCU26_LAW | 법학전공 | LAW_CORE_V1 | SPEC_LAW_LAW | 경찰법학부 · 법학전공 |  | 14 |
| PASS | PCU26_PUBADM_GENERAL | 일반행정트랙 | PUBADM_CORE_V1 | SPEC_PUBADM_GENERAL | 행정학과 · 일반행정트랙 |  | 14 |
| PASS | PCU26_PUBADM_FIRE | 소방행정트랙 | PUBADM_CORE_V1 | SPEC_PUBADM_FIRE | 행정학과 · 소방행정트랙 |  | 13 |
| PASS | PCU26_PSY | 심리상담학과 | PSY_CORE_V1 | — | 심리상담학과 |  | 13 |
| PASS | PCU26_EARLYCHILD | 유아교육과 | EDU_CORE_V1 | SPEC_EDU_EARLYCHILD | 유아교육과 |  | 13 |
| PASS | PCU26_BIZ | 경영학과 | BIZ_CORE_V1 | SPEC_BIZ_GENERAL | 경영학과 |  | 13 |
| PASS | PCU26_MIS | IT경영정보학과 | BIZ_CORE_V1 | SPEC_BIZ_MIS | IT경영정보학과 |  | 13 |
| PASS | PCU26_GLOBALBIZ | 글로벌비즈니스학과 | BIZ_CORE_V1 | SPEC_BIZ_GLOBAL | 글로벌비즈니스학과 |  | 13 |
| PASS | PCU26_TOURISM | 관광경영학과 | BIZ_CORE_V1 | SPEC_BIZ_TOURISM | 관광경영학과 |  | 13 |
| PASS | PCU26_HOTELAIR | 호텔항공경영학과 | BIZ_CORE_V1 | SPEC_BIZ_HOTEL_AIR | 호텔항공경영학과 |  | 12 |
| PASS | PCU26_AIRSERVICE | 항공서비스학과 | BIZ_CORE_V1 | SPEC_BIZ_AIR_SERVICE | 항공서비스학과 |  | 12 |
| PASS | PCU26_BT | 생명공학과 | BT_CORE_V1 | — | 생명공학과 |  | 12 |
| PASS | PCU26_FOOD | 식품영양학과 | FOOD_CORE_V1 | SPEC_FOOD_NUTRITION | 식품영양학과 |  | 13 |
| PASS | PCU26_CULINARY | 외식조리학과 | FOOD_CORE_V1 | SPEC_FOOD_CULINARY | 외식조리학과 |  | 13 |
| PASS | PCU26_HORTI | 원예산림학과 | AGRI_CORE_V1 | SPEC_AGRI_HORTIFOREST | 원예산림학과 |  | 13 |
| PASS | PCU26_HEALTHWELFARE | 보건의료복지학과 | HEALTH_CORE_V1 | SPEC_HEALTH_GENERAL | 보건의료복지학과 |  | 13 |
| PASS | PCU26_NURSING | 간호학과 | NURSING_CORE_V1 | — | 간호학과 |  | 13 |
| PASS | PCU26_SPORTSREHAB | 운동재활복지학과 | SPORTS_CORE_V1 | SPORTS_REHAB | 운동재활복지학과 |  | 12 |
| PASS | PCU26_EE | 전기전자공학과 | EE_CORE_V1 | SPEC_EE_GENERAL | 전기전자공학과 |  | 12 |
| PASS | PCU26_BATTERY | 스마트배터리학과 | EE_CORE_V1 | SPEC_EE_BATTERY | 스마트배터리학과 |  | 12 |
| PASS | PCU26_DRONE | 드론로봇공학과 | EE_CORE_V1 | SPEC_EE_ROBOT | 드론로봇공학과 |  | 12 |
| PASS | PCU26_RAIL | 철도건설공학과 | CIV_CORE_V1 | SPEC_CIV_RAIL | 철도건설공학과 |  | 12 |
| PASS | PCU26_SWF_COMPUTER | 컴퓨터공학전공 | CS_CORE_V1 | SPEC_CS_COMPUTER | 소프트웨어공학부 · 컴퓨터공학전공 |  | 12 |
| PASS | PCU26_SWF_SOFTWARE | 소프트웨어학전공 | CS_CORE_V1 | SPEC_CS_SOFTWARE | 소프트웨어공학부 · 소프트웨어학전공 |  | 12 |
| PASS | PCU26_SWF_SECURITY | 정보보안학전공 | CS_CORE_V1 | SPEC_CS_SECURITY | 소프트웨어공학부 · 정보보안학전공 |  | 12 |
| PASS | PCU26_SWF_GAME | 게임공학전공 | CS_CORE_V1 | SPEC_CS_GAME | 소프트웨어공학부 · 게임공학전공 |  | 13 |
| PASS | PCU26_ARCH | 건축학과 | ARCH_CORE_V1 | SPEC_ARCH_BUILDING | 건축학과 |  | 13 |
| PASS | PCU26_INTERIOR | 실내건축학과 | ARCH_CORE_V1 | SPEC_ARCH_INTERIOR | 실내건축학과 |  | 13 |
| PASS | PCU26_LANDSCAPE | 조경학과 | AGRI_CORE_V1 | SPEC_AGRI_LANDSCAPE | 조경학과 |  | 13 |
| PASS | PCU26_ARTWEBTOON_MAIN | 아트앤웹툰전공 | VISUAL_CORE_V1 | SPEC_VISUAL_WEBTOON | 아트앤웹툰학부 · 아트앤웹툰전공 |  | 12 |
| PASS | PCU26_GAMEANIM | 게임애니메이션전공 | VISUAL_CORE_V1 | SPEC_VISUAL_GAMEANIM | 아트앤웹툰학부 · 게임애니메이션전공 |  | 12 |
| PASS | PCU26_DESIGN_COMM | 커뮤니케이션디자인전공 | VISUAL_CORE_V1 | SPEC_VISUAL_COMM | 디자인학부 · 커뮤니케이션디자인전공 |  | 12 |
| PASS | PCU26_DESIGN_IND | 산업디자인전공 | VISUAL_CORE_V1 | SPEC_VISUAL_INDUSTRIAL | 디자인학부 · 산업디자인전공 |  | 12 |
| PASS | PCU26_ADPHOTO | 광고사진영상학과 | MEDIA_CORE_V1 | SPEC_MEDIA_ADPHOTO | 광고사진영상학과 |  | 13 |
| PASS | PCU26_MEDIACONTENT | 미디어콘텐츠학과 | MEDIA_CORE_V1 | SPEC_MEDIA_CONTENT | 미디어콘텐츠학과 |  | 13 |
| PASS | PCU26_FASHION | 의류패션학과 | STYLE_CORE_V1 | SPEC_STYLE_FASHION | 의류패션학과 |  | 13 |
| PASS | PCU26_BEAUTY | 뷰티케어학과 | STYLE_CORE_V1 | SPEC_STYLE_BEAUTY | 뷰티케어학과 |  | 13 |
| PASS | PCU26_PERFORM_MUSIC | 음악트랙 | MEDIA_CORE_V1 | SPEC_MEDIA_MUSIC | 공연예술학과 · 음악트랙 |  | 13 |
| PASS | PCU26_PERFORM_FILM | 영화영상트랙 | MEDIA_CORE_V1 | SPEC_MEDIA_FILM | 공연예술학과 · 영화영상트랙 |  | 12 |
| PASS | PCU26_LEISURE_COACH | 스포츠지도·건강재활전공 | SPORTS_CORE_V1 | SPORTS_COACHING | 레저스포츠학부 · 스포츠지도·건강재활전공 |  | 13 |
| PASS | PCU26_LEISURE_MKT | 스포츠마케팅전공 | BIZ_CORE_V1 | SPEC_BIZ_SPORTS_MKT | 레저스포츠학부 · 스포츠마케팅전공 |  | 13 |
| PASS | PCU26_LIFE_STYLING | 라이프스타일링전공 | STYLE_CORE_V1 | SPEC_STYLE_LIFE | 평생교육융합학부 · 라이프스타일링전공 |  | 12 |
| PASS | PCU26_LIFE_CARE | 라이프케어전공 | HEALTH_CORE_V1 | SPEC_HEALTH_LIFECARE | 평생교육융합학부 · 라이프케어전공 |  | 12 |
| PASS | PCU26_LIFE_LOCALBIZ | 지역소상공비즈니스전공 | BIZ_CORE_V1 | SPEC_BIZ_LOCAL_SME | 평생교육융합학부 · 지역소상공비즈니스전공 |  | 12 |
| PASS | PCU26_LIFE_REALESTATE | 부동산재테크전공 | BIZ_CORE_V1 | SPEC_BIZ_REALESTATE | 평생교육융합학부 · 부동산재테크전공 |  | 13 |
| PASS | PCU26_LIFE_SENIOR | 시니어운동처방전공 | SPORTS_CORE_V1 | SPORTS_SENIOR | 평생교육융합학부 · 시니어운동처방전공 |  | 13 |
| PASS | PCU26_LIFE_HUMANARTS | 인문예술창작전공 | LANG_CORE_V1 | SPEC_LANG_CREATIVE | 평생교육융합학부 · 인문예술창작전공 |  | 13 |
| PASS | PCU26_GLOBAL_KORTRANS | 직무한국어번역전공 | LANG_CORE_V1 | SPEC_LANG_KORTRANS | 글로벌융합학부 · 직무한국어번역전공 |  | 13 |
| PASS | PCU26_GLOBAL_ARTCULTURE | 아트컬처비즈니스전공 | BIZ_CORE_V1 | SPEC_BIZ_CULTURE_BIZ | 글로벌융합학부 · 아트컬처비즈니스전공 |  | 13 |
| PASS | PCU26_GLOBAL_MGMT | 글로벌경영전공 | BIZ_CORE_V1 | SPEC_BIZ_GLOBAL_MGMT | 글로벌융합학부 · 글로벌경영전공 |  | 14 |
| PASS | PCU26_GLOBAL_IT | 글로벌IT전공 | CS_CORE_V1 | SPEC_CS_GLOBAL_IT | 글로벌융합학부 · 글로벌IT전공 |  | 13 |
| PASS | PCU26_GLOBAL_BEAUTY | 뷰티패션산업전공 | STYLE_CORE_V1 | SPEC_STYLE_BEAUTYBIZ | 글로벌융합학부 · 뷰티패션산업전공 |  | 13 |
| PASS | PCU26_GLOBAL_MEDTOUR | 국제의료관광전공 | BIZ_CORE_V1 | SPEC_BIZ_MEDTOUR | 글로벌융합학부 · 국제의료관광전공 |  | 13 |
| PASS | PCU27_KOREAN | 국어국문한국어교육학과 | LANG_CORE_V1 | SPEC_LANG_KOREAN | 국어국문한국어교육학과 |  | 13 |
| PASS | PCU27_JAPAN | 일본학과 | LANG_CORE_V1 | SPEC_LANG_JAPAN | 일본학과 |  | 13 |
| PASS | PCU27_POLICE | 경찰학전공 | LAW_CORE_V1 | SPEC_LAW_POLICE | 경찰법학부 · 경찰학전공 |  | 13 |
| PASS | PCU27_LAW | 법학전공 | LAW_CORE_V1 | SPEC_LAW_LAW | 경찰법학부 · 법학전공 |  | 13 |
| PASS | PCU27_PUBADM_GENERAL | 일반행정트랙 | PUBADM_CORE_V1 | SPEC_PUBADM_GENERAL | 행정학과 · 일반행정트랙 |  | 13 |
| PASS | PCU27_PUBADM_FIRE | 소방행정트랙 | PUBADM_CORE_V1 | SPEC_PUBADM_FIRE | 행정학과 · 소방행정트랙 |  | 12 |
| PASS | PCU27_PSY | 심리상담학과 | PSY_CORE_V1 | — | 심리상담학과 |  | 13 |
| PASS | PCU27_EARLYCHILD | 유아교육과 | EDU_CORE_V1 | SPEC_EDU_EARLYCHILD | 유아교육과 |  | 13 |
| PASS | PCU27_BIZ | 경영학과 | BIZ_CORE_V1 | SPEC_BIZ_GENERAL | 경영학과 |  | 12 |
| PASS | PCU27_MIS | IT경영정보학과 | BIZ_CORE_V1 | SPEC_BIZ_MIS | IT경영정보학과 |  | 12 |
| PASS | PCU27_GLOBALBIZ | 글로벌비즈니스학과 | BIZ_CORE_V1 | SPEC_BIZ_GLOBAL | 글로벌비즈니스학과 |  | 12 |
| PASS | PCU27_TOURISM | 관광경영학과 | BIZ_CORE_V1 | SPEC_BIZ_TOURISM | 관광경영학과 |  | 12 |
| PASS | PCU27_HOTELAIR | 호텔항공경영학과 | BIZ_CORE_V1 | SPEC_BIZ_HOTEL_AIR | 호텔항공경영학과 |  | 12 |
| PASS | PCU27_AIRSERVICE | 항공서비스학과 | BIZ_CORE_V1 | SPEC_BIZ_AIR_SERVICE | 항공서비스학과 |  | 12 |
| PASS | PCU27_BT | 생명공학과 | BT_CORE_V1 | — | 생명공학과 |  | 12 |
| PASS | PCU27_FOOD | 식품영양학과 | FOOD_CORE_V1 | SPEC_FOOD_NUTRITION | 식품영양학과 |  | 12 |
| PASS | PCU27_CULINARY | 외식조리학과 | FOOD_CORE_V1 | SPEC_FOOD_CULINARY | 외식조리학과 |  | 12 |
| PASS | PCU27_HORTI | 원예산림학과 | AGRI_CORE_V1 | SPEC_AGRI_HORTIFOREST | 원예산림학과 |  | 12 |
| PASS | PCU27_HEALTHWELFARE | 보건의료복지학과 | HEALTH_CORE_V1 | SPEC_HEALTH_GENERAL | 보건의료복지학과 |  | 12 |
| PASS | PCU27_NURSING | 간호학과 | NURSING_CORE_V1 | — | 간호학과 |  | 12 |
| PASS | PCU27_SPORTSREHAB | 운동재활복지학과 | SPORTS_CORE_V1 | SPORTS_REHAB | 운동재활복지학과 |  | 12 |
| PASS | PCU27_EE_POWER | 전기공학과 | EE_CORE_V1 | SPEC_EE_POWER | 전기공학과 |  | 12 |
| PASS | PCU27_BATTERY | 스마트배터리학과 | EE_CORE_V1 | SPEC_EE_BATTERY | 스마트배터리학과 |  | 12 |
| PASS | PCU27_RAIL_CIVIL | 철도건설공학과 | CIV_CORE_V1 | SPEC_CIV_RAIL | 철도건설공학과 |  | 12 |
| PASS | PCU27_AISW_COMPUTER | 컴퓨터공학전공 | CS_CORE_V1 | SPEC_CS_COMPUTER | AI소프트웨어공학부 · 컴퓨터공학전공 |  | 12 |
| PASS | PCU27_AISW_SOFTWARE | 소프트웨어학전공 | CS_CORE_V1 | SPEC_CS_SOFTWARE | AI소프트웨어공학부 · 소프트웨어학전공 |  | 12 |
| PASS | PCU27_AISW_SECURITY | 정보보안학전공 | CS_CORE_V1 | SPEC_CS_SECURITY | AI소프트웨어공학부 · 정보보안학전공 |  | 12 |
| PASS | PCU27_AISW_GAME | 게임공학전공 | CS_CORE_V1 | SPEC_CS_GAME | AI소프트웨어공학부 · 게임공학전공 |  | 12 |
| PASS | PCU27_AISW_AI | 인공지능전공 | CS_CORE_V1 | SPEC_CS_AI | AI소프트웨어공학부 · 인공지능전공 |  | 12 |
| PASS | PCU27_PHYSAI_DRONE | 드론로봇공학전공 | EE_CORE_V1 | SPEC_EE_ROBOT | 피지컬AI공학부 · 드론로봇공학전공 |  | 12 |
| PASS | PCU27_PHYSAI_ELEC | AI융합전자전공 | EE_CORE_V1 | SPEC_EE_ELEC | 피지컬AI공학부 · AI융합전자전공 |  | 12 |
| PASS | PCU27_ARCH | 건축학과 | ARCH_CORE_V1 | SPEC_ARCH_BUILDING | 건축학과 |  | 12 |
| PASS | PCU27_INTERIOR | 실내건축학과 | ARCH_CORE_V1 | SPEC_ARCH_INTERIOR | 실내건축학과 |  | 12 |
| PASS | PCU27_LANDSCAPE | 조경학과 | AGRI_CORE_V1 | SPEC_AGRI_LANDSCAPE | 조경학과 |  | 12 |
| PASS | PCU27_ARTWEBTOON_MAIN | 아트앤웹툰전공 | VISUAL_CORE_V1 | SPEC_VISUAL_WEBTOON | 아트앤웹툰학부 · 아트앤웹툰전공 |  | 12 |
| PASS | PCU27_GAMEANIM | 게임애니메이션전공 | VISUAL_CORE_V1 | SPEC_VISUAL_GAMEANIM | 아트앤웹툰학부 · 게임애니메이션전공 |  | 12 |
| PASS | PCU27_DESIGN_COMM | 커뮤니케이션디자인전공 | VISUAL_CORE_V1 | SPEC_VISUAL_COMM | 디자인학부 · 커뮤니케이션디자인전공 |  | 12 |
| PASS | PCU27_DESIGN_IND | 산업디자인전공 | VISUAL_CORE_V1 | SPEC_VISUAL_INDUSTRIAL | 디자인학부 · 산업디자인전공 |  | 12 |
| PASS | PCU27_ADPHOTO | 광고사진영상학과 | MEDIA_CORE_V1 | SPEC_MEDIA_ADPHOTO | 광고사진영상학과 |  | 13 |
| PASS | PCU27_MEDIACONTENT | 미디어콘텐츠학과 | MEDIA_CORE_V1 | SPEC_MEDIA_CONTENT | 미디어콘텐츠학과 |  | 13 |
| PASS | PCU27_FASHION | 의류패션학과 | STYLE_CORE_V1 | SPEC_STYLE_FASHION | 의류패션학과 |  | 13 |
| PASS | PCU27_BEAUTY | 뷰티케어학과 | STYLE_CORE_V1 | SPEC_STYLE_BEAUTY | 뷰티케어학과 |  | 13 |
| PASS | PCU27_PERFORM_APPLIED | 실용음악전공 | MEDIA_CORE_V1 | SPEC_MEDIA_MUSIC | 공연예술학부 · 실용음악전공 |  | 13 |
| PASS | PCU27_PERFORM_FILMST | 영화영상학전공 | MEDIA_CORE_V1 | SPEC_MEDIA_FILM | 공연예술학부 · 영화영상학전공 |  | 13 |
| PASS | PCU27_LEISURE_COACH | 스포츠지도·건강재활전공 | SPORTS_CORE_V1 | SPORTS_COACHING | 레저스포츠학부 · 스포츠지도·건강재활전공 |  | 13 |
| PASS | PCU27_LEISURE_MKT | 스포츠마케팅전공 | BIZ_CORE_V1 | SPEC_BIZ_SPORTS_MKT | 레저스포츠학부 · 스포츠마케팅전공 |  | 13 |
| PASS | PCU27_LIFE_STYLING | 라이프스타일링전공 | STYLE_CORE_V1 | SPEC_STYLE_LIFE | 평생교육융합학부 · 라이프스타일링전공 |  | 12 |
| PASS | PCU27_LIFE_WELFARE | 사회복지상담전공 | HEALTH_CORE_V1 | SPEC_HEALTH_SOCIALWELFARE | 평생교육융합학부 · 사회복지상담전공 |  | 13 |
| PASS | PCU27_LIFE_AGRIBIZ | 농산업비즈니스전공 | BIZ_CORE_V1 | SPEC_BIZ_AGRI_BIZ | 평생교육융합학부 · 농산업비즈니스전공 |  | 12 |
| PASS | PCU27_LIFE_REALESTATE | 부동산재테크전공 | BIZ_CORE_V1 | SPEC_BIZ_REALESTATE | 평생교육융합학부 · 부동산재테크전공 |  | 12 |
| PASS | PCU27_LIFE_SENIORGOLF | 시니어운동처방·파크골프전공 | SPORTS_CORE_V1 | SPORTS_SENIOR | 평생교육융합학부 · 시니어운동처방·파크골프전공 |  | 12 |
| PASS | PCU27_LIFE_HUMANARTS | 인문예술창작전공 | LANG_CORE_V1 | SPEC_LANG_CREATIVE | 평생교육융합학부 · 인문예술창작전공 |  | 12 |
| PASS | PCU27_GLOBAL_KORTRANS | 직무한국어번역전공 | LANG_CORE_V1 | SPEC_LANG_KORTRANS | 글로벌융합학부 · 직무한국어번역전공 |  | 13 |
| PASS | PCU27_GLOBAL_KCULTURE | K컬처비즈니스전공 | BIZ_CORE_V1 | SPEC_BIZ_CULTURE_BIZ | 글로벌융합학부 · K컬처비즈니스전공 |  | 13 |
| PASS | PCU27_GLOBAL_MGMT | 글로벌경영전공 | BIZ_CORE_V1 | SPEC_BIZ_GLOBAL_MGMT | 글로벌융합학부 · 글로벌경영전공 |  | 13 |
| PASS | PCU27_GLOBAL_ITAI | 글로벌IT·AI전공 | CS_CORE_V1 | SPEC_CS_GLOBAL_IT | 글로벌융합학부 · 글로벌IT·AI전공 |  | 13 |
| PASS | PCU27_GLOBAL_BEAUTY | 뷰티패션산업전공 | STYLE_CORE_V1 | SPEC_STYLE_BEAUTYBIZ | 글로벌융합학부 · 뷰티패션산업전공 |  | 14 |
| PASS | PCU27_GLOBAL_MEDTOUR | 국제의료관광전공 | BIZ_CORE_V1 | SPEC_BIZ_MEDTOUR | 글로벌융합학부 · 국제의료관광전공 |  | 13 |
| PASS | PCU27_GLOBAL_KFOODTECH | K푸드테크전공 | FOOD_CORE_V1 | SPEC_FOOD_FOODTECH | 글로벌융합학부 · K푸드테크전공 |  | 13 |

## 전공 고르기 자리 (Core 를 학생이 고른다)

- PCU26_SELFDESIGN 자율전공학부 — 이 검사에서 열지 않음. 학생이 고른 전공으로 열리는 길은 `pcu:routing`(브라우저)이 센다: NOT VERIFIED
- PCU27_SELFDESIGN 자율전공학부 — 이 검사에서 열지 않음. 학생이 고른 전공으로 열리는 길은 `pcu:routing`(브라우저)이 센다: NOT VERIFIED

