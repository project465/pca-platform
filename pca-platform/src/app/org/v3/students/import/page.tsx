import Link from "next/link";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { orgsOf } from "@/lib/org";
import { campusSay, university } from "@/lib/campus/registry";
import { sayTree } from "@/lib/campus/say-tree";
import { BRAND, toLang2 } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { campusNav } from "@/lib/campus/org-mode";
import { Empty } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";
import ImportForm from "./form";
import { leafChoices } from "@/lib/campus/labels";
import { loginModeOf } from "@/lib/campus/students";

export const metadata = { title: `CSV 등록 · ${BRAND.campus}` };

export default async function ImportPage({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["org_admin"]);
  const { lang } = await searchParams;
  const L = toLang2(await resolveLang(lang));
  const orgs = await orgsOf(user.id);
  const org = orgs[0];
  const uni = orgs.map((o) => o.code).find((c) => Boolean(university(c))) ?? null;
  /* 기관(진흥원 등)이면 화면 글자를 기관 낱말로 바꾼다(`sayTree`) */
  const reg = uni ? university(uni) : null;
  const agency = reg?.org_kind === "agency";
  const codes = uni ? leafChoices(uni, { uptoYear: Number(new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 4)) }) : [];

  const nav = await campusNav(user.id);
  return (
    <Shell
      surface="campus" lang={L} nav={nav} active="/org/v3/students"
      who={{ name: user.name, role: campusSay(reg)(ROLE_LABEL[user.role] ?? "") }}
      topTitle={org ? org.name : BRAND.campus}
      topRight={<LangSelect current={L} />}
    >
      {sayTree(<>
      <PageHead
        eyebrow="CAREERMATRI CAMPUS"
        title="CSV로 학생 등록"
        sub="올리기 → 미리 보기 → 적용 순서입니다. 적용을 눌러야 저장됩니다."
        actions={<Link className="sf-btn ghost" href="/org/v3/students">학생 목록</Link>}
      />
      {uni ? <><Section><ImportForm agency={agency} phone={!!reg && loginModeOf(reg) === "phone"} example={codes.find((c) => c.ready)?.code ?? codes[0]?.code ?? ""} /></Section>
        {/* **코드를 같은 화면에서 찾게 한다**(2026-11-02 운영 시험: 코드를 알 길이 없었다). 이 기관 등록부의 것만 */}
        <Section title="학과 코드" note="응시 준비 중인 학과는 등록은 되지만 열릴 때까지 학생이 검사를 시작할 수 없습니다">
          <div className="sf-tw"><table className="sf-table"><thead><tr><th scope="col">학과</th><th scope="col">코드</th><th scope="col">응시</th></tr></thead>
            <tbody>{codes.map((c) => <tr key={c.code}><td>{c.name}</td><td className="mono">{c.code}</td><td>{c.ready ? "가능" : "준비 중"}</td></tr>)}</tbody></table></div>
        </Section></> : (
        <Section>
          <Empty icon="lock" title="학교 등록부에 연결된 기관이 아닙니다"
            body="기관 코드가 등록부의 학교 코드와 같아야 이 화면이 열립니다." />
        </Section>
      )}
      </>, campusSay(reg), agency)}
    </Shell>
  );
}
