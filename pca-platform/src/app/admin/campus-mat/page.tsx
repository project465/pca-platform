import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_ADMIN } from "@/components/sf/nav";
import { Empty } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";
import { universities } from "@/lib/campus/registry";
import { allPools, CAMPUS_MAT_NAME } from "@/lib/campus/mat";
import { ClosePool, NewPool } from "./forms";

export const metadata = { title: `MAT 학교 이용권 · ${BRAND.admin}` };

/**
 * MAT 학교 단체 이용권(6개월 · 1년)을 학교에 넣는 자리.
 *
 * **돈은 여기서 받지 않는다.** 계약으로 받고, 여기에는 산 인원과 담당자가
 * 열 수 있는 마지막 날만 적는다. 그 인원 안에서 학교 담당자가 학생 관리
 * 화면에서 학생에게 연다.
 */
export default async function CampusMatAdmin({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);
  const schools = universities().map((u) => ({ code: u.university_code, name: u.university_name }));
  const nameOf = Object.fromEntries(schools.map((s) => [s.code, s.name]));
  const pools = await allPools();
  const until = new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10);

  return (
    <Shell
      surface="admin" lang={L} nav={NAV_ADMIN} active="/admin/campus-mat"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={BRAND.admin} topRight={<LangSelect current={L} />}
    >
      <PageHead eyebrow={BRAND.admin} title={T("navCampusMat")}
        sub="학교가 계약으로 산 MAT 인원을 넣습니다. 담당자는 그 인원 안에서 학생에게 엽니다." />

      <Section title="인원 넣기">
        <NewPool schools={schools} until={until} />
      </Section>

      <Section title="학교별 이용권" note={`${pools.length}건`}>
        {pools.length ? (
          <div className="sf-tw">
            <table className="sf-table">
              <thead>
                <tr>
                  <th scope="col">학교</th>
                  <th scope="col">이용권</th>
                  <th scope="col">연 학생 / 인원</th>
                  <th scope="col">열 수 있는 날</th>
                  <th scope="col">상태</th>
                  <th scope="col">메모</th>
                  <th scope="col">할 일</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="sf-strong">{nameOf[p.university_code] ?? p.university_code}</th>
                    <td>{CAMPUS_MAT_NAME[p.product_code]}</td>
                    <td>{p.used.toLocaleString()} / {p.seats.toLocaleString()}명</td>
                    <td>{p.grant_until}까지</td>
                    <td>
                      <span className={`sf-pill${p.open ? "" : " is-off"}`}>
                        {p.status === "closed" ? "닫힘" : p.open ? "열 수 있음" : p.left ? "기간 지남" : "인원 다 씀"}
                      </span>
                    </td>
                    <td>{p.memo ?? "—"}</td>
                    <td>{p.status === "active" ? <ClosePool id={p.id} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="contract" title="아직 넣은 이용권이 없습니다"
            body="학교와 계약을 맺으면 여기서 6개월 또는 1년 인원을 넣습니다." />
        )}
      </Section>
    </Shell>
  );
}
