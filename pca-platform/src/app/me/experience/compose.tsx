import { activeMajorName } from "@/lib/me-v3/major-name";
import {
  EXPERIENCE_KINDS, activeCoreOrPick, latestResult, type Experience,
} from "@/lib/me-v3/platform";
import { content, domainName } from "@/lib/me-v3/runtime/session";
import {
  experienceExample, experienceFlow, studentActivity, studentStateView,
} from "@/lib/me-v3/student";
import type { Zone } from "@/lib/me-v3/scoring/types";
import { CmShell, CmHead } from "../shell";
import { MonthPick } from "../ui";
import { saveExperience, editExperience } from "./actions";
import Steps from "./steps";
import UnsavedGuard from "../unsaved";

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
  "아직 쓰인 곳이 없다",
];

/**
 * 아홉 종류를 **세 묶음**으로 세운다(R30 · PHASE 2).
 *
 * 아홉이 한 줄에 알약으로 깔리면 읽는 사람이 아홉을 다 읽고 고른다. 묶음
 * 머리가 먼저 읽히면 자기 일이 어느 묶음인지부터 좁혀 셋 가운데서 고른다.
 * **종류와 저장되는 값은 그대로다**: 묶는 것은 화면이고 `kind` 의 아홉 코드가
 * 한 글자도 바뀌지 않는다. 아홉이 빠짐없이 어느 묶음에 드는지는
 * `v3:student` 가 센다.
 */
