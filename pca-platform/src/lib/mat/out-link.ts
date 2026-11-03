/**
 * MAT 에서 공고 원문으로 나가는 주소(캔버스 10번 "맞는 공고 → 잡인더스트리 공고 원문 · 지원").
 *
 * **우리 회사 사이트(잡인더스트리 · 커리어피크)로 나가는 주소에만 유입 표시를 붙인다.** 그쪽이 CareerMatri 에서 몇 명이
 * 왔는지 세는 데 쓰고(정산 근거는 아니다, 정산은 `partner_links`), 사람을 가리키는 값은
 * 넣지 않는다. 다른 출처(고용24)는 주소를 그대로 둔다.
 *
 * http(s) 가 아닌 주소 · 읽을 수 없는 주소는 null: 화면은 그때 원문 단추를 세우지 않는다.
 */
export function outLink(url: string | null, source: string): string | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  /* 커리어피크도 같은 사업자 사이트다. 사이트별 유입 집계를 같은 꼴로 센다(2026-11-03 결정) */
  if (source === "jobindustry" || source === "careerpeak") {
    u.searchParams.set("utm_source", "careermatri");
    u.searchParams.set("utm_medium", "mat");
  }
  return u.toString();
}
