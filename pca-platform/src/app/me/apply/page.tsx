import { wsLang } from "@/lib/me-v3/ws-lang";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import Link from "next/link";
import {
  APPLY_STATES, applicationsOf, activeCoreOrPick, currentState,
} from "@/lib/me-v3/platform";
import {
  domainName, industryChoices, industryDomains, roleChoices, roleDomains,
} from "@/lib/me-v3/runtime/session";
import { activeTrack } from "@/lib/track";
import { orgTypes, regionLayer } from "@/lib/me-v3/region";
import { CmShell, CmHead } from "../shell";
import { EmptyState, SectionHeader } from "../ui";
import { dropApplication, moveApplication, saveApplication } from "./actions";

export const metadata = { title: "지원한 곳 · 내 CareerMatri" };

/**
 * 지원한 곳.
 *
 * **알선하지 않는다.** 직업정보제공사업으로 할 수 있는 것은 공고를 띄우고
 * 응시자가 직접 지원하는 데까지다. 여기는 본인이 직접 낸 곳을 적어 두는
 * 자리이고, 우리가 넣어 드리거나 추천서를 쓰지 않는다.
 *
 * **직무로 묶어 본다.** 같은 직무에 여러 곳을 내고 어디서 막혔는지 보려면
 * 기업별 목록만으로는 모자라다. 직무가 열쇠고 기업 이름은 본인 메모다.
 */
