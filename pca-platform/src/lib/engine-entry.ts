/**
 * 산 것이 **어느 검사로 들어가는가.**
 *
 * 이 파일이 생긴 까닭. 감사에서 공개 진입 동선이 전부 옛 검사를 가리키고
 * 있는 것이 나왔다.
 *
 *   /pricing → /checkout → /checkout/complete → /assessment/start   ME_V2
 *   /free                                     → /test               ME_V1
 *   /free-start                               → /assessment/start   ME_V2
 *   /redeem                                   → /test               ME_V1
 *
 * 넷 다 **주소를 손으로 적어 둔 자리**였다. 그래서 판본이 하나 올라갈
 * 때마다 네 자리를 따로 고쳐야 했고, 실제로 ME_V3 로 올라가면서 한 자리도
 * 안 고쳐졌다. 이제 `products.assessment_version` 이 정하고 화면은 이
 * 함수를 부른다(설계 원칙 10: 판단하는 자리를 하나로).
 *
 * **지금 파는 판본을 코드에 적는 것은 여기 한 줄뿐이다.**
 */

/** 지금 파는 검사. 새 판본을 여는 날 **이 한 줄만** 바뀐다 */
export const CURRENT_ASSESSMENT = "ME_V3_2";

/**
 * 옛 판본이 들어가던 자리.
 *
 * **지우지 않는다.** 그 판본으로 응시하신 분의 이어하기와 결과지가 그
 * 주소에 있다. 다만 **신규 사용자가 거기로 들어가지는 않는다**: 아래
 * `startPathFor` 가 새로 산 것에는 그 주소를 돌려주지 않는다.
 */
const LEGACY_START: Record<string, string> = {
  ME_V2: "/assessment/start",
  ME_V1: "/test",
};

/** 지금 파는 검사인가 */
export function isCurrentEngine(assessmentVersion: string | null | undefined): boolean {
  return (assessmentVersion ?? "") === CURRENT_ASSESSMENT;
}

/**
 * 이 상품을 산 사람이 다음에 열 자리.
 *
 * 지금 판본이면 전공 고르는 화면이다. **검사를 바로 열지 않는다**:
 * CareerMatri 는 전공마다 Core 가 따로이고, 그 사실을 고르는 자리에서
 * 보여야 다른 전공 학생이 왜 자기 것이 없는지 안다.
 *
 * 옛 판본이면 `null` 이다. **옛 검사 주소를 돌려주지 않는 것이 일부러다**:
 * 돌려주면 그것이 곧 신규 진입 동선이 된다. 부르는 쪽은 `null` 을 받으면
 * `아직 판매를 열지 않았습니다` 쪽으로 간다.
 */
export function startPathFor(assessmentVersion: string | null | undefined): string | null {
  if (isCurrentEngine(assessmentVersion)) return "/cores";
  return null;
}

/**
 * 옛 판본으로 **이미 응시한 분**이 이어하는 자리.
 *
 * `startPathFor` 와 나눠 둔 것이 이 파일의 요지다. 하나로 두면 "이어
 * 하기" 를 살리려다 "새로 사기" 까지 옛 검사로 열린다.
 */
export function resumePathFor(assessmentVersion: string | null | undefined): string | null {
  return LEGACY_START[assessmentVersion ?? ""] ?? null;
}

/**
 * **옛 판본인가.** 화면이 글자를 직접 견주지 않게 모아 둔다.
 *
 * `attempts.assessment_version` 에는 `ME_V2` 가 들어가고
 * `report_snapshots.assessment_version` 에는 `ME_V2_DECISION_2026` 이
 * 들어간다. 앞엣것은 상품이 적는 판본이고 뒤엣것은 그릴 때 그려 놓은
 * 엔진 판본이라 값이 다르다. 화면마다 `=== "ME_V2"` 로 적어 두면 어느 날
 * 뒤엣값이 들어오는 자리에서 **조용히 다른 renderer 로 간다.**
 */
export function isLegacyV2(assessmentVersion: string | null | undefined): boolean {
  return /^ME_V2(_|$)/.test(assessmentVersion ?? "");
}

