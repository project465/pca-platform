import { withJosa } from "@/lib/me-v3/result/josa";

/**
 * MAT 화면의 할 일 한 줄(2026-11-02 대표 "문구하고 화면모양 둘다 AI같아").
 *
 * 결과지 · 공고 분석이 만든 할 일 문장은 길다(재료 · 비교 대상 · 까닭이 한 문장에 다 든다). MAT 에서는
 * **첫 문장만** 보이고, 쉼표로 이어진 긴 문장이면 앞 마디에서 끊는다. 뜻은 바꾸지 않는다: 지어 쓰지 않고 자른다.
 */
export function oneLine(s: string, max = 56): string {
  const t = s.replace(/\s+/g, " ").trim();
  const first = (t.match(/^.*?(다|요)\.(?=\s|$)/)?.[0] ?? t).trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const at = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf(" · "));
  return (at > 20 ? cut.slice(0, at) : cut.replace(/\s+\S*$/, "")) + "…";
}

/** 공고 분석의 `마감 전 할 일`: 결과물 하나 만들고 무엇과 맞대 볼지 한 줄 */
export function taskLine(artifact: string, verify: string): string {
  return `${artifact} 하나 만들고, ${withJosa(verify, "과와")} 비교해 보기`;
}
