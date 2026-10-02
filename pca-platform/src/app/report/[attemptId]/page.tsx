import Link from "next/link";
import { notFound } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { requireRole } from "@/lib/session";
import { attemptOf } from "@/lib/exam";
import { reportFor, KIND_LABEL } from "@/lib/report";

export const metadata = { title: "결과지 — 단체 PCA" };
export const dynamic = "force-dynamic";

/** 요구 5칸 가운데 보유·부족을 칠한다. 시안의 빗금이 부족분이다 */
function Blocks({ required, held }: { required: number; held: number }) {
  const cells = [];
  for (let n = 1; n <= 5; n++) {
    const cls = n <= held ? "has" : n <= required ? "short" : "req";
    cells.push(<span key={n} className={cls} />);
  }
  return <span className="blocks">{cells}</span>;
}

function verdict(required: number, held: number) {
  const short = required - held;
  if (short <= 0) return { cls: "ok", text: "충족" };
  if (short === 1) return { cls: "mid", text: "1단계 부족" };
  if (short === 2) return { cls: "mid", text: "2단계 부족" };
  return { cls: "no", text: `${short}단계 부족` };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await requireRole(["student"]);

  const attempt = await attemptOf(attemptId, user.id);
  if (!attempt) notFound();

  const r = await reportFor(attemptId, user.id, user.locale);

  const shell = (children: React.ReactNode) => (
    <div className="shell">
      <header className="topbar">
        <span className="brand">단체 PCA</span>
        <div className="who">
          <span>{user.name} 님</span>
          <LogoutButton />
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );

  if (r.state === "not_submitted") {
    return shell(
      <div className="empty">
        <b>아직 제출하지 않은 검사입니다</b>
        검사를 모두 마치면 결과지가 만들어집니다.
        <p style={{ marginTop: 16 }}>
          <Link className="act" href={`/test/${attemptId}`}>검사로 가기</Link>
        </p>
      </div>,
    );
  }

  if (r.state === "not_scored") {
    return shell(
      <div className="empty">
        <b>채점을 기다리고 있습니다</b>
        응답은 모두 저장되었습니다. 채점이 끝나면 이 자리에 결과지가 열립니다.
        <p style={{ marginTop: 16 }}>
          <Link className="act" href="/my">내 검사로</Link>
        </p>
      </div>,
    );
  }

  if (r.state === "not_released") {
    return shell(
      <div className="empty">
        <b>결과가 아직 공개되지 않았습니다</b>
        학과 담당자가 확인한 뒤 공개됩니다. 공개되면 알려드립니다.
        <p style={{ marginTop: 16 }}>
          <Link className="act" href="/my">내 검사로</Link>
        </p>
      </div>,
    );
  }

  const d = r.data;

  return (
    <div style={{ padding: "32px 20px 80px" }}>
      <div className="sheet">
        <div className="top">
          <h1>{d.majorName} 진로지표 결과</h1>
          <div className="meta">
            <span>{d.studentName}</span>
            <span>{d.sessionName}</span>
            {d.submittedAt ? <span>{d.submittedAt} 응시</span> : null}
          </div>
        </div>

        <section>
          <h2>가장 가까운 직무</h2>
          {d.top ? (
            <>
              <div className="lead">
                <span className="name">{d.top.name}</span>
                <span className="score"><b>{d.top.score}</b>/100</span>
              </div>
              <p className="lead-note">
                아래 직무는 이 전공자가 실제로 입직하는 분야이며, 점수는 각 직무의
                요구 지표와 {d.studentName} 님의 응답을 대조한 값입니다.
              </p>
              {d.jobs.map((j) => (
                <div className={j.rank === 1 ? "gauge is-top" : "gauge"} key={j.id}>
                  <span className="lab">{j.name}</span>
                  <span className="track">
                    <span className="ticks"><i /><i /><i /><i /><i /></span>
                    <span className="fill" style={{ width: `${Math.max(0, Math.min(100, j.score))}%` }} />
                  </span>
                  <span className="val">{j.score}</span>
                </div>
              ))}
              <div className="scale">
                <span />
                <span><em>0</em><em>20</em><em>40</em><em>60</em><em>80</em><em>100</em></span>
                <span />
              </div>
            </>
          ) : (
            <p className="lead-note">직무 적합도가 아직 없습니다.</p>
          )}
        </section>

        <section>
          <h2>{d.top ? `${d.top.name} 직무가 요구하는 역량` : "요구 역량"}</h2>
          {d.gaps.length === 0 ? (
            <p className="lead-note">
              이 직무에 연결된 역량 자료가 아직 없습니다. 매핑 데이터를 넣으면 여기에 표시됩니다.
            </p>
          ) : (
            d.gaps.map((g) => {
              const v = verdict(g.required, g.held);
              return (
                <div className="comp" key={g.id}>
                  <span className="lab">
                    {g.name}
                    <small>{KIND_LABEL[g.kind] ?? g.kind}</small>
                  </span>
                  <Blocks required={g.required} held={g.held} />
                  <span className={`verdict ${v.cls}`}>{v.text}</span>
                </div>
              );
            })
          )}
        </section>

        <section>
          <h2>다음 학기에 들을 과목</h2>
          {d.courses.length === 0 ? (
            <p className="lead-note">
              부족한 역량을 메우는 개설 과목이 아직 연결되지 않았습니다.
              학과의 과목 자료를 넣으면 여기에 표시됩니다.
            </p>
          ) : (
            d.courses.map((c) => (
              <div className="course" key={c.id}>
                <h3>{c.name}</h3>
                <span className="code">
                  {c.code}
                  {c.credit ? ` · ${c.credit}학점` : ""}
                  {c.term ? ` · ${c.term}` : ""}
                </span>
                {c.covers.length ? (
                  <span className="tags">
                    {c.covers.map((t) => <b key={t}>{t}</b>)}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </section>

        <div className="sheetfoot">
          이 결과는 응답을 바탕으로 계산된 것이며, 진로를 확정하는 판정이 아닙니다.
        </div>
      </div>
      <p style={{ textAlign: "center", marginTop: 22 }}>
        <Link className="act" href="/my">내 검사로 돌아가기</Link>
      </p>
    </div>
  );
}
