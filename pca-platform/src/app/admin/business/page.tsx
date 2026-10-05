import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { PageHead, Section } from "@/components/sf/shell";
import { businessInfo, businessFields, jobInfoLicense } from "@/lib/business";
import { get, sourceOf } from "@/lib/settings";
import { Pill } from "@/components/sf/parts";
import { BRAND } from "@/lib/surface-text";
import { saveBusinessAction } from "./actions";

export const metadata = { title: `사업자 표시 · ${BRAND.admin}` };
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
 *
 * 화면은 **표가 아니라 폼이다.** 일곱 칸을 한 줄씩 늘어놓으면 어느 칸이
 * 왜 필요한지가 안 읽히고, 넓은 화면에서는 입력칸 하나가 쪽을 가로지른다.
 * 묶음은 **값을 어디서 구해 오는가**로 갈랐다: 사업자등록증을 보고 적는
 * 칸, 손님이 연락할 자리, 우리가 가진 자격.
 */
export default async function BusinessPage() {
  const user = await requireRole(["superadmin"]);
  const info = await businessInfo();
  const fields = businessFields();
  const license = await jobInfoLicense();
  const hours = await get("support_hours", "SUPPORT_HOURS");
  const licenseFrom = await sourceOf("jobinfo_license", "JOBINFO_LICENSE_NO");

  const byKey = Object.fromEntries(info.fields.map((f) => [f.key, f]));
  const label = Object.fromEntries(fields.map((f) => [f.key, f]));
  const filled = info.fields.length - info.missing.length;

  /* 묶음 셋. **어디서 그 값을 구해 오는가**로 가른다 */
  const GROUPS: { title: string; why: string; keys: string[]; wide?: string[] }[] = [
    {
      title: "사업자등록증에 적힌 것",
      why: "상호 · 대표자 · 등록번호 · 신고번호는 등록증과 통신판매업 신고증에 그대로 있습니다. 옮겨 적으시면 됩니다.",
      keys: ["name", "ceo", "reg", "mailorder"],
    },
    {
      title: "손님이 연락하는 자리",
      why: "상품 쪽 푸터와 결제 화면에 그대로 나갑니다. 주소는 사업장 주소이고, 메일은 문의가 실제로 도착하는 주소여야 합니다.",
      keys: ["address", "phone", "email"],
      wide: ["address"],
    },
  ];

  return (
    <AdminShell user={user} current="/admin/business">
      <PageHead
        eyebrow="런칭 준비"
        title="사업자 표시"
        sub="전자상거래법 제10조가 요구하는 일곱 칸입니다. 한 칸이라도 비어 있으면 결제를 받을 수 없고, 런칭 준비 화면이 그 상태로 켜지는 것을 막습니다."
      />

      {/* **무엇이 남았는지를 맨 위에 둔다.** 폼을 다 내려가 보고서야 알게
          하면, 한 칸 남은 날과 일곱 칸 남은 날이 똑같이 보인다 */}
      <div className={filled === info.fields.length ? "sf-card is-accent" : "sf-card is-lift"}>
        <div className="sfm-ready">
          <div>
            <div className="sf-meta">채운 칸</div>
            <div className="sfm-ready-n">
              {filled}<small> / {info.fields.length}</small>
            </div>
          </div>
          <div className={info.missing.length ? "sfm-ready-b is-warn" : "sfm-ready-b"}>
            <span>
              <i style={{ width: `${Math.round((filled / info.fields.length) * 100)}%` }} />
            </span>
            {info.missing.length ? (
              <p className="sfm-ready-miss">
                {info.missing.map((k) => (
                  <Pill key={k} tone="warn">{label[k]?.ko ?? k}</Pill>
                ))}
              </p>
            ) : (
              <p className="sf-meta" style={{ marginTop: 10 }}>
                일곱 칸이 다 찼습니다. 이 묶음은 더 이상 런칭을 막지 않습니다.
              </p>
            )}
          </div>
        </div>
      </div>

      <form action={saveBusinessAction}>
        <div className="sfm" style={{ marginTop: 24 }}>
          {GROUPS.map((g) => (
            <section key={g.title} className="sfm-sec">
              <div className="sfm-sec-h">
                <h2>{g.title}</h2>
                <p>{g.why}</p>
              </div>
              <div className="sfm-sec-b">
                {g.keys.map((k) => (
                  <Field
                    key={k}
                    name={k}
                    ko={label[k]?.ko ?? k}
                    env={label[k]?.env ?? ""}
                    value={byKey[k]?.value ?? ""}
                    from={byKey[k]?.from ?? "none"}
                    wide={g.wide?.includes(k)}
                    required
                  />
                ))}
              </div>
            </section>
          ))}

          <section className="sfm-sec">
            <div className="sfm-sec-h">
              <h2>우리가 가진 자격과 응대</h2>
              <p>
                직업정보제공사업 신고번호는 결과지와 푸터에 적힙니다. 이 신고만
                가지고 있으므로 알선 · 취업추천서 · 이력서 발송 대행은 하지
                않습니다.
              </p>
            </div>
            <div className="sfm-sec-b">
              <Field
                name="jobinfo_license"
                ko="직업정보제공사업 신고번호"
                env="JOBINFO_LICENSE_NO"
                value={license ?? ""}
                /* **값이 있는데 '비어 있음' 이라고 적지 않는다.** 이 번호는
                   코드에 기본값이 있어서, 표에도 환경변수에도 없을 때 그 값이
                   나간다. 그 사실을 적는다 */
                from={licenseFrom === "none" ? "code" : licenseFrom}
                required
              />
              <Field
                name="support_hours"
                ko="지원 응대 시간"
                env="SUPPORT_HOURS"
                value={hours ?? ""}
                from={hours ? "settings" : "none"}
                help="예: 평일 10시부터 18시까지. 비워 두시면 응대 시간을 적지 않습니다."
              />
            </div>
          </section>

          <div className="sfm-save">
            <span className="sf-meta">
              {info.missing.length
                ? `지금 ${info.missing.length}칸이 비어 있습니다.`
                : "일곱 칸이 다 찼습니다."}
              {" "}넣으시면 상품 쪽 푸터와 런칭 준비 화면에 바로 반영됩니다.
            </span>
            <button className="sf-btn accent">넣기</button>
          </div>
        </div>
      </form>

      <Section title="여기서 고치지 않는 것">
        <div className="sf-grid sf-g2">
          <div className="sf-card is-quiet">
            <h3 className="sf-h3">결제 열쇠 · 메일 비밀번호 · 운영 토큰</h3>
            <p>
              환경변수에 남습니다. 운영 화면에서 고칠 수 있게 두면 이 화면이
              열쇠 보관함이 되고, 운영자 계정 하나가 새면 돈길이 통째로 열립니다.
            </p>
          </div>
          <div className="sf-card is-quiet">
            <h3 className="sf-h3">약관 본문</h3>
            <p>
              <code>consent_documents</code> 에 있습니다. 사람을 묶는 글이라
              기계로 번역해 두지 않았고, 영문 본문은 법률 검토를 거쳐 들어옵니다.
            </p>
          </div>
        </div>
      </Section>
    </AdminShell>
  );
}

