/** 작업공간 영어 사전: home. 열쇠는 한국어 원문이다(`../ws-say.ts`) */
export const WS_EN_HOME: Record<string, string> = {
  /* 머리 */
  "{name} 학생, 안녕하세요": "Hello, {name}",
  " · 최근 업데이트 {at}": " · Last updated {at}",
  "전공 진로 검사": "Career assessment for your major",
  "풀던 검사가 있습니다": "You have an assessment in progress",
  "+ 경험 추가": "+ Add an experience",
  "기술영역": "Technical area",

  /* 검사 전 · 진행 중 */
  "{major} 검사 시작": "Start the {major} assessment",
  "검사 시작": "Start the assessment",
  "검사 시작#tag": "Get started",
  "검사 진행 중": "Assessment in progress",
  "검사 이어하기": "Continue the assessment",
  "검사 이어하기 →": "Continue the assessment →",
  "검사를 끝내면 결과와 할 일이 이 화면에 나옵니다.":
    "When you finish the assessment, your results and next steps will appear here.",
  "{major} 검사로 내 경험을 정리해 보세요.":
    "Use the {major} assessment to sort through your experience.",
  "전공 검사로 내 경험을 정리해 보세요.":
    "Use the assessment for your major to sort through your experience.",
  "지금까지 {n}문항에 답했습니다. 마지막으로 답한 문항에서 이어집니다.":
    "Questions answered so far: {n}. You'll pick up from the last one you answered.",
  "답한 것은 문항마다 저장되어, 마지막으로 답한 문항에서 이어집니다.":
    "Each answer is saved as you go, so you'll pick up from the last question you answered.",
  "적성이나 성격은 묻지 않습니다. 해 본 일에서 직접 판단한 경험을 찾습니다. 12분 안팎입니다.":
    "It doesn't ask about aptitude or personality. It looks for decisions you made yourself in work you've done. It takes about 12 minutes.",
  "검사를 끝내면 열리는 곳": "What opens when you finish",
  "결과가 나오면 아래 자리마다 내 결과가 채워집니다.":
    "Once your results are ready, each of these fills in with your own results.",
  "설명할 수 있는 영역": "Areas you can explain",
  "부족한 부분 메우기": "Filling in what's missing",
  "결과지와 PDF": "Result reports and PDFs",
  "최근 기록": "Recent activity",
  "풀던 검사와 적어 둔 경험이 여기에 쌓입니다.":
    "Your assessment in progress and the experiences you've written down are kept here.",
  "{major} 검사 · 진행 중": "{major} assessment · In progress",
  "전공 검사 · 진행 중": "Major assessment · In progress",
  "{n}문항 답함 · 문항마다 저장됨": "Answered: {n} · Saved as you go",
  "문항마다 저장됨": "Saved as you go",
  "이어하기": "Continue",

  /* 결과 전에 적어 둔 경험 */
  "적어 둔 경험": "Experiences you've written down",
  "최근 경험": "Recent experiences",
  "{n}개#count": "{n}",
  "검사를 한 번 끝내면 이 경험이 어느 판단으로 가는지 맞춰 봅니다.":
    "Once you finish the assessment, we'll match each experience to the judgment it supports.",
  "경험 전체 보기": "See all experiences",

  /* 결과가 있는 홈 */
  "지금 꼭 해야 하는 일은 없습니다.": "There's nothing you need to do right now.",
  "지금 정리하기 →": "Write it up now →",
  "경험 추가 →": "Add an experience →",
  "그 밖에 할 일 {n}개": "Other steps ({n})",
  "새 경험을 적으면 현재 상태가 다시 서고 그다음 할 일이 나옵니다.":
    "When you write down a new experience, your current state is updated and your next steps follow from it.",
  "전체 보기 →": "See all →",
  "{lead}입니다.": "{lead}.",
  "지원서에서 설명할 만한 경험이 아직 없습니다. 관심이 높은 영역에서 짧게 한 번 해 보는 것이 다음 걸음입니다.":
    "You don't have experience to explain in an application yet. A good next step is to try something short in an area you're interested in.",
  "모두 보기 →": "See all →",
  "최근 추가한 경험으로 다음과 같은 변화가 생겼습니다.":
    "The experience you added recently led to these changes.",
  "그 밖에 {n}가지가 더 달라졌습니다.": "Plus {n} more.",
  "적어 두신 경험이 어느 판단으로 가는지 먼저 보고 더합니다. 더해도 검사 당시 결과는 그대로 남습니다.":
    "We check which judgment each experience supports before adding it. Adding it doesn't change your results at the time of the assessment.",
  "아직 더하지 않은 경험 {n}건": "Experiences not yet reflected: {n}",
  "최근 검사 결과와 경험을 확인할 수 있습니다.": "See your latest assessment results and experiences.",
  "진로진단": "Career assessment",
  "{major} 결과 ({tier})": "{major} results ({tier})",
  "{major} 진로 분석 리포트 · 고정됨": "{major} career analysis report · Locked",
  "고정됨 · 그날의 문항과 기준 그대로입니다":
    "Locked · Based on the questions and criteria from that day",
  "결과 보기": "View results",
  "자세히 보기": "View details",

  /* 경험 종류(`EXPERIENCE_KINDS` 의 이름) */
  "수업": "Course",
  "과제": "Assignment",
  "캡스톤·설계 과제": "Capstone or design project",
  "연구·실험": "Research or lab work",
  "논문·학회": "Paper or conference",
  "인턴·현장실습": "Internship or field placement",
  "개인·동아리 프로젝트": "Personal or club project",
  "직장 경험": "Work experience",
  "자격·교육 이수": "Certification or training",
};
