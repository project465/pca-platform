# 배재대학교 학생용 진입 경로 (`/campus/pcu`)

`/campus/{학교}` 가 하는 일은 하나다: 학교 학과 이름에서 CareerMatri 의
Major Core 로 가는 **길**을 여는 것. 그 뒤는 전부 공통이다. 같은
Assessment · 같은 Result · 같은 Experience · 같은 Current State 이고,
**전용 검사도 전용 채점도 만들지 않는다.**

route 는 그대로다.

```
/campus/[universityCode]            진입
/campus/[universityCode]/majors     학과 선택   (?y=학년도 로 다른 구조를 본다)
/campus/[universityCode]/d/[code]   학과 상세 → 공통 /v3/start
```

이 회차가 바꾼 것은 **등록부의 구조**다. 한 시점의 목록으로 덮어쓰던 것을
**학년도별 Catalog** 로 나란히 두었다.

---

## A. 먼저 적어 두는 것: 두 Catalog 의 공식 쪽을 읽지 못했다

이 작업 환경의 네트워크 정책이 `pcu.ac.kr` 의 HTTPS 를 막는다
(게이트웨이가 CONNECT 에 403). 그래서 아래 두 구조는 **사업주가 적어 준
것을 그대로 옮긴 것**이고, 공식 쪽과 글자까지 맞추는 일은 그 쪽이 열린
뒤에 한다. **학과를 기억으로 지어내지 않았다.**

두 Catalog 모두 `verified_at` 이 비어 있고 `verification` 이
`OFFICIAL_PAGE_UNREACHABLE` 이다. 확인한 적이 없는 것을 확인했다고 적지
않는다.

2027 쪽 주소는 검색으로 드러난 입학처(`enter.pcu.ac.kr`) 의 시행계획
첨부다. **그 주소를 이 환경에서 열어 보지 못했다.** 사업주가 한 번 눌러
확인해 주시면 그때 `verified_at` 이 선다.

### 확인이 필요한 것

| 무엇 | 왜 |
|---|---|
| 현행 AI·SW창의융합대학의 나머지 학과 | 사업주가 적어 준 것이 전기공학과 · AI소프트웨어공학부 · 피지컬AI공학부 셋이다. 2027 자리인 스마트배터리학과와 철도건설공학과가 현행에도 있으면 현행 Catalog 에 더한다 |
| 2027 소프트웨어공학부의 인공지능 | 현행 AI소프트웨어공학부에는 인공지능전공이 있고 2027 목록에는 없다. 어디로 가는지 확인이 필요하다 |
| AI·SW 말고 다섯 단과대학의 2027 구조 | 모집요강에서 따로 확인하지 못해 현행에서 그대로 옮겼다(`carried_over`). 표의 `옮겨 적음` 칸이 그 자리다 |
| 스마트배터리학과의 Core | 이차전지를 에너지공학으로 볼지 화학공학으로 볼지 신소재로 볼지 모른다. 셋 다 후보라 **고르지 않고 비워 두었다** |
| `교직과` | 학생이 고르는 전공인지 지원 조직인지 확인하지 못해 두 Catalog 모두에서 뺐다 |
| 평생교육융합학부 · 글로벌자율융합학부의 전공 목록 | 확인하지 못했다 |

---

## B. Catalog 둘

**섞지 않는다.** 한 화면에는 한 Catalog 의 구조만 서고, 그것을
`campus:shots` 가 칸의 이름으로 센다. 개편 전 구조와 개편 후 구조를 한
목록에 담으면 같은 이름의 전공이 두 번 서고, 읽는 사람은 둘 가운데 어느
쪽이 자기 자리인지 가를 수 없다.

### 현재 재학생 · `PCU_CUR` · 2026학년도 · `ACTIVE`

| 칸 | 값 |
|---|---|
| 유효기간 | `2026-03-01` 부터 (끝은 비어 있음) |
| 출처 | 배재대학교 대학·학과 안내 |
| 주소 | `https://www.pcu.ac.kr/kor/contents/105` |
| 확인 날짜 | **비어 있다** |
| 확인 상태 | `OFFICIAL_PAGE_UNREACHABLE` |
| 고르는 자리 | 47개 (EXACT 11 · 갈래 작성 필요 13 · Core 제작 필요 23) |
| 검사 가능 | 0개 |

