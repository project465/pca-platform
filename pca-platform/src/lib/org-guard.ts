import type { RosterEntry } from "@/lib/roster-types";

export { canEditSession, canViewSession } from "@/lib/org";

/**
 * 클라이언트가 보내온 명단 줄을 서버에서 다시 본다.
 *
 * 발급은 두 단계다 — 파일을 읽어 미리보기를 만들고, 사람이 확인한 뒤 묶음으로
 * 보낸다. 두 번째 단계의 입력은 브라우저를 거쳐 오므로 파일을 읽을 때 했던
 * 검사를 믿을 수 없다. 형식만이라도 여기서 한 번 더 본다.
 */
const LOGIN_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/;

export function sessionForIssueGuard(entries: RosterEntry[]): string | null {
  if (entries.length === 0) return "발급할 대상이 없습니다.";
  for (const e of entries) {
    if (typeof e?.loginId !== "string" || !LOGIN_RE.test(e.loginId)) {
      return `학번 형식이 올바르지 않습니다: ${String(e?.loginId).slice(0, 40)}`;
    }
    if (typeof e?.name !== "string" || e.name.trim() === "" || e.name.length > 50) {
      return `이름이 올바르지 않습니다: ${String(e?.name).slice(0, 40)}`;
    }
    if (e.email !== null && (typeof e.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email))) {
      return `이메일이 올바르지 않습니다: ${String(e.email).slice(0, 60)}`;
    }
  }
  return null;
}
