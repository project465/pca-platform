/** 작업공간 영어 사전: prep. 열쇠는 한국어 원문이다(`../ws-say.ts`) */
export const WS_EN_PREP: Record<string, string> = {
  /* ── 쪽(`/me/prep`) ─────────────────────────────────────────── */
  "지원서·면접 준비 · 내 CareerMatri": "Applications and interviews · My CareerMatri",
  "지원서·면접 준비": "Application and interview prep",
  "검사 결과에서 지원서 문항의 재료와 예상 면접 질문을 꺼내고, 답을 직접 적어 연습하는 곳입니다.":
    "This is where your assessment results become material for application essays and likely "
    + "interview questions, and where you write and practice your own answers.",
  "아직 검사 결과가 없습니다.": "You don't have assessment results yet.",
  "질문과 재료는 내 결과에서만 만들기 때문에, 검사를 마치면 여기에 섭니다.":
    "Questions and material come only from your own results, so they'll appear here once you finish the assessment.",
  "검사하러 가기": "Take the assessment",
  "{date} 검사 결과 기준 · 적어 둔 답 {done} / {total}":
    "Based on your assessment from {date} · {done} of {total} answered",
  "내 결과와 경험에서 지원서 문항의 재료와 예상 면접 질문을 꺼냈습니다. 글은 직접 쓰고, 저장해 두면 다시 와서 고칠 수 있습니다.":
    "We pulled material for application essays and likely interview questions from your results "
    + "and experiences. You write the answers yourself, and anything you save can be edited later.",
  "지원서 문항": "Application questions",
  "자기소개서에 자주 나오는 네 문항입니다. 문항마다 내 결과에서 쓸 재료를 모았습니다.":
    "Four questions that often come up in personal statements and cover letters. "
    + "For each one, we gathered material from your results.",
  "적는 차례": "Suggested structure",
  "{hint} · 내 재료: {items}": "{hint} · Your material: {items}",
  "예상 면접 질문": "Likely interview questions",
  "내 결과에서 면접관이 파고들 만한 부분을 골랐습니다. 소리 내어 답해 본 뒤 요점을 적어 두세요.":
    "We picked the parts of your results an interviewer is likely to dig into. "
    + "Answer out loud, then note your key points.",
  "왜 나오나요": "Why it comes up",
  "떠올릴 것": "Things to recall",
  "아직 질문을 만들 재료가 없습니다.": "There isn't enough material for questions yet.",
  "경험을 하나 적어 두면 그 경험에서 나올 질문이 여기에 섭니다.":
    "Add one experience and the questions it could lead to will appear here.",
  "전에 적어 둔 답": "Earlier answers",
  "결과가 바뀌어 지금은 서지 않는 질문에 적었던 답입니다. 그대로 두었습니다.":
    "Answers to questions that no longer appear because your results changed. We've kept them as they were.",
  "성과와 숫자는 직접 적어 주세요.": "Add results and numbers yourself.",
  "여기 재료는 검사에서 고르신 답이라 기간·인원·수치가 들어 있지 않습니다. 실제로 없었던 내용을 지원서에 적으면 면접에서 그 한 줄이 가장 먼저 흔들립니다. 적은 답은 본인에게만 보입니다.":
    "The material here comes from the answers you chose in the assessment, so it has no timelines, "
    + "team sizes or figures. If you put something on an application that didn't actually happen, "
    + "that's the line most likely to fall apart in an interview. Only you can see your answers.",
  "적어 둠 · {n}자": "Saved · {n|character|characters}",
  "아직 안 적음": "Not written yet",
  "내 답": "Your answer",
  "답의 요점": "Key points",
  "저장했습니다.#prep": "Saved.",
  "비워서 저장하면 지웁니다.": "Saving it empty deletes the answer.",
  "저장#prep": "Save",

  /* ── 적는 차례(`prep.ts`) ───────────────────────────────────── */
  "상황·역할#prep": "Situation and role",
  "어떤 과제였고 내가 맡은 자리가 무엇이었는지": "What the project was and what your role was",
  "행동#prep": "Action",
  "무엇을 어떤 방법으로 했는지": "What you did and how",
  "판단#prep": "Judgment",
  "무엇을 직접 정했고 무엇과 비교했는지": "What you decided yourself and what you compared it with",
  "결과#prep": "Result",
  "무엇이 남았고 어디에 쓰였는지 · 수치와 기간은 직접 적습니다":
    "What came out of it and where it was used. Add numbers and timelines yourself",

  /* ── 지원서 네 문항 ─────────────────────────────────────────── */
  "적어 두신 목표": "Your goal",
  "관심이 높다고 답한 분야": "Areas you rated as high interest",
  "이미 해 본 일이 있는 분야": "Areas where you've already done some work",
  "지원 동기": "Why you're applying",
  "이 분야(직무)에 관심을 갖게 된 계기와 그동안 준비한 것을 적어 주세요.":
    "Describe what first drew you to this field or role, and what you've done to prepare for it.",
  "처음 관심을 갖게 된 수업·과제·경험": "The class, project or experience that first got you interested",
  "{area}에서 해 본 일": "What you've done in {area}",
  "그 경험에서 이 일이 나에게 맞는다고 판단한 까닭": "Why that experience made you think this work suits you",
  "지원한 곳에서 하고 싶은 일 한 가지": "One thing you want to do where you're applying",
  "관심 분야와 목표가 아직 결과에 없습니다. 검사의 관심 문항에 답하면 여기에 섭니다.":
    "Your results don't include areas of interest or a goal yet. "
    + "They'll appear here once you answer the interest questions in the assessment.",

  "{area} · 직접 정한 것": "{area}: what you decided yourself",
  "{area} · 해 본 일": "{area}: what you've done",
  "{area} · 남긴 것": "{area}: what you produced",
  "적어 두신 경험": "Experiences you've added",
  "직무 관련 경험": "Relevant experience",
  "지원 직무와 관련해 직접 해 본 경험과 그 과정에서 맡은 역할을 적어 주세요.":
    "Describe hands-on experience related to the role you're applying for, and the part you played in it.",
  "아직 설명할 수 있는 경험이 결과에 없습니다. 경험을 하나 적어 두면 여기 재료가 생깁니다.":
    "Your results don't show experience you can explain yet. "
    + "Add one experience and material for this question will appear here.",

  "안 됐을 때 고친 것": "What you fixed when it didn't work",
  "비교해 확인한 것": "What you checked by comparison",
  "비교한 것을 적어 둔 경험": "Experiences where you noted what you compared against",
  "어려움을 고친 경험": "Overcoming a setback",
  "계획대로 되지 않았던 일과, 그때 무엇을 바꿔 해결했는지 적어 주세요.":
    "Describe something that didn't go as planned, and what you changed to resolve it.",
  "무엇이 계획과 달랐는지": "What turned out differently from the plan",
  "바꾼 뒤 무엇이 달라졌는지 · 수치는 직접 적습니다":
    "What changed after the fix. Add the numbers yourself",
  "고친 경험이 결과에 아직 없습니다. 안 됐던 과제 하나를 경험으로 적어 두면 여기 재료가 생깁니다.":
    "Your results don't show a fix yet. "
    + "Add a project that didn't go well as an experience and material will appear here.",

  "받은 요구를 조건으로 옮긴 것": "Requirements you turned into conditions",
  "결과가 쓰인 곳": "Where the results were used",
  "여럿이 함께한 경험": "Team experiences",
  "함께 일한 경험": "Working with others",
  "다른 사람과 의견을 맞춰 결과를 낸 경험과 그 안에서 내가 한 일을 적어 주세요.":
    "Describe a time you worked through differences with others to deliver a result, and what you did in it.",
  "누구와 무엇을 함께 했는지 · 내가 맡은 몫": "Who you worked with, on what, and your part",
  "의견이 갈렸을 때 무엇을 기준으로 정했는지": "What you based the decision on when opinions differed",
  "함께 한 경험이 결과에 아직 없습니다. 팀 과제나 캡스톤을 경험으로 적어 두면 여기 재료가 생깁니다.":
    "Your results don't show teamwork yet. "
    + "Add a team project or capstone as an experience and material will appear here.",

  /* ── 면접 질문 ─────────────────────────────────────────────── */
  "그때 무엇을 근거로 그렇게 정했나요?": "What did you base that decision on?",
  "그 결과가 맞는지는 무엇과 비교해 확인했나요?": "What did you compare the result with to check it was right?",
  "{area} 과제에서 ‘{said}’고 답하셨는데, {follow}": "For {area}, you chose “{said}.” {follow}",
  "{area} 결과에서 지금 설명할 수 있는 경험으로 나온 분야라, 면접관이 가장 먼저 파고들 부분입니다. 고르신 답을 그대로 되묻습니다.":
    "{area} came out in your results as experience you can explain, so it's where an interviewer "
    + "is likely to dig in first. This question asks about the answer you chose.",
  "남긴 것: {x}": "Output: {x}",
  "비교한 것: {x}": "Compared with: {x}",
  "왜 {role} 직무를 지원했나요?": "Why are you applying for a {role} role?",
  "목표로 적어 두신 직무라 거의 반드시 나오는 질문입니다.":
    "This is the role you set as your goal, so expect this question in almost every interview.",
  "관심이 높다고 답한 {area}": "{area}, which you rated as high interest",
  "이 학과 학생에게 자주 묻는 질문입니다.": "A question students in this major are often asked.",
  "{area} 과제에서 풀려고 한 문제가 정확히 무엇이었나요?":
    "In your {area} work, what exactly was the problem you were trying to solve?",
  "{area} 과제에서 받은 요구를 어떤 조건으로 바꿔 진행했나요?":
    "In your {area} work, how did you turn the requirements you received into working conditions?",
  "{area} 과제에서 본인이 직접 정한 기준은 무엇이었나요?":
    "In your {area} work, what criteria did you set yourself?",
  "{area} 과제에서 그 방법을 고른 까닭은 무엇인가요?":
    "In your {area} work, why did you choose that method?",
  "{area} 과제로 손에 남은 결과물은 무엇인가요?":
    "What output do you have to show from your {area} work?",
  "{area} 과제의 결과가 맞는지 무엇과 비교해 확인했나요?":
    "In your {area} work, what did you compare the results with to check they were right?",
  "{area} 과제에서 잘 안 됐던 순간에 무엇을 고쳤나요?":
    "In your {area} work, what did you fix when something didn't work?",
  "{area} 과제의 결과는 실제로 어디에 쓰였나요?":
    "Where were the results of your {area} work actually used?",
  "결과에서 {area}의 ‘{need}’ 부분이 아직 비어 있습니다. 이 질문이 나오면 답할 거리가 모자랄 수 있는 부분입니다.":
    "In {area}, your results don't show {need} yet. If this question comes up, you may not have much to say.",
  "이 질문에 답할 만한 과제가 있었는지 떠올려 보고, 있으면 경험으로 적어 두세요":
    "Think back to whether you've had a project that answers this, and if so, add it as an experience",
};
