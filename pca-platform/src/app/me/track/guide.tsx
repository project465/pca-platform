/**
 * MAT이 **무엇을 해 주는가.**
 *
 * 한동안 이 쪽은 기간권이 열려 있지 않은 사람에게 `열려 있지 않습니다` 와
 * 결제 카드 둘만 세웠다. 그러면 무엇을 사는지가 화면 어디에도 없고, 산
 * 사람도 도구를 언제 어떻게 쓰는지 모른다. 여기 적는 것은 셋이다:
 * 하는 일(입력과 받는 것까지) · 한 주를 어떻게 쓰는가 · 하지 않는 일.
 *
 * **지어낸 성과를 적지 않는다.** 예시는 학부 수업과 과제에서 나올 수 있는
 * 것이고, `합격률` 이나 `몇 % 올랐다` 같은 수는 이 서비스가 재지 않는다.
 */
import Link from "next/link";
import { SectionHeader } from "../ui";
import { wsSay } from "@/lib/me-v3/ws-say";
import type { WsLang } from "@/lib/me-v3/ws-lang";

const FEATURES: {
  key: string; name: string; what: string; steps: string[];
  input: string; output: string[]; where: string;
}[] = [
  {
    key: "brief",
    name: "이번 주 브리핑",
    what: "이번 주에 무엇을 하면 되는지 MAT 첫 화면 한 판에 모읍니다.",
    steps: [
      "가까운 마감을 남은 날과 함께 보여 줍니다",
      "지금 할 일 가운데 이번 주에 할 것 하나를 올립니다",
      "붙여 둔 공고 여러 곳이 함께 요구하는데 아직 비어 있는 것을, 요구한 공고가 많은 차례로 모읍니다",
    ],
    input: "따로 적을 것 없음 (붙여 둔 공고와 적어 둔 경험을 읽습니다)",
    output: [
      "구조·내구 해석 · 붙여 둔 공고 3개 중 3개가 요구 · 아직 없음",
      "이번 주 작은 일: 지난 과제 하나로 해석 보고서를 작게 만들고 손계산과 비교해 적어 두기",
    ],
    where: "#brief",
  },
  {
    key: "draft",
    name: "메모로 경험 채우기",
    what: "최근에 한 일을 편하게 적으면, 경험 추가 화면의 보기로 옮겨 둡니다.",
    steps: [
      "한두 문장으로 한 일과 남은 것을 적습니다",
      "AI가 그 메모에 맞는 업무 영역과 ‘직접 정한 것’ · ‘남긴 것’ 보기를 골라 둡니다",
      "켜진 보기를 확인하고 고쳐서 직접 저장합니다 (저절로 저장되지 않습니다)",
    ],
    input: "마케팅원론 팀 과제에서 20대 대상 설문 문항을 짰고, 응답 120개를 엑셀로 정리해 발표했다.",
    output: [
      "업무 영역: 마케팅·시장 · 데이터·의사결정",
      "직접 정한 것: 설문 대상과 문항",
      "남긴 것: 응답 정리표 · 발표 자료",
    ],
    where: "#draft",
  },
  {
    key: "posting",
    name: "공고 요구 사항과 내 경험 비교",
    what: "직접 찾은 채용 공고를 붙여 넣으면, 요구 항목마다 내 경험이 있는지 나누고 지원서 문장 뼈대를 엮습니다.",
    steps: [
      "공고의 하는 일 · 자격 요건 · 우대 사항 부분을 붙여 넣습니다",
      "항목마다 ‘설명할 경험 있음 · 정리가 덜 됨 · 아직 없음 · 자격 조건’으로 나눕니다",
      "경험이 있는 필수 항목은 내 기록의 말로 문장 뼈대를 만들고, 비어 있는 칸은 대괄호로 남깁니다",
      "마감일을 휴대폰 달력에 넣는 파일을 받을 수 있습니다",
    ],
    input: "[담당 업무] 브랜드 SNS 채널 운영, 캠페인 성과 분석 … [우대] 데이터 분석 경험",
    output: [
      "캠페인 성과 분석 → 설명할 경험 있음 (마케팅원론 설문 과제)",
      "문장 뼈대: ‘마케팅원론 설문 과제’에서 [풀려던 문제]. 그 과정에서 설문 대상과 문항을 정했다. 결과는 응답 정리표로 남겼고, 맞는지는 [검증한 방법]으로 확인했다.",
    ],
    where: "#posting",
  },
  {
    key: "research",
    name: "대학원생 · 연구 경험 정리",
    what: "석사 · 박사 · 박사후연구원은 학위 연구를 회사가 읽는 말로 옮기고, 연구직 공고의 논문 · 특허 · 과제 요구를 내 기록과 따로 비교해 드립니다.",
    steps: [
      "공고의 ‘SCI 논문 · 특허 · 국책과제 수행 · 학회 발표 · 연구계획서 · 박사 학위’ 줄을 따로 모아 기록에 있는지 나눕니다",
      "연구 · 논문 기록마다 지원서 문장 뼈대를 만들고, 학위 단계에 맞춰 먼저 적어 둘 한 줄을 붙입니다",
      "학위 연구를 두고 자주 받는 질문을 단계마다 셋씩 내고, 답에 가져갈 내 기록을 붙입니다",
    ],
    input: "[자격 요건] 기계공학 박사 학위 소지자 · SCI(E)급 논문 제1저자 … [우대] 특허 출원 실적",
    output: [
      "SCI(E)급 논문 제1저자 → 기록은 있는데 덜 적힘 (남긴 것 칸에 게재지와 저자 순서를 적어 두기)",
      "면접 질문: 학위 연구에서 지도교수가 정한 것과 본인이 정한 것을 나눠 설명해 주세요.",
    ],
    where: "/me/experience/new?kind=research",
  },
];

