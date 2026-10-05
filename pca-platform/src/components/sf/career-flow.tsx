import { txer, type Lang2 } from "@/lib/surface-text";

/**
 * 제품의 사고 순서.
 *
 * **CareerMatri 가 다른 진로검사와 갈리는 자리가 이 다섯 걸음이다.**
 * 적합도 숫자를 내놓고 끝나지 않고, 전공과 경험에서 출발해 직무 후보를
 * 세우고, 그 직무가 보고 싶어 하는 증거 가운데 **비어 있는 것**을 짚고,
 * 거기서 다음 한 걸음을 낸다.
 *
 * 가격표 · 상품 쪽 · 개인 첫 화면이 같은 한 벌을 쓴다. **쪽마다 다른
 * 그림을 그리면 읽는 사람이 매번 새로 배운다.**
 *
 * **그림을 늘리지 않는다**(규격 §37). 아이콘도 그래프도 없고 번호와
 * 글자와 가는 선뿐이다: 여기서 말하려는 것은 모양이 아니라 **차례**다.
 */
export default function CareerFlow({
  lang, tight,
}: {
  lang: Lang2;
  /** 좁은 자리(가격표 머리 아래)에서는 딸린 말을 접는다 */
  tight?: boolean;
}) {
  const T = txer(lang);
  const steps: [string, string][] = [
    [T("flow1"), T("flow1b")],
    [T("flow2"), T("flow2b")],
    [T("flow3"), T("flow3b")],
    [T("flow4"), T("flow4b")],
    [T("flow5"), T("flow5b")],
  ];
  return (
    <section className={tight ? "cmflow is-tight" : "cmflow"} aria-label={T("flowTitle")}>
      <h2 className="cmflow-t">{T("flowTitle")}</h2>
      <ol className="cmflow-l">
        {steps.map(([label, sub], i) => (
          <li key={label} className={i === 3 ? "is-gap" : undefined}>
            <span className="cmflow-n" aria-hidden="true">{i + 1}</span>
            <span className="cmflow-b">
              <b>{label}</b>
              {tight ? null : <span>{sub}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
