import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";

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
  /**
   * "하는 일" 절 목록. 비우면 가격표의 MAT 칸과 같은 문장(`pxTrackF1-3`)을 쓴다.
   * 커리어피크는 연구자 흐름이라 따로 적는다(2026-10-31 대표 결정)
   */
  doesList?: string[];
  /** "이렇게 이어집니다" 세 단계. 비우면 검사부터 시작하는 공통 흐름 */
  steps?: [string, string][];
  /** 로그인한 사람이 누르는 첫 단추가 가는 곳과 이름 */
  open?: { href: string; label: string };
  /** 처음 온 사람의 첫 단추. 비우면 무료 검사부터 */
  start?: { href: string; label: string };
  /** 잡인더스트리 공고 화면에서 넘어온 공고(`cm_job`)를 이어 받는가 */
  takesJob: boolean;
}> = {
  jobindustry: {
    name: "잡인더스트리",
    label: "AI취업지원도우미",
    home: "https://www.jobindustry.co.kr",
    via: "잡인더스트리 AI취업지원도우미로",
    intro: "잡인더스트리의 AI취업지원도우미는 CareerMatri의 MAT으로 운영합니다. 검사로 내 경험을 정리하고, 지원할 공고와 비교해 이번 주에 할 일을 알려 드립니다.",
    does: "AI취업지원도우미가 하는 일",
    takesJob: true,
  },
  /* 커리어피크는 이름을 바꾸지 않고 MAT 그대로 쓴다(대표 결정 2026-10-31).
     **연구자 · 대학원생 흐름이다**(같은 날 대표 결정): 논문 · 발표 자료 · 이력서를
     올리면 → 기업이 읽는 한 장 요약 → 연구직 · R&D 공고 → 커리어피크 상담.
     잡인더스트리의 "보던 공고" 안내는 이 쪽에 보이지 않는다(`takesJob`) */
  careerpeak: {
    name: "커리어피크",
    label: "MAT",
    home: "https://www.careerpeak.co.kr",
    via: "커리어피크 MAT으로",
    intro: "커리어피크 회원은 CareerMatri의 MAT을 그대로 씁니다. 논문 · 발표 자료 · 이력서를 올리면 기업이 읽는 한 장 요약으로 정리하고, 맞는 연구직 · R&D 공고를 찾아 드립니다. 원하시면 그 요약으로 커리어피크 상담을 받으실 수 있습니다.",
    does: "MAT이 하는 일",
    doesList: [
      "자료 읽기 — 논문(영어 포함) · 학위논문 · 발표 자료 · 이력서를 읽고 무엇을 풀었는지, 어떤 방법을 썼는지, 무엇이 나왔는지 정리합니다. 수치는 자료에 적힌 그대로 옮깁니다.",
      "한 장 요약 — 연구 내용을 회사와 연구소가 읽는 직무의 말로 옮겨, 기업이 한 번에 읽을 수 있는 한 장으로 묶습니다.",
      "연구직 · R&D 공고 — 요약에서 뽑은 낱말로 겹치는 공고를 찾고, 적어 둔 공고는 마감 7 · 3 · 1일 전에 알려 드립니다.",
    ],
    steps: [
      ["자료를 올리면 한 장으로 정리합니다", "논문 · 발표 자료 · 이력서를 올리면 기업이 읽는 한 장 요약을 만듭니다. 원본 파일은 읽은 뒤 바로 버립니다."],
      ["맞는 연구직 · R&D 공고를 찾습니다", "요약에서 뽑은 낱말로 겹치는 연구직 · R&D 공고를 찾아 보여 드립니다."],
      ["커리어피크 상담으로 이어집니다", "원하시면 한 장 요약과 연락처를 커리어피크 상담가에게 보냅니다. 보낼 때마다 따로 동의를 받고, 원본 파일은 보내지 않습니다."],
    ],
    open: { href: "/me/track/research", label: "내 자료 올리기" },
    /* 연구자는 자료 올리기부터(2026-10-31 대표 결정). 가입 때 입구 쿠키로 커리어피크
       입구가 적히고(`brand_touches`), 그러면 검사 전에도 자료 읽기가 열린다(`mat-access.ts`) */
    start: { href: "/signup?next=%2Fme%2Ftrack%2Fresearch", label: "자료 올리기로 시작하기" },
    takesJob: false,
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

/**
 * 이 사람이 그 제휴 입구로 들어온 적이 있는가(`brand_touches`). 표가 없거나
 * 읽지 못하면 아니라고 답한다: 이 값은 문을 **더 여는** 데만 쓰므로, 모를 때는
 * 평소대로 닫힌 쪽이 맞다.
 */
export async function cameVia(userId: string, brand: Partner): Promise<boolean> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM brand_touches WHERE user_id = $1 AND brand = $2`, [userId, brand],
  ).catch(() => null);
  return (r?.n ?? 0) > 0;
}