const WEEK: [string, string][] = [
  ["월요일", "이번 주 브리핑이 새로 정리됩니다. 할 일 하나는 30분이면 끝낼 크기입니다."],
  ["주중", "과제나 활동을 마치면 메모 두 줄을 적어 경험 기록으로 옮깁니다. 브리핑의 빈 줄이 그만큼 줄어듭니다."],
  ["공고를 봤을 때", "붙여 넣고 비어 있는 요구 항목과 문장 뼈대를 확인합니다. 지원은 공고를 낸 곳에서 직접 합니다."],
  ["마감 전", "7일 · 3일 · 1일 전에 다시 알립니다. 달력에 넣어 두면 휴대폰에서도 알림이 뜹니다."],
];

const NOT: [string, string][] = [
  ["점수나 합격 가능성을 만들지 않습니다", "판정은 검사 결과와 적어 주신 경험으로만 하고, AI는 글을 읽고 나누는 일만 합니다."],
  ["기업을 골라 주거나 대신 지원하지 않습니다", "공고는 직접 찾아 붙여 넣으시고, 지원도 직접 하십니다."],
  ["자기소개서를 대신 써 드리지 않습니다", "적어 둔 경험의 말로 문장 뼈대까지만 엮습니다. 없는 사실을 지어 넣지 않고, 다듬어 완성하는 것은 직접 하십니다."],
  ["자동으로 결제되지 않습니다", "30일권 · 90일권 모두 한 번 결제이고, 기간이 끝나면 저절로 닫힙니다. 남은 기간이 있을 때 다시 사면 끝나는 날 다음 날부터 이어 붙습니다."],
];

const ASK: [string, string][] = [
  ["검사 결과가 없어도 쓸 수 있나요?",
    "쓸 수 있지만, 할 일 알림과 공고 비교는 검사 결과가 있어야 정확해집니다. 검사를 먼저 마치시길 권합니다."],
  ["AI를 끄면 어떻게 되나요?",
    "브리핑과 문장 뼈대는 처음부터 AI 없이 만듭니다. 공고는 항목 제목과 전공별 도구 이름으로 읽고, 메모에서는 확실한 보기만 미리 고른 뒤 나머지는 메모 속 문장을 보여 드리며 여쭙니다. 밖으로 보내는 글은 없습니다."],
  ["붙여 넣은 글은 어디로 가나요?",
    "AI 분석을 켠 경우에만 Anthropic(미국)의 Claude가 읽습니다. 이름과 연락처는 보내지 않고, 공고 본문은 1년 · 메모는 30일 뒤 지웁니다."],
  ["대학원생이나 박사후연구원도 쓸 수 있나요?",
    "쓸 수 있습니다. 검사에서 답한 학위 단계를 읽어, 석사는 옮겨 갈 방법을, 박사는 직접 정한 것과 받은 것을, 박사후연구원은 맡아서 끌고 간 범위를 먼저 묻습니다. 학위가 높다고 판정이 저절로 올라가지는 않고, 판정은 적어 둔 기록에 결과물이 있는지로만 합니다."],
  ["학교에서 받은 계정도 쓸 수 있나요?",
    "PRO 결과를 받으셨다면 첫 1개월을 열 수 있습니다. 그 뒤로는 30일권이나 90일권을 고르시면 됩니다."],
];

/**
 * @param on 기간권이 열려 있는가. 열려 있으면 바로 쓸 자리로 가는 링크를 단다
 * @param compact 이미 쓰는 사람에게는 접어서 둔다
 */
