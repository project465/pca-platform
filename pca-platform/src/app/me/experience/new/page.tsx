import { requireUser } from "@/lib/session";
import { EXPERIENCE_KINDS } from "@/lib/me-v3/platform";
import { axisLabel, content, domainName } from "@/lib/me-v3/runtime/session";
import { mark } from "@/lib/me-v3/workspace-events";
import { CmShell, CmHead } from "../../shell";
import { saveExperience } from "../actions";
import Picker from "./picker";

export const metadata = { title: "경험 추가 · 내 CareerMatri" };

/**
 * 그 결과가 어디로 갔는가.
 *
 * **`없음` 을 보기에 둔다.** 그 답도 자료이고, 그 칸을 없애면 아무거나
 * 고르게 된다. 그리고 쓰인 자리가 없는 것은 흔한 일이지 흠이 아니다.
 */
const USED_WHERE = [
  "수업이나 과제 평가에 들어갔다",
  "제작이나 발주로 이어졌다",
  "시제품이나 장비에 적용됐다",
  "공정이나 운전 기준이 바뀌었다",
  "논문이나 학회 발표가 됐다",
  "보고서나 과제 결과물로 제출됐다",
  "팀이나 다음 사람이 이어받았다",
  "아직 쓰인 자리가 없다",
];

/**
 * 경험 추가.
 *
 * **자유입력을 주 입력으로 두지 않는다.** 커리어메트리는 적어 주신 글을
 * 모델이 읽는 서비스가 아니다. 종류를 고르고, 어느 기술영역의 일인지
 * 고르고, 직접 정한 것과 남긴 것과 견준 것을 **그 영역의 체크리스트에서**
 * 고른다. 자유입력은 제목과 한 줄 메모뿐이고 메모는 판정에 들어가지 않는다.
 *
 * **이 회차에서 여기까지다.** 저장 계약과 화면은 섰고 자동 재채점은 다음
 * 회차다. 저장만으로 Gap 이 바뀌지 않는다는 것을 화면이 적는다.
 */
