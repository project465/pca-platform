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
    name: "공고와 내 경험 맞대 보기",
    what: "직접 찾은 채용 공고를 붙여 넣으면, 요구 항목마다 내 경험이 있는지 나누고 지원서 문장 뼈대를 엮습니다.",
    steps: [
      "공고의 하는 일 · 자격 요건 · 우대 사항 부분을 붙여 넣습니다",
      "항목마다 ‘설명할 경험 있음 · 정리가 덜 됨 · 아직 없음 · 전공 밖 조건’으로 나눕니다",
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
  ["자동으로 결제되지 않습니다", "30일권 · 365일권 모두 한 번 결제이고, 기간이 끝나면 저절로 닫힙니다."],
];

const ASK: [string, string][] = [
  ["검사 결과가 없어도 쓸 수 있나요?",
    "쓸 수 있지만, 할 일 알림과 공고 맞대기는 검사 결과가 있어야 정확해집니다. 검사를 먼저 마치시길 권합니다."],
  ["AI를 끄면 어떻게 되나요?",
    "브리핑과 문장 뼈대는 처음부터 AI 없이 만듭니다. 공고는 항목 제목과 전공별 도구 이름으로 읽고, 메모에서는 확실한 보기만 미리 고른 뒤 나머지는 메모 속 문장을 보여 드리며 여쭙니다. 밖으로 보내는 글은 없습니다."],
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
        검사 결과를 한 번 받고 끝내지 않도록, <b>지원하는 동안 한 주씩 챙기는 취업비서</b>입니다.
        매주 내 결과와 적어 둔 경험, 붙여 둔 공고를 읽고 <b>이번 주에 할 일 · 가까운 마감 · 여러 공고가 함께 요구하는데 비어 있는 것</b>을 브리핑 한 판에 모읍니다.
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
      <SectionHeader icon="spark" title={compact ? "MAT 사용법" : "MAT이 해 드리는 일"}
        sub={compact ? undefined : "브리핑이 한 주의 할 일을 정하고, 나머지 둘이 그 빈 줄을 채웁니다."} />
      {compact ? (
        <details className="cm-aig-fold">
          <summary>무엇을 해 주는지 · 한 주 쓰는 법 · 하지 않는 일 보기</summary>
          {body}
        </details>
      ) : body}
    </>
  );
}