/**
 * 영어판. **번역하지 않고 다시 썼다**: 한국어 예시는 경영학 과제라, 그대로
 * 옮기면 해외 공대생이 자기 이야기로 읽지 못한다. 영어판을 여는 전공이
 * 기계 · 전기전자 · 컴퓨터라 예시도 그쪽에서 골랐다. 판정이나 약속은
 * 한국어판과 같고, 하지 않는 일도 같다.
 */
const FEATURES_EN: typeof FEATURES = [
  {
    key: "brief",
    name: "This week's briefing",
    what: "One panel at the top of MAT that tells you what to do this week.",
    steps: [
      "Shows your nearest deadlines with the days left",
      "Picks one task from your to-do list for this week",
      "Lists what several of your saved postings ask for that your record doesn't show yet, starting with the one most postings ask for",
    ],
    input: "Nothing to type. MAT reads the postings you saved and the experiences you recorded.",
    output: [
      "Structural analysis · asked for by 3 of your 3 postings · nothing recorded yet",
      "Small task this week: take one past assignment, write a one-page analysis note and compare it with a hand calculation",
    ],
    where: "#brief",
  },
  {
    key: "draft",
    name: "Turn a note into an experience",
    what: "Write what you did in plain words. MAT moves it into the experience form for you to check.",
    steps: [
      "Write one or two sentences about what you did and what you produced",
      "MAT picks the matching area and the options for what you decided and what you produced",
      "Check the options, change anything that's off, and save it yourself (nothing is saved automatically)",
    ],
    input: "For my capstone I chose the bearing and shaft size for a small conveyor and checked the deflection by hand before we built the prototype.",
    output: [
      "Area: Machine design",
      "What you decided: bearing and shaft size",
      "What you produced: hand calculation sheet · prototype",
    ],
    where: "#draft",
  },
  {
    key: "posting",
    name: "Check a posting against your record",
    what: "Paste a job posting you found. MAT splits it into requirements, shows which ones your record can back up, and drafts sentence outlines from your own experiences.",
    steps: [
      "Paste the responsibilities, requirements and preferred qualifications",
      "Each requirement is marked as backed by your record, needs more detail, not recorded yet, or a general condition such as degree or visa",
      "For required items you can back up, MAT drafts a sentence outline in your own words and leaves gaps in [brackets]",
      "You can download the deadline as a calendar file",
    ],
    input: "[Responsibilities] Design brackets and housings in SolidWorks … [Preferred] FEA experience (ANSYS)",
    output: [
      "Design brackets and housings → backed by your record (capstone conveyor)",
      "Sentence outline: In “Capstone conveyor” I [problem you were solving]. I decided the bearing and shaft size. The result was a hand calculation sheet, and I checked it by [how you verified it].",
    ],
    where: "#posting",
  },
  {
    key: "research",
    name: "Graduate students · research records",
    what: "For master's students, PhD students and postdocs: MAT turns degree research into wording companies read, and checks a research posting's paper, patent and project requirements against your records separately.",
    steps: [
      "Gathers the posting's lines on journal papers, patents, funded projects, conference talks, proposals and degrees, and shows which ones your records have",
      "Drafts application sentence frames from each research or paper record and adds one line to write down first for your degree stage",
      "Gives three questions often asked about degree research at your stage, with the record to bring to each",
    ],
    input: "[Requirements] PhD in Mechanical Engineering · first-author journal papers … [Preferred] filed patents",
    output: [
      "First-author journal papers → recorded, details missing (add the venue and your author position)",
      "Interview question: In your PhD research, what did your advisor decide and what did you decide yourself?",
    ],
    where: "/me/experience/new?kind=research",
  },
];

const WEEK_EN: [string, string][] = [
  ["Monday", "Your briefing is refreshed. The task for the week is sized to take about 30 minutes."],
  ["During the week", "When you finish an assignment or project, write a two-line note and turn it into an experience. The gaps in your briefing shrink as you go."],
  ["When you find a posting", "Paste it and check the open requirements and the sentence outlines. You apply directly on the employer's site."],
  ["Before a deadline", "MAT reminds you 7, 3 and 1 day before. Add it to your calendar and your phone will remind you too."],
];

const NOT_EN: [string, string][] = [
  ["No scores and no predictions about getting hired", "Everything MAT shows comes from your test result and the experiences you recorded. It reads and sorts text, nothing more."],
  ["MAT doesn't pick employers or apply for you", "You find the postings and you apply yourself."],
  ["MAT doesn't write your cover letter", "It builds sentence outlines from your own records and never adds facts you didn't give it. Finishing the wording is up to you."],
  ["Nothing renews automatically", "Each plan is a one-time payment and simply ends when the period is over."],
];

