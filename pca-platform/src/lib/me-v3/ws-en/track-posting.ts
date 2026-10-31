/** 작업공간 영어 사전: MAT 공고 확인(`/me/track/posting/[id]`). 열쇠는 한국어 원문이다(`../ws-say.ts`) */
export const WS_EN_TRACK_POSTING: Record<string, string> = {
  "공고 확인 · MAT": "Posting check · MAT",
  "공고 확인": "Posting check",
  "마감 {date}": "Closes {date}",
  "마감 미입력": "No deadline entered",
  "공고가 뽑는 자리: {role}": "Role: {role}",
  "공고의 요구 항목을 내 경험과 비교했습니다.": "Here's how each requirement in the posting lines up with your experience.",

  /* 상태 넷 + 영역 확인 필요 */
  "설명할 경험 있음": "You can explain this",
  "결과에서 근거가 선 영역입니다.": "Your results show solid evidence in this area.",
  "정리가 덜 됨": "Needs writing up",
  "해 본 일은 있는데 직접 정한 것이나 남긴 것이 아직 적혀 있지 않습니다.":
    "You've done this kind of work, but what you decided or produced isn't written down yet.",
  "아직 없음": "Not yet",
  "이 영역의 경험이 아직 기록에 없습니다.": "There's no experience in this area in your records yet.",
  "자격 조건": "Eligibility",
  "학력·전공·경력·근무 여건처럼 경험 기록이 아니라 지원 자격으로 보는 조건입니다.":
    "A condition like a degree, major, years of experience or work arrangement. It's about eligibility, not your experience records.",
  "전공 맞음": "Major fits",
  "회원님 전공이 이 조건의 전공 목록에 들어 있습니다.": "Your major is on this line's list of majors.",
  "가까운 경험이 있습니다. 이 일에 맞게 정한 것과 남긴 것을 경험 기록에 더 적어 주세요.":
    "You have a close experience. Add what you decided and produced for this kind of work to your record.",
  "가까운 경험: ": "Close experience: ",
  "영역 확인 필요": "Area to confirm",
  "이 전공의 업무 영역에 바로 잇지 못한 줄입니다. 어느 경험으로 설명할지 직접 정해 주세요.":
    "We couldn't tie this line to one of your major's work areas. Decide which experience you'd use to explain it.",

  "한눈에": "At a glance",
  "줄": "lines",
  "설명할 경험 {ready} · 정리가 덜 됨 {partial} · 아직 없음 {empty} · 자격 조건 {cond}":
    "Can explain {ready} · Needs writing up {partial} · Not yet {empty} · Eligibility {cond}",
  " · 영역 확인 필요 {n}": " · Area to confirm {n}",
  "먼저 채울 줄: {text}": "Start with: {text}",
  "{area} 쪽 경험 하나를 적어 두면 이 줄을 설명할 재료가 생깁니다.":
    "Write up one experience in {area} and you'll have something to explain this line with.",
  "이 영역 경험 적기": "Add an experience in this area",

  "요구 항목": "Requirements",
  "공고의 요구": "What the posting asks for",
  "구분": "Type",
  "이어지는 영역": "Related area",
  "지금 내 상태": "Where you stand now",
  "적어 둔 경험": "Your experiences",
  "필수": "Required",
  "우대": "Preferred",
  "경험 적기": "Add experience",
  "요구 항목을 찾지 못했습니다. 자격 요건과 하는 일이 적힌 부분을 다시 붙여 넣어 주세요.":
    "We couldn't find any requirements. Paste the part of the posting that lists the responsibilities and qualifications.",

  "지원서 문장 뼈대": "Application sentence outline",
  "내 기록으로 만든 초안입니다. 필수 항목마다 적어 둔 경험의 칸에 있는 말만 이었고, 비어 있는 칸은 대괄호로 남겼습니다.":
    "A draft built from your records. For each required item we only joined words already in your "
    + "experience entries, and left anything missing in [brackets].",
  "같은 초안으로 함께 설명할 수 있는 요구:": "This draft also covers:",
  "가져온 경험:": "Based on:",
  " · 채울 칸 {n}개는 경험을 고쳐 적어 두면 다음에 채워져 나옵니다.":
    " · {n} {n|blank fills|blanks fill} in next time if you update the experience.",
  "이 초안 복사": "Copy this draft",
  "지금 전공과 다른 전공으로 읽은 공고라 문장 뼈대를 만들지 않았습니다.":
    "This posting was read under a different major, so no outline was made.",
  "필수 항목에 이을 경험이 아직 적혀 있지 않습니다. 위 표의 경험 적기에서 하나를 적으면 여기에 뼈대가 생깁니다.":
    "You haven't written up an experience for the required items yet. Add one from the table above and an outline will appear here.",
  "설명할 경험이 있거나 정리가 덜 된 필수 항목이 없습니다.":
    "No required items have experience to explain or write up yet.",
  "검사에서는 해 봤다고 답했지만 적어 둔 경험이 없는 필수 항목 {n}개는 뼈대를 만들지 않았습니다.":
    "{n} required {n|item|items} you said you've done in the assessment {n|has|have} no written experience yet, so no outline was made for {n|it|them}.",
  "초안의 말은 내 경험 기록에 적힌 것만 썼습니다. 숫자나 결과는 직접 확인해 넣어 주세요.":
    "The draft only uses words from your experience records. Check and add any numbers or results yourself.",

  "이 공고로 면접을 본다면": "If you interview for this posting",
  "필수 항목에서 나올 법한 질문과, 내 기록 가운데 가져갈 경험입니다. 소리 내어 한 번 답해 보세요.":
    "Questions the required items could lead to, and which of your experiences to bring. Try answering out loud once.",
  "가져갈 경험": "Experience to bring",
  "답의 뼈대": "Answer outline",
  "아직 이 영역 경험이 없다면 이렇게 답할 수 있어요": "If you haven't done this yet, you can answer like this",
  "적어 둔 경험이 없어요": "No written experience yet",
  "이 공고에서는 경험으로 답할 요구 항목을 찾지 못했습니다. 학력·자격 같은 조건만 적힌 공고일 수 있어요.":
    "We didn't find requirements you'd answer with experience. The posting may only list conditions like a degree or license.",
  "질문은 공고 문장과 이 전공의 업무 영역으로 만든 예시입니다. 실제 면접에서 이대로 나온다는 뜻은 아니에요.":
    "These are example questions built from the posting and your major's work areas. A real interview may ask different ones.",

  "이번 주에 할 수 있는 작은 일": "Small things you can do this week",
  "필수 항목 가운데 아직 없음 · 정리가 덜 됨인 줄마다 결과물 하나와 비교할 것 하나를 골랐습니다.":
    "For each required item marked Not yet or Needs writing up, we picked one thing to produce and one thing to check it against.",
  "지금 전공과 다른 전공으로 읽은 공고라 할 일로 담지 않았어요.":
    "This posting was read under a different major, so nothing was added to your tasks.",
  "할 일 {n}개를 담았어요. 지금 할 일 쪽에서 이어서 볼 수 있어요.":
    "Added {n} {n|task|tasks}. You'll find {n|it|them} under Next steps.",
  "이미 담아 둔 할 일이라 새로 늘지 않았어요.": "These tasks were already on your list, so nothing new was added.",
  "할 일 목록에 담기": "Add to my tasks",
  "지금 할 일 보기": "See next steps",
  "필수 항목 가운데 아직 없음이나 정리가 덜 된 줄이 없습니다.":
    "No required items are marked Not yet or Needs writing up.",

  "이 공고 상태": "Posting status",
  "지원함": "Applied",
  "닫음": "Closed",
  "보고 있음": "Watching",
  "보고 있는 공고는 마감 7일 · 3일 · 1일 전에 알림이 옵니다.":
    "For postings you're watching, we'll remind you 7, 3 and 1 day before the deadline.",
  "마감일 휴대폰 달력에 넣기": "Add the deadline to your calendar",
  "다시 보기": "Watch again",
  "지원했어요": "I applied",
  "닫기": "Close",
  "합격 가능성은 적지 않습니다. 이 표는 공고에 적힌 요구와 내 기록을 나란히 놓은 것입니다.":
    "We don't predict outcomes. This table just puts the posting's requirements next to your records.",
  "MAT으로": "Back to MAT",

  /* 연구 실적 요구 · 학위 연구 질문 */
  "연구 실적 요구": "Research record",
  "아래 ‘연구 실적 요구’ 표에서 내 기록과 비교해 드립니다.": "Matched against your records in the Research record table below.",
  " · 연구 실적 요구 {n}": " · Research record {n}",
  "논문 · 특허 · 연구 과제 · 학회 발표 · 연구계획서 · 학위처럼 연구직 공고에 자주 붙는 줄을 따로 모았습니다. 편수나 등급이 공고 기준에 맞는지는 판단하지 않고, 기록에 있는지만 봅니다.":
    "Lines that research postings often carry (papers, patents, research projects, conference talks, proposals, degrees) are gathered here. We don't judge whether counts or ranks meet the posting's bar, only whether your records have them.",
  "종류": "Type",
  "내 기록": "Your records",
  "다음에 할 일": "Next step",
  "논문": "Paper",
  "특허": "Patent",
  "연구 과제": "Research project",
  "학회 발표": "Conference talk",
  "연구계획서": "Proposal",
  "학위": "Degree",
  "적어 둔 기록 있음": "In your records",
  "기록은 있는데 덜 적힘": "Recorded, details missing",
  "기록에 없음": "Not in your records",
  "학위 조건": "Degree condition",
  "논문·학회 기록 적기": "Add a paper or talk",
  "연구·실험 기록 적기": "Add research or lab work",
  "학위 연구를 두고 자주 받는 질문": "Questions often asked about degree research",
  "검사에서 답한 학위 단계에 맞춘 질문과, 내 연구 기록에서 가져갈 재료입니다.":
    "Questions matched to the degree stage you gave in the assessment, with material from your research records.",
  "연구 실적": "Research record",
};
