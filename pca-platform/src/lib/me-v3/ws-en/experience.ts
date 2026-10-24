/** 작업공간 영어 사전: experience. 열쇠는 한국어 원문이다(`../ws-say.ts`) */
export const WS_EN_EXPERIENCE: Record<string, string> = {
  /* ── 쪽 제목 ── */
  "경험 · 내 CareerMatri": "Experience · My CareerMatri",
  "경험 추가 · 내 CareerMatri": "Add an experience · My CareerMatri",
  "경험 고치기 · 내 CareerMatri": "Edit experience · My CareerMatri",

  /* ── 목록 (`page.tsx`) ── */
  "새 경험 추가": "Add an experience",
  "+ 새 경험 추가": "+ Add an experience",
  "적어 둔 것이 현재 상태에 더할 때 근거로 들어갑니다.":
    "What you record here is used as evidence when it's added to your current state.",
  "현재 상태를 다시 확인하고 있습니다. 끝나면 저절로 더해집니다.":
    "We're rechecking your current state. Your experience will be added automatically when it's done.",
  "경험 {n}건이 아직 현재 상태에 들어가지 못했습니다.":
    "Some of your experience hasn't been added to your current state yet ({n}).",
  "다시 시도": "Try again",
  "아직 적어 둔 경험이 없습니다.": "You haven't recorded any experience yet.",
  "새로 겪은 일을 쌓으면 현재 상태에 더할 수 있습니다.":
    "As you add things you've done, they can be added to your current state.",
  "첫 경험 추가": "Add your first experience",
  "적어 둔 경험#list": "Your recorded experience",
  "{n}건#count": "{n}",
  "문제로 잡은 것": "Problems you took on",
  "직접 정한 것": "What you decided",
  "남긴 것": "What you produced",
  "비교해 확인한 것#exp": "What you compared it against",
  "쓰인 곳": "Where it was used",
  "현재 상태에 더함": "Added to current state",
  "아직 더하지 않음": "Not added yet",
  "{word}을 고르지 않으셔서 아직 어느 판단으로도 가지 않았습니다":
    "No {word} picked, so this doesn't count toward any judgment yet",
  " · 날짜는 적어 둔 날입니다": " · Dated the day you recorded it",
  "고른 항목 없이 제목만 적어 두셨습니다.": "You recorded a title only, with no items picked.",
  "끝난 달": "Month ended",
  "기억해 둘 한 줄": "Your note",
  "고치기": "Edit",
  "이 기록 지우기": "Delete this record",

  /* ── 적는 자리 (`compose.tsx`) ── */
  "경험 고치기": "Edit experience",
  "적어 둔 경험 고치기": "Edit your experience",
  "새 경험 하나 추가": "Add an experience",
  "저장하지 못했습니다. 어떤 경험인지와 한 줄 설명을 채워주세요.":
    "We couldn't save this. Choose what kind of experience it was and describe it in one line.",
  "경험을 저장하지 못했습니다. 적어 주신 내용은 아직 저장되지 않았으니, 아래에서 한 번 더 눌러 주세요. 다시 안 되면 고객지원으로 알려 주세요.":
    "We couldn't save your experience. What you entered hasn't been saved yet, so please save again below. If it still doesn't work, let our support team know.",
  "올리신 파일에서 읽은 것을 보기로 옮겨 두었습니다. 파일에 없던 것은 비워 두었으니, 직접 정한 것과 남은 결과물을 골라 저장해 주세요.":
    "We've filled in the options with what we read from your file. Anything that wasn't in the file is left blank, so pick what you decided and what you produced, then save.",
  "적어 주신 메모를 보기로 옮겨 두었습니다. 맞지 않는 칸은 끄고 저장해 주세요.":
    "We've filled in the options from your note. Uncheck anything that doesn't fit, then save.",
  "고친 내용 저장": "Save changes",
  "어떤 경험인가요": "What kind of experience was it?",
  "수업·과제": "Courses and assignments",
  "들으면서 맡거나 제출한 것": "Work you took on or turned in for a class",
  "연구·프로젝트": "Research and projects",
  "직접 끌고 간 것": "Work you drove yourself",
  "현장·자격": "Work and credentials",
  "밖에서 맡았거나 따 둔 것": "Work outside school, or credentials you earned",
  "무엇을 했는지 한 줄로": "What you did, in one line",
  "시작한 달": "Month started",
  "대략이면 됩니다. 나중에 찾을 때만 씁니다.":
    "A rough date is fine. It's only used to help you find this later.",
  "그 결과가 어디에 쓰였나요": "Where was the result used?",
  "쓰인 곳이 없으면 비워 두세요. 비웠다고 불리해지지 않습니다.":
    "If it wasn't used anywhere, leave this blank. Leaving it blank won't count against you.",
  "수업이나 과제 평가에 들어갔다": "It was graded in a course or assignment",
  "제작이나 발주로 이어졌다": "It went on to be built or ordered",
  "시제품이나 장비에 적용됐다": "It was applied to a prototype or equipment",
  "공정이나 운전 기준이 바뀌었다": "It changed a process or an operating standard",
  "논문이나 학회 발표가 됐다": "It became a paper or a conference talk",
  "보고서나 과제 결과물로 제출됐다": "It was submitted as a report or project deliverable",
  "팀이나 다음 사람이 이어받았다": "A teammate or the next person took it over",
  "아직 쓰인 곳이 없다": "It hasn't been used anywhere yet",
  "더 적을 것이 있으면 (선택)": "Anything else to add (optional)",
  "아직 진행 중": "Still ongoing",
  "보완 설명 한 줄": "A one-line note",
  "결과를 바꾸지 않습니다. 결과를 쓸 때 당신의 말로 옮길 때만 읽고, 1년이 지나면 지웁니다.":
    "This doesn't change your results. We only read it when putting your results into your own words, and we delete it after one year.",
  "예: 하중 조건을 직접 정하고 시험값과 10% 안에서 맞췄습니다":
    "For example: I set the load conditions myself and matched the test values within 10%",
  "저장하면 무엇이 달라지는지 먼저 보여 드리고, 거기서 반영을 누르면 현재 상태에 들어갑니다. 검사 당시 결과는 그대로 남습니다.":
    "After you save, we'll show you what changes and add it to your current state. Your results at the time of the assessment stay the same.",
  "이걸 적으면 무엇이 달라지나요": "What changes when you add this?",
  "지원서와 면접에서 설명할 근거가 한 줄 늘어납니다.":
    "You'll have one more piece of evidence to explain in applications and interviews.",
  "부족했던 부분이 채워지면 다음 할 일이 그만큼 달라집니다.":
    "If it fills in something that was missing, your next steps change to match.",
  "검사 당시 결과는 그대로 남고, 현재 상태만 다시 계산됩니다.":
    "Your results at the time of the assessment stay the same. Only your current state is recalculated.",

  /* 전공 사전(`student/copy.ts`)의 말. 영어 원고가 있는 Core 셋과 기본값이다 */
  "기술 판단#flow": "Technical judgment",
  "직접 정한 것#flow": "What you decided",
  "기술영역#flow": "technical area",
  "개발 영역#flow": "development area",
  "영역#flow": "work area",
  "어떤 문제를 다뤘나요#flow": "What problem did you work on?",
  "어떤 문제를 풀었나요#flow": "What problem did you solve?",
  "무엇을 직접 정했나요#flow": "What did you decide yourself?",
  "예: 캡스톤에서 프레임 무게를 줄였던 경험#ex":
    "For example: cutting the weight of a frame in a capstone project",
  "예: 회로 실습에서 센서 값이 흔들리지 않게 잡았던 경험#ex":
    "For example: steadying a noisy sensor reading in a circuits lab",
  "예: 팀 프로젝트에서 로그인 기능을 만들었던 경험#ex":
    "For example: building the login feature for a team project",
  "예: 수업 과제에서 직접 맡았던 일 하나#ex":
    "For example: one thing you took on yourself in a class assignment",

  /* ── 세 걸음 (`steps.tsx`) ── */
  "무슨 경험": "The experience",
  "남은 것": "What came of it",
  "세 걸음 가운데 지금": "Where you are in three steps",
  "경험 하나만 떠올리면 됩니다": "Think of just one experience",
  "수업 과제든 동아리 일이든 직접 맡았던 것 하나를 고르고 한 줄로 적습니다. 지원서와 면접에서 꺼내 쓸 근거가 한 줄 늘고, 검사 당시 결과는 그대로 남습니다.":
    "Pick one thing you took on yourself, whether it was a class assignment or club work, and describe it in one line. You'll have one more piece of evidence for applications and interviews, and your results at the time of the assessment stay the same.",
  "그 일에서 무엇을 직접 정했나요": "What did you decide yourself in that work?",
  "할 일에서 넘어온 영역이 켜져 있습니다: {name}. 다른 영역의 일이면 바꾸셔도 됩니다. ":
    "The area from your next steps is already selected: {name}. If this was work in a different area, you can change it. ",
  "{word}을 고르면 그 영역에서 ": "Once you pick a {word}, start with ",
  "맡은 역할로 직접 정한 것": "what you decided yourself in your role",
  "을 먼저 고르고, 그다음에 다룬 문제를 고릅니다. 지원서와 면접에서 눈에 띄는 쪽은 한 일보다 직접 정한 것입니다.":
    " in that area, then choose the problem you worked on. In applications and interviews, what you decided stands out more than what you did.",
  "어느 {word}의 일이었나요": "Which {word} was this work in?",
  "여러 개 고를 수 있습니다.": "You can pick more than one.",
  "최근 결과에서 확인된 {word}부터 보여 드립니다.":
    "We're showing the {word}s from your latest results first.",
  "다른 {word} 보기 · {n}": "Other {word}s · {n}",
  "맡은 역할에서 직접 정한 것 · 지원서에서 눈에 띄는 쪽":
    "What you decided in your role · This is what stands out in applications",
  "그때의 상황": "The situation at the time",
  "{word}을 고르면 그 영역에서 직접 정한 것을 고르는 칸이 뜹니다. 고르지 않으시면 이 기록은 현재 상태에 더해지지 않고 목록에만 남습니다.":
    "Pick a {word} to see what you can choose as decided in that area. If you don't pick one, this record stays in your list but isn't added to your current state.",
  "손에 남은 것이 있나요": "Do you have something to show for it?",
  "남긴 결과물과 비교해 본 것을 고르면 같은 영역의 근거가 둘이 되고, 그만큼 현재 상태와 다음 할 일이 달라집니다. 없으면 비워 두셔도 됩니다.":
    "If you pick what you produced and what you compared it against, that area gets a second piece of evidence, and your current state and next steps change to match. If there's nothing, you can leave this blank.",
  "무엇이 남았나요": "What did you produce?",
  "해당하는 것이 없으면 비워 두셔도 됩니다.": "If nothing applies, you can leave this blank.",
  "무엇이 남았나": "What you produced",
  "무엇과 비교해 확인했나": "What you compared it against",
  "{name} · 다른 결과물 보기": "{name} · More outputs",
  "2단에서 {word}을 고르시면 그 영역에서 남긴 결과물과 비교해 확인한 것을 고를 수 있습니다.":
    "Pick a {word} in step 2, and you can choose what you produced in that area and what you compared it against.",
  "이전": "Back",
  "다음": "Next",
  "저장": "Save",
  "여기까지 저장": "Save for now",
};
