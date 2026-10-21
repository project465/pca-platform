import { PLATFORM_URL, HOME_DOMAIN } from "@/lib/domains";
import { TRACK_KR } from "@/lib/prices";
import type { SiteContent } from "./model";

/**
 * 한국어판 (2026-10-21).
 *
 * **제품이 지금 하는 일만 적는다.** 전공별 진단 검사, 결과지(웹·PDF), 내
 * CareerMatri 작업공간, 학교 담당자 화면, AI 취업비서(앱 안의 Track)다.
 * 점수·백분위·합격 가능성·공고 수·기업 수처럼 제품이 계산하지 않는 값은
 * 적지 않는다(`npm run claims:check`).
 *
 * **개인 검사 요금은 적지 않는다.** 앱 `/pricing` 이 정본이고, 지금 파는
 * 등급이 없는 시장도 있다. AI 취업비서 값만 `lib/prices.ts` 에서 읽는다.
 *
 * **전공 Core 스무 개의 이름**은 `sites/pca-platform/content/major-cores.json`
 * 에서 `status` 가 `planned` 가 아닌 것이다. 학생에게 열렸는지는 계약과
 * 시장이 정하므로 여기서는 `학교·기관 계약으로 운영` 까지만 적는다.
 * `npm run verify` 가 저장소 안에서 돌 때 두 목록을 대조한다.
 *
 * 앱으로 가는 주소는 상대 경로로 적고(`/cores` · `/login` · `/me/track` ·
 * `/legal/*`), `getSite()` 가 앱 주소로 돌린다.
 */
