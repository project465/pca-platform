/**
 * 매트가 **무엇을 해 주는가.**
 *
 * 한동안 이 쪽은 기간권이 열려 있지 않은 사람에게 `열려 있지 않습니다` 와
 * 결제 카드 둘만 세웠다. 그러면 무엇을 사는지가 화면 어디에도 없고, 산
 * 사람도 세 가지 도구를 언제 어떻게 쓰는지 모른다. 여기 적는 것은 셋이다:
 * 하는 일(입력과 받는 것까지) · 한 주를 어떻게 쓰는가 · 하지 않는 일.
 *
 * **지어낸 성과를 적지 않는다.** 예시는 학부 수업과 과제에서 나올 수 있는
 * 것이고, `합격률` 이나 `몇 % 올랐다` 같은 수는 이 서비스가 재지 않는다.
 */
import Link from "next/link";
import { SectionHeader } from "../ui";

const FEATURES: {
  key: string; name: string; what: string; steps: string[];
  input: string; output: string[]; where: string;
}[] = [
  {
    key: "nudge",
    name: "매주 할 일 알림",
    what: "검사 결과에서 가장 먼저 채울 부분을 골라, 이번 주에 할 일 하나로 정리해 보여 줍니다.",
    steps: [
      "월요일마다 이번 주 할 일 하나가 이 화면과 홈에 뜹니다",
      "적어 둔 공고가 있으면 마감 7일 · 3일 · 1일 전에 한 번 더 알림이 옵니다",
      "원하시면 같은 내용을 한 주에 한 통 메일로도 받습니다",
    ],
    input: "따로 적을 것 없음 (검사 결과와 적어 둔 경험을 읽습니다)",
    output: [
      "이번 주: 마케팅·시장 과제 하나를 골라 ‘누구에게 무엇을 팔지’를 어떻게 정했는지 세 줄로 적기",
      "마감 3일 전: OO식품 마케팅 신입 · 아직 없는 요구 항목 2개",
    ],
    where: "#nudge",
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
    name: "공고와 내 경험 맞대 보기",
    what: "직접 찾은 채용 공고를 붙여 넣으면, 요구 항목마다 내 경험이 있는지 나눠 보여 줍니다.",
    steps: [
      "공고의 하는 일 · 자격 요건 · 우대 사항 부분을 붙여 넣습니다",
      "AI가 요구 항목을 한 줄씩 끊어 내 전공의 업무 영역에 연결합니다",
      "항목마다 ‘설명할 경험 있음 · 정리가 덜 됨 · 아직 없음 · 전공 밖 조건’으로 나눕니다",
    ],
    input: "[담당 업무] 브랜드 SNS 채널 운영, 캠페인 성과 분석 … [우대] 데이터 분석 경험",
    output: [
      "캠페인 성과 분석 → 설명할 경험 있음 (마케팅원론 설문 과제)",
      "SNS 채널 운영 → 아직 없음 · 이렇게 채워 볼 수 있습니다: 동아리 계정 한 달 운영 기록",
    ],
    where: "#posting",
  },
];

const WEEK: [string, string][] = [
  ["월요일", "이번 주 할 일 하나가 뜹니다. 30분이면 끝낼 크기입니다."],
  ["주중", "과제나 활동을 마치면 메모 두 줄을 적어 경험 기록으로 옮깁니다."],
  ["공고를 봤을 때", "붙여 넣고 비어 있는 요구 항목을 확인합니다. 지원은 공고를 낸 곳에서 직접 합니다."],
  ["마감 전", "7일 · 3일 · 1일 전에 남은 항목을 다시 알립니다."],
];

const NOT: [string, string][] = [
  ["점수나 합격 가능성을 만들지 않습니다", "판정은 검사 결과와 적어 주신 경험으로만 하고, AI는 글을 읽고 나누는 일만 합니다."],
  ["기업을 골라 주거나 대신 지원하지 않습니다", "공고는 직접 찾아 붙여 넣으시고, 지원도 직접 하십니다."],
  ["자기소개서를 대신 써 드리지 않습니다", "쓸 재료와 차례까지 정리하고, 글은 직접 쓰십니다."],
  ["자동으로 결제되지 않습니다", "30일권 · 365일권 모두 한 번 결제이고, 기간이 끝나면 저절로 닫힙니다."],
];