| 단과대학 | 학부 | 고르는 자리 | 코드 | Canonical Core | 갈래 | 매핑 | 학생 표시 | 옮겨 적음 | 이어받은 자리 |
|---|---|---|---|---|---|---|---|---|---|
| 인문사회대학 | — | 국어국문한국어교육학과 | PCU26_KOREAN | 국어·언어·문학 | — | EXACT | 준비 중 | — | — |
| 인문사회대학 | — | 일본학과 | PCU26_JAPAN | 국어·언어·문학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| 인문사회대학 | 경찰법학부 | 경찰학전공 | PCU26_POLICE | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 인문사회대학 | 경찰법학부 | 법학전공 | PCU26_LAW | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 인문사회대학 | 행정학과 | 일반행정트랙 | PCU26_PUBADM_GENERAL | 행정학 | — | EXACT | 준비 중 | — | — |
| 인문사회대학 | 행정학과 | 소방행정트랙 | PCU26_PUBADM_FIRE | 행정학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| 인문사회대학 | — | 심리상담학과 | PCU26_PSY | 심리학 | — | EXACT | 준비 중 | — | — |
| 인문사회대학 | — | 유아교육과 | PCU26_EARLYCHILD | 교육학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| 경영대학 | — | 경영학과 | PCU26_BIZ | 경영학 | — | EXACT | 준비 중 | — | — |
| 경영대학 | — | IT경영정보학과 | PCU26_MIS | 경영학 | — | EXACT | 준비 중 | — | — |
| 경영대학 | — | 글로벌비즈니스학과 | PCU26_GLOBALBIZ | 경영학 | — | EXACT | 준비 중 | — | — |
| 경영대학 | — | 관광경영학과 | PCU26_TOURISM | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 경영대학 | — | 호텔항공경영학과 | PCU26_HOTELAIR | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 경영대학 | — | 항공서비스학과 | PCU26_AIRSERVICE | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 생명보건대학 | — | 생명공학과 | PCU26_BT | 바이오·생명공학 | — | EXACT | 준비 중 | — | — |
| 생명보건대학 | — | 식품영양학과 | PCU26_FOOD | 식품공학 | — | EXACT | 준비 중 | — | — |
| 생명보건대학 | — | 외식조리학과 | PCU26_CULINARY | 식품공학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| 생명보건대학 | — | 원예산림학과 | PCU26_HORTI | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 생명보건대학 | — | 보건의료복지학과 | PCU26_HEALTHWELFARE | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 생명보건대학 | — | 간호학과 | PCU26_NURSING | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 생명보건대학 | — | 운동재활복지학과 | PCU26_SPORTSREHAB | — | — | CORE_REQUIRED | 준비 중 | — | — |
| AI·SW창의융합대학 | — | 전기공학과 | PCU26_EE_POWER | 전기전자공학 | 전기·전력 | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| AI·SW창의융합대학 | AI소프트웨어공학부 | 컴퓨터공학전공 | PCU26_CS_COMPUTER | 컴퓨터·소프트웨어 | 컴퓨터공학 | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| AI·SW창의융합대학 | AI소프트웨어공학부 | 소프트웨어학전공 | PCU26_CS_SOFTWARE | 컴퓨터·소프트웨어 | 소프트웨어학 | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| AI·SW창의융합대학 | AI소프트웨어공학부 | 정보보안학전공 | PCU26_CS_SECURITY | 컴퓨터·소프트웨어 | 정보보안 | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| AI·SW창의융합대학 | AI소프트웨어공학부 | 게임공학전공 | PCU26_CS_GAME | 컴퓨터·소프트웨어 | 게임공학 | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| AI·SW창의융합대학 | AI소프트웨어공학부 | 인공지능전공 | PCU26_CS_AI | 컴퓨터·소프트웨어 | 인공지능·데이터 | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| AI·SW창의융합대학 | 피지컬AI공학부 | 드론로봇공학전공 | PCU26_DRONE_ROBOT | 로봇공학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| AI·SW창의융합대학 | 피지컬AI공학부 | AI융합전자전공 | PCU26_AICONV_ELEC | 전기전자공학 | 전자·회로 | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | — | 건축학과 | PCU26_ARCH | 건축공학 | — | EXACT | 준비 중 | — | — |
| 문화예술대학 | — | 실내건축학과 | PCU26_INTERIOR | 건축공학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | — | 조경학과 | PCU26_LANDSCAPE | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | 아트앤웹툰학부 | 아트앤웹툰전공 | PCU26_ARTWEBTOON_MAIN | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | 아트앤웹툰학부 | 게임애니메이션전공 | PCU26_GAMEANIM | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | 디자인학부 | 커뮤니케이션디자인전공 | PCU26_DESIGN_COMM | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | 디자인학부 | 산업디자인전공 | PCU26_DESIGN_IND | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | — | 광고사진영상학과 | PCU26_ADPHOTO | 미디어·광고홍보 | — | EXACT | 준비 중 | — | — |
| 문화예술대학 | — | 미디어콘텐츠학과 | PCU26_MEDIACONTENT | 미디어·광고홍보 | — | EXACT | 준비 중 | — | — |
| 문화예술대학 | — | 의류패션학과 | PCU26_FASHION | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | — | 뷰티케어학과 | PCU26_BEAUTY | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | 공연예술학과 | 음악트랙 | PCU26_PERFORM_MUSIC | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | 공연예술학과 | 영화영상트랙 | PCU26_PERFORM_FILM | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | 레저스포츠학부 | 스포츠지도·건강재활전공 | PCU26_LEISURE_COACH | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 문화예술대학 | 레저스포츠학부 | 스포츠마케팅전공 | PCU26_LEISURE_MKT | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 아펜젤러공유대학 | — | 자율전공학부 | PCU26_SELFDESIGN | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 아펜젤러공유대학 | — | 평생교육융합학부 | PCU26_LIFELONG | — | — | CORE_REQUIRED | 준비 중 | — | — |
| 아펜젤러공유대학 | — | 글로벌자율융합학부 | PCU26_GLOBALCONV | — | — | CORE_REQUIRED | 준비 중 | — | — |


