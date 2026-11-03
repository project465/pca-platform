"use client";

import { useState } from "react";

/**
 * 곁근거 하나를 접어 둔다. **기본은 접힘이다**(R17 §9).
 *
 * **설정 스위치처럼 보이면 그 자리가 실패한 것이다**(R18 §4). 전에는
 * `그리고 하나 더 [영역]` 과 `열기 / 닫기` 가 가로폭을 다 쓰는 회색 띠에
 * 얹혀서, 이 절에서 가장 먼저 눈에 띄는 것이 **그 컨트롤**이었다. 지금
 * 서는 것은 다음 경험을 가리키는 한 마디이고 폭이 글만큼이다.
 *
 * **무엇이 접혀 있는지 닫힌 채로 적는다**: 영역 이름이 없으면 펴 볼
 * 까닭이 화면에 없다.
 *
 * **여는 경험을 접지 않는다.** 이 쪽에서 가장 먼저 자기를 알아보는
 * 자리라, 접어 두면 펴지 않은 사람이 자기가 이미 가진 것을 못 본다.
 *
 * **종이에서는 펴진다**: 인쇄 규칙이 단추를 지우고 속을 드러낸다
 * (`.rs-open > [hidden] { display: block !important }`).
 */
export default function SecondStory(
  { name, children, lang = "ko" }:
    { name: string; children: React.ReactNode; lang?: "ko" | "en" },
) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rs-open rs-ev3-second">
      {/* **`rs-openbtn` 을 함께 두지 않는다**(R18 §4). 그 이름이 가로폭을
          다 쓰는 테 두른 면을 들고 있어서, 이 줄에 editorial 규칙을 얹어도
          **설정 스위치 띠**가 그대로 남았다. 접고 펴는 것은 `rs-open` 이
          든다 */}
      <button type="button" className="rs-ev3-tr" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        {/* 영어는 이름 앞에 말이 붙는다. 한국어 줄은 그대로 둔다 */}
        {lang === "en"
          ? <span>You also have experience to draw on in <b>{name}</b></span>
          : <span><b>{name}</b>에서도 꺼내 쓸 경험이 있어요</span>}
        <i aria-hidden>{open ? (lang === "en" ? "Hide" : "접기") : (lang === "en" ? "Show" : "보기")}</i>
      </button>
      <div hidden={!open}>{children}</div>
    </div>
  );
}
