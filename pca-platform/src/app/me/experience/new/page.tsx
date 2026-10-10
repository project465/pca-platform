import { requireUser } from "@/lib/session";
import { EXPERIENCE_KINDS } from "@/lib/me-v3/platform";
import { content, domainName } from "@/lib/me-v3/runtime/session";
import { mark } from "@/lib/me-v3/workspace-events";
import { CmShell, CmHead } from "../../shell";
import { saveExperience } from "../actions";
import Steps from "./steps";

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
 * **세 걸음으로 묻는다**(규격 §4): 무슨 경험이었나 · 어떤 기술 판단이었나 ·
 * 무엇이 남았나. 전에는 이 셋이 한 화면에 함께 서서 적는 칸 스무 개가 한
 * 번에 보였고, 1~2분이면 되는 일이 과제로 읽혔다. **저장은 끝에서 한
 * 번이고 DB 구조를 한 줄도 바꾸지 않았다**: 걸음마다 저장하면 둘째에서
 * 닫은 기록이 반쪽으로 남고 그 반쪽이 판정에 들어간다.
 */
export default async function NewExperience(
  { searchParams }: { searchParams: Promise<{ e?: string }> },
) {
  const user = await requireUser();
  const e = (await searchParams).e ?? "";
  /* **적기 시작한 사람과 저장한 사람을 가른다.** 둘이 크게 벌어지면
     고칠 자리는 결과가 아니라 이 화면이다 */
  await mark("experience_add_started", user.id);
  const c = content();
  const domains = c.domains.domains;
  const lists = c.checklists.domains as Record<string, Record<string, { text: string }[]>>;
  const pick = (td: string, ax: string, n: number) =>
    (lists[td]?.[ax] ?? []).map((x) => x.text).slice(0, n);

  return (
    <CmShell active="/me/experience" title="경험 추가">
      {/* **부담 없는 한 건이다**(규격 §3). 1~2분 안에 하나를 적는 자리라
          적기 전에 읽을 것을 한 줄로 줄이고 까닭은 접는다 */}
      <CmHead
        kicker="경험"
        title="새 경험 하나 추가"
        lead="세 걸음입니다. 대부분 고르는 칸이고 적는 칸은 제목 한 줄입니다."
      />

      {/*
        **왜 추가하는지는 접어 둔다.** 적기 전에 읽어야 하는 글이 아니고,
        궁금한 사람만 펼치면 된다. 그리고 **점수가 오른다고 쓰지 않는다**:
        경험으로 올라갈 수 있는 가장 높은 자리는 `직접 수행` 까지이고
        (`직접 결정` 은 검사에서만 받는다), 굳은 결과는 한 글자도 바뀌지
        않는다.
      */}
      <details className="cm-why">
        <summary>이걸 적으면 무엇이 달라지나요</summary>
        <ul>
          <li>지원서와 면접에서 설명할 근거가 한 줄 늘어납니다.</li>
          <li>비어 있던 자리가 채워지면 다음 할 일이 그만큼 달라집니다.</li>
          <li>검사 당시 결과는 그대로 남고, 현재 상태만 다시 섭니다.</li>
        </ul>
      </details>

      {/* 저장이 거절된 자리. **통보로 끝내지 않고 무엇을 채우면 되는지
          적는다**(규격 §39).

          **채우면 되는 것과 우리 쪽이 안 된 것을 가른다**(규격 §19).
          앞엣것은 적는 사람이 고칠 수 있고 뒤엣것은 고칠 수 없다. 한
          문장으로 적으면 우리가 못 받은 날에도 적은 사람이 자기 글을
          의심하며 칸을 고친다 */}
      {e === "form" ? (
        <p className="cm-fail" role="alert">
          저장하지 못했습니다. 어떤 경험인지와 한 줄 설명을 채워주세요.
        </p>
      ) : e === "save" ? (
        <p className="cm-fail" role="alert">
          경험을 저장하지 못했습니다. 적어 주신 내용은 아직 저장되지
          않았으니, 아래에서 한 번 더 눌러 주세요. 다시 안 되면 고객지원으로
          알려 주세요.
        </p>
      ) : null}

      <form action={saveExperience}>
        <Steps
          domains={domains.map((d) => ({
            code: d.code, name: domainName(d.code),
            /* 문제와 판단은 **그 영역의 체크리스트에서** 온다. 지어낸
               보기를 두면 고르는 사람이 자기 일과 다른 말을 고른다 */
            problems: pick(d.code, "J1", 6),
            decisions: pick(d.code, "J3", 8),
            artifacts: d.artifacts, verify: d.verify_targets,
          }))}
          one={
            <>
              <label className="cm-field">
                <span>어떤 경험인가요</span>
                <em>가장 가까운 하나를 고르세요.</em>
                <div className="cm-pickset">
                  {EXPERIENCE_KINDS.map((k, i) => (
                    <label className="cm-pick" key={k.code}>
                      <input type="radio" name="kind" value={k.code}
                        defaultChecked={i === 0} required />
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

              {/* **언제는 한 칸이다**(규격 §3). 시작과 끝을 같은 크기의 큰
                  칸 둘로 세우면 날짜가 이 걸음에서 가장 큰 자리를 먹는데,
                  날짜는 나중에 찾을 때 쓰는 값이지 판정에 들어가는 값이
                  아니다. 끝난 달은 3단에서 적고 싶은 사람만 적는다 */}
              <label className="cm-field is-half">
                <span>언제</span>
                <em>시작한 달이면 됩니다.</em>
                <input className="cm-input" type="month" name="started_on" />
              </label>
            </>
          }
          three={
            <>
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

              {/* 나머지 둘은 더 접는다. 적으면 좋지만 없어도 저장되는 값이고,
                  저장한 뒤에도 고칠 수 있다 */}
              <details className="cm-why is-fields">
                <summary>더 적을 것이 있으면 (선택)</summary>

                <label className="cm-field is-half">
                  <span>끝난 달</span>
                  <em>아직 하는 중이면 비워 두세요.</em>
                  <input className="cm-input" type="month" name="ended_on" />
                </label>

                <label className="cm-field">
                  <span>보완 설명 한 줄</span>
                  <em>결과에 반영되지 않습니다. 결과를 쓸 때 당신의 말로 옮길 때만 읽고,
                    1년이 지나면 지웁니다.</em>
                  <textarea className="cm-textarea" name="note" maxLength={400}
                    placeholder="예: 하중 조건을 직접 정하고 시험값과 10% 안에서 맞췄습니다" />
                </label>
              </details>

              {/* **저장하는 순간 자동으로 반영하지 않는다**(규격 §6). 계산이
                  깨진 날 저장까지 막히지 않게 하려는 것이 하나이고, 무엇이
                  달라지는지 먼저 보고 누르게 하려는 것이 둘이다 */}
              <p className="cm-none" style={{ marginTop: 10 }}>
                저장하면 무엇이 달라지는지 먼저 보여 드리고, 거기서 반영을 누르면
                현재 상태에 들어갑니다. 검사 당시 결과는 그대로 남습니다.
              </p>
            </>
          }
        />
      </form>
    </CmShell>
  );
}