### 2027학년도 신입생 · `PCU_2027` · 2027학년도 · `FUTURE`

| 칸 | 값 |
|---|---|
| 유효기간 | `2027-03-01` 부터 (끝은 비어 있음) |
| 출처 | 2027학년도 대학입학전형 시행계획 |
| 주소 | `https://enter.pcu.ac.kr/attach/75ebe31e6384401236b6c26ae8896002/13055e35ba7465cb478c5b4be490c5a8` |
| 확인 날짜 | **비어 있다** |
| 확인 상태 | `OFFICIAL_PAGE_UNREACHABLE` |
| 고르는 자리 | 47개 (EXACT 12 · 갈래 작성 필요 11 · Core 제작 필요 24) |
| 검사 가능 | 0개 |

| 단과대학 | 학부 | 고르는 자리 | 코드 | Canonical Core | 갈래 | 매핑 | 학생 표시 | 옮겨 적음 | 이어받은 자리 |
|---|---|---|---|---|---|---|---|---|---|
| 인문사회대학 | — | 국어국문한국어교육학과 | PCU27_KOREAN | 국어·언어·문학 | — | EXACT | 준비 중 | O | PCU26_KOREAN |
| 인문사회대학 | — | 일본학과 | PCU27_JAPAN | 국어·언어·문학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | O | PCU26_JAPAN |
| 인문사회대학 | 경찰법학부 | 경찰학전공 | PCU27_POLICE | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_POLICE |
| 인문사회대학 | 경찰법학부 | 법학전공 | PCU27_LAW | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_LAW |
| 인문사회대학 | 행정학과 | 일반행정트랙 | PCU27_PUBADM_GENERAL | 행정학 | — | EXACT | 준비 중 | O | PCU26_PUBADM_GENERAL |
| 인문사회대학 | 행정학과 | 소방행정트랙 | PCU27_PUBADM_FIRE | 행정학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | O | PCU26_PUBADM_FIRE |
| 인문사회대학 | — | 심리상담학과 | PCU27_PSY | 심리학 | — | EXACT | 준비 중 | O | PCU26_PSY |
| 인문사회대학 | — | 유아교육과 | PCU27_EARLYCHILD | 교육학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | O | PCU26_EARLYCHILD |
| 경영대학 | — | 경영학과 | PCU27_BIZ | 경영학 | — | EXACT | 준비 중 | O | PCU26_BIZ |
| 경영대학 | — | IT경영정보학과 | PCU27_MIS | 경영학 | — | EXACT | 준비 중 | O | PCU26_MIS |
| 경영대학 | — | 글로벌비즈니스학과 | PCU27_GLOBALBIZ | 경영학 | — | EXACT | 준비 중 | O | PCU26_GLOBALBIZ |
| 경영대학 | — | 관광경영학과 | PCU27_TOURISM | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_TOURISM |
| 경영대학 | — | 호텔항공경영학과 | PCU27_HOTELAIR | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_HOTELAIR |
| 경영대학 | — | 항공서비스학과 | PCU27_AIRSERVICE | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_AIRSERVICE |
| 생명보건대학 | — | 생명공학과 | PCU27_BT | 바이오·생명공학 | — | EXACT | 준비 중 | O | PCU26_BT |
| 생명보건대학 | — | 식품영양학과 | PCU27_FOOD | 식품공학 | — | EXACT | 준비 중 | O | PCU26_FOOD |
| 생명보건대학 | — | 외식조리학과 | PCU27_CULINARY | 식품공학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | O | PCU26_CULINARY |
| 생명보건대학 | — | 원예산림학과 | PCU27_HORTI | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_HORTI |
| 생명보건대학 | — | 보건의료복지학과 | PCU27_HEALTHWELFARE | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_HEALTHWELFARE |
| 생명보건대학 | — | 간호학과 | PCU27_NURSING | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_NURSING |
| 생명보건대학 | — | 운동재활복지학과 | PCU27_SPORTSREHAB | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_SPORTSREHAB |
| AI·SW창의융합대학 | — | 전기전자공학과 | PCU27_EE | 전기전자공학 | — | EXACT | 준비 중 | — | PCU26_EE_POWER PCU26_AICONV_ELEC |
| AI·SW창의융합대학 | — | 스마트배터리학과 | PCU27_BATTERY | — | — | CORE_REQUIRED | 준비 중 | — | — |
| AI·SW창의융합대학 | — | 드론로봇공학과 | PCU27_DRONE_ROBOT | 로봇공학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | — | PCU26_DRONE_ROBOT |
| AI·SW창의융합대학 | — | 철도건설공학과 | PCU27_RAIL_CIVIL | 토목공학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | — | — |
| AI·SW창의융합대학 | 소프트웨어공학부 | 컴퓨터공학 | PCU27_CS_COMPUTER | 컴퓨터·소프트웨어 | 컴퓨터공학 | SPECIALIZATION_REQUIRED | 준비 중 | — | PCU26_CS_COMPUTER |
| AI·SW창의융합대학 | 소프트웨어공학부 | 소프트웨어학 | PCU27_CS_SOFTWARE | 컴퓨터·소프트웨어 | 소프트웨어학 | SPECIALIZATION_REQUIRED | 준비 중 | — | PCU26_CS_SOFTWARE |
| AI·SW창의융합대학 | 소프트웨어공학부 | 정보보안학 | PCU27_CS_SECURITY | 컴퓨터·소프트웨어 | 정보보안 | SPECIALIZATION_REQUIRED | 준비 중 | — | PCU26_CS_SECURITY |
| AI·SW창의융합대학 | 소프트웨어공학부 | 게임공학 | PCU27_CS_GAME | 컴퓨터·소프트웨어 | 게임공학 | SPECIALIZATION_REQUIRED | 준비 중 | — | PCU26_CS_GAME |
| 문화예술대학 | — | 건축학과 | PCU27_ARCH | 건축공학 | — | EXACT | 준비 중 | O | PCU26_ARCH |
| 문화예술대학 | — | 실내건축학과 | PCU27_INTERIOR | 건축공학 | **필요** | SPECIALIZATION_REQUIRED | 준비 중 | O | PCU26_INTERIOR |
| 문화예술대학 | — | 조경학과 | PCU27_LANDSCAPE | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_LANDSCAPE |
| 문화예술대학 | 아트앤웹툰학부 | 아트앤웹툰전공 | PCU27_ARTWEBTOON_MAIN | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_ARTWEBTOON_MAIN |
| 문화예술대학 | 아트앤웹툰학부 | 게임애니메이션전공 | PCU27_GAMEANIM | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_GAMEANIM |
| 문화예술대학 | 디자인학부 | 커뮤니케이션디자인전공 | PCU27_DESIGN_COMM | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_DESIGN_COMM |
| 문화예술대학 | 디자인학부 | 산업디자인전공 | PCU27_DESIGN_IND | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_DESIGN_IND |
| 문화예술대학 | — | 광고사진영상학과 | PCU27_ADPHOTO | 미디어·광고홍보 | — | EXACT | 준비 중 | O | PCU26_ADPHOTO |
| 문화예술대학 | — | 미디어콘텐츠학과 | PCU27_MEDIACONTENT | 미디어·광고홍보 | — | EXACT | 준비 중 | O | PCU26_MEDIACONTENT |
| 문화예술대학 | — | 의류패션학과 | PCU27_FASHION | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_FASHION |
| 문화예술대학 | — | 뷰티케어학과 | PCU27_BEAUTY | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_BEAUTY |
| 문화예술대학 | 공연예술학과 | 음악트랙 | PCU27_PERFORM_MUSIC | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_PERFORM_MUSIC |
| 문화예술대학 | 공연예술학과 | 영화영상트랙 | PCU27_PERFORM_FILM | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_PERFORM_FILM |
| 문화예술대학 | 레저스포츠학부 | 스포츠지도·건강재활전공 | PCU27_LEISURE_COACH | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_LEISURE_COACH |
| 문화예술대학 | 레저스포츠학부 | 스포츠마케팅전공 | PCU27_LEISURE_MKT | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_LEISURE_MKT |
| 아펜젤러공유대학 | — | 자율전공학부 | PCU27_SELFDESIGN | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_SELFDESIGN |
| 아펜젤러공유대학 | — | 평생교육융합학부 | PCU27_LIFELONG | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_LIFELONG |
| 아펜젤러공유대학 | — | 글로벌자율융합학부 | PCU27_GLOBALCONV | — | — | CORE_REQUIRED | 준비 중 | O | PCU26_GLOBALCONV |