const ASK: [string, string][] = [
  ["검사 결과가 없어도 쓸 수 있나요?",
    "쓸 수 있지만, 할 일 알림과 공고 맞대기는 검사 결과가 있어야 정확해집니다. 검사를 먼저 마치시길 권합니다."],
  ["AI를 끄면 어떻게 되나요?",
    "세 가지 모두 규칙으로 계속 돕니다. 공고의 요구 항목을 낱말로 찾고, 메모는 그대로 경험 추가 화면으로 넘깁니다. 밖으로 보내는 글은 없습니다."],
  ["붙여 넣은 글은 어디로 가나요?",
    "AI 분석을 켠 경우에만 Anthropic(미국)의 Claude가 읽습니다. 이름과 연락처는 보내지 않고, 공고 본문은 1년 · 메모는 30일 뒤 지웁니다."],
  ["학교에서 받은 계정도 쓸 수 있나요?",
    "PRO 결과를 받으셨다면 첫 1개월을 열 수 있습니다. 그 뒤로는 30일권이나 365일권을 고르시면 됩니다."],
];

/**
 * @param on 기간권이 열려 있는가. 열려 있으면 바로 쓸 자리로 가는 링크를 단다
 * @param compact 이미 쓰는 사람에게는 접어서 둔다
 */
export function AssistantGuide({ on, compact }: { on: boolean; compact?: boolean }) {
  const body = (
    <div className="cm-aig">
      <p className="cm-aig-lead">
        검사 결과를 한 번 받고 끝내지 않도록, <b>지원하는 동안 매주 옆에서 같이 챙기는 도구</b>입니다.
        내 결과와 내가 적은 경험을 읽고 <b>이번 주에 할 일 · 적어 둘 경험 · 공고에서 비어 있는 부분</b>을 짚어 줍니다.
      </p>
      <ul className="cm-aig-for">
        <li>검사 결과는 받았는데 다음에 무엇을 할지 막막한 분</li>
        <li>한 일은 많은데 지원서에 쓸 말로 정리가 안 된 분</li>
        <li>공고를 보고 내가 지원해도 되는지 판단이 안 서는 분</li>
      </ul>

      <div className="cm-aig-grid">
        {FEATURES.map((f, i) => (
          <article key={f.key} className="cm-aig-card">
            <span className="cm-aig-no">{i + 1}</span>
            <h3>{f.name}</h3>
            <p className="cm-aig-what">{f.what}</p>
            <ol className="cm-aig-steps">
              {f.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <div className="cm-aig-ex">
              <p className="cm-aig-ex-h">이렇게 넣으면</p>
              <p className="cm-aig-in">{f.input}</p>
              <p className="cm-aig-ex-h">이렇게 받습니다</p>
              <ul className="cm-aig-out">
                {f.output.map((o) => <li key={o}>{o}</li>)}
              </ul>
            </div>
            {on ? <Link className="cm-aig-go" href={f.where}>지금 써 보기</Link> : null}
          </article>
        ))}
      </div>

      <h3 className="cm-aig-h">한 주는 이렇게 씁니다</h3>
      <ol className="cm-aig-week">
        {WEEK.map(([when, what]) => (
          <li key={when}><b>{when}</b><span>{what}</span></li>
        ))}
      </ol>

      <h3 className="cm-aig-h">하지 않는 일</h3>
      <ul className="cm-aig-not">
        {NOT.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}
      </ul>

      <h3 className="cm-aig-h">자주 묻는 것</h3>
      <div className="cm-aig-ask">
        {ASK.map(([q, a]) => (
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
      <SectionHeader icon="spark" title={compact ? "매트 사용법" : "매트가 해 드리는 일"}
        sub={compact ? undefined : "세 가지 도구를 매주 이어서 씁니다. 결과지 한 장으로 끝나지 않게 하는 자리입니다."} />
      {compact ? (
        <details className="cm-aig-fold">
          <summary>무엇을 해 주는지 · 한 주 쓰는 법 · 하지 않는 일 보기</summary>
          {body}
        </details>
      ) : body}
    </>
  );
}
