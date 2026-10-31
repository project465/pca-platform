import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { isSuperadmin } from "@/lib/session";

/**
 * 제휴 입구(2026-10-30). 잡인더스트리와 커리어피크가 MAT 을 **각자의 이름으로**
 * 회원에게 붙인다(2026-10-31 대표 결정): 잡인더스트리는 `AI 취업 도우미`,
 * 커리어피크는 `AI 취업 비서`. 그 입구로 온 사람에게는 제휴 화면 · MAT 머리 ·
 * 알림 · 메일이 그 이름을 쓴다(`serviceName`). 다른 사람에게는 지금 이름(MAT) 그대로다.
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
  /** 그 사이트에서 MAT 을 부르는 이름. 알림 · 메일에도 이 이름을 쓴다 */
  label: string;
  /** 영어 작업공간에서 부르는 이름 */
  labelEn: string;
  /** 영어 작업공간의 "~로 들어오셨습니다" 한 줄 */
  viaEn: string;
  /** 돌아가는 곳 */
  home: string;
  /** "~로 들어오셨습니다" 앞에 붙는 말. 조사가 이름 끝소리를 따르므로 손으로 적는다 */
  via: string;
  /**
   * 소개 쪽 부제 **한 줄**. 2026-10-31 대표 지시("너무 AI 느낌")로 긴 설명 문단을 걷고
   * 사람이 쓰는 마케팅 문장 하나로 줄였다
   */
  intro: string;
  /** 세 단계. 제목은 두세 낱말, 설명은 짧은 한 문장 */
  steps: [string, string][];
  /** 소개 쪽 맨 아래 작은 글씨에 더할 그 입구만의 안내 */
  fine?: string[];
  /** 로그인한 사람이 누르는 첫 단추가 가는 곳과 이름 */
  open?: { href: string; label: string };
  /** 처음 온 사람의 첫 단추. 비우면 무료 검사부터 */
  start?: { href: string; label: string };
  /** 잡인더스트리 공고 화면에서 넘어온 공고(`cm_job`)를 이어 받는가 */
  takesJob: boolean;
}> = {
  jobindustry: {
    name: "잡인더스트리",
    label: "AI 취업 도우미",
    labelEn: "AI Job Helper",
    home: "https://www.jobindustry.co.kr",
    via: "잡인더스트리 AI 취업 도우미로",
    viaEn: "You came in through JobIndustry's AI Job Helper",
    intro: "지원할 공고에 맞춰 이번 주 할 일을 알려 드립니다.",
    steps: [
      ["무료 검사", "전공을 고르고 기본 검사를 풉니다."],
      ["공고 붙이기", "지원할 공고를 붙여 넣습니다."],
      ["이번 주 할 일", "부족한 부분과 마감을 챙겨 드립니다."],
    ],
    start: { href: "/signup?next=%2Fcores", label: "무료로 시작하기" },
    takesJob: true,
  },
  /* 커리어피크는 `AI 취업 비서` 라고 부른다(대표 결정 2026-10-31 17:55. 그 전에는 MAT).
     **연구자 · 대학원생 흐름이다**(같은 날 대표 결정): 논문 · 발표 자료 · 이력서를
     올리면 → 기업이 읽는 한 장 요약 → 연구직 · R&D 공고 → 커리어피크 상담.
     잡인더스트리의 "보던 공고" 안내는 이 쪽에 보이지 않는다(`takesJob`) */
  careerpeak: {
    name: "커리어피크",
    label: "AI 취업 비서",
    labelEn: "AI Career Assistant",
    home: "https://www.careerpeak.co.kr",
    via: "커리어피크 AI 취업 비서로",
    viaEn: "You came in through CareerPeak's AI Career Assistant",
    intro: "논문과 이력서로 나에게 맞는 연구직을 찾아보세요.",
    steps: [
      ["자료 올리기", "논문, 발표 자료, 이력서를 올립니다."],
      ["한 장 요약", "기업이 읽기 좋게 한 장으로 정리합니다."],
      ["공고와 상담", "맞는 연구직 공고를 찾고, 원하면 커리어피크 상담을 받습니다."],
    ],
    fine: ["올린 파일은 저장하지 않습니다."],
    open: { href: "/me/track/research", label: "내 자료 올리기" },
    /* 연구자는 자료 올리기부터(2026-10-31 대표 결정). 가입 때 입구 쿠키로 커리어피크
       입구가 적히고(`brand_touches`), 그러면 검사 전에도 자료 읽기가 열린다(`mat-access.ts`) */
    start: { href: "/signup?next=%2Fme%2Ftrack%2Fresearch", label: "무료로 시작하기" },
    takesJob: false,
  },
};

/**
 * **제휴 화면을 내려 둔다**(2026-10-31 대표 지시: "너무 AI 느낌이라 우선 내린다").
 * 이 값이 false 인 동안 `/partner/*` · `/from/*` 는 운영자에게만 열리고, 그 밖의 사람은
 * 제휴 사이트 첫 화면으로 돌아간다. MAT 머리의 입구 이름과 알림 · 메일의 입구 이름도
 * 운영자가 아니면 쓰지 않는다. 다시 열 때는 이 한 줄만 true 로 바꾼다.
 */
export const PARTNERS_PUBLIC = false;

/** 지금 이 사람에게 제휴 화면 · 입구 이름을 보여도 되는가 */
export async function partnerVisible(): Promise<boolean> {
  return PARTNERS_PUBLIC || await isSuperadmin();
}

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

/** 이 사람이 마지막으로 들어온 제휴 입구. 없거나 읽지 못하면 null */
export async function brandOf(userId: string): Promise<Partner | null> {
  /* 제휴를 내려 둔 동안에는 알림 · 메일에 입구 이름을 쓰지 않는다(`PARTNERS_PUBLIC`) */
  if (!PARTNERS_PUBLIC) return null;
  const r = await queryOne<{ brand: string }>(
    `SELECT brand FROM brand_touches WHERE user_id = $1 ORDER BY last_seen_at DESC LIMIT 1`, [userId],
  ).catch(() => null);
  return isPartner(r?.brand) ? r!.brand as Partner : null;
}

/**
 * 알림 · 메일에서 부르는 이름. 제휴 입구로 온 사람은 그 사이트의 이름
 * (`AI 취업 도우미` · `AI 취업 비서`), 그 밖의 사람은 지금 이름 그대로(MAT).
 */
export function serviceName(brand: Partner | null, lang: "ko" | "en" = "ko"): string {
  if (!brand) return "MAT";
  return lang === "en" ? PARTNERS[brand].labelEn : PARTNERS[brand].label;
}
