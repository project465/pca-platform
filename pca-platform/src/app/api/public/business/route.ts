import { NextResponse } from "next/server";
import { businessInfo, jobInfoLicense } from "@/lib/business";

/**
 * 사업자 표시(전자상거래법 제10조)를 밖에 내준다.
 *
 * **소개 사이트(careermatri.com)가 읽는다.** 그쪽은 이 앱의 표를 못 봐서
 * 통신판매업 신고번호 칸을 비워 두고 `확인 필요` 로 적고 있었다. 번호를
 * 원고에 적어 두면 바뀐 날 고칠 자리가 둘이 되고, `launch:check` 도 그것을
 * 막는다. 정본은 `/admin/business` 하나이고 두 사이트가 같은 값을 읽는다.
 *
 * 담는 것은 법이 공개하라는 칸뿐이다. 비밀은 이 표에 애초에 없다.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const info = await businessInfo().catch(() => null);
  const out: Record<string, string | null> = {};
  for (const f of info?.fields ?? []) out[f.key] = f.value;
  out.jobinfo = await jobInfoLicense().catch(() => null);
  return NextResponse.json(out, {
    headers: { "cache-control": "public, max-age=300, s-maxage=300" },
  });
}
