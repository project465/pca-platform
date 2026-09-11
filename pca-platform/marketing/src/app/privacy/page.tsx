import { notFound } from "next/navigation";
import { getSite } from "@/content";
import Shell from "@/components/shell";
import { PageHead } from "@/components/visuals";

export function generateMetadata() {
  return { title: getSite().privacy?.heading ?? "" };
}

/**
 * 개인정보 처리방침.
 *
 * 나라마다 자기 사이트에 둔다(R022). 라이브 플랫폼에는 /privacy 가 없어
 * 그리로 걸면 404 가 된다 — 직접 확인했다.
 *
 * **사업자 정보가 ⟨…⟩ 로 비어 있는 동안 이 사이트를 배포하지 않는다.**
 * 화면에 초안 표시를 두지 않기로 했으므로, 빈칸 자체가 유일한 신호다.
 */
export default function PrivacyPage() {
  const site = getSite();
  const d = site.privacy;
  if (!d) notFound();

  return (
    <Shell>
      <PageHead label={d.label} title={d.heading} />
      <section className="divided">
        <div className="wrap">
          <p className="small" style={{ marginBottom: 34 }}>
            {d.versionLabel} {d.version}
          </p>

          {d.sections.map((s) => (
            <div className="policy" key={s.title}>
              <h2>{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {s.table ? (
                <div className="tablescroll">
                  <table className="stdtable">
                    <thead>
                      <tr>
                        {s.table.head.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((r, i) => (
                        <tr key={i}>
                          {r.map((c, j) => (
                            <td key={j}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ))}

          <p className="small policy-foot">{d.operator}</p>
        </div>
      </section>
    </Shell>
  );
}
