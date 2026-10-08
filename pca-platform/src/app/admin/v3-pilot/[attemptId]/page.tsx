import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { query, queryOne } from "@/lib/db";
import {
  blockTimes, feedbackItems, feedbackOf, type Choice,
} from "@/lib/me-v3/pilot/store";
import { ISSUE_KO, issues } from "@/lib/me-v3/pilot/analyze";
import { WAVE_KO } from "@/lib/me-v3/pilot/enroll";

export const metadata = { title: "V3 파일럿 한 사람 · CareerMatri" };
export const dynamic = "force-dynamic";

const STAGE_KO: Record<string, string> = {
  bachelor: "학부", master: "석사", phd: "박사", postdoc: "포닥",
};

/**
 * 응시 한 벌을 그 자리에서 연다.
 *
 * **결과가 안 맞는다고 적은 줄에서 바로 올 자리다.** 가명을 들고 표를
 * 되짚게 하면 그 일을 아무도 하지 않는다.
 *
 * **여기도 전공명을 뽑지 않는다.** 한 사람 화면이라고 더 보여 주면,
 * 준식별자를 지우는 규칙이 화면마다 달라진다.
 */
export default async function V3PilotOne({
  params,
}: { params: Promise<{ attemptId: string }> }) {
  const user = await requireRole(["superadmin"]);
  const { attemptId } = await params;
  if (!/^\d+$/.test(attemptId)) notFound();

  const a = await queryOne<{
    id: string; tier: string; status: string; stage: string; grad_field: string | null;
    started_at: string; submitted_at: string | null;
    code: string; wave: number; education_stage: string; purge_after: string;
    quality: string | null; opened_deep: number;
  }>(
    `SELECT a.id::text, a.tier, a.status, a.stage, a.grad_field,
            a.started_at::text, a.submitted_at::text,
            p.code, p.wave, p.education_stage, p.purge_after::text,
            s.response_quality AS quality,
            COALESCE(array_length(a.opened_deep, 1), 0) AS opened_deep
       FROM v3_attempts a
       JOIN v3_pilot_participants p ON p.user_id = a.user_id
       LEFT JOIN LATERAL (
         SELECT * FROM v3_snapshots y WHERE y.attempt_id = a.id
          ORDER BY y.id DESC LIMIT 1) s ON true
      WHERE a.id = $1`, [attemptId]);
  if (!a) notFound();

  const blocks = await blockTimes(attemptId);
  const items = await feedbackItems(a.tier);
  const mine = await feedbackOf(attemptId);
  const flags = (await issues(a.wave)).find((x) => x.code === a.code)?.kinds ?? [];

  const steps = await query<{ screen_id: string; kind: string; at: string }>(
    `SELECT screen_id, kind, at::text FROM v3_pilot_screen_events
      WHERE attempt_id = $1 ORDER BY at`, [attemptId]);

  const label = (it: { choices: Choice[] | null }, v: string) =>
    it.choices?.find((c) => c.value === v)?.label ?? v;

  return (
    <AdminShell user={user} current="/admin/v3-pilot">
      <h1>{a.code}</h1>
      <p className="sub">
        {WAVE_KO[a.wave] ?? ""} · {a.tier} ·{" "}
        {STAGE_KO[a.education_stage] ?? a.education_stage} ·{" "}
        시작 {a.started_at.slice(0, 16)} ·{" "}
        {a.submitted_at ? `완료 ${a.submitted_at.slice(0, 16)}` : "아직 하는 중"}
        {" · "}적은 글을 지우는 날 {a.purge_after}
      </p>
      <p className="sub">
        <Link href="/admin/v3-pilot">표로 돌아가기</Link>
      </p>

      {flags.length ? (
        <section className="panel">
          <h2>손볼 일</h2>
          <ul>{flags.map((k) => <li key={k} className="warn">{ISSUE_KO[k]}</li>)}</ul>
        </section>
      ) : null}

      <section className="panel">
        <h2>적어 주신 의견</h2>
        <p className="sub">
          빈칸은 빈칸으로 둡니다. 안 적은 것과 0 은 다릅니다.
        </p>
        <div className="tablewrap">
        <table>
          <thead><tr><th>묻는 것</th><th>답</th></tr></thead>
          <tbody>
            {items.map((it) => {
              const v = mine[it.code];
              const said = it.kind === "scale" ? (v?.value ?? null)
                : it.kind === "text" ? (v?.text ?? null)
                  : v?.choice ? label(it, v.choice) : null;
              return (
                <tr key={it.code}>
                  <td>{it.ko}</td>
                  <td>{said === null || said === "" ? "— (안 적었다)" : String(said)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </section>

      <section className="panel">
        <h2>묶음마다 걸린 시간</h2>
        <p className="sub">
          답이 찍힌 시각에서 읽습니다. 20분 넘는 틈은 빼고 셉니다.
        </p>
        <div className="tablewrap">
        <table>
          <thead><tr><th>묶음</th><th>답한 문항</th><th>걸린 시간</th></tr></thead>
          <tbody>
            {blocks.map((b) => (
              <tr key={b.block}>
                <td>{b.block}</td><td>{b.items}</td>
                <td>{Math.floor(b.seconds / 60)}분 {String(b.seconds % 60).padStart(2, "0")}초</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <section className="panel">
        <h2>지나간 화면</h2>
        <p className="sub">
          되돌아간 자리를 보려고 둡니다. 화면 이름만 적고 문항 번호도 적은
          내용도 적지 않습니다.
        </p>
        {steps.length === 0 ? (
          <p className="sub">아직 발자국이 없습니다.</p>
        ) : (
          <p className="sub">
            {steps.length}걸음 · 마지막 {steps[steps.length - 1].at.slice(0, 16)}
            {" · "}같은 화면을 두 번 이상 지난 자리{" "}
            {steps.length - new Set(steps.map((s) => s.screen_id)).size}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>그 사람이 본 것</h2>
        <p className="sub">
          응시자가 보는 화면 그대로 엽니다. 운영자 전용 화면을 따로 그리지
          않습니다 — 따로 그리면 둘이 갈리고, 갈린 쪽을 보고 판단하게 됩니다.
          {a.quality ? ` 응답 품질 ${a.quality}.` : ""}
          {` 깊게 본 영역 ${a.opened_deep}개.`}
        </p>
        <p>
          <Link className="act" href={`/v3/${attemptId}/result`}>결과 화면</Link>{" "}
          <a className="act" href={`/v3/${attemptId}/result/pdf`}>종이</a>
        </p>
      </section>
    </AdminShell>
  );
}
