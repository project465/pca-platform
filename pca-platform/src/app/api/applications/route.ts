import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { applicationSchema, newRefCode } from "@/lib/applications";

/**
 * 소개 사이트의 도입 신청을 받는 곳.
 *
 * 소개 사이트는 나라마다 다른 도메인에 있고 이 플랫폼은 전 세계 하나다
 * (설계 원칙 5). 그래서 폼은 서버에서 이 엔드포인트로 넘긴다 — 브라우저가
 * 직접 부르지 않으므로 CORS 를 열 필요가 없고, 신청자 화면에 플랫폼 주소가
 * 드러나지도 않는다.
 *
 * 이 요청만으로는 계정도 기관도 생기지 않는다. org_applications 에 한 줄이
 * 쌓일 뿐이고, 실제 발급은 운영자 승인을 거친다.
 */

/** 소개 사이트와 나눠 갖는 값. 없으면 아무나 신청서를 밀어 넣을 수 있다 */
const SHARED_SECRET = process.env.INTAKE_SECRET;

export async function POST(req: Request) {
  if (!SHARED_SECRET) {
    console.error("[intake] INTAKE_SECRET 이 없어 신청을 받을 수 없습니다");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (req.headers.get("x-intake-secret") !== SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) },
      { status: 422 },
    );
  }
  const a = parsed.data;

  /* 접수번호는 유일해야 한다. 부딪히는 일은 드물지만 몇 번 다시 뽑아 본다 */
  for (let attempt = 0; attempt < 5; attempt++) {
    const refCode = newRefCode();
    try {
      const row = await queryOne<{ ref_code: string }>(
        `INSERT INTO org_applications
           (ref_code, site, country, org_name, dept_name,
            contact_name, contact_email, contact_phone,
            expected_size, plan, message)
         VALUES ($1, $2, upper($3), $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ref_code`,
        [
          refCode,
          a.site,
          a.country,
          a.orgName,
          a.deptName || null,
          a.contactName,
          a.contactEmail,
          a.contactPhone || null,
          a.expectedSize ?? null,
          a.plan || null,
          a.message || null,
        ],
      );
      console.info("[intake] 접수", row!.ref_code, a.site, a.orgName);
      return NextResponse.json({ ok: true, refCode: row!.ref_code }, { status: 201 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("org_applications_ref_code_key")) continue;
      console.error("[intake] 저장 실패", e);
      return NextResponse.json({ error: "server" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "server" }, { status: 500 });
}
