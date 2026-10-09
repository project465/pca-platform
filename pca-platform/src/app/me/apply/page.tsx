import { requireUser } from "@/lib/session";
import { APPLY_STATES, applicationsOf } from "@/lib/me-v3/platform";
import { industryChoices, roleChoices } from "@/lib/me-v3/runtime/session";
import { orgTypes, regionLayer } from "@/lib/me-v3/region";
import { CmShell, CmHead } from "../shell";
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
  const rows = await applicationsOf(user.id);
  const L = regionLayer();
  const roles = roleChoices();
  const roleName = (c: string | null) =>
    roles.find((r) => r.code === c)?.name ?? null;

  /* 직무로 묶는다. 직무를 안 적으신 줄은 한 묶음으로 모은다 */
  const byRole = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.role_code ?? "";
    byRole.set(key, [...(byRole.get(key) ?? []), r]);
  }

  return (
    <CmShell active="/me/apply" title="지원한 곳">
      <CmHead
        kicker="지원 관리"
        title="직접 지원하신 곳"
        lead={"지원은 본인이 직접 하시고 여기에는 그 사실만 적습니다. "
          + "적어 두신 기업 이름은 본인에게만 보이고 1년이 지나면 지웁니다."}
      />

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
              {industryChoices().map((i) =>
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
          <em>결과에 반영되지 않습니다. 1년이 지나면 지웁니다.</em>
          <input className="cm-input" name="note" maxLength={300}
            placeholder="예: 해석 경험을 어디까지 물었는지" />
        </label>
        <div className="cm-acts">
          <button className="cm-btn is-primary" type="submit">적어 두기</button>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="cm-soon" style={{ marginTop: 20 }}>
          <b>아직 적어 두신 곳이 없습니다.</b> 지원한 곳이 쌓이면 직무로 묶어
          어디서 막혔는지 보여드립니다.
        </div>
      ) : (
        <div style={{ marginTop: 22 }}>
          {[...byRole.entries()].map(([code, list]) => (
            <section key={code || "none"} style={{ marginBottom: 22 }}>
              <h2 className="cm-h1" style={{ fontSize: 17, margin: "0 0 10px" }}>
                {roleName(code) ?? "직무를 고르지 않은 곳"}
                <span style={{ color: "var(--sf-ink-3)", fontWeight: 400 }}> · {list.length}곳</span>
              </h2>
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

      <div className="cm-soon" style={{ marginTop: 18 }}>
        <b>우리가 넣어 드리지 않습니다.</b> 이력서 발송 대행과 취업추천서 발부는
        직업정보제공사업으로 할 수 없는 일입니다. 여기는 본인이 적어 두는
        자리이고 본인에게만 보입니다.
      </div>
    </CmShell>
  );
}
