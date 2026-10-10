"use client";

import { useRef, useState, type ReactNode } from "react";

export type Dom = {
  code: string; name: string;
  problems: string[]; decisions: string[];
  artifacts: string[]; verify: string[];
};

/**
 * 세 걸음의 이름. **무엇을 묻는 자리인지**로 적는다. 축 이름이 아니다.
 *
 * **설명을 달지 않는다**(규격 §2). 한동안 이름마다 한 줄씩 덧붙였더니
 * 손전화에서 걸음 표가 두 줄로 접혀 260px 을 먹었고, **첫 입력 칸이 화면
 * 밖으로 밀렸다.** 무엇을 묻는지는 그 걸음의 칸이 적는다.
 */
const STEPS = [
  { n: 1, title: "무슨 경험" },
  { n: 2, title: "기술 판단" },
  { n: 3, title: "남은 것" },
] as const;

/**
 * 경험 하나를 세 걸음으로 적는다(규격 §4).
 *
 * **한 번에 다 펼치지 않는다.** 전에는 칸 스무 개와 칩 이백 개가 한
 * 화면에 서서, 1~2분이면 되는 일이 과제로 읽혔다. 그런데 **걸음마다
 * 저장하지도 않는다**: 저장을 셋으로 쪼개면 둘째에서 닫은 기록이 반쪽으로
 * 남고, 그 반쪽이 판정에 들어간다.
 *
 * 그래서 걸음은 **화면만** 나눈다. 세 판이 전부 폼 안에 그대로 있고
 * (`hidden` 으로 가린다) 저장은 마지막에 한 번이다. **DB 구조를 한 줄도
 * 바꾸지 않았다**: 받는 칸과 저장하는 함수가 전과 같다.
 *
 * **고른 영역의 항목만 띄운다.** 열두 영역의 항목을 다 펼치면 쓸 일 없는
 * 칸이 이백 개 보이고 거기서 닫는다. 그리고 영역을 고르는 자리가 2단이라
 * 3단의 결과물 칩은 **고른 영역의 것만** 선다.
 *
 * **가린 칸에 `required` 가 남아 있으면 저장이 막힌다.** 브라우저가
 * `display:none` 인 칸을 거절하면서 초점을 못 줘, 누른 사람은 **아무 일도
 * 일어나지 않는 단추**를 본다. 그래서 1단을 지나기 전에 그 칸들을 여기서
 * 먼저 본다: 지나왔으면 채워져 있으므로 마지막 저장에서 걸릴 것이 없다.
 */
