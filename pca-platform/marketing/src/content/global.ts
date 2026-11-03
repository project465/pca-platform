import { PLATFORM_URL, HOME_DOMAIN } from "@/lib/domains";
import type { SiteContent } from "./model";

/**
 * Global (English) edition (2026-10-21).
 *
 * Same structure as the Korean site, with two honest differences:
 *
 * - The global market only exposes four STEM cores (`content/markets.json` +
 *   `major-cores.json`): Mechanical, Electrical and Electronic, Computer
 *   Science and Software, Biotechnology.
 * - The current assessment and report are written in Korean. We say so
 *   instead of implying an English report.
 *
 * The AI career assistant (Track) is sold in Korea only, so this edition has
 * no `assistant` block and the page is not linked.
 */
export const global: SiteContent = {
  key: "global",
  lang: "en",
  domain: HOME_DOMAIN,
  brand: "CareerMatri",
  platformUrl: PLATFORM_URL,

  meta: {
    title: "CareerMatri | Major-based career diagnosis and workspace",
    description:
      "A major-specific diagnostic, a written report, and a personal workspace where students keep adding experience and see what to do next. Universities can adopt it department by department.",
    ogAlt: "CareerMatri major-based career diagnosis",
  },

  ui: {
    skip: "Skip to content",
    menu: "Open menu",
    close: "Close menu",
    mockTag: "Example screen",
    copy: "Copy",
    copied: "Copied",
    external: "Opens the CareerMatri app",
    langLabel: "Language",
  },

  nav: {
    items: [
      { label: "How it works", href: "/#how" },
      { label: "Universities", href: "/universities" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
    ],
    staffLogin: { label: "University staff sign in", href: "/login" },
    login: { label: "Sign in", href: "/login" },
    start: { label: "Start the assessment", href: "/cores" },
    startShort: "Start",
  },

  home: {
    hero: {
      eyebrow: "Major-based diagnosis · Report · Workspace",
      title: ["See where the work you did", "in your major can take you"],
      lead:
        "CareerMatri asks what you have actually done in classes, assignments and projects, and what you decided yourself. You get a report, then keep going in your own workspace: add experience, refresh your current state and pick the next task.",
      primary: { label: "Start the assessment", href: "/cores" },
      secondary: { label: "Talk to us about adoption", href: "/contact" },
      note: "Got an ID from your university?",
      noteLink: { label: "Sign in to start", href: "/login" },
    },
    mock: {
      label: "Example screen",
      brandSub: "Mechanical Eng.",
      nav: ["Home", "Assessment", "Next task", "Current state", "Experience", "Results"],
      title: "My career",
      meta: "Mechanical Engineering · Updated 2026-10-18",
      todoLabel: "Next task",
      todoTitle: "Write up one experience on a single page",
      todoBody: "One line on the criteria you set yourself is something you can use straight away in an interview.",
      todoCta: "Write it up",
      todoMore: "2 more tasks",
      stateLabel: "Current state",
      stateSub: "Areas you can explain right now",
      tiles: [
        { name: "Structures", sub: "Model · analysis report" },
        { name: "Materials", sub: "Test report · spec" },
        { name: "Testing", sub: "Test plan · results" },
      ],
      changeLabel: "Recent changes",
      changes: [
        { text: "Design: the conditions and criteria you set yourself were confirmed", date: "10-18" },
        { text: "A new experience added evidence to Testing", date: "10-05" },
      ],
    },
    how: {
      label: "How it works",
      title: "Start with the assessment, keep going in the workspace",
      lead:
        "The assessment is a starting point. After the report, every experience you add updates your current state and changes what you should do next.",
      steps: [
        {
          no: "01",
          title: "Major-based assessment",
          body: "Pick your major and answer what you did in classes, assignments and projects, and what you decided yourself.",
          points: [
            "Each major has its own questions, written around the work of that field",
            "Answers are saved as you go, so you can close the page and come back",
            "No aptitude or personality-type questions",
          ],
        },
        {
          no: "02",
          title: "Report (web and PDF)",
          body: "One document with the experience you can explain, what is still missing and what to do next.",
          points: [
            "Read it on the web or download it as a PDF",
            "Shows which industries and roles your confirmed experience connects to",
            "Collects material you can turn into application and interview answers",
          ],
        },
        {
          no: "03",
          title: "Your CareerMatri workspace",
          body: "Add experience and your current state is recalculated, with a new next task.",
          points: [
            "Add experience, refresh your state, then take the next task",
            "The report from the day you took the test is kept unchanged",
            "Sign in any time to reopen your report",
          ],
        },
      ],
    },
    report: {
      label: "The report",
      title: "What the report covers",
      lead:
        "The report is built only from your answers, in an order you can follow: what was confirmed, what is still missing and what to do about it.",
      items: [
        { title: "Summary", body: "Confirmed experience, the area to look at first and your next task, on the first screen." },
        { title: "Evidence you already have", body: "What you did, what you decided and what you produced, laid out together." },
        { title: "What to fill in", body: "Gaps by area, with a short note on why each one matters." },
        { title: "Industries and roles", body: "Where your confirmed experience is used in industry and in specific roles." },
        { title: "Next tasks", body: "Concrete tasks to write up next and the output each one should leave behind." },
        { title: "Application wording", body: "A starting structure for application and interview answers, based on what you chose." },
      ],
      note: "The report does not estimate aptitude or hiring chances, and it does not rank you. Depth varies by tier.",
      mock: {
        label: "Example report",
        school: "Career report",
        docTitle: "Business Administration",
        docMeta: "PRO · answered 2026-10-16",
        headline: "You have experience in strategy and planning you can use in applications",
        headlineSub: "Both what you did and what you decided yourself were confirmed.",
        cells: [
          { label: "Confirmed", title: "Strategy · Marketing", body: "Chose one option out of several with reasons, and split a budget by item." },
          { label: "Next task", title: "Write down what you decided", body: "Note in three lines how you turned the request into conditions." },
          { label: "Evidence", title: "Goals and metrics table", body: "Material you can bring into an application." },
          { label: "To fill in", title: "Data and decisions", body: "The criteria you set and what you produced are not written yet." },
        ],
      },
    },
    majors: {
      label: "Majors",
      title: "20 major assessments, run through university and institution contracts",
      lead:
        "Each core is written around the real tasks and decisions of its field. Department names differ between universities, so each department is linked to the closest core.",
      groups: [
        { name: "Engineering", items: ["Mechanical Engineering", "Electrical and Electronic Engineering", "Computer Science and Software", "Architecture and Interior Architecture", "Civil and Railway Engineering"] },
        { name: "Life and health", items: ["Biotechnology", "Nursing", "Health Administration and Welfare", "Food Science", "Sports Science and Rehabilitation", "Horticulture, Forestry and Landscape"] },
        { name: "Business and society", items: ["Business Administration", "Public Administration", "Law and Police Studies", "Psychology", "Education"] },
        { name: "Humanities and arts", items: ["Language and Literature", "Media, Communications and Performing Arts", "Visual Design", "Fashion, Beauty and Styling"] },
      ],
      note:
        "Which majors are open depends on the contract. The assessment and report are currently written in Korean. Outside Korea, four majors are set up first: Mechanical, Electrical and Electronic, Computer Science and Software, and Biotechnology.",
      cta: { label: "Find your major and start", href: "/cores" },
    },
    campus: {
      label: "Universities",
      title: "Open the assessment by department and follow progress on one screen",
      lead:
        "Staff issue student accounts and see progress and department totals. Students sign in through their university's own address and get the same assessment and report.",
      points: [
        { title: "Assessment per department", body: "Each contracted department gets the assessment for its major." },
        { title: "Student accounts", body: "Issue IDs and passwords one by one or in bulk from a CSV file." },
        { title: "Progress and department totals", body: "Started and completed counts per department. Cells under five people stay hidden." },
        { title: "CSV export", body: "Download the roster and progress as CSV for internal reporting." },
      ],
      primary: { label: "For universities", href: "/universities" },
      secondary: { label: "Contact us", href: "/contact" },
    },
    personal: {
      label: "Individuals",
      title: "No university account? You can still sign up",
      lead:
        "Individuals can sign up directly. Prices and what is on sale right now are listed on the pricing page inside the CareerMatri app.",
      cards: [
        {
          tag: "Assessment and report",
          title: "Major-based assessment",
          body: "When you finish, you get a web report and a PDF, and your CareerMatri workspace opens.",
          points: [
            "Prices and tier differences are on the app's pricing page",
            "Refundable until you answer the first question",
          ],
          cta: { label: "See pricing", href: "/pricing" },
        },
        {
          tag: "University account",
          title: "Got an ID from your university?",
          body: "Sign in with the ID and password your university gave you. Your department's assessment is ready for you.",
          points: [
            "No payment needed for university accounts",
            "Your report and workspace stay in your account",
          ],
          cta: { label: "Sign in", href: "/login" },
        },
      ],
    },
    faq: {
      label: "FAQ",
      title: "Questions people ask before starting",
      items: [
        {
          q: "My university gave me an ID. Where do I sign in?",
          a: "Use your university's own address, or the CareerMatri sign-in page, with the ID and password you were given.",
          link: { label: "Open sign-in", href: "/login" },
        },
        {
          q: "Is it available in English?",
          a: "The assessment and report are currently written in Korean. For enquiries from outside Korea, please contact us.",
          link: { label: "Contact us", href: "/contact" },
        },
        {
          q: "If I close the page halfway, do I start again?",
          a: "No. Each answer is saved straight away, and you continue where you stopped.",
        },
        {
          q: "Will it tell me my chances of being hired, or rank me?",
          a: "No. It shows the experience your answers confirm, what is still missing and what to do next.",
        },
        {
          q: "Is the assessment validated?",
          a: "Pilot studies and cognitive interviews are still in progress, so we do not call it a validated test. Please use the report as one input to your decisions.",
        },
      ],
    },
    closing: {
      title: "Start your first assessment in your major",
      lead: "Sign in with your university account, or sign up as an individual.",
      primary: { label: "Start the assessment", href: "/cores" },
      secondary: { label: "Contact us", href: "/contact" },
    },
  },

  universities: {
    meta: {
      title: "For universities | CareerMatri",
      description:
        "Run a major-based career diagnosis with university accounts. Issue student accounts, follow progress, see department totals and export CSV from the staff screen.",
    },
    hero: {
      eyebrow: "Universities and institutions",
      title: ["Run a major-based diagnosis", "with your university accounts"],
      lead:
        "Staff issue student accounts and students sign in through the university's own address. Progress and department totals are on the staff screen and can be downloaded as CSV.",
      primary: { label: "Talk to us", href: "/contact" },
      secondary: { label: "University staff sign in", href: "/login" },
    },
    mock: {
      label: "Example screen · fictional university and numbers",
      title: "Assessment overview",
      meta: "Fall semester 2026",
      kpis: [
        { label: "Students", value: "128", note: "From the uploaded roster" },
        { label: "Started", value: "96", note: "Began the assessment" },
        { label: "Completed", value: "71", note: "Received a report" },
      ],
      tableTitle: "Progress by department",
      head: ["Department", "Students", "Started", "Done"],
      rows: [
        ["Business", "42", "35", "28"],
        ["Electrical Eng.", "38", "30", "24"],
        ["Nursing", "44", "31", "19"],
        ["Psychology", "Hidden", "Hidden", "Hidden"],
      ],
      hiddenNote: "Cells under five people are not shown",
      exportLabel: "Download CSV",
    },
    flow: {
      label: "How it runs",
      title: "Six steps from adoption to results",
      lead: "From issuing accounts to checking totals, everything happens on the staff screen. Nothing to install.",
      steps: [
        { title: "Choose departments", body: "Decide which departments take part and roughly how many students. Each department is linked to the closest major assessment." },
        { title: "Get a staff account", body: "We create the staff account for your university." },
        { title: "Issue student accounts", body: "Issue IDs and passwords one by one, or in bulk from a CSV file." },
        { title: "Students sign in", body: "Students use the university's own address, pick their department and take the assessment." },
        { title: "Follow progress", body: "See started and completed counts and department totals." },
        { title: "Export CSV", body: "Download the roster, progress and totals as CSV." },
      ],
    },
    features: {
      label: "Staff screen",
      title: "What staff can do themselves",
      items: [
        { title: "Add students", body: "Add one at a time or upload a CSV, with a preview before anything is saved." },
        { title: "Reset passwords", body: "Issue a new initial password to a student who lost theirs." },
        { title: "Pause and reopen accounts", body: "Pause accounts that are not in use and reopen them later." },
        { title: "Progress per student", body: "See who has not started, who is in progress and who is done." },
        { title: "Department totals", body: "Students, started and completed counts by college and department." },
        { title: "Not-started list", body: "Download only the students who have not started yet." },
        { title: "CSV export", body: "Roster, progress and totals for internal reporting." },
        { title: "Allow a retake", body: "One attempt is the default. Staff can allow a retake for a specific student." },
      ],
    },
    access: {
      label: "Student access",
      title: "Students sign in through your university's address",
      body: "Each university has its own address. Students choose their department there and sign in with the ID they were issued.",
      url: `${PLATFORM_URL.replace(/^https?:\/\//, "")}/campus/your-code`,
      urlNote: "The university code is set during onboarding.",
      login: { label: "See the student sign-in page", href: "/login" },
    },
    privacy: {
      label: "Privacy",
      title: "What staff can and cannot see",
      items: [
        "Individual answers and reports do not appear on the staff screen.",
        "Totals hide any cell with fewer than five people.",
        "CSV files hold the roster, progress and totals, not item-level answers.",
        "Initial passwords are shown once when issued and are not stored.",
      ],
    },
    faq: {
      label: "FAQ",
      title: "Questions universities ask",
      items: [
        { q: "Does each department get a different assessment?", a: "Yes. Students take the major assessment their department is linked to, with examples suited to their department." },
        { q: "What do we need to prepare?", a: "The departments, a rough headcount and a staff contact. The student roster is uploaded later on the staff screen." },
        { q: "Is the assessment available in English?", a: "Not yet. The assessment and report are currently written in Korean." },
        { q: "How is pricing set?", a: "By departments and headcount. Contact us and we will explain how it would work for your university.", link: { label: "Contact us", href: "/contact" } },
      ],
    },
    closing: {
      title: "We will walk you through how it fits your university",
      lead: "Tell us your university, departments and rough headcount, and we will reply after reviewing them.",
      primary: { label: "Contact us", href: "/contact" },
      secondary: { label: "University staff sign in", href: "/login" },
    },
  },

  contact: {
    meta: {
      title: "Contact | CareerMatri",
      description: "Questions about adoption or use. Email hari_info@hari.re.kr, phone +82 44-867-7211.",
    },
    eyebrow: "Contact",
    title: "Talk to us about adoption or use",
    lead: "We take enquiries about university adoption, individual use and partnerships by email and phone. You can draft your message below and send it from your mail app.",
    direct: {
      title: "Reach us directly",
      emailLabel: "Email",
      telLabel: "Phone (Korea)",
      hoursNote: "If calling is difficult, please email. We reply after reviewing your message.",
    },
    company: { title: "Company" },
    form: {
      title: "Draft your email",
      lead: "Fill in the fields and press the button. Your mail app opens with the message filled in.",
      honest: "This page does not store or send anything for you. The message is sent only when you press send in your mail app.",
      fields: {
        org: "Organisation",
        orgHint: "e.g. University careers office",
        name: "Your name",
        nameHint: "",
        reply: "Reply to",
        replyHint: "Email or phone",
        type: "Topic",
        size: "Expected headcount",
        sizeHint: "e.g. 3 departments, about 300 students",
        message: "Message",
        messageHint: "Timing, questions, anything we should know.",
      },
      types: ["University adoption", "Department adoption", "Individual use", "Partnership or other"],
      subject: "[CareerMatri enquiry]",
      bodyIntro: "Enquiry drafted on the CareerMatri website.",
      send: "Open in my mail app",
      copy: "Copy message",
      opened: "Your mail app should now be open. Press send there to deliver it. If nothing opened, copy the message and email it to the address above.",
      copiedAll: "Message copied. Paste it into your email and send it to the address above.",
      needOrg: "Please fill in at least the message or your organisation.",
    },
    after: {
      title: "What happens next",
      items: [
        "We review your message and reply to the contact you gave.",
        "Universities get an outline of how adoption would work for their departments.",
        "Individual questions are answered after checking your account or payment.",
      ],
    },
    others: {
      title: "Looking for something else?",
      items: [
        { label: "University staff sign in", href: "/login" },
        { label: "Support (orders, refunds, password)", href: "/support" },
        { label: "Terms of service", href: "/legal/terms" },
        { label: "Privacy policy", href: "/legal/privacy" },
      ],
    },
  },

  notFound: {
    title: "Page not found",
    body: "This address has changed or no longer exists. Head back home or start the assessment.",
    home: { label: "Back to home", href: "/" },
    start: { label: "Start the assessment", href: "/cores" },
  },

  legal: {
    company: "주식회사 에이치에이연구원",
    ceo: "조건희, 한정인",
    address: "704, 2143 Hannuri-daero, Sejong-si, Republic of Korea",
    tel: "+82 44-867-7211",
    email: "hari_info@hari.re.kr",
    bizNo: "375-88-02588",
    mailOrderNo: "",
    jobInfoNo: "J1700020220007",
    privacyOfficer: "조건희, 한정인",
    labels: {
      heading: "Business information",
      company: "Company",
      ceo: "Representatives",
      address: "Address",
      tel: "Phone",
      email: "Email",
      bizNo: "Business registration no.",
      mailOrderNo: "Mail-order business no.",
      jobInfoNo: "Job information business no.",
      privacyOfficer: "Privacy officer",
      unset: "Pending",
    },
  },

  footer: {
    tagline: "Major-based career diagnosis and workspace",
    columns: [
      {
        title: "Product",
        links: [
          { label: "How it works", href: "/#how" },
          { label: "Majors", href: "/#majors" },
          { label: "Universities", href: "/universities" },
          { label: "Pricing", href: "/pricing" },
        ],
      },
      {
        title: "Go to",
        links: [
          { label: "Start the assessment", href: "/cores" },
          { label: "Sign in", href: "/login" },
          { label: "University staff sign in", href: "/login" },
          { label: "Contact", href: "/contact" },
          { label: "Support", href: "/support" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Terms of service", href: "/legal/terms" },
          { label: "Privacy policy", href: "/legal/privacy" },
          { label: "Refund policy", href: "/legal/refund" },
        ],
      },
    ],
    copyright: "© 2026 주식회사 에이치에이연구원 · CareerMatri",
  },
};
