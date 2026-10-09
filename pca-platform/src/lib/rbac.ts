/**
 * 누가 무엇을 볼 수 있는가.
 *
 * **숨긴 메뉴는 권한이 아니다.** 화면에서 링크를 빼는 것은 안내이고, 막는
 * 것은 서버에서 이 파일을 읽는 검사다. 주소를 직접 쳐도 같은 답이 나와야
 * 한다.
 *
 * **역할만 보지 않고 범위도 같이 본다.** `org_admin` 은 역할 이름일 뿐이고,
 * 어느 기관의 담당자인지가 빠지면 A 대학 담당자가 B 대학을 연다.
 *
 * 예전 네 가지(`memberships.role`)를 버리지 않는다. 이미 발급된 계정의 행을
 * 건드리지 않으려고 이름만 이어 둔다. 표는 `db/schema_platform.sql` 의
 * `roles` 에 있고 여기 적힌 것과 같은 값이다.
 */

export const PLATFORM_ROLES = [
  "platform_super_admin",
  "platform_admin",
  "org_admin",
  "org_staff",
  "org_participant",
  "individual",
] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** 예전 memberships.role → 지금 역할 */
const FROM_LEGACY: Record<string, PlatformRole> = {
  superadmin: "platform_super_admin",
  org_admin: "org_admin",
  instructor: "org_staff",
  student: "org_participant",
};
export function fromLegacyRole(v: string): PlatformRole {
  return FROM_LEGACY[v] ?? "individual";
}

export const ROLE_RANK: Record<PlatformRole, number> = {
  platform_super_admin: 60,
  platform_admin: 50,
  org_admin: 40,
  org_staff: 30,
  org_participant: 10,
  individual: 0,
};

export const ROLE_LABEL_KO: Record<PlatformRole, string> = {
  platform_super_admin: "운영사 시스템 관리자",
  platform_admin: "운영사 운영자",
  org_admin: "기관 담당자",
  org_staff: "기관 실무자",
  org_participant: "기관 참여자",
  individual: "개인 이용자",
};

/* ── 할 수 있는 일 ──────────────────────────────────────────────────── */

export const CAPABILITIES = [
  // 자기 것
  "self.profile.read",
  "self.evidence.write",
  "self.report.read",
  "self.purchase",

  // 기관 운영
  "org.overview.read",
  "org.participant.status.read",
  "org.participant.invite",
  "org.license.revoke",
  "org.cohort.manage",
  "org.analytics.read",
  "org.contract.read",
  "org.contract.write",
  "org.export.operational",

  // 기관이 개인 결과지를 보는 것. **기본으로 아무도 못 한다**
  "org.participant.report.read",

  // 운영사
  "platform.org.read",
  "platform.org.write",
  "platform.contract.write",
  "platform.user.read",
  "platform.order.read",
  "platform.audit.read",
  "platform.product.write",
  "platform.site.write",
  "platform.country.write",
  "platform.assessment.version.write",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const SELF: Capability[] = [
  "self.profile.read",
  "self.evidence.write",
  "self.report.read",
];

const ORG_READ: Capability[] = [
  "org.overview.read",
  "org.participant.status.read",
  "org.analytics.read",
  "org.contract.read",
];

const PLATFORM_READ: Capability[] = [
  "platform.org.read",
  "platform.user.read",
  "platform.order.read",
  "platform.audit.read",
];

/**
 * 역할이 가진 것.
 *
 * **`org.participant.report.read` 가 어느 줄에도 없다.** 기관 담당자가
 * 개인 결과지를 여는 길은 계약에 적고 본인이 따로 동의했을 때만 열린다
 * (`canReadParticipantReport`). 기본값을 열어 두면 아무도 항의하지 않고
 * 몇 달이 간다.
 */
export const ROLE_CAPS: Record<PlatformRole, Capability[]> = {
  individual: [...SELF, "self.purchase"],
  org_participant: [...SELF],
  org_staff: [...SELF, ...ORG_READ],
  org_admin: [
    ...SELF,
    ...ORG_READ,
    "org.participant.invite",
    "org.license.revoke",
    "org.cohort.manage",
    "org.export.operational",
  ],
  platform_admin: [...SELF, ...PLATFORM_READ, "platform.contract.write", "platform.org.write"],
  platform_super_admin: [...CAPABILITIES].filter(
    (c) => c !== "org.participant.report.read",
  ) as Capability[],
};

export function can(role: PlatformRole, cap: Capability): boolean {
  return ROLE_CAPS[role].includes(cap);
}

/* ── 범위 ───────────────────────────────────────────────────────────── */

export type Actor = {
  userId: number;
  role: PlatformRole;
  /** 이 사람이 담당자로 들어가 있는 기관. 운영사는 비어 있다 */
  orgIds: number[];
};

/** 기관 자료를 만질 수 있는가. 역할이 맞아도 **남의 기관이면 안 된다**. */
export function canInOrg(actor: Actor, cap: Capability, orgId: number): boolean {
  if (!can(actor.role, cap)) return false;
  if (ROLE_RANK[actor.role] >= ROLE_RANK.platform_admin) return true;
  return actor.orgIds.includes(orgId);
}

/**
 * 기관이 개인 결과지를 열 수 있는가.
 *
 * 셋이 다 맞아야 한다. 하나라도 빠지면 못 본다.
 *   ① 계약에 그렇게 적혀 있다
 *   ② 본인이 그 기관에 대해 동의했다
 *   ③ 연 기록이 남는다 (부르는 쪽이 audit 에 적는다)
 */
export function canReadParticipantReport(opts: {
  actor: Actor;
  orgId: number;
  contractAllowsIndividualAccess: boolean;
  participantConsented: boolean;
}): { ok: boolean; reason: string | null } {
  const { actor, orgId, contractAllowsIndividualAccess, participantConsented } = opts;
  if (ROLE_RANK[actor.role] < ROLE_RANK.org_admin) {
    return { ok: false, reason: "기관 담당자만 요청할 수 있습니다." };
  }
  if (!actor.orgIds.includes(orgId) && ROLE_RANK[actor.role] < ROLE_RANK.platform_admin) {
    return { ok: false, reason: "다른 기관의 자료입니다." };
  }
  if (!contractAllowsIndividualAccess) {
    return { ok: false, reason: "계약에 개인 결과지 열람이 들어 있지 않습니다." };
  }
  if (!participantConsented) {
    return { ok: false, reason: "본인이 아직 동의하지 않았습니다." };
  }
  return { ok: true, reason: null };
}

/** 역할별 첫 화면 */
export function homePathForPlatformRole(role: PlatformRole): string {
  switch (role) {
    case "platform_super_admin":
    case "platform_admin":
      return "/admin";
    case "org_admin":
    case "org_staff":
      return "/org";
    default:
      /* 개인의 첫 화면은 Workspace 다. `roles.ts` 와 같은 값을 쓴다 */
      return "/me";
  }
}
