import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { query } from "@/lib/db";
import { cells, MIN_CELL, pilotRows, purgeDue } from "@/lib/me-v3/pilot/store";

export const metadata = { title: "V3 파일럿 · CareerMatri" };
export const dynamic = "force-dynamic";

const STAGE_KO: Record<string, string> = {
  bachelor: "학부", master: "석사", phd: "박사", postdoc: "포닥",
};
/** 묶음 코드를 운영 화면에서도 사람 말로. **코드를 눈에 띄게 두지 않는다** */
const ZONE_KO: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "근거 섬",
  Z2_EVIDENCE_INCOMPLETE: "근거 덜 섬",
  Z3_EVIDENCE_LOW_INTEREST: "관심 낮음",
  Z4_INSUFFICIENT_EVIDENCE: "판단 어려움",
  NOT_EXPLORED: "안 물음",
};

function zonesKo(z: Record<string, number> | null): string {
  if (!z) return "—";
  return Object.entries(z)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, n]) => `${ZONE_KO[k] ?? k} ${n}`)
    .join(" · ") || "—";
}

const QUALITY_KO: Record<string, string> = {
  OK: "정상", REVIEW: "다시 볼 것", LOW_VARIANCE: "차이 적음", INCONSISTENT: "엇갈림",
};

function mmss(sec: number | null): string {
  if (sec === null) return "—";
  const m = Math.floor(sec / 60);
  return `${m}분 ${String(sec % 60).padStart(2, "0")}초`;
}

/**
 * 본 파일럿 한 표.
 *
 * **관리 시스템을 새로 짓지 않는다.** 스무 명에서 서른 명을 보는 자리에
 * 검색과 필터와 내보내기를 달면, 파일럿이 끝난 뒤 아무도 안 쓰는 화면이
 * 하나 남는다. 여기서 답해야 하는 물음은 넷이다 — 누가 끝냈는가 · 얼마나
 * 걸렸는가 · 결과가 나왔는가 · 의견을 적었는가.
 *
 * **이름을 내보내지 않는다.** 줄마다 서는 것은 가명이고, 전공명은 이 표에
 * 아예 뽑지 않는다(준식별자라서 학위·계열과 같이 놓으면 사람이 좁혀진다).
 *
 * **다섯 명이 안 되는 묶음은 평균을 내지 않는다.** 가려서 보여 주는 것이
 * 아니라 값을 만들지 않는다 — 값이 없어야 캡처에도 안 남는다.
 */
export default async function V3PilotPage() {
  const user = await requireRole(["superadmin"]);
  const rows = await pilotRows();

  const scores = await query<{ key: string; value: number }>(
    `SELECT (a.tier || ' · ' || p.education_stage) AS key, f.value::int AS value
       FROM v3_pilot_feedback f
       JOIN v3_attempts a ON a.id = f.attempt_id
       JOIN v3_pilot_participants p ON p.user_id = a.user_id
      WHERE f.value IS NOT NULL`);
  const byCell = cells(scores);

  /* **이 화면은 전공명을 건드리지 않는다.** 뽑는 자리가 한 곳이면
     그 한 곳만 지키면 된다 */
  const purge = await purgeDue();

  const done = rows.filter((r) => r.submitted_at).length;
  const withFeedback = rows.filter((r) => r.feedback > 0).length;
  const broken = rows.filter((r) => r.broken).length;

  return (
    <AdminShell user={user} current="/admin/v3-pilot">
      <h1>V3 파일럿</h1>
      <p className="sub">
        참가자 {rows.length}명 · 끝낸 응시 {done} · 의견 {withFeedback} · 결과가 안 나온 응시 {broken}
      </p>

      {rows.length === 0 ? (
        <section className="panel">
          <h2>아직 참가자가 없습니다</h2>
          <p className="sub">
            참가자가 <code>/v3/pilot</code> 에서 등록하면 여기에 섭니다.
            숫자를 지어내지 않습니다.
          </p>
        </section>
      ) : (
        <section className="panel">
          <h2>참가자</h2>
          {/* 칸이 열셋이라 좁은 화면에서 쪽 전체가 옆으로 밀렸다.
              미는 것은 표 하나지 쪽이 아니다 */}
          <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>가명</th><th>학위</th><th>등급</th><th>상태</th>
                <th>시작</th><th>완료</th><th>걸린 시간</th>
                <th>응답 품질</th><th>깊게 본 영역</th><th>답한 문항</th>
                <th>결과 묶음</th><th>의견</th><th>오류</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td><code>{r.code}</code></td>
                  <td>{STAGE_KO[r.education_stage] ?? r.education_stage}</td>
                  <td>{r.tier ?? "—"}</td>
                  <td>{r.status === "scored" ? "끝남" : r.status === "submitted" ? "낸 뒤" : r.status ? "하는 중" : "시작 전"}</td>
                  <td>{r.started_at?.slice(0, 16) ?? "—"}</td>
                  <td>{r.submitted_at?.slice(0, 16) ?? "—"}</td>
                  <td>{mmss(r.seconds)}</td>
                  <td>{r.response_quality ? QUALITY_KO[r.response_quality] ?? r.response_quality : "—"}</td>
                  <td>{r.opened_deep}</td>
                  <td>{r.answered}</td>
                  <td>{zonesKo(r.zones)}</td>
                  <td>{r.feedback ? `${r.feedback}개` : "—"}</td>
                  <td>{r.broken ? "결과 없음" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>묶음별 척도 평균</h2>
        <p className="sub">
          {MIN_CELL}명이 안 되는 묶음은 평균을 내지 않습니다. 수만 적습니다.
        </p>
        {byCell.length === 0 ? (
          <p className="sub">아직 척도 응답이 없습니다.</p>
        ) : (
          <div className="tablewrap">
          <table>
            <thead><tr><th>묶음</th><th>응답 수</th><th>평균</th></tr></thead>
            <tbody>
              {byCell.map((c) => (
                <tr key={c.key}>
                  <td>{c.key}</td>
                  <td>{c.n}</td>
                  <td>{c.mean ?? `— (${MIN_CELL}명 미만)`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>지울 날</h2>
        <p className="sub">
          전공명과 가고 싶은 쪽은 준식별자라 보존 기한을 박아 둡니다.
          기한이 지난 줄은 <code>npm run v3:pilot:purge</code> 가 지웁니다.
        </p>
        {purge.length === 0 ? (
          <p className="sub">지울 것이 없습니다.</p>
        ) : (
          <div className="tablewrap">
          <table>
            <thead><tr><th>가명</th><th>지우는 날</th><th>남은 날</th></tr></thead>
            <tbody>
              {purge.map((p) => (
                <tr key={p.code}>
                  <td><code>{p.code}</code></td>
                  <td>{p.purge_after}</td>
                  <td>{p.left_days <= 0 ? "지날 때가 지났습니다" : `${p.left_days}일`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