/**
 * 옛 판본 결과지가 어느 쪽에 있는가.
 *
 * **판본마다 renderer 가 다르다.** ME_V2 는 그 판본의 엔진이 그린 문서를
 * 창에 띄우고(`/assessment/[id]/report`), ME_V1 은 서버가 그린 쪽이다
 * (`/report/[id]`). 지금 판본은 둘 가운데 어느 쪽도 아니고
 * `/v3/[id]/result` 다: 그쪽은 굳은 결과 모델을 React 가 직접 그린다.
 *
 * **섞이면 조용히 틀린다.** ME_V2 결과를 ME_V1 쪽으로 보내면 쪽은 뜨고
 * 내용만 없고, 반대로 보내면 창에 아무것도 안 들어온다. 그래서 그 분기를
 * 화면에 흩어 두지 않고 여기 한 줄로 둔다(설계 원칙 10).
 */
export function legacyReportPathFor(
  attemptId: string | number, assessmentVersion: string | null | undefined,
): string {
  return isLegacyV2(assessmentVersion)
    ? `/assessment/${attemptId}/report`
    : `/report/${attemptId}`;
}

/** route 분류. 보고서와 `npm run v3:routes` 가 같은 값을 읽는다 */
export type RouteClass = "CURRENT" | "COMPATIBILITY" | "REDIRECT" | "DEPRECATED";

export type RouteRow = {
  route: string;
  /** 신규 사용자가 여기로 들어가는가 */
  newUser: string;
  /** 기존 사용자에게 무엇인가 */
  oldUser: string;
  cls: RouteClass;
};

/**
 * 공개 진입과 옛 검사 주소의 분류.
 *
 * **표를 문서에만 적지 않는다.** 적어 두면 다음 사람이 route 를 하나
 * 더하고 표를 안 고친다. `npm run v3:routes` 가 이 표와 실제
 * `src/app` 의 쪽을 대조한다.
 */
