/**
 * 학교 담당자의 **내려받기 기록.**
 *
 * 명단 CSV 와 학과 집계 CSV 와 운영 요약 PDF 는 학생 계정과 응시 상태를 학교
 * 밖으로 들고 나가는 자리다. 계정을 고치는 일(`campus.student.*`)은 전부터
 * 남았는데 **들고 나간 일은 한 줄도 남지 않았다**(3차 Track F 출시 점검).
 * 그러면 사고가 난 날 누가 언제 어느 범위를 받아 갔는지 되짚을 길이 없다.
 *
 * **이름과 메일을 적지 않는다**(`audit()` 가 한 번 더 거른다). 적는 것은 누가 ·
 * 어느 학교 · 어느 범위(단과대학 · 학과 · 상태 · 기간)까지다.
 *
 * **기록이 안 되면 내보내지 않는다.** 접근 기록 없는 개인정보 반출을 남기지
 * 않으려는 것이다: 기록을 먼저 적고 그다음에 응답한다.
 */
import { audit, type AuditAction } from "@/lib/audit";
import type { CampusQuery, CampusViewer } from "@/lib/campus/viewer";

export async function auditExport(
  v: CampusViewer, action: Extract<AuditAction, `campus.export.${string}`>,
  q: CampusQuery, extra: Record<string, unknown> = {},
): Promise<void> {
  await audit({
    actorId: Number(v.user.id), actorRole: v.user.role,
    action, targetKind: "university", targetId: v.uni,
    orgId: (() => {
      const o = v.orgs.find((x) => x.code === v.uni) ?? v.org;
      return o ? Number(o.id) : null;
    })(),
    detail: {
      university: v.uni,
      college: q.college, department: q.department, from: q.from, to: q.to,
      ...extra,
    },
  });
}