export const kr: SiteContent = {
  key: "kr",
  lang: "ko",
  domain: HOME_DOMAIN,
  brand: "CareerMatri",
  platformUrl: PLATFORM_URL,

  meta: {
    title: "CareerMatri | 전공별 진로 진단과 커리어 작업공간",
    description:
      "전공별 진단 검사로 지금까지 해 본 일을 확인하고, 결과지와 내 CareerMatri 작업공간에서 다음에 할 일까지 이어 갑니다. 대학·기관은 학과 단위로 도입할 수 있습니다.",
    ogAlt: "CareerMatri 전공별 진로 진단",
  },

  ui: {
    skip: "본문으로 바로 가기",
    menu: "메뉴 열기",
    close: "메뉴 닫기",
    mockTag: "화면 예시",
    copy: "복사",
    copied: "복사했습니다",
    external: "CareerMatri 앱으로 이동합니다",
  },

  nav: {
    items: [
      { label: "서비스 소개", href: "/#how" },
      { label: "대학·기관", href: "/universities" },
      { label: "AI 취업비서", href: "/assistant" },
      { label: "요금", href: "/pricing" },
      { label: "도입 문의", href: "/contact" },
    ],
    staffLogin: { label: "학교 담당자 로그인", href: "/login" },
    login: { label: "로그인", href: "/login" },
    start: { label: "검사 시작하기", href: "/cores" },
    startShort: "검사 시작",
  },

  home: {
    hero: {
      eyebrow: "전공별 진로 진단 · 결과지 · 커리어 작업공간",
      title: ["내 전공에서 해 본 일이", "어떤 일로 이어지는지 확인하세요"],
      lead:
        "CareerMatri는 전공별 진단 검사로 수업과 과제, 프로젝트에서 해 본 일과 그때 직접 정한 것을 확인합니다. 결과지를 받은 뒤에는 내 작업공간에서 경험을 더하고 다음에 할 일을 이어 갑니다.",
      primary: { label: "검사 시작하기", href: "/cores" },
      secondary: { label: "대학·기관 도입 문의", href: "/contact" },
      note: "학교에서 아이디를 받으셨나요?",
      noteLink: { label: "로그인하고 시작하기", href: "/login" },
    },
    mock: {
      label: "화면 예시",
      brandSub: "기계공학",
      nav: ["홈", "검사", "지금 할 일", "현재 상태", "경험", "결과 기록"],
      title: "내 커리어",
      meta: "기계공학 · 최근 업데이트 2026-10-18",
      todoLabel: "지금 할 일",
      todoTitle: "경험 하나를 한 쪽으로 정리하기",
      todoBody: "직접 정한 기준을 한 줄로 적어 두면 면접에서 그대로 꺼내 쓸 수 있어요.",
      todoCta: "지금 정리하기",
      todoMore: "그 밖에 할 일 2개",
      stateLabel: "현재 상태",
      stateSub: "지금 설명할 수 있는 주요 영역",
      tiles: [
        { name: "구조·내구 해석", sub: "해석 모델 · 해석 보고서" },
        { name: "재료·강도·파손", sub: "분석 보고 · 재질 사양" },
        { name: "시험·계측", sub: "시험 계획서 · 성적서" },
      ],
      changeLabel: "최근 변화",
      changes: [
        { text: "기구·제품 설계에서 직접 정한 조건과 기준이 확인됐습니다", date: "10-18" },
        { text: "새 경험으로 시험·계측 영역의 근거가 늘었습니다", date: "10-05" },
      ],
    },
    how: {
      label: "이렇게 씁니다",
      title: "검사로 시작해서 작업공간에서 이어 갑니다",
      lead:
        "한 번 보고 끝나는 검사로 만들지 않았습니다. 결과지를 받은 뒤에도 경험을 더하면 현재 상태와 다음에 할 일이 함께 바뀝니다.",
      steps: [
        {
          no: "01",
          title: "전공별 진단 검사",
          body: "내 전공을 고르고, 수업·과제·프로젝트에서 해 본 일과 그때 직접 정한 것을 답합니다.",
          points: [
            "전공마다 그 분야의 일로 문항을 따로 만들었습니다",
            "답한 문항은 바로 저장되어 중간에 닫아도 이어집니다",
            "적성이나 성격 유형을 묻지 않습니다",
          ],
        },
        {
          no: "02",
          title: "결과지 (웹·PDF)",
          body: "설명할 수 있는 경험과 아직 채울 부분, 다음에 할 일을 한 문서로 받습니다.",
          points: [
            "웹에서 바로 보고 PDF로 내려받을 수 있습니다",
            "확인된 경험이 어떤 산업과 직무로 이어지는지 함께 적습니다",
            "지원서와 면접에 옮길 문장의 재료를 정리합니다",
          ],
        },
        {
          no: "03",
          title: "내 CareerMatri 작업공간",
          body: "경험을 추가하면 현재 상태가 다시 계산되고 다음에 할 일이 바뀝니다.",
          points: [
            "경험 추가, 현재 상태 갱신, 다음 할 일 순서로 이어집니다",
            "검사 당시 결과는 바뀌지 않게 따로 보관합니다",
            "로그인하면 결과지를 언제든 다시 열 수 있습니다",
          ],
        },
      ],
    },
    report: {
      label: "결과지",
      title: "결과지에는 이런 내용이 담깁니다",
      lead:
        "결과지는 응답한 내용만으로 만듭니다. 무엇이 확인됐고 무엇이 아직 비어 있는지 학생이 직접 따라가며 확인할 수 있도록 순서대로 정리했습니다.",
      items: [
        { title: "한눈에 보는 결과", body: "지금 확인된 경험과 먼저 볼 영역, 지금 할 일을 첫 화면에 모았습니다." },
        { title: "내가 이미 가진 근거", body: "해 본 일과 직접 정한 것, 남아 있는 결과물을 이어서 보여 드립니다." },
        { title: "앞으로 채울 것", body: "부족한 부분을 영역별로 적고 그 부분이 왜 필요한지 함께 설명합니다." },
        { title: "산업·직무 연결", body: "확인된 경험이 어떤 산업과 직무에서 쓰이는지 이어서 보여 드립니다." },
        { title: "다음에 할 일", body: "다음에 정리할 과제와 그때 남길 결과물을 구체적으로 제안합니다." },
        { title: "지원서·면접 문장", body: "고른 답을 바탕으로 지원서에 옮길 문장의 뼈대를 정리합니다." },
      ],
      note:
        "결과지는 적성이나 합격 가능성을 내지 않고 순위도 매기지 않습니다. 등급에 따라 담기는 깊이는 다를 수 있습니다.",
      mock: {
        label: "결과지 예시",
        school: "진로 분석 리포트",
        docTitle: "경영학과 · 경영 일반",
        docMeta: "PRO · 2026-10-16 응답",
        headline: "경영전략·기획 쪽에서 지원서에 꺼내 쓸 경험이 있습니다",
        headlineSub: "해 본 일과 그때 직접 정한 것이 함께 확인됐습니다.",
        cells: [
          {
            label: "확인된 경험",
            title: "경영전략·기획 · 마케팅·시장",
            body: "여러 안 가운데 하나를 근거를 들어 골랐고 예산을 항목별로 나눴습니다.",
          },
          {
            label: "지금 할 일",
            title: "그때 직접 정한 것을 적어 두기",
            body: "받은 요청을 바꾼 조건을 세 줄로 적어 보세요.",
          },
          { label: "남긴 근거", title: "목표와 지표 표 · 사업계획서", body: "지원서에 옮길 재료가 모였습니다." },
          { label: "더 채울 부분", title: "데이터·의사결정", body: "직접 정한 기준과 남은 결과물을 아직 적지 않으셨습니다." },
        ],
      },
    },
    majors: {
      label: "전공",
      title: "20개 전공 검사를 학교·기관 계약으로 운영합니다",
      lead:
        "전공마다 그 분야에서 실제로 하는 일과 판단으로 문항을 만들었습니다. 학교마다 학과 이름이 달라도 가까운 전공 검사로 연결합니다.",
      groups: [
        { name: "공학·기술", items: ["기계공학", "전기전자공학", "컴퓨터·소프트웨어", "건축·실내건축", "토목·철도건설"] },
        { name: "생명·보건", items: ["바이오·생명공학", "간호", "보건·의료복지", "식품", "체육·운동재활", "원예·산림·조경"] },
        { name: "경영·사회", items: ["경영", "행정", "법·경찰", "심리학", "교육"] },
        { name: "인문·예술", items: ["국어·언어·문학", "미디어·광고홍보·공연", "시각·디자인", "패션·뷰티·스타일"] },
      ],
      note:
        "학교·기관이 계약한 범위에 따라 열리는 전공이 다릅니다. 지금 시작할 수 있는 전공은 검사 시작 화면에서 확인할 수 있습니다.",
      cta: { label: "내 전공 찾고 시작하기", href: "/cores" },
    },
    /* 나라 목록은 ACADEMIX PCA 소개 자료(academix.co.kr)의 '진행 · 예정'
       그대로다. 학교 이름은 기록이 있는 곳만 적는다(로고는 사용 허락을 받은
       뒤에). 영어·튀르키예어 문항은 `data/metri/items_pca_me_v1.json` 의
       PCA.ME.001 원문 그대로이고, 러시아어와 결과 예시 문장은 번역 초안이다 */
    global: {
      label: "해외",
      title: "해외에서도 진행하고 있습니다",
      lead:
        "CareerMatri의 진단 엔진(PCA)은 한국 밖에서도 쓰였습니다. 공학 직무는 나라가 달라도 같은 판단을 요구해서, 같은 문항을 그 나라 말로 옮겨 씁니다.",
      legend: { done: "진행한 나라", planned: "진행 예정" },
      countries: [
        { iso: "410", name: "한국", status: "done" },
        { iso: "792", name: "튀르키예", status: "done", schools: ["앙카라 사회과학대학교(ASBU)"] },
        { iso: "276", name: "독일", status: "done" },
        { iso: "840", name: "미국", status: "done" },
        { iso: "392", name: "일본", status: "done" },
        { iso: "156", name: "중국", status: "done" },
        { iso: "398", name: "카자흐스탄", status: "planned" },
        { iso: "250", name: "프랑스", status: "planned" },
        { iso: "710", name: "남아프리카공화국", status: "planned" },
        { iso: "608", name: "필리핀", status: "planned" },
      ],
      source: "ACADEMIX PCA 소개 자료 기준입니다. 진행 예정인 나라는 아직 진행 전입니다.",
      samples: {
        title: "그 나라 말로 보는 검사지와 결과지",
        lead:
          "기계공학 검사의 같은 문항이 영어와 튀르키예어로 준비되어 있습니다. 러시아어는 카자흐스탄 진행을 위해 옮기고 있는 번역 초안입니다.",
        items: [
          {
            lang: "English",
            code: "en",
            langKo: "영어",
            status: "live",
            statusLabel: "검사지·결과지 영어판 있음",
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
            langKo: "튀르키예어",
            status: "live",
            statusLabel: "검사지 튀르키예어판 있음 · 결과 문장은 번역 초안",
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
            lang: "Русский",
            code: "ru",
            langKo: "러시아어",
            status: "draft",
            statusLabel: "번역 초안 · 현지 검수 전",
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
    campus: {
      label: "대학·기관",
      title: "학과 단위로 검사를 열고 진행 상황을 한 화면에서 확인합니다",
      lead:
        "담당자는 학생 계정을 발급하고 응시 진행과 학과별 집계를 봅니다. 학생은 학교 전용 주소로 들어와 같은 검사와 결과지를 받습니다.",
      points: [
        { title: "학과별 검사", body: "계약한 학과마다 그 전공의 검사를 엽니다." },
        { title: "학생 계정 발급", body: "아이디와 비밀번호를 한 명씩, 또는 CSV로 한 번에 발급합니다." },
        { title: "진행 현황과 학과별 집계", body: "시작·완료 인원을 학과별로 보고, 5명 미만인 칸은 공개하지 않습니다." },
        { title: "CSV 내보내기", body: "명단과 진행 상황을 CSV로 내려받아 학내 보고에 씁니다." },
      ],
      primary: { label: "대학·기관 안내 보기", href: "/universities" },
      secondary: { label: "도입 문의", href: "/contact" },
    },
    personal: {
      label: "개인 이용",
      title: "학교 계정이 없어도 이용할 수 있습니다",
      lead:
        "개인으로 가입해서 이용할 수 있습니다. 검사 요금과 지금 구매할 수 있는 상품은 CareerMatri 앱의 요금 화면에서 확인해 주세요.",
      cards: [
        {
          tag: "검사와 결과지",
          title: "전공별 진단 검사",
          body: "검사를 마치면 웹 결과지와 PDF를 받고, 내 CareerMatri 작업공간이 열립니다.",
          points: [
            "요금과 등급별 차이는 앱 요금 화면에서 안내합니다",
            "첫 문항에 답하기 전에는 환불받을 수 있습니다",
          ],
          cta: { label: "요금 보기", href: "/pricing" },
        },
        {
          tag: "구독",
          title: "MAT · AI 취업비서",
          body: "검사 다음에도 매주 할 일과 마감을 챙기고, 저장한 공고와 내 경험을 나란히 비교합니다.",
          price: `${TRACK_KR.month.name} ${TRACK_KR.month.price} · ${TRACK_KR.year.name} ${TRACK_KR.year.price}`,
          priceNote: "자동 갱신 없음",
          points: [
            "기간이 끝나면 저절로 종료되고 다시 결제되지 않습니다",
            "PRO 결과지를 구매하시면 첫 1개월이 무료입니다",
          ],
          cta: { label: "MAT 알아보기", href: "/assistant" },
        },
      ],
    },
    faq: {
      label: "자주 묻는 질문",
      title: "시작하기 전에 많이 물어보시는 것",
      items: [
        {
          q: "학교에서 아이디를 받았습니다. 어디로 들어가나요?",
          a: "학교가 알려 준 전용 주소나 CareerMatri 로그인 화면에서 받은 아이디와 비밀번호로 들어가시면 됩니다.",
          link: { label: "로그인 화면 열기", href: "/login" },
        },
        {
          q: "개인도 이용할 수 있나요?",
          a: "개인으로 가입해서 이용할 수 있습니다. 요금과 지금 구매할 수 있는 상품은 앱의 요금 화면에서 확인해 주세요.",
          link: { label: "요금 보기", href: "/pricing" },
        },
        {
          q: "검사 중간에 닫으면 처음부터 다시 해야 하나요?",
          a: "그렇지 않습니다. 답한 문항은 바로 저장되어 다시 들어오면 멈춘 곳부터 이어집니다.",
        },
        {
          q: "결과지는 어떻게 받나요?",
          a: "검사를 마치면 웹에서 바로 보고 PDF로 내려받을 수 있습니다. 로그인하면 언제든 다시 열 수 있습니다.",
        },
        /* 질문과 답을 한 줄에 둔다. `claims:check` 는 줄 안에서 부정을 찾으므로,
           질문만 따로 있으면 그 줄이 주장으로 세어진다 */
        { q: "합격 가능성이나 순위를 알려 주나요?", a: "알려 드리지 않습니다. 응답에서 확인된 경험과 아직 채울 부분, 다음에 할 일을 적어 드립니다." },
        {
          q: "검증된 검사인가요?",
          a: "아직 파일럿과 인지 면접을 진행하는 단계라서 검증된 검사라고 말씀드리지 않습니다. 결과는 진로를 정할 때 참고 자료로 써 주세요.",
        },
      ],
    },
    closing: {
      title: "내 전공으로 첫 검사를 시작해 보세요",
      lead: "학교에서 받은 계정이 있으면 로그인해서, 없으면 개인으로 가입해서 시작할 수 있습니다.",
      primary: { label: "검사 시작하기", href: "/cores" },
      secondary: { label: "도입 문의", href: "/contact" },
    },
  },

  universities: {
    meta: {
      title: "대학·기관 도입 | CareerMatri",
      description:
        "학과별 진로 진단을 학교 계정으로 운영합니다. 학생 계정 발급, 진행 현황, 학과별 집계, CSV 내보내기를 담당자 화면에서 처리합니다.",
    },
    hero: {
      eyebrow: "대학·기관",
      title: ["학과별 진로 진단을", "학교 계정으로 운영합니다"],
      lead:
        "담당자가 학생 계정을 발급하면 학생은 학교 전용 주소로 들어와 검사를 봅니다. 진행 현황과 학과별 집계는 담당자 화면에서 확인하고 CSV로 내려받습니다.",
      primary: { label: "도입 문의하기", href: "/contact" },
      secondary: { label: "학교 담당자 로그인", href: "/login" },
    },
    mock: {
      label: "화면 예시 · 가상의 학교와 숫자",
      title: "전공 진단 집계",
      meta: "2026학년도 2학기",
      kpis: [
        { label: "대상자", value: "128", note: "올린 명단 기준" },
        { label: "시작", value: "96", note: "검사를 시작한 학생" },
        { label: "완료", value: "71", note: "결과지를 받은 학생" },
      ],
      tableTitle: "학과별 진행",
      head: ["학과", "대상", "시작", "완료"],
      rows: [
        ["경영학과", "42", "35", "28"],
        ["전기전자공학과", "38", "30", "24"],
        ["간호학과", "44", "31", "19"],
        ["심리학과", "비공개", "비공개", "비공개"],
      ],
      hiddenNote: "5명 미만인 칸은 숫자를 공개하지 않습니다",
      exportLabel: "CSV 내려받기",
    },
    flow: {
      label: "운영 순서",
      title: "도입부터 결과 확인까지 여섯 단계입니다",
      lead: "학생 계정 발급부터 집계 확인까지 담당자 화면에서 처리합니다. 따로 설치할 프로그램은 없습니다.",
      steps: [
        { title: "학과와 인원 정하기", body: "검사를 열 학과와 인원을 정합니다. 학과 이름이 달라도 가까운 전공 검사로 연결합니다." },
        { title: "담당자 계정 받기", body: "CareerMatri가 학교 담당자 계정을 만들어 드립니다." },
        { title: "학생 계정 발급", body: "담당자 화면에서 아이디와 비밀번호를 한 명씩, 또는 CSV로 한 번에 발급합니다." },
        { title: "학교 전용 주소로 응시", body: "학생은 학교 전용 주소로 들어와 소속 학과를 고르고 검사를 봅니다." },
        { title: "진행 현황과 집계 확인", body: "시작·완료 인원과 학과별 집계를 담당자 화면에서 확인합니다." },
        { title: "CSV 내보내기", body: "명단과 진행 상황, 집계를 CSV로 내려받습니다." },
      ],
    },
    features: {
      label: "담당자 화면",
      title: "담당자가 직접 처리할 수 있는 일",
      items: [
        { title: "학생 추가와 계정 발급", body: "한 명씩 추가하거나 CSV로 한 번에 올립니다. 올리기 전에 미리 보기로 확인합니다." },
        { title: "비밀번호 재발급", body: "비밀번호를 잊은 학생에게 새 초기 비밀번호를 발급합니다." },
        { title: "계정 멈춤과 다시 열기", body: "휴학이나 졸업으로 쓰지 않는 계정을 멈춰 두었다가 필요할 때 다시 엽니다." },
        { title: "학생별 진행 현황", body: "학생마다 시작 전, 진행 중, 완료 상태를 확인합니다." },
        { title: "학과별 집계", body: "단과대학과 학과별로 대상자, 시작, 완료 인원을 확인합니다." },
        { title: "미응시 학생 명단", body: "아직 시작하지 않은 학생만 모아 CSV로 내려받습니다." },
        { title: "CSV 내보내기", body: "명단과 진행 상황, 집계를 CSV로 내려받아 학내 보고에 씁니다." },
        { title: "재응시 허용", body: "학교 응시는 한 번이 기본이고, 담당자가 허용한 학생만 다시 볼 수 있습니다." },
        { title: "MAT 학교 이용권", body: "학교가 정한 인원 안에서 담당자가 학생에게 MAT(AI 취업비서)를 6개월 또는 1년 동안 열어 줍니다. 비용은 도입 계약에 함께 담습니다." },
      ],
    },
    access: {
      label: "학생 접속",
      title: "학생은 학교 전용 주소로 들어옵니다",
      body:
        "학교마다 전용 주소가 있습니다. 학생은 그 주소에서 소속 학과를 고르고, 발급받은 아이디로 로그인해 검사를 시작합니다.",
      url: `${PLATFORM_URL.replace(/^https?:\/\//, "")}/campus/학교코드`,
      urlNote: "학교코드는 도입할 때 함께 정합니다.",
      login: { label: "학생 로그인 화면 보기", href: "/login" },
    },
    privacy: {
      label: "개인정보",
      title: "담당자에게 보이는 것과 보이지 않는 것",
      items: [
        "학생 개인의 답과 결과지는 담당자 화면에 나오지 않습니다.",
        "집계에서 5명 미만인 칸은 숫자를 공개하지 않습니다.",
        "CSV에는 명단과 진행 상황, 집계만 담기고 문항별 응답은 담기지 않습니다.",
        "초기 비밀번호는 발급할 때 한 번만 보여 드리고 저장하지 않습니다.",
      ],
    },
    faq: {
      label: "자주 묻는 질문",
      title: "도입 전에 많이 물어보시는 것",
      items: [
        {
          q: "학과마다 다른 검사를 보나요?",
          a: "네. 학생은 소속 학과가 연결된 전공 검사를 봅니다. 같은 전공 검사를 쓰는 학과라도 학과에 맞는 예시와 안내를 받습니다.",
        },
        {
          q: "도입하려면 무엇을 준비하나요?",
          a: "검사를 열 학과와 대략의 인원, 담당자 연락처를 알려 주시면 됩니다. 학생 명단은 계정을 발급할 때 담당자 화면에서 올립니다.",
        },
        {
          q: "학생이 결과를 다시 볼 수 있나요?",
          a: "학생은 로그인하면 웹 결과지와 PDF를 언제든 다시 열 수 있습니다.",
        },
        {
          q: "비용은 어떻게 정해지나요?",
          a: "학과와 인원 규모에 따라 정합니다. 문의를 주시면 학교 상황에 맞는 적용 방식과 함께 안내해 드립니다.",
          link: { label: "도입 문의하기", href: "/contact" },
        },
      ],
    },
    closing: {
      title: "우리 학교에 맞는 도입 방식을 안내해 드립니다",
      lead: "학교 이름과 학과, 예상 인원을 알려 주시면 확인한 뒤 회신드립니다.",
      primary: { label: "도입 문의하기", href: "/contact" },
      secondary: { label: "학교 담당자 로그인", href: "/login" },
    },
  },

  assistant: {
    meta: {
      title: "MAT · AI 취업비서 | CareerMatri",
      description: `MAT는 검사 다음에도 매주 할 일과 마감을 챙기고, 직접 찾은 공고와 내 경험을 맞대어 보는 CareerMatri의 AI 취업비서입니다. ${TRACK_KR.month.name} ${TRACK_KR.month.price}, ${TRACK_KR.year.name} ${TRACK_KR.year.price}.`,
    },
    hero: {
      eyebrow: "구독 상품",
      title: ["검사 다음 준비를", "MAT와 이어 가세요"],
      lead:
        "MAT는 내 CareerMatri 작업공간에서 쓰는 AI 취업비서입니다. 매주 할 일과 마감을 알려 드리고, 적어 둔 메모를 경험 기록으로 옮기도록 돕고, 직접 찾은 공고와 내 경험을 맞대어 드립니다.",
      primary: { label: "MAT 시작하기", href: "/me/track" },
      secondary: { label: "요금 보기", href: "#plans" },
      note: "로그인이 필요합니다. 계정이 없으면 로그인 화면에서 개인으로 가입할 수 있습니다.",
    },
    features: {
      label: "하는 일",
      title: "취업 준비를 매주 이어 가도록 돕습니다",
      items: [
        { title: "매주 할 일과 마감 알림", body: "이번 주에 할 일 하나와 다가오는 마감을 앱 안에서 알려 드립니다. 원하시면 한 주에 한 번 메일로도 받으실 수 있습니다." },
        { title: "메모를 경험 기록으로", body: "최근에 한 일을 편하게 적으면 경험 기록의 보기로 옮겨 드립니다. 저장은 직접 확인한 뒤에 하십니다." },
        { title: "공고와 내 경험 맞대기", body: "직접 찾은 채용 공고를 붙여 넣으면 요구 항목마다 내 경험으로 설명할 수 있는 부분과 아직 비어 있는 부분을 나눠 보여 드립니다." },
        { title: "관심 산업·직무 바꿔 다시 비교", body: "관심 산업이나 직무를 바꾸면 그 기준으로 내 경험을 다시 비교합니다." },
      ],
      planned: "월간 변화 리포트 · 준비 중",
      plannedNote: "한 달 동안 달라진 점을 모아 보는 리포트는 준비 중입니다.",
    },
    plans: {
      label: "요금",
      title: "필요한 기간만 골라서 쓰세요",
      lead: "자동 갱신이 없어서 기간이 끝나면 저절로 종료되고 다시 결제되지 않습니다.",
      items: [
        {
          name: TRACK_KR.month.name,
          price: TRACK_KR.month.price,
          unit: "30일 동안 이용",
          body: "한 달 써 보고 계속할지 정하실 수 있습니다.",
          cta: { label: `${TRACK_KR.month.name}으로 시작하기`, href: "/me/track" },
        },
        {
          name: TRACK_KR.year.name,
          price: TRACK_KR.year.price,
          unit: "365일 동안 이용",
          body: "30일권을 열두 번 사는 것보다 적게 냅니다. 한 학년 내내 준비를 이어 가실 때 알맞습니다.",
          featured: true,
          cta: { label: `${TRACK_KR.year.name}으로 시작하기`, href: "/me/track" },
        },
      ],
      notes: [
        "자동 갱신이 없습니다. 기간이 끝나면 저절로 종료됩니다.",
        "결제는 CareerMatri 앱의 MAT 화면에서 진행합니다.",
      ],
      trial: "PRO 결과지를 구매하시면 MAT 첫 1개월을 무료로 쓸 수 있습니다.",
    },
    faq: {
      label: "자주 묻는 질문",
      title: "MAT에 대해 많이 물어보시는 것",
      items: [
        {
          q: "매달 자동으로 결제되나요?",
          a: "그렇지 않습니다. 30일권과 365일권 모두 한 번 결제하고, 기간이 끝나면 저절로 종료됩니다.",
        },
        {
          q: "PRO 결과지를 샀는데 무료 1개월은 어떻게 받나요?",
          a: "로그인한 뒤 MAT 화면에서 무료 1개월을 받을 수 있습니다. 한 사람당 한 번 받을 수 있습니다.",
          link: { label: "MAT 화면 열기", href: "/me/track" },
        },
        {
          q: "월간 변화 리포트는 언제 받을 수 있나요?",
          a: "아직 준비 중이라 날짜를 약속드리지 않습니다. 열리면 MAT 화면에서 먼저 알려 드립니다.",
        },
        {
          q: "환불은 어떻게 되나요?",
          a: "환불 기준은 환불정책에 정리되어 있습니다. 결제 전에 한 번 확인해 주세요.",
          link: { label: "환불정책 보기", href: "/legal/refund" },
        },
      ],
    },
    closing: {
      title: "이번 주에 할 일부터 정리해 보세요",
      lead: "로그인하면 MAT 화면에서 바로 시작할 수 있습니다. 검사를 아직 보지 않으셨다면 검사부터 시작해도 좋습니다.",
      primary: { label: "MAT 시작하기", href: "/me/track" },
      secondary: { label: "검사 먼저 보기", href: "/cores" },
    },
  },

  contact: {
    meta: {
      title: "도입 문의 | CareerMatri",
      description: "대학·기관 도입과 이용 문의를 받습니다. 이메일 hari_info@hari.re.kr, 전화 044-867-7211.",
    },
    eyebrow: "도입 문의",
    title: "도입과 이용에 관해 문의해 주세요",
    lead:
      "대학·기관 도입, 개인 이용, 제휴 문의를 이메일과 전화로 받습니다. 아래에서 내용을 정리하면 메일로 바로 보낼 수 있습니다.",
    direct: {
      title: "바로 연락하기",
      emailLabel: "이메일",
      telLabel: "전화",
      hoursNote: "통화가 어려우시면 이메일로 남겨 주세요. 확인한 뒤 회신드립니다.",
    },
    company: { title: "회사 정보" },
    form: {
      title: "메일로 보낼 내용 정리하기",
      lead: "칸을 채우고 버튼을 누르면 쓰시는 메일 앱이 열리고 내용이 채워집니다.",
      honest: "이 화면은 내용을 저장하거나 대신 보내지 않습니다. 메일 앱에서 보내기를 누르셔야 전달됩니다.",
      fields: {
        org: "기관·학교 이름",
        orgHint: "예: OO대학교 취업지원팀",
        name: "담당자 이름",
        nameHint: "예: 홍길동",
        reply: "회신받을 연락처",
        replyHint: "이메일 또는 전화번호",
        type: "문의 유형",
        size: "예상 인원",
        sizeHint: "예: 3개 학과, 약 300명",
        message: "문의 내용",
        messageHint: "도입 시기나 궁금한 점을 적어 주세요.",
      },
      types: ["대학·기관 도입", "학과 단위 도입", "개인 이용", "MAT(AI 취업비서)", "제휴·기타"],
      subject: "[CareerMatri 문의]",
      bodyIntro: "CareerMatri 홈페이지에서 정리한 문의입니다.",
      send: "메일 앱으로 보내기",
      copy: "내용 복사하기",
      opened:
        "메일 앱을 열었습니다. 메일 앱에서 보내기를 눌러야 전달됩니다. 메일 앱이 열리지 않으면 내용을 복사해서 위 주소로 보내 주세요.",
      copiedAll: "내용을 복사했습니다. 쓰시는 메일에 붙여 넣어 위 주소로 보내 주세요.",
      needOrg: "문의 내용이나 기관 이름 가운데 하나는 적어 주세요.",
    },
    after: {
      title: "문의 다음에는",
      items: [
        "보내 주신 내용을 확인하고 적어 주신 연락처로 회신드립니다.",
        "대학·기관에는 학과와 인원에 맞춘 도입 방식을 안내해 드립니다.",
        "개인 이용 문의는 결제와 계정 상황을 확인한 뒤 답변드립니다.",
      ],
    },
    others: {
      title: "이런 경우에는 바로 가세요",
      items: [
        { label: "학교 담당자 로그인", href: "/login" },
        { label: "고객지원 (주문·환불·비밀번호)", href: "/support" },
        { label: "이용약관", href: "/legal/terms" },
        { label: "개인정보처리방침", href: "/legal/privacy" },
      ],
    },
  },

  notFound: {
    title: "찾는 페이지가 없습니다",
    body: "주소가 바뀌었거나 없어진 페이지입니다. 홈에서 다시 찾아보시거나 바로 검사를 시작하세요.",
    home: { label: "홈으로", href: "/" },
    start: { label: "검사 시작하기", href: "/cores" },
  },

  legal: {
    /* 값은 사업자등록증에 적힌 것이고 지어내지 않았다. **통신판매업
       신고번호만 비워 둔다**: 아직 발급 전이고, 비어 있으면 화면이
       `확인 필요` 로 적는다. 앱 쪽 정본은 `/admin/business` 가 쓰는
       `site_settings` 이고 소개 사이트는 그 표를 못 봐서 여기 적어 둔다 */
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
      heading: "사업자 정보",
      company: "상호",
      ceo: "대표자",
      address: "주소",
      tel: "전화",
      email: "이메일",
      bizNo: "사업자등록번호",
      mailOrderNo: "통신판매업 신고번호",
      jobInfoNo: "직업정보제공사업 신고번호",
      privacyOfficer: "개인정보 보호책임자",
      unset: "확인 필요",
    },
  },

  footer: {
    tagline: "전공별 진로 진단과 커리어 작업공간",
    columns: [
      {
        title: "서비스",
        links: [
          { label: "서비스 소개", href: "/#how" },
          { label: "전공 목록", href: "/#majors" },
          { label: "대학·기관", href: "/universities" },
          { label: "MAT · AI 취업비서", href: "/assistant" },
          { label: "요금", href: "/pricing" },
        ],
      },
      {
        title: "바로가기",
        links: [
          { label: "검사 시작하기", href: "/cores" },
          { label: "로그인", href: "/login" },
          { label: "학교 담당자 로그인", href: "/login" },
          { label: "도입 문의", href: "/contact" },
          { label: "고객지원", href: "/support" },
        ],
      },
      {
        title: "약관",
        links: [
          { label: "이용약관", href: "/legal/terms" },
          { label: "개인정보처리방침", href: "/legal/privacy" },
          { label: "환불정책", href: "/legal/refund" },
        ],
      },
    ],
    copyright: "© 2026 주식회사 에이치에이연구원",
  },
};