/** 한 칸. 라벨 · 필수 여부 · 지금 값이 어디서 왔는가 · 입력 · 도움말 */
function Field({
  name, ko, env, value, from, required, wide, help,
}: {
  name: string;
  ko: string;
  env: string;
  value: string;
  from: "settings" | "env" | "none" | "code";
  required?: boolean;
  wide?: boolean;
  help?: string;
}) {
  const FROM: Record<string, { label: string; tone: "ok" | "part" | "warn" }> = {
    settings: { label: "저장됨", tone: "ok" },
    env: { label: "환경변수", tone: "part" },
    code: { label: "코드 기본값", tone: "part" },
    none: { label: "입력 필요", tone: "warn" },
  };
  /* **선택 칸을 '입력 필요' 로 적지 않는다.** 비워 두어도 되는 칸에
     빨간 알약이 붙으면 운영자가 그것부터 채우려고 한다 */
  const f = from === "none" && !required ? null : (FROM[from] ?? FROM.none);
  return (
    <div className={wide ? "sfm-f wide" : "sfm-f"}>
      <label className="sfm-l" htmlFor={`f-${name}`}>
        {ko}
        {required
          ? <span className="sfm-req">필수</span>
          : <span className="sfm-opt">선택</span>}
        {f ? <Pill tone={f.tone}>{f.label}</Pill> : null}
      </label>
      <input id={`f-${name}`} name={name} defaultValue={value} className="sf-input" />
      <span className="sfm-help">
        {help ?? <>환경변수 <code>{env}</code> 로도 들어옵니다.</>}
      </span>
    </div>
  );
}
