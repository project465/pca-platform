/** memberships.role 이 가질 수 있는 값. schema.sql 의 주석과 일치시킨다. */
export const ROLES = ["superadmin", "org_admin", "instructor", "student"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v);
}

/** 권한이 넓은 순서. 로그인 후 어느 화면으로 보낼지 정할 때 쓴다. */
const RANK: Record<Role, number> = {
  superadmin: 3,
  org_admin: 2,
  instructor: 1,
  student: 0,
};

export function highestRole(roles: Role[]): Role {
  if (roles.length === 0) return "student";
  return roles.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "운영사 관리자",
  org_admin: "학과 담당자",
  instructor: "교수",
  student: "학생",
};

/** 역할별 첫 화면 */
export function homePathFor(role: Role): string {
  switch (role) {
    case "superadmin":
      return "/admin/organizations";
    case "org_admin":
    case "instructor":
      return "/org";
    case "student":
      return "/my";
  }
}