---

## C. 고르는 자리마다 서는 여섯 칸

규격 §1 이 요구한 여섯은 `catalog_year` · `effective_from` ·
`effective_to` · `source_url` · `verified_at` · `status` 다. 고르는 자리
94개 전부에서 값이 선다(`provenanceOf`).

**자리마다 여섯 줄을 베껴 두지 않았다.** Catalog 가 기본값을 들고, 그
자리가 Catalog 와 다를 때만 자리에 적는다. 베껴 두면 Catalog 를 고친 날
아흔 줄 가운데 몇이 옛 값으로 남고, 남은 그 줄이 틀렸다는 것을 아무도
모른다. 베끼지 않아도 자리마다 여섯 값이 전부 나오는지는
`campus:check` 가 센다.

`status` 는 적어 두고 **유효기간으로 한 번 더 센다.** 적어 두는 까닭은
사람이 읽고 고칠 자리가 있어야 해서이고, 세는 까닭은 적어 둔 값이 해가
바뀌면 조용히 틀려지기 때문이다. 2027년 3월 1일이 되면
`PCU_2027` 의 `FUTURE` 는 거짓이 되고, 그날 `campus:check` 가 걸린다.

**DB 스키마를 한 줄도 바꾸지 않았다.** 고르는 자리의 코드가 앞머리에
학년도를 들고 있어서(`PCU26_` · `PCU27_`), 응시 줄에 적힌
`department_code` 하나로 어느 Catalog 의 자리인지가 그대로 나온다. 칸을
하나 더 두면 올리는 일이 한 번 늘고, 이미 적힌 줄이 비어 있는 상태로
남는다. 코드 앞머리가 Catalog 사이에 겹치지 않는지를 `campus:check` 가
세고, **다음 학년도 자리로 연 응시 줄이 그 해 구조를 그대로 드는지**를
`campus:walk` 가 실제 DB 로 센다.

