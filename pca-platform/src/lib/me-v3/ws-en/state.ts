/** 작업공간 영어 사전: state. 열쇠는 한국어 원문이다(`../ws-say.ts`) */
export const WS_EN_STATE: Record<string, string> = {
  /* 검사 전 */
  "+ 경험 추가": "+ Add an experience",
  "현재 상태": "Current state",
  "검사를 마치면 표시됩니다.": "Shown after you finish the assessment.",
  "완료한 검사 0건": "No completed assessments",
  "풀던 검사 이어하기": "Continue your assessment",
  "{major} 검사 시작": "Start the {major} assessment",
  "검사 시작": "Start the assessment",

  /* 머리 */
  "{at} 기준": "As of {at}",
  "검사 {at} 기준 · 추가한 경험 0건": "As of assessment {at} · experiences added: 0",
  "검사 {at} 결과에 그 뒤의 경험을 얹은 값입니다.":
    "Your assessment results from {at}, updated with the experience you've added since.",
  "검사 결과와 같음": "Same as assessment result",
  "새 경험을 더했습니다. 달라진 것은 아래 ‘최근 달라진 것’에 있습니다.":
    "Your new experience has been added. See “Recent changes” below for what changed.",
  "경험 더함 · 변동 없음 (같은 영역 근거 2개부터 올라감)": "Experience added · no change (moves up once an area has two pieces of evidence)",

  /* 설명할 수 있는 영역 */
  "현재 설명할 수 있는 영역": "Areas you can explain now",
  "개#unit": "",
  "가장 근거가 잘 잡힌 곳은 {name}입니다.": "Your evidence is strongest in {name}.",
  "{nameTopic} 해 봤고 정리만 남았습니다.": "You've done work in {nameTopic}. It just needs writing up.",
  "정리만 남은 영역이 {n}개 더 있습니다.#one": "{n} more area just needs writing up.",
  "정리만 남은 영역이 {n}개 더 있습니다.": "{n} more areas just need writing up.",
  "변동 있음 · 설명 가능 기준 미달(아래 ‘최근 달라진 것’ 참고)": "Changed · not yet at the explainable level (see \"Recent changes\" below)",
  "검사 영역 하나를 해 보고 경험으로 추가하면 표시됩니다.": "Shown once you try an area from the assessment and add it as an experience.",
  "전체 기술영역 보기": "See all technical areas",
  "정리만 남은 영역": "Just needs writing up",
  "경험 더함": "Experience added",
  " · 경험 더함": " · Experience added",

  /* 지금 할 일 */
  "급한 할 일 없음 · 경험을 추가하면 다음 할 일이 표시됩니다.": "Nothing urgent · add an experience to see the next step.",
  "경험에 추가": "Add as an experience",
  "할 일 {n}가지 모두 보기": "See all {n} next steps",

  /* 최근 달라진 것 */
  "최근 달라진 것": "Recent changes",
  "달라진 것 {n}가지 모두 보기": "See all {n} changes",
  "여기부터 자세한 내용": "More detail below",

  /* 아직 부족한 것 */
  "아직 부족한 것": "What's still missing",
  "왜 필요한가": "Why it matters",
  "그렇게 본 까닭": "Why we say so",
  "그 밖에 {n}곳이 더 있습니다. 위에는 급한 셋을 적었습니다.#one":
    "There's {n} more. The three most pressing are listed above.",
  "그 밖에 {n}곳이 더 있습니다. 위에는 급한 셋을 적었습니다.":
    "There are {n} more. The three most pressing are listed above.",
  "직접 정한 판단 0 · 다음 과제: 기준 하나를 직접 정하기": "Decisions you made: 0 · in your next project, set one criterion yourself.",
  "보완할 곳 없음 · 남은 일: 가진 근거를 지원서 문장으로 만들기": "Nothing to fill · next: turn your evidence into application sentences",

  /* 달라진 것 모두 */
  "달라진 것 모두": "All changes",
  "{at} 에 더한 경험": "Experience added on {at}",
  "그 밖에 {n}가지가 더 달라졌습니다.#one": "Plus {n} more change.",
  "그 밖에 {n}가지가 더 달라졌습니다.": "Plus {n} more changes.",
  "이미 확인된 범위의 경험이 더해졌습니다. 지원서에서 설명할 재료는 그만큼 늘었습니다.":
    "The experience you added falls within what was already confirmed. You now have that much more to explain in applications.",

  /* 검사 당시 결과와 지금 */
  "검사 당시 결과와 지금": "Results at the time of the assessment, and now",
  "검사 당시 결과": "Results at the time of the assessment",
  "고정됨": "Locked",
  "{at} · {tier} · 검사 시점 기준": "{at} · {tier} · as of the assessment",
  "결과 보기": "View results",
  "{at} 기준 · 검사 결과 + 추가한 경험": "As of {at} · assessment result + added experience",
  "{name} 달라짐": "{name} changed",
  "지원서에는 검사 결과, 다음 할 일은 현재 상태 기준.": "Use the assessment result for applications and the current state for next steps.",

  /* 전체 기술영역 */
  "전체 기술영역": "All technical areas",
  "{n}곳": "{n}",
  "외 {n}곳": "+{n} more",

  /* 설명할 수 있는 경험 */
  "설명할 수 있는 경험을 영역별로 보기": "See experience you can explain, by area",
  "그 영역에서 직접 정한 것이 확인됐습니다.": "We confirmed decisions you made yourself in this area.",
  "설명할 수 있는 근거 0": "Explainable evidence: 0",
  "다음 할 일: 검사 영역 하나를 해 보고 경험으로 추가하기": "Try one area from the assessment and add it as an experience.",
  "해 본 일은 확인됐습니다. 직접 정한 것까지 적으면 지원서에 쓸 수 있습니다.":
    "We confirmed you've done this. Add what you decided yourself, and you can use it in applications.",

  /* 산업과 직무 */
  "보고 있는 산업과 직무": "Industries and roles you're looking at",
  "산업#kind": "Industry",
  "직무#kind": "Role",
  "산업·직무 선택은 기술영역 결과에 영향 없음": "Industry and role choices don't change your area results",
};