export default function Steps(
  { domains, one, three }: { domains: Dom[]; one: ReactNode; three: ReactNode },
) {
  const [step, setStep] = useState(1);
  const [on, setOn] = useState<string[]>([]);
  const firstPanel = useRef<HTMLDivElement>(null);
  const picked = domains.filter((d) => on.includes(d.code));

  /** 1단의 필수 칸을 지나기 전에 본다. 비었으면 그 칸을 집어서 알려 준다 */
  function ok1(): boolean {
    const el = firstPanel.current;
    if (!el) return true;
    const bad = [...el.querySelectorAll<HTMLInputElement>("input, select, textarea")]
      .find((x) => !x.checkValidity());
    if (!bad) return true;
    bad.reportValidity();
    return false;
  }

  function go(next: number, e?: { preventDefault(): void }) {
    /* **이 단추가 폼을 보내지 않게 막는다.** 아래 주석에 적은 까닭으로
       누르는 순간 이 단추의 `type` 이 `submit` 으로 바뀔 수 있고, 그러면
       브라우저가 기본 동작으로 폼을 보낸다. `key` 로 갈라 두었어도
       한 겹 더 막는다: 이 자리가 조용히 반쪽 기록을 저장하던 자리다 */
    e?.preventDefault();
    if (next > 1 && !ok1()) return;
    setStep(next);
    /* 걸음을 넘기면 **머리로 올린다**: 긴 판에서 넘기면 다음 판의 가운데가
       보이고, 읽는 사람은 화면이 안 바뀐 줄 안다 */
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  const group = (
    label: string, name: string, items: string[], key: string,
  ) => items.length ? (
    <div className="cm-sub" key={key}>
      <p>{label}</p>
      <div className="cm-pickset">
        {items.map((x) => (
          <label className="cm-pick" key={x}>
            <input type="checkbox" name={name} value={x} />{x}
          </label>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* 어디까지 왔는지. **한 줄이다**(규격 §2). 셋을 다 적는 까닭은
          남은 걸음이 몇인지 모르면 둘째에서 닫기 때문이고, 한 줄로 적는
          까닭은 이 표가 첫 입력 칸보다 커지면 안 되기 때문이다 */}
      <ol className="cm-wiz" aria-label="세 걸음 가운데 지금">
        {STEPS.map((s) => (
          <li key={s.n} className={s.n === step ? "is-on" : s.n < step ? "is-done" : ""}>
            <b>{s.n}</b>{s.title}
          </li>
        ))}
      </ol>

      {/* ── 1단. 무슨 경험이었나 ── */}
      <div ref={firstPanel} hidden={step !== 1}>{one}</div>

      {/* ── 2단. 어떤 기술 판단이었나 ── */}
      <div hidden={step !== 2}>
        <fieldset className="cm-field">
          <legend><span>어느 기술영역의 일인가요</span></legend>
          <em>여러 개 고를 수 있습니다.</em>
          {/* **영역 고르기와 판단 고르기를 같은 생김새로 두지 않는다**
              (규격 §9). 전에는 둘 다 알약이라, 열두 영역 알약 아래에
              판단 알약이 이어 붙어 **어디까지가 영역이고 어디부터가
              판단인지가 화면에서 안 갈렸다.** 영역은 고르는 **표**이고
              판단은 고르는 **말**이다 */}
          <div className="cm-pickset is-td">
            {domains.map((d) => (
              <label className="cm-pick" key={d.code}>
                <input type="checkbox" name="td" value={d.code}
                  checked={on.includes(d.code)}
                  onChange={(e) => setOn((prev) => e.target.checked
                    ? [...prev, d.code] : prev.filter((x) => x !== d.code))} />
                {d.name}
              </label>
            ))}
          </div>
          {picked.map((d) => (
            <section className="cm-subs" key={`j-${d.code}`}>
              <h4>{d.name}</h4>
              {group("어떤 문제였나", "problem", d.problems, `${d.code}-p`)}
              {group("무엇을 직접 정했나", "decision", d.decisions, `${d.code}-d`)}
            </section>
          ))}
          {!picked.length ? (
            <p className="cm-none">
              기술영역을 고르면 그 영역에서 직접 정한 것을 고르는 칸이 뜹니다.
              고르지 않으시면 이 기록은 현재 상태에 더해지지 않고 목록에만
              남습니다.
            </p>
          ) : null}
        </fieldset>
      </div>

      {/* ── 3단. 무엇이 남았나 ── */}
      <div hidden={step !== 3}>
        {picked.length ? (
          <fieldset className="cm-field">
            <legend><span>무엇이 남았나요</span></legend>
            <em>해당하는 것이 없으면 비워 두셔도 됩니다.</em>
            {picked.map((d) => (
              <section className="cm-subs" key={`o-${d.code}`}>
                <h4>{d.name}</h4>
                {group("무엇이 남았나", "artifact", d.artifacts, `${d.code}-a`)}
                {group("무엇과 비교해 확인했나", "verification", d.verify, `${d.code}-v`)}
              </section>
            ))}
          </fieldset>
        ) : (
          <p className="cm-none">
            2단에서 기술영역을 고르시면 그 영역에서 남긴 결과물과 비교해
            확인한 것을 고를 수 있습니다.
          </p>
        )}
        {three}
      </div>

      {/* ── 걸음 단추 ──
          **짙은 단추는 하나다.** 마지막 걸음에서만 `저장` 이 서고 그
          전까지는 `다음` 이 그 자리를 든다 */}
      {/*
        **`다음` 과 `저장` 에 서로 다른 `key` 를 준다.**

        이것이 없을 때 2단의 `다음` 이 **폼을 보냈다.** 같은 자리에
        `<button>` 둘을 삼항으로 두면 React 가 그것을 같은 element 로 보고
        DOM 노드를 재사용하면서 `type` 만 `button` → `submit` 으로 고친다.
        그러면 클릭 처리기(`go`)가 돌아 3단으로 넘어간 뒤, 브라우저가
        **그 순간의 `type` 으로** 기본 동작을 정해 폼을 보낸다.
        누르는 사람에게는 `다음` 을 눌렀더니 3단을 건너뛰고 저장된 것으로
        보이고, **3단의 결과물과 쓰인 자리가 통째로 빈 기록이 쌓인다.**
        `key` 가 다르면 React 가 노드를 새로 만들어 `type` 이 섞이지 않는다.
      */}
      <div className="cm-wiz-nav">
        {step > 1 ? (
          <button key="back" className="cm-btn" type="button"
            onClick={(e) => go(step - 1, e)}>
            이전
          </button>
        ) : null}
        {step < 3 ? (
          <button key="next" className="cm-btn is-primary" type="button"
            onClick={(e) => go(step + 1, e)}>
            다음
          </button>
        ) : (
          <button key="save" className="cm-btn is-primary" type="submit">저장</button>
        )}
        {/* 2단에서도 저장할 수 있게 둔다. **3단은 전부 선택 칸이라**
            거기까지 가야 저장되는 구조면 비워 둘 사람이 한 걸음을 헛돈다 */}
        {step === 2 ? (
          <button key="save2" className="cm-btn" type="submit">여기까지 저장</button>
        ) : null}
      </div>
    </>
  );
}