const KIND_GROUPS: { label: string; hint: string; codes: string[] }[] = [
  { label: "수업·과제", hint: "들으면서 맡거나 제출한 것",
    codes: ["course", "assignment", "capstone"] },
  { label: "연구·프로젝트", hint: "직접 끌고 간 것",
    codes: ["research", "paper", "project"] },
  { label: "현장·자격", hint: "밖에서 맡았거나 따 둔 것",
    codes: ["internship", "work", "credential"] },
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
/**
 * 경험 하나를 적는 자리. **새로 적는 쪽과 고치는 쪽이 한 벌이다.**
 *
 * 두 벌로 적어 두면 걸음이 한 번 바뀐 날 한 곳만 고쳐지고, 그러면 고치러
 * 들어온 사람이 **새로 적을 때와 다른 칸**을 본다(`_loop-fixture` 와
 * `_v3-walk` 에서 이미 겪은 자리다).
 *
 * 갈리는 것은 셋뿐이다: 머리글 · 보내는 자리 · 되돌려 줄 값.
 */
export default async function Compose(
  { userId, value, e, td }: {
    userId: string;
    /** 고치는 자리면 적어 둔 기록. 없으면 새로 적는 자리다 */
    value?: Experience | null;
    /** 저장이 거절된 까닭 */
    e?: string;
    /** 할 일에서 넘어왔을 때 미리 켜 둘 기술영역(규격 §10) */
    td?: string;
  },
) {
  const user = { id: userId };
  const major = await activeMajorName(user.id);
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCoreOrPick(user.id);
  const edit = Boolean(value);
  const c = content(core);
  const domains = c.domains.domains;
  const lists = c.checklists.domains as Record<string, Record<string, { text: string }[]>>;
  const pick = (t: string, ax: string, n: number) =>
    (lists[t]?.[ax] ?? []).map((x) => x.text).slice(0, n);
  /**
   * 되돌려 줄 값.
   *
   * **할 일에서 넘어온 영역을 켜 둔다**(규격 §10). 그 줄을 읽고 `경험에
   * 추가` 를 누른 사람은 **그 영역의 일**을 적으러 온 것이고, 켜 두지
   * 않으면 열두 영역에서 그 하나를 다시 찾아야 한다.
   */
  /* 묻는 말은 **그 Core 의 사전**이 든다(R30). `기술 판단` 을 화면에 박지
     않는다: 경영학과 학생이 자기 과제를 그 말로 읽지 못한다 */
  const flow = experienceFlow(core);
  /* 2단에서 먼저 세울 영역(R31). **결과지와 홈이 읽는 같은 함수**로 고른다:
     그 사람의 결과가 서 있는 영역 셋이고, 할 일에서 넘어온 영역이 있으면
     그것이 맨 앞이다. 결과가 없으면 비어 있고 그때는 전부가 선다 */
  const model = await latestResult(user.id);
  const zoneOf: Record<string, Zone> = {};
  for (const d of model?.domains ?? []) zoneOf[d.code] = d.zone;
  const suggest = [
    ...(td ? [td] : []),
    ...(model ? studentStateView(core, model, zoneOf, 3).tiles.map((t) => t.code) : []),
    ...(value?.td_codes ?? []),
  ];
  const picked = {
    td: value?.td_codes ?? (td ? [td] : []),
    problems: value?.problems ?? [],
    decisions: value?.decisions ?? [],
    artifacts: value?.artifacts ?? [],
    verifications: value?.verifications ?? [],
  };

  return (
    <CmShell active="/me/experience"
      title={edit ? "경험 고치기" : "경험 추가"} form major={major}>
      {/* **부담 없는 한 건이다**(규격 §8). 1~2분 안에 하나를 적는 자리라
          적기 전에 읽을 것을 없애고 까닭은 폼 아래로 접는다.

          **거들지 않는 설명은 지운다**(규격 §8). `대부분 고르는 칸입니다`
          는 아래를 한 번 보면 알 수 있는 사실이고, 그 줄이 서 있는 동안
          손전화에서 첫 입력 칸이 그만큼 아래로 내려간다. 시스템이 제
          생김새를 설명하는 줄은 적는 사람에게 값이 없다 */}
      <CmHead title={edit ? "적어 둔 경험 고치기" : "새 경험 하나 추가"} />

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

      {/* 적다 만 것을 들고 나가지 않게 막는다(규격 §4). 손전화에서 저장
          단추 바로 아래가 아래 띠라, 한 칸 아래를 누르면 적던 것이 통째로
          사라지는 자리다 */}
      <UnsavedGuard />

      {/* **적는 자리를 한 판 위에 올린다**(규격 §13 · 시각 규격 §9).
          전에는 칸과 칩이 쪽 바탕 위에 그대로 떠 있어서, 같은 쪽에 적는
          자리의 경계가 없고 **덜 그린 화면**으로 읽혔다. 기록을 쓰는
          자리는 하나의 면이어야 적는 동안 눈이 그 안에 머문다 */}
      <form className="cm-compose" action={edit ? editExperience : saveExperience}>
        {/* 고치는 자리는 **어느 기록인지**를 들고 간다. 서버가 그 번호와
            로그인한 사람으로 한 번 더 거른다: 주소에 남의 번호를 넣어도
            열리지 않는다 */}
        {value ? <input type="hidden" name="id" value={value.id} /> : null}
        <Steps
          value={picked}
          flow={flow}
          {...(edit ? { saveLabel: "고친 내용 저장" } : {})}
          {...(!edit && td ? { fromAction: domainName(core, td) } : {})}
          suggest={[...new Set(suggest)]}
          domains={domains.map((d) => ({
            code: d.code, name: domainName(core, d.code),
            /* 이름 아래 한 줄은 **그 영역에서 학생이 해 본 일**이다. 사전이
               없는 Core 는 전과 같이 `domainSub` 로 떨어지고 그 사실은
               `v3:student` 가 센다 */
            sub: studentActivity(core, d.code),
            /* 문제와 판단은 **그 영역의 체크리스트에서** 온다. 지어낸
               보기를 두면 고르는 사람이 자기 일과 다른 말을 고른다 */
            problems: pick(d.code, "J1", 6),
            decisions: pick(d.code, "J3", 8),
            artifacts: d.artifacts, verify: d.verify_targets,
          }))}
          one={
            <>
              {/* **보조 설명을 달지 않는다**(규격 §3). 보기 아홉이 그대로
                  보이는 자리라 `가장 가까운 하나를 고르세요` 는 보고 있는
                  것을 글로 한 번 더 읽게 하는 줄이다. 설명문을 읽어야
                  적을 수 있는 칸이면 그 칸이 잘못 서 있는 것이다 */}
              <fieldset className="cm-field">
                <legend><span>어떤 경험인가요</span></legend>
                <div className="cm-kinds">
                  {KIND_GROUPS.map((g) => (
                    <div className="cm-kind-g" key={g.label}>
                      <p><b>{g.label}</b><small>{g.hint}</small></p>
                      <div className="cm-pickset">
                        {/* **미리 고르지 않는다.** `수업` 을 켜 둔 채로 두면
                            그냥 넘긴 사람의 기록이 전부 수업이 되고, 그 값은
                            그 사람이 고른 값이 아니다 */}
                        {EXPERIENCE_KINDS.filter((k) => g.codes.includes(k.code)).map((k) => (
                          <label className="cm-pick" key={k.code}>
                            <input type="radio" name="kind" value={k.code} required
                              defaultChecked={value?.kind === k.code} />
                            {k.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>

              {/* 빈 칸의 길잡이는 **예시 하나**가 맡는다. 같은 말을 설명으로
                  한 번 더 적으면 칸 하나에 읽을 줄이 셋이 된다 */}
              <label className="cm-field">
                <span>무엇을 했는지 한 줄로</span>
                <input className="cm-input" name="title" maxLength={120} required
                  defaultValue={value?.title ?? ""}
                  /* **다른 전공의 예시를 공통 화면에 박아 두지
                     않는다**(CROSS-CORE §7). 전에는 이 자리가
                     `예: 전동 스쿠터 프레임 경량화 캡스톤` 한 줄이라
                     경영학과 학생이 기계공학 예시를 읽었다. 운영
                     Canary 의 `기계공학자` 와 같은 모양이다 */
                  placeholder={experienceExample(core)} />
              </label>

              {/* **언제는 한 칸이다**(규격 §3). 시작과 끝을 같은 크기의 큰
                  칸 둘로 세우면 날짜가 이 걸음에서 가장 큰 자리를 먹는데,
                  날짜는 나중에 찾을 때 쓰는 값이지 판정에 들어가는 값이
                  아니다. 끝난 달은 3단에서 적고 싶은 사람만 적는다 */}
              {/* **날짜가 걸음을 차지하지 않게 둔다**(R30). 찾을 때 쓰는 값이지
                  판정에 들어가는 값이 아니라, 제목 아래 한 단 작은 자리에
                  대략이면 된다는 말과 함께 선다 */}
              <div className="cm-meta">
                <MonthPick name="started_on" label="시작한 달"
                  hint="대략이면 됩니다. 나중에 찾을 때만 씁니다."
                  value={value?.started_on ?? null} />
              </div>
            </>
          }
          three={
            <>
              {/* **어디에 쓰였나를 고정 메뉴로 받는다.** 영역마다 다른 말이
                  아니고 `그 결과가 어디로 갔는가` 한 가지 물음이라, 영역별
                  체크리스트에 두면 같은 보기가 열두 번 선다 */}
              <fieldset className="cm-field">
                <legend><span>그 결과가 어디에 쓰였나요</span></legend>
                <em>쓰인 곳이 없으면 비워 두세요. 비웠다고 불리해지지 않습니다.</em>
                <div className="cm-pickset">
                  {USED_WHERE.map((u) => (
                    <label className="cm-pick" key={u}>
                      <input type="checkbox" name="used_where" value={u}
                        defaultChecked={Boolean(value?.used_where?.includes(u))} />{u}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 나머지 둘은 더 접는다. 적으면 좋지만 없어도 저장되는 값이고,
                  저장한 뒤에도 고칠 수 있다 */}
              <details className="cm-why is-fields">
                <summary>더 적을 것이 있으면 (선택)</summary>

                <MonthPick
                  name="ended_on" label="끝난 달"
                  value={value?.ended_on ?? null}
                  on={Boolean(value && value.started_on && !value.ended_on)}
                  ongoing={{ name: "ongoing", label: "아직 진행 중" }} />

                <label className="cm-field">
                  <span>보완 설명 한 줄</span>
                  <em>결과를 바꾸지 않습니다. 결과를 쓸 때 당신의 말로 옮길 때만 읽고,
                    1년이 지나면 지웁니다.</em>
                  <textarea className="cm-textarea" name="note" maxLength={400}
                    defaultValue={value?.note_text ?? ""}
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

      {/*
        **왜 적는지는 폼 아래에 접어 둔다**(규격 §3). 적기 전에 읽어야 하는
        글이 아니라 궁금한 사람만 펼치는 글인데, 맨 위에 두었더니 손전화
        첫 화면이 설명 넷으로 차고 첫 입력 칸이 밖으로 밀렸다. 그리고
        **점수가 오른다고 쓰지 않는다**: 경험으로 올라갈 수 있는 가장 높은
        자리는 `직접 수행` 까지이고(`직접 결정` 은 검사에서만 받는다), 굳은
        결과는 한 글자도 바뀌지 않는다.
      */}
      <details className="cm-why">
        <summary>이걸 적으면 무엇이 달라지나요</summary>
        <ul>
          <li>지원서와 면접에서 설명할 근거가 한 줄 늘어납니다.</li>
          <li>부족했던 부분이 채워지면 다음 할 일이 그만큼 달라집니다.</li>
          <li>검사 당시 결과는 그대로 남고, 현재 상태만 다시 섭니다.</li>
        </ul>
      </details>
    </CmShell>
  );
}
