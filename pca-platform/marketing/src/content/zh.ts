import { PLATFORM_URL, HOME_DOMAIN } from "@/lib/domains";
import { TRACK_KR, krw } from "@/lib/prices";
import type { SiteContent } from "./model";

/**
 * 韩国站简体中文版 (2026-10-21)。由 `kr.ts` 翻译而来，结构、链接与价格来源保持一致。
 * 价格只从 `lib/prices.ts` 读取，不在本文件中手写数字。
 */
export const zh: SiteContent = {
  key: "kr",
  lang: "zh",
  domain: HOME_DOMAIN,
  brand: "CareerMatri",
  platformUrl: PLATFORM_URL,

  meta: {
    title: "CareerMatri | 分专业职业诊断与职业工作区",
    description:
      "通过按专业设计的诊断测评，梳理你到目前为止做过的事；之后在结果报告和「我的CareerMatri」工作区里，接着规划下一步。本科生到硕士、博士、博士后都可以使用，高校和机构可按院系开通。",
    ogAlt: "CareerMatri 分专业职业诊断",
  },

  ui: {
    skip: "跳到正文",
    menu: "打开菜单",
    close: "关闭菜单",
    mockTag: "界面示例",
    copy: "复制",
    copied: "已复制",
    external: "将跳转到CareerMatri应用",
    langLabel: "语言",
    appLangNote:
      "CareerMatri应用的注册、测评和结果页面目前只有韩语和英语版本，点击按钮后将打开英语版。",
  },

  nav: {
    items: [
      { label: "服务介绍", href: "/#glance" },
      { label: "高校与机构", href: "/universities" },
      { label: "AI求职助手", href: "/assistant" },
      { label: "价格", href: "/pricing" },
      { label: "合作咨询", href: "/contact" },
    ],
    staffLogin: { label: "学校管理员登录", href: "/login" },
    login: { label: "登录", href: "/login" },
    start: { label: "开始测评", href: "/cores" },
    startShort: "开始测评",
  },

  home: {
    hero: {
      eyebrow: "分专业职业诊断 · 结果报告 · 职业工作区",
      title: ["看看你在专业里做过的事", "能通向哪些工作"],
      lead:
        "CareerMatri的诊断测评按专业分别设计，帮你梳理在课程、作业和项目中做过的事，以及其中哪些是你自己拿的主意。拿到结果报告后，还可以在自己的工作区里继续补充经历，一步步往下走。",
      primary: { label: "开始测评", href: "/cores" },
      secondary: { label: "高校与机构合作咨询", href: "/contact" },
      note: "已经从学校拿到账号了吗？",
      noteLink: { label: "登录后开始", href: "/login" },
    },
    mock: {
      label: "界面示例",
      brandSub: "机械工程",
      nav: ["首页", "测评", "待办", "当前状态", "经历", "历史结果"],
      title: "我的职业",
      meta: "机械工程 · 最近更新 2026-10-18",
      todoLabel: "待办",
      todoTitle: "把一段经历整理成一页",
      todoBody: "用一句话写下你自己定的标准，面试时就能直接用上。",
      todoCta: "去整理",
      todoMore: "还有2项待办",
      stateLabel: "当前状态",
      stateSub: "目前能讲清楚的领域",
      tiles: [
        { name: "结构·耐久分析", sub: "分析模型 · 分析报告" },
        { name: "材料·强度·失效", sub: "分析报告 · 材料规格" },
        { name: "试验·测量", sub: "试验计划书 · 检测报告" },
      ],
      changeLabel: "最近变化",
      changes: [
        { text: "已确认你在机构·产品设计中自己定下的条件和标准", date: "10-18" },
        { text: "新补充的经历让试验·测量领域的依据更扎实了", date: "10-05" },
      ],
    },
    glance: {
      label: "一图看懂",
      painsTitle: "求职前的学生常卡在这里",
      pains: [
        "很难把课程和项目中做过的事写成申请材料里的句子",
        "看不清自己的专业能通向哪些行业和岗位",
        "做完测评只拿到一份报告，之后不知道该做什么",
      ],
      answerLabel: "CareerMatri 是",
      answer: "以专业中做过的事为依据，并据此确定下一步的职业诊断服务",
      pillars: [
        { title: "按专业设计", body: "每个专业的题目都依据该领域实际要做的工作单独编写。" },
        { title: "以经历为依据", body: "不问能力倾向或性格类型，而是问您做过什么、当时自己决定了什么，并在报告中原样呈现。" },
        { title: "持续使用的工作区", body: "拿到报告后继续添加经历，当前状态和下一步会重新整理。" },
      ],
    },
    how: {
      label: "使用方式",
      title: "从一次测评开始，在工作区里接着推进",
      lead:
        "测评做完并不就此结束。拿到结果报告后继续补充经历，当前状态和下一步要做的事都会跟着更新。",
      steps: [
        {
          no: "01",
          title: "分专业诊断测评",
          body: "选好自己的专业，回答你在课程、作业和项目中做过什么，其中哪些由你自己决定。",
          points: [
            "每个专业的题目都依据该领域的实际工作单独设计",
            "作答即时保存，中途关闭也能接着做",
            "不做能力倾向测试，也不判断性格类型",
          ],
        },
        {
          no: "02",
          title: "结果报告（网页·PDF）",
          body: "哪些经历能讲清楚、哪些还要补充、下一步做什么，都汇总在一份报告里。",
          points: [
            "可在网页上直接查看，也可下载PDF",
            "说明已确认的经历可以对应哪些行业和岗位",
            "整理出能用在求职材料和面试中的表述",
          ],
        },
        {
          no: "03",
          title: "我的CareerMatri工作区",
          body: "补充经历后，系统会重新计算当前状态，下一步要做的事也会相应调整。",
          points: [
            "先补充经历，再更新状态，然后确定下一步",
            "测评时的结果单独保存，不会被改动",
            "登录后随时可以重新打开结果报告",
          ],
        },
      ],
    },
    report: {
      label: "结果报告",
      title: "结果报告包含哪些内容",
      lead:
        "结果报告完全依据你的作答生成。已经确认的和仍然空缺的部分都按顺序列出，方便你逐项对照。",
      items: [
        { title: "结果概览", body: "第一页列出目前已确认的经历、建议优先查看的领域和眼下要做的事。" },
        { title: "我已有的依据", body: "把你做过的事、自己做的决定和留下的成果对应起来。" },
        { title: "还需补充的部分", body: "按领域列出不足之处，并说明为什么需要补上。" },
        { title: "对应的行业和岗位", body: "说明已确认的经历会在哪些行业和岗位中用到。" },
        { title: "下一步要做的事", body: "具体说明接下来要整理什么，以及完成后应留下什么成果。" },
        { title: "求职材料与面试表述", body: "根据你选的答案，整理出可以写进求职材料的句子框架。" },
      ],
      note:
        "结果报告不判断能力倾向，不预测能否被录用，也不做排名。不同等级的内容深度可能不同。",
      mock: {
        label: "结果报告示例",
        school: "职业分析报告",
        docTitle: "工商管理系 · 经营综合",
        docMeta: "PRO · 2026-10-16 作答",
        headline: "在经营战略·规划方向，你有可以写进求职材料的经历",
        headlineSub: "你做过的事和当时自己做的决定都已确认。",
        cells: [
          {
            label: "已确认的经历",
            title: "经营战略·规划 · 市场营销·市场",
            body: "比较过多个方案并说明理由选定其一，还按项目拆分了预算。",
          },
          {
            label: "当前要做的事",
            title: "记下当时自己做的决定",
            body: "试着用三句话写下你调整过的需求条件。",
          },
          { label: "留下的依据", title: "目标与指标表 · 商业计划书", body: "可以写进求职材料的素材已经齐了。" },
          { label: "还需补充的部分", title: "数据·决策", body: "还没有写下你自己定的标准和留下的成果。" },
        ],
      },
    },
    grad: {
      label: "研究生 · 博士后",
      title: "从本科生到博士后，用同一套测评",
      lead:
        "在第一个页面选择学位阶段后，同一专业测评会按该阶段的场景提问。硕士及以上还会填写学科门类和本科专业，用来把研究经历转换成企业能读懂的语言。",
      stagesTitle: "各学位阶段额外询问的内容",
      stages: [
        { name: "学士", asks: "课程作业、毕业设计和实习中自己决定的事" },
        { name: "硕士", asks: "研究问题和测量条件、确认结果的方法，以及转换成行业用语" },
        { name: "博士", asks: "提出问题的过程、假设与变量、不确定性和研究的局限" },
        { name: "博士后", asks: "自己牵头的范围和课题管理、独立做出的判断，以及把成果转化为工作的方法" },
      ],
      matTitle: "MAT 为研究生增加的功能",
      mat: [
        { title: "单独读取科研成果要求", body: "把研究岗位招聘中对论文、专利、科研项目、学术会议报告和研究计划书的要求单独列出，并标明您的记录中是否有可以支撑的内容。" },
        { title: "把研究经历写成岗位语言", body: "为每条研究或论文记录生成申请材料的句子框架，并按学位阶段附上一句应先写下来的内容。" },
        { title: "围绕学位研究的面试问题", body: "按阶段给出三个常被问到的问题，比如导师决定了什么、您自己决定了什么，并附上可以带去的记录。" },
      ],
      note: "学位高并不会让结果自动变好。同样的回答，硕士和博士的结果相同，判定只看做过的事和留下的成果。",
      cta: { label: "开始测评", href: "/cores" },
    },
    majors: {
      label: "专业",
      title: "与高校和机构合作，提供20个专业测评",
      lead:
        "每个专业的题目都根据该领域实际的工作内容和判断来设计。各校院系名称不尽相同，我们会匹配最接近的专业测评。",
      groups: [
        { name: "工程·技术", items: ["机械工程", "电气电子工程", "计算机·软件", "建筑·室内建筑", "土木·铁道建设"] },
        { name: "生命·健康", items: ["生物·生命工程", "护理", "保健·医疗福利", "食品", "体育·运动康复", "园艺·森林·景观"] },
        { name: "经管·社会", items: ["经营", "行政", "法学·警察", "心理学", "教育"] },
        { name: "人文·艺术", items: ["韩国语·语言·文学", "媒体·广告公关·演出", "视觉·设计", "时尚·美容·造型"] },
      ],
      note:
        "开放哪些专业，取决于与高校和机构的合作范围。目前可以参加的专业，请在测评开始页面查看。",
      cta: { label: "找到我的专业，开始测评", href: "/cores" },
    },
    global: {
      label: "海外",
      title: "海外开展情况",
      lead:
        "CareerMatri的诊断引擎（PCA）已在韩国以外的国家使用过。各国岗位所要求的判断大同小异，因此同一套题目翻译成当地语言后即可使用。",
      legend: { done: "已开展的国家", planned: "计划开展" },
      countries: [
        { iso: "410", name: "韩国", status: "done" },
        { iso: "792", name: "土耳其", status: "done" },
        { iso: "276", name: "德国", status: "done" },
        { iso: "840", name: "美国", status: "done" },
        { iso: "392", name: "日本", status: "done" },
        { iso: "156", name: "中国", status: "done" },
        { iso: "398", name: "哈萨克斯坦", status: "done" },
        { iso: "250", name: "法国", status: "planned" },
        { iso: "710", name: "南非", status: "planned" },
        { iso: "608", name: "菲律宾", status: "planned" },
      ],
      source: "信息来源：ACADEMIX PCA介绍资料。标为计划开展的国家尚未启动。",
      samples: {
        title: "用当地语言呈现的测评与结果报告",
        lead:
          "下面用五种语言展示机械工程测评中的同一道题。英语和土耳其语是原版题目，日语、中文和俄语为译本。",
        items: [
          {
            lang: "English",
            code: "en",
            langKo: "英语",
            status: "live",
            statusLabel: "已有英文版测评与结果报告",
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
            langKo: "土耳其语",
            status: "live",
            statusLabel: "土耳其语原文题目",
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
            langKo: "日语",
            status: "draft",
            statusLabel: "日语译本",
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
            langKo: "中文",
            status: "draft",
            statusLabel: "中文译本",
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
            langKo: "俄语",
            status: "draft",
            statusLabel: "俄语译本",
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
      label: "依据",
      title: "测评依据，公开说明",
      lead:
        "测评体系已完成著作权登记，设计时参考了国内外的职业与测评标准。验证工作中，已完成和进行中的部分分开说明。",
      cards: [
        {
          title: "著作权登记",
          body: "PCA诊断体系已在韩国著作权委员会完成登记。",
          items: ["C-2025-058658", "C-2025-059731", "C-2025-059732"],
        },
        {
          title: "参考的标准",
          body: "职业分类与测评设计参考了以下标准。",
          items: [
            "NCS 韩国国家职业能力标准",
            "O*NET 系列职业信息体系",
            "RIASEC 系列职业兴趣理论",
            "NACE 欧洲产业分类",
            "OECD 职业与能力资料",
            "AERA·APA·NCME 教育与心理测验标准",
          ],
        },
        {
          title: "备案与运营原则",
          body: "招聘信息仅作展示，由学生本人自行投递。",
          items: ["职业信息提供业务备案 第J1700020220007号", "学校管理员看不到学生个人的作答和结果报告", "统计中不足5人的单元格不公开人数"],
        },
      ],
      verify: {
        title: "验证进展",
        lead: "分数只按事先定好的规则计算，同样的作答始终得到同样的结果，学校管理员也能追溯结果的依据。",
        statusLabel: { done: "已完成", doing: "进行中", next: "计划中" },
        steps: [
          { status: "done", title: "三种语言，同一套题", body: "韩语、英语、土耳其语题目已逐题对齐，确保含义一致。" },
          { status: "done", title: "同样的作答，同样的结果", body: "每次发布新版本时，自动检查同样的作答是否仍得到同样的结果。" },
          { status: "done", title: "题目含义不走样", body: "调整措辞时，逐题核对所测内容是否保持不变。" },
          { status: "doing", title: "专家审阅", body: "各专业的审阅资料已经备好，正在陆续邀请相关领域的专家审阅。" },
          { status: "next", title: "试点与统计分析", body: "用真实作答数据分析信度与效度。" },
          { status: "next", title: "建立比较基准", body: "作答人数足够后，在同一专业内建立可供比较的基准。" },
        ],
      },
      note: "比较基准建立之前，结果报告不标注百分位或排名。",
      math: {
        title: "分数的计算方法",
        lead: "所有分数都只按下列公式计算。权重和转换矩阵存放在数据表中，没有写死在代码里，因此按院系或国家调整参数时，计算方法本身不变。",
        steps: [
          {
            no: "01",
            title: "领域分数",
            formula: "S<sub>a</sub> = 25 · ( x̄<sub>a</sub> − 1 ),&ensp; x̄<sub>a</sub> = <sup>1</sup>&frasl;<sub>n</sub> Σ<sub>i</sub> x<sub>i</sub>",
            body: "将某个职业领域题目的平均分（1~5分）换算为0~100：1分对应0，3分对应50，5分对应100。",
          },
          {
            no: "02",
            title: "测量误差",
            formula: "SE<sub>a</sub> = 25 · s<sub>a</sub> / √n",
            body: "根据同一领域内作答的离散程度估算误差。误差按每个人单独计算，不套用固定值。",
          },
          {
            no: "03",
            title: "用权重构建活动轴",
            formula: "A<sub>k</sub> = Σ<sub>a</sub> w<sub>a,k</sub> x̄<sub>a</sub> / Σ<sub>a</sub> w<sub>a,k</sub>",
            body: "通过权重矩阵w，把职业领域分数映射到8个活动轴（分析·计算、设计·构想、制作·实验等）。",
          },
          {
            no: "04",
            title: "误差传递",
            formula: "SE(A<sub>k</sub>) = √ Σ<sub>a</sub> ( w<sub>a,k</sub> / Σw · SE<sub>a</sub> )<sup>2</sup>",
            body: "误差沿用计算轴分数时的同一组权重传递，同时得出每个轴的可信程度。",
          },
          {
            no: "05",
            title: "个人内的相对位置",
            formula: "z<sub>k</sub> = ( A<sub>k</sub> − Ā ) / s<sub>A</sub>,&ensp; |z<sub>k</sub>| ≤ 3",
            body: "各轴关联的领域数量不同，直接比较容易产生偏差，因此换算为同一个人在各轴之间的相对高低。",
          },
          {
            no: "06",
            title: "职业适配度",
            formula: "F<sub>j</sub> = 0.75 · 100σ(ℓ<sub>j</sub>) + 0.25 · 100σ(p<sub>j</sub>),&ensp; σ(z) = 1 / ( 1 + e<sup>−1.2z</sup> )",
            body: "以各职业所看重的轴权重v计算活动偏好 ℓ = Σ v·z / Σ v，再与工作风格分数p按3 : 1合并。",
          },
          {
            no: "07",
            title: "区间与分组",
            formula: "F<sub>j</sub> ± SE(F<sub>j</sub>)&ensp;(约 68% 区间)",
            body: "区间重叠的职业归为同一组，不排先后。小于误差的差距，不用来区分第一和第二。",
          },
          {
            no: "08",
            title: "依据判定（专业测评）",
            formula: "有依据 ⇔ |C| ≥ 4 ∧ R ⊆ C ∧ O ≥ 1",
            body: "专业测评不把分数相加。只有已确认的判断轴C不少于4个、包含该领域的全部必要轴R、并且留有成果O，才算“有依据的领域”。",
          },
          {
            no: "09",
            title: "信度分析",
            formula: "α = <sup>k</sup>&frasl;<sub>k−1</sub> · ( 1 − Σ<sub>i</sub> σ<sub>i</sub><sup>2</sup> / σ<sub>X</sub><sup>2</sup> )",
            body: "积累真实作答数据后，将按领域计算内部一致性（克朗巴哈α系数）并公开。",
            status: "next",
          },
        ],
        weights: {
          title: "权重示例",
          lead: "以下两个领域取自机械工程测评的实际权重表，每个领域的权重之和为1。",
          areas: [
            {
              name: "设计与开发",
              rows: [
                { axis: "设计·构想", w: 0.45 },
                { axis: "分析·计算", w: 0.25 },
                { axis: "制作·实验", w: 0.2 },
                { axis: "改进·效率", w: 0.1 },
              ],
            },
            {
              name: "能源与成套设备",
              rows: [
                { axis: "现场·设备", w: 0.4 },
                { axis: "分析·计算", w: 0.25 },
                { axis: "协调·管理", w: 0.2 },
                { axis: "改进·效率", w: 0.15 },
              ],
            },
          ],
          note: "权重以数据而非代码的形式管理。每次调整都会升级版本，此前作答者的结果不受影响。",
        },
        nextLabel: "计划中",
      },
    },
    campus: {
      label: "高校与机构",
      title: "按院系开放测评，在一个后台查看进度",
      lead:
        "管理员为学生发放账号，并查看作答进度和各院系统计。学生通过学校专属地址进入，参加的是同一套测评，拿到的也是同样的结果报告。",
      points: [
        { title: "按院系开放测评", body: "为每个签约院系开放对应专业的测评。" },
        { title: "发放学生账号", body: "账号和密码可逐个发放，也可上传CSV批量发放。" },
        { title: "进度与院系统计", body: "按院系查看已开始和已完成的人数，不足5人的单元格不公开。" },
        { title: "导出CSV", body: "名单和进度可导出为CSV，方便校内汇报。" },
      ],
      primary: { label: "了解高校与机构方案", href: "/universities" },
      secondary: { label: "合作咨询", href: "/contact" },
    },
    personal: {
      label: "个人使用",
      title: "没有学校账号也可以使用",
      lead:
        "也可以用个人身份注册使用。测评价格和目前在售的产品，请到CareerMatri应用的价格页面查看。",
      cards: [
        {
          tag: "测评与结果报告",
          title: "分专业诊断测评",
          body: "完成测评后可获得网页版结果报告和PDF，并开通「我的CareerMatri」工作区。",
          points: [
            "价格及各等级的区别，请在应用的价格页面查看",
            "在回答第一道题之前可以申请退款",
          ],
          cta: { label: "查看价格", href: "/pricing" },
        },
        {
          tag: "订阅",
          title: "MAT · AI求职助手",
          body: "测评结束后，MAT每周提醒你要做的事和截止日期，并把你收藏的招聘信息和你的经历放在一起对照。",
          price: `30天通行证 ${krw(TRACK_KR.month.price)} · 365天通行证 ${krw(TRACK_KR.year.price)}`,
          priceNote: "不自动续费",
          points: [
            "到期后自动结束，不会再次扣费",
            "购买PRO结果报告，首月免费",
          ],
          cta: { label: "了解MAT", href: "/assistant" },
        },
      ],
    },
    faq: {
      label: "常见问题",
      title: "开始之前常被问到的问题",
      items: [
        {
          q: "学校给了我账号，应该从哪里进入？",
          a: "打开学校提供的专属地址，或在CareerMatri登录页面输入学校发给你的账号和密码即可。",
          link: { label: "打开登录页面", href: "/login" },
        },
        {
          q: "个人也可以使用吗？",
          a: "可以，用个人身份注册即可。价格和目前在售的产品，请到应用的价格页面查看。",
          link: { label: "查看价格", href: "/pricing" },
        },
        {
          q: "测评中途关闭，需要从头再做吗？",
          a: "不需要。作答会即时保存，重新进入后从中断的地方继续。",
        },
        {
          q: "结果报告怎么获取？",
          a: "完成测评后可在网页上直接查看，也可下载PDF。登录后随时可以重新打开。",
        },
        {
          q: "研究生和博士后也能用吗？",
          a: "可以。开始时选择学位阶段，测评就会按该阶段的场景提问，结果报告和 MAT 也会侧重把研究经历转换成岗位语言。学位高并不会让结果变好。",
        },
        { q: "会预测我能否被录用，或者给出排名吗？", a: "不会。报告里写的是从作答中确认的经历、还需补充的部分和下一步要做的事。" },
        {
          q: "这是经过验证的测评吗？",
          a: "目前还在试点和认知访谈阶段，因此我们不称其为经过验证的测评。请把结果当作规划职业方向时的参考。",
        },
      ],
    },
    closing: {
      title: "选好专业，开始第一次测评",
      lead: "有学校账号的直接登录，没有的话用个人身份注册就能开始。",
      primary: { label: "开始测评", href: "/cores" },
      secondary: { label: "合作咨询", href: "/contact" },
    },
  },

  universities: {
    meta: {
      title: "高校与机构合作 | CareerMatri",
      description:
        "用学校账号按院系开展职业诊断。发放学生账号、查看进度、院系统计和导出CSV，都在管理后台完成。",
    },
    hero: {
      eyebrow: "高校与机构",
      title: ["按院系开展职业诊断", "用学校账号统一管理"],
      lead:
        "管理员发放学生账号后，学生通过学校专属地址进入测评。进度和各院系统计可在管理后台查看，并导出为CSV。",
      primary: { label: "合作咨询", href: "/contact" },
      secondary: { label: "学校管理员登录", href: "/login" },
    },
    mock: {
      label: "界面示例 · 学校与数据均为虚构",
      title: "专业诊断统计",
      meta: "2026学年第二学期",
      kpis: [
        { label: "目标人数", value: "128", note: "以上传的名单为准" },
        { label: "已开始", value: "96", note: "已开始测评的学生" },
        { label: "已完成", value: "71", note: "已获得结果报告的学生" },
      ],
      tableTitle: "各院系进度",
      head: ["院系", "目标", "已开始", "已完成"],
      rows: [
        ["工商管理系", "42", "35", "28"],
        ["电气电子工程系", "38", "30", "24"],
        ["护理系", "44", "31", "19"],
        ["心理学系", "不公开", "不公开", "不公开"],
      ],
      hiddenNote: "不足5人的单元格不公开人数",
      exportLabel: "下载CSV",
    },
    flow: {
      label: "使用流程",
      title: "从开通到查看结果，共六步",
      lead: "从发放学生账号到查看统计，都在管理后台完成，无需安装任何软件。",
      steps: [
        { title: "确定院系和人数", body: "确定开放测评的院系和人数。院系名称和测评名称不一致时，会匹配最接近的专业测评。" },
        { title: "获取管理员账号", body: "CareerMatri为学校管理员开设账号。" },
        { title: "发放学生账号", body: "在管理后台逐个发放账号和密码，或上传CSV批量发放。" },
        { title: "通过学校专属地址作答", body: "学生通过学校专属地址进入，选择所在院系后参加测评。" },
        { title: "查看进度与统计", body: "在管理后台查看已开始、已完成的人数和各院系统计。" },
        { title: "导出CSV", body: "将名单、进度和统计导出为CSV。" },
      ],
    },
    features: {
      label: "管理后台",
      title: "管理员可以自行完成的操作",
      items: [
        { title: "添加学生与发放账号", body: "可逐个添加，也可上传CSV批量导入，上传前可以先预览。" },
        { title: "重新发放密码", body: "为忘记密码的学生发放新的初始密码。" },
        { title: "停用与重新启用账号", body: "因休学或毕业不再使用的账号可先停用，需要时再重新启用。" },
        { title: "每位学生的进度", body: "查看每位学生是未开始、进行中还是已完成。" },
        { title: "各院系统计", body: "按学院和院系查看目标人数、已开始和已完成人数。" },
        { title: "未作答学生名单", body: "筛选出尚未开始的学生，导出为CSV。" },
        { title: "导出CSV", body: "将名单、进度和统计导出为CSV，用于校内汇报。" },
        { title: "允许重新作答", body: "学校测评默认每人一次，经管理员允许的学生可以再做一次。" },
        { title: "MAT学校使用权", body: "在学校确定的名额内，管理员可为学生开通6个月或1年的MAT（AI求职助手），费用包含在合作合同中。" },
      ],
    },
    access: {
      label: "学生入口",
      title: "学生通过学校专属地址进入",
      body:
        "每所学校都有专属地址。学生打开地址，选择所在院系，用学校发放的账号登录后即可开始测评。",
      url: `${PLATFORM_URL.replace(/^https?:\/\//, "")}/campus/学校代码`,
      urlNote: "学校代码在开通时一并确定。",
      login: { label: "查看学生登录页面", href: "/login" },
    },
    privacy: {
      label: "个人信息",
      title: "管理员能看到什么、看不到什么",
      items: [
        "管理后台不显示学生个人的作答和结果报告。",
        "统计中不足5人的单元格不公开人数。",
        "CSV只包含名单、进度和统计，不含逐题作答。",
        "初始密码只在发放时显示一次，不会保存。",
      ],
    },
    faq: {
      label: "常见问题",
      title: "合作前常被问到的问题",
      items: [
        {
          q: "不同院系做的测评不一样吗？",
          a: "是的。学生参加的是与所在院系对应的专业测评。几个院系共用同一个专业测评时，也会看到适合各自院系的示例和说明。",
        },
        {
          q: "研究生也能参加测评吗？",
          a: "可以。学生在第一个页面选择学位阶段后，会按硕士、博士或博士后的场景作答。也可以以研究生院为单位开通。",
        },
        {
          q: "开通需要准备什么？",
          a: "告诉我们要开放测评的院系、大致人数和管理员的联系方式即可。学生名单在发放账号时上传到管理后台。",
        },
        {
          q: "学生可以再次查看结果吗？",
          a: "学生登录后，随时可以重新打开网页版结果报告和PDF。",
        },
        {
          q: "费用如何确定？",
          a: "根据院系和人数规模确定。欢迎咨询，我们会结合学校的情况介绍合适的方案。",
          link: { label: "合作咨询", href: "/contact" },
        },
      ],
    },
    closing: {
      title: "为贵校介绍合适的合作方式",
      lead: "告诉我们学校名称、院系和预计人数，我们确认后会尽快回复。",
      primary: { label: "合作咨询", href: "/contact" },
      secondary: { label: "学校管理员登录", href: "/login" },
    },
  },

  assistant: {
    meta: {
      title: "MAT · AI求职助手 | CareerMatri",
      description: `MAT是CareerMatri的AI求职助手。测评结束后，它每周提醒你要做的事和截止日期，并把你自己找到的招聘信息和你的经历放在一起对照。30天通行证 ${krw(TRACK_KR.month.price)}，365天通行证 ${krw(TRACK_KR.year.price)}。`,
    },
    hero: {
      eyebrow: "订阅产品",
      title: ["测评之后的求职准备", "让MAT帮你接着推进"],
      lead:
        "MAT是在「我的CareerMatri」工作区里使用的AI求职助手。它会提醒你每周要做的事和截止日期，把你随手记下的内容整理成经历记录，还会把你自己找到的招聘信息和你的经历放在一起对照。",
      primary: { label: "开始使用MAT", href: "/me/track" },
      secondary: { label: "查看价格", href: "#plans" },
      note: "需要登录。没有账号的话，可以在登录页面以个人身份注册。",
    },
    features: {
      label: "功能",
      title: "每周帮你把求职准备往前推",
      items: [
        { title: "本周简报", body: "MAT页面顶部集中显示临近的截止日期、本周要做的一件事，以及你保存的多条招聘信息都要求、但你的记录里还没有的领域。截止日期可以加入手机日历，需要的话也可以每周收一封简报邮件。" },
        { title: "把笔记整理成经历记录", body: "随手写下最近做过的事，就能整理出几条可选的经历记录。确认无误后由你自己保存。" },
        { title: "招聘信息与经历对照", body: "粘贴你自己找到的招聘信息，MAT会逐条列出每项要求：哪些能用你的经历说明，哪些还没有对应的经历。更换关注的行业或岗位后，会按新的标准重新对比。" },
        { title: "求职材料句子框架", body: "针对招聘信息里的每项必备要求，MAT用你记录的经历搭出三句话的框架。记录里没有的内容不会编进去，而是留空，由你自己补充完善。" },
        { title: "研究生科研成果对照", body: "硕士、博士和博士后可以把研究岗位招聘中的论文、专利和项目要求与自己的研究记录单独对照，并获得围绕学位研究常被问到的面试问题和可以带去的记录。" },
      ],
      planned: "月度变化报告 · 准备中",
      plannedNote: "按月汇总变化的报告正在准备中。",
    },
    plans: {
      label: "价格",
      title: "按使用时长选择",
      lead: "不自动续费，到期后自动结束，不会再次扣费。",
      items: [
        {
          name: "30天通行证",
          price: krw(TRACK_KR.month.price),
          unit: "可使用30天",
          body: "先用一个月，再决定要不要继续。",
          cta: { label: "开通30天通行证", href: "/me/track" },
        },
        {
          name: "365天通行证",
          price: krw(TRACK_KR.year.price),
          unit: "可使用365天",
          body: "比连买十二次30天通行证更划算，适合用一整个学年持续准备。",
          featured: true,
          cta: { label: "开通365天通行证", href: "/me/track" },
        },
      ],
      notes: [
        "不自动续费，到期后自动结束。",
        "在CareerMatri应用的MAT页面付款。",
      ],
      trial: "购买PRO结果报告，MAT首月免费。",
    },
    faq: {
      label: "常见问题",
      title: "关于MAT的常见问题",
      items: [
        {
          q: "研究生用得上吗？",
          a: "MAT 会读取您在测评中选择的学位阶段：硕士先整理可以迁移的方法，博士先区分自己决定的和被给定的，博士后先写清自己牵头的范围。对论文和专利要求，只显示记录中是否有，不判断篇数是否达标。",
        },
        {
          q: "每个月会自动扣费吗？",
          a: "不会。30天和365天通行证都是一次性付款，到期后自动结束。",
        },
        {
          q: "买了PRO结果报告，免费的一个月怎么领？",
          a: "登录后在MAT页面即可领取免费的一个月。每人限领一次。",
          link: { label: "打开MAT页面", href: "/me/track" },
        },
        {
          q: "什么时候能收到月度变化报告？",
          a: "目前还在准备中，暂不承诺上线日期。上线后会第一时间在MAT页面通知你。",
        },
        {
          q: "怎么退款？",
          a: "退款标准详见退款政策，建议付款前先看一下。",
          link: { label: "查看退款政策", href: "/legal/refund" },
        },
      ],
    },
    closing: {
      title: "先把本周要做的事理一理",
      lead: "登录后在MAT页面即可开始。还没做测评的话，也可以先做测评。",
      primary: { label: "开始使用MAT", href: "/me/track" },
      secondary: { label: "先做测评", href: "/cores" },
    },
  },

  contact: {
    meta: {
      title: "合作咨询 | CareerMatri",
      description: "受理高校与机构的合作及使用咨询。邮箱 hari_info@hari.re.kr，电话 044-867-7211。",
    },
    eyebrow: "合作咨询",
    title: "合作与使用，欢迎咨询",
    lead:
      "我们通过邮件和电话受理高校与机构采用、个人使用及合作洽谈等咨询。在下方填好内容，即可直接用邮件发送。",
    direct: {
      title: "直接联系",
      emailLabel: "邮箱",
      telLabel: "电话",
      hoursNote: "不方便通话时，请发邮件留言，我们看到后会回复。",
    },
    company: { title: "公司信息" },
    form: {
      title: "填写咨询内容",
      lead: "填好各栏后点击按钮，会打开你常用的邮件应用并自动填入内容。",
      honest: "本页面不会保存或代发内容，需要在邮件应用中点击发送才会寄出。",
      fields: {
        org: "机构·学校名称",
        orgHint: "例：OO大学就业指导中心",
        name: "负责人姓名",
        nameHint: "例：张三",
        reply: "联系方式",
        replyHint: "邮箱或电话号码",
        type: "咨询类型",
        size: "预计人数",
        sizeHint: "例：3个院系，约300人",
        message: "咨询内容",
        messageHint: "可写下计划开始使用的时间或想了解的问题。",
      },
      types: ["高校与机构采用", "按院系采用", "个人使用", "MAT（AI求职助手）", "合作及其他"],
      subject: "[CareerMatri咨询]",
      bodyIntro: "以下是在CareerMatri官网填写的咨询内容。",
      send: "用邮件应用发送",
      copy: "复制内容",
      opened:
        "邮件应用已打开，请在其中点击发送。如果邮件应用没有打开，请复制内容，发送到上方邮箱。",
      copiedAll: "内容已复制。请粘贴到你常用的邮箱，发送到上方地址。",
      needOrg: "咨询内容和机构名称请至少填写一项。",
    },
    after: {
      title: "发送之后",
      items: [
        "我们看到你发来的内容后，会通过你留下的联系方式回复。",
        "高校和机构的咨询，我们会结合院系和人数介绍相应的合作方式。",
        "个人使用的咨询，会在核实付款和账号情况后答复。",
      ],
    },
    others: {
      title: "其他入口",
      items: [
        { label: "学校管理员登录", href: "/login" },
        { label: "客户支持（订单、退款、密码）", href: "/support" },
        { label: "服务条款", href: "/legal/terms" },
        { label: "隐私政策", href: "/legal/privacy" },
      ],
    },
  },

  notFound: {
    title: "页面不存在",
    body: "该页面可能已更改地址或已被删除。你可以返回首页重新查找，或直接开始测评。",
    home: { label: "返回首页", href: "/" },
    start: { label: "开始测评", href: "/cores" },
  },

  legal: {
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
      heading: "经营者信息",
      company: "公司名称",
      ceo: "代表人",
      address: "地址",
      tel: "电话",
      email: "邮箱",
      bizNo: "营业登记号",
      mailOrderNo: "通信销售业申报号",
      jobInfoNo: "职业信息提供业务备案号",
      privacyOfficer: "个人信息保护负责人",
      unset: "待确认",
    },
  },

  footer: {
    tagline: "分专业职业诊断与职业工作区",
    columns: [
      {
        title: "服务",
        links: [
          { label: "服务介绍", href: "/#glance" },
          { label: "专业列表", href: "/#majors" },
          { label: "高校与机构", href: "/universities" },
          { label: "MAT · AI求职助手", href: "/assistant" },
          { label: "价格", href: "/pricing" },
        ],
      },
      {
        title: "快速入口",
        links: [
          { label: "开始测评", href: "/cores" },
          { label: "登录", href: "/login" },
          { label: "学校管理员登录", href: "/login" },
          { label: "合作咨询", href: "/contact" },
          { label: "客户支持", href: "/support" },
        ],
      },
      {
        title: "条款",
        links: [
          { label: "服务条款", href: "/legal/terms" },
          { label: "隐私政策", href: "/legal/privacy" },
          { label: "退款政策", href: "/legal/refund" },
        ],
      },
    ],
    copyright: "© 2026 주식회사 에이치에이연구원",
  },
};
