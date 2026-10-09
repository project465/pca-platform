"use client";

import { useState } from "react";
import { startV3 } from "./actions";
import { FIELD_LABEL, STAGE_LABEL } from "../tier-text";

/**
 * 시작 전에 묻는 둘.
 *
 * **계열은 석사 이상에게만 묻는다.** 학부생에게 물으면 대답할 수 없는
 * 칸이 하나 서고, 그 칸이 비어 있는 것을 응시자가 자기 잘못으로 읽는다.
 * 묻는 장면만 달라지고 판정 기준은 같다는 것을 한 줄로 적어 둔다.
 */
export default function StartForm({ error }: { error?: string }) {
  /**
   * **미리 골라 두지 않는다.**
   *
   * 전에는 `학부` 가 켜진 채로 섰다. 그런데 이 값은 아직 아무 데도 적혀
   * 있지 않은 **화면 기본값**이고, 바로 다음 화면(기본 정보)은 응시에
   * 적힌 값을 읽는다. 그래서 같은 흐름 안에서 두 화면이 다른 학업 단계를
   * 보여 주는 일이 생겼다. 고르지 않으면 서버가 돌려보내므로(`?e=stage`)
   * 비워 두는 쪽이 맞다: **화면에 켜진 값은 늘 사람이 고른 값이다.**
   */
  const [stage, setStage] = useState("");
  const [field, setField] = useState("");
  const grad = stage !== "" && stage !== "bachelor";

  return (
    <form action={startV3}>
      <fieldset className="qs-opts">
        <legend>현재 학업 단계</legend>
        <h2 className="qs-eyebrow" aria-hidden>현재 학업 단계</h2>
        <div className="qs-list">
          {(["bachelor", "master", "phd", "postdoc"] as const).map((v) => (
            <label key={v} className={`qs-opt${stage === v ? " is-on" : ""}`}>
              <input type="radio" name="stage" value={v} checked={stage === v}
                onChange={() => setStage(v)} />
              <span className="qs-mark" aria-hidden />
              <span className="qs-body"><span className="qs-label">{STAGE_LABEL[v]}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {grad ? (
        <fieldset className="qs-opts">
          <legend>대학원 전공계열</legend>
          <h2 className="qs-eyebrow" aria-hidden>대학원 전공계열</h2>
          <div className="qs-list">
            {(["STEM", "HUMANITIES_SOCIAL", "BUSINESS", "OTHER_INTERDISCIPLINARY"] as const)
              .map((v) => (
                <label key={v} className={`qs-opt${field === v ? " is-on" : ""}`}>
                  <input type="radio" name="field" value={v} checked={field === v}
                    onChange={() => setField(v)} />
                  <span className="qs-mark" aria-hidden />
                  <span className="qs-body"><span className="qs-label">{FIELD_LABEL[v]}</span></span>
                </label>
              ))}
          </div>
          <p className="qs-guide">
            전공계열에 따라 질문과 선택지가 달라집니다. 평가 기준은 네 계열이
            모두 같습니다.
          </p>
        </fieldset>
      ) : null}

      {error ? <p className="qs-need" role="alert" style={{ marginTop: 16 }}>
        {error === "field" ? "대학원 전공계열을 선택해주세요." : "학업 단계를 선택해주세요."}
      </p> : null}

      <div className="qs-start-nav">
        <button type="submit" className="qs-btn qs-btn-main qs-btn-go">검사 시작</button>
      </div>
    </form>
  );
}
