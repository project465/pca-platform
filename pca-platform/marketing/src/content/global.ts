import type { SiteContent } from "./types";

/**
 * 영어판. 한국어판과 같은 페이지를 옮기되, 말을 거는 상대가 다르다.
 * 해외 대학과 파트너에게는 "우리 나라에서도 되느냐" 가 첫 질문이라
 * 국가 전개 지도를 하나 더 둔다. 대전 사례는 한국 사례로 소개한다.
 */
export const global: SiteContent = {
  key: "global",
  lang: "en",
  domain: "pca.example",
  brand: "PCA",
  org: "ACADEMIX",
  orgTagline: "EDUCATION & CONFERENCE",
  platformUrl: "https://app.pca.example",

  meta: {
    title: "PCA — A career strategy built around the major you already chose",
    description:
      "Personalized Career Analysis reads job fit, work style and execution strategy together, then tells students what to prepare — projects, applications, interviews, founding, and employers in their own region.",
  },

  nav: {
    items: [
      { label: "ABOUT US", href: "#about" },
      { label: "PCA", href: "#analyze" },
      { label: "RESULT SHEET", href: "#sheet" },
      { label: "EVIDENCE", href: "#evidence" },
      { label: "CONTACT", href: "#contact" },
    ],
    contact: "Talk to us",
    menu: "Menu",
    floating: "Contact",
  },

  hero: {
    eyebrow: "PCA · PERSONALIZED CAREER ANALYSIS",
    title: ["They chose a major.", "We design the {career strategy} that follows."],
    lead:
      "PCA does not end at a result. It reads job fit, work style and execution strategy together, and carries on into what the student should prepare next.",
    primary: { label: "Talk to us", href: "#contact" },
    secondary: { label: "See the result sheet", href: "#sheet" },
    watermark: "PCA",
  },

  who: {
    label: "WHO IS IT FOR",
    heading: "PCA sets the direction when these are the questions",
    items: [
      {
        no: "01",
        title: "Students with no bearing",
        body: "They have a major, but no idea which industry or role it actually leads to",
        tag: "Find the direction",
      },
      {
        no: "02",
        title: "Job seekers",
        body: "They want a route of their own rather than the same credentials as everyone else",
        tag: "Design the roadmap",
      },
      {
        no: "03",
        title: "Would-be founders",
        body: "They want to build on their major but cannot tell which idea fits them",
        tag: "Founding strategy",
      },
    ],
  },

  analyze: {
    label: "WHAT PCA ANALYZES",
    heading: "PCA analyses three things together",
    lead:
      "Role, style and strategy are not read separately. They are joined into one preparation plan for that student.",
    items: [
      {
        no: "01",
        kicker: "Job fit",
        title: "The job areas that fit inside the major",
        body: "Job areas are scored out of 100 and ranked, calibrated to the department.",
      },
      {
        no: "02",
        kicker: "Work style",
        title: "The way of working that performs",
        body: "Six work styles are measured to find the conditions under which the student performs.",
      },
      {
        no: "03",
        kicker: "Execution",
        title: "What to prepare now",
        body: "The two combine into a roadmap: projects, applications, interviews, founding.",
      },
    ],
  },

  why: {
    label: "WHY PCA",
    heading: "The result connects straight through to a roadmap",
    vs: "VS",
    before: {
      tag: "Recommendation-led",
      title: "A conventional career test",
      steps: ["Check traits and interests", "Suggest an occupational group", "Leave the preparation to the student"],
      verdict: "“You know the result, and still have to work out what to do.”",
    },
    after: {
      tag: "Strategy-led",
      title: "PCA",
      steps: [
        "Analyse the job areas that fit",
        "Map work style across six axes",
        "Projects, applications, interviews, founding",
      ],
      verdict: "“The result becomes the roadmap.”",
    },
  },

  sheet: {
    label: "RESULT SHEET",
    heading: "What the report contains",
    lead: [
      "PCA runs diagnosis → strengths → application → strategy → execution.",
      "Open a section to see how the report is built.",
    ],
    more: "continues in the report",
    disclaimer:
      "※ From an actual respondent's report, published with their consent. The name is masked.",
    jobAxes: [
      "Strategy",
      "HR & Org",
      "Admin",
      "Finance",
      "Investment",
      "Marketing",
      "Supply chain",
      "Operations",
      "IT & Data",
      "Consulting",
    ],
    jobScores: [92, 74, 68, 62, 58, 70, 66, 64, 82, 86],
    styleAxes: ["Independent", "Collaborative", "Challenging", "Steady", "Fast-moving", "Quality-first"],
    styleScores: [84, 78, 86, 66, 72, 91],
    tabs: [
      {
        no: "00-1",
        nav: "Job area analysis",
        title: "Job area analysis",
        chart: "jobs",
        meta: [
          { label: "Highest area", value: "Management & Strategy" },
          { label: "Score", value: "92" },
          { label: "Respondent", value: "■■■" },
        ],
        chartNote: "Management & Strategy came out highest across the ten job areas.",
        capTitle: "Job area analysis",
        capBody: "Ten job areas, scored out of 100 and ranked.",
        capArrow: "Answers “which role does this major lead to?” with data",
      },
      {
        no: "00-2",
        nav: "Work style analysis",
        title: "Work style analysis",
        chart: "styles",
        meta: [
          { label: "Highest style", value: "Quality-first" },
          { label: "Score", value: "91" },
          { label: "Leading combination", value: "Quality-first + Challenging + Independent" },
        ],
        chartNote: "Leading combination: Quality-first + Challenging + Independent",
        capTitle: "Work style analysis",
        capBody: "Six work styles measured, then reduced to a leading combination.",
        capArrow: "The way of working that suits this student",
      },
      {
        no: "01",
        nav: "Core summary",
        title: "Section 1. Core summary",
        blocks: [
          {
            sub: "SUBSECTION 1-1",
            title: "The highest-scoring area",
            body: [
              "The highest area in this result is Management & Strategy, at 92. This is the field that judges where an organisation should move, reading market, competitors, customers, business structure and performance indicators together to design a direction.",
              "The result does not fix a single job. It says that, within this major, planning and strategy roles are the ones to examine first.",
            ],
          },
          {
            sub: "SUBSECTION 1-2",
            title: "Ranked areas",
            body: [
              "The report is written around the highest area. Second and third are kept as context for how wide the respondent's interests run.",
            ],
            table: {
              head: ["Rank", "Area", "Score", "How it is used in the report"],
              rows: [
                ["1st", "Management & Strategy", "92", "Main analysis"],
                ["2nd", "Consulting & Research", "86", "Reference"],
                ["3rd", "IT, Data & Service planning", "82", "Reference"],
              ],
            },
          },
        ],
        capTitle: "Core summary",
        capBody: "The top job area, its score and rank, alongside work style.",
        capArrow: "The reference point for everything after it",
      },
      {
        no: "02",
        nav: "Strength profile",
        title: "Section 2. Strength profile",
        blocks: [
          {
            sub: "SUBSECTION 2-1",
            title: "Three strengths drawn from the result area",
            bullets: [
              "1. Strategic problem definition — seeing the whole situation an organisation is in, and structuring what has to be solved first.",
              "2. Evidence-based analysis — checking market, competitor, customer and internal capability data to build grounds for a judgement.",
              "3. Designing the route to execution — not stopping at a report, but turning findings into workable options and an order to do them in.",
            ],
          },
          {
            sub: "SUBSECTION 2-2",
            title: "First strength: strategic problem definition",
            body: [
              "Company problems surface as falling revenue, sharper competition, customers leaving, rising costs. What matters is not stopping at the surface but working out structurally why the result happened.",
              "In an application, “what I analysed” carries less than “which problem I found, and why I treated it as the core one.”",
            ],
          },
        ],
        capTitle: "Strength profile",
        capBody: "Three headline strengths and how to use them in applications.",
        capArrow: "Usable in an essay or interview as written",
      },
      {
        no: "03",
        nav: "The work, concretely",
        title: "Section 3. The work, concretely",
        blocks: [
          {
            sub: "SUBSECTION 3-1",
            title: "Scenario 1: a market-entry review for a new business line",
            fields: [{ label: "Linked area", value: "Management & Strategy" }],
          },
          {
            title: "The situation you are given",
            body: [
              "You are placed in the strategy planning team of a food manufacturer. The team lead asks you to assess entry into the healthy convenience-meal market; growth in the existing range has flattened and the company is looking for new revenue.",
              "What you have to produce is an entry review covering market attractiveness, competitive intensity, fit with the company, and how to enter.",
            ],
          },
          {
            title: "What is required of you",
            body: [
              "Structure the market opportunity, compare competitors against the company's own capability, and propose an entry route that can actually be executed.",
            ],
          },
          {
            title: "Capabilities it calls for",
            bullets: [
              "1. Market analysis — reading size, growth and shifts in demand to judge whether entry is viable.",
              "2. Competitor comparison — pricing, range, channels and points of difference, to place the company.",
              "3. Commercial judgement — not stopping at “the market looks good”, but weighing capability and margin together.",
            ],
          },
        ],
        capTitle: "The work, concretely",
        capBody: "A real scenario from that area, and the capability it demands.",
        capArrow: "Try the role on before committing to it",
      },
      {
        no: "04",
        nav: "Roles and direction",
        title: "Section 4. Roles and career direction",
        blocks: [
          {
            sub: "SUBSECTION 4-1",
            title: "Understanding the area",
            body: [
              "Management & Strategy judges how a company should grow and compete: setting objectives, analysing market and competition, proposing a direction that can be executed.",
              "The end goal is a portfolio where subject knowledge, method, output and the link to the target role are all visible at once.",
            ],
          },
          {
            sub: "SUBSECTION 4-2",
            title: "Roles this area connects to",
            body: [
              "Every role here touches direction and decision-making. Rather than picking one up front, narrow it by comparing duties, required capability and expected outputs across real postings.",
            ],
            table: {
              head: ["#", "Role", "What it actually involves", "Experience to prepare"],
              rows: [
                [
                  "1",
                  "Business planning",
                  "Setting annual objectives, the business plan, budget direction and the performance framework.",
                  "Reading business plans, working with KPIs, understanding internal performance measures",
                ],
              ],
            },
          },
        ],
        capTitle: "Roles and direction",
        capBody: "Connected roles, which to examine first, and how to choose.",
        capArrow: "Eight roles, in priority order",
      },
      {
        no: "05",
        nav: "Projects & portfolio",
        title: "Section 5. Projects and portfolio",
        blocks: [
          {
            sub: "SUBSECTION 5-1",
            title: "Why a project",
            body: [
              "For a student without much practical experience, a project is the most realistic way to show the work they are interested in and how they went about it. What counts is not the name of the activity but which problem was set, which sources were checked, on what criteria it was analysed, and what was produced.",
            ],
          },
          {
            sub: "SUBSECTION 5-2",
            title: "Project directions grounded in the result area",
            body: [
              "A project does not end at “what I analysed”. What matters is how it connects to the actual work of the company being applied to.",
            ],
            table: {
              head: ["Direction", "Why it fits", "Sources", "Output"],
              rows: [
                [
                  "Company analysis report",
                  "Analysing business structure, revenue model and growth strategy walks through the basic flow of planning and strategy work.",
                  "Company site, annual report, news, industry data, competitor material",
                  "A company analysis report",
                ],
              ],
            },
          },
        ],
        capTitle: "Projects & portfolio",
        capBody: "Directions and worked examples, plus a four-week plan.",
        capArrow: "The portfolio to start this week",
      },
      {
        no: "06",
        nav: "Applications & interviews",
        title: "Section 6. Applications and interviews",
        blocks: [
          {
            sub: "SUBSECTION 6-1",
            title: "How to write the application",
          },
          {
            title: "1. Connecting coursework to the work you want",
            body: [
              "What was studied connects directly to planning, strategy, new-business and analysis roles. Coursework persuades when it is offered as “here is a problem I analysed”, not as “I am interested in this”.",
            ],
          },
          {
            title: "2. Showing a project as capability",
            body: [
              "Write the project around how the problem was set, how sources were found, how criteria were chosen, what was produced, and how it connects to the role — not around the project's name.",
            ],
          },
        ],
        capTitle: "Applications & interviews",
        capBody: "How to write it, and how to build answers to likely questions.",
        capArrow: "Example sentences, anticipated questions",
      },
      {
        no: "07",
        nav: "Founding strategy",
        title: "Section 7. Founding strategy",
        blocks: [
          {
            sub: "SUBSECTION 7-1",
            title: "What the result area suggests about founding",
            body: [
              "This area equips someone to weigh market, customer, competitor, price, revenue model and operations together — which is exactly what assessing an idea requires. Validating a customer problem with a small piece of work is more realistic than starting with a platform.",
            ],
          },
          {
            sub: "SUBSECTION 7-2",
            title: "Five ideas grounded in the area",
            fields: [{ label: "Idea 1", value: "Competitor analysis reports for small businesses" }],
            body: [
              "What it is — a report service that lets a small business compare nearby competitors on price, menu, reviews, channels and promotion.",
              "The problem it solves — owners feel they should be checking competitors but do not know what to compare them on.",
              "Who it is for — cafés, restaurants, tutoring centres, salons, gyms, local single-site operators.",
            ],
          },
        ],
        capTitle: "Founding strategy",
        capBody: "Ideas grounded in the major, and a route to market.",
        capArrow: "A second option beyond employment",
      },
      {
        no: "08",
        nav: "Growth points",
        title: "Section 8. Growth points and next steps",
        blocks: [
          {
            sub: "SUBSECTION 8-1",
            title: "The strengths this result surfaced",
            bullets: [
              "A tendency to analyse companies and markets from subject knowledge, which reads across to strategy and planning roles.",
              "Those roles connect to business-structure analysis, competitor comparison and opportunity assessment, so relevant experience sharpens the direction quickly.",
            ],
          },
          {
            sub: "SUBSECTION 8-2",
            title: "Roles to examine first",
            bullets: [
              "Business planning, strategy planning, new-business planning, business development and management control.",
              "Compare the actual duties, required capability and the experience that can be prepared, rather than fixing on one immediately.",
            ],
          },
          {
            sub: "SUBSECTION 8-3",
            title: "The project to start first",
            bullets: [
              "A company analysis report or a market-entry review produces an output that connects to these roles.",
              "Present it as a report or deck, showing problem definition, method and the link to the target role.",
            ],
          },
          {
            sub: "SUBSECTION 8-4",
            title: "What to carry into applications and interviews",
            bullets: [
              "Coursework, project experience and role-specific training together evidence problem definition and the ability to propose a direction.",
            ],
          },
        ],
        capTitle: "Growth points and next steps",
        capBody: "What to watch for, and a 30-day checklist.",
        capArrow: "Down to what to do today",
      },
      {
        no: "09",
        nav: "Regional strategy",
        title: "Section 9. Regional and settlement strategy",
        blocks: [
          {
            sub: "9-1",
            title: "The industries around the university",
            body: [
              "Daejeon concentrates the Daedeok R&D cluster, bio-health, nano and semiconductor, defence and space, and energy. The first-ranked job area in this result connects directly to roles at institutions and companies in that cluster.",
              "Employers marked as tied to the region's specialist industries are the ones to consider first when the plan is to stay and grow locally. In this report that came to 101 employers.",
            ],
          },
          {
            sub: "9-2",
            title: "Employers matched to this respondent",
            body: [
              "Reading the first-ranked job area together with the respondent's three leading work styles, 184 institutions and companies in Daejeon were sorted by fit — 144 high, 40 moderate, 0 low.",
              "Note: this is career information for reference. It does not recommend or broker employment with any named organisation; check openings and eligibility with each employer directly.",
            ],
          },
          {
            title: "① At a glance",
            fields: [{ label: "High fit · a strong match", value: "144" }],
            table: {
              head: ["Organisation", "Sector", "Regional"],
              rows: [
                ["ETRI", "Government research institute", "●"],
                ["KARI", "Government research institute", "●"],
                ["KIMM", "Government research institute", "●"],
                ["KRIBB", "Government research institute", "●"],
                ["KIER", "Government research institute", "●"],
                ["K-water", "Public enterprise", ""],
                ["KORAIL", "Public enterprise", ""],
                ["NST", "Public enterprise", "●"],
              ],
            },
          },
        ],
        capTitle: "Regional and settlement strategy",
        capBody:
          "The region's specialist industries and employers, matched to the first-ranked job area and sorted by fit.",
        capArrow: "A route that ends at a real local employer",
      },
    ],
  },

  styles: {
    label: "6 WORK STYLES",
    heading: "Six work styles, read as one hexagon",
    chartNote: "Work style analysis — sample",
    items: [
      { name: "Independent", body: "Absorbed in focused, solitary work" },
      { name: "Collaborative", body: "Solves problems alongside other people" },
      { name: "Challenging", body: "Takes the lead where nothing is defined yet" },
      { name: "Steady", body: "Works well inside set standards and procedures" },
      { name: "Fast-moving", body: "Prefers quick execution and visible results" },
      { name: "Quality-first", body: "Holds out for completeness and accuracy" },
    ],
  },

  evidence: {
    label: "EVIDENCE BASE",
    heading: "PCA was built from data",
    lead:
      "Not a personality inventory. A student sample and real recruitment-market material, combined so the diagnosis reflects the capability the market actually asks for.",
    stats: [
      { label: "Students took part", value: "2,346", unit: "" },
      { label: "Survey responses", value: "2,091", unit: "" },
      { label: "Job postings analysed", value: "428", unit: "" },
      { label: "Job descriptions analysed", value: "137", unit: "" },
      { label: "NCS references compared", value: "62", unit: "" },
      { label: "Practitioners reviewed it", value: "48", unit: "" },
    ],
    copyright: {
      title: "Registered copyright (Republic of Korea)",
      rows: [
        { name: "Engineering department indicators", no: "C-2025-058658" },
        { name: "Engineering department selection indicators", no: "C-2025-059731" },
        { name: "Graduate career confirmation indicators", no: "C-2025-059732" },
      ],
      note: "The core diagnostic items in the PCA indicator family are registered with the Korea Copyright Commission and legally protected.",
    },
    standards: {
      title: "Standards referenced in the design",
      head: ["Framework", "Issued by / lineage", "How it informed PCA"],
      rows: [
        ["NCS", "Ministry of Employment and Labor · HRD Korea", "Alignment of job areas and required capability with the national standard"],
        ["O*NET lineage", "US Department of Labor occupational information", "Reference for job areas and task-level design"],
        ["RIASEC lineage", "Standard vocational-psychology model", "Conceptual frame for partitioning interest areas"],
        ["NACE competencies", "National Association of Colleges and Employers", "Benchmark for defining student career readiness"],
        ["OECD frameworks", "OECD DeSeCo · Learning Compass", "Reference for transferable core-competency structure"],
        ["Measurement standards", "AERA · APA · NCME lineage", "Basis for the validity and reliability regime"],
      ],
      note: "These frameworks were referenced and benchmarked during design. Reference does not imply joint development, certification or endorsement by the bodies named.",
    },
  },

  choose: {
    label: "WHY CHOOSE PCA",
    heading: "Why departments pick it",
    items: [
      {
        title: "Works for every department",
        body: "From business through engineering, science, humanities and the arts — job areas are recomposed to the department's own character.",
      },
      {
        title: "Grounded in the recruitment market",
        body: "Not personality theory. 428 job postings, 137 job descriptions and 62 NCS references, analysed for the capability the market asks for.",
      },
      {
        title: "Employment and founding, both",
        body: "Preparation for employment, and ideas grounded in the major with a route to market — in one report.",
      },
      {
        title: "Rule-based scores, tailored reading",
        body: "Rule-based scoring keeps results stable; the interpretation is written to this student's own result.",
      },
    ],
  },

  closing: {
    kicker: "Major · work style · employment · founding",
    heading: ["The direction after a major,", "and the plan to get there"],
    lead: "Available for department-wide rollout and for individual assessment.",
    primary: { label: "Talk to us", href: "#contact" },
    secondary: { label: "See the result sheet again", href: "#sheet" },
  },

  contact: {
    heading: "Talk to us",
    lead:
      "Department-wide rollout and individual assessment are both available. We will follow up by email.",
    quickHeading: "Talk to us",
    quickNote: "Three fields. We will follow up by email.",
    quickSubmit: "Send",
    fields: {
      org: "University · department",
      name: "Your name",
      email: "Email for our reply",
      size: "Students expected to sit",
      sizeHint: "Leave blank for an individual assessment",
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
    note: "PCA · developed by ACADEMIX",
    sitesLabel: "Countries",
    sites: [
      { label: "Global (English)", href: "https://pca.example", ready: true },
      { label: "한국", href: "https://pca.co.kr", ready: true },
      { label: "Қазақстан", href: "https://pca.kz", ready: false },
      { label: "Türkiye", href: "https://pca.com.tr", ready: false },
    ],
    soonLabel: "coming soon",
    closing: "So that a major leads somewhere",
  },

  map: {
    heading: "Where PCA runs",
    lead:
      "The instrument, the job areas and the work-style framework are shared worldwide. What is filled in per country is the university, its local employers, and the translations.",
    countries: [
      { code: "DE", name: "Germany", status: "live", note: "Running" },
      { code: "US", name: "United States", status: "live", note: "Running" },
      { code: "JP", name: "Japan", status: "live", note: "Running" },
      { code: "CN", name: "China", status: "live", note: "Running" },
      { code: "TR", name: "Türkiye", status: "live", note: "Running" },
      { code: "KR", name: "Korea", status: "live", note: "Home market · Daejeon regional matching" },
      { code: "KZ", name: "Kazakhstan", status: "planned", note: "Planned" },
      { code: "FR", name: "France", status: "planned", note: "Planned" },
      { code: "ZA", name: "South Africa", status: "planned", note: "Planned" },
      { code: "PH", name: "Philippines", status: "planned", note: "Planned" },
    ],
    statusLabel: { live: "Running", progress: "Onboarding", planned: "Planned" },
    footnote:
      "Regional matching is rebuilt per region from that region's own employers — the method travels, the list does not.",
  },
};
