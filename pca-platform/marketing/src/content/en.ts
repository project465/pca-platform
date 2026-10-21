import { PLATFORM_URL, HOME_DOMAIN } from "@/lib/domains";
import { TRACK_KR, krw } from "@/lib/prices";
import type { SiteContent } from "./model";

/**
 * English edition of the Korean site copy (`kr.ts`, 2026-10-21).
 *
 * Same structure and claims as the Korean copy. Prices come from
 * `lib/prices.ts` only. Sample texts in `home.global.samples` and the legal
 * registry values are kept exactly as in `kr.ts`.
 */
export const en: SiteContent = {
  key: "kr",
  lang: "en",
  domain: HOME_DOMAIN,
  brand: "CareerMatri",
  platformUrl: PLATFORM_URL,

  meta: {
    title: "CareerMatri | Major-based career assessment and career workspace",
    description:
      "A major-based assessment shows what you have already done in your field. Your report and your CareerMatri workspace then take you to the next step. Universities and institutions can adopt it by department.",
    ogAlt: "CareerMatri major-based career assessment",
  },

  ui: {
    skip: "Skip to main content",
    menu: "Open menu",
    close: "Close menu",
    mockTag: "Screen example",
    copy: "Copy",
    copied: "Copied",
    external: "Opens the CareerMatri app",
    langLabel: "Language",
  },

  nav: {
    items: [
      { label: "How it works", href: "/#how" },
      { label: "Universities", href: "/universities" },
      { label: "AI career assistant", href: "/assistant" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
    ],
    staffLogin: { label: "School staff login", href: "/login" },
    login: { label: "Log in", href: "/login" },
    start: { label: "Start the assessment", href: "/cores" },
    startShort: "Start",
  },

  home: {
    hero: {
      eyebrow: "Major-based assessment · Report · Career workspace",
      title: ["See where the work you've done", "in your major can lead"],
      lead:
        "CareerMatri's major-based assessment looks at what you have done in classes, assignments and projects, and at the decisions you made yourself. After you receive your report, you keep adding experiences in your workspace and move on to your next step.",
      primary: { label: "Start the assessment", href: "/cores" },
      secondary: { label: "Inquire for your institution", href: "/contact" },
      note: "Did your school give you an ID?",
      noteLink: { label: "Log in and start", href: "/login" },
    },
    mock: {
      label: "Screen example",
      brandSub: "Mechanical Engineering",
      nav: ["Home", "Assessment", "Next step", "Current status", "Experiences", "Past results"],
      title: "My career",
      meta: "Mechanical Engineering · Last updated 2026-10-18",
      todoLabel: "Next step",
      todoTitle: "Write up one experience on a single page",
      todoBody: "Write down the criterion you set yourself in one line, and you can use it as is in an interview.",
      todoCta: "Write it up now",
      todoMore: "2 more tasks",
      stateLabel: "Current status",
      stateSub: "Main areas you can explain right now",
      tiles: [
        { name: "Structural and durability analysis", sub: "Analysis model · Analysis report" },
        { name: "Materials, strength and failure", sub: "Analysis notes · Material specs" },
        { name: "Testing and measurement", sub: "Test plan · Test report" },
      ],
      changeLabel: "Recent changes",
      changes: [
        { text: "Conditions and criteria you set yourself in product design were confirmed", date: "10-18" },
        { text: "A new experience added evidence in testing and measurement", date: "10-05" },
      ],
    },
    how: {
      label: "How it works",
      title: "Start with the assessment, then keep going in your workspace",
      lead:
        "It is not a one-time test. After you receive your report, every experience you add updates your current status and your next step.",
      steps: [
        {
          no: "01",
          title: "Major-based assessment",
          body: "Choose your major and answer questions about what you did in classes, assignments and projects, and what you decided yourself.",
          points: [
            "Each major has its own questions, written around the real work of that field",
            "Answers are saved as you go, so you can close the page and pick up later",
            "It does not ask about aptitude or personality types",
          ],
        },
        {
          no: "02",
          title: "Report (web and PDF)",
          body: "You get one document that shows the experiences you can explain, what is still missing, and what to do next.",
          points: [
            "Read it on the web right away or download it as a PDF",
            "It shows which industries and roles your confirmed experiences connect to",
            "It gathers material for sentences you can use in applications and interviews",
          ],
        },
        {
          no: "03",
          title: "My CareerMatri workspace",
          body: "When you add an experience, your current status is recalculated and your next step changes.",
          points: [
            "Add an experience, update your current status, then see your next step",
            "Your original assessment result is stored separately and does not change",
            "Log in any time to open your report again",
          ],
        },
      ],
    },
    report: {
      label: "Report",
      title: "What the report includes",
      lead:
        "The report is built only from your answers. It is laid out in order so students can follow for themselves what was confirmed and what is still missing.",
      items: [
        { title: "Summary at a glance", body: "Confirmed experiences, the areas to look at first, and your next step, all on the first screen." },
        { title: "Evidence you already have", body: "What you did, what you decided yourself, and the work you produced, shown together." },
        { title: "What to fill in next", body: "Gaps listed by area, with a short note on why each one matters." },
        { title: "Industry and role links", body: "Where in industry and in which roles your confirmed experiences are used." },
        { title: "Next steps", body: "A concrete task to write up next, and what you should have in hand when you finish." },
        { title: "Application and interview drafts", body: "A basic outline for application sentences, built from the answers you chose." },
      ],
      note:
        "The report does not give aptitude labels, hiring predictions or rankings. The level of detail can differ by tier.",
      mock: {
        label: "Report example",
        school: "Career analysis report",
        docTitle: "Business Administration · General Management",
        docMeta: "PRO · Answered 2026-10-16",
        headline: "You have experience in strategy and planning you can use in applications",
        headlineSub: "What you did and what you decided yourself were both confirmed.",
        cells: [
          {
            label: "Confirmed experience",
            title: "Strategy and planning · Marketing and markets",
            body: "You chose one option out of several with clear reasons, and split a budget by line item.",
          },
          {
            label: "Next step",
            title: "Write down what you decided yourself",
            body: "Write three lines on the conditions you set when you reworked the request you received.",
          },
          { label: "Evidence you kept", title: "Goals and metrics table · Business plan", body: "You have material to bring into your applications." },
          { label: "Still to fill in", title: "Data and decision-making", body: "You have not yet written down the criteria you set or the work you produced." },
        ],
      },
    },
    majors: {
      label: "Majors",
      title: "Assessments for 20 majors, run through school and institution contracts",
      lead:
        "Each major's questions are built on the work and decisions people in that field actually make. Even when department names differ between schools, we connect each department to the closest major assessment.",
      groups: [
        { name: "Engineering and technology", items: ["Mechanical Engineering", "Electrical and Electronic Engineering", "Computer Science and Software", "Architecture and Interior Architecture", "Civil and Railway Engineering"] },
        { name: "Life sciences and health", items: ["Biotechnology and Life Sciences", "Nursing", "Health and Healthcare Welfare", "Food", "Sports and Exercise Rehabilitation", "Horticulture, Forestry and Landscape"] },
        { name: "Business and social sciences", items: ["Business", "Public Administration", "Law and Policing", "Psychology", "Education"] },
        { name: "Humanities and arts", items: ["Korean Language, Linguistics and Literature", "Media, Advertising, PR and Performance", "Visual Arts and Design", "Fashion, Beauty and Styling"] },
      ],
      note:
        "Which majors are open depends on the scope of each school or institution's contract. You can see the majors you can start now on the assessment start screen.",
      cta: { label: "Find your major and start", href: "/cores" },
    },
    global: {
      label: "International",
      title: "Also in use outside Korea",
      lead:
        "CareerMatri's assessment engine (PCA) has also been used outside Korea. Engineering roles call for the same judgments from country to country, so we use the same questions translated into each language.",
      legend: { done: "Completed", planned: "Planned" },
      countries: [
        { iso: "410", name: "South Korea", status: "done" },
        { iso: "792", name: "Türkiye", status: "done", schools: ["Ankara Social Sciences University (ASBU)"] },
        { iso: "276", name: "Germany", status: "done" },
        { iso: "840", name: "United States", status: "done" },
        { iso: "392", name: "Japan", status: "done" },
        { iso: "156", name: "China", status: "done" },
        { iso: "398", name: "Kazakhstan", status: "planned" },
        { iso: "250", name: "France", status: "planned" },
        { iso: "710", name: "South Africa", status: "planned" },
        { iso: "608", name: "Philippines", status: "planned" },
      ],
      source: "Based on the ACADEMIX PCA introduction materials. Work in planned countries has not started yet.",
      samples: {
        title: "Assessment and report in each language",
        lead:
          "Here is the same Mechanical Engineering question in five languages. English and Turkish are original items; Japanese, Chinese and Russian are translations.",
        items: [
          {
            lang: "English",
            code: "en",
            langKo: "English",
            status: "live",
            statusLabel: "Original items",
            question: {
              label: "Sample question",
              area: "Design & Development",
              text: "When I receive a design assignment, I tend to organize the component requirements on my own and set my own priorities before the team meeting.",
              scale: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
            },
            result: {
              label: "Sample result",
              areasLabel: "Areas to look at first",
              areas: ["Design & Development", "Robotics & Automation", "Automotive & Aerospace"],
              nextLabel: "Next step",
              next: "Pick one design project and write down one requirement you set yourself, and why.",
            },
          },
          {
            lang: "Türkçe",
            code: "tr",
            langKo: "Turkish",
            status: "live",
            statusLabel: "Turkish original items",
            question: {
              label: "Örnek soru",
              area: "Tasarım ve Geliştirme",
              text: "Bir tasarım görevi aldığımda ekip toplantısından önce parça koşullarını tek başıma düzenleyip nereden başlayacağımın ölçütünü belirleme eğilimindeyim.",
              scale: ["Kesinlikle katılmıyorum", "Katılmıyorum", "Kararsızım", "Katılıyorum", "Kesinlikle katılıyorum"],
            },
            result: {
              label: "Örnek sonuç",
              areasLabel: "Önce bakılacak alanlar",
              areas: ["Tasarım ve Geliştirme", "Robotik ve Otomasyon", "Otomotiv ve Havacılık"],
              nextLabel: "Sonraki adım",
              next: "Bir tasarım projesi seçin ve kendi belirlediğiniz bir koşulu nedeniyle birlikte yazın.",
            },
          },
          {
            lang: "日本語",
            code: "ja",
            langKo: "Japanese",
            status: "draft",
            statusLabel: "Japanese translation",
            question: {
              label: "質問の例",
              area: "設計・開発",
              text: "設計の課題を受けると、チームの打ち合わせの前に、まず自分で部品の条件を整理し、どこから取り組むかの基準を決めるほうだ。",
              scale: ["まったくそう思わない", "そう思わない", "どちらともいえない", "そう思う", "とてもそう思う"],
            },
            result: {
              label: "結果の例",
              areasLabel: "まず見る分野",
              areas: ["設計・開発", "ロボット・自動化", "自動車・航空"],
              nextLabel: "次の一歩",
              next: "設計のプロジェクトを一つ選び、自分で決めた条件を一つ、その理由とあわせて書き出しましょう。",
            },
          },
          {
            lang: "中文",
            code: "zh",
            langKo: "Chinese",
            status: "draft",
            statusLabel: "Chinese translation",
            question: {
              label: "示例题目",
              area: "设计与开发",
              text: "接到设计任务时，我倾向于在团队会议之前先独自整理零部件条件，确定从哪里入手的标准。",
              scale: ["完全不同意", "不同意", "不确定", "同意", "完全同意"],
            },
            result: {
              label: "示例结果",
              areasLabel: "优先查看的领域",
              areas: ["设计与开发", "机器人与自动化", "汽车与航空航天"],
              nextLabel: "下一步",
              next: "选择一个设计项目，写下一个你自己确定的条件及其理由。",
            },
          },
          {
            lang: "Русский",
            code: "ru",
            langKo: "Russian",
            status: "draft",
            statusLabel: "Russian translation",
            question: {
              label: "Пример вопроса",
              area: "Проектирование и разработка",
              text: "Получив задание по проектированию, я обычно ещё до встречи с командой сам систематизирую требования к деталям и решаю, с чего начать.",
              scale: ["Полностью не согласен", "Не согласен", "Затрудняюсь ответить", "Согласен", "Полностью согласен"],
            },
            result: {
              label: "Пример результата",
              areasLabel: "С каких областей начать",
              areas: ["Проектирование и разработка", "Робототехника и автоматизация", "Автомобилестроение и авиация"],
              nextLabel: "Следующий шаг",
              next: "Выберите один проект по проектированию и запишите одно требование, которое вы определили сами, и почему.",
            },
          },
        ],
      },
    },
    trust: {
      label: "Foundations",
      title: "What the assessment is built on",
      lead:
        "The assessment framework is registered for copyright and was built with reference to Korean and international job and testing standards. We list what has been completed and what is still in progress separately.",
      cards: [
        {
          title: "Copyright registration",
          body: "The PCA assessment framework is registered with the Korea Copyright Commission.",
          items: ["C-2025-058658", "C-2025-059731", "C-2025-059732"],
        },
        {
          title: "Reference standards",
          body: "Job classifications and assessment design draw on the following standards.",
          items: [
            "NCS (Korea's National Competency Standards)",
            "O*NET-based occupational information",
            "RIASEC-based vocational interest theory",
            "NACE European industry classification",
            "OECD job and skills data",
            "AERA·APA·NCME Standards for Educational and Psychological Testing",
          ],
        },
        {
          title: "Registration and operating rules",
          body: "We provide job information only. Students apply on their own.",
          items: [
            "Registered job information provider No. J1700020220007",
            "Individual answers and reports are not visible to school staff",
            "In aggregate views, any group under 5 people is not shown as a number",
          ],
        },
      ],
      verify: {
        title: "How we check the assessment",
        lead: "Scores are calculated only by fixed rules. The same answers always give the same result, and school staff can trace the basis of each result.",
        statusLabel: { done: "Done", doing: "In progress", next: "Planned" },
        steps: [
          { status: "done", title: "Same items in three languages", body: "Korean, English and Turkish items are aligned one by one to mean the same thing." },
          { status: "done", title: "Same answers, same result", body: "Every release is checked automatically to confirm that the same answers produce the same result." },
          { status: "done", title: "Keeping item meaning intact", body: "When wording is edited, each item is compared to confirm that what it measures has not changed." },
          { status: "doing", title: "Review by subject experts", body: "We have prepared review materials for each major and are working through reviews with experts in each field." },
          { status: "next", title: "Pilot and statistical analysis", body: "We will analyze reliability and validity using real response data." },
          { status: "next", title: "Comparison baseline", body: "Once enough students have taken the assessment, we will build a baseline for comparison within each major." },
        ],
      },
      note: "Until a comparison baseline exists, reports do not show percentiles or rankings.",
      math: {
        title: "How scores are calculated",
        lead: "Every score comes only from the formulas below. Weights and transformation matrices live in data tables, not in code, so they can be adjusted for a department or country while the calculation method stays the same.",
        steps: [
          {
            no: "01",
            title: "Area score",
            formula: "S<sub>a</sub> = 25 · ( x̄<sub>a</sub> − 1 ),&ensp; x̄<sub>a</sub> = <sup>1</sup>&frasl;<sub>n</sub> Σ<sub>i</sub> x<sub>i</sub>",
            body: "The mean (1 to 5) of the items in one job area is stretched to 0 to 100. A 1 becomes 0, a 3 becomes 50 and a 5 becomes 100.",
          },
          {
            no: "02",
            title: "Measurement error",
            formula: "SE<sub>a</sub> = 25 · s<sub>a</sub> / √n",
            body: "Error is measured from how spread out the answers within an area are. It is calculated for each person, not taken from a fixed value.",
          },
          {
            no: "03",
            title: "Activity axes from weights",
            formula: "A<sub>k</sub> = Σ<sub>a</sub> w<sub>a,k</sub> x̄<sub>a</sub> / Σ<sub>a</sub> w<sub>a,k</sub>",
            body: "Job area scores are mapped onto 8 activity axes (Analysis·Calculation, Design·Concept, Build·Test and others) through the weight matrix w.",
          },
          {
            no: "04",
            title: "Error propagation",
            formula: "SE(A<sub>k</sub>) = √ Σ<sub>a</sub> ( w<sub>a,k</sub> / Σw · SE<sub>a</sub> )<sup>2</sup>",
            body: "Error is carried over with the same weights used to build each axis score, so each axis comes with its own measure of reliability.",
          },
          {
            no: "05",
            title: "Position within the person",
            formula: "z<sub>k</sub> = ( A<sub>k</sub> − Ā ) / s<sub>A</sub>,&ensp; |z<sub>k</sub>| ≤ 3",
            body: "Axes draw on different numbers of areas. To remove that bias, each axis is expressed relative to the person's own other axes.",
          },
          {
            no: "06",
            title: "Job fit",
            formula: "F<sub>j</sub> = 0.75 · 100σ(ℓ<sub>j</sub>) + 0.25 · 100σ(p<sub>j</sub>),&ensp; σ(z) = 1 / ( 1 + e<sup>−1.2z</sup> )",
            body: "For each job, activity preference ℓ = Σ v·z / Σ v is computed with the weights v of the axes that job emphasizes, then combined 3 : 1 with the work style score p.",
          },
          {
            no: "07",
            title: "Intervals and groups",
            formula: "F<sub>j</sub> ± SE(F<sub>j</sub>)&ensp;(about a 68% interval)",
            body: "Jobs whose intervals overlap are not ranked. They are shown as one group, so first and second place are never separated by a difference smaller than the error.",
          },
          {
            no: "08",
            title: "Evidence check (major assessments)",
            formula: "evidence ⇔ |C| ≥ 4 ∧ R ⊆ C ∧ O ≥ 1",
            body: "Major assessments do not add up points. An area counts as having evidence only when at least 4 judgment axes C are confirmed, all required axes R for that area are among them, and at least one piece of work O was produced.",
          },
          {
            no: "09",
            title: "Reliability analysis",
            formula: "α = <sup>k</sup>&frasl;<sub>k−1</sub> · ( 1 − Σ<sub>i</sub> σ<sub>i</sub><sup>2</sup> / σ<sub>X</sub><sup>2</sup> )",
            body: "Once real response data is available, we will calculate and publish internal consistency (Cronbach's α) for each area.",
            status: "next",
          },
        ],
        weights: {
          title: "Weight example",
          lead: "Two areas taken from the actual weight table of the Mechanical Engineering assessment. The weights in each area add up to 1.",
          areas: [
            {
              name: "Design and Development",
              rows: [
                { axis: "Design·Concept", w: 0.45 },
                { axis: "Analysis·Calculation", w: 0.25 },
                { axis: "Build·Test", w: 0.2 },
                { axis: "Improvement·Efficiency", w: 0.1 },
              ],
            },
            {
              name: "Energy and Plant",
              rows: [
                { axis: "Field·Equipment", w: 0.4 },
                { axis: "Analysis·Calculation", w: 0.25 },
                { axis: "Coordination·Management", w: 0.2 },
                { axis: "Improvement·Efficiency", w: 0.15 },
              ],
            },
          ],
          note: "Weights are stored in a data table (job_area_axis_weights). When they change, we issue a new version so earlier results stay the same.",
        },
        nextLabel: "Planned",
      },
    },
    campus: {
      label: "Universities",
      title: "Open the assessment by department and track progress on one screen",
      lead:
        "Staff issue student accounts and see progress and results by department. Students sign in through their school's own address and receive the same assessment and report.",
      points: [
        { title: "Assessments by department", body: "Each contracted department gets the assessment for its major." },
        { title: "Student accounts", body: "Issue IDs and passwords one at a time, or all at once from a CSV file." },
        { title: "Progress and department totals", body: "See started and completed counts by department. Groups under 5 people are not shown." },
        { title: "CSV export", body: "Download rosters and progress as CSV for internal reports." },
      ],
      primary: { label: "See the university overview", href: "/universities" },
      secondary: { label: "Contact us", href: "/contact" },
    },
    personal: {
      label: "For individuals",
      title: "You can use it without a school account",
      lead:
        "You can sign up as an individual. Please check the pricing screen in the CareerMatri app for assessment prices and the products currently available.",
      cards: [
        {
          tag: "Assessment and report",
          title: "Major-based assessment",
          body: "When you finish, you get a web report and a PDF, and your CareerMatri workspace opens.",
          points: [
            "Prices and the differences between tiers are shown on the app's pricing screen",
            "You can get a refund before you answer the first question",
          ],
          cta: { label: "See pricing", href: "/pricing" },
        },
        {
          tag: "Subscription",
          title: "MAT · AI career assistant",
          body: "After the assessment, it keeps track of your weekly tasks and deadlines and puts saved job postings side by side with your experience.",
          price: `30-day pass ${krw(TRACK_KR.month.price)} · 365-day pass ${krw(TRACK_KR.year.price)}`,
          priceNote: "No automatic renewal",
          points: [
            "It ends on its own when the period is over and is not charged again",
            "Buy a PRO report and your first month is free",
          ],
          cta: { label: "Learn about MAT", href: "/assistant" },
        },
      ],
    },
    faq: {
      label: "FAQ",
      title: "Common questions before you start",
      items: [
        {
          q: "My school gave me an ID. Where do I sign in?",
          a: "Use the address your school gave you, or the CareerMatri login screen, with the ID and password you received.",
          link: { label: "Open the login screen", href: "/login" },
        },
        {
          q: "Can individuals use it?",
          a: "Yes. You can sign up as an individual. Please check the app's pricing screen for prices and the products currently available.",
          link: { label: "See pricing", href: "/pricing" },
        },
        {
          q: "If I close the assessment halfway, do I have to start over?",
          a: "No. Your answers are saved as you go, and you pick up where you left off when you come back.",
        },
        {
          q: "How do I get my report?",
          a: "When you finish, you can read it on the web right away and download it as a PDF. Log in any time to open it again.",
        },
        { q: "Will I get a ranking or a hiring prediction?", a: "No. We show the experiences confirmed in your answers, what is still missing, and what to do next." },
        {
          q: "Has the assessment completed its validation studies?",
          a: "Not yet. The pilot and cognitive interviews are still under way, so we make no claims about its statistical properties yet. Please use the results as one reference when making career decisions.",
        },
      ],
    },
    closing: {
      title: "Start your first assessment in your major",
      lead: "Log in with the account your school gave you, or sign up as an individual.",
      primary: { label: "Start the assessment", href: "/cores" },
      secondary: { label: "Contact us", href: "/contact" },
    },
  },

  universities: {
    meta: {
      title: "For universities and institutions | CareerMatri",
      description:
        "Run major-based career assessments by department with school accounts. Issue student accounts, track progress, see department totals and export CSV files from the staff screen.",
    },
    hero: {
      eyebrow: "Universities and institutions",
      title: ["Run major-based career assessments", "with school accounts"],
      lead:
        "Once staff issue student accounts, students take the assessment through their school's own address. Staff check progress and department totals on the staff screen and download them as CSV.",
      primary: { label: "Request an introduction", href: "/contact" },
      secondary: { label: "School staff login", href: "/login" },
    },
    mock: {
      label: "Screen example · Fictional school and numbers",
      title: "Major assessment summary",
      meta: "2026 academic year, fall semester",
      kpis: [
        { label: "Eligible", value: "128", note: "Based on the uploaded roster" },
        { label: "Started", value: "96", note: "Students who started the assessment" },
        { label: "Completed", value: "71", note: "Students who received a report" },
      ],
      tableTitle: "Progress by department",
      head: ["Department", "Eligible", "Started", "Completed"],
      rows: [
        ["Business Administration", "42", "35", "28"],
        ["Electrical and Electronic Engineering", "38", "30", "24"],
        ["Nursing", "44", "31", "19"],
        ["Psychology", "Hidden", "Hidden", "Hidden"],
      ],
      hiddenNote: "Groups under 5 people are not shown as numbers",
      exportLabel: "Download CSV",
    },
    flow: {
      label: "How it runs",
      title: "Six steps from setup to results",
      lead: "Everything from issuing student accounts to checking totals happens on the staff screen. There is nothing to install.",
      steps: [
        { title: "Choose departments and numbers", body: "Decide which departments will take the assessment and how many students. Even if department names differ, we connect each one to the closest major assessment." },
        { title: "Get staff accounts", body: "CareerMatri creates staff accounts for your school." },
        { title: "Issue student accounts", body: "On the staff screen, issue IDs and passwords one at a time, or all at once from a CSV file." },
        { title: "Students sign in through the school address", body: "Students go to the school's own address, choose their department and take the assessment." },
        { title: "Check progress and totals", body: "See started and completed counts and department totals on the staff screen." },
        { title: "Export CSV", body: "Download rosters, progress and totals as CSV files." },
      ],
    },
    features: {
      label: "Staff screen",
      title: "What staff can do themselves",
      items: [
        { title: "Add students and issue accounts", body: "Add students one by one or upload a CSV in one go. A preview lets you check before anything is saved." },
        { title: "Reissue passwords", body: "Issue a new initial password to students who forgot theirs." },
        { title: "Pause and reopen accounts", body: "Pause accounts that are not in use, for example during a leave of absence or after graduation, and reopen them when needed." },
        { title: "Progress by student", body: "See whether each student has not started, is in progress, or has finished." },
        { title: "Totals by department", body: "See eligible, started and completed counts by college and department." },
        { title: "List of students who have not started", body: "Download a CSV of only the students who have not started yet." },
        { title: "CSV export", body: "Download rosters, progress and totals as CSV for internal reports." },
        { title: "Allowing a retake", body: "School assessments are taken once by default. Only students the staff allow can take it again." },
        { title: "MAT school passes", body: "Within the number of students the school sets, staff can open MAT (the AI career assistant) to students for 6 months or 1 year. The cost is included in the adoption contract." },
      ],
    },
    access: {
      label: "Student access",
      title: "Students sign in through the school's own address",
      body:
        "Each school has its own address. Students choose their department there, log in with the ID they were given and start the assessment.",
      url: `${PLATFORM_URL.replace(/^https?:\/\//, "")}/campus/school-code`,
      urlNote: "The school code is set during onboarding.",
      login: { label: "See the student login screen", href: "/login" },
    },
    privacy: {
      label: "Privacy",
      title: "What staff can and cannot see",
      items: [
        "Individual students' answers and reports do not appear on the staff screen.",
        "In totals, any group under 5 people is not shown as a number.",
        "CSV files include rosters, progress and totals only, not item-level answers.",
        "Initial passwords are shown once when issued and are not stored.",
      ],
    },
    faq: {
      label: "FAQ",
      title: "Common questions before adopting",
      items: [
        {
          q: "Does each department take a different assessment?",
          a: "Yes. Students take the major assessment linked to their department. Departments that share a major assessment still get examples and guidance suited to that department.",
        },
        {
          q: "What do we need to prepare?",
          a: "Tell us which departments will take the assessment, roughly how many students, and a staff contact. The student roster is uploaded on the staff screen when you issue accounts.",
        },
        {
          q: "Can students see their results again later?",
          a: "Yes. Students can log in and open their web report and PDF at any time.",
        },
        {
          q: "How is the cost set?",
          a: "It depends on the departments and number of students. Get in touch and we will explain the options that fit your school.",
          link: { label: "Request an introduction", href: "/contact" },
        },
      ],
    },
    closing: {
      title: "We will walk you through the right setup for your school",
      lead: "Send us your school name, departments and expected number of students, and we will get back to you after reviewing them.",
      primary: { label: "Request an introduction", href: "/contact" },
      secondary: { label: "School staff login", href: "/login" },
    },
  },

  assistant: {
    meta: {
      title: "MAT · AI career assistant | CareerMatri",
      description: `MAT is CareerMatri's AI career assistant. After the assessment, it keeps track of your weekly tasks and deadlines and compares job postings you find with your own experience. 30-day pass ${krw(TRACK_KR.month.price)}, 365-day pass ${krw(TRACK_KR.year.price)}.`,
    },
    hero: {
      eyebrow: "Subscription",
      title: ["Keep preparing after the assessment", "with MAT"],
      lead:
        "MAT is the AI career assistant inside your CareerMatri workspace. It tells you about your weekly tasks and deadlines, helps turn your notes into experience records, and compares job postings you find with your experience.",
      primary: { label: "Start MAT", href: "/me/track" },
      secondary: { label: "See pricing", href: "#plans" },
      note: "You need to log in. If you don't have an account, you can sign up as an individual on the login screen.",
    },
    features: {
      label: "What it does",
      title: "Helps you keep your job preparation going week by week",
      items: [
        { title: "Weekly tasks and deadline reminders", body: "Inside the app, it tells you one task for the week and the deadlines coming up. If you like, you can also get one email a week." },
        { title: "Notes into experience records", body: "Write down something you did recently in your own words, and it is turned into options for an experience record. You review it and save it yourself." },
        { title: "Postings next to your experience", body: "Paste in a job posting you found yourself, and for each requirement it shows what you can explain from your experience and what is still missing." },
        { title: "Compare again with a new industry or role", body: "Change the industry or role you are interested in, and your experience is compared again on that basis." },
      ],
      planned: "Monthly change report · Coming soon",
      plannedNote: "A report that collects what changed over the month is in preparation.",
    },
    plans: {
      label: "Pricing",
      title: "Pick only the period you need",
      lead: "There is no automatic renewal. Your pass ends on its own when the period is over and is not charged again.",
      items: [
        {
          name: "30-day pass",
          price: krw(TRACK_KR.month.price),
          unit: "30 days of access",
          body: "Try it for a month and then decide whether to continue.",
          cta: { label: "Start with the 30-day pass", href: "/me/track" },
        },
        {
          name: "365-day pass",
          price: krw(TRACK_KR.year.price),
          unit: "365 days of access",
          body: "Costs less than buying the 30-day pass twelve times. A good fit if you want to keep preparing through a whole school year.",
          featured: true,
          cta: { label: "Start with the 365-day pass", href: "/me/track" },
        },
      ],
      notes: [
        "There is no automatic renewal. Your pass ends on its own when the period is over.",
        "Payment is made on the MAT screen in the CareerMatri app.",
      ],
      trial: "Buy a PRO report and you can use MAT free for the first month.",
    },
    faq: {
      label: "FAQ",
      title: "Common questions about MAT",
      items: [
        {
          q: "Will I be charged automatically every month?",
          a: "No. Both the 30-day and 365-day passes are paid once and end on their own when the period is over.",
        },
        {
          q: "I bought a PRO report. How do I get the free month?",
          a: "Log in and claim the free month on the MAT screen. Each person can claim it once.",
          link: { label: "Open the MAT screen", href: "/me/track" },
        },
        {
          q: "When will the monthly change report be available?",
          a: "It is still in preparation, so we cannot promise a date. When it opens, we will let you know on the MAT screen first.",
        },
        {
          q: "How do refunds work?",
          a: "Our refund terms are set out in the refund policy. Please take a look before you pay.",
          link: { label: "See the refund policy", href: "/legal/refund" },
        },
      ],
    },
    closing: {
      title: "Start by sorting out this week's task",
      lead: "Log in and you can start right away on the MAT screen. If you haven't taken the assessment yet, you can start there first.",
      primary: { label: "Start MAT", href: "/me/track" },
      secondary: { label: "Take the assessment first", href: "/cores" },
    },
  },

  contact: {
    meta: {
      title: "Contact | CareerMatri",
      description: "Questions about adoption and use for universities and institutions. Email hari_info@hari.re.kr, phone 044-867-7211.",
    },
    eyebrow: "Contact",
    title: "Ask us about adoption and use",
    lead:
      "We take questions about adoption by universities and institutions, individual use and partnerships by email and phone. You can put your message together below and send it by email right away.",
    direct: {
      title: "Contact us directly",
      emailLabel: "Email",
      telLabel: "Phone",
      hoursNote: "If you can't reach us by phone, please send an email. We will reply after reviewing it.",
    },
    company: { title: "Company information" },
    form: {
      title: "Put your email together",
      lead: "Fill in the fields and press the button. Your email app opens with the message filled in.",
      honest: "This page does not save or send anything for you. Your message is only sent when you press send in your email app.",
      fields: {
        org: "Institution or school name",
        orgHint: "e.g. Career Services, OO University",
        name: "Contact name",
        nameHint: "e.g. Jane Kim",
        reply: "How we can reach you",
        replyHint: "Email or phone number",
        type: "Inquiry type",
        size: "Expected number of students",
        sizeHint: "e.g. 3 departments, about 300 students",
        message: "Message",
        messageHint: "Tell us your planned timing or any questions.",
      },
      types: ["University or institution adoption", "Department-level adoption", "Individual use", "MAT (AI career assistant)", "Partnerships and other"],
      subject: "[CareerMatri inquiry]",
      bodyIntro: "This inquiry was put together on the CareerMatri website.",
      send: "Send with my email app",
      copy: "Copy message",
      opened:
        "Your email app has opened. Your message is only sent when you press send there. If the email app did not open, copy the message and send it to the address above.",
      copiedAll: "Message copied. Paste it into your email and send it to the address above.",
      needOrg: "Please fill in either the message or the institution name.",
    },
    after: {
      title: "After you contact us",
      items: [
        "We review your message and reply to the contact details you gave.",
        "For universities and institutions, we explain an adoption setup that fits your departments and numbers.",
        "For individual use, we check your payment and account status before replying.",
      ],
    },
    others: {
      title: "Go straight here if",
      items: [
        { label: "School staff login", href: "/login" },
        { label: "Support (orders, refunds, passwords)", href: "/support" },
        { label: "Terms of Service", href: "/legal/terms" },
        { label: "Privacy Policy", href: "/legal/privacy" },
      ],
    },
  },

  notFound: {
    title: "Page not found",
    body: "This page has moved or no longer exists. Try again from the home page, or start the assessment right away.",
    home: { label: "Home", href: "/" },
    start: { label: "Start the assessment", href: "/cores" },
  },

  legal: {
    /* Values are the official registry values, kept exactly as in kr.ts. */
    company: "주식회사 에이치에이연구원",
    ceo: "조건희, 한정인",
    address: "세종특별자치시 한누리대로 2143, 704호",
    tel: "044-867-7211",
    email: "hari_info@hari.re.kr",
    bizNo: "375-88-02588",
    mailOrderNo: "",
    jobInfoNo: "J1700020220007",
    privacyOfficer: "조건희, 한정인",
    labels: {
      heading: "Business information",
      company: "Company name",
      ceo: "Representatives",
      address: "Address",
      tel: "Phone",
      email: "Email",
      bizNo: "Business registration number",
      mailOrderNo: "Mail-order business registration number",
      jobInfoNo: "Job information provider registration number",
      privacyOfficer: "Chief privacy officer",
      unset: "Pending",
    },
  },

  footer: {
    tagline: "Major-based career assessment and career workspace",
    columns: [
      {
        title: "Service",
        links: [
          { label: "How it works", href: "/#how" },
          { label: "Majors", href: "/#majors" },
          { label: "Universities", href: "/universities" },
          { label: "MAT · AI career assistant", href: "/assistant" },
          { label: "Pricing", href: "/pricing" },
        ],
      },
      {
        title: "Quick links",
        links: [
          { label: "Start the assessment", href: "/cores" },
          { label: "Log in", href: "/login" },
          { label: "School staff login", href: "/login" },
          { label: "Contact", href: "/contact" },
          { label: "Support", href: "/support" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Terms of Service", href: "/legal/terms" },
          { label: "Privacy Policy", href: "/legal/privacy" },
          { label: "Refund Policy", href: "/legal/refund" },
        ],
      },
    ],
    copyright: "© 2026 주식회사 에이치에이연구원",
  },
};