const ASK_EN: [string, string][] = [
  ["Do I need to take the test first?",
    "Yes. MAT works from your result, so start with the free test (about 12 minutes). Once you have a result you can open MAT right away."],
  ["Where does the posting text go?",
    "MAT reads it inside CareerMatri using rules for your major. It isn't sent to outside AI services. Saved posting text is deleted after a year and notes after 30 days."],
  ["Can graduate students and postdocs use MAT?",
    "Yes. MAT reads the degree stage you gave in the assessment: it asks master's students about methods that carry over, PhD students about what they decided versus what was given, and postdocs about the scope they led. A higher degree never raises a status by itself; statuses only depend on whether your records show an output."],
  ["Can I use MAT for any major?",
    "Right now the English version covers Mechanical, Electrical and Electronic, and Computer and Software Engineering."],
];

export function AssistantGuide({ on, compact, lang = "ko" }: { on: boolean; compact?: boolean; lang?: WsLang }) {
  const t = wsSay(lang);
  const en = lang === "en";
  const features = en ? FEATURES_EN : FEATURES;
  const week = en ? WEEK_EN : WEEK;
  const not = en ? NOT_EN : NOT;
  const ask = en ? ASK_EN : ASK;
  const body = (
    <div className="cm-aig">
      {en ? (
        <p className="cm-aig-lead">
          So your result doesn't end on the day you get it, <b>MAT checks in with you every week while you apply</b>.
          It reads your result, your recorded experiences and the postings you saved, then puts <b>this week's task, your nearest deadlines and what several postings ask for that you haven't shown yet</b> into one briefing.
        </p>
      ) : (
        <p className="cm-aig-lead">
          검사 결과를 한 번 받고 끝내지 않도록, <b>지원하는 동안 한 주씩 챙기는 취업비서</b>입니다.
          매주 내 결과와 적어 둔 경험, 붙여 둔 공고를 읽고 <b>이번 주에 할 일 · 가까운 마감 · 여러 공고가 함께 요구하는데 비어 있는 것</b>을 브리핑 한 판에 모읍니다.
        </p>
      )}
      <ul className="cm-aig-for">
        {(en ? [
          "You have your result but aren't sure what to do next",
          "You've done a lot but can't put it into words for an application",
          "You find a posting and can't tell whether you should apply",
          "You're a graduate student or postdoc and find it hard to put your research in terms companies read",
        ] : [
          "검사 결과는 받았는데 다음에 무엇을 할지 막막한 분",
          "한 일은 많은데 지원서에 쓸 말로 정리가 안 된 분",
          "공고를 보고 내가 지원해도 되는지 판단이 안 서는 분",
          "학위 연구를 회사가 읽는 말로 옮기기 어려운 대학원생 · 박사후연구원",
        ]).map((x) => <li key={x}>{x}</li>)}
      </ul>

      <div className="cm-aig-grid">
        {features.map((f, i) => (
          <article key={f.key} className="cm-aig-card">
            <span className="cm-aig-no">{i + 1}</span>
            <h3>{f.name}</h3>
            <p className="cm-aig-what">{f.what}</p>
            <ol className="cm-aig-steps">
              {f.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <div className="cm-aig-ex">
              <p className="cm-aig-ex-h">{t("이렇게 넣으면")}</p>
              <p className="cm-aig-in">{f.input}</p>
              <p className="cm-aig-ex-h">{t("이렇게 받습니다")}</p>
              <ul className="cm-aig-out">
                {f.output.map((o) => <li key={o}>{o}</li>)}
              </ul>
            </div>
            {on ? <Link className="cm-aig-go" href={f.where}>{t("지금 써 보기")}</Link> : null}
          </article>
        ))}
      </div>

      <h3 className="cm-aig-h">{t("한 주는 이렇게 씁니다")}</h3>
      <ol className="cm-aig-week">
        {week.map(([when, what]) => (
          <li key={when}><b>{when}</b><span>{what}</span></li>
        ))}
      </ol>

      <h3 className="cm-aig-h">{t("하지 않는 일")}</h3>
      <ul className="cm-aig-not">
        {not.map(([h, d]) => <li key={h}><b>{h}</b><span>{d}</span></li>)}
      </ul>

      <h3 className="cm-aig-h">{t("자주 묻는 것")}</h3>
      <div className="cm-aig-ask">
        {ask.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <SectionHeader icon="spark" title={compact ? t("MAT 사용법") : t("MAT이 해 드리는 일")}
        sub={compact ? undefined : t("브리핑이 한 주의 할 일을 정하고, 나머지 도구가 그 빈 줄을 채웁니다.")} />
      {compact ? (
        <details className="cm-aig-fold">
          <summary>{t("무엇을 해 주는지 · 한 주 쓰는 법 · 하지 않는 일 보기")}</summary>
          {body}
        </details>
      ) : body}
    </>
  );
}
