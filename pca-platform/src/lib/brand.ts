import { cookies } from "next/headers";
import { query } from "@/lib/db";

/**
 * 제휴 입구(2026-10-30). 잡인더스트리가 MAT 을 `AI취업지원도우미` 라는
 * 이름으로 회원에게 붙인다.
 *
 * **넘어오는 방식은 링크 하나다**(대표 결정 (가)). 잡인더스트리 사이트의
 * 단추가 `/from/jobindustry` 를 부르고, 그 자리가 쿠키를 심은 뒤 제휴 소개
 * 쪽(`/partner/jobindustry`)으로 보낸다. 로그인과 결제는 이 앱 한 곳에서
 * 하고, 두 사이트가 세션을 나눠 쓰지 않는다.
 *
 * **기록이 실패해도 아무것도 막지 않는다.** `brand_touches` 는
 * `db/schema_brand.sql` 이 올라가야 서는 표라, 그 전의 DB 에서는 쓰기가
 * 실패한다. 그 실패를 삼키므로 가입과 MAT 은 그대로 돈다.
 */

export const BRAND_COOKIE = "cm_brand";

export type Partner = "jobindustry" | "careerpeak";

export const PARTNERS: Record<Partner, {
  /** 사람이 읽는 이름 */
  name: string;
  /** 그 사이트에서 MAT 을 부르는 이름 */
  label: string;
  /** 돌아가는 곳 */
  home: string;
  /** "~로 들어오셨습니다" 앞에 붙는 말. 조사가 이름 끝소리를 따르므로 손으로 적는다 */
  via: string;
  /** 소개 쪽 머리 문단 */
  intro: string;
  /** "하는 일" 절 제목 */
  does: string;
}> = {
  jobindustry: {
    name: "잡인더스트리",
    label: "AI취업지원도우미",
    home: "https://www.jobindustry.co.kr",
    via: "잡인더스트리 AI취업지원도우미로",
    intro: "잡인더스트리의 AI취업지원도우미는 CareerMatri의 MAT으로 운영합니다. 검사로 내 경험을 정리하고, 지원할 공고와 비교해 이번 주에 할 일을 알려 드립니다.",
    does: "AI취업지원도우미가 하는 일",
  },
  /* 커리어피크는 이름을 바꾸지 않고 MAT 그대로 쓴다(대표 결정 2026-10-31).
     석·박사 회원이 많은 곳이라 연구 자료 읽기를 앞에 적는다 */
  careerpeak: {
    name: "커리어피크",
    label: "MAT",
    home: "https://www.careerpeak.co.kr",
    via: "커리어피크 MAT으로",
    intro: "커리어피크 회원은 CareerMatri의 MAT을 그대로 씁니다. 논문 · 발표 자료 · 이력서를 올리면 핵심과 쓴 방법을 정리하고, 겹치는 공고를 찾아 마감까지 챙겨 드립니다.",
    does: "MAT이 하는 일",
  },
};

export function isPartner(x: unknown): x is Partner {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(PARTNERS, x);
}

/** 이 브라우저가 어느 제휴 입구로 들어왔는가. 모르면 null */
export async function partnerFromCookie(): Promise<Partner | null> {
  try {
    const v = (await cookies()).get(BRAND_COOKIE)?.value;
    return isPartner(v) ? v : null;
  } catch {
    return null;
  }
}

/** 한 사람이 한 입구에 한 줄. 두 번째부터는 마지막으로 본 때만 고친다 */
export async function recordBrand(userId: string, brand: Partner): Promise<void> {
  await query(
    `INSERT INTO brand_touches (user_id, brand) VALUES ($1, $2)
     ON CONFLICT (user_id, brand) DO UPDATE SET last_seen_at = now()`,
    [userId, brand],
  ).catch(() => undefined);
}
