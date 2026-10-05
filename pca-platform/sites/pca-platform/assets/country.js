/* 목표 국가.
 *
 * **국적은 적합도를 바꾸지 않는다.** 바꿀 수 있는 것은 그 나라에서 쓰는 직무
 * 이름, 학위 관행, 면허, 채용 방식, 이력서 형식, 임금 자료 정도이고, 그것도
 * 확인된 자료가 있을 때만이다.
 *
 * 지금 이 플랫폼은 응시자에게 목표 국가를 묻지 않는다. 그래서 늘 global 이고,
 * 나라별 칸은 비어 있다고 적는다. **없는 자료를 지어내는 것보다 짧은 쪽이
 * 낫다.** 임금·비자·면허를 모델이 지어내면 그걸 믿고 움직이는 사람이 생긴다.
 */
window.PCACountry = (function () {
  'use strict';
  /* 결과지의 두 언어. **글자만 갈리고 판단은 갈리지 않는다**:
     한국어면 받은 것을 그대로 돌려주므로 한국어 쪽은 손대지 않은 것과 같다 */
  var T = window.PCAI18N ? window.PCAI18N.T : function (s) { return s; };
  function DEEP(v) { return window.PCAI18N ? window.PCAI18N.deep(v) : v; }

  function profile(code) {
    if (!code) {
      return {
        country_code: null,
        available: false,
        /* 규격 3.3 의 문장을 그대로 옮겼다 */
        notice: T('아래 분석은 직무 자체를 보고 쓴 것입니다. 목표 국가를 받지 않아서 ') +
                T('면허, 임금, 채용 관행, 취업 허가 같은 나라별 내용은 넣지 않았습니다. ') +
                T('확인된 자료가 없는 상태에서 적으면 그대로 믿고 움직이는 사람이 생깁니다.'),
        job_title_aliases: [], degree_norms: [], licensing_notes: [],
        recruiting_norms: [], cv_resume_norms: [], work_authorization_notes: [],
        salary_data: null, salary_source: null,
        market_demand_data: null, market_demand_source: null,
        last_verified_at: null
      };
    }
    /* 나라를 받기 시작하면 여기에 확인된 자료만 넣는다. 확인 날짜와 출처가
       없는 줄은 넣지 않는다. */
    return { country_code: code, available: false, notice: null };
  }

  /* 연구비 체계는 나라마다 말이 다르다. 한 나라의 서식을 다른 나라에 씌우지
     않으려고 **개념을 먼저 두고 나라 이름을 뒤에 붙인다**(규격 75·97장). */
  /* **최상위 목록은 불러올 때 굳는다.** 꺼내 쓰는 자리에서 옮긴다 */
  var CONCEPTS = [
    { id: 'FUNDING_CALL_DOCUMENT', ko: '사업공고 · 과제요청서 · RFP',
      us: 'solicitation · funding opportunity · NOFO', eu: 'call · topic · work programme' },
    { id: 'PROJECT_OBJECTIVE', ko: '연구목표 · 과제목표',
      us: 'objectives · specific aims', eu: 'objectives' },
    { id: 'WORK_STRUCTURE', ko: '세부과제 · 단계 · 연구내용',
      us: 'work plan · research strategy · aims', eu: 'work packages · tasks' },
    { id: 'SUCCESS_POINTS', ko: '성과지표 · 단계목표',
      us: 'milestones · expected outcomes', eu: 'milestones · deliverables' },
    { id: 'RESOURCES', ko: '연구비 · 인력 · 장비 · 시설',
      us: 'budget · budget justification · facilities', eu: 'resources · person-months' },
    { id: 'IMPACT', ko: '기대효과 · 활용계획',
      us: 'broader impacts · significance', eu: 'impact · dissemination · exploitation' }
  ];

  return { profile: profile, CONCEPTS: DEEP(CONCEPTS) };
})();
