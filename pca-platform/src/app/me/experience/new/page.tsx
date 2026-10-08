import { requireUser } from "@/lib/session";
import { EXPERIENCE_KINDS } from "@/lib/me-v3/platform";
import { axisLabel, content, domainName } from "@/lib/me-v3/runtime/session";
import { CmShell, CmHead } from "../../shell";
import { saveExperience } from "../actions";
import Picker from "./picker";

export const metadata = { title: "경험 추가 · 내 CareerMatri" };

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
  await requireUser();
  const domains = content().domains.domains;
  const axes = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

  return (
    <CmShell active="/me/experience" title="경험 추가">
      <CmHead
        kicker="경험 추가"
        title="새로 겪은 일을 적습니다"
        lead={"고르는 칸으로 받습니다. 적는 칸은 제목과 한 줄뿐이고, "
          + "그 한 줄은 결과를 쓸 때 당신의 말로 옮길 때만 읽습니다."}
      />

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

        <label className="cm-field">
          <span>덧붙일 한 줄</span>
          <em>결과에 반영되지 않습니다. 결과를 쓸 때 당신의 말로 옮길 때만 읽고,
            1년이 지나면 지웁니다.</em>
          <textarea className="cm-textarea" name="note" maxLength={400}
            placeholder="예: 하중 조건을 직접 정하고 시험값과 10% 안에서 맞췄습니다" />
        </label>

        <div className="cm-soon" style={{ marginBottom: 18 }}>
          <b>저장만으로 근거와 Gap이 바뀌지는 않습니다.</b> 적어 두신 것은
          다시 계산할 일로 쌓이고, 재분석이 켜지는 날 한 번에 들어갑니다.
          그 전에 적어 두셔도 손해가 없습니다.
        </div>

        <div className="cm-acts">
          <button className="cm-btn is-primary" type="submit">저장하기</button>
        </div>
      </form>
    </CmShell>
  );
}
