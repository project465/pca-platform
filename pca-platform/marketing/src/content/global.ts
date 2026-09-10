import type { SiteContent } from "./types";

/**
 * 영어판. 한국어판과 같은 페이지를 옮기되, 말을 거는 상대가 다르다.
 * 해외 대학과 파트너에게는 "우리 나라에서도 되느냐" 가 첫 질문이라
 * 국가 전개 지도를 하나 더 둔다. 대전 사례는 한국 사례로 소개한다.
 */
export const global: SiteContent = {
  key: "global",
  lang: "en",
  domain: "metri.example",
  brand: "METRI",
  org: "ACADEMIX",
  orgTagline: "EDUCATION & CONFERENCE",
  platformUrl: "https://pcagroup.haricareer.com",
  /* 처리방침은 이 사이트 자체 페이지다 (R022). 라이브 플랫폼에는 없다 */
  privacyUrl: "/privacy",

  meta: {
    title: "METRI — A career strategy built around the major you already chose",
    description:
      "Personalized Career Analysis reads job fit, work style and execution strategy together, then tells students what to prepare — projects, applications, interviews, founding, and employers in their own region.",
  },

  ui: {
    glanceLabel: "AT A GLANCE",
    glanceHeading: "One sitting, carried through to execution",
    flow: ["Sitting", "Job areas", "Six work styles", "Execution plan", "Report"],
    sheetCta: "See the result sheet",
    moreLabel: "GO DEEPER",
    moreHeading: "Start where it matters to you",
    nextLabel: "NEXT",
    nextHeading: "What would this look like at your institution?",
    pageTitles: {
      metri: "METRI",
      adopt: "Adoption",
      pricing: "Pricing",
      about: "About",
      contact: "Contact",
      localisation: "Localisation",
      partnership: "Partnership",
    },
    linkTitles: {
      metri: "The diagnosis",
      adopt: "How adoption works",
      contact: "Talk to us",
      localisation: "Localisation",
      partnership: "Partnership",
    },
    photos: {
      home: [
        "Photo — employment lecture",
        "Photo — STEM mentoring session",
        "Photo — career fair",
      ],
      about: [
        "Photo — university event",
        "Photo — invited speaker",
        "Photo — the team",
      ],
      metri: "Photo — a department sitting the assessment",
      adopt: "Photo — the administrator screen in use",
      localisation: "Photo — a localisation workshop with a partner university",
    },
  },

  nav: {
    items: [
      { label: "METRI", href: "/metri" },
      { label: "LOCALISATION", href: "/localisation" },
      { label: "PARTNERSHIP", href: "/partnership" },
      { label: "PRICING", href: "/pricing" },
      { label: "ABOUT", href: "/about" },
      { label: "CONTACT", href: "/contact" },
    ],
    contact: "Talk to us",
    menu: "Menu",
    floating: "Contact",
    login: "Staff sign-in",
    loginNote: "Students use the link their university sends them",
  },

  hero: {
    /* METRI 는 약자가 아니다. 옆 문구는 브랜드 풀이가 아니라 제품 설명이다 (R022) */
    eyebrow: "METRI · CAREER-FIT ASSESSMENT FOR UNIVERSITIES",
    title: ["Your students already know their major.", "{Nobody has told them what to do next.}"],
    lead:
      "METRI ranks the job areas of a student's own field out of 100, maps six work styles across 120 items, and writes each student a plan — credentials, projects, applications, interviews, founding, and employers in their own region. Built in Korea, rebuilt in your country from your own labour-market data.",
    primary: { label: "Talk to us", href: "/contact" },
    secondary: { label: "See a real report", href: "#sample" },
    watermark: "METRI",
  },

  sample: {
    label: "A REAL REPORT",
    heading: "Before the method, look at what a student is handed",
    lead:
      "What METRI measures is the second question. Below are four pages of the report put on one screen. A student does not receive a type name. They receive this.",
    disclaimer:
      "An illustrative screen showing the format of the report — not a real student’s submission. The job areas shown are one field's; the six work styles and the regional method are exactly as they ship.",
    docTag: "METRI INDIVIDUAL REPORT",
    page: "extract · ch.1 · ch.5–6 · annex",
    person: {
      name: "Sample student",
      dept: "Business Administration, year 3",
      meta: [
        { l: "Sat", v: "11 March 2026" },
        { l: "Time taken", v: "32 min" },
        { l: "Report", v: "8 chapters, 52 sections" },
      ],
    },
    jobsLabel: "Ch.1 · Job-area fit, scored out of 100",
    jobsNote:
      "The top three set the application strategy. The seven below carry the reason they fell where they did, so the student never has to ask why they were ruled out.",
    jobs: [
      { name: "Production & operations", score: 88 },
      { name: "Logistics, distribution & procurement", score: 81 },
      { name: "Consulting & research", score: 74 },
      { name: "IT, data & service planning", score: 69 },
      { name: "Marketing, PR & sales", score: 63 },
      { name: "Management & strategy", score: 57 },
      { name: "Administration & business support", score: 51 },
      { name: "Finance & accounting", score: 46 },
      { name: "HR & organisation", score: 40 },
      { name: "Banking & investment", score: 34 },
    ],
    styleLabel: "00-2 Work style · six profiles",
    styleTypeLabel: "Profile",
    styleType: "Quality-led · independent",
    styleVerdict:
      "Strong where a standard is set and has to be met to the end. Costly in a team that runs on speed and on pulling other people along. For now, aim at posts where the standard is explicit — process and quality — and leave leading a team until year three or later.",
    styleAxes: ["Independent", "Collaborative", "Challenging", "Steady", "Speed-led", "Quality-led"],
    styleScores: [78, 55, 62, 71, 49, 86],
    planLabel: "Chapters 5–6 · the next twelve months",
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
        what: "Reframe the final-year project around defect-rate reduction",
        why: "Leaves a number the student can say out loud in an interview",
      },
      {
        when: "Month 4",
        what: "Apply for the summer placements in operations roles",
        why: "Placements are how these employers actually hire",
      },
      {
        when: "Month 6",
        what: "Draft the first application answer from the sentence frames in chapter 6",
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
      "Figures from the Korean edition, for a student in Daejeon: 184 organisations in the city were screened and sorted into 144 high fit, 40 moderate, 0 low, with 101 of them tied to the region’s priority industries. Regional matching is a Korea module today. Elsewhere it is built with the partner university against that country's own labour-market data, and only then does the report name employers.",
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
      secondary: { label: "See the report structure", href: "/metri" },
    },
  },

  who: {
    label: "WHO IS IT FOR",
    heading: "Who brings METRI into a country",
    items: [
      {
        no: "01",
        title: "Universities and departments",
        body: "“Our careers service hands out a personality type. Students still ask us what to actually do.”",
        tag: "A written plan per student",
      },
      {
        no: "02",
        title: "Ministries and consortia",
        body: "“We can report how many attended. We cannot report what changed.”",
        tag: "Cohort evidence you can file",
      },
      {
        no: "03",
        title: "Local partners",
        body: "“We have the university relationships. We do not have an instrument worth selling.”",
        tag: "Operate it under your brand",
      },
    ],
  },

  analyze: {
    label: "WHAT METRI ANALYZES",
    heading: "METRI analyses three things together",
    lead:
      "The three are not read separately. They are joined, which is why the result lands as something to do rather than something to know.",
    items: [
      {
        no: "01",
        kicker: "Job fit",
        title: "The field narrows to three",
        body: "The job areas of the student's field, scored out of 100 and ranked. The first is analysed in depth; the second and third stay as reference.",
      },
      {
        no: "02",
        kicker: "Work style",
        title: "And they can say why",
        body: "Six work styles, measured and reduced to a leading combination — the sentence a student needs when an interviewer asks why this role.",
      },
      {
        no: "03",
        kicker: "Execution",
        title: "Something to do next month",
        body: "Credentials, projects, portfolio, applications, interviews, founding — down to the one thing to start this week.",
      },
    ],
  },

  why: {
    label: "WHY METRI",
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
      title: "METRI",
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
      "METRI runs diagnosis → strengths → application → strategy → execution.",
      "Open a section to see how the report is built.",
    ],
    more: "continues in the report",
    disclaimer:
      "※ This screen shows the report's structure — what each chapter holds. It does not carry any individual student's results.",
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
    /* The report is 8 chapters, 52 sections. Chapter titles and most section
       titles are the pilot's canonical English (A01, 2026-09-04). Chapter 9
       (regional employer matching) is a Korea-only module and is not part of
       this contents list.

       All 52 section titles are the pilot's canonical English (2026-09-09).
       Six of them — 2-2 to 2-4 and 3-1 to 3-3 — carry area-specific wording in
       the report itself; a contents list has to stay general, so the generic
       form is used here, as instructed. British spelling ("emphasise") is the
       pilot's. */
    tabs: [
      {
        no: "1",
        nav: "Summary of results",
        title: "Chapter 1. Summary of Your Results",
        chart: "jobs",
        meta: [
          { label: "Highest area", value: "Management & strategy" },
          { label: "Score", value: "92 / 100" },
          { label: "Student", value: "■■■" },
        ],
        chartNote: "The job areas inside the student's own field, scored out of 100 and ranked.",
        blocks: [
          {
            sub: "6 sections",
            title: "What this chapter holds",
            bullets: [
              "1-1 The area with your highest score",
              "1-2 Your areas, ranked",
              "1-3 Your work style scores",
              "1-4 Your three strongest work styles",
              "1-5 Employment, business, or both",
              "1-6 Key points from your results",
            ],
          },
        ],
        capTitle: "Core diagnosis",
        capBody: "The top area and the ranking, the work styles, and the two read together.",
        capArrow: "The other seven chapters are all written against this one",
      },
      {
        no: "2",
        nav: "Your strengths",
        title: "Chapter 2. Your Strengths",
        blocks: [
          {
            sub: "6 sections",
            title: "What this chapter holds",
            bullets: [
              "2-1 Three strengths drawn from your results",
              "2-2 First strength",
              "2-3 Second strength",
              "2-4 Third strength",
              "2-5 How your strengths work together",
              "2-6 Showing your strengths when applying",
            ],
          },
          {
            body: [
              "Three strengths, one section each, and then how to make them visible on paper and in a room. Knowing a strength and showing it are different jobs.",
            ],
          },
        ],
        capTitle: "Strength profile",
        capBody: "Three strengths unpacked, and how to show them.",
        capArrow: "So “what are your strengths” has a written answer",
      },
      {
        no: "3",
        nav: "Real work situations",
        title: "Chapter 3. Real Work Situations",
        blocks: [
          {
            sub: "4 sections",
            title: "What this chapter holds",
            bullets: [
              "3-1 Work scenario 1",
              "3-2 Work scenario 2",
              "3-3 Work scenario 3",
              "3-4 What these situations tell you",
            ],
          },
          {
            body: [
              "A job title does not tell you what the work is. Three scenes from an ordinary day, then a reading of how this student would adapt to them.",
            ],
          },
        ],
        capTitle: "What the work actually looks like",
        capBody: "Not a job title — a day, in three scenes.",
        capArrow: "“Could I do this every day?”",
      },
      {
        no: "4",
        nav: "Roles and directions",
        title: "Chapter 4. Roles and Career Directions",
        blocks: [
          {
            sub: "7 sections",
            title: "What this chapter holds",
            bullets: [
              "4-1 Understanding this area",
              "4-2 Roles connected to this area",
              "4-3 Roles worth exploring first",
              "4-4 Roles worth comparing",
              "4-5 An order for exploring careers",
              "4-6 How to choose between roles",
              "4-7 Roles and career directions: summary",
            ],
          },
        ],
        capTitle: "Roles and career direction",
        capBody: "What to look at first, what to weigh against it, and on what basis to choose.",
        capArrow: "The search gets an order",
      },
      {
        no: "5",
        nav: "Projects and portfolio",
        title: "Chapter 5. Projects and Portfolio",
        blocks: [
          {
            sub: "7 sections",
            title: "What this chapter holds",
            bullets: [
              "5-1 Why projects matter",
              "5-2 Project directions for this area",
              "5-3 Projects you can start now",
              "5-4 What a portfolio must contain",
              "5-5 How to present each type of output",
              "5-6 A four-week plan",
              "5-7 Projects and portfolio: summary",
            ],
          },
          {
            body: [
              "A portfolio does not accumulate by itself. This chapter goes from why, down to a four-week plan.",
            ],
          },
        ],
        capTitle: "Projects and portfolio",
        capBody: "What to build, down to a four-week plan.",
        capArrow: "The chapter that makes the thing you will write about",
      },
      {
        no: "6",
        nav: "Application and interview",
        title: "Chapter 6. Application Documents and Interview Preparation",
        blocks: [
          {
            sub: "7 sections",
            title: "What this chapter holds",
            bullets: [
              "6-1 How to approach your application documents",
              "6-2 Example sentences for application documents",
              "6-3 Questions you may be asked",
              "6-4 How to structure an interview answer",
              "6-5 Points to emphasise in interviews",
              "6-6 What to watch out for",
              "6-7 Application and interview: summary",
            ],
          },
          {
            body: [
              "Example sentences and answer structures. Knowing a strength and writing it as a paragraph are different things — this chapter means the student does not start from a blank page.",
            ],
          },
        ],
        capTitle: "Application documents and interview",
        capBody: "Example sentences, likely questions, answer structures.",
        capArrow: "Nobody starts from a blank page",
      },
      {
        no: "7",
        nav: "Starting a business",
        title: "Chapter 7. Starting Your Own Business",
        blocks: [
          {
            sub: "7 sections",
            title: "What this chapter holds",
            bullets: [
              "7-1 Business directions from your results",
              "7-2 Five business ideas for this area",
              "7-3 Comparing the business ideas",
              "7-4 Entering the market",
              "7-5 Preparing at a student level",
              "7-6 A four-week plan for starting out",
              "7-7 Starting your own business: summary",
            ],
          },
          {
            body: [
              "Founding is not for everyone. Where there is a direction that fits, this chapter says which idea and in what order.",
            ],
          },
        ],
        capTitle: "Preparing to found something",
        capBody: "Five ideas, compared, with an entry strategy and a four-week plan.",
        capArrow: "An option, not an instruction",
      },
      {
        no: "8",
        nav: "Growth and next steps",
        title: "Chapter 8. Growth Points and Next Steps",
        blocks: [
          {
            sub: "8 sections",
            title: "What this chapter holds",
            bullets: [
              "8-1 Your core strengths",
              "8-2 Roles to explore first",
              "8-3 The project to start with",
              "8-4 Points to use in applications and interviews",
              "8-5 Points to check on the business route",
              "8-6 What to be careful about",
              "8-7 Your direction from here",
              "8-8 A 30-day checklist",
            ],
          },
          {
            body: [
              "Seven chapters folded into one. The last section is a 30-day checklist, so the student can close the document and begin.",
            ],
          },
        ],
        capTitle: "Growth points and next steps",
        capBody: "Seven chapters folded into one, ending in a 30-day checklist.",
        capArrow: "What to do once you close it",
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
    heading: "METRI was built from data",
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
      note: "The core diagnostic items in the METRI indicator family are registered with the Korea Copyright Commission and legally protected.",
    },
    standards: {
      title: "Standards referenced in the design",
      head: ["Framework", "Issued by / lineage", "How it informed METRI"],
      rows: [
        ["NCS", "Ministry of Employment and Labor · HRD Korea", "Alignment of job areas and required capability with the national standard"],
        ["O*NET lineage", "US Department of Labor occupational information", "Reference for job areas and task-level design"],
        ["RIASEC lineage", "Standard vocational-psychology model", "Conceptual frame for partitioning interest areas"],
        ["NACE competencies", "National Association of Colleges and Employers", "Benchmark for defining student career readiness"],
        ["OECD frameworks", "OECD DeSeCo · Learning Compass", "Reference for transferable core-competency structure"],
        ["Field-of-study classification", "UNESCO ISCED-F 2013", "The ten broad fields METRI is organised by"],
        ["Measurement standards", "AERA · APA · NCME lineage", "Basis for the validity and reliability regime"],
      ],
      note: "These frameworks were referenced and benchmarked during design. Reference does not imply joint development, certification or endorsement by the bodies named.",
    },
  },

  choose: {
    label: "WHY CHOOSE METRI",
    heading: "Why this and not another test",
    items: [
      {
        title: "What a free test cannot give you",
        body: "Public career services produce results you cannot file as institutional evidence. METRI gives the student a written plan and the institution an anonymised aggregate report it can submit.",
      },
      {
        title: "Recruitment market, not personality theory",
        body: "428 job postings, 137 job descriptions and 62 NCS references, on a 2,346-student sample. The core items are registered with the Korea Copyright Commission.",
      },
      {
        title: "This term, not after graduation",
        body: "It does not end at “look into it later.” A four-week plan and a 30-day checklist mean the student closes the report with something scheduled.",
      },
      {
        title: "A rollout you can cost out",
        body: "Three layers, clearly split: what is shared worldwide, what is rebuilt per country, what the university fills in. You know what you are paying to build before you start.",
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
      "ACADEMIX designs education programmes and runs events for universities and public institutions. METRI was developed in-house.",
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
      "METRI is not sold as a test in isolation. The result feeds the lectures, mentoring and recruitment events that follow it.",
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
          "The job-area framework and the six work styles",
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
        a: "No. The instrument, the job-area framework and the six work styles are shared worldwide. What is rebuilt per country is the translation, the alignment to that country's occupational standard, and — where wanted — regional employer data. That split is set out under Localisation.",
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

  privacy: {
    label: "PRIVACY",
    heading: "Privacy notice",
    version: "2026-09-10",
    versionLabel: "Version",
    operator:
      "⟨Company name⟩ · ⟨Representative⟩ · ⟨Registered address⟩ · ⟨Business registration number⟩",
    sections: [
      {
        title: "1. What we collect, and why",
        body: [
          "We collect only what the purpose needs, and delete it when the purpose ends. What we collect when you send an enquiry differs from what we collect when a student sits the assessment.",
        ],
        table: {
          head: ["When", "What", "Why"],
          rows: [
            ["Enquiry", "Institution · contact name · email", "To reply and put a scope together"],
            ["Enquiry", "Approximate cohort size · your message", "To estimate and schedule (optional)"],
            ["Assessment", "Name · student number", "To identify the student and label the report"],
            ["Assessment", "Password", "So only the student sees their result (stored irreversibly)"],
            ["Assessment", "University email", "To notify when results open (only if the department asks for it)"],
            ["Assessment", "Responses", "To compute job-area fit and work style"],
            ["Automatic", "Last sign-in time", "To detect unauthorised access"],
          ],
        },
      },
      {
        title: "2. How long we keep it",
        body: [
          "Enquiries are deleted once the conversation ends.",
          "Assessment data is held for the term of the contract and deleted within ⟨retention period⟩ of its end.",
          "If you ask us to delete it, we do so without delay, except where law requires us to keep it.",
          "Aggregates may remain, but only after they have been made non-identifying — and that cannot be reversed.",
        ],
      },
      {
        title: "3. Who sees it",
        body: [
          "An individual report is visible to the student and to the administrator of their department, because the department is the contracting party.",
          "The report the department sees is an aggregate. It does not say who is missing what.",
          "We do not provide it to any other third party. Where law requires disclosure, we comply within the scope required.",
          "We do not sell or transfer it for advertising or marketing.",
        ],
      },
      {
        title: "4. Processors",
        body: ["We entrust the following to run the service. If a processor changes, we amend this notice and say so."],
        table: {
          head: ["Processor", "What they do"],
          rows: [
            ["⟨Hosting provider⟩", "Server operation and data storage"],
            ["⟨Email provider⟩", "Sending notification email"],
          ],
        },
      },
      {
        title: "5. Your rights",
        body: [
          "You may ask at any time to see, correct, delete, or stop the processing of your data. Contact us below and we will act without delay.",
          "You may withdraw consent. Withdrawing consent for a required item means the assessment cannot continue.",
          "The service is not for anyone under 14. It is written for university students.",
        ],
      },
      {
        title: "6. How we protect it",
        body: [
          "Passwords are stored irreversibly. We cannot read them either.",
          "Connections are encrypted.",
          "Results stay closed to the student until their department opens them.",
          "The number of people who handle personal data is kept to the minimum, and access is logged.",
        ],
      },
      {
        title: "7. Contact",
        body: [
          "For anything about personal data, write to us.",
          "Data protection officer: ⟨name and title⟩",
          "Contact: ⟨phone⟩ · ⟨email⟩",
        ],
      },
      {
        title: "8. Changes to this notice",
        body: ["If something material changes, we say so before it takes effect and, where needed, ask for consent again."],
      },
    ],
  },

  fields: {
    label: "FIELDS",
    heading: "METRI sits on ten fields of study",
    lead:
      "The fields follow UNESCO's International Standard Classification of Education (ISCED-F 2013). The same ten are used in every country, so departments, universities and markets stay comparable.",
    items: [
      { code: "C01", name: "Education" },
      { code: "C02", name: "Arts and Humanities" },
      { code: "C03", name: "Social Sciences, Journalism and Information" },
      { code: "C04", name: "Business, Administration and Law" },
      { code: "C05", name: "Natural Sciences, Mathematics and Statistics" },
      { code: "C06", name: "Information and Communication Technologies" },
      { code: "C07", name: "Engineering, Manufacturing and Construction" },
      { code: "C08", name: "Agriculture, Forestry, Fisheries and Veterinary" },
      { code: "C09", name: "Health and Welfare" },
      { code: "C10", name: "Services" },
    ],
    note:
      "Below a field sit the subjects, and below those the job areas — those differ by subject. What applies to a given department is worked out during scoping.",
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
          "Job areas ranked out of 100",
          "Six work styles as a hexagon",
          "A personal written plan",
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
        who: "An operator bringing METRI to their market",
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
    liveLabel: "Site ready",
    soonLabel: "In preparation",
    note:
      "The sites are written; the domains are placeholders and not connected yet. If your country is not listed, talk to us — that is how a new one starts.",
    /* live 는 "그 나라 사이트 원고가 있는가" 다. 지금 있는 것은 셋뿐이고
       도메인은 아직 연결되지 않았다. 나라별 계약 현황과 다른 값이다 */
    items: [
      { code: "KR", name: "Korea", native: "한국", domain: "metri.co.kr", href: "https://metri.co.kr", live: true },
      { code: "KZ", name: "Kazakhstan", native: "Қазақстан", domain: "metri.kz", href: "https://metri.kz", live: true },
      { code: "TR", name: "Türkiye", native: "Türkiye", domain: "metri.com.tr", href: "#contact", live: false },
      { code: "DE", name: "Germany", native: "Deutschland", domain: "metri.de", href: "#contact", live: false },
      { code: "US", name: "United States", native: "United States", domain: "metri.us", href: "#contact", live: false },
      { code: "JP", name: "Japan", native: "日本", domain: "metri.jp", href: "#contact", live: false },
      { code: "CN", name: "China", native: "中国", domain: "metri.cn", href: "#contact", live: false },
      { code: "FR", name: "France", native: "France", domain: "metri.fr", href: "#contact", live: false },
      { code: "ZA", name: "South Africa", native: "South Africa", domain: "metri.co.za", href: "#contact", live: false },
      { code: "PH", name: "Philippines", native: "Pilipinas", domain: "metri.ph", href: "#contact", live: false },
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
      { value: "org", label: "University or department rollout" },
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
    note: "METRI · developed by ACADEMIX",
    sitesLabel: "Countries",
    sites: [
      { label: "Global (English)", href: "https://metri.example", ready: true },
      { label: "한국", href: "https://metri.co.kr", ready: true },
      { label: "Қазақстан", href: "https://metri.kz", ready: true },
      { label: "Türkiye", href: "https://metri.com.tr", ready: false },
    ],
    soonLabel: "coming soon",
    privacyLabel: "Privacy notice",
    closing: "So that a major leads somewhere",
  },

  map: {
    heading: "Where METRI runs",
    lead:
      "The instrument, the job areas and the work-style framework are shared worldwide. What is filled in per country is the university, its local employers, and the translations.",
    /* 실측한 것만 적는다. 2026-09-09 확인 — 라이브 플랫폼의 계약 대학
       등록 9행 가운데 실계약은 터키 2곳이고 나머지 7행은 테스트·데모다.
       예전 원고는 6개국이 "Running" 이라고 적고 있었다. 근거가 없다. */
    countries: [
      { code: "TR", name: "Türkiye", status: "live", note: "Universities under contract" },
      { code: "KR", name: "Korea", status: "progress", note: "Home market · platform operated here" },
      { code: "KZ", name: "Kazakhstan", status: "planned", note: "Site ready · in discussion" },
      { code: "DE", name: "Germany", status: "planned", note: "Planned" },
      { code: "US", name: "United States", status: "planned", note: "Planned" },
      { code: "JP", name: "Japan", status: "planned", note: "Planned" },
      { code: "CN", name: "China", status: "planned", note: "Planned" },
      { code: "FR", name: "France", status: "planned", note: "Planned" },
      { code: "ZA", name: "South Africa", status: "planned", note: "Planned" },
      { code: "PH", name: "Philippines", status: "planned", note: "Planned" },
    ],
    statusLabel: { live: "Under contract", progress: "Home market", planned: "Planned" },
    footnote:
      "We do not publish partner names without their consent. Regional employer matching is a Korea module today; elsewhere the list is built with the partner university — the method travels, the list does not.",
  },
};
