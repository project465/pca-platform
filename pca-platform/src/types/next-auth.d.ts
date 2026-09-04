import type { Role } from "@/lib/roles";
import type { Membership } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      locale: string;
      mustResetPw: boolean;
      role: Role;
      memberships: Membership[];
    };
  }
}

/**
 * next-auth v5 의 JWT 타입은 @auth/core/jwt 에서 온다.
 * next-auth/jwt 는 그것을 다시 내보내기만 하므로 양쪽 다 넓혀둔다.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    displayName?: string;
    locale?: string;
    mustResetPw?: boolean;
    role?: Role;
    memberships?: Membership[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    displayName?: string;
    locale?: string;
    mustResetPw?: boolean;
    role?: Role;
    memberships?: Membership[];
  }
}

export {};
