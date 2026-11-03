/**
 * 작업공간 영어 사전: recompute. 열쇠는 한국어 원문이다(`../ws-say.ts`).
 * `다시 시도` · `직접 정한 것` · `남긴 것` · `비교해 확인한 것#exp` · `쓰인 곳` 은
 * `./experience.ts` 에 있다(같은 말이 두 쪽에 선다)
 */
export const WS_EN_RECOMPUTE: Record<string, string> = {
  "저장한 경험 · 내 CareerMatri": "Saved experience · My CareerMatri",
  "저장한 경험": "Saved experience",
  "경험 저장": "Experience saved",

  /* 판단 단계. 검사가 쓰는 이름과 같다 */
  "아직 없음": "Never done it",
  "받아서 수행": "Followed a plan",
  "직접 수행": "Did it myself",
  "직접 결정": "Made the call",

  "다룬 문제": "Problems you worked on",
  "경험은 저장됐어요": "Your experience is saved",
  "현재 상태를 다시 확인하고 있어요": "We're rechecking your current state",
  "경험이 저장됐어요": "Your experience is saved",
  "적어 두신 경험이 어디로 갔는지": "Where your experience went",
  "현재 상태 갱신만 끝내지 못했습니다. 적어 주신 기록은 그대로 있습니다.":
    "We just couldn't finish updating your current state. Your record is still there.",
  "곧 끝납니다. 끝나면 현재 상태와 다음 할 일에 들어갑니다.":
    "This will be done soon. Then it will show up in your current state and next steps.",
  "저장한 경험이 어느 판단으로 갔는지 묶어 현재 상태와 맞춰 봤습니다.":
    "We grouped your saved experience by the judgment it counts toward and checked it against your current state.",
  "경험은 저장했지만 현재 상태를 갱신하지 못했습니다. 적어 주신 기록은 그대로 있으니 다시 적지 않으셔도 됩니다. 아래에서 `다시 시도` 를 눌러 주세요.":
    "We saved your experience but couldn't update your current state. Your record is still there, so you don't need to enter it again. Press “Try again” below.",
  "현재 상태를 다시 확인하고 있습니다. 잠시 뒤 이 쪽을 새로 열면 더해진 내용이 보입니다.":
    "We're rechecking your current state. Reload this page in a moment to see what was added.",
  "현재 상태에 더했습니다. 검사 당시 결과는 그대로 남습니다.":
    "Added to your current state. Your results at the time of the assessment stay the same.",
  "아직 바탕이 될 결과가 없습니다.": "There are no results to build on yet.",
  "경험은 저장됐습니다. 검사를 한 번 끝내면 그 결과 위에 이 기록이 쌓입니다.":
    "Your experience is saved. Once you finish an assessment, this record builds on those results.",
  "검사 시작하기": "Start an assessment",
  "실제 달라진 현재 상태": "What changed in your current state",
  "현재 상태에서 달라지는 것": "What will change in your current state",
  "부족했던 부분 {n}곳이 메워졌습니다 · {names}": "Missing pieces filled in: {n} · {names}",
  "부족했던 부분 {n}곳이 메워집니다 · {names}": "Missing pieces that will be filled in: {n} · {names}",
  "검사 당시 결과는 그대로 남습니다.":
    "Your results at the time of the assessment stay the same.",
  "다음에 보완할 것": "What to work on next",
  "현재 상태 확인하기": "See your current state",
  "다른 경험 추가하기": "Add another experience",
  "기록으로 확인된 역할과 판단": "Roles and judgments confirmed by your record",
  "현재 상태에 들어갔습니다. 같은 영역의 같은 판단에서 고른 항목이 둘이 되면 그때 직접 수행으로 올라갑니다.":
    "This is now part of your current state. Once you've picked two items for the same judgment in the same area, it moves up to “Did it myself”.",
  "현재 상태에 들어갑니다. 같은 영역의 같은 판단에서 고른 항목이 둘이 되면 그때 직접 수행으로 올라갑니다.":
    "This will be added to your current state. Once you've picked two items for the same judgment in the same area, it moves up to “Did it myself”.",
  "아직 고른 판단이 없습니다": "You haven't picked any judgments yet",
  "이 경험 고치기": "Edit this experience",
  "어느 경험이 어느 판단으로 갔는지 보기": "See which experience counts toward which judgment",
  "기술영역": "Technical area",
  "판단": "Judgment",
  "검사 당시": "At the assessment",
  "고르신 항목": "Items you picked",
  "어느 경험에서": "From which experience",
  "그대로": "No change",
  " 외 {n}": " and {n} more",
  "경험으로 올라갈 수 있는 가장 높은 단계는 직접 수행까지입니다. 직접 결정은 검사에서만 확인됩니다.":
    "Experience can take a judgment up to “Did it myself” at most. “Made the call” can only be confirmed through the assessment.",

  /* ── 단추 (`apply.tsx`) ── */
  "현재 상태를 다시 확인하고 있습니다…": "Rechecking your current state…",
  "현재 상태에 더하기": "Add to current state",
};
