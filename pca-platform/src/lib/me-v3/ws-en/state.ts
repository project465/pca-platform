/** 작업공간 영어 사전: state. 열쇠는 한국어 원문이다(`../ws-say.ts`) */
export const WS_EN_STATE: Record<string, string> = {
  /* 검사 전 */
  "+ 경험 추가": "+ Add an experience",
  "아직 볼 것이 없습니다": "Nothing to show yet",
  "검사를 한 번 끝내면 확인된 근거와 아직 부족한 부분이 여기에 나옵니다.":
    "Once you finish an assessment, your confirmed evidence and what's still missing will show up here.",
  "완료한 검사가 없습니다.": "You haven't finished an assessment yet.",
  "풀던 검사 이어하기": "Continue your assessment",
  "{major} 검사 시작": "Start the {major} assessment",
  "검사 시작": "Start the assessment",

  /* 머리 */
  "{at} 기준": "As of {at}",
  "검사 {at} 기준 · 아직 더한 경험 없음": "Based on your assessment from {at} · No experience added yet",
  "검사 {at} 결과에 그 뒤의 경험을 얹은 값입니다.":
    "Your assessment results from {at}, updated with the experience you've added since.",
  "아직 새 경험을 더한 적이 없어 검사 당시 결과와 같습니다.":
    "You haven't added any new experience yet, so this matches your results at the time of the assessment.",
  "새 경험을 더했습니다. 아래 `최근 달라진 것` 에 무엇이 달라졌는지 적혀 있습니다.":
    "Your new experience has been added. See “Recent changes” below for what changed.",
  "새 경험을 더했습니다. 달라진 것은 없습니다 · 같은 영역의 근거가 둘이 되면 그때 올라갑니다.":
    "Your new experience has been added. Nothing has changed yet · An area moves up once it has two pieces of evidence.",

  /* 설명할 수 있는 영역 */
  "현재 설명할 수 있는 영역": "Areas you can explain now",
  "개#unit": "",
  "가장 근거가 잘 잡힌 곳은 {name}입니다.": "Your evidence is strongest in {name}.",
  "{name}은 해 봤고 정리만 남았습니다.": "You've done work in {name}. It just needs writing up.",
  "정리만 남은 영역이 {n}개 더 있습니다.#one": "{n} more area just needs writing up.",
  "정리만 남은 영역이 {n}개 더 있습니다.": "{n} more areas just need writing up.",
  "변화는 생겼지만 아직 설명할 수 있는 기준까지는 올라오지 않았습니다. 무엇이 올라갔는지는 아래 `최근 달라진 것` 에 적혀 있습니다.":
    "Something changed, but not enough yet to give you an area you can explain. See “Recent changes” below for what moved up.",
  "관심이 높은 영역에서 짧게 한 번 해 보고 그것을 경험으로 적으면 여기에 나옵니다.":
    "Try something short in an area you're interested in and add it as an experience. It will show up here.",
  "전체 기술영역 보기": "See all technical areas",
  "정리만 남은 영역": "Just needs writing up",
  "경험 더함": "Experience added",
  " · 경험 더함": " · Experience added",

  /* 지금 할 일 */
  "지금 꼭 해야 하는 일은 없습니다. 새 경험을 적어 현재 상태를 다시 세우면 그다음 할 일이 나옵니다.":
    "There's nothing you need to do right now. Add a new experience to update your current state, and your next step will appear.",
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
  "그 밖에 {n}곳이 더 있습니다. 급한 차례대로 위에 셋을 적었습니다.#one":
    "There's {n} more. The three most pressing are listed above.",
  "그 밖에 {n}곳이 더 있습니다. 급한 차례대로 위에 셋을 적었습니다.":
    "There are {n} more. The three most pressing are listed above.",
  "지금 바로 보완할 부분은 없습니다. 남은 일은 가진 근거를 지원서에서 설명할 문장으로 만드는 것입니다.":
    "Nothing needs filling in right now. What's left is turning your evidence into sentences you can use in applications.",

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
  "{at} · {tier} · 그날의 문항과 기준으로 고정되어 있습니다. 경험을 더해도 이 줄은 한 글자도 달라지지 않습니다.":
    "{at} · {tier} · Locked to that day's questions and criteria. Adding experience won't change a word of it.",
  "결과 보기": "View results",
  "{at} 기준 · 그 결과 위에 새 경험을 얹은 값입니다.":
    "As of {at} · Those results, updated with your new experience.",
  "아직 새 경험을 더한 적이 없어 왼쪽과 같습니다.":
    "You haven't added any new experience yet, so this matches your assessment results.",
  "{name} 달라짐": "{name} changed",
  "두 값은 서로를 덮지 않습니다. 지원서에 적을 때는 검사 당시 결과를 근거로 쓰고, 다음에 무엇을 할지는 현재 상태를 보시면 됩니다.":
    "Neither one replaces the other. When you write applications, use your results at the time of the assessment as evidence. To decide what to do next, look at your current state.",

  /* 전체 기술영역 */
  "전체 기술영역": "All technical areas",
  "{n}곳": "{n}",
  "외 {n}곳": "+{n} more",

  /* 설명할 수 있는 경험 */
  "설명할 수 있는 경험을 영역별로 보기": "See experience you can explain, by area",
  "그 영역에서 직접 정한 것이 확인됐습니다.": "We confirmed decisions you made yourself in this area.",
  "지원서에서 설명할 수 있는 근거가 아직 없습니다.": "You don't have evidence to explain in applications yet.",
  "관심이 높은 영역에서 짧게 한 번 해 보고 그것을 적으면 여기에 그 경험이 쌓입니다.":
    "Try something short in an area you're interested in and write it up. That experience will build up here.",
  "해 본 것은 확인됐습니다. 여기서 무엇을 직접 정했는지까지 적으면 지원서에서 쓸 수 있습니다.":
    "We confirmed you've done this. Add what you decided yourself, and you can use it in applications.",

  /* 산업과 직무 */
  "보고 있는 산업과 직무": "Industries and roles you're looking at",
  "산업#kind": "Industry",
  "직무#kind": "Role",
  "산업과 직무는 같은 근거를 그쪽 말로 다시 읽어 주는 곳입니다. 고른 산업이나 직무가 기술영역 결과를 바꾸지는 않습니다.":
    "Industries and roles show the same evidence in that field's terms. Picking an industry or role doesn't change your technical area results.",
};
