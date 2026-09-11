import type { SiteContent } from "./types";

/**
 * 영어판. 한국어판과 같은 페이지를 옮기되, 말을 거는 상대가 다르다.
 * 해외 대학과 파트너에게는 "우리 나라에서도 되느냐" 가 첫 질문이라
 * 국가 전개 지도를 하나 더 둔다. 대전 사례는 한국 사례로 소개한다.
 */
export const global: SiteContent = {
  key: "global",
  lang: "en",
  domain: "metri.io",
  brand: "METRI",
  org: "ACADEMIX",
  orgTagline: "EDUCATION & CONFERENCE",
  platformUrl: "https://app.metri.io",

  meta: {
    title: "METRI — engineering majors, read against the roles that hire them",
    description:
      "Twenty-four engineering job clusters and 138 competencies across mechanical, electrical and computer engineering, checked against real postings. Not a personality type — ANSYS held 2 of 4, GD&T not met, asked for in 89 of 132 postings.",
  },

  nav: {
    items: [
      { label: "PCA", href: "/pca" },
      { label: "Who it is for", href: "/#channels" },
      { label: "LOCALISATION", href: "/localisation" },
      { label: "PARTNERSHIP", href: "/partnership" },
      { label: "PRICING", href: "/pricing" },
      { label: "ABOUT", href: "/about" },
      { label: "CONTACT", href: "/contact" },
    ],
    contact: "Talk to us",
    menu: "Menu",
    floating: "Contact",
    start: "Start",
  },

  hero: {
    eyebrow: "METRI · ENGINEERING CAREER INTELLIGENCE",
    title: ["They chose engineering.", "{Nobody told them which engineering.}"],
    lead:
      "Mechanical, electrical and computer engineering — 24 job clusters and 138 competencies, checked against real postings. Not “you are collaborative”, but “Simulation & CAE 80, ANSYS held 2 of 4, asked for in 89 of 132 postings for this role”. The activity axes are the same in every country, which is why the instrument travels.",
    primary: { label: "Talk to us", href: "/contact" },
    secondary: { label: "See a real report", href: "#sample" },
    watermark: "METRI",
    proof: [
      { value: "250", label: "items, already written in three languages" },
      { value: "24", label: "engineering job clusters" },
      { value: "138", label: "competencies in the skill graph" },
      { value: "3", label: "copyright registrations" },
    ],
  },

  sample: {
    label: "A REAL REPORT",
    heading: "Before the method, look at what a student is handed",
    lead:
      "What PCA measures is the second question. Below is a 15–20 page report with four of its pages put on one screen. A student does not receive a type name. They receive this.",
    disclaimer:
      "An illustrative screen showing the format of the report — not a real student’s submission. The ten job areas, the six work styles and the regional method are exactly as they ship.",
    docTag: "METRI INDIVIDUAL REPORT",
    page: "extract · 00-1 · 00-2 · 05–06 · regional annex",
    person: {
      name: "Sample student",
      dept: "Mechanical Engineering, year 3",
      meta: [
        { l: "Sat", v: "11 March 2026" },
        { l: "Time taken", v: "32 min" },
        { l: "Report", v: "18 pages" },
      ],
    },
    jobsLabel: "00-1 Job-area fit · ten areas, scored out of 100",
    jobsNote:
      "The top three set the application strategy. The seven below carry the reason they fell where they did, so the student never has to ask why they were ruled out.",
    jobs: [
      { name: "Design & Development", score: 92 },
      { name: "Automotive & Aerospace", score: 88 },
      { name: "Research & Education", score: 79 },
      { name: "Manufacturing & Production", score: 74 },
      { name: "Robotics & Automation", score: 70 },
      { name: "IT Convergence & Data Analysis", score: 66 },
      { name: "Energy & Plant", score: 61 },
      { name: "Construction & Facility Management", score: 48 },
      { name: "Bio & Healthcare", score: 45 },
      { name: "Public Institutions & Other Fields", score: 41 },
    ],
    styleLabel: "00-2 Work style · six profiles",
    styleTypeLabel: "Profile",
    styleType: "Quality-led · independent",
    styleVerdict:
      "Strong where a standard is set and has to be met to the end. Costly in a team that runs on speed and on pulling other people along. For now, aim at posts where the standard is explicit — process and quality — and leave leading a team until year three or later.",
    styleAxes: ["Independent", "Collaborative", "Challenge-oriented", "Stability-oriented", "Speed-focused", "Quality-focused"],
    styleScores: [78, 55, 62, 71, 49, 86],
    planLabel: "Sections 05–06 · the next twelve months",
    planNote:
      "It does not end at a label. A month and a task are attached, and one line saying why it is worth doing.",
    plan: [
      {
        when: "Month 1",
        what: "Register for the quality-management certificate your country’s employers ask for most",
        why: "It appears in the majority of postings in this student’s top area",
      },
      {
        when: "Months 2–3",
        what: "Reframe the capstone project around defect-rate reduction",
        why: "Leaves a number the student can say out loud in an interview",
      },
      {
        when: "Month 4",
        what: "Apply for the placements at the local plants listed in the regional annex",
        why: "Placements are how these employers actually hire",
      },
      {
        when: "Month 6",
        what: "Draft the first application answer from the sentence frames in section 06",
        why: "The strengths are already written; the student edits rather than starts",
      },
      {
        when: "Month 9",
        what: "Apply to the five employers, in the order given",
        why: "Ranked by fit, not by brand recognition",
      },
    ],
    localLabel: "Regional annex · where they can go, near where they live",
    localNote:
      "Figures from the Korean edition, for a student in Daejeon: 184 organisations in the city were screened and sorted into 144 high fit, 40 moderate, 0 low, with 101 of them tied to the region’s priority industries. In your country the same method runs on your own labour-market data, and the report names the employers.",
    local: [
      { name: "184", note: "organisations screened in the city" },
      { name: "144", note: "high fit" },
      { name: "40", note: "moderate fit" },
      { name: "101", note: "tied to priority industries" },
    ],
    cta: {
      line: "Every student in the department gets one of these, with their own name on it.",
      sub: "Tell us the department and the cohort size; we come back within a day with a plan and a quote.",
      primary: { label: "Talk to us", href: "/contact" },
      secondary: { label: "See all ten sections", href: "/pca" },
    },
  },

  channels: {
    label: "WHO IT IS FOR",
    heading: "Two doors, one engine",
    lead:
      "A student can take it alone. A department can look at 500 at once. Both run on the same assessment and the same skill graph - what differs is the unit you buy and the document you walk away with.",
    items: [
      {
        key: "individual",
        tag: "INDIVIDUAL",
        title: "Take it on your own",
        who: "Students, job seekers, recent graduates",
        body:
          "Start with a free 12-item check to see the direction. Buy the full report one at a time. No institutional contract required.",
        gets: [
          "Free 12-item check - top role shown in full",
          "Full report - roles, industries, employers, skill gaps",
          "A six-month action plan",
          "An account that outlives graduation",
        ],
        unit: "One seat, pay per report",
        cta: { label: "See individual pricing", href: "/pricing" },
      },
      {
        key: "campus",
        tag: "CAMPUS",
        title: "See a whole cohort at once",
        who: "Departments, career services, schools",
        body:
          "Every student gets their own report; the department gets the anonymised roll-up. Where student gaps overlap with employer demand is where the curriculum has work to do.",
        gets: [
          "Individual reports for every student",
          "Anonymised cohort report - role spread, target industries, gaps",
          "Overlap with employer demand marked automatically",
          "Local employer matching by campus location",
          "Process data for outcome reporting",
        ],
        unit: "Annual contract, priced per seat",
        cta: { label: "Talk to us about adoption", href: "/adopt" },
      },
    ],
    note:
      "When a department contracts, its students reach the full report without paying individually - and keep the account after they graduate.",
  },

  who: {
    label: "WHO IS IT FOR",
    heading: "Who brings METRI into a country",
    items: [
      {
        no: "01",
        title: "Engineering faculties and departments",
        body: "“Careers services hand out a personality type. A mechanical engineering student still cannot tell design from CAE from process engineering.”",
        tag: "Job cluster fit with a confidence interval",
      },
      {
        no: "02",
        title: "Ministries and consortia",
        body: "“We can report how many attended. We cannot report which competencies the cohort is missing.”",
        tag: "Cohort gaps you can put in a budget line",
      },
      {
        no: "03",
        title: "Local partners",
        body: "“We have the university relationships. We do not have an engineering instrument worth selling.”",
        tag: "Operate it under your brand",
      },
    ],
  },

  analyze: {
    label: "WHAT IT READS",
    heading: "Three layers, and only the first one is a questionnaire",
    lead:
      "Interest is measured. Competency is not asked about — it is computed from coursework, certificates and projects. Keeping the two apart is the whole point: wanting to do CAE and being able to do CAE are different facts, and a report that blends them cannot be acted on.",
    items: [
      {
        no: "01",
        kicker: "MEASURED",
        title: "Ten engineering job areas, eight activity axes",
        body:
          "250 items, 25 per job area. Design, manufacturing, energy and plant, automotive and aerospace, robotics, IT convergence, construction, research, bio, public sector. Those ten fold into eight activity axes — analysis, design, build and test, programming, field and plant, optimisation, research, coordination — which mean the same thing in Seoul, Ankara and Astana.",
      },
      {
        no: "02",
        kicker: "MEASURED",
        title: "Six work styles, carried inside the same items",
        body:
          "120 of the 250 items carry a work-style signal without naming it. Independent, collaborative, challenge-oriented, stability-oriented, speed-focused, quality-focused. What matters is not the absolute height but which sits above which — the same student is an asset in process quality and a liability on a sprint team.",
      },
      {
        no: "03",
        kicker: "COMPUTED",
        title: "Held competency, from evidence only",
        body:
          "A course passed, a certificate held, a project shipped — each carries its own weight and reliability, and the sum converts to a level from 0 to 5. Ask a student to rate their own ANSYS and everyone says three. Where there is no evidence the report says so rather than guessing.",
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
      "Simulation & CAE",
      "Mechanical design",
      "Process engineering",
      "Quality & reliability",
      "Robotics & automation",
      "Semiconductor equipment",
    ],
    jobScores: [80, 73, 60, 65, 67, 61],
    styleAxes: ["Independent", "Collaborative", "Challenge-oriented", "Stability-oriented", "Speed-focused", "Quality-focused"],
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

  gap: {
    label: "AFTER THE ASSESSMENT",
    heading: "The assessment is the entrance. The expensive problem sits behind it.",
    lead:
      "When a department spends its training budget, the thing it knows least is who needs which training. Put 300 courses on a shelf and the coordinator picks by instinct. METRI names that cell with a number.",
    funnel: [
      { value: "487", label: "students in one mechanical engineering department" },
      { value: "31%", label: "meet the required GD&T level" },
      { value: "67%", label: "of 1,240 regional postings ask for GD&T" },
      { value: "372", label: "the overlap — students who need this training" },
    ],
    funnelNote:
      "That last figure is the quote. The department has already accepted the problem before choosing a remedy, which is a different conversion from a cold offer. The numbers above illustrate how the calculation runs; they are not a real department's data.",
    matrix: {
      head: ["Kind of tool", "What it has", "What it lacks"],
      rows: [
        ["Labour-market alignment analytics", "Curriculum measured against regional demand", "No individual student"],
        ["Individual skill-matching services", "Personal skills matched to postings", "No department-level aggregate"],
        ["National competency frameworks", "A standard dictionary of roles and skills", "No student assessment"],
        ["Free public career tests", "Free, open to everyone", "Neither engineering focus nor cohort view"],
        ["Vocational training platforms", "Hundreds of courses and a university channel", "No diagnosis — no idea who to sell to"],
        ["METRI", "Individual assessment → cohort aggregate → named training demand", "Training delivery runs through partners"],
      ],
      note:
        "We list kinds of tool rather than company names. Each does its own job well; what is empty is the cell where all five meet.",
    },
  },
  choose: {
    label: "WHY METRI",
    heading: "Why institutions pick this over a generic career test",
    items: [
      {
        title: "Engineering-specific, not engineering-adjacent",
        body:
          "General career tests end at “technical field”. METRI separates mechanical design from structural analysis from process engineering from equipment engineering, because those four hire differently, pay differently and require different software.",
      },
      {
        title: "Scores you can recompute",
        body:
          "Every weight sits in a table, not in code. A department can be handed the formula and arrive at the same 82. A score nobody can reproduce does not survive a procurement review.",
      },
      {
        title: "Intervals, not false precision",
        body:
          "Straight-lining, rushed answers and failed attention checks widen the confidence interval instead of silently lowering the score. Where two roles overlap, the report says so rather than inventing a rank.",
      },
      {
        title: "The instrument already travels",
        body:
          "The same 250 items exist in Korean, English and Turkish, and the eight activity axes are country-invariant by construction. Localisation replaces the labour-market layer — postings, employers, credentials — not the instrument.",
      },
    ],
  },

  closing: {
    kicker: "Tell us the department and a headcount",
    heading: ["We will come back with a scope,", "not a brochure"],
    lead: "Which departments, what the localisation would involve, and what the regional module would cost to build in your market.",
    primary: { label: "Talk to us", href: "/contact" },
    secondary: { label: "See how localisation works", href: "/localisation" },
  },

  about: {
    label: "ABOUT US",
    heading: "Developed by ACADEMIX",
    body:
      "ACADEMIX designs education programmes and runs events for universities and public institutions. PCA was developed in-house.",
    highlight:
      "Staffed by people out of government-funded research institutes and backed by a wide industry network, guiding career preparation from undergraduates through doctoral graduates.",
    brandsLabel: "Brands",
    brands: [
      { name: "ACADEMIX", note: "flagship · programmes and events" },
      { name: "career peak", note: "STEM careers and employment" },
      { name: "JOBINDUSTRY", note: "STEM graduate platform" },
    ],
    partnersLabel: "Worked with",
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
    partnersNote:
      "Lectures, mentoring and recruitment events delivered with universities, government research institutes, public bodies and companies.",
  },

  program: {
    label: "PROGRAM",
    heading: "The diagnosis is one part of a programme",
    lead:
      "PCA is not sold as a test in isolation. The result feeds the lectures, mentoring and recruitment events that follow it.",
    items: [
      {
        title: "Employment lectures and industry speakers",
        body: "Role-specific sessions with invited practitioners, chosen against the job areas the cohort scored highest on.",
      },
      {
        title: "STEM-focused mentoring",
        body: "Industry-linked mentoring across bachelor's, master's and doctoral students, matched to each student's priority roles.",
      },
      {
        title: "Career fairs and networking",
        body: "Large-scale recruitment events, connected to the employers surfaced by the regional matching where that module runs.",
      },
      {
        title: "AI-assisted career matching",
        body: "Application-essay analysis and interview practice that continue from section 06 of the report.",
      },
    ],
  },

  localisation: {
    label: "LOCALISATION",
    heading: "What travels, and what gets rebuilt",
    lead:
      "A new country is a content project, not a rebuild. Three layers: one is shared worldwide, one is rewritten per country, one is per university. Knowing which is which is what makes a rollout predictable.",
    layers: [
      {
        tag: "Layer 1",
        title: "Shared worldwide",
        body: "Built once, reused in every market. This is the part you do not pay to rebuild.",
        items: [
          "The instrument and its scoring rules",
          "The ten job areas and the six work styles",
          "The report structure — sections 00-1 through 08",
          "The competency framework behind the strength profile",
        ],
      },
      {
        tag: "Layer 2",
        title: "Rebuilt per country",
        body: "Where the diagnosis meets a labour market. This is the actual localisation work.",
        items: [
          "Translation of every human-readable name and passage",
          "Alignment to the national occupational standard, alongside NCS and O*NET",
          "Local occupation names, entry routes and credential conventions",
          "Regional employer data, where a country wants the settlement module",
        ],
      },
      {
        tag: "Layer 3",
        title: "Filled in per university",
        body: "Supplied by the institution itself, with an intake template.",
        items: [
          "The department list and its own character",
          "Local employers and institutions around the campus",
          "Release policy — who sees results, and when",
        ],
      },
    ],
    note:
      "Because layer 1 is shared, cohorts in different countries stay comparable. That comparability is the asset — it is why the platform students sit on is one, worldwide, even though the marketing sites are separate.",
  },

  partnership: {
    label: "PARTNERSHIP",
    heading: "How a country gets started",
    lead:
      "Two ways in: run it as a university, or operate it in your market as a partner. Either way the split of work is the same.",
    columns: [
      {
        title: "ACADEMIX provides",
        items: [
          "The instrument, scoring engine and report generation",
          "The shared job-area and work-style framework",
          "Intake templates for local occupation and employer data",
          "Training for the people who will run sittings and read results",
          "The administrator area for participation and outcome reporting",
        ],
      },
      {
        title: "The local partner provides",
        items: [
          "Translation review by someone who knows the sector",
          "Alignment to the national occupational standard",
          "Regional employer and institution data, where that module is wanted",
          "The relationship with universities and the operation on the ground",
        ],
      },
    ],
    steps: [
      {
        title: "Scoping call",
        body: "Which departments, roughly how many students, and whether the regional module is in scope.",
      },
      {
        title: "Pilot cohort",
        body: "One department sits the assessment against a first-pass localisation, and reads the reports with us.",
      },
      {
        title: "Localisation build",
        body: "Translation, standard alignment and employer data are completed from the pilot's findings.",
      },
      {
        title: "Rollout",
        body: "Department by department, with the institutional report accumulating from the first sitting.",
      },
    ],
  },

  faq: {
    label: "FAQ",
    heading: "FAQ",
    items: [
      {
        q: "Does this only work in Korea?",
        a: "No. The instrument, the ten job areas and the six work styles are shared worldwide. What is rebuilt per country is the translation, the alignment to that country's occupational standard, and — where wanted — regional employer data. That split is set out under Localisation.",
      },
      {
        q: "How long does a localisation take?",
        a: "It depends on whether the regional employer module is in scope. Translation and standard alignment are the bulk of it; employer data is the long pole. We scope it against a pilot cohort rather than quoting blind.",
      },
      {
        q: "Can we run it under our own brand?",
        a: "Yes. Local partners operate the diagnosis in their market under a licence. ACADEMIX supplies the instrument, scoring and report generation; the partner supplies the local data and the relationship with universities.",
      },
      {
        q: "Where does student data live?",
        a: "Responses and results are stored server-side; nothing is kept in the browser. Residency, retention and hand-back at contract end are set out in the agreement, and can be arranged to meet local requirements.",
      },
      {
        q: "How do students take it?",
        a: "We issue a participation link per university and department. A student opens the link, completes the assessment and receives their report automatically. There is no student sign-up and no roster upload.",
      },
      {
        q: "What does the institution receive?",
        a: "An anonymised aggregate report covering the cohort's distribution across job areas and work styles — usable as evidence of graduate outcomes. An administrator area covering every department is on the way.",
      },
      {
        q: "Is it validated?",
        a: "It was built from a 2,346-student sample together with 428 job postings, 137 job descriptions and 62 NCS references. Area definitions and interpretation criteria reference NCS, the O*NET lineage, RIASEC, NACE, OECD frameworks and AERA/APA/NCME measurement standards. The core items are registered with the Korea Copyright Commission.",
      },
    ],
  },

  pricing: {
    label: "PRICING",
    heading: "Start with one department",
    lead:
      "Most institutions run one department first and widen from there. Individual assessments are available one at a time.",
    planLabel: "What you are interested in",
    plans: [
      {
        key: "individual",
        name: "Individual",
        who: "A student, a job seeker, a would-be founder",
        price: null,
        unit: "per person",
        note: "Card payment is not connected yet. Requests come through the form for now.",
        features: [
          "Ten job areas ranked out of 100",
          "Six work styles as a hexagon",
          "A 15–20 page personal plan across ten sections",
          "Projects, applications, interviews, founding",
        ],
        cta: { ready: "Buy now", ask: "Request an assessment" },
      },
      {
        key: "department",
        name: "Department",
        who: "A department or careers service",
        price: null,
        unit: "per student",
        note: "Unit price depends on the cohort size.",
        features: [
          "Everything in Individual",
          "A participation link per department",
          "Anonymised aggregate report",
          "Regional employer matching, where localised",
          "The department sets when results are released",
        ],
        cta: { ready: "Start a rollout", ask: "Talk about a rollout" },
        featured: true,
      },
      {
        key: "country",
        name: "Country partner",
        who: "An operator bringing PCA to their market",
        price: null,
        unit: "licence",
        note: "Scoped against a pilot cohort rather than quoted blind.",
        features: [
          "Everything in Department",
          "Localisation build for your country",
          "Operate under your own brand",
          "Training for the people running it",
          "Administrator area for outcome reporting",
        ],
        cta: { ready: "Start a partnership", ask: "Talk about a partnership" },
      },
    ],
    note:
      "Price depends on cohort size and whether the regional module is in scope. Tell us the department and a rough number and we will come back with an estimate.",
  },

  regions: {
    label: "COUNTRIES",
    heading: "Open the site for your country",
    lead:
      "Each country runs its own site in its own language, against its own labour-market data. The platform students sit on is one, worldwide.",
    liveLabel: "Open",
    soonLabel: "In preparation",
    note:
      "Domains shown are placeholders until each country site goes live. If your country is not listed yet, talk to us — that is how a new one starts.",
    items: [
      { code: "KR", name: "Korea", native: "한국", domain: "pca.co.kr", href: "https://pca.co.kr", live: true },
      { code: "DE", name: "Germany", native: "Deutschland", domain: "pca.de", href: "https://pca.de", live: true },
      { code: "US", name: "United States", native: "United States", domain: "pca.us", href: "https://pca.us", live: true },
      { code: "JP", name: "Japan", native: "日本", domain: "pca.jp", href: "https://pca.jp", live: true },
      { code: "CN", name: "China", native: "中国", domain: "pca.cn", href: "https://pca.cn", live: true },
      { code: "TR", name: "Türkiye", native: "Türkiye", domain: "pca.com.tr", href: "https://pca.com.tr", live: true },
      { code: "KZ", name: "Kazakhstan", native: "Қазақстан", domain: "pca.kz", href: "#contact", live: false },
      { code: "FR", name: "France", native: "France", domain: "pca.fr", href: "#contact", live: false },
      { code: "ZA", name: "South Africa", native: "South Africa", domain: "pca.co.za", href: "#contact", live: false },
      { code: "PH", name: "Philippines", native: "Pilipinas", domain: "pca.ph", href: "#contact", live: false },
    ],
  },

  contact: {
    heading: "Talk to us",
    lead:
      "The department and a rough headcount are enough. We come back with what a rollout would actually involve in your market.",
    quickHeading: "One minute",
    quickNote: "The department and a rough number are enough. We reply with a scope, not a brochure.",
    quickSubmit: "Send",
    typeLabel: "What is this about",
    types: [
      { value: "org", label: "University, department or school rollout" },
      { value: "partner", label: "Operating METRI in my country" },
      { value: "individual", label: "An individual assessment" },
    ],
    afterLabel: "What happens next",
    after: [
      "We read it and check the fit",
      "We come back with a scope and an estimate",
      "We agree a pilot cohort and a timeline",
    ],
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
