/**
 * 화면 JSX 글의 영어(`phrase.ts`). **열쇠는 한국어 원문 그대로다.**
 *
 * 열쇠를 고치지 않는다: 한국어 문장을 고치면 그 열쇠도 바뀌어 여기서 빠진
 * 것으로 잡힌다(`npm run v3:i18n`). 그것이 이 꼴을 고른 까닭이다.
 *
 * 영어는 학생이 읽는 제품 영어로 다시 썼다. 한국어 어순을 따르지 않고,
 * 대시를 쓰지 않고, 화면이 하는 일을 설명하기보다 학생에게 말한다.
 * 결과지 글도 한국어와 같은 선을 지킨다: 적합 · 합격 · 순위 · 점수를 말하지 않는다.
 */
export const PHRASES_EN: Record<string, string> = {
  /* ── 검사 화면 (`screen.tsx` · `page.tsx`) ───────────────────────── */
  "저장 실패 · 다시 시도": "Couldn't save · Try again",
  "저장 중…": "Saving…",
  "저장됨": "Saved",
  "자동 저장": "Autosave on",
  "검사 진행 · {now}": "Progress · {now}",
  "내 CareerMatri가 만들어졌습니다": "Your CareerMatri is ready",
  "뜻": "Means",
  "현재 학업 단계": "Where you are in your studies",
  "대학원 전공계열": "Graduate field",
  "이 검사는 {major} 경험을 읽습니다.": "This assessment looks at {major} experience.",
  "학부와 대학원이 모두 {major} 계열이 아니면 지금 드릴 수 있는 결과가 없습니다. 끝까지 답하셔도 결과가 비어 있어 여기서 멈춥니다.":
    "If neither your undergraduate nor your graduate studies were in {major}, we can't give you a result yet. Your results would come back empty, so we're stopping here.",
  "학부가 {major} 계열이면 위에서 다시 골라주세요. 전공별 검사는 준비되는 대로 전공 목록에 열립니다.":
    "If your undergraduate major was in {major}, change your answer above. Assessments for other majors will appear in the major list as they become available.",
  "전공 목록으로": "See all majors",
  "해 봤다고 답한 일": "Areas you've worked in:",
  "가지": "",
  "고른 것": "Picked:",
  "개": "",
  "{n}개": "{n}",
  "선택": "selected",
  "두 개까지 고를 수 있습니다. 다시 누르면 선택이 풀립니다":
    "You can pick up to two. Tap one again to unselect it.",
  "고르지 않고 넘어가셔도 됩니다": "It's fine to skip this",
  "아직 잘 모르겠습니다": "I'm not sure yet",
  "살펴본 업무 영역": "Work areas covered",
  "자세히 본 영역": "Areas you went deeper on",
  "실제 경험을 물은 문항": "Questions about real experience",
  "응답과 선택": "Your answers",
  "답한 문항 {n}개": "{n} {n|question|questions} answered",
  "고른 항목 {n}개": "{n} {n|item|items} picked",
  "관심 산업·직무": "Industries and roles you picked",
  "아직 답하지 않은 문항이 {n}개 있습니다": "{n} {n|question still needs|questions still need} an answer",
  "누르면 그 문항으로 돌아갑니다. 비워 둔 채 제출하셔도 되고, 답하지 않은 문항은 결과에 ‘답하지 않음’으로 표시됩니다.":
    "Tap one to go back to it. You can also submit as is. Any question you skip will show as “Not answered” in your results.",
  "답해야 하는 문항을 모두 채우셨습니다.": "You've answered every required question.",
  "나중에 경험을 더 넣으시면 결과를 다시 정리해 드립니다.":
    "Add more experience later, and we'll update your results.",
  "지금까지 답하신 것으로 결과를 정리합니다. 만든 뒤에도 이전으로 돌아가 고칠 수 있습니다.":
    "We'll build your results from your answers so far. You can still go back and change answers afterward.",
  "결과 보기": "See results",
  "내 경험을 업무 영역, 산업, 직무와 이어서 보여 드립니다":
    "Your experience, linked to work areas, industries and roles",
  "내 CareerMatri": "My CareerMatri",
  "지금 방향, 근거, 부족한 점을 한곳에서 봅니다":
    "Your direction, evidence and gaps in one place",
  "내가 가진 근거": "Your evidence",
  "확인된 경험과 고른 항목": "Confirmed experience and the items you picked",
  "아직 부족한 것": "What's still missing",
  "무엇이 부족하고 어떻게 채우면 되는지": "What's missing and how to fill it",
  "관심 산업과 직무": "Industries and roles",
  "산업 {i}개와 직무 {r}개를 다시 둘러봅니다": "Browse {i} industries and {r} roles again",
  "산업과 직무를 다시 둘러봅니다": "Browse industries and roles again",
  "새 경험 추가": "Add an experience",
  "새 경험을 넣으면 결과를 다시 정리할 수 있습니다":
    "Add a new experience to update your results",
  "이번 문항 그룹 답안 현황": "Answers in this section",
  "답안 현황": "Your progress",
  "답은 고를 때마다 저장됩니다. 창을 닫아도 이어서 풀 수 있습니다.":
    "Each answer saves as you go. You can close this window and pick up where you left off.",
  "화면 이동": "Navigation",
  "이전": "Back",
  "아직 답하지 않은 질문이 {n}개 있습니다": "{n} {n|question still needs|questions still need} an answer",
  "답을 고른 뒤 다음으로 넘어가세요": "Pick an answer to continue",
  "결과를 정리하고 있습니다": "Building your results",
  "결과 만들기": "Get my results",
  "계속": "Continue",
  "다음": "Next",
  "보기": "Options",
  "보기 고르는 법": "How to choose",
  "아직 답하지 않았습니다": "Not answered yet",
  "답할 차례": "Up next",
  "척도": "Scale",
  "예": "e.g.",
  "검사 · CareerMatri": "Assessment · CareerMatri",
  "{n}번째 화면": "Screen {n}",
  "이 전공": "this major",
  "전공": "Major",

  /* ── 시작 전 안내 (`intro/page.tsx`) ─────────────────────────────── */
  "검사 시작 전 안내 · CareerMatri": "Before you start · CareerMatri",
  "무엇을 보나요": "What it looks at",
  "관심 있는 일, 해 본 일, 그때 직접 정한 것을 봅니다. 전공 지식을 묻는 시험이 아닙니다.":
    "What you're interested in, what you've done, and what you decided yourself. It's not a test of what you know.",
  "어떻게 답하나요": "How to answer",
  "보기에서 고르기만 하면 됩니다. 처음 훑는 화면에서는 잘 모르는 일에 ‘모르겠다’를 고르셔도 됩니다.":
    "Just pick from the options. On the first quick-scan screens, it's fine to choose “Not sure” for anything unfamiliar.",
  "얼마나 걸리나요": "How long it takes",
  "내 전공과 경험을 정리합니다": "Let's map your major and your experience",
  "{major} 분야에서 해 본 일과 그때 직접 정한 것을 여쭙고, 내세울 수 있는 경험과 더 채울 부분을 정리해 드립니다.":
    "We'll ask what you've done in {major} and what you decided yourself, then show what you can talk about and what to build next.",
  "약 {mins}분 걸립니다. 답할 때마다 저장되니 중간에 닫아도 이어서 하시면 됩니다.":
    "About {mins} minutes. Every answer saves, so you can stop and come back anytime.",
  "검사 시작하기 →": "Start →",
  "나중에 하기": "Maybe later",
  "검사에 대해 더 알아보기": "More about this assessment",
  "{major} 전공자가 자주 하는 일": "Common work in {major}",
  "이런 일에서 무엇을 직접 정해 봤는지 여쭙니다. 해 본 적 없는 일은 ‘해 본 적 없음’을 고르시면 됩니다.":
    "We'll ask what you decided yourself in work like this. If you haven't done something, choose “Never done it.”",
  "이런 차례로 묻습니다": "What we'll ask, in order",
  "문항": "Questions",
  "응답 방식": "Format",
  "선택형": "Multiple choice",
  "중간 저장": "Saving",
  "문항마다 자동 저장": "Saves after every answer",
  "결과": "Results",
  "완료 후 바로 확인": "Ready as soon as you finish",

  /* ── 완료 (`done/page.tsx`) ─────────────────────────────────────── */
  "검사 완료 · CareerMatri": "Assessment complete · CareerMatri",
  "현재 확인된 영역": "What's confirmed now",
  "지금 설명할 수 있는 기술과 경험": "Skills and experience you can already explain",
  "먼저 보완할 부분": "What to strengthen first",
  "근거가 부족하거나 아직 설명하기 어려운 영역": "Areas with thin evidence or that are hard to explain yet",
  "다음 행동": "Your next step",
  "지금부터 준비하면 좋은 한 가지": "One thing worth starting on now",
  "검사가 완료되었습니다": "You're done",
  "답하신 내용에서 지금 설명할 수 있는 영역과 앞으로 보완할 부분을 정리했습니다.":
    "From your answers, we've mapped what you can explain today and what to strengthen next.",
  "결과에서 확인할 수 있는 것": "What's in your results",
  "결과 보기 →": "See results →",
  "내 CareerMatri로 이동": "Go to My CareerMatri",
  "지금 받은 결과는 그대로 보관됩니다. 나중에 경험을 더 넣으시면 ‘현재 상태’만 새로 정리됩니다.":
    "These results are saved as they are. If you add experience later, only your “Current status” will update.",
  "지금 받은 결과는 그대로 보관됩니다.": "These results are saved as they are.",
  "결과를 불러오지 못했습니다": "We couldn't load your results",
  "응답은 그대로 저장되어 있습니다. 잠시 뒤에 다시 확인해주세요.":
    "Your answers are safely saved. Please check again in a moment.",
  "다시 확인하기": "Check again",
  "홈으로 돌아가기": "Back to home",

  /* ── 시작 (`start/page.tsx` · `start-form.tsx`) ──────────────────── */
  "검사 시작 · CareerMatri": "Start · CareerMatri",
  "{major} 진로 진단": "{major} career assessment",
  "해 본 일 가운데 직접 정해 본 경험을 찾아 드립니다":
    "Find the experience where you made the calls",
  "적성이나 성격 검사가 아닙니다. {major}의 여러 업무 영역에서 무엇을 해 봤고 무엇을 직접 정했는지, 어디가 아직 부족한지 알려 드립니다.":
    "This isn't an aptitude or personality test. It shows what you've done across {major} work areas, what you decided yourself, and where you still have gaps.",
  "무엇을 해 봤는지": "What you've done",
  "영역마다 해 본 일을 여쭙니다": "We ask about your work in each area",
  "무엇을 직접 정했는지": "What you decided",
  "같은 일이라도 시킨 대로 한 것과 내가 정한 것을 구분합니다":
    "Following instructions and making the call yourself count differently",
  "어떤 경험이 아직 부족한지": "What's still missing",
  "부족한 부분과 다음에 준비하면 좋을 것을 정리합니다":
    "Your gaps, and what to work on next",
  "약": "About",
  "분#unit": " min",
  "문항#unit": " questions",
  "묻는 순서": "What we'll ask",
  "업무 영역마다 관심이 있는지, 해 봤는지, 배우고 싶은지 여쭙니다":
    "For each work area: your interest, whether you've done it, and whether you'd like to learn it",
  "해 본 일이 있는 영역은 조금 더 자세히 여쭙니다":
    "A few more questions about areas you've worked in",
  "그 가운데 몇 영역은 범위·방법·결과·활용까지 나눠서 여쭙니다":
    "For some of those areas, a closer look at scope, method, results and use",
  "과제나 프로젝트 하나를 골라 지원서에 쓸 말로 정리하고, 관심 산업과 직무를 하나씩 더 자세히 봅니다":
    "Turning one project into words for your applications, plus a closer look at one industry and one role",
  "시작하기 전에": "Before you start",
  "해 본 적 없는 일은 ‘해 본 적 없음’을 고르시면 됩니다. 그 답도 결과에 들어갑니다":
    "If you haven't done something, choose “Never done it.” That answer counts too",
  "학위가 높다고 결과가 좋아지지 않습니다. 질문에 나오는 상황 설명만 달라집니다":
    "A higher degree doesn't mean better results. Only the examples in the questions change",
  "창을 닫아도 보던 위치에서 이어집니다. 이전으로 돌아가 수정할 수 있습니다":
    "Close the window anytime and pick up where you left off. You can go back and change answers",
  "낯선 용어에는 질문 바로 아래에 쉬운 풀이를 붙였습니다. 용어를 몰라도 결과에 불리하지 않습니다.":
    "Unfamiliar terms are explained right under each question. Not knowing a term won't count against you.",
  "계열에 따라 질문 속 상황만 달라지고, 결과를 보는 기준은 같습니다.":
    "Your field only changes the examples in the questions. Results are read the same way.",
  "대학원 전공계열을 선택해주세요.": "Please choose your graduate field.",
  "학업 단계를 선택해주세요.": "Please choose where you are in your studies.",
  "검사 시작": "Start",
  /* ── 결과지 (`result/page.tsx` · `summary.tsx` · `charts.tsx`) ───────── */
  /* 결과지 글은 한국어와 같은 선을 지킨다: 적합 · 합격 · 순위 · 점수를 말하지 않는다 */
  "결과 · CareerMatri": "Your results · CareerMatri",
  "이 직무에서 맡는 범위": "What this role covers",
  "이 직무에서 자주 묻는 것": "What this role often asks about",
  "확인된 경험 전부 보기": "See all confirmed experience",
  "여기서도 쓸 수 있는 경험": "Experience you can use here too",
  " 외": " and more",
  "여기서 한 번 더 보는 것": "What gets a closer look here",
  "다음에 만들 근거": "Evidence to build next",
  "아직 고른 것이 없습니다": "Nothing picked yet",
  "외 {n}개": "+{n} more",
  "높음": "High",
  "보통": "Medium",
  "낮음": "Low",
  "없음": "None",
  "1~2회": "Once or twice",
  "3회 이상": "3 or more times",
  "관심": "Interest",
  "답하지 않음": "No answer",
  "해 본 횟수": "Times tried",
  "배울 뜻": "Wish to learn",
  "이 영역이 일하는 차례": "How work flows in this area",
  "흔히 남기는 결과물": "Typical outputs",
  "해 봤다고 고른 것": "What you said you've done",
  "남겼다고 고른 결과물": "Outputs you said you produced",
  "비교했다고 고른 대상": "What you said you compared against",
  "직접 정했다고 고른 것": "What you said you decided yourself",
  "골랐지만 응답으로는 아직 확인되지 않은 것": "Picked, but not yet backed by your answers",
  "아직 고르지 않음 · {list}": "Not picked yet · {list}",
  "상세 근거 보기": "See the detailed evidence",
  "확인된 판단 {a} · 직접 정한 것 {b}": "Confirmed {a} · Decided yourself {b}",
  "검사에서 해 봤다고 답했고, 근거 항목(판단 · 결과물 · 비교 대상)은 고르지 않았습니다":
    "You said you've done this, but didn't pick any evidence (a decision, an output or a comparison)",
  "고른 항목": "What you picked",
  "고르신 근거 항목이 없어, 지금은 설명할 재료가 없습니다":
    "You didn't pick any evidence, so there's nothing to explain it with yet",
  "검사에서 해 봤다고 답했지만 근거 항목을 고르지 않은 판단이 {n}개 있습니다. 지금은 설명할 재료가 없습니다.":
    "For {n} {n|judgment|judgments} you said you've made, you didn't pick any evidence. There's nothing to explain {n|it|them} with yet.",
  "전체": "All areas",
  "연구·프로젝트를 직무 언어로": "Your research and projects in the language of the job",
  "적어주신 과제를 지원서와 면접에서 말하는 차례로 나눴습니다.":
    "We've laid out your project in the order you'd tell it in an application or interview.",
  "지원서에서 이렇게 묶어볼 수 있습니다": "How you could put it together in an application",
  "작성 근거 자세히 보기": "See what this is based on",
  "대학원 경험을 어디에 걸칠지": "Where your graduate experience fits",
  "학부에서 {major}을(를) 하시고 대학원은 다른 분야를 하셨다고 답해주셨습니다. 대학원 경험은 {major} 영역 확인과 따로 보고, 아래 번역에서 읽었습니다.":
    "You told us you studied {major} as an undergraduate and a different field in graduate school. We kept your graduate experience separate from your {major} areas and read it in the translation below.",
  "아직 적지 않으신 단계 {n}개 ·": "{n} {n|step|steps} still to fill in ·",
  "지원서 문단의 뼈대: 역할 · 행동 · 판단 · 결과":
    "The frame of an application paragraph: role · action · decision · result",
  "네 칸은 고르신 보기 그대로입니다. 한 문단으로 잇는 것과 수치 · 기간 · 결과를 채우는 것은 직접 하셔야 하고, 여기에 없는 성과를 적지 않습니다.":
    "These four boxes are exactly what you picked. Turning them into a paragraph and adding numbers, dates and results is up to you. Don't add achievements that aren't here.",
  "응답이 적어 다음 걸음까지 적지 못했습니다.": "There weren't enough answers to suggest a next step.",
  "{where}에서 해 본 일이 이어져요": "Builds on what you've done in {where}",
  "아직 이쪽으로 이어지는 경험은 보이지 않습니다": "None of your experience leads here yet",
  "먼저 적어 두기": "Write it down first",
  "산업": "Industry",
  "아직 없음": "None yet",
  "직무": "Role",
  "권역": "Region",
  "아직 고르지 않으셨습니다": "Not chosen yet",
  "기관 유형": "Type of organization",
  "문제로 잡은 것": "The problem you took on",
  "요구를 조건으로 옮긴 것": "How you turned requirements into conditions",
  "직접 판단한 것": "What you decided",
  "쓴 방법": "Methods you used",
  "만든 것": "What you made",
  "비교하고 확인한 것": "What you compared and checked",
  "고친 것": "What you fixed",
  "결과가 쓰인 곳": "Where the result was used",
  "{date} 응답": "Answered {date}",
  "진로 분석 리포트": "Career analysis report",
  "지금 무엇이 확인됐는가": "What your answers show",
  "무엇이 더 필요한가": "What's still missing",
  "다음에 무엇을 하면 되는가": "What to do next",
  "한눈에 보는 결과": "Your results at a glance",
  "내가 이미 가진 근거": "Evidence you already have",
  "적을 과제 고르기": "Pick something to write up",
  "지원서·면접에서 쓸 문장": "Sentences for applications and interviews",
  "산업·직무 연결": "Industries and roles",
  "부록": "Appendix",
  "먼저 볼 영역": "Areas to look at first",
  "앞으로 채울 것": "What to fill in next",
  "전체 기술영역과 경험·근거 분포": "All technical areas, with your experience and evidence",
  "전체 기술영역": "All technical areas",
  "이 경험을 쓸 곳": "Where this experience fits",
  "검사에서 고르신 목표": "Goals you picked in the assessment",
  "이 결과를 읽는 기준": "How to read these results",
  "이 리포트는 응답한 내용만으로 만들어집니다. 적성이나 합격 가능성을 내지 않고, 순위도 매기지 않습니다.":
    "This report is built only from your answers. It doesn't measure aptitude, predict hiring outcomes or rank you.",
  "현재 상태": "Where you are now",
  "전체 보기 →": "See everything →",
  "지금 할 일": "Next step",
  "지금 적어두기": "Write it down now",
  "그 밖에 할 일 {n}개 ∨": "{n} more {n|step|steps} ∨",
  "할 일에 담아두기": "Save to my to-do list",
  "이미 담아 둔 할 일 {n}개 ·": "{n} already saved ·",
  "보실 산업과 직무를 아직 고르지 않으셨어요.": "You haven't picked an industry or role to look at yet.",
  "지원서에서 꺼내 쓸 경험은 무엇인가": "Which experience can you use in applications?",
  "다음 할 일 →": "Next steps →",
  "아래 항목은 전부 검사에서 스스로 고른 답입니다. 네 층으로 적습니다: 해 봤다고 고른 것 → 직접 정했다고 고른 것 → 남겼다고 고른 결과물 → 비교했다고 고른 대상. 파일이나 평가처럼 밖에서 확인한 기록은 아니고, 그룹 표시와 상태 문장만 검사가 정한 것입니다. 권하는 행동은 ‘적을 과제 고르기’ 에 따로 적습니다.":
    "Everything below is what you picked yourself in the assessment, in four layers: what you've done → what you decided yourself → outputs you produced → what you compared against. None of it comes from files or outside reviews. Only the group labels and status lines come from the assessment. Suggested next steps are under ‘Pick something to write up’.",
  "지원서로 옮길 재료가 있는 경험 {n}가지입니다.": "You have {n} {n|experience|experiences} with material for your applications.",
  "남겼다고 고른 것 · {x}": "Output you picked · {x}",
  "남긴 것 확인 필요": "Output still to confirm",
  "수치 · 기간 · 결과는 여기 없습니다. 지원서에 옮길 때 직접 적습니다.":
    "Numbers, dates and results aren't included here. Add them yourself when you write your application.",
  "지원서로 옮길 만큼 확인된 경험은 아직 없어요. 아래 ‘적을 과제 고르기’부터 보시면 돼요.":
    "You don't have experience that's ready for applications yet. Start with ‘Pick something to write up’ below.",
  "이런 걸 해보면 여기에 적혀요.": "Try something like this and it will show up here.",
  "먼저 써볼 경험": "Experience to start with",
  "지원서": "Application",
  "면접에서 이어질 물음": "Likely interview follow-up",
  "손에 남은 것": "What you have to show",
  "면접": "Interview",
  "다른 경험도 남아 있습니다": "You have other experience too",
  "{major} 쪽에서 흔히 남기는 것": "What {major} students usually produce",
  "이 가운데 하나라도 손에 있으면 위의 ‘남아 있는 결과’ 가 채워집니다.":
    "If you have even one of these, ‘What you have to show’ above fills in.",
  "전체 보기": "See all",
  "지원서에서 설명할 수 있는 경험": "Experience you can explain in applications",
  "직접 정한 것으로 확인됐고, 고른 근거 항목이 함께 있는 영역입니다.":
    "Areas where you decided things yourself and picked evidence to back it up.",
  "이 밖에 {n}가지가 더 확인됐습니다. 위의 영역별 설명에서 보실 수 있어요.":
    "{n} more {n|was|were} confirmed. You'll find {n|it|them} in the area notes above.",
  "지원서로 옮길 영역은 아직 없습니다. 아래 ‘적을 과제 고르기’ 가운데 하나를 끝내면 이 칸이 먼저 채워집니다.":
    "No areas are ready for applications yet. Finish one item under ‘Pick something to write up’ below, and this is the first place it shows.",
  "경험은 있지만 설명 근거를 더 붙일 부분": "Experience that needs more to back it up",
  "해 본 것은 확인됐고, 어디까지 직접 정했는지가 덜 적힌 영역입니다.":
    "Areas where you've done the work, but it's less clear what you decided yourself.",
  "이 밖에 {n}가지가 더 있어요.": "There {n|is|are} {n} more.",
  "여기에 해당하는 영역은 지금 없습니다. 해 본 일이 확인된 영역에서 어디까지 직접 정했는지를 적으면 이 칸이 생깁니다.":
    "No areas fit here right now. In areas where you've done the work, note how much you decided yourself and this section will appear.",
  "근거가 어디에 어떻게 남아 있는가": "Where your evidence is, and in what form",
  "다음에 또 무엇을 적으면 되는가": "What to write up after that",
  "다른 영역부터 적어도 돼요": "You can start with another area",
  "어느 영역이든": "Any area",
  "적고 나서 쓸 지원서 문장 →": "Application sentences to use afterward →",
  "적어 둔 경험 보기 →": "See your saved experience →",
  "영역마다 무엇을 적나요": "What to write for each area",
  "지금 응답만으로는 다음 한 걸음을 적을 만큼 영역 사이에 차이가 생기지 않았습니다. 위의 영역 가운데 하나를 짧은 과제로 한 번 해보신 뒤에 다시 보시면 여기에 적힙니다.":
    "Your answers don't show enough difference between areas to suggest a next step. Try one of the areas above as a short project, then come back. Your next step will show here.",
  "{major} 쪽에서 지금 할 수 있는 한 걸음": "A step you can take now in {major}",
  "그 경험을 지원서에서 꺼내는 법": "How to bring that experience into an application",
  "면접에서 같은 구조로 다시 묻는 질문": "Interview questions that follow the same structure",
  "이 경험이 어느 산업으로 이어지는가": "Which industries this experience leads to",
  "{x} 쪽에 연결하면": "Linking it to {x}",
  "같은 경험을 {x}에서 쓰는 표현으로 놓았습니다. 맞는다거나 맞지 않는다고 판정하지 않습니다.":
    "We've put the same experience in the terms {x} uses. This isn't a judgment of whether you fit.",
  "다른 산업에서 보시려면 다시 응시하지 않아도 됩니다. 기술영역 결과는 산업을 바꿔도 그대로입니다.":
    "You don't need to retake the assessment to look at another industry. Your technical area results stay the same whichever industry you pick.",
  "{x} 직무에 연결하면": "Linking it to the {x} role",
  "같은 경험을 {x}에서 먼저 읽는 차례로 놓았습니다. 기술영역 결과는 그대로입니다.":
    "We've reordered the same experience the way a {x} role would read it. Your technical area results don't change.",
  "같이 놓고 보실 직무 {x}": "Roles to compare alongside: {x}",
  "전체 기술영역과 지역 자료 보기": "See all technical areas",
  "먼저 볼 영역 · 비어 있는 칸 · 열두 영역 전체": "Areas to look at first · gaps · every area",
  "응답에서 확인된 내용만 정리했습니다. 아래 항목은 전부 검사에서 스스로 고른 답이고, 파일이나 평가처럼 밖에서 확인한 기록이 아닙니다.":
    "This covers only what your answers show. Everything below is what you picked yourself in the assessment, not something checked by anyone else, like files or reviews.",
  "지금 응답만으로는 어느 영역이 앞선다고 보기 어렵습니다. 아래 전체 영역에서 한 가지를 골라 짧게 해 보고, 무엇을 했고 무엇을 정했는지 다섯 줄로 적어보세요.":
    "Your answers don't put one area clearly ahead. Pick one from the full list below, try it briefly, and write five lines on what you did and what you decided.",
  "같이 놓고 볼 영역": "Areas to look at alongside",
  "먼저 볼 영역과 같은 상태이거나 바로 다음입니다. 차례를 매기지 않았습니다.":
    "These are in the same state as your first areas, or just behind them. They aren't ranked.",
  "무엇을 더 채우면 되는가": "What to fill in",
  "무엇이 비었는지와 그것이 왜 필요한지를 적었습니다.": "Here's what's missing and why it matters.",
  " 할 일은 위 ‘적을 과제 고르기’ 에 영역별로 모았습니다.":
    " The steps to take are grouped by area under ‘Pick something to write up’ above.",
  "완전히 비어 있는 축은 없습니다. 남은 일은 확인된 경험을 설명 문장으로 만드는 쪽입니다.":
    "No kind of judgment is missing entirely. What's left is putting the experience you have into words.",
  "지금 응답만으로는 비어 있는 축을 셀 만큼의 경험이 모이지 않았습니다.":
    "Your answers don't include enough experience yet to tell what's missing.",
  " 위 ‘적을 과제 고르기’ 의 첫 줄부터 해 보시면 됩니다.":
    " Start with the first item under ‘Pick something to write up’ above.",
  "여기서부터는 참고 자료입니다. 앞의 내용만으로도 지금 상태와 다음 행동을 확인하실 수 있습니다.":
    "From here on it's reference material. What's above already shows where you are and what to do next.",
  "이번 응답에서 무엇이 확인됐는가": "What this assessment confirmed",
  "전체 기술영역이 지금 어디에 있는가": "Where each technical area stands",
  "순위를 매기지 않고 현재 상태를 보여드립니다.": "This shows where things stand, without ranking them.",
  "관심과 배울 뜻에 답하신 내용으로만 묶었습니다.": "Grouped only by what you said about interest and wish to learn.",
  "전체 기술영역 상태 보기": "See every technical area",
  "나머지 그룹에 해당하는 영역은 지금 없습니다. 더 채울 곳은 ‘앞으로 채울 것’ 에 적혀 있습니다.":
    "No areas fall into the other groups right now. What to fill in is under ‘What to fill in next’.",
  "이번 응시에서 묻지 않은 영역입니다. 경험이 없다는 뜻이 아닙니다.":
    "We didn't ask about these areas this time. It doesn't mean you have no experience in them.",
  "영역 훑기에서 같은 값으로 답하신 둘을 놓고 {x} 쪽을 고르셨습니다. ":
    "You gave two areas the same answer in the quick scan and chose {x}. ",
  "위의 그룹은 그 선택과 상관없이 응답에서 나온 것입니다.": "The groups above come from your answers, not from that choice.",
  "여러 영역에서 공통으로 확인된 판단": "Judgments confirmed across areas",
  "어느 기술영역에서 한 일인지까지는 묻지 않았습니다. 그래서 위의 영역별 결과에는 들어가지 않습니다.":
    "We didn't ask which technical area these came from, so they aren't part of the area results above.",
  "직접 정한 것으로 확인": "Confirmed as your own call",
  "해 본 것으로 확인": "Confirmed as done",
  "고르신 판단 모두 보기": "See all the judgments you picked",
  "직접 정하고 그 결과가 쓰였다고 답하신 것": "Calls you made whose results were used",
  "직접 해 보셨다고 답하신 것": "Things you said you did yourself",
  "{major} 쪽에서 먼저 보는 영역": "Key areas in {major}",
  ". 아래 막대에서 그 영역을 먼저 보시면 됩니다.": ". Look for those areas first in the bars below.",
  ". 위 그룹에서 그 영역을 먼저 보시면 됩니다.": ". Look for those areas first in the groups above.",
  "내 경험은 어느 단계까지 와 있는가": "How far your experience has come",
  "영역별 경험 단계": "Experience stage by area",
  "이번 응시에서 판단을 물은 영역입니다. 막대의 길이는 물은 축의 수이고, 영역마다 물은 축의 수가 달라 비율로 바꾸지 않습니다.":
    "These are the areas where we asked about judgment this time. Bar length is how many kinds of judgment we asked about. That number differs by area, so we don't turn it into a percentage.",
  "위에 적은 상태를 그림으로 다시 보여 드립니다. 점수도 순위도 아닙니다.":
    "This shows the same status as above, as a picture. It isn't a score or a ranking.",
  "이 경험을 쓸 곳은 어디에 있는가": "Where you could use this experience",
  "이 경험이 활용될 수 있는 일": "Work where this experience applies",
  "확인된 기술영역이 어느 산업과 직무에서 자주 쓰이는지를 적은 것입니다. 적합도나 합격 가능성이 아니고, 함께 살펴볼 곳을 가리킵니다.":
    "This shows which industries and roles often use the technical areas confirmed in your answers. It isn't a measure of fit or hiring chances. It points to places worth exploring.",
  " · 이 산업이 중심으로 보는 영역 {n}곳": " · {n} core {n|area|areas} for this industry",
  " · 이 직무가 중심으로 쓰는 영역 {n}곳": " · {n} core {n|area|areas} for this role",
  "순위가 아닙니다. 같은 수가 나온 항목은 순서를 매기지 않습니다.":
    "This isn't a ranking. Items with the same count aren't put in order.",
  "이 지역에서 함께 볼 곳": "Places to look at in this region",
  "{region} 기준으로 함께 탐색해 볼 수 있는 기관입니다. 채용 여부나 합격 가능성과는 관계가 없습니다.":
    "Organizations worth exploring in {region}. This says nothing about hiring or your chances.",
  "{majors} 전공에서 이어 볼 수 있습니다": "Related majors: {majors}",
  "전공 연결은 아직 적히지 않았습니다": "No related majors listed yet",
  "지역 기업·기관 더 보기 →": "See more local organizations →",
  "이 지역의 기관 목록은 아직 비어 있습니다": "No organizations are listed for this region yet",
  "기관은 공식 홈페이지와 공공데이터에서 확인한 것만 적습니다. 확인되기 전까지 짐작으로 채우지 않습니다.":
    "We only list organizations confirmed through official websites and public data. Until then, we don't guess.",
  "지금 {region} 기준으로 보고 계십니다. 이 선택은 기술영역 결과를 바꾸지 않습니다.":
    "You're viewing this for {region}. This choice doesn't change your technical area results.",
  "희망 지역을 고르면 산업과 직무를 읽는 순서가 그 권역 기준으로 바뀝니다. 기술영역 결과는 그대로입니다.":
    "Choose a preferred region and industries and roles will be ordered for that region. Your technical area results stay the same.",
  "권역과 고르신 것 보기": "See regions and your choices",
  "권역마다 일자리의 성격이 다릅니다": "Jobs differ from region to region",
  "기관 수와 기업 목록은 아직 담지 않았습니다. 공개 통계를 붙이기 전까지 짐작으로 채우지 않습니다.":
    "Organization counts and company lists aren't included yet. We won't fill them in with guesses before public statistics are added.",
  "이 넷이 모이면 그 조합을 물어볼 수 있습니다": "With these four, you can ask about that combination",
  "지금은 물어볼 자료가 없어서 답을 내지 않습니다. 고르신 넷은 내 CareerMatri에 남아 있고, 공고와 기관 자료가 들어오면 그 조합부터 보여드립니다.":
    "There's no data to answer with yet, so we don't give an answer. Your four choices are saved in My CareerMatri, and once job postings and organization data come in, we'll show that combination first.",
  "희망 지역 고르기": "Choose a preferred region",
  "결과 읽는 기준과 고르신 목표": "How to read your results, and the goals you picked",
  "응시하면서 고르신 것입니다. 기술영역 결과에는 들어가지 않고, 산업과 직무를 읽는 순서에만 쓰입니다.":
    "You picked these during the assessment. They don't affect your technical area results. They only set the order industries and roles appear in.",
  "고르신 조직환경": "Work settings you picked",
  "그런 일자리가 있는 기관": "Organizations with that kind of work",
  "목표 산업": "Target industries",
  "목표 직무": "Target roles",
  "가고 싶은 조직": "Where you'd like to work",
  "결과 읽는 기준": "How to read your results",
  "재는 것": "What this measures",
  "해 본 일에서 무엇을 직접 정했는지입니다. 적성이나 성격이 아니고, 능력의 높낮이도 아닙니다.":
    "What you decided yourself in the work you've done. Not aptitude or personality, and not how able you are.",
  "재지 않는 것": "What this doesn't measure",
  "합격 가능성과 연봉과 순위입니다. 그 셋은 이 응답으로 알 수 없고, 적어 두면 그걸 믿고 움직이는 사람이 생깁니다.":
    "Your hiring chances, salary or rank. Your answers can't tell us those, and if we wrote them down, people would act on them.",
  "‘아직’의 뜻": "What ‘not yet’ means",
  "못 한다는 뜻이 아닙니다. 지금 응답에서 그 직무의 근거를 찾지 못했다는 뜻이고, 경험을 하나 적으면 달라집니다.":
    "It doesn't mean you can't. It means we didn't find evidence for it in your answers this time. Add one experience and that can change.",
  "고정되어 있습니다": "This result is locked in",
  "응시하신 시점의 문항과 기준으로 고정되어 있습니다. 나중에 기준이 바뀌어도 이 결과는 달라지지 않습니다.":
    "It uses the questions and criteria from when you took the assessment. If the criteria change later, this result stays the same.",
  "고르신 근거 {n}": "Evidence picked {n}",
  "파일럿 의견 적기": "Share pilot feedback",
  "남긴 기록": "Your records",
  "경험 {n}개 모두 보기 →": "See all your experience ({n}) →",
  "담아 둔 할 일 {n}개 →": "{n} saved {n|to-do|to-dos} →",
  "이 결과는 그날의 기록입니다#end": "This result is a record of the day you took it",
  "이 결과는 고정돼 있습니다. 다시 열어도 같은 내용이 나옵니다.#end":
    "It's locked in, so you'll see the same thing whenever you open it.",
  "PDF 저장": "Save as PDF",
  "다음 한 줄은 내 CareerMatri에서": "Pick up where you left off in My CareerMatri",
  "이 결과는 그날의 기록으로 고정되어 있습니다. 경험을 더하면 지금 상태가 이어서 바뀝니다.":
    "This result is saved as a record of that day. As you add experience, your current status keeps updating.",
  "담아 둔 할 일 {n}개": "{n} saved {n|to-do|to-dos}",
  "적어 둔 경험 {n}개": "{n} saved {n|experience|experiences}",
  "이 기다리고 있어요": " waiting for you",
  "아직 담아 둔 것이 없어요. 위에서 하나를 고르면 저쪽에 쌓입니다":
    "Nothing saved yet. Pick one above and it'll be waiting for you there.",
  "내 CareerMatri 열기": "Open My CareerMatri",
  "경험 추가": "Add experience",
  "산업·직무": "Industries and roles",
  "매주 할 일과 공고 확인은": "Weekly to-dos and job postings continue in",
  "에서 이어집니다.": ".",
  "영역별로 보면": "By area",
  "지원서에 꺼내 쓸 경험": "Experience for your applications",
  "직접 정함": "Decided",
  "남은 결과물": "Outputs",
  "이번 답에서는 아직 지원서에 바로 쓸 만큼 정리된 경험이 없습니다. 아래 할 일 하나를 해 보고 경험을 적으면 여기가 채워집니다.":
    "None of your experience is ready to use in an application yet. Try one of the steps below, write up what you did, and this will fill in.",
  "다음에 할 일": "What to do next",
  "해 본 일 적기": "Write up what you did",
  "지금 답으로는 따로 적을 할 일이 없습니다.": "There's nothing specific to suggest from these answers.",
  "할 일 목록에 담기": "Save to my to-do list",
  "담아 둔 할 일 {n}개 ·": "{n} saved ·",
  "자세한 분석은 PDF에 있습니다": "The full analysis is in the PDF",
  "영역별 해설, 산업·직무 연결, 지원서 문장, 지역 기업 자료를 한 권으로 묶었습니다.":
    "Area-by-area notes, industry and role links, and application sentences, all in one document.",
  "PDF 받기": "Download PDF",
  "해본 적 없음": "Not tried",
  "경험이 있다고 답함": "Said you've done it",
  "응답에서 확인됨": "Confirmed in your answers",
  "조건·기준까지 직접 정함": "Set the conditions yourself",
  "이번 응시에서 판단을 물은 영역 {n}개의 확인 단계.": "How far each of the {n} {n|area|areas} we asked about has been confirmed.",
  "이번 응시에서 판단을 물은 영역만 축으로 나옵니다. 눈금 셋은 바깥으로 갈수록 확인된 단계가 높다는 뜻이고, 묻지 않은 영역은 아래 표가 글자로 적습니다.":
    "Only the areas where we asked about judgment appear as spokes. The farther out on the three rings, the further confirmed. Areas we didn't ask about are listed in the table below.",
  "물은 축 {n}개": "{n} {n|judgment|judgments} asked about",
  "{label} {n}개": "{label}: {n}",
  "아직": "Not yet",
  "영역": "Area",
  "확인된 판단": "Confirmed",
  "직접 정한 판단": "Decided yourself",
  "남겼다고 고른 것": "Outputs picked",
  "비교했다고 고른 것": "Comparisons picked",
  "단계": "Stage",
  "묻지 않음": "Not asked",
  "이번에 묻지 않음": "Not asked this time",
  "열두 영역이 모두 한 줄씩 나옵니다. 앞의 두 칸은 응답에서 확인된 판단축의 개수이고, 뒤의 두 칸은 응답에서 고른 항목의 개수입니다. 모두 스스로 답한 것이고, 밖에서 확인한 기록은 아닙니다. 개수를 더하거나 점수로 바꾸지 않습니다. 이번 응시에서 판단을 묻지 않은 영역은 그 사실을 그대로 적습니다.":
    "Every area gets one row. The first two columns count the kinds of judgment confirmed in your answers. The last two count the items you picked. It's all self-reported, not checked by anyone else. We don't add the counts up or turn them into a score. Areas where we didn't ask about judgment this time are marked as such.",
  "이 그래프는 응답에서 확인된 경험과 근거의 분포를 시각화한 것입니다. 적성·역량 순위나 직무 적합도를 의미하지 않습니다.":
    "This chart shows how the experience and evidence in your answers are spread out. It isn't a ranking of aptitude or ability, and it doesn't measure job fit.",
  "이미 결과를 받으셨습니다": "You've already received your results",
  "검사는 한 번만 응시합니다. 같은 사람의 응답이 두 벌 쌓이면 어느 쪽 결과를 봐야 하는지 알 수 없게 됩니다.":
    "The assessment is taken once. If someone's answers are recorded twice, there's no way to tell which result is theirs.",
  "다시 응시해야 할 사정이 있으면 학과 담당자에게 말씀해 주세요. 담당자가 열어 주면 바로 한 번 더 시작할 수 있습니다.":
    "If you have a reason to take it again, please contact us. Once it's reopened for you, you can start right away.",
};
