import type { SiteContent } from "./types";

/**
 * 영어판. 나라별 사이트가 학과 하나를 설득하는 자리라면, 이 사이트는
 * "우리도 되느냐" 를 묻는 해외 대학과 파트너가 처음 닿는 자리다.
 * 그래서 국가 간 비교와 O*NET 매핑을 앞에 둔다.
 */
export const global: SiteContent = {
  key: "global",
  lang: "en",
  domain: "pca.example",
  brand: "PCA",
  platformUrl: "https://app.pca.example",

  meta: {
    title: "PCA — Career indicator assessment for engineering departments",
    description:
      "One assessment maps a student to the job clusters their major leads to, the competencies those jobs require, and the courses on their own campus that close the gap.",
  },

  nav: {
    items: [
      { label: "How it works", href: "#how" },
      { label: "What you get", href: "#outputs" },
      { label: "Rollout", href: "#process" },
      { label: "FAQ", href: "#faq" },
    ],
    login: "Sign in",
    contact: "Talk to us",
  },

  hero: {
    eyebrow: "Career indicator assessment for engineering departments",
    title: ["Career tests stop at a personality type.", "This one names the courses."],
    lead:
      "A single sitting maps a student to the job clusters inside their major, measures the gap between what those jobs require and what the student holds today, and points to the courses on their own campus that close it.",
    primary: { label: "Talk to us", href: "#contact" },
    secondary: { label: "See how it works", href: "#how" },
  },

  pipeline: {
    heading: "Four steps, assessment to prescription",
    lead:
      "The first two come from the assessment. The last two come from your department's own curriculum data. The example below follows one mechanical engineering student.",
    steps: [
      {
        stage: "Indicator scores",
        value: "ANALYTIC 78",
        body: "A fixed item set converts responses into per-indicator scores on a 0–100 scale.",
        source: "Scores per indicator",
      },
      {
        stage: "Job fit",
        value: "Design & Analysis 82",
        body: "Indicator scores are weighted into a fit score for each job cluster in the major, then ranked.",
        source: "Ranked job clusters",
      },
      {
        stage: "Competency gap",
        value: "ANSYS 2 / 4",
        body: "The distance between the level that job requires and the level the student holds now.",
        source: "Shortfall per competency",
      },
      {
        stage: "Prescribed course",
        value: "ME401",
        body: "A course that teaches the missing competency and is actually offered at that university.",
        source: "Courses to take",
      },
    ],
    gapCaption: "Holds 2 of the 4 levels required · 2 short",
    footnote:
      "The weights behind job fit are data, not code. They can be tuned per department and per country without a release, which is what makes the same instrument work across borders.",
  },

  problem: {
    heading: "Why it exists",
    lead: "Career guidance in engineering tends to stall in three places.",
    items: [
      {
        title: "The report ends at a label",
        body:
          "A student learns they are “analytical” and leaves. What to do next term is still an open question.",
      },
      {
        title: "Jobs and curricula are not connected",
        body:
          "The competencies a job asks for live in job postings. The courses that teach them live in the course catalogue. Joining the two is left to the student.",
      },
      {
        title: "Departments have no numbers on their own cohort",
        body:
          "Arguing for a curriculum change needs cohort-level evidence: where students cluster, and which required competencies nothing on the catalogue covers.",
      },
    ],
  },

  outputs: {
    heading: "What you get",
    lead: "One sitting produces two documents: one for the student, one for the department.",
    cards: [
      {
        tag: "Student",
        title: "Individual report",
        body:
          "Not a document for reading a score. A document for choosing next term's courses.",
        bullets: [
          "Ranked job clusters within the major",
          "Required vs. held level for each competency",
          "Courses that close the gap, with a suggested term",
        ],
      },
      {
        tag: "Department",
        title: "Cohort report",
        body:
          "The whole sitting on one sheet — an advising aid and a case for curriculum change.",
        bullets: [
          "Distribution and clustering across job areas",
          "Competencies your catalogue does not currently cover",
          "Results stay closed until the coordinator releases them",
        ],
      },
    ],
  },

  process: {
    heading: "Rollout",
    lead:
      "Four steps from contract to release. There is no student self sign-up at any point.",
    steps: [
      {
        title: "Contract and seats",
        body:
          "Seats are bought in the number of students who will sit. Not a subscription — a seat is consumed when a student starts the assessment.",
      },
      {
        title: "Roster upload",
        body:
          "The department uploads its roster and accounts are issued in bulk. Temporary passwords must be changed at first sign-in.",
      },
      {
        title: "Session and sitting",
        body:
          "A session runs for a set window. Every answer is saved as it is given, so a student can leave and resume.",
      },
      {
        title: "Release",
        body:
          "Scoring does not open results. The department coordinator reviews the cohort report and releases them.",
      },
    ],
    note: "Departments that prefer it can switch a session to release results immediately.",
  },

  faq: {
    heading: "FAQ",
    items: [
      {
        q: "Can students sign up themselves?",
        a: "No. Accounts are issued from the roster the contracting department uploads. A student not on the roster cannot sit.",
      },
      {
        q: "If items change, do last year's results change?",
        a: "No. Items are never edited in place; a new version is published instead. Past sittings stay bound to the version they were taken under.",
      },
      {
        q: "Does it use our curriculum?",
        a: "It has to. Course prescriptions come from your own catalogue and the competencies each course teaches. We supply the intake template and do the first mapping together.",
      },
      {
        q: "Does this work outside Korea?",
        a: "The instrument, job clusters and competency framework are shared worldwide; job clusters carry O*NET codes so they line up across countries. What is filled in per country is the university, its courses, and the translations.",
      },
      {
        q: "Which majors are covered?",
        a: "Mechanical engineering first. Each major needs its own job taxonomy and competency framework, so coverage widens one major at a time.",
      },
      {
        q: "Where does the data live?",
        a: "Responses and results are stored server-side; nothing is kept in the browser. Retention and hand-back at contract end are set out in the agreement.",
      },
    ],
  },

  contact: {
    heading: "Talk to us",
    lead:
      "The department name and a rough headcount are enough to start. We will follow up by email.",
    fields: {
      org: "University · department",
      name: "Your name",
      email: "Email for our reply",
      size: "Students expected to sit",
      sizeHint: "A rough number is fine",
      message: "Anything else",
      messageHint: "Timing, questions, constraints",
    },
    submit: "Send",
    sending: "Sending…",
    success: "Thanks — we have it",
    successBody: "We will reply to the address you gave.",
    error: "That did not send. Please try again in a moment.",
  },

  footer: {
    note: "Career indicator assessment for engineering departments",
    sitesLabel: "Countries",
    soonLabel: "coming soon",
    sites: [
      { label: "Global (English)", href: "https://pca.example", ready: true },
      { label: "한국", href: "https://pca.co.kr", ready: true },
      { label: "Қазақстан", href: "https://pca.kz", ready: false },
      { label: "Türkiye", href: "https://pca.com.tr", ready: false },
    ],
    platformNote:
      "Country sites are separate. The platform students sit on is one, worldwide — that is what makes cross-country comparison possible.",
  },
};
