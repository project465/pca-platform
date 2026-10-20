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
        title="CSV 로 학생 등록"
        sub="올리고 → 미리 보고 → 적용합니다. 미리 보기에서는 아무것도 저장하지 않습니다."
        actions={<Link className="sf-btn ghost" href="/org/v3/students">학생 목록</Link>}
      />
      {uni ? <Section><ImportForm agency={agency} /></Section> : (
        <Section>
          <Empty icon="lock" title="학교 등록부에 연결된 기관이 아닙니다"
            body="기관 코드가 등록부의 학교 코드와 같아야 이 화면이 열립니다." />
        </Section>
      )}
      </>, campusSay(reg), agency)}
    </Shell>
  );
}
