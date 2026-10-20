// harness-only stub; auth flows are not exercised by DB-level checks
export default function NextAuth() { const no = () => { throw new Error("next-auth unavailable in harness"); }; return { handlers: {}, auth: no, signIn: no, signOut: no }; }
export const CredentialsSignin = class extends Error {};
export function Credentials(c) { return c; }

