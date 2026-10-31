/** 작업공간 영어 사전: MAT(`/me/track` · 브리핑 · 사용법). 열쇠는 한국어 원문이다(`../ws-say.ts`) */
export const WS_EN_TRACK: Record<string, string> = {
  /* ── 머리 ─────────────────────────────────────────────── */
  "MAT · AI 취업비서": "MAT · AI career assistant",
  "AI 취업비서 · 이용 중": "AI career assistant · active",
  "AI 취업비서": "AI career assistant",
  "지원하는 동안 한 주씩 챙기는 취업비서입니다. 매주 브리핑에 가까운 마감, 이번 주 할 일 하나, 여러 공고가 함께 요구하는데 아직 비어 있는 것을 모읍니다. 공고마다 내 경험을 맞대 보고, 지원서 문장 뼈대를 내 기록으로 엮습니다. 지원은 직접 하시고, 자동으로 결제되지 않습니다.":
    "Your weekly assistant while you apply. Each briefing collects your nearest deadlines, one task for the week, "
    + "and what several postings ask for that your record doesn't show yet. Check any posting against your own "
    + "experience and get sentence outlines built from your record. You apply yourself, and nothing renews automatically.",
  "첫 1개월이 열렸습니다.": "Your first month is now open.",
  "이미 받으셨거나 받을 수 있는 결제가 없습니다.": "You've already claimed it, or there's no purchase that includes it.",

  /* ── 검사 먼저 ─────────────────────────────────────────── */
  "먼저 무료 검사부터": "Start with the free test",
  "공고 확인 · 경험 채우기 · 파일 읽기 · 내 자료 읽기 가운데 아무 도구나 합쳐서 2번 무료입니다. 그다음부터는 아래 기간권으로 이어집니다.":
    "Any two uses of posting check, memo-to-record, file reading or document reading are free in total. After that, pick a pass below.",
  "무료로 써 보는 중": "Free trial",
  "무료로 {n}번 남았습니다. 공고 확인 · 경험 채우기 · 파일 읽기 · 내 자료 읽기 가운데 아무 도구나 쓰시면 됩니다.": "{n} free uses left. Use them on any tool: posting check, memo-to-record, file reading or document reading.",
  "{n}번": "{n}",
  "매주 알림과 마감 알림, 무제한 공고 확인은 기간권에서 열립니다.": "Weekly reminders, deadline alerts and unlimited posting checks open with a pass.",
  "기간권 보기": "See passes",
  "무료 {n}번을 다 쓰셨습니다": "You have used all {n} free uses",
  "지원 시즌에는 공고마다 요구가 달라서 한 건으로는 모자랍니다. 기간권이 열리면 공고 수에 제한이 없고 마감 알림도 옵니다.":
    "Every posting asks for something different, so one check rarely covers a season. With a pass you can add as many postings as you like and get deadline alerts.",
  "경험 추가 화면에서 직접 적는 것은 계속 무료입니다. 메모를 옮겨 드리는 것은 기간권에서 이어집니다.":
    "Writing records yourself on the Add experience page stays free. Turning memos into records continues with a pass.",
  "무료 2번을 이미 다 쓰셨습니다. 아래에서 기간권을 고르시면 바로 이어집니다.":
    "You have already used both free tries. Pick a pass below to keep going right away.",
  "MAT 은 검사 결과에서 시작합니다": "MAT works from your test result",
  "이번 주 할 일, 공고 맞대기, 지원서 문장 뼈대가 모두 검사에서 확인된 내 경험과 부족한 부분을 읽습니다. 무료 검사는 12분 정도 걸리고, 끝나면 이 화면에서 바로 MAT 을 시작할 수 있습니다.":
    "Your weekly task, posting checks and sentence outlines all build on what the test found in your experience "
    + "and where the gaps are. The free test takes about 12 minutes, and you can start MAT from this page as soon as you finish.",
  "무료 검사 시작": "Take the free test",

  /* ── 지금 상태 ─────────────────────────────────────────── */
  "지금 상태": "Your plan",
  "{date}까지 열려 있습니다": "Active until {date}",
  " · 이어서 산 기간 포함": " · includes an extension you bought",
  "열려 있지 않습니다": "Not active",
  "아래에서 기간권을 고르시면 바로 열립니다.": "Pick a plan below and it opens right away.",
  "무료 검사를 마치면 기간권을 고를 수 있습니다.": "You can pick a plan once you finish the free test.",
  "PRO 결과지를 사셨습니다. 첫 1개월을 받으실 수 있습니다.": "You bought the PRO report, so your first month is included.",
  "첫 1개월 받기": "Claim your first month",

  /* ── 알림 ─────────────────────────────────────────────── */
  "이번 주 알림": "This week's notices",
  "읽지 않은 알림 {n}개": "{n} unread {n|notice|notices}",
  "새로 온 알림이 없습니다.": "No new notices.",
  "바로 가기": "Open",
  "모두 읽음으로": "Mark all as read",

  /* ── 공고 ─────────────────────────────────────────────── */
  "공고 확인": "Check a posting",
  "직접 찾은 채용 공고를 붙여 넣으면 요구 항목마다 내 경험이 있는지 나눠 보여 줍니다.":
    "Paste a job posting you found and MAT shows, requirement by requirement, what your record can back up.",
  "공고 이름": "Posting name",
  "예: OO전자 생산기술 신입": "e.g. Acme Robotics · Graduate Mechanical Engineer",
  "마감일 (알면)": "Deadline (if known)",
  "공고 본문": "Posting text",
  "하는 일, 자격 요건, 우대 사항이 들어 있는 부분을 붙여 넣어 주세요.":
    "Paste the part with the responsibilities, requirements and preferred qualifications.",
  "전공별 규칙으로 요구 항목을 뽑고, 판정은 내 결과와 경험으로 합니다.":
    "MAT pulls out the requirements using rules for your major and checks them against your result and experiences.",
  "지원은 공고를 낸 곳에서 직접 하시면 됩니다.": "You apply directly on the employer's site.",
  "공고와 내 경험 맞대 보기": "Check it against my record",
  "마감 미입력": "No deadline",
  "마감 지남": "Deadline passed",
  "오늘 마감": "Closes today",
  "마감 {n}일 전": "Closes in {n} {n|day|days}",
  "설명할 경험 {n}": "Backed {n}",
  "정리 필요 {n}": "Needs detail {n}",
  "아직 없음 {n}": "Not recorded {n}",
  " · 지원함": " · applied",
  " · 닫음": " · closed",
  "달력에 넣기": "Add to calendar",

  /* ── 경험 채우기 ───────────────────────────────────────── */
  "경험 채우기": "Add an experience from a note",
  "최근에 한 일을 편하게 적으면 경험 추가 화면의 보기로 옮겨 드립니다. 저장은 직접 하십니다.":
    "Write what you did recently in plain words. MAT moves it into the experience form, and you save it yourself.",
  "메모": "Note",
  "예: 마케팅원론 팀 과제에서 20대 대상 설문 문항을 짰고, 응답 120개를 엑셀로 정리해 발표했다.":
    "e.g. For my capstone I chose the bearing and shaft size for a small conveyor and checked the deflection by hand before we built the prototype.",
  "경험 기록으로 옮기기": "Turn it into an experience",

  /* ── 함께 열리는 것 · 설정 ─────────────────────────────── */
  "함께 열리는 것": "Also included",
  "관심 산업·직무 바꿔 다시 비교하기": "Compare again with other industries and roles",
  "산업과 직무를 둘씩 골라 그쪽 기준으로 내 경험을 다시 봅니다.":
    "Pick up to two industries and roles and see your experience through their requirements.",
  "설정": "Settings",
  "공고와 메모는 밖으로 보내지 않습니다": "Your postings and notes stay here",
  "붙여 넣은 공고와 메모는 이 서비스 안에서 전공별 규칙으로 읽습니다.":
    "Postings and notes you paste are read inside CareerMatri with rules for your major.",
  "주간 알림 메일 받음": "Weekly email: on",
  "주간 알림 메일 받지 않음": "Weekly email: off",
  "한 주에 한 통이고, 할 일과 공고 이름은 메일에 적지 않습니다.":
    "One email a week. It doesn't include your tasks or posting names.",
  "메일 끄기": "Turn off email",
  "메일로도 받기": "Also send it by email",

  /* ── 기간권 ───────────────────────────────────────────── */
  "기간 늘리기": "Extend your plan",
  "기간권 고르기": "Choose a plan",
  "지금 기간이 끝나는 날에서 이어 붙습니다.": "The new period starts when your current one ends.",
  "PRO 결과지를 사시면 첫 1개월이 함께 열립니다.": "Buying the PRO report includes your first month.",
  " · 한 번 결제 · 부가세 포함": " · one-time payment",
  "30일권을 열두 번 사는 것보다 {amount} 적습니다.": "{amount} less than buying the 30-day plan twelve times.",
  "한 달만 써 보고 정해도 됩니다.": "Try it for a month and decide.",
  "이어서 사기": "Extend",
  "결제하기": "Buy",
  "결제 준비 중": "Payment not open yet",
  "해외 요금을 준비하고 있습니다": "International pricing is coming soon",
  "한국 밖에서 결제하는 기간권은 곧 열립니다. 그동안 검사 결과와 내 CareerMatri 는 그대로 쓰실 수 있습니다.":
    "Plans for payment outside Korea will open soon. Your test result and My CareerMatri stay available in the meantime.",
  "이용 기록": "History",
  "기간권": "Plan",
  "시작": "Start",
  "끝": "End",
  "주문": "Order",
  "30일권": "30-day plan",
  "90일권": "90-day plan",
  "이전 기간권": "Earlier plan",
  "학교 제공 (계약 기간)": "From your school (contract period)",
  "90일 동안 이용합니다. 30일권을 세 번 사는 것보다 {amount} 적습니다.": "90 days of use. {amount} less than buying the 30-day plan three times.",
  "90일 동안 이용합니다. 한 학기 지원 시즌을 이어서 준비할 때 알맞습니다.": "90 days of use. A good fit for preparing through one semester's application season.",
  "PRO 구매 첫 1개월": "First month with PRO",


  /* ── 안 된 까닭(주소 `?e=`) ────────────────────────────── */
  "기간권이 열려 있지 않아 저장하지 못했습니다. 아래에서 기간권을 고르시면 바로 열립니다.":
    "We couldn't save it because your plan isn't active. Pick a plan below and it opens right away.",
  "공고 본문을 조금 더 붙여 넣어 주세요. 하는 일과 자격 요건이 들어 있으면 됩니다.":
    "Please paste a bit more of the posting. The responsibilities and requirements are enough.",
  "공고를 저장하지 못했습니다. 붙여 넣은 글은 그대로 두고 한 번 더 눌러 주세요.":
    "We couldn't save the posting. Your text is still there, so please try once more.",
  "메모를 한두 문장 더 적어 주세요. 무엇을 했고 무엇이 남았는지면 됩니다.":
    "Please add a sentence or two: what you did and what you produced.",
  "메모를 옮기지 못했습니다. 한 번 더 눌러 주세요.": "We couldn't move your note. Please try once more.",
  "MAT 은 검사 결과에서 시작하므로 무료 검사를 먼저 마쳐 주세요.":
    "MAT works from your test result. Please finish the free test first.",

  /* ── 브리핑 판(`brief.tsx`) ─────────────────────────────── */
  "오늘": "Today",
  "이번 주 브리핑": "This week's briefing",
  "{date} 기준입니다. 붙여 둔 공고와 적어 둔 경험만 읽고 정리했습니다.":
    "As of {date}. Based only on the postings you saved and the experiences you recorded.",
  "가까운 마감": "Nearest deadlines",
  "마감일을 적어 둔 공고가 없습니다. 공고를 붙여 넣을 때 마감일을 적으면 여기에 남은 날이 나옵니다.":
    "None of your postings has a deadline. Add one when you paste a posting and the days left will show here.",
  "보고 있는 공고 마감일을 휴대폰 달력에 넣기": "Add all deadlines to your phone calendar",
  "이번 주 할 일 하나": "One task for this week",
  "결과지에서 나온 할 일입니다.": "This task comes from your result.",
  "하는 중입니다.": "In progress.",
  "아직 시작하지 않았습니다.": "Not started yet.",
  "끝내면 지금 할 일 쪽에서 끝냄으로 바꿔 주세요.": "When you're done, mark it as done on your to-do page.",
  "지금 할 일 열기": "Open to-do",
  "남은 할 일이 없습니다. 이번 주에 한 과제나 활동 하나를 경험으로 적어 두세요.":
    "Nothing left on your list. Record one assignment or activity from this week as an experience.",
  "경험 적기": "Add an experience",
  "여러 공고가 함께 요구하는데 아직 채우지 못한 것": "Asked for by several postings, not in your record yet",
  "붙여 둔 공고 {total}개 중 {count}개가 요구": "Asked for by {count} of your {total} postings",
  "아직 없음#track": "Not recorded yet",
  "정리가 덜 됨": "Needs more detail",
  "공고에 적힌 말:": "In the postings:",
  "이번 주 작은 일": "Small task this week",
  "이 영역 경험 적기": "Add an experience in this area",
  "공고 표 보기": "View the posting check",
  "공고를 두 개 이상 붙여 두면, 여러 공고가 함께 요구하는데 아직 비어 있는 것을 여기에 모읍니다.":
    "Save two or more postings and MAT collects here what several of them ask for that your record doesn't show yet.",
  "붙여 둔 공고 {n}개 가운데 두 곳 이상이 함께 요구하면서 비어 있는 것은 지금 없습니다.":
    "Across your {n} postings, nothing is asked for by two or more that's missing from your record.",
  "합격 가능성은 적지 않습니다. 공고에 적힌 요구와 내 기록을 나란히 놓고 공고 수를 센 것입니다.":
    "MAT doesn't predict hiring outcomes. It lines up what the postings ask for with your record and counts the postings.",

  /* ── 홈의 한 줄(`/me`) ─────────────────────────────────── */
  "이 결과로 매주 챙기기 · MAT": "Keep this result moving every week · MAT",
  "이번 주 할 일 하나 · 가까운 마감 · 공고와 내 경험 맞대기":
    "One task a week · nearest deadlines · check postings against your record",
  "MAT 보기": "See MAT",

  /* ── 사용법(`guide.tsx`) ───────────────────────────────── */
  "이렇게 넣으면": "You enter",
  "이렇게 받습니다": "You get",
  "지금 써 보기": "Try it now",
  "한 주는 이렇게 씁니다": "A typical week",
  "하지 않는 일": "What MAT doesn't do",
  "자주 묻는 것": "Questions",
  "MAT 사용법": "How MAT works",
  "MAT이 해 드리는 일": "What MAT does for you",
  "브리핑이 한 주의 할 일을 정하고, 나머지 도구가 그 빈 줄을 채웁니다.":
    "The briefing sets your week, and the other tools fill in what's missing.",
  "무엇을 해 주는지 · 한 주 쓰는 법 · 하지 않는 일 보기": "What it does · a typical week · what it doesn't do",

  /* 대학원생 · 연구 경험을 직무 말로 */
  "연구 경험을 직무 말로": "Your research in job language",
  "검사에서 {stage} 단계로 답하셨습니다. 연구·논문 기록마다 지원서 문장 뼈대와, 이 단계에서 먼저 적어 둘 한 줄을 붙였습니다.":
    "You answered the assessment as a {stage}. Each research or paper record gets an application sentence frame and one line worth writing down first at this stage.",
  "석사": "master's student",
  "박사": "PhD student",
  "박사후연구원": "postdoc",
  "대괄호 칸 {n}개는 기록을 고쳐 채우면 다음에 채워져 나옵니다.":
    "Fill the {n|bracketed field|bracketed fields} in the record and they will appear filled next time.",
  "연구 기록이 아직 없습니다": "No research records yet",
  "학위 연구나 참여한 과제, 쓴 논문을 하나 적어 두면 여기서 지원서 문장 뼈대가 만들어집니다. 연구직 공고의 논문 · 특허 · 과제 요구도 이 기록과 맞대 봅니다.":
    "Add your degree research, a project you worked on or a paper you wrote, and we'll turn it into application sentence frames here. Research postings' paper, patent and project requirements are matched against these records too.",
  "연구·실험 기록 적기": "Add research or lab work",
  "논문·학회 기록 적기": "Add a paper or talk",
};