export default async function Apply() {
  const user = await requireUser();
  /* **영어 작업공간에는 이 자리가 없다**(`WS_KR_ONLY`). 한국 자료에 서
     있는 쪽이라, 번역해 세우면 해외 손님이 한국 자료를 자기 것으로 읽는다 */
  if ((await wsLang(user.id)) === "en") redirect("/me");
  const major = await activeMajorName(user.id);
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCoreOrPick(user.id);
  const [rows, track] = await Promise.all([applicationsOf(user.id), activeTrack(user.id)]);
  /**
   * 지원한 곳과 내 근거를 나란히 본다. **Track 이 여는 자리다.**
   *
   * 묶음마다 그 직무(와 적어 두신 산업)가 **가장 많이 보는 영역**을 꺼내
   * 지금 설명할 수 있는 것과 아직 비어 있는 것으로 가른다. 기준은 홈과
   * 같은 `현재 상태` 다(설계 원칙 10). **새 점수를 만들지 않는다**:
   * 적합도도 합격 가능성도 내지 않고, 관계표의 `중심` 과 지금 묶음이
   * 겹치는지만 본다.
   *
   * 닫혀 있으면 아무것도 계산하지 않는다(부르지 않는 질의는 샐 수 없다).
   */
  const st = track.on ? await currentState(user.id) : null;
  const ready = new Set(st ? Object.entries(st.zoneOf)
    .filter(([, z]) => z === "Z1_EVIDENCE_ESTABLISHED" || z === "Z2_EVIDENCE_INCOMPLETE")
    .map(([d]) => d) : []);
  const compareOf = (roleCode: string, list: typeof rows) => {
    if (!st || !roleCode) return null;
    const center = new Set(roleDomains(core, roleCode)
      .filter((r) => r.strength === "중심").map((r) => r.td));
    for (const a of list) {
      if (!a.industry_code) continue;
      for (const r of industryDomains(core, a.industry_code)) {
        if (r.strength === "중심") center.add(r.td);
      }
    }
    const tds = [...center];
    return {
      have: tds.filter((d) => ready.has(d)).map((d) => domainName(core, d)),
      lack: tds.filter((d) => !ready.has(d)).map((d) => domainName(core, d)),
    };
  };
  const L = regionLayer();
  const roles = roleChoices(core);
  const roleName = (c: string | null) =>
    roles.find((r) => r.code === c)?.name ?? null;

  /* 직무로 묶는다. 직무를 안 적으신 줄은 한 묶음으로 모은다 */
  const byRole = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.role_code ?? "";
    byRole.set(key, [...(byRole.get(key) ?? []), r]);
  }

  return (
    <CmShell active="/me/apply" title="지원한 곳" major={major}>
      <CmHead
        title="직접 지원하신 곳"
        lead={"지원은 본인이 직접 하시고 여기에는 그 사실만 적습니다. "
          + "적어 두신 기업 이름은 본인에게만 보이고 1년이 지나면 지웁니다."}
      />

      {/* **폼이 첫 화면을 차지하지 않는다**(규격 §10). 쌓인 기록이 먼저
          서고, 적는 자리는 눌러서 연다. `details` 로 두는 까닭은 자바
          스크립트 없이도 열리고 **기존 폼과 저장 경로가 그대로**여서다 */}
      <details className="cm-fold is-cta">
        <summary>+ 지원 기록 추가</summary>
      <form action={saveApplication} className="cm-formcard">
        <div className="cm-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <label className="cm-field">
            <span>어디에</span>
            <em>기억하시려고 적는 칸입니다.</em>
            <input className="cm-input" name="org_name" maxLength={120}
              placeholder="예: 가까운 완성차 부품사" />
          </label>
          <label className="cm-field">
            <span>어떤 직무로</span>
            <select className="cm-select" name="role_code" defaultValue="">
              <option value="">고르지 않음</option>
              {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
          </label>
          <label className="cm-field">
            <span>산업</span>
            <select className="cm-select" name="industry_code" defaultValue="">
              <option value="">고르지 않음</option>
              {industryChoices(core).map((i) =>
                <option key={i.code} value={i.code}>{i.name}</option>)}
            </select>
          </label>
          <label className="cm-field">
            <span>권역</span>
            <select className="cm-select" name="region_code" defaultValue="">
              <option value="">고르지 않음</option>
              {L.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
          </label>
          <label className="cm-field">
            <span>기관 유형</span>
            <select className="cm-select" name="org_type_code" defaultValue="">
              <option value="">고르지 않음</option>
              {orgTypes().map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </label>
          <label className="cm-field">
            <span>낸 날</span>
            <input className="cm-input" type="date" name="applied_on" />
          </label>
          <label className="cm-field">
            <span>지금 어디까지</span>
            <select className="cm-select" name="state" defaultValue="applied">
              {APPLY_STATES.map((s) =>
                <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </label>
        </div>
        <label className="cm-field">
          <span>덧붙일 한 줄</span>
          <em>결과를 바꾸지 않습니다. 1년이 지나면 지웁니다.</em>
          <input className="cm-input" name="note" maxLength={300}
            placeholder="예: 해석 경험을 어디까지 물었는지" />
        </label>
        <div className="cm-acts">
          <button className="cm-btn is-primary" type="submit">적어 두기</button>
        </div>
      </form>
      </details>

      {rows.length === 0 ? (
        <EmptyState style={{ marginTop: 20 }}>
          <b>아직 적어 두신 곳이 없습니다.</b> 지원한 곳이 쌓이면 직무로 묶어
          어디서 막혔는지 보여드립니다.
        </EmptyState>
      ) : (
        <div style={{ marginTop: 22 }}>
          {[...byRole.entries()].map(([code, list]) => (
            <section key={code || "none"} style={{ marginBottom: 22 }}>
              <SectionHeader icon="send" title={roleName(code) ?? "직무를 고르지 않은 곳"}
                sub={`${list.length}곳`} />
              {(() => {
                const cmp = compareOf(code, list);
                if (!cmp) return null;
                return (
                  <div className="cm-soon" style={{ marginBottom: 10 }}>
                    <b>이 직무가 가장 많이 보는 영역</b>
                    <ul>
                      <li>
                        지금 설명할 수 있는 것 ·{" "}
                        {cmp.have.length ? cmp.have.join(" / ") : "아직 없습니다"}
                      </li>
                      <li>
                        아직 비어 있는 것 ·{" "}
                        {cmp.lack.length ? cmp.lack.join(" / ") : "없습니다"}
                        {cmp.lack.length ? <em>면접에서 물을 수 있는 부분입니다</em> : null}
                      </li>
                    </ul>
                  </div>
                );
              })()}
              <div className="cm-tablewrap">
                <table className="cm-table">
                  <thead>
                    <tr><th>어디에</th><th>낸 날</th><th>지금</th><th>메모</th><th /></tr>
                  </thead>
                  <tbody>
                    {list.map((a) => (
                      <tr key={a.id}>
                        <td><b>{a.org_name ?? "적지 않음"}</b></td>
                        <td>{a.applied_on ?? "—"}</td>
                        <td>
                          <form action={moveApplication}>
                            <input type="hidden" name="id" value={a.id} />
                            <select className="cm-select" name="state" defaultValue={a.state}
                              style={{ minWidth: 110 }}>
                              {APPLY_STATES.map((s) =>
                                <option key={s.code} value={s.code}>{s.label}</option>)}
                            </select>
                            <button className="cm-btn" type="submit"
                              style={{ marginTop: 6 }}>바꾸기</button>
                          </form>
                        </td>
                        <td>{a.note_text ?? "—"}</td>
                        <td>
                          <form action={dropApplication}>
                            <input type="hidden" name="id" value={a.id} />
                            <button className="cm-btn" type="submit">지우기</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {!track.on && rows.some((r) => r.role_code) ? (
        <p className="cm-soon" style={{ marginTop: 18 }}>
          <b>지원한 직무와 내 근거를 나란히 보는 일은 Track 에서 열립니다.</b>{" "}
          <Link href="/me/track">Track 보기</Link>
        </p>
      ) : null}

      <div className="cm-soon" style={{ marginTop: 18 }}>
        <b>우리가 넣어 드리지 않습니다.</b> 이력서 발송 대행과 취업추천서 발부는
        직업정보제공사업으로 할 수 없는 일입니다. 여기는 본인이 적어 두는
        곳이고 본인에게만 보입니다.
      </div>
    </CmShell>
  );
}
