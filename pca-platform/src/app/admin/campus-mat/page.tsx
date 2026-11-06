import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_ADMIN } from "@/components/sf/nav";
import { Empty } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";
import { universities } from "@/lib/campus/registry";
import { allPools, CAMPUS_MAT_NAME, schoolReadiness as readiness } from "@/lib/campus/mat";
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
}: { searchParams: Promise<{ lang?: string; uni?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);
  /* 데모 학교는 이름 뒤에 `(데모)` 를 붙인다. 실제 계약 인원과 섞어 읽지 않게 한다 */
  const schools = universities().map((u) => ({
    code: u.university_code, name: u.demo ? `${u.university_name} (데모)` : u.university_name,
  }));
  const nameOf = Object.fromEntries(schools.map((s) => [s.code, s.name]));
  const pools = await allPools();
  const until = new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10);
  const preset = schools.some((s) => s.code === (sp.uni ?? "").toUpperCase()) ? (sp.uni ?? "").toUpperCase() : "";
  const ready = await readiness(schools.map((s) => s.code));

  return (
    <Shell
      surface="admin" lang={L} nav={NAV_ADMIN} active="/admin/campus-mat"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={BRAND.admin} topRight={<LangSelect current={L} />}
    >
      <PageHead eyebrow={BRAND.admin} title={T("navCampusMat")}
        sub="학교가 계약으로 산 MAT 인원을 넣습니다. 담당자는 그 인원 안에서 학생에게 엽니다." />

      {/* **넣기 전에 볼 것**(2026-11-06). 인원을 넣어도 그 학교 기관 · 담당자 계정 · 학생 계정이 없으면
          아무도 학생에게 열 수 없다. 학교마다 무엇이 비어 있는지 한 줄로 본다 */}
      <Section title="학교별 준비 상태" note="기관 · 담당자 · 학생 계정이 있어야 담당자가 MAT을 엽니다">
        <div className="sf-tw">
          <table className="sf-table">
            <thead>
              <tr>
                <th scope="col">학교</th>
                <th scope="col">기관</th>
                <th scope="col">담당자</th>
                <th scope="col">학생 계정</th>
                <th scope="col">MAT 열린 학생</th>
                <th scope="col">열 수 있는 인원</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => {
                const r = ready[s.code];
                const left = pools.filter((p) => p.university_code === s.code && p.open)
                  .reduce((n, p) => n + p.left, 0);
                return (
                  <tr key={s.code}>
                    <th scope="row" className="sf-strong">{s.name}</th>
                    <td>{r?.org_id ? <a href={`/admin/organizations/${r.org_id}`}>{s.code}</a> : "없음"}</td>
                    <td>{r?.staff ? `${r.staff}명` : "없음"}</td>
                    <td>{(r?.students ?? 0).toLocaleString()}명</td>
                    <td>{(r?.mat ?? 0).toLocaleString()}명</td>
                    <td>{left ? `${left.toLocaleString()}명` : "없음"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="인원 넣기">
        <NewPool schools={schools} until={until} preset={preset} />
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