---

## D. 어느 Catalog 를 보여 주는가

학생에게 묻는 것은 **현재 소속 학과** 하나다. 입학년도를 따로 묻는 걸음을
두지 않는다: 그 걸음은 들어오는 사람 거의 모두에게 쓸모가 없고, 쓸모가
없는 걸음은 그 자리에서 닫는 사람을 만든다.

정하는 차례는 셋이고 `resolveCatalog` 한 곳에 있다.

1. 주소에 `?y=학년도` 가 있으면 그 Catalog
2. 시스템이 들고 있는 입학년도가 있으면 그 해가 드는 Catalog
3. 그 밖에는 **재학생 구조**(`ACTIVE`)

**지금 2번이 서는 줄이 흔하지 않다.** 들고 있는 값은
`learner_profiles.grade_year`(그 줄을 적을 때의 학년)뿐이고, V3 로 들어온
사람의 프로필에는 그것이 적히지 않는 경우가 대부분이다. 그러면
`admissionYearOf` 가 비어 있는 값을 돌려주고 화면은 재학생 구조로 간다.
읽는 자리를 하나 둔 까닭은, 학과가 명단을 올릴 때 학번이나 입학년도가
들어오는 날 **고칠 자리가 거기 하나**가 되기 때문이다.

**학번에서 앞 네 자리를 떼어 쓰지 않는다.** 그 규칙을 지키지 않는 학교가
있고, 틀리면 그 학생이 자기 학과가 없는 목록을 본다.

