import { PLATFORM_URL, HOME_DOMAIN } from "@/lib/domains";
import { TRACK_KR, krw } from "@/lib/prices";
import type { SiteContent } from "./model";

/**
 * 일본어판 (2026-10-21). `kr.ts` 를 옮긴 원고다. 구조·주소·번호·값은 kr 과 같고
 * 사람이 읽는 글만 일본어로 적는다. 요금은 `lib/prices.ts` 에서만 읽는다.
 */

const MONTH = `30日パス`;
const YEAR = `365日パス`;

export const ja: SiteContent = {
  key: "kr",
  lang: "ja",
  domain: HOME_DOMAIN,
  brand: "CareerMatri",
  platformUrl: PLATFORM_URL,

  meta: {
    title: "CareerMatri | 専攻別のキャリア診断とキャリアワークスペース",
    description:
      "専攻別の診断で、これまでの取り組みを確かめ、結果レポートとマイCareerMatriのワークスペースで次の一歩まで整理します。大学・機関は学科単位で導入できます。",
    ogAlt: "CareerMatri 専攻別のキャリア診断",
  },

  ui: {
    skip: "本文へスキップ",
    menu: "メニューを開く",
    close: "メニューを閉じる",
    mockTag: "画面イメージ",
    copy: "コピー",
    copied: "コピーしました",
    external: "CareerMatriアプリに移動します",
    langLabel: "言語",
    appLangNote:
      "CareerMatriアプリの画面（会員登録・診断・結果）は現在、韓国語と英語で提供しているため、ボタンからは英語版が開きます。",
  },

  nav: {
    items: [
      { label: "サービス紹介", href: "/#how" },
      { label: "大学・機関", href: "/universities" },
      { label: "AI就活アシスタント", href: "/assistant" },
      { label: "料金", href: "/pricing" },
      { label: "導入のご相談", href: "/contact" },
    ],
    staffLogin: { label: "学校担当者ログイン", href: "/login" },
    login: { label: "ログイン", href: "/login" },
    start: { label: "診断をはじめる", href: "/cores" },
    startShort: "診断開始",
  },

  home: {
    hero: {
      eyebrow: "専攻別キャリア診断・結果レポート・キャリアワークスペース",
      title: ["専攻で取り組んできたことが", "どんな仕事につながるのか確かめましょう"],
      lead:
        "CareerMatriは専攻別の診断で、授業や課題、プロジェクトで取り組んだことと、そのとき自分で決めたことを確かめます。結果レポートを受け取ったあとも、ワークスペースで経験を書き足しながら次の一歩に進めます。",
      primary: { label: "診断をはじめる", href: "/cores" },
      secondary: { label: "大学・機関の導入相談", href: "/contact" },
      note: "学校からIDを受け取りましたか？",
      noteLink: { label: "ログインしてはじめる", href: "/login" },
    },
    mock: {
      label: "画面イメージ",
      brandSub: "機械工学",
      nav: ["ホーム", "診断", "いまやること", "現在の状態", "経験", "結果の記録"],
      title: "マイキャリア",
      meta: "機械工学・最終更新 2026-10-18",
      todoLabel: "いまやること",
      todoTitle: "経験をひとつ、1ページにまとめる",
      todoBody: "自分で決めた基準を一行で書いておけば、面接でそのまま話せます。",
      todoCta: "いまからまとめる",
      todoMore: "ほかにやること 2件",
      stateLabel: "現在の状態",
      stateSub: "いま説明できる主な領域",
      tiles: [
        { name: "構造・耐久解析", sub: "解析モデル・解析レポート" },
        { name: "材料・強度・破損", sub: "分析レポート・材質仕様" },
        { name: "試験・計測", sub: "試験計画書・成績書" },
      ],
      changeLabel: "最近の変化",
      changes: [
        { text: "機構・製品設計で、自分で決めた条件と基準が確認されました", date: "10-18" },
        { text: "新しい経験で、試験・計測領域の根拠が増えました", date: "10-05" },
      ],
    },
    how: {
      label: "使い方",
      title: "診断から始めて、ワークスペースで続けていきます",
      lead:
        "診断は一度受けて終わりではありません。結果レポートを受け取ったあとも、経験を書き足すたびに、現在の状態と次に取り組むことが更新されます。",
      steps: [
        {
          no: "01",
          title: "専攻別の診断",
          body: "自分の専攻を選び、授業・課題・プロジェクトで取り組んだことと、そのとき自分で決めたことに答えます。",
          points: [
            "専攻ごとに、その分野の仕事をもとに設問をつくっています",
            "答えた設問はすぐに保存されるので、途中で閉じても続きから再開できます",
            "適性や性格タイプは問いません",
          ],
        },
        {
          no: "02",
          title: "結果レポート（Web・PDF）",
          body: "説明できる経験とまだ足りない部分、次に取り組むことを、一つのレポートで受け取れます。",
          points: [
            "Webですぐに見られ、PDFでダウンロードもできます",
            "確認された経験が、どの産業や職種につながるかもあわせて記載します",
            "応募書類や面接で使う文章の材料を整理します",
          ],
        },
        {
          no: "03",
          title: "マイCareerMatriのワークスペース",
          body: "経験を追加すると現在の状態が再計算され、次に取り組むことも変わります。",
          points: [
            "経験を追加すると現在の状態が更新され、次に取り組むことが変わります",
            "診断を受けた時点の結果は、あとから変わらないよう別に保存しています",
            "ログインすれば、結果レポートをいつでも見返せます",
          ],
        },
      ],
    },
    report: {
      label: "結果レポート",
      title: "結果レポートには、こんな内容が入っています",
      lead:
        "結果レポートは、回答した内容だけでつくります。何が確認でき、何がまだ足りないのかを学生が自分でたどれるよう、順を追って整理しています。",
      items: [
        { title: "結果のまとめ", body: "確認できた経験、まず見ておきたい領域、いま取り組むことを冒頭のページにまとめています。" },
        { title: "すでに持っている根拠", body: "取り組んだことと自分で決めたこと、手元に残る成果物を結びつけて示します。" },
        { title: "これから補うこと", body: "足りない部分を領域ごとに示し、なぜそこが必要なのかもあわせて説明します。" },
        { title: "産業・職種とのつながり", body: "確認された経験が、どの産業や職種で活かせるのかを示します。" },
        { title: "次に取り組むこと", body: "次にまとめる課題と、そのときに残す成果物を具体的に提案します。" },
        { title: "応募書類・面接の文章", body: "選んだ回答をもとに、応募書類に書く文章の骨組みを整理します。" },
      ],
      note:
        "結果レポートでは、適性や合格の見込みは示さず、順位もつけません。プランによって、含まれる内容の詳しさが異なる場合があります。",
      mock: {
        label: "結果レポートの例",
        school: "キャリア分析レポート",
        docTitle: "経営学科・経営一般",
        docMeta: "PRO・2026-10-16 回答",
        headline: "経営戦略・企画の分野で、応募書類に使える経験があります",
        headlineSub: "取り組んだことと、そのとき自分で決めたことが、あわせて確認されました。",
        cells: [
          {
            label: "確認された経験",
            title: "経営戦略・企画、マーケティング・市場",
            body: "複数の案から根拠を示して一つを選び、予算を項目ごとに分けました。",
          },
          {
            label: "いまやること",
            title: "そのとき自分で決めたことを書き留める",
            body: "依頼の内容を変えることになった条件を、3行で書き出してみましょう。",
          },
          { label: "残した根拠", title: "目標と指標の表・事業計画書", body: "応募書類に使える材料がそろいました。" },
          { label: "さらに補う部分", title: "データ・意思決定", body: "自分で決めた基準と手元の成果物が、まだ書かれていません。" },
        ],
      },
    },
    majors: {
      label: "専攻",
      title: "20専攻の診断を、学校・機関との契約で提供しています",
      lead:
        "専攻ごとに、その分野の実際の業務と判断をもとに設問をつくりました。学校によって学科名が異なる場合も、近い専攻の診断で受検できます。",
      groups: [
        { name: "工学・技術", items: ["機械工学", "電気電子工学", "コンピュータ・ソフトウェア", "建築・インテリア建築", "土木・鉄道建設"] },
        { name: "生命・保健", items: ["バイオ・生命工学", "看護", "保健・医療福祉", "食品", "体育・運動リハビリ", "園芸・森林・造園"] },
        { name: "経営・社会", items: ["経営", "行政", "法・警察", "心理学", "教育"] },
        { name: "人文・芸術", items: ["韓国語・言語・文学", "メディア・広告広報・公演", "視覚・デザイン", "ファッション・ビューティー・スタイル"] },
      ],
      note:
        "学校・機関の契約範囲によって、利用できる専攻が異なります。いま始められる専攻は、診断の開始画面で確認できます。",
      cta: { label: "自分の専攻を探してはじめる", href: "/cores" },
    },
    global: {
      label: "海外",
      title: "海外でも実施しています",
      lead:
        "CareerMatriの診断エンジン（PCA）は、韓国以外でも使われてきました。職務に求められる判断は国が違っても大きくは変わらないため、同じ設問をその国の言語に訳して使っています。",
      legend: { done: "実施した国", planned: "実施予定" },
      countries: [
        { iso: "410", name: "韓国", status: "done" },
        { iso: "792", name: "トルコ", status: "done", schools: ["アンカラ社会科学大学（ASBU）"] },
        { iso: "276", name: "ドイツ", status: "done" },
        { iso: "840", name: "アメリカ", status: "done" },
        { iso: "392", name: "日本", status: "done" },
        { iso: "156", name: "中国", status: "done" },
        { iso: "398", name: "カザフスタン", status: "planned" },
        { iso: "250", name: "フランス", status: "planned" },
        { iso: "710", name: "南アフリカ", status: "planned" },
        { iso: "608", name: "フィリピン", status: "planned" },
      ],
      source: "ACADEMIXのPCA紹介資料にもとづきます。「実施予定」の国では、まだ実施していません。",
      samples: {
        title: "その国の言語で見る診断と結果レポート",
        lead:
          "機械工学の診断から同じ設問を、5つの言語で並べてご紹介します。英語とトルコ語は原文の設問で、日本語・中国語・ロシア語は翻訳版です。",
        items: [
          {
            lang: "English",
            code: "en",
            langKo: "英語",
            status: "live",
            statusLabel: "診断・結果レポートの英語版あり",
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
            langKo: "トルコ語",
            status: "live",
            statusLabel: "トルコ語の原文設問",
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
            langKo: "日本語",
            status: "draft",
            statusLabel: "日本語翻訳版",
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
            langKo: "中国語",
            status: "draft",
            statusLabel: "中国語翻訳版",
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
            langKo: "ロシア語",
            status: "draft",
            statusLabel: "ロシア語翻訳版",
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
      label: "根拠",
      title: "何を根拠につくったのかを公開しています",
      lead:
        "診断の体系は著作権登録を済ませており、韓国内外の職務・検査の基準を参考に設計しました。検証については、完了したものと進行中のものを分けて記載しています。",
      cards: [
        {
          title: "著作権登録",
          body: "PCA診断体系を、韓国著作権委員会に登録しました。",
          items: ["C-2025-058658", "C-2025-059731", "C-2025-059732"],
        },
        {
          title: "参考にした基準",
          body: "職務の分類と診断の設計では、以下の基準を参考にしました。",
          items: [
            "NCS（韓国 国家職務能力標準）",
            "O*NET系の職業情報体系",
            "RIASEC系の職業興味理論",
            "NACE（欧州産業分類）",
            "OECDの職務・能力に関する資料",
            "AERA・APA・NCMEの教育・心理検査基準",
          ],
        },
        {
          title: "届出と運営の基準",
          body: "求人情報はご案内にとどめ、応募は学生ご本人が行います。",
          items: ["職業情報提供事業 届出 J1700020220007号", "個人の回答と結果レポートは学校の担当者には表示されません", "集計で5名未満の欄は数値を公開しません"],
        },
      ],
      verify: {
        title: "検証はこのように進めています",
        lead: "スコアはあらかじめ定めた規則だけで計算します。そのため同じ回答からは常に同じ結果が出て、学校の担当者も結果の根拠をたどって確かめられます。",
        statusLabel: { done: "完了", doing: "進行中", next: "予定" },
        steps: [
          { status: "done", title: "3言語で同じ設問", body: "韓国語・英語・トルコ語の設問を、1問ずつ同じ意味にそろえています。" },
          { status: "done", title: "同じ回答なら同じ結果", body: "公開のたびに、同じ回答に同じ結果が出るかを自動で確認しています。" },
          { status: "done", title: "設問の意味を守る", body: "文章を整えても測る内容が変わっていないか、設問ごとに照らし合わせています。" },
          { status: "doing", title: "専門家によるレビュー", body: "専攻ごとのレビュー資料を用意し、その分野の専門家によるレビューを続けています。" },
          { status: "next", title: "パイロットと統計分析", body: "実際の受検データで、信頼性と妥当性を分析します。" },
          { status: "next", title: "比較基準づくり", body: "受検者が十分に集まったら、同じ専攻の中で比べるための基準をつくります。" },
        ],
      },
      note: "比較基準ができるまでは、結果レポートにパーセンタイルや順位を記載しません。",
      math: {
        title: "スコアはこのように計算します",
        lead: "すべてのスコアは、以下の式だけで計算します。重みと変換行列はプログラムに書き込まずデータ表で管理しているため、学科や国に合わせて変えても計算方法は変わりません。",
        steps: [
          {
            no: "01",
            title: "領域スコア",
            formula: "S<sub>a</sub> = 25 · ( x̄<sub>a</sub> − 1 ),&ensp; x̄<sub>a</sub> = <sup>1</sup>&frasl;<sub>n</sub> Σ<sub>i</sub> x<sub>i</sub>",
            body: "一つの職務領域の設問の平均（1〜5点）を、0〜100に換算します。1点は0、3点は50、5点は100です。",
          },
          {
            no: "02",
            title: "測定誤差",
            formula: "SE<sub>a</sub> = 25 · s<sub>a</sub> / √n",
            body: "同じ領域の中で回答がどれだけばらついたかから、誤差を求めます。固定値は使わず、受検者ごとに計算します。",
          },
          {
            no: "03",
            title: "重みで活動軸をつくる",
            formula: "A<sub>k</sub> = Σ<sub>a</sub> w<sub>a,k</sub> x̄<sub>a</sub> / Σ<sub>a</sub> w<sub>a,k</sub>",
            body: "職務領域のスコアを、重み行列wで8つの活動軸（解析・計算、設計・構想、製作・実験など）に変換します。",
          },
          {
            no: "04",
            title: "誤差の伝播",
            formula: "SE(A<sub>k</sub>) = √ Σ<sub>a</sub> ( w<sub>a,k</sub> / Σw · SE<sub>a</sub> )<sup>2</sup>",
            body: "軸スコアの計算に使ったのと同じ重みで、誤差も変換します。これにより、軸ごとの信頼の度合いもあわせて求められます。",
          },
          {
            no: "05",
            title: "個人の中での位置",
            formula: "z<sub>k</sub> = ( A<sub>k</sub> − Ā ) / s<sub>A</sub>,&ensp; |z<sub>k</sub>| ≤ 3",
            body: "軸ごとに集まる領域の数が異なることによる偏りをなくすため、その人の中で軸同士を比べた高低に置き換えます。",
          },
          {
            no: "06",
            title: "職務適合度",
            formula: "F<sub>j</sub> = 0.75 · 100σ(ℓ<sub>j</sub>) + 0.25 · 100σ(p<sub>j</sub>),&ensp; σ(z) = 1 / ( 1 + e<sup>−1.2z</sup> )",
            body: "職務ごとに重視する軸の重みvを使って活動の好み ℓ = Σ v·z / Σ v を求め、業務傾向スコアpと3 : 1の比率で合成します。",
          },
          {
            no: "07",
            title: "区間とグループ",
            formula: "F<sub>j</sub> ± SE(F<sub>j</sub>)&ensp;(約68%区間)",
            body: "区間が重なる職務には順位をつけず、同じグループとして示します。誤差より小さな差で、1位と2位を分けることはしません。",
          },
          {
            no: "08",
            title: "根拠の判定（専攻別診断）",
            formula: "根拠あり ⇔ |C| ≥ 4 ∧ R ⊆ C ∧ O ≥ 1",
            body: "専攻別診断では、スコアを合算しません。確認された判断軸Cが4つ以上あり、その領域の必須軸Rをすべて含み、成果物Oが残っているとき、「根拠のある領域」と判定します。",
          },
          {
            no: "09",
            title: "信頼性分析",
            formula: "α = <sup>k</sup>&frasl;<sub>k−1</sub> · ( 1 − Σ<sub>i</sub> σ<sub>i</sub><sup>2</sup> / σ<sub>X</sub><sup>2</sup> )",
            body: "実際の受検データが集まったら、領域ごとに内的一貫性（クロンバックのα）を計算して公開します。",
            status: "next",
          },
        ],
        weights: {
          title: "重みの例",
          lead: "機械工学の診断で実際に使っている重み表から、2つの領域を抜き出しました。領域ごとの合計は1です。",
          areas: [
            {
              name: "設計・開発",
              rows: [
                { axis: "設計・構想", w: 0.45 },
                { axis: "解析・計算", w: 0.25 },
                { axis: "製作・実験", w: 0.2 },
                { axis: "改善・効率", w: 0.1 },
              ],
            },
            {
              name: "エネルギー・プラント",
              rows: [
                { axis: "現場・設備", w: 0.4 },
                { axis: "解析・計算", w: 0.25 },
                { axis: "調整・管理", w: 0.2 },
                { axis: "改善・効率", w: 0.15 },
              ],
            },
          ],
          note: "重みはデータ表（job_area_axis_weights）で管理しています。変更時はバージョンを上げ、過去の受検者の結果が変わらないようにしています。",
        },
        nextLabel: "予定",
      },
    },
    campus: {
      label: "大学・機関",
      title: "学科ごとに診断を導入し、進捗を一つの画面で確認できます",
      lead:
        "担当者は学生アカウントを発行し、受検の進捗と学科別の集計を確認します。学生は学校専用のURLからアクセスし、同じ診断と結果レポートを受け取ります。",
      points: [
        { title: "学科別の診断", body: "契約した学科ごとに、対応する専攻の診断を利用できます。" },
        { title: "学生アカウントの発行", body: "IDとパスワードを1人ずつ、またはCSVでまとめて発行します。" },
        { title: "進捗状況と学科別の集計", body: "開始・完了の人数を学科別に確認でき、5名未満の欄は公開しません。" },
        { title: "CSVエクスポート", body: "名簿と進捗状況をCSVでダウンロードし、学内の報告に使えます。" },
      ],
      primary: { label: "大学・機関向けの案内を見る", href: "/universities" },
      secondary: { label: "導入のご相談", href: "/contact" },
    },
    personal: {
      label: "個人での利用",
      title: "学校のアカウントがなくても利用できます",
      lead:
        "個人として登録して利用できます。診断の料金と、いま購入できる商品は、CareerMatriアプリの料金画面でご確認ください。",
      cards: [
        {
          tag: "診断と結果レポート",
          title: "専攻別の診断",
          body: "診断を終えると、Web版の結果レポートとPDFを受け取れ、マイCareerMatriのワークスペースも使えるようになります。",
          points: [
            "料金とプランごとの違いは、アプリの料金画面でご案内しています",
            "最初の設問に答える前であれば、返金を受けられます",
          ],
          cta: { label: "料金を見る", href: "/pricing" },
        },
        {
          tag: "期間パス",
          title: "MAT・AI就活アシスタント",
          body: "診断のあとも毎週の取り組みと締め切りを管理でき、保存した求人と自分の経験を並べて比べられます。",
          price: `${MONTH} ${krw(TRACK_KR.month.price)}・${YEAR} ${krw(TRACK_KR.year.price)}`,
          priceNote: "自動更新なし",
          points: [
            "期間が終わると自動的に終了し、再度決済されることはありません",
            "PROの結果レポートを購入すると、最初の1か月が無料になります",
          ],
          cta: { label: "MATについて詳しく見る", href: "/assistant" },
        },
      ],
    },
    faq: {
      label: "よくある質問",
      title: "はじめる前によくいただく質問",
      items: [
        {
          q: "学校からIDを受け取りました。どこからログインすればよいですか？",
          a: "学校から案内された専用URL、またはCareerMatriのログイン画面から、受け取ったIDとパスワードでログインしてください。",
          link: { label: "ログイン画面を開く", href: "/login" },
        },
        {
          q: "個人でも利用できますか？",
          a: "個人として登録して利用できます。料金と、いま購入できる商品は、アプリの料金画面でご確認ください。",
          link: { label: "料金を見る", href: "/pricing" },
        },
        {
          q: "診断の途中で閉じたら、最初からやり直しですか？",
          a: "いいえ。答えた設問はすぐに保存されるため、もう一度アクセスすると、中断したところから再開できます。",
        },
        {
          q: "結果レポートはどうやって受け取れますか？",
          a: "診断を終えるとWebですぐに見られ、PDFでダウンロードもできます。ログインすれば、いつでも見返せます。",
        },
        { q: "合格の見込みや順位はわかりますか？", a: "いいえ、お示ししていません。お示しするのは、回答から確認された経験とこれから補う部分、次に取り組むことです。" },
        {
          q: "検証済みの診断ですか？",
          a: "現在はパイロット調査と認知面接を進めている段階のため、検証済みの診断とはうたっていません。結果は、進路を考える際の参考資料としてお使いください。",
        },
      ],
    },
    closing: {
      title: "自分の専攻で、最初の診断を始めてみましょう",
      lead: "学校から受け取ったアカウントがあればログインして、なければ個人登録をしてから始められます。",
      primary: { label: "診断をはじめる", href: "/cores" },
      secondary: { label: "導入のご相談", href: "/contact" },
    },
  },

  universities: {
    meta: {
      title: "大学・機関での導入 | CareerMatri",
      description:
        "学科別のキャリア診断を、学校アカウントで運用できます。学生アカウントの発行から進捗・学科別集計の確認、CSVエクスポートまで、担当者画面で行えます。",
    },
    hero: {
      eyebrow: "大学・機関",
      title: ["学科別のキャリア診断を", "学校アカウントで運用できます"],
      lead:
        "担当者が学生アカウントを発行すると、学生は学校専用のURLからアクセスして受検します。進捗状況と学科別の集計は担当者画面で確認でき、CSVでダウンロードできます。",
      primary: { label: "導入について相談する", href: "/contact" },
      secondary: { label: "学校担当者ログイン", href: "/login" },
    },
    mock: {
      label: "画面イメージ・架空の学校と数値",
      title: "専攻診断の集計",
      meta: "2026年度 2学期",
      kpis: [
        { label: "対象者", value: "128", note: "登録した名簿にもとづく" },
        { label: "開始", value: "96", note: "診断を始めた学生" },
        { label: "完了", value: "71", note: "結果レポートを受け取った学生" },
      ],
      tableTitle: "学科別の進み具合",
      head: ["学科", "対象", "開始", "完了"],
      rows: [
        ["経営学科", "42", "35", "28"],
        ["電気電子工学科", "38", "30", "24"],
        ["看護学科", "44", "31", "19"],
        ["心理学科", "非公開", "非公開", "非公開"],
      ],
      hiddenNote: "5名未満の欄は数値を公開しません",
      exportLabel: "CSVをダウンロード",
    },
    flow: {
      label: "運用の流れ",
      title: "導入から結果の確認まで、6つのステップです",
      lead: "学生アカウントの発行から集計の確認まで、担当者画面で行えます。ソフトウェアのインストールは不要です。",
      steps: [
        { title: "学科と人数を決める", body: "診断を導入する学科と人数を決めます。学科名が異なる場合も、近い専攻の診断で対応します。" },
        { title: "担当者アカウントを受け取る", body: "CareerMatriが、学校の担当者アカウントを作成します。" },
        { title: "学生アカウントの発行", body: "担当者画面で、IDとパスワードを1人ずつ、またはCSVでまとめて発行します。" },
        { title: "学校専用URLから受検", body: "学生は学校専用のURLからアクセスし、所属学科を選んで受検します。" },
        { title: "進捗状況と集計の確認", body: "開始・完了の人数と学科別の集計を、担当者画面で確認します。" },
        { title: "CSVエクスポート", body: "名簿と進捗状況、集計をCSVでダウンロードします。" },
      ],
    },
    features: {
      label: "担当者画面",
      title: "担当者が自分で行えること",
      items: [
        { title: "学生の追加とアカウント発行", body: "1人ずつ追加するか、CSVでまとめてアップロードします。アップロードの前にプレビューで確認できます。" },
        { title: "パスワードの再発行", body: "パスワードを忘れた学生に、新しい初期パスワードを発行します。" },
        { title: "アカウントの停止と再開", body: "休学や卒業で使わなくなったアカウントを停止しておき、必要なときに再開します。" },
        { title: "学生ごとの進捗状況", body: "学生ごとに、開始前・進行中・完了の状態を確認します。" },
        { title: "学科別の集計", body: "学部・学科別に、対象者・開始・完了の人数を確認します。" },
        { title: "未受検の学生リスト", body: "まだ始めていない学生だけをまとめて、CSVでダウンロードします。" },
        { title: "CSVエクスポート", body: "名簿と進捗状況、集計をCSVでダウンロードし、学内の報告に使えます。" },
        { title: "再受検の許可", body: "学校での受検は1回が基本で、担当者が許可した学生だけがもう一度受検できます。" },
        { title: "MATの学校利用権", body: "学校が決めた人数の範囲で、担当者が学生にMAT（AI就活アシスタント）を6か月または1年間開放します。費用は導入契約に含まれます。" },
      ],
    },
    access: {
      label: "学生のアクセス",
      title: "学生は学校専用のURLからアクセスします",
      body:
        "学校ごとに専用のURLがあります。学生はそのURLで所属学科を選び、発行されたIDでログインして診断を始めます。",
      url: `${PLATFORM_URL.replace(/^https?:\/\//, "")}/campus/学校コード`,
      urlNote: "学校コードは、導入時にあわせて決めます。",
      login: { label: "学生ログイン画面を見る", href: "/login" },
    },
    privacy: {
      label: "個人情報",
      title: "担当者に見えるもの、見えないもの",
      items: [
        "学生個人の回答と結果レポートは、担当者画面には表示されません。",
        "集計で5名未満の欄は、数値を公開しません。",
        "CSVには名簿と進捗状況、集計だけが含まれ、設問ごとの回答は含まれません。",
        "初期パスワードは発行時に一度だけ表示し、保存しません。",
      ],
    },
    faq: {
      label: "よくある質問",
      title: "導入前によくいただく質問",
      items: [
        {
          q: "学科ごとに違う診断を受けるのですか？",
          a: "はい。学生は、所属学科にひもづいた専攻の診断を受けます。同じ専攻の診断を使う学科でも、学科に合った例と案内が表示されます。",
        },
        {
          q: "導入には何を準備すればよいですか？",
          a: "診断を導入する学科とおおよその人数、担当者の連絡先をお知らせください。学生の名簿は、アカウント発行時に担当者画面からアップロードします。",
        },
        {
          q: "学生は結果を見直せますか？",
          a: "学生はログインすれば、Webの結果レポートとPDFをいつでも開き直せます。",
        },
        {
          q: "費用はどのように決まりますか？",
          a: "学科と人数の規模によって決まります。お問い合わせいただければ、学校の状況に合った導入方法とあわせてご案内します。",
          link: { label: "導入について相談する", href: "/contact" },
        },
      ],
    },
    closing: {
      title: "学校に合った導入方法をご案内します",
      lead: "学校名と学科、予定人数をお知らせいただければ、確認のうえご連絡します。",
      primary: { label: "導入について相談する", href: "/contact" },
      secondary: { label: "学校担当者ログイン", href: "/login" },
    },
  },

  assistant: {
    meta: {
      title: "MAT・AI就活アシスタント | CareerMatri",
      description: `MATは、診断のあとも毎週の取り組みと締め切りを管理し、自分で見つけた求人と自分の経験を照らし合わせる、CareerMatriのAI就活アシスタントです。${MONTH} ${krw(TRACK_KR.month.price)}、${YEAR} ${krw(TRACK_KR.year.price)}。`,
    },
    hero: {
      eyebrow: "期間パス",
      title: ["診断のあとの準備を", "MATと続けましょう"],
      lead:
        "MATは、マイCareerMatriのワークスペースで使うAI就活アシスタントです。毎週の取り組みと締め切りをお知らせするほか、書き留めたメモを経験の記録に整理したり、自分で見つけた求人と経験を照らし合わせたりできます。",
      primary: { label: "MATをはじめる", href: "/me/track" },
      secondary: { label: "料金を見る", href: "#plans" },
      note: "ログインが必要です。アカウントがない場合は、ログイン画面から個人として登録できます。",
    },
    features: {
      label: "できること",
      title: "就職活動の準備を、毎週続けられるようにサポートします",
      items: [
        { title: "毎週の取り組みと締め切りのお知らせ", body: "今週取り組むことを一つと、迫っている締め切りをアプリ内でお知らせします。ご希望の方は、週に一度メールでも受け取れます。" },
        { title: "メモを経験の記録に", body: "最近取り組んだことを気軽にメモすると、経験の記録の候補として整理します。保存するのは、ご自身で内容を確認してからです。" },
        { title: "求人と自分の経験を照らし合わせる", body: "自分で見つけた求人を貼り付けると、求められる項目ごとに、自分の経験で説明できる部分とまだ足りない部分を分けて表示します。" },
        { title: "関心のある産業・職種を変えて、もう一度比べる", body: "関心のある産業や職種を変えると、その基準で自分の経験をもう一度比べます。" },
      ],
      planned: "月次の変化レポート（準備中）",
      plannedNote: "1か月の間に変わった点をまとめて見られるレポートは、準備中です。",
    },
    plans: {
      label: "料金",
      title: "必要な期間だけ選んで使えます",
      lead: "自動更新がないため、期間が終わると自動的に終了し、再度決済されることはありません。",
      items: [
        {
          name: MONTH,
          price: krw(TRACK_KR.month.price),
          unit: "30日間利用",
          body: "1か月使ってみてから、続けるかどうかを決められます。",
          cta: { label: `${MONTH}ではじめる`, href: "/me/track" },
        },
        {
          name: YEAR,
          price: krw(TRACK_KR.year.price),
          unit: "365日間利用",
          body: "30日パスを12回購入するより、支払いが少なく済みます。1年を通して準備を続けたい方に向いています。",
          featured: true,
          cta: { label: `${YEAR}ではじめる`, href: "/me/track" },
        },
      ],
      notes: [
        "自動更新はありません。期間が終わると自動的に終了します。",
        "決済は、CareerMatriアプリのMAT画面で行います。",
      ],
      trial: "PROの結果レポートを購入すると、MATの最初の1か月を無料で使えます。",
    },
    faq: {
      label: "よくある質問",
      title: "MATについてよくいただく質問",
      items: [
        {
          q: "毎月自動で決済されますか？",
          a: "いいえ。30日パスと365日パスはどちらも1回払いで、期間が終わると自動的に終了します。",
        },
        {
          q: "PROの結果レポートを購入しました。無料の1か月はどうやって受け取れますか？",
          a: "ログイン後、MAT画面から無料の1か月を受け取れます。受け取りはお一人様1回までです。",
          link: { label: "MAT画面を開く", href: "/me/track" },
        },
        {
          q: "月次の変化レポートは、いつ受け取れますか？",
          a: "現在準備中のため、提供時期はお約束できません。公開の際は、まずMAT画面でお知らせします。",
        },
        {
          q: "返金はどうなりますか？",
          a: "返金の基準は、返金ポリシーにまとめています。決済の前に一度ご確認ください。",
          link: { label: "返金ポリシーを見る", href: "/legal/refund" },
        },
      ],
    },
    closing: {
      title: "まずは今週の取り組みから整理しましょう",
      lead: "ログインすれば、MAT画面からすぐに始められます。まだ診断を受けていない方は、先に診断から始めることもできます。",
      primary: { label: "MATをはじめる", href: "/me/track" },
      secondary: { label: "先に診断を受ける", href: "/cores" },
    },
  },

  contact: {
    meta: {
      title: "導入のご相談 | CareerMatri",
      description: "大学・機関での導入やご利用についてのお問い合わせを受け付けています。メール hari_info@hari.re.kr、電話 044-867-7211。",
    },
    eyebrow: "導入のご相談",
    title: "導入やご利用について、お問い合わせください",
    lead:
      "大学・機関での導入、個人でのご利用、提携についてのお問い合わせを、メールと電話で受け付けています。下のフォームで内容をまとめると、そのままメールで送信できます。",
    direct: {
      title: "直接連絡する",
      emailLabel: "メール",
      telLabel: "電話",
      hoursNote: "お電話が難しい場合は、メールでお知らせください。確認のうえご連絡します。",
    },
    company: { title: "会社情報" },
    form: {
      title: "メールで送る内容をまとめる",
      lead: "各欄を入力してボタンを押すと、お使いのメールアプリが開き、内容が自動で入力されます。",
      honest: "この画面で内容を保存したり、代わりに送信したりすることはありません。メールアプリで送信ボタンを押すと届きます。",
      fields: {
        org: "機関・学校名",
        orgHint: "例：〇〇大学 キャリアセンター",
        name: "ご担当者名",
        nameHint: "例：山田 太郎",
        reply: "ご連絡先",
        replyHint: "メールアドレスまたは電話番号",
        type: "お問い合わせの種類",
        size: "予定人数",
        sizeHint: "例：3学科、約300名",
        message: "お問い合わせ内容",
        messageHint: "導入の時期や気になる点をご記入ください。",
      },
      types: ["大学・機関での導入", "学科単位での導入", "個人でのご利用", "MAT（AI就活アシスタント）", "提携・その他"],
      subject: "[CareerMatri お問い合わせ]",
      bodyIntro: "CareerMatriのWebサイトから作成したお問い合わせです。",
      send: "メールアプリで送る",
      copy: "内容をコピーする",
      opened:
        "メールアプリを開きました。送信ボタンを押すと届きます。アプリが開かない場合は、内容をコピーして上のアドレスにお送りください。",
      copiedAll: "内容をコピーしました。お使いのメールに貼り付けて、上のアドレスにお送りください。",
      needOrg: "お問い合わせ内容か機関名のどちらかをご記入ください。",
    },
    after: {
      title: "お問い合わせのあとは",
      items: [
        "いただいた内容を確認し、ご記入の連絡先にご連絡します。",
        "大学・機関には、学科と人数に合わせた導入方法をご案内します。",
        "個人でのご利用に関するお問い合わせは、決済とアカウントの状況を確認してからお答えします。",
      ],
    },
    others: {
      title: "そのほかのご案内",
      items: [
        { label: "学校担当者ログイン", href: "/login" },
        { label: "カスタマーサポート（注文・返金・パスワード）", href: "/support" },
        { label: "利用規約", href: "/legal/terms" },
        { label: "プライバシーポリシー", href: "/legal/privacy" },
      ],
    },
  },

  notFound: {
    title: "お探しのページが見つかりません",
    body: "URLが変更されたか、ページが削除された可能性があります。ホームからお探しいただくか、このまま診断を始めてください。",
    home: { label: "ホームへ", href: "/" },
    start: { label: "診断をはじめる", href: "/cores" },
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
      heading: "事業者情報",
      company: "商号",
      ceo: "代表者",
      address: "所在地",
      tel: "電話",
      email: "メール",
      bizNo: "事業者登録番号",
      mailOrderNo: "通信販売業 届出番号",
      jobInfoNo: "職業情報提供事業 届出番号",
      privacyOfficer: "個人情報保護責任者",
      unset: "要確認",
    },
  },

  footer: {
    tagline: "専攻別のキャリア診断とキャリアワークスペース",
    columns: [
      {
        title: "サービス",
        links: [
          { label: "サービス紹介", href: "/#how" },
          { label: "専攻一覧", href: "/#majors" },
          { label: "大学・機関", href: "/universities" },
          { label: "MAT・AI就活アシスタント", href: "/assistant" },
          { label: "料金", href: "/pricing" },
        ],
      },
      {
        title: "クイックリンク",
        links: [
          { label: "診断をはじめる", href: "/cores" },
          { label: "ログイン", href: "/login" },
          { label: "学校担当者ログイン", href: "/login" },
          { label: "導入のご相談", href: "/contact" },
          { label: "カスタマーサポート", href: "/support" },
        ],
      },
      {
        title: "規約",
        links: [
          { label: "利用規約", href: "/legal/terms" },
          { label: "プライバシーポリシー", href: "/legal/privacy" },
          { label: "返金ポリシー", href: "/legal/refund" },
        ],
      },
    ],
    copyright: "© 2026 주식회사 에이치에이연구원",
  },
};
