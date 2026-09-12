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

  legal: {
    company: "",
    ceo: "",
    address: "",
    tel: "",
    email: "",
    bizNo: "",
    mailOrderNo: "",
    jobInfoNo: "J1700020220007",
    privacyOfficer: "",
    labels: {
      heading: "Business information",
      company: "Company", ceo: "Representative", address: "Address", tel: "Phone",
      email: "Email", bizNo: "Business registration no.", mailOrderNo: "Mail-order licence no.",
      jobInfoNo: "Career information provider no.", privacyOfficer: "Privacy officer",
      unset: "to be confirmed",
    },
    links: { terms: "Terms", privacy: "Privacy", refund: "Refunds" },
  },
  nav: {
    items: [
      { label: "PCA", href: "/pca" },
      { label: "Who it is for", href: "/#channels" },
      { label: "Localisation", href: "/localisation" },
      { label: "Partnership", href: "/partnership" },
      { label: "Pricing", href: "/pricing" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    contact: "Talk to us",
    menu: "Menu",
    floating: "Contact",
    start: "Start",
  },

  hero: {
    eyebrow: "METRI · Engineering career diagnostics",
    title: ["They chose engineering.", "Nobody told them which engineering."],
    lead:
      "Mechanical, electrical and computer engineering — 24 job clusters and 138 competencies, checked against real postings. Not “you are collaborative”, but “Simulation & CAE 80, ANSYS held 2 of 4, asked for in 89 of 132 postings for this role”. The activity axes are the same in every country, which is why the instrument travels.",
    primary: { label: "See a real report", href: "#sample" },
    secondary: { label: "Talk to us", href: "/contact" },
    priceline:
      "₩29,000 per person · 253 items, about 30 minutes · an 18-page report. Departments contract by cohort size.",
    watermark: "METRI",
    proof: [
      { value: "250", label: "items, in three languages" },
      { value: "24", label: "engineering job clusters" },
      { value: "138", label: "competencies mapped" },
      { value: "3", label: "copyright registrations" },
    ],
  },

  sample: {
    label: "A real report",
    heading: "Before the method, look at what a student is handed",
    lead:
      "What PCA measures is the second question. Below is a 15–20 page report with four of its pages put on one screen. A student does not receive a type name. They receive this.",
    disclaimer:
      "An illustrative screen showing the format of the report — not a real student’s submission. The ten job areas, the six work styles and the regional method are exactly as they ship.",
    docTag: "METRI individual report",
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
      "The thin bar is the measurement error. Areas whose intervals overlap are shown as one group — we do not rank differences smaller than the error. Areas in a lower group carry the reason they fell there, so the student never has to ask why they were ruled out.",
    tierLabel: "Group {n}",
    tierNote:
      "Two areas share the top group. This assessment cannot separate them, so both stay open and experience decides.",
    jobs: [
      { name: "Design & Development", score: 92, band: [87, 97], tier: 1 },
      { name: "Automotive & Aerospace", score: 88, band: [83, 93], tier: 1 },
      { name: "Research & Education", score: 79, band: [74, 84], tier: 2 },
      { name: "Manufacturing & Production", score: 74, band: [69, 79], tier: 2 },
      { name: "Robotics & Automation", score: 70, band: [65, 75], tier: 2 },
      { name: "IT Convergence & Data Analysis", score: 66, band: [61, 71], tier: 3 },
      { name: "Energy & Plant", score: 61, band: [56, 66], tier: 3 },
      { name: "Construction & Facility Management", score: 48, band: [43, 53], tier: 4 },
      { name: "Bio & Healthcare", score: 45, band: [40, 50], tier: 4 },
      { name: "Public Institutions & Other Fields", score: 41, band: [36, 46], tier: 4 },
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
        why: "Chosen by fit, not by brand recognition",
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
    label: "Who it is for",
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
    label: "Whose problem this is",
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
    label: "What it reads",
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
    label: "Why this assessment",
    heading: "“You are collaborative” does not tell a student where to apply",
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
    label: "The eleven sections",
    heading: "What the report contains",
    lead: [
      "PCA runs diagnosis → strengths → application → strategy → execution.",
      "Open a section to see how the report is built.",
    ],
    more: "continues in the report",
    disclaimer:
      "※ A worked example for a mechanical engineering student, shown to illustrate how the report is built. It contains no real respondent's personal data.",
    jobAxes: [
      "Simulation & CAE",
      "Mechanical design",
      "Process engineering",
      "Quality & reliability",
      "Robotics & automation",
      "Semiconductor equipment",
    ],
    jobScores: [80, 73, 60, 65, 67, 61],
    styleAxes: [
      "Independent",
      "Collaborative",
      "Challenging",
      "Stable",
      "Speed-oriented",
      "Quality-oriented",
    ],
    styleScores: [84, 78, 86, 66, 72, 91],
    tabs: [
      {
        no: "00-1",
        nav: "Job area analysis",
        title: "Job area analysis",
        chart: "jobs",
        meta: [
          { label: "Highest area", value: "Simulation & CAE" },
          { label: "Score", value: "80" },
          { label: "Respondent", value: "■■■" },
        ],
        chartNote: "Across the ten job areas, the top group holds Simulation & CAE with two others.",
        capTitle: "Job area analysis",
        capBody: "Ten mechanical engineering job areas, scored out of 100 and grouped where the intervals overlap.",
        capArrow: "Answers “which role does this major lead to?” with data",
      },
      {
        no: "00-2",
        nav: "Work style analysis",
        title: "Work style analysis",
        chart: "styles",
        meta: [
          { label: "Highest work style", value: "Quality-oriented" },
          { label: "Score", value: "91" },
          { label: "Combination", value: "Quality-oriented + Challenging + Independent" },
        ],
        chartNote: "Representative combination: Quality-oriented + Challenging + Independent",
        capTitle: "Work style analysis",
        capBody: "Six work styles scored, and the representative combination drawn out.",
        capArrow: "Shows the way of working that fits",
      },
      {
        no: "01",
        nav: "Core summary",
        title: "Section 1. Core diagnostic summary",
        blocks: [
          {
            sub: "SUBSECTION 1-1",
            title: "The highest area",
            body: [
              "The highest area in this result is Simulation & CAE, at 80. This is the field that works out how a part or structure behaves under load, vibration, heat and flow before anything is built, and turns that into grounds for changing the design.",
              "Mechanics of materials, dynamics, heat transfer, fluid mechanics and finite element analysis are used directly here. The result does not fix a single role; it says that analysis and design-verification roles are the ones to examine first.",
            ],
          },
          {
            sub: "SUBSECTION 1-2",
            title: "Group summary",
            body: [
              "The report groups rather than ranks. In a 500-respondent simulation the gap between first and second was a median 3.7 points while the measurement error was 7.3 — when the error is larger than the gap, that rank is precision the instrument does not have. Areas whose intervals overlap form one group, and the report makes no claim about the order inside it.",
            ],
            table: {
              head: ["Group", "Area", "Score (interval)", "How the report uses it"],
              rows: [
                ["Group 1", "Simulation & CAE", "80 (75–85)", "No order claimed inside the group"],
                ["Group 1", "Aerospace & defence R&D", "76 (71–81)", "No order claimed inside the group"],
                ["Group 1", "Mechanical design", "73 (68–78)", "No order claimed inside the group"],
                ["Group 2", "Automotive & electrification R&D", "62 (57–67)", "Interval clears group 1"],
              ],
            },
          },
        ],
        capTitle: "Core diagnostic summary",
        capBody: "The top group with its intervals, plus work style, in one place.",
        capArrow: "The reference point for everything after",
      },
      {
        no: "02",
        nav: "Strength profile",
        title: "Section 2. Strength profile",
        blocks: [
          {
            sub: "SUBSECTION 2-1",
            title: "Three representative strengths",
            bullets: [
              "1. Turning a physical situation into a solvable problem — translating a real part into boundary conditions, loads and material properties.",
              "2. Distrusting a number until it is checked — testing mesh dependence, convergence and the gap against measured data before believing a result.",
              "3. Carrying analysis through to a design change — not stopping at “the stress is high”, but proposing geometry, thickness, material and joint alternatives.",
            ],
          },
          {
            sub: "SUBSECTION 2-2",
            title: "First strength: turning a physical situation into a solvable problem",
            body: [
              "Analysis does not begin with knowing the software. Most of the answer is decided by which loads actually apply, what counts as fixed, and which material data is used. The same part can differ by several times in stress if the boundary conditions are set wrongly.",
              "In applications, “I have used ANSYS” carries less than being able to say why those boundary conditions were chosen, and how the answer would change if that assumption were wrong.",
            ],
          },
        ],
        capTitle: "Strength profile",
        capBody: "Three strengths and how to use them in applications.",
        capArrow: "Straight into the cover letter and interview",
      },
      {
        no: "03",
        nav: "The work itself",
        title: "Section 3. What the work looks like",
        blocks: [
          {
            sub: "SUBSECTION 3-1",
            title: "Scenario 1: vibration durability of an EV battery pack housing",
            fields: [{ label: "Linked area", value: "Simulation & CAE" }],
          },
          {
            title: "The situation",
            body: [
              "You are placed in the analysis team of an automotive supplier. A new battery pack housing has raised concern about weld cracking under road vibration, and the vehicle test is two months away. Your lead asks you to identify the risk locations before the test.",
              "The output is an analysis report covering load conditions, the finite element model, a fatigue life assessment and a proposed design change.",
            ],
          },
          {
            title: "What is asked of you",
            body: [
              "Convert real driving conditions into a load history that can be analysed, assess the fatigue life of the welds, and propose a change the design team can act on directly.",
            ],
          },
          {
            title: "The capability required",
            bullets: [
              "1. Finite element modelling: choosing element size and shape where stress concentrates, so the result is not driven by the mesh.",
              "2. Fatigue and material data: applying S-N curves and mean-stress correction to put a number on life under repeated load.",
              "3. Test correlation: explaining the gap between accelerometer measurements and the model, and justifying how the model is corrected.",
            ],
          },
        ],
        capTitle: "What the work looks like",
        capBody: "A real scenario in the area, and the capability it demands.",
        capArrow: "Fit tested before committing",
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
              "Simulation & CAE is the field that checks by calculation before anything is built. Building and fixing prototypes repeatedly does not survive cost or schedule, so most manufacturers screen candidate designs by analysis first.",
              "The portfolio to aim for shows the analysis conditions, the modelling judgement, the verification, and what changed in the design as a result.",
            ],
          },
          {
            sub: "SUBSECTION 4-2",
            title: "Roles the area connects to",
            body: [
              "Every role here shares one thing: a calculation changes a design decision. Rather than fixing on one, compare the duties, the kind of analysis and the tools named in job postings.",
            ],
            table: {
              head: ["No.", "Role", "What the work is", "Experience to prepare"],
              rows: [
                [
                  "1",
                  "Structural analysis engineer",
                  "Calculates strength, stiffness and fatigue life to justify design changes.",
                  "Mechanics of materials, an FEA project, comparison against test data",
                ],
                [
                  "2",
                  "Thermal / flow analysis engineer",
                  "Calculates cooling performance, pressure loss and temperature distribution to fix flow paths.",
                  "Heat transfer and fluid mechanics, a CFD project, measured comparison",
                ],
                [
                  "3",
                  "NVH engineer",
                  "Finds the source of vibration and noise through modal analysis and revises the structure.",
                  "Dynamics, modal analysis, accelerometer measurement",
                ],
                [
                  "4",
                  "Mechanical design engineer",
                  "Takes the analysis result and fixes geometry, tolerance and joints into drawings.",
                  "CAD modelling, machine element design, tolerance stack-up",
                ],
              ],
            },
          },
        ],
        capTitle: "Roles and direction",
        capBody: "Connected roles, what to examine first, and how to choose.",
        capArrow: "Roles grouped, not just listed",
      },
      {
        no: "05",
        nav: "Projects",
        title: "Section 5. Projects and portfolio",
        blocks: [
          {
            sub: "SUBSECTION 5-1",
            title: "Why a project is needed",
            body: [
              "Analysis work is comparatively easy to show. What matters is not the tool but which assumptions were made, what they were checked against, and how the result changed the design. A colour plot with no verification is not evidence.",
            ],
          },
          {
            sub: "SUBSECTION 5-2",
            title: "Project directions from the area",
            body: [
              "A project does not end at “the analysis ran”. What counts is how it connects to the verification flow of the company being applied to.",
            ],
            table: {
              head: ["Direction", "Why it fits", "What to use", "Output"],
              rows: [
                [
                  "Structural analysis of a capstone part, with test verification",
                  "Explaining the gap between calculated and measured values is the same work as industrial correlation.",
                  "The capstone part, a universal testing machine or strain gauges, a free FEA tool",
                  "Analysis-to-test comparison report",
                ],
                [
                  "Thermal and flow analysis of a cooling structure",
                  "Electrification keeps raising demand for cooling design.",
                  "Open-source CFD, thermocouple measurement, component heat specifications",
                  "Comparison of three flow-path alternatives",
                ],
              ],
            },
          },
        ],
        capTitle: "Projects and portfolio",
        capBody: "Directions, worked examples and a four-week plan.",
        capArrow: "A portfolio to start this week",
      },
      {
        no: "06",
        nav: "Applications",
        title: "Section 6. Cover letter and interview",
        blocks: [
          {
            sub: "SUBSECTION 6-1",
            title: "How to write",
          },
          {
            title: "1. Connecting coursework to the work",
            body: [
              "Mechanics of materials, dynamics, heat transfer and fluid mechanics carry straight into structural analysis, thermal and flow analysis, NVH and reliability verification. Coursework persuades as evidence of “what I calculated, under which conditions”, not as a claim of interest.",
            ],
          },
          {
            title: "2. Showing a project as capability",
            body: [
              "Rather than naming the software, write the grounds for the load conditions, how the mesh was decided, how the result was verified, and what changed in the design. The most frequent interview questions come from exactly these points.",
            ],
          },
        ],
        capTitle: "Cover letter and interview",
        capBody: "How to write, and how to structure likely questions.",
        capArrow: "Example sentences and expected questions",
      },
      {
        no: "07",
        nav: "Technical venture",
        title: "Section 7. Starting a technical venture",
        blocks: [
          {
            sub: "SUBSECTION 7-1",
            title: "The direction this area suggests",
            body: [
              "Analysis is one of the few engineering capabilities that can be sold without equipment. Smaller manufacturers know they need it but cannot carry the staff and licences, so there is steady demand for work taken job by job. Validating that demand in small pieces is more realistic than building a product first.",
            ],
          },
          {
            sub: "SUBSECTION 7-2",
            title: "A worked example",
            fields: [
              { label: "Venture idea 1", value: "Structural verification service for small manufacturers" },
            ],
            body: [
              "What it is — a job-by-job analysis service that takes drawings and load conditions and returns a strength and fatigue review.",
              "The problem it solves — smaller manufacturers need grounds for a design change but cannot keep analysis staff and licences on hand.",
              "Who buys it — small manufacturers and design offices in automotive parts, industrial machinery, tooling and construction equipment.",
            ],
          },
        ],
        capTitle: "Starting a technical venture",
        capBody: "Venture ideas from the major, and how to enter.",
        capArrow: "A route other than employment",
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
              "A clear tendency to move a physical situation into a model and decide by calculation, which reads across to simulation and CAE roles.",
              "Quality-oriented came out highest among the work styles — consistent with work that keeps verifying results and re-examining conditions.",
            ],
          },
          {
            sub: "SUBSECTION 8-2",
            title: "Roles to examine first",
            bullets: [
              "Structural analysis, thermal and flow analysis, NVH, reliability verification and mechanical design.",
              "Compare the kind of analysis and the verification each posting asks for, rather than fixing on one immediately.",
            ],
          },
          {
            sub: "SUBSECTION 8-3",
            title: "The project to start first",
            bullets: [
              "Structural analysis of a capstone part with test verification produces an output that carries an analysis-to-measurement comparison.",
              "Present it as a report showing the grounds for the load conditions, the verification method, and the design conclusion.",
            ],
          },
          {
            sub: "SUBSECTION 8-4",
            title: "What to carry into applications and interviews",
            bullets: [
              "Coursework, analysis assignments and test experience together evidence the ability to set an assumption and then check it.",
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
    label: "Six work styles",
    heading: "Two students can score 80 and work nothing alike",
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
    label: "What it rests on",
    heading: "The items were worked backwards from job postings",
    lead:
      "We read 428 job postings and 137 job descriptions first, to see what each role is actually asked to do, then put that to 2,346 graduates in the field to check it against the work. The traits did not come first with occupations attached afterwards.",
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
    label: "After the assessment",
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
    label: "Why METRI",
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
    label: "Who builds it",
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
    label: "Programme",
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
    label: "Localisation",
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
    label: "Partnership",
    heading: "What the first year looks like",
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
    label: "Questions we get",
    heading: "What institutions ask first",
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
        a: "An anonymised aggregate report covering the cohort's distribution across job areas and work styles — usable as evidence of graduate outcomes. An administrator area covering every engineering department is on the way.",
      },
      {
        q: "Is it validated?",
        a: "It was built from a 2,346-student sample together with 428 job postings, 137 job descriptions and 62 NCS references. Area definitions and interpretation criteria reference NCS, the O*NET lineage, RIASEC, NACE, OECD frameworks and AERA/APA/NCME measurement standards. The core items are registered with the Korea Copyright Commission.",
      },
    ],
  },

  pricing: {
    label: "Pricing",
    heading: "₩29,000 for one, cohort pricing for a department",
    lead:
      "Individuals buy one at a time. Departments contract by cohort size. Most institutions run one department first and widen from there — a single year group is enough to see what the reports change.",
    planLabel: "What you are interested in",
    plans: [
      {
        key: "individual",
        name: "Individual",
        who: "A student, a job seeker, a would-be founder",
        price: "₩29,000",
        unit: "per person",
        note: "Billed in Korean won; overseas Visa and Mastercard are accepted. Card payment opens once the merchant review clears — until then requests come through the form.",
        features: [
          "Ten job areas out of 100 · groups and intervals",
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
    label: "Countries",
    heading: "Open the site for your country",
    lead:
      "Each country runs its own site in its own language, against its own labour-market data. The platform students sit on is one, worldwide.",
    liveLabel: "Open",
    soonLabel: "In preparation",
    note:
      "No country site is open yet — the domains below are reserved names, not live addresses. The assessment itself runs; what is pending is the domain and the local rollout. If your country is not listed, talk to us — that is how one starts.",
    items: [
      { code: "KR", name: "Korea", native: "한국", domain: "metri.co.kr", href: "https://metri.co.kr", live: false },
      { code: "DE", name: "Germany", native: "Deutschland", domain: "metri.de", href: "https://metri.de", live: false },
      { code: "US", name: "United States", native: "United States", domain: "metri.us", href: "https://metri.us", live: false },
      { code: "JP", name: "Japan", native: "日本", domain: "metri.jp", href: "https://metri.jp", live: false },
      { code: "CN", name: "China", native: "中国", domain: "metri.cn", href: "https://metri.cn", live: false },
      { code: "TR", name: "Türkiye", native: "Türkiye", domain: "metri.com.tr", href: "https://metri.com.tr", live: false },
      { code: "KZ", name: "Kazakhstan", native: "Қазақстан", domain: "metri.kz", href: "#contact", live: false },
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

  chrome: {
    glanceLabel: "At a glance",
    glanceHeading: "One sitting, carried through to execution",
    flow: ["Sitting", "Ten job areas", "Six work styles", "Execution plan", "Report"],
    seeSheet: "See the result sheet",
    photosHome: [
      "Photo — employment lecture",
      "Photo — STEM mentoring session",
      "Photo — career fair",
    ],
    photosAbout: [
      "Photo — university event",
      "Photo — invited speaker",
      "Photo — the team",
    ],
    photoCohort: "Photo — a department sitting the assessment",
    deeperLabel: "Go deeper",
    deeperHeading: "Start where it matters to you",
    nextLabel: "Next",
    nextSheetToAdopt: "What would this look like at your institution?",
    nextDiagnosis: "The diagnosis",
    nextContact: "Talk to us",
    policy: {
      termsLabel: "Terms of service",
      termsTitle: "Terms of service",
      termsLead: "What we do, what we do not do, and what a credit and a report actually are.",
      privacyLabel: "Privacy policy",
      privacyTitle: "How we handle personal data",
      privacyLead: "What we collect, how long we keep it, and how it is destroyed.",
      refundLabel: "Refund policy",
      refundTitle: "When we refund",
      refundLead: "Before a sitting and after a sitting are different. The boundary comes first.",
      updated: "Updated 2026-09-11",
      reviewNote: "These terms are not legal advice. Have counsel review them before publishing.",
    },
  },

  footer: {
    note: "PCA · developed by ACADEMIX",
    sitesLabel: "Countries",
    sites: [
      { label: "Global (English)", href: "https://metri.io", ready: false },
      { label: "한국", href: "https://metri.co.kr", ready: false },
      { label: "Қазақстан", href: "https://metri.kz", ready: false },
      { label: "Türkiye", href: "https://metri.com.tr", ready: false },
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