되돌림은 목록 맨 아래 한 줄이다. `현재 재학생 기준으로 보여드리고
있습니다. 찾는 학과가 없으면 2027학년도 신입생 학과 구조에서 찾아보실 수
있습니다.` 이 줄이 없으면 개편으로 이름이 달라진 학과의 학생이 막다른
길에서 닫는다. **고르는 걸음이 아니다**: 목록은 이미 서 있고, 이 줄은
자기 학과를 못 찾은 사람만 쓴다.

---

## E. 학과 이름이 바뀌어도 Core 는 하나다

학과 이름이 개편돼도 **같은 Canonical Core 를 다시 쓴다.** 이름이 바뀔
때마다 채점을 새로 만들면 같은 학교 안에서 자가 갈리고, 그 순간 앞 학번과
뒤 학번의 결과를 견줄 수 없다.

| 이름 | Catalog | Core | 갈래 |
|---|---|---|---|
| 전기공학과 | 현재 재학생 | `EE_CORE_V1` | 전기·전력 |
| AI융합전자전공 | 현재 재학생 | `EE_CORE_V1` | 전자·회로 |
| 전기전자공학과 | 2027학년도 신입생 | `EE_CORE_V1` | 없음 |

어느 자리가 어느 자리를 이어받았는지는 `replaces` 가 적는다. 그 줄이
가리키는 자리가 등록부에 있는지, 이어받는 쪽이 더 늦은 해인지, Core 가
갈리는 이어받음에 까닭이 적혀 있는지를 `campus:check` 가 센다.

---

## F. Registry 와 Core 를 가른다

**학교 학과 수만큼 Core 를 만들지 않는다.** 고르는 자리 94개가 가리키는
Canonical Core 는 열한 가지뿐이다. 학교가 학과를 쪼개거나 합쳐도 자는
그대로여야, 그 학교 학생과 다른 학교 학생의 결과를 견줄 수 있다.

```
등록부(이 파일)   학교 이름 · Catalog · 단과대학 · 학부와 학과 · 전공과 트랙
Major Core 등록부  전공을 재는 자. 영역 사전 · 문항 · 채점 · 결과 모델
```

