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
      /* **기관 목록이 아니라 한눈에 보는 쪽으로 보낸다.** 운영자가 아침에
         여는 자리가 기관 목록이면 개인 쪽이 멈춘 날을 아무도 못 본다 */
      return "/admin";
    case "org_admin":
    case "instructor":
      return "/org";
    case "student":
      /* **개인의 첫 화면은 Workspace 다.** 전에는 `/my` 였는데 그 쪽은
         옛 표(`attempts` · `report_snapshots`)를 읽어서, V3 를 끝낸 사람이
         로그인하면 `아직 응시한 검사가 없습니다` 를 읽고 옛 검사로
         보내졌다. `/my` 는 계정 영역으로 남는다 */
      return "/me";
  }
}
