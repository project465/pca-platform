import type { SiteContent } from "./types";

/**
 * 영어판. 사실관계는 한국어판과 같은 제안서를 따르되, 말을 거는 상대가 다르다.
 * 해외 대학과 파트너에게는 "우리 나라에서도 되느냐" 가 첫 질문이라
 * 국가 간 전개와 지역 매칭이 어디서나 성립한다는 점을 앞에 둔다.
 * RISE 는 한국 제도이므로 한국 사례로 소개한다.
 */
export const global: SiteContent = {
  key: "global",
  lang: "en",
  domain: "pca.example",
  brand: "PCA",
  org: "ACADEMIX",
  platformUrl: "https://app.pca.example",

  meta: {
    title: "PCA — Turning what comes after a major into an executable career plan",
    description:
      "Job fit, work style and an execution strategy. A personalized career analysis that does not stop at a recommendation but tells students what to prepare.",
  },

  nav: {
    items: [
      { label: "What it analyses", href: "#analysis" },
      { label: "The report", href: "#report" },
      { label: "Regional matching", href: "#region" },
      { label: "Rollout", href: "#process" },
    ],
    login: "Sign in",
    contact: "Talk to us",
    menu: "Menu",
  },

  hero: {
    eyebrow: "So that a major leads somewhere",
    display: ["PERSONALIZED", "CAREER ANALYSIS"],
    title: "They chose a major. The next step is still a guess.",
    lead:
      "One sitting lays out which roles fit, how the student works best, and what to prepare — from projects and credentials to interviews, founding a company, and the employers in their own region.",
    primary: { label: "Talk to us", href: "#contact" },
    secondary: { label: "What it analyses", href: "#analysis" },
  },

  about: {
    label: "Who built it",
    heading: "Developed by ACADEMIX",
    body:
      "ACADEMIX designs education programmes and runs events for universities and public institutions. The PCA assessment was developed by ACADEMIX.",
    highlight:
      "Staffed by people out of government-funded research institutes and backed by a wide industry network, guiding career preparation from undergraduates through doctoral graduates.",
    services: [
      {
        title: "Employment lectures and industry speakers",
        body: "Role-specific sessions, online and in person, with invited practitioners",
      },
      {
        title: "STEM-focused mentoring",
        body: "Industry-linked mentoring for bachelor's, master's and doctoral students",
      },
      {
        title: "Career fairs and networking",
        body: "Large-scale recruitment fairs and university networking events",
      },
      {
        title: "AI-assisted career matching",
        body: "Generative AI for application-essay analysis and interview practice",
      },
    ],
    brandsLabel: "Brands",
    brands: [
      { name: "ACADEMIX", note: "flagship" },
      { name: "career peak", note: "STEM careers & employment" },
      { name: "JOBINDUSTRY", note: "STEM graduate platform" },
    ],
    partnersLabel: "Partners",
    partners: [
      "Seoul National University",
      "POSTECH",
      "Samsung",
      "Hyundai Mobis",
      "KARI",
      "ETRI",
      "KORAIL",
      "IBK",
      "KAERI",
    ],
  },

  evidence: {
    heading: "Built on data, not intuition",
    lead:
      "It started from a complaint: the tests already on the market name a type but never plan the route. PCA was built on what ACADEMIX had accumulated.",
    stats: [
      { value: "2,346", label: "students took part" },
      { value: "2,091", label: "survey responses" },
      { value: "428", label: "job postings analysed" },
      { value: "137", label: "job descriptions analysed" },
      { value: "62", label: "NCS references compared" },
      { value: "48", label: "practitioners reviewed it" },
    ],
  },

  questions: {
    heading: "Choosing a major does not answer these",
    lead: "PCA does not leave them to guesswork.",
    items: [
      "Which role should I be preparing for with this major?",
      "What way of working actually suits me?",
      "What could I keep doing for years?",
      "Employment or founding something — which way?",
      "What projects should I be building?",
      "Which credentials and what portfolio?",
      "In an interview, what do I say, and on what evidence?",
      "If I do found something, what would fit me?",
    ],
    note:
      "It identifies the roles that fit and how the student works, then turns that into a plan they can act on.",
  },

  analysis: {
    heading: "Three things PCA analyses",
    lead:
      "It does not end at “go this way.” It carries on into what to prepare for that role.",
    pillars: [
      {
        title: "Job areas that fit",
        body: "Which fields inside the major the student actually fits.",
      },
      {
        title: "Work style",
        body: "The conditions under which they work most effectively.",
      },
      {
        title: "Execution strategy",
        body: "The two above, turned into a plan specific to this student.",
      },
    ],
    note:
      "The result is not a diagnosis. It is a roadmap of what to prepare, in what order.",
  },

  traits: {
    heading: "Work style, as one hexagon",
    lead:
      "Six work-style scores, visualised — the way of working that suits the student, and the growth strategy that follows from it.",
    exampleLabel: "Example",
    chartTitle: "Work-style profile",
    items: [
      { code: "independent", name: "Independent", body: "Absorbed in focused, solitary work", score: 78 },
      { code: "challenge", name: "Challenging", body: "Takes the lead where nothing is defined yet", score: 84 },
      { code: "speed", name: "Fast-moving", body: "Prefers quick execution and visible results", score: 62 },
      { code: "collab", name: "Collaborative", body: "Solves problems alongside other people", score: 71 },
      { code: "stable", name: "Steady", body: "Works well inside set standards and procedures", score: 55 },
      { code: "quality", name: "Quality-first", body: "Holds out for completeness and accuracy", score: 88 },
    ],
  },

  compare: {
    heading: "What makes it different",
    lead: "The gap between a test that recommends and a test that plans.",
    before: {
      tag: "Recommendation-led",
      title: "A conventional career test",
      steps: ["Check traits and interests", "Suggest an occupational group", "Leave the preparation to the student"],
      verdict: "They know the result and still have to work out what to do about it.",
    },
    after: {
      tag: "Strategy-led",
      title: "PCA",
      steps: [
        "Analyse the job areas that fit",
        "Map work style across six axes",
        "Propose credentials and projects",
        "Set a portfolio direction",
        "Anticipate interview questions",
        "Lay out a founding strategy",
      ],
      verdict: "The result connects straight through to a roadmap.",
    },
  },

  report: {
    heading: "One report to set the direction",
    lead:
      "Ten sections, each following logically from the one before it.",
    volume: "A 15–20 page career strategy document, personal to the student",
    sections: [
      { no: "01", title: "Core summary", body: "Key terms · overall result · the points that matter" },
      { no: "02", title: "Strength profile", body: "The three strengths the student holds" },
      { no: "03", title: "The work, concretely", body: "Situational scenarios · what the job actually involves" },
      { no: "04", title: "Roles and direction", body: "Fitting fields · example occupations · career direction" },
      { no: "05", title: "Projects and portfolio", body: "What to build, and worked examples" },
      { no: "06", title: "Applications and interviews", body: "Likely questions · what to write and why" },
      { no: "07", title: "Founding a company", body: "Ideas grounded in the major · route to market" },
      { no: "08", title: "Growth points and next steps", body: "What to watch for, and where to push" },
      { no: "09", title: "Regional and settlement strategy", body: "Real local employers · staying and growing locally" },
    ],
    exampleLabel: "Example",
    rankTitle: "Job areas, ranked",
    ranks: [
      { name: "1st area", score: 87 },
      { name: "2nd area", score: 74 },
      { name: "3rd area", score: 66 },
    ],
  },

  region: {
    label: "Regional matching",
    heading: "A route that ends at a real employer, in their own region",
    lead:
      "PCA does not stop at the diagnosis. It matches real companies and institutions in the university's own region against the student's work style and job area. No conventional career test does this.",
    beforeValue: "0",
    beforeLabel: "local employers a conventional test names",
    afterValue: "144",
    afterLabel: "local employers PCA matched · Daejeon example",
    clustersLabel: "Industry clusters matched · Daejeon example",
    clusters: [
      "Daedeok R&D cluster",
      "Bio & health",
      "Nano & semiconductor",
      "Defence, space & robotics",
      "Energy & hydrogen",
      "IT, construction & finance",
      "Corporate R&D",
      "Public & innovation agencies",
    ],
    points: [
      {
        title: "Real local employers",
        body:
          "Government-funded institutes, public bodies, specialist firms and universities in the region — named, not described.",
      },
      {
        title: "Fit tiers",
        body:
          "Employers are sorted into high and moderate fit against the student's top traits, so they know where to look first.",
      },
      {
        title: "A route to staying",
        body:
          "Tied to the region's industrial clusters, so the path is one the student can follow without leaving.",
      },
    ],
    quote:
      "A settlement-oriented career reference matching real companies and institutions in Daejeon against the student's first-ranked job area and leading traits, tied to the region's specialist industries.",
    quoteSource: "From an actual report · §9 opening",
  },

  university: {
    label: "For universities",
    heading: "Why a university chooses this",
    lead:
      "Helping students becomes the university's own evidence of regional retention. In Korea that maps directly onto RISE reporting; elsewhere it is the same argument about keeping graduates in the region.",
    points: [
      {
        title: "Retention as data",
        body:
          "Local-employer match rates and shifts in intent, delivered as an anonymised aggregate report — usable as evidence of regional talent retention.",
      },
      {
        title: "Evidence a free test cannot give",
        body:
          "Results from free public services cannot be submitted as institutional evidence. PCA produces a report the university can file.",
      },
      {
        title: "Administrator dashboard, coming",
        body:
          "Participation and retention indicators for every department on one screen. Shipping as a separate area.",
      },
    ],
    closing: "Help the students, and the retention record accumulates alongside.",
  },

  process: {
    heading: "Rollout is this simple",
    lead: "From issuing a link to aggregating results — no separate system to run.",
    steps: [
      { title: "Issue a link", body: "A participation link per university and per department." },
      { title: "Students take it", body: "Open the link, complete the assessment, receive the report automatically." },
      { title: "Results aggregate", body: "The institutional report and dashboard fill in on their own." },
    ],
    note: "Every department on one screen — without standing up anything new.",
  },

  audience: {
    heading: "Who it is for",
    items: [
      "Students who have a major but no idea which industry it leads to",
      "Job seekers who want a route of their own rather than the same credentials as everyone else",
      "Would-be founders who want to build on their major but cannot tell which idea fits them",
    ],
  },

  faq: {
    heading: "FAQ",
    items: [
      {
        q: "How is this different from a conventional career test?",
        a: "A conventional test checks traits and interests and suggests an occupational group. PCA analyses fitting roles and work style, then continues into credentials, projects, portfolio, interviews and founding strategy. The result is the roadmap.",
      },
      {
        q: "How do students take it?",
        a: "We issue a participation link per university and department. A student opens the link, completes the assessment and receives their personal report automatically.",
      },
      {
        q: "On what basis are local employers matched?",
        a: "Against the student's first-ranked job area and leading work-style traits. Employers are sorted into high and moderate fit tiers so the student knows where to look first.",
      },
      {
        q: "What does the university receive?",
        a: "An anonymised aggregate report covering local-employer match rates and retention intent — usable as evidence of regional talent retention. A dashboard covering every department is on the way.",
      },
      {
        q: "Which fields does it cover?",
        a: "Undergraduates through doctoral graduates, with particular depth in STEM. Talk to us about how it would run for your departments.",
      },
      {
        q: "How long is the report?",
        a: "15 to 20 pages across ten sections, running from the core summary through to the regional strategy.",
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
    note: "Turning what comes after a major into an executable career plan",
    sitesLabel: "Countries",
    sites: [
      { label: "Global (English)", href: "https://pca.example", ready: true },
      { label: "한국", href: "https://pca.co.kr", ready: true },
      { label: "Қазақстан", href: "https://pca.kz", ready: false },
      { label: "Türkiye", href: "https://pca.com.tr", ready: false },
    ],
    soonLabel: "coming soon",
    platformNote:
      "Country sites are separate. The platform students sit on is one, worldwide — that is what makes cross-country comparison possible.",
    closing: "So that a life, not just a major, leads somewhere",
  },

  map: {
    heading: "Where it runs",
    lead:
      "The instrument, the job areas and the work-style framework are shared worldwide. What gets filled in per country is the university, its local employers, and the translations — which is why a new country is a content job, not a rebuild.",
    countries: [
      {
        code: "KR",
        name: "Korea",
        status: "progress",
        note: "First universities onboarding · Daejeon regional matching live",
        labelDx: 26,
        labelDy: 4,
      },
      { code: "KZ", name: "Kazakhstan", status: "planned", note: "Next", labelDy: -18 },
      { code: "TR", name: "Türkiye", status: "planned", note: "Next", labelDx: -14, labelDy: 24 },
    ],
    statusLabel: { live: "Running", progress: "Onboarding", planned: "Planned" },
    footnote:
      "Regional matching is rebuilt per region from that region's own employers — the method travels, the list does not.",
  },
};
