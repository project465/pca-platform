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
    title: "CareerMatri | 按专业的职业诊断与职业工作区",
    description:
      "通过按专业设计的诊断测评，梳理你至今做过的事；再在结果报告和我的CareerMatri工作区里，一直延续到下一步该做什么。高校·机构可按院系引入。",
    ogAlt: "CareerMatri 按专业的职业诊断",
  },

  ui: {
    skip: "跳到正文",
    menu: "打开菜单",
    close: "关闭菜单",
    mockTag: "界面示例",
    copy: "复制",
    copied: "已复制",
    external: "将前往CareerMatri应用",
    langLabel: "语言",
    appLangNote:
      "CareerMatri应用中的注册、测评和结果页面目前只提供韩语和英语版本，因此点击按钮后会打开英语版本。",
  },

  nav: {
    items: [
      { label: "服务介绍", href: "/#how" },
      { label: "高校·机构", href: "/universities" },
      { label: "AI求职助手", href: "/assistant" },
      { label: "价格", href: "/pricing" },
      { label: "引入咨询", href: "/contact" },
    ],
    staffLogin: { label: "学校负责人登录", href: "/login" },
    login: { label: "登录", href: "/login" },
    start: { label: "开始测评", href: "/cores" },
    startShort: "开始测评",
  },

  home: {
    hero: {
      eyebrow: "按专业的职业诊断 · 结果报告 · 职业工作区",
      title: ["看看你在专业里做过的事", "能通向哪些工作"],
      lead:
        "CareerMatri通过按专业设计的诊断测评，梳理你在课程、作业和项目中做过的事，以及当时由你亲自决定的部分。拿到结果报告后，你可以在自己的工作区里继续补充经历，接着推进下一步。",
      primary: { label: "开始测评", href: "/cores" },
      secondary: { label: "高校·机构引入咨询", href: "/contact" },
      note: "已经从学校拿到账号了吗？",
      noteLink: { label: "登录后开始", href: "/login" },
    },
    mock: {
      label: "界面示例",
      brandSub: "机械工程",
      nav: ["首页", "测评", "当前要做的事", "当前状态", "经历", "结果记录"],
      title: "我的职业",
      meta: "机械工程 · 最近更新 2026-10-18",
      todoLabel: "当前要做的事",
      todoTitle: "把一段经历整理成一页",
      todoBody: "把你亲自定下的标准写成一句话，面试时就能直接拿出来用。",
      todoCta: "现在整理",
      todoMore: "另有2件要做的事",
      stateLabel: "当前状态",
      stateSub: "目前能讲清楚的主要领域",
      tiles: [
        { name: "结构·耐久分析", sub: "分析模型 · 分析报告" },
        { name: "材料·强度·失效", sub: "分析报告 · 材料规格" },
        { name: "试验·测量", sub: "试验计划书 · 检测报告" },
      ],
      changeLabel: "最近变化",
      changes: [
        { text: "已确认你在机构·产品设计中亲自定下的条件和标准", date: "10-18" },
        { text: "新增的经历让试验·测量领域的依据更充分了", date: "10-05" },
      ],
    },
    how: {
      label: "使用方式",
      title: "从测评开始，在工作区里持续推进",
      lead:
        "这不是做一次就结束的测评。拿到结果报告后，只要继续补充经历，当前状态和下一步要做的事都会随之更新。",
      steps: [
        {
          no: "01",
          title: "按专业的诊断测评",
          body: "选择自己的专业，回答在课程、作业和项目中做过的事，以及当时由你亲自决定的部分。",
          points: [
            "每个专业都按该领域的实际工作单独设计题目",
            "作答即时保存，中途关闭也能接着做",
            "不考查适性，也不问性格类型",
          ],
        },
        {
          no: "02",
          title: "结果报告（网页·PDF）",
          body: "能讲清楚的经历、还需补充的部分和下一步要做的事，汇总在一份文档里。",
          points: [
            "可在网页上直接查看，也可下载PDF",
            "同时写明已确认的经历能通向哪些行业和岗位",
            "整理好可用于求职材料和面试的表述素材",
          ],
        },
        {
          no: "03",
          title: "我的CareerMatri工作区",
          body: "补充经历后，当前状态会重新计算，下一步要做的事也会随之变化。",
          points: [
            "按补充经历、更新当前状态、明确下一步的顺序推进",
            "测评当时的结果单独保存，不会被改动",
            "登录后随时可以重新打开结果报告",
          ],
        },
      ],
    },
    report: {
      label: "结果报告",
      title: "结果报告里有这些内容",
      lead:
        "结果报告只依据你的作答生成。哪些已经确认、哪些还是空白，都按顺序整理好，学生可以自己逐项对照。",
      items: [
        { title: "一眼看懂的结果", body: "把目前已确认的经历、优先查看的领域和当前要做的事放在第一页。" },
        { title: "我已有的依据", body: "把做过的事、亲自决定的部分和留下的成果连起来呈现。" },
        { title: "还需补充的部分", body: "按领域列出不足之处，并说明为什么需要补上。" },
        { title: "行业·岗位的连接", body: "说明已确认的经历会在哪些行业和岗位中用到。" },
        { title: "下一步要做的事", body: "具体给出下一步要整理的任务，以及到时应留下的成果。" },
        { title: "求职材料·面试表述", body: "根据你选的答案，整理出可以写进求职材料的句子框架。" },
      ],
      note:
        "结果报告不判断适性，也不预测能否被录用，更不做排名。不同等级包含的深度可能有所不同。",
      mock: {
        label: "结果报告示例",
        school: "职业分析报告",
        docTitle: "工商管理系 · 经营综合",
        docMeta: "PRO · 2026-10-16 作答",
        headline: "在经营战略·规划方向，你有可以写进求职材料的经历",
        headlineSub: "做过的事和当时亲自决定的部分都已得到确认。",
        cells: [
          {
            label: "已确认的经历",
            title: "经营战略·规划 · 市场营销·市场",
            body: "曾从多个方案中依据理由选定一个，并按项目拆分了预算。",
          },
          {
            label: "当前要做的事",
            title: "把当时亲自决定的部分记下来",
            body: "试着用三句话写下你调整过的需求条件。",
          },
          { label: "留下的依据", title: "目标与指标表 · 商业计划书", body: "可以写进求职材料的素材已经齐了。" },
          { label: "还需补充的部分", title: "数据·决策", body: "你还没有写下亲自定下的标准和留下的成果。" },
        ],
      },
    },
    majors: {
      label: "专业",
      title: "通过高校·机构合作运营20个专业测评",
      lead:
        "每个专业的题目都依据该领域实际要做的工作和判断来设计。即使各校的院系名称不同，也会对接到最接近的专业测评。",
      groups: [
        { name: "工程·技术", items: ["机械工程", "电气电子工程", "计算机·软件", "建筑·室内建筑", "土木·铁道建设"] },
        { name: "生命·健康", items: ["生物·生命工程", "护理", "保健·医疗福利", "食品", "体育·运动康复", "园艺·森林·景观"] },
        { name: "经管·社会", items: ["经营", "行政", "法学·警察", "心理学", "教育"] },
        { name: "人文·艺术", items: ["韩国语·语言·文学", "媒体·广告公关·演出", "视觉·设计", "时尚·美容·造型"] },
      ],
      note:
        "开放哪些专业取决于高校·机构的合作范围。目前可以开始的专业，请在测评开始页面查看。",
      cta: { label: "找到我的专业并开始", href: "/cores" },
    },
    global: {
      label: "海外",
      title: "我们也在海外开展",
      lead:
        "CareerMatri的诊断引擎（PCA）已在韩国以外使用过。工程类岗位即使国家不同，要求的判断也是一样的，所以同一套题目会翻译成当地语言使用。",
      legend: { done: "已开展的国家", planned: "计划开展" },
      countries: [
        { iso: "410", name: "韩国", status: "done" },
        { iso: "792", name: "土耳其", status: "done", schools: ["安卡拉社会科学大学（ASBU）"] },
        { iso: "276", name: "德国", status: "done" },
        { iso: "840", name: "美国", status: "done" },
        { iso: "392", name: "日本", status: "done" },
        { iso: "156", name: "中国", status: "done" },
        { iso: "398", name: "哈萨克斯坦", status: "planned" },
        { iso: "250", name: "法国", status: "planned" },
        { iso: "710", name: "南非", status: "planned" },
        { iso: "608", name: "菲律宾", status: "planned" },
      ],
      source: "以ACADEMIX PCA介绍资料为准。计划开展的国家尚未开始。",
      samples: {
        title: "用当地语言看到的测评与结果报告",
        lead:
          "我们用五种语言展示机械工程测评中的同一道题。英语和土耳其语为原文题目，日语、中文和俄语为译本。",
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
      title: "我们公开测评是依据什么建立的",
      lead:
        "测评体系已完成著作权登记，并参考国内外职业与测评标准设计。验证工作会把已完成的和正在进行的分开说明。",
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
          body: "招聘信息只做介绍，投递由学生本人完成。",
          items: ["职业信息提供业务备案 第J1700020220007号", "学生个人的作答和结果报告不向学校负责人公开", "统计中不足5人的单元格不公开人数"],
        },
      ],
      verify: {
        title: "验证工作这样推进",
        lead: "分数只按事先定好的规则计算。因此同样的作答永远得到同样的结果，学校负责人也可以回溯结果的依据。",
        statusLabel: { done: "已完成", doing: "进行中", next: "计划中" },
        steps: [
          { status: "done", title: "三种语言的同一套题目", body: "韩语、英语、土耳其语题目已逐题对齐，确保含义一致。" },
          { status: "done", title: "同样的作答，同样的结果", body: "每次发布时自动检查同样的作答是否得到同样的结果。" },
          { status: "done", title: "守住题目的含义", body: "即使润色措辞，也逐题核对所测内容没有改变。" },
          { status: "doing", title: "专业人士审阅", body: "已准备各专业的审阅资料，正持续邀请该领域专家审阅。" },
          { status: "next", title: "试点与统计分析", body: "用真实作答数据分析信度与效度。" },
          { status: "next", title: "建立比较基准", body: "作答人数足够后，在同一专业内建立可供比较的基准。" },
        ],
      },
      note: "在建立比较基准之前，结果报告中不标注百分位或排名。",
      math: {
        title: "分数这样计算",
        lead: "所有分数只按下面的公式计算。权重和转换矩阵放在数据表里而不是写在代码中，所以按院系或国家调整时，计算方法保持不变。",
        steps: [
          {
            no: "01",
            title: "领域分数",
            formula: "S<sub>a</sub> = 25 · ( x̄<sub>a</sub> − 1 ),&ensp; x̄<sub>a</sub> = <sup>1</sup>&frasl;<sub>n</sub> Σ<sub>i</sub> x<sub>i</sub>",
            body: "把一个职业领域题目的平均分（1~5分）换算到0~100。1分为0，3分为50，5分为100。",
          },
          {
            no: "02",
            title: "测量误差",
            formula: "SE<sub>a</sub> = 25 · s<sub>a</sub> / √n",
            body: "根据同一领域内作答的离散程度估算误差。不使用固定值，而是按每个人分别计算。",
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
            body: "误差按构建轴分数时的同一组权重传递，每个轴的可信程度也随之一并算出。",
          },
          {
            no: "05",
            title: "个人内部的相对位置",
            formula: "z<sub>k</sub> = ( A<sub>k</sub> − Ā ) / s<sub>A</sub>,&ensp; |z<sub>k</sub>| ≤ 3",
            body: "各轴关联的领域数量不同，容易产生偏差，因此换算成这个人在各轴之间的相对高低。",
          },
          {
            no: "06",
            title: "职业适配度",
            formula: "F<sub>j</sub> = 0.75 · 100σ(ℓ<sub>j</sub>) + 0.25 · 100σ(p<sub>j</sub>),&ensp; σ(z) = 1 / ( 1 + e<sup>−1.2z</sup> )",
            body: "用每个职业看重的轴的权重v求出活动偏好 ℓ = Σ v·z / Σ v，再与工作风格分数p按3 : 1合并。",
          },
          {
            no: "07",
            title: "区间与分组",
            formula: "F<sub>j</sub> ± SE(F<sub>j</sub>)&ensp;(约 68% 区间)",
            body: "区间重叠的职业不排名次，而是作为同一组呈现。小于误差的差距不会用来区分第一和第二。",
          },
          {
            no: "08",
            title: "依据判定（专业测评）",
            formula: "有依据 ⇔ |C| ≥ 4 ∧ R ⊆ C ∧ O ≥ 1",
            body: "专业测评不做分数相加。已确认的判断轴C达到4个以上、该领域的必要轴R全部包含在内、并留下了成果O，才算“有依据的领域”。",
          },
          {
            no: "09",
            title: "信度分析",
            formula: "α = <sup>k</sup>&frasl;<sub>k−1</sub> · ( 1 − Σ<sub>i</sub> σ<sub>i</sub><sup>2</sup> / σ<sub>X</sub><sup>2</sup> )",
            body: "积累到真实作答数据后，将按领域计算内部一致性（克朗巴哈α系数）并公开。",
            status: "next",
          },
        ],
        weights: {
          title: "权重示例",
          lead: "从机械工程测评的实际权重表中选取了两个领域。每个领域的权重合计为1。",
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
          note: "权重存放在数据表（job_area_axis_weights）中；一旦调整就升级版本，确保此前作答者的结果不受影响。",
        },
        nextLabel: "计划中",
      },
    },
    campus: {
      label: "高校·机构",
      title: "按院系开放测评，在一个界面里查看进度",
      lead:
        "负责人为学生发放账号，查看作答进度和各院系统计。学生通过学校专属地址进入，参加同样的测评并拿到同样的结果报告。",
      points: [
        { title: "按院系开放测评", body: "为每个签约院系开放对应专业的测评。" },
        { title: "发放学生账号", body: "账号和密码可逐个发放，也可通过CSV一次性发放。" },
        { title: "进度与院系统计", body: "按院系查看已开始和已完成的人数，不足5人的单元格不公开。" },
        { title: "导出CSV", body: "可下载名单和进度的CSV，用于校内汇报。" },
      ],
      primary: { label: "查看高校·机构介绍", href: "/universities" },
      secondary: { label: "引入咨询", href: "/contact" },
    },
    personal: {
      label: "个人使用",
      title: "没有学校账号也可以使用",
      lead:
        "你可以以个人身份注册使用。测评价格和当前可购买的产品，请在CareerMatri应用的价格页面查看。",
      cards: [
        {
          tag: "测评与结果报告",
          title: "按专业的诊断测评",
          body: "完成测评后可获得网页版结果报告和PDF，并开通我的CareerMatri工作区。",
          points: [
            "价格及各等级的区别，请在应用的价格页面查看",
            "在回答第一道题之前可以申请退款",
          ],
          cta: { label: "查看价格", href: "/pricing" },
        },
        {
          tag: "订阅",
          title: "MAT · AI求职助手",
          body: "测评之后，也会每周帮你盯住要做的事和截止日期，并把收藏的招聘信息和你的经历并排对照。",
          price: `30天通行证 ${krw(TRACK_KR.month.price)} · 365天通行证 ${krw(TRACK_KR.year.price)}`,
          priceNote: "不自动续费",
          points: [
            "到期后自动结束，不会再次扣费",
            "购买PRO结果报告，可免费使用第一个月",
          ],
          cta: { label: "了解MAT", href: "/assistant" },
        },
      ],
    },
    faq: {
      label: "常见问题",
      title: "开始之前大家常问的问题",
      items: [
        {
          q: "学校给了我账号，应该从哪里进入？",
          a: "通过学校告知的专属地址，或在CareerMatri登录页面输入拿到的账号和密码即可进入。",
          link: { label: "打开登录页面", href: "/login" },
        },
        {
          q: "个人也可以使用吗？",
          a: "可以以个人身份注册使用。价格和当前可购买的产品，请在应用的价格页面查看。",
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
        { q: "会预测我能否被录用，或者给出排名吗？", a: "不会。我们写下的是从作答中确认的经历、还需补充的部分和下一步要做的事。" },
        {
          q: "这是经过验证的测评吗？",
          a: "目前仍处于试点和认知访谈阶段，所以我们不称它为经过验证的测评。请把结果作为规划职业方向时的参考资料。",
        },
      ],
    },
    closing: {
      title: "用你的专业，开始第一次测评",
      lead: "有学校账号就直接登录，没有的话以个人身份注册即可开始。",
      primary: { label: "开始测评", href: "/cores" },
      secondary: { label: "引入咨询", href: "/contact" },
    },
  },

  universities: {
    meta: {
      title: "高校·机构引入 | CareerMatri",
      description:
        "以学校账号运营按院系的职业诊断。学生账号发放、进度查看、院系统计和CSV导出，都可在负责人界面完成。",
    },
    hero: {
      eyebrow: "高校·机构",
      title: ["按院系的职业诊断", "以学校账号统一运营"],
      lead:
        "负责人发放学生账号后，学生通过学校专属地址进入参加测评。进度和各院系统计可在负责人界面查看，并导出为CSV。",
      primary: { label: "咨询引入", href: "/contact" },
      secondary: { label: "学校负责人登录", href: "/login" },
    },
    mock: {
      label: "界面示例 · 虚构的学校和数字",
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
      label: "运营流程",
      title: "从引入到查看结果，共六步",
      lead: "从发放学生账号到查看统计，都在负责人界面完成，无需另外安装程序。",
      steps: [
        { title: "确定院系和人数", body: "确定要开放测评的院系和人数。即使院系名称不同，也会对接到最接近的专业测评。" },
        { title: "获取负责人账号", body: "CareerMatri为学校负责人创建账号。" },
        { title: "发放学生账号", body: "在负责人界面逐个发放账号和密码，或通过CSV一次性发放。" },
        { title: "通过学校专属地址作答", body: "学生通过学校专属地址进入，选择所在院系后参加测评。" },
        { title: "查看进度与统计", body: "在负责人界面查看已开始、已完成人数和各院系统计。" },
        { title: "导出CSV", body: "下载名单、进度和统计的CSV。" },
      ],
    },
    features: {
      label: "负责人界面",
      title: "负责人可以自己完成的工作",
      items: [
        { title: "添加学生与发放账号", body: "可逐个添加，也可通过CSV一次性上传。上传前可先预览确认。" },
        { title: "重新发放密码", body: "为忘记密码的学生发放新的初始密码。" },
        { title: "停用与重新启用账号", body: "因休学或毕业不再使用的账号可先停用，需要时再重新启用。" },
        { title: "每位学生的进度", body: "查看每位学生处于未开始、进行中还是已完成。" },
        { title: "各院系统计", body: "按学院和院系查看目标人数、已开始和已完成人数。" },
        { title: "未作答学生名单", body: "只筛选尚未开始的学生，下载为CSV。" },
        { title: "导出CSV", body: "下载名单、进度和统计的CSV，用于校内汇报。" },
        { title: "允许重新作答", body: "学校测评默认只做一次，只有负责人允许的学生才能再做一次。" },
        { title: "MAT学校使用权", body: "在学校确定的人数范围内，由负责人为学生开通6个月或1年的MAT（AI求职助手）。费用一并纳入引入合同。" },
      ],
    },
    access: {
      label: "学生访问",
      title: "学生通过学校专属地址进入",
      body:
        "每所学校都有专属地址。学生在该地址选择所在院系，用拿到的账号登录后即可开始测评。",
      url: `${PLATFORM_URL.replace(/^https?:\/\//, "")}/campus/学校代码`,
      urlNote: "学校代码在引入时一并确定。",
      login: { label: "查看学生登录页面", href: "/login" },
    },
    privacy: {
      label: "个人信息",
      title: "负责人能看到什么、看不到什么",
      items: [
        "学生个人的作答和结果报告不会出现在负责人界面中。",
        "统计中不足5人的单元格不公开人数。",
        "CSV中只包含名单、进度和统计，不包含每道题的作答。",
        "初始密码只在发放时显示一次，不会保存。",
      ],
    },
    faq: {
      label: "常见问题",
      title: "引入前大家常问的问题",
      items: [
        {
          q: "不同院系做的测评不一样吗？",
          a: "是的。学生参加的是所在院系对接的专业测评。即使几个院系使用同一个专业测评，也会收到适合各自院系的示例和说明。",
        },
        {
          q: "引入需要准备什么？",
          a: "告诉我们要开放测评的院系、大致人数和负责人联系方式即可。学生名单在发放账号时，于负责人界面上传。",
        },
        {
          q: "学生可以再次查看结果吗？",
          a: "学生登录后，随时可以重新打开网页版结果报告和PDF。",
        },
        {
          q: "费用怎么定？",
          a: "根据院系和人数规模确定。欢迎来咨询，我们会结合学校的情况介绍合适的方案。",
          link: { label: "咨询引入", href: "/contact" },
        },
      ],
    },
    closing: {
      title: "为你的学校介绍合适的引入方式",
      lead: "告诉我们学校名称、院系和预计人数，我们确认后会尽快回复。",
      primary: { label: "咨询引入", href: "/contact" },
      secondary: { label: "学校负责人登录", href: "/login" },
    },
  },

  assistant: {
    meta: {
      title: "MAT · AI求职助手 | CareerMatri",
      description: `MAT是CareerMatri的AI求职助手：测评之后，也会每周帮你盯住要做的事和截止日期，并把你自己找到的招聘信息和你的经历对照着看。30天通行证 ${krw(TRACK_KR.month.price)}，365天通行证 ${krw(TRACK_KR.year.price)}。`,
    },
    hero: {
      eyebrow: "订阅产品",
      title: ["测评之后的准备", "交给MAT接着推进"],
      lead:
        "MAT是在我的CareerMatri工作区中使用的AI求职助手。它会提醒你每周要做的事和截止日期，帮你把随手记下的内容整理成经历记录，并把你自己找到的招聘信息和你的经历对照着看。",
      primary: { label: "开始使用MAT", href: "/me/track" },
      secondary: { label: "查看价格", href: "#plans" },
      note: "需要登录。没有账号的话，可以在登录页面以个人身份注册。",
    },
    features: {
      label: "能做什么",
      title: "帮你每周持续推进求职准备",
      items: [
        { title: "每周要做的事与截止提醒", body: "在应用内提醒你本周要做的一件事和即将到来的截止日期。如有需要，也可以每周通过邮件接收一次。" },
        { title: "把笔记整理成经历记录", body: "随手写下最近做过的事，就会整理成经历记录的选项。确认无误后，由你自己保存。" },
        { title: "招聘信息与经历对照", body: "粘贴你自己找到的招聘信息，会按每项要求分开显示：哪些能用你的经历来说明，哪些还是空白。" },
        { title: "更换关注的行业·岗位后重新对比", body: "更换关注的行业或岗位后，会按新的标准重新对比你的经历。" },
      ],
      planned: "月度变化报告 · 准备中",
      plannedNote: "汇总一个月内变化的报告正在准备中。",
    },
    plans: {
      label: "价格",
      title: "按需要的时长选择",
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
          body: "比买十二次30天通行证更省，适合一整个学年持续准备。",
          featured: true,
          cta: { label: "开通365天通行证", href: "/me/track" },
        },
      ],
      notes: [
        "不自动续费，到期后自动结束。",
        "付款在CareerMatri应用的MAT页面完成。",
      ],
      trial: "购买PRO结果报告，可免费使用MAT第一个月。",
    },
    faq: {
      label: "常见问题",
      title: "关于MAT大家常问的问题",
      items: [
        {
          q: "每个月会自动扣费吗？",
          a: "不会。30天和365天通行证都是一次性付款，到期后自动结束。",
        },
        {
          q: "我买了PRO结果报告，免费的一个月怎么领取？",
          a: "登录后在MAT页面即可领取免费的一个月。每人限领一次。",
          link: { label: "打开MAT页面", href: "/me/track" },
        },
        {
          q: "什么时候能收到月度变化报告？",
          a: "目前仍在准备中，所以暂不承诺日期。上线后会第一时间在MAT页面通知你。",
        },
        {
          q: "怎么退款？",
          a: "退款标准已整理在退款政策中，付款前请先看一下。",
          link: { label: "查看退款政策", href: "/legal/refund" },
        },
      ],
    },
    closing: {
      title: "先把本周要做的事理一理",
      lead: "登录后即可在MAT页面直接开始。如果还没做测评，也可以先从测评开始。",
      primary: { label: "开始使用MAT", href: "/me/track" },
      secondary: { label: "先做测评", href: "/cores" },
    },
  },

  contact: {
    meta: {
      title: "引入咨询 | CareerMatri",
      description: "受理高校·机构引入和使用相关咨询。邮箱 hari_info@hari.re.kr，电话 044-867-7211。",
    },
    eyebrow: "引入咨询",
    title: "关于引入和使用，欢迎咨询",
    lead:
      "我们通过邮件和电话受理高校·机构引入、个人使用和合作咨询。在下方整理好内容，就可以直接用邮件发送。",
    direct: {
      title: "直接联系",
      emailLabel: "邮箱",
      telLabel: "电话",
      hoursNote: "如果不方便通话，请通过邮件留言，我们确认后会回复。",
    },
    company: { title: "公司信息" },
    form: {
      title: "整理要发送的邮件内容",
      lead: "填好各栏后点击按钮，会打开你常用的邮件应用并自动填入内容。",
      honest: "本页面不会保存或代为发送内容。需要在邮件应用中点击发送才会送达。",
      fields: {
        org: "机构·学校名称",
        orgHint: "例：OO大学就业指导中心",
        name: "负责人姓名",
        nameHint: "例：张三",
        reply: "回复联系方式",
        replyHint: "邮箱或电话号码",
        type: "咨询类型",
        size: "预计人数",
        sizeHint: "例：3个院系，约300人",
        message: "咨询内容",
        messageHint: "请写下计划引入的时间或想了解的问题。",
      },
      types: ["高校·机构引入", "按院系引入", "个人使用", "MAT（AI求职助手）", "合作·其他"],
      subject: "[CareerMatri咨询]",
      bodyIntro: "这是在CareerMatri官网整理的咨询内容。",
      send: "用邮件应用发送",
      copy: "复制内容",
      opened:
        "已打开邮件应用。需要在邮件应用中点击发送才会送达。如果邮件应用没有打开，请复制内容后发送到上方邮箱。",
      copiedAll: "内容已复制。请粘贴到你常用的邮箱，发送到上方地址。",
      needOrg: "请至少填写咨询内容或机构名称中的一项。",
    },
    after: {
      title: "咨询之后",
      items: [
        "我们确认你发来的内容后，会通过你留下的联系方式回复。",
        "对于高校·机构，我们会结合院系和人数介绍相应的引入方式。",
        "个人使用的咨询，会在核实付款和账号情况后答复。",
      ],
    },
    others: {
      title: "以下情况请直接前往",
      items: [
        { label: "学校负责人登录", href: "/login" },
        { label: "客户支持（订单·退款·密码）", href: "/support" },
        { label: "服务条款", href: "/legal/terms" },
        { label: "隐私政策", href: "/legal/privacy" },
      ],
    },
  },

  notFound: {
    title: "找不到你要的页面",
    body: "页面地址可能已变更或已删除。请回到首页重新查找，或直接开始测评。",
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
    tagline: "按专业的职业诊断与职业工作区",
    columns: [
      {
        title: "服务",
        links: [
          { label: "服务介绍", href: "/#how" },
          { label: "专业列表", href: "/#majors" },
          { label: "高校·机构", href: "/universities" },
          { label: "MAT · AI求职助手", href: "/assistant" },
          { label: "价格", href: "/pricing" },
        ],
      },
      {
        title: "快速入口",
        links: [
          { label: "开始测评", href: "/cores" },
          { label: "登录", href: "/login" },
          { label: "学校负责人登录", href: "/login" },
          { label: "引入咨询", href: "/contact" },
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
