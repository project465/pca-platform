import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { namesOf, nameOf } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { currentWeights } from "@/lib/scoring";
import AdminShell from "@/components/admin-shell";
import WeightGrid, { type Axis } from "./weight-grid";

export const metadata = { title: "채점 가중치 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

export default async function InstrumentPage({
  params,
}: {
  params: Promise<{ instrumentId: string }>;
}) {
  const user = await requireRole(["superadmin"]);
  const { instrumentId } = await params;
  if (!/^\d+$/.test(instrumentId)) notFound();

  const inst = await queryOne<{
    id: string;
    major_id: string;
    major_code: string;
    version: string;
    status: string;
    questions: number;
    scored: number;
  }>(
    `SELECT i.id, i.major_id, m.code AS major_code, i.version, i.status,
            (SELECT count(*) FROM questions q WHERE q.instrument_id = i.id)::int AS questions,
            (SELECT count(*) FROM test_sessions ts JOIN attempts a ON a.session_id = ts.id
              WHERE ts.instrument_id = i.id AND a.status = 'scored')::int AS scored
       FROM instruments i JOIN majors m ON m.id = i.major_id
      WHERE i.id = $1`,
    [instrumentId],
  );
  if (!inst) notFound();

  const [indicatorRows, jobRows, weights, majorName] = await Promise.all([
    query<{ id: string; code: string }>(
      `SELECT id, code FROM indicators WHERE instrument_id = $1 ORDER BY id`,
      [instrumentId],
    ),
    query<{ id: string; code: string }>(
      `SELECT id, code FROM job_clusters WHERE major_id = $1 ORDER BY sort_no, code`,
      [inst.major_id],
    ),
    currentWeights(instrumentId),
    nameOf("majors", inst.major_id, user.locale),
  ]);

  const [indicatorNames, jobNames] = await Promise.all([
    namesOf("indicators", indicatorRows.map((r) => r.id), user.locale),
    namesOf("job_clusters", jobRows.map((r) => r.id), user.locale),
  ]);

  const indicators: Axis[] = indicatorRows.map((r) => ({
    id: r.id,
    label: indicatorNames.get(r.id) ?? r.code,
  }));
  const jobs: Axis[] = jobRows.map((r) => ({ id: r.id, label: jobNames.get(r.id) ?? r.code }));

  return (
    <AdminShell user={user} current="/admin/instruments">
      <div className="page-head">
        <h1>
          {majorName ?? inst.major_code} {inst.version} 채점 가중치
        </h1>
        <span className="count">
          문항 {inst.questions}개 · 지표 {indicators.length}개 · 직무 {jobs.length}개
        </span>
        <div className="right">
          <Link className="act" href="/admin/instruments">
            목록으로
          </Link>
        </div>
      </div>

      <p className="lede">
        직무 적합도는 <b>지표 점수 × 가중치</b>의 가중평균입니다. 값이 클수록 그 직무에서
        해당 지표를 많이 봅니다. 0 이면 쓰지 않습니다.
      </p>

      {inst.scored > 0 ? (
        <div className="notice" style={{ marginBottom: 18 }}>
          이미 {inst.scored}건이 이 도구로 채점됐습니다. 가중치를 바꿔도 기존 결과는 그대로이며,
          다시 채점해야 반영됩니다.
        </div>
      ) : null}

      {indicators.length === 0 || jobs.length === 0 ? (
        <div className="empty">
          <b>{indicators.length === 0 ? "지표가 없습니다" : "직무 영역이 없습니다"}</b>
          가중치는 지표와 직무 영역이 모두 있어야 채울 수 있습니다.
        </div>
      ) : (
        <WeightGrid
          instrumentId={instrumentId}
          indicators={indicators}
          jobs={jobs}
          values={Object.fromEntries(weights)}
        />
      )}
    </AdminShell>
  );
}
