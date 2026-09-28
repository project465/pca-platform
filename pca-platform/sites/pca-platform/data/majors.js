/* PCA Platform — 학과 레지스트리
 *
 * 새 학과를 추가하는 방법
 *   1) data/<code>.js 를 data/me.js 와 같은 형식으로 만든다
 *   2) index.html 에 <script src="data/<code>.js"></script> 를 추가한다
 *   3) 아래 MAJORS 배열에서 해당 학과의 status 를 'ready' 로 바꾼다
 *
 * status
 *   'ready'   — 응시 가능
 *   'soon'    — 화면에는 보이지만 선택 불가(준비중)
 *   'hidden'  — 화면에 표시하지 않음
 */
window.PCA_MAJORS = [
  { code: 'ME',  name: '기계공학과',   group: '공학',     status: 'ready' },

  { code: 'EE',  name: '전기전자공학과', group: '공학',     status: 'soon' },
  { code: 'CE',  name: '컴퓨터공학과',  group: '공학',     status: 'soon' },
  { code: 'CHE', name: '화학공학과',    group: '공학',     status: 'soon' },
  { code: 'MSE', name: '신소재공학과',  group: '공학',     status: 'soon' },
  { code: 'IE',  name: '산업공학과',    group: '공학',     status: 'soon' },
  { code: 'CIV', name: '토목·건설공학과', group: '공학',    status: 'soon' },
  { code: 'ARC', name: '건축학과',      group: '공학',     status: 'soon' },
  { code: 'AER', name: '항공우주공학과', group: '공학',     status: 'soon' },
  { code: 'ENV', name: '환경공학과',    group: '공학',     status: 'soon' },

  { code: 'PHY', name: '물리학과',      group: '자연과학', status: 'soon' },
  { code: 'CHM', name: '화학과',        group: '자연과학', status: 'soon' },
  { code: 'MTH', name: '수학·통계학과',  group: '자연과학', status: 'soon' },
  { code: 'BIO', name: '생명과학과',    group: '자연과학', status: 'soon' },
  { code: 'FST', name: '식품영양학과',  group: '자연과학', status: 'soon' }
];
