/**
 * 검사 화면의 영어. `copy.ko.ts` 와 같은 모양이고 **칸마다 뜻을 옮겼다.**
 *
 * 한국어를 낱말째 옮기지 않는다: 학생이 읽는 제품 영어로 다시 썼다
 * (짧은 문장 · 대시 없음 · 미국/국제 영어). 판정에 들어가지 않고, 같은
 * 응답이면 이 글이 무엇이든 같은 판정이 나온다.
 *
 * 영어판을 여는 Core 는 이공계 셋뿐이라(`i18n.ts`) Core 마다 갈리는 칸도
 * 그 셋만 적었다. 경영 Core 의 칸은 한국어에만 있다.
 */
import type { RuntimeCopy } from "./copy";

const EN_COUNT = ["", "one", "two", "three", "four", "five", "six", "seven",
  "eight", "nine", "ten"];

export const COPY_EN: RuntimeCopy = {
  stages: {
    PROFILE: "About you",
    FIELD: "Industries",
    EXPLORE: "Quick scan",
    JUDGE: "Real work",
    DEEP: "Going deeper",
    EVIDENCE: "Evidence",
    PACK: "Industries and roles",
    TRANSLATE: "Your story",
    DONE: "Done",
  },
  stageLead: {
    PROFILE: "Let's start with where you are in your studies.",
    FIELD: "Pick an industry you're curious about, and we'll show you what people in your field do there.",
    EXPLORE: "Next, a quick scan of what you'd like to try and what you've already done.",
    JUDGE: "Now let's talk about work you've actually done.",
    DEEP: "Let's look a little closer at the work you've done.",
    EVIDENCE: "Let's go through the work you said you've done, one area at a time.",
    PACK: "A few questions about work that comes up often in the roles and industries you picked.",
    TRANSLATE: "Pick one experience, and we'll shape it into something you can use in applications.",
    DONE: "",
  },
  transGroups: {
    frame: { subject: "The problem",
      question: "Pick the problem you were trying to solve and why it mattered" },
    method: { subject: "Your approach",
      question: "Pick the method you used and what you decided yourself" },
    result: { subject: "What came out of it",
      question: "Pick what you produced and how you checked it" },
    handoff: { subject: "Where it went",
      question: "Pick where the result was used" },
  },
  coreDefault: {
    pairAsk: {
      J1: "Defining the problem and scope",
      J2: "Turning requirements into specs",
      J3: "Calls you made yourself",
      J4: "Methods and tools you used",
      J5: "What you produced",
      J6: "What you compared and checked",
      J7: "When things didn't work",
      J8: "Where your results were used",
    },
    deepPair: {
      "J1+J2": "Defining the problem and requirements",
      "J4+J8": "Your methods and where the results went",
    },
    exposureHelp: "Count work from classes, labs, clubs and part-time jobs too.",
  },
  coreCopy: {},
  count: (n) => EN_COUNT[n] ?? String(n),
  plan: {
    profile: {
      eyebrow: "About you",
      question: "Where are you in your studies?",
      help: "Your stage only changes the examples in the questions. Results are read the same way for everyone.",
    },
    pickIndustry: {
      eyebrow: "Industries",
      question: "Which industries interest you?",
      help: "Pick up to two. Not sure yet? You can skip this.",
    },
    scene: {
      eyebrow: "Industries",
      questionTwo: (major) => `What ${major} graduates work on in the two industries you picked`,
      questionOne: (industry, major) => `What ${major} graduates work on in ${industry}`,
      help: "Keep these in mind as you answer the next questions.",
    },
    sweepInterest: {
      eyebrow: "Interest",
      question: "How much would you like to do each of these?",
      help: "If you're not sure what something is, tap “Not sure.”",
    },
    sweepExposure: {
      eyebrow: "Times done",
      question: "How many times have you done each of these?",
    },
    sweepLearning: {
      eyebrow: "Interest in learning",
      question: "How much would you like to learn each of these right now?",
      help: "Based on your answers, we'll ask about just a few of them again.",
    },
    sweepPage: (eyebrow, k, n) => `${eyebrow} ${k} / ${n}`,
    force: {
      CF_PAIR_1: {
        eyebrow: "Which first",
        help: "You rated these two about the same. If you could try only one first, which would it be?",
      },
      CF_PAIR_2: {
        eyebrow: "Which to explore",
        help: "Setting aside which one you'd try first, which would you rather learn more about?",
      },
    },
    forceFallback: {
      eyebrow: "One more",
      help: "You rated these two about the same, so here's one more question.",
    },
    judge: {
      eyebrow: "General questions",
      pair: (grad) => (grad ? "Work you've done in projects and research"
        : "Work you've done in projects and team activities"),
    },
    xfield: {
      eyebrow: "Graduate work",
      question: "A few more questions about your graduate work",
      help: (major) => `Your graduate field may be different. These questions help us connect it to ${major}.`,
      chips: (major) => ["The field you worked in", "Methods you can bring over",
        `When you last did ${major} work`, "Your deepest undergraduate project"],
      itemHelp: "We use this when we turn your experience into application language.",
    },
    judgeStrip: (count, names, many) =>
      `Based on your answers, we picked ${count} ${many ? "areas" : "area"}: `
      + `${names.join(", ")}. `
      + `Next, we'll go through what you've actually done${many ? " in each" : " there"}.`,
    pairFallback: "Work you've done",
    checklist: {
      eyebrow: "What you actually did",
      question: (d) => `In ${d}, pick everything you actually did`,
      help: "We only listed things you said you've done. If none of them fit, leave this blank.",
    },
    consist: {
      eyebrow: "Just a bit more",
      j3Postdoc: "Have you set criteria yourself, both in your own projects and in work for other organizations?",
      j3: "Have you set criteria yourself, both at school and outside it?",
      j5: "Two more questions about what you made",
      other: "The same kind of work, in two different situations",
    },
    pickRole: {
      eyebrow: "Roles",
      question: "Which kinds of work would you like a closer look at?",
      help: "Pick up to two. This won't change your earlier answers.",
    },
    pickOrg: {
      eyebrow: "Workplace",
      question: "Where can you picture yourself working?",
      help: "Pick up to two. We only use this to decide what to show you first.",
    },
    industry: {
      strip: (name) => `Next, some work that comes up often in ${name ?? "the industry you picked"}.`
        + " Unfamiliar terms are explained under each question.",
      eyebrowFallback: "Industry work",
    },
    trans: {
      eyebrow: "Your story",
      question: (grad) => (grad
        ? "Think of one research project or other project"
        : "Think of one assignment, project or activity"),
      help: "We'll ask about it in four parts. Keep the same experience in mind for all four.",
      chips: ["The problem", "Your approach", "What came out of it", "Where it was used"],
    },
    target: {
      eyebrow: "Goals",
      question: "Pick the path you're considering now",
      help: "Your results will show it next to the experience you already have.",
    },
    done: { eyebrow: "All done", question: "You're ready to get your results" },
  },
  branch: {
    "ug-core": {
      eyebrow: "Classes and projects",
      ask: "Work from classes and projects",
      help: "Think of everything: classes, labs, team projects, clubs and internships.",
    },
    "ms-core": {
      eyebrow: "Research and projects",
      ask: "What you decided in research and projects",
      help: "Keep what you decided yourself separate from what was handed to you.",
    },
    "phd-core": {
      eyebrow: "Framing the problem",
      ask: "Setting research questions and assumptions",
      help: "Tell us who set the assumptions, variables and limits.",
    },
    "postdoc-core": {
      eyebrow: "What you led",
      ask: "The scope you led",
      help: "Keep the parts you did yourself separate from the parts you handed off.",
    },
  },
  branchByCore: {
    ME_CORE_V3: {
      "ug-core": { help: "Think of everything: classes, labs, capstone, clubs and internships." },
    },
  },
  axisLabel: {
    J1: "Problem definition", J2: "Requirements", J3: "Own decisions", J4: "Methods and tools",
    J5: "Outputs", J6: "Comparison and checks", J7: "Fixing what failed", J8: "Real-world use",
  },
  axisAsk: {
    J1: "When you set the scope",
    J2: "When you turned requirements into specific conditions",
    J3: "What you decided yourself",
    J4: "Methods and tools you used",
    J5: "What you produced",
    J6: "What you compared and checked",
    J7: "When something didn't work",
    J8: "Where your results were used",
  },
  axisAskByCore: {},
  slotLabel: { ARTIFACT: "Things you made", VERIFY: "What you compared against" },
  menus: {
    scale5: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    exposure: ["Never", "1–2 times", "3+ times"],
    unknown: "Not sure",
    fullScale5: {
      interest: {
        1: "Not interested at all", 2: "Slightly interested", 3: "Neutral",
        4: "Interested", 5: "Very interested",
      },
      learning_intent: {
        1: "No interest in learning", 2: "Not really keen", 3: "Neutral",
        4: "Want to learn", 5: "Really want to learn",
      },
    },
    orgTypes: [
      "A company that makes finished products",
      "A parts, equipment or materials company",
      "An engineering services firm",
      "A government-funded research institute",
      "A university lab",
      "A public or certification agency",
      "A small team or startup",
    ],
  },
  sceneHint: (list) => `Anything counts: ${list.join(", ")}, or anywhere else.`,
  /* `scoring/ownership.ts` 의 넷과 자리와 뜻이 같다 */
  ownershipMeans: [
    "You haven't done this kind of work yet",
    "Someone else set the conditions, or you used results someone else produced. Filling in a ready-made template counts here too",
    "You did the work yourself. Helping decide things as part of a group counts here too",
    "You set the conditions or criteria yourself, and later work built on your decision",
  ],
  ownershipWithExample: (means, example) => `${means}. For example: ${example}`,
};
