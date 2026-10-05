import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { businessInfo, businessFields, jobInfoLicense } from "@/lib/business";
import { get, sourceOf } from "@/lib/settings";
import { Pill } from "@/components/sf/parts";
import { saveBusinessAction } from "./actions";

export const metadata = { title: "사업자 표시 · 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

/**
 * 사업자 표시를 넣는 자리.
 *
 * **법이 요구하는 값이고 사업자가 직접 넣는다**(전자상거래법 제10조).
 * 환경변수에만 두면 한 글자 고치는 데 배포가 필요하고, 그러면 런칭이
 * 개발 일정에 묶인다.
 *
 * **지어내지 않는다.** 비우면 그 줄이 지워지고 환경변수로 되돌아가며,
 * 둘 다 없으면 `/admin/launch` 와 `launch:check` 가 런칭을 막는다.
 *
 * **비밀은 여기 없다.** 결제 열쇠와 메일 비밀번호는 환경변수에 남는다:
 * 운영 화면에서 고칠 수 있게 두면 그 화면이 열쇠 보관함이 된다.
 */
export default async function BusinessPage() {
  const user = await requireRole(["superadmin"]);
  const info = await businessInfo();
  const fields = businessFields();
  const license = await jobInfoLicense();
  const hours = await get("support_hours", "SUPPORT_HOURS");
  const licenseFrom = await sourceOf("jobinfo_license", "JOBINFO_LICENSE_NO");

  const FROM: Record<string, string> = {
    settings: "이 화면에서 넣음", env: "환경변수", none: "비어 있음",
  };

  return (
    <AdminShell user={user} current="/admin/business">
      <h1>사업자 표시</h1>
      <p className="sub">
        전자상거래법 제10조가 요구하는 일곱 칸입니다. 비어 있으면 결제를
        받을 수 없고 런칭 준비 화면이 그것을 막습니다.
        {" "}
        {info.complete
          ? "지금은 일곱 칸이 다 찼습니다."
          : `지금 ${info.missing.length}칸이 비어 있습니다.`}
      </p>

      <form action={saveBusinessAction}>
        <section className="panel" style={{ marginBottom: 20 }}>
          <h2>상품 쪽 푸터에 나가는 값</h2>
          <div className="sf-tw">
            <table className="sf-table">
              <thead>
                <tr><th>항목</th><th>값</th><th>어디서 왔는가</th></tr>
              </thead>
              <tbody>
                {fields.map((f) => {
                  const cur = info.fields.find((x) => x.key === f.key);
                  return (
                    <tr key={f.key}>
                      <td className="sf-strong">
                        {f.ko}
                        <div className="sf-meta">{f.env}</div>
                      </td>
                      <td>
                        <input name={f.key} defaultValue={cur?.value ?? ""}
                          style={{ width: "100%", minWidth: 260 }} />
                      </td>
                      <td>
                        <Pill tone={cur?.from === "none" ? "warn"
                          : cur?.from === "env" ? "part" : "ok"}>
                          {FROM[cur?.from ?? "none"]}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="sf-strong">
                    직업정보제공사업 신고번호
                    <div className="sf-meta">JOBINFO_LICENSE_NO</div>
                  </td>
                  <td>
                    <input name="jobinfo_license" defaultValue={license ?? ""}
                      style={{ width: "100%", minWidth: 260 }} />
                  </td>
                  <td>
                    {/* **값이 있는데 '비어 있음' 이라고 적지 않는다.**
                        이 번호는 코드에 기본값이 있어서, 표에도 환경변수에도
                        없을 때 그 값이 나간다. 그 사실을 적는다 */}
                    <Pill tone={licenseFrom === "none" ? "part" : "ok"}>
                      {licenseFrom === "none" ? "코드 기본값" : FROM[licenseFrom]}
                    </Pill>
                  </td>
                </tr>
                <tr>
                  <td className="sf-strong">
                    지원 응대 시간
                    <div className="sf-meta">SUPPORT_HOURS · 비워 두면 안 적습니다</div>
                  </td>
                  <td>
                    <input name="support_hours" defaultValue={hours ?? ""}
                      style={{ width: "100%", minWidth: 260 }} />
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="sf-btn accent">넣기</button>
          </div>
        </section>
      </form>

      <section className="panel">
        <h2>여기서 고치지 않는 것</h2>
        <p className="sub">
          결제 열쇠 · 메일 비밀번호 · 운영 토큰은 환경변수에 남습니다. 운영
          화면에서 고칠 수 있게 두면 이 화면이 열쇠 보관함이 되고, 운영자
          계정 하나가 새면 돈길이 통째로 열립니다.
        </p>
        <p className="sub">
          약관 본문은 `consent_documents` 에 있습니다. 기계로 번역해 두지
          않았고, 영문 본문은 법률 검토를 거쳐 들어옵니다.
        </p>
      </section>
    </AdminShell>
  );
}