갈래는 Core 위에 **조정만 얹는 층**이다. 조정하는 것은 다섯 층(영역 강조 ·
산업 사상 · 역할 사상 · 예시 · 증거와 행동)이고, 채점과 축 수준과 묶음
규칙과 문항 은행과 결과 모델은 건드리지 않는다. 채점과 결과 모듈에 갈래
코드와 학교 맥락 칸이 0건인 것을 `campus:check` 가 센다.

---

## G. 매핑 단계 셋과 학생 표시 둘

| 단계 | 뜻 |
|---|---|
| `EXACT` | 그 자리를 맡는 Core 가 있고 갈래가 더 필요 없다 |
| `SPECIALIZATION_REQUIRED` | Core 는 있는데 그 학과가 읽을 갈래가 아직 없다 |
| `CORE_REQUIRED` | 그 자리를 맡는 Core 가 아직 없다 |

**적어 두지 않고 끌어온다.** `core_code` 와 `specialization` 과
`specialization_required` 셋에서 나온다. 적어 두면 갈래를 쓴 날 등록부를
같이 고쳐야 하고, 안 고치면 작성된 갈래를 가리키며 아직 필요하다고 적는다.

학생 화면에 서는 상태는 **둘뿐이다**: `검사 가능` 과 `준비 중`. 안쪽
단계와 Catalog 상태는 한 글자도 나가지 않고, 그것을 `campus:check` 가
소스에서 세고 `campus:shots` 가 **그려진 글자**에서 센다.

`EXACT` 라고 바로 열리지 않는다. 다섯이 다 맞아야 `검사 가능` 이다:
끝난 구조가 아니고 · 매핑이 `EXACT` 이고 · 학생이 고를 자리이고 ·
전공을 고르는 자리가 아니고 · 그 Core 가 이 시장에서 지금 응시할 수 있다.

**아직 시작하지 않은 Catalog 를 막지 않는다.** 2027 구조로 들어온 사람에게
`아직 때가 아니다` 를 내놓으면 그 사람이 할 수 있는 일이 없고, 재는 자는
Catalog 가 아니라 Core 가 들고 있어 결과가 달라지지도 않는다.

---

## H. Wave 1

| Core | 여는 자리 |
|---|---|
| `EE_CORE_V1` | 전기공학과 · AI융합전자전공 · 전기전자공학과 |
| `CS_CORE_V1` | 컴퓨터공학전공 · 소프트웨어학전공 · 정보보안학전공 · 게임공학전공 · 인공지능전공 · 컴퓨터공학 · 소프트웨어학 · 정보보안학 · 게임공학 |
| `BIZ_CORE_V1` | 경영학과 · IT경영정보학과 · 글로벌비즈니스학과 (두 Catalog) |
| `PUBADM_CORE_V1` | 일반행정트랙 · 소방행정트랙 (두 Catalog) |
| `BT_CORE_V1` | 생명공학과 (두 Catalog) |

**학과 이름으로 적지 않는다.** 현행과 2027 의 이름이 달라도 같은 Core 를
다시 쓰므로, `EE_CORE_V1` 하나를 쓰면 세 자리가 함께 열린다. 먼저 만들
Core 가 두 Catalog 의 자리를 함께 여는지를 `campus:check` 가 센다.

**지금 검사 가능한 자리는 두 Catalog 모두 0개다.** 열려 있는 Core 가
기계공학 하나뿐이고, 사업주가 적어 준 학과에 기계공학 계열이 없다. 그래서
검사 가능한 길은 시험용 학교로 끝까지 밟아 확인했고(`campus:walk`), 그
학교는 커밋하지 않는다.

---

## I. 서버가 자리를 맞춰 본다

| 자리 | 하는 일 |
|---|---|
| 목록의 칸 | 준비 중이면 링크가 아니다. **안내일 뿐이다** |
| 학과 상세 | 주소를 손으로 쳐도 상태를 다시 보고 시작 단추를 세우지 않는다 |
| 시작 처리 | 폼이 보내는 칸이 둘(`u` · `d`)이고 Core 와 단과대학은 서버가 등록부에서 읽는다 |
| 쿠키 | 학교와 자리 코드 둘만 담고, 읽을 때 등록부로 다시 맞춰 본다 |
| `openAttempt` | 그 시장에서 지금 응시할 수 있는 Core 가 아니면 맥락을 통째로 버린다 |