export const ROUTE_TABLE: RouteRow[] = [
  /* ── 지금 검사 ─────────────────────────────────────────── */
  { route: "/cores", newUser: "여기로 들어온다", oldUser: "같음", cls: "CURRENT" },
  { route: "/v3/start", newUser: "`/cores` 가 보낸다", oldUser: "같음", cls: "CURRENT" },
  { route: "/v3/[attemptId]", newUser: "응시", oldUser: "이어하기", cls: "CURRENT" },
  { route: "/v3/[attemptId]/result", newUser: "결과지", oldUser: "같음", cls: "CURRENT" },
  { route: "/v3/[attemptId]/feedback", newUser: "파일럿 의견", oldUser: "같음",
    cls: "CURRENT" },
  { route: "/v3/pilot", newUser: "파일럿 등록", oldUser: "같음", cls: "CURRENT" },

  /* ── 공개 진입 ─────────────────────────────────────────── */
  { route: "/start", newUser: "개인·기관 갈림길", oldUser: "로그인 뒤 제 면으로",
    cls: "CURRENT" },
  { route: "/pricing", newUser: "지금 판본만 선다", oldUser: "같음", cls: "CURRENT" },
  { route: "/product", newUser: "상품 소개", oldUser: "같음", cls: "CURRENT" },
  { route: "/checkout", newUser: "결제", oldUser: "같음", cls: "CURRENT" },
  { route: "/checkout/complete", newUser: "`/cores` 로 보낸다", oldUser: "같음",
    cls: "CURRENT" },

  /* ── 작업공간 ──────────────────────────────────────────── */
  { route: "/me", newUser: "로그인 뒤 첫 화면", oldUser: "같음", cls: "CURRENT" },
  { route: "/me/results", newUser: "결과 이력", oldUser: "같음", cls: "CURRENT" },
  { route: "/me/state", newUser: "지금 상태·비어 있는 자리", oldUser: "같음",
    cls: "CURRENT" },
  { route: "/me/next", newUser: "다음 할 일", oldUser: "같음", cls: "CURRENT" },
  { route: "/me/experience", newUser: "경험 목록", oldUser: "같음", cls: "CURRENT" },
  { route: "/me/experience/new", newUser: "경험 추가", oldUser: "같음", cls: "CURRENT" },
  { route: "/me/recompute", newUser: "새 경험 반영", oldUser: "같음", cls: "CURRENT" },
  { route: "/me/explore", newUser: "산업·직무 탐색", oldUser: "같음", cls: "CURRENT" },
  { route: "/me/region", newUser: "지역과 기관", oldUser: "같음", cls: "CURRENT" },
  { route: "/me/track", newUser: "Track", oldUser: "같음", cls: "CURRENT" },
  { route: "/me/jobs", newUser: "Track 안의 공고 자리", oldUser: "같음", cls: "CURRENT" },
  { route: "/me/apply", newUser: "지원 준비", oldUser: "같음", cls: "CURRENT" },

  /* ── 계정 ──────────────────────────────────────────────── */
  { route: "/my", newUser: "계정", oldUser: "계정", cls: "CURRENT" },
  { route: "/my/account", newUser: "탈퇴·파기", oldUser: "같음", cls: "CURRENT" },

  /* ── 옛 검사. 지우지 않고 읽기만 남긴다 ─────────────────── */
  { route: "/test", newUser: "들어갈 수 없다", oldUser: "ME_V1 이어하기",
    cls: "COMPATIBILITY" },
  { route: "/test/[attemptId]", newUser: "들어갈 수 없다", oldUser: "ME_V1 응시",
    cls: "COMPATIBILITY" },
  { route: "/assessment/start", newUser: "들어갈 수 없다", oldUser: "ME_V2 이어하기",
    cls: "COMPATIBILITY" },
  { route: "/assessment/[attemptId]", newUser: "들어갈 수 없다", oldUser: "ME_V2 응시",
    cls: "COMPATIBILITY" },
  { route: "/assessment/[attemptId]/done", newUser: "—", oldUser: "ME_V2 제출 직후",
    cls: "COMPATIBILITY" },
  { route: "/assessment/[attemptId]/evidence", newUser: "—", oldUser: "ME_V2 경험 입력",
    cls: "COMPATIBILITY" },
  { route: "/assessment/[attemptId]/report", newUser: "—", oldUser: "ME_V2 결과지",
    cls: "COMPATIBILITY" },
  { route: "/report/[attemptId]", newUser: "—", oldUser: "ME_V1 결과지",
    cls: "COMPATIBILITY" },
  { route: "/evidence", newUser: "—", oldUser: "옛 경험 입력", cls: "COMPATIBILITY" },
  { route: "/pilot/[attemptId]", newUser: "—", oldUser: "ME_V2 파일럿 의견",
    cls: "COMPATIBILITY" },
  { route: "/my/assessments", newUser: "—", oldUser: "옛 응시 목록", cls: "COMPATIBILITY" },
  { route: "/my/results", newUser: "—", oldUser: "옛 결과 목록", cls: "COMPATIBILITY" },
  { route: "/my/evidence", newUser: "—", oldUser: "옛 경험", cls: "COMPATIBILITY" },
  { route: "/my/applications", newUser: "—", oldUser: "옛 지원 기록",
    cls: "COMPATIBILITY" },

  /* ── 들어오면 지금 자리로 보낸다 ────────────────────────── */
  { route: "/free", newUser: "`/cores` 로 보낸다", oldUser: "같음", cls: "REDIRECT" },
  { route: "/free-start", newUser: "`/cores` 로 보낸다", oldUser: "같음", cls: "REDIRECT" },
  { route: "/redeem", newUser: "`/cores` 로 보낸다", oldUser: "옛 결과지로", cls: "REDIRECT" },
  { route: "/me/gap", newUser: "`/me/state#gaps`", oldUser: "같음", cls: "REDIRECT" },

  /* ── 접었다 ────────────────────────────────────────────── */
  { route: "/sample", newUser: "권하지 않는다 (옛 판본 결과지)", oldUser: "옛 판본 견본",
    cls: "DEPRECATED" },
];

/**
 * **분류가 있어야 하는 구역.**
 *
 * `src/app` 전체를 표에 적지 않는다: 운영 화면과 기관 화면은 어느 검사로
 * 들어가는가와 상관이 없고, 그것까지 적으면 표가 쪽 목록이 되어 아무도
 * 안 고친다. 세는 것은 **판본이 갈리는 구역과 두 영역이 갈리는 구역**이다.
 *
 * 첫 칸으로 고른다. `npm run routes:check` 가 이 목록으로 실제 쪽을
 * 골라 표와 대조하므로, **쪽을 하나 더하면 표를 고치기 전까지 걸린다.**
 */
export const OWNED_SEGMENTS = [
  /* 옛 검사 */ "test", "assessment", "report", "evidence", "pilot",
  /* 지금 검사 */ "v3", "cores",
  /* 공개 진입 */ "start", "pricing", "product", "checkout",
  "free", "free-start", "redeem", "sample",
  /* 작업공간과 계정 */ "me", "my",
];