export default async function NewExperience() {
  const user = await requireUser();
  /* **적기 시작한 사람과 저장한 사람을 가른다.** 둘이 크게 벌어지면
     고칠 자리는 결과가 아니라 이 화면이다 */
  await mark("experience_add_started", user.id);
  const c = content();
  const domains = c.domains.domains;
  const lists = c.checklists.domains as Record<string, Record<string, { text: string }[]>>;
  const pick = (td: string, ax: string, n: number) =>
    (lists[td]?.[ax] ?? []).map((x) => x.text).slice(0, n);
  const axes = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

  return (
    <CmShell active="/me/experience" title="경험 추가">
      <CmHead
        kicker="경험 추가"
        title="새로 겪은 일을 적습니다"
        lead={"고르는 칸으로 받습니다. 적는 칸은 제목과 한 줄뿐이고, "
          + "그 한 줄은 결과를 쓸 때 당신의 말로 옮길 때만 읽습니다."}
      />

      {/*
        **왜 추가하는지를 먼저 적는다.** 적는 칸이 열두 개 보이는 화면에서
        읽는 사람이 가장 먼저 묻는 것이 그것이다. 그리고 **점수가 오른다고
        쓰지 않는다**: 경험으로 올라갈 수 있는 가장 높은 자리는 `직접
        수행` 까지이고(`직접 결정` 은 검사에서만 받는다), 굳은 결과는 한
        글자도 바뀌지 않는다.
      */}
      <div className="cm-soon" style={{ marginBottom: 20 }}>
        <b>왜 추가하나요</b>
        <ul>
          <li>지원서와 면접에서 설명할 근거가 한 줄 늘어납니다.</li>
          <li>비어 있던 자리가 채워지면 다음 할 일이 그만큼 달라집니다.</li>
          <li>검사 당시 결과는 그대로 남고, 지금 상태만 다시 섭니다.</li>
        </ul>
      </div>

      <form action={saveExperience}>
        <label className="cm-field">
          <span>어떤 경험인가요</span>
          <em>가장 가까운 하나를 고르세요.</em>
          <div className="cm-pickset">
            {EXPERIENCE_KINDS.map((k, i) => (
              <label className="cm-pick" key={k.code}>
                <input type="radio" name="kind" value={k.code} defaultChecked={i === 0} required />
                {k.label}
              </label>
            ))}
          </div>
        </label>

        <label className="cm-field">
          <span>무엇을 했는지 한 줄로</span>
          <em>나중에 이 줄로 찾습니다. 과제 이름이나 주제면 됩니다.</em>
          <input className="cm-input" name="title" maxLength={120} required
            placeholder="예: 전동 스쿠터 프레임 경량화 캡스톤" />
        </label>

        <div className="cm-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <label className="cm-field">
            <span>시작</span>
            <input className="cm-input" type="month" name="started_on" />
          </label>
          <label className="cm-field">
            <span>끝</span>
            <em>아직 하는 중이면 비워 두세요.</em>
            <input className="cm-input" type="month" name="ended_on" />
          </label>
        </div>

        <fieldset className="cm-field">
          <legend><span>어느 기술영역의 일인가요</span></legend>
          <em>여러 개 고를 수 있습니다. 고른 영역의 항목이 아래에 뜹니다.</em>
          <Picker
            domains={domains.map((d) => ({
              code: d.code, name: domainName(d.code),
              /* 문제와 판단은 **그 영역의 체크리스트에서** 온다. 지어낸
                 보기를 두면 고르는 사람이 자기 일과 다른 말을 고른다 */
              problems: pick(d.code, "J1", 6),
              decisions: pick(d.code, "J3", 8),
              artifacts: d.artifacts, verify: d.verify_targets,
            }))}
          />
        </fieldset>

        <fieldset className="cm-field">
          <legend><span>어느 판단에 걸리나요</span></legend>
          <em>해당하는 것이 없으면 비워 두셔도 됩니다.</em>
          <div className="cm-pickset">
            {axes.map((a) => (
              <label className="cm-pick" key={a}>
                <input type="checkbox" name="axis" value={a} />
                {axisLabel(a)}
              </label>
            ))}
          </div>
        </fieldset>

        {/* **어디에 쓰였나를 고정 메뉴로 받는다.** 영역마다 다른 말이
            아니고 `그 결과가 어디로 갔는가` 한 가지 물음이라, 영역별
            체크리스트에 두면 같은 보기가 열두 번 선다 */}
        <fieldset className="cm-field">
          <legend><span>그 결과가 어디에 쓰였나요</span></legend>
          <em>쓰인 자리가 없으면 비워 두세요. 비웠다고 불리해지지 않습니다.</em>
          <div className="cm-pickset">
            {USED_WHERE.map((u) => (
              <label className="cm-pick" key={u}>
                <input type="checkbox" name="used_where" value={u} />{u}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="cm-field">
          <span>덧붙일 한 줄</span>
          <em>결과에 반영되지 않습니다. 결과를 쓸 때 당신의 말로 옮길 때만 읽고,
            1년이 지나면 지웁니다.</em>
          <textarea className="cm-textarea" name="note" maxLength={400}
            placeholder="예: 하중 조건을 직접 정하고 시험값과 10% 안에서 맞췄습니다" />
        </label>

        {/* **저장하는 순간 자동으로 반영하지 않는다.** 계산이 깨진 날
            저장까지 막히지 않게 하려는 것이 하나이고, 무엇이 달라지는지
            먼저 보고 누르게 하려는 것이 둘이다 */}
        <div className="cm-soon" style={{ marginBottom: 18 }}>
          <b>저장만으로 지금 상태가 바뀌지는 않습니다.</b> 적어 두신 것은
          반영할 거리로 쌓이고, 무엇이 어느 판단으로 가는지 보신 뒤에
          직접 누르면 지금 상태에 들어갑니다.
        </div>

        <div className="cm-acts">
          <button className="cm-btn is-primary" type="submit">저장하기</button>
        </div>
      </form>
    </CmShell>
  );
}