고친 쿠키 넷(준비 중인 자리 둘 · 다른 학교의 자리 · 고르는 자리가 아닌
학부)을 그 자리에서 넣어 보고, 적힌 줄이 비어 있는지를 `campus:walk` 가
실제 DB 로 센다.

---

## J. 집계

| 칸 | 어떻게 |
|---|---|
| 단과대학 | 두 Catalog 의 자리가 같은 단과대학이면 **한 줄로** 굴러간다 |
| 학과 | 개편 전 자리와 개편 후 자리는 **서로 다른 줄**이다 |
| 학부 | 등록부가 다시 읽어 `학부 · 전공` 으로 적는다(`facultyOf`) |
| 5명 규칙 | 기존 `cell()` 을 그대로 지난다. 다섯이 안 되는 칸은 값을 만들지 않는다 |

학과를 한 줄로 뭉개면 담당자가 개편으로 무엇이 달라졌는지 볼 수 없다.
단과대학은 반대로 한 줄이다: 같은 단과대학이기 때문이다.

---

## K. 검사 넷

```bash
npm run campus:check                              # 등록부와 Catalog 와 경계 (DB 없이)
UI_BASE=http://127.0.0.1:3100 npm run campus:shots  # 실제 브라우저로 밟고 찍는다
UI_BASE=http://127.0.0.1:3100 npm run campus:walk   # 검사 가능한 자리의 길 + 집계
```

**학과 이름을 검사 파일에 적지 않는다.** 등록부에서 읽어 센다: 적어 두면
학교가 이름을 바꾸는 날 그 검사가 멀쩡한 화면을 걸고 거짓 경보를 낸다.
만들면서 실제로 한 번 그랬다. 2027 의 `컴퓨터공학` 은 현행
`컴퓨터공학전공` 의 앞토막이라, 쪽의 글자를 통째로 훑어 찾으니 **섞이지
않은 목록이 섞인 것으로 걸렸다.** 세는 자리를 칸의 이름 그대로로 바꿨다.

---

## L. 이 회차에 돌린 것

| 검사 | 결과 |
|---|---|
| `campus:check` | 확인 51가지 · 통과 51 · 걸림 0 |
| `campus:shots` | 확인 49가지 · 통과 49 · 걸림 0 (1440 · 390) |
| `campus:walk` | 확인 19가지 · 통과 19 · 걸림 0 |
| `campus:agg-check` | 확인 8가지 · 통과 8 · 걸림 0 |
| `v3:copy` | OK · 파일 36벌 · 규칙 38가지 |
| `routes:check` | 확인 10가지 · 통과 10 · 걸림 0 |
| `v3:freeze` · `v3:result:freeze` · `v3:workspace` | 기록을 다시 적지 않은 채로 통과 |
| `v3:freeze:core` · `v3:freeze:measure` | 통과 |
| `v3:smoke` | 열리는 자리 5 · 걸림 0 |
| `copy:audit` | 원고 OK |
| `errors:check` | 통과 7 · 걸림 1 (`recompute.ts:377`, 이 회차 전부터 있던 자리) |

**판본을 하나도 올리지 않았다.** 학교 쪽 화면은 어느 동결 목록에도 없고,
검사 화면과 결과지와 작업공간과 측정은 한 줄도 바뀌지 않았다.

---

## M. 아직 아닌 것

- 두 Catalog 의 공식 쪽을 읽지 못했다. `verified_at` 이 둘 다 비어 있다
- **검사 가능한 자리가 0개다.** Wave 1 Core 를 쓰는 일이 다음 회차다
- 2027 Catalog 의 다섯 단과대학이 현행에서 옮겨 적은 자리다
- 네트워크 정책이 `app.careermatri.com:443` 을 막아 운영 배포본을 밖에서
  열지 못했다. 위의 결과는 전부 이 기계에서 운영과 같은 배치로 띄워 돌린
  것이다
- DB 스키마를 한 줄도 바꾸지 않았으므로 마이그레이션은 필요 없다. 고친
  것이 전부 이미지 안으로 들어가는 파일이라 **재배포가 먼저다**
